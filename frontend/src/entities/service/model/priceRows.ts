import type { Company, Service, VehicleClass } from '../../../shared/api/harvest.ts';
import { mean } from '../../../shared/lib/number.ts';
import { normalizePrice } from '../lib/normalizePrice.ts';
import { priceSourceUrl } from '../lib/sourceUrl.ts';
import type { PriceCell, PriceRow, ServiceGroup } from './types.ts';

const notOffered: PriceCell = {
  offered: false,
  status: 'not-offered',
  value: null,
  min: null,
  max: null,
  isFrom: false,
  entries: [],
  currency: null,
  url: null,
};

function companyCell(company: Company, services: Service[], vehicleClass: VehicleClass): PriceCell {
  const typeById = new Map(company.vehicle_types.map((type) => [type.id, type]));
  const allPrices = services.flatMap((service) => service.prices);
  const entries = allPrices.flatMap((price) => {
    const type = typeById.get(price.vehicle_type_id);
    if (!type || (type.class !== vehicleClass && type.class !== 'any')) return [];
    return [{ ...normalizePrice(price), vehicle: type.name_original }];
  });
  const values = entries.flatMap((entry) => (entry.value == null ? [] : [entry.value]));
  return {
    offered: true,
    status: allPrices.length === 0 ? 'no-price' : entries.length === 0 ? 'other-class' : 'priced',
    value: mean(values),
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    isFrom: entries.some((entry) => entry.value != null && entry.isFrom),
    entries,
    currency: company.currency,
    url:
      priceSourceUrl(services.find((service) => service.prices.length) ?? services[0]) ??
      company.company.website,
  };
}

// One row per comparable service with each company's price for the vehicle class and the
// average across companies that have a numeric price.
export function priceRows(
  groups: ServiceGroup[],
  companies: Company[],
  vehicleClass: VehicleClass,
): PriceRow[] {
  return groups.map((group) => {
    const byCompany: Record<string, PriceCell> = {};
    for (const company of companies) {
      const services = group.services.get(company.domain);
      byCompany[company.domain] = services
        ? companyCell(company, services, vehicleClass)
        : notOffered;
    }
    const priced = Object.values(byCompany).filter((cell) => cell.value != null);
    const currencies = new Set(priced.map((cell) => cell.currency));
    const values = priced.map((cell) => cell.value as number);
    const comparable = currencies.size <= 1;
    return {
      id: group.id,
      label: group.label,
      category: group.category,
      byCompany,
      avg: comparable ? mean(values) : null,
      min: comparable && values.length ? Math.min(...values) : null,
      max: comparable && values.length ? Math.max(...values) : null,
      currency: comparable ? ([...currencies][0] ?? null) : null,
      isFrom: priced.some((cell) => cell.isFrom),
      pricedCount: priced.length,
      offeredCount: group.services.size,
      pricedBy: companies
        .filter((company) => byCompany[company.domain].value != null)
        .map((company) => company.company.name),
      offeredBy: companies
        .filter((company) => byCompany[company.domain].offered)
        .map((company) => company.company.name),
    };
  });
}
