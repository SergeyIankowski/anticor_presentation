import { fixtureCompanies } from '../../../shared/api/fixtures.ts';
import type { VehicleClass } from '../../../shared/api/harvest.ts';
import { groupServices } from './groupServices.ts';
import { priceRows } from './priceRows.ts';
import type { PriceCell, PriceRow } from './types.ts';

// Price rows and cells built from the shared fixture companies, for stories of this slice.
export function fixtureRow(serviceKey: string, vehicleClass: VehicleClass = 'sedan'): PriceRow {
  const rows = priceRows(groupServices(fixtureCompanies), fixtureCompanies, vehicleClass);
  const row = rows.find((candidate) => candidate.id === serviceKey);
  if (!row) throw new Error(`No fixture service ${serviceKey}`);
  return row;
}

export const fixtureCell = (
  domain: string,
  serviceKey: string,
  vehicleClass: VehicleClass = 'sedan',
): PriceCell => fixtureRow(serviceKey, vehicleClass).byCompany[domain];
