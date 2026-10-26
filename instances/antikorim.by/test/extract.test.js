import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCompany } from '../src/extract.js';
import { normalizedPrice, parsePackages } from '../src/prices.js';

test('Antikorim preserves qualified, per-unit, and quote-only prices', () => {
  const from = normalizedPrice('от 1 100 р', 'any');
  assert.equal(from.price, null);
  assert.equal(from.price_min, 1100);
  assert.equal(from.price_text_original, 'от 1 100 р');
  assert.equal(normalizedPrice('80 р / арка', 'any').price, 80);
  assert.equal(normalizedPrice('от 50 р/шт.', 'any').price_min, 50);
  const quote = normalizedPrice('по запросу', 'any');
  assert.deepEqual([quote.price, quote.price_min, quote.price_max], [null, null, null]);
  assert.throws(() => normalizedPrice('уточнить', 'any'), /Unrecognized/);
});

test('Antikorim validates complete package coverage without conflating vehicle classes', () => {
  const page = {
    url: 'https://antikorim.by/antikorrozijnaya-obrabotka-avto',
    price_packages: ['standard', 'standard-plus', 'premium'].map((id, index) => ({
      id,
      name: id,
      description: 'Защита кузова',
      features: ['Мойка'],
      variants: ['car', 'crossover', 'suv', 'maxi'].map((vehicle_id, vehicleIndex) => ({
        vehicle_id,
        label: vehicle_id,
        description: `${vehicle_id} категория`,
        price_text: `от ${700 + index * 100 + vehicleIndex * 50} р`,
      })),
    })),
  };
  const result = parsePackages(page);
  assert.equal(result.services.length, 3);
  assert.equal(result.vehicle_types.find((vehicle) => vehicle.id === 'suv').class, 'van');
  assert.deepEqual(
    result.services[2].prices.map((price) => price.price_min),
    [900, 950, 1000, 1050],
  );
  page.price_packages[1].variants.pop();
  assert.throws(() => parsePackages(page), /Incomplete/);
});

test('Antikorim workshop address is distinct from its legal registration address', () => {
  const company = parseCompany({
    body_text:
      'Компания: ООО «АвтоПрофКузов»\nЮр. адрес: ул. Берута, 3Б\nг. Минск, ст. м. Могилёвская, ул. Промышленная 11к11\n+375 33 617-00-44\nПН-ПТ с 9:00 до 18:00',
  });
  assert.equal(company.locations.length, 1);
  assert.match(company.locations[0].address, /Промышленная/);
  assert.doesNotMatch(company.locations[0].address, /Берута/);
  assert.throws(() => parseCompany({ body_text: 'Контакты отсутствуют' }), /markup changed/);
});
