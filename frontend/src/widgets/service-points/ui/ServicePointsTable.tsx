import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useMemo } from 'react';
import type { Company } from '../../../shared/api/harvest.ts';
import DataTable from '../../../shared/ui/DataTable.tsx';
import EmptyValue from '../../../shared/ui/EmptyValue.tsx';
import ExternalLink from '../../../shared/ui/ExternalLink.tsx';
import { servicePoints } from '../model/servicePoints.ts';

const columns = [
  { label: 'Компания' },
  { label: 'Точек', align: 'right' as const },
  { label: 'Город' },
  { label: 'Адреса' },
];

interface Props {
  companies: Company[];
}

export default function ServicePointsTable({ companies }: Props) {
  const rows = useMemo(() => servicePoints(companies), [companies]);
  const total = rows.reduce((sum, row) => sum + (row.count ?? 0), 0);
  const unknown = rows.filter((row) => row.count == null).length;

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Всего точек: {total} · компаний: {rows.length}
        {unknown > 0 && ` · адрес не указан: ${unknown}`}
      </Typography>
      <DataTable label="Точки обслуживания компаний" columns={columns}>
        {rows.map((row) => (
          <TableRow key={row.domain} hover>
            <TableCell>
              {row.name}
              <ExternalLink href={row.website} variant="caption" sx={{ display: 'block' }}>
                {row.domain}
              </ExternalLink>
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
                <EmptyValue />
              )}
            </TableCell>
          </TableRow>
        ))}
      </DataTable>
    </>
  );
}
