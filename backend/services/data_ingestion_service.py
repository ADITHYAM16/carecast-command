"""
Data Ingestion Service
======================
Handles upload, validation, automatic column classification, and normalization
of externally-supplied hospital operational datasets (CSV / XLS / XLSX).

The service stores the latest uploaded dataset in memory and on disk so that
all other services can call `get_current_dataset_metrics()` to obtain a
metrics dict in the same shape as `dashboard_service.get_live_metrics()`.
"""
import io
import os
import json
import threading
import time
from typing import Optional

import pandas as pd
import numpy as np

# ── Storage paths ─────────────────────────────────────────────────────────────

_UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "uploads")
os.makedirs(_UPLOAD_DIR, exist_ok=True)

_META_PATH = os.path.join(_UPLOAD_DIR, "current_meta.json")
_DATA_PATH = os.path.join(_UPLOAD_DIR, "current_dataset.csv")

# ── In-memory state ───────────────────────────────────────────────────────────

_lock = threading.Lock()

_current_df: Optional[pd.DataFrame] = None
_current_meta: dict = {}
_current_metrics: Optional[dict] = None
_classification: dict = {}   # canonical_name -> detected_column_name
_classification_confidence: dict = {}  # canonical_name -> confidence 0-1

# ── Column classification rules ───────────────────────────────────────────────
# Each entry: (canonical_name, [keyword_patterns], required)

_COLUMN_RULES = [
    ("PATIENT_ARRIVALS",  ["patient_arrival", "arrivals", "patients_arrived", "admission_count", "emergency_arrival", "total_arrival"], False),
    ("EMERGENCY_DEMAND",  ["emergency_case", "emergency_patient", "trauma_case", "er_case", "emergency_demand", "emergency_count"], False),
    ("OCCUPIED_BEDS",     ["occupied_bed", "beds_occupied", "bed_occupancy", "occupied_general", "general_occupied"], True),
    ("BED_CAPACITY",      ["total_bed", "bed_capacity", "beds_available_total", "general_capacity", "total_general"], True),
    ("ICU_OCCUPANCY",     ["icu_occupied", "occupied_icu", "icu_patient", "icu_used", "icu_occupancy"], False),
    ("ICU_CAPACITY",      ["icu_capacity", "total_icu", "icu_total", "icu_beds"], False),
    ("CT_DEMAND",         ["ct_request", "ct_demand", "ct_scan", "ct_utilization", "ct_usage", "ct_count"], False),
    ("CT_CAPACITY",       ["ct_capacity", "ct_available", "ct_total", "ct_slots"], False),
    ("MRI_DEMAND",        ["mri_request", "mri_demand", "mri_scan", "mri_utilization", "mri_usage"], False),
    ("MRI_CAPACITY",      ["mri_capacity", "mri_available", "mri_total", "mri_slots"], False),
    ("LAB_DEMAND",        ["lab_request", "lab_demand", "lab_test", "lab_utilization", "lab_usage", "laboratory_request"], False),
    ("LAB_CAPACITY",      ["lab_capacity", "lab_available", "lab_total", "laboratory_capacity"], False),
    ("OR_DEMAND",         ["scheduled_procedure", "or_demand", "or_utilization", "procedure_count", "surgery_count", "or_usage"], False),
    ("OR_CAPACITY",       ["or_capacity", "operating_room_capacity", "or_total", "surgery_capacity"], False),
    ("STAFF_COUNT",       ["staff_count", "staff_available", "staff_on_duty", "nurses", "doctors", "personnel"], False),
    ("STAFF_CAPACITY",    ["staff_capacity", "total_staff", "max_staff", "staff_total"], False),
    ("TIMESTAMP",         ["timestamp", "datetime", "date_time", "time", "date", "recorded_at", "hour"], False),
    ("DEPARTMENT",        ["department", "dept", "unit", "ward", "section"], False),
]


def _normalise_col(col: str) -> str:
    """Lowercase, strip, replace spaces/hyphens with underscores."""
    return col.strip().lower().replace(" ", "_").replace("-", "_")


