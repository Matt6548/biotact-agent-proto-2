// Block, latch and report origin/phase only. Never inspect payloads or queries.
export function installHandEgressGuard(scope,{getPhase=()=> 'unknown',onBlock=()=>{}}={}){
  let blocked=false;
  const origin=scope.location.origin;
  function check(input){
    const raw=typeof input==='string'||input instanceof URL?String(input):input?.url;
    const target=new URL(raw,scope.location.href);
    if(target.origin!==origin||!['http:','https:'].includes(target.protocol)){
      blocked=true;
      onBlock({type:'egress-blocked',origin:target.origin,phase:getPhase()});
      throw new DOMException('External hand worker request blocked','SecurityError');
    }
    if(blocked)throw new DOMException('Hand worker privacy latch tripped','SecurityError');
  }
  const nativeFetch=scope.fetch.bind(scope);
  scope.fetch=async(input,options)=>{check(input);return nativeFetch(input,{...options,redirect:'error'});};
  if(scope.XMLHttpRequest?.prototype){
    const open=scope.XMLHttpRequest.prototype.open;
    scope.XMLHttpRequest.prototype.open=function(method,url,...rest){check(String(url));return open.call(this,method,url,...rest);};
  }
  return {get blocked(){return blocked;}};
}
