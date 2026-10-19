// dagashiya.js - an old neighbourhood penny-candy shop (dagashi-ya): a small single-storey wooden shopfront with its
// glass sliding doors pushed open, so the cluttered inside shows from the street. Static.
// Contract: harness/lab/README.md. Meters, +Y up, the street side faces +Z, its left is +X, stands on y = 0,
// centred on x = 0, z = 0.
//
// Construction (boxes, prisms, cylinders and low spheres as triangle soups merged per material, so the whole shop is a
// dozen meshes; every triangle is wound away from a point inside its own solid, never by hand):
//   SHELL    side and back walls (dark board skirt, pale plaster above), a doma floor slab, a dark ceiling, dark corner
//            posts and a lintel beam over the open front, a plaster transom above it; on the +X wall a frosted window
//            with a grille and a blank enamel plaque on the skirt.
//   ROOF     a gable roof with its ridge along the street: two slabs, kawara rows as raised dark strips down each slope,
//            round eave-tile bumps along the front fascia, a ridge beam with raised end tiles.
//   AWNING   a striped awning (pink / white) sloping out under the eave on two thin arms, with a flat valance; the
//            faded blank sign board (no lettering) on the transom between awning and eave.
//   DOORS    four glass sliding doors on a floor track, pushed open in two stacks at the ends: dark frames, a solid
//            kick panel, one glazing bar, glints for glass (no pane, so the inside shows through).
//   SWEETS   a three-step wooden display stand on the +X half crowded with glass jars (coloured contents, white lid,
//            a glint) and open trays of sweets; a tall shelf rack on the -X wall stacked with small boxes; strips of
//            snack packets hanging from a rod under the awning. Colours cycle from an integer hash, no text anywhere.
//   STREET   a chest ice-cream freezer out front on the -X side (white body, pink band, dark glass lid with glints) and
//            two capsule-toy machines on a low stand at the +X corner, clear of the view in from the hero camera.
//   BACK     the shopkeeper's raised tatami step (agari) across the back, with a cushion, a cash box and shoji behind,
//            seen down the open aisle on the -X half.
// Proportions (real size, base unit the wall height H = 2.6 m): front 3.7 m wide, walls 2.9 m deep; opening 2.1 m high;
//   eave 2.72 m with 0.7 m front overhang, pitch 0.34, ridge 3.36 m, end tiles 3.76 m; awning 2.12 -> 1.84 m, 0.8 m
//   out; display steps 0.40 / 0.68 / 0.96 m; tatami step 0.42 m; freezer 0.89 m; capsule machines 0.94 m.
// Budget: ~6.8k triangles, 9 meshes (one per material).
// Options: build(THREE, kit, colors, { height }) scales the whole shop uniformly (default meta.height).
// Colours (festival, for the candy brights): dark wood (posts, beams, skirt, frames, roof) sky #24143a / hair #1a1020;
//   plaster moon #ffd7a1 / skin #f0c2ae; plank wood (display steps, sign, kamachi edge) iris #ffd0a1 / practical #ffb020;
//   candy pink accent #ff4d6d / sky; candy orange practical #ffb020 / accent; white (stripes, lids, freezer, shoji,
//   capsule bottoms) sclera #f6f3ee / moon; tatami and doma floor skin #f0c2ae / iris; glints line #fff1ea flat, no
//   hull; seams (tile rows, shoji grid, window grille, tatami joins) hair flat.
// Pale parts use threshold 0.1 so faces square to the street stay lit.

