# -*- coding: utf-8 -*-
import csv, json, base64, html, os
from pathlib import Path

ROOT = Path(__file__).parent
EXP  = ROOT / "exports"
SITE = ROOT / "site"
SITE.mkdir(exist_ok=True)

# ---- входные файлы
analysis_md = (EXP/"analysis_Q4_2025.md")
plan_csv    = (EXP/"plan_Q4_2025_justified.csv")
examples_clean = (EXP/"examples_ready_CLEAN.json")
examples_raw   = (EXP/"examples_ready.json")
ar_json    = (EXP/"visuals"/"ar_prompt.json")
poster_png = (EXP/"visuals"/"poster_Immunocomplex.png")
poster_svg = (EXP/"visuals"/"poster_Immunocomplex.svg")

def read(path, default=""):
    return path.read_text(encoding="utf-8") if path.exists() else default

def read_json(path, default=None):
    if not path.exists(): return default or []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default or []

# ---- данные
analysis = read(analysis_md).strip()
plan_rows = []
if plan_csv.exists():
    with plan_csv.open(encoding="utf-8") as f:
        plan_rows = list(csv.DictReader(f))
examples = read_json(examples_clean) or read_json(examples_raw)
ar_text  = read(ar_json).strip()

# ---- утилиты
def esc(t): return html.escape(t or "")
def shorten(t, n): 
    t = (t or "").strip()
    return t if len(t)<=n else t[:n-1] + "…"

# ---- Markdown отчёт
md = []
md.append("# BIOTACT IE-Agent — Q4 2025 (Прототип)\n")
md.append("> Дисклеймер: материалы информационные, формулировки «поддерживает/способствует». Не являются медицинскими рекомендациями.\n")

# 1. Анализ
md.append("## 1) Анализ продуктовой линейки (Q4 2025)\n")
md.append(analysis if analysis else "_Нет файла analysis_Q4_2025.md_\n")

# 2. План (таблица)
md.append("\n## 2) Контент-план на Q4 2025 (12 недель × 4–5 идей)\n")
if plan_rows:
    heads = ["week","start","end","channel","product","topic","goal","format","rationale"]
    md.append("| Week | Dates | Channel | Product | Topic | Goal | Format | Rationale |\n")
    md.append("|---:|---|---|---|---|---|---|---|\n")
    for r in plan_rows:
        dates = f"{r.get('start','')}–{r.get('end','')}"
        row = [
            r.get("week",""),
            dates,
            r.get("channel",""),
            r.get("product",""),
            shorten(r.get("topic",""), 120),
            r.get("goal",""),
            r.get("format",""),
            shorten(r.get("rationale","").replace('\n',' '), 180),
        ]
        md.append("| " + " | ".join(esc(x) for x in row) + " |\n")
else:
    md.append("_Нет файла plan_Q4_2025_justified.csv_\n")

# 3. Примеры
md.append("\n## 3) Примеры готового контента (100–200 слов) + визуал\n")
if examples:
    for ex in examples:
        md.append(f"### {esc(ex.get('sku','SKU'))}\n")
        md.append("**Instagram**\n\n" + esc(ex.get("instagram","")) + "\n\n")
        md.append("**Email**\n\n" + esc(ex.get("email","")) + "\n\n")
        md.append("**Podcast**\n\n" + esc(ex.get("podcast","")) + "\n\n")
else:
    md.append("_Нет examples_ready.json_\n")
md.append("\n**AR промпт (JSON, фрагмент):**\n\n")
md.append("```json\n" + (ar_text[:1500] + ("…\n" if len(ar_text)>1500 else "\n")) + "```\n")
if poster_png.exists():
    md.append(f"\n**Постер:** {poster_png}\n")
elif poster_svg.exists():
    md.append(f"\n**Постер (SVG):** {poster_svg}\n")

# 4. Таргетинг
md.append("\n## 4) Рекомендации по таргетингу, бюджету и метрикам\n")
targ = read_json(EXP/"targeting_recommendations.json")
if targ:
    md.append("| SKU | Audience | Budget (EUR) | KPI |\n|---|---|---:|---|\n")
    for item in targ:
        sku = item.get("sku","")
        rec = item.get("recommendations",{})
        aud = rec.get("audience",{})
        met = rec.get("metrics",{})
        aud_str = f"age {aud.get('age','')}, gender {aud.get('gender','')}, interests {', '.join(aud.get('interests',[]))}, geo {aud.get('geo','')}"
        kpi_str = f"ER≥{met.get('ER_min_%','?')}%, CTR≥{met.get('CTR_min_%','?')}%, Conv≥{met.get('Conv_min_%','?')}%, Podcast≥{met.get('Podcast_watch_%','?')}%"
        md.append(f"| {esc(sku)} | {esc(aud_str)} | {rec.get('budget_eur',0)} | {esc(kpi_str)} |\n")
