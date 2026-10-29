import Paper from '@mui/material/Paper';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { PriceRow } from '../../../entities/service/index.ts';
import { formatPrice } from '../../../shared/lib/number.ts';
import DataTable from '../../../shared/ui/DataTable.tsx';
import { averageRows } from '../model/averageRows.ts';
import AverageChart from './AverageChart.tsx';

const columns = [
  { label: 'Услуга' },
  { label: 'Средняя', align: 'right' as const },
  { label: 'Мин.', align: 'right' as const },
  { label: 'Макс.', align: 'right' as const },
  { label: 'Компаний с ценой', align: 'right' as const },
];

interface Props {
  rows: PriceRow[];
}

export default function AveragePriceSection({ rows }: Props) {
  const { priced, unpriced, shared, chartRows } = averageRows(rows);

  return (
    <>
      {priced.length > 0 ? (
        <Paper sx={{ p: 2, mb: 2 }}>
          {shared.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              На графике — услуги с ценой минимум у двух компаний. Остальные — в таблице ниже.
            </Typography>
          )}
          <AverageChart rows={chartRows} />
        </Paper>
      ) : (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Для выбранного класса нет ни одной опубликованной цены.
        </Typography>
      )}
      <DataTable label="Средняя цена по услугам" columns={columns}>
        {[...priced, ...unpriced].map((row) => (
          <TableRow key={row.id} hover className={`row-${row.category}`}>
            <TableCell className="service-cell">
              {row.label}
              {row.pricedBy.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {row.pricedBy.join(', ')}
                </Typography>
              )}
            </TableCell>
            <TableCell align="right" className="num">
              {row.avg == null ? '—' : formatPrice(row.avg, row.currency, row.isFrom)}
            </TableCell>
            <TableCell align="right" className="num">
              {row.min == null ? '—' : formatPrice(row.min, row.currency)}
            </TableCell>
            <TableCell align="right" className="num">
              {row.max == null ? '—' : formatPrice(row.max, row.currency)}
            </TableCell>
            <TableCell align="right" className="num">
              {row.pricedCount} из {row.offeredCount}
            </TableCell>
          </TableRow>
        ))}
      </DataTable>
    </>
  );
}
