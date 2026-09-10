import { useCallback, useRef, useState } from "react";
import { AlertTriangle, Check, CheckCircle2, ChevronRight, CloudUpload, Download, FileSpreadsheet, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseFile } from "@/lib/file-parser";
import { classifyColumns, useDataMode, type ClassifiedField } from "@/lib/data-mode-context";
import { computeDashboardFromRows } from "@/lib/current-data-analytics";

// ── Sample dataset download ───────────────────────────────────────────────────

function downloadSample() {
  const header = "timestamp,patient_arrivals,emergency_cases,occupied_beds,total_beds,icu_occupied,icu_capacity,ct_requests,ct_capacity,mri_requests,mri_capacity,lab_requests,lab_capacity,scheduled_procedures,or_capacity,staff_count,staff_capacity";
  const rows: string[] = [];
  for (let h = 0; h < 24; h++) {
    const base = 60 + Math.round(Math.sin(h / 24 * Math.PI * 2) * 15);
    rows.push([
      `2024-01-15 ${String(h).padStart(2,"0")}:00`,
      30 + h, 12 + Math.round(h * 0.5),
      base + 10, 200, Math.round(base * 0.4), 50,
      Math.round(base * 0.45), 100, Math.round(base * 0.2), 40,
      Math.round(base * 3.2), 800, Math.round(base * 0.07), 15,
      Math.round(base * 0.6), 120,
    ].join(","));
  }
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "carecast-sample-dataset.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ── Analysis pipeline steps ───────────────────────────────────────────────────

const PIPELINE_STEPS = [
  { key: "validating",      label: "Reading Dataset" },
  { key: "classifying",     label: "Classifying Resources" },
  { key: "calculating",     label: "Calculating Capacity" },
  { key: "forecasting",     label: "Running Forecast" },
  { key: "bottlenecks",     label: "Detecting Bottlenecks" },
  { key: "propagating",     label: "Propagating Dependencies" },
  { key: "recommendations", label: "Generating Recommendations" },
] as const;

// ── Confidence badge ──────────────────────────────────────────────────────────

function ConfBadge({ conf }: { conf: number }) {
  const tone = conf >= 90 ? "text-command-green border-command-green/30 bg-command-green/8"
    : conf >= 70 ? "text-command-amber border-command-amber/30 bg-command-amber/8"
    : "text-muted-foreground border-command-border bg-command/30";
  const label = conf >= 90 ? "High" : conf >= 70 ? "Medium" : "Low";
  return <span className={cn("rounded border px-1.5 py-0.5 text-[9px] font-semibold", tone)}>{label} {conf}%</span>;
}

// ── Main component ────────────────────────────────────────────────────────────

export function CurrentDataUpload() {
  const { datasetMeta, setDatasetMeta, setCurrentDashboard } = useDataMode();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["csv", "xls", "xlsx"].includes(ext)) {
      setDatasetMeta({
        filename: file.name, recordCount: 0, columnCount: 0, timeRange: "—",
        uploadedAt: new Date().toLocaleTimeString(),
        classifiedFields: [], validationMessages: [],
        analysisStatus: "error", errorMessage: `Unsupported format: .${ext}. Please upload CSV, XLS, or XLSX.`,
      });
      return;
    }

    // Step 1: validating
    setDatasetMeta({
      filename: file.name, recordCount: 0, columnCount: 0, timeRange: "—",
      uploadedAt: new Date().toLocaleTimeString(),
      classifiedFields: [], validationMessages: [],
      analysisStatus: "validating",
    });

    let parsed: { columns: string[]; rows: Record<string, string>[] };
    try {
      parsed = await parseFile(file);
    } catch (e) {
      setDatasetMeta((prev) => prev ? { ...prev, analysisStatus: "error", errorMessage: String(e) } : null);
      return;
    }

    const { columns, rows } = parsed;
    const validationMessages: { ok: boolean; message: string }[] = [];

    validationMessages.push({ ok: true, message: "File readable" });
    if (!rows.length) {
      validationMessages.push({ ok: false, message: "Dataset is empty" });
      setDatasetMeta({ filename: file.name, recordCount: 0, columnCount: columns.length, timeRange: "—", uploadedAt: new Date().toLocaleTimeString(), classifiedFields: [], validationMessages, analysisStatus: "error", errorMessage: "Dataset is empty." });
      return;
    }
    validationMessages.push({ ok: true, message: `${rows.length.toLocaleString()} records detected` });

    // Step 2: classifying
    setDatasetMeta((prev) => prev ? { ...prev, analysisStatus: "classifying" } : null);
    await delay(400);

    const classifiedFields = classifyColumns(columns);
    const hasTimestamp = classifiedFields.some((f) => f.canonical === "TIMESTAMP");
    const hasBeds = classifiedFields.some((f) => ["OCCUPIED_BEDS", "BED_CAPACITY"].includes(f.canonical));
    const hasAnyCapacity = classifiedFields.some((f) => f.canonical.endsWith("_CAPACITY"));

    if (hasTimestamp) validationMessages.push({ ok: true, message: "Timestamp detected" });
    else validationMessages.push({ ok: false, message: "No timestamp column found — time-series analysis limited" });

    if (hasBeds) validationMessages.push({ ok: true, message: "Capacity fields detected" });
    else validationMessages.push({ ok: false, message: "Bed capacity columns not found" });

    if (hasAnyCapacity) validationMessages.push({ ok: true, message: "Resource fields detected" });

    // Warn about missing optional fields
    const optionals: [string, string][] = [["MRI_CAPACITY", "MRI capacity column not found"], ["OR_CAPACITY", "OR capacity column not found"], ["STAFF_CAPACITY", "Staff capacity column not found"]];
    for (const [canon, msg] of optionals) {
      if (!classifiedFields.some((f) => f.canonical === canon)) {
        validationMessages.push({ ok: false, message: `⚠ ${msg}` });
      }
    }

    // Check missing values
    const missingCounts: Record<string, number> = {};
    for (const col of columns) {
      missingCounts[col] = rows.filter((r) => !r[col]?.trim()).length;
    }
    const highMissing = Object.entries(missingCounts).filter(([, c]) => c / rows.length > 0.05);
    if (highMissing.length) {
      validationMessages.push({ ok: false, message: `⚠ ${Math.round(highMissing[0]![1] / rows.length * 100)}% missing values in ${highMissing[0]![0]}` });
    }

    // Detect time range
    const tsCol = classifiedFields.find((f) => f.canonical === "TIMESTAMP")?.column;
    let timeRange = "—";
    if (tsCol) {
      const times = rows.map((r) => r[tsCol]).filter(Boolean);
      if (times.length >= 2) timeRange = `${times[0]} – ${times[times.length - 1]}`;
    }

    if (!hasBeds && !hasAnyCapacity) {
      setDatasetMeta({ filename: file.name, recordCount: rows.length, columnCount: columns.length, timeRange, uploadedAt: new Date().toLocaleTimeString(), classifiedFields, validationMessages, analysisStatus: "error", errorMessage: "No recognisable capacity fields found. Please check the dataset format." });
      return;
    }

    setDatasetMeta({ filename: file.name, recordCount: rows.length, columnCount: columns.length, timeRange, uploadedAt: new Date().toLocaleTimeString(), classifiedFields, validationMessages, analysisStatus: "idle" });

    // Store rows for analysis
    pendingRows.current = rows;
    pendingFields.current = classifiedFields;
  }, [setDatasetMeta]);

  const pendingRows = useRef<Record<string, string>[]>([]);
  const pendingFields = useRef<ClassifiedField[]>([]);

  const runAnalysis = useCallback(async () => {
    const rows = pendingRows.current;
    const fields = pendingFields.current;
    if (!rows.length) return;

    for (const step of PIPELINE_STEPS) {
      setDatasetMeta((prev) => prev ? { ...prev, analysisStatus: step.key } : null);
      await delay(500);
    }

    try {
      const dashboard = computeDashboardFromRows(rows, fields);
      setCurrentDashboard(dashboard);
      setDatasetMeta((prev) => prev ? { ...prev, analysisStatus: "done" } : null);
    } catch (e) {
      setDatasetMeta((prev) => prev ? { ...prev, analysisStatus: "error", errorMessage: String(e) } : null);
    }
  }, [setDatasetMeta, setCurrentDashboard]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }, [processFile]);

  const status = datasetMeta?.analysisStatus ?? "idle";
  const isRunning = PIPELINE_STEPS.some((s) => s.key === status);
  const isDone = status === "done";
  const isError = status === "error";
  const hasData = datasetMeta != null && !isError;
  const canAnalyze = hasData && status === "idle" && datasetMeta.recordCount > 0;

  return (
    <div className="mt-5 space-y-4">
      {/* Upload zone */}
      {!hasData && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-all",
            dragging ? "border-command-cyan bg-command-cyan/8" : "border-command-border bg-command/30 hover:border-command-cyan/50 hover:bg-command-cyan/5"
          )}
        >
          <div className="grid size-14 place-items-center rounded-xl bg-command-cyan/10 text-command-cyan mb-4">
            <CloudUpload size={26} />
          </div>
          <div className="text-[13px] font-semibold text-foreground">Drag & drop your hospital dataset here</div>
          <div className="mt-1 text-[11px] text-muted-foreground">Supports CSV, XLS, XLSX</div>
          <div className="mt-5 flex gap-3">
            <Button size="sm" className="bg-command-cyan text-primary-foreground text-[10px]" onClick={() => inputRef.current?.click()}>
              <FileSpreadsheet size={13} /> Upload Hospital Data
            </Button>
            <Button size="sm" variant="outline" className="border-command-border text-[10px]" onClick={downloadSample}>
              <Download size={13} /> Download Sample Dataset
            </Button>
          </div>
          <input ref={inputRef} type="file" accept=".csv,.xls,.xlsx" className="sr-only" onChange={handleFile} />
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="rounded-xl border border-command-red/30 bg-command-red/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-command-red" />
            <div className="flex-1">
              <div className="text-[12px] font-semibold text-command-red">Upload Failed</div>
              <p className="mt-1 text-[11px] text-muted-foreground">{datasetMeta?.errorMessage}</p>
            </div>
            <button onClick={() => setDatasetMeta(null)} className="text-muted-foreground hover:text-foreground"><X size={15} /></button>
          </div>
          <Button size="sm" variant="outline" className="mt-4 border-command-border text-[10px]" onClick={() => { setDatasetMeta(null); }}>
            Try again
          </Button>
        </div>
      )}

      {/* Dataset info + classification */}
      {hasData && !isError && (
        <div className="rounded-xl border border-command-border bg-command/30 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-command-border px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-lg bg-command-cyan/10 text-command-cyan">
                <FileSpreadsheet size={16} />
              </div>
              <div>
                <div className="text-[12px] font-semibold text-foreground">{datasetMeta.filename}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {datasetMeta.recordCount.toLocaleString()} records · {datasetMeta.columnCount} columns
                  {datasetMeta.timeRange !== "—" && ` · ${datasetMeta.timeRange}`}
                </div>
              </div>
            </div>
            <button onClick={() => { setDatasetMeta(null); setCurrentDashboard(null); }} className="text-muted-foreground hover:text-foreground" title="Remove dataset">
              <X size={15} />
            </button>
          </div>

          {/* Validation */}
          <div className="border-b border-command-border/60 px-5 py-3">
            <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Validation</div>
            <div className="grid gap-1 sm:grid-cols-2">
              {datasetMeta.validationMessages.map((msg, i) => (
                <div key={i} className={cn("flex items-center gap-2 text-[10px]", msg.ok ? "text-command-green" : "text-command-amber")}>
                  {msg.ok ? <Check size={11} /> : <AlertTriangle size={11} />}
                  {msg.message}
                </div>
              ))}
            </div>
          </div>

          {/* AI Classification */}
          {datasetMeta.classifiedFields.length > 0 && (
            <div className="border-b border-command-border/60 px-5 py-3">
              <div className="mb-2 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-command-cyan">
                <Sparkles size={11} /> AI Classified Fields
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {datasetMeta.classifiedFields.map((f) => (
                  <div key={f.canonical} className="flex items-center justify-between rounded-md border border-command-border/60 bg-command/40 px-2.5 py-1.5">
                    <div>
                      <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-command-cyan">{f.canonical.replace(/_/g, " ")}</div>
                      <div className="mt-0.5 text-[10px] text-foreground font-mono">{f.column}</div>
                    </div>
                    <ConfBadge conf={f.confidence} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pipeline progress */}
          {(isRunning || isDone) && (
            <div className="border-b border-command-border/60 px-5 py-3">
              <div className="mb-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Analysis Pipeline</div>
              <div className="space-y-2">
                {PIPELINE_STEPS.map((step, i) => {
                  const currentIdx = PIPELINE_STEPS.findIndex((s) => s.key === status);
                  const done = isDone || i < currentIdx;
                  const active = step.key === status;
                  return (
                    <div key={step.key} className="flex items-center gap-3">
                      <div className={cn("grid size-5 shrink-0 place-items-center rounded-full text-[9px]",
                        done ? "bg-command-green/15 text-command-green" : active ? "bg-command-cyan/15 text-command-cyan" : "bg-command-border/40 text-muted-foreground"
                      )}>
                        {done ? <Check size={10} /> : active ? <Loader2 size={10} className="animate-spin" /> : <ChevronRight size={10} />}
                      </div>
                      <span className={cn("text-[10px]", done ? "text-command-green" : active ? "text-command-cyan" : "text-muted-foreground")}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Done message */}
          {isDone && (
            <div className="flex items-center justify-between bg-command-green/5 px-5 py-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={16} className="text-command-green" />
                <span className="text-[11px] font-semibold text-command-green">Current Hospital Data Analyzed Successfully</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-command-red/40 text-command-red hover:bg-command-red/10 text-[10px]"
                onClick={() => { setDatasetMeta(null); setCurrentDashboard(null); }}
              >
                <X size={12} /> Remove Data
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 px-5 py-3">
            {canAnalyze && (
              <Button size="sm" className="bg-command-cyan text-primary-foreground text-[10px]" onClick={runAnalysis}>
                <Sparkles size={13} /> Analyze Current Data
              </Button>
            )}
            {isRunning && (
              <div className="flex items-center gap-2 text-[10px] text-command-cyan">
                <Loader2 size={13} className="animate-spin" /> AI Simulation Running…
              </div>
            )}
            <Button size="sm" variant="outline" className="border-command-border text-[10px] ml-auto" onClick={downloadSample}>
              <Download size={13} /> Sample Dataset
            </Button>
          </div>
        </div>
      )}

      {/* Empty upload prompt when no file yet */}
      {!hasData && !isError && (
        <div className="rounded-xl border border-command-border/50 bg-command/20 p-4 text-center">
          <div className="text-[11px] text-muted-foreground">
            Upload your hospital's operational data to generate real-time capacity intelligence.
          </div>
        </div>
      )}
    </div>
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
