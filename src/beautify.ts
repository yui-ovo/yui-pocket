import { corners, defaults, readDecoration, type Appearance, type Corner } from './appearance';
import { stickers } from './stickers';
import { createLifetime } from './lifetime';

export function createBeautify(document: Document, options: {
  get(): Appearance; change(value: Appearance): void; save(): boolean; reset(): boolean; back(): void;
}) {
  const life = createLifetime();
  let dead = false, revision = 0;
  function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
    const node = document.createElement(tag); node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(text: string, className = 'beauty-button') { const b = el('button', className, text); b.type = 'button'; return b; }
  const page = el('section', 'beautify-page'); page.hidden = true; page.setAttribute('aria-label', '美化设置');
  const header = el('header', 'contact beauty-header');
  const back = button('‹ 主屏', 'back'); back.setAttribute('aria-label', '美化返回主屏幕');
  header.append(back, el('strong', '', '我的装饰盒'));
  const scroll = el('div', 'beauty-scroll');
  const hint = el('p', 'beauty-hint', '选位置 → 选贴纸，实时预览。保存后留在本机。');
  const targetLabel = el('label', 'beauty-label', '装饰位置');
  const target = el('select', 'beauty-select'); target.setAttribute('aria-label', '装饰位置');
  const labels = ['左上', '右上', '左下', '右下', '挂绳'];
  [...corners, 'strap'].forEach((value, i) => { const o = el('option', '', labels[i]); o.value = value; target.append(o); });
  targetLabel.append(target);
  const gallery = el('div', 'sticker-gallery'); gallery.setAttribute('aria-label', '贴纸素材库');
  function choice(id: string, name: string, source?: string) {
    const b = button('', 'sticker-choice'); b.dataset.asset = id; b.setAttribute('aria-label', name); b.title = name;
    if (source) { const img = el('img', ''); img.src = source; img.alt = ''; img.draggable = false; b.append(img); }
    else b.textContent = name;
    gallery.append(b);
  }
  choice('none', '不显示'); choice('default-strap', '原挂绳'); choice('halo', '原光环');
  stickers.forEach(item => choice(item.id, item.name, item.src));
  const uploadLabel = el('label', 'beauty-upload', '导入自己的图片');
  const upload = el('input', ''); upload.type = 'file'; upload.accept = 'image/png,image/jpeg,image/webp'; upload.setAttribute('aria-label', '导入装饰图片');
  uploadLabel.append(upload);
  const sliders: HTMLInputElement[] = [];
  function slider(name: string, key: 'size' | 'angle', min: string, max: string) {
    const label = el('label', 'beauty-label', name);
    const value = el('output', '');
    const input = el('input', 'beauty-range'); input.type = 'range'; input.min = min; input.max = max; input.setAttribute('aria-label', name); input.dataset.field = key;
    label.append(value, input); sliders.push(input);
    life.listen(input, 'input', () => {
      revision++;
      selected()[key] = Number(input.value); options.change(options.get()); sync();
    });
    return label;
  }
  const size = slider('大小', 'size', '60', '130'), angle = slider('旋转', 'angle', '-25', '25');
  const sideLabel = el('label', 'beauty-label', '挂点方向');
  const side = el('select', 'beauty-select'); side.setAttribute('aria-label', '挂点方向');
  for (const [value, text] of [['left', '左侧挂孔'], ['right', '右侧挂孔']]) { const o = el('option', '', text); o.value = value; side.append(o); }
  sideLabel.append(side);
  const status = el('p', 'beauty-status', '仅保存外观，不保存聊天；不上传图片。'); status.setAttribute('role', 'status');
  const actions = el('div', 'beauty-actions');
  const save = button('保存外观'), reset = button('恢复默认'); actions.append(save, reset);
  scroll.append(hint, targetLabel, size, angle, sideLabel, uploadLabel, el('p', 'beauty-hint', '透明 PNG / WebP 效果最好 · 单张不超过 2 MB'), gallery);
  page.append(header, scroll, actions, status);
  function selected() { return target.value === 'strap' ? options.get().strap : options.get().corners[target.value as Corner]; }
  function sync() {
    const value = selected();
    for (const input of sliders) {
      const key = input.dataset.field as 'size' | 'angle';
      input.min = key === 'size' ? '60' : target.value === 'strap' ? '-4' : '-25';
      input.max = key === 'size' ? target.value === 'strap' ? '120' : '130' : target.value === 'strap' ? '4' : '25';
      input.value = String(value[key]);
      input.previousElementSibling!.textContent = input.value + (key === 'size' ? '%' : '°');
    }
    sideLabel.hidden = target.value !== 'strap'; side.value = options.get().strap.side;
    for (const b of gallery.querySelectorAll<HTMLButtonElement>('button')) {
      b.hidden = b.dataset.asset === (target.value === 'strap' ? 'halo' : 'default-strap');
      b.setAttribute('aria-pressed', String(b.dataset.asset === value.image));
    }
  }
  life.listen(back, 'click', options.back);
  life.listen(target, 'change', () => { revision++; sync(); });
  life.listen(side, 'change', () => { revision++; options.get().strap.side = side.value === 'right' ? 'right' : 'left'; options.change(options.get()); });
  life.listen(gallery, 'click', event => {
    const b = (event.target as Element).closest<HTMLButtonElement>('button[data-asset]');
    if (!b) return;
    revision++; selected().image = b.dataset.asset!; options.change(options.get()); sync(); status.textContent = '已预览，点“保存外观”保留设置。';
  });
  life.listen(upload, 'change', () => {
    const file = upload.files?.[0]; upload.value = ''; if (!file) return;
    const ticket = ++revision, destination = selected();
    status.textContent = '正在本机处理图片…';
    void readDecoration(file, document).then(image => {
      if (dead || ticket !== revision) return;
      destination.image = image; options.change(options.get()); sync(); status.textContent = '图片已预览，点“保存外观”保留。';
    }).catch(error => { if (!dead && ticket === revision) status.textContent = error instanceof Error ? error.message : '图片无法读取，请换一张。'; });
  });
  life.listen(save, 'click', () => { status.textContent = options.save() ? '外观已保存在本机，刷新后仍保留。' : '本机保存失败，当前预览仍保留；请检查存储空间或浏览器设置。'; });
  life.listen(reset, 'click', () => { revision++; options.change(defaults()); sync(); status.textContent = options.reset() ? '已恢复默认，并清除本机外观设置。' : '已恢复默认预览，但无法清除本机存储。'; });
  sync();
  return { page, focus() { target.focus({ preventScroll: true }); }, dispose() { dead = true; revision++; life.dispose(); } };
}
