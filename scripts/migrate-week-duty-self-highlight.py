from pathlib import Path

DASH = Path('js/modules/dashboard.js')
CSS = Path('css/design-system.css')
TEST = Path('tests/dashboard-card-routes-smoke.test.js')

dash = DASH.read_text(encoding='utf-8')
css = CSS.read_text(encoding='utf-8')
test = TEST.read_text(encoding='utf-8')

old_head = "const dates=weekDatesLegacy(),all=arr('nobetAtamalari'),today=isoToday(),calendarIcon="
new_head = "const dates=weekDatesLegacy(),all=arr('nobetAtamalari'),today=isoToday(),tid=teacherId(),teacherMode=!isAdmin()&&!!tid,calendarIcon="
if old_head not in dash:
    raise SystemExit('weekDutySection header guard failed')
dash = dash.replace(old_head, new_head, 1)

old_rows = "entries.map(x=>`<div class=\"kh-mini\"><span>${esc(teacherLabel(x))}</span>${dutyPlaceHtml(dutyPlace(x)||'—')}</div>`).join('')"
new_rows = "entries.map(x=>{const mine=teacherMode&&x.ogretmenId===tid;return`<div class=\"kh-mini${mine?' is-me':''}\"><span>${esc(teacherLabel(x))}</span>${dutyPlaceHtml(dutyPlace(x)||'—')}</div>`}).join('')"
if old_rows not in dash:
    raise SystemExit('weekDutySection rows guard failed')
dash = dash.replace(old_rows, new_rows, 1)

marker = '/* ===== TEACHER WEEKLY DUTY SELF HIGHLIGHT ===== */'
if marker not in css:
    css += "\n\n" + marker + "\n.ka-home .kh-mini.is-me{background:var(--ka-primary-soft);box-shadow:inset 3px 0 0 var(--ka-primary);}\n.ka-home .kh-mini.is-me>span:first-child{color:var(--ka-primary);font-weight:800;}\n[data-theme=\"dark\"] .ka-home .kh-mini.is-me{background:color-mix(in srgb,var(--ka-primary) 14%,var(--ka-card-bg));}\n"

checkpoint = "assert(dash.includes(\"teacherMode=!isAdmin()&&!!tid\")&&dash.includes(\"kh-mini${mine?' is-me':''}\")&&dash.includes(\"x.ogretmenId===tid\"),'Haftalık nöbet programı öğretmenin kendi satırını mevcut öğretmen bağlantısından vurgulamalı.');\nassert(css.includes('TEACHER WEEKLY DUTY SELF HIGHLIGHT')&&css.includes('.ka-home .kh-mini.is-me'),'Öğretmenin haftalık nöbet vurgusu merkezi design-system içinde kalmalı.');\n// Checkpoint: weekly duty keeps the legacy layout while highlighting the signed-in teacher.\n"
if 'Checkpoint: weekly duty keeps the legacy layout while highlighting the signed-in teacher.' not in test:
    test += "\n" + checkpoint

DASH.write_text(dash, encoding='utf-8')
CSS.write_text(css, encoding='utf-8')
TEST.write_text(test, encoding='utf-8')
