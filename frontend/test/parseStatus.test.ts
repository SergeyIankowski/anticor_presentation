import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasParseErrors } from '../src/lib/parseStatus.ts';

test('only complete parses without page failures are error-free', () => {
  assert.equal(hasParseErrors({ status: 'complete', failures: [] }), false);
  assert.equal(hasParseErrors(undefined), false);
  assert.equal(
    hasParseErrors({ status: 'partial', failures: [{ url: 'https://x.by/', error: 'HTTP 404' }] }),
    true,
  );
  assert.equal(hasParseErrors({ status: 'failed', failures: [] }), true);
  assert.equal(
    hasParseErrors({ status: 'complete', failures: [{ url: 'https://x.by/', error: 'HTTP 404' }] }),
    true,
  );
});
