# -*- coding: utf-8 -*-

import json, argparse
from pathlib import Path
from datetime import date
from modules.analyzer import insights, pick_priority_products
from modules.planner import plan
from modules.generator import instagram_caption, podcast_script, email_copy, ar_prompt
from modules.generator_llm import make_instagram, make_podcast, make_email, make_ar
from modules.exporter import save_csv, save_text, save_json, save_markdown

def load_products(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))

def cli():
    ap = argparse.ArgumentParser(description="Biotact AI-Marketing Agent (prototype)")
    ap.add_argument("--quarter", default="Q4-2025")
    ap.add_argument("--examples", type=int, default=3)
    ap.add_argument("--per-week", type=int, default=4)
    ap.add_argument("--mode", choices=["rule","llm"], default="rule", help="rule = Р±РµР· LLM, llm = РіРµРЅРµСЂР°С†РёСЏ С‚РµРєСЃС‚РѕРІ С‡РµСЂРµР· LLM")
    ap.add_argument("--lang", default="ru", help="ru/uz/en вЂ” СЏР·С‹Рє РіРµРЅРµСЂР°С†РёРё LLM")
    ap.add_argument("--style", default="РґСЂСѓР¶РµР»СЋР±РЅРѕ, СЌРєСЃРїРµСЂС‚РЅРѕ", help="С‚РѕРЅР°Р»СЊРЅРѕСЃС‚СЊ РґР»СЏ LLM")
    args = ap.parse_args()

    root = Path(__file__).parent
    products = load_products(root / "data" / "products.json")

    # 1) Insights
    ins = insights(products, args.quarter)
    save_json(ins, root / "exports" / "insights.json")

    # 2) Plan for 12 weeks
    rows = plan(products, args.quarter, per_week=args.per_week, start_date=date(2025,9,29))
    save_csv(rows, root / "exports" / "plan_Q4_2025.csv")

    # 3) Examples
    prio = pick_priority_products(products, args.quarter, k=args.examples)
    if args.mode == "rule":
        for idx, p in enumerate(prio, start=1):
            save_text(instagram_caption(p), root / "examples" / f"example{idx}_instagram.txt")
            save_text(podcast_script(p), root / "examples" / f"example{idx}_podcast.txt")
            save_text(email_copy(p), root / "examples" / f"example{idx}_email.txt")
            save_text(ar_prompt(p), root / "examples" / f"example{idx}_ar_prompt.txt")
            save_json({"product": p["sku"], "mode":"rule"}, root / "exports" / f"targeting_{p['sku']}.json")
    else:
        # LLM mode
        md = ["# LLM Examples"]
        for idx, p in enumerate(prio, start=1):
            ig = make_instagram(p, lang=args.lang, style=args.style)
            pod = make_podcast(p, lang=args.lang, style=args.style)
            em = make_email(p, lang=args.lang, style=args.style)
            ar = make_ar(p, lang=args.lang, style=args.style)
            # Save per file
            base = root / "exports" / "examples_llm" / f"example{idx}_{p['sku']}"
            (base.parent).mkdir(parents=True, exist_ok=True)
            save_text(ig, base.with_suffix(".instagram.txt"))
            save_text(pod, base.with_suffix(".podcast.txt"))
            save_text(em, base.with_suffix(".email.txt"))
            save_text(ar, base.with_suffix(".ar.json"))
            # Append to MD summary
            md.append(f"\n## {idx}. {p['name']} ({p['sku']})")
            md.append("\n**Instagram**\n\n" + ig)
            md.append("\n**Podcast**\n\n" + pod)
            md.append("\n**Email**\n\n" + em)
            md.append("\n**AR**\n\n```json\n" + ar + "\n```")
        save_markdown("\n".join(md), root / "exports" / "examples_llm" / "LLM_EXAMPLES.md")

    print("Done. See /exports and /examples.")

if __name__ == "__main__":
    cli()
