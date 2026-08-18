from pathlib import Path

# Web/PWA: uygulama geneli pinch/double-tap zoomu kapat.
p = Path('index.html')
s = p.read_text(encoding='utf-8')
old = '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">'
new = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">'
if old not in s:
    raise SystemExit('viewport etiketi beklenen biçimde bulunamadı')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# Android native WebView: sistem zoomunu ayrıca kapat.
p = Path('android/app/src/main/java/com/koruk/okul/MainActivity.java')
s = p.read_text(encoding='utf-8')
old = '''        super.onCreate(savedInstanceState);\n        handleIntent(getIntent());'''
new = '''        super.onCreate(savedInstanceState);\n\n        // Uygulama genelinde WebView pinch/double-tap zoomunu kapat.\n        // Belge/Yıllık Plan gibi ekranların kendi CSS transform zoomları bundan etkilenmez.\n        WebView anaWebView = getBridge() != null ? getBridge().getWebView() : null;\n        if (anaWebView != null) {\n            anaWebView.getSettings().setSupportZoom(false);\n            anaWebView.getSettings().setBuiltInZoomControls(false);\n            anaWebView.getSettings().setDisplayZoomControls(false);\n        }\n\n        handleIntent(getIntent());'''
if old not in s:
    raise SystemExit('MainActivity onCreate hedefi bulunamadı')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')
