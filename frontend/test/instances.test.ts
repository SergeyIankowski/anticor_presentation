import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { harvestedDomains } from './instances.ts';

test('dataset discovery accepts recorded crawl failures but rejects missing published data', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harvest-discovery-'));
  const directory = pathToFileURL(`${root}/`);
  try {
    await mkdir(join(root, 'ready.by/parsed'), { recursive: true });
    await writeFile(join(root, 'ready.by/parsed/company.json'), '{}');
    await mkdir(join(root, 'unavailable.by'));
    const reportPath = join(root, 'unavailable.by/parse-report.json');
    await writeFile(
      reportPath,
      JSON.stringify({ status: 'failed', published: false, failures: [{ error: 'HTTP 503' }] }),
    );
    assert.deepEqual(harvestedDomains(directory), ['ready.by']);
    await writeFile(
      reportPath,
      JSON.stringify({ status: 'complete', published: true, failures: [] }),
    );
    assert.throws(() => harvestedDomains(directory), /without a failed run/);
    await writeFile(
      reportPath,
      JSON.stringify({ status: 'failed', published: false, failures: [] }),
    );
    assert.throws(() => harvestedDomains(directory), /no recorded cause/);
    await rm(reportPath);
    assert.throws(() => harvestedDomains(directory), /ENOENT/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
