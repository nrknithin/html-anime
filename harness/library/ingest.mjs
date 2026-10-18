#!/usr/bin/env node
// ingest.mjs — one library entry from its source to models/library/<id>/model.glb. Node 22+, no npm dependencies;
// Blender's Python module converts, `npx @gltf-transform/cli` compresses.
//
//   npm run library:ingest -- <id> [--refetch] [--keep-tmp]
//
// models/library/<id>/meta.json holds the recipe under "ingest" (see harness/library/README.md):
//   fetch   { type: "file"|"zip"|"kenney"|"itch", url, page, upload, sha256 }  where the download comes from
//   member  path inside the zip ("Farm Animals/FBX/Horse.fbx"); omitted for a single file
//   height, yaw, pitch, roll, drop, dropBackfaces, keepActions, attach      handed to convert.py
// Steps: download (cached under <tmp>/html-anime-library-cache, sha256 pinned in meta.json on the first fetch and
// checked on every later one) -> unzip the member (in Node) -> convert.py (Blender: import, normalize, GLB) ->
// gltf-transform optimize (meshopt, no simplify, no palette, materials kept) -> models/library/<id>/model.glb, and
// the measured facts written back into meta.json (sha256, bytes, triangles, bones, clipInfo, sourceMaterials).

import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const LIB = path.join(ROOT, "models", "library");
const CACHE = path.join(os.tmpdir(), "html-anime-library-cache");
const GLTF_TRANSFORM = "@gltf-transform/cli@4.5.1";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

const USAGE = `usage: node harness/library/ingest.mjs <id> [--refetch] [--keep-tmp]
env: LIBRARY_PYTHON = a Python with Blender's module (pip install bpy==4.2.0; default python3.11)`;

// ---------------------------------------------------------------- download
async function get(url, opts = {}) {
  let last;
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(url, { ...opts, headers: { "User-Agent": UA, ...(opts.headers || {}) }, signal: AbortSignal.timeout(120000) });
      if (res.status >= 500 || res.status === 429) throw new Error(`HTTP ${res.status}`); // 429: rate limited, wait and retry
      return res;
    } catch (e) {
      last = e;
      await sleep(2000 * 2 ** i);
    }
  }
  throw new Error(`could not fetch ${url}: ${last?.cause?.code || last?.message}`);
}
async function bytes(url, opts) {
  const res = await get(url, opts);
  if (!res.ok) throw new Error(`${url} answered HTTP ${res.status}`);
  const type = res.headers.get("content-type") || "";
  const buf = Buffer.from(await res.arrayBuffer());
  if (/text\/html/.test(type) && /<title>[^<]*(quota|denied|challenge|just a moment)/i.test(buf.toString("utf8", 0, 4000)))
    throw new Error(`${url} returned an HTML block page, not a file`);
  return buf;
}

