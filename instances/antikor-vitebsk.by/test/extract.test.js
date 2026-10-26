import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { repositoryRoot, validateJson } from '@anticor/harvest-core';
import { buildSite, parseCompany, parseServices } from '../src/extract.js';

const fixture = JSON.parse(
  await readFile(new URL('./fixtures/home.json', import.meta.url), 'utf8'),
);
const fresh = () => structuredClone(fixture);

test('live fixture: three qualified BYN prices map to the original vehicle categories', () => {
  const { services, vehicle_types, currency } = parseServices([fresh()]);
  assert.equal(currency, 'BYN');
  assert.deepEqual(
    vehicle_types.map((vehicle) => [vehicle.name_original, vehicle.class]),
    [
      ['Седан', 'sedan'],
      ['Кроссовер', 'crossover'],
      ['Внедорожник', 'suv'],
    ],
  );
  assert.deepEqual(
    services[0].prices.map((price) => [
      price.price,
      price.price_min,
      price.price_max,
      price.price_text_original,
    ]),
    [
      [null, 295, null, 'от 295 Руб.'],
      [null, 345, null, 'от 345 Руб.'],
      [null, 395, null, 'от 395 Руб.'],
    ],
  );
});

test('price updates are read from current cards; unrelated numbers are never parsed as prices', () => {
  const page = fresh();
  for (const state of Object.values(page.responsive_evidence))
    state.price_cards[0].price_text_original = 'от 411,50 Руб.';
  page.text += '\nРАССРОЧКА 0% НА 6 МЕСЯЦЕВ; Dinitrol 4941; GPS 55.156837';
  const { services } = parseServices([page]);
  assert.equal(services[0].prices[0].price_min, 411.5);
  assert.equal(services.flatMap((service) => service.prices).length, 3);
});

test('incomplete or divergent responsive price states fail instead of dropping prices', () => {
  const page = fresh();
  page.responsive_evidence.mobile.price_cards.pop();
  assert.throws(() => parseServices([page]), /Desktop\/mobile price cards differ/);
  const empty = fresh();
  for (const state of Object.values(empty.responsive_evidence)) state.price_cards = [];
  assert.throws(() => parseServices([empty]), /No live price cards/);
  const malformed = fresh();
  for (const state of Object.values(malformed.responsive_evidence))
    state.price_cards[0].price_text_original = 'Узнать стоимость';
  assert.throws(() => parseServices([malformed]), /missing a vehicle or a ruble amount/);
});

test('mobile services, VIP, wheel work and free diagnosis retain empty price arrays', () => {
  const { services } = parseServices([fresh()]);
  assert.equal(services.length, 11);
  for (const id of [
    'plastic-repair',
    'argon-welding',
    'towbar-installation',
    'vip',
    'wheel-painting',
    'wheel-repair-and-tyres',
    'underbody-inspection',
  ]) {
    const service = services.find((item) => item.id === id);
    assert.ok(service, id);
    assert.deepEqual(service.prices, []);
  }
  assert.match(
    services.find((service) => service.id === 'underbody-inspection').description,
    /совершенно бесплатно/,
  );
  assert.ok(services.every((service) => service.completion_time === null));
});

test('every original service label occurs in the source text and uses the harvested page URL', () => {
  const page = fresh();
  const { services } = parseServices([page]);
  for (const service of services) {
    assert.ok(page.text.includes(service.name_original), service.name_original);
    assert.equal(service.url, page.url);
    assert.equal(new URL(service.url).hash, '');
  }
});

test('contacts and hours are extracted from contact evidence, including the building and block', () => {
  const company = parseCompany([fresh()]);
  assert.equal(company.name, 'Antikor-Vitebsk');
  assert.deepEqual(company.locations, [
    {
      city: 'Витебск',
      address: 'Бешенковичское шоссе, 65 корпус 153 блок 5',
      phones: ['+375 (29) 590-09-15'],
      working_hours: 'Пн. - Вс. : 8:00 - 18:00',
    },
  ]);
});

test('harvest preserves technology, material spelling and claims; both strict schemas validate', async () => {
  const { harvest, comparison } = buildSite([fresh()], '2026-10-26');
  assert.equal(harvest.technology.length, 7);
  assert.deepEqual(
    harvest.materials.map((material) => material.name_original),
    ['Dinitrol 4941', 'Dinitrol Metalik', 'Wurt', 'Dinitrol ML', 'Dinitrol LT', 'Dinitrol 81'],
  );
  assert.ok(harvest.site_claims.every((claim) => claim.verification === 'site_claim'));
  assert.ok(
    harvest.price_evidence.every(
      (price) => price.unit === null && price.source_url === fixture.url,
    ),
  );
  await validateJson(harvest, `${repositoryRoot}/schemas/site-harvest.schema.json`);
  await validateJson(comparison, `${repositoryRoot}/schema.json`);
});
