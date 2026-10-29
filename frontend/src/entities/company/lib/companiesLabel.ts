import { pluralRu } from '../../../shared/lib/plural.ts';

// "1 компания", "3 компании", "5 компаний".
export function companiesLabel(count: number): string {
  return `${count} ${pluralRu(count, ['компания', 'компании', 'компаний'])}`;
}
