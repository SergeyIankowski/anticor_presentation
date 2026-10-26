import { fileURLToPath } from 'node:url';
import { isMain, runSite } from '@anticor/harvest-core';
import { buildEtm } from './extract.js';

export const config = {
  domain: 'etm.by',
  baseUrl: 'https://etm.by/',
  outputDir: fileURLToPath(new URL('../', import.meta.url)),
  seeds: [
    { path: '/', required: true },
    { path: '/kontakty/', required: true },
    { path: '/nashi-uslugi/antikorrozionnaya-obrabotka/', required: true },
    { path: '/nashi-uslugi/shumoizolyacziya/', required: true },
    { path: '/nashi-uslugi/zashhita-voskom-avtomobilya-na-zimnij-period/', required: true },
    { path: '/nashi-uslugi/dopolnitelnyie-uslugi/', required: true },
    '/klientam/o-nas/', '/klientam/faq/', '/klientam/texnologiya-obrabotki/',
    '/klientam/publikaczii/', '/katalog/', '/katalog/mercasol/', '/katalog/noxudol/', '/katalog/oborudovanie/',
  ],
  extraction: {
    homepageSelectors: ['body'],
    selectors: ['.contacts', 'body > .div_oll_100:not(.backgroundTop):not(.backgroundFooter):not(.backgroundFooter2):not(.breadcrumbCont):not(#navbar)'],
  },
  discover(path, params) {
    if ([...params.keys()].some((key) => key !== 'page')) return false;
    return /^\/katalog\/(?:mercasol|noxudol|oborudovanie)\/(?:[^/]+\/)?$/.test(path)
      || /^\/klientam\/publikaczii\/[^/]+\/$/.test(path);
  },
  build: buildEtm,
};

if (isMain(import.meta.url)) runSite(config).catch(() => { process.exitCode = 1; });
