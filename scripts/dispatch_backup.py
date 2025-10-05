# -*- coding: utf-8 -*-
# scripts/dispatch.py
import os, csv, json, argparse, textwrap
from pathlib import Path
from datetime import datetime

from modules.connectors.telegram_bot import send_message, send_document
from modules.connectors.email_smtp   import send_bulk_html

ROOT = Path(__file__).resolve().parents[1]
EXP  = ROOT/"exports"
PLAN = EXP/"plan_Q4_2025.csv"          # СѓР¶Рµ РіРµРЅРµСЂРёС‚СЃСЏ
EXJS = EXP/"examples.json"             # СѓР¶Рµ РіРµРЅРµСЂРёС‚СЃСЏ
ARJS = EXP/"visuals"/"ar_prompt.json"  # СѓР¶Рµ РіРµРЅРµСЂРёС‚СЃСЏ
SVG  = EXP/"visuals"/"poster_Immunocomplex.svg"  # РїСЂРёРјРµСЂ РїРѕСЃС‚РµСЂР°

def _load_plan():
    rows=[]
    with open(PLAN, encoding="utf-8") as f:
        r=csv.DictReader(f)
        for row in r: rows.append(row)
    return rows

def _load_examples():
    if EXJS.exists():
        return json.loads(EXJS.read_text(encoding="utf-8"))
    # fallback РЅР° examples_ready.json
    alt = EXP/"examples_ready.json"
    return json.loads(alt.read_text(encoding="utf-8"))

def _pick_week(rows, wk: int):
    return [r for r in rows if str(r.get("week"))==str(wk)]

def _render_telegram_block(plan_rows, examples):
    lines = ["<b>Biotact вЂ” Q4 РєРѕРЅС‚РµРЅС‚ (РЅРµРґРµР»СЏ)</b>"]
    for r in plan_rows[:5]:
        lines.append(f"вЂў <b>{r['channel']}</b> вЂ” {r['product']}: {r['topic']}")
    lines.append("")
    # РєРѕСЂРѕС‚РєРёР№ РїРѕСЃС‚ РёР· РїСЂРёРјРµСЂРѕРІ
    try:
        ig = examples["IMMUNOCOMPLEX"]["Instagram"][:400]
        lines.append("<b>РџРѕСЃС‚ (РїСЂРёРјРµСЂ):</b>")
        lines.append(ig)
    except Exception:
        pass
    lines.append("\n<i>Р¤РѕСЂРјСѓР»РёСЂРѕРІРєРё: В«РїРѕРґРґРµСЂР¶РёРІР°РµС‚/СЃРїРѕСЃРѕР±СЃС‚РІСѓРµС‚В».</i>")
    return "\n".join(lines)

def _render_email_html(plan_rows, examples):
    bullets = "".join([f"<li><b>{r['channel']}</b> вЂ” {r['product']}: {r['topic']}</li>" for r in plan_rows[:6]])
    body = f"""
    <html><body style="font-family:Arial">
    <h2>Biotact вЂ” РљРѕРЅС‚РµРЅС‚ РЅРµРґРµР»Рё</h2>
    <ul>{bullets}</ul>
    <hr>
    <p><b>РџСЂРёРјРµСЂ РїРѕСЃС‚Р°:</b></p>
    <div style="white-space:pre-wrap">{examples.get('IMMUNOCOMPLEX',{}).get('Instagram','')}</div>
    <hr>
    <p style="font-size:12px;opacity:.7">РРЅС„Рѕ-РјР°С‚РµСЂРёР°Р», РЅРµ СЏРІР»СЏРµС‚СЃСЏ РјРµРґРёС†РёРЅСЃРєРѕР№ СЂРµРєРѕРјРµРЅРґР°С†РёРµР№. Р¤РѕСЂРјСѓР»РёСЂРѕРІРєРё: В«РїРѕРґРґРµСЂР¶РёРІР°РµС‚/СЃРїРѕСЃРѕР±СЃС‚РІСѓРµС‚В».</p>
    </body></html>
    """
    return body

