import { startInHost } from './host';
import { mountPhone } from './phone';

let dispose: (() => void) | undefined;

export function onEnable() {
  if (dispose) return;
  try {
    dispose = startInHost(window, mountPhone, window);
  } catch {
    console.error('[yui-pocket] 无法挂载演示手机，请刷新页面后重试。');
  }
}

export function onDisable() {
  dispose?.();
  dispose = undefined;
}

export const onActivate = onEnable;
export const onDelete = onDisable;

// Standard module loading also supports hosts that do not implement manifest hooks.
// Those hosts must finish their normal page reload to disable/uninstall the UI.
onEnable();
