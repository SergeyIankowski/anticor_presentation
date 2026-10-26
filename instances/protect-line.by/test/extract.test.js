import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildSite, parseServices } from '../src/extract.js';

const base = 'https://protect-line.by/';
const paths = ['antikorroziynaya-obrabotka-kapota/', 'peskostruinaya-obrabotka/'];
function fixture(cardPrice = 'ОТ 71 РУБ') {
  const home = {
    url: base,
    title: 'Protect-Line',
    headings: [{ level: 2, text: 'PROTECT-LINE' }],
    text: `автомобилей любых марок КАПОТ ${cardPrice}`,
    body_text:
      'автомобилей любых марок\nа.г. Ерёмино, ул. Ларисы Васильевой, 6\nИндивидуальный предприниматель\nЗакревский Денис Андреевич\nУНП: 491731716',
    paragraphs: ['Качественная подготовка гарантирует защиту.'],
    contact_links: [{ text: '+375-29-829-07-30', url: 'tel:+375298290730' }],
    price_cards: [
      {
        label: 'КАПОТ',
        target_url: base + paths[0],
        price_text_original: cardPrice,
        source_url: base,
        text_original: `КАПОТ ${cardPrice}`,
      },
    ],
  };
  const hood = {
    url: base + paths[0],
    title: 'Капот',
    headings: [{ level: 2, text: 'Антикоррозийная обработка капота авто в Гомеле' }],
    text: 'Антикоррозийная обработка капота авто в Гомеле. Как правило, стоимость нанесения антикора только на капот составляет от 79 рублей. Часто эта услуга входит в комплексную защиту кузова (днище, арки, скрытые полости), где цена может начинаться от 950 рублей за весь автомобиль. Сушка от 4 до 12 часов, защита до 3–5 лет.',
    paragraphs: ['Применяются ML-составы на восковой основе.'],
    body_text: '',
  };
  const extra = {
    url: base + paths[1],
    title: 'Пескоструй',
    headings: [{ level: 2, text: 'Пескоструйная обработка кузова' }],
    text: 'Пескоструйная обработка кузова. Стоимость рассчитывается индивидуально.',
    paragraphs: ['Применяется абразивная обработка.'],
    body_text: '',
  };
  return [home, hood, extra];
}

test('reads current lower-bound amounts and keeps conflicting sources, units and qualifiers', () => {
  const { services, priceEvidence, warnings } = parseServices(fixture('ОТ 88 РУБ'));
  const homeOffer = services.find((service) => service.url === base);
  const articleOffer = services.find((service) => service.id.endsWith('-article'));
  assert.equal(services.length, 4);
  assert.equal(homeOffer.name_original, 'КАПОТ');
  assert.equal(homeOffer.prices.length, 1);
  assert.equal(homeOffer.prices[0].price_min, 88);
  assert.equal(articleOffer.url, base + paths[0]);
  assert.equal(articleOffer.prices.length, 1);
  assert.equal(articleOffer.prices[0].price_min, 79);
  assert.equal(homeOffer.prices[0].price, null);
  assert.equal(articleOffer.prices[0].price, null);
  assert.equal(services[0].prices[0].price_text_original, 'ОТ 88 РУБ');
  assert(services[0].prices[0].notes.includes(base));
  assert(warnings.some((warning) => warning.includes('Расхождение')));
  assert.equal(priceEvidence[0].unit_original, null);
  assert.equal(priceEvidence.at(-1).unit_original, 'за весь автомобиль');
  assert.equal(services.at(-1).prices[0].price_min, 950);
  assert.equal(services[0].completion_time, null);
});

test('homepage offers retain article headings and URLs only as descriptive evidence', () => {
  const pages = fixture();
  const { services, articleEvidence, priceEvidence } = parseServices(pages);
  const offer = services.find((service) => service.name_original === 'КАПОТ');
  assert.equal(offer.url, pages[0].url);
  assert(offer.description.includes(pages[1].headings[0].text));
  assert(offer.description.includes(pages[1].url));
  assert.equal(articleEvidence[0].service_id, offer.id);
  assert.equal(articleEvidence[0].name_original, pages[1].headings[0].text);
  assert.equal(articleEvidence[0].url, pages[1].url);
  assert.equal(priceEvidence[0].service_id, offer.id);
  assert.equal(priceEvidence[0].service_url, pages[0].url);
  assert.equal(priceEvidence[0].target_url, pages[1].url);
});

test('does not derive prices from drying times, protection years or absent old prices', () => {
  const pages = fixture();
  pages[1].text = `${pages[1].headings[0].text}. Сушка 4–12 часов. Защита 3–5 лет.`;
  const { services } = parseServices(pages);
  assert.equal(services.length, 2);
  assert.equal(services[0].prices.length, 1);
  assert.deepEqual(services[1].prices, []);
});

test('builds both schema contracts with source anchors and company evidence', async () => {
  const { validateJson } = await import('@anticor/harvest-core');
  const pages = fixture();
  const { comparison, harvest } = buildSite(pages, '2026-10-26');
  await validateJson(comparison, new URL('../../../schema.json', import.meta.url).pathname);
  await validateJson(
    harvest,
    new URL('../../../schemas/site-harvest.schema.json', import.meta.url).pathname,
  );
  for (const service of comparison.services) {
    const page = pages.find((item) => item.url === service.url);
    assert(page.text.includes(service.name_original));
    assert.equal(new URL(service.url).hash, '');
    for (const price of service.prices) {
      assert(page.text.includes(price.price_text_original));
      assert(price.notes.endsWith(service.url));
    }
  }
  assert.equal(harvest.service_details.length, 2);
  assert.deepEqual(comparison.company.locations[0].phones, ['+375298290730']);
  assert.equal(harvest.company.legal_entity.unp, '491731716');
  assert(harvest.materials.some((item) => item.text.includes('ML')));
  assert.deepEqual(comparison.vehicle_types, [
    { id: 'any', name_original: 'автомобилей любых марок', class: 'any' },
  ]);
});

test('fails closed when homepage price card evidence disappears', () => {
  const pages = fixture();
  pages[0].price_cards = [];
  assert.throws(() => parseServices(pages), /Expected one live homepage price card/);
});

test('parse entry point stays byte-for-byte equal to the shared template', async () => {
  assert.equal(
    await readFile(new URL('../src/parse.js', import.meta.url), 'utf8'),
    await readFile(new URL('../../../template/src/parse.js', import.meta.url), 'utf8'),
  );
});
