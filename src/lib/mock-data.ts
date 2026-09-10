export type RiskLevel = "LOW" | "NORMAL" | "MODERATE" | "HIGH" | "CRITICAL";

export type Resource = {
  name: string;
  department: string;
  utilization: number;
  capacity: string;
  trend: string;
  risk: RiskLevel;
  icon: string;
  sparkline: number[];
};

export type ForecastPoint = {
  time: string;
  actual: number | null;
  forecast: number;
  low: number;
  high: number;
};

export const hospital = {
  name: "Healthcare Support",
  capacityScore: 78,
  currentUtilization: 78,
  predictedPeak: 94,
  timeToCritical: "3h 12m",
  lastUpdated: "10 seconds ago",
};

export const resources: Resource[] = [
  { name: "Emergency Beds", department: "Emergency", utilization: 88, capacity: "44 / 50 beds", trend: "+12%", risk: "CRITICAL", icon: "bed", sparkline: [62, 66, 70, 69, 76, 82, 88] },
  { name: "ICU Beds", department: "Critical Care", utilization: 74, capacity: "37 / 50 beds", trend: "+8%", risk: "HIGH", icon: "icu", sparkline: [58, 61, 63, 66, 68, 71, 74] },
  { name: "CT Scanner", department: "Radiology", utilization: 91, capacity: "91 / 100 scans", trend: "+15%", risk: "CRITICAL", icon: "ct", sparkline: [69, 73, 76, 81, 83, 88, 91] },
  { name: "MRI", department: "Radiology", utilization: 42, capacity: "17 / 40 scans", trend: "-4%", risk: "LOW", icon: "mri", sparkline: [47, 45, 48, 46, 44, 43, 42] },
  { name: "Laboratory", department: "Diagnostics", utilization: 79, capacity: "632 / 800 tests", trend: "+9%", risk: "HIGH", icon: "lab", sparkline: [60, 65, 68, 69, 73, 76, 79] },
  { name: "Operating Rooms", department: "Surgery", utilization: 68, capacity: "10 / 15 rooms", trend: "+3%", risk: "MODERATE", icon: "or", sparkline: [63, 64, 62, 65, 66, 67, 68] },
];

export const departments = [
  { name: "Emergency", utilization: 88, risk: "CRITICAL" as RiskLevel, trend: "+12%" },
  { name: "General Ward", utilization: 87, risk: "HIGH" as RiskLevel, trend: "+7%" },
  { name: "ICU", utilization: 74, risk: "HIGH" as RiskLevel, trend: "+8%" },
  { name: "Radiology", utilization: 91, risk: "CRITICAL" as RiskLevel, trend: "+15%" },
  { name: "Laboratory", utilization: 79, risk: "HIGH" as RiskLevel, trend: "+9%" },
  { name: "Operating Room", utilization: 68, risk: "MODERATE" as RiskLevel, trend: "+3%" },
  { name: "Cardiology", utilization: 56, risk: "NORMAL" as RiskLevel, trend: "+1%" },
  { name: "Pediatrics", utilization: 39, risk: "LOW" as RiskLevel, trend: "-6%" },
];

export const forecast: ForecastPoint[] = [
  { time: "Now", actual: 78, forecast: 78, low: 74, high: 82 },
  { time: "+1h", actual: 80, forecast: 82, low: 77, high: 86 },
  { time: "+2h", actual: 82, forecast: 86, low: 80, high: 91 },
  { time: "+3h", actual: null, forecast: 90, low: 84, high: 95 },
  { time: "+4h", actual: null, forecast: 92, low: 86, high: 98 },
  { time: "+5h", actual: null, forecast: 94, low: 88, high: 100 },
  { time: "+6h", actual: null, forecast: 96, low: 90, high: 103 },
  { time: "+8h", actual: null, forecast: 98, low: 91, high: 105 },
];

export const bottlenecks = [
  { resource: "Emergency Beds", department: "Emergency", current: 88, peak: 97, capacity: "50 beds", time: "2h 47m", risk: "CRITICAL", impact: "General Ward → ICU" },
  { resource: "CT Scanner", department: "Radiology", current: 91, peak: 104, capacity: "100 scans", time: "4h 18m", risk: "CRITICAL", impact: "Diagnosis → Treatment" },
  { resource: "General Ward", department: "Ward", current: 87, peak: 94, capacity: "200 beds", time: "6h 05m", risk: "HIGH", impact: "Ward → ICU" },
];

