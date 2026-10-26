import {
  claimsFromPages,
  clean,
  contactsFromText,
  parseMoney,
  vehicleClass,
} from '@anticor/harvest-core';
import site, { pricePath, servicePages } from './site.js';

const pageAt = (pages, path) => pages.find((page) => new URL(page.url).pathname === path);

export function parseCompany(pages) {
  const home = pageAt(pages, '/');
  const contact = pageAt(pages, '/kontakty/');
  const name = home?.text.match(/Артглас/iu)?.[0];
  const address = contact?.text.match(/Адрес:\s*([^\n]+)/u)?.[1]?.trim();
  const contacts = contactsFromText(contact?.text || '');
  if (!name || !address || !contacts.phones.length)
    throw new Error('Company/contact evidence is missing');
  return {
    name,
    website: site.baseUrl,
    country: 'BY',
    locations: [{ city: 'Брест', address, phones: contacts.phones }],
  };
}

export function parsePriceTable(page) {
  const table = page?.tables.find((item) =>
    item.rows.some((row) =>
      row.some((cell) => /Первичная антикоррозийная обработка, BYN/u.test(cell.text)),
    ),
  );
  if (!table) throw new Error('Primary treatment price table is missing');
  const headerIndex = table.rows.findIndex((row) =>
    row.some((cell) => cell.text === 'Полная обработка'),
  );
  if (headerIndex < 0) throw new Error('Price table service headers are missing');
  const headers = table.rows[headerIndex].map((cell) => cell.text);
  if (headers.length !== 2 || !headers.includes('Обработка днища'))
    throw new Error('Unexpected price table columns');
  const rows = table.rows.slice(headerIndex + 1);
  if (!rows.length) throw new Error('Price table has no vehicle rows');
  const vehicle_types = rows.map((row, index) => {
    if (row.length !== headers.length + 1 || !row[0].text)
      throw new Error('Incomplete vehicle price row');
    const label = row[0].text;
    return { id: `vehicle-${index + 1}`, name_original: label, class: vehicleClass(label) };
  });
  const caveat = page.paragraphs
    .filter((text) => /[Пп]ервичн|[Вв]торичн|осмотра/u.test(text))
    .join(' ');
  if (!/новых/u.test(caveat) || !/осмотра/u.test(caveat))
    throw new Error('Primary/secondary price applicability caveat is missing');
  const pricesByColumn = Object.fromEntries(
    headers.map((header, column) => [
      header,
      rows.map((row, index) => {
        const original = row[column + 1].text;
        const money = parseMoney(original);
        if (![money.price, money.price_min, money.price_max].some((amount) => amount !== null))
          throw new Error(`No amount in price cell: ${original}`);
        return {
          vehicle_type_id: vehicle_types[index].id,
          ...money,
          notes: `BYN; за автомобиль; ${header}; Первичная антикоррозийная обработка. ${caveat} Источник: ${page.url}`,
        };
      }),
    ]),
  );
  return { vehicle_types, pricesByColumn, caveat };
}

export function parseServices(pages) {
  const pricePage = pageAt(pages, pricePath);
  const { vehicle_types, pricesByColumn } = parsePriceTable(pricePage);
  const services = servicePages.map((definition) => {
    const page = pageAt(pages, definition.path);
    const name =
      page?.service_heading || page?.headings.find((heading) => heading.level === 1)?.text;
    if (!name || !clean(page.text).includes(clean(name)))
      throw new Error(`Missing source service heading: ${definition.path}`);
    return {
      id: definition.id,
      category: definition.category,
      name_original: definition.priceColumn || name,
      description: [name, `Источник описания: ${page.url}`, ...page.paragraphs].join('\n\n'),
      url: definition.priceColumn ? pricePage.url : page.url,
      // The two-hour statement on the sills page concerns drying, not total completion time.
      completion_time: null,
      prices: definition.priceColumn ? pricesByColumn[definition.priceColumn] : [],
    };
  });
  const weldingPage = pageAt(pages, '/antikorroziinaya-obrabotka-porogov-i-arok/');
  const weldingName = weldingPage.text.match(/сварочные работы/u)?.[0];
  if (weldingName)
    services.push({
      id: 'welding',
      category: 'additional',
      name_original: weldingName,
      description: weldingPage.paragraphs
        .filter((text) => /свар|[Пп]ереварк/u.test(text))
        .join('\n\n'),
      url: weldingPage.url,
      completion_time: null,
      prices: [],
    });
  return { services, vehicle_types, currency: 'BYN' };
}

export function evidenceFromPages(pages, pattern) {
  return pages.flatMap((page) =>
    page.paragraphs
      .filter((text) => pattern.test(text))
      .map((text) => ({ text, source_url: page.url, verification: 'site_claim' })),
  );
}

export function buildSite(pages, date) {
  const company = parseCompany(pages);
  const { services, vehicle_types, currency } = parseServices(pages);
  const contact = pageAt(pages, '/kontakty/');
  const home = pageAt(pages, '/');
  const footerAddress = home.body_text?.match(/Брест\s+ул\.Коммерческая,\s*17/u)?.[0];
  const warnings = [
    'Опубликованные цены BYN относятся только к первичной обработке новых автомобилей. Вторичная обработка оценивается после осмотра; отдельные цены отсутствуют.',
    'Для услуг без опубликованной цены сохранён пустой массив prices. Объединённая категория «Минивен, кроссовер» сохранена одной категорией (class: crossover).',
    'Срок полного выполнения услуг не опубликован; 2 часа на странице порогов — время высыхания антигравия.',
  ];
  if (footerAddress && !company.locations[0].address.includes('Коммерческая'))
    warnings.push(
      `Расхождение адресов: страница контактов — ${company.locations[0].address}; главная/футер — ${footerAddress}. Ссылки карт также могут указывать прежний адрес.`,
    );
  const sources = pages.map((page) => ({
    url: page.url,
    fetched_at: page.fetched_at,
    used_for: [page.title],
  }));
  const editorialPages = pages.filter((page) => new URL(page.url).pathname !== '/otzyvy/');
  const contacts = contactsFromText(`${contact.text}\n${home.body_text || home.text}`);
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
      contact_evidence: [
        { source_url: contact.url, text: contact.text },
        ...(footerAddress ? [{ source_url: home.url, text: footerAddress }] : []),
      ],
      social_links: home.contact_links || [],
    },
    services,
    vehicle_types,
    currency,
    service_details: servicePages.map((definition) => {
      const page = pageAt(pages, definition.path);
      return {
        service_id: definition.id,
        name_original:
          page.service_heading || page.headings.find((heading) => heading.level === 1)?.text,
        source_url: page.url,
        text: page.text,
      };
    }),
    site_claims: [
      ...claimsFromPages(editorialPages),
      ...evidenceFromPages(
        editorialPages,
        /справочный|не является официальной|не предотвращает|самовосстановлен/u,
      ),
    ],
    technology: evidenceFromPages(
      editorialPages,
      /под давлением|пескостру|холодного цинкования|[Мм]ойка|[Сс]уш|этап/u,
    ),
    materials: evidenceFromPages(
      editorialPages,
      /Dinitrol|Wuerth|Tectyl|TECTYL|Mercasol|Noxudol|ML|полимерно-битум|восковые/u,
    ),
    price_evidence: [
      { source_url: pageAt(pages, pricePath).url, text: pageAt(pages, pricePath).text },
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
