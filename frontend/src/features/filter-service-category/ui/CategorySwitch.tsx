import { categoryLabels } from '../../../entities/service/index.ts';
import type { ServiceCategory } from '../../../shared/api/harvest.ts';
import ToggleSwitch, { type ToggleOption } from '../../../shared/ui/ToggleSwitch.tsx';
import type { CategoryFilter } from '../model/categoryFilter.ts';

const options: ToggleOption<CategoryFilter>[] = [
  { value: 'all', label: 'Все' },
  ...(Object.keys(categoryLabels) as ServiceCategory[]).map((key) => ({
    value: key,
    label: categoryLabels[key],
  })),
];

interface Props {
  value: CategoryFilter;
  onChange: (value: CategoryFilter) => void;
}

// Shows all services or only one category.
export default function CategorySwitch({ value, onChange }: Props) {
  return (
    <ToggleSwitch
      label="Категория услуг"
      caption
      value={value}
      onChange={onChange}
      options={options}
    />
  );
}
