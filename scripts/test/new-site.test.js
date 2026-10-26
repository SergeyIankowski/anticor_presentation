import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createSite, siteIdentity } from '../new-site.js';

test('new site instances fill in identity and run the shared parse entry point', async () => {
  const root = await mkdtemp(join(tmpdir(), 'site-template-'));
  try {
    const result = await createSite('https://Example.COM/', { rootDir: root });
    assert.equal(result.domain, 'example.com');
    assert.equal(result.path, join(root, 'instances/example.com'));
    assert.deepEqual(await readdir(root), ['instances']);
    const manifest = JSON.parse(await readFile(join(result.path, 'package.json'), 'utf8'));
    assert.equal(manifest.name, '@anticor/example-com');
    assert.equal(manifest.scripts.parse, 'node src/parse.js');
    assert.equal(manifest.dependencies['@anticor/harvest-core'], 'workspace:*');
    const siteSource = await readFile(join(result.path, 'src/site.js'), 'utf8');
    assert.match(siteSource, /baseUrl: 'https:\/\/example\.com\/'/);
    assert.doesNotMatch(siteSource, /\{\{/);
    const entry = await readFile(join(result.path, 'src/parse.js'), 'utf8');
    assert.equal(
      entry,
      await readFile(new URL('../../template/src/parse.js', import.meta.url), 'utf8'),
    );
    await mkdir(join(result.path, 'node_modules/@anticor'), { recursive: true });
    await symlink(
      fileURLToPath(new URL('../../packages/harvest-core', import.meta.url)),
      join(result.path, 'node_modules/@anticor/harvest-core'),
      'dir',
    );
    const command = spawnSync(process.execPath, ['src/parse.js', '--help'], {
      cwd: result.path,
      encoding: 'utf8',
    });
    assert.equal(command.status, 0, command.stderr);
    assert.match(command.stdout, /npm run parse/);
    await assert.rejects(createSite('example.com', { rootDir: root }), /already exists/);
    assert.equal(await readFile(join(result.path, 'src/parse.js'), 'utf8'), entry);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('invalid domains and path traversal do not create folders', async () => {
  const root = await mkdtemp(join(tmpdir(), 'site-template-invalid-'));
  try {
    for (const input of [
      '../outside.com',
      'https://example.com/path',
      'localhost',
      '-bad.com',
      'example..com',
      'https://example.com:8080/',
      'example.com?x=1',
    ]) {
      await assert.rejects(createSite(input, { rootDir: root }));
    }
    assert.deepEqual(await readdir(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('existing domain folders and colliding package names are preserved', async () => {
  const root = await mkdtemp(join(tmpdir(), 'site-template-existing-'));
  try {
    const instancesDir = join(root, 'instances');
    await mkdir(join(instancesDir, 'existing.com'), { recursive: true });
    await writeFile(join(instancesDir, 'existing.com/user.txt'), 'keep');
    await assert.rejects(createSite('existing.com', { rootDir: root }), /already exists/);
    assert.equal(await readFile(join(instancesDir, 'existing.com/user.txt'), 'utf8'), 'keep');
    await mkdir(join(instancesDir, 'a-b.com'));
    await writeFile(join(instancesDir, 'a-b.com/package.json'), '{"name":"@anticor/a-b-com"}');
    await assert.rejects(createSite('a.b-com', { rootDir: root }), /Package .* already exists/);
    assert.deepEqual((await readdir(instancesDir)).sort(), ['a-b.com', 'existing.com']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('existing parsers use the template entry point and package structure', async () => {
  const entry = await readFile(new URL('../../template/src/parse.js', import.meta.url), 'utf8');
  const manifest = JSON.parse(
    await readFile(new URL('../../template/package.json', import.meta.url), 'utf8'),
  );
  for (const domain of ['etm.by', 'krown.by', 'antikorr.by']) {
    assert.equal(
      await readFile(new URL(`../../instances/${domain}/src/parse.js`, import.meta.url), 'utf8'),
      entry,
    );
    const siteManifest = JSON.parse(
      await readFile(new URL(`../../instances/${domain}/package.json`, import.meta.url), 'utf8'),
    );
    const { name, ...common } = siteManifest;
    const { name: templateName, ...templateCommon } = manifest;
    assert.deepEqual(common, templateCommon);
  }
  assert.equal(siteIdentity('my-site.example.org').packageName, 'my-site-example-org');
});
