import { fileURLToPath } from 'node:url';
import { isMain, runSite } from '@anticor/harvest-core';
import { buildKrown } from './extract.js';

export const config = {
  domain: 'krown.by',
  baseUrl: 'https://krown.by/',
  outputDir: fileURLToPath(new URL('../', import.meta.url)),
  seeds: [
    { path: '/', required: true },
    { path: '/price/', required: true },
    { path: '/contacts/', required: true },
    '/company/index.php', '/landings/technologia-antikor/', '/services/',
    '/product/', '/sales/', '/company/reviews/',
  ],
  extraction: { selectors: ['#content', '.right_block', 'main', '.main', '.body'], trimAfter: [] },
  discover(path, params) {
    if (params.size) return false;
    return /^\/services\/[^/]+\/$/.test(path) || /^\/product\/[^/]+\/$/.test(path);
  },
  build: buildKrown,
};

if (isMain(import.meta.url)) runSite(config).catch(() => { process.exitCode = 1; });
