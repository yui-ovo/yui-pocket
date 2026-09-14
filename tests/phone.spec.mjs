import { test, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
const root = '#yui-pocket-root';
const openPhone = async page => {
  await page.getByRole('button', { name: '打开 Yui 演示手机' }).click();
  await page.getByRole('button', { name: '打开信息', exact: true }).click();
  await page.getByRole('button', { name: '打开与小桃的聊天', exact: true }).click();
};
const closePhone = page => page.getByRole('button', { name: '关闭手机', exact: true }).click();

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(root)).toHaveCount(1);
});

test('open, send, blank/double submit, literal hostile text, close, reopen; host untouched', async ({ page }) => {
  const story = await page.locator('#host-story').innerHTML();
  await openPhone(page);
  await expect(page.getByText('演示模式：不调用 AI，不保存聊天', { exact: true })).toBeVisible();
  await expect(page.locator('.message')).toHaveCount(3);
  const input = page.getByRole('textbox', { name: '演示消息输入框' });
  await expect(page.getByRole('button', { name: '发送', exact: true })).toBeDisabled();
  await input.fill('   ');
  await expect(page.getByRole('button', { name: '发送', exact: true })).toBeDisabled();
  const hostile = '<img src="https://invalid.test/x" onerror="window.__injected=1"><script>window.__injected=1</script> & 你好';
  await input.fill(hostile);
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await page.locator('.composer').evaluate(form => form.requestSubmit());
  await expect(page.locator('.message')).toHaveCount(4);
  await expect(page.locator('.bubble').last()).toHaveText(hostile);
  await expect(page.locator(`${root} .messages img, ${root} script`)).toHaveCount(0);
  expect(await page.evaluate(() => window.__injected)).toBeUndefined();
  await closePhone(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('#host-probe').click();
  await expect(page.locator('#host-probe')).toHaveText('宿主按钮：1');
  await page.locator('#host-input').fill('宿主输入可用');
  expect(await page.locator('#host-story').innerHTML()).toBe(story);
  await openPhone(page);
  await expect(page.locator('.message')).toHaveCount(4);
  await page.getByRole('button', { name: '关闭手机', exact: true }).press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('20 open/close cycles and new iframe replacement keep one instance; stale unload cannot remove new instance', async ({ page }) => {
  for (let index = 0; index < 20; index++) { await openPhone(page); await closePhone(page); }
  await page.evaluate(() => window.boot());
  await expect(page.locator(root)).toHaveCount(1);
  await page.locator('iframe[data-mock-runner]').first().evaluate(frame => frame.remove());
  await expect(page.locator(root)).toHaveCount(1);
  await openPhone(page);
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.getByRole('textbox', { name: '演示消息输入框' }).fill('只出现一次');
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await expect(page.locator('.message')).toHaveCount(4);
  await page.evaluate(() => window.disable());
  await expect(page.locator(root)).toHaveCount(0);
  await page.evaluate(() => window.boot());
  await openPhone(page);
  await expect(page.locator('.message')).toHaveCount(3);
});

test('actual iframe removal clears own listeners and all nodes, with no mask or host writes', async ({ page }) => {
  await page.evaluate(() => window.disable());
  // Instrument both the parent and iframe realms before executing the product bundle.
  await page.evaluate(() => {
    window.__listeners = new Set();
    window.__instrument = targetWindow => {
      const proto = targetWindow.EventTarget.prototype;
      const add = proto.addEventListener;
      const remove = proto.removeEventListener;
      proto.addEventListener = function(type, handler, options) {
        const entry = { target: this, type, handler };
        window.__listeners.add(entry);
        return add.call(this, type, handler, options);
      };
      proto.removeEventListener = function(type, handler, options) {
        for (const entry of window.__listeners) {
          if (entry.target === this && entry.type === type && entry.handler === handler) window.__listeners.delete(entry);
        }
        return remove.call(this, type, handler, options);
      };
    };
    window.__instrument(window);
  });
  const { content } = JSON.parse(await readFile('dist/yui.v0.2-step1.json', 'utf8'));
  await page.evaluate(code => {
    const frame = document.createElement('iframe');
    frame.id = 'instrumented';
    frame.hidden = true;
    document.body.append(frame);
    window.__instrument(frame.contentWindow);
    const script = frame.contentDocument.createElement('script');
    script.textContent = code;
    frame.contentDocument.body.append(script);
    window.__productListeners = new Set(window.__listeners);
  }, content);
  await openPhone(page);
  await page.evaluate(() => {
    window.__panelListeners = new Set([...window.__listeners].filter(entry => entry.target?.getRootNode?.()?.host?.id === 'yui-pocket-root' && entry.target.className !== 'launcher'));
  });
  await closePhone(page);
  expect(await page.evaluate(() => [...window.__listeners].filter(entry => window.__panelListeners.has(entry)).map(entry => entry.type))).toEqual([]);
  await openPhone(page);
  await page.evaluate(() => {
    for (const entry of window.__listeners) {
      if (entry.target?.getRootNode?.()?.host?.id === 'yui-pocket-root') window.__productListeners.add(entry);
    }
  });
  await page.locator('#instrumented').evaluate(frame => frame.remove());
  await expect(page.locator(root)).toHaveCount(0);
  const retained = await page.evaluate(() => [...window.__listeners].filter(entry => window.__productListeners.has(entry) || entry.target?.getRootNode?.()?.host?.id === 'yui-pocket-root').map(entry => entry.type));
  expect(retained).toEqual([]);
  await page.locator('#host-probe').click();
  await expect(page.locator('#host-probe')).toHaveText('宿主按钮：1');
});

test('visual viewport shrinks/offsets independently of layout viewport; theme CSS stays isolated', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await openPhone(page);
  await page.addStyleTag({ content: 'button { background: black !important; color: lime !important; font-size: 50px !important; } textarea { height: 200px !important; }' });
  await page.evaluate(() => {
    const viewport = window.visualViewport;
    Object.defineProperties(viewport, { height: { configurable: true, value: 340 }, offsetTop: { configurable: true, value: 180 } });
    viewport.dispatchEvent(new Event('resize'));
    viewport.dispatchEvent(new Event('scroll'));
  });
  await expect(page.locator(root)).toHaveAttribute('data-compact', '');
  for (const locator of [page.getByRole('textbox', { name: '演示消息输入框' }), page.getByRole('button', { name: '发送', exact: true }), page.getByRole('button', { name: '关闭手机', exact: true })]) {
    const box = await locator.boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(180);
    expect(box.y + box.height).toBeLessThanOrEqual(520);
  }
  const input = page.getByRole('textbox', { name: '演示消息输入框' });
  await input.fill('键盘缩小时仍能发送');
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await expect(page.locator('.message')).toHaveCount(4);
  await page.screenshot({ path: 'outputs/preview-visual-viewport.png' });
  await page.evaluate(() => {
    delete window.visualViewport.height; delete window.visualViewport.offsetTop;
    window.visualViewport.dispatchEvent(new Event('resize'));
  });
  await expect(page.locator(root)).not.toHaveAttribute('data-compact');
});

test('product makes zero network or chat-storage calls; only owned appearance read allowed', async ({ page }) => {
  await page.evaluate(() => window.disable());
  const requests = [];
  await page.route('**/*', route => { requests.push(route.request().url()); return route.abort(); });
  const { content } = JSON.parse(await readFile('dist/yui.v0.2-step1.json', 'utf8'));
  await page.evaluate(code => {
    window.__forbidden = [];
    const frame = document.createElement('iframe');
    frame.id = 'offline-runner';
    frame.hidden = true;
    document.body.append(frame);
    for (const realm of [window, frame.contentWindow]) {
      for (const key of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource']) {
        realm[key] = function() { window.__forbidden.push(key); throw new Error('forbidden'); };
      }
      for (const key of ['getItem', 'setItem', 'removeItem', 'clear']) {
        realm.Storage.prototype[key] = function(name) {
          if (key === 'getItem' && ['yui-pocket.appearance.v1','yui-pocket.reading.v1','yui-pocket.reading.v2'].includes(name)) return null;
          window.__forbidden.push('storage.' + key); throw new Error('forbidden');
        };
      }
      realm.navigator.sendBeacon = () => { window.__forbidden.push('sendBeacon'); return false; };
    }
    const script = frame.contentDocument.createElement('script');
    script.textContent = code;
    frame.contentDocument.body.append(script);
  }, content);
  await openPhone(page);
  await page.getByRole('textbox', { name: '演示消息输入框' }).fill('<img src="https://invalid.test/a">');
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await closePhone(page);
  await page.locator('#offline-runner').evaluate(frame => frame.remove());
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => window.__forbidden)).toEqual([]);
});

