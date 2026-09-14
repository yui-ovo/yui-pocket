import { ui } from './ui';
import { displayName, newAccount, newPerson, validateAccount, type Person } from './contacts';
import { editProfile } from './profile-editor';
import type { ProfileHost, ProfileSession } from './profile-host';

export function createDirectory(document: Document, host: ProfileHost, options: {
  home(): void; demo(): void; demoPreview(): string; reading(back: () => void): void;
}) {
  const {el,button,field}=ui(document);
  const page=el('section','workspace-page contacts-page');page.hidden=true;
  let session:ProfileSession|undefined, revision=0, mode:'contacts'|'messages'='contacts', dead=false;
  let controller=new AbortController();
  const failedImages=new Set<string>();
  function cancelPending(){revision++;controller.abort();controller=new AbortController();}
  function active(ticket:number){return !dead&&!page.hidden&&revision===ticket;}
  function base(title:string,back:()=>void=options.home){
    cancelPending();page.replaceChildren();page.setAttribute('aria-label',title);
    const header=el('header','contact workspace-header'), returnButton=button('‹ 返回',back,'back');
    if(back===options.home)returnButton.setAttribute('aria-label','返回主屏幕');header.append(returnButton,el('h2','',title));
    const scroll=el('div','profile-scroll');page.append(header,scroll);return {header,scroll};
  }
  function avatar(person:Person,top=false){
    const wrap=el('span','profile-avatar',displayName(person).slice(0,1));if(top)wrap.dataset.topAvatar='';
    const source=host.avatar(person);if(source&&!failedImages.has(source)){
      const image=el('img');image.alt=`${displayName(person)}的头像`;image.referrerPolicy='no-referrer';
      image.onerror=()=>{failedImages.add(source);image.remove();wrap.title='头像加载失败，已回退占位';};image.src=source;wrap.append(image);
    }return wrap;
  }
  async function enter(next:typeof mode){
    mode=next;page.hidden=false;session=undefined;const {scroll}=base(next==='contacts'?'联系人':'信息');
    scroll.append(el('p','empty-state','正在读取本存档资料…'));const ticket=revision;
    try{session=await host.load(controller.signal);if(active(ticket))list();}
    catch(error){if(!active(ticket))return;scroll.replaceChildren(el('p','empty-state',(error as Error).message));
      if(next==='messages')demoEntry(scroll);
      scroll.append(button('阅读设置',()=>options.reading(()=>void enter(next))));
    }
  }
  function demoEntry(scroll:HTMLElement){
    scroll.append(el('h3','section-title','独立演示 · 不属于本存档'));
    const row=button('',options.demo,'contact-row');row.setAttribute('aria-label','打开与小桃的聊天');
    const copy=el('span','contact-copy');copy.append(el('strong','','小桃 · 演示'),el('span','contact-preview',options.demoPreview()));
    row.append(el('span','list-avatar','桃'),copy,el('span','chevron','›'));scroll.append(row);
  }
  function list(){
    const {header,scroll}=base(mode==='contacts'?'联系人':'信息');
    if(!session)return;
    if(mode==='contacts'){
      const add=button('＋',addMenu,'back');add.setAttribute('aria-label','添加人物');header.append(add);
      scroll.append(button('我的名片',myCard));
    }
    scroll.append(el('p','beauty-hint','本聊天专属 · 资料保存在本机；不保存真实消息'));
    const friends=session.book.people.filter(p=>p.relation.friend), pending=session.book.people.filter(p=>!p.relation.friend);
    function section(title:string,people:Person[],setup:boolean){
      const group=el('section',setup?'people-setup':'friend-list');group.setAttribute('aria-label',title);group.append(el('h3','section-title',title));
      if(!people.length)group.append(el('p','empty-state',setup?'尚未登记其他人物':'暂无好友；可以在联系人中录入人物'));
      for(const person of people){
        const row=button('',()=>mode==='messages'?chat(person.id):edit(person.id,()=>list()),'contact-row');row.dataset.personId=person.id;
        const copy=el('span','contact-copy');copy.append(el('strong','person-name',displayName(person)),el('span','contact-preview',setup?(person.relation.known?'认识 · 未加好友':'尚不认识 · 玩家设置'):'暂无消息 · 聊天尚未接入'));
        row.append(avatar(person),copy,el('span','chevron','›'));group.append(row);
      }scroll.append(group);
    }
    section(mode==='messages'?'好友会话':'已有好友',friends,false);
    if(mode==='contacts'){section('人物设置 · 仅玩家可见',pending,true);scroll.append(el('p','beauty-hint','登记人物不代表你已认识或知道对方账号。'),button('阅读设置',()=>options.reading(list)));}
    else demoEntry(scroll);
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
    const {header,scroll}=base('会话',list);header.replaceChildren(button('‹ 信息',list,'back'));
    const name=button(displayName(person),()=>edit(id,()=>chat(id)),'identity profile-name');name.setAttribute('aria-label','打开联系人资料');
    const picture=button('',()=>edit(id,()=>chat(id)),'profile-avatar-button');picture.setAttribute('aria-label','打开头像资料');picture.dataset.topAvatar='';picture.append(avatar(person));
    header.append(name,picture);scroll.classList.add('messages');
    scroll.append(el('p','empty-state','暂无消息。此联系人的聊天功能尚未接入，不会产生回复或历史记录。'));
    const form=el('div','composer'),input=el('textarea','message-input');input.disabled=true;input.placeholder='聊天功能尚未接入';input.setAttribute('aria-label','联系人消息输入框');
    const send=button('发送',()=>{},'send');send.disabled=true;form.append(input,send);page.append(form);
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
  const unsubscribe=host.subscribe(()=>{cancelPending();session=undefined;if(!page.hidden)void enter(mode);});
  return {page,enter,leave(){cancelPending();page.hidden=true;},dispose(){dead=true;cancelPending();unsubscribe();page.remove();},
    demoProfile(back:()=>void){page.hidden=false;const {scroll}=base('演示人物资料',back);scroll.append(el('p','empty-state','小桃是独立演示人物，不属于本存档通讯录；示例资料不保存。'),button('阅读设置',()=>options.reading(()=>this.demoProfile(back))));},
  };
}
