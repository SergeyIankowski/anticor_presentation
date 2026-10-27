// "1 компания", "3 компании", "5 компаний" (11–14 always take the plural genitive).
export function companiesLabel(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  if (last === 1 && lastTwo !== 11) return `${count} компания`;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${count} компании`;
  return `${count} компаний`;
}
