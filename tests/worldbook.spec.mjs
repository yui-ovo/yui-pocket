import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const b=(p,name)=>p.getByRole('button',{name,exact:true});
const key='yui-pocket.contacts.v1:test-user';
const status=p=>p.getByRole('status').filter({visible:true});
async function launch(p,tt=false){
  const scripts=['tests/profile-mock.js',...(tt?['tests/tt-mock.js']:[]),'tests/worldbook-mock.js'];
  await p.addInitScript({content:(await Promise.all(scripts.map(f=>readFile(f,'utf8')))).join('\n')});
  await p.route('**/api/users/me',r=>r.fulfill({json:{handle:'test-user'}}));
  await p.route('**/thumbnail?**',r=>r.fulfill({contentType:'image/png',path:'src/assets/stickers/rabbit.png'}));
  await p.goto(tt?'/tt':'/');
}
async function open(p){await b(p,'打开 Yui 演示手机').click();await b(p,'打开信息').click();await b(p,'通讯录').click();await expect(b(p,'添加人物')).toBeVisible();}
async function picker(p){await b(p,'添加人物').click();await b(p,'从世界书选择').click();}
async function entry(p,content='阿棠经营花店。',name='花店的两个人 · #0'){
  await b(p,name).click();await p.getByLabel('确认保留的扮演资料',{exact:true}).fill(content);await b(p,'确认选择此资料').click();
}
async function toEditor(p,name){await b(p,'选择人物并继续').click();await b(p,'进入人物资料确认').click();if(name!==undefined)await p.getByLabel('人物名字',{exact:true}).fill(name);}
async function save(p){await b(p,'保存联系人').click();await expect(status(p)).toContainText('已保存');}
async function back(p){await b(p,'取消资料修改').click();}
async function people(p,tt=false){return p.evaluate(({key,tt})=>{const data=JSON.parse(localStorage.getItem(tt?'fixture.tt.store':key)||'{}');return Object.values(tt?data:(data.books||{})).flatMap(v=>v.people);},{key,tt});}

for(const tt of [false,true])test(`${tt?'TT':'ST'} facade: confirmed entry persists; source read-only, no HTTP/AI/HTML or eager books`,async({page:p})=>{
  await launch(p,tt);await open(p);await picker(p);
  expect(await p.evaluate(()=>loreMock.calls)).toEqual([]);
  const before=await p.evaluate(()=>JSON.stringify(loreMock.books));
  await b(p,'角色资料 · 当前角色卡主绑定').click();await b(p,'花店的两个人 · #0').click();
  await expect(p.locator('.world-original')).toContainText('<img');expect(await p.evaluate(()=>window.pwned)).toBeUndefined();
  await expect(p.locator('.world-original img')).toHaveCount(0);
  await p.getByLabel('确认保留的扮演资料').fill('阿棠经营花店。');await b(p,'确认选择此资料').click();
  await toEditor(p);await expect(p.getByLabel('人物名字',{exact:true})).toHaveValue('');await expect(p.getByLabel('开局关系',{exact:true})).toHaveValue('stranger');
  await expect(p.locator('.profile-avatar-editor img')).toHaveCount(0);
  await p.getByLabel('人物名字',{exact:true}).fill('阿棠');await save(p);await save(p);await back(p);
  expect(await p.evaluate(()=>loreMock.calls)).toEqual(['角色资料']);expect(await p.evaluate(()=>JSON.stringify(loreMock.books))).toBe(before);
  const list=await people(p,tt);expect(list).toHaveLength(1);expect(list[0].roleplayMaterials[0]).toMatchObject({world:'角色资料',uid:'0',content:'阿棠经营花店。',fingerprint:expect.stringMatching(/^sha256:[a-f0-9]{64}$/)});
  expect(JSON.stringify(list)).not.toContain('弟弟负责');await expect(p.locator('.friend-list .contact-row')).toHaveCount(0);
  await p.reload();await open(p);await expect(p.locator('.people-setup')).toContainText('阿棠');expect((await people(p,tt))[0].id).toBe(list[0].id);
});

