import {
  claimsFromPages,
  clean,
  contactsFromText,
  parseMoney,
  unique,
  vehicleClass,
} from '@anticor/harvest-core';
import site from './site.js';

const pathOf = (page) => new URL(page.url).pathname;
const originalText = (page) => page.body_text || page.text;
const evidence = (page, text) => ({ text: clean(text), source_url: page.url });

function section(text, start, end) {
  const from = text.indexOf(start);
  if (from < 0) return '';
  const to = text.indexOf(end, from + start.length);
  return clean(text.slice(from, to < 0 ? undefined : to));
}

export function parseCompany(pages) {
  const home = pages.find((page) => pathOf(page) === '/');
  const contact = pages.find((page) => pathOf(page) === '/kontakty/');
  const brand = home?.title.match(/proficor/iu)?.[0];
  if (!brand || !contact) throw new Error('PROFICOR identity/contact evidence missing');
  const text = originalText(contact);
  const address = text.match(/г\.\s*Минск,\s*ул\.\s*Янки Мавра[^\n]+/u)?.[0];
  const hours = text.match(/с\s*\d+[.:]\d+\s*до\s*\d+[.:]\d+\s*\([^\n)]+\)/u)?.[0];
  if (!address || !hours) throw new Error('Contact address or opening hours missing');
  return {
    name: brand.toUpperCase(),
    website: site.baseUrl,
    country: 'BY',
    locations: [
      {
        city: 'Минск',
        address: clean(address),
        phones: contactsFromText(text).phones,
        working_hours: clean(hours),
      },
    ],
  };
}

function money(text, vehicleId, notes) {
  const parsed = parseMoney(text);
  if ([parsed.price, parsed.price_min, parsed.price_max].every((value) => value === null))
    throw new Error(`Unrecognized published amount: ${text}`);
  return { vehicle_type_id: vehicleId, ...parsed, notes };
}

export function parseServices(pages) {
  const home = pages.find((page) => pathOf(page) === '/');
  const electric = pages.find(
    (page) => pathOf(page) === '/antikorrozijnaya-obrabotka-elektromobilej/',
  );
  const polishing = pages.find((page) => pathOf(page) === '/polirovka/');
  if (!home || !electric || !polishing) throw new Error('Required service pages missing');
  if (pages.some((page) => page.proficor?.dynamic_price_control_count > 0))
    throw new Error('New interactive price controls need explicit state enumeration');
  const cards = home.proficor?.price_cards || [];
  if (cards.length !== 3) throw new Error('Expected all three vehicle pricing cards');
  const vehicle_types = [];
  const services = [];
  const pricing_evidence = [];
  const complexes = new Map();
  const duration = home.text.match(/занимает\s+(\d+)[-–](\d+)\s*часов/iu);
  const completion_time = duration
    ? {
        min: Number(duration[1]),
        max: Number(duration[2]),
        unit: 'hours',
        text_original: duration[0],
      }
    : null;
  const technology = section(home.text, 'Этапы антикоррозийной обработки', 'Отзывы');
  for (const [index, card] of cards.entries()) {
    const vehicleId = `vehicle-${index + 1}`;
    const matches = [
      ...card.text.matchAll(/(Комплекс\s+(?:ЛАЙТ|СТАНДАРТ)):\s*([^:]+?р(?:уб\.?)?)(?=\s|$)/gu),
    ];
    if (matches.length !== 2 || new Set(matches.map((match) => match[1])).size !== 2)
      throw new Error(`Incomplete LIGHT/STANDARD matrix for ${card.name}`);
    const firstPrice = card.text.indexOf(matches[0][0]);
    vehicle_types.push({
      id: vehicleId,
      name_original: card.name,
      class: vehicleClass(card.name),
      examples: clean(card.text.slice(card.name.length, firstPrice)),
    });
    for (const match of matches) {
      const name = clean(match[1]);
      if (!complexes.has(name)) {
        complexes.set(name, {
          id: name.endsWith('ЛАЙТ') ? 'anticorrosion-light' : 'anticorrosion-standard',
          category: 'anticorrosion',
          name_original: name,
          url: home.url,
          description: technology,
          completion_time,
          prices: [],
        });
      }
      complexes
        .get(name)
        .prices.push(money(match[2], vehicleId, `За комплекс; источник: ${home.url}`));
      pricing_evidence.push({
        ...evidence(home, match[0]),
        service_name: name,
        vehicle_type_id: vehicleId,
        unit_original: 'Комплекс',
        price_text_original: clean(match[2]),
      });
    }
  }
  services.push(...complexes.values());
  const electricName = electric.headings.find((heading) => heading.level === 1)?.text;
  if (!electricName) throw new Error('Electric service heading missing');
  const electricLabel = electric.text.match(/электромобилей и гибридов/u)?.[0];
  if (electricLabel)
    vehicle_types.push({ id: 'electric-hybrid', name_original: electricLabel, class: 'other' });
  services.push({
    id: 'electric-anticorrosion',
    category: 'anticorrosion',
    name_original: electricName,
    url: electric.url,
    description: section(
      electric.text,
      'Особенности антикоррозийной обработки электромобилей',
      'Отзывы',
    ),
    completion_time: null,
    prices: [],
  });
  const rows = polishing.proficor?.polishing || [];
  if (!rows.length) throw new Error('Polishing price list missing');
  const vehicleLabel = polishing.headings
    .find((heading) => /Цены на полировку/.test(heading.text))
    ?.text.match(/автомобиля/u)?.[0];
  if (!vehicleLabel) throw new Error('Polishing vehicle label missing');
  vehicle_types.push({ id: 'unspecified', name_original: vehicleLabel, class: 'other' });
  for (const [index, row] of rows.entries()) {
    if (!row.name || !polishing.text.includes(row.name))
      throw new Error(`Polishing service has no source anchor: ${row.name}`);
    const unit = row.description.match(/Цена указана за пару\./u)?.[0];
    const hasAmount = /\d/u.test(row.price);
    services.push({
      id: `polishing-${index + 1}`,
      category: 'additional',
      name_original: row.name,
      description: row.description,
      url: polishing.url,
      completion_time: null,
      prices: hasAmount
        ? [money(row.price, 'unspecified', clean(`${row.description} Источник: ${polishing.url}`))]
        : [],
    });
    if (hasAmount)
      pricing_evidence.push({
        ...evidence(polishing, `${row.name} ${row.price} ${row.description}`),
        service_name: row.name,
        price_text_original: row.price,
        unit_original: unit || row.name,
        vehicle_type_id: 'unspecified',
      });
  }
  for (const service of services) {
    const source = pages.find((page) => page.url === service.url);
    if (!source.text.includes(service.name_original) || new URL(service.url).hash)
      throw new Error(`Service source anchor missing: ${service.name_original}`);
  }
  return { services, vehicle_types, pricing_evidence, currency: 'BYN' };
}

