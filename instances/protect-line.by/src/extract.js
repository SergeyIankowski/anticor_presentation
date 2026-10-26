import {
  claimsFromPages,
  clean,
  contactsFromText,
  parseMoney,
  unique,
} from '@anticor/harvest-core';
import site from './site.js';

const key = (url) => new URL(url).pathname.replace(/\/$/, '') || '/';
const homePage = (pages) => pages.find((page) => key(page.url) === '/');

export function parseCompany(pages) {
  const home = homePage(pages);
  const name = home?.headings.find((heading) => /^PROTECT-LINE$/i.test(heading.text))?.text;
  if (!name) throw new Error('Protect-Line brand is absent from the live homepage');
  const address = home.body_text.match(/а\.г\.\s*Ер[её]мино,\s*ул\.[^\n]+/)?.[0];
  if (!address) throw new Error('Protect-Line workshop address was not found');
  const phones = unique(
    pages.flatMap((page) =>
      (page.contact_links || [])
        .filter((link) => link.url.startsWith('tel:'))
        .map((link) => link.url.slice(4)),
    ),
  );
  return {
    name,
    website: site.baseUrl,
    country: 'BY',
    locations: [{ city: 'Ерёмино', address, phones }],
  };
}

function priceEntry(text, sourceUrl, notes) {
  return {
    vehicle_type_id: 'any',
    ...parseMoney(text),
    notes: `${notes} Источник: ${sourceUrl}`,
  };
}

export function parseServices(pages) {
  const home = homePage(pages);
  if (!home) throw new Error('Homepage is required for price-card evidence');
  const services = [];
  const priceEvidence = [];
  const articleEvidence = [];
  const warnings = [
    'Цены «от» — нижние границы, окончательная стоимость рассчитывается индивидуально.',
    'РУБ трактуется как BYN по местоположению сервиса в Беларуси; код валюты сайт не указывает.',
    'Нет ценовых категорий по размеру автомобиля; «автомобилей любых марок» — область обслуживания, а не единая фиксированная цена.',
    'Карточки элементов кузова не указывают единицу расчёта (одна деталь или комплект).',
    'Время сушки в статьях не является сроком выполнения всей услуги.',
  ];
  const vehicleLabel = clean(home.body_text).match(/автомобилей любых марок/iu)?.[0];
  if (!vehicleLabel) throw new Error('Vehicle scope is missing from homepage');
  const cards = home.price_cards || [];
  const anticorrosionPages = pages.filter((page) => key(page.url).startsWith('/antikorroziynaya-'));
  for (const page of pages.filter((page) => key(page.url) !== '/')) {
    const heading = page.headings.find((item) => item.level <= 2);
    if (!heading || !clean(page.text).includes(heading.text))
      throw new Error(`Service heading is absent from source text: ${page.url}`);
    const category = key(page.url).startsWith('/antikorroziynaya-')
      ? 'anticorrosion'
      : 'additional';
    const matching = cards.filter((card) => key(card.target_url) === key(page.url));
    if (category === 'anticorrosion' && matching.length !== 1)
      throw new Error(`Expected one live homepage price card for ${page.url}`);
    const id = key(page.url).slice(1);
    articleEvidence.push({
      service_id: id,
      name_original: heading.text,
      url: page.url,
      description: (page.paragraphs || []).join('\n'),
    });
    const card = matching[0];
    if (card && !home.text.includes(card.label))
      throw new Error(`Homepage card label is absent from source text: ${card.label}`);
    const prices = matching.map((card) => {
      priceEvidence.push({ service_id: id, service_url: home.url, ...card, unit_original: null });
      return priceEntry(
        card.price_text_original,
        home.url,
        `${card.label}. Единица расчёта на карточке не указана.`,
      );
    });
    services.push({
      id,
      category,
      name_original: card ? card.label : heading.text,
      url: card ? home.url : page.url,
      description: [heading.text, page.url, ...(page.paragraphs || [])].join('\n'),
      completion_time: null,
      prices,
    });
  }
  if (cards.length !== anticorrosionPages.length)
    throw new Error('Homepage price cards and harvested anticorrosion services differ');

  const hood = pages.find((page) => key(page.url) === '/antikorroziynaya-obrabotka-kapota');
  if (hood) {
    const hoodText = clean(hood.text);
    const amount = /(?:от\s+)?\d[\d\s]*(?:[,.]\d+)?\s*руб(?:лей|ля|ль|\.)?/iu;
    const hoodSentence = hoodText.match(
      /стоимость нанесения антикора только на капот[^.]*\./iu,
    )?.[0];
    const hoodPrice = hoodSentence?.match(amount)?.[0];
    const hoodService = services.find((service) => service.id === key(hood.url).slice(1));
    if (hoodPrice) {
      const articleOffer = {
        id: `${hoodService.id}-article`,
        category: 'anticorrosion',
        name_original: hood.headings.find((item) => item.level <= 2).text,
        url: hood.url,
        description: hoodSentence,
        completion_time: null,
        prices: [priceEntry(hoodPrice, hood.url, hoodSentence)],
      };
      services.push(articleOffer);
      priceEvidence.push({
        service_id: articleOffer.id,
        service_url: hood.url,
        source_url: hood.url,
        price_text_original: hoodPrice,
        text_original: hoodSentence,
        unit_original: 'только на капот',
      });
      const hoodPrices = [...hoodService.prices, ...articleOffer.prices];
      const minimums = unique(hoodPrices.map((price) => price.price_min));
      if (minimums.length > 1)
        warnings.push(
          `Расхождение цены капота между главной и статьёй: ${hoodPrices.map((price) => price.price_text_original).join(' / ')}. Обе версии сохранены отдельными предложениями со своими URL источников.`,
        );
    }
    const packageSentence = hoodText.match(
      /Часто эта услуга входит в комплексную защиту кузова[^.]*\./iu,
    )?.[0];
    const packageName = packageSentence?.match(/комплексную защиту кузова\s*\([^)]*\)/iu)?.[0];
    const packagePrice = packageSentence?.match(amount)?.[0];
    if (packageName && packagePrice) {
      services.push({
        id: 'complex-body-protection',
        category: 'anticorrosion',
        name_original: packageName,
        url: hood.url,
        description: packageSentence,
        completion_time: null,
        prices: [
          priceEntry(
            packagePrice,
            hood.url,
            `${packageSentence} Ориентир в статье, а не фиксированный пакет.`,
          ),
        ],
      });
      priceEvidence.push({
        service_id: 'complex-body-protection',
        service_url: hood.url,
        source_url: hood.url,
        price_text_original: packagePrice,
        text_original: packageSentence,
        unit_original: 'за весь автомобиль',
      });
      warnings.push(
        'Цена комплексной защиты приведена как ориентир в статье о капоте, а не как отдельный фиксированный прайс-пакет.',
      );
    }
  }
  const unpriced = services.filter((service) => !service.prices.length);
  if (unpriced.length)
    warnings.push(
      `Без опубликованных сумм: ${unpriced.map((service) => service.name_original).join('; ')}.`,
    );
  return {
    services,
    vehicle_types: [{ id: 'any', name_original: vehicleLabel, class: 'any' }],
    currency: 'BYN',
    warnings,
    priceEvidence,
    articleEvidence,
  };
}

