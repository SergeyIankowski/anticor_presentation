import {
  claimsFromPages,
  clean,
  contactsFromText,
  parseMoney,
  unique,
  vehicleClass,
} from '@anticor/harvest-core';
import site from './site.js';

function homepage(pages) {
  const home = pages.find((page) => new URL(page.url).pathname === '/');
  if (!home?.responsive_evidence) throw new Error('Missing live homepage/responsive evidence');
  return home;
}

export function parseCompany(pages) {
  const home = homepage(pages);
  const name = home.links.find((link) => /^Antikor-Vitebsk$/iu.test(link.text))?.text;
  if (!name) throw new Error('Company name missing from the live page');
  const text = home.responsive_evidence.desktop.contact_text;
  const city = text.match(/г\.\s*([^\n]+)/u)?.[1]?.trim();
  const address = text.match(/Бешенковичское шоссе[^\n]+(?:\nкорпус[^\n]+)?/u)?.[0];
  const workingHours = text.match(/Пн\.[^\n]*\d{1,2}:\d{2}[^\n]*/u)?.[0];
  return {
    name,
    website: site.baseUrl,
    country: 'BY',
    locations: [
      {
        ...(city ? { city } : {}),
        ...(address ? { address: clean(address) } : {}),
        phones: contactsFromText(text).phones,
        ...(workingHours ? { working_hours: clean(workingHours) } : {}),
      },
    ],
  };
}

export function parseServices(pages) {
  const home = homepage(pages);
  const { desktop, mobile } = home.responsive_evidence;
  // Check both responsive states. Never silently publish an incomplete price grid.
  const signatures = (cards) =>
    cards.map((card) => `${card.vehicle}|${card.price_text_original}`).sort();
  if (
    JSON.stringify(signatures(desktop.price_cards)) !==
    JSON.stringify(signatures(mobile.price_cards))
  ) {
    throw new Error('Desktop/mobile price cards differ; inspect every responsive price state');
  }
  if (!desktop.price_cards.length) throw new Error('No live price cards found in #ceni');
  const vehicle_types = desktop.price_cards.map((card, index) => ({
    id: `vehicle-${index + 1}`,
    name_original: card.vehicle,
    class: /^седан$/iu.test(card.vehicle) ? 'sedan' : vehicleClass(card.vehicle),
  }));
  const prices = desktop.price_cards.map((card, index) => {
    if (!card.vehicle || !/\d[\s\S]*Руб\./iu.test(card.price_text_original))
      throw new Error('Live price card is missing a vehicle or a ruble amount');
    return {
      vehicle_type_id: vehicle_types[index].id,
      ...parseMoney(card.price_text_original),
      notes: `Источник: ${home.url}; единица расчета отдельно не указана.`,
    };
  });
  const hero = unique([...desktop.hero_services, ...mobile.hero_services]);
  const anticorrosionName = hero.find((name) => /^антикоррозийная обработка$/iu.test(name));
  if (!anticorrosionName) throw new Error('Missing anticorrosion service heading');
  const services = [
    {
      id: 'anticorrosion',
      category: 'anticorrosion',
      name_original: anticorrosionName,
      description: desktop.technology_steps.map((step) => step.text).join('\n'),
      url: home.url,
      completion_time: null,
      prices,
    },
  ];
  const add = (id, name, description, category = 'additional') => {
    if (!name || !home.text.includes(name))
      throw new Error(`Service name absent from source text: ${name}`);
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
  // Mobile contains a longer bodywork label and three additional advertised services.
  const bodywork =
    hero.find((name) => /^кузовной ремонт,/iu.test(name)) ||
    hero.find((name) => /^кузовной ремонт$/iu.test(name));
  if (bodywork)
    add('bodywork', bodywork, 'Услуга перечислена на первом экране; цена не опубликована.');
  for (const [id, pattern] of [
    ['sandblasting', /^пескоструйная обработка$/iu],
    ['exhaust-repair', /^ремонт глушителей$/iu],
    ['plastic-repair', /^ремонт пластика$/iu],
    ['argon-welding', /^аргонодуговая сварка$/iu],
    ['towbar-installation', /^установка фаркопов, кенгурятников$/iu],
  ]) {
    const name = hero.find((value) => pattern.test(value));
    if (name) add(id, name, 'Услуга перечислена на первом экране; цена не опубликована.');
  }
  if (desktop.vip_text) add('vip', 'VIP', desktop.vip_text, 'anticorrosion');
  if (desktop.wheel_heading)
    add('wheel-painting', desktop.wheel_heading.replace(/\s+В ВИТЕБСКЕ$/u, ''), desktop.wheel_text);
  const wheelServices = desktop.wheel_text.match(
    /услуги шиномонтажа, сварки и выравнивания дисков/iu,
  )?.[0];
  if (wheelServices) add('wheel-repair-and-tyres', wheelServices, desktop.wheel_text);
  const diagnostic = desktop.diagnostic_text.match(/диагностику днища вашего авто/iu)?.[0];
  if (diagnostic) add('underbody-inspection', diagnostic, desktop.diagnostic_text);
  return {
    services,
    vehicle_types,
    currency: 'BYN',
    warnings: [
      'Опубликованы только цены «от» для антикоррозийной обработки. Единица расчета отдельно не указана; цены VIP и дополнительных услуг отсутствуют.',
      'Диагностика днища заявлена бесплатной; цифровая цена не опубликована и не добавлена.',
      'Мобильная версия дополнительно перечисляет ремонт пластика, аргонодуговую сварку и установку фаркопов, кенгурятников.',
      'Гарантия заявлена без срока. Длительность работ в отзывах не используется как срок выполнения услуги.',
      'Информация на сайте носит ознакомительный характер и не является публичной офертой.',
    ],
  };
}

export function buildSite(pages, date) {
  const company = parseCompany(pages);
  const { services, vehicle_types, currency, warnings } = parseServices(pages);
  const home = homepage(pages);
  const evidence = home.responsive_evidence.desktop;
  const sources = pages.map((page) => ({
    url: page.url,
    fetched_at: page.fetched_at,
    used_for: [page.title],
  }));
  const claimTexts = unique([
    ...pages.flatMap((page) =>
      page.paragraphs.filter((text) => /Dinitrol|Wurt|защит|коррози|гарант/iu.test(text)),
    ),
    ...home.headings
      .map((heading) => heading.text)
      .filter((text) => /рассрочка|гаранти|фотоотчет|фото после/iu.test(text)),
    ...home.text
      .split('\n')
      .map(clean)
      .filter((text) => /^Мы гарантируем|публичной офертой/u.test(text)),
  ]);
  const materials = unique(
    evidence.technology_steps.flatMap(
      (step) => step.text.match(/Dinitrol\s+(?:4941|Metalik|ML|LT|81)|Wurt\b/giu) || [],
    ),
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
      contacts: contactsFromText(home.body_text),
      social_links: evidence.social_links.filter(
        (link, index, links) => links.findIndex((item) => item.url === link.url) === index,
      ),
      coordinates_text: evidence.contact_text.match(/GPS\s*-\s*[^\n]+/u)?.[0] || null,
    },
    services,
    vehicle_types,
    technology: evidence.technology_steps.map((step) => ({ ...step, source_url: home.url })),
    materials: materials.map((name) => ({
      name_original: name,
      source_url: home.url,
      verification: 'site_claim',
    })),
    price_evidence: evidence.price_cards.map((card) => ({
      ...card,
      currency,
      source_url: home.url,
    })),
    site_claims: [
      ...claimsFromPages(pages),
      ...claimTexts.map((text) => ({ text, source_url: home.url, verification: 'site_claim' })),
    ],
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
