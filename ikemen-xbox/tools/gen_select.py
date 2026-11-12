#!/usr/bin/env python3
"""Gera data/select.def a partir de chars/ e stages/ e avisa sobre arquivos pesados.

Uso (dentro de ikemen-xbox/):  python3 tools/gen_select.py [--max-mb 15]
"""
import argparse, pathlib, sys

root = pathlib.Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument("--max-mb", type=float, default=15, help="avisa se um char passar disso")
a = ap.parse_args()

def size_mb(p):
    return sum(f.stat().st_size for f in p.rglob("*") if f.is_file()) / 1048576

chars = []
for d in sorted((root / "chars").iterdir()):
    if not d.is_dir():
        continue
    defs = sorted(d.glob("*.def"))
    if not defs:
        continue
    main = next((x for x in defs if x.stem.lower() == d.name.lower()), defs[0])
    chars.append((d.name, main.stem, size_mb(d)))

stages = sorted(p.name for p in (root / "stages").glob("*.def"))

out = ["; gerado por tools/gen_select.py", "", "[Characters]"]
out += [f"{n}/{s}.def" if s != n else n for n, s, _ in chars]
out += ["randomselect", "", "[ExtraStages]"] + [f"stages/{s}" for s in stages]
out += ["", "[Options]",
        "arcade.maxmatches = 6,1,1,0,0,0,0,0,0,0",
        "team.maxmatches = 4,1,1,0,0,0,0,0,0,0", ""]
(root / "data" / "select.def").write_text("\n".join(out), encoding="utf-8")

total = sum(c[2] for c in chars)
print(f"{len(chars)} personagens, {len(stages)} stages, {total:.1f} MB de chars")
for n, _, mb in chars:
    if mb > a.max_mb:
        print(f"  pesado: {n} ({mb:.1f} MB) - considere trocar por versao mais leve")
