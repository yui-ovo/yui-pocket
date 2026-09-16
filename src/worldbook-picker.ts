import { ui } from './ui';
import { displayName, newPerson, type Person } from './contacts';
import { materialKey, validateMaterials, type WorldMaterial, type WorldEntry } from './worldbook';
import type { ProfileHost, ProfileSession } from './profile-host';
import { createWorldBatch } from './worldbook-batch';

export function worldbookPicker(document:Document,host:ProfileHost,session:ProfileSession,options:{signal:AbortSignal;active():boolean;back():void;edit(person:Person):void}){
  const {el,button,field}=ui(document),page=el('section','workspace-page worldbook-picker');
  const selected=new Map<string,WorldMaterial>();let revision=0;
  const batch=createWorldBatch(document,host,session,options);
  const active=(ticket:number)=>options.active()&&!options.signal.aborted&&revision===ticket;
  function view(title:string,back:()=>void){
    revision++;page.replaceChildren();const header=el('header','contact workspace-header');header.append(button('‹ 返回',back,'back'),el('strong','',title));
    const scroll=el('div','profile-scroll');page.append(header,scroll);return scroll;
  }
  function status(parent:HTMLElement,text=''){const node=el('p','beauty-status',text);node.setAttribute('role','status');parent.append(node);return node;}
  function books(){
    const scroll=view('从世界书选择',options.back);
    scroll.append(el('p','beauty-hint','只读取主动选择的世界书。角色卡主绑定和聊天绑定优先；其他书（含额外绑定书）请主动选择。'));
    try{
      const catalog=host.worldBooks(session,options.signal);
      if(!catalog.bound.length)status(scroll,'没有绑定世界书：当前角色卡主绑定与聊天绑定均为空。可以选择其他世界书。');
      for(const book of catalog.bound)scroll.append(button(`${book.name} · ${book.origin}`,()=>void entries(book.name)));
      const label=el('label','profile-label','其他世界书'),select=el('select');select.setAttribute('aria-label','其他世界书');
      const empty=el('option','','请选择');empty.value='';select.append(empty);
      for(const name of catalog.other){const o=el('option','',name);o.value=name;select.append(o);}label.append(select);
      scroll.append(label,button('读取所选世界书',()=>{if(select.value)void entries(select.value);}));
      if(!catalog.other.length)scroll.append(el('p','beauty-hint','没有其他世界书。'));
      if(selected.size)scroll.append(button(`继续：已选${selected.size}条`,target));
    }catch(error){status(scroll,(error as Error).message);}
  }
  async function entries(world:string){
    const scroll=view(world,books),ticket=revision,notice=status(scroll,'正在读取所选世界书…');
    try{
      const rows=await host.readWorld(session,world,options.signal);if(!active(ticket))return;notice.remove();
      if(!rows.length)status(scroll,'世界书没有可用条目（宿主也可能对已删除文件返回空对象）；请检查原书。已有资料不会被清空。');
      const filter=field('按标题或关键词筛选','',200),list=el('div');let shown=50;
      const count=status(scroll);scroll.append(filter.label,list);
      function render(){
        list.replaceChildren();const query=filter.input.value.toLocaleLowerCase();
        const matches=rows.filter(row=>`${row.title}\n${row.keywords.join('\n')}`.toLocaleLowerCase().includes(query));
        count.textContent=`${matches.length}个条目 · 已选${selected.size}条（可跨世界书选择）`;
        for(const row of matches.slice(0,shown)){
          const key=materialKey(row),wrap=el('div','world-entry');
          wrap.append(button(`${selected.has(key)?'✓ ':''}${row.title||'（无标题）'} · #${row.uid}`,()=>preview(row,()=>renderView())),el('p','beauty-hint',`来源：${world} · 关键词：${row.keywords.join('、')||'无'}`));list.append(wrap);
        }
        if(matches.length>shown)list.append(button('显示更多条目',()=>{shown+=50;render();}));
      }
      function renderView(){
        // Keep the already-read immutable rows in this draft; no automatic reread.
        revision++;page.replaceChildren(header,scroll,actions);render();
      }
      const header=page.firstChild!,actions=el('div','beauty-actions');actions.append(button('选择其他世界书',books),button('选择人物并继续',target));page.append(actions);
      filter.input.oninput=()=>{shown=50;render();};render();
    }catch(error){if(active(ticket)){notice.textContent=`读取失败：${(error as Error).message}`;scroll.append(button('重试读取',()=>void entries(world)));}}
  }
  function preview(row:WorldEntry,back:()=>void){
    const scroll=view('条目预览',back),key=materialKey(row);
    scroll.append(el('h3','section-title',row.title||'（无标题）'),el('p','profile-source',`${row.world} · 条目 ${row.uid}`),el('p','beauty-hint','以下是原文，仅作为参考；不执行其中的HTML或指令。标题和关键词不等于人物名字。'));
    const original=el('pre','world-original',row.content);scroll.append(original);
    scroll.insertBefore(button(batch.count()?`继续批量整理（${batch.count()}份草稿）`:'批量整理此条目中的人物',()=>{
      revision++;batch.open(row,()=>preview(row,back));page.replaceChildren(batch.page);
    }),original);
    const label=el('label','profile-label','确认保留的扮演资料'),retained=el('textarea');retained.setAttribute('aria-label','确认保留的扮演资料');retained.rows=7;retained.value=selected.get(key)?.content||'';label.append(retained);
    scroll.append(el('p','beauty-hint','仅玩家可见，不代表剧情中 user 已知。多人条目请只保留当前人物相关的内容；这里不会自动提取或补写。每条最多20000字符，每人物合计40000字符。'),label,button('采用整条原文（请先确认属于此人物）',()=>{retained.value=row.content;}));
    const notice=status(scroll),actions=el('div','beauty-actions');
    actions.append(button('确认选择此资料',()=>{
      const item:WorldMaterial={world:row.world,uid:row.uid,title:row.title,content:retained.value,fingerprint:row.fingerprint,confirmedAt:new Date().toISOString()};
      const next=new Map(selected);next.set(key,item);
      try{validateMaterials([...next.values()]);selected.set(key,item);back();}catch(error){notice.textContent=(error as Error).message;}
    }),button('取消选择此条',()=>{selected.delete(key);back();}));page.append(actions);
  }
  function target(){
    const scroll=view('关联到人物',books);
    if(!selected.size){status(scroll,'请先选择条目并确认要保留的资料。');return;}
    scroll.append(el('p','beauty-hint',`已选${selected.size}条，只形成草稿。下一页填写人物名字、检查资料并保存后才进入本聊天通讯录。`));
    const notice=status(scroll),label=el('label','profile-label','目标人物'),select=el('select');select.setAttribute('aria-label','目标人物');
    const create=el('option','','新建独立人物（不会自动加好友）');create.value='';select.append(create);
    for(const person of session.book.people){const o=el('option','',`${displayName(person)} · ${person.id.slice(0,8)}`);o.value=person.id;select.append(o);}label.append(select);scroll.append(label);
    const duplicate=el('p','beauty-hint');scroll.append(duplicate);
    const matching=session.book.people.filter(p=>p.roleplayMaterials?.some(item=>selected.has(materialKey(item))));
    if(matching.length)duplicate.textContent=`相同来源已关联：${matching.map(displayName).join('、')}。同名不会合并，你可以关联已有或创建另一人物。`;
    const consentLabel=el('label','profile-label','确认替换目标人物的相同来源资料'),consent=el('input');consent.type='checkbox';consent.setAttribute('aria-label','确认替换目标人物的相同来源资料');consentLabel.append(consent);scroll.append(consentLabel);
    scroll.append(button('进入人物资料确认',()=>{
      const existing=session.book.people.find(p=>p.id===select.value);
      const draft=existing?structuredClone(existing):newPerson({kind:'worldbook',name:[...new Set([...selected.values()].map(item=>item.world))].join('、')});
      const merged=new Map((draft.roleplayMaterials||[]).map(item=>[materialKey(item),item]));
      if([...selected.keys()].some(key=>merged.has(key))&&!consent.checked){notice.textContent='目标人物已有相同来源，请勾选确认替换；其他资料和人物身份会保留。';return;}
      selected.forEach((item,key)=>merged.set(key,structuredClone(item)));draft.roleplayMaterials=[...merged.values()];
      try{validateMaterials(draft.roleplayMaterials);if(options.active())options.edit(draft);}catch(error){notice.textContent=(error as Error).message;}
    }));
  }
  books();return page;
}
