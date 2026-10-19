// under-bridge.js - the shaded spot under a concrete road bridge by a river (anime hangout and confession spot).
// Contract: harness/lab/README.md. Meters, +Y up, the river side faces +Z, its left is +X (the sun side), stands on
// y = 0, centred on x = 0, z = 0. The bridge deck runs along Z (from the levee top at -Z out over the river at +Z);
// the river flows along X.
//
// Construction (closed solids and lifted decals, triangle soups merged per material, flat-shaded; 14 meshes):
//   GROUND   the embankment profile in (z, y) extruded across X as convex prisms down to y = 0: levee top 3.2 m, a
//            29 deg grass slope, a flat foot at 0.4 m with the gravel path along X, then a concrete revetment lip down
//            to the water (an opaque slab, top 0.1 m). The ground is cut square at x = +-8 and z = -7 (a diorama).
//   BRIDGE   a deck slab (6.5 m wide, 0.3 m) on four concrete girders (0.8 m deep), a curb on each edge with a steel
//            railing (posts every 1.4 m, a top and a mid rail), resting on an abutment block at the levee top and on a
//            pier cap carried by two thick octagonal columns standing on the flat foot. The deck is a cut section at
//            z = +-7: its +Z end shows the girder profile.
//   SHADE    the deck's shadow as a lifted ground decal: x in [-3.3 - k (5.6 - yg), 3.3 - k (4.5 - yg)] with k = 0.35
//            (the sun is +X, cheated steeper than the film light so the patch stays under the deck), on grass, path
//            and water; beyond its -X edge the railing's shadow (top and mid rail stripes, post bars) with sun
//            patches between them. Grass in shade is hair, the path and the water in shade are iris.
//   PROPS    a mamachari (step-through frame, front basket) leaning on the +X column's river face, in the sun; low
//            jittered stones by the path and the river; tall grass tufts (2-segment closed blades) along the river
//            lip, the path edges and the slope, each tuft in the shade material set when its root is in the shadow.
// Proportions (real size; base unit the clearance 4.1 m from the flat foot to the girders' underside): deck top 5.6,
// railing top 6.6 (meta.height), columns 1.1 m across at x = +-2.0, z = 1.6; path 1.4 m wide at the slope foot;
// river from z = 3.5; bike 1.75 m long, wheels 0.66 m; tufts 0.45-1.0 m.
// Options: build(THREE, kit, colors, { height }) scales the whole set uniformly so the railing top is `height`.
// Clip: breeze 4 s (loop) - vertex rewrite of two meshes per frame: the tufts sway along X in a travelling gust
//   (two sways per loop, tip amplitude ~0.2 x blade height), and the water ripples (moon slivers) drift +X with the
//   current, each 1.6 m across its own cell, growing and fading so the loop has no pop.
// Colours (meadow, the field greens and the pale sky water): concrete moon #f7f3e1 / sky #d7ecef at 0.1 (river faces
//   stay lit, -X faces and the deck underside go cool sky); railing iris #3f8a47 / hair #2c5131 at 2 px ink;
//   grass line #a9d16e / iris; grass in shade hair flat; path skin #f0c2ae flat (meadow has no brown), path and water
//   in shade iris flat; water sky flat, ripples moon flat; tufts line / iris, shaded tufts iris / hair; bike frame
//   accent #d9483b / hair at -0.2, tyres and saddle hair, spokes, bars and basket sclera #f6f3ee / sky; the two inner
//   girders (always under the deck) sky flat, so the soffit reads as shade from every side.

