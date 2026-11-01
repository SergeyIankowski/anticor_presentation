import { formatNumber } from '../../../shared/lib/number.ts';

export const formatHours = (hours: number) => `${formatNumber(Math.round(hours * 10) / 10)} ч`;

export const formatClock = (hours: number) => {
  const minutes = Math.round(hours * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};
