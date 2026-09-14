const fs=require('fs');
const assert=require('assert');

const runtime=fs.readFileSync('js/core/platform/mobile-runtime-fixes.js','utf8');
const settings=fs.readFileSync('js/modules/settings.js','utf8');
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
assert(settings.includes('Güncellemeleri Kontrol Et')&&settings.includes('data-app-update-settings'),'Güncelleme kontrolü canonical Settings ekranında değil.');

assert(activity.includes('registerPlugin(UpdatePlugin.class)'),'UpdatePlugin MainActivity içinde kayıtlı değil.');
assert(activity.includes('mobile-runtime-fixes.js'),'Native güncelleme yöneticisini taşıyan runtime dosyası yüklenmiyor.');
assert(plugin.includes('@CapacitorPlugin(name = "UpdatePlugin")')&&plugin.includes('public void indirVeKur'),'Native APK indirme/kurulum eklentisi eksik.');

assert(buildWorkflow.includes('"kod": ${{ github.run_number }}')||buildWorkflow.includes('\\"kod\\": ${{ github.run_number }}'),'APK version.json build numarasıyla üretilmiyor.');
assert(buildWorkflow.includes('Android versionCode / versionName güncelle'),'Android versionCode her APK buildinde güncellenmiyor.');
assert(buildWorkflow.includes('versionCode {build}')&&buildWorkflow.includes('versionName "1.2.{build}"'),'Gradle sürüm enjeksiyonu eksik.');
assert(buildWorkflow.includes('contents: write'),'APK build workflowu GitHub Release yayınlama yetkisine sahip olmalı.');
assert(buildWorkflow.includes('softprops/action-gh-release@v2'),'Başarılı main APK buildi otomatik GitHub Release olarak yayınlanmalı.');
assert(buildWorkflow.includes('tag_name: v${{ github.run_number }}'),'Release etiketi APK build numarasıyla eşleşmeli.');
assert(buildWorkflow.includes('make_latest: true'),'Yeni APK otomatik olarak latest release yapılmalı.');
assert(buildWorkflow.includes("if: github.ref == 'refs/heads/main'"),'Otomatik APK yayını yalnız main dalında çalışmalı.');
assert(buildWorkflow.includes('APK test artefaktı olarak yükle'),'APK ayrıca test/arsiv artefaktı olarak saklanmalı.');

// Elle yayın workflowu olağan akış değil, gerektiğinde eski/test edilmiş bir buildi yeniden yayınlamak için yedek mekanizmadır.
assert(publishWorkflow.includes('workflow_dispatch'),'Yedek APK yayınlama workflowu elle başlatılabilmeli.');
assert(publishWorkflow.includes('build_run_id'),'Yedek yayın akışı build Run ID ile seçilebilmeli.');
assert(publishWorkflow.includes('actions/download-artifact@v4'),'Yedek yayın akışı seçilen APK artefaktını indirmeli.');
assert(publishWorkflow.includes('softprops/action-gh-release@v2'),'Yedek yayın akışı GitHub Release oluşturabilmeli.');
assert(publishWorkflow.includes('make_latest: true'),'Yedek yayınlanan APK latest release olmalı.');
assert(publishWorkflow.includes('conclusion')&&publishWorkflow.includes('success'),'Başarısız build yedek akıştan yayınlanamamalı.');
assert(publishWorkflow.includes('head_branch')&&publishWorkflow.includes('main'),'Yalnız main buildi yayınlanabilmeli.');

console.log('Android otomatik build -> latest release güncelleme akışı sözleşmesi başarılı.');
