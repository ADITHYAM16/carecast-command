import { useState, useEffect, useCallback } from "react";
import {
  Ambulance, Activity, Brain, CheckCircle2, Clock, Eye, EyeOff,
  HeartPulse, Loader2, LogOut, MapPin, Navigation, Phone, Thermometer,
  Send, Siren, User, X, WifiOff, ExternalLink, Wind, Ribbon, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertLifecycleStep, EmergencySeverity, patientLifecycleStages } from "@/lib/mock-data";
import { insertEmergency, fetchEmergencies, type PatientReport } from "@/lib/mongodb";
import { cn } from "@/lib/utils";

const PATIENT_ID   = "patient";
const PATIENT_PASS = "patient123";

type CauseConfig = {
  label: string;
  icon: React.ReactNode;
  severity: EmergencySeverity;
  acuity: string;
  description: string;
  resources: string[];
  color: string;
  bg: string;
  border: string;
};

const CAUSES: CauseConfig[] = [
  {
    label: "Accident",
    icon: <Ambulance size={18} />,
    severity: "CRITICAL",
    acuity: "High",
    description: "Trauma / road accident. Requires immediate triage, X-Ray, CT Scan, possible surgery.",
    resources: ["Triage & Vital Assessment", "X-Ray", "CT Scan", "Trauma Surgery", "Operating Room", "ICU"],
    color: "text-red-400",
    bg: "bg-red-500/10 hover:bg-red-500/20",
    border: "border-red-500/30 hover:border-red-500/60",
  },
  {
    label: "Chest Pain",
    icon: <HeartPulse size={18} />,
    severity: "CRITICAL",
    acuity: "High",
    description: "Suspected cardiac event. Requires ECG, Cardiology consult, possible ICU admission.",
    resources: ["ECG", "Triage & Vital Assessment", "Laboratory Tests", "Cardiology", "ICU", "Medication / IV Therapy"],
    color: "text-rose-400",
    bg: "bg-rose-500/10 hover:bg-rose-500/20",
    border: "border-rose-500/30 hover:border-rose-500/60",
  },
  {
    label: "Stroke",
    icon: <Brain size={18} />,
    severity: "CRITICAL",
    acuity: "High",
    description: "Neurological emergency. Requires urgent CT/MRI, Neurology, possible HDU stay.",
    resources: ["CT Scan", "MRI", "Triage & Vital Assessment", "Neurology", "ICU", "High Dependency Unit (HDU)"],
    color: "text-purple-400",
    bg: "bg-purple-500/10 hover:bg-purple-500/20",
    border: "border-purple-500/30 hover:border-purple-500/60",
  },
  {
    label: "Pneumonia",
    icon: <Wind size={18} />,
    severity: "HIGH",
    acuity: "Moderate",
    description: "Respiratory infection. Requires X-Ray, Lab tests, Respiratory Medicine, ward admission.",
    resources: ["X-Ray", "Laboratory Tests", "Respiratory Medicine", "Medication / IV Therapy", "General Ward Beds"],
    color: "text-blue-400",
    bg: "bg-blue-500/10 hover:bg-blue-500/20",
    border: "border-blue-500/30 hover:border-blue-500/60",
  },
  {
    label: "Viral Fever",
    icon: <Thermometer size={18} />,
    severity: "MODERATE",
    acuity: "Low",
    description: "Fever / viral illness. Requires assessment, lab tests, medication and observation.",
    resources: ["Triage & Vital Assessment", "Laboratory Tests", "General Medicine", "Medication / IV Therapy", "Observation (Short Stay)"],
    color: "text-amber-400",
    bg: "bg-amber-500/10 hover:bg-amber-500/20",
    border: "border-amber-500/30 hover:border-amber-500/60",
  },
  {
    label: "Cancer",
    icon: <Ribbon size={18} />,
    severity: "HIGH",
    acuity: "Moderate",
    description: "Oncology emergency. Requires Ultrasound, Lab tests, Oncology consult, possible HDU.",
    resources: ["Ultrasound", "Laboratory Tests", "CT Scan", "Oncology", "Medication / IV Therapy", "High Dependency Unit (HDU)"],
    color: "text-orange-400",
    bg: "bg-orange-500/10 hover:bg-orange-500/20",
    border: "border-orange-500/30 hover:border-orange-500/60",
  },
  {
    label: "Other",
    icon: <Users size={18} />,
    severity: "HIGH",
    acuity: "Low",
    description: "Other medical emergency. Please describe your condition in the form.",
    resources: ["Triage & Vital Assessment", "Laboratory Tests", "General Medicine", "Emergency Observation"],
    color: "text-command-cyan",
    bg: "bg-command-cyan/10 hover:bg-command-cyan/20",
    border: "border-command-cyan/20 hover:border-command-cyan/50",
  },
];

