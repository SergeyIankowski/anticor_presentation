import { hasPrices } from '../../../entities/company/index.ts';
import type { Company } from '../../../shared/api/harvest.ts';

// The selection is a set of company domains.
export const allDomains = (companies: Company[]) =>
  new Set(companies.map((company) => company.domain));

export const pricedDomains = (companies: Company[]) => allDomains(companies.filter(hasPrices));

export function toggleDomain(selected: Set<string>, domain: string): Set<string> {
  const next = new Set(selected);
  if (next.has(domain)) next.delete(domain);
  else next.add(domain);
  return next;
}
