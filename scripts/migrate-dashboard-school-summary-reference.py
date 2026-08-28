from pathlib import Path

p=Path('js/modules/dashboard.js')
s=p.read_text(encoding='utf-8')
start=s.index("function statCard(")
end=s.index("\nfunction dutyRows(", start)
new=r'''function schoolClassLevel(row){const raw=String(row?.seviye||row?.ad||'').match(/\d+/)?.[0]||'';return Number(raw)||0}
function schoolStageForStudent(student,classMap){const cls=classMap.get(student?.sinifId),level=schoolClassLevel(cls);return level>=1&&level<=4?'primary':level>=5&&level<=8?'secondary':'other'}
function summaryMetric(icon,label,value,meta='',cls=''){return `<article class="ka-school-summary-card ${cls}"><span class="ka-school-summary-icon">${icon}</span><small>${esc(label)}</small><b>${esc(String(value))}</b>${meta?`<div class="ka-school-summary-meta">${meta}</div>`:''}</article>`}
function statsSection(){
  if(!cardVisible('stats'))return'';
  const teachers=arr('ogretmenler'),students=arr('veliler'),classes=arr('siniflar'),services=arr('servisler'),classMap=new Map(classes.map(x=>[x.id,x]));
  const femaleTeachers=teachers.filter(x=>x.cinsiyet==='Kadın').length,maleTeachers=teachers.filter(x=>x.cinsiyet==='Erkek').length,unknownTeachers=Math.max(0,teachers.length-femaleTeachers-maleTeachers);
  const primary=students.filter(x=>schoolStageForStudent(x,classMap)==='primary'),secondary=students.filter(x=>schoolStageForStudent(x,classMap)==='secondary'),otherStudents=students.filter(x=>schoolStageForStudent(x,classMap)==='other').length;
  const genderLine=(list)=>{const girls=list.filter(x=>x.cinsiyet==='Kız').length,boys=list.filter(x=>x.cinsiyet==='Erkek').length,unknown=Math.max(0,list.length-girls-boys);return `<span class="is-girl">♀ ${girls}</span><span class="is-boy">♂ ${boys}</span>${unknown?`<span>• ${unknown}</span>`:''}`};
  const teacherMeta=`<span class="is-girl">♀ ${femaleTeachers} Kadın</span><span class="is-boy">♂ ${maleTeachers} Erkek</span>${unknownTeachers?`<span>• ${unknownTeachers}</span>`:''}`;
  const studentMeta=`<div class="ka-school-stage"><span class="ka-school-stage-icon">🏫</span><small>İLKOKUL</small><strong>${primary.length}</strong><div>${genderLine(primary)}</div></div><div class="ka-school-stage"><span class="ka-school-stage-icon">▣</span><small>ORTAOKUL</small><strong>${secondary.length}</strong><div>${genderLine(secondary)}</div></div>${otherStudents?`<small class="ka-school-unassigned">Sınıf seviyesi belirlenmeyen: ${otherStudents}</small>`:''}`;
  const body=`<div class="ka-school-summary-grid">${summaryMetric('👥','ÖĞRETMEN',teachers.length,teacherMeta,'is-teacher')}${summaryMetric('🎓','ÖĞRENCİ',students.length,studentMeta,'is-student')}${summaryMetric('🏫','SINIF',classes.length,'<span>Aktif sınıf / şube</span>','is-class')}${summaryMetric('🚌','SERVİS',services.length,'<span>Aktif servis</span>','is-service')}</div>`;
  return section('Okul Özeti','▥','stats',body,'ka-school-summary-section')
}'''
s=s[:start]+new+s[end:]
p.write_text(s,encoding='utf-8')

