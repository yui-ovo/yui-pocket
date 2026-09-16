import { ui } from './ui';
import { displayName, newPerson, validateBook, type Person } from './contacts';
import { materialKey, validateMaterials, type WorldEntry } from './worldbook';
import { splitWorldSections } from './worldbook-sections';
import { editProfile } from './profile-editor';
import type { ProfileHost, ProfileSession } from './profile-host';

type Draft = { key:string; person:Person; confirmed:boolean; selected:boolean; saved:boolean };
export function createWorldBatch(document:Document,host:ProfileHost,session:ProfileSession,options:{signal:AbortSignal;active():boolean}){
  const {el,button}=ui(document),page=el('section','workspace-page worldbook-batch');
  const drafts:Draft[]=[],suggested=new Set<string>();let source:WorldEntry,back:()=>void,revision=0,busy=false;
  const active=(ticket:number)=>options.active()&&!options.signal.aborted&&page.isConnected&&ticket===revision;
  function make(name:string,content:string){
    const person=newPerson({kind:'worldbook',name:source.world},name);
    person.roleplayMaterials=[{world:source.world,uid:source.uid,title:source.title,content,fingerprint:source.fingerprint,confirmedAt:new Date().toISOString()}];
    const draft={key:crypto.randomUUID(),person,confirmed:false,selected:false,saved:false};drafts.push(draft);return draft;
  }
  function review(draft:Draft){
    revision++;const ticket=revision;
    const editor=editProfile(document,host,draft.person,{draftOnly:true,active:()=>active(ticket),back:list,save:async person=>{
      if(!active(ticket))throw new Error('人物草稿已失效');
      const book=structuredClone(session.book);book.people=book.people.filter(p=>p.id!==person.id);book.people.push(person);validateBook(book);
      draft.person=structuredClone(person);draft.confirmed=true;draft.selected=true;list();
    }});page.replaceChildren(editor);
  }
  function list(){
    revision++;const ticket=revision;page.replaceChildren();
    const header=el('header','contact workspace-header');header.append(button('‹ 返回条目',()=>{revision++;back();},'back'),el('strong','','批量人物草稿'));
    const scroll=el('div','profile-scroll');page.append(header,scroll);
    scroll.append(el('p','beauty-hint','只形成草稿，不自动加好友。每个人都需打开资料检查并确认，再保存所选人物。识别的标题未必是姓名，支持修改或移除。'));
    const original=el('details'),summary=el('summary','',`查看当前原文：${source.world} · ${source.title||source.uid}`);original.append(summary,el('pre','world-original',source.content));scroll.append(original);
    const notice=el('p','beauty-status');notice.setAttribute('role','status');
    const warning=el('p','beauty-hint','支持 # 姓名、**姓名**、- 姓名：、【姓名】、姓名：名字 等独立标题行。标题前的共同背景不自动分配，可以在下方明确分配共用资料。无标题时可手动填写。');scroll.append(warning);
    const signature=JSON.stringify([source.world,source.uid,source.fingerprint]);
    const suggest=button('按姓名小标题生成候选',()=>{
      if(suggested.has(signature))return;
      const sections=splitWorldSections(source.content);
      if(!sections.length){notice.textContent='没有识别到支持的小标题，请手动新增人物草稿；原文仍可查看。';return;}
      if(drafts.length+sections.length>20){notice.textContent=`识别到${sections.length}段，超过本批最多20份草稿，请手动选择需要的段落；没有截断或创建人物。`;return;}
      sections.forEach(s=>make(s.name,s.content));suggested.add(signature);list();
    });suggest.disabled=suggested.has(signature);scroll.append(suggest,button('手动新增人物草稿',()=>{
      if(drafts.length>=20){notice.textContent='本批最多20份草稿，请先移除不需要的候选。';return;}review(make('',''));
    }));
    if(!drafts.length)scroll.append(el('p','empty-state','尚无人物草稿。可以按标题生成候选，或手动新增。'));
    for(const draft of drafts){
      const card=el('section','world-entry batch-draft');card.dataset.draftId=draft.key;
      const label=el('label','profile-label'),check=el('input');check.type='checkbox';check.checked=draft.selected;check.disabled=!draft.confirmed||draft.saved;check.setAttribute('aria-label',`保存草稿 ${draft.person.name||'未命名'}`);check.onchange=()=>{draft.selected=check.checked;};
      label.append(check,el('strong','',draft.person.name||'未命名人物'));card.append(label);
      const known=session.book.people.some(p=>p.id===draft.person.id);
      card.append(el('p','beauty-hint',`${draft.saved?'已保存':draft.confirmed?'已确认草稿':'待逐人确认'} · ${known?'关联已有联系人':'新建独立人物'} · ${draft.person.relation.friend?'已经是好友':draft.person.relation.known?'认识但未加好友':'尚不认识'}`));
      if(!draft.saved){
        const matches=session.book.people.filter(p=>p.name===draft.person.name||p.roleplayMaterials?.some(m=>draft.person.roleplayMaterials?.some(n=>materialKey(m)===materialKey(n))));
        if(matches.length)card.append(el('p','beauty-hint',`同名或同来源已登记：${matches.map(displayName).join('、')}。不会自动合并，可选择已有联系人。`));
        card.append(button('检查人物资料',()=>review(draft)),button('移除此草稿',()=>{drafts.splice(drafts.indexOf(draft),1);list();}));
        const association=el('details');association.append(el('summary','','关联已有联系人（可选）'));
        const chooseLabel=el('label','profile-label','关联已有联系人'),choose=el('select');choose.setAttribute('aria-label','关联已有联系人');
        const empty=el('option','','请选择已有联系人');empty.value='';choose.append(empty);
        for(const person of session.book.people){const o=el('option','',`${displayName(person)} · ${person.id.slice(0,8)}`);o.value=person.id;choose.append(o);}chooseLabel.append(choose);
        const consentLabel=el('label','profile-label','允许替换相同来源资料'),consent=el('input');consent.type='checkbox';consent.setAttribute('aria-label','允许替换相同来源资料');consentLabel.append(consent);
        association.append(chooseLabel,consentLabel,button('将此草稿关联到所选联系人',()=>{
          const person=session.book.people.find(p=>p.id===choose.value);if(!person){notice.textContent='请先选择已有联系人。';return;}
          if(drafts.some(d=>d!==draft&&!d.saved&&d.person.id===person.id)){notice.textContent='本批已有一份草稿关联此联系人，请在那份资料中合并内容，避免相互覆盖。';return;}
          const materials=new Map((person.roleplayMaterials||[]).map(m=>[materialKey(m),m]));
          if(draft.person.roleplayMaterials?.some(m=>materials.has(materialKey(m)))&&!consent.checked){notice.textContent='相同来源已存在，请明确勾选允许替换；原联系人其他字段会保留。';return;}
          draft.person.roleplayMaterials?.forEach(m=>materials.set(materialKey(m),m));draft.person={...structuredClone(person),roleplayMaterials:structuredClone([...materials.values()])};draft.confirmed=false;draft.selected=false;review(draft);
        }));if(session.book.people.length)card.append(association);
      }scroll.append(card);
    }
    const pending=drafts.filter(d=>!d.saved);
    if(pending.length){
      const common=el('details','world-materials');common.append(el('summary','','分配共用资料（可选）'));
      const label=el('label','profile-label','共用原文片段'),text=el('textarea');text.rows=4;text.setAttribute('aria-label','共用原文片段');label.append(text);common.append(label,el('p','beauty-hint','将你填写的资料追加给明确勾选的人物，不自动分给所有人。分配后需要重新检查这些草稿。'));
      const recipients=new Set<Draft>();
      for(const draft of pending){const choice=el('label','profile-label',draft.person.name||'未命名人物'),check=el('input');check.type='checkbox';check.setAttribute('aria-label',`分配给 ${draft.person.name||'未命名人物'}`);check.onchange=()=>{if(check.checked)recipients.add(draft);else recipients.delete(draft);};choice.prepend(check);common.append(choice);}
      common.append(button('追加到勾选人物的草稿',()=>{
        if(!text.value.trim()||!recipients.size){notice.textContent='请填写共用资料，并勾选要分配的人物。';return;}
        try{
          const next=[...recipients].map(draft=>{
            const person=structuredClone(draft.person),materials=person.roleplayMaterials??[],existing=materials.find(m=>materialKey(m)===materialKey(source));
            if(existing){
              if(existing.fingerprint!==source.fingerprint)throw new Error('相同来源的版本不同，请在人物资料中手动整理，以保留来源证据');
              existing.content+="\n\n"+text.value;existing.confirmedAt=new Date().toISOString();
            }else materials.push({world:source.world,uid:source.uid,title:source.title,content:text.value,fingerprint:source.fingerprint,confirmedAt:new Date().toISOString()});
            validateMaterials(materials);person.roleplayMaterials=materials;return {draft,person};
          });
          next.forEach(({draft,person})=>{draft.person=person;draft.confirmed=false;draft.selected=false;});list();
          page.querySelector('[role=status]')!.textContent=`共用资料已追加给${next.length}份草稿，请重新逐人确认`;
        }catch(error){notice.textContent=(error as Error).message;}
      }));scroll.append(common);
    }
    const save=button('保存所选人物',()=>{
      if(busy||!active(ticket))return;const selected=drafts.filter(d=>d.selected&&d.confirmed&&!d.saved);
      if(!selected.length){notice.textContent='请先逐人检查并确认草稿，再勾选要保存的人物。';return;}
      const book=structuredClone(session.book),ids=new Set<string>();
      for(const draft of selected){
        if(ids.has(draft.person.id)){notice.textContent='本批存在重复关联，请合并为一份人物草稿。';return;}ids.add(draft.person.id);
        const index=book.people.findIndex(p=>p.id===draft.person.id);if(index<0)book.people.push(structuredClone(draft.person));else book.people[index]=structuredClone(draft.person);
      }
      try{validateBook(book);}catch(error){notice.textContent=(error as Error).message;return;}
      busy=true;notice.textContent='正在确认存档并保存整批人物…';
      page.querySelectorAll<HTMLInputElement|HTMLButtonElement|HTMLSelectElement>('input,button,select').forEach(n=>n.disabled=true);
      void host.save(session,book,options.signal).then(()=>{
        if(!active(ticket))return;selected.forEach(d=>{d.saved=true;d.selected=false;});busy=false;list();
        page.querySelector('[role=status]')!.textContent=`已保存${selected.length}位人物到当前聊天通讯录`;
      }).catch(error=>{
        if(!active(ticket))return;busy=false;list();page.querySelector('[role=status]')!.textContent=`保存失败，整批草稿仍保留：${(error as Error).message}`;
      });
    });
    const actions=el('div','beauty-actions');actions.append(save,button('取消整批草稿',()=>{drafts.length=0;suggested.clear();revision++;back();}));page.append(actions,notice);
  }
  return {page,open(row:WorldEntry,onBack:()=>void){source=row;back=onBack;list();},count:()=>drafts.filter(d=>!d.saved).length};
}
