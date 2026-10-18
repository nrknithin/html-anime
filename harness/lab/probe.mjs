#!/usr/bin/env node
// probe.mjs — numbers about a model's poses, no browser: bbox, lowest point, triangles, heaviest meshes, joint world
// positions, ground contacts and the lab's contract warnings. A few ms per pose after a ~40 ms three.js load. Node 22+, zero dependencies.
//
//   node harness/lab/probe.mjs --model models/ox.js [--pose stomp | --poses all | --poses rest,walk-a] [--opts '{"lit":true}'] [--json]
//
// three.js comes from the lab's CDN disk cache (the same files shoot.mjs uses; fetched into it when missing).

import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { fixPath, resolveFromRoot } from "./paths.mjs";
import { fmt, scanSource, checkMeta, measure, contractWarnings, jointWarning, jointPositions, meshStats, parseOpts } from "./inspect.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const CACHE_DIR = path.join(os.tmpdir(), "html-anime-lab-cache"); // same as shoot.mjs
const CDN_BASE = (process.env.LAB_CDN_BASE || "https://cdn.jsdelivr.net").replace(/\/+$/, "");
const THREE_VERSION = "0.186.1";
// Contact threshold scales with model size: 5 mm for human-size models, 1 % of meta.height for small ones (floor 0.5 mm).
const contactM = (h) => Math.max(0.0005, Math.min(0.005, 0.01 * h));

const USAGE = `usage: node harness/lab/probe.mjs --model <path> [--pose <name> | --poses all|a,b,c] [--opts '<json>'] [--json] [--lax]

  --model <path>   model module (repo-relative like models/ox.js, or any file path; relative paths resolve against the repo root)
  --pose <name>    one pose (default rest)
  --poses <list>   several poses, or "all" for every name in meta.poses
  --opts '<json>'  JSON object passed to build() as its 4th argument, e.g. '{"lit":true}' (code models; library entries ignore it)
  --clip <name>    models with clips: probe n frames of a clip [--frames n, default 8]
  --json           one JSON object instead of text
  --lax            contract violations (Math.random, imports ...) warn instead of fail

Per pose: bbox (m), lowest y, triangles and the 10 heaviest meshes, joint world positions (m), contacts (meshes whose
lowest point is within max(0.5 mm, min(5 mm, 1 % of meta.height)) of y=0), and the same contract warnings shoot.mjs prints.`;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) throw new Error(`unexpected argument "${a}" (flags start with --)`);
    const eq = a.indexOf("=");
    const key = a.slice(2, eq < 0 ? undefined : eq).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (!["model", "pose", "poses", "json", "lax", "help", "clip", "frames", "opts"].includes(key)) throw new Error(`unknown option ${a.split("=")[0]}\n\n${USAGE}`);
    if (["json", "lax", "help"].includes(key)) out[key] = eq < 0 ? true : !["0", "false", "no", "off"].includes(a.slice(eq + 1).toLowerCase());
    else if (eq >= 0) out[key] = a.slice(eq + 1);
    else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) out[key] = argv[++i];
    else throw new Error(`--${a.slice(2)} needs a value`);
  }
  return out;
}

