# -*- coding: utf-8 -*-
import json, re, pathlib
p = pathlib.Path("exports/examples_gui.json")
data = json.loads(p.read_text(encoding="utf-8"))
def dedup(s):
    s = re.sub(r'\s+', ' ', s).strip()
    # СѓР±РёСЂР°РµРј СЃР»СѓС‡Р°Р№РЅС‹Р№ РґСѓР±Р»СЊ С„СЂР°РіРјРµРЅС‚Р° (РїРѕРІС‚РѕСЂ РїРѕРґСЂСЏРґ)
    half = len(s)//2
    return s[:half] if s[:half]==s[half:] else s
for item in data:
    for k in ("instagram","email","podcast"):
        if k in item: item[k] = dedup(item[k])
p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
print("вњ“ cleaned:", p)
