/**
 * Minimal CSV parser — no external dependency.
 * Returns { columns: string[], rows: Record<string,string>[] }
 */
export function parseCSV(text: string): { columns: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { columns: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const cells: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === "," && !inQ) {
        cells.push(cur.trim()); cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    return cells;
  };

  const columns = parseRow(lines[0]!);
  const rows = lines.slice(1).map((line) => {
    const vals = parseRow(line);
    const obj: Record<string, string> = {};
    columns.forEach((col, i) => { obj[col] = vals[i] ?? ""; });
    return obj;
  });
  return { columns, rows };
}

/**
 * Parse XLS/XLSX using the SheetJS-compatible approach.
 * We use a dynamic import so it only loads when needed.
 */
export async function parseExcel(buffer: ArrayBuffer): Promise<{ columns: string[]; rows: Record<string, string>[] }> {
  // Dynamically import xlsx (SheetJS) — must be installed
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]!];
  if (!ws) return { columns: [], rows: [] };
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  if (!raw.length) return { columns: [], rows: [] };
  const columns = Object.keys(raw[0]!);
  const rows = raw.map((r) => {
    const obj: Record<string, string> = {};
    columns.forEach((c) => { obj[c] = String(r[c] ?? ""); });
    return obj;
  });
  return { columns, rows };
}

export async function parseFile(file: File): Promise<{ columns: string[]; rows: Record<string, string>[] }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "csv") {
    const text = await file.text();
    return parseCSV(text);
  }
  if (ext === "xls" || ext === "xlsx") {
    const buf = await file.arrayBuffer();
    return parseExcel(buf);
  }
  throw new Error(`Unsupported file format: .${ext}`);
}
