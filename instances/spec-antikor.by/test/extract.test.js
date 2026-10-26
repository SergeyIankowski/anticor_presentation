import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildSite, parseServices } from '../src/extract.js';

const source = JSON.parse(await readFile(new URL('./fixtures/home.json', import.meta.url), 'utf8'));
const pages = () => [structuredClone(source)];

test('live evidence preserves all brand/class prices and maps visible labels rather than codes', () => {
  const { services, vehicle_types } = parseServices(pages());
  assert.equal(services.length, 6);
  assert.equal(
    services.reduce((sum, service) => sum + service.prices.length, 0),
    36,
  );
  assert.deepEqual(
    vehicle_types.map((vehicle) => vehicle.class),
    ['small', 'sedan', 'crossover', 'minivan', 'suv', 'van'],
  );
  const ml = services.find((service) => service.id === 'complex-1');
  assert.equal(ml.prices.length, 12);
  assert.deepEqual(
    ml.prices.slice(0, 6).map((price) => price.price_min),
    [600, 650, 750, 750, 900, 900],
  );
  assert(
    ml.prices.every((price) => price.price === null && price.price_text_original.startsWith('от ')),
  );
  assert(ml.description.includes('DINITROL'));
  assert(ml.description.includes('Mercasol'));
  for (const service of services) {
    assert.equal(service.url, source.url);
    assert(source.text.replace(/\s+/g, ' ').includes(service.name_original));
  }
  assert(
    services
      .filter((service) => service.category === 'additional')
      .every((service) => !service.prices.length),
  );
});

test('amounts come from current calculator evidence and retain qualifiers', () => {
  const input = pages();
  input[0].calculator.states[0].packages[0].price_text_original = 'от 1 234,50';
  const { services } = parseServices(input);
  assert.equal(services[0].prices[0].price_min, 1234.5);
  assert.equal(services[0].prices[0].price_text_original, 'от 1 234,50');
});

test('incomplete state matrix and absent numeric prices prevent publication', () => {
  const input = pages();
  input[0].calculator.states.pop();
  assert.throws(() => parseServices(input), /Incomplete calculator/);
  const noPrice = pages();
  noPrice[0].calculator.states[0].packages[0].price_text_original = '';
  assert.throws(() => parseServices(noPrice), /Unrecognized calculator price/);
});

test('company, legal details, materials, technology and claims retain source evidence', () => {
  const { harvest, comparison } = buildSite(pages(), '2026-10-26');
  assert.equal(comparison.company.name, 'Спец Антикор');
  assert.equal(comparison.company.locations[0].city, 'Брест');
  assert.deepEqual(harvest.company.contacts.phones, ['+375 (33) 342-0-341']);
  assert(harvest.company.legal_statement.includes('291854857'));
  assert.equal(harvest.materials.length, 4);
  assert.equal(harvest.technology.length, 8);
  assert(harvest.site_claims.some((claim) => /гарантия до 5 лет/.test(claim.text)));
  assert.equal(harvest.pricing_evidence.currency_inferred, true);
  assert.equal(harvest.pricing_evidence.unit_original, null);
});
