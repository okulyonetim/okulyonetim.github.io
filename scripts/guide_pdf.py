#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Koruk Asistan kullanım kılavuzunu tek kaynaklı rehber verisinden A4 PDF'ye dönüştürür.

Girdi:
  js/modules/guide-data.js
  assets/guide/*.webp (uygulamanın kendisinden, kurgusal örnek veriyle alınan ekranlar)
Çıktı:
  assets/guide/Koruk_Asistan_Kullanim_Kilavuzu.pdf

Gerekli paketler: reportlab, Pillow. Node.js, guide-data.js içindeki veri nesnesini güvenli
şekilde okumak için kullanılır. Bu betik uygulamayı veya Firebase'i başlatmaz.
"""
from __future__ import annotations

import datetime
import html
import json
import os
import re
import subprocess
import tempfile
from pathlib import Path

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, Image, PageBreak, PageTemplate, Paragraph, Spacer,
    Table, TableStyle, KeepTogether, HRFlowable,
)
from reportlab.platypus.tableofcontents import TableOfContents

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "js" / "modules" / "guide-data.js"
IMAGE_DIR = ROOT / "assets" / "guide"
OUTPUT = IMAGE_DIR / "Koruk_Asistan_Kullanim_Kilavuzu.pdf"
PAGE_W, PAGE_H = A4
LEFT = RIGHT = 1.35 * cm
TOP = 1.65 * cm
BOTTOM = 1.45 * cm
CONTENT_W = PAGE_W - LEFT - RIGHT


def load_guide_data() -> dict:
    """JS veri dosyasını çalıştırmadan, Node vm içinde izole bir bağlamda değerlendirir."""
    if not DATA_FILE.exists():
        raise FileNotFoundError(f"Kılavuz verisi bulunamadı: {DATA_FILE}")
    js = r"""
const fs=require('fs'),vm=require('vm');
const w={}; w.window=w;
vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),w,{timeout:5000});
if(!w.KorukGuideData) throw new Error('KorukGuideData oluşturulamadı');
process.stdout.write(JSON.stringify(w.KorukGuideData));
"""
    raw = subprocess.check_output(
        ["node", "-e", js, str(DATA_FILE)], cwd=str(ROOT), text=True, timeout=10
    )
    data = json.loads(raw)
    if not isinstance(data.get("konular"), list) or not data["konular"]:
        raise ValueError("Kılavuzda konu bulunamadı.")
    return data


def register_turkish_fonts() -> str:
    """Türkçe karakterleri destekleyen DejaVu Sans ailesini kaydeder."""
    candidates = [
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ]
    if not all(p.exists() for p in candidates):
        raise FileNotFoundError(
            "Türkçe karakter destekli DejaVu Sans bulunamadı. "
            "Linux ortamında fonts-dejavu-core paketini kurun."
        )
    pdfmetrics.registerFont(TTFont("KorukSans", str(candidates[0])))
    pdfmetrics.registerFont(TTFont("KorukSans-Bold", str(candidates[1])))
    italic = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf")
    bold_italic = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf")
    if italic.exists():
        pdfmetrics.registerFont(TTFont("KorukSans-Italic", str(italic)))
    if bold_italic.exists():
        pdfmetrics.registerFont(TTFont("KorukSans-BoldItalic", str(bold_italic)))
    pdfmetrics.registerFontFamily(
        "KorukSans",
        normal="KorukSans",
        bold="KorukSans-Bold",
        italic="KorukSans-Italic" if italic.exists() else "KorukSans",
        boldItalic="KorukSans-BoldItalic" if bold_italic.exists() else "KorukSans-Bold",
    )
    return "KorukSans"


def para_text(value) -> str:
    """Güvenli HTML-escape ve kılavuz metinlerindeki **kalın** yazımı."""
    raw = str(value or "")
    parts = re.split(r"\*\*(.+?)\*\*", raw, flags=re.S)
    out = []
    for i, part in enumerate(parts):
        escaped = html.escape(part, quote=False).replace("\n", "<br/>")
        out.append(f"<b>{escaped}</b>" if i % 2 else escaped)
    return "".join(out)


def make_styles(font: str) -> dict:
    styles = getSampleStyleSheet()
    return {
        "cover": ParagraphStyle(
            "KorukCover", parent=styles["Title"], fontName=font + "-Bold",
            fontSize=27, leading=34, alignment=TA_CENTER, textColor=colors.HexColor("#242424"),
            spaceAfter=12,
        ),
        "subtitle": ParagraphStyle(
            "KorukSubtitle", parent=styles["Normal"], fontName=font,
            fontSize=12, leading=18, alignment=TA_CENTER, textColor=colors.HexColor("#555555"),
        ),
        "h1": ParagraphStyle(
            "GuideH1", parent=styles["Heading1"], fontName=font + "-Bold",
            fontSize=18, leading=23, spaceBefore=3, spaceAfter=9,
            textColor=colors.HexColor("#242424"), keepWithNext=True,
        ),
        "h2": ParagraphStyle(
            "GuideH2", parent=styles["Heading2"], fontName=font + "-Bold",
            fontSize=12.5, leading=16, spaceBefore=9, spaceAfter=5,
            textColor=colors.HexColor("#353535"), keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "GuideBody", parent=styles["BodyText"], fontName=font,
            fontSize=9.2, leading=13.3, spaceAfter=5, textColor=colors.HexColor("#292929"),
        ),
        "small": ParagraphStyle(
            "GuideSmall", parent=styles["BodyText"], fontName=font,
            fontSize=7.7, leading=10.5, spaceAfter=3, textColor=colors.HexColor("#4C4C4C"),
        ),
        "legend": ParagraphStyle(
            "GuideLegend", parent=styles["BodyText"], fontName=font,
            fontSize=8.3, leading=11.4, spaceAfter=7, textColor=colors.HexColor("#292929"),
        ),
        "toc": ParagraphStyle(
            "GuideTOC", parent=styles["Normal"], fontName=font,
            fontSize=10, leading=15, leftIndent=10, firstLineIndent=-10,
            spaceBefore=2, textColor=colors.HexColor("#292929"),
        ),
        "caption": ParagraphStyle(
            "GuideCaption", parent=styles["Normal"], fontName=font,
            fontSize=8, leading=11, alignment=TA_CENTER, textColor=colors.HexColor("#555555"),
        ),
    }


class GuideDocTemplate(BaseDocTemplate):
    def __init__(self, filename, styles):
        super().__init__(
            filename, pagesize=A4, leftMargin=LEFT, rightMargin=RIGHT,
            topMargin=TOP, bottomMargin=BOTTOM, title="Koruk Asistan Kullanım Kılavuzu",
            author="Koruk Asistan — Koruk İlk-Ortaokulu",
            subject="Gerçek uygulama ekranlarıyla adım adım kullanım kılavuzu",
        )
        self.guide_styles = styles
        frame = Frame(
            LEFT, BOTTOM, CONTENT_W, PAGE_H - TOP - BOTTOM,
            id="guide-frame", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
        )
        self.addPageTemplates([PageTemplate(id="guide", frames=[frame], onPage=self._draw_page)])

    def _draw_page(self, canvas, doc):
        canvas.saveState()
        if doc.page > 1:
            canvas.setStrokeColor(colors.HexColor("#D8D8D8"))
            canvas.setLineWidth(0.45)
            canvas.line(LEFT, PAGE_H - 1.08 * cm, PAGE_W - RIGHT, PAGE_H - 1.08 * cm)
            canvas.setFont("KorukSans", 7.5)
            canvas.setFillColor(colors.HexColor("#666666"))
            canvas.drawString(LEFT, PAGE_H - 0.82 * cm, "KORUK ASİSTAN  ·  KULLANIM KILAVUZU")
            canvas.line(LEFT, 0.98 * cm, PAGE_W - RIGHT, 0.98 * cm)
            canvas.drawString(LEFT, 0.62 * cm, "Koruk İlk-Ortaokulu")
            canvas.drawRightString(PAGE_W - RIGHT, 0.62 * cm, f"Sayfa {doc.page}")
        canvas.restoreState()

    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph) and flowable.style.name == "GuideH1":
            self.notify("TOCEntry", (0, flowable.getPlainText(), self.page))


def load_image_png(source: Path, temp_dir: Path, index: int) -> Path:
    if not source.exists():
        raise FileNotFoundError(f"Ekran görüntüsü eksik: {source.relative_to(ROOT)}")
    target = temp_dir / f"guide-screen-{index:03d}.jpg"
    with PILImage.open(source) as im:
        # JPEG 90 + 4:4:4 renk örneklemesi ekran yazılarının okunabilirliğini korurken PDF boyutunu düşürür.
        im.convert("RGB").save(target, "JPEG", quality=90, optimize=True, progressive=True, subsampling=0)
    return target


def scaled_image(path: Path, max_width=7.0 * cm, max_height=15.0 * cm):
    with PILImage.open(path) as im:
        iw, ih = im.size
    scale = min(max_width / iw, max_height / ih, 1.0)
    return Image(str(path), width=iw * scale, height=ih * scale, hAlign="CENTER")


def draw_screen(screen: dict, topic: dict, temp_dir: Path, counter: int, styles: dict):
    filename = screen.get("dosya", "")
    png_path = load_image_png(IMAGE_DIR / filename, temp_dir, counter)
    image = scaled_image(png_path)
    legend = []
    for mark in screen.get("isaretler", []):
        title = html.escape(str(mark.get("baslik", "")), quote=False)
        description = para_text(mark.get("aciklama", ""))
        legend.append(Paragraph(f"<b>{int(mark.get('n', 0))}. {title}</b><br/>{description}", styles["legend"]))
    if not legend:
        legend = [Paragraph("Bu ekran için ayrıca numaralı işaret tanımlanmamış.", styles["legend"])]
    right = [Paragraph(para_text(screen.get("alt") or screen.get("baslik") or ""), styles["caption"]), Spacer(1, 5)] + legend
    table = Table([[image, right]], colWidths=[7.25 * cm, CONTENT_W - 7.25 * cm], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#D8D8D8")),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FAFAF8")),
    ]))
    return [
        PageBreak(),
        Paragraph(para_text(screen.get("baslik") or "Ekran tanıtımı"), styles["h2"]),
        Paragraph(f"<font color='#666666'>{html.escape(topic.get('baslik',''))}</font>", styles["small"]),
        Spacer(1, 4),
        table,
    ]


def build_pdf(root: str | Path | None = None) -> Path:
    global ROOT, DATA_FILE, IMAGE_DIR, OUTPUT
    if root is not None:
        ROOT = Path(root).resolve()
        DATA_FILE = ROOT / "js" / "modules" / "guide-data.js"
        IMAGE_DIR = ROOT / "assets" / "guide"
        OUTPUT = IMAGE_DIR / "Koruk_Asistan_Kullanim_Kilavuzu.pdf"
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    data = load_guide_data()
    font = register_turkish_fonts()
    styles = make_styles(font)
    story = []

    logo = ROOT / "assets" / "icon-192.png"
    if logo.exists():
        story.extend([Spacer(1, 2.1 * cm), Image(str(logo), width=3.1 * cm, height=3.1 * cm, hAlign="CENTER"), Spacer(1, 1.0 * cm)])
    else:
        story.append(Spacer(1, 4.0 * cm))
    story.extend([
        Paragraph("KORUK ASİSTAN", styles["cover"]),
        Paragraph("Ekran Görüntülü Kullanım Kılavuzu", styles["subtitle"]),
        Spacer(1, 0.35 * cm),
        HRFlowable(width="48%", thickness=2, color=colors.HexColor("#FFC400"), hAlign="CENTER"),
        Spacer(1, 0.8 * cm),
        Paragraph("Koruk İlk-Ortaokulu", styles["subtitle"]),
        Spacer(1, 0.25 * cm),
        Paragraph("Gerçek uygulama ekranları ve numaralı açıklamalarla adım adım kullanım rehberi", styles["subtitle"]),
        Spacer(1, 0.7 * cm),
        Paragraph("Bu kılavuzdaki örnek kayıt adları ve iletişim bilgileri kurgusaldır. Gerçek öğrenci veya personel verisi kullanılmamıştır.", styles["small"]),
        Spacer(1, 1.2 * cm),
        Paragraph(datetime.date.today().strftime("%d.%m.%Y"), styles["subtitle"]),
        PageBreak(),
        Paragraph("İçindekiler", styles["h1"]),
    ])
    toc = TableOfContents()
    toc.levelStyles = [styles["toc"]]
    toc.dotsMinLevel = 0
    story.extend([toc, PageBreak()])

    screen_count = 0
    with tempfile.TemporaryDirectory(prefix="koruk-guide-pdf-") as tmp:
        tmp_path = Path(tmp)
        for index, topic in enumerate(data["konular"], 1):
            if index > 1:
                story.append(PageBreak())
            story.append(Paragraph(f"{index}. {para_text(topic.get('baslik') or 'Rehber')}", styles["h1"]))
            cat_id = topic.get("kategori")
            category = next((c.get("ad") for c in data.get("kategoriler", []) if c.get("id") == cat_id), "")
            if category:
                story.append(Paragraph(para_text(category), styles["small"]))
            story.append(Spacer(1, 3))
            if topic.get("ne"):
                story.append(Paragraph("<b>Bu bölüm ne işe yarar?</b><br/>" + para_text(topic["ne"]), styles["body"]))
            path_items = topic.get("yol") or []
            if path_items:
                story.append(Paragraph("<b>Nasıl açılır?</b>  " + " › ".join(html.escape(str(x)) for x in path_items), styles["body"]))
            if topic.get("yolNot"):
                story.append(Paragraph(para_text(topic["yolNot"]), styles["small"]))
            if topic.get("adimlar"):
                story.append(Paragraph("İşlem adımları", styles["h2"]))
                for step_no, step in enumerate(topic["adimlar"], 1):
                    title = html.escape(str(step.get("baslik") or f"Adım {step_no}"), quote=False)
                    text = para_text(step.get("metin", ""))
                    ref = ""
                    if step.get("ekran"):
                        ref = f" <font color='#666666'>(Görsel: {html.escape(str(step['ekran']))}{', işaret '+str(step['isaret']) if step.get('isaret') else ''})</font>"
                    story.append(Paragraph(f"<b>{step_no}. {title}</b><br/>{text}{ref}", styles["body"]))
            if topic.get("kayit"):
                story.append(Paragraph("Kaydetme ve sonuç", styles["h2"]))
                story.append(Paragraph(para_text(topic["kayit"]), styles["body"]))
            if topic.get("uyarilar"):
                story.append(Paragraph("Dikkat edilmesi gerekenler", styles["h2"]))
                for warning in topic["uyarilar"]:
                    story.append(Paragraph("• " + para_text(warning), styles["body"]))
            if topic.get("sorunlar"):
                story.append(Paragraph("Sık karşılaşılan sorunlar", styles["h2"]))
                for issue in topic["sorunlar"]:
                    story.append(Paragraph("<b>" + para_text(issue.get("s", "")) + "</b><br/>" + para_text(issue.get("c", "")), styles["body"]))
            if topic.get("ekranlar"):
                story.append(Paragraph("Ekran görüntüleri ve numaralı açıklamalar", styles["h2"]))
                for screen in topic["ekranlar"]:
                    screen_count += 1
                    story.extend(draw_screen(screen, topic, tmp_path, screen_count, styles))
            related = topic.get("iliskili") or []
            if related:
                related_names = [t.get("baslik") for t in data["konular"] if t.get("id") in related]
                if related_names:
                    story.append(Paragraph("<b>İlgili rehberler:</b> " + " · ".join(html.escape(x) for x in related_names), styles["small"]))

        for title, key in (("Sık sorulan sorular", "sss"), ("Sorun giderme özeti", "sorunlar")):
            story.extend([PageBreak(), Paragraph(title, styles["h1"])])
            for item in data.get(key, []):
                story.append(Paragraph("<b>" + para_text(item.get("s", "")) + "</b><br/>" + para_text(item.get("c", "")), styles["body"]))

        links = data.get("baglantilar", {})
        story.extend([PageBreak(), Paragraph("Bağlantılar", styles["h1"])])
        for label, url in (
            ("Web uygulaması", links.get("web", "")),
            ("Android APK (en güncel yayın)", links.get("apk", "")),
            ("Optik Okuyucu APK", (links.get("optik") or {}).get("apk", "")),
            ("Yayınlanan değişiklikler", links.get("degisiklikler", "")),
        ):
            if url:
                safe_url = html.escape(str(url), quote=True)
                story.append(Paragraph(f'<b>{html.escape(label)}:</b> <link href="{safe_url}" color="#444444">{safe_url}</link>', styles["body"]))
        story.append(Spacer(1, 8))
        story.append(Paragraph(para_text(data.get("surumNotKaynagi", "")), styles["small"]))

        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        doc = GuideDocTemplate(str(OUTPUT), styles)
        doc.multiBuild(story)

    print(f"PDF oluşturuldu: {OUTPUT.relative_to(ROOT)}")
    print(f"Rehber sayısı: {len(data['konular'])}; ekran görüntüsü: {screen_count}; boyut: {OUTPUT.stat().st_size} bayt")
    return OUTPUT


if __name__ == "__main__":
    build_pdf()
