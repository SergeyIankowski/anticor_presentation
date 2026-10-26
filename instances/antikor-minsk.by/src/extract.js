import {
  claimsFromPages,
  clean,
  contactsFromText,
  parseMoney,
  vehicleClass,
} from '@anticor/harvest-core';
import site from './site.js';

function homepage(pages) {
  const home = pages.find((page) => new URL(page.url).pathname === '/');
  if (!home?.calculator || !home.site_evidence)
    throw new Error('Missing live calculator enrichment');
  return home;
}

export function parseCompany(pages) {
  const home = homepage(pages);
  const evidence = home.site_evidence;
  const contacts = contactsFromText(evidence.contacts.join('\n'));
  const address = evidence.contacts.find((line) => /ул\./iu.test(line));
  const hours = evidence.contacts.find((line) => /\d{1,2}:\d{2}/u.test(line));
  const name = home.title.match(/ANTIKOR-MINSK/u)?.[0] || evidence.brand;
  if (!name || !address || !hours) throw new Error('Company/contact markup changed');
  return {
    name,
    website: site.baseUrl,
    country: 'BY',
    locations: [
      {
        address,
        phones: contacts.phones,
        working_hours: hours,
        ...(/Минске/u.test(home.title) ? { city: 'Минск' } : {}),
      },
    ],
  };
}

export function parseServices(pages) {
  const home = homepage(pages);
  const { initial, states, coverage } = home.calculator;
  if (
    !states.length ||
    states.length !== coverage.reduce((sum, row) => sum + row.model_count, 0) ||
    coverage.some((row) => row.model_count !== row.captured_count)
  )
    throw new Error('Incomplete calculator states');
  const vehicle_types = [{ id: 'unselected', name_original: 'Выберите модель', class: 'other' }];
  for (const [index, state] of states.entries()) {
    const label = clean(`${state.make} ${state.model}`);
    vehicle_types.push({
      id: `model-${index + 1}`,
      name_original: label,
      class: vehicleClass(label),
    });
  }
  const duration = home.site_evidence.timing.match(/Обработка займет от (\d+) часов\./u);
  const completion_time = duration
    ? { min: Number(duration[1]), unit: 'hours', text_original: duration[0] }
    : null;
  const services = initial.map((card) => {
    if (!card.key || !card.name || !card.description || !home.text.includes(card.name))
      throw new Error('Missing package details or source anchor');
    const priceRows = [
      { vehicleId: 'unselected', price: card.price_text },
      ...states.map((state, index) => ({
        vehicleId: `model-${index + 1}`,
        price: state.prices.find((price) => price.key === card.key)?.price_text,
      })),
    ];
    const prices = priceRows.map(({ vehicleId, price }) => {
      if (!price || !/^от\s+\d+(?:[.,]\d+)?\s+BYN$/u.test(price))
        throw new Error(`Invalid live calculator price for ${vehicleId}: ${price}`);
      return {
        vehicle_type_id: vehicleId,
        ...parseMoney(price),
        notes: `Источник: ${home.url}; единица: за автомобиль. ${vehicleId === 'unselected' ? 'Исходная цена без выбора марки и модели; не является общей ценой для всех автомобилей.' : 'Состояние калькулятора с выбранными маркой и моделью; сохранён квалификатор «от».'} Зачистка + консервация в стоимость не входит.`,
      };
    });
    return {
      id: card.key,
      category: 'anticorrosion',
      name_original: card.name,
      description: card.description,
      url: home.url,
      completion_time,
      prices,
    };
  });
  const extra = home.site_evidence.steps.find((step) =>
    /дополнительной.*стоимость.*не входит/u.test(step.text),
  );
  if (!extra?.name || !home.text.includes(extra.name))
    throw new Error('Missing preparation surcharge evidence');
  services.push({
    id: 'surface-preparation',
    category: 'anticorrosion',
    name_original: extra.name,
    description: extra.text,
    url: home.url,
    completion_time: null,
    prices: [],
  });
  const assessment = home.site_evidence.assessment;
  if (assessment && home.text.includes(assessment))
    services.push({
      id: 'assessment',
      category: 'additional',
      name_original: assessment,
      description: assessment,
      url: home.url,
      completion_time: null,
      prices: [],
    });
  const warnings = [
    'Все цены калькулятора указаны «от», в BYN за автомобиль; скидки не вычитались. Исходные цены без выбора автомобиля сохранены отдельно от цен моделей.',
    'Зачистка + консервация оплачивается дополнительно после мойки и сушки; числовой цены нет. Бесплатная оценка указана без выдуманной числовой цены.',
    'Сайт задаёт марки/модели, а не размерные классы автомобилей; class=other, если класс не указан в самом названии.',
    'Гарантии на странице различаются: в первом блоке «До 5 лет», в преимуществах «от 1 года до 7 лет»; сохранены как заявления сайта.',
  ];
  const empty = coverage.filter((row) => !row.model_count).map((row) => row.make);
  if (empty.length)
    warnings.push(`Марки без доступных моделей в текущем калькуляторе: ${empty.join(', ')}.`);
  if (home.calculator.inaccessible_options.length)
    warnings.push(
      `В options.php есть ${home.calculator.inaccessible_options.length} вариантов, чьи марки отсутствуют в селекторе; они сохранены в calculator.inaccessible_options и не выданы за доступные цены.`,
    );
  return { services, vehicle_types, currency: 'BYN', warnings };
}

export function buildSite(pages, date) {
  const home = homepage(pages);
  const company = parseCompany(pages);
  const { services, vehicle_types, currency, warnings } = parseServices(pages);
  const evidence = home.site_evidence;
  const sources = pages.map((page) => ({
    url: page.url,
    fetched_at: page.fetched_at,
    used_for: [
      page.title,
      'Услуги, контакты, цены всех состояний калькулятора, материалы, этапы и заявления',
    ],
  }));
  sources.push({
    url: home.calculator.options_source.url,
    fetched_at: home.calculator.options_source.fetched_at,
    used_for: ['Живой список марок и моделей; контроль полноты калькулятора'],
  });
  const claims = [
    evidence.technology,
    ...evidence.main_claims,
    ...evidence.benefits,
    evidence.materials,
    evidence.discount,
  ]
    .filter(Boolean)
    .map((text) => ({ text, source_url: home.url, verification: 'site_claim' }));
  const harvest = {
    metadata: {
      source_site: site.baseUrl,
      brand: company.name,
      retrieved_at: date,
      notes: ['Claims and guarantees are statements by the source site.'],
    },
    company: {
      ...company,
      name_original: evidence.brand,
      description: evidence.company_description,
      contacts: {
        ...contactsFromText(home.body_text || home.text),
        social_links: evidence.social_links,
      },
    },
    services,
    vehicle_types,
    currency,
    technology: { text_original: evidence.technology, source_url: home.url, steps: evidence.steps },
    materials: {
      text_original: evidence.materials,
      package_details: home.calculator.initial.map(({ name, description }) => ({
        name,
        description,
      })),
      source_url: home.url,
    },
    calculator: home.calculator,
    site_claims: [...claimsFromPages(pages), ...claims],
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
