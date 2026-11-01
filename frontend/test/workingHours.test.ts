import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseWorkingHours } from '../src/widgets/working-hours/model/workingHours.ts';

const cases: [string, number[]][] = [
  ['8:00 - 21:00 без выходных', [13, 13, 13, 13, 13, 13, 13]],
  ['Пн. - Вс. : 8:00 - 18:00', [10, 10, 10, 10, 10, 10, 10]],
  ['ПН-ПТ 10:00 – 19:00 СБ 12:00 – 15:00 (по договоренности)', [9, 9, 9, 9, 9, 3, 0]],
  ['ПН–СБ 9:00–21:00, ВС 10:00–18:00', [12, 12, 12, 12, 12, 12, 8]],
  ['ПН-Сб: 9 до 17', [8, 8, 8, 8, 8, 8, 0]],
  ['Пн - Пт: 09.00 - 19.00 Сб: 09.00 - 17.00 Вск - выходной', [10, 10, 10, 10, 10, 8, 0]],
  ['с 9.00 до 18.00 (вс выходной)', [9, 9, 9, 9, 9, 9, 0]],
  ['Ежедневно 09:00–18:00', [9, 9, 9, 9, 9, 9, 9]],
  [
    'С понедельника по пятницу с 9.00 до 18.00; Суббота и воскресенье с 11.00 до 16.00',
    [9, 9, 9, 9, 9, 5, 5],
  ],
];

test('free-text working hours become hours per weekday', () => {
  for (const [text, days] of cases) assert.deepEqual(parseWorkingHours(text)?.days, days, text);
});

test('hours without days assume Mon–Fri, text without times is unknown', () => {
  const nine = { open: 9, close: 18 };
  assert.deepEqual(parseWorkingHours('c 09:00 до 18:00'), {
    days: [9, 9, 9, 9, 9, 0, 0],
    slots: [nine, nine, nine, nine, nine, null, null],
    total: 45,
    daysAssumed: true,
  });
  assert.equal(parseWorkingHours('по договоренности'), null);
});
