import { chromium } from 'playwright';
import { clean } from './normalize.js';

export async function launchBrowser({ headed = false } = {}) {
  return chromium.launch({ headless: !headed });
}

// Executed inside the page. Preserve structured data separately from rendered text.
export function extractPage({
  selectors = ['main', 'article'],
  homepageSelectors,
  trimAfter = [],
} = {}) {
  const normalize = (text = '') =>
    String(text)
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const renderedText = (node) => {
    // biome-ignore lint/performance/useDomNodeTextContent: Parsers depend on rendered line breaks and hidden-element exclusion.
    return node.innerText || node.textContent;
  };
  const selected = location.pathname === '/' ? homepageSelectors || selectors : selectors;
  const root =
    selected
      .map((selector) => document.querySelector(selector))
      .find((node) => node && normalize(renderedText(node)).length >= 80) || document.body;
  const clone = root.cloneNode(true);
  clone.querySelectorAll('script,style,noscript,nav,header,footer,form').forEach((node) => {
    node.remove();
  });
  // textContent on a detached clone retains hidden mobile prices; innerText on the live page supplies rendered text.
  const allText = renderedText(root);
  const text = trimAfter
    .reduce((value, marker) => {
      const index = value.indexOf(marker);
      return index < 0 ? value : value.slice(0, index);
    }, allText)
    .trim();
  const headings = [...root.querySelectorAll('h1,h2,h3,h4')]
    .map((node) => ({ level: Number(node.tagName[1]), text: normalize(node.textContent) }))
    .filter((item) => item.text);
  const paragraphs = [...clone.querySelectorAll('p,li')]
    .map((node) => normalize(node.textContent))
    .filter((value) => value.length > 25);
  const links = [...root.querySelectorAll('a[href]')]
    .map((node) => ({ text: normalize(node.textContent), url: node.href }))
    .filter((item) => /^https?:/.test(item.url));
  const tables = [...root.querySelectorAll('table')].map((table) => ({
    caption: normalize(table.caption?.textContent),
    rows: [...table.rows].map((row) =>
      [...row.cells].map((cell) => ({
        text: normalize(cell.textContent),
        rowspan: cell.rowSpan,
        colspan: cell.colSpan,
        header: cell.tagName === 'TH',
      })),
    ),
  }));
  const structuredData = [];
  const structuredDataErrors = [];
  document.querySelectorAll('script[type="application/ld+json"]').forEach((node) => {
    try {
      structuredData.push(JSON.parse(node.textContent));
    } catch (error) {
      structuredDataErrors.push(error.message);
    }
  });
  const images = [...root.querySelectorAll('img')]
    .map((node) => ({
      url: node.getAttribute('data-src')
        ? new URL(node.getAttribute('data-src'), location.href).href
        : node.src,
      alt: normalize(node.alt),
    }))
    .filter((item) => /^https?:/.test(item.url));
  return {
    url: location.href,
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content || null,
    headings,
    text,
    body_text: renderedText(document.body),
    paragraphs: [...new Set(paragraphs)],
    links,
    tables,
    images,
    structured_data: structuredData,
    structured_data_errors: structuredDataErrors,
  };
}

export async function fetchPage(context, url, config) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const page = await context.newPage();
    try {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: config.timeout,
      });
      if (!response || response.status() >= 400)
        throw new Error(`HTTP ${response?.status() ?? 'no response'}`);
      const final = new URL(page.url());
      if (final.hostname !== new URL(config.baseUrl).hostname)
        throw new Error(`Redirected outside site: ${final.href}`);
      await page.locator('body').waitFor();
      // Let prices rendered by page scripts settle, without waiting for analytics connections.
      await page.waitForLoadState('load', { timeout: 5000 }).catch(() => {});
      const snapshot = await page.evaluate(extractPage, config.extraction);
      if (
        /^(?:One moment|Just a moment|Access denied|Attention Required)/i.test(snapshot.title) ||
        /captcha|checking your browser|verify you are human/i.test(snapshot.text.slice(0, 1000))
      ) {
        throw new Error('Site returned an access challenge');
      }
      if (clean(snapshot.text).length < 80) throw new Error('No meaningful page content');
      return {
        ...snapshot,
        requested_url: url,
        status: response.status(),
        fetched_at: new Date().toISOString(),
      };
    } catch (error) {
      lastError = error;
    } finally {
      await page.close();
    }
  }
  throw lastError;
}

export async function crawlSite(config, options) {
  const browser = await launchBrowser(options);
  const pages = [];
  const failures = [];
  const queue = config.seeds.map((seed) =>
    typeof seed === 'string' ? { path: seed, required: false } : seed,
  );
  const seen = new Set(queue.map((seed) => new URL(seed.path, config.baseUrl).href));
  const deferred = new Set();
  try {
    const context = await browser.newContext({ locale: 'ru-BY', timezoneId: 'Europe/Minsk' });
    await context.route('**/*', async (route) => {
      if (['image', 'font', 'media'].includes(route.request().resourceType())) return route.abort();
      return route.continue();
    });
    while (queue.length && pages.length + failures.length < options.maxPages) {
      const seed = queue.shift();
      const url = new URL(seed.path, config.baseUrl).href;
      console.log(`[${config.domain}] ${url}`);
      try {
        const snapshot = await fetchPage(context, url, { ...config, timeout: options.timeout });
        pages.push(snapshot);
        for (const link of snapshot.links) {
          const target = new URL(link.url);
          target.hash = '';
          if (
            target.hostname !== config.domain ||
            !config.discover(target.pathname, target.searchParams)
          )
            continue;
          if (!seen.has(target.href)) {
            if (seen.size < options.maxPages) {
              seen.add(target.href);
              queue.push({ path: target.href, required: false });
            } else {
              deferred.add(target.href);
            }
          }
        }
      } catch (error) {
        failures.push({ url, required: Boolean(seed.required), error: error.message });
        console.warn(`[${config.domain}] ${error.message}: ${url}`);
      }
    }
    if (queue.length)
      failures.push(
        ...queue.map((seed) => ({
          url: new URL(seed.path, config.baseUrl).href,
          required: Boolean(seed.required),
          error: 'Page limit reached',
        })),
      );
    failures.push(
      ...[...deferred].map((url) => ({ url, required: false, error: 'Page limit reached' })),
    );
    return { pages, failures };
  } finally {
    await browser.close();
  }
}
