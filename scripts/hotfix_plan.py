# -*- coding: utf-8 -*-
import csv, pathlib, textwrap
src = pathlib.Path("exports/plan_Q4_2025_gui.csv")
dst = src
if src.exists():
    rows = list(csv.DictReader(src.open(encoding="utf-8")))
    for r in rows:
        t = r.get("Rationale","").replace("…","").strip()
        t = " ".join(t.split())
        # мягко укорачиваем до ~400 символов и 3–5 предложений
        if len(t) > 400: t = t[:400].rsplit(". ",1)[0] + "."
        r["Rationale"] = t
    with dst.open("w",encoding="utf-8",newline="") as f:
        w = csv.DictWriter(f, fieldnames=rows[0].keys())
        w.writeheader(); w.writerows(rows)
    print("✓ rationale tightened:", dst)
else:
    print("no plan file:", src)