test('multiple books and entries share one person; same multiperson entry creates independent IDs',async({page:p})=>{
  await launch(p);await open(p);await picker(p);await b(p,'角色资料 · 当前角色卡主绑定').click();
  await entry(p);await p.getByLabel('按标题或关键词筛选').fill('秘密');await entry(p,'阿棠是侦探。','隐藏身份 · #1');
  await b(p,'选择其他世界书').click();await b(p,'剧情设定 · 当前聊天绑定').click();await entry(p,'阿棠住在东街。','城市 · #0');await toEditor(p,'阿棠');await save(p);await back(p);
  await picker(p);await b(p,'角色资料 · 当前角色卡主绑定').click();await entry(p,'阿青负责送货。');await b(p,'选择人物并继续').click();await expect(p.locator('.worldbook-picker')).toContainText('相同来源已关联：阿棠');
  await b(p,'进入人物资料确认').click();await p.getByLabel('人物名字',{exact:true}).fill('阿青');await save(p);
  const list=await people(p);expect(list).toHaveLength(2);expect(list[0].roleplayMaterials).toHaveLength(3);expect(list[0].id).not.toBe(list[1].id);expect(list[1].roleplayMaterials[0].content).toBe('阿青负责送货。');
});

test('link to existing person preserves identity avatar remark account relation; duplicates require consent',async({page:p})=>{
  await launch(p);await open(p);await b(p,'添加人物').click();await b(p,'从当前角色卡带入').click();
  await p.getByLabel('人物名字',{exact:true}).fill('阿棠');await p.getByLabel('手机备注',{exact:true}).fill('老板娘');await p.getByLabel('开局关系').selectOption('friend');
  await p.getByLabel('上传头像',{exact:true}).setInputFiles('src/assets/stickers/rabbit.png');await expect(b(p,'保存联系人')).toBeEnabled();await save(p);await back(p);
  const prior=(await people(p))[0];await picker(p);await b(p,'角色资料 · 当前角色卡主绑定').click();await entry(p);await b(p,'选择人物并继续').click();await p.getByLabel('目标人物',{exact:true}).selectOption(prior.id);await b(p,'进入人物资料确认').click();await save(p);await back(p);
  const updated=(await people(p))[0];for(const field of ['id','avatar','remark','account','relation','source'])expect(updated[field]).toEqual(prior[field]);
  await picker(p);await b(p,'角色资料 · 当前角色卡主绑定').click();await entry(p,'重新确认的资料');await b(p,'选择人物并继续').click();await p.getByLabel('目标人物',{exact:true}).selectOption(prior.id);await b(p,'进入人物资料确认').click();await expect(status(p)).toContainText('请勾选确认替换');
  await p.getByLabel('确认替换目标人物的相同来源资料').check();await b(p,'进入人物资料确认').click();await save(p);expect((await people(p))[0].roleplayMaterials).toHaveLength(1);
});

test('cancel leaves no empty person; no binding, unsupported, read failure and oversize are distinct',async({page:p})=>{
  await launch(p);await p.evaluate(()=>loreMock.bound=false);await open(p);await picker(p);await expect(status(p)).toContainText('没有绑定世界书');
  await p.getByLabel('其他世界书').selectOption('角色资料');await p.evaluate(()=>loreMock.fail=true);await b(p,'读取所选世界书').click();await expect(status(p)).toContainText('读取失败');
  await p.evaluate(()=>loreMock.fail=false);await b(p,'重试读取').click();await b(p,'花店的两个人 · #0').click();await p.getByLabel('确认保留的扮演资料').fill('大'.repeat(20001));await b(p,'确认选择此资料').click();await expect(status(p)).toContainText('超过20000');
  await p.getByLabel('确认保留的扮演资料').fill('缩短后的资料');await b(p,'确认选择此资料').click();await toEditor(p,'未保存人物');await back(p);expect(await people(p)).toHaveLength(0);
  await p.evaluate(()=>loreMock.unsupported=true);await picker(p);await expect(status(p)).toContainText('宿主能力暂不支持');expect(await people(p)).toHaveLength(0);
});

