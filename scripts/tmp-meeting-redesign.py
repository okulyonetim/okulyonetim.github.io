from pathlib import Path
import re

page_path=Path('js/modules/meeting-schedule.js')
page=page_path.read_text(encoding='utf-8')
pattern=re.compile(r"function groupSummary\(group\)\{.*?\n\}\nfunction listHtml\(\)\{.*?\n\}\nfunction pageHtml\(",re.S)
replacement=r'''function groupSummary(group){
  const first=group.list[0]||{},title=commonTitle(first),ordered=group.list.slice().sort((a,b)=>`${a.tarih||''} ${a.saat||''}`.localeCompare(`${b.tarih||''} ${b.saat||''}`)),start=ordered[0]||first,end=ordered[ordered.length-1]||first,sameDay=String(start.tarih||'')===String(end.tarih||''),startTime=String(start.saat||'').slice(0,5),endTime=String(end.saat||'').slice(0,5),range=ordered.length<=1?`${formatDate(start.tarih)}${startTime?` · ${startTime}`:''}`:sameDay?`${formatDate(start.tarih)}${startTime?` · ${startTime}`:''}${endTime&&endTime!==startTime?`–${endTime}`:''}`:`${formatDate(start.tarih)}${startTime?` ${startTime}`:''} – ${formatDate(end.tarih)}${endTime?` ${endTime}`:''}`;
  const sessions=group.list.map((r,i)=>{const detail=scopeText(r),topic=r.satirKonusu&&r.tur==='zumre'?String(r.satirKonusu).trim():'',classesText=selectedClassNames(r);return `<div class="ka-meeting-session"><span class="ka-meeting-session__no">${i+1}</span><div class="ka-meeting-session__main"><strong>${esc(detail)}${topic?` · ${esc(topic)}`:''}</strong><div class="ka-meeting-session__meta">${classesText&&classesText!=='—'?`<span class="is-classes">${esc(classesText)}</span>`:''}<time>${esc(formatDate(r.tarih))}</time>${r.saat?`<span>${esc(r.saat)}</span>`:''}</div></div></div>`}).join('');
  return `<article class="ka-card ka-meeting-item"><div class="ka-card__body ka-meeting-saved-card"><div class="ka-meeting-saved-head"><div class="ka-meeting-saved-title">${typeBadge(first.tur)}<div><strong>${esc(title)}</strong><small>${group.list.length} oturum</small></div></div><span class="ka-meeting-saved-range">${esc(range)}</span></div><div class="ka-meeting-session-list">${sessions}</div>${canEdit()?`<div class="ka-meeting-item__actions"><button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-meeting-edit-group="${esc(group.key)}">Düzenle</button><button type="button" class="ka-btn ka-btn--ghost ka-btn--sm ka-meeting-delete" data-meeting-delete-group="${esc(group.key)}">Sil</button></div>`:''}</div></article>`;
}
function listHtml(){
  const groups=groupedRecords();
  return `<section class="ka-stack ka-meeting-list"><div class="ka-meeting-list-head"><div><h3>Kaydedilen Toplantılar</h3><p class="ka-muted">Toplantılar ortak başlık altında tek kartta gruplanır.</p></div><span class="ka-badge ka-meeting-list-count">${groups.length} grup · ${records().length} toplantı</span></div>${groups.length?groups.map(groupSummary).join(''):'<div class="ka-empty">Henüz toplantı eklenmedi.</div>'}<button type="button" class="ka-btn ka-btn--secondary ka-meeting-report-button" data-meeting-report ${records().length?'':'disabled'}>🖨️ Raporu Yazdır</button></section>`;
}
function pageHtml('''
page,count=pattern.subn(replacement,page,count=1)
if count!=1: raise SystemExit(f'group/list renderer replacement count={count}')
old_opts="logoGoster:true,baslikGoster:false,tarihGoster:true,compact:true"
new_opts="logoGoster:false,baslikGoster:false,tarihGoster:false,compact:true"
if page.count(old_opts)!=1: raise SystemExit(f'report options count={page.count(old_opts)}')
page=page.replace(old_opts,new_opts,1)
page_path.write_text(page,encoding='utf-8')

