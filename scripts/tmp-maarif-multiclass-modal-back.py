from pathlib import Path


def replace(path, old, new, count=1):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Expected contract not found in {path}: {old[:120]}')
    p.write_text(text.replace(old, new, count), encoding='utf-8')


rubric = 'js/modules/rubric-settings.js'
shell = 'js/core/shell-ui.js'
css = 'css/design-system.css'
index = 'index.html'
sw = 'service-worker.js'

replace(
    rubric,
    "function pageHead(type){if(type==='rehberlik')return guidancePageHead();return modernPageHead(type)}",
    "function cizelgeBackNav(){return `<div class=\"ka-cizelge-page-nav\"><button class=\"ka-cizelge-back\" type=\"button\" data-cizelge-back aria-label=\"Önceki sayfaya dön\"><span aria-hidden=\"true\">←</span><strong>Geri</strong></button></div>`}function pageHead(type){const head=type==='rehberlik'?guidancePageHead():modernPageHead(type);return `${cizelgeBackNav()}${head}`}",
)

replace(
    rubric,
    "function bindPage(root){root.querySelector('[data-cizelge-add]')?.addEventListener('click',()=>openEdit(currentType));",
    "function bindPage(root){root.querySelector('[data-cizelge-back]')?.addEventListener('click',()=>global.ShellUI?.back?.());root.querySelector('[data-cizelge-add]')?.addEventListener('click',()=>openEdit(currentType));",
)

replace(
    rubric,
    "if(type==='maarifRapor')return `${field('Öğretmen',teacherSelect('ogretmenId',r.ogretmenId))}${field('Ders',lessonSelect(r.ders))}${field(r.id?'Sınıf':'Sınıflar (çoklu seçim — her sınıf ayrı kayıt olur)',r.id?classSelect('sinif',r.sinif,false):classChecks('siniflar',[],false))}${field('Açıklama (opsiyonel)',`<textarea name=\"aciklama\" rows=\"3\">${esc(r.aciklama||'')}</textarea>`)}`;",
    "if(type==='maarifRapor')return `${field('Öğretmen',teacherSelect('ogretmenId',r.ogretmenId))}${field('Ders',lessonSelect(r.ders))}${field('Sınıflar (çoklu seçim — her sınıf ayrı kayıt olur)',classChecks('siniflar',r.sinif?[r.sinif]:[],false))}${field('Açıklama (opsiyonel)',`<textarea name=\"aciklama\" rows=\"3\">${esc(r.aciklama||'')}</textarea>`)}`;",
)

replace(
    rubric,
    "function openEdit(type,id=''){const row=id?arr(type).find(x=>x.id===id)||{}:{};const c=CFG[type];closeModal();document.body.insertAdjacentHTML",
    "function lockModal(){document.body.classList.add('ka-cizelge-modal-open')}function openEdit(type,id=''){const row=id?arr(type).find(x=>x.id===id)||{}:{};const c=CFG[type];closeModal();lockModal();document.body.insertAdjacentHTML",
)

p = Path(rubric)
text = p.read_text(encoding='utf-8')
text = text.replace("closeModal();document.body.insertAdjacentHTML", "closeModal();lockModal();document.body.insertAdjacentHTML")
text = text.replace(
    "function closeModal(){document.querySelector('[data-cizelge-modal]')?.remove()}",
    "function closeModal(){document.querySelector('[data-cizelge-modal]')?.remove();document.body.classList.remove('ka-cizelge-modal-open')}",
)
p.write_text(text, encoding='utf-8')

old_save = "if(!id&&(type==='bepPlani'||type==='maarifRapor')){const classes=getAll(fd,'siniflar');if(type==='maarifRapor'&&!classes.length)throw new Error('En az bir sınıf seçiniz.');if(classes.length){const base={...v};delete base.sinif;await global.CizelgelerService.cokluKayitOlustur(type,base,'sinif',classes)}else await global.CizelgelerService.kayitKaydet(type,null,{...v,sinif:''})}else await global.CizelgelerService.kayitKaydet(type,id||null,v);global.toast?.('Kaydedildi.');"
new_save = "if(type==='maarifRapor'){const classes=getAll(fd,'siniflar');if(!classes.length)throw new Error('En az bir sınıf seçiniz.');const base={...v};delete base.sinif;if(!id){await global.CizelgelerService.cokluKayitOlustur(type,base,'sinif',classes)}else{const original=String(row?.sinif||''),siblings=arr(type).filter(x=>String(x.id)!==String(id)&&String(x.ogretmenId||'')===String(base.ogretmenId||'')&&String(x.ders||'')===String(base.ders||'')),existing=new Set(siblings.map(x=>String(x.sinif||''))),primary=classes.find(c=>String(c)===original&&!existing.has(String(c)))||classes.find(c=>!existing.has(String(c)))||'';if(primary)await global.CizelgelerService.kayitKaydet(type,id,{...base,sinif:primary,kontroller:row?.kontroller||Array(10).fill(false)});else await global.CizelgelerService.kayitSil(type,id);const extras=classes.filter(c=>String(c)!==String(primary)&&!existing.has(String(c)));if(extras.length){const fresh={...base,kontroller:Array(10).fill(false)};await global.CizelgelerService.cokluKayitOlustur(type,fresh,'sinif',extras)}}}else if(!id&&type==='bepPlani'){const classes=getAll(fd,'siniflar');if(classes.length){const base={...v};delete base.sinif;await global.CizelgelerService.cokluKayitOlustur(type,base,'sinif',classes)}else await global.CizelgelerService.kayitKaydet(type,null,{...v,sinif:''})}else await global.CizelgelerService.kayitKaydet(type,id||null,v);global.toast?.('Kaydedildi.');"
replace(rubric, old_save, new_save)

