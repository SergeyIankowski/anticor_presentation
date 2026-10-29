import { useTheme } from '@mui/material/styles';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  type ChartOptions,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { PriceRow } from '../../../entities/service/index.ts';
import { seriesColor } from '../../../shared/config/theme.ts';
import { formatNumber, formatPrice } from '../../../shared/lib/number.ts';
import { rowLabel, wrapLabel } from '../lib/chartLabels.ts';
import './AverageChart.css';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const BAR_SLOT = 34;

export default function AverageChart({ rows }: { rows: PriceRow[] }) {
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
          title: (items) => rowLabel(rows[items[0].dataIndex]),
          label: (item) => {
            const row = rows[item.dataIndex];
            return `Средняя: ${formatPrice(row.avg, row.currency, row.isFrom)} (цена у ${row.pricedCount} из ${row.offeredCount})`;
          },
          footer: (items) => rows[items[0].dataIndex].pricedBy.join(', '),
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
          labels: rows.map((row) => wrapLabel(rowLabel(row))),
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
