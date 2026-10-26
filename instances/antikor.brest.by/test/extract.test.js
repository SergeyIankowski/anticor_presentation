import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { clean, validateJson } from '@anticor/harvest-core';
import { buildSite, parsePriceTable, parseServices } from '../src/extract.js';
import site from '../src/site.js';

// Actual rendered service and table snapshots from public pages, 2026-10-26.
const pages = JSON.parse(await readFile(new URL('./fixtures/live-pages.json', import.meta.url)));
const pricePage = pages.find((page) => page.url.endsWith('/tseny/tseny-na-antikor/'));

test('two-column primary treatment table preserves all categories and amounts', () => {
  const { services, vehicle_types } = parseServices(pages);
  assert.equal(vehicle_types.length, 7);
  assert.equal(services.length, 7);
  assert.deepEqual(
    services[0].prices.map((price) => price.price),
    [500, 580, 680, 780, 780, 860, 990],
  );
  assert.deepEqual(
    services[1].prices.map((price) => price.price),
    [400, 480, 600, 670, 690, 750, 800],
  );
  assert.equal(services[0].prices[0].price_text_original, '500,00');
  assert.match(services[0].prices[0].notes, /Первичная.*новых.*осмотра/u);
  assert.match(services[0].prices[0].notes, /BYN; за автомобиль/u);
  assert.match(
    services[0].prices[0].notes,
    /Источник: https:\/\/antikor\.brest\.by\/tseny\/tseny-na-antikor\//u,
  );
  assert.equal(vehicle_types[3].name_original, 'Минивен, кроссовер');
  assert.equal(vehicle_types[3].class, 'crossover');
  assert.equal(vehicle_types[0].class, 'small');
});

test('amounts always come from current cells; qualified prices remain qualified', () => {
  const changed = structuredClone(pricePage);
  changed.tables[0].rows[2][1].text = 'от 1234,50';
  const result = parsePriceTable(changed).pricesByColumn['Полная обработка'][0];
  assert.equal(result.price, null);
  assert.equal(result.price_min, 1234.5);
  assert.equal(result.price_text_original, 'от 1234,50');
});

test('priced services anchor to their actual table columns and retain detail evidence', () => {
  const { services } = parseServices(pages);
  for (const [index, name] of ['Полная обработка', 'Обработка днища'].entries()) {
    assert.equal(services[index].url, pricePage.url);
    assert.equal(services[index].name_original, name);
    assert.ok(pricePage.text.includes(name));
    assert.match(services[index].description, /Источник описания: https:\/\/antikor\.brest\.by\//u);
  }
  assert.match(services[0].description, /ПОЛНАЯ АНТИКОРРОЗИЙНАЯ ОБРАБОТКА АВТОМОБИЛЯ/u);
});

test('editorial discovery excludes unrelated posts and preserves relevant source pages', () => {
  assert.equal(
    site.discover(
      '/blog-post/preimushhestva-antikorrozijnoj-obrabotki-avto/',
      new URLSearchParams(),
    ),
    true,
  );
  assert.equal(
    site.discover(
      '/blog-post/information-about-pusat777-the-best-online-slot-gacor-in-the-world/',
      new URLSearchParams(),
    ),
    false,
  );
});

test('missing prices and structural drift fail instead of fabricating rows', () => {
  assert.throws(() => parsePriceTable({ tables: [] }), /missing/u);
  const changed = structuredClone(pricePage);
  changed.tables[0].rows[2][2].text = 'по запросу';
  assert.throws(() => parsePriceTable(changed), /No amount/u);
  changed.tables[0].rows[2].pop();
  assert.throws(() => parsePriceTable(changed), /Incomplete/u);
});

test('unpriced services stay empty; names anchor to harvested canonical pages', () => {
  const { services } = parseServices(pages);
  for (const service of services) {
    const source = pages.find((page) => page.url === service.url);
    assert.ok(source);
    assert.equal(new URL(service.url).hash, '');
    assert.ok(clean(source.text).includes(clean(service.name_original)));
    assert.equal(service.completion_time, null);
  }
  assert.ok(services.slice(2).every((service) => service.prices.length === 0));
});

test('comparison contract, materials and address contradiction are preserved', async () => {
  const home = {
    url: 'https://antikor.brest.by/',
    title: 'Артглас',
    text: 'Сервисного центра автомобилей Артглас в Бресте',
    body_text: 'Брест ул.Коммерческая, 17',
    paragraphs: [],
    headings: [],
  };
  const { harvest, comparison, warnings } = buildSite([...pages, home], '2026-10-26');
  await validateJson(comparison, new URL('../../../schema.json', import.meta.url).pathname);
  assert.match(comparison.company.locations[0].address, /Янки Купалы 100\/1/u);
  assert.ok(warnings.some((warning) => warning.includes('Расхождение адресов')));
  assert.ok(harvest.materials.some((item) => /Dinitrol/u.test(item.text)));
  assert.ok(harvest.site_claims.some((item) => /гарантия от 2 до 10 лет/u.test(item.text)));
  assert.equal(harvest.company.contacts.emails[0], 'antikorartglass@hotmail.com');
});
