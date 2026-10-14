'use strict';
(function(){
  const $=id=>document.getElementById(id);
  const kit=window.CsvKit;
  if(!kit){$('status').textContent='CSV 처리 라이브러리를 불러오지 못했습니다. 새로고침하세요.';return}
  let datasets=[],columns=[],result=null;
  const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);return e};
  function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error)}
  function invalidate(){result=null;$('results').hidden=true;$('stats').replaceChildren();$('preview').replaceChildren()}
  function option(select,value,label){const e=node('option',label);e.value=value;select.append(e)}
  function reset(){
    datasets=[];columns=[];invalidate();
    $('csvFiles').value='';$('filesSection').hidden=true;$('mappingSection').hidden=true;
    $('fileList').replaceChildren();$('mappingList').replaceChildren();$('dedupKey').replaceChildren();
    option($('dedupKey'),'','중복 제거하지 않음');
    status('파일을 선택하거나 예제를 눌러 시작하세요.');
  }
  function rowTable(file){
    const div=node('div');div.className='file-card';
    div.append(node('div',file.name),' ',node('span',file.rows.length.toLocaleString('ko-KR')+'행 · '+file.headers.length+'열 · '+(file.delimiter==='\t'?'탭':file.delimiter===';'?'세미콜론':'쉼표')+' 구분'));
    div.firstChild.className='file-name';
    const p=node('p','입력 열: '+file.headers.join(' / '));p.className='meta';div.append(p);
    return div;
  }
  function presentFiles(){
    $('filesSection').hidden=false;
    const root=$('fileList');root.replaceChildren();datasets.forEach(f=>root.append(rowTable(f)));
  }
  function buildMapping(){
    $('mappingSection').hidden=false;
    const saved=$('dedupKey').value;
    const dd=$('dedupKey');dd.replaceChildren();option(dd,'','중복 제거하지 않음');
    columns.forEach(col=>option(dd,col,col));if(columns.includes(saved))dd.value=saved;
    const container=$('mappingList');container.replaceChildren();
    datasets.forEach((file,di)=>{
      const block=node('div');block.className='file-card';
      const head=node('h3',file.name+' · '+file.headers.length+'개 입력 열');block.append(head);
      file.headers.forEach((header,ci)=>{
        const row=node('div');row.className='mapping-row';
        const src=node('span',header);src.title='원본 열: '+header;
        const arrow=node('i','→');arrow.setAttribute('aria-hidden','true');
        const select=node('select');
        select.setAttribute('aria-label',file.name+'의 '+header+' 열 연결');
        option(select,'','(제외)');
        columns.forEach(col=>option(select,col,col));
        select.value=file.mapping[ci]||'';
        select.onchange=()=>{file.mapping[ci]=select.value;invalidate();status('열 연결을 수정했습니다. 다시 병합을 실행하세요.')};
        row.append(src,arrow,select);block.append(row);
      });
      container.append(block);
    });
    invalidate();
  }
  function setFiles(raw){
    const {columns:all,datasets:maps}=kit.proposeMappings(raw);
    columns=all;datasets=maps;
    presentFiles();buildMapping();
    status(datasets.length+'개 파일을 불러왔습니다. 열 이름 연결을 확인한 뒤 병합을 실행하세요.');
  }
  async function decode(file,enc){
    const buf=await file.arrayBuffer();
    if(enc==='auto'){
      try{return new TextDecoder('utf-8',{fatal:true}).decode(buf)}
      catch{return new TextDecoder('euc-kr',{fatal:true}).decode(buf)}
    }
    return new TextDecoder(enc,{fatal:true}).decode(buf);
  }
  $('csvFiles').addEventListener('change',async e=>{
    const uploads=Array.from(e.target.files||[]);
    if(!uploads.length)return;
    if(uploads.length>10){status('10개 이하의 파일을 선택하세요.',true);return}
    if(uploads.some(f=>f.size>8*1024*1024)||uploads.reduce((a,f)=>a+f.size,0)>20*1024*1024){status('파일당 8MB 및 전체 20MB 제한을 초과했습니다.',true);return}
    status('CSV 파일을 분석하고 있습니다...');
    try{
      const files=[];
      for(const file of uploads){
        const low=file.name.toLowerCase();
        if(!low.endsWith('.csv')&&!low.endsWith('.tsv'))throw Error('CSV·TSV 파일만 지원합니다: '+file.name);
        const text=await decode(file,$('charset').value);
        const parsed=kit.parseCsv(text);
        files.push({name:file.name,...parsed});
      }
      const rows=files.reduce((n,f)=>n+f.rows.length,0);
      if(rows>100000)throw Error('총 10만 행 이내로 사용하세요.');
      setFiles(files);
    }catch(ex){status('파일 처리 실패: '+String(ex.message||ex),true)}
  });
  $('demoBtn').onclick=()=>{
    try{
      const a=kit.parseCsv('성명,휴대폰,금액,비고\n홍길동,010-1234-5678,1200,첫 구매\n김철수,010-1234-0000,500,');
      const b=kit.parseCsv('고객명,연락처,가격,메모\n홍길동,01012345678,2500,재구매\n이영희,010-1111-2222,800,신규');
      setFiles([{name:'고객명단-A.csv',...a},{name:'거래내역-B.csv',...b}]);
      $('dedupKey').value='전화번호';
      status('예제 준비 완료: 전화번호 기준 중복 제거를 실행해 보세요.');
    }catch(e){status('예제 오류: '+e.message,true)}
  };
  $('resetBtn').onclick=reset;
  $('addColumn').onclick=()=>{
    const name=$('newColumn').value.trim();
    if(!name||name.length>60){status('새 열 이름은 1~60자로 입력하세요.',true);return}
    if(columns.some(x=>x.normalize('NFKC').toLowerCase()===name.normalize('NFKC').toLowerCase())){status('이미 같은 이름의 결과 열이 있습니다.',true);return}
    if(columns.length>=200){status('결과 열은 최대 200개까지 생성할 수 있습니다.',true);return}
    columns.push(name);$('newColumn').value='';buildMapping();status('새 결과 열을 추가했습니다. 해당 열로 원본 열을 연결하세요.');
  };
  $('mergeBtn').onclick=()=>{
    try{
      result=kit.merge(datasets,columns,$('dedupKey').value,$('dedupMode').value);
      $('results').hidden=false;
      const stats=$('stats');stats.replaceChildren();
      for(const [name,n] of [['입력',result.total],['빈 행',result.empty],['중복',result.duplicates],['결과',result.rows.length]]){
        stats.append(node('b',name+' '+n.toLocaleString('ko-KR')+'행'));
      }
      const table=node('table'),thead=node('thead'),hr=node('tr');
      columns.forEach(h=>hr.append(node('th',h)));thead.append(hr);table.append(thead);
      const tbody=node('tbody');result.rows.slice(0,20).forEach(rec=>{
        const tr=node('tr');columns.forEach(k=>tr.append(node('td',rec[k]??'')));tbody.append(tr);
      });table.append(tbody);$('preview').replaceChildren(table);
      status('병합 성공: '+result.rows.length.toLocaleString('ko-KR')+'행 생성, 중복 '+result.duplicates+'행 처리.');
      $('results').scrollIntoView({behavior:'smooth',block:'start'});
    }catch(ex){invalidate();status('병합 실패: '+String(ex.message||ex),true)}
  };
  $('downloadBtn').onclick=()=>{
    if(!result){status('먼저 병합을 실행하세요.',true);return}
    const csv=kit.toCsv(columns,result.rows,$('formulaSafe').checked);
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='csv-맞춤-병합-결과.csv';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    status('CSV 다운로드를 시작했습니다. 출력 결과를 직접 확인해 주세요.');
  };
  reset();
})();