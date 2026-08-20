"""Commercial analytics calculations for the Sales Analytics Command Center."""
from __future__ import annotations

from collections.abc import Iterable

import numpy as np
import pandas as pd

DIMENSIONS = ("region", "channel", "customer_segment", "category", "product")


def _round(value: float | int | np.floating, digits: int = 4) -> float:
    return round(float(value), digits)


def kpis(df: pd.DataFrame) -> dict[str, float | int]:
    """Calculate the executive KPI set from enriched transaction facts."""
    gross_revenue = float(df["gross_revenue"].sum())
    net_revenue = float(df["net_revenue"].sum())
    cost = float(df["cost"].sum())
    profit = float(df["gross_profit"].sum())
    orders = int(df["order_id"].nunique())
    units = int(df["quantity"].sum())
    return {
        "gross_revenue": _round(gross_revenue, 2),
        "net_revenue": _round(net_revenue, 2),
        "revenue": _round(net_revenue, 2),
        "units_sold": units,
        "orders": orders,
        "average_order_value": _round(net_revenue / orders if orders else 0.0, 2),
        "average_selling_price": _round(net_revenue / units if units else 0.0, 2),
        "cost": _round(cost, 2),
        "gross_profit": _round(profit, 2),
        "gross_margin": _round(profit / net_revenue if net_revenue else 0.0, 4),
        "discount_amount": _round(float(df["discount_amount"].sum()), 2),
        "discount_rate": _round(float(df["discount_amount"].sum()) / gross_revenue if gross_revenue else 0.0, 4),
        "margin_before_discount": _round((gross_revenue - cost) / gross_revenue if gross_revenue else 0.0, 4),
    }


def _aggregate(df: pd.DataFrame, group_cols: list[str]) -> pd.DataFrame:
    grouped = (
        df.groupby(group_cols, observed=True)
        .agg(
            gross_revenue=("gross_revenue", "sum"),
            revenue=("net_revenue", "sum"),
            profit=("gross_profit", "sum"),
            cost=("cost", "sum"),
            discount_amount=("discount_amount", "sum"),
            units=("quantity", "sum"),
            orders=("order_id", "nunique"),
        )
        .reset_index()
    )
    grouped["margin"] = grouped["profit"] / grouped["revenue"].replace(0, np.nan)
    grouped["discount_rate"] = grouped["discount_amount"] / grouped["gross_revenue"].replace(0, np.nan)
    return grouped


def dimension_summary(df: pd.DataFrame, dimension: str) -> list[dict[str, object]]:
    """Aggregate economics for one commercial dimension."""
    grouped = _aggregate(df, [dimension]).sort_values("revenue", ascending=False)
    total_revenue = float(grouped["revenue"].sum()) or 1.0
    total_profit = float(grouped["profit"].sum()) or 1.0
    grouped["revenue_share"] = grouped["revenue"] / total_revenue
    grouped["profit_share"] = grouped["profit"] / total_profit
    return _records(grouped)


def combination_summary(df: pd.DataFrame, dimensions: Iterable[str], *, limit: int = 60) -> list[dict[str, object]]:
    """Aggregate commercially useful cross-dimensional combinations."""
    grouped = _aggregate(df, list(dimensions)).sort_values("revenue", ascending=False).head(limit)
    return _records(grouped)


def monthly_performance(df: pd.DataFrame) -> list[dict[str, object]]:
    """Calculate monthly performance, growth, rolling averages, YoY, and acceleration."""
    grouped = _aggregate(df, ["month"]).sort_values("month")
    grouped["mom_revenue_growth"] = grouped["revenue"].pct_change()
    grouped["mom_profit_growth"] = grouped["profit"].pct_change()
    grouped["margin_change_pp"] = grouped["margin"].diff() * 100
    grouped["yoy_revenue_growth"] = grouped["revenue"].pct_change(12)
    grouped["yoy_profit_growth"] = grouped["profit"].pct_change(12)
    grouped["revenue_rolling_3m"] = grouped["revenue"].rolling(3, min_periods=1).mean()
    grouped["profit_rolling_3m"] = grouped["profit"].rolling(3, min_periods=1).mean()
    grouped["growth_acceleration"] = grouped["mom_revenue_growth"].diff()
    return _records(grouped)


