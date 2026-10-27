import type { ServiceGroupRule } from '../data/serviceGroups.ts';
import type { Company, Service, ServiceCategory, VehicleClass } from '../types.ts';
import { priceSourceUrl } from './links.ts';
import { mean, normalizePrice } from './prices.ts';

// Order and labels follow the `class` enum in the root schema.json.
export const vehicleClassLabels: Record<VehicleClass, string> = {
  small: 'Малый',
  sedan: 'Легковой',
  crossover: 'Кроссовер',
  suv: 'Внедорожник',
  minivan: 'Минивэн',
  van: 'Микроавтобус',
  pickup: 'Пикап',
  truck: 'Грузовой',
  any: 'Все автомобили',
  other: 'Другое',
};

export const categoryLabels: Record<ServiceCategory, string> = {
  anticorrosion: 'Антикор',
  additional: 'Дополнительно',
};

export interface ServiceGroup {
  id: string;
  label: string;
  category: ServiceCategory;
  /** Services of each company (by domain) that fall into this group. */
  services: Map<string, Service[]>;
}

export interface PriceEntry {
  value: number | null;
  isFrom: boolean;
  text: string;
  vehicle: string;
}

export type CellStatus = 'priced' | 'no-price' | 'other-class' | 'not-offered';

export interface PriceCell {
  offered: boolean;
  status: CellStatus;
  value: number | null;
  min: number | null;
  max: number | null;
  isFrom: boolean;
  entries: PriceEntry[];
  currency: string | null;
  url: string | null;
}

export interface PriceRow {
  id: string;
  label: string;
  category: ServiceCategory;
  byCompany: Record<string, PriceCell>;
  avg: number | null;
  min: number | null;
  max: number | null;
  currency: string | null;
  isFrom: boolean;
  pricedCount: number;
  offeredCount: number;
  /** Names of companies with a numeric price for the class. */
  pricedBy: string[];
  /** Names of companies offering the service. */
  offeredBy: string[];
}

export interface CoverageRow {
  id: string;
  label: string;
  category: ServiceCategory;
  companies: Company[];
  count: number;
}

// Site price tables append descriptions and table headings to the service name; keep the part
// before them for display.
export function shortServiceName(name: string): string {
  const [head] = name.split(/\s+\(|\s+[А-ЯЁA-Z]{3,}\s+[А-ЯЁA-Z"]{2,}/);
  return head.length > 80 ? `${head.slice(0, 77)}…` : head;
}

// Groups every company's services into comparable services using the ordered `rules`.
export function groupServices(companies: Company[], rules: ServiceGroupRule[]): ServiceGroup[] {
  const groups = new Map<string, ServiceGroup>();
  for (const company of companies) {
    for (const service of company.services) {
      const rule = rules.find(({ match }) => match.test(service.name_original.trim()));
      const id = rule?.id ?? `${company.domain}:${service.id}`;
      let group = groups.get(id);
      if (!group) {
        group = {
          id,
          label: rule?.label ?? shortServiceName(service.name_original),
          category: service.category,
          services: new Map(),
        };
        groups.set(id, group);
      }
      const companyServices = group.services.get(company.domain) ?? [];
      companyServices.push(service);
      group.services.set(company.domain, companyServices);
    }
  }
  return [...groups.values()];
}

// Vehicle classes that have at least one price, in schema order. `any` prices apply to every
// class, so it is only offered as its own choice when no specific class exists.
export function vehicleClasses(companies: Company[]): VehicleClass[] {
  const used = new Set<VehicleClass | undefined>();
  for (const company of companies) {
    const classById = new Map(company.vehicle_types.map((type) => [type.id, type.class]));
    for (const service of company.services) {
      for (const price of service.prices) used.add(classById.get(price.vehicle_type_id));
    }
  }
  const specific = (Object.keys(vehicleClassLabels) as VehicleClass[]).filter(
    (key) => key !== 'any' && used.has(key),
  );
  return specific.length ? specific : ['any'];
}

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
