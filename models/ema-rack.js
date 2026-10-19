// ema-rack.js - a shrine votive plaque rack (ema-kake), static. One set with models/shrine.js and models/torii.js.
// Contract: harness/lab/README.md. Meters, +Y up, the rack faces +Z, its left is +X, stands on y = 0, centred on x = 0,
// z = 0.
//
// Construction (boxes and pentagonal prisms, all triangle soups merged per material; flat-shaded so slabs read crisp):
//   FRAME    two square vermilion posts on two foot sills running along z, a head beam under the roof and three
//            hanging rails and a low tie beam between the posts.
//   ROOF     a small gable: two dark bark slabs meeting at a ridge along x, a ridge cap, and pale wood gable boards
//            (a triangle under each end) so the gable shape reads from the front three-quarter.
//   EMA      the identity cue. On every rail, `count` house-shaped (pentagonal) wooden plaques hang on the front face and
//            as many on the back, each on a red string drawn as two strands from the plaque's shoulders up over the
//            rail. Plaques sit in two depth and drop tiers (even / odd), crowded closer than their width so they
//            overlap, with a deterministic per-plaque roll, yaw, pitch, drop and x jitter (a sine hash, no
//            Math.random). Some carry a red painted picture (a disc on the upper face), the rest two dark lines of writing.
//   OMIKUJI  optional ({ omikuji: true }): beside the rack at +X, a thin dark frame (roof material) strung with four
//            dark wires, each crowded with small white folded paper knots (a centre wrap and two flared tails),
//            jittered by the same hash.
//            With it on, the whole set shifts along x so the pair stays centred on x = 0.
// Proportions (real size, base unit the plaque P = 0.15 x 0.10 m, 1 cm thick): rack 1.8 wide at the roof (posts at
//   x +-0.82, 12 P), 1.6 tall at the ridge cap (16 P); eaves at 1.44, roof depth 0.6; rails at 1.22, 0.92, 0.62
//   and a low tie beam at 0.22; plaques hang in two tiers, 4-6 cm (even) and 11-13 cm (odd, in front) under their
//   rail, so each rail's band fills most of the 0.3 m to the next. Omikuji frame 0.9 x 1.25, wires 0.44-1.1.
// Options: build(THREE, kit, colors, { height = 1.6, count = 18, omikuji = false }). height scales uniformly (as the
//   torii), count is plaques per rail per side, omikuji adds the fortune-tying rack.
// Colours (noon), base / shade:
//   vermilion (posts, sills, beams, rails)                accent #c4452d / iris #5c3d32, threshold 0.1 (as the torii)
//   roof (bark slabs, ridge cap, omikuji frame)            iris #5c3d32 / hair #241c16, threshold 0.1 (as the shrine)
//   ema (plaques, gable boards: pale hinoki)               skin #f0c2ae / iris #5c3d32, threshold 0.02 (faces stay lit)
//   red (strings, painted pictures), no ink                accent #c4452d / accent
//   writing and omikuji wires, no ink                      hair #241c16 / hair
//   paper (omikuji knots)                                  sclera #f6f3ee / sky #f2d7ae, threshold 0.1
// The plaques and knots are small, so their hull is 2 px, not 5: at hero size a 5 px hull per plaque fills the rack
// with ink.