def pareto(df: pd.DataFrame, dimension: str) -> dict[str, object]:
    """Calculate revenue concentration and the share of entities needed to reach 80% of revenue."""
    grouped = _aggregate(df, [dimension]).sort_values("revenue", ascending=False)
    total = float(grouped["revenue"].sum()) or 1.0
    grouped["revenue_share"] = grouped["revenue"] / total
    grouped["cumulative_revenue_share"] = grouped["revenue_share"].cumsum()
    count_80 = int((grouped["cumulative_revenue_share"] < 0.8).sum() + 1)
    top_n = min(3, len(grouped))
    return {
        "dimension": dimension,
        "entities_for_80_percent": count_80,
        "entity_count": int(len(grouped)),
        "share_of_entities_for_80_percent": _round(count_80 / max(1, len(grouped)), 4),
        "top_3_revenue_share": _round(float(grouped.head(top_n)["revenue"].sum()) / total, 4),
        "curve": _records(grouped[[dimension, "revenue", "revenue_share", "cumulative_revenue_share"]]),
    }


def discount_analysis(df: pd.DataFrame) -> dict[str, object]:
    """Quantify discount leakage, margin erosion, and discount/margin relationship."""
    bins = [-0.001, 0.05, 0.10, 0.15, 0.20, 0.26, 1.0]
    labels = ["0–5%", "5–10%", "10–15%", "15–20%", "20–26%", "26%+"]
    bucketed = df.copy()
    bucketed["discount_bucket"] = pd.cut(bucketed["discount_rate"], bins=bins, labels=labels)
    bucket_summary = _aggregate(bucketed, ["discount_bucket"])
    bucket_summary["discount_bucket"] = bucket_summary["discount_bucket"].astype(str)
    corr = float(df[["discount_rate", "gross_margin"]].corr(method="spearman").iloc[0, 1])
    gross_revenue = float(df["gross_revenue"].sum())
    cost = float(df["cost"].sum())
    net_revenue = float(df["net_revenue"].sum())
    profit = float(df["gross_profit"].sum())
    margin_before = (gross_revenue - cost) / gross_revenue if gross_revenue else 0.0
    margin_after = profit / net_revenue if net_revenue else 0.0

    leakage_cutoff = float(df["discount_rate"].quantile(0.85))
    leakage = df[df["discount_rate"] >= leakage_cutoff]
    return {
        "average_discount": _round(float(df["discount_rate"].mean()), 4),
        "weighted_discount_rate": _round(float(df["discount_amount"].sum()) / gross_revenue if gross_revenue else 0.0, 4),
        "revenue_lost_to_discounts": _round(float(df["discount_amount"].sum()), 2),
        "margin_before_discount": _round(margin_before, 4),
        "margin_after_discount": _round(margin_after, 4),
        "margin_erosion_pp": _round((margin_before - margin_after) * 100, 2),
        "discount_margin_spearman": _round(corr, 4),
        "leakage_threshold": _round(leakage_cutoff, 4),
        "leakage_revenue": _round(float(leakage["net_revenue"].sum()), 2),
        "leakage_discount_amount": _round(float(leakage["discount_amount"].sum()), 2),
        "distribution": _records(bucket_summary),
        "by_product": dimension_summary(df, "product"),
        "by_segment": dimension_summary(df, "customer_segment"),
        "by_channel": dimension_summary(df, "channel"),
    }


