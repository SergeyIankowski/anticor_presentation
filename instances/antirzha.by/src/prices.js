import { clean, parseMoney } from '@anticor/harvest-core';

// Runs in the page. Explicit data attributes distinguish desktop cards from mobile copies.
export function extractPackageCards() {
  const text = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim();
  return [...document.querySelectorAll('#ceny article[data-pricing-card]')].map((card) => {
    const heading = card.querySelector('h3');
    const front = heading?.parentElement;
    const amount = front?.querySelector('b');
    const price = amount?.parentElement;
    const bold = [...(front?.querySelectorAll('b') || [])];
    return {
      id: card.dataset.pricingCard,
      name: text(heading),
      description: text(front?.querySelector('p')),
      price_text: price ? [...price.childNodes].map(text).filter(Boolean).join(' ') : '',
      duration: bold.length > 1 ? text(bold[1]) : '',
      guarantee:
        [...(front?.querySelectorAll('span') || [])]
          .map(text)
          .find((value) => /гарантия/iu.test(value)) || '',
      features: [...card.querySelectorAll('li')].map(text),
      included: [...card.querySelectorAll('dl > div')].map((node) => ({
        name: text(node.querySelector('dt')),
        value: text(node.querySelector('dd')),
      })),
    };
  });
}

export function extractDetails() {
  const text = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim();
  const heading = document.querySelector('main h1');
  // biome-ignore lint/performance/useDomNodeTextContent: Responsive H1 markup contains separate desktop and mobile copies.
  const title = heading?.innerText || heading?.textContent || '';
  const sections = [...document.querySelectorAll('main section')].map((node) => ({
    id: node.id,
    title: text(node.querySelector('h2')),
    paragraphs: [...node.querySelectorAll('p,li')].map(text).filter(Boolean),
  }));
  return {
    title_original: title.replace(/\s+/g, ' ').trim(),
    sections,
    faqs: [...document.querySelectorAll('main details')].map((node) => {
      const summary = node.querySelector('summary')?.cloneNode(true);
      summary?.querySelectorAll('[aria-hidden]').forEach((child) => {
        child.remove();
      });
      return {
        question: text(summary),
        answer: [...node.children]
          .filter((child) => child.tagName !== 'SUMMARY')
          .map(text)
          .join(' '),
      };
    }),
    cleaning_rates: [...document.querySelectorAll('#ochistka article')].map((node) => ({
      name: text(node.querySelector('h3')),
      price_text: text(node.querySelector('div > span')),
      note: text(node.querySelector('p')),
      url: node.querySelector('a')?.href || null,
    })),
    price_mentions: [
      ...document.querySelectorAll('main p, main span, main td, main strong, main b'),
    ]
      .filter(
        (node) =>
          /\d[\d\s]*\s*BYN/u.test(text(node)) &&
          ![...node.children].some((child) => /\d[\d\s]*\s*BYN/u.test(text(child))),
      )
      .map(text),
    videos: [...document.querySelectorAll('video, video source, a[href]')]
      .map((node) => node.src || node.href || '')
      .filter((url) => /\.(?:mp4|webm)(?:[?#]|$)|youtu(?:\.be|be\.com)|tiktok\.com/iu.test(url)),
    social_links: [...document.querySelectorAll('a[href]')]
      .map((node) => ({ text: text(node), url: node.href }))
      .filter((link) => /t\.me|instagram\.com|tiktok\.com|viber:/iu.test(link.url)),
  };
}

export async function readSiteDetails(page) {
  const details = await page.evaluate(extractDetails);
  if (new URL(page.url()).pathname !== '/ceny/') return { site_details: details };
  const buttons = page.locator('#ceny button[aria-pressed]');
  if ((await buttons.count()) !== 3) throw new Error('Antirzha vehicle selector changed');
  const variants = [];
  for (let index = 0; index < 3; index++) {
    const button = buttons.nth(index);
    // An early click can precede React hydration; confirm the state and retry if needed.
    for (let attempt = 1; attempt <= 3; attempt++) {
      await button.click();
      try {
        await page.waitForFunction(
          (index) =>
            document
              .querySelectorAll('#ceny button[aria-pressed]')
              [index]?.getAttribute('aria-pressed') === 'true',
          index,
          { timeout: 2500 },
        );
        break;
      } catch (error) {
        if (attempt === 3) throw error;
      }
    }
    const labels = await button.locator(':scope > span').allTextContents();
    if (labels.length !== 2) throw new Error('Missing Antirzha vehicle labels');
    variants.push({
      vehicle: {
        id: `vehicle-${index + 1}`,
        name: labels.map(clean).join(' '),
        description: clean(labels[1]),
      },
      packages: await page.evaluate(extractPackageCards),
    });
  }
  return { site_details: details, pricing_variants: variants };
}

export function parseDuration(value) {
  const text = clean(value);
  const match = text.match(/^(?:(от|до)\s*)?(\d+)(?:\s*[–—-]\s*(\d+))?\s*(час|дн)/iu);
  if (!match) throw new Error(`Unrecognized Antirzha duration: ${text}`);
  const result = { unit: /час/iu.test(match[4]) ? 'hours' : 'days', text_original: text };
  if (match[1] === 'до') result.max = Number(match[2]);
  else if (match[1] === 'от') result.min = Number(match[2]);
  else {
    result.min = Number(match[2]);
    result.max = Number(match[3] || match[2]);
  }
  return result;
}

export function parsePackages(page) {
  const variants = page.pricing_variants;
  if (variants?.length !== 3 || new Set(variants.map((item) => item.vehicle.id)).size !== 3)
    throw new Error('Incomplete Antirzha vehicle coverage');
  const vehicle_types = variants.map(({ vehicle }) => ({
    id: vehicle.id,
    name_original: vehicle.name,
    class: /Рамный/u.test(vehicle.name)
      ? 'suv'
      : /Кроссовер/u.test(vehicle.name)
        ? 'crossover'
        : /Легковой/u.test(vehicle.name)
          ? 'sedan'
          : 'other',
    examples: vehicle.description,
  }));
  const services = new Map();
  const packageIds = variants[0].packages
    .map((item) => item.id)
    .sort()
    .join(',');
  for (const variant of variants) {
    if (
      variant.packages.length !== 4 ||
      new Set(variant.packages.map((item) => item.id)).size !== 4 ||
      variant.packages
        .map((item) => item.id)
        .sort()
        .join(',') !== packageIds
    )
      throw new Error('Incomplete Antirzha package coverage');
    for (const item of variant.packages) {
      const price = parseMoney(item.price_text);
      if (
        !item.name ||
        !item.description ||
        !item.guarantee ||
        !/BYN/u.test(item.price_text) ||
        (price.price === null && price.price_min === null && price.price_max === null)
      )
        throw new Error(`Missing Antirzha package details: ${item.id}`);
      const duration = parseDuration(item.duration);
      if (!services.has(item.id))
        services.set(item.id, {
          id: item.id,
          category: 'anticorrosion',
          name_original: item.name,
          description: [item.description, ...item.features].join(' '),
          url: page.url,
          completion_time: duration,
          prices: [],
        });
      const service = services.get(item.id);
      if (
        service.name_original !== item.name ||
        JSON.stringify(service.completion_time) !== JSON.stringify(duration)
      )
        throw new Error(`Package terms differ by vehicle: ${item.id}`);
      service.prices.push({ vehicle_type_id: variant.vehicle.id, ...price, notes: item.guarantee });
    }
  }
  return { services: [...services.values()], vehicle_types };
}
