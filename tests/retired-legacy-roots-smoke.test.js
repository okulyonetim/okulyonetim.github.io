const fs=require('fs');
const assert=require('assert');

const retired=[
  'js/istatistikler.js',
  'js/core/services/istatistik.service.js',
  'js/cizelgeler.js',
  'js/core/services/konum-giris.service.js',
  'js/excel-visual-fidelity-v3.js',
  'js/excel-import.js',
  'js/dokuman-pdf-tools.js',
  'js/dokuman-okuyucu.js',
  'js/harita.js',
  'js/raporlama.js',
  'js/ozellik-katalogu.js',
  'js/pdf-export-libs.js',
  'js/ogretmen-liste-olusturucu.js',
  'js/widget-plugin.js',
  'js/widget-bridge.js',
  'js/teblig-tebellug.js',
  'js/maas-degisiklik.js',
  'js/asistan.js',
  'js/mevzuat-asistan.js',
  'js/map-libs.js',
  'js/yedekleme.js',
  'js/yillik-plan-tohum-veri.js',
  'js/xlsm-viewer-support.js',
  'js/kriter-dagitim.js',
  'js/proje-degerlendirme.js',
  'js/modules/rubric-settings-parity.js',
  'js/modules/transport-data.js',
  'js/modules/duty-data.js',
  'js/modules/settings-data.js',
  'js/modules/academic-legacy-ui.js',
  'js/modules/transport-legacy-ui.js',
  'js/core/header-ui.js',
  'js/core/zengin-editor.js',
  'tests/feature-catalog-smoke.test.js',
  'tests/navigation-customization-smoke.test.js'
];

const resurrected=retired.filter(p=>fs.existsSync(p));
assert.deepStrictEqual(resurrected,[],`Emekli legacy dosyalar geri dönmemeli:\n${resurrected.join('\n')}`);
console.log(`Emekli legacy kök kilidi başarılı (${retired.length} dosya).`);