export const recommendations = [
  { priority: "URGENT", title: "Prepare 12 additional emergency beds.", reason: "Bed utilization expected to exceed 95% in 2h 47m.", impact: "HIGH", improvement: "-8% peak congestion" },
  { priority: "OPTIMIZATION", title: "Redistribute 10 CT slots to Emergency.", reason: "Radiology demand is tracking 15% above hourly pattern.", impact: "HIGH", improvement: "-42m diagnostic delay" },
  { priority: "PREVENTIVE", title: "Review 6 elective procedures.", reason: "Projected ICU pressure rises after the 17:00 procedure block.", impact: "MEDIUM", improvement: "+6 ICU beds protected" },
];

export const networkNodes = [
  { id: "arrival", label: "Patient Arrival", x: 8, y: 46, kind: "source" },
  { id: "emergency", label: "Emergency", x: 27, y: 20, kind: "risk" },
  { id: "beds", label: "Emergency Beds", x: 49, y: 20, kind: "risk" },
  { id: "ct", label: "CT Scanner", x: 49, y: 47, kind: "risk" },
  { id: "lab", label: "Laboratory", x: 49, y: 74, kind: "risk" },
  { id: "diagnosis", label: "Diagnosis", x: 69, y: 47, kind: "normal" },
  { id: "treatment", label: "Treatment", x: 84, y: 47, kind: "normal" },
  { id: "ward", label: "General Ward", x: 69, y: 20, kind: "normal" },
  { id: "icu", label: "ICU", x: 84, y: 20, kind: "risk" },
  { id: "discharge", label: "Discharge", x: 94, y: 20, kind: "normal" },
];

export const networkEdges = [
  ["arrival", "emergency", "84%"], ["emergency", "beds", "91%"], ["emergency", "ct", "72%"], ["emergency", "lab", "80%"], ["ct", "diagnosis", "88%"], ["lab", "diagnosis", "76%"], ["diagnosis", "treatment", "83%"], ["treatment", "ward", "69%"], ["ward", "icu", "61%"], ["icu", "discharge", "52%"], ["emergency", "ward", "58%"],
] as const;

export const simulatorDefaults = { surge: 30, emergency: 72, beds: 76, ct: 68, mri: 45, staff: 88, procedures: 64 };

export type EmergencySeverity = "CRITICAL" | "HIGH" | "MODERATE";
export type ReadinessStatus = "READY" | "LIMITED" | "CRITICAL";
export type AlertLifecycleStep = "CREATED" | "SENT" | "DELIVERED" | "ACKNOWLEDGED" | "PREPARING" | "READY" | "PATIENT ARRIVED" | "RESOLVED";

export const patientLifecycleStages: { key: AlertLifecycleStep; label: string; desc: string }[] = [
  { key: "CREATED", label: "Reported", desc: "Request submitted" },
  { key: "PREPARING", label: "Preparing", desc: "Hospital preparing" },
  { key: "READY", label: "Ready", desc: "Resources ready" },
];

export type AlertTeamRole = {
  id: string;
  role: string;
  department: string;
  assignee: string;
  status: "PENDING" | "DELIVERED" | "ACKNOWLEDGED" | "PREPARING";
  action: string;
  ackTime?: string;
  urgency: "CRITICAL" | "HIGH" | "STANDARD";
};

export type EscalationTier = {
  tier: number;
  level: string;
  role: string;
  name: string;
  contact: string;
  timeoutSeconds: number;
  status: "RESOLVED" | "ACKNOWLEDGED" | "ACTIVE" | "PENDING" | "ESCALATED";
};

export type EmergencyCapacityItem = {
  id: string;
  resource: string;
  department: string;
  total: number;
  available: number;
  utilization: number;
  status: ReadinessStatus;
  detail: string;
  icon: string;
};

export type EmergencyCase = {
  id: string;
  incidentType: string;
  patientCount: number;
  severity: EmergencySeverity;
  etaMinutes: number;
  location: string;
  injurySummary: string;
  triage: { critical: number; urgent: number; delayed: number };
  vitalsPreview: string;
  lifecycle: AlertLifecycleStep;
  reportedAt: string;
  hospitalRisk: ReadinessStatus;
  roles: AlertTeamRole[];
  escalation: EscalationTier[];
};

