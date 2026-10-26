import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from '../../../packages/harvest-core/node_modules/playwright/index.mjs';
import { enrichPage } from '../src/evidence.js';

test('DOM extraction reads price cards and both responsive service lists while ignoring comments', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`
      <style>.mobile{display:none}@media(max-width:600px){.desktop{display:none}.mobile{display:block}}</style>
      <div id="promo"></div><section>
        <h3 class="desktop">КУЗОВНОЙ РЕМОНТ<br>АНТИКОРРОЗИЙНАЯ ОБРАБОТКА<!-- installation not offered --></h3>
        <h3 class="mobile">КУЗОВНОЙ РЕМОНТ, ПОКРАСКА<br>АНТИКОРРОЗИЙНАЯ ОБРАБОТКА<br>РЕМОНТ ПЛАСТИКА</h3>
        <h3>РАССРОЧКА 0% НА 6 МЕСЯЦЕВ</h3>
      </section>
      <div id="ceni"><div class="kl-iconbox">
        <div class="kl-iconbox__title-wrapper"><h3>Седан</h3></div>
        <div class="kl-iconbox__desc-wrapper"><h3>от 411,50 Руб.</h3></div>
      </div></div>
      <div>GPS - 55.156837, 30.150785</div>
    `);
    const { responsive_evidence: evidence, text } = await enrichPage(page);
    assert.deepEqual(evidence.desktop.hero_services, [
      'КУЗОВНОЙ РЕМОНТ',
      'АНТИКОРРОЗИЙНАЯ ОБРАБОТКА',
    ]);
    assert.deepEqual(evidence.mobile.hero_services, [
      'КУЗОВНОЙ РЕМОНТ, ПОКРАСКА',
      'АНТИКОРРОЗИЙНАЯ ОБРАБОТКА',
      'РЕМОНТ ПЛАСТИКА',
    ]);
    assert.deepEqual(evidence.desktop.price_cards, evidence.mobile.price_cards);
    assert.equal(evidence.desktop.price_cards.length, 1);
    assert.equal(evidence.desktop.price_cards[0].price_text_original, 'от 411,50 Руб.');
    assert.ok(text.includes('РЕМОНТ ПЛАСТИКА'));
    assert.ok(!text.includes('installation not offered'));
    assert.deepEqual(page.viewportSize(), { width: 1280, height: 720 });
  } finally {
    await browser.close();
  }
});
