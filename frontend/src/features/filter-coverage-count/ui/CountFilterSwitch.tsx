import { companiesLabel } from '../../../entities/company/index.ts';
import ToggleSwitch, { type ToggleOption } from '../../../shared/ui/ToggleSwitch.tsx';
import type { CountFilter } from '../model/countFilter.ts';

interface Props {
  value: CountFilter;
  /** Numbers of companies that occur among the services, largest first. */
  counts: number[];
  /** Number of services offered by two or more companies. */
  shared: number;
  onChange: (value: CountFilter) => void;
}

export default function CountFilterSwitch({ value, counts, shared, onChange }: Props) {
  const options: ToggleOption<CountFilter>[] = [
    { value: 'shared', label: '2 и больше', disabled: shared === 0 },
    ...counts.map((count) => ({ value: count, label: companiesLabel(count) })),
    { value: 'all', label: 'Все' },
  ];
  return (
    <ToggleSwitch
      label="Сколько компаний оказывают услугу"
      value={value}
      onChange={onChange}
      options={options}
    />
  );
}
