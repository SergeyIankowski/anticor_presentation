import {
  claimsFromPages,
  clean,
  contactsFromText,
  parseMoney,
  unique,
  vehicleClass,
} from '@anticor/harvest-core';
import site from './site.js';

const rubles =
  /(?:(?:от|до)\s*)?\d+(?:[,.]\d+)?(?:\s*(?:до|[–—-])\s*\d+(?:[,.]\d+)?)?\s*(?:рублей|руб\.?)/iu;
const byPath = (pages, path) => pages.find((page) => new URL(page.url).pathname === path);
const blocks = (page) => page.text_blocks || [];
const blockWith = (page, pattern) => blocks(page).find((block) => pattern.test(clean(block.text)));

export function parseRubles(text) {
  const original = clean(text);
  if (!rubles.test(original)) throw new Error(`Missing public ruble amount: ${original}`);
  const normalizedRange = original.replace(/от\s*(\d+)\s*до\s*(\d+)/iu, '$1–$2');
  return { ...parseMoney(normalizedRange), price_text_original: original };
}

export function parsePeriod(text) {
  const label = clean(text);
  const endOnly = label.match(/^Стоимость до (\d{2})\.(\d{2})\.(\d{4})/u);
  if (endOnly) {
    const [, day, month, year] = endOnly;
    return { label, valid_before: `${year}-${month}-${day}` };
  }
  const interval = label.match(/с (\d{2})\.(\d{2})\. по (\d{2})\.(\d{2})\.(\d{4})/u);
  if (!interval) throw new Error(`Unrecognized price validity: ${label}`);
  const [, fromDay, fromMonth, toDay, toMonth, year] = interval;
  return {
    label,
    valid_from: `${year}-${fromMonth}-${fromDay}`,
    valid_through: `${year}-${toMonth}-${toDay}`,
  };
}

export function parseSchedules(home) {
  const headings = blocks(home).filter((block) =>
    /^Стоимость (?:до|на период)/u.test(clean(block.text)),
  );
  const columns = blocks(home).filter((block) =>
    /^1\.\s*Легковые автомобили/u.test(clean(block.text)),
  );
  if (headings.length !== columns.length || !headings.length)
    throw new Error('Dated price headings and columns are missing or ambiguous');
  const used = new Set();
  return columns.map((column) => {
    const heading = headings
      .filter((item) => item.bounds.y < column.bounds.y)
      .sort(
        (a, b) => Math.abs(a.bounds.x - column.bounds.x) - Math.abs(b.bounds.x - column.bounds.x),
      )[0];
    if (!heading || used.has(heading.selector))
      throw new Error('Cannot associate price column with its date');
    used.add(heading.selector);
    const numbered = [
      ...column.text
        .replace(/\u00a0/g, ' ')
        .matchAll(/(?:^|\n)\s*(\d+)\.\s+([\s\S]*?)(?=(?:\n\s*\d+\.\s+[А-ЯЁ])|$)/gu),
    ].map((match) => ({ number: Number(match[1]), text: clean(match[2]) }));
    const rows = numbered
      .filter((item) => /Полная обработка\s*-/u.test(item.text))
      .map((item) => {
        const [name, amount] = item.text.split(/Полная обработка\s*-\s*/u);
        return {
          vehicle_type_id: `vehicle-${item.number}`,
          name_original: clean(name),
          ...parseRubles(amount),
        };
      });
    if (!rows.length) throw new Error('Empty full treatment price column');
    return {
      ...parsePeriod(heading.text),
      source_url: home.url,
      source_selector: column.selector,
      heading_selector: heading.selector,
      text_original: column.text,
      rows,
    };
  });
}

export function selectSchedule(schedules, date) {
  const active = schedules.filter(
    (schedule) =>
      (!schedule.valid_before || date < schedule.valid_before) &&
      (!schedule.valid_from || date >= schedule.valid_from) &&
      (!schedule.valid_through || date <= schedule.valid_through),
  );
  if (active.length > 1) throw new Error('Overlapping public price validity periods');
  return active[0] || null;
}

export function parseCompany(pages) {
  const contact = byPath(pages, '/contacts/');
  const text = clean(pages.map((page) => page.body_text || page.text).join('\n'));
  const name = text.match(/ООО\s*"СТО Алруса"/u)?.[0];
  const address = clean(contact?.text || text).match(/г\. Гродно, ул\. Аульская,\s*\d+/u)?.[0];
  if (!name || !address) throw new Error('Missing company identity or address');
  const contacts = contactsFromText(contact?.text || text);
  const phones = [
    ...new Map(contacts.phones.map((phone) => [phone.replace(/\D/g, ''), phone])).values(),
  ];
  return {
    name,
    website: site.baseUrl,
    country: 'BY',
    locations: [{ city: 'Гродно', address, phones }],
  };
}

