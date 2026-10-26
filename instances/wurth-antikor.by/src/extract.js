import {
  claimsFromPages,
  clean,
  contactsFromText,
  parseMoney,
  unique,
  vehicleClass,
} from '@anticor/harvest-core';
import site, { servicePaths } from './site.js';

const pageAt = (pages, path) => pages.find((page) => new URL(page.url).pathname === path);
const textOf = (page) => page?.body_text || page?.text || '';
const numericOffer = /(?:от\s*)?\d[\d\s.,–—-]*\s*(?:рубл(?:ей|я|ь)|руб\.?|BYN)/iu;

export function parseCompany(pages) {
  const home = pageAt(pages, '/');
  const name = home?.headings.find((heading) =>
    /^Центр антикоррозийной обработки премиальными материалами/.test(heading.text),
  )?.text;
  if (!name) throw new Error('Company name missing from live home page');
  const contactText = textOf(pageAt(pages, '/contacts/'));
  const address = contactText.match(/Мы находимся:\s*([^\n]+)/u)?.[1];
  const hours = contactText.match(/Время работы:\s*([^\n]+)\n([^\n]+)/u);
  const contacts = contactsFromText(contactText);
  return {
    name: clean(name),
    website: site.baseUrl,
    country: 'BY',
    locations: address
      ? [
          {
            city: clean(address.match(/г\.\s*([^\s]+)/u)?.[1] || ''),
            address: clean(address),
            phones: contacts.phones,
            ...(hours ? { working_hours: `${clean(hours[1])}; ${clean(hours[2])}` } : {}),
          },
        ]
      : [],
  };
}

function service(id, name, page, prices, description, category = 'anticorrosion') {
  const name_original = clean(name);
  if (!clean(textOf(page)).includes(name_original))
    throw new Error(`Service name absent from source page: ${name_original}`);
  const url = new URL(page.url);
  url.hash = '';
  if (url.href !== page.url) throw new Error(`Unexpected noncanonical source URL: ${page.url}`);
  return {
    id,
    category,
    name_original,
    url: page.url,
    description,
    completion_time: null,
    prices,
  };
}

export function parseServices(pages) {
  if (pages.some((page) => page.price_controls?.length))
    throw new Error('Unexpected interactive controls: inspect and capture every pricing state');
  const services = [];
  const vehicle_types = [];
  const price_evidence = [];
  const warnings = [];
  const treatment = pageAt(pages, servicePaths[0]);
  if (!treatment?.price_cards?.length) throw new Error('Treatment price cards were not extracted');
  const exclusion = clean(textOf(treatment)).match(
    /Стоимость удаления коррозии оплачивается отдельно/u,
  )?.[0];
  const prices = treatment.price_cards.map((card, index) => {
    if (!numericOffer.test(card.offer_text))
      throw new Error(`Missing treatment price: ${card.name_original}`);
    const id = `vehicle-${index + 1}`;
    const label = clean(card.name_original.replace(/,?\s*стандартный комплекс/iu, ''));
    vehicle_types.push({ id, name_original: label, class: vehicleClass(label) });
    const price = {
      vehicle_type_id: id,
      ...parseMoney(card.offer_text),
      notes: [card.name_original, exclusion, `Источник: ${treatment.url}`]
        .filter(Boolean)
        .join('. '),
    };
    price_evidence.push({
      service_id: 'standard-treatment',
      vehicle_type_id: id,
      price_text_original: card.offer_text,
      source_url: treatment.url,
      selector: card.selector,
      unit_original: card.name_original.match(/стандартный комплекс/iu)?.[0] || null,
      scope_original: card.name_original,
      excluded_badge_text: card.badge_text,
    });
    return price;
  });
  const treatmentName = textOf(treatment).match(/^АНТИКОРРОЗИЙНАЯ ОБРАБОТКА АВТОМОБИЛЕЙ$/mu)?.[0];
  if (!treatmentName) throw new Error('Treatment title missing');
  services.push(
    service(
      'standard-treatment',
      treatmentName,
      treatment,
      prices,
      exclusion || 'Стандартный комплекс',
    ),
  );

  for (const [sectionIndex, path] of servicePaths.slice(1).entries()) {
    const page = pageAt(pages, path);
    if (!page?.price_cards?.length) throw new Error(`Service cards missing: ${path}`);
    for (const [index, card] of page.price_cards.entries()) {
      if (!card.name_original || !card.offer_text)
        throw new Error(`Incomplete service card: ${path}`);
      const id = `section-${sectionIndex + 1}-service-${index + 1}`;
      const quoted = /по запросу/iu.test(card.offer_text);
      if (!quoted && !numericOffer.test(card.offer_text))
        throw new Error(`Unknown price format: ${card.offer_text}`);
      const cardPrices = quoted
        ? []
        : [
            {
              vehicle_type_id: 'unspecified',
              ...parseMoney(card.offer_text),
              notes: `Категория автомобиля и единица расчёта не указаны. Источник: ${page.url}`,
            },
          ];
      services.push(
        service(
          id,
          card.name_original,
          page,
          cardPrices,
          card.offer_text,
          path === '/lazernoe-udalenie-korrozii/' ? 'additional' : 'anticorrosion',
        ),
      );
      price_evidence.push({
        service_id: id,
        price_text_original: card.offer_text,
        pricing_basis: quoted ? 'quote_only' : 'published_amount',
        source_url: page.url,
        selector: card.selector,
        unit_original: null,
        excluded_badge_text: card.badge_text,
      });
    }
  }

  // The homepage publishes broad starting prices, separately from quote-only detailed work.
  const home = pageAt(pages, '/');
  const promos = [
    ...textOf(home).matchAll(
      /^(ЛАЗЕРНОЕ УДАЛЕНИЕ КОРРОЗИИ|ГАЗОДИНАМИЧЕСКОЕ УДАЛЕНИЕ И ЛУЖЕНИЕ|ГАЗОТЕРМИЧЕСКОЕ УДАЛЕНИЕ И ГОРЯЧЕЕ ЦИНКОВАНИЕ)\.\s*(ОТ\s+[\d\s.,]+\s+РУБЛЕЙ)\.?$/gmu,
    ),
  ];
  for (const [index, match] of promos.entries()) {
    const id = `homepage-starting-price-${index + 1}`;
    services.push(
      service(
        id,
        match[1],
        home,
        [
          {
            vehicle_type_id: 'unspecified',
            ...parseMoney(match[2]),
            notes: `Начальная цена общего направления; объём работ, категория автомобиля и единица расчёта не указаны. Источник: ${home.url}`,
          },
        ],
        'Начальная цена на главной; детальные услуги на профильной странице — по запросу.',
        /^ЛАЗЕРНОЕ/u.test(match[1]) ? 'additional' : 'anticorrosion',
      ),
    );
    price_evidence.push({
      service_id: id,
      price_text_original: match[2],
      context_original: match[0],
      source_url: home.url,
      unit_original: null,
      pricing_basis: 'starting_price_unspecified_scope',
    });
  }
  if (
    services.some((entry) => entry.prices.some((price) => price.vehicle_type_id === 'unspecified'))
  )
    vehicle_types.push({
      id: 'unspecified',
      name_original: 'Категория автомобиля не указана',
      class: 'other',
    });
  warnings.push(
    'Повторяющийся ценовой бейдж карточек противоречит описаниям. Использованы .t778__descr; бейджи сохранены только как исходное свидетельство.',
  );
  warnings.push(
    'Подробные услуги лазерной, газодинамической и газотермической обработки указаны по запросу (prices: []). Начальные цены главной сохранены отдельно; единица расчёта и категория автомобиля не указаны.',
  );
  if (exclusion) warnings.push(exclusion);
  if (promos.length !== servicePaths.length - 1)
    warnings.push(
      'Не все начальные цены главной страницы найдены; отсутствующие значения не восстановлены.',
    );
  return { services, vehicle_types, currency: 'BYN', price_evidence, warnings };
}

