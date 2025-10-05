# -*- coding: utf-8 -*-
"""Quick diagnostics for LLM connectivity and config."""
from modules.llm import load_config, generate
print("Loaded config:", load_config())
print("\nTest call (should return text or [LLM ERROR]/[LLM OFF]):")
print(generate("Проверь соединение и ответь одним словом: ОК."))
