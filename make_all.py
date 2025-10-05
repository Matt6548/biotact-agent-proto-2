# -*- coding: utf-8 -*-
from pathlib import Path
import csv, json, html, re, zipfile

ROOT = Path(__file__).parent
EXP  = ROOT / "exports"
SITE = ROOT / "site"
SITE.mkdir(exist_ok=True)

def esc(t): return html.escape(t or "")

def read_text(p: Path, default=""):
    try:
        return p.read_text(encoding="utf-8")
    except Exception:
        return default

def read_json(p: Path, default=None):
    if not p.exists(): return default
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return default

def short(t, n):
    t = (t or "").strip()
    return t if len(t) <= n else t[:n-1] + "…"

# ---------- входные данные
analysis = read_text(EXP/"analysis_Q4_2025.md").strip()

plan_rows = []
plan_csv = EXP/"plan_Q4_2025_justified.csv"
if plan_csv.exists():
    with plan_csv.open(encoding="utf-8") as f:
        plan_rows = list(csv.DictReader(f))

examples = read_json(EXP/"examples_ready_CLEAN.json") or read_json(EXP/"examples_ready.json") or []

ar_text = read_text(EXP/"visuals"/"ar_prompt.json").strip()
ar_text_js = ar_text.replace("\\","\\\\").replace("`","\\`")

# постеры (PNG/SVG)
posters = {}
vis_dir = EXP/"visuals"
if vis_dir.exists():
    for p in vis_dir.iterdir():
        name = p.name
        if not name.lower().startswith("poster_"): continue
        sku = name.split("poster_",1)[1].rsplit(".",1)[0]
        posters.setdefault(sku, {"png":None,"svg":None})
        if p.suffix.lower()==".png": posters[sku]["png"] = p.name
        if p.suffix.lower()==".svg": posters[sku]["svg"] = p.name

# ---------- Markdown
md = []
md.append("# BIOTACT IE-Agent — Q4 2025 (Прототип)\n")
md.append("> Дисклеймер: материалы информационные, формулировки «поддерживает/способствует». Не являются медицинскими рекомендациями.\n")

md.append("## 1) Анализ продуктовой линейки (Q4 2025)\n")
md.append(analysis if analysis else "_Нет файла analysis_Q4_2025.md_\n")

md.append("\n## 2) Контент-план на Q4 2025 (12 недель × 4–5 идей)\n")
if plan_rows:
    md.append("| Week | Dates | Channel | Product | Topic | Goal | Format |\n")
    md.append("|---:|---|---|---|---|---|---|\n")
    for r in plan_rows:
        dates = f"{r.get('start','')}–{r.get('end','')}"
        row = [r.get("week",""), dates, r.get("channel",""), r.get("product",""),
               short(r.get("topic",""), 120), r.get("goal",""), r.get("format","")]
        md.append("| " + " | ".join(esc(x) for x in row) + " |\n")
else:
    md.append("_Нет файла plan_Q4_2025_justified.csv_\n")

md.append("\n## 3) Примеры готового контента\n")
if examples:
    for ex in examples:
        md.append(f"### {esc(ex.get('sku','SKU'))}\n")
        md.append("**Instagram**\n\n" + esc(ex.get("instagram","")) + "\n\n")
        md.append("**Email**\n\n" + esc(ex.get("email","")) + "\n\n")
        md.append("**Podcast**\n\n" + esc(ex.get("podcast","")) + "\n\n")
else:
    md.append("_Нет examples_ready.json_\n")

md.append("\n## 4) AR промпт (фрагмент JSON)\n\n```json\n")
md.append((ar_text[:1500] + ("…\n" if len(ar_text)>1500 else "\n")))
md.append("```\n")

