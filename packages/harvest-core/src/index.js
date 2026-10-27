import { copyFile, mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { crawlSite } from './browser.js';
import { createPresentation, localDate } from './normalize.js';
import { withServiceKeys } from './services.js';

export { extractPage } from './browser.js';
export * from './normalize.js';
export * from './services.js';
export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export const isMain = (url) =>
  process.argv[1] && url === pathToFileURL(resolve(process.argv[1])).href;

export async function validateJson(value, schemaPath) {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(JSON.parse(await readFile(schemaPath, 'utf8')));
  if (!validate(value))
    throw new Error(
      `Schema validation failed (${schemaPath}): ${ajv.errorsText(validate.errors, { separator: '; ' })}`,
    );
}

async function jsonWrite(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`);
}

export async function publishOutputs(outputDir, files, runId) {
  // Validate everything before reaching this step; back up the previous files before replacing them.
  const staging = join(outputDir, `.parse-staging-${runId}`);
  const history = join(outputDir, '.history', runId);
  await mkdir(staging, { recursive: true });
  try {
    for (const [relative, data] of Object.entries(files)) {
      await jsonWrite(join(staging, relative), data);
      const target = join(outputDir, relative);
      try {
        await mkdir(dirname(join(history, relative)), { recursive: true });
        await copyFile(target, join(history, relative));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    for (const relative of Object.keys(files)) {
      await mkdir(dirname(join(outputDir, relative)), { recursive: true });
      await rename(join(staging, relative), join(outputDir, relative));
    }
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

export async function runSite(config, argv = process.argv.slice(2)) {
  const { values } = parseArgs({
    args: argv,
    options: {
      'output-dir': { type: 'string' },
      'max-pages': { type: 'string', default: '80' },
      timeout: { type: 'string', default: '30000' },
      headed: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });
  if (values.help) {
    console.log(
      'npm run parse -- [--output-dir PATH] [--max-pages 80] [--timeout 30000] [--headed]',
    );
    return;
  }
  const options = {
    maxPages: Number(values['max-pages']),
    timeout: Number(values.timeout),
    headed: values.headed,
  };
  if (
    !Number.isInteger(options.maxPages) ||
    options.maxPages < config.seeds.length ||
    !Number.isFinite(options.timeout) ||
    options.timeout < 1000
  ) {
    throw new Error(
      `--max-pages must be at least ${config.seeds.length}; --timeout must be at least 1000 ms`,
    );
  }
  const outputDir = values['output-dir'] ? resolve(values['output-dir']) : config.outputDir;
  await mkdir(outputDir, { recursive: true });
  const lockPath = join(outputDir, '.parse.lock');
  const lock = await open(lockPath, 'wx').catch((error) => {
    if (error.code === 'EEXIST')
      throw new Error(
        `A parser is already running, or a previous process left ${lockPath}. Check the process before removing the lock.`,
      );
    throw error;
  });
  const startedAt = new Date().toISOString();
  const runId = `${startedAt.replace(/[:.]/g, '-')}-${process.pid}`;
  let report = { site: config.baseUrl, started_at: startedAt, page_count: 0, failures: [] };
  try {
    await lock.writeFile(`${process.pid}\n`);
    const { pages, failures } = await crawlSite(config, options);
    for (let index = 0; index < pages.length; index++) {
      await jsonWrite(
        join(outputDir, 'snapshots', runId, `${String(index + 1).padStart(3, '0')}.json`),
        pages[index],
      );
    }
    report = {
      ...report,
      finished_at: new Date().toISOString(),
      page_count: pages.length,
      failures,
      snapshots: join('snapshots', runId),
    };
    if (!pages.length || failures.some((failure) => failure.required)) {
      await jsonWrite(join(outputDir, 'parse-report.json'), {
        ...report,
        status: 'failed',
        published: false,
      });
      throw new Error(
        'A required page failed; existing datasets were preserved. See parse-report.json.',
      );
    }
    const built = config.build(pages, localDate(startedAt));
    const { harvest, warnings = [] } = built;
    const comparison = withServiceKeys(config.domain, built.comparison);
    harvest.metadata.notes = [
      ...(harvest.metadata.notes || []),
      ...warnings,
      ...failures.map((failure) => `${failure.url}: ${failure.error}`),
    ];
    await validateJson(harvest, join(repositoryRoot, 'schemas/site-harvest.schema.json'));
    await validateJson(comparison, join(repositoryRoot, 'schema.json'));
    const presentation = createPresentation(harvest);
    await publishOutputs(
      outputDir,
      {
        [`${config.domain}.json`]: harvest,
        'parsed/presentation_data.json': presentation,
        'parsed/company.json': comparison,
        'parsed/validation_report.json': {
          valid: true,
          parsed_at: new Date().toISOString(),
          schemas: ['schemas/site-harvest.schema.json', 'schema.json'],
          warnings: harvest.metadata.notes,
        },
      },
      runId,
    );
    await jsonWrite(join(outputDir, 'parse-report.json'), {
      ...report,
      status: failures.length ? 'partial' : 'complete',
      published: true,
      warnings,
    });
    console.log(
      `[${config.domain}] Saved ${pages.length} pages; ${comparison.services.length} services; ${comparison.services.reduce((sum, service) => sum + service.prices.length, 0)} price entries to ${outputDir}`,
    );
  } catch (error) {
    await jsonWrite(join(outputDir, 'parse-report.json'), {
      ...report,
      finished_at: new Date().toISOString(),
      status: 'failed',
      published: false,
      error: error.message,
    });
    console.error(`[${config.domain}] ${error.message}`);
    throw error;
  } finally {
    await lock.close();
    await rm(lockPath, { force: true });
  }
}
