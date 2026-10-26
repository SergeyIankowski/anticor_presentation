import type { Company, CompanySheet } from '../types.ts';

// Every instances/<domain>/parsed/company.json is bundled, so a newly parsed site shows up
// without code changes.
const files = import.meta.glob<CompanySheet>('../../../instances/*/parsed/company.json', {
  eager: true,
  import: 'default',
});

export const companies: Company[] = Object.entries(files)
  .map(([path, company]) => ({ ...company, domain: path.split('/').at(-3) ?? path }))
  .sort((a, b) => a.domain.localeCompare(b.domain));
