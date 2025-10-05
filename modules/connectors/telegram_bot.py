# -*- coding: utf-8 -*-
import os, requests, html, os.path

API = "https://api.telegram.org/bot{}/{}"
MAX_LEN = 4096  # лимит TG на 1 сообщение

def _post(method, token, data=None, files=None, timeout=30):
    """POST к Telegram c нормальной диагностикой (без raise_for_status)."""
    url = API.format(token, method)
    try:
        r = requests.post(url, data=data or {}, files=files or {}, timeout=timeout)
    except requests.RequestException as e:
        return {"ok": False, "description": f"network error: {e.__class__.__name__}: {e}", "method": method}

    # даже при 4xx пробуем вытащить JSON, чтобы получить description
    try:
        j = r.json()
    except ValueError:
        j = {}

    if not r.ok or not j.get("ok", False):
        desc = j.get("description") or r.text or f"HTTP {r.status_code}"
        return {"ok": False, "status": r.status_code, "description": desc, "method": method}

    return j

def _chunks(s: str, n: int):
    for i in range(0, len(s), n):
        yield s[i:i+n]

def send_message(
    text: str,
    chat_id: str,
    token: str | None = None,
    disable_web_page_preview: bool = True,
    dry_run: bool = False,
    parse_mode: str | None = "HTML",
):
    token = token or os.getenv("TG_BOT_TOKEN", "")
    if dry_run:
        preview = text[:120] + ("…" if len(text) > 120 else "")
        return {"ok": True, "dry_run": True, "method": "sendMessage", "text": preview}

    parts = list(_chunks(text, MAX_LEN))
    results = []

    for idx, part in enumerate(parts):
        data = {
            "chat_id": chat_id,
            "text": part,
            "disable_web_page_preview": "true" if disable_web_page_preview else "false",
        }
        # parse_mode даём только на первый кусок — меньше шансов «сломать» теги на границе
        if parse_mode and idx == 0:
            data["parse_mode"] = parse_mode

        res = _post("sendMessage", token, data=data)

        # fallback: «can't parse…» — отправляем без parse_mode, с экранированием
        if not res.get("ok") and isinstance(res.get("description"), str) and "parse" in res["description"].lower():
            data.pop("parse_mode", None)
            data["text"] = html.escape(part)
            res = _post("sendMessage", token, data=data)

        results.append(res)
        if not res.get("ok"):
            return res  # на первой ошибке выходим и отдаём её наверх

    return {"ok": True, "parts": results}

def send_document(path: str, chat_id: str, caption: str = "", token: str | None = None, dry_run: bool = False):
    token = token or os.getenv("TG_BOT_TOKEN", "")
    if dry_run:
        return {"ok": True, "dry_run": True, "method": "sendDocument", "file": os.path.basename(path)}

    if not os.path.exists(path):
        return {"ok": False, "description": f"file not found: {path}", "method": "sendDocument"}

    with open(path, "rb") as f:
        return _post(
            "sendDocument",
            token,
            data={"chat_id": chat_id, "caption": caption},
            files={"document": f},
        )

