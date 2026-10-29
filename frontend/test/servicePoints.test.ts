import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Company, Location } from '../src/shared/api/harvest.ts';
import { servicePoints } from '../src/widgets/service-points/model/servicePoints.ts';

const company = (domain: string, locations?: Location[]): Company => ({
  domain,
  schema_version: '1.0',
  company: { name: domain, website: `https://${domain}/`, locations },
  source: { scraped_at: '2026-10-27', urls: [] },
  currency: 'BYN',
  vehicle_types: [],
  services: [],
});

test('service points are counted per company, most first, unknown when no address is listed', () => {
  const rows = servicePoints([
    company('none.by'),
    company('one.by', [{ city: 'Гродно', address: 'ул. Суворова 109' }]),
    company('two.by', [
      { city: 'Гомель', address: 'ул. Ильича, 1Б' },
      { city: 'Гомель', address: 'ул. Кирова, 123А' },
      { phones: ['+375'] },
    ]),
  ]);
  assert.deepEqual(
    rows.map((row) => [row.domain, row.count]),
    [
      ['two.by', 2],
      ['one.by', 1],
      ['none.by', null],
    ],
  );
  assert.deepEqual(rows[0].cities, ['Гомель']);
  assert.deepEqual(rows[2].addresses, []);
});
