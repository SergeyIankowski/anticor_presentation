import { extractPage } from '@anticor/harvest-core';

// Run through every selector state rather than reading only the default sedan prices.
export async function enrichPage(page) {
  await page.locator('#vehicle-tabs button[data-service-key]').first().waitFor();
  const tabs = await page
    .locator('#vehicle-tabs button')
    .evaluateAll((nodes) =>
      nodes.map((node) => ({ key: node.dataset.serviceKey, name: node.textContent.trim() })),
    );
  if (!tabs.length || new Set(tabs.map((tab) => tab.key)).size !== tabs.length)
    throw new Error('Missing or duplicate vehicle selector keys');
  const states = [];
  for (const tab of tabs) {
    await page.locator(`#vehicle-tabs button[data-service-key="${tab.key}"]`).click();
    await page.waitForFunction(
      ({ key, name }) =>
        document
          .querySelector(`#vehicle-tabs button[data-service-key="${key}"]`)
          ?.getAttribute('aria-selected') === 'true' &&
        document.querySelector('#vehicle-info-row')?.textContent.includes(name) &&
        document.querySelectorAll('#pricing-grid .pricing-card').length > 0,
      tab,
    );
    const state = await page.evaluate(() => {
      const text = (selector, root = document) =>
        root.querySelector(selector)?.textContent.trim() || '';
      return {
        summary: text('#vehicle-info-row'),
        description: text('#vehicle-info-row .vehicle-info-row__desc'),
        note: text('.pricing-note'),
        // biome-ignore lint/performance/useDomNodeTextContent: Preserve rendered pricing evidence for this selected state.
        text: document.querySelector('#pricing').innerText,
        cards: [...document.querySelectorAll('#pricing-grid .pricing-card')].map((card) => ({
          name: text('.pricing-card__name', card),
          price_text_original: text('.pricing-card__price', card),
          items: [...card.querySelectorAll('.pricing-card__item')].map((item) =>
            item.textContent.replace(/^\s*✓\s*/, '').trim(),
          ),
        })),
      };
    });
    states.push({
      ...tab,
      ...state,
      source_url: page.url(),
      captured_at: new Date().toISOString(),
    });
  }
  await page.locator('#vehicle-tabs button').first().click();
  const snapshot = await page.evaluate(extractPage, { selectors: ['body'] });
  const evidence = await page.evaluate(() => {
    const text = (selector) => document.querySelector(selector)?.textContent.trim() || '';
    return {
      addresses: ['#contact-address', '#contact-address-second'].map(text).filter(Boolean),
      working_hours: text('#contact-hours'),
      telegram: document.querySelector('#contact-telegram')?.href || null,
      benefits: [...document.querySelectorAll('#benefits p')].map((node) =>
        node.textContent.trim(),
      ),
      // biome-ignore lint/performance/useDomNodeTextContent: Preserve visible line breaks between the split heading words.
      hero: document.querySelector('#hero')?.innerText || '',
    };
  });
  return { ...snapshot, pricing_tabs: tabs, pricing_states: states, site_evidence: evidence };
}
