// taiyaki-ya.js - a tiny old-fashioned taiyaki shop: a narrow two-storey wooden town building with a take-out window,
// a hinged fish iron on the counter, a glass case of stacked taiyaki, a fish noren, a fish signboard and laundry.
// Contract: harness/lab/README.md. Meters, +Y up, the street side faces +Z, its left is +X (the bicycle side), stands
// on y = 0, centred on x = 0, z = 0.
//
// Construction (boxes, wedges and extruded shapes as triangle soups merged per material, so the shop is a dozen
// meshes; boxes are wound away from their own centre, three.js shapes keep their own winding):
//   SHELL    a dark board building 4.0 x 2.4 m (shallow, so the street face fills more of the hero), a pale plaster skirt (koshi) to 0.9 m on the street and +X sides, corner
//            posts and a floor beam proud of the boards, board seams as dark strips, a gable roof with its ridge along
//            the street (two slabs, tile rows, a ridge beam) over a gable infill.
//   WINDOW   the take-out window on the -X half is a 0.6 m recess with a dark back, a counter slab 0.35 m out over the
//            street. On it the hinged taiyaki iron: a firebox wedge, the base plate tilted 45 deg toward the street and
//            its lid swung up to 72 deg behind it, each with 2 x 3 fish moulds (dark fish shapes) - seven of the twelve
//            hold a golden taiyaki. The fish are tilted toward the street because the hero camera looks up at a counter.
//   FISH     one taiyaki shape (head +X, open mouth, round body, notched fan tail), extruded with a bevel so it is
//            plump; an eye dot and a gill arc 6 mm proud of the face. The same fish is the iron's cakes, the stacked
//            ones in the glass case (two tiers leaning back), the one peeking from the paper bag on the bench, and,
//            1.25 m long, the carved signboard swinging from a bracket on the upper floor, turned 33 deg toward +X
//            so it faces both the front and the hero camera.
//   FRONT    a lattice entrance door with paper panes on the +X half under a three-panel red noren with one big pale fish
//            silhouette (no lettering); a short shed awning over the whole ground floor; a balcony on the awning with a
//            baluster rail, a pole of laundry and a small paper window behind; a bench with the bag; a potted plant.
//   BIKE     a step-through town bicycle leaning on its stand along the +X wall, where the hero camera sees it whole.
//   STEAM    eight small puffs (icosahedra, no ink) rising off the iron; pose("steam@t") rewrites their vertices.
// Proportions (real size, base unit the storey height S = 2.7 m): front 4.0 m, depth 2.4 m; window 0.95-2.2 m, 2.4 m
//   wide; door 1.05 x 2.2 m; awning 2.55 -> 2.32 m, 0.7 m out; balcony floor 2.8 m, rail 3.5 m; upper wall to 5.1 m,
//   eave 5.0 m with 0.6 m overhang, ridge cap top 5.8 m (2.15 S). Iron cakes 0.32 m, case cakes 0.25 m (both about
//   double real size, so the fish read at thumbnail size), sign 1.25 m, noren fish 0.92 m.
// Joints: none that move; `counter` and `sign` are empty markers for --focus close-ups.
// Budget: ~6.6k triangles, 10 meshes (one per material, steam its own).
// Options: build(THREE, kit, colors, { height }) scales the whole shop uniformly (default meta.height).
// Clips: steam (2 s loop): puffs rise 0.6 m off the iron, swell and fade to nothing, so the loop has no seam.
// Colours (noon, warm browns and golds): boards, posts, counter, bench, frames iris #5c3d32 / hair #241c16; roof, iron,
//   awning, tyres iris / hair at threshold 0.25; plaster skirt, laundry, bag moon #fff6e4 / sky #f2d7ae; taiyaki and
//   the signboard sky #f2d7ae / skin #f0c2ae; noren, red laundry, bicycle frame, pot accent #c4452d / iris; noren fish
//   moon flat; paper panes practical #fffaf2 / sclera #f6f3ee; glints and steam practical / sclera, no hull; seams,
//   mould recesses, eyes, the dark window interior hair flat.
// Pale parts use threshold 0.1 so faces square to the street stay lit (front dot 0.30).

