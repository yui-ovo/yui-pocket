import {test,expect} from '@playwright/test';
const b=(p,name)=>p.getByRole('button',{name,exact:true});
async function open(p){await p.goto('/');await b(p,'打开 Yui 演示手机').click();await b(p,'打开信息').click();}
const key='yui-pocket.theme.v1';
test('theme save/cancel/default are separate from decoration and reading data, survive reload',async({page})=>{
 await open(page);await page.evaluate(()=>{localStorage.setItem('yui-pocket.appearance.v1','{"version":1,"marker":"keep"}');localStorage.setItem('yui-pocket.reading.v2','{"marker":"keep"}');});
 await b(page,'打开主题美化').click();await expect(b(page,'页面导航')).toHaveCount(0);
 await b(page,'浅嫩粉').click();await expect(page.locator('.phone')).toHaveAttribute('data-theme','pink');await b(page,'取消').click();await expect(page.locator('.phone')).toHaveAttribute('data-theme','gray');
 await b(page,'打开主题美化').click();await b(page,'夜间黑').click();await b(page,'保存主题').click();await expect(page.locator('.theme-status')).toHaveText('主题已保存');await b(page,'‹ 返回').click();
 await b(page,'打开与小桃的聊天').click();await page.getByLabel('演示消息输入框').fill('未发送草稿');await b(page,'返回信息列表').click();await b(page,'打开主题美化').click();await b(page,'恢复默认').click();await b(page,'Home · 返回主屏幕').click();await expect(page.locator('.phone')).toHaveAttribute('data-theme','night');
 await b(page,'打开信息').click();await b(page,'打开与小桃的聊天').click();await expect(page.getByLabel('演示消息输入框')).toHaveValue('未发送草稿');
 await b(page,'返回信息列表').click();await b(page,'打开主题美化').click();await b(page,'浅嫩粉').click();await b(page,'关闭手机').click();await b(page,'打开 Yui 演示手机').click();await expect(page.locator('.phone')).toHaveAttribute('data-theme','night');
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe('night');for(const k of ['yui-pocket.appearance.v1','yui-pocket.reading.v2'])expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).marker,k)).toBe('keep');
 await page.reload();await b(page,'打开 Yui 演示手机').click();await expect(page.locator('.phone')).toHaveAttribute('data-theme','night');
});
test('theme storage failure is visible and cancel restores saved theme',async({page})=>{
 await open(page);await b(page,'打开主题美化').click();await page.evaluate(()=>{const old=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='yui-pocket.theme.v1')throw Error('quota');return old.call(this,k,v);};});
 await b(page,'浅嫩粉').click();await b(page,'保存主题').click();await expect(page.locator('.theme-status')).toContainText('保存失败');await b(page,'取消').click();await expect(page.locator('.phone')).toHaveAttribute('data-theme','gray');
});
for(const [width,height] of [[375,740],[320,568],[375,340]])test(`whole themes and circular controls ${width}x${height}`,async({page})=>{
 await page.setViewportSize({width,height});await open(page);
 for(const [label,id] of [['浅灰','gray'],['浅嫩粉','pink'],['夜间黑','night']]){
  await b(page,'打开主题美化').click();await b(page,label).click();await b(page,'保存主题').click();await b(page,'‹ 返回').click();
  const card=await b(page,'打开与小桃的聊天').boundingBox();expect(card.height).toBeLessThan(74);
  await b(page,'打开与小桃的聊天').click();await expect(page.locator('.phone')).toHaveAttribute('data-theme',id);
  for(const name of ['返回信息列表','打开聊天设置']){const box=await b(page,name).boundingBox();expect(Math.abs(box.width-box.height)).toBeLessThan(.5);await expect(b(page,name)).toBeInViewport();}
  await expect(page.locator('.send svg')).toBeVisible();const bubbles=await page.locator('.chat-page .bubble').evaluateAll(els=>els.slice(0,2).map(e=>getComputedStyle(e).borderImageSource));expect(bubbles[0]).toBe(bubbles[1]);
  const color=await page.locator('.chat-page .bubble').first().evaluate(e=>getComputedStyle(e).color);expect(color).toBe(id==='night'?'rgb(229, 234, 242)':id==='pink'?'rgb(117, 83, 95)':'rgb(86, 98, 113)');
  await b(page,'返回信息列表').click();
 }
});
