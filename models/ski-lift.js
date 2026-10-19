// ski-lift.js - a snowy ski-resort chairlift at dusk, as a diorama tile (16 x 10 m) cut from a snow slope: the bottom
// station (a big horizontal bullwheel under a snow-laden gable roof on four steel columns, over a loading deck), two
// support towers (tubular column, crossarm, a four-sheave train under each side of the line), the haul cable as one
// closed loop, six two-seat chairs with safety bars, a return wheel on a mast at the top edge, snow-laden firs, a small
// dark log hut with a thick snow roof and warm windows, a rack of skis and poles, and fence posts with orange netting.
// Contract: harness/lab/README.md. Meters, +Y up, stands on y = 0, centred on x = 0, z = 0. The tile is 10.8 (X) by
// 16.8 (Z): the station is at +Z and faces +Z, the line climbs toward -Z (the slope rises that way), the fence runs along
// the +X side (the lit, camera side: the hero sees the line side-on, the station near-left), the hut and the ski rack
// sit behind the line on -X. Authored with the line along +X (station at +X, hut at +Z), then the tile group is turned
// -90 deg about Y; every number below is in that authoring frame.
//
// Construction (boxes, oriented slabs, cylinders, cones, tubes and a height-field as triangle soups merged per
// material, every triangle wound away from a point inside its solid, never by hand; 10 meshes):
//   TILE     a slab whose top is the snow height-field G(x, z) (a 0.11 slope plus soft drifts), cut sides in dark earth
//            under a 0.3 m snow band.
//   LIFT     the cable path is a stadium in plan (two lines 2.2 m apart joined by half-circles round the wheels) and a
//            sagging piecewise profile cableY(x) in elevation; the cable tube, the tower sheaves and every chair use the
//            same two functions, so grips ride the cable exactly. Towers carry rocker beams outside the line and sheaves
//            under it.
//   MOVING   the two wheels and the six chairs (body and safety bar) live in four meshes, one per material: wheel (both
//            wheels), chair (frames, bars), red (seats, rim stripes) and cable (grips); their static parts stay put. Each vertex stores its owner (-1 static, 0..1 wheels, 2+2k chair k, 3+2k its bar);
//            pose() rewrites positions, normals and hull normals from one matrix per owner, as the ufo-catcher claw.
//   PROPS    firs are four stacked flat-shaded cones with a scalloped snow cone on each tier; the hut is a box with a
//            gable roof slab under a thick snow slab; skis are thin slabs leaning on a rail; the netting a thin band.
// Proportions (real size): tile 16 x 10, snow 0.5 m deep at the station end rising to 2.26 at the top end. Cable gauge 2.2 (wheel radius
//   1.1); cable at 3.5 m in the station (seat 0.45 over the deck at 1.0), 5.45 / 6.1 on towers 1 / 2, 6.0 on the return
//   wheel. Hanger: seat top 2.0 below the grip; chair 1.2 wide, two 0.52 seats. Station roof eave 5.0, ridge 5.75.
//   Hut 3.2 x 1.8, walls 2.3. Firs 2.2-5.0 tall; the return terminal's snow cap is the top (7.12).
// Options: build(THREE, kit, colors, { height }) scales everything so the top is `height` (default meta.height).
// Clips: run (6 s, seamless): chairs advance two spacings round the loop (1.8 m/s); the bars drop after the station
//   and lift before the top wheel; both wheels turn with the cable (snapped to whole spoke steps so the loop closes).
// Colours (indigo): snow sclera #f6f3ee / moon #d5e2ff; dark wood, earth, firs, fence posts, booth sky #1b2d6b / hair
//   #16141c (the firs' shade as on the kamakura; hair sits next to ink, so it is kept to shaded flanks); steel moon /
//   sky; cable, sheaves, poles, grips, log seams, mullions hair flat (lines, px 1.5); station and hut roof slabs, seats,
//   red skis, wheel stripes accent #e23b4a / sky; bullwheels, netting, ski rack, door, window frames iris #e7a04a /
//   accent; netting threads accent flat (no hull); chair metal and pale skis line #e7eefc / sky; windows and the
//   station lamp practical #f0c36a flat (glow, no hull).

