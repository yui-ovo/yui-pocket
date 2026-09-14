import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

// Explicit allowlist; this fixture server never exposes workspace files or real chat data.
const routes = {
  '/': ['tests/host.html', 'text/html; charset=utf-8'],
  '/yui.v0.2-step1.json': ['dist/yui.v0.2-step1.json', 'application/json; charset=utf-8'],
  '/extension': ['tests/extension-host.html', 'text/html; charset=utf-8'],
  '/extension.js': ['extension.js', 'text/javascript; charset=utf-8'],
};
const server = createServer(async (request, response) => {
  const route = routes[new URL(request.url, 'http://127.0.0.1').pathname];
  if (!route) { response.writeHead(404).end(); return; }
  try {
    response.writeHead(200, { 'Content-Type': route[1], 'Cache-Control': 'no-store' });
    response.end(await readFile(route[0]));
  } catch { response.writeHead(500).end('Run npm run build first.'); }
});
server.listen(4173, '127.0.0.1', () => console.log('Mock host only: http://127.0.0.1:4173'));
