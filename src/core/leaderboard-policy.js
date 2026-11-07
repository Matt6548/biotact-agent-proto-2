export function validateRankedSubmission({identity,receipt}={}){
  if(!identity?.authenticated)return{ok:false,reason:"authentication-required"};
  if(!identity?.verified)return{ok:false,reason:"verified-account-required"};
  if(!receipt?.serverValidated)return{ok:false,reason:"server-validation-required"};
  if(!receipt?.roundId||!Number.isFinite(receipt?.score))return{ok:false,reason:"invalid-server-receipt"};
  return{ok:true,reason:null};
}

export const RANKING_SECURITY_MODEL=Object.freeze({
  acceptsClientOnlyScore:false,
  requiresAuthenticatedIdentity:true,
  requiresVerifiedIdentity:true,
  requiresServerValidatedReceipt:true,
});
