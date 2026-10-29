import Typography from '@mui/material/Typography';
import { formatPrice } from '../../../shared/lib/number.ts';
import EmptyValue from '../../../shared/ui/EmptyValue.tsx';
import type { PriceRow } from '../model/types.ts';

export default function MarketAverage({ row }: { row: PriceRow }) {
  if (row.offeredCount === 1) {
    return (
      <Typography variant="body2" color="text.secondary">
        нет у других компаний
      </Typography>
    );
  }
  if (row.avg == null) return <EmptyValue />;
  return (
    <>
      <Typography variant="body2" className="num">
        {formatPrice(row.avg, row.currency, row.isFrom)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        цена у {row.pricedCount} из {row.offeredCount}
      </Typography>
    </>
  );
}
