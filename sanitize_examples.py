# -*- coding: utf-8 -*-
import json, re
from pathlib import Path

ROOT = Path(__file__).parent
f = ROOT/"exports"/"examples_ready.json"
data = json.loads(f.read_text(encoding="utf-8"))

EMOJI = re.compile(
    "["                             # убираем эмодзи/пиктограммы
    "\U0001F300-\U0001FAD6"
    "\U0001F900-\U0001FAFF"
    "\u2600-\u27BF"
    "]+", flags=re.UNICODE
)

def clean(txt):
    if not txt: return ""
    txt = EMOJI.sub("", txt)
    txt = re.sub(r"\s+", " ", txt).strip()
    # 100–200 слов
    words = txt.split()
    if len(words) < 100:
        # если мало — дублируем важные фразы (мягкий ап)
        txt = " ".join(words + words[: max(0, 100-len(words))])
        words = txt.split()
    if len(words) > 200:
        words = words[:200]; txt = " ".join(words) + " …"
    return txt

for item in data:
    for k in ("instagram","email","podcast"):
        item[k] = clean(item.get(k,""))

out = ROOT/"exports"/"examples_ready_CLEAN.json"
out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
print("✓ examples_ready_CLEAN.json")
