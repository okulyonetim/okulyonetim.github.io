# İsteğe bağlı davranış testi (Playwright gerekir): python3 scripts/design-lab-check.py
# Geri tuşu / Esc / modülün kendi kapatması: yığın ve geçmiş tutarlı mı?
from playwright.sync_api import sync_playwright
import pathlib
URL=pathlib.Path('design-lab.html').resolve().as_uri()
OPEN="()=>{const d=document.createElement('div');d.className='ka-modal-backdrop';d.innerHTML='<div class=\"ka-modal\"><button class=\"ka-btn\" data-self>Kapat</button></div>';d.querySelector('[data-self]').onclick=()=>d.remove();document.body.appendChild(d)}"
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page();pg.goto(URL);pg.wait_for_timeout(400);ok=True
    def chk(name,cond):
        global ok;ok&=bool(cond);print(('✓ ' if cond else '✗ ')+name)
    d=lambda:pg.evaluate('KorukNav.depth()');n=lambda:pg.evaluate("document.querySelectorAll('.ka-modal-backdrop').length")
    pg.evaluate(OPEN);pg.wait_for_timeout(100);chk('pencere açılınca yığın=1',d()==1)
    pg.go_back();pg.wait_for_timeout(200);chk('geri tuşu pencereyi kapatır, sayfada kalır',n()==0 and d()==0 and pg.url==URL)
    pg.evaluate(OPEN);pg.evaluate(OPEN);pg.wait_for_timeout(100);chk('iki pencere: yığın=2',d()==2)
    pg.keyboard.press('Escape');pg.wait_for_timeout(200);chk('Esc yalnız en üsttekini kapatır',n()==1 and d()==1)
    pg.go_back();pg.wait_for_timeout(200);chk('geri: kalan pencere de kapanır',n()==0 and d()==0)
    pg.evaluate(OPEN);pg.wait_for_timeout(100);pg.click('[data-self]');pg.wait_for_timeout(250)
    chk('modül kendi kapatınca yığın temiz',d()==0 and n()==0 and pg.url==URL)
    pg.evaluate(OPEN);pg.wait_for_timeout(100);pg.go_back();pg.wait_for_timeout(200);chk('kendi kapatma sonrası geri tuşu hâlâ doğru çalışır',n()==0 and d()==0 and pg.url==URL)
    b.close();print('SONUÇ:','TAMAM' if ok else 'HATA');raise SystemExit(0 if ok else 1)
