import type { CompanySheet, ParseReport } from '../../../shared/api/harvest.ts';
import { buildDataset } from '../model/dataset.ts';

// Every instances/<domain>/parsed/company.json is bundled, so a newly parsed site shows up
// without code changes.
const files = import.meta.glob<CompanySheet>('../../../../../instances/*/parsed/company.json', {
  eager: true,
  import: 'default',
});
const reportFiles = import.meta.glob<ParseReport>('../../../../../instances/*/parse-report.json', {
  eager: true,
  import: 'default',
});

export const { companies, excludedSites } = buildDataset(files, reportFiles);
