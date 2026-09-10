// ── Shared primitives ─────────────────────────────────────────────────────────

export type RiskLevel = "LOW" | "NORMAL" | "MODERATE" | "HIGH" | "CRITICAL";

// ── /api/dashboard ────────────────────────────────────────────────────────────

export interface ApiHospital {
  name: string;
  capacity_score: number;
  current_utilization: number;
  predicted_peak: number;
  time_to_critical: string;
  risk: RiskLevel;
  last_updated: string;
}

export interface ApiResource {
  name: string;
  department: string;
  utilization: number;
  /** Forecast utilization from backend (forecast_usage field) */
  forecast_usage?: number;
  capacity: string;
  trend: string;
  risk: RiskLevel;
  icon?: string;
  sparkline: number[];
}

export interface ApiForecastPoint {
  time: string;
  actual: number | null;
  forecast: number;
  low: number;
  high: number;
}

export interface ApiBottleneck {
  resource: string;
  department: string;
  current: number;
  /** Normalised from backend `predicted` field */
  peak: number;
  capacity: string;
  time: string;
  risk: RiskLevel;
  impact: string;
}

export interface ApiRecommendation {
  priority: string;
  /** `action` is the canonical field from the backend; `title` is the legacy alias */
  action?: string;
  title: string;
  reason: string;
  impact: string;
  improvement: string;
}

export interface ApiDepartment {
  name: string;
  utilization: number;
  risk: RiskLevel;
  trend: string;
}

export interface DashboardResponse {
  hospital: ApiHospital;
  resources: ApiResource[];
  departments: ApiDepartment[];
  forecast: ApiForecastPoint[];
  bottlenecks: ApiBottleneck[];
  recommendations: ApiRecommendation[];
}

// ── /api/forecast ─────────────────────────────────────────────────────────────

export interface ApiForecastFactor {
  label: string;
  impact: string;
  weight: number;
}

export interface ForecastResponse {
  points: ApiForecastPoint[];
  peak_demand: number;
  peak_time: string;
  capacity_remaining: number;
  risk: RiskLevel;
  confidence: number;
  factors: ApiForecastFactor[];
}

// ── /api/bottlenecks ──────────────────────────────────────────────────────────

export interface ApiBottleneckTimelinePoint {
  time: string;
  emergency: number;
  ct: number;
  ward: number;
  icu: number;
}

export interface BottlenecksResponse {
  count: number;
  bottlenecks: ApiBottleneck[];
  timeline: ApiBottleneckTimelinePoint[];
}

// ── /api/resources ────────────────────────────────────────────────────────────

export interface ResourcesResponse {
  resources: ApiResource[];
  underutilized: ApiResource[];
  hospital_peak_forecast: number;
}

// ── /api/dependencies ─────────────────────────────────────────────────────────

export interface ApiNetworkNode {
  id: string;
  label: string;
  x: number;
  y: number;
  kind: string;
  utilization?: number;
  risk?: string;
}

export interface ApiNetworkEdge {
  source: string;
  target: string;
  strength: string;
}

export interface DependenciesResponse {
  nodes: ApiNetworkNode[];
  edges: ApiNetworkEdge[];
  propagation?: PropagationResponse;
}

export interface PropagationImpact {
  node_id: string;
  label: string;
  delay_minutes: number;
  risk: string;
  description: string;
}

export interface PropagationResponse {
  primary: string;
  impacts: PropagationImpact[];
  total_delay_minutes: number;
  risk_score: number;
}

// ── /api/simulate ─────────────────────────────────────────────────────────────

export interface SimulateRequest {
  patient_surge: number;
  bed_capacity_change?: number;
  ct_capacity_change?: number;
  mri_capacity_change?: number;
  staff_change?: number;
  scheduled_procedures_change?: number;
  preset?: string;
}

export interface SimulateResponse {
  risk: RiskLevel;
  hospital_score: number;
  /** Live baseline values (before simulation) from backend */
  before?: {
    beds: number;
    emergency: number;
    ct: number;
    laboratory: number;
    icu: number;
    mri?: number;
  };
  resources: {
    beds: number;
    emergency: number;
    ct: number;
    laboratory: number;
    icu: number;
    mri?: number;
  };
  bottlenecks: string[];
  /** May be ApiRecommendation objects or plain strings from backend */
  recommendations: (ApiRecommendation | string)[];
}

// ── /api/recommendations ──────────────────────────────────────────────────────

export interface RecommendationsResponse {
  recommendations: ApiRecommendation[];
}

// ── /api/procedure-capacity | /api/procedures | /api/scheduling-conflicts ────

export interface ProcedureCapacityResponse {
  capacity_score: number;
  risk: RiskLevel;
  operating_rooms: { total: number; occupied: number; available: number; utilization: number };
  staff: { available: number; required: number; utilization: number };
  icu_support: { available_beds: number; utilization: number };
  forecast: { next_6_hours: number; peak_time: string };
}

export interface ApiProcedure {
  id: string;
  type: string;
  department: string;
  scheduled_time: string;
  duration: string;
  priority: string;
  status: string;
  required_resources: string[];
}

export interface SchedulingConflict {
  type: string;
  severity: string;
  message: string;
}

// ── /api/emergencies ──────────────────────────────────────────────────────────

export interface EmergencyReportIn {
  caseId: string;
  patientId: string;
  incidentType: string;
  patientName: string;
  patientAge?: number;
  contactNumber?: string;
  location: string;
  severity: "CRITICAL" | "HIGH" | "MODERATE";
  description?: string;
  lifecycle?: string;
  reportedAt: string;
}
