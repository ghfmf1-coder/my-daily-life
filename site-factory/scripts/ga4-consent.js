/* Public aggregate analytics. No input values, query strings, fragments or user IDs. */
(()=>{'use strict';
 const own=document.currentScript,id=own?.dataset.measurementId,title=own?.dataset.pageTitle||'Small Toolbox';
 if(!/^G-[A-Z0-9]{6,20}$/.test(id||'')||window.__toolboxAnalytics)return;
 window.__toolboxAnalytics=true;
 // QA and known automation never load Google's collection script.
 if(navigator.webdriver||navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true||new URLSearchParams(location.search).has('tb_test'))return;
 const key='toolbox-ga4-consent-v1';let loaded=false,choice=null;
 try{choice=localStorage.getItem(key)}catch{}
 const english=document.documentElement.lang==='en';
 const text=english?{ask:'Allow optional visit statistics? Page visits are sent to Google Analytics. File contents and form input are excluded.',yes:'Allow',no:'Decline',settings:'Visit statistics settings'}:{ask:'선택적 방문 통계를 허용할까요? 페이지 방문 정보를 Google Analytics로 전송합니다. 파일 내용과 입력값은 보내지 않습니다.',yes:'허용',no:'거부',settings:'방문 통계 설정'};
 const safeLocation=location.origin+location.pathname;
 let referrer='';try{referrer=new URL(document.referrer).origin}catch{}
 function start(){
  window['ga-disable-'+id]=false;
  if(loaded){window.gtag('consent','update',{analytics_storage:'granted'});return;}loaded=true;
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
  window.gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  window.gtag('js',new Date());
  window.gtag('config',id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_location:safeLocation,page_referrer:referrer,page_title:title});
  window.gtag('event','page_view',{send_to:id,page_location:safeLocation,page_referrer:referrer,page_title:title});
  const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+id;document.head.append(script);
 }
 function save(value){choice=value;try{localStorage.setItem(key,value)}catch{};panel.hidden=true;
  if(value==='granted')start();else{window['ga-disable-'+id]=true;if(window.gtag)window.gtag('consent','update',{analytics_storage:'denied'})}
 }
 const panel=document.createElement('aside');panel.setAttribute('aria-label',text.settings);panel.style.cssText='position:fixed;bottom:48px;left:12px;right:12px;max-width:580px;z-index:10000;background:#fff;color:#17243b;border:1px solid #ccd6e5;border-radius:12px;padding:14px;box-shadow:0 4px 22px #17243b22;font:14px/1.6 system-ui';
 const p=document.createElement('p');p.textContent=text.ask;p.style.margin='0 0 8px';panel.append(p);
 const privacy=document.createElement('a');privacy.href='https://abreda.com/'+(english?'en/':'')+'privacy';privacy.textContent=english?'Privacy policy':'개인정보처리방침';privacy.style.marginRight='12px';panel.append(privacy);
 for(const [value,label] of [['granted',text.yes],['denied',text.no]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='padding:7px 12px;margin:4px;border:1px solid #bcc9db;border-radius:6px;background:#f4f7fc;color:#17243b;font:inherit';b.onclick=()=>save(value);panel.append(b)}
 const settings=document.createElement('button');settings.type='button';settings.textContent=text.settings;settings.style.cssText='position:fixed;bottom:8px;right:12px;z-index:9999;padding:5px 9px;background:#fff;color:#334155;border:1px solid #cbd5e1;border-radius:7px;font:12px system-ui';settings.onclick=()=>{panel.hidden=!panel.hidden};
 function mount(){document.body.append(panel,settings);panel.hidden=choice==='granted'||choice==='denied';if(choice==='granted')start()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
 // Only a tool's successful processing branch may dispatch this fixed, data-free event.
 document.addEventListener('toolbox:complete',()=>{if(choice==='granted'&&loaded)window.gtag('event','tool_complete',{send_to:id,page_location:safeLocation,page_title:title})});
})();
