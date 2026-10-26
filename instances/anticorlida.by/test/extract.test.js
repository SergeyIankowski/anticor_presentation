import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { repositoryRoot, validateJson } from '@anticor/harvest-core';
import { buildSite, parseServices } from '../src/extract.js';

const fixture = JSON.parse(
  await readFile(new URL('./fixtures/home.json', import.meta.url), 'utf8'),
);
const pages = () => [structuredClone(fixture)];

test('live fixture preserves offers, included scope, free wording, contacts and claims', () => {
  const { harvest, comparison } = buildSite(pages(), '2026-10-26');
  assert.equal(comparison.company.name, 'ИП Бунжа О.Я.');
  assert.equal(comparison.company.locations[0].city, 'Лида');
  assert.deepEqual(comparison.company.locations[0].phones, ['+375 29 677 50 00']);
  assert.equal(harvest.company.registration_number, '591398902');
  assert.equal(comparison.services.length, 2);
  assert.match(comparison.services[1].name_original, /бесплатно/u);
  assert.ok(comparison.services.every((service) => service.prices.length === 0));
  assert.deepEqual(comparison.vehicle_types, []);
  assert.equal(harvest.treatment_scope.length, 5);
  assert.equal(harvest.technology.length, 6);
  assert.match(harvest.technology[2].description, /DETAIL.*2800 Вт/u);
  assert.equal(harvest.materials.length, 1);
  assert.ok(
    harvest.site_claims.some((claim) => /гарантию на выполненные услуги/u.test(claim.text)),
  );
  assert.ok(harvest.site_claims.every((claim) => claim.verification === 'site_claim'));
  for (const service of comparison.services) {
    assert.equal(service.url, fixture.url);
    assert.ok(fixture.text.includes(service.name_original));
  }
});

test('absent source headings and missing enrichment fail instead of fabricating services', () => {
  const input = pages();
  input[0].text = 'Page without an offer';
  assert.throws(() => parseServices(input), /Missing source service heading/);
  assert.throws(() => buildSite([], '2026-10-26'), /No enriched/);
  const incomplete = pages();
  incomplete[0].anticorlida.scope = [];
  assert.throws(() => parseServices(incomplete), /Missing treatment/);
});

test('new numeric pricing or selectors cannot silently publish empty prices', () => {
  const numeric = pages();
  numeric[0].text += '\nот 123 руб.';
  assert.throws(() => parseServices(numeric), /New pricing markup/);
  const controls = pages();
  controls[0].anticorlida.price_controls = 1;
  assert.throws(() => parseServices(controls), /New pricing markup/);
});

test('service URLs strip home anchors and preserve exact source names', () => {
  const input = pages();
  input[0].url += '#uslugi';
  const { services } = parseServices(input);
  assert.ok(services.every((service) => service.url === fixture.url));
});

test('harvest and comparison satisfy unmodified repository schemas', async () => {
  const { harvest, comparison } = buildSite(pages(), '2026-10-26');
  await validateJson(harvest, `${repositoryRoot}/schemas/site-harvest.schema.json`);
  await validateJson(comparison, `${repositoryRoot}/schema.json`);
});
