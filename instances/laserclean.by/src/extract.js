import { claimsFromPages, clean, contactsFromText, unique } from '@anticor/harvest-core';
import site from './site.js';

function homepage(pages) {
  const home = pages.find((page) => new URL(page.url).pathname === '/');
  if (!home?.laserclean) throw new Error('LaserClean homepage DOM evidence is missing');
  return home;
}

export function parseCompany(pages) {
  const home = homepage(pages);
  const name = home.headings.map((heading) => heading.text.match(/^(.+?) это:/)?.[1]).find(Boolean);
  if (!name) throw new Error('LaserClean brand heading is missing');
  const location = home.laserclean.location.match(/г\.\s*(\S+)\s+(ул\..+)/u);
  if (!location) throw new Error('LaserClean location evidence is missing');
  return {
    name,
    website: site.baseUrl,
    country: 'BY',
    locations: [
      {
        city: location[1],
        address: clean(location[2]),
        phones: contactsFromText(home.laserclean.contacts).phones,
      },
    ],
  };
}

export function parseServices(pages) {
  const home = homepage(pages);
  // No tariff table or price controls existed on the inspected homepage. Fail for
  // review if a monetary tariff appears, rather than silently discarding it.
  if (/\d[\d\s.,–—-]*\s*(?:руб(?:\.|лей|ля)?|BYN|бел\.?\s*руб)/iu.test(home.text)) {
    throw new Error('New monetary tariff detected; inspect LaserClean pricing before publishing');
  }
  const antiName = home.laserclean.rotating_labels.find((label) =>
    /^Антикоррозийная обработка$/u.test(label),
  );
  const laserName = home.laserclean.rotating_labels.find((label) =>
    /^Лазерная чистка металла$/u.test(label),
  );
  if (!antiName || !laserName || !home.text.includes(antiName) || !home.text.includes(laserName)) {
    throw new Error('LaserClean advertised service labels are missing from source text');
  }
  const steps = home.laserclean.process.filter((text) => /^\d+ Этап/u.test(text));
  const corrosion = home.laserclean.process.find((text) =>
    /мощностью лазерного источника/u.test(text),
  );
  if (steps.length !== 10 || !corrosion) {
    throw new Error('LaserClean treatment process changed or was not extracted completely');
  }
  const timing = home.laserclean.benefits
    .map((item) => item.text.match(/Ваша машина возвращается в ваши руки уже через сутки\./u)?.[0])
    .find(Boolean);
  return {
    services: [
      {
        id: 'dinitrol-treatment',
        category: 'anticorrosion',
        name_original: antiName,
        description: steps.join('\n\n'),
        url: home.url,
        completion_time: timing ? { min: 1, max: 1, unit: 'days', text_original: timing } : null,
        prices: [],
      },
      {
        id: 'laser-metal-cleaning',
        category: 'additional',
        name_original: laserName,
        description: corrosion,
        url: home.url,
        completion_time: null,
        prices: [],
      },
    ],
    vehicle_types: [],
    currency: 'BYN',
    warnings: [
      'Published monetary prices, price units and vehicle price categories are absent; services have empty prices arrays. Contact the company for a quotation.',
      'BYN is the comparison currency for the Belarusian business; no currency is stated alongside a published tariff.',
      'Vehicle models in work videos are examples, not priced vehicle categories.',
      'The stated one-day turnaround is a site claim for vehicle treatment, not an independently verified guarantee.',
    ],
  };
}

export function buildSite(pages, date) {
  const home = homepage(pages);
  const company = parseCompany(pages);
  const { services, vehicle_types, currency, warnings } = parseServices(pages);
  const source = (text) => ({ text, source_url: home.url, verification: 'site_claim' });
  const materialsText = home.laserclean.benefits.find((item) =>
    /антикоррозийные материалы/u.test(item.title),
  )?.text;
  if (!materialsText) throw new Error('DINITROL materials evidence is missing');
  const materialSections = materialsText.split(/(?:^|\n)\s*-/u).filter((text) => text.trim());
  const corrosion = home.laserclean.process.find((text) => /Brunox/u.test(text));
  const materials = materialSections.map((text) => ({
    name: text.match(/DINITROL\s+(?:LT|ML|4941|81)\b/u)?.[0],
    ...source(text.trim()),
  }));
  if (corrosion) {
    for (const name of corrosion.match(/Brunox|эпоксидного грунта/gu) || []) {
      materials.push({ name, ...source(corrosion) });
    }
  }
  const cleaner = home.laserclean.process.find((text) => /DINITROL AUTO CLEANER/u.test(text));
  if (cleaner) {
    for (const name of cleaner.match(/DINITROL AUTO CLEANER|Активная пена/gu) || []) {
      materials.push({ name, ...source(cleaner) });
    }
  }
  const sources = pages.map((page) => ({
    url: page.url,
    fetched_at: page.fetched_at,
    used_for: [page.title],
  }));
  const claims = [
    ...claimsFromPages(pages),
    ...home.laserclean.benefits.map((item) => source(`${item.title}\n${item.text}`)),
    ...home.laserclean.process.filter((text) => /видеосъемкой/u.test(text)).map(source),
  ];
  const harvest = {
    metadata: {
      source_site: site.baseUrl,
      brand: company.name,
      retrieved_at: date,
      notes: [
        'Claims, product properties and turnaround are statements by the source site.',
        'All configured public typewriter headline states are preserved in page text and laserclean.rotating_labels.',
        'DINITROL treatment is one service; preparation and application stages are retained as process evidence.',
      ],
    },
    company: {
      ...company,
      contacts: {
        ...contactsFromText(pages.map((page) => page.body_text || page.text).join('\n')),
        social_links: home.links.filter((link) => /instagram\.com/u.test(link.url)),
      },
      offers: home.laserclean.consultation ? [source(home.laserclean.consultation)] : [],
    },
    services,
    vehicle_types,
    materials,
    technology: home.laserclean.process.map(source),
    vehicle_examples: unique(home.laserclean.portfolio).map(source),
    site_claims: claims.filter(
      (claim, index) => claims.findIndex((other) => other.text === claim.text) === index,
    ),
    pages,
    sources,
  };
  const comparison = {
    schema_version: '1.0',
    company,
    source: { scraped_at: date, urls: sources.map((item) => item.url), notes: warnings.join(' ') },
    currency,
    vehicle_types,
    services,
  };
  return { harvest, comparison, warnings };
}
