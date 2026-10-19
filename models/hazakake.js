// hazakake.js - an autumn rice-harvest field corner (inaka anime set piece, seasons), static.
// Contract: harness/lab/README.md. Meters, +Y up, the open side of the field faces +Z, its left is +X (the levee
// side), stands on y = 0, centred on x = 0, z = 0 (the bbox of the plot).
//
// Construction (closed solids only, triangle soups merged per material, flat-shaded; 12 meshes at any option):
//   FIELD     one dry harvested paddy slab 12 x 8 m, 5 cm thick, dark mud, with rice stubble in rows along X
//             (0.50 m rows, 0.24 m hills, a sine-hash jitter, no Math.random): each hill a low closed tetrahedron
//             (3 faces, the base is buried), pale straw on the mud, uninked, so it reads as dotted rows, not a mat.
//   LEVEE     aze: one trapezoid prism along Z at the +X edge (1.5 m at the toe, 1.0 m on top, 0.35 m tall), with a
//             trodden path strip (decal) down its top: the raised dirt path.
//   RACKS     hazakake: vertical poles (6-sided tubes) at most 1.8 m apart, horizontal bars at 0.85 / 1.45 / 2.05 m
//             tied across them, and a raking prop behind each end pole. Every sheaf is ONE closed 8-sided loft
//             folded over its bar (4 rings: ear-side tip tucked in, ear-side belly, over the bar, butt-side end),
//             pinched at the bar and bulging below, so a row of them is a row of teardrops with V gaps, not a
//             wall. Racks are turned 30 deg (their face toward +X+Z) so the three-quarter and hero cameras see
//             them nearly square: seen 50 deg off, the bundles stack edge-on like dominoes and read as a slab.
//             The ear side faces the camera and ends in three drooping, fanning ear tetrahedra. Alternate tiers
//             are offset half a pitch, so upper ears hang into the gaps of the tier below. Sheaves
//             get a thin 1.5 px ink (5 px would eat a 7 px bundle at hero size) and threshold 0.25: the upper belly
//             is lit, the tucked lower belly and the -X facets go to iris, so every bundle has its own dark edge.
//   SCARECROW kakashi: a post and a crossbar, an old kimono (a flared torso, two rectangular hanging sleeves along the
//             bar, a pale V collar, a red obi, a pale patch), straw tufts out of the sleeves and the hem, a cloth
//             sack head (lathe) with dot eyes and a mouth, a conical straw hat (lathe with a concave underside).
//             Turned 35 deg toward +X so the face meets the three-quarter camera.
//   PROPS     a two-wheeled wooden handcart on the levee path (bed, rails, spoked wheels, shafts resting on the path,
//             two sheaves in the bed); two conical straw stacks with a tie band and a cap; higanbana: two clumps of
//             red spider lilies on bare stems along the levee (six recurved petals and six long up-curving stamens
//             per head, all thin closed wedges).
//   Every closed part is wound from a point inside it (centre, axis point, segment core), never by hand.
// Proportions (real size; base unit the bar spacing T = 0.6 m): plot 12 x 8 m; racks 5.4 / 5.2 / 2.8 m long, poles
//   to 2.30 m (3 tiers) or 1.70 m (2 tiers); sheaf 0.26 m wide at the belly, ear side 0.46 m + ~0.15 m ears, butt
//   side 0.36 m, pitch 0.34 m (half a pitch offset on alternate tiers); scarecrow hat top 1.94 m, crossbar 1.32 m;
//   cart wheels 0.60 m; stacks 1.55 m; lilies 0.4 m.
// Options: build(THREE, kit, colors, { racks, height }).
//   racks   1..3 (default 3): the middle rack, then the back rack, then the short two-tier front rack.
//   height  scales the whole plot uniformly so its top (the pole tops, 2.30 m) is `height`.
// Budget: 12.2k triangles at the defaults (sheaves and ears ~7.6k, stubble ~2.0k), 12 meshes; racks 1: 7.7k.
// Colours (noon: warm golds and browns):
//   mud iris #5c3d32 / hair #241c16; stubble sky #f2d7ae / skin #f0c2ae, no ink; levee skin / iris at
//   -0.2 (dry pale earth, shade only on the far side), path sky flat; wood (poles, bars, wheels, post) iris / hair,
//   2 px ink so poles stay brown; sheaves sky / iris at 0.25; ears sky / skin at -0.3; straw (stacks, hat, tufts)
//   sky / skin;
//   kimono iris / hair (an old brown kimono against the gold); pale (sack head, collar, cart boards) moon #fff6e4 /
//   skin at -0.25; marks (face, lily stems) hair flat; lilies accent #c4452d / iris at 0 (also the obi).
//   hair sits next to ink only in small parts, and every shade is lighter than ink #2c261f.

