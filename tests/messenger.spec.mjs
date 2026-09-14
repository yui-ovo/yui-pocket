import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const b=(p,name)=>p.getByRole('button',{name,exact:true});
async function boot(page){
  await page.addInitScript({content:await readFile('tests/profile-mock.js','utf8')});
  await page.route('**/api/users/me',route=>route.fulfill({json:{handle:'test-user'}}));
  await page.route('**/thumbnail?**',route=>route.fulfill({contentType:'image/png',path:'src/assets/stickers/rabbit.png'}));
  await page.goto('/');await b(page,'打开 Yui 演示手机').click();await b(page,'打开信息').click();
}
async function add(page,name,remark='',relation='friend'){
  await b(page,'添加人物').click();await b(page,'从当前角色卡带入').click();
  await page.getByLabel('人物名字',{exact:true}).fill(name);await page.getByLabel('手机备注',{exact:true}).fill(remark);
  await page.getByLabel('开局关系').selectOption(relation);await b(page,'保存联系人').click();
  await expect(page.getByRole('status').filter({visible:true})).toContainText('已保存');await b(page,'取消资料修改').click();
}

test('three messenger tabs, local name filter, and my-card entry preserve archive boundaries',async({page})=>{
  await boot(page);await expect(b(page,'打开联系人')).toHaveCount(0);
  await expect(page.getByRole('navigation',{name:'信息应用导航'}).getByRole('button')).toHaveCount(3);
  await expect(b(page,'信息')).toHaveAttribute('aria-current','page');await expect(b(page,'我的名片')).toHaveCount(0);
  await b(page,'通讯录').click();await add(page,'花店老板','阿棠');await add(page,'送花的姐姐');await add(page,'隐秘人物','','stranger');
  await page.getByLabel('筛选本页人物').fill('阿棠');await expect(page.locator('.friend-list .contact-row')).toHaveCount(1);
  await page.getByLabel('筛选本页人物').fill('花店');await expect(page.locator('.friend-list')).toContainText('阿棠');
  await b(page,'信息').click();await expect(page.getByLabel('筛选本页人物')).toHaveValue('');await expect(page.locator('.friend-list .contact-row')).toHaveCount(2);
  await page.getByLabel('筛选本页人物').fill('隐秘人物');await expect(page.locator('.friend-list .contact-row')).toHaveCount(0);await expect(page.locator('.people-setup')).toHaveCount(0);
  await page.getByLabel('筛选本页人物').fill('');await page.getByLabel('筛选本页人物').evaluate(el=>el.blur());await page.locator('.phone').screenshot({path:'outputs/preview-retro-information.png'});
  await b(page,'我').click();await expect(b(page,'添加人物')).toHaveCount(0);await b(page,'我的名片').click();await expect(page.locator('.directory-tabs')).toHaveCount(0);
  await page.getByLabel('我的虚构账号').fill('my_story_42');await b(page,'保存我的名片').click();await expect(page.getByRole('status').filter({visible:true})).toContainText('已保存');
  await b(page,'‹ 返回').click();await expect(b(page,'我')).toHaveAttribute('aria-current','page');await expect(b(page,'我的名片')).toContainText('my_story_42');
  await page.locator('.phone').screenshot({path:'outputs/preview-retro-me.png'});
  await page.reload();await b(page,'打开 Yui 演示手机').click();await b(page,'打开信息').click();await b(page,'我').click();await expect(b(page,'我的名片')).toContainText('my_story_42');
  await page.evaluate(()=>profileMock.switch('0','chat-B'));await expect(b(page,'我的名片')).not.toContainText('my_story_42');
  await page.evaluate(()=>profileMock.switch('0',null));await expect(page.locator('.empty-state:visible')).toContainText('先打开有效聊天');await expect(b(page,'我的名片')).toHaveCount(0);
  await b(page,'信息').click();await expect(b(page,'打开与小桃的聊天')).toBeVisible();
});

test('a delayed tab read cannot replace the newer me view or repopulate a closed phone',async({page})=>{
  await boot(page);await expect(b(page,'打开与小桃的聊天')).toBeVisible();
  let release;await page.route('**/api/users/me',async route=>{await new Promise(resolve=>release=resolve);await route.fulfill({json:{handle:'test-user'}}).catch(()=>{});},{times:1});
  await b(page,'通讯录').click();await expect.poll(()=>!!release).toBe(true);
  await b(page,'我').click();await expect(b(page,'我的名片')).toBeVisible();release();await expect(b(page,'我')).toHaveAttribute('aria-current','page');await expect(b(page,'添加人物')).toHaveCount(0);
  let finish;await page.route('**/api/users/me',async route=>{await new Promise(resolve=>finish=resolve);await route.fulfill({json:{handle:'test-user'}}).catch(()=>{});},{times:1});
  await b(page,'通讯录').click();await expect.poll(()=>!!finish).toBe(true);await b(page,'关闭手机').click();finish();await expect(page.locator('.phone')).toHaveCount(0);
});

for(const [width,height] of [[320,568],[375,340]])test(`retro tools ${width}x${height}: visible controls, inert placeholders, draft and appearance survive`,async({page})=>{
  await page.setViewportSize({width,height});await page.goto('/');await b(page,'打开 Yui 演示手机').click();await b(page,'打开信息').click();await b(page,'打开与小桃的聊天').click();
  const draft='工具不会发送这份草稿';await page.getByLabel('演示消息输入框').fill(draft);
  const requests=[];page.on('request',r=>requests.push(r.url()));const storage=await page.evaluate(()=>JSON.stringify({...localStorage}));
  for(const label of ['转账','拍照','相册','通话']){
    const tool=page.locator('.chat-tools').getByRole('button',{name:`${label}（待接入）`,exact:true});await tool.click();
    await expect(page.locator('.chat-page .status')).toContainText(`${label}尚未接入`);
  }
  await b(page,'更多工具（待接入）').click();await expect(page.locator('.chat-page .status')).toContainText('更多工具尚未接入');
  expect(requests).toHaveLength(0);expect(await page.evaluate(()=>JSON.stringify({...localStorage}))).toBe(storage);await expect(page.locator('.chat-page .message')).toHaveCount(3);
  await b(page,'打开聊天设置').click();await b(page,'聊天外观').click();await page.getByLabel('气泡文字大小').fill('24');await page.getByLabel('消息头像大小').fill('64');await b(page,'保存聊天外观').click();await b(page,'取消').click();await b(page,'‹ 返回').click();
  await expect(page.getByLabel('演示消息输入框')).toHaveValue(draft);
  for(const control of [b(page,'发送'),b(page,'更多工具（待接入）'),b(page,'打开聊天设置'),b(page,'返回信息列表'),b(page,'关闭手机')]){await expect(control).toBeInViewport();}
  expect(await page.locator('.chat-page').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await b(page,'发送').click();await expect(page.locator('.chat-page .bubble').last()).toHaveText(draft);await expect(page.locator('.chat-page .messages')).toBeInViewport();
  await b(page,'返回信息列表').click();await expect(page.locator('.directory-tabs')).toBeVisible();await b(page,'我').click();await b(page,'信息').click();await b(page,'打开与小桃的聊天').click();await expect(page.locator('.chat-page .message')).toHaveCount(4);
});
