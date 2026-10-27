import { hasParseErrors, type ParseReport } from '../lib/parseStatus.ts';
import type { Company, CompanySheet } from '../types.ts';

// Every instances/<domain>/parsed/company.json is bundled, so a newly parsed site shows up
// without code changes.
const files = import.meta.glob<CompanySheet>('../../../instances/*/parsed/company.json', {
  eager: true,
  import: 'default',
});
const reportFiles = import.meta.glob<ParseReport>('../../../instances/*/parse-report.json', {
  eager: true,
  import: 'default',
});

const reports = new Map(
  Object.entries(reportFiles).map(([path, report]) => [path.split('/').at(-2) ?? path, report]),
);
const harvested: Company[] = Object.entries(files)
  .map(([path, company]) => ({ ...company, domain: path.split('/').at(-3) ?? path }))
  .sort((a, b) => a.domain.localeCompare(b.domain));

// Companies whose last parse completed without errors.
export const companies = harvested.filter(
  (company) => !hasParseErrors(reports.get(company.domain)),
);

export interface ExcludedSite {
  domain: string;
  name: string;
  status: string;
  failureCount: number;
}

// Sites left out because their parse failed or skipped pages, so the page can say why.
export const excludedSites: ExcludedSite[] = [...reports]
  .filter(([, report]) => hasParseErrors(report))
  .map(([domain, report]) => ({
    domain,
    name: harvested.find((company) => company.domain === domain)?.company.name ?? domain,
    status: report.status,
    failureCount: report.failures?.length ?? 0,
  }))
  .sort((a, b) => a.domain.localeCompare(b.domain));
