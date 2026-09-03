from pathlib import Path


def replace_once(path, old, new):
    p=Path(path)
    s=p.read_text(encoding='utf-8')
    if old not in s:
        raise SystemExit(f'Beklenen parça bulunamadı: {path}: {old[:120]}')
    p.write_text(s.replace(old,new,1),encoding='utf-8')

# Profil iletişim bilgilerinin tek sahibi: yalnız ka-profile-contact.
p=Path('js/core/shell-ui.js')
s=p.read_text(encoding='utf-8')
anchor="function profileActionRow(kind,icon,title,desc,count){return `<button type=\"button\" class=\"ka-card ka-search-result\" data-profile-view=\"${kind}\"><span aria-hidden=\"true\">${icon}</span><div class=\"ka-grow\"><div class=\"ka-row ka-row--between\"><strong>${esc(title)}</strong><span class=\"ka-badge\">${count}</span></div><small class=\"ka-muted\">${esc(desc)}</small></div></button>`}\n"
helper="function profileContactHtml({handle='',phone='',email=''}){const seen=new Set();return [['@',String(handle||'').startsWith('@')?String(handle).slice(1):''],['☎',phone],['✉',email]].map(([icon,value])=>[icon,String(value||'').trim()]).filter(([,value])=>value).filter(([,value])=>{const key=value.toLocaleLowerCase('tr');if(seen.has(key))return false;seen.add(key);return true}).map(([icon,value])=>`<span class=\"ka-profile-contact__item\"><b aria-hidden=\"true\">${icon}</b><span>${esc(value)}</span></span>`).join('')}\n"
if anchor not in s:
    raise SystemExit('profileActionRow anchor bulunamadı')
if 'function profileContactHtml(' not in s:
    s=s.replace(anchor,anchor+helper,1)
old="  const contact=[handle?`<span class=\"ka-profile-contact__item\"><b aria-hidden=\"true\">@</b><span>${esc(handle.slice(1))}</span></span>`:'',phone?`<span class=\"ka-profile-contact__item\"><b aria-hidden=\"true\">☎</b><span>${esc(phone)}</span></span>`:'',email?`<span class=\"ka-profile-contact__item\"><b aria-hidden=\"true\">✉</b><span>${esc(email)}</span></span>`:''].filter(Boolean).join('');"
new="  const contact=profileContactHtml({handle,phone,email});"
if old not in s:
    raise SystemExit('Eski inline profil iletişim rendererı bulunamadı')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# Yeni shell rendererını eski Service Worker cache'inden kesin ayır.
replace_once('index.html','css/design-system.css?v=868','css/design-system.css?v=869')
replace_once('index.html','<script src="js/core/shell-ui.js" defer></script>','<script src="js/core/shell-ui.js?v=869" defer></script>')

p=Path('service-worker.js');s=p.read_text(encoding='utf-8')
for old,new in [
    ("const CACHE_ADI='oy-cache-v868';","const CACHE_ADI='oy-cache-v869';"),
    ("'./css/design-system.css?v=868'","'./css/design-system.css?v=869'"),
    ("'./js/core/core.js','./js/core/platform/widget-adapter.js','./js/core/shell-ui.js','./js/modules/school-live-status.js'","'./js/core/core.js','./js/core/platform/widget-adapter.js','./js/core/shell-ui.js?v=869','./js/core/shell-ui.js','./js/modules/school-live-status.js'")
]:
    if old not in s: raise SystemExit(f'SW beklenen parça bulunamadı: {old}')
    s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# Bu jenerasyona sabitlenmiş regresyon testlerini yeni cache nesline taşı.
for p in Path('tests').glob('*.test.js'):
    s=p.read_text(encoding='utf-8')
    next_s=s.replace('v868','v869').replace('v=868','v=869')
    if next_s!=s:
        p.write_text(next_s,encoding='utf-8')

# Profil testi: iletişim bilgileri tek helper üzerinden ve benzersiz render edilmeli.
p=Path('tests/profile-page-redesign.test.js');s=p.read_text(encoding='utf-8')
old="assert(block.includes(\"phone?`<span class=\\\"ka-profile-contact__item\\\"\")&&block.includes(\"email?`<span class=\\\"ka-profile-contact__item\\\"\"),'Telefon ve e-posta tek sıkışık satır yerine ayrı iletişim öğeleri olmalı.');"
new="assert(ui.includes(\"function profileContactHtml({handle='',phone='',email=''})\")&&ui.includes('const seen=new Set()')&&block.includes('const contact=profileContactHtml({handle,phone,email});'),'Profil kullanıcı adı, telefon ve e-postayı tek canonical iletişim rendererı üzerinden, yinelenmeden üretmeli.');\nassert(!block.includes('phone?`<span class=\\\"ka-profile-contact__item')&&!block.includes('email?`<span class=\\\"ka-profile-contact__item'),'Eski inline telefon/e-posta rendererı geri dönmemeli.');"
if old not in s: raise SystemExit('Profil eski contact assertion bulunamadı')
s=s.replace(old,new,1)
old="assert(index.includes('css/design-system.css?v=869'),'Profil tasarımı güncel merkezi CSS sürümüyle yüklenmeli.');"
if old not in s: raise SystemExit('Profil CSS v869 assertion bulunamadı')
s=s.replace(old,old+"\nassert(index.includes('js/core/shell-ui.js?v=869'),'Profil rendererı cache-bust edilmiş güncel ShellUI sürümünden yüklenmeli.');",1)
p.write_text(s,encoding='utf-8')

print('Profil iletişim tekilleştirme + cache bust düzeltmesi hazır.')
