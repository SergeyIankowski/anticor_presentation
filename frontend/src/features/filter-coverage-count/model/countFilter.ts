import { useState } from 'react';
import type { CoverageRow } from '../../../entities/service/index.ts';

// 'shared' = offered by two or more companies; a number = offered by exactly that many.
export type CountFilter = 'shared' | 'all' | number;

function matches(filter: CountFilter, count: number): boolean {
  if (filter === 'all') return true;
  if (filter === 'shared') return count > 1;
  return count === filter;
}

// Filters coverage rows by how many companies offer the service, most offered first.
export function useCountFilter(rows: CoverageRow[]) {
  const [chosen, setFilter] = useState<CountFilter>('shared');
  // One option per number of companies that actually occurs, largest first.
  const counts = [...new Set(rows.map((row) => row.count))].sort((a, b) => b - a);
  const shared = rows.filter((row) => row.count > 1).length;
  // Fall back when the company selection removes the chosen option.
  const filter: CountFilter =
    (chosen === 'shared' && shared === 0) ||
    (typeof chosen === 'number' && !counts.includes(chosen))
      ? 'all'
      : chosen;
  const visible = rows
    .filter((row) => matches(filter, row.count))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ru'));
  return { filter, setFilter, counts, shared, visible };
}
