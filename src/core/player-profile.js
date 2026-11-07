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

export function hasCompletedBriefing(profile){
  return Boolean(
    profile?.kind==="local-player-profile" &&
    typeof profile?.name==="string" &&
    Number.isFinite(profile?.briefingAcceptedAt) &&
    Number.isFinite(profile?.safetyAcknowledgedAt)
  );
}

export function buildLocalPlayerProfile(name,{now=Date.now(),previous=null,acceptBriefing=false}={}){
  const normalized=normalizePlayerName(name);
  if(!normalized.ok)return normalized;
  const createdAt=Number.isFinite(previous?.createdAt)?previous.createdAt:now;
  const briefingAcceptedAt=acceptBriefing
    ?now
    :Number.isFinite(previous?.briefingAcceptedAt)?previous.briefingAcceptedAt:null;
  const safetyAcknowledgedAt=acceptBriefing
    ?now
    :Number.isFinite(previous?.safetyAcknowledgedAt)?previous.safetyAcknowledgedAt:null;

  return{
    ok:true,
    value:{
      schemaVersion:2,
      kind:"local-player-profile",
      name:normalized.value,
      createdAt,
      briefingAcceptedAt,
      safetyAcknowledgedAt,
      onlineAccount:false,
    },
    reason:null,
  };
}
