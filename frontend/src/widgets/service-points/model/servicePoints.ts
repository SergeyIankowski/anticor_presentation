import type { Company } from '../../../shared/api/harvest.ts';

export interface ServicePointRow {
  domain: string;
  name: string;
  website: string;
  /** Number of addresses on the site; null when the site lists none. */
  count: number | null;
  cities: string[];
  addresses: string[];
}

// One row per company with the service points (workshop addresses) its site lists, most first.
export function servicePoints(companies: Company[]): ServicePointRow[] {
  return companies
    .map((company) => {
      const locations = (company.company.locations ?? []).filter(
        (location) => location.address || location.city,
      );
      return {
        domain: company.domain,
        name: company.company.name,
        website: company.company.website,
        count: locations.length || null,
        cities: [...new Set(locations.flatMap((location) => location.city ?? []))],
        addresses: locations.map((location) => location.address ?? location.city ?? ''),
      };
    })
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0) || a.name.localeCompare(b.name, 'ru'));
}
