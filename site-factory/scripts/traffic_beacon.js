/* Small Toolbox privacy-minimal pageview measurement. No cookies, IP or fingerprints in payload. */
(()=>{'use strict';
 const node=document.currentScript,siteId=node?.dataset.toolboxSite;
 if(!siteId||window.top!==window.self||!globalThis.crypto?.randomUUID||navigator.webdriver||navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true)return;
 let key,wasVisit=false;
 try{
   const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   key='tb-visit:'+siteId+':'+day;
   wasVisit=sessionStorage.getItem(key)==='1';
   if(!wasVisit)sessionStorage.setItem(key,'1');
 }catch{wasVisit=true;}
 const eventId=crypto.randomUUID(), isVisit=!wasVisit;
 fetch('https://ytifxhpizractdeytrok.supabase.co/functions/v1/toolbox-visit-collector',{
   method:'POST',mode:'cors',credentials:'omit',keepalive:true,
   headers:{'Content-Type':'text/plain;charset=UTF-8'},
   body:JSON.stringify({siteId,eventId,isVisit})
 }).then(response=>{if(!response.ok&&isVisit&&key)try{sessionStorage.removeItem(key)}catch{}})
 .catch(()=>{if(isVisit&&key)try{sessionStorage.removeItem(key)}catch{}});
})();
