import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from '../../../packages/harvest-core/node_modules/playwright/index.mjs';
import { enrichPage } from '../src/evidence.js';

test('enrichment clicks every state and reads changing rendered prices and misleading vehicle labels', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(`
      <div id="brand-buttons"><button data-brand="dinitrol" class="active">D</button><button data-brand="noxudol">N</button></div>
      <div><button data-class="minivan" class="active"></button>Кроссовер / Паркетник</div>
      <div><button data-class="suv"></button>Минивен</div>
      <table id="priceTable"><tr><th id="complex-1">Комплекс<br><p>Материал</p></th></tr><tr><td id="price-1">от 101</td></tr></table>
      <script>
        let brand = 'dinitrol', car = 'minivan';
        for (const button of document.querySelectorAll('button')) button.onclick = () => {
          const key = button.hasAttribute('data-brand') ? 'brand' : 'class';
          document.querySelectorAll('[data-' + key + ']').forEach(node => node.classList.remove('active'));
          button.classList.add('active');
          brand = document.querySelector('[data-brand].active').dataset.brand;
          car = document.querySelector('[data-class].active').dataset.class;
          document.querySelector('#price-1').textContent = 'от ' + ((brand === 'dinitrol' ? 100 : 200) + (car === 'minivan' ? 1 : 2));
        };
      </script>`);
    const { calculator } = await enrichPage(page);
    assert.equal(calculator.states.length, 4);
    assert.equal(calculator.vehicles[0].name_original, 'Кроссовер / Паркетник');
    assert.deepEqual(
      calculator.states.map((state) => state.packages[0].price_text_original),
      ['от 101', 'от 102', 'от 201', 'от 202'],
    );
  } finally {
    await browser.close();
  }
});
