import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {authenticated,handler} from './legacy-bridge.mjs';
const source=fs.readFileSync(new URL('./worker.mjs',import.meta.url),'utf8');
const ctx={TextEncoder,TextDecoder,URL,Response,Request,Headers,crypto,Uint8Array,atob,btoa,AbortSignal,fetch};vm.createContext(ctx);
vm.runInContext(source.replace(/export\s*\{\s*worker_default as default\s*\};/,''),ctx);
new vm.Script(ctx.STATIC_JS);
let passed=0;function check(fn){fn();passed++;}
// Synthetic fixtures; tests never require production analytics or credentials.
const sites=[{id:'csv',url:'https://csv.abreda.com/',name:'CSV'},{id:'hub',url:'https://abreda.com/',name:'Hub'},{id:'text',url:'https://manuscript.abreda.com/',name:'Text'},{id:'novel',url:'https://novel.abreda.com/',name:'Novel'}];
const traffic=[['csv','2026-10-19',6],['hub','2026-10-19',8],['text','2026-10-19',2],['csv','2026-10-21',14],['hub','2026-10-21',22],['text','2026-10-21',1],['novel','2026-10-21',3]].map(([site_id,visit_day,visits])=>({site_id,visit_day,visits,pageviews:visits,updated_at:'2026-10-22T00:00:00Z'}));
const metrics=[...Array.from({length:5},(_,i)=>({id:'a'+i,siteId:'csv',date:'2026-10-19'})),...Array.from({length:4},(_,i)=>({id:'b'+i,siteId:'hub',date:'2026-10-21'}))];
const legacy={available:true,sites,metrics,traffic,fetchedAt:'2026-10-22T00:00:00Z',version:1};
check(()=>{const r=ctx.integratePerformance({date:'2026-10-19',entries:[]},legacy);assert.equal(r.entries.reduce((n,x)=>n+x.visitors.value,0),16);assert.equal(r.history.length,5);assert.equal(r.entries.find(x=>x.url==='https://csv.abreda.com/').visitors.value,6)});
check(()=>{const r=ctx.integratePerformance({date:'2026-10-21',entries:[]},legacy);assert.equal(r.entries.reduce((n,x)=>n+x.visitors.value,0),40);assert.equal(r.history.length,4)});
check(()=>{const r=ctx.integratePerformance({date:'2026-10-18',entries:[]},legacy);assert.equal(r.entries.length,0);assert.equal(r.history.length,0)});
check(()=>{const r=ctx.integratePerformance({date:'2026-10-19',entries:[{url:'https://csv.abreda.com/',search:{clicks:0,impressions:0},earnings:{value:0}}]},legacy);assert.equal(r.entries[0].search.clicks,0);assert.equal(r.entries[0].earnings.value,0)});
check(()=>{assert.equal(ctx.deployedProjectsFromApi([{name:'tb-new-real-tool',canonical_deployment:{id:'deployment123',environment:'production',latest_stage:{status:'success'}}}],[]).length,1);assert.equal(ctx.deployedProjectsFromApi([{name:'tb-failed-tool',canonical_deployment:{environment:'production',latest_stage:{status:'failure'}}}],[]).length,0)});
assert.equal(await authenticated(null),false);passed++;
assert.equal((await handler(new Request('https://x/'),{get(){throw Error('must not access database')}})).status,401);passed++;
const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk=await crypto.subtle.exportKey('jwk',keys.publicKey);jwk.kid='test-key';
const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
async function token(payload){const body=enc({alg:'RS256',kid:'test-key'})+'.'+enc(payload);return body+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(body))).toString('base64url')}
const claims={iss:'https://little-tooth-dff1.cloudflareaccess.com',aud:['d9e9318ac18ff0bcca2cc0926ed466fb0cf7e9c548a0a5e6c6b455fad49025dd'],email:'ghfmf1@gmail.com',exp:Date.now()/1000+300};
const certs=async()=>Response.json({keys:[jwk]});
assert.equal(await authenticated(await token(claims),certs),true);passed++;
assert.equal(await authenticated(await token({...claims,email:'other@example.com'}),certs),false);passed++;
assert.equal(await authenticated(await token({...claims,exp:1}),certs),false);passed++;
assert.equal(await authenticated(await token({...claims,aud:['wrong']}),certs),false);passed++;
assert.equal(await authenticated((await token(claims)).slice(0,-8)+'invalid',certs),false);passed++;
console.log(`${passed} integration and authentication checks passed; Worker and embedded JS parse successfully`);
