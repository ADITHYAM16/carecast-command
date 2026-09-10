"""
Scenario Simulation Service
Applies parameter deltas to live baseline utilization and computes projected risk.
"""
import os
import csv

SCENARIOS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "scenarios.csv")

# Static fallback baseline (used only when live metrics unavailable)
_STATIC_BASELINE = {
    "emergency": 88.0,
    "beds": 87.0,
    "ct": 91.0,
    "laboratory": 79.0,
    "icu": 74.0,
    "mri": 42.0,
}

PRESETS: dict = {}


def _load_presets() -> None:
    if PRESETS:
        return
    try:
        with open(SCENARIOS_PATH, newline="") as f:
            for row in csv.DictReader(f):
                PRESETS[row["scenario"]] = {k: float(v) for k, v in row.items() if k != "scenario"}
    except Exception:
        pass


def _risk_label(score: float) -> str:
    if score >= 95:
        return "CRITICAL"
    if score >= 85:
        return "HIGH"
    if score >= 75:
        return "MODERATE"
    return "LOW"


def _get_live_baseline() -> dict:
    """Fetch live metrics from the current dataset row (idempotent)."""
    try:
        from services.dashboard_service import get_live_metrics
        m = get_live_metrics()  # now calls current_row_with_overlay() — no pointer advance
        return {
            "emergency":  m["er_util"],
            "beds":       m["bed_util"],
            "ct":         m["ct_util"],
            "laboratory": m["lab_util"],
            "icu":        m["icu_util"],
            "mri":        m["mri_util"],
        }
    except Exception:
        return dict(_STATIC_BASELINE)


def run_simulation(params: dict) -> dict:
    _load_presets()

    # Use live data as the simulation baseline
    baseline = _get_live_baseline()

    preset_name = params.get("preset")
    surge = 0.0
    bed_cap_delta = 0.0
    ct_cap_delta = 0.0
    mri_cap_delta = 0.0
    staff_delta = 0.0

    if preset_name and preset_name in PRESETS:
        p = PRESETS[preset_name]
        surge         = p.get("patient_surge_pct", 0.0)
        bed_cap_delta = p.get("bed_capacity_pct", 0.0)
        ct_cap_delta  = p.get("ct_capacity_pct", 0.0)
        staff_delta   = p.get("staff_pct", 0.0)
    else:
        surge         = float(params.get("patient_surge", params.get("surge", 0)))
        bed_cap_delta = float(params.get("bed_capacity_change", 0))
        ct_cap_delta  = float(params.get("ct_capacity_change", 0))
        mri_cap_delta = float(params.get("mri_capacity_change", 0))
        staff_delta   = float(params.get("staff_change", 0))

    surge_f    = surge / 100.0
    staff_f    = staff_delta / 100.0
    bed_cap_f  = max(-0.9, bed_cap_delta / 100.0)
    ct_cap_f   = max(-0.9, ct_cap_delta / 100.0)
    mri_cap_f  = max(-0.9, mri_cap_delta / 100.0)

    # Project utilization from live baseline
    emergency  = baseline["emergency"] * (1 + surge_f * 0.96)
    beds       = baseline["beds"]      * (1 + surge_f * 0.72) / max(0.1, 1 + bed_cap_f)
    ct         = baseline["ct"]        * (1 + surge_f * 0.62) / max(0.1, 1 + ct_cap_f)
    laboratory = baseline["laboratory"] * (1 + surge_f * 0.50)
    icu        = baseline["icu"]       * (1 + surge_f * 0.46)
    mri        = baseline["mri"]       / max(0.1, 1 + mri_cap_f)

    # Staff shortage amplifies all utilization
    if staff_f < 0:
        amp = 1 + abs(staff_f) * 0.45
        emergency  *= amp
        beds       *= amp
        ct         *= amp
        laboratory *= amp
        icu        *= amp

    emergency  = min(115.0, round(emergency,  1))
    beds       = min(105.0, round(beds,       1))
    ct         = min(120.0, round(ct,         1))
    laboratory = min(100.0, round(laboratory, 1))
    icu        = min(100.0, round(icu,        1))
    mri        = min(100.0, round(mri,        1))

    risk_score = max(emergency, beds, ct, laboratory, icu)

    detected_bottlenecks = []
    if emergency >= 95:
        detected_bottlenecks.append("Emergency Beds")
    if ct >= 95:
        detected_bottlenecks.append("CT Scanner")
    if beds >= 90:
        detected_bottlenecks.append("General Ward")
    if laboratory >= 90:
        detected_bottlenecks.append("Laboratory")
    if icu >= 85:
        detected_bottlenecks.append("ICU")

    return {
        "emergency":  emergency,
        "beds":       beds,
        "ct":         ct,
        "laboratory": laboratory,
        "icu":        icu,
        "mri":        mri,
        "baseline":   baseline,          # expose so frontend can show before/after
        "risk_level": _risk_label(risk_score),
        "risk_score": round(min(risk_score, 100), 1),
        "bottlenecks": detected_bottlenecks,
        "recommendations": _recommendations(emergency, beds, ct, laboratory, icu, surge),
    }


def _recommendations(er: float, beds: float, ct: float, lab: float, icu: float, surge: float) -> list:
    recs = []
    if er >= 95:
        recs.append(f"Activate {max(10, int((er - 88) / 2))} additional emergency beds immediately.")
    if ct >= 95:
        recs.append(f"Redistribute {max(8, int((ct - 88) / 2))} CT slots to emergency priority queue.")
    if beds >= 90:
        recs.append("Expedite discharge of stable general ward patients.")
    if lab >= 88:
        recs.append("Increase laboratory staffing for stat order processing.")
    if icu >= 82:
        recs.append("Review ICU step-down candidates to free critical beds.")
    if surge >= 30:
        recs.append("Review elective procedures scheduled in next 6 hours.")
    if not recs:
        recs.append("Current capacity is within safe operational parameters.")
    return recs


def get_presets() -> list:
    _load_presets()
    return list(PRESETS.keys())
