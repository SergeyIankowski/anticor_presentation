export function mean(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function formatPrice(
  value: number | null,
  currency?: string | null,
  isFrom = false,
): string {
  if (value == null) return '';
  return `${isFrom ? 'от ' : ''}${numberFormat.format(value)} ${currency ?? ''}`.trim();
}
