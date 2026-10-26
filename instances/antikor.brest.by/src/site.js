export const servicePages = [
  {
    path: '/polnaya-antikorrozijnaya-obrabotka-avtomobilya/',
    id: 'full-treatment',
    category: 'anticorrosion',
    priceColumn: 'Полная обработка',
  },
  {
    path: '/antikorrozijnaya-obrabotka-dnishha/',
    id: 'underbody',
    category: 'anticorrosion',
    priceColumn: 'Обработка днища',
  },
  {
    path: '/antikorrozijnaya-obrabotka-skrytyh-polostej/',
    id: 'cavities',
    category: 'anticorrosion',
  },
  {
    path: '/antikorroziinaya-obrabotka-porogov-i-arok/',
    id: 'sills-arches',
    category: 'anticorrosion',
  },
  {
    path: '/oklejka-avtomobilya-antigravijnaya-vinilovoj-plenkoj/',
    id: 'protective-film',
    category: 'additional',
  },
  { path: '/bronirovanie-i-polirovka-far/', id: 'headlights', category: 'additional' },
];

export const pricePath = '/tseny/tseny-na-antikor/';

export default {
  domain: 'antikor.brest.by',
  baseUrl: 'https://antikor.brest.by/',
  seeds: [
    { path: '/', required: true },
    ...servicePages.map(({ path }) => ({ path, required: true })),
    { path: pricePath, required: true },
    { path: '/kontakty/', required: true },
    { path: '/tseny/', required: false },
    { path: '/otzyvy/', required: false },
    { path: '/blog-category/blog/', required: false },
  ],
  extraction: {
    selectors: ['main', '#content', 'body'],
    homepageSelectors: ['#content', 'main', 'body'],
  },
  // Service/contact/price pages are seeds; discover only editorial article evidence.
  discover(path, params) {
    return (
      params.size === 0 &&
      /^\/blog-post\/(?:[^/]*(?:antikor|antigrav|polirovk|tonirovk|rzhaveyut)[^/]*|aktsiya-1)\/$/u.test(
        path,
      )
    );
  },
  async enrichPage(page) {
    return page.evaluate(() => ({
      service_heading:
        document.querySelector('main h1, #content .entry-title')?.textContent.trim() || null,
      contact_links: [...document.querySelectorAll('a[href]')]
        .filter((a) =>
          /^(tel:|mailto:|viber:)|instagram\.com|vk\.com|tiktok\.com|wa\.me/.test(a.href),
        )
        .map((a) => ({ text: a.textContent.trim(), url: a.href })),
    }));
  },
};