export const meta = {
  name: "dagashiya",
  height: 3.76,
  script: "festival",
  colors: {
    wood: "#24143a", woodShade: "#1a1020",
    plaster: "#ffd7a1", plasterShade: "#f0c2ae",
    plank: "#ffd0a1", plankShade: "#ffb020",
    pink: "#ff4d6d", pinkShade: "#24143a",
    orange: "#ffb020", orangeShade: "#ff4d6d",
    white: "#f6f3ee", whiteShade: "#ffd7a1",
    tatami: "#f0c2ae", tatamiShade: "#ffd0a1",
    glint: "#fff1ea", glintShade: "#fff1ea",
    seam: "#1a1020", seamShade: "#1a1020",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height } = opts;
  const root = new THREE.Group();
  root.name = "dagashiya";
  const shop = new THREE.Group();
  shop.name = "shop";
  shop.scale.setScalar(height / meta.height);
  root.add(shop);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  function tri(key, a, b, e, ref, na, nb, ne) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const flip = dot(n, sub(mul(add(add(a, b), e), 1 / 3), ref)) < 0;
    n = nrm(flip ? mul(n, -1) : n);
    const s = S(key);
    const vs = flip ? [[a, na], [e, ne], [b, nb]] : [[a, na], [b, nb], [e, ne]];
    for (const [q, nq] of vs) s.p.push(...q), s.n.push(...(nq ?? n));
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
  // a beam from a to b, w wide, h thick along `up`
  function beam(key, a, b, w, h, up = [0, 1, 0]) {
    const d = sub(b, a);
    const s = nrm(cross(d, up)), u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // an upright cylinder, smooth sides, flat caps
  function cyl(key, x, y0, z, r, h, seg = 10) {
    const ref = [x, y0 + h / 2, z];
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const n0 = [Math.cos(a0), 0, Math.sin(a0)], n1 = [Math.cos(a1), 0, Math.sin(a1)];
      const q = (n, y) => [x + r * n[0], y, z + r * n[2]];
      tri(key, q(n0, y0), q(n1, y0), q(n1, y0 + h), ref, n0, n1, n1);
      tri(key, q(n0, y0), q(n1, y0 + h), q(n0, y0 + h), ref, n0, n1, n0);
      tri(key, [x, y0 + h, z], q(n0, y0 + h), q(n1, y0 + h), ref);
      tri(key, [x, y0, z], q(n0, y0), q(n1, y0), ref);
    }
  }
  // a disc facing +Z (eave-tile ends)
  function discZ(key, x, y, z0, z1, r, seg = 8) {
    const ref = [x, y, (z0 + z1) / 2];
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const q = (a, z) => [x + r * Math.cos(a), y + r * Math.sin(a), z];
      quad(key, q(a0, z0), q(a1, z0), q(a1, z1), q(a0, z1), ref);
      tri(key, [x, y, z1], q(a0, z1), q(a1, z1), ref);
    }
  }
  // a sphere split at its equator: top half `top`, bottom half `bot`
  function ball(top, bot, C, r, seg = 8, rings = 4) {
    for (let k = 0; k < rings; k++) {
      const key = k < rings / 2 ? top : bot;
      const t0 = (k / rings) * Math.PI, t1 = ((k + 1) / rings) * Math.PI;
      for (let i = 0; i < seg; i++) {
        const p0 = (i / seg) * Math.PI * 2, p1 = ((i + 1) / seg) * Math.PI * 2;
        const u = (t, p) => [Math.sin(t) * Math.cos(p), Math.cos(t), Math.sin(t) * Math.sin(p)];
        const [a, b, e, d] = [u(t0, p0), u(t0, p1), u(t1, p1), u(t1, p0)];
        const W = (v) => add(C, mul(v, r));
        if (k > 0) tri(key, W(a), W(b), W(e), C, a, b, e);
        if (k < rings - 1) tri(key, W(a), W(e), W(d), C, a, e, d);
      }
    }
  }
  // a flat quad facing +Z at z (glints, seams), u0..u1 x v0..v1, slanted by `sl` at the top
  const flatZ = (key, x0, x1, y0, y1, z, sl = 0) => quad(key, [x0, y0, z], [x1, y0, z], [x1 + sl, y1, z], [x0 + sl, y1, z], [x0, y0, z - 1]);
  const hash = (i) => {
    let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const CANDY = ["pink", "orange", "white", "plank", "pink", "orange"];
  const pick = (i) => CANDY[Math.floor(hash(i) * CANDY.length)];

  // ---------- shell ----------
  const X0 = -1.85, X1 = 1.85, ZB = -1.45, ZF = 1.0, H = 2.6, T = 0.1, OH = 2.1;
  box("tatami", X0, X1, 0, 0.05, ZB, ZF); // doma floor slab
  for (const [a, b] of [[X0, X0 + T], [X1 - T, X1]]) {
    box("wood", a, b, 0, 0.9, ZB, ZF); // board skirt
    box("plaster", a + 0.01, b - 0.01, 0.9, H, ZB, ZF - 0.02);
  }
  box("wood", X0, X1, 0, 0.9, ZB, ZB + T);
  box("plaster", X0 + 0.01, X1 - 0.01, 0.9, 2.95, ZB + 0.01, ZB + T - 0.01);
  box("wood", X0, X1, H - 0.04, H, ZB, ZF); // ceiling
  for (const x of [X0 + 0.07, X1 - 0.07]) box("wood", x - 0.08, x + 0.08, 0, H + 0.05, ZF - 0.12, ZF + 0.04); // corner posts
  for (const x of [X0 + 0.06, X1 - 0.06]) box("wood", x - 0.08, x + 0.08, 0, H + 0.05, ZB - 0.02, ZB + 0.14);
  box("wood", X0, X1, OH, OH + 0.14, ZF - 0.1, ZF + 0.03); // lintel
  box("plaster", X0 + 0.15, X1 - 0.15, OH + 0.14, 2.95, ZF - 0.08, ZF - 0.01); // transom
  // a frosted side window with a wooden grille on the +X wall
  box("white", X1 - 0.01, X1 + 0.03, 1.18, 1.92, -0.79, 0.09);
  box("wood", X1 - 0.02, X1 + 0.06, 1.92, 1.98, -0.85, 0.15);
  box("wood", X1 - 0.02, X1 + 0.06, 1.12, 1.18, -0.85, 0.15);
  for (const z of [-0.82, 0.12]) box("wood", X1 - 0.02, X1 + 0.06, 1.12, 1.98, z - 0.03, z + 0.03);
  for (let z = -0.68; z < 0.08; z += 0.13) box("seam", X1 + 0.03, X1 + 0.05, 1.18, 1.92, z - 0.012, z + 0.012);
  box("wood", X1, X1 + 0.12, 1.08, 1.13, -0.9, 0.2); // sill
  // a blank enamel plaque on the +X skirt (no lettering)
  box("orange", X1, X1 + 0.025, 0.22, 0.82, 0.3, 0.78);
  box("white", X1 + 0.02, X1 + 0.03, 0.27, 0.77, 0.35, 0.73);
  box("pink", X1 + 0.025, X1 + 0.035, 0.42, 0.62, 0.44, 0.64);
  // gable triangles
  const EAVE = 2.72, ZE = 1.7, ZBE = -2.15, ZR = (ZE + ZBE) / 2, PITCH = 0.34;
  const roofY = (z) => EAVE + PITCH * (z > ZR ? ZE - z : z - ZBE);
  for (const x of [X0 + 0.05, X1 - 0.05]) {
    const pts = [[x, H, ZB], [x, H, ZF], [x, roofY(ZR) - 0.08, ZR]];
    const pts2 = pts.map((q) => [q[0] + 0.04, q[1], q[2]]);
    const ref = [x + 0.02, H + 0.2, ZR];
    tri("plaster", pts[0], pts[1], pts[2], ref), tri("plaster", pts2[0], pts2[1], pts2[2], ref);
    for (let i = 0; i < 3; i++) quad("plaster", pts[i], pts[(i + 1) % 3], pts2[(i + 1) % 3], pts2[i], ref);
  }

  // ---------- roof ----------
  const RX0 = -2.1, RX1 = 2.1, RT = 0.09;
  const slab = (za, zb) => {
    const ya = roofY(za), yb = roofY(zb);
    hex("wood", [[RX0, ya, za], [RX1, ya, za], [RX1, yb, zb], [RX0, yb, zb],
      [RX0, ya + RT, za], [RX1, ya + RT, za], [RX1, yb + RT, zb], [RX0, yb + RT, zb]]);
  };
  slab(ZE, ZR), slab(ZBE, ZR);
  // kawara rows down each slope, eave-tile ends on the front
  for (let x = RX0 + 0.13; x < RX1 - 0.05; x += 0.26) {
    for (const [za, zb] of [[ZE, ZR], [ZBE, ZR]]) {
      const a = [x, roofY(za) + RT + 0.02, za], b = [x, roofY(zb) + RT + 0.02, zb];
      const up = nrm(cross(sub(b, a), [1, 0, 0]));
      beam("seam", a, b, 0.07, 0.04, za > 0 ? mul(up, -1) : up);
    }
    discZ("wood", x, roofY(ZE) + RT / 2 + 0.02, ZE - 0.02, ZE + 0.03, 0.05, 8);
  }
  beam("wood", [RX0 - 0.04, roofY(ZR) + RT + 0.07, ZR], [RX1 + 0.04, roofY(ZR) + RT + 0.07, ZR], 0.2, 0.16); // ridge
  for (const x of [RX0 - 0.02, RX1 + 0.02]) box("wood", x - 0.08, x + 0.08, roofY(ZR) + RT, roofY(ZR) + RT + 0.3, ZR - 0.14, ZR + 0.14);
  // fascia board under the front eave, soffit
  box("wood", RX0, RX1, EAVE - 0.1, EAVE + 0.02, ZE - 0.06, ZE);

  // ---------- sign and awning ----------
  box("wood", -1.25, 1.25, 2.2, 2.66, ZF + 0.0, ZF + 0.06); // sign frame
  box("plank", -1.18, 1.18, 2.25, 2.61, ZF + 0.05, ZF + 0.09); // faded blank board
  const AW0 = [2.12, ZF + 0.02], AW1 = [1.84, ZF + 0.82], NS = 9, AX0 = -1.75, AX1 = 1.75;
  for (let i = 0; i < NS; i++) {
    const xa = AX0 + ((AX1 - AX0) * i) / NS, xb = AX0 + ((AX1 - AX0) * (i + 1)) / NS;
    const k = i % 2 ? "white" : "pink";
    hex(k, [[xa, AW0[0], AW0[1]], [xb, AW0[0], AW0[1]], [xb, AW1[0], AW1[1]], [xa, AW1[0], AW1[1]],
      [xa, AW0[0] + 0.03, AW0[1]], [xb, AW0[0] + 0.03, AW0[1]], [xb, AW1[0] + 0.03, AW1[1]], [xa, AW1[0] + 0.03, AW1[1]]]);
    box(k, xa, xb, AW1[0] - 0.2, AW1[0] + 0.03, AW1[1] - 0.025, AW1[1]); // valance
  }
  for (const x of [AX0 + 0.05, AX1 - 0.05]) beam("wood", [x, 1.75, ZF + 0.02], [x, AW1[0] - 0.02, AW1[1] - 0.04], 0.03, 0.03, [0, 0, 1]);

  // ---------- glass doors, pushed open ----------
  box("wood", X0 + 0.1, X1 - 0.1, 0.05, 0.08, ZF - 0.14, ZF - 0.02); // track
  function door(xa, z) {
    const xb = xa + 0.86, fz0 = z - 0.025, fz1 = z + 0.025, y1 = OH - 0.01;
    box("wood", xa, xa + 0.05, 0.08, y1, fz0, fz1);
    box("wood", xb - 0.05, xb, 0.08, y1, fz0, fz1);
    box("wood", xa, xb, y1 - 0.06, y1, fz0, fz1);
    box("wood", xa, xb, 0.08, 0.5, fz0 + 0.008, fz1 - 0.008); // kick panel
    box("wood", xa, xb, 1.25, 1.29, fz0, fz1); // glazing bar
    flatZ("glint", xa + 0.12, xa + 0.17, 0.62, 1.15, fz1 + 0.003, 0.14);
    flatZ("glint", xa + 0.22, xa + 0.24, 0.66, 1.08, fz1 + 0.003, 0.12);
    flatZ("glint", xa + 0.14, xa + 0.19, 1.38, 1.9, fz1 + 0.003, 0.14);
  }
  door(X1 - 0.12 - 0.86, ZF - 0.11), door(X1 - 0.12 - 0.86 - 0.06, ZF - 0.05);
  door(X0 + 0.12, ZF - 0.11), door(X0 + 0.12 + 0.06, ZF - 0.05);

  // ---------- display steps with jars and trays ----------
  const DX0 = 0.1, DX1 = 1.62;
  const steps = [[0.4, 0.3, 0.62], [0.68, -0.02, 0.3], [0.96, -0.34, -0.02]];
  let seed = 11;
  for (const [top, z0, z1] of steps) {
    box("plank", DX0, DX1, 0.05, top, z0, z1);
    box("wood", DX0 - 0.01, DX1 + 0.01, top - 0.03, top + 0.005, z1 - 0.025, z1 + 0.005); // dark lip
  }
  function jar(x, y, z, r, h, k) {
    cyl(k, x, y, z, r * 0.92, h * 0.82, 10); // contents
    cyl("white", x, y + h * 0.82, z, r * 0.8, h * 0.08, 10); // neck
    cyl("white", x, y + h * 0.9, z, r, h * 0.1, 10); // lid
    flatZ("glint", x - r * 0.55, x - r * 0.35, y + h * 0.15, y + h * 0.7, z + r * 0.93, 0);
  }
  function tray(x, y, z, w, d, k, k2) {
    box(k, x - w / 2, x + w / 2, y, y + 0.06, z - d / 2, z + d / 2);
    box(k2, x - w / 2 + 0.015, x + w / 2 - 0.015, y + 0.06, y + 0.075, z - d / 2 + 0.015, z + d / 2 - 0.015);
  }
  for (const [top, z0, z1] of steps) {
    let x = DX0 + 0.08;
    while (x < DX1 - 0.1) {
      seed++;
      if (hash(seed * 3) < 0.6) {
        const r = 0.075 + hash(seed * 5) * 0.025, h = 0.22 + hash(seed * 7) * 0.08;
        jar(x + r, top, (z0 + z1) / 2 + 0.02, r, h, pick(seed));
        x += 2 * r + 0.035;
      } else {
        const w = 0.16 + hash(seed * 11) * 0.06;
        tray(x + w / 2, top, (z0 + z1) / 2, w, 0.24, pick(seed + 1), pick(seed + 2));
        x += w + 0.03;
      }
    }
  }

  // ---------- shelf rack on the -X wall, stacked boxes ----------
  const SX0 = X0 + T, SX1 = X0 + T + 0.38, SZ0 = -0.9, SZ1 = 0.7;
  for (const z of [SZ0, SZ1]) box("wood", SX0, SX1, 0.05, 1.9, z - 0.03, z + 0.03);
  for (const y of [0.4, 0.8, 1.2, 1.6]) {
    box("plank", SX0, SX1, y - 0.03, y, SZ0, SZ1);
    let z = SZ0 + 0.05;
    while (z < SZ1 - 0.12) {
      seed++;
      const d = 0.12 + hash(seed * 13) * 0.1, h = 0.12 + hash(seed * 17) * 0.14;
      box(pick(seed), SX0 + 0.04, SX1 - 0.02 - hash(seed * 19) * 0.06, y, y + h, z, z + d);
      z += d + 0.02;
    }
  }

  // ---------- hanging snack strips ----------
  const RY = 1.7, RZ = ZF + 0.14;
  box("wood", X0 + 0.2, X1 - 0.2, RY, RY + 0.025, RZ - 0.0125, RZ + 0.0125); // rod
  const stripsX = [-1.25, -1.08, -0.91, 0.38, 0.55, 0.85, 1.02, 1.19];
  stripsX.forEach((x, s) => {
    const n = s === 3 || s === 4 ? 2 : 4;
    box("wood", x - 0.006, x + 0.006, RY - 0.04, RY, RZ - 0.006, RZ + 0.006);
    for (let i = 0; i < n; i++) {
      const y1 = RY - 0.04 - i * 0.15, k = CANDY[(s * 3 + i) % 4];
      box(k, x - 0.07, x + 0.07, y1 - 0.14, y1, RZ - 0.012, RZ + 0.012);
      box(k === "white" ? "pink" : "white", x - 0.035, x + 0.035, y1 - 0.09, y1 - 0.045, RZ + 0.012, RZ + 0.018); // label patch
    }
  });

  // ---------- tatami step at the back, cushion, cash box, shoji ----------
  const TZ0 = ZB + T, TZ1 = -0.75, TX0 = X0 + T + 0.4, TX1 = X1 - T, TY = 0.42;
  box("wood", TX0, TX1, 0.05, TY - 0.04, TZ0, TZ1); // base
  box("plank", TX0, TX1, TY - 0.06, TY, TZ1 - 0.08, TZ1); // kamachi edge
  box("tatami", TX0 + 0.02, TX1, TY - 0.05, TY, TZ0, TZ1 - 0.08);
  for (let x = TX0 + 0.9; x < TX1 - 0.1; x += 0.9) box("seam", x - 0.01, x + 0.01, TY, TY + 0.004, TZ0, TZ1 - 0.08);
  box("pink", -0.82, -0.34, TY, TY + 0.08, -1.3, -0.82); // zabuton
  box("orange", -0.77, -0.39, TY + 0.08, TY + 0.09, -1.25, -0.87);
  box("wood", -0.22, 0.08, TY, TY + 0.13, -1.05, -0.83); // cash box
  box("orange", -0.23, 0.09, TY + 0.13, TY + 0.15, -1.06, -0.82);
  box("white", -0.12, -0.02, TY + 0.06, TY + 0.1, -0.83, -0.82);
  const shZ = ZB + T + 0.01, shY0 = TY, shY1 = 2.2;
  for (let i = 0; i < 4; i++) {
    const xa = TX0 + 0.05 + i * 0.8, xb = xa + 0.78;
    box("wood", xa, xb, shY0, shY1, shZ, shZ + 0.02);
    box("white", xa + 0.04, xb - 0.04, shY0 + 0.15, shY1 - 0.04, shZ + 0.02, shZ + 0.03);
    for (let j = 1; j < 4; j++) flatZ("seam", xa + 0.04 + (j * (xb - xa - 0.08)) / 4 - 0.008, xa + 0.04 + (j * (xb - xa - 0.08)) / 4 + 0.008, shY0 + 0.15, shY1 - 0.04, shZ + 0.035);
    for (let j = 1; j < 5; j++) flatZ("seam", xa + 0.04, xb - 0.04, shY0 + 0.15 + (j * (shY1 - shY0 - 0.19)) / 5 - 0.008, shY0 + 0.15 + (j * (shY1 - shY0 - 0.19)) / 5 + 0.008, shZ + 0.035);
  }

  // ---------- chest ice-cream freezer out front (-X) ----------
  const FX0 = -1.72, FX1 = -0.82, FZ0 = 1.2, FZ1 = 1.82;
  box("wood", FX0 + 0.04, FX1 - 0.04, 0, 0.08, FZ0 + 0.04, FZ1 - 0.04);
  box("white", FX0, FX1, 0.08, 0.82, FZ0, FZ1);
  box("pink", FX0 - 0.005, FX1 + 0.005, 0.58, 0.68, FZ0 - 0.005, FZ1 + 0.005); // band
  box("white", FX0 - 0.01, FX1 + 0.01, 0.82, 0.87, FZ0 - 0.01, FZ1 + 0.01); // lid rim
  box("wood", FX0 + 0.05, FX1 - 0.05, 0.87, 0.88, FZ0 + 0.05, FZ1 - 0.05); // dark glass
  box("white", (FX0 + FX1) / 2 - 0.015, (FX0 + FX1) / 2 + 0.015, 0.87, 0.89, FZ0 + 0.05, FZ1 - 0.05); // sliding join
  for (const [xa, w] of [[FX0 + 0.12, 0.06], [FX0 + 0.66, 0.06], [FX0 + 0.22, 0.025]])
    quad("glint", [xa, 0.884, FZ1 - 0.08], [xa + w, 0.884, FZ1 - 0.08], [xa + w + 0.12, 0.884, FZ0 + 0.08], [xa + 0.12, 0.884, FZ0 + 0.08], [xa, 0, FZ0]);

  // ---------- capsule-toy machines out front (+X) ----------
  const GZ = 1.5, GW = 0.42, GD = 0.38;
  box("wood", 1.15, 2.06, 0, 0.14, GZ - GD / 2 - 0.02, GZ + GD / 2 + 0.02);
  [[1.38, "orange"], [1.83, "pink"]].forEach(([x, k], m) => {
    const y0 = 0.14, zf = GZ + GD / 2;
    box(k, x - GW / 2, x + GW / 2, y0, y0 + 0.4, GZ - GD / 2, zf); // body
    box(k, x - GW / 2, x + GW / 2, y0 + 0.76, y0 + 0.8, GZ - GD / 2, zf); // lid
    for (const sx of [-1, 1]) for (const z of [GZ - GD / 2 + 0.02, zf - 0.02])
      box("white", x + sx * (GW / 2 - 0.02) - 0.008, x + sx * (GW / 2 - 0.02) + 0.008, y0 + 0.4, y0 + 0.76, z - 0.008, z + 0.008);
    box("wood", x - 0.15, x + 0.15, y0 + 0.4, y0 + 0.62, GZ - 0.12, GZ + 0.05); // interior
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 4 - (row % 2); col++) {
        const cx = x - 0.135 + col * 0.09 + (row % 2) * 0.045, cy = y0 + 0.445 + row * 0.08;
        ball(CANDY[(m * 5 + row * 3 + col) % 3 === 2 ? 3 : (m + row + col) % 2], "white", [cx, cy, zf - 0.07], 0.042, 8, 4);
      }
    flatZ("glint", x - 0.17, x - 0.135, y0 + 0.45, y0 + 0.7, zf - 0.015, 0.05);
    box("white", x - 0.18, x + 0.18, y0 + 0.26, y0 + 0.37, zf, zf + 0.01); // blank card
    discZ("white", x + 0.1, y0 + 0.16, zf, zf + 0.025, 0.06, 12); // crank dial
    box("wood", x + 0.03, x + 0.17, y0 + 0.145, y0 + 0.175, zf + 0.025, zf + 0.045); // grip bar
    box("wood", x - 0.17, x - 0.05, y0 + 0.02, y0 + 0.1, zf - 0.005, zf + 0.008); // outlet
  });

  // ---------- meshes ----------
  const MAT = {
    wood: [c.wood, c.woodShade, 0.1, true],
    plaster: [c.plaster, c.plasterShade, 0.1, true],
    plank: [c.plank, c.plankShade, 0.1, true],
    pink: [c.pink, c.pinkShade, 0.05, true],
    orange: [c.orange, c.orangeShade, 0.05, true],
    white: [c.white, c.whiteShade, 0.1, true],
    tatami: [c.tatami, c.tatamiShade, 0.1, true],
    glint: [c.glint, c.glintShade, 0.1, false],
    seam: [c.seam, c.seamShade, 0.1, false],
  };
  for (const [key, s] of Object.entries(soups)) {
    if (!s.p.length) continue;
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    const mesh = kit.toon(g, base, shade, { threshold, outline });
    mesh.name = key;
    shop.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
