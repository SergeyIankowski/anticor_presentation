import { claimsFromPages, clean, contactsFromText, parseMoney } from '@anticor/harvest-core';
import site from './site.js';

const canonical = (url) => {
  const result = new URL(url);
  result.hash = '';
  return result.href;
};

function businessData(page) {
  return page.structured_data?.flat(Infinity).find((item) => item['@type'] === 'AutoRepair');
}

export function parseCompany(pages) {
  const home = pages.find((page) => new URL(page.url).pathname === '/');
  const name = home?.pozit?.company_name;
  if (!name) throw new Error('No company name in the live footer');
  const business = businessData(home);
  const phones = contactsFromText(home.body_text || home.text).phones;
  const address = home.pozit.workshop_address;
  return {
    name,
    website: site.baseUrl,
    ...(business?.address?.addressCountry ? { country: business.address.addressCountry } : {}),
    locations: address
      ? [
          {
            ...(business?.address?.addressLocality
              ? { city: business.address.addressLocality }
              : {}),
            address,
            phones,
          },
        ]
      : [],
  };
}

export function completionTime(timeline) {
  if (!/^\d+(?:[.,]\d+)?$/u.test(timeline?.amount || '') || !/^час/iu.test(timeline.unit))
    return null;
  // Average duration must not be represented as a guaranteed minimum or maximum.
  return {
    unit: 'hours',
    text_original: clean(`${timeline.amount} ${timeline.unit}. ${timeline.note}`),
  };
}

export function parseServices(pages) {
  const services = [];
  const pricing_evidence = [];
  const warnings = [
    'Цены указаны за пакеты с выбором материала, без категорий автомобилей и отдельной единицы тарификации. vehicle_types: other — категория не указана; это не универсальный тариф для всех машин.',
    'Срок выполнения указан как средний; гарантия, безопасность материалов и прочие заявления не проверялись независимо.',
  ];
  const pricePages = pages.filter((page) => page.pozit?.cards?.length);
  if (!pricePages.length) throw new Error('No live price cards found in #services');
  for (const page of pricePages) {
    const data = page.pozit;
    for (const [index, card] of data.cards.entries()) {
      if (!card.name || !clean(page.text).includes(card.name))
        throw new Error('Service name is absent from its source page text');
      const id = `treatment-${index + 1}`;
      const prices = [];
      for (const row of card.prices) {
        // Never turn quote-only rows, percentages, or unrelated metadata into prices.
        if (!/\d[\d\s.,–—-]*\s*(?:руб\.?|р\.|BYN)/iu.test(row.text)) continue;
        const money = parseMoney(row.text);
        if ([money.price, money.price_min, money.price_max].every((value) => value === null))
          throw new Error(`Unrecognized live price: ${row.text}`);
        prices.push({
          vehicle_type_id: 'unspecified',
          ...money,
          notes: [row.material, data.price_note, 'Категория автомобиля не указана.']
            .filter(Boolean)
            .join('; '),
        });
        pricing_evidence.push({
          service_id: id,
          material_original: row.material,
          price_text_original: row.text,
          source_url: canonical(page.url),
          unit: null,
          currency_original: row.text.match(/руб\.?|р\.|BYN/iu)?.[0] || null,
          qualifier_original: row.text.match(/^(?:от|до)(?=\s)/iu)?.[0] || null,
          price_note_original: data.price_note,
        });
      }
      services.push({
        id,
        category: 'anticorrosion',
        name_original: card.name,
        description: card.includes.join('; '),
        url: canonical(page.url),
        completion_time: completionTime(data.timeline),
        prices,
      });
    }
    if (data.price_note) warnings.push(data.price_note);
    const metadataPrice = businessData(page)?.priceRange;
    if (metadataPrice)
      warnings.push(
        `JSON-LD priceRange: «${metadataPrice}»; метаданные не являются прайсом пакетов. Использованы только .material-price из видимого прайс-листа.`,
      );
  }
  // The generic noun is quoted from the page title; no car class is inferred.
  const label = pricePages[0].title.match(/автомобиля/iu)?.[0];
  if (!label) throw new Error('No source label for the unspecified vehicle scope');
  const currency = pricePages
    .map(businessData)
    .find((business) => business?.currenciesAccepted)?.currenciesAccepted;
  if (!currency) throw new Error('No comparison currency in live structured data');
  return {
    services,
    vehicle_types: [{ id: 'unspecified', name_original: label, class: 'other' }],
    currency,
    pricing_evidence,
    warnings,
  };
}

export function buildSite(pages, date) {
  const company = parseCompany(pages);
  const { services, vehicle_types, currency, pricing_evidence, warnings } = parseServices(pages);
  const sources = pages.map((page) => ({
    url: page.url,
    fetched_at: page.fetched_at,
    used_for: [page.title, 'Прайс, материалы, технология, контакты и заявления сайта'],
  }));
  const evidence = pages.flatMap((page) =>
    Object.entries(page.pozit?.sections || {}).map(([section, text]) => ({
      section,
      text,
      source_url: page.url,
      verification: 'site_claim',
    })),
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
      contacts: contactsFromText(pages.map((page) => page.body_text || page.text).join('\n')),
      details: pages.map((page) => ({
        source_url: page.url,
        legal_details_original: page.pozit.footer,
        opening_hours_structured: businessData(page)?.openingHoursSpecification || [],
        contact_links: page.pozit.contact_links,
      })),
    },
    currency,
    services,
    vehicle_types,
    pricing_evidence,
    materials: pages.flatMap((page) =>
      (page.pozit?.materials || []).map((material) => ({ ...material, source_url: page.url })),
    ),
    technology_and_claims: evidence,
    faq: pages.flatMap((page) =>
      (page.pozit?.faq || []).map((item) => ({ ...item, source_url: page.url })),
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
