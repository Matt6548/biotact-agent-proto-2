# -*- coding: utf-8 -*-
"""
recommend_targeting(x: Union[Dict,List,str], quarter="Q4-2025") -> List[Dict]
Возвращает рекомендации (аудитория, бюджет, KPI) для 3 SKU.
Принимает: список SKU, dict продуктов или одиночную строку.
Сохраняет в exports/targeting_recommendations.json (читает GUI/сайт).
"""

import json
from pathlib import Path
from typing import Dict, List, Iterable, Union

EXPORTS = Path(__file__).resolve().parents[1] / "exports"
EXPORTS.mkdir(parents=True, exist_ok=True)
TARGET_PATH = EXPORTS / "targeting_recommendations.json"

_DEF_SKUS = ["IMMUNOCOMPLEX", "IMMUNOCOMPLEX_KIDS", "BIFOLAK_ZINCUM_C_D3"]

def _normalize_skus(x: Union[Dict, List, str, None]) -> List[str]:
    out: List[str] = []
    if x is None:
        out = list(_DEF_SKUS)
    else:
        if isinstance(x, dict):
            iterable = x.keys()
        elif isinstance(x, (list, tuple, set)):
            iterable = x
        else:
            iterable = [x]
        for k in iterable:
            sku = ""
            if isinstance(k, str):
                sku = k
            else:
                try:
                    sku = (k.get("sku") or k.get("name") or str(k))
                except Exception:
                    sku = str(k)
            sku = sku.upper().replace(" ", "_")
            if sku and sku not in out:
                out.append(sku)
    # дополним дефолтами до 3 позиций
    for s in _DEF_SKUS:
        if len(out) >= 3: break
        if s not in out:
            out.append(s)
    return out[:3]

def _audience_for(sku: str) -> Dict:
    if "KIDS" in sku:
        return {"age":"25-45 (родители)", "gender":"all",
                "interests":["дети","школа","здоровье","семейные покупки"],
                "geo":"ЦА/СНГ"}
    if "DERMA" in sku:
        return {"age":"25-45", "gender":"жен",
                "interests":["красота","уход за кожей","нутрикосметика","wellness"],
                "geo":"ЦА/СНГ"}
    if "OPHTALMO" in sku:
        return {"age":"25-50", "gender":"all",
                "interests":["работа за ПК","здоровье глаз","офис"],
                "geo":"ЦА/СНГ"}
    return {"age":"25-50", "gender":"all",
            "interests":["wellness","ЗОЖ","семья","профилактика"],
            "geo":"ЦА/СНГ"}

def _budget_for(sku: str) -> int:
    return 350 if "KIDS" in sku else 300

def _kpi_for(channel: str = "") -> Dict:
    # Требования ТЗ: ER>5%, CTR>2%, Conv>1%, подкаст ≥70%
    ch = (channel or "").lower()
    return {
        "ER_min_%": 5 if ch in ("instagram","youtube") else 4,
        "CTR_min_%": 2.0 if ch in ("instagram","email","youtube") else 0.8,
        "Conv_min_%": 1.0,
        "Podcast_watch_%": 70 if ch == "podcast" else None
    }

def recommend_targeting(products_or_skus: Union[Dict, List, str, None], quarter: str = "Q4-2025") -> List[Dict]:
    skus = _normalize_skus(products_or_skus)
    data: List[Dict] = []
    for sku in skus:
        data.append({
            "sku": sku,
            "audience": _audience_for(sku),
            "budget_eur": _budget_for(sku),
            "kpi": _kpi_for()
        })
    TARGET_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return data
