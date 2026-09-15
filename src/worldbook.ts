/** Confirmed player-only material, never public knowledge or model context. */
export type WorldMaterial = { world: string; uid: string; title: string; content: string; fingerprint: string; confirmedAt: string };
export type WorldEntry = { world: string; uid: string; title: string; keywords: string[]; content: string; fingerprint: string };
export const materialKey = (item: {world:string;uid:string}) => JSON.stringify([item.world,item.uid]);
export function validateMaterials(items: WorldMaterial[]) {
  if (!Array.isArray(items) || items.length > 20) throw new Error('每个人物最多关联20个条目，请减少选择');
  const keys = new Set<string>(); let size = 0;
  for (const item of items) {
    if (!item || typeof item.world !== 'string' || !item.world || item.world.length > 500 || typeof item.uid !== 'string' || !item.uid || item.uid.length > 100 || typeof item.title !== 'string' || item.title.length > 2000 || typeof item.content !== 'string' || !item.content.trim()) throw new Error('世界书资料不完整，请填写确认保留的资料');
    if (item.content.length > 20000) throw new Error('单条资料超过20000字符，请减少保留内容；未截断或保存');
    if (!/^sha256:[a-f0-9]{64}$/.test(item.fingerprint) || !Number.isFinite(Date.parse(item.confirmedAt))) throw new Error('世界书来源指纹无效，请重新选择');
    const key = materialKey(item); if (keys.has(key)) throw new Error('同一人物不能重复关联同一来源，请编辑原关联'); keys.add(key); size += item.content.length;
  }
  if (size > 40000) throw new Error('人物资料合计超过40000字符，请减少选择或内容；未截断或保存');
}
export async function normalizeWorld(world: string, data: unknown): Promise<WorldEntry[]> {
  const entries = (data as {entries?:unknown})?.entries;
  if (!entries || typeof entries !== 'object' || Array.isArray(entries)) throw new Error('世界书读取失败：返回格式不支持');
  const result: WorldEntry[] = [], ids = new Set<string>();
  for (const raw of Object.values(entries)) {
    const e = raw as {uid:unknown;comment:unknown;key:unknown;keysecondary:unknown;content:unknown};
    if (!e || !(typeof e.uid === 'string' && e.uid || typeof e.uid === 'number' && Number.isSafeInteger(e.uid)) || typeof e.content !== 'string') throw new Error('世界书读取失败：条目标识或正文无效');
    const uid=String(e.uid); if(ids.has(uid))throw new Error('世界书读取失败：条目标识重复');ids.add(uid);
    const fingerprint = 'sha256:' + Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(raw)))), b=>b.toString(16).padStart(2,'0')).join('');
    result.push({world,uid,title:typeof e.comment==='string'?e.comment:'',keywords:[...(Array.isArray(e.key)?e.key:[]),...(Array.isArray(e.keysecondary)?e.keysecondary:[])].filter((v):v is string=>typeof v==='string'),content:e.content,fingerprint});
  }
  return result;
}
