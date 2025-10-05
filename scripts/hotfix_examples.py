# -*- coding: utf-8 -*-
import json, re, pathlib, textwrap
p = pathlib.Path("exports/examples_gui.json")
if p.exists():
    data = json.loads(p.read_text(encoding="utf-8"))
    def tidy(s):
        s = re.sub(r'\s+', ' ', s).strip()
        # если текст повторяется дважды, оставить одну половину
        h = len(s)//2
        if s[:h] == s[h:]: s = s[:h]
        # мягкая усадка до ~180 слов
        words = s.split()
        if len(words) > 200: s = " ".join(words[:200])
        return s
    for it in data:
        for k in ("instagram","email","podcast"):
            if k in it and it[k]: it[k] = tidy(it[k])
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print("✓ examples tightened:", p)
else:
    print("no examples file:", p)
