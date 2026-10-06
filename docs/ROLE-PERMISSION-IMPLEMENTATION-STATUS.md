# Rol ve Yetki Yenileme — Uygulama Durumu

## Güvenli başlangıç
- Yedek branch: `backup-before-role-permission-renewal-20261006`
- Başlangıç commit: `aa0b191e10ad8e5058f7ecc5ebdc37b1e0be4971`
- Firebase / Firestore rules değiştirilmedi.
- IndexedDB / AppStore / local-first senkronizasyon değiştirilmedi.

## Mevcut gerçek kaynak
`PermissionService` halen çalışma zamanındaki yetki kararlarının sahibidir. Mevcut seviyeler `hidden`, `preview`, `read`, `edit` olarak korunacaktır.

## Yeni hedef kaynak
`js/core/role-permission-catalog.js` ayrıntılı modül/sayfa/işlem kataloğudur. Bu katalog doğrudan ikinci bir runtime yetki sistemi olarak çalıştırılmamalıdır; `PermissionService` ile tek kaynak haline getirilmelidir.

## Entegrasyon kuralı
- Yeni katalog ve eski katalog paralel karar vermeyecek.
- Eski permission anahtarları yalnızca legacy alias olarak korunacak.
- Rol belgelerindeki mevcut `yetkiler` değerleri geriye dönük okunabilir kalacak.
- Yeni permission anahtarları kademeli olarak gerçek sayfa ve işlem kontrollerine bağlanacak.
- Menü gizleme tek başına yeterli kabul edilmeyecek; sayfa ve mutation katmanları da aynı servisi kullanacak.

## Sonraki uygulama adımları
1. `PermissionService` içindeki sabit katalogu yeni katalogdan besle.
2. Mevcut alias çözümlemesini koru.
3. Rol editörünü yeni hiyerarşik katalogdan üret.
4. Menü/router görünürlüğünü katalog permission'larına eşle.
5. Kritik mutation işlemlerini yeni permission anahtarlarına eşle.
6. Mevcut rollerin izinlerini migration olmadan okuyabilecek uyumluluk katmanı ekle.
7. Testleri çalıştır.
8. Tek anlamlı entegrasyon commit'i oluştur.
