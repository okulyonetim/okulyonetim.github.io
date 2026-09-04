from pathlib import Path

CSS = r'''

/* ===== NOTES PAGE REDESIGN V2 ===== */
/* Notlar sayfasi: tema-guvenli yuzeyler, daha guclu mobil hiyerarsi ve okunabilir not renkleri. */
.ka-communication-page:has(.ka-notes-workspace){gap:14px}
.ka-communication-page:has(.ka-notes-workspace)>.ka-communication-heading{display:none}
.ka-communication-page:has(.ka-notes-workspace)>.ka-communication-search{position:relative;gap:0;margin:0 0 2px}
.ka-communication-page:has(.ka-notes-workspace)>.ka-communication-search>.ka-field__label{display:none}
.ka-communication-page:has(.ka-notes-workspace)>.ka-communication-search input{
  min-height:52px;padding:0 16px 0 46px;border-color:var(--ka-border-strong);border-radius:17px;
  background:var(--ka-card-bg);color:var(--ka-text);box-shadow:var(--ka-shadow-sm)
}
.ka-communication-page:has(.ka-notes-workspace)>.ka-communication-search::before{
  content:"";position:absolute;z-index:2;left:17px;top:50%;width:14px;height:14px;margin-top:-9px;
  border:2px solid var(--ka-text-muted);border-radius:50%;pointer-events:none
}
.ka-communication-page:has(.ka-notes-workspace)>.ka-communication-search::after{
  content:"";position:absolute;z-index:2;left:30px;top:50%;width:7px;height:2px;margin-top:5px;
  border-radius:999px;background:var(--ka-text-muted);transform:rotate(45deg);transform-origin:left center;pointer-events:none
}
.ka-communication-page:has(.ka-notes-workspace)>.ka-communication-search input:focus{
  border-color:var(--ka-primary);box-shadow:0 0 0 3px var(--ka-focus),var(--ka-shadow-sm)
}

.ka-notes-workspace{gap:14px;padding-bottom:6px}
.ka-notes-hero{
  position:relative;isolation:isolate;overflow:hidden;min-height:146px;padding:22px;
  align-items:flex-end;border-color:var(--ka-hero-border);border-radius:24px;background:var(--ka-hero-bg);
  box-shadow:var(--ka-hero-shadow)
}
.ka-notes-hero::after{
  content:"";position:absolute;z-index:-1;right:-72px;top:-92px;width:190px;height:190px;border-radius:50%;
  background:color-mix(in srgb,var(--ka-primary) 10%,transparent)
}
.ka-notes-hero>div{max-width:560px}
.ka-notes-kicker{font-size:11px;letter-spacing:.14em;color:var(--ka-hero-kicker)}
.ka-notes-hero h1{margin-top:5px;font-size:clamp(30px,7vw,38px);letter-spacing:-.035em;color:var(--ka-hero-text)}
.ka-notes-hero p{max-width:520px;margin-top:7px;font-size:14px;line-height:1.5;color:var(--ka-hero-muted)}
.ka-notes-hero .ka-btn{
  position:relative;z-index:1;min-width:154px;min-height:48px;border-radius:15px;
  background:var(--ka-button-bg);color:var(--ka-button-text);box-shadow:0 8px 20px color-mix(in srgb,var(--ka-primary) 18%,transparent)
}

.ka-notes-summary{gap:9px}
.ka-notes-summary article{
  min-height:86px;padding:12px 13px;border-color:var(--ka-border);border-radius:18px;
  background:var(--ka-card-bg);color:var(--ka-text);box-shadow:var(--ka-shadow-sm)
}
.ka-notes-summary article>span{
  width:40px;height:40px;border-radius:13px;background:var(--ka-primary-soft);font-size:19px
}
.ka-notes-summary article:nth-child(2)>span{background:color-mix(in srgb,var(--ka-warning) 13%,var(--ka-card-bg))}
.ka-notes-summary article:nth-child(3)>span{background:color-mix(in srgb,var(--ka-accent) 13%,var(--ka-card-bg))}
.ka-notes-summary small{font-size:11px;line-height:1.25;color:var(--ka-text-muted);font-weight:800}
.ka-notes-summary b{margin-top:3px;font-size:25px;color:var(--ka-text);letter-spacing:-.03em}
.ka-notes-group{gap:10px}
.ka-notes-group__head{padding:3px 2px}
.ka-notes-group__head h3{font-size:16px;letter-spacing:-.01em}
.ka-notes-group__head .ka-badge{background:var(--ka-primary-soft);color:var(--ka-primary)}
.ka-notes-grid{gap:12px}

.ka-note-card{
  position:relative;border:1px solid color-mix(in srgb,var(--note-accent) 26%,var(--ka-border));
  border-left-width:1px;border-radius:20px;
  background:linear-gradient(180deg,color-mix(in srgb,var(--note-accent) 5%,var(--ka-card-bg)) 0,var(--ka-card-bg) 66px);
  color:var(--ka-text);box-shadow:var(--ka-shadow-sm)
}
.ka-note-card::before{content:"";display:block;flex:0 0 4px;height:4px;background:var(--note-accent)}
.ka-note-card:hover{border-color:color-mix(in srgb,var(--note-accent) 38%,var(--ka-border-strong));box-shadow:var(--ka-shadow-md)}
.ka-note-card__open{min-height:0;gap:12px;padding:15px 16px 14px}
.ka-note-card__head{gap:10px}
.ka-note-card__head>strong{font-size:16px;line-height:1.25;color:var(--ka-text);font-weight:850}
.ka-note-type span{
  width:34px;height:34px;border:1px solid color-mix(in srgb,var(--note-accent) 22%,var(--ka-border));
  border-radius:11px;background:color-mix(in srgb,var(--note-accent) 10%,var(--ka-card-bg));font-size:16px
}
.ka-note-card__date{
  padding:4px 7px;border:1px solid var(--ka-border);border-radius:999px;background:var(--ka-muted-bg);
  color:var(--ka-text-muted);font-size:10px
}
.ka-note-card__preview{font-size:13px;line-height:1.55;color:var(--ka-text)}
.ka-note-rich-preview{max-height:126px;color:var(--ka-text)}
.ka-note-todo-preview{gap:7px}
.ka-note-todo-row{gap:9px}
.ka-note-tags{gap:6px}
.ka-note-tags span{
  padding:4px 8px;background:color-mix(in srgb,var(--note-accent,var(--ka-primary)) 8%,var(--ka-card-bg));
  border-color:color-mix(in srgb,var(--note-accent,var(--ka-primary)) 22%,var(--ka-border));
  color:var(--ka-text-muted);font-size:10px
}
.ka-note-owner,.ka-note-progress{font-size:11px;color:var(--ka-text-muted)}
.ka-note-card__actions{
  display:grid;grid-template-columns:minmax(0,1fr) minmax(76px,.48fr);gap:8px;padding:10px 12px 12px;
  border-top:1px solid var(--ka-border);background:color-mix(in srgb,var(--ka-card-bg) 96%,var(--note-accent) 4%)
}
.ka-note-card__actions .ka-btn{min-height:40px;border-radius:12px;font-size:13px}
.ka-note-card__actions .ka-btn--secondary{
  border-color:color-mix(in srgb,var(--ka-primary) 22%,var(--ka-border));background:var(--ka-primary-soft);color:var(--ka-primary)
}
.ka-note-card__actions .ka-btn--ghost{
  border-color:color-mix(in srgb,var(--ka-danger) 18%,var(--ka-border));
  background:color-mix(in srgb,var(--ka-danger) 8%,var(--ka-card-bg));color:var(--ka-danger)
}
.ka-note-color{
  background:color-mix(in srgb,var(--note-accent) 28%,var(--ka-card-bg));
  border-color:var(--ka-card-bg)
}
.ka-note-color.active{box-shadow:0 0 0 3px var(--ka-card-bg),0 0 0 5px var(--note-accent)}

[data-theme="dark"] .ka-note-card{
  border-color:color-mix(in srgb,var(--note-accent) 32%,var(--ka-border));
  background:linear-gradient(180deg,color-mix(in srgb,var(--note-accent) 8%,var(--ka-card-bg)) 0,var(--ka-card-bg) 72px)
}
[data-theme="dark"] .ka-note-card__date{background:color-mix(in srgb,var(--ka-muted-bg) 88%,transparent)}
[data-theme="dark"] .ka-note-card__actions{background:color-mix(in srgb,var(--ka-card-bg) 94%,var(--note-accent) 6%)}
[data-theme="dark"] .ka-note-color{background:color-mix(in srgb,var(--note-accent) 38%,var(--ka-card-bg))}
[data-theme="dark"] .ka-notes-summary article{background:var(--ka-card-bg)}
[data-theme="dark"] .ka-notes-hero .ka-btn{box-shadow:none}

@media(max-width:640px){
  .ka-communication-page:has(.ka-notes-workspace){gap:12px}
  .ka-communication-page:has(.ka-notes-workspace)>.ka-communication-search input{min-height:50px;border-radius:16px}
  .ka-notes-workspace{gap:12px}
  .ka-notes-hero{min-height:0;padding:18px;border-radius:21px}
  .ka-notes-hero h1{font-size:30px}
  .ka-notes-hero p{font-size:13px}
  .ka-notes-hero .ka-btn{width:100%;min-height:46px;margin-top:2px}
  .ka-notes-summary{gap:7px}
  .ka-notes-summary article{min-height:78px;gap:8px;padding:10px 9px;border-radius:16px}
  .ka-notes-summary article>span{width:36px;height:36px;border-radius:11px;font-size:17px}
  .ka-notes-summary small{font-size:10px}
  .ka-notes-summary b{font-size:22px}
  .ka-notes-grid{gap:11px}
  .ka-note-card{border-radius:18px}
  .ka-note-card__open{padding:14px}
  .ka-note-card__head>strong{font-size:15px}
  .ka-note-card__preview{font-size:13px}
  .ka-note-card__actions{padding:9px 10px 10px}
}
@media(max-width:370px){
  .ka-notes-summary article{display:grid;justify-items:center;text-align:center;gap:5px;padding:9px 5px}
  .ka-notes-summary article>span{width:32px;height:32px}
  .ka-notes-summary small{font-size:9.5px}
  .ka-notes-summary b{font-size:21px}
}
'''

