export async function enrichPage(page) {
  return page.evaluate(() => {
    const clean = (value = '') => value.replace(/\s+/gu, ' ').trim();
    // Rendered text preserves the source's uppercase service headings for source anchors.
    // biome-ignore lint/performance/useDomNodeTextContent: Match the rendered snapshot, including CSS text-transform.
    const text = (node) => clean(node?.innerText || node?.textContent || '');
    const section = (selector) => text(document.querySelector(selector));
    return {
      pozit: {
        company_name: section('.footer__company'),
        footer: section('footer'),
        workshop_address: section('.map-address-value'),
        price_note: section('#services .section-description'),
        cards: [...document.querySelectorAll('#services .price-card')].map((card) => ({
          name: text(card.querySelector('.pricing-title')),
          includes: [...card.querySelectorAll('.price-list li')].map(text),
          prices: [...card.querySelectorAll('.material-price-row')].map((row) => ({
            material: text(row.querySelector('.material-name')),
            text: text(row.querySelector('.material-price')),
          })),
        })),
        timeline: {
          amount: section('#timeline .time-value'),
          unit: section('#timeline .time-unit'),
          note: section('#timeline .timeline-card__note'),
        },
        materials: [...document.querySelectorAll('.materials-zone')].flatMap((zone) =>
          [...zone.querySelectorAll('.materials-compact-card')].map((card) => ({
            name: text(card.querySelector('h3')),
            zone: text(zone.querySelector('.zone-title')),
            features: [...card.querySelectorAll('li')].map(text),
          })),
        ),
        sections: Object.fromEntries(
          ['benefits', 'preparation', 'materials', 'guarantee', 'faq', 'contacts'].map((id) => [
            id,
            section(`#${id}`),
          ]),
        ),
        faq: [...document.querySelectorAll('.faq-item')].map((item) => ({
          question: text(item.querySelector('.faq-item__question')),
          answer: text(item.querySelector('.faq-item__answer')),
        })),
        contact_links: [...document.querySelectorAll('#contacts a[href]')]
          .map((link) => ({ text: text(link), url: link.href }))
          .filter((link) => /^(?:tel:|tg:|viber:|https:\/\/wa\.me)/u.test(link.url)),
      },
    };
  });
}

export default {
  domain: 'antikor.pozit.by',
  baseUrl: 'https://antikor.pozit.by/',
  seeds: [{ path: '/', required: true }],
  // The site's main element ends before the pricing and contacts sections.
  extraction: { selectors: ['body'], homepageSelectors: ['body'] },
  enrichPage,
  discover() {
    // All business content is on the landing page; other links are legal pages or assets.
    return false;
  },
};
