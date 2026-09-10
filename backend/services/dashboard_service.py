"""
Dashboard Service — calculates live hospital metrics from the current dataset row.
Uses current_row_with_overlay() so:
  - Multiple calls within the same simulated hour return identical values.
  - Active scenario overlays are transparently applied.
"""
from services.data_service import current_row_with_overlay


def _risk_label(utilization: float) -> str:
    if utilization < 70:
        return "LOW"
    if utilization < 80:
        return "NORMAL"
    if utilization < 90:
        return "MODERATE"
    if utilization < 95:
        return "HIGH"
    return "CRITICAL"


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def get_live_metrics() -> dict:
    """
    Return fully-calculated dashboard metrics for the current simulated hour.
    Idempotent: calling this multiple times within the same hour returns the
    same values (unless a simulation overlay changes them).
    """
    row = current_row_with_overlay()

    bed_util = _clamp(float(row["occupied_beds"]) / float(row["total_beds"]) * 100)
    icu_util = _clamp(float(row["icu_occupied"]) / float(row["icu_capacity"]) * 100)
    ct_util  = _clamp(float(row["ct_utilization"]) * 100)
    mri_util = _clamp(float(row["mri_utilization"]) * 100)
    lab_util = _clamp(float(row["lab_utilization"]) * 100)
    or_util  = _clamp(float(row["or_utilization"]) * 100)

    er_capacity = max(1, float(row["total_beds"]) * 0.25)
    er_util = _clamp(float(row["emergency_cases"]) / er_capacity * 100)

    hospital_score = round(
        bed_util * 0.35
        + icu_util * 0.25
        + ct_util  * 0.20
        + lab_util * 0.20
    )
    hospital_score = max(0, min(100, hospital_score))

    hour = int(row["hour"])
    surge_factor = 1.0 + max(0, (hour - 8) * 0.012) if 8 <= hour <= 18 else 1.0
    peak_prediction = _clamp(bed_util * surge_factor + 5.0)

    gap = max(0, 95.0 - bed_util)
    rate_per_hour = max(0.5, (peak_prediction - bed_util) / 3)
    hours_to_critical = gap / rate_per_hour if rate_per_hour > 0 else 8
    h = int(hours_to_critical)
    m = int((hours_to_critical - h) * 60)
    time_to_critical = f"{h}h {m:02d}m" if hours_to_critical < 8 else ">8h"

    return {
        "hospital_score": hospital_score,
        "risk": _risk_label(hospital_score),
        "bed_util":  round(bed_util,  1),
        "icu_util":  round(icu_util,  1),
        "ct_util":   round(ct_util,   1),
        "mri_util":  round(mri_util,  1),
        "lab_util":  round(lab_util,  1),
        "or_util":   round(or_util,   1),
        "er_util":   round(er_util,   1),
        "peak_prediction":  round(peak_prediction, 1),
        "time_to_critical": time_to_critical,
        "last_updated": str(row["timestamp"]),
        "occupied_beds":  int(row["occupied_beds"]),
        "total_beds":     int(row["total_beds"]),
        "icu_occupied":   int(row["icu_occupied"]),
        "icu_capacity":   int(row["icu_capacity"]),
        "ct_requests":    int(row["ct_requests"]),
        "ct_capacity":    int(row["ct_capacity"]),
        "mri_requests":   int(row["mri_requests"]),
        "mri_capacity":   int(row["mri_capacity"]),
        "lab_requests":   int(row["lab_requests"]),
        "lab_capacity":   int(row["lab_capacity"]),
        "scheduled_procedures": int(row["scheduled_procedures"]),
        "or_capacity":    int(row["or_capacity"]),
        "patient_arrivals": int(row["patient_arrivals"]),
        "emergency_cases":  int(row["emergency_cases"]),
        "hour":         int(row["hour"]),
        "day_of_week":  int(row["day_of_week"]),
    }
