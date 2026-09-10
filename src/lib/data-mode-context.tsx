import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { DashboardResponse, RiskLevel } from "@/types/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DataMode = "past" | "current";

export interface ClassifiedField {
  canonical: string;   // e.g. "PATIENT_ARRIVALS"
  column: string;      // actual column name in uploaded file
  confidence: number;  // 0–100
}

export interface DatasetMeta {
  filename: string;
  recordCount: number;
  columnCount: number;
  timeRange: string;
  uploadedAt: string;
  classifiedFields: ClassifiedField[];
  validationMessages: { ok: boolean; message: string }[];
  analysisStatus: "idle" | "validating" | "classifying" | "calculating" | "forecasting" | "bottlenecks" | "propagating" | "recommendations" | "done" | "error";
  errorMessage?: string;
}

export interface DataModeState {
  dataMode: DataMode;
  setDataMode: (mode: DataMode) => void;
  datasetMeta: DatasetMeta | null;
  currentDashboard: DashboardResponse | null;
  setCurrentDashboard: (d: DashboardResponse | null) => void;
  setDatasetMeta: (m: DatasetMeta | null | ((prev: DatasetMeta | null) => DatasetMeta | null)) => void;
}

// ── Column classification map ─────────────────────────────────────────────────

const COLUMN_PATTERNS: { canonical: string; patterns: string[] }[] = [
  { canonical: "PATIENT_ARRIVALS",  patterns: ["patient_arrival","arrivals","patients_arrived","admission_count","emergency_arrivals","total_arrivals","new_patients"] },
  { canonical: "EMERGENCY_DEMAND",  patterns: ["emergency_cases","emergency_patients","trauma_cases","er_cases","emergency_demand","emergency_count"] },
  { canonical: "OCCUPIED_BEDS",     patterns: ["occupied_beds","beds_occupied","bed_occupancy","beds_in_use","current_beds"] },
  { canonical: "BED_CAPACITY",      patterns: ["total_beds","bed_capacity","beds_available_total","max_beds","total_bed_capacity"] },
  { canonical: "ICU_OCCUPANCY",     patterns: ["icu_occupied","occupied_icu","icu_patients","icu_in_use","icu_beds_used"] },
  { canonical: "ICU_CAPACITY",      patterns: ["icu_capacity","total_icu_beds","icu_total","max_icu"] },
  { canonical: "CT_DEMAND",         patterns: ["ct_requests","ct_demand","ct_scans","ct_count","ct_utilization_count"] },
  { canonical: "CT_CAPACITY",       patterns: ["ct_capacity","ct_available_capacity","max_ct","total_ct"] },
  { canonical: "MRI_DEMAND",        patterns: ["mri_requests","mri_demand","mri_scans","mri_count"] },
  { canonical: "MRI_CAPACITY",      patterns: ["mri_capacity","max_mri","total_mri"] },
  { canonical: "LAB_DEMAND",        patterns: ["lab_requests","lab_demand","lab_tests","laboratory_demand","lab_count"] },
  { canonical: "LAB_CAPACITY",      patterns: ["lab_capacity","max_lab","total_lab","laboratory_capacity"] },
  { canonical: "OR_DEMAND",         patterns: ["scheduled_procedures","or_demand","procedure_count","or_requests","procedures"] },
  { canonical: "OR_CAPACITY",       patterns: ["or_capacity","max_or","total_or","operating_room_capacity"] },
  { canonical: "STAFF_COUNT",       patterns: ["staff_count","staff_available","staff_on_duty","nurses","doctors","total_staff"] },
  { canonical: "STAFF_CAPACITY",    patterns: ["staff_capacity","max_staff","total_staff_capacity"] },
  { canonical: "TIMESTAMP",         patterns: ["timestamp","datetime","date","time","hour","date_time","recorded_at"] },
  { canonical: "DEPARTMENT",        patterns: ["department","dept","unit","ward","section"] },
];

function normalise(s: string) {
  return s.toLowerCase().replace(/[\s\-\.]/g, "_");
}

export function classifyColumns(columns: string[]): ClassifiedField[] {
  const results: ClassifiedField[] = [];
  const used = new Set<string>();

  for (const { canonical, patterns } of COLUMN_PATTERNS) {
    let best: { column: string; confidence: number } | null = null;
    for (const col of columns) {
      if (used.has(col)) continue;
      const norm = normalise(col);
      for (const pat of patterns) {
        if (norm === pat) {
          best = { column: col, confidence: 98 };
          break;
        }
        if (norm.includes(pat) || pat.includes(norm)) {
          const conf = norm.includes(pat) ? 85 : 72;
          if (!best || conf > best.confidence) best = { column: col, confidence: conf };
        }
      }
    }
    if (best) {
      results.push({ canonical, column: best.column, confidence: best.confidence });
      used.add(best.column);
    }
  }
  return results;
}

// ── Risk classification ───────────────────────────────────────────────────────

export function utilToRisk(u: number): RiskLevel {
  if (u >= 95) return "CRITICAL";
  if (u >= 90) return "HIGH";
  if (u >= 80) return "MODERATE";
  if (u >= 70) return "NORMAL";
  return "LOW";
}

// ── Context ───────────────────────────────────────────────────────────────────

const DataModeContext = createContext<DataModeState | null>(null);

export function DataModeProvider({ children }: { children: ReactNode }) {
  const [dataMode, setDataMode] = useState<DataMode>("past");
  const [datasetMeta, setDatasetMeta] = useState<DatasetMeta | null>(null);
  const [currentDashboard, setCurrentDashboard] = useState<DashboardResponse | null>(null);

  const handleSetDataMode = useCallback((mode: DataMode) => setDataMode(mode), []);

  return (
    <DataModeContext.Provider value={{ dataMode, setDataMode: handleSetDataMode, datasetMeta, currentDashboard, setCurrentDashboard, setDatasetMeta }}>
      {children}
    </DataModeContext.Provider>
  );
}

export function useDataMode() {
  const ctx = useContext(DataModeContext);
  if (!ctx) throw new Error("useDataMode must be used inside DataModeProvider");
  return ctx;
}
