# -*- coding: utf-8 -*-

import json
from .llm import generate, load_config
from .prompt_templates import INSTAGRAM_TMPL, PODCAST_TMPL, EMAIL_TMPL, AR_TMPL, COMMON_STYLE

def _fmt(product):
    return {
        "sku": product["sku"],
        "name": product["name"],
        "audience": ", ".join(product.get("audience", [])),
        "benefits": ", ".join(product.get("benefits", [])),
        "pillars": ", ".join(product.get("pillars", [])),
    }

def make_instagram(product, lang="ru", style="РґСЂСѓР¶РµР»СЋР±РЅРѕ, РїСЂР°РєС‚РёС‡РЅРѕ"):
    p = _fmt(product)
    prompt = INSTAGRAM_TMPL.format(lang=lang, style=style, common=COMMON_STYLE, **p)
    return generate(prompt)

def make_podcast(product, lang="ru", style="СЃРїРѕРєРѕР№РЅРѕ, СЌРєСЃРїРµСЂС‚РЅРѕ"):
    p = _fmt(product)
    prompt = PODCAST_TMPL.format(lang=lang, style=style, common=COMMON_STYLE, **p)
    return generate(prompt)

def make_email(product, lang="ru", style="Р»Р°РєРѕРЅРёС‡РЅРѕ, СѓРІР°Р¶РёС‚РµР»СЊРЅРѕ"):
    p = _fmt(product)
    prompt = EMAIL_TMPL.format(lang=lang, style=style, common=COMMON_STYLE, **p)
    return generate(prompt)

def make_ar(product, lang="ru", style="РјРёРЅРёРјР°Р»РёСЃС‚РёС‡РЅРѕ, РїРѕРЅСЏС‚РЅРѕ"):
    p = _fmt(product)
    prompt = AR_TMPL.format(lang=lang, style=style, common=COMMON_STYLE, **p)
    raw = generate(prompt)
    # try parse JSON if LLM returned JSON; else wrap
    try:
        data = json.loads(raw)
        return json.dumps(data, ensure_ascii=False, indent=2)
    except Exception:
        return json.dumps({"raw": raw}, ensure_ascii=False, indent=2)
