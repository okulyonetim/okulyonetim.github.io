from pathlib import Path


def replace_line(text, prefix, new_line):
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if line.startswith(prefix):
            lines[i] = new_line
            return '\n'.join(lines) + ('\n' if text.endswith('\n') else '')
    raise SystemExit(f'line missing: {prefix}')

p = Path('js/modules/dashboard.js')
s = p.read_text()

s = replace_line(
    s,
    'function teacherUpcomingRows()',
    "function teacherUpcomingRows(){return collectReminders(30).filter(x=>x.kaynak!=='sinav').slice(0,8)}"
)

s = replace_line(
    s,
    'function lessonsSection()',
    "function lessonsSection(){const teacherMode=!isAdmin(),tid=teacherId(),mine=teacherMode&&!!tid,all=teacherMode&&!tid?[]:todayLessons({mine}),live=window.SchoolLiveStatus?.status?.();let list=all,title=teacherMode?'Ders Programım':'Şu Anki Dersler';if(isAdmin()){const period=live?.mode==='lesson'?live.period:live?.nextPeriod;if(period)list=all.filter(x=>Number(x.saat??x.dersSaati)===Number(period));else if(['after','weekend'].includes(live?.mode))list=[];title=live?.mode==='lesson'?'Şu Anki Dersler':live?.nextPeriod?`Sonraki Dersler · ${live.nextPeriod}. Ders`:'Şu Anki Dersler'}const rows=list.length?`<div class=\"ka-home-lessons ${teacherMode?'ka-home-lessons--teacher':''}\">${list.slice(0,10).map(x=>{const period=Number(x.saat??x.dersSaati),now=teacherMode&&live?.mode==='lesson'&&Number(live.period)===period,next=teacherMode&&!now&&Number(live?.nextPeriod)===period;return`<article ${mine?`data-dash-lesson-plan data-lesson=\"${esc(lessonLabel(x))}\" data-class=\"${esc(classLabel(x))}\"`:`data-dash-route=\"academic\"`}><span>${esc(String(x.saat??x.dersSaati??'•'))}</span><div><strong>${esc(lessonLabel(x))}</strong><small>${esc(classLabel(x))}${mine?' · Haftalık kazanımlar':` · ${esc(teacherLabel(x))}`}</small></div>${now?'<em class=\"ka-home-lesson-state active\">Şimdi</em>':next?'<em class=\"ka-home-lesson-state\">Sıradaki</em>':''}</article>`}).join('')}</div>${teacherMode?'<button class=\"ka-home-link ka-home-link--footer\" type=\"button\" data-dash-route=\"academic\" data-dash-page=\"schedule\" data-dash-title=\"Ders Programı\"><span>Haftalık programı aç</span><b>›</b></button>':''}`:empty(isAdmin()?'Bu ders saati için program kaydı yok.':tid?'Bugün için ders programı kaydı yok.':'Profilinize bağlı öğretmen kaydı bulunamadı.');return section(title,'📚','lessons',rows)}"
)

s = replace_line(
    s,
    'function examsSection()',
    "function examsSection(){const teacherMode=!isAdmin(),tid=teacherId();if(teacherMode&&!tid)return'';const list=upcoming(arr('sinavlar'),'tarih',30).filter(x=>!teacherMode||x.ogretmenId===tid).slice(0,6);if(!list.length)return'';const body=list.map(x=>{const d=dayDiff(x.tarih),status=d===0?'Bugün':d===1?'Yarın':`${d} gün`;return`<button class=\"ka-home-row ka-home-exam-row\" type=\"button\" data-dash-route=\"academic\" data-dash-page=\"written\" data-dash-title=\"Yazılı Sınavlar\"><span class=\"ka-home-datebox\"><b>${esc(String(new Date(x.tarih+'T00:00:00').getDate()))}</b><small>${esc(new Date(x.tarih+'T00:00:00').toLocaleDateString('tr-TR',{month:'short'}))}</small></span><div class=\"ka-grow\"><strong>${esc(x.ders||x.ad||x.sinavAdi||'Sınav')}</strong><small>${esc(x.siniflar||x.sinif||x.sinifAdi||'')}${x.saat?` · ${esc(x.saat)}`:''}</small></div><span class=\"ka-badge ${d<=1?'ka-badge--warning':''}\">${esc(status)}</span></button>`}).join('');return section(teacherMode?'Yaklaşan Yazılı Sınavlar':'Yaklaşan Sınavlar','📝','exams',`${body}${teacherMode?'<button class=\"ka-home-link ka-home-link--footer\" type=\"button\" data-dash-route=\"academic\" data-dash-page=\"written\" data-dash-title=\"Yazılı Sınavlar\"><span>Tüm yazılıları aç</span><b>›</b></button>':''}`)}"
)

