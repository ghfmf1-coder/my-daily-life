'use strict';
const $=id=>document.getElementById(id);
const create=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e};
const selectAt=(start,end)=>{const a=$('source');a.focus();a.setSelectionRange(start,end);a.scrollIntoView({behavior:'smooth',block:'center'})};
function addIssue(root,label,start,end){const row=create('div','');row.className='item';const b=create('button',label);b.className='alt';b.onclick=()=>selectAt(start,end);row.append(b);root.append(row)}
function analyze(){
 const s=$('source').value,lines=s.split(/\r?\n/),stats=$('stats');stats.replaceChildren();
 const nonempty=lines.filter(x=>x.trim()),dialogue=nonempty.filter(x=>/^\s*["“‘]/.test(x)),paragraphs=s.split(/\n\s*\n/).filter(x=>x.trim());
 const figures=[['Characters (with spaces)',s.length],['Characters (no spaces)',s.replace(/\s/g,'').length],['Lines',lines.length],['Paragraphs',paragraphs.length],['Dialogue-leading lines',nonempty.length?Math.round(dialogue.length/nonempty.length*100)+'%':'0%']];
 figures.forEach(([label,value])=>{const div=create('div','');div.className='metric';div.append(create('span',label),create('strong',String(value)));stats.append(div)});
 const frequencies=new Map();
 for(const match of s.matchAll(/\b[A-Za-z][A-Za-z'-]{2,}\b/g)){const key=match[0].toLowerCase();const info=frequencies.get(key)||{count:0,first:match.index,length:match[0].length};info.count++;frequencies.set(key,info)}
 const repeated=[...frequencies].filter(([,v])=>v.count>=3).sort((a,b)=>b[1].count-a[1].count).slice(0,30),root=$('repeats');root.replaceChildren();
 if(!repeated.length)root.append(create('p','No English words occur 3 or more times.'));
 repeated.forEach(([word,v])=>addIssue(root,word+' · '+v.count+' times (first occurrence)',v.first,v.first+v.length));
 const issues=$('issues');issues.replaceChildren();let offset=0;
 lines.forEach((line,i)=>{if(line.trim().length>120)addIssue(issues,'Line '+(i+1)+' · '+line.trim().length+' characters: '+line.trim().slice(0,60)+'…',offset,offset+line.length);offset+=line.length+1});
 for(const match of s.matchAll(/[^\n]+(?:\n(?!\s*\n)[^\n]+)*/g)){if(match[0].trim().length>350)addIssue(issues,'Long paragraph · '+match[0].trim().length+' characters: '+match[0].trim().slice(0,55)+'…',match.index,match.index+match[0].length)}
 if(!issues.children.length)issues.append(create('p','No lines or paragraphs exceed these optional review thresholds.'));
 findMatches();
}
function findMatches(){const s=$('source').value,q=$('needle').value.trim(),root=$('matches');root.replaceChildren();if(!q){root.append(create('p','Enter a word or phrase to search.'));return}let from=0,n=0;while(n<100&&(from=s.toLowerCase().indexOf(q.toLowerCase(),from))!==-1){const start=from;addIssue(root,'Match '+(++n)+' · position '+(start+1)+' · '+s.slice(Math.max(0,start-18),Math.min(s.length,start+q.length+18)).replace(/\n/g,' '),start,start+q.length);from+=q.length}if(!n)root.append(create('p','No matches found.'));if(n===100)root.append(create('p','Showing only the first 100 matches.'))}
$('analyze').onclick=analyze;$('find').onclick=findMatches;
$('sample').onclick=()=>{$('source').value='She opened the door. The door was old. The door creaked.\n\n"Who is there?" she asked.\n\nNo one answered. The old door slowly closed. She opened it again.';analyze()};
$('clear').onclick=()=>{$('source').value='';$('needle').value='';analyze()};analyze();