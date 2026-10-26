import { readSiteDetails } from './prices.js';

export const servicePaths = [
  '/antikorrozijnaya-obrabotka-avto',
  '/oklejka-antigravijnoj-plenkoy',
  '/peskostrujnaya-obrabotka',
  '/lazernaya-ochistka',
  '/dekonservaciya-dnishcha',
  '/vosstanovlenie-vin-nomera',
  '/svarochnye-raboty',
];
const paths = ['/', ...servicePaths, '/materialy', '/video', '/o-nas', '/oferta'];

export default {
  domain: 'antikorim.by',
  baseUrl: 'https://antikorim.by/',
  seeds: paths.map((path) => ({ path, required: path !== '/oferta' })),
  extraction: {
    selectors: ['main', 'article', '#content', 'body'],
    homepageSelectors: ['main', 'body'],
  },
  enrichPage: readSiteDetails,
  discover(path, params) {
    return !params.size && paths.includes(path);
  },
};
