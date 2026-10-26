import { claimsFromPages, clean, contactsFromText } from '@anticor/harvest-core';
import { normalizedPrice, parsePackages } from './prices.js';
import site, { servicePaths } from './site.js';

export function parseCompany(page) {
  const text = page.body_text;
  const legalName = text.match(/ООО\s*«[^»]+»/u)?.[0];
  const address = text.match(
    /г\.\s*Минск,\s*ст\.\s*м\.\s*Могил[её]вская,\s*ул\.\s*Промышленная[^\n]+/u,
  )?.[0];
  const hours = text.match(/ПН-ПТ\s*с\s*\d{1,2}:\d{2}\s*до\s*\d{1,2}:\d{2}/u)?.[0];
  const contacts = contactsFromText(text);
  if (!legalName || !address || !hours || !contacts.phones.length)
    throw new Error('Antikorim company/contact markup changed');
  return {
    name: clean(legalName),
    website: site.baseUrl,
    country: 'BY',
    locations: [
      {
        city: 'Минск',
        address: clean(address),
        phones: contacts.phones,
        working_hours: clean(hours),
      },
    ],
  };
}

function pageName(page) {
  return page.headings.find((heading) => heading.level === 1)?.text || page.title;
}

export function parseServices(pages) {
  const treatment = pages.find((page) => new URL(page.url).pathname === servicePaths[0]);
  const { services, vehicle_types } = parsePackages(treatment);
  vehicle_types.push({ id: 'any', name_original: 'Категория автомобиля не указана', class: 'any' });
  vehicle_types.push({
    id: 'car-crossover',
    name_original: 'Для легковых авто и кроссоверов.',
    class: 'other',
  });
  const warning =
    'Стартовые цены ориентировочные: итоговая стоимость согласовывается после осмотра. Категории «Кросс» и «Бусик» объединяют несколько типов кузова; исходное описание сохранено. Для цен без категории использован any: область применимости уточняется у центра.';
  for (const extra of treatment.site_details.extras) {
    // This service has its own price page; retain the add-on conditions there.
    if (extra.name === 'Деконсервация днища') continue;
    services.push({
      id: `extra-${services.length + 1}`,
      category: /покрытие/iu.test(extra.name) ? 'anticorrosion' : 'additional',
      name_original: extra.name,
      description: extra.description,
      url: treatment.url,
      completion_time: null,
      prices: [normalizedPrice(extra.price_text, 'any', extra.conditions.join('; '))],
    });
  }
  for (const path of servicePaths.slice(1)) {
    const page = pages.find((item) => new URL(item.url).pathname === path);
    if (!page?.site_details.price_section) throw new Error(`Missing price section: ${path}`);
    const section = page.site_details.price_section;
    const base = { category: 'additional', url: page.url, completion_time: null };
    const append = (name, description, priceText, vehicle = 'any', notes = '') => {
      services.push({
        ...base,
        category: /антикор/iu.test(name) ? 'anticorrosion' : 'additional',
        id: `${path.slice(1)}-${services.length + 1}`,
        name_original: name,
        description,
        prices: priceText
          ? [normalizedPrice(priceText, vehicle, clean([notes, ...section.notes].join(' ')))]
          : [],
      });
    };
    if (section.cards.length) {
      for (const card of section.cards) {
        const isWash = /dekonservaciya/.test(path) && card.name === 'Деконсервация днища';
        const extra = treatment.site_details.extras.find((item) => item.name === card.name);
        append(
          card.name,
          card.description,
          card.price_text,
          isWash ? 'car-crossover' : 'any',
          extra?.conditions.join('; ') || '',
        );
      }
    } else if (/peskostrujnaya|svarochnye/.test(path)) {
      if (!section.rows.length) throw new Error(`Missing service-price table: ${path}`);
      for (const row of section.rows) {
        if (row.length !== 3) throw new Error(`Unexpected price table columns: ${path}`);
        const vehicle = /peskostrujnaya/.test(path)
          ? /легкового/.test(row[0])
            ? 'car'
            : /кроссовера/.test(row[0])
              ? 'crossover'
              : /микроавтобуса/.test(row[0])
                ? 'suv'
                : 'any'
          : 'any';
        append(row[0], `${pageName(page)}. ${row[1]}`, row[2], vehicle);
      }
    } else if (/vosstanovlenie-vin/.test(path)) {
      const priceText = section.title.match(/\d[\d\s]*\sр\.?/u)?.[0];
      if (!priceText) throw new Error('Missing VIN restoration fixed price');
      append(pageName(page), page.description || '', priceText);
    } else if (/lazernaya/.test(path)) {
      if (!/нет фиксированного прайса|после осмотра/iu.test(section.text))
        throw new Error('Laser cleaning pricing terms changed');
      append(pageName(page), page.description || '', null);
    } else throw new Error(`Unrecognized service price layout: ${path}`);
  }
  const duration = treatment.text.match(
    /(?:Типичный срок выполнения:|полный комплекс занимает)\s*(\d+)\s*рабочих дня/iu,
  );
  if (duration) {
    for (const service of services.slice(0, 3))
      service.completion_time = {
        min: Number(duration[1]),
        max: Number(duration[1]),
        unit: 'days',
        text_original: clean(duration[0]),
      };
  }
  return {
    services,
    vehicle_types,
    warnings: [
      warning,
      'Лазерная очистка: стоимость после осмотра, отдельного числового прайса нет. Цена шумоизоляции указана за одну арку; цены деталей могут указываться за штуку. Пакет по запросу не имеет числового значения.',
    ],
  };
}

export function buildSite(pages, date) {
  const about = pages.find((page) => new URL(page.url).pathname === '/o-nas');
  const company = parseCompany(about);
  const { services, vehicle_types, warnings } = parseServices(pages);
  const sources = pages.map((page) => ({
    url: page.url,
    fetched_at: page.fetched_at,
    used_for: [page.title],
  }));
  const sections = (path) =>
    pages.find((page) => new URL(page.url).pathname === path)?.site_details.sections || [];
  const harvest = {
    metadata: {
      source_site: site.baseUrl,
      brand: 'ANTIKORIM.BY',
      retrieved_at: date,
      language: 'ru',
      currency: 'BYN',
      notes: [
        'Claims, warranties, reviews, and material performance are statements by the source site.',
        ...warnings,
      ],
    },
    company: {
      ...company,
      trading_name: 'ANTIKORIM.BY',
      contacts: contactsFromText(about.body_text),
      legal_id: about.body_text.match(/УНП:\s*(\d+)/u)?.[1] || null,
      legal_address: clean(about.body_text.match(/Юр\. адрес:\s*([^\n]+)/u)?.[1] || ''),
      requisites: sections('/o-nas').find((section) => section.id === 'requisites') || null,
    },
    services,
    vehicle_types,
    materials: sections('/materialy'),
    technology: sections(servicePaths[0]).filter((section) =>
      ['steps', 'guarantee', 'not-included'].includes(section.id),
    ),
    faqs: pages.flatMap((page) =>
      page.site_details.faqs.map((faq) => ({ ...faq, source_url: page.url })),
    ),
    videos: [...new Set(pages.flatMap((page) => page.site_details.videos))],
    site_claims: claimsFromPages(pages),
    pages,
    sources,
  };
  const comparison = {
    schema_version: '1.0',
    company,
    source: { scraped_at: date, urls: pages.map((page) => page.url), notes: warnings.join(' ') },
    currency: 'BYN',
    vehicle_types,
    services,
  };
  return { harvest, comparison, warnings };
}
