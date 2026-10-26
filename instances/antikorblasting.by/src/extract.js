import {
  claimsFromPages,
  clean,
  contactsFromText,
  parseMoney,
  unique,
} from '@anticor/harvest-core';
import site from './site.js';

const findPage = (pages, path) => pages.find((page) => new URL(page.url).pathname === path);

function section(page, heading) {
  const text = clean(page.text);
  const start = text.indexOf(heading);
  if (start < 0) throw new Error(`Service heading is absent from rendered page: ${heading}`);
  const end = page.headings
    .map(({ text: next }) => text.indexOf(clean(next), start + heading.length))
    .filter((position) => position > start)
    .sort((a, b) => a - b)[0];
  return text.slice(start + heading.length, end).trim();
}

export function parseCompany(pages) {
  const contact = findPage(pages, '/contacts/');
  if (!contact) throw new Error('Required contact page is missing');
  const text = contact.text;
  const name = text.match(/ООО\s+["“«]Антикор Бластинг Кампани["”»]/u)?.[0];
  if (!name) throw new Error('Company legal name was not found in current page content');
  const phones = unique(
    (contact.contact_links || [])
      .filter((link) => link.url.startsWith('tel:'))
      .map((link) => clean(link.text) || link.url.slice(4)),
  );
  const address = text.match(/Минск,\s*ул\.\s*Красноармейская[^\n]+/u)?.[0];
  const hours = text.match(/ПН-ПТ[^\n]+(?:\n\s*СБ[^\n]+)?/u)?.[0];
  return {
    name: clean(name),
    website: site.baseUrl,
    country: 'BY',
    locations: [
      {
        ...(address ? { city: 'Минск', address: clean(address) } : {}),
        phones,
        ...(hours ? { working_hours: clean(hours) } : {}),
      },
    ],
  };
}

// Restrict money parsing to a currency-bearing price line, never gallery years or guarantees.
export function publishedPrice(text) {
  const original = clean(text);
  if (
    !/^(?:от\s+|до\s+)?\d[\d\s.,]*(?:(?:до|[–—-])\s*\d[\d\s.,]*)?\s*(?:бел\.\s*рублей|руб\.?|BYN)\.?$/iu.test(
      original,
    )
  )
    return null;
  const normalized = original.replace(
    /^от\s+([\d\s.,]+?)\s+до\s+([\d\s.,]+?)(?=\s*(?:бел\.|руб|BYN))/iu,
    '$1–$2',
  );
  return { ...parseMoney(normalized), price_text_original: original };
}

