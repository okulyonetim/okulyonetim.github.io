const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(root,'css/design-system.css'),'utf8');
const marker='/* ===== DASHBOARD SCHOOL SUMMARY READABILITY V2 ===== */';
const block=css.slice(css.lastIndexOf(marker));

test('school summary has readable general mobile typography',()=>{
  assert.ok(block.startsWith(marker));
  assert.match(block,/\.ka-school-summary-card\{min-height:128px;padding:12px 10px 10px/);
  assert.match(block,/\.ka-school-summary-card>small\{font-size:10px/);
  assert.match(block,/\.ka-school-summary-card>b\{margin:3px 0 5px;font-size:27px/);
  assert.match(block,/\.ka-school-summary-meta\{min-height:18px;gap:6px;font-size:9\.5px/);
});

test('student gender breakdown stays readable on narrow phones',()=>{
  assert.match(block,/\.ka-school-stage>small\{font-size:8\.5px/);
  assert.match(block,/\.ka-school-stage>div\{gap:5px;font-size:9\.5px/);
  assert.match(block,/@media\(max-width:390px\)[\s\S]*?\.ka-school-summary-meta\{gap:5px;font-size:9\.2px\}/);
  assert.match(block,/@media\(max-width:390px\)[\s\S]*?\.ka-school-stage>div\{gap:4px;font-size:9px\}/);
});
