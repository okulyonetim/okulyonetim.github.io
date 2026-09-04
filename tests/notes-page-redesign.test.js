const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(root,'css/design-system.css'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
const marker='/* ===== NOTES PAGE REDESIGN V2 ===== */';
const block=css.slice(css.lastIndexOf(marker));

test('notes page removes generic communication heading and upgrades search',()=>{
  assert.ok(block.startsWith(marker));
  assert.match(block,/\.ka-communication-page:has\(\.ka-notes-workspace\)>\.ka-communication-heading\{display:none\}/);
  assert.match(block,/\.ka-communication-page:has\(\.ka-notes-workspace\)>\.ka-communication-search input\{[\s\S]*?background:var\(--ka-card-bg\);color:var\(--ka-text\)/);
});

test('notes hero and summary use central theme tokens',()=>{
  assert.match(block,/\.ka-notes-hero\{[\s\S]*?background:var\(--ka-hero-bg\)/);
  assert.match(block,/\.ka-notes-summary article\{[\s\S]*?background:var\(--ka-card-bg\);color:var\(--ka-text\)/);
  assert.match(block,/\.ka-notes-summary small\{font-size:11px/);
});

test('note cards no longer wash dark theme with fixed pastel surfaces',()=>{
  const cardRule=block.match(/\.ka-note-card\{[\s\S]*?\n\}/)?.[0]||'';
  assert.ok(cardRule.includes('var(--ka-card-bg)'));
  assert.ok(!cardRule.includes('var(--note-soft)'));
  assert.match(block,/\[data-theme="dark"\] \.ka-note-card\{[\s\S]*?var\(--ka-card-bg\)/);
  assert.match(block,/\[data-theme="dark"\] \.ka-note-color\{background:color-mix/);
});

test('note actions are readable and theme-safe',()=>{
  assert.match(block,/\.ka-note-card__actions \.ka-btn--secondary\{[\s\S]*?background:var\(--ka-primary-soft\);color:var\(--ka-primary\)/);
  assert.match(block,/\.ka-note-card__actions \.ka-btn--ghost\{[\s\S]*?color:var\(--ka-danger\)/);
});

test('notes redesign cache versions are wired',()=>{
  assert.ok(index.includes('css/design-system.css?v=895'));
  assert.ok(sw.includes("const CACHE_ADI='oy-cache-v896';"));
  assert.ok(sw.includes("'./css/design-system.css?v=895'"));
});
