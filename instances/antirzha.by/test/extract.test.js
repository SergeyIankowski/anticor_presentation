import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCompany, parseServices } from '../src/extract.js';
import { parseDuration, parsePackages } from '../src/prices.js';
import { servicePaths } from '../src/site.js';

function pricePage() {
  return {
    url: 'https://antirzha.by/ceny/',
    pricing_variants: [
      'Легковой седан · хетчбек',
      'Кроссовер SUV · универсал',
      'Рамный внедорожник · пикап',
    ].map((name, index) => ({
      vehicle: { id: `vehicle-${index + 1}`, name, description: name },
      packages: ['prof', 'standart', 'restavr', 'premium'].map((id, packageIndex) => ({
        id,
        name: id,
        description: 'Защита кузова',
        price_text: `от ${1500 + index * 200 + packageIndex * 500} BYN`,
        duration: ['до 72 часов', '2–3 дня', 'от 7 дней', '3–5 дней'][packageIndex],
        guarantee: 'гарантия 7 лет',
        features: ['Днище', 'Скрытые полости'],
      })),
    })),
  };
}

test('Antirzha keeps vehicle prices separate and uses fresh amounts', () => {
  const page = pricePage();
  const result = parsePackages(page);
  assert.equal(result.services.length, 4);
  assert.deepEqual(
    result.vehicle_types.map((vehicle) => vehicle.class),
    ['sedan', 'crossover', 'suv'],
  );
  assert.deepEqual(
    result.services[1].prices.map((price) => price.price_min),
    [2000, 2200, 2400],
  );
  assert.ok(
    result.services.flatMap((service) => service.prices).every((price) => price.price === null),
  );
  page.pricing_variants[2].packages[1].price_text = 'от 2 750 BYN';
  assert.equal(parsePackages(page).services[1].prices[2].price_min, 2750);
});

test('Antirzha refuses incomplete selectors, package coverage, and non-price values', () => {
  const missingVehicle = pricePage();
  missingVehicle.pricing_variants.pop();
  assert.throws(() => parsePackages(missingVehicle), /vehicle coverage/);
  const missingPackage = pricePage();
  missingPackage.pricing_variants[2].packages.pop();
  assert.throws(() => parsePackages(missingPackage), /package coverage/);
  const missingPrice = pricePage();
  missingPrice.pricing_variants[0].packages[0].price_text = 'уточните у мастера';
  assert.throws(() => parsePackages(missingPrice), /package details/);
});

test('Antirzha preserves duration limits and ranges without treating them as exact values', () => {
  assert.deepEqual(parseDuration('до 72 часов'), {
    unit: 'hours',
    text_original: 'до 72 часов',
    max: 72,
  });
  assert.deepEqual(parseDuration('от 7 дней'), {
    unit: 'days',
    text_original: 'от 7 дней',
    min: 7,
  });
  assert.deepEqual(parseDuration('2–3 дня'), {
    unit: 'days',
    text_original: '2–3 дня',
    min: 2,
    max: 3,
  });
  assert.throws(() => parseDuration('уточняется'), /duration/);
});

test('Antirzha lists its single workshop rather than customer cities as branches', () => {
  const body_text =
    'Клиенты: Минск, Брест, Гродно\nБарановичи, ул. Декабристов, 7, бокс №99\nПН–СБ 9:00–21:00, ВС 10:00–18:00\n+375 29 536-62-01';
  const company = parseCompany(
    { body_text },
    { body_text: 'Оператор: Частное унитарное предприятие «Першы антыкаразійны»' },
  );
  assert.equal(company.locations.length, 1);
  assert.equal(company.locations[0].city, 'Барановичи');
  assert.match(company.locations[0].address, /бокс №99/);
  assert.throws(() => parseCompany({ body_text: '' }, { body_text: '' }), /missing/);
});

test('Antirzha keeps the square-metre rate and leaves quote-only services unpriced', () => {
  const page = pricePage();
  page.site_details = {
    cleaning_rates: [
      {
        name: 'Аквабластинг',
        price_text: 'расчёт по фото',
        note: '',
        url: 'https://antirzha.by/akvablasting/#price',
      },
      {
        name: 'Лазерная чистка',
        price_text: 'расчёт по объёму',
        note: '',
        url: 'https://antirzha.by/lazernaya-chistka/#price',
      },
      {
        name: 'Пескоструй',
        price_text: 'от 12 BYN/м²',
        note: 'после осмотра',
        url: 'https://antirzha.by/peskostruy/#price',
      },
    ],
  };
  const pages = [
    page,
    ...servicePaths.map((path) => ({
      url: `https://antirzha.by${path}`,
      description: 'Описание услуги',
      paragraphs: [],
      site_details: { title_original: path },
    })),
  ];
  const result = parseServices(pages);
  const sandblast = result.services.find((service) => service.id === 'peskostruy');
  assert.equal(sandblast.prices[0].price_min, 12);
  assert.equal(sandblast.prices[0].price_text_original, 'от 12 BYN/м²');
  assert.match(sandblast.prices[0].notes, /не за весь автомобиль/);
  assert.deepEqual(result.services.find((service) => service.id === 'akvablasting').prices, []);
  page.site_details.cleaning_rates[2].price_text = 'от 12 BYN/час';
  assert.throws(() => parseServices(pages), /unit changed/);
});
