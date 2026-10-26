import { claimsFromPages, clean, contactsFromText, unique } from '@anticor/harvest-core';
import site from './site.js';

function homePage(pages) {
  const home = pages.find((page) => new URL(page.url).pathname === '/');
  if (!home?.anti_kor_evidence) throw new Error('Homepage service evidence was not collected');
  return home;
}

function structuredNodes(value) {
  if (Array.isArray(value)) return value.flatMap(structuredNodes);
  if (!value || typeof value !== 'object') return [];
  return [value, ...structuredNodes(value['@graph'])];
}

export function parseCompany(pages) {
  const home = homePage(pages);
  const business = structuredNodes(home.structured_data).find((node) =>
    [node['@type']].flat().includes('AutoRepair'),
  );
  if (!business?.name || !business.address?.addressLocality)
    throw new Error('Expected live AutoRepair identity/address in JSON-LD');
  const contacts = contactsFromText(home.body_text || home.text);
  const location = {
    city: clean(business.address.addressLocality),
    address: clean(business.address.streetAddress),
    phones: contacts.phones,
  };
  if (business.openingHours) location.working_hours = [business.openingHours].flat().join('; ');
  return {
    name: clean(business.name),
    website: site.baseUrl,
    country: business.address.addressCountry,
    locations: [location],
  };
}

export function parseServices(pages) {
  const home = homePage(pages);
  const evidence = home.anti_kor_evidence;
  if (!evidence.service_cards?.length) throw new Error('No live service cards found');
  if (evidence.enquiry_forms.length !== evidence.service_cards.length)
    throw new Error('Not every service enquiry state was inspected');
  const services = evidence.service_cards.map((card, index) => {
    const name = clean(card.name);
    if (!name || !clean(home.text).includes(name))
      throw new Error(`Service name is absent from source page text: ${name}`);
    const form = evidence.enquiry_forms[index];
    if (form.service !== card.name) throw new Error('Service enquiry evidence is out of order');
    // This quote-only site currently publishes no amounts. Fail closed if a future update adds prices.
    if (
      /\d[\d\s.,]*\s*(?:руб\.?|BYN|бел\.?\s*руб|[€$])/iu.test(
        `${card.text_original} ${form.text_original}`,
      )
    )
      throw new Error('A monetary amount appeared; implement and inspect the new price markup');
    return {
      id: `anti-kor-${index + 1}`,
      category: /шумоизоляц|мойка|пескостру|ежегодное/iu.test(name)
        ? 'additional'
        : 'anticorrosion',
      name_original: name,
      description: clean(card.description),
      url: home.url,
      completion_time: null,
      prices: [],
    };
  });
  return {
    services,
    vehicle_types: [],
    currency: 'BYN',
    warnings: [
      'Числовые цены не опубликованы: все услуги имеют prices: []; стоимость уточняется через заявку.',
      'Категории автомобилей, сроки выполнения и продолжительность гарантии не опубликованы.',
      'BYN выбрана как валюта сравнения для компании в Беларуси; на сайте нет цен и обозначения валюты.',
      'Карточка «Мойка днища и арок» описывает нанесение составов в подкапотном пространстве; исходное описание сохранено без исправлений.',
      'FAQ: удаление коррозии не входит в стандартный комплекс; демонтаж бамперов, накладок порогов и дверей согласуется за дополнительную плату.',
    ],
  };
}

export function buildSite(pages, date) {
  const home = homePage(pages);
  const evidence = home.anti_kor_evidence;
  const company = parseCompany(pages);
  const { services, vehicle_types, currency, warnings } = parseServices(pages);
  const contacts = contactsFromText(pages.map((page) => page.body_text || page.text).join('\n'));
  const sources = pages.map((page) => ({
    url: page.url,
    fetched_at: page.fetched_at,
    used_for: ['services', 'contacts', 'company', 'technology', 'materials', 'claims', 'FAQ'],
  }));
  const claimTexts = unique([
    ...claimsFromPages(pages).map((claim) => claim.text),
    ...evidence.benefit_claims.map((card) => card.description),
    ...evidence.service_cards
      .filter((card) => /снижение|бесплатн/iu.test(card.description))
      .map((card) => card.description),
  ]);
  const materials = unique(
    [home.text, ...evidence.faq.map((item) => item.answer)]
      .join('\n')
      .match(/Dinitrol(?:\s+(?:ML|LT))?/gi) || [],
  ).map((name) => ({ name_original: name, source_url: home.url, verification: 'site_claim' }));
  const legalName = evidence.legal_text.match(/ИП\s+[^\d]+?(?=УНП)/u)?.[0];
  const harvest = {
    metadata: {
      source_site: site.baseUrl,
      brand: company.name,
      retrieved_at: date,
      notes: ['Claims, technology and guarantees are statements by the source site.'],
    },
    company: {
      ...company,
      contacts: {
        ...contacts,
        social_links: home.links.filter((link) => /instagram\.com/.test(link.url)),
      },
      legal_name: legalName ? clean(legalName) : null,
      legal_text_original: evidence.legal_text,
    },
    services,
    vehicle_types,
    materials,
    technology: evidence.technology_steps.map((step) => ({ ...step, source_url: home.url })),
    faq: evidence.faq.map((item) => ({ ...item, source_url: home.url })),
    site_claims: claimTexts.map((text) => ({
      text,
      source_url: home.url,
      verification: 'site_claim',
    })),
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
