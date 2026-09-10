import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IntroSplash } from "@/components/intro-splash";
import { fetchEmergencies, reportToEmergencyCase } from "@/lib/mongodb";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, BedDouble, Bell, BrainCircuit, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, ClipboardList, Clock3, Cpu, Download, FileBarChart, FileText, Gauge, GitBranch, HeartPulse, LayoutDashboard, Lightbulb, Loader2, Menu, Microscope, Moon, Navigation, Network, Play, Radio, RefreshCw, ScanLine, Search, Settings2, ShieldCheck, Siren, Sparkles, Stethoscope, Sun, TableProperties, TimerReset, TrendingDown, TrendingUp, TriangleAlert, UserRound, UsersRound, Workflow, X,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { HealthcareBackground } from "@/components/healthcare-background";
import { EmergencyResponseView } from "@/components/emergency-response-view";
import { ApiStatusBadge } from "@/components/api-status-badge";
import { CurrentDataUpload } from "@/components/current-data-upload";
import { api, bottlenecks, departments, forecast as mockForecast, hospital, networkEdges, networkNodes, recommendations, resources, simulatorDefaults } from "@/lib/mock-data";
import { useDataMode } from "@/lib/data-mode-context";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { useBackendStatus, useDashboard, useForecast, useBottlenecks, useDependencies, usePropagation, useSimulate, useResources, useRecommendations, useProcedures, useSchedulingConflicts, useCreateProcedure } from "@/hooks/useApi";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareCast AI — Hospital Capacity Intelligence" },
      { name: "description", content: "Predictive capacity intelligence for proactive hospital operations." },
      { property: "og:title", content: "CareCast AI — Hospital Capacity Intelligence" },
      { property: "og:description", content: "Predict hospital capacity problems before they happen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  component: CareCastApp,
});

type View = "Command Center" | "Emergency Response" | "Capacity Forecast" | "Bottlenecks" | "Dependency Network" | "Scenario Simulator" | "Resource Intelligence" | "Procedures & Scheduling" | "AI Recommendations" | "Reports";

const navItems: { label: View; icon: typeof LayoutDashboard }[] = [
  { label: "Command Center", icon: LayoutDashboard },
  { label: "Emergency Response", icon: Siren },
  { label: "Capacity Forecast", icon: Activity },
  { label: "Bottlenecks", icon: TriangleAlert },
  { label: "Dependency Network", icon: Network },
  { label: "Scenario Simulator", icon: Workflow },
  { label: "Resource Intelligence", icon: Gauge },
  { label: "Procedures & Scheduling", icon: ClipboardList },
  { label: "AI Recommendations", icon: Sparkles },
  { label: "Reports", icon: FileBarChart },
];

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function CareCastApp() {
  const [splash, setSplash] = useState(true);
  const [activeView, setActiveView] = useState<View>("Command Center");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [networkFocus, setNetworkFocus] = useState("ct");
  const [scenario, setScenario] = useState(simulatorDefaults);
  const [patientCases, setPatientCases] = useState<import("@/lib/mock-data").EmergencyCase[]>([]);
  const { theme, toggleTheme } = useTheme();
  const [locating, setLocating] = useState(false);
  const [locLabel, setLocLabel] = useState("");
  const backendOnline = useBackendStatus(15_000);

  const handleUseLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json() as { display_name?: string };
          setLocLabel(data.display_name ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } catch {
          setLocLabel(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const hideSplash = useCallback(() => setSplash(false), []);
  const clock = useClock();

  // Poll patient-reported emergencies every 10 seconds
  const refreshPatientCases = useCallback(async () => {
    try {
      const reports = await fetchEmergencies();
      setPatientCases(reports.map(reportToEmergencyCase));
    } catch { /* offline — localStorage fallback already handled in fetchEmergencies */ }
  }, []);

  useEffect(() => {
    refreshPatientCases();
    const id = setInterval(refreshPatientCases, 3_600_000);
    return () => clearInterval(id);
  }, [refreshPatientCases]);

  const handleSelect = useCallback((view: View) => {
    setActiveView(view);
    setMobileOpen(false);
  }, []);

  return (
    <>
      {splash && <IntroSplash onDone={hideSplash} />}
      <div className="min-h-screen bg-command text-foreground">
      <div className="flex min-h-screen">
        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
        {/* Mobile drawer */}
        <div className={cn(
          "fixed inset-y-0 left-0 z-50 w-[260px] flex-col border-r border-command-border bg-sidebar transition-transform duration-300 lg:hidden",
          mobileOpen ? "flex translate-x-0" : "-translate-x-full flex"
        )}>
          <SidebarContent activeView={activeView} onSelect={handleSelect} open={true} onToggle={() => setMobileOpen(false)} isMobile />
        </div>
        {/* Desktop sidebar */}
        <Sidebar activeView={activeView} onSelect={setActiveView} open={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />
        <div className="min-w-0 flex-1">
          <Topbar sidebarOpen={sidebarOpen} onMenu={() => setMobileOpen((v) => !v)} theme={theme} onToggleTheme={toggleTheme} clock={clock} onUseLocation={handleUseLocation} locating={locating} locLabel={locLabel} backendOnline={backendOnline} />
          <main className="relative min-h-[calc(100vh-68px)] px-4 py-5 sm:px-6 lg:px-8 overflow-hidden">
            <HealthcareBackground />
            <div className="relative z-10 mx-auto max-w-[1560px]">
              {activeView === "Command Center" && <CommandCenter onView={(view) => setActiveView(view)} />}
              {activeView === "Emergency Response" && (
                <EmergencyResponseView
                  patientReportedCases={patientCases}
                  onOpenSimulator={(surge) => {
                    setScenario((prev) => ({ ...prev, surge: surge ?? 80, emergency: 95, beds: 96, ct: 100 }));
                    setActiveView("Scenario Simulator");
                  }}
                  onOpenNetwork={() => {
                    setNetworkFocus("beds");
                    setActiveView("Dependency Network");
                  }}
                />
              )}
              {activeView === "Capacity Forecast" && <ForecastPage />}
              {activeView === "Bottlenecks" && <BottlenecksPage onNetwork={() => setActiveView("Dependency Network")} />}
              {activeView === "Dependency Network" && <NetworkPage focus={networkFocus} onFocus={setNetworkFocus} onRecommendations={() => setActiveView("AI Recommendations")} />}
              {activeView === "Scenario Simulator" && <SimulatorPage scenario={scenario} setScenario={setScenario} />}
              {activeView === "Resource Intelligence" && <ResourcePage />}
              {activeView === "Procedures & Scheduling" && <ProceduresPage />}
              {activeView === "AI Recommendations" && <RecommendationsPage onSimulator={() => setActiveView("Scenario Simulator")} />}
              {activeView === "Reports" && <ReportsPage />}
            </div>
          </main>
        </div>
      </div>
    </div>
    </>
  );
}

function SidebarContent({ activeView, onSelect, open, onToggle, isMobile = false }: { activeView: View; onSelect: (view: View) => void; open: boolean; onToggle: () => void; isMobile?: boolean }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className={cn("flex h-[68px] shrink-0 items-center border-b border-sidebar-border", open ? "px-5" : "justify-center px-2")}>
        {open ? (
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <img src="/care.png" alt="" className="size-8 shrink-0 object-contain" draggable={false} />
            <div className="min-w-0">
              <div className="text-[14px] font-extrabold tracking-[0.18em] text-foreground">CARECAST <span className="text-command-cyan">AI</span></div>
            </div>
            {isMobile && (
              <button onClick={onToggle} className="ml-auto shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground">
                <X size={16} />
              </button>
            )}
          </div>
        ) : (
          <img src="/care.png" alt="CareCast AI" className="size-8 object-contain" draggable={false} />
        )}
      </div>
      <div className={cn("px-3 pt-6", !open && "px-2")}>
        {open && <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Operations</div>}
        <nav className="space-y-1">
          {navItems.map(({ label, icon: Icon }) => {
            const isEmg = label === "Emergency Response";
            const isActive = activeView === label;
            return (
              <button
                key={label}
                title={open ? undefined : label}
                onClick={() => onSelect(label)}
                className={cn(
                  "group flex w-full items-center rounded-lg text-left text-[12px] font-medium transition-colors",
                  open ? "gap-3 px-3 py-2.5" : "justify-center px-2 py-3",
                  isActive
                    ? isEmg
                      ? "bg-command-red/15 text-command-red shadow-[inset_2px_0_0_var(--color-command-red)]"
                      : "bg-command-cyan/12 text-command-cyan shadow-[inset_2px_0_0_var(--color-command-cyan)]"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon size={17} strokeWidth={isActive ? 2.25 : 1.8} className={isEmg ? (isActive ? "animate-pulse text-command-red" : "text-command-red/80") : ""} />
                <span className={cn("whitespace-nowrap", !open && "sr-only")}>{label}</span>
                {label === "Emergency Response" && open && <span className="ml-auto rounded-full bg-command-red/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-command-red">LIVE</span>}
                {label === "Bottlenecks" && open && <span className="ml-auto rounded-full bg-command-red/15 px-1.5 py-0.5 font-mono text-[9px] text-command-red">3</span>}
              </button>
            );
          })}
        </nav>
      </div>
      <div className={cn("mt-auto border-t border-sidebar-border p-3", !open && "px-2")}>
        {open && <div className="mb-4 rounded-lg border border-command-green/20 bg-command-green/5 p-3"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-command-green"><span className="status-pulse size-1.5 rounded-full bg-command-green" />System status</div><div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground"><ShieldCheck size={14} className="text-command-green" /> AI engine operational</div><div className="mt-2 flex justify-between text-[9px] text-muted-foreground"><span>UPTIME</span><span className="mono-data text-foreground">99.98%</span></div></div>}
        <button className={cn("flex w-full items-center rounded-lg text-left hover:bg-sidebar-accent", open ? "gap-3 p-2" : "justify-center p-2")} title="Admin profile"><div className="grid size-8 shrink-0 place-items-center rounded-full border border-command-cyan/30 bg-command-cyan/10 text-xs font-bold text-command-cyan">MA</div>{open && <div className="min-w-0"><div className="truncate text-[11px] font-semibold text-foreground">M.ADITHYA</div><div className="text-[10px] text-muted-foreground">Admin</div></div>}</button>
        <a href="/patient" title="Patient Portal" className={cn("mt-2 flex w-full items-center rounded-lg border border-command-border/50 text-muted-foreground hover:border-command-cyan/40 hover:text-command-cyan", open ? "gap-2 px-3 py-2 text-[10px]" : "justify-center p-2")}><UserRound size={13} />{open && "Patient Portal"}</a>
        {!isMobile && <button onClick={onToggle} className="mt-3 hidden w-full items-center justify-center rounded-md border border-sidebar-border p-2 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground lg:flex" title={open ? "Collapse navigation" : "Expand navigation"}>{open ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}</button>}
      </div>
    </div>
  );
}

function Sidebar({ activeView, onSelect, open, onToggle }: { activeView: View; onSelect: (view: View) => void; open: boolean; onToggle: () => void }) {
  return (
    <aside className={cn("sticky top-0 hidden h-screen shrink-0 flex-col border-r border-command-border bg-sidebar transition-[width] duration-300 lg:flex", open ? "w-[254px]" : "w-[76px]")}>
      <SidebarContent activeView={activeView} onSelect={onSelect} open={open} onToggle={onToggle} />
    </aside>
  );
}


function Topbar({ onMenu, theme, onToggleTheme, clock, onUseLocation, locating, locLabel, backendOnline }: { sidebarOpen: boolean; onMenu: () => void; theme: string; onToggleTheme: () => void; clock: Date; onUseLocation: () => void; locating: boolean; locLabel: string; backendOnline: boolean | null }) {
  const timeStr = clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const dateStr = clock.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }).toUpperCase();
  const tzOffset = (() => { const o = -clock.getTimezoneOffset(); const h = String(Math.floor(Math.abs(o) / 60)).padStart(2, "0"); const m = String(Math.abs(o) % 60).padStart(2, "0"); return `UTC ${o >= 0 ? "+" : "-"}${h}:${m}`; })();
  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b-2 border-command-green bg-command/95 px-3 backdrop-blur-xl sm:px-6 lg:px-8 shadow-[0_4px_20px_color-mix(in_oklch,var(--command-green)_15%,transparent)]">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground lg:hidden" onClick={onMenu}><Menu size={18} /></Button>
        <div className="hidden size-8 shrink-0 items-center justify-center rounded-lg bg-command-cyan/10 text-command-cyan sm:flex"><HeartPulse size={18} /></div>
        <div className="min-w-0">
          <div className="truncate text-[12px] font-semibold text-foreground sm:text-[13px]">Healthcare Support</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            <span className="status-pulse size-1.5 shrink-0 rounded-full bg-command-green" />
            <span className="hidden sm:inline">System operational</span>
            <span className="sm:hidden">Operational</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-4">
        <ApiStatusBadge online={backendOnline} />
        <div className="text-right">
          <div className="mono-data text-[11px] font-semibold text-foreground">{timeStr}</div>
          <div className="mt-0.5 hidden text-[9px] text-muted-foreground sm:block">{dateStr} · {tzOffset}</div>
        </div>
        <button
          onClick={onUseLocation}
          disabled={locating}
          title={locLabel || "Use my current location"}
          className="flex items-center gap-1.5 rounded-lg border border-command-cyan/40 bg-command-cyan/10 px-3 py-1.5 text-[10px] font-semibold text-command-cyan transition-all hover:bg-command-cyan/20 disabled:opacity-50"
        >
          {locating ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
          <span className="hidden sm:inline max-w-[160px] truncate">{locating ? "Locating…" : locLabel || "Use Location"}</span>
        </button>
        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={onToggleTheme} title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </Button>
      </div>
    </header>
  );
}

function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle: string; action?: React.ReactNode }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-command-cyan"><span className="size-1.5 rounded-full bg-command-cyan" />{eyebrow ?? "Live intelligence"}</div><h1 className="text-2xl font-bold tracking-[-0.025em] text-foreground sm:text-3xl">{title}</h1><p className="mt-1.5 text-[12px] text-muted-foreground">{subtitle}</p></div>{action}</div>;
}

function Panel({ children, className, title, meta, action }: { children: React.ReactNode; className?: string; title?: string; meta?: string; action?: React.ReactNode }) {
  return <section className={cn("command-panel rounded-xl", className)}>{title && <div className="flex items-center justify-between border-b border-command-border/70 px-4 py-3.5"><div><h2 className="text-[12px] font-semibold tracking-wide text-foreground">{title}</h2>{meta && <p className="mt-0.5 text-[10px] text-muted-foreground">{meta}</p>}</div>{action}</div>}{children}</section>;
}

function RiskBadge({ risk }: { risk: string }) {
  const tone = risk === "CRITICAL" ? "bg-command-red/12 text-command-red border-command-red/25" : risk === "HIGH" ? "bg-command-amber/12 text-command-amber border-command-amber/25" : risk === "MODERATE" ? "bg-command-cyan/10 text-command-cyan border-command-cyan/20" : "bg-command-green/10 text-command-green border-command-green/20";
  return <span className={cn("inline-flex rounded border px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.12em]", tone)}>{risk}</span>;
}

