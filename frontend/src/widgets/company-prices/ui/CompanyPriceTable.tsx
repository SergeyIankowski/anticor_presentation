import Stack from '@mui/material/Stack';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import {
  CategoryLabel,
  MarketAverage,
  OnlyHereChip,
  PriceDifference,
  type PriceRow,
  PriceValue,
  SourceLink,
} from '../../../entities/service/index.ts';
import type { Company } from '../../../shared/api/harvest.ts';
import DataTable from '../../../shared/ui/DataTable.tsx';
import ExternalLink from '../../../shared/ui/ExternalLink.tsx';

const columns = [
  { label: 'Услуга' },
  { label: 'Категория' },
  { label: 'Цена', align: 'right' as const },
  { label: 'Средняя по рынку', align: 'right' as const },
  { label: 'Разница со средней', align: 'right' as const },
  { label: 'Где цена' },
];

interface Props {
  company: Company;
  rows: PriceRow[];
}

export default function CompanyPriceTable({ company, rows }: Props) {
  const offered = rows.filter((row) => row.byCompany[company.domain].offered);
  const priced = offered.filter((row) => row.byCompany[company.domain].value != null).length;

  return (
    <section className="company-table">
      <Stack
        direction="row"
        sx={{ mb: 1, flexWrap: 'wrap', gap: 1, alignItems: 'baseline', columnGap: 2 }}
      >
        <Typography variant="h6" component="h3">
          {company.company.name}
        </Typography>
        <ExternalLink href={company.company.website} variant="body2">
          {company.domain}
        </ExternalLink>
        <Typography variant="body2" color="text.secondary">
          Услуг: {offered.length} · с ценой для класса: {priced}
        </Typography>
      </Stack>
      <DataTable
        label={`Цены ${company.company.name}`}
        columns={columns}
        empty={offered.length === 0 && 'Нет услуг этой компании в выбранной категории.'}
      >
        {offered.map((row) => {
          const cell = row.byCompany[company.domain];
          return (
            <TableRow key={row.id} hover className={`row-${row.category}`}>
              <TableCell className="service-cell">
                {row.label}
                {row.offeredCount === 1 && <OnlyHereChip />}
              </TableCell>
              <TableCell>
                <CategoryLabel category={row.category} />
              </TableCell>
              <TableCell align="right">
                <PriceValue cell={cell} />
              </TableCell>
              <TableCell align="right">
                <MarketAverage row={row} />
              </TableCell>
              <TableCell align="right">
                <PriceDifference cell={cell} row={row} />
              </TableCell>
              <TableCell>
                <SourceLink cell={cell} />
              </TableCell>
            </TableRow>
          );
        })}
      </DataTable>
    </section>
  );
}
