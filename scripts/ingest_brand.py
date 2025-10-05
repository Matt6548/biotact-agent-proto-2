# -*- coding: utf-8 -*-
import re, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC  = ROOT / "data" / "brand"
OUT  = ROOT / "exports" / "brand_corpus.json"

def clean(txt: str) -> str:
    txt = re.sub(r'\s+', ' ', txt).strip()
    return txt

def main():
    docs = []
    for p in sorted(SRC.glob("*.*")):
        if p.suffix.lower() not in (".txt",".md"): 
            continue  # pdf/docx не трогаем, без внешних пакетов
        docs.append({"name": p.name, "text": clean(p.read_text(encoding="utf-8", errors="ignore"))})
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(docs, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ brand_corpus: {len(docs)} файлов → {OUT}")

if __name__ == "__main__":
    main()
