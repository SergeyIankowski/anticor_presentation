import { readSiteDetails } from './prices.js';

export const servicePaths = [
  '/akvablasting/',
  '/lazernaya-chistka/',
  '/peskostruy/',
  '/promyshlennaya-ochistka/',
  '/vyezdnoy-peskostruy/',
  '/svarochnye-raboty/',
  '/shumoizolyaciya-avto/',
  '/pokraska-avto/',
  '/antikor-elektromobiley/',
  '/antikor-vnedorozhnikov/',
  '/akvablasting-gbc-detalej-dvs/',
  '/akvablasting-supportov/',
  '/peskostruy-ram-pritsepov/',
  '/chistka-vin/',
  '/moyka-dnishcha/',
  '/antikor-dnishcha/',
];
const paths = [
  '/',
  '/ceny/',
  '/kontakty/',
  '/o-kompanii/',
  '/antikor/',
  ...servicePaths,
  '/raboty/',
  '/spravochnik/',
  '/antikor-novogo-avto/',
  '/antikor-avto-s-probegom/',
];

export default {
  domain: 'antirzha.by',
  baseUrl: 'https://antirzha.by/',
  seeds: paths.map((path) => ({ path, required: true })),
  extraction: {
    selectors: ['main', 'article', '#content', 'body'],
    homepageSelectors: ['main', 'body'],
  },
  enrichPage: readSiteDetails,
  discover(path, params) {
    return !params.size && (paths.includes(path) || /^\/antikor-[a-z-]+\/$/.test(path));
  },
};
