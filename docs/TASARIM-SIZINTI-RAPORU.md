# Tasarım Sızıntı Raporu

Oluşturan: scripts/audit-design-leaks.mjs

**Özet:** 64 dosyada toplam 138 sabit renk kodu, 17 modül içi <style> bloğu, 48 renkli satır içi stil, 5 kendi sabit-konum (pencere/panel) tanımı. Sızıntısı belirgin dosya: 11.

| Dosya | Sabit renk | <style> | Satır içi renk | position:fixed | Skor |
|---|---:|---:|---:|---:|---:|
| core/shell-ui.js | 28 | 0 | 4 | 1 | 39 |
| core/schedule-report-redesign.js | 28 | 1 | 0 | 0 | 36 |
| modules/report-engine.js | 13 | 1 | 1 | 2 | 29 |
| modules/school-age-calculator.js | 11 | 0 | 8 | 0 | 27 |
| modules/management.js | 7 | 2 | 1 | 0 | 25 |
| modules/food-menu.js | 0 | 3 | 0 | 0 | 24 |
| modules/transport.js | 0 | 3 | 0 | 0 | 24 |
| modules/pdf-scanner-editor.js | 18 | 0 | 0 | 1 | 21 |
| core/schedule-report-column-zebra.js | 0 | 2 | 0 | 0 | 16 |
| modules/rubric-settings-core.js | 0 | 0 | 6 | 0 | 12 |
| modules/tools.js | 9 | 0 | 1 | 0 | 11 |
| modules/communication.js | 10 | 0 | 0 | 0 | 10 |
| modules/reports.js | 2 | 1 | 0 | 0 | 10 |
| modules/teacher-list-core.js | 0 | 0 | 5 | 0 | 10 |
| core/report-customizer.js | 7 | 0 | 0 | 1 | 10 |
| modules/classic-personnel-parity.js | 1 | 0 | 4 | 0 | 9 |
| modules/academic.js | 0 | 1 | 0 | 0 | 8 |
| modules/people-classic-ui.js | 0 | 0 | 4 | 0 | 8 |
| modules/personnel-documents.js | 0 | 1 | 0 | 0 | 8 |
| modules/rubric-tools-engine.js | 0 | 1 | 0 | 0 | 8 |
| modules/settings.js | 2 | 0 | 3 | 0 | 8 |
| core/report-output.js | 0 | 1 | 0 | 0 | 8 |
| modules/student-list-page.js | 0 | 0 | 3 | 0 | 6 |
| modules/documents.js | 0 | 0 | 2 | 0 | 4 |
| modules/rubric-tools.js | 0 | 0 | 2 | 0 | 4 |
| modules/belirli-gunler-catalog.js | 0 | 0 | 1 | 0 | 2 |
| modules/class-seating.js | 0 | 0 | 1 | 0 | 2 |
| modules/document-viewer.js | 0 | 0 | 1 | 0 | 2 |
| modules/people-import.js | 2 | 0 | 0 | 0 | 2 |
| core/role-permission-editor.js | 0 | 0 | 1 | 0 | 2 |

Skor = sabit renk + 8×<style> + 2×satır içi renk + 3×position:fixed. Hedef: tüm dosyalarda 0 (rapor çıktı şablonları hariç, Aşama R'de merkezileşir).
