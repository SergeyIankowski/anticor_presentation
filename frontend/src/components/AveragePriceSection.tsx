import Paper from '@mui/material/Paper';
import { useTheme } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  type ChartOptions,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { PriceRow } from '../lib/comparison.ts';
import { formatNumber, formatPrice } from '../lib/prices.ts';
import { seriesColor } from '../theme.ts';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const BAR_SLOT = 34;

// Splits long service names into lines so the category axis stays readable on narrow screens.
function wrapLabel(label: string, width = 28): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of label.split(' ')) {
    if (line && `${line} ${word}`.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function AverageChart({ rows }: { rows: PriceRow[] }) {
  const theme = useTheme();
  const mode = theme.palette.mode;
  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: 'nearest', axis: 'y', intersect: false },
    plugins: {
      tooltip: {
        callbacks: {
          title: (items) => rows[items[0].dataIndex].label,
          label: (item) => {
            const row = rows[item.dataIndex];
            return `Средняя: ${formatPrice(row.avg, row.currency, row.isFrom)} (цена у ${row.pricedCount} из ${row.offeredCount})`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: theme.palette.divider },
        border: { display: false },
        ticks: {
          color: theme.palette.text.secondary,
          callback: (value) => formatNumber(Number(value)),
        },
      },
      y: {
        grid: { display: false },
        ticks: { color: theme.palette.text.primary, autoSkip: false },
      },
    },
  };
  return (
    <div className="chart-box" style={{ height: rows.length * BAR_SLOT + 48 }}>
      <Bar
        options={options}
        data={{
          labels: rows.map((row) => wrapLabel(row.label)),
          datasets: [
            {
              label: 'Средняя цена',
              data: rows.map((row) => row.avg),
              backgroundColor: seriesColor[mode],
              hoverBackgroundColor: seriesColor[mode],
              borderRadius: 4,
              borderSkipped: 'start',
              maxBarThickness: 24,
            },
          ],
        }}
      />
    </div>
  );
}

interface Props {
  rows: PriceRow[];
}

export default function AveragePriceSection({ rows }: Props) {
  const priced = rows.filter((row) => row.avg != null).sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
  const unpriced = rows.filter((row) => row.avg == null);

  return (
    <>
      {priced.length > 0 ? (
        <Paper sx={{ p: 2, mb: 2 }}>
          <AverageChart rows={priced} />
        </Paper>
      ) : (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Для выбранного класса нет ни одной опубликованной цены.
        </Typography>
      )}
      <TableContainer component={Paper}>
        <Table size="small" aria-label="Средняя цена по услугам">
          <TableHead>
            <TableRow>
              <TableCell>Услуга</TableCell>
              <TableCell align="right">Средняя</TableCell>
              <TableCell align="right">Мин.</TableCell>
              <TableCell align="right">Макс.</TableCell>
              <TableCell align="right">Компаний с ценой</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...priced, ...unpriced].map((row) => (
              <TableRow key={row.id} hover className={`row-${row.category}`}>
                <TableCell className="service-cell">{row.label}</TableCell>
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
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
