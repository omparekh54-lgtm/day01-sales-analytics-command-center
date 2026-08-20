"""Evidence-based recommendation generation from calculated commercial metrics."""
from __future__ import annotations

import pandas as pd

from .analytics import dimension_summary, kpis


def _money(value: float) -> str:
    return f"${value:,.0f}"


def _pct(value: float) -> str:
    return f"{value * 100:.1f}%"


def _scope(dimension: str | None = None, value: str | None = None) -> dict[str, str | None]:
    return {"dimension": dimension, "value": value}


def generate_recommendations(df: pd.DataFrame) -> list[dict[str, object]]:
    """Generate computed observations, implications, and actions for global and scoped views."""
    recommendations: list[dict[str, object]] = []
    overall = kpis(df)

    product = pd.DataFrame(dimension_summary(df, "product"))
    category = pd.DataFrame(dimension_summary(df, "category"))
    channel = pd.DataFrame(dimension_summary(df, "channel"))
    region = pd.DataFrame(dimension_summary(df, "region"))
    segment = pd.DataFrame(dimension_summary(df, "customer_segment"))

    median_product_margin = float(product["margin"].median())
    revenue_q75 = float(product["revenue"].quantile(0.75))
    pressure = product[(product["revenue"] >= revenue_q75) & (product["margin"] < median_product_margin)]
    if not pressure.empty:
        row = pressure.sort_values("revenue", ascending=False).iloc[0]
        recommendations.append(
            {
                "id": "global-product-margin-pressure",
                "severity": "high",
                "scope": _scope(),
                "observation": f"{row['product']} is a top-quartile revenue product but earns only {_pct(float(row['margin']))} gross margin.",
                "evidence": f"It generated {_money(float(row['revenue']))} revenue and {_money(float(row['profit']))} gross profit, versus a product median margin of {_pct(median_product_margin)}.",
                "implication": "A large revenue base is carrying weaker unit economics than the typical product, so growth may be less valuable than it appears.",
                "recommendation": "Review pricing, discount thresholds, and cost drivers for this product before increasing demand-generation spend.",
            }
        )

    high_discount = channel.sort_values("discount_rate", ascending=False).iloc[0]
    low_discount = channel.sort_values("discount_rate", ascending=True).iloc[0]
    if float(high_discount["discount_rate"]) - float(low_discount["discount_rate"]) > 0.025:
        recommendations.append(
            {
                "id": "global-channel-discount-spread",
                "severity": "medium",
                "scope": _scope("channel", str(high_discount["channel"])),
                "observation": f"{high_discount['channel']} carries the highest realized discount rate at {_pct(float(high_discount['discount_rate']))}.",
                "evidence": f"Its discount rate is {(float(high_discount['discount_rate']) - float(low_discount['discount_rate'])) * 100:.1f} percentage points above {low_discount['channel']}, while margin is {_pct(float(high_discount['margin']))}.",
                "implication": "Commercial volume in this channel is more dependent on price concessions, increasing the risk of margin leakage.",
                "recommendation": "Introduce approval bands for high-discount transactions and evaluate whether volume gains offset foregone gross profit.",
            }
        )

    weakest_region = region.sort_values("margin").iloc[0]
    strongest_region = region.sort_values("margin", ascending=False).iloc[0]
    recommendations.append(
        {
            "id": "global-regional-economics-gap",
            "severity": "medium",
            "scope": _scope("region", str(weakest_region["region"])),
            "observation": f"{weakest_region['region']} has the lowest regional margin at {_pct(float(weakest_region['margin']))}.",
            "evidence": f"That is {(float(strongest_region['margin']) - float(weakest_region['margin'])) * 100:.1f} percentage points below {strongest_region['region']}, on {_money(float(weakest_region['revenue']))} revenue.",
            "implication": "The regional revenue mix is economically uneven and may reflect logistics cost, discount mix, or product mix differences.",
            "recommendation": "Decompose the regional gap by category and channel before setting a region-wide growth target.",
        }
    )

    top_category = category.sort_values("revenue", ascending=False).iloc[0]
    if float(top_category["profit_share"]) + 0.03 < float(top_category["revenue_share"]):
        recommendations.append(
            {
                "id": "global-category-profit-underweight",
                "severity": "high",
                "scope": _scope("category", str(top_category["category"])),
                "observation": f"{top_category['category']} contributes {_pct(float(top_category['revenue_share']))} of revenue but only {_pct(float(top_category['profit_share']))} of gross profit.",
                "evidence": f"Its realized gross margin is {_pct(float(top_category['margin']))} with a {_pct(float(top_category['discount_rate']))} discount rate.",
                "implication": "Revenue concentration in the category overstates its contribution to economic value.",
                "recommendation": "Prioritize high-margin products within the category and test lower discount ceilings on weak-margin combinations.",
            }
        )

    high_segment = segment.sort_values("discount_rate", ascending=False).iloc[0]
    recommendations.append(
        {
            "id": "global-segment-discount-governance",
            "severity": "medium",
            "scope": _scope("customer_segment", str(high_segment["customer_segment"])),
            "observation": f"{high_segment['customer_segment']} receives the highest segment discount rate at {_pct(float(high_segment['discount_rate']))}.",
            "evidence": f"The segment produced {_money(float(high_segment['revenue']))} revenue at {_pct(float(high_segment['margin']))} margin.",
            "implication": "Large negotiated discounts can be economically justified only if they are supported by sufficient volume, retention, or lower service cost.",
            "recommendation": "Create segment-specific discount guardrails tied to contribution margin rather than using revenue alone.",
        }
    )

    recommendations.append(
        {
            "id": "global-discount-pool",
            "severity": "info",
            "scope": _scope(),
            "observation": f"The business gave up {_money(float(overall['discount_amount']))} of gross revenue through discounts.",
            "evidence": f"Weighted realized discount is {_pct(float(overall['discount_rate']))}; gross margin after discount is {_pct(float(overall['gross_margin']))}.",
            "implication": "Even small improvements in discount discipline can materially change gross profit at this revenue scale.",
            "recommendation": "Track discount amount as a controllable investment and review the top product-channel combinations consuming it each month.",
        }
    )

    # Create scoped recommendations for every major dimension value so UI filters can change the evidence shown
    # without inventing analytical conclusions in the browser.
    for dimension, table in [
        ("region", region),
        ("channel", channel),
        ("customer_segment", segment),
        ("category", category),
        ("product", product),
    ]:
        median_margin = float(table["margin"].median())
        median_discount = float(table["discount_rate"].median())
        for _, row in table.iterrows():
            value = str(row[dimension])
            if float(row["margin"]) < median_margin - 0.015 or float(row["discount_rate"]) > median_discount + 0.02:
                recommendations.append(
                    {
                        "id": f"scope-{dimension}-{value.lower().replace(' ', '-')}",
                        "severity": "medium",
                        "scope": _scope(dimension, value),
                        "observation": f"{value} is economically weaker than its peer median on margin or discount discipline.",
                        "evidence": f"Revenue {_money(float(row['revenue']))}, margin {_pct(float(row['margin']))}, discount {_pct(float(row['discount_rate']))}.",
                        "implication": "The filtered commercial slice deserves a mix, pricing, or cost review before pursuing additional volume.",
                        "recommendation": "Inspect the next-level product and channel mix, then target the specific combinations driving the gap.",
                    }
                )
    return recommendations
