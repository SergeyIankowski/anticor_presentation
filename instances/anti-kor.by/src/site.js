import { enrichPage } from './evidence.js';

export default {
  domain: 'anti-kor.by',
  baseUrl: 'https://anti-kor.by/',
  seeds: [{ path: '/', required: true }],
  extraction: {
    selectors: ['body'],
    homepageSelectors: ['body'],
  },
  enrichPage,
  discover(path, params) {
    // The live sitemap lists only /. Navigation targets sections of this page.
    return path === '/' && params.size === 0;
  },
};
