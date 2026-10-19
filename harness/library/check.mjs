#!/usr/bin/env node
// check.mjs — the acceptance checks of models/PLAN.md section 6 for one library entry, and its preview.png.
//
//   npm run library:check -- <id> [--clip run]
//
// 1. Rest pose (probe): top within 5 % of meta.height, lowest point within 2 % of y = 0, bbox centred on x = z = 0.
// 2. Every clip in meta.clips, 8 frames (probe): nothing sinks more than 3 % of the height below y = 0; ground clips
//    (idle, walk, run ...) touch the ground in at least one frame.
// 3. preview.png (lab, cel): front, left, three4, top at rest plus 4 frames of one clip; >= 99 % of non-edge pixels
//    are exact script hexes; no lab warnings.
// 4. Determinism: one clip frame shot twice gives the same bytes.
// The numbers go into meta.qa; the exit code is 1 when a check fails.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const GROUND = new Set(["idle", "walk", "run", "trot", "gallop", "eat", "sit", "wave", "dance", "attack", "hit"]);

function node(script, args) {
  const r = spawnSync(process.execPath, [path.join(ROOT, script), ...args], { encoding: "utf8", maxBuffer: 64 << 20 });
  return { ok: r.status === 0, out: r.stdout || "", err: r.stderr || "" };
}

