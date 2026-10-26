import { extractPage } from '@anticor/harvest-core';

export const servicePaths = [
  '/antikorroziynaya-obrabotka-dverey/',
  '/antikorroziynaya-obrabotka-kapota/',
  '/antikorroziynaya-obrabotka-krishki-bagaqnika/',
  '/antikorroziynaya-obrabotka-skritih-polostey/',
  '/antikorroziynaya-obrabotka-dnischa',
  '/antikorroziynaya-obrabotka-arok-krilev/',
  '/antikorroziynaya-obrabotka-longeronov/',
  '/antikorroziynaya-obrabotka-porogov/',
  '/peskostruinaya-obrabotka/',
  '/gruntovanie-kuzova/',
  '/svarka-avtomobila/',
];

const extraction = { selectors: ['main', 'body'], homepageSelectors: ['body'] };

export async function enrichPage(page) {
  // Elementor entrance animations otherwise hide the entire homepage price list.
  const containers = page.locator('main .e-con.e-parent');
  for (let index = 0; index < (await containers.count()); index++) {
    const container = containers.nth(index);
    if (await container.isVisible()) {
      await container.scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);
    }
  }
  await page.waitForTimeout(350);
  const snapshot = await page.evaluate(extractPage, extraction);
  const evidence = await page.evaluate(() => {
    const normalize = (text) => (text || '').replace(/\s+/g, ' ').trim();
    const priceCards = [...document.querySelectorAll('main a[href]')].flatMap((link) => {
      if (!link.href.includes('/antikorroziynaya-obrabotka-')) return [];
      const card = link.closest('.e-con.e-child');
      const prices = [...(card?.querySelectorAll('p') || [])]
        .map((node) => normalize(node.textContent))
        .filter((text) => /\d[\d\s,.–—-]*\s*(?:руб|BYN)/iu.test(text));
      return prices.map((price) => ({
        label: normalize(link.textContent),
        target_url: link.href,
        price_text_original: price,
        text_original: [...card.querySelectorAll('p')]
          .map((node) => normalize(node.textContent))
          .join(' '),
        source_url: location.href,
      }));
    });
    return {
      price_cards: priceCards,
      contact_links: [...document.querySelectorAll('a[href]')]
        .filter((link) => /^(tel:|mailto:|viber:)|instagram\.com/.test(link.href))
        .map((link) => ({ text: normalize(link.textContent), url: link.href })),
      price_controls: [
        ...document.querySelectorAll('select,input[type=radio],input[type=range]'),
      ].map((node) => ({ name: node.name, value: node.value })),
    };
  });
  // Include DOM price-card text even if the site's animation fails to finish.
  const missing = evidence.price_cards.filter(
    (card) =>
      !snapshot.text.includes(card.price_text_original) || !snapshot.text.includes(card.label),
  );
  if (missing.length) {
    snapshot.text += `\n${missing.map((card) => card.text_original).join('\n')}`;
  }
  return { ...snapshot, ...evidence };
}

export default {
  domain: 'protect-line.by',
  baseUrl: 'https://protect-line.by/',
  seeds: ['/', ...servicePaths].map((path) => ({ path, required: true })),
  extraction,
  enrichPage,
  discover(path, params) {
    return params.size === 0 && servicePaths.includes(path);
  },
};
