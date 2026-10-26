import { readPriceVariants } from './prices.js';

export default {
  domain: 'antikorr.by',
  baseUrl: 'https://antikorr.by/',
  seeds: [
    { path: '/', required: true },
    { path: '/tsenyi/', required: true },
    { path: '/kontaktyi/', required: true },
    '/antikorroziynaya-obrabotka-avtomobilya/',
    '/antikorroziynaya-obrabotka-kuzova/',
    '/antikorroziynaya-obrabotka-dnishha-avtomobilya/',
    '/moyka-dnishha-avtomobilya-na-podemnike/',
    '/antikorrozijnaya-obrabotka-porogov/',
    '/antikorrozijnaya-obrabotka-arok/',
    '/antikorroziynyiy-materialyi/',
    '/antikorroziynyiy-materialyi/antikor-merkasol/',
    '/blog/',
    '/otzyivyi/',
  ],
  extraction: {
    selectors: ['main', 'article', 'body'],
    trimAfter: ['Политика конфиденциальности сайта'],
  },
  discover(path, params) {
    if (params.size) return false;
    return /^\/(?:blog|antikorroziynyiy-materialyi)\/[^/]+\/$/.test(path);
  },
  enrichPage: readPriceVariants,
};
