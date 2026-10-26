import {
  claimsFromPages,
  clean,
  contactsFromText,
  parseMoney,
  vehicleClass,
} from '@anticor/harvest-core';
import site from './site.js';

function homePage(pages) {
  const home = pages.find((page) => new URL(page.url).pathname === '/');
  if (!home) throw new Error('Missing homepage');
  return home;
}

export function parseCompany(pages) {
  const home = homePage(pages);
  const business = home.structured_data.find((item) => item['@type'] === 'AutoRepair');
  const name = business?.name;
  if (!name) throw new Error('No company name in live AutoRepair structured data');
  const contacts = contactsFromText(home.body_text);
  return {
    name,
    website: site.baseUrl,
    country: 'BY',
    locations: home.site_evidence.addresses.map((address) => ({
      city: business.address?.addressLocality || address.split(',')[0],
      address,
      phones: contacts.phones,
      working_hours: home.site_evidence.working_hours,
    })),
  };
}

export function parseServices(pages) {
  const home = homePage(pages);
  const states = home.pricing_states || [];
  const tabs = home.pricing_tabs || [];
  if (
    !tabs.length ||
    tabs.length !== states.length ||
    new Set(states.map((state) => state.key)).size !== states.length ||
    tabs.some((tab) => !states.some((state) => state.key === tab.key && state.name === tab.name))
  )
    throw new Error('Incomplete vehicle selector state coverage');
  const vehicle_types = states.map((state) => ({
    id: state.key,
    name_original: state.name,
    class: vehicleClass(state.name),
    examples: clean(state.description),
  }));
  const servicesByName = new Map();
  const warnings = [
    'Цены сохраняют опубликованные квалификаторы; после осмотра цена фиксируется. Единица — тариф обработки автомобиля; отдельной цены за м² или литр нет.',
    'Категории сайта объединяют разные автомобили: легковые; кроссоверы/SUV; пикапы/рамные внедорожники; минивэны/микроавтобусы; коммерческий транспорт. Классы сравнения приблизительны.',
    'Оба телефона опубликованы общим блоком для двух адресов; привязка номера к конкретному адресу не указана.',
  ];
  const expectedNames = states[0].cards.map((card) => card.name);
  for (const state of states) {
    if (
      !state.cards.length ||
      state.cards.length !== expectedNames.length ||
      new Set(state.cards.map((card) => card.name)).size !== expectedNames.length ||
      expectedNames.some((name) => !state.cards.some((card) => card.name === name))
    )
      throw new Error(`Incomplete tariffs for ${state.name}`);
    for (const card of state.cards) {
      if (!card.name || !state.text.includes(card.name))
        throw new Error(`Tariff name absent from source text: ${card.name}`);
      if (!servicesByName.has(card.name)) {
        const duration = home.site_evidence.benefits.find((text) =>
          /за один рабочий день/iu.test(text),
        );
        servicesByName.set(card.name, {
          id: `tariff-${servicesByName.size + 1}`,
          category: 'anticorrosion',
          name_original: card.name,
          description: '',
          url: home.url,
          completion_time: duration
            ? { min: 1, max: 1, unit: 'days', text_original: duration }
            : null,
          prices: [],
        });
      }
      const service = servicesByName.get(card.name);
      service.description += `${service.description ? '\n' : ''}${state.name}: ${card.items.join('; ')}.`;
      if (
        !card.price_text_original ||
        /по запросу|договорн|уточн/iu.test(card.price_text_original)
      ) {
        warnings.push(`${card.name}, ${state.name}: цена не опубликована или по запросу.`);
        continue;
      }
      if (!/Br|BYN|руб/iu.test(card.price_text_original))
        throw new Error(`Unknown price currency: ${card.price_text_original}`);
      const money = parseMoney(card.price_text_original);
      if (money.price === null && money.price_min === null && money.price_max === null)
        throw new Error(`Unrecognized price: ${card.price_text_original}`);
      service.prices.push({
        vehicle_type_id: state.key,
        ...money,
        price_text_original: card.price_text_original,
        notes: `${state.note} Единица: тариф обработки автомобиля. ${card.items.join('; ')}. Источник: ${state.source_url}`,
      });
    }
  }
  return { services: [...servicesByName.values()], vehicle_types, currency: 'BYN', warnings };
}

export function buildSite(pages, date) {
  const company = parseCompany(pages);
  const { services, vehicle_types, currency, warnings } = parseServices(pages);
  const home = homePage(pages);
  const sources = pages.map((page) => ({
    url: page.url,
    fetched_at: page.fetched_at,
    used_for: ['Компания, контакты, материалы, заявления, все состояния тарифов'],
  }));
  const evidence = (text) => ({ text, source_url: home.url, verification: 'site_claim' });
  const benefits = home.site_evidence.benefits;
  const harvest = {
    metadata: {
      source_site: site.baseUrl,
      brand: company.name,
      retrieved_at: date,
      notes: ['Claims and guarantees are statements by the source site.'],
    },
    company: {
      ...company,
      contacts: { ...contactsFromText(home.body_text), telegram: home.site_evidence.telegram },
      overview: evidence(home.site_evidence.hero),
    },
    services,
    vehicle_types,
    currency,
    materials: benefits.filter((text) => /материал/iu.test(text)).map(evidence),
    technology: services.map((service) => ({
      tariff: service.name_original,
      text: service.description,
      source_url: service.url,
    })),
    site_claims: [
      ...claimsFromPages(pages),
      ...benefits.map(evidence),
      evidence(home.site_evidence.hero),
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
