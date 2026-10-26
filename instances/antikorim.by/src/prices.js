import { clean, parseMoney } from '@anticor/harvest-core';

// Runs in the browser: capture each price with its own title, scope, and caveats.
export function extractDetails() {
  const text = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim();
  const section = document.querySelector('#prices, #price');
  return {
    price_section: section
      ? {
          title: text(section.querySelector('h2')),
          text: text(section),
          cards: [...section.querySelectorAll('.price-card')].map((card) => ({
            name: text(card.querySelector('h3')),
            price_text: text(card.querySelector('.price-value')),
            description: text(card.querySelector('.price-note')),
          })),
          rows: [...section.querySelectorAll('table tbody tr')].map((row) =>
            [...row.cells].map(text),
          ),
          notes: [...section.querySelectorAll('.price-addon, .section-head .lead')].map(text),
        }
      : null,
    extras: [...document.querySelectorAll('#types .card-flat')].map((card) => ({
      name: text(card.querySelector('h3')),
      price_text: text(card.querySelector('.service-price-badge')),
      description: text(card.querySelector('p')),
      conditions: [...card.querySelectorAll('.service-meta')].map(text),
    })),
    sections: [...document.querySelectorAll('main section[id]')].map((node) => ({
      id: node.id,
      title: text(node.querySelector('h2')),
      paragraphs: [...node.querySelectorAll('p, li')].map(text).filter(Boolean),
      text: text(node),
    })),
    contact_lines: [...document.querySelectorAll('#contacts a, #contacts .contact-item')]
      .map(text)
      .filter(Boolean),
    faqs: [...document.querySelectorAll('.faq-item')].map((node) => ({
      question: text(node.querySelector('.faq-button')),
      answer: text(node.querySelector('.faq-answer, .faq-body, [role="region"]')),
    })),
    videos: [...document.querySelectorAll('video source, a[href$=".mp4"]')].map(
      (node) => node.src || node.href,
    ),
  };
}

export async function readSiteDetails(page) {
  const details = await page.evaluate(extractDetails);
  const packages = [];
  const cards = page.locator('#types .package-card');
  for (let index = 0; index < (await cards.count()); index++) {
    const card = cards.nth(index);
    const switcher = card.locator('.js-package-price');
    const item = {
      id: await switcher.getAttribute('data-package'),
      name: clean(await card.locator('h3').textContent()),
      description: clean(await card.locator('.package-subtitle').textContent()),
      features: await card.locator('.package-features li').allTextContents(),
      variants: [],
    };
    const buttons = card.locator('button[data-vehicle]');
    if ((await buttons.count()) !== 4) throw new Error('Antikorim vehicle selector changed');
    for (let vehicleIndex = 0; vehicleIndex < (await buttons.count()); vehicleIndex++) {
      const button = buttons.nth(vehicleIndex);
      const vehicleId = await button.getAttribute('data-vehicle');
      const previousNote = await card.locator('.js-package-price-note').textContent();
      const active = (await button.getAttribute('class')).includes('is-active');
      await button.click();
      if (!active) {
        await page.waitForFunction(
          ({ packageId, previousNote }) => {
            const root = document.querySelector(`[data-package="${packageId}"]`);
            return root?.querySelector('.js-package-price-note')?.textContent !== previousNote;
          },
          { packageId: item.id, previousNote },
        );
      }
      item.variants.push({
        vehicle_id: vehicleId,
        label: clean(await button.textContent()),
        description: clean(await card.locator('.js-package-price-note').textContent()),
        price_text: clean(await card.locator('.js-package-price-value').textContent()),
      });
    }
    item.features = item.features.map(clean);
    packages.push(item);
  }
  return { site_details: details, price_packages: packages };
}

export function normalizedPrice(text, vehicleId, notes = '') {
  const money = parseMoney(text);
  if (
    !clean(text) ||
    (money.price === null &&
      money.price_min === null &&
      money.price_max === null &&
      !/^по запросу$/iu.test(clean(text)))
  ) {
    throw new Error(`Unrecognized Antikorim price: ${text}`);
  }
  return { vehicle_type_id: vehicleId, ...money, ...(notes ? { notes } : {}) };
}

export function parsePackages(page) {
  const packages = page.price_packages;
  if (packages?.length !== 3 || new Set(packages.map((item) => item.id)).size !== 3)
    throw new Error('Expected three Antikorim treatment packages');
  const classes = { car: 'sedan', crossover: 'crossover', suv: 'van', maxi: 'van' };
  const vehicle_types = packages[0].variants.map((variant) => ({
    id: variant.vehicle_id,
    name_original: variant.label,
    class: classes[variant.vehicle_id] || 'other',
    examples: variant.description,
  }));
  const services = packages.map((item) => {
    if (
      item.variants.length !== 4 ||
      new Set(item.variants.map((v) => v.vehicle_id)).size !== 4 ||
      item.variants.some((v) => !classes[v.vehicle_id] || !v.price_text || !v.description)
    )
      throw new Error(`Incomplete vehicle prices for ${item.name}`);
    return {
      id: item.id,
      category: 'anticorrosion',
      name_original: item.name,
      description: [item.description, ...item.features].join(' '),
      url: page.url,
      completion_time: null,
      prices: item.variants.map((variant) =>
        normalizedPrice(variant.price_text, variant.vehicle_id, variant.description),
      ),
    };
  });
  return { services, vehicle_types };
}
