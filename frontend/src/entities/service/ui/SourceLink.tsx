import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import EmptyValue from '../../../shared/ui/EmptyValue.tsx';
import ExternalLink from '../../../shared/ui/ExternalLink.tsx';
import type { PriceCell } from '../model/types.ts';

// Opens the site page with the price; priced services scroll to and highlight their row.
export default function SourceLink({ cell }: { cell: PriceCell }) {
  if (!cell.url) return <EmptyValue />;
  const url = new URL(cell.url);
  const hasPrice = cell.status !== 'no-price';
  return (
    <Tooltip title={hasPrice ? 'Откроет страницу и подсветит строку с ценой' : 'Страница услуги'}>
      <ExternalLink href={cell.url} variant="body2" underline="hover" sx={{ whiteSpace: 'nowrap' }}>
        {hasPrice ? 'к цене на сайте ↗' : 'страница услуги ↗'}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {url.hostname}
          {url.pathname}
        </Typography>
      </ExternalLink>
    </Tooltip>
  );
}
