"""Strict data-quality validation for commercial sales records."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Iterable

import pandas as pd

REQUIRED_COLUMNS = {
    "transaction_id",
    "order_id",
    "order_date",
    "region",
    "channel",
    "customer_segment",
    "category",
    "product",
    "quantity",
    "list_price",
    "discount_rate",
    "unit_cost",
}
ID_PREFIXES = {"transaction_id": "TXN-", "order_id": "ORD-"}


class DataValidationError(ValueError):
    """Raised when input data violates the documented schema or business rules."""


@dataclass(frozen=True)
class ValidationReport:
    """Serializable validation outcome."""

    status: str
    row_count: int
    columns: int
    checks: tuple[str, ...]


def _fail(message: str) -> None:
    raise DataValidationError(message)


def _assert_numeric(frame: pd.DataFrame, columns: Iterable[str]) -> None:
    for column in columns:
        converted = pd.to_numeric(frame[column], errors="coerce")
        bad = converted.isna() & frame[column].notna()
        if bad.any():
            examples = frame.loc[bad, column].astype(str).head(3).tolist()
            _fail(f"Column '{column}' contains invalid numeric values: {examples}")


def validate_sales_data(frame: pd.DataFrame, *, strict_columns: bool = True) -> ValidationReport:
    """Validate schema, types, dates, numeric ranges, IDs, duplicates, and business rules."""
    if frame.empty:
        _fail("Dataset is empty; analytics cannot be produced.")

    missing = REQUIRED_COLUMNS - set(frame.columns)
    if missing:
        _fail(f"Missing required columns: {sorted(missing)}")
    if strict_columns:
        unexpected = set(frame.columns) - REQUIRED_COLUMNS
        if unexpected:
            _fail(f"Unexpected columns present: {sorted(unexpected)}")

    if frame[list(REQUIRED_COLUMNS)].isna().any().any():
        null_counts = frame[list(REQUIRED_COLUMNS)].isna().sum()
        null_counts = null_counts[null_counts > 0].to_dict()
        _fail(f"Null values found in required columns: {null_counts}")

    if frame["transaction_id"].duplicated().any():
        dupes = frame.loc[frame["transaction_id"].duplicated(), "transaction_id"].head(5).tolist()
        _fail(f"Duplicate transaction IDs found: {dupes}")

    for column, prefix in ID_PREFIXES.items():
        malformed = ~frame[column].astype(str).str.match(rf"^{prefix}\d+$")
        if malformed.any():
            _fail(f"Malformed {column}: {frame.loc[malformed, column].astype(str).head(3).tolist()}")

    dates = pd.to_datetime(frame["order_date"], errors="coerce", format="mixed")
    if dates.isna().any():
        _fail("Invalid order_date values found; expected ISO-compatible dates.")
    if (dates.dt.date > date.today()).any():
        _fail("Impossible future order_date values found.")
    if (dates < pd.Timestamp("2000-01-01")).any():
        _fail("Impossible historical order_date values found before 2000-01-01.")

    numeric_columns = ("quantity", "list_price", "discount_rate", "unit_cost")
    _assert_numeric(frame, numeric_columns)
    quantity = pd.to_numeric(frame["quantity"])
    list_price = pd.to_numeric(frame["list_price"])
    discount = pd.to_numeric(frame["discount_rate"])
    unit_cost = pd.to_numeric(frame["unit_cost"])

    if (quantity <= 0).any():
        _fail("Quantity must be greater than zero; zero/negative quantities are invalid.")
    if (quantity % 1 != 0).any():
        _fail("Quantity must contain whole units only.")
    if (list_price <= 0).any():
        _fail("List price must be greater than zero.")
    if (unit_cost < 0).any():
        _fail("Unit cost cannot be negative.")
    if ((discount < 0) | (discount > 1)).any():
        _fail("Discount rate must be between 0 and 1 inclusive.")

    gross_revenue = quantity * list_price
    net_revenue = gross_revenue * (1 - discount)
    total_cost = quantity * unit_cost
    if (~gross_revenue.map(pd.notna)).any() or (gross_revenue <= 0).any():
        _fail("Impossible gross revenue detected.")
    if (net_revenue < 0).any():
        _fail("Impossible negative net revenue detected.")
    if (total_cost < 0).any():
        _fail("Impossible negative total cost detected.")

    checks = (
        "required_columns",
        "unexpected_columns",
        "null_values",
        "duplicate_transaction_ids",
        "id_format",
        "date_parse",
        "date_range",
        "numeric_types",
        "quantity_range",
        "price_range",
        "cost_range",
        "discount_range",
        "derived_revenue_rules",
    )
    return ValidationReport(status="passed", row_count=len(frame), columns=len(frame.columns), checks=checks)
