const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 for(const path of ['site-factory/scripts/traffic_beacon.js','site-factory/sites/toolbox-hub/public/toolbox-public-traffic.js']){
  const source=fs.readFileSync(path,'utf8'),store=new Map(),events=[];
  function load(search=''){
   const ctx={URLSearchParams,location:{search},document:{currentScript:{dataset:{toolboxSite:'tb-test-fixture'}}},navigator:{webdriver:false},Intl,Date,crypto:{randomUUID:()=> 'fixture-id'},sessionStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},fetch:async(url,options)=>{events.push(JSON.parse(options.body));return {ok:true}}};ctx.window=ctx;ctx.top=ctx;ctx.self=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);
  }
  load();load();await Promise.resolve();assert.equal(events.length,2);assert.equal(events[0].isVisit,true);assert.equal(events[1].isVisit,false);
  load('?tb_test=1');assert.equal(events.length,2);
 }
 console.log('PASS: repeated same-tab/day pageviews count one observed session; QA flag writes no events');
})();
