import { claimsFromPages, clean, contactsFromText } from '@anticor/harvest-core';
import site from './site.js';

function homepage(pages) {
  const home = pages.find((page) => new URL(page.url).pathname === '/');
  if (!home?.anticorlida) throw new Error('No enriched Anticorlida homepage');
  return home;
}

export function parseCompany(pages) {
  const home = homepage(pages);
  const name = home.anticorlida.legal_text.match(/ИП\s+.+?(?=\s*УНП|$)/u)?.[0];
  const address = home.anticorlida.contacts.find((item) => /Наш адрес/u.test(item.label))?.text;
  const phoneText = home.anticorlida.contacts.find((item) => /Позвоните/u.test(item.label))?.text;
  if (!name || !address || !phoneText) throw new Error('Company/contact markup changed');
  const city = address.split(',').at(-1).trim();
  return {
    name,
    website: site.baseUrl,
    country: 'BY',
    locations: [{ city, address, phones: contactsFromText(phoneText).phones }],
  };
}

export function parseServices(pages) {
  const home = homepage(pages);
  const evidence = home.anticorlida;
  if (!evidence.scope.length || !evidence.technology.length || !evidence.advantages.length)
    throw new Error('Missing treatment/materials evidence; site markup may have changed');
  const url = new URL(home.url);
  url.hash = '';
  const offers = [
    {
      id: 'comprehensive-protection',
      category: 'anticorrosion',
      name_original: evidence.service_name,
      description: evidence.scope
        .map((item) => [item.name_original, item.description].filter(Boolean).join(' '))
        .join('\n'),
    },
    {
      id: 'anticorrosion-inspection',
      category: 'additional',
      name_original: evidence.inspection_name,
      description: evidence.inspection_description,
    },
  ];
  for (const offer of offers) {
    if (!offer.name_original || !clean(home.text).includes(offer.name_original))
      throw new Error(`Missing source service heading: ${offer.id}`);
  }
  if (evidence.price_controls || /\d\s*(?:BYN|руб\.?|бел\.?\s*руб)/iu.test(home.text))
    throw new Error('New pricing markup detected; inspect all states before publishing');
  return {
    services: offers.map((offer) => ({
      ...offer,
      url: url.href,
      completion_time: null,
      prices: [],
    })),
    vehicle_types: [],
    currency: 'BYN',
    warnings: [
      'На сайте нет числового прайса: стоимость комплексной обработки не опубликована; prices: [].',
      'Экспертиза обозначена «бесплатно»; исходный текст сохранён без выдуманной числовой цены.',
      'Категории автомобилей, единицы тарификации и срок выполнения не указаны.',
      'BYN — техническая валюта сравнения для Беларуси; на странице валюта не указана.',
      'Марки антикоррозийных материалов, срок гарантии и точный график работы не указаны. DETAIL — оборудование для сушки.',
    ],
  };
}

export function buildSite(pages, date) {
  const company = parseCompany(pages);
  const home = homepage(pages);
  const evidence = home.anticorlida;
  const { services, vehicle_types, currency, warnings } = parseServices(pages);
  const sources = pages.map((page) => ({
    url: page.url,
    fetched_at: page.fetched_at,
    used_for: ['services', 'contacts', 'company', 'technology', 'materials', 'site claims'],
  }));
  const sourced = (item) => ({ ...item, source_url: home.url });
  const harvest = {
    metadata: {
      source_site: site.baseUrl,
      brand: 'Anticorlida',
      retrieved_at: date,
      notes: ['Claims and guarantees are statements by the source site.'],
    },
    company: {
      ...company,
      contacts: contactsFromText(pages.map((page) => page.text).join('\n')),
      legal_text: evidence.legal_text,
      slogan: evidence.slogan,
      registration_number: evidence.legal_text.match(/УНП\s+(\d+)/u)?.[1] || null,
      description: evidence.introduction,
      contact_evidence: evidence.contacts.map(sourced),
    },
    services,
    vehicle_types,
    currency,
    treatment_scope: evidence.scope.map(sourced),
    technology: evidence.technology.map(sourced),
    materials: evidence.advantages.filter((item) => /материал/iu.test(item.title)).map(sourced),
    site_claims: [
      ...claimsFromPages(pages),
      sourced({ text: evidence.introduction, verification: 'site_claim' }),
      ...evidence.advantages.map((item) =>
        sourced({ text: `${item.title}: ${item.text}`, verification: 'site_claim' }),
      ),
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
