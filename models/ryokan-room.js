// ryokan-room.js - a hot-spring inn guest room (the class-trip / onsen-episode room), static cutaway set.
// Contract: harness/lab/README.md. Meters, +Y up, the open (cutaway) sides face +X and +Z so a camera in the lit
// front-left quadrant sees in; the -X wall holds the tokonoma, the TV and the oshiire fusuma, the -Z wall is the shoji
// with the window nook (hiroen) beyond it. Stands on y = 0 (tatami top y = 0.05, joints.floor), centred on the room.
//
// Construction (boxes, frusta, lathes, polygon tubes and flat wall-plane shapes, all triangle soups merged per
// material; flat shaded so mats and panels read crisp; every closed part is wound away from a point inside it):
//   FLOOR    eight tatami 1.82 x 0.91 x 0.05 on a 4 x 4 grid of half-mat cells, T-junctions only, dark heri on each
//            mat's long edges and faint rush lines.
//   WALLS    hashira posts at the corners and the tokonoma, sills, kamoi lintels at 1.80, a nageshi band and plaster
//            above. -Z: four shoji, the middle two slid over the end ones so a 1.7 m gap opens onto the hiroen.
//            -X: tokonoma (raised board, otoshigake, an abstract scroll of three brush strokes and a red seal, a vase
//            with camellias), the TV on a low cabinet, and a plain fusuma pair (the futon closet).
//   HIROEN   1 m deep wood-floored nook past the shoji: two cane chairs facing each other across a small round table,
//            and a window wall-wide with two mullions; on the glass, flat shapes: a mountain ridge and a maple.
//   PROPS    a low rectangular table with a tray, teapot, two cups, a tea caddy and a plate of two manju; two zaisu
//            (floor chairs with a curved back and a red cushion) at its ends; two futons laid side by side with
//            pillows, white duvets with border bands, and a folded yukata with a red obi on each; a square paper andon
//            on the +X side between the futons and the shoji.
// Proportions (real size, base unit the mat 1.82 x 0.91): room 3.64 x 3.64 inside (eight mats), tatami top 0.05,
//   kamoi 1.80, top of the plaster 2.48 (= meta.height); hiroen 1.0 deep, window 0.55-2.05; tokonoma 1.22 wide,
//   0.6 deep, board 0.15; table 1.1 x 0.7 at 0.35; zaisu 0.46 square, back 0.42; futon 0.95 x 1.85; andon 0.28 square,
//   0.72 tall; TV 0.64 x 0.40 on a 0.40 cabinet; cane chairs seat 0.40, back 0.95.
// Options: build(THREE, kit, colors, { height = 2.48, night = false }).
//   height  scales the whole set so the plaster top is `height`.
//   night   the andon glows (flat practical, threshold -0.25), the window glass goes dark (hair), the ridge turns
//           iris against it and a moon (practical) rises; the lit maple stays red.
// Colours (noon, the warm wood and paper script): tatami and cane sky #f2d7ae / skin #f0c2ae; heri, TV and ink marks
//   hair #241c16 (flat); wood iris #5c3d32 / hair; trim (kumiko, board lines, screen) iris flat; plaster moon #fff6e4 /
//   sky; shoji paper practical #fffaf2 / sclera #f6f3ee; futon moon / sclera with skin bands; yukata sky / skin with
//   iris pattern; cushions, obi, camellias, seal and maple accent #c4452d / iris; teaware and scroll moon / sclera;
//   window glass moon by day, hair at night; ridge skin by day, iris at night; andon paper sky / skin by day (unlit),
//   practical glowing at night, with a practical pool of light on the tatami around it.
// Meshes: 14, one per material. 3.8k triangles. Joints: anchors floor, table, seatA, seatB, futonA, futonB, nook,
//   chairA, chairB, tokonoma, tv, lamp.

