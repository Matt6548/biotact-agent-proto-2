
# Как запустить в Visual Studio Code (Windows)

1) Открой папку `biotact_agent` в VS Code (File → Open Folder).
2) Установи Python 3.10+ и расширение **Python** для VS Code.
3) (Опционально) Создай виртуальное окружение:
   ```powershell
   py -3 -m venv .venv
   .venv\Scripts\Activate.ps1
   ```
4) Запусти из Debug панели конфигурацию **Run Agent (default)** или **Run Agent (full plan 5/week)**.
   - Или двойным кликом `run_default.bat` / `run_full_plan.bat` в Проводнике.

# Linux/macOS
```bash
python3 -m venv .venv
source .venv/bin/activate
python main.py --quarter Q4-2025 --examples 3 --per-week 5
```

Выходные файлы смотри в папке `exports/` и `examples/`/`examples_polished/`.
