// Picks the Russian plural form for a count: [one, few, many] as in "компания", "компании",
// "компаний" (11–14 always take the plural genitive).
export function pluralRu(count: number, [one, few, many]: [string, string, string]): string {
  const lastTwo = count % 100;
  const last = count % 10;
  if (last === 1 && lastTwo !== 11) return one;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return few;
  return many;
}
