import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { categoryLabels, vehicleClassLabels } from '../lib/comparison.ts';
import type { ServiceCategory, VehicleClass } from '../types.ts';

export type CategoryFilter = ServiceCategory | 'all';

interface Props {
  classes: VehicleClass[];
  vehicleClass: VehicleClass;
  onVehicleClass: (value: VehicleClass) => void;
  category: CategoryFilter;
  onCategory: (value: CategoryFilter) => void;
}

// Vehicle class and service category switches shared by the desktop bar and the mobile sidebar.
export default function ViewFilters({
  classes,
  vehicleClass,
  onVehicleClass,
  category,
  onCategory,
}: Props) {
  return (
    <>
      <Stack sx={{ gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          Класс автомобиля
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={vehicleClass}
          onChange={(_, value: VehicleClass | null) => value && onVehicleClass(value)}
          aria-label="Класс автомобиля"
        >
          {classes.map((key) => (
            <ToggleButton key={key} value={key}>
              {vehicleClassLabels[key]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>
      <Stack sx={{ gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          Категория услуг
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={category}
          onChange={(_, value: CategoryFilter | null) => value && onCategory(value)}
          aria-label="Категория услуг"
        >
          <ToggleButton value="all">Все</ToggleButton>
          {(Object.keys(categoryLabels) as ServiceCategory[]).map((key) => (
            <ToggleButton key={key} value={key}>
              {categoryLabels[key]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>
    </>
  );
}
