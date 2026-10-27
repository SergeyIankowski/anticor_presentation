import assert from 'node:assert/strict';
import { test } from 'node:test';
import { companiesLabel } from '../src/lib/plural.ts';

test('companiesLabel uses Russian plural forms', () => {
  assert.equal(companiesLabel(1), '1 компания');
  assert.equal(companiesLabel(3), '3 компании');
  assert.equal(companiesLabel(5), '5 компаний');
  assert.equal(companiesLabel(11), '11 компаний');
  assert.equal(companiesLabel(14), '14 компаний');
  assert.equal(companiesLabel(21), '21 компания');
  assert.equal(companiesLabel(22), '22 компании');
});
