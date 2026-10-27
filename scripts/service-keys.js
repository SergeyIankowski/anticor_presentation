import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { withServiceKeys } from '../packages/harvest-core/src/services.js';

const instancesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../instances');

// Rewrites `service_key` in every published parsed/company.json from the current service
// catalog, so catalog changes reach the frontend without a live re-parse. Prices and every other
// field stay as parsed.
export async function refreshServiceKeys(directory = instancesDir) {
  const changed = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(directory, entry.name, 'parsed/company.json');
    let text;
    try {
      text = await readFile(path, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    const updated = `${JSON.stringify(withServiceKeys(entry.name, JSON.parse(text)), null, 2)}\n`;
    if (updated === text) continue;
    await writeFile(path, updated);
    changed.push(entry.name);
  }
  return changed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const changed = await refreshServiceKeys();
  console.log(
    changed.length ? `Updated service keys: ${changed.join(', ')}` : 'Service keys are current',
  );
}
