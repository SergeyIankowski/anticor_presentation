import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

export const instancesDir = new URL('../../instances/', import.meta.url);

// Match the app's company.json glob, while requiring an honest failed-run report for
// instances that could not publish. Unfinished or accidentally deleted datasets still fail.
export function harvestedDomains(directory: URL = instancesDir): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((domain) => {
      if (existsSync(new URL(`${domain}/parsed/company.json`, directory))) return true;
      const report = JSON.parse(
        readFileSync(new URL(`${domain}/parse-report.json`, directory), 'utf8'),
      );
      assert.equal(report.status, 'failed', `${domain}: missing company.json without a failed run`);
      assert.equal(report.published, false, `${domain}: published dataset is missing`);
      assert.ok(report.failures?.length, `${domain}: failed run has no recorded cause`);
      return false;
    })
    .sort();
}
