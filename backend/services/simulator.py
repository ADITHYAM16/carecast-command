"""
Scenario Simulation Service
Applies parameter deltas to baseline utilization and computes projected risk.
"""
import os
import csv

SCENARIOS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "scenarios.csv")

# Anchored to current mock-data baseline
BASELINE = {
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
    with open(SCENARIOS_PATH, newline="") as f:
        for row in csv.DictReader(f):
            PRESETS[row["scenario"]] = {k: float(v) for k, v in row.items() if k != "scenario"}


def _risk_label(score: float) -> str:
    if score >= 95:
        return "CRITICAL"
    if score >= 85:
        return "HIGH"
    if score >= 75:
        return "MODERATE"
    return "LOW"


def run_simulation(params: dict) -> dict:
    _load_presets()

    # Resolve preset overrides
    preset_name = params.get("preset")
    surge = 0.0
    bed_cap_delta = 0.0
    ct_cap_delta = 0.0
    mri_cap_delta = 0.0
    staff_delta = 0.0

    if preset_name and preset_name in PRESETS:
        p = PRESETS[preset_name]
        surge = p.get("patient_surge_pct", 0.0)
        bed_cap_delta = p.get("bed_capacity_pct", 0.0)
        ct_cap_delta = p.get("ct_capacity_pct", 0.0)
        staff_delta = p.get("staff_pct", 0.0)
    else:
        # Accept both old-style (surge) and new frontend style (patient_surge / *_change)
        surge = float(params.get("patient_surge", params.get("surge", 0)))
        bed_cap_delta = float(params.get("bed_capacity_change", 0))
        ct_cap_delta = float(params.get("ct_capacity_change", 0))
        mri_cap_delta = float(params.get("mri_capacity_change", 0))
        staff_delta = float(params.get("staff_change", 0))

    surge_f = surge / 100.0
    staff_f = staff_delta / 100.0

    # Capacity reduction makes utilization go up (negative change = less capacity)
    bed_cap_f = max(-0.9, bed_cap_delta / 100.0)   # e.g. -10 → -0.10
    ct_cap_f = max(-0.9, ct_cap_delta / 100.0)
    mri_cap_f = max(-0.9, mri_cap_delta / 100.0)

    # Compute projected utilization
    emergency = BASELINE["emergency"] * (1 + surge_f * 0.96)
    beds = BASELINE["beds"] * (1 + surge_f * 0.72) / max(0.1, 1 + bed_cap_f)
    ct = BASELINE["ct"] * (1 + surge_f * 0.62) / max(0.1, 1 + ct_cap_f)
    laboratory = BASELINE["laboratory"] * (1 + surge_f * 0.50)
    icu = BASELINE["icu"] * (1 + surge_f * 0.46)
    mri = BASELINE["mri"] / max(0.1, 1 + mri_cap_f)

    # Staff shortage amplifies all utilization
    if staff_f < 0:
        amp = 1 + abs(staff_f) * 0.45
        emergency = emergency * amp
        beds = beds * amp
        ct = ct * amp
        laboratory = laboratory * amp
        icu = icu * amp

    # Clamp
    emergency = min(115.0, round(emergency, 1))
    beds = min(105.0, round(beds, 1))
    ct = min(120.0, round(ct, 1))
    laboratory = min(100.0, round(laboratory, 1))
    icu = min(100.0, round(icu, 1))
    mri = min(100.0, round(mri, 1))

    risk_score = max(emergency, beds, ct, laboratory, icu)

    bottlenecks = []
    if emergency >= 95:
        bottlenecks.append("Emergency Beds")
    if ct >= 95:
        bottlenecks.append("CT Scanner")
    if beds >= 90:
        bottlenecks.append("General Ward")
    if laboratory >= 90:
        bottlenecks.append("Laboratory")
    if icu >= 85:
        bottlenecks.append("ICU")

    return {
        "emergency": emergency,
        "beds": beds,
        "ct": ct,
        "laboratory": laboratory,
        "icu": icu,
        "mri": mri,
        "risk_level": _risk_label(risk_score),
        "risk_score": round(min(risk_score, 100), 1),
        "bottlenecks": bottlenecks,
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