export const emergencyCapacitySnapshot: EmergencyCapacityItem[] = [
  { id: "er-beds", resource: "Emergency Beds", department: "Emergency", total: 50, available: 6, utilization: 88, status: "LIMITED", detail: "6 of 50 beds immediately open; 4 fast-track beds convertible", icon: "bed" },
  { id: "icu-beds", resource: "ICU Beds", department: "Critical Care", total: 50, available: 13, utilization: 74, status: "LIMITED", detail: "13 beds available; 3 reserved for active post-op recovery", icon: "icu" },
  { id: "ct-scanner", resource: "CT Scanner Availability", department: "Radiology", total: 100, available: 9, utilization: 91, status: "CRITICAL", detail: "91% utilized; 1 priority trauma bay slot can be preempted", icon: "ct" },
  { id: "mri-scanner", resource: "MRI Scanner", department: "Radiology", total: 40, available: 23, utilization: 42, status: "READY", detail: "23 slots available; low baseline load", icon: "mri" },
  { id: "lab-capacity", resource: "Laboratory Diagnostics", department: "Pathology", total: 800, available: 168, utilization: 79, status: "LIMITED", detail: "Stat blood panel turnaround current: 14 mins", icon: "lab" },
  { id: "operating-rooms", resource: "Operating Rooms (OR)", department: "Surgery", total: 15, available: 5, utilization: 68, status: "READY", detail: "OR-03 & OR-05 sterile and pre-staged for trauma laparotomy", icon: "or" },
];

