"""
CareCast AI — FastAPI Backend
"""
import io
import os
import logging
from contextlib import asynccontextmanager
from typing import Optional

# Suppress the noisy CancelledError traceback printed on Ctrl+C shutdown
logging.getLogger("uvicorn.error").addFilter(
    type("_ShutdownFilter", (logging.Filter,), {
        "filter": lambda self, r: "CancelledError" not in r.getMessage()
    })()
)

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

from services.forecast import generate_forecast, _risk_label, get_forecast_factors
from services.bottleneck import detect_bottlenecks, get_bottleneck_timeline
from services.propagation import get_network, get_propagation
from services.simulator import run_simulation
from services.recommendations import get_recommendations
from services.dashboard_service import get_live_metrics
from services.data_service import (
    get_record_count, is_dataset_available,
    set_sim_overlay, get_sim_overlay, clear_sim_overlay,
)
from services.procedure_service import get_procedure_capacity, get_procedures, get_scheduling_conflicts
from services.data_ingestion_service import (
    ingest_file,
    get_current_dataset_status,
    get_current_classification,
    get_current_dataset_metrics,
    has_uploaded_dataset,
)
from services.analytics_service import get_metrics as _get_metrics

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
        mongo_client = AsyncIOMotorClient(
            MONGO_URI,
            tlsAllowInvalidCertificates=True,
            serverSelectionTimeoutMS=5000,
        )
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
    allow_origins=["*"],
    allow_credentials=False,
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


class SimModeRequest(BaseModel):
    """
    Activate a persistent simulation overlay on the live data stream.
    Each field is a multiplier applied to the matching CSV column.
    E.g. ct_utilization=1.5 means CT runs at 150 % of its current value.
    Preset names (patient_surge, ct_failure, mass_casualty, staff_shortage,
    flu_outbreak) are expanded automatically if `preset` is supplied.
    """
    preset: Optional[str] = None          # named preset shortcut
    patient_arrivals: float = 1.0
    emergency_cases: float = 1.0
    occupied_beds: float = 1.0
    icu_occupied: float = 1.0
    ct_utilization: float = 1.0
    mri_utilization: float = 1.0
    lab_utilization: float = 1.0
    or_utilization: float = 1.0


# Named preset multiplier tables
_SIM_PRESETS: dict[str, dict] = {
    "normal_day":       {},  # no overlay
    "patient_surge":    {"patient_arrivals": 1.30, "emergency_cases": 1.30, "occupied_beds": 1.18},
    "flu_outbreak":     {"patient_arrivals": 1.45, "emergency_cases": 1.50, "lab_utilization": 1.35},
    "ct_failure":       {"ct_utilization": 0.0},
    "staff_shortage":   {"occupied_beds": 1.20, "icu_occupied": 1.15, "or_utilization": 0.60},
    "mass_casualty":    {"patient_arrivals": 1.80, "emergency_cases": 2.00, "occupied_beds": 1.40,
                         "icu_occupied": 1.50, "ct_utilization": 1.60, "lab_utilization": 1.70},
}


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


# ── Simulation Mode endpoints ────────────────────────────────────────────────

@app.get("/api/simulation/state")
def sim_state():
    """Return the currently active simulation overlay (empty dict = live mode)."""
    overlay = get_sim_overlay()
    return {
        "active": bool(overlay),
        "overlay": overlay,
        "available_presets": list(_SIM_PRESETS.keys()),
    }


@app.post("/api/simulation/activate")
def sim_activate(req: SimModeRequest):
    """
    Activate a simulation overlay on the live data stream.
    The Command Center will immediately reflect the scenario values on the
    next refresh without advancing the dataset pointer.
    """
    if req.preset and req.preset in _SIM_PRESETS:
        overlay = dict(_SIM_PRESETS[req.preset])
    else:
        overlay = {}
        fields = {
            "patient_arrivals": req.patient_arrivals,
            "emergency_cases":  req.emergency_cases,
            "occupied_beds":    req.occupied_beds,
            "icu_occupied":     req.icu_occupied,
            "ct_utilization":   req.ct_utilization,
            "mri_utilization":  req.mri_utilization,
            "lab_utilization":  req.lab_utilization,
            "or_utilization":   req.or_utilization,
        }
        # Only include fields that differ from the neutral multiplier (1.0)
        overlay = {k: v for k, v in fields.items() if v != 1.0}

    set_sim_overlay(overlay)
    return {
        "status": "activated",
        "preset": req.preset,
        "overlay": overlay,
    }


@app.delete("/api/simulation/reset")
def sim_reset():
    """Clear the simulation overlay and return to stable live monitoring."""
    clear_sim_overlay()
    return {"status": "reset", "active": False}


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "online", "service": "CareCast AI Backend"}


