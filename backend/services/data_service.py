"""
Data Service
============
- Dataset pointer advances by WALL-CLOCK TIME only (not by API calls).
- current_row() is idempotent within the same simulated hour.
- Simulation overlay: scenario mode injects per-field multipliers.
"""
import os
import time
import pandas as pd

_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "hospital_hourly_data.csv")

SECONDS_PER_SIM_HOUR: float = float(os.getenv("SIM_SPEED_SECONDS_PER_HOUR", "3600"))

# Load CSV once at import — no locks needed (read-only after this point)
try:
    _df: pd.DataFrame = pd.read_csv(_DATA_PATH)
except Exception as e:
    raise RuntimeError(f"Cannot load hospital dataset: {e}") from e

_sim_start_wall: float = time.monotonic()
_sim_start_row: int = 0

# Simulation overlay — plain dict, written infrequently
_sim_overlay: dict = {}


# ── Internal helpers ──────────────────────────────────────────────────────────

def _current_pointer() -> int:
    elapsed_sim_hours = (time.monotonic() - _sim_start_wall) / SECONDS_PER_SIM_HOUR
    return (_sim_start_row + int(elapsed_sim_hours)) % len(_df)


# ── Public API ────────────────────────────────────────────────────────────────

def current_row() -> pd.Series:
    return _df.iloc[_current_pointer()]


def get_recent_rows(n: int = 24) -> pd.DataFrame:
    end = _current_pointer()
    if end >= n:
        return _df.iloc[end - n: end].copy()
    return pd.concat([_df.iloc[end - n:], _df.iloc[:end]]).reset_index(drop=True)


def get_record_count() -> int:
    return len(_df)


def is_dataset_available() -> bool:
    return len(_df) > 0


# ── Simulation overlay helpers ────────────────────────────────────────────────

def set_sim_overlay(overlay: dict) -> None:
    global _sim_overlay
    _sim_overlay = dict(overlay)


def get_sim_overlay() -> dict:
    return dict(_sim_overlay)


def clear_sim_overlay() -> None:
    global _sim_overlay
    _sim_overlay = {}


def current_row_with_overlay() -> pd.Series:
    row = current_row().copy()
    if not _sim_overlay:
        return row
    for col, factor in _sim_overlay.items():
        if col in row.index:
            try:
                row[col] = float(row[col]) * float(factor)
            except (TypeError, ValueError):
                pass
    return row
