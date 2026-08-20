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
        ├─ What Changed? decomposition
        ├─ revenue / profit / margin trends
        ├─ product economics
        ├─ anomaly detection
        ├─ 3-month revenue forecast
        ├─ evidence-backed recommendations
        └─ price / discount / cost simulator
        ↓
Print / Save as executive PDF
```

## Why this is useful

Many small and mid-sized businesses already have transaction data in Excel but do not have a governed analytics stack. Signal is designed to sit between a raw export and a management decision.

It helps answer questions such as:

- What changed this month, and what actually drove the change?
- Which products generate revenue but weak gross profit?
- Which region, channel, category, or customer segment is leaking margin?
- How much value is being given away through discounting?
- Are any months statistically unusual?
- What does the next quarter look like directionally?
- What happens to profit if price, discount, or cost changes?

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
- exact duplicate rows

The user sees source rows, valid rows, rejected rows, duplicate count, quality score, mapping warnings, an issue preview, and a downloadable issues CSV.

## What Changed?

The executive brief compares the latest available month with the previous month and decomposes the movement across:

- region
- channel
- customer segment
- category
- product

It reports revenue delta, revenue growth, gross-profit delta, gross-profit growth, margin change in percentage points, and the largest positive and negative contributors.

## Core economics

For every filter selection Signal recomputes:

- net revenue
- gross revenue
- cost
- gross profit
- gross margin
- discount amount
- weighted discount rate
- orders
- units
- average order value
- average selling price

```text
gross profit = net revenue - cost
gross margin = gross profit / net revenue
weighted discount rate = total discount / total gross revenue
AOV = net revenue / unique orders
ASP = net revenue / units
```

## Interactive drilldowns

The workspace supports filters for date range, region, channel, customer segment, category, and product. KPI cards, trend charts, product economics, change decomposition, forecast inputs, recommendations, and scenario baselines respond to the selected facts.

## Anomaly detection

Monthly revenue anomalies use a median-absolute-deviation robust z-score:

```text
robust_z = 0.6745 × (x - median) / MAD
```

A month is flagged when `|z| >= 3.0`. A flag means **investigate**, not **cause proven**.

## Revenue forecasting

The live product includes a transparent 3-month forecast:

- minimum 6 months of history
- linear trend for shorter histories
- shrunk month-of-year seasonality when 18+ months are available
- residual-error forecast range
- expanding-window one-step MAPE where enough history exists

The UI explicitly presents the output as directional planning evidence rather than a guaranteed target.

## Scenario simulator

Users can vary:

- price %
- discount rate in percentage points
- cost %

Signal estimates projected revenue, gross profit, gross margin, and the change versus baseline. Unit volume is intentionally held constant, and the interface states that assumption so sensitivity analysis is not confused with demand-elasticity modelling.

## Evidence-backed recommendations

Recommendations for uploaded data are recomputed from the user's transaction facts. Rules identify issues such as revenue-leading products with weak margins, discount leakage, and structural margin gaps across commercial dimensions.

Every recommendation follows:

**observation → evidence → implication → action**

## Executive report

**Export executive PDF** uses a print-specific layout so the currently filtered management view can be printed or saved as a PDF directly from the browser.

## Technology

- Next.js 16
- React 19
- TypeScript
- SheetJS / `xlsx` for browser-side Excel ingestion
- Python + pandas / NumPy / SciPy for the deterministic analytics reference pipeline
- pytest, Node test runner, ESLint, Prettier, Ruff and mypy
- GitHub Actions quality workflow
- Vercel production deployment

## Architecture

```text
                 REAL USER PATH
CSV / Excel
    ↓
browser parser
    ↓
column mapper
    ↓
validation + rejected-row report
    ↓
canonical transaction facts
    ↓
┌──────────────────────────────────────────┐
│ KPI engine                               │
│ change decomposition                     │
│ product / segment drilldowns             │
│ robust anomaly detection                 │
│ transparent forecasting                  │
│ dynamic recommendations                  │
│ scenario sensitivity                     │
└──────────────────────────────────────────┘
    ↓
interactive decision UI + executive PDF

          REFERENCE / PORTFOLIO PIPELINE
Python deterministic generator
    ↓
strict validation
    ↓
analytics + recommendations
    ↓
reproducible artifact + automated tests
```

## Quality gates

Verified during the v3 upgrade:

- **24/24 Python tests passed**
- **11/11 frontend/intelligence/import tests passed**
- Vercel cloud build: **Next.js compiled successfully**
- Vercel cloud build: **TypeScript passed**
- production landing page: **HTTP 200**

The test suite covers validation rules, KPI math, deterministic artifacts, filtering, column inference, uploaded-row normalization, latest-month change decomposition, forecasts, scenario sensitivity, and evidence-backed recommendations.

## Local development

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m src.generate_data
python -m src.build_artifacts
pytest -q

npm install
npm run test:frontend
npm run dev
```

Open `http://localhost:3000`.

## Important limitations

- Uploaded analysis is intentionally browser-local and is not persisted between devices or browser sessions.
- The scenario simulator does not estimate demand elasticity; it holds unit volume constant.
- The forecast is deliberately transparent and lightweight, not a guaranteed target.
- Gross profit is not EBITDA or contribution margin unless the uploaded cost field represents all relevant variable costs.
- Anomaly detection flags unusual movement but does not prove causality.
- Currency selection identifies the currency unit of uploaded values; it does not perform FX conversion.

## Repository structure

```text
app/                    Next.js application and product styling
components/             upload, mapping, quality and decision-workspace UI
lib/importer.ts         CSV / Excel mapping and normalization
lib/intelligence.ts     change, anomaly, forecast, scenario and recommendation logic
lib/sample.ts           deterministic in-browser demo company
lib/view.ts             filtering and KPI re-aggregation
src/                    deterministic Python analytics reference pipeline
tests/                  Python and TypeScript test suites
.github/workflows/      CI quality gate
```

## Product direction

The next meaningful product steps would be saved analyses/accounts, shareable read-only report links, customer/cohort retention, returns/refunds, contribution-margin layers, hierarchical anomaly attribution, and calibrated forecasting/elasticity models once real longitudinal datasets are available.

## License

MIT — see [`LICENSE`](LICENSE).
