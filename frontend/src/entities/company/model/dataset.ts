import type { Company, CompanySheet, ParseReport } from '../../../shared/api/harvest.ts';
import { hasParseErrors } from './parseStatus.ts';

export interface ExcludedSite {
  domain: string;
  name: string;
  status: string;
  failureCount: number;
}

export interface Dataset {
  /** Companies whose last parse completed without errors. */
  companies: Company[];
  /** Sites left out because their parse failed or skipped pages, so the page can say why. */
  excludedSites: ExcludedSite[];
}

// Builds the dataset from files keyed by their instances/<domain>/parsed/company.json and
// instances/<domain>/parse-report.json paths.
export function buildDataset(
  files: Record<string, CompanySheet>,
  reportFiles: Record<string, ParseReport>,
): Dataset {
  const reports = new Map(
    Object.entries(reportFiles).map(([path, report]) => [path.split('/').at(-2) ?? path, report]),
  );
  const harvested: Company[] = Object.entries(files)
    .map(([path, company]) => ({ ...company, domain: path.split('/').at(-3) ?? path }))
    .sort((a, b) => a.domain.localeCompare(b.domain));

  return {
    companies: harvested.filter((company) => !hasParseErrors(reports.get(company.domain))),
    excludedSites: [...reports]
      .filter(([, report]) => hasParseErrors(report))
      .map(([domain, report]) => ({
        domain,
        name: harvested.find((company) => company.domain === domain)?.company.name ?? domain,
        status: report.status,
        failureCount: report.failures?.length ?? 0,
      }))
      .sort((a, b) => a.domain.localeCompare(b.domain)),
  };
}
