export default {
  domain: 'proficor.by',
  baseUrl: 'https://proficor.by/',
  seeds: [
    { path: '/', required: true },
    { path: '/antikorrozijnaya-obrabotka-elektromobilej/', required: true },
    { path: '/kontakty/', required: true },
    { path: '/polirovka/', required: true },
    { path: '/sitemap/', required: true },
    { path: '/mojka/', required: false },
    { path: '/shumoizolyacziya/', required: false },
  ],
  extraction: {
    selectors: ['main', 'article', '#content', 'body'],
    homepageSelectors: ['main', 'body'],
  },
  discover(path, params) {
    return (
      !params.size &&
      /^\/(?:antikorrozijnaya-obrabotka-elektromobilej|kontakty|polirovka|sitemap|mojka|shumoizolyacziya)?\/?$/.test(
        path,
      )
    );
  },
  async enrichPage(page) {
    return page.evaluate(() => {
      const clean = (text = '') => text.replace(/\s+/g, ' ').trim();
      const cards = [...document.querySelectorAll('h3')]
        .filter((heading) =>
          /^(Легковые автомобили|Кроссоверы, паркетники|Внедорожники)$/.test(
            clean(heading.textContent),
          ),
        )
        .map((heading) => {
          let card = heading.parentElement;
          while (card && !/Комплекс\s+ЛАЙТ/.test(card.textContent)) card = card.parentElement;
          // biome-ignore lint/performance/useDomNodeTextContent: Rendered separators and exclusion of noscript markup are required for price cards.
          return { name: clean(heading.textContent), text: clean(card?.innerText) };
        });
      const polishing = [...document.querySelectorAll('.elementor-price-list-text')].map((row) => ({
        name: clean(row.querySelector('.elementor-price-list-title')?.textContent),
        price: clean(row.querySelector('.elementor-price-list-price')?.textContent),
        description: clean(row.querySelector('.elementor-price-list-description')?.textContent),
      }));
      return {
        proficor: {
          price_cards: cards,
          polishing,
          dynamic_price_control_count: document.querySelectorAll(
            'select,input[type=radio],[role=tab]',
          ).length,
        },
      };
    });
  },
};