s = replace_line(
    s,
    'function teacherShell()',
    "function teacherShell(){return`${cardVisible('welcome')?hero():''}${statsSection()}${announcementSection()}${pollSection()}${trialCounterSection()}${newsSection()}${dutySection()}${quickSection()}${notesSection()}${calendarSection()}${socialSection()}${allTodayDutySection()}${weekDutySection()}${upcomingSection()}${examsSection()}${lessonsSection()}`}"
)

p.write_text(s)

p = Path('css/design-system.css')
s = p.read_text()
marker = '/* ===== TEACHER WORKFLOW DASHBOARD ===== */'
if marker not in s:
    s += r'''

/* ===== TEACHER WORKFLOW DASHBOARD ===== */
.ka-home-lessons--teacher{grid-template-columns:1fr;gap:8px}.ka-home-lessons--teacher article{grid-template-columns:36px minmax(0,1fr) auto;min-height:70px;border:1px solid var(--ka-border);background:var(--ka-card-bg);cursor:pointer}.ka-home-lessons--teacher article>span{width:36px;height:36px;border-radius:11px;background:var(--ka-primary-soft)}.ka-home-lesson-state{font-style:normal;font-size:9px;font-weight:850;color:var(--ka-text-muted);background:var(--ka-muted-bg);border-radius:999px;padding:5px 8px;white-space:nowrap}.ka-home-lesson-state.active{color:var(--ka-success);background:color-mix(in srgb,var(--ka-success) 13%,transparent)}
.ka-home-link--footer{width:100%;margin-top:8px;padding:8px 2px;border-top:1px solid var(--ka-border)}.ka-home-exam-row{appearance:none;width:100%;border-left:0;border-right:0;border-top:0;background:transparent;color:var(--ka-text);text-align:left;cursor:pointer}.ka-home-exam-row:active{background:var(--ka-primary-soft)}.ka-home-exam-row .ka-badge{flex:0 0 auto}
.ka-home-reminder-row{width:100%;color:var(--ka-text);text-align:left}.ka-home-section[data-home-section="upcoming"] .ka-home-rowicon{background:color-mix(in srgb,var(--ka-warning) 10%,var(--ka-card-bg));color:var(--ka-warning)}
@media(max-width:430px){.ka-home-lessons--teacher article{min-height:76px;padding:11px 10px}.ka-home-lessons--teacher strong{font-size:13px}.ka-home-lessons--teacher small{font-size:10px}.ka-home-exam-row{min-height:70px}.ka-home-exam-row .ka-badge{font-size:9px}}
'''
    p.write_text(s)

p = Path('tests/dashboard-card-routes-smoke.test.js')
s = p.read_text()
anchor = "assert(css.includes('TEACHER DASHBOARD REFINEMENT')&&css.includes('.ka-home-duty-focus'),'Öğretmen dashboard görsel sözleşmesi merkezi design-system içinde olmalı.');"
extra = """
assert(dash.includes("collectReminders(30).filter(x=>x.kaynak!=='sinav')"),'Yazılılar öğretmen görev/takvim kartında ikinci kez gösterilmemeli.');
assert(dash.includes("title=teacherMode?'Ders Programım':'Şu Anki Dersler'")&&dash.includes('data-dash-page=\\\"schedule\\\"'),'Öğretmenin günlük ders kartı Ders Programım başlığıyla haftalık programa bağlanmalı.');
assert(dash.includes("teacherMode?'Yaklaşan Yazılı Sınavlar':'Yaklaşan Sınavlar'")&&dash.includes('ka-home-exam-row'),'Öğretmenin yaklaşan yazılıları ayrı ve doğrudan yazılı sayfasına bağlı olmalı.');
assert(!dash.includes("${lessonsSection()}${personalScheduleSection()}"),'Öğretmen ana sayfasında ikinci Ders Programım kartı üretilmemeli.');
assert(css.includes('TEACHER WORKFLOW DASHBOARD')&&css.includes('.ka-home-lessons--teacher'),'Öğretmen iş akışı görsel düzeni merkezi design-system içinde kalmalı.');"""
if extra.strip() not in s:
    if anchor not in s:
        raise SystemExit('dashboard regression anchor missing')
    p.write_text(s.replace(anchor, anchor + extra, 1))

p = Path('tests/dashboard-reminders-smoke.test.js')
s = p.read_text()
old = "assert(src.includes(\"function teacherUpcomingRows(){return collectReminders(30).slice(0,8)}\"),'Öğretmen Teslim & Görev Takvimi merkezi hatırlatma motorunun 30 günlük görünümünü kullanmalı.');"
new = "assert(src.includes(\"function teacherUpcomingRows(){return collectReminders(30).filter(x=>x.kaynak!=='sinav').slice(0,8)}\"),'Öğretmen Teslim & Görev Takvimi merkezi 30 günlük motoru kullanmalı ve ayrı yazılı kartındaki sınavları tekrar etmemeli.');"
if old in s:
    p.write_text(s.replace(old, new, 1))
elif new not in s:
    raise SystemExit('reminder regression contract missing')
