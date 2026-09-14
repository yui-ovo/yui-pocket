import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const key='yui-pocket.contacts.v1:test-user';
const button=(page,name)=>page.getByRole('button',{name,exact:true});
async function open(page,app='联系人') { await button(page,'打开 Yui 演示手机').click();await button(page,`打开${app}`).click();await expect(button(page,'添加人物')).toBeVisible(); }
async function add(page,name,{source=true,relation='friend',remark=''}={}){
  await button(page,'添加人物').click();await button(page,source?'从当前角色卡带入':'手动创建人物').click();
  await page.getByLabel('人物名字',{exact:true}).fill(name);await page.getByLabel('手机备注',{exact:true}).fill(remark);
  await page.getByLabel('开局关系',{exact:true}).selectOption(relation);
}
async function save(page){await button(page,'保存联系人').click();await expect(page.getByRole('status').filter({visible:true})).toContainText('已保存');}
async function list(page){await button(page,'取消资料修改').click();}
async function books(page,storageKey=key){return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),storageKey);}
test.beforeEach(async({page})=>{
  await page.addInitScript({content:await readFile('tests/profile-mock.js','utf8')});
  await page.route('**/api/users/me',async route=>{await route.fulfill({json:{handle:await page.evaluate(()=>profileMock.account)}});});
  await page.route('**/thumbnail?**',route=>route.fulfill({contentType:'image/png',path:'src/assets/stickers/rabbit.png'}));
  await page.goto('/');await expect(page.locator('#yui-pocket-root')).toHaveCount(1);
});

test('card preview is editable, same source yields two stable identities, remarks flow to conversation header',async({page})=>{
  await open(page);await button(page,'添加人物').click();await button(page,'从当前角色卡带入').click();
  await expect(page.getByLabel('人物名字',{exact:true})).toHaveValue('花店故事标题');
  expect(await books(page)).toBeNull();
  await page.getByLabel('人物名字',{exact:true}).fill('花店老板');await page.getByLabel('手机备注',{exact:true}).fill('阿棠');
  await page.getByLabel('开局关系',{exact:true}).selectOption('friend');await save(page);await list(page);
  await add(page,'送花的姐姐',{relation:'stranger'});await save(page);await list(page);
  const registry=await books(page),book=Object.values(registry.books)[0];
  expect(book.people).toHaveLength(2);expect(book.people[0].id).not.toBe(book.people[1].id);
  expect(book.people[0].source).toEqual(book.people[1].source);
  expect(await page.evaluate(()=>profileMock.cards['0'].name)).toBe('花店故事标题');
  await expect(page.locator('.friend-list')).toContainText('阿棠');await expect(page.locator('.friend-list')).not.toContainText('送花的姐姐');
  await expect(page.locator('.people-setup')).toContainText('尚不认识');
  await page.screenshot({path:'outputs/preview-directory.png'});
  await button(page,'Home · 返回主屏幕').click();await button(page,'打开信息').click();
  await page.locator('.friend-list .contact-row').click();await expect(button(page,'打开联系人资料')).toHaveText('阿棠');
  await expect(page.locator('.workspace-page:visible .empty-state')).toContainText('暂无消息');
  await expect(button(page,'发送')).toBeDisabled();
  await button(page,'打开联系人资料').click();await expect(page.getByLabel('人物名字',{exact:true})).toHaveValue('花店老板');
  await page.screenshot({path:'outputs/preview-profile.png'});
  await page.getByLabel('手机备注',{exact:true}).fill('老板娘');await save(page);await list(page);
  await expect(button(page,'打开联系人资料')).toHaveText('老板娘');
  const updated=Object.values((await books(page)).books)[0];expect(updated.people[0].id).toBe(book.people[0].id);
  await page.reload();await open(page);await expect(page.locator('.friend-list')).toContainText('老板娘');
  expect(JSON.stringify(await books(page))).not.toContain('路口的小花店');
});