function lifecycleTone(step: AlertLifecycleStep) {
  if (step === "RESOLVED") return "text-command-green border-command-green/40 bg-command-green/10";
  if (step === "READY") return "text-command-green border-command-green/40 bg-command-green/10";
  if (step === "PATIENT ARRIVED") return "text-command-cyan border-command-cyan/30 bg-command-cyan/10";
  if (step === "ACKNOWLEDGED" || step === "PREPARING") return "text-command-amber border-command-amber/30 bg-command-amber/10";
  if (step === "SENT" || step === "DELIVERED") return "text-command-amber border-command-amber/30 bg-command-amber/10";
  return "text-muted-foreground border-command-border bg-command/40";
}

export function PatientPortal({ onEmergencyReported }: { onEmergencyReported?: () => void } = {}) {
  const [loggedIn, setLoggedIn]     = useState(false);
  const [loginId, setLoginId]       = useState("");
  const [loginPass, setLoginPass]   = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn]   = useState(false);

  const [reports, setReports]               = useState<PatientReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [offline, setOffline]               = useState(false);
  const [showForm, setShowForm]             = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [submitSuccess, setSubmitSuccess]   = useState(false);

  const [form, setForm] = useState({
    incidentType: "",
    patientName: "",
    patientAge: "",
    contactNumber: "",
    location: "",
    severity: "HIGH" as EmergencySeverity,
    description: "",
  });

  // Load reports (never throws - falls back to localStorage)
  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const data = await fetchEmergencies(PATIENT_ID);
      setReports(data);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    if (loggedIn) loadReports();
  }, [loggedIn, loadReports]);

  // ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ Login ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂÃÂ¢Ã¢â¬Å¡ÃÂ¬
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setTimeout(() => {
      if (loginId === PATIENT_ID && loginPass === PATIENT_PASS) {
        setLoggedIn(true);
        setLoginError("");
      } else {
        setLoginError("Invalid credentials. Use patient / patient123");
      }
      setLoggingIn(false);
    }, 600);
  };

  // Submit emergency (never throws - falls back to localStorage)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.incidentType || !form.location) return;
    setSubmitting(true);

    const report: PatientReport = {
      caseId:        `PAT-${Date.now().toString(36).toUpperCase()}`,
      patientId:     PATIENT_ID,
      incidentType:  form.incidentType,
      patientName:   form.patientName,
      patientAge:    Number(form.patientAge) || 0,
      contactNumber: form.contactNumber,
      location:      form.location,
      severity:      form.severity,
      description:   form.description,
      resources:     selectedCause?.resources ?? [],
      lifecycle:     "CREATED",
      reportedAt:    new Date().toISOString(),
    };

    // insertEmergency never throws - uses localStorage if backend is down
    const saved = await insertEmergency(report);
    setReports((prev) => [saved, ...prev.filter((r) => r.caseId !== saved.caseId)]);
    setSubmitSuccess(true);
    setShowForm(false);
    setSelectedCause(null);
    setForm({ incidentType: "", patientName: "", patientAge: "", contactNumber: "", location: "", severity: "HIGH", description: "" }); // fields kept in state for type compat
    onEmergencyReported?.();
    setSubmitting(false);
    setTimeout(() => setSubmitSuccess(false), 5000);
  };

  // Poll for lifecycle updates written by hospital every 30s
  useEffect(() => {
    if (!loggedIn) return;
    const id = setInterval(loadReports, 3_000);
    return () => clearInterval(id);
  }, [loggedIn, loadReports]);

  const [showAll, setShowAll] = useState(false);
  const [selectedCause, setSelectedCause] = useState<CauseConfig | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setLocError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Reverse-geocode using OpenStreetMap Nominatim (free, no key needed)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json() as { display_name?: string };
          const address = data.display_name ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          setForm((prev) => ({ ...prev, location: address }));
        } catch {
          setForm((prev) => ({ ...prev, location: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` }));
        }
        setLocating(false);
      },
      (err) => {
        setLocError(
          err.code === 1
            ? "Location access denied. Please allow location permission."
            : "Unable to retrieve your location. Try again."
        );
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleCauseClick = (cause: CauseConfig) => {
    setSelectedCause(cause);
    setForm((prev) => ({
      ...prev,
      incidentType: cause.label,
      severity: cause.severity,
      description: cause.description,
    }));
    setShowForm(true);
  };

  const visibleReports = showAll ? reports : reports.slice(0, 3);

  // Login screen
  if (!loggedIn) {
    return (
      <div className="relative flex min-h-screen items-center justify-center text-foreground px-4">
        {/* Full-screen background video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="fixed inset-0 h-full w-full object-cover"
          style={{ zIndex: 0, opacity: 0.85 }}
        >
          <source src="/bg.mp4" type="video/mp4" />
        </video>
        {/* Soft overlay */}
        <div className="fixed inset-0 bg-command/50 backdrop-blur-[2px]" style={{ zIndex: 1 }} />

        <div className="relative w-full max-w-sm" style={{ zIndex: 2 }}>
          <div className="mb-8 flex flex-col items-center gap-3">
            <img src="/care.png" alt="CareCast AI" className="size-16 object-contain" draggable={false} />
            <div className="text-center">
              <div className="text-xl font-extrabold tracking-[0.15em] text-foreground">
                CARECAST <span className="text-command-cyan">AI</span>
              </div>
              <div className="mt-1 text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                Patient Portal
              </div>
            </div>
          </div>

          <div className="mb-4 text-center">
            <a href="/" className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-command-cyan">
              <ExternalLink size={11} /> Back to Command Center
            </a>
          </div>

          <div className="command-panel rounded-2xl p-6 shadow-2xl">
            <div className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-command-cyan">
              <User size={14} /> Patient Login
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">Patient ID</label>
                <input
                  type="text" autoComplete="username" placeholder="patient"
                  value={loginId} onChange={(e) => setLoginId(e.target.value)}
                  className="w-full rounded-lg border border-command-border bg-command px-3 py-2.5 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:border-command-cyan focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"} autoComplete="current-password" placeholder="patient123"
                    value={loginPass} onChange={(e) => setLoginPass(e.target.value)}
                    className="w-full rounded-lg border border-command-border bg-command px-3 py-2.5 pr-10 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:border-command-cyan focus:outline-none"
                  />
                  <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="rounded-lg border border-command-red/30 bg-command-red/10 px-3 py-2 text-[11px] text-command-red">
                  {loginError}
                </div>
              )}

              <Button type="submit" disabled={loggingIn} className="w-full bg-command-cyan text-primary-foreground text-[12px] font-bold">
                {loggingIn ? <><Loader2 size={14} className="animate-spin mr-1.5" /> Signing in...</> : "Sign In"}
              </Button>
            </form>

            <div className="mt-4 rounded-lg border border-command-border/60 bg-command/40 p-3 text-[10px] text-muted-foreground">
              <span className="font-semibold text-foreground">Demo credentials</span>{" "}
              ID: <span className="font-mono text-command-cyan">patient</span> Â· Password:{" "}
              <span className="font-mono text-command-cyan">patient123</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Portal dashboard
  return (
    <div className="relative min-h-screen text-foreground">
      {/* Full-screen background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 h-full w-full object-cover"
        style={{ zIndex: 0, opacity: 0.85 }}
      >
        <source src="/bg.mp4" type="video/mp4" />
      </video>
      {/* Soft overlay */}
      <div className="fixed inset-0 bg-command/45 backdrop-blur-[1px]" style={{ zIndex: 1 }} />
      {/* All content above video */}
      <div className="relative" style={{ zIndex: 2 }}>
      {/* Header */}
      <header className="sticky top-0 z-20 flex h-[64px] items-center justify-between border-b border-command-border bg-command/95 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-3">
          <img src="/care.png" alt="" className="size-7 object-contain" draggable={false} />
          <div>
            <div className="text-[13px] font-extrabold tracking-[0.14em] text-foreground">
              CARECAST <span className="text-command-cyan">AI</span>
            </div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Patient Portal</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {offline && (
            <div className="hidden items-center gap-1.5 rounded border border-command-amber/30 bg-command-amber/10 px-2 py-1 text-[9px] font-semibold text-command-amber sm:flex">
              <WifiOff size={11} /> Offline â€” saved locally
            </div>
          )}
          <a href="/" className="hidden items-center gap-1 text-[10px] text-muted-foreground hover:text-command-cyan sm:flex">
            <ExternalLink size={11} /> Command Center
          </a>
          <button
            type="button"
            onClick={handleUseLocation}
            disabled={locating}
            title="Auto-fill location using GPS"
            className="flex items-center gap-1.5 rounded-lg border border-command-cyan/40 bg-command-cyan/10 px-3 py-1.5 text-[10px] font-semibold text-command-cyan transition-all hover:bg-command-cyan/20 disabled:opacity-50"
          >
            {locating ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
            <span className="hidden sm:inline">{locating ? "Locating..." : "Use Location"}</span>
          </button>
          <button
            onClick={() => setLoggedIn(false)}
            className="flex items-center gap-1.5 rounded-lg border border-command-border px-3 py-1.5 text-[10px] text-muted-foreground hover:border-command-red/40 hover:text-command-red"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {/* Offline banner (mobile) */}
        {offline && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-command-amber/30 bg-command-amber/8 px-4 py-2.5 text-[11px] text-command-amber sm:hidden">
            <WifiOff size={13} /> Backend offline â€” reports saved locally on this device.
          </div>
        )}

        {/* Success banner */}
        {submitSuccess && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-command-green/40 bg-command-green/10 px-4 py-3 text-[12px] font-semibold text-command-green">
            <CheckCircle2 size={16} />
            {offline
              ? "Emergency saved locally. Will sync to hospital when connection is restored."
              : "Emergency reported successfully. The hospital has been notified."}
          </div>
        )}

        {/* Page title + CTA */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-command-cyan">
              <HeartPulse size={13} /> Patient Emergency Portal
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">My Emergency Reports</h1>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Report a new emergency and track its response lifecycle in real time.
            </p>
          </div>

        </div>

        {/* Quick cause buttons */}
        <div className="mb-6 command-panel rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            <Siren size={12} className="text-command-red" /> Select Emergency Type
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {CAUSES.map((cause) => (
              <button
                key={cause.label}
                onClick={() => handleCauseClick(cause)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                  cause.bg, cause.border, cause.color
                )}
              >
                <div className={cn("grid size-9 place-items-center rounded-full border", cause.border, cause.bg)}>
                  {cause.icon}
                </div>
                <span className="text-[10px] font-bold leading-tight text-foreground">{cause.label}</span>
                <span className={cn(
                  "rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide",
                  cause.severity === "CRITICAL" ? "bg-red-500/15 text-red-400" :
                  cause.severity === "HIGH" ? "bg-amber-500/15 text-amber-400" :
                  "bg-green-500/15 text-green-400"
                )}>{cause.acuity}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reports list */}
        {loadingReports ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading your reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="command-panel rounded-2xl p-10 text-center">
            <Ambulance size={36} className="mx-auto mb-4 text-muted-foreground/40" />
            <div className="text-[13px] font-semibold text-foreground">No emergency reports yet</div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Use the button above to report an emergency. It will appear here and be sent to the hospital command center.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleReports.map((r) => (
              <ReportCard key={r.caseId} report={r} />
            ))}
            {reports.length > 3 && (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="w-full rounded-xl border border-command-cyan/30 bg-command-cyan/10 py-3 text-[11px] font-semibold text-command-cyan hover:bg-command-cyan/20"
              >
                {showAll ? "Show less" : `See more (${reports.length - 3} more requests)`}
              </button>
            )}
          </div>
        )}
      </main>

      {/* Report form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-command-border bg-command-raised p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-command-border pb-3">
              <div className="flex items-center gap-2 text-[13px] font-bold text-foreground">
                <Siren size={17} className="text-command-red" /> Report New Emergency
              </div>
              <button onClick={() => { setShowForm(false); setSelectedCause(null); setLocError(""); }} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            {/* Selected cause resource panel */}
            {selectedCause && (
              <div className={cn("mt-4 rounded-xl border p-3", selectedCause.border, selectedCause.bg)}>
                <div className={cn("flex items-center gap-2 text-[11px] font-bold mb-2", selectedCause.color)}>
                  {selectedCause.icon}
                  {selectedCause.label} â€” Required Resources
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCause.resources.map((r) => (
                    <span key={r} className="rounded-full border border-command-border bg-command/60 px-2 py-0.5 text-[9px] font-medium text-foreground">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-[11px]">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="mb-1 block font-semibold text-muted-foreground">Incident Type *</label>
                  <input required type="text" placeholder="e.g. Chest pain, Road accident, Fall injury"
                    value={form.incidentType} onChange={(e) => setForm({ ...form, incidentType: e.target.value })}
                    className="w-full rounded-lg border border-command-border bg-command px-3 py-2 text-foreground focus:border-command-cyan focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-muted-foreground">Severity</label>
                  <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as EmergencySeverity })}
                    className="w-full rounded-lg border border-command-border bg-command px-3 py-2 text-foreground focus:border-command-cyan focus:outline-none">
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MODERATE">MODERATE</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block font-semibold text-muted-foreground">Location *</label>
                  <input required type="text" placeholder="Current location / address"
                    value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full rounded-lg border border-command-border bg-command px-3 py-2 text-foreground focus:border-command-cyan focus:outline-none" />
                  {locError && (
                    <p className="mt-1 text-[10px] text-command-red">{locError}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block font-semibold text-muted-foreground">Description</label>
                  <textarea rows={3} placeholder="Describe the emergency situation, symptoms, or injuries..."
                    value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full rounded-lg border border-command-border bg-command px-3 py-2 text-foreground focus:border-command-cyan focus:outline-none" />
                </div>
              </div>

              {offline && (
                <div className="flex items-center gap-2 rounded-lg border border-command-amber/30 bg-command-amber/8 px-3 py-2 text-[10px] text-command-amber">
                  <WifiOff size={12} /> Backend offline â€” report will be saved locally and synced when reconnected.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting} className="bg-command-red text-white hover:bg-command-red/90">
                  {submitting
                    ? <><Loader2 size={13} className="animate-spin mr-1" /> Sending...</>
                    : <><Send size={13} className="mr-1" /> Send Emergency Alert</>}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>{/* end content wrapper */}
    </div>
  );
}

// Report Card (read-only - lifecycle updated by hospital only)
function ReportCard({ report }: { report: PatientReport }) {
  const currentIdx = patientLifecycleStages.findIndex((s) => s.key === report.lifecycle);
  // If lifecycle not in 3-step list, treat as step 0
  const effectiveIdx = currentIdx === -1 ? 0 : currentIdx;

  return (
    <div className={cn(
      "command-panel rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-command-cyan/40 hover:shadow-[0_4px_24px_oklch(0.77_0.15_192/8%)]",
      report.severity === "CRITICAL" && "border-command-red/40 bg-command-red/[0.03] hover:border-command-red/60"
    )}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={cn("grid size-8 place-items-center rounded-lg",
            report.severity === "CRITICAL" ? "bg-command-red/15 text-command-red" :
            report.severity === "HIGH"     ? "bg-command-amber/15 text-command-amber" :
                                             "bg-command-cyan/15 text-command-cyan"
          )}>
            <Ambulance size={16} />
          </div>
          <div>
            <div className="text-[13px] font-bold text-foreground">{report.incidentType}</div>
            <div className="font-mono text-[10px] text-muted-foreground">{report.caseId}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
            report.severity === "CRITICAL" ? "border-command-red/30 bg-command-red/10 text-command-red" :
            report.severity === "HIGH"     ? "border-command-amber/30 bg-command-amber/10 text-command-amber" :
                                             "border-command-cyan/30 bg-command-cyan/10 text-command-cyan"
          )}>{report.severity}</span>
          <span className={cn("rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider", lifecycleTone(report.lifecycle))}>
            {report.lifecycle}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="mt-3 grid gap-1.5 text-[11px] text-muted-foreground sm:grid-cols-3">
        <span className="flex items-center gap-1.5 col-span-1 sm:col-span-1">
          <MapPin size={12} className="shrink-0 text-command-cyan" />
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(report.location)}`}
            target="_blank" rel="noopener noreferrer"
            className="truncate hover:text-command-cyan hover:underline transition-colors"
            title={report.location}
          >
            {report.location}
          </a>
        </span>

      </div>
      {report.description && (
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{report.description}</p>
      )}

      {/* Required resources */}
      {report.resources && report.resources.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Required Resources</div>
          <div className="flex flex-wrap gap-1.5">
            {report.resources.map((r) => (
              <span key={r} className="rounded-full border border-command-cyan/20 bg-command-cyan/8 px-2 py-0.5 text-[9px] font-medium text-command-cyan">
                {r}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Alert lifecycle timeline */}
      <div className="mt-4 overflow-x-auto pb-1">
        <div className="flex min-w-[280px] items-start justify-between">
          {patientLifecycleStages.map((stage, idx) => {
            const isPast    = idx < effectiveIdx;
            const isCurrent = idx === effectiveIdx;
            return (
              <div key={stage.key} className="relative flex flex-1 flex-col items-center text-center">
                {idx > 0 && (
                  <div className={cn(
                    "absolute left-0 right-1/2 top-3.5 h-px",
                    idx <= effectiveIdx ? "bg-command-cyan/60" : "bg-command-border/50"
                  )} />
                )}
                {idx < patientLifecycleStages.length - 1 && (
                  <div className={cn(
                    "absolute left-1/2 right-0 top-3.5 h-px",
                    idx < effectiveIdx ? "bg-command-cyan/60" : "bg-command-border/50"
                  )} />
                )}
                <div
                  className={cn(
                    "relative z-10 grid size-7 place-items-center rounded-full border-2 text-[9px] font-bold",
                    isCurrent
                      ? "border-command-cyan bg-command-cyan text-white shadow-[0_0_10px_var(--color-command-cyan)]"
                      : isPast
                      ? "border-command-cyan bg-command-cyan/20 text-command-cyan"
                      : "border-command-border bg-command text-muted-foreground"
                  )}
                >
                  {isPast ? <CheckCircle2 size={13} /> : idx + 1}
                </div>
                <div className={cn(
                  "mt-1.5 px-0.5 text-[9px] font-semibold leading-tight",
                  isCurrent ? "text-command-cyan" : isPast ? "text-command-cyan/70" : "text-muted-foreground"
                )}>{stage.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Clock size={11} />
        Reported: {new Date(report.reportedAt).toLocaleString()}
      </div>
    </div>
  );
}
