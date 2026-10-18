#!/usr/bin/env node
// shoot.mjs — render the model lab to a PNG with headless Chrome. Node 22+, zero dependencies.
//
//   node harness/lab/shoot.mjs --model models/horse.js --views left,front,three4,top --mode cel --pose rest --out out.png
//
// A static server (repo root, ephemeral port) serves harness/lab/index.html and the model; /cdn/* is proxied to
// jsdelivr with a disk cache; --ref is served at /__ref. Chrome is driven over CDP. Safe to run many at once:
// every run has its own server port, Chrome profile and debugging port.

import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { fixPath, resolveFromRoot } from "./paths.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const CACHE_DIR = path.join(os.tmpdir(), "html-anime-lab-cache");
const CDN_BASE = (process.env.LAB_CDN_BASE || "https://cdn.jsdelivr.net").replace(/\/+$/, ""); // a mirror, if jsdelivr is blocked
const PROFILE_PREFIX = "html-anime-lab-prof-";
const PAGE_TIMEOUT_MS = 30000;
const T_START = performance.now();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Reject after ms, and clear the timer either way so it never holds the process open.
function withTimeout(promise, ms, message) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => (timer = setTimeout(() => reject(new Error(message)), ms)))]).finally(() => clearTimeout(timer));
}

const USAGE = `usage: node harness/lab/shoot.mjs --model <path> [options]

  --model <path>        model module (repo-relative like models/horse.js, or any file path), or a library
                        entry: its folder or meta.json (models/library/horse)
  --views <list>        front,back,left,right,top,three4,hero          (default front,left,three4,top)
  --mode <m>            cel | clay | sil                               (default cel)
  --pose <name>         a pose from the model's meta.poses             (default rest)
  --out <file.png>      output PNG                                     (default <tmp>/html-anime-lab-out/...)
  --size <WxH>          window size                                    (default 1600x1000)
  --ref <image>         reference photo (file path or URL)
  --ref-view <view>     which cell gets the reference                  (default: first view)
  --ref-mode <m>        overlay | beside | edge                        (default overlay)
  --ref-opacity <0..1>  overlay opacity                                (default 0.5)
  --ref-crop <x,y,w,h>  box around the subject, fractions of the image (default 0,0,1,1)
  --ref-flip            mirror the reference
  --ref-scale <s>       multiply the automatic reference scale          (default 1)
  --ref-offset <dx,dy>  shift the reference, meters in the view plane (+x image-right, +y up)
  --focus <joint>       frame that joint in every view [--radius <m>]   (radius default: subtree size x 1.15)
  --light <x,y,z>       override the light direction (cel mode)
  --hide <a,b>          hide objects/joints by name, with their subtrees
  --only <joint>        show only that joint's subtree
  --montage <p1,p2,..>  one cell per pose, first view, one shared scale
  --clip <name>         library models: pose the model at one frame of a clip [--at <seconds>, default 0]
  --frames <n>          with --clip: a montage of n frames across the clip (first view, one scale)
  --strip <clip>        after the views, a row of --frames (default 4) frames of that clip in the left view
  --batch <shots.json>  JSON array of shots (same keys as flags, camelCase), one browser session
  --swiftshader         software GL (default: Chrome picks; falls back to it if WebGL fails)
  --lax                 contract violations (Math.random, imports ...) warn instead of fail
  --timeout <seconds>   how long to wait for the page                  (default 30)
  --joints              mark every joint pivot (yellow dots); --joint-names adds their names
  --cols <n> --mpp <m/px> --bg <#hex> --no-ref-box   page tweaks
  --info                also print the page's __labInfo (bbox, mm/px, cell boxes, ref rect, joint world positions) as one JSON line
  --verbose             print phase timings to stderr
  --serve [--port <n>]  just serve the lab and print its URL (open it in your own browser)
paths: relative paths resolve against the repo root; /c/... (Git Bash) and backslash paths work on Windows.
env: CHROME_PATH picks the browser; LAB_CDN_BASE swaps https://cdn.jsdelivr.net for a mirror.`;

