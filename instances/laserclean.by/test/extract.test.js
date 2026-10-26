import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { validateJson } from '@anticor/harvest-core';
import { buildSite, parseServices } from '../src/extract.js';

// Captured from the public homepage by the shared Playwright runner on 2026-10-26.
const fixture = JSON.parse(await readFile(new URL('./fixtures/homepage.json', import.meta.url)));
const makePage = () => structuredClone(fixture);

test('unpriced services stay unpriced despite model numbers, product codes and laser power', () => {
  const { comparison, harvest } = buildSite([makePage()], '2026-10-26');
  assert.equal(comparison.services.length, 2);
  assert.deepEqual(comparison.vehicle_types, []);
  for (const service of comparison.services) {
    assert.deepEqual(service.prices, []);
    assert.equal(service.url, fixture.url);
    assert.equal(new URL(service.url).hash, '');
    assert.ok(fixture.text.includes(service.name_original));
  }
  assert.equal(comparison.services[0].completion_time.unit, 'days');
  assert.equal(comparison.services[1].completion_time, null);
  assert.equal(harvest.vehicle_examples.length, 4);
  assert.ok(harvest.company.offers[0].text.includes('бесплатную'));
});

test('preserves contacts, all process stages, materials and separately attributed claims', () => {
  const { comparison, harvest } = buildSite([makePage()], '2026-10-26');
  assert.equal(comparison.company.name, 'Laserclean');
  assert.deepEqual(comparison.company.locations, [
    { city: 'Гродно', address: 'ул. Суворова 109', phones: ['+375297892771'] },
  ]);
  assert.equal(harvest.technology.length, 12);
  assert.deepEqual(
    harvest.materials.map((item) => item.name),
    [
      'DINITROL LT',
      'DINITROL ML',
      'DINITROL 4941',
      'DINITROL 81',
      'Brunox',
      'эпоксидного грунта',
      'DINITROL AUTO CLEANER',
      'Активная пена',
    ],
  );
  assert.ok(harvest.site_claims.some((claim) => claim.text.includes('видеосъемкой')));
  for (const evidence of [...harvest.materials, ...harvest.technology, ...harvest.site_claims]) {
    assert.equal(evidence.source_url, fixture.url);
    assert.equal(evidence.verification, 'site_claim');
  }
  assert.equal(harvest.pages[0].laserclean.rotating_labels.length, 3);
});

test('requires complete process and service evidence instead of silently publishing omissions', () => {
  const missingStage = makePage();
  missingStage.laserclean.process.shift();
  assert.throws(() => parseServices([missingStage]), /process changed/);
  const missingService = makePage();
  missingService.laserclean.rotating_labels = [];
  assert.throws(() => parseServices([missingService]), /service labels are missing/);
});

test('a newly published monetary price requires a pricing implementation review', () => {
  const page = makePage();
  page.text += '\nАнтикоррозийная обработка от 123,45 руб.';
  assert.throws(() => parseServices([page]), /New monetary tariff detected/);
});

test('turnaround remains unknown if the one-day site statement is removed', () => {
  const page = makePage();
  page.laserclean.benefits = page.laserclean.benefits.filter(
    (item) => !item.text.includes('через сутки'),
  );
  assert.equal(parseServices([page]).services[0].completion_time, null);
});

test('harvest and comparison satisfy the unchanged repository contracts', async () => {
  const { comparison, harvest } = buildSite([makePage()], '2026-10-26');
  await validateJson(comparison, new URL('../../../schema.json', import.meta.url));
  await validateJson(
    harvest,
    new URL('../../../schemas/site-harvest.schema.json', import.meta.url),
  );
});