export const meta = {
  name: "ema-rack",
  height: 1.6,
  script: "noon",
  colors: {
    vermilion: "#c4452d", vermilionShade: "#5c3d32",
    roof: "#5c3d32", roofShade: "#241c16",
    ema: "#f0c2ae", emaShade: "#5c3d32",
    red: "#c4452d",
    writing: "#241c16",
    paper: "#f6f3ee", paperShade: "#f2d7ae",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, count = 18, omikuji = false } = opts;
  const root = new THREE.Group();
  root.name = "ema-rack";
  const set = new THREE.Group(); // uniform size scale lives here, root stays the plain contract node
  set.name = "set";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  // one triangle wound away from `ref` (a point inside the solid)
  function tri(key, a, b, e, ref) {
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-9) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    S(key).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  // a convex prism: ring a (n points) and ring b (the same outline moved along the axis)
  function prism(key, A, B) {
    const n = A.length;
    const ref = [0, 1, 2].map((i) => (A.reduce((s, q) => s + q[i], 0) + B.reduce((s, q) => s + q[i], 0)) / (2 * n));
    for (let i = 1; i < n - 1; i++) (tri(key, A[0], A[i], A[i + 1], ref), tri(key, B[0], B[i], B[i + 1], ref));
    for (let i = 0; i < n; i++) quad(key, A[i], A[(i + 1) % n], B[(i + 1) % n], B[i], ref);
  }
  function box(key, cx, cy, cz, sx, sy, sz) {
    const [x0, x1, y0, y1, z0, z1] = [cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2];
    prism(key, [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]);
  }
  // a strand from a to b, w square (strings)
  function strand(key, a, b, w) {
    const d = sub(b, a);
    const nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
    const s = nrm(cross(d, [0, 0, 1])), u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + (s[k] * i + u[k] * j) * w / 2);
    prism(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1)], [P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // a local frame: rotation (yaw about y, then pitch about x, then roll about z) and a translation
  const M = new THREE.Matrix4(), E = new THREE.Euler(), V = new THREE.Vector3();
  const frame = (x, y, z, yaw, pitch, roll) => {
    E.set(pitch, yaw, roll, "ZXY");
    const m = new THREE.Matrix4().makeRotationFromEuler(E);
    m.setPosition(x, y, z);
    return (p) => V.set(p[0], p[1], p[2]).applyMatrix4(m).toArray();
  };
  // deterministic hash in [0, 1)
  const hash = (i, k) => { const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };
  const jit = (i, k, a) => (hash(i, k) * 2 - 1) * a;

  // ---------- the ema-kake ----------
  const XP = 0.82, PW = 0.08; // post centre, post size
  const YH = 1.4; // head beam centre
  box("frame", -XP, 0.75, 0, PW, 1.5, PW);
  box("frame", XP, 0.75, 0, PW, 1.5, PW);
  box("frame", -XP, 0.04, 0, 0.12, 0.08, 0.5); // foot sills
  box("frame", XP, 0.04, 0, 0.12, 0.08, 0.5);
  box("frame", 0, YH, 0, 2 * XP + 0.2, 0.08, 0.1); // head beam, past the posts
  const RAILS = [1.22, 0.92, 0.62], RH = 0.04, RD = 0.04;
  for (const y of RAILS) box("frame", 0, y, 0, 2 * XP, RH, RD);
  box("frame", 0, 0.22, 0, 2 * XP, 0.06, 0.05); // low tie beam

  // roof: ridge along x at y 1.57, eaves at 1.44, half depth 0.3; slabs 3 cm thick
  const RX = 0.9, RY = 1.565, EY = 1.44, EZ = 0.3, T = 0.035;
  for (const s of [1, -1]) {
    const top = [[-RX, RY, 0], [RX, RY, 0], [RX, EY, s * EZ], [-RX, EY, s * EZ]];
    const bot = top.map(([x, y, z]) => [x, y - T, z - s * 0.004]);
    prism("roof", top, bot);
  }
  box("roof", 0, RY + 0.012, 0, 2 * RX + 0.04, 0.045, 0.07); // ridge cap, top at 1.6
  for (const x of [-XP, XP]) {
    // gable board: the triangle under the slabs, between head beam and ridge
    const yb = YH + 0.04, ya = RY - T - 0.005, zh = (EZ * (ya - yb)) / (RY - EY) + 0.0;
    const A = [[x - 0.012, yb, -zh * 0.95], [x - 0.012, yb, zh * 0.95], [x - 0.012, ya, 0]];
    prism("ema", A, A.map(([px, py, pz]) => [px + 0.024, py, pz]));
  }

  // ema plaques: pentagon outline, peak at local y = 0, 15 x 10, 1 cm thick, faces local +z
  const PL = [[0, 0], [0.075, -0.03], [0.075, -0.1], [-0.075, -0.1], [-0.075, -0.03]];
  const L = 2 * XP - PW - 0.06; // hanging length of a rail
  let id = 0;
  function plaque(x, y, z, side, layer) {
    const i = id++;
    const yaw = (side > 0 ? 0 : Math.PI) + jit(i, 1, 0.22);
    const roll = jit(i, 2, 0.14);
    const pitch = -0.05 + jit(i, 3, 0.05); // the bottom swings out from the rail a little
    const f = frame(x + jit(i, 4, 0.012), y - 0.045 - jit(i, 5, 0.012) - layer * 0.075, z, yaw, pitch, roll);
    prism("ema", PL.map(([u, v]) => f([u, v, 0.005])), PL.map(([u, v]) => f([u, v, -0.005])));
    // string: two strands from the shoulders up over the rail
    const top = [x, y + RH / 2 + 0.004, 0];
    for (const u of [-0.03, 0.03]) strand("red", f([u, -0.022, 0.006]), [top[0] + u * 0.25, top[1], z * 0.3], 0.005);
    // face decoration on the visible face (local +z)
    if (hash(i, 6) < 0.4) {
      const n = 8, r = 0.022, cy = -0.052, ring = [];
      for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; ring.push([Math.cos(a) * r, cy + Math.sin(a) * r]); }
      prism("red", ring.map(([u, v]) => f([u, v, 0.0062])), ring.map(([u, v]) => f([u, v, 0.0052])));
    } else {
      for (const [v, w] of [[-0.05, 0.09], [-0.072, 0.06]]) {
        const ln = [[-w / 2, v - 0.004], [w / 2, v - 0.004], [w / 2, v + 0.004], [-w / 2, v + 0.004]];
        prism("writing", ln.map(([u, vv]) => f([u, vv, 0.0062])), ln.map(([u, vv]) => f([u, vv, 0.0052])));
      }
    }
  }
  const n = Math.max(1, Math.round(count));
  RAILS.forEach((y, r) => {
    for (const side of [1, -1]) {
      for (let k = 0; k < n; k++) {
        const layer = k % 2;
        const x = -L / 2 + 0.075 + ((L - 0.15) * (k + (r % 2) * 0.5 + (side < 0 ? 0.25 : 0))) / (n - 0.25);
        const z = side * (RD / 2 + 0.008 + layer * 0.014);
        plaque(x, y, z, side, layer);
      }
    }
  });

  // ---------- omikuji rack ----------
  let shift = 0;
  if (omikuji) {
    const OX = 1.72, OW = 0.45; // centre, half width
    box("roof", OX - OW, 0.625, 0, 0.045, 1.25, 0.045);
    box("roof", OX + OW, 0.625, 0, 0.045, 1.25, 0.045);
    box("roof", OX - OW, 0.03, 0, 0.08, 0.06, 0.36);
    box("roof", OX + OW, 0.03, 0, 0.08, 0.06, 0.36);
    box("roof", OX, 1.25, 0, 2 * OW + 0.12, 0.05, 0.06);
    const WIRES = [1.1, 0.88, 0.66, 0.44];
    WIRES.forEach((y, w) => {
      strand("writing", [OX - OW, y, 0], [OX + OW, y, 0], 0.006);
      const m = 26;
      for (let k = 0; k < m; k++) {
        const i = 1000 + w * 100 + k;
        const x = OX - OW + 0.04 + ((2 * OW - 0.08) * (k + 0.5 + jit(i, 1, 0.35))) / m;
        const f = frame(x, y, jit(i, 2, 0.006), jit(i, 3, 0.35), jit(i, 4, 0.2), jit(i, 5, 0.5));
        const wrap = [[-0.015, -0.013], [0.015, -0.013], [0.015, 0.013], [-0.015, 0.013]];
        prism("paper", wrap.map(([u, v]) => f([u, v, 0.01])), wrap.map(([u, v]) => f([u, v, -0.01])));
        // two tails, up and down, splayed
        for (const s of [1, -1]) {
          const a = s * (0.25 + jit(i, 6 + s, 0.2)), ln = 0.028 + hash(i, 8 + s) * 0.018;
          const tip = [Math.sin(a) * ln * s, s * Math.cos(a) * ln];
          const tl = [[-0.01, 0], [0.01, 0], [tip[0] + 0.014, tip[1]], [tip[0] - 0.014, tip[1]]];
          prism("paper", tl.map(([u, v]) => f([u, v, 0.003])), tl.map(([u, v]) => f([u, v, -0.003])));
        }
      }
    });
    shift = -(OX + OW + 0.06 - 0.92) / 2; // centre the pair: rack -0.92 .. omikuji +2.23
  }

  // ---------- meshes ----------
  const MAT = {
    frame: [c.vermilion, c.vermilionShade, 0.1, true, 5],
    roof: [c.roof, c.roofShade, 0.1, true, 5],
    ema: [c.ema, c.emaShade, 0.02, true, 2],
    red: [c.red, c.red, 0.1, false, 0],
    writing: [c.writing, c.writing, 0.1, false, 0],
    paper: [c.paper, c.paperShade, 0.1, true, 2],
  };
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, outline, px] = MAT[key];
    for (let i = 0; i < arr.length; i += 3) arr[i] += shift;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, { threshold, outline, px });
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
