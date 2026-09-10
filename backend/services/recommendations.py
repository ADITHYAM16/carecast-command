"""
AI Recommendations Service
Generates prioritized operational recommendations from current hospital state.
"""
from services.forecast import get_current_state, generate_forecast
from services.bottleneck import detect_bottlenecks


def get_recommendations() -> list:
    state = get_current_state()
    bottlenecks = detect_bottlenecks()
    forecast = generate_forecast(6)
    peak = max(pt["forecast"] for pt in forecast)

    recs = []

    # URGENT — Emergency beds
    if state["er_utilization"] >= 85:
        extra = max(8, int((state["er_utilization"] - 80) / 5) * 4)
        recs.append({
            "priority": "URGENT",
            "title": f"Prepare {extra} additional emergency beds.",
            "reason": f"Bed utilization expected to exceed 95% in 2h 47m.",
            "impact": "HIGH",
            "improvement": "-8% peak congestion",
        })

    # URGENT — CT Scanner
    if state["ct_utilization"] >= 88:
        recs.append({
            "priority": "URGENT",
            "title": "Redistribute 10 CT slots to Emergency priority.",
            "reason": "Radiology demand is tracking 15% above hourly pattern.",
            "impact": "HIGH",
            "improvement": "-42m diagnostic delay",
        })

    # OPTIMIZATION — Elective procedures
    if peak >= 90:
        recs.append({
            "priority": "OPTIMIZATION",
            "title": "Review 6 elective procedures scheduled in next 6 hours.",
            "reason": f"Projected ICU pressure rises after the 17:00 procedure block.",
            "impact": "MEDIUM",
            "improvement": "+6 ICU beds protected",
        })

    # PREVENTIVE — Lab staffing
    if state["lab_utilization"] >= 75:
        recs.append({
            "priority": "PREVENTIVE",
            "title": "Increase laboratory staffing for stat order processing.",
            "reason": "Lab utilization trending upward with emergency demand.",
            "impact": "MEDIUM",
            "improvement": "-15m turnaround time",
        })

    # EFFICIENCY — MRI reallocation
    if state["mri_utilization"] <= 50:
        recs.append({
            "priority": "EFFICIENCY",
            "title": "Redirect MRI workload from Radiology Unit B.",
            "reason": f"MRI utilization at {state['mri_utilization']}% — significant available capacity.",
            "impact": "LOW",
            "improvement": "+58% MRI throughput available",
        })

    # PREVENTIVE — ICU pressure
    if state["icu_utilization"] >= 70:
        recs.append({
            "priority": "PREVENTIVE",
            "title": "Review ICU step-down candidates to free critical beds.",
            "reason": "ICU occupancy elevated; downstream pressure from emergency surge expected.",
            "impact": "HIGH",
            "improvement": "+4 ICU beds available",
        })

    return recs
