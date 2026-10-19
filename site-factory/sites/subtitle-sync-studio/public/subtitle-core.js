/* Small Toolbox subtitle utility. Runs entirely in the browser. */
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.SubtitleCore=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const timing=/^\s*((?:\d{1,3}:)?\d{2}:\d{2}[,.]\d{1,3})\s+-->\s+((?:\d{1,3}:)?\d{2}:\d{2}[,.]\d{1,3})(?:\s+.*)?$/;
  function parseTime(s){
    const p=String(s).replace(",",".").split(":");
    if(p.length!==2&&p.length!==3)throw Error("Invalid timestamp");
    const ss=p.pop().split("."), sec=Number(ss[0]),ms=Number((ss[1]||"").padEnd(3,"0"));
    const minute=Number(p.pop()),hour=p.length?Number(p.pop()):0;
    if([sec,ms,minute,hour].some(x=>!Number.isFinite(x))||sec>=60||minute>=60||sec<0||minute<0)return NaN;
    return Math.round(((hour*60+minute)*60+sec)*1000+ms);
  }
  function formatTime(t,sep){
    t=Math.max(0,Math.round(t));
    const ms=t%1000;let seconds=Math.floor(t/1000);
    const sec=seconds%60;seconds=Math.floor(seconds/60);
    const min=seconds%60;const hour=Math.floor(seconds/60);
    return String(hour).padStart(2,"0")+":"+String(min).padStart(2,"0")+":"+String(sec).padStart(2,"0")+
      sep+String(ms).padStart(3,"0");
  }
  function parse(text){
    const input=String(text||"").replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n");
    const blocks=input.split(/\n\s*\n/);
    const cues=[];let skipped=0;
    for(const block of blocks){
      const lines=block.split("\n").map(x=>x.trimEnd());
      const pos=lines.findIndex(x=>x.includes("-->"));
      if(pos<0)continue;
      if(lines[0].trim().startsWith("NOTE")||lines[0].trim()==="STYLE"||lines[0].trim()==="REGION")continue;
      const m=lines[pos].match(timing);
      if(!m){skipped++;continue;}
      const start=parseTime(m[1]),end=parseTime(m[2]);
      if(!Number.isFinite(start)||!Number.isFinite(end)){skipped++;continue;}
      const content=lines.slice(pos+1).join("\n").trim();
      cues.push({start,end,text:content});
    }
    if(cues.length===0)throw Error("No valid SRT or VTT cues found");
    return {cues,skipped,format:/^\s*(?:\uFEFF)?WEBVTT\b/i.test(input)?"vtt":"srt"};
  }
  function check(cues){
    const issues=[];
    cues.forEach((c,i)=>{
      if(c.end<=c.start)issues.push({index:i,type:"duration"});
      if(!c.text.trim())issues.push({index:i,type:"empty"});
      if(i>0&&c.start<cues[i-1].end)issues.push({index:i,type:"overlap"});
      if(i>0&&c.start<cues[i-1].start)issues.push({index:i,type:"order"});
    });
    return issues;
  }
  function shift(cues,offset){
    if(!Number.isFinite(offset))throw Error("Invalid offset");
    return cues.map(c=>({start:Math.max(0,Math.round(c.start+offset)),end:Math.max(0,Math.round(c.end+offset)),text:c.text}));
  }
  function stretch(cues,from,to){
    if(!Number.isFinite(from)||!Number.isFinite(to)||from<=0||to<=0)throw Error("Invalid FPS");
    const factor=from/to;
    return cues.map(c=>({start:Math.round(c.start*factor),end:Math.round(c.end*factor),text:c.text}));
  }
  function substitute(cues,search,replacement){
    if(!search) return cues.map(c=>({...c}));
    return cues.map(c=>({...c,text:c.text.split(search).join(replacement)}));
  }
  function exportText(cues,format){
    if(format!=="srt"&&format!=="vtt")throw Error("Invalid export format");
    const head=format==="vtt"?"WEBVTT\n\n":"";
    const body=cues.map((c,i)=>{
      const range=formatTime(c.start,format==="srt"?",":".")+" --> "+formatTime(c.end,format==="srt"?",":".");
      return (format==="srt"?String(i+1)+"\n":"")+range+"\n"+c.text;
    }).join("\n\n");
    return head+body+"\n";
  }
  return {parseTime,formatTime,parse,check,shift,stretch,substitute,exportText};
});