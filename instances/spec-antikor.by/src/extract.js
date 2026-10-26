import {
  claimsFromPages,
  clean,
  contactsFromText,
  parseMoney,
  vehicleClass,
} from '@anticor/harvest-core';
import site, { servicePaths } from './site.js';

function homePage(pages) {
  const home = pages.find((page) => new URL(page.url).pathname === '/');
  if (!home?.calculator) throw new Error('Homepage calculator evidence is required');
  return home;
}

export function parseCompany(pages) {
  const home = homePage(pages);
  const name = home.evidence.company_statement.match(/^(.+?)\s+-\s+/)?.[1];
  if (!name) throw new Error('Company name missing from source footer');
  const address = home.evidence.address;
  return {
    name,
    website: site.baseUrl,
    country: 'BY',
    locations: [
      {
        ...(address.match(/г\.\s*([^,]+)/)?.[1] ? { city: address.match(/г\.\s*([^,]+)/)[1] } : {}),
        address,
        phones: home.evidence.phones,
        working_hours: home.evidence.working_hours,
      },
    ],
  };
}

export function parseServices(pages) {
  const home = homePage(pages);
  const { brands, vehicles, states } = home.calculator;
  const expected = brands.flatMap((brand) => vehicles.map((vehicle) => `${brand}/${vehicle.id}`));
  const actual = states.map((state) => `${state.brand}/${state.vehicle_type_id}`);
  if (
    actual.length !== expected.length ||
    new Set(actual).size !== expected.length ||
    expected.some((key) => !actual.includes(key))
  )
    throw new Error('Incomplete calculator brand/vehicle matrix');
  const vehicle_types = vehicles.map((vehicle) => ({
    ...vehicle,
    class: vehicleClass(vehicle.name_original),
  }));
  const services = [];
  for (const state of states) {
    if (state.packages.length !== 3) throw new Error('Expected three calculator packages');
    for (const item of state.packages) {
      let service = services.find((service) => service.id === item.id);
      if (!service) {
        service = {
          id: item.id,
          category: 'anticorrosion',
          name_original: item.name_original,
          description: '',
          url: home.url,
          completion_time: null,
          prices: [],
        };
        services.push(service);
      }
      const description = `${state.brand}: ${item.description}`;
      if (!service.description.includes(description))
        service.description += `${service.description ? '\n' : ''}${description}`;
      const money = parseMoney(item.price_text_original);
      if ([money.price, money.price_min, money.price_max].every((amount) => amount === null))
        throw new Error(`Unrecognized calculator price: ${item.price_text_original}`);
      service.prices.push({
        vehicle_type_id: state.vehicle_type_id,
        ...money,
        notes: `${state.brand}. ${item.description} ${home.evidence.price_caveat || ''} Источник: ${home.url}. Единица в ячейке не указана; стоимость комплекса для выбранного класса.`,
      });
    }
  }
  for (const path of servicePaths) {
    const link = home.links.find((link) => new URL(link.url).pathname === path && link.text);
    if (!link) continue;
    services.push({
      id: path.split('/')[1],
      category: 'additional',
      name_original: link.text,
      description: `Услуга указана в меню главной страницы. Отдельная страница: ${link.url}. Цена на доступной странице не указана.`,
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
      'Все цены калькулятора ориентировочные, с квалификатором «от»; требуется уточнение по телефону.',
      'BYN выбран по расположению в Беларуси и упоминанию рублей в тексте; в ячейках калькулятора валюта и единица явно не указаны.',
      'Классы автомобилей определены по видимым подписям: внутренние data-class не соответствуют названиям.',
      'Дополнительные услуги подтверждены только меню; подробности и цены недоступных страниц не восстановлены.',
      'Общий диапазон цен в SEO-тексте сохранён в странице и не подменяет цены калькулятора.',
    ],
  };
}

export function buildSite(pages, date) {
  const home = homePage(pages);
  const company = parseCompany(pages);
  const { services, vehicle_types, currency, warnings } = parseServices(pages);
  const sources = pages.map((page) => ({
    url: page.url,
    fetched_at: page.fetched_at,
    used_for: [page.title, 'services', 'contacts', 'calculator states', 'source claims'],
  }));
  const materialCards = home.evidence.content_cards.filter((card) =>
    /^(Dinitrol|Mercasol|Noxudol)/i.test(card.title),
  );
  const claims = [
    ...claimsFromPages(pages),
    ...home.headings
      .filter((heading) => /гаранти|сертифицирован|качественн|опытн|фотоотчет/iu.test(heading.text))
      .map((heading) => ({ text: heading.text, source_url: home.url, verification: 'site_claim' })),
  ];
  return {
    harvest: {
      metadata: {
        source_site: site.baseUrl,
        brand: company.name,
        retrieved_at: date,
        notes: ['Claims, material descriptions and guarantees are source statements.'],
      },
      company: {
        ...company,
        contacts: {
          ...contactsFromText(pages.map((page) => page.body_text || page.text).join('\n')),
          phones: home.evidence.phones,
        },
        legal_statement: home.evidence.company_statement,
        social_links: home.evidence.social_links,
      },
      services,
      vehicle_types,
      materials: materialCards.map((card) => ({ ...card, source_url: home.url })),
      technology: home.evidence.content_cards
        .filter(
          (card) =>
            !materialCards.includes(card) &&
            !/гаранти|качествен|фотоотчет|опытн/iu.test(card.title),
        )
        .map((card) => ({ ...card, source_url: home.url })),
      pricing_evidence: {
        currency,
        currency_inferred: true,
        unit_original: null,
        caveat: home.evidence.price_caveat,
        states: home.calculator.states,
      },
      site_claims: claims,
      pages,
      sources,
    },
    comparison: {
      schema_version: '1.0',
      company,
      source: {
        scraped_at: date,
        urls: sources.map((source) => source.url),
        notes: clean(warnings.join(' ')),
      },
      currency,
      vehicle_types,
      services,
    },
    warnings,
  };
}
