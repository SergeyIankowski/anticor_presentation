import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateJson } from '@anticor/harvest-core';
import { buildSite, parseServices } from '../src/extract.js';

const original = JSON.parse(
  await readFile(new URL('./fixtures/homepage.json', import.meta.url), 'utf8'),
);
const pages = () => [structuredClone(original)];

test('live-page fixture builds both schema contracts and keeps source anchors', async () => {
  const input = pages();
  const { harvest, comparison } = buildSite(input, '2026-10-26');
  await validateJson(
    harvest,
    new URL('../../../schemas/site-harvest.schema.json', import.meta.url).pathname,
  );
  await validateJson(comparison, new URL('../../../schema.json', import.meta.url).pathname);
  assert.equal(comparison.company.name, 'ANTIKOR-MINSK');
  for (const service of comparison.services) {
    assert.equal(service.url, input[0].url);
    assert.equal(new URL(service.url).hash, '');
    assert.ok(input[0].text.includes(service.name_original));
  }
  assert.ok(
    harvest.materials.package_details.every((item) => item.description.includes('Noxudol')),
  );
});

test('models sharing option values remain separate qualified price rows', () => {
  const { services, vehicle_types } = parseServices(pages());
  assert.equal(vehicle_types.length, 3);
  assert.deepEqual(
    vehicle_types.slice(1).map((row) => row.name_original),
    ['Acura CL', 'Acura EL'],
  );
  for (const service of services.slice(0, 3)) {
    assert.equal(service.prices.length, 3);
    assert.notEqual(service.prices[1].vehicle_type_id, service.prices[2].vehicle_type_id);
    assert.equal(service.prices[1].price_min, service.prices[2].price_min);
    assert.ok(service.prices.every((price) => price.price === null && price.price_min !== null));
  }
});

test('reads current original text without stale-price fallback or discount arithmetic', () => {
  const input = pages();
  input[0].calculator.states[0].prices[0].price_text = 'от 987,50 BYN';
  const { services } = parseServices(input);
  assert.equal(services[0].prices[1].price_min, 987.5);
  assert.equal(services[0].prices[1].price_text_original, 'от 987,50 BYN');
  delete input[0].calculator.states[0].prices[0].price_text;
  assert.throws(() => parseServices(input), /Invalid live calculator price/);
});

test('missing calculator states and missing service source anchors fail closed', () => {
  const input = pages();
  input[0].calculator.states.pop();
  assert.throws(() => parseServices(input), /Incomplete calculator states/);
  const missingAnchor = pages();
  missingAnchor[0].calculator.initial[0].name = 'Not a source service';
  assert.throws(() => parseServices(missingAnchor), /source anchor/);
});

test('quote-only preparation and free nonnumeric assessment do not get invented amounts', () => {
  const { services } = parseServices(pages());
  assert.deepEqual(services.find((s) => s.id === 'surface-preparation').prices, []);
  assert.deepEqual(services.find((s) => s.id === 'assessment').prices, []);
  assert.match(services.find((s) => s.id === 'surface-preparation').description, /не входит/);
});
