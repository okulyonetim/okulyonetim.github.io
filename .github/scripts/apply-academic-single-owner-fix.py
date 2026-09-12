from pathlib import Path
import re


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


def regex_once(path, pattern, repl, label):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    new, count = re.subn(pattern, repl, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 regex match, found {count}')
    p.write_text(new, encoding='utf-8')


# 1) Classic parity must never render Academic summaries or exam modal chrome.
p = Path('js/modules/classic-parity.js')
text = p.read_text(encoding='utf-8')
start = text.find('function dayDiff(')
end = text.find('function teacherIdFromCard', start)
if start < 0 or end <= start:
    raise SystemExit('classic Academic parity block not found')
text = text[:start] + text[end:]
old = "function enhance(){scheduled=false;injectAcademicSummary();injectAcademicModalIntro();enhanceTeacherCards();enhanceTeacherBranchOptions();enhanceProfile()}"
if text.count(old) != 1:
    raise SystemExit(f'classic enhance Academic calls: expected 1 match, found {text.count(old)}')
text = text.replace(old, "function enhance(){scheduled=false;enhanceTeacherCards();enhanceTeacherBranchOptions();enhanceProfile()}", 1)
old_subs = "['sinavlar','denemeSinavlari','dersProgrami','dersListesi','bransListesi','sosyalKulupler','rehberlik','belirliGunler','nobetAtamalari']"
if text.count(old_subs) != 1:
    raise SystemExit(f'classic Academic subscriptions: expected 1 match, found {text.count(old_subs)}')
text = text.replace(old_subs, "['dersProgrami','dersListesi','bransListesi','sosyalKulupler','rehberlik','belirliGunler','nobetAtamalari']", 1)
p.write_text(text, encoding='utf-8')

# 2) Academic must read and render only the single host owned by v2ModuleRoot.
academic = 'js/modules/academic.js'
anchor = "const match=vals=>{const q=norm(query.trim());return!q||norm(vals.filter(Boolean).join(' ')).includes(q)};"
helper = anchor + "\nfunction ownedAcademicHost(){const root=document.getElementById('v2ModuleRoot');if(!root)return null;document.querySelectorAll('[data-academic-module]').forEach(host=>{if(!root.contains(host))host.remove()});const hosts=[...root.querySelectorAll('[data-academic-module]')];hosts.slice(1).forEach(host=>host.remove());return hosts[0]||null}"
replace_once(academic, anchor, helper, 'Academic owned host helper')
regex_once(
    academic,
    r"function applyAcademicMeta\(title=''\)\{.*?\}\nfunction canEditExams\(\)",
    "function applyAcademicMeta(title=''){const meta=ACADEMIC_PAGE_META[active]||{title:'Akademik',description:'Ders programı, sınavlar ve planlar önce cihaz verisinden gösterilir.'},host=ownedAcademicHost(),h=host?.querySelector('[data-academic-title]'),d=host?.querySelector('[data-academic-description]');if(h)h.textContent=title||meta.title;if(d)d.textContent=meta.description}\nfunction canEditExams()",
    'Academic meta scope'
)
replace_once(
    academic,
    "const academicHost=document.querySelector('[data-academic-module]');academicHost?.classList.toggle",
    "const academicHost=ownedAcademicHost();if(!academicHost)return;academicHost.classList.toggle",
    'Academic render host'
)
replace_once(
    academic,
    "const searchWrap=document.querySelector('[data-academic-search-wrap]');",
    "const searchWrap=academicHost.querySelector('[data-academic-search-wrap]');",
    'Academic search scope'
)
replace_once(
    academic,
    "const out=document.getElementById('academicContent'),c=document.getElementById('academicCount');",
    "const out=academicHost.querySelector('#academicContent'),c=academicHost.querySelector('#academicCount');",
    'Academic results content scope'
)
replace_once(
    academic,
    ",out=document.getElementById('academicContent'),c=document.getElementById('academicCount');",
    ",out=academicHost.querySelector('#academicContent'),c=academicHost.querySelector('#academicCount');",
    'Academic primary content scope'
)
replace_once(
    academic,
    "window.PermissionService?.apply?.(document.getElementById('v2ModuleRoot')||document)",
    "window.PermissionService?.apply?.(academicHost)",
    'Academic permission scope'
)
replace_once(
    academic,
    "function bind(){document.getElementById('academicSearch')?.addEventListener('input',e=>{query=e.target.value;render()})}",
    "function bind(){ownedAcademicHost()?.querySelector('#academicSearch')?.addEventListener('input',e=>{query=e.target.value;render()})}",
    'Academic search binding scope'
)
replace_once(
    academic,
    "async function mount(root=document.getElementById('v2ModuleRoot')){if(!root)return false;mounted=true;ready=false;root.innerHTML=shell();bind();",
    "async function mount(root=document.getElementById('v2ModuleRoot')){if(!root)return false;mounted=true;ready=false;document.querySelectorAll('[data-academic-module]').forEach(host=>{if(!root.contains(host))host.remove()});root.innerHTML=shell();bind();",
    'Academic mount cleanup'
)
replace_once(
    academic,
    "const h=document.querySelector('[data-academic-module] > .ka-row h2');if(h)h.textContent='Yıllık Plan';",
    "const h=ownedAcademicHost()?.querySelector('[data-academic-title]');if(h)h.textContent='Yıllık Plan';",
    'Academic plan title scope'
)

# Scope schedule event binding to the current Academic host too.
regex_once(
    academic,
    r"function bindSchedule\(\)\{(.*?)\}\nfunction writtenModal",
    lambda m: "function bindSchedule(){const host=ownedAcademicHost();if(!host)return;" + m.group(1).replace("document.getElementById('academicClassSelect')", "host.querySelector('#academicClassSelect')").replace("document.querySelectorAll('[data-schedule-day]')", "host.querySelectorAll('[data-schedule-day]')").replace("document.querySelectorAll('[data-schedule-cell]')", "host.querySelectorAll('[data-schedule-cell]')").replace("document.querySelector('[data-schedule-add]')", "host.querySelector('[data-schedule-add]')").replace("document.querySelector('[data-schedule-import]')", "host.querySelector('[data-schedule-import]')").replace("document.querySelector('[data-schedule-report]')", "host.querySelector('[data-schedule-report]')").replace("document.querySelector('[data-schedule-sheet-report]')", "host.querySelector('[data-schedule-sheet-report]')") + "}\nfunction writtenModal",
    'Academic schedule binding scope'
)

# 3) Teacher profile exams belong to assigned ogretmenId; creator is legacy fallback only.
shell = 'js/core/shell-ui.js'
replace_once(
    shell,
    "function profileOwnExams(uid=user().uid||''){if(!uid)return[];return arr('sinavlar').filter(x=>String(x.sahipUid||'')===String(uid)).slice().sort((a,b)=>String(b.tarih||'').localeCompare(String(a.tarih||''))||String(a.ders||'').localeCompare(String(b.ders||''),'tr',{sensitivity:'base'}))}",
    "function profileOwnExams(tid=profileTeacherId(),uid=user().uid||''){if(!tid&&!uid)return[];return arr('sinavlar').filter(x=>(tid&&String(x.ogretmenId||'')===String(tid))||(!x.ogretmenId&&uid&&String(x.sahipUid||'')===String(uid))).slice().sort((a,b)=>String(b.tarih||'').localeCompare(String(a.tarih||''))||String(a.ders||'').localeCompare(String(b.ders||''),'tr',{sensitivity:'base'}))}",
    'Profile assigned exams'
)
replace_once(shell, "'Sınavlarım','Oluşturduğunuz yazılı sınavlar'", "'Sınavlarım','Size atanmış yazılı sınavlar'", 'Profile exam action text')
replace_once(shell, "exams:['Sınavlarım','Yalnız sizin oluşturduğunuz yazılı sınavlar gösteriliyor.']", "exams:['Sınavlarım','Yalnız size atanmış yazılı sınavlar gösteriliyor.']", 'Profile exam detail text')
replace_once(shell, 'Sizin oluşturduğunuz yazılı sınav kaydı bulunamadı.', 'Size atanmış yazılı sınav kaydı bulunamadı.', 'Profile exam empty text')

# Shell-owned root surfaces must suspend any route module before replacing v2ModuleRoot.
marker = "function setBottomActive(action){activeAction=action;$$('[data-ka-shell-action]').forEach(b=>{const on=b.dataset.kaShellAction===action;b.classList.toggle('active',on);on?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current')})}"
replace_once(shell, marker, marker + "\nfunction suspendModuleForShellSurface(){global.AppLoader?.suspendActiveModule?.()}", 'Shell surface suspend helper')
replace_once(shell, "function renderProfile({remember=true}={}){\n  closeHeaderPopover();closeMenu();setBottomActive('profile');", "function renderProfile({remember=true}={}){\n  closeHeaderPopover();closeMenu();suspendModuleForShellSurface();setBottomActive('profile');", 'Profile module suspension')
replace_once(shell, "function renderProfileDetail(kind,{remember=true}={}){closeHeaderPopover();closeMenu();setBottomActive('profile');", "function renderProfileDetail(kind,{remember=true}={}){closeHeaderPopover();closeMenu();suspendModuleForShellSurface();setBottomActive('profile');", 'Profile detail module suspension')
replace_once(shell, "function renderSearch({remember=true}={}){\n  closeHeaderPopover();closeMenu();setBottomActive('search');", "function renderSearch({remember=true}={}){\n  closeHeaderPopover();closeMenu();suspendModuleForShellSurface();setBottomActive('search');", 'Search module suspension')

old_history = "function sameView(a,b){return !!a&&!!b&&a.kind===b.kind&&a.name===b.name&&a.bottom===b.bottom&&a.page===b.page&&a.title===b.title&&(a.parentMenu||'')===(b.parentMenu||'')}\nfunction rememberView(view){if(!view)return;const top=navStack[navStack.length-1];if(sameView(top,view))return;navStack.push(view);if(navStack.length>30)navStack.splice(0,navStack.length-30)}"
new_history = "function sameView(a,b){return !!a&&!!b&&a.kind===b.kind&&a.name===b.name&&a.bottom===b.bottom&&a.page===b.page&&a.title===b.title&&(a.parentMenu||'')===(b.parentMenu||'')}\nfunction sameSurface(a,b){if(!a||!b||a.kind!==b.kind)return false;if(a.kind==='route')return a.name===b.name&&(a.page||'')===(b.page||'');if(a.kind==='profile-detail')return a.page===b.page;return ['profile','search'].includes(a.kind)}\nfunction rememberView(view){if(!view)return;const top=navStack[navStack.length-1];if(sameView(top,view))return;if(sameSurface(top,view)){navStack[navStack.length-1]=view;return}navStack.push(view);if(navStack.length>30)navStack.splice(0,navStack.length-30)}"
replace_once(shell, old_history, new_history, 'Visible route history dedupe')

# MainActivity is Android's native back owner; ShellUI owns browser history only.
regex_once(
    shell,
    r"function installBackNavigation\(\)\{.*?\}\nfunction back\(\)",
    "function installBackNavigation(){if(!browserBackBound){browserBackBound=true;history.replaceState({kaShellGuard:'root'},'');history.pushState({kaShellGuard:'active'},'');window.addEventListener('popstate',()=>{if(browserExitApproved){browserExitApproved=false;history.back();return}handleAppBack({fromPop:true})})}}\nfunction back()",
    'Single native back owner'
)

# 4) Regression contracts.
p = Path('tests/academic-separate-pages.test.js')
text = p.read_text(encoding='utf-8')
core_marker = "const core=fs.readFileSync('js/core/core.js','utf8');"
if text.count(core_marker) != 1:
    raise SystemExit('Academic test core marker missing')
text = text.replace(core_marker, core_marker + "\nconst classicParity=fs.readFileSync('js/modules/classic-parity.js','utf8');", 1)
marker = "assert(!css.includes('.ka-written-hero')&&!css.includes('.ka-trial-hero'),'Emekli ikinci sınav hero tasarımları merkezi CSS içinde yama/ölü katman olarak kalmamalı.');"
addition = marker + "\nassert(!classicParity.includes('injectAcademicSummary')&&!classicParity.includes('data-classic-written-summary')&&!classicParity.includes('data-classic-trial-summary')&&!classicParity.includes('injectAcademicModalIntro'),'Classic parity Academic ekranına ikinci özet veya modal katmanı eklememeli.');\nfor(const token of ['function ownedAcademicHost()','if(!root.contains(host))host.remove()','const academicHost=ownedAcademicHost();if(!academicHost)return',\"academicHost.querySelector('#academicContent')\",\"const host=ownedAcademicHost();if(!host)return\"])assert(academic.includes(token),`Academic tek DOM sahibi sözleşmesi eksik: ${token}`);"
if text.count(marker) != 1:
    raise SystemExit('Academic test visual-owner marker missing')
text = text.replace(marker, addition, 1)
if text.count('academic.js?v=878') != 1:
    raise SystemExit(f'Academic test loader version expected 1, found {text.count("academic.js?v=878")}')
text = text.replace('academic.js?v=878', 'academic.js?v=879', 1)
p.write_text(text, encoding='utf-8')

p = Path('tests/profile-page-redesign.test.js')
text = p.read_text(encoding='utf-8')
marker = "assert(block.includes(\"action('schedule'\")&&block.includes(\"action('duty'\")&&block.includes(\"action('exams'\")&&block.includes(\"action('tasks'\"),'Dört kişisel çalışma alanı davranışı korunmalı.');"
addition = marker + "\nassert(ui.includes(\"function profileOwnExams(tid=profileTeacherId(),uid=user().uid||'')\")&&ui.includes(\"String(x.ogretmenId||'')===String(tid)\")&&ui.includes(\"!x.ogretmenId&&uid&&String(x.sahipUid||'')===String(uid)\"),'Profil Sınavlarım ogretmenId üzerinden, yalnız eski kayıtlarda sahipUid fallback ile çalışmalı.');\nassert(block.includes('Size atanmış yazılı sınavlar'),'Profil Sınavlarım atanmış sınavları açıklamalı.');\nassert(block.includes('suspendModuleForShellSurface()'),'Profil görünümü önce aktif modülü askıya almalı.');"
if text.count(marker) != 1:
    raise SystemExit('Profile test action marker missing')
p.write_text(text.replace(marker, addition, 1), encoding='utf-8')

p = Path('tests/native-back-holiday-regression.test.js')
text = p.read_text(encoding='utf-8')
runtime_marker = "const runtime=fs.readFileSync('js/core/platform/mobile-runtime-fixes.js','utf8');"
if text.count(runtime_marker) != 1:
    raise SystemExit('Native back runtime marker missing')
text = text.replace(runtime_marker, runtime_marker + "\nconst shell=fs.readFileSync('js/core/shell-ui.js','utf8');", 1)
marker = "assert(activity.includes(\"window.ShellUI && typeof window.ShellUI.back==='function'\"),'Android geri tuşu ShellUI geçmişine devredilmiyor.');"
addition = marker + "\nassert(!shell.includes(\"addListener('backButton'\"),'Android geri tuşu MainActivity ve Capacitor listener tarafından iki kez sahiplenilmemeli.');\nassert(shell.includes('function sameSurface(a,b)')&&shell.includes('if(sameSurface(top,view))'),'Aynı görünür route geçmişte üst üste birikmemeli.');"
if text.count(marker) != 1:
    raise SystemExit('Native back assertion marker missing')
p.write_text(text.replace(marker, addition, 1), encoding='utf-8')

# 5) Bust runtime caches so the fixed owners are actually loaded on Android/PWA.
replace_once('js/app-loader.js', "'js/modules/academic.js?v=878'", "'js/modules/academic.js?v=879'", 'Academic loader version')
replace_once('index.html', 'js/core/shell-ui.js?v=883', 'js/core/shell-ui.js?v=884', 'Shell version')
replace_once('service-worker.js', "const CACHE_ADI='oy-cache-v925';", "const CACHE_ADI='oy-cache-v926';", 'SW cache version')
replace_once('service-worker.js', './js/core/shell-ui.js?v=883', './js/core/shell-ui.js?v=884', 'SW shell version')
replace_once('service-worker.js', './js/modules/academic.js?v=878', './js/modules/academic.js?v=879', 'SW Academic version')
