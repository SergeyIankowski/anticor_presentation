import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function siteIdentity(input) {
  if (!input || !/^(?:https?:\/\/)?[a-z\d.-]+\/?$/i.test(input)) {
    throw new Error(
      'Provide a domain such as example.com or a homepage URL without a port, path, query, or fragment',
    );
  }
  const url = new URL(input.includes('://') ? input : `https://${input}`);
  const labels = url.hostname.split('.');
  if (
    labels.length < 2 ||
    labels.some((label) => !/^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(label)) ||
    !/^[a-z][a-z\d-]+$/i.test(labels.at(-1)) ||
    url.hostname.length > 253
  ) {
    throw new Error('Provide a valid public domain, such as example.com');
  }
  return {
    domain: url.hostname,
    baseUrl: `${url.origin}/`,
    packageName: url.hostname.replaceAll('.', '-'),
  };
}

async function copyTemplate(source, target, tokens) {
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = join(source, entry.name);
    const to = join(target, entry.name);
    if (entry.isDirectory()) {
      await mkdir(to);
      await copyTemplate(from, to, tokens);
    } else if (entry.isFile()) {
      const contents = (await readFile(from, 'utf8')).replace(
        /\{\{(domain|baseUrl|packageName)\}\}/g,
        (_, key) => tokens[key],
      );
      await writeFile(to, contents, { flag: 'wx' });
    }
  }
}

export async function createSite(
  input,
  { rootDir = projectRoot, templateDir = join(projectRoot, 'template') } = {},
) {
  const identity = siteIdentity(input);
  const target = join(rootDir, identity.domain);
  // Read the source before creating the destination, and refuse existing folders.
  await readFile(join(templateDir, 'package.json'), 'utf8');
  const packageName = `@anticor/${identity.packageName}`;
  for (const entry of await readdir(rootDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.includes('.')) continue;
    let manifest;
    try {
      manifest = JSON.parse(await readFile(join(rootDir, entry.name, 'package.json'), 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    if (manifest.name === packageName)
      throw new Error(`Package ${packageName} already exists in ${entry.name}`);
  }
  try {
    await mkdir(target);
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Site folder already exists: ${target}`);
    throw error;
  }
  await copyTemplate(templateDir, target, identity);
  return { ...identity, path: target };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
    console.log('Usage: pnpm site:new example.com');
  } else if (args.length !== 1) {
    console.error('Usage: pnpm site:new example.com');
    process.exitCode = 1;
  } else {
    createSite(args[0])
      .then((site) => {
        console.log(
          `Created ${site.domain}/ from template/.\nCustomize ${site.domain}/src/site.js and src/extract.js, then run:\n  pnpm install\n  cd ${site.domain}\n  npm run parse`,
        );
      })
      .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
      });
  }
}
