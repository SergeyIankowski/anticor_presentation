import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { ServicePointRow } from '../lib/servicePoints.ts';

interface Props {
  rows: ServicePointRow[];
}

export default function ServicePointsTable({ rows }: Props) {
  const total = rows.reduce((sum, row) => sum + (row.count ?? 0), 0);
  const unknown = rows.filter((row) => row.count == null).length;

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Всего точек: {total} · компаний: {rows.length}
        {unknown > 0 && ` · адрес не указан: ${unknown}`}
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small" aria-label="Точки обслуживания компаний">
          <TableHead>
            <TableRow>
              <TableCell>Компания</TableCell>
              <TableCell align="right">Точек</TableCell>
              <TableCell>Город</TableCell>
              <TableCell>Адреса</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.domain} hover>
                <TableCell>
                  {row.name}
                  <Link
                    href={row.website}
                    target="_blank"
                    rel="noreferrer"
                    variant="caption"
                    sx={{ display: 'block' }}
                  >
                    {row.domain}
                  </Link>
                </TableCell>
                <TableCell align="right" className="num">
                  {row.count ?? (
                    <Typography variant="body2" color="text.secondary">
                      не указано
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{row.cities.join(', ') || '—'}</TableCell>
                <TableCell>
                  {row.addresses.length ? (
                    row.addresses.map((address) => (
                      <Typography key={address} variant="body2">
                        {address}
                      </Typography>
                    ))
                  ) : (
                    <Typography color="text.disabled">—</Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