test('same card chats, other cards, account switches, rename and copied branch stay isolated',async({page})=>{
  await open(page);await add(page,'只属于A');await save(page);await list(page);
  const original=Object.values((await books(page)).books)[0];
  await page.evaluate(()=>profileMock.switch('0','chat-B'));await expect(page.locator('.friend-list')).not.toContainText('只属于A');
  await add(page,'只属于B');await save(page);await list(page);
  await page.evaluate(()=>profileMock.switch('1','chat-A','integrity-A'));await expect(page.locator('.friend-list')).not.toContainText('只属于A');
  await page.evaluate(()=>profileMock.switch('0','chat-A','integrity-A'));await expect(page.locator('.friend-list')).toContainText('只属于A');
  await page.evaluate(async()=>{profileMock.chat='renamed-A';await profileMock.emit('chat_id_changed');await profileMock.emit('chat_renamed',{avatarId:'story.png',oldFileName:'chat-A.jsonl',newFileName:'renamed-A.jsonl'});});
  await expect(page.locator('.friend-list')).toContainText('只属于A');
  let registry=await books(page);expect(Object.values(registry.books).find(b=>b.id===original.id).people[0].id).toBe(original.people[0].id);
  await page.evaluate(()=>profileMock.switch('0','branch-A','integrity-A'));await expect(page.locator('.friend-list')).not.toContainText('只属于A');
  await add(page,'分支人物');await save(page);await list(page);
  await page.evaluate(()=>profileMock.switch('0','renamed-A','integrity-A'));await expect(page.locator('.friend-list')).not.toContainText('分支人物');
  await page.evaluate(async()=>{profileMock.account='second-user';await profileMock.emit('chat_id_changed');});await expect(page.locator('.friend-list')).not.toContainText('只属于A');
  await add(page,'第二个账号');await save(page);
  expect(Object.values((await books(page,'yui-pocket.contacts.v1:second-user')).books)[0].people[0].name).toBe('第二个账号');
  expect(JSON.stringify(await books(page))).not.toContain('第二个账号');
});

test('relation presets and known account are independent, my card is fixed and duplicates rejected',async({page})=>{
  await open(page);await add(page,'认识的人',{source:false,relation:'known'});
  await page.getByLabel('开局已经知道对方账号').check();await page.getByLabel('人物虚构账号').fill('flower_123');await save(page);await list(page);
  await expect(page.locator('.friend-list .contact-row')).toHaveCount(0);
  expect(Object.values((await books(page)).books)[0].people[0].relation).toEqual({known:true,accountKnown:true,friend:false});
  await button(page,'我的名片').click();await page.getByLabel('我的虚构账号').fill('FLOWER_123');await button(page,'保存我的名片').click();
  await expect(page.getByRole('status').filter({visible:true})).toContainText('相同账号');
  await page.getByLabel('我的虚构账号').fill('my_yui_42');await button(page,'保存我的名片').click();await expect(page.getByRole('status').filter({visible:true})).toContainText('已保存');
  await page.reload();await open(page);await button(page,'我的名片').click();await expect(page.getByLabel('我的虚构账号')).toHaveValue('my_yui_42');
});

test('avatar upload and explicit URL, failure fallback, and defaults never change the source card',async({page})=>{
  await open(page);await add(page,'阿棠');
  await expect(page.locator('.profile-avatar-editor img')).toHaveAttribute('src',/thumbnail/);
  await page.getByLabel('上传头像',{exact:true}).setInputFiles('src/assets/stickers/heart.png');
  await expect(page.locator('.profile-avatar-editor img')).toHaveAttribute('src',/^data:image/);await save(page);
  expect(Object.values((await books(page)).books)[0].people[0].avatar.kind).toBe('upload');
  await page.route('https://avatar.test/good.png',route=>route.fulfill({contentType:'image/png',path:'src/assets/stickers/bow.png'}));
  await page.route('https://avatar.test/bad.png',route=>route.abort());
  await page.getByLabel('头像图片 URL').fill('https://avatar.test/good.png');await button(page,'加载此头像 URL').click();
  await expect(page.locator('.profile-avatar-editor')).toContainText('外链头像已预览');await save(page);
  await page.getByLabel('头像图片 URL').fill('https://avatar.test/bad.png');await button(page,'加载此头像 URL').click();
  await expect(page.locator('.profile-avatar-editor')).toContainText('外链加载失败');
  await save(page);expect(Object.values((await books(page)).books)[0].people[0].avatar.value).toBe('https://avatar.test/good.png');
  await button(page,'恢复联系人默认').click();await save(page);expect(Object.values((await books(page)).books)[0].people[0].avatar.kind).toBe('default');
  expect(await page.evaluate(()=>profileMock.cards['0'].avatar)).toBe('story.png');
});

