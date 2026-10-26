import type { Price } from '../types.ts';

export interface NormalizedPrice {
  value: number | null;
  isFrom: boolean;
  text: string;
}

// Turns one schema price entry into a single comparable number. Exact prices win, "X–Y" ranges
// use the midpoint and "from X" prices use X (flagged with isFrom). Entries the parser could not
// read as a number keep only their original text.
export function normalizePrice(price: Price): NormalizedPrice {
  const text = price.price_text_original;
  if (price.price != null) return { value: price.price, isFrom: false, text };
  if (price.price_min != null && price.price_max != null) {
    return { value: (price.price_min + price.price_max) / 2, isFrom: false, text };
  }
  if (price.price_min != null) return { value: price.price_min, isFrom: true, text };
  return { value: null, isFrom: false, text };
}

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
