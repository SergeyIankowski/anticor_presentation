import type { PriceRow } from '../../../entities/service/index.ts';

// Splits long service names into lines so the category axis stays readable on narrow screens.
export function wrapLabel(label: string, width = 28): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of label.split(' ')) {
    if (line && `${line} ${word}`.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Several sites have their own packages with the same name ("Стандарт", "Премиум"), so a
// price from a single company carries that company's name.
export function rowLabel(row: PriceRow): string {
  return row.pricedBy.length === 1 ? `${row.label} · ${row.pricedBy[0]}` : row.label;
}