test('no valid chat cannot save to a shared fallback; pending save is invalid after switching',async({page})=>{
  await page.evaluate(()=>profileMock.switch('0',null));await button(page,'打开 Yui 演示手机').click();await button(page,'打开联系人').click();
  await expect(page.locator('.empty-state:visible')).toContainText('先打开有效聊天');await expect(button(page,'添加人物')).toHaveCount(0);expect(await books(page)).toBeNull();
  await page.evaluate(()=>profileMock.switch('0','chat-A'));await expect(button(page,'添加人物')).toBeVisible();await add(page,'不能写入B');
  let release;await page.route('**/api/users/me',async route=>{await new Promise(resolve=>release=resolve);await route.fulfill({json:{handle:'test-user'}}).catch(()=>{});},{times:1});
  await button(page,'保存联系人').click();await expect.poll(()=>!!release).toBe(true);
  await page.evaluate(()=>profileMock.switch('0','chat-B'));release();await expect(button(page,'添加人物')).toBeVisible();
  expect(await books(page)).toBeNull();
  await add(page,'配额失败');await page.evaluate(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('yui-pocket.contacts'))throw new DOMException('full','QuotaExceededError');return set.call(this,k,v);};});
  await button(page,'保存联系人').click();await expect(page.getByRole('status').filter({visible:true})).toContainText('保存失败');expect(await books(page)).toBeNull();
});

test('close during upload cannot revive a profile; cleanup removes host event subscriptions',async({page})=>{
  await open(page);await add(page,'不应保存');
  await page.evaluate(()=>{const decode=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=function(){return decode.call(this).then(()=>new Promise(resolve=>window.finishAvatar=resolve));};});
  await page.getByLabel('上传头像',{exact:true}).setInputFiles('src/assets/stickers/rabbit.png');await page.waitForFunction(()=>window.finishAvatar);
  await button(page,'关闭手机').click();await page.evaluate(()=>window.finishAvatar());expect(await books(page)).toBeNull();await expect(page.locator('.phone')).toHaveCount(0);
  await page.evaluate(()=>window.disable());expect(await page.evaluate(()=>profileMock.listeners())).toBe(0);
});

test('manual NPC defaults are independent and only verified identity GET and selected images use the network',async({page})=>{
  const traffic=[];page.on('request',request=>traffic.push({url:request.url(),method:request.method()}));
  await open(page);await add(page,'<img src=x onerror=alert(1)>',{source:false,relation:'known'});
  await expect(page.locator('.profile-avatar-editor img')).toHaveCount(0);await save(page);await list(page);
  await expect(page.locator('.people-setup')).toContainText('<img src=x onerror=alert(1)>');await expect(page.locator('.people-setup img')).toHaveCount(0);
  const person=Object.values((await books(page)).books)[0].people[0];expect(person.source).toEqual({kind:'manual',name:'手动创建'});
  expect(person.relation).toEqual({known:true,accountKnown:false,friend:false});
  expect(traffic.length).toBeGreaterThan(0);expect(traffic.every(r=>new URL(r.url).pathname==='/api/users/me'&&r.method==='GET')).toBe(true);
});

