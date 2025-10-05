# -*- coding: utf-8 -*-
"""
build_examples(products, quarter="Q4-2025", lang="ru", style="дружелюбно, экспертно") -> List[Dict]
Возвращает 2–3 готовых примера на разные каналы: instagram/email/podcast.
Если нет OPENAI_API_KEY или сеть тормозит, используется детерминированный фоллбэк.
"""

import os, json
from typing import Dict, List

def _pick_skus(products: Dict) -> List[str]:
    if not products:
        return ["IMMUNOCOMPLEX", "IMMUNOCOMPLEX_KIDS", "BIFOLAK_ZINCUM_C_D3"]
    skus = [str(k).upper().replace(" ", "_") for k in products.keys()]
    # возьмём 3 первых уникальных
    out, seen = [], set()
    for s in skus:
        if s not in seen:
            out.append(s); seen.add(s)
        if len(out) == 3: break
    if len(out) < 3:
        # докинем популярные при недостаче
        for s in ["IMMUNOCOMPLEX","IMMUNOCOMPLEX_KIDS","BIFOLAK_ZINCUM_C_D3"]:
            if s not in seen: out.append(s)
            if len(out) == 3: break
    return out[:3]

def _llm_available() -> bool:
    return bool(os.getenv("OPENAI_API_KEY"))

def _try_llm(prompt: str) -> str:
    """
    Опциональный вызов chat.completions. Если что-то пойдёт не так — вернём пустую строку, чтобы включился фоллбэк.
    """
    import requests
    url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1/chat/completions")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    timeout = int(os.getenv("OPENAI_TIMEOUT", "30"))
    headers = {"Authorization": f"Bearer {os.getenv('OPENAI_API_KEY','')}", "Content-Type":"application/json"}
    data = {
        "model": model,
        "temperature": float(os.getenv("OPENAI_TEMPERATURE","0.7")),
        "messages": [
            {"role":"system","content":"Ты маркетолог-редактор. Пиши по-русски, кратко, безопасно, без медицинских обещаний: «поддерживает/способствует»."},
            {"role":"user","content": prompt}
        ]
    }
    try:
        r = requests.post(url, headers=headers, json=data, timeout=timeout)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        return ""