export function parseServices(pages, date) {
  const home = byPath(pages, '/');
  const sand = byPath(pages, '/peskostrui/');
  const welding = byPath(pages, '/welding/');
  const workshop = byPath(pages, '/uslugi-sto/');
  if (!home || !sand || !welding || !workshop) throw new Error('Missing required service page');
  const schedules = parseSchedules(home);
  const current = selectSchedule(schedules, date);
  const services = [];
  const price_evidence = [];
  const vehicle_types = schedules[0].rows.map((row) => ({
    id: row.vehicle_type_id,
    name_original: row.name_original,
    class: vehicleClass(row.name_original),
  }));
  const anyName = clean(home.text).match(/любыми типами автомобилей/u)?.[0];
  if (!anyName) throw new Error('Missing general vehicle scope');
  vehicle_types.push({ id: 'any', name_original: anyName, class: 'any' });
  const add = (id, page, name, category, description, prices = [], extra = {}) => {
    if (!clean(page.text).includes(name))
      throw new Error(`Service anchor absent from ${page.url}: ${name}`);
    services.push({
      id,
      category,
      name_original: name,
      description,
      url: page.url,
      prices,
      ...extra,
    });
    return services.at(-1);
  };
  const evidencePrice = (id, page, text, vehicle = 'any', notes = '') => {
    const price = { vehicle_type_id: vehicle, ...parseRubles(text), ...(notes ? { notes } : {}) };
    price_evidence.push({
      service_id: id,
      source_url: page.url,
      currency: 'BYN',
      currency_text_original: clean(text).match(/рублей|руб\.?/u)?.[0],
      unit: id === 'full-treatment' ? 'vehicle' : id === 'mobile-visit' ? 'visit' : null,
      unit_original: null,
      unit_basis:
        'Единица возле суммы не напечатана; для полной обработки и выезда определяется контекстом услуги.',
      ...price,
    });
    return price;
  };
  const scope = home.paragraphs.find((text) => text.startsWith('В категорию ПОЛНАЯ ОБРАБОТКА'));
  const lower = home.paragraphs.find((text) => text.startsWith('В категорию НИЖНЯЯ ЧАСТЬ'));
  const duration = clean(home.text).match(/от (\d+) до (\d+) рабочих дней/u);
  const completion_time = duration
    ? {
        min: Number(duration[1]),
        max: Number(duration[2]),
        unit: 'days',
        text_original: duration[0],
      }
    : null;
  const fullPrices = (current?.rows || []).map((row) =>
    evidencePrice(
      'full-treatment',
      home,
      row.price_text_original,
      row.vehicle_type_id,
      `${current.label}; без пескоструйной очистки; за автомобиль`,
    ),
  );
  add('full-treatment', home, 'Полная обработка', 'anticorrosion', scope, fullPrices, {
    completion_time,
  });
  add('lower-treatment', home, 'НИЖНЯЯ ЧАСТЬ', 'anticorrosion', lower);

  const columnText = clean((current || schedules[0]).text_original);
  const premium = columnText.match(
    /Автомобили премиум-класса и коммерческий транспорт:\s*Цена договорная/u,
  );
  if (premium) {
    const name = premium[0].split(':')[0];
    vehicle_types.push({ id: 'premium-commercial', name_original: name, class: 'other' });
    add('premium-commercial', home, name, 'anticorrosion', premium[0]);
  }
  const sandName =
    'Беспылевая пескоструйная обработка (удаление рыхлой ржавчины) поврежденных коррозией участков';
  const surchargeName =
    'Доплата по согласованию с заказчиком за конструктивную сложность разборочно сборочных работ (в особенности новых автомобилей) нижней части автомобиля';
  for (const [id, page, text, period] of [
    ['home', home, columnText, current?.label],
    ['sand', sand, clean(sand.text), null],
  ]) {
    for (const [suffix, name, category] of [
      ['blasting', sandName, 'anticorrosion'],
      ['disassembly', surchargeName, 'additional'],
    ]) {
      const start = text.indexOf(name);
      if (start < 0) throw new Error(`Missing ${name} on ${page.url}`);
      const amount = text.slice(start + name.length).match(rubles)?.[0];
      if (!amount) throw new Error(`No price beside ${name}`);
      const serviceId = `${id}-${suffix}`;
      const notes = [
        period,
        'Точная стоимость пескоструйной обработки только после осмотра автомобиля.',
        suffix === 'disassembly'
          ? 'Доплата, по согласованию с заказчиком.'
          : 'За поврежденные участки; точная единица не указана.',
      ]
        .filter(Boolean)
        .join(' ');
      const prices =
        id === 'home' && !current ? [] : [evidencePrice(serviceId, page, amount, 'any', notes)];
      add(serviceId, page, name, category, notes, prices);
    }
  }
  const visit = clean(sand.text).match(/Выезд в пределах городской черты\s*-+\s*([\s\S]*?руб\.)/u);
  if (!visit) throw new Error('Missing mobile blasting travel price');
  add(
    'mobile-visit',
    sand,
    'Пескоструйная обработка с выездом к клиенту',
    'additional',
    'Выезд в пределах городской черты; цена выезда, не полная стоимость обработки.',
    [evidencePrice('mobile-visit', sand, visit[1], 'any', 'За выезд в пределах городской черты.')],
  );

  const diagnostics = blockWith(home, /^ДИАГНОСТИКА НА ПРЕДМЕТ ОБРАБОТКИ/u);
  if (!diagnostics) throw new Error('Missing diagnostics block');
  const diagnosticRows = [
    ...clean(diagnostics.text).matchAll(
      /\d\) Стоимость (\d+ рублей) - продолжительность не более (\d+) минут\. ([^.]+\.)/gu,
    ),
  ];
  if (!diagnosticRows.length) throw new Error('Missing diagnostic variants');
  for (const [index, row] of diagnosticRows.entries()) {
    const id = `diagnostics-${index + 1}`;
    const description =
      'ДИАГНОСТИКА НА ПРЕДМЕТ ОБРАБОТКИ. При дальнейшей обработке на территории ООО "СТО Алруса" стоимость диагностики входит в общую стоимость обработки.';
    add(
      id,
      home,
      row[3],
      'additional',
      description,
      [
        evidencePrice(
          id,
          home,
          row[1],
          'any',
          'За диагностику; при дальнейшей обработке входит в общую стоимость.',
        ),
      ],
      {
        completion_time: {
          max: Number(row[2]),
          unit: 'minutes',
          text_original: `не более ${row[2]} минут`,
        },
      },
    );
  }
  add(
    'running-gear',
    workshop,
    'Ремонт ходовой части',
    'additional',
    'Числовые цены на странице услуг СТО отсутствуют.',
  );
  const weldingBlock = blockWith(welding, /^НАИМЕНОВАНИЕ СВАРОЧНЫХ РАБОТ/u);
  const weldingNames =
    weldingBlock?.text
      .split('\n')
      .map(clean)
      .filter((text) => /^(?:ПЕРЕВАРКА|ПОСТАВИТЬ)/u.test(text)) || [];
  if (!weldingNames.length) throw new Error('Missing named welding services');
  for (const [index, name] of weldingNames.entries()) {
    add(
      `welding-${index + 1}`,
      welding,
      name,
      'additional',
      'Хотите узнать стоимость работ сейчас? Присылайте фото: Viber +375 33 694-62-32',
    );
  }
  const warnings = [
    'BYN: рубли на сайте компании из Беларуси; ISO-код валюты на странице не указан.',
    'Оба датированных прайса сохранены в price_schedules; в сравнении только действующий на дату сбора.',
    'Расхождение источников: цены пескоструйной обработки и доплаты на главной и /peskostrui/ различаются; предложения сохранены отдельно с исходными URL.',
    'НИЖНЯЯ ЧАСТЬ, премиум/коммерческий транспорт, ремонт ходовой и сварочные работы: числовые цены не опубликованы; prices: [].',
    'Прайс антикоррозийной обработки указан без пескоструйной очистки. Доплаты и выезд не включены в базовую цену.',
    'Часы работы не найдены; сайт ограничивает прием автомобилей после обработки неизвестными составами.',
  ];
  if (!current)
    warnings.push(
      `На ${date} ни один опубликованный период цен не действует: датированные цены не включены в сравнение.`,
    );
  return {
    services,
    vehicle_types,
    currency: 'BYN',
    warnings,
    price_schedules: schedules,
    price_evidence,
  };
}

