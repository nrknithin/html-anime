// mochitsuki.js - a New Year mochi-pounding set in a farmhouse yard (real size, about 7 x 5 m): a big wooden usu
// mortar with a white mochi mound and a long-handled kine mallet, steaming seiro on a wood-fired kamado, a low table
// with trays of round mochi (white and pink) and bowls of kinako and anko, a water bucket and ladle, straw mats, a
// woven bamboo fence with a gate, a kadomatsu pair by the gate and a bare persimmon tree with a few fruit.
// Contract: harness/lab/README.md. Meters, +Y up, the yard's open side faces +Z, its left is +X, stands on y = 0,
// centred on x = 0, z = 0.
//
// Construction (triangle soups merged per material, 12 meshes for the whole yard; every triangle is wound from an
// outward direction: the centre of its convex solid, or the profile normal of a lathe, never by hand):
//   GROUND  a 3 cm earth pad, 7 x 5 m; two straw mats (mushiro) on it with stripe lines, one under the usu and one
//           under the table. The hero camera looks from the front-left (+X +Z), so the set is laid out for it: the
//           usu front and centre, the table nearer on the left of the frame, the bucket at the usu's right (where
//           the helper kneels), the kamado behind it on the right, the tree at the right edge, the fence along the
//           back (-Z) and the -X side (the left of the frame, with the gate).
//   USU     a lathe: waisted wooden drum with a flat rim and a bowl cavity, two dark hoop bands. The mochi mound is
//           its own lathe (smooth dome) seated in the cavity and bulging 15 cm over the rim: white on dark wood.
//   KINE    a long handle and a big cylindrical head, built in the strike position (head face on the mochi, handle
//           rising 10 deg toward the pounder's hands). Raised, the head lifts over the mortar and the handle tips down
//           toward the (unseen) pounder on the front-left of the usu, so the swing plane is seen nearly square from
//           the hero camera. Scaled 1.12 with the usu and mochi (US): they carry the read.
//   KAMADO  a plaster stove with a dark top slab and an arched fire mouth (flames glow), an iron pot flange, three
//           seiro boxes and a lid with dark seam bands, firewood beside it. Faces the camera (yaw 52 deg).
//   TABLE   low dark table (yaw 52 deg, long side to the camera), two red lacquer trays of six round mochi each
//           (white, pink), a dark bowl of kinako and a white bowl of anko.
//   YARD    bucket (tapered lathe, two hoops, water disc) and a ladle; woven fence: pale panels on dark posts with
//           horizontal slat lines and staggered binding ticks (the over-under weave); a gate of two posts and a beam
//           in the -X fence; a kadomatsu each side (straw-bound base, three dark bamboo culms cut on the diagonal with
//           pale cut faces, pine sprigs, red berries); the persimmon tree, tapered tubes, bare, eight fruit.
// Proportions (real size; base unit the usu height U = 0.67 m): usu 0.76 across (1.13 U), mochi top 0.86 m; kine
//   handle 1.3 m (2 U), head 0.36 long x 0.25 across; kamado 0.9 x 0.7 x 0.7, seiro 0.5 square x 0.14 (three) to
//   1.33 m; table 1.3 x 0.62 x 0.36; round mochi 10 cm (a touch large so they survive the thumbnail); bowls 0.24;
//   bucket 0.34 x 0.32; fence 1.5 m, gate 1.95 m, kadomatsu 1.2 m; tree 3.03 m (meta.height).
// Options: build(THREE, kit, colors, { height }): scales the whole yard uniformly so the top is `height` (default
//   meta.height).
// Clips (build() returns clips; pose("pound@0.4")): pound (1.5 s, looping): the kine rises over 0.75 s (head up 1.0 m,
//   tipped 58 deg), hangs, strikes in 0.15 s, the mochi squashes (0.75 high, 1.15 wide) and springs
//   back while the kine bounces; steam puffs rise from the seiro lid and fade. All by vertex rewrite of three meshes
//   (kine, mochi mound, steam), positions, normals and hull normals, so no mesh is added per moving piece.
// Rest pose: the kine 70 % raised, ready to strike (the read: mallet over mortar).
// Colours (noon): earth, seiro, bucket, fence panels, kinako sky #f2d7ae / skin #f0c2ae; straw (mats, kadomatsu base,
//   kamado plaster, water, anko bowl) moon #fff6e4 / sky; wood (usu, kine, table, posts, gate, tree, culms, logs)
//   iris #5c3d32 / hair #241c16; dark (hoops, slab, pot, fire mouth, kinako bowl, anko, pine) hair flat; lines hair,
//   no hull; mochi and steam practical #fffaf2 / sclera #f6f3ee; pink mochi skin / sky; red (trays, persimmons,
//   berries) accent #c4452d / iris; flames accent, glowing. hair only touches ink in small parts.

