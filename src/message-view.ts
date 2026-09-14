import { ui } from './ui';
export type MessageIdentity = { name: string; source?: string };
/** Shared text-only view for the ephemeral demo and explicitly labelled style preview. */
export function messageView(document: Document, sender: 'friend'|'self', text: string, identity: MessageIdentity, meta: string, time = '15:38') {
  const { el } = ui(document);
  const row = el('div', `message ${sender}`), avatar = el('span','message-avatar',identity.name.slice(0,1));
  avatar.setAttribute('role','img');avatar.setAttribute('aria-label',`${identity.name}的消息头像${identity.source?'':'（占位）'}`);
  if(identity.source){const image=el('img');image.alt='';image.referrerPolicy='no-referrer';image.onerror=()=>{image.remove();avatar.title='头像加载失败，已回退占位';};image.src=identity.source;avatar.append(image);}
  const side=el('div','message-side');side.append(avatar,el('span','message-time',time));
  const copy=el('div','message-copy');copy.append(el('span','message-meta',meta),el('p','bubble',text));row.append(side,copy);return row;
}
