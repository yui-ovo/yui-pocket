/** Yui profile data only: no host messages, rendered HTML or model context. */
export type Person = {
  id: string;
  source: { kind: 'card' | 'manual'; name: string; avatarFile?: string };
  name: string; remark: string; description: string;
  avatar: { kind: 'default' | 'upload' | 'url'; value: string };
  relation: { known: boolean; accountKnown: boolean; friend: boolean };
  account: string;
};
export type AddressBook = { version: 1; id: string; revision: number; people: Person[]; self: { account: string } };
export const displayName = (person: Person) => person.remark.trim() || person.name;
export const newBook = (): AddressBook => ({ version: 1, id: crypto.randomUUID(), revision: 0, people: [], self: { account: '' } });
export const newAccount = () => `yui-${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
export function newPerson(source?: Person['source'], name = ''): Person {
  return { id: crypto.randomUUID(), source: source ?? { kind: 'manual', name: '手动创建' }, name, remark: '', description: '',
    avatar: { kind: 'default', value: '' }, relation: { known: false, accountKnown: false, friend: false }, account: newAccount() };
}
export function validateAccount(account: string, book: AddressBook, personId?: string) {
  if (!/^[A-Za-z0-9_-]{3,40}$/.test(account)) throw new Error('虚构账号需为3–40位字母、数字、下划线或短横线');
  const other = book.people.filter(p => p.id !== personId).map(p => p.account);
  if (personId) other.push(book.self.account);
  if (other.some(value => value.toLowerCase() === account.toLowerCase())) throw new Error('本存档已有相同账号，请换一个');
}
export function validateBook(book: AddressBook) {
  if (book.version !== 1 || typeof book.id !== 'string' || !Number.isInteger(book.revision) || !Array.isArray(book.people) || book.people.length > 100) throw new Error('通讯录格式不支持，已停止写入');
  if (book.self.account) validateAccount(book.self.account, book);
  const ids = new Set<string>();
  for (const person of book.people) {
    if (!person.id || ids.has(person.id) || !person.name?.trim() || person.name.length > 80 || person.remark.length > 80 || person.description.length > 1000) throw new Error('人物资料无效或超长');
    ids.add(person.id);
    if (!['card','manual'].includes(person.source.kind) || typeof person.source.name !== 'string') throw new Error('人物来源无效');
    const rel = person.relation;
    if (![rel.known,rel.accountKnown,rel.friend].every(x => typeof x === 'boolean') || (rel.friend && (!rel.known || !rel.accountKnown)) || (!rel.known && rel.accountKnown)) throw new Error('关系设置不一致');
    const avatar = person.avatar;
    if (avatar.kind === 'url') validateAvatarUrl(avatar.value);
    else if (avatar.kind === 'upload') {
      if (avatar.value.length > 380000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(avatar.value)) throw new Error('头像图片无效');
    } else if (avatar.kind !== 'default') throw new Error('头像类型无效');
    validateAccount(person.account, book, person.id);
  }
}
export function validateAvatarUrl(value: string) {
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || value.length > 2048) throw new Error('请输入不带账号密码的 HTTP(S) 图片地址');
  return url.href;
}
