import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  Ambulance,
  ArrowRight,
  BedDouble,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  HeartPulse,
  Layers,
  MapPin,
  Microscope,
  Plus,
  Radio,
  ScanLine,
  Send,
  ShieldAlert,
  Siren,
  Sparkles,
  Stethoscope,
  Timer,
  UserCheck,
  Users,
  Workflow,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  EmergencyCase,
  EmergencySeverity,
  AlertLifecycleStep,
  emergencyCapacitySnapshot,
  initialEmergencyCases,
  emergencyLifecycleStages,
  emergencyPropagationImpact,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface EmergencyResponseViewProps {
  onOpenSimulator?: (surge?: number) => void;
  onOpenNetwork?: () => void;
}

export function EmergencyResponseView({
  onOpenSimulator,
  onOpenNetwork,
}: EmergencyResponseViewProps) {
  const [cases, setCases] = useState<EmergencyCase[]>(initialEmergencyCases);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(
    initialEmergencyCases[0].id
  );
  const [intakeModalOpen, setIntakeModalOpen] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(12 * 60);
  const [escalationTimer, setEscalationTimer] = useState(48);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [auditLog, setAuditLog] = useState<string[]>([
    "06:42:01 — Incident telemetry logged via Regional EMS Dispatch",
    "06:42:15 — Predictive engine routed notifications to 5 clinical response units",
    "06:42:18 — Emergency Operations Coordinator confirmed initial intake",
    "06:43:02 — ICU Charge Physician acknowledged critical bed reservation",
    "06:44:11 — Trauma Surgery Unit confirmed OR-03 surgical prep",
  ]);

  // Intake Form State
  const [newCase, setNewCase] = useState({
    incidentType: "",
    patientCount: 2,
    severity: "CRITICAL" as EmergencySeverity,
    etaMinutes: 10,
    location: "",
    injurySummary: "",
  });

  const activeCase = useMemo(() => {
    return cases.find((c) => c.id === selectedCaseId) || cases[0];
  }, [cases, selectedCaseId]);

  // ETA Ticking Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Escalation Countdown Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setEscalationTimer((prev) => {
        if (prev <= 1) {
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle Lifecycle Progression
  const advanceLifecycle = (step: AlertLifecycleStep) => {
    setCases((prev) =>
      prev.map((c) => (c.id === activeCase.id ? { ...c, lifecycle: step } : c))
    );
    const now = new Date().toLocaleTimeString();
    setAuditLog((prev) => [
      `${now} — Status transitioned to [${step}] for ${activeCase.id}`,
      ...prev,
    ]);
  };

  // Handle Doctor Acknowledgment
  const handleAcknowledgeAlert = () => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== activeCase.id) return c;
        const updatedRoles = c.roles.map((r) =>
          r.role === "Emergency Doctor"
            ? {
                ...r,
                status: "ACKNOWLEDGED" as const,
                ackTime: new Date().toLocaleTimeString(),
              }
            : r
        );
        const updatedEscalation = c.escalation.map((e) =>
          e.tier === 1 ? { ...e, status: "ACKNOWLEDGED" as const } : e
        );
        return {
          ...c,
          lifecycle:
            c.lifecycle === "DELIVERED" || c.lifecycle === "SENT"
              ? "ACKNOWLEDGED"
              : c.lifecycle,
          roles: updatedRoles,
          escalation: updatedEscalation,
        };
      })
    );
    setAuditLog((prev) => [
      `${new Date().toLocaleTimeString()} — Attending Emergency Physician ACKNOWLEDGED alert via Mobile Console`,
      ...prev,
    ]);
    setShowDoctorModal(false);
  };

  // Create new emergency incident
  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCase.incidentType) return;

    const id = `EMG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const createdCase: EmergencyCase = {
      id,
      incidentType: newCase.incidentType,
      patientCount: Number(newCase.patientCount),
      severity: newCase.severity,
      etaMinutes: Number(newCase.etaMinutes),
      location: newCase.location || "Regional Transit Corridor",
      injurySummary:
        newCase.injurySummary ||
        "Incoming multi-system trauma patients reported by EMS field triage.",
      triage: {
        critical: Math.max(1, Math.floor(newCase.patientCount * 0.6)),
        urgent: Math.floor(newCase.patientCount * 0.3),
        delayed: Math.max(0, newCase.patientCount - Math.floor(newCase.patientCount * 0.9)),
      },
      vitalsPreview: `Triage: Red: ${Math.max(1, Math.floor(newCase.patientCount * 0.6))}, Yellow: ${Math.floor(newCase.patientCount * 0.3)}`,
      lifecycle: "SENT",
      reportedAt: new Date().toLocaleTimeString(),
      hospitalRisk: newCase.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
      roles: [
        {
          id: "r1",
          role: "Emergency Doctor",
          department: "Emergency Dept",
          assignee: "Dr. Sarah Chen, MD (Trauma Attending)",
          status: "DELIVERED",
          action: "Prepare Resuscitation Bay 1 & rapid infuser units",
          urgency: "CRITICAL",
        },
        {
          id: "r2",
          role: "Trauma Surgical Team",
          department: "Trauma Surgery",
          assignee: "Alpha Trauma Unit",
          status: "PENDING",
          action: "Hold OR Suite & surgical team on standby",
          urgency: "CRITICAL",
        },
        {
          id: "r3",
          role: "ICU Resuscitation Team",
          department: "Critical Care",
          assignee: "Neuro-ICU On-Duty",
          status: "PENDING",
          action: "Reserve ICU beds with ventilator support",
          urgency: "HIGH",
        },
        {
          id: "r4",
          role: "Radiology Team",
          department: "Imaging",
          assignee: "CT Suite 1",
          status: "DELIVERED",
          action: "Clear CT scanner queue for prioritized pan-scan",
          urgency: "CRITICAL",
        },
        {
          id: "r5",
          role: "Hospital Emergency Coordinator",
          department: "Command Ops",
          assignee: "M. ADITHYA (Admin Coordinator)",
          status: "ACKNOWLEDGED",
          action: "Coordinate bed availability & resource divert protocols",
          ackTime: new Date().toLocaleTimeString(),
          urgency: "HIGH",
        },
      ],
      escalation: [
        {
          tier: 1,
          level: "Primary Tier",
          role: "Primary Trauma Attending",
          name: "Dr. Sarah Chen",
          contact: "Ext. 4401",
          timeoutSeconds: 60,
          status: "ACTIVE",
        },
        {
          tier: 2,
          level: "Secondary Backup",
          role: "On-Call Trauma Specialist",
          name: "Dr. Michael Torres",
          contact: "Ext. 4408",
          timeoutSeconds: 120,
          status: "PENDING",
        },
        {
          tier: 3,
          level: "Command Escalation",
          role: "Hospital Emergency Coordinator",
          name: "M. ADITHYA (Admin Ops)",
          contact: "Command Desk #1",
          timeoutSeconds: 180,
          status: "PENDING",
        },
      ],
    };

    setCases((prev) => [createdCase, ...prev]);
    setSelectedCaseId(id);
    setCountdownSeconds(Number(newCase.etaMinutes) * 60);
    setIntakeModalOpen(false);
    setAuditLog((prev) => [
      `${new Date().toLocaleTimeString()} — NEW EMERGENCY CASE LOGGED: ${id} (${createdCase.incidentType})`,
      ...prev,
    ]);
  };

  // Forecast Comparison Chart Data
  const impactChartData = [
    { time: "T-30m", baseline: 76, surge: 76 },
    { time: "Now (Alert)", baseline: 78, surge: 78 },
    { time: "+15m (Arrival)", baseline: 79, surge: 92 },
    { time: "+30m (Peak Scan)", baseline: 81, surge: 98 },
    { time: "+1h (OR/ICU)", baseline: 82, surge: 104 },
    { time: "+2h (Stabilize)", baseline: 84, surge: 96 },
    { time: "+3h", baseline: 83, surge: 89 },
  ];

  return (
    <div className="space-y-6 pb-14 text-foreground">
      {/* Top Banner & Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-command-border/80 pb-5 lg:flex-row lg:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-command-red">
            <span className="status-pulse size-2 rounded-full bg-command-red" />
            Live Emergency Response Network
          </div>
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-foreground sm:text-3xl">
            Emergency Response Command
          </h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Accident intake, real-time capacity analysis, AI bottleneck prediction, and targeted clinical team dispatch.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => setShowDoctorModal(true)}
            variant="outline"
            size="sm"
            className="border-command-cyan/30 bg-command-cyan/10 text-[11px] font-semibold text-command-cyan hover:bg-command-cyan/20"
          >
            <Stethoscope size={14} className="mr-1.5" /> Doctor Notification Console
          </Button>

          <Button
            onClick={() => setIntakeModalOpen(true)}
            size="sm"
            className="bg-command-red text-white shadow-[0_0_20px_var(--color-command-red)] hover:bg-command-red/90 text-[11px] font-semibold"
          >
            <Plus size={14} className="mr-1.5" /> Report New Emergency
          </Button>
        </div>
      </div>

      {/* Incident Switcher Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mr-1">
          Active Cases:
        </span>
        {cases.map((c) => {
          const isActive = c.id === selectedCaseId;
          return (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCaseId(c.id);
                setCountdownSeconds(c.etaMinutes * 60);
              }}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-lg border px-3.5 py-2 text-left transition-all",
                isActive
                  ? "border-command-red/60 bg-command-red/12 shadow-[0_0_15px_oklch(0.67_0.2_27/15%)]"
                  : "border-command-border/70 bg-command/40 text-muted-foreground hover:border-command-border hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "size-2 rounded-full",
                  c.severity === "CRITICAL"
                    ? "bg-command-red animate-ping"
                    : c.severity === "HIGH"
                    ? "bg-command-amber"
                    : "bg-command-cyan"
                )}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-foreground">
                    {c.id}
                  </span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.2 text-[8px] font-bold uppercase",
                      c.severity === "CRITICAL"
                        ? "bg-command-red/20 text-command-red"
                        : "bg-command-amber/20 text-command-amber"
                    )}
                  >
                    {c.severity}
                  </span>
                </div>
                <div className="truncate text-[10px] text-muted-foreground max-w-[180px]">
                  {c.incidentType}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Hero: Intelligent Alert Card */}
      <div className="relative overflow-hidden rounded-2xl border border-command-red/45 bg-gradient-to-br from-command-red/15 via-command/80 to-command-panel p-5 shadow-[0_10px_40px_oklch(0.67_0.2_27/12%)] sm:p-6">
        <div className="absolute -right-20 -top-20 size-72 rounded-full bg-command-red/15 blur-3xl" />
        <div className="absolute inset-y-0 left-0 w-1.5 bg-command-red shadow-[0_0_24px_var(--color-command-red)]" />

        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex items-center gap-1.5 rounded-md border border-command-red/40 bg-command-red/25 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-command-red">
                <Siren size={13} className="animate-pulse" /> CRITICAL TRAUMA ALERT
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                CASE ID · {activeCase.id}
              </span>
              <span className="flex items-center gap-1 rounded bg-command-border/50 px-2 py-0.5 text-[9px] text-muted-foreground">
                <MapPin size={11} className="text-command-cyan" /> {activeCase.location}
              </span>
            </div>

            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {activeCase.patientCount} critical {activeCase.patientCount === 1 ? "patient" : "patients"} arriving in approx {activeCase.etaMinutes} minutes
            </h2>

            <p className="text-[12px] leading-relaxed text-muted-foreground/90">
              <strong className="text-foreground">{activeCase.incidentType}:</strong>{" "}
              {activeCase.injurySummary}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Users size={13} className="text-command-cyan" />
                <span>Triage Breakdown:</span>
                <span className="font-mono font-semibold text-command-red">
                  {activeCase.triage.critical} Red
                </span>
                <span>•</span>
                <span className="font-mono font-semibold text-command-amber">
                  {activeCase.triage.urgent} Yellow
                </span>
                <span>•</span>
                <span className="font-mono font-semibold text-command-green">
                  {activeCase.triage.delayed} Green
                </span>
              </div>
              <div className="hidden sm:block text-command-border">•</div>
              <div className="mono-data text-[10px] text-command-cyan">
                {activeCase.vitalsPreview}
              </div>
            </div>
          </div>

          {/* Right side: Countdown & Action */}
          <div className="flex flex-row items-center justify-between gap-5 border-t border-command-border/60 pt-4 xl:flex-col xl:items-end xl:border-t-0 xl:pt-0">
            <div className="text-left xl:text-right">
              <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground xl:justify-end">
                <Timer size={12} className="text-command-red" /> Estimated Arrival (ETA)
              </div>
              <div className="mono-data mt-1 text-3xl font-black text-command-red sm:text-4xl drop-shadow-[0_0_12px_var(--color-command-red)]">
                {formatCountdown(countdownSeconds)}
              </div>
              <div className="text-[9px] text-muted-foreground">
                Inbound via Ground EMS Unit 14
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setShowDoctorModal(true)}
                size="sm"
                className="bg-command-red text-white hover:bg-command-red/90 text-[11px] font-bold shadow-md"
              >
                <UserCheck size={13} className="mr-1" /> Acknowledge Alert
              </Button>
              {onOpenSimulator && (
                <Button
                  onClick={() => onOpenSimulator(activeCase.patientCount * 15 + 20)}
                  size="sm"
                  variant="outline"
                  className="border-command-border bg-command/60 text-[10px]"
                >
                  <Workflow size={13} className="mr-1" /> Simulate Surge
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section: Alert Lifecycle 8-Stage Timeline */}
      <div className="command-panel rounded-xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-command-border/70 pb-3">
          <div>
            <h2 className="text-[12px] font-bold uppercase tracking-[0.15em] text-foreground flex items-center gap-2">
              <Clock size={15} className="text-command-cyan" /> Alert Lifecycle & Response Progression
            </h2>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              End-to-end response tracking from accident notification to clinical stabilization
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] text-muted-foreground">Advance stage:</span>
            <div className="flex rounded-md border border-command-border bg-command/50 p-0.5">
              {(
                [
                  "ACKNOWLEDGED",
                  "PREPARING",
                  "READY",
                  "PATIENT ARRIVED",
                  "RESOLVED",
                ] as AlertLifecycleStep[]
              ).map((step) => (
                <button
                  key={step}
                  onClick={() => advanceLifecycle(step)}
                  className={cn(
                    "rounded px-2 py-0.5 text-[8px] font-bold uppercase transition-colors",
                    activeCase.lifecycle === step
                      ? "bg-command-cyan text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {step.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Visual 8-Step Timeline */}
        <div className="overflow-x-auto pb-2 pt-2">
          <div className="flex min-w-[760px] items-center justify-between relative">
            <div className="absolute left-6 right-6 top-4 h-0.5 bg-command-border -z-0" />
            {emergencyLifecycleStages.map((stage, idx) => {
              const currentIdx = emergencyLifecycleStages.findIndex(
                (s) => s.key === activeCase.lifecycle
              );
              const isPast = idx <= currentIdx;
              const isCurrent = idx === currentIdx;

              return (
                <div
                  key={stage.key}
                  className="relative z-10 flex flex-col items-center text-center cursor-pointer group"
                  onClick={() => advanceLifecycle(stage.key)}
                >
                  <div
                    className={cn(
                      "grid size-8 place-items-center rounded-full border-2 transition-all",
                      isCurrent
                        ? "border-command-cyan bg-command-cyan text-primary-foreground shadow-[0_0_15px_var(--color-command-cyan)] scale-110"
                        : isPast
                        ? "border-command-teal bg-command-teal/20 text-command-teal"
                        : "border-command-border bg-command text-muted-foreground"
                    )}
                  >
                    {isPast && !isCurrent ? (
                      <CheckCircle2 size={15} />
                    ) : (
                      <span className="font-mono text-[10px] font-bold">
                        {idx + 1}
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5 text-[10px] font-bold text-foreground whitespace-nowrap">
                    {stage.label}
                  </div>
                  <div className="text-[8px] text-muted-foreground max-w-[85px] leading-tight">
                    {stage.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 2: Real-time Emergency Capacity Analysis */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[12px] font-bold uppercase tracking-[0.16em] text-foreground flex items-center gap-2">
              <HeartPulse size={15} className="text-command-cyan" /> Emergency Capacity Analysis
            </h2>
            <p className="text-[10px] text-muted-foreground">
              Live hospital resource availability vs incoming trauma load
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1 rounded bg-command-green/10 border border-command-green/30 px-2 py-0.5 text-command-green font-semibold">
              READY
            </span>
            <span className="flex items-center gap-1 rounded bg-command-amber/10 border border-command-amber/30 px-2 py-0.5 text-command-amber font-semibold">
              LIMITED
            </span>
            <span className="flex items-center gap-1 rounded bg-command-red/10 border border-command-red/30 px-2 py-0.5 text-command-red font-semibold">
              CRITICAL
            </span>
          </div>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {emergencyCapacitySnapshot.map((item) => {
            const isCritical = item.status === "CRITICAL";
            const isLimited = item.status === "LIMITED";
            const statusTone = isCritical
              ? "text-command-red border-command-red/30 bg-command-red/10"
              : isLimited
              ? "text-command-amber border-command-amber/30 bg-command-amber/10"
              : "text-command-green border-command-green/30 bg-command-green/10";

            const Icon =
              item.icon === "bed"
                ? BedDouble
                : item.icon === "icu"
                ? HeartPulse
                : item.icon === "ct"
                ? ScanLine
                : item.icon === "mri"
                ? Radio
                : item.icon === "lab"
                ? Microscope
                : ShieldAlert;

            return (
              <div
                key={item.id}
                className={cn(
                  "command-panel rounded-xl p-4 transition-all hover:border-command-cyan/40",
                  isCritical && "border-command-red/35 bg-command-red/[0.03]"
                )}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      "grid size-8 place-items-center rounded-lg",
                      isCritical
                        ? "bg-command-red/15 text-command-red"
                        : isLimited
                        ? "bg-command-amber/15 text-command-amber"
                        : "bg-command-cyan/15 text-command-cyan"
                    )}
                  >
                    <Icon size={16} />
                  </div>
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 text-[8px] font-extrabold tracking-wider",
                      statusTone
                    )}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="mt-3 truncate text-[11px] font-bold text-foreground">
                  {item.resource}
                </div>
                <div className="text-[9px] text-muted-foreground">
                  {item.department}
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <span className="mono-data text-xl font-bold text-foreground">
                    {item.available}{" "}
                    <span className="text-[10px] font-normal text-muted-foreground">
                      / {item.total} free
                    </span>
                  </span>
                  <span
                    className={cn(
                      "mono-data text-[10px] font-semibold",
                      isCritical
                        ? "text-command-red"
                        : isLimited
                        ? "text-command-amber"
                        : "text-command-green"
                    )}
                  >
                    {item.utilization}%
                  </span>
                </div>

                <div className="mt-2 h-1 overflow-hidden rounded-full bg-command-border">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      isCritical
                        ? "bg-command-red"
                        : isLimited
                        ? "bg-command-amber"
                        : "bg-command-green"
                    )}
                    style={{ width: `${item.utilization}%` }}
                  />
                </div>

                <p className="mt-2.5 line-clamp-2 text-[9px] text-muted-foreground leading-tight">
                  {item.detail}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2-Column Section: Role-Based Routing & Automated Escalation */}
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        {/* Left: Role-Based Intelligent Alert Routing */}
        <div className="command-panel rounded-xl p-5">
          <div className="flex items-center justify-between border-b border-command-border/70 pb-3">
            <div>
              <h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-foreground flex items-center gap-2">
                <Users size={15} className="text-command-cyan" /> Role-Based Emergency Routing
              </h2>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Targeted alerts dispatched directly to assigned clinical personnel
              </p>
            </div>
            <span className="rounded-full bg-command-cyan/10 border border-command-cyan/20 px-2 py-0.5 text-[9px] text-command-cyan font-mono">
              5 TEAMS ACTIVE
            </span>
          </div>

          <div className="mt-4 divide-y divide-command-border/60 space-y-3">
            {activeCase.roles.map((r) => {
              const isAck = r.status === "ACKNOWLEDGED";
              const isPrep = r.status === "PREPARING";

              return (
                <div
                  key={r.id}
                  className="flex flex-col gap-2 pt-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-foreground">
                        {r.role}
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        ({r.department})
                      </span>
                      {r.urgency === "CRITICAL" && (
                        <span className="rounded bg-command-red/15 px-1.5 py-0.2 text-[8px] font-bold text-command-red">
                          URGENT
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-command-cyan font-medium">
                      {r.assignee}
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      <strong className="text-foreground">Direct Action:</strong>{" "}
                      {r.action}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider",
                        isAck
                          ? "bg-command-green/15 text-command-green border border-command-green/30"
                          : isPrep
                          ? "bg-command-cyan/15 text-command-cyan border border-command-cyan/30"
                          : "bg-command-amber/15 text-command-amber border border-command-amber/30 animate-pulse"
                      )}
                    >
                      {r.status}
                    </span>
                    {r.ackTime && (
                      <span className="font-mono text-[8px] text-muted-foreground">
                        Ack: {r.ackTime}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Automated Escalation Hierarchy & Timers */}
        <div className="command-panel rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-command-border/70 pb-3">
              <div>
                <h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-foreground flex items-center gap-2">
                  <ShieldAlert size={15} className="text-command-amber" /> Escalation Hierarchy
                </h2>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Automated failover protocol if primary alert is unacknowledged
                </p>
              </div>
              <div className="mono-data text-[10px] font-semibold text-command-amber">
                FAILOVER TIMER: {escalationTimer}s
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {activeCase.escalation.map((tier, idx) => {
                const isActive = tier.status === "ACTIVE";
                const isResolved =
                  tier.status === "RESOLVED" ||
                  tier.status === "ACKNOWLEDGED";

                return (
                  <div
                    key={tier.tier}
                    className={cn(
                      "relative rounded-lg border p-3 transition-all",
                      isActive
                        ? "border-command-amber/50 bg-command-amber/[0.06] shadow-[0_0_12px_oklch(0.8_0.15_82/10%)]"
                        : isResolved
                        ? "border-command-green/30 bg-command-green/[0.04]"
                        : "border-command-border/60 bg-command/30 opacity-70"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] font-bold text-muted-foreground">
                            TIER {tier.tier}
                          </span>
                          <span className="text-[10px] font-bold text-foreground">
                            {tier.level}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] font-semibold text-foreground">
                          {tier.name}
                        </div>
                        <div className="text-[9px] text-muted-foreground">
                          {tier.role} · {tier.contact}
                        </div>
                      </div>

                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-[8px] font-bold uppercase",
                          isActive
                            ? "bg-command-amber/20 text-command-amber border border-command-amber/40 animate-pulse"
                            : isResolved
                            ? "bg-command-green/20 text-command-green"
                            : "bg-command-border/40 text-muted-foreground"
                        )}
                      >
                        {tier.status}
                      </span>
                    </div>

                    {idx < activeCase.escalation.length - 1 && (
                      <div className="absolute -bottom-3 left-6 z-10 size-4 place-items-center rounded-full bg-command-border text-[8px] text-muted-foreground grid">
                        ↓
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-command-border/70 bg-command/40 p-3">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">Escalation Rule:</span>
              <span className="text-command-green font-semibold">
                Level-1 Trauma Auto-Dispatch
              </span>
            </div>
            <div className="mt-1 text-[9px] text-muted-foreground">
              If Tier 1 fails to acknowledge within 60 seconds, alert automatically escalates to Tier 2 on-call specialist.
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: Emergency Impact Prediction & Downstream Propagation */}
      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        {/* Left: Propagation Chain */}
        <div className="command-panel rounded-xl p-5">
          <div className="flex items-center justify-between border-b border-command-border/70 pb-3">
            <div>
              <h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-foreground flex items-center gap-2">
                <Cpu size={15} className="text-command-cyan" /> Emergency Impact Prediction Engine
              </h2>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Simulated downstream bottleneck cascade across connected hospital departments
              </p>
            </div>
            {onOpenNetwork && (
              <Button
                onClick={onOpenNetwork}
                size="sm"
                variant="ghost"
                className="text-[10px] text-command-cyan hover:bg-command-cyan/10"
              >
                Inspect Network <ArrowRight size={12} className="ml-1" />
              </Button>
            )}
          </div>

          <div className="mt-4 space-y-2.5">
            {emergencyPropagationImpact.map((step, idx) => (
              <div
                key={step.stage}
                className="flex items-center gap-3 rounded-lg border border-command-border/70 bg-command/30 p-2.5 transition-all hover:bg-command-cyan/5"
              >
                <div className="grid size-6 shrink-0 place-items-center rounded-full bg-command-cyan/10 text-[9px] font-mono font-bold text-command-cyan">
                  0{idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-foreground">
                      {step.stage}
                    </span>
                    <span
                      className={cn(
                        "mono-data text-[10px] font-bold",
                        step.status === "CRITICAL"
                          ? "text-command-red"
                          : "text-command-amber"
                      )}
                    >
                      {step.metric}
                    </span>
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    {step.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Surge vs Baseline Chart */}
        <div className="command-panel rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-command-border/70 pb-3">
              <div>
                <h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-foreground flex items-center gap-2">
                  <Sparkles size={15} className="text-command-cyan" /> Surge vs Baseline Forecast
                </h2>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Projected system utilization peak post-incident arrival
                </p>
              </div>
              <span className="mono-data text-[9px] font-bold text-command-red">
                PEAK 104% (+1h)
              </span>
            </div>

            <div className="h-[210px] w-full pt-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={impactChartData}
                  margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="surgeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="var(--color-command-red)"
                        stopOpacity="0.25"
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--color-command-red)"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="var(--color-command-border)"
                    strokeDasharray="2 4"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 9 }}
                  />
                  <YAxis
                    domain={[60, 115]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 9 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-command-raised)",
                      borderColor: "var(--color-command-border)",
                      fontSize: "11px",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="surge"
                    name="Emergency Surge"
                    stroke="var(--color-command-red)"
                    strokeWidth={2.5}
                    fill="url(#surgeGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="baseline"
                    name="Baseline Load"
                    stroke="var(--color-command-cyan)"
                    strokeWidth={1.5}
                    fill="none"
                    strokeDasharray="3 3"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-command-border/70 pt-3 text-[9px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-command-red" /> Surge Utilization
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-command-cyan" /> Baseline Load
            </span>
            <span className="mono-data text-command-amber font-semibold">
              +26% Surge Delta
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Audit Trail & Telemetry Log */}
      <div className="command-panel rounded-xl p-5">
        <div className="flex items-center justify-between border-b border-command-border/70 pb-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">
            <Layers size={15} className="text-command-cyan" /> Real-Time Telemetry & Dispatch Audit Trail
          </div>
          <span className="flex items-center gap-1 text-[9px] text-command-green font-mono">
            <span className="status-pulse size-1.5 rounded-full bg-command-green" />{" "}
            STREAM LIVE
          </span>
        </div>

        <div className="mt-3 max-h-32 overflow-y-auto space-y-1.5 font-mono text-[10px] text-muted-foreground">
          {auditLog.map((log, index) => (
            <div
              key={index}
              className="flex items-center gap-2 border-b border-command-border/30 pb-1"
            >
              <ChevronRight size={11} className="text-command-cyan shrink-0" />
              <span className="text-foreground/90">{log}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Intake Modal / Dialog */}
      {intakeModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-command-border bg-command-raised p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-command-border pb-3">
              <div className="flex items-center gap-2 text-[13px] font-bold text-foreground">
                <Ambulance size={18} className="text-command-red" />
                Report Inbound Emergency / Mass Casualty
              </div>
              <button
                onClick={() => setIntakeModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="mt-4 space-y-4 text-[11px]">
              <div>
                <label className="block text-muted-foreground mb-1 font-semibold">
                  Incident Type / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Major Highway Collision, Industrial Fire, Transit Incident"
                  value={newCase.incidentType}
                  onChange={(e) =>
                    setNewCase({ ...newCase, incidentType: e.target.value })
                  }
                  className="w-full rounded-lg border border-command-border bg-command px-3 py-2 text-foreground focus:border-command-cyan focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">
                    Patients
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={newCase.patientCount}
                    onChange={(e) =>
                      setNewCase({ ...newCase, patientCount: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-command-border bg-command px-3 py-2 text-foreground focus:border-command-cyan focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">
                    Severity
                  </label>
                  <select
                    value={newCase.severity}
                    onChange={(e) =>
                      setNewCase({
                        ...newCase,
                        severity: e.target.value as EmergencySeverity,
                      })
                    }
                    className="w-full rounded-lg border border-command-border bg-command px-3 py-2 text-foreground focus:border-command-cyan focus:outline-none"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MODERATE">MODERATE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">
                    ETA (Minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={newCase.etaMinutes}
                    onChange={(e) =>
                      setNewCase({ ...newCase, etaMinutes: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-command-border bg-command px-3 py-2 text-foreground focus:border-command-cyan focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-semibold">
                  Incident Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Interstate 93 North · Milepost 24"
                  value={newCase.location}
                  onChange={(e) =>
                    setNewCase({ ...newCase, location: e.target.value })
                  }
                  className="w-full rounded-lg border border-command-border bg-command px-3 py-2 text-foreground focus:border-command-cyan focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-semibold">
                  Initial Injury Summary & EMS Report
                </label>
                <textarea
                  rows={3}
                  placeholder="Summary of patient status, airway compromise, severe trauma, or required specialized equipment..."
                  value={newCase.injurySummary}
                  onChange={(e) =>
                    setNewCase({ ...newCase, injurySummary: e.target.value })
                  }
                  className="w-full rounded-lg border border-command-border bg-command px-3 py-2 text-foreground focus:border-command-cyan focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIntakeModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-command-red text-white hover:bg-command-red/90"
                >
                  <Send size={13} className="mr-1.5" /> Dispatch Emergency Network
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctor Notification Pager Console / Modal */}
      {showDoctorModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border-2 border-command-red/60 bg-command-raised p-6 shadow-[0_0_50px_oklch(0.67_0.2_27/25%)]">
            <div className="flex items-center justify-between border-b border-command-border pb-3">
              <div className="flex items-center gap-2 text-command-red font-bold text-[12px] uppercase tracking-wider">
                <Bell size={16} className="animate-pulse" /> Clinical Alert Pager — Dr. Sarah Chen
              </div>
              <button
                onClick={() => setShowDoctorModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-command-red/30 bg-command-red/10 p-3">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-command-red">
                  <span>Critical Trauma Alert</span>
                  <span className="mono-data">ETA: {formatCountdown(countdownSeconds)}</span>
                </div>
                <div className="mt-2 text-[12px] font-bold text-foreground">
                  {activeCase.patientCount} Patients Inbound · {activeCase.incidentType}
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  Location: {activeCase.location}
                </div>
              </div>

              <div className="space-y-1.5 rounded-lg border border-command-border bg-command/50 p-3 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned Role:</span>
                  <span className="font-semibold text-foreground">
                    Emergency Doctor (Trauma Attending)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Bay:</span>
                  <span className="font-semibold text-command-cyan">
                    Resuscitation Bay 1 (Airway Prep)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Notification Status:</span>
                  <span className="font-semibold text-command-amber">
                    PENDING ACKNOWLEDGMENT
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  onClick={handleAcknowledgeAlert}
                  className="w-full bg-command-green text-white font-bold text-[12px] hover:bg-command-green/90 shadow-[0_0_15px_var(--color-command-green)]"
                >
                  <CheckCircle2 size={15} className="mr-1.5" /> ACKNOWLEDGE & ACCEPT CASE
                </Button>
                <Button
                  onClick={() => setShowDoctorModal(false)}
                  variant="outline"
                  className="w-full border-command-border text-[11px]"
                >
                  Close Notification Window
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
