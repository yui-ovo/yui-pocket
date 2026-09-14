/** Every listener has an explicit remover, including across iframe realms. No timers. */
export function createLifetime() {
  const removers: (() => void)[] = [];
  let disposed = false;
  return {
    listen(target: EventTarget, type: string, handler: EventListener) {
      if (disposed) return;
      target.addEventListener(type, handler);
      removers.push(() => target.removeEventListener(type, handler));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const remove of removers.splice(0).reverse()) remove();
    },
  };
}
