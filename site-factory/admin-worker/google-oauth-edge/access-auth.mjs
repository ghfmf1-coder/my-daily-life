// Read-only bridge. Cloudflare Access JWT verification replaces Supabase Auth.
// No CORS, caller-selected tables, SQL, secrets, notes or personal payloads returned.
const ISSUER='https://little-tooth-dff1.cloudflareaccess.com';
const AUD='d9e9318ac18ff0bcca2cc0926ed466fb0cf7e9c548a0a5e6c6b455fad49025dd';
const OWNER='8b060501-8453-4ecb-bbe1-38f33dd05e9f';
const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'=')),c=>c.charCodeAt(0));
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
export async function authenticated(token,fetcher=fetch){
 try{
  if(!token||token.length>16000)return false;
  const parts=token.split('.');if(parts.length!==3)return false;
  const h=JSON.parse(new TextDecoder().decode(decode(parts[0]))),p=JSON.parse(new TextDecoder().decode(decode(parts[1])));
  const t=Date.now()/1000;
  if(h.alg!=='RS256'||p.iss!==ISSUER||!Array.isArray(p.aud)||!p.aud.includes(AUD)||typeof p.exp!=='number'||p.exp<=t||p.nbf>t||String(p.email).toLowerCase()!=='ghfmf1@gmail.com')return false;
  const r=await fetcher(ISSUER+'/cdn-cgi/access/certs',{signal:AbortSignal.timeout(8000)});if(!r.ok)return false;
  const key=(await r.json()).keys?.find(k=>k.kid===h.kid&&k.kty==='RSA');if(!key)return false;
  const imported=await crypto.subtle.importKey('jwk',key,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',imported,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
 }catch{return false;}
}

