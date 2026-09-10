// api/server.js — Vercel Node.js serverless handler for TanStack Start SSR
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const clientDir = join(__dirname, "../dist/client");

const MIME = {
  ".js":   "application/javascript",
  ".css":  "text/css",
  ".html": "text/html",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".ico":  "image/x-icon",
  ".mp4":  "video/mp4",
  ".json": "application/json",
  ".txt":  "text/plain",
  ".woff2":"font/woff2",
  ".woff": "font/woff",
};

// Try to load the SSR handler built by TanStack Start
let ssrHandler;
try {
  const mod = await import("../dist/server/server.js");
  ssrHandler = mod.default ?? mod;
} catch {
  ssrHandler = null;
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Serve static assets from dist/client
  const staticPath = join(clientDir, pathname);
  if (existsSync(staticPath) && !staticPath.endsWith("/")) {
    const ext = extname(staticPath);
    const mime = MIME[ext] ?? "application/octet-stream";
    const maxAge = pathname.startsWith("/assets/") ? 31536000 : 0;
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", maxAge ? `public, max-age=${maxAge}, immutable` : "no-cache");
    res.end(readFileSync(staticPath));
    return;
  }

  // SSR fallback
  if (ssrHandler?.fetch) {
    // Web Fetch API adapter
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (v) headers[k] = Array.isArray(v) ? v.join(", ") : v;
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;

    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method,
      headers,
      body: body?.length ? body : undefined,
    });

    const response = await ssrHandler.fetch(request, {}, {});
    res.statusCode = response.status;
    response.headers.forEach((v, k) => res.setHeader(k, v));
    const buf = await response.arrayBuffer();
    res.end(Buffer.from(buf));
    return;
  }

  // Last resort: serve a minimal HTML shell that loads the client bundle
  const assetsDir = join(clientDir, "assets");
  let jsFile = "", cssFile = "";
  try {
    const { readdirSync } = await import("node:fs");
    const files = readdirSync(assetsDir);
    jsFile  = files.find((f) => f.startsWith("index") && f.endsWith(".js"))  ?? "";
    cssFile = files.find((f) => f.startsWith("styles") && f.endsWith(".css")) ?? "";
  } catch { /* ignore */ }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CareCast AI</title>
  ${cssFile  ? `<link rel="stylesheet" href="/assets/${cssFile}" />` : ""}
</head>
<body>
  <div id="root"></div>
  ${jsFile ? `<script type="module" src="/assets/${jsFile}"></script>` : ""}
</body>
</html>`);
}
