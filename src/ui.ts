export function ui(document: Document) {
  function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string) {
    const node = document.createElement(tag); node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(text: string, action: () => void, className = 'beauty-button') {
    const node = el('button', className, text); node.type = 'button'; node.onclick = action; return node;
  }
  function field(name: string, value: string, maxLength = 80) {
    const label = el('label', 'profile-label', name), input = el('input');
    input.value = value; input.maxLength = maxLength; input.setAttribute('aria-label', name); label.append(input);
    return { label, input };
  }
  return { el, button, field };
}
