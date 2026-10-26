import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { chromium } from 'playwright';
import { config as etm } from '../../../etm.by/src/parse.js';
import { config as krown } from '../../../krown.by/src/parse.js';
import { extractPage, runSite } from '../src/index.js';

test('Playwright extracts rendered content, table spans, and JSON-LD from HTML', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(`<main><h1>Example service</h1><p>A service description with enough meaningful page text for a complete extraction.</p>
      <table><tr><th>Service</th><th colspan="2">All cars</th></tr><tr><td>Wash</td><td colspan="2">от 112 BYN</td></tr></table>
      <script type="application/ld+json">{"@type":"Service","name":"Example"}</script></main>`);
    const snapshot = await page.evaluate(extractPage, { selectors: ['main'] });
    assert.equal(snapshot.headings[0].text, 'Example service');
    assert.equal(snapshot.tables[0].rows[1][1].colspan, 2);
    assert.equal(snapshot.tables[0].rows[1][1].text, 'от 112 BYN');
    assert.equal(snapshot.structured_data[0]['@type'], 'Service');
  } finally {
    await browser.close();
  }
});

test('KROWN refresh pipeline updates source prices and preserves output if a required page fails', async () => {
  let amount = 795;
  let failContact = false;
  const server = createServer((request, response) => {
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (failContact && request.url === '/contacts/') {
      response.writeHead(503);
      response.end('Unavailable');
      return;
    }
    let content =
      '<h1>KROWN</h1><p>Антикоррозийная обработка автомобилей и дополнительные услуги по уходу за кузовом и днищем автомобиля.</p>';
    if (request.url === '/price/')
      content = `<h1>Прайс-лист</h1><p>Цены на антикоррозийную обработку автомобилей с НДС. Выберите категорию автомобиля для полной обработки.</p>
      <table><tr><th>Полная обработка</th><th>Обработка днища</th><th>Повторная обработка</th></tr>
      <tr><td>1</td><td>Легковой автомобиль (до 4,0 м)</td><td>${amount} BYN</td><td>725 BYN</td><td>635 BYN</td></tr></table>`;
    if (request.url === '/contacts/')
      content =
        '<h1>Контакты</h1><p>Наш центр находится по адресу г. Минск, Ваупшасова 7а</p><p>+375 (44) 504-77-77</p><p>Мы работаем с 08:00 до 21:00 без выходных</p>';
    response.end(
      `<html><head><title>KROWN fixture</title></head><body><main>${content}</main></body></html>`,
    );
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const output = await mkdtemp(join(tmpdir(), 'krown-browser-test-'));
  try {
    const config = {
      ...krown,
      baseUrl: `http://127.0.0.1:${server.address().port}/`,
      domain: '127.0.0.1',
      outputDir: output,
      seeds: krown.seeds.slice(0, 3),
      discover: () => false,
    };
    await runSite(config, []);
    const readCompany = async () =>
      JSON.parse(await readFile(join(output, 'parsed/company.json'), 'utf8'));
    assert.equal((await readCompany()).services[0].prices[0].price, 795);
    amount = 899;
    await runSite(config, []);
    assert.equal((await readCompany()).services[0].prices[0].price, 899);
    const before = await readFile(join(output, 'parsed/company.json'), 'utf8');
    failContact = true;
    await assert.rejects(runSite(config, []), /required page failed/);
    assert.equal(await readFile(join(output, 'parsed/company.json'), 'utf8'), before);
    assert.equal(
      JSON.parse(await readFile(join(output, 'parse-report.json'), 'utf8')).published,
      false,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(output, { recursive: true, force: true });
  }
});

test('ETM custom selectors extract four services and fresh branch contacts through the browser', async () => {
  const server = createServer((request, response) => {
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    const seed = etm.seeds.find((item) => typeof item === 'object' && item.path === request.url);
    if (!seed) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    let content =
      '<h1>Евротехмаркет</h1><p>Центр антикоррозийной обработки и шумоизоляции автомобилей в городе Минске. Продажа материалов.</p>';
    if (request.url === '/kontakty/')
      content =
        '<h1>Контактная информация</h1><p>Центр антикоррозионной обработки в г. Минск</p><p>Телефоны</p><p>+375 (44) 111-22-33</p><p>Режим работы</p><p>Пн - Пт: 09.00 - 18.00</p><p>Адрес</p><p>г. Минск, пер. Солтыса, 5/1</p>';
    if (request.url.startsWith('/nashi-uslugi/'))
      content = `<h1>${request.url.includes('antikorrozionnaya') ? 'Антикоррозийная обработка автомобиля' : request.url}</h1><p>Полная обработка занимает около 2 суток, включая мойку, подготовку и сушку кузова автомобиля.</p>`;
    response.end(
      `<html><head><title>ETM fixture</title></head><body><div class="div_oll_100 div_oll_center${request.url === '/kontakty/' ? ' contacts' : ''}">${content}</div></body></html>`,
    );
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const output = await mkdtemp(join(tmpdir(), 'etm-browser-test-'));
  try {
    const config = {
      ...etm,
      baseUrl: `http://127.0.0.1:${server.address().port}/`,
      domain: '127.0.0.1',
      outputDir: output,
      seeds: etm.seeds.slice(0, 6),
      discover: () => false,
    };
    await runSite(config, []);
    const company = JSON.parse(await readFile(join(output, 'parsed/company.json'), 'utf8'));
    assert.equal(company.services.length, 4);
    assert.deepEqual(company.company.locations[0].phones, ['+375 (44) 111-22-33']);
    assert.equal(company.services[0].completion_time.min, 2);
    assert.deepEqual(company.services[0].prices, []);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(output, { recursive: true, force: true });
  }
});
