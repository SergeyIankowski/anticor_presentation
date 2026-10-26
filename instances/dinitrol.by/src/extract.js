import { claimsFromPages, contactsFromText } from '@anticor/harvest-core';
import site from './site.js';

export function assertContent(pages) {
  if (!pages.length) throw new Error('DINITROL: no public content pages were retrieved.');
  for (const page of pages) {
    if (
      page.status >= 400 ||
      /403 Forbidden|Access denied|Just a moment|verify you are human/i.test(
        `${page.title}\n${page.text}`,
      )
    ) {
      throw new Error(`DINITROL: access failure at ${page.url}; not company/service evidence.`);
    }
  }
}

export function parseCompany(pages) {
  assertContent(pages);
  const home = pages.find((page) => new URL(page.url).pathname === '/');
  const name = home?.text.match(/\bDINITROL\b/i)?.[0];
  if (!name) throw new Error('DINITROL: company identity is absent from the homepage text.');
  return { name, website: site.baseUrl, country: 'BY' };
}

export function parseServices(pages) {
  assertContent(pages);
  // Publishing a generic heading/number parser would invent associations without
  // ever seeing DINITROL's service, vehicle or dynamic-price markup.
  throw new Error(
    'DINITROL extraction blocked: live HTML returned HTTP 403. Service, vehicle and price ' +
      'selectors remain unverified; inspect accessible live pages before enabling publication. ' +
      'See README.md and access-evidence.json.',
  );
}

export function buildSite(pages, date) {
  const company = parseCompany(pages);
  // Return { services, vehicle_types, currency, warnings } from the custom parser.
  // Preserve original names and qualified price text; use prices: [] when absent.
  const { services, vehicle_types = [], currency, warnings = [] } = parseServices(pages);
  if (!services.length || !currency)
    throw new Error('Extract the site services and select the comparison currency');
  const sources = pages.map((page) => ({
    url: page.url,
    fetched_at: page.fetched_at,
    used_for: [page.title],
  }));
  const harvest = {
    metadata: {
      source_site: site.baseUrl,
      brand: company.name,
      retrieved_at: date,
      notes: ['Claims and guarantees are statements by the source site.'],
    },
    company: { ...company, contacts: contactsFromText(pages.map((page) => page.text).join('\n')) },
    services,
    vehicle_types,
    site_claims: claimsFromPages(pages),
    pages,
    sources,
  };
  const comparison = {
    schema_version: '1.0',
    company,
    source: {
      scraped_at: date,
      urls: sources.map((source) => source.url),
      notes: warnings.join(' '),
    },
    currency,
    vehicle_types,
    services,
  };
  return { harvest, comparison, warnings };
}
