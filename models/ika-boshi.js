// ika-boshi.js - a fishing-village waterfront where squid are hung out to dry (ika-boshi) like laundry, real size.
// Contract: harness/lab/README.md. Metres, +Y up, the SEA side faces +Z, the harbour edge runs along X (its left is
// +X), stands on y = 0 (the sea floor under the water slab), centred on x = 0, z = 0 (the bbox).
//
// Construction (triangle soups merged per material, so the set is 12 meshes; closed parts wound from a point inside):
//   APRON    a concrete block 0.9 m above the sea floor with its harbour face square to +Z, a raised kerb along the
//            edge and three iron bollards. At the -X end a slipway ramp runs from the apron down under the water
//            (7 deg), with two wooden skid rails; the apron's cut side above the ramp is the slipway's step wall.
//   SQUID    three rows of rope lines on bamboo poles (three poles a row, lines sagging 5 cm a span), the squid hung
//            by the mantle tip like laundry: a flattened lens (rim, front crest, back crest per station) whose
//            outline is the dried-squid arrowhead (pointed tip, flared fins, notch, mantle, neck, head) and six arms
//            (four-sided cones flattened like the mantle, the outer two long tentacles) hanging below. Every squid is a copy of one
//            template in two meshes (mantle, arms) whose vertices pose() rewrites each frame: a lean away from the
//            sea, a swing and a twist per squid, with the arms bending further and lagging (clip "breeze").
//   BOAT     a small squid-fishing boat hauled bow-first up the slipway on wooden chocks: a two-side hull loft (20
//            stations x 6 rows, smooth normals from the loft derivatives) with a red boot and sheer stripe as material groups, a transom, a wood deck, a small
//            wheelhouse aft, a bow mast and a stern mast carrying the lamp wire with a row of big round bulbs (the
//            ika-tsuri lamps) on dark caps. Built in boat coordinates and baked through the ramp pitch into the soups.
//   SHED     a corrugated work shed at the back: a box with corrugation ribs (triangular prisms) on its front and
//            +X walls, a dark open door, and a mono-pitch roof slab with ribs running down the slope.
//   PROPS    stacked fish crates (with dark grip slots), a coil of rope (stacked tori), a buoy cluster (red and white
//            floats with dark eyelets) at the harbour edge.
//   SEA      a flat slab 0.3 m deep, a 2.1 m strip along the front, with lens-shaped ripple dashes (no ink) on it.
// Joints: one marker, `racks`, at the middle of the drying lines (lab close-ups: --focus racks).
// Proportions (real size; base unit the apron height A = 0.9 m above the sea floor, 0.6 m freeboard): footprint
// 12 x 8; lines 2.05 above the apron, rows 1.05 apart, 6 m long; squid 0.30 wide across the fins, 0.73 tip to
// tentacle (a large surume, slightly generous so the arrowhead survives the thumbnail); boat 5.4 long, 1.9 beam,
// lamp wire 2.1 above the sheer, bulbs 0.32 across; shed 5.2 x 2.0, eaves 2.3 / 2.8 above the apron; crates
// 0.6 x 0.4 x 0.26; buoys 0.34 across. Top at rest: the boat's bow mast.
// Two-tone pairs (meadow: sunny day, pale sky, red accents):
//   concrete moon #f7f3e1 / skin #f0c2ae; water iris #3f8a47 / hair #2c5131 (harbour green, so the strip reads
//   as sea against the pale apron and sky), ripples sky #d7ecef flat (no ink)
//   squid mantle sclera #f6f3ee / skin #f0c2ae (pale, pink in the shade); arms skin / accent #d9483b (low threshold)
//   shed walls, bollards, masts iris #3f8a47 / hair #2c5131; roof and rope coil line #a9d16e / iris
//   bamboo poles, crates, chocks, skids, deck practical #f2c94c / skin; hull and white buoys sclera / sky
//   red boot, sheer stripe, red buoys accent / skin; lamp bulbs practical / sclera (glow threshold)
//   lines, wire, windows, door, slots, caps ink #1c261b flat.
// Options: build(THREE, kit, colors, { height, squid })
//   height  uniform scale; the top of the rest pose (default meta.height).
//   squid   how many squid hang on the three lines (12..60, default 36).
// Clip (build() returns clips { breeze: 2 }; pose("breeze@0.5")): the squid sway in a sea breeze, one 2 s loop.

