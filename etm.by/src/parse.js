import { fileURLToPath } from 'node:url';
import { isMain, runSite } from '@anticor/harvest-core';
import { buildSite } from './extract.js';
import site from './site.js';

export const config = {
  ...site,
  outputDir: fileURLToPath(new URL('../', import.meta.url)),
  build: buildSite,
};

if (isMain(import.meta.url))
  runSite(config).catch(() => {
    process.exitCode = 1;
  });
