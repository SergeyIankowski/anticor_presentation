import Paper from '@mui/material/Paper';
import type { ReactNode } from 'react';
import './FiltersBar.css';

// Wide layout: view filters in a bar above the tables.
export default function FiltersBar({ children }: { children: ReactNode }) {
  return (
    <Paper className="filters" sx={{ mt: 3 }}>
      {children}
    </Paper>
  );
}
