import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { clean, repositoryRoot, validateJson } from '@anticor/harvest-core';
import { buildSite, parseServices, publishedPrice } from '../src/extract.js';
import site from '../src/site.js';

const fixture = JSON.parse(
  await readFile(new URL('./fixtures/pages.json', import.meta.url), 'utf8'),
);
const fresh = () => structuredClone(fixture);

test('live page fixture produces schema-valid harvest and comparison with real source anchors', async () => {
  const { harvest, comparison } = buildSite(fresh(), '2026-10-26');
  await validateJson(harvest, `${repositoryRoot}/schemas/site-harvest.schema.json`);
  await validateJson(comparison, `${repositoryRoot}/schema.json`);
  assert.equal(comparison.services.length, 6);
  assert.equal(
    comparison.services.reduce((sum, service) => sum + service.prices.length, 0),
    1,
  );
  for (const service of comparison.services) {
    assert.equal(new URL(service.url).hash, '');
    const page = fixture.find((page) => page.url === service.url);
    assert.ok(page && clean(page.text).includes(service.name_original));
    assert.ok(service.description.length > 20);
  }
  const price = comparison.services[0].prices[0];
  assert.equal(price.price, null);
  assert.equal(price.price_min, 1000);
  assert.equal(price.price_max, 3500);
  assert.equal(price.price_text_original, 'от 1000 до 3500 бел. рублей.');
  assert.match(price.notes, /размера авто, слоя старого антикора/u);
  assert.equal(harvest.price_evidence[0].unit_original, null);
  assert.deepEqual(comparison.vehicle_types, [{ id: 'auto', name_original: 'авто', class: 'any' }]);
  assert.ok(comparison.services.slice(1).every((service) => service.prices.length === 0));
  assert.equal(harvest.company.contacts.phones[0], '+375(25) 500-7968');
  assert.equal(harvest.company.contacts.emails[0], 'office.antikorblasting@yandex.by');
  assert.match(comparison.company.locations[0].working_hours, /СБ 12:00/u);
  assert.ok(harvest.technology_and_materials.some(({ text }) => text.includes('DINITROL')));
  assert.ok(harvest.site_claims.some(({ text }) => text.includes('Гарантия от 1 года до 5 лет')));
  assert.equal(harvest.work_examples.length, 21);
});

test('changed current price is parsed rather than using stored numbers', () => {
  const pages = fresh();
  const detail = pages.find((page) => page.url.endsWith('/antikor-avto-blasting/'));
  const heading = detail.headings.find(({ text }) => text.includes('бел. рублей'));
  const replacement = 'от 1 250 до 4 750 бел. рублей.';
  detail.text = detail.text.replace(heading.text, replacement);
  heading.text = replacement;
  const price = parseServices(pages).services[0].prices[0];
  assert.equal(price.price_min, 1250);
  assert.equal(price.price_max, 4750);
  assert.equal(price.price_text_original, replacement);
});

test('removed numeric price produces an empty price array, never gallery years or stale amounts', () => {
  const pages = fresh();
  const detail = pages.find((page) => page.url.endsWith('/antikor-avto-blasting/'));
  const heading = detail.headings.find(({ text }) => text.includes('бел. рублей'));
  detail.text = detail.text.replace(heading.text, 'Стоимость по запросу');
  heading.text = 'Стоимость по запросу';
  const result = parseServices(pages);
  assert.deepEqual(result.services[0].prices, []);
  assert.ok(result.warnings.some((text) => text.includes('числовая цена не найдена')));
});

test('money parsing preserves exact, qualified and range amounts while rejecting non-prices', () => {
  assert.equal(publishedPrice('от 850 руб.').price_min, 850);
  assert.equal(publishedPrice('850,50 BYN').price, 850.5);
  assert.equal(publishedPrice('до 900 руб.').price_max, 900);
  assert.equal(publishedPrice('850–950 руб.').price_max, 950);
  for (const text of [
    '2013г',
    'Гарантия от 1 года до 5 лет',
    'по запросу',
    '90%',
    'ПН-ПТ 10:00 – 19:00',
  ])
    assert.equal(publishedPrice(text), null);
});

test('missing key evidence fails and discovery excludes media and duplicate URL variants', () => {
  assert.throws(() => buildSite(fixture.slice(0, 2), '2026-10-26'), /contact page/u);
  const pages = fresh();
  pages[0].headings = pages[0].headings.filter(({ text }) => text !== 'Антикоррозийная защита');
  assert.throws(() => parseServices(pages), /Expected service heading missing/u);
  assert.equal(site.discover('/antikor-avto-blasting/', new URLSearchParams()), true);
  for (const path of [
    '/antikor-avto-blasting',
    '/imunify-bot-check',
    '/wp-content/uploads/photo.jpg',
  ])
    assert.equal(site.discover(path, new URLSearchParams()), false);
  assert.equal(site.discover('/', new URLSearchParams('s=price')), false);
});
