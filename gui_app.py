# -*- coding: utf-8 -*-
import os, json, csv, traceback
from pathlib import Path
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

# Модули проекта
try:
    from data.products import DATA as DEFAULT_PRODUCTS
except Exception:
    DEFAULT_PRODUCTS = {}
from modules.analysis_llm import analyze_products
from modules.plan_llm import build_plan
from modules.examples_llm import build_examples
from modules.visuals import generate_ar_prompt, generate_image
from modules.targeting import recommend_targeting

ROOT = Path(__file__).resolve().parent
EXP  = ROOT / "exports"
SITE = ROOT / "site"

def load_products_from_file(path: Path):
    if not path or not path.exists():
        return None
    text = path.read_text(encoding="utf-8")
    try:
        return json.loads(text)  # .json
    except Exception:
        # поддержка простого .txt / .md: каждая секция = "SKU: текст"
        products = {}
        for block in text.split("\n\n"):
            line = block.strip()
            if not line: continue
            if ":" in line:
                sku, rest = line.split(":",1)
                products[sku.strip().upper()] = rest.strip()
        return products if products else None

def write_text(p: Path, txt: str):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(txt, encoding="utf-8")

def write_csv(p: Path, rows, header):
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=header)
        w.writeheader(); [w.writerow(r) for r in rows]

class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Biotact IE-Agent — Q4 2025 (GUI)")
        self.geometry("980x680")
        self.products = DEFAULT_PRODUCTS

        # top bar
        bar = ttk.Frame(self); bar.pack(fill="x", padx=8, pady=6)
        ttk.Button(bar, text="Открыть файл продуктов…", command=self.cmd_open_products).pack(side="left")
        ttk.Button(bar, text="Анализ", command=self.cmd_analysis).pack(side="left", padx=6)
        ttk.Button(bar, text="План (12×5)", command=self.cmd_plan).pack(side="left")
        ttk.Button(bar, text="Примеры + AR", command=self.cmd_examples).pack(side="left", padx=6)
        ttk.Button(bar, text="Таргетинг/KPI", command=self.cmd_targeting).pack(side="left")
        ttk.Button(bar, text="Открыть сайт", command=self.cmd_open_site).pack(side="left", padx=20)
        ttk.Button(bar, text="Открыть exports", command=self.cmd_open_exports).pack(side="left")

        # text area
        self.txt = tk.Text(self, wrap="word")
        self.txt.pack(fill="both", expand=True, padx=8, pady=6)

        self.log("Готово. Загрузите свой файл продуктов (JSON или текст) или работайте с дефолтными описаниями.")

    def log(self, s):
        self.txt.insert("end", s + "\n"); self.txt.see("end")

    def cmd_open_products(self):
        fp = filedialog.askopenfilename(
            title="Выберите файл с продуктами",
            filetypes=[("JSON/TXT/MD","*.json;*.txt;*.md"),("Все файлы","*.*")]
        )
        if not fp: return
        data = load_products_from_file(Path(fp))
        if not data:
            messagebox.showwarning("Загрузка", "Не удалось разобрать файл — используем дефолтные.")
            return
        self.products = data
        self.log(f"Загружено продуктов: {len(data)}")

    def cmd_analysis(self):
        try:
            txt = analyze_products(self.products, "Q4-2025")
            out = EXP / "analysis_Q4_2025_gui.md"
            write_text(out, txt)
            self.log(f"✓ Анализ сохранён → {out}")
            self.log(txt[:800] + ("…" if len(txt)>800 else ""))
        except Exception as e:
            self.log("Ошибка анализа:\n" + traceback.format_exc())

    def cmd_plan(self):
        try:
            rows = build_plan(self.products, "Q4-2025", per_week=5, lang="ru", style="дружелюбно, экспертно")
            out = EXP / "plan_Q4_2025_gui.csv"
            if rows:
                write_csv(out, rows, header=list(rows[0].keys()))
                self.log(f"✓ План сохранён → {out}  (строк: {len(rows)})")
            else:
                self.log("План пуст.")
        except Exception:
            self.log("Ошибка генерации плана:\n" + traceback.format_exc())

    def cmd_examples(self):
        try:
            data = build_examples(self.products, "Q4-2025", lang="ru", style="дружелюбно, экспертно")
            out = EXP / "examples_gui.json"
            write_text(out, json.dumps(data, ensure_ascii=False, indent=2))
            # AR
            ar = generate_ar_prompt()
            write_text(EXP/"visuals"/"ar_prompt_gui.json", ar)
            # постер (локальный SVG)
            svg = generate_image("Immunocomplex product jar on light background, soft shadows, minimal label, autumn mood",
                                 EXP/"visuals"/"poster_Immunocomplex_gui.svg")
            self.log(f"✓ Примеры + AR готовы → {out}")
            self.log(f"✓ Постер SVG → {EXP/'visuals'/'poster_Immunocomplex_gui.svg'}")
        except Exception:
            self.log("Ошибка примеров/AR:\n" + traceback.format_exc())

    def cmd_targeting(self):
        try:
            out = EXP / "targeting_gui.json"
            data = recommend_targeting(["IMMUNOCOMPLEX","IMMUNOCOMPLEX_KIDS","BIFOLAK_ZINCUM_C_D3"])
            write_text(out, json.dumps(data, ensure_ascii=False, indent=2))
            self.log(f"✓ Таргетинг/KPI сохранены → {out}")
            self.log(json.dumps(data, ensure_ascii=False)[:800] + "…")
        except Exception:
            self.log("Ошибка таргетинга:\n" + traceback.format_exc())

    def cmd_open_site(self):
        p = SITE/"index.html"
        if p.exists():
            os.startfile(str(p))
        else:
            messagebox.showinfo("Сайт", "Страница ещё не собрана. Запустите make_all.py")

    def cmd_open_exports(self):
        os.startfile(str(EXP))

if __name__ == "__main__":
    App().mainloop()
