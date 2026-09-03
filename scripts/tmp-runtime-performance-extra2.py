from pathlib import Path

p=Path('tests/documents-viewer-v2-smoke.test.js')
s=p.read_text(encoding='utf-8')
old="assert(design.includes('.ka-route-switching{visibility:hidden!important}'),'Sayfa geçişi görünürlük stili merkezi design-system içinde olmalı.');\nassert(shell.includes('function hideRouteTransitionFrame()')&&shell.includes(\"root.classList.add('ka-route-switching')\")&&shell.includes('requestAnimationFrame(()=>requestAnimationFrame(reveal))'),'Ara route renderı merkezi ShellUI tarafından gizlenmeli.');"
new="assert(!design.includes('.ka-route-switching{visibility:hidden!important}'),'Sayfa geçişi tüm modül kökünü gizleyip boş kare üretmemeli.');\nassert(shell.includes('const reuseModule=moduleRouteMounted(name)')&&shell.includes('if(!reuseModule)await global.AppLoader?.load?.(name)'),'Shell aynı modül geçişlerinde yeniden yükleme yapmamalı; mevcut ekran yeni modül hazır olana kadar korunmalı.');"
if old not in s:
    raise SystemExit('Documents eski route-transition assertion bloğu bulunamadı')
p.write_text(s.replace(old,new,1),encoding='utf-8')
print('Route transition regresyonu hızlı navigation davranışına hizalandı.')
