# -*- coding: utf-8 -*-
import json
from pathlib import Path
from datetime import date
from modules.analyzer import insights, pick_priority_products
from modules.planner import plan
from modules.plan_llm import add_week_rationales
from modules.analysis_llm import analyze_products
from modules.generator_llm import make_instagram, make_podcast, make_email, make_ar
from modules.visuals import ar_prompt_for, generate_image
from modules.targeting_adv import recommend
from modules.exporter import save_csv, save_text, save_json, save_markdown
from modules.integrations import export_json, export_csv_text

ROOT = Path(__file__).parent
DATA = json.loads((ROOT/"data"/"products.json").read_text(encoding="utf-8"))
EXPORTS = ROOT/"exports"

def do_analysis():
    txt = analyze_products(DATA, "Q4-2025")
    (EXPORTS/"analysis_Q4_2025.md").write_text(txt, encoding="utf-8")
    print("✓ analysis_Q4_2025.md")

def do_plan(per_week=5):
    rows = plan(DATA, "Q4-2025", per_week=per_week, start_date=date(2025,9,29))
    rows = add_week_rationales(rows, "Q4-2025")
    save_csv(rows, EXPORTS/"plan_Q4_2025_justified.csv")
    print("✓ plan_Q4_2025_justified.csv")

def do_examples(lang="ru", style="дружелюбно, экспертно"):
    prio = pick_priority_products(DATA, "Q4-2025", k=3)
    out = []
    for p in prio:
        ig = make_instagram(p, lang=lang, style=style)
        em = make_email(p, lang=lang, style=style)
        pod = make_podcast(p, lang=lang, style=style)
        arj = make_ar(p, lang=lang, style=style)
        item = {"sku": p["sku"], "instagram": ig, "email": em, "podcast": pod, "ar": arj}
        out.append(item)
    save_json(out, EXPORTS/"examples_ready.json")
    print("✓ examples_ready.json")

def do_visuals():
    # берём первый продукт и делаем AR-промпт + (опц.) картинку
    name = DATA[0]["name"]
    prompt = json.dumps(ar_prompt_for(name), ensure_ascii=False)
    (EXPORTS/"visuals"/"ar_prompt.json").write_text(prompt, encoding="utf-8")
    print("✓ visuals/ar_prompt.json")
    # генерация простого постера (если есть ключ)
    from datetime import datetime
    out = EXPORTS/"visuals"/f"poster_{name}.png"
    path = generate_image(f"{name} product jar on light background, soft shadows, minimal label, autumn mood", out)
    print("✓", path)

def do_targeting():
    prio = pick_priority_products(DATA, "Q4-2025", k=3)
    out = []
    for p in prio:
        out.append({"sku": p["sku"], "recommendations": recommend(p["sku"])})
    save_json(out, EXPORTS/"targeting_recommendations.json")
    print("✓ targeting_recommendations.json")

def menu():
    print("""
[1] Анализ продуктов (300–500 слов)
[2] План Q4 с обоснованием (12×5)
[3] Примеры контента (3 шт: IG/Email/Podcast + AR JSON)
[4] Визуал: AR-промпт + (опц.) картинка
[5] Таргетинг/метрики/бюджеты (для 3 SKU)
[6] Экспорт (CSV/JSON уже создаются; заготовки под Notion/Sheets)
[0] Выход
""")
    while True:
        choice = input("Выберите пункт: ").strip()
        if choice == "1": do_analysis()
        elif choice == "2": do_plan(5)
        elif choice == "3": do_examples()
        elif choice == "4": do_visuals()
        elif choice == "5": do_targeting()
        elif choice == "6":
            print("Экспорт CSV/JSON уже выполнен в папку exports/. Stub-функции Notion/Sheets готовы в modules/integrations.py")
        elif choice == "0": break
        else: print("Неверный выбор")

if __name__ == "__main__":
    menu()
