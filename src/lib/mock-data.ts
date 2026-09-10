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
  name: "Salem Central Medical Center",
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

export const api = {
  getCommandCenter: () => ({ hospital, resources, departments, forecast, bottlenecks, recommendations }),
  getNetwork: () => ({ nodes: networkNodes, edges: networkEdges }),
  getScenario: (surge: number) => ({ beds: Math.min(99, 72 + Math.round(surge * 0.72)), emergency: Math.min(108, 68 + Math.round(surge * 0.96)), ct: Math.min(110, 71 + Math.round(surge * 0.62)), laboratory: Math.min(98, 64 + Math.round(surge * 0.5)), icu: Math.min(94, 61 + Math.round(surge * 0.46)) }),
};