test('same-frame double execution and ready callback arriving after disable are safe', async ({ page }) => {
  await page.evaluate(() => window.disable());
  const { content } = JSON.parse(await readFile('dist/yui.v0.2-step1.json', 'utf8'));
  await page.evaluate(code => {
    const frame = document.createElement('iframe'); frame.id = 'double'; frame.hidden = true; document.body.append(frame);
    for (let i = 0; i < 2; i++) { const script = frame.contentDocument.createElement('script'); script.textContent = code; frame.contentDocument.body.append(script); }
  }, content);
  await expect(page.locator(root)).toHaveCount(1);
  await openPhone(page);
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.locator('#double').evaluate(frame => frame.remove());
  await expect(page.locator(root)).toHaveCount(0);
  await page.evaluate(code => {
    const frame = document.createElement('iframe'); frame.hidden = true; document.body.append(frame);
    let pending;
    frame.contentWindow.$ = callback => { pending = callback; };
    const script = frame.contentDocument.createElement('script'); script.textContent = code; frame.contentDocument.body.append(script);
    frame.contentWindow.dispatchEvent(new Event('pagehide'));
    pending(); frame.remove();
  }, content);
  await expect(page.locator(root)).toHaveCount(0);
});

for (const [name, width, height] of [['desktop', 1280, 900], ['narrow', 375, 667], ['small', 320, 568], ['keyboard-sized', 375, 340], ['landscape', 667, 375]]) {
  test(`layout ${name}: visible controls, no overflow, screenshot`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openPhone(page);
    const input = page.getByRole('textbox', { name: '演示消息输入框' });
    const send = page.getByRole('button', { name: '发送', exact: true });
    const center = await page.locator('.home').boundingBox();
    const screen = await page.locator('.screen').boundingBox();
    expect(Math.abs(center.x + center.width / 2 - screen.x - screen.width / 2)).toBeLessThan(1);
    await expect(page.locator('.top-sticker, .cross-sticker')).toHaveCount(0);
    if (height >= 530) {
      const shell = await page.getByRole('dialog').boundingBox();
      const top = await page.locator('.shell-top').boundingBox();
      const bottom = await page.locator('.shell-bottom').boundingBox();
      expect((top.height + bottom.height) / shell.width).toBeLessThan(.37);
      expect(shell.height / shell.width).toBeLessThan(1.76);
    }
    for (const locator of [page.getByRole('dialog'), input, send, page.getByRole('button', { name: '关闭手机', exact: true })]) {
      const box = await locator.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
    }
    await input.fill('一段长消息'.repeat(100));
    await send.click();
    expect(await page.locator('.messages').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    // Reset examples for clean design evidence.
    await page.evaluate(async () => { window.disable(); await window.boot(); });
    await openPhone(page);
    await mkdir('outputs', { recursive: true });
    await page.screenshot({ path: `outputs/preview-${name}.png` });
    await page.getByRole('button', { name: 'Home · 返回主屏幕', exact: true }).click();
    await page.screenshot({ path: `outputs/preview-home-${name}.png` });
    await page.getByRole('button', { name: '打开信息', exact: true }).click();
    await page.screenshot({ path: `outputs/preview-contacts-${name}.png` });
  });
}

