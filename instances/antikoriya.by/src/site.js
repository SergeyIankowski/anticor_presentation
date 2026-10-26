import { enrichPage } from './browser.js';

export default {
  domain: 'antikoriya.by',
  baseUrl: 'https://antikoriya.by/',
  seeds: [{ path: '/', required: true }],
  extraction: {
    selectors: ['body'],
    homepageSelectors: ['body'],
  },
  enrichPage,
  discover(_path, _params) {
    // The live site is a single page; navigation links point to sections.
    return false;
  },
};
