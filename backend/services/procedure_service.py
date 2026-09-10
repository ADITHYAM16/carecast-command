"""
Procedure Service — calculates OR capacity, scheduling conflicts, and procedure list
from hospital_hourly_data.csv.
"""
from datetime import datetime
from services.data_service import current_row_with_overlay


def _clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, v))


def _risk_label(util: float) -> str:
    if util < 70:   return "LOW"
    if util < 80:   return "NORMAL"
    if util < 90:   return "MODERATE"
    if util < 95:   return "HIGH"
    return "CRITICAL"


# ---------------------------------------------------------------------------
# Procedure capacity
# ---------------------------------------------------------------------------

def get_procedure_capacity() -> dict:
    row = current_row_with_overlay()

    scheduled   = int(row["scheduled_procedures"])
    or_cap      = int(row["or_capacity"])
    staff       = int(row["staff_count"])
    icu_occ     = int(row["icu_occupied"])
    icu_cap     = int(row["icu_capacity"])
    hour        = int(row["hour"])

    # Core utilizations
    or_util     = _clamp(scheduled / max(1, or_cap) * 100)
    # Staff: assume required = or_cap * 6 (surgeon + anaesthetist + 4 nurses per OR)
    required_staff = max(1, or_cap * 6)
    staff_util  = _clamp(staff / required_staff * 100)
    icu_util    = _clamp(icu_occ / max(1, icu_cap) * 100)

    # Composite capacity score (lower = more pressure)
    capacity_score = round(
        (100 - or_util)   * 0.5
        + (100 - icu_util) * 0.3
        + staff_util       * 0.2
    )
    capacity_score = max(0, min(100, capacity_score))

    # Forecast: peak typically 2-4 h after current hour
    surge = 1.0 + max(0, (hour - 8) * 0.015) if 8 <= hour <= 16 else 1.0
    forecast_6h = round(min(110, or_util * surge + 8), 1)
    peak_hour   = (hour + 3) % 24
    peak_time   = f"{peak_hour:02d}:00"

    occupied_or  = min(scheduled, or_cap)
    available_or = max(0, or_cap - occupied_or)

    return {
        "capacity_score": capacity_score,
        "risk": _risk_label(100 - capacity_score),
        "operating_rooms": {
            "total":       or_cap,
            "occupied":    occupied_or,
            "available":   available_or,
            "utilization": round(or_util, 1),
        },
        "staff": {
            "available": staff,
            "required":  required_staff,
            "utilization": round(staff_util, 1),
        },
        "icu_support": {
            "available_beds": max(0, icu_cap - icu_occ),
            "utilization":    round(icu_util, 1),
        },
        "forecast": {
            "next_6_hours": forecast_6h,
            "peak_time":    peak_time,
        },
    }


# ---------------------------------------------------------------------------
# Procedure list  (generated deterministically from dataset row)
# ---------------------------------------------------------------------------

_PROC_TYPES = [
    ("Cardiac Surgery",      "Cardiology",  "HIGH",   3,  ["Operating Room", "ICU Bed", "Surgeon", "Anaesthetist"]),
    ("Orthopedic Repair",    "Orthopedics", "MEDIUM", 2,  ["Operating Room", "Surgeon", "Anaesthetist"]),
    ("General Surgery",      "Surgery",     "MEDIUM", 2,  ["Operating Room", "Surgeon"]),
    ("Endoscopy",            "Gastro",      "LOW",    1,  ["Procedure Room", "Nurse"]),
    ("Neurosurgery",         "Neurology",   "HIGH",   4,  ["Operating Room", "ICU Bed", "Neurosurgeon"]),
    ("Laparoscopy",          "Surgery",     "MEDIUM", 2,  ["Operating Room", "Surgeon"]),
    ("Vascular Surgery",     "Vascular",    "HIGH",   3,  ["Operating Room", "ICU Bed", "Surgeon"]),
    ("Cataract Surgery",     "Ophthalmology","LOW",   1,  ["Procedure Room", "Surgeon"]),
]

_STATUSES = ["Scheduled", "In Progress", "Prep", "Scheduled", "Scheduled"]


def get_procedures() -> list:
    row = current_row_with_overlay()
    scheduled = int(row["scheduled_procedures"])
    hour      = int(row["hour"])
    count     = max(1, min(scheduled, 8))

    procedures = []
    for i in range(count):
        ptype, dept, priority, dur, resources = _PROC_TYPES[i % len(_PROC_TYPES)]
        start_h = (hour + i) % 24
        status  = _STATUSES[i % len(_STATUSES)]
        procedures.append({
            "id":                 f"PROC-{1000 + i + hour * 10}",
            "type":               ptype,
            "department":         dept,
            "scheduled_time":     f"{start_h:02d}:00",
            "duration":           f"{dur} hour{'s' if dur > 1 else ''}",
            "priority":           priority,
            "status":             status,
            "required_resources": resources,
        })
    return procedures


# ---------------------------------------------------------------------------
# Scheduling conflicts
# ---------------------------------------------------------------------------

def get_scheduling_conflicts() -> list:
    row = current_row_with_overlay()

    scheduled = int(row["scheduled_procedures"])
    or_cap    = int(row["or_capacity"])
    icu_occ   = int(row["icu_occupied"])
    icu_cap   = int(row["icu_capacity"])
    staff     = int(row["staff_count"])
    required_staff = max(1, or_cap * 6)

    conflicts = []

    # 1. OR overload
    if scheduled > or_cap:
        over_pct = round((scheduled - or_cap) / max(1, or_cap) * 100)
        conflicts.append({
            "type":     "OR_OVERLOAD",
            "severity": "HIGH",
            "message":  f"Operating rooms may exceed capacity — {over_pct}% over limit. "
                        "Consider rescheduling low-priority procedures.",
        })

    # 2. ICU pressure
    icu_util = icu_occ / max(1, icu_cap) * 100
    if icu_util > 90:
        conflicts.append({
            "type":     "ICU_PRESSURE",
            "severity": "CRITICAL",
            "message":  f"Post-operative ICU capacity risk detected ({round(icu_util, 1)}% occupied). "
                        "Reserve ICU beds before high-risk surgeries.",
        })

    # 3. Staff shortage
    if staff < required_staff:
        deficit = required_staff - staff
        conflicts.append({
            "type":     "STAFF_SHORTAGE",
            "severity": "WARNING",
            "message":  f"Additional surgical staff recommended — {deficit} staff below required level. "
                        "Increase surgical team allocation.",
        })

    return conflicts
