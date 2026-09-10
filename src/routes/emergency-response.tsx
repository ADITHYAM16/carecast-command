import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  BedDouble,
  Bell,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  Gauge,
  HeartPulse,
  LayoutDashboard,
  Menu,
  Moon,
  Network,
  ShieldCheck,
  Siren,
  Sparkles,
  Sun,
  TriangleAlert,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { HealthcareBackground } from "@/components/healthcare-background";
import { EmergencyResponseView } from "@/components/emergency-response-view";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/emergency-response")({
  head: () => ({
    meta: [
      { title: "CareCast AI — Emergency Response Network" },
      {
        name: "description",
        content:
          "Accident triage, real-time capacity analysis, AI bottleneck prediction, and targeted clinical team alerts.",
      },
      {
        property: "og:title",
        content: "CareCast AI — Emergency Response Network",
      },
      {
        property: "og:description",
        content:
          "Predictive capacity intelligence for emergency response & trauma operations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  component: EmergencyResponsePage,
});

type NavView =
  | "Command Center"
  | "Emergency Response"
  | "Capacity Forecast"
  | "Bottlenecks"
  | "Dependency Network"
  | "Scenario Simulator"
  | "Resource Intelligence"
  | "Procedures & Scheduling"
  | "AI Recommendations"
  | "Reports";

const navItems: { label: NavView; icon: typeof LayoutDashboard }[] = [
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

function EmergencyResponsePage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme, toggleTheme } = useTheme();

  const handleNavSelect = (label: NavView) => {
    if (label === "Emergency Response") return;
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-command text-foreground">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-command-border bg-sidebar transition-[width] duration-300 lg:flex",
            sidebarOpen ? "w-[254px]" : "w-[76px]"
          )}
        >
          <div
            className={cn(
              "flex h-[68px] items-center border-b border-sidebar-border",
              sidebarOpen ? "px-5" : "justify-center px-2"
            )}
          >
            {sidebarOpen && (
              <div className="min-w-0">
                <div className="text-[14px] font-extrabold tracking-[0.18em] text-foreground">
                  CARECAST <span className="text-command-cyan">AI</span>
                </div>
                <div className="mt-0.5 whitespace-nowrap text-[9px] font-medium tracking-[0.2em] text-muted-foreground">
                  PREDICT • PREPARE • PREVENT
                </div>
              </div>
            )}
          </div>

          <div className={cn("px-3 pt-6", !sidebarOpen && "px-2")}>
            {sidebarOpen && (
              <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Operations
              </div>
            )}
            <nav className="space-y-1">
              {navItems.map(({ label, icon: Icon }) => {
                const isActive = label === "Emergency Response";
                return (
                  <button
                    key={label}
                    title={sidebarOpen ? undefined : label}
                    onClick={() => handleNavSelect(label)}
                    className={cn(
                      "group flex w-full items-center rounded-lg text-left text-[12px] font-medium transition-colors",
                      sidebarOpen ? "gap-3 px-3 py-2.5" : "justify-center px-2 py-3",
                      isActive
                        ? "bg-command-red/15 text-command-red shadow-[inset_2px_0_0_var(--color-command-red)]"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon
                      size={17}
                      strokeWidth={isActive ? 2.25 : 1.8}
                      className={isActive ? "animate-pulse text-command-red" : ""}
                    />
                    <span className={cn("whitespace-nowrap", !sidebarOpen && "sr-only")}>
                      {label}
                    </span>
                    {label === "Emergency Response" && sidebarOpen && (
                      <span className="ml-auto rounded-full bg-command-red/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-command-red">
                        LIVE
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className={cn("mt-auto border-t border-sidebar-border p-3", !sidebarOpen && "px-2")}>
            {sidebarOpen && (
              <div className="mb-4 rounded-lg border border-command-green/20 bg-command-green/5 p-3">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-command-green">
                  <span className="status-pulse size-1.5 rounded-full bg-command-green" />
                  System status
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <ShieldCheck size={14} className="text-command-green" /> AI engine operational
                </div>
                <div className="mt-2 flex justify-between text-[9px] text-muted-foreground">
                  <span>UPTIME</span>
                  <span className="mono-data text-foreground">99.98%</span>
                </div>
              </div>
            )}
            <button
              className={cn(
                "flex w-full items-center rounded-lg text-left hover:bg-sidebar-accent",
                sidebarOpen ? "gap-3 p-2" : "justify-center p-2"
              )}
              title="Admin profile"
            >
              <div className="grid size-8 shrink-0 place-items-center rounded-full border border-command-cyan/30 bg-command-cyan/10 text-xs font-bold text-command-cyan">
                MA
              </div>
              {sidebarOpen && (
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-semibold text-foreground">
                    M.ADITHYA
                  </div>
                  <div className="text-[10px] text-muted-foreground">Admin</div>
                </div>
              )}
            </button>
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="mt-3 hidden w-full items-center justify-center rounded-md border border-sidebar-border p-2 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground lg:flex"
              title={sidebarOpen ? "Collapse navigation" : "Expand navigation"}
            >
              {sidebarOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="min-w-0 flex-1">
          {/* Topbar */}
          <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-command-border bg-command/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground lg:hidden"
                onClick={() => setSidebarOpen((v) => !v)}
              >
                <Menu />
              </Button>
              <div className="hidden size-8 items-center justify-center rounded-lg bg-command-red/10 text-command-red sm:flex">
                <Siren size={18} className="animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-[12px] font-semibold text-foreground sm:text-[13px]">
                  Hospital Management — Emergency Response Network
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                  <span className="status-pulse size-1.5 rounded-full bg-command-red" />
                  Trauma Divert Status: <span className="font-bold text-command-amber">STANDBY</span>{" "}
                  <span className="hidden text-command-border sm:inline">•</span>
                  <span className="hidden sm:inline">EOC Console 01</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-6">
              <div className="hidden items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:flex">
                <BrainCircuit size={15} className="text-command-cyan" /> Emergency routing{" "}
                <span className="font-semibold text-command-red">ACTIVE</span>
              </div>
              <div className="hidden text-right sm:block">
                <div className="mono-data text-[11px] text-foreground">
                  THU, SEP 10 · 06:49
                </div>
                <div className="mt-0.5 text-[9px] text-muted-foreground">
                  LOCAL TIME · UTC +05:30
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                onClick={toggleTheme}
                title={
                  theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
                }
              >
                {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="relative text-muted-foreground hover:text-foreground"
              >
                <Bell size={17} />
                <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-command-red animate-ping" />
              </Button>

              <div className="grid size-8 place-items-center rounded-full border border-command-cyan/30 bg-command-cyan/10 text-[10px] font-bold text-command-cyan">
                MA
              </div>
            </div>
          </header>

          <main className="relative min-h-[calc(100vh-68px)] px-4 py-5 sm:px-6 lg:px-8 overflow-hidden">
            <HealthcareBackground />
            <div className="relative z-10 mx-auto max-w-[1560px]">
              <EmergencyResponseView
                onOpenSimulator={() => (window.location.href = "/")}
                onOpenNetwork={() => (window.location.href = "/")}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
