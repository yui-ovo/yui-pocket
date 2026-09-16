import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const b=(p,name)=>p.getByRole('button',{name,exact:true});
const key='yui-pocket.contacts.v1:test-user';
const status=p=>p.getByRole('status').filter({visible:true});
const cards=p=>p.locator('.batch-draft');
async function launch(p,tt=false){
  const paths=['tests/profile-mock.js',...(tt?['tests/tt-mock.js']:[]),'tests/worldbook-mock.js'];
  await p.addInitScript({content:(await Promise.all(paths.map(f=>readFile(f,'utf8')))).join('\n')});
  await p.route('**/api/users/me',r=>r.fulfill({json:{handle:'test-user'}}));
  await p.route('**/thumbnail?**',r=>r.fulfill({contentType:'image/png',path:'src/assets/stickers/rabbit.png'}));
  await p.goto(tt?'/tt':'/');
  await p.evaluate(()=>loreMock.books['角色资料'].entries[0].content='共同背景：大家住在东街。\n## 阿棠\n阿棠经营花店。\n\n## 阿青\n阿青负责送货。');
  await b(p,'打开 Yui 演示手机').click();await b(p,'打开信息').click();await b(p,'通讯录').click();
}
async function enter(p){for(const name of ['添加人物','从世界书选择','角色资料 · 当前角色卡主绑定','花店的两个人 · #0','批量整理此条目中的人物'])await b(p,name).click();}
async function review(p,index,name,account){await cards(p).nth(index).getByRole('button',{name:'检查人物资料',exact:true}).click();if(name)await p.getByLabel('人物名字',{exact:true}).fill(name);if(account)await p.getByLabel('人物虚构账号',{exact:true}).fill(account);await b(p,'确认此人物草稿').click();await expect(cards(p).nth(index)).toContainText('已确认草稿');}
async function books(p,tt=false){return p.evaluate(({key,tt})=>{const raw=JSON.parse(localStorage.getItem(tt?'fixture.tt.store':key)||'{}');return Object.values(tt?raw:raw.books||{});},{key,tt});}

for(const tt of [false,true])test(`${tt?'TT':'ST'} one read, two reviewed drafts, one batch write and refresh; no prefix`,async({page:p})=>{
  await launch(p,tt);
  const plus=b(p,'添加人物');await expect(plus).toHaveText('');expect(await plus.evaluate(e=>getComputedStyle(e,'::after').content)).toBe('"+"');
  await enter(p);await b(p,'按姓名小标题生成候选').click();await expect(cards(p)).toHaveCount(2);await expect(b(p,'按姓名小标题生成候选')).toBeDisabled();
  await b(p,'保存所选人物').click();await expect(status(p)).toContainText('请先逐人检查');expect(await books(p,tt)).toHaveLength(0);
  await cards(p).nth(0).getByRole('button',{name:'检查人物资料'}).click();
  await expect(p.getByLabel('人物虚构账号')).toHaveValue(/^[a-f0-9]{12}$/);await b(p,'生成虚构账号').click();await expect(p.getByLabel('人物虚构账号')).toHaveValue(/^[a-f0-9]{12}$/);
  await expect(p.getByLabel('扮演资料 角色资料 #0')).toHaveValue('## 阿棠\n阿棠经营花店。\n\n');await expect(p.getByLabel('开局关系')).toHaveValue('stranger');await p.getByLabel('开局关系').selectOption('friend');await b(p,'确认此人物草稿').click();
  await review(p,1,'阿青');expect(await books(p,tt)).toHaveLength(0);
  await b(p,'保存所选人物').click();await expect(status(p)).toContainText('已保存2位');await b(p,'保存所选人物').click();await expect(status(p)).toContainText('请先逐人检查');
  const saved=(await books(p,tt))[0];expect(saved.people).toHaveLength(2);expect(saved.people[0].id).not.toBe(saved.people[1].id);expect(saved.revision).toBe(1);
  expect(saved.people[1].relation.friend).toBe(false);expect(saved.people[1].roleplayMaterials[0].content).not.toContain('阿棠');expect(JSON.stringify(saved)).not.toContain('共同背景');expect(await p.evaluate(()=>loreMock.calls)).toEqual(['角色资料']);
  if(tt)expect(await p.evaluate(()=>ttMock.calls)).toHaveLength(1);
  await p.reload();await b(p,'打开 Yui 演示手机').click();await b(p,'打开信息').click();await b(p,'通讯录').click();await expect(p.locator('.friend-list')).toContainText('阿棠');await expect(p.locator('.people-setup')).toContainText('阿青');expect((await books(p,tt))[0]).toEqual(saved);
});

test('manual fallback adds multiple people without restarting book selection; cancel writes nothing',async({page:p})=>{
  await launch(p);await p.evaluate(()=>loreMock.books['角色资料'].entries[0].content='阿棠和阿青住在东街，没有分段标题。');await enter(p);await b(p,'按姓名小标题生成候选').click();await expect(status(p)).toContainText('没有识别到');
  for(const name of ['甲','乙']){await b(p,'手动新增人物草稿').click();await p.getByLabel('人物名字',{exact:true}).fill(name);await p.getByLabel('扮演资料 角色资料 #0').fill(`${name}的手动资料`);await b(p,'确认此人物草稿').click();}
  await expect(cards(p)).toHaveCount(2);expect(await p.evaluate(()=>loreMock.calls)).toHaveLength(1);await b(p,'取消整批草稿').click();expect(await books(p)).toHaveLength(0);
  await b(p,'批量整理此条目中的人物').click();await expect(cards(p)).toHaveCount(0);
});

