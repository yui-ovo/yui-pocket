import { newBook, validateBook, type AddressBook, type Person } from './contacts';
import { ttHost, ttStore, sameStoredJson, type TTStore } from './tt-host';

// Verified subset of SillyTavern 1.18.0 getContext; indices are used only to read the selected card.
type Context = {
  characterId?: string | number; groupId?: string | number; chatId?: string;
  characters: Record<string, { name: string; avatar: string }>;
  chatMetadata?: { integrity?: string };
  getRequestHeaders(): Record<string,string>;
  getThumbnailUrl(type: string, file: string): string;
  eventTypes: Record<string,string>;
  eventSource: { on(event: string, fn: (...args: any[]) => void): void; removeListener(event: string, fn: (...args: any[]) => void): void };
};
type Snapshot = { locator: string; source?: { name: string; avatarFile: string } };
export type ProfileSession = { account: string; snapshot: Snapshot; book: AddressBook; nativeStore?: TTStore };
type Registry = { version: 1; books: Record<string, AddressBook> };
export function createProfileHost(host: Window) {
  let dead = false, generation = 0;
  const lifecycle = new AbortController();
  const subscribers = new Set<() => void>(), removers: (() => void)[] = [];
  let warning = '';
  function context(): Context | undefined { return (host as Window & { SillyTavern?: { getContext(): Context } }).SillyTavern?.getContext(); }
  function snapshot(): Snapshot | undefined {
    const ctx = context();
    if (!ctx?.chatId || !ctx.eventSource || !ctx.eventTypes?.CHAT_CHANGED || typeof ctx.getRequestHeaders !== 'function' || typeof ctx.getThumbnailUrl !== 'function') return;
    const card = ctx.characters?.[String(ctx.characterId)];
    const scope = ctx.groupId ? `group:${ctx.groupId}` : card?.avatar && card.avatar !== 'none' ? `card:${card.avatar}` : undefined;
    if (!scope) return;
    return { locator: JSON.stringify([scope,ctx.chatId,ctx.chatMetadata?.integrity ?? '']),
      source: !ctx.groupId && card ? { name: card.name, avatarFile: card.avatar } : undefined };
  }
  const key = (handle: string) => `yui-pocket.contacts.v1:${encodeURIComponent(handle)}`;
  function read(handle: string): Registry {
    const raw = host.localStorage.getItem(key(handle));
    if (!raw) return { version: 1, books: {} };
    const value = JSON.parse(raw) as Registry;
    if (value.version !== 1 || !value.books || typeof value.books !== 'object' || Array.isArray(value.books)) throw new Error('本机通讯录版本不支持，已停止写入');
    return value;
  }
  function write(handle: string, value: Registry) {
    const encoded = JSON.stringify(value);
    try {
      host.localStorage.setItem(key(handle), encoded);
      if (host.localStorage.getItem(key(handle)) !== encoded) throw new Error();
    } catch { throw new Error('本机保存失败，请检查浏览器存储空间或设置；资料尚未保存'); }
  }
  // No metadata/saveChat APIs: these would save the host's full message log.
  async function accountHandle(signal: AbortSignal) {
    const ctx = context();
    if (!ctx) throw new Error('当前宿主不支持通讯录接口');
    const response = await host.fetch('/api/users/me', { headers: ctx.getRequestHeaders(), credentials: 'same-origin', cache: 'no-store', signal });
    if (!response.ok) throw new Error('无法确认宿主账号，通讯录未读取或保存');
    const value = await response.json();
    if (typeof value.handle !== 'string' || !value.handle) throw new Error('宿主未提供有效账号');
    return value.handle as string;
  }
  function ensure(session: ProfileSession, epoch: number, signal: AbortSignal) {
    if (dead || signal.aborted || epoch !== generation || snapshot()?.locator !== session.snapshot.locator) throw new Error('聊天已切换或面板已关闭，本次操作已取消');
  }
  function changed() { generation++; subscribers.forEach(fn => fn()); }
  const ctx = context();
  if (ctx) {
    function bind(name: string, callback: (...args: any[]) => void) {
      const event = ctx!.eventTypes[name];
      if (!event) return;
      ctx!.eventSource.on(event, callback); removers.push(() => ctx!.eventSource.removeListener(event, callback));
    }
    bind('CHAT_CHANGED', changed);
    bind('CHAT_RENAMED', async (event: { avatarId?: string; groupId?: string; oldFileName: string; newFileName: string }) => {
      if (ttHost(host)) {
        try {
          if (!dead) await ttStore(host, event.newFileName, !!event.groupId, event.avatarId).moveFrom(event.oldFileName);
        } catch { warning = 'TT 聊天重命名资料迁移未确认，请改回原名检查；已停止覆盖保存。'; }
        if (!dead) changed(); return;
      }
      try {
        const account = await accountHandle(lifecycle.signal);
        if (!dead) {
          const registry = read(account), scope = event.groupId ? `group:${event.groupId}` : `card:${event.avatarId}`;
          let migrated = false;
          for (const locator of Object.keys(registry.books)) {
            const parts = JSON.parse(locator);
            if (parts[0] !== scope || `${parts[1]}.jsonl` !== event.oldFileName) continue;
            parts[1] = event.newFileName.replace(/\.jsonl$/, '');
            const destination = JSON.stringify(parts);
            if (registry.books[destination]) throw new Error('重命名目标已有通讯录，未覆盖');
            registry.books[destination] = registry.books[locator]; delete registry.books[locator]; migrated = true;
          }
          if (migrated) write(account, registry);
        }
      } catch { warning = '聊天重命名的本机通讯录迁移失败；请改回原名恢复资料，勿在新名下覆盖保存。'; }
      if (!dead) changed();
    });
  }
  return {
    valid: () => !!snapshot(),
    subscribe(fn: () => void) { subscribers.add(fn); return () => subscribers.delete(fn); },
    async load(signal: AbortSignal): Promise<ProfileSession> {
      if (warning) throw new Error(warning);
      const selected = snapshot(), epoch = generation;
      if (!selected) throw new Error('请先打开有效聊天，再使用本存档通讯录');
      if (ttHost(host)) {
        const ctx = context()!;
        const nativeStore = ttStore(host, ctx.chatId!, !!ctx.groupId, selected.source?.avatarFile);
        const session: ProfileSession = { account: 'tt-native-store', snapshot: selected, book: newBook(), nativeStore };
        const saved = await nativeStore.getJson({ namespace: 'yui-pocket', key: 'contacts-v1' });
        ensure(session, epoch, signal);
        if (saved !== null && saved !== undefined) session.book = structuredClone(saved) as AddressBook;
        validateBook(session.book); return session;
      }
      const handle = await accountHandle(signal);
      const session = { account: handle, snapshot: selected, book: newBook() };
      ensure(session, epoch, signal);
      session.book = structuredClone(read(handle).books[selected.locator] ?? session.book);
      validateBook(session.book); return session;
    },
    async save(session: ProfileSession, book: AddressBook, signal: AbortSignal) {
      const epoch = generation; ensure(session, epoch, signal); validateBook(book);
      if (warning) throw new Error(warning);
      if (session.nativeStore) {
        const store = session.nativeStore, options = { namespace: 'yui-pocket', key: 'contacts-v1' };
        try {
          const previous = await store.getJson(options) as AddressBook | null;
          ensure(session, epoch, signal);
          if (previous && (previous.id !== session.book.id || previous.revision !== session.book.revision)) throw new Error('通讯录已被修改，请返回列表重新读取');
          const next = structuredClone(book); next.revision = session.book.revision + 1;
          // The handle is bound to the original chat. In-flight native writes cannot be aborted.
          await store.setJson({ ...options, value: next }, () => ensure(session, epoch, signal));
          const confirmed = await store.getJson(options);
          ensure(session, epoch, signal);
          if (!sameStoredJson(confirmed, next)) throw new Error('TT 写入后的资料确认失败');
          session.book = next; return;
        } catch (error) {
          ensure(session, epoch, signal);
          throw new Error(`TT 资料保存未确认，请返回重读后再试：${error instanceof Error ? error.message : '宿主存储失败'}`);
        }
      }
      const handle = await accountHandle(signal);
      ensure(session, epoch, signal);
      if (handle !== session.account) throw new Error('宿主账号已变化，请重新打开通讯录');
      const registry = read(handle), previous = registry.books[session.snapshot.locator];
      if (previous && (previous.id !== session.book.id || previous.revision !== session.book.revision)) throw new Error('通讯录已在其他窗口修改，请返回列表重新读取');
      const next = structuredClone(book); next.revision = session.book.revision + 1;
      registry.books[session.snapshot.locator] = next;
      write(handle, registry); session.book = next;
    },
    avatar(person: Person) {
      if (person.avatar.kind !== 'default') return person.avatar.value;
      const file = person.source.avatarFile, ctx = context();
      if (!file || !ctx || !Object.values(ctx.characters).some(card => card.avatar === file)) return '';
      const url = new URL(ctx.getThumbnailUrl('avatar', file), host.location.href);
      return url.origin === host.location.origin ? url.href : '';
    },
    dispose() { dead = true; lifecycle.abort(); changed(); subscribers.clear(); removers.forEach(remove => remove()); },
  };
}
export type ProfileHost = ReturnType<typeof createProfileHost>;
