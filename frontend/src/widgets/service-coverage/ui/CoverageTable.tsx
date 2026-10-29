import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { CategoryLabel, type CoverageRow } from '../../../entities/service/index.ts';
import {
  CountFilterSwitch,
  useCountFilter,
} from '../../../features/filter-coverage-count/index.ts';
import DataTable from '../../../shared/ui/DataTable.tsx';

const columns = [
  { label: 'Услуга' },
  { label: 'Категория' },
  { label: 'Компаний', align: 'right' as const },
  { label: 'Кто оказывает' },
];

interface Props {
  rows: CoverageRow[];
  totalCompanies: number;
}

export default function CoverageTable({ rows, totalCompanies }: Props) {
  const { filter, setFilter, counts, shared, visible } = useCountFilter(rows);

  return (
    <>
      <Stack direction="row" sx={{ mb: 2, flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <CountFilterSwitch value={filter} counts={counts} shared={shared} onChange={setFilter} />
        <Typography variant="body2" color="text.secondary">
          Услуг: {rows.length} · у нескольких компаний: {shared} · только у одной:{' '}
          {rows.length - shared} · всего компаний: {totalCompanies}
        </Typography>
      </Stack>
      <DataTable
        label="Услуги по количеству компаний"
        columns={columns}
        empty={visible.length === 0 && 'Нет услуг для выбранного фильтра.'}
      >
        {visible.map((row) => (
          <TableRow key={row.id} hover className={`row-${row.category}`}>
            <TableCell className="service-cell">{row.label}</TableCell>
            <TableCell>
              <CategoryLabel category={row.category} />
            </TableCell>
            <TableCell align="right" className="num">
              {row.count} из {totalCompanies}
            </TableCell>
            <TableCell>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                {row.companies.map((company) => (
                  <Chip key={company.domain} size="small" label={company.company.name} />
                ))}
              </Stack>
            </TableCell>
          </TableRow>
        ))}
      </DataTable>
    </>
  );
}
