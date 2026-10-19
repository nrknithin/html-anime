// washitsu.js - a six-mat Japanese tatami room: the quiet interior of every slice-of-life anime home, static set.
// Contract: harness/lab/README.md. Meters, +Y up, the room's open (cutaway) sides face +X and +Z so a camera in the
// lit front-left quadrant sees in; the -X wall is the shoji with the engawa beyond, the -Z wall holds the tokonoma
// (left) and a pair of fusuma (right). Stands on y = 0 (the tatami top is y = 0.05, joints.floor), centred on the room.
//
// Construction (boxes, lathes, polygon tubes, flat ribbons and fans, all triangle soups merged per material; flat
// shaded so mats and panels read crisp; every closed part is wound away from a point inside it, never by hand):
//   FLOOR    six tatami 1.82 x 0.91 x 0.05 in the six-mat layout (MATS: two mats along Z at the -X and +X ends of
//            the back half, two along X between them, two along X across the front; T-junctions only, never four
//            corners meeting), 3 mm seams, dark heri cloth on each mat's two long edges, faint rush lines along it.
//   WALLS    hashira posts at the corners and at the tokonoma, shikii sills, kamoi lintels at 1.80, a nageshi band at
//            1.92 and plaster above; mawaribuchi and a board ceiling with battens when closed. The -X wall is four
//            shoji (koshi board, paper, kumiko grid on the room side) on two tracks; the two middle ones are joints
//            (shojiA, shojiB) that slide over the end panels. The -Z wall right half: two fusuma, pale painted
//            paper with mist-cloud bands and a row of wave crests, dark lacquer frames and round pulls.
//   TOKONOMA a 0.6 m deep alcove left of the fusuma: raised wood platform with a dark front band, otoshigake
//            lintel, a hanging scroll (mounting, paper, one ensō brush stroke, rods, cord) and a small vase with a
//            branch carrying red blossoms.
//   PROPS    a round chabudai (lathe top, four legs), two zabuton facing each other across it, a round paper lamp on
//            a cord from the ceiling centre, the engawa deck (boards along it, outer posts and a beam) past the shoji.
// Proportions (real size, base unit the mat 1.82 x 0.91): room 3.64 x 2.73 inside, tatami top 0.05, ceiling 2.45
//   (top 2.48 = meta.height), kamoi 1.80-1.86, nageshi 1.92-2.00, walls 0.1 thick; tokonoma 1.75 wide, 0.6 deep,
//   platform 0.15; scroll 0.46 x 1.32; chabudai r 0.40 at 0.35; zabuton 0.55 x 0.60 x 0.09; lamp r 0.20 at 1.95;
//   engawa 0.9 deep.
// Options: build(THREE, kit, colors, { height, cutaway = true, shoji = 0, lamp = true }).
//   height  scales the whole set so the ceiling top is `height` (default 2.48).
//   cutaway leaves out the +X and +Z walls and the ceiling (true by default); false closes the room (a plain +X
//           wall, a fusuma pair in the +Z wall, the ceiling).
//   shoji   0..1 slides the two middle shoji over the end ones (1 opens the middle half onto the engawa). The panels
//           are joints, so a film may also move joints.shojiA / shojiB .position.z itself.
// Poses: rest (shoji from opts), open (shoji 1), closed (shoji 0).
// Colours (noon, the futon / kotatsu script): tatami sky #f2d7ae / skin #f0c2ae, heri and ink marks hair #241c16
//   (flat); wood iris #5c3d32 / hair; trim (kumiko, battens, board lines, waves) iris flat; plaster moon #fff6e4 /
//   sky; shoji paper practical #fffaf2 / sclera #f6f3ee; fusuma paper sky / skin with moon clouds; scroll and vase
//   moon / sclera; zabuton and blossoms accent #c4452d / iris; lamp practical (glow); ceiling boards sky / skin;
//   tatami rush lines skin (flat).
//   noon has no green, so the tatami is the warm sun-faded straw.
// Meshes: 14 (15 closed, with the ceiling): one per material, the two sliding shoji one mesh each with material
//   groups and a frame-only hull. 3.6k triangles (3.8k closed).
// Joints: shojiA, shojiB (the sliding panels) and anchors floor, table, seatA, seatB, tokonoma, engawa.

