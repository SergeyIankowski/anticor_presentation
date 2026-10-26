import { enrichPage } from './enrich.js';

export default {
  domain: 'antikor-minsk.by',
  baseUrl: 'https://antikor-minsk.by/',
  seeds: [{ path: '/', required: true }],
  extraction: {
    selectors: ['body'],
    homepageSelectors: ['body'],
  },
  enrichPage,
  discover(_path, _params) {
    // All navigation sections and package details belong to the homepage.
    return false;
  },
};
