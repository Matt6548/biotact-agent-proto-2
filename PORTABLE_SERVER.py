#!/usr/bin/env python3
import argparse
import functools
import http.server
import socketserver
from pathlib import Path

SECURITY_HEADERS = {
    "Content-Security-Policy": (
        "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; "
        "worker-src 'self' blob:; connect-src 'self'; img-src 'self' data: blob:; "
        "media-src 'self' blob:; style-src 'self' 'unsafe-inline'; font-src 'self'; "
        "object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    ),
    "Permissions-Policy": "camera=(self), microphone=(), geolocation=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Cache-Control": "no-store",
}

class TrainingHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".wasm": "application/wasm",
        ".mjs": "text/javascript",
    }

    def end_headers(self):
        for key, value in SECURITY_HEADERS.items():
            self.send_header(key, value)
        super().end_headers()

    def log_message(self, format, *args):
        print("[demo-server] " + (format % args))

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

def main():
    parser = argparse.ArgumentParser(description="Local secure-header server for Martial Training Lab")
    parser.add_argument("--root", default="dist", help="Built app directory")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args()

    root = Path(args.root).resolve()
    index = root / "index.html"
    if not index.is_file():
        raise SystemExit(f"Built demo missing: {index}")

    handler = functools.partial(TrainingHandler, directory=str(root))
    with ReusableTCPServer((args.host, args.port), handler) as httpd:
        print(f"Martial Training Lab demo: http://{args.host}:{args.port}")
        print("Close this window to stop the local demo.")
        httpd.serve_forever()

if __name__ == "__main__":
    main()
