# -*- coding: utf-8 -*-
"""
Локальные визуалы без внешних зависимостей:
- generate_ar_prompt(sku: str) -> str(JSON)
- generate_image(prompt: str, out_path: str | Path) -> str(путь к SVG)

Никаких сетевых вызовов. Поддерживает безопасные формулировки и простой бренд-постер.
"""

import json, re
from pathlib import Path
from datetime import datetime

def _slug(s: str) -> str:
    return re.sub(r'[^A-Za-z0-9]+','_', s).strip('_')

def generate_ar_prompt(sku: str = "IMMUNOCOMPLEX") -> str:
    """Возвращает JSON-строку с описанием AR-сцены (объект, оверлеи, CTA, слоган)."""
    sku_up = (sku or "IMMUNOCOMPLEX").upper()
    overlays = [
        "иконки активов (напр. витамин C, цинк, пробиотики)",
        "подпись: «Сканируй — узнай состав»",
        "ссылка (QR) на страницу товара/FAQ"
    ]
    if "KIDS" in sku_up:
        slogan = "Поддержка детского иммунитета каждый день"
    elif "DERMA" in sku_up:
        slogan = "Красота начинается изнутри"
    elif "ZINCUM" in sku_up:
        slogan = "Баланс каждый день"
    else:
        slogan = "Поддержка каждый день"

    data = {
        "sku": sku_up,
        "object": f"Банка {sku_up} на светлом фоне",
        "environment": "мягкий свет, лёгкая тень, минимализм",
        "overlays": overlays,
        "cta": "Подробнее",
        "slogan": slogan,
        "disclaimer": "Информационный материал. Формулировки «поддерживает/способствует». Не является мед. рекомендацией.",
        "ts": datetime.utcnow().isoformat()+"Z"
    }
    return json.dumps(data, ensure_ascii=False, indent=2)

def generate_image(prompt: str, out_path):
    """
    Рисует простой SVG-постер 1200x630 с бренд-плашкой и текстом промпта.
    Возвращает строку-путь к созданному файлу.
    """
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    text = re.sub(r'\s+',' ', (prompt or '')).strip()
    if not text:
        text = "Biotact — поддержка каждый день"

    # заголовок = первые 6–8 слов, подзаголовок — остаток, с безопасной длиной
    words = text.split()
    title = " ".join(words[:8])
    subtitle = " ".join(words[8:50])

    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0A1830"/>
      <stop offset="100%" stop-color="#103969"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>

  <rect width="1200" height="630" fill="url(#g)"/>

  <!-- карточка -->
  <rect x="80" y="90" rx="28" ry="28" width="1040" height="450" fill="#FFFFFF" filter="url(#shadow)"/>
  <rect x="80" y="90" rx="28" ry="28" width="1040" height="450" fill="none" stroke="#E6E8EE"/>

  <!-- «банка» как минималистичная фигура -->
  <g transform="translate(120,160)">
    <rect x="0" y="0" rx="20" ry="20" width="220" height="280" fill="#F6F8FB" stroke="#E6E8EE"/>
    <rect x="20" y="30" rx="12" ry="12" width="180" height="200" fill="#00A3A3" opacity="0.10"/>
    <rect x="40" y="240" rx="8" ry="8" width="140" height="20" fill="#E6E8EE"/>
  </g>

  <!-- текст -->
  <text x="380" y="210" font-family="Segoe UI, Arial, sans-serif" font-size="40" fill="#0A1830" font-weight="700">{title}</text>
  <foreignObject x="380" y="240" width="700" height="240">
    <body xmlns="http://www.w3.org/1999/xhtml">
      <div style="font-family: Segoe UI, Arial, sans-serif; color:#1C1C1C; font-size:22px; line-height:1.45;">
        {subtitle}
        <div style="margin-top:16px; font-size:14px; opacity:.75;">
          Дисклеймер: информационный материал. Формулировки «поддерживает/способствует».
        </div>
      </div>
    </body>
  </foreignObject>

  <!-- бренд-плашка -->
  <g transform="translate(80,560)">
    <rect x="0" y="0" rx="10" ry="10" width="180" height="36" fill="#00A3A3"/>
    <text x="14" y="24" font-family="Segoe UI, Arial, sans-serif" font-size="18" fill="#FFFFFF" font-weight="600">BIOTACT</text>
  </g>
</svg>
'''
    out_path.write_text(svg, encoding="utf-8")
    return str(out_path)
