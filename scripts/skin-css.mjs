import { readFile } from 'node:fs/promises';

// Build-time only: the asset name grammar cannot access paths or remote URLs.
export const skinCss = {
  name: 'embedded-skin-png',
  setup(build) {
    build.onLoad({ filter: /\.skin\.css$/ }, async ({ path }) => {
      let contents = await readFile(path, 'utf8');
      const names = [...new Set([...contents.matchAll(/asset\(([a-z-]+)\)/g)].map(match => match[1]))];
      const watchFiles = [path];
      for (const name of names) {
        const file = `src/assets/skin/${name}.png`, bytes = await readFile(file);
        if (bytes.subarray(0,8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`Invalid skin PNG: ${name}`);
        contents = contents.replaceAll(`asset(${name})`, `url("data:image/png;base64,${bytes.toString('base64')}")`);
        watchFiles.push(file);
      }
      if (/asset\(/.test(contents)) throw new Error('Unresolved skin asset');
      return { contents, loader: 'text', watchFiles };
    });
  },
};