md.append("\n## 5) Таргетинг / Бюджет / Метрики\n")
targ = read_json(EXP/"targeting_recommendations.json", [])
if targ:
    md.append("| SKU | Audience | Budget (EUR) | KPI |\n|---|---|---:|---|\n")
    for it in targ:
        sku = it.get("sku","")
        rec = it.get("recommendations",{})
        aud = rec.get("audience",{})
        met = rec.get("metrics",{})
        aud_str = f"age {aud.get('age','')}, gender {aud.get('gender','')}, interests {', '.join(aud.get('interests',[]))}, geo {aud.get('geo','')}"
        kpi_str = f"ER≥{met.get('ER_min_%','?')}%, CTR≥{met.get('CTR_min_%','?')}%, Conv≥{met.get('Conv_min_%','?')}%, Podcast≥{met.get('Podcast_watch_%','?')}%"
        md.append(f"| {esc(sku)} | {esc(aud_str)} | {rec.get('budget_eur',0)} | {esc(kpi_str)} |\n")
else:
    md.append("_Нет targeting_recommendations.json_\n")

md.append("\n## 6) Интеграция и масштабируемость\n")
md.append("- Экспорт CSV/JSON готов (Notion/Sheets — заглушки в `modules/integrations.py`).\n")
md.append("- Интерактивный CLI (`cli_app.py`): анализ, план, примеры, визуал, таргетинг.\n")
md.append("- Модульная архитектура; LLM-фоллбэк без сети.\n")
md.append("- Roadmap: Telegram-бот, реальные API Notion/Sheets, кеш LLM, AR-шаблоны.\n")

report_md = EXP/"BIOTACT_IE_AGENT_REPORT.md"
report_md.write_text("".join(md), encoding="utf-8")
print("✓ MD  :", report_md)

# ---------- HTML helpers
def render_plan(rows):
    if not rows: return "<p>Нет данных плана.</p>"
    out = ["<table id='planTable' class='tbl'><thead><tr><th>Week</th><th>Dates</th><th>Channel</th><th>Product</th><th>Topic</th><th>Goal</th><th>Format</th><th>Rationale</th></tr></thead><tbody>"]
    for r in rows:
        dates = f"{esc(r.get('start',''))}–{esc(r.get('end',''))}"
        out.append(
            "<tr>"
            f"<td>{esc(r.get('week',''))}</td>"
            f"<td>{dates}</td>"
            f"<td>{esc(r.get('channel',''))}</td>"
            f"<td>{esc(r.get('product',''))}</td>"
            f"<td>{esc(short(r.get('topic',''),160))}</td>"
            f"<td>{esc(r.get('goal',''))}</td>"
            f"<td>{esc(r.get('format',''))}</td>"
            f"<td>{esc(short((r.get('rationale','') or '').replace('\\n',' '),260))}</td>"
            "</tr>"
        )
    out.append("</tbody></table>")
    return "\n".join(out)

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
</section>""")
    return "\n".join(parts)

def render_posters_grid(posters_map):
    if not posters_map: return "<p>Нет постеров.</p>"
    blocks=[]
    for sku, files in posters_map.items():
        src = files.get("png") or files.get("svg") or ""
        img = f"<img class='poster' src='../exports/visuals/{src}' />" if src else ""
        links=[]
        if files.get("png"): links.append(f"<a download href='../exports/visuals/{files['png']}'>PNG</a>")
        if files.get("svg"): links.append(f"<a download href='../exports/visuals/{files['svg']}'>SVG</a>")
        links = " · ".join(links)
        blocks.append(f"<div class='fig'>{img}<p><b>{esc(sku)}</b>{(' — '+links) if links else ''}</p></div>")
    return "<div class='grid'>" + "\n".join(blocks) + "</div>"

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
.tbl thead th{position:sticky;top:0;z-index:2}
#plan-controls{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
#plan-controls input,#plan-controls select{padding:6px 8px;border:1px solid #cfd6e4;border-radius:10px}
#plan-controls button{padding:6px 10px;border:1px solid #cfd6e4;border-radius:10px;background:#fff;cursor:pointer}
#planWrap{max-height:70vh;overflow:auto}
.muted{opacity:.7}.hidden{display:none}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
.fig{background:#fff;border:1px solid #e6e8ee;border-radius:12px;padding:10px}
.fig img{width:100%;height:auto;border-radius:8px;border:1px solid #eef0f5}
.fig p{margin:8px 0 0;font-size:13px}
"""

