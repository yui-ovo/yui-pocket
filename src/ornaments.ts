let sequence = 0;

/** Original vector decorations, built as inert SVG nodes; no image/HTML parsing. */
export function ornament(document: Document, kind: 'charm' | 'bow' | 'wings') {
  const id = `${kind}-${++sequence}`;
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('viewBox', kind === 'charm' ? '0 0 100 300' : '0 0 160 90');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', `ornament ornament-${kind}`);
  function shape(tag: string, attributes: Record<string, string>, parent: Element = svg) {
    const node = document.createElementNS(namespace, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    parent.append(node);
    return node;
  }
  const defs = shape('defs', {});
  const pearl = shape('radialGradient', { id: `rp-pearl-${id}`, cx: '30%', cy: '25%', r: '75%' }, defs);
  shape('stop', { offset: '0', 'stop-color': '#fffefa' }, pearl);
  shape('stop', { offset: '.48', 'stop-color': '#f8e5e9' }, pearl);
  shape('stop', { offset: '1', 'stop-color': '#bd95a5' }, pearl);
  const ribbon = shape('linearGradient', { id: `rp-ribbon-${id}`, x2: '.8', y2: '1' }, defs);
  shape('stop', { offset: '0', 'stop-color': '#fff9f9' }, ribbon);
  shape('stop', { offset: '.45', 'stop-color': '#eac2d4' }, ribbon);
  shape('stop', { offset: '.65', 'stop-color': '#fff0f4' }, ribbon);
  shape('stop', { offset: '1', 'stop-color': '#c994b0' }, ribbon);
  const path = (d: string, fill = `url(#rp-ribbon-${id})`, stroke = '#bb91a7', parent: Element = svg) =>
    shape('path', { d, fill, stroke, 'stroke-width': '1.2', 'stroke-linejoin': 'round' }, parent);
  function bow(parent: Element) {
    path('M76 40 C48 11 14 8 13 28 L16 64 Q43 72 76 47 M84 40 C112 11 146 8 147 28 L144 64 Q117 72 84 47', undefined, undefined, parent);
    path('M70 47 Q56 61 45 85 L64 79 L76 87 L82 47 M88 47 Q104 62 116 85 L96 78 L84 87 L78 47', undefined, undefined, parent);
    path('M24 32 Q48 29 72 43 M27 58 Q48 52 72 46 M136 32 Q112 29 88 43 M133 58 Q112 52 88 46', 'none', '#fff8fa', parent);
    shape('rect', { x: '73', y: '34', width: '15', height: '20', rx: '5', fill: `url(#rp-pearl-${id})`, stroke: '#c49aad' }, parent);
  }
  if (kind === 'bow') bow(svg);
  if (kind === 'wings') {
    path('M64 43 Q39 25 5 28 Q14 41 30 44 L14 47 Q25 59 40 56 L29 63 Q47 69 66 52', '#fffaf9', '#cbb2bf');
    path('M96 43 Q121 25 155 28 Q146 41 130 44 L146 47 Q135 59 120 56 L131 63 Q113 69 94 52', '#fffaf9', '#cbb2bf');
    path('M80 69 C69 59 52 49 58 35 C64 23 77 27 80 35 C85 24 99 25 103 36 C108 49 91 62 80 69');
    path('M67 37 Q73 31 77 38', 'none', '#fff');
    shape('ellipse', { cx: '80', cy: '13', rx: '17', ry: '5', fill: 'none', stroke: '#bca6af', 'stroke-width': '2' });
  }
  if (kind === 'charm') {
    path('M71 8 C28 -5 22 58 54 72 C84 50 87 18 71 8', 'none', '#b6a4af');
    path('M68 10 C32 3 28 52 53 68', 'none', '#fffafa');
    const ribbonGroup = shape('g', { transform: 'translate(6 57) scale(.53)' });
    bow(ribbonGroup);
    path('M45 94 Q7 150 34 227 M57 96 Q94 153 69 211', 'none', '#b5a2ad');
    for (const [x, y, radius] of [[38,110,5],[30,125,8],[26,144,5],[24,161,8],[27,181,5],[29,201,7],[33,219,4],[64,111,6],[72,129,5],[78,147,8],[79,168,5],[76,187,7],[71,204,4]]) {
      shape('circle', { cx: `${x}`, cy: `${y}`, r: `${radius}`, fill: `url(#rp-pearl-${id})`, stroke: '#d7bbc7', 'stroke-width': '.8' });
    }
    path('M35 272 C20 259 3 244 11 232 C18 221 32 225 35 235 C41 221 56 224 60 235 C65 249 48 264 35 272', '#efd8e6', '#b3a2ad');
    path('M35 262 C23 252 13 243 18 236 C23 229 32 234 35 241 C41 230 51 231 53 239 C55 247 43 257 35 262', '#f6e6ee', '#fffafc');
    path('M72 210 L78 225 L94 228 L82 239 L85 255 L71 247 L57 255 L60 239 L48 228 L65 226 Z', '#f4eaf1', '#b1a3b2');
    shape('circle', { cx: '35', cy: '282', r: '6', fill: `url(#rp-pearl-${id})` });
  }
  return svg;
}
