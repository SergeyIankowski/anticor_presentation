import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDataset } from '../src/entities/company/model/dataset.ts';
import type { CompanySheet } from '../src/shared/api/harvest.ts';

const sheet = (name: string): CompanySheet => ({
  schema_version: '1.0',
  company: { name, website: 'https://example.by/' },
  source: { scraped_at: '2026-10-27', urls: [] },
  currency: 'BYN',
  vehicle_types: [],
  services: [],
});

test('companies with parse errors are left out and listed with the reason', () => {
  const { companies, excludedSites } = buildDataset(
    {
      '../../instances/b.by/parsed/company.json': sheet('Б'),
      '../../instances/a.by/parsed/company.json': sheet('А'),
      '../../instances/c.by/parsed/company.json': sheet('В'),
    },
    {
      '../../instances/a.by/parse-report.json': { status: 'complete', failures: [] },
      '../../instances/b.by/parse-report.json': {
        status: 'partial',
        failures: [{ url: 'https://b.by/', error: 'HTTP 404' }],
      },
      '../../instances/d.by/parse-report.json': { status: 'failed' },
    },
  );
  assert.deepEqual(
    companies.map((company) => company.domain),
    ['a.by', 'c.by'],
  );
  assert.deepEqual(excludedSites, [
    { domain: 'b.by', name: 'Б', status: 'partial', failureCount: 1 },
    { domain: 'd.by', name: 'd.by', status: 'failed', failureCount: 0 },
  ]);
});
