import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from '../../../packages/harvest-core/node_modules/playwright/index.mjs';
import { enrichPage } from '../src/site.js';

test('Tilda enrichment separates description from conflicting badge and preserves rendered paragraph spacing', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`
      <div class="t-rec" id="rec-test"><div class="t778__col" data-product-lid="test">
        <div class="t778__price">650 р.</div>
        <div class="t778__title"><p>Микроавтобус</p><p>(в зависимости от базы),</p><p>стандартный комплекс</p></div>
        <div class="t778__descr">1150-1650 рублей</div>
      </div><div class="t778__col" data-product-lid="quote">
        <div class="t778__price">650 р.</div>
        <div class="t778__title">Лазерная очистка сварных швов</div>
        <div class="t778__descr">Цена по запросу</div>
      </div></div>
      <form><select><option>Appointment date</option></select></form>
      <div class="t_datepicker__body"><select><option>2026</option></select></div>
      <div><select class="t_datepicker__select t_datepicker__select_month"><option>October</option></select></div>
      <a href="mailto:example@example.org">Написать</a>
    `);
    const evidence = await enrichPage(page);
    assert.equal(
      evidence.price_cards[0].name_original,
      'Микроавтобус (в зависимости от базы), стандартный комплекс',
    );
    assert.equal(evidence.price_cards[0].offer_text, '1150-1650 рублей');
    assert.equal(evidence.price_cards[1].offer_text, 'Цена по запросу');
    assert.equal(evidence.price_cards[1].badge_text, '650 р.');
    assert.equal(evidence.price_controls.length, 0);
    assert.equal(evidence.contact_links[0].url, 'mailto:example@example.org');
  } finally {
    await browser.close();
  }
});
