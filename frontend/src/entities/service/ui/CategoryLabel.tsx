import Typography from '@mui/material/Typography';
import type { ServiceCategory } from '../../../shared/api/harvest.ts';
import { categoryLabels } from '../model/category.ts';

export default function CategoryLabel({ category }: { category: ServiceCategory }) {
  return (
    <Typography variant="body2" color="text.secondary">
      {categoryLabels[category]}
    </Typography>
  );
}
