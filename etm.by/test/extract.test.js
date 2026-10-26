import assert from 'node:assert/strict';
import test from 'node:test';
import { completionTime, parseEtmLocations } from '../src/extract.js';

test('ETM contact parser keeps each branch phone and hours within its own section', () => {
  const result = parseEtmLocations(`Контактная информация
Центр антикоррозионной обработки в г. Минск
Телефоны
+375 (44) 776-71-88
Режим работы
Пн - Пт: 09.00 - 18.00
Сб, Вск - выходной
Адрес
г. Минск, пер. Солтыса, 5/1
Центр антикоррозионной обработки в г. Брест
Телефоны
+375 (29) 722-59-89
Режим работы
Пн - Пт: 09.00 - 18.00
Сб, Вск - выходной
Адрес
г. Брест,
ул. Спокойная, 5`);
  assert.equal(result.length, 2);
  assert.equal(result[0].city, 'Минск');
  assert.deepEqual(result[0].phones, ['+375 (44) 776-71-88']);
  assert.deepEqual(result[1].phones, ['+375 (29) 722-59-89']);
  assert.match(result[1].address, /Спокойная/);
});

test('ETM treatment duration is distinguished from an aftercare period', () => {
  const value = completionTime('Полная обработка занимает около 2 суток. После работ в течение 1 суток не стоит ездить по грунту.');
  assert.equal(value.min, 2);
  assert.equal(value.unit, 'days');
  assert.equal(completionTime('После обработки ждать 1 сутки.'), null);
});
