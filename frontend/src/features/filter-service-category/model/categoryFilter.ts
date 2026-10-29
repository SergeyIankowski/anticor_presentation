import type { ServiceCategory } from '../../../shared/api/harvest.ts';

export type CategoryFilter = ServiceCategory | 'all';

export const matchesCategory = (filter: CategoryFilter, category: ServiceCategory) =>
  filter === 'all' || category === filter;
