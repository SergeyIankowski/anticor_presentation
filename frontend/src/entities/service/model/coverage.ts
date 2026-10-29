import type { Company } from '../../../shared/api/harvest.ts';
import type { CoverageRow, ServiceGroup } from './types.ts';

// Which companies offer each service, whether or not they publish a price.
export function serviceCoverage(groups: ServiceGroup[], companies: Company[]): CoverageRow[] {
  return groups.map((group) => ({
    id: group.id,
    label: group.label,
    category: group.category,
    companies: companies.filter((company) => group.services.has(company.domain)),
    count: group.services.size,
  }));
}
