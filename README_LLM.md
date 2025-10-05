
# LLM‑режим для генерации контента

## Установка
```bash
pip install -r requirements.txt
cp .env.example .env  # вставьте OPENAI_API_KEY
```

## Запуск
```bash
python main.py --mode llm --quarter Q4-2025 --examples 3 --per-week 5 --lang ru --style "дружелюбно, экспертно"
```

Выход:
- `exports/examples_llm/` — Instagram/Podcast/Email как .txt и AR как .json
- `exports/plan_Q4_2025.csv` — план
- `exports/insights.json` — инсайты

> Если ключ не задан, скрипт вернёт fallback `[LLM OFF] …`.
