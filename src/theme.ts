import { ui } from './ui';
import { themeStorage, type Theme } from './appearance';

/** Theme previews are panel-local; only an explicit save writes the owned theme key. */
export function createTheme(document: Document, panel: HTMLElement) {
  const {el,button}=ui(document),storage=themeStorage(document.defaultView!);
  let saved=storage.load(),draft=saved,back=()=>{};
  const page=el('section','workspace-page theme-page');page.hidden=true;page.setAttribute('aria-label','主题美化');
  const apply=(value:Theme)=>{panel.dataset.theme=value;};apply(saved);
  const cancel=()=>{draft=saved;apply(saved);page.hidden=true;};
  const exit=()=>{cancel();back();};
  const header=el('header','contact workspace-header');header.append(button('‹ 返回',exit,'back'),el('h2','','主题美化'));
  const scroll=el('div','profile-scroll');scroll.append(el('p','beauty-hint','整部 Yui 的颜色，包括主屏、列表、聊天和设置。贴纸与头像保留原色。'));
  const choices=el('div','theme-choices'),buttons:HTMLButtonElement[]=[];
  const status=el('p','theme-status');status.setAttribute('role','status');
  const sync=()=>buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themeChoice===draft)));
  for(const [id,label,note] of [['gray','浅灰','两侧气泡统一浅灰'],['pink','浅嫩粉','柔和粉色界面与气泡'],['night','夜间黑','深色背景与清晰文字']] as const){
    const b=button('',()=>{draft=id;apply(draft);sync();status.textContent='正在预览，保存后下次打开仍使用此主题。';},'theme-choice');
    b.dataset.themeChoice=id;b.setAttribute('aria-label',label);b.append(el('span','theme-swatch'),el('strong','',label),el('small','',note));buttons.push(b);choices.append(b);
  }
  scroll.append(choices);
  const actions=el('div','beauty-actions');
  actions.append(button('保存主题',()=>{if(storage.save(draft)){saved=draft;status.textContent='主题已保存';}else status.textContent='保存失败，请重试；未保存的预览可取消。';},'beauty-button'),button('取消',exit,'beauty-button'),button('恢复默认',()=>{draft='gray';apply(draft);sync();status.textContent='已预览默认浅灰，点击保存后生效。';},'beauty-button'));
  page.append(header,scroll,actions,status);
  return {page,cancel,open(returnTo:()=>void){back=returnTo;draft=saved;sync();apply(draft);status.textContent='实时预览 · 保存后仅保留在本机';page.hidden=false;}};
}
