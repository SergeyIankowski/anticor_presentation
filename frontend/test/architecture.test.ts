import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const srcDir = fileURLToPath(new URL('../src/', import.meta.url));

// Feature-Sliced Design layers, lowest first. A module may import only from layers below its
// own and from its own slice; app and shared have no slices.
const layers = ['shared', 'entities', 'features', 'widgets', 'pages', 'app'];
const unsliced = new Set(['shared', 'app']);

const sources = readdirSync(srcDir, { recursive: true, encoding: 'utf8' })
  .filter((file) => /\.tsx?$/.test(file))
  .map((file) => file.split(sep).join('/'));

function violations(file: string): string[] {
  const [layer, slice] = file.split('/');
  if (!layers.includes(layer)) return [];
  const code = readFileSync(join(srcDir, file), 'utf8');
  const problems: string[] = [];
  for (const [, specifier] of code.matchAll(/(?:from|import)\s+'(\.[^']*)'/g)) {
    const target = relative(srcDir, join(srcDir, dirname(file), specifier))
      .split(sep)
      .join('/');
    const [targetLayer, targetSlice] = target.split('/');
    const sameSlice = targetLayer === layer && (unsliced.has(layer) || targetSlice === slice);
    if (sameSlice) continue;
    if (layers.indexOf(targetLayer) >= layers.indexOf(layer)) {
      problems.push(`${file} imports ${target} from the same or a higher layer`);
    } else if (!unsliced.has(targetLayer) && target !== `${targetLayer}/${targetSlice}/index.ts`) {
      problems.push(
        `${file} imports ${target} past the public API of ${targetLayer}/${targetSlice}`,
      );
    }
  }
  return problems;
}

test('imports follow the FSD layer order and go through slice public APIs', () => {
  assert.ok(sources.length > 0);
  assert.deepEqual(sources.flatMap(violations), []);
});

test('every slice has a public API', () => {
  const slices = new Set(
    sources
      .map((file) => file.split('/'))
      .filter(([layer]) => layers.includes(layer) && !unsliced.has(layer))
      .map(([layer, slice]) => `${layer}/${slice}`),
  );
  for (const slice of slices) assert.ok(sources.includes(`${slice}/index.ts`), slice);
});
