import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { repositoryRoot, validateJson } from '@anticor/harvest-core';
import { buildSite, parseServices } from '../src/extract.js';

const fixture = JSON.parse(
  await readFile(new URL('./fixtures/home.json', import.meta.url), 'utf8'),
);
const pages = () => [structuredClone(fixture)];

test('all live vehicle selector states produce three tariffs and fifteen qualified prices', () => {
  const result = parseServices(pages());
  assert.equal(result.services.length, 3);
  assert.equal(result.vehicle_types.length, 5);
  assert.equal(result.currency, 'BYN');
  assert.deepEqual(
    result.vehicle_types.map((type) => type.class),
    ['sedan', 'crossover', 'suv', 'van', 'other'],
  );
  for (const service of result.services) {
    assert.equal(service.prices.length, 5);
    assert.equal(service.url, fixture.url);
    assert.equal(new URL(service.url).hash, '');
    assert.ok(fixture.text.includes(service.name_original));
    for (const price of service.prices) {
      assert.equal(price.price, null);
      assert.ok(price.price_min > 0);
      const state = fixture.pricing_states.find((item) => item.key === price.vehicle_type_id);
      const card = state.cards.find((item) => item.name === service.name_original);
      assert.equal(price.price_text_original, card.price_text_original);
      assert.equal(price.price_min, Number(card.price_text_original.replace(/[^\d]/g, '')));
      assert.ok(price.notes.includes(state.source_url));
      assert.ok(price.notes.includes(state.note));
      for (const item of card.items) assert.ok(price.notes.includes(item));
    }
  }
});

test('fresh source amounts and original whitespace are used without an embedded price table', () => {
  const input = pages();
  input[0].pricing_states[0].cards[0].price_text_original = 'от 9\u00a0876,50 Br';
  const price = parseServices(input).services[0].prices[0];
  assert.equal(price.price_min, 9876.5);
  assert.equal(price.price, null);
  assert.equal(price.price_text_original, 'от 9\u00a0876,50 Br');
});

test('a quote-only tariff has no prices rather than retaining previous amounts', () => {
  const input = pages();
  for (const state of input[0].pricing_states) state.cards[0].price_text_original = 'по запросу';
  const result = parseServices(input);
  assert.deepEqual(result.services[0].prices, []);
  assert.equal(result.services[1].prices.length, 5);
});

test('missing or duplicated selector states prevent publishing partial coverage', () => {
  const missing = pages();
  missing[0].pricing_states.pop();
  assert.throws(() => parseServices(missing), /selector state coverage/);
  const duplicate = pages();
  duplicate[0].pricing_states[1] = duplicate[0].pricing_states[0];
  assert.throws(() => parseServices(duplicate), /selector state coverage/);
});

test('missing cards and unrecognized price text fail extraction explicitly', () => {
  const missing = pages();
  missing[0].pricing_states[1].cards.pop();
  assert.throws(() => parseServices(missing), /Incomplete tariffs/);
  const invalid = pages();
  invalid[0].pricing_states[0].cards[0].price_text_original = 'Br — неизвестно';
  assert.throws(() => parseServices(invalid), /Unrecognized price/);
});

test('offline build validates both schemas and preserves contacts, materials and source evidence', async () => {
  const { comparison, harvest } = buildSite(pages(), '2026-10-26');
  await validateJson(comparison, `${repositoryRoot}/schema.json`);
  await validateJson(harvest, `${repositoryRoot}/schemas/site-harvest.schema.json`);
  assert.equal(comparison.company.name, 'Антикория');
  assert.equal(comparison.company.locations.length, 2);
  assert.equal(harvest.company.contacts.phones.length, 2);
  assert.equal(harvest.company.contacts.telegram, 'https://t.me/Antiikoriya_bot');
  assert.ok(harvest.materials.some((item) => /NHOU/.test(item.text)));
  assert.ok(harvest.materials.every((item) => item.verification === 'site_claim'));
  assert.ok(harvest.services[0].description.includes('Обработка днища и рамы'));
  assert.equal(
    harvest.services[0].completion_time.text_original,
    'Полный цикл обработки за один рабочий день',
  );
  assert.equal(harvest.pages[0].pricing_states.length, 5);
});

test('shared runner entry point remains byte-identical to the template', async () => {
  const [instance, template] = await Promise.all([
    readFile(new URL('../src/parse.js', import.meta.url), 'utf8'),
    readFile(`${repositoryRoot}/template/src/parse.js`, 'utf8'),
  ]);
  assert.equal(instance, template);
});
