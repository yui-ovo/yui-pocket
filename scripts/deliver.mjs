import { mkdir, copyFile, readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { validateScript } from './validate.mjs';

const bytes = await readFile('dist/yui.v0.1.json');
validateScript(JSON.parse(bytes));
const destination = 'outputs/yui-source';
await mkdir(destination, { recursive: true });
const files = ['AGENTS.md', 'ROADMAP.md', 'PROGRESS.md', 'README.md', 'SOURCES.md', '.gitignore', 'package.json', 'package-lock.json', 'tsconfig.json', 'playwright.config.mjs', 'dist/yui.v0.1.json', 'manifest.json', 'extension.js'];
for (const folder of ['src', 'scripts', 'tests']) {
  for (const entry of await readdir(folder, { withFileTypes: true, recursive: true })) {
    if (entry.isFile()) files.push(join(entry.parentPath, entry.name));
  }
}
for (const path of files) {
  const target = join(destination, path);
  await mkdir(join(target, '..'), { recursive: true });
  await copyFile(path, target);
}
await writeFile('outputs/yui.v0.1.json', bytes);
for (const file of ['README.md', 'PROGRESS.md', 'SOURCES.md']) await copyFile(file, `outputs/${file}`);
const hash = createHash('sha256').update(bytes).digest('hex');
await writeFile('outputs/SHA256SUMS.txt', `${hash}  yui.v0.1.json\n`);
console.log(`Deliverable copied byte-for-byte (${bytes.length} bytes). SHA-256 ${hash}`);
