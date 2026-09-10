from pydantic import BaseModel
from typing import Optional, List


class ResourceStatus(BaseModel):
    name: str
    department: str
    utilization: float
    capacity: str
    trend: str
    risk: str
    sparkline: List[float]


class ForecastPoint(BaseModel):
    time: str
    actual: Optional[float]
    forecast: float
    low: float
    high: float


class Bottleneck(BaseModel):
    resource: str
    department: str
    current: float
    peak: float
    capacity: str
    time: str
    risk: str
    impact: str


class Recommendation(BaseModel):
    priority: str
    title: str
    reason: str
    impact: str
    improvement: str


class DepartmentStatus(BaseModel):
    name: str
    utilization: float
    risk: str
    trend: str


class HospitalStatus(BaseModel):
    name: str
    capacityScore: float
    currentUtilization: float
    predictedPeak: float
    timeToCritical: str
    lastUpdated: str


class CommandCenterResponse(BaseModel):
    hospital: HospitalStatus
    resources: List[ResourceStatus]
    departments: List[DepartmentStatus]
    forecast: List[ForecastPoint]
    bottlenecks: List[Bottleneck]
    recommendations: List[Recommendation]


class NetworkNode(BaseModel):
    id: str
    label: str
    x: float
    y: float
    kind: str
    utilization: Optional[float] = None
    risk: Optional[str] = None


class NetworkEdge(BaseModel):
    source: str
    target: str
    strength: str


class NetworkResponse(BaseModel):
    nodes: List[NetworkNode]
    edges: List[NetworkEdge]


class PropagationRequest(BaseModel):
    node_id: str


class PropagationImpact(BaseModel):
    node_id: str
    label: str
    delay_minutes: int
    risk: str
    description: str


class PropagationResponse(BaseModel):
    primary: str
    impacts: List[PropagationImpact]
    total_delay_minutes: int
    risk_score: float


class SimulatorInput(BaseModel):
    surge: float = 0
    emergency: float = 72
    beds: float = 76
    ct: float = 68
    mri: float = 45
    staff: float = 88
    procedures: float = 64
    preset: Optional[str] = None


class SimulatorResult(BaseModel):
    beds: float
    emergency: float
    ct: float
    laboratory: float
    icu: float
    risk_level: str
    risk_score: float
    bottlenecks: List[str]
    recommendations: List[str]


class ForecastRequest(BaseModel):
    department: Optional[str] = None
    resource: Optional[str] = None
    horizon_hours: int = 6


class ForecastResponse(BaseModel):
    points: List[ForecastPoint]
    peak_demand: float
    peak_time: str
    capacity_remaining: float
    risk: str
    confidence: float
    factors: List[str]
