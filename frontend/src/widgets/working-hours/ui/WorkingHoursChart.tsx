import { useTheme } from '@mui/material/styles';
import {
  BarElement,
  CategoryScale,
  type Chart,
  Chart as ChartJS,
  type ChartOptions,
  LinearScale,
  type Plugin,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { seriesColor } from '../../../shared/config/theme.ts';
import { formatClock, formatHours } from '../lib/format.ts';
import type { WorkingHoursRow } from '../model/workingHours.ts';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const BAR_SLOT = 34;

interface Props {
  rows: WorkingHoursRow[];
  /** Weekday index, Mon = 0. */
  day: number;
}

// Writes the hours open that day to the right of the chart area.
const hoursPlugin = (rows: WorkingHoursRow[], day: number, color: string): Plugin<'bar'> => ({
  id: 'dayHours',
  afterDatasetsDraw(chart: Chart<'bar'>) {
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `600 12px ${ChartJS.defaults.font.family}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    chart.getDatasetMeta(0).data.forEach((bar, i) => {
      const hours = rows[i].days[day];
      ctx.fillText(hours ? formatHours(hours) : 'выходной', chartArea.right + 72, bar.y);
    });
    ctx.restore();
  },
});

// Opening time window of each company on one weekday: bar from opening to closing time.
export default function WorkingHoursChart({ rows, day }: Props) {
  const theme = useTheme();
  const mode = theme.palette.mode;
  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    maintainAspectRatio: false,
    animation: false,
    layout: { padding: { right: 80 } },
    interaction: { mode: 'nearest', axis: 'y', intersect: false },
    plugins: {
      tooltip: {
        callbacks: {
          title: (items) => rows[items[0].dataIndex].name,
          label: (item) => {
            const slot = rows[item.dataIndex].slots[day];
            return slot
              ? `${formatClock(slot.open)}–${formatClock(slot.close)} (${formatHours(slot.close - slot.open)})`
              : 'Выходной';
          },
          footer: (items) => {
            const row = rows[items[0].dataIndex];
            return [
              `На сайте: ${row.text}`,
              ...(row.daysAssumed ? ['Дни не указаны — считаем Пн–Пт'] : []),
            ];
          },
        },
      },
    },
    scales: {
      x: {
        min: 6,
        max: 22,
        title: { display: true, text: 'Время суток', color: theme.palette.text.secondary },
        grid: { color: theme.palette.divider },
        border: { display: false },
        ticks: {
          stepSize: 2,
          color: theme.palette.text.secondary,
          callback: (value) => formatClock(Number(value)),
        },
      },
      y: {
        grid: { display: false },
        ticks: { color: theme.palette.text.primary, autoSkip: false },
      },
    },
  };
  return (
    <div style={{ position: 'relative', width: '100%', height: rows.length * BAR_SLOT + 64 }}>
      <Bar
        key={day}
        options={options}
        plugins={[hoursPlugin(rows, day, theme.palette.text.primary)]}
        data={{
          labels: rows.map((row) => row.name),
          datasets: [
            {
              label: 'Часы работы',
              data: rows.map((row) => {
                const slot = row.slots[day];
                return slot ? [slot.open, slot.close] : null;
              }) as unknown as number[],
              backgroundColor: seriesColor[mode],
              hoverBackgroundColor: seriesColor[mode],
              borderRadius: 4,
              borderSkipped: false,
              maxBarThickness: 24,
            },
          ],
        }}
      />
    </div>
  );
}
