import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { type CoverageRow, categoryLabels } from '../lib/comparison.ts';
import { companiesLabel } from '../lib/plural.ts';

// 'shared' = offered by two or more companies; a number = offered by exactly that many.
type CountFilter = 'shared' | 'all' | number;

function matches(filter: CountFilter, count: number): boolean {
  if (filter === 'all') return true;
  if (filter === 'shared') return count > 1;
  return count === filter;
}

interface Props {
  rows: CoverageRow[];
  totalCompanies: number;
}

export default function CoverageTable({ rows, totalCompanies }: Props) {
  const [chosen, setFilter] = useState<CountFilter>('shared');
  // One option per number of companies that actually occurs, largest first.
  const counts = [...new Set(rows.map((row) => row.count))].sort((a, b) => b - a);
  const shared = rows.filter((row) => row.count > 1).length;
  // Fall back when the company selection removes the chosen option.
  const filter: CountFilter =
    (chosen === 'shared' && shared === 0) ||
    (typeof chosen === 'number' && !counts.includes(chosen))
      ? 'all'
      : chosen;
  const visible = rows
    .filter((row) => matches(filter, row.count))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ru'));

  return (
    <>
      <Stack direction="row" sx={{ mb: 2, flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={filter}
          onChange={(_, value: CountFilter | null) => value != null && setFilter(value)}
          aria-label="Сколько компаний оказывают услугу"
        >
          <ToggleButton value="shared" disabled={shared === 0}>
            2 и больше
          </ToggleButton>
          {counts.map((count) => (
            <ToggleButton key={count} value={count}>
              {companiesLabel(count)}
            </ToggleButton>
          ))}
          <ToggleButton value="all">Все</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="body2" color="text.secondary">
          Услуг: {rows.length} · у нескольких компаний: {shared} · только у одной:{' '}
          {rows.length - shared} · всего компаний: {totalCompanies}
        </Typography>
      </Stack>
      <TableContainer component={Paper}>
        <Table size="small" aria-label="Услуги по количеству компаний">
          <TableHead>
            <TableRow>
              <TableCell>Услуга</TableCell>
              <TableCell>Категория</TableCell>
              <TableCell align="right">Компаний</TableCell>
              <TableCell>Кто оказывает</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={row.id} hover className={`row-${row.category}`}>
                <TableCell className="service-cell">{row.label}</TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {categoryLabels[row.category]}
                  </Typography>
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
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="text.secondary">Нет услуг для выбранного фильтра.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
