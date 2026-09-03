from pathlib import Path

p=Path('scripts/tmp-user-statistics-redesign.py')
s=p.read_text(encoding='utf-8')
start=s.find('old_open="""')
end=s.find("settings_path.write_text(s,encoding='utf-8')",start)
if start<0 or end<0:
    raise SystemExit('helper openPage patch target not found')
replacement=r'''open_start=s.find('function openPage(')
if open_start<0: raise SystemExit('openPage function not found')
open_end=s.find('\nfunction ',open_start+1)
if open_end<0: raise SystemExit('openPage next function boundary not found')
new_open="function openPage(page,title=''){if(!activeAllowed(page)){window.toast?.('Bu ayar sayfası için yetkiniz yok.');return false}active=page;const h=document.querySelector('[data-settings-module] h2'),desc=document.querySelector('[data-settings-description]');if(h)h.textContent=page==='home'?'Ayarlar':(title||h.textContent);if(desc)desc.textContent=settingsDescription(page);render();if(page==='statistics')void prepareStatisticsData(false);return true}"
s=s[:open_start]+new_open+s[open_end:]
'''
s=s[:start]+replacement+s[end:]
old_cache="""for path in ['index.html','service-worker.js']:
    p=Path(path);t=p.read_text(encoding='utf-8').replace('v865','v866').replace('oy-cache-v865','oy-cache-v866');p.write_text(t,encoding='utf-8')"""
new_cache="""for path in ['index.html','service-worker.js']:
    p=Path(path);t=p.read_text(encoding='utf-8')
    if path=='index.html':
        import re
        t=re.sub(r'css/design-system\\.css\\?v=\\d+', 'css/design-system.css?v=866', t)
    else:
        import re
        t=re.sub(r\"const CACHE_ADI='oy-cache-v\\d+'\", \"const CACHE_ADI='oy-cache-v866'\", t)
        t=re.sub(r'\\./css/design-system\\.css\\?v=\\d+', './css/design-system.css?v=866', t)
    p.write_text(t,encoding='utf-8')"""
if old_cache not in s:
    raise SystemExit('helper cache block not found')
s=s.replace(old_cache,new_cache,1)
p.write_text(s,encoding='utf-8')
