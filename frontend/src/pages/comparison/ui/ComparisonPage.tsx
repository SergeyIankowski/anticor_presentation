import Alert from '@mui/material/Alert';
import Container from '@mui/material/Container';
import { companies, excludedSites } from '../../../entities/company/index.ts';
import { vehicleClassLabels } from '../../../entities/vehicle-class/index.ts';
import { VehicleClassSwitch } from '../../../features/choose-vehicle-class/index.ts';
import { CategorySwitch } from '../../../features/filter-service-category/index.ts';
import { CompanyFilter } from '../../../features/select-companies/index.ts';
import { useCompactLayout } from '../../../shared/lib/useCompactLayout.ts';
import Section from '../../../shared/ui/Section.tsx';
import { AveragePriceSection } from '../../../widgets/average-prices/index.ts';
import { CompanyPriceList } from '../../../widgets/company-prices/index.ts';
import { FiltersBar } from '../../../widgets/filters-bar/index.ts';
import { FiltersSidebar } from '../../../widgets/filters-sidebar/index.ts';
import { CoverageTable } from '../../../widgets/service-coverage/index.ts';
import { ServicePointsTable } from '../../../widgets/service-points/index.ts';
import { WorkingHoursSection, workingHoursRows } from '../../../widgets/working-hours/index.ts';
import { useComparison } from '../model/useComparison.ts';
import PageHeader from './PageHeader.tsx';

export default function ComparisonPage() {
  const {
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
  } = useComparison();
  const compact = useCompactLayout();
  const hoursRows = workingHoursRows(companies);

  const companyFilter = (
    <CompanyFilter
      companies={companies}
      excluded={excludedSites}
      selected={selected}
      onChange={setSelected}
    />
  );
  const viewFilters = activeCompanies.length > 0 && (
    <>
      <VehicleClassSwitch classes={classes} value={vehicleClass} onChange={setVehicleClass} />
      <CategorySwitch value={category} onChange={setCategory} />
    </>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4, px: 2 }}>
      {compact && (
        <FiltersSidebar>
          {viewFilters}
          {companyFilter}
        </FiltersSidebar>
      )}
      <PageHeader companyCount={companies.length} withoutPrices={withoutPrices} />

      <Section
        title="Точки обслуживания"
        lead="Сколько адресов указано на сайте каждой компании. Если сайт не публикует адрес, точка не учитывается."
      >
        <ServicePointsTable companies={companies} />
      </Section>

      <Section
        title="Часы работы"
        lead={`Во сколько открывается и закрывается каждая компания в выбранный день, справа — часов работы за день. Ниже — сумма часов за неделю и месяц. Компании без опубликованного графика не показаны (${companies.length - hoursRows.length} из ${companies.length}). Если адресов несколько, взят самый длинный график.`}
      >
        <WorkingHoursSection companies={companies} />
      </Section>

      {!compact && companyFilter}

      {activeCompanies.length === 0 ? (
        <Alert severity="warning" sx={{ mt: 3 }}>
          Отметьте хотя бы одну компанию, чтобы увидеть сравнение.
        </Alert>
      ) : (
        <>
          {!compact && <FiltersBar>{viewFilters}</FiltersBar>}

          <Section
            title="Цены по компаниям"
            lead={`Цены каждой компании для класса «${vehicleClassLabels[vehicleClass]}» в сравнении со средней по рынку. Если у компании несколько типов кузова в этом классе, показано среднее и диапазон; исходный текст цены — во всплывающей подсказке.`}
          >
            <CompanyPriceList companies={tableCompanies} rows={rows} />
          </Section>

          <Section
            title="Средняя цена по услугам"
            lead="Среднее по компаниям, у которых опубликована числовая цена. «от» — минимальная цена с сайта."
          >
            <AveragePriceSection rows={rows} />
          </Section>

          <Section
            title="Сколько компаний оказывают услугу"
            lead="Сначала услуги, которые есть у наибольшего числа компаний. Учитываются все услуги с сайтов, независимо от того, опубликована ли цена."
          >
            <CoverageTable rows={coverageRows} totalCompanies={activeCompanies.length} />
          </Section>
        </>
      )}
    </Container>
  );
}