function MiniSparkline({ values, tone = "cyan" }: { values: number[]; tone?: "cyan" | "red" | "green" }) {
  const color = tone === "red" ? "var(--color-command-red)" : tone === "green" ? "var(--color-command-green)" : "var(--color-command-cyan)";
  const max = Math.max(...values); const min = Math.min(...values); const range = Math.max(1, max - min);
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${30 - ((value - min) / range) * 25}`).join(" ");
  return <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-8 w-full"><polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><line x1="0" y1="31" x2="100" y2="31" stroke="currentColor" className="text-command-border" strokeWidth="0.6" /></svg>;
}

type DashData = import("@/types/api").DashboardResponse;

function CommandCenter({ onView }: { onView: (view: View) => void }) {
  const [range, setRange] = useState("6H");
  const { data: pastData, loading, error, refresh } = useDashboard(3_600_000);
  const { dataMode, setDataMode, currentDashboard, datasetMeta } = useDataMode();

  // In current mode, use uploaded dashboard; in past mode, use API/mock
  const d = dataMode === "current" && currentDashboard ? currentDashboard : pastData;
  const lastUpdated = d?.hospital.last_updated ?? hospital.lastUpdated;
  const isCurrentMode = dataMode === "current";
  const hasCurrentData = isCurrentMode && currentDashboard != null;

  return <div className="pb-10">
    <PageHeader eyebrow="Command Center / Live" title="Hospital Command Center" subtitle="Predictive capacity intelligence for proactive hospital operations" action={
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2 rounded-full border border-command-red/25 bg-command-red/10 px-3 py-1.5 text-[10px] font-semibold tracking-[0.14em] text-command-red"><span className="status-pulse size-1.5 rounded-full bg-command-red" />LIVE</span>
        <span className="hidden text-[10px] text-muted-foreground sm:inline">Updated {lastUpdated}</span>
        {!isCurrentMode && <button onClick={refresh} title="Refresh" className="rounded p-1 text-muted-foreground hover:text-command-cyan"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /></button>}
      </div>
    } />

    {/* ── Data Mode Toggle ── */}
    <DataModeToggle dataMode={dataMode} setDataMode={setDataMode} datasetMeta={datasetMeta} />

    {error && !isCurrentMode && <div className="mb-4 flex items-center gap-2 rounded-lg border border-command-amber/30 bg-command-amber/8 px-4 py-2.5 text-[11px] text-command-amber"><AlertTriangle size={14} /> Backend unavailable — showing cached data. <button onClick={refresh} className="ml-auto underline">Retry</button></div>}

    {/* ── Current Data: empty state or upload UI ── */}
    {isCurrentMode && !hasCurrentData && (
      <CurrentDataEmptyOrUpload />
    )}

    {/* ── Dashboard content (past mode always, current mode only after analysis) ── */}
    {(!isCurrentMode || hasCurrentData) && (
      <div className="animate-fade-in">
        <div className="grid gap-5 xl:grid-cols-[0.88fr_1.55fr]">
          <CapacityHero d={d} loading={loading && !isCurrentMode} />
          <CriticalAlert d={d} loading={loading && !isCurrentMode} onEmergency={() => onView("Emergency Response")} onImpact={() => onView("Dependency Network")} onSimulate={() => onView("Scenario Simulator")} />
        </div>
        <Panel className="mt-5 overflow-hidden" title="Capacity Forecast" meta="AI prediction of hospital resource pressure" action={<div className="flex rounded-md border border-command-border bg-command/50 p-0.5">{["6H", "12H", "24H", "48H"].map((item) => <button key={item} onClick={() => setRange(item)} className={cn("rounded px-2.5 py-1 text-[9px] font-semibold", range === item ? "bg-command-cyan/15 text-command-cyan" : "text-muted-foreground hover:text-foreground")}>{item}</button>)}</div>}><ForecastChart compact range={range} {...(d?.forecast ? { forecastPoints: d.forecast } : {})} /></Panel>
        <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.85fr]"><ResourceStrip d={d} loading={loading && !isCurrentMode} /><PressureMap d={d} loading={loading && !isCurrentMode} /></div>
        <InsightCard d={d} loading={loading && !isCurrentMode} onSimulator={() => onView("Scenario Simulator")} />
      </div>
    )}
  </div>;
}

// ── Data Mode Toggle ─────────────────────────────────────────────────────────

function DataModeToggle({ dataMode, setDataMode, datasetMeta }: {
  dataMode: import("@/lib/data-mode-context").DataMode;
  setDataMode: (m: import("@/lib/data-mode-context").DataMode) => void;
  datasetMeta: import("@/lib/data-mode-context").DatasetMeta | null;
}) {
  const { setDatasetMeta, setCurrentDashboard } = useDataMode();
  return (
    <div className="mb-5 flex flex-wrap items-center gap-4">
      {/* Segmented toggle */}
      <div className="flex rounded-lg border border-command-border bg-command/50 p-0.5">
        <button
          onClick={() => setDataMode("past")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-[10px] font-semibold tracking-[0.12em] transition-all",
            dataMode === "past"
              ? "bg-command-cyan/15 text-command-cyan shadow-[inset_0_0_0_1px_var(--color-command-cyan)]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Clock3 size={12} />
          PAST DATA
        </button>
        <button
          onClick={() => setDataMode("current")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-[10px] font-semibold tracking-[0.12em] transition-all",
            dataMode === "current"
              ? "bg-command-green/15 text-command-green shadow-[inset_0_0_0_1px_var(--color-command-green)]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Radio size={12} className={dataMode === "current" ? "animate-pulse" : ""} />
          CURRENT DATA
        </button>
      </div>

      {/* Status label + remove button */}
      <div className="flex items-center gap-2">
        {dataMode === "past" ? (
          <span className="text-[10px] text-muted-foreground">Historical Dataset Mode</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">Uploaded Hospital Data Mode</span>
        )}
        {dataMode === "current" && datasetMeta?.analysisStatus === "done" && (
          <Button
            size="sm"
            variant="outline"
            className="border-command-red/40 text-command-red hover:bg-command-red/10 text-[10px] h-7 px-2"
            onClick={() => { setDatasetMeta(null); setCurrentDashboard(null); }}
          >
            <X size={12} /> Remove Data
          </Button>
        )}
      </div>

      {/* Source indicator */}
      <div className="ml-auto hidden items-center gap-2 rounded-md border border-command-border/60 bg-command/30 px-3 py-1.5 text-[9px] text-muted-foreground sm:flex">
        <span className={cn("size-1.5 rounded-full", dataMode === "past" ? "bg-command-cyan" : "bg-command-green")} />
        {dataMode === "past" ? (
          "Source: CareCast Historical Dataset"
        ) : datasetMeta?.analysisStatus === "done" ? (
          <span>
            Source: <span className="text-foreground">{datasetMeta.filename}</span>
            {" · "}{datasetMeta.recordCount.toLocaleString()} records
            {" · "}<span className="text-command-green">Analyzed {datasetMeta.uploadedAt}</span>
          </span>
        ) : (
          "Source: Uploaded Hospital Dataset"
        )}
      </div>
    </div>
  );
}

// ── Current Data empty / upload state ────────────────────────────────────────

function CurrentDataEmptyOrUpload() {
  return (
    <div>
      <div className="mb-4 rounded-xl border border-command-border bg-command/30 p-6 text-center">
        <div className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-command-green/10 text-command-green">
          <Radio size={22} />
        </div>
        <div className="text-[14px] font-semibold text-foreground">Upload Current Hospital Data</div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Upload the latest hospital operational data to generate real-time capacity intelligence.
        </p>
      </div>
      <CurrentDataUpload />
    </div>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-command-border/40", className)} />;
}

function CapacityHero({ d, loading }: { d: DashData | null; loading: boolean }) {
  const score = d?.hospital.capacity_score ?? hospital.capacityScore;
  const utilization = d?.hospital.current_utilization ?? hospital.currentUtilization;
  const peak = d?.hospital.predicted_peak ?? hospital.predictedPeak;
  const ttc = d?.hospital.time_to_critical ?? hospital.timeToCritical;
  const risk = d?.hospital.risk ?? "MODERATE";
  const circumference = 307.8;
  const offset = circumference - (score / 100) * circumference;
  const riskTone = risk === "CRITICAL" ? "border-command-red/25 bg-command-red/10 text-command-red" : risk === "HIGH" ? "border-command-amber/25 bg-command-amber/10 text-command-amber" : risk === "MODERATE" ? "border-command-amber/25 bg-command-amber/10 text-command-amber" : "border-command-green/25 bg-command-green/10 text-command-green";
  const dotColor = risk === "CRITICAL" ? "bg-command-red" : risk === "HIGH" ? "bg-command-amber" : risk === "MODERATE" ? "bg-command-amber" : "bg-command-green";
  return <Panel className="relative min-h-[286px] overflow-hidden p-5 sm:p-6">
    <div className="absolute -right-20 -top-20 size-64 rounded-full bg-command-cyan/8 blur-3xl" />
    <div className="relative flex h-full flex-col justify-between">
      <div className="flex items-start justify-between">
        <div><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-command-cyan"><Gauge size={15} /> Hospital capacity health</div><div className="mt-2 text-[11px] text-muted-foreground">Current system-wide utilization score</div></div>
        <div className={cn("flex items-center gap-1.5 rounded border px-2 py-1 text-[9px] font-semibold tracking-[0.1em]", riskTone)}><span className={cn("size-1.5 rounded-full", dotColor)} /> {loading ? "—" : risk}</div>
      </div>
      <div className="mt-5 flex items-center gap-6">
        <div className="relative size-36 shrink-0">
          {loading ? <SkeletonBlock className="size-36 rounded-full" /> : <>
            <svg viewBox="0 0 120 120" className="size-full -rotate-90">
              <circle cx="60" cy="60" r="49" fill="none" stroke="var(--color-command-border)" strokeWidth="7" />
              <circle cx="60" cy="60" r="49" fill="none" stroke="var(--color-command-cyan)" strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="drop-shadow-[0_0_9px_var(--color-command-cyan)]" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center"><div><div className="mono-data text-4xl font-semibold text-foreground">{score}</div><div className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">of 100</div></div></div>
          </>}
        </div>
        <div className="min-w-0">
          <div className="text-[12px] leading-5 text-muted-foreground">Capacity pressure is increasing. AI forecasts elevated emergency demand within the next 6 hours.</div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {loading ? <><SkeletonBlock className="h-8" /><SkeletonBlock className="h-8" /><SkeletonBlock className="h-8" /></> : <>
              <Metric label="Current" value={`${utilization}%`} tone="cyan" />
              <Metric label="Predicted peak" value={`${peak}%`} tone="amber" />
              <Metric label="Time to critical" value={ttc} tone="red" />
            </>}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-command-border/70 pt-3 text-[9px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><RefreshCw size={11} /> Forecast recalibrated 1h ago</span>
        <span className="mono-data text-command-cyan">CONFIDENCE 92.4%</span>
      </div>
    </div>
  </Panel>;
}

function CriticalAlert({ d, loading, onEmergency, onImpact, onSimulate }: { d: DashData | null; loading: boolean; onEmergency?: () => void; onImpact: () => void; onSimulate: () => void }) {
  const top = d?.bottlenecks?.[0] ?? bottlenecks[0];
  const current = top?.current ?? 88;
  const forecast = top?.peak ?? 97;
  const timeToOverload = top?.time ?? "2h 47m";
  const resourceName = top?.resource ?? "Emergency Bed Capacity";
  const impact = top?.impact ?? "Emergency → General Ward → ICU";
  return <Panel className="relative overflow-hidden border-command-red/35 bg-command-red/[0.04] p-5 sm:p-6"><div className="absolute inset-y-0 left-0 w-1 bg-command-red shadow-[0_0_20px_var(--color-command-red)]" /><div className="absolute -right-24 -top-24 size-64 rounded-full bg-command-red/10 blur-3xl" /><div className="relative"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.17em] text-command-red"><span className="status-pulse grid size-5 place-items-center rounded-full bg-command-red/15"><AlertTriangle size={12} /></span> Critical capacity alert</div><span className="mono-data text-[10px] text-muted-foreground">ALERT · CC-0247</span></div>
    {loading ? <div className="mt-5 space-y-3"><SkeletonBlock className="h-7 w-2/3" /><SkeletonBlock className="h-4 w-full" /><SkeletonBlock className="h-20 w-full" /></div> : <>
      <div className="mt-5 flex items-end justify-between gap-4"><div><h2 className="text-xl font-semibold text-foreground">{resourceName}</h2><p className="mt-1 text-[11px] text-muted-foreground">Emergency demand is projected to exceed available bed capacity.</p></div><div className="text-right"><div className="mono-data text-3xl font-semibold text-command-red">{forecast}%</div><div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">forecast utilization</div></div></div>
      <div className="mt-5 rounded-lg border border-command-red/20 bg-command/55 p-3"><div className="flex items-center justify-between text-[9px] uppercase tracking-[0.14em] text-muted-foreground"><span>Now <b className="ml-1 font-mono text-foreground">{current}%</b></span><span>+1h <b className="ml-1 font-mono text-foreground">{Math.round(current + (forecast - current) * 0.33)}%</b></span><span>+2h <b className="ml-1 font-mono text-command-red">{forecast}%</b></span><span>+3h <b className="ml-1 font-mono text-command-red">{Math.min(115, Math.round(forecast * 1.04))}%</b></span></div><div className="relative mt-3 h-8"><div className="absolute left-0 right-0 top-3 h-px bg-command-border" /><div className="absolute left-[66%] right-0 top-0 border-t border-dashed border-command-red/70" /><span className="absolute left-[66%] top-[-5px] h-4 w-px bg-command-red" /><div className="absolute left-[68%] top-1 flex items-center gap-1.5 text-[8px] font-bold text-command-red"><span className="size-1.5 rounded-full bg-command-red" /> overload predicted</div><div className="absolute left-0 top-[7px] size-3 rounded-full border-2 border-command-cyan bg-command" /><div className="absolute left-[66%] top-[5px] size-4 rounded-full border-2 border-command-red bg-command-red/25 shadow-[0_0_12px_var(--color-command-red)]" /></div></div>
      <div className="mt-5 grid grid-cols-[1fr_auto] gap-4"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-semibold text-muted-foreground"><GitBranch size={13} className="text-command-red" /> Impact path</div><div className="flex items-center gap-2 text-[11px] font-medium text-foreground">{impact.split(" → ").map((seg, i, arr) => <span key={seg} className="flex items-center gap-2">{seg}{i < arr.length - 1 && <ArrowRight size={13} className="text-command-red" />}</span>)}</div><div className="mt-3 flex items-center gap-2 text-[10px] text-command-amber"><Lightbulb size={13} /> Prepare 12 additional beds before demand peaks.</div></div><div className="text-right"><div className="text-[9px] uppercase tracking-[0.13em] text-muted-foreground">Overload in</div><div className="mono-data mt-1 text-xl font-semibold text-command-red">{timeToOverload}</div></div></div>
    </>}
    <div className="mt-5 flex flex-wrap gap-2">{onEmergency && <Button size="sm" className="bg-command-red text-white hover:bg-command-red/90 text-[10px] font-bold" onClick={onEmergency}><Siren size={13} className="mr-1.5 animate-pulse" /> Emergency Network</Button>}<Button size="sm" variant="outline" className="border-command-border bg-command/40 text-[10px]" onClick={onImpact}><Network size={14} /> View impact</Button><Button size="sm" variant="outline" className="border-command-border text-[10px]" onClick={onSimulate}><Play size={13} /> Simulate response</Button></div></div></Panel>;
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "cyan" | "amber" | "red" | "green" }) { return <div><div className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div><div className={cn("mono-data mt-1 text-[15px] font-semibold", tone === "cyan" ? "text-command-cyan" : tone === "amber" ? "text-command-amber" : tone === "green" ? "text-command-green" : "text-command-red")}>{value}</div></div>; }

function ForecastChart({ compact = false, range = "6H", forecastPoints }: { compact?: boolean; range?: string; forecastPoints?: import("@/types/api").ApiForecastPoint[] }) {
  const data = useMemo(() => (forecastPoints ?? api.getCommandCenter().forecast).map((point) => ({ ...point, highBand: point.high, lowBand: point.low })), [forecastPoints]);
  return <div className={cn("w-full px-2 pb-3 pt-4", compact ? "h-[260px]" : "h-[390px]")}><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}><defs><linearGradient id="confidence" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-command-cyan)" stopOpacity="0.16" /><stop offset="100%" stopColor="var(--color-command-cyan)" stopOpacity="0" /></linearGradient><linearGradient id="forecast" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-command-cyan)" stopOpacity="0.2" /><stop offset="100%" stopColor="var(--color-command-cyan)" stopOpacity="0" /></linearGradient></defs><CartesianGrid stroke="var(--color-command-border)" strokeDasharray="2 5" vertical={false} /><XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} /><YAxis domain={[50, 110]} axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} tickFormatter={(value) => `${value}%`} /><Tooltip content={<ForecastTooltip />} /><Area type="monotone" dataKey="highBand" stroke="none" fill="url(#confidence)" /><Area type="monotone" dataKey="lowBand" stroke="none" fill="var(--color-command)" /><Area type="monotone" dataKey="forecast" stroke="var(--color-command-cyan)" strokeWidth={2.5} fill="url(#forecast)" dot={{ r: 3, fill: "var(--color-command-cyan)", strokeWidth: 0 }} /><Line type="monotone" dataKey="actual" stroke="var(--color-command-teal)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--color-command-teal)", strokeWidth: 0 }} connectNulls={false} /><ReferenceLine y={90} stroke="var(--color-command-amber)" strokeDasharray="4 4" label={{ value: "SAFE THRESHOLD", position: "insideTopRight", fill: "var(--color-command-amber)", fontSize: 9 }} /><ReferenceLine y={100} stroke="var(--color-command-red)" strokeDasharray="4 4" label={{ value: "CRITICAL", position: "insideTopRight", fill: "var(--color-command-red)", fontSize: 9 }} /></AreaChart></ResponsiveContainer><div className="mt-0 flex flex-wrap items-center gap-4 px-3 text-[9px] text-muted-foreground"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-command-teal" /> Actual utilization</span><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-command-cyan" /> AI forecast</span><span className="flex items-center gap-1.5"><span className="h-px w-3 border-t border-dashed border-command-amber" /> Safe threshold</span><span className="ml-auto hidden text-command-cyan sm:inline">{range} HORIZON · 92.4% CONFIDENCE</span></div></div>;
}

function ForecastTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string }[]; label?: string }) { if (!active || !payload?.length) return null; return <div className="rounded-lg border border-command-border bg-command-raised/95 p-3 shadow-xl"><div className="mb-2 text-[10px] font-semibold text-foreground">{label} · Hospital utilization</div><div className="space-y-1 text-[10px] text-muted-foreground"><div className="flex justify-between gap-6"><span>Actual</span><span className="mono-data text-command-teal">{payload.find((item) => item.dataKey === "actual")?.value ?? "—"}%</span></div><div className="flex justify-between gap-6"><span>AI forecast</span><span className="mono-data text-command-cyan">{payload.find((item) => item.dataKey === "forecast")?.value}%</span></div><div className="flex justify-between gap-6"><span>Capacity remaining</span><span className="mono-data text-foreground">{100 - (payload.find((item) => item.dataKey === "forecast")?.value ?? 0)}%</span></div></div></div>; }

function ResourceStrip({ d, loading }: { d: DashData | null; loading: boolean }) {
  const liveResources = d?.resources ?? resources;
  return <Panel title="Resource intelligence" meta="Current utilization across critical hospital resources" action={<Button variant="ghost" size="sm" className="text-[10px] text-command-cyan">View all <ArrowRight size={13} /></Button>}>
    <div className="grid grid-cols-2 divide-x divide-y divide-command-border/60 sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-6">
      {loading && !d ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="p-3.5 space-y-2"><SkeletonBlock className="h-7 w-7 rounded-md" /><SkeletonBlock className="mt-3 h-4 w-3/4" /><SkeletonBlock className="mt-2 h-6 w-1/2" /><SkeletonBlock className="mt-2 h-8 w-full" /></div>) :
        liveResources.map((resource) => <div key={resource.name} className="group p-3.5 transition-colors hover:bg-command-cyan/5"><div className="flex items-center justify-between"><ResourceIcon icon={resource.icon ?? ""} /><RiskBadge risk={resource.risk} /></div><div className="mt-3 truncate text-[11px] font-semibold text-foreground">{resource.name}</div><div className="mt-2 flex items-end justify-between"><span className="mono-data text-xl font-semibold text-foreground">{resource.utilization}%</span><span className={cn("flex items-center text-[9px]", resource.trend.startsWith("-") ? "text-command-green" : "text-command-red")}>{resource.trend.startsWith("-") ? <TrendingDown size={11} /> : <TrendingUp size={11} />}{resource.trend}</span></div><div className="mt-2"><MiniSparkline values={resource.sparkline} tone={resource.risk === "CRITICAL" ? "red" : resource.risk === "LOW" ? "green" : "cyan"} /></div><div className="mt-1 text-[9px] text-muted-foreground">{resource.capacity}</div></div>)
      }
    </div>
  </Panel>;
}

function ResourceIcon({ icon }: { icon: string }) { const Icon = icon === "bed" ? BedDouble : icon === "ct" ? ScanLine : icon === "lab" ? Microscope : icon === "icu" ? HeartPulse : icon === "mri" ? CircleHelp : Cpu; return <div className="grid size-7 place-items-center rounded-md bg-command-cyan/10 text-command-cyan"><Icon size={15} /></div>; }

function PressureMap({ d, loading }: { d: DashData | null; loading: boolean }) {
  const rawDepts = d?.departments ?? departments;
  // Deduplicate by department name — keep the highest utilization entry
  const liveDepts = useMemo(() => {
    const map = new Map<string, typeof rawDepts[0]>();
    for (const dept of rawDepts) {
      const existing = map.get(dept.name);
      if (!existing || dept.utilization > existing.utilization) map.set(dept.name, dept);
    }
    return Array.from(map.values());
  }, [rawDepts]);
  return <Panel title="Department pressure" meta="Click a department to inspect its risk profile" action={<div className="flex items-center gap-2 text-[9px] text-muted-foreground"><span className="size-1.5 rounded-full bg-command-red" /> Critical</div>}>
    <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
      {loading && !d ? Array.from({ length: 8 }).map((_, i) => <SkeletonBlock key={i} className="h-20 rounded-lg" />) :
        liveDepts.map((department) => <button key={department.name} className="rounded-lg border border-command-border/70 bg-command/35 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-command-cyan/40"><div className="flex items-start justify-between gap-2"><span className="text-[10px] font-medium text-foreground">{department.name}</span><span className={cn("size-1.5 shrink-0 rounded-full", department.risk === "CRITICAL" ? "bg-command-red" : department.risk === "HIGH" ? "bg-command-amber" : department.risk === "LOW" ? "bg-command-green" : "bg-command-cyan")} /></div><div className="mt-3 flex items-baseline justify-between"><span className="mono-data text-lg font-semibold text-foreground">{department.utilization}%</span><span className="text-[9px] text-muted-foreground">{department.trend}</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-command-border"><div className={cn("h-full rounded-full", department.risk === "CRITICAL" ? "bg-command-red" : department.risk === "HIGH" ? "bg-command-amber" : "bg-command-cyan")} style={{ width: `${department.utilization}%` }} /></div></button>)
      }
    </div>
  </Panel>;
}

function InsightExplanationModal({ rec, bottleneck, onClose }: {
  rec: typeof recommendations[0] | undefined;
  bottleneck: { resource?: string; time?: string; risk?: string; impact?: string } | undefined;
  onClose: () => void;
}) {
  const signals = [
    { label: "Recent patient arrivals",    weight: 88, impact: "High" },
    { label: "Historical hourly pattern",  weight: 64, impact: "Medium" },
    { label: "Scheduled procedures",       weight: 58, impact: "Medium" },
    { label: "Current occupancy baseline", weight: 82, impact: "High" },
    { label: "Diagnostic demand (CT/Lab)", weight: 34, impact: "Low" },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border border-command-cyan/30 bg-command shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-command-border bg-command px-5 py-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.17em] text-command-cyan">
            <Sparkles size={14} /> AI Insight Explanation
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"><X size={15} /></button>
        </div>

        <div className="space-y-5 p-5">
          {/* Insight text */}
          <div className="rounded-lg border border-command-cyan/20 bg-command-cyan/5 p-4">
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-command-cyan mb-2">AI Assessment</div>
            <p className="text-[12px] leading-6 text-foreground">
              {rec?.reason ?? "Emergency arrivals are increasing 18% faster than the normal hourly pattern. Bed utilization is expected to reach 95% within approximately 3 hours."}
            </p>
          </div>

          {/* Bottleneck details */}
          {bottleneck && (
            <div>
              <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Primary Bottleneck</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Resource",   value: bottleneck.resource ?? "Emergency Beds", tone: "red" },
                  { label: "Time",       value: bottleneck.time ?? "2h 47m",             tone: "amber" },
                  { label: "Risk Level", value: bottleneck.risk ?? "HIGH",               tone: "red" },
                  { label: "Impact",     value: bottleneck.impact ?? "Emergency → Ward → ICU", tone: "cyan" },
                ].map((row) => (
                  <div key={row.label} className="rounded-lg border border-command-border bg-command/40 px-3 py-2">
                    <div className="text-[9px] text-muted-foreground">{row.label}</div>
                    <div className={cn("mt-1 text-[11px] font-semibold",
                      row.tone === "red" ? "text-command-red" : row.tone === "amber" ? "text-command-amber" : "text-command-cyan"
                    )}>{row.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signal weights */}
          <div>
            <div className="mb-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Contributing Signals</div>
            <div className="space-y-3">
              {signals.map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-foreground">{s.label}</span>
                    <span className={cn("font-semibold", s.impact === "High" ? "text-command-red" : s.impact === "Medium" ? "text-command-amber" : "text-muted-foreground")}>{s.impact} · {s.weight}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-command-border">
                    <div className={cn("h-full rounded-full transition-all duration-700", s.impact === "High" ? "bg-command-red" : s.impact === "Medium" ? "bg-command-amber" : "bg-command-cyan/50")} style={{ width: `${s.weight}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended action */}
          <div className="rounded-lg border border-command-amber/25 bg-command-amber/5 p-4">
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-command-amber mb-2">Recommended Action</div>
            <p className="text-[11px] leading-5 text-foreground">{rec?.title ?? "Prepare 12 additional emergency beds and redistribute non-urgent diagnostic procedures to reduce peak congestion."}</p>
            {rec?.improvement && <div className="mt-2 text-[10px] font-mono text-command-green">{rec.improvement} expected improvement</div>}
          </div>

          {/* Model info */}
          <div className="flex items-center justify-between rounded-lg border border-command-border bg-command/30 px-4 py-2.5 text-[9px] text-muted-foreground">
            <span>Model: RandomForest + Live Data</span>
            <span className="text-command-cyan">Confidence: 92.4%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ d, loading, onSimulator }: { d: DashData | null; loading: boolean; onSimulator: () => void }) {
  const rec = d?.recommendations?.[0] ?? recommendations[0];
  const topBottleneck = d?.bottlenecks?.[0];
  const [showExplanation, setShowExplanation] = useState(false);
  return <>
    {showExplanation && <InsightExplanationModal rec={rec} bottleneck={topBottleneck} onClose={() => setShowExplanation(false)} />}
    <div className="mt-5 overflow-hidden rounded-xl border border-command-cyan/25 bg-command-cyan/[0.055] p-5 shadow-[0_0_40px_oklch(0.77_0.15_192/5%)] sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:border-command-cyan/50 hover:shadow-[0_12px_40px_color-mix(in_oklch,var(--command-cyan)_15%,transparent)]">
      <div className="flex flex-col justify-between gap-5 md:flex-row">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.17em] text-command-cyan"><Sparkles size={14} /> AI operational insight</div>
          {loading && !d ? <div className="mt-3 space-y-2"><SkeletonBlock className="h-5 w-full" /><SkeletonBlock className="h-5 w-4/5" /></div> :
            <p className="mt-3 text-[15px] leading-7 text-foreground">{rec?.reason ?? "Emergency arrivals are increasing 18% faster than the normal hourly pattern. Bed utilization is expected to reach 95% within approximately 3 hours."}</p>
          }
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Metric label="Primary bottleneck" value={topBottleneck?.resource ?? "Emergency beds"} tone="red" />
            <Metric label="Predicted time" value={topBottleneck?.time ?? "2h 47m"} tone="amber" />
            <Metric label="Priority" value={rec?.priority ?? "Preventive"} tone="cyan" />
          </div>
        </div>
        <div className="flex shrink-0 flex-col justify-end gap-2 sm:flex-row md:flex-col">
          <Button size="sm" variant="outline" className="border-command-border text-[10px]" onClick={() => setShowExplanation(true)}><CircleHelp size={13} /> View explanation</Button>
          <Button size="sm" className="bg-command-cyan text-primary-foreground hover:bg-command-cyan/90" onClick={onSimulator}><Workflow size={13} /> Open simulator</Button>
        </div>
      </div>
    </div>
  </>;
}

