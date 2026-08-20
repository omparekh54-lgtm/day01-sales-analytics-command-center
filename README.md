# Day 01 — Signal Sales Intelligence Command Center

**100 Days of Data Science · Day 01**

Signal is a bring-your-own-data sales intelligence product. Instead of opening on a fixed synthetic dashboard, a user can upload a real CSV or Excel sales export, map their own columns, pass a visible data-quality gate, investigate business performance, forecast revenue, simulate commercial decisions, and export an executive report.

> Synthetic data is now only a one-click demo. The primary product workflow is built around the user's own business data.

## Live product

**Production:** https://day01-sales-intelligence-v3.vercel.app  
**Repository:** https://github.com/omparekh54-lgtm/day01-sales-analytics-command-center

## What a user can actually do

```text
Upload CSV / XLSX / XLS
        ↓
Automatic column suggestions
        ↓
Review / correct field mapping
        ↓
Strict data-quality gate
        ├─ valid rows → analysis
        └─ bad rows → downloadable issues CSV
        ↓
Interactive commercial workspace
        ├─ executive KPIs
        ├─ What Changed? MoM / YoY decomposition
        ├─ one-click drilldowns into change drivers
        ├─ commercial opportunity priority queue
        ├─ gross-to-profit bridge
        ├─ revenue / profit / margin trends
        ├─ interactive monthly tooltips
        ├─ sortable product economics
        ├─ anomaly detection
        ├─ 3-month revenue forecast
        ├─ evidence-backed recommendations
        ├─ price / discount / cost simulator
        └─ break-even price protection analysis
        ↓
Print / Save as executive PDF
```

## v4 — useful decision features, not dashboard noise

The latest upgrade adds features only where they shorten the path from data to a management decision:

- **MoM / YoY switch:** compare the latest month with either the previous month or the same month last year.
- **Driver drilldown:** click `Inspect` beside a positive or negative contributor and the entire workspace filters to that exact region, channel, segment, category, or product.
- **Opportunity queue:** ranks material discount leakage and margin gaps instead of showing every possible slice.
- **Peer-benchmark discount sensitivity:** estimates gross-to-net value if an above-peer discount rate were brought back to the peer median, while explicitly holding volume and price constant.
- **Gross-to-profit bridge:** separates gross sales, discount spend, net revenue, cost and gross profit so pricing leakage is not confused with cost pressure.
- **Break-even pricing:** the scenario simulator now calculates the price move required to preserve current gross profit after selected discount or cost changes.
- **Quick scenario presets:** common pricing, discount and supplier-cost tests can be loaded instantly, then adjusted manually.
- **Sortable product economics:** rank products by revenue, profit, margin, discount rate or units and inspect a product directly.
- **Drag-and-drop ingestion:** CSV and Excel files can be dropped directly on the landing panel.
- **Interactive trend chart:** hover or keyboard-focus a month to see exact revenue/profit/margin context.
- **Restrained motion:** entry, chart-draw and bar animations improve hierarchy and feedback without turning the dashboard into a demo reel. `prefers-reduced-motion` is respected.

## Why this is useful

Many small and mid-sized businesses already have transaction data in Excel but do not have a governed analytics stack. Signal is designed to sit between a raw export and a management decision.

It helps answer questions such as:

- What changed this month, and what actually drove the change?
- Is the movement temporary month-over-month noise or a year-over-year shift?
- Which product, channel, segment, category or region should I inspect first?
- Which products generate revenue but weak gross profit?
- Where is discounting materially above comparable peers?
- Is the problem pricing leakage or the underlying cost base?
- Are any months statistically unusual?
- What does the next quarter look like directionally?
- What happens to profit if price, discount, or cost changes?
- How much pricing action would be required just to preserve current profit after a cost shock?

## Bring-your-own-data ingestion

Supported files:

- `.csv`
- `.xlsx`
- `.xls`

Column names do **not** need to match a fixed schema. Signal recognizes common headings such as:

| Source heading | Signal field |
|---|---|
| `Invoice Date` | Order date |
| `Invoice No` | Order / invoice ID |
| `SKU Name` | Product |
| `Sales Value` | Net revenue |
| `COGS` | Cost |
| `Discount %` | Discount rate |

The user reviews the suggested mapping before analysis. The application does not silently invent business fields.

### Minimum useful fields

Required:

- order / invoice date
- product / SKU
- net revenue / sales
- either cost / COGS **or** gross profit

Recommended:

- invoice / order ID
- quantity
- category
- region
- channel
- customer segment
- discount rate or discount amount

Missing optional dimensions remain explicit as `Unspecified` rather than being fabricated.

## Privacy model

Uploaded files are processed **inside the browser**. The workbook is not uploaded to an application database.

For Day 1 this means:

- no account required
- no server-side persistence of customer rows
- no upload bucket
- no hidden API containing the user's sales data

The **Try sample company** button builds a deterministic demo dataset directly in the browser, so demo mode also has no external data-file dependency.

## Data-quality gate

Signal rejects invalid rows and tells the user why instead of silently repairing critical problems.

Checks include:

- required mapping
- date parsing
- non-negative revenue
- positive quantity
- cost / gross-profit availability
- discount bounds
- duplicate source rows / IDs where available
- financial identity consistency

The user can continue with valid rows and download a CSV of rejected rows/issues.

## Analytical safeguards

- Gross profit is explicitly `net revenue - cost`.
- Discount opportunity is shown as a **sensitivity**, not guaranteed recovered profit.
- Scenario simulation holds unit volume constant and says so visibly.
- Break-even price analysis protects baseline gross profit under the selected assumptions; it does not estimate demand elasticity.
- Anomalies are investigation flags, not causal explanations.
- Forecasts expose method and backtested error instead of presenting a single point estimate as certainty.

## Testing

The project includes Python analytics tests and browser-side TypeScript tests covering ingestion, validation, filtering, KPI economics, forecasting, scenarios, recommendations and the v4 decision layer.

The v4 decision tests verify:

- month-over-month and year-over-year comparison logic
- quantified above-peer discount sensitivity
- gross-to-profit bridge reconciliation
- break-even price behavior under cost shocks

## Architecture

```text
Real CSV / Excel                      Deterministic demo
       │                                     │
       └────────────── browser ──────────────┘
                         │
                 column mapping
                         │
                 validation gate
                         │
                 normalized facts
                         │
         ┌───────────────┼────────────────┐
         │               │                │
     KPI engine      decision layer    forecasting
                         │
        change attribution / opportunities /
        break-even / recommendations / anomalies
                         │
                         ▼
                Next.js decision UI
```

## Local development

```bash
npm install
npm run test:frontend
npm run dev
```

For the deterministic Python analytics pipeline:

```bash
pip install -r requirements.txt
python -m src.generate_data
python -m src.build_artifacts
pytest -q
```

## Product direction

Day 1 is intentionally staying focused on one job: **turn a sales export into useful commercial decisions**. Features such as chat, CRM, authentication, collaboration, notifications and unrelated BI widgets are not being added just to make the app look larger.

Future additions should only be accepted if they improve ingestion quality, analytical trust, decision speed, repeatability, or measurable business usefulness.

## License

MIT — see [`LICENSE`](LICENSE).