// Kenney: the zip link on the kit page changes with every update, so it is read from the page each time.
async function kenneyZip(page) {
  const html = await (await get(page)).text();
  const m = html.match(/https:\/\/kenney\.nl\/media\/pages\/assets\/[^"']+?\.zip/);
  if (!m) throw new Error(`no zip link on ${page}`);
  return m[0];
}

// itch.io free downloads: the page's form token -> the download page -> the upload's signed CDN URL (the same three
// requests the "No thanks, just take me to the downloads" button makes).
async function itchFile(page, upload) {
  const jar = new Map();
  const keep = (res) => {
    for (const c of res.headers.getSetCookie?.() || []) {
      const [kv] = c.split(";");
      const i = kv.indexOf("=");
      jar.set(kv.slice(0, i), kv.slice(i + 1));
    }
    return res;
  };
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  const html = await keep(await get(page)).text();
  const token = (html.match(/name="csrf_token" value="([^"]+)"/) || [])[1];
  if (!token) throw new Error(`no csrf token on ${page}`);
  const form = (extra = {}) => new URLSearchParams({ csrf_token: token, ...extra });
  const xhr = { "X-Requested-With": "XMLHttpRequest", "Content-Type": "application/x-www-form-urlencoded", Referer: page };
  const r1 = keep(await get(`${page.replace(/\/$/, "")}/download_url`, { method: "POST", body: form(), headers: { ...xhr, Cookie: cookie() } }));
  const dl = (await r1.json()).url;
  if (!dl) throw new Error(`itch: no download page for ${page}`);
  const dhtml = await keep(await get(dl, { headers: { Cookie: cookie() } })).text();
  const ups = [...dhtml.matchAll(/data-upload_id="(\d+)"[\s\S]*?title="([^"]+)"/g)].map((m) => ({ id: m[1], name: m[2] }));
  const up = ups.find((u) => u.name === upload);
  if (!up) throw new Error(`itch: no upload "${upload}" on ${page} (uploads: ${ups.map((u) => u.name).join(", ")})`);
  // The upload's file URL: posted from the download page with that page's token and cookies (no key parameter).
  const dtoken = (dhtml.match(/name="csrf_token" value="([^"]+)"/) || [])[1] || token;
  const r2 = keep(await get(`${page.replace(/\/$/, "")}/file/${up.id}?source=game_download`, {
    method: "POST",
    body: new URLSearchParams({ csrf_token: dtoken }),
    headers: { ...xhr, Referer: dl, Cookie: cookie() },
  }));
  const url = (await r2.json()).url;
  if (!url) throw new Error(`itch: no file URL for upload ${upload}`);
  return url;
}

async function fetchSource(f, refetch) {
  const keyText = JSON.stringify([f.type, f.url || "", f.page || "", f.upload || ""]);
  const file = path.join(CACHE, sha256(keyText).slice(0, 24));
  if (!refetch && fs.existsSync(file)) return { buf: await fsp.readFile(file), url: f.url };
  let url = f.url;
  if (f.type === "kenney") url = await kenneyZip(f.page);
  else if (f.type === "itch") url = await itchFile(f.page, f.upload);
  else if (!["file", "zip"].includes(f.type)) throw new Error(`ingest.fetch.type must be file, zip, kenney or itch (got ${f.type})`);
  console.error(`[ingest] downloading ${f.type === "itch" ? `${f.page} :: ${f.upload}` : url}`);
  const buf = await bytes(url);
  await fsp.mkdir(CACHE, { recursive: true });
  await fsp.writeFile(file, buf);
  await sleep(1000); // one file at a time, a pause between requests
  return { buf, url };
}

// ---------------------------------------------------------------- zip (central directory, stored or deflated)
export function unzipMember(buf, want) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("not a zip file");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const names = [];
  const norm = (s) => s.replace(/\\/g, "/").replace(/^\/+/, "");
  for (let k = 0; k < count; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("zip: bad central directory");
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const xlen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = norm(buf.toString("utf8", p + 46, p + 46 + nlen));
    names.push(name);
    if (name === norm(want)) {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + csize);
      if (method === 0) return Buffer.from(data);
      if (method === 8) return zlib.inflateRawSync(data);
      throw new Error(`zip: ${name} uses compression method ${method}`);
    }
    p += 46 + nlen + xlen + clen;
  }
  const near = names.filter((n) => n.toLowerCase().endsWith(path.extname(want).toLowerCase())).slice(0, 40);
  throw new Error(`zip has no "${want}". Files with that extension:\n  ${near.join("\n  ")}`);
}
export function zipList(buf) {
  const out = [];
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  let p = buf.readUInt32LE(eocd + 16);
  for (let k = 0, n = buf.readUInt16LE(eocd + 10); k < n; k++) {
    const nlen = buf.readUInt16LE(p + 28);
    out.push(buf.toString("utf8", p + 46, p + 46 + nlen));
    p += 46 + nlen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  return out;
}

// ---------------------------------------------------------------- steps
function run(cmd, args, what, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 << 20, shell: process.platform === "win32" && cmd === "npx", ...opts });
  if (r.error) throw new Error(`${what}: could not run ${cmd}: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${what} failed (exit ${r.status}):\n${(r.stderr || "").split("\n").slice(-25).join("\n")}\n${(r.stdout || "").split("\n").slice(-10).join("\n")}`);
  return r.stdout;
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes("--help")) return console.log(USAGE);
  const id = args.find((a) => !a.startsWith("--"));
  const refetch = args.includes("--refetch");
  const dir = path.join(LIB, id);
  const metaFile = path.join(dir, "meta.json");
  if (!fs.existsSync(metaFile)) throw new Error(`no ${path.relative(ROOT, metaFile)}: write the entry's meta.json with its "ingest" recipe first`);
  const meta = JSON.parse(await fsp.readFile(metaFile, "utf8"));
  const ing = meta.ingest;
  if (!ing || !ing.fetch) throw new Error(`${id}: meta.json has no ingest.fetch`);

  // 1. fetch, pinned by hash
  const { buf, url } = await fetchSource(ing.fetch, refetch);
  const hash = sha256(buf);
  if (ing.fetch.sha256 && ing.fetch.sha256 !== hash) throw new Error(`${id}: download sha256 ${hash} does not match the pinned ${ing.fetch.sha256} (the source changed: check it, then clear ingest.fetch.sha256 to re-pin)`);
  ing.fetch.sha256 = hash;
  ing.fetch.bytes = buf.length;
  if (url && ing.fetch.type !== "itch") ing.fetch.resolved = url;

  // 2. the member, into a fresh scratch folder (downloads are data: nothing in it is ever run)
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), `html-anime-ingest-${id}-`));
  const srcDir = path.join(tmp, "src");
  await fsp.mkdir(srcDir);
  let src;
  if (ing.member) {
    // The member and its extras keep their full zip paths under the scratch folder, so any relative reference
    // resolves as in the pack: a GLB's "Textures/colormap.png", a .blend's "//../Textures/palette.png".
    const inside = (rel) => {
      const to = path.resolve(srcDir, rel.replace(/\\/g, "/"));
      if (!to.startsWith(srcDir + path.sep)) throw new Error(`zip path ${rel} leaves the scratch folder`);
      return to;
    };
    const data = unzipMember(buf, ing.member);
    src = inside(ing.member);
    await fsp.mkdir(path.dirname(src), { recursive: true });
    await fsp.writeFile(src, data);
    for (const extra of ing.extraMembers || []) {
      const to = inside(extra);
      await fsp.mkdir(path.dirname(to), { recursive: true });
      await fsp.writeFile(to, unzipMember(buf, extra));
    }
    ing.memberSha256 = sha256(data);
  } else {
    src = path.join(srcDir, ing.filename || path.basename(new URL(url || ing.fetch.url).pathname));
    await fsp.writeFile(src, buf);
    // fetch.extraFiles: [{ url, path }] a multi-file source (a .gltf's .bin and textures, Poly Haven), each pinned
    // by sha256 like the main file and saved at `path` relative to it.
    for (const x of ing.fetch.extraFiles || []) {
      const to = path.resolve(srcDir, x.path);
      if (!to.startsWith(srcDir + path.sep)) throw new Error(`extraFiles: ${x.path} leaves the scratch folder`);
      const { buf: xb } = await fetchSource({ type: "file", url: x.url }, refetch);
      const h = sha256(xb);
      if (x.sha256 && x.sha256 !== h) throw new Error(`${id}: ${x.path} sha256 ${h} does not match the pinned ${x.sha256}`);
      x.sha256 = h;
      await fsp.mkdir(path.dirname(to), { recursive: true });
      await fsp.writeFile(to, xb);
    }
  }

  // 3. convert + normalize: Blender, or for via "gltf" a GLB kept as is under a new root node (normalize.mjs)
  const py = process.env.LIBRARY_PYTHON || "python3.11";
  const raw = path.join(tmp, "raw.glb");
  const report = path.join(tmp, "report.json");
  if (ing.via === "gltf") {
    if (ing.pitch || ing.roll) throw new Error(`${id}: ingest.pitch and ingest.roll need the Blender path (drop "via": "gltf")`);
    const { normalizeGlb } = await import("./normalize.mjs");
    const r = await normalizeGlb(await fsp.readFile(src), { height: ing.height || 0, yaw: ing.yaw || 0 });
    await fsp.writeFile(raw, r.glb);
    await fsp.writeFile(report, JSON.stringify(r.report));
  } else if (ing.via && ing.via !== "blender") throw new Error(`ingest.via must be "blender" (default) or "gltf" (got ${ing.via})`);
  const cargs = ["-I", path.join(HERE, "convert.py"), "--in", src, "--out", raw, "--report", report, "--height", String(ing.height || 0), "--yaw", String(ing.yaw || 0), "--search", srcDir];
  if (ing.pitch) cargs.push("--pitch", String(ing.pitch));
  if (ing.roll) cargs.push("--roll", String(ing.roll));
  if (ing.drop?.length) cargs.push("--drop", ing.drop.join(","));
  if (ing.keepActions?.length) cargs.push("--keep-actions", ing.keepActions.join(","));
  if (ing.maxColors) cargs.push("--max-colors", String(ing.maxColors));
  if (ing.dropMaterials?.length) cargs.push("--drop-materials", ing.dropMaterials.join(","));
  if (ing.dropBackfaces) cargs.push("--drop-backfaces");
  if (ing.attach?.length) {
    if (ing.via === "gltf") throw new Error(`${id}: ingest.attach needs the Blender path (drop "via": "gltf")`);
    cargs.push(...attachArgs(ing.attach, srcDir));
  }
  if (ing.via !== "gltf") run(py, cargs, "convert.py", { cwd: tmp });
  const rep = JSON.parse(await fsp.readFile(report, "utf8"));

  // 4. compress: meshopt geometry and animation; keep every material and mesh (roles map by material name)
  const out = path.join(dir, meta.file || "model.glb");
  run("npx", ["-y", GLTF_TRANSFORM, "optimize", raw, out, "--compress", "meshopt", "--simplify", "false", "--palette", "false", "--instance", "false",
    "--flatten", "false", "--join", "false", "--texture-compress", "false", "--texture-size", "512"], "gltf-transform", { cwd: tmp });
  const glb = await fsp.readFile(out);

  // The clips as the exported file holds them: Blender splits node-animated sources into one action per object
  // ("walk_body", "walk_leg-back-left", ...) that the exporter merges back into one clip per name.
  const clips = glbClips(glb) ?? rep.actions;

  // 5. facts back into meta.json
  meta.file = meta.file || "model.glb";
  meta.sha256 = sha256(glb);
  meta.bytes = glb.length;
  meta.triangles = rep.triangles;
  meta.bones = rep.bones;
  meta.sourceMaterials = rep.materials;
  // Measured seconds; hand-set fields (loop, lift) survive a re-ingest.
  meta.clipInfo = Object.fromEntries(clips.map((a) => [a.name, { ...meta.clipInfo?.[a.name], seconds: a.seconds, loop: meta.clipInfo?.[a.name]?.loop ?? !/death|die|hit|jump|attack/i.test(a.name) }]));
  if (meta.height && Math.abs(rep.height - meta.height) > 0.05 * meta.height) console.error(`[ingest] warn: meta.height ${meta.height} but the GLB is ${rep.height.toFixed(3)} m`);
  await fsp.writeFile(metaFile, JSON.stringify(meta, null, 2) + "\n");
  if (!args.includes("--keep-tmp")) await fsp.rm(tmp, { recursive: true, force: true });
  else console.error(`[ingest] kept ${tmp}`);
  console.log(`${id}: ${(glb.length / 1024).toFixed(0)} KB, ${rep.triangles} tris, ${rep.bones} bones, clips ${clips.map((a) => a.name).join(",") || "-"}, materials ${Object.entries(rep.materials).map(([k, v]) => `${k}=${v}`).join(" ")}`);
}

