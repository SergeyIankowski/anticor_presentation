import { access, readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export async function validateJson(value, schemaPath) {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(JSON.parse(await readFile(schemaPath, 'utf8')));
  if (!validate(value))
    throw new Error(
      `Schema validation failed (${schemaPath}): ${ajv.errorsText(validate.errors, { separator: '; ' })}`,
    );
}

const duplicates = (values) => values.filter((value, index) => values.indexOf(value) !== index);

// Checks the JSON schema cannot express: unique local ids and price -> vehicle type references.
export function checkReferences(company) {
  const problems = [];
  const vehicleIds = company.vehicle_types.map((vehicle) => vehicle.id);
  const serviceIds = company.services.map((service) => service.id);
  for (const id of new Set(duplicates(vehicleIds)))
    problems.push(`duplicate vehicle type id: ${id}`);
  for (const id of new Set(duplicates(serviceIds))) problems.push(`duplicate service id: ${id}`);
  const known = new Set(vehicleIds);
  for (const service of company.services)
    for (const price of service.prices)
      if (!known.has(price.vehicle_type_id))
        problems.push(
          `service ${service.id}: price refers to unknown vehicle type ${price.vehicle_type_id}`,
        );
  return problems;
}

const exists = (path) =>
  access(path).then(
    () => true,
    () => false,
  );

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

// Validates the published files of one instance folder: `<domain>.json` against the harvest schema
// and `parsed/company.json` against the root comparison schema, plus id references. An instance
// with neither file (a blocked site) is reported as skipped, not failed.
export async function validateInstance(directory, domain, schemaRoot = repositoryRoot) {
  const harvestPath = join(directory, `${domain}.json`);
  const companyPath = join(directory, 'parsed/company.json');
  const [hasHarvest, hasCompany] = await Promise.all([exists(harvestPath), exists(companyPath)]);
  if (!hasHarvest && !hasCompany) return { domain, status: 'skipped', problems: [] };
  const problems = [];
  const check = async (label, path, schema, extra) => {
    let value;
    try {
      value = await readJson(path);
      await validateJson(value, join(schemaRoot, schema));
    } catch (error) {
      problems.push(`${label}: ${error.message}`);
    }
    if (value === undefined) return;
    try {
      problems.push(...(extra?.(value) ?? []).map((problem) => `${label}: ${problem}`));
    } catch (error) {
      problems.push(`${label}: reference check failed: ${error.message}`);
    }
  };
  if (hasHarvest) await check(`${domain}.json`, harvestPath, 'schemas/site-harvest.schema.json');
  else problems.push(`${domain}.json: missing`);
  if (hasCompany) await check('parsed/company.json', companyPath, 'schema.json', checkReferences);
  else problems.push('parsed/company.json: missing');
  return { domain, status: problems.length ? 'invalid' : 'valid', problems };
}

export async function validateInstances(
  instancesDir = join(repositoryRoot, 'instances'),
  domains = [],
  schemaRoot = repositoryRoot,
) {
  const names = (await readdir(instancesDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !domains.length || domains.includes(name))
    .sort();
  const results = [];
  for (const name of names)
    results.push(await validateInstance(join(instancesDir, name), name, schemaRoot));
  return results;
}