// ---------------------------------------------------------------- three.js from the lab's disk cache
const cachePath = (rel) => path.join(CACHE_DIR, crypto.createHash("sha1").update(rel).digest("hex").slice(0, 20) + "-" + path.basename(rel.split("?")[0]));
async function cdnBytes(rel) {
  const file = cachePath(rel);
  try {
    const buf = await fsp.readFile(file);
    if (buf.length) return buf;
  } catch {}
  const res = await fetch(`${CDN_BASE}/${rel}`, { signal: AbortSignal.timeout(20000) }).catch((e) => {
    throw new Error(`could not fetch ${CDN_BASE}/${rel}: ${e.cause?.code || e.message} (offline? the lab caches three.js in ${CACHE_DIR})`);
  });
  if (!res.ok) throw new Error(`${CDN_BASE}/${rel} answered HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fsp.mkdir(CACHE_DIR, { recursive: true });
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  await fsp.writeFile(tmp, buf);
  await fsp.rename(tmp, file).catch(() => fsp.rm(tmp, { force: true }));
  return buf;
}
// The cache stores files under hashed names, but three.module.min.js imports "./three.core.js" (r186: or .min.js) by
// name: lay the pair out under their real names in one directory and import from there.
export async function loadThree() {
  const dir = path.join(CACHE_DIR, `probe-three-${THREE_VERSION}`);
  const entry = path.join(dir, "three.module.min.js");
  const ready = path.join(dir, "READY");
  if (!fs.existsSync(ready) || !fs.existsSync(entry)) {
    const base = `npm/three@${THREE_VERSION}/build`;
    await fsp.mkdir(dir, { recursive: true });
    const main = await cdnBytes(`${base}/three.module.min.js`);
    const names = new Set([...main.toString("utf8", 0, 20000).matchAll(/(?:from|import)\s*["']\.\/([^"']+)["']/g)].map((m) => m[1]));
    for (const name of names) await fsp.writeFile(path.join(dir, name), await cdnBytes(`${base}/${name}`));
    await fsp.writeFile(entry, main);
    await fsp.writeFile(ready, "ok");
  }
  return import(pathToFileURL(entry).href);
}

// GLTFLoader and the meshopt decoder for library models, from the same cache. Their bare "three" imports are pointed
// at the cached three.module.min.js above, so the loader and the model share one THREE.
export async function loadGltfTools() {
  const dir = path.join(CACHE_DIR, `probe-three-${THREE_VERSION}`, "addons");
  const ready = path.join(dir, "READY");
  const files = ["loaders/GLTFLoader.js", "utils/BufferGeometryUtils.js", "utils/SkeletonUtils.js", "libs/meshopt_decoder.module.js"];
  if (!fs.existsSync(ready)) {
    for (const f of files) {
      const text = (await cdnBytes(`npm/three@${THREE_VERSION}/examples/jsm/${f}`)).toString("utf8");
      const up = "../".repeat(f.split("/").length);
      await fsp.mkdir(path.join(dir, path.dirname(f)), { recursive: true });
      await fsp.writeFile(path.join(dir, f), text.replace(/from\s*(["'])three\1/g, `from "${up}three.module.min.js"`));
    }
    await fsp.writeFile(ready, "ok");
  }
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all(files.slice(0, 1).concat(files[3]).map((f) => import(pathToFileURL(path.join(dir, f)).href)));
  return { GLTFLoader, MeshoptDecoder };
}

// A library entry (models/library/<id>/meta.json + its GLB) as a module-shaped { meta, build }, like a code model.
async function loadLibrary(metaFile) {
  const lmeta = JSON.parse(await fsp.readFile(metaFile, "utf8"));
  const glb = await fsp.readFile(path.join(path.dirname(metaFile), lmeta.file || "model.glb"));
  const { GLTFLoader, MeshoptDecoder } = await loadGltfTools();
  await MeshoptDecoder.ready;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await new Promise((resolve, reject) => loader.parse(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.length), "", resolve, reject));
  const { buildLibrary } = await import("./library.js");
  const poses = [...new Set(["rest", ...(lmeta.poses || []), ...Object.keys(lmeta.poseDefs || {})])];
  const meta = { ...lmeta, poses };
  return { meta, build: (T, k, colors) => buildLibrary(T, k, gltf, meta, colors) };
}

// ---------------------------------------------------------------- the model
async function loadModel(file, strict, warnings) {
  const src = await fsp.readFile(file, "utf8");
  const found = scanSource(src);
  if (found.length) {
    const text = `${file} uses ${found.join(", ")}: models are deterministic, procedural, and take THREE and kit as arguments`;
    if (strict) throw new Error(text);
    warnings.push(text);
  }
  try {
    return await import(pathToFileURL(file).href);
  } catch (e) {
    if (e.code === "ERR_MODULE_NOT_FOUND" || /Unexpected token 'export'|Cannot use import/.test(e.message)) {
      // A model outside the repo has no "type": "module" next to it: load the source as a module directly.
      return import("data:text/javascript;base64," + Buffer.from(src).toString("base64"));
    }
    throw new Error(`model failed to load: ${e.message}`);
  }
}

export function probePose(THREE, built, name, height = 1) {
  const t0 = performance.now();
  try {
    built.pose(name);
  } catch (e) {
    throw new Error(`pose("${name}") threw: ${e.message}`);
  }
  const M = measure(THREE, built.root);
  const stats = meshStats(THREE, built.root);
  const top = [...stats].sort((a, b) => b.tris - a.tris).slice(0, 10).map((m) => ({ mesh: m.path, name: m.name, tris: m.tris }));
  const contacts = stats.filter((m) => Math.abs(m.minY) <= contactM(height)).map((m) => ({ mesh: m.path, minY: m.minY }));
  return {
    pose: name,
    bbox: { min: M.min, max: M.max, size: M.size },
    minY: M.min[1],
    triangles: M.tris,
    meshes: M.meshes,
    topMeshes: top,
    joints: jointPositions(THREE, built.joints, 3),
    contacts,
    contactM: contactM(height),
    ms: Math.round((performance.now() - t0) * 10) / 10,
  };
}

const f3 = (v) => (Math.round(v * 1000) / 1000).toFixed(3);
function textReport(r) {
  const L = [];
  const { min, max, size } = r.bbox;
  L.push(`pose ${r.pose}   (${r.ms} ms)`);
  L.push(`  bbox x [${f3(min[0])}, ${f3(max[0])}]  y [${f3(min[1])}, ${f3(max[1])}]  z [${f3(min[2])}, ${f3(max[2])}]   size ${f3(size[0])} x ${f3(size[1])} x ${f3(size[2])} m`);
  L.push(`  min y ${f3(r.minY)} m   triangles ${r.triangles}   meshes ${r.meshes}`);
  L.push("  top meshes by triangles:");
  for (const m of r.topMeshes) L.push(`    ${String(m.tris).padStart(6)}  ${m.mesh}`);
  L.push("  joints (world m):");
  const w = Math.max(0, ...Object.keys(r.joints).map((k) => k.length));
  for (const [k, p] of Object.entries(r.joints)) L.push(`    ${k.padEnd(w)}  ${p.map((x) => x.toFixed(3).padStart(7)).join(" ")}`);
  L.push(r.contacts.length ? `  contacts (lowest point within ${(r.contactM * 1000).toFixed(1)} mm of y=0): ${r.contacts.length}` : `  contacts (lowest point within ${(r.contactM * 1000).toFixed(1)} mm of y=0): none`);
  for (const c of r.contacts) L.push(`    ${f3(c.minY)}  ${c.mesh}`);
  return L.join("\n");
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || process.argv.length <= 2) {
    console.log(USAGE);
    return 0;
  }
  if (!opts.model) throw new Error("--model is required");
  let buildOpts = opts.opts ? parseOpts(opts.opts) : undefined;
  const t0 = performance.now();
  const tries = [resolveFromRoot(ROOT, opts.model), path.resolve(process.cwd(), fixPath(opts.model))];
  const lib = tries.map((d) => path.join(d, "meta.json")).find((f) => fs.existsSync(f));
  const file = lib || tries.find((f) => fs.existsSync(f) && fs.statSync(f).isFile());
  if (!file) throw new Error(`model not found: ${opts.model}\n  tried ${tries.join("\n        ")}`);

  const warnings = [];
  const info = [];
  const THREE = await loadThree();
  const { makeKit } = await import("./kit.js");
  let SCRIPTS = null;
  try {
    SCRIPTS = (await import(pathToFileURL(path.join(ROOT, "harness", "compile.js")).href)).SCRIPTS;
  } catch {
    warnings.push("could not load harness/compile.js: script and color checks skipped");
  }
  const tLoad = performance.now() - t0;
  const mod = /\.json$/i.test(file) ? await loadLibrary(file) : await loadModel(file, !opts.lax, warnings);
  const meta = checkMeta(mod, SCRIPTS, warnings);
  if (buildOpts && lib) {
    warnings.push("--opts is for code models: a library entry ignores it");
    buildOpts = undefined;
  }
  const ink = (SCRIPTS && SCRIPTS[meta.script] && SCRIPTS[meta.script].colors.ink) || "#101628";
  const kit = makeKit(THREE, { mode: "cel", ink });
  let built;
  try {
    built = mod.build(THREE, kit, meta.colors, buildOpts);
  } catch (e) {
    throw new Error(`build() threw: ${e.message}`);
  }
  if (!built || !(built.root && built.root.isObject3D)) throw new Error("model contract: build() must return { root: THREE.Group, joints, pose(name) }");
  if (typeof built.pose !== "function") throw new Error("model contract: build() must return a pose(name) function");
  if (!built.joints || typeof built.joints !== "object") throw new Error("model contract: build() must return joints: name -> Object3D");
  const jw = jointWarning(built.joints);
  if (jw) warnings.push(jw);

  let names = [opts.pose || "rest"];
  if (opts.poses) names = opts.poses === "all" ? [...meta.poses] : String(opts.poses).split(",").map((s) => s.trim()).filter(Boolean);
  if (opts.clip) {
    // --clip <name> [--frames n]: n evenly spaced frames of a library clip (default 8)
    if (!built.clips || !(opts.clip in built.clips)) throw new Error(`--clip: no clip "${opts.clip}"${built.clips ? ` (clips: ${Object.keys(built.clips).join(", ")})` : " (the model returns no clips)"}`);
    const n = Number(opts.frames) > 0 ? Number(opts.frames) : 8;
    names = Array.from({ length: n }, (_, k) => `${opts.clip}@${+((built.clips[opts.clip] * k) / n).toFixed(4)}`);
  }
  if (!names.length) throw new Error("--poses is empty");

  // Contract checks are against the rest pose, whatever poses are probed.
  const hasRest = meta.poses.includes("rest");
  try {
    built.pose(hasRest ? "rest" : names[0]);
  } catch (e) {
    throw new Error(`pose("${hasRest ? "rest" : names[0]}") threw: ${e.message}`);
  }
  contractWarnings(measure(THREE, built.root), meta, warnings);
  const reports = names.map((n) => {
    if (!meta.poses.includes(n) && !(built.clips && /@-?[\d.]+$/.test(n))) warnings.push(`pose "${n}" is not listed in meta.poses (${meta.poses.join(", ")})`);
    const r = probePose(THREE, built, n, meta.height);
    if (r.minY < -0.02 * meta.height) info.push(`pose "${n}" is sunk: lowest point ${(r.minY * 1000).toFixed(1)} mm (${(r.minY / meta.height * 100).toFixed(1)} % of meta.height) is below y=0`);
    return r;
  });
  const totalMs = Math.round(performance.now() - t0);

  if (opts.json) {
    console.log(JSON.stringify({ model: path.relative(ROOT, file).split(path.sep).join("/"), name: meta.name, height: meta.height, ...(buildOpts && { opts: buildOpts }), poses: reports, warnings, info, ms: { total: totalMs, load: Math.round(tLoad) } }));
  } else {
    console.log(`${meta.name}  (${path.relative(ROOT, file).split(path.sep).join("/")})  meta.height ${fmt(meta.height)} m${buildOpts ? `  opts ${JSON.stringify(buildOpts)}` : ""}`);
    for (const r of reports) console.log("\n" + textReport(r));
    console.log(`\n${reports.length} pose${reports.length === 1 ? "" : "s"} in ${totalMs} ms (three.js load ${Math.round(tLoad)} ms, ${fmt(reports.reduce((a, r) => a + r.ms, 0) / reports.length, 1)} ms per pose)`);
  }
  for (const w of info) console.error(`[lab] info: ${w}`);
  for (const w of warnings) console.error(`[lab] warn: ${w}`);
  return 0;
}

// Run only as a script: harness/library/normalize.mjs imports the loaders above.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (e) => {
      console.error(`error: ${e.message}`);
      process.exitCode = 1;
    },
  );
