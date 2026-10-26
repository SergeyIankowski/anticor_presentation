import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildSite, parseServices } from '../src/extract.js';
import site from '../src/site.js';

function pages() {
  const cards = ['Легковые автомобили', 'Кроссоверы, паркетники', 'Внедорожники'].map(
    (name, i) => ({
      name,
      text: `${name} Модель ${i + 1} Комплекс ЛАЙТ: от ${101 + i},50р Комплекс СТАНДАРТ: от ${201 + i}р`,
    }),
  );
  const row = {
    name: 'Полировка фар/задних фанарей авто',
    price: '77 руб',
    description: 'Цена указана за пару.',
  };
  const make = (path, title, text, headings = [], proficor = {}) => ({
    url: new URL(path, site.baseUrl).href,
    title,
    text,
    headings,
    paragraphs: [text],
    links: [],
    fetched_at: '2026-10-26T00:00:00Z',
    proficor: { dynamic_price_control_count: 0, ...proficor },
  });
  return [
    make(
      '/',
      'Proficor',
      `${cards.map((c) => c.text).join('\n')}\nОбработка занимает 6-8 часов.\nЭтапы антикоррозийной обработки Dinitrol LT. Отзывы`,
      [],
      { price_cards: cards },
    ),
    make(
      '/antikorrozijnaya-obrabotka-elektromobilej/',
      'Электромобили',
      'Обработка электромобилей и гибридов. Гарантия 5 лет.',
      [{ level: 1, text: 'Обработка электромобилей и гибридов' }],
    ),
    make(
      '/polirovka/',
      'Полировка',
      `Цены на полировку автомобиля ${row.name} ${row.price} ${row.description}`,
      [{ level: 2, text: 'Цены на полировку автомобиля' }],
      { polishing: [row] },
    ),
    make(
      '/kontakty/',
      'Контакты',
      'г.Минск, ул. Янки Мавра 47 (корпус 42)\nс 9.00 до 18.00 (вс выходной)\n+375 44 538 82 57\nproficor.center@gmail.com\nООО «ПРОФИКОР-ЦЕНТР» УНП 193648886',
    ),
  ];
}

test('extracts fresh amounts, lower bounds, category examples and pair unit', () => {
  const { services, vehicle_types, pricing_evidence } = parseServices(pages());
  assert.deepEqual(
    services[0].prices.map((p) => p.price_min),
    [101.5, 102.5, 103.5],
  );
  assert.ok(services[0].prices.every((p) => p.price === null));
  assert.equal(services[0].prices[0].price_text_original, 'от 101,50р');
  assert.equal(services[3].prices[0].price, 77);
  assert.match(services[3].prices[0].notes, /за пару/);
  assert.equal(pricing_evidence.at(-1).unit_original, 'Цена указана за пару.');
  assert.equal(vehicle_types[0].examples, 'Модель 1');
  assert.deepEqual(
    vehicle_types.slice(0, 3).map((v) => v.class),
    ['sedan', 'crossover', 'suv'],
  );
  assert.equal(vehicle_types.at(-1).class, 'other');
  assert.equal(services[0].completion_time.max, 8);
});

test('electric and quote-only services never inherit other services prices', () => {
  const input = pages();
  input[2].proficor.polishing[0].price = 'по запросу';
  const result = parseServices(input);
  assert.deepEqual(result.services[2].prices, []);
  assert.deepEqual(result.services[3].prices, []);
});

test('rejects incomplete vehicle matrix and unhandled interactive states', () => {
  const input = pages();
  input[0].proficor.price_cards[0].text = 'Легковые автомобили Комплекс ЛАЙТ: от 123р';
  assert.throws(() => parseServices(input), /Incomplete LIGHT/);
  input[0].proficor.price_cards.pop();
  assert.throws(() => parseServices(input), /all three/);
  const interactive = pages();
  interactive[0].proficor.dynamic_price_control_count = 1;
  assert.throws(() => parseServices(interactive), /state enumeration/);
});

test('company contacts, legal identity, sources, and service anchors remain reproducible', () => {
  const input = pages();
  const { harvest, comparison } = buildSite(input, '2026-10-26');
  assert.equal(harvest.company.legal_name, 'ООО «ПРОФИКОР-ЦЕНТР»');
  assert.equal(harvest.company.registration_number, '193648886');
  assert.deepEqual(harvest.company.contacts.emails, ['proficor.center@gmail.com']);
  assert.equal(comparison.company.locations[0].working_hours, 'с 9.00 до 18.00 (вс выходной)');
  for (const service of comparison.services) {
    assert.equal(new URL(service.url).hash, '');
    assert.ok(input.find((p) => p.url === service.url).text.includes(service.name_original));
  }
  assert.equal(comparison.currency, 'BYN');
  assert.equal(harvest.pricing_evidence.length, 7);
});

test('published snapshots rebuild the comparison exactly without network', async () => {
  const harvest = JSON.parse(await readFile(new URL('../proficor.by.json', import.meta.url)));
  const input = harvest.pages;
  const published = JSON.parse(await readFile(new URL('../parsed/company.json', import.meta.url)));
  assert.deepEqual(buildSite(input, published.source.scraped_at).comparison, published);
  assert.equal(published.services.length, 9);
  assert.equal(
    published.services.reduce((n, s) => n + s.prices.length, 0),
    12,
  );
});
