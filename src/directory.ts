import { ui } from './ui';
import { displayName, newAccount, newPerson, validateAccount, type Person } from './contacts';
import { editProfile } from './profile-editor';
import type { ProfileHost, ProfileSession } from './profile-host';
import type { ReadingTarget } from './reading';
import { createChatControls } from './chat-controls';

export function createDirectory(document: Document, host: ProfileHost, options: {
  home(): void; demo(): void; demoPreview(): string; reading(back: () => void, target?: ReadingTarget): void; useReading(target?: ReadingTarget): void;
}) {
  const {el,button,field}=ui(document);
  const page=el('section','workspace-page contacts-page');page.hidden=true;
  let session:ProfileSession|undefined, revision=0, mode:'contacts'|'messages'|'me'='messages', dead=false;
  const queries={contacts:'',messages:''};
  let controller=new AbortController();
  const failedImages=new Set<string>();
  function cancelPending(){revision++;controller.abort();controller=new AbortController();}
  function active(ticket:number){return !dead&&!page.hidden&&revision===ticket;}
  function base(title:string,back:()=>void=options.home){
    cancelPending();page.replaceChildren();page.classList.remove('directory-root');page.setAttribute('aria-label',title);
    const header=el('header','contact workspace-header'), returnButton=button('‹ 返回',back,'back');
    if(back===options.home)returnButton.setAttribute('aria-label','返回主屏幕');header.append(returnButton,el('h2','',title));
    const scroll=el('div','profile-scroll');page.append(header,scroll);return {header,scroll};
  }
  function rootView(){
    const title=mode==='contacts'?'通讯录':mode==='me'?'我':'信息';
    const view=base(title);page.classList.add('directory-root');
    view.header.classList.add('directory-header');
    const more=button('⋯',()=>{
      const {scroll}=base('页面导航',list);
      for(const [key,label] of [['messages','信息'],['contacts','通讯录'],['me','我']] as const)scroll.append(button(label,()=>void enter(key)));
    },'header-more');more.setAttribute('aria-label','打开页面导航');view.header.append(more);
    const nav=el('nav','directory-tabs');nav.setAttribute('aria-label','信息应用导航');
    for(const [key,label] of [['messages','信息'],['contacts','通讯录'],['me','我']] as const){
      const tab=button('',()=>{if(mode!==key)void enter(key);},'directory-tab');tab.setAttribute('aria-label',label);
      if(mode===key)tab.setAttribute('aria-current','page');
      const heart=el('span',`tab-art tab-${key}`);heart.setAttribute('aria-hidden','true');tab.append(heart,el('span','',label));nav.append(tab);
    }
    page.append(nav);return view;
  }
  function avatar(person:Person){
    const wrap=el('span','profile-avatar',displayName(person).slice(0,1));
    const source=host.avatar(person);if(source&&!failedImages.has(source)){
      const image=el('img');image.alt=`${displayName(person)}的头像`;image.referrerPolicy='no-referrer';
      image.onerror=()=>{failedImages.add(source);image.remove();wrap.title='头像加载失败，已回退占位';};image.src=source;wrap.append(image);
    }return wrap;
  }
  async function enter(next:typeof mode){
    mode=next;page.hidden=false;session=undefined;const {scroll}=rootView();
    scroll.append(el('p','empty-state','正在读取本存档资料…'));const ticket=revision;
    try{const loaded=await host.load(controller.signal);if(active(ticket)){session=loaded;list();}}
    catch(error){if(!active(ticket))return;scroll.replaceChildren(el('p','empty-state',(error as Error).message));
      if(next==='messages')demoEntry(scroll);
    }
  }
  function demoEntry(scroll:HTMLElement){
    scroll.append(el('h3','section-title','独立演示 · 不属于本存档'));
    const row=button('',options.demo,'contact-row');row.setAttribute('aria-label','打开与小桃的聊天');
    const copy=el('span','contact-copy');copy.append(el('strong','','小桃 · 演示'),el('span','contact-preview',options.demoPreview()));
    row.append(el('span','list-avatar','桃'),copy,el('span','chevron','›'));scroll.append(row);
  }
  function list(){
    const {header,scroll}=rootView();
    if(!session)return;
    if(mode==='me'){
      const card=button('',myCard,'my-card-link'),copy=el('span','contact-copy');
      copy.append(el('strong','','我的名片'),el('span','contact-preview',session.book.self.account||'设置本存档的虚构账号'));
      card.setAttribute('aria-label','我的名片');card.append(el('span','self-card-avatar','我'),copy,el('span','chevron','›'));
      scroll.append(el('p','me-kicker','a little space for me'),card,el('p','beauty-hint','本聊天专属的名片。图案为装饰占位，本人头像尚未接入。'),el('p','empty-state','把自己放进这一段故事里 ♡'));
      return;
    }
    if(mode==='contacts'){
      const add=button('＋',addMenu,'back');add.setAttribute('aria-label','添加人物');header.append(add);
      header.querySelector('.header-more')?.remove();
    }
    const queryMode=mode;
    const searchLabel=el('label','directory-search'),heart=el('span','','♡'),search=el('input');heart.setAttribute('aria-hidden','true');
    search.type='search';search.placeholder='搜索备注或人物名字';search.setAttribute('aria-label','筛选本页人物');search.value=queries[queryMode];
    searchLabel.append(heart,search);scroll.append(searchLabel,el('p','directory-caption','本聊天专属 · 不保存真实消息'));
    const rows=el('div','directory-results');scroll.append(rows);
    const friends=session.book.people.filter(p=>p.relation.friend), pending=session.book.people.filter(p=>!p.relation.friend);
    function section(title:string,people:Person[],setup:boolean){
      const group=el('section',setup?'people-setup':'friend-list');group.setAttribute('aria-label',title);group.append(el('h3','section-title',title));
      if(!people.length)group.append(el('p','empty-state',queries[queryMode]?'没有匹配的人物':setup?'尚未登记其他人物':'暂无好友；可以在通讯录中录入人物'));
      for(const person of people){
        const row=button('',()=>mode==='messages'?chat(person.id):edit(person.id,()=>list()),'contact-row');row.dataset.personId=person.id;
        const copy=el('span','contact-copy');copy.append(el('strong','person-name',displayName(person)),el('span','contact-preview',setup?(person.relation.known?'认识 · 未加好友':'尚不认识 · 玩家设置'):'暂无消息 · 聊天尚未接入'));
        row.append(avatar(person),copy,el('span','chevron','›'));group.append(row);
      }rows.append(group);
    }
    function results(){
      rows.replaceChildren();const query=queries[queryMode].trim().toLocaleLowerCase();
      const match=(person:Person)=>!query||`${person.name}\n${person.remark}`.toLocaleLowerCase().includes(query);
      section(mode==='messages'?'好友会话':'已有好友',friends.filter(match),false);
      if(mode==='contacts'){section('人物设置 · 仅玩家可见',pending.filter(match),true);rows.append(el('p','beauty-hint','登记人物不代表你已认识或知道对方账号。'));}
      else if(!query||'小桃 演示'.includes(query))demoEntry(rows);
    }
    search.oninput=()=>{queries[queryMode]=search.value;results();};results();
  }
  function addMenu(){
    const {scroll}=base('添加人物',list);
    const card=button('从当前角色卡带入',()=>{
      const source=session?.snapshot.source;if(!source)return;
      editNew(newPerson({kind:'card',name:source.name,avatarFile:source.avatarFile},source.name));
    });card.disabled=!session?.snapshot.source;
    scroll.append(card,button('手动创建人物',()=>editNew(newPerson())),el('p','beauty-hint','先编辑并确认保存。角色卡标题可以改成人物名字，不改原卡；同一来源可以录入多人。'));
    if(card.disabled)scroll.append(el('p','beauty-hint','当前没有单一来源角色卡，请手动创建人物。'));
  }
  function editNew(person:Person){editor(person,list);}
  function edit(id:string,back:()=>void){const person=session?.book.people.find(p=>p.id===id);if(person)editor(person,back);}
  function editor(person:Person,back:()=>void){
    cancelPending();const ticket=revision, captured=session!;
    const editor=editProfile(document,host,person,{active:()=>active(ticket),back,save:async(draft)=>{
      if(!active(ticket))throw new Error('资料编辑已失效');
      const book=structuredClone(captured.book),index=book.people.findIndex(p=>p.id===draft.id);
      if(index<0)book.people.push(draft);else book.people[index]=draft;
      await host.save(captured,book,controller.signal);
    }});page.replaceChildren(editor);
  }
  function chat(id:string){
    const person=session?.book.people.find(p=>p.id===id);if(!person)return;
    const {header,scroll}=base('会话',list);header.classList.add('chat-header');header.replaceChildren(button('‹ 信息',list,'back'));
    const name=button(displayName(person),()=>edit(id,()=>chat(id)),'identity profile-name');name.setAttribute('aria-label','打开联系人资料');
    const more=button('⋯',()=>chatSettings(id),'chat-more');more.setAttribute('aria-label','打开聊天设置');
    
    name.title=displayName(person);header.append(name,more);options.useReading(readingTarget(person));scroll.classList.add('messages');
    scroll.append(el('p','empty-state','暂无消息。此联系人的聊天功能尚未接入，不会产生回复或历史记录。'));
    page.append(createChatControls(document,false).container);
  }
  function readingTarget(person:Person):ReadingTarget {
    const captured=session!;
    return {key:JSON.stringify([captured.account,captured.book.id,person.id]),identity:{name:displayName(person),source:host.avatar(person)||undefined},active:()=>!dead&&session===captured};
  }
  function settingsView(person:Person|undefined,back:()=>void,full:()=>void,appearance:()=>void){
    const {scroll}=base('聊天设置',back);
    scroll.append(el('h3','section-title','联系人资料'));
    const summary=el('div','settings-person'),copy=el('div','contact-copy');
    copy.append(el('strong','',person?displayName(person):'小桃 · 演示'),el('span','profile-source',person?`人物名字：${person.name}\n手机备注：${person.remark||'未设置'}`:'虚构人物 · 无存档资料'));
    summary.append(person?avatar(person):el('span','profile-avatar','桃'),copy);
    scroll.append(summary,button('完整人物资料',full),el('h3','section-title','聊天外观'),el('p','beauty-hint','消息两侧的头像、气泡文字大小和行距。顶部更多按钮始终保留。'),button('聊天外观',appearance));
  }
  function chatSettings(id:string){
    const person=session?.book.people.find(p=>p.id===id);if(!person)return;
    settingsView(person,()=>chat(id),()=>edit(id,()=>chatSettings(id)),()=>options.reading(()=>chatSettings(id),readingTarget(person)));
  }
  function myCard(){
    const {scroll}=base('我的名片',list),captured=session!,ticket=revision;
    const account=field('我的虚构账号',captured.book.self.account||newAccount(),40),status=el('p','beauty-status');status.setAttribute('role','status');
    const save=button('保存我的名片',()=>{const book=structuredClone(captured.book);book.self.account=account.input.value.trim();
      try{validateAccount(book.self.account,book);}catch(error){status.textContent=(error as Error).message;return;}
      save.disabled=true;status.textContent='正在确认存档并保存…';account.input.disabled=true;void host.save(captured,book,controller.signal).then(()=>{if(active(ticket))status.textContent='我的名片已保存';}).catch(error=>{if(active(ticket))status.textContent=error.message;}).finally(()=>{if(active(ticket)){save.disabled=false;account.input.disabled=false;}});
    });scroll.append(account.label,button('生成我的虚构账号',()=>{account.input.value=newAccount();}),el('p','beauty-hint','仅在本存档使用，不提供真实通讯服务。保存后账号固定；不会发出申请。'));
    const actions=el('div','beauty-actions');actions.append(save);page.append(actions,status);
  }
  const unsubscribe=host.subscribe(()=>{cancelPending();session=undefined;queries.contacts=queries.messages='';if(!page.hidden)void enter(mode);});
  return {page,enter,leave(){cancelPending();page.hidden=true;},dispose(){dead=true;cancelPending();unsubscribe();page.remove();},
    demoSettings(back:()=>void){page.hidden=false;settingsView(undefined,back,()=>this.demoProfile(()=>this.demoSettings(back)),()=>options.reading(()=>this.demoSettings(back)));},
    demoProfile(back:()=>void){page.hidden=false;const {scroll}=base('演示人物资料',back);scroll.append(el('p','empty-state','小桃是独立演示人物，不属于本存档通讯录；示例资料不保存。'));},
  };
}
