const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(root,'css/design-system.css'),'utf8');
const marker='/* ===== DASHBOARD SCHOOL SUMMARY READABILITY V3 ===== */';
const block=css.slice(css.lastIndexOf(marker));
test('school summary v3 raises general mobile readability',()=>{
  assert.ok(block.startsWith(marker));
  assert.match(block,/\.ka-school-summary-card\{min-height:140px/);
  assert.match(block,/\.ka-school-summary-card>small\{font-size:10\.5px/);
  assert.match(block,/\.ka-school-summary-meta\{min-height:20px;gap:7px;font-size:11\.5px/);
});
test('gender and stage text do not collapse on narrow phones',()=>{
  assert.match(block,/\.ka-school-stage>small\{font-size:9\.8px/);
  assert.match(block,/\.ka-school-stage>div\{gap:6px;font-size:10\.8px/);
  assert.match(block,/@media\(max-width:390px\)[\s\S]*?\.ka-school-summary-meta\{gap:6px;font-size:10\.8px/);
  assert.match(block,/@media\(max-width:390px\)[\s\S]*?\.ka-school-stage>div\{gap:5px;font-size:10\.3px/);
});
