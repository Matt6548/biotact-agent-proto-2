# -*- coding: utf-8 -*-

from datetime import date
from collections import defaultdict

SEASON_PRIORITY = {
    "РѕСЃРµРЅСЊ": 3, "Р·РёРјР°": 3, "РїРµСЂРµРґ РїСЂР°Р·РґРЅРёРєР°РјРё": 2, "РєСЂСѓРіР»С‹Р№ РіРѕРґ": 1
}

def seasonal_score(prod, quarter: str):
    # Simple heuristic: Q4 -> РѕСЃРµРЅСЊ/Р·РёРјР°/РїРµСЂРµРґ РїСЂР°Р·РґРЅРёРєР°РјРё
    season_map = {"Q4": ["РѕСЃРµРЅСЊ", "Р·РёРјР°", "РїРµСЂРµРґ РїСЂР°Р·РґРЅРёРєР°РјРё"]}
    targets = season_map.get(quarter.split('-')[0], [])
    score = 0
    for s in prod.get("seasonality", []):
        if s in targets:
            score += SEASON_PRIORITY.get(s, 1)
    return score

def pick_priority_products(products, quarter="Q4-2025", k=4):
    scored = [(seasonal_score(p, quarter), p) for p in products]
    scored.sort(key=lambda x: x[0], reverse=True)
    return [p for _, p in scored[:k]]

def insights(products, quarter="Q4-2025"):
    notes = []
    prio = pick_priority_products(products, quarter, k=min(5, len(products)))
    for p in prio:
        notes.append({
            "sku": p["sku"],
            "insight": f"{p['name']}: С„РѕРєСѓСЃ РЅР° {', '.join(p['benefits'][:2])}; 'РїРёР»Р»Р°СЂС‹': {', '.join(p['pillars'][:3])}."
        })
    return notes
