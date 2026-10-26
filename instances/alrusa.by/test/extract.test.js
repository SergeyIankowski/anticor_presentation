import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { clean, repositoryRoot, validateJson } from '@anticor/harvest-core';
import {
  buildSite,
  parsePeriod,
  parseRubles,
  parseSchedules,
  parseServices,
  selectSchedule,
} from '../src/extract.js';

const outputRoot = process.env.ALRUSA_OUTPUT_DIR
  ? pathToFileURL(`${resolve(process.env.ALRUSA_OUTPUT_DIR)}/`)
  : new URL('../', import.meta.url);
const harvest = JSON.parse(await readFile(new URL('alrusa.by.json', outputRoot), 'utf8'));
const published = JSON.parse(await readFile(new URL('parsed/company.json', outputRoot), 'utf8'));
const home = harvest.pages.find((page) => new URL(page.url).pathname === '/');

test('qualified ruble prices retain exact/range/from semantics and original units', () => {
  assert.equal(parseRubles('123 руб.').price, 123);
  assert.deepEqual(parseRubles('от 123 до 456 рублей'), {
    price: null,
    price_min: 123,
    price_max: 456,
    price_text_original: 'от 123 до 456 рублей',
  });
  assert.equal(parseRubles('от 123 руб.').price, null);
  assert.equal(parseRubles('от 123 руб.').price_min, 123);
  assert.throws(() => parseRubles('Цена договорная'), /Missing public ruble amount/);
});

test('price headings are paired by visible column, independent of DOM order', () => {
  const original = parseSchedules(home);
  const reversed = parseSchedules({ ...home, text_blocks: [...home.text_blocks].reverse() });
  const normalized = (schedules) => schedules.map((item) => [item.label, item.rows]).sort();
  assert.deepEqual(normalized(reversed), normalized(original));
  assert.equal(original.length, 2);
  for (const schedule of original) assert.equal(schedule.rows.length, 8);
  const missing = {
    ...home,
    text_blocks: home.text_blocks.filter((block) => !clean(block.text).startsWith('Стоимость до')),
  };
  assert.throws(() => parseSchedules(missing), /missing or ambiguous/);
});

test('validity boundaries select the dated current column and reject expired prices', () => {
  const schedules = parseSchedules(home);
  assert.equal(selectSchedule(schedules, '2026-08-31').valid_before, '2026-09-01');
  assert.equal(selectSchedule(schedules, '2026-09-01').valid_from, '2026-09-01');
  assert.equal(selectSchedule(schedules, '2026-12-31').valid_through, '2026-12-31');
  assert.equal(selectSchedule(schedules, '2027-01-01'), null);
  assert.throws(() => parsePeriod('Стоимость без даты'), /Unrecognized price validity/);
  const historical = schedules.find((schedule) => schedule.valid_before);
  assert.throws(() => selectSchedule([historical, historical], '2026-08-31'), /Overlapping/);
  const expired = parseServices(harvest.pages, '2027-01-01');
  for (const id of ['full-treatment', 'home-blasting', 'home-disassembly']) {
    assert.deepEqual(expired.services.find((item) => item.id === id).prices, []);
  }
});

test('amounts are read from the current live evidence, rather than fixed in code', () => {
  const pages = structuredClone(harvest.pages);
  const changedHome = pages.find((page) => page.url === home.url);
  const current = selectSchedule(parseSchedules(changedHome), harvest.metadata.retrieved_at);
  const column = changedHome.text_blocks.find(
    (block) => block.selector === current.source_selector,
  );
  column.text = column.text.replace(/(Полная обработка\s*-\s*)\d+/u, '$1123');
  const changed = parseServices(pages, harvest.metadata.retrieved_at);
  assert.equal(changed.services.find((item) => item.id === 'full-treatment').prices[0].price, 123);
});

test('quote services, conflicting source offers and all diagnostic variants survive', () => {
  const result = parseServices(harvest.pages, harvest.metadata.retrieved_at);
  assert.equal(result.services.length, 15);
  for (const id of [
    'lower-treatment',
    'premium-commercial',
    'running-gear',
    'welding-1',
    'welding-2',
    'welding-3',
    'welding-4',
  ]) {
    assert.deepEqual(result.services.find((service) => service.id === id).prices, []);
  }
  const offers = result.services.filter((item) =>
    ['home-blasting', 'sand-blasting'].includes(item.id),
  );
  assert.equal(new Set(offers.map((item) => item.url)).size, 2);
  assert.notEqual(offers[0].prices[0].price_min, offers[1].prices[0].price_min);
  const diagnostics = result.services.filter((item) => item.id.startsWith('diagnostics-'));
  assert.equal(diagnostics.length, 2);
  assert.ok(diagnostics.every((item) => item.completion_time.unit === 'minutes'));
});

test('comparison rebuild is deterministic, schema-valid and fully anchored to harvested pages', async () => {
  const rebuilt = buildSite(harvest.pages, harvest.metadata.retrieved_at);
  assert.deepEqual(rebuilt.comparison, published);
  await validateJson(rebuilt.comparison, `${repositoryRoot}/schema.json`);
  await validateJson(rebuilt.harvest, `${repositoryRoot}/schemas/site-harvest.schema.json`);
  const vehicles = new Set(rebuilt.comparison.vehicle_types.map((item) => item.id));
  for (const service of rebuilt.comparison.services) {
    assert.equal(new URL(service.url).hash, '');
    const page = harvest.pages.find((item) => item.url === service.url);
    assert.ok(page, service.url);
    assert.ok(clean(page.text).includes(service.name_original), service.name_original);
    for (const price of service.prices) {
      assert.ok(vehicles.has(price.vehicle_type_id));
      assert.ok(clean(page.text).includes(price.price_text_original));
    }
  }
});
