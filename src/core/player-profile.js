const NAME_PATTERN=/[^\p{L}\p{N} _-]/gu;

export function normalizePlayerName(value,{min=3,max=20}={}){
  const normalized=String(value??"")
    .normalize("NFKC")
    .replace(NAME_PATTERN,"")
    .replace(/\s+/g," ")
    .trim()
    .slice(0,max);

  if(normalized.length<min){
    return{ok:false,value:normalized,reason:"name-too-short"};
  }
  return{ok:true,value:normalized,reason:null};
}

export function buildLocalPlayerProfile(name,{now=Date.now()}={}){
  const normalized=normalizePlayerName(name);
  if(!normalized.ok)return normalized;
  return{
    ok:true,
    value:{
      schemaVersion:1,
      kind:"local-player-profile",
      name:normalized.value,
      createdAt:now,
      onlineAccount:false,
    },
    reason:null,
  };
}
