import { claimsFromPages, clean, contactsFromText, unique } from '@anticor/harvest-core';
import site from './site.js';

function homepage(pages) {
  const page = pages.find((item) => new URL(item.url).pathname === '/');
  if (!page?.blasting?.overview?.name) throw new Error('Missing live homepage service overview');
  return page;
}

export function parseContacts(pages) {
  const text = pages.map((page) => page.body_text || page.text).join('\n');
  // The live header uses the unusual grouping "+375 29-3 040-041".
  const originalPhones = unique(
    pages.flatMap((page) =>
      (page.blasting?.header_lines || []).filter((line) => /^\+375[\d\s()-]+$/.test(line)),
    ),
  );
  const shared = contactsFromText(text);
  return {
    phones: unique(
      [...originalPhones, ...shared.phones].map((phone) => `+${phone.replace(/\D/g, '')}`),
    ),
    emails: shared.emails,
    phones_original: originalPhones,
  };
}

export function parseCompany(pages) {
  const home = homepage(pages);
  const name = home.blasting.brand;
  if (!name || !home.text.includes(name)) throw new Error('Missing source-backed company name');
  const lines = home.blasting.header_lines;
  const address = lines.find((line) => /^г\./u.test(line));
  const city = address?.match(/^г\.\s*([^\s]+)/u)?.[1];
  const hours = lines.find((line) => /ПН-Сб/.test(line));
  return {
    name,
    website: site.baseUrl,
    country: 'BY',
    locations: address
      ? [
          {
            city,
            address,
            phones: parseContacts(pages).phones,
            ...(hours ? { working_hours: hours } : {}),
          },
        ]
      : [],
  };
}

export function parseServices(pages) {
  const home = homepage(pages);
  const { overview, steps } = home.blasting;
  if (home.blasting.interaction_controls.length)
    throw new Error('New interaction controls detected; inspect every state before publishing');
  const warnings = [
    'No numeric prices or price units are published. Prices and completion times are agreed after inspection; services have prices: [].',
    'No vehicle price categories are published; vehicle_types is empty.',
    'Currency is not stated on the site; BYN is the comparison currency inferred from the Belarus location. No monetary amounts are inferred.',
    'Welding is conditional on through-corrosion; zinc spraying is by agreement with the customer.',
  ];
  // Refuse to silently omit a newly introduced tariff: current live layout has none.
  if (pages.some((page) => /\d[\d\s.,]*\s*(?:BYN|бел\.?\s*руб|руб\.?|р\.|€|\$)/iu.test(page.text)))
    throw new Error('New monetary text detected; inspect the live price layout before publishing');
  const services = [];
  const add = (id, category, name, description) => {
    if (!name || !description) return;
    if (!clean(home.text).includes(name))
      throw new Error(`Service name missing from source: ${name}`);
    services.push({
      id,
      category,
      name_original: name,
      description,
      url: home.url,
      completion_time: null,
      prices: [],
    });
  };
  add('anticorrosion', 'anticorrosion', overview.name, overview.description);
  const blasting = steps.find((step) => /^Пескоструйная обработка$/.test(step.name));
  add('sandblasting', 'additional', blasting?.name, blasting?.description);
  const zincName = overview.description.match(/напыление цинка электродуговым методом/iu)?.[0];
  const zincDescription = overview.description.match(
    /Если есть места[\s\S]*?OSU-Hessler\s*\./u,
  )?.[0];
  add('arc-zinc-spraying', 'anticorrosion', zincName, zincDescription);
  const weldingDescription = blasting?.description.match(/В случае сквозной коррозии[^.]*\./u)?.[0];
  add(
    'conditional-welding',
    'additional',
    weldingDescription?.match(/сварочных работ/u)?.[0],
    weldingDescription,
  );
  if (!services.length) throw new Error('No source-backed services extracted');
  return { services, vehicle_types: [], currency: 'BYN', warnings };
}

export function buildSite(pages, date) {
  const company = parseCompany(pages);
  const { services, vehicle_types, currency, warnings } = parseServices(pages);
  const home = homepage(pages);
  const evidence = (text) => ({ text, source_url: home.url });
  const paragraphs = home.paragraphs || [];
  const sources = pages.map((page) => ({
    url: page.url,
    fetched_at: page.fetched_at,
    used_for: [
      page.title,
      new URL(page.url).pathname === '/' ? 'services and technology' : 'contacts',
    ],
  }));
  const claims = unique([
    ...claimsFromPages(pages).map((claim) => claim.text),
    ...home.blasting.journey.filter((text) => /БЕСПЛАТНЫЙ|НАДЕЖНЫХ/u.test(text)),
  ]).map((text) => ({ ...evidence(text), verification: 'site_claim' }));
  const harvest = {
    metadata: {
      source_site: site.baseUrl,
      brand: company.name,
      retrieved_at: date,
      notes: ['Claims and guarantees are statements by the source site.'],
    },
    company: {
      ...company,
      contacts: parseContacts(pages),
      description: evidence(home.blasting.overview.description),
    },
    services,
    vehicle_types,
    technology: home.blasting.steps.map((step) => ({ ...step, source_url: home.url })),
    materials: paragraphs
      .filter((text) => /OSU-Hessler|антигравийных покрытий/u.test(text))
      .map(evidence),
    customer_journey: home.blasting.journey.map(evidence),
    price_conditions: home.blasting.journey
      .filter((text) => /ЦЕНУ И СРОКИ/u.test(text))
      .map(evidence),
    site_claims: claims,
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
