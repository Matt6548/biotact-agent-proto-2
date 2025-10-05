# -*- coding: utf-8 -*-
def recommend(product_sku: str):
    # простые пресеты — можно расширить
    if "KIDS" in product_sku:
        return {
            "audience": {"age":"25-45 (родители)", "gender":"all", "interests":["дети","школа","здоровье"], "geo":"ЦА/СНГ"},
            "budget_eur": 350,
            "metrics": {"ER_min_%":5, "CTR_min_%":2.0, "Conv_min_%":1.0, "Podcast_watch_%":70}
        }
    if "OPHTALMO" in product_sku:
        return {
            "audience": {"age":"18-40", "gender":"all", "interests":["офис","геймеры","учёба","зрение"], "geo":"ЦА/СНГ"},
            "budget_eur": 300,
            "metrics": {"ER_min_%":4, "CTR_min_%":2.0, "Conv_min_%":1.0, "Podcast_watch_%":70}
        }
    if "DERMA" in product_sku:
        return {
            "audience": {"age":"20-45 (beauty)", "gender":"жен", "interests":["уход за собой","косметика","wellness"], "geo":"ЦА/СНГ"},
            "budget_eur": 500,
            "metrics": {"ER_min_%":5, "CTR_min_%":2.5, "Conv_min_%":1.2, "Podcast_watch_%":70}
        }
    return {
        "audience": {"age":"25-50", "gender":"all", "interests":["wellness","ЗОЖ","семья"], "geo":"ЦА/СНГ"},
        "budget_eur": 300,
        "metrics": {"ER_min_%":4, "CTR_min_%":2.0, "Conv_min_%":1.0, "Podcast_watch_%":70}
    }
