# -*- coding: utf-8 -*-

from datetime import date, timedelta
import random

CHANNELS = ["Instagram","YouTube","Site","Podcast","Email","Partners","AR"]

def generate_weeks(start_date, weeks=12):
    # Start from next Monday for neat weeks
    d = start_date
    while d.weekday() != 0:
        d += timedelta(days=1)
    return [(d + timedelta(weeks=i), d + timedelta(weeks=i, days=6)) for i in range(weeks)]

def plan(products, quarter="Q4-2025", per_week=4, start_date=date(2025,9,29)):
    weeks = generate_weeks(start_date, weeks=12)
    rows = []
    rnd = random.Random(42)
    for widx, (ws, we) in enumerate(weeks, start=1):
        # rotate priority products weekly
        prods = products[widx % len(products):] + products[:widx % len(products)]
        pick = prods[:per_week]
        for p in pick:
            channels = p.get("channels_hint", []) or CHANNELS
            ch = rnd.choice(channels)
            topic = {
                "Instagram": "Reels: 3 РїСЂРёР·РЅР°РєР°/Р»Р°Р№С„С…Р°Рє",
                "YouTube": "Biotact Inside: 5 РјРёРЅСѓС‚ РїСЂРѕСЃС‚С‹Рј СЏР·С‹РєРѕРј",
                "Site": "Р“Р°Р№Рґ/Р§РµРє-Р»РёСЃС‚",
                "Podcast": "Inside Talk: РјРёРЅРё-РІС‹РїСѓСЃРє 10вЂ“12 РјРёРЅ",
                "Email": "РџРµСЂСЃРѕРЅР°Р»РёР·РёСЂРѕРІР°РЅРЅР°СЏ СЂР°СЃСЃС‹Р»РєР° + bundle",
                "Partners": "POS-РІРёРґРµРѕ/РїР»Р°РєР°С‚ + QR",
                "AR": "AR-С„РёР»СЊС‚СЂ/СЃРєР°РЅ Р±Р°РЅРѕС‡РєРё"
            }[ch]
            rows.append({
                "week": widx,
                "start": ws.isoformat(),
                "end": we.isoformat(),
                "channel": ch,
                "topic": topic,
                "product": p["sku"],
                "goal": rnd.choice(["РћСЃРІРµРґРѕРјР»РµРЅРЅРѕСЃС‚СЊ","Р”РѕРІРµСЂРёРµ","Р›РѕСЏР»СЊРЅРѕСЃС‚СЊ","РџСЂРѕРґР°Р¶Рё"]),
                "format": rnd.choice(["РљР°СЂСѓСЃРµР»СЊ","Reels","РЎС‚Р°С‚СЊСЏ","Р’РёРґРµРѕ","РџРѕРґРєР°СЃС‚","Email","POS","AR"]),
            })
    return rows
