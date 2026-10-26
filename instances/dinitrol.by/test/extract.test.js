import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { assertContent, buildSite, parseCompany, parseServices } from '../src/extract.js';
import site from '../src/site.js';

test('entry point remains identical to the template', async () => {
  const [actual, template] = await Promise.all([
    readFile(new URL('../src/parse.js', import.meta.url), 'utf8'),
    readFile(new URL('../../../template/src/parse.js', import.meta.url), 'utf8'),
  ]);
  assert.equal(actual, template);
});

test('HTTP and soft access errors cannot become company evidence', () => {
  assert.throws(() => assertContent([]), /no public content/);
  for (const page of [
    { url: site.baseUrl, status: 403, title: 'DINITROL', text: 'DINITROL' },
    { url: site.baseUrl, status: 200, title: '403 Forbidden', text: 'nginx' },
  ]) {
    assert.throws(() => parseCompany([page]), /access failure/);
    assert.throws(() => buildSite([page], '2026-10-26'), /access failure/);
  }
});

test('a generic heading cannot stand in for the customer identity', () => {
  assert.throws(
    () => parseCompany([{ url: site.baseUrl, text: 'Welcome', headings: [] }]),
    /company identity is absent/,
  );
});

test('restored access still requires verified service and price markup', () => {
  // Synthetic guard test only; this is not a saved website fixture.
  const pages = [{ url: site.baseUrl, status: 200, title: 'DINITROL', text: 'DINITROL' }];
  assert.equal(parseCompany(pages).name, 'DINITROL');
  assert.throws(() => parseServices(pages), /selectors remain unverified/);
  assert.throws(() => buildSite(pages, '2026-10-26'), /selectors remain unverified/);
  assert.equal(site.discover('/uslugi/', new URLSearchParams()), false);
});
