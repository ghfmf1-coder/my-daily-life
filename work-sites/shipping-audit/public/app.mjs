import{parseCSV,detectColumn,compare,exportIssues}from'./core.mjs';import{parseXLSX}from'./xlsx.mjs';
const $=id=>document.getElementById(id);let order=null,shipping=null,current=[];
const maps=[['orderId','order',0],['orderStatus','status',0],['orderTracking','expected',0],['shipId','order',1],['shipTracking','tracking',1]];
const setStatus=(message,error=false)=>{const p=$('message');p.textContent=message;p.dataset.error=error?'1':'0'};
const clear=()=>{$('results').replaceChildren();$('stats').replaceChildren();$('download').disabled=true;current=[]};
function mapColumns(selectId,rows,kind){const select=$(selectId);select.replaceChildren();select.add(new Option('선택하지 않음','-1'));rows.headers.forEach((value,index)=>select.add(new Option((index+1)+'. '+(value||'제목 없음'),String(index))));select.value=String(detectColumn(rows.headers,kind))}
function apply(rows,side){if(side===0){order=rows;$('orderInfo').textContent=rows.headers.length+'열 · '+rows.rows.length.toLocaleString()+'행'}else{shipping=rows;$('shipInfo').textContent=rows.headers.length+'열 · '+rows.rows.length.toLocaleString()+'행'}for(const [id,kind,kindSide]of maps)if(side===kindSide)mapColumns(id,rows,kind);clear()}
async function loadFile(file){if(!file)throw Error('파일을 선택하세요.');if(file.size>16*1024*1024)throw Error('파일당 최대 16MB까지 지원합니다.');
 if(/\.xlsx$/i.test(file.name))return await parseXLSX(await file.arrayBuffer());
 if(/\.(csv|tsv|txt)$/i.test(file.name))return parseCSV(await file.text());
 throw Error('CSV·TSV·XLSX만 지원합니다. 구형 XLS는 CSV로 변환해 주세요.')}
async function fileChange(e,side){try{setStatus('브라우저 안에서 파일을 읽고 있습니다.');const rows=await loadFile(e.target.files?.[0]);apply(rows,side);setStatus('파일 인식 완료. 열을 확인한 뒤 검사를 실행하세요.')}catch(err){if(side===0)order=null;else shipping=null;clear();setStatus('파일 읽기 실패: '+err.message,true)}}
$('orderFile').addEventListener('change',e=>fileChange(e,0));$('shipFile').addEventListener('change',e=>fileChange(e,1));
$('demo').addEventListener('click',()=>{apply(parseCSV('상품주문번호,주문상태,운송장번호\n1001,결제완료,\n1002,취소,\n1003,발송완료,AAA\n1004,발송완료,\n'),0);apply(parseCSV('상품주문번호,운송장번호\n1002,BBB\n1003,CCC\n9999,DDD\n'),1);setStatus('예제 데이터 준비 완료. [검사 실행]을 누르세요.')});
$('run').addEventListener('click',()=>{try{if(!order||!shipping)throw Error('주문 파일과 송장 파일을 모두 선택하세요.');
 const n=id=>Number($(id).value);
 const report=compare(order,shipping,{order:n('orderId'),status:n('orderStatus'),expected:n('orderTracking')},{order:n('shipId'),tracking:n('shipTracking')});
 clear();current=report.issues;
 for(const [label,value]of [['주문번호',report.stats.orders],['송장 파일 행',report.stats.shipRows],['송장 매칭 주문',report.stats.matched],['우선 확인',report.stats.urgent],['검수 항목',current.length]]){
  const div=document.createElement('div'),name=document.createElement('span'),amount=document.createElement('strong');div.className='stat';name.textContent=label;amount.textContent=value.toLocaleString();div.append(name,amount);$('stats').append(div)}
 if(!report.hasStatus){const p=document.createElement('p');p.className='hint';p.textContent='주문 상태 열이 지정되지 않아 취소·반품 주문 검사는 진행하지 않았습니다.';$('results').append(p)}
 if(!current.length){const p=document.createElement('p');p.textContent='지정된 기준의 비교 항목은 발견되지 않았습니다. 최종 발송 상태는 별도로 확인하세요.';$('results').append(p)}
 else{const table=document.createElement('table'),thead=document.createElement('thead'),head=document.createElement('tr'),body=document.createElement('tbody');
  for(const t of ['확인 항목','주문번호 / 송장','상세 내용']){const th=document.createElement('th');th.textContent=t;head.append(th)}thead.append(head);table.append(thead);
  for(const item of current.slice(0,2000)){const tr=document.createElement('tr');if(item.urgent)tr.className='urgent';for(const v of [item.type,item.id,item.reason]){const td=document.createElement('td');td.textContent=v;tr.append(td)}body.append(tr)}table.append(body);$('results').append(table);
  if(current.length>2000){const p=document.createElement('p');p.textContent='화면에는 처음 2,000건만 표시합니다. 전체 항목은 CSV로 저장하세요.';$('results').append(p)}}
 $('download').disabled=current.length===0;setStatus('검사 완료 · 비교 결과는 이 기기에서만 처리되었습니다.');
 }catch(err){setStatus(err.message,true)}});
$('download').addEventListener('click',()=>{if(!current.length)return;const url=URL.createObjectURL(new Blob([exportIssues(current)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='shipping-audit-results.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)});
