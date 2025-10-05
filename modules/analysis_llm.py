# -*- coding: utf-8 -*-
import json, textwrap, os
from pathlib import Path
from typing import List, Dict
import requests

def _fallback_analysis(products: List[Dict], quarter: str) -> str:
    # Генерируем 350–450 слов без LLM, на основе списка продуктов
    names = [p.get("name") for p in products]
    skus = [p.get("sku") for p in products]
    cats = []
    for p in products:
        cats.append(f"{p.get('name')} — аудитория: {', '.join(p.get('audience', [])) or 'семьи/взрослые'}; выгоды: {', '.join(p.get('benefits', [])) or 'wellness/поддержка'}")
    body = (
        f"Обзор продуктовой линейки Biotact для {quarter}. В фокусе сезона Q4 — поддержка иммунитета, энергия, восстановление после лета и подготовка к праздникам, а также wellness-подход.\n\n"
        "Ключевые направления:\n"
        "• Иммунитет и защита в сезон простуд (IMMUNOCOMPLEX / KIDS, BIFOLAK ZINCUM, BIFOLAK ACTIVE/NEO).\n"
        "• Кожа/волосы/ногти и внешний вид к праздникам (DERMACOMPLEX).\n"
        "• Зрение и цифровая нагрузка в учебно-рабочем ритме (OPHTALMOCOMPLEX).\n"
        "• Спокойствие, сон и анти-стресс (BIFOLAK MAGNIY), а также кости/рост/витамин D (CALCIY TRIACTIVE D3).\n\n"
        "Интеграция с медиаэкосистемой:\n"
        "• Biotact Inside — научный разбор активов и безопасных формулировок («поддерживает», «способствует»).\n"
        "• Biotact Talk — рецепты и привычки для семьи (кулинарные рубрики в связке с продуктами).\n"
        "• Biotact Pulse — активный образ жизни, трекинг маленьких шагов к цели.\n"
        "• Biotact Partners — коллаборации с аптеками/retail (POS-материалы, QR-коды).\n\n"
        "ЦА: семьи и взрослые 25–50, дети (по продукту), аудитории beauty/office/wellness. Сообщения строятся на языке поддержки без медицинских обещаний. "
        "Механики: сезонные пачки контента (соцсети + блог сайта), подкаст-эпизоды, email-серии и простые AR-элементы для вовлечения.\n\n"
        "Продукты и позиционирование:\n"
        + "\n".join([f"• {c}" for c in cats]) +
        "\n\nИтог: в {quarter} используем календарь из 12 недель с пиками коммуникации в начале октября (старт сезона), в конце ноября (праздничная подготовка) и в декабре (итоги/подарочные наборы). Кросс-канальная связка (соцсети → сайт → email → подкаст + AR/QR) поддерживает узнаваемость и конверсию в продажи, сохраняя корректный, безопасный тон."
    )
    return body

def _llm(prompt: str, products: List[Dict], quarter: str) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    timeout = int(os.getenv("OPENAI_TIMEOUT","30"))
    if not api_key:
        return "[LLM OFF]\n" + _fallback_analysis(products, quarter)
    url = os.getenv("OPENAI_BASE_URL","https://api.openai.com/v1/chat/completions")
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type":"application/json"}
    data = {
        "model": model,
        "temperature": float(os.getenv("OPENAI_TEMPERATURE","0.7")),
        "messages": [
            {"role":"system","content":"Ты маркетолог-редактор. Пиши безопасно и корректно, без медицинских обещаний."},
            {"role":"user","content": prompt}
        ]
    }
    try:
        r = requests.post(url, headers=headers, json=data, timeout=timeout)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return f"[LLM ERROR] {e}\n\n" + _fallback_analysis(products, quarter)

def analyze_products(products: List[Dict], quarter="Q4-2025") -> str:
    # Информативный промпт (на случай если LLM доступен)
    lines = []
    for p in products:
        lines.append(f"- {p.get('name')} ({p.get('sku','')}) — audience: {', '.join(p.get('audience',[]))}; benefits: {', '.join(p.get('benefits',[]))}; pillars: {', '.join(p.get('pillars',[]))}")
    base = "\n".join(lines)
    prompt = f"""
Сформируй аналитический обзор (300–500 слов) по продуктовой линейке Biotact с фокусом на {quarter}.
Дай: сильные стороны/сезонные тренды (Q4: иммунитет, энергия, восстановление, праздники, wellness),
ЦА (семьи, дети, 25–50), интеграцию с образом жизни (Biotact Talk/Inside/Pulse/Partners).
Избегай медицинских обещаний — формулировки: «поддерживает», «способствует».
Данные по продуктам:
{base}
"""
    return _llm(prompt, products, quarter)
