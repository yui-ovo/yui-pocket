import { createLifetime } from './lifetime';
import { ttHost, ttReady, ttFrame } from './tt-host';

export const ROOT_ID = 'yui-pocket-root';
// Preserve the old private key so upgrading from the previous name disposes that instance.
const INSTANCE = Symbol.for('ruru-pocket.instance.v0.1');
type HostWindow = Window & { [INSTANCE]?: { dispose(): void } };
type ScriptWindow = Window & { $?: (ready: () => void) => unknown };

/** Helper mounts in the parent; the extension explicitly mounts in its own window. */
export function startInHost(source: ScriptWindow, mount: (document: Document, root: HTMLElement) => () => void, target: Window = source.parent) {
  const host = target as HostWindow;
  const document = host.document; // Fails closed on an unsupported cross-origin host.
  const lifetime = createLifetime();
  let dead = false;
  let started = false;
  let root: HTMLElement | undefined;
  let unmount: (() => void) | undefined;
  let unsubscribeLayout: (() => void) | undefined;
  const instance = { dispose };

  function dispose() {
    if (dead) return;
    dead = true;
    lifetime.dispose();
    unsubscribeLayout?.();
    unmount?.();
    root?.remove();
    // An older iframe unloading must never dispose its replacement.
    if (host[INSTANCE] === instance) delete host[INSTANCE];
  }

  function start() {
    if (dead || started) return;
    started = true;
    host[INSTANCE]?.dispose();
    host[INSTANCE] = instance;
    // Only our exact node, never a selector over the chat surface.
    document.getElementById(ROOT_ID)?.remove();
    try {
      if (!document.body) throw new Error('宿主 body 尚不可用');
      root = document.createElement('div');
      root.id = ROOT_ID;
      root.dataset.version = '0.2-step1';
      // Restrict the host hit area to zero; only the visible controls receive pointers.
      const properties: Record<string, string> = {
        all: 'initial', position: 'fixed', top: '0', left: '0', width: '0', height: '0',
        overflow: 'visible', 'pointer-events': 'none', 'z-index': '10000',
      };
      for (const [name, value] of Object.entries(properties)) root.style.setProperty(name, value, 'important');
      document.body.append(root);
      unmount = mount(document, root);
      let nativeFrame: ReturnType<typeof ttFrame>;
      const updateViewport = () => {
        const viewport = host.visualViewport;
        const height = nativeFrame?.height ?? viewport?.height ?? host.innerHeight;
        root?.toggleAttribute('data-compact', height < 530);
        root?.style.setProperty('--rp-vh', `${height}px`);
        root?.style.setProperty('--rp-vw', `${nativeFrame?.width ?? viewport?.width ?? host.innerWidth}px`);
        root?.style.setProperty('--rp-top', `${nativeFrame?.top ?? viewport?.offsetTop ?? 0}px`);
        root?.style.setProperty('--rp-left', `${nativeFrame?.left ?? viewport?.offsetLeft ?? 0}px`);
      };
      updateViewport();
      const layout = ttHost(host)?.api?.layout;
      if (layout?.subscribe) {
        root.dataset.ttLayout = 'true';
        try {
          void Promise.resolve(layout.subscribe(snapshot => {
            if (dead) return;
            nativeFrame = ttFrame(snapshot); updateViewport();
          })).then(remove => { if (dead) remove(); else unsubscribeLayout = remove; }).catch(() => {
            if (!dead) { nativeFrame = undefined; updateViewport(); }
          });
        } catch { nativeFrame = undefined; updateViewport(); }
      }
      lifetime.listen(host, 'resize', updateViewport);
      if (host.visualViewport) {
        lifetime.listen(host.visualViewport, 'resize', updateViewport);
        lifetime.listen(host.visualViewport, 'scroll', updateViewport);
      }
    } catch (error) {
      dispose();
      throw error;
    }
  }

  lifetime.listen(source, 'pagehide', dispose);
  // Helper docs require jQuery ready, not DOMContentLoaded, for script initialization.
  const ready = () => {
    const nativeReady = ttReady(host);
    if (nativeReady) void Promise.resolve(nativeReady).then(start).catch(() => {
      if (!dead) console.error('[yui-pocket] TT 宿主未准备好，未挂载；请更新 TT 或刷新重试。');
    });
    else start();
  };
  if (typeof source.$ === 'function') source.$(ready);
  else ready();
  return dispose;
}