replace(
    shell,
    "'[data-close],[data-modal-close],[data-note-close],[data-bus-close],[data-people-modal-close]'",
    "'[data-close],[data-modal-close],[data-note-close],[data-bus-close],[data-people-modal-close],[data-cizelge-cancel]'",
)

css_path = Path(css)
css_text = css_path.read_text(encoding='utf-8')
marker = '/* ===== CIZELGE NAV / MODAL LOCK V1 ===== */'
if marker not in css_text:
    css_text += """

/* ===== CIZELGE NAV / MODAL LOCK V1 ===== */
body.ka-cizelge-modal-open{overflow:hidden!important;overscroll-behavior:none!important}
body.ka-cizelge-modal-open .ka-app-shell{overscroll-behavior:none!important}
[data-cizelge-modal]{overscroll-behavior:none}
[data-cizelge-modal] .ka-modal{display:flex;flex-direction:column;overflow:hidden}
[data-cizelge-modal] .ka-modal__header,[data-cizelge-modal] .ka-modal__footer{flex:0 0 auto}
[data-cizelge-modal] .ka-modal__body{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y}
.ka-cizelge-page-nav{display:flex;align-items:center;margin:0 0 8px;padding:0 2px}
.ka-cizelge-back{appearance:none;min-height:40px;padding:0 13px;border:1px solid var(--ka-border);border-radius:13px;background:var(--ka-card-bg);color:var(--ka-text);box-shadow:var(--ka-shadow-sm);display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:850;cursor:pointer}
.ka-cizelge-back>span{font-size:20px;line-height:1;color:var(--ka-primary)}
.ka-cizelge-back:active{transform:scale(.98);background:var(--ka-primary-soft)}
.ka-cizelge-back:focus-visible{outline:3px solid var(--ka-focus);outline-offset:2px}
@media(max-width:520px){.ka-cizelge-page-nav{margin-bottom:7px}.ka-cizelge-back{min-height:38px;padding-inline:11px;border-radius:12px;font-size:10.5px}}
"""
css_path.write_text(css_text, encoding='utf-8')

replace(index, 'css/design-system.css?v=900', 'css/design-system.css?v=901')
replace(index, 'js/core/shell-ui.js?v=881', 'js/core/shell-ui.js?v=882')
replace(sw, "const CACHE_ADI='oy-cache-v905';", "const CACHE_ADI='oy-cache-v906';")
replace(sw, "'./css/design-system.css?v=900'", "'./css/design-system.css?v=901'")
replace(sw, "'./js/core/shell-ui.js?v=881'", "'./js/core/shell-ui.js?v=882'")

Path('tests/maarif-multiclass-modal-navigation.test.js').write_text(
    r'''const fs=require('fs');
const assert=require('assert');
const rubric=fs.readFileSync('js/modules/rubric-settings.js','utf8');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');
assert(rubric.includes("classChecks('siniflar',r.sinif?[r.sinif]:[],false)"),'Maarif düzenleme formu çoklu sınıf seçimini korumalı.');
assert(rubric.includes("if(type==='maarifRapor'){const classes=getAll(fd,'siniflar')"),'Maarif kaydetme akışı seçili sınıfları ayrı ele almalı.');
assert(rubric.includes("CizelgelerService.cokluKayitOlustur(type,fresh,'sinif',extras)"),'Düzenlemede eklenen sınıflar ayrı takip kayıtları oluşturmalı.');
assert(rubric.includes("data-cizelge-back")&&rubric.includes("global.ShellUI?.back?.()"),'Tüm klasik çizelge sayfalarında üst geri düğmesi olmalı.');
assert(rubric.includes("ka-cizelge-modal-open")&&rubric.includes("function lockModal()"),'Çizelge modalı arka sayfa kaymasını kilitlemeli.');
assert(shell.includes('[data-cizelge-cancel]'),'Uygulama geri hareketi açık çizelge modalını önce kapatmalı.');
assert(css.includes('body.ka-cizelge-modal-open{overflow:hidden!important')&&css.includes('[data-cizelge-modal] .ka-modal__body'),'Modal scroll zinciri arka sayfaya taşmamalı.');
console.log('Maarif multi-class, modal lock and schedule back navigation OK');
''',
    encoding='utf-8',
)

print('Maarif multi-class, modal lock and schedule back navigation patch applied.')