function main() {
  const args = process.argv.slice(2);
  const id = args.find((a) => !a.startsWith("--"));
  if (!id) return console.log("usage: node harness/library/check.mjs <id> [--clip <name>]");
  const dir = path.join(ROOT, "models", "library", id);
  const metaFile = path.join(dir, "meta.json");
  const meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
  const model = `models/library/${id}`;
  const fails = [];
  const notes = [];
  const h = meta.height;

  // 1. rest
  const rest = node("harness/lab/probe.mjs", ["--model", model, "--json"]);
  if (!rest.ok) throw new Error(`probe failed:\n${rest.err}`);
  const R = JSON.parse(rest.out).poses[0];
  const top = R.bbox.max[1];
  const qa = {
    height: +top.toFixed(4),
    heightError: +((top - h) / h).toFixed(4),
    minY: +R.minY.toFixed(4),
    centre: [+((R.bbox.max[0] + R.bbox.min[0]) / 2).toFixed(4), +((R.bbox.max[2] + R.bbox.min[2]) / 2).toFixed(4)],
    triangles: R.triangles,
  };
  if (Math.abs(qa.heightError) > 0.05) fails.push(`rest height ${top.toFixed(3)} m is ${(qa.heightError * 100).toFixed(1)} % off meta.height ${h}`);
  if (Math.abs(R.minY) > 0.02 * h) fails.push(`rest lowest point ${R.minY.toFixed(3)} m is not on y = 0 (2 % = ${(0.02 * h).toFixed(3)} m)`);
  // An entry centred on its body (ingest.centerOn) is off-centre overall by design: a held weapon sticks out.
  if (!meta.ingest?.centerOn) R.bbox.size.forEach((s, i) => {
    if (i === 1) return;
    const c = qa.centre[i ? 1 : 0];
    if (Math.abs(c) > 0.05 * Math.max(s, 0.05)) fails.push(`rest bbox centre ${"xz"[i ? 1 : 0]} = ${c} m is off 0 by more than 5 % of the width`);
  });

  // 2. clips
  qa.clips = {};
  for (const name of Object.keys(meta.clips || {})) {
    const r = node("harness/lab/probe.mjs", ["--model", model, "--clip", name, "--frames", "8", "--json"]);
    if (!r.ok) {
      fails.push(`clip ${name}: probe failed: ${r.err.trim().split("\n").pop()}`);
      continue;
    }
    const P = JSON.parse(r.out).poses;
    const lows = P.map((p) => p.minY);
    const lo = Math.min(...lows);
    const touch = lows.some((y) => Math.abs(y) <= 0.02 * h);
    qa.clips[name] = { minY: +lo.toFixed(4), touches: touch, maxSize: P.reduce((a, p) => Math.max(a, ...p.bbox.size), 0).toFixed(2) * 1 };
    // clipInfo[clip].sinkAllowed: "<why>" (a tail sweeping through the ground while the feet stay planted) turns the
    // sink failure into a note; lifting such a clip would float the whole body.
    const allowed = (meta.clipInfo || {})[meta.clips[name]]?.sinkAllowed;
    if (lo < -0.03 * h) (allowed ? notes : fails).push(`clip ${name}: sinks ${(-lo * 1000).toFixed(0)} mm below the ground${allowed ? ` (allowed: ${allowed})` : ""}`);
    if (GROUND.has(name) && !touch) notes.push(`clip ${name}: never touches the ground in 8 frames (lowest ${lows.map((y) => y.toFixed(3)).join(" ")})`);
  }

  // 3. preview
  const clips = Object.keys(meta.clips || {});
  const stripClip = args.includes("--clip") ? args[args.indexOf("--clip") + 1] : meta.preview?.clip || ["run", "walk", "idle"].find((c) => clips.includes(c)) || clips[0];
  const shot = ["--model", model, "--views", "front,left,three4,top", "--size", "1600x1000", "--info", "--out", path.join(dir, "preview.png")];
  if (meta.preview?.pose) shot.push("--pose", meta.preview.pose); // a T-pose rig shows its views in a real pose (the checks above stay at rest)
  if (stripClip) shot.push("--strip", stripClip, "--cols", "4");
  const pv = node("harness/lab/shoot.mjs", shot);
  if (!pv.ok) throw new Error(`preview shot failed:\n${pv.err}`);
  const info = JSON.parse(pv.out.split("\n").find((l) => l.startsWith("info {")).slice(5));
  qa.palette = info.palette ? info.palette.ratio : null;
  if (info.palette && info.palette.ratio < 0.99) fails.push(`palette: ${(info.palette.ratio * 100).toFixed(2)} % of non-edge pixels on the script (off: ${info.palette.offenders.map((o) => o[0]).join(" ")})`);
  for (const w of info.warnings || []) if (!/non-edge pixels/.test(w)) fails.push(`lab: ${w}`);

  // 4. determinism
  if (stripClip) {
    const t = +(((meta.clipInfo?.[meta.clips[stripClip]]?.seconds || 1) * 0.37).toFixed(3));
    const a = path.join(os.tmpdir(), `html-anime-check-${id}-a.png`);
    const b = path.join(os.tmpdir(), `html-anime-check-${id}-b.png`);
    for (const out of [a, b]) node("harness/lab/shoot.mjs", ["--model", model, "--clip", stripClip, "--at", String(t), "--views", "three4", "--size", "800x600", "--out", out]);
    qa.deterministic = fs.existsSync(a) && fs.existsSync(b) && fs.readFileSync(a).equals(fs.readFileSync(b));
    if (!qa.deterministic) fails.push(`clip ${stripClip} at ${t} s rendered twice differs`);
    for (const f of [a, b]) fs.rmSync(f, { force: true });
  }

  qa.preview = `${meta.preview?.pose || "rest"}${stripClip ? ` + ${stripClip}` : ""}`;
  meta.qa = qa;
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2) + "\n");
  for (const n of notes) console.log(`note: ${n}`);
  for (const f of fails) console.log(`FAIL: ${f}`);
  console.log(`${id}: ${fails.length ? `${fails.length} failed` : "ok"} (height ${qa.height} m, ${(qa.heightError * 100).toFixed(1)} %, minY ${qa.minY}, palette ${qa.palette}, ${Object.keys(qa.clips).length} clips${qa.deterministic === undefined ? "" : qa.deterministic ? ", deterministic" : ""}) -> models/library/${id}/preview.png`);
  if (fails.length) process.exitCode = 1;
}

main();
