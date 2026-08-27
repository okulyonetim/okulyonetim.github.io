const fs=require('fs');
const assert=require('assert');
const dashboard=fs.readFileSync('js/modules/dashboard.js','utf8');
assert(dashboard.includes('data-dash-page="written"'),'Sınav Ekle doğrudan Yazılı Sınavlar sayfasına gitmeli.');
assert(dashboard.includes('data-dash-page="messages"'),'Mesaj Gönder doğrudan Mesajlaşma sayfasına gitmeli.');
assert(dashboard.includes("page:btn.dataset.dashPage||''"),'Dashboard route binding sayfa hedefini ShellUI routeModule API sine aktarmalı.');
assert(dashboard.includes('data-dash-quick-note'),'Hızlı Not mevcut merkezi quick-note akışını korumalı.');
console.log('Dashboard hızlı işlem doğrudan rota sözleşmesi başarılı.');