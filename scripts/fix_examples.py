# -*- coding: utf-8 -*-
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
ex_dir = root / "exports" / "examples_llm"

def load(p: Path) -> str:
    return p.read_text(encoding="utf-8") if p.exists() else ""

def uniq_sentences(text: str, max_words=160):
    sents = re.split(r"(?<=[\.\!\?])\s+", text.strip())
    seen, out = set(), []
    for s in sents:
        s1 = re.sub(r"\s+", " ", s).strip()
        if s1 and s1.lower() not in seen:
            seen.add(s1.lower())
            out.append(s1)
    text = " ".join(out)
    words = text.split()
    return " ".join(words[:max_words])

targets = [
    # пара примеров на любой сгенерированный набор
    "example1_IMMUNOCOMPLEX.instagram.txt",
    "example1_IMMUNOCOMPLEX.email.txt",
    "example1_IMMUNOCOMPLEX.podcast.txt",
    "example2_IMMUNOCOMPLEX_KIDS.instagram.txt",
    "example2_IMMUNOCOMPLEX_KIDS.email.txt",
    "example3_BIFOLAK_ZINCUM_C_D3.instagram.txt",
    "example3_BIFOLAK_ZINCUM_C_D3.email.txt",
]

for name in targets:
    p = ex_dir / name
    if not p.exists(): 
        continue
    txt = load(p)
    if ".instagram." in name:
        txt = uniq_sentences(txt, 120)
    elif ".email." in name:
        txt = uniq_sentences(txt, 180)
    else:
        txt = uniq_sentences(txt, 220)
    p.write_text(txt, encoding="utf-8")

print("[hotfix] Примеры контента подчищены (без повторов, компактнее)")
