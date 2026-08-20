"""Generate a realistic, deterministic synthetic commercial transaction dataset."""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

from .config import (
    CHANNEL_DEMAND,
    CHANNEL_DISCOUNT,
    CHANNEL_PRICE,
    CHANNELS,
    DATE_END,
    DATE_START,
    PRODUCTS,
    RANDOM_SEED,
    REGION_COST,
    REGION_DEMAND,
    REGIONS,
    ROW_COUNT,
    SEGMENT_DISCOUNT,
    SEGMENT_UNITS,
    SEGMENTS,
    SOURCE_DATA,
)


def _seasonality_factor(month: int, category: str) -> float:
    """Return descriptive demand seasonality without encoding an outcome winner."""
    common = {1: 0.92, 2: 0.94, 3: 1.00, 4: 1.02, 5: 1.03, 6: 0.98,
              7: 0.95, 8: 0.97, 9: 1.01, 10: 1.05, 11: 1.13, 12: 1.20}[month]
    category_adjustment = 1.0
    if category == "Electronics" and month in {11, 12}:
        category_adjustment *= 1.10
    elif category == "Fitness" and month in {1, 2}:
        category_adjustment *= 1.12
    elif category == "Home" and month in {4, 5}:
        category_adjustment *= 1.08
    elif category == "Office" and month in {8, 9}:
        category_adjustment *= 1.06
    return common * category_adjustment


def generate_sales_data(rows: int = ROW_COUNT, seed: int = RANDOM_SEED) -> pd.DataFrame:
    """Create reproducible transaction data with seasonality, noise, trend, and rare shocks.

    The generator intentionally simulates commercial mechanisms rather than desired conclusions:
    product-level demand trends, seasonality, channel pricing, segment discount expectations,
    modest cost inflation, and rare stochastic demand shocks. Random noise remains material.
    """
    rng = np.random.default_rng(seed)
    start = np.datetime64(DATE_START)
    end = np.datetime64(DATE_END)
    day_span = int((end - start).astype(int)) + 1

    product_weights = np.array([p.demand_weight for p in PRODUCTS], dtype=float)
    product_weights /= product_weights.sum()
    region_weights = np.array([0.27, 0.24, 0.20, 0.29])
    channel_weights = np.array([0.47, 0.34, 0.19])
    segment_weights = np.array([0.43, 0.29, 0.18, 0.10])

    records: list[dict[str, object]] = []
    order_seq = 100_000
    for idx in range(rows):
        product_idx = int(rng.choice(len(PRODUCTS), p=product_weights))
        spec = PRODUCTS[product_idx]
        region = str(rng.choice(REGIONS, p=region_weights))
        channel = str(rng.choice(CHANNELS, p=channel_weights))
        segment = str(rng.choice(SEGMENTS, p=segment_weights))
        date = start + np.timedelta64(int(rng.integers(0, day_span)), "D")
        ts = pd.Timestamp(date)
        month_index = (ts.year - 2024) * 12 + (ts.month - 1)

        trend_factor = max(0.72, 1.0 + spec.monthly_trend * month_index)
        season_factor = _seasonality_factor(ts.month, spec.category)
        demand_factor = (
            REGION_DEMAND[region]
            * CHANNEL_DEMAND[channel]
            * trend_factor
            * season_factor
        )
        demand_noise = float(rng.lognormal(mean=0.0, sigma=0.18))
        rare_shock = 1.0
        if rng.random() < 0.012:
            rare_shock = float(rng.uniform(1.45, 2.25))
        base_units = SEGMENT_UNITS[segment] * demand_factor * demand_noise * rare_shock
        quantity = max(1, int(rng.poisson(max(0.7, base_units))))

        market_price_noise = float(rng.normal(1.0, 0.035))
        list_price = spec.base_price * CHANNEL_PRICE[channel] * market_price_noise
        list_price = max(5.0, list_price)

        promo_pressure = 0.018 if ts.month in {11, 12} else 0.0
        discount_noise = float(rng.normal(0.0, 0.022))
        discount_rate = (
            CHANNEL_DISCOUNT[channel]
            + SEGMENT_DISCOUNT[segment]
            + promo_pressure
            + discount_noise
        )
        discount_rate = float(np.clip(discount_rate, 0.0, 0.33))

        annual_cost_inflation = 1.0 + 0.032 * ((ts - pd.Timestamp(DATE_START)).days / 365.25)
        logistics_noise = float(rng.normal(1.0, 0.025))
        unit_cost = (
            spec.base_price
            * spec.base_cost_ratio
            * REGION_COST[region]
            * annual_cost_inflation
            * logistics_noise
        )
        unit_cost = max(1.0, unit_cost)

        if idx % 2 == 0 or rng.random() < 0.67:
            order_seq += 1
        records.append(
            {
                "transaction_id": f"TXN-{idx + 1:06d}",
                "order_id": f"ORD-{order_seq:07d}",
                "order_date": ts.strftime("%Y-%m-%d"),
                "region": region,
                "channel": channel,
                "customer_segment": segment,
                "category": spec.category,
                "product": spec.product,
                "quantity": quantity,
                "list_price": round(list_price, 2),
                "discount_rate": round(discount_rate, 4),
                "unit_cost": round(unit_cost, 2),
            }
        )

    frame = pd.DataFrame.from_records(records)
    return frame.sort_values(["order_date", "transaction_id"], kind="stable").reset_index(drop=True)


def write_dataset(path: Path = SOURCE_DATA, rows: int = ROW_COUNT, seed: int = RANDOM_SEED) -> Path:
    """Write the generated dataset to disk."""
    path.parent.mkdir(parents=True, exist_ok=True)
    generate_sales_data(rows=rows, seed=seed).to_csv(path, index=False)
    return path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rows", type=int, default=ROW_COUNT)
    parser.add_argument("--seed", type=int, default=RANDOM_SEED)
    parser.add_argument("--output", type=Path, default=SOURCE_DATA)
    args = parser.parse_args()
    output = write_dataset(args.output, rows=args.rows, seed=args.seed)
    print(f"Generated {args.rows:,} rows at {output}")


if __name__ == "__main__":
    main()
