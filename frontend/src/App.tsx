import Alert from '@mui/material/Alert';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { type ReactNode, useMemo, useState } from 'react';
import AveragePriceSection from './components/AveragePriceSection.tsx';
import CompanyFilter from './components/CompanyFilter.tsx';
import CompanyPriceTable from './components/CompanyPriceTable.tsx';
import CoverageTable from './components/CoverageTable.tsx';
import { companies } from './data/loadCompanies.ts';
import { serviceGroups } from './data/serviceGroups.ts';
import {
  categoryLabels,
  groupServices,
  priceRows,
  serviceCoverage,
  vehicleClasses,
  vehicleClassLabels,
} from './lib/comparison.ts';
import type { Company, ServiceCategory, VehicleClass } from './types.ts';

type CategoryFilter = ServiceCategory | 'all';

const hasPrices = (company: Company) => company.services.some((service) => service.prices.length);

// Everything below the company filter is computed from the selected companies only, so
// averages and "offered by one or two companies" reflect the chosen comparison set.
function compare(selected: Company[]) {
  const groups = groupServices(selected, serviceGroups).sort(
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

function Section({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  return (
    <section className="section">
      <Typography variant="h5" component="h2" className="section-title">
        {title}
      </Typography>
      <Typography color="text.secondary" className="section-lead">
        {lead}
      </Typography>
      {children}
    </section>
  );
}

export default function App() {
  const [selected, setSelected] = useState(() => new Set(companies.map((c) => c.domain)));
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
  // Keep the chosen class while it exists for the selected companies.
  const vehicleClass = classes.includes(preferredClass) ? preferredClass : classes[0];

  const rows = useMemo(
    () =>
      priceRows(groups, activeCompanies, vehicleClass).filter(
        (row) => category === 'all' || row.category === category,
      ),
    [groups, activeCompanies, vehicleClass, category],
  );
  const coverageRows = coverage.filter((row) => category === 'all' || row.category === category);

  return (
    <Container maxWidth="lg" sx={{ py: 4, px: 2 }}>
      <header>
        <Typography variant="h4" component="h1">
          Сравнение цен на антикоррозийную обработку
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Данные с сайтов компаний: {companies.length}. Цены указаны так, как опубликованы на сайте.
        </Typography>
        {withoutPrices.map((company) => (
          <Alert key={company.domain} severity="info" sx={{ mt: 2 }}>
            {company.company.name} ({company.domain}) не публикует цены на сайте — услуги показаны с
            пометкой «цена не указана» и не входят в средние значения.
          </Alert>
        ))}
      </header>

      <CompanyFilter companies={companies} selected={selected} onChange={setSelected} />

      <Paper className="filters" sx={{ mt: 3 }}>
        <Stack sx={{ gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Класс автомобиля
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={vehicleClass}
            onChange={(_, value: VehicleClass | null) => value && setVehicleClass(value)}
            aria-label="Класс автомобиля"
          >
            {classes.map((key) => (
              <ToggleButton key={key} value={key}>
                {vehicleClassLabels[key]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
        <Stack sx={{ gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Категория услуг
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={category}
            onChange={(_, value: CategoryFilter | null) => value && setCategory(value)}
            aria-label="Категория услуг"
          >
            <ToggleButton value="all">Все</ToggleButton>
            {(Object.keys(categoryLabels) as ServiceCategory[]).map((key) => (
              <ToggleButton key={key} value={key}>
                {categoryLabels[key]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      <Section
        title="Цены по компаниям"
        lead={`Цены каждой компании для класса «${vehicleClassLabels[vehicleClass]}» в сравнении со средней по рынку. Если у компании несколько типов кузова в этом классе, показано среднее и диапазон; исходный текст цены — во всплывающей подсказке.`}
      >
        <Stack sx={{ gap: 4 }}>
          {tableCompanies.map((company) => (
            <CompanyPriceTable key={company.domain} company={company} rows={rows} />
          ))}
        </Stack>
      </Section>

      <Section
        title="Средняя цена по услугам"
        lead="Среднее по компаниям, у которых опубликована числовая цена. «от» — минимальная цена с сайта."
      >
        <AveragePriceSection rows={rows} />
      </Section>

      <Section
        title="Услуги у одной или двух компаний"
        lead="Сколько компаний оказывают услугу, независимо от того, опубликована ли цена."
      >
        <CoverageTable rows={coverageRows} totalCompanies={activeCompanies.length} />
      </Section>
    </Container>
  );
}