export const meta = {
  name: "mochitsuki",
  height: 3.03,
  script: "noon",
  colors: {
    earth: "#f2d7ae", earthShade: "#f0c2ae",
    straw: "#fff6e4", strawShade: "#f2d7ae",
    wood: "#5c3d32", woodShade: "#241c16",
    dark: "#241c16", darkShade: "#241c16",
    line: "#241c16",
    mochi: "#fffaf2", mochiShade: "#f6f3ee",
    pink: "#f0c2ae", pinkShade: "#f2d7ae",
    red: "#c4452d", redShade: "#5c3d32",
    flame: "#c4452d",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height } = opts;
  const root = new THREE.Group();
  root.name = "mochitsuki";
  const yard = new THREE.Group();
  yard.name = "yard";
  yard.scale.setScalar(height / meta.height);
  root.add(yard);
  const joints = {};
  const PI = Math.PI, TAU = PI * 2, DEG = PI / 180;

  // ---------- vectors and triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const cen = (...q) => mul(q.reduce(add), 1 / q.length);
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [], o: [] });
  let XF = null; // placement: yaw about +Y then translate (x, z)
  let owner = -1; // group index for rewritten meshes (steam puffs)
  const xp = (q) => (XF ? [XF.x + q[0] * XF.c + q[2] * XF.s, q[1], XF.z - q[0] * XF.s + q[2] * XF.c] : q);
  const xn = (q) => (XF ? [q[0] * XF.c + q[2] * XF.s, q[1], -q[0] * XF.s + q[2] * XF.c] : q);
  function place(x, z, yaw, fn) {
    XF = { x, z, c: Math.cos(yaw * DEG), s: Math.sin(yaw * DEG) };
    fn();
    XF = null;
  }
  // one triangle wound so its normal points along `out`; per-vertex normals optional (else flat)
  function tri(key, a, b, e, out, na, nb, ne) {
    let n = cross(sub(b, a), sub(e, a));
    const L = Math.hypot(...n);
    if (L < 1e-10) return;
    n = mul(n, 1 / L);
    const flip = dot(n, out) < 0;
    if (flip) n = mul(n, -1);
    const s = S(key);
    const vs = flip ? [[a, na], [e, ne], [b, nb]] : [[a, na], [b, nb], [e, ne]];
    for (const [q, nq] of vs) s.p.push(...xp(q)), s.n.push(...xn(nq ?? n)), s.o.push(owner);
  }
  const triR = (key, a, b, e, ref) => tri(key, a, b, e, sub(cen(a, b, e), ref));
  const quad = (key, a, b, e, d, out) => (tri(key, a, b, e, out), tri(key, a, e, d, out));
  function hex(key, p) {
    const ref = cen(...p);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      triR(key, p[f[0]], p[f[1]], p[f[2]], ref), triR(key, p[f[0]], p[f[2]], p[f[3]], ref);
  }
  function box(key, x0, x1, y0, y1, z0, z1) {
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  const cbox = (key, x, y0, z, sx, sy, sz) => box(key, x - sx / 2, x + sx / 2, y0, y0 + sy, z - sz / 2, z + sz / 2);
  // a flat strip (line) from a to b, w wide, lying in the plane with normal `out`
  function strip(key, a, b, w, out) {
    const s = mul(nrm(cross(sub(b, a), out)), w / 2);
    quad(key, sub(a, s), sub(b, s), add(b, s), add(a, s), out);
  }
  // lathe about the vertical axis through c; prof [[r, y], ...] with the solid on the left of the walk, so the
  // outward normal of a segment is (dy, -dr). smooth averages the normals of neighbouring segments.
  function lathe(key, C, prof, seg = 12, smooth = false) {
    const m = prof.length, sn = [];
    for (let i = 0; i < m - 1; i++) {
      const dr = prof[i + 1][0] - prof[i][0], dy = prof[i + 1][1] - prof[i][1], l = Math.hypot(dr, dy) || 1;
      sn.push([dy / l, -dr / l]);
    }
    const vn = (i, j) => {
      if (!smooth) return sn[j];
      const a = sn[Math.max(0, i - 1)], b = sn[Math.min(m - 2, i)], l = Math.hypot(a[0] + b[0], a[1] + b[1]) || 1;
      return [(a[0] + b[0]) / l, (a[1] + b[1]) / l];
    };
    const P = (i, f) => [C[0] + prof[i][0] * Math.cos(f), C[1] + prof[i][1], C[2] + prof[i][0] * Math.sin(f)];
    const N = (q, f) => [q[0] * Math.cos(f), q[1], q[0] * Math.sin(f)];
    for (let j = 0; j < m - 1; j++)
      for (let k = 0; k < seg; k++) {
        const f0 = (k / seg) * TAU, f1 = ((k + 1) / seg) * TAU, out = N(sn[j], (f0 + f1) / 2);
        const [n00, n01, n10, n11] = [N(vn(j, j), f0), N(vn(j, j), f1), N(vn(j + 1, j), f0), N(vn(j + 1, j), f1)];
        tri(key, P(j, f0), P(j, f1), P(j + 1, f1), out, n00, n01, n11);
        tri(key, P(j, f0), P(j + 1, f1), P(j + 1, f0), out, n00, n11, n10);
      }
  }
  const cyl = (key, x, y0, z, r, h, seg = 12) => lathe(key, [x, y0, z], [[0, 0], [r, 0], [r, h], [0, h]], seg);
  function ellipsoid(key, C, rx, ry, seg = 10, rings = 6) {
    const prof = [];
    for (let i = 0; i <= rings; i++) {
      const t = -PI / 2 + (i / rings) * PI;
      prof.push([rx * Math.cos(t), ry * Math.sin(t)]);
    }
    prof[0][0] = prof[rings][0] = 0;
    lathe(key, C, prof, seg, true);
  }
  // a ring band hugging a lathe surface: radius r(y) at the surface, t proud, from y0 to y1
  const band = (key, C, y0, y1, r0, r1, t = 0.008, seg = 16) =>
    lathe(key, C, [[r0 - 0.01, y0], [r0 + t, y0], [r1 + t, y1], [r1 - 0.01, y1], [r0 - 0.01, y0]], seg);
  // tapered closed tube from a to b
  function tube(key, a, b, ra, rb, seg = 6) {
    const d = nrm(sub(b, a));
    const u = nrm(cross(d, Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), v = cross(d, u);
    const R = (o, r, f) => add(o, add(mul(u, r * Math.cos(f)), mul(v, r * Math.sin(f))));
    const rad = (f) => nrm(add(mul(u, Math.cos(f)), mul(v, Math.sin(f))));
    for (let k = 0; k < seg; k++) {
      const f0 = (k / seg) * TAU, f1 = ((k + 1) / seg) * TAU, fm = (f0 + f1) / 2;
      const [a0, a1, b0, b1] = [R(a, ra, f0), R(a, ra, f1), R(b, rb, f0), R(b, rb, f1)];
      if (rb > 1e-4) {
        tri(key, a0, a1, b1, rad(fm), rad(f0), rad(f1), rad(f1));
        tri(key, a0, b1, b0, rad(fm), rad(f0), rad(f1), rad(f0));
        tri(key, b, b0, b1, d);
      } else tri(key, a0, a1, b, rad(fm), rad(f0), rad(f1), d);
      tri(key, a, a0, a1, mul(d, -1));
    }
  }

  // ---------- layout (plan, metres) ----------
  const Y0 = 0.03; // top of the earth pad
  const YM = Y0 + 0.012; // top of a straw mat
  const U = [0.85, 0.7]; // usu centre
  const TB = [-0.5, 1.55]; // table
  const BK = [2.0, 0.42]; // bucket, where the helper kneels
  const KM = [1.15, -1.45]; // kamado
  const TR = [2.65, -1.55]; // persimmon tree
  const FZ = -2.42, FX = -3.42; // back fence plane, side fence plane
  const GZ = [0.15, 1.35]; // gate opening in the side fence
  const CAM = 52; // yaw that turns a part's front (+Z) to the hero camera

  // ground
  box("earth", -3.5, 3.5, 0, Y0, -2.5, 2.5);
  // straw mats with stripes
  function mat(x, z, yaw, w, d) {
    place(x, z, yaw, () => {
      box("straw", -w / 2, w / 2, Y0 - 0.005, YM, -d / 2, d / 2);
      for (let s = -w / 2 + 0.13; s < w / 2 - 0.06; s += 0.13) strip("line", [s, YM + 0.002, -d / 2 + 0.04], [s, YM + 0.002, d / 2 - 0.04], 0.012, [0, 1, 0]);
      for (const e of [-1, 1]) strip("line", [-w / 2 + 0.02, YM + 0.002, e * (d / 2 - 0.04)], [w / 2 - 0.02, YM + 0.002, e * (d / 2 - 0.04)], 0.02, [0, 1, 0]);
    });
  }
  mat(U[0] - 0.1, U[1] + 0.05, -18, 2.3, 1.8);
  mat(TB[0], TB[1], CAM, 1.7, 0.95);

  // ---------- usu and mochi ----------
  const UB = YM; // usu base
  const US = 1.12; // the usu, mochi and kine at the big end of real (0.76 m across): they carry the read
  const sc = (prof) => prof.map(([r, y]) => [r * US, y * US]);
  lathe("wood", [U[0], UB, U[1]], sc([
    [0, 0], [0.33, 0], [0.34, 0.03], [0.3, 0.2], [0.29, 0.32], [0.31, 0.5], [0.34, 0.57], [0.34, 0.6],
    [0.26, 0.6], [0.23, 0.55], [0.16, 0.47], [0, 0.43],
  ]), 20);
  band("dark", [U[0], UB, U[1]], 0.07 * US, 0.11 * US, 0.315 * US, 0.305 * US, 0.008, 20);
  band("dark", [U[0], UB, U[1]], 0.48 * US, 0.52 * US, 0.31 * US, 0.32 * US, 0.008, 20);
  const MB = [U[0], UB + 0.42 * US, U[1]]; // mochi mound base (squash origin)
  lathe("mound", MB, sc([
    [0, 0], [0.235, 0], [0.245, 0.1], [0.24, 0.16], [0.215, 0.22], [0.17, 0.27], [0.1, 0.3], [0, 0.31],
  ]), 18, true);
  const MH = 0.31 * US; // mound height

  // ---------- kine (built at the strike) ----------
  const KH = nrm([-0.88, 0, 0.47]); // horizontal toward the pounder
  const BETA = 10 * DEG, HR = 0.125, HL = 0.36;
  const kd = add(mul(KH, Math.cos(BETA)), [0, Math.sin(BETA), 0]); // handle direction, head to hands
  const ka = add(mul(KH, -Math.sin(BETA)), [0, Math.cos(BETA), 0]); // head axis (up)
  const SQ = 0.25; // squash at impact: top drops by SQ of the mound height
  const strikeY = MB[1] + MH * (1 - SQ);
  const HC = add([U[0], strikeY, U[1]], mul(ka, HL / 2 + HR * Math.sin(BETA) * 0.5));
  tube("kine", add(HC, mul(ka, -HL / 2)), add(HC, mul(ka, HL / 2)), HR, HR, 16);
  // slight bevel rings on both faces of the head
  tube("kine", add(HC, mul(ka, -HL / 2 - 0.012)), add(HC, mul(ka, -HL / 2 + 0.01)), HR * 0.9, HR, 16);
  tube("kine", add(HC, mul(ka, HL / 2 - 0.01)), add(HC, mul(ka, HL / 2 + 0.012)), HR, HR * 0.9, 16);
  tube("kine", HC, add(HC, mul(kd, 1.3)), 0.035, 0.03, 8);
    const KW = nrm(cross(KH, [0, 1, 0])); // swing axis

  // ---------- kamado, pot, seiro, firewood, steam ----------
  const KY = Y0 + 0.7; // kamado top
  place(KM[0], KM[1], CAM, () => {
    box("straw", -0.45, 0.45, Y0, KY - 0.03, -0.35, 0.35);
    box("straw", -0.48, 0.48, Y0, Y0 + 0.06, -0.38, 0.38); // plinth lip
    box("dark", -0.47, 0.47, KY - 0.03, KY, -0.37, 0.37);
    // fire mouth: arch, flames
    const fz = 0.355, w = 0.36, y0 = Y0 + 0.1, hs = 0.18;
    const arch = [[-w / 2, y0], [w / 2, y0]];
    for (let i = 0; i <= 8; i++) arch.push([(w / 2) * Math.cos((i / 8) * PI), y0 + hs + (w / 2) * Math.sin((i / 8) * PI)]);
    const ac = [0, y0 + hs * 0.8];
    for (let i = 0; i < arch.length; i++) {
      const p = arch[i], q = arch[(i + 1) % arch.length];
      tri("dark", [ac[0], ac[1], fz], [p[0], p[1], fz], [q[0], q[1], fz], [0, 0, 1]);
    }
    const fl = [[-0.12, 0.2], [-0.02, 0.27], [0.1, 0.21]];
    for (const [x, hgt] of fl) tri("flame", [x - 0.07, y0, fz + 0.006], [x + 0.07, y0, fz + 0.006], [x + 0.01, y0 + hgt, fz + 0.006], [0, 0, 1]);
    for (const [x, hgt] of fl) tri("mound0", [x - 0.03, y0, fz + 0.01], [x + 0.03, y0, fz + 0.01], [x + 0.005, y0 + hgt * 0.45, fz + 0.01], [0, 0, 1]);
    // firewood stacked by the stove
    for (const [x, y, z] of [[-0.75, 0.06, 0.1], [-0.75, 0.06, -0.08], [-0.75, 0.16, 0.01]]) tube("wood", [x - 0.0, Y0 + y, z + 0.0].map((v, i) => (i === 0 ? v - 0.22 : v)), [x + 0.22, Y0 + y, z], 0.055, 0.05, 7);
  });
  // pot flange and the seiro stack (round items need no yaw; boxes do)
  cyl("dark", KM[0], KY, KM[1], 0.27, 0.06, 16);
  lathe("dark", [KM[0], KY + 0.06, KM[1]], [[0, 0], [0.31, 0], [0.31, 0.025], [0, 0.025]], 16);
  const SY = KY + 0.085;
  place(KM[0], KM[1], CAM, () => {
    for (let i = 0; i < 3; i++) {
      const y = SY + i * 0.14;
      box("earth", -0.25, 0.25, y, y + 0.135, -0.25, 0.25);
      box("dark", -0.255, 0.255, y + 0.128, y + 0.142, -0.255, 0.255);
    }
    const ly = SY + 0.42;
    box("earth", -0.265, 0.265, ly, ly + 0.05, -0.265, 0.265);
    box("wood", -0.12, 0.12, ly + 0.05, ly + 0.08, -0.03, 0.03);
    // slat lines on the lid
    for (let s = -0.2; s <= 0.2001; s += 0.1) strip("line", [s, ly + 0.052, -0.24], [s, ly + 0.052, 0.24], 0.01, [0, 1, 0]);
  });
  const LID = SY + 0.47;
  // steam puffs: base centres and phases (rewritten each frame)
  const PUFFS = [
    [-0.12, 0.06, 0.0, 0.0], [0.1, 0.1, 0.05, 0.33], [0.0, -0.08, 0.08, 0.66],
    [0.16, -0.12, 0.1, 0.15], [-0.18, 0.12, 0.07, 0.5], [0.04, 0.16, 0.09, 0.82],
  ];
  const puffC = [];
  PUFFS.forEach(([lx, lz, r, ph], i) => {
    const a = CAM * DEG, x = KM[0] + lx * Math.cos(a) + lz * Math.sin(a), z = KM[1] - lx * Math.sin(a) + lz * Math.cos(a);
    const C = [x, LID + 0.05, z];
    owner = i;
    ellipsoid("steam", C, r, r * 0.85, 9, 5);
    ellipsoid("steam", add(C, [r * 0.6, r * 0.35, -r * 0.2]), r * 0.7, r * 0.6, 8, 4);
    owner = -1;
    puffC.push({ C, ph, r });
  });

  // ---------- table, trays, mochi, bowls ----------
  place(TB[0], TB[1], CAM, () => {
    const TH = YM + 0.36;
    box("wood", -0.65, 0.65, TH - 0.04, TH, -0.31, 0.31);
    for (const x of [-0.58, 0.58]) for (const z of [-0.24, 0.24]) box("wood", x - 0.03, x + 0.03, YM, TH - 0.04, z - 0.03, z + 0.03);
    // trays
    const trays = [[-0.36, "mochi"], [0.09, "pink"]];
    for (const [tx, key] of trays) {
      box("red", tx - 0.21, tx + 0.21, TH, TH + 0.015, -0.18, 0.18);
      for (const [x0, x1, z0, z1] of [[-0.21, 0.21, -0.18, -0.165], [-0.21, 0.21, 0.165, 0.18], [-0.21, -0.195, -0.18, 0.18], [0.195, 0.21, -0.18, 0.18]])
        box("red", tx + x0, tx + x1, TH, TH + 0.028, z0, z1);
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 2; j++)
          lathe(key, [tx - 0.12 + i * 0.12, TH + 0.015, -0.075 + j * 0.15], [[0, 0], [0.048, 0], [0.053, 0.02], [0.046, 0.045], [0.026, 0.058], [0, 0.061]], 10, true);
    }
    // kinako (dark bowl, pale powder) and anko (white bowl, dark paste)
    const bowl = (x, z, key, fill) => {
      lathe(key, [x, TH, z], [[0, 0], [0.06, 0], [0.065, 0.015], [0.115, 0.075], [0.105, 0.08], [0.09, 0.06], [0, 0.06]], 14);
      lathe(fill, [x, TH, z], [[0.098, 0.06], [0.1, 0.07], [0.06, 0.088], [0, 0.092]], 14, true);
    };
    bowl(0.48, -0.12, "dark", "earth");
    bowl(0.46, 0.15, "straw", "dark");
  });

  // ---------- bucket and ladle ----------
  {
    const C = [BK[0], Y0, BK[1]];
    const r = (y) => 0.15 + 0.02 * (y / 0.32);
    lathe("earth", C, [[0, 0], [0.15, 0], [0.17, 0.32], [0.155, 0.32], [0.137, 0.25]], 16);
    lathe("straw", C, [[0.14, 0.25], [0, 0.25]], 16);
    band("dark", C, 0.05, 0.08, r(0.05), r(0.08), 0.006, 16);
    band("dark", C, 0.24, 0.27, r(0.24), r(0.27), 0.006, 16);
    cyl("wood", BK[0] - 0.04, Y0 + 0.22, BK[1] + 0.02, 0.055, 0.07, 10);
    tube("wood", [BK[0] - 0.04, Y0 + 0.28, BK[1] + 0.02], [BK[0] + 0.24, Y0 + 0.62, BK[1] + 0.2], 0.014, 0.012, 6);
  }

  // ---------- fence and gate ----------
  const FH = 1.5, FB = Y0 + 0.1;
  // a woven panel from a to b along the ground plan (2D), facing `face` (unit plan vector into the yard)
  function panel(a, b, face) {
    const out = [face[0], 0, face[1]];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L;
    const at = (s, y, o) => [a[0] + dx * s + face[0] * o, y, a[1] + dz * s + face[1] * o];
    hex("earth", [at(0, FB, -0.02), at(L, FB, -0.02), at(L, FB, 0.02), at(0, FB, 0.02), at(0, FH, -0.02), at(L, FH, -0.02), at(L, FH, 0.02), at(0, FH, 0.02)]);
    // woven lattice: diagonal slats both ways (clipped to the panel), two dark tie rails across
    const Hh = FH - FB, step = 0.22;
    for (const sg of [1, -1])
      for (let k = -Hh; k < L; k += step) {
        // the line s = k + t, y = t (sg 1) or s = k + Hh - t (sg -1), t in [0, Hh], clipped to s in [0, L]
        let t0 = 0, t1 = Hh;
        if (sg > 0) t0 = Math.max(t0, -k), t1 = Math.min(t1, L - k);
        else t0 = Math.max(t0, k + Hh - L), t1 = Math.min(t1, k + Hh);
        if (t1 - t0 < 0.05) continue;
        const sOf = (t) => (sg > 0 ? k + t : k + Hh - t);
        strip("line", at(sOf(t0), FB + t0, 0.024), at(sOf(t1), FB + t1, 0.024), 0.012, out);
      }
    for (const y of [FB + Hh * 0.3, FB + Hh * 0.72]) strip("line", at(0.02, y, 0.03), at(L - 0.02, y, 0.03), 0.045, out);
    // posts at both ends and every ~1.7 m, a top rail
    const n = Math.max(1, Math.round(L / 1.7));
    for (let k = 0; k <= n; k++) {
      const p = at((k / n) * L, 0, 0.035);
      cbox("wood", p[0], Y0, p[2], 0.08, FH + 0.08 - Y0, 0.08);
    }
    hex("wood", [at(0, FH - 0.02, 0.0), at(L, FH - 0.02, 0.0), at(L, FH - 0.02, 0.06), at(0, FH - 0.02, 0.06), at(0, FH + 0.03, 0.0), at(L, FH + 0.03, 0.0), at(L, FH + 0.03, 0.06), at(0, FH + 0.03, 0.06)]);
  }
  panel([FX, FZ], [3.42, FZ], [0, 1]);
  panel([FX, FZ + 0.06], [FX, GZ[0]], [1, 0]);
  panel([FX, GZ[1]], [FX, 2.42], [1, 0]);
  // gate: two tall posts and a beam with overhang
  for (const z of GZ) cbox("wood", FX + 0.04, Y0, z, 0.12, 1.92, 0.12);
  box("wood", FX - 0.04, FX + 0.12, Y0 + 1.78, Y0 + 1.9, GZ[0] - 0.22, GZ[1] + 0.22);
  box("wood", FX - 0.03, FX + 0.11, Y0 + 1.55, Y0 + 1.62, GZ[0], GZ[1]);

  // ---------- kadomatsu pair ----------
  function kadomatsu(x, z) {
    place(x, z, 90, () => { // front (+Z local) faces into the yard (+X)
      const R = 0.21;
      lathe("straw", [0, Y0, 0], [[0, 0], [R, 0], [R + 0.01, 0.2], [R - 0.01, 0.4], [0, 0.4]], 14);
      for (const y of [0.1, 0.3]) band("dark", [0, Y0, 0], y, y + 0.035, R + 0.005, R + 0.005 - 0.0, 0.008, 14);
      // three culms cut on the diagonal, cut faces to the front
      for (const [cx, cz, h, r] of [[0, -0.04, 1.18, 0.05], [-0.09, 0.06, 0.98, 0.047], [0.09, 0.06, 0.82, 0.045]]) {
        const seg = 10, top = (f) => Y0 + h - 0.09 * Math.sin(f) * 1.0; // lowest at the front (+z, f = 90 deg)
        for (let k = 0; k < seg; k++) {
          const f0 = (k / seg) * TAU, f1 = ((k + 1) / seg) * TAU;
          const p = (f, y) => [cx + r * Math.cos(f), y, cz + r * Math.sin(f)];
          const rn = (f) => [Math.cos(f), 0, Math.sin(f)];
          const fm = (f0 + f1) / 2;
          tri("wood", p(f0, Y0 + 0.2), p(f1, Y0 + 0.2), p(f1, top(f1)), rn(fm), rn(f0), rn(f1), rn(f1));
          tri("wood", p(f0, Y0 + 0.2), p(f1, top(f1)), p(f0, top(f0)), rn(fm), rn(f0), rn(f1), rn(f0));
          tri("mound0", [cx, Y0 + h, cz], p(f0, top(f0)), p(f1, top(f1)), [0, 1, 0.9]);
          // node ring
          tri("dark", p(f0, Y0 + h - 0.32), p(f1, Y0 + h - 0.32), p(f1, Y0 + h - 0.3), rn(fm));
          tri("dark", p(f0, Y0 + h - 0.32), p(f1, Y0 + h - 0.3), p(f0, Y0 + h - 0.3), rn(fm));
        }
      }
      // pine sprigs fanning out of the straw, red berries
      for (let i = 0; i < 9; i++) {
        const f = (i / 9) * TAU + 0.3, el = 0.35 + 0.25 * (i % 3) / 2;
        const a = [0.12 * Math.cos(f), Y0 + 0.38, 0.12 * Math.sin(f)];
        tube("dark", a, add(a, [0.22 * Math.cos(f) * Math.cos(el), 0.22 * Math.sin(el), 0.22 * Math.sin(f) * Math.cos(el)]), 0.045, 0, 6);
      }
      for (const [bx, by, bz] of [[0.1, 0.5, 0.17], [0.13, 0.47, 0.13], [0.07, 0.46, 0.2], [-0.12, 0.49, 0.16]]) ellipsoid("red", [bx, Y0 + by, bz], 0.02, 0.02, 6, 4);
    });
  }
  kadomatsu(FX + 0.38, GZ[0] - 0.42);
  kadomatsu(FX + 0.38, GZ[1] + 0.42);

  // ---------- persimmon tree ----------
  {
    const T = (p) => [TR[0] + p[0], Y0 + p[1], TR[1] + p[2]];
    const BR = [
      [[0, 0, 0], [0.04, 1.15, 0.02], 0.13, 0.09],
      [[0.04, 1.1, 0.02], [-0.55, 1.95, 0.25], 0.075, 0.045], [[-0.55, 1.95, 0.25], [-0.95, 2.5, 0.15], 0.045, 0.018],
      [[-0.55, 1.95, 0.25], [-0.45, 2.65, 0.55], 0.04, 0.014], [[-0.75, 2.22, 0.2], [-1.05, 2.2, 0.55], 0.025, 0.01],
      [[0.04, 1.1, 0.02], [0.5, 2.05, -0.15], 0.075, 0.045], [[0.5, 2.05, -0.15], [0.85, 2.75, -0.05], 0.045, 0.016],
      [[0.5, 2.05, -0.15], [0.25, 2.85, -0.4], 0.04, 0.014], [[0.68, 2.4, -0.1], [1.0, 2.45, 0.3], 0.025, 0.01],
      [[0.04, 1.1, 0.02], [0.05, 2.15, 0.45], 0.065, 0.04], [[0.05, 2.15, 0.45], [0.2, 3.0, 0.6], 0.04, 0.012],
      [[0.05, 2.15, 0.45], [-0.25, 2.75, 0.85], 0.035, 0.012], [[0.12, 2.55, 0.52], [0.5, 2.7, 0.85], 0.022, 0.009],
      [[0.04, 1.4, 0.02], [-0.1, 2.3, -0.4], 0.05, 0.02], [[-0.05, 2.0, -0.25], [-0.4, 2.4, -0.55], 0.025, 0.01],
    ];
    for (const [a, b, ra, rb] of BR) tube("wood", T(a), T(b), ra, rb, 7);
    // fruit hanging off the twigs, each with a dark calyx
    const FR = [[-0.92, 2.38, 0.17], [-1.0, 2.1, 0.52], [0.82, 2.62, -0.05], [0.95, 2.33, 0.28], [0.24, 2.78, -0.36],
      [0.18, 2.86, 0.58], [-0.22, 2.62, 0.8], [0.48, 2.58, 0.83]];
    for (const f of FR) {
      ellipsoid("red", T(f), 0.06, 0.05, 10, 6);
      cyl("dark", T(f)[0], T(f)[1] + 0.04, T(f)[2], 0.03, 0.015, 6);
    }
  }

  // ---------- meshes ----------
  const MAT = {
    earth: [c.earth, c.earthShade, 0.1, true], straw: [c.straw, c.strawShade, 0.1, true],
    wood: [c.wood, c.woodShade, 0.2, true], dark: [c.dark, c.darkShade, 0.1, true],
    line: [c.line, c.line, 0.1, false], mound0: [c.mochi, c.mochiShade, 0.1, false],
    mochi: [c.mochi, c.mochiShade, 0.1, true], pink: [c.pink, c.pinkShade, 0.1, true],
    red: [c.red, c.redShade, 0.2, true], flame: [c.flame, c.flame, -0.25, false],
    kine: [c.wood, c.woodShade, 0.2, true], mound: [c.mochi, c.mochiShade, 0.1, true],
    steam: [c.mochi, c.mochiShade, 0.1, true],
  };
  const live = {};
  for (const [key, { p, n, o }] of Object.entries(soups)) {
    const [b, s, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, b, s, { threshold, outline });
    mesh.name = key;
    yard.add(mesh);
    if (key === "kine" || key === "mound" || key === "steam") {
      kit.hullNormals(g);
      live[key] = { g, p: Float32Array.from(p), n: Float32Array.from(n), h: Float32Array.from(g.attributes.hullNormal.array), o };
    }
  }

  // ---------- vertex rewrites ----------
  function done(g) {
    g.attributes.position.needsUpdate = g.attributes.normal.needsUpdate = g.attributes.hullNormal.needsUpdate = true;
    g.computeBoundingSphere(), g.computeBoundingBox();
  }
  // kine: rigid move by the raise fraction a (0 strike, 1 top): the head rises 1.0 m and 0.15 m toward the pounder
  // (it stays over the mortar) while the kine tips by KPHI in the swing plane, so the handle falls to the hands.
  const KPHI = 58 * DEG;
  function setKine(a) {
    const L = live.kine, P = L.g.attributes.position.array, N = L.g.attributes.normal.array, H = L.g.attributes.hullNormal.array;
    const co = Math.cos(KPHI * a), si = Math.sin(KPHI * a);
    const T = add(HC, add(mul(KH, 0.15 * a), [0, 1.0 * a, 0]));
    const rot = (src, dst, i, origin) => {
      const q = origin ? [src[i] - HC[0], src[i + 1] - HC[1], src[i + 2] - HC[2]] : [src[i], src[i + 1], src[i + 2]];
      const qh = q[0] * KH[0] + q[2] * KH[2], qw = q[0] * KW[0] + q[2] * KW[2], qy = q[1];
      const h2 = qh * co + qy * si, y2 = -qh * si + qy * co;
      dst[i] = KH[0] * h2 + KW[0] * qw + (origin ? T[0] : 0);
      dst[i + 1] = y2 + (origin ? T[1] : 0);
      dst[i + 2] = KH[2] * h2 + KW[2] * qw + (origin ? T[2] : 0);
    };
    for (let i = 0; i < P.length; i += 3) rot(L.p, P, i, true), rot(L.n, N, i, false), rot(L.h, H, i, false);
    done(L.g);
  }
  // mochi mound: scale about its base, sy tall, sx wide (normals by the inverse)
  function setMound(sx, sy) {
    const L = live.mound, P = L.g.attributes.position.array, N = L.g.attributes.normal.array, H = L.g.attributes.hullNormal.array;
    for (let i = 0; i < P.length; i += 3) {
      P[i] = MB[0] + (L.p[i] - MB[0]) * sx, P[i + 1] = MB[1] + (L.p[i + 1] - MB[1]) * sy, P[i + 2] = MB[2] + (L.p[i + 2] - MB[2]) * sx;
      for (const [src, dst] of [[L.n, N], [L.h, H]]) {
        const v = nrm([src[i] / sx, src[i + 1] / sy, src[i + 2] / sx]);
        dst[i] = v[0], dst[i + 1] = v[1], dst[i + 2] = v[2];
      }
    }
    done(L.g);
  }
  // steam: each puff rises 0.45 m over its cycle, drifting, growing then fading
  function setSteam(u) {
    const L = live.steam, P = L.g.attributes.position.array;
    for (let v = 0; v < P.length / 3; v++) {
      const i = v * 3, { C, ph } = puffC[L.o[v]], f = (((u + ph) % 1) + 1) % 1;
      const s = 0.25 + 0.95 * Math.sin(PI * Math.min(1, f * 1.15)) ** 0.8 * (1 - 0.6 * f);
      const off = [0.06 * f, 0.45 * f, -0.04 * f];
      for (let k = 0; k < 3; k++) P[i + k] = C[k] + off[k] + (L.p[i + k] - C[k]) * s;
    }
    done(L.g);
  }

  // ---------- poses and clips ----------
  const CLIPS = { pound: 1.5 };
  const AMAX = 1, REST_A = 0.7;
  const smooth = (x) => x * x * (3 - 2 * x);
  function apply(a, q, u) {
    setKine(a);
    setMound(1 + 0.15 * q, 1 - SQ * q);
    setSteam(u);
    root.updateMatrixWorld(true);
  }
  function pound(t) {
    const u = (((t / CLIPS.pound) % 1) + 1) % 1;
    let a, q = 0;
    if (u < 0.5) a = AMAX * smooth(u / 0.5);
    else if (u < 0.6) a = AMAX;
    else if (u < 0.7) { const s = (u - 0.6) / 0.1; a = AMAX * (1 - s * s); }
    else {
      const k = (u - 0.7) / 0.3;
      a = 0.1 * Math.sin(PI * k) * (1 - k);
      q = (1 - k) ** 3 * Math.cos(k * 9);
    }
    apply(a, Math.max(q, -0.15), u);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`mochitsuki: no clip "${m[1]}" (clips: pound)`);
      return pound(+m[2]);
    }
    if (name !== "rest") throw new Error(`mochitsuki: unknown pose "${name}" (rest, or pound@<seconds>)`);
    apply(REST_A, 0, 0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