function ForecastPage() {
  const horizon = 8;
  const { data, loading, error, refresh } = useForecast(horizon);

  const pts         = data?.points         ?? mockForecast;
  const peakDemand  = data?.peak_demand    ?? Math.max(...mockForecast.map((p) => p.forecast));
  const peakTime    = data?.peak_time      ?? "+8h";
  const confidence  = data?.confidence     ?? 0.924;
  const risk        = data?.risk           ?? "HIGH";
  const factors     = data?.factors        ?? [];
  const capRemain   = data?.capacity_remaining ?? Math.max(0, 100 - peakDemand);

  const horizonLabel = "8H";

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Predict / Capacity model"
        title="AI Capacity Forecast"
        subtitle="Predict future demand and resource utilization across the hospital"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-command-border text-[10px]" onClick={refresh} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
            <Button size="sm" className="bg-command-cyan text-primary-foreground text-[10px]">
              <Download size={13} /> Export
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-command-amber/30 bg-command-amber/8 px-4 py-2.5 text-[11px] text-command-amber">
          <AlertTriangle size={14} /> Backend unavailable — showing cached forecast.
          <button onClick={refresh} className="ml-auto underline">Retry</button>
        </div>
      )}

<div className="grid gap-5 lg:grid-cols-[1fr_290px]">
        <Panel
          title="Hospital utilization forecast"
          meta="Historical utilization, AI forecast, and confidence interval"
          className="overflow-hidden"
        >
          {loading && !data ? (
            <div className="flex h-[390px] items-center justify-center gap-2 text-[11px] text-muted-foreground">
              <Loader2 size={16} className="animate-spin" /> Loading forecast data…
            </div>
          ) : (
            <ForecastChart forecastPoints={pts} range={horizonLabel} />
          )}
        </Panel>
        <ForecastFactors factors={factors} loading={loading && !data} />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <StatCard
          icon={TrendingUp}
          label="Peak predicted demand"
          value={loading && !data ? "—" : `${peakDemand}%`}
          detail={loading && !data ? "" : `at ${peakTime}`}
          tone="red"
        />
        <StatCard
          icon={Clock3}
          label="Model confidence"
          value={loading && !data ? "—" : `${Math.round(confidence * 100)}%`}
          detail="Based on live dataset"
          tone="green"
        />
        <StatCard
          icon={ShieldCheck}
          label="Capacity remaining"
          value={loading && !data ? "—" : `${capRemain}%`}
          detail={`Risk level: ${risk}`}
          tone={risk === "CRITICAL" || risk === "HIGH" ? "red" : risk === "MODERATE" ? "amber" : "green"}
        />
      </div>
    </div>
  );
}