export const initialEmergencyCases: EmergencyCase[] = [
  {
    id: "EMG-2026-0941",
    incidentType: "Multi-Vehicle Highway Collision",
    patientCount: 3,
    severity: "CRITICAL",
    etaMinutes: 12,
    location: "Interstate 93 North · Milepost 24.8",
    injurySummary: "3 critical trauma patients: 1 blunt thoracic polytrauma with tension pneumothorax, 1 severe traumatic brain injury (GCS 7), 1 open femur fracture with arterial bleeding.",
    triage: { critical: 3, urgent: 0, delayed: 0 },
    vitalsPreview: "PT 1: BP 78/42, HR 138, SpO2 88% | PT 2: GCS 7, Intubated EMS | PT 3: Tourniquet applied 06:41",
    lifecycle: "DELIVERED",
    reportedAt: "06:42 UTC",
    hospitalRisk: "CRITICAL",
    roles: [
      { id: "r1", role: "Emergency Doctor", department: "Emergency Dept", assignee: "Dr. Sarah Chen, MD (Trauma Attending)", status: "DELIVERED", action: "Prepare Resuscitation Bay 1 & rapid infuser unit", urgency: "CRITICAL" },
      { id: "r2", role: "Trauma Surgical Team", department: "Trauma Surgery", assignee: "Alpha Trauma Unit (Lead: Dr. Marcus Vance)", status: "ACKNOWLEDGED", action: "Reserve OR-03 & assemble thoracic surgical tray", ackTime: "06:44 UTC", urgency: "CRITICAL" },
      { id: "r3", role: "ICU Resuscitation Team", department: "Critical Care", assignee: "Neuro-ICU On-Duty (Charge RN Lisa Wong)", status: "PREPARING", action: "Prepare 2 ventilator-supported ICU beds in Pod B", ackTime: "06:43 UTC", urgency: "HIGH" },
      { id: "r4", role: "Radiology Team", department: "Diagnostic Imaging", assignee: "Dr. Ethan Brooks (CT Suite 1)", status: "DELIVERED", action: "Hold CT Scanner 1 queue for emergency whole-body pan-scan", urgency: "CRITICAL" },
      { id: "r5", role: "Hospital Emergency Coordinator", department: "Command Ops", assignee: "M. ADITHYA (Admin Coordinator)", status: "ACKNOWLEDGED", action: "Coordinate bed reallocation & initiate Level-1 trauma divert protocol", ackTime: "06:42 UTC", urgency: "HIGH" },
    ],
    escalation: [
      { tier: 1, level: "Primary Tier", role: "Primary Trauma Attending", name: "Dr. Sarah Chen", contact: "Ext. 4401 · Speed Dial #1", timeoutSeconds: 60, status: "ACTIVE" },
      { tier: 2, level: "Secondary Backup", role: "On-Call Trauma Specialist", name: "Dr. Michael Torres", contact: "Ext. 4408 · Mobile Direct", timeoutSeconds: 120, status: "PENDING" },
      { tier: 3, level: "Command Escalation", role: "Hospital Emergency Coordinator", name: "M. ADITHYA (Admin Ops)", contact: "Command Desk #1", timeoutSeconds: 180, status: "PENDING" },
    ],
  },
  {
    id: "EMG-2026-0942",
    incidentType: "Industrial Plant Explosion & Flash Fire",
    patientCount: 6,
    severity: "HIGH",
    etaMinutes: 24,
    location: "Salem Industrial District · Chemical Plant 4",
    injurySummary: "6 industrial casualties: 2 with 35% BSA chemical/thermal flash burns, 3 with severe smoke inhalation and airway compromise, 1 traumatic limb crush injury.",
    triage: { critical: 2, urgent: 3, delayed: 1 },
    vitalsPreview: "Airway burn protocols initiated by ground paramedics. 40L O2 administered in transit.",
    lifecycle: "PREPARING",
    reportedAt: "06:35 UTC",
    hospitalRisk: "HIGH",
    roles: [
      { id: "r1", role: "Emergency Doctor", department: "Emergency Dept", assignee: "Dr. Kevin Patel, MD", status: "ACKNOWLEDGED", action: "Activate Burn Resuscitation Bay 2 & bronchoscope kit", ackTime: "06:37 UTC", urgency: "CRITICAL" },
      { id: "r2", role: "Trauma Surgical Team", department: "General Surgery", assignee: "Bravo Surgical Team", status: "ACKNOWLEDGED", action: "Prep escharotomy surgical packs and sterile burn dressings", ackTime: "06:38 UTC", urgency: "HIGH" },
      { id: "r3", role: "ICU Resuscitation Team", department: "Burn ICU", assignee: "Burn ICU Team (Charge: Nurse Myers)", status: "PREPARING", action: "Allocate 3 isolation burn beds and prepare fluid resuscitation calculation", ackTime: "06:39 UTC", urgency: "HIGH" },
      { id: "r4", role: "Radiology Team", department: "Diagnostics", assignee: "Chest Imaging Staff", status: "ACKNOWLEDGED", action: "Deploy mobile portable X-ray to Trauma Bays", ackTime: "06:36 UTC", urgency: "STANDARD" },
      { id: "r5", role: "Hospital Emergency Coordinator", department: "Command Ops", assignee: "M. ADITHYA (Admin Coordinator)", status: "ACKNOWLEDGED", action: "Notify regional burn center for potential secondary transfer", ackTime: "06:36 UTC", urgency: "HIGH" },
    ],
    escalation: [
      { tier: 1, level: "Primary Tier", role: "Primary Burn Attending", name: "Dr. Kevin Patel", contact: "Ext. 4410", timeoutSeconds: 0, status: "ACKNOWLEDGED" },
      { tier: 2, level: "Secondary Backup", role: "Surgical Director", name: "Dr. Elena Rostova", contact: "Ext. 4422", timeoutSeconds: 120, status: "RESOLVED" },
      { tier: 3, level: "Command Escalation", role: "Hospital Emergency Coordinator", name: "M. ADITHYA", contact: "Command Desk #1", timeoutSeconds: 180, status: "RESOLVED" },
    ],
  },
  {
    id: "EMG-2026-0943",
    incidentType: "Mass Transit Train Derailment (MCI Alert)",
    patientCount: 14,
    severity: "CRITICAL",
    etaMinutes: 35,
    location: "South Metro Line · Tunnel Exit 3",
    injurySummary: "Mass Casualty Incident: 4 critical crush/head injuries, 6 moderate fractures/lacerations, 4 walking wounded. Full disaster intake protocol recommended.",
    triage: { critical: 4, urgent: 6, delayed: 4 },
    vitalsPreview: "EMS Triage Tags: Red: 4, Yellow: 6, Green: 4. Disaster medical fleet dispatched.",
    lifecycle: "CREATED",
    reportedAt: "06:48 UTC",
    hospitalRisk: "CRITICAL",
    roles: [
      { id: "r1", role: "Emergency Doctor", department: "Emergency Dept", assignee: "All ED Physicians & Residents", status: "PENDING", action: "Declare Code Orange / Mass Casualty intake triage zone in Ambulatory Bay", urgency: "CRITICAL" },
      { id: "r2", role: "Trauma Surgical Team", department: "Trauma Center", assignee: "All Surgical Rosters A, B, C", status: "PENDING", action: "Halt elective OR starts; clear recovery bays", urgency: "CRITICAL" },
      { id: "r3", role: "ICU Resuscitation Team", department: "Critical Care", assignee: "All ICU Units", status: "PENDING", action: "Discharge step-down candidates to Ward to free 8 ICU beds", urgency: "CRITICAL" },
      { id: "r4", role: "Radiology Team", department: "Imaging", assignee: "Radiology Department Lead", status: "PENDING", action: "Designate CT-1 for critical head trauma, CT-2 for torso trauma", urgency: "CRITICAL" },
      { id: "r5", role: "Hospital Emergency Coordinator", department: "Command Ops", assignee: "M. ADITHYA (Admin Coordinator)", status: "ACKNOWLEDGED", action: "Open Emergency Operations Center (EOC) & alert blood bank for massive transfusion protocol", ackTime: "06:49 UTC", urgency: "CRITICAL" },
    ],
    escalation: [
      { tier: 1, level: "Primary Tier", role: "ED Chief on Duty", name: "Dr. Sarah Chen", contact: "Ext. 4401", timeoutSeconds: 45, status: "ACTIVE" },
      { tier: 2, level: "Secondary Backup", role: "Chief Medical Officer", name: "Dr. Arthur Vance", contact: "Direct Mobile", timeoutSeconds: 90, status: "PENDING" },
      { tier: 3, level: "Command Escalation", role: "Hospital Incident Commander", name: "M. ADITHYA", contact: "Command Desk #1", timeoutSeconds: 120, status: "PENDING" },
    ],
  },
];

