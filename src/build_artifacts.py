"""Build the deterministic production artifact consumed by the Next.js application."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pandas as pd

from .analytics import (
    DIMENSIONS,
    combination_summary,
    dimension_summary,
    discount_analysis,
    kpis,
    monthly_performance,
    pareto,
    product_economics,
    robust_anomalies,
    seasonality,
)
from .config import ARTIFACT_PATH, RANDOM_SEED, SCHEMA_VERSION, SOURCE_DATA
from .features import enrich_transactions
from .insights import generate_recommendations
from .validation import validate_sales_data


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _frontend_records(df: pd.DataFrame) -> list[dict[str, object]]:
    columns = [
        "transaction_id",
        "order_id",
        "order_date",
        "region",
        "channel",
        "customer_segment",
        "category",
        "product",
        "quantity",
        "gross_revenue",
        "discount_amount",
        "discount_rate",
        "net_revenue",
        "cost",
        "gross_profit",
        "gross_margin",
        "month",
    ]
    out = df[columns].copy()
    out["order_date"] = out["order_date"].dt.strftime("%Y-%m-%d")
    for col in ("gross_revenue", "discount_amount", "net_revenue", "cost", "gross_profit"):
        out[col] = out[col].round(2)
    for col in ("discount_rate", "gross_margin"):
        out[col] = out[col].round(4)
    return out.to_dict(orient="records")


def build_artifact(source: Path = SOURCE_DATA, destination: Path = ARTIFACT_PATH) -> dict[str, object]:
    """Validate source data, calculate analytics, and serialize the production artifact."""
    frame = pd.read_csv(source)
    report = validate_sales_data(frame)
    facts = enrich_transactions(frame)
    source_hash = _sha256(source)
    build_id = hashlib.sha256(f"{source_hash}|{SCHEMA_VERSION}|{RANDOM_SEED}".encode()).hexdigest()[:16]

    artifact: dict[str, object] = {
        "metadata": {
            "schema_version": SCHEMA_VERSION,
            "build_id": build_id,
            "build_mode": "deterministic",
            "source_file": source.name,
            "source_sha256": source_hash,
            "row_count": report.row_count,
            "column_count": report.columns,
            "validation_status": report.status,
            "validation_checks": list(report.checks),
            "random_seed": RANDOM_SEED,
            "date_min": facts["order_date"].min().strftime("%Y-%m-%d"),
            "date_max": facts["order_date"].max().strftime("%Y-%m-%d"),
        },
        "filter_options": {
            "regions": sorted(facts["region"].unique().tolist()),
            "channels": sorted(facts["channel"].unique().tolist()),
            "segments": sorted(facts["customer_segment"].unique().tolist()),
            "categories": sorted(facts["category"].unique().tolist()),
            "products": sorted(facts["product"].unique().tolist()),
        },
        "summary": kpis(facts),
        "monthly_performance": monthly_performance(facts),
        "dimensions": {dimension: dimension_summary(facts, dimension) for dimension in DIMENSIONS},
        "combinations": {
            "category_channel": combination_summary(facts, ("category", "channel")),
            "region_category": combination_summary(facts, ("region", "category")),
            "channel_segment": combination_summary(facts, ("channel", "customer_segment")),
            "product_channel": combination_summary(facts, ("product", "channel"), limit=40),
        },
        "pareto": {
            "product": pareto(facts, "product"),
            "category": pareto(facts, "category"),
        },
        "discount": discount_analysis(facts),
        "product_economics": product_economics(facts),
        "anomalies": robust_anomalies(facts),
        "seasonality": seasonality(facts),
        "recommendations": generate_recommendations(facts),
        "methodology": {
            "anomaly_detection": "Monthly revenue, profit, and margin use MAD robust z-scores; |z| >= 3.0 is flagged.",
            "growth": "MoM uses percentage change from the immediately preceding month; YoY uses the same month 12 months earlier; acceleration is the first difference of MoM growth.",
            "margin": "Gross margin = (net revenue - cost) / net revenue. Margin before discount uses gross revenue as the denominator.",
            "discount": "Discount amount = gross revenue - net revenue. Weighted discount rate = total discount amount / total gross revenue.",
            "seasonality": "Month-of-year patterns are descriptive across the observed 2024–2025 history and are not causal claims.",
        },
        "records": _frontend_records(facts),
    }
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(artifact, indent=2, sort_keys=True), encoding="utf-8")
    return artifact


def main() -> None:
    artifact = build_artifact()
    metadata = artifact["metadata"]
    print(
        f"Built {ARTIFACT_PATH} | rows={metadata['row_count']} | "
        f"validation={metadata['validation_status']} | build_id={metadata['build_id']}"
    )


if __name__ == "__main__":
    main()
