import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { priceSourceUrl, serviceAnchorText } from '../src/lib/links.ts';
import type { CompanySheet } from '../src/types.ts';
import { harvestedDomains, instancesDir } from './instances.ts';

const readJson = (path: string) => JSON.parse(readFileSync(new URL(path, instancesDir), 'utf8'));

test('serviceAnchorText keeps the row label and drops descriptions and headings', () => {
  assert.equal(serviceAnchorText('Стандарт Двухфазная ручная мойка кузова'), 'Стандарт');
  assert.equal(
    serviceAnchorText('Мойка днища с "Антисолью" Мойка днища на подъёмнике'),
    'Мойка днища с "Антисолью"',
  );
  assert.equal(serviceAnchorText('Комплекс №1 “Стандарт плюс” + пылесос'), 'Комплекс №1');
  assert.equal(
    serviceAnchorText('КОМПЛЕКС №3 «БЕСШУМКА» ЭКО (DINITROL)'),
    'КОМПЛЕКС №3 «БЕСШУМКА»',
  );
  assert.equal(serviceAnchorText('Озонирование салона (удаление запахов)'), 'Озонирование салона');
});

test('priceSourceUrl adds a text fragment only when the service has prices', () => {
  const service = {
    id: 's',
    service_key: 'krown.by:s',
    category: 'additional' as const,
    name_original: 'Мойка двигателя сверху Мойка двигателя',
    url: 'https://krown.by/price/',
    prices: [{ vehicle_type_id: 'v', price: 47, price_text_original: '47' }],
  };
  assert.equal(
    priceSourceUrl(service),
    'https://krown.by/price/#:~:text=%D0%9C%D0%BE%D0%B9%D0%BA%D0%B0%20%D0%B4%D0%B2%D0%B8%D0%B3%D0%B0%D1%82%D0%B5%D0%BB%D1%8F%20%D1%81%D0%B2%D0%B5%D1%80%D1%85%D1%83',
  );
  assert.equal(priceSourceUrl({ ...service, prices: [] }), 'https://krown.by/price/');
  assert.equal(
    priceSourceUrl({ ...service, name_original: 'Анти-коррозия' })?.endsWith(
      '%2D%D0%BA%D0%BE%D1%80%D1%80%D0%BE%D0%B7%D0%B8%D1%8F',
    ),
    true,
  );
});

// A text fragment cannot match across table cells or blocks, so look for the anchor inside a
// single line/cell of the harvested page text.
test('every priced service anchor is present on its harvested page', () => {
  const normalize = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();
  for (const domain of harvestedDomains()) {
    const company: CompanySheet = readJson(`${domain}/parsed/company.json`);
    const pages = readJson(`${domain}/parsed/presentation_data.json`).content.pages as {
      url: string;
      text: string;
    }[];
    for (const service of company.services.filter((s) => s.prices.length && s.url)) {
      const page = pages.find((candidate) => candidate.url === service.url);
      assert.ok(page, `${domain}: page ${service.url} was not harvested`);
      const anchor = normalize(serviceAnchorText(service.name_original));
      const cells = page.text.split(/[\n\t]/).map(normalize);
      assert.ok(
        cells.some((cell) => cell.includes(anchor)),
        `${domain}: "${anchor}" not found on ${service.url}`,
      );
    }
  }
});
