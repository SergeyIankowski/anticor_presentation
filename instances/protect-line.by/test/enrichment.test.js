import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from '../../../packages/harvest-core/node_modules/playwright/index.mjs';
import { enrichPage } from '../src/site.js';

test('extracts animation-hidden Elementor cards without confusing unrelated amounts', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route('**/*', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: `
      <meta charset="utf-8"><style>.elementor-invisible { visibility: hidden; }</style>
      <a href="tel:+375298290730">+375-29-829-07-30</a>
      <main><h1>Цены на обработку</h1><p>Подготовка и защита автомобилей любых марок от ржавчины.</p>
      <div class="e-con e-parent elementor-invisible"><div class="e-con e-child">
      <p><a href="/antikorroziynaya-obrabotka-kapota/">КАПОТ</a></p><p>ОТ 92 РУБ</p>
      </div></div><p>Защита до 5 лет. УНП: 491731716</p></main>`,
      }),
    );
    await page.goto('https://protect-line.by/');
    const snapshot = await enrichPage(page);
    assert.equal(snapshot.price_cards.length, 1);
    assert.equal(snapshot.price_cards[0].price_text_original, 'ОТ 92 РУБ');
    assert.equal(
      snapshot.price_cards[0].target_url,
      'https://protect-line.by/antikorroziynaya-obrabotka-kapota/',
    );
    assert(snapshot.text.includes('КАПОТ ОТ 92 РУБ'));
    assert.equal(snapshot.contact_links[0].url, 'tel:+375298290730');
    assert.deepEqual(snapshot.price_controls, []);
  } finally {
    await browser.close();
  }
});
