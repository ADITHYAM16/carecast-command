"""
Data Service
============
- Dataset pointer advances by WALL-CLOCK TIME only (not by API calls).
  Default: 1 real second == 1 simulated minute  →  1 row advances per hour.
- current_row() is idempotent: any number of calls within the same simulated
  hour return the same CSV row.
- Simulation overlay: scenario mode can inject per-field multipliers that are
  blended on top of the live row without touching the pointer.
"""
import os
import time
import threading
import pandas as pd

_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "hospital_hourly_data.csv")

# How many real seconds equal one simulated hour (default: 3600 → real-time).
# Set to a smaller value (e.g. 60) to speed up the simulation clock for demos.
SECONDS_PER_SIM_HOUR: float = float(os.getenv("SIM_SPEED_SECONDS_PER_HOUR", "3600"))

_df: pd.DataFrame | None = None
_lock = threading.Lock()

# Wall-clock time at which the simulation started (set on first call).
_sim_start_wall: float | None = None
# Dataset row index that was "current" when the simulation started.
_sim_start_row: int = 0

# ── Simulation overlay ────────────────────────────────────────────────────────
# When a scenario is active this dict holds multipliers / absolute overrides
# that get_current_row_with_overlay() blends into the raw CSV row.
_sim_overlay: dict = {}
_sim_overlay_lock = threading.Lock()


# ── Internal helpers ──────────────────────────────────────────────────────────

def _load() -> pd.DataFrame:
    global _df
    if _df is None:
        _df = pd.read_csv(_DATA_PATH, parse_dates=["timestamp"])
    return _df


def _current_pointer() -> int:
    """Return the row index that corresponds to the current simulated time."""
    global _sim_start_wall, _sim_start_row
    now = time.monotonic()
    with _lock:
        if _sim_start_wall is None:
            _sim_start_wall = now
        elapsed_real_seconds = now - _sim_start_wall
        elapsed_sim_hours = elapsed_real_seconds / SECONDS_PER_SIM_HOUR
        df = _load()
        pointer = (_sim_start_row + int(elapsed_sim_hours)) % len(df)
        return pointer


# ── Public API ────────────────────────────────────────────────────────────────

def current_row() -> pd.Series:
    """Return the CSV row for the current simulated hour (idempotent)."""
    with _lock:
        df = _load()
        return df.iloc[_current_pointer()]


def get_recent_rows(n: int = 24) -> pd.DataFrame:
    """Return the n rows ending at (and including) the current pointer."""
    with _lock:
        df = _load()
        end = _current_pointer()
        if end >= n:
            return df.iloc[end - n: end].copy()
        tail = df.iloc[end - n:].copy()
        head = df.iloc[:end].copy()
        return pd.concat([tail, head]).reset_index(drop=True)


def get_record_count() -> int:
    try:
        return len(_load())
    except Exception:
        return 0


def is_dataset_available() -> bool:
    try:
        _load()
        return True
    except Exception:
        return False


# ── Simulation overlay helpers ────────────────────────────────────────────────

def set_sim_overlay(overlay: dict) -> None:
    """
    Store a scenario overlay.  Keys match CSV column names; values are
    multipliers (e.g. {"ct_utilization": 1.4} means CT is 40 % higher).
    Pass an empty dict to clear.
    """
    with _sim_overlay_lock:
        _sim_overlay.clear()
        _sim_overlay.update(overlay)


def get_sim_overlay() -> dict:
    with _sim_overlay_lock:
        return dict(_sim_overlay)


def clear_sim_overlay() -> None:
    with _sim_overlay_lock:
        _sim_overlay.clear()


def current_row_with_overlay() -> pd.Series:
    """
    Return the current CSV row with any active simulation overlay applied.
    Numeric columns listed in the overlay are multiplied by their factor.
    """
    row = current_row().copy()
    with _sim_overlay_lock:
        if not _sim_overlay:
            return row
        for col, factor in _sim_overlay.items():
            if col in row.index:
                try:
                    row[col] = float(row[col]) * float(factor)
                except (TypeError, ValueError):
                    pass
    return row
