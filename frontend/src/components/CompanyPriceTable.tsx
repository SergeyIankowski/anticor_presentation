import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { categoryLabels, type PriceCell, type PriceRow } from '../lib/comparison.ts';
import { formatNumber, formatPrice } from '../lib/prices.ts';
import type { Company } from '../types.ts';

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

function PriceValue({ cell }: { cell: PriceCell }) {
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
        <Link
          href={cell.url ?? undefined}
          target="_blank"
          rel="noreferrer"
          underline="hover"
          color="inherit"
        >
          {cell.value == null ? (
            <Typography variant="body2" component="span" color="text.secondary">
              {cell.entries[0]?.text}
            </Typography>
          ) : (
            <span className="num">{formatPrice(cell.value, cell.currency, cell.isFrom)}</span>
          )}
        </Link>
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

function MarketAverage({ row }: { row: PriceRow }) {
  if (row.offeredCount === 1) {
    return (
      <Typography variant="body2" color="text.secondary">
        нет у других компаний
      </Typography>
    );
  }
  if (row.avg == null) return <Typography color="text.disabled">—</Typography>;
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

// Compares the company's price with the average of all companies that publish one. Only shown
// when someone else also has a price, otherwise the company is compared with itself.
function Difference({ cell, row }: { cell: PriceCell; row: PriceRow }) {
  if (cell.value == null || row.avg == null || row.pricedCount < 2) {
    return <Typography color="text.disabled">—</Typography>;
  }
  const percent = Math.round(((cell.value - row.avg) / row.avg) * 100);
  const sign = percent > 0 ? '+' : percent < 0 ? '−' : '';
  return (
    <Typography variant="body2" sx={{ fontWeight: 600 }} className="num">
      {`${sign}${Math.abs(percent)} %`}
    </Typography>
  );
}

// Opens the site page with the price; priced services scroll to and highlight their row.
function SourceLink({ cell }: { cell: PriceCell }) {
  if (!cell.url) return <Typography color="text.disabled">—</Typography>;
  const url = new URL(cell.url);
  const hasPrice = cell.status !== 'no-price';
  return (
    <Tooltip title={hasPrice ? 'Откроет страницу и подсветит строку с ценой' : 'Страница услуги'}>
      <Link
        href={cell.url}
        target="_blank"
        rel="noreferrer"
        variant="body2"
        underline="hover"
        sx={{ whiteSpace: 'nowrap' }}
      >
        {hasPrice ? 'к цене на сайте ↗' : 'страница услуги ↗'}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {url.hostname}
          {url.pathname}
        </Typography>
      </Link>
    </Tooltip>
  );
}

interface Props {
  company: Company;
  rows: PriceRow[];
}

export default function CompanyPriceTable({ company, rows }: Props) {
  const offered = rows.filter((row) => row.byCompany[company.domain].offered);
  const priced = offered.filter((row) => row.byCompany[company.domain].value != null).length;

  return (
    <section className="company-table">
      <Stack
        direction="row"
        sx={{ mb: 1, flexWrap: 'wrap', gap: 1, alignItems: 'baseline', columnGap: 2 }}
      >
        <Typography variant="h6" component="h3">
          {company.company.name}
        </Typography>
        <Link href={company.company.website} target="_blank" rel="noreferrer" variant="body2">
          {company.domain}
        </Link>
        <Typography variant="body2" color="text.secondary">
          Услуг: {offered.length} · с ценой для класса: {priced}
        </Typography>
      </Stack>
      <TableContainer component={Paper}>
        <Table size="small" aria-label={`Цены ${company.company.name}`}>
          <TableHead>
            <TableRow>
              <TableCell>Услуга</TableCell>
              <TableCell>Категория</TableCell>
              <TableCell align="right">Цена</TableCell>
              <TableCell align="right">Средняя по рынку</TableCell>
              <TableCell align="right">Разница со средней</TableCell>
              <TableCell>Где цена</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {offered.map((row) => {
              const cell = row.byCompany[company.domain];
              return (
                <TableRow key={row.id} hover className={`row-${row.category}`}>
                  <TableCell className="service-cell">
                    {row.label}
                    {row.offeredCount === 1 && (
                      <Tooltip title="Среди выбранных компаний эту услугу оказывает только эта">
                        <Chip size="small" variant="outlined" label="только здесь" sx={{ ml: 1 }} />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {categoryLabels[row.category]}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <PriceValue cell={cell} />
                  </TableCell>
                  <TableCell align="right">
                    <MarketAverage row={row} />
                  </TableCell>
                  <TableCell align="right">
                    <Difference cell={cell} row={row} />
                  </TableCell>
                  <TableCell>
                    <SourceLink cell={cell} />
                  </TableCell>
                </TableRow>
              );
            })}
            {offered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary">
                    Нет услуг этой компании в выбранной категории.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </section>
  );
}
