import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateJson } from '@anticor/harvest-core';
import { buildSite, parseCompany, parseServices } from '../src/extract.js';

const fixture = JSON.parse(
  await readFile(new URL('./fixtures/home.json', import.meta.url), 'utf8'),
);
const fresh = () => structuredClone(fixture);

test('live fixture yields six sourced quote-only services without invented vehicle classes', () => {
  const { harvest, comparison } = buildSite([fresh()], '2026-10-26');
  assert.equal(comparison.services.length, 6);
  assert.deepEqual(comparison.vehicle_types, []);
  for (const service of comparison.services) {
    assert.deepEqual(service.prices, []);
    assert.equal(service.url, fixture.url);
    assert.equal(new URL(service.url).hash, '');
    assert.ok(fixture.text.includes(service.name_original));
    assert.equal(service.completion_time, null);
  }
  // A conditional promise to replenish coating is not a zero-price annual service.
  assert.match(comparison.services[5].description, /бесплатное восполнение/);
  assert.match(harvest.faq[1].answer, /за дополнительную плату/);
  assert.match(comparison.source.notes, /удаление коррозии не входит/);
  assert.match(comparison.source.notes, /нет цен и обозначения валюты/);
});

test('company comes from live JSON-LD and preserves the single Bobruisk location', () => {
  const result = buildSite([fresh()], '2026-10-26');
  assert.equal(result.comparison.company.name, 'ANTICOR');
  assert.deepEqual(result.comparison.company.locations, [
    {
      city: 'Бобруйск',
      address: 'ул. Димитрова, 4в',
      phones: ['+375291772255'],
    },
  ]);
  assert.equal(result.harvest.company.legal_name, 'ИП Козицкий Виталий Николаевич');
  assert.deepEqual(result.harvest.company.contacts.emails, ['Carclinic.bobr@gmail.com']);
  const page = fresh();
  page.structured_data = [];
  assert.throws(() => parseCompany([page]), /identity\/address/);
});

test('retains material names, all technology steps and mismatched source copy', () => {
  const { harvest, comparison } = buildSite([fresh()], '2026-10-26');
  assert.equal(harvest.technology.length, 6);
  assert.equal(harvest.faq.length, 5);
  assert.deepEqual(
    harvest.materials.map((material) => material.name_original),
    ['DINITROL', 'Dinitrol ML', 'Dinitrol LT'],
  );
  assert.match(comparison.services[3].description, /подкапотном пространстве/);
  assert.match(comparison.source.notes, /без исправлений/);
  assert.ok(harvest.site_claims.every((claim) => claim.verification === 'site_claim'));
});

test('does not invent services when the live service section is missing', () => {
  const page = fresh();
  page.anti_kor_evidence.service_cards = [];
  assert.throws(() => parseServices([page]), /No live service cards/);
  assert.throws(() => parseServices([]), /evidence was not collected/);
});

test('rejects service names missing from actual source text', () => {
  const page = fresh();
  page.anti_kor_evidence.service_cards[0].name = 'Unsourced service';
  assert.throws(() => parseServices([page]), /absent from source page text/);
});

test('rejects incomplete or incorrectly associated enquiry states', () => {
  const page = fresh();
  page.anti_kor_evidence.enquiry_forms.pop();
  assert.throws(() => parseServices([page]), /Not every service/);
  const wrongOrder = fresh();
  wrongOrder.anti_kor_evidence.enquiry_forms.reverse();
  assert.throws(() => parseServices([wrongOrder]), /out of order/);
});

test('a future monetary amount cannot silently become an empty quote-only price', () => {
  for (const amount of ['от 810 руб.', '950 BYN', '120–180 руб.']) {
    const page = fresh();
    page.anti_kor_evidence.enquiry_forms[0].text_original += ` ${amount}`;
    assert.throws(() => parseServices([page]), /monetary amount appeared/);
  }
});

test('full harvest and strict comparison validate against the unchanged root contracts', async () => {
  const { harvest, comparison } = buildSite([fresh()], '2026-10-26');
  await validateJson(
    harvest,
    fileURLToPath(new URL('../../../schemas/site-harvest.schema.json', import.meta.url)),
  );
  await validateJson(comparison, fileURLToPath(new URL('../../../schema.json', import.meta.url)));
});