else:
    md.append("_Нет targeting_recommendations.json_\n")

# 5. Интеграция и масштабируемость
md.append("\n## 5) Интеграция и масштабируемость\n")
md.append("- Экспорт CSV/JSON готов (Notion/Sheets — заглушки в `modules/integrations.py`).\n")
md.append("- Интерактивный CLI (`cli_app.py`): анализ, план, примеры, визуал, таргетинг.\n")
md.append("- Модульность: отдельные `modules/*` под каждую функцию, LLM-фоллбэк без сети.\n")
md.append("- Roadmap: Telegram-бот, реальные API Notion/Sheets, кеш LLM, AR-шаблоны.\n")

# записываем MD
report_md = EXP / "BIOTACT_IE_AGENT_REPORT.md"
report_md.write_text("".join(md), encoding="utf-8")

# ---- HTML (мини-сайт, одна страница)
def b64img(path: Path):
    try:
        data = path.read_bytes()
        enc = base64.b64encode(data).decode("ascii")
        return f"data:image/png;base64,{enc}"
    except Exception:
        return ""

poster_data_uri = b64img(poster_png) if poster_png.exists() else ""

# таблица плана для HTML
def render_plan_table(rows):
    heads = ["Week","Dates","Channel","Product","Topic","Goal","Format","Rationale"]
    out = ["<table class='tbl'><thead><tr>" + "".join(f"<th>{h}</th>" for h in heads) + "</tr></thead><tbody>"]
    for r in rows:
        dates = f"{esc(r.get('start',''))}–{esc(r.get('end',''))}"
        topic = esc(shorten(r.get('topic',''), 160))
        rationale = esc(shorten((r.get('rationale','') or '').replace('\n',' '), 260))
        out.append(
            "<tr>" +
            f"<td>{esc(r.get('week',''))}</td>" +
            f"<td>{dates}</td>" +
            f"<td>{esc(r.get('channel',''))}</td>" +
            f"<td>{esc(r.get('product',''))}</td>" +
            f"<td>{topic}</td>" +
            f"<td>{esc(r.get('goal',''))}</td>" +
            f"<td>{esc(r.get('format',''))}</td>" +
            f"<td>{rationale}</td>" +
            "</tr>"
        )
    out.append("</tbody></table>")
    return "\n".join(out)

plan_html = render_plan_table(plan_rows) if plan_rows else "<p>Нет данных плана.</p>"

# примеры
def render_examples(items):
    if not items: return "<p>Нет примеров.</p>"
    parts = []
    for ex in items:
        parts.append(f"""
<section class="card">
  <h3>{esc(ex.get('sku','SKU'))}</h3>
  <h4>Instagram</h4><p>{esc(ex.get('instagram',''))}</p>
  <h4>Email</h4><p>{esc(ex.get('email',''))}</p>
  <h4>Podcast</h4><p>{esc(ex.get('podcast',''))}</p>
</section>
""")
    return "\n".join(parts)

examples_html = render_examples(examples)

# таргетинг
def render_targeting(items):
    if not items: return "<p>Нет рекомендаций.</p>"
    out = ["<table class='tbl'><thead><tr><th>SKU</th><th>Audience</th><th>Budget (EUR)</th><th>KPI</th></tr></thead><tbody>"]
    for it in items:
        sku = esc(it.get("sku",""))
        rec = it.get("recommendations",{})
        aud = rec.get("audience",{})
        met = rec.get("metrics",{})
        aud_str = f"age {aud.get('age','')}, gender {aud.get('gender','')}, interests {', '.join(aud.get('interests',[]))}, geo {aud.get('geo','')}"
        kpi_str = f"ER≥{met.get('ER_min_%','?')}%, CTR≥{met.get('CTR_min_%','?')}%, Conv≥{met.get('Conv_min_%','?')}%, Podcast≥{met.get('Podcast_watch_%','?')}%"
        out.append(f"<tr><td>{sku}</td><td>{esc(aud_str)}</td><td style='text-align:right'>{rec.get('budget_eur',0)}</td><td>{esc(kpi_str)}</td></tr>")
    out.append("</tbody></table>")
    return "\n".join(out)

