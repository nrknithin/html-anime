// depato-rooftop.js - a Showa-era department-store rooftop amusement area (okujo yuenchi) at dusk, as a 14 x 10 m set
// tile: a pink concrete deck inside a parapet with a tall wire safety fence, a mini carousel of four horses under a
// striped cone roof, a coin-operated panda ride and a little car ride on their pedestals, a tiny rooftop shrine (red
// torii and hokora) in the far corner, a snack counter with a striped awning, a water tank on a steel frame, two
// vending machines, benches, planters, balloons tied to the fence, and strings of amber bulbs across the roof.
// Contract: harness/lab/README.md. Meters, +Y up, the snack counter and the shrine face +Z, the set's left is +X,
// stands on y = 0, centred on x = 0, z = 0.
//
// Construction (boxes, bars, capped cylinders between two points, low ellipsoids and pie wedges, all triangle soups
// merged per material; every triangle wound away from a point inside its solid; flat normals on planes, smooth on
// round parts). Pieces are authored in local frames (origin on the deck, yaw about +Y) and baked into world space.
// Every vertex carries an owner: -1 static, 0 the carousel's turning part, 1-4 the four horses, 5 the panda. The
// moving parts share the static meshes of their material; pose() rewrites only the owned vertices (positions,
// normals, hull normals) from one matrix per owner, so the ride clip adds no meshes.
//   DECK      slab 14 x 10 m, top 0.2; dark seams on a 2 m grid; parapet 0.6 x 0.25 round the edge with a cap.
//   FENCE     1.9 m over the parapet (top 2.7): posts every ~2 m, two rails, a square wire net of thin strips.
//   CAROUSEL  static base disc, turning platform (r 1.62), centre drum, four poles, sixteen-stripe cone roof on a
//             striped valance with hanging tabs, finial. Horses bob on their poles, neighbours in opposite phase.
//   PANDA     a fibreglass panda (body 0.96 m long) on a pink pedestal with a coin post; it rocks and bobs.
//   CAR       a little open car on a pedestal, coin post beside it. Static.
//   SHRINE    gravel bed, stone base, white hokora with a dark gabled roof, a 1.35 m red torii in front.
//   COUNTER   the snack stand on the back fence: hatch window, counter shelf, striped awning with tabs, a blank
//             sign on the roof, two stools.
//   TANK      upright tank on a four-legged braced frame with a ladder, back right corner.
//   VENDING   two machines on the right-hand fence, facing +X: lit display, sample rows, dark lower panel.
//   PROPS     two benches, three planters with dark bushes and flowers, five balloons on strings tied to the fence.
//   LIGHTS    six poles (top 4.72, none on the near +X +Z corner so the three-quarter views stay open) and five
//             sagging wires: an X over the -X half, a fan over the +X half; amber bulbs every ~0.55 m.
// Joints are bare markers for framing (no geometry): carousel (turns with the clip), panda, shrine, counter.
// Proportions (real size, base unit the 0.8 m parapet top): fence top 2.7; carousel r 1.8, platform 0.52, roof
//   2.75-4.05, finial 4.2; panda back 0.9, head top 1.3; car 0.85; torii 1.35 over the deck; counter 2.3, sign 3.05; tank top 3.6.
// Options: build(THREE, kit, colors, { height, lights }).
//   height   scales the whole set uniformly so its top is `height` (as the torii does).
//   lights   false drops the light poles, wires and bulbs (default true).
// Clip: ride (4 s loop): the carousel turns half a turn (the horses alternate two colours, so it loops), the horses
//   bob twice, the panda rocks four times; pose("ride@1.2").
// Colours (festival, dusk), base / shade:
//   deck                                   skin #f0c2ae, one tone (dusk-pink concrete)
//   parapet, base discs, planters, stone moon #ffd7a1 / sky #24143a, threshold 0.35 (front faces go purple)
//   pink paint (stripes, car, pedestals, torii, saddles, balloons, machine)  accent #ff4d6d / sky #24143a
//   white paint (stripes, panda, tank, hokora, platform, counter, machine)   sclera #f6f3ee / sky #24143a
//   amber paint (horses, drum, benches, sign, balloons)                     practical #ffb020 / accent #ff4d6d
//   steel (posts, rails, poles, frame)     line #fff1ea / sky #24143a, 2 px ink
//   black (panda patches, wheels, roofs)   hair #1a1020 / sky #24143a
//   bushes                                 sky #24143a, one tone with a 2 px hull
//   seams, wires, slots, windows           hair #1a1020, one tone, no hull
//   net                                    line #fff1ea, one tone, no hull (a pale veil, not a cage)
//   bulbs, display panels, headlights      practical #ffb020 glow (threshold -0.25)