def _load_recipients_csv(path: Path):
    people=[]
    with open(path, encoding="utf-8") as f:
        r=csv.DictReader(f)
        for row in r:
            people.append((row.get("email","").strip(), row.get("name","").strip()))
    return [(e,n) for (e,n) in people if e]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--week", type=int, required=True, help="РќРµРґРµР»СЏ 1..12")
    ap.add_argument("--channel", choices=["telegram","email"], required=True)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--tg-chat", default=os.getenv("TG_CHAT_ID",""))
    ap.add_argument("--recipients", help="CSV СЃ РєРѕР»РѕРЅРєР°РјРё: email,name")
    ap.add_argument("--attach-ar", action="store_true", help="РїСЂРёРєСЂРµРїРёС‚СЊ ar_prompt.json")
    ap.add_argument("--attach-svg", action="store_true", help="РїСЂРёРєСЂРµРїРёС‚СЊ РїРѕСЃС‚РµСЂ SVG")
    args=ap.parse_args()

    plan     = _load_plan()
    examples = _load_examples()
    week_rows= _pick_week(plan, args.week)
    if not week_rows: raise SystemExit(f"Р’ РїР»Р°РЅРµ РЅРµС‚ РЅРµРґРµР»Рё {args.week}")

    EXP.joinpath("logs").mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    if args.channel=="telegram":
        text = _render_telegram_block(week_rows, examples)
        j = send_message(text, chat_id=args.tg_chat, dry_run=args.dry_run)
        print("[TG] sendMessage:", j)
        if args.attach_ar and ARJS.exists():
            j = send_document(ARJS.read_bytes(), "ar_prompt.json", "AR-РїСЂРѕРјРїС‚", args.tg_chat, dry_run=args.dry_run)
            print("[TG] sendDocument ar_prompt.json:", j)
        if args.attach_svg and SVG.exists():
            j = send_document(SVG.read_bytes(), "poster.svg", "РџРѕСЃС‚РµСЂ (draft)", args.tg_chat, dry_run=args.dry_run)
            print("[TG] sendDocument poster.svg:", j)

    elif args.channel=="email":
        if not args.recipients: raise SystemExit("--recipients РѕР±СЏР·Р°С‚РµР»РµРЅ РґР»СЏ email")
        rcpts = _load_recipients_csv(Path(args.recipients))
        html  = _render_email_html(week_rows, examples)
        atts=[]
        if args.attach_ar and ARJS.exists(): atts.append(str(ARJS))
        if args.attach_svg and SVG.exists(): atts.append(str(SVG))
        res = send_bulk_html(subject=f"Biotact вЂ” РЅРµРґРµР»СЏ {args.week} (РєРѕРЅС‚РµРЅС‚-РїР°РєРµС‚)",
                             html=html, recipients=rcpts,
                             attachments=atts, dry_run=args.dry_run)
        print("[EMAIL]", res)

    # Р»РѕРі
    Path(EXP/"logs"/f"dispatch_{args.channel}_w{args.week}_{stamp}.txt").write_text(
        json.dumps({"week":args.week,"channel":args.channel,"dry_run":args.dry_run}, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

if __name__=="__main__":
    main()
# --- hotfix: robust examples handling and HTML render ---
def _coerce_examples(examples):
    if isinstance(examples, dict):
        return examples
    d={}
    try:
        for rec in examples or []:
            sku = (rec.get("sku") or rec.get("product") or rec.get("name") or "").strip()
            if not sku: 
                continue
            if "channel" in rec and "text" in rec:
                d.setdefault(sku, {})[rec.get("channel")] = rec.get("text","")
            else:
                tmp={}
                for ch in ("Instagram","Email","Podcast"):
                    val = rec.get(ch)
                    if isinstance(val, str) and val.strip():
                        tmp[ch]=val
                if tmp:
                    d.setdefault(sku, {}).update(tmp)
    except Exception:
        pass
    return d

def _render_email_html(week_rows, examples):
    ex = _coerce_examples(examples)
    def _pick_example(sku, channel_order=("Email","Instagram","Podcast")):
        e = ex.get(sku, {})
        for ch in channel_order:
            if e.get(ch):
                return f"<h4>{sku} — {ch}</h4><div style='white-space:pre-wrap'>{e[ch]}</div>"
        return ""
    items=[]
    for r in week_rows[:10]:
        items.append(f"<li><b>{r['channel']}</b> — {r['product']}: {r['topic']} ({r['goal']}/{r['format']})</li>")
    body = "".join(items)
    products = [r["product"] for r in week_rows]
    examples_html = "".join(_pick_example(sku) for sku in dict.fromkeys(products))
    return f"""<html><body>
    <h3>Biotact — Q4 контент, неделя {week_rows[0]['week'] if week_rows else ''}</h3>
    <ul>{body}</ul>
    {examples_html}
    <p style="font-size:12px;color:#666">Автосгенерировано прототипом IE-Agent. Формулировки «поддерживает/способствует».</p>
    </body></html>"""
# --- end hotfix ---
