import { enrichPage } from './evidence.js';

export const servicePaths = [
  '/lazernaja-chistka-metalla-i-avtomobilja-v-breste/',
  '/peskostrujnaja-obrabotka-avtomobilja-diskov-i-dnishha-v-breste/',
  '/shumoizolyacziya-avtomobilya/',
];
const relevantPaths = [
  '/cena-antikorrozijnoj-obrabotki-avtomobilja-v-breste/',
  ...servicePaths,
  '/garantii/',
  '/kontakty/',
];

export default {
  domain: 'spec-antikor.by',
  baseUrl: 'https://spec-antikor.by/',
  seeds: [
    { path: '/', required: true },
    ...relevantPaths.map((path) => ({ path, required: false })),
  ],
  extraction: { selectors: ['body'], homepageSelectors: ['body'] },
  enrichPage,
  discover(path, params) {
    return !params.size && relevantPaths.includes(path);
  },
};
