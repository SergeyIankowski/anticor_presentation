import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from '../../../packages/harvest-core/node_modules/playwright/index.mjs';
import site from '../src/site.js';

test('enrichment preserves adjacent price blocks and excludes noscript markup', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(
      '<section><noscript>wrong image markup</noscript><h3>Легковые автомобили</h3><p>Model One</p><p><b>Комплекс ЛАЙТ:</b> от 101р</p><p><b>Комплекс СТАНДАРТ:</b> от 202р</p></section><div class="elementor-price-list-text"><span class="elementor-price-list-title">Полировка фар</span><span class="elementor-price-list-price">77 руб</span><p class="elementor-price-list-description">Цена указана за пару.</p></div>',
    );
    const { proficor } = await site.enrichPage(page);
    assert.match(proficor.price_cards[0].text, /101р Комплекс СТАНДАРТ/);
    assert.doesNotMatch(proficor.price_cards[0].text, /wrong image/);
    assert.equal(proficor.polishing[0].price, '77 руб');
    assert.equal(proficor.dynamic_price_control_count, 0);
  } finally {
    await browser.close();
  }
});
