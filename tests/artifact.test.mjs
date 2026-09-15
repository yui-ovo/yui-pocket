import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';
import { validateScript } from '../scripts/validate.mjs';

test('artifact parses, has verified Helper fields, standalone executable JS and no stage-forbidden APIs', async () => {
  const data = JSON.parse(await readFile('dist/yui.v0.2-step1.json', 'utf8'));
  validateScript(data);
  new Script(data.content); // Syntax check only, not a claimed host import.
  assert.match(data.content, /pagehide/);
});
test('validator rejects missing or invented fields', async () => {
  const data = JSON.parse(await readFile('dist/yui.v0.2-step1.json', 'utf8'));
  assert.throws(() => validateScript({ ...data, type: 'extension' }));
  assert.throws(() => validateScript({ ...data, content: undefined }));
  assert.throws(() => validateScript({ ...data, remote_url: 'bad' }));
  assert.throws(() => validateScript({ ...data, content: data.content + '\n/* background: url("https://image.test/a.png") */' }));
  assert.throws(() => validateScript({ ...data, content: data.content + '\n/* background: url("data:image/svg+xml;abc") */' }));
});
test('build graph has only local runtime sources', async () => {
  const meta = JSON.parse(await readFile('work/build-meta.json', 'utf8'));
  assert.ok(Object.keys(meta.inputs).length > 2);
  assert.ok(Object.keys(meta.inputs).every(path => path.startsWith('src/')));
  assert.ok(Object.values(meta.outputs).every(output => output.imports.length === 0));
});

test('extension manifest points to bundled local module and verified lifecycle exports', async () => {
  const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
  assert.equal(manifest.js, 'extension.js');
  assert.equal(manifest.homePage, 'https://github.com/yui-ovo/yui-pocket');
  assert.deepEqual(manifest.dependencies, []);
  assert.equal(manifest.auto_update, false);
  assert.deepEqual(manifest.hooks, { activate: 'onActivate', enable: 'onEnable', disable: 'onDisable', delete: 'onDelete' });
  const content = await readFile(manifest.js, 'utf8');
  const script = JSON.parse(await readFile('dist/yui.v0.2-step1.json', 'utf8'));
  validateScript({ ...script, content });
  for (const hook of Object.values(manifest.hooks)) assert.ok(content.includes(hook));
  const meta = JSON.parse(await readFile('work/extension-build-meta.json', 'utf8'));
  assert.ok(Object.keys(meta.inputs).every(path => path.startsWith('src/')));
  assert.ok(Object.values(meta.outputs).every(output => output.imports.length === 0));
});

test('persistence and host access stay within the authorized adapters', async () => {
  const meta = JSON.parse(await readFile('work/build-meta.json', 'utf8'));
  for (const path of Object.keys(meta.inputs).filter(p => p.endsWith('.ts'))) {
    const code = await readFile(path, 'utf8');
    if (!['src/appearance.ts','src/profile-host.ts','src/reading.ts'].includes(path)) assert.doesNotMatch(code, /localStorage/);
    if (path !== 'src/profile-host.ts') assert.doesNotMatch(code, /SillyTavern|\.fetch\(/);
    assert.doesNotMatch(code, /localStorage\.clear\(/);
  }
  const code = await readFile('src/appearance.ts', 'utf8');
  assert.doesNotMatch(code, /localStorage\.clear\(/);
  assert.match(code, /localStorage\.setItem\(APPEARANCE_KEY/);
});
