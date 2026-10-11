(()=>{
'use strict';
const input=document.querySelector('#word-input');if(!input)return;
const fmt=n=>n.toLocaleString('ko-KR');
const outputs={all:document.querySelector('#wc-all'),noSpace:document.querySelector('#wc-no-space'),words:document.querySelector('#wc-words'),lines:document.querySelector('#wc-lines'),bytes:document.querySelector('#wc-bytes')};
const encoder=new TextEncoder();
function update(){const s=input.value;const codepoints=Array.from(s);
outputs.all.textContent=fmt(codepoints.length);
outputs.noSpace.textContent=fmt(codepoints.filter(c=>!(/\s/u.test(c))).length);
outputs.words.textContent=fmt(s.trim()?s.trim().split(/\s+/u).length:0);
outputs.lines.textContent=fmt(s.length?s.split(/\r\n|\r|\n/u).length:0);
outputs.bytes.textContent=fmt(encoder.encode(s).length);
}
input.addEventListener('input',update);
document.querySelector('#wc-clear').addEventListener('click',()=>{input.value='';update();input.focus()});
update();
})();
