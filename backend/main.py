"""
CareCast AI — FastAPI Backend
"""
import os
from contextlib import asynccontextmanager
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

from services.forecast import get_current_state, generate_forecast, _risk_label
from services.bottleneck import detect_bottlenecks, get_bottleneck_timeline
from services.propagation import get_network, get_propagation
from services.simulator import run_simulation
from services.recommendations import get_recommendations

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "")
MONGO_DB  = os.getenv("MONGO_DB", "healthcare")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "*")

# ── MongoDB client (shared across requests) ───────────────────────────────────

mongo_client: AsyncIOMotorClient = None  # type: ignore[assignment]

@asynccontextmanager
async def lifespan(app: FastAPI):
    global mongo_client
    if MONGO_URI:
        mongo_client = AsyncIOMotorClient(MONGO_URI)
    yield
    if mongo_client:
        mongo_client.close()

def get_collection():
    if not mongo_client:
        raise HTTPException(status_code=503, detail="Database not configured")
    return mongo_client[MONGO_DB]["emergencies"]


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="CareCast AI", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://localhost:5173", "http://localhost:4173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ───────────────────────────────────────────────────────────────────

class SimulateRequest(BaseModel):
    patient_surge: float = 0
    bed_capacity_change: float = 0
    ct_capacity_change: float = 0
    mri_capacity_change: float = 0
    staff_change: float = 0
    scheduled_procedures_change: float = 0
    preset: Optional[str] = None


class EmergencyReportIn(BaseModel):
    caseId: str
    patientId: str
    incidentType: str
    patientName: str
    patientAge: int = 0
    contactNumber: str = ""
    location: str
    severity: str          # CRITICAL | HIGH | MODERATE
    description: str = ""
    lifecycle: str = "CREATED"
    reportedAt: str


class LifecycleUpdate(BaseModel):
    lifecycle: str


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "CareCast AI"}


# ── GET /api/dashboard ────────────────────────────────────────────────────────

@app.get("/api/dashboard")
def dashboard():
    state = get_current_state()
    forecast_pts = generate_forecast(8)
    bottlenecks = detect_bottlenecks()
    recs = get_recommendations()
    peak = max(pt["forecast"] for pt in forecast_pts)
    return {
        "hospital": {
            "name": "Healthcare Support",
            "capacity_score": 78,
            "current_utilization": state["er_utilization"],
            "predicted_peak": round(peak, 1),
            "time_to_critical": "3h 12m",
            "risk": _risk_label(peak),
            "last_updated": "10 seconds ago",
        },
        "resources": _build_resources(state),
        "departments": _build_departments(state),
        "forecast": forecast_pts,
        "bottlenecks": bottlenecks,
        "recommendations": recs,
    }


# ── GET /api/resources ────────────────────────────────────────────────────────

@app.get("/api/resources")
def resources():
    state = get_current_state()
    forecast_pts = generate_forecast(6)
    peak = max(pt["forecast"] for pt in forecast_pts)
    items = _build_resources(state)
    return {
        "resources": items,
        "underutilized": [r for r in items if r["utilization"] < 55],
        "hospital_peak_forecast": round(peak, 1),
    }


# ── GET /api/forecast ─────────────────────────────────────────────────────────

@app.get("/api/forecast")
def forecast(horizon: int = 8, department: str = None):
    horizon = min(max(horizon, 1), 48)
    pts = generate_forecast(horizon)
    peak = max(pt["forecast"] for pt in pts)
    peak_time = next(pt["time"] for pt in pts if pt["forecast"] == peak)
    return {
        "points": pts,
        "peak_demand": round(peak, 1),
        "peak_time": peak_time,
        "capacity_remaining": round(max(0.0, 100.0 - peak), 1),
        "risk": _risk_label(peak),
        "confidence": 0.87,
        "factors": [
            "Recent patient arrivals (+18% above hourly pattern)",
            "Historical hourly demand pattern",
            "Scheduled procedures (14:00 cardiac block)",
            "Day-of-week adjustment (weekday peak)",
            "Current occupancy baseline",
        ],
    }


# ── GET /api/bottlenecks ──────────────────────────────────────────────────────

@app.get("/api/bottlenecks")
def bottlenecks():
    return {
        "count": len(detect_bottlenecks()),
        "bottlenecks": detect_bottlenecks(),
        "timeline": get_bottleneck_timeline(),
    }


# ── GET /api/dependencies ─────────────────────────────────────────────────────

@app.get("/api/dependencies")
def dependencies(node_id: str = None):
    network = get_network()
    if node_id:
        return {**network, "propagation": get_propagation(node_id)}
    return network


# ── POST /api/simulate ────────────────────────────────────────────────────────

