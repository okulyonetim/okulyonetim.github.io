const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const css=fs.readFileSync('css/design-system.css','utf8');
const v2='/* ===== DASHBOARD SCHOOL SUMMARY READABILITY V2 ===== */';
const v3='/* ===== DASHBOARD SCHOOL SUMMARY READABILITY V3 ===== */';
test('obsolete school summary css layer is retired',()=>{
  assert.equal(css.includes(v2),false);
  assert.equal((css.match(/DASHBOARD SCHOOL SUMMARY READABILITY V3/g)||[]).length,1);
});
test('v3 keeps the visual details formerly inherited from v2',()=>{
  const block=css.slice(css.indexOf(v3));
  assert.match(block,/\.ka-school-summary-section>\.ka-home-section__head \.ka-home-section__icon\{font-size:20px\}/);
  assert.match(block,/\.ka-school-summary-card::after\{width:60px;height:60px;right:-19px;top:-19px\}/);
});
