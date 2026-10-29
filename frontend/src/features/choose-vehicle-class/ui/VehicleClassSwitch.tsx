import { vehicleClassLabels } from '../../../entities/vehicle-class/index.ts';
import type { VehicleClass } from '../../../shared/api/harvest.ts';
import ToggleSwitch from '../../../shared/ui/ToggleSwitch.tsx';

interface Props {
  classes: VehicleClass[];
  value: VehicleClass;
  onChange: (value: VehicleClass) => void;
}

// Vehicle class the prices are shown for.
export default function VehicleClassSwitch({ classes, value, onChange }: Props) {
  return (
    <ToggleSwitch
      label="Класс автомобиля"
      caption
      value={value}
      onChange={onChange}
      options={classes.map((key) => ({ value: key, label: vehicleClassLabels[key] }))}
    />
  );
}
