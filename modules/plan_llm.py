# -*- coding: utf-8 -*-
"""
Лёгкий планировщик без внешних зависимостей.
Экспортирует: build_plan(products, quarter="Q4-2025", per_week=5, lang="ru", style="дружелюбно, экспертно")
Возвращает список словарей с ключами:
  week, dates, channel, product, topic, goal, format, rationale
"""

from datetime import date, timedelta
from typing import Dict, List

# --- утилиты дат ---
def _quarter_start_end(quarter: str):
    # "Q4-2025" -> (start_date, end_date) для 12 недель
    q, y = quarter.split("-")
    year = int(y)
    if q.upper() == "Q4":
        m = 10
    elif q.upper() == "Q3":
        m = 7
    elif q.upper() == "Q2":
        m = 4
    else:
        m = 1
    first = date(year, m, 1)
    # хотим понедельник той недели, где лежит 1-е число
    start = first - timedelta(days=first.weekday())
    end = start + timedelta(weeks=12, days=-1)
    return start, end

def _week_range(start_monday: date, i: int):
    d0 = start_monday + timedelta(weeks=i)
    d1 = d0 + timedelta(days=6)
    return d0.isoformat() + "–" + d1.isoformat()

# --- словари по каналам ---
_FMT_BY_CH = {
    "instagram": "Пост",
    "site": "Статья",
    "email": "Рассылка",
    "podcast": "Выпуск 10–12 мин",
    "youtube": "Видео",
    "partners": "POS",
    "ar": "AR-фильтр",
}

_TOPICS = {
    "instagram": [
        "Reels: 3 признака/лайфхак",
        "Карусель: мини-гайд + чек-лист",
        "UGC: отзыв/история недели",
        "Пост: миф vs факт",
    ],
    "site": [
        "Гайд/Чек-лист",
        "FAQ по продукту",
        "Статья: сезонные советы",
    ],
    "email": [
        "Персонализированная рассылка + bundle",
        "Письмо-подборка: сезонные продукты",
        "Ремайндер + промокод",
    ],
    "podcast": [
        "Inside Talk: мини-выпуск 10–12 мин",
        "Q&A с экспертом (10 мин)",
    ],
    "youtube": [
        "Biotact Inside: 5 минут простым языком",
        "Demo/How-to 4–6 мин",
    ],
    "partners": [
        "POS-видео/плакат + QR",
        "Совместная полка: POS и QR",
    ],
    "ar": [
        "AR-фильтр/скан баночки",
    ],
}

_GOALS = ["Осведомленность", "Доверие", "Лояльность", "Продажи"]

def _short_rationale(week_id: int, quarter: str) -> str:
    return (
        f"Неделя {week_id} ({quarter}): фокус на сезонности Q4 — иммунитет, энергия, подготовка к праздникам. "
        f"Связка каналов: соцсети → сайт/FAQ → email, плюс Inside/Talk/Pulse для экспертности. "
        f"Формулировки осторожные: «поддерживает/способствует»."
    )

def _pick(lst: List[str], idx: int) -> str:
    return lst[idx % len(lst)]

def _products_from_data(products: Dict) -> List[str]:
    # products может быть dict вида {SKU: "описание..."} или сложнее
    if not products:  # дефолтный набор
        return ["IMMUNOCOMPLEX", "IMMUNOCOMPLEX_KIDS", "BIFOLAK_ZINCUM_C_D3", "BIFOLAK_MAGNIY", "DERMACOMPLEX", "OPHTALMOCOMPLEX", "CALCIY_TRIACTIVE_D3"]
    keys = [str(k).upper() for k in products.keys()]
    # слегка нормализуем
    return [k.replace(" ", "_") for k in keys]

def build_plan(products: Dict, quarter: str = "Q4-2025", per_week: int = 5, lang: str = "ru", style: str = "дружелюбно, экспертно") -> List[Dict]:
    """
    Дет-генератор плана на 12 недель, без сетевых вызовов.
    """
    per_week = max(4, min(7, int(per_week or 5)))  # 4..7
    ch_cycle = ["instagram", "site", "email", "partners", "youtube", "podcast", "ar"]
    sku_cycle = _products_from_data(products)

    start, _ = _quarter_start_end(quarter)
    rows: List[Dict] = []
    week = 1
    for i in range(12):
        dates = _week_range(start, i)
        for j in range(per_week):
            ch = ch_cycle[(i + j) % len(ch_cycle)]
            sku = sku_cycle[(i + j) % len(sku_cycle)]
            topic = _pick(_TOPICS[ch], i + j)
            goal  = _pick(_GOALS, i + j)
            fmt   = _FMT_BY_CH.get(ch, "Пост")
            rows.append({
                "week": week,
                "dates": dates,
                "channel": ch.capitalize() if ch != "ar" else "AR",
                "product": sku,
                "topic": topic,
                "goal": goal,
                "format": fmt,
                "rationale": _short_rationale(week, quarter),
            })
        week += 1
    return rows
