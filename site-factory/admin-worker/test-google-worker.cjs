const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let body,status=200,writes=[],checks=[];
const ctx=vm.createContext({URL,Response,Date,AbortSignal,fetch:async()=>Response.json(body,{status}),json:Response.json,writeSync:async(...args)=>checks.push(args),console});
vm.runInContext(fs.readFileSync(__dirname+'/google-reporting.mjs','utf8'),ctx);
const env={REPORTING_BRIDGE_KEY:'fixture',REPORT_DB:{prepare(sql){return {bind(...values){return {sql,values}}}},async batch(rows){writes.push(...rows)}}};
(async()=>{
 body={gsc:{status:'no_rows',rows:[],detail:'No final data'},adsense:{status:'no_rows',rows:[],detail:'No report data',currency:'KRW'}};
 let r=await ctx.syncGoogleReporting(env);assert.equal(r.gsc.imported,0);assert.equal(writes.length,0);assert.equal(checks.length,2);
 const date=r.start;
 body={gsc:{status:'ok',rows:[{date,url:'https://abreda.com/tools/demo/',clicks:2,impressions:10}]},adsense:{status:'ok',currency:'KRW',rows:[{date,url:'https://abreda.com/tools/demo/',earnings:2.4}]}};
 r=await ctx.syncGoogleReporting(env);assert.equal(writes.length,2);assert.equal(writes[1].values[2],2.4);assert.ok(writes.every(x=>x.sql.includes('ON CONFLICT')));
 writes=[];body.gsc.rows[0].url='https://evil.test/';await assert.rejects(()=>ctx.syncGoogleReporting(env),/Invalid report row/);assert.equal(writes.length,0);
 status=503;await assert.rejects(()=>ctx.syncGoogleReporting(env),/HTTP 503/);assert.equal(writes.length,0);
 console.log('Google Worker import: no rows preserve data, upserts, currency and host validation, upstream failure passed');
})().catch(e=>{console.error(e);process.exitCode=1});
