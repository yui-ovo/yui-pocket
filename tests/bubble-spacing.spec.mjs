import {test,expect} from '@playwright/test';
const b=(p,name)=>p.getByRole('button',{name,exact:true});
async function open(p){await p.goto('/');await b(p,'打开 Yui 演示手机').click();await b(p,'打开信息').click();await b(p,'打开与小桃的聊天').click();}
async function settings(p){await b(p,'打开聊天设置').click();await b(p,'聊天外观').click();}
async function back(p){await b(p,'取消').click();await b(p,'‹ 返回').click();}
test('spacing has the old height as ceiling; compact bubbles keep text metrics, alignment and saved preferences',async({page})=>{
 await open(page);await settings(page);const slider=page.getByLabel('气泡上下留白');await expect(slider).toHaveAttribute('min','0');await expect(slider).toHaveAttribute('max','9');await expect(slider).toHaveValue('4');
 const bubble=page.locator('.reading-preview .friend .bubble');
 const geometry=()=>bubble.evaluate(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {height:r.height,width:r.width,font:s.fontSize,line:s.lineHeight,vertical:parseFloat(s.paddingTop)+parseFloat(s.paddingBottom)+parseFloat(s.borderTopWidth)+parseFloat(s.borderBottomWidth)};});
 await slider.fill('9');const wide=await geometry();expect(wide.vertical).toBe(27);
 await slider.fill('0');const tight=await geometry();expect(tight.height).toBeCloseTo(wide.height-18,0);expect(tight.width).toBe(wide.width);expect(tight.font).toBe(wide.font);expect(tight.line).toBe(wide.line);
 await b(page,'保存聊天外观').click();await back(page);await expect(page.locator('.phone')).toHaveCSS('--reading-padding','0px');
 await settings(page);await slider.fill('9');await back(page);await expect(page.locator('.phone')).toHaveCSS('--reading-padding','0px');
 await page.reload();await b(page,'打开 Yui 演示手机').click();await b(page,'打开信息').click();await b(page,'打开与小桃的聊天').click();await expect(page.locator('.phone')).toHaveCSS('--reading-padding','0px');
 await settings(page);await b(page,'恢复聊天外观默认').click();await expect(slider).toHaveValue('4');
});
test('old reading data gets compact default without writes; excessive padding clamps to the ceiling',async({page})=>{
 await page.goto('/');const old={version:2,global:{version:1,fontSize:16,lineHeight:1.8},contacts:{}};await page.evaluate(x=>localStorage.setItem('yui-pocket.reading.v2',JSON.stringify(x)),old);await open(page);await expect(page.locator('.phone')).toHaveCSS('--reading-padding','4px');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('yui-pocket.reading.v2')))).toEqual(old);
 await page.evaluate(()=>{const k='yui-pocket.reading.v2',x=JSON.parse(localStorage.getItem(k));x.global.bubblePadding=999;localStorage.setItem(k,JSON.stringify(x));});await page.reload();await b(page,'打开 Yui 演示手机').click();await expect(page.locator('.phone')).toHaveCSS('--reading-padding','9px');
});
test('compact long text at largest font scrolls on a short screen; raster knit loads only inside the shell',async({page})=>{
 await page.setViewportSize({width:375,height:340});await open(page);await settings(page);
 await page.getByLabel('气泡文字大小').fill('24');await page.getByLabel('气泡文字行距').fill('2.4');await page.getByLabel('气泡上下留白').fill('0');await b(page,'保存聊天外观').click();await back(page);
 await page.getByLabel('演示消息输入框').fill('这段长消息正常换行，不应该被裁掉。'.repeat(18));await b(page,'发送').click();
 const result=await page.locator('.chat-page .message').last().evaluate(row=>{const e=row.querySelector('.bubble'),s=getComputedStyle(e),a=row.querySelector('.message-avatar').getBoundingClientRect();const range=document.createRange();range.selectNodeContents(e);const text=range.getBoundingClientRect(),bounds=e.getBoundingClientRect();return {overflow:text.bottom>bounds.bottom-3||text.right>bounds.right-3,delta:Math.abs(a.bottom-e.getBoundingClientRect().bottom),font:s.fontSize};});expect(result.overflow).toBe(false);expect(result.delta).toBeLessThan(6);expect(result.font).toBe('24px');
 for(const name of ['发送','打开聊天设置','返回信息列表','关闭手机'])await expect(b(page,name)).toBeInViewport();
 const texture=await page.locator('.phone').evaluate(async e=>{const css=getComputedStyle(e),v=css.getPropertyValue('--kit-knit'),src=v.slice(v.indexOf('"')+1,v.lastIndexOf('"'));const i=new Image();i.src=src;await i.decode();return {width:i.width,local:src.startsWith('data:image/png;base64,'),background:css.backgroundImage};});expect(texture.width).toBe(384);expect(texture.local).toBe(true);expect(texture.background).not.toContain('radial-gradient');
});
