# -*- coding: utf-8 -*-
import os, csv, json, re, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXP  = ROOT / "exports"

PLAN_IN  = EXP / "plan_Q4_2025_justified.csv"
PLAN_OUT = EXP / "plan_Q4_2025_justified_CLEAN.csv"
EXAMPLES = EXP / "examples_ready.json"
TARGET   = EXP / "targeting_recommendations.json"
EX_TGT   = EXP / "targeting_examples.json"
ENRICHED = EXP / "targeting_recommendations_enriched.json"

def sent_dedup(txt: str) -> str:
    if not txt: return txt
    parts = re.split(r'(?<=[.!?])\s+', txt.strip())
    seen, out = set(), []
    for s in parts:
        k = re.sub(r'\W+','',s.lower())
        if k in seen: continue
        seen.add(k); out.append(s.strip())
    wrds = (" ".join(out)).split()
    return " ".join(wrds[:200]) + ("…" if len(wrds)>200 else "")

def fix_format(channel, fmt):
    ch = (channel or "").lower(); f = (fmt or "").lower()
    if "email" in ch: return "Рассылка"
    if "podcast" in ch: return "Выпуск 10–12 мин"
    if "site" in ch: return "Статья"
    if "youtube" in ch: return "Видео"
    if "partners" in ch: return "POS"
    if ch == "ar": return "AR-фильтр"
    return fmt or "Пост"

def trim(txt, n=420):
    if not txt: return txt
    t = re.sub(r'\s+',' ',txt).strip()
    return t if len(t)<=n else t[:n]+"…"

def clean_plan():
    if not PLAN_IN.exists(): 
        print("↳ пропустил clean_plan: файла плана нет")
        return
    with PLAN_IN.open("r", encoding="utf-8") as f, PLAN_OUT.open("w", encoding="utf-8", newline="") as w:
        r = csv.DictReader(f); cols = r.fieldnames
        if "rationale" not in cols: cols.append("rationale")
        wri = csv.DictWriter(w, fieldnames=cols); wri.writeheader()
        for row in r:
            row["format"] = fix_format(row.get("channel",""), row.get("format",""))
            row["rationale"] = trim(row.get("rationale",""))
            wri.writerow(row)
    shutil.copy2(PLAN_OUT, PLAN_IN)
    print(f"✓ План очищен → {PLAN_IN}")

def link_examples_targeting():
    if not EXAMPLES.exists():
        print("↳ пропустил link_examples_targeting: примеров нет")
        return
    data = json.loads(EXAMPLES.read_text(encoding="utf-8"))
    # подчистим дубли и проставим id
    for e in data:
        for k in ("instagram","email","podcast"):
            if k in e and isinstance(e[k], str):
                e[k] = sent_dedup(e[k])
        sku = (e.get("product","") or "").upper()
        e["id_instagram"] = f"{sku}_IG"
        e["id_email"]     = f"{sku}_EMAIL"
        e["id_podcast"]   = f"{sku}_POD"
    EXAMPLES.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    # таргетинг на конкретные примеры
    ex_targets = []
    def aud(sku):
        return {"age":"25-45 (родители)","gender":"all","interests":["дети","школа","здоровье"],"geo":"ЦА/СНГ"} if "KIDS" in sku \
            else {"age":"25-50","gender":"all","interests":["wellness","ЗОЖ","семья"],"geo":"ЦА/СНГ"}
    for e in data:
        sku = (e.get("product","") or "").upper()
        for ex_id, ch in [(e["id_instagram"],"Instagram"),(e["id_email"],"Email"),(e["id_podcast"],"Podcast")]:
            ex_targets.append({
                "example_id": ex_id, "sku": sku, "channel": ch,
                "audience": aud(sku),
                "budget_eur": 350 if "KIDS" in sku else 300,
                "metrics": {
                    "ER_min_%": 5 if ch=="Instagram" else 3,
                    "CTR_min_%": 2.0 if ch in ("Instagram","Email") else 0.8,
                    "Conv_min_%": 1.0,
                    "Podcast_watch_%": 70 if ch=="Podcast" else None,
                    "site_sessions_from_email_%": 12 if ch=="Email" else None,
                    "ig_to_youtube_views_%": 8 if ch=="Instagram" else None
                }
            })
    EX_TGT.write_text(json.dumps(ex_targets, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ Таргетинг для примеров → {EX_TGT}")

    # cоберём обогащённый файл, не ломая исходный формат
    if TARGET.exists():
        base = json.loads(TARGET.read_text(encoding="utf-8"))
        if isinstance(base, list):
            enriched = {"recommendations": base, "examples_linked": ex_targets}
        elif isinstance(base, dict):
            base["examples_linked"] = ex_targets
            enriched = base
        else:
            enriched = {"recommendations_raw": base, "examples_linked": ex_targets}
        ENRICHED.write_text(json.dumps(enriched, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"✓ Обогащённый файл → {ENRICHED}")
    else:
        print("↳ исходный TARGET отсутствует, пропустил enriched")

if __name__ == "__main__":
    clean_plan()
    link_examples_targeting()