export const meta = {
  name: "hazakake",
  height: 2.3,
  script: "noon",
  colors: {
    mud: "#5c3d32", mudShade: "#241c16",
    stubble: "#f2d7ae", stubbleShade: "#f0c2ae",
    levee: "#f0c2ae", leveeShade: "#5c3d32",
    path: "#f2d7ae",
    wood: "#5c3d32", woodShade: "#241c16",
    sheaf: "#f2d7ae", sheafShade: "#5c3d32",
    ear: "#f2d7ae", earShade: "#f0c2ae",
    straw: "#f2d7ae", strawShade: "#f0c2ae",
    kimono: "#5c3d32", kimonoShade: "#241c16",
    pale: "#fff6e4", paleShade: "#f0c2ae",
    mark: "#241c16",
    lily: "#c4452d", lilyShade: "#5c3d32",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const racks = Math.max(1, Math.min(3, Math.round(opts.racks ?? 3)));
  const { height = meta.height } = opts;
  const root = new THREE.Group();
  root.name = "hazakake";
  const body = new THREE.Group(); // the uniform height scale lives here
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
  const nrm = (v) => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const avg = (ps) => [0, 1, 2].map((i) => ps.reduce((s, q) => s + q[i], 0) / ps.length);
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  let X = (p) => p; // placement of the part being built (scarecrow, cart); rigid, so winding survives
  function tri(key, a, b, e, ref) { // wound away from ref, a point inside the solid
    [a, b, e, ref] = [a, b, e, ref].map(X);
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-9) return;
    const m = avg([a, b, e]);
    S(key).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function tetra(key, a, b, k, t, faces = 4) { // a thin closed wedge; faces 3 drops a, b, k (a buried base)
    const ref = avg([a, b, k, t]);
    if (faces === 4) tri(key, a, b, k, ref);
    tri(key, a, b, t, ref); tri(key, b, k, t, ref); tri(key, k, a, t, ref);
  }
  function hex(key, p) { // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
    const ref = avg(p);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, cx, cy, cz, sx, sy, sz) {
    const [x0, x1, y0, y1, z0, z1] = [cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2];
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // a closed tube through rings (each ring the same count of points), capped at both ends
  function loft(key, rings) {
    const C = rings.map(avg), n = rings[0].length;
    for (let i = 0; i + 1 < rings.length; i++) {
      const ref = avg([C[i], C[i + 1]]);
      for (let k = 0; k < n; k++) quad(key, rings[i][k], rings[i][(k + 1) % n], rings[i + 1][(k + 1) % n], rings[i + 1][k], ref);
    }
    const L = rings.length - 1;
    for (const [r, cc, nb] of [[rings[0], C[0], C[1]], [rings[L], C[L], C[L - 1]]]) {
      const ref = avg([cc, cc, cc, nb]);
      for (let k = 0; k < n; k++) tri(key, r[k], r[(k + 1) % n], cc, ref);
    }
  }
  // a ring of n points round centre c, spanning axes u (half-size a) and v (half-size b)
  const ring = (cc, u, v, a, b, n = 6, phase = 0) =>
    Array.from({ length: n }, (_, k) => { const t = phase + (k * 2 * Math.PI) / n; return add(cc, add(mul(u, a * Math.cos(t)), mul(v, b * Math.sin(t)))); });
  // a round pole from a to b, radius r (6 sides)
  function pole(key, a, b, r, r2 = r, n = 6) {
    const d = nrm(sub(b, a));
    const u = nrm(cross(d, Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), v = cross(d, u);
    loft(key, [ring(a, u, v, r, r, n), ring(b, u, v, r2, r2, n)]);
  }
  // lathe: profile [[r, y]] round the vertical axis at (cx, cz), n segments
  function lathe(key, prof, n, cx = 0, cz = 0, y0 = 0) {
    const P = (r, y, k) => { const t = (k * 2 * Math.PI) / n; return [cx + r * Math.sin(t), y0 + y, cz + r * Math.cos(t)]; };
    for (let j = 0; j + 1 < prof.length; j++) {
      const [[r0, ya], [r1, yb]] = [prof[j], prof[j + 1]];
      const ref = [cx, y0 + (ya + yb) / 2, cz];
      for (let k = 0; k < n; k++) quad(key, P(r0, ya, k), P(r0, ya, k + 1), P(r1, yb, k + 1), P(r1, yb, k), ref);
    }
  }
  // deterministic jitter in [0, 1)
  const hash = (i, j, k = 0) => { const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); };

  // ---------- field and levee ----------
  const W = 12, D = 8, GY = 0.05; // plot, mud top
  box("mud", 0, GY / 2, 0, W, GY, D);
  const LX0 = 4.5, LX1 = 6.0, LT0 = 4.75, LT1 = 5.75, LH = GY + 0.35; // levee toe, top, top height
  hex("levee", [[LX0, GY, -D / 2], [LX1, GY, -D / 2], [LX1, GY, D / 2], [LX0, GY, D / 2],
    [LT0, LH, -D / 2], [LT1, LH, -D / 2], [LT1, LH, D / 2], [LT0, LH, D / 2]]);
  quad("path", [5.0, LH + 0.004, -D / 2 + 0.02], [5.5, LH + 0.004, -D / 2 + 0.02], [5.45, LH + 0.004, D / 2 - 0.02], [4.98, LH + 0.004, D / 2 - 0.02], [5.2, 0, 0]);
  const leveeY = (x) => x <= LX0 ? GY : x < LT0 ? GY + ((x - LX0) / (LT0 - LX0)) * 0.35 : x <= LT1 ? LH : x < LX1 ? LH - ((x - LT1) / (LX1 - LT1)) * 0.35 : GY;

  // ---------- straw stacks (nio) ----------
  const STACKS = [[-5.3, 0.6, 1.0], [3.4, -3.4, 0.9]];
  for (const [sx, sz, s] of STACKS) {
    lathe("straw", [[0, 0], [0.5, 0], [0.58, 0.35], [0.56, 0.75], [0.42, 1.1], [0.2, 1.3], [0, 1.34]].map(([r, y]) => [r * s, y * s]), 12, sx, sz, GY - 0.01);
    lathe("wood", [[0.47, 0.98], [0.5, 0.98], [0.47, 1.06], [0.44, 1.06]].map(([r, y]) => [r * s, y * s]), 12, sx, sz, GY);
    lathe("straw", [[0, 1.2], [0.36, 1.18], [0.3, 1.26], [0.12, 1.42], [0, 1.52]].map(([r, y]) => [r * s, y * s]), 12, sx, sz, GY);
  }

  // ---------- stubble ----------
  const SCARE = [4.0, -1.0];
  for (let j = 0, z = -3.75; z < 3.8; j++, z += 0.5)
    for (let i = 0, x = -5.85; x < LX0 - 0.15; i++, x += 0.24) {
      const px = x + (hash(i, j) - 0.5) * 0.06, pz = z + (hash(j, i, 1) - 0.5) * 0.06;
      if (STACKS.some(([sx, sz, s]) => Math.hypot(px - sx, pz - sz) < 0.62 * s) || Math.hypot(px - SCARE[0], pz - SCARE[1]) < 0.12) continue;
      const r = 0.03 + hash(i, j, 2) * 0.012, h = 0.05 + hash(i, j, 3) * 0.03, t = hash(i, j, 4) * 2;
      const P = (k) => [px + r * Math.sin(t + (k * 2 * Math.PI) / 3), GY - 0.005, pz + r * Math.cos(t + (k * 2 * Math.PI) / 3)];
      tetra("stubble", P(0), P(1), P(2), [px, GY + h, pz], 3);
    }

  // ---------- racks ----------
  const PITCH = 0.34;
  function sheaf(x, yb, zr, s) { // s: jitter seed; local rack coordinates (bar along x, ear side +z)
    const j = (k) => hash(s, k) - 0.5;
    const Lf = 0.46 + j(1) * 0.08, Lb = 0.36 + j(2) * 0.06, sw = 1 + j(3) * 0.12, lean = j(4) * 0.05;
    const A = [x + lean, yb - Lf, zr + 0.1], M = [x + lean * 0.5, yb - Lf * 0.5, zr + 0.15];
    const T = [x, yb + 0.05, zr], Dd = [x + lean * 0.5, yb - Lb, zr - 0.13];
    const ex = [1, 0, 0];
    const rg = (cc, tng, a, b) => ring(cc, ex, nrm(cross(nrm(tng), ex)), a, b, 8, Math.PI / 8);
    loft("sheaf", [rg(A, sub(M, A), 0.095 * sw, 0.07), rg(M, sub(T, A), 0.13 * sw, 0.09), rg(T, [0, 0, -1], 0.07 * sw, 0.05), rg(Dd, sub(Dd, T), 0.11 * sw, 0.07)]);
    for (const dx of [-0.07, 0, 0.07]) { // drooping ears fanning out of the ear-side end
      const o = [A[0] + dx * sw, A[1] + 0.05, A[2] + 0.01];
      tetra("ear", add(o, [-0.03, 0, -0.025]), add(o, [0.03, 0, -0.025]), add(o, [0, 0, 0.04]),
        [o[0] + dx * 1.2 + lean, A[1] - 0.13 - Math.abs(j(5 + dx * 40)) * 0.06, A[2] + 0.05]);
    }
  }
  // a rack of length L centred on (cx, cz), its face turned YAW toward +X so the three-quarter camera sees it square-ish
  const YAW = (30 * Math.PI) / 180;
  function rack(cx, cz, L, tiers, seed) {
    const cyw = Math.cos(YAW), syw = Math.sin(YAW);
    X = (p) => [cx + p[0] * cyw + p[2] * syw, p[1], cz - p[0] * syw + p[2] * cyw];
    const x0 = -L / 2, x1 = L / 2;
    const bars = [0.85, 1.45, 2.05].slice(0, tiers), top = bars[tiers - 1] + 0.25;
    const n = Math.ceil((x1 - x0) / 1.8), poles = Array.from({ length: n + 1 }, (_, i) => x0 + ((x1 - x0) * i) / n);
    for (const px of poles) pole("wood", [px, 0.02, 0], [px, top, 0], 0.05, 0.04);
    for (const xe of [x0, x1]) pole("wood", [xe, top - 0.2, -0.03], [xe + (xe === x0 ? -0.15 : 0.15), 0.02, -0.9], 0.035);
    bars.forEach((yb, t) => {
      pole("wood", [x0 - 0.2, yb, 0], [x1 + 0.2, yb, 0], 0.032);
      for (let i = 0, x = x0 + 0.18 + (t % 2) * PITCH / 2; x < x1 - 0.1; i++, x += PITCH) {
        if (poles.some((p) => Math.abs(p - x) < 0.13)) continue;
        sheaf(x, yb, 0, seed * 1000 + t * 100 + i);
      }
    });
    X = (p) => p;
  }
  const RACKS = [[0.2, 0.0, 5.4, 3], [-2.7, -1.75, 5.2, 3], [-4.1, 2.75, 2.8, 2]];
  RACKS.slice(0, racks).forEach(([x, z, L, t], i) => rack(x, z, L, t, i + 1));

  // ---------- scarecrow (kakashi) ----------
  {
    const yaw = (35 * Math.PI) / 180, cy = Math.cos(yaw), sy = Math.sin(yaw);
    X = (p) => [SCARE[0] + p[0] * cy + p[2] * sy, p[1], SCARE[1] - p[0] * sy + p[2] * cy];
    box("wood", 0, 0.82, 0, 0.07, 1.64, 0.07); // post
    box("wood", 0, 1.32, 0, 1.36, 0.06, 0.06); // crossbar
    hex("kimono", [[-0.25, 0.72, -0.13], [0.25, 0.72, -0.13], [0.25, 0.72, 0.13], [-0.25, 0.72, 0.13],
      [-0.21, 1.39, -0.1], [0.21, 1.39, -0.1], [0.21, 1.39, 0.1], [-0.21, 1.39, 0.1]]);
    for (const s of [-1, 1]) { // hanging rectangular sleeves along the bar
      const xa = s * 0.19, xb = s * 0.62;
      hex("kimono", [[xa, 0.96, -0.06], [xb, 0.98, -0.06], [xb, 0.98, 0.06], [xa, 0.96, 0.06],
        [xa, 1.38, -0.07], [xb, 1.37, -0.07], [xb, 1.37, 0.07], [xa, 1.38, 0.07]]);
      // straw out of the cuff
      const cx = s * 0.62;
      for (const [dy, dz] of [[0, 0], [-0.05, 0.03], [0.04, -0.02]])
        tetra("straw", [cx - s * 0.02, 1.32 + dy - 0.04, dz - 0.03], [cx - s * 0.02, 1.32 + dy + 0.04, dz - 0.03], [cx - s * 0.02, 1.32 + dy, dz + 0.04], [cx + s * 0.2, 1.3 + dy * 2.5, dz * 2]);
    }
    // straw hanging under the hem
    for (let k = 0; k < 7; k++) {
      const x = -0.2 + k * 0.066, z = 0.06 * Math.sin(k * 2.1);
      tetra("straw", [x - 0.03, 0.75, z - 0.04], [x + 0.03, 0.75, z - 0.04], [x, 0.75, z + 0.05], [x * 1.3, 0.56 + hash(k, 9) * 0.06, z * 1.4]);
    }
    // collar V, obi, patch (proud of the front face)
    const fz = (y) => 0.13 - ((y - 0.72) / 0.67) * 0.03 + 0.012; // the torso front at height y
    for (const s of [-1, 1]) {
      const a = [s * 0.08, 1.39, fz(1.39)], b = [s * 0.02, 1.12, fz(1.12)];
      hex("pale", [add(a, [-0.03, 0, -0.03]), add(a, [0.03, 0, -0.03]), add(b, [0.03, 0, -0.03]), add(b, [-0.03, 0, -0.03]),
        add(a, [-0.03, 0, 0.008]), add(a, [0.03, 0, 0.008]), add(b, [0.03, 0, 0.008]), add(b, [-0.03, 0, 0.008])]);
    }
    box("lily", 0, 1.04, 0, 0.47, 0.1, 0.25);
    box("path", -0.1, 0.86, fz(0.86) - 0.004, 0.12, 0.11, 0.014);
    // sack head, face marks, neck tie
    const HY = 1.6;
    lathe("pale", [[0, -0.15], [0.07, -0.13], [0.12, -0.08], [0.14, 0], [0.12, 0.08], [0.07, 0.13], [0, 0.15]], 10, 0, 0, HY);
    lathe("mark", [[0.05, -0.17], [0.07, -0.15], [0.065, -0.12], [0.045, -0.13]], 8, 0, 0, HY);
    for (const s of [-1, 1]) box("mark", s * 0.048, HY + 0.02, 0.128, 0.026, 0.026, 0.02);
    box("mark", 0, HY - 0.065, 0.118, 0.07, 0.014, 0.02);
    // conical straw hat
    lathe("straw", [[0, 0.36], [0.1, 0.3], [0.3, 0.17], [0.31, 0.155], [0.12, 0.2], [0, 0.22]], 14, 0, 0, HY - 0.02);
    X = (p) => p;
  }

  // ---------- handcart on the levee path ----------
  {
    // local: axle along X at y = R, bed toward -Z, shafts toward +Z; then tilted about the axle so the shaft
    // ends rest on the path, turned 12 deg, set on the levee top.
    const R = 0.3, tipZ = 1.45, tipY = 0.42;
    const th = Math.atan2(tipY - (-R + 0.03), tipZ); // pitch that drops the shaft tips to the path
    const ct = Math.cos(th), st = Math.sin(th), yaw = (-12 * Math.PI) / 180, cyw = Math.cos(yaw), syw = Math.sin(yaw);
    const tilt = (p) => { const y = p[1] - R, z = p[2]; return [p[0], R + y * ct - z * st, y * st + z * ct]; };
    const place = (p) => [5.22 + p[0] * cyw + p[2] * syw, LH + p[1], -2.3 - p[0] * syw + p[2] * cyw];
    X = (p) => place(tilt(p));
    box("pale", 0, 0.42, -0.05, 0.78, 0.04, 1.1); // bed
    for (const s of [-1, 1]) box("pale", s * 0.37, 0.52, -0.05, 0.04, 0.16, 1.1); // side rails
    box("pale", 0, 0.52, -0.58, 0.78, 0.16, 0.04); // tail board
    for (const s of [-1, 1]) box("wood", s * 0.33, 0.38, 0.25, 0.05, 0.05, 2.2); // shafts under the bed, out to the tips
    box("wood", 0, 0.38, 1.3, 0.72, 0.045, 0.045); // grip bar
    box("wood", 0, R, 0, 1.0, 0.05, 0.05); // axle
    X = (p) => place(p); // wheels stay upright
    for (const s of [-1, 1]) {
      const wx = s * 0.47, n = 12;
      for (let k = 0; k < n; k++) { // rim: an annular prism
        const a0 = (k * 2 * Math.PI) / n, a1 = ((k + 1) * 2 * Math.PI) / n;
        const P = (a, r, dx) => [wx + dx, R + r * Math.cos(a), r * Math.sin(a)];
        hex("wood", [P(a0, 0.25, -0.03), P(a1, 0.25, -0.03), P(a1, 0.3, -0.03), P(a0, 0.3, -0.03),
          P(a0, 0.25, 0.03), P(a1, 0.25, 0.03), P(a1, 0.3, 0.03), P(a0, 0.3, 0.03)]);
      }
      for (let k = 0; k < 5; k++) { const a = (k * 2 * Math.PI) / 5 + 0.3; pole("wood", [wx, R, 0], [wx, R + 0.26 * Math.cos(a), 0.26 * Math.sin(a)], 0.015, 0.015, 4); }
      box("wood", wx, R, 0, 0.1, 0.08, 0.08); // hub
    }
    X = (p) => place(tilt(p));
    // two sheaves lying in the bed
    for (const dx of [-0.17, 0.17]) {
      const rg = (z, y, a, b) => ring([dx, y, z], [1, 0, 0], [0, 1, 0], a, b, 6, Math.PI / 6);
      loft("sheaf", [rg(-0.5, 0.53, 0.1, 0.07), rg(0, 0.56, 0.08, 0.06), rg(0.45, 0.55, 0.13, 0.075)]);
    }
    X = (p) => p;
  }

  // ---------- higanbana ----------
  function lily(bx, bz, h, s) {
    const by = leveeY(bx) - 0.02, j = (k) => hash(s, k) - 0.5;
    const top = [bx + j(1) * 0.06, by + h, bz + j(2) * 0.06];
    tetra("mark", [bx - 0.007, by, bz - 0.005], [bx + 0.007, by, bz - 0.005], [bx, by, bz + 0.008], add(top, [0, 0.01, 0]));
    const rot = j(3) * 2;
    for (let k = 0; k < 6; k++) {
      const a = rot + (k * Math.PI) / 3, d = [Math.cos(a), 0, Math.sin(a)], q = [-d[2], 0, d[0]];
      // petal: out and down, the tip curled back up
      const tip = add(top, add(mul(d, 0.075), [0, 0.0, 0]));
      tetra("lily", add(top, mul(q, 0.012)), add(top, mul(q, -0.012)), add(top, add(mul(d, 0.045), [0, -0.022, 0])), add(tip, [0, 0.025, 0]));
      // stamen: long, out and sweeping up
      const a2 = a + Math.PI / 6, d2 = [Math.cos(a2), 0, Math.sin(a2)], q2 = [-d2[2], 0, d2[0]];
      tetra("lily", add(top, mul(q2, 0.004)), add(top, mul(q2, -0.004)), add(top, add(mul(d2, 0.07), [0, 0.03, 0])), add(top, add(mul(d2, 0.12), [0, 0.1, 0])));
    }
  }
  const LILIES = [
    [5.82, 0.35, 0.38], [5.9, 0.62, 0.42], [5.78, 0.8, 0.36], [5.86, 1.02, 0.44], [5.95, 1.2, 0.34], [5.8, 1.38, 0.4],
    [5.9, 1.6, 0.37], [5.83, 1.86, 0.43], [5.92, 2.1, 0.36], [5.8, 0.55, 0.33],
    [4.6, 3.0, 0.38], [4.68, 3.25, 0.42], [4.55, 3.45, 0.35], [4.72, 3.62, 0.4], [4.6, 3.8, 0.37],
  ];
  LILIES.forEach(([x, z, h], i) => lily(x, z, h, i + 1));

  // ---------- meshes ----------
  const MAT = { // base, shade, threshold, outline px (0 = no ink)
    mud: [c.mud, c.mudShade, 0.35, 3],
    stubble: [c.stubble, c.stubbleShade, 0.35, 0],
    levee: [c.levee, c.leveeShade, -0.2, 3],
    path: [c.path, c.path, 0.1, 0],
    wood: [c.wood, c.woodShade, 0.35, 2],
    sheaf: [c.sheaf, c.sheafShade, 0.25, 1.5],
    ear: [c.ear, c.earShade, -0.3, 1],
    straw: [c.straw, c.strawShade, 0.2, 2.5],
    kimono: [c.kimono, c.kimonoShade, 0.2, 2.5],
    pale: [c.pale, c.paleShade, -0.25, 2],
    mark: [c.mark, c.mark, 0.1, 0],
    lily: [c.lily, c.lilyShade, 0.0, 1],
  };
  for (const [key, arr] of Object.entries(soups)) {
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
