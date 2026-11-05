"""
Export the SQLite dataset to one JSON file the web dashboard loads.

Shape (one object per draw, prizes indexed 0..4 = prize 1..5):
  {"generated": "...", "draws": [{"date": "2026-11-01",
     "prizes": [["423224"], [...5], [...10], [...50], [...100]],
     "special": {"front3": ["300", "950"], "last3": ["393", "804"], "last2": ["85"]}}]}
  (front3 is [] before Sep 2015, when last3 had four numbers.)

Why JSON grouped by draw instead of shipping the CSV: the browser needs no CSV parser,
and grouping avoids repeating the date + prize on every one of the 78k rows (~half the size).
"""
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "web" / "public" / "data" / "draws.json"

with sqlite3.connect(ROOT / "data" / "lottery.db") as con:
    rows = con.execute("SELECT draw_date, prize, number FROM results ORDER BY draw_date, prize, number").fetchall()
    special_rows = con.execute("SELECT draw_date, kind, number FROM special_prizes ORDER BY draw_date, kind, number").fetchall()

# dict used as a hash map: draw_date -> list of 5 prize lists. setdefault() creates the
# entry the first time we see a date, then every later row appends to that same entry.
by_date: dict[str, list[list[str]]] = {}
for date, prize, number in rows:
    by_date.setdefault(date, [[] for _ in range(5)])[prize - 1].append(number)

special: dict[str, dict[str, list[str]]] = {}
for date, kind, number in special_rows:
    special.setdefault(date, {"front3": [], "last3": [], "last2": []})[kind].append(number)

payload = {
    "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    "draws": [{"date": d, "prizes": p, "special": special[d]} for d, p in by_date.items()],
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
print(f"{len(by_date)} draws -> {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1024:.0f} KB)")
