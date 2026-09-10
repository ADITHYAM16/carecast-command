import type { DashboardResponse, RiskLevel, ApiForecastPoint, ApiBottleneck, ApiRecommendation } from "@/types/api";
import type { ClassifiedField } from "./data-mode-context";
import { utilToRisk } from "./data-mode-context";
import { hospital as mockHospital, forecast as mockForecast } from "./mock-data";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getField(fields: ClassifiedField[], canonical: string): string | null {
  return fields.find((f) => f.canonical === canonical)?.column ?? null;
}

function numCol(row: Record<string, string>, col: string | null): number | null {
  if (!col) return null;
  const v = parseFloat(row[col] ?? "");
  return isNaN(v) ? null : v;
}

function avg(vals: number[]): number {
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function last(vals: number[]): number {
  return vals[vals.length - 1] ?? 0;
}

// ── Main analytics function ───────────────────────────────────────────────────

export function computeDashboardFromRows(
  rows: Record<string, string>[],
  fields: ClassifiedField[],
): DashboardResponse {
  if (!rows.length) throw new Error("Empty dataset");

  // Use last 24 rows as "recent" for trend, last row as "current"
  const recent = rows.slice(-Math.min(24, rows.length));
  const currentRow = rows[rows.length - 1]!;

  // ── Utilization calculations ──────────────────────────────────────────────

  const bedOccCol   = getField(fields, "OCCUPIED_BEDS");
  const bedCapCol   = getField(fields, "BED_CAPACITY");
  const icuOccCol   = getField(fields, "ICU_OCCUPANCY");
  const icuCapCol   = getField(fields, "ICU_CAPACITY");
  const ctDemCol    = getField(fields, "CT_DEMAND");
  const ctCapCol    = getField(fields, "CT_CAPACITY");
  const mriDemCol   = getField(fields, "MRI_DEMAND");
  const mriCapCol   = getField(fields, "MRI_CAPACITY");
  const labDemCol   = getField(fields, "LAB_DEMAND");
  const labCapCol   = getField(fields, "LAB_CAPACITY");
  const orDemCol    = getField(fields, "OR_DEMAND");
  const orCapCol    = getField(fields, "OR_CAPACITY");

  function utilPct(demCol: string | null, capCol: string | null, row: Record<string, string>): number | null {
    const dem = numCol(row, demCol);
    const cap = numCol(row, capCol);
    if (dem == null || cap == null || cap === 0) return null;
    return Math.round((dem / cap) * 100);
  }

  const bedUtil   = utilPct(bedOccCol, bedCapCol, currentRow);
  const icuUtil   = utilPct(icuOccCol, icuCapCol, currentRow);
  const ctUtil    = utilPct(ctDemCol, ctCapCol, currentRow);
  const mriUtil   = utilPct(mriDemCol, mriCapCol, currentRow);
  const labUtil   = utilPct(labDemCol, labCapCol, currentRow);
  const orUtil    = utilPct(orDemCol, orCapCol, currentRow);

  // ── Hospital capacity score (weighted) ────────────────────────────────────

  const weights: [number | null, number][] = [
    [bedUtil, 0.35],
    [icuUtil, 0.25],
    [ctUtil,  0.20],
    [labUtil, 0.20],
  ];
  const available = weights.filter(([v]) => v != null);
  const totalWeight = available.reduce((s, [, w]) => s + w, 0);
  const capacityScore = totalWeight > 0
    ? Math.round(available.reduce((s, [v, w]) => s + (v! * w), 0) / totalWeight)
    : mockHospital.capacityScore;

  // ── Trend: compare last row vs 6 rows ago ─────────────────────────────────

  function trendStr(demCol: string | null, capCol: string | null): string {
    if (!demCol || !capCol || rows.length < 6) return "+0%";
    const prev = rows[rows.length - 6]!;
    const prevU = utilPct(demCol, capCol, prev);
    const currU = utilPct(demCol, capCol, currentRow);
    if (prevU == null || currU == null) return "+0%";
    const diff = currU - prevU;
    return `${diff >= 0 ? "+" : ""}${diff}%`;
  }

  // ── Sparkline: last 7 utilization values ─────────────────────────────────

  function sparkline(demCol: string | null, capCol: string | null): number[] {
    const tail = rows.slice(-7);
    return tail.map((r) => utilPct(demCol, capCol, r) ?? 0);
  }

  // ── Forecast: simple linear extrapolation from last 6 points ─────────────

  function forecastNext(demCol: string | null, capCol: string | null, steps: number): number {
    const tail = rows.slice(-6);
    const vals = tail.map((r) => utilPct(demCol, capCol, r) ?? 0);
    if (vals.length < 2) return vals[0] ?? 0;
    const slope = (vals[vals.length - 1]! - vals[0]!) / (vals.length - 1);
    return Math.round(Math.min(120, Math.max(0, (vals[vals.length - 1]! + slope * steps))));
  }

  const bedForecast6h = forecastNext(bedOccCol, bedCapCol, 6);
  const icuForecast6h = forecastNext(icuOccCol, icuCapCol, 6);
  const ctForecast6h  = forecastNext(ctDemCol, ctCapCol, 6);

  // ── Predicted peak & time to critical ────────────────────────────────────

  const currentUtil = bedUtil ?? capacityScore;
  const predictedPeak = Math.max(bedForecast6h, icuForecast6h, ctForecast6h, currentUtil + 8);

  // Estimate hours to critical (>95%) using slope
  function hoursToThreshold(demCol: string | null, capCol: string | null, threshold = 95): number | null {
    const tail = rows.slice(-6);
    const vals = tail.map((r) => utilPct(demCol, capCol, r) ?? 0);
    if (vals.length < 2) return null;
    const slope = (vals[vals.length - 1]! - vals[0]!) / (vals.length - 1);
    if (slope <= 0) return null;
    const curr = vals[vals.length - 1]!;
    if (curr >= threshold) return 0;
    return Math.round((threshold - curr) / slope);
  }

  const ttcBed = hoursToThreshold(bedOccCol, bedCapCol);
  const ttcIcu = hoursToThreshold(icuOccCol, icuCapCol);
  const ttcCt  = hoursToThreshold(ctDemCol, ctCapCol);
  const ttcMin = [ttcBed, ttcIcu, ttcCt].filter((v): v is number => v != null).sort((a, b) => a - b)[0];
  const timeToCritical = ttcMin != null ? `${ttcMin}h ${Math.round((ttcMin % 1) * 60)}m` : "N/A";

  // ── Forecast chart points ─────────────────────────────────────────────────

  const forecastPoints: ApiForecastPoint[] = [
    { time: "Now",  actual: currentUtil, forecast: currentUtil, low: currentUtil - 4, high: currentUtil + 4 },
    { time: "+1h",  actual: null, forecast: forecastNext(bedOccCol, bedCapCol, 1), low: forecastNext(bedOccCol, bedCapCol, 1) - 4, high: forecastNext(bedOccCol, bedCapCol, 1) + 4 },
    { time: "+2h",  actual: null, forecast: forecastNext(bedOccCol, bedCapCol, 2), low: forecastNext(bedOccCol, bedCapCol, 2) - 5, high: forecastNext(bedOccCol, bedCapCol, 2) + 5 },
    { time: "+3h",  actual: null, forecast: forecastNext(bedOccCol, bedCapCol, 3), low: forecastNext(bedOccCol, bedCapCol, 3) - 5, high: forecastNext(bedOccCol, bedCapCol, 3) + 6 },
    { time: "+6h",  actual: null, forecast: bedForecast6h, low: bedForecast6h - 6, high: bedForecast6h + 7 },
    { time: "+12h", actual: null, forecast: forecastNext(bedOccCol, bedCapCol, 12), low: forecastNext(bedOccCol, bedCapCol, 12) - 8, high: forecastNext(bedOccCol, bedCapCol, 12) + 9 },
  ];

  // ── Resources ─────────────────────────────────────────────────────────────

  const resourceDefs: { name: string; dept: string; icon: string; util: number | null; cap: string; demCol: string | null; capCol: string | null }[] = [
    { name: "Emergency Beds", dept: "Emergency",    icon: "bed", util: bedUtil,  cap: bedCapCol  ? `${numCol(currentRow, bedCapCol) ?? "?"} beds`  : "—", demCol: bedOccCol, capCol: bedCapCol },
    { name: "ICU Beds",       dept: "Critical Care",icon: "icu", util: icuUtil,  cap: icuCapCol  ? `${numCol(currentRow, icuCapCol) ?? "?"} beds`  : "—", demCol: icuOccCol, capCol: icuCapCol },
    { name: "CT Scanner",     dept: "Radiology",    icon: "ct",  util: ctUtil,   cap: ctCapCol   ? `${numCol(currentRow, ctCapCol) ?? "?"} scans`  : "—", demCol: ctDemCol,  capCol: ctCapCol  },
    { name: "MRI",            dept: "Radiology",    icon: "mri", util: mriUtil,  cap: mriCapCol  ? `${numCol(currentRow, mriCapCol) ?? "?"} scans`  : "—", demCol: mriDemCol, capCol: mriCapCol },
    { name: "Laboratory",     dept: "Diagnostics",  icon: "lab", util: labUtil,  cap: labCapCol  ? `${numCol(currentRow, labCapCol) ?? "?"} tests`  : "—", demCol: labDemCol, capCol: labCapCol },
    { name: "Operating Rooms",dept: "Surgery",      icon: "or",  util: orUtil,   cap: orCapCol   ? `${numCol(currentRow, orCapCol) ?? "?"} rooms`   : "—", demCol: orDemCol,  capCol: orCapCol  },
  ];

  const resources = resourceDefs
    .filter((r) => r.util != null)
    .map((r) => ({
      name: r.name,
      department: r.dept,
      utilization: r.util!,
      capacity: r.cap,
      trend: trendStr(r.demCol, r.capCol),
      risk: utilToRisk(r.util!) as RiskLevel,
      icon: r.icon,
      sparkline: sparkline(r.demCol, r.capCol),
    }));

  // ── Departments ───────────────────────────────────────────────────────────

  const departments = resources.map((r) => ({
    name: r.department,
    utilization: r.utilization,
    risk: r.risk,
    trend: r.trend,
  }));

  // ── Bottlenecks ───────────────────────────────────────────────────────────

  const bottlenecks: ApiBottleneck[] = resourceDefs
    .filter((r) => r.util != null && r.util >= 80)
    .map((r) => {
      const peak = forecastNext(r.demCol, r.capCol, 6);
      const ttc = hoursToThreshold(r.demCol, r.capCol);
      return {
        resource: r.name,
        department: r.dept,
        current: r.util!,
        peak,
        capacity: r.cap,
        time: ttc != null ? `${ttc}h 00m` : "N/A",
        risk: utilToRisk(peak) as RiskLevel,
        impact: r.name === "Emergency Beds" ? "General Ward → ICU" : r.name === "ICU Beds" ? "Discharge Delay" : r.name === "CT Scanner" ? "Diagnosis → Treatment" : "Downstream pressure",
      };
    })
    .sort((a, b) => b.current - a.current);

  // ── Recommendations ───────────────────────────────────────────────────────

  const recommendations: ApiRecommendation[] = [];

  if (icuUtil != null && icuUtil >= 90) {
    recommendations.push({ priority: "URGENT", title: `ICU utilization is at ${icuUtil}%. Review elective procedure scheduling and step-down capacity.`, reason: `ICU projected to exceed 95% within ${ttcIcu ?? "?"} hours.`, impact: "HIGH", improvement: "-6% ICU pressure" });
  }
  if (ctUtil != null && ctUtil >= 85) {
    recommendations.push({ priority: "URGENT", title: "CT demand is approaching scanner capacity. Prioritize emergency diagnostics.", reason: `CT utilization at ${ctUtil}% — diagnostic delays likely.`, impact: "HIGH", improvement: "-30m diagnostic delay" });
  }
  if (bedUtil != null && bedUtil >= 85) {
    recommendations.push({ priority: "OPTIMIZATION", title: `Prepare additional emergency beds. Current occupancy at ${bedUtil}%.`, reason: `Bed utilization forecast to reach ${bedForecast6h}% in 6 hours.`, impact: "HIGH", improvement: "-8% peak congestion" });
  }
  if (labUtil != null && labUtil >= 80) {
    recommendations.push({ priority: "PREVENTIVE", title: "Laboratory demand is elevated. Consider increasing staffing for peak hours.", reason: `Lab utilization at ${labUtil}%.`, impact: "MEDIUM", improvement: "-15m turnaround" });
  }
  if (!recommendations.length) {
    recommendations.push({ priority: "EFFICIENCY", title: "All resources operating within safe parameters.", reason: "No critical bottlenecks detected in current dataset.", impact: "LOW", improvement: "Maintain current operations" });
  }

  // ── Assemble response ─────────────────────────────────────────────────────

  const overallRisk = utilToRisk(capacityScore);

  return {
    hospital: {
      name: "Healthcare Support",
      capacity_score: capacityScore,
      current_utilization: currentUtil,
      predicted_peak: predictedPeak,
      time_to_critical: timeToCritical,
      risk: overallRisk,
      last_updated: "just now",
    },
    resources,
    departments,
    forecast: forecastPoints,
    bottlenecks,
    recommendations,
  };
}
