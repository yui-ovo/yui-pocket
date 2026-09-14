import { createDemo, type DemoMessage } from './demo';
import { createLifetime } from './lifetime';
import css from './phone.css';
import messageIcon from './assets/message-icon.jpg';
import bandageSticker from './assets/lace-bandage.png';
import { appearanceStorage, corners, imageSource } from './appearance';
import { createBeautify } from './beautify';
import beautyIcon from './assets/stickers/bow.png';

export function mountPhone(document: Document, root: HTMLElement): () => void {
  const shadow = root.attachShadow({ mode: 'open' });
  const lifetime = createLifetime();
  const demo = createDemo();
  const storage = appearanceStorage(document.defaultView!);
  let appearance = storage.load();
  let closePanel: (() => void) | undefined;
  let disposed = false;

  function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(className: string, text: string, label: string) {
    const node = element('button', className, text);
    node.type = 'button';
    node.setAttribute('aria-label', label);
    return node;
  }
  function sticker(className: string, source = bandageSticker) {
    const wrapper = element('span', `lace-sticker ${className}`);
    wrapper.setAttribute('aria-hidden', 'true');
    const image = element('img', 'sticker-image');
    image.src = source;
    image.alt = '';
    image.draggable = false;
    wrapper.append(image);
    return wrapper;
  }
  const style = element('style', '');
  style.textContent = css;
  const launcher = button('launcher', '', '打开 Yui 演示手机');
  launcher.title = 'Yui · 演示手机';
  launcher.setAttribute('aria-expanded', 'false');
  launcher.setAttribute('aria-controls', 'yui-pocket-dialog');
  const mini = element('span', 'mini-phone', '♡');
  mini.setAttribute('aria-hidden', 'true');
  launcher.append(mini, element('span', 'launcher-label', 'Yui'));
  shadow.append(style, launcher);

  function open() {
    if (disposed || closePanel) return;
    const panelLife = createLifetime();
    const panel = element('section', 'phone');
    panel.id = 'yui-pocket-dialog';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-label', 'Yui 演示手机');
    panel.tabIndex = -1;
    const shellTop = element('div', 'shell-top');
    shellTop.setAttribute('aria-hidden', 'true');
    shellTop.append(element('span', 'sensor'), element('span', 'camera'), element('span', 'speaker'));
    const charm = element('div', 'charm');
    charm.setAttribute('aria-hidden', 'true');
    const strapImage = element('img', 'strap-image');
    strapImage.alt = '';
    strapImage.draggable = false;
    charm.append(strapImage);
    const decorations = element('div', 'decoration-layer');
    decorations.setAttribute('aria-hidden', 'true');
    const anchor = element('span', 'strap-anchor');
    const cornerNodes = corners.map(corner => {
      const node = element('span', `corner-sticker ${corner}`); node.dataset.corner = corner;
      decorations.append(node); return node;
    });
    decorations.append(anchor, charm);
    function applyAppearance() {
      corners.forEach((corner, i) => {
        const value = appearance.corners[corner], node = cornerNodes[i];
        node.replaceChildren(); node.hidden = value.image === 'none'; node.dataset.asset = value.image.startsWith('data:') ? 'custom' : value.image;
        node.style.transform = `translate(${value.offsetX}px, ${value.offsetY}px) rotate(${value.angle}deg) scale(${value.size / 100})`;
        if (value.image === 'halo') node.append(sticker('corner-halo'));
        else {
          const source = imageSource(value.image);
          if (source) { const image = element('img', 'corner-image'); image.src = source; image.alt = ''; image.draggable = false; node.append(image); }
        }
      });
      const value = appearance.strap;
      const source = imageSource(value.image);
      charm.hidden = anchor.hidden = !source;
      if (source) strapImage.src = source;
      decorations.dataset.side = value.side;
      panel.dataset.strapSide = value.side;
      charm.style.setProperty('--strap-scale', String(value.size / 100));
      charm.style.setProperty('--strap-angle', `${value.angle}deg`);
    }
    applyAppearance();
    const close = button('close', '×', '关闭手机');
    const sideKeys = element('div', 'side-keys');
    sideKeys.setAttribute('aria-hidden', 'true');
    sideKeys.append(element('i', 'mute'), element('i', 'volume'), element('i', 'volume'));
    const screen = element('div', 'screen');
    const brand = element('div', 'brand');
    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    brand.append(element('span', 'carrier', 'Yui ♡'), element('span', 'clock', time), element('span', 'battery'));
    brand.title = '装饰状态栏 · 时间为打开时刻，不代表真实信号或电量';
    const notice = element('p', 'demo-notice', '演示模式：不调用 AI，不保存聊天');
    const homePage = element('div', 'home-page');
    homePage.setAttribute('aria-label', '手机主屏幕');
    const wallpaperArt = element('div', 'wallpaper-art');
    wallpaperArt.setAttribute('aria-hidden', 'true');
    wallpaperArt.append(sticker('wallpaper-sticker'), element('span', 'wallpaper-word', 'dear little days'), element('span', 'wallpaper-sub', '♡  Yui  ♡'));
    const messagesApp = button('app-icon', '', '打开信息');
    const icon = element('img', 'envelope-icon');
    icon.src = messageIcon;
    icon.alt = '';
    icon.draggable = false;
    messagesApp.append(icon, element('span', 'app-label', '信息'));
    const dock = element('div', 'dock');
    dock.setAttribute('aria-label', '常用应用 Dock');
    dock.append(messagesApp);
    const beautyApp = button('app-icon beauty-app', '', '打开美化');
    const beautyImage = element('img', 'envelope-icon'); beautyImage.src = beautyIcon; beautyImage.alt = ''; beautyImage.draggable = false;
    beautyApp.append(beautyImage, element('span', 'app-label', '美化'));
    dock.append(beautyApp);
    homePage.append(wallpaperArt, element('div', 'page-dots', '●'), dock);
    const contactsPage = element('div', 'contacts-page');
    contactsPage.setAttribute('aria-label', '联系人列表');
    contactsPage.hidden = true;
    const contactsHeader = element('header', 'contact contacts-header');
    const contactsBack = button('back', '‹ 主屏', '返回主屏幕');
    contactsHeader.append(contactsBack, element('h2', '', '信息'));
    const contactList = element('div', 'contact-list');
    const contactRow = button('contact-row', '', '打开与小桃的聊天');
    const contactCopy = element('span', 'contact-copy');
    const preview = element('span', 'contact-preview');
    contactCopy.append(element('strong', '', '小桃'), preview);
    contactRow.append(element('span', 'list-avatar', '桃'), contactCopy, element('span', 'contact-meta', '示例'), element('span', 'chevron', '›'));
    contactList.append(contactRow);
    contactsPage.append(contactsHeader, contactList, element('p', 'contacts-footnote', '1 位虚构联系人'));
    const chatPage = element('div', 'chat-page');
    chatPage.hidden = true;
    const back = button('back', '‹ 信息', '返回联系人列表');
    const header = element('header', 'contact');
    const avatar = element('div', 'avatar', '桃');
    avatar.setAttribute('aria-hidden', 'true');
    const identity = element('div', 'identity');
    identity.append(element('h2', '', '小桃'), element('p', '', '虚构联系人 · 示例聊天'));
    header.append(back, identity, avatar);
    const log = element('div', 'messages');
    log.setAttribute('role', 'log');
    log.setAttribute('aria-label', '演示消息');
    log.setAttribute('aria-live', 'polite');
    log.setAttribute('aria-relevant', 'additions');
    log.tabIndex = 0;
    log.append(element('p', 'day-label', '一段虚构的小日常'));
    function renderMessage(message: DemoMessage) {
      const row = element('div', `message ${message.sender}`);
      row.dataset.messageId = message.id;
      const meta = message.sample ? `${message.sender === 'self' ? '我' : '小桃'} · 预置示例` : '我 · 仅本次演示';
      row.append(element('span', 'message-meta', meta), element('p', 'bubble', message.text));
      log.append(row);
    }
    demo.list().forEach(renderMessage);
    const form = element('form', 'composer');
    const label = element('label', 'sr-only', '演示消息输入框');
    label.htmlFor = 'rp-message-input';
    const input = element('textarea', 'message-input');
    input.id = 'rp-message-input';
    input.rows = 2;
    input.maxLength = 2000;
    input.placeholder = '写一条小消息…';
    input.setAttribute('enterkeyhint', 'enter');
    const send = element('button', 'send', '发送');
    send.type = 'submit';
    send.disabled = true;
    form.append(label, input, send);
    const status = element('p', 'status', '只添加你的气泡，不会产生回复');
    status.setAttribute('role', 'status');
    chatPage.append(header, log, form, status);
    const beauty = createBeautify(document, {
      get: () => appearance,
      change: value => { appearance = value; applyAppearance(); },
      save: () => storage.save(appearance), reset: () => storage.clear(), back: showHome,
    });
    screen.append(brand, notice, homePage, contactsPage, chatPage, beauty.page);
    const bottom = element('div', 'shell-bottom');
    const home = button('home', '', 'Home · 返回主屏幕');
    home.append(element('span', 'home-square'));
    bottom.append(home);
    panel.append(sideKeys, shellTop, close, screen, bottom, decorations);
    shadow.append(panel);
    launcher.hidden = true;
    launcher.setAttribute('aria-expanded', 'true');

    function closeNow(restoreFocus = true) {
      panelLife.dispose();
      beauty.dispose();
      panel.remove();
      closePanel = undefined;
      launcher.hidden = false;
      launcher.setAttribute('aria-expanded', 'false');
      if (restoreFocus && !disposed) launcher.focus({ preventScroll: true });
    }
    closePanel = () => closeNow(false);
    function showHome() {
      beauty.page.hidden = true;
      chatPage.hidden = true;
      contactsPage.hidden = true;
      homePage.hidden = false;
      messagesApp.focus({ preventScroll: true });
    }
    function showContacts() {
      beauty.page.hidden = true;
      homePage.hidden = true;
      chatPage.hidden = true;
      contactsPage.hidden = false;
      const latest = demo.list().at(-1);
      preview.textContent = latest ? `${latest.sender === 'self' ? '我：' : ''}${latest.text}` : '暂无演示消息';
      contactRow.focus({ preventScroll: true });
    }
    function showMessages() {
      beauty.page.hidden = true;
      homePage.hidden = true;
      contactsPage.hidden = true;
      chatPage.hidden = false;
      back.focus({ preventScroll: true });
      log.scrollTop = log.scrollHeight;
    }
    panelLife.listen(close, 'click', () => closeNow());
    panelLife.listen(home, 'click', showHome);
    panelLife.listen(back, 'click', showContacts);
    panelLife.listen(contactsBack, 'click', showHome);
    panelLife.listen(messagesApp, 'click', showContacts);
    panelLife.listen(beautyApp, 'click', () => {
      homePage.hidden = contactsPage.hidden = chatPage.hidden = true;
      beauty.page.hidden = false; beauty.focus();
    });
    panelLife.listen(contactRow, 'click', showMessages);
    panelLife.listen(panel, 'keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeNow();
      }
    });
    panelLife.listen(input, 'input', () => { send.disabled = !input.value.trim(); });
    panelLife.listen(form, 'submit', (event) => {
      event.preventDefault();
      const message = demo.send(input.value);
      if (!message) return;
      renderMessage(message);
      input.value = '';
      send.disabled = true;
      status.textContent = '已添加到本次演示 · 不保存，也不会回复';
      log.scrollTop = log.scrollHeight;
      input.focus({ preventScroll: true });
    });
    // Avoid opening the software keyboard just to inspect the phone.
    close.focus({ preventScroll: true });
    log.scrollTop = log.scrollHeight;
  }
  lifetime.listen(launcher, 'click', open);
  return () => {
    if (disposed) return;
    disposed = true;
    closePanel?.();
    lifetime.dispose();
    demo.clear();
    shadow.replaceChildren();
  };
}