export const meta = {
  name: "ika-boshi",
  height: 4.47,
  script: "meadow",
  colors: {
    concrete: "#f7f3e1", concreteShade: "#f0c2ae",
    water: "#3f8a47", waterShade: "#2c5131", ripple: "#d7ecef",
    squid: "#f6f3ee", squidShade: "#f0c2ae",
    arms: "#f0c2ae", armsShade: "#d9483b",
    green: "#3f8a47", greenShade: "#2c5131",
    lime: "#a9d16e", limeShade: "#3f8a47",
    wood: "#f2c94c", woodShade: "#f0c2ae",
    hull: "#f6f3ee", hullShade: "#d7ecef",
    red: "#d9483b", redShade: "#f0c2ae",
    bulb: "#f2c94c", bulbShade: "#f6f3ee",
    dark: "#1c261b",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const height = opts.height ?? meta.height;
  const NSQ = Math.max(12, Math.min(60, Math.round(opts.squid ?? 36)));
  const root = new THREE.Group();
  root.name = "ika-boshi";
  const body = new THREE.Group();
  body.name = "body";
  root.add(body);
  const joints = {};
  const TAU = Math.PI * 2;

  // ---------- vectors and triangle soups ----------
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const soups = {};
  let XF = null, XR = null; // optional bake transform (point, direction) for parts built in their own frame
  // one triangle, wound so its normal points along `out`; na/nb/ne optional smooth normals
  function put(S, a, b, e, out, na, nb, ne) {
    if (XF) [a, b, e, out] = [XF(a), XF(b), XF(e), XR(out)], na && ([na, nb, ne] = [XR(na), XR(nb), XR(ne)]);
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-9) return;
    if (dot(n, out) < 0) [b, e, nb, ne, n] = [e, b, ne, nb, mul(n, -1)];
    const f = nrm(n);
    S.p.push(...a, ...b, ...e);
    S.n.push(...(na || f), ...(nb || f), ...(ne || f));
  }
  const soup = (key) => (soups[key] ??= { p: [], n: [] });
  const cen = (...q) => mul(q.reduce(add), 1 / q.length);
  const tri = (key, a, b, e, ref) => put(soup(key), a, b, e, sub(cen(a, b, e), ref));
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  const quadD = (key, a, b, e, d, out) => (put(soup(key), a, b, e, out), put(soup(key), a, e, d, out));
  function hex(key, p) {
    const ref = cen(...p);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, x0, x1, y0, y1, z0, z1) {
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  const boxC = (key, cx, cy, cz, sx, sy, sz) => box(key, cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2);
  // a closed n-sided prism from a to b (radius r0 at a, r1 at b), flat caps
  function cyl(key, a, b, r0, r1 = r0, n = 6, caps = true) {
    const d = nrm(sub(b, a));
    const u = nrm(cross(Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], d)), v = cross(d, u);
    const ring = (o, r) => Array.from({ length: n }, (_, i) => add(o, add(mul(u, r * Math.cos((i / n) * TAU)), mul(v, r * Math.sin((i / n) * TAU)))));
    const A = ring(a, r0), B = ring(b, r1), ref = cen(a, b);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      quad(key, A[i], A[j], B[j], B[i], ref);
      if (caps) tri(key, a, A[i], A[j], ref), tri(key, b, B[i], B[j], ref);
    }
  }
  // a smooth sphere (or ellipsoid, s = [sx, sy, sz] radii)
  function sphere(key, o, s, nu = 8, nv = 6) {
    const P = (i, j) => { const th = (i / nu) * TAU, ph = (j / nv) * Math.PI; return [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)]; };
    const at = (q) => [o[0] + q[0] * s[0], o[1] + q[1] * s[1], o[2] + q[2] * s[2]];
    const nn = (q) => nrm([q[0] / s[0], q[1] / s[1], q[2] / s[2]]);
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const q = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)];
      const out = nn(cen(...q));
      const S = soup(key);
      put(S, at(q[0]), at(q[1]), at(q[2]), out, nn(q[0]), nn(q[1]), nn(q[2]));
      put(S, at(q[0]), at(q[2]), at(q[3]), out, nn(q[0]), nn(q[2]), nn(q[3]));
    }
  }
  // a smooth torus around +Y
  function torus(key, o, R, r, nu = 18, nv = 5) {
    const P = (i, j) => { const a = (i / nu) * TAU, b = (j / nv) * TAU, ca = Math.cos(a), sa = Math.sin(a);
      return { p: [o[0] + (R + r * Math.cos(b)) * ca, o[1] + r * Math.sin(b), o[2] + (R + r * Math.cos(b)) * sa], n: [Math.cos(b) * ca, Math.sin(b), Math.cos(b) * sa] }; };
    const S = soup(key);
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const q = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)];
      const out = nrm(cen(q[0].n, q[1].n, q[2].n, q[3].n));
      put(S, q[0].p, q[1].p, q[2].p, out, q[0].n, q[1].n, q[2].n);
      put(S, q[0].p, q[2].p, q[3].p, out, q[0].n, q[2].n, q[3].n);
    }
  }
  // a thin 4-sided tube through points (lines, wires)
  function tube(key, pts, r) {
    for (let i = 0; i + 1 < pts.length; i++) cyl(key, pts[i], pts[i + 1], r, r, 4, false); // ends hide in poles and masts
  }

  // ---------- layout ----------
  const AY = 0.9; // apron top
  const WY = 0.3; // sea surface
  const EZ = 1.9; // harbour edge
  const SX0 = -6, SX1 = -2.6; // slipway
  const RZ0 = -2.5, RZ1 = 4; // ramp from the apron (z0) down to under the water (z1)
  const rampY = (z) => AY - 0.8 * (z - RZ0) / (RZ1 - RZ0);
  const PITCH = Math.atan(0.8 / (RZ1 - RZ0));

  // ---------- apron, harbour edge, slipway ----------
  box("concrete", SX1, 6, 0, AY, -4, EZ);
  box("concrete", SX0, SX1, 0, AY, -4, RZ0);
  hex("concrete", [
    [SX0, 0, RZ0], [SX1, 0, RZ0], [SX1, 0, RZ1], [SX0, 0, RZ1],
    [SX0, AY, RZ0], [SX1, AY, RZ0], [SX1, rampY(RZ1), RZ1], [SX0, rampY(RZ1), RZ1],
  ]);
  box("concrete", SX1, 6, AY, AY + 0.1, EZ - 0.22, EZ); // kerb
  // dark joints across the apron and down the harbour face
  for (const x of [0.4, 3.4]) {
    quadD("dark", [x - 0.02, AY + 0.002, -4], [x + 0.02, AY + 0.002, -4], [x + 0.02, AY + 0.002, EZ - 0.22], [x - 0.02, AY + 0.002, EZ - 0.22], [0, 1, 0]);
    quadD("dark", [x - 0.02, WY, EZ + 0.004], [x + 0.02, WY, EZ + 0.004], [x + 0.02, AY + 0.1, EZ + 0.004], [x - 0.02, AY + 0.1, EZ + 0.004], [0, 0, 1]);
  }
  // slipway skid rails (wood) down the ramp
  for (const x of [-4.3 - 0.55, -4.3 + 0.55]) {
    const z0 = RZ0 + 0.2, z1 = 3.0, t = 0.06;
    hex("wood", [
      [x - 0.08, rampY(z0) - 0.02, z0], [x + 0.08, rampY(z0) - 0.02, z0], [x + 0.08, rampY(z1) - 0.02, z1], [x - 0.08, rampY(z1) - 0.02, z1],
      [x - 0.08, rampY(z0) + t, z0], [x + 0.08, rampY(z0) + t, z0], [x + 0.08, rampY(z1) + t, z1], [x - 0.08, rampY(z1) + t, z1],
    ]);
  }
  // bollards on the edge
  for (const x of [-1.2, 1.4, 4.0]) {
    const z = EZ - 0.45;
    cyl("green", [x, AY, z], [x, AY + 0.05, z], 0.22, 0.22, 8);
    cyl("green", [x, AY + 0.05, z], [x, AY + 0.38, z], 0.13, 0.12, 8);
    cyl("green", [x, AY + 0.38, z], [x, AY + 0.46, z], 0.19, 0.17, 8);
  }

  // ---------- sea ----------
  box("water", -6, 6, 0, WY, EZ, 4);
  const RIP = [];
  for (let k = 0; k < 14; k++) {
    const x = -5.6 + k * 0.85 + 0.25 * Math.sin(k * 2.3), z = 2.25 + 1.5 * (0.5 + 0.5 * Math.sin(k * 1.9 + 0.4)), len = 0.7 + 0.3 * Math.sin(k * 1.3);
    if (x > SX0 && x < SX1 + 0.2 && z < 3.0) continue;
    RIP.push([x, z, len]);
  }
  for (const [x, z, len] of RIP) {
    const n = 4, w = 0.045;
    for (let j = 0; j < n; j++) {
      const u0 = j / n, u1 = (j + 1) / n, h = (u) => w * Math.sin(Math.PI * u);
      const xa = x + len * u0, xb = x + len * u1, y = WY + 0.004;
      quadD("ripple", [xa, y, z + h(u0)], [xb, y, z + h(u1)], [xb, y, z - h(u1)], [xa, y, z - h(u0)], [0, 1, 0]);
    }
  }

  // ---------- drying racks: bamboo poles and rope lines ----------
  const LX0 = -1.9, LX1 = 4.1, LXM = (LX0 + LX1) / 2, LY = AY + 2.05, SAG = 0.05;
  const ROWS = [-1.45, -0.4, 0.65];
  const lineY = (x) => { const [a, b] = x < LXM ? [LX0, LXM] : [LXM, LX1]; const f = (x - a) / (b - a); return LY - SAG * 4 * f * (1 - f); };
  for (const z of ROWS) {
    for (const x of [LX0, LXM, LX1]) {
      cyl("wood", [x, AY, z], [x, LY + 0.14, z], 0.04, 0.034, 6);
      for (const k of [0.45, 1.25]) boxC("dark", x, AY + k, z, 0.09, 0.025, 0.09); // bamboo nodes
    }
    const pts = [];
    for (let i = 0; i <= 12; i++) { const x = LX0 + (i / 12) * (LX1 - LX0); pts.push([x, lineY(x), z]); }
    tube("dark", pts, 0.012);
  }
  // hang points: squid spread over the three rows, two spans a row, clear of the poles
  const HANG = [];
  {
    const per = [0, 1, 2].map((r) => Math.floor(NSQ / 3) + (r < NSQ % 3 ? 1 : 0));
    per.forEach((n, r) => {
      const nA = Math.ceil(n / 2), nB = n - nA;
      [[LX0, LXM, nA], [LXM, LX1, nB]].forEach(([a, b, m], s) => {
        for (let i = 0; i < m; i++) {
          const x = a + 0.22 + ((i + 0.5) / m) * (b - a - 0.44) + (r === 1 ? 0.12 : 0) * (s ? -1 : 1);
          HANG.push([x, lineY(x) - 0.012, ROWS[r]]);
        }
      });
    });
  }

  // ---------- squid template (hang point at the origin, hanging down -Y, flat face to +Z) ----------
  // stations: depth below the tip, half-width (rim), half-thickness (crest)
  const ST = [
    [0.0, 0.0, 0.0], [0.035, 0.075, 0.008], [0.1, 0.15, 0.012], [0.135, 0.075, 0.016], [0.23, 0.092, 0.02],
    [0.32, 0.086, 0.02], [0.36, 0.056, 0.016], [0.405, 0.074, 0.018], [0.445, 0.05, 0.014],
  ];
  function lens(S, stations, xOff, ring, cap = true) {
    const R = stations.map(([d, w, t], i) => ring(d, w, t, i));
    for (let i = 0; i + 1 < R.length; i++) {
      const ref = [xOff(i), -(stations[i][0] + stations[i + 1][0]) / 2, 0];
      for (let k = 0; k < 4; k++) {
        const k1 = (k + 1) % 4, a = R[i][k], b = R[i][k1], e = R[i + 1][k1], d = R[i + 1][k];
        put(S, a, b, e, sub(cen(a, b, e), ref)), put(S, a, e, d, sub(cen(a, e, d), ref));
      }
    }
    const L = R[R.length - 1];
    if (cap) put(S, L[0], L[1], L[2], [0, -1, 0]), put(S, L[0], L[2], L[3], [0, -1, 0]);
  }
  const mantleT = { p: [], n: [] }, armsT = { p: [], n: [] };
  lens(mantleT, ST, () => 0, (d, w, t) => [[-w, -d, 0], [0, -d, t], [w, -d, 0], [0, -d, -t]]);
  const ARMS = [[-0.04, 0.3, -1.6], [-0.024, 0.2, -1], [-0.008, 0.24, -0.4], [0.008, 0.22, 0.4], [0.024, 0.19, 1], [0.04, 0.29, 1.6]];
  for (const [x0, len, spread] of ARMS) {
    const d0 = 0.425, xs = (f) => x0 + spread * 0.02 * f + 0.006 * Math.sin(f * 3 + x0 * 90);
    const stA = [[d0, 0.013, 0.009], [d0 + len, 0, 0]];
    lens(armsT, stA, (i) => xs(i + 0.5), (d, w, t, i) => { const x = xs(i); return [[x - w, -d, 0], [x, -d, t], [x + w, -d, 0], [x, -d, -t]]; }, false);
  }
  const SQ = 1.15; // a large surume: 0.35 across the fins, 0.84 tip to tentacle
  for (const T of [mantleT, armsT]) T.p = T.p.map((v) => v * SQ);
  // hull normals: per-position average of the template normals (closed lens: rims average in plane)
  function hullOf(T) {
    const map = new Map(), h = new Float32Array(T.n.length);
    for (let i = 0; i < T.p.length; i += 3) {
      const k = `${Math.round(T.p[i] * 1e5)},${Math.round(T.p[i + 1] * 1e5)},${Math.round(T.p[i + 2] * 1e5)}`;
      const s = map.get(k) || [0, 0, 0];
      s[0] += T.n[i], s[1] += T.n[i + 1], s[2] += T.n[i + 2];
      map.set(k, s);
    }
    for (let i = 0; i < T.p.length; i += 3) {
      const k = `${Math.round(T.p[i] * 1e5)},${Math.round(T.p[i + 1] * 1e5)},${Math.round(T.p[i + 2] * 1e5)}`;
      const v = nrm(map.get(k));
      h[i] = v[0], h[i + 1] = v[1], h[i + 2] = v[2];
    }
    return h;
  }

  // ---------- work shed (corrugated) ----------
  const HX0 = 0.6, HX1 = 5.8, HZ0 = -4, HZ1 = -2.0, HF = AY + 2.3, HB = AY + 2.8;
  hex("green", [
    [HX0, AY, HZ0], [HX1, AY, HZ0], [HX1, AY, HZ1], [HX0, AY, HZ1],
    [HX0, HB, HZ0], [HX1, HB, HZ0], [HX1, HF, HZ1], [HX0, HF, HZ1],
  ]);
  // corrugation ribs: triangular prisms on a wall, running along `along`, spaced across
  const RIB = 0.16, RH = 0.03;
  for (let x = HX0 + RIB / 2; x < HX1; x += RIB) {
    const z = HZ1, y1 = HF - 0.02, a = [x - RIB / 2, AY, z], b = [x + RIB / 2, AY, z], t0 = [x, AY, z + RH];
    const a1 = [x - RIB / 2, y1, z], b1 = [x + RIB / 2, y1, z], t1 = [x, y1, z + RH];
    const ref = [x, (AY + y1) / 2, z - 0.05];
    quad("green", a, t0, t1, a1, ref), quad("green", t0, b, b1, t1, ref);
    tri("green", a, t0, b, ref), tri("green", a1, t1, b1, ref);
  }
  for (let z = HZ0 + RIB / 2; z < HZ1; z += RIB) {
    const x = HX1, f = (z - HZ0) / (HZ1 - HZ0), y1 = HB + (HF - HB) * f - 0.03;
    const a = [x, AY, z - RIB / 2], b = [x, AY, z + RIB / 2], t0 = [x + RH, AY, z];
    const a1 = [x, y1, z - RIB / 2], b1 = [x, y1, z + RIB / 2], t1 = [x + RH, y1, z];
    const ref = [x - 0.05, (AY + y1) / 2, z];
    quad("green", a, t0, t1, a1, ref), quad("green", t0, b, b1, t1, ref);
    tri("green", a, t0, b, ref), tri("green", a1, t1, b1, ref);
  }
  // open sliding door (dark) and a small window on the front wall
  quadD("dark", [2.3, AY, HZ1 + RH + 0.004], [3.9, AY, HZ1 + RH + 0.004], [3.9, AY + 1.95, HZ1 + RH + 0.004], [2.3, AY + 1.95, HZ1 + RH + 0.004], [0, 0, 1]);
  quadD("dark", [4.6, AY + 1.2, HZ1 + RH + 0.004], [5.4, AY + 1.2, HZ1 + RH + 0.004], [5.4, AY + 1.75, HZ1 + RH + 0.004], [4.6, AY + 1.75, HZ1 + RH + 0.004], [0, 0, 1]);
  // roof: a thin slab with eaves, ribs running down the slope (-Z high, +Z low)
  {
    const o = 0.3, x0 = HX0 - o, x1 = HX1 + o, z0 = HZ0 - o, z1 = HZ1 + o, s = (HF - HB) / (HZ1 - HZ0);
    const ry = (z) => HB + s * (z - HZ0) + 0.02;
    const T = 0.06;
    hex("lime", [[x0, ry(z0), z0], [x1, ry(z0), z0], [x1, ry(z1), z1], [x0, ry(z1), z1], [x0, ry(z0) + T, z0], [x1, ry(z0) + T, z0], [x1, ry(z1) + T, z1], [x0, ry(z1) + T, z1]]);
    const RR = 0.2, RRH = 0.045;
    for (let x = x0 + RR / 2; x < x1; x += RR) {
      const A = (zz) => [x - RR / 2, ry(zz) + T, zz], B = (zz) => [x + RR / 2, ry(zz) + T, zz], P = (zz) => [x, ry(zz) + T + RRH, zz];
      const ref = [x, ry((z0 + z1) / 2), (z0 + z1) / 2];
      quad("lime", A(z0), P(z0), P(z1), A(z1), ref), quad("lime", P(z0), B(z0), B(z1), P(z1), ref);
      tri("lime", A(z0), P(z0), B(z0), ref), tri("lime", A(z1), P(z1), B(z1), ref);
    }
  }

  // ---------- props: crates, rope coil, buoys ----------
  function crate(x, y, z, rot = 0) {
    const w = 0.6, d = 0.4, h = 0.26, cs = Math.cos(rot), sn = Math.sin(rot);
    const P = (u, v, ww) => [x + u * cs + ww * sn, y + v, z - u * sn + ww * cs];
    hex("wood", [P(-w / 2, 0, -d / 2), P(w / 2, 0, -d / 2), P(w / 2, 0, d / 2), P(-w / 2, 0, d / 2), P(-w / 2, h, -d / 2), P(w / 2, h, -d / 2), P(w / 2, h, d / 2), P(-w / 2, h, d / 2)]);
    // grip slots on the long faces (+/- d) and the ends, rim band line
    for (const sgn of [1, -1]) {
      const o = sgn * (d / 2 + 0.004);
      quadD("dark", P(-0.09, h - 0.09, o), P(0.09, h - 0.09, o), P(0.09, h - 0.05, o), P(-0.09, h - 0.05, o), [sn * sgn, 0, cs * sgn]);
      const e = sgn * (w / 2 + 0.004);
      const Q = (ww, v) => P(e, v, ww);
      quadD("dark", Q(-0.07, h - 0.09), Q(0.07, h - 0.09), Q(0.07, h - 0.05), Q(-0.07, h - 0.05), [cs * sgn, 0, -sn * sgn]);
    }
  }
  const CX = 5.3, CZ = 0.0;
  crate(CX, AY, CZ - 0.42), crate(CX, AY, CZ), crate(CX, AY, CZ + 0.42);
  crate(CX, AY + 0.26, CZ - 0.21), crate(CX, AY + 0.26, CZ + 0.21, 0.04);
  crate(CX + 0.02, AY + 0.52, CZ, -0.06);
  crate(4.6, AY, 0.75, 0.5);
  for (let k = 0; k < 4; k++) torus("lime", [5.1, AY + 0.045 + k * 0.08, -1.3], 0.34 - k * 0.035, 0.045, 18, 5);
  const BUOYS = [[4.9, 0, 1.3, "red"], [5.28, 0, 1.22, "hull"], [5.62, 0, 1.3, "red"], [5.1, 0, 0.95, "red"], [5.45, 0, 0.92, "hull"], [5.12, 1, 1.15, "red"], [5.42, 1, 1.12, "red"]];
  for (const [x, lvl, z, key] of BUOYS) {
    const r = 0.17, y = AY + r + lvl * 0.26;
    sphere(key, [x, y, z], [r, r * 0.95, r], 10, 6);
    cyl("dark", [x, y + r * 0.9, z], [x, y + r * 1.25, z], 0.035, 0.03, 5);
  }

  // ---------- boat (boat frame: keel bottom y = 0, bow toward -Z, centred on x = 0, z = 0) ----------
  const BL = 5.4, BB = 1.9;
  const BZc = 0.6, BXc = -4.3, BY = rampY(BZc) + 0.16;
  {
    const cp = Math.cos(PITCH), sp = Math.sin(PITCH);
    XR = (v) => [v[0], v[1] * cp - v[2] * sp, v[1] * sp + v[2] * cp];
    XF = (p) => { const r = XR(p); return [r[0] + BXc, r[1] + BY, r[2] + BZc]; };
  }
  const NS = 20, NR = 6;
  const zAt = (u) => BL / 2 - u * BL; // u 0 stern -> 1 bow
  const halfB = (u) => (u < 0.55 ? (BB / 2) * (0.84 + 0.16 * Math.sin((u / 0.55) * Math.PI / 2)) : (BB / 2) * Math.sqrt(Math.max(0, 1 - ((u - 0.55) / 0.45) ** 2)));
  const sheer = (u) => 1.05 + 0.4 * u * u;
  const keel = (u) => (u < 0.7 ? 0.04 * (1 - u / 0.7) : 0.62 * ((u - 0.7) / 0.3) ** 2);
  const sec = (u, r, sgn) => {
    const k = keel(u), s = sheer(u), b = halfB(u);
    return [sgn * b * Math.pow(Math.sin((r * Math.PI) / 2), 0.55), k + (s - k) * r, zAt(u)];
  };
  // smooth hull normal from the loft's partial derivatives, turned outboard
  const hn = (u, r, sgn) => {
    const e = 1e-3, uu = Math.min(1 - e, Math.max(e, u)), rr = Math.min(1 - e, Math.max(e, r));
    const du = sub(sec(uu + e, rr, sgn), sec(uu - e, rr, sgn)), dr = sub(sec(uu, rr + e, sgn), sec(uu, rr - e, sgn));
    const n = nrm(cross(du, dr));
    return n[0] * sgn < 0 ? mul(n, -1) : n;
  };
  for (let i = 0; i < NS; i++) {
    const u0 = i / NS, u1 = (i + 1) / NS;
    for (let j = 0; j < NR; j++) {
      const r0 = j / NR, r1 = (j + 1) / NR;
      const key = j < 2 || j === NR - 1 ? "red" : "hull";
      for (const sgn of [1, -1]) {
        const a = sec(u0, r0, sgn), b = sec(u1, r0, sgn), e = sec(u1, r1, sgn), d = sec(u0, r1, sgn);
        const na = hn(u0, r0, sgn), nb = hn(u1, r0, sgn), ne = hn(u1, r1, sgn), nd = hn(u0, r1, sgn);
        const S = soup(key), out = nrm(add(add(na, nb), add(ne, nd)));
        put(S, a, b, e, out, na, nb, ne), put(S, a, e, d, out, na, ne, nd);
      }
    }
  }
  // transom (stern, +Z) and deck
  {
    const ring = [];
    for (let j = 0; j <= NR; j++) ring.push(sec(0, j / NR, 1));
    for (let j = NR; j >= 0; j--) ring.push(sec(0, j / NR, -1));
    const ctr = [0, 0.55, BL / 2];
    for (let k = 0; k + 1 < ring.length; k++) put(soup(k < 2 || k >= ring.length - 3 ? "red" : "hull"), ctr, ring[k], ring[k + 1], [0, 0, 1]);
    for (let i = 0; i < NS; i++) {
      const u0 = i / NS, u1 = (i + 1) / NS, dl = 0.12;
      const P = (u, sgn) => { const q = sec(u, 1, sgn); return [q[0] * 0.94, q[1] - dl, q[2]]; };
      quadD("wood", P(u0, -1), P(u0, 1), P(u1, 1), P(u1, -1), [0, 1, 0]);
    }
  }
  const deckY = (u) => sheer(u) - 0.12;
  // wheelhouse aft
  {
    const z0 = zAt(0.3), z1 = zAt(0.12), y0 = deckY(0.2), y1 = y0 + 1.15, w = 0.58;
    box("hull", -w, w, y0 - 0.05, y1, z0, z1);
    box("green", -w - 0.08, w + 0.08, y1, y1 + 0.08, z0 - 0.12, z1 + 0.08);
    quadD("dark", [-w + 0.08, y0 + 0.62, z0 - 0.004], [w - 0.08, y0 + 0.62, z0 - 0.004], [w - 0.08, y0 + 0.98, z0 - 0.004], [-w + 0.08, y0 + 0.98, z0 - 0.004], [0, 0, -1]);
    for (const sgn of [1, -1]) {
      const x = sgn * (w + 0.004);
      quadD("dark", [x, y0 + 0.62, z0 + 0.12], [x, y0 + 0.62, z0 + 0.55], [x, y0 + 0.98, z0 + 0.55], [x, y0 + 0.98, z0 + 0.12], [sgn, 0, 0]);
    }
  }
  // masts and the lamp wire with its bulbs
  const MAST_B = 0.86, MAST_S = 0.2, WIRE = 2.1;
  const mastTop = (u) => [0, deckY(u) + WIRE + 0.25, zAt(u)];
  for (const u of [MAST_B, MAST_S]) cyl("green", [0, deckY(u), zAt(u)], mastTop(u), 0.05, 0.04, 6);
  {
    const a = [0, deckY(MAST_S) + WIRE + 0.12, zAt(MAST_S)], b = [0, deckY(MAST_B) + WIRE + 0.12, zAt(MAST_B)];
    const pts = [];
    for (let i = 0; i <= 8; i++) { const f = i / 8; const p = add(a, mul(sub(b, a), f)); p[1] -= 0.08 * 4 * f * (1 - f); pts.push(p); }
    tube("dark", pts, 0.012);
    const NB = 8;
    for (let k = 0; k < NB; k++) {
      const f = (k + 0.5) / NB * 0.86 + 0.07;
      const w = add(a, mul(sub(b, a), f)); w[1] -= 0.08 * 4 * f * (1 - f);
      cyl("dark", w, add(w, [0, -0.12, 0]), 0.012, 0.012, 4);
      cyl("dark", add(w, [0, -0.1, 0]), add(w, [0, -0.17, 0]), 0.06, 0.09, 6);
      sphere("bulb", add(w, [0, -0.33, 0]), [0.16, 0.17, 0.16], 10, 6);
    }
  }
  // keel chocks (wood), set in the boat frame so they sit under the keel
  for (const u of [0.15, 0.45, 0.7]) {
    const z = zAt(u), k = keel(u);
    box("wood", -0.3, 0.3, -0.2, k + 0.02, z - 0.18, z + 0.18);
  }
  XF = XR = null;

  // ---------- meshes, one per material ----------
  const MAT = {
    concrete: [c.concrete, c.concreteShade, { threshold: 0.35, px: 4 }],
    water: [c.water, c.waterShade, { threshold: 0.3, px: 3 }],
    ripple: [c.ripple, c.ripple, { outline: false }],
    green: [c.green, c.greenShade, { threshold: 0.3, px: 3 }],
    lime: [c.lime, c.limeShade, { threshold: 0.25, px: 3 }],
    wood: [c.wood, c.woodShade, { threshold: 0.25, px: 2.5 }],
    hull: [c.hull, c.hullShade, { threshold: 0.12, px: 3 }],
    red: [c.red, c.redShade, { threshold: 0.0, px: 3 }],
    bulb: [c.bulb, c.bulbShade, { threshold: -0.25, px: 2.5 }],
    dark: [c.dark, c.dark, { outline: false }],
  };
  for (const [key, s] of Object.entries(soups)) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    const [base, shade, o] = MAT[key];
    const mesh = kit.toon(g, base, shade, o);
    mesh.name = key;
    body.add(mesh);
  }
  // swaying squid: N copies of a template, rewritten per frame
  function swinger(T, name, base, shade, o) {
    const nv = T.p.length / 3, H = hullOf(T), N = HANG.length;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(nv * 3 * N), 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(new Float32Array(nv * 3 * N), 3));
    g.setAttribute("hullNormal", new THREE.Float32BufferAttribute(new Float32Array(nv * 3 * N), 3));
    const mesh = kit.toon(g, base, shade, o);
    mesh.name = name;
    mesh.frustumCulled = false;
    body.add(mesh);
    return { g, T, H, nv };
  }
  const SW = [
    swinger(mantleT, "squid", c.squid, c.squidShade, { threshold: 0.3, px: 2.5 }),
    swinger(armsT, "arms", c.arms, c.armsShade, { threshold: -0.15, px: 2 }),
  ];
  // breeze: per squid a lean away from the sea (+ swings the bottom to -Z), a swing and a twist about the line
  // point; below the head (d > 0.42) the arms bend further and lag. All terms loop in CLIP_T.
  const CLIP_T = 2;
  function sway(t) {
    const w = TAU * (t / CLIP_T);
    for (const { g, T, H, nv } of SW) {
      const P = g.attributes.position.array, Nn = g.attributes.normal.array, Hh = g.attributes.hullNormal.array;
      HANG.forEach(([hx, hy, hz], s) => {
        const ph = s * 2.399 + hz * 1.7, amp = 1 + 0.35 * Math.sin(s * 1.37);
        const lean = 0.07 + amp * (0.07 * Math.sin(w + ph) + 0.025 * Math.sin(2 * w + ph * 1.3));
        const tw = amp * 0.28 * Math.sin(w + ph * 0.7 + 1.1);
        const lag = amp * 0.22 * Math.sin(w + ph - 1.0);
        const roll = 0.04 * Math.sin(w + ph * 1.9);
        const cT = Math.cos(tw), sT = Math.sin(tw), cR = Math.cos(roll), sR = Math.sin(roll);
        const o = s * nv * 3;
        for (let i = 0; i < nv * 3; i += 3) {
          const d = -T.p[i + 1] / SQ, bend = d > 0.42 ? ((d - 0.42) / 0.3) : 0;
          const th = lean + bend * lag, cA = Math.cos(th), sA = Math.sin(th);
          // twist about Y, roll about Z, then swing about X
          const rot = (x, y, z) => {
            let x1 = x * cT + z * sT, z1 = -x * sT + z * cT;
            let x2 = x1 * cR - y * sR, y2 = x1 * sR + y * cR;
            return [x2, y2 * cA - z1 * sA, y2 * sA + z1 * cA];
          };
          const p = rot(T.p[i], T.p[i + 1], T.p[i + 2]);
          P[o + i] = p[0] + hx, P[o + i + 1] = p[1] + hy, P[o + i + 2] = p[2] + hz;
          const n = rot(T.n[i], T.n[i + 1], T.n[i + 2]);
          Nn[o + i] = n[0], Nn[o + i + 1] = n[1], Nn[o + i + 2] = n[2];
          const h = rot(H[i], H[i + 1], H[i + 2]);
          Hh[o + i] = h[0], Hh[o + i + 1] = h[1], Hh[o + i + 2] = h[2];
        }
      });
      g.attributes.position.needsUpdate = g.attributes.normal.needsUpdate = g.attributes.hullNormal.needsUpdate = true;
      g.computeBoundingSphere();
      g.computeBoundingBox();
    }
  }
  sway(0);
  // a marker at the middle of the racks (lab close-ups: --focus racks)
  const racks = new THREE.Object3D();
  racks.name = "racks";
  racks.position.set((LX0 + LX1) / 2, LY - 0.4, ROWS[1]);
  body.add(racks);
  joints.racks = racks;
  body.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(body);
  const sc = height / meta.height;
  root.userData.naturalTop = bb.max.y;
  body.scale.setScalar(sc);
  body.position.set((-(bb.min.x + bb.max.x) / 2) * sc, 0, (-(bb.min.z + bb.max.z) / 2) * sc);

  // ---------- pose and clip ----------
  const CLIPS = { breeze: CLIP_T };
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`ika-boshi: no clip "${m[1]}" (clips: breeze)`);
      sway(+m[2]);
    } else if (name === "rest") sway(0);
    else throw new Error(`ika-boshi: unknown pose "${name}" (rest, or breeze@<seconds>)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
