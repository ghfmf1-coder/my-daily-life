import assert from 'node:assert/strict';
import {githubAuthenticated,AUDIENCE} from './github-oidc.mjs';
const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const publicKey=await crypto.subtle.exportKey('jwk',keys.publicKey);
const b64=value=>Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url');
const now=Math.floor(Date.now()/1000);
const claims={iss:'https://token.actions.githubusercontent.com',aud:AUDIENCE,repository:'ghfmf1-coder/my-daily-life',repository_id:'1414124913',repository_owner_id:'340892821',ref:'refs/heads/main',workflow_ref:'ghfmf1-coder/my-daily-life/.github/workflows/work-registry-readonly-audit.yml@refs/heads/main',event_name:'push',iat:now,exp:now+300};
async function token(payload,header={alg:'RS256',kid:'test-key'}){const data=b64(header)+'.'+b64(payload);const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(data));return 'Bearer '+data+'.'+Buffer.from(sig).toString('base64url')}
const fetcher=async url=>{assert.equal(url,'https://token.actions.githubusercontent.com/.well-known/jwks');return Response.json({keys:[{...publicKey,kid:'test-key',alg:'RS256'}]})};
assert.equal(await githubAuthenticated(await token(claims),fetcher),true);
for(const patch of [{aud:'other'},{repository_id:'other'},{repository_owner_id:'other'},{ref:'refs/pull/1/merge'},{workflow_ref:'other'},{event_name:'pull_request'},{exp:now-1},{iat:now+120},{iss:'https://evil.invalid'}])assert.equal(await githubAuthenticated(await token({...claims,...patch}),fetcher),false);
assert.equal(await githubAuthenticated(await token(claims,{alg:'none',kid:'test-key'}),fetcher),false);
const valid=await token(claims);const parts=valid.split('.');parts[1]=b64({...claims,exp:now+400});
assert.equal(await githubAuthenticated(parts.join('.'),fetcher),false);
assert.equal(await githubAuthenticated(valid,async()=>Response.json({keys:[]})),false);
console.log('PASS: trusted signature accepted; wrong audience, repository, owner, branch, workflow, event, time, issuer, algorithm, tampering and missing key rejected');

const setupClaims={...claims,aud:'small-toolbox-google-setup',workflow_ref:'ghfmf1-coder/my-daily-life/.github/workflows/toolbox-google-setup.yml@refs/heads/main'};
assert.equal(await githubAuthenticated(await token(setupClaims),fetcher,'setup'),true);
assert.equal(await githubAuthenticated(await token(setupClaims),fetcher),false);
assert.equal(await githubAuthenticated(await token(claims),fetcher,'setup'),false);
console.log('PASS: setup identity accepted only by setup validator; audit and setup identities cannot cross paths');