export const meta = {
  name: "ski-lift",
  height: 7.12,
  script: "indigo",
  colors: {
    snow: "#f6f3ee", snowShade: "#d5e2ff",
    dark: "#1b2d6b", darkShade: "#16141c",
    steel: "#d5e2ff", steelShade: "#1b2d6b",
    cable: "#16141c",
    red: "#e23b4a", redShade: "#1b2d6b",
    wheel: "#e7a04a", wheelShade: "#e23b4a",
    chair: "#e7eefc", chairShade: "#1b2d6b",
    glow: "#f0c36a",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const NATURAL = meta.height;
  const { height = NATURAL } = opts;
  const TAU = Math.PI * 2;
  const root = new THREE.Group();
  root.name = "ski-lift";
  const set = new THREE.Group();
  set.name = "tile";
  set.scale.setScalar(height / NATURAL);
  set.rotation.y = -Math.PI / 2;                 // authored with the lift along +X; turned so it runs along Z
  root.add(set);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [], o: [] });
  let owner = -1;
  function tri(key, a, b, e, ref, na, nb, ne) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const flip = dot(n, sub(mul(add(add(a, b), e), 1 / 3), ref)) < 0;
    n = nrm(flip ? mul(n, -1) : n);
    const s = S(key);
    const vs = flip ? [[a, na], [e, ne], [b, nb]] : [[a, na], [b, nb], [e, ne]];
    for (const [q, nq] of vs) s.p.push(...q), s.n.push(...(nq ?? n)), s.o.push(owner);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  // oriented box: centre C, half-axis vectors U, V, W
  function obox(key, C, U, V, W) {
    const P = (i, j, k) => add(add(add(C, mul(U, i)), mul(V, j)), mul(W, k));
    const p = [P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1), P(-1, 1, -1), P(1, 1, -1), P(1, 1, 1), P(-1, 1, 1)];
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], C);
  }
  const box = (key, x0, x1, y0, y1, z0, z1) =>
    obox(key, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [(x1 - x0) / 2, 0, 0], [0, (y1 - y0) / 2, 0], [0, 0, (z1 - z0) / 2]);
  const frame = (ax) => {
    const t = nrm(cross(ax, Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
    return [t, cross(ax, t)];
  };
  // cylinder from A to B, radii r (at A) and r1 (at B), flat caps, smooth sides
  function cyl(key, A, B, r, seg = 10, r1 = r) {
    const ax = nrm(sub(B, A)), [t, s] = frame(ax), ref = mul(add(A, B), 0.5);
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * TAU, a1 = ((i + 1) / seg) * TAU;
      const d0 = add(mul(t, Math.cos(a0)), mul(s, Math.sin(a0))), d1 = add(mul(t, Math.cos(a1)), mul(s, Math.sin(a1)));
      const b0 = add(A, mul(d0, r)), b1 = add(A, mul(d1, r)), t0 = add(B, mul(d0, r1)), t1 = add(B, mul(d1, r1));
      tri(key, b0, b1, t1, ref, d0, d1, d1);
      tri(key, b0, t1, t0, ref, d0, d1, d0);
      tri(key, B, t0, t1, ref);
      tri(key, A, b0, b1, ref);
    }
  }
  // tube through points, radius r, cone-capped ends (or a closed loop)
  function tube(key, pts, r, seg = 6, loop = false) {
    const n = pts.length;
    const rings = pts.map((P, i) => {
      const T = loop ? nrm(sub(pts[(i + 1) % n], pts[(i - 1 + n) % n])) : nrm(sub(pts[Math.min(i + 1, n - 1)], pts[Math.max(i - 1, 0)]));
      const [t, s] = frame(T);
      return Array.from({ length: seg }, (_, j) => {
        const a = (j / seg) * TAU, d = add(mul(t, Math.cos(a)), mul(s, Math.sin(a)));
        return [add(P, mul(d, r)), d];
      });
    });
    const m = loop ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const i2 = (i + 1) % n, ref = mul(add(pts[i], pts[i2]), 0.5);
      for (let j = 0; j < seg; j++) {
        const j2 = (j + 1) % seg;
        // match ring phase: pick the nearest vertex on the next ring for j
        const [a, b, e, d] = [rings[i][j], rings[i][j2], rings[i2][j2], rings[i2][j]];
        tri(key, a[0], b[0], e[0], ref, a[1], b[1], e[1]);
        tri(key, a[0], e[0], d[0], ref, a[1], e[1], d[1]);
      }
    }
    if (loop) return;
    for (const [k, dir] of [[0, -1], [n - 1, 1]]) {
      const P = pts[k], T = nrm(sub(pts[Math.min(k + 1, n - 1)], pts[Math.max(k - 1, 0)])), tip = add(P, mul(T, dir * r * 0.8));
      for (let j = 0; j < seg; j++) tri(key, rings[k][j][0], rings[k][(j + 1) % seg][0], tip, sub(P, mul(T, dir * r)));
    }
  }
  // cone on the y axis (flat-shaded): base ring pts (array of [x,y,z]) to apex A
  function coneRing(key, ring, A, Bc) {
    const ref = add(mul(Bc, 0.75), mul(A, 0.25));
    for (let i = 0; i < ring.length; i++) {
      const q0 = ring[i], q1 = ring[(i + 1) % ring.length];
      tri(key, q0, q1, A, ref);
      tri(key, q0, q1, Bc, ref);
    }
  }
  function prismTri(key, pts, d) { // a triangle (in a vertical plane) extruded by vector d
    const ref = add(mul(add(add(pts[0], pts[1]), pts[2]), 1 / 3), mul(d, 0.5));
    const q = pts.map((p) => add(p, d));
    tri(key, pts[0], pts[1], pts[2], ref), tri(key, q[0], q[1], q[2], ref);
    for (let i = 0; i < 3; i++) quad(key, pts[i], pts[(i + 1) % 3], q[(i + 1) % 3], q[i], ref);
  }
  const hash = (i) => {
    let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  // ---------- the tile: snow height-field ----------
  const X0 = -8, X1 = 8, Z0 = -5, Z1 = 5;
  const drift = (x, z) => 0.16 * Math.exp(-((x + 5.6) ** 2 + (z - 2.6) ** 2) / 3) + 0.12 * Math.exp(-((x - 1.5) ** 2 + (z + 3.6) ** 2) / 2.5)
    + 0.1 * Math.exp(-((x + 2.2) ** 2 + (z - 3.8) ** 2) / 1.6) + 0.05 * Math.sin(x * 0.9 + z * 0.6);
  const G = (x, z) => 0.5 + 0.11 * (8 - x) + drift(x, z);
  const NX = 32, NZ = 20;
  const gp = (i, j) => { const x = X0 + ((X1 - X0) * i) / NX, z = Z0 + ((Z1 - Z0) * j) / NZ; return [x, G(x, z), z]; };
  const gn = (x, z) => nrm([-(G(x + 0.05, z) - G(x - 0.05, z)) / 0.1, 1, -(G(x, z + 0.05) - G(x, z - 0.05)) / 0.1]);
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    const a = gp(i, j), b = gp(i + 1, j), e = gp(i + 1, j + 1), d = gp(i, j + 1);
    const ref = sub(mul(add(a, e), 0.5), [0, 1, 0]);
    tri("snow", a, b, e, ref, gn(a[0], a[2]), gn(b[0], b[2]), gn(e[0], e[2]));
    tri("snow", a, e, d, ref, gn(a[0], a[2]), gn(e[0], e[2]), gn(d[0], d[2]));
  }
  // cut sides: a snow band over dark earth, one strip per edge cell
  const BAND = 0.3;
  const edges = [
    [NX, (k) => gp(k, 0), [0, 0, -1]], [NX, (k) => gp(k, NZ), [0, 0, 1]],
    [NZ, (k) => gp(0, k), [-1, 0, 0]], [NZ, (k) => gp(NX, k), [1, 0, 0]],
  ];
  for (const [cnt, at, out] of edges) for (let k = 0; k < cnt; k++) {
    const a = at(k), b = at(k + 1), ref = sub(mul(add(a, b), 0.5), out);
    const a1 = [a[0], a[1] - BAND, a[2]], b1 = [b[0], b[1] - BAND, b[2]];
    quad("snow", a, b, b1, a1, ref);
    quad("dark", a1, b1, [b[0], 0, b[2]], [a[0], 0, a[2]], ref);
  }
  quad("dark", [X0, 0, Z0], [X1, 0, Z0], [X1, 0, Z1], [X0, 0, Z1], [0, 1, 0]);

  // ---------- lift line ----------
  const ZC = -0.6, GA = 1.1;                       // line centre z, half gauge (= wheel radius)
  const XB = 5.9, XR = -6.3, XT = [1.0, -4.0];     // station wheel, return wheel, towers
  const KX = [XR, XT[1], XT[0], XB], KY = [6.0, 6.1, 5.45, 3.5], SAG = [0.06, 0.16, 0.14];
  function cableY(x) {
    if (x <= KX[0]) return KY[0];
    if (x >= KX[3]) return KY[3];
    let i = 0;
    while (x > KX[i + 1]) i++;
    const u = (x - KX[i]) / (KX[i + 1] - KX[i]);
    return KY[i] + (KY[i + 1] - KY[i]) * u - 4 * SAG[i] * u * (1 - u);
  }
  const LS = XB - XR, LOOP = 2 * LS + 2 * Math.PI * GA;
  // loop param s: 0 at the station's front tangent, front line (uphill, -X) first, then round the return wheel,
  // back line (+X), round the station wheel. Returns position and travel direction (x, z).
  function along(s) {
    s = ((s % LOOP) + LOOP) % LOOP;
    const HC = Math.PI * GA;
    if (s < LS) return { x: XB - s, z: ZC + GA, dx: -1, dz: 0 };
    s -= LS;
    if (s < HC) { const a = Math.PI / 2 + s / GA; return { x: XR + GA * Math.cos(a), z: ZC + GA * Math.sin(a), dx: -Math.sin(a), dz: Math.cos(a) }; }
    s -= HC;
    if (s < LS) return { x: XR + s, z: ZC - GA, dx: 1, dz: 0 };
    s -= LS;
    const a = -Math.PI / 2 + s / GA;
    return { x: XB + GA * Math.cos(a), z: ZC + GA * Math.sin(a), dx: -Math.sin(a), dz: Math.cos(a) };
  }
  // cable: one closed tube along the loop, points at every kink and along each arc
  const CR = 0.035, cpts = [];
  const lineXs = (from, to) => { const xs = []; const n = 16; for (let i = 0; i < n; i++) xs.push(from + ((to - from) * i) / n); return xs; };
  for (const x of lineXs(XB, XR)) cpts.push([x, cableY(x) + CR, ZC + GA]);
  for (let i = 0; i < 12; i++) { const a = Math.PI / 2 + (i / 12) * Math.PI; cpts.push([XR + GA * Math.cos(a), KY[0] + CR, ZC + GA * Math.sin(a)]); }
  for (const x of lineXs(XR, XB)) cpts.push([x, cableY(x) + CR, ZC - GA]);
  for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + (i / 12) * Math.PI; cpts.push([XB + GA * Math.cos(a), KY[3] + CR, ZC + GA * Math.sin(a)]); }
  tube("cable", cpts, CR, 5, true);

  // ---------- towers ----------
  for (const xt of XT) {
    const yc = cableY(xt), yg = G(xt, ZC);
    const arm = yc - 0.75;
    box("steel", xt - 0.45, xt + 0.45, yg - 0.3, yg + 0.25, ZC - 0.45, ZC + 0.45);     // footing
    cyl("steel", [xt, yg, ZC], [xt, arm, ZC], 0.24, 12, 0.17);                          // column
    box("steel", xt - 0.13, xt + 0.13, arm - 0.12, arm + 0.12, ZC - GA - 0.45, ZC + GA + 0.45); // crossarm
    cyl("steel", [xt, arm, ZC], [xt, arm + 0.25, ZC], 0.2, 10, 0.12);                   // head cap
    for (const sz of [-1, 1]) {
      const zo = ZC + sz * (GA + 0.32), zs = ZC + sz * GA;
      box("steel", xt - 0.06, xt + 0.06, arm, yc - 0.28, zo - 0.06, zo + 0.06);        // bracket up to the rocker
      box("steel", xt - 0.72, xt + 0.72, yc - 0.34, yc - 0.2, zo - 0.05, zo + 0.05);   // rocker beam
      for (const dx of [-0.54, -0.18, 0.18, 0.54]) {
        const x = xt + dx, y = cableY(x) - 0.13;
        cyl("cable", [x, y, zs - 0.05], [x, y, zs + 0.05], 0.13, 10);                   // sheave
        cyl("steel", [x, y, zs + sz * 0.05], [x, y, zo], 0.03, 5);                      // axle
      }
    }
    // ladder rungs on the -X face of the column
    for (let y = yg + 0.6; y < arm - 0.3; y += 0.45) box("cable", xt - 0.3, xt - 0.24, y, y + 0.04, ZC - 0.14, ZC + 0.14);
    box("cable", xt - 0.3, xt - 0.24, yg + 0.3, arm, ZC - 0.17, ZC - 0.13);
    box("cable", xt - 0.3, xt - 0.24, yg + 0.3, arm, ZC + 0.13, ZC + 0.17);
  }

  // ---------- bottom station ----------
  const DECK = 1.0, EAVE = 5.0, RIDGE = 5.75;
  const SX0 = 4.25, SX1 = 7.85, SZ0 = ZC - 2.0, SZ1 = ZC + 2.0;
  box("steel", SX0, SX1, G(SX1, ZC) - 0.5, DECK, SZ0, SZ1);                              // loading deck
  box("snow", SX0 + 0.05, SX1 - 0.05, DECK, DECK + 0.06, SZ0 + 0.05, SZ1 - 0.05);       // packed snow on the deck
  box("red", SX0 - 0.02, SX0 + 0.12, DECK + 0.06, DECK + 0.08, ZC + GA - 0.8, ZC + GA + 0.8); // loading line
  for (const x of [SX0 + 0.2, SX1 - 0.2]) for (const z of [SZ0 + 0.2, SZ1 - 0.2])
    box("steel", x - 0.12, x + 0.12, DECK, EAVE, z - 0.12, z + 0.12);                    // columns
  for (const z of [SZ0 + 0.2, SZ1 - 0.2]) box("steel", SX0, SX1, EAVE - 0.35, EAVE, z - 0.14, z + 0.14); // eave beams
  // gable roof, ridge along X: red slab per plane, a thick snow slab on top
  const RX0 = SX0 - 0.35, RX1 = SX1 + 0.35, OV = 0.45;
  for (const sz of [-1, 1]) {
    const ze = ZC + sz * (2.0 + OV), ye = EAVE - OV * ((RIDGE - EAVE) / 2.0);
    const mid = [(RX0 + RX1) / 2, (ye + RIDGE) / 2, (ze + ZC) / 2];
    const along = nrm([0, RIDGE - ye, ZC - ze]), up = nrm(cross(along, [1, 0, 0]));
    const upv = up[1] > 0 ? up : mul(up, -1);
    const half = Math.hypot(RIDGE - ye, ZC - ze) / 2;
    obox("red", mid, [(RX1 - RX0) / 2, 0, 0], mul(along, half), mul(upv, 0.07));
    obox("snow", add(add(mid, mul(upv, 0.22)), mul(along, -0.03)), [(RX1 - RX0) / 2 - 0.05, 0, 0], mul(along, half + 0.02), mul(upv, 0.16));
  }
  box("snow", RX0 + 0.05, RX1 - 0.05, RIDGE + 0.1, RIDGE + 0.32, ZC - 0.3, ZC + 0.3);   // snow ridge cap
  for (const x of [SX0 + 0.05, SX1 - 0.05])                                             // gable infill
    prismTri("steel", [[x, EAVE, SZ0 + 0.1], [x, EAVE, SZ1 - 0.1], [x, RIDGE - 0.05, ZC]], [x < 6 ? 0.08 : -0.08, 0, 0]);
  // drive housing under the ridge, the shaft down to the bullwheel, a lamp
  box("steel", XB - 0.75, XB + 0.75, EAVE - 0.9, EAVE, ZC - 0.6, ZC + 0.6);
  box("red", XB - 0.77, XB + 0.77, EAVE - 0.95, EAVE - 0.85, ZC - 0.62, ZC + 0.62);
  cyl("cable", [XB, KY[3] - 0.25, ZC], [XB, EAVE - 0.9, ZC], 0.12, 10);
  box("glow", XB - 0.3, XB + 0.3, EAVE - 0.7, EAVE - 0.4, ZC + 0.61, ZC + 0.63);
  // operator booth on the deck behind the wheel (+Z side, away from the lift's camera side), lit windows to the line
  const BX0 = SX1 - 1.3, BX1 = SX1 - 0.2, BZ0 = SZ1 - 1.05, BZ1 = SZ1 - 0.15;
  box("dark", BX0, BX1, DECK, DECK + 2.2, BZ0, BZ1);
  box("glow", BX0 + 0.2, BX1 - 0.2, DECK + 1.2, DECK + 1.8, BZ0 - 0.02, BZ0);
  box("glow", BX1, BX1 + 0.02, DECK + 1.2, DECK + 1.8, BZ0 + 0.2, BZ1 - 0.2);
  box("snow", BX0 - 0.08, BX1 + 0.08, DECK + 2.2, DECK + 2.42, BZ0 - 0.08, BZ1 + 0.08);

  // ---------- return terminal at the top edge ----------
  const yr = KY[0], ygr = G(XR, ZC);
  cyl("steel", [XR, ygr - 0.2, ZC], [XR, yr + 0.55, ZC], 0.3, 12, 0.24);
  box("steel", XR - 0.5, XR + 0.5, ygr - 0.3, ygr + 0.2, ZC - 0.5, ZC + 0.5);
  box("steel", XR - 0.55, XR + 0.55, yr + 0.45, yr + 0.85, ZC - 0.55, ZC + 0.55);
  box("red", XR - 0.62, XR + 0.62, yr + 0.85, yr + 0.95, ZC - 0.62, ZC + 0.62);
  box("snow", XR - 0.6, XR + 0.6, yr + 0.95, yr + 1.12, ZC - 0.6, ZC + 0.6);

  // ---------- wheels (owners 0 station, 1 return) ----------
  const WHEELS = [[XB, KY[3], ZC], [XR, KY[0], ZC]];
  const SPOKES = 6;
  WHEELS.forEach((_, w) => {
    owner = w;
    const R0 = 0.93, R1 = GA - 0.02, H = 0.12, seg = 36;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * TAU, a1 = ((i + 1) / seg) * TAU;
      const P = (r, a, y) => [r * Math.cos(a), y, r * Math.sin(a)];
      const no0 = [Math.cos(a0), 0, Math.sin(a0)], no1 = [Math.cos(a1), 0, Math.sin(a1)];
      const mref = (y) => [((R0 + R1) / 2) * Math.cos((a0 + a1) / 2), y, ((R0 + R1) / 2) * Math.sin((a0 + a1) / 2)];
      const ni0 = mul(no0, -1), ni1 = mul(no1, -1);
      // outer and inner faces, wound away from a point inside the rim
      tri("wheel", P(R1, a0, -H), P(R1, a1, -H), P(R1, a1, H), mref(0), no0, no1, no1);
      tri("wheel", P(R1, a0, -H), P(R1, a1, H), P(R1, a0, H), mref(0), no0, no1, no0);
      tri("wheel", P(R0, a0, -H), P(R0, a1, -H), P(R0, a1, H), mref(0), ni0, ni1, ni1);
      tri("wheel", P(R0, a0, -H), P(R0, a1, H), P(R0, a0, H), mref(0), ni0, ni1, ni0);
      quad("wheel", P(R0, a0, H), P(R1, a0, H), P(R1, a1, H), P(R0, a1, H), mref(0));
      quad("wheel", P(R0, a0, -H), P(R1, a0, -H), P(R1, a1, -H), P(R0, a1, -H), mref(0));
      // red stripes on the top of every other rim segment pair, so the turn reads
      if (i % 6 < 3) quad("red", P(R0 + 0.01, a0, H + 0.012), P(R1 - 0.01, a0, H + 0.012), P(R1 - 0.01, a1, H + 0.012), P(R0 + 0.01, a1, H + 0.012), mref(H - 0.05));
    }
    for (let k = 0; k < SPOKES; k++) {
      const a = (k / SPOKES) * TAU, d = [Math.cos(a), 0, Math.sin(a)], t = [-Math.sin(a), 0, Math.cos(a)];
      obox("wheel", mul(d, (0.2 + R0) / 2 + 0.02), mul(d, (R0 - 0.2) / 2 + 0.04), [0, 0.06, 0], mul(t, 0.06));
    }
    cyl("wheel", [0, -0.16, 0], [0, 0.16, 0], 0.24, 12);
  });
  owner = -1;

  // ---------- chairs (owners 2+2k body, 3+2k safety bar) ----------
  // chair local frame: +X travel, +Z the chair's left, grip at the origin. Seat top 2.0 below the grip.
  const NCH = 6, SEAT = -2.0, HW = 0.6;
  const PIV = [-0.36, -1.45];                      // bar pivot (x, y), at both sides
  for (let k = 0; k < NCH; k++) {
    owner = 2 + 2 * k;
    box("cable", -0.16, 0.16, -0.12, 0.06, -0.07, 0.07);                                 // grip
    tube("chair", [[0, -0.1, 0], [0, -0.95, 0], [-0.12, -1.22, 0], [-0.36, -1.38, 0], [-0.4, -1.45, 0]], 0.04, 6);
    tube("chair", [[-0.4, -1.45, -HW], [-0.4, -1.45, HW]], 0.035, 6);                   // top bar over the backrest
    for (const s of [-1, 1]) {
      const z = s * HW;
      tube("chair", [[-0.4, -1.45, z], [-0.31, -2.04, z], [0.24, -2.04, z], [0.26, -1.95, z]], 0.03, 5); // side frame
      tube("chair", [[-0.34, -1.72, z], [0.18, -1.72, z], [0.22, -1.98, z]], 0.025, 5); // armrest
      // two seats and two backrests, a gap between them
      const z0 = s > 0 ? 0.03 : -0.56, z1 = s > 0 ? 0.56 : -0.03;
      box("red", -0.3, 0.24, SEAT - 0.07, SEAT, z0, z1);
      obox("red", [-0.34, -1.74, (z0 + z1) / 2], [0.035, 0.008, 0], [-0.08, 0.26, 0], [0, 0, (z1 - z0) / 2]);
    }
    owner = 3 + 2 * k;
    // bar, modelled down: arms from the pivots forward, a front rail, two drops to a footrest
    for (const s of [-1, 1]) tube("chair", [[PIV[0], PIV[1], s * (HW + 0.06)], [0.1, -1.47, s * (HW + 0.06)], [0.42, -1.58, s * (HW + 0.06)]], 0.025, 5);
    tube("chair", [[0.42, -1.58, -HW - 0.06], [0.42, -1.58, HW + 0.06]], 0.028, 5);
    for (const s of [-1, 1]) tube("chair", [[0.42, -1.58, s * 0.28], [0.5, -2.3, s * 0.28]], 0.022, 5);
    tube("chair", [[0.5, -2.3, -0.42], [0.5, -2.3, 0.42]], 0.028, 5);
  }
  owner = -1;

  // ---------- snow-laden firs ----------
  function fir(x, z, H, id) {
    const y0 = G(x, z) - 0.15, segs = 9;
    cyl("dark", [x, y0, z], [x, y0 + 0.2 * H, z], 0.05 * H, 6, 0.035 * H);
    for (let i = 0; i < 4; i++) {
      const yb = y0 + H * (0.12 + 0.2 * i), ya = i === 3 ? y0 + H : yb + 0.34 * H, r = H * (0.3 - 0.056 * i);
      const rot = hash(id * 7 + i) * TAU;
      const ring = Array.from({ length: segs }, (_, j) => {
        const a = rot + (j / segs) * TAU, rr = r * (j % 2 ? 0.86 : 1);
        return [x + rr * Math.cos(a), yb + (j % 2 ? 0.04 * H : 0), z + rr * Math.sin(a)];
      });
      coneRing("dark", ring, [x, ya, z], [x, yb + 0.02 * H, z]);
      // snow: a scalloped cone over the upper part of the tier, its lobes drooping
      const h = ya - yb, ys = yb + 0.42 * h, rs = r * 0.62 + 0.05;
      const sring = Array.from({ length: segs * 2 }, (_, j) => {
        const a = rot + (j / (segs * 2)) * TAU, lobe = 0.5 + 0.5 * Math.cos(j * Math.PI);
        return [x + rs * (0.92 + 0.12 * lobe) * Math.cos(a), ys - 0.07 * h * lobe, z + rs * (0.92 + 0.12 * lobe) * Math.sin(a)];
      });
      coneRing("snow", sring, [x, ya + 0.05, z], [x, ys + 0.04 * h, z]);
    }
  }
  const FIRS = [[-1.0, 4.4, 4.8], [0.8, 3.7, 3.0], [2.3, 4.4, 4.4], [3.9, 4.2, 3.4], [5.2, 4.4, 4.4], [6.6, 4.1, 5.0],
    [7.5, 3.0, 3.2], [-7.4, 4.6, 2.4], [-7.3, -4.2, 2.6], [-2.0, -4.4, 2.2]];
  FIRS.forEach(([x, z, H], i) => fir(x, z, H, i));

  // ---------- log hut ----------
  const HX0 = -7.4, HX1 = -4.2, HZ0 = 2.5, HZ1 = 4.3, WALL = 2.3;
  const hy = G(HX1, HZ1) - 0.05, hTop = hy + WALL, hRidge = hTop + 1.0, hzc = (HZ0 + HZ1) / 2;
  box("dark", HX0, HX1, hy - 0.6, hTop, HZ0, HZ1);
  for (let y = hy + 0.35; y < hTop; y += 0.38) box("cable", HX0 - 0.01, HX1 + 0.01, y, y + 0.03, HZ0 - 0.012, HZ0);  // log seams, -Z (lift side)
  for (let y = hy + 0.35; y < hTop; y += 0.38) box("cable", HX1, HX1 + 0.012, y, y + 0.03, HZ0, HZ1);               // log seams, +X
  // gable ends and roof (ridge along X)
  for (const x of [HX0, HX1 - 0.1]) prismTri("dark", [[x, hTop, HZ0], [x, hTop, HZ1], [x, hRidge - 0.05, hzc]], [0.1, 0, 0]);
  const HOV = 0.4;
  for (const sz of [-1, 1]) {
    const ze = hzc + sz * ((HZ1 - HZ0) / 2 + HOV), ye = hTop - HOV * (1.0 / ((HZ1 - HZ0) / 2));
    const mid = [(HX0 + HX1) / 2, (ye + hRidge) / 2, (ze + hzc) / 2];
    const alongv = nrm([0, hRidge - ye, hzc - ze]), up0 = nrm(cross(alongv, [1, 0, 0])), up = up0[1] > 0 ? up0 : mul(up0, -1);
    const half = Math.hypot(hRidge - ye, hzc - ze) / 2;
    obox("red", mid, [(HX1 - HX0) / 2 + 0.35, 0, 0], mul(alongv, half), mul(up, 0.06));
    obox("snow", add(add(mid, mul(up, 0.26)), mul(alongv, -0.06)), [(HX1 - HX0) / 2 + 0.38, 0, 0], mul(alongv, half + 0.06), mul(up, 0.2));
  }
  box("snow", HX0 - 0.3, HX1 + 0.3, hRidge + 0.15, hRidge + 0.42, hzc - 0.3, hzc + 0.3);
  // chimney with a snow cap
  box("steel", HX0 + 0.6, HX0 + 1.0, hTop + 0.4, hRidge + 0.9, HZ1 - 0.75, HZ1 - 0.35);
  box("snow", HX0 + 0.55, HX0 + 1.05, hRidge + 0.9, hRidge + 1.05, HZ1 - 0.8, HZ1 - 0.3);
  // door, windows (frames iris, panes glow), snow on the sills
  box("wheel", HX0 + 0.45, HX0 + 1.3, hy, hy + 1.9, HZ0 - 0.04, HZ0);
  const win = (x0, x1, y0, y1, face) => {
    if (face === "z") {
      box("wheel", x0 - 0.08, x1 + 0.08, y0 - 0.08, y1 + 0.08, HZ0 - 0.03, HZ0);
      box("glow", x0, x1, y0, y1, HZ0 - 0.045, HZ0 - 0.03);
      box("cable", (x0 + x1) / 2 - 0.025, (x0 + x1) / 2 + 0.025, y0, y1, HZ0 - 0.055, HZ0 - 0.045);
      box("snow", x0 - 0.12, x1 + 0.12, y0 - 0.12, y0 - 0.02, HZ0 - 0.14, HZ0);
    } else {
      box("wheel", HX1, HX1 + 0.03, y0 - 0.08, y1 + 0.08, x0 - 0.08, x1 + 0.08);
      box("glow", HX1 + 0.03, HX1 + 0.045, y0, y1, x0, x1);
      box("cable", HX1 + 0.045, HX1 + 0.055, y0, y1, (x0 + x1) / 2 - 0.025, (x0 + x1) / 2 + 0.025);
      box("snow", HX1, HX1 + 0.14, y0 - 0.12, y0 - 0.02, x0 - 0.12, x1 + 0.12);
    }
  };
  win(HX0 + 1.8, HX0 + 2.9, hy + 0.9, hy + 1.7, "z");
  win(HZ0 + 0.5, HZ1 - 0.5, hy + 0.9, hy + 1.7, "x");
  box("snow", HX0 + 0.3, HX0 + 1.45, hy - 0.2, hy + 0.12, HZ0 - 0.6, HZ0);               // step

  // ---------- ski rack with skis and poles ----------
  const RKX0 = -3.4, RKX1 = -1.3, RKZ = 2.9;
  for (const x of [RKX0, RKX1]) box("wheel", x - 0.06, x + 0.06, G(x, RKZ) - 0.3, G(x, RKZ) + 1.2, RKZ - 0.06, RKZ + 0.06);
  const ry = Math.max(G(RKX0, RKZ), G(RKX1, RKZ));
  box("wheel", RKX0 - 0.1, RKX1 + 0.1, ry + 1.05, ry + 1.17, RKZ - 0.05, RKZ + 0.05);
  box("wheel", RKX0, RKX1, ry + 0.45, ry + 0.53, RKZ - 0.04, RKZ + 0.04);
  const skiCols = ["red", "chair", "red", "chair", "red"];
  for (let i = 0; i < 5; i++) {
    const x = RKX0 + 0.3 + i * 0.42, yb = G(x, RKZ - 0.3) - 0.05, top = ry + 1.7;
    for (const dx of [-0.05, 0.05]) {
      const B = [x + dx, yb, RKZ - 0.32], T = [x + dx * 1.4, top, RKZ - 0.02];
      const ax = mul(sub(T, B), 0.5), side = [0.04, 0, 0], thick = mul(nrm(cross(ax, side)), 0.012);
      obox(skiCols[i], mul(add(B, T), 0.5), ax, side, thick);
    }
  }
  for (let i = 0; i < 3; i++) {                     // poles: leaning at the rack's -X end, baskets near the tip
    const x = RKX0 - 0.35 - i * 0.12, yb = G(x, RKZ - 0.35);
    tube("cable", [[x, yb, RKZ - 0.35], [x + 0.25, ry + 1.25, RKZ + 0.02]], 0.015, 4);
    cyl("cable", [x + 0.02, yb + 0.12, RKZ - 0.34], [x + 0.02, yb + 0.15, RKZ - 0.34], 0.06, 6);
  }

  // ---------- fence posts with orange netting ----------
  const FZ = -3.05, FXS = [7.7, 6.3, 4.9, 3.5, 2.1, 0.7, -0.7];
  FXS.forEach((x) => cyl("dark", [x, G(x, FZ) - 0.3, FZ], [x, G(x, FZ) + 1.25, FZ], 0.04, 6));
  for (let i = 0; i < FXS.length - 1; i++) {
    const xa = FXS[i], xb = FXS[i + 1], n = 4;
    for (let j = 0; j < n; j++) {
      const u0 = j / n, u1 = (j + 1) / n, x0 = xa + (xb - xa) * u0, x1 = xa + (xb - xa) * u1;
      const sag = (u) => -0.08 * 4 * u * (1 - u);
      const g0 = G(x0, FZ), g1 = G(x1, FZ);
      const a = [x0, g0 + 0.15, FZ], b = [x1, g1 + 0.15, FZ], e = [x1, g1 + 1.15 + sag(u1), FZ], d = [x0, g0 + 1.15 + sag(u0), FZ];
      const ref = [(x0 + x1) / 2, (g0 + g1) / 2 + 0.6, FZ - 0.02];
      const off = [0, 0, 0.02];
      // a thin band: front and back faces plus the top and bottom edges
      quad("net", add(a, off), add(b, off), add(e, off), add(d, off), ref);
      quad("net", sub(a, off), sub(b, off), sub(e, off), sub(d, off), add(ref, [0, 0, 0.04]));
      quad("net", sub(d, off), add(d, off), add(e, off), sub(e, off), [(x0 + x1) / 2, g0, FZ]);
      quad("net", sub(a, off), add(a, off), add(b, off), sub(b, off), [(x0 + x1) / 2, g0 + 1.5, FZ]);
      // mesh holes suggested by two dark diagonal threads per cell (no hull)
      const front = (p) => add(p, [0, 0, -0.024]);
      for (const [p, q] of [[a, e], [d, b]]) {
        const t = mul(nrm(sub(q, p)), 1), w = nrm(cross(t, [0, 0, 1]));
        const hw = mul(w, 0.012);
        quad("thread", front(add(p, hw)), front(sub(p, hw)), front(sub(q, hw)), front(add(q, hw)), add(front(mul(add(p, q), 0.5)), [0, 0, 0.05]));
      }
    }
  }

  // ---------- meshes: one per material ----------
  const MAT = {
    snow: [c.snow, c.snowShade, 0.25, 3], dark: [c.dark, c.darkShade, 0.3, 3], steel: [c.steel, c.steelShade, 0.2, 3],
    cable: [c.cable, c.cable, -1, 1.5], red: [c.red, c.redShade, 0.15, 3], wheel: [c.wheel, c.wheelShade, 0.15, 3],
    chair: [c.chair, c.chairShade, 0.2, 2],
    net: [c.wheel, c.wheelShade, -1, 2], thread: [c.wheelShade, c.wheelShade, -1, 0], glow: [c.glow, c.glow, -1, 0],
  };
  const moving = [];
  for (const [key, { p, n, o }] of Object.entries(soups)) {
    const [b, s, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, b, s, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    set.add(mesh);
    if (o.some((v) => v >= 0)) {
      kit.hullNormals(g);
      const hn = g.attributes.hullNormal;
      moving.push({ mesh, base: { p: Float32Array.from(p), n: Float32Array.from(n), h: hn ? Float32Array.from(hn.array) : null, o } });
      mesh.frustumCulled = false;
    }
  }

  // ---------- joints, rewrite ----------
  const wheelJ = WHEELS.map((W, w) => {
    const j = new THREE.Object3D();
    j.name = w ? "returnWheel" : "bullwheel";
    j.position.set(...W);
    set.add(j);
    joints[j.name] = j;
    return j;
  });
  const chairJ = [], barJ = [];
  for (let k = 0; k < NCH; k++) {
    const j = new THREE.Object3D();
    j.name = `chair${k}`;
    set.add(j);
    const b = new THREE.Object3D();
    b.name = `bar${k}`;
    b.position.set(PIV[0], PIV[1], 0);
    j.add(b);
    joints[j.name] = j, joints[b.name] = b;
    chairJ.push(j), barJ.push(b);
  }
  const NO = 2 + 2 * NCH;
  const MS = Array.from({ length: NO }, () => new THREE.Matrix4()), NS = MS.map(() => new THREE.Matrix3());
  const PIVM = new THREE.Matrix4().makeTranslation(-PIV[0], -PIV[1], 0);
  const q = new THREE.Vector3();
  function rig() {
    wheelJ.forEach((j, w) => (j.updateMatrix(), MS[w].copy(j.matrix)));
    for (let k = 0; k < NCH; k++) {
      chairJ[k].updateMatrix(), barJ[k].updateMatrix();
      MS[2 + 2 * k].copy(chairJ[k].matrix);
      MS[3 + 2 * k].multiplyMatrices(chairJ[k].matrix, barJ[k].matrix).multiply(PIVM);
    }
    MS.forEach((m, k) => NS[k].getNormalMatrix(m));
    for (const { mesh, base } of moving) {
      const g = mesh.geometry, P3 = g.attributes.position.array, N3 = g.attributes.normal.array, H = g.attributes.hullNormal?.array;
      for (let v = 0; v < base.o.length; v++) {
        const k = base.o[v], i = v * 3;
        if (k < 0) continue;
        q.fromArray(base.p, i).applyMatrix4(MS[k]).toArray(P3, i);
        q.fromArray(base.n, i).applyMatrix3(NS[k]).normalize().toArray(N3, i);
        if (H && base.h) q.fromArray(base.h, i).applyMatrix3(NS[k]).normalize().toArray(H, i);
      }
      g.attributes.position.needsUpdate = g.attributes.normal.needsUpdate = true;
      if (H) g.attributes.hullNormal.needsUpdate = true;
      g.computeBoundingSphere(), g.computeBoundingBox();
    }
  }

  // ---------- clip ----------
  // run (6 s): chairs move STEP spacings per loop; bar angle (rad, + lifts the front up and back) from loop position.
  const PERIOD = 6, STEP = 2, SPACING = LOOP / NCH, SPEED = (STEP * SPACING) / PERIOD;
  const spin = (() => { const raw = (STEP * SPACING) / GA, unit = TAU / SPOKES; return Math.round(raw / unit) * unit; })();
  const BAR_UP = 1.75, smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  const barAngle = (s) => {
    s = ((s % LOOP) + LOOP) % LOOP;
    const down = smooth((s - 1.0) / 1.6) * (1 - smooth((s - (LS - 2.4)) / 1.6));
    return BAR_UP * (1 - down);
  };
  function run(t) {
    const u = (((t % PERIOD) + PERIOD) % PERIOD) / PERIOD;
    for (const j of wheelJ) j.rotation.set(0, -spin * u, 0);
    for (let k = 0; k < NCH; k++) {
      const s = k * SPACING + 0.6 + SPEED * PERIOD * u, a = along(s);
      chairJ[k].position.set(a.x, cableY(a.x), a.z);
      chairJ[k].rotation.set(0, Math.atan2(-a.dz, a.dx), 0);
      barJ[k].rotation.set(0, 0, barAngle(s));
    }
    rig();
    root.updateMatrixWorld(true);
  }
  const CLIPS = { run: PERIOD };
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`ski-lift: no clip "${m[1]}" (clips: run)`);
      return run(+m[2]);
    }
    if (name !== "rest") throw new Error(`ski-lift: unknown pose "${name}" (rest, or run@<seconds>)`);
    run(0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
