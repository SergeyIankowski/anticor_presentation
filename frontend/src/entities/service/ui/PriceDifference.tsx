import Typography from '@mui/material/Typography';
import EmptyValue from '../../../shared/ui/EmptyValue.tsx';
import type { PriceCell, PriceRow } from '../model/types.ts';

// Compares the company's price with the average of all companies that publish one. Only shown
// when someone else also has a price, otherwise the company is compared with itself.
export default function PriceDifference({ cell, row }: { cell: PriceCell; row: PriceRow }) {
  if (cell.value == null || row.avg == null || row.pricedCount < 2) return <EmptyValue />;
  const percent = Math.round(((cell.value - row.avg) / row.avg) * 100);
  const sign = percent > 0 ? '+' : percent < 0 ? '−' : '';
  return (
    <Typography variant="body2" sx={{ fontWeight: 600 }} className="num">
      {`${sign}${Math.abs(percent)} %`}
    </Typography>
  );
}
