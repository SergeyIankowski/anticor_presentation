import assert from 'node:assert/strict';
import test from 'node:test';
import { serviceKey, serviceLabel, withServiceKeys } from '../src/services.js';

const key = (name, domain = 'site.by') => serviceKey(domain, { id: 's', name_original: name });

test('whole-car treatment is matched across differently named sites', () => {
  const names = [
    'Полная обработка',
    'Полный комплекс обработки',
    'Базовый полный комплекс',
    'КОМПЛЕКСНАЯ ОБРАБОТКА',
    'Комплексная защита автомобиля от коррозии',
    'АНТИКОРРОЗИЙНАЯ ОБРАБОТКА',
    'АНТИКОРРОЗИЙНАЯ ОБРАБОТКА АВТОМОБИЛЕЙ',
  ];
  for (const name of names) assert.equal(key(name), 'anticorrosion-full', name);
  assert.equal(key('Антикоррозийная обработка днища автомобиля'), 'anticorrosion-underbody');
});

test('anticorrosion packages named "Стандарт" are not grouped with the KROWN car wash', () => {
  assert.equal(key('Стандарт Двухфазная ручная мойка кузова'), 'wash-standard');
  assert.equal(key('Стандарт', 'a.by'), 'a.by:s');
  assert.equal(key('Стандарт комплекс (новые авто)', 'b.by'), 'b.by:s');
});

test('welding and sandblasting variants get their own unified keys', () => {
  assert.equal(key('ПЕРЕВАРКА ПОРОГА (ПОРОГОВ)'), 'welding-sills');
  assert.equal(key('Фрагмент порога'), 'welding-sills');
  assert.equal(key('ПОСТАВИТЬ ЛАТКУ'), 'welding-patch');
  assert.equal(key('Латка (до 10 см)'), 'welding-patch');
  assert.equal(key('Переварка автомобиля: когда нужен сварочный ремонт'), 'welding');
  assert.equal(key('Выездной пескоструй на вашем объекте'), 'sandblasting-mobile');
  assert.equal(key('Пескоструй рам и прицепов'), 'sandblasting-frames');
  assert.equal(key('Пескоструй'), 'sandblasting');
  assert.equal(key('Днище кроссовера / минивэна'), 'sandblasting');
  assert.equal(key('Напыляемая шумоизоляция'), 'soundproofing');
});

test('service keys follow the id and keep the other fields in order', () => {
  const sheet = {
    services: [{ category: 'additional', id: 'x', name_original: 'Озонирование салона' }],
  };
  const keyed = withServiceKeys('krown.by', sheet);
  assert.deepEqual(Object.keys(keyed.services[0]), [
    'category',
    'id',
    'service_key',
    'name_original',
  ]);
  assert.equal(keyed.services[0].service_key, 'ozonation');
  assert.deepEqual(withServiceKeys('krown.by', keyed), keyed);
  assert.equal(serviceLabel('ozonation'), 'Озонирование салона');
  assert.equal(serviceLabel('krown.by:x'), undefined);
});
