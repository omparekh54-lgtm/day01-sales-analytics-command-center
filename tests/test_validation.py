from __future__ import annotations

import pandas as pd
import pytest

from src.generate_data import generate_sales_data
from src.validation import DataValidationError, validate_sales_data


@pytest.fixture()
def valid_frame() -> pd.DataFrame:
    return generate_sales_data(rows=120, seed=7)


def test_valid_dataset_passes(valid_frame: pd.DataFrame) -> None:
    report = validate_sales_data(valid_frame)
    assert report.status == "passed"
    assert report.row_count == 120


@pytest.mark.parametrize(
    ("column", "value", "message"),
    [
        ("quantity", 0, "Quantity"),
        ("quantity", -1, "Quantity"),
        ("list_price", -5, "List price"),
        ("unit_cost", -2, "Unit cost"),
        ("discount_rate", -0.1, "Discount rate"),
        ("discount_rate", 1.1, "Discount rate"),
    ],
)
def test_invalid_numeric_rules_fail(valid_frame: pd.DataFrame, column: str, value: float, message: str) -> None:
    frame = valid_frame.copy()
    frame.loc[0, column] = value
    with pytest.raises(DataValidationError, match=message):
        validate_sales_data(frame)


def test_missing_column_fails(valid_frame: pd.DataFrame) -> None:
    with pytest.raises(DataValidationError, match="Missing required columns"):
        validate_sales_data(valid_frame.drop(columns=["product"]))


def test_unexpected_column_fails(valid_frame: pd.DataFrame) -> None:
    frame = valid_frame.assign(extra="bad")
    with pytest.raises(DataValidationError, match="Unexpected columns"):
        validate_sales_data(frame)


def test_null_fails(valid_frame: pd.DataFrame) -> None:
    frame = valid_frame.copy()
    frame.loc[0, "region"] = None
    with pytest.raises(DataValidationError, match="Null values"):
        validate_sales_data(frame)


def test_duplicate_transaction_id_fails(valid_frame: pd.DataFrame) -> None:
    frame = valid_frame.copy()
    frame.loc[1, "transaction_id"] = frame.loc[0, "transaction_id"]
    with pytest.raises(DataValidationError, match="Duplicate transaction"):
        validate_sales_data(frame)


def test_malformed_id_fails(valid_frame: pd.DataFrame) -> None:
    frame = valid_frame.copy()
    frame.loc[0, "order_id"] = "oops"
    with pytest.raises(DataValidationError, match="Malformed order_id"):
        validate_sales_data(frame)


def test_invalid_date_fails(valid_frame: pd.DataFrame) -> None:
    frame = valid_frame.copy()
    frame.loc[0, "order_date"] = "not-a-date"
    with pytest.raises(DataValidationError, match="Invalid order_date"):
        validate_sales_data(frame)


def test_future_date_fails(valid_frame: pd.DataFrame) -> None:
    frame = valid_frame.copy()
    frame.loc[0, "order_date"] = "2099-01-01"
    with pytest.raises(DataValidationError, match="future"):
        validate_sales_data(frame)


def test_invalid_numeric_type_fails(valid_frame: pd.DataFrame) -> None:
    frame = valid_frame.copy()
    frame["list_price"] = frame["list_price"].astype(object)
    frame.loc[0, "list_price"] = "abc"
    with pytest.raises(DataValidationError, match="invalid numeric"):
        validate_sales_data(frame)


def test_empty_dataset_fails(valid_frame: pd.DataFrame) -> None:
    with pytest.raises(DataValidationError, match="empty"):
        validate_sales_data(valid_frame.iloc[0:0])