// ------------------------------------------------------------------ options
const BOOL = new Set(["refFlip", "swiftshader", "serve", "help", "lax", "noRefBox", "verbose", "info", "joints", "jointNames"]);
const KNOWN = new Set([
  "model", "views", "mode", "pose", "out", "size", "ref", "refView", "refMode", "refOpacity", "refCrop", "refFlip",
  "batch", "swiftshader", "lax", "cols", "mpp", "bg", "noRefBox", "serve", "port", "help", "verbose", "info", "timeout", "joints", "jointNames",
  "refScale", "refOffset", "focus", "radius", "light", "hide", "only", "montage", "clip", "at", "frames", "strip",
]);
const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) throw new Error(`unexpected argument "${a}" (flags start with --)`);
    const eq = a.indexOf("=");
    const key = camel(a.slice(2, eq < 0 ? undefined : eq));
    if (!KNOWN.has(key)) throw new Error(`unknown option ${a.split("=")[0]}\n\n${USAGE}`);
    if (eq >= 0) out[key] = BOOL.has(key) ? truthy(a.slice(eq + 1)) : a.slice(eq + 1);
    else if (BOOL.has(key)) out[key] = true;
    else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) out[key] = argv[++i];
    else throw new Error(`--${a.slice(2)} needs a value`);
  }
  return out;
}
const truthy = (v) => v === true || ["1", "true", "yes", "on"].includes(String(v).toLowerCase());

// ------------------------------------------------------------------ files, mounts, refs
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".glb": "model/gltf-binary", ".bin": "application/octet-stream", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".avif": "image/avif", ".bmp": "image/bmp", ".txt": "text/plain; charset=utf-8", ".map": "application/json",
  ".woff": "font/woff", ".woff2": "font/woff2", ".wasm": "application/wasm",
};
const mime = (file) => MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
const isFile = (f) => {
  try {
    return fs.statSync(f).isFile();
  } catch {
    return false;
  }
};
const inside = (dir, file) => {
  const rel = path.relative(dir, file);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
};

// Relative paths resolve against the repo root; --model, --ref and --batch also fall back to the current directory.
function resolveOut(spec) {
  return resolveFromRoot(ROOT, spec);
}
// A library entry is a folder with meta.json (and its GLB): the page loads the meta.json.
function resolveModel(spec) {
  const fixed = fixPath(spec);
  for (const dir of [path.resolve(ROOT, fixed), path.resolve(process.cwd(), fixed)])
    if (isFile(path.join(dir, "meta.json"))) return path.join(dir, "meta.json");
  return resolveFile(spec, "model");
}
function resolveFile(spec, what) {
  spec = fixPath(spec);
  const tries = [...new Set([path.resolve(ROOT, spec), path.resolve(process.cwd(), spec), path.resolve(ROOT, spec.replace(/^[\\/]+/, ""))])];
  const file = tries.find(isFile);
  if (!file) throw new Error(`${what} not found: ${spec}\n  tried ${tries.join("\n        ")}`);
  return file;
}

