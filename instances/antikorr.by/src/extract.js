import { claimsFromPages, clean, contactsFromText } from '@anticor/harvest-core';
import { PRICE_NOTE, parsePriceVariants, parseWashPrices } from './prices.js';
import site from './site.js';

export function parseLocations(text) {
  const hours = clean(
    text.match(/[cс]\s*\d{1,2}[.:]\d{2}\s*до\s*\d{1,2}[.:]\d{2}\s*без выходных/iu)?.[0] || '',
  );
  const entries = [
    ...text.matchAll(
      /(Минск,\s*(?:пр-т|ул\.)[^\n+]+)\s*(\+375[\s(]*\d{2}[)\s]*\d{3}[\s-]*\d{2}[\s-]*\d{2})/giu,
    ),
  ];
  return [
    ...new Map(
      entries.map((match) => {
        const address = clean(match[1]);
        return [
          address,
          { city: 'Минск', address, phones: [clean(match[2])], working_hours: hours },
        ];
      }),
    ).values(),
  ];
}

export function buildSite(pages, date) {
  const home = pages.find((page) => new URL(page.url).pathname === '/');
  const pricePage = pages.find((page) => new URL(page.url).pathname === '/tsenyi/');
  const contactPage = pages.find((page) => new URL(page.url).pathname === '/kontaktyi/');
  const locations = parseLocations(contactPage.body_text);
  if (!locations.length) throw new Error('Antikorr contact markup changed: no locations extracted');
  const companyName = contactPage.body_text.match(/ООО\s*[«"]([^»"]+)[»"]/u)?.[0];
  if (!companyName) throw new Error('Antikorr legal company name is missing');
  const company = { name: clean(companyName), website: site.baseUrl, country: 'BY', locations };
  const { services: packages, vehicle_types } = parsePriceVariants(
    pricePage.price_calculator,
    pricePage.url,
  );
  const servicePages = pages.filter((page) =>
    /^\/(?:antikorroziynaya-obrabotka-|antikorrozijnaya-obrabotka-|moyka-dnishha-)/.test(
      new URL(page.url).pathname,
    ),
  );
  const services = [
    ...packages,
    ...servicePages.map((page, index) => ({
      id: `service-${index + 1}`,
      category: /moyka-dnishha/.test(page.url) ? 'additional' : 'anticorrosion',
      name_original: page.headings.find((heading) => heading.level === 1)?.text || page.title,
      description: page.paragraphs[0] || page.description || '',
      url: page.url,
      completion_time: null,
      prices: /moyka-dnishha/.test(page.url) ? parseWashPrices(page, vehicle_types) : [],
    })),
  ];
  const warnings = [
    PRICE_NOTE,
    'Individual treatment-area pages do not publish separate numeric service prices; their prices[] arrays are empty. The underbody-wash table includes a vehicle category marked as not serviced.',
  ];
  const harvest = {
    metadata: {
      source_site: site.baseUrl,
      brand: 'AntikoRR.by',
      title: home.title,
      language: 'ru',
      currency: 'BYN',
      retrieved_at: date,
      notes: [
        'Claims, guarantees, ratings, discounts, and installment offers are statements by the site.',
      ],
    },
    company: {
      ...company,
      contacts: contactsFromText(contactPage.body_text),
      legal_id: contactPage.body_text.match(/УНП\s*(\d+)/u)?.[1] || null,
    },
    locations,
    services,
    vehicle_types,
    prices: { source_url: pricePage.url, note: PRICE_NOTE, ...pricePage.price_calculator },
    technology: {
      duration_original: clean(home.text.match(/Время обработки[^\n]*/iu)?.[0] || ''),
      pages: servicePages.map((page) => ({
        url: page.url,
        headings: page.headings,
        paragraphs: page.paragraphs,
      })),
    },
    materials: pages
      .filter((page) => /\/antikorroziynyiy-materialyi\//.test(page.url))
      .map((page) => ({ url: page.url, title: page.title, paragraphs: page.paragraphs })),
    publications: pages
      .filter((page) => /\/blog\//.test(page.url))
      .map((page) => ({ url: page.url, title: page.title })),
    site_claims: claimsFromPages(pages),
    pages,
    sources: pages.map((page) => ({
      url: page.url,
      fetched_at: page.fetched_at,
      used_for: [page.title],
    })),
  };
  const comparison = {
    schema_version: '1.0',
    company,
    source: { scraped_at: date, urls: pages.map((page) => page.url), notes: warnings.join(' ') },
    currency: 'BYN',
    vehicle_types,
    services,
  };
  return { harvest, comparison, warnings };
}