export const meta = {
  name: "under-bridge",
  height: 6.6,
  script: "meadow",
  colors: {
    concrete: "#f7f3e1", concreteShade: "#d7ecef",
    rail: "#3f8a47", railShade: "#2c5131",
    grass: "#a9d16e", grassShade: "#3f8a47",
    shadow: "#2c5131", shadowLight: "#3f8a47",
    path: "#f0c2ae",
    water: "#d7ecef", ripple: "#f7f3e1",
    tuft: "#a9d16e", tuftShade: "#3f8a47",
    tuftDark: "#3f8a47", tuftDarkShade: "#2c5131",
    frame: "#d9483b", frameShade: "#2c5131",
    tyre: "#2c5131",
    metal: "#f6f3ee", metalShade: "#d7ecef",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height } = opts;
  const root = new THREE.Group();
  root.name = "under-bridge";
  const set = new THREE.Group();
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
  function tri(key, a, b, e, ref) { // wound away from ref
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-9) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    S(key).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  const centre = (p) => [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / p.length);
  function hex(key, p) { // convex hexahedron: p[0..3] one face, p[4..7] the opposite in the same order
    const ref = centre(p);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, x0, x1, y0, y1, z0, z1) {
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  function beam(key, a, b, w, h, up = [0, 1, 0]) { // a bar from a to b, w wide, h tall
    const d = sub(b, a);
    const nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
    const s = nrm(cross(d, up)), u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  function prism(key, cx, cz, r, y0, y1, n = 8) { // vertical n-gon prism, flat faces square to X and Z
    const ring = (y) => Array.from({ length: n }, (_, i) => {
      const a = ((i + 0.5) / n) * Math.PI * 2;
      return [cx + r * Math.cos(a), y, cz + r * Math.sin(a)];
    });
    const lo = ring(y0), hi = ring(y1), ref = [cx, (y0 + y1) / 2, cz];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      quad(key, lo[i], lo[j], hi[j], hi[i], ref);
      tri(key, lo[0], lo[i], lo[j], ref);
      tri(key, hi[0], hi[i], hi[j], ref);
    }
  }
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  // ---------- ground ----------
  const XW = 8, ZB = -7, ZF = 7;
  const PROFILE = [[-7, 3.2], [-5.6, 3.2], [-0.6, 0.4], [3.2, 0.4]]; // (z, y) of the grass
  const yg = (z) => {
    if (z <= PROFILE[0][0]) return PROFILE[0][1];
    for (let i = 0; i < PROFILE.length - 1; i++) {
      const [z0, y0] = PROFILE[i], [z1, y1] = PROFILE[i + 1];
      if (z <= z1) return y0 + ((y1 - y0) * (z - z0)) / (z1 - z0);
    }
    return z < 3.55 ? 0.4 - (0.3 * (z - 3.2)) / 0.35 : 0.1;
  };
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const [z0, y0] = PROFILE[i], [z1, y1] = PROFILE[i + 1];
    hex("grass", [[-XW, 0, z0], [XW, 0, z0], [XW, 0, z1], [-XW, 0, z1], [-XW, y0, z0], [XW, y0, z0], [XW, y1, z1], [-XW, y1, z1]]);
  }
  // revetment lip and the water slab
  hex("concrete", [[-XW, 0, 3.2], [XW, 0, 3.2], [XW, 0, 3.6], [-XW, 0, 3.6], [-XW, 0.42, 3.2], [XW, 0.42, 3.2], [XW, 0.1, 3.6], [-XW, 0.1, 3.6]]);
  box("water", -XW, XW, 0, 0.1, 3.58, ZF);

  // decal quad on the ground between z0 and z1 for x in [a(z), b(z)], lifted by `lift`
  const ZCUTS = [-7, -5.6, -0.6, 3.2, 3.55, 7];
  function decal(key, z0, z1, a, b, lift) {
    const cuts = [z0, ...ZCUTS.filter((z) => z > z0 && z < z1), z1];
    for (let i = 0; i < cuts.length - 1; i++) {
      const za = cuts[i], zb = cuts[i + 1];
      const P = (x, z) => [x, yg(z) + lift, z];
      const pa = [a(za), b(za)], pb = [a(zb), b(zb)];
      if (pa[1] <= pa[0] && pb[1] <= pb[0]) continue;
      const ref = [(pa[0] + pa[1]) / 2, yg((za + zb) / 2) - 1, (za + zb) / 2];
      quad(key, P(pa[0], za), P(pa[1], za), P(pb[1], zb), P(pb[0], zb), ref);
    }
  }
  const PATH = [-0.6, 0.8];
  decal("path", PATH[0], PATH[1], () => -XW, () => XW, 0.015);

  // ---------- bridge ----------
  const DX = 3.25, UNDER = 4.5, DECK = 5.6, TOP = 6.6;
  box("concrete", -DX, DX, 5.3, DECK, ZB, ZF); // slab
  for (const x of [-2.75, 2.75]) box("concrete", x - 0.22, x + 0.22, UNDER, 5.3, ZB, ZF); // edge girders
  for (const x of [-0.95, 0.95]) box("soffit", x - 0.22, x + 0.22, UNDER, 5.3, ZB, ZF); // inner girders, always in shade
  box("concrete", -3.4, 3.4, 3.0, UNDER, ZB, -6.2); // abutment block on the levee top
  box("concrete", -3.1, 3.1, 3.95, UNDER, 1.1, 2.1); // pier cap
  for (const x of [-2.0, 2.0]) prism("concrete", x, 1.6, 0.6, 0.3, 3.96, 8); // columns
  for (const s of [-1, 1]) {
    box("concrete", s > 0 ? DX - 0.28 : -DX, s > 0 ? DX : -DX + 0.28, DECK, 5.85, ZB, ZF); // curb
    const x = s * (DX - 0.14);
    for (let z = ZB + 0.3; z < ZF; z += 1.4) box("rail", x - 0.04, x + 0.04, 5.85, TOP - 0.02, z - 0.04, z + 0.04);
    box("rail", x - 0.06, x + 0.06, TOP - 0.1, TOP, ZB, ZF);
    box("rail", x - 0.03, x + 0.03, 6.18, 6.24, ZB, ZF);
  }

  // ---------- the deck's shadow ----------
  const K = 0.35;
  const sx0 = (z) => -3.3 - K * (DECK - yg(z)), sx1 = (z) => 3.3 - K * (UNDER - yg(z));
  const inShade = (x, z) => x > sx0(z) && x < sx1(z);
  const WZ = 3.58; // the water starts here: shade on the water is the lighter iris
  decal("shadow", ZB, WZ, sx0, sx1, 0.03);
  decal("shadowLight", WZ, ZF, sx0, sx1, 0.03);
  decal("shadowLight", PATH[0], PATH[1], sx0, sx1, 0.045); // the path in shade
  // railing shadow beyond the -X edge: top rail, mid rail, post bars (the gaps are the sun patches)
  const railX = (h) => (z) => -(DX - 0.14) - K * (h - yg(z));
  for (const [z0, z1, key] of [[ZB, WZ, "shadow"], [WZ, ZF, "shadowLight"]]) {
    decal(key, z0, z1, railX(TOP), railX(TOP - 0.13), 0.03);
    decal(key, z0, z1, railX(6.25), railX(6.16), 0.03);
  }
  for (let z = ZB + 0.3; z < ZF; z += 1.4) decal(z < WZ ? "shadow" : "shadowLight", z - 0.06, z + 0.06, railX(TOP), sx0, 0.03);

  // ---------- stones ----------
  const STONES = [[3.4, -0.75, 0.2], [4.1, -0.8, 0.12], [-4.6, 0.95, 0.16], [-1.2, 1.05, 0.11], [5.2, 2.9, 0.22],
    [6.0, 3.05, 0.14], [-5.6, 2.95, 0.18], [0.6, 3.0, 0.13], [-2.6, 2.8, 0.1]];
  STONES.forEach(([x, z, r], i) => {
    const y = yg(z) - 0.02, j = (k) => 1 + 0.35 * (hash(i * 9 + k) - 0.5);
    const lo = r * 1.0, hi = r * 0.6, h = r * 0.9;
    hex("concrete", [[x - lo * j(1), y, z - lo * j(2)], [x + lo * j(3), y, z - lo * j(4)], [x + lo * j(5), y, z + lo * j(6)],
      [x - lo * j(7), y, z + lo * j(8)], [x - hi * j(9), y + h, z - hi], [x + hi, y + h * j(10), z - hi * j(11)],
      [x + hi * j(12), y + h, z + hi], [x - hi, y + h * j(13), z + hi * j(14)]]);
  });

  // ---------- bicycle (mamachari) leaning on the +X column's river face ----------
  {
    const BX = 2.05, BZ = 2.55, LEAN = -0.27; // lean: the top tilts toward -Z onto the column
    const cl = Math.cos(LEAN), sl = Math.sin(LEAN);
    const W = ([x, y, z]) => [BX + x, 0.4 + y * cl - z * sl, BZ + y * sl + z * cl]; // bike frame -> world
    const bar = (key, a, b, w, h = w) => beam(key, W(a), W(b), w, h, (() => { const u = W([0, 1, 0]); return [u[0] - BX, u[1] - 0.4, u[2] - BZ]; })());
    const R = 0.33, RA = [-0.55, R, 0], FA = [0.6, R, 0], BB = [0, 0.27, 0], SC = [-0.2, 0.82, 0];
    const HT = [0.42, 0.9, 0], HB = [0.47, 0.72, 0];
    for (const [cx, cy] of [RA, FA]) { // tyres: an octagon-section torus of 18 segments; hub and spokes
      const n = 18, t = 0.03;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
        const p0 = [cx + R * Math.cos(a0), cy + R * Math.sin(a0), 0], p1 = [cx + R * Math.cos(a1), cy + R * Math.sin(a1), 0];
        bar("tyre", p0, p1, t * 1.6, t * 1.6);
      }
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI + 0.3;
        bar("metal", [cx + R * 0.95 * Math.cos(a), cy + R * 0.95 * Math.sin(a), 0], [cx - R * 0.95 * Math.cos(a), cy - R * 0.95 * Math.sin(a), 0], 0.012, 0.012);
      }
      bar("metal", [cx, cy, -0.05], [cx, cy, 0.05], 0.05, 0.05);
    }
    bar("frame", HB, [0.2, 0.36, 0], 0.05);   // down tube, curving low (step-through)
    bar("frame", [0.2, 0.36, 0], BB, 0.05);
    bar("frame", BB, SC, 0.045);              // seat tube
    bar("frame", SC, RA, 0.03);               // seat stays
    bar("frame", BB, RA, 0.03);               // chain stays
    bar("frame", HB, HT, 0.055);              // head tube
    bar("frame", HB, FA, 0.035);              // fork
    bar("frame", [-0.55, R + 0.36, 0], [-0.2, R + 0.4, 0], 0.11, 0.025); // rear fender / carrier
    bar("frame", [0.42, R + 0.36, 0], [0.78, R + 0.3, 0], 0.11, 0.025);   // front fender
    bar("metal", SC, [-0.24, 0.98, 0], 0.03);  // seat post
    bar("tyre", [-0.36, 1.0, 0], [-0.1, 1.0, 0], 0.15, 0.07); // saddle
    bar("metal", HT, [0.36, 1.04, 0], 0.03);   // stem
    bar("metal", [0.32, 1.04, -0.3], [0.32, 1.04, 0.3], 0.03); // handlebar
    bar("tyre", [0.26, 1.04, -0.3], [0.26, 1.04, -0.38], 0.04); // grips (rear-pointing swept bar ends)
    bar("tyre", [0.26, 1.04, 0.3], [0.26, 1.04, 0.38], 0.04);
    bar("metal", [0.32, 1.04, -0.3], [0.26, 1.04, -0.3], 0.03);
    bar("metal", [0.32, 1.04, 0.3], [0.26, 1.04, 0.3], 0.03);
    // front basket: an open box drawn as a solid with a rim band
    const bk = (x0, x1, y0, y1, z0, z1, key = "metal") => hex(key, [W([x0, y0, z0]), W([x1, y0, z0]), W([x1, y0, z1]), W([x0, y0, z1]), W([x0, y1, z0]), W([x1, y1, z0]), W([x1, y1, z1]), W([x0, y1, z1])]);
    bk(0.5, 0.86, 0.78, 1.06, -0.17, 0.17);
    bk(0.49, 0.87, 1.04, 1.08, -0.18, 0.18, "frame");
  }

  // ---------- tall grass tufts (moving: one mesh per material set) ----------
  const TUFTS = [];
  for (let i = 0; i < 16; i++) if (i < 4 || i > 11) TUFTS.push([-7.4 + i * 0.97 + 0.3 * hash(i), 3.0 + 0.12 * hash(i + 40), 0.75 + 0.3 * hash(i + 80)]); // river lip
  for (let i = 0; i < 10; i++) TUFTS.push([-7.5 + i * 1.6 + 0.5 * hash(i + 120), PATH[0] - 0.12 - 0.3 * hash(i + 160), 0.5 + 0.2 * hash(i + 200)]); // slope foot
  for (let i = 0; i < 8; i++) TUFTS.push([4.3 + 3.2 * hash(i + 240), -5.2 + 4.2 * hash(i + 280), 0.55 + 0.25 * hash(i + 320)]); // sunny slope
  for (let i = 0; i < 6; i++) TUFTS.push([-7.6 + 2.0 * hash(i + 360), -5.0 + 4.0 * hash(i + 400), 0.5 + 0.2 * hash(i + 440)]); // far slope
  TUFTS.push([2.85, 1.1, 0.7], [-2.7, 2.3, 0.7], [-1.35, 2.15, 0.5], [3.6, 2.9, 0.8], [-3.9, 2.95, 0.9]); // column feet
  const sway = {}; // key -> { w: amplitude weight per vertex, ph: phase per vertex }
  TUFTS.forEach(([tx, tz, th], ti) => {
    const ty = yg(tz) - 0.02, key = inShade(tx, tz) ? "tuftDark" : "tuft";
    const sw = (sway[key] ??= { w: [], ph: [] });
    const blades = 7;
    for (let b = 0; b < blades; b++) {
      const a = (b / blades) * Math.PI * 2 + hash(ti * 13 + b) * 0.9;
      const h = th * (0.6 + 0.4 * hash(ti * 7 + b + 3));
      const out = 0.06 + 0.04 * hash(ti * 5 + b);
      const lean = h * (0.25 + 0.25 * hash(ti * 3 + b + 1));
      const ox = Math.cos(a), oz = Math.sin(a);
      const bx = tx + ox * out, bz = tz + oz * out;
      const w0 = 0.05, w1 = 0.03;
      const ringAt = (s, w, y) => {
        const cx = bx + ox * lean * s * s, cz = bz + oz * lean * s * s;
        return [0, 1, 2].map((k) => {
          const q = a + (k / 3) * Math.PI * 2;
          return [cx + Math.cos(q) * w * (k ? 0.5 : 1), y, cz + Math.sin(q) * w * (k ? 0.5 : 1)];
        });
      };
      const r0 = ringAt(0, w0, ty), r1 = ringAt(0.5, w1, ty + h * 0.55);
      const tip = [bx + ox * lean, ty + h, bz + oz * lean];
      const ref = centre([...r0, ...r1]);
      const before = S(key).length;
      tri(key, r0[0], r0[1], r0[2], ref);
      for (let k = 0; k < 3; k++) {
        const j = (k + 1) % 3;
        quad(key, r0[k], r0[j], r1[j], r1[k], ref);
        tri(key, r1[k], r1[j], tip, ref);
      }
      const arr = S(key);
      for (let v = before; v < arr.length; v += 3) {
        const s = Math.max(0, (arr[v + 1] - ty) / h);
        sw.w.push(h * s ** 1.6);
        sw.ph.push(0.55 * tx + 0.25 * tz + 0.4 * hash(ti));
      }
    }
  });

  // ---------- water ripples (moving): moon slivers, each drifting +X 1.6 m across its own cell ----------
  const RIP = [];
  for (let i = 0; i < 26; i++) {
    const row = i % 5, cell = Math.floor(i / 5) + (row % 2) * 0.5;
    RIP.push({ x: -7.2 + cell * 2.2 + 0.4 * hash(i + 500), z: 3.95 + row * 0.62 + 0.15 * hash(i + 540), L: 0.8 + 0.8 * hash(i + 580), u0: hash(i + 620) });
  }
  const ripLocal = []; // per ripple: 4 triangles of a flat lens, local (dx, dz)
  const lens = (L, w) => {
    const p = [[-L, 0], [-L * 0.4, w], [L * 0.4, w], [L, 0], [L * 0.4, -w], [-L * 0.4, -w]];
    return [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 5]].flatMap((t) => t.map((k) => p[k]));
  };
  for (const r of RIP) ripLocal.push(lens(r.L / 2, 0.06));

  // ---------- meshes ----------
  const MAT = { // key: [base, shade, threshold, ink px (0 = no ink)]
    concrete: [c.concrete, c.concreteShade, 0.1, 4], soffit: [c.concreteShade, c.concreteShade, 0, 4], rail: [c.rail, c.railShade, 0.2, 2],
    grass: [c.grass, c.grassShade, 0.35, 4], shadow: [c.shadow, c.shadow, 0, 0], shadowLight: [c.shadowLight, c.shadowLight, 0, 0],
    path: [c.path, c.path, 0, 0], water: [c.water, c.water, 0, 3], ripple: [c.ripple, c.ripple, 0, 0],
    tuft: [c.tuft, c.tuftShade, 0.2, 1.5], tuftDark: [c.tuftDark, c.tuftDarkShade, 0.2, 1.5],
    frame: [c.frame, c.frameShade, -0.2, 2], tyre: [c.tyre, c.tyre, 0, 2], metal: [c.metal, c.metalShade, 0.1, 1.5],
  };
  const live = {};
  // ripples are written in pose(); allocate their buffer
  S("ripple").push(...new Array(RIP.length * 12 * 3).fill(0));
  for (const [key, arr] of Object.entries(soups)) {
    const [b, s, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, b, s, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    set.add(mesh);
    if (key === "ripple" || sway[key]) {
      mesh.frustumCulled = false;
      live[key] = { g, rest: Float32Array.from(arr) };
    }
  }

  // ---------- poses and clips ----------
  const CLIPS = { breeze: 4 };
  const TAU = Math.PI * 2;
  function apply(t) {
    for (const key of ["tuft", "tuftDark"]) {
      if (!live[key]) continue;
      const { g, rest } = live[key], P = g.attributes.position.array, { w, ph } = sway[key];
      for (let v = 0; v < w.length; v++) {
        const i = v * 3, gust = Math.sin(TAU * (2 * t / CLIPS.breeze) - ph[v]);
        const dx = w[v] * (0.1 + 0.2 * gust), dz = w[v] * 0.04 * Math.sin(TAU * (2 * t / CLIPS.breeze) - ph[v] + 1.3);
        P[i] = rest[i] + dx;
        P[i + 1] = rest[i + 1] - (dx * dx) / (2.2 * Math.max(w[v], 0.2));
        P[i + 2] = rest[i + 2] + dz;
      }
      g.attributes.position.needsUpdate = true;
      g.computeVertexNormals();
      g.computeBoundingSphere();
    }
    if (live.ripple) {
      const { g } = live.ripple, P = g.attributes.position.array;
      let o = 0;
      RIP.forEach((r, i) => {
        const u = (((r.u0 + t / CLIPS.breeze) % 1) + 1) % 1, k = Math.sin(Math.PI * u) ** 0.7;
        const cx = r.x + 1.6 * u;
        for (const [dx, dz] of ripLocal[i]) { P[o++] = cx + dx * k; P[o++] = 0.112; P[o++] = r.z + dz * k; }
      });
      g.attributes.position.needsUpdate = true;
      g.computeVertexNormals();
      g.computeBoundingSphere();
    }
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`under-bridge: no clip "${m[1]}" (clips: breeze)`);
      return apply(+m[2]);
    }
    if (name !== "rest") throw new Error(`under-bridge: unknown pose "${name}" (rest, or breeze@<seconds>)`);
    apply(0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
