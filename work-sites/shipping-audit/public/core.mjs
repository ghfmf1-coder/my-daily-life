// Small Toolbox — local-only shipping audit core (no network, no account).
export const clean=v=>String(v??'').replace(/^\uFEFF/,'').normalize('NFKC').trim();
const key=v=>clean(v).toLowerCase().replace(/[\s._()[\]·\-\/]/g,'');
const aliases={order:['상품주문번호','주문번호','발주번호','orderid','orderno','productorderid'],status:['주문상태','진행상태','배송상태','상태','status'],expected:['운송장번호','송장번호','trackingnumber','trackingno'],tracking:['운송장번호','송장번호','trackingnumber','trackingno']};
export function detectColumn(headers,kind){const names=headers.map(key);for(const a of aliases[kind]||[]){const i=names.indexOf(key(a));if(i>=0)return i}return -1}
export function parseCSV(text){
 text=String(text).replace(/^\uFEFF/,'');
 const first=text.split(/\r?\n/).find(Boolean)||'';
 const delim=[',','\t',';'].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
 const all=[];let row=[],cell='',quote=false;
 for(let i=0;i<text.length;i++){const ch=text[i];
 if(ch==='"'){if(quote&&text[i+1]==='"'){cell+='"';i++}else if(quote){quote=false}else if(!cell){quote=true}else{cell+='"'}}
 else if(ch===delim&&!quote){row.push(cell);cell=''}
 else if((ch==='\n'||ch==='\r')&&!quote){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>clean(x)))all.push(row);row=[];cell=''}
 else cell+=ch}
 if(quote)throw Error('CSV 따옴표가 닫히지 않았습니다.');
 row.push(cell);if(row.some(x=>clean(x)))all.push(row);
 if(all.length<2)throw Error('제목 행과 데이터 행이 있는 파일이 필요합니다.');
 if(all.length>50001)throw Error('데이터 행은 50,000개 이하만 지원합니다.');
 const headers=all.shift().map(clean);
 if(!headers.some(Boolean))throw Error('열 제목을 읽지 못했습니다.');
 return{headers,rows:all.map(r=>headers.map((_,i)=>clean(r[i])))};
}
const canceled=x=>/(취소|환불|반품|cancel|refund|return)/i.test(clean(x));
export function compare(order,shipping,om,sm){
 if(!order?.rows||!shipping?.rows)throw Error('주문 파일과 송장 파일이 모두 필요합니다.');
 if(![om.order,sm.order,sm.tracking].every(i=>Number.isInteger(i)&&i>=0))throw Error('주문번호·운송장번호 열은 필수입니다.');
 const get=(row,index)=>index>=0?clean(row[index]):'';
 const orders=new Map(),shipments=new Map(),trackingOrders=new Map();
 let missingOrderId=0,missingShippingId=0,missingTracking=0;
 for(const row of order.rows){const id=get(row,om.order);if(!id){missingOrderId++;continue}
  const item=orders.get(id)||{states:new Set(),expected:new Set()};
  const state=get(row,om.status),tracking=get(row,om.expected);
  if(state)item.states.add(state);if(tracking)item.expected.add(tracking);orders.set(id,item)}
 for(const row of shipping.rows){const id=get(row,sm.order),tracking=get(row,sm.tracking);
  if(!id){missingShippingId++;continue}if(!tracking){missingTracking++;continue}
  const arr=shipments.get(id)||[];arr.push(tracking);shipments.set(id,arr);
  const ids=trackingOrders.get(tracking)||new Set();ids.add(id);trackingOrders.set(tracking,ids)}
 const issues=[],add=(type,id,reason,urgent=false)=>issues.push({type,id,reason,urgent});
 for(const[id,item]of orders){const sent=shipments.get(id)||[],unique=[...new Set(sent)],states=[...item.states];
  const fullyCanceled=states.length>0&&states.every(canceled);
  if(!fullyCanceled&&!sent.length)add('송장 미매칭',id,'송장 파일에서 주문번호를 찾지 못했습니다. 아직 발송 전일 수도 있습니다.',true);
  if(fullyCanceled&&sent.length)add('취소·반품 관련 주문의 송장',id,'실제로 출고되었는지 확인하세요.',true);
  if(states.some(canceled)&&states.some(s=>!canceled(s)))add('주문 상태 혼재',id,states.join(' / '));
  if(unique.length>1)add('한 주문에 여러 송장',id,unique.join(' / ')+' (분할배송 가능)');
  if(unique.length<sent.length)add('송장 행 중복',id,'같은 주문·송장번호가 여러 행에 있습니다.');
  if(item.expected.size&&sent.length&&!unique.some(x=>item.expected.has(x)))add('기존 송장번호 불일치',id,'주문 목록 '+[...item.expected].join(' / ')+' · 송장 목록 '+unique.join(' / '),true)}
 for(const[id,values]of shipments)if(!orders.has(id))add('주문 목록에 없는 송장',id,[...new Set(values)].join(' / '),true);
 for(const[tracking,ids]of trackingOrders)if(ids.size>1)add('동일 송장의 여러 주문 사용',tracking,[...ids].join(' / ')+' (합포장 가능)');
 if(missingOrderId)add('주문번호 없는 행','—',missingOrderId+'개 주문 행은 비교하지 못했습니다.');
 if(missingShippingId)add('송장측 주문번호 없는 행','—',missingShippingId+'개 송장 행은 비교하지 못했습니다.');
 if(missingTracking)add('송장번호 없는 행','—',missingTracking+'개 송장 행에 운송장번호가 없습니다.');
 issues.sort((a,b)=>Number(b.urgent)-Number(a.urgent));
 const unmatched=[...orders].filter(([id,item])=>!shipments.has(id)&&!([...item.states].length&&[...item.states].every(canceled))).length;
 return{issues,stats:{orders:orders.size,shipRows:shipping.rows.length,matched:[...orders.keys()].filter(id=>shipments.has(id)).length,unmatched,urgent:issues.filter(x=>x.urgent).length},hasStatus:om.status>=0};
}
const quoteCSV=x=>'"'+clean(x).replace(/^[=+@\-\t\r]/,c=>"'"+c).replace(/"/g,'""')+'"';
export function exportIssues(items){return'\uFEFF'+[['검수 항목','주문번호 또는 송장번호','상세 내용','우선 확인'],...items.map(x=>[x.type,x.id,x.reason,x.urgent?'예':'아니요'])].map(r=>r.map(quoteCSV).join(',')).join('\r\n')}
