import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { formatNumber, formatPrice } from '../../../shared/lib/number.ts';
import ExternalLink from '../../../shared/ui/ExternalLink.tsx';
import type { PriceCell } from '../model/types.ts';

// Some sites price every car model separately (antikor-minsk.by has ~1000), so list a few.
const TOOLTIP_ENTRIES = 12;

function entriesTooltip(cell: PriceCell) {
  const hidden = cell.entries.length - TOOLTIP_ENTRIES;
  return (
    <>
      {cell.entries.slice(0, TOOLTIP_ENTRIES).map((entry) => (
        <div key={`${entry.vehicle}-${entry.text}`}>
          {entry.vehicle}: {entry.text}
        </div>
      ))}
      {hidden > 0 && <div>и ещё {hidden}</div>}
    </>
  );
}

// A company's price for the class, its range across body types and the original price texts.
export default function PriceValue({ cell }: { cell: PriceCell }) {
  if (cell.status === 'no-price') {
    return (
      <Tooltip title="Услуга есть на сайте, но цена не опубликована">
        <Chip size="small" variant="outlined" label="цена не указана" />
      </Tooltip>
    );
  }
  if (cell.status === 'other-class') {
    return (
      <Typography variant="body2" color="text.secondary">
        нет для этого класса
      </Typography>
    );
  }
  const range =
    cell.min != null && cell.max != null && cell.min !== cell.max
      ? `${formatNumber(cell.min)}–${formatNumber(cell.max)}`
      : null;
  return (
    <Tooltip title={entriesTooltip(cell)}>
      <span>
        <ExternalLink href={cell.url ?? undefined} underline="hover" color="inherit">
          {cell.value == null ? (
            <Typography variant="body2" component="span" color="text.secondary">
              {cell.entries[0]?.text}
            </Typography>
          ) : (
            <span className="num">{formatPrice(cell.value, cell.currency, cell.isFrom)}</span>
          )}
        </ExternalLink>
        {range && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block' }}
            className="num"
          >
            {range}
          </Typography>
        )}
      </span>
    </Tooltip>
  );
}
