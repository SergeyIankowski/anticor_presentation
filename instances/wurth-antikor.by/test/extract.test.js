import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateJson } from '@anticor/harvest-core';
import { buildSite } from '../src/extract.js';
import site from '../src/site.js';

const fixture = JSON.parse(await readFile(new URL('./fixtures/live-pages.json', import.meta.url)));
const run = (pages = structuredClone(fixture)) => buildSite(pages, '2026-10-26');

test('live fixture: category prices, range, all quote-only services, and starting qualifiers', () => {
  const { comparison, harvest } = run();
  assert.equal(comparison.services.length, 23);
  const treatment = comparison.services.find((service) => service.id === 'standard-treatment');
  assert.deepEqual(
    treatment.prices.map((price) => price.price),
    [650, 750, 850, 950, 1050, null],
  );
  assert.equal(treatment.prices.at(-1).price_min, 1150);
  assert.equal(treatment.prices.at(-1).price_max, 1650);
  assert.equal(treatment.prices.at(-1).price_text_original, '1150-1650 рублей');
  assert.equal(comparison.services.filter((service) => !service.prices.length).length, 19);
  const starting = comparison.services.filter((service) => service.id.startsWith('homepage-'));
  assert.deepEqual(
    starting.map((service) => service.prices[0].price_min),
    [1000, 1500, 2000],
  );
  assert.ok(starting.every((service) => service.prices[0].price === null));
  assert.ok(starting.every((service) => service.prices[0].vehicle_type_id === 'unspecified'));
  assert.equal(starting[0].category, 'additional');
  assert.ok(
    comparison.services
      .filter((service) => service.id.startsWith('section-1-'))
      .every((service) => service.category === 'additional'),
  );
  assert.equal(treatment.category, 'anticorrosion');
  assert.deepEqual(
    comparison.vehicle_types.map((vehicle) => vehicle.class),
    ['small', 'sedan', 'crossover', 'minivan', 'suv', 'van', 'other'],
  );
  assert.ok(harvest.price_evidence.some((evidence) => evidence.pricing_basis === 'quote_only'));
});

test('amounts come from offer text; changing a badge never changes a quote-only price', () => {
  const pages = structuredClone(fixture);
  const treatment = pages.find((page) => page.url.includes('/antikorrozijnaya-obrabotka-avto/'));
  treatment.price_cards[1].offer_text = 'от 987,50 рублей';
  for (const page of pages) for (const card of page.price_cards) card.badge_text = '123456 р.';
  const { comparison } = run(pages);
  const price = comparison.services[0].prices[1];
  assert.equal(price.price, null);
  assert.equal(price.price_min, 987.5);
  assert.equal(price.price_text_original, 'от 987,50 рублей');
  assert.equal(comparison.services.filter((service) => !service.prices.length).length, 19);
  assert.ok(
    !comparison.services
      .flatMap((service) => service.prices)
      .some((entry) => entry.price === 123456),
  );
});

test('every service has an actual harvested page URL and a source-text anchor', () => {
  const { comparison } = run();
  for (const service of comparison.services) {
    assert.ok(!service.url.includes('#'));
    const page = fixture.find((entry) => entry.url === service.url);
    assert.ok(page, service.url);
    assert.ok(
      page.text.replace(/\s+/g, ' ').includes(service.name_original),
      service.name_original,
    );
    for (const price of service.prices)
      assert.ok(comparison.vehicle_types.some((vehicle) => vehicle.id === price.vehicle_type_id));
  }
});

test('missing cards and absent source names fail instead of publishing partial invented data', () => {
  const pages = structuredClone(fixture);
  pages[1].price_cards = [];
  assert.throws(() => run(pages), /price cards were not extracted/);
  const changed = structuredClone(fixture);
  changed[2].price_cards[0].name_original = 'Not on the source page';
  assert.throws(() => run(changed), /absent from source page/);
  const interactive = structuredClone(fixture);
  interactive[1].price_controls = [{ name: 'vehicle', text: 'New pricing selector' }];
  assert.throws(() => run(interactive), /capture every pricing state/);
});

test('company contacts, materials, claims, both contracts and template entry point', async () => {
  const { comparison, harvest } = run();
  assert.equal(comparison.company.locations[0].city, 'Минск');
  assert.match(comparison.company.locations[0].working_hours, /Суббота и воскресенье/);
  assert.ok(harvest.company.contacts.emails.includes('wurth-antikor@yandex.ru'));
  assert.equal(harvest.company.registration_number, '191209000');
  assert.ok(harvest.technologies_and_materials.some((item) => /каучук/u.test(item.text)));
  assert.ok(harvest.site_claims.length);
  await validateJson(comparison, new URL('../../../schema.json', import.meta.url).pathname);
  await validateJson(
    harvest,
    new URL('../../../schemas/site-harvest.schema.json', import.meta.url).pathname,
  );
  assert.equal(
    await readFile(new URL('../src/parse.js', import.meta.url), 'utf8'),
    await readFile(new URL('../../../template/src/parse.js', import.meta.url), 'utf8'),
  );
  assert.equal(site.seeds.length, 8);
  assert.ok(site.seeds.every((seed) => seed.required));
  assert.ok(!site.discover('/news/', new URLSearchParams()));
});
