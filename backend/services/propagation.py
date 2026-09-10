"""
Dependency Propagation Service
Models how a bottleneck in one node cascades through the hospital network.
"""
import os
import csv

DEPS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "dependencies.csv")

# Node definitions matching the frontend mock-data layout
NODES = [
    {"id": "arrival",   "label": "Patient Arrival",  "x": 8,  "y": 46, "kind": "source"},
    {"id": "emergency", "label": "Emergency",         "x": 27, "y": 20, "kind": "risk"},
    {"id": "beds",      "label": "Emergency Beds",    "x": 49, "y": 20, "kind": "risk"},
    {"id": "ct",        "label": "CT Scanner",        "x": 49, "y": 47, "kind": "risk"},
    {"id": "lab",       "label": "Laboratory",        "x": 49, "y": 74, "kind": "risk"},
    {"id": "diagnosis", "label": "Diagnosis",         "x": 69, "y": 47, "kind": "normal"},
    {"id": "treatment", "label": "Treatment",         "x": 84, "y": 47, "kind": "normal"},
    {"id": "ward",      "label": "General Ward",      "x": 69, "y": 20, "kind": "normal"},
    {"id": "icu",       "label": "ICU",               "x": 84, "y": 20, "kind": "risk"},
    {"id": "discharge", "label": "Discharge",         "x": 94, "y": 20, "kind": "normal"},
]

EDGES = [
    ("arrival",   "emergency", "84%"),
    ("emergency", "beds",      "91%"),
    ("emergency", "ct",        "72%"),
    ("emergency", "lab",       "80%"),
    ("ct",        "diagnosis", "88%"),
    ("lab",       "diagnosis", "76%"),
    ("diagnosis", "treatment", "83%"),
    ("treatment", "ward",      "69%"),
    ("ward",      "icu",       "61%"),
    ("icu",       "discharge", "52%"),
    ("emergency", "ward",      "58%"),
]

# Downstream impact definitions per node
PROPAGATION_MAP = {
    "ct": [
        {"node_id": "diagnosis", "label": "Diagnostic Delay",      "delay_minutes": 38, "risk": "HIGH",     "description": "CT backlog delays all downstream diagnoses"},
        {"node_id": "treatment", "label": "Treatment Delay",        "delay_minutes": 55, "risk": "HIGH",     "description": "Delayed diagnosis pushes treatment start"},
        {"node_id": "ward",      "label": "Longer Bed Occupancy",   "delay_minutes": 70, "risk": "MODERATE", "description": "Patients stay longer awaiting results"},
        {"node_id": "beds",      "label": "Bed Availability Falls", "delay_minutes": 85, "risk": "HIGH",     "description": "Occupied beds reduce ER throughput"},
        {"node_id": "emergency", "label": "Emergency Congestion",   "delay_minutes": 95, "risk": "CRITICAL", "description": "ER backs up as beds fill"},
    ],
    "emergency": [
        {"node_id": "beds",      "label": "Bed Saturation",         "delay_minutes": 15, "risk": "CRITICAL", "description": "Emergency surge fills available beds"},
        {"node_id": "ct",        "label": "CT Queue Spike",         "delay_minutes": 20, "risk": "HIGH",     "description": "More patients need imaging"},
        {"node_id": "lab",       "label": "Lab Overload",           "delay_minutes": 25, "risk": "HIGH",     "description": "Stat orders flood the lab"},
        {"node_id": "icu",       "label": "ICU Pressure",           "delay_minutes": 60, "risk": "HIGH",     "description": "Critical patients need ICU beds"},
    ],
    "beds": [
        {"node_id": "ward",      "label": "Ward Overflow",          "delay_minutes": 30, "risk": "HIGH",     "description": "ER patients diverted to general ward"},
        {"node_id": "icu",       "label": "ICU Backpressure",       "delay_minutes": 50, "risk": "MODERATE", "description": "Ward full, ICU step-downs blocked"},
        {"node_id": "discharge", "label": "Discharge Delays",       "delay_minutes": 90, "risk": "MODERATE", "description": "No beds available for new admissions"},
    ],
    "lab": [
        {"node_id": "diagnosis", "label": "Diagnostic Delay",       "delay_minutes": 45, "risk": "HIGH",     "description": "Lab results delayed, diagnosis stalls"},
        {"node_id": "treatment", "label": "Treatment Delay",        "delay_minutes": 60, "risk": "MODERATE", "description": "Cannot treat without confirmed diagnosis"},
    ],
    "icu": [
        {"node_id": "ward",      "label": "Step-Down Blocked",      "delay_minutes": 20, "risk": "HIGH",     "description": "ICU full, ward patients cannot step down"},
        {"node_id": "discharge", "label": "Discharge Bottleneck",   "delay_minutes": 40, "risk": "MODERATE", "description": "Patients cannot progress to discharge"},
    ],
}


def get_network() -> dict:
    return {"nodes": NODES, "edges": [{"source": s, "target": t, "strength": st} for s, t, st in EDGES]}


def get_propagation(node_id: str) -> dict:
    impacts = PROPAGATION_MAP.get(node_id, [])
    total_delay = max((i["delay_minutes"] for i in impacts), default=0)
    risk_scores = {"CRITICAL": 4, "HIGH": 3, "MODERATE": 2, "LOW": 1}
    max_risk = max((risk_scores.get(i["risk"], 1) for i in impacts), default=1)
    risk_score = min(100, total_delay * 0.8 + max_risk * 10)

    node_label = next((n["label"] for n in NODES if n["id"] == node_id), node_id)

    return {
        "primary": node_label,
        "impacts": impacts,
        "total_delay_minutes": total_delay,
        "risk_score": round(risk_score, 1),
    }
