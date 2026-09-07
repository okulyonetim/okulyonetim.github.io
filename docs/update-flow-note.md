# Android uygulama içi güncelleme akışı

- APK içine `version.json` ile GitHub Actions `run_number` gömülür.
- Android `versionCode` ve `versionName` aynı build numarasıyla otomatik yükseltilir.
- Her başarılı `main` APK build'i `v<run_number>` etiketiyle GitHub Release olarak yayımlanır ve latest yapılır.
- Native runtime, GitHub latest release ile yerel build numarasını karşılaştırır.
- Yeni sürüm varsa uygulama açılışında uyarı gösterilir.
- Ayarlar > Hesap ve Güvenlik bölümüne **Güncellemeleri Kontrol Et** eylemi eklenir.
- Güncelleme APK'sı `UpdatePlugin` ile uygulama içinde indirilir ve Android kurulum ekranı açılır.
