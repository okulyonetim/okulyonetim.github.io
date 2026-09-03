from pathlib import Path
import re

settings_path=Path('js/modules/settings.js')
settings=settings_path.read_text(encoding='utf-8')

old_state="let active='home',mounted=false,unsubs=[],settingsAccordion='academic',statisticsRefreshing=false;"
new_state="let active='home',mounted=false,unsubs=[],settingsAccordion='',statisticsRefreshing=false;"
if old_state not in settings:
    raise SystemExit('settings state target not found')
settings=settings.replace(old_state,new_state,1)

old_head="""function settingsDescription(page){return page==='statistics'?'Tüm kullanıcıların giriş, kullanım ve depolama hareketlerini tek ekrandan izleyin.':'Uygulama ve hesap ayarlarını merkezi olarak yönetin.'}
function shell(){return `<section class=\"ka-stack\" data-settings-module><div><h2>Ayarlar</h2><p class=\"ka-muted\" data-settings-description>${esc(settingsDescription(active))}</p></div><div id=\"settingsContent\" class=\"ka-stack\"></div></section>`}"""
new_head="""function settingsDescription(page){if(page==='home')return'Hesap, akademik yapı ve sistem ayarları.';return page==='statistics'?'Tüm kullanıcıların giriş, kullanım ve depolama hareketlerini tek ekrandan izleyin.':'Bu bölümün ayarlarını yönetin.'}
function shell(){return `<section class=\"ka-stack ka-settings-page\" data-settings-module><header class=\"ka-settings-toolbar\"><button type=\"button\" class=\"ka-icon-button ka-settings-toolbar__back\" data-settings-back aria-label=\"Geri\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"m15 18-6-6 6-6\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></button><div class=\"ka-settings-toolbar__copy\"><h2 data-settings-title>Ayarlar</h2><p class=\"ka-muted\" data-settings-description>${esc(settingsDescription(active))}</p></div><span class=\"ka-settings-toolbar__spacer\" aria-hidden=\"true\"></span></header><div id=\"settingsContent\" class=\"ka-stack\"></div></section>`}"""
if old_head not in settings:
    raise SystemExit('settings header target not found')
settings=settings.replace(old_head,new_head,1)

old_bind="function bind(){}function subscribe(){"
new_bind="function backSettings(){if(active!=='home'){openPage('home','Ayarlar');return true}if(window.ShellUI?.back)return window.ShellUI.back();window.ShellUI?.home?.();return true}\nfunction bind(){document.querySelector('[data-settings-back]')?.addEventListener('click',backSettings)}function subscribe(){"
if old_bind not in settings:
    raise SystemExit('settings bind target not found')
settings=settings.replace(old_bind,new_bind,1)

old_open="const h=document.querySelector('[data-settings-module] h2'),desc=document.querySelector('[data-settings-description]');"
new_open="const h=document.querySelector('[data-settings-title]'),desc=document.querySelector('[data-settings-description]');"
if old_open not in settings:
    raise SystemExit('settings openPage title target not found')
settings=settings.replace(old_open,new_open,1)

old_export="window.SettingsModule={mount,unmount,render,prepareLocal,openPage,openRoleEditor,openUserEditor,saveReminderSettings};"
new_export="window.SettingsModule={mount,unmount,render,prepareLocal,openPage,back:backSettings,openRoleEditor,openUserEditor,saveReminderSettings};"
if old_export not in settings:
    raise SystemExit('settings export target not found')
settings=settings.replace(old_export,new_export,1)
settings_path.write_text(settings,encoding='utf-8')

css_path=Path('css/design-system.css')
css=css_path.read_text(encoding='utf-8')
marker='/* SETTINGS HOME ACCORDION — CANONICAL */'
if marker not in css:
    raise SystemExit('settings css marker not found')
header_css="""/* SETTINGS PAGE TOOLBAR — CANONICAL */
.ka-settings-page{width:100%;max-width:820px;margin:0 auto}.ka-settings-toolbar{width:100%;display:grid;grid-template-columns:44px minmax(0,1fr) 44px;align-items:center;gap:8px;min-height:72px;padding:9px 10px;border:1px solid var(--ka-border);border-radius:18px;background:var(--ka-card-bg);box-shadow:var(--ka-shadow-sm)}.ka-settings-toolbar__back{justify-self:start}.ka-settings-toolbar__copy{min-width:0;text-align:center}.ka-settings-toolbar__copy h2{font-size:20px}.ka-settings-toolbar__copy p{margin-top:2px;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ka-settings-toolbar__spacer{width:44px;height:44px;justify-self:end}.ka-settings-toolbar .ka-icon-button:active{background:var(--ka-primary-soft);color:var(--ka-primary)}
@media(max-width:600px){.ka-settings-page{gap:10px}.ka-settings-toolbar{min-height:58px;padding:6px 8px;border-radius:16px}.ka-settings-toolbar__copy h2{font-size:19px}.ka-settings-toolbar__copy p{display:none}}

"""
if '.ka-settings-toolbar{' in css:
    raise SystemExit('settings toolbar css already exists')
