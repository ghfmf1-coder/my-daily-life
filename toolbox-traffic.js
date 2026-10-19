/* Small Toolbox pageview telemetry: browser sessions, not unique people. */
(()=>{'use strict';try{
 const script=document.currentScript,siteId=script?.dataset.toolboxSite;
 if(!siteId||window.top!==window.self||location.protocol!=='https:'||!crypto?.randomUUID)return;
 if(navigator.webdriver||navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true)return;
 if(/bot|spider|crawler|preview|headless|lighthouse|pagespeed|selenium|playwright|puppeteer/i.test(navigator.userAgent||''))return;
 const now=Date.now(),key='tb-session:'+siteId;let sid;
 try{const previous=JSON.parse(sessionStorage.getItem(key)||'null');
  if(previous&&typeof previous.id==='string'&&now-previous.at>=0&&now-previous.at<1800000)sid=previous.id;
 }catch{}
 if(!sid)sid=crypto.randomUUID();
 try{sessionStorage.setItem(key,JSON.stringify({id:sid,at:now}))}catch{}
 fetch('https://ytifxhpizractdeytrok.supabase.co/functions/v1/toolbox-visit-collector',{
   method:'POST',mode:'cors',credentials:'omit',keepalive:true,
   headers:{'Content-Type':'text/plain;charset=UTF-8'},
   body:JSON.stringify({session:sid,path:(location.pathname||'/').slice(0,180)})
 }).catch(()=>{});
}catch{}})();