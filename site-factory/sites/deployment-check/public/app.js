'use strict';
const $ = (id) => document.getElementById(id);
function cleanLines(value) {
  const seen = new Set();
  return value.split(/\r?\n/).map(s => s.trim()).filter(s => {
    if (!s || seen.has(s)) return false;
    seen.add(s);
    return true;
  }).join('\n');
}
$('run').addEventListener('click', () => { $('output').textContent = cleanLines($('input').value) || '남은 내용이 없습니다.'; });
$('reset').addEventListener('click', () => { $('input').value = ''; $('output').textContent = '초기화 완료'; });