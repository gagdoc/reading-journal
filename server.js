import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = Number(process.env.PORT || 8000);

await loadDotEnv();

const clientId = process.env.NAVER_CLIENT_ID || "";
const clientSecret = process.env.NAVER_CLIENT_SECRET || "";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    if (requestUrl.pathname === "/api/books/search") {
      return handleBookSearch(requestUrl, res);
    }

    return serveStatic(requestUrl.pathname, res);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: error?.message || "Internal server error" }));
  }
});

server.listen(port, () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
  for (const address of getLocalAddresses()) {
    console.log(`Available on network at http://${address}:${port}`);
  }
});

async function handleBookSearch(requestUrl, res) {
  if (!clientId || !clientSecret) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        error: "NAVER_CLIENT_ID and NAVER_CLIENT_SECRET are required.",
      })
    );
    return;
  }

  const query = String(requestUrl.searchParams.get("q") || "").trim();
  const display = clampInt(requestUrl.searchParams.get("display"), 1, 20, 8);
  const sort = requestUrl.searchParams.get("sort") === "date" ? "date" : "sim";

  if (!query) {
    res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Missing query" }));
    return;
  }

  const searchUrl = new URL("https://openapi.naver.com/v1/search/book.json");
  searchUrl.searchParams.set("query", query);
  searchUrl.searchParams.set("display", String(display));
  searchUrl.searchParams.set("start", "1");
  searchUrl.searchParams.set("sort", sort);

  try {
    const response = await fetch(searchUrl, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
        "User-Agent": "reading-journal/1.0",
      },
    });

    const text = await response.text();
    res.writeHead(response.status, {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(text);
  } catch (error) {
    res.writeHead(503, {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(
      JSON.stringify({
        error: "네이버 검색 서버에 연결할 수 없습니다.",
        detail: error?.message || "network error",
      })
    );
  }
}

async function serveStatic(requestPath, res) {
  const cleanPath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.normalize(path.join(__dirname, cleanPath));

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

async function loadDotEnv() {
  try {
    const envPath = path.join(__dirname, ".env");
    const text = await fs.readFile(envPath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");

      if (key && !(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // No .env file is fine; the server will surface a helpful message if keys are missing.
  }
}

function getLocalAddresses() {
  const addresses = [];

  for (const entries of Object.values(os.networkInterfaces())) {
    for (const info of entries || []) {
      if (info.family === "IPv4" && !info.internal) {
        addresses.push(info.address);
      }
    }
  }

  return addresses;
}
