import type { VehicleClass } from '../../../shared/api/harvest.ts';

// Keep the chosen class while it exists for the selected companies.
export const resolveVehicleClass = (preferred: VehicleClass, classes: VehicleClass[]) =>
  classes.includes(preferred) ? preferred : classes[0];