def _classify_columns(df: pd.DataFrame) -> tuple[dict, dict]:
    """
    Returns (mapping, confidence) where:
      mapping[canonical] = actual_column_name
      confidence[canonical] = float 0-1
    """
    cols = {_normalise_col(c): c for c in df.columns}
    mapping: dict = {}
    confidence: dict = {}

    for canonical, patterns, _ in _COLUMN_RULES:
        best_col = None
        best_score = 0.0

        for norm_col, orig_col in cols.items():
            for pattern in patterns:
                # Exact match
                if norm_col == pattern:
                    score = 1.0
                # Contains pattern
                elif pattern in norm_col or norm_col in pattern:
                    score = 0.85
                # Partial overlap (at least 4 chars)
                elif len(pattern) >= 4 and (pattern[:4] in norm_col or norm_col[:4] in pattern[:4]):
                    score = 0.65
                else:
                    continue
                if score > best_score:
                    best_score = score
                    best_col = orig_col

        # Value-pattern heuristics for numeric columns
        if best_col is None:
            for norm_col, orig_col in cols.items():
                try:
                    series = pd.to_numeric(df[orig_col], errors="coerce").dropna()
                    if len(series) == 0:
                        continue
                    mn, mx = series.min(), series.max()
                    # Detect utilization-like columns (0-1 range)
                    if canonical in ("CT_DEMAND", "MRI_DEMAND", "LAB_DEMAND", "OR_DEMAND") and 0 <= mn <= 1 and mx <= 1:
                        best_col = orig_col
                        best_score = 0.5
                except Exception:
                    pass

        if best_col is not None:
            mapping[canonical] = best_col
            confidence[canonical] = round(best_score, 2)

    return mapping, confidence


def _validate_dataset(df: pd.DataFrame, mapping: dict) -> tuple[list, list]:
    """Returns (ok_messages, warning_messages)."""
    ok: list[str] = []
    warnings: list[str] = []

    ok.append(f"{len(df):,} records detected")

    if len(df) == 0:
        warnings.append("Dataset is empty")
        return ok, warnings

    ok.append(f"{len(df.columns)} columns found")

    # Timestamp
    if "TIMESTAMP" in mapping:
        ok.append("Timestamp column detected")
    else:
        warnings.append("No timestamp column detected — time-series forecasting unavailable")

    # Required fields
    if "OCCUPIED_BEDS" in mapping and "BED_CAPACITY" in mapping:
        ok.append("Bed capacity fields detected")
    else:
        warnings.append("Bed capacity columns not found — bed utilization unavailable")

    if "ICU_OCCUPANCY" in mapping and "ICU_CAPACITY" in mapping:
        ok.append("ICU capacity fields detected")
    else:
        warnings.append("ICU capacity columns not found")

    if "CT_DEMAND" in mapping:
        ok.append("CT demand field detected")
    else:
        warnings.append("CT demand column not found")

    if "MRI_DEMAND" in mapping:
        ok.append("MRI demand field detected")
    else:
        warnings.append("MRI demand column not found")

    if "LAB_DEMAND" in mapping:
        ok.append("Laboratory demand field detected")
    else:
        warnings.append("Laboratory demand column not found")

    if "OR_DEMAND" in mapping:
        ok.append("Operating room demand field detected")
    else:
        warnings.append("OR demand column not found")

    # Missing values
    for canonical, col in mapping.items():
        if col in df.columns:
            pct_missing = df[col].isna().mean() * 100
            if pct_missing > 10:
                warnings.append(f"{pct_missing:.0f}% missing values in {col}")
            elif pct_missing > 0:
                warnings.append(f"{pct_missing:.1f}% missing values in {col}")

    # Negative values in numeric columns
    for canonical, col in mapping.items():
        if col in df.columns:
            try:
                series = pd.to_numeric(df[col], errors="coerce").dropna()
                if (series < 0).any():
                    warnings.append(f"Negative values detected in {col}")
            except Exception:
                pass

    # Duplicate rows
    dup_count = df.duplicated().sum()
    if dup_count > 0:
        warnings.append(f"{dup_count} duplicate records detected")

    return ok, warnings


def _safe_float(val, default: float = 0.0) -> float:
    try:
        v = float(val)
        return v if np.isfinite(v) else default
    except Exception:
        return default