test('avatar upload while switching archives cannot edit the new archive',async({page})=>{
  await open(page);await add(page,'原存档人物');await save(page);
  await page.evaluate(()=>{const decode=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=function(){return decode.call(this).then(()=>new Promise(resolve=>window.releaseUpload=resolve));};});
  await page.getByLabel('上传头像',{exact:true}).setInputFiles('src/assets/stickers/rabbit.png');await page.waitForFunction(()=>window.releaseUpload);
  await page.evaluate(()=>profileMock.switch('0','chat-B'));await expect(button(page,'添加人物')).toBeVisible();await page.evaluate(()=>window.releaseUpload());
  const registry=await books(page);expect(Object.keys(registry.books)).toHaveLength(1);expect(Object.values(registry.books)[0].people[0].avatar.kind).toBe('default');
  await expect(page.locator('.friend-list .contact-row')).toHaveCount(0);
});

for(const [width,height] of [[320,568],[375,340]])test(`reading ${width}x${height}: message appearance preserves navigation and decorations`,async({page})=>{
  await page.setViewportSize({width,height});await open(page);await add(page,'字号测试');await save(page);await list(page);
  await expect(button(page,'阅读设置')).toHaveCount(0);
  await page.evaluate(()=>localStorage.setItem('yui-pocket.appearance.v1',JSON.stringify({version:1,marker:'keep'})));
  await button(page,'Home · 返回主屏幕').click();await button(page,'打开信息').click();await page.locator('.friend-list .contact-row').click();
  const headerHeight=(await page.locator('.workspace-page:visible .chat-header').boundingBox()).height;
  await button(page,'打开聊天设置').click();await button(page,'聊天外观').click();await page.getByLabel('应用范围').selectOption('all');
  await page.getByLabel('显示消息头像').uncheck();await page.getByLabel('气泡文字大小').fill('24');await page.getByLabel('气泡文字行距').fill('2.4');await page.getByLabel('消息头像大小').fill('64');await page.getByLabel('消息头像圆角').fill('50');
  await page.screenshot({path:`outputs/preview-reading-settings-${width}x${height}.png`});
  await button(page,'保存聊天外观').click();await button(page,'取消').click();await button(page,'‹ 返回').click();
  await expect(button(page,'打开聊天设置')).toBeVisible();expect((await page.locator('.workspace-page:visible .chat-header').boundingBox()).height).toBe(headerHeight);
  await button(page,'打开联系人资料').click();await expect(page.getByLabel('人物名字',{exact:true})).toHaveValue('字号测试');await list(page);
  await button(page,'Home · 返回主屏幕').click();await button(page,'打开信息').click();await button(page,'打开与小桃的聊天').click();
  await expect(page.locator('.chat-page .bubble').first()).toHaveCSS('font-size','24px');await expect(page.locator('.chat-page .bubble').first()).toHaveCSS('line-height','57.6px');
  await expect(page.locator('.chat-page .message-avatar').first()).toBeHidden();await expect(button(page,'打开聊天设置')).toBeVisible();
  await page.getByLabel('演示消息输入框').fill('大字仍能发送');await button(page,'发送').click();
  const box=await button(page,'发送').boundingBox();expect(box.y+box.height).toBeLessThanOrEqual(height);
  await page.screenshot({path:`outputs/preview-reading-${width}x${height}.png`});
  await button(page,'打开聊天设置').click();await button(page,'聊天外观').click();await button(page,'恢复聊天外观默认').click();await button(page,'取消').click();await button(page,'‹ 返回').click();
  await expect(page.locator('.chat-page .bubble').first()).toHaveCSS('font-size','24px');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('yui-pocket.appearance.v1')).marker)).toBe('keep');
  await page.reload();await button(page,'打开 Yui 演示手机').click();await button(page,'打开信息').click();await button(page,'打开与小桃的聊天').click();
  await expect(page.locator('.chat-page .bubble').first()).toHaveCSS('font-size','24px');await expect(button(page,'打开聊天设置')).toBeVisible();
});