css_path=Path('css/design-system.css')
css=css_path.read_text(encoding='utf-8')
old_saved=re.compile(r"\.ka-meeting-list\{gap:10px\}.*?\.ka-meeting-delete\{color:var\(--ka-danger\)!important\}",re.S)
new_saved='''.ka-meeting-list{gap:10px}.ka-meeting-list-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}.ka-meeting-list-head>div{min-width:0}.ka-meeting-list-count{flex:0 0 auto}.ka-meeting-item{overflow:hidden;border-color:color-mix(in srgb,var(--ka-primary) 16%,var(--ka-border));box-shadow:var(--ka-shadow-sm)}.ka-meeting-item .ka-card__body.ka-meeting-saved-card{display:block;padding:0}.ka-meeting-saved-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:15px 16px;border-bottom:1px solid var(--ka-border);background:linear-gradient(135deg,color-mix(in srgb,var(--ka-primary-soft) 72%,var(--ka-card-bg)),var(--ka-card-bg))}.ka-meeting-saved-title{display:flex;align-items:center;gap:10px;min-width:0}.ka-meeting-saved-title>div{min-width:0}.ka-meeting-saved-title strong{display:block;min-width:0;font-size:15.5px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ka-meeting-saved-title small{display:block;margin-top:3px;color:var(--ka-text-muted);font-size:10.5px;font-weight:700}.ka-meeting-saved-range{justify-self:end;max-width:100%;padding:6px 9px;border:1px solid var(--ka-border);border-radius:999px;background:var(--ka-card-bg);color:var(--ka-text-muted);font-size:10.5px;font-weight:800;white-space:nowrap;font-variant-numeric:tabular-nums}.ka-meeting-session-list{display:grid}.ka-meeting-session{display:grid;grid-template-columns:32px minmax(0,1fr);gap:10px;align-items:start;padding:11px 16px;border-bottom:1px solid color-mix(in srgb,var(--ka-border) 82%,transparent)}.ka-meeting-session:last-child{border-bottom:0}.ka-meeting-session__no{width:30px;height:30px;display:grid;place-items:center;border-radius:10px;background:var(--ka-primary-soft);color:var(--ka-primary);font-size:10.5px;font-weight:900}.ka-meeting-session__main{min-width:0}.ka-meeting-session__main>strong{display:block;color:var(--ka-text);font-size:13.5px;line-height:1.3;font-weight:800;overflow-wrap:anywhere}.ka-meeting-session__meta{display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin-top:6px}.ka-meeting-session__meta span,.ka-meeting-session__meta time{display:inline-flex;align-items:center;min-height:24px;padding:3px 7px;border-radius:8px;background:var(--ka-muted-bg);color:var(--ka-text-muted);font-size:9.5px;font-weight:750;line-height:1.15;font-style:normal}.ka-meeting-session__meta .is-classes{background:var(--ka-primary-soft);color:var(--ka-primary)}.ka-meeting-item__actions{display:flex;justify-content:flex-end;gap:7px;padding:11px 16px;border-top:1px solid var(--ka-border);background:color-mix(in srgb,var(--ka-muted-bg) 48%,var(--ka-card-bg))}.ka-meeting-item__actions .ka-btn{min-width:96px}.ka-meeting-delete{color:var(--ka-danger)!important}'''
css,count=old_saved.subn(new_saved,css,count=1)
if count!=1: raise SystemExit(f'saved meeting css replacement count={count}')
old_mobile='.ka-meeting-item .ka-card__body{padding:13px}.ka-meeting-item__top{display:grid;gap:7px}.ka-meeting-item__date{font-size:12px}.ka-meeting-item__actions .ka-btn{min-height:34px}'
if old_mobile not in css: raise SystemExit('legacy mobile saved meeting css not found')
css=css.replace(old_mobile,'',1)
old_report='.ka-meeting-report__table th,.ka-meeting-report__table td{vertical-align:middle}'
new_report='.ka-meeting-report__table th,.ka-meeting-report__table td{text-align:center!important;vertical-align:middle!important}'
if css.count(old_report)!=1: raise SystemExit(f'report alignment rule count={css.count(old_report)}')
css=css.replace(old_report,new_report,1)
marker='/* DASHBOARD LIVE BELL — MOBILE TIMELINE V2 */'
responsive='''/* TOPLANTI ÇİZELGESİ — KAYDEDİLEN TOPLANTILAR MOBİL */
@media(max-width:720px){.ka-meeting-list-head{align-items:flex-start}.ka-meeting-list-head>div{min-width:0}.ka-meeting-list-count{font-size:9.5px}.ka-meeting-saved-head{grid-template-columns:1fr;gap:8px;padding:13px}.ka-meeting-saved-title{align-items:flex-start}.ka-meeting-saved-title strong{font-size:14.5px;white-space:normal;overflow:visible}.ka-meeting-saved-range{justify-self:start;font-size:9.5px}.ka-meeting-session{grid-template-columns:29px minmax(0,1fr);gap:8px;padding:10px 13px}.ka-meeting-session__no{width:27px;height:27px;border-radius:9px;font-size:9.5px}.ka-meeting-session__main>strong{font-size:12.5px}.ka-meeting-session__meta{gap:4px;margin-top:5px}.ka-meeting-session__meta span,.ka-meeting-session__meta time{min-height:22px;padding:3px 6px;font-size:8.8px}.ka-meeting-item__actions{display:grid;grid-template-columns:1fr 1fr;padding:10px 13px}.ka-meeting-item__actions .ka-btn{width:100%;min-width:0;min-height:38px}}
@media(max-width:390px){.ka-meeting-list-head{display:grid;gap:7px}.ka-meeting-list-count{justify-self:start}.ka-meeting-saved-head{padding:11px}.ka-meeting-session{padding-inline:11px}.ka-meeting-session__meta span,.ka-meeting-session__meta time{font-size:8.4px}.ka-meeting-item__actions{padding-inline:11px}}

'''
if marker not in css: raise SystemExit('dashboard bell marker missing')
if 'KAYDEDİLEN TOPLANTILAR MOBİL' not in css: css=css.replace(marker,responsive+marker,1)
css_path.write_text(css,encoding='utf-8')

