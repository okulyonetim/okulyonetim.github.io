from pathlib import Path
p=Path('js/modules/transport.js')
s=p.read_text(encoding='utf-8')
old='\n(s={}){return `<div class="ka-modal-backdrop" data-service-modal>'
new='\nfunction serviceModal(s={}){return `<div class="ka-modal-backdrop" data-service-modal>'
assert s.count(old)==1, s.count(old)
p.write_text(s.replace(old,new,1),encoding='utf-8')