// ------------------------------------------------------------------ the server
function createServer(registry) {
  const inflight = new Map();
  const state = { lastCdnError: null, inflight };

  async function cdnGet(rel) {
    const pinned = /@\d+\.\d+\.\d+[^/]*\//.test(rel);
    const file = path.join(CACHE_DIR, crypto.createHash("sha1").update(rel).digest("hex").slice(0, 20) + "-" + path.basename(rel.split("?")[0]));
    if (pinned) {
      try {
        const buf = await fsp.readFile(file);
        if (buf.length) return buf;
      } catch {}
    }
    if (inflight.has(rel)) return inflight.get(rel);
    const job = (async () => {
      let lastErr;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch(`${CDN_BASE}/${rel}`, { signal: AbortSignal.timeout(15000) });
          if (!res.ok) {
            const e = new Error(`${CDN_BASE}/${rel} answered HTTP ${res.status}`);
            e.status = res.status;
            if (res.status < 500) throw Object.assign(e, { final: true });
            throw e;
          }
          const buf = Buffer.from(await res.arrayBuffer());
          if (pinned && buf.length) {
            await fsp.mkdir(CACHE_DIR, { recursive: true });
            const tmp = `${file}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`;
            await fsp.writeFile(tmp, buf);
            await fsp.rename(tmp, file).catch(() => fsp.rm(tmp, { force: true })); // another run won the race: same bytes
          }
          return buf;
        } catch (e) {
          lastErr = e;
          if (e.final) break;
          await sleep(300 * (attempt + 1));
        }
      }
      state.lastCdnError = `cdn proxy: could not fetch ${rel}: ${lastErr?.cause?.code || lastErr?.message}${lastErr?.status ? "" : ` (offline? the lab loads three.js from jsdelivr once, then caches it in ${CACHE_DIR})`}`;
      throw lastErr;
    })().finally(() => inflight.delete(rel));
    inflight.set(rel, job);
    return job;
  }

  function sendFile(res, file, headers = {}) {
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        return res.end(`not found: ${path.basename(file)}`);
      }
      res.writeHead(200, { "Content-Type": mime(file), "Content-Length": st.size, "Cache-Control": "no-store", ...headers });
      fs.createReadStream(file).on("error", () => res.destroy()).pipe(res);
    });
  }

  const server = http.createServer(async (req, res) => {
    try {
      // Only answer to our own address: a web page that rebinds a hostname to 127.0.0.1 must not read the repo or the refs.
      const host = String(req.headers.host || "").toLowerCase();
      const port = server.address() && server.address().port;
      if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) return void res.writeHead(403, { "Content-Type": "text/plain" }).end("bad host");
      const { pathname } = new URL(req.url, "http://lab");
      let p;
      try {
        p = decodeURIComponent(pathname);
      } catch {
        return void res.writeHead(400, { "Content-Type": "text/plain" }).end("bad request");
      }
      if (p.split("/").some((seg) => seg.startsWith("."))) return void res.writeHead(403, { "Content-Type": "text/plain" }).end("forbidden");
      if (p === "/favicon.ico") return void res.writeHead(204).end();
      let m;
      if ((m = /^\/__ref(?:\/(\d+))?$/.exec(p))) {
        const file = registry.refs[Number(m[1] || 0)];
        return file ? sendFile(res, file) : void res.writeHead(404).end("no such ref");
      }
      if ((m = /^\/__m\/(\d+)\/(.+)$/.exec(p))) {
        const file = registry.models[Number(m[1])]; // a model from outside the repo: only that one file is served,
        if (file && path.basename(file) === m[2]) return sendFile(res, file);
        // or, for a library entry (meta.json), the files directly beside it (its GLB)
        if (file && path.basename(file) === "meta.json" && !m[2].includes("/")) return sendFile(res, path.join(path.dirname(file), m[2]));
        return void res.writeHead(404).end("not found");
      }
      if (p.startsWith("/cdn/")) {
        const rel = p.slice("/cdn/".length) + (new URL(req.url, "http://lab").search || "");
        try {
          const buf = await cdnGet(rel);
          res.writeHead(200, {
            "Content-Type": mime(rel.split("?")[0]), "Content-Length": buf.length,
            "Cache-Control": "public, max-age=31536000, immutable", "Access-Control-Allow-Origin": "*",
          });
          return void res.end(buf);
        } catch (e) {
          res.writeHead(e.status === 404 ? 404 : 502, { "Content-Type": "text/plain" });
          return void res.end(state.lastCdnError || String(e));
        }
      }
      const file = path.resolve(ROOT, "." + path.posix.normalize("/" + p));
      if (!(file === ROOT || inside(ROOT, file))) return void res.writeHead(403).end("forbidden");
      return sendFile(res, fs.existsSync(file) && fs.statSync(file).isDirectory() ? path.join(file, "index.html") : file);
    } catch (e) {
      res.writeHead(500, { "Content-Type": "text/plain" }).end(String(e));
    }
  });
  return { server, state, cdnGet };
}

