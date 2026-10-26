export default {
  domain: 'krown.by',
  baseUrl: 'https://krown.by/',
  seeds: [
    { path: '/', required: true },
    { path: '/price/', required: true },
    { path: '/contacts/', required: true },
    '/company/index.php',
    '/landings/technologia-antikor/',
    '/services/',
    '/product/',
    '/sales/',
    '/company/reviews/',
  ],
  extraction: { selectors: ['#content', '.right_block', 'main', '.main', '.body'], trimAfter: [] },
  discover(path, params) {
    if (params.size) return false;
    return /^\/services\/[^/]+\/$/.test(path) || /^\/product\/[^/]+\/$/.test(path);
  },
};
