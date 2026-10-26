import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { config as antikorr } from '../../../instances/antikorr.by/src/parse.js';
import { runSite } from '../src/index.js';

function priceTable(amount, initial = false) {
  return (
    '<div class="table-wrapper"><table' +
    (initial ? ' class="ut"' : '') +
    '><tr><th>Комплексы</th>' +
    '<th><div class="title">Комплекс №1</div><span>Материал</span></th>' +
    '<th><div class="title">Комплекс №2</div><span>Материал</span></th></tr>' +
    '<tr class="proptr"><td>Мойка</td><td><img src="/check.png"></td><td></td></tr>' +
    '<tr class="pricetr"><td>Стоимость:</td><td>' +
    amount +
    ' BYN</td><td>от ' +
    (amount + 50) +
    ' BYN</td></tr></table></div>'
  );
}

test('Antikorr waits for AJAX table replacement and records every brand/vehicle combination', async () => {
  const server = createServer(async (request, response) => {
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (request.url === '/wp-admin/admin-ajax.php') {
      let body = '';
      for await (const chunk of request) body += chunk;
      const params = new URLSearchParams(body);
      assert.equal(params.get('action'), 'get_price_list');
      response.end(
        priceTable(500 + Number(params.get('brand')) * 100 + Number(params.get('type')) * 10),
      );
      return;
    }
    let content =
      '<h1>Антикоррозийная обработка</h1><p>Время обработки 5-6 часов. Антикоррозийная обработка автомобилей в Минске, подбор материалов для защиты кузова.</p>';
    if (request.url === '/kontaktyi/') {
      content =
        '<h1>Контакты</h1><p>ООО «Антикор-Центр»</p><p>Минск, пр-т Независимости 95/18</p><p>+375 (29) 150-7000</p><p>c 8.00 до 21.00 без выходных</p>';
    }
    if (request.url === '/tsenyi/') {
      content =
        '<h1>Цены</h1><p>Цены ориентировочные. Точную стоимость комплекса уточняйте у менеджера. Выберите материал и автомобиль.</p>' +
        '<style>input[type=radio]{display:none}label{display:block;min-height:24px}</style>' +
        '<label><input type="radio" name="brandselect" value="1" data-name="DINITROL" checked> DINITROL</label>' +
        '<label><input type="radio" name="brandselect" value="2" data-name="Noxudol"> Noxudol</label>' +
        '<label><input type="radio" name="autoselect" value="1"><span class="title">Легковой автомобиль до 4м</span></label>' +
        '<label><input type="radio" name="autoselect" value="2" checked><span class="title">Легковой автомобиль 4-5 метров</span></label>' +
        '<div id="price-table">' +
        priceTable(720, true) +
        '</div>' +
        '<script>document.addEventListener("change",async()=>{const data=new URLSearchParams({action:"get_price_list",brand:document.querySelector("input[name=brandselect]:checked").value,type:document.querySelector("input[name=autoselect]:checked").value});const r=await fetch("/wp-admin/admin-ajax.php",{method:"POST",body:data});document.querySelector("#price-table").innerHTML=await r.text();});</script>';
    }
    response.end(
      `<html><head><title>Antikorr fixture</title></head><body>${content}</body></html>`,
    );
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const output = await mkdtemp(join(tmpdir(), 'antikorr-browser-test-'));
  try {
    const config = {
      ...antikorr,
      baseUrl: `http://127.0.0.1:${server.address().port}/`,
      domain: '127.0.0.1',
      outputDir: output,
      seeds: antikorr.seeds.slice(0, 3),
      discover: () => false,
    };
    await runSite(config, []);
    const company = JSON.parse(await readFile(join(output, 'parsed/company.json'), 'utf8'));
    assert.equal(company.services.length, 4);
    assert.deepEqual(
      company.services[0].prices.map((price) => price.price),
      [610, 620],
    );
    assert.deepEqual(
      company.services[2].prices.map((price) => price.price),
      [710, 720],
    );
    assert.deepEqual(
      company.services[1].prices.map((price) => price.price_min),
      [660, 670],
    );
    const harvest = JSON.parse(await readFile(join(output, '127.0.0.1.json'), 'utf8'));
    assert.equal(harvest.prices.variants.length, 4);
    assert.equal(harvest.prices.variants[0].packages[0].features[0].included, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(output, { recursive: true, force: true });
  }
});
