from pathlib import Path
p=Path('js/raporlama.js'); s=p.read_text(encoding='utf-8')
def rep(a,b,label):
    global s
    c=s.count(a)
    if c!=1: raise SystemExit(f'{label}: expected 1 match, got {c}')
    s=s.replace(a,b,1)
rep("    #icerik-sarici { transform-origin: top center; transition: transform 0.15s ease; }","    .rapor-viewport { overflow:auto; max-width:100%; min-height:0; overscroll-behavior:contain; }\n    #rapor-scene { position:relative; margin:0; }\n    #icerik-sarici { transform-origin: top left; transition: transform 0.15s ease; }",'preview css')
rep("      #icerik-sarici { transform: none !important; }","      .rapor-viewport { overflow:visible !important; }\n      #rapor-scene { width:auto !important; height:auto !important; }\n      #icerik-sarici { transform: none !important; }",'print reset css')
rep("      <button onclick=\"zoomSifirla()\" title=\"Sıfırla\" style=\"font-size:12px;color:#6b7280;\">↺</button>","      <button onclick=\"zoomSigdir()\" title=\"Genişliğe sığdır\" style=\"font-size:11px;color:#374151;\">Sığdır</button>\n      <button onclick=\"zoomSifirla()\" title=\"%100\" style=\"font-size:12px;color:#6b7280;\">100%</button>",'zoom buttons')
old="""    var _zoom = 80;
    function zoomUygula() {
      var el = document.getElementById('icerik-sarici');
      if (el) el.style.transform = 'scale(' + (_zoom/100) + ')';
      document.getElementById('zoomLabel').textContent = _zoom + '%';
    }
    function zoomAyarla(delta) {
      _zoom = Math.min(200, Math.max(30, _zoom + delta));
      zoomUygula();
    }
    function zoomSifirla() { _zoom = 80; zoomUygula(); }
    zoomUygula(); // İlk açılışta da uygulansın (öncesinde sadece +/-/sıfırla tıklanınca çalışıyordu)
"""
new="""    var _zoom = 100;
    function zoomUygula() {
      var el = document.getElementById('icerik-sarici');
      var scene = document.getElementById('rapor-scene');
      if (!el || !scene) return;
      var w = Math.max(1, Number(el.dataset.naturalWidth) || el.scrollWidth || el.offsetWidth || 1);
      var h = Math.max(1, Number(el.dataset.naturalHeight) || el.scrollHeight || el.offsetHeight || 1);
      el.dataset.naturalWidth = String(w);
      el.dataset.naturalHeight = String(h);
      var scale = _zoom / 100;
      el.style.transform = 'scale(' + scale + ')';
      scene.style.width = Math.ceil(w * scale) + 'px';
      scene.style.height = Math.ceil(h * scale) + 'px';
      document.getElementById('zoomLabel').textContent = _zoom + '%';
    }
    function zoomAyarla(delta) {
      _zoom = Math.min(200, Math.max(20, _zoom + delta));
      zoomUygula();
    }
    function zoomSifirla() { _zoom = 100; zoomUygula(); }
    function zoomSigdir() {
      var vp = document.getElementById('rapor-viewport');
      var el = document.getElementById('icerik-sarici');
      if (!vp || !el) return;
      el.style.transform = 'none';
      var w = Math.max(1, el.scrollWidth || el.offsetWidth || 1);
      var h = Math.max(1, el.scrollHeight || el.offsetHeight || 1);
      el.dataset.naturalWidth = String(w);
      el.dataset.naturalHeight = String(h);
      _zoom = Math.max(20, Math.min(100, Math.floor(((vp.clientWidth - 8) / w) * 100)));
      zoomUygula();
      vp.scrollTo({ left:0, top:0, behavior:'auto' });
    }
    requestAnimationFrame(function(){ requestAnimationFrame(zoomSigdir); });
"""
rep(old,new,'zoom script')
rep("  <div id=\"icerik-sarici\">","  <div class=\"rapor-viewport\" id=\"rapor-viewport\"><div id=\"rapor-scene\"><div id=\"icerik-sarici\">",'preview wrapper open')
rep("  ${htmlIcerik}\n  </div>\n</body>","  ${htmlIcerik}\n  </div></div></div>\n</body>",'preview wrapper close')
p.write_text(s,encoding='utf-8')

t=Path('tests/report-native-print-routing-smoke.test.js'); ts=t.read_text(encoding='utf-8'); marker="console.log('Rapor native yazdırma yönlendirme smoke testleri başarılı.');"; extra="""
assert(raporlama.includes('id=\"rapor-viewport\"'), 'Web/PWA rapor önizlemesi ayrı viewport kullanmalı.');
assert(raporlama.includes('function zoomSigdir()'), 'Rapor önizlemesinde genişliğe sığdır bulunmalı.');
assert(raporlama.includes("scene.style.width = Math.ceil(w * scale) + 'px'"), 'Rapor zoom sahnesinin fiziksel genişliği ölçekle eşleşmeli.');
assert(raporlama.includes("#icerik-sarici { transform-origin: top left"), 'Rapor zoom yalnız içerik alanında uygulanmalı.');
assert(raporlama.includes('.rapor-viewport { overflow:visible !important; }'), 'Yazdırmada önizleme viewport kısıtı kaldırılmalı.');
"""
if extra.strip() not in ts: ts=ts.replace(marker,extra+'\n'+marker)
t.write_text(ts,encoding='utf-8')
