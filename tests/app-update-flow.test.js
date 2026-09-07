const fs=require('fs');
const assert=require('assert');

const runtime=fs.readFileSync('js/core/platform/mobile-runtime-fixes.js','utf8');
const workflow=fs.readFileSync('.github/workflows/build-apk.yml','utf8');
const activity=fs.readFileSync('android/app/src/main/java/com/koruk/okul/MainActivity.java','utf8');
const plugin=fs.readFileSync('android/app/src/main/java/com/koruk/okul/UpdatePlugin.java','utf8');

new Function(runtime);

for(const text of [
  'KorukAppUpdateManager',
  'releases/latest',
  'version.json',
  'data-app-update-settings',
  'Güncellemeleri Kontrol Et',
  'UpdatePlugin',
  'indirVeKur',
  'updateAvailable:latest.build>current.build'
])assert(runtime.includes(text),`Uygulama güncelleme akışı eksik: ${text}`);

assert(activity.includes('registerPlugin(UpdatePlugin.class)'),'UpdatePlugin MainActivity içinde kayıtlı değil.');
assert(activity.includes('mobile-runtime-fixes.js'),'Native güncelleme yöneticisini taşıyan runtime dosyası yüklenmiyor.');
assert(plugin.includes('@CapacitorPlugin(name = "UpdatePlugin")')&&plugin.includes('public void indirVeKur'),'Native APK indirme/kurulum eklentisi eksik.');

assert(workflow.includes('"kod": ${{ github.run_number }}')||workflow.includes('\\"kod\\": ${{ github.run_number }}'),'APK version.json build numarasıyla üretilmiyor.');
assert(workflow.includes('Android versionCode / versionName güncelle'),'Android versionCode her APK buildinde güncellenmiyor.');
assert(workflow.includes('versionCode {build}')&&workflow.includes('versionName "1.2.{build}"'),'Gradle sürüm enjeksiyonu eksik.');
assert(!workflow.includes("if: github.event_name == 'workflow_dispatch'"),'Release hâlâ yalnız manuel workflow_dispatch ile oluşturuluyor.');
assert(workflow.includes('make_latest: true'),'Yeni APK latest release olarak işaretlenmiyor.');

console.log('Android uygulama içi güncelleme akışı sözleşmesi başarılı.');
