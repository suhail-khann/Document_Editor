import re
from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "PROJECT_GUIDE.md"
OUTPUT = ROOT / "PROJECT_GUIDE.pdf"


def inline_markup(text):
    escaped = escape(text)
    escaped = re.sub(r"`([^`]+)`", r'<font name="Courier">\1</font>', escaped)
    escaped = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", escaped)
    return escaped


def build_story(markdown, styles):
    story = []
    lines = markdown.splitlines()
    index = 0

    while index < len(lines):
        line = lines[index]
        if not line.strip():
            index += 1
            continue
        if line.startswith("```"):
            index += 1
            code = []
            while index < len(lines) and not lines[index].startswith("```"):
                code.append(lines[index])
                index += 1
            story.append(Preformatted("\n".join(code), styles["CodeBlock"]))
            story.append(Spacer(1, 5))
            index += 1
            continue
        if line.startswith("# "):
            story.append(Paragraph(inline_markup(line[2:]), styles["GuideTitle"]))
            story.append(Spacer(1, 7))
            index += 1
            continue
        if line.startswith("## "):
            story.append(Paragraph(inline_markup(line[3:]), styles["GuideHeading2"]))
            index += 1
            continue
        if line.startswith("### "):
            story.append(Paragraph(inline_markup(line[4:]), styles["GuideHeading3"]))
            index += 1
            continue
        if line.startswith("- "):
            items = []
            while index < len(lines) and lines[index].startswith("- "):
                items.append(ListItem(
                    Paragraph(inline_markup(lines[index][2:]), styles["GuideBody"]),
                    leftIndent=9,
                    bulletColor=colors.HexColor("#52715f"),
                ))
                index += 1
            story.append(ListFlowable(items, bulletType="bullet", leftIndent=15, bulletFontSize=6))
            story.append(Spacer(1, 4))
            continue
        if re.match(r"^\d+\. ", line):
            items = []
            while index < len(lines) and re.match(r"^\d+\. ", lines[index]):
                text = re.sub(r"^\d+\. ", "", lines[index])
                items.append(ListItem(Paragraph(inline_markup(text), styles["GuideBody"]), leftIndent=10))
                index += 1
            story.append(ListFlowable(items, bulletType="1", leftIndent=19, bulletFontSize=8))
            story.append(Spacer(1, 4))
            continue

        paragraph = [line.strip()]
        index += 1
        while index < len(lines) and lines[index].strip() and not lines[index].startswith(("#", "-", "```")) and not re.match(r"^\d+\. ", lines[index]):
            paragraph.append(lines[index].strip())
            index += 1
        story.append(Paragraph(inline_markup(" ".join(paragraph)), styles["GuideBody"]))
        story.append(Spacer(1, 5))

    return story


def add_page_chrome(canvas, document):
    canvas.saveState()
    width, height = A4
    canvas.setStrokeColor(colors.HexColor("#e9e7e0"))
    canvas.line(18 * mm, 15 * mm, width - 18 * mm, 15 * mm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#77766f"))
    canvas.drawString(18 * mm, 10 * mm, "Ajaia Docs | Project guide")
    canvas.drawRightString(width - 18 * mm, 10 * mm, f"Page {document.page}")
    canvas.restoreState()


def main():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="GuideTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=25,
        leading=30,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#40594d"),
        spaceAfter=12,
    ))
    styles.add(ParagraphStyle(
        name="GuideHeading2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=19,
        textColor=colors.HexColor("#40594d"),
        spaceBefore=11,
        spaceAfter=6,
        keepWithNext=True,
    ))
    styles.add(ParagraphStyle(
        name="GuideHeading3",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#9a553e"),
        spaceBefore=7,
        spaceAfter=4,
        keepWithNext=True,
    ))
    styles.add(ParagraphStyle(
        name="GuideBody",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.2,
        leading=13.2,
        textColor=colors.HexColor("#3f403b"),
        splitLongWords=True,
    ))
    styles.add(ParagraphStyle(
        name="CodeBlock",
        fontName="Courier",
        fontSize=8,
        leading=11,
        leftIndent=8,
        rightIndent=8,
        borderColor=colors.HexColor("#e9e7e0"),
        borderWidth=0.5,
        borderPadding=7,
        backColor=colors.HexColor("#f7f6f2"),
        textColor=colors.HexColor("#40594d"),
        spaceBefore=4,
        spaceAfter=7,
    ))

    document = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=19 * mm,
        leftMargin=19 * mm,
        topMargin=18 * mm,
        bottomMargin=21 * mm,
        title="Ajaia Docs - Project Purpose and Implementation Guide",
        author="Ajaia Docs project",
    )
    markdown = SOURCE.read_text(encoding="utf-8")
    document.build(
        build_story(markdown, styles),
        onFirstPage=add_page_chrome,
        onLaterPages=add_page_chrome,
    )
    print(f"Generated {OUTPUT}")


if __name__ == "__main__":
    main()
