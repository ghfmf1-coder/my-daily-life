/* English interface layer for Haruhankan: leaves saved user data and API payloads untouched. */
(()=>{'use strict';
const dictionary={"하루한칸":"Haruhankan","내 생활을 간단하게 기록하는 곳":"A simple place to track your daily life","로그인":"Log in","회원가입":"Sign up","회원가입 확인 이메일을 보내드렸습니다. 이메일에 있는 인증 링크를 누른 후 로그인해 주세요.":"Check your inbox for a confirmation email. Follow the verification link, then log in.","표시 이름":"Display name","이메일":"Email","비밀번호":"Password","비밀번호 확인":"Confirm password","비밀번호를 다시 입력해 주세요.":"Enter your password again.","비밀번호를 잊었나요?":"Forgot your password?","계정 만들기":"Create account","회원가입 시 이메일 확인이 필요할 수 있어요.":"You may need to confirm your email address.","로그인하면 다른 기기에서도 내 기록을 확인할 수 있어요.":"Sign in on another device to access your records.","하루한칸 · 개인정보는 계정별로 분리 저장돼요":"Haruhankan · Your records are stored per account","새 비밀번호 설정":"Set a new password","새 비밀번호를 입력하면 계정에 반영돼.":"Enter a new password to update your account.","새 비밀번호":"New password","비밀번호 변경":"Update password","처음 한 번만 선택해 주세요":"Choose your starting routine","어떤 하루를 보내고 싶어?":"What kind of day works best for you?","기본 체크 항목을 추천할게. 나중에 모두 추가·수정·숨김할 수 있어.":"Start with suggested tasks. You can add, rename or hide any goal later.","🌱 일반 생활":"🌱 Everyday routine","🔁 교대근무":"🔁 Rotating shift work","✍️ 현장 근무 · 웹소설 집필":"✍️ Factory work · serialized writing","운동·독서·집중 목표·하루 정리. 누구나 쓰기 좋은 기본 구성":"Workouts, reading, focused goals and a daily review. A flexible starter.","주간·야간을 한 주씩 교대하는 근무표와 개인 목표":"Alternating day/night shifts with personal goals.","원고 2편·운동·인풋·금주 등, 기존 2027 회사 휴무표와 공정 규칙을 활용하는 맞춤 템플릿":"An advanced Korea-specific writing and factory shift template.","각자의 계정은 별도로 관리돼. 이 선택이 다른 사용자에게 영향을 주지 않아.":"Your account is separate from other users' accounts.","오늘":"Today","일정":"Calendar","가계부":"Expenses","성과":"Progress","설정":"Settings","오늘의 진행 상황":"Today's progress","오늘의 기준":"How scoring works","토요일 출근 여부가 확인되지 않았어.":"Saturday shift has not been confirmed.","근무표에서 확인하기 →":"Review work schedule →","할 일":"Today's tasks","항목 수정 ⚙":"Edit tasks ⚙","선택 항목 · 점수에서 제외":"Optional task · not counted in score","표시할 목표가 없어. 설정에서 새 목표를 추가해 줘.":"No goals scheduled. Add a new goal in Settings.","오늘 예외 처리":"Today's exceptions","퇴고할 전날 원고 없음":"No previous draft to edit","계획된 운동 휴식일":"Planned exercise rest day","하루 메모":"Daily note","메모는 입력 칸 밖을 누르면 저장돼.":"Your note is saved when you leave this field.","＋ 오늘의 지출 기록하기":"＋ Record an expense","근무·일정":"Work & calendar","날짜를 눌러 휴무와 출근을 바꿔 봐":"Select a date to edit work and time off","토요일 출근":"Saturday shift","아직 확인 전":"Not confirmed","출근함":"Working","쉬는 날":"Day off","근무 상태 직접 조정":"Override work status","자동 계산":"Automatic schedule","출근":"Working","휴무":"Off","공정 (선택 입력)":"Work process (optional)","이날 체크리스트 보기 →":"View checklist for this day →","삭제":"Delete","아직 기록이 없어. 첫 지출을 입력해 봐.":"No records yet. Add your first expense.","이번 달 지출":"Spending this month","예산 잔액":"Remaining budget","지출 추가":"Add expense","금액":"Amount","분류":"Category","식비":"Food","배달":"Delivery","교통":"Transport","카페·간식":"Cafes & snacks","쇼핑":"Shopping","취미":"Hobbies","기타":"Other","사용처":"Merchant","날짜":"Date","지출 저장":"Save expense","월 예산":"Monthly budget","이달 지출 내역":"Monthly transactions","나의 성과":"My progress","기록하지 않은 미래 날짜는 실패로 계산하지 않아":"Future days are not treated as failed goals","최근 30일 기록":"Days tracked (last 30)","운동 달성":"Workouts completed","완성한 원고":"Drafts completed","이번 주":"This week","선택 목표는 달성률의 분모에 넣지 않아. 출근일 전용 목표는 휴무일에 자동 제외돼. 개인별 목표와 보상 기준은 설정에서 바꿀 수 있어.":"Optional goals are excluded from the score. Work-only goals are excluded on days off. Change targets in Settings.","내 설정":"My settings","화면에 표시할 이름":"Name displayed in app","생활 방식":"Routine type","일반 생활":"Everyday routine","교대근무":"Shift work","주간 달성 목표 (%)":"Weekly goal threshold (%)","주야간 교대 기준 월요일":"First Monday of shift rotation","기준 주 근무조":"Shift on anchor week","주간":"Day shift","야간":"Night shift","앞유리·뒷유리 공정 기간 적용 (2026.12~2027.08)":"Use specialized auto-glass process schedule (Korea-specific)","설정 저장":"Save settings","체크 항목 관리":"Manage tasks","항목을 추가하거나 이름·요일·점수 반영을 바꿀 수 있어. 숨겨도 기존 기록은 남아 있어.":"Add or rename tasks, select days, and choose scoring. Hidden tasks keep their history.","수정":"Edit","숨김":"Hide","＋ 새 목표 추가":"＋ Add goal","회사·개인 휴무일":"Holidays & personal days off","특정 회사의 휴무표는 모든 사용자에게 자동 적용되지 않아. 필요한 날짜만 직접 추가해.":"Company-specific holidays are not automatically applied to all users. Add dates you need.","휴무 이름":"Holiday name","휴무일 추가":"Add day off","계정과 데이터":"Account & data","JSON 백업":"Export JSON backup","로그아웃":"Log out","계정별 데이터는 Supabase에 저장돼. 모바일과 PC에서 같은 계정으로 로그인하면 기록을 볼 수 있어. 인터넷이 끊기면 새 체크·지출은 저장되지 않아.":"Records are saved to Supabase per account. Sign in on your phone and computer with the same credentials. Offline changes are not saved.","목표 이름":"Goal name","선택 목표 (점수 제외)":"Optional goal (excluded from score)","출근하는 날만 표시":"Only on working days","평일에만 표시 (월~금)":"Weekdays only (Mon–Fri)","실행 요일":"Days of week","저장하기":"Save","나에게 맞는 하루":"My daily routine","내 기록 불러오는 중...":"Loading your records...","하루한칸 3.0 · 계정별 클라우드 저장":"Haruhankan 3.0 · Cloud storage per account","운동하기":"Exercise","독서 또는 공부":"Read or study","중요한 일 하나 완료":"Complete one important task","하루 정리하기":"Reflect on the day","수면·휴식 챙기기":"Rest and sleep","오늘의 핵심 목표 완료":"Complete today's key goal","근무 중 개인 목표":"Personal task during shift","영양제 복용":"Take supplements","전날 원고 퇴고":"Revise yesterday's draft","인풋 30분":"Read for 30 minutes","추가 인풋 30분":"Extra 30 minutes reading","구상 완료":"Finish plot outline","운동 완료":"Complete workout","회사 원고 1편 완성":"Write one draft at work","집 원고 1편 완성":"Write one draft at home","약 복용":"Take medication","평일 금주":"No weekday alcohol","평일 배달 금지":"No weekday delivery","건강":"Health","성장":"Growth","생활":"Daily life","집필":"Writing","일":"Sun","월":"Mon","화":"Tue","수":"Wed","목":"Thu","금":"Fri","토":"Sat","활동일":"Active day","일상":"Routine","주말 휴무":"Weekend off","일요일 휴무":"Sunday off","토요일 휴무":"Saturday off","직접 지정한 휴무":"Manually marked off","직접 지정한 출근":"Manually marked working","공정 미정":"Work process not set","근무":"Work","앞유리":"Windshield","뒷유리":"Rear window","아직 기록하지 않은 날은 평균에서 제외하지만 보상은 5일 모두 기록한 뒤 확정해.":"Unrecorded days are excluded from the average, but weekly rewards require all five days.","기록 없음":"No records","미설정":"Not set","6자 이상":"At least 6 characters","닉네임 (선택)":"Nickname (optional)","오늘의 생각을 가볍게 적어봐":"Write a note about your day","자동 계산 사용 시 빈칸":"Leave empty for automatic calculation","예: 점심 식사":"e.g. lunch","예: 나의 하루":"e.g. My routine","회사 휴무":"Company holiday","예: 독서 20분":"e.g. Reading for 20 minutes","예: 건강":"e.g. Health"};
const $=id=>document.getElementById(id);
function translate(raw){
  const before=String(raw);
  const text=before.trim();
  if(!text)return before;
  let out=dictionary[text];
  if(!out){
    const patterns=[
      [/^(\d+)개 완료$/,(_,n)=>n+' completed'],
      [/^(\d+)건$/,(_,n)=>n+' records'],
      [/^(\d+)일$/,(_,n)=>n+' days'],
      [/^(\d+)회$/,(_,n)=>n+' times'],
      [/^(\d+)편$/,(_,n)=>n+' drafts'],
      [/^(\d+)년 (\d+)월$/,(_,y,m)=>m+'/'+y],
      [/^([월화수목금토일])~([월화수목금토일]) 기록 (.*)일$/,(_,a,b,n)=>(dictionary[a]||a)+'–'+(dictionary[b]||b)+' tracked: '+n+' days'],
      [/^달성 기준 (\d+)%/,(_,pct)=>'Goal: '+pct+'%'],
      [/^이번 주 보상:/,()=>'Weekly reward:'],
      [/^원$/,()=>' KRW'],
      [/^(\d[\d,]*)원$/,(_,n)=>n+' KRW']
    ];
    for(const [regex,repl] of patterns)if(regex.test(text)){out=text.replace(regex,repl);break}
  }
  if(!out||out===text)return before;
  return before.replace(text,out);
}
function localizeNode(root){
 if(!root)return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const nodes=[];
 while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){
   if(node.parentElement?.closest('script,style,code,pre,textarea'))continue;
   const translated=translate(node.nodeValue);
   if(translated!==node.nodeValue)node.nodeValue=translated;
 }
 const inputNodes=root.querySelectorAll('input[placeholder],textarea[placeholder],button[aria-label],input[aria-label]');
 for(const input of inputNodes)for(const name of ['placeholder','aria-label'])if(input.hasAttribute(name)){
   const val=input.getAttribute(name),next=translate(val);if(val!==next)input.setAttribute(name,next);
 }
 // This preset relies on one Korean factory-specific holiday calendar.
 root.querySelectorAll('[data-preset="factory"]').forEach(x=>x.remove());
}
const host=$('app');if(!host)return;
localizeNode(host);
new MutationObserver(()=>localizeNode(host)).observe(host,{childList:true,subtree:true});
})();
