// beer-garden.js - a summer-night rooftop beer garden (okujo beer garden) on a city building, as a 14 x 10 m set tile:
// a dark deck inside a low parapet with a plain rail fence on it, three rows of folding tables with round plastic
// stools, beer mugs with foam, edamame bowls and yakitori plates on the tables, a serving counter on the -X side under a
// canopy (tap tower, stacked mugs, a plain hanging banner), a cluster of air-conditioning condensers in the back +X
// corner, potted plants, and the key read: strings of round paper lanterns and bulbs zigzagging overhead between poles.
// Contract: harness/lab/README.md. Meters, +Y up, the tables run along X, the counter faces +X (the hero side), the
// set's left is +X, stands on y = 0, centred on x = 0, z = 0.
//
// Construction (boxes, bars, capped cylinders between two points and low ellipsoids, all triangle soups merged per
// material; every triangle wound away from a point inside its solid; flat normals on planes, smooth on round parts).
// Pieces are authored in local frames (origin on the deck, yaw about +Y) and baked into world space. Every vertex
// carries an owner: -1 static, 0-5 the six lantern strings. A string's wire, cords, lanterns and bulbs share the static
// meshes of their materials; pose() rewrites only the owned vertices (positions, normals, hull normals), swinging each
// string about the chord between its two pole tops, so the sway clip adds no meshes.
//   DECK      slab 14 x 10 m, top 0.2; dark seams on a 2 m grid; parapet 0.25 over the deck, 0.25 thick, with a cap (kept low so the hero camera sees in).
//   FENCE     a low rail fence on the parapet: posts every ~1.4 m, a kick rail and a top rail (1.35, 1.15 over the deck), nothing across the table-top band.
//   TABLES    nine folding tables (1.8 x 0.6, top 0.7 over the deck) in three rows along X, four round stools each.
//   ON TABLES per table three or four mugs (amber beer, white foam head, a handle), an edamame bowl (dark bowl, a pale
//             heap of pods), a white yakitori plate with two skewers.
//   COUNTER   3.6 m long on the -X side facing +X: white front with a pink band, amber top, a steel tap tower with
//             three taps, a pyramid of stacked empty mugs, a back shelf with more mugs; a canopy on four posts with a
//             plain pink banner (white hem bands, no lettering) along its front edge.
//   PLANT     four AC condensers (two on the deck, two on a steel rack) with dark fan discs and a grille cross, a duct.
//   PLANTS    five pots (pink) with dark leaf clumps along the -X and back parapets.
//   LIGHTS    seven poles (top 3.6) along the front and back parapets, six sagging wires zigzagging front-back-front
//             across X; on each wire round paper lanterns (pink and amber, dark caps) alternate with small bulbs.
// Proportions (real size, base unit the 0.7 m table height): parapet 0.65 top; fence 1.35; stools 0.45; counter 1.05,
//   canopy 2.55, banner 2.0-2.5; AC units 0.75 x 0.6; poles 3.6, wire sag 0.55; lanterns 0.34 x 0.4.
// Options: build(THREE, kit, colors, { height, lights }).
//   height   scales the whole set uniformly so its top is `height` (as the torii does).
//   lights   false switches the lanterns and bulbs off: they shade as paper and glass instead of glowing (default true).
// Clip: sway (2 s loop): each lantern string swings gently about its chord, neighbours out of phase; pose("sway@0.5").
// Colours (festival, summer night), base / shade:
//   deck                                   sky #24143a, one tone (the night roof)
//   parapet, table tops, pods              moon #ffd7a1 / sky #24143a, threshold 0.35
//   pink plastic (stools, pots, banner)    accent #ff4d6d / sky #24143a
//   white (foam, plates, counter, AC)      sclera #f6f3ee / sky #24143a
//   amber (beer, stools, counter top, meat) practical #ffb020 / accent #ff4d6d
//   steel (fence, poles, legs, taps, empty mugs) line #fff1ea / sky #24143a, 2 px ink
//   black (bowls, fan discs, handles)      hair #1a1020 / sky #24143a
//   leaves                                 hair #1a1020, one tone with a 2 px hull
//   seams, wires, cords, caps, grilles     hair #1a1020, one tone, no hull
//   lanterns lit                           accent #ff4d6d and practical #ffb020 glow (threshold -0.25); bulbs practical glow
//   lanterns off                           accent / sky and sclera / sky; bulbs line / sky

