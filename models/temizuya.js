// temizuya.js - a Shinto shrine purification fountain (temizuya / chozuya), static. One set with models/shrine.js and
// models/torii.js (same script, same vermilion / dark-roof pairs).
// Contract: harness/lab/README.md. Meters, +Y up, the worshipper's side faces +Z, its left is +X, stands on y = 0,
// centred on x = 0, z = 0.
//
// Construction (three primitives placed by matrices and merged into one mesh per material, plus one lofted roof solid):
//   PAVILION four square vermilion posts on stone footings, tied at the top by head beams (front, back, sides) and a
//            lower tie (nuki) on the front and back that sticks out past the posts, torii style. A short vermilion king
//            post stands on each side beam under the ridge, so the gables show a red truss. A dark gravel bed in a stone
//            kerb lies under the basin (it catches the spill and frames the pale stone from a low camera).
//   ROOF     a gable (kirizuma), ridge along x. One (z, y) profile, both slopes sagging below their chord; the whole roof
//            sweeps up toward both gables (sori, lift = 0.12 (|x| / XR)^3), the shrine's recipe at half the size.
//            One solid lofted through stations along x, split in two material groups under one hull: a dark tile slab on
//            top and a vermilion rafter layer under it, so every eave and gable edge shows dark over red. Flat tile rows
//            (hair, no hull) run down both slopes 6 mm over the slab. A dark ridge cap rides the same sweep, with a raised
//            end tile at each gable. Posts and beams stop 1.5 cm under the slab, or their tops show through it as specks.
//   BASIN    the identity cue: a long stone trough (chozubachi) on a slightly wider plinth, with a lip band 2 cm proud
//            round its top. Built hollow: a solid bottom and four rim walls 6 cm thick; the inner faces and the water
//            sheet 3 cm under the lip are dark, so the basin reads as full of water from any raised view, with two pale
//            ripple rings where the stream lands. (A pale water sheet vanished against the pale stone.)
//   SPOUT    a bamboo pipe (kakehi): an upright dark bamboo stand behind the basin with node bands, and a pipe from its
//            top reaching forward over the water. The stream is a pale tapered tube bending down into the water, always
//            lit (threshold -0.25). It sits at x = 0.52 so the hero camera sees it past the front-left post.
//   LADLES   six hishaku (cup on a long handle) laid cup-down on a two-rail wooden rack across the front of the basin
//            (one rail over the water, one on the front lip), handles running toward the worshipper past the lip, so
//            they read as a row of tines. The water behind them stays open.
// Proportions (real size, base unit the basin length B = 1.4 m): posts at x +-1.0, z +-0.7 (2.15 x 1.55 outside, 0.15
//   square, to 1.98), head beams 1.83-1.98, nuki 1.57-1.67; roof 2.9 x 2.3 (eaves at 1.92, 0.42 past the posts), ridge
//   2.29 + sweep, end tiles to 2.6; basin 1.4 x 0.6 x 0.7 (plinth 1.5 x 0.7 x 0.12, walls 0.06, water at 0.67);
//   bamboo stand to 1.06, pipe 0.064 dia; ladles: cup 0.11 dia x 0.085, handle 0.4 x 0.028 (both thickened for the
//   thumbnail), 0.16 apart; gravel bed 1.84 x 0.98.
// Options: build(THREE, kit, colors, { height, roof }).
//   height  scales the whole set uniformly so its top is `height` (default 2.6; 1.062 without the roof).
//   roof    false drops the pavilion (posts, beams, roof, footings, gravel): just the basin, spout and ladles.
// Colours (noon), base / shade:
//   vermilion (posts, beams, rafter layer, king posts)  accent #c4452d / iris #5c3d32, threshold 0.1 (as torii, shrine)
//   roof (tile slab, ridge cap, end tiles)               iris #5c3d32 / hair #241c16, threshold 0.1 (as the shrine);
//                                                        tile rows hair flat
//   stone (basin, plinth, footings, kerb)               sky #f2d7ae / iris #5c3d32, threshold 0.25 (as the shrine)
//   basin inside, water, gravel                          iris #5c3d32 (inside and gravel shade to hair #241c16)
//   stream and ripples                                   practical #fffaf2 / moon #fff6e4, always lit
//   bamboo (stand, pipe, rack stubs)                     iris #5c3d32 / hair #241c16; nodes hair
//   wood (ladles, rack rails)                            skin #f0c2ae / iris #5c3d32, threshold 0.2 (the shrine's hinoki)
//   Noon has no blue or green: the water is a dark sheet with pale ripples, the bamboo is old dark bamboo.

