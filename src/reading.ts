import { ui } from './ui';
export type Reading = { version: 1; showAvatar: boolean; avatarSize: number; radius: number; fontSize: number; lineHeight: number };
const defaults = (): Reading => ({ version: 1, showAvatar: true, avatarSize: 36, radius: 22, fontSize: 14, lineHeight: 1.65 });
const KEY = 'yui-pocket.reading.v1';
function normalize(raw: Partial<Reading>): Reading {
  const next = defaults();
  if (raw.version !== 1) return next;
  next.showAvatar = typeof raw.showAvatar === 'boolean' ? raw.showAvatar : true;
  for (const [key, min, max] of [['avatarSize',24,64],['radius',0,50],['fontSize',12,24],['lineHeight',1.2,2.4]] as const) {
    const value = raw[key]; if (typeof value === 'number' && Number.isFinite(value)) next[key] = Math.max(min,Math.min(max,value));
  }
  return next;
}
export function createReading(document: Document, panel: HTMLElement, back: () => void) {
  const { el, button } = ui(document);
  let saved = defaults();
  try { const raw = document.defaultView!.localStorage.getItem(KEY); if (raw) saved = normalize(JSON.parse(raw)); } catch { /* Local preview still works. */ }
  let draft = { ...saved };
  const page = el('section','workspace-page'); page.hidden = true; page.setAttribute('aria-label','阅读设置');
  const header = el('header','contact workspace-header'); header.append(button('‹ 返回', cancel, 'back'),el('strong','','阅读设置'));
  const scroll = el('div','profile-scroll'), status = el('p','reading-status'); status.setAttribute('role','status');
  const toggle = el('input'); toggle.type = 'checkbox'; toggle.setAttribute('aria-label','显示顶部头像');
  const label = el('label','profile-label','显示顶部头像'); label.append(toggle); scroll.append(label);
  const controls: { key: 'avatarSize'|'radius'|'fontSize'|'lineHeight'; input: HTMLInputElement; output: HTMLOutputElement }[] = [];
  for (const [key,name,min,max,step,unit] of [
    ['avatarSize','头像大小',24,64,1,'px'],['radius','头像圆角',0,50,1,'%'],['fontSize','消息字号',12,24,1,'px'],['lineHeight','消息行距',1.2,2.4,.05,'倍'],
  ] as const) {
    const label = el('label','beauty-label',name), output = el('output'), input = el('input','beauty-range');
    input.id = `yui-reading-${key}`; label.htmlFor = input.id;
    input.type = 'range'; input.min = String(min); input.max = String(max); input.step = String(step); input.setAttribute('aria-label',name);
    input.oninput = () => { draft[key] = Number(input.value); output.textContent = input.value + unit; apply(); };
    label.append(output,input); controls.push({key,input,output}); scroll.append(label);
  }
  const preview = el('div','reading-preview'), top = el('div','contact');
  const avatar = el('span','profile-avatar','预'); avatar.dataset.topAvatar = '';
  top.append(el('strong','','阅读效果预览'),avatar); preview.append(top,el('p','reading-bubble','这是一段阅读预览。调整字号和行距，看看是否舒服。\n只影响 Yui 内的信息气泡。'));
  scroll.append(el('p','beauty-hint','圆角0%为方形，50%为圆形。恢复默认仅预览，点保存才保留。'),preview);
  const actions = el('div','beauty-actions'); actions.append(button('保存阅读设置',()=>{
    try { const encoded = JSON.stringify(draft); document.defaultView!.localStorage.setItem(KEY,encoded);
      if(document.defaultView!.localStorage.getItem(KEY)!==encoded) throw new Error(); saved = {...draft}; status.textContent='阅读设置已保存到本机';
    } catch { status.textContent='阅读设置保存失败，请检查本机存储空间'; }
  }),button('取消',cancel),button('恢复阅读默认',()=>{draft=defaults();sync();apply();status.textContent='默认效果已预览，保存后保留';}));
  page.append(header,scroll,actions,status);
  function apply() {
    panel.dataset.showAvatar = String(draft.showAvatar);
    panel.style.setProperty('--reading-avatar',`${draft.avatarSize}px`); panel.style.setProperty('--reading-radius',`${draft.radius}%`);
    panel.style.setProperty('--reading-size',`${draft.fontSize}px`); panel.style.setProperty('--reading-line',String(draft.lineHeight));
  }
  function sync() { toggle.checked=draft.showAvatar; controls.forEach(({key,input,output})=>{input.value=String(draft[key]);output.textContent=input.value+(key==='radius'?'%':key==='lineHeight'?'倍':'px');}); }
  function cancel() { draft={...saved};apply();back(); }
  toggle.onchange=()=>{draft.showAvatar=toggle.checked;apply();}; apply();
  return { page, open(){draft={...saved};sync();apply();page.hidden=false;status.textContent='实时预览，保存后保留';}, cancelPreview(){draft={...saved};apply();page.hidden=true;} };
}
