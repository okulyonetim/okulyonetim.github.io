from pathlib import Path

DASH=Path('js/modules/dashboard.js')
TEST=Path('tests/dashboard-card-routes-smoke.test.js')
SHELLTEST=Path('tests/classic-shell-v2-smoke.test.js')

dash=DASH.read_text()
test=TEST.read_text()
shelltest=SHELLTEST.read_text()

old="const REMINDER_DEFS={evrakTakibi:'evrak',sosyalKulupler:'sosyalKulupler',rehberlik:'rehberlik',maarifRapor:'maarifRapor',zumre:'zumre',sok:'sok',bepPlani:'bepPlani',belirliGunler:'belirliGunler',kontrolListeleri:'kontrolListeleri',kontrolListeTamamlama:'kontrolListeTamamlama',hatirlatmaAyarlari:'hatirlatmaAyarlari',dersSaatleri:'dersSaatleri',personelIzinler:'personelIzinler',ogretmenIzinleri:'ogretmenIzinleri',anketler:'anketler'};"
new="const REMINDER_DEFS={evrakTakibi:'evrak',sosyalKulupler:'sosyalKulupler',rehberlik:'rehberlik',maarifRapor:'maarifRapor',zumre:'zumre',sok:'sok',bepPlani:'bepPlani',belirliGunler:'belirliGunler',kontrolListeleri:'kontrolListeleri',kontrolListeTamamlama:'kontrolListeTamamlama',hatirlatmaAyarlari:'hatirlatmaAyarlari',dersSaatleri:'dersSaatleri',ogretmenIzinleri:'ogretmenIzinleri',anketler:'anketler',okulBilgileri:'okulBilgileri',yillikPlanTanimlari:'yillikPlanTanimlari',ogretmenYillikPlanSecimleri:'ogretmenYillikPlanSecimleri'};"
if old not in dash: raise SystemExit('REMINDER_DEFS contract not found')
dash=dash.replace(old,new,1)
DASH.write_text(dash)

test += '''
assert(dash.includes("okulBilgileri:'okulBilgileri'")&&dash.includes("yillikPlanTanimlari:'yillikPlanTanimlari'")&&dash.includes("ogretmenYillikPlanSecimleri:'ogretmenYillikPlanSecimleri'"),'Dashboard sosyal bağlantılar ve öğretmen yıllık plan odağı için gereken verileri ilk açılışta local hydrate etmeli.');
assert(!dash.includes("personelIzinler:'personelIzinler'"),'Hizmetli/işçi izinleri dashboard local hydrate ve render akışına dönmemeli.');
'''
TEST.write_text(test)

shelltest += '''
assert(dashboard.includes("SyncEngine.localHydrate(types)")&&dashboard.includes("okulBilgileri:'okulBilgileri'"),'Dashboard ek verileri Firestore beklemeden IndexedDB üzerinden hydrate etmeli.');
'''
SHELLTEST.write_text(shelltest)
