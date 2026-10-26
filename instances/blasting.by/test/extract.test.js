import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { repositoryRoot, validateJson } from '@anticor/harvest-core';
import { buildSite, parseCompany, parseContacts, parseServices } from '../src/extract.js';
import site from '../src/site.js';

const home = JSON.parse(await readFile(new URL('./fixtures/home.json', import.meta.url), 'utf8'));
const pages = [home];

test('extracts all live offerings with source anchors and no invented amounts', () => {
  const { services, vehicle_types, warnings } = parseServices(pages);
  assert.deepEqual(
    services.map((service) => service.id),
    ['anticorrosion', 'sandblasting', 'arc-zinc-spraying', 'conditional-welding'],
  );
  for (const service of services) {
    assert.ok(home.text.replace(/\s+/g, ' ').includes(service.name_original));
    assert.equal(service.url, home.url);
    assert.equal(new URL(service.url).hash, '');
    assert.deepEqual(service.prices, []);
    assert.equal(service.completion_time, null);
  }
  assert.deepEqual(vehicle_types, []);
  assert.ok(warnings.some((warning) => warning.includes('Currency is not stated')));
  assert.match(services[3].description, /В случае сквозной коррозии/);
});

test('retains odd phone grouping while normalizing the actual Belarus number', () => {
  const contacts = parseContacts(pages);
  assert.deepEqual(contacts.phones, ['+375293040041']);
  assert.deepEqual(contacts.phones_original, ['+375 29-3 040-041']);
  assert.deepEqual(contacts.emails, []);
  const company = parseCompany(pages);
  assert.equal(company.name, 'Blasting.by');
  assert.equal(company.locations[0].address, 'г.Могилев пер. Гаражный 11');
  assert.equal(company.locations[0].working_hours, 'ПН-Сб: 9 до 17');
});

test('does not interpret working hours, phone numbers or process step numbers as prices', () => {
  assert.equal(parseServices(pages).services.flatMap((service) => service.prices).length, 0);
});

test('fails on new monetary text instead of publishing incomplete price data', () => {
  const changed = structuredClone(home);
  changed.text += '\nАнтикоррозийная обработка от 999 руб.';
  assert.throws(() => parseServices([changed]), /New monetary text detected/);
});

test('requires live service evidence and refuses names absent from the page', () => {
  assert.throws(() => parseServices([]), /Missing live homepage/);
  const changed = structuredClone(home);
  changed.blasting.overview.name = 'Unsupported service';
  assert.throws(() => parseServices([changed]), /Service name missing from source/);
});

test('requires inspection of every state when new interactive controls appear', () => {
  const changed = structuredClone(home);
  changed.blasting.interaction_controls.push({ tag: 'SELECT', text: 'Vehicle category' });
  assert.throws(() => parseServices([changed]), /inspect every state/);
});

test('preserves technology, materials, quote conditions and source-qualified claims', async () => {
  const { harvest, comparison } = buildSite(pages, '2026-10-26');
  assert.equal(harvest.technology.length, 4);
  assert.ok(harvest.materials.some((item) => /OSU-Hessler/.test(item.text)));
  assert.ok(harvest.materials.some((item) => /антигравийных/.test(item.text)));
  assert.ok(harvest.site_claims.some((claim) => /БЕСПЛАТНЫЙ ОСМОТР/.test(claim.text)));
  assert.equal(harvest.price_conditions[0].text, 'ОБОЗНАЧАЕМ ТОЧНУЮ ЦЕНУ И СРОКИ');
  assert.ok(harvest.site_claims.every((claim) => claim.verification === 'site_claim'));
  await validateJson(harvest, `${repositoryRoot}/schemas/site-harvest.schema.json`);
  await validateJson(comparison, `${repositoryRoot}/schema.json`);
});

test('limits discovery to observed public page routes', () => {
  assert.ok(site.discover('/contact/', new URLSearchParams()));
  assert.equal(site.discover('/wp-admin/', new URLSearchParams()), false);
  assert.equal(site.discover('/', new URLSearchParams('s=price')), false);
});
