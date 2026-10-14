'use strict';
const $=id=>document.getElementById(id),KEY='tb-novel-planner-v1';
let data={episodes:[],clues:[],people:[]};
try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');if(raw&&['episodes','clues','people'].every(k=>Array.isArray(raw[k])))data=raw}catch{}
const item=(tag,text)=>{const e=document.createElement(tag);e.textContent=String(text??'');return e};
function save(){try{localStorage.setItem(KEY,JSON.stringify(data));$('notice').textContent='Saved to this browser.'}catch{$('notice').textContent='Browser storage failed. Please export a JSON backup.'}render()}
function draw(id,items,label,key){const root=$(id);root.replaceChildren();items.forEach((entry,i)=>{const box=item('div','');box.className='item';box.append(item('div',label(entry)));const button=item('button','Delete');button.className='alt';button.onclick=()=>{data[key].splice(i,1);save()};box.append(button);root.append(box)})}
function render(){
  data.episodes.sort((a,b)=>a.n-b.n);
  draw('episodes',data.episodes,x=>'Chapter '+x.n+' · '+x.title+' — '+x.summary,'episodes');
  draw('clues',data.clues,x=>x.name+' · Introduced in '+x.plant+' → '+(x.payoff?'Resolved in '+x.payoff:'Unresolved')+' — '+x.note,'clues');
  draw('people',data.people,x=>x.name+' · First appears in '+x.debut+' — '+x.role,'people');
  const pending=data.clues.filter(x=>!x.payoff),invalid=data.clues.filter(x=>x.payoff&&x.payoff<x.plant);
  $('alerts').textContent=pending.length+' unresolved plot thread(s)'+(pending.length+0?' : '+pending.map(x=>x.name).join(', '):'')+(invalid.length?' / Payoff occurs before introduction: '+invalid.map(x=>x.name).join(', '):'');
}
const number=id=>Number($(id).value);
$('addEp').onclick=()=>{const n=number('ep'),title=$('epTitle').value.trim();if(!Number.isSafeInteger(n)||n<1||!title)return alert('Enter a positive chapter number and title.');const x={n,title,summary:$('summary').value.trim()};data.episodes=data.episodes.filter(e=>e.n!==n);data.episodes.push(x);save()};
$('addClue').onclick=()=>{const name=$('clue').value.trim(),plant=number('plant'),payoff=$('payoff').value?number('payoff'):null;if(!name||!Number.isSafeInteger(plant)||plant<1||(payoff!==null&&(!Number.isSafeInteger(payoff)||payoff<1)))return alert('Enter a clue name and valid chapter numbers.');data.clues.push({name,plant,payoff,note:$('clueNote').value.trim()});save()};
$('addPerson').onclick=()=>{const name=$('person').value.trim(),debut=number('debut');if(!name||!Number.isSafeInteger(debut)||debut<1)return alert('Enter a character name and valid first chapter.');data.people.push({name,debut,role:$('role').value.trim()});save()};
$('export').onclick=()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='webnovel-plan.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('import').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(f.size>2e6)return alert('Choose a file smaller than 2 MB.');try{const x=JSON.parse(await f.text());if(!x||!['episodes','clues','people'].every(k=>Array.isArray(x[k]))||x.episodes.length+x.clues.length+x.people.length>5000)throw Error();if(!confirm('Replace your existing local data with this backup?'))return;data=x;save()}catch{alert('This is not a valid planner backup.')}};
$('clear').onclick=()=>{if(confirm('Delete all chapters, plot threads, and characters?')){data={episodes:[],clues:[],people:[]};save()}};
render();