export const meta = {
  name: "temizuya",
  height: 2.6,
  script: "noon",
  colors: {
    vermilion: "#c4452d", vermilionShade: "#5c3d32",
    roof: "#5c3d32", roofShade: "#241c16",
    tileLine: "#241c16",
    stone: "#f2d7ae", stoneShade: "#5c3d32",
    inner: "#5c3d32", innerShade: "#241c16",
    gravel: "#5c3d32", gravelShade: "#241c16",
    water: "#5c3d32", waterShade: "#5c3d32",
    stream: "#fffaf2", streamShade: "#fff6e4",
    ripple: "#fffaf2",
    bamboo: "#5c3d32", bambooShade: "#241c16",
    node: "#241c16",
    wood: "#f0c2ae", woodShade: "#5c3d32",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { roof: withRoof = true } = opts;
  const H0 = withRoof ? 2.6 : 1.062; // the set's top as authored below
  const { height = H0 } = opts;
  const root = new THREE.Group();
  root.name = "temizuya";
  const body = new THREE.Group(); // the uniform size scale lives here, root stays the plain contract node
  body.name = "body";
  body.scale.setScalar(height / H0);
  root.add(body);
  const joints = {};

  // ---------- merged soups: primitives placed by a matrix, concatenated per material ----------
  const soups = {};
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e3 = new THREE.Euler(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3();
  function add(key, geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    q4.setFromEuler(e3.set(rx, ry, rz));
    m4.compose(p3.set(x, y, z), q4, s3.set(1, 1, 1));
    const g = (geo.index ? geo.toNonIndexed() : geo).applyMatrix4(m4);
    (soups[key] ??= []).push(g);
  }
  function merged(list) {
    const pos = [], nor = [];
    for (const g of list) {
      pos.push(...g.attributes.position.array);
      nor.push(...g.attributes.normal.array);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    return g;
  }
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cyl = (r0, r1, h, n = 10) => new THREE.CylinderGeometry(r0, r1, h, n);
  // a cylinder from point a to point b (radii ra at a, rb at b)
  function rod(key, a, b, ra, rb = ra, n = 10) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const d = B.clone().sub(A), len = d.length();
    const g = cyl(rb, ra, len, n); // CylinderGeometry: radiusTop at +y
    q4.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    m4.compose(A.add(B).multiplyScalar(0.5), q4, s3.set(1, 1, 1));
    (soups[key] ??= []).push(g.toNonIndexed().applyMatrix4(m4));
  }

  // ---------- basin (chozubachi) ----------
  const BX = 0.7, BZ = 0.3, BY = 0.7, LIP = 0.06, WY = 0.67, PY = 0.12;
  add("stone", box(1.5, PY, 0.7), 0, PY / 2, 0); // plinth
  add("stone", box(2 * BX, 0.5 - PY, 2 * BZ), 0, (0.5 + PY) / 2, 0); // solid bottom, up to y 0.5
  // rim walls 0.5 .. 0.7: outsides stone, insides dark (an inner skin 1 mm inside the inner face)
  add("stone", box(2 * BX, BY - 0.5, LIP), 0, 0.6, BZ - LIP / 2);
  add("stone", box(2 * BX, BY - 0.5, LIP), 0, 0.6, -BZ + LIP / 2);
  add("stone", box(LIP, BY - 0.5, 2 * BZ - 2 * LIP), BX - LIP / 2, 0.6, 0);
  add("stone", box(LIP, BY - 0.5, 2 * BZ - 2 * LIP), -BX + LIP / 2, 0.6, 0);
  // the lip band, 2 cm proud of the walls all round: four strips over the walls, so the inside stays open
  const LB = 0.07, LO = 0.02;
  for (const sz of [1, -1]) add("stone", box(2 * BX + 2 * LO, LB, LIP + LO), 0, BY - LB / 2, sz * (BZ - (LIP - LO) / 2));
  for (const sx of [1, -1]) add("stone", box(LIP + LO, LB, 2 * BZ + 2 * LO), sx * (BX - (LIP - LO) / 2), BY - LB / 2, 0);
  const IX = BX - LIP, IZ = BZ - LIP; // inner half sizes
  const innerH = BY - 0.5 - 0.004;
  add("inner", box(2 * IX, innerH, 0.004), 0, 0.5 + innerH / 2, IZ - 0.003);
  add("inner", box(2 * IX, innerH, 0.004), 0, 0.5 + innerH / 2, -IZ + 0.003);
  add("inner", box(0.004, innerH, 2 * IZ), IX - 0.003, 0.5 + innerH / 2, 0);
  add("inner", box(0.004, innerH, 2 * IZ), -IX + 0.003, 0.5 + innerH / 2, 0);
  add("water", box(2 * IX - 0.012, WY - 0.5, 2 * IZ - 0.012), 0, (WY + 0.5) / 2, 0);

  // ---------- spout (kakehi): bamboo stand behind the basin, elbow, pipe over the water ----------
  const SX = 0.52, SZ = -0.42, ST = 1.05, PR = 0.032;
  rod("bamboo", [SX, 0, SZ], [SX, ST, SZ], 0.045, 0.042, 10);
  add("bamboo", cyl(0.047, 0.047, 0.012, 10), SX, ST + 0.006, SZ); // cap on the stand
  const pipeA = [SX, ST - 0.07, SZ - 0.03], pipeB = [SX, 0.92, -0.04];
  rod("bamboo", pipeA, pipeB, PR, PR, 10);
  for (const y of [0.3, 0.64]) add("node", cyl(0.049, 0.049, 0.018, 10), SX, y, SZ); // nodes on the stand
  rod("node", [SX, 0.94, -0.21], [SX, 0.936, -0.19], PR + 0.006, PR + 0.006, 10); // a node on the pipe
  // stream: from the mouth, a short forward lip then down into the water, tapering
  const mouth = [SX, pipeB[1] - 0.005, pipeB[2] + 0.02];
  const midS = [SX, 0.82, 0.03], endS = [SX, WY - 0.01, 0.05];
  rod("stream", mouth, midS, 0.024, 0.022, 8);
  rod("stream", midS, endS, 0.022, 0.019, 8);
  add("stream", new THREE.SphereGeometry(0.022, 8, 6), ...midS);
  // ripple rings around the impact
  for (const [r, w] of [[0.05, 0.008], [0.09, 0.007]])
    add("ripple", new THREE.TorusGeometry(r, w, 4, 20), SX, WY + 0.002, endS[2], Math.PI / 2, 0, 0);

  // ---------- ladle rack and ladles (hishaku) ----------
  const RY = BY + 0.015; // rails lie on the side lips
  // two rails across the side lips: one over the water carries the cups, one on the front lip the handles
  for (const z of [0.17, BZ - 0.025]) rod("wood", [-BX + 0.02, RY, z], [BX - 0.02, RY, z], 0.016, 0.016, 8);
  const CUPR = 0.055, CUPH = 0.085;
  for (const x of [-0.6, -0.44, -0.28, -0.12, 0.04, 0.2]) {
    // cup-down on the back rail, handle running forward over the front rail and past the lip, falling slightly
    const cy = RY + 0.016 + CUPH / 2, cz = 0.17;
    add("wood", cyl(CUPR, CUPR * 0.94, CUPH, 12), x, cy, cz);
    const h0 = [x, RY + 0.035, cz + CUPR - 0.01], h1 = [x, RY + 0.03, BZ - 0.025], h2 = [x, RY + 0.0, BZ + 0.27];
    rod("wood", h0, h1, 0.014, 0.014, 6);
    rod("wood", h1, h2, 0.014, 0.013, 6);
  }

  // ---------- pavilion ----------
  if (withRoof) {
    const PX = 1.0, PZ = 0.7, PS = 0.15, PT = 1.98;
    for (const sx of [1, -1]) for (const sz of [1, -1]) {
      add("vermilion", box(PS, PT, PS), sx * PX, PT / 2, sz * PZ);
      add("stone", box(0.27, 0.1, 0.27), sx * PX, 0.05, sz * PZ); // footing
    }
    // a dark gravel bed round the basin (it catches the spill), in a stone kerb
    add("gravel", box(1.84, 0.03, 0.98), 0, 0.015, 0);
    for (const sz of [1, -1]) add("stone", box(2.0, 0.06, 0.08), 0, 0.03, sz * 0.53);
    for (const sx of [1, -1]) add("stone", box(0.08, 0.06, 0.98), sx * 0.96, 0.03, 0);
    // head beams (front/back along x, sides along z) and the front/back nuki that runs past the posts
    for (const sz of [1, -1]) {
      add("vermilion", box(2 * PX + 0.3, 0.15, 0.13), 0, 1.905, sz * PZ);
      add("vermilion", box(2 * PX + 0.5, 0.1, 0.09), 0, 1.62, sz * PZ);
    }
    for (const sx of [1, -1]) {
      add("vermilion", box(0.13, 0.15, 2 * PZ + 0.3), sx * PX, 1.905, 0);
      add("vermilion", box(0.1, 0.32, 0.1), sx * PX, 1.99, 0); // king post to the ridge
    }

    // roof solid: gable, ridge along x at z = 0
    const YR = 2.29, ZE = 1.15, YE = 1.92, SAG = 0.22, T1 = 0.07, T2 = 0.12, XR = 1.45;
    const top = (z) => {
      const t = Math.abs(z) / ZE;
      return YR - (YR - YE) * (t + SAG * t * (1 - t));
    };
    const lift = (x) => 0.12 * Math.pow(Math.min(1, Math.abs(x) / XR), 3);
    const roofZ = [];
    for (let i = 0; i <= 16; i++) roofZ.push(ZE - (2 * ZE * i) / 16);
    const XS = [0, 0.45, 0.65, 0.78, 0.87, 0.94, 1];
    XS.unshift(...XS.slice(1).map((u) => -u).reverse());
    for (let i = 0; i < XS.length; i++) XS[i] *= XR;
    const P = (x, z, d) => [x, top(z) - d + lift(x), z];
    const tris = [[], []];
    const quad = (q, out, grp) => {
      for (const [a, b, e] of [[q[0], q[1], q[2]], [q[0], q[2], q[3]]]) {
        const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [e[0] - a[0], e[1] - a[1], e[2] - a[2]];
        const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        const keep = n[0] * out[0] + n[1] * out[1] + n[2] * out[2] > 0;
        tris[grp].push(...a, ...(keep ? b : e), ...(keep ? e : b));
      }
    };
    const band = (pa, pb, out) => {
      quad([pa(0), pb(0), pb(T1), pa(T1)], out, 0);
      quad([pa(T1), pb(T1), pb(T2), pa(T2)], out, 1);
    };
    const N = roofZ.length, X0 = XS[0], X1 = XS[XS.length - 1];
    for (let s = 0; s < XS.length - 1; s++) {
      const [xa, xb] = [XS[s], XS[s + 1]];
      for (let i = 0; i < N - 1; i++) {
        const [za, zb] = [roofZ[i], roofZ[i + 1]];
        quad([P(xa, za, 0), P(xa, zb, 0), P(xb, zb, 0), P(xb, za, 0)], [0, 1, 0], 0);
        quad([P(xa, za, T2), P(xa, zb, T2), P(xb, zb, T2), P(xb, za, T2)], [0, -1, 0], 1);
      }
      band((d) => P(xa, ZE, d), (d) => P(xb, ZE, d), [0, 0, 1]);
      band((d) => P(xa, -ZE, d), (d) => P(xb, -ZE, d), [0, 0, -1]);
    }
    for (let i = 0; i < N - 1; i++) {
      const [za, zb] = [roofZ[i], roofZ[i + 1]];
      band((d) => P(X0, za, d), (d) => P(X0, zb, d), [-1, 0, 0]);
      band((d) => P(X1, za, d), (d) => P(X1, zb, d), [1, 0, 0]);
    }
    // tile rows (kawara): flat dark strips 6 mm over the slab, straight down both slopes, every 0.17 m
    const rows = [];
    for (let x = -XR + 0.12; x < XR - 0.1; x += 0.17) {
      for (let i = 0; i < N - 1; i++) {
        const [za, zb] = [roofZ[i], roofZ[i + 1]];
        const q = [P(x - 0.014, za, -0.006), P(x - 0.014, zb, -0.006), P(x + 0.014, zb, -0.006), P(x + 0.014, za, -0.006)];
        for (const [a, b, e] of [[q[0], q[1], q[2]], [q[0], q[2], q[3]]]) {
          const n = (b[2] - a[2]) * (e[0] - a[0]) - (b[0] - a[0]) * (e[2] - a[2]); // y of (b - a) x (e - a)
          rows.push(...a, ...(n > 0 ? b : e), ...(n > 0 ? e : b));
        }
      }
    }
    const rowGeo = new THREE.BufferGeometry();
    rowGeo.setAttribute("position", new THREE.Float32BufferAttribute(rows, 3));
    rowGeo.computeVertexNormals();
    const rowMesh = new THREE.Mesh(rowGeo, kit.cel(c.tileLine, c.tileLine, { threshold: 0.1 }));
    rowMesh.name = "tileRows";
    body.add(rowMesh);
    const rg = new THREE.BufferGeometry();
    rg.setAttribute("position", new THREE.Float32BufferAttribute(tris[0].concat(tris[1]), 3));
    rg.addGroup(0, tris[0].length / 3, 0);
    rg.addGroup(tris[0].length / 3, tris[1].length / 3, 1);
    rg.computeVertexNormals();
    const roofMesh = new THREE.Mesh(rg, [
      kit.cel(c.roof, c.roofShade, { threshold: 0.1 }),
      kit.cel(c.vermilion, c.vermilionShade, { threshold: 0.1 }),
    ]);
    roofMesh.name = "roof";
    body.add(kit.outline(roofMesh));

    // ridge cap riding the sweep, end tiles at the gables
    for (let s = 0; s < XS.length - 1; s++) {
      const xa = XS[s], xb = XS[s + 1], w = xb - xa + 0.004;
      const y = (YR + 0.06 + (lift(xa) + lift(xb)) / 2);
      const g = box(w, 0.12, 0.16);
      const a = Math.atan2(lift(xb) - lift(xa), xb - xa);
      add("roof", g, (xa + xb) / 2, y, 0, 0, 0, a);
    }
    for (const sx of [1, -1]) add("roof", box(0.08, 0.18, 0.22), sx * (XR - 0.02), YR + 0.1 + lift(XR), 0);
  }

  // ---------- meshes ----------
  const mats = {
    vermilion: [c.vermilion, c.vermilionShade, 0.1],
    roof: [c.roof, c.roofShade, 0.1],
    stone: [c.stone, c.stoneShade, 0.25],
    inner: [c.inner, c.innerShade, 0.1, false],
    gravel: [c.gravel, c.gravelShade, 0.1],
    water: [c.water, c.waterShade, 0.1, false],
    ripple: [c.ripple, c.ripple, 0.1, false],
    bamboo: [c.bamboo, c.bambooShade, 0.1],
    wood: [c.wood, c.woodShade, 0.2],
    node: [c.node, c.node, 0.1],
    stream: [c.stream, c.streamShade, -0.25],
  };
  for (const [key, list] of Object.entries(soups)) {
    const [base, shade, threshold, ink = true] = mats[key];
    const g = merged(list);
    const mesh = ink ? kit.toon(g, base, shade, { threshold }) : new THREE.Mesh(g, kit.cel(base, shade, { threshold }));
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
