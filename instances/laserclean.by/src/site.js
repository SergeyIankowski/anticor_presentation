import { enrichPage } from './page.js';

export default {
  domain: 'laserclean.by',
  baseUrl: 'https://laserclean.by/',
  seeds: [{ path: '/', required: true }],
  extraction: {
    selectors: ['#allrecords', 'body'],
    homepageSelectors: ['#allrecords', 'body'],
  },
  enrichPage,
  discover(path, params) {
    // The live sitemap contains only / and a generated /sitemap index.
    return path === '/' && params.size === 0;
  },
};
