// Lightweight XLSX reader for first worksheet. No external library or network.
import{clean}from'./core.mjs';
const utf8=bytes=>new TextDecoder().decode(bytes);
const MAX=16*1024*1024,MAXXML=50*1024*1024;
function parseXML(text){const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror'))throw Error('엑셀 XML을 읽지 못했습니다.');return doc}
async function readZip(buffer){
 const bytes=new Uint8Array(buffer);if(bytes.length>MAX)throw Error('파일은 16MB 이하만 지원합니다.');
 const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 let e=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(d.getUint32(i,true)===0x06054b50){e=i;break}
 if(e<0)throw Error('올바른 XLSX 파일이 아닙니다.');
 const count=d.getUint16(e+10,true),start=d.getUint32(e+16,true);if(count>3000)throw Error('압축 항목이 너무 많습니다.');
 const files=new Map();let p=start;
 for(let j=0;j<count;j++){
  if(p+46>bytes.length||d.getUint32(p,true)!==0x02014b50)throw Error('XLSX ZIP 인덱스 오류');
  const flags=d.getUint16(p+8,true),method=d.getUint16(p+10,true),size=d.getUint32(p+20,true),unpacked=d.getUint32(p+24,true),nameLength=d.getUint16(p+28,true),extra=d.getUint16(p+30,true),comment=d.getUint16(p+32,true),offset=d.getUint32(p+42,true);
  const path=utf8(bytes.slice(p+46,p+46+nameLength));p+=46+nameLength+extra+comment;
  if(flags&1)throw Error('암호화된 XLSX 파일은 지원하지 않습니다.');
  if(unpacked>MAXXML)throw Error('엑셀 시트의 압축 해제 크기가 너무 큽니다.');
  if(!/^xl\/(sharedStrings\.xml|worksheets\/sheet[0-9]+\.xml)$/.test(path))continue;
  if(offset+30>bytes.length||d.getUint32(offset,true)!==0x04034b50)throw Error('XLSX ZIP 항목 위치 오류');
  const from=offset+30+d.getUint16(offset+26,true)+d.getUint16(offset+28,true);
  if(from+size>bytes.length)throw Error('손상된 XLSX 파일입니다.');
  let value=bytes.slice(from,from+size);
  if(method===8){if(typeof DecompressionStream==='undefined')throw Error('브라우저가 XLSX 압축 해제를 지원하지 않습니다. CSV를 사용해 주세요.');
    const stream=new Blob([value]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    value=new Uint8Array(await new Response(stream).arrayBuffer());
  }else if(method!==0)throw Error('지원하지 않는 엑셀 압축 형식입니다.');
  if(value.length!==unpacked||value.length>MAXXML)throw Error('압축 해제 데이터 검증 실패');
  files.set(path,utf8(value))}
 return files;
}
const cellIndex=s=>{let n=0;const match=/^[A-Z]+/i.exec(s||'');if(!match)return -1;for(const ch of match[0].toUpperCase())n=n*26+ch.charCodeAt(0)-64;return n-1};
export async function parseXLSX(buffer){
 const files=await readZip(buffer),path=[...files.keys()].filter(x=>/^xl\/worksheets\/sheet\d+\.xml$/.test(x)).sort((a,b)=>Number(a.match(/sheet(\d+)/)?.[1])-Number(b.match(/sheet(\d+)/)?.[1]))[0];
 if(!path)throw Error('첫 시트를 찾을 수 없습니다.');
 let shared=[];
 if(files.has('xl/sharedStrings.xml')){const strings=parseXML(files.get('xl/sharedStrings.xml'));shared=[...strings.getElementsByTagName('si')].map(el=>[...el.getElementsByTagName('t')].map(n=>n.textContent).join(''))}
 const doc=parseXML(files.get(path)),rows=[...doc.getElementsByTagName('row')];
 if(rows.length>50001)throw Error('엑셀 데이터는 50,000행 이하만 지원합니다.');
 const matrix=[];
 for(const row of rows){const cells=[];let fallback=0;
  for(const el of row.childNodes){if(el.nodeType!==1||el.localName!=='c')continue;
   const index=cellIndex(el.getAttribute('r'));const col=index>=0?index:fallback++;if(col>250)throw Error('엑셀 열은 최대 251개까지 지원합니다.');
   const type=el.getAttribute('t'),node=el.getElementsByTagName('v')[0];let value=node?.textContent||'';
   if(type==='s')value=shared[Number(value)]||'';
   if(type==='inlineStr')value=[...el.getElementsByTagName('t')].map(x=>x.textContent).join('');
   cells[col]=clean(value)}
  if(cells.some(Boolean))matrix.push(cells)}
 if(matrix.length<2)throw Error('첫 시트에 제목 행과 데이터 행이 있어야 합니다.');
 const headers=matrix.shift().map(clean);return{headers,rows:matrix.map(row=>headers.map((_,i)=>clean(row[i])))};
}
