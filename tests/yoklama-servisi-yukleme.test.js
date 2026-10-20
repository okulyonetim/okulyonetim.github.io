const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const src = fs.readFileSync('js/modules/tools.js', 'utf8');

test('Öğrenci Yoklama kaydı, Kadrolar açılmadan da YoklamaService (people.js) yüklenerek çalışır', () => {
  assert.match(src, /async function ensureYoklamaService\(\)/);
  assert.match(src, /loadScript\?\.\('js\/modules\/people\.js'\)/);
  assert.match(src, /if\(!\(await ensureYoklamaService\(\)\)\)throw new Error\('yoklama-servisi-yok'\)/);
  assert.match(src, /async function accessibleAttendanceClasses\(\)\{await ensureYoklamaService\(\)/);
});