function ForecastFactors({ factors, loading }: { factors: import("@/types/api").ApiForecastFactor[]; loading: boolean }) {
  const fallback = [
    { label: "Recent patient arrivals",    impact: "High impact",   weight: 88 },
    { label: "Historical hourly pattern",  impact: "Medium impact", weight: 64 },
    { label: "Scheduled procedures",       impact: "Medium impact", weight: 58 },
    { label: "Current occupancy baseline", impact: "High impact",   weight: 82 },
    { label: "Diagnostic demand (CT/Lab)", impact: "Low impact",    weight: 34 },
  ];
  const items = factors.length > 0 ? factors : fallback;
  return (
    <Panel title="Why this forecast?" meta="Signals weighted by the AI engine">
      <div className="space-y-4 p-4">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <SkeletonBlock className="h-3 w-3/4" />
                <SkeletonBlock className="h-1.5 w-full" />
              </div>
            ))
          : items.map((f) => (
              <div key={f.label}>
                <div className="flex justify-between text-[10px]">
                  <span className="text-foreground">{f.label}</span>
                  <span className="text-muted-foreground">{f.impact}</span>
                </div>
                <div className="mt-2 h-1 rounded-full bg-command-border">
                  <div
                    className="h-full rounded-full bg-command-cyan transition-all duration-700"
                    style={{ width: `${Math.min(100, f.weight)}%` }}
                  />
                </div>
              </div>
            ))
        }
      </div>
    </Panel>
  );
}

function StatCard({ icon: Icon, label, value, detail, tone }: { icon: typeof TrendingUp; label: string; value: string; detail: string; tone: "red" | "amber" | "green" }) { return <Panel className="flex items-center gap-4 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-command-cyan/40 hover:shadow-[0_10px_25px_rgba(0,0,0,0.15)]"><div className={cn("grid size-10 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110", tone === "red" ? "bg-command-red/12 text-command-red" : tone === "amber" ? "bg-command-amber/12 text-command-amber" : "bg-command-green/12 text-command-green")}><Icon size={19} /></div><div><div className="text-[10px] text-muted-foreground">{label}</div><div className="mono-data mt-1 text-xl font-semibold text-foreground">{value}</div><div className="text-[9px] text-muted-foreground">{detail}</div></div></Panel>; }