css=Path('css/design-system.css')
c=css.read_text(encoding='utf-8')
marker='/* ===== DASHBOARD SCHOOL SUMMARY REFERENCE ===== */'
if marker not in c:
    c += r'''

/* ===== DASHBOARD SCHOOL SUMMARY REFERENCE ===== */
.ka-school-summary-section{background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important}
.ka-school-summary-section>.ka-home-section__head{padding:2px 4px 12px}
.ka-school-summary-section>.ka-home-section__body{padding:0}
.ka-school-summary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.ka-school-summary-card{position:relative;min-width:0;min-height:226px;padding:26px 16px 18px;border:1px solid var(--ka-border);border-radius:30px;background:var(--ka-card-bg);box-shadow:var(--ka-shadow-sm);display:flex;flex-direction:column;align-items:center;text-align:center;overflow:hidden}
.ka-school-summary-card::after{content:"";position:absolute;right:-24px;top:-24px;width:100px;height:100px;border-radius:50%;background:color-mix(in srgb,var(--ka-primary) 10%,transparent);pointer-events:none}
.ka-school-summary-icon{position:relative;z-index:1;width:66px;height:66px;border-radius:22px;display:grid;place-items:center;background:var(--ka-primary-soft);font-size:31px;margin-bottom:14px;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ka-primary) 8%,transparent)}
.ka-school-summary-card>small{font-size:13px;letter-spacing:.07em;color:var(--ka-text-muted);font-weight:850}
.ka-school-summary-card>b{font-size:44px;line-height:1.05;margin:8px 0 10px;color:var(--ka-text);font-weight:900}
.ka-school-summary-meta{width:100%;min-height:30px;color:var(--ka-text-muted);font-size:12px;display:flex;justify-content:center;align-items:center;gap:7px;flex-wrap:wrap}
.ka-school-summary-meta .is-girl{color:#c15b84}.ka-school-summary-meta .is-boy{color:#4580b7}
.ka-school-summary-card.is-student{padding-inline:12px}
.ka-school-summary-card.is-student .ka-school-summary-meta{display:grid;grid-template-columns:1fr 1fr;gap:0;align-items:stretch;border-top:1px solid var(--ka-border);margin-top:2px;padding-top:12px}
.ka-school-stage{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0;padding:0 5px}
.ka-school-stage+.ka-school-stage{border-left:1px solid var(--ka-border)}
.ka-school-stage-icon{width:30px;height:30px;border-radius:10px;background:var(--ka-muted-bg);display:grid;place-items:center;font-size:15px}
.ka-school-stage>small{font-size:10px;font-weight:850;color:var(--ka-text-muted);letter-spacing:.02em}
.ka-school-stage>strong{font-size:24px;line-height:1;color:var(--ka-text)}
.ka-school-stage>div{display:flex;justify-content:center;gap:6px;font-size:10px;font-weight:800;white-space:nowrap}
.ka-school-unassigned{grid-column:1/-1;margin-top:6px;color:var(--ka-text-muted);font-size:10px}
.ka-school-summary-card.is-class .ka-school-summary-icon{background:color-mix(in srgb,var(--ka-info) 12%,var(--ka-card-bg))}
.ka-school-summary-card.is-service .ka-school-summary-icon{background:color-mix(in srgb,var(--ka-success) 12%,var(--ka-card-bg))}
@media(max-width:390px){.ka-school-summary-grid{gap:10px}.ka-school-summary-card{min-height:210px;padding:22px 10px 16px;border-radius:25px}.ka-school-summary-icon{width:58px;height:58px;border-radius:19px;font-size:27px}.ka-school-summary-card>b{font-size:39px}.ka-school-summary-meta{font-size:10px}.ka-school-stage>strong{font-size:21px}}
'''
css.write_text(c,encoding='utf-8')

t=Path('tests/dashboard-card-routes-smoke.test.js')
tx=t.read_text(encoding='utf-8')
legacy="assert(dash.includes('ka-home-summary-intro')&&dash.includes(\"school.okulAdi\"),'Okul özeti mevcut okulBilgileri verisini kullanmalı.');"
tx=tx.replace(legacy,"assert(dash.includes(\"section('Okul Özeti'\")&&dash.includes('ka-school-summary-section'),'Okul Özeti referans kart grubu olarak üretilmeli.');")
old="assert(dash.includes(\"x.cinsiyet==='Kadın'\")&&dash.includes(\"x.cinsiyet==='Erkek'\")&&dash.includes(\"x.cinsiyet==='Kız'\"),'Okul Özeti gerçek öğretmen/öğrenci cinsiyet dağılımını mevcut veri modelinden üretmeli.');\nassert(dash.includes(\"unknownTeachers\")&&dash.includes(\"unknownStudents\")&&dash.includes(\"Belirtilmedi\"),'Eksik cinsiyet verileri toplamdan kaybolmamalı.');\nassert(css.includes('DASHBOARD SCHOOL SUMMARY DEMOGRAPHICS')&&css.includes('.ka-home-demographics'),'Okul Özeti demografi görünümü merkezi design-system içinde kalmalı.');\nassert(dash.includes(\"teachers=arr('ogretmenler'),students=arr('veliler'),classes=arr('siniflar'),services=arr('servisler')\"),'Okul Özeti toplam ve dağılım değerlerini aynı local-first snapshot üzerinden üretmeli.');"
newt="assert(dash.includes(\"x.cinsiyet==='Kadın'\")&&dash.includes(\"x.cinsiyet==='Erkek'\")&&dash.includes(\"x.cinsiyet==='Kız'\"),'Okul Özeti gerçek öğretmen/öğrenci cinsiyet dağılımını mevcut veri modelinden üretmeli.');\nassert(dash.includes(\"function schoolClassLevel\")&&dash.includes(\"level>=1&&level<=4?'primary':level>=5&&level<=8?'secondary'\"),'Okul Özeti İlkokul/Ortaokul ayrımını gerçek sınıf seviyesinden üretmeli.');\nassert(dash.includes(\"teachers=arr('ogretmenler'),students=arr('veliler'),classes=arr('siniflar'),services=arr('servisler')\"),'Okul Özeti toplam ve dağılım değerlerini aynı local-first snapshot üzerinden üretmeli.');\nassert(css.includes('DASHBOARD SCHOOL SUMMARY REFERENCE')&&css.includes('.ka-school-summary-grid')&&css.includes('.ka-school-stage'),'Okul Özeti referans 2x2 kart görünümü merkezi design-system içinde kalmalı.');"
if old not in tx: raise SystemExit('old summary test contract not found')
t.write_text(tx.replace(old,newt),encoding='utf-8')
print('school summary reference migration applied')