// Fetch three.js into the disk cache while Chrome starts, so a cold cache costs almost nothing extra.
async function warmCdn(cdnGet) {
  let html = "";
  try {
    html = await fsp.readFile(path.join(HERE, "index.html"), "utf8");
  } catch {}
  const seen = new Set();
  const visit = async (rel, depth) => {
    if (seen.has(rel) || depth > 2) return;
    seen.add(rel);
    try {
      const buf = await cdnGet(rel);
      if (!/\.m?js$/.test(rel)) return;
      const text = buf.toString("utf8", 0, Math.min(buf.length, 20000));
      const here = path.posix.dirname(rel);
      await Promise.all(
        [...text.matchAll(/(?:from|import)\s*["'](\.\.?\/[^"']+)["']/g)].map((m) => visit(path.posix.normalize(path.posix.join(here, m[1])), depth + 1)),
      );
    } catch {}
  };
  await Promise.all([...html.matchAll(/"\/cdn\/([^"]+\.m?js)"/g)].map((m) => visit(m[1], 0)));
}

// ------------------------------------------------------------------ the browser
// Playwright's Chromium (PLAYWRIGHT_BROWSERS_PATH, e.g. /opt/pw-browsers/chromium-1194/chrome-linux/chrome), newest first.
function playwrightChromium() {
  const dir = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";
  try {
    return fs.readdirSync(dir).filter((d) => /^chromium-\d+$/.test(d)).sort((a, b) => parseInt(b.slice(9)) - parseInt(a.slice(9)))
      .flatMap((d) => [path.join(dir, d, "chrome-linux64", "chrome"), path.join(dir, d, "chrome-linux", "chrome")]);
  } catch {
    return [];
  }
}

function findBrowser() {
  const env = process.env.CHROME_PATH;
  if (env) {
    if (isFile(env)) return env;
    throw new Error(`CHROME_PATH is set but not a file: ${env}`);
  }
  const e = process.env;
  const onPath = (name) => (e.PATH || "").split(path.delimiter).map((d) => path.join(d, name)).find(isFile);
  const list = {
    win32: [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      e.LOCALAPPDATA && path.join(e.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe"),
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ],
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ],
  }[process.platform] || [
    ...["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge", "microsoft-edge-stable"].map(onPath),
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/snap/bin/chromium", "/usr/bin/microsoft-edge",
    ...playwrightChromium(),
  ];
  const found = list.filter(Boolean).find(isFile);
  if (!found) throw new Error("no Chrome or Edge found: install one or set CHROME_PATH to its executable");
  return found;
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 0;
    this.pending = new Map();
    this.handlers = new Set();
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(typeof ev.data === "string" ? ev.data : Buffer.from(ev.data).toString());
      if (msg.id !== undefined) {
        const p = this.pending.get(msg.id);
        if (!p) return;
        this.pending.delete(msg.id);
        if (msg.error) p.reject(new Error(`${p.method}: ${msg.error.message}`));
        else p.resolve(msg.result);
      } else for (const h of this.handlers) h(msg);
    });
    ws.addEventListener("close", () => {
      for (const p of this.pending.values()) p.reject(new Error(`${p.method}: browser connection closed`));
      this.pending.clear();
    });
  }
  static async connect(url) {
    if (typeof WebSocket !== "function") throw new Error("this Node has no global WebSocket: use Node 22 or newer");
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", () => reject(new Error(`could not open the DevTools socket ${url}`)), { once: true });
    });
    return new Cdp(ws);
  }
  send(method, params = {}, sessionId) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      // undici drops a send() on a closed socket without a word: fail fast so a dead browser is noticed.
      if (this.ws.readyState !== 1) return reject(new Error(`${method}: browser connection closed`));
      this.pending.set(id, { resolve, reject, method });
      try {
        this.ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
      } catch (e) {
        this.pending.delete(id);
        reject(e);
      }
    });
  }
  onEvent(fn) {
    this.handlers.add(fn);
    return () => this.handlers.delete(fn);
  }
}

const liveBrowsers = new Set();
function killTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    else process.kill(pid, "SIGKILL");
  } catch {}
}
const exited = (child) => child.exitCode !== null || child.signalCode !== null;
function waitExit(child, ms) {
  if (exited(child)) return Promise.resolve(true);
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(false), ms);
    child.once("exit", () => (clearTimeout(t), resolve(true)));
  });
}
async function removeDir(dir) {
  const until = Date.now() + 3000;
  for (;;) {
    try {
      await fsp.rm(dir, { recursive: true, force: true, maxRetries: 2, retryDelay: 80 });
      return true;
    } catch (e) {
      if (Date.now() > until) return false; // EBUSY while Windows lets go of the files; the next run sweeps stale profiles
      await sleep(150);
    }
  }
}
function sweepStaleProfiles() {
  try {
    for (const name of fs.readdirSync(os.tmpdir())) {
      if (!name.startsWith(PROFILE_PREFIX)) continue;
      const dir = path.join(os.tmpdir(), name);
      if (Date.now() - fs.statSync(dir).mtimeMs > 3 * 3600 * 1000) fs.rmSync(dir, { recursive: true, force: true, maxRetries: 1 });
    }
  } catch {}
}

