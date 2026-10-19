// gassho.js - a gassho-zukuri farmhouse from a snowy mountain village (the Shirakawa-go winter set piece), static.
// Contract: harness/lab/README.md. Meters, +Y up, the entrance gable faces +Z, its left is +X (the lit long side),
// the snow patch stands on y = 0, centred on x = 0, z = 0.
//
// Construction (triangle soups merged per material: 13 meshes in winter, 11 in summer; snow is smooth-normalled,
// everything built from planes is flat-shaded so it reads crisp):
//   ROOF     the steep A-frame (60 deg, the "praying hands"): each slope is one convex slab (a hexahedron) with the
//            outer face at 60 deg, 0.9 m of thatch thickness, the eave cut square to the slope and both gables cut
//            flat 1.1 m beyond the walls, so the thick thatch edge shows as a band on every side. Thatch courses are
//            dark strips laid along the slopes (summer) and across the gable cut faces (the layered bands, seen in
//            both seasons); a timber ridge beam with crossed ridge sticks (the X's that stay above the snow).
//   BODY     one pentagonal timber prism whose top hides 0.2 m inside the thatch: low long-side walls under the eaves
//            and the tall gable wall, inset under the gable overhang. Gable beams at each floor and posts are inked
//            boxes 5-6 cm proud; shoji windows per floor shrink with the gable (4, 3, 2, 1), some lit.
//            The entrance: a lit shoji door under a small board canopy on two brackets.
//   SNOW     a pillow sheet on each slope (thickness tapering to -5 cm at its borders, so its edges bury in the thatch),
//            a ridge roll, a slab on the canopy; icicles (4-sided cones, lengths from a sine hash) under both eaves.
//            The ground is one heightfield: base snow, drifts banked against the walls and piled under the eaves
//            (where the roof sheds), a cleared path from the door to the field, falling to y = 0 at the rim.
//   FIELD    a strip of six rice paddies in front: flat snow-white beds between raised bunds (aze), rows of stubble.
//   TREES    two bare deciduous trees: tapered closed tubes from fixed branching tables (depth 3), tips to points.
//   Every closed part is wound from a point inside it or from its own surface normal, never by hand.
// Proportions (real size, base unit the wall half-width W = 4.5 m): walls 9.0 x 12.0 m; thatch eave at x = 5.6
//   (1.1 overhang), outer eave edge 3.2 m, eave underside 2.75 m, ridge 12.9 m (2.87 W), ridge sticks to 13.8 m;
//   gable floors at 3.0 / 5.3 / 7.4 / 9.2 m. Under-eave drifts ~1.3 m, base snow 0.3 m. Field 18.4 x 5.9 m.
//   Trees ~6.5-7 m. Site 22 x 25.5 m.
// Options: build(THREE, kit, colors, { height, snow }).
//   height  scales the whole set uniformly so the top is `height` (default meta.height).
//   snow    true (default): winter dusk. false: the summer look in the same script: bare thatch with its courses,
//           the ground a warm dusk earth, the paddies flooded (sky-bright water), no snow, no icicles.
// Budget: ~10.3k triangles and 13 meshes (winter), ~7.3k and 11 (summer).
// Colours (indigo, base / shade):
//   thatch    iris #e7a04a / accent #e23b4a (the straw lit by the last warm light; its dusk side reddens)
//   lines     sky #1b2d6b flat (thatch courses and layers); soffit hair #16141c flat (the thatch underside, deep shadow)
//   timber    sky #1b2d6b / hair #16141c (dark timber walls, beams, posts, canopy, the trees: indigo has no brown)
//   timberLn  hair #16141c flat (window frames' lattice on dark paper, stubble)
//   lit shoji practical #f0c36a flat with iris #e7a04a kumiko; dark shoji moon #d5e2ff / line #e7eefc
//   roofSnow  sclera #f6f3ee / moon #d5e2ff;  ground snow line #e7eefc / moon (a cooler white than the roof)
//   field     moon / line (snow beds, or summer water); stone moon / sky; icicles line / moon, no hull
//   summer ground skin #f0c2ae / iris #e7a04a

