import assert from 'node:assert/strict';
import test from 'node:test';
import { parseKrownPrices } from '../src/prices.js';

const cell = (text, colspan = 1) => ({ text, colspan, rowspan: 1 });
const fixture = () => ({ url: 'https://krown.by/price/', tables: [
  { rows: [
    ['Полная обработка', 'Обработка днища', 'Повторная обработка'].map((text) => cell(text)),
    ['1', 'Легковой автомобиль (до 4,0 м)', '795 BYN', '725 BYN', '635 BYN'].map((text) => cell(text)),
    ['2', 'Рамный внедорожник', '1130 BYN', '1030 BYN', '935 BYN'].map((text) => cell(text)),
  ] },
  { rows: [
    ['Наименование услуги', 'Легковой', 'Кроссовер', 'Внедорожник'].map((text) => cell(text)),
    ['Мойка днища', 'от 112 BYN', 'от 119 BYN', 'от 141 BYN (без рамы) от 200 BYN (с рамой)'].map((text) => cell(text)),
    [cell('Озонирование салона'), cell('от 80,00 (все авто)', 3)],
  ] },
] });

test('KROWN maps each vehicle to primary, underbody and repeat prices', () => {
  const output = parseKrownPrices(fixture());
  assert.equal(output.services[0].prices[0].price, 795);
  assert.equal(output.services[1].prices[0].price, 725);
  assert.equal(output.services[2].prices[1].price, 935);
  assert.equal(output.vehicle_types.find((value) => value.name_original.includes('Рамный')).class, 'suv');
});

test('KROWN reflects updated source prices and retains ambiguous frame prices', () => {
  const page = fixture();
  page.tables[0].rows[1][2].text = '899 BYN';
  const output = parseKrownPrices(page);
  assert.equal(output.services[0].prices[0].price, 899);
  assert.equal(output.services[3].prices[0].price_min, 112);
  assert.equal(output.services[3].prices[2].price, null);
  assert.equal(output.services[3].prices[2].price_min, null);
  assert.equal(output.services[4].prices[0].price_min, 80);
  const any = output.vehicle_types.find((value) => value.class === 'any');
  assert.equal(output.services[4].prices[0].vehicle_type_id, any.id);
});

test('changed KROWN markup fails instead of replacing prices with an empty array', () => {
  assert.throws(() => parseKrownPrices({ tables: [], url: 'https://krown.by/price/' }), /refusing to publish/);
});
