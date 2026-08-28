from pathlib import Path
import re

DASH=Path('js/modules/dashboard.js')
CSS=Path('css/design-system.css')
TEST=Path('tests/dashboard-card-routes-smoke.test.js')
SW=Path('service-worker.js')

dash=DASH.read_text(encoding='utf-8')
anchor='function lessonsSection(){'
if anchor not in dash: raise SystemExit('lessonsSection anchor missing')
helper=r'''function planClassLevel(v){const m=String(v||'').match(/\d+/);return m?Number(m[0]):null}
function planLessonKey(v){return normalizeDay(v).replace(/\s+dersi$/,'').trim()}
function teacherPlanForLesson(lesson){const level=planClassLevel(classLabel(lesson)),name=planLessonKey(lessonLabel(lesson));if(!level||!name)return null;const tid=teacherId(),selected=arr('ogretmenYillikPlanSecimleri').find(x=>x.id===tid||x.ogretmenId===tid),tracked=new Set(selected?.planIdler||[]);return arr('yillikPlanTanimlari').filter(p=>planClassLevel(p.seviye)===level&&planLessonKey(p.dersAdi)===name).sort((a,b)=>Number(tracked.has(b.id))-Number(tracked.has(a.id)))[0]||null}
const PLAN_MONTHS={OCAK:1,ŞUBAT:2,MART:3,NİSAN:4,MAYIS:5,HAZİRAN:6,TEMMUZ:7,AĞUSTOS:8,EYLÜL:9,EKİM:10,KASIM:11,ARALIK:12};
function planWeekDays(v){const m=/\((\d{1,2})-(\d{1,2})\)/.exec(v||'');return m?{start:Number(m[1]),end:Number(m[2])}:null}
function planDateRange(row,schoolYear){const month=PLAN_MONTHS[String(row?.ay||'').toLocaleUpperCase('tr')],days=planWeekDays(row?.hafta),years=String(schoolYear||'').split('-').map(Number);if(!month||!days||years.length!==2||!years[0])return null;const startYear=month>=9?years[0]:years[1];let endMonth=month,endYear=startYear;if(days.end<days.start){endMonth=month===12?1:month+1;endYear=endMonth===1&&month===12?startYear+1:startYear}return{start:new Date(startYear,month-1,days.start),end:new Date(endYear,endMonth-1,days.end)}}
function planCurrentWeekIndex(p){const rows=p?.satirlar||[];if(!rows.length)return 0;const now=new Date();now.setHours(0,0,0,0);for(let i=0;i<rows.length;i++){const r=planDateRange(rows[i],p.egitimOgretimYili);if(r&&now>=r.start&&now<=r.end)return i}for(let i=0;i<rows.length;i++){const r=planDateRange(rows[i],p.egitimOgretimYili);if(r&&r.start>=now)return i}return 0}
function teacherLessonOutcomes(lesson){const p=teacherPlanForLesson(lesson);if(!p)return{items:[],all:[]};const row=(p.satirlar||[])[planCurrentWeekIndex(p)]||{},vals=row.degerler&&typeof row.degerler==='object'?row.degerler:row,skip=new Set(['ay','hafta','saat','degerler']),all=[];Object.entries(vals||{}).forEach(([k,v])=>{if(skip.has(k)||k.startsWith('_')||v==null)return;const text=Array.isArray(v)?v.join(' · '):String(v);if(text.trim())all.push(text.trim())});return{items:all.slice(0,3),all}}
function teacherFocusSection(){if(isAdmin())return'';const tid=teacherId(),today=tid?todayLessons({mine:true}):[],live=window.SchoolLiveStatus?.status?.();if(!tid||!today.length||['after','weekend'].includes(live?.mode))return'';let lesson=null,mode='';if(live?.mode==='lesson'){lesson=today.find(x=>Number(x.saat??x.dersSaati)===Number(live.period));if(lesson)mode='now'}if(!lesson&&live?.nextPeriod){lesson=today.find(x=>Number(x.saat??x.dersSaati)===Number(live.nextPeriod));if(lesson)mode='next'}if(!lesson)return'';const out=teacherLessonOutcomes(lesson),period=Number(lesson.saat??lesson.dersSaati)||'',label=mode==='now'?'● CANLI':'HAZIRLIK',book='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V5H6.5A2.5 2.5 0 0 0 4 7.5v12Z"/><path d="M8 9h8M8 13h6"/></svg>';return `<section class="kh-section" data-home-section="lesson-focus"><div class="kh-section-head"><div class="kh-section-title">${book}<span>${mode==='now'?'Şu Anki Dersim':'Sonraki Dersim'}</span></div></div><div class="kh-card"><div class="kh-focus"><div class="kh-focus-top"><span class="kh-focus-label">${label}</span><span class="kh-chip">${esc(String(period))}. Ders</span></div><h3>${esc(classLabel(lesson))} · ${esc(lessonLabel(lesson))}</h3><div class="kh-outcomes"><div class="kh-outcomes-title">BU HAFTANIN ÖĞRENME ÇIKTILARI / KAZANIMLARI</div>${out.items.length?`<ul>${out.items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${out.all.length>3?`<div class="kh-side kh-outcomes-more">+${out.all.length-3} kazanım daha</div>`:''}`:'<div class="kh-empty kh-outcomes-empty">Bu ders için güncel hafta kazanımı bulunamadı.</div>'}</div></div><button type="button" class="kh-plan-button" data-dash-lesson-plan data-lesson="${esc(lessonLabel(lesson))}" data-class="${esc(classLabel(lesson))}">Yıllık Planı Aç ›</button></div></section>`}
'''
dash=dash.replace(anchor,helper+anchor,1)
old="function teacherShell(){return`${cardVisible('welcome')?hero():''}${statsSection()}${announcementSection()}${pollSection()}${trialCounterSection()}${newsSection()}${lessonsSection()}"
new="function teacherShell(){return`${cardVisible('welcome')?hero():''}${statsSection()}${announcementSection()}${pollSection()}${trialCounterSection()}${newsSection()}${teacherFocusSection()}${lessonsSection()}"
if old not in dash: raise SystemExit('teacherShell sequence missing')
dash=dash.replace(old,new,1)
oldbase="const base=['data.ogretmenler','data.dersProgrami','data.siniflar','data.veliler','data.servisler','data.hatirlaticilar','data.gorevler','data.sinavlar','data.denemeSinavlari','data.duyurular','data.haberler','data.anketler','data.nobetAtamalari','data.nobetYerleri','data.personelIzinler','data.ogretmenIzinleri','data.notlar','data.appConfig','session.user']"
newbase="const base=['data.ogretmenler','data.dersProgrami','data.siniflar','data.veliler','data.servisler','data.hatirlaticilar','data.gorevler','data.sinavlar','data.denemeSinavlari','data.duyurular','data.haberler','data.anketler','data.nobetAtamalari','data.nobetYerleri','data.personelIzinler','data.ogretmenIzinleri','data.notlar','data.yillikPlanTanimlari','data.ogretmenYillikPlanSecimleri','data.appConfig','session.user']"
if oldbase not in dash: raise SystemExit('subscribe base missing')
dash=dash.replace(oldbase,newbase,1)
DASH.write_text(dash,encoding='utf-8')