async function launchBrowser({ swiftshader = false } = {}) {
  const exe = findBrowser();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), PROFILE_PREFIX));
  const args = [
    "--headless=new", `--user-data-dir=${profile}`, "--remote-debugging-port=0",
    "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--disable-sync", "--disable-component-update",
    "--disable-default-apps", "--disable-background-networking", "--disable-breakpad", "--disable-translate",
    "--disable-features=Translate,MediaRouter,OptimizationHints",
    "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows",
    "--hide-scrollbars", "--mute-audio", "--force-device-scale-factor=1", "--ignore-gpu-blocklist", "--password-store=basic",
  ];
  if (swiftshader) args.push("--use-angle=swiftshader", "--enable-unsafe-swiftshader");
  if (process.getuid?.() === 0) args.push("--no-sandbox"); // Chrome refuses to start as root (containers, CI) with its sandbox on
  args.push("about:blank");
  const child = spawn(exe, args, { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
  const b = { child, profile, exe, cdp: null, closed: false, swiftshader, tail: "" };
  child.stderr.on("data", (d) => (b.tail = (b.tail + d).slice(-2000)));
  child.on("error", (e) => (b.spawnError = e));
  liveBrowsers.add(b);
  try {
    const portFile = path.join(profile, "DevToolsActivePort");
    const until = Date.now() + 20000;
    let port;
    let wsPath;
    while (!port) {
      if (b.spawnError) throw new Error(`could not start ${exe}: ${b.spawnError.message}`);
      if (exited(child)) throw new Error(`browser exited during startup (code ${child.exitCode})\n${b.tail.trim()}`);
      try {
        const [p, w] = fs.readFileSync(portFile, "utf8").trim().split(/\r?\n/);
        if (p && w) [port, wsPath] = [Number(p), w];
      } catch {}
      if (!port) {
        if (Date.now() > until) throw new Error(`browser did not open a DevTools port in 20 s\n${b.tail.trim()}`);
        await sleep(25);
      }
    }
    b.cdp = await Cdp.connect(`ws://127.0.0.1:${port}${wsPath}`);
    return b;
  } catch (e) {
    await closeBrowser(b);
    throw e;
  }
}

async function closeBrowser(b) {
  if (b.closed) return;
  b.closed = true;
  if (b.cdp) {
    await withTimeout(b.cdp.send("Browser.close"), 1500, "Browser.close timed out").catch(() => {});
    try {
      b.cdp.ws.close();
    } catch {}
  }
  if (b.spawnError) {
    liveBrowsers.delete(b);
    await removeDir(b.profile);
    return;
  }
  if (!(await waitExit(b.child, 3000))) {
    killTree(b.child.pid);
    await waitExit(b.child, 2000);
  }
  liveBrowsers.delete(b);
  await removeDir(b.profile);
}
function cleanupNow() {
  for (const b of liveBrowsers) {
    if (!exited(b.child)) killTree(b.child.pid);
    try {
      fs.rmSync(b.profile, { recursive: true, force: true, maxRetries: 1 });
    } catch {}
  }
}
process.on("exit", cleanupNow);
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"])
  process.on(sig, () => {
    cleanupNow();
    process.exit(sig === "SIGTERM" ? 143 : 130);
  });

// ------------------------------------------------------------------ one shot
const remote = (v) => /^[a-z][a-z0-9+.-]*:\/\//i.test(v);
const fixed = (v) => (v >= 0.1 ? v.toFixed(2) : v.toFixed(3));
const consoleText = (args = []) => args.map((a) => (a.value !== undefined ? (typeof a.value === "string" ? a.value : JSON.stringify(a.value)) : a.description || a.type)).join(" ");

function pageUrl(origin, s) {
  const q = new URLSearchParams();
  const set = (k, v) => v !== undefined && v !== null && v !== "" && q.set(k, String(v));
  set("model", s.modelUrl);
  set("pose", s.pose);
  set("mode", s.mode);
  set("views", Array.isArray(s.views) ? s.views.join(",") : s.views);
  if (s.refUrl) {
    set("ref", s.refUrl);
    set("refView", s.refView);
    set("refMode", s.refMode);
    set("refOpacity", s.refOpacity);
    set("refCrop", Array.isArray(s.refCrop) ? s.refCrop.join(",") : s.refCrop);
    set("refScale", s.refScale);
    set("refOffset", Array.isArray(s.refOffset) ? s.refOffset.join(",") : s.refOffset);
    if (truthy(s.refFlip)) q.set("refFlip", "1");
  }
  if (truthy(s.lax)) q.set("strict", "0");
  if (truthy(s.noRefBox) || (s.refBox !== undefined && !truthy(s.refBox))) q.set("refBox", "0");
  set("focus", s.focus);
  set("radius", s.radius);
  set("light", Array.isArray(s.light) ? s.light.join(",") : s.light);
  set("hide", Array.isArray(s.hide) ? s.hide.join(",") : s.hide);
  set("only", s.only);
  set("montage", Array.isArray(s.montage) ? s.montage.join(",") : s.montage);
  set("clip", s.clip);
  set("at", s.at);
  set("frames", s.frames);
  set("strip", s.strip);
  set("cols", s.cols);
  set("mpp", s.mpp);
  set("bg", s.bg);
  if (truthy(s.jointNames)) q.set("joints", "names");
  else if (truthy(s.joints)) q.set("joints", "1");
  return `${origin}/harness/lab/index.html?${q}`;
}

async function shootOne(b, origin, s, log) {
  const { cdp } = b;
  const [width, height] = s.size;
  const t0 = performance.now();
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  let off = () => {};
  try {
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    const send = (m, p) => cdp.send(m, p, sessionId);
    const lines = [];
    const say = (text) => {
      lines.push(text);
      log(`[page] ${text}`);
    };
    off = cdp.onEvent((msg) => {
      if (msg.sessionId !== sessionId) return;
      const p = msg.params || {};
      if (msg.method === "Runtime.consoleAPICalled" && p.type !== "debug" && p.type !== "trace") say(`${p.type}: ${consoleText(p.args)}`);
      else if (msg.method === "Runtime.exceptionThrown") {
        const d = p.exceptionDetails || {};
        say(`exception: ${(d.exception && (d.exception.description || d.exception.value)) || d.text}${d.url ? ` (${d.url}:${(d.lineNumber ?? 0) + 1}:${(d.columnNumber ?? 0) + 1})` : ""}`);
      } else if (msg.method === "Log.entryAdded" && ["warning", "error"].includes(p.entry.level)) say(`${p.entry.level}: ${p.entry.text}${p.entry.url ? ` (${p.entry.url})` : ""}`);
    });
    await Promise.all([send("Page.enable"), send("Runtime.enable"), send("Log.enable")]);
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    const nav = await send("Page.navigate", { url: pageUrl(origin, s) });
    if (nav.errorText) throw new Error(`could not open the lab page: ${nav.errorText}`);

    const limit = Number(s.timeout) > 0 ? Number(s.timeout) * 1000 : PAGE_TIMEOUT_MS;
    const deadline = performance.now() + limit;
    let state;
    let stuck = false;
    for (;;) {
      let r = null;
      try {
        r = await withTimeout(
          send("Runtime.evaluate", { expression: "JSON.stringify({ ready: !!window.__labReady, error: window.__labError || null })", returnByValue: true }),
          Math.max(1000, deadline - performance.now()),
          "page not answering",
        );
      } catch (e) {
        if (/closed/.test(e.message)) throw e; // else the page swapped its JS context while loading: ask again
        stuck = /not answering/.test(e.message);
      }
      state = r && r.result && r.result.value ? JSON.parse(r.result.value) : { ready: false, error: null };
      if (state.ready || state.error) break;
      if (performance.now() > deadline) {
        const why = stuck ? "the page stopped answering: an endless loop in build() or pose()?" : "no __labReady and no __labError";
        throw Object.assign(new Error(`timed out after ${limit / 1000} s waiting for the lab page (${why})`), { lines, wedged: stuck });
      }
      await sleep(30);
    }
    if (state.error) throw Object.assign(new Error(state.error), { lab: true, lines });

    const infoRes = await withTimeout(send("Runtime.evaluate", { expression: "JSON.stringify(window.__labInfo)", returnByValue: true }), 10000, "reading __labInfo timed out");
    const info = JSON.parse(infoRes.result.value);
    const shot = await withTimeout(send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }), 20000, "Page.captureScreenshot timed out after 20 s");
    const png = Buffer.from(shot.data, "base64");
    await fsp.mkdir(path.dirname(s.out), { recursive: true });
    await fsp.writeFile(s.out, png);
    return { png, info, ms: performance.now() - t0 };
  } finally {
    off();
    await withTimeout(cdp.send("Target.closeTarget", { targetId }), 3000, "closeTarget timed out").catch(() => {});
  }
}