export function parseServices(pages) {
  const home = findPage(pages, '/');
  const detail = findPage(pages, '/antikor-avto-blasting/');
  if (!home || !detail) throw new Error('Required home/service page is missing');
  const complex = detail.headings.find(({ text }) => /^Полный комплекс:/u.test(text));
  if (!complex || !clean(detail.text).includes(complex.text))
    throw new Error('Full complex heading was not found in rendered content');
  const scopeStart = detail.headings.indexOf(complex) + 1;
  const following = detail.headings.slice(scopeStart);
  const boundary = following.findIndex(({ level }) => level === 2);
  const scope = boundary < 0 ? following : following.slice(0, boundary);
  const priceHeading = scope.find(({ text }) => publishedPrice(text));
  const qualifier = scope.find(({ text }) => /в зависимости/u.test(text))?.text;
  const description = scope
    .filter(({ text }) => !publishedPrice(text))
    .map(({ text }) => text)
    .join(' ');
  const vehicleLabel = clean(detail.text).match(/размера (авто)/u)?.[1];
  const vehicle_types = vehicleLabel
    ? [{ id: 'auto', name_original: vehicleLabel, class: 'any' }]
    : [];
  const price = priceHeading ? publishedPrice(priceHeading.text) : null;
  if (price && !vehicleLabel) throw new Error('Published price has no source vehicle scope');
  const services = [
    {
      id: 'full-complex',
      category: 'anticorrosion',
      name_original: complex.text,
      description,
      url: detail.url,
      completion_time: null,
      prices: price
        ? [
            {
              vehicle_type_id: 'auto',
              ...price,
              notes: [`Объем работ: ${complex.text}`, qualifier, `Источник: ${detail.url}`]
                .filter(Boolean)
                .join(' '),
            },
          ]
        : [],
    },
  ];
  const definitions = [
    ['anticorrosion', 'anticorrosion', /^Антикоррозийная защита$/u],
    ['cold-zinc', 'anticorrosion', /^Холодное цинкование и антикор$/u],
    ['wood-blasting', 'additional', /^Пескоструйная очистка дерева/u],
    ['metal-blasting', 'additional', /^Пескоструйная очистка металлоконструкций/u],
    ['masonry-blasting', 'additional', /^Пескоструйная очистка бетона, кирпича$/u],
  ];
  for (const [id, category, pattern] of definitions) {
    const heading = home.headings.find(({ text }) => pattern.test(text));
    if (!heading) throw new Error(`Expected service heading missing: ${id}`);
    services.push({
      id,
      category,
      name_original: heading.text,
      description: section(home, heading.text),
      url: home.url,
      completion_time: null,
      prices: [],
    });
  }
  return {
    services,
    vehicle_types,
    currency: 'BYN',
    warnings: [
      'Отдельные цены на услуги главной страницы не опубликованы; prices: [].',
      'Сайт не определяет классы автомобилей: авто — общий охват диапазона, а не единая фиксированная цена.',
      ...(!price
        ? ['На текущей странице комплекса числовая цена не найдена; старые цены не используются.']
        : []),
    ],
  };
}

export function buildSite(pages, date) {
  const company = parseCompany(pages);
  const { services, vehicle_types, currency, warnings } = parseServices(pages);
  const sources = pages.map((page) => ({
    url: page.url,
    fetched_at: page.fetched_at,
    used_for: [page.title],
  }));
  const contactPage = findPage(pages, '/contacts/');
  const contacts = contactsFromText(pages.map((page) => page.body_text || page.text).join('\n'));
  contacts.phones = unique([
    ...contacts.phones,
    ...company.locations.flatMap((location) => location.phones),
  ]);
  contacts.links = contactPage.contact_links || [];
  const evidence = pages.flatMap((page) =>
    (page.paragraphs || [])
      .filter((text) => /абразив|цинк|грунт|покрас|DINITROL|пластик|запаск|выезд/iu.test(text))
      .map((text) => ({ text, source_url: page.url, verification: 'site_claim' })),
  );
  const headingClaims = pages.flatMap((page) =>
    page.headings
      .filter(({ text }) => /гаранти/iu.test(text))
      .map(({ text }) => ({ text, source_url: page.url, verification: 'site_claim' })),
  );
  const home = findPage(pages, '/');
  const operatingSince = home.text.match(/Работаем для Вас с \d{4}\./u)?.[0];
  const harvest = {
    metadata: {
      source_site: site.baseUrl,
      brand: company.name,
      retrieved_at: date,
      notes: [
        'Claims, guarantees, technical statements and material references are statements by the source site.',
        'BYN is supported by the published бел. рублей price label. No separate price unit or vehicle classes are published.',
      ],
    },
    company: { ...company, contacts },
    services,
    vehicle_types,
    site_claims: [
      ...claimsFromPages(pages),
      ...headingClaims,
      ...(operatingSince
        ? [{ text: operatingSince, source_url: home.url, verification: 'site_claim' }]
        : []),
    ],
    technology_and_materials: evidence,
    work_examples: pages.flatMap((page) =>
      (page.gallery_captions || []).map((text) => ({ text, source_url: page.url })),
    ),
    price_evidence: services.flatMap((service) =>
      service.prices.map((price) => ({
        service_id: service.id,
        source_url: service.url,
        text: price.price_text_original,
        qualifiers: price.notes,
        unit_original: null,
        scope_original: service.name_original,
      })),
    ),
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
