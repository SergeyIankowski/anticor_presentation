import type { Company } from '../../../shared/api/harvest.ts';

export const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

export interface OpenSlot {
  /** Hours since midnight, e.g. 9.5 for 09:30. */
  open: number;
  close: number;
}

/** Average weeks per month, for monthly totals. */
export const WEEKS_PER_MONTH = 52 / 12;

export interface WeekSchedule {
  /** Opening hours per weekday (Mon first); 0 when closed. */
  days: number[];
  /** Open and close time per weekday (Mon first); null when closed. */
  slots: (OpenSlot | null)[];
  total: number;
  /** True when the text gives hours but no days, so Mon–Fri is assumed. */
  daysAssumed: boolean;
}

export interface WorkingHoursRow extends WeekSchedule {
  domain: string;
  name: string;
  text: string;
}

const dayPatterns: [RegExp, number][] = [
  [/^(пн|понедельник)/, 0],
  [/^(вт|вторник)/, 1],
  [/^(ср|сред)/, 2],
  [/^(чт|четверг)/, 3],
  [/^(пт|пятниц)/, 4],
  [/^(сб|суббот)/, 5],
  [/^(вс|воскресень)/, 6],
];
const dayToken =
  /(понедельник\p{L}*|вторник\p{L}*|сред\p{L}*|четверг\p{L}*|пятниц\p{L}*|суббот\p{L}*|воскресень\p{L}*|вск|пн|вт|ср|чт|пт|сб|вс)\.?/gu;
const timeRange = /(\d{1,2})(?:[:.](\d{2}))?\s*(?:-|–|—|до)\s*(\d{1,2})(?:[:.](\d{2}))?/g;
const all = [0, 1, 2, 3, 4, 5, 6];

const dayIndex = (token: string) => dayPatterns.find(([re]) => re.test(token))?.[1] ?? -1;

// Days named in a fragment: "пн-пт", "пн. - вс.", "с понедельника по пятницу", "суббота и воскресенье".
function parseDays(text: string): number[] {
  if (/ежедневно|без выходных/.test(text)) return all;
  const tokens = [...text.matchAll(dayToken)];
  const days = new Set<number>();
  tokens.forEach((match, i) => {
    const day = dayIndex(match[1]);
    const prev = tokens[i - 1];
    const between = prev ? text.slice(prev.index + prev[0].length, match.index) : '';
    if (prev && /^\s*\.?\s*(-|–|—|по)\s*$/.test(between)) {
      for (let d = dayIndex(prev[1]); d <= day; d++) days.add(d);
    } else days.add(day);
  });
  return [...days];
}

// Parses free-text Russian opening hours into hours per weekday; null when no time range is found.
export function parseWorkingHours(raw: string): WeekSchedule | null {
  const text = raw.toLowerCase();
  const ranges = [...text.matchAll(timeRange)];
  if (ranges.length === 0) return null;
  const slots: (OpenSlot | null)[] = Array(7).fill(null);
  let daysAssumed = false;
  let cursor = 0;
  ranges.forEach((match, i) => {
    const [, h1, m1 = '0', h2, m2 = '0'] = match;
    const slot = { open: Number(h1) + Number(m1) / 60, close: Number(h2) + Number(m2) / 60 };
    let target = parseDays(text.slice(cursor, match.index));
    if (target.length === 0 && i === 0) {
      const rest = text.slice(match.index);
      if (/ежедневно|без выходных/.test(text)) target = all;
      else if (/выходн/.test(rest)) {
        const off = new Set(parseDays(rest.slice(rest.search(/\(|\s(?=\p{L})/u))));
        target = all.filter((d) => !off.has(d));
      } else {
        target = all.slice(0, 5);
        daysAssumed = true;
      }
    }
    for (const d of target) slots[d] = slot;
    cursor = match.index + match[0].length;
  });
  const days = slots.map((slot) => (slot ? slot.close - slot.open : 0));
  return { days, slots, total: days.reduce((sum, h) => sum + h, 0), daysAssumed };
}

// One row per company with parseable hours, longest week first. A company with several
// locations is shown by its location open the longest.
export function workingHoursRows(companies: Company[]): WorkingHoursRow[] {
  return companies
    .flatMap((company) => {
      const best = (company.company.locations ?? [])
        .flatMap((location) => {
          const text = location.working_hours;
          const schedule = text ? parseWorkingHours(text) : null;
          return schedule ? [{ ...schedule, text: text as string }] : [];
        })
        .sort((a, b) => b.total - a.total)[0];
      return best ? [{ ...best, domain: company.domain, name: company.company.name }] : [];
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'ru'));
}
