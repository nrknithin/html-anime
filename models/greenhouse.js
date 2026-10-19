// greenhouse.js - the school gardening club's small glass greenhouse (anime slice-of-life set piece), static.
// Contract: harness/lab/README.md. Meters, +Y up, the open long side faces +Z, its left is +X (the door end),
// stands on y = 0, centred on x = 0, z = 0 (the bbox of the whole set, the raised bed outside included).
//
// Construction (boxes, frusta, low spheres, leaf octahedra and clipped glint prisms; every triangle soup merged per
// material across the set, so the whole piece is nine meshes; everything flat-shaded so the facets band cleanly):
//   FRAME  a white pitched-roof frame on a concrete floor slab: base sill, corner and bay posts (bays of about 0.6 m),
//          eave beams, a ridge beam, a rafter per bay on both slopes, a mid rail on the back wall and the gables, three
//          bars per gable. The +Z long side is OPEN (the front panes are out for the summer): only its corner posts, a
//          centre post, the eave beam and the sill stay, so the interior reads from the front-left camera.
//   GLASS  no transparency: a pane is its frame plus glint streaks, two parallel diagonal bands (one wide, one thin) on
//          most panes, chosen by a sin hash (no Math.random). Each band is a long parallelogram clipped to the pane
//          polygon (gable triangles included, Sutherland-Hodgman) and extruded 6 mm, so it shows from both sides.
//   DOOR   a framed leaf on the +X gable, hinged at its front post and standing ajar 80 deg outward, with two glinting
//          panes and a knob. Built in place through a point transform (rotation about the hinge axis).
//   INSIDE a slatted potting bench along the back wall (top 0.80, a lower shelf with a stack of empty pots), a lower
//          bench at the front with seed trays of seedlings, two rows of potted plants on the back bench, three tomato
//          vines in big pots on canes at the -X end (zigzag stem, leaf clumps, red and green trusses), a hanging basket
//          on three chains from the ridge with trailing leaves and yellow flowers, a green watering can on the floor,
//          a stack of empty pots by the door.
//   OUTSIDE a yellow hose reel cart with a green coiled hose behind the door, and a small raised vegetable bed in
//          front of the open side (board walls, soil, three rows of leafy clumps).
//   Every closed part is wound away from a point inside it (box centre, frustum axis, leaf midpoint), never by hand.
// Proportions (real size; base unit the bay B = 0.6 m): 3.6 m long (length option) x 2.5 m deep; eave 1.70, ridge
//   2.45 (31 deg roof), top of the ridge beam 2.48; bars 45 mm (thickened from 40); door 0.78 x 1.78; benches 0.80 and
//   0.65 high, 0.6 and 0.45 deep (the front bench is left out when the greenhouse is too short for it); tomato canes 1.75; raised bed 1.8 x 0.7 x 0.3, 0.55 m in front of the open side.
// Options: build(THREE, kit, colors, { height, length }).
//   height  scales everything uniformly so the ridge top is `height` (default 2.48 m).
//   length  greenhouse length in metres (default 3.6, at least 2.4); bays and bench pots are recomputed.
// Budget: 11.8k triangles in 9 meshes at defaults (pots and leaves are 2/3 of it; 15.4k at length 6).
// Colours (meadow, as models/bike-shed.js and the school), base / shade:
//   frame, door, chains    moon #f7f3e1 / sky #d7ecef (white paint), threshold 0.1
//   glints                 sclera #f6f3ee, one tone, no ink
//   floor slab             sky #d7ecef / skin #f0c2ae, threshold 0.1
//   wood (benches, bed boards)   skin #f0c2ae / accent #d9483b, threshold 0.1
//   terracotta pots, red tomatoes        accent #d9483b / hair #2c5131
//   soil, seed trays       hair #2c5131, one tone
//   leaves, stems          line #a9d16e / iris #3f8a47
//   yellow (canes, hose reel, flowers)   practical #f2c94c / skin #f0c2ae
//   green (watering can, hose, basket)           iris #3f8a47 / hair #2c5131

