from pathlib import Path

p=Path('js/modules/management.js')
s=p.read_text(encoding='utf-8')
old='<section class="ka-stack ka-duty-page">'
new='<section class="ka-stack ka-duty-page" aria-label="Nöbet Programı">'
if old not in s:
    raise SystemExit('canonical duty page marker not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

tp=Path('tests/classic-duty-v2-smoke.test.js')
t=tp.read_text(encoding='utf-8')
old_contract="for(const text of ['Nöbet Programı','Tarih bazlı aylık nöbet çizelgesi','📍 Nöbet Yerleri','📥 Excel’den İçe Aktar','🖨️ Nöbet Listesi','🔄 Otomatik Nöbet Dağıtımı','Bugünün Nöbetçileri','Resmi Tatiller','+ Tatil Ekle','‹ Önceki Ay','Sonraki Ay ›','Nöbetçi Amir']) assert(src.includes(text),`Klasik Nöbet ekranı öğesi eksik: ${text}`);"
new_contract="for(const text of ['Nöbet Programı','Nöbet Yerleri','Excel’den İçe Aktar','Nöbet Listesi','Otomatik Nöbet Dağıtımı','Bugünün Nöbetçileri','Resmi Tatiller','+ Tatil Ekle','‹ Önceki Ay','Sonraki Ay ›','Nöbetçi Amir','Öğretmen Nöbet Çizelgesi','Çizelgeyi görüntüle ve yazdır']) assert(src.includes(text),`Canonical Nöbet ekranı öğesi eksik: ${text}`);"
if old_contract not in t:
    raise SystemExit('legacy duty visible text contract not found')
t=t.replace(old_contract,new_contract,1)
tp.write_text(t,encoding='utf-8')
print('Duty page semantic and visible smoke contracts aligned.')
