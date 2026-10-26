import {
  claimsFromPages,
  clean,
  contactsFromText,
  parseMoney,
  unique,
} from '@anticor/harvest-core';
import { parsePackages } from './prices.js';
import site, { servicePaths } from './site.js';

export function parseCompany(contactPage, aboutPage) {
  const text = contactPage.body_text;
  const name = aboutPage.body_text.match(/Частное унитарное предприятие\s*«[^»]+»/u)?.[0];
  const address = text.match(/Барановичи,\s*ул\.\s*Декабристов,\s*\d+[^\n]*бокс\s*№\s*\d+/u)?.[0];
  const hours = text.match(
    /ПН[–—-]СБ\s*\d{1,2}:\d{2}[–—-]\d{1,2}:\d{2},\s*ВС\s*\d{1,2}:\d{2}[–—-]\d{1,2}:\d{2}/u,
  )?.[0];
  const contacts = contactsFromText(text);
  if (!name || !address || !hours || !contacts.phones.length)
    throw new Error('Antirzha company/contact details are missing');
  return {
    name: clean(name),
    website: site.baseUrl,
    country: 'BY',
    locations: [
      {
        city: 'Барановичи',
        address: clean(address),
        phones: contacts.phones,
        working_hours: clean(hours),
      },
    ],
  };
}

export function parseServices(pages) {
  const pricePage = pages.find((page) => new URL(page.url).pathname === '/ceny/');
  const { services, vehicle_types } = parsePackages(pricePage);
  vehicle_types.push({ id: 'any', name_original: 'Категория автомобиля не указана', class: 'any' });
  const rates = pricePage.site_details.cleaning_rates;
  if (rates.length !== 3 || !rates.some((rate) => /пескоструй/iu.test(rate.name)))
    throw new Error('Antirzha cleaning-rate cards changed');
  for (const path of servicePaths) {
    const page = pages.find((item) => new URL(item.url).pathname === path);
    if (!page) throw new Error(`Missing Antirzha service page: ${path}`);
    const rate = rates.find((item) => item.url && new URL(item.url).pathname === path);
    const prices = [];
    if (rate && /\d[\d\s]*\s*BYN/u.test(rate.price_text)) {
      if (!/BYN\/м²/u.test(rate.price_text)) throw new Error('Antirzha cleaning-rate unit changed');
      const money = parseMoney(rate.price_text);
      if (money.price_min === null && money.price === null)
        throw new Error('Missing cleaning amount');
      prices.push({
        vehicle_type_id: 'any',
        ...money,
        notes: `${rate.note}. Цена за квадратный метр, не за весь автомобиль.`,
      });
    }
    services.push({
      id: path.slice(1, -1),
      category: path.startsWith('/antikor-') ? 'anticorrosion' : 'additional',
      name_original: prices.length ? rate.name : page.site_details.title_original,
      description: page.description || page.paragraphs[0] || '',
      url: prices.length ? pricePage.url : page.url,
      completion_time: null,
      prices,
    });
  }
  const warnings = [
    'Сравнительные цены взяты со страницы /ceny/ после выбора каждого из трёх типов автомобиля. Все цены пакетов — «от», окончательный расчёт после осмотра.',
    'Категории «Кроссовер» и «Рамный» объединяют несколько типов кузова; исходные подписи сохранены. Ставка пескоструя указана за м², не за автомобиль.',
    'Другие услуги и специализированные страницы не имеют отдельного числового прайса: prices[] пуст. Повторные описания пакетов и ориентиры со страниц услуг сохранены в исходных страницах, а не продублированы как отдельные цены.',
  ];
  return { services, vehicle_types, warnings };
}

export function buildSite(pages, date) {
  const find = (path) => pages.find((page) => new URL(page.url).pathname === path);
  const about = find('/o-kompanii/');
  const contact = find('/kontakty/');
  const company = parseCompany(contact, about);
  const { services, vehicle_types, warnings } = parseServices(pages);
  const sources = pages.map((page) => ({
    url: page.url,
    fetched_at: page.fetched_at,
    used_for: [page.title],
  }));
  const harvest = {
    metadata: {
      source_site: site.baseUrl,
      brand: 'Антиржа.by',
      retrieved_at: date,
      language: 'ru',
      currency: 'BYN',
      notes: [
        'Claims, guarantees, reviews, treatment counts, and material performance are statements by the source site.',
      ],
    },
    company: {
      ...company,
      trading_name: 'Антиржа.by',
      contacts: contactsFromText(contact.body_text),
      legal_id: about.body_text.match(/УНП:?\s*(\d+)/u)?.[1] || null,
      registration_original: clean(about.body_text.match(/Регистрация:\s*([^\n]+)/u)?.[1] || ''),
      social_links: [
        ...new Map(
          pages.flatMap((page) => page.site_details.social_links).map((link) => [link.url, link]),
        ).values(),
      ],
    },
    services,
    vehicle_types,
    pricing_notes: warnings,
    prices: {
      source_url: find('/ceny/').url,
      variants: find('/ceny/').pricing_variants,
      cleaning_rates: find('/ceny/').site_details.cleaning_rates,
    },
    technology: (find('/antikor/').site_details.sections || []).filter(
      (section) => section.id === 'etapy',
    ),
    materials: pages.flatMap((page) =>
      page.paragraphs
        .filter((text) => /Mercasol|Noxudol|Dinitrol|Sika/iu.test(text))
        .map((text) => ({ text, source_url: page.url })),
    ),
    guides: pages
      .filter((page) => /^\/antikor-[a-z-]+\/$/.test(new URL(page.url).pathname))
      .map((page) => ({
        url: page.url,
        title: page.site_details.title_original,
        sections: page.site_details.sections,
      })),
    faqs: pages.flatMap((page) =>
      page.site_details.faqs.map((faq) => ({ ...faq, source_url: page.url })),
    ),
    videos: unique(pages.flatMap((page) => page.site_details.videos)),
    case_studies: find('/raboty/').site_details.sections,
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
    currency: 'BYN',
    vehicle_types,
    services,
  };
  return { harvest, comparison, warnings };
}
