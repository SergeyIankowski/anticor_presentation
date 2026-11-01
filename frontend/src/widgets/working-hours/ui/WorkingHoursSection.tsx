import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import type { Company } from '../../../shared/api/harvest.ts';
import ToggleSwitch from '../../../shared/ui/ToggleSwitch.tsx';
import { weekDays, workingHoursRows } from '../model/workingHours.ts';
import WorkingHoursChart from './WorkingHoursChart.tsx';
import WorkingHoursTable from './WorkingHoursTable.tsx';

const dayOptions = weekDays.map((label, value) => ({ value, label }));

export default function WorkingHoursSection({ companies }: { companies: Company[] }) {
  const rows = useMemo(() => workingHoursRows(companies), [companies]);
  const [day, setDay] = useState(0);
  // Longest day first; companies closed that day go last.
  const dayRows = useMemo(
    () => [...rows].sort((a, b) => b.days[day] - a.days[day] || a.name.localeCompare(b.name, 'ru')),
    [rows, day],
  );

  return (
    <>
      <Box sx={{ mb: 2 }}>
        <ToggleSwitch
          label="День недели"
          caption
          value={day}
          options={dayOptions}
          onChange={setDay}
        />
      </Box>
      <WorkingHoursChart rows={dayRows} day={day} />
      <Typography variant="h6" component="h3" sx={{ mt: 4, mb: 1 }}>
        В неделю и в месяц
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Месяц — неделя × 52 / 12 (≈ 4,33 недели), без учёта праздников.
      </Typography>
      <WorkingHoursTable rows={rows} />
    </>
  );
}