test_path=Path('tests/meeting-schedule-v1-smoke.test.js')
test=test_path.read_text(encoding='utf-8')
anchor="assert(page.includes('function groupedRecords()')&&page.includes('data-meeting-edit-group')&&page.includes('data-meeting-delete-group'),'Kaydedilen satırlar ortak başlık altında grup olarak yönetilebilmeli.');"
added="assert(page.includes('ka-meeting-saved-card')&&page.includes('ka-meeting-session-list')&&page.includes('ka-meeting-session__meta')&&!page.includes('const chips=group.list.slice(0,5)'),'Kaydedilen toplantılar tekrar eden ders rozetleri yerine mobil uyumlu kompakt oturum listesi kullanmalı.');\nassert(page.includes('logoGoster:false,baslikGoster:false,tarihGoster:false'),'Toplantı raporu üstteki logolu marka başlığını üretmemeli.');"
if anchor not in test: raise SystemExit('meeting test group anchor missing')
if 'ka-meeting-saved-card' not in test: test=test.replace(anchor,anchor+'\n'+added,1)
css_anchor="assert(design.includes('.ka-meeting-report-button{position:static'),'Rapor düğmesi mobil alt navigasyonun üzerine sticky olarak binmemeli.');"
css_added="assert(design.includes('.ka-meeting-report__table th,.ka-meeting-report__table td{text-align:center!important;vertical-align:middle!important}'),'Toplantı raporundaki tüm sütun başlıkları ve veriler ortalanmalı.');\nassert(design.includes('.ka-meeting-saved-head{')&&design.includes('.ka-meeting-session{display:grid;grid-template-columns:32px minmax(0,1fr)'),'Kaydedilen toplantı kartı merkezi design-system içinde kompakt oturum düzeni kullanmalı.');"
if css_anchor not in test: raise SystemExit('meeting test report anchor missing')
if 'tüm sütun başlıkları ve veriler ortalanmalı' not in test: test=test.replace(css_anchor,css_anchor+'\n'+css_added,1)
test_path.write_text(test,encoding='utf-8')

index_path=Path('index.html')
index=index_path.read_text(encoding='utf-8')
if 'css/design-system.css?v=861' not in index: raise SystemExit('index css v861 not found')
index=index.replace('css/design-system.css?v=861','css/design-system.css?v=862',1)
index_path.write_text(index,encoding='utf-8')

sw_path=Path('service-worker.js')
sw=sw_path.read_text(encoding='utf-8')
if "const CACHE_ADI='oy-cache-v861'" not in sw: raise SystemExit('service worker v861 not found')
sw=sw.replace("const CACHE_ADI='oy-cache-v861'","const CACHE_ADI='oy-cache-v862'",1)
if './css/design-system.css?v=861' not in sw: raise SystemExit('service worker css v861 precache not found')
sw=sw.replace('./css/design-system.css?v=861','./css/design-system.css?v=862',1)
sw_path.write_text(sw,encoding='utf-8')

trial_path=Path('tests/trial-counter-scroll-stability.test.js')
trial=trial_path.read_text(encoding='utf-8')
if "css/design-system.css?v=861')&&index.includes('js/app-loader.js?v=859" not in trial: raise SystemExit('trial css v861 contract missing')
trial=trial.replace("css/design-system.css?v=861')&&index.includes('js/app-loader.js?v=859","css/design-system.css?v=862')&&index.includes('js/app-loader.js?v=859",1)
if "const CACHE_ADI='oy-cache-v861'" not in trial: raise SystemExit('trial cache v861 contract missing')
trial=trial.replace("const CACHE_ADI='oy-cache-v861'","const CACHE_ADI='oy-cache-v862'",1)
trial_path.write_text(trial,encoding='utf-8')
