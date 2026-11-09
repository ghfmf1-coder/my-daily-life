/* Small Toolbox privacy-minimal new-site telemetry: HTML page language only; no cookies, IP fields or fingerprint. */
(()=>{'use strict';
 const siteId=document.currentScript?.dataset.toolboxSite||'';
 if(!/^tb-[a-z0-9-]+$/.test(siteId)||window.top!==window.self||!globalThis.crypto?.randomUUID||
 navigator.webdriver||(new URLSearchParams(location.search).has('tb_test')||new URLSearchParams(location.search).has('tb_debug'))||navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true)return;
 let key,visit=false;
 try{
   const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   key='tb-visit-v2:'+siteId+':'+date;
   visit=sessionStorage.getItem(key)!=='1';
   if(visit)sessionStorage.setItem(key,'1');
 }catch{visit=false;}
 const htmlLang=String(document.documentElement?.lang||'').toLowerCase();
 const pageLang=/^ko(?:-|$)/.test(htmlLang)?'ko':/^en(?:-|$)/.test(htmlLang)?'en':'unknown';
 fetch('https://ytifxhpizractdeytrok.supabase.co/functions/v1/toolbox-public-visit',{
   method:'POST',mode:'cors',credentials:'omit',keepalive:true,
   headers:{'Content-Type':'text/plain;charset=UTF-8'},
   body:JSON.stringify({siteId,eventId:crypto.randomUUID(),isVisit:visit,pageLang})
 }).then(r=>{if(!r.ok&&visit&&key)try{sessionStorage.removeItem(key)}catch{}})
 .catch(()=>{if(visit&&key)try{sessionStorage.removeItem(key)}catch{}});
})();