// ------------------------------------------------------------------ main
function normalizeShot(raw, index, registry) {
  const s = {};
  for (const [k, v] of Object.entries(raw)) s[camel(k)] = v;
  if (!s.model) throw new Error(`shot ${index + 1}: --model is required`);
  s.mode = s.mode || "cel";
  s.pose = s.pose || "rest";
  const size = Array.isArray(s.size) ? s.size : String(s.size || "1600x1000").split(/[x,*]/i);
  s.size = size.map(Number);
  if (s.size.length !== 2 || s.size.some((n) => !(n >= 64 && n <= 8192))) throw new Error(`shot ${index + 1}: size must be WxH between 64 and 8192 (got ${raw.size})`);
  s.out = resolveOut(
    s.out || path.join(os.tmpdir(), "html-anime-lab-out", `${path.basename(String(s.model).replace(/\\/g, "/"), path.extname(String(s.model)))}-${s.mode}-${s.pose}-${process.pid}-${index}.png`),
  );
  // Model: inside the repo it is served at its own path, anywhere else under /__m/<n>/
  if (remote(s.model)) s.modelUrl = s.model;
  else {
    const file = resolveModel(String(s.model));
    s.modelFile = file;
    if (inside(ROOT, file)) s.modelUrl = "/" + path.relative(ROOT, file).split(path.sep).join("/");
    else {
      let n = registry.models.indexOf(file);
      if (n < 0) n = registry.models.push(file) - 1;
      s.modelUrl = `/__m/${n}/${encodeURIComponent(path.basename(file))}`;
    }
  }
  if (s.ref) {
    if (remote(String(s.ref))) s.refUrl = s.ref;
    else {
      const file = resolveFile(String(s.ref), "reference image");
      let n = registry.refs.indexOf(file);
      if (n < 0) n = registry.refs.push(file) - 1;
      s.refUrl = n === 0 ? "/__ref" : `/__ref/${n}`;
    }
  }
  return s;
}

