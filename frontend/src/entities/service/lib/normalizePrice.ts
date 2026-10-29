import type { Price } from '../../../shared/api/harvest.ts';

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