def robust_anomalies(df: pd.DataFrame, threshold: float = 3.0) -> list[dict[str, object]]:
    """Detect monthly revenue, profit, and margin anomalies with median absolute deviation z-scores."""
    monthly = _aggregate(df, ["month"]).sort_values("month")
    output: list[dict[str, object]] = []
    for metric in ("revenue", "profit", "margin"):
        values = monthly[metric].astype(float)
        median = float(values.median())
        mad = float(np.median(np.abs(values - median)))
        method = "MAD robust z-score"
        if mad > 0:
            scores = 0.6745 * (values - median) / mad
        else:
            # A mostly-flat series can have MAD=0 even when one month is extreme.
            # Fall back to standard-deviation scaling rather than silently declaring no anomalies.
            scale = float(values.std(ddof=0))
            scores = np.zeros(len(values)) if scale == 0 else (values - median) / scale
            method = "median-centered z-score fallback (MAD=0)"
        for month, value, score in zip(monthly["month"], values, scores, strict=True):
            if abs(float(score)) >= threshold:
                output.append(
                    {
                        "month": str(month),
                        "metric": metric,
                        "value": _round(value, 4 if metric == "margin" else 2),
                        "robust_z_score": _round(score, 3),
                        "direction": "high" if score > 0 else "low",
                        "method": method,
                        "threshold": threshold,
                    }
                )
    return output


def seasonality(df: pd.DataFrame) -> dict[str, object]:
    """Summarize recurring month-of-year patterns descriptively across available years."""
    month = _aggregate(df, ["month_of_year"]).sort_values("month_of_year")
    category = _aggregate(df, ["category", "month_of_year"])
    channel = _aggregate(df, ["channel", "month_of_year"])
    return {
        "monthly": _records(month),
        "category_month": _records(category),
        "channel_month": _records(channel),
        "note": "Seasonality is descriptive across the two observed years and is not a causal claim.",
    }


def product_economics(df: pd.DataFrame) -> list[dict[str, object]]:
    """Calculate product economics, temporal direction, and discount behavior."""
    summary = _aggregate(df, ["product", "category"]).sort_values("revenue", ascending=False)
    monthly = _aggregate(df, ["product", "month"]).sort_values(["product", "month"])
    rows: list[dict[str, object]] = []
    for _, row in summary.iterrows():
        product = str(row["product"])
        series = monthly[monthly["product"] == product].copy()
        first = float(series.head(3)["revenue"].mean())
        last = float(series.tail(3)["revenue"].mean())
        first_margin = float(series.head(3)["margin"].mean())
        last_margin = float(series.tail(3)["margin"].mean())
        revenue_growth = (last / first - 1.0) if first else 0.0
        rows.append(
            {
                "product": product,
                "category": str(row["category"]),
                "revenue": _round(row["revenue"], 2),
                "profit": _round(row["profit"], 2),
                "margin": _round(row["margin"], 4),
                "discount_rate": _round(row["discount_rate"], 4),
                "units": int(row["units"]),
                "orders": int(row["orders"]),
                "recent_revenue_growth": _round(revenue_growth, 4),
                "recent_margin_change_pp": _round((last_margin - first_margin) * 100, 2),
                "growth_profile": (
                    "strong-growth-strong-margin"
                    if revenue_growth > 0.12 and row["margin"] > summary["margin"].median()
                    else "growth-margin-pressure"
                    if revenue_growth > 0.12 and last_margin < first_margin - 0.015
                    else "declining"
                    if revenue_growth < -0.08
                    else "stable"
                ),
            }
        )
    return rows


def _records(frame: pd.DataFrame) -> list[dict[str, object]]:
    records: list[dict[str, object]] = []
    for record in frame.replace({np.nan: None, np.inf: None, -np.inf: None}).to_dict(orient="records"):
        cleaned: dict[str, object] = {}
        for key, value in record.items():
            if isinstance(value, (np.integer,)):
                cleaned[key] = int(value)
            elif isinstance(value, (np.floating,)):
                cleaned[key] = _round(value, 4)
            else:
                cleaned[key] = value
        records.append(cleaned)
    return records