export const meta = {
  name: "ryokan-room",
  height: 2.48,
  script: "noon",
  colors: {
    tatami: "#f2d7ae", tatamiShade: "#f0c2ae",
    dark: "#241c16",
    weave: "#f0c2ae",
    wood: "#5c3d32", woodShade: "#241c16",
    trim: "#5c3d32",
    plaster: "#fff6e4", plasterShade: "#f2d7ae",
    paper: "#fffaf2", paperShade: "#f6f3ee",
    futon: "#fff6e4", futonShade: "#f6f3ee",
    yukata: "#f2d7ae", yukataShade: "#f0c2ae",
    red: "#c4452d", redShade: "#5c3d32",
    ceramic: "#fff6e4", ceramicShade: "#f6f3ee",
    glass: "#fff6e4", glassNight: "#241c16",
    ridge: "#f0c2ae", ridgeNight: "#5c3d32",
    lamp: "#f2d7ae", lampShade: "#f0c2ae", lampGlow: "#fffaf2",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height, night = false } = opts;
  const c = { ...meta.colors, ...colors };
  const root = new THREE.Group();
  root.name = "ryokan-room";
  const set = new THREE.Group(); // uniform size scale lives here
  set.name = "room";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  function tri(key, a, b, e, ref) {
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-10) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    S(key).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, x0, x1, y0, y1, z0, z1) {
    if (x0 > x1) [x0, x1] = [x1, x0];
    if (z0 > z1) [z0, z1] = [z1, z0];
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // a cushion: bottom rect at y0 inset i0, widest at ym, top at y1 inset i1
  function pillow(key, cx, cz, sx, sz, y0, ym, y1, i0, i1) {
    const R = (y, i) => [[cx - sx / 2 + i, y, cz - sz / 2 + i], [cx + sx / 2 - i, y, cz - sz / 2 + i], [cx + sx / 2 - i, y, cz + sz / 2 - i], [cx - sx / 2 + i, y, cz + sz / 2 - i]];
    hex(key, [...R(y0, i0), ...R(ym, 0)]);
    hex(key, [...R(ym, 0), ...R(y1, i1)]);
  }
  // surface of revolution about (cx, cz): profile [[r, y], ...] from the bottom centre to the top centre
  function lathe(key, prof, cx, cz, n = 16) {
    const ym = prof.reduce((s, p) => s + p[1], 0) / prof.length;
    const ref = [cx, ym, cz];
    const P = (p, j) => { const a = (j / n) * Math.PI * 2; return [cx + p[0] * Math.cos(a), p[1], cz + p[0] * Math.sin(a)]; };
    for (let i = 0; i + 1 < prof.length; i++)
      for (let j = 0; j < n; j++) {
        const yr = [cx, (prof[i][1] + prof[i + 1][1]) / 2, cz];
        const r = Math.abs(prof[i][1] - prof[i + 1][1]) < 1e-6 ? ref : yr;
        const cap = prof[i][0] < 1e-6 || prof[i + 1][0] < 1e-6;
        quad(key, P(prof[i], j), P(prof[i], j + 1), P(prof[i + 1], j + 1), P(prof[i + 1], j), cap ? ref : r);
      }
  }
  // tapered polygon tube along a polyline, closed at both ends
  function tube(key, pts, rad, n = 5) {
    const rings = pts.map((p, i) => {
      const d = nrm(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
      const up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
      const e1 = nrm(cross(d, up)), e2 = cross(e1, d), r = rad(i / (pts.length - 1));
      return Array.from({ length: n }, (_, j) => {
        const t = (j / n) * Math.PI * 2;
        return [0, 1, 2].map((k) => p[k] + r * (Math.cos(t) * e1[k] + Math.sin(t) * e2[k]));
      });
    });
    for (let i = 0; i + 1 < pts.length; i++) {
      const ref = pts[i].map((v, k) => (v + pts[i + 1][k]) / 2);
      for (let j = 0; j < n; j++) quad(key, rings[i][j], rings[i][(j + 1) % n], rings[i + 1][(j + 1) % n], rings[i + 1][j], ref);
    }
    const a = pts[0], b = pts[pts.length - 1], L = rings.length - 1;
    const ra = pts[1].map((v, k) => (v + a[k]) / 2), rb = pts[L - 1].map((v, k) => (v + b[k]) / 2);
    for (let j = 0; j < n; j++) {
      tri(key, a, rings[0][j], rings[0][(j + 1) % n], ra);
      tri(key, b, rings[L][j], rings[L][(j + 1) % n], rb);
    }
  }
  // flat shapes on a plane: W(u, v) maps plane coordinates to world, back(u, v) is a point behind the plane
  const wallZ = (z, s = 1) => ({ W: (u, v) => [u, v, z], back: (u, v) => [u, v, z - s] }); // facing +Z
  const wallX = (x, s = 1) => ({ W: (u, v) => [x, v, u], back: (u, v) => [x - s, v, u] }); // facing +X
  const flat = (y) => ({ W: (u, v) => [u, y, v], back: (u, v) => [u, y - 1, v] }); // facing up, u = x, v = z
  function rect(key, P, u0, u1, v0, v1) {
    quad(key, P.W(u0, v0), P.W(u1, v0), P.W(u1, v1), P.W(u0, v1), P.back((u0 + u1) / 2, (v0 + v1) / 2));
  }
  function fan(key, P, poly) {
    const cu = poly.reduce((s, p) => s + p[0], 0) / poly.length, cv = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      tri(key, P.W(cu, cv), P.W(a[0], a[1]), P.W(b[0], b[1]), P.back(cu, cv));
    }
  }
  function ribbon(key, P, path, w) {
    const side = path.map((p, i) => {
      const q = path[Math.min(i + 1, path.length - 1)], o = path[Math.max(i - 1, 0)];
      const d = nrm([q[0] - o[0], q[1] - o[1], 0]), h = w(i / (path.length - 1)) / 2;
      return [[p[0] - d[1] * h, p[1] + d[0] * h], [p[0] + d[1] * h, p[1] - d[0] * h]];
    });
    for (let i = 0; i + 1 < path.length; i++) {
      const [a, b] = side[i], [e, d] = side[i + 1];
      quad(key, P.W(...a), P.W(...b), P.W(...d), P.W(...e), P.back(...path[i]));
    }
  }
  const disc = (u, v, r, n = 10, sy = 1) => Array.from({ length: n }, (_, i) => [u + r * Math.cos((i / n) * 2 * Math.PI), v + sy * r * Math.sin((i / n) * 2 * Math.PI)]);

  // ---------- dimensions ----------
  const X1 = 1.82, Z1 = 1.82, T = 0.1, FT = 0.05, TOP = 2.48;
  const KAMOI = 1.8, KH = 0.06, NAG = 1.92, NAGH = 0.08;
  const NZ = -Z1 - T, NZ1 = NZ - 1.0; // hiroen from the shoji wall back to the window wall
  const TK = { z0: -Z1, z1: -0.6, x0: -X1 - 0.6, y: 0.15 }; // tokonoma recess in the -X wall
  const TBL = { x: 0, z: -0.95, sx: 1.1, sz: 0.7, y: 0.35 };

  // ---------- tatami: 4 x 4 half-mat cells (col along +X, row along +Z), T-junctions only ----------
  const H = 0.91;
  const MATS = [[0, 2, 0, 1], [2, 4, 0, 1], [0, 1, 1, 3], [1, 3, 1, 2], [1, 3, 2, 3], [3, 4, 1, 3], [0, 2, 3, 4], [2, 4, 3, 4]]
    .map(([a, b, r0, r1]) => [-X1 + a * H, -X1 + b * H, -Z1 + r0 * H, -Z1 + r1 * H]);
  const HERI = 0.038, g = 0.0015;
  for (const [x0, x1, z0, z1] of MATS) {
    box("tatami", x0 + g, x1 - g, 0, FT, z0 + g, z1 - g);
    const top = flat(FT + 0.0012), wv = flat(FT + 0.0008);
    if (x1 - x0 > z1 - z0) {
      for (let z = z0 + HERI + 0.06; z < z1 - HERI - 0.04; z += 0.07) rect("weave", wv, x0 + 0.01, x1 - 0.01, z - 0.003, z + 0.003);
      rect("dark", top, x0 + g, x1 - g, z0 + g, z0 + g + HERI);
      rect("dark", top, x0 + g, x1 - g, z1 - g - HERI, z1 - g);
    } else {
      for (let x = x0 + HERI + 0.06; x < x1 - HERI - 0.04; x += 0.07) rect("weave", wv, x - 0.003, x + 0.003, z0 + 0.01, z1 - 0.01);
      rect("dark", top, x0 + g, x0 + g + HERI, z0 + g, z1 - g);
      rect("dark", top, x1 - g - HERI, x1 - g, z0 + g, z1 - g);
    }
  }

  // ---------- posts ----------
  const post = (x, z, y1 = TOP) => box("wood", x - 0.06, x + 0.06, 0, y1, z - 0.06, z + 0.06);
  post(-X1 - 0.05, -Z1 - 0.05); post(X1 + 0.05, -Z1 - 0.05); post(-X1 - 0.05, Z1 + 0.05); post(-X1 - 0.05, TK.z1);
  post(-X1 - 0.05, NZ1 - 0.05); post(X1 + 0.05, NZ1 - 0.05);

  // ---------- -Z wall: shoji, the middle two slid over the end ones ----------
  box("wood", -X1, X1, 0, FT, -Z1 - T, -Z1); // shikii
  box("wood", -X1, X1, KAMOI, KAMOI + KH, -Z1 - T, -Z1); // kamoi
  box("plaster", -X1, X1, KAMOI + KH, TOP, -Z1 - T, -Z1);
  box("wood", -X1, X1, NAG, NAG + NAGH, -Z1, -Z1 + 0.03); // nageshi
  const SW = (2 * X1) / 4 + 0.03;
  function shoji(xc, zc) {
    const y0 = FT, y1 = KAMOI, h = 0.03, st = 0.035, koshi = 0.24;
    const xa = xc - SW / 2, xb = xc + SW / 2;
    box("wood", xa, xb, y0, y0 + koshi, zc - h / 2, zc + h / 2);
    box("wood", xa, xb, y1 - 0.04, y1, zc - h / 2, zc + h / 2);
    box("wood", xa, xa + st, y0 + koshi, y1 - 0.04, zc - h / 2, zc + h / 2);
    box("wood", xb - st, xb, y0 + koshi, y1 - 0.04, zc - h / 2, zc + h / 2);
    box("paper", xa + st, xb - st, y0 + koshi, y1 - 0.04, zc - 0.002, zc + 0.002);
    const P = wallZ(zc + 0.006), pv0 = y0 + koshi, pv1 = y1 - 0.04, pu0 = xa + st, pu1 = xb - st, k = 0.007;
    for (let i = 1; i <= 2; i++) { const u = pu0 + (i * (pu1 - pu0)) / 3; rect("trim", P, u - k, u + k, pv0, pv1); }
    for (let j = 1; j <= 6; j++) { const v = pv0 + (j * (pv1 - pv0)) / 7; rect("trim", P, pu0, pu1, v - k, v + k); }
  }
  const OUT = -Z1 - 0.075, IN = -Z1 - 0.035;
  shoji(-X1 + SW / 2, OUT); shoji(X1 - SW / 2, OUT);
  shoji(-X1 + SW / 2 + 0.05, IN); shoji(X1 - SW / 2 - 0.05, IN);

  // ---------- hiroen: floor, side wall, window wall ----------
  box("wood", -X1 - T, X1 + T, 0, 0.03, NZ1, NZ);
  for (let z = NZ1 + 0.14; z < NZ - 0.05; z += 0.14) rect("trim", flat(0.0315), -X1 - T, X1 + T, z - 0.004, z + 0.004);
  box("plaster", -X1 - T, -X1, 0, TOP, NZ1, NZ); // side wall
  const WY0 = 0.55, WY1 = 2.05, WX = X1 - 0.08;
  box("plaster", -X1 - T, X1 + T, 0, WY0, NZ1 - T, NZ1);
  box("plaster", -X1 - T, X1 + T, WY1, TOP, NZ1 - T, NZ1);
  box("wood", -X1, X1 + 0.06, WY0 - 0.05, WY0, NZ1 - T, NZ1 + 0.06); // sill
  box("wood", -X1, X1 + 0.06, WY1, WY1 + 0.06, NZ1 - T, NZ1 + 0.03); // head
  for (const x of [-X1 + 0.04, X1 - 0.02]) box("wood", x - 0.04, x + 0.04, WY0, WY1, NZ1 - T, NZ1 + 0.03); // jambs
  for (const x of [-0.6, 0.6]) box("wood", x - 0.035, x + 0.035, WY0, WY1, NZ1 - 0.06, NZ1 + 0.03); // mullions
  box("wood", -X1, X1, 1.66, 1.70, NZ1 - 0.06, NZ1 + 0.02); // transom bar
  // the view: glass, a mountain ridge, a maple (flat shapes on the glass plane)
  rect("glass", wallZ(NZ1 - 0.05), -WX, WX, WY0, WY1);
  const GV = wallZ(NZ1 - 0.045), GV2 = wallZ(NZ1 - 0.04);
  const ridge = [[-WX, 1.12], [-1.3, 1.3], [-0.85, 1.5], [-0.45, 1.36], [-0.1, 1.42], [0.35, 1.22], [0.9, 1.3], [1.35, 1.18], [WX, 1.08]];
  for (let i = 0; i + 1 < ridge.length; i++) {
    const [u0, v0] = ridge[i], [u1, v1] = ridge[i + 1];
    quad("ridge", GV.W(u0, WY0), GV.W(u1, WY0), GV.W(u1, v1), GV.W(u0, v0), GV.back(u0, WY0));
  }
  // maple: trunk and branches to the right, a crown of red leaf clusters
  ribbon("dark", GV2, [[1.15, WY0], [1.12, 0.85], [1.05, 1.1], [0.95, 1.32]], (t) => 0.07 - 0.04 * t);
  ribbon("dark", GV2, [[1.12, 0.95], [1.3, 1.15], [1.45, 1.28]], (t) => 0.035 - 0.02 * t);
  const GV3 = wallZ(NZ1 - 0.035);
  for (const [u, v, r] of [[0.95, 1.42, 0.2], [1.25, 1.5, 0.22], [1.55, 1.36, 0.18], [0.72, 1.28, 0.15], [1.4, 1.75, 0.17], [1.05, 1.72, 0.16], [1.65, 1.62, 0.12]])
    fan("red", GV3, disc(u, v, r, 9, 0.8));
  if (night) fan("lamp", GV, disc(-1.15, 1.82, 0.09, 14));

  // ---------- hiroen furniture: two cane chairs and a round table ----------
  const RT = { x: 0, z: (NZ + NZ1) / 2 - 0.05 };
  lathe("wood", [[0, 0.52], [0.3, 0.52], [0.31, 0.535], [0.3, 0.55], [0, 0.55]], RT.x, RT.z, 22);
  lathe("wood", [[0, 0.03], [0.17, 0.03], [0.17, 0.05], [0.04, 0.07], [0.035, 0.52], [0, 0.52]], RT.x, RT.z, 10);
  // chair at (cx, cz) facing -s X (s = +1: the chair on the +X side looks toward -X)
  function caneChair(cx, cz, s) {
    const W = 0.56, D = 0.56, SY = 0.4, w2 = W / 2, d2 = D / 2;
    const X = (a) => cx + s * a; // a: + toward the back of the chair
    for (const a of [-d2 + 0.03, d2 - 0.03]) for (const b of [-w2 + 0.03, w2 - 0.03]) // legs
      box("wood", X(a) - 0.025, X(a) + 0.025, 0.03, SY, cz + b - 0.025, cz + b + 0.025);
    box("wood", X(-d2), X(d2), SY - 0.06, SY, cz - w2, cz + w2); // seat rail
    pillow("tatami", X(0), cz, D - 0.06, W - 0.06, SY, SY + 0.04, SY + 0.08, 0.0, 0.03); // cane seat
    // back: a slanted cane panel in a wood frame
    const ba = d2 - 0.02, bt = d2 + 0.12, BY = 0.95;
    hex("tatami", [[X(ba - 0.05), SY, cz - w2 + 0.04], [X(ba), SY, cz - w2 + 0.04], [X(ba), SY, cz + w2 - 0.04], [X(ba - 0.05), SY, cz + w2 - 0.04],
      [X(bt - 0.05), BY, cz - w2 + 0.04], [X(bt), BY, cz - w2 + 0.04], [X(bt), BY, cz + w2 - 0.04], [X(bt - 0.05), BY, cz + w2 - 0.04]]);
    for (const b of [-w2 + 0.03, w2 - 0.03]) tube("wood", [[X(ba - 0.02), SY - 0.05, cz + b], [X(bt - 0.02), BY + 0.03, cz + b]], () => 0.025, 6);
    tube("wood", [[X(bt - 0.02), BY + 0.02, cz - w2 + 0.02], [X(bt - 0.02), BY + 0.02, cz + w2 - 0.02]], () => 0.028, 6);
    // weave: a few horizontal bands on the back's front face
    for (let k = 1; k <= 4; k++) {
      const t = k / 5, y = SY + t * (BY - SY), a = ba - 0.05 + t * (bt - ba) - 0.004;
      box("weave", X(a) - 0.003, X(a) + 0.003, y - 0.008, y + 0.008, cz - w2 + 0.06, cz + w2 - 0.06);
    }
    // arms: posts and a rounded rail
    for (const b of [-w2, w2]) {
      tube("wood", [[X(-d2 + 0.05), SY, cz + b], [X(-d2 + 0.05), 0.62, cz + b]], () => 0.022, 6);
      tube("wood", [[X(-d2 + 0.0), 0.62, cz + b], [X(ba + 0.04), 0.66, cz + b]], () => 0.028, 6);
    }
  }
  caneChair(0.66, RT.z, 1);
  caneChair(-0.66, RT.z, -1);

  // ---------- -X wall: tokonoma, TV, fusuma ----------
  box("wood", -X1 - T, -X1, 0, FT, TK.z1, Z1); // sill
  box("wood", -X1 - T, -X1, KAMOI, KAMOI + KH, TK.z1, Z1); // kamoi
  box("plaster", -X1 - T, -X1, KAMOI + KH, TOP, TK.z1, Z1);
  box("plaster", -X1 - T, -X1, FT, KAMOI, TK.z1, 0.8); // plaster where the TV stands
  box("wood", -X1, -X1 + 0.03, NAG, NAG + NAGH, -Z1, Z1); // nageshi
  // fusuma pair (oshiire): plain pale panels, dark frames, round pulls
  {
    const z0 = 0.8, z1 = Z1, pw = (z1 - z0) / 2 + 0.015, th = 0.02;
    for (const [a, b, xc] of [[z0, z0 + pw, -X1 - 0.065], [z1 - pw, z1, -X1 - 0.035]]) {
      box("yukata", xc - th / 2, xc + th / 2, FT, KAMOI, a, b);
      const P = wallX(xc + th / 2 + 0.001), P2 = wallX(xc + th / 2 + 0.002), f = 0.022;
      rect("dark", P, a, b, FT, FT + f); rect("dark", P, a, b, KAMOI - f, KAMOI);
      rect("dark", P, a, a + f, FT, KAMOI); rect("dark", P, b - f, b, FT, KAMOI);
      fan("dark", P2, disc(a === z0 ? b - 0.09 : a + 0.09, 0.86, 0.03));
    }
  }
  // tokonoma
  box("wood", TK.x0, -X1, 0, TK.y, TK.z0, TK.z1); // toko-ita
  rect("dark", wallX(-X1 + 0.001), TK.z0, TK.z1, TK.y - 0.05, TK.y); // toko-gamachi
  box("wood", -X1 - 0.03, -X1, 1.86, 1.94, TK.z0, TK.z1); // otoshigake
  box("plaster", -X1 - T, -X1, 1.94, TOP, TK.z0, TK.z1);
  box("plaster", TK.x0 - T, TK.x0, 0, TOP, TK.z0 - 0.0, TK.z1); // alcove back
  box("plaster", TK.x0 - T, -X1, 0, TOP, TK.z0 - T, TK.z0); // alcove sides
  box("plaster", TK.x0 - T, -X1 - 0.06, 0, TOP, TK.z1, TK.z1 + T);
  // abstract scroll: three tapering strokes and a red seal
  const SZ = (TK.z0 + TK.z1) / 2 - 0.12, SP = wallX(TK.x0 + 0.009);
  box("wood", TK.x0, TK.x0 + 0.006, 0.44, 1.74, SZ - 0.22, SZ + 0.22);
  rect("ceramic", wallX(TK.x0 + 0.0075), SZ - 0.16, SZ + 0.16, 0.62, 1.56);
  ribbon("dark", SP, [[SZ - 0.07, 1.46], [SZ - 0.05, 1.25], [SZ - 0.08, 1.02], [SZ - 0.04, 0.8]], (t) => 0.035 - 0.025 * t);
  ribbon("dark", SP, [[SZ + 0.02, 1.38], [SZ + 0.05, 1.2], [SZ + 0.03, 1.06]], (t) => 0.028 - 0.018 * t);
  ribbon("dark", SP, [[SZ - 0.1, 1.33], [SZ, 1.3], [SZ + 0.1, 1.34]], (t) => 0.02 - 0.012 * t);
  rect("red", wallX(TK.x0 + 0.01), SZ + 0.07, SZ + 0.11, 0.72, 0.76);
  box("dark", TK.x0, TK.x0 + 0.02, 1.73, 1.76, SZ - 0.24, SZ + 0.24);
  box("dark", TK.x0 + 0.002, TK.x0 + 0.03, 0.42, 0.455, SZ - 0.25, SZ + 0.25);
  ribbon("dark", wallX(TK.x0 + 0.004), [[SZ - 0.2, 1.75], [SZ, 1.95], [SZ + 0.2, 1.75]], () => 0.008);
  // vase with camellias
  const VX = TK.x0 + 0.3, VZ = TK.z1 - 0.25;
  lathe("ceramic", [[0, TK.y], [0.055, TK.y], [0.07, TK.y + 0.08], [0.05, TK.y + 0.2], [0.035, TK.y + 0.24], [0.045, TK.y + 0.26], [0, TK.y + 0.26]], VX, VZ, 12);
  const st = (pts, r0) => tube("wood", pts.map(([x, y, z]) => [VX + x, TK.y + y, VZ + z]), (t) => r0 * (1 - 0.6 * t) + 0.002, 5);
  st([[0, 0.22, 0], [0.02, 0.38, -0.02], [0.05, 0.5, -0.06], [0.06, 0.6, -0.12]], 0.008);
  st([[0, 0.24, 0], [-0.01, 0.4, 0.04], [0.02, 0.5, 0.1]], 0.006);
  for (const [x, y, z, r] of [[0.06, 0.62, -0.12, 0.035], [0.02, 0.52, 0.1, 0.032], [0.05, 0.46, -0.04, 0.026]])
    lathe("red", [[0, -r * 0.5], [r * 0.9, -r * 0.3], [r, r * 0.1], [r * 0.6, r * 0.5], [0, r * 0.35]].map(([a, b]) => [a, TK.y + y + b]), VX + x, VZ + z, 8);
  for (const [x, y, z] of [[0.04, 0.56, -0.15], [-0.02, 0.44, 0.07], [0.08, 0.42, -0.02]]) // leaves
    lathe("wood", [[0, -0.012], [0.024, 0], [0, 0.012]].map(([a, b]) => [a, TK.y + y + b]), VX + x, VZ + z, 5);

  // TV on a low cabinet against the plaster, screen facing +X
  const TVZ = 0.38;
  box("wood", -X1, -X1 + 0.4, 0.06, 0.42, TVZ - 0.38, TVZ + 0.38);
  rect("dark", wallX(-X1 + 0.401), TVZ - 0.002, TVZ + 0.002, 0.1, 0.38); // door split
  for (const z of [TVZ - 0.06, TVZ + 0.06]) fan("dark", wallX(-X1 + 0.402), disc(z, 0.3, 0.012, 6));
  box("dark", -X1 + 0.12, -X1 + 0.28, 0.42, 0.44, TVZ - 0.12, TVZ + 0.12); // foot
  box("dark", -X1 + 0.18, -X1 + 0.22, 0.44, 0.52, TVZ - 0.03, TVZ + 0.03); // neck
  box("dark", -X1 + 0.17, -X1 + 0.22, 0.5, 0.9, TVZ - 0.32, TVZ + 0.32); // casing
  rect("trim", wallX(-X1 + 0.2205), TVZ - 0.3, TVZ + 0.3, 0.53, 0.88); // screen
  ribbon("ceramic", wallX(-X1 + 0.221), [[TVZ + 0.08, 0.56], [TVZ + 0.26, 0.82]], () => 0.025); // glint

  // ---------- low table, tea set, sweets ----------
  const TY = TBL.y + 0.03;
  box("wood", TBL.x - TBL.sx / 2, TBL.x + TBL.sx / 2, TBL.y, TY, TBL.z - TBL.sz / 2, TBL.z + TBL.sz / 2);
  box("wood", TBL.x - TBL.sx / 2 + 0.04, TBL.x + TBL.sx / 2 - 0.04, TBL.y - 0.05, TBL.y, TBL.z - TBL.sz / 2 + 0.04, TBL.z + TBL.sz / 2 - 0.04);
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    box("wood", TBL.x + sx * (TBL.sx / 2 - 0.08) - 0.03, TBL.x + sx * (TBL.sx / 2 - 0.08) + 0.03, FT, TBL.y, TBL.z + sz * (TBL.sz / 2 - 0.08) - 0.03, TBL.z + sz * (TBL.sz / 2 - 0.08) + 0.03);
  // round tray with teapot, two cups and a tea caddy
  const TRX = TBL.x - 0.18, TRZ = TBL.z - 0.05;
  lathe("dark", [[0, TY], [0.2, TY], [0.21, TY + 0.02], [0.19, TY + 0.02], [0.19, TY + 0.008], [0, TY + 0.008]], TRX, TRZ, 20);
  const T2 = TY + 0.008;
  lathe("wood", [[0, T2], [0.05, T2], [0.075, T2 + 0.045], [0.06, T2 + 0.09], [0.02, T2 + 0.1], [0.014, T2 + 0.118], [0, T2 + 0.118]], TRX - 0.06, TRZ - 0.06, 12);
  tube("wood", [[TRX - 0.0, T2 + 0.05, TRZ - 0.04], [TRX + 0.05, T2 + 0.085, TRZ - 0.02]], (t) => 0.013 - 0.006 * t, 5);
  tube("wood", [[TRX - 0.06, T2 + 0.06, TRZ - 0.06], [TRX - 0.06, T2 + 0.07, TRZ - 0.14]], () => 0.012, 5); // side handle
  for (const [dx, dz] of [[0.09, 0.08], [-0.07, 0.11]])
    lathe("ceramic", [[0, T2], [0.026, T2], [0.036, T2 + 0.065], [0, T2 + 0.065]], TRX + dx, TRZ + dz, 10);
  lathe("red", [[0, T2], [0.035, T2], [0.035, T2 + 0.11], [0, T2 + 0.11]], TRX + 0.1, TRZ - 0.08, 10); // tea caddy
  // sweets plate with two manju
  const PX = TBL.x + 0.25, PZ = TBL.z + 0.08;
  lathe("ceramic", [[0, TY], [0.06, TY], [0.11, TY + 0.018], [0, TY + 0.018]], PX, PZ, 16);
  for (const [dx, dz] of [[-0.035, 0.0], [0.04, -0.02]])
    lathe("tatami", [[0, TY + 0.016], [0.035, TY + 0.016], [0.036, TY + 0.03], [0.022, TY + 0.048], [0, TY + 0.052]], PX + dx, PZ + dz, 10);

  // ---------- zaisu at the table ends, facing in ----------
  function zaisu(cx, cz, s) { // s = +1: on the +X side, its back toward +X
    const X = (a) => cx + s * a, w = 0.23;
    hex("wood", [[X(-0.24), FT, cz - w], [X(0.2), FT, cz - w], [X(0.2), FT, cz + w], [X(-0.24), FT, cz + w],
      [X(-0.24), FT + 0.05, cz - w], [X(0.2), FT + 0.07, cz - w], [X(0.2), FT + 0.07, cz + w], [X(-0.24), FT + 0.05, cz + w]]);
    // backrest: a curved slab, leaning back
    const N = 6, BY = FT + 0.45;
    for (let i = 0; i < N; i++) {
      const b0 = -w + (2 * w * i) / N, b1 = -w + (2 * w * (i + 1)) / N;
      const bow = (b) => 0.05 * (1 - (b / w) ** 2);
      const P = (b, y, d) => { const t = (y - FT - 0.07) / (BY - FT - 0.07); return [X(0.17 + 0.12 * t + bow(b) + d), y, cz + b]; };
      hex("wood", [P(b0, FT + 0.07, 0), P(b0, FT + 0.07, 0.035), P(b1, FT + 0.07, 0.035), P(b1, FT + 0.07, 0),
        P(b0, BY, 0), P(b0, BY, 0.035), P(b1, BY, 0.035), P(b1, BY, 0)]);
    }
    pillow("red", X(-0.04), cz, 0.4, 0.42, FT + 0.065, FT + 0.09, FT + 0.12, 0.01, 0.05);
  }
  zaisu(TBL.x + 0.82, TBL.z, 1);
  zaisu(TBL.x - 0.82, TBL.z, -1);

  // ---------- two futons, heads toward the table ----------
  const FZ0 = -0.12, FZ1 = 1.73, FW = 0.95;
  const futonX = [-0.56, 0.56];
  for (const fx of futonX) {
    pillow("futon", fx, (FZ0 + FZ1) / 2, FW, FZ1 - FZ0, FT, FT + 0.04, FT + 0.07, 0.01, 0.03); // shikibuton
    const DZ0 = FZ0 + 0.42, DZ1 = FZ1 + 0.03, DY = FT + 0.07;
    pillow("futon", fx, (DZ0 + DZ1) / 2, FW + 0.04, DZ1 - DZ0, DY - 0.01, DY + 0.06, DY + 0.12, 0.0, 0.05); // kakebuton
    const top = flat(DY + 0.1205);
    rect("weave", top, fx - FW / 2 + 0.06, fx + FW / 2 - 0.06, DZ0 + 0.06, DZ0 + 0.1); // border band
    rect("weave", top, fx - FW / 2 + 0.06, fx + FW / 2 - 0.06, DZ1 - 0.1, DZ1 - 0.06);
    pillow("futon", fx, FZ0 + 0.2, 0.5, 0.3, FT + 0.065, FT + 0.11, FT + 0.15, 0.01, 0.06); // makura
    // folded yukata with a red obi, on the duvet near the head
    const YZ = DZ0 + 0.32, YY = DY + 0.12;
    box("yukata", fx - 0.17, fx + 0.17, YY - 0.005, YY + 0.04, YZ - 0.2, YZ + 0.2);
    const yp = flat(YY + 0.0405);
    rect("trim", yp, fx - 0.17, fx - 0.06, YZ - 0.2, YZ - 0.12); // collar fold
    for (const [u, v] of [[-0.05, -0.05], [0.08, 0.02], [-0.1, 0.12], [0.06, 0.15], [0.11, -0.12], [-0.02, 0.06]])
      fan("trim", yp, disc(fx + u, YZ + v, 0.018, 6));
    box("red", fx - 0.17, fx + 0.17, YY + 0.04, YY + 0.055, YZ + 0.02, YZ + 0.08);
  }

  // ---------- andon: square paper lamp on the +X side, between the futons and the shoji ----------
  const AX = X1 - 0.34, AZ = -0.5, AW = 0.14, AY0 = FT + 0.14, AY1 = FT + 0.68;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box("wood", AX + sx * AW - 0.015, AX + sx * AW + 0.015, FT, AY1 + 0.02, AZ + sz * AW - 0.015, AZ + sz * AW + 0.015);
  for (const sz of [-1, 1]) box("wood", AX - AW - 0.02, AX + AW + 0.02, AY1, AY1 + 0.02, AZ + sz * AW - 0.02, AZ + sz * AW + 0.02); // open top rim
  for (const sx of [-1, 1]) box("wood", AX + sx * AW - 0.02, AX + sx * AW + 0.02, AY1, AY1 + 0.02, AZ - AW + 0.02, AZ + AW - 0.02);
  box("wood", AX - AW - 0.02, AX + AW + 0.02, AY0 - 0.02, AY0, AZ - AW - 0.02, AZ + AW + 0.02);
  box("lamp", AX - AW + 0.005, AX + AW - 0.005, AY0, AY1, AZ - AW + 0.005, AZ + AW - 0.005);
  for (const [P, u] of [[wallX(AX + AW - 0.003), AZ], [wallZ(AZ + AW - 0.003), AX]]) // frame bar across the paper
    rect("trim", P, u - AW, u + AW, (AY0 + AY1) / 2 - 0.008, (AY0 + AY1) / 2 + 0.008);
  if (night) fan("lamp", flat(FT + 0.002), disc(AX, AZ, 0.42, 18)); // pool of lamplight on the tatami

  // ---------- meshes ----------
  const MAT = {
    tatami: [c.tatami, c.tatamiShade, 0.1, 2.5],
    dark: [c.dark, c.dark, 0.1, 0],
    weave: [c.weave, c.weave, 0.1, 0],
    wood: [c.wood, c.woodShade, 0.1, 2.5],
    trim: [c.trim, c.trim, 0.1, 0],
    plaster: [c.plaster, c.plasterShade, 0.1, 3],
    paper: [c.paper, c.paperShade, 0.0, 0],
    futon: [c.futon, c.futonShade, 0.1, 2.5],
    yukata: [c.yukata, c.yukataShade, 0.1, 2],
    red: [c.red, c.redShade, 0.2, 2],
    ceramic: [c.ceramic, c.ceramicShade, 0.1, 1.5],
    glass: night ? [c.glassNight, c.glassNight, 0.1, 0] : [c.glass, c.glass, 0.1, 0],
    ridge: night ? [c.ridgeNight, c.ridgeNight, 0.1, 0] : [c.ridge, c.ridge, 0.1, 0],
    lamp: night ? [c.lampGlow, c.lampGlow, -0.25, 2.5] : [c.lamp, c.lampShade, 0.1, 2.5],
  };
  for (const [key, arr] of Object.entries(soups)) {
    const gm = new THREE.BufferGeometry();
    gm.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    gm.computeVertexNormals();
    const [base, shade, threshold, px] = MAT[key];
    const mesh = kit.toon(gm, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    set.add(mesh);
  }
  // anchors for placing figures and cameras
  const anchor = (name, x, y, z) => { const a = new THREE.Group(); a.name = name; a.position.set(x, y, z); set.add(a); joints[name] = a; };
  anchor("floor", 0, FT, 0);
  anchor("table", TBL.x, TY, TBL.z);
  anchor("seatA", TBL.x + 0.82, FT + 0.12, TBL.z);
  anchor("seatB", TBL.x - 0.82, FT + 0.12, TBL.z);
  anchor("futonA", futonX[0], FT + 0.19, (FZ0 + FZ1) / 2);
  anchor("futonB", futonX[1], FT + 0.19, (FZ0 + FZ1) / 2);
  anchor("nook", RT.x, 0.03, RT.z);
  anchor("chairA", 0.66, 0.48, RT.z);
  anchor("chairB", -0.66, 0.48, RT.z);
  anchor("tokonoma", (TK.x0 - X1) / 2, TK.y, (TK.z0 + TK.z1) / 2);
  anchor("tv", -X1 + 0.22, 0.7, TVZ);
  anchor("lamp", AX, (AY0 + AY1) / 2, AZ);

  function pose(name) {
    if (name !== "rest") throw new Error(`ryokan-room: unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
