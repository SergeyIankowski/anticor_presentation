import type { Company, VehicleClass } from '../../../shared/api/harvest.ts';

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
