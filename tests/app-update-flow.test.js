const fs=require('fs');
const assert=require('assert');

const runtime=fs.readFileSync('js/core/platform/mobile-runtime-fixes.js','utf8');
const buildWorkflow=fs.readFileSync('.github/workflows/build-apk.yml','utf8');
const publishWorkflow=fs.readFileSync('.github/workflows/publish-apk.yml','utf8');
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
  'updateAvailable:latest.build>current.build',
  'data-app-update-status',
  'Mevcut sürüm:',
  'Uygulama güncel',
  'Yayınlanan son sürüm',
  'showUpToDateModal',
  'RELEASE_LIST_API',
  'const result=await checkPromise'
])assert(runtime.includes(text),`Uygulama güncelleme akışı eksik: ${text}`);

assert(activity.includes('registerPlugin(UpdatePlugin.class)'),'UpdatePlugin MainActivity içinde kayıtlı değil.');
assert(activity.includes('mobile-runtime-fixes.js'),'Native güncelleme yöneticisini taşıyan runtime dosyası yüklenmiyor.');
assert(plugin.includes('@CapacitorPlugin(name = "UpdatePlugin")')&&plugin.includes('public void indirVeKur'),'Native APK indirme/kurulum eklentisi eksik.');

assert(buildWorkflow.includes('"kod": ${{ github.run_number }}')||buildWorkflow.includes('\\"kod\\": ${{ github.run_number }}'),'APK version.json build numarasıyla üretilmiyor.');
assert(buildWorkflow.includes('Android versionCode / versionName güncelle'),'Android versionCode her APK buildinde güncellenmiyor.');
assert(buildWorkflow.includes('versionCode {build}')&&buildWorkflow.includes('versionName "1.2.{build}"'),'Gradle sürüm enjeksiyonu eksik.');
assert(!buildWorkflow.includes('softprops/action-gh-release'),'Normal APK build otomatik release oluşturmamalı.');
assert(buildWorkflow.includes('APK test artefaktı olarak yükle'),'Normal APK build test artefaktı üretmeli.');

assert(publishWorkflow.includes('workflow_dispatch'),'APK yayınlama workflowu yalnız elle başlatılmalı.');
assert(publishWorkflow.includes('build_run_id'),'Yayınlanacak test build Run ID ile seçilmeli.');
assert(publishWorkflow.includes('actions/download-artifact@v4'),'Test edilmiş APK artefaktı yayın workflowunda indirilmeli.');
assert(publishWorkflow.includes('softprops/action-gh-release@v2'),'Manuel yayın workflowu GitHub Release oluşturmalı.');
assert(publishWorkflow.includes('make_latest: true'),'Onaylanan APK latest release olmalı.');
assert(publishWorkflow.includes('conclusion')&&publishWorkflow.includes('success'),'Başarısız build yayınlanamamalı.');
assert(publishWorkflow.includes('head_branch')&&publishWorkflow.includes('main'),'Yalnız main buildi yayınlanabilmeli.');

console.log('Android manuel test -> yayın güncelleme akışı sözleşmesi başarılı.');
