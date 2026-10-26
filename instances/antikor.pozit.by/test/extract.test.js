import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { extractPage, repositoryRoot, validateJson } from '@anticor/harvest-core';
import { chromium } from '../../../packages/harvest-core/node_modules/playwright/index.mjs';
import { buildSite, parseServices } from '../src/extract.js';
import site from '../src/site.js';

let browser;
let snapshot;
before(async () => {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(
    await readFile(new URL('./fixtures/home.html.txt', import.meta.url), 'utf8'),
  );
  snapshot = {
    ...(await page.evaluate(extractPage, site.extraction)),
    ...(await site.enrichPage(page)),
    url: site.baseUrl,
    fetched_at: new Date().toISOString(),
  };
  await page.close();
});
after(async () => browser?.close());

const fixture = () => structuredClone(snapshot);

test('live HTML selectors capture both packages, material variants, contacts and all materials', async () => {
  const { comparison, harvest } = buildSite([fixture()], '2026-10-26');
  assert.equal(comparison.services.length, 2);
  assert.deepEqual(
    comparison.services.map((service) => service.prices.map((price) => price.price_min)),
    [
      [500, 700],
      [700, 900],
    ],
  );
  assert.ok(
    comparison.services.every((service) => service.prices.every((price) => price.price === null)),
  );
  assert.ok(comparison.services.every((service) => snapshot.text.includes(service.name_original)));
  assert.ok(comparison.services.every((service) => service.url === site.baseUrl));
  assert.ok(comparison.services[0].prices[0].notes.includes('NOXUDOL'));
  assert.ok(comparison.services[0].prices[1].notes.includes('MERCASOL'));
  assert.equal(harvest.materials.length, 7);
  assert.equal(harvest.faq.length, 5);
  assert.equal(harvest.pricing_evidence[0].qualifier_original, 'от');
  assert.equal(harvest.pricing_evidence[0].unit, null);
  assert.equal(comparison.vehicle_types[0].class, 'other');
  assert.equal(comparison.company.name, 'ООО «Позит»');
  assert.ok(comparison.company.locations[0].address.includes('Олешева 137А'));
  assert.ok(harvest.company.contacts.phones.includes('+375 (29) 687-78-78'));
  assert.equal(comparison.services[0].completion_time.min, undefined);
  assert.match(comparison.services[0].completion_time.text_original, /30 часов.*среднее/iu);
  await validateJson(comparison, join(repositoryRoot, 'schema.json'));
  await validateJson(harvest, join(repositoryRoot, 'schemas/site-harvest.schema.json'));
});

test('reads changed current price and qualifiers; does not use JSON-LD priceRange', () => {
  const page = fixture();
  page.pozit.cards[0].prices[0].text = 'от 1 234,50 руб.';
  page.pozit.cards[0].prices[1].text = '1000–1500 руб.';
  const { services } = parseServices([page]);
  assert.equal(services[0].prices[0].price_min, 1234.5);
  assert.equal(services[0].prices[0].price_text_original, 'от 1 234,50 руб.');
  assert.equal(services[0].prices[1].price_min, 1000);
  assert.equal(services[0].prices[1].price_max, 1500);
  assert.equal(
    services.flatMap((service) => service.prices).some((price) => price.price_min === 850),
    false,
  );
});

test('quote-only or absent prices stay empty with no fallback to old prices', () => {
  const page = fixture();
  page.pozit.cards[0].prices = [{ material: 'NOXUDOL', text: 'Цена по запросу' }];
  page.pozit.cards[1].prices = [];
  const { services, pricing_evidence } = parseServices([page]);
  assert.deepEqual(
    services.map((service) => service.prices),
    [[], []],
  );
  assert.deepEqual(pricing_evidence, []);
});

test('missing cards or source heading fails rather than publishing invented services', () => {
  assert.throws(
    () => parseServices([{ ...fixture(), pozit: { cards: [] } }]),
    /No live price cards/,
  );
  const page = fixture();
  page.pozit.cards[0].name = 'Not on the source page';
  assert.throws(() => parseServices([page]), /absent from its source/);
});