export const emergencyLifecycleStages: { key: AlertLifecycleStep; label: string; desc: string }[] = [
  { key: "CREATED", label: "Reported", desc: "Request submitted" },
  { key: "PREPARING", label: "Preparing", desc: "Hospital preparing" },
  { key: "READY", label: "Ready", desc: "Resources ready" },
];

export const emergencyPropagationImpact = [
  { stage: "Accident Detected", metric: "+3 Critical Polytrauma", detail: "Incoming ETA 12m", status: "CRITICAL" },
  { stage: "Emergency Demand", metric: "+30% Surge", detail: "44 → 47 beds in use", status: "CRITICAL" },
  { stage: "Emergency Bed Saturation", metric: "96% Utilization", detail: "Overload in 18 min", status: "CRITICAL" },
  { stage: "CT Scanner Bottleneck", metric: "108% Peak Demand", detail: "Queue conflict with scheduled cases", status: "CRITICAL" },
  { stage: "Diagnostic Delay", metric: "+38m Projected Delay", detail: "Downstream lag for routine diagnosis", status: "HIGH" },
  { stage: "ICU Resuscitation Pressure", metric: "88% Projected Post-Op", detail: "Requires reserving 2 post-op beds", status: "HIGH" },
];

export const api = {
  getCommandCenter: () => ({ hospital, resources, departments, forecast, bottlenecks, recommendations }),
  getNetwork: () => ({ nodes: networkNodes, edges: networkEdges }),
  getScenario: (surge: number) => ({
    beds: Math.min(99, 72 + Math.round(surge * 0.72)),
    emergency: Math.min(115, 68 + Math.round(surge * 0.96)),
    ct: Math.min(118, 71 + Math.round(surge * 0.62)),
    laboratory: Math.min(98, 64 + Math.round(surge * 0.5)),
    icu: Math.min(98, 61 + Math.round(surge * 0.46)),
  }),
  getEmergencyCases: () => initialEmergencyCases,
  getEmergencyCapacity: () => emergencyCapacitySnapshot,
};