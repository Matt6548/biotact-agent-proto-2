import os, sys, json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)

CFG_DIR  = os.path.join(ROOT_DIR, "config")
CFG_PATH = os.path.join(CFG_DIR, "settings.json")
os.makedirs(CFG_DIR, exist_ok=True)

def load_cfg():
    if os.path.exists(CFG_PATH):
        try:
            with open(CFG_PATH, "r", encoding="utf-8") as f:
                return json.load(f) or {}
        except Exception:
            return {}
    return {}

def save_cfg(data: dict):
    with open(CFG_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def apply_env_from_cfg():
    cfg = load_cfg()
    for k, v in cfg.items():
        if v is None: 
            continue
        os.environ[k] = str(v)
    return cfg

class Handler(BaseHTTPRequestHandler):
    server_version = "BiotactControl/0.2"

    # -- служебные
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")

    def _send(self, code=200, body=None, ctype="application/json"):
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", ctype)
        self.end_headers()
        if body is None:
            body = {}
        if isinstance(body, (dict, list)):
            body = json.dumps(body, ensure_ascii=False).encode("utf-8")
        elif isinstance(body, str):
            body = body.encode("utf-8", "ignore")
        self.wfile.write(body)

    def _read_json(self):
        ln = int(self.headers.get("Content-Length") or 0)
        if ln <= 0: 
            return {}
        try:
            raw = self.rfile.read(ln)
            return json.loads(raw.decode("utf-8"))
        except Exception:
            return {}

    # -- CORS preflight
    def do_OPTIONS(self):
        self._send(200, "")

    # -- GET
    def do_GET(self):
        path = urlparse(self.path).path
        if path in ("/", "/api/ping"):
            self._send(200, {"ok": True, "service": "biotact-control"})
            return
        if path == "/settings":
            self._send(200, load_cfg())
            return
        self._send(404, {"ok": False, "error": "not found"})

    # -- POST
    def do_POST(self):
        path = urlparse(self.path).path

        if path == "/settings":
            current = load_cfg()
            incoming = self._read_json()
            if not isinstance(incoming, dict):
                self._send(400, {"ok": False, "error": "bad json"})
                return
            # обновляем только непустые ключи
            for k, v in incoming.items():
                if v not in ("", None):
                    current[k] = v
            save_cfg(current)
            self._send(200, {"ok": True, "saved": list(incoming.keys())})
            return

        if path in ("/send/telegram", "/send/email"):
            payload = self._read_json()
            if not isinstance(payload, dict):
                payload = {}
            week       = int(payload.get("week", 1))
            dry_run    = bool(payload.get("dry_run", False))
            attach_ar  = bool(payload.get("attach_ar", False))
            attach_svg = bool(payload.get("attach_svg", False))
            recipients = payload.get("recipients_csv")

            # Подтягиваем конфиг в ENV — так же, как делает твой диспетчер
            cfg = apply_env_from_cfg()

            try:
                sys.path.append(ROOT_DIR)
                from scripts.dispatch import run_dispatch
                channel = "telegram" if path.endswith("telegram") else "email"
                result = run_dispatch(
                    channel, week,
                    tg_chat=None,               # панель уже хранит TG_CHAT_ID в settings.json
                    recipients=recipients,
                    attach_ar=attach_ar,
                    attach_svg=attach_svg,
                    dry_run=dry_run
                )
                # run_dispatch может вернуть dict/str — приводим к json-ответу
                if isinstance(result, (dict, list)):
                    self._send(200, result)
                else:
                    self._send(200, {"ok": True, "result": str(result)})
            except Exception as e:
                self._send(500, {"ok": False, "error": str(e)})
            return

        self._send(404, {"ok": False, "error": "not found"})

def main():
    port = int(os.environ.get("PORT", "8765"))
    httpd = HTTPServer(("127.0.0.1", port), Handler)
    print(f"Control server on http://127.0.0.1:{port}")
    httpd.serve_forever()

if __name__ == "__main__":
    main()