TEST = r'''const test=require('node:test');
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
'''

root = Path(__file__).resolve().parents[1]
css_path = root / 'css' / 'design-system.css'
css_text = css_path.read_text(encoding='utf-8')
marker = '/* ===== NOTES PAGE REDESIGN V2 ===== */'
if marker in css_text:
    raise SystemExit('notes redesign marker already exists')
css_path.write_text(css_text.rstrip() + CSS + '\n', encoding='utf-8')

index_path = root / 'index.html'
index = index_path.read_text(encoding='utf-8')
old = '<link rel="stylesheet" href="css/design-system.css?v=894">'
new = '<link rel="stylesheet" href="css/design-system.css?v=895">'
if index.count(old) != 1:
    raise SystemExit(f'index css version expected once, found {index.count(old)}')
index_path.write_text(index.replace(old, new), encoding='utf-8')

sw_path = root / 'service-worker.js'
sw = sw_path.read_text(encoding='utf-8')
replacements = [
    ("const CACHE_ADI='oy-cache-v895';", "const CACHE_ADI='oy-cache-v896';"),
    ("'./css/design-system.css?v=894'", "'./css/design-system.css?v=895'")
]
for old, new in replacements:
    if sw.count(old) != 1:
        raise SystemExit(f'service worker token expected once, found {sw.count(old)}: {old}')
    sw = sw.replace(old, new)
sw_path.write_text(sw, encoding='utf-8')

(root / 'tests' / 'notes-page-redesign.test.js').write_text(TEST, encoding='utf-8')