test('Yui Dock opens contacts first; back/Home preserve draft and message preview; embedded stickers decode', async ({ page }) => {
  await page.getByRole('button', { name: '打开 Yui 演示手机' }).click();
  await expect(page.locator('.home-page')).toBeVisible();
  expect(await page.locator(root).evaluate(node => node.shadowRoot.textContent)).not.toMatch(/ruru/i);
  const alpha = await page.locator('.strap-image').evaluate(async img => {
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const context = canvas.getContext('2d');
    context.drawImage(img, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0, opaque = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) transparent++;
      if (pixels[i] === 255) opaque++;
    }
    return { corner: pixels[3], transparent, opaque };
  });
  expect(alpha.corner).toBe(0);
  expect(alpha.transparent).toBeGreaterThan(1000);
  expect(alpha.opaque).toBeGreaterThan(1000);
  await expect(page.locator('.dock .app-icon')).toHaveCount(3);
  for (const img of await page.locator('.sticker-image').all()) {
    expect(await img.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
    expect(await img.evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true);
  }
  const ids = await page.locator(`${root} [id]`).evaluateAll(nodes => nodes.map(node => node.id));
  expect(new Set(ids).size).toBe(ids.length);
  await expect(page.getByRole('textbox', { name: '演示消息输入框' })).toBeHidden();
  const icon = page.locator('.app-icon[aria-label="打开信息"] .envelope-icon');
  expect(await icon.getAttribute('src')).toMatch(/^data:image\/jpeg;base64,/);
  expect(await icon.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await page.getByRole('button', { name: '打开信息', exact: true }).click();
  await expect(page.locator('.contacts-page')).toBeVisible();
  await expect(page.getByRole('textbox', { name: '演示消息输入框' })).toBeHidden();
  await page.getByRole('button', { name: '打开与小桃的聊天', exact: true }).click();
  const input = page.getByRole('textbox', { name: '演示消息输入框' });
  await input.fill('保留这份草稿');
  for (let i = 0; i < 10; i++) {
    await page.getByRole('button', { name: 'Home · 返回主屏幕', exact: true }).click();
    await expect(page.locator('.home-page')).toBeVisible();
    await page.getByRole('button', { name: '打开信息', exact: true }).click();
    await page.getByRole('button', { name: '打开与小桃的聊天', exact: true }).click();
  }
  await expect(input).toHaveValue('保留这份草稿');
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await expect(page.locator('.message')).toHaveCount(4);
  await page.getByRole('button', { name: '返回联系人列表', exact: true }).click();
  await expect(page.locator('.contacts-page')).toBeVisible();
  await expect(page.locator('.contact-preview')).toHaveText('我：保留这份草稿');
  await page.getByRole('button', { name: '返回主屏幕', exact: true }).click();
  await expect(page.locator('.home-page')).toBeVisible();
  await closePhone(page);
  await page.getByRole('button', { name: '打开 Yui 演示手机' }).click();
  await expect(page.locator('.home-page')).toBeVisible();
  await page.getByRole('button', { name: '打开信息', exact: true }).click();
  await page.getByRole('button', { name: '打开与小桃的聊天', exact: true }).click();
  await expect(page.locator('.message')).toHaveCount(4);
});
