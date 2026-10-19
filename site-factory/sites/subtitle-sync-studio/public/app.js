/* UI for client-side subtitle timing and conversion. */
(function(){
"use strict";
const $=id=>document.getElementById(id),core=window.SubtitleCore;
const lang=document.documentElement.lang==="en"?"en":"ko";
const msg={
 ko:{ready:"파일을 선택하거나 자막 내용을 붙여넣으세요.",loaded:"자막 {n}개를 불러왔습니다.",edited:"변경 사항이 적용됐습니다.",download:"파일을 저장했습니다.",bad:"지원하는 SRT/VTT 자막을 찾을 수 없습니다. 파일 내용을 확인해 주세요.",tooBig:"5MB 이하의 파일만 처리할 수 있습니다.",invalid:"숫자 값을 확인해 주세요.",negative:"시작 시간이 0초 미만인 자막은 0초로 보정됩니다.",duration:"종료 시간이 시작 시간보다 빠르거나 같습니다",empty:"내용이 비어 있습니다",overlap:"앞 자막과 시간이 겹칩니다",order:"시간 순서가 뒤바뀌었습니다",noIssue:"검출된 시간 오류가 없습니다.",skipped:"형식을 읽지 못해 건너뛴 블록: {n}개",cues:"자막 수",runtime:"마지막 종료",issues:"검사 결과",preview:"미리보기",notLoaded:"먼저 자막을 불러오세요.",replaced:"텍스트 교체 완료",reset:"원본으로 되돌렸습니다.",help:"검출된 문제는 원본 자막에도 있을 수 있습니다."},
 en:{ready:"Choose a file or paste subtitle text to begin.",loaded:"Loaded {n} subtitle cues.",edited:"Changes applied.",download:"Subtitle file saved.",bad:"No valid SRT/VTT subtitles found. Please check your file.",tooBig:"Files must be 5MB or smaller.",invalid:"Enter valid numeric values.",negative:"Start times below zero are clamped to 0 seconds.",duration:"End time is not after start time",empty:"Subtitle text is empty",overlap:"Overlaps the previous subtitle",order:"Cue order is not chronological",noIssue:"No timing issues detected.",skipped:"Skipped invalid blocks: {n}",cues:"Cues",runtime:"Last end",issues:"Warnings",preview:"Preview",notLoaded:"Load subtitles first.",replaced:"Text replacement applied.",reset:"Original subtitles restored.",help:"Reported issues may already exist in the original file."}
}[lang];
let original=null,working=null,name="subtitles",format="srt",skipped=0;
const tell=(s,err=false)=>{ $("status").textContent=s;$("status").classList.toggle("error",err) };
const interp=(s,n)=>s.replace("{n}",String(n));
function update(){
  const has=Array.isArray(working);
  $("editControls").disabled=!has;
  $("saveBtn").disabled=!has;
  $("resetBtn").disabled=!has;
  $("cueCount").textContent=has?String(working.length):"—";
  $("duration").textContent=has?core.formatTime(Math.max(...working.map(c=>c.end)), "."):"—";
  const issues=has?core.check(working):[];
  $("issueCount").textContent=has?String(issues.length+skipped):"—";
  const issueList=$("issueList");issueList.replaceChildren();
  if(has){
    if(!issues.length&&!skipped)issueList.appendChild(makeLi(msg.noIssue));
    issues.slice(0,40).forEach(q=>issueList.appendChild(makeLi("#"+(q.index+1)+" · "+msg[q.type])));
    if(issues.length>40)issueList.appendChild(makeLi("… +"+(issues.length-40)));
    if(skipped)issueList.appendChild(makeLi(interp(msg.skipped,skipped)));
  }
  const body=$("previewBody");body.replaceChildren();
  if(!has)return;
  working.slice(0,100).forEach((c,i)=>{
    const row=document.createElement("tr");
    const col1=document.createElement("td");col1.textContent=String(i+1);
    const col2=document.createElement("td");col2.textContent=core.formatTime(c.start,".")+" → "+core.formatTime(c.end,".");
    const col3=document.createElement("td");col3.textContent=c.text;
    row.append(col1,col2,col3);body.appendChild(row);
  });
}
function makeLi(str){const li=document.createElement("li");li.textContent=str;return li;}
function load(text,fileName){
  try{
    const result=core.parse(text);
    original=result.cues.map(c=>({...c}));working=result.cues.map(c=>({...c}));
    skipped=result.skipped;format=result.format;
    name=(fileName||"subtitles").replace(/\.(srt|vtt)$/i,"").replace(/[\\/:*?"<>|]/g,"-");
    $("outputFormat").value=format;
    update();tell(interp(msg.loaded,working.length));
  }catch(e){tell(msg.bad,true);}
}
$("inputFile").addEventListener("change",async e=>{
 const file=e.target.files[0];if(!file)return;
 if(file.size>5*1024*1024){tell(msg.tooBig,true);return;}
 try{load(await file.text(),file.name);}catch{tell(msg.bad,true);}
});
$("loadPaste").addEventListener("click",()=>load($("pasteText").value,"pasted-subtitles"));
$("applyOffset").addEventListener("click",()=>{
 if(!working){tell(msg.notLoaded,true);return;}
 const s=Number($("offset").value);if(!Number.isFinite(s)){tell(msg.invalid,true);return;}
 working=core.shift(working,Math.round(s*1000));update();tell(msg.edited);
});
$("applyFps").addEventListener("click",()=>{
 if(!working){tell(msg.notLoaded,true);return;}
 const a=Number($("fpsFrom").value),b=Number($("fpsTo").value);
 if(!Number.isFinite(a)||!Number.isFinite(b)||a<=0||b<=0){tell(msg.invalid,true);return;}
 working=core.stretch(working,a,b);update();tell(msg.edited);
});
$("applyReplace").addEventListener("click",()=>{
 if(!working){tell(msg.notLoaded,true);return;}
 const find=$("findText").value,replace=$("replaceText").value;
 if(!find){tell(msg.invalid,true);return;}
 working=core.substitute(working,find,replace);update();tell(msg.replaced);
});
$("resetBtn").addEventListener("click",()=>{
 if(!original)return;
 working=original.map(c=>({...c}));update();tell(msg.reset);
});
$("saveBtn").addEventListener("click",()=>{
 if(!working)return;
 const selected=$("outputFormat").value;
 const content=core.exportText(working,selected);
 const blob=new Blob(["\uFEFF",content],{type:"text/plain;charset=utf-8"});
 const url=URL.createObjectURL(blob);const a=document.createElement("a");
 a.href=url;a.download=name+"-adjusted."+selected;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),6000);tell(msg.download);
});
const drop=$("dropZone");
["dragenter","dragover"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add("drag")}));
["dragleave","drop"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove("drag")}));
drop.addEventListener("drop",async e=>{
 const file=e.dataTransfer.files[0];if(!file)return;
 if(file.size>5*1024*1024){tell(msg.tooBig,true);return;}
 try{load(await file.text(),file.name);}catch{tell(msg.bad,true);}
});
tell(msg.ready);update();
})();