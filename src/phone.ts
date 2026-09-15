import { createDemo, type DemoMessage } from './demo';
import { createLifetime } from './lifetime';
import css from './phone.css';
import skinCss from './phone.skin.css';
import messageIcon from './assets/message-icon.jpg';
import bandageSticker from './assets/lace-bandage.png';
import haloCutout from './assets/halo-transparent.png';
import { appearanceStorage, corners, imageSource } from './appearance';
import { createBeautify } from './beautify';
import beautyIcon from './assets/stickers/bow.png';
import { createProfileHost } from './profile-host';
import { createDirectory } from './directory';
import { createReading } from './reading';
import { messageView } from './message-view';
import { createChatControls } from './chat-controls';
import { createTheme } from './theme';

export function mountPhone(document: Document, root: HTMLElement): () => void {
  const shadow = root.attachShadow({ mode: 'open' });
  const lifetime = createLifetime();
  const demo = createDemo();
  const profiles = createProfileHost(document.defaultView!);
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
  style.textContent = css + skinCss;
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
        if (value.image === 'halo') node.append(sticker('corner-halo',haloCutout));
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
    wallpaperArt.append(sticker('wallpaper-sticker',haloCutout), element('span', 'wallpaper-word', 'dear little days'), element('span', 'wallpaper-sub', '♡  Yui  ♡'));
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
    const chatPage = element('div', 'chat-page');
    chatPage.hidden = true;
    const back = button('back', '‹ 信息', '返回信息列表');
    const header = element('header', 'contact chat-header');
    const more = button('chat-more', '⋯', '打开聊天设置');
    const identity = button('identity profile-name', '', '打开演示人物资料');
    identity.append(element('h2', '', '小桃'), element('p', '', '虚构联系人 · 示例聊天'));
    header.append(back, identity, more);
    const log = element('div', 'messages');
    log.setAttribute('role', 'log');
    log.setAttribute('aria-label', '演示消息');
    log.setAttribute('aria-live', 'polite');
    log.setAttribute('aria-relevant', 'additions');
    log.tabIndex = 0;
    log.append(element('p', 'day-label', '一段虚构的小日常'));
    function renderMessage(message: DemoMessage) {
      const meta = message.sample ? `${message.sender === 'self' ? '我' : '小桃'} · 预置示例` : '我 · 仅本次演示';
      const row = messageView(document,message.sender,message.text,{name:message.sender==='self'?'我':'小桃'},meta,message.time);
      row.dataset.messageId = message.id;
      log.append(row);
    }
    demo.list().forEach(renderMessage);
    const { container, form, input, send, status } = createChatControls(document, true);
    chatPage.append(header, log, container);
    const beauty = createBeautify(document, {
      get: () => appearance,
      change: value => { appearance = value; applyAppearance(); },
      save: () => storage.save(appearance), reset: () => storage.clear(), back: showHome,
    });
    let readingBack: () => void = showHome;
    const reading = createReading(document, panel, () => { reading.page.hidden = true; directory.page.hidden = false; readingBack(); });
    const theme = createTheme(document,panel);
    const directory = createDirectory(document, profiles, {
      home: showHome, demo: showMessages,
      theme: back => { directory.leave(); homePage.hidden=chatPage.hidden=true; theme.open(back); },
      demoPreview: () => { const latest=demo.list().at(-1);return latest ? `${latest.sender==='self'?'我：':''}${latest.text}` : '暂无演示消息'; },
      reading: (back,target) => { readingBack=back; directory.leave(); chatPage.hidden=true; reading.open(target); },
      useReading: target => reading.use(target),
    });
    const stopProfileChanges=profiles.subscribe(()=>{if(!theme.page.hidden){theme.cancel();showContacts();}if(!reading.page.hidden){reading.cancelPreview();showContacts();}});
    screen.append(brand, notice, homePage, chatPage, beauty.page, directory.page, reading.page, theme.page);
    const bottom = element('div', 'shell-bottom');
    const home = button('home', '', 'Home · 返回主屏幕');
    home.append(element('span', 'home-square'));
    bottom.append(home);
    panel.append(sideKeys, shellTop, close, screen, bottom, decorations);
    shadow.append(panel);
    launcher.hidden = true;
    launcher.setAttribute('aria-expanded', 'true');

    function closeNow(restoreFocus = true) {
      theme.cancel();
      panelLife.dispose();
      beauty.dispose();
      directory.dispose();
      stopProfileChanges();
      panel.remove();
      closePanel = undefined;
      launcher.hidden = false;
      launcher.setAttribute('aria-expanded', 'false');
      if (restoreFocus && !disposed) launcher.focus({ preventScroll: true });
    }
    closePanel = () => closeNow(false);
    function showHome() {
      theme.cancel();
      directory.leave(); reading.cancelPreview();
      beauty.page.hidden = true;
      chatPage.hidden = true;
      homePage.hidden = false;
      messagesApp.focus({ preventScroll: true });
    }
    function showContacts() {
      theme.cancel();
      directory.leave(); reading.cancelPreview();
      beauty.page.hidden = true;
      homePage.hidden = true;
      chatPage.hidden = true;
      void directory.enter('messages');
    }
    function showMessages() {
      theme.cancel();
      directory.leave(); reading.cancelPreview();
      reading.use();
      beauty.page.hidden = true;
      homePage.hidden = true;
      chatPage.hidden = false;
      back.focus({ preventScroll: true });
      log.scrollTop = log.scrollHeight;
    }
    panelLife.listen(close, 'click', () => closeNow());
    panelLife.listen(home, 'click', showHome);
    panelLife.listen(back, 'click', showContacts);
    panelLife.listen(messagesApp, 'click', showContacts);
    const showDemoProfile=()=>{chatPage.hidden=true;directory.demoProfile(showMessages);};
    panelLife.listen(more,'click',()=>{chatPage.hidden=true;directory.demoSettings(showMessages);});panelLife.listen(identity,'click',showDemoProfile);
    panelLife.listen(beautyApp, 'click', () => {
      theme.cancel();
      directory.leave(); reading.cancelPreview();
      homePage.hidden = chatPage.hidden = true;
      beauty.page.hidden = false; beauty.focus();
    });
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
    profiles.dispose();
    lifetime.dispose();
    demo.clear();
    shadow.replaceChildren();
  };
}
