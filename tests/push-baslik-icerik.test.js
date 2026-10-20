const test = require('node:test'), assert = require('node:assert'), fs = require('fs');
test('web push, sunucunun gönderdiği baslik/icerik alanlarını gösterir', () => {
  const sw = fs.readFileSync('service-worker.js', 'utf8');
  assert.match(sw, /n\.baslik\|\|d\.baslik/);
  assert.match(sw, /n\.icerik\|\|d\.icerik/);
});