export const meta = {
  name: "washitsu",
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
    fusuma: "#f2d7ae", fusumaShade: "#f0c2ae",
    cloud: "#fff6e4",
    scroll: "#fff6e4", scrollShade: "#f6f3ee",
    red: "#c4452d", redShade: "#5c3d32",
    lamp: "#fffaf2",
    ceiling: "#f2d7ae", ceilingShade: "#f0c2ae",
  },
  poses: ["rest", "open", "closed"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height, cutaway = true, lamp = true } = opts;
  const shojiOpen = Math.min(1, Math.max(0, +(opts.shoji ?? 0) || 0));
  const c = { ...meta.colors, ...colors };
  const root = new THREE.Group();
  root.name = "washitsu";
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
  // a frustum cushion: bottom rect at y0 inset i0, widest at ym, top at y1 inset i1
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
        const r = Math.abs(prof[i][1] - prof[i + 1][1]) < 1e-6 ? ref : yr; // flat rings use the solid's centre
        const cap = prof[i][0] < 1e-6 || prof[i + 1][0] < 1e-6;
        quad(key, P(prof[i], j), P(prof[i], j + 1), P(prof[i + 1], j + 1), P(prof[i + 1], j), cap ? ref : r);
      }
  }
  // tapered polygon tube along a polyline, rad(t) for t in 0..1, closed at both ends
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
  // flat shapes on a wall plane: W(u, v) maps wall coordinates to world, `out` is a point in front of the plane
  const wallZ = (z, s = 1) => ({ W: (u, v) => [u, v, z], back: (u, v) => [u, v, z - s] }); // facing +Z (s = 1) or -Z
  const wallX = (x, s = 1) => ({ W: (u, v) => [x, v, u], back: (u, v) => [x - s, v, u] }); // facing +X (s = 1)
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
  // a ribbon along a wall-plane path [[u, v], ...] with width w(t)
  function ribbon(key, P, path, w) {
    const side = path.map((p, i) => {
      const q = path[Math.min(i + 1, path.length - 1)], o = path[Math.max(i - 1, 0)];
      const d = nrm([q[0] - o[0], q[1] - o[1], 0]), h = w(i / (path.length - 1)) / 2;
      return [[p[0] - d[1] * h, p[1] + d[0] * h], [p[0] + d[1] * h, p[1] - d[0] * h]];
    });
    for (let i = 0; i + 1 < path.length; i++) {
      const [a, b] = side[i], [e, d] = side[i + 1];
      const m = path[i];
      quad(key, P.W(...a), P.W(...b), P.W(...d), P.W(...e), P.back(...m));
    }
  }
  const disc = (u, v, r, n = 10) => Array.from({ length: n }, (_, i) => [u + r * Math.cos((i / n) * 2 * Math.PI), v + r * Math.sin((i / n) * 2 * Math.PI)]);
  const stadium = (u0, u1, v, h, n = 5) => {
    const r = h / 2, out = [];
    for (let k = 0; k <= n; k++) { const a = -Math.PI / 2 + (k / n) * Math.PI; out.push([u1 - r + r * Math.cos(a), v + r * Math.sin(a)]); }
    for (let k = 0; k <= n; k++) { const a = Math.PI / 2 + (k / n) * Math.PI; out.push([u0 + r + r * Math.cos(a), v + r * Math.sin(a)]); }
    return out;
  };

  // ---------- dimensions ----------
  const X1 = 1.82, Z1 = 1.365, T = 0.1, FT = 0.05, CEIL = 2.45, TOP = 2.48;
  const KAMOI = 1.8, KH = 0.06, NAG = 1.92, NAGH = 0.08;
  const TK = { x0: -X1, x1: -0.06, z0: -Z1 - 0.6, y: 0.15 }; // tokonoma recess
  const TBL = { x: 0.0, z: 0.45, r: 0.4, y: FT + 0.3 };

  // ---------- tatami ----------
  // [x0, x1, z0, z1]; the long axis is the longer side. T-junctions only (the auspicious six-mat layout).
  const MATS = [
    [-X1, -0.91, -Z1, 0.455], [-0.91, 0.91, -Z1, -0.455], [0.91, X1, -Z1, 0.455],
    [-0.91, 0.91, -0.455, 0.455], [-X1, 0, 0.455, Z1], [0, X1, 0.455, Z1],
  ];
  const HERI = 0.038, g = 0.0015;
  for (const [x0, x1, z0, z1] of MATS) {
    box("tatami", x0 + g, x1 - g, 0, FT, z0 + g, z1 - g);
    const top = { W: (u, v) => [u, FT + 0.0012, v], back: (u, v) => [u, 0, v] };
    const wv = { W: (u, v) => [u, FT + 0.0008, v], back: (u, v) => [u, 0, v] };
    if (x1 - x0 > z1 - z0) for (let z = z0 + HERI + 0.06; z < z1 - HERI - 0.04; z += 0.07) rect("weave", wv, x0 + 0.01, x1 - 0.01, z - 0.003, z + 0.003);
    else for (let x = x0 + HERI + 0.06; x < x1 - HERI - 0.04; x += 0.07) rect("weave", wv, x - 0.003, x + 0.003, z0 + 0.01, z1 - 0.01);
    if (x1 - x0 > z1 - z0) { // long along X: heri on the z edges
      quad("dark", top.W(x0 + g, z0 + g), top.W(x1 - g, z0 + g), top.W(x1 - g, z0 + g + HERI), top.W(x0 + g, z0 + g + HERI), top.back(x0, z0));
      quad("dark", top.W(x0 + g, z1 - g - HERI), top.W(x1 - g, z1 - g - HERI), top.W(x1 - g, z1 - g), top.W(x0 + g, z1 - g), top.back(x0, z1));
      for (const z of [z0 + g, z1 - g]) box("dark", x0 + g, x1 - g, FT - 0.03, FT + 0.001, z - 0.001, z + 0.001); // the heri wraps the edge
    } else {
      quad("dark", top.W(x0 + g, z0 + g), top.W(x0 + g + HERI, z0 + g), top.W(x0 + g + HERI, z1 - g), top.W(x0 + g, z1 - g), top.back(x0, z0));
      quad("dark", top.W(x1 - g - HERI, z0 + g), top.W(x1 - g, z0 + g), top.W(x1 - g, z1 - g), top.W(x1 - g - HERI, z1 - g), top.back(x1, z0));
      for (const x of [x0 + g, x1 - g]) box("dark", x - 0.001, x + 0.001, FT - 0.03, FT + 0.001, z0 + g, z1 - g);
    }
  }

  // ---------- posts, sills, lintels ----------
  const post = (x, z) => box("wood", x - 0.06, x + 0.06, 0, CEIL, z - 0.06, z + 0.06);
  post(-X1 - 0.05, -Z1 - 0.05); post(-X1 - 0.05, Z1 + 0.05); post(X1 + 0.05, -Z1 - 0.05); post(0, -Z1 - 0.05); // tokobashira at x 0
  if (!cutaway) post(X1 + 0.05, Z1 + 0.05);

  // ---------- -X wall: shoji ----------
  box("wood", -X1 - T, -X1, 0, FT, -Z1, Z1); // shikii
  box("wood", -X1 - T, -X1, KAMOI, KAMOI + KH, -Z1, Z1); // kamoi
  box("plaster", -X1 - T, -X1, KAMOI + KH, TOP, -Z1, Z1);
  box("wood", -X1, -X1 + 0.03, NAG, NAG + NAGH, -Z1, Z1); // nageshi
  const SW = (2 * Z1) / 4 + 0.03, SSTEP = (2 * Z1 - SW) / 3;
  const panelZ = (i) => -Z1 + SW / 2 + i * SSTEP;
  // one shoji panel centred at (xc, zc), written into soups with a key prefix (moving panels get their own)
  function shoji(pre, xc, zc) {
    const y0 = FT, y1 = KAMOI, h = 0.03, st = 0.035, koshi = 0.24;
    const za = zc - SW / 2, zb = zc + SW / 2;
    box(pre + "wood", xc - h / 2, xc + h / 2, y0, y0 + koshi, za, zb); // koshi board and bottom rail
    box(pre + "wood", xc - h / 2, xc + h / 2, y1 - 0.04, y1, za, zb); // top rail
    box(pre + "wood", xc - h / 2, xc + h / 2, y0 + koshi, y1 - 0.04, za, za + st); // stiles
    box(pre + "wood", xc - h / 2, xc + h / 2, y0 + koshi, y1 - 0.04, zb - st, zb);
    box(pre + "paper", xc - 0.002, xc + 0.002, y0 + koshi, y1 - 0.04, za + st, zb - st);
    const P = wallX(xc + 0.006), pv0 = y0 + koshi, pv1 = y1 - 0.04, pu0 = za + st, pu1 = zb - st, k = 0.007;
    for (let i = 1; i <= 2; i++) { const u = pu0 + (i * (pu1 - pu0)) / 3; rect(pre + "trim", P, u - k, u + k, pv0, pv1); }
    for (let j = 1; j <= 6; j++) { const v = pv0 + (j * (pv1 - pv0)) / 7; rect(pre + "trim", P, pu0, pu1, v - k, v + k); }
    rect(pre + "trim", wallX(xc + h / 2 + 0.001), za + 0.06, zb - 0.06, y0 + koshi - 0.035, y0 + koshi - 0.025); // koshi rail line
  }
  const OUT = -X1 - 0.075, IN = -X1 - 0.035; // track centres
  shoji("", OUT, panelZ(0));
  shoji("", OUT, panelZ(3));
  shoji("A:", IN, panelZ(1));
  shoji("B:", IN, panelZ(2));

  // ---------- engawa ----------
  const EX = -X1 - T - 0.9;
  box("wood", EX, -X1 - T, 0, FT - 0.008, -Z1 - T, Z1 + T);
  for (let x = EX + 0.15; x < -X1 - T - 0.05; x += 0.15)
    rect("trim", { W: (u, v) => [v, FT - 0.0065, u], back: (u, v) => [v, 0, u] }, -Z1 - T, Z1 + T, x - 0.005, x + 0.005);
  for (const z of [-Z1 - 0.03, Z1 + 0.03]) box("wood", EX, EX + 0.12, 0, CEIL, z - 0.06, z + 0.06);
  box("wood", EX, EX + 0.12, CEIL - 0.2, CEIL, -Z1 - T, Z1 + T); // keta beam
  box("wood", EX - 0.02, EX + 0.14, CEIL, TOP, -Z1 - T - 0.1, Z1 + T + 0.1); // eave plate

  // ---------- -Z wall, right half: fusuma ----------
  const BZ = -Z1;
  function fusuma(x0, x1, zFace, sgn, motif) {
    // two panels between x0 and x1 in the wall plane at zFace (room side is +sgn Z)
    const pw = (x1 - x0) / 2 + 0.015, th = 0.02;
    box("wood", x0, x1, 0, FT, zFace, zFace - sgn * T); // shikii
    box("wood", x0, x1, KAMOI, KAMOI + KH, zFace, zFace - sgn * T); // kamoi
    const panels = [[x0, x0 + pw, zFace - sgn * 0.065], [x1 - pw, x1, zFace - sgn * 0.035]];
    for (const [a, b, zc] of panels) {
      box("fusuma", a, b, FT, KAMOI, zc - th / 2, zc + th / 2);
      const P = { W: (u, v) => [u, v, zc + sgn * (th / 2 + 0.001)], back: (u, v) => [u, v, zc - sgn] };
      const P2 = { W: (u, v) => [u, v, zc + sgn * (th / 2 + 0.002)], back: (u, v) => [u, v, zc - sgn] };
      const f = 0.022;
      rect("dark", P, a, b, FT, FT + f); rect("dark", P, a, b, KAMOI - f, KAMOI);
      rect("dark", P, a, a + f, FT, KAMOI); rect("dark", P, b - f, b, FT, KAMOI);
      const hx = zc === panels[0][2] ? b - 0.09 : a + 0.09;
      fan("dark", P2, disc(hx, 0.86, 0.032));
      if (!motif) continue;
      // mist-cloud bands and a row of wave crests, laid out in wall coordinates across the pair
      const clip = (u0, u1) => [Math.max(u0, a + f + 0.01), Math.min(u1, b - f - 0.01)];
      const W = x1 - x0, U = (s) => x0 + s * W;
      for (const [s0, s1, v, hh] of [[0.05, 0.42, 1.52, 0.1], [0.3, 0.78, 1.38, 0.08], [0.56, 0.95, 1.6, 0.09], [0.12, 0.5, 1.12, 0.07], [0.62, 0.9, 1.22, 0.06]]) {
        const [u0, u1] = clip(U(s0), U(s1));
        if (u1 - u0 > 0.1) fan("cloud", P, stadium(u0, u1, v, hh));
      }
      const R = 0.11;
      for (let k = 0; k < 9; k++) {
        const uc = x0 + 0.06 + k * (W - 0.12) / 8, vc = 0.24 + (k % 2) * 0.05;
        for (const [rr, ww] of [[R, 0.024], [R * 0.62, 0.016]]) {
          const path = [];
          for (let q = 0; q <= 10; q++) {
            const t = Math.PI * (0.05 + 0.9 * (q / 10));
            const u = uc + rr * Math.cos(t);
            if (u > a + f + 0.005 && u < b - f - 0.005) path.push([u, vc + rr * Math.sin(t)]);
          }
          if (path.length > 2) ribbon("trim", P2, path, () => ww);
        }
      }
    }
  }
  fusuma(0.06, X1, BZ, 1, true);
  box("plaster", 0.06, X1, KAMOI + KH, TOP, BZ, BZ - T);
  box("wood", 0.06, X1, NAG, NAG + NAGH, BZ, BZ + 0.03);

  // ---------- tokonoma ----------
  box("wood", TK.x0, TK.x1, 0, TK.y, TK.z0, BZ); // platform (toko-ita)
  rect("dark", wallZ(BZ + 0.001), TK.x0, TK.x1, TK.y - 0.05, TK.y); // toko-gamachi band
  box("wood", TK.x0, TK.x1, 1.86, 1.94, BZ - 0.03, BZ); // otoshigake
  box("plaster", TK.x0 - T, TK.x1, 1.94, TOP, BZ, BZ - T);
  box("plaster", TK.x0 - T, TK.x1, 0, TOP, TK.z0 - T, TK.z0); // alcove back
  box("plaster", TK.x0 - T, TK.x0, 0, TOP, TK.z0, BZ); // alcove sides
  box("plaster", TK.x1, TK.x1 + 0.12, 0, TOP, TK.z0 - T, BZ - 0.06);
  box("wood", TK.x0 - T, -X1, NAG, NAG + NAGH, BZ, BZ + 0.03);
  // hanging scroll
  const SX = (TK.x0 + TK.x1) / 2 - 0.25, BW = wallZ(TK.z0 + 0.004);
  box("wood", SX - 0.23, SX + 0.23, 0.44, 1.74, TK.z0, TK.z0 + 0.006); // mounting
  rect("scroll", wallZ(TK.z0 + 0.0075), SX - 0.17, SX + 0.17, 0.62, 1.56);
  const enso = [];
  for (let q = 0; q <= 26; q++) { const t = 1.85 + (q / 26) * 5.6; enso.push([SX + 0.115 * Math.cos(t), 1.12 + 0.13 * Math.sin(t)]); }
  ribbon("dark", wallZ(TK.z0 + 0.009), enso, (t) => 0.012 + 0.03 * Math.sin(Math.PI * Math.pow(t, 0.7)));
  box("dark", SX - 0.25, SX + 0.25, 1.73, 1.76, TK.z0, TK.z0 + 0.02); // top rod
  box("dark", SX - 0.26, SX + 0.26, 0.42, 0.455, TK.z0 + 0.002, TK.z0 + 0.03); // jiku
  for (const s of [-1, 1]) box("dark", SX + s * 0.29 - 0.02, SX + s * 0.29 + 0.02, 0.415, 0.46, TK.z0 + 0.002, TK.z0 + 0.034);
  ribbon("dark", BW, [[SX - 0.2, 1.75], [SX, 1.95], [SX + 0.2, 1.75]], () => 0.008);
  // vase with a branch
  const VX = TK.x1 - 0.4, VZ = TK.z0 + 0.28;
  lathe("scroll", [[0, TK.y], [0.06, TK.y], [0.085, TK.y + 0.07], [0.07, TK.y + 0.15], [0.03, TK.y + 0.2], [0.028, TK.y + 0.235], [0.04, TK.y + 0.25], [0, TK.y + 0.25]], VX, VZ, 14);
  const br = (pts, r0) => tube("wood", pts.map(([x, y, z]) => [VX + x, TK.y + y, VZ + z]), (t) => r0 * (1 - 0.7 * t) + 0.002, 5);
  br([[0, 0.2, 0], [-0.03, 0.4, 0.01], [-0.1, 0.6, 0.03], [-0.22, 0.74, 0.05], [-0.34, 0.8, 0.06]], 0.011);
  br([[-0.05, 0.48, 0.02], [0.02, 0.62, 0.04], [0.1, 0.7, 0.05]], 0.007);
  br([[-0.16, 0.68, 0.04], [-0.16, 0.86, 0.05], [-0.12, 0.96, 0.05]], 0.006);
  for (const [x, y, z] of [[-0.34, 0.8, 0.06], [-0.26, 0.77, 0.08], [0.1, 0.7, 0.07], [0.05, 0.66, 0.06], [-0.12, 0.96, 0.07], [-0.15, 0.86, 0.07], [-0.1, 0.59, 0.05]]) {
    const r = 0.022;
    lathe("red", [[0, -r * 0.6], [r * 0.8, -r * 0.35], [r, 0], [r * 0.8, r * 0.35], [0, r * 0.6]].map(([a, b]) => [a, TK.y + y + b]), VX + x, VZ + z, 7);
  }

  // ---------- chabudai and zabuton ----------
  lathe("wood", [[0, TBL.y], [TBL.r - 0.01, TBL.y], [TBL.r, TBL.y + 0.012], [TBL.r - 0.01, TBL.y + 0.028], [0, TBL.y + 0.028]], TBL.x, TBL.z, 28);
  lathe("wood", [[0, TBL.y - 0.05], [TBL.r - 0.08, TBL.y - 0.05], [TBL.r - 0.08, TBL.y + 0.001], [0, TBL.y + 0.001]], TBL.x, TBL.z, 20); // apron
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2, lx = TBL.x + 0.25 * Math.cos(a), lz = TBL.z + 0.25 * Math.sin(a);
    box("wood", lx - 0.022, lx + 0.022, FT, TBL.y, lz - 0.022, lz + 0.022);
  }
  const seats = [[TBL.x + 0.68, TBL.z], [TBL.x - 0.68, TBL.z]];
  for (const [x, z] of seats) {
    pillow("red", x, z, 0.55, 0.6, FT, FT + 0.035, FT + 0.09, 0.02, 0.07);
    lathe("dark", [[0, FT + 0.088], [0.016, FT + 0.088], [0.016, FT + 0.096], [0, FT + 0.096]], x, z, 6); // tassel knot
  }
  // a teapot and two cups on the table
  const TY = TBL.y + 0.028;
  lathe("wood", [[0, TY], [0.05, TY], [0.07, TY + 0.04], [0.055, TY + 0.08], [0.02, TY + 0.09], [0.012, TY + 0.105], [0, TY + 0.105]], TBL.x - 0.08, TBL.z - 0.1, 12);
  tube("wood", [[TBL.x - 0.02, TY + 0.04, TBL.z - 0.06], [TBL.x + 0.03, TY + 0.075, TBL.z - 0.03]], (t) => 0.012 - 0.005 * t, 5);
  for (const [dx, dz] of [[0.18, 0.05], [-0.1, 0.17]])
    lathe("scroll", [[0, TY], [0.025, TY], [0.035, TY + 0.06], [0, TY + 0.06]], TBL.x + dx, TBL.z + dz, 10);

  // ---------- lamp ----------
  if (lamp) {
    const LY = 2.08, LR = 0.19, lp = [];
    for (let k = 0; k <= 10; k++) { const a = -Math.PI / 2 + (k / 10) * Math.PI; lp.push([LR * Math.cos(a) * (k === 0 || k === 10 ? 0 : 1), LY + LR * 0.9 * Math.sin(a)]); }
    lp[0] = [0, LY - LR * 0.9]; lp[10] = [0, LY + LR * 0.9];
    lathe("lamp", lp, TBL.x, TBL.z, 18);
    lathe("dark", [[0, LY + LR * 0.85], [0.05, LY + LR * 0.85], [0.045, LY + LR * 0.95], [0, LY + LR * 0.95]], TBL.x, TBL.z, 10);
    tube("dark", [[TBL.x, LY + LR * 0.94, TBL.z], [TBL.x, CEIL, TBL.z]], () => 0.005, 4);
    // ribs: thin horizontal bands around the globe
    for (const s of [-0.55, -0.15, 0.25, 0.6]) {
      const y = LY + LR * 0.9 * s, r = LR * Math.sqrt(1 - s * s) + 0.002;
      lathe("trim", [[r - 0.001, y - 0.004], [r, y - 0.004], [r, y + 0.004], [r - 0.001, y + 0.004]], TBL.x, TBL.z, 18);
    }
  }

  // ---------- closed room: +X wall, +Z wall with fusuma, ceiling ----------
  if (!cutaway) {
    box("plaster", X1, X1 + T, 0, TOP, -Z1 - T, Z1 + T);
    box("wood", X1 - 0.03, X1, NAG, NAG + NAGH, -Z1, Z1);
    fusuma(-0.9, 0.9, Z1, -1, false);
    box("plaster", -X1 - T, -0.9, 0, TOP, Z1, Z1 + T);
    box("plaster", 0.9, X1, 0, TOP, Z1, Z1 + T);
    box("plaster", -0.9, 0.9, KAMOI + KH, TOP, Z1, Z1 + T);
    box("wood", -X1, X1, NAG, NAG + NAGH, Z1 - 0.03, Z1);
    box("ceiling", -X1 - T, X1 + T, CEIL, TOP, -Z1 - T, Z1 + T);
    box("ceiling", TK.x0 - T, TK.x1 + 0.12, CEIL, TOP, TK.z0 - T, -Z1 - T);
    for (const [a, b] of [[-X1, X1]]) {
      box("wood", a, b, CEIL - 0.05, CEIL, -Z1, -Z1 + 0.04);
      box("wood", a, b, CEIL - 0.05, CEIL, Z1 - 0.04, Z1);
    }
    box("wood", -X1, -X1 + 0.04, CEIL - 0.05, CEIL, -Z1, Z1);
    box("wood", X1 - 0.04, X1, CEIL - 0.05, CEIL, -Z1, Z1);
    const P = { W: (u, v) => [v, CEIL - 0.002, u], back: (u, v) => [v, CEIL + 1, u] };
    for (let x = -X1 + 0.45; x < X1 - 0.1; x += 0.45) rect("trim", P, -Z1, Z1, x - 0.012, x + 0.012);
  }

  // ---------- meshes ----------
  const MAT = {
    tatami: [c.tatami, c.tatamiShade, 0.1, 2.5],
    dark: [c.dark, c.dark, 0.1, 0],
    weave: [c.weave, c.weave, 0.1, 0],
    wood: [c.wood, c.woodShade, 0.1, 2.5],
    trim: [c.trim, c.trim, 0.1, 0],
    plaster: [c.plaster, c.plasterShade, 0.1, 3],
    paper: [c.paper, c.paperShade, 0.0, 0],
    fusuma: [c.fusuma, c.fusumaShade, 0.1, 2],
    cloud: [c.cloud, c.cloud, 0.1, 0],
    scroll: [c.scroll, c.scrollShade, 0.1, 1.5],
    red: [c.red, c.redShade, 0.2, 2],
    lamp: [c.lamp, c.lamp, -0.25, 2],
    ceiling: [c.ceiling, c.ceilingShade, 0.1, 2.5],
  };
  const geo = (arr) => {
    const gm = new THREE.BufferGeometry();
    gm.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    gm.computeVertexNormals();
    return gm;
  };
  for (const [key, arr] of Object.entries(soups)) {
    if (key.includes(":")) continue;
    const [base, shade, threshold, px] = MAT[key];
    const mesh = kit.toon(geo(arr), base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    set.add(mesh);
  }
  // the sliding shoji: one mesh each, material groups wood / trim / paper, pivot at the closed panel centre
  for (const [pre, i] of [["A:", 1], ["B:", 2]]) {
    const ctr = [IN, 0, panelZ(i)];
    const parts = ["wood", "trim", "paper"].map((k) => soups[pre + k] ?? []);
    const all = [];
    const gm = new THREE.BufferGeometry();
    let start = 0;
    parts.forEach((arr, gi) => {
      for (let v = 0; v < arr.length; v += 3) all.push(arr[v] - ctr[0], arr[v + 1], arr[v + 2] - ctr[2]);
      gm.addGroup(start, arr.length / 3, gi);
      start += arr.length / 3;
    });
    gm.setAttribute("position", new THREE.Float32BufferAttribute(all, 3));
    gm.computeVertexNormals();
    const mats = ["wood", "trim", "paper"].map((k) => kit.cel(MAT[k][0], MAT[k][1], { threshold: MAT[k][2] }));
    const mesh = new THREE.Mesh(gm, mats);
    // ink only the frame: outline a frame-only twin and keep just its hull (kumiko and paper stay unlined)
    const frame = new THREE.BufferGeometry();
    frame.setAttribute("position", new THREE.Float32BufferAttribute(all.slice(0, parts[0].length), 3));
    frame.computeVertexNormals();
    for (const h of kit.outline(new THREE.Mesh(frame, mats[0]), { px: 2.5 }).children.slice()) mesh.add(h);
    mesh.name = "shoji" + pre[0];
    const j = new THREE.Group();
    j.name = "shoji" + pre[0];
    j.position.set(ctr[0], 0, ctr[2]);
    j.add(mesh);
    set.add(j);
    joints["shoji" + pre[0]] = j;
  }
  // anchors for placing figures and cameras
  const anchor = (name, x, y, z) => { const a = new THREE.Group(); a.name = name; a.position.set(x, y, z); set.add(a); joints[name] = a; };
  anchor("floor", 0, FT, 0);
  anchor("table", TBL.x, TY, TBL.z);
  anchor("seatA", seats[0][0], FT + 0.09, seats[0][1]);
  anchor("seatB", seats[1][0], FT + 0.09, seats[1][1]);
  anchor("tokonoma", (TK.x0 + TK.x1) / 2, TK.y, (TK.z0 + BZ) / 2);
  anchor("engawa", (EX - X1 - T) / 2, FT - 0.008, 0);

  // ---------- poses ----------
  // Sign convention: shojiA slides toward -Z and shojiB toward +Z by s * SSTEP, s = 0 closed .. 1 fully open
  // (each then sits over its end panel on the inner track).
  function pose(name) {
    const s = { rest: shojiOpen, open: 1, closed: 0 }[name];
    if (s === undefined) throw new Error(`washitsu: unknown pose "${name}" (rest, open, closed)`);
    joints.shojiA.position.z = panelZ(1) - s * SSTEP;
    joints.shojiB.position.z = panelZ(2) + s * SSTEP;
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
