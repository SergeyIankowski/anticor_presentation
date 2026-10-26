import { enrichPage } from './page.js';

export default {
  domain: 'anticorlida.by',
  baseUrl: 'https://anticorlida.by/',
  seeds: [{ path: '/', required: true }],
  extraction: {
    selectors: ['#allrecords', 'body'],
    homepageSelectors: ['#allrecords', 'body'],
  },
  enrichPage,
  discover() {
    // The live sitemap contains only / and /cookie; all offer links are home anchors.
    return false;
  },
};
