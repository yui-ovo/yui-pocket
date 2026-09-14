import assert from 'node:assert/strict';

// Local checks against the verified Helper Script shape. Not a live import test.
export function validateScript(data) {
  assert.equal(data.type, 'script');
  assert.equal(data.enabled, false);
  for (const key of ['name', 'id', 'content', 'info']) assert.equal(typeof data[key], 'string', key);
  assert.match(data.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.ok(data.content.length > 100);
  assert.deepEqual(data.button, { enabled: false, buttons: [] });
  assert.deepEqual(data.data, {});
  assert.deepEqual(data.export_with, { data: false, button: false });
  assert.deepEqual(Object.keys(data).sort(), ['type', 'enabled', 'name', 'id', 'content', 'info', 'button', 'data', 'export_with'].sort());
  // Policy guards for this stage. Runtime browser request interception is a separate check.
  // SVG namespace is an identifier, fragment paint servers are local, JPEG data is embedded.
  const executable = data.content.replaceAll('http://www.w3.org/2000/svg', '').replace(/url\(#rp-[a-z-]+\)/g, '');
  assert.doesNotMatch(executable, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts|eval)\s*\(|\bimport\s*(?:\(|["'])|https?:\/\/|@import|\burl\s*\((?!#rp-)/i);
  assert.doesNotMatch(data.content, /\b(?:sessionStorage|indexedDB|TavernHelper|SillyTavern)\b/);
  assert.match(data.content, /yui-pocket\.appearance\.v1/);
  assert.doesNotMatch(data.content, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|setInterval|setTimeout/);
  return data;
}
