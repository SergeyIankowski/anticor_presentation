import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

export interface Column {
  label: string;
  align?: 'right';
}

interface Props {
  /** Accessible name of the table. */
  label: string;
  columns: Column[];
  /** Message shown across the table; pass it only when there are no rows. */
  empty?: ReactNode;
  children: ReactNode;
}

// Compact outlined table with a header row; the caller renders the body rows.
export default function DataTable({ label, columns, empty, children }: Props) {
  return (
    <TableContainer component={Paper}>
      <Table size="small" aria-label={label}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.label} align={column.align}>
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {children}
          {empty && (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <Typography color="text.secondary">{empty}</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