export const meta = {
  name: "greenhouse",
  height: 2.48,
  script: "meadow",
  colors: {
    frame: "#f7f3e1", frameShade: "#d7ecef",
    glint: "#f6f3ee",
    floor: "#d7ecef", floorShade: "#f0c2ae",
    wood: "#f0c2ae", woodShade: "#d9483b",
    pot: "#d9483b", potShade: "#2c5131",
    soil: "#2c5131",
    leaf: "#a9d16e", leafShade: "#3f8a47",
    yellow: "#f2c94c", yellowShade: "#f0c2ae",
    green: "#3f8a47", greenShade: "#2c5131",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height } = opts;
  const L = Math.max(2.4, opts.length ?? 3.6);
  const root = new THREE.Group();
  root.name = "greenhouse";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / meta.height);
  root.add(body);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
  const hash = (i) => { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
  const soups = {};
  let X = null; // optional point transform (door, tilted props)
  const T = (p) => (X ? X(p) : p);
  function tri(key, a, b, e, ref) {
    a = T(a); b = T(b); e = T(e); ref = T(ref);
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-9) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    (soups[key] ??= []).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, cx, cy, cz, sx, sy, sz) {
    const [x0, x1, y0, y1, z0, z1] = [cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2];
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  const bx = (key, x0, x1, y0, y1, z0, z1) => box(key, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0);
  // a square-section beam from a to b, w wide, h tall (h along `up`)
  function beam(key, a, b, w, h = w, up = [0, 1, 0]) {
    const d = sub(b, a);
    let s = cross(d, up);
    if (Math.hypot(...s) < 1e-6) s = cross(d, [1, 0, 0]);
    s = nrm(s);
    const u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // closed frustum on a vertical axis
  function frustum(key, cx, cz, y0, y1, r0, r1, n = 10) {
    const ref = [cx, (y0 + y1) / 2, cz];
    const ring = (y, r) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * Math.PI * 2), y, cz + r * Math.sin((i / n) * Math.PI * 2)]);
    const A = ring(y0, r0), B = ring(y1, r1);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      quad(key, A[i], A[j], B[j], B[i], ref);
      tri(key, A[i], A[j], [cx, y0, cz], ref);
      tri(key, B[i], B[j], [cx, y1, cz], ref);
    }
  }
  // cylinder along an arbitrary axis (a -> b)
  function cyl(key, a, b, r, n = 10) {
    const d = nrm(sub(b, a));
    const s = nrm(Math.abs(d[1]) > 0.9 ? cross(d, [1, 0, 0]) : cross(d, [0, 1, 0]));
    const u = cross(s, d);
    const ref = mul(add(a, b), 0.5);
    const ring = (o) => Array.from({ length: n }, (_, i) => {
      const t = (i / n) * Math.PI * 2;
      return add(o, add(mul(s, r * Math.cos(t)), mul(u, r * Math.sin(t))));
    });
    const A = ring(a), B = ring(b);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      quad(key, A[i], A[j], B[j], B[i], ref);
      tri(key, A[i], A[j], a, ref);
      tri(key, B[i], B[j], b, ref);
    }
  }
  function sphere(key, cx, cy, cz, r, n = 6, m = 4) {
    const ref = [cx, cy, cz];
    const P = (i, j) => {
      const th = (j / m) * Math.PI, ph = (i / n) * Math.PI * 2;
      return [cx + r * Math.sin(th) * Math.cos(ph), cy + r * Math.cos(th), cz + r * Math.sin(th) * Math.sin(ph)];
    };
    for (let j = 0; j < m; j++)
      for (let i = 0; i < n; i++) quad(key, P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1), ref);
  }
  // a leaf: flat octahedron from base along dir
  function leaf(key, base, dir, len, w, t = 0.008) {
    dir = nrm(dir);
    let s = cross(dir, [0, 1, 0]);
    if (Math.hypot(...s) < 1e-3) s = [1, 0, 0];
    s = nrm(s);
    const n = cross(s, dir);
    const M = add(base, mul(dir, len * 0.45)), Tp = add(base, mul(dir, len));
    const Lp = add(M, mul(s, w / 2)), Rp = add(M, mul(s, -w / 2)), U = add(M, mul(n, t)), D = add(M, mul(n, -t));
    for (const [a, b] of [[Lp, U], [U, Rp], [Rp, D], [D, Lp]]) { tri(key, base, a, b, M); tri(key, Tp, a, b, M); }
  }

  // ---------- glass glints ----------
  // convex polygon clip (Sutherland-Hodgman), 2D
  function clip(poly, win) {
    let out = poly;
    for (let i = 0; i < win.length && out.length; i++) {
      const A = win[i], B = win[(i + 1) % win.length];
      const side = (p) => (B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0]);
      const inp = out; out = [];
      for (let k = 0; k < inp.length; k++) {
        const P = inp[k], Q = inp[(k + 1) % inp.length], sp = side(P), sq = side(Q);
        if (sp >= 0) out.push(P);
        if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); }
      }
    }
    return out;
  }
  // a pane in a plane: origin O, unit axes U, V, normal N; poly = the pane's 2D outline (CCW in u,v)
  let paneId = 0;
  function pane(O, U, V, poly, seed = paneId++) {
    if (hash(seed) < 0.4) return;
    const N = nrm(cross(U, V));
    const at = (p, o) => add(O, add(add(mul(U, p[0]), mul(V, p[1])), mul(N, o)));
    const us = poly.map((p) => p[0]), vs = poly.map((p) => p[1]);
    const u0 = Math.min(...us), u1 = Math.max(...us), v0 = Math.min(...vs), v1 = Math.max(...vs);
    const ang = 0.95 + 0.25 * hash(seed + 7); // band direction, ~55-70 deg from horizontal
    const d = [Math.cos(ang), Math.sin(ang)], nn = [-d[1], d[0]];
    const span = Math.max(u1 - u0, v1 - v0);
    const cu = u0 + (u1 - u0) * (0.3 + 0.3 * hash(seed + 3)), cv = (v0 + v1) / 2;
    const wide = Math.min(0.075, (u1 - u0) * 0.13);
    for (const [off, w] of [[0, wide], [wide * 1.6, wide * 0.35]]) {
      const p = [cu + nn[0] * off, cv + nn[1] * off];
      const band = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [p[0] + d[0] * a * span + nn[0] * b * w / 2, p[1] + d[1] * a * span + nn[1] * b * w / 2]);
      const g = clip(band, poly);
      if (g.length < 3) continue;
      const ref = at([g.reduce((s, q) => s + q[0], 0) / g.length, g.reduce((s, q) => s + q[1], 0) / g.length], 0);
      for (let i = 1; i < g.length - 1; i++) {
        tri("glint", at(g[0], 0.003), at(g[i], 0.003), at(g[i + 1], 0.003), ref);
        tri("glint", at(g[0], -0.003), at(g[i], -0.003), at(g[i + 1], -0.003), ref);
      }
      for (let i = 0; i < g.length; i++) {
        const j = (i + 1) % g.length;
        quad("glint", at(g[i], 0.003), at(g[j], 0.003), at(g[j], -0.003), at(g[i], -0.003), ref);
      }
    }
  }
  const rectP = (u0, u1, v0, v1, m = 0.025) => [[u0 + m, v0 + m], [u1 - m, v0 + m], [u1 - m, v1 - m], [u0 + m, v1 - m]];

  // ---------- frame ----------
  const W = 2.5, E = 1.7, R = 2.45, b = 0.045, FY = 0.05; // depth, eave, ridge, bar, floor top
  const x0 = -L / 2, x1 = L / 2, z0 = -W / 2, z1 = W / 2;
  const nb = Math.max(3, Math.round(L / 0.6)), bay = L / nb;
  const bxs = Array.from({ length: nb + 1 }, (_, i) => x0 + i * bay);
  const MR = 0.75; // mid rail
  const DZ0 = -0.4, DZ1 = 0.4, DH = 1.85; // door opening on the +X gable
  bx("floor", x0 - 0.08, x1 + 0.08, 0, FY, z0 - 0.08, z1 + 0.08);
  // sills
  bx("frame", x0, x1, FY, FY + 0.06, z0 - b / 2, z0 + b / 2);
  bx("frame", x0, x1, FY, FY + 0.06, z1 - b / 2, z1 + b / 2);
  bx("frame", x0 - b / 2, x0 + b / 2, FY, FY + 0.06, z0, z1);
  bx("frame", x1 - b / 2, x1 + b / 2, FY, FY + 0.06, z0, DZ0);
  bx("frame", x1 - b / 2, x1 + b / 2, FY, FY + 0.06, DZ1, z1);
  // back wall posts, front corner + centre posts
  for (const x of bxs) box("frame", x, (FY + E) / 2, z0, b, E - FY, b);
  for (const x of [x0, x1, bxs[Math.floor(nb / 2)]]) box("frame", x, (FY + E) / 2, z1, b, E - FY, b);
  // eave beams, ridge, back mid rail
  bx("frame", x0 - 0.06, x1 + 0.06, E - 0.03, E + 0.03, z0 - 0.035, z0 + 0.035);
  bx("frame", x0 - 0.06, x1 + 0.06, E - 0.03, E + 0.03, z1 - 0.035, z1 + 0.035);
  bx("frame", x0 - 0.08, x1 + 0.08, R - 0.03, R + 0.03, -0.035, 0.035);
  bx("frame", x0, x1, MR - b / 2, MR + b / 2, z0 - b / 2 + 0.005, z0 + b / 2 - 0.005);
  // rafters both slopes
  for (const x of bxs) for (const zs of [z0, z1]) beam("frame", [x, E, zs], [x, R, 0], b, b, [1, 0, 0]);
  // a purlin halfway up each slope
  for (const zs of [z0, z1]) beam("frame", [x0, (E + R) / 2, zs / 2], [x1, (E + R) / 2, zs / 2], b * 0.8, b * 0.8);
  // back wall panes
  for (let i = 0; i < nb; i++) {
    pane([bxs[i], 0, z0], [1, 0, 0], [0, 1, 0], rectP(0, bay, FY + 0.06, MR), 100 + i);
    pane([bxs[i], 0, z0], [1, 0, 0], [0, 1, 0], rectP(0, bay, MR, E - 0.03), 200 + i);
  }
  // roof panes: back slope all, front slope sparser
  const slope = Math.hypot(R - E, W / 2);
  for (let i = 0; i < nb; i++)
    for (const [zs, k] of [[z0, 300], [z1, 400]]) {
      if (k === 400 && hash(i + 31) < 0.4) continue;
      const V = nrm([0, R - E, -zs]);
      const U = zs < 0 ? [1, 0, 0] : [-1, 0, 0];
      const O = zs < 0 ? [bxs[i], E, zs] : [bxs[i + 1], E, zs];
      pane(O, U, V, rectP(0, bay, 0.03, slope / 2), k + i * 2);
      pane(O, U, V, rectP(0, bay, slope / 2, slope - 0.03), k + i * 2 + 1);
    }
  // gables: bars at quarter points, mid rail; +X end has the door opening
  const roofY = (z) => E + (R - E) * (1 - Math.abs(z) / (W / 2));
  const gz = [z0, -W / 4, 0, W / 4, z1];
  for (const [xg, sgn] of [[x0, -1], [x1, 1]]) {
    // rafters along the gable top already exist (bxs ends); vertical bars
    for (const z of [-W / 4, 0, W / 4]) {
      const ylow = sgn > 0 && Math.abs(z) < 0.45 ? DH : FY + 0.06;
      if (z === 0 || sgn < 0 || Math.abs(z) > 0.45) box("frame", xg, (ylow + roofY(z)) / 2, z, b, roofY(z) - ylow, b);
    }
    // eave-height tie across the gable
    bx("frame", xg - b / 2, xg + b / 2, E - 0.025, E + 0.025, z0, z1);
    if (sgn < 0) bx("frame", xg - b / 2 + 0.004, xg + b / 2 - 0.004, MR - b / 2, MR + b / 2, z0, z1);
    else {
      bx("frame", xg - b / 2 + 0.004, xg + b / 2 - 0.004, MR - b / 2, MR + b / 2, z0, DZ0);
      bx("frame", xg - b / 2 + 0.004, xg + b / 2 - 0.004, MR - b / 2, MR + b / 2, DZ1, z1);
    }
    // the gable's own frame plane: u along +z for the -X end... glints
    const O = [xg, 0, 0], U = [0, 0, -sgn], V = [0, 1, 0]; // u = -sgn*z (outward-facing CCW)
    const zu = (z) => -sgn * z;
    for (let j = 0; j < 4; j++) {
      const za = gz[j], zb = gz[j + 1];
      const ua = Math.min(zu(za), zu(zb)), ub = Math.max(zu(za), zu(zb));
      const door = sgn > 0 && Math.abs((za + zb) / 2) < 0.45;
      if (!door) {
        pane(O, U, V, rectP(ua, ub, FY + 0.06, MR), 500 + j + (sgn > 0 ? 10 : 0));
        pane(O, U, V, rectP(ua, ub, MR, E - 0.025), 520 + j + (sgn > 0 ? 10 : 0));
      }
      // triangle-ish part above the eave tie: polygon under the roof line
      const m = 0.025;
      const tri4 = [[ua + m, E + m], [ub - m, E + m], [ub - m, roofY(sgn * -ub) - m * 1.6], [ua + m, roofY(sgn * -ua) - m * 1.6]];
      pane(O, U, V, tri4, 540 + j + (sgn > 0 ? 10 : 0));
    }
  }
  // door opening posts and header
  for (const z of [DZ0, DZ1]) box("frame", x1, (FY + E) / 2, z, b, E - FY, b);
  bx("frame", x1 - b / 2, x1 + b / 2, DH - 0.02, DH + 0.03, DZ0, DZ1);
  // pane above the door
  pane([x1, 0, 0], [0, 0, -1], [0, 1, 0], rectP(DZ0, DZ1, DH + 0.03, E - 0.025), 560);

  // ---------- door (ajar, hinged at the front post) ----------
  {
    const th = (80 * Math.PI) / 180, hx = x1 + 0.03, hz = DZ1 - 0.02;
    X = (p) => {
      const dx = p[0] - hx, dz = p[2] - hz;
      return [hx + dx * Math.cos(th) - dz * Math.sin(th), p[1], hz + dx * Math.sin(th) + dz * Math.cos(th)];
    };
    const dw = 0.78, za = hz - dw, zb = hz, ya = FY + 0.01, yb = FY + 1.78, t = 0.035, bw = 0.05;
    bx("frame", hx - t / 2, hx + t / 2, ya, yb, za, za + bw);
    bx("frame", hx - t / 2, hx + t / 2, ya, yb, zb - bw, zb);
    bx("frame", hx - t / 2, hx + t / 2, ya, ya + 0.1, za, zb);
    bx("frame", hx - t / 2, hx + t / 2, yb - bw, yb, za, zb);
    bx("frame", hx - t / 2, hx + t / 2, 0.85, 0.85 + bw, za, zb);
    bx("green", hx + t / 2, hx + t / 2 + 0.03, 0.95, 1.03, za + 0.06, za + 0.1); // knob
    const O = [hx, 0, 0], U = [0, 0, -1], V = [0, 1, 0];
    pane(O, U, V, rectP(-zb + bw, -za - bw, ya + 0.1, 0.85, 0), 1);
    pane(O, U, V, rectP(-zb + bw, -za - bw, 0.85 + bw, yb - bw, 0), 3);
    X = null;
  }

  // ---------- benches ----------
  function bench(xa, xb, za, zb, top, shelf) {
    const slats = 4, gap = 0.015, sw = (zb - za - gap * (slats - 1)) / slats;
    for (let i = 0; i < slats; i++) bx("wood", xa, xb, top - 0.03, top, za + i * (sw + gap), za + i * (sw + gap) + sw);
    bx("wood", xa, xb, top - 0.1, top - 0.03, za, za + 0.03); // rails
    bx("wood", xa, xb, top - 0.1, top - 0.03, zb - 0.03, zb);
    const nl = Math.max(2, Math.round((xb - xa) / 1.1) + 1);
    for (let i = 0; i < nl; i++) {
      const x = xa + 0.03 + (i / (nl - 1)) * (xb - xa - 0.06);
      for (const z of [za + 0.03, zb - 0.03]) box("wood", x, (FY + top - 0.03) / 2, z, 0.05, top - 0.03 - FY, 0.05);
    }
    if (shelf) bx("wood", xa + 0.06, xb - 0.06, shelf - 0.025, shelf, za + 0.05, zb - 0.05);
  }
  function pot(x, y, z, r, h, { soil = true, n = 10 } = {}) {
    frustum("pot", x, z, y, y + h, r * 0.72, r, n);
    frustum("pot", x, z, y + h - 0.22 * h, y + h + 0.008, r * 1.08, r * 1.1, n); // rim
    if (soil) frustum("soil", x, z, y + h - 0.02, y + h + 0.004, r * 0.95, r * 0.98, n);
    else frustum("soil", x, z, y + h - 0.02, y + h + 0.012, r * 0.9, r * 0.92, n); // dark mouth of an empty pot
  }
  function stack(x, y, z, r, h, k) {
    for (let i = 0; i < k; i++) {
      const yy = y + i * h * 0.28;
      frustum("pot", x, z, yy, yy + h, r * 0.72, r, 10);
      frustum("pot", x, z, yy + h - 0.22 * h, yy + h + 0.008, r * 1.08, r * 1.1, 10);
    }
    const top = y + (k - 1) * h * 0.28 + h;
    frustum("soil", x, z, top - 0.02, top + 0.012, r * 0.9, r * 0.92, 10);
  }
  function clump(x, y, z, size, k, seed) {
    for (let i = 0; i < k; i++) {
      const a = (i / k) * Math.PI * 2 + hash(seed + i) * 0.8;
      const up = i === 0 ? 1.0 : 0.55 + 0.3 * hash(seed + i * 3);
      leaf("leaf", [x, y, z], [Math.cos(a) * (i === 0 ? 0.2 : 1), up, Math.sin(a) * (i === 0 ? 0.2 : 1)], size, size * 0.55, 0.008);
    }
  }
  function seedling(x, y, z, s, seed) {
    beam("leaf", [x, y, z], [x, y + s, z], 0.008, 0.008);
    const a = hash(seed) * Math.PI;
    for (const sg of [1, -1]) leaf("leaf", [x, y + s, z], [sg * Math.cos(a), 0.6, sg * Math.sin(a)], s * 0.9, s * 0.6, 0.006);
  }

  // back bench along the -Z wall
  const BZ0 = z0 + 0.1, BZ1 = z0 + 0.7, BT = 0.8, BX0 = x0 + 0.9, BX1 = x1 - 0.12;
  bench(BX0, BX1, BZ0, BZ1, BT, 0.32);
  {
    const n = Math.max(3, Math.floor((BX1 - BX0 - 0.1) / 0.2));
    for (let i = 0; i < n; i++) {
      const x = BX0 + 0.12 + (i / (n - 1)) * (BX1 - BX0 - 0.24);
      // back row: bigger pots with leafy plants
      pot(x, BT, BZ0 + 0.17, 0.075, 0.13);
      clump(x, BT + 0.13, BZ0 + 0.17, 0.13 + 0.05 * hash(i + 50), 5, i * 11);
      // front row: small pots with seedlings, every other one a flower
      if (i % 3 === 2) continue;
      pot(x, BT, BZ1 - 0.15, 0.055, 0.09);
      if (hash(i + 70) > 0.5) seedling(x, BT + 0.09, BZ1 - 0.15, 0.06, i);
      else clump(x, BT + 0.09, BZ1 - 0.15, 0.08, 4, i * 7 + 3);
    }
    // seed tray where the gap pots are
    // empty pot stacks on the lower shelf
    stack(BX0 + 0.25, 0.32, (BZ0 + BZ1) / 2, 0.075, 0.13, 5);
    stack(BX0 + 0.45, 0.32, (BZ0 + BZ1) / 2, 0.075, 0.13, 3);
    stack(BX1 - 0.4, 0.32, (BZ0 + BZ1) / 2, 0.06, 0.1, 4);
  }
  // front low bench with seed trays
  const FZ0 = z1 - 0.6, FZ1 = z1 - 0.15, FT = 0.65, FX0 = x0 + 0.9, FX1 = Math.min(x1 - 1.3, FX0 + 1.6);
  if (FX1 - FX0 >= 0.6) {
    bench(FX0, FX1, FZ0, FZ1, FT, 0);
    const nt = Math.max(1, Math.floor((FX1 - FX0) / 0.42));
    for (let t = 0; t < nt; t++) {
      const tx = FX0 + 0.06 + t * ((FX1 - FX0 - 0.12) / nt), tw = (FX1 - FX0 - 0.12) / nt - 0.04;
      bx("soil", tx, tx + tw, FT, FT + 0.05, FZ0 + 0.04, FZ1 - 0.04);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 3; j++)
          seedling(tx + (i + 0.5) * (tw / 4), FT + 0.05, FZ0 + 0.04 + (j + 0.5) * ((FZ1 - FZ0 - 0.08) / 3), 0.05 + 0.03 * hash(t * 13 + i * 3 + j), t * 31 + i * 5 + j);
    }
  }

  // ---------- tomatoes on canes at the -X end ----------
  for (let k = 0; k < 3; k++) {
    const tz = -0.75 + k * 0.72, tx = x0 + 0.38;
    pot(tx, FY, tz, 0.16, 0.26);
    const top = 1.7 - 0.1 * k;
    beam("yellow", [tx + 0.05, FY + 0.2, tz], [tx + 0.05, top + 0.08, tz], 0.016, 0.016);
    // zigzag stem up the cane
    const pts = [];
    for (let s = 0; s <= 8; s++) pts.push([tx + (s % 2 ? 0.0 : 0.06), FY + 0.26 + (s / 8) * (top - FY - 0.26), tz + (s % 2 ? 0.03 : -0.02)]);
    for (let s = 0; s < 8; s++) beam("leaf", pts[s], pts[s + 1], 0.018, 0.018);
    for (let s = 1; s <= 8; s++) {
      const a = s * 2.2 + k;
      const p = pts[s];
      for (const da of [-0.5, 0, 0.5]) {
        const dir = [Math.cos(a + da), 0.15 - 0.1 * Math.abs(da), Math.sin(a + da)];
        leaf("leaf", p, dir, 0.21 - 0.06 * Math.abs(da) - 0.005 * s, 0.11, 0.009);
      }
      if (s >= 2 && s <= 6 && s % 2 === 0) {
        const aa = a + Math.PI * 0.7, q = [p[0] + Math.cos(aa) * 0.07, p[1] - 0.05, p[2] + Math.sin(aa) * 0.07];
        const ripe = s < 6;
        for (const [ox, oy, oz] of [[0, 0, 0], [0.045, -0.025, 0.01], [-0.02, -0.05, 0.035]])
          sphere(ripe ? "pot" : "leaf", q[0] + ox, q[1] + oy, q[2] + oz, 0.04);
      }
    }
  }

  // ---------- hanging basket ----------
  {
    const hx = x0 + bay * Math.round(nb / 2 + 1) - bay / 2, hy = 1.62, hz = 0.15, r = 0.19;
    // bowl: a hemisphere of rings, closed by the soil
    const n = 10, m = 3, ref = [hx, hy - 0.05, hz];
    const P = (i, j) => { const t = (j / m) * (Math.PI / 2), a = (i / n) * Math.PI * 2; return [hx + r * Math.sin(t) * Math.cos(a), hy - r * 0.8 * Math.cos(t), hz + r * Math.sin(t) * Math.sin(a)]; };
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) quad("green", P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1), ref);
    for (let i = 0; i < n; i++) tri("green", P(i, m), P(i + 1, m), [hx, hy, hz], ref);
    frustum("soil", hx, hz, hy - 0.01, hy + 0.012, r * 0.95, r * 0.95, n);
    // chains to a hook under the ridge
    const hook = [hx, R - 0.06, hz * 0.3];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.4;
      beam("frame", [hx + r * Math.cos(a), hy + 0.01, hz + r * Math.sin(a)], hook, 0.012, 0.012);
    }
    // plants: trailing leaves over the rim, a clump on top, yellow flowers
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3;
      const p = [hx + r * 0.85 * Math.cos(a), hy + 0.02, hz + r * 0.85 * Math.sin(a)];
      leaf("leaf", p, [Math.cos(a), -0.9 - 0.6 * hash(i + 90), Math.sin(a)], 0.14 + 0.08 * hash(i + 91), 0.07, 0.007);
      leaf("leaf", p, [Math.cos(a), 0.5, Math.sin(a)], 0.1, 0.06, 0.007);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      sphere("yellow", hx + r * 0.6 * Math.cos(a), hy + 0.07, hz + r * 0.6 * Math.sin(a), 0.028, 5, 3);
    }
  }

  // ---------- props on the floor ----------
  // empty pot stack by the door
  stack(x1 - 0.3, FY, z1 - 0.35, 0.1, 0.17, 4);
  stack(x1 - 0.55, FY, z1 - 0.25, 0.08, 0.14, 3);
  // watering can: body, cap ring, spout with rose, arched handle
  {
    const wx = x1 - 0.85, wz = z1 - 0.35, wy = FY, rr = 0.11, hh = 0.24;
    cyl("green", [wx, wy, wz], [wx, wy + hh, wz], rr, 12);
    cyl("green", [wx - 0.02, wy + hh, wz], [wx - 0.02, wy + hh + 0.03, wz], 0.05, 10);
    const s0 = [wx + rr * 0.8, wy + 0.04, wz + 0.02], s1 = [wx + rr + 0.2, wy + hh + 0.06, wz + 0.08];
    cyl("green", s0, s1, 0.018, 6);
    cyl("green", s1, add(s1, mul(nrm(sub(s1, s0)), 0.05)), 0.04, 10); // rose
    const hp = [[wx - rr * 0.9, wy + hh - 0.02, wz], [wx - rr * 0.6, wy + hh + 0.12, wz], [wx + rr * 0.4, wy + hh + 0.12, wz], [wx + rr * 0.6, wy + hh, wz]];
    for (let i = 0; i < 3; i++) beam("green", hp[i], hp[i + 1], 0.022, 0.022, [0, 0, 1]);
  }
  // hose reel cart outside the door corner
  {
    const rx = x1 + 0.55, rz = z0 + 0.35, ry = 0.25, rr = 0.24, half = 0.17;
    for (const s of [-1, 1]) {
      cyl("yellow", [rx + s * half, ry, rz], [rx + s * (half + 0.025), ry, rz], rr, 14); // reel discs
      beam("yellow", [rx + s * (half + 0.06), 0.02, rz + 0.18], [rx + s * (half + 0.06), 0.85, rz - 0.1], 0.03, 0.03, [0, 0, 1]); // frame legs
      beam("yellow", [rx + s * (half + 0.06), 0.02, rz - 0.2], [rx + s * (half + 0.06), ry, rz], 0.03, 0.03, [0, 0, 1]);
      cyl("green", [rx + s * (half + 0.075), 0.08, rz + 0.17], [rx + s * (half + 0.115), 0.08, rz + 0.17], 0.08, 10); // wheels
    }
    beam("yellow", [rx - half - 0.08, 0.85, rz - 0.1], [rx + half + 0.08, 0.85, rz - 0.1], 0.035, 0.035); // handle
    cyl("yellow", [rx - half - 0.06, ry, rz], [rx + half + 0.06, ry, rz], 0.02, 6); // axle
    // coiled hose: a fat drum with coil rings
    cyl("green", [rx - half, ry, rz], [rx + half, ry, rz], rr * 0.72, 12);
    for (let i = 0; i < 5; i++) {
      const x = rx - half + 0.03 + i * ((2 * half - 0.06) / 4);
      cyl("soil", [x - 0.005, ry, rz], [x + 0.005, ry, rz], rr * 0.735, 12);
    }
    // hose end trailing along the gable toward the front
    const tp = [[rx, ry - rr * 0.72, rz + 0.05]];
    for (let i = 1; i <= 9; i++) tp.push([rx + 0.12 + 0.12 * Math.sin(i * 0.9), 0.03, rz + 0.12 + i * 0.17]);
    for (let i = 0; i < tp.length - 1; i++) beam("green", tp[i], tp[i + 1], 0.03, 0.03);
  }

  // ---------- raised vegetable bed outside the open side ----------
  {
    const ex0 = x0 + 0.5, ex1 = Math.min(x1 - 1.3, ex0 + 1.8), ez0 = z1 + 0.55, ez1 = ez0 + 0.7, eh = 0.3, t = 0.04;
    bx("wood", ex0, ex1, 0, eh, ez0, ez0 + t);
    bx("wood", ex0, ex1, 0, eh, ez1 - t, ez1);
    bx("wood", ex0, ex0 + t, 0, eh, ez0 + t, ez1 - t);
    bx("wood", ex1 - t, ex1, 0, eh, ez0 + t, ez1 - t);
    for (const x of [ex0 + 0.03, ex1 - 0.03]) for (const z of [ez0 + 0.03, ez1 - 0.03]) box("wood", x, eh / 2 + 0.02, z, 0.07, eh + 0.04, 0.07); // corner posts
    bx("soil", ex0 + t, ex1 - t, 0, eh - 0.04, ez0 + t, ez1 - t);
    const nr = Math.max(2, Math.floor((ex1 - ex0) / 0.3));
    for (let row = 0; row < 2; row++)
      for (let i = 0; i < nr; i++) {
        const x = ex0 + 0.15 + (i / (nr - 1)) * (ex1 - ex0 - 0.3), z = ez0 + 0.2 + row * 0.3;
        if (row === 0) clump(x, eh - 0.04, z, 0.16 + 0.04 * hash(i + 200), 6, i * 17 + 1); // lettuce
        else {
          for (let s = 0; s < 3; s++) leaf("leaf", [x, eh - 0.04, z], [Math.cos(s * 2.1 + i), 2.5, Math.sin(s * 2.1 + i)], 0.2, 0.05, 0.006); // onion / carrot tops
          sphere("pot", x + 0.05, eh - 0.03, z + 0.03, 0.03, 5, 3); // a radish shoulder
        }
      }
  }

  // ---------- centre the set, make meshes ----------
  let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const arr of Object.values(soups))
    for (let i = 0; i < arr.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], arr[i + k]); mx[k] = Math.max(mx[k], arr[i + k]); }
  const ox = (mn[0] + mx[0]) / 2, oz = (mn[2] + mx[2]) / 2;
  const MAT = {
    frame: [c.frame, c.frameShade, 0.1, 2],
    glint: [c.glint, c.glint, 0, 0],
    floor: [c.floor, c.floorShade, 0.1, 3],
    wood: [c.wood, c.woodShade, 0.1, 2.5],
    pot: [c.pot, c.potShade, 0.2, 2],
    soil: [c.soil, c.soil, 0, 0],
    leaf: [c.leaf, c.leafShade, 0.2, 1.5],
    yellow: [c.yellow, c.yellowShade, 0.1, 2],
    green: [c.green, c.greenShade, 0.25, 2],
  };
  for (const [key, arr] of Object.entries(soups)) {
    for (let i = 0; i < arr.length; i += 3) { arr[i] -= ox; arr[i + 2] -= oz; }
    const [base, shade, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = px ? kit.toon(g, base, shade, { threshold, px }) : kit.toon(g, base, shade, { threshold, outline: false });
    mesh.name = key;
    body.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