def _compute_util(demand_col: Optional[str], capacity_col: Optional[str],
                  df: pd.DataFrame, row: pd.Series, default: float = 50.0) -> float:
    """Compute utilization % from demand/capacity columns in the latest row."""
    if demand_col is None:
        return default
    demand = _safe_float(row.get(demand_col, 0))
    if capacity_col and capacity_col in row.index:
        cap = _safe_float(row.get(capacity_col, 1))
        if cap <= 0:
            cap = 1.0
        # If demand looks like a fraction (0-1), treat as utilization directly
        if demand <= 1.0 and cap == 1.0:
            return min(100.0, demand * 100)
        return min(150.0, demand / cap * 100)
    # If no capacity column, assume demand is already a utilization fraction or %
    if demand <= 1.0:
        return demand * 100
    return min(150.0, demand)


def _risk_label(util: float) -> str:
    if util < 70:
        return "LOW"
    if util < 80:
        return "NORMAL"
    if util < 90:
        return "MODERATE"
    if util < 95:
        return "HIGH"
    return "CRITICAL"


def _build_metrics_from_row(row: pd.Series, mapping: dict) -> dict:
    """Build a metrics dict (same shape as dashboard_service.get_live_metrics) from a single row."""
    get = lambda canonical: mapping.get(canonical)

    bed_util = _compute_util(get("OCCUPIED_BEDS"), get("BED_CAPACITY"), None, row, 70.0)
    icu_util = _compute_util(get("ICU_OCCUPANCY"), get("ICU_CAPACITY"), None, row, 60.0)
    ct_util  = _compute_util(get("CT_DEMAND"),     get("CT_CAPACITY"),  None, row, 65.0)
    mri_util = _compute_util(get("MRI_DEMAND"),    get("MRI_CAPACITY"), None, row, 45.0)
    lab_util = _compute_util(get("LAB_DEMAND"),    get("LAB_CAPACITY"), None, row, 65.0)
    or_util  = _compute_util(get("OR_DEMAND"),     get("OR_CAPACITY"),  None, row, 60.0)

    # Emergency utilization: use EMERGENCY_DEMAND / (BED_CAPACITY * 0.25)
    er_col = get("EMERGENCY_DEMAND")
    bed_cap_col = get("BED_CAPACITY")
    if er_col and bed_cap_col:
        er_demand = _safe_float(row.get(er_col, 0))
        bed_cap   = _safe_float(row.get(bed_cap_col, 200))
        er_cap    = max(1, bed_cap * 0.25)
        er_util   = min(150.0, er_demand / er_cap * 100)
    elif er_col:
        er_util = _compute_util(er_col, None, None, row, 70.0)
    else:
        er_util = bed_util * 1.05  # estimate

    # Weighted hospital score
    weights = {"bed": 0.35, "icu": 0.25, "ct": 0.20, "lab": 0.20}
    available = {}
    if get("OCCUPIED_BEDS") and get("BED_CAPACITY"):
        available["bed"] = bed_util
    if get("ICU_OCCUPANCY") and get("ICU_CAPACITY"):
        available["icu"] = icu_util
    if get("CT_DEMAND"):
        available["ct"] = ct_util
    if get("LAB_DEMAND"):
        available["lab"] = lab_util

    if available:
        total_weight = sum(weights[k] for k in available)
        hospital_score = sum(available[k] * weights[k] for k in available) / total_weight
    else:
        hospital_score = (bed_util + icu_util + ct_util + lab_util) / 4

    hospital_score = max(0, min(100, round(hospital_score)))

    # Time to critical
    gap = max(0, 95.0 - bed_util)
    rate = max(0.5, (bed_util * 0.05))
    hours_to_critical = gap / rate if rate > 0 else 8
    h = int(hours_to_critical)
    m = int((hours_to_critical - h) * 60)
    time_to_critical = f"{h}h {m:02d}m" if hours_to_critical < 8 else ">8h"

    # Raw counts
    def _int_col(canonical, default=0):
        col = get(canonical)
        if col and col in row.index:
            return max(0, int(_safe_float(row[col], default)))
        return default

    total_beds = _int_col("BED_CAPACITY", 200)
    occupied_beds = _int_col("OCCUPIED_BEDS", int(total_beds * bed_util / 100))
    icu_capacity = _int_col("ICU_CAPACITY", 30)
    icu_occupied = _int_col("ICU_OCCUPANCY", int(icu_capacity * icu_util / 100))
    ct_capacity = _int_col("CT_CAPACITY", 100)
    ct_requests = _int_col("CT_DEMAND", int(ct_capacity * ct_util / 100))
    mri_capacity = _int_col("MRI_CAPACITY", 50)
    mri_requests = _int_col("MRI_DEMAND", int(mri_capacity * mri_util / 100))
    lab_capacity = _int_col("LAB_CAPACITY", 300)
    lab_requests = _int_col("LAB_DEMAND", int(lab_capacity * lab_util / 100))
    or_capacity = _int_col("OR_CAPACITY", 10)
    scheduled_procedures = _int_col("OR_DEMAND", int(or_capacity * or_util / 100))
    patient_arrivals = _int_col("PATIENT_ARRIVALS", int(total_beds * 0.15))
    emergency_cases = _int_col("EMERGENCY_DEMAND", int(total_beds * 0.25 * er_util / 100))

    # Timestamp
    ts_col = get("TIMESTAMP")
    if ts_col and ts_col in row.index:
        last_updated = str(row[ts_col])
    else:
        last_updated = "Uploaded dataset"

    return {
        "hospital_score": hospital_score,
        "risk": _risk_label(hospital_score),
        "bed_util":  round(min(100, bed_util),  1),
        "icu_util":  round(min(100, icu_util),  1),
        "ct_util":   round(min(100, ct_util),   1),
        "mri_util":  round(min(100, mri_util),  1),
        "lab_util":  round(min(100, lab_util),  1),
        "or_util":   round(min(100, or_util),   1),
        "er_util":   round(min(100, er_util),   1),
        "peak_prediction":  round(min(100, bed_util * 1.08 + 3), 1),
        "time_to_critical": time_to_critical,
        "last_updated": last_updated,
        "occupied_beds":  occupied_beds,
        "total_beds":     total_beds,
        "icu_occupied":   icu_occupied,
        "icu_capacity":   icu_capacity,
        "ct_requests":    ct_requests,
        "ct_capacity":    ct_capacity,
        "mri_requests":   mri_requests,
        "mri_capacity":   mri_capacity,
        "lab_requests":   lab_requests,
        "lab_capacity":   lab_capacity,
        "scheduled_procedures": scheduled_procedures,
        "or_capacity":    or_capacity,
        "patient_arrivals": patient_arrivals,
        "emergency_cases":  emergency_cases,
        "hour":        0,
        "day_of_week": 0,
        "_source": "uploaded",
    }


