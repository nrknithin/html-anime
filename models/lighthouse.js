// lighthouse.js - the small harbour-mouth lighthouse of seaside anime: a white (or red) tapered tower standing on the
// rounded concrete tip of a breakwater, gallery and lantern on top. Static; the night lamp has a rotating beam clip.
// Contract: harness/lab/README.md. Meters, +Y up, the door faces +Z (toward the harbour), its left is +X; the
// breakwater runs back to -Z. Stands on y = 0, centred on x = 0, z = 0 (the tower's axis).
//
// Construction (lathes, boxes and square-section beams, all triangle soups merged per material; lathes carry radial
// normals per profile segment, so the tower reads round with one clean vertical terminator; boxes are flat-shaded):
//   BASE     the breakwater tip, a D in plan: a seaward half-round (half lathe) on a short straight stub running to -Z,
//            both with battered sides; a low curb, a step at the door and a short pipe railing on the half-round.
//   TOWER    one lathe: a plinth band, the tapered shaft (r 1.50 -> 1.02), and the corbel flare under the gallery.
//            A small door (frame, leaf, lintel hood) at the base on +Z, two slit windows up the shaft.
//   GALLERY  a deck disc wider than the shaft, a railing of posts with a top and a mid rail (polygon rings of beams).
//   LANTERN  a short pedestal drum, an octagonal glass prism (dark glass by day, glowing practical by night) with
//            mullions, a sill and a head ring, glints as pale slanted strips on the lit panes; a domed cap (lathe),
//            a rim band, and the vent ball on a short neck.
//   BEAM     (night) two opposite pale wedges from the lamp, on the `beam` joint; clip `beam` turns it one revolution.
//   Every closed part is wound away from a point inside it (the axis, or a box's centre), never by hand.
// Proportions (real size, base unit the shaft base radius R = 1.5 m): pad r 3.4 (2.3 R), top 1.0; stub 3.4 wide to
// z = -5.4; shaft 1.35 -> 9.15 (5.2 R), r 1.50 -> 1.02; gallery deck 9.55-9.70, r 1.70, rail 0.95 high; lantern glass
// 10.20-11.45, r 0.88; dome 11.55-12.45; vent ball r 0.2, top 13.0. Door 0.8 x 1.85.
// Options: build(THREE, kit, colors, { height, color: "white" | "red", night }).
//   height  scales everything uniformly so the vent-ball top is `height` (default 13.0 m).
//   color   "white" (default) or "red": Japanese harbour mouths pair a white light (port side in) and a red one.
//   night   the lantern glass and the slit windows glow (practical, threshold -0.25) and the beam wedges appear.
// Clips: { beam: 8 } (build() returns clips; pose("beam@2.5")): the beam joint turns once in 8 s, looping. By day the
// clip still runs (it turns the empty beam joint), so a film can keep one timeline.
// Colours (noon): white tower moon #fff6e4 / sky #f2d7ae; red tower accent #c4452d / iris #5c3d32; concrete sclera
// #f6f3ee / skin #f0c2ae (cooler and pinker than the tower's paper white, so tower and pad split); railings, mullions,
// door frame iris #5c3d32 / hair #241c16; day glass hair #241c16 flat (dark glass is what makes the lantern read);
// glints moon flat; door leaf iris; night glass and windows practical #fffaf2 / sclera; beam practical flat.
// Pale parts use threshold 0.1 so the camera-facing front of the tower stays lit, as the torii's and house's do.

