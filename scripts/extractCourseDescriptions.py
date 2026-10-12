#!/usr/bin/env python3
"""แปลง PDF คำอธิบายรายวิชาใน src/data/courseDescriptions/<หลักสูตร>/ เป็น <หลักสูตร>.json
ใช้: python3 -I scripts/extractCourseDescriptions.py skr2567"""
import json, re, subprocess, sys, unicodedata
from pathlib import Path

root = Path(__file__).resolve().parent.parent / "src/data/courseDescriptions"
cur = sys.argv[1]
LEVELS = {"มัธยมศึกษาตอนต้น": "JUNIOR_HIGH", "มัธยมศึกษาตอนปลาย": "SENIOR_HIGH", "ประถมศึกษา": "PRIMARY"}
clean = lambda s: re.sub(r"\s+", " ", unicodedata.normalize("NFC", s)).strip()

def norm_head(s):  # บางไฟล์ฟอนต์ให้ "ำ" แทน "า" ในส่วนหัว
    return s.replace("ํา", "ำ").replace("ำ", "า")

best = {}
problems = []
for pdf in sorted((root / cur).rglob("*.pdf")):
    if "หนังสือเรียน" in pdf.name:  # ไม่ใช่คำอธิบายรายวิชา
        continue
    txt = subprocess.run(["pdftotext", "-layout", str(pdf), "-"], capture_output=True, text=True).stdout
    txt = re.sub("[\uf700-\uf7ff]", "", txt)  # สัญลักษณ์วรรณยุกต์ของฟอนต์บางไฟล์
    txt = txt.replace("ํา", "ำ")
    top = norm_head(txt[:800])
    m = re.search(r"(?:คา)?อธิบายรายวิชา\s*(?:รหัสรายวิชา\s*)?([ก-ฮ]{1,3}\d{6})\s*(?:รายวิชา\s*)?([^\n]+)", top)
    if not m:
        problems.append(f"{pdf.name}: ไม่พบหัวเรื่อง"); continue
    code = m.group(1)
    # ชื่อวิชาใช้ตามที่พิมพ์ในหัวเรื่องเดิม (ไม่แก้ ำ→า)
    name = clean(re.sub(r"\.pdf$|\(converted\)|\(\d+\)", "", pdf.name.split(code, 1)[-1]).strip(" -"))
    credits = re.search(r"จำนวน\s+(\d+(?:\.\d+)?)\s+หน[่]?วยกิต", txt)
    head_zone = txt[:800]
    levels = [v for k, v in LEVELS.items() if k in norm_head(head_zone).replace("ำ", "า") or k in head_zone]
    # เนื้อหา = ต่อจากบรรทัด "ระดับ..." (หรือบรรทัดหน[่]?วยกิต) ถึงหัวข้อการจัดประสบการณ์/การวัดผล
    start = re.search(r"หน[่]?วยกิต[^\n]*\n(?:[^\n]*ระดับ[^\n]*\n)?", txt)
    rest = txt[start.end():] if start else ""
    end = re.search(r"\n\s*(?:การจัดประสบการณ์|การวัดและประเมินผล)", rest)
    body = clean(rest[: end.start()] if end else rest)
    if len(body) < 40:
        problems.append(f"{pdf.name}: คำอธิบายสั้นผิดปกติ ({len(body)})")
    rec = {"code": code, "name": name, "credits": float(credits.group(1)) if credits else None,
           "levels": levels, "description": body, "source": str(pdf.relative_to(root))}
    if code not in best or len(body) > len(best[code]["description"]):
        best[code] = rec
out = sorted(best.values(), key=lambda r: r["code"])
(root / f"{cur}.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
print(len(out), "รายวิชา (ไม่ซ้ำรหัส)"); print(*problems, sep="\n")
