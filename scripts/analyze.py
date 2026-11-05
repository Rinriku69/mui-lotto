"""
Statistical analysis of Thai lottery prizes 1-5, for any date window.

    python scripts/analyze.py                         # all data
    python scripts/analyze.py --from 2015-09-01       # from a date
    python scripts/analyze.py --from 2020-01-01 --to 2024-12-31

Core question for every test: "Is what we see consistent with a fair, uniform
random draw?"  Each test compares OBSERVED counts to what pure chance EXPECTS.
"""
import argparse
import sqlite3
from collections import Counter
from math import comb
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "data" / "lottery.db"
REPORTS = ROOT / "reports"
PRIZE_NAME = {1: "รางวัลที่ 1", 2: "รางวัลที่ 2", 3: "รางวัลที่ 3", 4: "รางวัลที่ 4", 5: "รางวัลที่ 5"}
RNG = np.random.default_rng(42)


def load(date_from: str | None, date_to: str | None) -> pd.DataFrame:
    q, params = "SELECT draw_date, prize, number FROM results WHERE 1=1", []
    if date_from:
        q += " AND draw_date >= ?"; params.append(date_from)
    if date_to:
        q += " AND draw_date <= ?"; params.append(date_to)
    with sqlite3.connect(DB) as con:
        df = pd.read_sql(q, con, params=params)
    # Split "423224" into 6 integer columns d1..d6 (d1 = leftmost digit).
    digits = df["number"].str.split("", expand=True).iloc[:, 1:7].astype(int)
    digits.columns = [f"d{i}" for i in range(1, 7)]
    return pd.concat([df, digits], axis=1)


def p_fmt(p: float) -> str:
    flag = " ⚠️" if p < 0.01 else ""
    return f"{p:.3f}{flag}"


# ---------- individual tests ----------

def digit_position_test(g: pd.DataFrame) -> list[str]:
    """Chi-square per position: are digits 0-9 equally likely in each slot?"""
    lines = ["| ตำแหน่ง (หลัก) | min count | max count | expected | χ² | p-value |", "|---|---|---|---|---|---|"]
    for i in range(1, 7):
        counts = g[f"d{i}"].value_counts().reindex(range(10), fill_value=0).to_numpy()
        chi2, p = stats.chisquare(counts)  # default expected = uniform (total/10 each)
        lines.append(f"| หลักที่ {i} | {counts.min()} | {counts.max()} | {counts.sum()/10:.1f} | {chi2:.2f} | {p_fmt(p)} |")
    return lines


def last_n_test(g: pd.DataFrame, n: int) -> list[str]:
    """Frequency of the last n digits (e.g. last-2 = '00'..'99')."""
    bins = 10 ** n
    tail = g["number"].str[-n:]
    counts = tail.value_counts().reindex([f"{i:0{n}d}" for i in range(bins)], fill_value=0)
    expected = len(tail) / bins
    if expected < 5:  # chi-square approximation breaks down with tiny expected counts
        return [f"- เลขท้าย {n} ตัว: ข้อมูลน้อยเกินไป (expected {expected:.2f}/ช่อง < 5) ข้ามการทดสอบ"]
    chi2, p = stats.chisquare(counts.to_numpy())

    # Monte Carlo: how big does the hottest number get under PURE randomness?
    sims = RNG.multinomial(len(tail), [1 / bins] * bins, size=5000).max(axis=1)
    obs_max = counts.max()
    pct = (sims >= obs_max).mean()

    hot = ", ".join(f"`{k}`×{v}" for k, v in counts.sort_values(ascending=False).head(5).items())
    cold = ", ".join(f"`{k}`×{v}" for k, v in counts.sort_values().head(5).items())
    return [
        f"- **เลขท้าย {n} ตัว** — expected {expected:.1f} ครั้ง/เลข · χ²={chi2:.1f} (df={bins-1}) · p={p_fmt(p)}",
        f"  - ออกบ่อยสุด: {hot}",
        f"  - ออกน้อยสุด: {cold}",
        f"  - เลขที่ออกบ่อยสุดออก {obs_max} ครั้ง — ถ้าสุ่มล้วนๆ จะเจอ max ≥ {obs_max} ได้ {pct:.0%} ของการจำลอง 5,000 รอบ"
        + (" → **ปกติ ไม่ใช่เลขเด็ด**" if pct > 0.05 else " → สูงผิดปกติ (ควรดูต่อ)"),
    ]


