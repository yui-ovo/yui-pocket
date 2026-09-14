import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const button=(page,name)=>page.getByRole('button',{name,exact:true});
async function launch(page,path='/tt') {
  await page.addInitScript({content:await readFile('tests/profile-mock.js','utf8')});
  await page.addInitScript({content:await readFile('tests/tt-mock.js','utf8')});
  await page.route('**/thumbnail?**',route=>route.fulfill({contentType:'image/png',path:'src/assets/stickers/rabbit.png'}));
  await page.goto(path);await page.waitForFunction(()=>window.fixtureReady);
}
async function open(page) {await button(page,'打开 Yui 演示手机').click();await button(page,'打开信息').click();await button(page,'通讯录').click();await expect(button(page,'添加人物')).toBeVisible();}
async function add(page,name) {
  await button(page,'添加人物').click();await button(page,'从当前角色卡带入').click();
  await page.getByLabel('人物名字',{exact:true}).fill(name);await page.getByLabel('开局关系',{exact:true}).selectOption('friend');
}
async function save(page) {await button(page,'保存联系人').click();await expect(page.getByRole('status').filter({visible:true})).toContainText('已保存');await button(page,'取消资料修改').click();}

test('TT readiness, disable while waiting, and late subscription cleanup',async({page})=>{
  await launch(page,'/tt?delay');await expect(page.locator('#yui-pocket-root')).toHaveCount(0);
  await page.evaluate(()=>extension.onDisable());await page.evaluate(()=>ttMock.ready());
  await expect(page.locator('#yui-pocket-root')).toHaveCount(0);
  await page.evaluate(()=>{ttMock.waitUnsubscribe=true;extension.onEnable();});
  await expect(page.locator('#yui-pocket-root')).toHaveCount(1);expect(await page.evaluate(()=>ttMock.subscriptions())).toBe(1);
  await page.evaluate(()=>extension.onDisable());await page.evaluate(()=>ttMock.releasewaitUnsubscribe());
  await expect.poll(()=>page.evaluate(()=>ttMock.subscriptions())).toBe(0);
  expect(await page.evaluate(()=>profileMock.listeners())).toBe(0);
  await page.evaluate(()=>{ttMock.waitUnsubscribe=false;extension.onEnable();extension.onEnable();});
  await expect(page.locator('#yui-pocket-root')).toHaveCount(1);
});

test('TT native profiles persist, copied integrity stays isolated, rename migrates only own entry',async({page})=>{
  await launch(page);await open(page);await add(page,'TT 花店老板');
  await expect(page.locator('.profile-avatar-editor img')).toHaveAttribute('src',/thumbnail/);await save(page);
  await page.reload();await open(page);await expect(page.locator('.friend-list')).toContainText('TT 花店老板');
  await page.evaluate(()=>profileMock.switch('0','copied-B','integrity-A'));
  await expect(page.locator('.friend-list')).not.toContainText('TT 花店老板');await add(page,'复制档人物');await save(page);
  await page.evaluate(()=>profileMock.switch('0','chat-A','integrity-A'));await expect(page.locator('.friend-list')).toContainText('TT 花店老板');
  await expect(page.locator('.friend-list')).not.toContainText('复制档人物');
  await page.evaluate(async()=>{profileMock.chat='renamed-A';await profileMock.emit('chat_id_changed');await profileMock.emit('chat_renamed',{avatarId:'story.png',oldFileName:'chat-A.jsonl',newFileName:'renamed-A.jsonl'});});
  await expect(page.locator('.friend-list')).toContainText('TT 花店老板');
  await page.evaluate(()=>profileMock.switch('1','renamed-A','integrity-A'));await expect(page.locator('.friend-list')).not.toContainText('TT 花店老板');
  expect(await page.evaluate(()=>localStorage.getItem('yui-pocket.contacts.v1:test-user'))).toBeNull();
  expect(await page.evaluate(()=>Object.values(ttMock.data()).length)).toBe(2);
  expect(await page.evaluate(()=>profileMock.cards['0'].name)).toBe('花店故事标题');
});

test('TT unavailable API or failed native storage fails closed',async({page})=>{
  await launch(page);await page.evaluate(()=>delete __TAURITAVERN__.api.chat);await button(page,'打开 Yui 演示手机').click();await button(page,'打开信息').click();await button(page,'通讯录').click();
  await expect(page.locator('.workspace-page:visible')).toContainText('请更新 TauriTavern');
  await page.reload();await open(page);await add(page,'不能保存');
  await page.evaluate(()=>ttMock.fail=true);await button(page,'保存联系人').click();
  await expect(page.getByRole('status').filter({visible:true})).toContainText('保存未确认');
  expect(await page.evaluate(()=>Object.keys(ttMock.data()).length)).toBe(0);
  await page.evaluate(()=>{ttMock.fail=false;ttMock.mismatch=true;});await button(page,'保存联系人').click();
  await expect(page.getByRole('status').filter({visible:true})).toContainText('资料确认失败');
});

test('TT delayed read cannot dispatch save after chat switch; in-flight write stays on captured chat',async({page})=>{
  await launch(page);await open(page);await add(page,'迟到资料');await page.evaluate(()=>ttMock.waitRead=true);
  await button(page,'保存联系人').click();await page.waitForFunction(()=>!!ttMock.releasewaitRead);
  await page.evaluate(()=>{ttMock.waitRead=false;profileMock.switch('0','chat-B');ttMock.releasewaitRead();});
  await expect(button(page,'添加人物')).toBeVisible();expect(await page.evaluate(()=>ttMock.calls)).toHaveLength(0);
  await add(page,'仅 B');await page.evaluate(()=>ttMock.waitWrite=true);await button(page,'保存联系人').click();
  await page.waitForFunction(()=>!!ttMock.releasewaitWrite);
  await page.evaluate(()=>profileMock.switch('0','chat-C'));await expect(button(page,'添加人物')).toBeVisible();
  await page.evaluate(()=>{ttMock.waitWrite=false;ttMock.releasewaitWrite();});
  await expect(page.locator('.friend-list')).not.toContainText('仅 B');
  await expect.poll(()=>page.evaluate(()=>Object.values(ttMock.data()).length)).toBe(1);
  expect(await page.evaluate(()=>ttMock.calls[0].ref.fileName)).toBe('chat-B');
  await page.evaluate(()=>extension.onDisable());await expect(page.locator('#yui-pocket-root')).toHaveCount(0);
});

test('TT safe area and host-reported keyboard frame leave small-screen controls reachable',async({page})=>{
  await page.setViewportSize({width:375,height:720});await launch(page);await open(page);
  await page.evaluate(()=>ttMock.emitLayout({version:1,safeFrame:{left:8,top:30,width:359,height:660},ime:{keyboardOffset:310}}));
  await expect(page.locator('#yui-pocket-root')).toHaveAttribute('data-compact','');
  const box=await page.locator('.phone').boundingBox();expect(box.y).toBeGreaterThanOrEqual(30);expect(box.y+box.height).toBeLessThanOrEqual(380);
  await add(page,'小屏资料');await expect(button(page,'保存联系人')).toBeInViewport();await save(page);
  await expect(button(page,'关闭手机')).toBeInViewport();
  await page.screenshot({path:'outputs/preview-tt-compact.png'});
  await page.evaluate(()=>extension.onDisable());expect(await page.evaluate(()=>ttMock.subscriptions())).toBe(0);
  await expect(page.locator('#yui-pocket-root')).toHaveCount(0);await button(page,'宿主按钮').click();
});
