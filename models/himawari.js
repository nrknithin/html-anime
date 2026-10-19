// himawari.js - a midsummer sunflower field by a country road (the anime summer-vacation set piece): a dense block of
// tall sunflowers all turned one way, a narrow paved road with a faded centre line, a wooden utility pole with sagging
// wires, a rusty bus-stop post with a blank round plate and a little bench, a bicycle leaning on the bench, and a small
// roadside jizo shrine. Clip "breeze" sways the flowers in a travelling wave.
// Contract: harness/lab/README.md. Meters, +Y up, the road side faces +Z (the field is behind it, -Z), the road runs
// along X, its left is +X (the bus-stop end), stands on y = 0, centred on x = 0, z = 0.
//
// Construction (closed solids, triangle soups merged per material, flat-shaded; every face wound from a point inside
// its solid or an explicit outward normal, never by hand):
//   GROUND    one grass slab (14 x 10 m); the road a raised pale slab with flat decal lines on it: two solid edge
//             lines and a dashed centre line whose dashes are broken, shortened or missing by a sine hash (faded paint).
//   FIELD     `flowers` sunflowers on a staggered grid (0.92 m, jittered by the hash) in 3-6 rows, each row on a low
//             earthed-up ridge (a trapezoid prism, darker green), front rows shortest (1.6 m) and back rows tallest
//             (2.2 m) so every head shows over the row in front. A flower is a 5-sided stalk (capped), four broad
//             pointed leaves (closed 4-rim bipyramids) alternating up the stalk, a green calyx cone behind the head, a
//             dark centre disc (a closed lathe dome) and 12 petals (each a closed kite with a ridge, 6 tris, curling
//             back at the tip). Every head faces one way, up and toward the +X+Z sun (the lit side), within ~10 deg of
//             jitter. Heads ~0.75 m across with the petals: anime-stylised (~1.5x a big real one) so they read at
//             thumbnail size. A first try with a lumpy leaf canopy under the heads read as hedges; bare stalks and
//             leaves read as sunflowers. Past 55 flowers each gets 3 leaves, 10 petals and fewer sides.
//   PROPS     a 7 m wooden pole (8-sided taper, dark tarred timber) at the -X end of the verge with a steel crossarm,
//             three porcelain insulators and a telephone cable on a bracket; the four wires cross the road and run
//             back over the field (along Z) as parabolic sags (0.4 / 0.55 m on the long span), cut ends capped at the
//             set edges. Run along X they climbed toward the hero camera and shrank the field in the thumbnail.
//             A bus-stop post: a round concrete base, a rusty post, a blank round plate with a rust rim and a blank
//             timetable board (no lettering, rule 15). A two-plank bench with a backrest. A mamachari-style bicycle
//             (step-through frame, basket, chain guard, saddle) leaning ~11 deg back against the bench seat's +X end.
//             A hokora: stone plinth, an open-front wooden box with a gabled dark roof, a small jizo inside with a
//             red bib. joints.field is a bare marker at the middle of the head band (for --focus field).
//   BREEZE    clip "breeze" (3 s loop): one gust wave travels along +X (wavelength 6 m, one wavelength a loop), each
//             flower's bend D = A (0.35 + 0.65 sin(phase)), A 0.13-0.19 m. Stalk and leaf vertices shift by D (y/Hc)^2
//             (Hc = head-centre height); the head (disc, petals, calyx) moves rigidly with the stalk top and tilts by
//             atan(2D/Hc). Positions are rewritten in pose() on the three flower meshes; hull normals stay at rest.
//             Every term has a whole-number frequency per loop, so breeze@3 == breeze@0. rest is still air.
// Proportions (real size; base unit the road width 3 m): set 14 x 10 m (4.7 x 3.3 roads); flowers 1.6-2.2 m; pole
//   7.0 m (the rest top), crossarm 6.65 m; bus-stop plate centre 2.0 m, r 0.27 m; bench seat 0.42 m, 1.55 m long;
//   bicycle wheels r 0.33 m, 1.7 m long; hokora 0.98 m with its plinth, jizo 0.36 m.
// Options: build(THREE, kit, colors, { height, flowers }).
//   flowers  20..80 (default 50); the grid adds rows and columns (50: 5 x 10, 80: 6 x 14).
//   height   scales the whole set uniformly so its rest top (the pole) is `height`.
// Budget: 11.7k triangles at the defaults (flowers ~9.4k), 6.0k at 20, 14.4k at 80; 11 meshes, one per material
// pair; the three flower meshes (petal, disc, green) are the moving ones.
// Colours (meadow, the one script: greens, a pale sky; its only yellow is practical):
//   grass line #a9d16e / iris #3f8a47; ridges, stalks, leaves, calyx iris / hair #2c5131; road sky #d7ecef flat,
//   road paint moon #f7f3e1 flat (pale on pale: the faded paint); petals practical #f2c94c / accent #d9483b at -0.2
//   (yellow; the warm shade only on back-turned petals); discs hair flat (the dark centre, lighter than ink
//   #1c261b); weathered wood (bench, hokora box) skin #f0c2ae / accent; stone and porcelain (bus-stop base, plinth,
//   insulators, jizo, the blank plate and board) moon / skin; rust (post, plate rim, bicycle frame, jizo bib)
//   accent / hair; pole, steel, wires, tyres, basket, roof hair flat.