export function buildSite(pages, date) {
  const company = parseCompany(pages);
  const { services, vehicle_types, currency, pricing_evidence } = parseServices(pages);
  const home = pages.find((page) => pathOf(page) === '/');
  const contact = pages.find((page) => pathOf(page) === '/kontakty/');
  const text = pages.map(originalText).join('\n');
  const warnings = [
    'Цены «от» являются нижними границами, а не фиксированной стоимостью.',
    'На странице электромобилей и гибридов стоимость не опубликована; цены общей страницы не перенесены.',
    'Категория «автомобиля» у полировки означает отсутствие детализации, а не одинаковую цену для всех машин.',
    'BYN определена по обозначениям «р»/«руб» и белорусскому адресу компании.',
    'Режим работы расходится: контакты — до 18.00, вс выходной; карта сайта — до 19.00; главная также содержит «без выходных».',
    'Гарантия «до 5 лет» условная; срок устанавливает мастер. Рекламные утверждения не проверялись независимо.',
    'Главная рекламирует обработку за 6 часов; FAQ уточняет продолжительность 6–8 часов.',
  ];
  const sources = pages.map((page) => ({
    url: page.url,
    fetched_at: page.fetched_at,
    used_for: [page.title],
  }));
  const facts = (pattern) =>
    pages.flatMap((page) =>
      page.paragraphs.filter((paragraph) => pattern.test(paragraph)).map((p) => evidence(page, p)),
    );
  const harvest = {
    metadata: {
      source_site: site.baseUrl,
      brand: company.name,
      retrieved_at: date,
      notes: ['Claims and guarantees are statements by the source site.'],
    },
    company: {
      ...company,
      legal_name: text.match(/ООО\s*«[^»]+»/u)?.[0] || null,
      registration_number: text.match(/УНП\s*(\d+)/u)?.[1] || null,
      contacts: {
        ...contactsFromText(text),
        source_url: contact.url,
        social_links: unique(
          pages.flatMap((page) =>
            page.links
              .filter((link) => /t\.me\/|instagram\.com\//u.test(link.url))
              .map((l) => l.url),
          ),
        ),
      },
    },
    services,
    vehicle_types,
    currency,
    pricing_evidence,
    materials: facts(/DINITROL|Dinitro|Dinitol|DINOL|битума или воска/iu),
    technology: [
      evidence(home, section(home.text, 'Этапы антикоррозийной обработки', 'Отзывы')),
      ...facts(/высоковольтных|Сушка:|Контроль качества:/iu),
    ],
    company_evidence: facts(
      /профессионал|сотрудник|Фото и видео|Бесплатная|рассроч|Максимальная гарантия|не выполняем/iu,
    ),
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
