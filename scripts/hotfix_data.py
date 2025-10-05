# -*- coding: utf-8 -*-
import csv, re, sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
plan_csv = root / "exports" / "plan_Q4_2025_justified.csv"

if not plan_csv.exists():
    print(f"[hotfix] Не найден {plan_csv}")
    sys.exit(0)

rows = []
with plan_csv.open("r", encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)
    rows = list(reader)

def norm_spaces(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip()

def short(s: str, n=420) -> str:
    s = norm_spaces(s)
    return (s[:n-1] + "…") if len(s) > n else s

# Мэппинг форматов по каналам
fmt_map = {
    "Instagram": ("Reels", "Карусель", "Сторис"),
    "YouTube": ("Видео",),
    "Site": ("Статья", "Гайд/Чек-лист"),
    "Email": ("Рассылка", "Email"),
    "Podcast": ("Выпуск", "Подкаст"),
    "Partners": ("POS",),
    "AR": ("AR",),
}

fixed = []
for r in rows:
    ch = (r.get("Channel") or "").strip()
    topic = r.get("Topic") or ""
    fmt = r.get("Format") or ""

    # 1) Чиним формат под канал
    if ch in fmt_map and not any(t in fmt for t in fmt_map[ch]):
        # эвристика для IG
        if ch == "Instagram" and "Reels" in topic:
            r["Format"] = "Reels"
        elif ch == "Site" and ("Гайд" in topic or "Чек-лист" in topic):
            r["Format"] = "Гайд/Чек-лист"
        else:
            r["Format"] = fmt_map[ch][0]

    # 2) Подчищаем и укорачиваем rationale
    r["Rationale"] = short(r.get("Rationale", ""), 420)

    fixed.append(r)

# Перезаписываем CSV тем же составом колонок
fieldnames = rows[0].keys() if rows else []
with plan_csv.open("w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fieldnames)
    w.writeheader()
    for r in fixed:
        w.writerow(r)

print("[hotfix] plan_Q4_2025_justified.csv: формат/обоснование — ОК")
