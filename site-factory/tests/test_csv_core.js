'use strict';
const assert=require('node:assert/strict');
const kit=require('../sites/csv-merge-studio/public/csv-core.js');
{
  const r=kit.parseCsv('\uFEFF"이름","비고"\r\n"홍길동","첫줄\n둘째줄"\r\n"김,철수","따옴표 ""안녕"""');
  assert.deepEqual(r.headers,['이름','비고']);
  assert.equal(r.rows.length,2);
  assert.equal(r.rows[0][1],'첫줄\n둘째줄');
  assert.equal(r.rows[1][0],'김,철수');
  assert.equal(r.rows[1][1],'따옴표 "안녕"');
}
{
  const r=kit.parseCsv('성명;가격\n홍길동;1200\n김철수;2300');
  assert.equal(r.delimiter,';');assert.deepEqual(r.rows[1],['김철수','2300']);
  const t=kit.parseCsv('이름\t전화\n홍길동\t010');
  assert.equal(t.delimiter,'\t');
}
{
  const f1={name:'1.csv',...kit.parseCsv('성명,휴대폰,금액\n홍길동,010-1234,100\n김철수,010-5678,200')};
  const f2={name:'2.csv',...kit.parseCsv('고객명,전화번호,가격\n홍길동,0101234,900\n이영희,010-9090,300')};
  const proposed=kit.proposeMappings([f1,f2]);
  assert.deepEqual(proposed.columns,['이름','전화번호','금액']);
  const first=kit.merge(proposed.datasets,proposed.columns,'전화번호','first');
  assert.equal(first.rows.length,3);assert.equal(first.duplicates,1);assert.equal(first.rows[0].금액,'100');
  const last=kit.merge(proposed.datasets,proposed.columns,'전화번호','last');
  assert.equal(last.rows[0].금액,'900');
}
{
  const f=kit.proposeMappings([{name:'x',...kit.parseCsv('이름,성명\n홍길동,김철수')}]);
  assert.equal(f.columns.length,2);
  f.datasets[0].mapping[1]=f.datasets[0].mapping[0];
  assert.throws(()=>kit.merge(f.datasets,f.columns),/같은 파일/);
}
{
  assert.match(kit.toCsv(['값'],[{'값':'=HYPERLINK("x")'}]),/\'=HYPERLINK/);
  assert.match(kit.toCsv(['금액'],[{'금액':'-500'}]),/\r\n-500\r\n/);
  assert.throws(()=>kit.parseCsv('x\n"bad'),/닫히지 않은/);
  assert.throws(()=>kit.parseCsv('x\nabc"def'),/따옴표 위치/);
  assert.equal(kit.safeCell('a,b'),'"a,b"');
}
console.log('CSV core tests passed: parsing, aliases, merging, dedup, formula protection, error cases');
