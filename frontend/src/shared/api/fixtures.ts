import type { Company } from './harvest.ts';

// Small fictional dataset for Storybook stories. Together the companies cover every display case:
// exact, range and "from" prices, a price kept only as text, services without a price, prices for
// another vehicle class, services offered by one company only and a company without prices.
export const fixtureCompanies: Company[] = [
  {
    domain: 'alpha.by',
    schema_version: '1.0',
    company: {
      name: 'Антикор Альфа',
      website: 'https://alpha.by/',
      locations: [
        { city: 'Минск', address: 'г. Минск, ул. Примерная, 1' },
        { city: 'Минск', address: 'г. Минск, пр-т Тестовый, 25' },
      ],
    },
    source: { scraped_at: '2026-10-27', urls: ['https://alpha.by/prices'] },
    currency: 'BYN',
    vehicle_types: [
      { id: 'sedan', name_original: 'Седан', class: 'sedan' },
      { id: 'business', name_original: 'Бизнес-седан', class: 'sedan' },
      { id: 'suv', name_original: 'Внедорожник', class: 'suv' },
    ],
    services: [
      {
        id: 'full',
        service_key: 'anticorrosion-full',
        category: 'anticorrosion',
        name_original: 'Полная обработка',
        url: 'https://alpha.by/prices',
        prices: [
          { vehicle_type_id: 'sedan', price: 450, price_text_original: '450 BYN' },
          { vehicle_type_id: 'business', price: 550, price_text_original: '550 BYN' },
          {
            vehicle_type_id: 'suv',
            price_min: 600,
            price_max: 800,
            price_text_original: '600–800 BYN',
          },
        ],
      },
      {
        id: 'underbody',
        service_key: 'anticorrosion-underbody',
        category: 'anticorrosion',
        name_original: 'Обработка днища',
        url: 'https://alpha.by/prices',
        prices: [
          { vehicle_type_id: 'sedan', price_min: 200, price_text_original: 'от 200 BYN' },
          { vehicle_type_id: 'suv', price: 300, price_text_original: '300 BYN' },
        ],
      },
      {
        id: 'ozone',
        service_key: 'alpha.by:ozone',
        category: 'additional',
        name_original: 'Озонирование салона',
        url: 'https://alpha.by/extra',
        prices: [{ vehicle_type_id: 'sedan', price: 60, price_text_original: '60 BYN' }],
      },
      {
        id: 'inspection',
        service_key: 'inspection',
        category: 'additional',
        name_original: 'Диагностика днища',
        url: 'https://alpha.by/inspection',
        prices: [],
      },
    ],
  },
  {
    domain: 'beta.by',
    schema_version: '1.0',
    company: {
      name: 'Бета Сервис',
      website: 'https://beta.by/',
      locations: [{ city: 'Гродно', address: 'г. Гродно, ул. Образцовая, 7' }],
    },
    source: { scraped_at: '2026-10-26', urls: ['https://beta.by/'] },
    currency: 'BYN',
    vehicle_types: [
      { id: 'car', name_original: 'Легковой', class: 'sedan' },
      { id: 'any', name_original: 'Любой автомобиль', class: 'any' },
    ],
    services: [
      {
        id: 'full',
        service_key: 'anticorrosion-full',
        category: 'anticorrosion',
        name_original: 'Комплексная обработка',
        url: 'https://beta.by/',
        prices: [{ vehicle_type_id: 'car', price: 600, price_text_original: '600 BYN' }],
      },
      {
        id: 'underbody',
        service_key: 'anticorrosion-underbody',
        category: 'anticorrosion',
        name_original: 'Днище',
        url: 'https://beta.by/',
        prices: [{ vehicle_type_id: 'car', price_text_original: 'по запросу' }],
      },
      {
        id: 'arches',
        service_key: 'anticorrosion-arches',
        category: 'anticorrosion',
        name_original: 'Арки и крылья',
        url: 'https://beta.by/',
        prices: [{ vehicle_type_id: 'any', price: 150, price_text_original: '150 BYN' }],
      },
      {
        id: 'cavities',
        service_key: 'anticorrosion-cavities',
        category: 'anticorrosion',
        name_original: 'Скрытые полости',
        url: 'https://beta.by/cavities',
        prices: [],
      },
    ],
  },
  {
    domain: 'gamma.by',
    schema_version: '1.0',
    company: { name: 'Гамма', website: 'https://gamma.by/' },
    source: { scraped_at: '2026-10-25', urls: ['https://gamma.by/'] },
    currency: 'BYN',
    vehicle_types: [],
    services: [
      {
        id: 'full',
        service_key: 'anticorrosion-full',
        category: 'anticorrosion',
        name_original: 'Антикоррозийная обработка',
        url: 'https://gamma.by/services',
        prices: [],
      },
      {
        id: 'cavities',
        service_key: 'anticorrosion-cavities',
        category: 'anticorrosion',
        name_original: 'Скрытые полости',
        url: 'https://gamma.by/services',
        prices: [],
      },
    ],
  },
];
