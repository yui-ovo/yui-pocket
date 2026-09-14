import { ui } from './ui';
import { messageView, type MessageIdentity } from './message-view';
export type Reading = { version: 1; showAvatar: boolean; avatarSize: number; radius: number; fontSize: number; lineHeight: number };
export type ReadingTarget = { key: string; identity: MessageIdentity; active(): boolean };
type Settings = { version: 2; global: Reading; contacts: Record<string,Reading> };
const defaults = (): Reading => ({ version: 1, showAvatar: true, avatarSize: 36, radius: 50, fontSize: 14, lineHeight: 1.65 });
const KEY='yui-pocket.reading.v2', LEGACY='yui-pocket.reading.v1';
function normalize(raw: Partial<Reading>): Reading {
  const next=defaults();if(!raw||raw.version!==1)return next;
  next.showAvatar=typeof raw.showAvatar==='boolean'?raw.showAvatar:true;
  for(const [key,min,max] of [['avatarSize',24,64],['radius',0,50],['fontSize',12,24],['lineHeight',1.2,2.4]] as const){const value=raw[key];if(typeof value==='number'&&Number.isFinite(value))next[key]=Math.max(min,Math.min(max,value));}
  return next;
}
export function createReading(document: Document,panel:HTMLElement,back:()=>void){
  const {el,button}=ui(document);
  let settings:Settings={version:2,global:defaults(),contacts:{}},loadError='';
  function load(){
    try{
      const raw=document.defaultView!.localStorage.getItem(KEY);
      if(!raw){const old=document.defaultView!.localStorage.getItem(LEGACY);settings={version:2,global:old?normalize(JSON.parse(old)):defaults(),contacts:{}};loadError='';return;}
      const value=JSON.parse(raw);
      if(value.version!==2||!value.global||!value.contacts||typeof value.contacts!=='object'||Array.isArray(value.contacts))throw new Error();
      settings={version:2,global:normalize(value.global),contacts:Object.fromEntries(Object.entries(value.contacts).map(([key,value])=>[key,normalize(value as Reading)]))};loadError='';
    }catch{loadError='外观设置无法读取，已停止覆盖保存；仍可预览。';}
  }
  load();let current:ReadingTarget|undefined,editing:ReadingTarget|undefined,draft={...settings.global},inherit=false;
  const page=el('section','workspace-page reading-page');page.hidden=true;page.setAttribute('aria-label','聊天外观');
  const header=el('header','contact workspace-header');header.append(button('‹ 返回',cancel,'back'),el('strong','','聊天外观'));
  const scroll=el('div','profile-scroll'),status=el('p','reading-status');status.setAttribute('role','status');
  const preview=el('div','reading-preview'),previewLog=el('div','preview-messages');preview.setAttribute('aria-label','样式预览');preview.append(el('p','beauty-hint','样式预览 · 虚构对话，不保存消息'),previewLog);scroll.append(preview);
  const scopeLabel=el('label','profile-label','应用范围'),scope=el('select');scope.setAttribute('aria-label','应用范围');scopeLabel.append(scope);scroll.append(scopeLabel);
  const hint=el('p','beauty-hint');scroll.append(hint);
  const toggle=el('input');toggle.type='checkbox';toggle.setAttribute('aria-label','显示消息头像');const label=el('label','profile-label','显示消息头像');label.append(toggle);scroll.append(label);
  const controls:{key:'avatarSize'|'radius'|'fontSize'|'lineHeight';input:HTMLInputElement;output:HTMLOutputElement}[]=[];
  for(const [key,name,min,max,step] of [['avatarSize','消息头像大小',24,64,1],['radius','消息头像圆角',0,50,1],['fontSize','气泡文字大小',12,24,1],['lineHeight','气泡文字行距',1.2,2.4,.05]] as const){
    const label=el('label','beauty-label',name),output=el('output'),input=el('input','beauty-range');input.id=`yui-reading-${key}`;label.htmlFor=input.id;
    input.type='range';input.min=String(min);input.max=String(max);input.step=String(step);input.setAttribute('aria-label',name);
    input.oninput=()=>{inherit=false;draft[key]=Number(input.value);sync();apply(draft);};label.append(output,input);controls.push({key,input,output});scroll.append(label);
  }
  scroll.append(el('p','beauty-hint','圆角只作用于消息头像：0%方形，50%圆形。字号和行距只改变气泡文字；“我”为待接入名片头像的占位。'));
  function canSave(){return !page.hidden&&page.isConnected&&(!editing||editing.active());}
  function write(next:Settings){
    try{const encoded=JSON.stringify(next);document.defaultView!.localStorage.setItem(KEY,encoded);if(document.defaultView!.localStorage.getItem(KEY)!==encoded)throw new Error();settings=next;return true;}
    catch{status.textContent='聊天外观保存失败，请检查本机存储空间';return false;}
  }
  const save=button('保存聊天外观',()=>{
    if(!canSave())return;load();if(loadError){status.textContent=loadError;return;}
    const next=structuredClone(settings);
    if(scope.value==='contact'&&editing){if(inherit)delete next.contacts[editing.key];else next.contacts[editing.key]={...draft};}else{next.global={...draft};next.contacts={};}
    if(write(next))status.textContent='聊天外观已保存到本机';
  });
  const follow=button('跟随所有联系人样式',()=>{if(!editing||!canSave())return;inherit=true;draft={...settings.global};sync();apply(draft);status.textContent='跟随效果已预览，点保存后保留';});scroll.append(follow);
  const actions=el('div','beauty-actions');actions.append(save,button('取消',cancel),button('恢复聊天外观默认',()=>{inherit=false;draft=defaults();sync();apply(draft);status.textContent='默认效果已预览，保存后保留';}));page.append(header,scroll,actions,status);
  function selected(target=current){return target&&settings.contacts[target.key]?settings.contacts[target.key]:settings.global;}
  function apply(value:Reading){panel.dataset.showAvatar=String(value.showAvatar);panel.style.setProperty('--reading-avatar',`${value.avatarSize}px`);panel.style.setProperty('--reading-radius',`${value.radius}%`);panel.style.setProperty('--reading-size',`${value.fontSize}px`);panel.style.setProperty('--reading-line',String(value.lineHeight));}
  function sync(){toggle.checked=draft.showAvatar;controls.forEach(({key,input,output})=>{input.value=String(draft[key]);output.textContent=input.value+(key==='radius'?'%':key==='lineHeight'?'倍':'px');});}
  function scopeChanged(){inherit=false;draft={...(scope.value==='contact'?selected(editing):settings.global)};hint.textContent=scope.value==='contact'?'仅当前存档的此联系人；按稳定身份保存。':'保存到所有联系人将统一样式，覆盖此前的单独设置。';follow.hidden=scope.value!=='contact';sync();apply(draft);}
  function cancel(){apply(selected());back();}
  toggle.onchange=()=>{inherit=false;draft.showAvatar=toggle.checked;apply(draft);};scope.onchange=scopeChanged;apply(settings.global);
  return {page,use(target?:ReadingTarget){current=target;apply(selected());},open(target?:ReadingTarget){
    load();editing=target;current=target;scope.replaceChildren();for(const [value,name] of [...(target?[['contact','当前联系人']]:[]),['all','所有联系人']]){const option=el('option','',name);option.value=value;scope.append(option);}
    previewLog.replaceChildren(messageView(document,'friend','给你留了一朵小花，回来的时候带给你。',target?.identity??{name:'小桃'},'对方 · 样式预览'),messageView(document,'self','好呀，等会儿见 ♡',{name:'我'},'我 · 样式预览'));
    scopeChanged();page.hidden=false;status.textContent=loadError||'实时预览，保存后保留';scroll.scrollTop=0;
  },cancelPreview(){apply(selected());page.hidden=true;editing=undefined;}};
}
