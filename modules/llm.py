# -*- coding: utf-8 -*-
import os, json
from dataclasses import dataclass
from typing import Optional

@dataclass
class LLMConfig:
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: str = "gpt-4o-mini"
    temperature: float = 0.7
    timeout: float = 30.0  # seconds

def load_config():
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except Exception:
        pass
    api_key = os.getenv("OPENAI_API_KEY")
    base_url = os.getenv("OPENAI_BASE_URL")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    temp = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
    timeout = float(os.getenv("OPENAI_TIMEOUT", "30"))
    return LLMConfig(api_key=api_key, base_url=base_url, model=model, temperature=temp, timeout=timeout)

def generate(text: str, cfg: Optional[LLMConfig] = None) -> str:
    cfg = cfg or load_config()
    if not cfg.api_key:
        return "[LLM OFF] " + text[:2000]
    try:
        from openai import OpenAI
        client = OpenAI(api_key=cfg.api_key, base_url=cfg.base_url)
        resp = client.chat.completions.create(
            model=cfg.model,
            temperature=cfg.temperature,
            messages=[
                {"role":"system","content":"Ты лаконичный маркетолог-копирайтер бренда нутрицевтики. Пиши безопасно и корректно."},
                {"role":"user","content": text}
            ],
            timeout=cfg.timeout  # hard timeout to avoid hanging
        )
        out = resp.choices[0].message.content.strip()
        return out
    except Exception as e:
        return f"[LLM ERROR] {e}\n\nPROMPT:\n{text[:2000]}"
