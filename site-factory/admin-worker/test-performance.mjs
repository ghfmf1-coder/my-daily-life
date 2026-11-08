import assert from 'node:assert/strict';
import {buildPerformance,integratePerformance,sourceState} from './performance-model.mjs';
const entries=[{url:'https://abreda.com/'},{url:'https://abreda.com/tools/jsonl-validator/'},{url:'https://tb-camera-lens-check.pages.dev/'}];
const checked=new Date().toISOString(),sync=[{source:'GSC',status:'ok',last_check_at:checked,detail:JSON.stringify({properties:['sc-domain:abreda.com',entries[2].url],end:'2026-10-20'})},{source:'ADSENSE',status:'no_rows',last_check_at:checked}];
const r=buildPerformance(entries,[{url:entries[2].url+'en/',clicks:0,impressions:4},{url:entries[2].url,clicks:1,impressions:7},{url:'https://abreda.com/en/tools/jsonl-validator/',clicks:2,impressions:8}],[],sync,'2026-10-20');
assert.equal(r.entries[2].search.impressions,11);assert.equal(r.entries[1].search.impressions,8);assert.equal(r.entries[0].search.impressions,null);assert.equal(r.entries[0].search.status,'no_final_row');assert.equal(r.entries[2].earnings.status,'no_report_row');assert.equal(r.entries[2].earnings.value,null);
assert.equal(buildPerformance(entries,[],[],sync,'2026-10-23').entries[2].search.status,'pending');assert.equal(buildPerformance(entries,[],[],[],'2026-10-20').entries[2].search.status,'unverified');assert.equal(sourceState({status:'ok',last_check_at:'2000-01-01'}).status,'stale');
const source={available:true,sites:[{id:'old',url:entries[2].url}],publicSites:[{site_id:'new',url:entries[2].url}],traffic:[{site_id:'old',visit_day:'2026-10-20',visits:99,pageviews:100}],classifiedTraffic:[{site_id:'old',visit_day:'2026-10-20',category:'likely_human',visits:99,pageviews:100}],publicTraffic:[{site_id:'new',visit_day:'2026-10-20',category:'likely_human',visits:2,pageviews:2,updated_at:checked}],metrics:[],fetchedAt:checked};
assert.equal(integratePerformance(r,source).entries[2].visitors.value,2);assert.equal(integratePerformance(r,source).entries[2].visitors.value,2);assert.equal(r.entries[2].visitors.legacyTotal.sessions,99);assert.equal(r.entries.length,3);assert.equal(r.entries[2].visitors.classification.bot,undefined);
console.log('PASS: localized page attribution, missing/error states, final date cutoff, source snapshots and no legacy double count');

assert.equal(buildPerformance(entries,[],[],[{source:'GSC',status:'error'}],'2026-10-23').entries[2].search.status,'error');

const {integrateVisitWindows}=await import('./performance-model.mjs');
const windowSource={...source,range:{start:'2026-09-21',end:'2026-10-20',days:30},publicTraffic:[...source.publicTraffic,{...source.publicTraffic[0],visits:1,pageviews:1,updated_at:'2020-01-01'},{site_id:'new',visit_day:'2026-10-14',category:'likely_human',visits:3,pageviews:4,updated_at:checked},{site_id:'new',visit_day:'2026-10-20',category:'bot',visits:8,pageviews:9,updated_at:checked},{site_id:'new',visit_day:'2026-09-21',category:'likely_human',visits:7,pageviews:10,updated_at:checked}]};
const windows=integrateVisitWindows({date:'2026-10-20',entries:entries.map(e=>({...e}))},windowSource);
assert.equal(windows.entries[2].visitWindows.d1.sessions,2);
assert.equal(windows.entries[2].visitWindows.d7.sessions,5);
assert.equal(windows.entries[2].visitWindows.d30.sessions,12);
assert.equal(windows.entries[2].visitWindows.d30.pageviews,16);
assert.equal(windows.entries[2].visitWindows.d30.excludedSessions,8);
assert.equal(windows.entries[0].visitWindows.d30.sessions,null);
assert.equal(windows.entries[0].visitWindows.d30.excludedSessions,null);
assert.equal(windows.entries[2].visitWindows.ga4.sessions,null);
assert.equal(windows.entries[2].visitWindows.d1.toolCompletions,null);
assert.equal(integrateVisitWindows({date:'2026-10-20',entries:[entries[0]]},{available:false}).entries[0].visitWindows.status,'error');
console.log('PASS: observed 1/7/30-day windows, newest snapshot deduplication, public precedence, bot exclusion, missing categories and GA4 remain null');
