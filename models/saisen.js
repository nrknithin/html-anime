// saisen.js - a shrine offering station: the offertory box (saisen-bako) under the bell rope (suzu-no-o) and its brass
// bell (suzu), hung from a short vermilion beam. One set with models/shrine.js and models/torii.js (same script).
// Contract: harness/lab/README.md. Meters, +Y up, the station faces +Z (the worshipper stands on +Z, drops coins and
// rings toward -Z), its left is +X, stands on y = 0, centred on x = 0, z = 0.
//
// Construction (triangle soups merged per material, as house-japanese; flat-shaded so boards read crisp; 9 meshes):
//   BOX      four walls (slabs whose top follows the slant: front 0.56, back 0.77, 19 deg toward the worshipper), a
//            proud plinth band and proud cap boards round the rim (the front one flush with the slant, so a low camera
//            sees over it), on four short block legs. The top is a grille of seven triangular-section bars along x,
//            apex up, over a dark well. Only the bars' front faces ever face a front camera, and at a low one the
//            gaps close up, so each front face is two material groups: the top 38 % light wood, the rest dark box:
//            light ridges over dark slots from any front angle. The bars have no hull (seven inked bars merge into
//            one dark band at hero size); the rim's hull draws round them.
//   KANAGU   brass corner fittings: a cap over every corner of the rim and the plinth (6 mm proud each way) and a
//            plate wrapping each front corner between them, so the box edges stay drawn where the hull cannot.
//   BEAM     a vermilion beam 1.6 m wide with a dark hook block; the swing chain hangs from the hook.
//   SUZU     one lathe (sphere, a raised equator ridge, neck and cap: no intersecting parts, so no specks) on a top
//            ring and a dark rod. The slit is a dark great-circle arc through the point 30 deg under the equator at
//            the front, running round toward +-X, a round hole at each end: the bell's mouth from any front angle.
//   ROPE     two strands, each a tube (10 sides) riding a helix (radius 0.03, lay 0.42 m) round the rope line, half a
//            turn apart: red and white, so the twist and its grooves draw themselves (each strand's hull inks where it
//            passes in front of the other). The rope line is a centripetal Catmull-Rom through the chain's joints, and
//            pose() rewrites the vertices along it (plain Mesh, no skinning). Strands taper to points inside the bell
//            and inside a white binding band; under the band a flared red tassel (a surface of revolution, closed to a
//            point, its lower part fluted with 10 shallow ribs). Normals are the exact tube normals (radial - r'
//            tangent), so hullNormal = normal and the ink closes under the tassel.
// Proportions (real size, base unit the box width W = 1.2 m): box 1.2 x 0.6 deep, 0.77 tall at the back, 0.56 at the
//   front; legs 0.08; bars 0.055 wide, 0.05 high, 0.071 pitch. Beam underside at 0.9 + rope (3.4), top 3.6; bell
//   D 0.44 (W / 2.7), centre 3.0; rope 0.144 thick (W / 8.3) from the bell to 0.9 (hand height, just over the box's
//   back rim), the last 0.41 m band + tassel. Rope line z = -0.3, 0.15 behind the box back (box z -0.15 .. 0.45).
// Options: build(THREE, kit, colors, { height, rope }). height scales everything uniformly (default meta.height, the
//   full-size station's beam top); rope is the hang from the beam's underside to the tassel tip in m (default 2.5):
//   the tassel stays at hand height and the beam rises or falls; rope: false (or 0) leaves the box alone, centred.
// Rig: station (scale) -> swing (the hook) -> bell (the top ring: a rattle) ; swing -> rope1 (bell bottom) -> rope2 ->
//   rope3 (thirds of the rope). Signs: on this hanging chain +rz swings the lower end toward +X (the model's left),
//   +rx swings it back (-Z). Angles in the tables are local (each joint adds to its parent). A film rings it with
//   pose("swing@t"), or drives the chain itself with set({ swing: [rx, rz], rope2: [rx, rz], ... }) (degrees; the rope
//   is re-swept on every call).
// Clip: swing 2 s, loop: a side-to-side ring (bell 5 deg, rope joints 6 / 8 / 10 deg), each rope joint lagging its
//   parent by 0.7 rad so a wave runs down the rope, a small fore-aft ellipse, and a bell rattle at twice the frequency.
//   pose("swing@0.5").
// Colours (noon, the torii and shrine set), base / shade:
//   box (walls, caps, plinth, legs, well, bar slots, hook)  iris #5c3d32 / hair #241c16, threshold 0.2 (dark lacquered wood)
//   bars                                       skin #f0c2ae / iris #5c3d32, threshold 0.2
//   brass (fittings 0.1; bell -0.25, so the mouth sits on the lit side and only a crescent under it is shade)
//                                              sky #f2d7ae / iris #5c3d32 (noon has no gold; sky is the warmest pale)
//   iron (bell slit, holes, rod)               iris #5c3d32 / hair #241c16, threshold 0.6 (hair on the lower bell)
//   beam                                       accent #c4452d / iris #5c3d32, threshold 0.1 (as the torii)
//   rope red strand, tassel                    accent #c4452d / iris #5c3d32, threshold 0.15
//   rope white strand, band                    sclera #f6f3ee / sky #f2d7ae, threshold 0.15