targ_html = render_targeting(read_json(EXP/"targeting_recommendations.json"))

CSS = """
:root{--bg:#0A1830;--acc:#00A3A3;--light:#FAFAFC;--text:#1C1C1C;}
*{box-sizing:border-box} body{margin:0;font:16px/1.55 system-ui,Segoe UI,Arial;background:var(--light);color:var(--text)}
header{background:var(--bg);color:#fff;padding:28px 28px 18px}
header h1{margin:0 0 6px;font-size:32px}
nav{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px}
nav a{background:var(--acc);color:#fff;text-decoration:none;padding:6px 10px;border-radius:10px;font-size:14px}
main{padding:24px}
section{margin:24px 0}
h2{margin:0 0 12px;font-size:24px}
h3{margin:14px 0 10px;font-size:18px}
h4{margin:10px 0 8px;font-size:16px}
.card{background:#fff;border:1px solid #e6e8ee;border-radius:14px;padding:14px;margin:12px 0}
.tbl{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e6e8ee;border-radius:12px;overflow:hidden}
.tbl th,.tbl td{padding:10px;border-bottom:1px solid #eef0f5;vertical-align:top}
.tbl th{background:#f6f8fb;text-align:left;font-weight:600}
small.disclaimer{opacity:.8}
.poster{max-width:460px;width:100%;border:1px solid #e6e8ee;border-radius:12px}
pre{white-space:pre-wrap;word-break:break-word;background:#fff;padding:12px;border:1px solid #e6e8ee;border-radius:12px}
"""

HTML = f"""<!doctype html>
<html lang="ru"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Biotact IE-Agent — Q4 2025</title>
<style>{CSS}</style>
<header>
  <h1>Biotact IE-Agent — Q4 2025 (прототип)</h1>
  <small class="disclaimer">Дисклеймер: материалы информационные, формулировки «поддерживает/способствует». Не являются медицинскими рекомендациями.</small>
  <nav>
    <a href="#analysis">Анализ</a>
    <a href="#plan">План</a>
    <a href="#examples">Примеры</a>
    <a href="#visuals">AR/Визуал</a>
    <a href="#targeting">Таргетинг</a>
    <a href="#integrations">Интеграции</a>
  </nav>
</header>
<main>
  <section id="analysis"><h2>1) Анализ продуктовой линейки</h2>
    <div class="card">{'<pre>'+esc(analysis)+'</pre>' if analysis else '<p>Нет файла analysis_Q4_2025.md</p>'}</div>
  </section>

  <section id="plan"><h2>2) Контент-план (12 недель × 4–5 идей)</h2>
    {plan_html}
  </section>

  <section id="examples"><h2>3) Примеры контента</h2>
    {examples_html}
  </section>

  <section id="visuals"><h2>Визуал / AR</h2>
    <div class="card">
      <h3>AR промпт (фрагмент)</h3>
      <pre>{esc(ar_text[:400]) + ('…' if len(ar_text)>400 else '')}</pre>
      {"<h3>Постер (PNG превью)</h3><img class='poster' src='"+poster_data_uri+"'/>" if poster_data_uri else (f"<p>Постер SVG: {esc(str(poster_svg))}</p>" if poster_svg.exists() else "<p>Нет постера</p>")}
    </div>
  </section>

  <section id="targeting"><h2>4) Таргетинг / Бюджет / Метрики</h2>
    {targ_html}
  </section>

  <section id="integrations"><h2>5) Интеграции и масштабируемость</h2>
    <ul>
      <li>Экспорт CSV/JSON готов (Notion/Sheets — заглушки в <code>modules/integrations.py</code>).</li>
      <li>Интерактивный CLI (<code>cli_app.py</code>): анализ, план, примеры, визуал, таргетинг.</li>
      <li>Модульная архитектура; LLM-фоллбэк без интернета.</li>
      <li>Roadmap: Telegram-бот, реальные API Notion/Sheets, кеш LLM, AR-шаблоны.</li>
    </ul>
  </section>
</main>
</html>"""

# записываем HTML
index_html = SITE/"index.html"
index_html.write_text(HTML, encoding="utf-8")

print("✓ Report:", report_md)
print("✓ Site  :", index_html)
