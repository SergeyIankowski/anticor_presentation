import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { serviceGroups } from '../src/data/serviceGroups.ts';
import {
  groupServices,
  priceRows,
  serviceCoverage,
  shortServiceName,
  vehicleClasses,
} from '../src/lib/comparison.ts';
import { normalizePrice } from '../src/lib/prices.ts';
import type { Company, VehicleClass } from '../src/types.ts';
import { harvestedDomains, instancesDir } from './instances.ts';

const companies: Company[] = harvestedDomains().map((domain) => ({
  ...JSON.parse(readFileSync(new URL(`${domain}/parsed/company.json`, instancesDir), 'utf8')),
  domain,
}));
const groups = groupServices(companies, serviceGroups);
const rowFor = (vehicleClass: VehicleClass, id: string) => {
  const row = priceRows(groups, companies, vehicleClass).find((candidate) => candidate.id === id);
  assert.ok(row, `missing row ${id}`);
  return row;
};

test('normalizePrice handles exact, range, from and text-only prices', () => {
  assert.deepEqual(
    normalizePrice({ vehicle_type_id: 'v', price: 795, price_text_original: '795 BYN' }),
    {
      value: 795,
      isFrom: false,
      text: '795 BYN',
    },
  );
  assert.equal(
    normalizePrice({
      vehicle_type_id: 'v',
      price_min: 100,
      price_max: 200,
      price_text_original: '',
    }).value,
    150,
  );
  assert.deepEqual(
    normalizePrice({
      vehicle_type_id: 'v',
      price: null,
      price_min: 112,
      price_text_original: 'от 112',
    }),
    { value: 112, isFrom: true, text: 'от 112' },
  );
  const textOnly = normalizePrice({
    vehicle_type_id: 'v',
    price: null,
    price_min: null,
    price_text_original: 'от 141 (без рамы)',
  });
  assert.equal(textOnly.value, null);
  assert.equal(textOnly.text, 'от 141 (без рамы)');
});

test('full anticorrosion treatment is matched across KROWN and ETM', () => {
  const pair = companies.filter((company) => ['krown.by', 'etm.by'].includes(company.domain));
  const pairGroups = groupServices(pair, serviceGroups);
  const coverage = serviceCoverage(pairGroups, pair).find((row) => row.id === 'anticorrosion-full');
  assert.equal(coverage?.count, 2);

  const row = priceRows(pairGroups, pair, 'sedan').find(
    (candidate) => candidate.id === 'anticorrosion-full',
  );
  assert.ok(row);
  assert.equal(row.byCompany['etm.by'].offered, true);
  assert.equal(row.byCompany['etm.by'].status, 'no-price');
  assert.equal(row.byCompany['etm.by'].value, null);
  assert.equal(row.byCompany['krown.by'].value, (875 + 1050 + 875 + 1050) / 4);
  assert.equal(row.avg, row.byCompany['krown.by'].value);
  assert.equal(row.pricedCount, 1);
});

test('every KROWN service matches a mapping rule', () => {
  const unmatched = groups.filter((group) => group.id.startsWith('krown.by:'));
  assert.deepEqual(
    unmatched.map((group) => group.label),
    [],
  );
});

test('prices for all cars apply to every vehicle class', () => {
  for (const vehicleClass of ['small', 'sedan', 'van'] as const) {
    assert.equal(rowFor(vehicleClass, 'mats-wash').byCompany['krown.by'].value, 8);
  }
  assert.ok(vehicleClasses(companies).includes('sedan'));
  assert.ok(!vehicleClasses(companies).includes('any'));
});

test('shortServiceName drops appended descriptions and table headings', () => {
  assert.equal(
    shortServiceName('Мойка стекол и зеркал Изнутри и снаружи УБОРКА САЛОНА'),
    'Мойка стекол и зеркал Изнутри и снаружи',
  );
  assert.equal(shortServiceName('Озонирование салона (удаление запахов)'), 'Озонирование салона');
});

test('antikorr.by anticorrosion packages are not grouped with KROWN car-wash packages', () => {
  const pair = companies.filter((company) => ['krown.by', 'antikorr.by'].includes(company.domain));
  const pairGroups = groupServices(pair, serviceGroups);
  const byId = new Map(pairGroups.map((group) => [group.id, group]));
  assert.deepEqual([...(byId.get('wash-complex-1')?.services.keys() ?? [])], ['krown.by']);
  assert.deepEqual(
    [...(byId.get('anticorrosion-complex-1-dinitrol')?.services.keys() ?? [])],
    ['antikorr.by'],
  );
  assert.deepEqual([...(byId.get('underbody-wash')?.services.keys() ?? [])].sort(), [
    'antikorr.by',
    'krown.by',
  ]);
  assert.deepEqual(
    groups.filter((group) => group.id.startsWith('antikorr.by:')).map((group) => group.label),
    [],
  );
});

test('anticorrosion packages named "Стандарт" are not grouped with the KROWN car wash', () => {
  const service = (id: string, name: string) => ({
    domain: id,
    schema_version: '1.0',
    company: { name: id, website: `https://${id}/` },
    source: { scraped_at: '2026-10-26', urls: [] },
    currency: 'BYN',
    vehicle_types: [],
    services: [{ id: 's', category: 'anticorrosion' as const, name_original: name, prices: [] }],
  });
  const grouped = groupServices(
    [
      service('wash.by', 'Стандарт Двухфазная ручная мойка кузова'),
      service('a.by', 'Стандарт'),
      service('b.by', 'Стандарт комплекс (новые авто)'),
    ],
    serviceGroups,
  );
  assert.deepEqual(
    grouped.map((group) => group.id),
    ['wash-standard', 'a.by:s', 'b.by:s'],
  );
});

test('whole-car treatment is matched across differently named sites', () => {
  const names = [
    'Полная обработка',
    'Полный комплекс обработки',
    'Базовый полный комплекс',
    'КОМПЛЕКСНАЯ ОБРАБОТКА',
    'Комплексная защита автомобиля от коррозии',
    'АНТИКОРРОЗИЙНАЯ ОБРАБОТКА',
    'АНТИКОРРОЗИЙНАЯ ОБРАБОТКА АВТОМОБИЛЕЙ',
  ];
  for (const name of names) {
    assert.equal(
      serviceGroups.find((rule) => rule.match.test(name))?.id,
      'anticorrosion-full',
      name,
    );
  }
  assert.equal(
    serviceGroups.find((rule) => rule.match.test('Антикоррозийная обработка днища автомобиля'))?.id,
    'anticorrosion-underbody',
  );
});
