import { useCallback, useEffect, useRef, useState } from "react";
import {
  checkBackendHealth,
  fetchDashboard,
  fetchForecast,
  fetchBottlenecks,
  fetchResources,
  fetchDependencies,
  fetchRecommendations,
  fetchProcedureCapacity,
  fetchProcedures,
  fetchSchedulingConflicts,
  postSimulate,
  postProcedure,
  isBackendOnline,
} from "@/services/api";
import {
  hospital as mockHospital,
  resources as mockResources,
  departments as mockDepartments,
  forecast as mockForecast,
  bottlenecks as mockBottlenecks,
  recommendations as mockRecommendations,
  networkNodes as mockNodes,
  networkEdges as mockEdges,
} from "@/lib/mock-data";
import type {
  DashboardResponse,
  ForecastResponse,
  BottlenecksResponse,
  ResourcesResponse,
  DependenciesResponse,
  SimulateRequest,
  SimulateResponse,
  RecommendationsResponse,
  ProcedureCapacityResponse,
  ApiProcedure,
  SchedulingConflict,
} from "@/types/api";
import type { CreateProcedureRequest } from "@/services/api";

// ── Instant mock seeds (used as initialData so pages render with no skeleton) ─

const SEED_DASHBOARD: DashboardResponse = {
  hospital: {
    name: mockHospital.name,
    capacity_score: mockHospital.capacityScore,
    current_utilization: mockHospital.currentUtilization,
    predicted_peak: mockHospital.predictedPeak,
    time_to_critical: mockHospital.timeToCritical,
    risk: "MODERATE",
    last_updated: mockHospital.lastUpdated,
  },
  resources: mockResources.map((r) => ({ ...r })),
  departments: mockDepartments,
  forecast: mockForecast,
  bottlenecks: mockBottlenecks.map((b) => ({ ...b, risk: b.risk as import("@/types/api").RiskLevel })),
  recommendations: mockRecommendations,
};

const SEED_FORECAST: ForecastResponse = {
  points: mockForecast,
  peak_demand: Math.max(...mockForecast.map((p) => p.forecast)),
  peak_time: "+8h",
  capacity_remaining: 2,
  risk: "HIGH",
  confidence: 0.924,
  factors: [
    { label: "Recent patient arrivals",    impact: "High impact",   weight: 88 },
    { label: "Historical hourly pattern",  impact: "Medium impact", weight: 64 },
    { label: "Scheduled procedures",       impact: "Medium impact", weight: 58 },
    { label: "Current occupancy baseline", impact: "High impact",   weight: 82 },
    { label: "Diagnostic demand (CT/Lab)", impact: "Low impact",    weight: 34 },
  ],
};

const SEED_BOTTLENECKS: BottlenecksResponse = {
  count: mockBottlenecks.length,
  bottlenecks: mockBottlenecks.map((b) => ({ ...b, risk: b.risk as import("@/types/api").RiskLevel })),
  timeline: [
    { time: "Now",  emergency: 88.0, ct: 91.0, ward: 87.0, icu: 74.0 },
    { time: "+2H",  emergency: 91.0, ct: 93.4, ward: 88.6, icu: 75.2 },
    { time: "+4H",  emergency: 94.0, ct: 95.8, ward: 90.2, icu: 76.4 },
    { time: "+6H",  emergency: 97.0, ct: 98.2, ward: 91.8, icu: 77.6 },
    { time: "+12H", emergency: 103.5, ct: 104.2, ward: 95.8, icu: 80.6 },
  ],
};

const SEED_RESOURCES: ResourcesResponse = {
  resources: mockResources.map((r) => ({ ...r })),
  underutilized: mockResources.filter((r) => r.utilization < 55),
  hospital_peak_forecast: mockHospital.predictedPeak,
};

const SEED_DEPENDENCIES: DependenciesResponse = {
  nodes: mockNodes,
  edges: mockEdges.map(([source, target, strength]) => ({ source, target, strength })),
};

const SEED_RECOMMENDATIONS: RecommendationsResponse = { recommendations: mockRecommendations };

// ── Generic async hook ────────────────────────────────────────────────────────

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  initialData: T | null = null,
): AsyncState<T> {
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const hasDataRef = useRef(initialData !== null);

  const run = useCallback(async () => {
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (mountedRef.current) {
        setData(result);
        hasDataRef.current = true;
        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    run();
    return () => { mountedRef.current = false; };
  }, [run]);

  return { data, loading, error, refresh: run };
}

// ── Backend connection status ─────────────────────────────────────────────────

export function useBackendStatus(pollMs = 15_000) {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const result = await checkBackendHealth();
      if (active) setOnline(result);
    };
    check();
    const id = setInterval(check, pollMs);
    return () => { active = false; clearInterval(id); };
  }, [pollMs]);

  return online;
}

