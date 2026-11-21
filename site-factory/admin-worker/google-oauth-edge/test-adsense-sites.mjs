import {readAdSenseSites} from './adsense-sites.mjs';
import assert from 'node:assert/strict';
const relevant=u=>new URL(u).hostname==='abreda.com';let calls=0;
const r=await readAdSenseSites(async url=>{calls++;assert(url.startsWith('https://adsense.googleapis.com/v2/accounts/pub-test/sites?'));return calls===1?{sites:[{domain:'other.test',state:'READY',name:'private-resource'},{domain:'abreda.com',state:'REQUIRES_REVIEW',autoAdsEnabled:false,name:'private-resource'}],nextPageToken:'second'}:{sites:[]}},'accounts/pub-test',relevant);
assert.equal(calls,2);assert.deepEqual(r.sites,[{domain:'abreda.com',state:'REQUIRES_REVIEW',autoAdsEnabled:false}]);
assert.deepEqual(await readAdSenseSites(async()=>{throw Error('sensitive upstream text')},'accounts/pub-test',relevant),{status:'query_failed',account:'accounts/pub-test',sites:[]});
assert.equal((await readAdSenseSites(async()=>({nextPageToken:'loop'}),'accounts/pub-test',relevant)).status,'incomplete');
console.log('PASS AdSense site states: pagination, allowlist, no secret/error details, incomplete is not empty success');