export const meta = {
  name: "depato-rooftop",
  height: 4.72,
  script: "festival",
  colors: {
    deck: "#f0c2ae",
    wall: "#ffd7a1", wallShade: "#24143a",
    pink: "#ff4d6d", pinkShade: "#24143a",
    white: "#f6f3ee", whiteShade: "#24143a",
    amber: "#ffb020", amberShade: "#ff4d6d",
    steel: "#fff1ea", steelShade: "#24143a",
    black: "#1a1020", blackShade: "#24143a",
    bush: "#24143a",
    dark: "#1a1020",
    net: "#fff1ea",
    glow: "#ffb020",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const LIGHTS = opts.lights !== false;
  const root = new THREE.Group();
  root.name = "depato-rooftop";
  const body = new THREE.Group(); // uniform size scale lives here
  body.name = "body";
  root.add(body);
  const joints = {};
  const TAU = Math.PI * 2;

  // ---------- triangle soups with owners ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [], o: [] });
  let owner = -1;
  let T = null; // local frame: { o: [x, y, z], cy: cos yaw, sy: sin yaw }
  const P = (q) => (T ? [T.o[0] + q[0] * T.cy + q[2] * T.sy, T.o[1] + q[1], T.o[2] - q[0] * T.sy + q[2] * T.cy] : q);
  const N = (q) => (T ? [q[0] * T.cy + q[2] * T.sy, q[1], -q[0] * T.sy + q[2] * T.cy] : q);
  function frame(x, y, z, yaw, fn) {
    const prev = T;
    T = { o: [x, y, z], cy: Math.cos(yaw), sy: Math.sin(yaw) };
    fn();
    T = prev;
  }
  function mark(name, x, y, z) { // a named pivot with no geometry, for framing a piece
    const j = new THREE.Group();
    j.name = name;
    j.position.set(x, y, z);
    body.add(j);
    joints[name] = j;
    return j;
  }
  let maxY = 0;
  function tri(key, a, b, e, ref, na, nb, ne) { // one triangle wound away from ref (local coords)
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const flip = dot(n, sub(mul(add(add(a, b), e), 1 / 3), ref)) < 0;
    n = nrm(flip ? mul(n, -1) : n);
    const s = S(key);
    const vs = flip ? [[a, na], [e, ne], [b, nb]] : [[a, na], [b, nb], [e, ne]];
    for (const [q, nq] of vs) {
      const w = P(q);
      if (w[1] > maxY) maxY = w[1];
      s.p.push(...w), s.n.push(...N(nq ?? n)), s.o.push(owner);
    }
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
  const flat = (key, x0, x1, z0, z1, y) => quad(key, [x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [x0, y - 1, z0]);
  function axes(t) { // two unit vectors perpendicular to t
    let s = cross(t, [0, 1, 0]);
    if (Math.hypot(...s) < 1e-6 * Math.hypot(...t)) s = [1, 0, 0];
    s = nrm(s);
    return [s, nrm(cross(s, t))];
  }
  function bar(key, p, q, w) { // square bar from p to q, half-width w
    const [s, u] = axes(sub(q, p));
    const C = (pt, i, j) => add(pt, add(mul(s, w * i), mul(u, w * j)));
    hex(key, [C(p, -1, -1), C(p, 1, -1), C(p, 1, 1), C(p, -1, 1), C(q, -1, -1), C(q, 1, -1), C(q, 1, 1), C(q, -1, 1)]);
  }
  function cyl(key, p, q, r0, n = 12, r1 = r0) { // capped (frustum) cylinder from p to q, smooth sides
    const [s, u] = axes(sub(q, p));
    const ref = mul(add(p, q), 0.5);
    const R = (pt, a, r) => add(pt, add(mul(s, Math.cos(a) * r), mul(u, Math.sin(a) * r)));
    const Nr = (a) => add(mul(s, Math.cos(a)), mul(u, Math.sin(a)));
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
      tri(key, R(p, a0, r0), R(p, a1, r0), R(q, a1, r1), ref, Nr(a0), Nr(a1), Nr(a1));
      tri(key, R(p, a0, r0), R(q, a1, r1), R(q, a0, r1), ref, Nr(a0), Nr(a1), Nr(a0));
      if (r1 > 0) tri(key, q, R(q, a0, r1), R(q, a1, r1), ref);
      if (r0 > 0) tri(key, p, R(p, a0, r0), R(p, a1, r0), ref);
    }
  }
  const up = (key, x, z, y0, y1, r, n, r1) => cyl(key, [x, y0, z], [x, y1, z], r, n, r1);
  function ball(key, cx, cy, cz, rx, ry = rx, rz = rx, nu = 10, nv = 6) { // low ellipsoid, smooth normals
    const Q = (i, j) => {
      const uu = (i / nu) * TAU, v = (j / nv) * Math.PI;
      return [cx + Math.sin(v) * Math.cos(uu) * rx, cy + Math.cos(v) * ry, cz + Math.sin(v) * Math.sin(uu) * rz];
    };
    const Nn = (q) => nrm([(q[0] - cx) / (rx * rx), (q[1] - cy) / (ry * ry), (q[2] - cz) / (rz * rz)]);
    const ref = [cx, cy, cz];
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = Q(i, j), b = Q(i + 1, j), e = Q(i + 1, j + 1), d = Q(i, j + 1);
      if (j > 0) tri(key, a, b, e, ref, Nn(a), Nn(b), Nn(e));
      if (j < nv - 1) tri(key, a, e, d, ref, Nn(a), Nn(e), Nn(d));
    }
  }

  // ---------- dimensions ----------
  const XW = 7, ZD = 5, D = 0.2; // deck half-extents, deck top
  const PT = 0.25, PY = 0.8; // parapet thickness, top
  const IX = XW - PT, IZ = ZD - PT;
  const FT = PY + 1.9; // fence top

  // ---------- deck, seams, parapet ----------
  box("deck", -XW, XW, 0, D, -ZD, ZD);
  box("wall", -XW, XW, D - 0.1, PY, ZD - PT, ZD);
  box("wall", -XW, XW, D - 0.1, PY, -ZD, -ZD + PT);
  box("wall", -XW, -XW + PT, D - 0.1, PY, -ZD + 0.1, ZD - 0.1);
  box("wall", XW - PT, XW, D - 0.1, PY, -ZD + 0.1, ZD - 0.1);
  for (const [x0, x1, z0, z1] of [[-XW - 0.04, XW + 0.04, ZD - PT - 0.04, ZD + 0.04], [-XW - 0.04, XW + 0.04, -ZD - 0.04, -ZD + PT + 0.04],
    [-XW - 0.04, -XW + PT + 0.04, -ZD + PT, ZD - PT], [XW - PT - 0.04, XW + 0.04, -ZD + PT, ZD - PT]])
    box("wall", x0, x1, PY, PY + 0.05, z0, z1); // caps
  const y1 = D + 0.005, SW = 0.02;
  for (let x = -6; x <= 6; x += 2) flat("dark", x - SW, x + SW, -IZ, IZ, y1);
  for (let z = -4; z <= 4; z += 2) flat("dark", -IX, IX, z - SW, z + SW, y1);
  for (const [x0, x1, z0, z1] of [[-IX, IX, IZ - 0.1, IZ], [-IX, IX, -IZ, -IZ + 0.1], [-IX, -IX + 0.1, -IZ, IZ], [IX - 0.1, IX, -IZ, IZ]])
    flat("dark", x0, x1, z0, z1, y1 + 0.001); // gutters

  // ---------- fence ----------
  function fence(a, b) { // a, b: [x, z] on the parapet centre line
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), d = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    const F = (u, y) => [a[0] + d[0] * u, y, a[1] + d[1] * u];
    const n = Math.max(1, Math.round(len / 2));
    for (let i = 0; i <= n; i++) bar("steel", F((len * i) / n, PY), F((len * i) / n, FT + 0.04), 0.032);
    for (const y of [PY + 0.08, FT]) bar("steel", F(0, y), F(len, y), 0.028);
    const step = 0.4, hw = 0.012, out = [-d[1], 0, d[0]];
    const R = (p) => [p[0] - out[0], p[1], p[2] - out[2]];
    for (let u = step / 2; u < len; u += step)
      quad("net", F(u - hw, PY + 0.08), F(u + hw, PY + 0.08), F(u + hw, FT), F(u - hw, FT), R(F(u, PY + 1)));
    for (let y = PY + 0.08 + step; y < FT - 0.05; y += step)
      quad("net", F(0, y - hw), F(len, y - hw), F(len, y + hw), F(0, y + hw), R(F(len / 2, y)));
  }
  {
    const ex = XW - PT / 2, ez = ZD - PT / 2;
    fence([ex, ez], [-ex, ez]);
    fence([-ex, -ez], [ex, -ez]);
    fence([ex, -ez], [ex, ez]);
    fence([-ex, ez], [-ex, -ez]);
  }

  // ---------- mini carousel ----------
  const CX = 1.6, CZ = -1.2, PL = D + 0.32; // centre, platform top
  const RR = 1.8, RY0 = 2.75, RY1 = 3.05, APEX = 4.05, NS = 16, HR = 1.1; // roof rim, valance, apex, stripes, horse radius
  {
    mark("carousel", CX, PL, CZ);
    up("wall", CX, CZ, D - 0.05, D + 0.12, 1.75, 24); // static base
    owner = 0;
    up("white", CX, CZ, D + 0.13, PL, 1.62, 24);
    up("pink", CX, CZ, D + 0.17, PL - 0.04, 1.635, 24); // rim band
    up("amber", CX, CZ, PL, RY0, 0.26, 12); // centre drum
    for (let k = 0; k < 6; k++) { // mirror panels on the drum
      const a = (k / 6) * TAU + 0.2, r = 0.265;
      const ca = Math.cos(a), sa = Math.sin(a), ta = [-sa, 0, ca];
      const o = [CX + ca * r, 0, CZ + sa * r];
      const A = (s, y) => [o[0] + ta[0] * s, y, o[2] + ta[2] * s];
      quad("white", A(-0.07, PL + 0.5), A(0.07, PL + 0.5), A(0.07, RY0 - 0.35), A(-0.07, RY0 - 0.35), [CX, PL + 1, CZ]);
    }
    for (let i = 0; i < NS; i++) { // striped roof: pie wedges (cone top, valance face, flat underside) + a tab
      const key = i % 2 ? "white" : "pink", tab = i % 2 ? "pink" : "white";
      const a0 = (i / NS) * TAU, a1 = ((i + 1) / NS) * TAU, am = (a0 + a1) / 2;
      const R = (a, r, y) => [CX + Math.cos(a) * r, y, CZ + Math.sin(a) * r];
      const ref = [CX + Math.cos(am) * 0.6, (RY0 + RY1) / 2, CZ + Math.sin(am) * 0.6];
      tri(key, [CX, APEX, CZ], R(a0, RR, RY1), R(a1, RR, RY1), ref);
      quad(key, R(a0, RR, RY0), R(a1, RR, RY0), R(a1, RR, RY1), R(a0, RR, RY1), ref);
      tri(key, [CX, RY0, CZ], R(a0, RR, RY0), R(a1, RR, RY0), ref);
      const t0 = R(a0 + 0.03, RR + 0.005, RY0 + 0.01), t1 = R(a1 - 0.03, RR + 0.005, RY0 + 0.01), tm = R(am, RR + 0.005, RY0 - 0.17);
      const t0b = R(a0 + 0.03, RR - 0.02, RY0 + 0.01), t1b = R(a1 - 0.03, RR - 0.02, RY0 + 0.01), tmb = R(am, RR - 0.02, RY0 - 0.17);
      const tref = R(am, RR - 0.01, RY0 - 0.05);
      tri(tab, t0, t1, tm, tref), tri(tab, t0b, t1b, tmb, tref);
      quad(tab, t0, t0b, tmb, tm, tref), quad(tab, t1, t1b, tmb, tm, tref), quad(tab, t0, t1, t1b, t0b, tref);
    }
    up("amber", CX, CZ, APEX - 0.05, APEX + 0.08, 0.03, 6);
    ball("amber", CX, APEX + 0.13, CZ, 0.07, 0.07, 0.07, 8, 5); // finial
    // horses: one per owner 1..4, on poles at HR, facing along the turn (the turn is -theta, see pose)
    for (let k = 0; k < 4; k++) {
      const th = Math.PI / 4 + (k * Math.PI) / 2, hx = CX + Math.cos(th) * HR, hz = CZ + Math.sin(th) * HR;
      owner = 0;
      up("steel", hx, hz, PL, RY0, 0.022, 6);
      owner = k + 1;
      const coat = k % 2 ? "white" : "amber";
      frame(hx, PL, hz, Math.PI - th, () => {
        const by = 0.62; // body centre over the platform
        ball(coat, 0, by, 0, 0.13, 0.15, 0.3, 10, 6);
        cyl(coat, [0, by + 0.05, 0.18], [0, by + 0.3, 0.32], 0.075, 8, 0.06); // neck
        ball(coat, 0, by + 0.33, 0.38, 0.065, 0.075, 0.15, 8, 5); // head
        for (const sx of [-1, 1]) {
          cyl(coat, [sx * 0.07, by - 0.05, 0.18], [sx * 0.07, by - 0.26, 0.38], 0.035, 6, 0.028); // front legs, galloping
          cyl(coat, [sx * 0.07, by - 0.05, -0.18], [sx * 0.07, by - 0.3, -0.36], 0.04, 6, 0.028); // hind legs
        }
        box("pink", -0.135, 0.135, by + 0.1, by + 0.17, -0.1, 0.08); // saddle
        box("black", -0.03, 0.03, by + 0.22, by + 0.4, 0.18, 0.3); // mane
        cyl("black", [0, by + 0.05, -0.28], [0, by - 0.18, -0.42], 0.03, 6, 0.012); // tail
        box("pink", -0.075, 0.075, by + 0.31, by + 0.35, 0.3, 0.42); // bridle
      });
    }
    owner = -1;
  }

  // ---------- panda ride ----------
  const PX = 4.45, PZ = 1.6, PYAW = 0.75;
  frame(PX, D, PZ, PYAW, () => {
    box("pink", -0.42, 0.42, 0, 0.16, -0.66, 0.66); // pedestal
    box("dark", -0.43, 0.43, 0.06, 0.09, -0.67, 0.67);
    box("pink", 0.5, 0.72, 0, 0.95, 0.25, 0.47); // coin post
    box("dark", 0.7, 0.725, 0.6, 0.78, 0.3, 0.42);
    owner = 5;
    const by = 0.66;
    ball("white", 0, by, -0.05, 0.31, 0.29, 0.48, 12, 7); // body
    ball("black", 0, by + 0.01, 0.17, 0.325, 0.3, 0.15, 12, 6); // shoulder band
    for (const sx of [-1, 1]) {
      up("black", sx * 0.18, 0.27, 0.16, by - 0.1, 0.11, 10, 0.12); // front legs
      up("black", sx * 0.18, -0.34, 0.16, by - 0.1, 0.12, 10, 0.13); // hind legs
      ball("black", sx * 0.18, 0.18, 0.31, 0.12, 0.05, 0.15, 8, 4); // paws
      ball("black", sx * 0.18, 0.18, -0.3, 0.13, 0.05, 0.15, 8, 4);
      ball("black", sx * 0.17, by + 0.6, 0.44, 0.085, 0.085, 0.06, 8, 5); // ears
      ball("black", sx * 0.09, by + 0.31, 0.66, 0.055, 0.075, 0.03, 8, 4); // eye patches
      ball("white", sx * 0.095, by + 0.33, 0.69, 0.018, 0.02, 0.01, 6, 3); // eye glints
    }
    ball("white", 0, by + 0.32, 0.5, 0.25, 0.23, 0.21, 12, 7); // head
    ball("white", 0, by + 0.23, 0.68, 0.1, 0.075, 0.07, 8, 5); // muzzle
    ball("black", 0, by + 0.27, 0.745, 0.035, 0.025, 0.02, 6, 3); // nose
    box("pink", -0.2, 0.2, by + 0.26, by + 0.31, -0.32, 0.08); // saddle
    cyl("steel", [-0.22, by + 0.48, 0.32], [0.22, by + 0.48, 0.32], 0.018, 6); // handlebar
    for (const sx of [-1, 1]) cyl("steel", [sx * 0.15, by + 0.36, 0.38], [sx * 0.15, by + 0.48, 0.32], 0.016, 6);
    owner = -1;
  });
  mark("panda", PX, D + 0.66, PZ);

  // ---------- car ride ----------
  frame(2.0, D, 3.35, Math.PI / 2 + 0.25, () => {
    box("wall", -0.5, 0.5, 0, 0.12, -0.8, 0.8); // pedestal
    box("pink", -0.62, -0.42, 0, 0.9, -0.95, -0.75); // coin post
    box("dark", -0.625, -0.6, 0.55, 0.72, -0.9, -0.8);
    const wy = 0.12 + 0.13;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl("black", [sx * 0.3, wy, sz * 0.42], [sx * 0.41, wy, sz * 0.42], 0.13, 10);
    box("pink", -0.32, 0.32, 0.2, 0.46, -0.62, 0.62); // tub
    box("pink", -0.33, 0.33, 0.44, 0.62, 0.15, 0.66); // hood
    box("pink", -0.33, 0.33, 0.44, 0.66, -0.66, -0.36); // tail
    for (const sx of [-1, 1]) box("pink", sx * 0.33 - 0.04, sx * 0.33 + 0.04, 0.44, 0.58, -0.37, 0.16); // sides
    box("dark", -0.29, 0.29, 0.45, 0.47, -0.36, 0.15); // cockpit floor
    box("amber", -0.25, 0.25, 0.46, 0.6, -0.36, -0.12); // seat
    box("amber", -0.25, 0.25, 0.6, 0.85, -0.42, -0.34); // seat back
    for (const sx of [-1, 1]) box("white", sx * 0.345 - 0.01, sx * 0.345 + 0.01, 0.48, 0.52, -0.62, 0.62); // side stripe
    box("white", -0.36, 0.36, 0.18, 0.3, 0.6, 0.7); // bumpers
    box("white", -0.36, 0.36, 0.18, 0.3, -0.7, -0.6);
    cyl("white", [-0.3, 0.62, 0.17], [0.3, 0.62, 0.17], 0.015, 6); // windscreen frame
    for (const sx of [-1, 1]) cyl("white", [sx * 0.3, 0.62, 0.17], [sx * 0.3, 0.86, 0.12], 0.015, 6);
    cyl("white", [-0.3, 0.86, 0.12], [0.3, 0.86, 0.12], 0.015, 6);
    for (const sx of [-1, 1]) ball("glow", sx * 0.2, 0.52, 0.67, 0.06, 0.05, 0.03, 8, 4); // headlights
    cyl("dark", [0, 0.55, 0.12], [0, 0.72, 0.0], 0.012, 5);
    cyl("black", [0, 0.72, 0.0], [0, 0.735, -0.015], 0.09, 10); // steering wheel
  });

  // ---------- rooftop shrine ----------
  mark("shrine", 4.9, D + 0.7, -3.4);
  frame(4.9, D, -3.55, 0.2, () => {
    box("white", -0.8, 0.8, 0, 0.06, -0.75, 0.95); // gravel bed
    box("wall", -0.42, 0.42, 0.06, 0.38, -0.5, 0.15); // stone base
    box("white", -0.27, 0.27, 0.38, 0.86, -0.4, 0.05); // hokora body
    box("dark", -0.2, 0.2, 0.42, 0.8, 0.05, 0.06); // doors
    for (const x of [-0.1, 0, 0.1]) box("white", x - 0.008, x + 0.008, 0.42, 0.8, 0.06, 0.07);
    box("white", -0.2, 0.2, 0.6, 0.62, 0.06, 0.07);
    for (const s of [-1, 1]) hex("black", [[0, 1.12, -0.55], [s * 0.4, 0.84, -0.55], [s * 0.4, 0.84, 0.23], [0, 1.12, 0.23],
      [0, 1.17, -0.55], [s * 0.4, 0.89, -0.55], [s * 0.4, 0.89, 0.23], [0, 1.17, 0.23]]);
    box("amber", -0.035, 0.035, 1.14, 1.2, -0.56, 0.24); // ridge
    box("pink", -0.06, 0.06, 0.38, 0.5, 0.08, 0.2); // offering box
    // torii in front
    const tz = 0.65, tw = 0.42;
    for (const sx of [-1, 1]) {
      up("pink", sx * tw, tz, 0.06, 1.2, 0.05, 10, 0.042);
      up("black", sx * tw, tz, 0.06, 0.16, 0.065, 10); // nemaki
    }
    box("pink", -tw - 0.12, tw + 0.12, 0.92, 0.98, tz - 0.03, tz + 0.03); // nuki
    box("pink", -0.035, 0.035, 0.98, 1.16, tz - 0.025, tz + 0.025); // gakuzuka
    box("pink", -tw - 0.14, tw + 0.14, 1.16, 1.22, tz - 0.045, tz + 0.045); // shimaki
    for (const s of [-1, 1]) hex("black", [[0, 1.22, tz - 0.06], [s * (tw + 0.28), 1.29, tz - 0.06], [s * (tw + 0.28), 1.29, tz + 0.06], [0, 1.22, tz + 0.06],
      [0, 1.28, tz - 0.06], [s * (tw + 0.29), 1.36, tz - 0.06], [s * (tw + 0.29), 1.36, tz + 0.06], [0, 1.28, tz + 0.06]]); // kasagi, upswept
    ball("bush", -0.6, 0.2, -0.45, 0.2, 0.18, 0.2, 8, 5); // a shrub behind
  });

  // ---------- snack counter on the back fence ----------
  mark("counter", -2.9, D + 1.3, -IZ + 0.9);
  frame(-2.9, D, -IZ + 0.65, 0, () => {
    const W = 1.4, B = -0.6, F = 0.6, H = 2.3;
    box("white", -W, W, 0, 1.0, B, F); // lower front and body
    box("white", -W, W, 1.0, H, B, B + 0.6);
    for (const sx of [-1, 1]) box("white", sx * W - 0.12, sx * W + 0.12, 1.0, H, B + 0.6, F); // jambs
    box("white", -W, W, 1.95, H, B + 0.6, F); // lintel
    box("dark", -W + 0.12, W - 0.12, 1.0, 1.95, B + 0.6, F - 0.08); // hatch
    box("pink", -W, W, 1.0, 1.06, F - 0.1, F + 0.28); // counter shelf
    box("wall", -W - 0.05, W + 0.05, H, H + 0.08, B - 0.05, F + 0.05); // coping
    for (const [x, k] of [[-0.9, "amber"], [-0.6, "white"], [0.7, "pink"], [1.0, "amber"]]) box(k, x - 0.1, x + 0.1, 1.06, 1.28, F - 0.05, F + 0.12); // goods
    ball("white", 0.0, 1.38, F - 0.25, 0.22, 0.32, 0.22, 8, 5); // a shaved-ice machine shape in the hatch
    // striped awning, sloping out over the counter
    const AY0 = 2.18, AY1 = 1.86, AZ1 = F + 0.85, NA = 10, th = 0.035;
    for (let i = 0; i < NA; i++) {
      const x0 = -W - 0.1 + ((2 * W + 0.2) * i) / NA, x1 = -W - 0.1 + ((2 * W + 0.2) * (i + 1)) / NA, key = i % 2 ? "white" : "pink";
      hex(key, [[x0, AY0, F], [x1, AY0, F], [x1, AY1, AZ1], [x0, AY1, AZ1], [x0, AY0 + th, F], [x1, AY0 + th, F], [x1, AY1 + th, AZ1], [x0, AY1 + th, AZ1]]);
      const xm = (x0 + x1) / 2; // scalloped tab
      hex(key, [[x0, AY1, AZ1], [x1, AY1, AZ1], [xm + 0.03, AY1 - 0.14, AZ1], [xm - 0.03, AY1 - 0.14, AZ1],
        [x0, AY1, AZ1 + 0.02], [x1, AY1, AZ1 + 0.02], [xm + 0.03, AY1 - 0.14, AZ1 + 0.02], [xm - 0.03, AY1 - 0.14, AZ1 + 0.02]]);
    }
    for (const sx of [-1, 1]) bar("steel", [sx * (W + 0.05), AY1, AZ1 - 0.02], [sx * (W + 0.05), AY0 - 0.3, F], 0.015);
    // blank sign on the roof
    box("amber", -1.1, 1.1, H + 0.2, H + 0.75, B + 0.2, B + 0.3);
    box("dark", -1.0, 1.0, H + 0.3, H + 0.65, B + 0.3, B + 0.305);
    for (const sx of [-0.8, 0.8]) box("steel", sx - 0.03, sx + 0.03, H + 0.08, H + 0.2, B + 0.22, B + 0.28);
    for (const x of [-0.6, 0.6]) { // stools
      up("steel", x, F + 0.55, 0, 0.6, 0.025, 6);
      up("dark", x, F + 0.55, 0, 0.03, 0.17, 10);
      up("pink", x, F + 0.55, 0.6, 0.66, 0.16, 12);
    }
  });

  // ---------- water tank ----------
  {
    const TX = -5.75, TZ = -3.45, L = 0.75, FY = D + 1.6, TY0 = FY + 0.1, TY1 = TY0 + 1.6, TR = 0.85;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box("steel", TX + sx * L - 0.06, TX + sx * L + 0.06, D, FY, TZ + sz * L - 0.06, TZ + sz * L + 0.06);
    for (const y of [D + 0.3, FY - 0.06]) {
      for (const sz of [-1, 1]) box("steel", TX - L, TX + L, y - 0.04, y + 0.04, TZ + sz * L - 0.04, TZ + sz * L + 0.04);
      for (const sx of [-1, 1]) box("steel", TX + sx * L - 0.04, TX + sx * L + 0.04, y - 0.04, y + 0.04, TZ - L, TZ + L);
    }
    for (const sz of [-1, 1]) {
      bar("steel", [TX - L, D + 0.3, TZ + sz * L], [TX + L, FY - 0.06, TZ + sz * L], 0.02);
      bar("steel", [TX + L, D + 0.3, TZ + sz * L], [TX - L, FY - 0.06, TZ + sz * L], 0.02);
    }
    for (const sx of [-1, 1]) {
      bar("steel", [TX + sx * L, D + 0.3, TZ - L], [TX + sx * L, FY - 0.06, TZ + L], 0.02);
      bar("steel", [TX + sx * L, D + 0.3, TZ + L], [TX + sx * L, FY - 0.06, TZ - L], 0.02);
    }
    box("steel", TX - L - 0.1, TX + L + 0.1, FY, TY0, TZ - L - 0.1, TZ + L + 0.1);
    up("white", TX, TZ, TY0, TY1, TR, 20);
    for (const y of [TY0 + 0.55, TY0 + 1.1]) up("black", TX, TZ, y - 0.03, y + 0.03, TR + 0.012, 20);
    up("white", TX, TZ, TY1, TY1 + 0.14, TR + 0.03, 20, TR * 0.55);
    up("black", TX + 0.15, TZ + 0.1, TY1 + 0.1, TY1 + 0.2, 0.2, 10);
    const lz = TZ + L + 0.22;
    for (const x of [TX - 0.2, TX + 0.2]) box("steel", x - 0.025, x + 0.025, D, TY1 + 0.3, lz - 0.025, lz + 0.025);
    for (let y = D + 0.3; y < TY1 + 0.2; y += 0.3) box("steel", TX - 0.2, TX + 0.2, y - 0.015, y + 0.015, lz - 0.012, lz + 0.012);
  }

  // ---------- vending machines on the -X fence, facing +X ----------
  for (const [z, bodyKey] of [[0.0, "pink"], [1.05, "white"]]) {
    frame(-IX + 0.42, D, z, Math.PI / 2, () => {
      const w = 0.47, d0 = -0.38, d1 = 0.37;
      box(bodyKey, -w, w, 0, 1.83, d0, d1);
      box("glow", -w + 0.06, w - 0.06, 1.0, 1.72, d1, d1 + 0.01); // lit display
      for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) { // sample cans
        const x = -w + 0.13 + i * 0.142, y = 1.06 + r * 0.23, key = (i + r) % 3 === 0 ? "pink" : (i + r) % 3 === 1 ? "white" : "amber";
        box(key, x - 0.04, x + 0.04, y, y + 0.13, d1 + 0.01, d1 + 0.04);
        box("dark", x - 0.03, x + 0.03, y - 0.04, y - 0.015, d1 + 0.01, d1 + 0.02); // buttons
      }
      box("dark", -w + 0.06, w - 0.06, 0.12, 0.34, d1, d1 + 0.01); // takeout
      box("dark", 0.22, 0.38, 0.5, 0.9, d1, d1 + 0.01); // coin unit
      box("dark", -w + 0.06, 0.1, 0.55, 0.85, d1, d1 + 0.005); // panel
    });
  }
  box("dark", -IX + 0.02, -IX + 0.08, D, D + 0.25, -0.5, 1.55); // trash rack shadow strip

  // ---------- benches ----------
  function bench(x, z, yaw) {
    frame(x, D, z, yaw, () => {
      for (const zz of [-0.12, 0.0, 0.12]) box("amber", -0.75, 0.75, 0.4, 0.44, zz - 0.05, zz + 0.05);
      for (const yy of [0.58, 0.72]) hex("amber", [[-0.75, yy, -0.2], [0.75, yy, -0.2], [0.75, yy, -0.17], [-0.75, yy, -0.17],
        [-0.75, yy + 0.09, -0.23], [0.75, yy + 0.09, -0.23], [0.75, yy + 0.09, -0.2], [-0.75, yy + 0.09, -0.2]]);
      for (const sx of [-1, 1]) {
        bar("black", [sx * 0.62, 0, 0.15], [sx * 0.62, 0.4, 0.12], 0.025);
        bar("black", [sx * 0.62, 0, -0.17], [sx * 0.62, 0.84, -0.24], 0.025);
        bar("black", [sx * 0.62, 0.38, 0.14], [sx * 0.62, 0.38, -0.2], 0.02);
      }
    });
  }
  bench(-3.4, -1.0, Math.PI / 2);
  bench(-2.9, 2.6, Math.PI / 2 + 0.5);

  // ---------- planters ----------
  function planter(x, z, len, yaw, flowers) {
    frame(x, D, z, yaw, () => {
      box("wall", -len / 2, len / 2, 0, 0.42, -0.22, 0.22);
      box("dark", -len / 2 + 0.05, len / 2 - 0.05, 0.42, 0.425, -0.17, 0.17);
      const n = Math.max(2, Math.round(len / 0.45));
      for (let i = 0; i < n; i++) {
        const u = -len / 2 + (len * (i + 0.5)) / n;
        ball("bush", u, 0.56, (i % 2 ? 0.03 : -0.03), 0.26, 0.2, 0.2, 8, 5);
        if (i % 2 === 0) ball("bush", u + 0.12, 0.74, 0, 0.15, 0.13, 0.14, 8, 4);
      }
      for (let i = 0; i < flowers; i++) {
        const u = -len / 2 + (len * (i + 0.5)) / flowers;
        ball(i % 3 === 1 ? "white" : i % 3 === 2 ? "amber" : "pink", u + 0.05, 0.78 + (i % 2) * 0.05, 0.12 * (i % 2 ? 1 : -1), 0.06, 0.05, 0.06, 6, 4);
      }
    });
  }
  planter(-4.6, IZ - 0.32, 2.4, 0, 7);
  planter(-1.0, IZ - 0.32, 1.6, 0, 5);
  planter(IX - 0.32, -1.3, 1.8, Math.PI / 2, 5);

  // ---------- balloons tied to the fence ----------
  {
    const list = [
      [3.0, ZD - PT / 2, "pink", 0.55, -0.15], [3.45, ZD - PT / 2, "amber", 0.75, 0.05], [3.85, ZD - PT / 2, "white", 0.5, 0.2],
      [XW - PT / 2, -0.6, "amber", 0.6, 0.15], [XW - PT / 2, -0.2, "pink", 0.8, -0.1],
    ];
    for (const [x, z, key, h, lean] of list) {
      const tie = [x, FT, z], onX = Math.abs(x) > XW - 0.5;
      const bx = x + (onX ? -0.12 : lean), bz = z + (onX ? lean : -0.12), byc = FT + h + 0.25;
      ball(key, bx, byc, bz, 0.21, 0.26, 0.21, 10, 7);
      cyl(key, [bx, byc - 0.25, bz], [bx, byc - 0.31, bz], 0.035, 6, 0.012); // knot
      bar("dark", tie, [bx, byc - 0.3, bz], 0.006);
    }
  }

  // ---------- strung lights ----------
  if (LIGHTS) {
    const PH = 4.6, px = IX - 0.15, pz = IZ - 0.15;
    // no pole on the near (+X, +Z) corner: it would split the three-quarter views down the middle
    const poles = { fm: [-0.2, pz], fr: [-px, pz], bm: [-0.2, -pz], br: [-px, -pz], lm: [px, 0.6], bl: [px, -pz] };
    for (const [x, z] of Object.values(poles)) {
      up("steel", x, z, D, PH, 0.05, 8);
      up("black", x, z, D, D + 0.12, 0.12, 8);
      ball("steel", x, PH + 0.05, z, 0.07, 0.07, 0.07, 6, 4);
    }
    function wire(a, b, sag) {
      const A = [a[0], PH - 0.05, a[1]], B = [b[0], PH - 0.05, b[1]], len = Math.hypot(B[0] - A[0], B[2] - A[2]);
      const at = (t) => [A[0] + (B[0] - A[0]) * t, A[1] - sag * 4 * t * (1 - t), A[2] + (B[2] - A[2]) * t];
      const segs = 14;
      for (let i = 0; i < segs; i++) bar("dark", at(i / segs), at((i + 1) / segs), 0.01);
      const nb = Math.round(len / 0.55);
      for (let i = 1; i < nb; i++) {
        const q = at(i / nb);
        ball("glow", q[0], q[1] - 0.08, q[2], 0.06, 0.075, 0.06, 5, 3);
      }
    }
    wire(poles.fr, poles.bm, 0.75); // an X over the -X half
    wire(poles.br, poles.fm, 0.75);
    wire(poles.fm, poles.lm, 0.7); // a V over the +X half, clear of the carousel roof
    wire(poles.bm, poles.lm, 0.7);
    wire(poles.bl, poles.lm, 0.5);
  }

  // ---------- meshes ----------
  const MAT = {
    deck: [c.deck, c.deck, 0.1, {}],
    wall: [c.wall, c.wallShade, 0.35, {}],
    pink: [c.pink, c.pinkShade, 0.2, { px: 3 }],
    white: [c.white, c.whiteShade, 0.2, { px: 3 }],
    amber: [c.amber, c.amberShade, 0.2, { px: 3 }],
    steel: [c.steel, c.steelShade, 0.1, { px: 2 }],
    black: [c.black, c.blackShade, 0.3, { px: 2 }],
    bush: [c.bush, c.bush, 0.1, { px: 2 }],
    dark: [c.dark, c.dark, 0.1, { outline: false }],
    net: [c.net, c.net, 0.1, { outline: false, doubleSided: true }],
    glow: [c.glow, c.glow, -0.25, { px: 2 }],
  };
  const movers = [];
  for (const [key, { p, n, o }] of Object.entries(soups)) {
    const [base, shade, threshold, op] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, base, shade, { threshold, ...op });
    mesh.name = key;
    body.add(mesh);
    if (o.some((k) => k >= 0)) {
      const idx = [];
      o.forEach((k, v) => k >= 0 && idx.push(v));
      const hn = g.attributes.hullNormal;
      movers.push({ g, idx, o, p: Float32Array.from(p), n: Float32Array.from(n), h: hn ? Float32Array.from(hn.array) : null });
      mesh.frustumCulled = false;
      mesh.traverse((ch) => (ch.frustumCulled = false));
    }
  }

  const k = opts.height ? opts.height / maxY : 1;
  body.scale.setScalar(k);

  // ---------- poses and the ride clip ----------
  // owner 0: turn by -phi about the carousel axis (makeRotationY(+phi) moves a point at angle theta to theta - phi;
  // the horses face that way); owners 1-4: the turn, then lift h_k on the pole; owner 5: panda bob dy and rock
  // (+pitch noses down) about the pedestal centre on the panda's own x axis.
  const MS = Array.from({ length: 6 }, () => new THREE.Matrix4());
  const NM = MS.map(() => new THREE.Matrix3());
  const tmp = new THREE.Matrix4(), tmp2 = new THREE.Matrix4(), q = new THREE.Vector3();
  const pAxis = new THREE.Vector3(Math.cos(PYAW), 0, -Math.sin(PYAW));
  function apply(phi, lifts, dy, pitch) {
    MS[0].makeTranslation(CX, 0, CZ).multiply(tmp.makeRotationY(phi)).multiply(tmp2.makeTranslation(-CX, 0, -CZ));
    for (let i = 0; i < 4; i++) MS[i + 1].copy(MS[0]).multiply(tmp.makeTranslation(0, lifts[i], 0));
    MS[5].makeTranslation(PX, D + 0.16 + dy, PZ).multiply(tmp.makeRotationAxis(pAxis, pitch)).multiply(tmp2.makeTranslation(-PX, -(D + 0.16), -PZ));
    MS.forEach((m, i) => NM[i].getNormalMatrix(m));
    for (const mv of movers) {
      const P3 = mv.g.attributes.position.array, N3 = mv.g.attributes.normal.array, H = mv.g.attributes.hullNormal?.array;
      for (const v of mv.idx) {
        const kk = mv.o[v], i = v * 3;
        q.fromArray(mv.p, i).applyMatrix4(MS[kk]).toArray(P3, i);
        q.fromArray(mv.n, i).applyMatrix3(NM[kk]).normalize().toArray(N3, i);
        if (H && mv.h) q.fromArray(mv.h, i).applyMatrix3(NM[kk]).normalize().toArray(H, i);
      }
      mv.g.attributes.position.needsUpdate = mv.g.attributes.normal.needsUpdate = true;
      if (H) mv.g.attributes.hullNormal.needsUpdate = true;
      mv.g.computeBoundingSphere(), mv.g.computeBoundingBox();
    }
    joints.carousel.rotation.y = phi;
    joints.panda.position.y = D + 0.66 + dy;
    root.updateMatrixWorld(true);
  }
  const CLIPS = { ride: 4 };
  function ride(t) {
    const u = ((t % 4) + 4) % 4;
    const phi = (Math.PI * u) / 4; // half a turn per loop
    const lifts = [0, 1, 2, 3].map((i) => 0.09 * Math.sin(Math.PI * u + i * Math.PI)); // 2 s period, neighbours opposite
    const dy = 0.025 * (0.5 - 0.5 * Math.cos(TAU * u)); // 1 s
    const pitch = 0.07 * Math.sin(TAU * u);
    apply(phi, lifts, dy, pitch);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`depato-rooftop: no clip "${m[1]}" (clips: ride)`);
      return ride(+m[2]);
    }
    if (name !== "rest") throw new Error(`depato-rooftop: unknown pose "${name}" (rest, or ride@<seconds>)`);
    apply(0, [0, 0, 0, 0], 0, 0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
