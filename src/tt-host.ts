// Verified TauriTavern 2.2.0 ABI subset; no native invoke, message or metadata APIs.
type Frame = { left: number; top: number; width: number; height: number };
export type TTLayout = { version: number; safeFrame: Frame; ime: { keyboardOffset: number } };
export type TTStore = {
  getJson(options: { namespace: string; key: string }): Promise<unknown>;
  setJson(options: { namespace: string; key: string; value: unknown }, guard?: () => void): Promise<unknown>;
  moveFrom(oldChatId: string): Promise<void>;
};
type NativeStore = Omit<TTStore, 'moveFrom'> & {
  listKeys(options: { namespace: string }): Promise<string[]>;
  renameKey(options: { namespace: string; key: string; newKey: string }): Promise<unknown>;
};
type ChatRef = { kind: 'character'; characterId: string; fileName: string } | { kind: 'group'; chatId: string };
type TTWindow = Window & {
  __TAURITAVERN_MAIN_READY__?: Promise<unknown>;
  __TAURITAVERN__?: {
    ready?: Promise<unknown>;
    api?: {
      chat?: { open(ref: ChatRef): { store: NativeStore } };
      layout?: { subscribe(fn: (snapshot: TTLayout) => void): Promise<() => void> | (() => void) };
    };
  };
};
export const ttHost = (host: Window) => (host as TTWindow).__TAURITAVERN__;
export const ttReady = (host: Window) => ttHost(host)?.ready ?? (host as TTWindow).__TAURITAVERN_MAIN_READY__;

export function ttStore(host: Window, chatId: string, group: boolean, avatar?: string): TTStore {
  const api = ttHost(host)?.api?.chat;
  if (!api?.open) throw new Error('此 TT 版本未提供独立聊天资料接口，请更新 TauriTavern；未保存资料');
  const fileName = chatId.replace(/\.jsonl$/, '');
  if (!fileName.trim()) throw new Error('请先打开有效聊天');
  // TT's character storage identity is the exact .png filename stem, never the displayed title.
  if (!group && (!avatar?.endsWith('.png') || /[\\/\u0000-\u001f?<>:*|"]/u.test(avatar))) throw new Error('TT 未提供有效的来源角色文件身份');
  const handle = api.open(group ? { kind: 'group', chatId: fileName } : { kind: 'character', characterId: avatar!.slice(0, -4), fileName });
  const store = handle?.store;
  if (!store?.getJson || !store.setJson || !store.listKeys || !store.renameKey) throw new Error('TT 聊天资料接口不完整，未保存资料');
  // TT character stores share a directory when copied chats retain the same integrity.
  // Add an exact filename digest so these chats never share our mutable entry.
  async function entry(chat: string) {
    const digest = await host.crypto.subtle.digest('SHA-256', new TextEncoder().encode(chat.replace(/\.jsonl$/, '')));
    return 'contacts-v1-' + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }
  async function keys(namespace: string) {
    const result = await store.listKeys({ namespace });
    if (!Array.isArray(result) || !result.every(key => typeof key === 'string')) throw new Error('TT 资料索引格式不支持');
    return result;
  }
  return {
    async getJson({ namespace }) {
      const key = await entry(fileName);
      return (await keys(namespace)).includes(key) ? store.getJson({ namespace, key }) : null;
    },
    async setJson({ namespace, value }, guard) {
      const key = await entry(fileName); guard?.();
      return store.setJson({ namespace, key, value });
    },
    async moveFrom(oldChatId) {
      const namespace = 'yui-pocket', key = await entry(oldChatId), newKey = await entry(fileName);
      const existing = await keys(namespace);
      if (key === newKey || !existing.includes(key)) return;
      if (existing.includes(newKey)) throw new Error('TT 重命名目标已有通讯录，未覆盖');
      await store.renameKey({ namespace, key, newKey });
    },
  };
}

export function ttFrame(snapshot: TTLayout): Frame | undefined {
  if (snapshot?.version !== 1) return;
  const frame = snapshot.safeFrame, keyboard = snapshot.ime?.keyboardOffset;
  if (!frame || ![frame.left,frame.top,frame.width,frame.height,keyboard].every(value => Number.isFinite(value) && value >= 0)) return;
  if (!frame.width || !frame.height) return;
  return { ...frame, height: Math.max(1, frame.height - keyboard) };
}

// Native JSON object key order may differ from the JS insertion order.
export function sameStoredJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const left = a as Record<string,unknown>, right = b as Record<string,unknown>;
  return Object.keys(left).length === Object.keys(right).length && Object.keys(left).every(key => Object.hasOwn(right,key) && sameStoredJson(left[key],right[key]));
}
