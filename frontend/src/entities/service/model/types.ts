import type { Company, Service, ServiceCategory } from '../../../shared/api/harvest.ts';

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
