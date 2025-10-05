# -*- coding: utf-8 -*-
import json, os, requests
from pathlib import Path

def export_json(obj, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")
    return str(path)

def export_csv_text(text: str, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return str(path)

# Заготовки под Notion/Sheets (в реале нужны токены/ids)
def export_to_notion_stub(page_id: str, title: str, content: str):
    # оставить stub, показать масштабируемость
    return {"status":"stub", "page_id":page_id, "title":title, "size":len(content)}

def export_to_sheets_stub(sheet_id: str, csv_text: str):
    return {"status":"stub", "sheet_id":sheet_id, "rows":len(csv_text.splitlines())}
