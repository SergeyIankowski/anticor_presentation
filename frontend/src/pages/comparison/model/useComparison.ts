import { useMemo, useState } from 'react';
import { companies, hasPrices } from '../../../entities/company/index.ts';
import { groupServices, priceRows, serviceCoverage } from '../../../entities/service/index.ts';
import { vehicleClasses } from '../../../entities/vehicle-class/index.ts';
import { resolveVehicleClass } from '../../../features/choose-vehicle-class/index.ts';
import {
  type CategoryFilter,
  matchesCategory,
} from '../../../features/filter-service-category/index.ts';
import { allDomains } from '../../../features/select-companies/index.ts';
import type { Company, VehicleClass } from '../../../shared/api/harvest.ts';

// Everything below the company filter is computed from the selected companies only, so
// averages and "offered by one or two companies" reflect the chosen comparison set.
function compare(selected: Company[]) {
  const groups = groupServices(selected).sort(
    (a, b) => Number(a.category !== 'anticorrosion') - Number(b.category !== 'anticorrosion'),
  );
  return {
    groups,
    classes: vehicleClasses(selected),
    coverage: serviceCoverage(groups, selected),
    withoutPrices: selected.filter((company) => !hasPrices(company)),
    // Companies that publish prices come first; the rest only show which services they offer.
    tableCompanies: [...selected].sort((a, b) => Number(hasPrices(b)) - Number(hasPrices(a))),
  };
}

// Page state (selected companies, vehicle class, service category) and the comparison it yields.
export function useComparison() {
  const [selected, setSelected] = useState(() => allDomains(companies));
  const [preferredClass, setVehicleClass] = useState<VehicleClass>('sedan');
  const [category, setCategory] = useState<CategoryFilter>('all');

  const activeCompanies = useMemo(
    () => companies.filter((company) => selected.has(company.domain)),
    [selected],
  );
  const { groups, classes, coverage, withoutPrices, tableCompanies } = useMemo(
    () => compare(activeCompanies),
    [activeCompanies],
  );
  const vehicleClass = resolveVehicleClass(preferredClass, classes);

  const rows = useMemo(
    () =>
      priceRows(groups, activeCompanies, vehicleClass).filter((row) =>
        matchesCategory(category, row.category),
      ),
    [groups, activeCompanies, vehicleClass, category],
  );
  const coverageRows = coverage.filter((row) => matchesCategory(category, row.category));

  return {
    selected,
    setSelected,
    vehicleClass,
    setVehicleClass,
    category,
    setCategory,
    classes,
    activeCompanies,
    withoutPrices,
    tableCompanies,
    rows,
    coverageRows,
  };
}
