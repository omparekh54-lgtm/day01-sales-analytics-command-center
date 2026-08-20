from __future__ import annotations

import math

import pandas as pd

from src.analytics import discount_analysis, kpis, monthly_performance, pareto, robust_anomalies
from src.features import enrich_transactions


def _fixture() -> pd.DataFrame:
    frame = pd.DataFrame(
        [
            {"transaction_id": "TXN-1", "order_id": "ORD-1", "order_date": "2024-01-02", "region": "North", "channel": "Online", "customer_segment": "SMB", "category": "Office", "product": "A", "quantity": 2, "list_price": 100.0, "discount_rate": 0.10, "unit_cost": 50.0},
            {"transaction_id": "TXN-2", "order_id": "ORD-1", "order_date": "2024-01-02", "region": "North", "channel": "Online", "customer_segment": "SMB", "category": "Office", "product": "B", "quantity": 1, "list_price": 200.0, "discount_rate": 0.20, "unit_cost": 100.0},
            {"transaction_id": "TXN-3", "order_id": "ORD-2", "order_date": "2024-02-02", "region": "South", "channel": "Retail", "customer_segment": "Consumer", "category": "Home", "product": "A", "quantity": 1, "list_price": 100.0, "discount_rate": 0.00, "unit_cost": 40.0},
        ]
    )
    return enrich_transactions(frame)


def test_kpis_are_calculated_from_transaction_facts() -> None:
    result = kpis(_fixture())
    assert result["gross_revenue"] == 500.0
    assert result["discount_amount"] == 60.0
    assert result["net_revenue"] == 440.0
    assert result["cost"] == 240.0
    assert result["gross_profit"] == 200.0
    assert result["orders"] == 2
    assert result["units_sold"] == 4
    assert result["average_order_value"] == 220.0
    assert math.isclose(float(result["gross_margin"]), 200 / 440, rel_tol=1e-3)


def test_monthly_growth_is_period_over_period() -> None:
    result = monthly_performance(_fixture())
    assert len(result) == 2
    january, february = result
    assert january["mom_revenue_growth"] is None
    assert math.isclose(float(february["mom_revenue_growth"]), 100 / 340 - 1, rel_tol=1e-4)


def test_discount_analysis_quantifies_revenue_lost() -> None:
    result = discount_analysis(_fixture())
    assert result["revenue_lost_to_discounts"] == 60.0
    assert math.isclose(float(result["weighted_discount_rate"]), 0.12, rel_tol=1e-3)
    assert float(result["margin_before_discount"]) > float(result["margin_after_discount"])


def test_pareto_curve_reaches_full_revenue_share() -> None:
    result = pareto(_fixture(), "product")
    curve = result["curve"]
    assert math.isclose(float(curve[-1]["cumulative_revenue_share"]), 1.0, rel_tol=1e-4)
    assert 1 <= int(result["entities_for_80_percent"]) <= int(result["entity_count"])


def test_robust_anomaly_detector_flags_extreme_month() -> None:
    rows = []
    for month in range(1, 13):
        revenue = 100 if month < 12 else 1000
        rows.append({
            "transaction_id": f"TXN-{month}", "order_id": f"ORD-{month}", "order_date": f"2024-{month:02d}-01",
            "region": "North", "channel": "Online", "customer_segment": "SMB", "category": "Office", "product": "A",
            "quantity": 1, "list_price": float(revenue), "discount_rate": 0.0, "unit_cost": 50.0,
        })
    facts = enrich_transactions(pd.DataFrame(rows))
    anomalies = robust_anomalies(facts, threshold=3.0)
    assert any(item["month"] == "2024-12" and item["metric"] == "revenue" for item in anomalies)
