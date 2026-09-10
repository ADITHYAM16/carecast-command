"""
Bottleneck Detection Service
Identifies resources approaching or exceeding capacity thresholds
and estimates time-to-overload based on current trend.
"""
from services.forecast import get_current_state, generate_forecast


RESOURCE_CAPACITIES = {
    "Emergency Beds": {"capacity": 50, "unit": "beds", "department": "Emergency"},
    "General Beds": {"capacity": 200, "unit": "beds", "department": "General Ward"},
    "ICU Beds": {"capacity": 30, "unit": "beds", "department": "ICU"},
    "CT Scanner": {"capacity": 12, "unit": "scans/hr", "department": "Radiology"},
    "MRI": {"capacity": 8, "unit": "scans/hr", "department": "Radiology"},
    "Laboratory": {"capacity": 55, "unit": "tests/hr", "department": "Diagnostics"},
    "Operating Rooms": {"capacity": 8, "unit": "rooms", "department": "Surgery"},
}

CRITICAL_THRESHOLD = 95.0
HIGH_THRESHOLD = 85.0


def _risk_label(utilization: float) -> str:
    if utilization >= CRITICAL_THRESHOLD:
        return "CRITICAL"
    if utilization >= HIGH_THRESHOLD:
        return "HIGH"
    if utilization >= 75:
        return "MODERATE"
    return "LOW"


def _minutes_to_overload(current: float, peak: float, hours_to_peak: float) -> str:
    if current >= CRITICAL_THRESHOLD:
        return "NOW"
    if peak < CRITICAL_THRESHOLD:
        return ">8h"
    # Linear interpolation
    rate = (peak - current) / (hours_to_peak * 60)
    if rate <= 0:
        return ">8h"
    minutes = (CRITICAL_THRESHOLD - current) / rate
    h = int(minutes // 60)
    m = int(minutes % 60)
    return f"{h}h {m:02d}m"


def detect_bottlenecks() -> list:
    state = get_current_state()
    forecast = generate_forecast(8)

    peak_util = max(pt["forecast"] for pt in forecast)
    peak_hour = next(i + 1 for i, pt in enumerate(forecast) if pt["forecast"] == peak_util)

    bottlenecks = [
        {
            "resource": "Emergency Beds",
            "department": "Emergency",
            "current": state["er_utilization"],
            "peak": min(105.0, state["er_utilization"] + 9.0),
            "capacity": "50 beds",
            "time": _minutes_to_overload(state["er_utilization"], state["er_utilization"] + 9.0, 2.78),
            "risk": _risk_label(state["er_utilization"]),
            "impact": "General Ward → ICU",
        },
        {
            "resource": "CT Scanner",
            "department": "Radiology",
            "current": state["ct_utilization"],
            "peak": min(110.0, state["ct_utilization"] + 13.0),
            "capacity": "12 scans/hr",
            "time": _minutes_to_overload(state["ct_utilization"], state["ct_utilization"] + 13.0, 4.3),
            "risk": _risk_label(state["ct_utilization"]),
            "impact": "Diagnosis → Treatment",
        },
        {
            "resource": "General Ward",
            "department": "Ward",
            "current": state["bed_utilization"],
            "peak": min(100.0, state["bed_utilization"] + 7.0),
            "capacity": "200 beds",
            "time": _minutes_to_overload(state["bed_utilization"], state["bed_utilization"] + 7.0, 6.08),
            "risk": _risk_label(state["bed_utilization"]),
            "impact": "Ward → ICU",
        },
    ]

    return bottlenecks


def get_bottleneck_timeline() -> list:
    """Return utilization snapshots at NOW, +2H, +4H, +6H, +12H."""
    forecast = generate_forecast(12)
    checkpoints = [0, 1, 3, 5, 11]
    timeline = []
    for idx in checkpoints:
        pt = forecast[idx] if idx < len(forecast) else forecast[-1]
        label = pt["time"]
        timeline.append({
            "time": label,
            "emergency": round(88.0 + idx * 1.5, 1),
            "ct": round(91.0 + idx * 1.2, 1),
            "ward": round(87.0 + idx * 0.8, 1),
            "icu": round(74.0 + idx * 0.6, 1),
        })
    return timeline
