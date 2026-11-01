import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { checkReferences, validateInstances } from '../../packages/harvest-core/src/validate.js';

const company = {
  schema_version: '1.0',
  company: { name: 'Example', website: 'https://example.com/' },
  source: { scraped_at: '2026-01-01', urls: ['https://example.com/'] },
  currency: 'BYN',
  vehicle_types: [{ id: 'v1', name_original: 'Sedan', class: 'sedan' }],
  services: [
    {
      id: 's1',
      category: 'anticorrosion',
      name_original: 'Full',
      prices: [{ vehicle_type_id: 'v1', price: 500, price_text_original: '500 BYN' }],
    },
  ],
};
const harvest = {
  metadata: { source_site: 'https://example.com/', brand: 'Example', retrieved_at: '2026-01-01' },
  company: {},
  services: [{}],
  pages: [{}],
  sources: [{ url: 'https://example.com/' }],
};

async function writeInstance(root, domain, files) {
  for (const [name, data] of Object.entries(files)) {
    const path = join(root, 'instances', domain, name);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(data));
  }
}

test('checkReferences reports duplicate ids and unknown vehicle references', () => {
  assert.deepEqual(checkReferences(company), []);
  const broken = structuredClone(company);
  broken.vehicle_types.push({ id: 'v1', name_original: 'Again', class: 'any' });
  broken.services.push({
    ...broken.services[0],
    prices: [{ ...broken.services[0].prices[0], vehicle_type_id: 'gone' }],
  });
  assert.deepEqual(checkReferences(broken), [
    'duplicate vehicle type id: v1',
    'duplicate service id: s1',
    'service s1: price refers to unknown vehicle type gone',
  ]);
});

test('validateInstances separates valid, invalid and skipped instances', async () => {
  const root = await mkdtemp(join(tmpdir(), 'validate-instances-'));
  try {
    await writeInstance(root, 'good.example', {
      'good.example.json': harvest,
      'parsed/company.json': company,
    });
    await writeInstance(root, 'bad.example', {
      'bad.example.json': { metadata: harvest.metadata },
      'parsed/company.json': { ...company, currency: 5 },
    });
    await writeInstance(root, 'half.example', { 'parsed/company.json': company });
    await writeInstance(root, 'blocked.example', { 'parse-report.json': { status: 'failed' } });
    const results = await validateInstances(join(root, 'instances'));
    const byDomain = Object.fromEntries(results.map((result) => [result.domain, result]));
    assert.equal(byDomain['good.example'].status, 'valid');
    assert.equal(byDomain['blocked.example'].status, 'skipped');
    assert.equal(byDomain['bad.example'].status, 'invalid');
    assert.equal(byDomain['bad.example'].problems.length, 2);
    assert.deepEqual(byDomain['half.example'].problems, ['half.example.json: missing']);
    const only = await validateInstances(join(root, 'instances'), ['good.example']);
    assert.deepEqual(
      only.map((result) => result.domain),
      ['good.example'],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('every published instance in the repository passes its schemas', async () => {
  const results = await validateInstances();
  const invalid = results.filter((result) => result.status === 'invalid');
  assert.deepEqual(invalid, []);
  assert.ok(results.some((result) => result.status === 'valid'));
});