export function buildSite(pages, date) {
  const company = parseCompany(pages);
  const { services, vehicle_types, currency, warnings, price_schedules, price_evidence } =
    parseServices(pages, date);
  const sources = pages.map((page) => ({
    url: page.url,
    fetched_at: page.fetched_at,
    used_for: [page.title],
  }));
  const evidence = (pattern) =>
    pages.flatMap((page) =>
      unique(page.paragraphs.filter((text) => pattern.test(text))).map((text) => ({
        text,
        source_url: page.url,
      })),
    );
  const contactPage = byPath(pages, '/contacts/');
  const harvest = {
    metadata: {
      source_site: site.baseUrl,
      brand: company.name,
      retrieved_at: date,
      notes: ['Claims and guarantees are statements by the source site.'],
    },
    company: {
      ...company,
      contacts: { ...contactsFromText(contactPage.text), phones: company.locations[0].phones },
      registration: {
        legal_name_original: company.name,
        unp_original: contactPage.text.match(/УНП\s+\d+/u)?.[0] || null,
        source_url: contactPage.url,
      },
      contact_evidence: { source_url: contactPage.url, text: contactPage.text },
    },
    services,
    vehicle_types,
    currency,
    price_schedules,
    price_evidence,
    technology_and_materials: evidence(
      /Динитрол|Dinitrol|синтетическ|ингибитор|пескоструйным|Сушка поверхностей|подкрылков/iu,
    ),
    site_claims: [
      ...claimsFromPages(pages),
      ...pages.flatMap((page) =>
        blocks(page)
          .filter((block) => /ГАРАНТИЯ НА ВЫПОЛНЕННЫЕ|№1|Наши преимущества/u.test(block.text))
          .map((block) => ({
            text: clean(block.text),
            source_url: page.url,
            verification: 'site_claim',
          })),
      ),
    ],
    conditions: evidence(
      /НЕ ПРИНИМАЕМ|неизвестными составами|ежегодное|осмотра|по согласованию|диагностики входит/iu,
    ),
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