@app.post("/api/simulate")
def simulate(req: SimulateRequest):
    result = run_simulation({
        "surge": req.patient_surge,
        "bed_capacity_change": req.bed_capacity_change,
        "ct_capacity_change": req.ct_capacity_change,
        "mri_capacity_change": req.mri_capacity_change,
        "staff_change": req.staff_change,
        "procedures_change": req.scheduled_procedures_change,
        "preset": req.preset,
    })
    return {
        "risk": result["risk_level"],
        "hospital_score": max(0, round(100 - result["risk_score"] * 0.4)),
        "resources": {
            "beds": result["beds"],
            "emergency": result["emergency"],
            "ct": result["ct"],
            "laboratory": result["laboratory"],
            "icu": result["icu"],
        },
        "bottlenecks": result["bottlenecks"],
        "recommendations": result["recommendations"],
    }


# ── GET /api/recommendations ──────────────────────────────────────────────────

@app.get("/api/recommendations")
def recommendations():
    return {"recommendations": get_recommendations()}


# ── POST /api/emergencies — create ───────────────────────────────────────────

@app.post("/api/emergencies", status_code=201)
async def create_emergency(body: EmergencyReportIn):
    col = get_collection()
    doc = body.model_dump()
    await col.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ── GET /api/emergencies — list ───────────────────────────────────────────────

@app.get("/api/emergencies")
async def list_emergencies(patient_id: str = None):
    col = get_collection()
    filt: dict = {}
    if patient_id:
        filt["patientId"] = patient_id
    cursor = col.find(filt, {"_id": 0}).sort("reportedAt", -1).limit(100)
    return {"emergencies": await cursor.to_list(length=100)}


# ── PATCH /api/emergencies/{case_id}/lifecycle — update ──────────────────────

@app.patch("/api/emergencies/{case_id}/lifecycle")
async def update_lifecycle(case_id: str, body: LifecycleUpdate):
    col = get_collection()
    result = await col.update_one(
        {"caseId": case_id},
        {"$set": {"lifecycle": body.lifecycle}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    return {"caseId": case_id, "lifecycle": body.lifecycle}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_resources(state: dict) -> list:
    return [
        {"name": "Emergency Beds",  "department": "Emergency",    "utilization": state["er_utilization"],  "capacity": "44 / 50 beds",    "trend": "+12%", "risk": _risk_label(state["er_utilization"]),  "sparkline": [62, 66, 70, 69, 76, 82, state["er_utilization"]]},
        {"name": "ICU Beds",        "department": "Critical Care", "utilization": state["icu_utilization"], "capacity": "37 / 50 beds",    "trend": "+8%",  "risk": _risk_label(state["icu_utilization"]), "sparkline": [58, 61, 63, 66, 68, 71, state["icu_utilization"]]},
        {"name": "CT Scanner",      "department": "Radiology",     "utilization": state["ct_utilization"],  "capacity": "91 / 100 scans",  "trend": "+15%", "risk": _risk_label(state["ct_utilization"]),  "sparkline": [69, 73, 76, 81, 83, 88, state["ct_utilization"]]},
        {"name": "MRI",             "department": "Radiology",     "utilization": state["mri_utilization"], "capacity": "17 / 40 scans",   "trend": "-4%",  "risk": _risk_label(state["mri_utilization"]), "sparkline": [47, 45, 48, 46, 44, 43, state["mri_utilization"]]},
        {"name": "Laboratory",      "department": "Diagnostics",   "utilization": state["lab_utilization"], "capacity": "632 / 800 tests", "trend": "+9%",  "risk": _risk_label(state["lab_utilization"]), "sparkline": [60, 65, 68, 69, 73, 76, state["lab_utilization"]]},
        {"name": "Operating Rooms", "department": "Surgery",       "utilization": state["or_utilization"],  "capacity": "10 / 15 rooms",   "trend": "+3%",  "risk": _risk_label(state["or_utilization"]),  "sparkline": [63, 64, 62, 65, 66, 67, state["or_utilization"]]},
    ]


def _build_departments(state: dict) -> list:
    return [
        {"name": "Emergency",      "utilization": state["er_utilization"],  "risk": _risk_label(state["er_utilization"]),  "trend": "+12%"},
        {"name": "General Ward",   "utilization": state["bed_utilization"], "risk": _risk_label(state["bed_utilization"]), "trend": "+7%"},
        {"name": "ICU",            "utilization": state["icu_utilization"], "risk": _risk_label(state["icu_utilization"]), "trend": "+8%"},
        {"name": "Radiology",      "utilization": state["ct_utilization"],  "risk": _risk_label(state["ct_utilization"]),  "trend": "+15%"},
        {"name": "Laboratory",     "utilization": state["lab_utilization"], "risk": _risk_label(state["lab_utilization"]), "trend": "+9%"},
        {"name": "Operating Room", "utilization": state["or_utilization"],  "risk": _risk_label(state["or_utilization"]),  "trend": "+3%"},
        {"name": "Cardiology",     "utilization": 56.0, "risk": "NORMAL",   "trend": "+1%"},
        {"name": "Pediatrics",     "utilization": 39.0, "risk": "LOW",      "trend": "-6%"},
    ]
