import { enrichPage } from './evidence.js';

export default {
  domain: 'antikor-vitebsk.by',
  baseUrl: 'https://antikor-vitebsk.by/',
  seeds: [{ path: '/', required: true }],
  extraction: {
    selectors: ['body'],
    homepageSelectors: ['body'],
  },
  enrichPage,
  discover(_path, _params) {
    // The inspected landing page links only to its own anchors and external socials.
    return false;
  },
};
