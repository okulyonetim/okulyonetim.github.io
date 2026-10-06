/* Koruk Asistan — Merkezi Rol / Yetki Kataloğu
 *
 * Bu dosya rol yetkilerinin kavramsal kaynak kataloğudur.
 * Runtime PermissionService ile entegrasyonu, mevcut servis davranışını
 * bozmadan tek noktadan yapılmalıdır. Legacy anahtarlar silinmez.
 */
(function(global){
  'use strict';

  const LEVELS = Object.freeze({hidden:0, preview:1, read:2, edit:3});

  const entries = [
    ['module.dashboard','Ana Sayfa','page'],
    ['module.people','Öğretmen / Öğrenci','page'],
    ['module.academic','Akademik','page'],
    ['module.management','Yönetim','page'],
    ['module.communication','İletişim','page'],
    ['module.transport','Taşıma','page'],
    ['module.food','Yemek','page'],
    ['module.documents','Doküman / Evrak','page'],
    ['module.reports','Raporlar','page'],
    ['module.tools','Araçlar','page'],
    ['module.settings','Ayarlar','page'],

    ['people.teachers','Öğretmenler','section'],
    ['people.teachers.edit','Öğretmen düzenleme','action'],
    ['people.teachers.delete','Öğretmen silme','action'],
    ['people.students','Öğrenciler','section'],
    ['people.students.edit','Öğrenci düzenleme','action'],
    ['people.students.delete','Öğrenci silme','action'],
    ['people.classes','Sınıflar','section'],
    ['people.classes.edit','Sınıf düzenleme','action'],
    ['people.attendance','Öğrenci yoklama','section'],
    ['people.attendance.edit','Yoklama düzenleme','action'],

    ['academic.exams','Sınav işlemleri','section'],
    ['academic.exams.edit','Sınav düzenleme','action'],
    ['academic.trial','Deneme sınavları','section'],
    ['academic.trial.edit','Deneme sınavı düzenleme','action'],
    ['academic.results','Sınav sonuçları','section'],
    ['academic.results.edit','Sınav sonuçları düzenleme','action'],
    ['academic.plans','Yıllık planlar','section'],
    ['academic.plans.edit','Yıllık plan düzenleme','action'],
    ['academic.schedule','Ders programı','section'],
    ['academic.schedule.edit','Ders programı düzenleme','action'],
    ['academic.calendar','Akademik takvim','section'],
    ['academic.calendar.edit','Akademik takvim düzenleme','action'],

    ['management.duty','Nöbet programı','section'],
    ['management.duty.edit','Nöbet düzenleme','action'],
    ['management.personnel','Personel','section'],
    ['management.personnel.edit','Personel düzenleme','action'],
    ['management.tasks','Aylık işler / görevler','section'],
    ['management.tasks.edit','Aylık işler düzenleme','action'],
    ['management.leaves','İzinler','section'],
    ['management.leaves.edit','İzin düzenleme','action'],
    ['management.teacherLeaves','Öğretmen izinleri','section'],
    ['management.teacherLeaves.edit','Öğretmen izni düzenleme','action'],
    ['management.puantaj','Puantaj / imza sirküsü','section'],
    ['management.puantaj.edit','Puantaj düzenleme','action'],
    ['management.dilekce','Dilekçe işlemleri','section'],
    ['management.dilekce.edit','Dilekçe düzenleme','action'],
    ['management.meetingSchedule','Toplantı çizelgesi','section'],
    ['management.meetingSchedule.edit','Toplantı çizelgesi düzenleme','action'],
    ['management.teacherListBuilder','Öğretmen liste oluşturucu','section'],
    ['management.teacherListBuilder.edit','Öğretmen liste oluşturucu düzenleme','action'],

    ['communication.messages','Mesajlaşma','section'],
    ['communication.messages.send','Mesaj gönderme','action'],
    ['communication.announcements','Duyurular','section'],
    ['communication.announcements.edit','Duyuru düzenleme','action'],
    ['communication.polls','Anketler','section'],
    ['communication.polls.edit','Anket yönetimi','action'],
    ['communication.news','Haberler','section'],
    ['communication.news.edit','Haber yönetimi','action'],
    ['communication.calendar','Takvim','section'],
    ['communication.calendar.edit','Takvim düzenleme','action'],
    ['communication.notes','Notlar','section'],
    ['communication.notes.edit','Not düzenleme','action'],

    ['transport.services','Taşıma / servisler','section'],
    ['transport.services.edit','Servis düzenleme','action'],
    ['transport.seating','Servis oturma planı','section'],
    ['transport.seating.edit','Servis oturma planı düzenleme','action'],
    ['transport.classSeating','Sınıf oturma planı','section'],
    ['transport.classSeating.edit','Sınıf oturma planı düzenleme','action'],
    ['transport.map','Taşıma haritası','section'],
    ['transport.map.edit','Taşıma haritası düzenleme','action'],
    ['transport.report.inspection','Denetim formu','action'],
    ['transport.report.monthly','Aylık takip','action'],

    ['food.menu','Yemek menüsü','section'],
    ['food.menu.edit','Yemek menüsü düzenleme','action'],
    ['food.audit','Yemek denetim formu','section'],
    ['food.audit.edit','Yemek denetim formu düzenleme','action'],

    ['documents.view','Dokümanlar','section'],
    ['documents.edit','Doküman düzenleme','action'],
    ['documents.tracking','Evrak takibi','section'],
    ['documents.tracking.edit','Evrak takibi düzenleme','action'],
    ['documents.pdf','PDF araçları','section'],
    ['documents.pdf.edit','PDF işlemleri','action'],
    ['documents.monthlyTasks','Aylık işler belgeleri','section'],

    ['reports.view','Okul raporları','section'],
    ['reports.create','Rapor oluşturma','action'],
    ['reports.customize','Rapor sütun özelleştirme','action'],
    ['reports.pdf','PDF rapor','action'],
    ['reports.excel','Excel rapor','action'],

    ['tools.checklists','Kontrol listeleri','section'],
    ['tools.map','Harita','section'],
    ['tools.schedules','Çizelgeler','section'],
    ['tools.attendance','Devamsızlık','section'],
    ['tools.gradebook','Ödev / not','section'],
    ['tools.rubric','Değerlendirme ölçekleri','section'],
    ['tools.formMaarif','Maarif Model','section'],
    ['tools.formBelirliGunler','Belirli Gün ve Haftalar','section'],
    ['tools.formSok','ŞÖK','section'],
    ['tools.formZumre','Zümre','section'],
    ['tools.formKulup','Sosyal Kulüpler','section'],
    ['tools.formRehberlik','Rehberlik','section'],
    ['tools.formBep','Yıllık Planlar / BEP','section'],
    ['tools.formDigerEvrak','Diğer Evraklar','section'],
    ['tools.backup','Yedekleme','section'],
    ['tools.backup.edit','Yedekleme / geri yükleme','action'],
    ['tools.reminders','Hatırlatıcılar','section'],
    ['tools.reminders.edit','Hatırlatıcı düzenleme','action'],

    ['settings.school','Okul bilgileri','section'],
    ['settings.school.edit','Okul bilgileri düzenleme','action'],
    ['settings.users','Kullanıcı yönetimi','section'],
    ['settings.users.edit','Kullanıcı düzenleme','action'],
    ['settings.roles','Rol yönetimi','section'],
    ['settings.roles.edit','Rol düzenleme','action'],
    ['settings.roles.create','Rol oluşturma','action'],
    ['settings.roles.clone','Rol kopyalama','action'],
    ['settings.roles.delete','Rol silme','action'],
    ['settings.app','Uygulama düzeni','section'],
    ['settings.app.edit','Uygulama düzenini değiştirme','action'],
    ['settings.statistics','Kullanıcı istatistikleri','section'],
    ['settings.statistics.edit','Kullanıcı istatistiklerini sıfırlama','action'],
    ['settings.storage','Depolama ayarları','section'],
    ['settings.storage.edit','Depolama ayarlarını değiştirme','action']
  ];

  const catalog = Object.freeze(entries.map(([key,label,type])=>Object.freeze({key,label,type})));

  const legacyAliases = Object.freeze({
    'module.food':['yemek','food'],
    'food.menu':['yemek','yemekMenusu'],
    'food.audit':['yemekDenetim','yemekDenetimFormu'],
    'management.tasks':['periyodikIsler','gorevler'],
    'management.teacherLeaves':['ogretmenIzinleri'],
    'management.puantaj':['puantaj'],
    'management.dilekce':['dilekce'],
    'management.meetingSchedule':['meetingSchedule'],
    'documents.tracking':['evrak'],
    'documents.view':['dokumanlar'],
    'tools.checklists':['kontrolListeleri'],
    'tools.map':['harita'],
    'tools.schedules':['cizelgeler'],
    'tools.attendance':['devamsizlik'],
    'tools.gradebook':['odevTakip','notCizelgesi'],
    'tools.formKulup':['sosyalKulupler'],
    'tools.formBelirliGunler':['belirliGunler'],
    'tools.formZumre':['zumre'],
    'tools.formSok':['sok'],
    'tools.formBep':['bepPlani'],
    'tools.formRehberlik':['rehberlik'],
    'tools.formMaarif':['maarifRapor'],
    'tools.formDigerEvrak':['digerEvrak'],
    'settings.users':['kullaniciYonetimi'],
    'settings.roles':['kullaniciYonetimi'],
    'settings.roles.edit':['kullaniciYonetimi'],
    'settings.school':['okulBilgileri'],
    'settings.school.edit':['okulBilgileri'],
    'settings.app':['sistemAyarlari'],
    'settings.app.edit':['sistemAyarlari']
  });

  function mergeIntoPermissionService(){
    const ps=global.PermissionService;
    if(!ps)return false;
    const existing=Array.isArray(ps.catalog)?ps.catalog:[];
    const seen=new Set(existing.map(x=>x?.key).filter(Boolean));
    catalog.forEach(item=>{if(!seen.has(item.key))existing.push(item);});
    const aliases={...(ps.aliases||{})};
    Object.entries(legacyAliases).forEach(([key,list])=>{aliases[key]=[...new Set([...(aliases[key]||[]),...list])];});
    ps.aliases=Object.freeze(aliases);
    global.RolePermissionCatalog={LEVELS,catalog,legacyAliases,mergeIntoPermissionService};
    return true;
  }

  global.RolePermissionCatalog={LEVELS,catalog,legacyAliases,mergeIntoPermissionService};
  if(global.PermissionService)mergeIntoPermissionService();
})(window);