// ── Per-endpoint hooks ────────────────────────────────────────────────────────

export function useDashboard(pollMs?: number): AsyncState<DashboardResponse> {
  const state = useAsync<DashboardResponse>(fetchDashboard, [], SEED_DASHBOARD);

  useEffect(() => {
    if (!pollMs) return;
    const id = setInterval(state.refresh, pollMs);
    return () => clearInterval(id);
  }, [pollMs, state.refresh]);

  return state;
}

export function useForecast(horizon = 8): AsyncState<ForecastResponse> {
  return useAsync<ForecastResponse>(() => fetchForecast(horizon), [horizon], SEED_FORECAST);
}

export function useBottlenecks(): AsyncState<BottlenecksResponse> {
  return useAsync<BottlenecksResponse>(fetchBottlenecks, [], SEED_BOTTLENECKS);
}

export function useResources(): AsyncState<ResourcesResponse> {
  return useAsync<ResourcesResponse>(fetchResources, [], SEED_RESOURCES);
}

export function useDependencies(nodeId?: string): AsyncState<DependenciesResponse> {
  return useAsync<DependenciesResponse>(() => fetchDependencies(nodeId), [nodeId], SEED_DEPENDENCIES);
}

// Fetch propagation for a specific node on demand (re-fetches when nodeId changes)
export function usePropagation(nodeId: string | null): AsyncState<DependenciesResponse> {
  return useAsync<DependenciesResponse>(
    () => (nodeId ? fetchDependencies(nodeId) : Promise.resolve({ nodes: [], edges: [] })),
    [nodeId],
    SEED_DEPENDENCIES,
  );
}

export function useRecommendations(pollMs = 3_600_000): AsyncState<RecommendationsResponse> {
  const state = useAsync<RecommendationsResponse>(fetchRecommendations, [], SEED_RECOMMENDATIONS);
  useEffect(() => {
    if (!pollMs) return;
    const id = setInterval(state.refresh, pollMs);
    return () => clearInterval(id);
  }, [pollMs, state.refresh]);
  return state;
}

// ── Procedures (auto-refresh every 1 h) ──────────────────────────────────────

export function useProcedureCapacity(pollMs = 3_600_000): AsyncState<ProcedureCapacityResponse> {
  const state = useAsync<ProcedureCapacityResponse>(fetchProcedureCapacity, []);
  useEffect(() => {
    if (!pollMs) return;
    const id = setInterval(state.refresh, pollMs);
    return () => clearInterval(id);
  }, [pollMs, state.refresh]);
  return state;
}

export function useProcedures(pollMs = 3_600_000): AsyncState<ApiProcedure[]> {
  const state = useAsync<ApiProcedure[]>(fetchProcedures, []);
  useEffect(() => {
    if (!pollMs) return;
    const id = setInterval(state.refresh, pollMs);
    return () => clearInterval(id);
  }, [pollMs, state.refresh]);
  return state;
}

export function useSchedulingConflicts(pollMs = 3_600_000): AsyncState<SchedulingConflict[]> {
  const state = useAsync<SchedulingConflict[]>(fetchSchedulingConflicts, []);
  useEffect(() => {
    if (!pollMs) return;
    const id = setInterval(state.refresh, pollMs);
    return () => clearInterval(id);
  }, [pollMs, state.refresh]);
  return state;
}

// ── Simulation (manual trigger) ───────────────────────────────────────────────

interface SimulateState {
  data: SimulateResponse | null;
  loading: boolean;
  error: string | null;
  run: (req: SimulateRequest) => Promise<void>;
}

export function useSimulate(): SimulateState {
  const [data, setData] = useState<SimulateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (req: SimulateRequest) => {
    setLoading(true);
    setError(null);
    try {
      const result = await postSimulate(req);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, run };
}

// ── Re-export for convenience ─────────────────────────────────────────────────

export { isBackendOnline };

// ── Create procedure (manual trigger) ────────────────────────────────────────

interface CreateProcedureState {
  loading: boolean;
  error: string | null;
  create: (req: import("@/services/api").CreateProcedureRequest) => Promise<ApiProcedure | null>;
}

export function useCreateProcedure(): CreateProcedureState {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (req: import("@/services/api").CreateProcedureRequest): Promise<ApiProcedure | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await postProcedure(req);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create procedure");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, create };
}
