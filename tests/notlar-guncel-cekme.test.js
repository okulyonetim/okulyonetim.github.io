const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const src = fs.readFileSync('js/modules/communication.js', 'utf8');

test('Notlar sayfası açılınca ve uygulama öne gelince yalnız notlar eşitlenir (günlük TTL beklenmez)', () => {
  assert.match(src, /function refreshNotes/);
  assert.match(src, /SyncEngine\.sync\(\['notlar'\],\{force:true,full:true\}\)/);
  assert.match(src, /if\(page==='notes'\)refreshNotes\(\)/);
  assert.match(src, /visibilitychange/);
  assert.match(src, /45000/);
  assert.match(src, /removeEventListener\('visibilitychange',notesVisHandler\)/);
});
