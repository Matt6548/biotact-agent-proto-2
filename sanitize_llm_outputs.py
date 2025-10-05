# -*- coding: utf-8 -*-
from pathlib import Path
import re, json

root = Path(__file__).parent
src = root / "exports" / "examples_llm"
dst = root / "exports" / "examples_llm_clean"
dst.mkdir(parents=True, exist_ok=True)

EMOJI_PATTERN = re.compile(r"[\U00010000-\U0010FFFF]")

def strip_emoji(t: str) -> str:
    return EMOJI_PATTERN.sub("", t)

def soften_claims(t: str) -> str:
    repl = [
        (r"\bлечит\w*\b", "поддерживает"),
        (r"\bвылечит\w*\b", "может поддержать"),
        (r"\bисцел\w*\b", "поддерживает"),
        (r"\bобеща\w*\b", "ожидаем"),
    ]
    for pat, rep in repl:
        t = re.sub(pat, rep, t, flags=re.IGNORECASE)
    return t

def normalize(t: str) -> str:
    t = t.replace("\u00A0"," ").replace("\u2013","-").replace("\u2014","—")
    t = re.sub(r"[ \t]+"," ", t)
    t = strip_emoji(t)
    t = soften_claims(t)
    return t.strip()

def trim_words(t: str, limit: int) -> str:
    w = t.split()
    return t if len(w) <= limit else " ".join(w[:limit]) + " …"

for p in src.glob("example*.*"):
    txt = p.read_text(encoding="utf-8", errors="ignore")
    clean = normalize(txt)
    name = p.name
    # подрезаем самые «длинные» форматы
    if name.endswith(".instagram.txt"):
        clean = trim_words(clean, 130)
    if name.endswith(".email.txt"):
        clean = trim_words(clean, 140)
    if name.endswith(".podcast.txt"):
        clean = trim_words(clean, 180)
    (dst / name).write_text(clean, encoding="utf-8")

# быстрый Summary
summary = ["# LLM Examples (Cleaned)\n"]
for f in sorted(dst.glob("example*.*")):
    summary.append(f.name)
(root / "exports" / "examples_llm_clean" / "CLEAN_SUMMARY.txt").write_text("\n".join(summary), encoding="utf-8")
print("Cleaned to:", dst)
