(()=>{
const search=document.querySelector('#tool-search');if(!search)return;
const cards=Array.from(document.querySelectorAll('.tool-card'));
const empty=document.querySelector('#search-empty');
search.addEventListener('input',()=>{
  const needle=search.value.trim().toLocaleLowerCase('ko-KR');let count=0;
  for(const card of cards){const show=card.dataset.filter.toLocaleLowerCase('ko-KR').includes(needle);card.hidden=!show;if(show)count++}
  empty.hidden=count>0;
});
})();
