import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePackages, readSiteDetails } from '../../../instances/antikorim.by/src/prices.js';
import { launchBrowser } from '../src/browser.js';

test('Antikorim captures every package selector state after the price updates', async () => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(`<main><section id="types">${['standard', 'standard-plus', 'premium']
      .map(
        (id, index) => `
      <article class="package-card"><h3>${id}</h3><p class="package-subtitle">Защита кузова</p>
      <ul class="package-features"><li>Мойка и сушка</li></ul>
      <div class="js-package-price" data-package="${id}" data-base="${750 + index * 300}">
      ${['car', 'crossover', 'suv', 'maxi'].map((v, i) => `<button class="package-segment ${i === 0 ? 'is-active' : ''}" data-vehicle="${v}" data-index="${i}">${v}</button>`).join('')}
      <div class="js-package-price-value">от ${750 + index * 300} р</div>
      <div class="js-package-price-note">Категория car</div></div></article>`,
      )
      .join('')}</section></main>
      <script>document.addEventListener('click', (event) => {
        const button = event.target.closest('button'); if (!button) return;
        const root = button.closest('[data-package]');
        root.querySelectorAll('button').forEach(b => b.classList.remove('is-active'));
        button.classList.add('is-active');
        setTimeout(() => {
          root.querySelector('.js-package-price-value').textContent = 'от ' + (Number(root.dataset.base) + Number(button.dataset.index) * 100) + ' р';
          root.querySelector('.js-package-price-note').textContent = 'Категория ' + button.dataset.vehicle;
        }, 30);
      });</script>`);
    const details = await readSiteDetails(page);
    const result = parsePackages({
      ...details,
      url: 'https://antikorim.by/antikorrozijnaya-obrabotka-avto',
    });
    assert.deepEqual(
      result.services[0].prices.map((price) => price.price_min),
      [750, 850, 950, 1050],
    );
    assert.deepEqual(
      result.services[2].prices.map((price) => price.price_min),
      [1350, 1450, 1550, 1650],
    );
    assert.equal(details.price_packages.flatMap((item) => item.variants).length, 12);
    assert.equal(details.price_packages[1].variants[3].description, 'Категория maxi');
  } finally {
    await browser.close();
  }
});
