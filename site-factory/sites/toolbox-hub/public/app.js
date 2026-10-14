'use strict';
(()=>{
 const cards=[...document.querySelectorAll('.tool')],search=document.getElementById('toolSearch'),
 filter=document.getElementById('toolCategory'),counter=document.getElementById('resultCount'),empty=document.getElementById('empty');
 const lang=document.documentElement.lang;
 function update(){
  const q=search.value.toLocaleLowerCase(lang).normalize('NFKC').trim(),
        category=filter.value;
  let visible=0;
  for(const card of cards){
   const searchable=(card.dataset.search||'').toLocaleLowerCase(lang).normalize('NFKC');
   const show=(category==='all'||card.dataset.category===category)&&(!q||searchable.includes(q));
   card.hidden=!show;if(show)visible++;
  }
  counter.textContent=lang==='en'?visible+' tools available':visible+'개 도구 표시';
  empty.hidden=visible>0;
 }
 search.addEventListener('input',update);filter.addEventListener('change',update);update();
})();