# ── Data upload / ingestion endpoints ─────────────────────────────────────────

@app.post("/api/data/upload")
async def data_upload(file: UploadFile = File(...)):
    """
    Upload a hospital operational dataset (CSV / XLS / XLSX).
    Automatically classifies columns, validates data, and computes metrics.
    """
    allowed = {".csv", ".xls", ".xlsx"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext}'. Use CSV, XLS, or XLSX.")

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        result = ingest_file(contents, file.filename or "upload")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {e}")

    return result


@app.post("/api/data/analyze")
def data_analyze():
    """
    Re-run analysis on the currently stored uploaded dataset.
    Returns the same shape as /api/data/upload.
    """
    status = get_current_dataset_status()
    if status.get("analysis_status") == "none":
        raise HTTPException(status_code=404, detail="No uploaded dataset found. Upload a file first.")
    metrics = get_current_dataset_metrics()
    classification = get_current_classification()
    return {
        "status": "ok",
        "meta": status,
        "classification": classification,
        "metrics": metrics,
    }


@app.get("/api/data/status")
def data_status():
    """Return metadata about the currently uploaded dataset."""
    status = get_current_dataset_status()
    classification = get_current_classification() if has_uploaded_dataset() else []
    return {
        "has_dataset": has_uploaded_dataset(),
        "meta": status,
        "classification": classification,
    }


# ── GET /api/dashboard ────────────────────────────────────────────────────────

@app.get("/api/dashboard")
def dashboard(mode: str = Query("past", regex="^(past|current)$")):
    try:
        m = _get_metrics(mode)  # type: ignore[arg-type]
    except Exception:
        return {"status": "error", "message": "Hospital dataset unavailable"}

    forecast_pts = generate_forecast(8)
    bottlenecks  = detect_bottlenecks()
    recs         = get_recommendations()
    peak         = max(pt["forecast"] for pt in forecast_pts)

    return {
        "hospital": {
            "name": "Healthcare Support",
            "capacity_score":      m["hospital_score"],
            "current_utilization": m["bed_util"],
            "predicted_peak":      round(peak, 1),
            "time_to_critical":    m["time_to_critical"],
            "risk":                m["risk"],
            "last_updated":        m["last_updated"],
        },
        "resources": _build_resources(m),
        "departments": _build_departments(m),
        "forecast":      forecast_pts,
        "bottlenecks":   bottlenecks,
        "recommendations": recs,
        "data_source": "uploaded" if mode == "current" and m.get("_source") == "uploaded" else "historical",
    }


# ── GET /api/resources ────────────────────────────────────────────────────────

@app.get("/api/resources")
def resources(mode: str = Query("past", regex="^(past|current)$")):
    try:
        m = _get_metrics(mode)  # type: ignore[arg-type]
    except Exception:
        return {"status": "error", "message": "Hospital dataset unavailable"}
    forecast_pts = generate_forecast(6)
    peak = max(pt["forecast"] for pt in forecast_pts)
    items = _build_resources(m)
    return {
        "resources": items,
        "underutilized": [r for r in items if r["utilization"] < 55],
        "hospital_peak_forecast": round(peak, 1),
    }


# ── GET /api/forecast ─────────────────────────────────────────────────────────

@app.get("/api/forecast")
def forecast(horizon: int = 8, department: str = None):
    horizon = min(max(horizon, 1), 48)
    pts  = generate_forecast(horizon)
    peak = max(pt["forecast"] for pt in pts)
    peak_time = next(pt["time"] for pt in pts if pt["forecast"] == peak)

    try:
        from services.dashboard_service import get_live_metrics
        m = get_live_metrics()
        factors = get_forecast_factors(m)
        confidence = round(0.87 + min(0.10, m["bed_util"] / 1000), 2)
    except Exception:
        factors = [
            {"label": "Recent patient arrivals",    "impact": "High impact",   "weight": 88},
            {"label": "Historical hourly pattern",  "impact": "Medium impact", "weight": 64},
            {"label": "Scheduled procedures",       "impact": "Medium impact", "weight": 58},
            {"label": "Current occupancy baseline", "impact": "High impact",   "weight": 82},
            {"label": "Diagnostic demand (CT/Lab)", "impact": "Low impact",    "weight": 34},
        ]
        confidence = 0.87

    return {
        "points":             pts,
        "peak_demand":        round(peak, 1),
        "peak_time":          peak_time,
        "capacity_remaining": round(max(0.0, 100.0 - peak), 1),
        "risk":               _risk_label(peak),
        "confidence":         confidence,
        "factors":            factors,
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
        "patient_surge":          req.patient_surge,
        "bed_capacity_change":    req.bed_capacity_change,
        "ct_capacity_change":     req.ct_capacity_change,
        "mri_capacity_change":    req.mri_capacity_change,
        "staff_change":           req.staff_change,
        "procedures_change":      req.scheduled_procedures_change,
        "preset":                 req.preset,
    })
    baseline = result.get("baseline", {})
    return {
        "risk":           result["risk_level"],
        "hospital_score": max(0, round(100 - result["risk_score"] * 0.4)),
        "before": {
            "beds":       round(baseline.get("beds",       87.0), 1),
            "emergency":  round(baseline.get("emergency",  88.0), 1),
            "ct":         round(baseline.get("ct",         91.0), 1),
            "laboratory": round(baseline.get("laboratory", 79.0), 1),
            "icu":        round(baseline.get("icu",        74.0), 1),
            "mri":        round(baseline.get("mri",        42.0), 1),
        },
        "resources": {
            "beds":       result["beds"],
            "emergency":  result["emergency"],
            "ct":         result["ct"],
            "laboratory": result["laboratory"],
            "icu":        result["icu"],
            "mri":        result["mri"],
        },
        "bottlenecks":     result["bottlenecks"],
        "recommendations": result["recommendations"],
    }