for(const close of [false,true])test(`late read after ${close?'close':'chat switch'} never revives picker`,async({page:p})=>{
  await launch(p);await open(p);await picker(p);await p.evaluate(()=>loreMock.wait=true);await b(p,'角色资料 · 当前角色卡主绑定').click();await p.waitForFunction(()=>!!loreMock.release);
  if(close)await b(p,'关闭手机').click();else await p.evaluate(()=>profileMock.switch('0','chat-B'));
  await p.evaluate(()=>{loreMock.wait=false;loreMock.release();});await expect(p.locator('.worldbook-picker:visible')).toHaveCount(0);expect(await people(p)).toHaveLength(0);
});

test('saved material survives source changes/deletion and chat isolation; failed save keeps editable draft',async({page:p})=>{
  await launch(p);await open(p);await picker(p);await b(p,'角色资料 · 当前角色卡主绑定').click();await entry(p);await toEditor(p,'阿棠');
  await p.evaluate(()=>{const raw=Storage.prototype.setItem;window.restoreStorage=()=>Storage.prototype.setItem=raw;Storage.prototype.setItem=function(key,value){if(key.startsWith('yui-pocket.contacts'))throw new Error('Quota');return raw.call(this,key,value);};});
  await b(p,'保存联系人').click();await expect(status(p)).toContainText('保存失败');await expect(p.getByLabel('人物名字',{exact:true})).toHaveValue('阿棠');await expect(p.getByLabel('扮演资料 角色资料 #0')).toHaveValue('阿棠经营花店。');
  await p.evaluate(()=>restoreStorage());await save(p);await back(p);const prior=(await people(p))[0];
  await p.evaluate(()=>{loreMock.books['角色资料'].entries[0].content='changed';delete loreMock.books['角色资料'];});
  await p.evaluate(()=>profileMock.switch('0','chat-B'));await expect(p.locator('.people-setup .contact-row')).toHaveCount(0);
  await p.evaluate(()=>profileMock.switch('1','chat-A','integrity-A'));await expect(p.locator('.people-setup .contact-row')).toHaveCount(0);
  await p.evaluate(()=>profileMock.switch('0','chat-A','integrity-A'));await p.locator('.people-setup .contact-row').click();await expect(p.getByLabel('扮演资料 角色资料 #0')).toHaveValue('阿棠经营花店。');expect((await people(p))[0]).toEqual(prior);
});

test('total material limit retains editable selection; 320px preview controls remain reachable',async({page:p})=>{
  await p.setViewportSize({width:320,height:568});await launch(p);await open(p);await picker(p);await b(p,'角色资料 · 当前角色卡主绑定').click();
  await entry(p,'一'.repeat(20000));await entry(p,'二'.repeat(20000),'隐藏身份 · #1');await b(p,'选择其他世界书').click();await b(p,'剧情设定 · 当前聊天绑定').click();
  await b(p,'城市 · #0').click();await p.getByLabel('确认保留的扮演资料').fill('超限');await b(p,'确认选择此资料').click();await expect(status(p)).toContainText('合计超过40000');
  await b(p,'取消选择此条').click();await toEditor(p,'很多资料');await expect(p.getByLabel('扮演资料 角色资料 #0')).toHaveValue('一'.repeat(20000));
  await save(p);expect((await people(p))[0].roleplayMaterials).toHaveLength(2);
});

test('TT worldbook draft save failure is recoverable; pending native read cannot save across chats',async({page:p})=>{
  await launch(p,true);await open(p);await picker(p);await b(p,'角色资料 · 当前角色卡主绑定').click();await entry(p);await toEditor(p,'TT 草稿');
  await p.evaluate(()=>ttMock.fail=true);await b(p,'保存联系人').click();await expect(status(p)).toContainText('保存未确认');await expect(p.getByLabel('扮演资料 角色资料 #0')).toHaveValue('阿棠经营花店。');
  await p.evaluate(()=>{ttMock.fail=false;ttMock.waitRead=true;});await b(p,'保存联系人').click();await p.waitForFunction(()=>!!ttMock.releasewaitRead);
  await p.evaluate(()=>{ttMock.waitRead=false;profileMock.switch('0','chat-B');ttMock.releasewaitRead();});await expect(b(p,'添加人物')).toBeVisible();
  expect(await people(p,true)).toHaveLength(0);expect(await p.evaluate(()=>ttMock.calls)).toHaveLength(0);
});