export const meta = {
  name: "beer-garden",
  height: 3.72,
  script: "festival",
  colors: {
    deck: "#24143a",
    wall: "#ffd7a1", wallShade: "#24143a",
    pink: "#ff4d6d", pinkShade: "#24143a",
    white: "#f6f3ee", whiteShade: "#24143a",
    amber: "#ffb020", amberShade: "#ff4d6d",
    steel: "#fff1ea", steelShade: "#24143a",
    black: "#1a1020", blackShade: "#24143a",
    leaf: "#1a1020",
    dark: "#1a1020",
    glowPink: "#ff4d6d",
    glow: "#ffb020",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const LIGHTS = opts.lights !== false;
  const root = new THREE.Group();
  root.name = "beer-garden";
  const body = new THREE.Group(); // uniform size scale lives here
  body.name = "body";
  root.add(body);
  const joints = {};
  const TAU = Math.PI * 2;

  // ---------- triangle soups with owners ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [], o: [] });
  let owner = -1;
  let T = null; // local frame: { o: [x, y, z], cy: cos yaw, sy: sin yaw }
  const P = (q) => (T ? [T.o[0] + q[0] * T.cy + q[2] * T.sy, T.o[1] + q[1], T.o[2] - q[0] * T.sy + q[2] * T.cy] : q);
  const N = (q) => (T ? [q[0] * T.cy + q[2] * T.sy, q[1], -q[0] * T.sy + q[2] * T.cy] : q);
  function frame(x, y, z, yaw, fn) {
    const prev = T;
    T = { o: [x, y, z], cy: Math.cos(yaw), sy: Math.sin(yaw) };
    fn();
    T = prev;
  }
  function mark(name, x, y, z) { // a named pivot with no geometry, for framing a piece
    const j = new THREE.Group();
    j.name = name;
    j.position.set(x, y, z);
    body.add(j);
    joints[name] = j;
    return j;
  }
  let maxY = 0;
  function tri(key, a, b, e, ref, na, nb, ne) { // one triangle wound away from ref (local coords)
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const flip = dot(n, sub(mul(add(add(a, b), e), 1 / 3), ref)) < 0;
    n = nrm(flip ? mul(n, -1) : n);
    const s = S(key);
    const vs = flip ? [[a, na], [e, ne], [b, nb]] : [[a, na], [b, nb], [e, ne]];
    for (const [q, nq] of vs) {
      const w = P(q);
      if (w[1] > maxY) maxY = w[1];
      s.p.push(...w), s.n.push(...N(nq ?? n)), s.o.push(owner);
    }
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, x0, x1, y0, y1, z0, z1) {
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  const flat = (key, x0, x1, z0, z1, y) => quad(key, [x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [x0, y - 1, z0]);
  function axes(t) { // two unit vectors perpendicular to t
    let s = cross(t, [0, 1, 0]);
    if (Math.hypot(...s) < 1e-6 * Math.hypot(...t)) s = [1, 0, 0];
    s = nrm(s);
    return [s, nrm(cross(s, t))];
  }
  function bar(key, p, q, w) { // square bar from p to q, half-width w
    const [s, u] = axes(sub(q, p));
    const C = (pt, i, j) => add(pt, add(mul(s, w * i), mul(u, w * j)));
    hex(key, [C(p, -1, -1), C(p, 1, -1), C(p, 1, 1), C(p, -1, 1), C(q, -1, -1), C(q, 1, -1), C(q, 1, 1), C(q, -1, 1)]);
  }
  function cyl(key, p, q, r0, n = 12, r1 = r0) { // capped (frustum) cylinder from p to q, smooth sides
    const [s, u] = axes(sub(q, p));
    const ref = mul(add(p, q), 0.5);
    const R = (pt, a, r) => add(pt, add(mul(s, Math.cos(a) * r), mul(u, Math.sin(a) * r)));
    const Nr = (a) => add(mul(s, Math.cos(a)), mul(u, Math.sin(a)));
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
      tri(key, R(p, a0, r0), R(p, a1, r0), R(q, a1, r1), ref, Nr(a0), Nr(a1), Nr(a1));
      tri(key, R(p, a0, r0), R(q, a1, r1), R(q, a0, r1), ref, Nr(a0), Nr(a1), Nr(a0));
      if (r1 > 0) tri(key, q, R(q, a0, r1), R(q, a1, r1), ref);
      if (r0 > 0) tri(key, p, R(p, a0, r0), R(p, a1, r0), ref);
    }
  }
  const up = (key, x, z, y0, y1, r, n, r1) => cyl(key, [x, y0, z], [x, y1, z], r, n, r1);
  function ball(key, cx, cy, cz, rx, ry = rx, rz = rx, nu = 10, nv = 6) { // low ellipsoid, smooth normals
    const Q = (i, j) => {
      const uu = (i / nu) * TAU, v = (j / nv) * Math.PI;
      return [cx + Math.sin(v) * Math.cos(uu) * rx, cy + Math.cos(v) * ry, cz + Math.sin(v) * Math.sin(uu) * rz];
    };
    const Nn = (q) => nrm([(q[0] - cx) / (rx * rx), (q[1] - cy) / (ry * ry), (q[2] - cz) / (rz * rz)]);
    const ref = [cx, cy, cz];
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = Q(i, j), b = Q(i + 1, j), e = Q(i + 1, j + 1), d = Q(i, j + 1);
      if (j > 0) tri(key, a, b, e, ref, Nn(a), Nn(b), Nn(e));
      if (j < nv - 1) tri(key, a, e, d, ref, Nn(a), Nn(e), Nn(d));
    }
  }

  // ---------- dimensions ----------
  const XW = 7, ZD = 5, D = 0.2; // deck half-extents, deck top
  const PT = 0.25, PY = 0.45; // parapet thickness, top (low: the hero camera sees in)
  const IX = XW - PT, IZ = ZD - PT;
  const FT = 1.35; // fence top
  const TH = D + 0.7; // table top

  // ---------- deck, seams, parapet ----------
  box("deck", -XW, XW, 0, D, -ZD, ZD);
  box("wall", -XW, XW, D - 0.1, PY, ZD - PT, ZD);
  box("wall", -XW, XW, D - 0.1, PY, -ZD, -ZD + PT);
  box("wall", -XW, -XW + PT, D - 0.1, PY, -ZD + 0.1, ZD - 0.1);
  box("wall", XW - PT, XW, D - 0.1, PY, -ZD + 0.1, ZD - 0.1);
  for (const [x0, x1, z0, z1] of [[-XW - 0.04, XW + 0.04, ZD - PT - 0.04, ZD + 0.04], [-XW - 0.04, XW + 0.04, -ZD - 0.04, -ZD + PT + 0.04],
    [-XW - 0.04, -XW + PT + 0.04, -ZD + PT, ZD - PT], [XW - PT - 0.04, XW + 0.04, -ZD + PT, ZD - PT]])
    box("wall", x0, x1, PY, PY + 0.05, z0, z1); // caps
  const y1 = D + 0.005, SW = 0.02;
  for (let x = -6; x <= 6; x += 2) flat("dark", x - SW, x + SW, -IZ, IZ, y1);
  for (let z = -4; z <= 4; z += 2) flat("dark", -IX, IX, z - SW, z + SW, y1);

  // ---------- low rail fence ----------
  function fence(a, b) { // a, b: [x, z] on the parapet centre line
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), d = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    const F = (u, y) => [a[0] + d[0] * u, y, a[1] + d[1] * u];
    const n = Math.max(1, Math.round(len / 1.4));
    for (let i = 0; i <= n; i++) bar("steel", F((len * i) / n, PY), F((len * i) / n, FT + 0.03), 0.025);
    for (const y of [PY + 0.12, FT]) bar("steel", F(0, y), F(len, y), 0.022);
  }
  {
    const ex = XW - PT / 2, ez = ZD - PT / 2;
    fence([ex, ez], [-ex, ez]);
    fence([-ex, -ez], [ex, -ez]);
    fence([ex, -ez], [ex, ez]);
    fence([-ex, ez], [-ex, -ez]);
  }

  // ---------- tables, stools, food ----------
  function mug(x, z, y, yaw) { // a beer mug: amber body, white foam head, black handle
    frame(x, y, z, yaw, () => {
      up("amber", 0, 0, 0, 0.15, 0.045, 6);
      up("white", 0, 0, 0.15, 0.185, 0.05, 6, 0.042);
      bar("black", [0.075, 0.03, 0], [0.075, 0.125, 0], 0.014);
    });
  }
  function table(x, z, k) {
    mark(`table${k}`, x, TH, z);
    frame(x, D, z, 0, () => {
      box("wall", -0.9, 0.9, 0.64, 0.7, -0.3, 0.3); // top with its apron
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) bar("steel", [sx * 0.78, 0, sz * 0.24], [sx * 0.78, 0.64, sz * 0.24], 0.016);
        bar("steel", [sx * 0.78, 0.12, -0.24], [sx * 0.78, 0.12, 0.24], 0.012);
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { // stools, pink and amber
        const key = (sx + sz + k) % 2 === 0 ? "pink" : "amber";
        up(key, sx * 0.48, sz * 0.62, 0, 0.45, 0.16, 8, 0.145);
      }
    });
    // what is on it: deterministic per table
    const items = k % 2 === 0
      ? { mugs: [[-0.62, -0.14], [-0.38, 0.16], [0.3, -0.15], [0.66, 0.13]], bowl: [-0.05, -0.1], plate: [0.05, 0.12, 0.2] }
      : { mugs: [[-0.55, 0.15], [0.42, 0.14], [0.68, -0.12]], bowl: [0.15, 0.12], plate: [-0.2, -0.1, -0.3] };
    for (const [i, [mx, mz]] of items.mugs.entries()) mug(x + mx, z + mz, TH, (i % 2 ? 1 : -1) * 1.2 + k);
    {
      const [bx, bz] = items.bowl; // edamame: dark bowl, pale heap of pods
      up("black", x + bx, z + bz, TH, TH + 0.06, 0.05, 8, 0.085);
      ball("wall", x + bx, TH + 0.06, z + bz, 0.075, 0.04, 0.075, 6, 3);
    }
    {
      const [px, pz, yaw] = items.plate; // yakitori: white plate, two skewers of glazed pieces
      frame(x + px, TH, z + pz, yaw, () => {
        up("white", 0, 0, 0, 0.015, 0.14, 8, 0.12);
        for (const dz of [-0.04, 0.04]) {
          bar("steel", [-0.16, 0.035, dz], [0.14, 0.035, dz], 0.004);
          for (const u of [-0.08, -0.02, 0.04]) box("amber", u - 0.025, u + 0.025, 0.017, 0.055, dz - 0.022, dz + 0.022);
        }
      });
    }
  }
  {
    let k = 0;
    for (const z of [-2.4, 0.0, 2.4]) for (const x of [-2.4, 0.4, 3.2]) table(x, z, k++);
  }

  // ---------- serving counter on the -X side, facing +X ----------
  const CXc = -5.95, CZc = -1.0; // counter centre
  mark("counter", CXc, D + 1.05, CZc);
  frame(CXc, D, CZc, Math.PI / 2, () => { // local +Z is world +X: the counter front
    const W = 1.8, B = -0.35, F = 0.35, H = 0.85;
    box("white", -W, W, 0, H, B, F); // body
    box("pink", -W - 0.005, W + 0.005, 0.42, 0.6, F - 0.01, F + 0.006); // band
    box("amber", -W - 0.08, W + 0.08, H, H + 0.06, B - 0.05, F + 0.12); // top
    // tap tower: column, T head, three spouts with black handles
    const tx = -0.6, ty = H + 0.06;
    up("steel", tx, 0, ty, ty + 0.45, 0.05, 10);
    cyl("steel", [tx - 0.26, ty + 0.45, 0], [tx + 0.26, ty + 0.45, 0], 0.045, 10);
    box("steel", tx - 0.14, tx + 0.14, ty, ty + 0.02, -0.12, 0.12); // drip tray
    for (const u of [-0.18, 0, 0.18]) {
      cyl("steel", [tx + u, ty + 0.45, 0.03], [tx + u, ty + 0.38, 0.1], 0.016, 6);
      bar("black", [tx + u, ty + 0.47, 0.03], [tx + u, ty + 0.62, 0.03], 0.018);
    }
    // stacked empty mugs: a 3-2-1 pyramid on the counter, steel-pale glass
    for (let r = 0; r < 3; r++) for (let i = 0; i < 3 - r; i++) {
      const mx = 0.55 + (i - (2 - r) / 2) * 0.11, my = ty + r * 0.155;
      up("steel", mx, 0.05, my, my + 0.15, 0.048, 7);
    }
    up("amber", 1.25, 0.08, ty, ty + 0.15, 0.045, 7); // one poured, waiting
    up("white", 1.25, 0.08, ty + 0.15, ty + 0.185, 0.05, 7, 0.042);
    // back wall and shelf with more mugs
    box("white", -W - 0.1, W + 0.1, 0, 2.55, -0.74, -0.66);
    box("amber", -W, W, 1.55, 1.59, -0.66, -0.42);
    for (let i = 0; i < 9; i++) up("steel", -1.5 + i * 0.22 + (i > 4 ? 0.3 : 0), -0.54, 1.59, 1.74, 0.05, 7);
    box("black", -W + 0.3, -0.3, 0.9, 1.4, -0.66, -0.4); // beer server
    // canopy on four posts, plain banner along its front
    const CF = 1.25, RY = 2.55;
    for (const sx of [-1, 1]) up("steel", sx * (W + 0.05), CF, 0, RY, 0.035, 8);
    box("amber", -W - 0.2, W + 0.2, RY, RY + 0.08, -0.8, CF + 0.12);
    box("pink", -W - 0.15, W + 0.15, 2.0, RY, CF + 0.13, CF + 0.16); // banner cloth
    for (const [y0, yb] of [[RY - 0.08, RY - 0.03], [2.03, 2.08]]) box("white", -W - 0.15, W + 0.15, y0, yb, CF + 0.16, CF + 0.17); // hem bands
  });

  // ---------- AC condenser cluster, back +X corner ----------
  function condenser(x, y, z) { // faces +Z
    box("white", x - 0.4, x + 0.4, y, y + 0.6, z - 0.15, z + 0.15);
    cyl("black", [x - 0.08, y + 0.3, z + 0.15], [x - 0.08, y + 0.3, z + 0.16], 0.22, 14);
    const gz = z + 0.17;
    quad("dark", [x - 0.31, y + 0.29, gz], [x + 0.15, y + 0.29, gz], [x + 0.15, y + 0.31, gz], [x - 0.31, y + 0.31, gz], [x, y + 0.3, gz - 1]);
    quad("dark", [x - 0.09, y + 0.07, gz], [x - 0.07, y + 0.07, gz], [x - 0.07, y + 0.53, gz], [x - 0.09, y + 0.53, gz], [x, y + 0.3, gz - 1]);
  }
  {
    const z = -IZ + 0.3;
    condenser(4.95, D + 0.06, z);
    condenser(5.85, D + 0.06, z);
    box("wall", 4.45, 6.35, D, D + 0.06, z - 0.25, z + 0.25); // pad
    for (const x of [4.6, 6.2]) for (const dz of [-0.13, 0.13]) bar("steel", [x, D + 0.66, z + dz], [x, D + 0.95, z + dz], 0.02); // rack
    box("steel", 4.5, 6.3, D + 0.93, D + 0.97, z - 0.17, z + 0.17);
    condenser(4.95, D + 0.97, z);
    condenser(5.85, D + 0.97, z);
    bar("black", [4.5, D + 1.2, z - 0.1], [3.9, D + 1.2, z - 0.1], 0.05); // duct
    bar("black", [3.9, D + 1.2, z - 0.1], [3.9, PY, z - 0.1], 0.05);
  }

  // ---------- potted plants ----------
  function plant(x, z, s) {
    up("pink", x, z, D, D + 0.4 * s, 0.17 * s, 10, 0.22 * s);
    ball("leaf", x, D + 0.62 * s, z, 0.3 * s, 0.26 * s, 0.3 * s, 8, 5);
    ball("leaf", x + 0.12 * s, D + 0.85 * s, z - 0.05 * s, 0.18 * s, 0.17 * s, 0.18 * s, 7, 4);
  }
  plant(-6.35, 4.3, 1.1); // the -X and back edges, out of the hero sightline
  plant(-6.35, -4.3, 1.0);
  plant(-2.1, -4.35, 0.9);
  plant(2.1, -4.35, 0.85);
  plant(-4.2, -4.35, 1.0);

  // ---------- lantern strings ----------
  const PH = 3.6, PZ = IZ - 0.15;
  const front = [-6.3, -2.1, 2.1, 6.3].map((x) => [x, PZ]);
  const back = [-4.2, 0, 4.2].map((x) => [x, -PZ]);
  const POLES = [front[0], back[0], front[1], back[1], front[2], back[2], front[3]];
  for (const [x, z] of POLES) {
    up("steel", x, z, D, PH + 0.04, 0.045, 8);
    up("black", x, z, D, D + 0.12, 0.11, 8);
    ball("steel", x, PH + 0.06, z, 0.065, 0.065, 0.065, 6, 4);
  }
  const lantP = LIGHTS ? "glowPink" : "pink", lantA = LIGHTS ? "glow" : "white", bulb = LIGHTS ? "glow" : "steel";
  const CHORDS = []; // per string: pivot (pole top) and unit axis along the chord
  for (let w = 0; w < POLES.length - 1; w++) {
    owner = w;
    const a = POLES[w], b = POLES[w + 1], sag = 0.55;
    const A = [a[0], PH - 0.02, a[1]], B = [b[0], PH - 0.02, b[1]];
    CHORDS.push({ A, u: nrm(sub(B, A)) });
    const at = (t) => [A[0] + (B[0] - A[0]) * t, A[1] - sag * 4 * t * (1 - t), A[2] + (B[2] - A[2]) * t];
    const segs = 10;
    for (let i = 0; i < segs; i++) bar("dark", at(i / segs), at((i + 1) / segs), 0.012);
    const len = Math.hypot(B[0] - A[0], B[2] - A[2]), n = Math.round(len / 0.62);
    for (let i = 1; i < n; i++) {
      const q = at(i / n);
      if (i % 2) { // round paper lantern on a short cord, dark caps
        const key = (i + w) % 4 === 1 ? lantA : lantP, cy = q[1] - 0.3;
        bar("dark", q, [q[0], cy + 0.2, q[2]], 0.008);
        up("dark", q[0], q[2], cy + 0.17, cy + 0.22, 0.07, 5);
        up("dark", q[0], q[2], cy - 0.22, cy - 0.17, 0.07, 5);
        ball(key, q[0], cy, q[2], 0.17, 0.2, 0.17, 8, 4);
      } else {
        ball(bulb, q[0], q[1] - 0.08, q[2], 0.05, 0.065, 0.05, 5, 3);
      }
    }
  }
  owner = -1;

  // ---------- meshes ----------
  const MAT = {
    deck: [c.deck, c.deck, 0.1, {}],
    wall: [c.wall, c.wallShade, 0.35, {}],
    pink: [c.pink, c.pinkShade, 0.2, { px: 3 }],
    white: [c.white, c.whiteShade, 0.2, { px: 3 }],
    amber: [c.amber, c.amberShade, 0.2, { px: 3 }],
    steel: [c.steel, c.steelShade, 0.1, { px: 2 }],
    black: [c.black, c.blackShade, 0.3, { px: 2 }],
    leaf: [c.leaf, c.leaf, 0.1, { px: 2 }],
    dark: [c.dark, c.dark, 0.1, { outline: false }],
    glowPink: [c.glowPink, c.glowPink, -0.25, { px: 2 }],
    glow: [c.glow, c.glow, -0.25, { px: 2 }],
  };
  const movers = [];
  for (const [key, { p, n, o }] of Object.entries(soups)) {
    if (!p.length) continue;
    const [base, shade, threshold, op] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, base, shade, { threshold, ...op });
    mesh.name = key;
    body.add(mesh);
    if (o.some((k) => k >= 0)) {
      const idx = [];
      o.forEach((k, v) => k >= 0 && idx.push(v));
      const hn = g.attributes.hullNormal;
      movers.push({ g, idx, o, p: Float32Array.from(p), n: Float32Array.from(n), h: hn ? Float32Array.from(hn.array) : null });
      mesh.frustumCulled = false;
      mesh.traverse((ch) => (ch.frustumCulled = false));
    }
  }

  const k = opts.height ? opts.height / maxY : 1;
  body.scale.setScalar(k);

  // ---------- poses and the sway clip ----------
  // owner w: rotate by angle a_w about the chord of string w (axis A -> B through the pole top A); +a swings the
  // hanging lanterns toward the side the right-hand rule gives, neighbours run opposite so the zigzag ripples.
  const NW = CHORDS.length;
  const MS = Array.from({ length: NW }, () => new THREE.Matrix4());
  const NM = MS.map(() => new THREE.Matrix3());
  const tmp = new THREE.Matrix4(), tmp2 = new THREE.Matrix4(), q = new THREE.Vector3(), ax = new THREE.Vector3();
  function apply(angles) {
    CHORDS.forEach(({ A, u }, i) => {
      ax.set(u[0], u[1], u[2]);
      MS[i].makeTranslation(A[0], A[1], A[2]).multiply(tmp.makeRotationAxis(ax, angles[i])).multiply(tmp2.makeTranslation(-A[0], -A[1], -A[2]));
      NM[i].getNormalMatrix(MS[i]);
    });
    for (const mv of movers) {
      const P3 = mv.g.attributes.position.array, N3 = mv.g.attributes.normal.array, H = mv.g.attributes.hullNormal?.array;
      for (const v of mv.idx) {
        const kk = mv.o[v], i = v * 3;
        q.fromArray(mv.p, i).applyMatrix4(MS[kk]).toArray(P3, i);
        q.fromArray(mv.n, i).applyMatrix3(NM[kk]).normalize().toArray(N3, i);
        if (H && mv.h) q.fromArray(mv.h, i).applyMatrix3(NM[kk]).normalize().toArray(H, i);
      }
      mv.g.attributes.position.needsUpdate = mv.g.attributes.normal.needsUpdate = true;
      if (H) mv.g.attributes.hullNormal.needsUpdate = true;
      mv.g.computeBoundingSphere(), mv.g.computeBoundingBox();
    }
    root.updateMatrixWorld(true);
  }
  const CLIPS = { sway: 2 };
  function sway(t) {
    const u = ((t % 2) + 2) % 2;
    apply(CHORDS.map((_, i) => 0.16 * Math.sin(Math.PI * u + i * 2.1)));
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`beer-garden: no clip "${m[1]}" (clips: sway)`);
      return sway(+m[2]);
    }
    if (name !== "rest") throw new Error(`beer-garden: unknown pose "${name}" (rest, or sway@<seconds>)`);
    apply(CHORDS.map(() => 0));
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
