import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePackages, readSiteDetails } from '../../../instances/antirzha.by/src/prices.js';
import { launchBrowser } from '../src/browser.js';

test('Antirzha waits for selected vehicle state and ignores duplicate mobile cards', async () => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    const names = ['Легковой', 'Кроссовер', 'Рамный'];
    const html = `<main><section id="ceny">
      ${names.map((name, index) => `<button aria-pressed="${index === 1}" data-index="${index}"><span>${name}</span><span>категория ${index}</span></button>`).join('')}
      ${['prof', 'standart', 'restavr', 'premium']
        .map(
          (id, index) => `
        <article data-pricing-card="${id}" data-index="${index}"><div>
        <h3>${id}</h3><div><span>от</span><b>${1700 + index * 500}</b><span>BYN</span></div>
        <span>гарантия 7 лет</span><p>Защита кузова</p><div><b>2–3 дня</b></div></div>
        <ul><li>Днище</li></ul><dl><div><dt>Сервис</dt><dd>осмотр — 0 BYN</dd></div></dl></article>
        <article hidden><h3>${id}</h3><b>99999</b></article>`,
        )
        .join('')}
      </section><section><details><summary>Вопрос<span aria-hidden="true">+</span></summary><p>Ответ скрыт до раскрытия</p></details></section></main>
      <script>document.addEventListener('click', event => {
        const button = event.target.closest('button'); if (!button) return;
        setTimeout(() => {
          document.querySelectorAll('button').forEach(node => node.setAttribute('aria-pressed', String(node === button)));
          document.querySelectorAll('[data-pricing-card]').forEach(card => {
            card.querySelector('b').textContent = 1500 + Number(button.dataset.index) * 200 + Number(card.dataset.index) * 500;
          });
        }, 30);
      });</script>`;
    await page.route('https://fixture.test/ceny/', (route) =>
      route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }),
    );
    await page.goto('https://fixture.test/ceny/');
    const details = await readSiteDetails(page);
    const result = parsePackages({ ...details, url: page.url() });
    assert.equal(result.services.length, 4);
    assert.deepEqual(
      result.services[0].prices.map((price) => price.price_min),
      [1500, 1700, 1900],
    );
    assert.equal(result.services.flatMap((service) => service.prices).length, 12);
    assert.equal(details.site_details.faqs[0].answer, 'Ответ скрыт до раскрытия');
    assert.equal(details.site_details.faqs[0].question, 'Вопрос');
  } finally {
    await browser.close();
  }
});
