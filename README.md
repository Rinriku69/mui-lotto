# Thai Lottery Statistics (รางวัลที่ 1–5)

## Data
- `data/lottery.db` — SQLite, table `results(draw_date, prize, number, source)`; one row = one winning number
- `data/results_long.csv` — same data as CSV
- `data/glo_cache/` — raw GLO API responses (so rebuilds don't re-hit the server)
- `raw_archive/` — clone of github.com/vicha-w/thai-lotto-archive (draw-date list + pre-2010 numbers)

Sources: GLO official API for 2010-03 onward; archive only for 2006-12 to 2010-02 (76 draws, unverified).
The archive has ~50 typos (transposed digits / missing numbers) vs GLO, so GLO wins whenever both exist.

## Usage
```bash
git clone --depth 1 https://github.com/vicha-w/thai-lotto-archive.git raw_archive   # once
python scripts/build_dataset.py            # rebuild / add new draws (git -C raw_archive pull first)
python scripts/analyze.py                  # whole history
python scripts/analyze.py --from 2015-09-01 --to 2020-12-31
```
Reports are written to `reports/`.

## Example SQL
```sql
-- Last-2-digit frequency of prize 1 since 2020
SELECT substr(number, 5, 2) AS last2, COUNT(*) AS n
FROM results WHERE prize = 1 AND draw_date >= '2020-01-01'
GROUP BY last2 ORDER BY n DESC;
```

## Web dashboard (`web/`, Angular 22, zoneless + signals)
```bash
python scripts/export_web.py      # SQLite -> web/public/data/draws.json (re-run after new draws)
cd web && npm start               # dev server: http://localhost:4200
npx ng build                      # static site in web/dist/web/browser (host anywhere)
npx ng test --watch=false         # unit tests for search/generator logic
```
All statistics are computed in the browser; there is no backend.
