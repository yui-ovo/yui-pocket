import { ui } from './ui';
import { readDecoration } from './appearance';
import { newAccount, validateAvatarUrl, type Person } from './contacts';
import type { ProfileHost } from './profile-host';

export function editProfile(document: Document, host: ProfileHost, original: Person, options: {
  save(person: Person): Promise<void>; back(): void; active(): boolean; draftOnly?: boolean;
}) {
  const {el,button,field}=ui(document), draft=structuredClone(original);
  const page=el('section','workspace-page'), header=el('header','contact workspace-header');
  header.append(button('‹ 返回',options.back,'back'),el('strong','','联系人资料'));
  const scroll=el('div','profile-scroll');
  scroll.append(el('p','beauty-hint','人物设置由玩家编辑，不代表剧情中的你已知道这些资料。'));
  const provenance=el('p','profile-source',`人物 ID：${draft.id}\n来源：${draft.source.kind==='card'?'角色卡':draft.source.kind==='worldbook'?'世界书':'手动'} · ${draft.source.name}`);
  scroll.append(provenance);
  const name=field('人物名字',draft.name), remark=field('手机备注',draft.remark), description=field('简短设定（可选）',draft.description,1000), account=field('人物虚构账号',draft.account,40);
  scroll.append(name.label,remark.label,description.label,account.label,button('生成虚构账号',()=>{account.input.value=newAccount();}));
  if(draft.roleplayMaterials?.length){
    const materials=el('section','world-materials');materials.setAttribute('aria-label','扮演资料 · 仅玩家可见');
    materials.append(el('h3','section-title','扮演资料 · 仅玩家可见'),el('p','beauty-hint','这些资料未作为剧情中 user 已知信息公开，也未发送给模型。以本次确认保存的内容为准，原世界书变化不会自动覆盖。'));
    for(const item of [...draft.roleplayMaterials]){
      const wrap=el('div','world-entry'),label=el('label','profile-label',`${item.world} · #${item.uid} · ${item.title||'无标题'}`),content=el('textarea');
      content.setAttribute('aria-label',`扮演资料 ${item.world} #${item.uid}`);content.rows=6;content.value=item.content;
      content.oninput=()=>{item.content=content.value;item.confirmedAt=new Date().toISOString();};label.append(content);
      const trace=el('details'),summary=el('summary','','来源追踪');trace.append(summary,el('p','profile-source',`源条目指纹：${item.fingerprint}\n选定时间：${item.confirmedAt}`));
      wrap.append(label,trace,button('移除此关联资料',()=>{draft.roleplayMaterials=draft.roleplayMaterials!.filter(value=>value!==item);wrap.remove();}));materials.append(wrap);
    }scroll.append(materials);
  }
  const presetLabel=el('label','profile-label','开局关系'), preset=el('select');preset.setAttribute('aria-label','开局关系');
  [['friend','已经是好友'],['known','认识，但还没有加好友'],['stranger','尚不认识，跟随剧情发展']].forEach(([v,t])=>{const o=el('option','',t);o.value=v;preset.append(o);});
  preset.value=draft.relation.friend?'friend':draft.relation.known?'known':'stranger';presetLabel.append(preset);
  const knowsLabel=el('label','profile-label','开局已经知道对方账号'), knows=el('input');knows.type='checkbox';knows.setAttribute('aria-label','开局已经知道对方账号');knowsLabel.append(knows);
  function relationship(){const friend=preset.value==='friend',known=preset.value!=='stranger';knowsLabel.hidden=preset.value!=='known';draft.relation={friend,known,accountKnown:friend||(known&&knows.checked)};}
  knows.checked=draft.relation.accountKnown; preset.onchange=relationship;knows.onchange=relationship;relationship();
  scroll.append(presetLabel,knowsLabel,el('p','beauty-hint','这里只登记开局状态，不发送申请、不自动产生聊天。'));
  const preview=el('div','profile-avatar-editor'), avatar=el('button','profile-avatar'), avatarStatus=el('p','beauty-hint','点击头像可选择本地图片');
  avatar.type='button';avatar.setAttribute('aria-label','更换联系人头像');
  preview.append(avatar,avatarStatus);scroll.prepend(preview);
  let revision=0, busy=false, saving=false;
  const current=()=>options.active() && page.isConnected;
  function renderAvatar(){avatar.replaceChildren();avatar.textContent=name.input.value.slice(0,1)||'人';const source=host.avatar(draft);if(!source)return;
    const image=el('img');image.alt='联系人头像预览';image.referrerPolicy='no-referrer';image.src=source;
    image.onerror=()=>{if(!current())return;image.remove();avatarStatus.textContent='头像加载失败，已回退文字占位；可以恢复默认头像';};avatar.append(image);
  }
  const uploadLabel=el('label','profile-label','上传头像'), upload=el('input');upload.type='file';upload.accept='image/png,image/jpeg,image/webp';upload.setAttribute('aria-label','上传头像');uploadLabel.append(upload);
  avatar.onclick=()=>upload.click();
  upload.onchange=()=>{const file=upload.files?.[0];upload.value='';if(!file)return;const ticket=++revision;busy=true;save.disabled=true;avatarStatus.textContent='正在本机处理头像…';
    void readDecoration(file,document).then(value=>{if(!current()||ticket!==revision)return;draft.avatar={kind:'upload',value};avatarStatus.textContent='头像已预览，保存资料后保留';renderAvatar();})
      .catch(error=>{if(current()&&ticket===revision)avatarStatus.textContent=String(error.message||'头像无法读取');})
      .finally(()=>{if(current()&&ticket===revision){busy=false;save.disabled=false;}});
  };
  const url=field('头像图片 URL','',2048);url.input.type='url';
  const applyUrl=button('加载此头像 URL',()=>{
    let source:string;try{source=validateAvatarUrl(url.input.value);}catch{avatarStatus.textContent='请输入有效的 HTTP(S) 图片 URL';return;}
    const ticket=++revision;busy=true;save.disabled=true;avatarStatus.textContent='正在加载你指定的图片…';
    const image=el('img');image.referrerPolicy='no-referrer';
    image.onload=()=>{if(!current()||ticket!==revision)return;busy=false;save.disabled=false;
      if(image.naturalWidth>4096||image.naturalHeight>4096){avatarStatus.textContent='图片尺寸请不超过4096×4096';return;}
      draft.avatar={kind:'url',value:source};avatarStatus.textContent='外链头像已预览，保存后保留地址';renderAvatar();};
    image.onerror=()=>{if(!current()||ticket!==revision)return;busy=false;save.disabled=false;avatarStatus.textContent='外链加载失败，保留原头像；未保存失败地址';};image.src=source;
  });
  const resetAvatar=()=>{revision++;busy=false;save.disabled=false;draft.avatar={kind:'default',value:''};avatarStatus.textContent='默认头像已预览，保存后保留';renderAvatar();};
  scroll.append(uploadLabel,url.label,applyUrl,el('p','beauty-hint','仅加载你明确指定的外链，图片站点会收到请求；本地上传不会离开浏览器。'),button('恢复默认头像',resetAvatar),button('恢复联系人默认',()=>{remark.input.value='';resetAvatar();}));
  const status=el('p','beauty-status');status.setAttribute('role','status');
  const save=button(options.draftOnly?'确认此人物草稿':'保存联系人',()=>{if(busy||saving)return;saving=true;draft.name=name.input.value.trim();draft.remark=remark.input.value.trim();draft.description=description.input.value.trim();draft.account=account.input.value.trim();relationship();save.disabled=true;status.textContent=options.draftOnly?'正在检查人物草稿…':'正在确认存档并保存…';
    const fields=scroll.querySelectorAll<HTMLInputElement|HTMLButtonElement|HTMLSelectElement|HTMLTextAreaElement>('input,button,select,textarea');fields.forEach(field=>field.disabled=true);
    void options.save(structuredClone(draft)).then(()=>{if(current())status.textContent=options.draftOnly?'草稿已确认，尚未保存到通讯录':'联系人已保存到本机';}).catch(error=>{if(current())status.textContent=error.message||'保存失败';}).finally(()=>{saving=false;if(current()){save.disabled=false;fields.forEach(field=>field.disabled=false);}});});
  page.oninput=()=>{status.textContent='资料已修改，尚未保存';};
  const actions=el('div','beauty-actions');actions.append(save,button('取消资料修改',options.back));page.append(header,scroll,actions,status);
  renderAvatar();return page;
}
