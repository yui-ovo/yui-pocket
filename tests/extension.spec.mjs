import { test, expect } from '@playwright/test';

const root = '#yui-pocket-root';
async function ready(page, suffix = '') {
  await page.goto('/extension' + suffix);
  await page.waitForFunction(() => window.fixtureReady);
}
async function chat(page) {
  await page.getByRole('button', { name: '打开 Yui 演示手机' }).click();
  await page.getByRole('button', { name: '打开信息', exact: true }).click();
  await page.getByRole('button', { name: '打开与小桃的聊天', exact: true }).click();
}

test('extension module boots without Helper, navigation/send stay literal; disable cleans and enable resets', async ({ page }) => {
  await ready(page);
  expect(await page.evaluate(() => window.ownListeners.length)).toBeGreaterThan(0);
  await chat(page);
  await page.getByRole('textbox').fill('<img src=x onerror=alert(1)>');
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await expect(page.locator('.message')).toHaveCount(4);
  await expect(page.locator('.bubble').last()).toHaveText('<img src=x onerror=alert(1)>');
  await expect(page.locator('.bubble img')).toHaveCount(0);
  await page.evaluate(() => window.extension.onDisable());
  await expect(page.locator(root)).toHaveCount(0);
  expect(await page.evaluate(() => window.ownListeners.length)).toBe(0);
  await page.locator('#probe').click();
  await expect(page.locator('#probe')).toHaveText('可点击');
  await expect(page.locator('#story')).toHaveText('虚构正文保持原样。');
  await page.evaluate(() => window.extension.onEnable());
  await chat(page);
  await expect(page.locator('.message')).toHaveCount(3);
  await page.evaluate(() => window.extension.onDelete());
  await expect(page.locator(root)).toHaveCount(0);
  expect(await page.evaluate(() => window.calls)).toEqual([]);
});

test('extension repeated activate/enable and replacement stay single; stale module disable is harmless', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => { for (let i = 0; i < 20; i++) { window.extension.onEnable(); window.extension.onActivate(); } });
  await expect(page.locator(root)).toHaveCount(1);
  await page.evaluate(async () => { window.replacement = await import('/extension.js?reload=1'); window.extension.onDisable(); });
  await expect(page.locator(root)).toHaveCount(1);
  await chat(page);
  await expect(page.locator('.message')).toHaveCount(3);
  await page.evaluate(() => window.replacement.onDisable());
  await expect(page.locator(root)).toHaveCount(0);
});

test('extension delayed ready cannot revive disabled UI; pagehide clears active instance', async ({ page }) => {
  await ready(page, '?delay=1');
  await page.evaluate(() => { window.extension.onDisable(); window.pendingReady.splice(0).forEach(callback => callback()); });
  await expect(page.locator(root)).toHaveCount(0);
  await page.evaluate(() => { window.extension.onEnable(); window.pendingReady.splice(0).forEach(callback => callback()); });
  await expect(page.locator(root)).toHaveCount(1);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect(page.locator(root)).toHaveCount(0);
});

test('extension replaces Helper instance; old Helper iframe unload cannot delete extension', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(root)).toHaveCount(1);
  await page.evaluate(async () => { window.extension = await import('/extension.js'); window.disable(); });
  await expect(page.locator(root)).toHaveCount(1);
  await chat(page);
  await page.evaluate(() => window.extension.onDisable());
  await expect(page.locator(root)).toHaveCount(0);
});
