Biotact IE-Agent — локальная панель и статический сайт
Set-Content README.md @'
# Biotact IE-Agent (Q4 2025)

Статический сайт (docs/) + локальная панель (site/panel.html, site/control.html).
Секреты не коммитим: `.env`, `config/settings.json`, `recipients.csv`.

## Быстрый старт (локально)
```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python scripts\control_server.py
