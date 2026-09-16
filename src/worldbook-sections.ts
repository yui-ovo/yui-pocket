/** Syntax-only suggestions. Every candidate must be reviewed; no semantic extraction. */
export function splitWorldSections(text:string): {name:string;content:string}[] {
  const lines=text.match(/[^\n]*(?:\n|$)/g)?.filter(Boolean)||[];
  const headings:{offset:number;name:string}[]=[];let offset=0;
  for(const line of lines){
    const t=line.trim();
    const match=/^#{1,6}\s+(.+?)(?:\s+#+)?$/.exec(t)
      || /^\*\*(.+?)\*\*\s*[:：]?$/.exec(t)
      || /^[-*•]\s*(.{1,80}?)\s*[:：]$/.exec(t)
      || /^【([^】]+)】\s*[:：]?$/.exec(t)
      || /^(?:姓名|名字)\s*[:：]\s*(.{1,80})$/.exec(t);
    if(match){
      const name=match[1].replace(/\*\*/g,'').replace(/[（(].*?[）)]/g,'').replace(/[:：]$/,'').trim();
      if(name&&name.length<=80)headings.push({offset,name});
    }
    offset+=line.length;
  }
  // Keep each selected segment verbatim, including its heading. Leading common
  // context remains in the original preview and is never silently assigned.
  return headings.map((h,i)=>({name:h.name,content:text.slice(h.offset,headings[i+1]?.offset??text.length)}));
}
