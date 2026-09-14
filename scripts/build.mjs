import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { validateScript } from './validate.mjs';

const result = await build({
  entryPoints: ['src/index.ts'], bundle: true, write: false,
  format: 'iife', platform: 'browser', target: ['es2022'],
  loader: { '.css': 'text', '.jpg': 'dataurl', '.png': 'dataurl' }, charset: 'utf8', legalComments: 'none',
  minify: false, metafile: true,
});
const content = result.outputFiles[0].text;
const script = validateScript({
  type: 'script', enabled: false, name: 'Yui · v0.1 演示 · 4S',
  id: '9ba31706-a354-4e49-81e8-3b20d5c98c71', content,
  info: 'Yui v0.1。演示模式：不调用 AI，不保存聊天。不读取正文。点 Yui 打开主屏幕，Dock 信息→联系人→聊天；Home 回主屏，× 关闭。停用旧版后再启用。信封及蕾丝贴纸为用户供图，全部内嵌，无远程资源。',
  button: { enabled: false, buttons: [] }, data: {},
  export_with: { data: false, button: false },
});
await mkdir('dist', { recursive: true });
await writeFile('dist/yui.v0.1.json', JSON.stringify(script, null, 2) + '\n');
await mkdir('work', { recursive: true });
await writeFile('work/build-meta.json', JSON.stringify(result.metafile, null, 2));
console.log(`Built dist/yui.v0.1.json (${Buffer.byteLength(JSON.stringify(script))} bytes); bundled runtime dependencies: 0.`);

const extension = await build({
  entryPoints: ['src/extension.ts'], bundle: true, write: false,
  format: 'esm', platform: 'browser', target: ['es2022'],
  loader: { '.css': 'text', '.jpg': 'dataurl', '.png': 'dataurl' }, charset: 'utf8', legalComments: 'none',
  minify: false, metafile: true,
});
// Apply the same no-network/no-storage guards to both delivery formats.
validateScript({ ...script, content: extension.outputFiles[0].text });
await writeFile('extension.js', extension.outputFiles[0].text);
await writeFile('work/extension-build-meta.json', JSON.stringify(extension.metafile, null, 2));
console.log('Built extension.js for manifest.json; assets embedded, no runtime imports.');