export const meta = {
  name: "gassho",
  height: 13.8,
  script: "indigo",
  colors: {
    thatch: "#e7a04a", thatchShade: "#e23b4a",
    thatchLine: "#1b2d6b", soffit: "#16141c",
    timber: "#1b2d6b", timberShade: "#16141c",
    timberLine: "#16141c",
    paperLit: "#f0c36a", gridLit: "#e7a04a",
    paper: "#d5e2ff", paperShade: "#e7eefc",
    snow: "#f6f3ee", snowShade: "#d5e2ff",
    ground: "#e7eefc", groundShade: "#d5e2ff",
    field: "#d5e2ff", fieldShade: "#e7eefc",
    stone: "#d5e2ff", stoneShade: "#1b2d6b",
    ice: "#e7eefc", iceShade: "#d5e2ff",
    earth: "#f0c2ae", earthShade: "#e7a04a",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, snow = true } = opts;
  const root = new THREE.Group();
  root.name = "gassho";
  const set = new THREE.Group(); // the uniform size scale lives here, so root stays the plain contract node
  set.name = "set";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = {};
  const hash = (i) => { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  // one triangle wound away from `ref` (a point inside the solid); slivers dropped
  function tri(key, a, b, e, ref) {
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-9) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    S(key).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  // a triangle / quad wound so its normal points along `out`
  const triN = (key, a, b, e, out) => tri(key, a, b, e, sub(a, out));
  const quadN = (key, a, b, e, d, out) => (triN(key, a, b, e, out), triN(key, a, e, d, out));
  // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
  // `key` may be an array of six keys, one per face (the faces in the order below)
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]].forEach((f, i) =>
      quad(Array.isArray(key) ? key[i] : key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref));
  }
  function box(key, cx, cy, cz, sx, sy, sz) {
    const [x0, x1, y0, y1, z0, z1] = [cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2];
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // a beam from a to b, w wide and h tall, its height along `up`
  function beam(key, a, b, w, h, up = [0, 1, 0]) {
    const d = sub(b, a);
    const s = nrm(cross(d, up)), u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // convex prism along z from a polygon in (x, y)
  function prism(key, poly, z0, z1) {
    const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    const ref = [cx, cy, (z0 + z1) / 2];
    poly.forEach((p, i) => {
      const q = poly[(i + 1) % poly.length];
      quad(key, [p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z1], [p[0], p[1], z1], ref);
      tri(key, [p[0], p[1], z0], [q[0], q[1], z0], [cx, cy, z0], ref);
      tri(key, [p[0], p[1], z1], [q[0], q[1], z1], [cx, cy, z1], ref);
    });
  }
  // a closed tapered tube along points with radii (0 = a point), `sides` around
  function tube(key, pts, rad, sides = 5) {
    const rings = pts.map((p, i) => {
      const d = nrm(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
      const t = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const u = nrm(cross(d, t)), v = cross(d, u);
      return Array.from({ length: sides }, (_, k) => {
        const a = (k / sides) * Math.PI * 2;
        return add(p, add(mul(u, Math.cos(a) * rad[i]), mul(v, Math.sin(a) * rad[i])));
      });
    });
    for (let i = 0; i + 1 < pts.length; i++) {
      const ref = mul(add(pts[i], pts[i + 1]), 0.5);
      for (let k = 0; k < sides; k++) {
        const k1 = (k + 1) % sides;
        quad(key, rings[i][k], rings[i][k1], rings[i + 1][k1], rings[i + 1][k], ref);
      }
    }
    for (const [i, j] of [[0, 1], [pts.length - 1, pts.length - 2]]) {
      if (rad[i] < 1e-4) continue;
      const ref = add(pts[i], mul(sub(pts[j], pts[i]), 0.05));
      for (let k = 0; k < sides; k++) tri(key, rings[i][k], rings[i][(k + 1) % sides], pts[i], ref);
    }
  }

  // ---------- dimensions ----------
  const W = 4.5, ZB = -9, ZF = 3; // walls: x in [-W, W], z in [ZB, ZF]
  const K = Math.tan(Math.PI / 3); // 60 deg
  const XE = 5.6, YE = 3.2, T = 0.9; // outer eave edge, thatch thickness
  const YA = YE + XE * K; // outer ridge 12.9
  const YI = YA - 2 * T; // inner apex (vertical offset T / cos 60)
  const ZT0 = ZB - 1.1, ZT1 = ZF + 1.1; // thatch gable cuts
  const SN = [Math.sin(Math.PI / 3), Math.cos(Math.PI / 3)]; // slope outward normal (x, y) on the +X side
  const yIn = (x) => YI - Math.abs(x) * K; // underside of the thatch
  const halfAt = (y) => Math.min(W, (YI - y) / K); // gable wall half-width at height y
  const XI = XE - T * SN[0], YEI = YE - T * SN[1]; // inner eave point (4.82, 2.75)

  // ---------- roof ----------
  for (const s of [1, -1]) {
    const P = (x, y, z) => [s * x, y, z];
    hex(["thatch", "thatch", "thatch", "soffit", "soffit", "thatch"], [P(XE, YE, ZT0), P(0, YA, ZT0), P(0, YI, ZT0), P(XI, YEI, ZT0),
      P(XE, YE, ZT1), P(0, YA, ZT1), P(0, YI, ZT1), P(XI, YEI, ZT1)]);
    // layered bands across the gable cut faces: strips parallel to the slope inside the thickness
    for (const z of [ZT0 - 0.012, ZT1 + 0.012]) {
      const out = [0, 0, Math.sign(z)];
      for (const f of [0.3, 0.62]) {
        const o = T * f, w = 0.07;
        const A = (t, oo) => P(XE - oo * SN[0] - t * 0.5, YE - oo * SN[1] + t * SN[0], z);
        const L = (XE - o * SN[0]) / 0.5 - 0.6;
        quadN("thatchLine", A(0.05, o - w), A(0.05, o + w), A(L, o + w), A(L, o - w), out);
      }
    }
    // a course line along the eave cut face (seen under the snow), and courses up the slope (summer)
    {
      const m = 0.5 * T, out = [s * 0.5, -SN[0], 0];
      const E = (t, z) => P(XE - t * SN[0] + 0.01 * 0.5, YE - t * SN[1] - 0.01 * SN[0], z);
      quadN("thatchLine", E(m - 0.06, ZT0), E(m + 0.06, ZT0), E(m + 0.06, ZT1), E(m - 0.06, ZT1), out);
    }
    for (let u = 1.5; u < 10.5 && !snow; u += 1.5) {
      const out = [s * SN[0], SN[1], 0];
      const Q = (uu, z) => P(XE - uu * 0.5 + 0.015 * SN[0], YE + uu * SN[0] + 0.015 * SN[1], z);
      quadN("thatchLine", Q(u - 0.07, ZT0 + 0.02), Q(u + 0.07, ZT0 + 0.02), Q(u + 0.07, ZT1 - 0.02), Q(u - 0.07, ZT1 - 0.02), out);
    }
  }
  // ridge beam and crossed ridge sticks
  box("timber", 0, YA + 0.05, (ZT0 + ZT1) / 2, 0.5, 0.4, ZT1 - ZT0 - 0.3);
  for (let z = ZT0 + 0.9; z < ZT1 - 0.5; z += 1.55)
    for (const s of [1, -1]) beam("timber", [s * 0.3, YA + 0.15, z], [-s * 0.42, YA + 0.85, z], 0.13, 0.13, [0, 0, 1]);

  // ---------- body ----------
  prism("timber", [[-W, 0], [W, 0], [W, yIn(W) + 0.2], [0, YI + 0.2], [-W, yIn(W) + 0.2]], ZB, ZF);
  box("stone", 0, 0.18, (ZB + ZF) / 2, 2 * W + 0.16, 0.36, ZF - ZB + 0.16);

  // wall faces: local (u along the wall, y, o out of the wall) -> world
  const face = (side, at) => ({
    p: (u, y, o) => side === "+z" ? [u, y, at + o] : side === "-z" ? [-u, y, at - o] : side === "+x" ? [at + o, y, -u] : [at - o, y, u],
    s: (w, h, d) => (side[1] === "z" ? [w, h, d] : [d, h, w]),
    out: side === "+z" ? [0, 0, 1] : side === "-z" ? [0, 0, -1] : side === "+x" ? [1, 0, 0] : [-1, 0, 0],
  });
  const wbox = (key, f, u, y, o, w, h, d) => box(key, ...f.p(u, y, o), ...f.s(w, h, d));
  const wquad = (key, f, u, y, o, w, h) =>
    quadN(key, f.p(u - w / 2, y - h / 2, o), f.p(u + w / 2, y - h / 2, o), f.p(u + w / 2, y + h / 2, o), f.p(u - w / 2, y + h / 2, o), f.out);
  // a shoji: inked timber frame, paper, kumiko grid [vertical, horizontal]
  function shoji(f, u, y0, w, h, lit, bars = [3, 3]) {
    const yc = y0 + h / 2;
    wbox("timber", f, u, yc, 0.03, w + 0.12, h + 0.12, 0.06);
    wquad(lit ? "paperLit" : "paper", f, u, yc, 0.065, w, h);
    const g = lit ? "gridLit" : "timberLine";
    for (let i = 1; i <= bars[0]; i++) wquad(g, f, u - w / 2 + (i * w) / (bars[0] + 1), yc, 0.072, 0.035, h);
    for (let j = 1; j <= bars[1]; j++) wquad(g, f, u, y0 + (j * h) / (bars[1] + 1), 0.072, w, 0.035);
  }
  // gable walls: floor beams, posts, shoji rows (lit pattern per floor)
  const FLOORS = [[3.5, 1.3, [1, 0, 1, 1]], [5.7, 1.2, [0, 1, 0]], [7.8, 1.0, [1, 0]], [9.45, 0.6, [0]]];
  for (const [side, zf, front] of [["+z", ZF, true], ["-z", ZB, false]]) {
    const f = face(side, zf);
    for (const y of [0.42, 3.05, 5.3, 7.4, 9.2]) {
      const hw = halfAt(y + 0.09) - 0.02;
      wbox("timber", f, 0, y, 0.03, 2 * hw, 0.18, 0.08);
    }
    for (const x of [-W + 0.08, -1.5, 1.5, W - 0.08]) {
      const top = yIn(Math.abs(x) + 0.08) - 0.02;
      wbox("timber", f, x, top / 2, 0.025, 0.16, top, 0.06);
    }
    for (const [y0, h, lit] of FLOORS) {
      const n = lit.length, hw = halfAt(y0 + h) - 0.25, w = (2 * hw) / n;
      lit.forEach((l, i) => shoji(f, -hw + w * (i + 0.5), y0, w - 0.22, h, front ? !!l : i === 1, [2, 2]));
    }
    if (front) {
      shoji(f, -1.9, 0.5, 1.5, 1.9, true, [1, 4]); // the entrance door, lit
      shoji(f, 2.6, 1.15, 2.2, 1.25, true, [4, 2]);
    } else shoji(f, 1.2, 1.15, 2.0, 1.25, false, [4, 2]);
  }
  // long sides: a shoji row under the eaves
  for (const [side, x0, pat] of [["+x", W, [1, 0, 1, 1, 0, 1, 0]], ["-x", -W, [0, 0, 1, 0, 0, 0, 0]]]) {
    const f = face(side, x0);
    const top = yIn(W) - 0.05;
    const um = side === "+x" ? -(ZB + ZF) / 2 : (ZB + ZF) / 2;
    wbox("timber", f, um, top - 0.1, 0.03, ZF - ZB, 0.16, 0.08);
    wbox("timber", f, um, 1.0, 0.03, ZF - ZB, 0.14, 0.08);
    pat.forEach((l, i) => {
      const z = ZB + 0.9 + i * 1.7;
      shoji(f, side === "+x" ? -z : z, 1.15, 1.4, 1.25, !!l, [2, 2]);
    });
  }
  // entrance canopy: a board shed roof on two brackets
  const GX = -1.9, CZ = ZF + 1.25;
  hex("timber", [[GX - 1.25, 2.72, ZF], [GX + 1.25, 2.72, ZF], [GX + 1.25, 2.42, CZ], [GX - 1.25, 2.42, CZ],
    [GX - 1.25, 2.86, ZF], [GX + 1.25, 2.86, ZF], [GX + 1.25, 2.56, CZ], [GX - 1.25, 2.56, CZ]]);
  for (const s of [-1, 1]) beam("timber", [GX + s * 0.95, 2.0, ZF], [GX + s * 0.95, 2.5, CZ - 0.25], 0.1, 0.1, [1, 0, 0]);

  // ---------- snow ----------
  if (snow) {
    const TS = 0.55;
    for (const s of [1, -1]) {
      const n = [s * SN[0], SN[1], 0];
      const L = XE / 0.5; // slope length to the ridge
      const NU = 16, NZ = 24, U0 = 0.45;
      const pt = (i, j) => {
        const u = U0 + (i / NU) * (L - U0), z = ZT0 + 0.12 + (j / NZ) * (ZT1 - ZT0 - 0.24);
        const wav = 0.18 * (1 + Math.sin(u * 1.4 + s)); // the snow edge wanders on the gable cuts
        const ez = smooth(wav, wav + 0.55, z - ZT0 - 0.12) * smooth(wav, wav + 0.55, ZT1 - 0.12 - z);
        const eu = smooth(0, 0.22, u - U0);
        const lump = 1 + 0.2 * Math.sin(z * 1.3 + s) * Math.sin(u * 0.8 + 0.5) + 0.12 * Math.sin(z * 3.1 + u * 2.3);
        const h = (TS * lump + 0.05) * ez * eu - 0.05;
        return add([s * (XE - u * 0.5), YE + u * SN[0], z], mul(n, h));
      };
      for (let i = 0; i < NU; i++)
        for (let j = 0; j < NZ; j++) quadN("snow", pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1), n);
    }
    // ridge roll, tapering into the gable ends
    const zs = [ZT0 + 0.15, ZT0 + 0.45, ZT0 + 0.9, ZT1 - 0.9, ZT1 - 0.45, ZT1 - 0.15];
    tube("snow", zs.map((z) => [0, YA + 0.02, z]), [0.0, 0.42, 0.55, 0.55, 0.42, 0.0], 8);
    // canopy slab
    hex("snow", [[GX - 1.2, 2.84, ZF], [GX + 1.2, 2.84, ZF], [GX + 1.18, 2.52, CZ - 0.02], [GX - 1.18, 2.52, CZ - 0.02],
      [GX - 1.1, 3.06, ZF], [GX + 1.1, 3.06, ZF], [GX + 1.1, 2.74, CZ - 0.1], [GX - 1.1, 2.74, CZ - 0.1]]);
    // icicles under both eaves and the canopy front
    let k = 0;
    for (const s of [1, -1])
      for (let z = ZT0 + 0.35; z < ZT1 - 0.3; z += 0.34, k++) {
        const len = 0.18 + 0.85 * hash(k) * hash(k + 91), r = 0.05 + 0.04 * hash(k + 7);
        const x = s * (XI + 0.04), y = YEI + 0.06;
        tube("ice", [[x, y + 0.06, z], [x, y - 0.04, z], [x, y - len, z]], [r, r, 0], 4);
      }
    for (let x = GX - 1.05; x < GX + 1.1; x += 0.3, k++) {
      const len = 0.15 + 0.45 * hash(k), y = 2.45;
      tube("ice", [[x, y + 0.05, CZ - 0.04], [x, y - 0.03, CZ - 0.04], [x, y - len, CZ - 0.04]], [0.045, 0.045, 0], 4);
    }
  }

  // ---------- ground ----------
  const GX0 = -11, GX1 = 11, GZ0 = -12.5, GZ1 = 13;
  const FIELD = { x0: -9.2, x1: 9.2, z0: 6.25, z1: 12.15 };
  const ground = (x, z) => {
    const rim = smooth(0, 1.4, Math.min(x - GX0, GX1 - x, z - GZ0, GZ1 - z));
    if (!snow) return (0.08 + 0.03 * Math.sin(x * 1.3) * Math.sin(z * 1.1)) * rim;
    const dx = Math.max(0, Math.abs(x) - W), dz = Math.max(0, ZB - z, z - ZF), d = Math.hypot(dx, dz);
    let h = 0.3 + 0.06 * Math.sin(x * 1.3) * Math.sin(z * 1.1);
    h += 0.55 * Math.exp(-((d / 1.3) ** 2));
    const along = smooth(ZT0 - 1.2, ZT0 + 0.3, z) * smooth(ZT1 + 1.2, ZT1 - 0.3, z);
    h += 1.0 * Math.exp(-(((Math.abs(x) - 5.6) / 1.05) ** 2)) * along * (1 + 0.15 * Math.sin(z * 2.1));
    const path = (1 - smooth(0.55, 1.0, Math.abs(x - GX))) * smooth(ZF - 0.2, ZF + 0.3, z) * smooth(FIELD.z0 + 0.6, FIELD.z0, z);
    h = h * (1 - path) + 0.1 * path;
    return h * rim;
  };
  {
    const NX = 36, NZ = 42;
    const gp = (i, j) => { const x = GX0 + (i / NX) * (GX1 - GX0), z = GZ0 + (j / NZ) * (GZ1 - GZ0); return [x, ground(x, z), z]; };
    const gk = snow ? "ground" : "earth";
    for (let i = 0; i < NX; i++)
      for (let j = 0; j < NZ; j++) quadN(gk, gp(i, j), gp(i + 1, j), gp(i + 1, j + 1), gp(i, j + 1), [0, 1, 0]);
    quadN(gk, [GX0, 0, GZ0], [GX1, 0, GZ0], [GX1, 0, GZ1], [GX0, 0, GZ1], [0, -1, 0]);
  }

  // ---------- rice field ----------
  {
    const gy = snow ? 0.3 : 0.08; // the ground level under the field
    const bundKey = snow ? "ground" : "earth";
    const bund = (a, b) => { // a raised bund from a to b (on y = 0), trapezoid section
      const d = nrm(sub(b, a)), s = [-d[2], 0, d[0]];
      const P = (o, w, y) => add(o, add(mul(s, w), [0, y, 0]));
      hex(bundKey, [P(a, -0.32, Math.max(0, gy - 0.1)), P(a, 0.32, Math.max(0, gy - 0.1)), P(a, 0.18, gy + 0.24), P(a, -0.18, gy + 0.24),
        P(b, -0.32, Math.max(0, gy - 0.1)), P(b, 0.32, Math.max(0, gy - 0.1)), P(b, 0.18, gy + 0.24), P(b, -0.18, gy + 0.24)]);
    };
    const xs = [FIELD.x0, -3.05, 3.05, FIELD.x1], zs = [FIELD.z0, 9.2, FIELD.z1];
    for (const z of zs) bund([FIELD.x0 - 0.25, 0, z], [FIELD.x1 + 0.25, 0, z]);
    for (const x of xs) bund([x, 0, FIELD.z0 - 0.25], [x, 0, FIELD.z1 + 0.25]);
    let k = 300;
    for (let a = 0; a < 3; a++)
      for (let b = 0; b < 2; b++) {
        const x0 = xs[a] + 0.2, x1 = xs[a + 1] - 0.2, z0 = zs[b] + 0.2, z1 = zs[b + 1] - 0.2;
        box("field", (x0 + x1) / 2, gy, (z0 + z1) / 2, x1 - x0, 0.1, z1 - z0);
        // stubble (or seedlings): rows of small dark spikes
        for (let z = z0 + 0.35; z < z1 - 0.2; z += 0.6)
          for (let x = x0 + 0.35; x < x1 - 0.2; x += 0.62, k++) {
            const p = [x + 0.1 * (hash(k) - 0.5), gy + 0.05, z + 0.1 * (hash(k + 3) - 0.5)], r = 0.05, hgt = snow ? 0.13 : 0.2;
            const tip = add(p, [0.02, hgt, 0.01]);
            const b0 = add(p, [-r, -0.03, -r]), b1 = add(p, [r, -0.03, -r * 0.4]), b2 = add(p, [0, -0.03, r]);
            const ref = add(p, [0, 0.02, 0]);
            tri("timberLine", b0, b1, tip, ref); tri("timberLine", b1, b2, tip, ref); tri("timberLine", b2, b0, tip, ref);
          }
      }
  }

  // ---------- trees: bare deciduous, fixed branching tables ----------
  // [tilt from the parent, turn around it, length ratio, where on the parent it starts]
  const KIDS = [[0.3, 0.0, 0.8, 1.0], [0.85, 2.3, 0.7, 0.62], [0.8, 4.4, 0.62, 0.8]];
  function branch(p, d, len, r, depth, seed) {
    const e = add(p, mul(d, len)), rEnd = depth === 0 ? 0 : r * 0.6;
    tube("timber", depth > 1 ? [p, add(p, mul(d, len * 0.5)), e] : [p, e], depth > 1 ? [r, (r + rEnd) / 2, rEnd] : [r, rEnd], depth > 1 ? 5 : 4);
    if (depth === 0) return;
    const t = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u = nrm(cross(d, t)), v = cross(d, u);
    KIDS.slice(0, depth >= 3 ? 3 : 2).forEach(([tilt, turn, ratio, at], i) => {
      const a = turn + seed * 1.7 + depth * 0.9;
      const side = add(mul(u, Math.cos(a)), mul(v, Math.sin(a)));
      const nd = nrm(add(mul(d, Math.cos(tilt)), mul(side, Math.sin(tilt))));
      const up = nrm(add(nd, [0, 0.35, 0])); // branches reach upward
      const pr = r + (rEnd - r) * at;
      branch(add(p, mul(d, len * at)), up, len * ratio, Math.min(pr, rEnd) * (i === 0 ? 1 : 0.75), depth - 1, seed + i * 3 + 1);
    });
  }
  for (const [x, z, h, seed] of [[-8.4, 3.6, 2.2, 1], [8.1, -9.6, 2.5, 4]]) {
    tube("timber", [[x, 0, z], [x + 0.05, h * 0.5, z], [x + 0.1, h, z + 0.05]], [0.27, 0.22, 0.19], 6);
    branch([x + 0.1, h - 0.05, z + 0.05], nrm([0.1, 1, 0.05]), 2.4, 0.19, 4, seed);
  }

  // ---------- meshes ----------
  const MAT = {
    thatch: [c.thatch, c.thatchShade, 0.25, true],
    soffit: [c.soffit, c.soffit, 0.1, true],
    thatchLine: [c.thatchLine, c.thatchLine, 0.1, false],
    timber: [c.timber, c.timberShade, 0.1, true],
    timberLine: [c.timberLine, c.timberLine, 0.1, false],
    paperLit: [c.paperLit, c.paperLit, -1, false],
    gridLit: [c.gridLit, c.gridLit, -1, false],
    paper: [c.paper, c.paperShade, 0.1, false],
    snow: [c.snow, c.snowShade, 0.25, true],
    ground: [c.ground, c.groundShade, 0.4, true],
    earth: [c.earth, c.earthShade, 0.4, true],
    field: [c.field, c.fieldShade, 0.1, true],
    stone: [c.stone, c.stoneShade, 0.1, true],
    ice: [c.ice, c.iceShade, 0.1, false],
  };
  const SMOOTH = new Set(["snow", "ground", "earth"]);
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    if (SMOOTH.has(key)) g.setAttribute("normal", kit.hullNormals(g).getAttribute("hullNormal"));
    const mesh = kit.toon(g, base, shade, { threshold, outline });
    mesh.name = key;
    set.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
