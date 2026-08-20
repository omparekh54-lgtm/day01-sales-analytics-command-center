"""Project configuration for the Sales Analytics Command Center."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
PUBLIC_DIR = ROOT / "public"
SOURCE_DATA = DATA_DIR / "sales.csv"
ARTIFACT_PATH = PUBLIC_DIR / "analytics.json"
SCHEMA_VERSION = "2.0.0"
RANDOM_SEED = 20260820
ROW_COUNT = 12_000
DATE_START = "2024-01-01"
DATE_END = "2025-12-31"


@dataclass(frozen=True)
class ProductSpec:
    """Synthetic product configuration used by the reproducible generator."""

    product: str
    category: str
    base_price: float
    base_cost_ratio: float
    demand_weight: float
    monthly_trend: float


PRODUCTS: tuple[ProductSpec, ...] = (
    ProductSpec("Apex Laptop Stand", "Office", 74.0, 0.46, 1.05, 0.006),
    ProductSpec("Vector Desk Hub", "Electronics", 129.0, 0.57, 1.00, 0.010),
    ProductSpec("Pulse ANC Headset", "Electronics", 189.0, 0.62, 0.85, 0.013),
    ProductSpec("Nimbus Webcam", "Electronics", 99.0, 0.54, 0.90, -0.003),
    ProductSpec("Arc Task Lamp", "Home", 86.0, 0.48, 0.90, 0.002),
    ProductSpec("Loft Air Purifier", "Home", 229.0, 0.66, 0.62, 0.008),
    ProductSpec("Stride Mat", "Fitness", 58.0, 0.41, 1.10, 0.004),
    ProductSpec("Forge Kettlebell", "Fitness", 92.0, 0.56, 0.82, -0.002),
    ProductSpec("Orbit Chair", "Office", 319.0, 0.68, 0.52, 0.005),
    ProductSpec("Slate Standing Desk", "Office", 549.0, 0.70, 0.35, 0.007),
    ProductSpec("Core Smart Scale", "Fitness", 119.0, 0.52, 0.73, 0.011),
    ProductSpec("Haven Diffuser", "Home", 69.0, 0.43, 0.96, -0.001),
)

REGIONS = ("North", "South", "East", "West")
CHANNELS = ("Online", "Retail", "Distributor")
SEGMENTS = ("Consumer", "SMB", "Mid-Market", "Enterprise")

REGION_DEMAND = {"North": 1.05, "South": 1.00, "East": 0.92, "West": 1.10}
REGION_COST = {"North": 1.00, "South": 0.98, "East": 1.03, "West": 1.02}
CHANNEL_DEMAND = {"Online": 1.12, "Retail": 1.00, "Distributor": 0.82}
CHANNEL_PRICE = {"Online": 0.99, "Retail": 1.03, "Distributor": 0.94}
CHANNEL_DISCOUNT = {"Online": 0.075, "Retail": 0.055, "Distributor": 0.12}
SEGMENT_DISCOUNT = {"Consumer": 0.015, "SMB": 0.035, "Mid-Market": 0.06, "Enterprise": 0.09}
SEGMENT_UNITS = {"Consumer": 1.0, "SMB": 1.7, "Mid-Market": 3.2, "Enterprise": 6.3}