test('heading syntaxes are literal candidates; same names never merge and original source remains unchanged',async({page:p})=>{
  await launch(p);const content='-明子衡（朋友）:\n第一段\n**明子衡**\n第二段 <script>bad()</script>\n【阿青】\n第三段\n姓名：阿棠\n第四段';await p.evaluate(text=>loreMock.books['角色资料'].entries[0].content=text,content);await enter(p);await b(p,'按姓名小标题生成候选').click();await expect(cards(p)).toHaveCount(4);
  await review(p,0);await review(p,1);await b(p,'保存所选人物').click();await expect(status(p)).toContainText('已保存2位');const saved=(await books(p))[0];expect(saved.people[0].name).toBe(saved.people[1].name);expect(saved.people[0].id).not.toBe(saved.people[1].id);expect(saved.people[1].roleplayMaterials[0].content).toContain('<script>');expect(await p.evaluate(()=>loreMock.books['角色资料'].entries[0].content)).toBe(content);
});

test('duplicate accounts block entire batch; recoverable storage failure keeps reviewed drafts',async({page:p})=>{
  await launch(p);await enter(p);await b(p,'按姓名小标题生成候选').click();await review(p,0,undefined,'same_account');await review(p,1,undefined,'same_account');await b(p,'保存所选人物').click();await expect(status(p)).toContainText('相同账号');expect(await books(p)).toHaveLength(0);
  await review(p,1,undefined,'another_account');await p.evaluate(()=>{const raw=Storage.prototype.setItem;window.restoreStorage=()=>Storage.prototype.setItem=raw;Storage.prototype.setItem=function(k,v){if(k.startsWith('yui-pocket.contacts'))throw new Error('Quota');return raw.call(this,k,v);};});
  await b(p,'保存所选人物').click();await expect(status(p)).toContainText('整批草稿仍保留');await expect(cards(p).nth(0)).toContainText('已确认草稿');expect(await books(p)).toHaveLength(0);
  await p.evaluate(()=>restoreStorage());await b(p,'保存所选人物').click();await expect(status(p)).toContainText('已保存2位');
});

test('link a batch candidate preserves existing ID, old prefix, avatar, remark and relation',async({page:p})=>{
  await launch(p);await b(p,'添加人物').click();await b(p,'从当前角色卡带入').click();await p.getByLabel('人物名字',{exact:true}).fill('原人物');await p.getByLabel('手机备注',{exact:true}).fill('备注不变');await p.getByLabel('人物虚构账号').fill('yui-existing');await p.getByLabel('开局关系').selectOption('friend');await b(p,'保存联系人').click();await expect(status(p)).toContainText('已保存');await b(p,'取消资料修改').click();const original=(await books(p))[0].people[0];
  await enter(p);await b(p,'按姓名小标题生成候选').click();await cards(p).nth(0).getByText('关联已有联系人（可选）',{exact:true}).click();await cards(p).nth(0).getByLabel('关联已有联系人',{exact:true}).selectOption(original.id);await cards(p).nth(0).getByRole('button',{name:'将此草稿关联到所选联系人'}).click();await expect(p.getByLabel('人物名字',{exact:true})).toHaveValue('原人物');await b(p,'确认此人物草稿').click();await b(p,'保存所选人物').click();await expect(status(p)).toContainText('已保存1位');
  const result=(await books(p))[0].people;expect(result).toHaveLength(1);for(const field of ['id','name','remark','source','avatar','account','relation'])expect(result[0][field]).toEqual(original[field]);
});

for(const close of [false,true])test(`pending batch save after ${close?'close':'switch'} does not write or revive`,async({page:p})=>{
  await launch(p,true);await enter(p);await b(p,'按姓名小标题生成候选').click();await review(p,0);await review(p,1);await p.evaluate(()=>ttMock.waitRead=true);await b(p,'保存所选人物').click();await p.waitForFunction(()=>!!ttMock.releasewaitRead);
  if(close)await b(p,'关闭手机').click();else await p.evaluate(()=>profileMock.switch('0','chat-B'));
  await p.evaluate(()=>{ttMock.waitRead=false;ttMock.releasewaitRead();});await expect(p.locator('.worldbook-batch:visible')).toHaveCount(0);expect(await books(p,true)).toHaveLength(0);
});

test('oversized material remains editable and small screen batch actions are reachable',async({page:p})=>{
  await p.setViewportSize({width:320,height:568});await launch(p);await p.evaluate(()=>loreMock.books['角色资料'].entries[0].content='## 阿棠\n'+'字'.repeat(20001));await enter(p);await b(p,'按姓名小标题生成候选').click();await cards(p).nth(0).getByRole('button',{name:'检查人物资料'}).click();await b(p,'确认此人物草稿').click();await expect(status(p)).toContainText('超过20000');await p.getByLabel('扮演资料 角色资料 #0').fill('阿棠经营花店。');await b(p,'确认此人物草稿').click();await b(p,'保存所选人物').click();await expect(status(p)).toContainText('已保存1位');
});

test('explicit shared material only reaches selected drafts and invalidates their confirmation',async({page:p})=>{
  await launch(p);await enter(p);await b(p,'按姓名小标题生成候选').click();await review(p,0);await review(p,1);
  await p.getByText('分配共用资料（可选）',{exact:true}).click();await p.getByLabel('共用原文片段').fill('共同背景：大家住在东街。');await p.getByLabel('分配给 阿棠',{exact:true}).check();await b(p,'追加到勾选人物的草稿').click();
  await expect(cards(p).nth(0)).toContainText('待逐人确认');await expect(cards(p).nth(1)).toContainText('已确认草稿');await review(p,0);await b(p,'保存所选人物').click();await expect(status(p)).toContainText('已保存2位');const saved=(await books(p))[0];expect(saved.people[0].roleplayMaterials[0].content).toContain('共同背景');expect(saved.people[1].roleplayMaterials[0].content).not.toContain('共同背景');
});
