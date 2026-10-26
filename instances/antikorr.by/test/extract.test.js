import assert from 'node:assert/strict';
import test from 'node:test';
import { parseLocations } from '../src/extract.js';
import { parsePriceVariants, parseWashPrices } from '../src/prices.js';

function calculatorFixture() {
  const brands = [
    { id: '1', name: 'DINITROL' },
    { id: '2', name: 'Noxudol' },
  ];
  const vehicles = [
    { id: '1', name: 'Легковой автомобиль до 4м' },
    { id: '2', name: 'Легковой автомобиль 4-5 метров' },
  ];
  const variants = brands.flatMap((brand) =>
    vehicles.map((vehicle) => ({
      brand,
      vehicle,
      packages: [
        {
          id: '1',
          name: 'Комплекс №1',
          description: brand.name,
          price_text_original: brand.id === '1' ? '495-710 BYN' : 'от 480 BYN',
        },
        {
          id: '2',
          name: 'Комплекс №2',
          description: brand.name,
          price_text_original: vehicle.id === '1' ? '565 BYN' : 'от 780 BYN',
        },
      ],
    })),
  );
  return { brands, vehicles, variants };
}

test('Antikorr keeps brand and vehicle prices separate and preserves ranges', () => {
  const { services, vehicle_types } = parsePriceVariants(
    calculatorFixture(),
    'https://antikorr.by/tsenyi/',
  );
  assert.equal(services.length, 4);
  assert.equal(vehicle_types.length, 2);
  assert.equal(vehicle_types[0].class, 'small');
  assert.equal(services[0].prices[0].price, null);
  assert.equal(services[0].prices[0].price_min, 495);
  assert.equal(services[0].prices[0].price_max, 710);
  assert.equal(services[2].prices[0].price_min, 480);
  assert.match(services[2].name_original, /Noxudol/);
});

test('Antikorr rejects incomplete coverage and missing prices', () => {
  const incomplete = calculatorFixture();
  incomplete.variants.pop();
  assert.throws(() => parsePriceVariants(incomplete, 'https://antikorr.by/tsenyi/'), /coverage/);
  const missing = calculatorFixture();
  missing.variants[0].packages[0].price_text_original = 'уточняйте';
  assert.throws(() => parsePriceVariants(missing, 'https://antikorr.by/tsenyi/'), /Unrecognized/);
});

test('Antikorr preserves negotiated prices without inventing an amount', () => {
  const fixture = calculatorFixture();
  fixture.variants[0].packages[0].price_text_original = 'договор. BYN';
  const { services } = parsePriceVariants(fixture, 'https://antikorr.by/tsenyi/');
  const price = services[0].prices[0];
  assert.equal(price.price, null);
  assert.equal(price.price_min, null);
  assert.equal(price.price_max, null);
  assert.equal(price.price_text_original, 'договор. BYN');
  assert.match(price.notes, /Цена договорная/);
  fixture.variants[0].packages[0].price_text_original = 'договорная BYN';
  assert.equal(
    parsePriceVariants(fixture, 'https://antikorr.by/tsenyi/').services[0].prices[0].price,
    null,
  );
});

test('Antikorr reads the separate wash table and preserves unavailable service labels', () => {
  const cell = (text) => ({ text });
  const page = {
    tables: [
      {
        rows: [
          ['Вид автомобиля', 'Легковой автомобиль', 'Минивэн', 'Внедорожник', 'Микроавтобус'].map(
            cell,
          ),
          ['Мойка без снятия защиты', '60', '70', 'от 150', 'не обслуживаем'].map(cell),
        ],
      },
    ],
  };
  const vehicles = [];
  const prices = parseWashPrices(page, vehicles);
  assert.equal(vehicles.length, 4);
  assert.equal(prices[0].price, 60);
  assert.equal(prices[2].price_min, 150);
  assert.equal(prices[3].price, null);
  assert.equal(prices[3].price_text_original, 'не обслуживаем');
});

test('Antikorr contacts pair the correct phone with each address and deduplicate headers', () => {
  const text = [
    'Минск, пр-т Независимости 95/18',
    '+375 (29) 150-7000',
    'Минск, ул. Шаранговича 19',
    '+375 (29) 601-5500',
    'c 8.00 до 21.00',
    'без выходных',
  ].join('\n');
  const locations = parseLocations([text, text].join('\n'));
  assert.equal(locations.length, 2);
  assert.equal(locations[0].phones[0], '+375 (29) 150-7000');
  assert.equal(locations[1].phones[0], '+375 (29) 601-5500');
  assert.match(locations[0].working_hours, /21.00 без выходных/);
});