# ── Public API ────────────────────────────────────────────────────────────────

def ingest_file(file_bytes: bytes, filename: str) -> dict:
    """
    Parse, validate, classify, and store an uploaded dataset.
    Returns a status dict with validation results and classification.
    Raises ValueError on unrecoverable errors.
    """
    global _current_df, _current_meta, _current_metrics, _classification, _classification_confidence

    # ── Parse ──────────────────────────────────────────────────────────────────
    ext = os.path.splitext(filename)[1].lower()
    try:
        if ext == ".csv":
            df = pd.read_csv(io.BytesIO(file_bytes))
        elif ext in (".xls", ".xlsx"):
            df = pd.read_excel(io.BytesIO(file_bytes))
        else:
            raise ValueError(f"Unsupported file format: {ext}. Use CSV, XLS, or XLSX.")
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Could not read file: {e}") from e

    if len(df) == 0:
        raise ValueError("Uploaded dataset is empty.")

    if len(df.columns) < 2:
        raise ValueError("Dataset must have at least 2 columns.")

    # ── Classify ───────────────────────────────────────────────────────────────
    mapping, conf = _classify_columns(df)

    # ── Validate ───────────────────────────────────────────────────────────────
    ok_msgs, warn_msgs = _validate_dataset(df, mapping)

    # ── Detect time range ──────────────────────────────────────────────────────
    time_range = "Unknown"
    ts_col = mapping.get("TIMESTAMP")
    if ts_col:
        try:
            ts = pd.to_datetime(df[ts_col], errors="coerce").dropna()
            if len(ts) > 0:
                time_range = f"{ts.min().strftime('%b %d')} – {ts.max().strftime('%b %d, %Y')}"
        except Exception:
            pass

    # ── Compute latest-row metrics ─────────────────────────────────────────────
    # Use the last valid row as "current state"
    latest_row = df.dropna(how="all").iloc[-1]
    metrics = _build_metrics_from_row(latest_row, mapping)

    # ── Persist ────────────────────────────────────────────────────────────────
    meta = {
        "filename": filename,
        "upload_time": time.strftime("%Y-%m-%d %H:%M:%S"),
        "record_count": len(df),
        "column_count": len(df.columns),
        "time_range": time_range,
        "classified_fields": {k: v for k, v in mapping.items()},
        "confidence": conf,
        "analysis_status": "analyzed",
        "ok_messages": ok_msgs,
        "warning_messages": warn_msgs,
    }

    with _lock:
        _current_df = df
        _current_meta = meta
        _current_metrics = metrics
        _classification = mapping
        _classification_confidence = conf

    # Save to disk for persistence across restarts
    try:
        df.to_csv(_DATA_PATH, index=False)
        with open(_META_PATH, "w") as f:
            json.dump(meta, f, indent=2)
    except Exception:
        pass  # disk persistence is best-effort

    return {
        "status": "ok",
        "meta": meta,
        "classification": [
            {
                "canonical": canonical,
                "detected_column": col,
                "confidence": conf.get(canonical, 0),
                "confidence_label": "High" if conf.get(canonical, 0) >= 0.85 else "Medium" if conf.get(canonical, 0) >= 0.65 else "Low",
            }
            for canonical, col in mapping.items()
        ],
        "validation": {"ok": ok_msgs, "warnings": warn_msgs},
        "metrics": metrics,
    }


