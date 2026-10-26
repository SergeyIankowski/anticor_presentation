import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  createPresentation,
  localDate,
  parseMoney,
  publishOutputs,
  repositoryRoot,
  validateJson,
} from '../src/index.js';

test('price qualifiers, ranges, missing and ambiguous prices retain their meaning', () => {
  assert.equal(parseMoney('795 BYN').price, 795);
  assert.equal(parseMoney('1 050,00 BYN').price, 1050);
  assert.equal(parseMoney('от 112 BYN').price_min, 112);
  assert.equal(parseMoney('от 112 BYN').price, null);
  assert.equal(parseMoney('до 200 BYN').price_max, 200);
  assert.equal(parseMoney('до 200 BYN').price, null);
  assert.equal(parseMoney('80–100 BYN').price_max, 100);
  assert.equal(parseMoney('114 / 180 BYN').price_min, null);
  assert.equal(parseMoney('—').price, null);
});

test('retrieval dates use Minsk time at midnight boundaries', () => {
  assert.equal(localDate('2026-10-25T22:30:00Z'), '2026-10-26');
});

test('presentation preserves source metadata and arbitrary site fields', () => {
  const input = {
    metadata: { source_site: 'https://example.org/', retrieved_at: '2026-10-26', language: 'ru' },
    sources: [{ url: 'https://example.org/', used_for: ['company'] }],
    arbitrary: { a: [1, 'от 20'] },
  };
  const output = createPresentation(input);
  assert.deepEqual(output.content.arbitrary, input.arbitrary);
  assert.deepEqual(output.metadata, input.metadata);
  assert.deepEqual(output.sources, input.sources);
});

test('full JSON Schema validator rejects disallowed properties and invalid dates', async () => {
  const path = join(repositoryRoot, 'schema.json');
  const input = {
    schema_version: '1.0',
    company: { name: 'Example', website: 'https://example.org/' },
    source: { scraped_at: '2026-10-26', urls: ['https://example.org/'] },
    currency: 'BYN',
    vehicle_types: [],
    services: [],
  };
  await validateJson(input, path);
  await assert.rejects(
    validateJson({ ...input, extra: 'not allowed' }, path),
    /additional properties/,
  );
  await assert.rejects(
    validateJson({ ...input, source: { ...input.source, scraped_at: 'yesterday' } }, path),
    /format/,
  );
});

test('publishing preserves previous datasets in a run-specific history folder', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'harvest-output-'));
  try {
    await writeFile(join(folder, 'example.org.json'), '{"old":true}\n');
    await publishOutputs(
      folder,
      { 'example.org.json': { fresh: true }, 'parsed/presentation_data.json': { valid: true } },
      'fixture-run',
    );
    assert.deepEqual(JSON.parse(await readFile(join(folder, 'example.org.json'), 'utf8')), {
      fresh: true,
    });
    assert.deepEqual(
      JSON.parse(await readFile(join(folder, '.history/fixture-run/example.org.json'), 'utf8')),
      { old: true },
    );
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