def digit_sum_test(g: pd.DataFrame) -> list[str]:
    """Sum of 6 digits: theory mean = 6*4.5 = 27, var = 6*8.25 = 49.5."""
    s = g[["d1", "d2", "d3", "d4", "d5", "d6"]].sum(axis=1)
    z = (s.mean() - 27) / (np.sqrt(49.5) / np.sqrt(len(s)))
    p = 2 * stats.norm.sf(abs(z))
    return [f"- ผลรวมเลข 6 หลัก: mean={s.mean():.2f} (ทฤษฎี 27.00), SD={s.std():.2f} (ทฤษฎี 7.04), p={p_fmt(p)}"]


def pattern_test(g: pd.DataFrame) -> list[str]:
    """Share of numbers whose 6 digits are all different. Theory = 10·9·8·7·6·5 / 10^6 = 15.12%."""
    distinct = g["number"].map(lambda x: len(set(x)) == 6)
    k, n, p0 = distinct.sum(), len(distinct), 0.1512
    p = stats.binomtest(int(k), n, p0).pvalue
    return [f"- เลขที่ 6 หลักไม่ซ้ำกันเลย: {k/n:.2%} (ทฤษฎี 15.12%), p={p_fmt(p)}"]


def repeat_test(g: pd.DataFrame) -> list[str]:
    """
    How often has the exact same 6-digit number come out more than once?
    Birthday-problem expectation: pairs ≈ C(n,2) / 1,000,000.
    """
    # Counter = a hash map {number: how many times it appeared}
    counts = Counter(g["number"])
    # For a number seen c times, it forms C(c,2) pairs of "repeats".
    observed_pairs = sum(comb(c, 2) for c in counts.values())
    expected_pairs = comb(len(g), 2) / 1_000_000
    examples = [f"`{k}`×{v}" for k, v in counts.most_common(3) if v > 1]
    return [f"- เลขเดิมออกซ้ำ (คู่): พบ {observed_pairs} คู่, คาดการณ์ {expected_pairs:.1f} คู่"
            + (f" — เช่น {', '.join(examples)}" if examples else "")]


def period_table(df: pd.DataFrame) -> list[str]:
    """Overall digit-uniformity p-value per prize, per 5-year block."""
    df = df.assign(block=(pd.to_datetime(df.draw_date).dt.year // 5) * 5)
    blocks = sorted(df.block.unique())
    header = "| รางวัล | " + " | ".join(f"{b}–{b+4}" for b in blocks) + " |"
    lines = [header, "|---" * (len(blocks) + 1) + "|"]
    for prize in range(1, 6):
        cells = []
        for b in blocks:
            g = df[(df.prize == prize) & (df.block == b)]
            # Pool all 6 positions: 6 digits per number -> digit frequency table.
            counts = np.bincount(g[[f"d{i}" for i in range(1, 7)]].to_numpy().ravel(), minlength=10)
            cells.append(p_fmt(stats.chisquare(counts)[1]) if counts.sum() else "-")
        lines.append(f"| {PRIZE_NAME[prize]} | " + " | ".join(cells) + " |")
    return lines


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="date_from")
    ap.add_argument("--to", dest="date_to")
    args = ap.parse_args()

    df = load(args.date_from, args.date_to)
    n_draws = df.draw_date.nunique()
    out = [
        f"# วิเคราะห์สถิติผลสลากกินแบ่งรัฐบาล ({df.draw_date.min()} ถึง {df.draw_date.max()})",
        "",
        f"จำนวนงวด: **{n_draws}** · จำนวนเลขทั้งหมด: **{len(df):,}**",
        "",
        "> อ่านค่า p-value: คือโอกาสที่การสุ่มยุติธรรมจะให้ผลเบี่ยงได้ขนาดนี้ (หรือมากกว่า)",
        "> p < 0.01 ติด ⚠️ แต่การทดสอบหลายสิบชุดพร้อมกัน ต่อให้สุ่มยุติธรรมจริง ก็คาดว่าจะเจอ ⚠️ ประมาณ 1 ใน 100 ชุดอยู่แล้ว",
        "",
    ]
    for prize in range(1, 6):
        g = df[df.prize == prize]
        out += [f"## {PRIZE_NAME[prize]} ({len(g):,} เลข จาก {n_draws} งวด)", "", "**ความถี่ตัวเลข 0–9 แยกตามหลัก**", ""]
        out += digit_position_test(g) + [""]
        out += last_n_test(g, 2) + last_n_test(g, 3)
        out += digit_sum_test(g) + pattern_test(g) + repeat_test(g) + [""]

    out += ["## ความสม่ำเสมอของตัวเลข แยกช่วงทีละ 5 ปี (p-value)", ""] + period_table(df) + [""]

    REPORTS.mkdir(exist_ok=True)
    name = f"report_{args.date_from or 'start'}_{args.date_to or 'end'}.md"
    (REPORTS / name).write_text("\n".join(out), encoding="utf-8")
    print("\n".join(out))
    print(f"\n-> saved reports/{name}")


if __name__ == "__main__":
    main()
