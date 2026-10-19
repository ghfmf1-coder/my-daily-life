/* 작은 도구함 운영 콘솔 v1.2 — Cloudflare RUM 읽기 전용 API 연결 */
(() => {
  'use strict';
  const STORAGE_KEY = 'small-toolbox-admin-v1'; // keep browser data from earlier releases
  const VIEWS = {overview:'전체 현황',sites:'사이트 관리',domains:'도메인 관리',ideas:'아이디어 검토',tasks:'작업 관리',traffic:'방문자 분석',metrics:'성과 기록',policies:'정책·색인',maintenance:'자동 유지보수',promotion:'홍보 운영',settings:'백업·설정'};
  const STATUS = {
    site:{review:'상태 확인',planning:'기획',build:'개발 중',testing:'테스트',live:'운영 중',paused:'중단'},
    domain:{planned:'구매 예정',registered:'등록 완료',connected:'DNS 연결',issue:'문제 확인',expired:'만료'},
    idea:{research:'조사 중',approved:'개발 승인',hold:'보류',rejected:'제외'},
    task:{todo:'할 일',doing:'진행 중',done:'완료'},
    index:{unknown:'미확인',none:'미등록',requested:'등록 요청',indexed:'색인 확인',issue:'문제 확인'},
    policy:{unchecked:'미검토',pass:'검토 완료',review:'재검토 필요',issue:'정책 위험'}
  };
  const today = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const nowIso = () => new Date().toISOString();
  const uid = () => (globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const textOrDash = s => (s === null || s === undefined || s === '') ? '—' : esc(s);
  const fmt = v => Number(v).toLocaleString('ko-KR');
  const money = v => Number(v).toLocaleString('ko-KR',{style:'currency',currency:'KRW',maximumFractionDigits:0});
  const safeUrl = s => {try{const u = new URL(String(s||''));return ['http:','https:'].includes(u.protocol) ? u.href : '';}catch{return '';}};
  const link = (url,label,cls='text-link') => safeUrl(url) ? `<a class="${cls}" href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>` : '<span class="status-text">미등록</span>';
  const badge = (value,map) => `<span class="badge ${esc(value||'na')}">${esc(map[value] || '미확인')}</span>`;
  const compact = s => String(s||'').trim().slice(0,2500);
  const dateText = s => String(s||'').slice(0,10) || '—';
  let view = 'overview';
  let editor = null;
  let storageWorks = true;
  let state;
  const googleAdsView={started:false,busy:false,configured:null,connected:null,accounts:[],results:[],error:'',customer:'',seeds:'웹소설 연재, CSV 병합',country:'KR'};
  const analyticsView = {days: 1, loading: false, started: false, data: null, error: ''};
  const maintenance = {data:null,error:'첫 자동 점검을 기다리고 있습니다.'};
  const promotion={data:null,error:''};

  // 과거 대화에서 실제로 검토한 이름·제약만 기록. 승인 또는 수요 검증으로 간주하지 않는다.
  const SEED_IDEAS = [
    ['원고반복검사기','원고에서 반복 표현·문장 및 문단을 수작업으로 찾는 불편','중복·반복 표현을 표시하고 수정하기 편한 하이라이트','낮음~중간. 기존 편집기의 기능이 충분하거나 국내 검색 수요가 부족하면 실패','로컬 처리, 문단·반복 구간 강조','research','mid'],
    ['CSV맞춤병합기','제각각 다른 컬럼명·파일 구조를 수작업으로 정리하고 병합하는 번거로움','업무상 여러 CSV 파일을 합치기 위한 도구 검토. 정량 검색 수요 미확인','Microsoft Power Query 및 무료 CSV 도구 경쟁. 차별화 실패 시 이용 가치 감소','컬럼 매핑·중복 검사·병합을 한 작업으로 제공','research','mid'],
    ['함께쉬는날','교대근무자가 서로 겹치는 휴무를 수기로 계산하는 불편','실제 일정 충돌 문제를 검토. 국내 검색량 원천 데이터 없음','이미 공통 휴무를 찾아주는 근무표 앱 존재','서로 다른 순환 주기와 기준일을 넣어 공통 휴일 확인','hold','mid'],
    ['자막일괄정리기','여러 SRT/VTT 자막의 시간차·겹침·형식 오류를 반복 수정하는 불편','자막 동기화 불편을 검토했으나 정량 수요 없음','무료 전문 편집기·온라인 변환 도구 다수','파일 묶음에서 검증·보정·변환 연속 수행','hold','mid'],
    ['아이폰사양비교','아이폰 모델별 크기·무게·카메라·기능을 여러 페이지에서 대조하는 불편','사용자가 제안한 후보. Apple 공식 사양을 원천 자료로 삼는 방식 검토','공식 Apple 비교 페이지와 검색엔진 직접 답변이 경쟁','공식 근거 링크 포함, 원하는 모델 여러 개 나란히 비교','research','mid'],
    ['의약품정보검색','제품·성분 정보와 주의사항을 공식 자료에서 찾는 수고','사용자가 제안한 후보. 검색량·사업성 미검증','약학정보원·식약처 공식 서비스와 경쟁. 의료정보 정확성 위험','공식 자료 탐색 보조로 제한, 의학적 판단 제공하지 않음','hold','high'],
    ['포켓몬카드시세조회','카드별 가격 비교·거래 자료를 직접 찾아야 하는 불편','사용자가 제안한 후보. 시세 원천 데이터 이용 권한 미확보','시세 API/라이선스/갱신 비용 문제로 실시간 정보 신뢰성 확보 어려움','권한 확보된 출처와 갱신 시각 제공 필요','hold','high'],
    ['영화장면사진검색','영화의 한 장면만 알고 제목을 몰라 찾기 어려운 불편','사용자가 업로드한 영화 스틸로 제목을 찾는 아이디어를 제안','Google Lens 등 강력한 경쟁과 이미지 인식 API 비용·저작권 문제','식별 신뢰도·근거를 안내하는 영화 정보 검색','hold','high'],
    ['이미지일괄변환기','이미지를 여러 장 일괄 크기 변경·포맷 변환하는 번거로움','2026-10-12 초기 도구 후보로 검토; 정량 수요 미확인','이미 온라인 일괄 변환기 많음. 사용자 가치 차별화 필요','브라우저 내 일괄처리, 프리셋 및 ZIP 저장','research','low'],
    ['PDF페이지편집도구','PDF에서 페이지를 재정렬·추출·삭제하기 번거로움','2026-10-12 후보 검토; 실제 검색량 미확인','기존 PDF 온라인 툴 경쟁 강함','브라우저에서 파일을 전송하지 않고 페이지별 편집','research','mid'],
    ['교대근무일정생성기','반복 근무 주기를 달력으로 옮기기 귀찮음','2026-10-12 후보 검토','동일 기능의 기존 서비스 다수. 몇 초 계산 수준의 단순도구는 제외 원칙','복잡한 패턴 저장·일정 내보내기를 포함해야 차별화','hold','mid'],
    ['게임제작계산도구','신작 게임의 제작 재료와 단계별 소모량을 수기로 합산하는 불편','2026-10-12 검토. 공식 원천 게임 데이터 확보 전 개발 비추천','업데이트마다 데이터 관리가 필요하며 실제 수요 미확인','확인된 레시피 데이터가 있을 때만 다단계 제작 경로 산출','hold','mid']
  ];
  function seedIdeaRecords(){
    return SEED_IDEAS.map(([title,problem,evidence,competition,difference,status,effort],i)=>({
      id:`history-20261013-${i+1}`,title,problem,evidence,
      competition,difference,status,effort,sourceUrl:'',
      notes:'과거 사용자·AI 대화에서 검토한 후보. 외부 근거는 재검증 필요. 사용자 개발 승인 아님. 검색량·매출 원천 데이터 부재.',
      createdAt:'2026-10-13T00:00:00.000Z',updatedAt:'2026-10-13T00:00:00.000Z'
    }));
  }
  function mergeHistoricalIdeas(){
    if(state.historySeedVersion===1)return false;
    const existing=new Set(state.ideas.map(i=>String(i.title||'').replace(/\s/g,'').toLowerCase()));
    let added=0;
    for(const idea of seedIdeaRecords()){
      const key=idea.title.replace(/\s/g,'').toLowerCase();
      if(!existing.has(key)){state.ideas.push(idea);added++;}
    }
    state.historySeedVersion=1;
    return true;
  }
  function initialState(){
    return {version:3,historySeedVersion:1,domains:[],audits:[],auditUpdatedAt:'',auditSource:'',sites:[{
      id:uid(),name:'하루한칸',category:'루틴 · 생활 관리',status:'review',language:'한국어',
      url:'https://my-daily-life.pages.dev/',repo:'https://github.com/ghfmf1-coder/my-daily-life',
      host:'Cloudflare Pages',releaseDate:'',google:'unknown',naver:'unknown',policy:'unchecked',
      notes:'기존 GitHub 저장소에서 확인한 프로젝트입니다. 실제 운영·색인 상태와 접속 통계는 아직 검증되지 않았습니다.',
      createdAt:nowIso(),updatedAt:nowIso()
    }],ideas:seedIdeaRecords(),tasks:[],metrics:[],activity:[]};
  }
  function sanitizeRecord(obj,fields){
    const o = {};
    for(const key of fields){if(obj && Object.prototype.hasOwnProperty.call(obj,key)){
      const val = obj[key]; o[key] = typeof val==='number' && Number.isFinite(val) ? val : (val===null ? null : (typeof val==='string' ? val.slice(0,2500) : null));
    }}
    o.id = typeof o.id==='string' && o.id ? o.id : uid();
    return o;
  }
  const KEYS = {
    sites:['id','name','category','status','language','url','repo','host','releaseDate','google','naver','policy','notes','createdAt','updatedAt'],
    domains:['id','name','registrar','status','siteId','expiryDate','nameservers','notes','createdAt','updatedAt'],
    ideas:['id','title','problem','evidence','competition','difference','sourceUrl','effort','status','notes','createdAt','updatedAt'],
    tasks:['id','title','siteId','status','priority','dueDate','notes','createdAt','updatedAt'],
    metrics:['id','siteId','date','visitors','pageviews','returning','botFilter','impressions','clicks','revenue','source','notes','createdAt','updatedAt'],
    audits:['id','siteUrl','checkedAt','httpStatus','robots','sitemap','canonical','noindex','summary','source'],
    activity:['id','text','timestamp']
  };
  function load(){
    try {
      const str = localStorage.getItem(STORAGE_KEY);
      if(!str){state=initialState();save();return;}
      const obj=JSON.parse(str);
      state=normalize(obj);
      const old=state.sites.find(x=>x.repo==='https://github.com/ghfmf1-coder/my-daily-life' && x.url==='https://ghfmf1-coder.github.io/my-daily-life/');
      if(old){old.url='https://my-daily-life.pages.dev/';old.host='Cloudflare Pages';save();}
      if(mergeHistoricalIdeas())save();
    }catch(e){storageWorks=false;state=initialState();setTimeout(()=>toast('브라우저 저장소를 사용할 수 없습니다. 백업 내보내기를 반드시 사용하세요.'),400);}
  }
  function normalize(src){
    if(!src || ![1,2,3].includes(src.version) || !Array.isArray(src.sites)|| !Array.isArray(src.ideas)|| !Array.isArray(src.tasks)|| !Array.isArray(src.metrics))throw new Error('지원하지 않는 백업 파일');
    const out={version:3,historySeedVersion:src.historySeedVersion===1?1:0,auditUpdatedAt:String(src.auditUpdatedAt||'').slice(0,40),auditSource:String(src.auditSource||'').slice(0,400)};
    for(const type of Object.keys(KEYS))out[type]=Array.isArray(src[type])?src[type].slice(0,3000).filter(x=>x&&typeof x==='object'&&!Array.isArray(x)).map(x=>sanitizeRecord(x,KEYS[type])):[];
    if(!src.historySeedVersion){const existing=new Set(out.ideas.map(i=>String(i.title||'').replace(/\s/g,'').toLowerCase()));for(const i of seedIdeaRecords())if(!existing.has(i.title.replace(/\s/g,'').toLowerCase()))out.ideas.push(i);out.historySeedVersion=1;}
    return out;
  }
  function save(){
    try{
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
      storageWorks=true;
      if(window.TOOLBOX_CLOUD?.save)void window.TOOLBOX_CLOUD.save(state);
      return true;
    }
    catch(e){storageWorks=false;toast('저장 실패: 브라우저 저장 공간을 확인하고 JSON으로 백업하세요.');return false;}
  }
  function activity(label){state.activity.unshift({id:uid(),text:label.slice(0,160),timestamp:nowIso()});state.activity=state.activity.slice(0,60);}
  const host=document.getElementById('viewHost');
  const dlg=document.getElementById('editorDialog');
  const fields=document.getElementById('formFields');
  const form=document.getElementById('editorForm');
  let toastTimer;
  function toast(msg){const x=document.getElementById('toast');x.textContent=msg;x.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>x.classList.remove('show'),4200);}
  const button = (label,action,style='primary',attrs='') => `<button type="button" class="btn ${style}" data-action="${esc(action)}" ${attrs}>${esc(label)}</button>`;
  function header(title,description,buttons=''){return `<div class="page-intro"><div><p class="eyebrow">SMALL TOOLBOX / OPERATIONS</p><h1>${esc(title)}</h1><p class="desc">${esc(description)}</p></div><div class="actions">${buttons}</div></div>`;}
  function panel(title,caption,inside,action=''){return `<section class="panel"><div class="panel-header"><div><h2>${esc(title)}</h2>${caption?`<p>${esc(caption)}</p>`:''}</div>${action}</div>${inside}</section>`;}
  function empty(label,desc='등록 버튼으로 첫 기록을 추가하세요.'){return `<div class="empty-state"><div class="empty-icon">▤</div><strong>${esc(label)}</strong><p>${esc(desc)}</p></div>`;}
  function stats(title,num,sub,icon,color='') {return `<article class="stat-card"><div class="stat-top"><span>${esc(title)}</span><span class="stat-icon ${color}">${icon}</span></div><div class="stat-num">${esc(num)}</div><div class="stat-sub">${esc(sub)}</div></article>`;}
  function metricSummary(){
    const valid=state.metrics;
    const sum=(name)=> valid.reduce((a,r)=>a+(r[name]===null || r[name]===undefined || r[name]==='' ? 0 : Math.max(0,Number(r[name])||0)),0);
    const exists=name=>valid.some(r=>r[name]!==null&&r[name]!==undefined&&r[name]!=='');
    return {visitors:exists('visitors')?fmt(sum('visitors')):'미입력',impressions:exists('impressions')?fmt(sum('impressions')):'미입력',clicks:exists('clicks')?fmt(sum('clicks')):'미입력',revenue:exists('revenue')?money(sum('revenue')):'미입력'};
  }
  function recentSitesTable(items){
    return `<div class="table-scroll"><table><thead><tr><th>서비스명</th><th>상태</th><th>정책 검토</th><th>배포 링크</th></tr></thead><tbody>${items.map(s=>`<tr><td><div class="item-title">${esc(s.name)}</div><div class="sub-line">${esc(s.category||'분류 없음')}</div></td><td>${badge(s.status,STATUS.site)}</td><td>${badge(s.policy,STATUS.policy)}</td><td>${link(s.url,'열기 ↗')}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function overview(){
    const live=state.sites.filter(s=>s.status==='live').length;
    const issues=state.sites.filter(s=>s.policy==='issue'||s.google==='issue'||s.naver==='issue').length;
    const readyIdeas=state.ideas.filter(i=>i.status==='approved').length;
    const summary=metricSummary();
    const cards = `<div class="stats-grid">${stats('전체 사이트',fmt(state.sites.length),'등록한 서비스 수','▤')}${stats('운영 중',fmt(live),'상태가 운영 중인 사이트','↗','green')}${stats('점검 필요',fmt(issues),'정책 또는 색인 문제','!','amber')}${stats('승인된 아이디어',fmt(readyIdeas),'개발 대기 중인 후보','✧','pink')}</div>`;
    const recentTasks=state.tasks.filter(t=>t.status!=='done').sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')).slice(0,5);
    const taskList=recentTasks.length?`<div class="panel-body">${recentTasks.map(t=>`<div class="work-item"><span class="work-dot"></span><div><h3>${esc(t.title)}</h3><p>${esc(STATUS.task[t.status]||'할 일')} · ${t.dueDate?esc(t.dueDate):'기한 미지정'}</p></div></div>`).join('')}</div>`:empty('대기 중인 작업이 없습니다.');
    const activities=state.activity.slice(0,5);
    return header('운영 현황','우리가 만든 도구를 한곳에서 관리하고, 다음 작업을 결정합니다.',button('+ 사이트 등록','new-site')+button('+ 아이디어 추가','new-idea','secondary'))+
    (!storageWorks?'<div class="notice warn">⚠ 브라우저 저장소 접근이 차단되어 있습니다. 변경 내역이 보존되지 않을 수 있습니다. JSON 백업을 이용하세요.</div>':'')+
    maintenanceSummary()+
    '<div class="notice">📌 <strong>실제 데이터 원칙</strong> — 방문자·검색·수익 실적은 계정 연동 전까지 자동 수집되지 않습니다. 출처 없는 숫자는 표시하지 않고, 정책 준수·색인은 자동 판정하지 않습니다.</div>'+cards+
    `<div class="dashboard-shortcut"><span>도메인 관리</span> <strong>${state.domains.length}개 기록</strong> <button class="link-btn" data-action="goto" data-view="domains">구매·DNS 연결 현황 →</button></div>`+
    `<div class="cols"><div>${panel('사이트 포트폴리오','최근 수정된 서비스',state.sites.length?recentSitesTable([...state.sites].sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||'')).slice(0,5)):empty('아직 사이트가 없습니다.'),`<button class="link-btn" data-action="goto" data-view="sites">전체 보기 →</button>`)}${panel('누적 수기 성과','입력한 날짜·사이트의 기록 합계이며 중복 입력값도 합산됩니다.',`<div class="panel-body"><div class="metric-grid"><div class="metric-box"><small>방문자</small><strong>${esc(summary.visitors)}</strong></div><div class="metric-box"><small>검색 노출</small><strong>${esc(summary.impressions)}</strong></div><div class="metric-box"><small>검색 클릭</small><strong>${esc(summary.clicks)}</strong></div><div class="metric-box"><small>수익 (KRW)</small><strong>${esc(summary.revenue)}</strong></div></div><div class="footnote">지표 입력 단위(일간)와 출처를 확인하세요. Google Search Console과 AdSense는 연결되지 않았습니다.</div></div>`,`<button class="link-btn" data-action="goto" data-view="metrics">성과 기록 →</button>`)}</div><div>${panel('우선 작업','완료되지 않은 할 일',taskList,`<button class="link-btn" data-action="new-task">+ 할 일</button>`)}${panel('최근 변경','운영 기록',activities.length?`<div class="panel-body">${activities.map(t=>`<div class="work-item"><span class="work-dot done"></span><div><h3>${esc(t.text)}</h3><p>${esc(dateText(t.timestamp))}</p></div></div>`).join('')}</div>`:empty('아직 변경 내역이 없습니다.'))}</div></div>`;
  }
  function maintenanceSummary(){
    if(!maintenance.data || maintenance.data.status==='pending')
      return '<div class="notice">⏳ 자동 유지보수 첫 점검을 준비 중입니다. 최근 결과를 불러올 때까지 기다려 주세요.</div>';
    const report=maintenance.data,summary=report.summary||{};
    const age=Date.now()-Date.parse(report.checkedAt||0),stale=!Number.isFinite(age)||age>48*3600000;
    const level=stale?'상태 미확인 (48시간 이상 경과)':report.status==='fail'?'문제 발견':report.status==='warning'?'경고 있음':'정상';
    const color=stale||report.status==='fail'?'warn':'';
    return '<div class="notice '+color+'"><strong>🔎 최근 자동 점검: '+esc(level)+'</strong> · '+
      esc((report.checkedAt||'').replace('T',' ').slice(0,16))+' UTC<br>'+
      '점검 사이트 '+esc(summary.sites||0)+'개 · 사이트 오류 '+esc(summary.siteFailed||0)+'개 · '+
      '브라우저 테스트 '+esc(summary.browserPassed||0)+'개 통과 / '+esc(summary.browserFailed||0)+'개 실패'+
      ' · 상세 문제 '+esc(summary.issues||0)+'건'+
      '<div style="margin-top:8px">'+link('https://github.com/ghfmf1-coder/my-daily-life/actions/workflows/toolbox-health.yml','GitHub 자동 점검 이력 ↗')+'</div></div>';
  }
  function maintenanceView(){
    const d=maintenance.data;
    const intro=header('자동 유지보수','매일 공개 사이트와 실제 브라우저 기능을 점검합니다. 결과는 Google 색인 상태를 뜻하지 않습니다.');
    if(!d||d.status==='pending')return intro+maintenanceSummary();
    const rows=(d.sites||[]).map(site=>{
      const failed=site.failures||[],warn=site.warnings||[];
      const detail=failed.length?failed.join(' / '):warn.length?warn.join(' / '):'자동 검증 항목 통과';
      const state=site.status==='fail'?'문제':site.status==='warning'?'경고':'통과';
      return '<tr><td><div class="item-title">'+esc(site.name||site.slug)+'</div><div class="sub-line">'+esc(site.slug)+'</div></td><td>'+esc(state)+'</td><td>'+esc((site.checks||[]).length)+'항목</td><td>'+esc(detail.slice(0,350))+'</td><td>'+link(site.url,'열기 ↗')+'</td></tr>';
    }).join('');
    const browserRows=(d.browserChecks||[]).map(t=>'<tr><td>'+esc(t.name)+'</td><td>'+esc(t.device||'')+'</td><td>'+
      esc(t.status==='pass'?'통과':'실패')+'</td><td>'+esc((t.detail||'').slice(0,250))+'</td></tr>').join('');
    return intro+maintenanceSummary()+
      panel('사이트별 점검','응답·검색·보안·아이콘·파일 검증',
        '<div class="table-scroll"><table><thead><tr><th>사이트</th><th>결과</th><th>검사</th><th>상세</th><th>링크</th></tr></thead><tbody>'+rows+'</tbody></table></div>')+
      panel('브라우저 기능 테스트','로그인 없이 PC·모바일에서 실행하고 개인정보는 사용하지 않습니다.',
        '<div class="table-scroll"><table><thead><tr><th>검사</th><th>기기</th><th>결과</th><th>상세</th></tr></thead><tbody>'+browserRows+'</tbody></table></div>')+
      '<div class="notice">ℹ 새 도구는 제작 공장 등록 시 점검 목록에 자동 포함됩니다. 관리자에서만 수동 등록한 외부 주소는 별도 승인·등록 전까지 자동 점검하지 않습니다. 통과는 검색 색인 또는 완전한 무결성을 보장하지 않습니다.</div>';
  }
  async function refreshMaintenance(){
    try{
      const response=await fetch('/maintenance-report.json',{cache:'no-store'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const payload=await response.json();
      if(!payload||!payload.summary||!Array.isArray(payload.sites))throw Error('Invalid maintenance report');
      maintenance.data=payload;maintenance.error='';
    }catch(ex){maintenance.error=String(ex.message||ex);}
    if(view==='maintenance'||view==='overview')render();
  }

  function promotionView(){
    const p=promotion.data;
    let content=header('홍보 운영','사이트별 한국어·영어 홍보 문안과 허용되는 배포 채널을 준비합니다. 실제 외부 게시 전에 운영자 확인이 필요합니다.');
    content+='<div class="notice"><strong>✅ 자동 준비, ✋ 게시 전 최종 확인</strong> — 도구 소개·유입 확인용 링크는 자동 생성합니다. 관련 없는 게시판 자동 댓글, 무차별 게시, 가짜 평가, 업보트 요청은 하지 않습니다. Google·네이버 색인 여부는 별도 검증이 필요합니다.</div>';
    if(!p)return content+'<div class="notice warn">⏳ '+esc(promotion.error||'홍보 계획을 불러오는 중입니다.')+'</div>';
    const known=new Map((p.channels||[]).map(x=>[x.id,x]));
    for(const tool of p.sites||[]){
      const needs=tool.status!=='draft-ready';
      const chunks=['<div class="panel-body">',
        '<div class="item-title">'+esc(tool.title)+'</div>',
        '<p class="status-text">'+esc(tool.url)+'</p>'];
      if(needs){
        chunks.push('<div class="notice warn">홍보 문안의 실제 기능·정책 확인이 필요합니다. 검증 전 자동 게시하거나 복사본을 생성하지 않습니다.</div>');
      }else{
        for(const lang of tool.langs||[]){
          const draft=tool.copy?.[lang];
          if(!draft)continue;
          chunks.push('<div class="detail-note" style="margin:13px 0">',
            '<h3>'+esc(lang==='ko'?'한국어 홍보 문안':'English promotion draft')+'</h3>',
            '<p style="white-space:pre-line">'+esc(draft.title)+'</p>',
            '<p style="white-space:pre-line;margin-top:9px">'+esc(draft.copy)+'</p>',
            '<button type="button" class="btn secondary" data-action="promo-copy" data-slug="'+esc(tool.slug)+'" data-lang="'+esc(lang)+'" data-channel="community">문안 + 홍보 링크 복사</button>',
            '</div>');
        }
        chunks.push('<h3 style="margin:18px 0 9px">배포 채널 (게시 전 규칙 확인)</h3>');
        for(const id of tool.recommendedChannels||[]){
          const ch=known.get(id);if(!ch)continue;
          chunks.push('<div class="work-item"><span class="work-dot"></span><div>',
            '<h3>'+esc(ch.name)+' · '+esc(ch.audience)+'</h3>',
            '<p>'+esc(ch.mode)+' · '+esc(ch.rule)+'</p>',
            '<div style="margin:6px 0">'+link(ch.url,'공식 안내 ↗')+'</div>',
            '<button type="button" class="btn small secondary" data-action="promo-copy" data-slug="'+esc(tool.slug)+'" data-lang="en" data-channel="'+esc(id)+'">English 문안과 전용 링크 복사</button>',
            '</div></div>');
        }
      }
      chunks.push('</div>');
      content+=panel(tool.title,needs?'검토 대기':'한국어·영어 초안 준비 완료',chunks.join(''));
    }
    return content;
  }
  async function refreshPromotion(){
    try{
      const response=await fetch('/promotion-packets.json',{cache:'no-store'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const data=await response.json();
      if(!data || !Array.isArray(data.sites) || !Array.isArray(data.channels))throw Error('잘못된 홍보 데이터 형식');
      promotion.data=data;promotion.error='';
    }catch(ex){promotion.error=String(ex.message||ex)}
    if(view==='promotion')render();
  }
  async function copyPromotion(slug,lang,channel){
    const tool=promotion.data?.sites?.find(x=>x.slug===slug);
    const draft=tool?.copy?.[lang],source=tool?.shareLinks?.[channel]?.[lang];
    if(!draft || !source){toast('이 언어 또는 홍보 채널에 준비된 문안이 없습니다.');return;}
    const text=[draft.title,'',draft.copy,'',source].join('\n');
    try{await navigator.clipboard.writeText(text);toast('문안과 전용 링크를 복사했습니다. 게시판 정책 확인 후 직접 게시하세요.');}
    catch{toast('클립보드 권한이 없어 복사하지 못했습니다. 브라우저 권한을 확인하세요.');}
  }
  const tiny = (type,id) => `<div class="split-actions"><button class="tiny-action" data-action="edit-${type}" data-id="${esc(id)}">수정</button><button class="tiny-action danger-text" data-action="delete-${type}" data-id="${esc(id)}">삭제</button></div>`;
  function sites(){
    const rows=state.sites.map(s=>`<tr data-search="${esc([s.name,s.category,s.language,s.url].join(' ').toLowerCase())}" data-status="${esc(s.status)}"><td><div class="item-title">${esc(s.name)}</div><div class="sub-line">${esc(s.category||'미분류')} · ${esc(s.language||'언어 미입력')}</div></td><td>${badge(s.status,STATUS.site)}</td><td>${esc(s.host||'미기록')}</td><td>${badge(s.google,STATUS.index)}</td><td>${badge(s.policy,STATUS.policy)}</td><td>${link(s.url,'사이트 ↗')} <span class="hide-mobile">${link(s.repo,'GitHub ↗')}</span></td><td>${tiny('site',s.id)}</td></tr>`).join('');
    return header('사이트 관리','도메인, 배포, 검색 색인, 정책 상태까지 서비스 단위로 기록합니다.',button('+ 새 사이트','new-site'))+
    `<div class="toolbar"><input id="searchInput" class="search-field" placeholder="서비스명 · 카테고리 · 주소 검색" aria-label="사이트 검색" /><select class="filter" id="statusFilter" aria-label="상태 필터"><option value="">전체 상태</option>${Object.entries(STATUS.site).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div>`+
    panel('서비스 목록',`${state.sites.length}개 등록됨`,state.sites.length?`<div class="table-scroll"><table id="filterTable"><thead><tr><th>서비스</th><th>운영 상태</th><th>배포 환경</th><th>Google</th><th>정책</th><th>바로가기</th><th>관리</th></tr></thead><tbody>${rows}</tbody></table></div><div class="footnote" id="filterEmpty" style="padding:0 24px 20px;display:none">검색 결과가 없습니다.</div>`:empty('등록된 사이트가 없습니다.'));
  }
  function domains(){
    const sorted=[...state.domains].sort((a,b)=>(a.expiryDate||'9999-12-31').localeCompare(b.expiryDate||'9999-12-31'));
    const rows=sorted.map(d=>{
      const site=state.sites.find(s=>s.id===d.siteId);
      return `<tr><td><div class="item-title">${esc(d.name)}</div><div class="sub-line">${esc(d.registrar||'등록기관 미입력')}</div></td><td>${badge(d.status,STATUS.domain)}</td><td>${site?esc(site.name):'<span class="status-text">연결 사이트 미지정</span>'}</td><td>${esc(d.nameservers||'미입력')}</td><td>${esc(d.expiryDate||'미입력')}</td><td>${tiny('domain',d.id)}</td></tr>`;
    }).join('');
    return header('도메인 관리','도메인 구매 예정부터 DNS 연결·갱신일 관리까지 한곳에서 기록합니다.',button('+ 도메인 등록','new-domain'))+
      '<div class="notice">🌐 <strong>구매 예정 도메인은 실제 소유가 아닙니다.</strong> 등록 여부 및 DNS 정보는 가비아·Cloudflare에서 직접 확인한 뒤 갱신하세요. 이 메뉴는 자동 조회를 하지 않습니다.</div>'+
      panel('도메인 목록',`${state.domains.length}개 기록됨`,state.domains.length?`<div class="table-scroll"><table><thead><tr><th>도메인</th><th>진행 상태</th><th>연결 사이트</th><th>네임서버</th><th>만료일</th><th>관리</th></tr></thead><tbody>${rows}</tbody></table></div>`:empty('도메인이 아직 없습니다.','10월 15~16일 구매 예정인 도메인은 실제 구매한 뒤 등록해도 됩니다.'));
  }
  function googleAdsPanel(){
    const g=googleAdsView;
    const status=g.configured===false?'서버 인증 정보 확인 필요':g.connected===true?'Google 계정 연결 완료':g.connected===false?'Google 계정 승인 대기':'연결 상태 확인 전';
    const statusNote=g.error?'<p style="color:#b42318">오류: '+esc(g.error)+'</p>':'';
    const list=Array.isArray(g.results)?g.results:[];
    const rows=list.map(r=>'<tr><td>'+esc(r.keyword||'—')+'</td><td>'+
      (r.metrics?.avgMonthlySearches!==undefined?fmt(r.metrics.avgMonthlySearches):'미제공')+'</td><td>'+
      esc(r.metrics?.competition||'미제공')+'</td><td>'+
      (r.metrics?.lowTopOfPageBidMicros!==undefined?fmt((Number(r.metrics.lowTopOfPageBidMicros)||0)/1e6):'미제공')+'</td></tr>').join('');
    const options=g.accounts.map(s=>'<option value="'+esc(s)+'" '+(s===g.customer?'selected':'')+'>'+esc(s)+'</option>').join('');
    return panel('Google 키워드 데이터','Google Ads API Basic · 실시간 데이터만 표시',
      '<div class="panel-body">'+
      '<p><strong>연결 상태: '+esc(status)+'</strong></p>'+statusNote+
      '<div class="utility-buttons">'+
      button('연결 상태 확인','google-status','secondary')+
      button('Google 계정 권한 승인','google-start')+
      (g.connected?button('연결된 광고 계정 조회','google-accounts','secondary'):'')+
      '</div>'+
      (g.connected?'<p class="desc">인증된 계정이 접근할 수 있는 Google Ads 고객 ID 중 하나를 사용합니다.</p>'+
      '<label for="googleCustomer">Google Ads 고객 ID</label> '+
      (g.accounts.length?'<select id="googleCustomer"><option value="">계정 선택</option>'+options+'</select>':
      '<input id="googleCustomer" inputmode="numeric" placeholder="10자리 고객 ID" value="'+esc(g.customer)+'">')+
      '<label for="googleSeeds">조사할 키워드(쉼표 구분, 최대 20개)</label><input id="googleSeeds" value="'+esc(g.seeds)+'" style="width:100%;max-width:540px">'+
      '<label for="googleCountry">대상 국가</label><select id="googleCountry"><option value="KR" '+(g.country==='KR'?'selected':'')+'>대한민국</option><option value="US" '+(g.country==='US'?'selected':'')+'>미국</option></select>'+
      button('실제 검색량 조회','google-keywords')+
      (list.length?'<div class="table-scroll"><table><thead><tr><th>키워드</th><th>월평균 검색량</th><th>경쟁도</th><th>최저 상단 입찰가(통화 단위)</th></tr></thead><tbody>'+rows+'</tbody></table></div>':
      '<p class="desc">실제 API에서 조회한 키워드 결과는 여기에 표시됩니다. 미조회 상태에서 숫자를 만들지 않습니다.</p>'):'<p class="desc">먼저 Google 계정 권한 승인을 완료하세요. 암호화된 갱신 토큰은 서버에만 보관됩니다.</p>')+
      (g.busy?'<p class="desc">연결 및 조회 요청 처리 중…</p>':'')+
      '</div>'
    );
  }
  async function googleAdsStatus(){
    if(googleAdsView.busy)return;
    googleAdsView.busy=true;googleAdsView.started=true;googleAdsView.error='';
    if(view==='ideas')render();
    try{
      const result=await window.TOOLBOX_CLOUD.googleAds('status');
      googleAdsView.configured=!!result.configured;googleAdsView.connected=!!result.connected;
    }catch(e){googleAdsView.error=String(e.message||e);}
    finally{googleAdsView.busy=false;if(view==='ideas')render();}
  }
  async function googleAdsAction(action){
    if(googleAdsView.busy)return;
    googleAdsView.busy=true;googleAdsView.error='';
    try{
      if(action==='google-start'){
        const res=await window.TOOLBOX_CLOUD.googleAds('start',{});
        if(!/^https:\/\/accounts\.google\.com\//.test(res.authorizationUrl))throw Error('Google 인증 주소 확인 실패');
        window.location.assign(res.authorizationUrl);
        return;
      }
      if(action==='google-accounts'){
        const res=await window.TOOLBOX_CLOUD.googleAds('accounts');
        googleAdsView.accounts=Array.isArray(res.accounts)?res.accounts:[];
        if(googleAdsView.accounts.length===1)googleAdsView.customer=googleAdsView.accounts[0];
        if(!googleAdsView.accounts.length)googleAdsView.error='접근 가능한 Google Ads 계정이 없습니다. ads.google.com 계정 권한을 확인하세요.';
      }
      if(action==='google-keywords'){
        const el=document.getElementById('googleCustomer'),input=document.getElementById('googleSeeds'),country=document.getElementById('googleCountry');
        googleAdsView.customer=el?.value||'';googleAdsView.seeds=input?.value||'';googleAdsView.country=country?.value||'KR';
        const kws=googleAdsView.seeds.split(',').map(s=>s.trim()).filter(Boolean);
        const res=await window.TOOLBOX_CLOUD.googleAds('keywords',{customerId:googleAdsView.customer,keywords:kws,target:googleAdsView.country});
        googleAdsView.results=Array.isArray(res.results)?res.results:[];
      }
    }catch(e){googleAdsView.error=String(e.message||e);}
    finally{googleAdsView.busy=false;if(view==='ideas')render();}
  }

  function ideas(){
    return header('아이디어 검토','검증 근거와 실패 조건을 남기고, 승인된 아이디어만 개발합니다.',button('+ 아이디어 기록','new-idea'))+
    '<div class="notice">🔍 키워드 검색량·매출 가능성 등은 검증한 1차 자료가 있을 때만 근거란에 기록하세요. 자료가 없으면 공란으로 두는 것이 원칙입니다.</div>'+panel('후보 파이프라인',`${state.ideas.length}개 후보 · 과거 대화에서 복원한 항목 포함`,state.ideas.length?`<div class="table-scroll"><table><thead><tr><th>아이디어</th><th>해결할 문제</th><th>검증 상태</th><th>난이도</th><th>근거</th><th>관리</th></tr></thead><tbody>${[...state.ideas].reverse().map(i=>`<tr><td><div class="item-title">${esc(i.title)}</div><div class="sub-line">${esc((i.difference||'차별점 미입력').slice(0,55))}</div></td><td>${esc((i.problem||'—').slice(0,90))}</td><td>${badge(i.status,STATUS.idea)}</td><td>${esc(i.effort||'미입력')}</td><td>${link(i.sourceUrl,'출처 ↗')}</td><td>${tiny('idea',i.id)}</td></tr>`).join('')}</tbody></table></div>`:empty('조사된 아이디어가 없습니다.'))+googleAdsPanel();
  }
  function tasks(){
    const counts=Object.keys(STATUS.task).map(k=>`${STATUS.task[k]} ${state.tasks.filter(t=>t.status===k).length}개`).join(' · ');
    return header('작업 관리','개발 · 테스트 · 배포 · 검색등록에 필요한 행동을 추적합니다.',button('+ 작업 추가','new-task'))+
    panel('업무 목록',counts,state.tasks.length?`<div class="table-scroll"><table><thead><tr><th>업무</th><th>대상 서비스</th><th>상태</th><th>우선순위</th><th>기한</th><th>관리</th></tr></thead><tbody>${[...state.tasks].sort((a,b)=>(a.status==='done')-(b.status==='done')||(a.dueDate||'9999').localeCompare(b.dueDate||'9999')).map(t=>`<tr><td><div class="item-title">${esc(t.title)}</div><div class="sub-line">${esc((t.notes||'').slice(0,72))}</div></td><td>${esc(state.sites.find(s=>s.id===t.siteId)?.name||'공통 업무')}</td><td>${badge(t.status,STATUS.task)}</td><td>${esc(t.priority||'보통')}</td><td>${esc(t.dueDate||'—')}</td><td>${tiny('task',t.id)}</td></tr>`).join('')}</tbody></table></div>`:empty('할 일이 없습니다.'));
  }
  function metrics(){
    const k=metricSummary();
    return header('성과 기록','검색·수익 수기는 직접 입력하고 브라우저 방문 통계는 DB에서 자동 수집합니다.',button('+ 성과 입력','new-metric'))+
    '<div class="notice warn">⚠ 방문자 숫자의 봇 제외 여부를 기록하세요. <strong>일자·사이트별 기록</strong>입니다. 동일 날짜의 데이터를 중복 등록하면 합계도 중복됩니다. 원천 시스템의 측정 기준이 서로 다를 수 있습니다.</div>'+`<div class="metric-grid"><div class="metric-box"><small>누적 방문 세션 합계</small><strong>${esc(k.visitors)}</strong></div><div class="metric-box"><small>누적 검색 노출 입력 합계</small><strong>${esc(k.impressions)}</strong></div><div class="metric-box"><small>누적 검색 클릭 입력 합계</small><strong>${esc(k.clicks)}</strong></div><div class="metric-box"><small>수익 입력 합계</small><strong>${esc(k.revenue)}</strong></div></div>`+
    panel('입력 이력',`${state.metrics.length}건`,state.metrics.length?`<div class="table-scroll"><table><thead><tr><th>날짜 / 서비스</th><th>방문자</th><th>검색 노출</th><th>검색 클릭</th><th>수익</th><th>봇 제외</th><th>출처</th><th>관리</th></tr></thead><tbody>${[...state.metrics].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(m=>`<tr><td><div class="item-title">${esc(m.date||'—')}</div><div class="sub-line">${esc(state.sites.find(s=>s.id===m.siteId)?.name||'사이트 미확인')}</div></td><td>${m.visitors===null?'미입력':fmt(m.visitors)}</td><td>${m.impressions===null?'미입력':fmt(m.impressions)}</td><td>${m.clicks===null?'미입력':fmt(m.clicks)}</td><td>${m.revenue===null?'미입력':money(m.revenue)}</td><td>${esc(m.botFilter==='cf_exclude_bots'?'Cloudflare 필터':m.botFilter==='ga4_known_bots'?'GA4 필터':m.botFilter==='js_beacon'?'JS 비콘(봇 미보장)':'미확인')}</td><td>${esc(m.source||'미기록')}</td><td>${tiny('metric',m.id)}</td></tr>`).join('')}</tbody></table></div>`:empty('입력된 방문·검색·수익 데이터가 없습니다.'));
  }
  function safeMetric(value) { return Number.isSafeInteger(value) && value >= 0 ? fmt(value) : '미확인'; }
  function analyticsTable(){
    const arr=analyticsView.data?.results;
    if (!Array.isArray(arr)) return empty('아직 API 조회 결과가 없습니다.', '연결 후 방문 수와 페이지뷰 수를 자동으로 읽어옵니다.');
    const rows=arr.map(item=>`<tr><td><div class="item-title">${esc(item.site)}</div><div class="sub-line">자체 JS 비콘 · ${esc(item.days)}일 구간</div></td><td>${safeMetric(item.visits)}</td><td>${safeMetric(item.pageviews)}</td><td>${item.sampled?'표본집계 (정확한 건수 미확인)':item.status==='no_data'?'아직 수집된 데이터 없음':'브라우저 JS 측정 (봇 완전 제외 아님)'}</td><td>${esc(String(item.retrievedAt||'').replace('T',' ').slice(0,19))}</td></tr>`).join('');
    return `<div class="table-scroll"><table><thead><tr><th>사이트</th><th>방문 (Visits)</th><th>페이지뷰</th><th>데이터 상태</th><th>조회 시각 (UTC)</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function traffic(){
    const recognized=['cf_exclude_bots','ga4_known_bots','js_beacon'];
    const valid=state.metrics.filter(m=>recognized.includes(m.botFilter) && Number.isSafeInteger(m.visitors) && m.visitors>=0);
    const daily=valid.filter(m=>m.date===today());
    const sum=records=>records.reduce((n,m)=>n+m.visitors,0);
    const siteRows=state.sites.map(s=>{
      const rows=valid.filter(m=>m.siteId===s.id);
      const known=rows.length>0;
      const last=rows.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0];
      const total=rows.length?sum(rows):null;
      return `<tr><td><div class="item-title">${esc(s.name)}</div><div class="sub-line">${esc(s.url||'URL 미등록')}</div></td><td>${known?fmt(total):'연결·입력 전'}</td><td>${last?esc(last.date):'—'}</td><td>${last?esc(last.botFilter==='cf_exclude_bots'?'Cloudflare: 봇 제외':last.botFilter==='ga4_known_bots'?'GA4: 알려진 봇 제외':'JS 비콘: 봇 완전 제외 아님'):'미확인'}</td><td>${link('https://dash.cloudflare.com/','Cloudflare ↗')}</td></tr>`;
    }).join('');
    const isSingleSite=analyticsView.data?.results?.length===1;
    const remote=isSingleSite?analyticsView.data.results[0]:null;
    const fetchState=analyticsView.loading?'조회 중':analyticsView.data?'연결됨':'연결 대기';
    const period=analyticsView.days===1?'24시간':analyticsView.days===7?'7일':'30일';
    const loadingNote=analyticsView.loading?'Cloudflare 원천 데이터를 조회하고 있습니다.':analyticsView.error||'서버 API가 연결되면 실측 수치만 표시됩니다.';
    return header('방문자 분석','브라우저 방문 세션의 DB 집계와 기존 수기 기록을 구분합니다.',button('새로 조회','analytics-reload','secondary')+button('+ 측정값 입력','new-metric'))+
      `<div class="notice"><strong>자체 JS 비콘 일별 집계</strong> — 동일 탭 세션의 첫 방문을 기록합니다. 고유 사람 수가 아니며, 봇·비콘 차단·중복 탭으로 실제 방문과 차이가 날 수 있습니다. IP·쿠키·지문 정보는 저장하지 않습니다.</div>`+
      `<div class="toolbar"><span class="section-title">조회 기간</span>${[1,7,30].map(d=>`<button type="button" class="btn ${analyticsView.days===d?'primary':'secondary'}" data-action="analytics-days" data-days="${d}">${d===1?'최근 1일':`최근 ${d}일`}</button>`).join('')}</div>`+
      `<div class="stats-grid">${stats('브라우저 방문 세션',analyticsView.data?(isSingleSite?safeMetric(remote?.visits):'사이트별 확인'):'미확인',period+' · 고유 이용자 수 아님','◫')}${stats('페이지뷰',analyticsView.data?(isSingleSite?safeMetric(remote?.pageviews):'사이트별 확인'):'미확인',period+' · 브라우저 전송 페이지뷰','▤')}${stats('분석 대상',analyticsView.data?fmt(analyticsView.data.results.length):'미확인','관리 대상 사이트','◎')}${stats('데이터 연결 상태',fetchState,analyticsView.data?String(analyticsView.data.generatedAt||'').slice(0,19)+' UTC':loadingNote,'◈',analyticsView.error?'amber':'')}</div>`+
      (analyticsView.error?`<div class="notice warn">API 연결 상태: ${esc(analyticsView.error)}</div>`:'')+
      panel('브라우저 DB 자동 집계',analyticsView.data?`원천 조회 시각: ${analyticsView.data.generatedAt||'미확인'} · Supabase 일별 DB 집계`:loadingNote,analyticsTable())+
      `<div class="notice warn">아래 수동 기록은 자동 집계와 별개야. 두 데이터를 더하지 않으며, 방문자·방문·페이지뷰·색인 수치를 혼동하지 않습니다.</div>`+
      `<div class="stats-grid">${stats('오늘 기록된 방문 세션 합계',daily.length?fmt(sum(daily)):'미확인','자동 브라우저 집계와 승인된 수기 기록','◫')}${stats('자동·수기 기록 건수',fmt(valid.length),'이용자가 직접 입력한 기록','▤')}${stats('관리 대상 사이트',fmt(state.sites.length),'개발·운영 목록 기준','◎')}${stats('기록 원천',valid.length?'입력됨':'미입력','JS 비콘과 수기 기록 구분 필요','◈','amber')}</div>`+
      panel('서비스별 수동 기록','서로 다른 사이트에 동일인이 방문할 수 있으므로 총합을 고유 방문자 수라고 부르지 않습니다.',state.sites.length?`<div class="table-scroll"><table><thead><tr><th>서비스</th><th>기록된 방문 합계</th><th>마지막 기록일</th><th>봇 처리 근거</th><th>측정</th></tr></thead><tbody>${siteRows}</tbody></table></div>`:empty('사이트 등록 후 이용할 수 있습니다.'));
  }
  async function refreshAnalytics(){
    if(analyticsView.loading)return;
    analyticsView.started=true;analyticsView.loading=true;analyticsView.error='';
    if(view==='traffic')render();
    try{
      if(!window.TOOLBOX_CLOUD?.readMetrics)throw new Error('로그인된 관리자 DB에 연결되지 않았습니다.');
      const remoteMetrics=await window.TOOLBOX_CLOUD.readMetrics();
      state.metrics=remoteMetrics;
      try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{}
      const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'});
      const todaySeoul=formatter.format(new Date());
      const base=new Date(todaySeoul+'T12:00:00+09:00');
      const oldest=new Date(base.getTime()-(analyticsView.days-1)*86400000);
      const lower=formatter.format(oldest);
      const entries=remoteMetrics.filter(m=>m.botFilter==='js_beacon'&&m.date>=lower&&m.date<=todaySeoul&&Number.isSafeInteger(m.visitors)&&Number.isSafeInteger(m.pageviews));
      const results=state.sites.map(s=>{
        const rows=entries.filter(m=>m.siteId===s.id);
        return {site:s.name,days:analyticsView.days,
          visits:rows.length?rows.reduce((n,m)=>n+m.visitors,0):null,
          pageviews:rows.length?rows.reduce((n,m)=>n+m.pageviews,0):null,
          sampled:false,status:rows.length?'observed':'no_data',
          retrievedAt:new Date().toISOString()};
      });
      analyticsView.data={results,generatedAt:new Date().toISOString(),source:'Supabase JS beacon'};
    }catch(e){analyticsView.error=String(e.message||'DB 방문 집계 조회 실패').slice(0,220);analyticsView.data=null;}
    finally{analyticsView.loading=false;if(view==='traffic')render();}
  }
  function policies(){
    const checklist=[['Google Search Console','https://search.google.com/search-console'],['네이버 서치어드바이저','https://searchadvisor.naver.com/'],['Google 애드센스','https://www.google.com/adsense/']];
    const auditRows=state.audits.map(a=>`<tr><td>${esc(a.siteUrl||'')}</td><td>${esc(a.checkedAt||'—')}</td><td>${esc(a.httpStatus??'—')}</td><td>${esc(a.robots||'—')}</td><td>${esc(a.sitemap||'—')}</td><td>${esc(a.canonical||'—')}</td><td>${esc(a.summary||'')}</td></tr>`).join('');
    return header('정책 · 검색 색인','서버 기술 점검과 검색엔진 색인·정책 판단을 구분해 기록합니다.',button('점검 JSON 가져오기','import-audit','secondary')+button('+ 사이트 등록','new-site'))+
    '<div class="notice">🛡️ <strong>기술 점검은 색인·정책 승인과 다릅니다.</strong> 서버 응답·robots·sitemap·canonical은 예약 검사할 수 있으나, 검색엔진 색인 상태는 Search Console 인증이 필요합니다. 실시간 색인·정책 인증이라고 표시하지 않습니다.</div>'+
    panel('자동 기술 점검 결과',state.auditUpdatedAt?`마지막 검사: ${state.auditUpdatedAt} · ${state.auditSource||'검사 파일'}`:'점검 파일을 아직 연결하지 않았습니다.',state.audits.length?`<div class="table-scroll"><table><thead><tr><th>URL</th><th>점검 시각</th><th>HTTP</th><th>robots</th><th>sitemap</th><th>canonical</th><th>결과</th></tr></thead><tbody>${auditRows}</tbody></table></div>`:empty('점검 결과가 없습니다.','GitHub Actions 점검 리포트(JSON)를 가져오면 마지막 확인 시각과 결과가 표시됩니다.'))+
    panel('사이트별 검수 결과','검수 상태 및 검색엔진 제출 현황',state.sites.length?`<div class="table-scroll"><table><thead><tr><th>사이트</th><th>Google</th><th>Naver</th><th>정책 체크</th><th>최종 기록</th><th>관리</th></tr></thead><tbody>${state.sites.map(s=>`<tr><td><div class="item-title">${esc(s.name)}</div><div class="sub-line">${esc(s.url||'URL 없음')}</div></td><td>${badge(s.google,STATUS.index)}</td><td>${badge(s.naver,STATUS.index)}</td><td>${badge(s.policy,STATUS.policy)}</td><td>${esc((s.notes||'').slice(0,55)||'—')}</td><td><button type="button" class="tiny-action" data-action="edit-site" data-id="${esc(s.id)}">검수 수정</button></td></tr>`).join('')}</tbody></table></div>`:empty('검수할 사이트가 없습니다.'))+
    `<div class="meta-info">${panel('확인할 체크리스트','출시 전에 직접 확인',`<div class="panel-body"><div class="checklist"><label>□ 실제 기능이 작동하는가</label><label>□ 모바일에서 사용할 수 있는가</label><label>□ 검색용 빈 페이지를 양산하지 않는가</label><label>□ 개인정보 안내와 면책 고지가 적절한가</label><label>□ robots.txt / sitemap.xml / canonical이 맞는가</label><label>□ 광고 배치 및 정책 위험은 없는가</label></div></div>`)}${panel('공식 검증 도구','실제 상태는 각 서비스에서 확인',`<div class="panel-body">${checklist.map(([name,url])=>`<div class="work-item"><span class="work-dot"></span><div><h3>${link(url,`${name} ↗`)}</h3><p>직접 로그인해 확인한 상태만 관리 콘솔에 기록</p></div></div>`).join('')}</div>`)}</div>`;
  }
  function render(){
    document.getElementById('breadcrumb').textContent=VIEWS[view];
    document.querySelectorAll('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.view===view));
    document.getElementById('navSiteCount').textContent=state.sites.length;
    host.innerHTML=({overview,sites,domains,ideas,tasks,traffic,metrics,policies,maintenance:maintenanceView,promotion:promotionView,settings:adminPanel}[view])();
    document.getElementById('sidebar').classList.remove('open');
    if(view==='traffic' && !analyticsView.started)queueMicrotask(refreshAnalytics);
    if(view==='ideas' && !googleAdsView.started)queueMicrotask(googleAdsStatus);
  }
  const schema={
    domain:[
      ['name','도메인 이름 (예: usefulmate.com)','text',true],['registrar','등록기관','text'],
      ['status','도메인 상태','select',true,STATUS.domain],['siteId','연결 사이트','sites'],
      ['expiryDate','만료 예정일','date'],['nameservers','네임서버 · DNS 관리 위치','text'],
      ['notes','구매·DNS·갱신 메모','textarea']
    ],
    site:[
      ['name','서비스 이름','text',true],['category','카테고리','text'],
      ['status','운영 상태','select',true,STATUS.site],['language','언어','text'],
      ['url','배포 URL','url'],['repo','GitHub 주소','url'],
      ['host','호스팅 환경','text'],['releaseDate','출시일','date'],
      ['google','Google 색인','select',true,STATUS.index],['naver','Naver 색인','select',true,STATUS.index],
      ['policy','정책 검토','select',true,STATUS.policy],['notes','검증 · 개선 메모','textarea']
    ],
    idea:[
      ['title','아이디어 이름','text',true],['status','검토 상태','select',true,STATUS.idea],
      ['problem','해결할 불편함','textarea'],['evidence','수요 검증 근거 (없는 경우 공란)','textarea'],
      ['competition','경쟁 서비스 및 실패 가능성','textarea'],['difference','핵심 차별점','textarea'],
      ['sourceUrl','1차 근거 링크','url'],['effort','개발 난이도','select',false,{ '':'미입력',low:'낮음',mid:'중간',high:'높음'}],
      ['notes','추가 메모','textarea']
    ],
    task:[
      ['title','작업명','text',true],['siteId','대상 사이트','sites'],
      ['status','진행 상태','select',true,STATUS.task],['priority','우선순위','select',false,{low:'낮음',normal:'보통',high:'높음'}],
      ['dueDate','완료 기한','date'],['notes','작업 내용','textarea']
    ],
    metric:[
      ['siteId','사이트','sites',true],['date','기록 날짜','date',true],
      ['visitors','방문자 수 · 원천 자료 기준','number'],['pageviews','페이지뷰 · 실제 측정','number'],['returning','재방문자 · 실제 측정','number'],
      ['botFilter','봇 필터의 실제 적용 여부','select',true,{unknown:'미확인 또는 미적용',cf_exclude_bots:'Cloudflare Exclude Bots=Yes 확인',ga4_known_bots:'GA4 알려진 봇 자동 제외'}],
      ['impressions','검색 노출 · 실제 측정','number'],['clicks','검색 클릭 · 실제 측정','number'],
      ['revenue','수익 (원) · 실제 확인','number'],['source','데이터 출처','text'],
      ['notes','기록 메모','textarea']
    ]
  };
  const defaults={domain:{status:'planned',registrar:'가비아'},site:{status:'review',language:'한국어',google:'unknown',naver:'unknown',policy:'unchecked'},idea:{status:'research',effort:''},task:{status:'todo',priority:'normal'},metric:{date:today(),botFilter:'unknown'}};
  function fieldMarkup(def,record){
    const [key,title,kind,required,choices] = def;
    const val = record[key]===undefined||record[key]===null?'':String(record[key]);
    const full = ['textarea','url'].includes(kind);
    let input='';
    if(kind==='textarea') input=`<textarea id="f-${key}" name="${key}" ${required?'required':''}>${esc(val)}</textarea>`;
    else if(kind==='select')input=`<select id="f-${key}" name="${key}" ${required?'required':''}>${Object.entries(choices).map(([v,t])=>`<option value="${esc(v)}" ${v===val?'selected':''}>${esc(t)}</option>`).join('')}</select>`;
    else if(kind==='sites')input=`<select id="f-${key}" name="${key}" ${required?'required':''}><option value="">${required?'사이트 선택':'전체 공통'}</option>${state.sites.map(s=>`<option value="${esc(s.id)}" ${s.id===val?'selected':''}>${esc(s.name)}</option>`).join('')}</select>`;
    else input=`<input id="f-${key}" name="${key}" type="${kind}" value="${esc(val)}" ${kind==='number'?'min="0" step="1"':''} ${required?'required':''} ${kind==='url'?'placeholder="https://"':''} maxlength="2500">`;
    return `<div class="form-field ${full?'full':''}"><label for="f-${key}">${esc(title)}${required?' *':''}</label>${input}</div>`;
  }
  function openEditor(type,id=null){
    if(!schema[type])return;
    if(type==='metric'&&!state.sites.length){toast('성과를 기록하려면 사이트를 먼저 등록하세요.');return;}
    let data=id?state[`${type}s`].find(x=>x.id===id):null;
    if(id&&!data){toast('항목을 찾을 수 없습니다.');return;}
    editor={type,id}; data={...(defaults[type]||{}),...(data||{})};
    document.getElementById('dialogTitle').textContent=`${id?'수정':'신규 등록'} · ${({site:'사이트',domain:'도메인',idea:'아이디어',task:'작업',metric:'성과'})[type]}`;
    fields.innerHTML=schema[type].map(def=>fieldMarkup(def,data)).join('');
    dlg.showModal();
  }
  function validateUrls(rec){
    for(const key of ['url','repo','sourceUrl'])if(rec[key]&&!safeUrl(rec[key]))throw new Error('주소는 http:// 또는 https:// 형식이어야 합니다.');
  }
  function submit(e){
    e.preventDefault(); if(!editor)return;
    const {type,id}=editor;
    const payload={};const fd=new FormData(form);
    for(const [key,_,kind] of schema[type]){
      const raw=String(fd.get(key)||'').trim();
      payload[key]=kind==='number'?(raw===''?null:Number(raw)):compact(raw);
      if(kind==='number'&&payload[key]!==null&&(!Number.isSafeInteger(payload[key])||payload[key]<0)){toast('숫자에는 0 이상의 정수를 입력하세요.');return;}
    }
    try{validateUrls(payload);}catch(err){toast(err.message);return;}
    if(type==='domain'){
      const name=payload.name.toLowerCase();
      if(!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(name)){toast('도메인 이름 형식을 확인해 주세요. (예: example.com)');return;}
      payload.name=name;
    }
    const collection=state[`${type}s`];
    const time=nowIso();
    const existing=id?collection.find(x=>x.id===id):null;
    const record={...(existing||{}),...payload,id:id||uid(),createdAt:existing?.createdAt||time,updatedAt:time};
    if(type==='domain' && collection.some(x=>x.id!==id && x.name.toLowerCase()===record.name)){toast('이미 등록된 도메인입니다. 기존 기록을 수정하세요.');return;}
    if(type==='metric' && collection.some(x=>x.id!==id&&x.siteId===record.siteId&&x.date===record.date)){
      toast('동일한 사이트·날짜의 기록이 있습니다. 기존 기록을 수정하세요.');return;
    }
    if(existing)collection[collection.indexOf(existing)]=record;else collection.push(record);
    activity(`${({site:'사이트',domain:'도메인',idea:'아이디어',task:'작업',metric:'성과'})[type]} ${id?'수정':'등록'} · ${payload.name||payload.title||payload.date||''}`);
    save();dlg.close();editor=null;render();toast('저장했습니다.');
  }
  let deletion=null;
  function deleteRecord(type,id){
    const col=state[`${type}s`]; if(!col)return;
    const rec=col.find(x=>x.id===id);if(!rec)return;
    const label=rec.name||rec.title||rec.date||'해당 기록';
    const dependent=type==='site'?(state.metrics.filter(x=>x.siteId===id).length):0;
    document.getElementById('confirmMessage').textContent=`“${label}” 항목을 삭제할까요?${dependent?' 연결된 성과 기록 '+dependent+'건도 함께 삭제됩니다.':''} 이 작업은 복구할 수 없습니다.`;
    deletion={type,id}; document.getElementById('confirmDialog').showModal();
  }
  function confirmedDelete(){
    if(!deletion)return;
    const {type,id}=deletion;const array=state[`${type}s`];const rec=array.find(x=>x.id===id);
    state[`${type}s`]=array.filter(x=>x.id!==id);
    if(type==='site'){state.metrics=state.metrics.filter(m=>m.siteId!==id);state.tasks.forEach(t=>{if(t.siteId===id)t.siteId='';});state.domains.forEach(d=>{if(d.siteId===id)d.siteId='';});}
    activity(`${type} 삭제 · ${rec?.name||rec?.title||rec?.date||''}`);save();
    document.getElementById('confirmDialog').close();deletion=null;render();toast('삭제했습니다.');
  }
  function download(name,content,mime){
    const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
  }
  function exportBackup(){
    const content=JSON.stringify({...state,exportedAt:nowIso()},null,2);
    download(`small-toolbox-backup-${today()}.json`,content,'application/json;charset=utf-8');
    toast('백업 JSON 파일 다운로드를 시작했습니다.');
  }
  function csvCell(x){
    let s=String(x??'');
    // Prevent spreadsheet software from interpreting imported user text as a formula.
    if(/^[\s]*[=+\-@]/.test(s))s="'"+s;
    return '"'+s.replace(/"/g,'""')+'"';
  }
  function exportCSV(){
    const cols=['name','category','status','language','url','repo','host','releaseDate','google','naver','policy','notes'];
    const csv='\ufeff'+[cols.join(','),...state.sites.map(x=>cols.map(c=>csvCell(x[c])).join(','))].join('\r\n');
    download(`small-toolbox-sites-${today()}.csv`,csv,'text/csv;charset=utf-8');
    toast('사이트 목록 CSV를 내려받았습니다.');
  }
  async function importBackup(file){
    if(!file)return;
    if(file.size>3_000_000){toast('3MB 이하의 백업 파일만 가져올 수 있습니다.');return;}
    let next;
    try{next=normalize(JSON.parse(await file.text()));}catch(err){toast(`백업 파일을 읽을 수 없습니다: ${err.message}`);return;}
    const yes=confirm('현재 브라우저의 기존 사이트·아이디어·작업·성과 기록 전체를 백업 파일로 교체합니다. 계속할까요?');
    if(!yes)return;
    state=next;save();render();toast('백업 데이터를 가져왔습니다.');
  }
  async function importAudit(file){
    if(!file)return;
    if(file.size>500000){toast('점검 파일은 500KB 이하여야 합니다.');return;}
    try{
      const data=JSON.parse(await file.text());
      if(data.reportVersion!==1||!Array.isArray(data.results)||data.results.length>200)throw new Error('지원하지 않는 리포트 형식');
      if(!/^20\d\d-\d\d-\d\dT/.test(data.generatedAt||''))throw new Error('검사 시각 없음');
      state.audits=data.results.map((r,i)=>({
        id:`audit-${i}`,siteUrl:safeUrl(r.siteUrl)||'',checkedAt:String(r.checkedAt||'').slice(0,40),
        httpStatus:Number.isInteger(r.httpStatus)?r.httpStatus:null,
        robots:String(r.robots||'미확인').slice(0,70),sitemap:String(r.sitemap||'미확인').slice(0,70),
        canonical:String(r.canonical||'미확인').slice(0,70),noindex:String(r.noindex||'미확인').slice(0,70),
        summary:String(r.summary||'').slice(0,220),source:'GitHub Actions 공개 기술 점검'
      })).filter(x=>x.siteUrl);
      state.auditUpdatedAt=String(data.generatedAt).slice(0,40);state.auditSource='GitHub Actions 결과 파일 (가져오기)';
      activity('기술 점검 리포트 가져오기');save();render();toast('기술 점검 결과를 반영했습니다. 색인·정책 상태는 변경되지 않습니다.');
    }catch(e){toast('점검 JSON 오류: '+e.message);}
  }
  function filterRows(){const term=(document.getElementById('searchInput')?.value||'').toLowerCase().trim();const status=document.getElementById('statusFilter')?.value||'';let visible=0;
    document.querySelectorAll('#filterTable tbody tr').forEach(tr=>{let show=(!term||tr.dataset.search.includes(term))&&(!status||tr.dataset.status===status);tr.hidden=!show;if(show)visible++;});
    const el=document.getElementById('filterEmpty');if(el)el.style.display=visible?'none':'block';
  }
  function adminPanel(){
    return header('데이터 백업','현재 버전의 데이터는 브라우저에만 보관됩니다.','')+
    `<div class="meta-info">${panel('백업 및 내보내기','주기적인 파일 백업을 권장합니다.',`<div class="panel-body"><p class="desc">JSON은 모든 데이터를 보관하고, CSV는 사이트 목록을 엑셀에서 확인하는 용도입니다.</p><div class="utility-buttons">${button('JSON 전체 백업','export-backup')}${button('JSON 백업 가져오기','import-backup','secondary')}${button('사이트 CSV','export-csv','secondary')}</div></div>`)}${panel('운영 안내','저장 · 보안 · 동기화 한계',`<div class="panel-body"><p class="desc">다른 기기의 데이터와 자동 동기화되지 않습니다. 브라우저 데이터 삭제 시 기록이 사라질 수 있습니다. 이 앱을 공개 호스팅할 경우 로그인과 서버 측 접근통제를 구성하기 전까지 실제 관리 정보는 입력하지 마세요.</p></div>`)}</div>`;
  }
  document.addEventListener('click',e=>{
    const nav=e.target.closest('.nav-btn');if(nav){view=nav.dataset.view;render();return;}
    const b=e.target.closest('[data-action]');if(!b)return;
    const action=b.dataset.action;
    if(action==='google-status'){void googleAdsStatus();return;}
    if(['google-start','google-accounts','google-keywords'].includes(action)){void googleAdsAction(action);return;}
    if(action==='promo-copy'){void copyPromotion(b.dataset.slug,b.dataset.lang,b.dataset.channel);return;}
    if(action==='goto'){view=b.dataset.view;render();}
    else if(action==='analytics-reload')refreshAnalytics();
    else if(action==='analytics-days'){analyticsView.days=Number(b.dataset.days)||1;refreshAnalytics();}
    else if(action.startsWith('new-'))openEditor(action.slice(4));
    else if(action.startsWith('edit-'))openEditor(action.slice(5),b.dataset.id);
    else if(action.startsWith('delete-'))deleteRecord(action.slice(7),b.dataset.id);
    else if(action==='export-backup')exportBackup();
    else if(action==='import-backup')document.getElementById('importFile').click();
    else if(action==='import-audit')document.getElementById('auditFile').click();
    else if(action==='export-csv')exportCSV();
  });
  document.addEventListener('input',e=>{if(e.target.id==='googleSeeds')googleAdsView.seeds=e.target.value;if(e.target.id==='googleCustomer')googleAdsView.customer=e.target.value;if(e.target.id==='searchInput')filterRows();});
  document.addEventListener('change',e=>{if(e.target.id==='googleCountry')googleAdsView.country=e.target.value;if(e.target.id==='googleCustomer')googleAdsView.customer=e.target.value;if(e.target.id==='statusFilter')filterRows();});
  document.getElementById('auditFile').addEventListener('change',async e=>{await importAudit(e.target.files?.[0]);e.target.value='';});
  document.getElementById('importFile').addEventListener('change',async e=>{await importBackup(e.target.files?.[0]);e.target.value='';});
  document.getElementById('closeDialog').addEventListener('click',()=>dlg.close());
  document.getElementById('cancelDialog').addEventListener('click',()=>dlg.close());
  document.getElementById('confirmCancel').addEventListener('click',()=>document.getElementById('confirmDialog').close());
  document.getElementById('confirmYes').addEventListener('click',confirmedDelete);
  document.getElementById('menuToggle').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
  form.addEventListener('submit',submit);
  document.getElementById('todayText').textContent=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(new Date());

  // Newly approved toolbox services. Merge without overwriting previous browser records.
  function registerApprovedSites(){
    const records=[
      ['csv-merge-studio','CSV 맞춤 병합기','파일 · 데이터 도구','https://csv.abreda.com','CSV 열 이름 자동 매칭, 파일별 수동 연결, 중복 제거·다운로드. 배포 검증 대기.'],
      ['novel-planner','웹소설 연재 설계실','웹소설 · 창작 도구','https://novel.abreda.com','회차·등장인물·복선 추적 도구. GitHub에 구현 완료, 실제 공개 주소 검증 대기.'],
      ['manuscript-lens','웹소설 원고돋보기','웹소설 · 원고 검사','https://manuscript.abreda.com','반복 어절·긴 문장·대사 비율·표현 찾기. GitHub에 구현 완료, 실접속 검증 대기.'],
      ['toolbox-admin','작은 도구함 통합 관리자','운영 · 내부 관리','https://adminivo.com/','운영 콘솔 v1.2. 사이트 접근 제한 미설정 시 공개 주소임. 브라우저별 개별 저장, 실시간 동기화 미구현.']
    ];
    let changes=0;
    for(const [slug,name,category,url,notes] of records){
      const oldUrl='https://tb-'+slug+'.pages.dev/';
      const found=state.sites.find(x=>x.url===url || x.url===oldUrl || x.id==='toolbox-'+slug);
      if(found){
        // Migrate only untouched factory URLs; preserve user-entered overrides.
        if(found.url===oldUrl && url!==oldUrl){found.url=url;found.updatedAt=nowIso();changes++;}
        continue;
      }
      state.sites.push({id:'toolbox-'+slug,name,category,status:'testing',language:'한국어',url,repo:'https://github.com/ghfmf1-coder/my-daily-life',host:'Cloudflare Pages',releaseDate:'',google:'unknown',naver:'unknown',policy:'unchecked',notes,createdAt:nowIso(),updatedAt:nowIso()});
      changes++;
    }
    if(changes){activity('신규 도구·관리자 사이트 '+changes+'건 자동 등록 (배포 상태 별도 확인 필요)');save();}
  }

  // Updated from the same Git revision as the factory deployment.
  // Never infer Google indexing from availability. Only verify page assets loaded.
  async function refreshSiteCatalog(){
    try{
      const response=await fetch('/sites-catalog.json',{cache:'no-store'});
      if(!response.ok)throw new Error('site catalog unavailable');
      const payload=await response.json();
      if(!payload||!Array.isArray(payload.sites))throw new Error('invalid catalog');
      let changed=false;
      for(const item of payload.sites){
        if(!item.url||!/^https:\/\/(?:tb-[a-z0-9-]+\.pages\.dev|(?:[a-z0-9-]+\.)?abreda\.com)\/$/.test(item.url))continue;
        const oldUrl='https://tb-'+item.slug+'.pages.dev/';
        const existing=state.sites.find(x=>x.url===item.url || x.url===oldUrl || x.id==='toolbox-'+item.slug || x.id==='catalog-'+item.slug);
        if(existing && existing.url===oldUrl && item.url!==oldUrl){existing.url=item.url;existing.updatedAt=nowIso();changed=true;}
        if(!existing){
          state.sites.push({
            id:'catalog-'+item.slug,name:item.title,category:item.category||'공개 도구',
            status:'testing',language:Array.isArray(item.locales)?item.locales.join(' · '):'한국어',
            url:item.url,repo:item.repo,host:'Cloudflare Pages',releaseDate:'',
            google:'unknown',naver:'unknown',policy:'unchecked',
            notes:'자동 등록된 도구입니다. 검색 색인과 배포 성공은 별도로 확인합니다.',
            createdAt:nowIso(),updatedAt:nowIso()
          });
          changed=true;
        }
      }
      if(changed){activity('신규 공개 사이트 목록 자동 동기화');save();render();}
      // A successful favicon image load confirms an accessible deployed asset,
      // not functional correctness, indexation or search-console property ownership.
      const targets=state.sites.filter(x=>/^https:\/\/(?:tb-[a-z0-9-]+\.pages\.dev|(?:[a-z0-9-]+\.)?abreda\.com)\/$/.test(x.url) && x.url!=='https://adminivo.com/');
      const probe=site=>new Promise(resolve=>{
        const image=new Image();let settled=false;
        const done=ok=>{if(settled)return;settled=true;image.onload=null;image.onerror=null;resolve(ok)};
        image.onload=()=>done(true);image.onerror=()=>done(false);
        image.src=site.url+'favicon.svg';
        setTimeout(()=>done(false),9000);
      });
      const results=await Promise.all(targets.map(probe));
      let updated=false;
      targets.forEach((site,i)=>{
        if(results[i] && ['testing','review','build','planning'].includes(site.status)){
          site.status='live';site.updatedAt=nowIso();updated=true;
        }
      });
      if(updated){activity('접속 가능한 도구 상태 자동 확인 (파비콘 HTTP 이미지 검사)');save();render();}
    }catch(e){console.warn('Site catalog refresh unavailable:',String(e.message||e));}
  }
  load();registerApprovedSites();render();
  void refreshSiteCatalog();
  void refreshMaintenance();
  void refreshPromotion();
  setInterval(()=>void refreshMaintenance(),30*60*1000);
  // Browser-only smoke-test hooks for automated local testing, not a remote API.
  window.__toolboxTest = {navigate(name){if(VIEWS[name]){view=name;render();}},getCount(type){return state[type]?.length||0;},readState(){return JSON.parse(JSON.stringify(state));},openEditor};
})();