// `node --check file.js` treats an ambiguous .js as CommonJS and stays quiet about a module's syntax error,
// so feed the source to node as a module on stdin.
function syntaxCheck(file) {
  const r = spawnSync(process.execPath, ["--input-type=module", "--check"], { input: fs.readFileSync(file), encoding: "utf8" });
  if (r.status === 0) return null;
  const text = (r.stderr || r.stdout || "syntax error").split("\n").filter((l) => !/^\s+at |^Node\.js v/.test(l)).join("\n");
  return text.replace("[stdin]", file).trim();
}

// Page errors carry http://127.0.0.1:PORT/... frames: show file paths, and drop the lab's own frames.
function prettyError(msg, origin, registry) {
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const mounted = new RegExp(`(?:${esc(origin)})?/__m/(\\d+)/([^\\s):?]+)`, "g");
  return msg
    .split("\n")
    .filter((line) => !(/^\s+at /.test(line) && line.includes("/harness/lab/index.html")))
    .map((line) =>
      line
        .replace(mounted, (_, n, name) => registry.models[Number(n)] || decodeURIComponent(name))
        .split(origin)
        .join("")
        .replace(/\?lab=1/g, ""),
    )
    .join("\n")
    .replace(/^Error: /, "");
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || (process.argv.length <= 2)) {
    console.log(USAGE);
    return 0;
  }
  const registry = { refs: [], models: [] };
  const { server, state: srvState, cdnGet } = createServer(registry);
  await new Promise((resolve, reject) => (server.once("error", reject), server.listen(Number(opts.port) || 0, "127.0.0.1", resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const closeServer = () => (server.closeAllConnections?.(), new Promise((resolve) => server.close(resolve)));

  try {
    // Shots: one from the flags, or a batch file whose items sit on top of the flags.
    const { batch, ...flags } = opts;
    let raws = [flags];
    if (batch) {
      const list = JSON.parse(await fsp.readFile(resolveFile(String(batch), "batch file"), "utf8"));
      if (!Array.isArray(list) || !list.length) throw new Error("--batch file must hold a non-empty JSON array of shots");
      const flagOnly = new Set(["batch", "serve", "port", "help", "verbose", "swiftshader"]);
      list.forEach((item, i) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`batch item ${i + 1} must be an object of options`);
        for (const k of Object.keys(item)) {
          const key = camel(k);
          if (flagOnly.has(key)) throw new Error(`batch item ${i + 1}: "${k}" is a command-line flag, not a per-shot key`);
          if (!KNOWN.has(key) && key !== "refBox") throw new Error(`batch item ${i + 1}: unknown key "${k}" (per-shot keys: ${[...KNOWN].filter((x) => !flagOnly.has(x)).join(", ")}, refBox)`);
        }
      });
      raws = list.map((item) => ({ ...flags, ...Object.fromEntries(Object.entries(item).map(([k, v]) => [camel(k), v])) }));
    }
    if (opts.serve) {
      const s = normalizeShot(raws[0].model ? raws[0] : { ...raws[0], model: "harness/lab/sample.js" }, 0, registry);
      console.log(pageUrl(origin, s));
      console.error("serving; press Ctrl+C to stop");
      warmCdn(cdnGet);
      await new Promise(() => {});
    }

    const shots = raws.map((r, i) => normalizeShot(r, i, registry));
    const queue = [];
    let failed = 0;
    const checked = new Map();
    for (const s of shots) {
      if (s.modelFile && /\.m?js$/i.test(s.modelFile)) {
        if (!checked.has(s.modelFile)) checked.set(s.modelFile, syntaxCheck(s.modelFile));
        const err = checked.get(s.modelFile);
        if (err) {
          failed++;
          console.error(`error: ${s.model} has a syntax error\n${err}`);
          continue;
        }
      }
      queue.push(s);
    }
    if (!queue.length) return 1;

    warmCdn(cdnGet); // runs while Chrome starts
    sweepStaleProfiles();
    const vlog = (text) => opts.verbose && console.error(`[lab] ${text}`);
    const tLaunch = performance.now();
    let b = await launchBrowser({ swiftshader: truthy(opts.swiftshader) });
    const launchMs = performance.now() - tLaunch;
    vlog(`browser start ${Math.round(launchMs)} ms (${b.exe})`);
    const batchMode = Boolean(batch);

    let restart = false; // the browser died or wedged: the next try gets a fresh one
    for (const s of queue) {
      const limit = Number(s.timeout) > 0 ? Number(s.timeout) * 1000 : PAGE_TIMEOUT_MS;
      for (let attempt = 0; ; attempt++) {
        try {
          if (restart) {
            await closeBrowser(b);
            b = await launchBrowser({ swiftshader: b.swiftshader });
            restart = false;
          }
          const r = await withTimeout(shootOne(b, origin, s, (line) => console.error(line)), limit + 25000, "the browser stopped answering");
          const [w, h] = [r.png.readUInt32BE(16), r.png.readUInt32BE(20)];
          const bb = r.info.bbox.size;
          const ms = batchMode ? r.ms : performance.now() - T_START;
          console.log(`wrote ${s.out} ${w}x${h} ${Math.round(ms)}ms tris=${r.info.triangles} bbox=${fixed(bb.x)}x${fixed(bb.y)}x${fixed(bb.z)}m`);
          for (const warn of r.info.warnings || []) console.error(`[lab] warn: ${warn}`);
          if (truthy(s.info)) console.log(`info ${JSON.stringify(r.info)}`);
          vlog(`shot ${Math.round(r.ms)} ms (page draw ${r.info.ms} ms)`);
          break;
        } catch (e) {
          // Hardware WebGL can be missing (CI, remote desktop): retry once on software GL.
          if (!b.swiftshader && attempt === 0 && /creating WebGL context|WebGL.*(not supported|unavailable)/i.test(e.message)) {
            console.error("[lab] WebGL failed on the default GPU path; retrying with --swiftshader");
            await closeBrowser(b);
            b = await launchBrowser({ swiftshader: true });
            continue;
          }
          // The browser itself died: start a new one and try this shot once more.
          if (!e.lab && !e.wedged && attempt === 0 && /connection closed|browser exited|stopped answering/i.test(e.message)) {
            console.error("[lab] the browser stopped; starting a new one and trying this shot again");
            restart = true;
            continue;
          }
          failed++;
          console.error(`error: ${batchMode ? `shot for ${s.out}: ` : ""}${e.lab ? prettyError(e.message, origin, registry) : e.message}`);
          if (srvState.lastCdnError) console.error(srvState.lastCdnError);
          else if (srvState.inflight.size) console.error(`cdn proxy: still waiting on ${[...srvState.inflight.keys()].join(", ")} from ${CDN_BASE} (network blocked? LAB_CDN_BASE can point at a mirror)`);
          if (!e.lab) restart = true; // not a model error: do not trust this browser for the next shot
          break;
        }
      }
    }
    const tClose = performance.now();
    await closeBrowser(b);
    vlog(`browser close ${Math.round(performance.now() - tClose)} ms`);
    if (batchMode) console.error(`batch: ${shots.length - failed} ok, ${failed} failed, browser start ${Math.round(launchMs)} ms, total ${Math.round(performance.now() - T_START)} ms`);
    return failed ? 1 : 0;
  } finally {
    await closeServer();
  }
}

main().then(
  (code) => {
    process.exitCode = code;
    setTimeout(() => process.exit(code), 1500).unref();
  },
  (e) => {
    console.error(`error: ${e.message}`);
    cleanupNow();
    process.exitCode = 1;
    setTimeout(() => process.exit(1), 1500).unref();
  },
);
