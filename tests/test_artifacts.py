from __future__ import annotations

import json
from pathlib import Path

from src.build_artifacts import build_artifact
from src.generate_data import write_dataset


def test_generation_is_deterministic(tmp_path: Path) -> None:
    left = tmp_path / "left.csv"
    right = tmp_path / "right.csv"
    write_dataset(left, rows=500, seed=42)
    write_dataset(right, rows=500, seed=42)
    assert left.read_bytes() == right.read_bytes()


def test_artifact_contains_required_metadata_and_outputs(tmp_path: Path) -> None:
    source = tmp_path / "sales.csv"
    destination = tmp_path / "analytics.json"
    write_dataset(source, rows=700, seed=20260820)
    artifact = build_artifact(source, destination)
    assert artifact["metadata"]["validation_status"] == "passed"
    assert artifact["metadata"]["row_count"] == 700
    assert artifact["metadata"]["build_mode"] == "deterministic"
    assert len(str(artifact["metadata"]["source_sha256"])) == 64
    assert artifact["summary"]["net_revenue"] > 0
    assert artifact["recommendations"]
    assert destination.exists()
    assert json.loads(destination.read_text())["metadata"]["build_id"] == artifact["metadata"]["build_id"]


def test_artifact_build_id_is_reproducible(tmp_path: Path) -> None:
    source = tmp_path / "sales.csv"
    write_dataset(source, rows=400, seed=20260820)
    first = build_artifact(source, tmp_path / "one.json")
    second = build_artifact(source, tmp_path / "two.json")
    assert first["metadata"]["build_id"] == second["metadata"]["build_id"]
    assert (tmp_path / "one.json").read_bytes() == (tmp_path / "two.json").read_bytes()
