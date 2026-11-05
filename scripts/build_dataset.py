"""
Build the Thai lottery dataset (prizes 1-5) into SQLite + CSV.

Source strategy:
  - Draw dates   -> file names in raw_archive/lottonumbers (handles holiday/COVID reschedules)
  - Numbers      -> GLO official API (primary), archive text file (fallback)
  - Every draw is cross-checked between the two sources when both exist.

Output (long / "tidy" format: one row = one winning number):
  data/lottery.db   table `results(draw_date, prize, number, source)`
  data/results_long.csv
"""
import json
import sqlite3
import time
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / "raw_archive" / "lottonumbers"
CACHE = ROOT / "data" / "glo_cache"
DATA = ROOT / "data"
GLO_URL = "https://www.glo.or.th/api/lottery/getLotteryAward"

# Lookup table (a plain dict used as a hash map): translates each source's
# label into our single prize code, so both sources end up speaking one "language".
GLO_KEYS = {"first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5}
ARCHIVE_KEYS = {"FIRST": 1, "SECOND": 2, "THIRD": 3, "FOURTH": 4, "FIFTH": 5}
EXPECTED_COUNT = {1: 1, 2: 5, 3: 10, 4: 50, 5: 100}

# Archive date -> date GLO files the draw under (cases where the two disagree).
#   2020-05-16: 1 Apr 2020 draw postponed by COVID; GLO keeps the original date.
#   2026-01-16: actual draw was 17 Jan (Teacher's Day rule); archive file is also corrupt.
GLO_DATE_ALIAS = {"2020-05-16": "2020-04-01", "2026-01-16": "2026-01-17"}
# Draw dates stored in our dataset (the real date the numbers were drawn).
REAL_DATE = {"2026-01-16": "2026-01-17"}


def fetch_glo(date_str: str) -> dict | None:
    """Return GLO response for one draw, using the on-disk cache when possible."""
    cache_file = CACHE / f"{date_str}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text(encoding="utf-8"))
    y, m, d = date_str.split("-")
    for attempt in range(3):
        try:
            r = requests.post(GLO_URL, json={"date": d, "month": m, "year": y}, timeout=30)
            r.raise_for_status()
            payload = r.json().get("response")
            cache_file.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
            time.sleep(0.3)  # be polite to a government server
            return payload
        except Exception as e:  # network hiccup -> retry with backoff
            print(f"  retry {attempt + 1} {date_str}: {e}")
            time.sleep(2 * (attempt + 1))
    return None


def parse_glo(payload: dict | None) -> dict[int, list[str]]:
    if not payload or not payload.get("data"):
        return {}
    out = {}
    for key, prize in GLO_KEYS.items():
        nums = payload["data"].get(key, {}).get("number", [])
        out[prize] = sorted(n["value"] for n in nums)
    return out


def parse_archive(path: Path) -> dict[int, list[str]]:
    out = {}
    for line in path.read_text(encoding="utf-8").splitlines()[1:]:  # line 0 = source URL
        parts = line.split()
        if parts and parts[0] in ARCHIVE_KEYS:
            out[ARCHIVE_KEYS[parts[0]]] = sorted(parts[1:])
    return out


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    rows, mismatches, problems = [], [], []

    for f in sorted(ARCHIVE.glob("*.txt")):
        date_str = REAL_DATE.get(f.stem, f.stem)
        glo = parse_glo(fetch_glo(GLO_DATE_ALIAS.get(f.stem, f.stem)))
        arc = parse_archive(f)

        if glo and arc and glo != arc:
            mismatches.append(date_str)

        chosen, source = (glo, "glo") if glo else (arc, "archive")
        for prize, nums in chosen.items():
            if len(nums) != EXPECTED_COUNT[prize] or any(len(n) != 6 or not n.isdigit() for n in nums):
                problems.append((date_str, prize, len(nums)))
            rows.extend({"draw_date": date_str, "prize": prize, "number": n, "source": source} for n in nums)

    df = pd.DataFrame(rows)
    df.to_csv(DATA / "results_long.csv", index=False)
    with sqlite3.connect(DATA / "lottery.db") as con:
        df.to_sql("results", con, if_exists="replace", index=False)
        con.execute("CREATE INDEX IF NOT EXISTS ix_date_prize ON results(draw_date, prize)")

    draws = df.groupby("source")["draw_date"].nunique()
    print(f"rows={len(df)}  draws={df.draw_date.nunique()}  range={df.draw_date.min()}..{df.draw_date.max()}")
    print("draws per source:", draws.to_dict())
    print("GLO vs archive mismatches:", len(mismatches), mismatches[:20])
    print("count/format problems:", len(problems), problems[:20])


if __name__ == "__main__":
    main()