function BottlenecksPage({ onNetwork }: { onNetwork: () => void }) {
  const { data, loading, error, refresh } = useBottlenecks();

  const items    = data?.bottlenecks ?? bottlenecks;
  const timeline = data?.timeline    ?? [];
  const criticalCount = items.filter((b) => b.risk === "CRITICAL").length;
  const nextOverload  = items[0]?.time ?? "—";
  const nextResource  = items[0]?.resource ?? "—";

  // Timeline column labels derived from backend data or fallback
  const timeLabels = timeline.length > 0
    ? timeline.map((t) => t.time)
    : ["Now", "+2H", "+4H", "+6H", "+12H"];

  // For each bottleneck row, map to timeline utilization values
  const timelineKeys: ("emergency" | "ct" | "ward" | "icu")[] = ["emergency", "ct", "ward"];

  // Compute overload marker position: fraction of timeline where value first >= 95
  function overloadFraction(key: "emergency" | "ct" | "ward" | "icu"): number {
    if (!timeline.length) return 0.25;
    for (let i = 0; i < timeline.length; i++) {
      if ((timeline[i]?.[key] ?? 0) >= 95) return i / (timeline.length - 1);
    }
    return 1;
  }

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Predict / Risk queue"
        title="Predicted Bottlenecks"
        subtitle="Identify resource constraints before congestion occurs."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-command-border text-[10px]" onClick={refresh} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
            <Button size="sm" className="bg-command-cyan text-primary-foreground text-[10px]" onClick={onNetwork}>
              <Network size={13} /> Open impact network
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-command-amber/30 bg-command-amber/8 px-4 py-2.5 text-[11px] text-command-amber">
          <AlertTriangle size={14} /> Backend unavailable — showing cached data.
          <button onClick={refresh} className="ml-auto underline">Retry</button>
        </div>
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={TriangleAlert}
          label="Critical bottlenecks"
          value={loading && !data ? "—" : `${criticalCount} detected`}
          detail={`Across ${new Set(items.map((b) => b.department)).size} departments`}
          tone="red"
        />
        <StatCard
          icon={TimerReset}
          label="Next overload"
          value={loading && !data ? "—" : nextOverload}
          detail={nextResource}
          tone="amber"
        />
        <StatCard icon={ArrowDownRight} label="Risk prevented" value="18%" detail="With current actions" tone="green" />
      </div>

      <Panel title="Bottleneck intelligence" meta="Sorted by time to overload">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-command-border text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
                {["Resource", "Department", "Current", "Predicted peak", "Capacity", "Time to overload", "Risk", "Impact"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && !data
                ? Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-command-border/60">
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-4 py-4"><SkeletonBlock className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                : items.map((item) => (
                    <tr key={item.resource} className="border-b border-command-border/60 text-[11px] hover:bg-command-cyan/5">
                      <td className="px-4 py-4 font-semibold text-foreground">{item.resource}</td>
                      <td className="px-4 py-4 text-muted-foreground">{item.department}</td>
                      <td className="mono-data px-4 py-4 text-foreground">{item.current}%</td>
                      <td className="mono-data px-4 py-4 text-command-red">{item.peak}%</td>
                      <td className="px-4 py-4 text-muted-foreground">{item.capacity}</td>
                      <td className="mono-data px-4 py-4 text-command-amber">{item.time}</td>
                      <td className="px-4 py-4"><RiskBadge risk={item.risk} /></td>
                      <td className="px-4 py-4 text-muted-foreground">{item.impact}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-5" title="Bottleneck timeline" meta="When resources cross capacity thresholds">
        <div className="p-5">
          <div className="flex justify-between text-[9px] text-muted-foreground">
            {timeLabels.map((label) => <span key={label}>{label.toUpperCase()}</span>)}
          </div>
          <div className="relative mt-7 space-y-6">
            {(loading && !data
              ? [{resource: "Emergency Beds", key: "emergency"}, {resource: "CT Scanner", key: "ct"}, {resource: "General Ward", key: "ward"}]
              : items.slice(0, 3).map((item, i) => ({ resource: item.resource, key: timelineKeys[i] ?? "emergency" }))
            ).map(({ resource, key }) => {
              const frac = overloadFraction(key as "emergency" | "ct" | "ward" | "icu");
              const pct  = Math.round(frac * 100);
              // Find the time label at overload point
              const overloadIdx = Math.round(frac * (timeLabels.length - 1));
              const overloadTime = timeLabels[overloadIdx] ?? "";
              return (
                <div key={resource} className="grid grid-cols-[125px_1fr] items-center gap-4">
                  <div className="truncate text-[10px] font-medium text-foreground">{resource}</div>
                  <div className="relative h-7">
                    <div className="absolute top-3 h-px w-full bg-command-border" />
                    <div
                      className="absolute top-1 h-5 rounded-r-full bg-command-red/25"
                      style={{ left: "0%", width: `${pct}%` }}
                    />
                    {loading && !data
                      ? <div className={`absolute top-1 size-5 rounded-full animate-pulse rounded bg-command-border/40`} style={{ left: `${pct}%`, position: "absolute" } as React.CSSProperties} />
                      : <>
                          <div
                            className="absolute top-1 size-5 rounded-full border-2 border-command-red bg-command/90 shadow-[0_0_12px_var(--color-command-red)]"
                            style={{ left: `${pct}%` }}
                          />
                          <span
                            className="absolute top-7 -translate-x-1/2 text-[9px] font-mono text-command-red"
                            style={{ left: `${pct}%` }}
                          >
                            {overloadTime}
                          </span>
                        </>
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function RecommendedResponseModal({ recs, onClose }: {
  recs: import("@/types/api").ApiRecommendation[];
  onClose: () => void;
}) {
  const priorityStyle = (p: string) =>
    p === "URGENT" ? { dot: "bg-command-red", text: "text-command-red", bar: "bg-command-red" }
    : p === "OPTIMIZATION" ? { dot: "bg-command-amber", text: "text-command-amber", bar: "bg-command-amber" }
    : p === "PREVENTIVE" ? { dot: "bg-command-cyan", text: "text-command-cyan", bar: "bg-command-cyan" }
    : { dot: "bg-command-green", text: "text-command-green", bar: "bg-command-green" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border border-command-cyan/30 bg-command shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-command-border bg-command px-5 py-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.17em] text-command-cyan">
            <Sparkles size={14} /> Recommended Response
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[11px] text-muted-foreground">AI-generated actions to address the selected bottleneck and its downstream propagation impact.</p>
          {recs.length === 0 ? (
            <div className="rounded-lg border border-command-border bg-command/30 p-4 text-center text-[11px] text-muted-foreground">
              No recommendations available for current selection.
            </div>
          ) : recs.map((rec, i) => {
            const s = priorityStyle(rec.priority);
            return (
              <div key={i} className="rounded-lg border border-command-border bg-command/35 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("flex items-center gap-1.5 text-[9px] font-bold tracking-[0.14em]", s.text)}>
                    <span className={cn("size-1.5 rounded-full", s.dot)} />{rec.priority}
                  </span>
                  {rec.improvement && <span className="mono-data text-[9px] text-command-green">{rec.improvement}</span>}
                </div>
                <div className="text-[12px] font-semibold text-foreground">{rec.title}</div>
                <div className="mt-1.5 text-[10px] leading-5 text-muted-foreground">{rec.reason}</div>
                <div className="mt-3 h-1 rounded-full bg-command-border">
                  <div className={cn("h-full rounded-full transition-all duration-700", s.bar)} style={{ width: `${rec.priority === "URGENT" ? 90 : rec.priority === "OPTIMIZATION" ? 70 : rec.priority === "PREVENTIVE" ? 50 : 35}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Map resource names from currentDashboard onto network node IDs
const NODE_RESOURCE_MAP: Record<string, string> = {
  beds:      "Emergency Beds",
  icu:       "ICU Beds",
  ct:        "CT Scanner",
  lab:       "Laboratory",
  ward:      "General Ward",
  emergency: "Emergency",
};

function NetworkPage({ focus, onFocus, onRecommendations }: { focus: string; onFocus: (id: string) => void; onRecommendations: () => void }) {
  const [showRecs, setShowRecs] = useState(false);
  // Base graph (no node_id) — loads once
  const { data: graphData, loading: graphLoading } = useDependencies();
  // Propagation — re-fetches whenever focus changes
  const { data: propData, loading: propLoading } = usePropagation(focus || null);
  const { dataMode, currentDashboard } = useDataMode();

  const isCurrentMode = dataMode === "current" && currentDashboard != null;

  // Build nodes: overlay utilization from uploaded dataset when available
  const baseNodes = graphData?.nodes ?? networkNodes;
  const nodes = useMemo(() => {
    if (!isCurrentMode) return baseNodes;
    return baseNodes.map((node) => {
      const resourceName = NODE_RESOURCE_MAP[node.id];
      if (!resourceName) return node;
      const res = currentDashboard!.resources.find((r) => r.name === resourceName);
      if (!res) return node;
      return { ...node, utilization: res.utilization, risk: res.risk };
    });
  }, [baseNodes, isCurrentMode, currentDashboard]);

  const edges = graphData?.edges ?? networkEdges.map(([source, target, strength]) => ({ source, target, strength }));

  // Build propagation from uploaded data when in current mode
  const uploadedPropagation = useMemo(() => {
    if (!isCurrentMode || !currentDashboard) return null;
    const focusedNode = nodes.find((n) => n.id === focus);
    if (!focusedNode) return null;
    const resourceName = NODE_RESOURCE_MAP[focus];
    const focusedResource = resourceName
      ? currentDashboard.resources.find((r) => r.name === resourceName)
      : null;
    // Build downstream impacts from bottlenecks
    const downstreamIds = new Set<string>();
    edges.forEach(({ source, target }) => { if (source === focus) downstreamIds.add(target); });
    edges.forEach(({ source, target }) => { if (downstreamIds.has(source)) downstreamIds.add(target); });
    const impacts = Array.from(downstreamIds)
      .map((id) => {
        const rName = NODE_RESOURCE_MAP[id];
        const res = rName ? currentDashboard.resources.find((r) => r.name === rName) : null;
        const bn = currentDashboard.bottlenecks.find((b) => b.resource === rName);
        return {
          node_id: id,
          label: nodes.find((n) => n.id === id)?.label ?? id,
          delay_minutes: bn ? Math.round((bn.peak - bn.current) * 0.8) : 15,
          risk: res?.risk ?? "MODERATE",
          description: res ? `${res.utilization}% utilization` : "Downstream pressure",
        };
      })
      .filter((imp) => imp.risk !== "LOW");
    const topRisk = focusedResource?.risk ?? "HIGH";
    const riskScore = focusedResource ? Math.min(100, focusedResource.utilization) : 78;
    const totalDelay = impacts.reduce((s, i) => s + i.delay_minutes, 0) || 42;
    return { primary: focusedNode.label, impacts, total_delay_minutes: totalDelay, risk_score: riskScore, top_risk: topRisk };
  }, [isCurrentMode, currentDashboard, focus, nodes, edges]);

  const propagation = isCurrentMode ? uploadedPropagation : (propData?.propagation ?? null);

  const selectedNode = nodes.find((n) => n.id === focus) ?? nodes[0];

  // Risk score bar width (0-100)
  const riskScore = propagation?.risk_score ?? 78;
  const totalDelay = propagation?.total_delay_minutes ?? 42;
  const primaryLabel = propagation?.primary ?? selectedNode?.label ?? "—";
  const impacts = propagation?.impacts ?? [];

  // Derive panel impact rows from propagation data or fallback
  const impactRows: { label: string; value: string }[] = impacts.length > 0
    ? impacts.slice(0, 3).map((imp, i) => ({
        label: i === 0 ? "Direct impact" : i === 1 ? "Secondary impact" : "Tertiary impact",
        value: imp.label,
      }))
    : [
        { label: "Direct impact",    value: "Diagnostic department" },
        { label: "Secondary impact", value: "General Ward" },
        { label: "Tertiary impact",  value: "Emergency Beds" },
      ];

  // Propagation chain for the cascade display
  const cascadeSteps: { label: string; risk: string }[] = impacts.length > 0
    ? [{ label: `${primaryLabel} Overload`, risk: "CRITICAL" }, ...impacts.map((imp) => ({ label: imp.label, risk: imp.risk }))]
    : [];

  const topImpactRisk = (isCurrentMode ? (uploadedPropagation as { top_risk?: string } | null)?.top_risk : null) ?? impacts[0]?.risk ?? "HIGH";
  const riskTone = topImpactRisk === "CRITICAL" ? "text-command-red" : topImpactRisk === "HIGH" ? "text-command-amber" : "text-command-cyan";

  const recsList = (isCurrentMode ? currentDashboard?.recommendations : null) ?? recommendations;

  return (
    <div className="pb-10">
      {showRecs && <RecommendedResponseModal recs={recsList as import("@/types/api").ApiRecommendation[]} onClose={() => setShowRecs(false)} />}
      <PageHeader
        eyebrow="Propagate / Dependency model"
        title="Hospital Dependency Network"
        subtitle="How will one shortage affect the rest of the hospital?"
        action={
          <div className="flex items-center gap-2 rounded border border-command-cyan/20 bg-command-cyan/5 px-3 py-2 text-[10px] text-command-cyan">
            <span className="status-pulse size-1.5 rounded-full bg-command-cyan" /> Live propagation model
          </div>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_310px]">
        <Panel className="overflow-hidden" title="Operational dependency graph" meta="Select a resource to highlight downstream impact">
          {graphLoading && !graphData
            ? <div className="flex h-[540px] items-center justify-center gap-2 text-[11px] text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Loading dependency graph…</div>
            : <NetworkGraph nodes={nodes} edges={edges} focus={focus} onFocus={onFocus} />
          }
        </Panel>

        <Panel title="Propagation analysis" meta="Downstream impact assessment" className="h-fit">
          <div className="p-5">
            {isCurrentMode && (
              <div className="mb-3 flex items-center gap-1.5 rounded-md border border-command-green/25 bg-command-green/5 px-2.5 py-1.5 text-[9px] text-command-green">
                <span className="size-1.5 rounded-full bg-command-green" /> Live dataset values
              </div>
            )}
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Primary bottleneck</div>
            <div className="mt-2 flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-lg bg-command-red/12 text-command-red"><ScanLine size={18} /></div>
              <div>
                <div className="text-[13px] font-semibold text-foreground">{primaryLabel}</div>
                <RiskBadge risk={topImpactRisk} />
              </div>
            </div>

            {/* Cascade chain */}
            {cascadeSteps.length > 0 && (
              <div className="mt-5 space-y-1">
                <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Propagation chain</div>
                {cascadeSteps.map((step, i) => (
                  <div key={step.label} className="flex items-start gap-2">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "size-2 rounded-full mt-1",
                        step.risk === "CRITICAL" ? "bg-command-red" : step.risk === "HIGH" ? "bg-command-amber" : "bg-command-cyan"
                      )} />
                      {i < cascadeSteps.length - 1 && <div className="w-px flex-1 bg-command-border/60 mt-1" style={{ minHeight: 12 }} />}
                    </div>
                    <div className="pb-2">
                      <span className="text-[10px] font-medium text-foreground">{step.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 space-y-4">
              {impactRows.map((row) => <ImpactRow key={row.label} label={row.label} value={row.value} />)}
            </div>

            <div className="mt-6 rounded-lg border border-command-red/20 bg-command-red/5 p-4">
              <div className="flex justify-between">
                <span className="text-[10px] text-muted-foreground">Propagation risk</span>
                <span className={cn("text-[10px] font-semibold", riskTone)}>{topImpactRisk}</span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-[10px] text-muted-foreground">Impact score</span>
                {propLoading && !isCurrentMode
                  ? <SkeletonBlock className="h-8 w-16" />
                  : <span className="mono-data text-2xl font-semibold text-command-red">{Math.round(riskScore)}<span className="text-xs text-muted-foreground">/100</span></span>
                }
              </div>
              <div className="mt-3 h-1 rounded-full bg-command-border">
                <div className="h-full rounded-full bg-command-red transition-all duration-700" style={{ width: `${Math.min(100, riskScore)}%` }} />
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 text-[10px] leading-5 text-muted-foreground">
              <Clock3 size={14} className="shrink-0 text-command-amber" />
              Estimated downstream delay:
              {propLoading && !isCurrentMode
                ? <SkeletonBlock className="ml-1 h-4 w-12" />
                : <span className="font-semibold text-foreground ml-1">{totalDelay} minutes</span>
              }
            </div>

            <Button className="mt-5 w-full bg-command-cyan text-primary-foreground text-[10px]" onClick={() => setShowRecs(true)}>
              <Sparkles size={13} /> View recommended response
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ImpactRow({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between border-b border-command-border/60 pb-3 text-[10px]"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium text-foreground">{value}</span></div>; }

function NetworkGraph({
  nodes,
  edges,
  focus,
  onFocus,
}: {
  nodes: import("@/types/api").ApiNetworkNode[];
  edges: import("@/types/api").ApiNetworkEdge[];
  focus: string;
  onFocus: (id: string) => void;
}) {
  const getNode = (id: string) => nodes.find((n) => n.id === id);

  // A node is "related" to the focused node if it is the focus itself,
  // or is directly connected via an edge from/to the focus.
  const relatedIds = new Set<string>([focus]);
  edges.forEach(({ source, target }) => {
    if (source === focus) relatedIds.add(target);
    if (target === focus) relatedIds.add(source);
    // Also include second-degree downstream from focus
    if (source === focus) {
      edges.forEach((e2) => { if (e2.source === target) relatedIds.add(e2.target); });
    }
  });

  const isRelated = (from: string, to: string) =>
    !focus || relatedIds.has(from) || relatedIds.has(to);

  return (
    <div className="relative h-[540px] overflow-auto bg-command/45 p-4">
      <svg viewBox="0 0 1100 580" className="h-full w-full min-w-[820px]" aria-label="Hospital dependency network">
        <defs>
          <marker id="arrow-cyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-command-cyan)" />
          </marker>
          <marker id="arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-command-red)" />
          </marker>
        </defs>

        {edges.map(({ source, target, strength }) => {
          const a = getNode(source);
          const b = getNode(target);
          if (!a || !b) return null;
          const active = isRelated(source, target);
          const isDownstream = focus && source === focus || (relatedIds.has(source) && source !== focus);
          // cx = x * 9 + 55  (node centre for lines)
          const ax = a.x * 9 + 55 + 66, ay = a.y * 5.6 + 25;
          const bx = b.x * 9 + 55 + 66, by = b.y * 5.6 + 25;
          return (
            <g key={`${source}-${target}`} opacity={focus && !active ? 0.17 : 1}>
              <line
                x1={ax} y1={ay} x2={bx} y2={by}
                stroke={active && focus && isDownstream ? "var(--color-command-red)" : "var(--color-command-cyan)"}
                strokeWidth={active ? 2.2 : 1.2}
                strokeDasharray={active && focus ? "6 5" : "none"}
                markerEnd={`url(#${active && focus && isDownstream ? "arrow-red" : "arrow-cyan"})`}
                className={active && focus ? "flow-line" : ""}
              />
              <text
                x={(ax + bx) / 2} y={(ay + by) / 2 + 14}
                fill="var(--color-muted-foreground)" fontSize="11" textAnchor="middle"
              >
                {strength}
              </text>
            </g>
          );
        })}

        {nodes.map((node) => {
          const active = !focus || relatedIds.has(node.id);
          const isFocused = node.id === focus;
          const W = node.id === "arrival" ? 118 : 126;
          // rx = x * 9 + 55  (rect left edge)
          const rx = node.x * 9 + 55;
          const ry = node.y * 5.6;
          const cx = rx + W / 2;
          return (
            <g key={node.id} onClick={() => onFocus(node.id)} className="cursor-pointer" opacity={focus && !active ? 0.3 : 1}>
              <rect
                x={rx} y={ry} width={W} height="50" rx="9"
                fill={isFocused ? "var(--color-command-red)" : "var(--color-command-raised)"}
                fillOpacity={isFocused ? 0.18 : 0.95}
                stroke={
                  isFocused ? "var(--color-command-red)"
                  : node.kind === "risk" ? "var(--color-command-amber)"
                  : "var(--color-command-border)"
                }
                strokeWidth={isFocused ? 2 : 1.3}
              />
              <text
                x={cx} y={ry + 21}
                fill="var(--color-foreground)" fontSize="12" fontWeight="600" textAnchor="middle"
              >
                {node.label}
              </text>
              {node.utilization != null ? (
                <text x={cx} y={ry + 37}
                  fill={node.risk === "CRITICAL" || node.risk === "HIGH" ? "var(--color-command-red)" : "var(--color-command-cyan)"}
                  fontSize="9" textAnchor="middle"
                >
                  {node.utilization}% · {node.risk ?? node.kind.toUpperCase()}
                </text>
              ) : (
                <text x={cx} y={ry + 37}
                  fill={node.kind === "risk" ? "var(--color-command-red)" : "var(--color-command-cyan)"}
                  fontSize="9" textAnchor="middle"
                >
                  {node.kind === "risk" ? "RISK SIGNAL" : node.kind === "source" ? "INPUT STREAM" : "DEPENDENCY"}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-5 left-5 flex items-center gap-4 rounded-lg border border-command-border bg-command-raised/90 px-3 py-2 text-[9px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-px w-4 bg-command-cyan" /> Dependency</span>
        <span className="flex items-center gap-1.5"><span className="h-px w-4 bg-command-red" /> Affected path</span>
        <span className="hidden sm:inline">Click a node to inspect</span>
      </div>
    </div>
  );
}

function SimulatorPage({ scenario, setScenario }: { scenario: typeof simulatorDefaults; setScenario: (value: typeof simulatorDefaults) => void; simulating?: boolean; simulationRun?: boolean; onRun?: () => void }) {
  const { data: simResult, loading: simulating, error: simError, run: runSim } = useSimulate();
  const [hasRun, setHasRun] = useState(false);

  // Before: use live baseline from API response, fall back to last known or static
  const [liveBaseline, setLiveBaseline] = useState({ beds: 87, emergency: 88, ct: 91, laboratory: 79, icu: 74 });

  const after = simResult?.resources ?? null;
  const risk = simResult?.risk ?? null;
  const bottlenecks = simResult?.bottlenecks ?? [];
  const recs = simResult?.recommendations ?? [];
  const isMassCasualty = scenario.surge >= 70;

  // Update baseline whenever we get a fresh API response with 'before'
  useEffect(() => {
    if (simResult?.before) {
      setLiveBaseline({
        beds:       Math.round(simResult.before.beds),
        emergency:  Math.round(simResult.before.emergency),
        ct:         Math.round(simResult.before.ct),
        laboratory: Math.round(simResult.before.laboratory),
        icu:        Math.round(simResult.before.icu),
      });
    }
  }, [simResult]);

  const handleRun = async () => {
    await runSim({
      patient_surge:               scenario.surge,
      // Send capacity changes as percentage deltas from neutral (0 = no change)
      // Slider default 76 = baseline; values above = more capacity (negative util impact)
      bed_capacity_change:         scenario.beds - 76,
      ct_capacity_change:          scenario.ct - 68,
      mri_capacity_change:         scenario.mri - 45,
      staff_change:                scenario.staff - 88,
      scheduled_procedures_change: scenario.procedures - 64,
    });
    setHasRun(true);
  };

  const riskTone = risk === "CRITICAL" ? "border-command-red/40 bg-command-red/20 text-command-red animate-pulse"
    : risk === "HIGH" ? "bg-command-red/12 text-command-red"
    : risk === "MODERATE" ? "bg-command-amber/12 text-command-amber"
    : "bg-command-green/10 text-command-green";
  const riskDot = risk === "CRITICAL" ? "bg-command-red animate-ping"
    : risk === "HIGH" ? "bg-command-red"
    : risk === "MODERATE" ? "bg-command-amber"
    : "bg-command-green";
  const riskLabel = risk === "CRITICAL" && isMassCasualty ? "MASS CASUALTY CRITICAL"
    : risk === "CRITICAL" ? "CRITICAL OVERLOAD"
    : risk === "HIGH" ? "HIGH PROJECTED RISK"
    : risk === "MODERATE" ? "MODERATE RISK"
    : hasRun ? "WITHIN SAFE RANGE" : "BASELINE STABLE";

  const resourceRows: [string, keyof typeof liveBaseline, keyof NonNullable<typeof after>][] = [
    ["Beds",       "beds",       "beds"],
    ["Emergency",  "emergency",  "emergency"],
    ["CT",         "ct",         "ct"],
    ["Laboratory", "laboratory", "laboratory"],
    ["ICU",        "icu",        "icu"],
  ];

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Simulate / Decision lab"
        title="Capacity Scenario Simulator"
        subtitle="Test operational decisions before they impact patients."
        action={
          <div className="flex items-center gap-2 rounded border border-command-cyan/20 bg-command-cyan/5 px-3 py-2 text-[10px] text-command-cyan">
            <Cpu size={14} /> Simulation engine ready
          </div>
        }
      />

      {simError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-command-amber/30 bg-command-amber/8 px-4 py-2.5 text-[11px] text-command-amber">
          <AlertTriangle size={14} /> Simulation failed — showing estimated results.
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
        {/* ── LEFT: Controls ── */}
        <Panel title="Scenario controls" meta="Adjust demand and operational capacity">
          <div className="p-5">
            {([
              ["Patient arrival surge", "surge",      0, 100, "%"],
              ["Emergency demand",      "emergency",  40, 100, "%"],
              ["Bed capacity",          "beds",       40, 100, "%"],
              ["CT capacity",           "ct",         40, 100, "%"],
              ["MRI capacity",          "mri",        20, 100, "%"],
              ["Staff availability",    "staff",      40, 100, "%"],
              ["Scheduled procedures",  "procedures", 20, 100, "%"],
            ] as const).map(([label, key, min, max, unit]) => (
              <label key={key} className="mb-5 block">
                <div className="mb-2 flex justify-between text-[10px]">
                  <span className="text-foreground">{label}</span>
                  <span className="mono-data text-command-cyan">{scenario[key]}{unit}</span>
                </div>
                <input
                  type="range" min={min} max={max} value={scenario[key]}
                  onChange={(e) => setScenario({ ...scenario, [key]: Number(e.target.value) })}
                  className="w-full accent-command-cyan"
                />
              </label>
            ))}

            <div className="mt-6 border-t border-command-border pt-5">
              <div className="mb-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Preset scenarios</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Normal day",         { surge: 0,  emergency: 72, beds: 76, ct: 68, mri: 45, staff: 88, procedures: 64 }],
                  ["Patient surge +30%", { surge: 30, emergency: 80, beds: 82, ct: 78, mri: 45, staff: 85, procedures: 60 }],
                  ["Flu outbreak",       { surge: 55, emergency: 88, beds: 90, ct: 70, mri: 40, staff: 70, procedures: 50 }],
                  ["CT failure",         { surge: 20, emergency: 75, beds: 78, ct: 100, mri: 85, staff: 88, procedures: 64 }],
                  ["Staff shortage",     { surge: 25, emergency: 70, beds: 74, ct: 68, mri: 45, staff: 40, procedures: 35 }],
                  ["Mass casualty event",{ surge: 80, emergency: 95, beds: 96, ct: 100, mri: 60, staff: 50, procedures: 30 }],
                ].map(([preset, vals]) => (
                  <button
                    key={preset as string}
                    className={cn(
                      "rounded-md border border-command-border px-2 py-2 text-left text-[9px] transition-all",
                      (preset as string).includes("casualty")
                        ? "bg-command-red/10 border-command-red/30 text-command-red font-bold hover:bg-command-red/20"
                        : "bg-command/35 text-muted-foreground hover:border-command-cyan/40 hover:text-foreground"
                    )}
                    onClick={() => setScenario(vals as typeof simulatorDefaults)}
                  >
                    {preset as string}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleRun}
              disabled={simulating}
              className="mt-6 w-full bg-command-cyan text-primary-foreground text-[10px]"
            >
              {simulating
                ? <><RefreshCw size={13} className="animate-spin" /> AI simulation running…</>
                : <><Play size={13} /> Run simulation</>
              }
            </Button>
          </div>
        </Panel>

        {/* ── RIGHT: Results ── */}
        <div className="space-y-5">
          {/* Resource comparison */}
          <Panel
            title="Simulation result"
            meta={hasRun ? (isMassCasualty ? "Mass Casualty Surge Model Completed · Critical Overload" : "Model completed · Updated just now") : "Current state vs simulated state"}
            action={
              <span className={cn("inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[9px] font-bold tracking-[0.14em] border", hasRun ? riskTone : "bg-command-green/10 text-command-green border-command-green/20")}>
                <span className={cn("size-1.5 rounded-full", hasRun ? riskDot : "bg-command-green")} />
                {riskLabel}
              </span>
            }
          >
            <div className="grid gap-3 p-4 sm:grid-cols-5">
              {resourceRows.map(([label, baseKey, afterKey]) => {
                const beforeVal = liveBaseline[baseKey];
                const afterVal  = hasRun && after ? Math.round(after[afterKey] ?? 0) : beforeVal;
                const isOver    = afterVal > 90;
                return (
                  <div key={label} className="rounded-lg border border-command-border bg-command/35 p-3">
                    <div className="text-[10px] text-muted-foreground">{label}</div>
                    <div className="mt-3 flex items-end justify-between">
                      <span className={cn("mono-data text-xl", isOver && hasRun ? "text-command-red" : "text-foreground")}>
                        {simulating ? <Loader2 size={16} className="animate-spin text-command-cyan" /> : `${afterVal}%`}
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        {hasRun && !simulating
                          ? <ArrowUpRight size={12} className={cn("inline", isOver ? "text-command-red" : "text-command-amber")} />
                          : "current"}
                      </span>
                    </div>
                    <div className="mt-2 h-1 rounded-full bg-command-border">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", isOver && hasRun ? "bg-command-red" : "bg-command-cyan")}
                        style={{ width: `${Math.min(100, afterVal)}%` }}
                      />
                    </div>
                    <div className="mt-2 text-[9px] text-muted-foreground">
                      {hasRun && !simulating ? `from ${beforeVal}%` : "baseline"}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Bottlenecks detected */}
          {hasRun && bottlenecks.length > 0 && (
            <Panel title="Detected bottlenecks" meta="Resources projected to exceed safe capacity">
              <div className="flex flex-wrap gap-2 p-4">
                {bottlenecks.map((b) => (
                  <span key={b} className="flex items-center gap-1.5 rounded-full border border-command-red/30 bg-command-red/10 px-3 py-1.5 text-[10px] font-semibold text-command-red">
                    <AlertTriangle size={11} /> {b}
                  </span>
                ))}
              </div>
            </Panel>
          )}

          {/* Impact propagation */}
          <Panel title="Scenario impact propagation" meta="Projected pressure travels through connected departments">
            <div className="flex flex-wrap items-center justify-center gap-2 p-8 text-center sm:gap-3">
              {([
                { label: "Patient surge",   pressure: scenario.surge > 20 },
                { label: "Emergency",       pressure: scenario.emergency > 75 || scenario.surge > 20 },
                { label: "Beds",            pressure: scenario.beds > 80 || scenario.surge > 30 },
                { label: "CT + Laboratory", pressure: scenario.ct > 75 || scenario.surge > 40 },
                { label: "Treatment",       pressure: scenario.ct > 75 || scenario.beds > 80 },
                { label: "General Ward",    pressure: scenario.beds > 85 || scenario.emergency > 80 },
                { label: "ICU",             pressure: scenario.emergency > 85 || scenario.beds > 88 },
              ] as { label: string; pressure: boolean }[]).map(({ label, pressure }, index) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={cn(
                    "rounded-lg border px-3 py-2 text-[10px] font-medium transition-colors duration-300",
                    pressure ? "border-command-red/30 bg-command-red/8 text-command-red" : "border-command-cyan/25 bg-command-cyan/8 text-command-cyan"
                  )}>{label}</div>
                  {index < 6 && <ArrowRight size={14} className={cn("transition-colors duration-300", pressure ? "text-command-red/60" : "text-muted-foreground")} />}
                </div>
              ))}
            </div>
          </Panel>

          {/* AI recommendations from backend */}
          <Panel title="AI recommended actions" meta="Actions prioritized for projected improvement">
            {simulating ? (
              <div className="flex items-center justify-center gap-2 p-8 text-[11px] text-muted-foreground">
                <Loader2 size={16} className="animate-spin" /> Generating recommendations...
              </div>
            ) : recs.length > 0 ? (
              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {recs.map((item, index) => {
                  const title  = typeof item === "string" ? item : item.title;
                  const reason = typeof item === "string" ? "" : item.reason;
                  const priority = typeof item === "string" ? (index === 0 ? "URGENT" : index === 1 ? "HIGH" : "ACTION") : item.priority;
                  const improvement = typeof item === "string" ? "" : item.improvement;
                  return (
                    <div key={title} className="rounded-lg border border-command-border bg-command/35 p-4">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-[9px] font-bold tracking-[0.13em]",
                          index === 0 ? "text-command-red" : index === 1 ? "text-command-amber" : "text-command-cyan"
                        )}>{priority}</span>
                        {improvement && <span className="mono-data text-[9px] text-command-green">{improvement}</span>}
                      </div>
                      <div className="mt-3 text-[11px] font-semibold leading-5 text-foreground">{title}</div>
                      {reason && <div className="mt-2 text-[10px] leading-4 text-muted-foreground">{reason}</div>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-[11px] text-muted-foreground">
                {hasRun ? "No critical actions required." : "Run a simulation to generate AI recommendations."}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}


function ResourcePage() {
  const { data, loading, error, refresh } = useResources();
  const liveResources = data?.resources ?? resources;
  const underutilized = data?.underutilized ?? resources.filter((r) => r.utilization < 60);
  const heatmapRows = liveResources.map((r, row) => ({ name: r.name, utilization: r.utilization, row }));
  return (
    <div className="pb-10">
      <PageHeader eyebrow="Measure / Utilization" title="Resource Intelligence" subtitle="Find hidden capacity before adding more infrastructure."
        action={<Button variant="outline" size="sm" className="border-command-border text-[10px]" onClick={refresh} disabled={loading}><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh</Button>}
      />
      {error && <div className="mb-4 flex items-center gap-2 rounded-lg border border-command-amber/30 bg-command-amber/8 px-4 py-2.5 text-[11px] text-command-amber"><AlertTriangle size={14} /> Backend unavailable — showing cached data.<button onClick={refresh} className="ml-auto underline">Retry</button></div>}
      <Panel title="Resource utilization" meta="Current and forecast utilization across critical hospital resources" className="mb-5">
        <div className="grid grid-cols-2 divide-x divide-y divide-command-border/60 sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-6">
          {loading && !data
            ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="p-3.5 space-y-2"><SkeletonBlock className="h-7 w-7 rounded-md" /><SkeletonBlock className="mt-3 h-4 w-3/4" /><SkeletonBlock className="mt-2 h-6 w-1/2" /><SkeletonBlock className="mt-2 h-8 w-full" /></div>)
            : liveResources.map((resource) => (
                <div key={resource.name} className="group p-3.5 transition-colors hover:bg-command-cyan/5">
                  <div className="flex items-center justify-between"><ResourceIcon icon={resource.icon ?? ""} /><RiskBadge risk={resource.risk} /></div>
                  <div className="mt-3 truncate text-[11px] font-semibold text-foreground">{resource.name}</div>
                  <div className="mt-1 text-[9px] text-muted-foreground">{resource.department}</div>
                  <div className="mt-2 flex items-end justify-between">
                    <span className="mono-data text-xl font-semibold text-foreground">{resource.utilization}%</span>
                    <span className={cn("flex items-center text-[9px]", resource.trend.startsWith("-") ? "text-command-green" : "text-command-red")}>{resource.trend.startsWith("-") ? <TrendingDown size={11} /> : <TrendingUp size={11} />}{resource.trend}</span>
                  </div>
                  {"forecast_usage" in resource && resource.forecast_usage != null && (
                    <div className="mt-1 flex items-center gap-1 text-[9px] text-muted-foreground">
                      <TrendingUp size={10} className="text-command-amber" />
                      <span>Forecast: <span className={cn("font-mono", (resource.forecast_usage as number) > 100 ? "text-command-red" : (resource.forecast_usage as number) > 90 ? "text-command-amber" : "text-command-cyan")}>{resource.forecast_usage as number}%</span></span>
                    </div>
                  )}
                  <div className="mt-2"><MiniSparkline values={resource.sparkline} tone={resource.risk === "CRITICAL" ? "red" : resource.risk === "LOW" ? "green" : "cyan"} /></div>
                  <div className="mt-1 text-[9px] text-muted-foreground">{resource.capacity}</div>
                </div>
              ))
          }
        </div>
      </Panel>
      <Panel title="Resource utilization heatmap" meta="Utilization intensity by resource and hour — Low / Normal / Warning / Critical">
        <div className="overflow-x-auto p-5"><div className="min-w-[700px]">
          <div className="grid grid-cols-[130px_repeat(12,1fr)] gap-1 text-[9px] text-muted-foreground">
            <span />
            {["08","09","10","11","12","13","14","15","16","17","18","19"].map((hour) => <span key={hour} className="text-center">{hour}:00</span>)}
            {loading && !data
              ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="contents"><SkeletonBlock className="h-4 w-24" />{Array.from({ length: 12 }).map((__, j) => <SkeletonBlock key={j} className="h-8 rounded-sm" />)}</div>)
              : heatmapRows.map(({ name, utilization, row }) => (
                  <div key={name} className="contents">
                    <span className="flex items-center pr-3 text-[10px] text-foreground truncate">{name}</span>
                    {Array.from({ length: 12 }, (_, index) => {
                      const value = Math.min(99, utilization + (index - 5) * 2 + ((row + index) % 3) * 3);
                      const label = value > 90 ? "Critical" : value > 80 ? "Warning" : value > 65 ? "Normal" : "Low";
                      return <div key={`${name}-${index}`} title={`${name} ${value}% · ${label}`} className={cn("h-8 rounded-sm", value > 90 ? "bg-command-red/75" : value > 80 ? "bg-command-amber/70" : value > 65 ? "bg-command-cyan/45" : "bg-command-green/30")} />;
                    })}
                  </div>
                ))
            }
          </div>
          <div className="mt-5 flex items-center justify-end gap-3 text-[9px] text-muted-foreground">
            <span>Low</span><span className="size-3 rounded-sm bg-command-green/30" /><span className="size-3 rounded-sm bg-command-cyan/45" /><span className="size-3 rounded-sm bg-command-amber/70" /><span className="size-3 rounded-sm bg-command-red/75" /><span>Critical</span>
          </div>
        </div></div>
      </Panel>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Panel title="Underutilized resources" meta="Capacity available for intelligent redistribution">
          <div className="divide-y divide-command-border/60">
            {loading && !data
              ? Array.from({ length: 2 }).map((_, i) => <div key={i} className="flex items-center gap-4 p-4"><SkeletonBlock className="size-9 rounded-lg" /><div className="flex-1 space-y-2"><SkeletonBlock className="h-4 w-1/2" /><SkeletonBlock className="h-3 w-3/4" /></div><SkeletonBlock className="h-8 w-12" /></div>)
              : underutilized.length === 0
              ? <div className="p-5 text-center text-[11px] text-muted-foreground">All resources operating at normal capacity.</div>
              : underutilized.map((resource) => (
                  <div key={resource.name} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3"><ResourceIcon icon={resource.icon ?? ""} /><div><div className="text-[11px] font-semibold text-foreground">{resource.name}</div><div className="mt-1 text-[10px] text-muted-foreground">Consider redistributing workload to this resource.</div></div></div>
                    <div className="text-right"><div className="mono-data text-xl text-command-green">{resource.utilization}%</div><div className="text-[9px] text-muted-foreground">available {100 - resource.utilization}%</div></div>
                  </div>
                ))
            }
          </div>
        </Panel>
        <Panel title="Efficiency signals" meta="AI-generated operational opportunities">
          <div className="space-y-3 p-4">
            {(underutilized.length > 0 ? underutilized : resources.filter((r) => r.utilization < 60)).slice(0, 3).map((r, index) => (
              <div key={r.name} className="flex gap-3 rounded-lg border border-command-border bg-command/35 p-3">
                <Lightbulb size={15} className="mt-0.5 shrink-0 text-command-amber" />
                <div className="text-[10px] leading-5 text-foreground">
                  {r.name} has {100 - r.utilization}% available capacity during the next 6 hours.
                  <div className="mt-1 text-[9px] text-command-cyan">Potential impact: {index === 0 ? `-${Math.round((100 - r.utilization) * 0.1)}% pressure on ${r.department}` : index === 1 ? `+${Math.round((100 - r.utilization) * 0.08)} protected beds` : `+${Math.round((100 - r.utilization) * 0.05)} procedure slots`}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ── Static fallback procedures (shown when backend is offline) ───────────────

const STATIC_PROCEDURES = [
  { id: "p1", type: "Cardiac procedures",  department: "Cardiology",    scheduled_time: "09:00", duration: "3h",   priority: "URGENT",   status: "CAPACITY CONFLICT", required_resources: ["OR", "ICU", "CT"] },
  { id: "p2", type: "Orthopedic block",    department: "Orthopedics",   scheduled_time: "10:30", duration: "2h",   priority: "ELECTIVE", status: "ON TRACK",         required_resources: ["OR", "Staff"] },
  { id: "p3", type: "General surgery",     department: "Surgery",       scheduled_time: "12:00", duration: "2.5h", priority: "URGENT",   status: "WATCH",            required_resources: ["OR", "Lab"] },
  { id: "p4", type: "Endoscopy",           department: "Gastroenterology", scheduled_time: "14:30", duration: "1h", priority: "ELECTIVE", status: "ON TRACK",       required_resources: ["Staff"] },
] as import("@/types/api").ApiProcedure[];

const STATIC_CONFLICTS = [
  { type: "CAPACITY", severity: "HIGH",   message: "09:00 cardiac procedures may create ICU capacity pressure at 12:00. Recommend reviewing 2 elective cases." },
  { type: "RESOURCE", severity: "MEDIUM", message: "CT Scanner demand peaks at 14:00 — conflicts with scheduled diagnostic procedures." },
] as import("@/types/api").SchedulingConflict[];

// ── Time-to-timeline-position helper ─────────────────────────────────────────

function timeToFraction(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return Math.max(0, Math.min(1, ((h ?? 8) - 8 + (m ?? 0) / 60) / 12));
}

function durationToFraction(dur: string): number {
  const h = parseFloat(dur);
  return Math.min(0.5, h / 12);
}

// ── Add Procedure Modal ───────────────────────────────────────────────────────

function AddProcedureModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (p: import("@/types/api").ApiProcedure) => void;
}) {
  const { create, loading, error } = useCreateProcedure();
  const [form, setForm] = useState({
    type: "",
    department: "Emergency",
    scheduled_time: "09:00",
    duration: "1h",
    priority: "ELECTIVE",
    required_resources: [] as string[],
  });

  const DEPARTMENTS = ["Emergency", "Cardiology", "Surgery", "Orthopedics", "Gastroenterology", "Radiology", "Critical Care", "Pediatrics"];
  const PRIORITIES  = ["ELECTIVE", "URGENT", "EMERGENCY"];
  const RESOURCES   = ["OR", "ICU", "CT", "MRI", "Lab", "Staff", "Beds"];

  const toggleResource = (r: string) =>
    setForm((f) => ({
      ...f,
      required_resources: f.required_resources.includes(r)
        ? f.required_resources.filter((x) => x !== r)
        : [...f.required_resources, r],
    }));

  const handleSubmit = async () => {
    if (!form.type.trim()) return;
    const result = await create(form);
    if (result) { onSave(result); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-command-cyan/30 bg-command shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-command-border px-5 py-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.17em] text-command-cyan">
            <ClipboardList size={14} /> Add Procedure
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent"><X size={15} /></button>
        </div>

        <div className="space-y-4 p-5">
          {error && <div className="rounded-lg border border-command-red/30 bg-command-red/5 px-3 py-2 text-[10px] text-command-red">{error}</div>}

          <label className="block">
            <div className="mb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Procedure type *</div>
            <input
              className="w-full rounded-lg border border-command-border bg-command/50 px-3 py-2 text-[11px] text-foreground placeholder:text-muted-foreground focus:border-command-cyan/50 focus:outline-none"
              placeholder="e.g. Cardiac catheterisation"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="mb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Department</div>
              <select
                className="w-full rounded-lg border border-command-border bg-command/50 px-3 py-2 text-[11px] text-foreground focus:border-command-cyan/50 focus:outline-none"
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              >
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="block">
              <div className="mb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Priority</div>
              <select
                className="w-full rounded-lg border border-command-border bg-command/50 px-3 py-2 text-[11px] text-foreground focus:border-command-cyan/50 focus:outline-none"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              >
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="mb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Scheduled time</div>
              <input
                type="time"
                className="w-full rounded-lg border border-command-border bg-command/50 px-3 py-2 text-[11px] text-foreground focus:border-command-cyan/50 focus:outline-none"
                value={form.scheduled_time}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_time: e.target.value }))}
              />
            </label>
            <label className="block">
              <div className="mb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Duration</div>
              <select
                className="w-full rounded-lg border border-command-border bg-command/50 px-3 py-2 text-[11px] text-foreground focus:border-command-cyan/50 focus:outline-none"
                value={form.duration}
                onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
              >
                {["30m","1h","1.5h","2h","2.5h","3h","4h","5h","6h"].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
          </div>

          <div>
            <div className="mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Required resources</div>
            <div className="flex flex-wrap gap-2">
              {RESOURCES.map((r) => (
                <button
                  key={r}
                  onClick={() => toggleResource(r)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[10px] font-medium transition-all",
                    form.required_resources.includes(r)
                      ? "border-command-cyan/50 bg-command-cyan/15 text-command-cyan"
                      : "border-command-border bg-command/30 text-muted-foreground hover:border-command-cyan/30"
                  )}
                >{r}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t border-command-border px-5 py-4">
          <Button variant="outline" size="sm" className="border-command-border text-[10px]" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className="flex-1 bg-command-cyan text-primary-foreground text-[10px]"
            onClick={handleSubmit}
            disabled={loading || !form.type.trim()}
          >
            {loading ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : <><Check size={13} /> Schedule Procedure</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Review Schedule Modal ─────────────────────────────────────────────────────

function ReviewScheduleModal({ conflicts, procedures, onClose }: {
  conflicts: import("@/types/api").SchedulingConflict[];
  procedures: import("@/types/api").ApiProcedure[];
  onClose: () => void;
}) {
  const urgentProcs = procedures.filter((p) => p.priority === "URGENT" || p.priority === "EMERGENCY");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border border-command-amber/30 bg-command shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-command-border bg-command px-5 py-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.17em] text-command-amber">
            <AlertTriangle size={14} /> Review Schedule
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent"><X size={15} /></button>
        </div>

        <div className="space-y-5 p-5">
          {/* Conflicts */}
          <div>
            <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Detected conflicts ({conflicts.length})</div>
            <div className="space-y-2">
              {conflicts.map((c, i) => (
                <div key={i} className={cn(
                  "rounded-lg border p-3",
                  c.severity === "HIGH" ? "border-command-red/30 bg-command-red/5" : "border-command-amber/25 bg-command-amber/5"
                )}>
                  <div className={cn("flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.12em] mb-1",
                    c.severity === "HIGH" ? "text-command-red" : "text-command-amber"
                  )}>
                    <AlertTriangle size={11} /> {c.type} · {c.severity}
                  </div>
                  <p className="text-[10px] leading-5 text-foreground">{c.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* High-priority procedures */}
          {urgentProcs.length > 0 && (
            <div>
              <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Urgent / emergency procedures</div>
              <div className="space-y-2">
                {urgentProcs.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-command-border bg-command/35 px-3 py-2.5">
                    <div>
                      <div className="text-[11px] font-semibold text-foreground">{p.type}</div>
                      <div className="mt-0.5 text-[9px] text-muted-foreground">{p.department} · {p.scheduled_time} · {p.duration}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "rounded border px-1.5 py-0.5 text-[9px] font-semibold",
                        p.priority === "EMERGENCY" ? "border-command-red/30 bg-command-red/10 text-command-red" : "border-command-amber/30 bg-command-amber/10 text-command-amber"
                      )}>{p.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI recommendation */}
          <div className="rounded-lg border border-command-cyan/20 bg-command-cyan/5 p-4">
            <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-command-cyan">AI Recommendation</div>
            <p className="text-[11px] leading-5 text-foreground">
              Review {urgentProcs.length > 0 ? urgentProcs.length : 2} elective procedures to reduce downstream ICU and CT pressure.
              Rescheduling non-critical cases to off-peak hours could reduce peak utilization by up to 12%.
            </p>
          </div>
        </div>

        <div className="flex gap-2 border-t border-command-border px-5 py-4">
          <Button variant="outline" size="sm" className="border-command-border text-[10px]" onClick={onClose}>Close</Button>
          <Button size="sm" className="flex-1 bg-command-amber text-white text-[10px]" onClick={onClose}>
            <Check size={13} /> Acknowledge & Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Procedures Page ───────────────────────────────────────────────────────────

function ProceduresPage() {
  const { data: proceduresData, loading: procLoading, refresh: refreshProcs } = useProcedures(3_600_000);
  const { data: conflictsData, loading: conflLoading, refresh: refreshConflicts } = useSchedulingConflicts(3_600_000);
  const [showAdd, setShowAdd] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [localProcs, setLocalProcs] = useState<import("@/types/api").ApiProcedure[]>([]);

  const procedures = [...(proceduresData ?? STATIC_PROCEDURES), ...localProcs];
  const conflicts  = conflictsData ?? STATIC_CONFLICTS;

  const handleSave = (p: import("@/types/api").ApiProcedure) => {
    setLocalProcs((prev) => [...prev, p]);
    refreshProcs();
    refreshConflicts();
  };

  const today = new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  const statusColor = (s: string) =>
    s === "CAPACITY CONFLICT" ? "bg-command-red/60" :
    s === "WATCH"             ? "bg-command-amber/60" :
    s === "SCHEDULED"         ? "bg-command-cyan/55" :
                                "bg-command-green/55";

  return (
    <div className="pb-10">
      {showAdd    && <AddProcedureModal    onClose={() => setShowAdd(false)}    onSave={handleSave} />}
      {showReview && <ReviewScheduleModal  onClose={() => setShowReview(false)} conflicts={conflicts} procedures={procedures} />}

      <PageHeader
        eyebrow="Act / Schedule impact"
        title="Procedure Capacity"
        subtitle="See how scheduled procedures change downstream capacity."
        action={
          <Button size="sm" className="bg-command-cyan text-primary-foreground text-[10px]" onClick={() => setShowAdd(true)}>
            <ClipboardList size={13} /> Add procedure
          </Button>
        }
      />

      {/* Timeline */}
      <Panel title="Today's procedure load" meta={today}>
        <div className="overflow-x-auto p-5">
          <div className="min-w-[750px]">
            <div className="relative ml-28 h-8 border-b border-command-border">
              {["08:00","10:00","12:00","14:00","16:00","18:00","20:00"].map((time, i) => (
                <span key={time} className="absolute -translate-x-1/2 text-[9px] text-muted-foreground" style={{ left: `${i * 16.66}%` }}>{time}</span>
              ))}
            </div>
            <div className="mt-4 space-y-4">
              {(procLoading && !proceduresData ? STATIC_PROCEDURES : procedures).map((proc) => {
                const left = timeToFraction(proc.scheduled_time) * 100;
                const width = Math.max(4, durationToFraction(proc.duration) * 100);
                return (
                  <div key={proc.id} className="grid grid-cols-[120px_1fr] items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] font-medium text-foreground truncate">{proc.type}</div>
                      <div className="text-[9px] text-muted-foreground">{proc.scheduled_time} · {proc.duration}</div>
                    </div>
                    <div className="relative h-10 rounded bg-command/50">
                      <div
                        className={cn("absolute top-1 h-8 rounded border border-foreground/10 px-2 py-2 text-[9px] font-medium text-foreground", statusColor(proc.status))}
                        style={{ left: `${left}%`, width: `${width}%`, minWidth: 60 }}
                      >
                        {proc.status}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Panel>

      {/* Procedure list */}
      <Panel className="mt-5" title="Scheduled procedures" meta={`${procedures.length} procedures today`}
        action={
          <Button variant="outline" size="sm" className="border-command-border text-[10px]" onClick={() => { refreshProcs(); refreshConflicts(); }}>
            <RefreshCw size={12} className={procLoading ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-command-border text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
                {["Type","Department","Time","Duration","Priority","Resources","Status"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {procedures.map((proc) => (
                <tr key={proc.id} className="border-b border-command-border/60 text-[11px] hover:bg-command-cyan/5">
                  <td className="px-4 py-3 font-semibold text-foreground">{proc.type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{proc.department}</td>
                  <td className="mono-data px-4 py-3 text-foreground">{proc.scheduled_time}</td>
                  <td className="px-4 py-3 text-muted-foreground">{proc.duration}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "rounded border px-1.5 py-0.5 text-[9px] font-semibold",
                      proc.priority === "EMERGENCY" ? "border-command-red/30 bg-command-red/10 text-command-red" :
                      proc.priority === "URGENT"    ? "border-command-amber/30 bg-command-amber/10 text-command-amber" :
                                                      "border-command-border bg-command/30 text-muted-foreground"
                    )}>{proc.priority}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {proc.required_resources.map((r) => (
                        <span key={r} className="rounded bg-command-cyan/10 px-1.5 py-0.5 text-[9px] text-command-cyan">{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "rounded border px-1.5 py-0.5 text-[9px] font-semibold",
                      proc.status === "CAPACITY CONFLICT" ? "border-command-red/30 bg-command-red/10 text-command-red" :
                      proc.status === "WATCH"             ? "border-command-amber/30 bg-command-amber/10 text-command-amber" :
                      proc.status === "SCHEDULED"         ? "border-command-cyan/30 bg-command-cyan/10 text-command-cyan" :
                                                            "border-command-green/30 bg-command-green/10 text-command-green"
                    )}>{proc.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="mt-5 space-y-3">
          {conflicts.map((c, i) => (
            <div key={i} className={cn(
              "rounded-xl border p-5",
              c.severity === "HIGH" ? "border-command-red/30 bg-command-red/[0.04]" : "border-command-amber/25 bg-command-amber/5"
            )}>
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className={cn("mt-0.5", c.severity === "HIGH" ? "text-command-red" : "text-command-amber")} />
                <div className="flex-1">
                  <div className={cn("text-[11px] font-semibold", c.severity === "HIGH" ? "text-command-red" : "text-command-amber")}>
                    {c.type === "CAPACITY" ? "Capacity conflict detected" : "Resource conflict detected"}
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{c.message}</p>
                </div>
                <Button
                  variant="outline" size="sm"
                  className={cn("shrink-0 text-[10px]", c.severity === "HIGH" ? "border-command-red/30 text-command-red" : "border-command-amber/30 text-command-amber")}
                  onClick={() => setShowReview(true)}
                >
                  Review schedule
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, OPTIMIZATION: 1, PREVENTIVE: 2, EFFICIENCY: 3 };

const PRIORITY_FILTERS = ["ALL", "URGENT", "OPTIMIZATION", "PREVENTIVE", "EFFICIENCY"] as const;
type PriorityFilter = typeof PRIORITY_FILTERS[number];

function RecommendationsPage({ onSimulator }: { onSimulator: () => void }) {
  const { data, loading, error, refresh } = useRecommendations(30_000);
  const [filter, setFilter] = useState<PriorityFilter>("ALL");

  const allRecs = data?.recommendations ?? recommendations;

  const filtered = allRecs
    .filter((r) => filter === "ALL" || r.priority === filter)
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));

  const counts = PRIORITY_FILTERS.slice(1).reduce<Record<string, number>>((acc, p) => {
    acc[p] = allRecs.filter((r) => r.priority === p).length;
    return acc;
  }, {});

  const priorityStyle = (p: string) =>
    p === "URGENT"
      ? { dot: "bg-command-red", text: "text-command-red", border: "border-command-red/30", bg: "bg-command-red/[0.04]" }
      : p === "OPTIMIZATION"
      ? { dot: "bg-command-amber", text: "text-command-amber", border: "border-command-amber/30", bg: "bg-command-amber/[0.04]" }
      : p === "PREVENTIVE"
      ? { dot: "bg-command-cyan", text: "text-command-cyan", border: "border-command-cyan/30", bg: "bg-command-cyan/[0.04]" }
      : { dot: "bg-command-green", text: "text-command-green", border: "border-command-green/30", bg: "bg-command-green/[0.04]" };

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Act / AI operations"
        title="Operational Recommendations"
        subtitle="Explainable actions that protect capacity before congestion occurs."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-command-border text-[10px]" onClick={refresh} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
            <Button onClick={onSimulator} size="sm" className="bg-command-cyan text-primary-foreground text-[10px]">
              <Workflow size={13} /> Apply to simulator
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-command-amber/30 bg-command-amber/8 px-4 py-2.5 text-[11px] text-command-amber">
          <AlertTriangle size={14} /> Backend unavailable — showing cached recommendations.
          <button onClick={refresh} className="ml-auto underline">Retry</button>
        </div>
      )}

      {/* Summary stat row */}
      <div className="mb-5 grid gap-4 sm:grid-cols-4">
        {PRIORITY_FILTERS.slice(1).map((p) => {
          const s = priorityStyle(p);
          return (
            <button
              key={p}
              onClick={() => setFilter(filter === p ? "ALL" : p)}
              className={cn(
                "command-panel rounded-xl p-4 text-left transition-all hover:-translate-y-0.5",
                filter === p && `${s.border} ${s.bg}`
              )}
            >
              <div className={cn("flex items-center gap-2 text-[9px] font-bold tracking-[0.16em]", s.text)}>
                <span className={cn("size-1.5 rounded-full", s.dot)} />{p}
              </div>
              <div className="mono-data mt-2 text-2xl font-semibold text-foreground">
                {loading && !data ? "—" : counts[p] ?? 0}
              </div>
              <div className="mt-1 text-[9px] text-muted-foreground">recommendations</div>
            </button>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex rounded-md border border-command-border bg-command/50 p-0.5">
          {PRIORITY_FILTERS.map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={cn(
                "rounded px-3 py-1.5 text-[9px] font-semibold transition-colors",
                filter === p ? "bg-command-cyan/15 text-command-cyan" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p}{p !== "ALL" && counts[p] ? ` (${counts[p]})` : ""}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {filtered.length} of {allRecs.length} recommendations
        </span>
      </div>

      {/* Cards */}
      {loading && !data ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="command-panel rounded-xl p-5 space-y-3">
              <SkeletonBlock className="h-3 w-16" />
              <SkeletonBlock className="h-5 w-full" />
              <SkeletonBlock className="h-4 w-4/5" />
              <SkeletonBlock className="h-4 w-3/5" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-command-border bg-command/30 py-16 text-center">
          <ShieldCheck size={32} className="mb-3 text-command-green" />
          <div className="text-[13px] font-semibold text-foreground">No {filter !== "ALL" ? filter.toLowerCase() : ""} recommendations</div>
          <div className="mt-1 text-[11px] text-muted-foreground">Current capacity is within safe operational parameters.</div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {filtered.map((item) => {
            const action = (item as import("@/types/api").ApiRecommendation).action ?? item.title;
            const s = priorityStyle(item.priority);
            return (
              <Panel
                key={action}
                className={cn("flex flex-col p-5 transition-all duration-300 hover:-translate-y-1", s.border, s.bg)}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("flex items-center gap-1.5 text-[9px] font-bold tracking-[0.17em]", s.text)}>
                    <span className={cn("size-1.5 rounded-full", s.dot)} />{item.priority}
                  </span>
                  <Sparkles size={14} className="text-command-cyan opacity-60" />
                </div>

                <h2 className="mt-4 text-[14px] font-semibold leading-6 text-foreground">{action}</h2>

                <div className="mt-4 flex-1 space-y-3 text-[10px]">
                  <div>
                    <span className="text-muted-foreground">Reason</span>
                    <p className="mt-1 leading-5 text-foreground">{item.reason}</p>
                  </div>
                  <div className="flex justify-between border-t border-command-border pt-3">
                    <span className="text-muted-foreground">Impact</span>
                    <RiskBadge risk={item.impact as import("@/types/api").RiskLevel} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected improvement</span>
                    <span className="font-mono text-command-green">{item.improvement}</span>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <Button size="sm" className="flex-1 bg-command-cyan text-primary-foreground text-[10px]" onClick={onSimulator}>Apply scenario</Button>
                  <Button size="sm" variant="outline" className="border-command-border text-[10px]"><CircleHelp size={12} /> Analysis</Button>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Report definitions & generators ─────────────────────────────────────────

const REPORT_DEFS = [
  {
    id: "daily-capacity",
    title: "Daily Capacity Report",
    description: "System-wide bed, ICU, CT, lab and OR utilization with AI forecast summary.",
    date: "SEP 10",
    category: "CAPACITY",
  },
  {
    id: "weekly-bottleneck",
    title: "Weekly Bottleneck Report",
    description: "Predicted resource constraints, time-to-overload, and propagation impact chains.",
    date: "SEP 9",
    category: "BOTTLENECK",
  },
  {
    id: "resource-efficiency",
    title: "Resource Efficiency Report",
    description: "Underutilized assets, redistribution opportunities, and efficiency signals.",
    date: "SEP 8",
    category: "EFFICIENCY",
  },
  {
    id: "forecast-accuracy",
    title: "Forecast Accuracy Report",
    description: "AI model confidence, prediction vs actual utilization, and calibration metrics.",
    date: "SEP 7",
    category: "FORECAST",
  },
  {
    id: "scenario-analysis",
    title: "Scenario Analysis Report",
    description: "Simulation outcomes, risk projections, and recommended operational responses.",
    date: "SEP 6",
    category: "SCENARIO",
  },
] as const;

type ReportId = typeof REPORT_DEFS[number]["id"];

function buildReportRows(id: ReportId): string[][] {
  switch (id) {
    case "daily-capacity":
      return [
        ["Resource", "Department", "Utilization %", "Capacity", "Trend", "Risk", "Forecast Peak %"],
        ...resources.map((r) => [r.name, r.department, String(r.utilization), r.capacity, r.trend, r.risk, String(Math.min(100, r.utilization + 8))]),
        [""],
        ["Hospital Score", String(hospital.capacityScore), "Risk", "MODERATE", "Predicted Peak", String(hospital.predictedPeak) + "%", "Time to Critical", hospital.timeToCritical],
      ];
    case "weekly-bottleneck":
      return [
        ["Resource", "Department", "Current %", "Predicted Peak %", "Capacity", "Time to Overload", "Risk", "Impact Chain"],
        ...bottlenecks.map((b) => [b.resource, b.department, String(b.current), String(b.peak), b.capacity, b.time, b.risk, b.impact]),
      ];
    case "resource-efficiency":
      return [
        ["Resource", "Department", "Utilization %", "Available Capacity %", "Trend", "Risk", "AI Recommendation"],
        ...resources.map((r) => [
          r.name, r.department, String(r.utilization), String(100 - r.utilization), r.trend, r.risk,
          r.utilization < 60 ? "Redistribute workload to this resource" : r.utilization > 85 ? "Reduce load — approaching critical" : "Operating within normal range",
        ]),
      ];
    case "forecast-accuracy":
      return [
        ["Time Horizon", "Actual %", "Forecast %", "Confidence Band Low", "Confidence Band High", "Accuracy %"],
        ...mockForecast.map((p) => [
          p.time,
          p.actual != null ? String(p.actual) : "—",
          String(p.forecast),
          String(p.low),
          String(p.high),
          p.actual != null ? String(Math.round(100 - Math.abs(p.forecast - p.actual))) : "—",
        ]),
        [""],
        ["Model Confidence", "92.4%", "Horizon", "8h", "Engine", "RandomForest + Live Data"],
      ];
    case "scenario-analysis":
      return [
        ["Priority", "Action", "Reason", "Impact", "Expected Improvement"],
        ...recommendations.map((r) => [r.priority, r.title, r.reason, r.impact, r.improvement]),
        [""],
        ["Scenario", "Beds %", "Emergency %", "CT %", "Lab %", "ICU %"],
        ["Normal Day",       "72", "68", "71", "64", "61"],
        ["Patient Surge +30%","82", "80", "78", "74", "69"],
        ["Flu Outbreak",     "90", "88", "70", "84", "74"],
        ["Mass Casualty",    "96", "95", "108","89", "78"],
      ];
  }
}

function buildReportViewSections(id: ReportId): { heading: string; rows: { label: string; value: string; tone?: string }[] }[] {
  switch (id) {
    case "daily-capacity":
      return [
        {
          heading: "Hospital Capacity Overview",
          rows: [
            { label: "Capacity Score",    value: `${hospital.capacityScore} / 100`,  tone: "amber" },
            { label: "Current Utilization", value: `${hospital.currentUtilization}%`, tone: "cyan" },
            { label: "Predicted Peak",    value: `${hospital.predictedPeak}%`,        tone: "red" },
            { label: "Time to Critical",  value: hospital.timeToCritical,             tone: "red" },
            { label: "Risk Level",        value: "MODERATE",                          tone: "amber" },
          ],
        },
        {
          heading: "Resource Utilization",
          rows: resources.map((r) => ({ label: r.name, value: `${r.utilization}% · ${r.risk}`, tone: r.risk === "CRITICAL" ? "red" : r.risk === "HIGH" ? "amber" : "cyan" })),
        },
      ];
    case "weekly-bottleneck":
      return [
        {
          heading: "Detected Bottlenecks",
          rows: bottlenecks.map((b) => ({ label: b.resource, value: `${b.current}% → ${b.peak}% · Overload in ${b.time}`, tone: b.risk === "CRITICAL" ? "red" : "amber" })),
        },
        {
          heading: "Propagation Impact",
          rows: bottlenecks.map((b) => ({ label: b.resource, value: b.impact })),
        },
      ];
    case "resource-efficiency":
      return [
        {
          heading: "Utilization Summary",
          rows: resources.map((r) => ({ label: r.name, value: `${r.utilization}% used · ${100 - r.utilization}% available`, tone: r.utilization < 60 ? "green" : r.utilization > 85 ? "red" : "cyan" })),
        },
        {
          heading: "Underutilized Resources",
          rows: resources.filter((r) => r.utilization < 60).map((r) => ({ label: r.name, value: `${100 - r.utilization}% capacity available`, tone: "green" })),
        },
      ];
    case "forecast-accuracy":
      return [
        {
          heading: "Forecast vs Actual",
          rows: mockForecast.filter((p) => p.actual != null).map((p) => ({ label: p.time, value: `Actual ${p.actual}% · Forecast ${p.forecast}%`, tone: "cyan" })),
        },
        {
          heading: "Model Metrics",
          rows: [
            { label: "Confidence",    value: "92.4%",                    tone: "green" },
            { label: "Horizon",       value: "8 hours",                  tone: "cyan" },
            { label: "Engine",        value: "RandomForest + Live Data", tone: "cyan" },
            { label: "Peak Forecast", value: `${hospital.predictedPeak}%`, tone: "amber" },
          ],
        },
      ];
    case "scenario-analysis":
      return [
        {
          heading: "AI Recommendations",
          rows: recommendations.map((r) => ({ label: r.priority, value: r.title, tone: r.priority === "URGENT" ? "red" : r.priority === "OPTIMIZATION" ? "amber" : "cyan" })),
        },
        {
          heading: "Scenario Projections",
          rows: [
            { label: "Normal Day",        value: "Beds 72% · ER 68% · CT 71%",  tone: "green" },
            { label: "Patient Surge +30%", value: "Beds 82% · ER 80% · CT 78%",  tone: "amber" },
            { label: "Flu Outbreak",      value: "Beds 90% · ER 88% · CT 70%",  tone: "red" },
            { label: "Mass Casualty",     value: "Beds 96% · ER 95% · CT 108%", tone: "red" },
          ],
        },
      ];
  }
}

function downloadCSV(id: ReportId, title: string) {
  const rows = buildReportRows(id);
  const header = `CareCast AI — ${title}\nGenerated: ${new Date().toLocaleString()}\nHospital: Healthcare Support\n\n`;
  const csv = header + rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `carecast-${id}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadAllCSV() {
  const sections = REPORT_DEFS.map((r) => {
    const rows = buildReportRows(r.id);
    return [`=== ${r.title} ===`, ...rows.map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")), ""];
  }).flat();
  const header = `CareCast AI — Full Intelligence Export\nGenerated: ${new Date().toLocaleString()}\n\n`;
  const blob = new Blob([header + sections.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `carecast-full-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportViewModal({ report, onClose }: { report: typeof REPORT_DEFS[number]; onClose: () => void }) {
  const sections = buildReportViewSections(report.id);
  const toneClass = (t?: string) =>
    t === "red" ? "text-command-red" : t === "amber" ? "text-command-amber" : t === "green" ? "text-command-green" : "text-command-cyan";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-command-border bg-command shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-command-border bg-command px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-command-cyan">
              <FileBarChart size={13} /> {report.category} · {report.date}
            </div>
            <h2 className="mt-1 text-[16px] font-bold text-foreground">{report.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="bg-command-cyan text-primary-foreground text-[10px]" onClick={() => downloadCSV(report.id, report.title)}>
              <Download size={13} /> Export CSV
            </Button>
            <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Meta */}
        <div className="border-b border-command-border/60 bg-command-cyan/5 px-6 py-3 text-[10px] text-muted-foreground">
          Generated from the CareCast AI operational intelligence model · Healthcare Support · {new Date().toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>

        {/* Sections */}
        <div className="space-y-6 p-6">
          {sections.map((section) => (
            <div key={section.heading}>
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-command-cyan">{section.heading}</div>
              <div className="overflow-hidden rounded-lg border border-command-border">
                {section.rows.map((row, i) => (
                  <div
                    key={row.label + i}
                    className={cn(
                      "flex items-center justify-between px-4 py-2.5 text-[11px]",
                      i % 2 === 0 ? "bg-command/60" : "bg-command-raised/40"
                    )}
                  >
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className={cn("font-mono font-semibold", toneClass(row.tone))}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-command-border px-6 py-4 text-[9px] text-muted-foreground">
          CareCast AI · Predictive Capacity Intelligence · Healthcare Support
        </div>
      </div>
    </div>
  );
}

function ReportsPage() {
  const [viewing, setViewing] = useState<typeof REPORT_DEFS[number] | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      downloadAllCSV();
    }, 1200);
  };

  return (
    <div className="pb-10">
      {viewing && <ReportViewModal report={viewing} onClose={() => setViewing(null)} />}

      <PageHeader
        eyebrow="Review / Intelligence archive"
        title="Hospital Intelligence Reports"
        subtitle="Decision-ready summaries for daily operations and leadership review."
        action={
          <Button
            size="sm"
            className="bg-command-cyan text-primary-foreground text-[10px]"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? <><Loader2 size={13} className="animate-spin" /> Generating…</> : <><FileText size={13} /> Generate report</>}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_DEFS.map((report, index) => (
          <Panel key={report.id} className="group flex flex-col p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-command-cyan/40">
            <div className="flex items-start justify-between">
              <div className="grid size-10 place-items-center rounded-lg bg-command-cyan/10 text-command-cyan">
                <FileBarChart size={18} />
              </div>
              <span className="mono-data text-[9px] text-muted-foreground">{report.date}</span>
            </div>
            <h2 className="mt-4 text-[13px] font-semibold text-foreground">{report.title}</h2>
            <p className="mt-2 flex-1 text-[10px] leading-5 text-muted-foreground">{report.description}</p>
            <div className="mt-5 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-command-border text-[10px] hover:border-command-cyan/50 hover:text-command-cyan"
                onClick={() => setViewing(report)}
              >
                <FileText size={12} /> View
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-[10px] text-command-cyan hover:bg-command-cyan/10"
                onClick={() => downloadCSV(report.id, report.title)}
              >
                <Download size={12} /> Export
              </Button>
            </div>
          </Panel>
        ))}
      </div>

      <div className="mt-5 command-panel rounded-xl p-5">
        <div className="flex items-center gap-3">
          <TableProperties size={18} className="text-command-cyan" />
          <div>
            <div className="text-[12px] font-semibold text-foreground">Export Intelligence Center</div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              Download comprehensive capacity logs, predictive forecasts, and incident summaries in standard CSV format.
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto border-command-border text-[10px] hover:border-command-cyan/50 hover:text-command-cyan"
            onClick={downloadAllCSV}
          >
            <Download size={13} /> Download CSV
          </Button>
        </div>
      </div>
    </div>
  );
}
