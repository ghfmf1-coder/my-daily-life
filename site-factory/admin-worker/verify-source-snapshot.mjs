import fs from 'node:fs';
import assert from 'node:assert/strict';
import {buildPerformance,integratePerformance} from './performance-model.mjs';
const source=JSON.parse(fs.readFileSync('/tmp/toolbox-performance-source.json')),visits=JSON.parse(fs.readFileSync('/tmp/toolbox-visit-source.json'));
const date=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'});
const report=integratePerformance(buildPerformance(source.entries,source.gsc.filter(r=>r.date===date),[],source.sync,date),{...visits,available:true});
assert.equal(report.entries.length,source.entries.length);
for(const row of visits.publicTraffic){if(row.visit_day!==date)continue;const site=visits.publicSites.find(s=>s.site_id===row.site_id);const entry=report.entries.find(e=>e.url===site?.url);assert.ok(entry,'unmapped public visit source');const category=entry.visitors.classification[row.category];assert.equal(category.sessions,row.visits);assert.equal(category.pageviews,row.pageviews);}
for(const e of report.entries)console.log('PERFORMANCE_SOURCE_RECONCILIATION:',JSON.stringify({url:e.url,serviceId:e.serviceId,visitors:e.visitors,search:e.search.status,advertising:e.earnings.status}));
console.log('PERFORMANCE_SOURCE_RECONCILIATION_PASSED');