# ── GET /api/recommendations ──────────────────────────────────────────────────

@app.get("/api/recommendations")
def recommendations():
    return {"recommendations": get_recommendations()}


# ── GET /api/procedure-capacity ───────────────────────────────────────────────

@app.get("/api/procedure-capacity")
def procedure_capacity():
    try:
        return get_procedure_capacity()
    except Exception as exc:
        return {"status": "error", "message": str(exc)}


# ── GET /api/procedures ───────────────────────────────────────────────────────

# In-memory store for procedures created via POST (resets on server restart)
_created_procedures: list = []


class ProcedureIn(BaseModel):
    type: str
    department: str
    scheduled_time: str
    duration: str
    priority: str
    required_resources: list[str] = []


@app.get("/api/procedures")
def procedures():
    try:
        base = get_procedures()
        return base + _created_procedures
    except Exception as exc:
        return _created_procedures or {"status": "error", "message": str(exc)}


# ── POST /api/procedures ──────────────────────────────────────────────────────

@app.post("/api/procedures", status_code=201)
def create_procedure(body: ProcedureIn):
    """Schedule a new procedure and re-evaluate conflicts."""
    import uuid
    from services.procedure_service import get_scheduling_conflicts as _get_conflicts

    proc = {
        "id": f"PROC-{uuid.uuid4().hex[:8].upper()}",
        "type": body.type,
        "department": body.department,
        "scheduled_time": body.scheduled_time,
        "duration": body.duration,
        "priority": body.priority,
        "status": "SCHEDULED",
        "required_resources": body.required_resources,
    }

    # Simple conflict check: flag as CAPACITY CONFLICT if high-priority + ICU/OR resources
    high_risk_resources = {"ICU", "OR", "Operating Room", "ICU Bed"}
    if body.priority in ("URGENT", "EMERGENCY") and high_risk_resources.intersection(set(body.required_resources)):
        try:
            conflicts = _get_conflicts()
            if any(c["severity"] in ("HIGH", "CRITICAL") for c in conflicts):
                proc["status"] = "CAPACITY CONFLICT"
        except Exception:
            pass

    _created_procedures.append(proc)
    return proc


# ── GET /api/scheduling-conflicts ────────────────────────────────────────────

@app.get("/api/scheduling-conflicts")
def scheduling_conflicts():
    try:
        base_conflicts = get_scheduling_conflicts()
        # Surface conflicts for newly created high-priority procedures
        high_risk = {"ICU", "OR", "Operating Room", "ICU Bed"}
        for proc in _created_procedures:
            if proc["priority"] in ("URGENT", "EMERGENCY") and high_risk.intersection(set(proc["required_resources"])):
                base_conflicts.append({
                    "type": "CAPACITY",
                    "severity": "HIGH",
                    "message": (
                        f"{proc['scheduled_time']} {proc['type']} in {proc['department']} "
                        "may create downstream ICU/OR capacity pressure."
                    ),
                })
        return base_conflicts
    except Exception as exc:
        return {"status": "error", "message": str(exc)}


# ── POST /api/emergencies — create ───────────────────────────────────────────

@app.post("/api/emergencies", status_code=201)
async def create_emergency(body: EmergencyReportIn):
    try:
        col = get_collection()
        doc = body.model_dump()
        await col.insert_one(doc)
        doc.pop("_id", None)
        return doc
    except (HTTPException, Exception):
        return body.model_dump()


# ── GET /api/emergencies — list ───────────────────────────────────────────────

