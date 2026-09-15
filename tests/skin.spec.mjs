import { test, expect } from '@playwright/test';
const b=(p,name)=>p.getByRole('button',{name,exact:true});
async function demo(page){await page.goto('/');await b(page,'打开 Yui 演示手机').click();await b(page,'打开信息').click();await b(page,'打开与小桃的聊天').click();}
async function alignedAvatars(page){
  const rows=await page.locator('.chat-page .message').evaluateAll(nodes=>nodes.map(row=>{
    const avatar=row.querySelector('.message-avatar').getBoundingClientRect(),bubble=row.querySelector('.bubble').getBoundingClientRect(),time=row.querySelector('.message-time').getBoundingClientRect();
    return {avatarBottom:avatar.bottom,bubbleBottom:bubble.bottom,timeTop:time.top};
  }));
  for(const row of rows){
    // Permit the PNG's transparent bottom inset; a nickname or timestamp must not shift alignment.
    expect(Math.abs(row.avatarBottom-row.bubbleBottom)).toBeLessThanOrEqual(6);
    expect(row.timeTop).toBeGreaterThan(row.avatarBottom+1);
  }
}

test('all embedded skin PNGs decode with real alpha and no external assets; artwork buttons operate',async({page})=>{
  await demo(page);
  const decoded=await page.locator('.phone').evaluate(async phone=>{
    const style=getComputedStyle(phone);const keys=['header','chat-header','white','pink','row','frame','search','input','composer','heart','star','messages','contacts','mic','smile','plus','me','pattern','wallpaper'];
    return Promise.all(keys.map(async key=>{
      const value=style.getPropertyValue('--kit-'+key),source=value.slice(value.indexOf('"')+1,value.lastIndexOf('"'));
      const image=new Image();image.src=source;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d');context.drawImage(image,0,0);
      const bytes=context.getImageData(0,0,canvas.width,canvas.height).data;let clear=0,solid=0;for(let i=3;i<bytes.length;i+=4){if(bytes[i]<8)clear++;if(bytes[i]>240)solid++;}
      return {key,local:source.startsWith('data:image/png;base64,'),clear,solid};
    }));
  });
  for(const asset of decoded){expect(asset.local,asset.key).toBe(true);expect(asset.solid,asset.key).toBeGreaterThan(10);}
  expect(decoded.find(x=>x.key==='star').clear).toBeGreaterThan(100);
  expect(decoded.find(x=>x.key==='frame').clear).toBeGreaterThan(1000);
  const requests=[];page.on('request',r=>requests.push(r.url()));
  for(const name of ['语音','表情','更多工具']){await b(page,`${name}（待接入）`).click();await expect(page.locator('.chat-page .status')).toContainText(`${name}尚未接入`);}
  await b(page,'打开聊天设置').click();await b(page,'‹ 返回').click();await b(page,'返回信息列表').click();
  await b(page,'打开页面导航').click();await b(page,'通讯录').click();await expect(page.locator('.directory-tabs')).toBeVisible();
  await b(page,'信息').click();await b(page,'打开与小桃的聊天').click();expect(requests).toHaveLength(0);
});

for(const [width,height] of [[375,740],[320,568],[375,340]])test(`raster skin ${width}x${height}: long bubbles grow while ornaments and controls stay fixed`,async({page})=>{
  await page.setViewportSize({width,height});await demo(page);
  await alignedAvatars(page);
  const before=await page.locator('.chat-page .self .bubble').first().evaluate(el=>({width:getComputedStyle(el,'::after').width,height:getComputedStyle(el,'::after').height}));
  const header=await page.locator('.chat-header').boundingBox(),title=await page.locator('.chat-header .identity').boundingBox();
  expect(Math.abs(title.y+title.height/2-header.y-header.height/2)).toBeLessThan(2);expect(title.x).toBeGreaterThan(header.x+header.width*.15);
  await expect(page.locator('.chat-header .header-search')).toHaveCount(0);
  const designs=await page.locator('.chat-page .bubble').evaluateAll(nodes=>nodes.slice(0,2).map(el=>getComputedStyle(el).borderImageSource));expect(designs[0]).not.toEqual(designs[1]);
  if(width===375&&height===740){await page.locator('.chat-page .messages').evaluate(el=>el.scrollTop=0);await page.locator('.phone').screenshot({path:'outputs/preview-yui-selected-bubbles.png'});}
  await b(page,'打开聊天设置').click();await b(page,'聊天外观').click();await page.getByLabel('气泡文字大小').fill('24');await page.getByLabel('气泡文字行距').fill('2.4');await page.getByLabel('消息头像大小').fill('64');await page.getByLabel('消息头像圆角').fill('0');await b(page,'保存聊天外观').click();await b(page,'取消').click();await b(page,'‹ 返回').click();
  await page.getByLabel('演示消息输入框').fill('一段可以换行的长文字。'.repeat(40));await b(page,'发送').click();
  await alignedAvatars(page);
  const after=await page.locator('.chat-page .bubble').last().evaluate(el=>({width:getComputedStyle(el,'::after').width,height:getComputedStyle(el,'::after').height}));expect(after).toEqual(before);
  await expect(page.locator('.chat-page .message-avatar').first()).toHaveCSS('border-radius','0%');
  expect(await page.locator('.chat-page .messages').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  for(const name of ['发送','打开聊天设置','返回信息列表','关闭手机'])await expect(b(page,name)).toBeInViewport();
  await page.locator('.phone').screenshot({path:`outputs/preview-skin-max-${width}x${height}.png`});
});
