// Data contract for every layer: shapes of instances/<domain>/parsed/company.json, mirroring the
// root schema.json.
export type VehicleClass =
  | 'small'
  | 'sedan'
  | 'crossover'
  | 'suv'
  | 'minivan'
  | 'van'
  | 'pickup'
  | 'truck'
  | 'any'
  | 'other';

export type ServiceCategory = 'anticorrosion' | 'additional';

export interface Price {
  vehicle_type_id: string;
  price?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  price_text_original: string;
  notes?: string;
}

export interface Service {
  id: string;
  /** Unified key from `@anticor/harvest-core/services`; `<domain>:<id>` for a site's own service. */
  service_key: string;
  category: ServiceCategory;
  name_original: string;
  name_en?: string;
  description?: string;
  url?: string;
  prices: Price[];
}

export interface VehicleType {
  id: string;
  name_original: string;
  class: VehicleClass;
  examples?: string;
}

export interface Location {
  city?: string;
  address?: string;
  phones?: string[];
  working_hours?: string;
}

export interface CompanySheet {
  schema_version: string;
  company: { name: string; website: string; country?: string; locations?: Location[] };
  source: { scraped_at: string; urls: string[]; notes?: string };
  currency: string;
  vehicle_types: VehicleType[];
  services: Service[];
}

export interface Company extends CompanySheet {
  domain: string;
}

// Shape of instances/<domain>/parse-report.json written by harvest-core.
export interface ParseReport {
  status: 'complete' | 'partial' | 'failed' | string;
  published?: boolean;
  failures?: { url: string; error: string; required?: boolean }[];
}