function evidenceFromPages(pages, expression) {
  return pages.flatMap((page) =>
    (page.paragraphs || [])
      .filter((text) => expression.test(text))
      .map((text) => ({ text, source_url: page.url, verification: 'site_claim' })),
  );
}

export function buildSite(pages, date) {
  const company = parseCompany(pages);
  const { services, vehicle_types, currency, warnings, priceEvidence, articleEvidence } =
    parseServices(pages);
  if (!services.length) throw new Error('No services extracted');
  const sources = pages.map((page) => ({
    url: page.url,
    fetched_at: page.fetched_at,
    used_for: [page.title],
  }));
  const contacts = contactsFromText(pages.map((page) => page.body_text).join('\n'));
  contacts.phones = unique([
    ...company.locations.flatMap((location) => location.phones),
    ...contacts.phones,
  ]);
  contacts.links = [
    ...new Map(
      pages.flatMap((page) => page.contact_links || []).map((link) => [link.url, link]),
    ).values(),
  ];
  const home = homePage(pages);
  const legal = home.body_text.match(/Индивидуальный предприниматель\s+([^\n]+)\s+УНП:\s*(\d+)/u);
  const harvest = {
    metadata: {
      source_site: site.baseUrl,
      brand: company.name,
      retrieved_at: date,
      notes: ['Claims and guarantees are statements by the source site.'],
    },
    company: {
      ...company,
      contacts,
      legal_entity: legal
        ? {
            type: 'Индивидуальный предприниматель',
            name: legal[1],
            unp: legal[2],
            source_url: home.url,
          }
        : null,
    },
    currency,
    services,
    vehicle_types,
    price_evidence: priceEvidence,
    service_details: articleEvidence,
    technologies: evidenceFromPages(pages, /мойк|сушк|демонтаж|под давлением|сварк|пескостру/iu),
    materials: evidenceFromPages(pages, /ML|состав|воск|битум|грунт|мастик|ингибитор|абразив/iu),
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
