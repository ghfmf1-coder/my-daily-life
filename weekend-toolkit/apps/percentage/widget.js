(()=>{
'use strict';
const byId=id=>document.getElementById(id),fmt=v=>Number.isFinite(v)?new Intl.NumberFormat('ko-KR',{maximumFractionDigits:4}).format(v):'계산할 수 없습니다';
function read(id){const raw=byId(id).value.trim();return raw===''?NaN:Number(raw)}
function update(){const whole=read('pct-whole'),part=read('pct-part'),base=read('pct-base'),percent=read('pct-percent');
byId('pct-ratio').textContent=Number.isFinite(whole)&&Number.isFinite(part)&&whole!==0?fmt(part/whole*100)+'%':'계산할 수 없습니다';
byId('pct-value').textContent=fmt(base*percent/100);
}
['pct-whole','pct-part','pct-base','pct-percent'].forEach(id=>byId(id).addEventListener('input',update));update();
})();
