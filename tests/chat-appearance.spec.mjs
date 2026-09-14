import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const b=(p,name)=>p.getByRole('button',{name,exact:true});
async function setup(page){
  await page.addInitScript({content:await readFile('tests/profile-mock.js','utf8')});
  await page.route('**/api/users/me',route=>route.fulfill({json:{handle:'test-user'}}));
  await page.route('**/thumbnail?**',route=>route.fulfill({contentType:'image/png',path:'src/assets/stickers/rabbit.png'}));
  await page.goto('/');await b(page,'打开 Yui 演示手机').click();await b(page,'打开信息').click();await b(page,'通讯录').click();
}
async function add(page,name){
  await b(page,'添加人物').click();await b(page,'从当前角色卡带入').click();await page.getByLabel('人物名字',{exact:true}).fill(name);await page.getByLabel('开局关系').selectOption('friend');
  await b(page,'保存联系人').click();await expect(page.getByRole('status').filter({visible:true})).toContainText('已保存');await b(page,'取消资料修改').click();
}
async function chat(page,name){await b(page,'Home · 返回主屏幕').click();await b(page,'打开信息').click();await page.locator('.friend-list .contact-row').filter({hasText:name}).click();}
async function appearance(page){await b(page,'打开聊天设置').click();await b(page,'聊天外观').click();}
async function returnChat(page){await b(page,'取消').click();await b(page,'‹ 返回').click();}

test('per-contact styles use stable identity, all overrides reset explicitly, and switching archives cancels old settings',async({page})=>{
  await setup(page);await add(page,'甲');await add(page,'乙');await chat(page,'甲');await appearance(page);
  await expect(page.getByLabel('应用范围')).toHaveValue('contact');
  await expect(page.locator('.reading-preview .friend .message-avatar img')).toHaveAttribute('src',/thumbnail/);
  await expect(page.locator('.reading-preview .self .message-avatar img')).toHaveCount(0);
  await page.getByLabel('气泡文字大小').fill('22');await b(page,'保存聊天外观').click();await returnChat(page);
  await expect(page.locator('.phone')).toHaveCSS('--reading-size','22px');
  await chat(page,'乙');await expect(page.locator('.phone')).toHaveCSS('--reading-size','14px');
  await chat(page,'甲');await b(page,'打开联系人资料').click();await page.getByLabel('手机备注',{exact:true}).fill('新备注'.repeat(20));await b(page,'保存联系人').click();await expect(page.getByRole('status').filter({visible:true})).toContainText('已保存');await b(page,'取消资料修改').click();
  await expect(page.locator('.phone')).toHaveCSS('--reading-size','22px');
  await page.reload();await b(page,'打开 Yui 演示手机').click();await chat(page,'新备注');await expect(page.locator('.phone')).toHaveCSS('--reading-size','22px');
  await appearance(page);await b(page,'跟随所有联系人样式').click();await returnChat(page);await expect(page.locator('.phone')).toHaveCSS('--reading-size','22px');
  await appearance(page);await page.getByLabel('应用范围').selectOption('all');await expect(page.locator('.reading-page')).toContainText('覆盖此前的单独设置');await page.getByLabel('气泡文字大小').fill('18');await b(page,'保存聊天外观').click();await returnChat(page);
  await chat(page,'乙');await expect(page.locator('.phone')).toHaveCSS('--reading-size','18px');
  await chat(page,'新备注');await expect(page.locator('.phone')).toHaveCSS('--reading-size','18px');
  const stored=await page.evaluate(()=>localStorage.getItem('yui-pocket.reading.v2'));
  await appearance(page);await page.getByLabel('气泡文字大小').fill('24');
  await page.evaluate(()=>profileMock.switch('0','other-archive'));
  await expect(page.locator('.reading-page')).toBeHidden();expect(await page.evaluate(()=>localStorage.getItem('yui-pocket.reading.v2'))).toBe(stored);
  await expect(page.locator('.friend-list')).not.toContainText('新备注');
});