css=CSS.read_text(encoding='utf-8')
marker='/* LEGACY TEACHER LESSON FOCUS — REFERENCE PORT */'
if marker not in css:
 css+='''\n\n/* LEGACY TEACHER LESSON FOCUS — REFERENCE PORT */\n.ka-home .kh-section[data-home-section="lesson-focus"] .kh-card{overflow:hidden}\n.ka-home .kh-focus{padding:14px}\n.ka-home .kh-focus-top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:7px}\n.ka-home .kh-focus-label{font-size:9.5px;font-weight:900;color:var(--ka-primary)}\n.ka-home .kh-focus h3{font-size:20px;margin:0;color:var(--ka-text)}\n.ka-home .kh-outcomes{margin-top:12px;padding-top:11px;border-top:1px solid var(--ka-border)}\n.ka-home .kh-outcomes-title{font-size:9.5px;font-weight:900;color:var(--ka-text-muted);margin-bottom:7px}\n.ka-home .kh-outcomes ul{margin:0;padding-left:18px;font-size:11px;line-height:1.5;color:var(--ka-text)}\n.ka-home .kh-outcomes-more{margin-top:7px;text-align:left}\n.ka-home .kh-outcomes-empty{padding:8px 0;text-align:left}\n.ka-home .kh-plan-button{width:100%;border:0;border-top:1px solid var(--ka-border);background:transparent;color:var(--ka-primary);padding:11px 12px;font-size:10.5px;font-weight:900;text-align:right;cursor:pointer}\n'''
CSS.write_text(css,encoding='utf-8')

t=TEST.read_text(encoding='utf-8')
checks='''\nassert(dash.includes('function teacherFocusSection()')&&dash.includes('data-home-section="lesson-focus"'),'Öğretmen referans Şu Anki/Sonraki Dersim odak kartını taşımalı.');\nassert(dash.includes("live=window.SchoolLiveStatus?.status?.()")&&dash.includes("mode==='now'?'Şu Anki Dersim':'Sonraki Dersim'"),'Ders odak kartı ikinci sayaç yerine canonical SchoolLiveStatus kullanmalı.');\nassert(dash.includes("arr('yillikPlanTanimlari')")&&dash.includes('function teacherLessonOutcomes'),'Ders odak kartı haftalık kazanımları gerçek yıllık plan snapshotından okumalı.');\nassert(dash.includes('data-dash-lesson-plan')&&dash.includes('Yıllık Planı Aç ›'),'Ders odak kartı mevcut Academic yıllık plan açma davranışına bağlanmalı.');\nassert(css.includes('LEGACY TEACHER LESSON FOCUS — REFERENCE PORT')&&css.includes('.ka-home .kh-focus'),'Ders odak kartı legacy geometrisini merkezi design-system içinde kullanmalı.');\n'''
if 'LEGACY TEACHER LESSON FOCUS — REFERENCE PORT' not in t:t+=checks
TEST.write_text(t,encoding='utf-8')

sw=SW.read_text(encoding='utf-8')
m=re.search(r"const CACHE_ADI='oy-cache-v(\d+)'",sw)
if not m: raise SystemExit('cache missing')
sw=sw[:m.start(1)]+str(int(m.group(1))+1)+sw[m.end(1):]
SW.write_text(sw,encoding='utf-8')
