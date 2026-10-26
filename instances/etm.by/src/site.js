export default {
  domain: 'etm.by',
  baseUrl: 'https://etm.by/',
  seeds: [
    { path: '/', required: true },
    { path: '/kontakty/', required: true },
    { path: '/nashi-uslugi/antikorrozionnaya-obrabotka/', required: true },
    { path: '/nashi-uslugi/shumoizolyacziya/', required: true },
    { path: '/nashi-uslugi/zashhita-voskom-avtomobilya-na-zimnij-period/', required: true },
    { path: '/nashi-uslugi/dopolnitelnyie-uslugi/', required: true },
    '/klientam/o-nas/',
    '/klientam/faq/',
    '/klientam/texnologiya-obrabotki/',
    '/klientam/publikaczii/',
    '/katalog/',
    '/katalog/mercasol/',
    '/katalog/noxudol/',
    '/katalog/oborudovanie/',
  ],
  extraction: {
    homepageSelectors: ['body'],
    selectors: [
      '.contacts',
      'body > .div_oll_100:not(.backgroundTop):not(.backgroundFooter):not(.backgroundFooter2):not(.breadcrumbCont):not(#navbar)',
    ],
  },
  discover(path, params) {
    if ([...params.keys()].some((key) => key !== 'page')) return false;
    return (
      /^\/katalog\/(?:mercasol|noxudol|oborudovanie)\/(?:[^/]+\/)?$/.test(path) ||
      /^\/klientam\/publikaczii\/[^/]+\/$/.test(path)
    );
  },
};
