
'use strict';
(()=>{
const KEY='life-quest-3years-v1';
/* 사용자 본인 계정의 비공개 클라우드 기록. 공개키 + 소유자 RLS. */
const CB=window.MYDAY_CONFIG.supabaseUrl, CK=window.MYDAY_CONFIG.supabasePublishableKey, AK='haru-auth-v3';
let sess=null,owner=null,rev=null,ready=false,busy=false,connecting=false,dirty=false,again=false,seq=0,timer=null;
try{sess=JSON.parse(localStorage.getItem(AK)||'null')}catch{sess=null}
function status(msg,kind='idle'){
 const p=$('cloud-message');if(p)p.textContent=msg;
 const x=$('autosave-chip');if(x)x.textContent=kind==='ok'?'☁ 서버 동기화 완료':kind==='bad'?'⚠ 기기 저장 · 서버 미확인':kind==='work'?'◌ 서버 동기화 중':'● 이 기기에 저장';
 const b=$('cloud-badge');if(b)b.textContent=kind==='ok'?'동기화 완료':kind==='bad'?'동기화 필요':sess?'연결 중':'로그인 필요';
}
function authUI(){
 $('cloud-login-fields').classList.toggle('hidden',!!sess);
 $('cloud-tools').classList.toggle('hidden',!sess);
 $('cloud-account-label').textContent=owner?.email?'로그인: '+owner.email:'';
}
function setSession(t){
 if(!t?.access_token||!t?.refresh_token)throw Error('로그인 세션 없음');
 sess={access_token:t.access_token,refresh_token:t.refresh_token,expires_at:Math.floor(Date.now()/1000)+(t.expires_in||3600)};
 localStorage.setItem(AK,JSON.stringify(sess));authUI();
}
async function token(){
 if(!sess?.access_token)throw Error('로그인이 필요합니다');
 if(sess.expires_at<Date.now()/1000+60){
   const t=await req('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:sess.refresh_token})},false);
   setSession(t);
 }
 return sess.access_token;
}
async function req(path,init={},needAuth=true){
 const headers={apikey:CK,'Content-Type':'application/json',...(init.headers||{})};
 if(needAuth)headers.Authorization='Bearer '+await token();
 const response=await fetch(CB+path,{...init,headers,cache:'no-store'});
 let data;try{data=await response.json()}catch{data=null}
 if(!response.ok){
   let msg=data?.error_description||data?.message||data?.msg||data?.error||'서버 오류 ('+response.status+')';
   if(/invalid login credentials/i.test(msg))msg='이메일 또는 비밀번호가 맞지 않습니다';
   if(/email not confirmed/i.test(msg))msg='이메일 인증을 완료해야 합니다';
   throw Error(String(msg).slice(0,180));
 }
 return data;
}
function norm(x){
 if(!x||x.version!==1||!x.settings||!x.days||!x.overrides||!Array.isArray(x.custom))throw Error('클라우드 기록 형식 오류');
 return {...fresh(),...x,settings:{...fresh().settings,...x.settings,goals:{...G,...x.settings.goals}}};
}
function stable(x){
 if(Array.isArray(x))return '['+x.map(stable).join(',')+']';
 if(x&&typeof x==='object')return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}';
 return JSON.stringify(x);
}
function hasRecord(){return Object.keys(db.days).length>0||Object.keys(db.overrides).length>0||db.custom.length>0||stable(db.settings)!==stable(fresh().settings)}
function changed(){
 dirty=true;seq++;
 if(!sess){status('기기 기록은 보관 중입니다. 클라우드 동기화는 로그인 후 시작됩니다.');return}
 if(!ready){status('기기에 기록했지만, 서버 연결이 끝나지 않아 동기화가 보류됐습니다.','bad');return}
 status('기기에 저장됨. 서버로 전송 중...','work');
 clearTimeout(timer);timer=setTimeout(pushCloud,650);
}
async function pushCloud(){
 if(!sess||!ready||!owner||!dirty||!navigator.onLine)return;
 if(busy){again=true;return}
 busy=true;again=false;
 const n=seq, v=rev, data=JSON.parse(JSON.stringify(db));
 try{
  const rows=await req('/rest/v1/life_quest_state?user_id=eq.'+owner.id+'&revision=eq.'+v+'&select=revision',{
   method:'PATCH',headers:{Prefer:'return=representation'},
   body:JSON.stringify({snapshot:data,revision:v+1,updated_at:new Date().toISOString()})
  });
  if(!rows?.length){ready=false;throw Error('서버에서 다른 변경을 발견했습니다. 동기화 상태를 확인하세요.')}
  rev=Number(rows[0].revision);
  if(n===seq){dirty=false;status('클라우드 저장 완료','ok')}else{again=true}
 }catch(e){status('서버 전송 실패: '+e.message+' (기기 기록은 보존됨)','bad')}
 finally{busy=false;if(again&&ready){again=false;clearTimeout(timer);timer=setTimeout(pushCloud,250)}}
}
async function connectCloud(){
 if(!sess||connecting)return;
 connecting=true;ready=false;status('서버에서 기록 확인 중...','work');
 try{
  const identity=await req('/auth/v1/user');
  owner={id:identity.id,email:identity.email||''};if(!owner.id)throw Error('사용자 계정 확인 실패');
  const rows=await req('/rest/v1/life_quest_state?user_id=eq.'+owner.id+'&select=snapshot,revision');
  if(rows?.length){
   const remote=norm(rows[0].snapshot);
   rev=Number(rows[0].revision);
   if(stable(db)!==stable(remote)){
    if(hasRecord()&&!confirm('서버에 다른 퀘스트 기록이 있습니다.\n\n[확인] 서버 기록을 휴대폰으로 불러오기\n[취소] 기기 기록을 보존하고 동기화 중지')){
     status('기기와 서버 기록이 달라 동기화가 중단됐습니다. 서버 기록 확인 또는 수동 교체를 선택하세요.','bad');return;
    }
    db=remote;localStorage.setItem(KEY,JSON.stringify(db));render();
   }
  }else{
   const created=await req('/rest/v1/life_quest_state?select=revision',{
    method:'POST',headers:{Prefer:'return=representation'},
    body:JSON.stringify({user_id:owner.id,snapshot:db,revision:1})
   });
   if(!created?.length)throw Error('클라우드 초기 저장 실패');
   rev=Number(created[0].revision);
  }
  ready=true;dirty=false;status('모든 기록이 클라우드에 동기화됐습니다.','ok');
 }catch(e){status('서버 연결 실패: '+e.message+' (기기 기록은 보존됨)','bad')}
 finally{connecting=false;authUI()}
}
async function loginCloud(signup){
 const email=$('cloud-email').value.trim(),password=$('cloud-password').value;
 if(!email.includes('@')||password.length<6){showToast('이메일과 비밀번호(6자 이상)를 입력하세요.');return}
 status(signup?'계정 생성 중...':'로그인 중...','work');
 try{
  const payload=await req(signup?'/auth/v1/signup':'/auth/v1/token?grant_type=password',{
   method:'POST',body:JSON.stringify({email,password})
  },false);
  $('cloud-password').value='';
  if(payload?.access_token){setSession(payload);await connectCloud()}
  else status('가입 확인 메일의 링크를 누른 뒤 다시 로그인하세요.');
 }catch(e){status('로그인 오류: '+e.message,'bad')}
}
async function overwriteCloud(){
 if(!owner||!sess)return;
 if(!confirm('경고: 현재 휴대폰 기록으로 서버에 있던 기존 기록을 교체합니다. 복구할 수 없습니다. 진행할까요?'))return;
 status('서버 기록 교체 중...','work');
 try{
  const rows=await req('/rest/v1/life_quest_state?user_id=eq.'+owner.id+'&select=revision');
  let out;
  if(rows.length){
   const v=Number(rows[0].revision);
   out=await req('/rest/v1/life_quest_state?user_id=eq.'+owner.id+'&revision=eq.'+v+'&select=revision',{
    method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({snapshot:db,revision:v+1,updated_at:new Date().toISOString()})
   });
  }else{
   out=await req('/rest/v1/life_quest_state?select=revision',{
    method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({user_id:owner.id,snapshot:db,revision:1})
   });
  }
  if(!out?.length)throw Error('서버에 변경이 발생했습니다. 다시 확인하세요');
  rev=Number(out[0].revision);ready=true;dirty=false;status('현재 휴대폰 기록으로 서버를 교체했습니다.','ok');
 }catch(e){ready=false;status('교체 실패: '+e.message,'bad')}
}
async function logoutCloud(){
 if(!confirm('로그아웃할까요? 하루한칸 앱에서도 같은 로그인 세션이 해제됩니다.'))return;
 try{if(sess)await req('/auth/v1/logout',{method:'POST'})}catch{}
 localStorage.removeItem(AK);sess=null;owner=null;rev=null;ready=false;dirty=false;authUI();
 status('이 휴대폰에만 기록을 저장 중입니다.');
}
function bootCloud(){
 authUI();if(sess)connectCloud();else status('한 번 로그인하면 이 휴대폰에서 변경한 기록이 클라우드에 자동 저장됩니다.');
 window.addEventListener('online',()=>{if(sess&&!ready)connectCloud();else if(dirty)pushCloud()});
 window.addEventListener('pageshow',()=>{if(dirty&&ready)pushCloud()});
}

const START='2026-11-09',END='2029-11-08',WEEKDAYS=['일','월','화','수','목','금','토'];
const G={exercise:60,read:20,write:40,sleep:420};
const imageHolidays=[
['2027-01-01','2027-01-02','신정휴무'],['2027-02-06','2027-02-10','설날휴무'],['2027-03-01','2027-03-01','삼일절'],['2027-05-01','2027-05-01','노동절'],['2027-05-03','2027-05-03','휴일중복'],['2027-05-05','2027-05-05','어린이날'],['2027-05-13','2027-05-13','석가탄신일'],['2027-06-06','2027-06-06','현충일'],['2027-07-17','2027-07-17','제헌절'],['2027-07-19','2027-07-19','휴일중복'],['2027-07-25','2027-07-25','노조창립일'],['2027-07-26','2027-07-26','휴일중복'],['2027-08-02','2027-08-06','하기휴무'],['2027-08-15','2027-08-15','광복절'],['2027-08-16','2027-08-16','휴일중복'],['2027-09-14','2027-09-17','추석휴무'],['2027-10-03','2027-10-03','개천절'],['2027-10-04','2027-10-04','휴일중복'],['2027-10-09','2027-10-09','한글날'],['2027-10-11','2027-10-11','휴일중복'],['2027-12-25','2027-12-25','기독탄신일'],['2027-12-27','2027-12-27','휴일중복'],['2027-12-29','2027-12-29','회사창립일']];
function date(s){return new Date(s+'T00:00:00.000Z')}
function ymd(dt){return dt.toISOString().slice(0,10)}
function addDays(s,days){const d=date(s);d.setUTCDate(d.getUTCDate()+days);return ymd(d)}
function diffDays(a,b){return Math.round((date(b)-date(a))/86400000)}
function weekStart(s){const d=date(s),off=(d.getUTCDay()+6)%7;return addDays(s,-off)}
function monthStart(s){return s.slice(0,7)+'-01'}
function shiftMonth(s,n){const [y,m]=s.split('-').map(Number);return `${y+Math.floor((m-1+n)/12)}-${String(((m-1+n)%12+12)%12+1).padStart(2,'0')}-01`}
function dayNow(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const v={};for(const t of p)v[t.type]=t.value;return `${v.year}-${v.month}-${v.day}`}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
const $=id=>document.getElementById(id);
function fresh(){return {version:1,settings:{baseDate:START,baseShift:'',saturday:'unknown',goals:{...G}},days:{},overrides:{},custom:[]}}
function load(){try{const x=JSON.parse(localStorage.getItem(KEY));if(x&&x.version===1&&x.settings&&x.days&&x.overrides&&Array.isArray(x.custom)){return {...fresh(),...x,settings:{...fresh().settings,...x.settings,goals:{...G,...x.settings.goals}}}}}catch(e){console.warn('로컬 기록을 불러올 수 없습니다',e)}return fresh()}
let db=load(),selected=dayNow(),calendarMonth=monthStart(selected),reportMonth=monthStart(selected),reportWeek=weekStart(selected),tab='today',toastTimer;
function save(){try{localStorage.setItem(KEY,JSON.stringify(db));changed();return true}catch(e){$('autosave-chip').textContent='⚠ 저장 실패';showToast('저장 실패. 브라우저 저장 용량/보안 설정을 확인하세요.');return false}}
function showToast(s){const el=$('toast');el.textContent=s;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3200)}
function record(s){return db.days[s]||{}}
function put(s,patch){db.days[s]={...record(s),...patch};save();render()}
function isWithin(s){return s>=START&&s<=END}
function isPastOrToday(s){return s<=END&&s<=dayNow()}
function holiday(s){for(const [a,b,label] of imageHolidays)if(s>=a&&s<=b)return label;return ''}
function dayPlan(s){const wd=date(s).getUTCDay(),ref=holiday(s),o=db.overrides[s]||{};
let work=ref?'off':wd===0?'off':wd===6?db.settings.saturday:'work';if(o.work&&o.work!=='auto')work=o.work;
let shift='';if(db.settings.baseShift){let wi=Math.floor(diffDays(weekStart(db.settings.baseDate),weekStart(s))/7);shift=Math.abs(wi)%2===0?db.settings.baseShift:(db.settings.baseShift==='day'?'night':'day')}
if(o.shift&&o.shift!=='auto')shift=o.shift;
return {work,shift,wd,reference:ref}
}
function rules(s){const p=dayPlan(s),g=db.settings.goals,a=[
{id:'attendance',name:'정상출근',icon:'🧰',type:'attendance',xp:25,required:p.work==='work',hidden:false,desc:'지각·조퇴·연차·결근 없이 근무 완료'},
{id:'exercise',name:p.work==='off'?'회복 운동 1시간':'운동 1시간',icon:'💪',type:'minutes',goal:g.exercise,xp:20,required:true,desc:p.work==='off'?'걷기·스트레칭도 인정, 무리하지 않기':'실제 운동 시간 기록 · 회복 우선'},
{id:'read',name:'웹소설 읽기',icon:'📖',type:'minutes',goal:g.read,xp:12,required:true,desc:'표현·전개를 의식하며 읽기'},
{id:'write',name:'웹소설 쓰기',icon:'✍️',type:'minutes',goal:g.write,xp:25,required:true,desc:'퇴고·집필 포함, 실제 작업 시간만'},
{id:'medicine',name:'탈모약 복용 확인',icon:'💊',type:'check',xp:5,required:true,desc:'처방된 방법대로 복용했을 때만 체크'},
{id:'sober',name:'하루 금주',icon:'🥤',type:'check',xp:12,required:true,desc:'오늘 술을 마시지 않았다'},
{id:'nogamble',name:'도박 안 하기',icon:'🛡️',type:'check',xp:18,required:true,desc:'스포츠 베팅·카지노·사행성 게임 모두 0회'},
{id:'expense',name:'오늘 지출 확인',icon:'🧾',type:'check',xp:8,required:true,desc:'지출이 없었다면 0원으로 확인'},
{id:'sleep',name:'수면 시간 관리',icon:'🌙',type:'minutes',goal:g.sleep,xp:10,required:false,desc:'지난 24시간 수면 합계 기록'},
{id:'prep',name:'내일 준비 10분',icon:'🎯',type:'minutes',goal:10,xp:5,required:false,desc:'근무·운동·집필 계획 확인'}];
if(s>='2027-01-01')a.push({id:'smokefree',name:'하루 금연',icon:'🌱',type:'check',xp:10,required:false,desc:'금연 계획 실천 (보너스)'});
if(p.wd===0)a.push({id:'review',name:'일요일 주간 회고',icon:'📋',type:'check',xp:15,required:false,desc:'한 주 성과와 개선점 한 줄 정리'});
if(Number(s.slice(-2))===15)a.push({id:'payday',name:'월급·예산 구분 확인',icon:'💳',type:'check',xp:15,required:false,desc:'실제 입금과 생활비·상환 예산 구분'});
if(Number(s.slice(-2))===16)a.push({id:'repayment',name:'채무 납부 상태 확인',icon:'🔒',type:'check',xp:15,required:false,desc:'실제 납부·유예·미납 상태 확인'});
if(s.slice(-2)==='01')a.push({id:'monthlyplan',name:'이번 달 목표 정리',icon:'📌',type:'check',xp:10,required:false,desc:'근무표와 필수지출을 확인'});
for(const q of db.custom.filter(x=>x.periods?x.periods.some(t=>t.start<=s&&(!t.end||s<t.end)):(x.active!==false&&(x.created?x.created<=s:true))))a.push({id:q.id,name:q.name,icon:'⭐',type:q.type,goal:q.type==='minutes'?q.goal:undefined,xp:8,required:true,desc:'사용자 추가 퀘스트'});
return a.filter(x=>x.id!=='attendance'||p.work==='work').map(x=>({...x,goal:Math.max(1,x.goal||0)}));}
function actual(s,id){const raw=record(s).quests||{};return raw[id]}
function completed(s,q){const v=actual(s,q.id);if(q.type==='minutes')return Number(v)>=q.goal;if(q.type==='attendance')return v==='normal';return v===true}
function extraXp(s,q){if(q.type!=='minutes'||!completed(s,q))return 0;const inc=q.id==='exercise'?15:q.id==='read'?10:q.id==='write'?20:20,points=q.id==='exercise'?3:q.id==='read'?2:q.id==='write'?4:2,cap=q.id==='exercise'?15:q.id==='read'?10:q.id==='write'?20:10;return Math.min(cap,Math.floor(Math.max(0,Number(actual(s,q.id))-q.goal)/inc)*points)}
function summary(s){const qs=rules(s),req=qs.filter(q=>q.required),done=req.filter(q=>completed(s,q)).length,xp=qs.reduce((a,q)=>a+(completed(s,q)?q.xp+extraXp(s,q):0),0),bonus=qs.reduce((a,q)=>a+extraXp(s,q),0);return {total:req.length,done,pct:req.length?Math.round(done/req.length*100):0,xp,bonus,perfect:req.length>0&&done===req.length}}
function daysBetween(a,b){const result=[];if(b<a)return result;for(let s=a;s<=b;s=addDays(s,1)){result.push(s);if(result.length>1500)break}return result}
function reportDays(start,end){const t=dayNow(),from=start>START?start:START,to=end<t?end:t;return daysBetween(from,to).filter(s=>s<=END)}
function sumOfDays(days){let done=0,total=0,xp=0,extra=0,perfect=0;for(const s of days){const v=summary(s);done+=v.done;total+=v.total;xp+=v.xp;extra+=v.bonus;if(v.perfect)perfect++}return {days:days.length,done,total,xp,extra,perfect,pct:total?Math.round(done/total*100):0}}
function allStats(){return sumOfDays(reportDays(START,END))}
function streak(){let s=dayNow(),n=0;if(s<START)return 0;if(!summary(s).perfect)s=addDays(s,-1);while(s>=START&&summary(s).perfect){n++;s=addDays(s,-1);if(n>1500)break}return n}
function level(xp){return Math.floor(Math.sqrt(xp/100))+1}
function formatDay(s){const d=date(s);return `${d.getUTCFullYear()}년 ${d.getUTCMonth()+1}월 ${d.getUTCDate()}일 (${WEEKDAYS[d.getUTCDay()]})`}
function renderJourney(){const days=Math.max(0,Math.min(diffDays(START,END)+1,diffDays(START,dayNow())+1)),total=diffDays(START,END)+1;const v=Math.round(days/total*100);$('journey-progress').style.width=v+'%';$('journey-caption').textContent=days?'진행 중 · '+v+'%':'2026년 11월 9일 시작'}
function directive(s){const p=dayPlan(s),wd=p.wd,rs=record(s),v=summary(s),se=p.shift;
if(s<START)return ['시작 전, 준비하는 날','2026년 11월 9일부터 공식 기록이 시작됩니다. 지금도 체크를 연습할 수 있지만 누적 실적에는 포함하지 않습니다.'];
if(v.perfect)return ['오늘의 모든 필수 퀘스트 완료!','이제 충분히 쉬어도 됩니다. 과한 초과달성보다 꾸준히 이어가는 것이 목표예요.'];
if(p.work==='leave')return ['오늘은 승인된 연차입니다.','출근 점수 대신 회복과 집필 리듬을 지키세요. 계획된 휴식도 일정의 일부입니다.'];
if(p.work==='off')return ['쉬는 날에도 리듬은 이어집니다.','무리한 근력운동 대신 회복 활동을 하고, 읽기·집필·지출 확인으로 하루를 정리하세요.'];
if(p.work==='unknown')return ['오늘 근무 여부부터 확정하세요.','특히 토요일은 근무 여부가 미확정입니다. 달력에서 확인한 뒤 다른 퀘스트를 시작하세요.'];
if(se==='night')return ['야간 주간의 핵심은 수면과 지속성.','근무 전 짧게 웹소설을 읽고 집필하세요. 근무 중 가능한 시간에 운동하고, 퇴근 뒤에는 수면을 먼저 확보하세요.'];
if(se==='day')return ['주간 근무, 정해진 순서만 지키세요.','정상출근 → 운동 → 식사와 휴식 → 웹소설 집필·독서. 출근 후에도 무리 없이 끝낼 수 있는 순서로 진행하세요.'];
return ['오늘은 네 가지 목표만 생각하세요.','정상출근, 운동, 웹소설, 빚 관리. 근무조를 설정하면 주간·야간에 맞는 지침이 나타납니다.']}
function questCard(s,q){const v=actual(s,q.id),done=completed(s,q),more=extraXp(s,q),fut=!isPastOrToday(s),p=dayPlan(s);let control='';
if(q.type==='minutes'){const value=(Number(v)||0);control=`<button class="qbtn ${done?'done':''}" data-action="toggle-quest" data-id="${escapeHTML(q.id)}" ${fut?'disabled':''} aria-label="${escapeHTML(q.name)} 완료">${done?'✓ 완료':'○ 완료 체크'}</button><input class="qnum" type="number" inputmode="numeric" min="0" max="1440" step="5" aria-label="${escapeHTML(q.name)} 실제 시간(분)" data-time="${escapeHTML(q.id)}" value="${value}" ${fut?'disabled':''}><span class="qunit">/ ${q.goal}분</span><button class="qbtn" data-action="plus-time" data-id="${escapeHTML(q.id)}" data-add="10" ${fut?'disabled':''}>+10분</button>`}
else if(q.type==='attendance'){control=`<select class="status-select" aria-label="근태 상태" data-attendance ${fut?'disabled':''}><option value="" ${!v?'selected':''}>상태 기록 선택</option>${[['normal','✓ 정상출근'],['late','지각'],['early','조퇴'],['leave','연차'],['absence','결근']].map(([key,text])=>`<option value="${key}" ${v===key?'selected':''}>${text}</option>`).join('')}</select>`}
else control=`<button type="button" class="qbtn ${done?'done':''}" data-action="toggle-quest" data-id="${escapeHTML(q.id)}" ${fut?'disabled':''}>${done?'✓ 완료':'○ 완료 체크'}</button>`;
return `<article class="quest ${done?'completed':''} ${more?'overtime':''}"><div class="qicon">${q.icon}</div><div class="qcontent"><div class="qtop"><b>${escapeHTML(q.name)}</b><span class="xp">+${q.xp}${more?' +'+more:''} XP</span></div><p class="qdesc">${escapeHTML(q.desc)}</p><div class="qactions">${control}</div></div></article>`}
function renderToday(){const p=dayPlan(selected),info=directive(selected),v=summary(selected),total=allStats();$('setup-alert').classList.toggle('hidden',!!db.settings.baseShift);$('selected-date').value=selected;$('hero-date').textContent=formatDay(selected);$('directive-title').textContent=info[0];$('directive-body').textContent=info[1];let tags=[];tags.push(`<span class="tag ${p.shift==='night'?'night':''}">${p.shift==='day'?'☀ 주간 근무조':p.shift==='night'?'🌙 야간 근무조':'? 근무조 미설정'}</span>`);tags.push(`<span class="tag ${p.work==='off'||p.work==='leave'?'off':p.work==='unknown'?'warn':''}">${p.work==='work'?'출근 예정':p.work==='off'?'휴무일':p.work==='leave'?'연차': '근무 미확정'}</span>`);if(p.reference)tags.push(`<span class="tag off">📅 ${escapeHTML(p.reference)}</span>`);if(selected<START)tags.push('<span class="tag warn">연습 기록 · 3년 실적에는 미포함</span>');$('hero-tags').innerHTML=tags.join('');
$('daily-score').textContent=v.pct+'%';$('daily-xp').textContent='+'+v.xp+' XP 획득';$('daily-ring').style.setProperty('--pct',v.pct+'%');$('daily-ring-numbers').textContent=v.done+'/'+v.total;$('quest-count').textContent=v.done+'/'+v.total;
$('metric-totalxp').innerHTML=total.xp+' <span class="sfx">XP</span>';$('metric-level').textContent='Lv. '+level(total.xp);$('metric-streak').innerHTML=streak()+' <span class="sfx">일</span>';$('metric-bonus').innerHTML='+'+total.extra+' <span class="sfx">XP</span>';
const qs=rules(selected),req=qs.filter(x=>x.required),bon=qs.filter(x=>!x.required);$('quest-list').innerHTML=req.map(x=>questCard(selected,x)).join('');let bonusHTML=bon.map(x=>questCard(selected,x)).join('');if(p.work==='unknown')bonusHTML=`<div class="quest neutral full-width"><div class="qicon">📅</div><div class="qcontent"><b>근무 일정 확인 필요</b><p class="qdesc">달력에서 오늘이 출근일인지 확인하세요. 근무 미확정 날짜에는 출근 퀘스트가 통계에 포함되지 않습니다.</p><button class="qbtn" type="button" data-action="edit-day-plan">날짜별 근무 설정</button></div></div>`+bonusHTML;
$('bonus-list').innerHTML=bonusHTML;$('daily-note').value=record(selected).note||'';$('note-date-label').textContent=selected;if(selected>dayNow())$('daily-note').disabled=true;else $('daily-note').disabled=!isPastOrToday(selected);
}
function renderCalendar(){const first=calendarMonth,firstWd=(date(first).getUTCDay()+6)%7,firstGrid=addDays(first,-firstWd),lastDay=addDays(shiftMonth(first,1),-1);$('calendar-month-label').textContent=first.slice(0,4)+'년 '+Number(first.slice(5,7))+'월';const labels=['월','화','수','목','금','토','일'];let html=labels.map(x=>`<div class="weekday">${x}</div>`).join('');const rows=Math.ceil((firstWd+Number(lastDay.slice(-2)))/7);for(let i=0;i<rows*7;i++){const s=addDays(firstGrid,i),p=dayPlan(s),v=summary(s),isM=s.slice(0,7)===first.slice(0,7),valid=isPastOrToday(s)&&s>=START;html+=`<button type="button" class="calday ${isM?'':'muted'} ${s===dayNow()?'today':''} ${s===selected?'selected':''}" data-cal-date="${s}" aria-label="${formatDay(s)} 기록 ${valid?v.pct+'퍼센트':'미집계'}"><span class="day-number">${Number(s.slice(-2))}</span><small class="calendar-chip ${p.shift==='night'?'night':''}">${p.shift==='day'?'☀ 주':p.shift==='night'?'☾ 야':'미설정'}</small><small>${p.work==='off'?'휴무':p.work==='leave'?'연차':p.work==='unknown'?'미확정':p.reference?'회사 일정':'근무'}</small><span class="scorebar"><i style="width:${valid?v.pct:0}%"></i></span></button>`}
$('calendar-grid').innerHTML=html;const o=db.overrides[selected]||{},p=dayPlan(selected);$('calendar-selected-label').textContent=formatDay(selected)+' · '+(p.shift==='day'?'주간':p.shift==='night'?'야간':'근무조 미설정')+' · '+(p.work==='work'?'근무 예정':p.work==='off'?'휴무':p.work==='leave'?'연차':'미확정');$('work-override').value=o.work||'auto';$('shift-override').value=o.shift||'auto';$('company-reference').textContent=p.reference?'📄 2027년 생산예정표 참고: '+p.reference+' (실제 근무 여부는 확인 후 수정)':'📄 참고 일정 없음. 토요일 근무 여부는 사용자 확인이 필요합니다.'}
function byTask(days){const m={};for(const s of days){for(const q of rules(s)){if(!q.required)continue;if(!m[q.id])m[q.id]={name:q.name.replace('회복 운동','운동'),done:0,total:0};m[q.id].total++;if(completed(s,q))m[q.id].done++}}return Object.values(m)}
function statRows(days){const data=byTask(days);return data.length?data.map(x=>{const pct=Math.round(x.done/x.total*100);return `<div class="analytics-item"><b>${escapeHTML(x.name)}</b><div class="progressline" style="margin:0;height:8px"><i style="width:${pct}%"></i></div><div class="count">${x.done}/${x.total} · ${pct}%</div></div>`}).join(''):'<p class="foot-note">아직 집계할 날짜가 없습니다.</p>'}
function tile(label,value,suffix){return `<div class="report-tile"><small>${escapeHTML(label)}</small><strong>${escapeHTML(String(value))}${suffix?` <span style="font-size:12px;color:var(--muted)">${escapeHTML(suffix)}</span>`:''}</strong></div>`}
function weekData(){return reportDays(reportWeek,addDays(reportWeek,6))}
function renderReports(){const wDays=weekData(),w=sumOfDays(wDays);$('week-label').textContent=reportWeek.slice(5).replace('-','/')+' ~ '+addDays(reportWeek,6).slice(5).replace('-','/');$('weekly-tiles').innerHTML=tile('필수 퀘스트 달성률',w.pct+'%')+tile('완벽하게 완료한 날',w.perfect,'일')+tile('획득 경험치',w.xp,'XP');let weekHTML='';for(let i=0;i<7;i++){const s=addDays(reportWeek,i),p=dayPlan(s),v=summary(s),started=s>=START&&s<=dayNow();weekHTML+=`<div class="week-day"><small>${['월','화','수','목','금','토','일'][i]}</small><strong>${Number(s.slice(-2))}</strong><span class="spot ${started&&v.perfect?'hit':''}"></span><small>${started?v.pct+'%':'–'}</small></div>`} $('weekly-days').innerHTML=weekHTML;$('weekly-quest-stats').innerHTML=statRows(wDays);
const mEnd=addDays(shiftMonth(reportMonth,1),-1),mDays=reportDays(reportMonth,mEnd),m=sumOfDays(mDays);$('report-month-label').textContent=reportMonth.slice(0,4)+'년 '+Number(reportMonth.slice(5,7))+'월';$('monthly-tiles').innerHTML=tile('월간 달성률',m.pct+'%')+tile('완수한 날',m.perfect,'일')+tile('누적 경험치',m.xp,'XP');$('monthly-quest-stats').innerHTML=statRows(mDays);
const year=reportMonth.slice(0,4);let h='';for(let i=1;i<=12;i++){const sm=year+'-'+String(i).padStart(2,'0')+'-01',mm=sumOfDays(reportDays(sm,addDays(shiftMonth(sm,1),-1)));h+=`<div class="month-column"><span>${mm.days?mm.pct+'%':'–'}</span><div class="bar-track"><span style="height:${mm.days?mm.pct:0}%"></span></div><small>${i}월</small></div>`}$('year-bars').innerHTML=h;
}
function renderSettings(){authUI(); $('base-date').value=db.settings.baseDate;$('base-shift').value=db.settings.baseShift;$('sat-default').value=db.settings.saturday;for(const id of ['exercise','read','write','sleep'])$('goal-'+id).value=db.settings.goals[id];$('custom-list').innerHTML=db.custom.length?db.custom.map(x=>`<div class="template-row"><div><b>${escapeHTML(x.name)}</b><p>${x.type==='minutes'?x.goal+'분':'완료 체크'} · ${x.active===false?'비활성':'활성'}</p></div><button class="secondary" data-action="toggle-custom" data-id="${escapeHTML(x.id)}" type="button">${x.active===false?'활성화':'비활성화'}</button></div>`).join(''):'<p class="foot-note">등록한 추가 퀘스트가 없습니다.</p>'}
function render(){renderJourney();renderToday();renderCalendar();renderReports();renderSettings()}
function changeTab(t){if(!['today','calendar','reports','settings'].includes(t))return;tab=t;document.querySelectorAll('.section').forEach(x=>x.classList.toggle('active',x.id==='page-'+tab));document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));$('page-location').textContent=({today:'TODAY',calendar:'CALENDAR',reports:'REPORT',settings:'SETTINGS'})[tab];if(t==='calendar')calendarMonth=monthStart(selected);if(t==='reports'){reportWeek=weekStart(selected);reportMonth=monthStart(selected)}render();window.scrollTo({top:0,behavior:'smooth'})}
function updateQuest(id,v){if(!isPastOrToday(selected)){showToast('프로젝트 기간 내 오늘 또는 지난 날짜에만 기록할 수 있습니다.');return}const qs=rules(selected),q=qs.find(x=>x.id===id);if(!q)return;const curr={...(record(selected).quests||{})};if(q.type==='minutes'){let n=Number(v);if(!Number.isFinite(n)||n<0||n>1440){showToast('실제 시간은 0~1440분 사이로 입력하세요.');render();return}curr[id]=Math.round(n)}else curr[id]=v;put(selected,{quests:curr})}
function makeReport(){const a=weekData(),s=sumOfDays(a),lines=byTask(a).map(x=>`- ${x.name}: ${x.done}/${x.total}회`);let notes=a.map(d=>record(d).note?`${d}: ${record(d).note.slice(0,200)}`:'').filter(Boolean);return `3년 인생 재건 프로젝트 주간 보고 (${reportWeek}~${addDays(reportWeek,6)})\n필수 퀘스트 달성률: ${s.pct}% (${s.done}/${s.total})\n완수한 날: ${s.perfect}일\n획득 XP: ${s.xp}\n퀘스트별 실적:\n${lines.join('\n')}\n일지:\n${notes.join('\n')||'없음'}\n이 실적에 맞춰 직장·운동·웹소설·빚 상환 네 가지를 우선으로 다음 주 실행 지침을 내려줘. 무리한 추가 프로젝트는 제외해.`}
async function copyReport(){const content=makeReport();try{await navigator.clipboard.writeText(content);showToast('주간 보고문을 복사했어요. ChatGPT에 붙여넣으세요.')}catch(e){const t=document.createElement('textarea');t.value=content;document.body.appendChild(t);t.select();let ok=document.execCommand('copy');t.remove();if(ok)showToast('주간 보고문을 복사했어요.');else window.prompt('이 내용을 복사해 ChatGPT에 붙여넣으세요.',content)}}
function exportData(){const blob=new Blob([JSON.stringify({...db,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='life-quest-backup-'+dayNow()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);showToast('백업 파일을 저장했어요.')}
async function importData(file){if(!file)return;try{const raw=await file.text();if(raw.length>3000000)throw new Error('파일 크기가 너무 큽니다');const obj=JSON.parse(raw);if(!obj||obj.version!==1||!obj.settings||!obj.days||!obj.overrides||!Array.isArray(obj.custom)||typeof obj.days!=='object'||Array.isArray(obj.days))throw new Error('백업 파일 형식이 맞지 않습니다.');if(!confirm('현재 모든 기록을 선택한 백업으로 교체할까요?'))return;db={...fresh(),...obj,settings:{...fresh().settings,...obj.settings,goals:{...G,...obj.settings.goals}}};if(!save())throw new Error('저장 실패');render();showToast('백업 복원을 완료했습니다.')}catch(e){showToast('복원 실패: '+e.message)}finally{$('import-file').value=''}}
function handler(action,btn){if(action==='cloud-login'){loginCloud(false);return}if(action==='cloud-signup'){loginCloud(true);return}if(action==='cloud-pull'){if(dirty&&!confirm('기기에 아직 동기화되지 않은 기록이 있습니다. 서버 기록을 확인할까요?'))return;connectCloud();return}if(action==='cloud-overwrite'){overwriteCloud();return}if(action==='cloud-logout'){logoutCloud();return}switch(action){case 'prev-day':selected=addDays(selected,-1);render();break;case 'next-day':selected=addDays(selected,1);render();break;case 'go-today':selected=dayNow();render();break;case 'toggle-quest':{const q=rules(selected).find(x=>x.id===btn.dataset.id);if(!q)return;updateQuest(q.id,q.type==='minutes'?(completed(selected,q)?0:q.goal):!completed(selected,q));break}case 'plus-time':{const q=rules(selected).find(x=>x.id===btn.dataset.id);if(q){const current=Number(actual(selected,q.id))||0;updateQuest(q.id,Math.min(1440,current+Number(btn.dataset.add||10)))}break}case 'prev-month':calendarMonth=shiftMonth(calendarMonth,-1);renderCalendar();break;case 'next-month':calendarMonth=shiftMonth(calendarMonth,1);renderCalendar();break;case 'prev-week':reportWeek=addDays(reportWeek,-7);renderReports();break;case 'next-week':reportWeek=addDays(reportWeek,7);renderReports();break;case 'prev-report-month':reportMonth=shiftMonth(reportMonth,-1);renderReports();break;case 'next-report-month':reportMonth=shiftMonth(reportMonth,1);renderReports();break;case 'copy-week':copyReport();break;case 'edit-day-plan':calendarMonth=monthStart(selected);changeTab('calendar');break;case 'save-override':{const work=$('work-override').value,shift=$('shift-override').value;if(work==='auto'&&shift==='auto')delete db.overrides[selected];else db.overrides[selected]={work,shift};save();render();showToast('날짜별 근무 설정을 저장했어요.');break}case 'save-settings':{const baseDate=$('base-date').value,baseShift=$('base-shift').value,saturday=$('sat-default').value;if(!/^\d{4}-\d{2}-\d{2}$/.test(baseDate)||date(baseDate).getUTCDay()!==1){showToast('교대 기준 날짜는 월요일이어야 합니다.');return}const goals={};for(const [k,min,max] of [['exercise',1,240],['read',1,240],['write',1,300],['sleep',60,900]]){const v=Number($('goal-'+k).value);if(!Number.isInteger(v)||v<min||v>max){showToast('목표 시간을 범위 내 정수로 입력하세요.');return}goals[k]=v}db.settings={baseDate,baseShift,saturday,goals};save();render();showToast('설정을 저장했어요.');break}case 'add-custom':{const name=$('custom-name').value.trim(),type=$('custom-type').value,goal=Number($('custom-goal').value);if(!name||name.length>35){showToast('퀘스트 이름을 입력하세요.');return}if(type==='minutes'&&(!Number.isInteger(goal)||goal<1||goal>999)){showToast('목표 시간을 입력하세요.');return}if(db.custom.filter(x=>x.active!==false).length>=12){showToast('추가 퀘스트는 최대 12개까지 활성화할 수 있어요.');return}db.custom.push({id:'user_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),name,type,goal:type==='minutes'?goal:undefined,active:true,created:dayNow()<START?START:dayNow(),periods:[{start:dayNow()<START?START:dayNow(),end:null}]});$('custom-name').value='';save();render();showToast('나만의 퀘스트를 추가했어요.');break}case 'toggle-custom':{const q=db.custom.find(x=>x.id===btn.dataset.id);if(q){const next=q.active===false; if(!Array.isArray(q.periods)){q.periods=[{start:q.created||START,end:q.active===false?dayNow():null}]}if(next)q.periods.push({start:dayNow()<START?START:dayNow(),end:null});else{const span=q.periods[q.periods.length-1];if(span&&!span.end)span.end=dayNow()<START?START:dayNow()}q.active=next;save();render()}break}case 'export':exportData();break;case 'import':$('import-file').click();break;case 'reset':{if(!confirm('모든 퀘스트 기록·설정을 영구 삭제할까요? 백업 없이는 복구할 수 없습니다.'))return;if(!confirm('최종 확인: 정말 초기화하시겠어요?'))return;db=fresh();selected=dayNow();save();render();showToast('초기화했습니다.');break}case 'open-baseline':$('modal-baseline').value=db.settings.baseShift;$('baseline-modal').classList.remove('hidden');break;case 'close-baseline':$('baseline-modal').classList.add('hidden');break;case 'set-baseline':{const v=$('modal-baseline').value;if(!v){showToast('주간 또는 야간을 선택하세요.');return}db.settings.baseDate=START;db.settings.baseShift=v;save();$('baseline-modal').classList.add('hidden');render();showToast('교대 기준을 설정했어요.');break}}
}
document.addEventListener('click',ev=>{const nav=ev.target.closest('[data-tab]');if(nav){changeTab(nav.dataset.tab);return}const c=ev.target.closest('[data-cal-date]');if(c){selected=c.dataset.calDate;calendarMonth=monthStart(selected);changeTab('calendar');return}const b=ev.target.closest('[data-action]');if(b)handler(b.dataset.action,b)});
document.addEventListener('change',ev=>{const t=ev.target;if(t.id==='selected-date'&&t.value){selected=t.value;render()}if(t.matches('[data-attendance]'))updateQuest('attendance',t.value);if(t.matches('[data-time]'))updateQuest(t.dataset.time,Number(t.value));if(t.id==='custom-type')$('custom-goal-wrapper').style.display=t.value==='minutes'?'block':'none';if(t.id==='import-file')importData(t.files[0]);});
let inputTimer;document.addEventListener('input',ev=>{if(ev.target.id==='daily-note'){clearTimeout(inputTimer);const content=ev.target.value,s=selected;inputTimer=setTimeout(()=>{if(isPastOrToday(s)){db.days[s]={...record(s),note:content};save()}},400)}});
window.addEventListener('beforeunload',()=>{clearTimeout(inputTimer);if($('daily-note')&&isPastOrToday(selected)){const newText=$('daily-note').value;if(newText!==(record(selected).note||'')){db.days[selected]={...record(selected),note:newText};save()}}});
window.addEventListener('storage',e=>{if(e.key===KEY){db=load();render();showToast('다른 탭에서 수정한 기록을 반영했어요.')}});
render();bootCloud();if('serviceWorker' in navigator && location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
