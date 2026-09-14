import { test, expect } from '@playwright/test';
const key = 'yui-pocket.appearance.v1';
const root = '#yui-pocket-root';
async function open(page) {
  await page.getByRole('button', { name: '打开 Yui 演示手机' }).click();
  await page.getByRole('button', { name: '打开美化', exact: true }).click();
}
test.beforeEach(async ({ page }) => { await page.goto('/'); await expect(page.locator(root)).toHaveCount(1); });

test('four corners are independent, strap has foreground anchor and artwork passes clicks through', async ({ page }) => {
  await open(page);
  const choices = [['top-left','蜡笔爱心','heart'],['top-right','垂尾蝴蝶结','bow'],['bottom-left','奶白兔兔','rabbit'],['bottom-right','粉色纽扣','button']];
  for (const [corner, name, id] of choices) {
    await page.getByLabel('装饰位置', { exact: true }).selectOption(corner);
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.locator(`[data-corner='${corner}']`)).toHaveAttribute('data-asset', id);
  }
  await page.getByLabel('装饰位置', { exact: true }).selectOption('strap');
  await page.getByLabel('挂点方向').selectOption('right');
  await page.getByLabel('大小',{exact:true}).fill('120');
  await page.getByLabel('旋转',{exact:true}).fill('-4');
  await expect(page.locator('.decoration-layer')).toHaveAttribute('data-side','right');
  const geometry = await page.locator(root).evaluate(node => {
    const s=node.shadowRoot, anchor=s.querySelector('.strap-anchor'), keys=s.querySelector('.side-keys');
    return { aboveKeys:anchor.getBoundingClientRect().top<keys.getBoundingClientRect().top,
      foreground:Number(getComputedStyle(s.querySelector('.decoration-layer')).zIndex)>Number(getComputedStyle(s.querySelector('.screen')).zIndex),
      noHit:[...s.querySelectorAll('.decoration-layer,.decoration-layer *')].every(el=>getComputedStyle(el).pointerEvents==='none') };
  });
  expect(geometry).toEqual({aboveKeys:true,foreground:true,noHit:true});
  const strapBox = await page.locator('.charm').boundingBox();
  expect(strapBox.x + strapBox.width).toBeLessThanOrEqual(page.viewportSize().width);
  expect(await page.locator('.sticker-gallery img').evaluateAll(async imgs => { await Promise.all(imgs.map(img=>img.decode())); return imgs.length; })).toBe(36);
  await page.getByRole('button',{name:'Home · 返回主屏幕'}).click();
  await expect(page.locator('.home-page')).toBeVisible();
  await page.screenshot({path:'outputs/preview-beautify-decorated.png'});
  await page.getByRole('button',{name:'关闭手机',exact:true}).click();
  await expect(page.locator('.decoration-layer')).toHaveCount(0);
  await page.locator('#host-probe').click();
});

test('explicit appearance save survives reload, reset owns one key and contains no chat', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('host-setting-test','keep'));
  await open(page);
  await page.getByRole('button',{name:'蜡笔爱心',exact:true}).click();
  await page.getByLabel('大小',{exact:true}).fill('120');
  await page.getByRole('button',{name:'保存外观',exact:true}).click();
  const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  expect(Object.keys(saved).sort()).toEqual(['corners','strap','version']);
  expect(saved.corners['top-left']).toEqual({image:'heart',size:120,angle:0});
  await page.reload(); await open(page);
  await expect(page.locator('[data-corner="top-left"]')).toHaveAttribute('data-asset','heart');
  await page.getByRole('button',{name:'恢复默认',exact:true}).click();
  expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull();
  expect(await page.evaluate(()=>localStorage.getItem('host-setting-test'))).toBe('keep');
});

test('local upload is raster-only, persists sanitized pixels and makes no outbound requests', async ({ page }) => {
  await open(page);
  const requests=[]; await page.route('**/*',route=>{requests.push(route.request().url());return route.abort();});
  const input=page.getByLabel('导入装饰图片');
  await input.setInputFiles('src/assets/stickers/rabbit.png');
  await expect(page.locator('.beauty-status')).toContainText('图片已预览');
  await expect(page.locator('[data-corner="top-left"]')).toHaveAttribute('data-asset','custom');
  await page.getByRole('button',{name:'保存外观',exact:true}).click();
  const source=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).corners['top-left'].image,key);
  expect(source).toMatch(/^data:image\/(webp|png);base64,/);
  await input.setInputFiles({name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg onload="alert(1)"></svg>')});
  await expect(page.locator('.beauty-status')).toContainText('请选择 PNG');
  await input.setInputFiles({name:'oversize.png',mimeType:'image/png',buffer:Buffer.alloc(2100000)});
  await expect(page.locator('.beauty-status')).toContainText('小于 2 MB');
  expect(requests).toEqual([]);
});

test('corrupt or remote image preferences fail closed; quota failure is visible', async ({ page }) => {
  await page.evaluate(k=>localStorage.setItem(k,JSON.stringify({version:1,corners:{'top-left':{image:'https://invalid.test/a.png',size:999,angle:999}}})),key);
  await page.reload(); await open(page);
  await expect(page.locator('[data-corner="top-left"]')).toBeHidden();
  await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError');};});
  await page.getByRole('button',{name:'保存外观',exact:true}).click();
  await expect(page.locator('.beauty-status')).toContainText('本机保存失败');
  await page.getByRole('button',{name:'关闭手机',exact:true}).click();
  await expect(page.locator(root)).toHaveCount(1);
});

test('closing during image decode cannot apply stale edit or resurrect panel', async ({ page }) => {
  await open(page);
  await page.evaluate(()=>{const original=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=function(){return original.call(this).then(()=>new Promise(resolve=>window.finishDecode=resolve));};});
  await page.getByLabel('导入装饰图片').setInputFiles('src/assets/stickers/rabbit.png');
  await page.waitForFunction(()=>window.finishDecode);
  await page.getByRole('button',{name:'关闭手机',exact:true}).click();
  await page.evaluate(()=>window.finishDecode());
  await open(page);
  await expect(page.locator('[data-corner="top-left"]')).toBeHidden();
  expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull();
});

for(const [width,height] of [[320,568],[375,340]]) test(`beautify ${width}x${height} scrolls and keeps save/back usable`,async({page})=>{
  await page.setViewportSize({width,height}); await open(page);
  await page.getByLabel('装饰位置',{exact:true}).selectOption('bottom-right');
  await page.getByRole('button',{name:'粉色猫爪',exact:true}).click();
  await page.getByRole('button',{name:'保存外观',exact:true}).click();
  const box=await page.getByRole('button',{name:'保存外观',exact:true}).boundingBox();
  expect(box.y+box.height).toBeLessThanOrEqual(height);
  await page.screenshot({path:`outputs/preview-beautify-${width}x${height}.png`});
  await page.getByRole('button',{name:'美化返回主屏幕'}).click();
  await expect(page.locator('.home-page')).toBeVisible();
});