export const meta = {
  name: "taiyaki-ya",
  height: 5.8,
  script: "noon",
  colors: {
    wood: "#5c3d32", woodShade: "#241c16",
    roof: "#5c3d32", roofShade: "#241c16",
    plaster: "#fff6e4", plasterShade: "#f2d7ae",
    cake: "#f2d7ae", cakeShade: "#f0c2ae",
    cloth: "#c4452d", clothShade: "#5c3d32",
    emblem: "#fff6e4",
    paper: "#fffaf2", paperShade: "#f6f3ee",
    glint: "#fffaf2",
    steam: "#fffaf2", steamShade: "#f6f3ee",
    line: "#241c16",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height } = opts;
  const root = new THREE.Group();
  root.name = "taiyaki-ya";
  const shop = new THREE.Group(); // the uniform size scale lives here
  shop.name = "body";
  shop.scale.setScalar(height / meta.height);
  root.add(shop);
  const joints = {};
  // empty markers for close-ups (--focus counter / sign); nothing hangs off them
  for (const [k, x, y, z] of [["counter", -0.6, 1.4, 1.5], ["sign", 1.3, 3.6, 1.9]]) {
    const o = new THREE.Object3D();
    o.name = k, o.position.set(x, y, z);
    shop.add(o), (joints[k] = o);
  }

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  function tri(key, a, b, e, ref) {
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-9) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    S(key).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  // axis-aligned box by its extents
  function bx(key, x0, x1, y0, y1, z0, z1) {
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  const nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  function beam(key, a, b, w, h, up = [0, 1, 0]) {
    const d = sub(b, a);
    let s = cross(d, up);
    if (Math.hypot(...s) < 1e-6) s = cross(d, [1, 0, 0]);
    s = nrm(s);
    const u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // a flat quad on a plane of constant z (facing +z) or constant x (facing +x)
  const fz = (key, x0, x1, y0, y1, z) => quad(key, [x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [(x0 + x1) / 2, (y0 + y1) / 2, z - 1]);
  const fx = (key, z0, z1, y0, y1, x) => quad(key, [x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0], [x - 1, (y0 + y1) / 2, (z0 + z1) / 2]);

  // three.js geometry into a soup, through a matrix (winding kept; flipped for a mirroring matrix)
  const M = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) =>
    new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s));
  function geo(key, g, m) {
    const gg = (g.index ? g.toNonIndexed() : g).applyMatrix4(m);
    const p = gg.attributes.position.array;
    const flip = m.determinant() < 0;
    const out = S(key);
    for (let i = 0; i < p.length; i += 9) {
      if (flip) out.push(p[i], p[i + 1], p[i + 2], p[i + 6], p[i + 7], p[i + 8], p[i + 3], p[i + 4], p[i + 5]);
      else for (let k = 0; k < 9; k++) out.push(p[i + k]);
    }
  }

  // ---------- the taiyaki ----------
  // unit fish, head at +X; L = length in metres
  function fishShape(L) {
    const sh = new THREE.Shape();
    const P = (x, y) => [x * L, y * L];
    sh.moveTo(...P(0.5, 0.035));
    sh.quadraticCurveTo(...P(0.49, 0.29), ...P(0.22, 0.31));
    sh.quadraticCurveTo(...P(0.0, 0.33), ...P(-0.23, 0.12));
    sh.lineTo(...P(-0.37, 0.3));
    sh.quadraticCurveTo(...P(-0.48, 0.31), ...P(-0.5, 0.2));
    sh.lineTo(...P(-0.42, 0.0));
    sh.lineTo(...P(-0.5, -0.2));
    sh.quadraticCurveTo(...P(-0.48, -0.31), ...P(-0.37, -0.3));
    sh.lineTo(...P(-0.23, -0.12));
    sh.quadraticCurveTo(...P(0.0, -0.33), ...P(0.22, -0.29));
    sh.quadraticCurveTo(...P(0.47, -0.26), ...P(0.5, -0.05));
    sh.lineTo(...P(0.43, -0.005));
    sh.closePath();
    return sh;
  }
  // a plump fish centred on its local origin, front face toward local +Z; m places it
  function fish(m, L, { key = "cake", bevelSeg = 1, scales = false } = {}) {
    const T = 0.2 * L; // thickness
    const g = new THREE.ExtrudeGeometry(fishShape(L), {
      depth: T * 0.5, bevelEnabled: true, bevelThickness: T * 0.25, bevelSize: 0.035 * L, bevelSegments: bevelSeg, curveSegments: 3, steps: 1,
    });
    g.translate(0, 0, -T * 0.25);
    geo(key, g, m);
    const zf = T * 0.5 + 0.006;
    const lw = Math.max(0.01, 0.02 * L);
    geo("line", new THREE.CircleGeometry(Math.max(0.014, 0.06 * L), 8), m.clone().multiply(M(0.31 * L, 0.11 * L, zf)));
    geo("line", new THREE.RingGeometry(0.24 * L - lw, 0.24 * L, 6, 1, Math.PI - 0.75, 1.5), m.clone().multiply(M(0.42 * L, -0.01 * L, zf)));
    if (scales)
      for (const [x, y] of [[0.0, 0.1], [0.0, -0.1], [-0.13, 0.0], [0.13, 0.0]])
        geo("line", new THREE.RingGeometry(0.07 * L - lw, 0.07 * L, 5, 1, Math.PI / 2, Math.PI), m.clone().multiply(M(x * L, y * L, zf - 0.004)));
  }
  // a flat fish shape (mould recess, noren emblem)
  const flatFish = (key, m, L) => geo(key, new THREE.ShapeGeometry(fishShape(L), 3), m);

  // ---------- shell ----------
  const W0 = -2.0, W1 = 2.0, ZB = -0.9, ZF = 1.5, ZC = (ZB + ZF) / 2; // walls; ZC the ridge line
  const RZ = 0.9; // back of the window recess
  const WX0 = -1.8, WX1 = 0.6, WY0 = 0.95, WY1 = 2.2; // take-out window
  const DX0 = 0.75, DX1 = 1.8, DY1 = 2.2; // door
  const KY = 0.9; // plaster skirt top
  bx("wood", W0, W1, 0, 5.1, ZB, RZ); // body behind the recess
  bx("wood", W0, W1, 2.2, 5.1, RZ, ZF); // lintel + upper floor
  bx("wood", W0, WX0, 0, 2.2, RZ, ZF); // left pier
  bx("wood", WX1, W1, 0, 2.2, RZ, ZF); // door section
  bx("plaster", WX0, WX1, 0, WY0 - 0.05, RZ, ZF); // skirt under the counter (the window's sill wall)
  fz("line", WX0, WX1, WY0, WY1, RZ + 0.005); // dark interior
  // plaster skirt facings on the street and +X sides
  for (const [x0, x1] of [[W0, WX0], [WX1, DX0], [DX1, W1]]) bx("plaster", x0, x1, 0, KY, ZF, ZF + 0.03);
  bx("plaster", WX0, WX1, 0, KY, ZF, ZF + 0.03);
  bx("plaster", W1, W1 + 0.03, 0, KY, ZB, ZF + 0.03);
  // corner posts, floor beam, window frame
  for (const x of [W0, W1]) bx("wood", x - 0.07, x + 0.07, 0, 5.1, ZF - 0.1, ZF + 0.06);
  bx("wood", W1 - 0.05, W1 + 0.08, 0, 5.1, ZB - 0.07, ZB + 0.07);
  bx("wood", W0, W1, 2.62, 2.78, ZF, ZF + 0.06);
  bx("wood", WX0 - 0.06, WX1 + 0.06, WY1, WY1 + 0.1, ZF, ZF + 0.05);
  for (const x of [WX0, WX1]) bx("wood", x - 0.06, x + 0.06, WY0, WY1, ZF - 0.02, ZF + 0.05);
  // board seams on the dark boards (street side above the awning, +X side)
  for (let x = W0 + 0.27; x < W1 - 0.1; x += 0.27) fz("line", x - 0.012, x + 0.012, 2.78, 5.1, ZF + 0.004);
  for (let z = ZB + 0.27; z < ZF - 0.1; z += 0.27) {
    fx("line", z - 0.012, z + 0.012, KY, 2.62, W1 + 0.004);
    fx("line", z - 0.012, z + 0.012, 2.78, 5.1, W1 + 0.004);
  }
  bx("wood", W1, W1 + 0.05, 2.62, 2.78, ZB, ZF);
  // a small paper window on the +X side, upper floor
  fx("paper", -0.4, 0.6, 3.4, 4.2, W1 + 0.01);
  for (const [z0, z1, y0, y1] of [[-0.45, 0.65, 3.35, 3.4], [-0.45, 0.65, 4.2, 4.25], [-0.45, -0.4, 3.35, 4.25], [0.6, 0.65, 3.35, 4.25]])
    bx("wood", W1, W1 + 0.04, y0, y1, z0, z1);
  for (const z of [-0.067, 0.267]) fx("line", z - 0.012, z + 0.012, 3.4, 4.2, W1 + 0.015);
  fx("line", -0.4, 0.6, 3.788, 3.812, W1 + 0.015);

  // ---------- roof (gable, ridge along the street) ----------
  const EY = 5.0, EZ = 1.8, RY = 5.62, RX0 = -2.35, RX1 = 2.35, RT = 0.12;
  hex("wood", [[W0, 5.1, ZF], [W1, 5.1, ZF], [W1, 5.1, ZB], [W0, 5.1, ZB], [W0, 5.6, ZC + 0.02], [W1, 5.6, ZC + 0.02], [W1, 5.6, ZC - 0.02], [W0, 5.6, ZC - 0.02]]);
  for (const s of [1, -1]) {
    hex("roof", [[RX0, EY, ZC + s * EZ], [RX1, EY, ZC + s * EZ], [RX1, RY, ZC], [RX0, RY, ZC],
      [RX0, EY + RT, ZC + s * EZ], [RX1, EY + RT, ZC + s * EZ], [RX1, RY + RT, ZC], [RX0, RY + RT, ZC]]);
  }
  // tile rows on the street slope
  for (let x = RX0 + 0.15; x < RX1 - 0.05; x += 0.22) {
    const a = [x, EY + RT + 0.015, ZC + EZ - 0.01], b = [x, RY + RT + 0.015, ZC + 0.05];
    quad("line", [x - 0.025, a[1], a[2]], [x + 0.025, a[1], a[2]], [x + 0.025, b[1], b[2]], [x - 0.025, b[1], b[2]], [x, EY - 1, ZC + EZ - 1]);
  }
  bx("roof", RX0 - 0.05, RX1 + 0.05, RY + 0.05, RY + 0.18, ZC - 0.14, ZC + 0.14);
  for (const x of [RX0 - 0.02, RX1 + 0.02]) bx("roof", x - 0.1, x + 0.1, RY + 0.05, 5.8, ZC - 0.18, ZC + 0.18);
  // barge boards on the gable ends
  for (const x of [RX0, RX1]) for (const s of [1, -1]) beam("wood", [x, EY - 0.05, ZC + s * EZ], [x, RY - 0.05, ZC], 0.06, 0.14, [0, 1, 0]);

  // ---------- awning ----------
  const AY0 = 2.55, AY1 = 2.32, AZ1 = ZF + 0.7;
  hex("roof", [[W0 - 0.08, AY0, ZF], [W1 + 0.08, AY0, ZF], [W1 + 0.08, AY1, AZ1], [W0 - 0.08, AY1, AZ1],
    [W0 - 0.08, AY0 + 0.06, ZF], [W1 + 0.08, AY0 + 0.06, ZF], [W1 + 0.08, AY1 + 0.06, AZ1], [W0 - 0.08, AY1 + 0.06, AZ1]]);
  for (let x = W0 + 0.05; x < W1; x += 0.2) {
    const a = [x, AY0 + 0.07, ZF + 0.02], b = [x, AY1 + 0.07, AZ1 - 0.01];
    quad("line", [x - 0.02, a[1], a[2]], [x + 0.02, a[1], a[2]], [x + 0.02, b[1], b[2]], [x - 0.02, b[1], b[2]], [x, 0, ZF]);
  }
  for (const x of [W0 + 0.2, W1 - 0.2]) beam("wood", [x, 2.0, ZF], [x, AY1 + 0.01, AZ1 - 0.1], 0.05, 0.06, [1, 0, 0]);

  // ---------- counter + taiyaki iron ----------
  bx("wood", WX0 - 0.05, WX1 + 0.05, WY0 - 0.06, WY0, RZ, ZF + 0.35);
  bx("wood", WX0, WX1, WY0 - 0.14, WY0 - 0.06, ZF + 0.25, ZF + 0.33); // apron
  const GX = -1.2, th = (45 * Math.PI) / 180, lid = (72 * Math.PI) / 180;
  const FE = [GX, 1.02, 1.7]; // the plate's front bottom edge
  const PL = 0.7, PW = 1.16, PT = 0.06;
  const slope = (a) => [0, Math.sin(a), -Math.cos(a)];
  const plateC = [GX, FE[1] + slope(th)[1] * PL / 2, FE[2] + slope(th)[2] * PL / 2];
  const hinge = [GX, FE[1] + slope(th)[1] * PL, FE[2] + slope(th)[2] * PL];
  const lidC = [GX, hinge[1] + slope(lid)[1] * PL / 2, hinge[2] + slope(lid)[2] * PL / 2];
  // firebox wedge under the plate
  hex("roof", [[GX - 0.55, WY0, FE[2] - 0.02], [GX + 0.55, WY0, FE[2] - 0.02], [GX + 0.55, WY0, hinge[2]], [GX - 0.55, WY0, hinge[2]],
    [GX - 0.55, FE[1] - 0.02, FE[2] - 0.02], [GX + 0.55, FE[1] - 0.02, FE[2] - 0.02], [GX + 0.55, hinge[1] - 0.05, hinge[2]], [GX - 0.55, hinge[1] - 0.05, hinge[2]]]);
  bx("line", GX - 0.3, GX + 0.3, WY0 + 0.015, WY0 + 0.055, FE[2] - 0.015, FE[2] - 0.01); // fire slot
  // a plate with 2 x 3 moulds; filled = which hold a cake
  function plate(center, a, filled) {
    const pm = M(...center, -(Math.PI / 2 - a));
    geo("roof", new THREE.BoxGeometry(PW, PL, PT), pm);
    geo("roof", new THREE.BoxGeometry(0.04, 0.16, 0.035), pm.clone().multiply(M(PW / 2 + 0.07, 0, 0, 0, 0, Math.PI / 2))); // handle
    let k = 0;
    for (const v of [-0.17, 0.17]) for (const u of [-0.37, 0, 0.37]) {
      const at = pm.clone().multiply(M(u, v, PT / 2 + 0.004));
      flatFish("line", at, 0.355);
      if (filled[k++]) fish(pm.clone().multiply(M(u, v, PT / 2 + 0.014)), 0.32);
    }
  }
  plate(plateC, th, [1, 1, 0, 1, 0, 1]);
  plate(lidC, lid, [0, 1, 0, 1, 0, 0]);

  // ---------- glass case with stacked taiyaki ----------
  const CX0 = -0.4, CX1 = 0.55, CZ0 = 1.22, CZ1 = 1.78, CY0 = WY0, CY1 = 1.52;
  bx("wood", CX0, CX1, CY0, CY0 + 0.06, CZ0, CZ1); // base
  bx("wood", CX0, CX1, CY1 - 0.04, CY1, CZ0, CZ1); // top frame (a glass top would be a pane; the frame is enough)
  for (const x of [CX0 + 0.02, CX1 - 0.02]) for (const z of [CZ0 + 0.02, CZ1 - 0.02]) bx("wood", x - 0.02, x + 0.02, CY0, CY1, z - 0.02, z + 0.02);
  bx("wood", CX0 + 0.04, CX1 - 0.04, CY0 + 0.06, CY0 + 0.22, CZ0 + 0.02, CZ0 + 0.26); // inner step
  fz("line", CX0 + 0.04, CX1 - 0.04, CY0 + 0.06, CY1 - 0.04, CZ0 + 0.03); // dark back
  fz("glint", CX0 + 0.1, CX0 + 0.16, CY0 + 0.3, CY1 - 0.07, CZ1 + 0.003);
  fz("glint", CX1 - 0.17, CX1 - 0.14, CY0 + 0.1, CY0 + 0.3, CZ1 + 0.003);
  const lean = -0.38;
  for (const [x, y, z] of [[-0.24, 1.12, 1.6], [0.04, 1.11, 1.62], [0.32, 1.12, 1.6],
    [-0.12, 1.3, 1.34], [0.18, 1.31, 1.33], [-0.26, 1.34, 1.3], [0.38, 1.33, 1.3]])
    fish(M(x, y, z, lean, 0, 0), 0.25);

  // ---------- door + noren ----------
  bx("wood", DX0 - 0.06, DX1 + 0.06, DY1, DY1 + 0.08, ZF, ZF + 0.05);
  for (const x of [DX0, DX1]) bx("wood", x - 0.05, x + 0.05, 0, DY1, ZF, ZF + 0.05);
  fz("paper", DX0, DX1, 0.05, DY1, ZF + 0.01);
  const mid = (DX0 + DX1) / 2;
  bx("wood", mid - 0.025, mid + 0.025, 0, DY1, ZF + 0.01, ZF + 0.05);
  for (const x0 of [DX0, mid]) {
    for (let i = 1; i < 3; i++) fz("wood", x0 + (i * (mid - DX0)) / 3 - 0.014, x0 + (i * (mid - DX0)) / 3 + 0.014, 0.05, DY1, ZF + 0.02);
    for (let j = 1; j < 6; j++) fz("wood", x0, x0 + (mid - DX0), 0.05 + (j * (DY1 - 0.05)) / 6 - 0.014, 0.05 + (j * (DY1 - 0.05)) / 6 + 0.014, ZF + 0.022);
    bx("wood", x0, x0 + (mid - DX0), 0.05, 0.4, ZF + 0.01, ZF + 0.035); // kick panel
  }
  bx("wood", DX0 - 0.1, DX1 + 0.1, 0, 0.05, ZF, ZF + 0.08); // sill
  const NX0 = DX0 - 0.07, NX1 = DX1 + 0.07, NY0 = 1.18, NY1 = 2.26, NZ = ZF + 0.12;
  beam("wood", [NX0 - 0.08, NY1 + 0.02, NZ], [NX1 + 0.08, NY1 + 0.02, NZ], 0.03, 0.03);
  for (const x of [NX0 - 0.05, NX1 + 0.05]) bx("wood", x - 0.015, x + 0.015, NY1 - 0.01, NY1 + 0.04, ZF, NZ);
  const panel = (NX1 - NX0 - 0.03) / 3;
  for (let i = 0; i < 3; i++) {
    const x0 = NX0 + i * (panel + 0.015);
    bx("cloth", x0, x0 + panel, NY0, NY1, NZ - 0.008, NZ + 0.008);
  }
  bx("cloth", NX0, NX1, NY1 - 0.1, NY1, NZ - 0.014, NZ + 0.014); // the sewn top band
  flatFish("emblem", M(mid - 0.02, (NY0 + NY1) / 2 - 0.06, NZ + 0.016), 0.92);
  geo("cloth", new THREE.CircleGeometry(0.04, 8), M(mid - 0.02 + 0.3 * 0.92, (NY0 + NY1) / 2 - 0.06 + 0.1 * 0.92, NZ + 0.02));

  // ---------- upper floor: window, balcony, laundry, fish sign ----------
  const UX0 = -1.05, UX1 = 0.15, UY0 = 3.15, UY1 = 4.1;
  fz("paper", UX0, UX1, UY0, UY1, ZF + 0.01);
  for (const [x0, x1, y0, y1] of [[UX0 - 0.06, UX1 + 0.06, UY0 - 0.06, UY0], [UX0 - 0.06, UX1 + 0.06, UY1, UY1 + 0.06],
    [UX0 - 0.06, UX0, UY0, UY1], [UX1, UX1 + 0.06, UY0, UY1]]) bx("wood", x0, x1, y0, y1, ZF, ZF + 0.05);
  for (let i = 1; i < 4; i++) fz("wood", UX0 + (i * (UX1 - UX0)) / 4 - 0.012, UX0 + (i * (UX1 - UX0)) / 4 + 0.012, UY0, UY1, ZF + 0.02);
  fz("wood", UX0, UX1, (UY0 + UY1) / 2 - 0.012, (UY0 + UY1) / 2 + 0.012, ZF + 0.022);
  const BX0 = -1.5, BX1 = 0.6, BZ = ZF + 0.5, BY = 2.82, RTOP = 3.48;
  bx("wood", BX0, BX1, BY - 0.06, BY, ZF, BZ);
  for (const x of [BX0 + 0.1, BX1 - 0.1]) beam("wood", [x, AY0 + 0.06, ZF + 0.02], [x, BY - 0.06, BZ - 0.08], 0.05, 0.05, [1, 0, 0]);
  bx("wood", BX0, BX1, RTOP - 0.05, RTOP, BZ - 0.05, BZ); // top rail
  bx("wood", BX0, BX1, BY + 0.08, BY + 0.12, BZ - 0.04, BZ - 0.01); // bottom rail
  for (const x of [BX0, BX1]) {
    bx("wood", x - 0.03, x + 0.03, BY, RTOP, BZ - 0.06, BZ);
    bx("wood", x - 0.02, x + 0.02, RTOP - 0.05, RTOP, ZF, BZ);
  }
  for (let x = BX0 + 0.1; x < BX1 - 0.05; x += 0.1) bx("wood", x - 0.012, x + 0.012, BY, RTOP - 0.05, BZ - 0.035, BZ - 0.015);
  // laundry pole on two arms, three cloths over the rail
  const LY = 4.2, LZ = ZF + 0.38;
  for (const x of [BX0 + 0.05, BX1 - 0.05]) beam("wood", [x, LY, ZF], [x, LY, LZ + 0.02], 0.03, 0.03, [0, 1, 0]);
  beam("wood", [BX0 - 0.05, LY + 0.01, LZ], [BX1 + 0.05, LY + 0.01, LZ], 0.035, 0.035);
  bx("plaster", -1.38, -1.0, LY - 0.62, LY - 0.01, LZ - 0.006, LZ + 0.006); // towel
  bx("cloth", -0.9, -0.6, LY - 0.5, LY - 0.01, LZ - 0.006, LZ + 0.006); // tenugui
  bx("plaster", -0.42, 0.08, LY - 0.2, LY - 0.01, LZ - 0.006, LZ + 0.006); // shirt shoulders and sleeves
  bx("plaster", -0.3, -0.04, LY - 0.62, LY - 0.19, LZ - 0.006, LZ + 0.006); // shirt body
  bx("plaster", 0.25, 0.48, LY - 0.36, LY - 0.01, LZ - 0.006, LZ + 0.006); // small cloth
  // fish signboard on a bracket, hanging by two cords
  const SX = 1.3, SY = 3.6, SZ = ZF + 0.45, SL = 1.25;
  beam("wood", [SX, 4.42, ZF], [SX, 4.42, SZ + 0.05], 0.06, 0.08, [0, 1, 0]);
  beam("wood", [SX, 4.1, ZF], [SX, 4.4, SZ - 0.1], 0.04, 0.04, [1, 0, 0]); // brace
  // the board swings on the arm's end, turned 33 deg toward the +X street so both the front and the hero see it
  const SM = M(SX, 0, SZ, 0, 0.58, 0), sp = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(SM).toArray();
  beam("wood", sp(-0.45, 4.36, 0), sp(0.45, 4.36, 0), 0.05, 0.06);
  for (const x of [-0.38, 0.38]) beam("line", sp(x, 4.34, 0), sp(x, SY + 0.3, 0), 0.015, 0.015, [0, 0, 1]);
  fish(SM.clone().multiply(M(0, SY, 0)), SL, { bevelSeg: 2 });

  // ---------- bench, bag, plant ----------
  const BNX0 = -1.62, BNX1 = -0.42, BNZ0 = ZF + 0.5, BNZ1 = ZF + 0.85, BNY = 0.45;
  bx("wood", BNX0, BNX1, BNY - 0.05, BNY, BNZ0, BNZ1);
  for (const x of [BNX0 + 0.08, BNX1 - 0.08]) {
    bx("wood", x - 0.03, x + 0.03, 0, BNY - 0.05, BNZ0 + 0.03, BNZ1 - 0.03);
    bx("wood", x - 0.025, x + 0.025, 0.12, 0.16, BNZ0 + 0.03, BNZ1 - 0.03);
  }
  // paper bag with a taiyaki peeking out
  const BGX = -0.7, BGZ = (BNZ0 + BNZ1) / 2;
  bx("plaster", BGX - 0.12, BGX + 0.12, BNY, BNY + 0.27, BGZ - 0.07, BGZ + 0.07);
  hex("plaster", [[BGX - 0.12, BNY + 0.27, BGZ - 0.07], [BGX + 0.12, BNY + 0.27, BGZ - 0.07], [BGX + 0.12, BNY + 0.27, BGZ + 0.07], [BGX - 0.12, BNY + 0.27, BGZ + 0.07],
    [BGX - 0.12, BNY + 0.31, BGZ - 0.07], [BGX + 0.12, BNY + 0.31, BGZ - 0.07], [BGX + 0.12, BNY + 0.29, BGZ + 0.075], [BGX - 0.12, BNY + 0.29, BGZ + 0.075]]);
  fish(M(BGX - 0.02, BNY + 0.36, BGZ, -0.15, 0, 0.5), 0.24);
  // potted plant at the +X corner of the door
  const PX = 1.9, PZ = ZF + 0.32;
  geo("cloth", new THREE.CylinderGeometry(0.17, 0.13, 0.32, 9), M(PX, 0.16, PZ));
  geo("cloth", new THREE.CylinderGeometry(0.19, 0.19, 0.05, 9), M(PX, 0.32, PZ));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3, r = 0.2 + 0.12 * ((i * 5) % 3) / 2, h = 0.75 + 0.18 * ((i * 7) % 4) / 3;
    const base = [PX + Math.cos(a) * 0.04, 0.33, PZ + Math.sin(a) * 0.04];
    const tip = [PX + Math.cos(a) * r, 0.33 + h, PZ + Math.sin(a) * r];
    const midp = [0, 1, 2].map((k) => base[k] * 0.45 + tip[k] * 0.55);
    const side = nrm(cross(sub(tip, base), [0, 1, 0]).map((v, k) => v + (k === 1 ? 0 : 1e-6)));
    const fl = nrm(cross(side, sub(tip, base)));
    const wv = 0.07, tv = 0.02;
    const pts = [
      [0, 1, 2].map((k) => midp[k] + side[k] * wv), [0, 1, 2].map((k) => midp[k] + fl[k] * tv),
      [0, 1, 2].map((k) => midp[k] - side[k] * wv), [0, 1, 2].map((k) => midp[k] - fl[k] * tv),
    ];
    const ref = midp;
    for (let j = 0; j < 4; j++) {
      tri("wood", base, pts[j], pts[(j + 1) % 4], ref);
      tri("wood", tip, pts[j], pts[(j + 1) % 4], ref);
    }
  }

  // ---------- bicycle along the +X wall ----------
  const BKX = W1 + 0.32, WR = 0.33, TR = 0.028, WY = WR + TR, ZR = -0.55, ZFr = 0.55;
  for (const z of [ZR, ZFr]) {
    geo("roof", new THREE.TorusGeometry(WR, TR, 5, 18), M(BKX, WY, z, 0, Math.PI / 2, 0));
    geo("line", new THREE.CircleGeometry(0.05, 8), M(BKX + 0.01, WY, z, 0, Math.PI / 2, 0));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI + 0.3;
      beam("line", [BKX, WY + Math.sin(a) * WR, z + Math.cos(a) * WR], [BKX, WY - Math.sin(a) * WR, z - Math.cos(a) * WR], 0.006, 0.006, [1, 0, 0]);
    }
  }
  const BB = [BKX, 0.3, -0.05], SEAT = [BKX, 0.86, -0.22], HEAD = [BKX, 0.86, 0.42], HB = [BKX, 0.62, 0.46];
  const FR = 0.035;
  for (const [a, b] of [[BB, SEAT], [BB, HB], [BB, [BKX, WY, ZR]], [SEAT, [BKX, WY, ZR]], [HEAD, [BKX, WY, ZFr]],
    [[BKX, 0.62, -0.16], HB]]) beam("cloth", a, b, FR, FR, [1, 0, 0]);
  beam("cloth", [BKX, 0.86, 0.42], [BKX, 1.02, 0.36], FR, FR, [1, 0, 0]);
  beam("roof", [BKX - 0.27, 1.02, 0.34], [BKX + 0.27, 1.02, 0.34], 0.03, 0.03, [0, 1, 0]);
  bx("roof", BKX - 0.08, BKX + 0.08, 0.88, 0.94, -0.34, -0.12); // saddle
  bx("roof", BKX - 0.03, BKX + 0.03, 0.86, 0.9, -0.26, -0.18);
  // front basket (open top: four walls and a floor) and fenders
  const KZ0 = 0.52, KZ1 = 0.82, KY0 = 0.74, KY1 = 0.98, KW = 0.17;
  bx("roof", BKX - KW, BKX + KW, KY0, KY0 + 0.02, KZ0, KZ1);
  bx("roof", BKX - KW, BKX + KW, KY0, KY1, KZ1 - 0.02, KZ1);
  bx("roof", BKX - KW, BKX + KW, KY0, KY1, KZ0, KZ0 + 0.02);
  for (const s of [-1, 1]) bx("roof", BKX + s * KW - 0.01, BKX + s * KW + 0.01, KY0, KY1, KZ0, KZ1);
  for (let y = KY0 + 0.07; y < KY1; y += 0.07) fx("line", KZ0, KZ1, y - 0.006, y + 0.006, BKX + KW + 0.012);
  beam("roof", [BKX, 0.32, -0.05], [BKX + 0.22, 0.015, -0.15], 0.025, 0.025, [0, 0, 1]); // stand

  // ---------- steam (vertex rewrite) ----------
  const NP = 8;
  const unit = new THREE.IcosahedronGeometry(1, 1);
  const up = unit.attributes.position.array; // non-indexed, 240 vertices
  const puffs = [];
  for (let k = 0; k < NP; k++) {
    // seeded from k only: x across the plate, a phase, a size
    const hsh = (n) => ((Math.sin(k * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
    puffs.push({ x: GX - 0.42 + (0.84 * (k + 0.5)) / NP + (hsh(1) - 0.5) * 0.06, z: plateC[2] + 0.12 + hsh(2) * 0.08,
      y: plateC[1] + 0.12, phase: ((k * 3) % NP) / NP, r: 0.055 + hsh(3) * 0.03, sway: hsh(4) * Math.PI * 2 });
  }
  const steamP = new Float32Array(up.length * NP), steamN = new Float32Array(up.length * NP);
  {
    const ug = unit.clone();
    ug.computeVertexNormals();
    const un = ug.attributes.normal.array;
    for (let k = 0; k < NP; k++) steamN.set(un, k * up.length);
  }
  function steamAt(t) {
    for (let k = 0; k < NP; k++) {
      const p = puffs[k], u = ((t / 2 + p.phase) % 1 + 1) % 1;
      const s = p.r * Math.sin(Math.PI * u) * (0.55 + 0.6 * u);
      const cx = p.x + 0.04 * Math.sin(u * Math.PI * 2 + p.sway), cy = p.y + 0.6 * u, cz = p.z + 0.12 * u;
      const o = k * up.length;
      for (let i = 0; i < up.length; i += 3) {
        steamP[o + i] = cx + up[i] * s, steamP[o + i + 1] = cy + up[i + 1] * s * 0.85, steamP[o + i + 2] = cz + up[i + 2] * s;
      }
    }
  }
  steamAt(0);

  // ---------- meshes ----------
  const MAT = {
    wood: [c.wood, c.woodShade, 0.1, true],
    roof: [c.roof, c.roofShade, 0.25, true],
    plaster: [c.plaster, c.plasterShade, 0.1, true],
    cake: [c.cake, c.cakeShade, 0.1, true],
    cloth: [c.cloth, c.clothShade, 0.1, true],
    emblem: [c.emblem, c.emblem, -1, false],
    paper: [c.paper, c.paperShade, 0.1, false],
    glint: [c.glint, c.glint, -1, false],
    line: [c.line, c.line, -1, false],
  };
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, { threshold, outline });
    mesh.name = key;
    shop.add(mesh);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(steamP, 3));
  sg.setAttribute("normal", new THREE.BufferAttribute(steamN, 3));
  const steamMesh = kit.toon(sg, c.steam, c.steamShade, { threshold: -0.25, outline: false });
  steamMesh.name = "steam";
  shop.add(steamMesh);

  // ---------- poses and clips ----------
  const CLIPS = { steam: 2 };
  function setSteam(t) {
    steamAt(t);
    sg.attributes.position.needsUpdate = true;
    sg.computeBoundingSphere(), sg.computeBoundingBox();
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`taiyaki-ya: no clip "${m[1]}" (clips: steam)`);
      return setSteam(+m[2]);
    }
    if (name !== "rest") throw new Error(`taiyaki-ya: unknown pose "${name}" (rest, or steam@<seconds>)`);
    setSteam(0.6);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