def _fallback_pack(sku: str, quarter: str) -> Dict:
    # максимально безопасные формулировки + CTA
    if "KIDS" in sku:
        ig = (
            "🛡️ Поддержка детского иммунитета каждый день.\n\n"
            "Immunocomplex Kids — сочетание витамина C, D3, цинка и пробиотиков, которое "
            "помогает поддерживать естественные защитные функции. Добавьте к сбалансированному питанию и прогулкам.\n\n"
            "Совет недели: семейный режим сна + тёплые напитки без сахара.\n"
            "#дети #иммунитет #семейноездоровье"
        )
        email = (
            "Тема: Поддержка иммунитета вашего ребёнка — просто и понятно\n\n"
            "Здравствуйте!\n\n"
            "В сезон простуд особенно важно бережно поддерживать детскую иммунную систему. "
            "Immunocomplex Kids сочетает витамин C, D3, цинк и пробиотики — компоненты, которые "
            "способствуют нормальному функционированию иммунитета. Добавьте к привычному рациону и активностям на свежем воздухе.\n\n"
            "Спец-набор недели: Immunocomplex Kids + полезный чек-лист для родителей.\n"
            "Перейдите по ссылке, чтобы узнать больше."
        )
        pod = (
            "Подкаст Biotact Inside — мини-выпуск (8–10 мин)\n"
            "Тема: Что реально помогает поддерживать иммунитет детей в сезон простуд?\n"
            "План: коротко о режиме сна, питании, физической активности; чем полезны витамин C, D3, цинк и пробиотики; "
            "как сформировать простые семейные привычки. Дисклеймер: это информационный материал."
        )
    elif "ZINCUM" in sku:
        ig = (
            "Баланс каждый день: Bifolak Zincum + C + D3.\n\n"
            "Комбинация цинка, витамина C и D3 в сочетании с пробиотиками помогает поддерживать защитные функции и общее самочувствие. "
            "Идея поста: карусель «3 простых шага на неделю»: питание, движение, гидратация.\n"
            "#ЗОЖ #иммунитет #Bifolak"
        )
        email = (
            "Тема: Поддержите себя в сезон нагрузки — Bifolak Zincum + C + D3\n\n"
            "Здравствуйте!\n\n"
            "Сочетание цинка, витамина C и D3 — популярный выбор для ежедневной поддержки. "
            "Добавьте к сбалансированному рациону и прогулкам — и дайте себе мягкий старт недели.\n\n"
            "Промо: комплект «для бодрого утра» — скидка при покупке набора.\n"
            "Подробнее — по ссылке."
        )
        pod = (
            "Подкаст Biotact Inside — короткий выпуск (10–12 мин)\n"
            "Тема: Почему «минимум-привычек» работают лучше жёстких планов?\n"
            "План: 1) сон и вода; 2) микро-активность; 3) когда добавляют витамины/минералы; 4) как отслеживать прогресс без стресса."
        )
    else:
        ig = (
            "Immunocomplex — поддержка на каждый день.\n\n"
            "Бета-глюкан, витамин C, цинк, селен и пробиотики — сочетание, которое помогает поддерживать естественные защитные функции. "
            "Добавьте к привычкам: сон, вода, прогулки. Делимся чек-листом в сторис.\n"
            "#иммунитет #wellness #семья"
        )
        email = (
            "Тема: Мягкая поддержка иммунитета — без перегрузки\n\n"
            "Здравствуйте!\n\n"
            "Immunocomplex — сбалансированная комбинация активов (бета-глюкан, витамин C, цинк, селен, пробиотики), "
            "которая может поддерживать естественные защитные функции. Материал носит информационный характер.\n\n"
            "Спец-предложение недели: комплект для всей семьи.\n"
            "Перейдите по ссылке, чтобы узнать подробнее."
        )
        pod = (
            "Подкаст Biotact Inside — 10 минут по делу\n"
            f"Тема недели {quarter}: как сохранять энергию и фокус без жёстких ограничений.\n"
            "План: 1) базовые привычки; 2) поддерживающие нутриенты; 3) работа со стрессом; 4) Q&A."
        )

    return {
        "product": sku,
        "instagram": ig,
        "email": email,
        "podcast": pod
    }

def build_examples(products: Dict, quarter: str = "Q4-2025", lang: str = "ru", style: str = "дружелюбно, экспертно") -> List[Dict]:
    skus = _pick_skus(products)
    out: List[Dict] = []
    for sku in skus:
        # Пытаемся LLM (если есть ключ и сеть), иначе — фоллбэк
        if _llm_available():
            prompt = (
                f"Сделай 3 небольших текста для SKU {sku} на {lang} ({style}). "
                "1) Instagram-пост 100–140 слов (без медицинских обещаний, только «поддерживает/способствует», с 2–3 хештегами). "
                "2) Email: тема + 120–160 слов, мягкий CTA. "
                "3) Сценарий мини-подкаста 100–180 слов (структура: вступление/3 пункта/финал)."
            )
            txt = _try_llm(prompt)
            if txt:
                # примитивный сплит — нормально для черновика
                parts = txt.split("\n")
                ig, email, pod = "", "", ""
                bucket = "ig"
                for line in parts:
                    l = line.strip()
                    if not l: continue
                    low = l.lower()
                    if "email" in low or "тема:" in low: bucket = "email"; continue
                    if "подкаст" in low or "podcast" in low: bucket = "pod"; continue
                    if bucket == "ig": ig += (l + " ")
                    elif bucket == "email": email += (l + " ")
                    else: pod += (l + " ")
                out.append({"product": sku, "instagram": ig.strip(), "email": email.strip(), "podcast": pod.strip()})
                continue

        # если LLM не сработал — фоллбэк
        out.append(_fallback_pack(sku, quarter))
    return out
