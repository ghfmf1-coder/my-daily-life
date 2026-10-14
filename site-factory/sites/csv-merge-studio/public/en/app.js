'use strict';
(function(){
  const $=id=>document.getElementById(id);
  const kit=window.CsvKit;
  if(!kit){$('status').textContent='Could not load the CSV engine. Please refresh the page.';return}
  let datasets=[],columns=[],result=null;
  const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);return e};
  function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error)}
  function invalidate(){result=null;$('results').hidden=true;$('stats').replaceChildren();$('preview').replaceChildren()}
  function option(select,value,label){const e=node('option',label);e.value=value;select.append(e)}
  function reset(){
    datasets=[];columns=[];invalidate();
    $('csvFiles').value='';$('filesSection').hidden=true;$('mappingSection').hidden=true;
    $('fileList').replaceChildren();$('mappingList').replaceChildren();$('dedupKey').replaceChildren();
    option($('dedupKey'),'','Keep all rows (no deduplication)');
    status('Choose CSV files or load a sample to begin.');
  }
  function rowTable(file){
    const div=node('div');div.className='file-card';
    div.append(node('div',file.name),' ',node('span',file.rows.length.toLocaleString('en-US')+' rows · '+file.headers.length+' columns · '+(file.delimiter==='\t'?'tab':file.delimiter===';'?'semicolon':'comma')+' delimiter'));
    div.firstChild.className='file-name';
    const p=node('p','Input columns: '+file.headers.join(' / '));p.className='meta';div.append(p);
    return div;
  }
  function presentFiles(){
    $('filesSection').hidden=false;
    const root=$('fileList');root.replaceChildren();datasets.forEach(f=>root.append(rowTable(f)));
  }
  function buildMapping(){
    $('mappingSection').hidden=false;
    const saved=$('dedupKey').value;
    const dd=$('dedupKey');dd.replaceChildren();option(dd,'','Keep all rows (no deduplication)');
    columns.forEach(col=>option(dd,col,col));if(columns.includes(saved))dd.value=saved;
    const container=$('mappingList');container.replaceChildren();
    datasets.forEach((file,di)=>{
      const block=node('div');block.className='file-card';
      const head=node('h3',file.name+' · '+file.headers.length+' input columns');block.append(head);
      file.headers.forEach((header,ci)=>{
        const row=node('div');row.className='mapping-row';
        const src=node('span',header);src.title='original column: '+header;
        const arrow=node('i','→');arrow.setAttribute('aria-hidden','true');
        const select=node('select');
        select.setAttribute('aria-label',file.name+' — '+header+' column mapping');
        option(select,'','(Ignore field)');
        columns.forEach(col=>option(select,col,col));
        select.value=file.mapping[ci]||'';
        select.onchange=()=>{file.mapping[ci]=select.value;invalidate();status('Mapping changed. Run the merge again to preview your output.')};
        row.append(src,arrow,select);block.append(row);
      });
      container.append(block);
    });
    invalidate();
  }
  function setFiles(raw){
    const {columns:all,datasets:maps}=kit.proposeMappings(raw,'en');
    columns=all;datasets=maps;
    presentFiles();buildMapping();
    status(datasets.length+' file(s) loaded. Review mappings and run the merge.');
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
    if(uploads.length>10){status('Select no more than 10 files.',true);return}
    if(uploads.some(f=>f.size>8*1024*1024)||uploads.reduce((a,f)=>a+f.size,0)>20*1024*1024){status('File size limit exceeded: 8 MB each, 20 MB total.',true);return}
    status('Reading CSV files...');
    try{
      const files=[];
      for(const file of uploads){
        const low=file.name.toLowerCase();
        if(!low.endsWith('.csv')&&!low.endsWith('.tsv'))throw Error('Only .csv and .tsv files are supported: '+file.name);
        const text=await decode(file,$('charset').value);
        const parsed=kit.parseCsv(text);
        files.push({name:file.name,...parsed});
      }
      const rows=files.reduce((n,f)=>n+f.rows.length,0);
      if(rows>100000)throw Error('The combined input must have 100,000 rows or fewer.');
      setFiles(files);
    }catch(ex){status('File error: '+String(ex.message||ex),true)}
  });
  $('demoBtn').onclick=()=>{
    try{
      const a=kit.parseCsv('Name,Phone,Amount,Notes\nAlice,555-0101,1200,first order\nBob,555-0102,500,');
      const b=kit.parseCsv('Customer Name,Phone Number,Price,Comments\nAlice,5550101,2500,repeat order\nChris,555-0103,800,new');
      setFiles([{name:'customers-A.csv',...a},{name:'orders-B.csv',...b}]);
      $('dedupKey').value='Phone';
      status('Sample ready: try deduplication by Phone.');
    }catch(e){status('Sample error: '+e.message,true)}
  };
  $('resetBtn').onclick=reset;
  $('addColumn').onclick=()=>{
    const name=$('newColumn').value.trim();
    if(!name||name.length>60){status('Enter an output column name with 1–60 characters.',true);return}
    if(columns.some(x=>x.normalize('NFKC').toLowerCase()===name.normalize('NFKC').toLowerCase())){status('An output column with that name already exists.',true);return}
    if(columns.length>=200){status('You can create up to 200 output columns.',true);return}
    columns.push(name);$('newColumn').value='';buildMapping();status('Output column created. Assign an input column to it.');
  };
  $('mergeBtn').onclick=()=>{
    try{
      result=kit.merge(datasets,columns,$('dedupKey').value,$('dedupMode').value);
      $('results').hidden=false;
      const stats=$('stats');stats.replaceChildren();
      for(const [name,n] of [['Input',result.total],['Blank',result.empty],['Duplicates',result.duplicates],['Output',result.rows.length]]){
        stats.append(node('b',name+' '+n.toLocaleString('en-US')+' rows'));
      }
      const table=node('table'),thead=node('thead'),hr=node('tr');
      columns.forEach(h=>hr.append(node('th',h)));thead.append(hr);table.append(thead);
      const tbody=node('tbody');result.rows.slice(0,20).forEach(rec=>{
        const tr=node('tr');columns.forEach(k=>tr.append(node('td',rec[k]??'')));tbody.append(tr);
      });table.append(tbody);$('preview').replaceChildren(table);
      status('Merge successful: '+result.rows.length.toLocaleString('en-US')+' rows output; '+result.duplicates+' duplicate rows handled.');
      $('results').scrollIntoView({behavior:'smooth',block:'start'});
    }catch(ex){invalidate();status('Merge error: '+String(ex.message||ex),true)}
  };
  $('downloadBtn').onclick=()=>{
    if(!result){status('Merge the files before downloading.',true);return}
    const csv=kit.toCsv(columns,result.rows,$('formulaSafe').checked);
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='merged-csv.csv';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    status('Your merged CSV is downloading. Please verify the result.');
  };
  reset();
})();