import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateInstances } from '../packages/harvest-core/src/validate.js';

// Validates the published JSON of every instance (or the domains given as arguments) without a
// live parse: `<domain>.json` against schemas/site-harvest.schema.json, `parsed/company.json`
// against schema.json, and the id references the schemas cannot express.
export async function runValidation(domains = []) {
  const results = await validateInstances(undefined, domains);
  for (const { domain, status, problems } of results) {
    console.log(`${status === 'valid' ? 'ok     ' : status.padEnd(7)} ${domain}`);
    for (const problem of problems) console.log(`         - ${problem}`);
  }
  const count = (status) => results.filter((result) => result.status === status).length;
  console.log(
    `\n${count('valid')} valid, ${count('invalid')} invalid, ${count('skipped')} skipped (no published files)`,
  );
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const domains = process.argv.slice(2);
  const results = await runValidation(domains);
  if (domains.length && !results.length) {
    console.error(`No instance matches: ${domains.join(', ')}`);
    process.exitCode = 1;
  } else if (results.some((result) => result.status === 'invalid')) process.exitCode = 1;
}