PLAN_HTML = render_plan(plan_rows)
EXAMPLES_HTML = render_examples(examples)
POSTERS_HTML = render_posters_grid(posters)
TARGETING_PRE = esc(read_text(EXP/'targeting_recommendations.json')) if (EXP/'targeting_recommendations.json').exists() else "<p>Нет targeting_recommendations.json</p>"
ANALYSIS_PRE = "<pre>"+esc(analysis)+"</pre>" if analysis else "<p>Нет файла analysis_Q4_2025.md</p>"

HTML_TMPL = """<!doctype html>
<html lang="ru"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Biotact IE-Agent — Q4 2025</title>
<style>%%CSS%%</style>
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
    <div class="card">%%ANALYSIS%%</div>
  </section>

  <section id="plan"><h2>2) Контент-план (12 недель × 4–5 идей)</h2>
    <div id="plan-controls" class="card">
      <label>Канал: <select id="fChannel"><option value="">Все</option></select></label>
      <label>Продукт: <select id="fProduct"><option value="">Все</option></select></label>
      <label>Неделя c: <input id="fWeekFrom" type="number" min="1" max="12" style="width:70px"></label>
      <label>по: <input id="fWeekTo" type="number" min="1" max="12" style="width:70px"></label>
      <label>Поиск: <input id="fSearch" placeholder="тема/обоснование"></label>
      <label><input id="fHideRationale" type="checkbox"> скрыть «Rationale»</label>
      <button id="btnExport">Экспорт CSV (фильтр)</button>
      <span id="planCount" class="muted"></span>
    </div>
    <div id="planWrap">%%PLAN%%</div>
  </section>

  <section id="examples"><h2>3) Примеры контента</h2>
    %%EXAMPLES%%
  </section>

  <section id="visuals"><h2>Визуал / AR</h2>
    <div class="card">
      <h3>AR-промпт</h3>
      <textarea id="arBox" style="width:100%;min-height:160px"></textarea>
      <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="copyAR()">Копировать</button>
        <a href="../exports/visuals/ar_prompt.json" download>Скачать ar_prompt.json</a>
      </div>
    </div>
    <div class="card">
      <h3>Постеры (автоскан)</h3>
      %%POSTERS%%
    </div>
  </section>

  <section id="targeting"><h2>4) Таргетинг / Бюджет / Метрики</h2>
    <div class="card">%%TARGETING_PRE%%</div>
  </section>

  <section id="integrations"><h2>5) Интеграции и масштабируемость</h2>
    <ul>
      <li>Экспорт CSV/JSON готов (Notion/Sheets — заглушки в <code>modules/integrations.py</code>).</li>
      <li>Интерактивный CLI (<code>cli_app.py</code>): анализ, план, примеры, визуал, таргетинг.</li>
      <li>Модульная архитектура; LLM-фоллбэк без сети.</li>
      <li>Roadmap: Telegram-бот, реальные API Notion/Sheets, кеш LLM, AR-шаблоны.</li>
    </ul>
  </section>
</main>

<script>
(function(){
  const tbl = document.getElementById('planTable');
  if(!tbl) return;
  const rows = Array.from(tbl.tBodies[0].rows);
  const col = {week:0, dates:1, channel:2, product:3, topic:4, goal:5, format:6, rationale:7};
  function uniq(list){ return Array.from(new Set(list)).sort(); }
  const channels = uniq(rows.map(r=>r.cells[col.channel].textContent.trim()));
  const products = uniq(rows.map(r=>r.cells[col.product].textContent.trim()));
  const fChannel = document.getElementById('fChannel');
  const fProduct = document.getElementById('fProduct');
  channels.forEach(v=>fChannel.insertAdjacentHTML('beforeend', '<option>'+v+'</option>'));
  products.forEach(v=>fProduct.insertAdjacentHTML('beforeend', '<option>'+v+'</option>'));
  const fWeekFrom = document.getElementById('fWeekFrom');
  const fWeekTo   = document.getElementById('fWeekTo');
  const fSearch   = document.getElementById('fSearch');
  const fHideR    = document.getElementById('fHideRationale');
  const planCount = document.getElementById('planCount');
  function toggleRationale(){
    const show = !fHideR.checked;
    tbl.tHead.rows[0].cells[col.rationale].style.display = show ? '' : 'none';
    rows.forEach(r => r.cells[col.rationale].style.display = show ? '' : 'none');
  }
  function apply(){
    const ch = fChannel.value.trim();
    const pr = fProduct.value.trim();
    const wf = parseInt(fWeekFrom.value||'1',10);
    const wt = parseInt(fWeekTo.value||'12',10);
    const q  = (fSearch.value||'').trim().toLowerCase();
    let visible=0;
    rows.forEach(r=>{
      const week = parseInt(r.cells[col.week].textContent.trim()||'0',10);
      const channel = r.cells[col.channel].textContent.trim();
      const product = r.cells[col.product].textContent.trim();
      const text = (r.cells[col.topic].textContent + ' ' + r.cells[col.rationale].textContent).toLowerCase();
      const ok = (!ch || channel===ch) && (!pr || product===pr) &&
                 (week >= (isNaN(wf)?1:wf) && week <= (isNaN(wt)?12:wt)) &&
                 (!q || text.indexOf(q) !== -1);
      r.style.display = ok ? '' : 'none';
      if(ok) visible++;
    });
    planCount.textContent = 'Показано: '+visible+' / '+rows.length;
  }
  document.getElementById('btnExport').onclick = function(){
    const sep = ',';
    const head = Array.from(tbl.tHead.rows[0].cells).map(td=>'"'+td.textContent.trim().replaceAll('"','""')+'"');
    const lines = [head.join(sep)];
    rows.forEach(r=>{
      if(r.style.display==='none') return;
      const cells = Array.from(r.cells).map(td=>'"'+td.textContent.trim().replaceAll('"','""')+'"');
      lines.push(cells.join(sep));
    });
    const blob = new Blob([lines.join('\\n')], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {href:url, download:'plan_filtered.csv'});
    document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove();
  };
  fChannel.onchange = fProduct.onchange = fWeekFrom.oninput = fWeekTo.oninput = fSearch.oninput = apply;
  fHideR.onchange = toggleRationale;
  fWeekFrom.value = 1; fWeekTo.value = 12;
  toggleRationale(); apply();
})();
(function(){
  const box = document.getElementById('arBox');
  if(!box) return;
  const AR_JSON = `%%AR_JSON%%`;
  box.value = AR_JSON;
})();
function copyAR(){
  const t = document.getElementById('arBox');
  t.select(); document.execCommand('copy'); alert('AR-промпт скопирован');
}
</script>
</html>"""

html_out = (HTML_TMPL
            .replace("%%CSS%%", CSS)
            .replace("%%ANALYSIS%%", ANALYSIS_PRE)
            .replace("%%PLAN%%", PLAN_HTML)
            .replace("%%EXAMPLES%%", EXAMPLES_HTML)
            .replace("%%POSTERS%%", POSTERS_HTML)
            .replace("%%TARGETING_PRE%%", TARGETING_PRE)
            .replace("%%AR_JSON%%", ar_text_js))

index_html = SITE/"index.html"
index_html.write_text(html_out, encoding="utf-8")
print("✓ HTML:", index_html)

# ---------- ZIP на сдачу
zip_path = EXP/"handoff.zip"
with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as z:
    if index_html.exists():
        z.write(index_html, "site/index.html")
    for p in EXP.rglob("*"):
        if p.is_file() and p.name != "handoff.zip":
            z.write(p, f"exports/{p.relative_to(EXP)}")
print("✓ ZIP :", zip_path)
