import type { PriceRow } from '../../../entities/service/index.ts';

// Rows with an average, highest first, then rows without one. The chart shows only services
// priced by at least two companies, since an average of one price is not a market comparison;
// it falls back to every priced row when nothing else exists.
export function averageRows(rows: PriceRow[]) {
  const priced = rows.filter((row) => row.avg != null).sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
  const unpriced = rows.filter((row) => row.avg == null);
  const shared = priced.filter((row) => row.pricedCount > 1);
  return { priced, unpriced, shared, chartRows: shared.length ? shared : priced };
}