export const meta = {
  name: "himawari",
  height: 7.0,
  script: "meadow",
  colors: {
    grass: "#a9d16e", grassShade: "#3f8a47",
    road: "#d7ecef", paint: "#f7f3e1",
    petal: "#f2c94c", petalShade: "#d9483b",
    disc: "#2c5131",
    leaf: "#3f8a47", leafShade: "#2c5131",
    wood: "#f0c2ae", woodShade: "#d9483b",
    stone: "#f7f3e1", stoneShade: "#f0c2ae",
    rust: "#d9483b", rustShade: "#2c5131",
    dark: "#2c5131",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const NF = Math.max(20, Math.min(80, Math.round(opts.flowers ?? 50)));
  const root = new THREE.Group();
  root.name = "himawari";
  const body = new THREE.Group(); // centring offset and the uniform height scale live here
  body.name = "body";
  root.add(body);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (q) => { const l = Math.hypot(...q) || 1; return q.map((v) => v / l); };
  const soups = {}, tags = {};
  const S = (key) => (soups[key] ??= []);
  let X = (p) => p; // rigid placement of the part being built (the bicycle); winding survives it
  let TAG = null; // [flower index, rigid 0|1] for the moving meshes
  function tri(key, a, b, e, ref) { // wound away from ref, a point inside the solid
    [a, b, e, ref] = [a, b, e, ref].map(X);
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    S(key).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
    if (TAG) (tags[key] ??= []).push(...TAG, ...TAG, ...TAG);
  }
  const triN = (key, a, b, e, n) => {
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    tri(key, a, b, e, sub(m, n));
  };
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  const quadN = (key, a, b, e, d, n) => (triN(key, a, b, e, n), triN(key, a, e, d, n));
  function hex(key, p) { // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  const box = (key, x0, x1, y0, y1, z0, z1) =>
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  // a square beam of width w from a to b (closed)
  function beam(key, a, b, w, h = w) {
    const d = sub(b, a), up = Math.abs(d[1]) > 0.9 * Math.hypot(...d) ? [1, 0, 0] : [0, 1, 0];
    const s = nrm(cross(d, up)), u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((t) => o[t] + s[t] * i * w / 2 + u[t] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // lathe about axis n through c: profile [[r, h], ...] from h low (r = 0) to h high (r = 0)
  function lathe(key, prof, seg, cc, n = [0, 1, 0], rot = 0) {
    const u = nrm(cross(n, Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), v = cross(n, u);
    const P = (r, h, a) => [0, 1, 2].map((q) => cc[q] + n[q] * h + (u[q] * Math.cos(a) + v[q] * Math.sin(a)) * r);
    for (let k = 0; k + 1 < prof.length; k++) {
      const [r0, h0] = prof[k], [r1, h1] = prof[k + 1], nr = h1 - h0, nh = -(r1 - r0);
      for (let j = 0; j < seg; j++) {
        const a0 = rot + (j / seg) * 2 * Math.PI, a1 = rot + ((j + 1) / seg) * 2 * Math.PI, am = (a0 + a1) / 2;
        const out = [0, 1, 2].map((q) => (u[q] * Math.cos(am) + v[q] * Math.sin(am)) * nr + n[q] * nh);
        quadN(key, P(r0, h0, a0), P(r0, h0, a1), P(r1, h1, a1), P(r1, h1, a0), out);
      }
    }
  }
  // tube of `sides` along a polyline, radius r (number or function of the point index); ends capped unless loop
  function tube(key, pts, r, sides, { loop = false, up = [0, 1, 0] } = {}) {
    const n = pts.length, rings = [];
    for (let i = 0; i < n; i++) {
      const pa = pts[loop ? (i - 1 + n) % n : Math.max(i - 1, 0)], pb = pts[loop ? (i + 1) % n : Math.min(i + 1, n - 1)];
      const t = nrm(sub(pb, pa)), s = nrm(cross(t, up)), w = cross(s, t), rr = typeof r === "function" ? r(i) : r;
      rings.push(Array.from({ length: sides }, (_, j) => {
        const a = (j / sides) * 2 * Math.PI;
        return [0, 1, 2].map((q) => pts[i][q] + (s[q] * Math.cos(a) + w[q] * Math.sin(a)) * rr);
      }));
    }
    for (let i = 0; i < (loop ? n : n - 1); i++) {
      const i1 = (i + 1) % n, ref = [0, 1, 2].map((q) => (pts[i][q] + pts[i1][q]) / 2);
      for (let j = 0; j < sides; j++) {
        const j1 = (j + 1) % sides;
        quad(key, rings[i][j], rings[i][j1], rings[i1][j1], rings[i1][j], ref);
      }
    }
    if (!loop)
      for (const [k, kn] of [[0, 1], [n - 1, n - 2]]) {
        const ref = [0, 1, 2].map((q) => pts[k][q] * 0.9 + pts[kn][q] * 0.1);
        for (let j = 1; j + 1 < sides; j++) tri(key, rings[k][0], rings[k][j], rings[k][j + 1], ref);
      }
  }
  // deterministic jitter in [0, 1)
  const hash = (i, j = 0, k = 0) => { const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); };
  // a bumped, squashed sphere (centre cc, radii r)
  function blob(key, cc, r, seg, rings, bump, seed) {
    const V = [];
    for (let i = 0; i <= rings; i++) {
      const v = (i / rings) * Math.PI, row = [];
      for (let j = 0; j < seg; j++) {
        const u = ((j + (i % 2) * 0.5) / seg) * 2 * Math.PI;
        const f = i === 0 || i === rings ? 1 : 1 + bump * (hash(seed, i, j) - 0.5) * 2;
        row.push([cc[0] + r[0] * f * Math.sin(v) * Math.cos(u), cc[1] + r[1] * f * Math.cos(v), cc[2] + r[2] * f * Math.sin(v) * Math.sin(u)]);
      }
      V.push(row);
    }
    for (let i = 0; i < rings; i++)
      for (let j = 0; j < seg; j++) {
        const a = V[i][j], b = V[i][(j + 1) % seg], d = V[i + 1][j], e = V[i + 1][(j + 1) % seg];
        if (i > 0) tri(key, a, b, i % 2 ? e : d, cc);
        if (i < rings - 1) i % 2 ? tri(key, a, e, d, cc) : tri(key, b, e, d, cc);
      }
  }

  // ---------- layout ----------
  const XW = 7, ZB = -5, ZF = 5; // set edges
  const GY = 0.02, RY = 0.045; // grass top, road top
  const RZ0 = 1.75, RZ1 = 4.75; // road edges
  const PX = -6.0, PZ = 1.25; // utility pole

  // ---------- ground and road ----------
  box("grass", -XW, XW, 0, GY, ZB, ZF);
  box("road", -XW, XW, GY - 0.005, RY, RZ0, RZ1);
  const paint = (x0, x1, z0, z1) => box("paint", x0, x1, RY - 0.004, RY + 0.003, z0, z1);
  paint(-XW, XW, RZ0 + 0.12, RZ0 + 0.22);
  paint(-XW, XW, RZ1 - 0.22, RZ1 - 0.12);
  {
    const zc = (RZ0 + RZ1) / 2;
    for (let x = -XW + 0.3, k = 0; x < XW - 0.2; x += 2.1, k++) {
      const h = hash(k, 3), len = 1.25 * (h < 0.3 ? 0.55 : 1);
      if (h > 0.85) continue; // a dash worn away
      const x1 = Math.min(XW, x + len);
      if (hash(k, 4) < 0.4) { paint(x, x + len * 0.45, zc - 0.06, zc + 0.06); paint(x + len * 0.6, x1, zc - 0.05, zc + 0.05); }
      else paint(x, x1, zc - 0.06, zc + 0.06);
    }
  }

  // ---------- field ----------
  const ROWS = Math.max(3, Math.min(6, Math.round(Math.sqrt(NF / 2))));
  const COLS = Math.ceil(NF / ROWS), DX = 0.92, DZ = 0.92, FZ0 = 0.3;
  const slots = [];
  for (let r = 0; r < ROWS; r++)
    for (let k = 0; k < COLS; k++) slots.push([r, k]);
  // drop the surplus from the back row's two ends
  const extra = slots.length - NF;
  const drop = new Set();
  for (let i = 0; i < extra; i++) drop.add(`${ROWS - 1},${i % 2 ? COLS - 1 - (i >> 1) : i >> 1}`);
  const flowers = [];
  for (const [r, k] of slots) {
    if (drop.has(`${r},${k}`)) continue;
    const id = flowers.length;
    const x = (k - (COLS - 1) / 2 + (r % 2 ? 0.5 : 0) - 0.25) * DX + (hash(id, 1) - 0.5) * 0.22;
    const z = FZ0 - r * DZ + (hash(id, 2) - 0.5) * 0.22;
    const H = 1.6 + 0.6 * (r / Math.max(1, ROWS - 1)) * 0.8 + 0.12 * hash(id, 3);
    flowers.push({ x, z, H, s: 0.9 + 0.2 * hash(id, 4), id });
  }
  const FW = (COLS + 0.5) * DX; // block width
  const BACKZ = FZ0 - (ROWS - 1) * DZ;
  // one named marker at the middle of the block's head band (for --focus field); nothing hangs off it
  joints.field = new THREE.Group();
  joints.field.name = "field";
  joints.field.position.set(0, 1.9, (FZ0 + BACKZ) / 2);
  body.add(joints.field);
  // planting ridges: one low earthed-up ridge under each row (a trapezoid prism)
  for (let r = 0; r < ROWS; r++) {
    const z = FZ0 - r * DZ, x0 = -FW / 2 - 0.1, x1 = FW / 2 + 0.1;
    const sec = [[z + 0.32, 0.005], [z + 0.14, 0.09], [z - 0.14, 0.09], [z - 0.32, 0.005]];
    for (let i = 0; i < 4; i++) {
      const [z0, y0] = sec[i], [z1, y1] = sec[(i + 1) % 4];
      quad("bed", [x0, y0, z0], [x1, y0, z0], [x1, y1, z1], [x0, y1, z1], [0, 0.04, z]);
    }
    for (const xx of [x0, x1]) quad("bed", ...sec.map(([zz, yy]) => [xx, yy, zz]), [0, 0.04, z]);
  }
  // each flower: stalk, leaves, calyx (greens), disc, petals
  const SUN = nrm([0.45, 0.32, 0.85]);
  // past 55 flowers each one gets lighter (3 leaves, 10 petals, fewer sides) so 80 stays within ~15k triangles
  const LO = NF > 55, NL = LO ? 3 : 4, NP = LO ? 10 : 12;
  for (const f of flowers) {
    const { x, z, H, s, id } = f;
    const n = nrm([SUN[0] + (hash(id, 7) - 0.5) * 0.3, SUN[1] + (hash(id, 8) - 0.5) * 0.25, SUN[2]]);
    const top = [x + n[0] * 0.07, H - 0.2 * s, z + n[2] * 0.07];
    const cc = add(top, n, 0.07 * s); // head centre (disc back plane)
    f.c = cc; f.Hc = cc[1]; f.n = n;
    TAG = [id, 0];
    const stalk = [[x, 0.005, z], [x + n[0] * 0.01, H * 0.5, z + n[2] * 0.01], top, add(cc, n, -0.03)];
    tube("green", stalk, (i) => [0.024, 0.02, 0.016, 0.016][i] * s, LO ? 4 : 5, { up: [1, 0, 0] });
    // broad pointed leaves up the stalk, alternate sides
    for (let k = 0; k < NL; k++) {
      const y = H * (0.3 + 0.13 * k), a = id * 2.1 + k * 2.4 + 0.6;
      const dir = nrm([Math.cos(a), -0.15 - 0.1 * k, Math.sin(a)]), side = nrm(cross([0, 1, 0], dir)), up2 = nrm(cross(dir, side));
      const ln = (0.6 - 0.08 * k) * s, wd = (0.2 - 0.02 * k) * s, r0 = [x + dir[0] * 0.02, y, z + dir[2] * 0.02];
      const at = (t, w) => [0, 1, 2].map((q) => r0[q] + dir[q] * ln * t + side[q] * w - up2[q] * 0.1 * ln * t * t);
      const rim = [at(0, 0), at(0.4, wd), at(1, 0), at(0.4, -wd)];
      const mid = at(0.4, 0), tp = add(mid, up2, 0.02), bt = add(mid, up2, -0.008);
      for (let j = 0; j < 4; j++) { tri("green", rim[j], rim[(j + 1) % 4], tp, mid); tri("green", rim[j], rim[(j + 1) % 4], bt, mid); }
    }
    TAG = [id, 1];
    const rd = 0.16 * s, L = 0.21 * s, w = 0.07 * s;
    lathe("green", [[0, -0.075 * s], [rd * 0.8, -0.012], [0, -0.004]], LO ? 6 : 8, cc, n);
    lathe("disc", [[0, -0.008], [rd, 0], [rd * 0.75, 0.035 * s], [0, 0.05 * s]], LO ? 7 : 8, cc, n, id);
    const u = nrm(cross(n, [0, 1, 0])), v = cross(n, u), rot = hash(id, 9);
    for (let k = 0; k < NP; k++) {
      const a = rot + (k / NP) * 2 * Math.PI, ll = L * (0.9 + 0.2 * hash(id, k, 10));
      const e = [0, 1, 2].map((q) => u[q] * Math.cos(a) + v[q] * Math.sin(a)), sd = [0, 1, 2].map((q) => -u[q] * Math.sin(a) + v[q] * Math.cos(a));
      const P = (rr, sw, h) => [0, 1, 2].map((q) => cc[q] + e[q] * rr + sd[q] * sw + n[q] * h);
      const b0 = P(rd * 0.7, 0, 0.0), m1 = P(rd + 0.42 * ll, w, -0.008), tip = P(rd + ll, 0, -0.05 * s), m2 = P(rd + 0.42 * ll, -w, -0.008);
      const apex = P(rd + 0.42 * ll, 0, 0.006), ref = P(rd + 0.42 * ll, 0, -0.006);
      tri("petal", b0, m1, apex, ref); tri("petal", m1, tip, apex, ref); tri("petal", tip, m2, apex, ref); tri("petal", m2, b0, apex, ref);
      tri("petal", b0, m1, tip, ref); tri("petal", b0, tip, m2, ref);
    }
    TAG = null;
  }

  // ---------- utility pole and wires ----------
  lathe("dark", [[0, 0], [0.15, 0], [0.11, 7.0], [0, 7.0]], 8, [PX, 0, PZ]);
  // the line crosses the road and runs back over the field (along Z), so it climbs away from the hero camera
  beam("dark", [PX - 0.7, 6.65, PZ], [PX + 0.7, 6.65, PZ], 0.09);
  const insX = [PX - 0.58, PX + 0.32, PX + 0.58];
  for (const xi of insX) lathe("stone", [[0, 6.69], [0.045, 6.69], [0.05, 6.74], [0.03, 6.8], [0, 6.8]], 6, [xi, 0, PZ]);
  beam("dark", [PX + 0.1, 5.5, PZ], [PX + 0.32, 5.5, PZ], 0.06);
  const wire = (x, y, sag, r) => {
    const pts = [];
    for (const [z0, z1, n] of [[ZB, PZ, 14], [PZ, ZF, 9]]) {
      const sg = sag * ((z1 - z0) / (PZ - ZB)) ** 2;
      for (let i = z0 === ZB ? 0 : 1; i <= n; i++) {
        const t = i / n;
        pts.push([x, y - 4 * sg * t * (1 - t), z0 + (z1 - z0) * t]);
      }
    }
    tube("dark", pts, r, 4);
  };
  for (const xi of insX) wire(xi, 6.8, 0.4, 0.013);
  wire(PX + 0.32, 5.5, 0.55, 0.022);

  // ---------- bus stop ----------
  const BX = 2.3, BZ = 1.2;
  lathe("stone", [[0, 0], [0.24, 0], [0.24, 0.07], [0.17, 0.14], [0, 0.14]], 10, [BX, 0, BZ]);
  lathe("rust", [[0, 0.12], [0.03, 0.12], [0.026, 2.3], [0, 2.32]], 6, [BX, 0, BZ]);
  lathe("rust", [[0, -0.01], [0.27, -0.01], [0.27, 0.01], [0, 0.01]], 16, [BX, 2.0, BZ + 0.04], [0, 0, 1]);
  lathe("stone", [[0, 0.008], [0.225, 0.008], [0.225, 0.016], [0, 0.016]], 16, [BX, 2.0, BZ + 0.04], [0, 0, 1]);
  box("stone", BX - 0.16, BX + 0.16, 1.2, 1.62, BZ + 0.03, BZ + 0.05);
  box("rust", BX - 0.18, BX + 0.18, 1.18, 1.64, BZ + 0.025, BZ + 0.035);

  // ---------- bench ----------
  const EX0 = 3.0, EX1 = 4.55, EZ = 1.05;
  box("wood", EX0, EX1, 0.39, 0.42, EZ - 0.2, EZ - 0.02);
  box("wood", EX0, EX1, 0.39, 0.42, EZ, EZ + 0.18);
  box("wood", EX0, EX1, 0.6, 0.76, EZ - 0.26, EZ - 0.22);
  for (const xx of [EX0 + 0.12, EX1 - 0.12]) {
    beam("dark", [xx, 0, EZ + 0.14], [xx, 0.39, EZ + 0.14], 0.05);
    beam("dark", [xx, 0, EZ - 0.18], [xx, 0.8, EZ - 0.25], 0.05);
    beam("dark", [xx, 0.37, EZ + 0.16], [xx, 0.37, EZ - 0.2], 0.04);
  }

  // ---------- bicycle (built along X in its own frame, leaning back onto the bench) ----------
  {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(4.55, 0, 1.36),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.19, 0.06, 0, "YXZ")),
      new THREE.Vector3(1, 1, 1));
    const vv = new THREE.Vector3();
    X = (p) => (vv.set(p[0], p[1], p[2]).applyMatrix4(m), [vv.x, vv.y, vv.z]);
    const R = 0.33, RH = [-0.52, R, 0], FH = [0.53, R, 0];
    for (const h of [RH, FH]) {
      const pts = Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * 2 * Math.PI; return [h[0] + Math.cos(a) * (R - 0.02), h[1] + Math.sin(a) * (R - 0.02), 0]; });
      tube("dark", pts, 0.022, 4, { loop: true, up: [0, 0, 1] });
      beam("dark", [h[0], h[1], -0.05], [h[0], h[1], 0.05], 0.03);
    }
    const BB = [-0.06, 0.29, 0], ST = [-0.21, 0.76, 0], HB = [0.4, 0.66, 0], HT = [0.37, 0.84, 0];
    tube("rust", [BB, [0.12, 0.38, 0], [0.32, 0.6, 0], HB], 0.022, 5, { up: [0, 0, 1] });
    beam("rust", BB, ST, 0.034);
    beam("rust", HB, HT, 0.04);
    for (const zz of [-0.035, 0.035]) {
      beam("rust", [BB[0], BB[1], zz], [RH[0], RH[1], zz * 1.4], 0.02);
      beam("rust", [ST[0] + 0.01, ST[1] - 0.04, zz * 0.6], [RH[0], RH[1], zz * 1.4], 0.018);
      beam("rust", [HB[0], HB[1], zz], [FH[0], FH[1], zz * 1.4], 0.022);
    }
    beam("rust", [-0.02, 0.28, 0.06], [-0.48, 0.32, 0.06], 0.13, 0.03); // chain guard (a flat plate beside the chain)
    beam("dark", [ST[0] - 0.02, ST[1] + 0.04, 0], [ST[0] - 0.04, ST[1] + 0.12, 0], 0.03);
    box("dark", ST[0] - 0.17, ST[0] + 0.07, ST[1] + 0.11, ST[1] + 0.16, -0.08, 0.08); // saddle
    beam("dark", HT, [0.32, 1.0, 0], 0.03);
    tube("dark", [[0.2, 1.02, -0.3], [0.32, 1.0, -0.22], [0.32, 1.0, 0.22], [0.2, 1.02, 0.3]], 0.016, 4);
    box("dark", 0.5, 0.82, 0.74, 0.98, -0.16, 0.16); // basket
    beam("dark", [0.47, 0.82, 0], [HT[0] + 0.03, HT[1] - 0.04, 0], 0.03);
    X = (p) => p;
  }

  // ---------- hokora (roadside jizo shrine) ----------
  {
    const HX = -2.6, HZ = 1.0, W2 = 0.3, D2 = 0.24, Y0 = 0.28, Y1 = 0.78;
    box("stone", HX - 0.38, HX + 0.38, 0, 0.12, HZ - 0.32, HZ + 0.34);
    box("stone", HX - W2 - 0.04, HX + W2 + 0.04, 0.12, Y0, HZ - D2 - 0.04, HZ + D2 + 0.04);
    box("wood", HX - W2, HX + W2, Y0, Y1, HZ - D2, HZ - D2 + 0.03); // back wall
    for (const sx of [-1, 1]) box("wood", HX + sx * W2 - (sx > 0 ? 0.03 : 0), HX + sx * W2 + (sx < 0 ? 0.03 : 0), Y0, Y1, HZ - D2, HZ + D2);
    box("wood", HX - W2, HX + W2, Y1 - 0.04, Y1, HZ - D2, HZ + D2); // ceiling
    box("dark", HX - W2 + 0.03, HX + W2 - 0.03, Y0 + 0.02, Y1 - 0.04, HZ - D2 + 0.03, HZ - D2 + 0.035); // shadowed interior
    // gabled roof, ridge along X
    const OV = 0.1, YR = Y1 + 0.2, ref = [HX, Y1 + 0.08, HZ];
    for (const sz of [-1, 1]) {
      const e0 = [HX - W2 - OV, Y1 - 0.02, HZ + sz * (D2 + OV + 0.04)], e1 = [HX + W2 + OV, Y1 - 0.02, HZ + sz * (D2 + OV + 0.04)];
      const r0 = [HX - W2 - OV, YR, HZ], r1 = [HX + W2 + OV, YR, HZ];
      hex("dark", [e0, e1, r1, r0, add(e0, [0, 0.045, 0]), add(e1, [0, 0.045, 0]), add(r1, [0, 0.045, 0]), add(r0, [0, 0.045, 0])]);
    }
    for (const sx of [-1, 1]) tri("wood", [HX + sx * (W2 - 0.01), Y1, HZ - D2], [HX + sx * (W2 - 0.01), Y1, HZ + D2], [HX + sx * (W2 - 0.01), YR - 0.01, HZ], ref);
    // jizo: a round body, a head, a red bib
    const JZ = HZ + 0.02;
    lathe("stone", [[0, Y0], [0.09, Y0], [0.1, Y0 + 0.1], [0.08, Y0 + 0.2], [0.05, Y0 + 0.24], [0, Y0 + 0.24]], 8, [HX, 0, JZ]);
    lathe("stone", [[0, Y0 + 0.22], [0.05, Y0 + 0.24], [0.06, Y0 + 0.29], [0.045, Y0 + 0.34], [0, Y0 + 0.36]], 8, [HX, 0, JZ]);
    lathe("rust", [[0, Y0 + 0.13], [0.105, Y0 + 0.14], [0.06, Y0 + 0.215], [0, Y0 + 0.215]], 8, [HX, 0, JZ]);
  }

  // ---------- meshes (one per material pair) ----------
  const MAT = {
    grass: [c.grass, c.grassShade, 0.3, true, 3],
    road: [c.road, c.road, 0.3, true, 3],
    paint: [c.paint, c.paint, -2, false],
    bed: [c.leaf, c.leafShade, 0.25, true, 2],
    green: [c.leaf, c.leafShade, 0.25, true, 1.5],
    disc: [c.disc, c.disc, 0.3, true, 1.5],
    petal: [c.petal, c.petalShade, -0.2, true, 1.5],
    wood: [c.wood, c.woodShade, -0.1, true, 2],
    stone: [c.stone, c.stoneShade, 0.15, true, 2],
    rust: [c.rust, c.rustShade, 0.2, true, 2],
    dark: [c.dark, c.dark, 0.3, true, 1.5],
  };
  const sb = new THREE.Box3(), dyn = {};
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, outline, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(arr);
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, px ? { threshold, outline, px } : { threshold, outline });
    mesh.name = key;
    body.add(mesh);
    g.computeBoundingBox();
    sb.union(g.boundingBox);
    if (tags[key]) { mesh.frustumCulled = false; dyn[key] = { g, pos, rest: new Float32Array(arr), tag: tags[key] }; }
  }
  body.position.set(-(sb.min.x + sb.max.x) / 2, 0, -(sb.min.z + sb.max.z) / 2);

  // ---------- breeze ----------
  const T = 3, LAMBDA = 6;
  function sway(t) {
    const D = flowers.map((f) => (t === null ? 0 : (0.13 + 0.06 * hash(f.id, 11)) *
      (0.35 + 0.65 * Math.sin(2 * Math.PI * (t / T - f.x / LAMBDA) + 0.5 * hash(f.id, 12)))));
    const th = flowers.map((f, i) => Math.atan((2 * D[i]) / f.Hc));
    for (const { g, pos, rest, tag } of Object.values(dyn)) {
      for (let v = 0; v < pos.length / 3; v++) {
        const fi = tag[v * 2], rigid = tag[v * 2 + 1], f = flowers[fi], d = D[fi];
        let x = rest[v * 3], y = rest[v * 3 + 1];
        if (rigid) {
          const ca = Math.cos(-th[fi]), sa = Math.sin(-th[fi]), px = x - f.c[0], py = y - f.c[1];
          x = f.c[0] + px * ca - py * sa + d;
          y = f.c[1] + px * sa + py * ca - (d * d) / (2 * f.Hc);
        } else {
          const u = Math.max(0, Math.min(1, y / f.Hc));
          x += d * u * u;
          y -= (d * d * u * u * u) / (2 * f.Hc);
        }
        pos[v * 3] = x; pos[v * 3 + 1] = y;
      }
      g.attributes.position.needsUpdate = true;
      g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
    }
  }

  const CLIPS = { breeze: T };
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`himawari: no clip "${m[1]}" (clips: breeze)`);
      sway(+m[2]);
    } else if (name === "rest") sway(null);
    else throw new Error(`himawari: unknown pose "${name}" (rest, or breeze@<seconds>)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  if (opts.height) {
    const top = new THREE.Box3().setFromObject(body).max.y;
    body.scale.setScalar(opts.height / top);
    body.position.multiplyScalar(opts.height / top);
    root.updateMatrixWorld(true);
  }
  return { root, joints, pose, clips: { ...CLIPS } };
}
