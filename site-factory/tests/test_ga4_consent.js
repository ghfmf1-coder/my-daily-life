const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('site-factory/scripts/ga4-consent.js','utf8');
function setup({choice=null,webdriver=false,search='',dnt='0'}={}){
 const scripts=[],elements=[],listeners={},stored=new Map(choice?[['toolbox-ga4-consent-v1',choice]]:[]);
 const element=()=>({style:{},dataset:{},children:[],append(...xs){this.children.push(...xs)},setAttribute(){},hidden:false});
 const ctx={URL,URLSearchParams,Date,location:{origin:'https://abreda.com',pathname:'/tools/jsonl-validator/',search,hash:''},navigator:{webdriver,doNotTrack:dnt},localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},document:{currentScript:{dataset:{measurementId:'G-TESTONLY01',pageTitle:'Static tool'}},documentElement:{lang:'ko'},readyState:'complete',referrer:'https://example.org/?password=SECRET',createElement:()=>element(),head:{append:s=>scripts.push(s)},body:{append:(...xs)=>elements.push(...xs)},addEventListener:(k,f)=>listeners[k]=f}};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(code,ctx);return {ctx,scripts,elements,listeners};
}
let x=setup();assert.equal(x.scripts.length,0);assert.equal(x.ctx.dataLayer,undefined);
x.elements[0].children.find(b=>b.textContent==='허용').onclick();assert.equal(x.scripts.length,1);
assert(!JSON.stringify(x.ctx.dataLayer).includes('SECRET'));assert(!JSON.stringify(x.ctx.dataLayer).includes('PRIVATE'));
assert.equal(x.ctx.dataLayer.filter(v=>v[0]==='event'&&v[1]==='page_view').length,1);
x.elements[0].children.find(b=>b.textContent==='거부').onclick();assert.equal(x.ctx['ga-disable-G-TESTONLY01'],true);
x.elements[0].children.find(b=>b.textContent==='허용').onclick();assert.equal(x.scripts.length,1);assert.equal(x.ctx.dataLayer.filter(v=>v[1]==='page_view').length,1);
assert.equal(setup({choice:'granted',search:'?token=SECRET'}).scripts.length,0);assert.equal(setup({choice:'denied'}).scripts.length,0);assert.equal(setup({choice:'granted',webdriver:true}).scripts.length,0);assert.equal(setup({choice:'granted',search:'?tb_test=1'}).scripts.length,0);assert.equal(setup({choice:'granted',dnt:'1'}).scripts.length,0);
const debug=setup({choice:'granted',webdriver:true,search:'?tb_debug=1'});assert.equal(debug.scripts.length,1);assert(debug.ctx.dataLayer.some(v=>v[0]==='set'&&v[1]==='debug_mode'&&v[2]===true));
console.log('PASS: consent before collection, no query/referrer secrets, one pageview, opt-out/reactivation, QA/automation/DNT excluded');