/** ingest.attach -> convert.py arguments. Each entry is { file, bone, offset?, rotation?, scale? }: `file` is a file
 * this entry already fetched (an `extraFiles` path, or an `extraMembers` zip path), relative to the scratch source
 * folder, so every prop is sha256-pinned like the model; offset is [x, y, z] in the bone's frame (source units),
 * rotation [x, y, z] degrees, scale a number. Throws on a malformed entry or a file that was not fetched. */
export function attachArgs(attach, srcDir, exists = fs.existsSync) {
  if (!Array.isArray(attach)) throw new Error("ingest.attach must be a list of { file, bone?, offset, rotation, scale }");
  const vec = (v, what, file) => {
    if (v === undefined) return [0, 0, 0];
    if (!Array.isArray(v) || v.length !== 3 || !v.every(Number.isFinite)) throw new Error(`ingest.attach ${file}: ${what} must be [x, y, z] numbers`);
    return v;
  };
  const out = [];
  for (const a of attach) {
    if (!a || typeof a.file !== "string" || !a.file) throw new Error("ingest.attach: every entry needs a file");
    if (a.bone !== undefined && (typeof a.bone !== "string" || !a.bone)) throw new Error(`ingest.attach ${a.file}: bone must be a bone name (or left out for a static part)`);
    const file = path.resolve(srcDir, a.file.replace(/\\/g, "/"));
    if (!file.startsWith(srcDir + path.sep)) throw new Error(`ingest.attach: ${a.file} leaves the scratch folder`);
    if (!exists(file)) throw new Error(`ingest.attach: ${a.file} was not fetched (list it in ingest.fetch.extraFiles or ingest.extraMembers, with its .bin and textures)`);
    const scale = a.scale ?? 1;
    if (!Number.isFinite(scale) || scale <= 0) throw new Error(`ingest.attach ${a.file}: scale must be a positive number`);
    out.push("--attach", JSON.stringify({ file, ...(a.bone ? { bone: a.bone } : {}), offset: vec(a.offset, "offset", a.file), rotation: vec(a.rotation, "rotation", a.file), scale }));
  }
  return out;
}

/** GLB bytes -> [{name, seconds}] of its animations (seconds = the last key time), or null if they can't be read. */
export function glbClips(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) return null;
  const json = JSON.parse(buf.toString("utf8", 20, 20 + buf.readUInt32LE(12)));
  const out = [];
  for (const a of json.animations || []) {
    const ends = a.samplers.map((s) => json.accessors[s.input]?.max?.[0]);
    if (ends.some((t) => typeof t !== "number")) return null;
    out.push({ name: a.name, seconds: Math.round(Math.max(0, ...ends) * 10000) / 10000 });
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch((e) => {
    console.error(`error: ${e.message}`);
    process.exit(1);
  });