test('message preview geometry, avatar hiding removes its space, and list/profile/header sizes stay fixed',async({page})=>{
  await page.setViewportSize({width:375,height:740});await setup(page);await add(page,'样式人物');
  const listAvatar=await page.locator('.friend-list .profile-avatar').boundingBox();
  await chat(page,'样式人物');const header=await page.locator('.workspace-page:visible .chat-header').boundingBox();await appearance(page);
  await page.getByLabel('消息头像大小').fill('64');await page.getByLabel('消息头像圆角').fill('50');await page.getByLabel('气泡文字大小').fill('24');
  const avatar=page.locator('.reading-preview .friend .message-avatar');await expect(avatar).toHaveCSS('width','64px');await expect(avatar).toHaveCSS('border-radius','50%');
  await page.locator('.reading-preview').scrollIntoViewIfNeeded();
  const friend=await avatar.boundingBox(),friendBubble=await page.locator('.reading-preview .friend .bubble').boundingBox();expect(friend.x+friend.width).toBeLessThan(friendBubble.x);
  const self=await page.locator('.reading-preview .self .message-avatar').boundingBox(),selfBubble=await page.locator('.reading-preview .self .bubble').boundingBox();expect(selfBubble.x+selfBubble.width).toBeLessThan(self.x);
  await page.getByLabel('显示消息头像').uncheck();await page.locator('.reading-preview').scrollIntoViewIfNeeded();await expect(avatar).toBeHidden();
  const wider=await page.locator('.reading-preview .friend .bubble').boundingBox();expect(wider.width).toBeGreaterThan(friendBubble.width);
  await page.screenshot({path:'outputs/preview-chat-appearance.png'});
  await b(page,'保存聊天外观').click();await returnChat(page);expect((await page.locator('.workspace-page:visible .chat-header').boundingBox()).height).toBe(header.height);await expect(b(page,'打开聊天设置')).toBeVisible();
  await b(page,'Home · 返回主屏幕').click();await b(page,'打开信息').click();await b(page,'通讯录').click();expect((await page.locator('.friend-list .profile-avatar').boundingBox()).width).toBe(listAvatar.width);
  await page.locator('.friend-list .contact-row').click();await expect(page.locator('.profile-avatar-editor .profile-avatar')).toHaveCSS('width','72px');
});

test('legacy preferences migrate on explicit save; demo draft survives more/settings navigation without saved messages',async({page})=>{
  await page.goto('/');await page.evaluate(()=>localStorage.setItem('yui-pocket.reading.v1',JSON.stringify({version:1,showAvatar:false,avatarSize:40,radius:50,fontSize:19,lineHeight:1.8})));
  await page.reload();await b(page,'打开 Yui 演示手机').click();await b(page,'打开信息').click();await b(page,'打开与小桃的聊天').click();
  await expect(page.locator('.chat-page .message-avatar').first()).toBeHidden();await expect(page.locator('.chat-page .bubble').first()).toHaveCSS('font-size','19px');
  await page.getByLabel('演示消息输入框').fill('仅草稿');await appearance(page);await expect(page.getByLabel('应用范围').locator('option')).toHaveCount(1);
  expect(await page.evaluate(()=>localStorage.getItem('yui-pocket.reading.v2'))).toBeNull();await page.getByLabel('显示消息头像').check();await b(page,'保存聊天外观').click();await returnChat(page);
  await expect(page.getByLabel('演示消息输入框')).toHaveValue('仅草稿');await expect(page.locator('.chat-page .message-avatar').first()).toBeVisible();
  const saved=await page.evaluate(()=>localStorage.getItem('yui-pocket.reading.v2'));expect(saved).not.toContain('仅草稿');expect(saved).not.toContain('小花店');
  await appearance(page);await b(page,'恢复聊天外观默认').click();await b(page,'保存聊天外观').click();await returnChat(page);
  await page.locator('.chat-page .messages').evaluate(el=>el.scrollTop=0);
  await page.getByLabel('演示消息输入框').fill('');await page.getByLabel('演示消息输入框').evaluate(el=>el.blur());
  await page.locator('.phone').screenshot({path:'outputs/preview-baby-pink-chat.png'});
});

test('chat appearance quota failure reports failure and leaves existing saved defaults intact',async({page})=>{
  await setup(page);await add(page,'保存测试');await chat(page,'保存测试');await appearance(page);
  await page.getByLabel('气泡文字大小').fill('23');
  await page.evaluate(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='yui-pocket.reading.v2')throw new DOMException('full','QuotaExceededError');return set.call(this,key,value);};});
  await b(page,'保存聊天外观').click();await expect(page.locator('.reading-status')).toContainText('保存失败');
  expect(await page.evaluate(()=>localStorage.getItem('yui-pocket.reading.v2'))).toBeNull();await returnChat(page);await expect(page.locator('.phone')).toHaveCSS('--reading-size','14px');
});
