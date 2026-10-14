(function(root,factory){
  'use strict';
  const kit=factory();
  if(typeof module==='object' && module.exports) module.exports=kit;
  else root.CsvKit=kit;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const ALIASES=[
    ['이름',['이름','성명','고객명','고객이름','name','full name','fullname']],
    ['전화번호',['전화번호','전화','휴대폰','핸드폰','연락처','휴대전화','전화 번호','phone','mobile','tel']],
    ['이메일',['이메일','메일','전자우편','email','e-mail','mail']],
    ['주소',['주소','배송지','거주지','address']],
    ['날짜',['날짜','일자','등록일','작성일','거래일','date']],
    ['금액',['금액','가격','결제액','합계금액','판매금액','price','amount','total']],
    ['수량',['수량','개수','수량(개)','qty','quantity','count']],
    ['비고',['비고','메모','참고','notes','memo']]
  ];
  const normal=s=>String(s??'').normalize('NFKC').trim().toLowerCase().replace(/[\s_.\-()[\]{}]/g,'');
  function suggestedHeader(value){
    const clean=String(value??'').replace(/^\uFEFF/,'').trim();
    if(!clean)return '';
    const key=normal(clean);
    for(const [target,alts] of ALIASES)if(alts.some(a=>normal(a)===key))return target;
    return clean;
  }
  function detectDelimiter(text){
    const s=String(text).replace(/^\uFEFF/,'');
    const count={',':0,'\t':0,';':0};
    let quote=false;
    for(let i=0;i<s.length;i++){
      const c=s[i];
      if(c==='"'){
        if(quote && s[i+1]==='"'){i++;continue}
        quote=!quote;continue;
      }
      if(!quote && (c==='\n'||c==='\r'))break;
      if(!quote && Object.prototype.hasOwnProperty.call(count,c))count[c]++;
    }
    return Object.keys(count).sort((a,b)=>count[b]-count[a])[0]||',';
  }
  function parseCsv(text, delimiter='auto', maxRows=60000){
    const src=String(text).replace(/^\uFEFF/,'');
    const sep=delimiter==='auto'?detectDelimiter(src):delimiter;
    if(![',',';','\t'].includes(sep))throw Error('지원하지 않는 CSV 구분자입니다.');
    const records=[];let row=[],cell='',quote=false,afterQuote=false;
    function finishCell(){row.push(cell);cell='';afterQuote=false;}
    function finishRow(){
      finishCell();
      if(row.some(v=>v.trim()!=='')){
        records.push(row);
        if(records.length>maxRows+1)throw Error('파일당 최대 '+maxRows+'개 데이터 행만 처리할 수 있습니다.');
      }
      row=[];
    }
    for(let i=0;i<src.length;i++){
      const c=src[i];
      if(quote){
        if(c==='"'){
          if(src[i+1]==='"'){cell+='"';i++;}
          else{quote=false;afterQuote=true}
        }else cell+=c;
      }else if(c==='"'){
        if(cell!==''||afterQuote)throw Error('CSV 따옴표 위치가 잘못되었습니다 (문자 '+(i+1)+').');
        quote=true;
      }else if(c===sep){finishCell()}
      else if(c==='\r'||c==='\n'){
        finishRow();
        if(c==='\r'&&src[i+1]==='\n')i++;
      }else if(afterQuote && c!==' '){throw Error('닫힌 따옴표 뒤에 잘못된 문자가 있습니다 (문자 '+(i+1)+').')}
      else if(!afterQuote){cell+=c;}
    }
    if(quote)throw Error('닫히지 않은 CSV 따옴표가 있습니다.');
    if(row.length||cell!==''||afterQuote)finishRow();
    if(!records.length)throw Error('내용이 없는 CSV 파일입니다.');
    if(records[0].length>200)throw Error('열은 최대 200개까지 지원합니다.');
    const seen=new Map(),headers=records.shift().map((h,i)=>{
      const raw=h.trim()||'이름없는열'+(i+1);
      const key=raw.toLowerCase(),n=(seen.get(key)||0)+1;seen.set(key,n);
      return n>1?raw+' ('+n+')':raw;
    });
    if(headers.length>200)throw Error('열은 최대 200개까지 지원합니다.');
    const rows=records.map((row,i)=>{
      if(row.length>headers.length)throw Error((i+2)+'번째 CSV 행의 열 수가 제목행보다 많습니다.');
      return headers.map((_,j)=>row[j]??'');
    });
    return {headers,rows,delimiter:sep};
  }
  function proposeMappings(files){
    const columns=[];const normed=new Set();
    const datasets=files.map(file=>{
      const used=new Set();
      const mapping=file.headers.map(name=>{
        let target=suggestedHeader(name)||name;
        if(used.has(normal(target))){
          target=name;
          let n=2;
          while(used.has(normal(target))){target=name+'_'+n;n++;}
        }
        used.add(normal(target));
        if(!normed.has(normal(target))){columns.push(target);normed.add(normal(target))}
        return target;
      });
      return {...file,mapping};
    });
    return {columns,datasets};
  }
  function merge(datasets,columns,key='',keep='first'){
    if(!Array.isArray(datasets)||!Array.isArray(columns)||columns.length===0)throw Error('먼저 파일을 불러오세요.');
    if(!['first','last'].includes(keep))throw Error('중복 처리 방식을 확인하세요.');
    const names=new Set(columns.map(normal));
    if(names.size!==columns.length||names.has(''))throw Error('결과 열 이름이 중복되거나 비어 있습니다.');
    if(key && !columns.includes(key))throw Error('중복 기준 열이 존재하지 않습니다.');
    const kept=[],lookup=new Map();let ignored=0,empty=0,total=0;
    for(const file of datasets){
      if(!Array.isArray(file.mapping)||file.mapping.length!==file.headers.length)throw Error('열 매핑 수가 일치하지 않습니다.');
      const targets=file.mapping.filter(x=>x!=='');
      if(new Set(targets.map(normal)).size!==targets.length)throw Error('같은 파일에서 여러 입력 열이 하나의 결과 열에 연결되어 있습니다: '+file.name);
      if(targets.some(x=>!columns.includes(x)))throw Error('매핑 대상이 결과 열 목록에 없습니다: '+file.name);
      for(const row of file.rows){
        total++;
        if(row.every(v=>!String(v).trim())){empty++;continue}
        const record=Object.fromEntries(columns.map(k=>[k,'']));
        file.mapping.forEach((target,i)=>{if(target)record[target]=row[i]??''});
        if(key && String(record[key]).trim()){
          const normValue=String(record[key]).normalize('NFKC').trim().toLowerCase();
          const nkey=key==='전화번호'?normValue.replace(/[\s()+\-]/g,''):normValue;
          if(lookup.has(nkey)){
            ignored++;
            if(keep==='last')kept[lookup.get(nkey)]=record;
            continue;
          }
          lookup.set(nkey,kept.length);
        }
        kept.push(record);
      }
    }
    return {rows:kept,duplicates:ignored,empty,total};
  }
  function safeCell(value,formulaProtection=true){
    let s=String(value??'');
    if(formulaProtection && /^[\u0000-\u0020]*[=+@\-]/.test(s) && !/^\s*-\d+(?:[.,]\d+)?\s*$/.test(s))s="'"+s;
    if(/[",\r\n]/.test(s) || /^\s|\s$/.test(s))s='"'+s.replace(/"/g,'""')+'"';
    return s;
  }
  function toCsv(columns,records,formulaProtection=true){
    const data=[columns.map(x=>safeCell(x,formulaProtection)).join(',')];
    records.forEach(row=>data.push(columns.map(k=>safeCell(row[k],formulaProtection)).join(',')));
    return '\uFEFF'+data.join('\r\n')+'\r\n';
  }
  return {parseCsv,detectDelimiter,suggestedHeader,proposeMappings,merge,toCsv,safeCell};
});