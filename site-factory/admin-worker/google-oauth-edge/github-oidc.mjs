const ISSUER='https://token.actions.githubusercontent.com';
export const AUDIENCE='small-toolbox-google-readonly';
const WORKFLOW='ghfmf1-coder/my-daily-life/.github/workflows/work-registry-readonly-audit.yml@refs/heads/main';
const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'=')),c=>c.charCodeAt(0));
export async function githubAuthenticated(raw,fetcher=fetch){
 try{
  if(typeof raw!=='string'||raw.length>16000||!raw.startsWith('Bearer '))return false;
  const parts=raw.slice(7).split('.');if(parts.length!==3)return false;
  const h=JSON.parse(new TextDecoder().decode(decode(parts[0]))),p=JSON.parse(new TextDecoder().decode(decode(parts[1])));
  const t=Date.now()/1000;
  if(h.alg!=='RS256'||typeof h.kid!=='string'||p.iss!==ISSUER||p.aud!==AUDIENCE||
   p.repository!=='ghfmf1-coder/my-daily-life'||p.repository_id!=='1414124913'||p.repository_owner_id!=='340892821'||
   p.ref!=='refs/heads/main'||p.workflow_ref!==WORKFLOW||
   !['push','schedule','workflow_dispatch','workflow_run'].includes(p.event_name)||
   !Number.isFinite(p.exp)||!Number.isFinite(p.iat)||p.exp<=t||p.iat>t+30||p.exp-p.iat>900||
   (p.nbf!==undefined&&(!Number.isFinite(p.nbf)||p.nbf>t+30)))return false;
  const r=await fetcher(ISSUER+'/.well-known/jwks',{signal:AbortSignal.timeout(10000)});
  if(!r.ok)return false;
  const key=(await r.json()).keys?.find(k=>k.kid===h.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256'));
  if(!key)return false;
  const imported=await crypto.subtle.importKey('jwk',key,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',imported,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
 }catch{return false;}
}