css=css.replace(marker,header_css+marker,1)
old_acc='.ka-settings-accordion{display:flex;flex-direction:column;gap:10px}'
new_acc='.ka-settings-accordion{width:100%;max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:10px}'
if old_acc not in css:
    raise SystemExit('settings accordion target not found')
css=css.replace(old_acc,new_acc,1)
old_group='.ka-settings-accordion__group{overflow:hidden;border:1px solid var(--ka-border);border-radius:18px;background:var(--ka-card-bg);box-shadow:var(--ka-shadow-sm)}'
new_group=old_group+'.ka-settings-accordion__group.is-open{border-color:var(--ka-border-strong);box-shadow:var(--ka-shadow-md)}'
if old_group not in css:
    raise SystemExit('settings accordion group target not found')
css=css.replace(old_group,new_group,1)
old_toggle='.ka-settings-accordion__toggle:active{background:var(--ka-muted-bg)}'
new_toggle=old_toggle+'.ka-settings-accordion__toggle:focus-visible,.ka-settings-accordion__item:focus-visible{outline:3px solid var(--ka-focus);outline-offset:-3px}'
if old_toggle not in css:
    raise SystemExit('settings accordion focus target not found')
css=css.replace(old_toggle,new_toggle,1)
css_path.write_text(css,encoding='utf-8')

# Cache/version contract: central CSS changed, so advance one generation.
index_path=Path('index.html')
index=index_path.read_text(encoding='utf-8')
if 'css/design-system.css?v=866' not in index:
    raise SystemExit('index design-system v866 target not found')
index=index.replace('css/design-system.css?v=866','css/design-system.css?v=867')
index_path.write_text(index,encoding='utf-8')

sw_path=Path('service-worker.js')
sw=sw_path.read_text(encoding='utf-8')
if "const CACHE_ADI='oy-cache-v866'" not in sw or './css/design-system.css?v=866' not in sw:
    raise SystemExit('service worker v866 targets not found')
sw=sw.replace("const CACHE_ADI='oy-cache-v866'","const CACHE_ADI='oy-cache-v867'",1)
sw=sw.replace('./css/design-system.css?v=866','./css/design-system.css?v=867',1)
sw_path.write_text(sw,encoding='utf-8')

# Regression contract for the new Settings navigation/header behavior.
test_path=Path('tests/settings-separate-pages.test.js')
test=test_path.read_text(encoding='utf-8')
needle="assert(settings.includes('function bindSettingsAccordion(out)')&&settings.includes('data-settings-accordion-toggle')&&settings.includes(\"label:'Hesap ve Güvenlik'\")&&settings.includes(\"label:'Akademik Yapı'\")&&settings.includes(\"label:'Sistem Yönetimi'\"),'Settings ana ekranı tek canonical akordeon gruplarıyla çalışmalı.');\n"
if needle not in test:
    raise SystemExit('settings test insertion target not found')
extra="const design=fs.readFileSync('css/design-system.css','utf8');\nassert(settings.includes(\"settingsAccordion=''\"),'Settings ana ekranı kategori özetini kapalı ve düzenli başlamalı.');\nassert(settings.includes('data-settings-back')&&settings.includes('data-settings-title')&&settings.includes('function backSettings()')&&settings.includes(\"openPage('home','Ayarlar')\")&&settings.includes('window.ShellUI?.back'),'Settings üst geri düğmesi alt sayfada landing sayfasına, landing sayfasında Shell geçmişine dönmeli.');\nassert(design.includes('.ka-settings-page')&&design.includes('.ka-settings-toolbar')&&design.includes('.ka-settings-toolbar__copy'),'Settings başlığı merkezi Design System içinde canonical toolbar stiline sahip olmalı.');\n"
test=test.replace(needle,needle+extra,1)
test_path.write_text(test,encoding='utf-8')

print('Settings toolbar redesign patch applied.')
