import { writeFile } from 'node:fs/promises';
import { isMain } from '@anticor/harvest-core';
import { chromium } from '../../../packages/harvest-core/node_modules/playwright/index.mjs';

// Public read-only probes. This is diagnostic evidence, never a harvest dataset.
export async function inspectAccess() {
  const browser = await chromium.launch({ headless: true });
  const attempts = [];
  try {
    const context = await browser.newContext();
    for (const url of [
      'https://dinitrol.by/',
      'https://www.dinitrol.by/',
      'http://dinitrol.by/',
      'http://www.dinitrol.by/',
      'https://dinitrol.by/robots.txt',
      'https://dinitrol.by/sitemap.xml',
    ]) {
      const page = await context.newPage();
      try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        attempts.push({
          method: 'chromium',
          requested_url: url,
          final_url: page.url(),
          fetched_at: new Date().toISOString(),
          status: response?.status(),
          title: await page.title(),
          // biome-ignore lint/performance/useDomNodeTextContent: Preserve the rendered error page as seen in Chromium.
          text: await page.locator('body').innerText(),
        });
        if (url === 'https://dinitrol.by/')
          await page.screenshot({
            path: new URL('../access-homepage.png', import.meta.url).pathname,
          });
      } catch (error) {
        attempts.push({ method: 'chromium', requested_url: url, error: error.message });
      } finally {
        await page.close();
      }
    }
    for (const path of [
      '/',
      '/index.php',
      '/?page_id=1',
      '/wp-json/wp/v2/pages',
      '/wp-sitemap.xml',
      '/sitemap_index.xml',
      '/uslugi/',
      '/kontakty/',
    ]) {
      const url = new URL(path, 'https://dinitrol.by/').href;
      try {
        const response = await context.request.get(url, { timeout: 30000 });
        attempts.push({
          method: 'Playwright APIRequest',
          requested_url: url,
          final_url: response.url(),
          fetched_at: new Date().toISOString(),
          status: response.status(),
          server: response.headers().server,
          text: await response.text(),
        });
      } catch (error) {
        attempts.push({
          method: 'Playwright APIRequest',
          requested_url: url,
          error: error.message,
        });
      }
    }
  } finally {
    await browser.close();
  }
  const evidence = {
    source_site: 'https://dinitrol.by/',
    inspected_at: new Date().toISOString(),
    purpose: 'Access diagnostics only; not service, price or company evidence.',
    attempts,
  };
  await writeFile(
    new URL('../access-evidence.json', import.meta.url),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  console.log(`Saved ${attempts.length} access probes to access-evidence.json`);
  return evidence;
}

if (isMain(import.meta.url)) await inspectAccess();
