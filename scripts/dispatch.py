# -*- coding: utf-8 -*-
import os, csv, json, argparse, glob
from pathlib import Path
from modules.connectors.telegram_bot import send_message, send_document
from modules.connectors.email_smtp import send_email

ROOT = Path(__file__).resolve().parents[1]
EXP  = ROOT/"exports"
VIS  = EXP/"visuals"

def _find_plan():
    for name in ("plan_Q4_2025_gui.csv","plan_Q4_2025_justified.csv","plan_Q4_2025.csv"):
        p = EXP/name
        if p.exists(): return p
    raise FileNotFoundError("Не найден план в exports/")

def load_plan_by_week(week:int):
    rows=[]; 
    with open(_find_plan(), encoding="utf-8") as f:
        for r in csv.DictReader(f):
            try:
                if int(r.get("week") or r.get("Week") or 0)==week: rows.append(r)
            except: pass
    return rows

def load_examples_map():
    p = EXP/"examples_gui.json"
    if not p.exists(): return {}
    data = json.loads(p.read_text(encoding="utf-8"))
    # нормализуем: поддержим и dict, и list
    if isinstance(data, dict): return data
    m={}
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict):
                for k,v in item.items():
                    if isinstance(v, dict):
                        m.setdefault(k,{})
                        m[k].update(v)
    return m

def render_tg_text(week_rows):
    lines = ["<b>Biotact — Q4 контент (неделя)</b>"]
    for r in week_rows[:10]:
        ch  = r.get("channel") or r.get("Channel")
        sku = r.get("product") or r.get("Product")
        tp  = r.get("topic") or r.get("Topic")
        lines.append(f"• <b>{ch}</b> — {sku}: {tp}")
    return "\n".join(lines)

def render_email_html(week_rows, ex_map):
    parts = ["<h2>Biotact — контент недели</h2>","<ul>"]
    for r in week_rows:
        ch  = r.get("channel") or r.get("Channel")
        sku = r.get("product") or r.get("Product")
        tp  = r.get("topic") or r.get("Topic")
        parts.append(f"<li><b>{ch}</b> — {sku}: {tp}</li>")
    parts.append("</ul>")
    # примеры (если есть) для SKU недели
    skus = { (r.get('product') or r.get('Product') or '').strip() for r in week_rows }
    for sku in filter(None, skus):
        ex = ex_map.get(sku, {})
        if not isinstance(ex, dict): continue
        parts.append(f"<h3>{sku}</h3>")
        for k in ("Instagram","Email","Podcast"):
            text = ex.get(k,"")
            if text: parts.append(f"<h4>{k}</h4><div style='white-space:pre-wrap'>{text}</div>")
    return "\n".join(parts)

def pick_attachments(attach_ar, attach_svg):
    files=[]
    if attach_ar:
        p = VIS/"ar_prompt.json"
        if p.exists(): files.append(str(p))
    if attach_svg:
        candidates = list(VIS.glob("*.svg"))
        if candidates: files.append(str(candidates[0]))
    return files

def run_dispatch(channel, week, tg_chat=None, recipients=None, attach_ar=False, attach_svg=False, dry_run=False):
    rows = load_plan_by_week(week)
    if not rows: return {"ok": False, "error": f"Нет строк для недели {week}"}
    if channel=="telegram":
        text = render_tg_text(rows)
        j = send_message(text, tg_chat or os.getenv("TG_CHAT_ID",""), dry_run=dry_run)
        for f in pick_attachments(attach_ar, attach_svg):
            send_document(f, tg_chat or os.getenv("TG_CHAT_ID",""), dry_run=dry_run)
        return j
    elif channel=="email":
        ex_map = load_examples_map()
        html = render_email_html(rows, ex_map)
        rcpts = recipients or []
        subj = f"Biotact — контент недели {week}"
        return send_email(rcpts, subj, html, attachments=pick_attachments(attach_ar, attach_svg), dry_run=dry_run)
    else:
        return {"ok": False, "error": "unknown channel"}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--channel", required=True, choices=["telegram","email"])
    ap.add_argument("--week", type=int, required=True)
    ap.add_argument("--tg-chat", default=None)
    ap.add_argument("--recipients", default=None, help="CSV с колонкой email")
    ap.add_argument("--attach-ar", action="store_true")
    ap.add_argument("--attach-svg", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    rcpts=None
    if args.channel=="email" and args.recipients:
        import csv
        rcpts=[]
        with open(args.recipients, encoding="utf-8") as f:
            for r in csv.DictReader(f):
                e=(r.get("email") or "").strip()
                if e: rcpts.append(e)

    res = run_dispatch(args.channel, args.week, tg_chat=args.tg_chat, recipients=rcpts,
                       attach_ar=args.attach_ar, attach_svg=args.attach_svg, dry_run=args.dry_run)
    print(res)

if __name__=="__main__":
    main()
