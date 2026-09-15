// Fixed contract subset from ST 1.18.0 / TT 2.2.0. No real lorebook data.
(() => {
  const original=window.SillyTavern.getContext;
  window.loreMock={calls:[],fail:false,wait:false,unsupported:false,bound:true,
    books:{'角色资料':{entries:{0:{uid:0,comment:'花店的两个人',key:['花店','姐姐'],keysecondary:['弟弟'],content:'姐姐阿棠经营花店。弟弟阿青负责送货。<img src="https://invalid.test/a" onerror="window.pwned=1">'},1:{uid:1,comment:'隐藏身份',key:['秘密'],content:'阿棠其实是侦探；user尚不知情。'}}},'剧情设定':{entries:{0:{uid:0,comment:'城市',key:['街道'],content:'阿棠住在东街。'}}},'其他资料':{entries:{0:{uid:0,comment:'旅人',key:[],content:'旅人会吹笛。'}}}},
    async load(name){this.calls.push(name);if(this.wait)await new Promise(resolve=>this.release=resolve);if(this.fail)return null;return structuredClone(this.books[name]);}
  };
  window.SillyTavern.getContext=()=>{
    const ctx=original(),m=loreMock;
    // Do not spread ctx: the forbidden host-message getter must remain unread.
    ctx.characters=structuredClone(ctx.characters);
    if(m.bound){ctx.characters[String(ctx.characterId)].data={extensions:{world:'角色资料'}};ctx.chatMetadata.world_info='剧情设定';}
    if(!m.unsupported){ctx.getWorldInfoNames=()=>Object.keys(m.books);ctx.loadWorldInfo=name=>m.load(name);}
    ctx.saveWorldInfo=()=>{throw new Error('Worldbook mutation is forbidden');};return ctx;
  };
})();
