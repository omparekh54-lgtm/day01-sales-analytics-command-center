"""Feature engineering for analytical facts consumed by Python analytics and the frontend."""
from __future__ import annotations

import pandas as pd


def enrich_transactions(frame: pd.DataFrame) -> pd.DataFrame:
    """Add financial facts and calendar features without mutating input."""
    df = frame.copy()
    df["order_date"] = pd.to_datetime(df["order_date"], errors="raise")
    df["gross_revenue"] = df["quantity"] * df["list_price"]
    df["discount_amount"] = df["gross_revenue"] * df["discount_rate"]
    df["net_revenue"] = df["gross_revenue"] - df["discount_amount"]
    df["cost"] = df["quantity"] * df["unit_cost"]
    df["gross_profit"] = df["net_revenue"] - df["cost"]
    df["gross_margin"] = df["gross_profit"] / df["net_revenue"].where(df["net_revenue"] != 0)
    df["margin_before_discount"] = (df["gross_revenue"] - df["cost"]) / df["gross_revenue"]
    df["year"] = df["order_date"].dt.year
    df["quarter"] = df["order_date"].dt.to_period("Q").astype(str)
    df["month"] = df["order_date"].dt.to_period("M").astype(str)
    df["month_of_year"] = df["order_date"].dt.month
    return df
