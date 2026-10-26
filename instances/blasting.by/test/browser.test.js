import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { chromium } from '../../../packages/harvest-core/node_modules/playwright/index.mjs';
import { enrichPage } from '../src/site.js';

const html = await readFile(new URL('./fixtures/home.dom.txt', import.meta.url), 'utf8');
const fixture = JSON.parse(
  await readFile(new URL('./fixtures/home.json', import.meta.url), 'utf8'),
);

test('enriches real WordPress DOM and rejects the live contact soft-404 pattern', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html);
    const { blasting } = await enrichPage(page);
    assert.deepEqual(blasting, fixture.blasting);
    assert.equal(blasting.interaction_controls.length, 0);
    assert.equal(blasting.steps.length, 4);
    await page.setContent(
      '<body>The page you requested was not found we suggest you to go back to HomePage</body>',
    );
    await assert.rejects(enrichPage(page), /HTTP 200 soft-404/);
  } finally {
    await browser.close();
  }
});
