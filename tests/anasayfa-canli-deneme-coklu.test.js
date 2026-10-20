const test=require('node:test');const assert=require('node:assert');const fs=require('fs');
const src=fs.readFileSync(__dirname+'/../js/modules/dashboard.js','utf8');
const css=fs.readFileSync(__dirname+'/../css/design-system-base.css','utf8');
test('canlı deneme sayacı birden fazla sınavı gösterir',()=>{
  assert.ok(!/trialLiveRows\(\)\.slice\(0,1\)/.test(src));
  assert.match(src,/function trialCounterMulti\(list\)/);
  assert.match(src,/list\.length>1\)return trialCounterMulti\(list\)/);
  assert.match(src,/data-dash-trial-timer="\$\{esc\(x\.id\)\}"/);
});
test('kompakt satır CSS tokenlarla yazıldı',()=>{
  const m=css.match(/kh-trial-live__row\{[^}]*\}/);assert.ok(m);assert.ok(!/#[0-9a-f]{3,6}\b/i.test(m[0]));
});
