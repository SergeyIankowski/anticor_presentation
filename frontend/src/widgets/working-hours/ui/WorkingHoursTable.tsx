import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import DataTable from '../../../shared/ui/DataTable.tsx';
import { formatHours } from '../lib/format.ts';
import { WEEKS_PER_MONTH, type WorkingHoursRow } from '../model/workingHours.ts';

const columns = [
  { label: 'Компания' },
  { label: 'Часов в неделю', align: 'right' as const },
  { label: 'Часов в месяц', align: 'right' as const },
  { label: 'График на сайте' },
];

export default function WorkingHoursTable({ rows }: { rows: WorkingHoursRow[] }) {
  return (
    <DataTable label="Часы работы в неделю и в месяц" columns={columns}>
      {rows.map((row) => (
        <TableRow key={row.domain} hover>
          <TableCell>{row.name}</TableCell>
          <TableCell align="right" className="num">
            {formatHours(row.total)}
          </TableCell>
          <TableCell align="right" className="num">
            {formatHours(row.total * WEEKS_PER_MONTH)}
          </TableCell>
          <TableCell>
            <Typography variant="body2">{row.text}</Typography>
            {row.daysAssumed && (
              <Typography variant="caption" color="text.secondary">
                Дни не указаны — считаем Пн–Пт
              </Typography>
            )}
          </TableCell>
        </TableRow>
      ))}
    </DataTable>
  );
}