export const meta = {
  name: "lighthouse",
  height: 13.0,
  script: "noon",
  colors: {
    tower: "#fff6e4", towerShade: "#f2d7ae",
    red: "#c4452d", redShade: "#5c3d32",
    concrete: "#f6f3ee", concreteShade: "#f0c2ae",
    metal: "#5c3d32", metalShade: "#241c16",
    glass: "#241c16", glint: "#fff6e4",
    lamp: "#fffaf2", lampShade: "#f6f3ee",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, color = "white", night = false } = opts;
  const red = color === "red";
  const root = new THREE.Group();
  root.name = "lighthouse";
  const body = new THREE.Group(); // uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / meta.height);
  root.add(body);
  const joints = {};

  // ---------- triangle soups (positions + normals) ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  // one triangle wound away from `ref` (a point inside the solid); ns = optional per-vertex normals
  function tri(key, a, b, e, ref, ns) {
    const fn = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...fn) < 1e-9) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    const flip = dot(fn, sub(m, ref)) < 0;
    const s = S(key);
    const f = nrm(flip ? fn.map((x) => -x) : fn);
    const [na, nb, ne] = ns ?? [f, f, f];
    if (flip) s.p.push(...a, ...e, ...b), s.n.push(...na, ...ne, ...nb);
    else s.p.push(...a, ...b, ...e), s.n.push(...na, ...nb, ...ne);
  }
  const quad = (key, a, b, e, d, ref, ns) =>
    (tri(key, a, b, e, ref, ns && [ns[0], ns[1], ns[2]]), tri(key, a, e, d, ref, ns && [ns[0], ns[2], ns[3]]));
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, cx, cy, cz, sx, sy, sz, ry = 0) {
    const co = Math.cos(ry), si = Math.sin(ry);
    const P = (x, y, z) => [cx + x * co + z * si, cy + y, cz - x * si + z * co];
    const [hx, hy, hz] = [sx / 2, sy / 2, sz / 2];
    hex(key, [P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, -hy, hz), P(-hx, -hy, hz),
      P(-hx, hy, -hz), P(hx, hy, -hz), P(hx, hy, hz), P(-hx, hy, hz)]);
  }
  function beam(key, a, b, w, h, up = [0, 1, 0]) {
    const d = sub(b, a);
    let s = cross(d, up);
    if (Math.hypot(...s) < 1e-6) s = cross(d, [1, 0, 0]);
    s = nrm(s);
    const u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // lathe: profile [[r, y], ...] bottom to top, n sides, closed with flat caps where r > 0 at the ends.
  // Normals: radial, tilted by each profile segment's slope (flat along the profile, smooth around).
  function lathe(key, prof, n, { a0 = 0, a1 = Math.PI * 2, caps = true } = {}) {
    const full = Math.abs(a1 - a0 - Math.PI * 2) < 1e-6;
    const A = (i) => a0 + ((a1 - a0) * i) / n;
    const at = (r, y, a) => [r * Math.sin(a), y, r * Math.cos(a)];
    for (let j = 0; j < prof.length - 1; j++) {
      const [r0, y0] = prof[j], [r1, y1] = prof[j + 1];
      const t = nrm([y1 - y0, -(r1 - r0)]); // outward (radial, vertical) for this segment
      for (let i = 0; i < n; i++) {
        const [aa, ab] = [A(i), A(i + 1)];
        const N = (a) => [t[0] * Math.sin(a), t[1], t[0] * Math.cos(a)];
        // wound away from a point just inside this segment's outward normal
        const am = (aa + ab) / 2, rm = (r0 + r1) / 2, nm = N(am);
        const ref = sub(at(rm, (y0 + y1) / 2, am), nm);
        quad(key, at(r0, y0, aa), at(r0, y0, ab), at(r1, y1, ab), at(r1, y1, aa), ref, [N(aa), N(ab), N(ab), N(aa)]);
      }
    }
    if (!caps || !full) return;
    const [rb, yb] = prof[0], [rt, yt] = prof[prof.length - 1];
    for (let i = 0; i < n; i++) {
      if (rb > 1e-6) tri(key, [0, yb, 0], at(rb, yb, A(i)), at(rb, yb, A(i + 1)), [0, yb + 1, 0]);
      if (rt > 1e-6) tri(key, [0, yt, 0], at(rt, yt, A(i)), at(rt, yt, A(i + 1)), [0, yt - 1, 0]);
    }
  }
  // a ring of beams (rails) at radius r, height y, from angle a0 to a1
  function ring(key, r, y, w, h, n, a0 = 0, a1 = Math.PI * 2) {
    const P = (a) => [r * Math.sin(a), y, r * Math.cos(a)];
    for (let i = 0; i < n; i++) {
      const [aa, ab] = [a0 + ((a1 - a0) * i) / n, a0 + ((a1 - a0) * (i + 1)) / n];
      // overshoot each segment a little so the corners close
      const d = sub(P(ab), P(aa)).map((x) => x * 0.04);
      beam(key, sub(P(aa), d), [P(ab)[0] + d[0], y, P(ab)[2] + d[2]], w, h);
    }
  }

  const TOWER = red ? "red" : "tower";

  // ---------- breakwater tip ----------
  const PR = 3.4, PY = 1.0, SZ = -5.4;
  // a D in plan: the seaward half-round (half lathe, open at z = 0) on the straight stub (z = 0 back to SZ)
  const HALF = { a0: -Math.PI / 2, a1: Math.PI / 2, caps: false };
  lathe("concrete", [[PR + 0.15, 0], [PR, PY], [0, PY]], 14, HALF);
  lathe("concrete", [[0, 0], [PR + 0.15, 0]], 14, HALF);
  { // battered sides like the half-round's, so the two meet without a step
    const [wb, wt, z0, z1] = [PR + 0.15, PR, SZ, 0];
    hex("concrete", [[-wb, 0, z0], [wb, 0, z0], [wb, 0, z1], [-wb, 0, z1], [-wt, PY, z0], [wt, PY, z0], [wt, PY, z1], [-wt, PY, z1]]);
  }
  // curb ring around the seaward half and along the stub sides
  const CU = PR - 0.12;
  lathe("concrete", [[CU, PY], [CU, PY + 0.18], [CU - 0.22, PY + 0.18], [CU - 0.22, PY]], 28,
    { a0: -Math.PI / 2, a1: Math.PI / 2, caps: false });
  for (const s of [-1, 1]) box("concrete", s * (CU - 0.11), PY + 0.09, SZ / 2, 0.22, 0.18, -SZ + 0.02);
  box("concrete", 0, PY + 0.09, SZ + 0.11, 2 * CU, 0.18, 0.22);
  // pipe railing: posts and two rails around the seaward half of the pad
  const RR = PR - 0.25, RH = 1.0;
  const ra0 = -Math.PI * 0.5, ra1 = Math.PI * 0.5;
  for (let i = 0; i <= 10; i++) {
    const a = ra0 + ((ra1 - ra0) * i) / 10;
    box("metal", RR * Math.sin(a), PY + 0.18 + RH / 2, RR * Math.cos(a), 0.07, RH, 0.07, a);
  }
  ring("metal", RR, PY + 0.18 + RH, 0.07, 0.07, 10, ra0, ra1);
  ring("metal", RR, PY + 0.18 + RH * 0.5, 0.05, 0.05, 10, ra0, ra1);
  // door step
  box("concrete", 0, PY + 0.09, 1.72, 1.3, 0.18, 0.5);

  // ---------- tower ----------
  const rAt = (y) => 1.5 + ((1.02 - 1.5) * (y - 1.35)) / (9.15 - 1.35);
  lathe(TOWER, [
    [1.72, PY], [1.72, 1.35], [1.5, 1.35], // plinth band
    [1.02, 9.15], // shaft
    [1.6, 9.55], // corbel flare
    [1.7, 9.55], [1.7, 9.7], [0, 9.7], // gallery deck
  ], 32, { caps: false });
  lathe(TOWER, [[0, PY], [1.72, PY]], 32, { caps: false });
  // door: frame, leaf, hood
  const dz = rAt(2.2);
  box("metal", 0, 1.35 + 0.98, dz - 0.02, 0.96, 1.96, 0.16);
  box("door", 0, 1.35 + 0.9, dz + 0.07, 0.76, 1.8, 0.04);
  box(TOWER, 0, 3.42, rAt(3.4) + 0.12, 1.2, 0.12, 0.42);
  // slit windows up the +Z face
  for (const y of [5.0, 7.3]) {
    const z = rAt(y);
    box("metal", 0, y, z - 0.02, 0.42, 0.78, 0.12);
    box(night ? "lit" : "glass", 0, y, z + 0.045, 0.28, 0.62, 0.02);
  }

  // ---------- gallery railing ----------
  const GR = 1.6, GY = 9.7, GH = 0.95;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + Math.PI / 16;
    box("metal", GR * Math.sin(a), GY + GH / 2, GR * Math.cos(a), 0.07, GH, 0.07, a);
  }
  ring("metal", GR, GY + GH, 0.08, 0.08, 16);
  ring("metal", GR, GY + GH * 0.5, 0.05, 0.05, 16);

  // ---------- lantern ----------
  lathe(TOWER, [[1.0, 9.7], [1.0, 10.15], [0.98, 10.2], [0, 10.2]], 24, { caps: false }); // pedestal drum
  const LR = 0.88, L0 = 10.2, L1 = 11.45, NS = 8;
  const off = Math.PI / NS; // a flat pane faces +Z
  lathe(night ? "lit" : "glass", [[LR, L0], [LR, L1]], NS, { a0: off, a1: off + Math.PI * 2, caps: false });
  // mullions at the prism's corners, sill and head rings, a mid transom
  const corner = (i, r) => { const a = off + (i / NS) * Math.PI * 2; return [r * Math.sin(a), r * Math.cos(a)]; };
  for (let i = 0; i < NS; i++) {
    const [x, z] = corner(i, LR + 0.01);
    beam("frame", [x, L0, z], [x, L1, z], 0.08, 0.08, [1, 0, 0]);
  }
  const ringPoly = (r, y, w, h) => {
    for (let i = 0; i < NS; i++) {
      const [xa, za] = corner(i, r), [xb, zb] = corner(i + 1, r);
      const d = [(xb - xa) * 0.06, (zb - za) * 0.06];
      beam("frame", [xa - d[0], y, za - d[1]], [xb + d[0], y, zb + d[1]], w, h);
    }
  };
  ringPoly(LR + 0.02, L0 + 0.04, 0.12, 0.1);
  ringPoly(LR + 0.02, L1 - 0.04, 0.12, 0.1);
  ringPoly(LR + 0.015, (L0 + L1) / 2 + 0.1, 0.05, 0.05);
  // glints: two slanted pale strips on each pane of the lit (+X, +Z) side
  if (!night) {
    for (let i = 0; i < NS; i++) {
      const am = off + ((i + 0.5) / NS) * Math.PI * 2;
      if (Math.sin(am) + Math.cos(am) < 0.1) continue;
      const [xa, za] = corner(i, LR + 0.012), [xb, zb] = corner(i + 1, LR + 0.012);
      const L = (u, y) => [xa + (xb - xa) * u, y, za + (zb - za) * u];
      const ref = [0, 10.8, 0];
      quad("glint", L(0.18, 10.5), L(0.34, 10.5), L(0.62, 11.25), L(0.46, 11.25), ref);
      quad("glint", L(0.42, 10.5), L(0.5, 10.5), L(0.78, 11.25), L(0.7, 11.25), ref);
    }
  }
  // dome, rim band, vent neck and ball
  lathe(TOWER, [[1.04, 11.45], [1.04, 11.58], [0.98, 11.58]], 24, { caps: false }); // rim band
  lathe(TOWER, [[0, 11.45], [1.04, 11.45]], 24, { caps: false });
  const dome = [];
  for (let k = 0; k <= 6; k++) {
    const t = (k / 6) * (Math.PI / 2);
    dome.push([0.98 * Math.cos(t) + (k === 6 ? 0 : 0), 11.58 + 0.84 * Math.sin(t)]);
  }
  dome[6][0] = 0;
  lathe(TOWER, dome, 24, { caps: false });
  lathe("frame", [[0.08, 12.36], [0.08, 12.62], [0, 12.62]], 8, { caps: false });
  const ball = [];
  for (let k = 0; k <= 8; k++) {
    const t = -Math.PI / 2 + (k / 8) * Math.PI;
    ball.push([Math.max(0, 0.2 * Math.cos(t)), 12.8 + 0.2 * Math.sin(t)]);
  }
  ball[0][0] = 0; ball[8][0] = 0;
  lathe("frame", ball, 12, { caps: false });

  // ---------- meshes ----------
  const MAT = {
    tower: [c.tower, c.towerShade, 0.1, true],
    red: [c.red, c.redShade, 0.1, true],
    concrete: [c.concrete, c.concreteShade, -0.2, true],
    metal: [c.metal, c.metalShade, 0.1, true],
    frame: [c.metal, c.metalShade, 0.1, true],
    door: [c.metal, c.metal, 0.1, false],
    glass: [c.glass, c.glass, 0.1, true],
    lit: [c.lamp, c.lampShade, -0.25, true],
    glint: [c.glint, c.glint, 0.1, false],
  };
  for (const [key, s] of Object.entries(soups)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    const mesh = kit.toon(g, base, shade, { threshold, outline, px: key === "metal" || key === "frame" ? 2.5 : undefined });
    mesh.name = key;
    body.add(mesh);
  }

  // ---------- beam (night) ----------
  const beamJ = new THREE.Group();
  beamJ.name = "beam";
  beamJ.position.set(0, 10.82, 0);
  body.add(beamJ);
  joints.beam = beamJ;
  if (night) {
    const bs = S("__beam");
    const BL = 10, w0 = 0.3, h0 = 0.25, w1 = 1.5, h1 = 0.75;
    for (const s of [-1, 1]) {
      const q = [[s * 0.3, -h0, -w0], [s * 0.3, -h0, w0], [s * 0.3, h0, w0], [s * 0.3, h0, -w0],
        [s * BL, -h1, -w1], [s * BL, -h1, w1], [s * BL, h1, w1], [s * BL, h1, -w1]];
      hex("__beam", q);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(bs.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(bs.n, 3));
    const m = kit.toon(g, c.lamp, c.lamp, { threshold: -0.25, outline: false });
    m.name = "beamLight";
    beamJ.add(m);
  }

  // ---------- poses and clips ----------
  // beam joint: ry (rad) about +Y; rest points the wedges at 35 deg off the X axis so the hero view sees them broadside.
  const CLIPS = { beam: 8 };
  const REST_RY = 0.6;
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`lighthouse: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      const t = ((+m[2] % CLIPS.beam) + CLIPS.beam) % CLIPS.beam;
      beamJ.rotation.set(0, REST_RY + (t / CLIPS.beam) * Math.PI * 2, 0);
    } else if (name === "rest") beamJ.rotation.set(0, REST_RY, 0);
    else throw new Error(`lighthouse: unknown pose "${name}" (rest, or beam@<seconds>)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