export const meta = {
  name: "saisen",
  height: 3.6,
  script: "noon",
  colors: {
    box: "#5c3d32", boxShade: "#241c16",
    bars: "#f0c2ae", barsShade: "#5c3d32",
    iron: "#5c3d32", ironShade: "#241c16",
    beam: "#c4452d", beamShade: "#5c3d32",
    brass: "#f2d7ae", brassShade: "#5c3d32",
    red: "#c4452d", redShade: "#5c3d32",
    white: "#f6f3ee", whiteShade: "#f2d7ae",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const { height = meta.height } = opts;
  const ROPE = opts.rope === false ? 0 : opts.rope ?? 2.5;
  const TAU = Math.PI * 2, D = Math.PI / 180;
  const root = new THREE.Group();
  root.name = "saisen";
  const station = new THREE.Group(); // uniform size scale lives here, root stays the plain contract node
  station.name = "station";
  station.scale.setScalar(height / meta.height);
  root.add(station);
  const joints = {};

  // ---------- triangle soups (positions + normals) per material ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  // one flat triangle wound away from `ref` (a point inside the solid)
  function tri(key, a, b, e, ref) {
    let n = cross(sub(b, a), sub(e, a));
    const l = Math.hypot(...n);
    if (l < 1e-9) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    const flip = dot(n, sub(m, ref)) < 0;
    n = n.map((v) => (flip ? -v : v) / l);
    const s = S(key);
    s.p.push(...a, ...(flip ? [...e, ...b] : [...b, ...e]));
    s.n.push(...n, ...n, ...n);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  // x0..x1 by z0..z1, bottom and top heights as functions of z (slanted tops)
  function slab(key, x0, x1, z0, z1, yb, yt) {
    const B = typeof yb === "function" ? yb : () => yb, T = typeof yt === "function" ? yt : () => yt;
    hex(key, [[x0, B(z0), z0], [x1, B(z0), z0], [x1, B(z1), z1], [x0, B(z1), z1],
      [x0, T(z0), z0], [x1, T(z0), z0], [x1, T(z1), z1], [x0, T(z1), z1]]);
  }
  // a THREE primitive, transformed, appended with its own (smooth) normals
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  function prim(key, g, [x, y, z] = [0, 0, 0], [rx, ry, rz] = [0, 0, 0]) {
    _m.compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
    g = g.index ? g.toNonIndexed() : g;
    g.applyMatrix4(_m);
    const s = S(key);
    s.p.push(...g.attributes.position.array);
    s.n.push(...g.attributes.normal.array);
  }
  function make(key, base, shade, threshold, parent, name, outline = true) {
    const s = soups[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    const m = kit.toon(g, base, shade, { threshold, outline });
    m.name = name ?? key;
    parent.add(m);
    delete soups[key];
    return m;
  }

  // ---------- the box ----------
  const hasRope = ROPE > 0;
  const ZO = hasRope ? 0.15 : 0; // the box sits forward of the rope line, or centred when it stands alone
  const W2 = 0.6, ZB0 = ZO - 0.3, ZB1 = ZO + 0.3, YL = 0.08, YF = 0.56, YB = 0.77, WT = 0.05;
  const yt = (z) => YF + ((YB - YF) * (ZB1 - z)) / (ZB1 - ZB0); // the slanted rim
  // legs
  for (const sx of [-1, 1]) for (const z of [ZB0 + 0.07, ZB1 - 0.07])
    slab("wood", sx * (W2 - 0.08) - 0.05, sx * (W2 - 0.08) + 0.05, z - 0.05, z + 0.05, 0, YL + 0.01);
  // bottom board and walls
  slab("wood", -W2, W2, ZB0, ZB1, YL, YL + 0.04);
  slab("wood", -W2, W2, ZB1 - WT, ZB1, YL, yt);
  slab("wood", -W2, W2, ZB0, ZB0 + WT, YL, yt);
  for (const sx of [-1, 1]) slab("wood", sx > 0 ? W2 - WT : -W2, sx > 0 ? W2 : -W2 + WT, ZB0, ZB1, YL, yt);
  // plinth band and rim caps, 15 mm proud
  const P = 0.015, CAPD = 0.03, CAPU = 0.02;
  slab("wood", -W2 - P, W2 + P, ZB0 - P, ZB1 + P, YL, YL + 0.07);
  slab("wood", -W2 - P, W2 + P, ZB1 - 0.07, ZB1 + P, (z) => yt(z) - CAPD, (z) => yt(z) + 0.002); // flush in front, so the grille shows from a low camera
  slab("wood", -W2 - P, W2 + P, ZB0 - P, ZB0 + 0.07, (z) => yt(z) - CAPD, (z) => yt(z) + CAPU);
  for (const sx of [-1, 1])
    slab("wood", sx > 0 ? W2 - 0.07 : -W2 - P, sx > 0 ? W2 + P : -W2 + 0.07, ZB0 - P, ZB1 + P, (z) => yt(z) - CAPD, (z) => yt(z) + CAPU);
  // the bar grille: triangular bars along x, apex up, on the slant
  const zi0 = ZB0 + 0.07, zi1 = ZB1 - 0.07, NB = 7, BW = 0.055, BH = 0.05, BD = -0.004; // apex 4 mm over the rim plane
  for (let i = 0; i < NB; i++) {
    const zc = zi0 + ((i + 0.5) * (zi1 - zi0)) / NB;
    const xa = -W2 + 0.06, xb = W2 - 0.06;
    const a = [zc - BW / 2, yt(zc - BW / 2) - BD - BH], b = [zc + BW / 2, yt(zc + BW / 2) - BD - BH], t = [zc, yt(zc) - BD];
    const ref = [0, (a[1] + b[1] + t[1]) / 3, zc];
    const P3 = (x, q) => [x, q[1], q[0]];
    tri("bars", P3(xa, a), P3(xa, b), P3(xa, t), ref);
    tri("bars", P3(xb, a), P3(xb, b), P3(xb, t), ref);
    quad("bars", P3(xa, a), P3(xb, a), P3(xb, b), P3(xa, b), ref);
    // the front face (toward the worshipper, the only one a front camera sees): all but its top 38 % is a dark material
    // group, so every bar reads as a light ridge over a dark slot even when the gaps close up at a low camera
    const m = [b[0] + 0.62 * (t[0] - b[0]), b[1] + 0.62 * (t[1] - b[1])];
    quad("wood", P3(xa, b), P3(xb, b), P3(xb, m), P3(xa, m), ref);
    quad("bars", P3(xa, m), P3(xb, m), P3(xb, t), P3(xa, t), ref);
    quad("bars", P3(xa, t), P3(xb, t), P3(xb, a), P3(xa, a), ref);
  }
  // dark well under the bars (a thin slab, so it is closed)
  slab("wood", -W2 + 0.04, W2 - 0.04, ZB0 + 0.04, ZB1 - 0.04, (z) => yt(z) - 0.11, (z) => yt(z) - 0.09);
  // iron corner caps over the rim and the plinth, and L-plates down the front corners
  const F = 0.006, CC = 0.1;
  for (const sx of [-1, 1]) for (const [zc, sz] of [[ZB1, 1], [ZB0, -1]]) {
    const xo = sx * (W2 + P + F), xi = sx * (W2 + P - CC), zo = zc + sz * (P + F), zin = zc - sz * (CC - P);
    const [x0, x1] = sx > 0 ? [xi, xo] : [xo, xi], [z0, z1] = sz > 0 ? [zin, zo] : [zo, zin];
    slab("fit", x0, x1, z0, z1, (z) => yt(z) - CAPD - F, (z) => yt(z) + CAPU + F);
    slab("fit", x0, x1, z0, z1, YL - F, YL + 0.07 + F);
  }
  for (const sx of [-1, 1]) {
    // front-corner plates between plinth and cap: one block wrapping the corner, proud of both faces
    const yb = YL + 0.07, ytop = yt(ZB1) - CAPD;
    const xo = sx * (W2 + F), xi = sx * (W2 - 0.07);
    slab("fit", Math.min(xo, xi), Math.max(xo, xi), ZB1 - 0.07, ZB1 + F, yb, ytop);
  }

  // ---------- beam, bell, rope ----------
  const ZR = -0.3, YT = 0.9; // rope line z, tassel tip height
  const YBM = YT + ROPE; // beam underside
  const RB = 0.22, ROD = 0.12, RING = 0.035; // bell radius, iron rod, top ring
  const BC = -(ROD + RING + RB); // bell centre below the hook
  if (hasRope) {
    slab("beam", -0.8, 0.8, ZR - 0.1, ZR + 0.1, YBM, YBM + 0.2);
    slab("wood", -0.04, 0.04, ZR - 0.04, ZR + 0.04, YBM - 0.03, YBM + 0.01);
  }
  make("wood", c.box, c.boxShade, 0.2, station, "box");
  make("bars", c.bars, c.barsShade, 0.2, station, "bars", false); // no hull: at a low camera seven inked bars merge into one dark band
  make("fit", c.brass, c.brassShade, 0.1, station, "fittings");
  if (hasRope) make("beam", c.beam, c.beamShade, 0.1, station, "beam");

  let rebuild = () => {};
  const joint = (name, parent, x, y, z) => {
    const j = new THREE.Group();
    j.name = name;
    j.position.set(x, y, z);
    j.userData.rest = j.position.clone();
    parent.add(j);
    joints[name] = j;
    return j;
  };
  if (hasRope) {
    const swing = joint("swing", station, 0, YBM - 0.03, ZR);
    const bellJ = joint("bell", swing, 0, -ROD, 0);
    // bell (in bell-joint space: origin at the top of the ring)
    const bc = BC + ROD;
    // one lathe, bottom to top: the sphere, a raised equator ridge, a neck and a cap (no intersecting parts, so no specks)
    const prof = [];
    for (let a = -90; a <= -6; a += 12) prof.push([RB * Math.cos(a * D), RB * Math.sin(a * D)]);
    prof.push([RB * 1.045, -0.014], [RB * 1.045, 0.014]);
    for (let a = 6; a <= 72; a += 11) prof.push([RB * Math.cos(a * D), RB * Math.sin(a * D)]);
    prof.push([0.06, RB + 0.012], [0.05, RB + 0.035], [0.001, RB + 0.04]);
    prof[0][0] = 0.001;
    prim("brass", new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 24), [0, bc, 0]);
    prim("brass", new THREE.TorusGeometry(0.03, 0.011, 6, 12), [0, -0.025, 0]);
    // the slit: a great-circle arc through the front-bottom point 45 deg under the equator, running round toward
    // +-X (the bell's mouth seen from the front), a round hole at each end
    const SA = 66 * D, TL = -60 * D;
    const slit = new THREE.TorusGeometry(RB * 0.985, 0.018, 5, 24, 2 * SA);
    prim("bellIron", slit, [0, bc, 0], [TL, 0, -Math.PI / 2 - SA]);
    for (const s of [-1, 1]) {
      const hy = -RB * Math.cos(SA) * 0.985;
      prim("bellIron", new THREE.SphereGeometry(0.034, 10, 8), [s * RB * Math.sin(SA) * 0.985, bc + hy * Math.cos(TL), hy * Math.sin(TL)]);
    }
    // rod from the hook to the ring (in swing space, so it stays on the hook)
    prim("rod", new THREE.CylinderGeometry(0.014, 0.014, ROD, 8), [0, -ROD / 2 + 0.005, 0]);
    make("brass", c.brass, c.brassShade, -0.25, bellJ, "suzu");
    make("bellIron", c.iron, c.ironShade, 0.6, bellJ, "slit");
    make("rod", c.iron, c.ironShade, 0.6, swing, "rod");

    // rope chain: rope1 at the bell's bottom, rope2 / rope3 at thirds down to the tassel tip
    const yTop = YBM - 0.03 + BC - RB + 0.03; // rope1, just inside the bell bottom (world)
    const L = yTop - YT; // rope1 .. tip
    const r1 = joint("rope1", swing, 0, yTop - (YBM - 0.03), 0);
    const r2 = joint("rope2", r1, 0, -L / 3, 0);
    const r3 = joint("rope3", r2, 0, -L / 3, 0);
    const R0 = 0.072, RS = 0.042, HR = R0 - RS, LAY = 0.42, IN = 0.12; // rope radius, strand radius, helix radius
    const TAS = 0.34, BAND = 0.07; // tassel and binding band at the bottom
    const sEnd = L + IN; // s: 0 at the top tucked into the bell .. sEnd at the tassel tip
    const sBand = sEnd - TAS - BAND; // the band starts here; the strands end tapered inside it
    // patches: tubes drawn as rows x cols grids. A strand rides a helix round the rope line; a rev patch is a surface of
    // revolution [s, r] on the rope line itself.
    const patches = [];
    const sRows = [];
    for (let s = 0; s < sBand + 0.03; s += 0.02) sRows.push(s);
    sRows.push(sBand + 0.03);
    for (const m of [0, 1]) patches.push({ mesh: m, strand: true, off: m * Math.PI, rows: sRows, cols: 10 });
    const rev = (mesh, prof, fr = 0) => patches.push({ mesh, rows: prof.map((q) => q[0]), r: prof.map((q) => q[1] * R0), cols: 20, fr });
    rev(1, [[sBand - 0.005, 0], [sBand - 0.004, 1.08], [sBand + BAND, 1.08], [sBand + BAND + 0.001, 0]]);
    rev(0, [[-0.02, 0], [-0.01, 0.9], [0.05, 1.02], [0.11, 1.15], [0.17, 1.26], [0.23, 1.33], [0.28, 1.33], [0.315, 1.15],
      [0.333, 0.7], [TAS, 0]].map(([d, r]) => [sBand + BAND + d, r]), sBand + BAND + 0.1);
    // strand radius: tapered to a point inside the bell and inside the band
    const rStrand = (s) => RS * Math.min(1, s / 0.04, Math.max(0, (sBand + 0.03 - s) / 0.04));
    const meshes = [0, 1].map((m) => {
      let n = 0;
      const idx = [];
      for (const pt of patches.filter((q) => q.mesh === m)) {
        pt.base = n;
        const C = pt.cols + 1;
        for (let k = 0; k < pt.rows.length - 1; k++)
          for (let i = 0; i < pt.cols; i++) idx.push([n + k * C + i, n + k * C + i + 1, n + (k + 1) * C + i + 1, n + (k + 1) * C + i]);
        n += pt.rows.length * C;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      g.setAttribute("hullNormal", g.attributes.normal); // the exact tube normal is smooth already
      const mesh = kit.toon(g, m ? c.white : c.red, m ? c.whiteShade : c.redShade, { threshold: 0.15 });
      mesh.name = m ? "ropeWhite" : "ropeRed";
      for (const o of [mesh, ...mesh.children]) o.frustumCulled = false;
      station.add(mesh);
      return { g, idx, wound: false };
    });
    const V = () => new THREE.Vector3();
    const Zv = new THREE.Vector3(0, 0, 1), inv = new THREE.Matrix4();
    let curve;
    // the rope line's frame at s: O on the line, T down the rope, A and B across it
    function frame(s) {
      const u = Math.min(1, Math.max(0, s / sEnd));
      const O = curve.getPointAt(u), T = curve.getTangentAt(u);
      const A = V().crossVectors(T, Zv);
      if (A.lengthSq() < 1e-8) A.set(1, 0, 0);
      A.normalize();
      return { O, T, A, B: V().crossVectors(T, A).normalize() };
    }
    const p = V(), nr = V();
    rebuild = () => {
      root.updateMatrixWorld(true);
      inv.copy(station.matrixWorld).invert();
      const loc = (j, y) => j.localToWorld(V().set(0, y, 0)).applyMatrix4(inv);
      curve = new THREE.CatmullRomCurve3([loc(r1, IN), loc(r1, 0), loc(r2, 0), loc(r3, 0), loc(r3, -L / 3)], false, "centripetal");
      for (const pt of patches) {
        // per row: centre C, axis T, cross frame N / Bn, radius r
        const R = pt.rows.map((s, k) => {
          const f = frame(s);
          if (!pt.strand) return { C: f.O, T: f.T, N: f.A, Bn: f.B, r: pt.r[k], s, fr: pt.fr && s > pt.fr ? Math.min(1, (s - pt.fr) / 0.08) : 0 };
          const th = (2 * Math.PI * s) / LAY + pt.off;
          const rad = V().addScaledVector(f.A, Math.cos(th)).addScaledVector(f.B, Math.sin(th));
          return { C: f.O.clone().addScaledVector(rad, HR), rad, r: rStrand(s), s };
        });
        if (pt.strand)
          R.forEach((q, k) => {
            const a = R[Math.max(0, k - 1)], b = R[Math.min(R.length - 1, k + 1)];
            q.T = V().subVectors(b.C, a.C).normalize();
            q.N = q.rad.addScaledVector(q.T, -q.rad.dot(q.T)).normalize();
            q.Bn = V().crossVectors(q.T, q.N);
          });
        const g = meshes[pt.mesh].g, pos = g.attributes.position, nor = g.attributes.normal;
        R.forEach((q, k) => {
          const a = R[Math.max(0, k - 1)], b = R[Math.min(R.length - 1, k + 1)];
          const dr = (b.r - a.r) / Math.max(1e-5, b.s - a.s); // r' along the axis: the normal tilts by it
          for (let i = 0; i <= pt.cols; i++) {
            const ps = (2 * Math.PI * i) / pt.cols, cs = Math.cos(ps), sn = Math.sin(ps);
            nr.set(0, 0, 0).addScaledVector(q.N, cs).addScaledVector(q.Bn, sn);
            p.copy(q.C).addScaledVector(nr, q.r * (1 + (q.fr ? 0.07 * q.fr * Math.cos(10 * ps) : 0))); // tassel fringe
            nr.addScaledVector(q.T, -dr).normalize();
            const v = pt.base + k * (pt.cols + 1) + i;
            pos.setXYZ(v, p.x, p.y, p.z);
            nor.setXYZ(v, nr.x, nr.y, nr.z);
          }
        });
      }
      for (const M of meshes) {
        const pos = M.g.attributes.position, nor = M.g.attributes.normal;
        if (!M.wound) {
          // winding from the geometry: a mid-tube quad's face normal against its outward vertex normal
          const [a, b, e] = M.idx[Math.floor(M.idx.length / 3)];
          const P0 = V().fromBufferAttribute(pos, a), n = V().subVectors(V().fromBufferAttribute(pos, b), P0)
            .cross(V().subVectors(V().fromBufferAttribute(pos, e), P0));
          const out = n.dot(V().fromBufferAttribute(nor, a)) > 0;
          M.g.setIndex(M.idx.flatMap(([qa, qb, qe, qd]) => (out ? [qa, qb, qe, qa, qe, qd] : [qa, qe, qb, qa, qd, qe])));
          M.wound = true;
        }
        pos.needsUpdate = true;
        nor.needsUpdate = true;
        M.g.computeBoundingBox();
        M.g.computeBoundingSphere();
      }
    };
  }

  // ---------- poses and clip ----------
  // a frame: joint -> [rx, rz] in degrees, local; missing joints rest at 0
  const POSES = { rest: {} };
  const CLIPS = hasRope ? { swing: 2 } : {};
  function clip(name, t) {
    const T = CLIPS[name], ph = ((((t % T) + T) % T) / T) * TAU;
    const sn = (lag, n = 1) => Math.sin(n * ph - lag);
    return {
      swing: [1.2 * sn(-1.2), 5 * sn(0)],
      bell: [3 * sn(0.3, 2), 4 * sn(0.2, 2)],
      rope1: [2 * sn(-0.4), 6 * sn(0.7)],
      rope2: [2.5 * sn(0.3), 8 * sn(1.4)],
      rope3: [3 * sn(1.0), 10 * sn(2.1)],
    };
  }
  function apply(Fr) {
    for (const [k, j] of Object.entries(joints)) {
      const a = Fr[k] ?? [0, 0];
      j.position.copy(j.userData.rest);
      j.rotation.set(a[0] * D, 0, a[1] * D);
    }
    rebuild();
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`saisen: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ") || "none"})`);
      return apply(clip(m[1], +m[2]));
    }
    if (!POSES[name]) throw new Error(`saisen: unknown pose "${name}" (rest, or <clip>@<seconds>)`);
    apply(POSES[name]);
  }
  pose("rest");
  return { root, joints, pose, set: apply, clips: { ...CLIPS } };
}
