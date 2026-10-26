import { claimsFromPages, contactsFromText } from '@anticor/harvest-core';
import site from './site.js';

// Implement these functions using the site's actual markup and page snapshots.
export function parseCompany(pages) {
  const home = pages.find((page) => new URL(page.url).pathname === '/');
  const name = home?.headings.find((heading) => heading.level === 1)?.text;
  if (!name) throw new Error('Implement parseCompany(): no company name was extracted');
  return { name, website: site.baseUrl };
}

export function parseServices(_pages) {
  throw new Error(
    'Implement parseServices() in src/extract.js for this site before publishing a harvest',
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
