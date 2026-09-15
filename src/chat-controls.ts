import { ui } from './ui';

/** Shared composer chrome. Placeholders never open host services or save data. */
export function createChatControls(document: Document, demo: boolean) {
  const { el, button } = ui(document);
  const container = el('div', 'chat-controls');
  const status = el('p', 'status', demo ? '仅本次演示 · 不保存，不会回复' : '聊天尚未接入 · 工具均为占位');
  status.setAttribute('role', 'status');
  function pending(symbol: string, name: string, className: string) {
    const control = button('', () => { status.textContent = `${name}尚未接入，此按钮为占位`; }, className);
    control.setAttribute('aria-label', `${name}（待接入）`);
    control.dataset.placeholder = 'true';
    control.title = `${name} · 待接入`;
    const icon = el('span', `tool-symbol ${symbol}`, symbol === 'camera-symbol' || symbol === 'photo-symbol' ? '' : symbol);
    icon.setAttribute('aria-hidden', 'true');control.append(icon);
    return control;
  }
  const tools = el('div', 'chat-tools');tools.setAttribute('aria-label', '聊天工具 · 待接入');
  for (const [symbol, name] of [['♡', '转账'], ['camera-symbol', '拍照'], ['photo-symbol', '相册'], ['♧', '通话']]) {
    const control = pending(symbol!, name!, 'chat-tool');
    control.append(el('span', '', name), el('small', '', '待接入'));tools.append(control);
  }
  const form = el('form', 'composer');
  const input = el('textarea', 'message-input');input.rows = 1;input.maxLength = 2000;
  input.placeholder = demo ? '写一条小消息…' : '聊天尚未接入';input.disabled = !demo;
  input.setAttribute('aria-label', demo ? '演示消息输入框' : '联系人消息输入框');
  input.setAttribute('enterkeyhint', 'enter');
  const send = el('button', 'send');
  const plane=document.createElementNS('http://www.w3.org/2000/svg','svg');plane.setAttribute('viewBox','0 0 24 24');plane.setAttribute('aria-hidden','true');
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M3 10.5 21 3l-7.5 18-3-7.5L3 10.5Zm7.5 3L21 3');path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','1.6');path.setAttribute('stroke-linejoin','round');plane.append(path);send.append(plane);send.type = 'submit';send.disabled = true;
  send.setAttribute('aria-label', '发送');send.title = demo ? '发送到本次演示' : '聊天尚未接入';
  form.append(pending('mic-symbol', '语音', 'composer-tool'), input,
    pending('smile-symbol', '表情', 'composer-tool'), pending('＋', '更多工具', 'composer-tool'), send);
  // Also prevent the disabled real-contact composer from ever submitting a page.
  if (!demo) form.onsubmit = event => event.preventDefault();
  container.append(tools, form, status);
  return { container, form, input, send, status };
}