function evidenceFromPages(pages, pattern) {
  const seen = new Set();
  return pages.flatMap((page) => {
    const blocks = page.content_blocks?.map((block) => block.text) || page.paragraphs || [];
    return blocks
      .filter((text) => pattern.test(text))
      .flatMap((text) => {
        const key = clean(text);
        if (seen.has(key)) return [];
        seen.add(key);
        return [{ text: key, source_url: page.url, verification: 'site_claim' }];
      });
  });
}

export function buildSite(pages, date) {
  const company = parseCompany(pages);
  const { services, vehicle_types, currency, price_evidence, warnings } = parseServices(pages);
  const sources = pages.map((page) => ({
    url: page.url,
    fetched_at: page.fetched_at,
    used_for: [page.title],
  }));
  const allText = pages.map(textOf).join('\n');
  const contacts = contactsFromText(allText);
  contacts.emails = unique([
    ...contacts.emails,
    ...pages.flatMap((page) =>
      (page.contact_links || [])
        .filter((link) => link.url.startsWith('mailto:'))
        .map((link) => link.url.slice(7).split('?')[0]),
    ),
  ]);
  const companyEvidence = evidenceFromPages(pages, /гарант|опыт|Пенсионерам|лет|сертификац/iu);
  const harvest = {
    metadata: {
      source_site: site.baseUrl,
      brand: company.name,
      retrieved_at: date,
      notes: [
        'Claims and guarantees are statements by the source site. Currency BYN is inferred from the Belarusian address and рубль prices; no conversion was applied.',
      ],
    },
    company: {
      ...company,
      contacts,
      legal_name: allText.match(/Общество с ограниченной ответственностью «[^»]+»/u)?.[0] || null,
      registration_number: allText.match(/УНП\s+(\d+)/u)?.[1] || null,
      legal_address: allText.match(/^\d{6}, г\. Минск[^\n]+/mu)?.[0] || null,
      contact_sources: pages
        .filter((page) => /\/(?:contacts|about)\/$/u.test(page.url))
        .map((page) => page.url),
    },
    services,
    vehicle_types,
    price_evidence,
    technologies_and_materials: evidenceFromPages(
      pages,
      /маслянно|каучук|битум|сверхзвуков|олов|цинка|лазер|газотермическ|напылени/iu,
    ),
    site_claims: [...claimsFromPages(pages), ...companyEvidence],
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