def get_current_dataset_metrics() -> Optional[dict]:
    """Return the latest computed metrics from the uploaded dataset, or None."""
    with _lock:
        if _current_metrics is not None:
            return dict(_current_metrics)
    # Try loading from disk
    _try_load_from_disk()
    with _lock:
        return dict(_current_metrics) if _current_metrics else None


def get_current_dataset_status() -> dict:
    """Return metadata about the currently loaded uploaded dataset."""
    with _lock:
        if _current_meta:
            return dict(_current_meta)
    _try_load_from_disk()
    with _lock:
        if _current_meta:
            return dict(_current_meta)
    return {"analysis_status": "none"}


def get_current_classification() -> list:
    """Return the column classification list for the current dataset."""
    with _lock:
        mapping = dict(_classification)
        conf = dict(_classification_confidence)
    return [
        {
            "canonical": canonical,
            "detected_column": col,
            "confidence": conf.get(canonical, 0),
            "confidence_label": "High" if conf.get(canonical, 0) >= 0.85 else "Medium" if conf.get(canonical, 0) >= 0.65 else "Low",
        }
        for canonical, col in mapping.items()
    ]


def has_uploaded_dataset() -> bool:
    with _lock:
        return _current_df is not None
    

def _try_load_from_disk():
    """Attempt to restore state from disk (called once on first access after restart)."""
    global _current_df, _current_meta, _current_metrics, _classification, _classification_confidence
    with _lock:
        if _current_df is not None:
            return
        try:
            if os.path.exists(_DATA_PATH) and os.path.exists(_META_PATH):
                df = pd.read_csv(_DATA_PATH)
                with open(_META_PATH) as f:
                    meta = json.load(f)
                mapping = meta.get("classified_fields", {})
                conf = meta.get("confidence", {})
                latest_row = df.dropna(how="all").iloc[-1]
                metrics = _build_metrics_from_row(latest_row, mapping)
                _current_df = df
                _current_meta = meta
                _current_metrics = metrics
                _classification = mapping
                _classification_confidence = conf
        except Exception:
            pass