@app.get("/api/emergencies")
async def list_emergencies(patient_id: str = None):
    try:
        col = get_collection()
        filt: dict = {}
        if patient_id:
            filt["patientId"] = patient_id
        cursor = col.find(filt, {"_id": 0}).sort("reportedAt", -1).limit(100)
        return {"emergencies": await cursor.to_list(length=100)}
    except Exception:
        return {"emergencies": []}


# ── PATCH /api/emergencies/{case_id}/lifecycle — update ──────────────────────

@app.patch("/api/emergencies/{case_id}/lifecycle")
async def update_lifecycle(case_id: str, body: LifecycleUpdate):
    try:
        col = get_collection()
        result = await col.update_one(
            {"caseId": case_id},
            {"$set": {"lifecycle": body.lifecycle}},
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Case not found")
        return {"caseId": case_id, "lifecycle": body.lifecycle}
    except HTTPException:
        raise
    except Exception:
        return {"caseId": case_id, "lifecycle": body.lifecycle}


# ── POST /api/emergency — alias for single emergency report ─────────────────

@app.post("/api/emergency", status_code=201)
async def create_emergency_alias(body: EmergencyReportIn):
    """Alias for /api/emergencies — accepts singular route used by frontend."""
    try:
        col = get_collection()
        doc = body.model_dump()
        await col.insert_one(doc)
        doc.pop("_id", None)
        return doc
    except Exception:
        return body.model_dump()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_resources(m: dict) -> list:
    return [
        {"name": "Emergency Beds",  "department": "Emergency",    "utilization": m["er_util"],  "capacity": f"{m['emergency_cases']} / {int(m['total_beds']*0.25)} beds",    "trend": "+12%", "risk": _risk_label(m["er_util"]),  "sparkline": [62, 66, 70, 69, 76, 82, m["er_util"]]},
        {"name": "ICU Beds",        "department": "Critical Care", "utilization": m["icu_util"], "capacity": f"{m['icu_occupied']} / {m['icu_capacity']} beds",    "trend": "+8%",  "risk": _risk_label(m["icu_util"]), "sparkline": [58, 61, 63, 66, 68, 71, m["icu_util"]]},
        {"name": "CT Scanner",      "department": "Radiology",     "utilization": m["ct_util"],  "capacity": f"{m['ct_requests']} / {m['ct_capacity']} scans",  "trend": "+15%", "risk": _risk_label(m["ct_util"]),  "sparkline": [69, 73, 76, 81, 83, 88, m["ct_util"]]},
        {"name": "MRI",             "department": "Radiology",     "utilization": m["mri_util"], "capacity": f"{m['mri_requests']} / {m['mri_capacity']} scans",   "trend": "-4%",  "risk": _risk_label(m["mri_util"]), "sparkline": [47, 45, 48, 46, 44, 43, m["mri_util"]]},
        {"name": "Laboratory",      "department": "Diagnostics",   "utilization": m["lab_util"], "capacity": f"{m['lab_requests']} / {m['lab_capacity']} tests", "trend": "+9%",  "risk": _risk_label(m["lab_util"]), "sparkline": [60, 65, 68, 69, 73, 76, m["lab_util"]]},
        {"name": "Operating Rooms", "department": "Surgery",       "utilization": m["or_util"],  "capacity": f"{m['scheduled_procedures']} / {m['or_capacity']} rooms",   "trend": "+3%",  "risk": _risk_label(m["or_util"]),  "sparkline": [63, 64, 62, 65, 66, 67, m["or_util"]]},
    ]


def _build_departments(m: dict) -> list:
    return [
        {"name": "Emergency",      "utilization": m["er_util"],  "risk": _risk_label(m["er_util"]),  "trend": "+12%"},
        {"name": "General Ward",   "utilization": m["bed_util"], "risk": _risk_label(m["bed_util"]), "trend": "+7%"},
        {"name": "ICU",            "utilization": m["icu_util"], "risk": _risk_label(m["icu_util"]), "trend": "+8%"},
        {"name": "Radiology",      "utilization": m["ct_util"],  "risk": _risk_label(m["ct_util"]),  "trend": "+15%"},
        {"name": "Laboratory",     "utilization": m["lab_util"], "risk": _risk_label(m["lab_util"]), "trend": "+9%"},
        {"name": "Operating Room", "utilization": m["or_util"],  "risk": _risk_label(m["or_util"]),  "trend": "+3%"},
        {"name": "Cardiology",     "utilization": 56.0, "risk": "NORMAL",   "trend": "+1%"},
        {"name": "Pediatrics",     "utilization": 39.0, "risk": "LOW",      "trend": "-6%"},
    ]
