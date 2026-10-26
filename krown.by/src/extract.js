import { claimsFromPages, clean, contactsFromText } from '@anticor/harvest-core';
import { parseKrownPrices } from './prices.js';

export function buildKrown(pages, date) {
  const home = pages.find((page) => new URL(page.url).pathname === '/');
  const pricePage = pages.find((page) => new URL(page.url).pathname === '/price/');
  const contactPage = pages.find((page) => new URL(page.url).pathname === '/contacts/');
  const { vehicle_types, services } = parseKrownPrices(pricePage);
  const text = contactPage.body_text;
  const address = text.match(/г\.\s*Минск,\s*[^\n]*(?:Ваупшасова)[^\n]*/iu)?.[0];
  const hours = text.match(/(?:Мы работаем с|Режим работы[:\s]*)(?:[^\n]*\n)?[^\n]*(?:08:00|21:00)[^\n]*/iu)?.[0];
  const contacts = contactsFromText(text);
  const location = { city: 'Минск', address: clean(address || ''), phones: contacts.phones, working_hours: clean(hours || '') };
  if (!location.address || !contacts.phones.length) throw new Error('KROWN contact markup changed: address or phone numbers missing');
  const harvest = {
    metadata: { source_site: 'https://krown.by/', brand: 'KROWN', title: home.title, language: 'ru', currency: 'BYN', retrieved_at: date, scope: 'Public website pages retrieved with Playwright', notes: ['Claims and guarantees are statements by the site. Prices and vehicle labels come from the public price tables.'] },
    company: { name: 'KROWN', website: 'https://krown.by/', country: 'BY', contacts, locations: [location] },
    services,
    vehicle_types,
    prices: { source_url: pricePage.url, tables: pricePage.tables, services },
    technology: pages.filter((page) => /technologia/.test(page.url)).map((page) => ({ source_url: page.url, headings: page.headings, paragraphs: page.paragraphs })),
    product_catalog: pages.filter((page) => /\/product\//.test(page.url)).map((page) => ({ url: page.url, title: page.title, links: page.links, text: page.text })),
    site_claims: claimsFromPages(pages),
    pages,
    sources: pages.map((page) => ({ url: page.url, fetched_at: page.fetched_at, used_for: [page.headings[0]?.text || page.title] })),
  };
  const comparison = { schema_version: '1.0', company: { name: 'KROWN', website: 'https://krown.by/', country: 'BY', locations: [location] }, source: { scraped_at: date, urls: pages.map((page) => page.url), notes: 'Prices copied from the public price tables. Ambiguous amounts retain their original text without an inferred numeric price.' }, currency: 'BYN', vehicle_types, services };
  return { harvest, comparison };
}
