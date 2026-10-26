export default {
  domain: 'dinitrol.by',
  baseUrl: 'https://dinitrol.by/',
  seeds: [{ path: '/', required: true }],
  extraction: {
    selectors: ['body'],
    homepageSelectors: ['body'],
  },
  // No content URLs or selectors could be verified: all HTML endpoints returned 403.
  // Keep discovery closed until live service and price markup can be inspected.
  discover(_path, _params) {
    return false;
  },
};
