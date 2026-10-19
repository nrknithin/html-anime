// apartment-rooftop.js - the flat roof of an older city apartment block at night (the anime stargazing / late-night-talk
// set): a concrete deck inside a low parapet with a square-mesh safety fence on it, the stair-access hut with a steel
// door under a bare bulb, an elevated water tank on a braced steel frame with a ladder, a row of AC condensers along the
// back, a TV antenna mast with guy wires and a sagging cable, potted plants, a folding chair, and a low cut-out of
// neighbouring blocks behind with a few lit windows. Static, plus one cheap clip: the bulb flickers.
// Contract: harness/lab/README.md. Meters, +Y up, the hut door faces +Z, its left is +X, stands on y = 0, centred on
// x = 0, z = 0.
//
// Construction (boxes, flat quads, faceted cylinders and low spheres, all triangle soups merged per material;
// flat-shaded, so planes read crisp; every triangle wound away from a point inside its solid or behind its quad):
//   DECK      one slab 12 x 8 m, top at 0.2 m, a 0.5 m parapet round the edge (bottoms buried in the slab). Dark
//             seams on a ~2 m grid and a gutter strip along the parapet foot: quads 5-6 mm over the deck, no hull.
//   FENCE     steel posts every ~2 m on the parapet, three rails, and a welded square mesh between them (thin
//             double-sided strips, no hull). Straight up, square cells: a residential fence, not the school diamond.
//   HUT       the stair hut (3 x 2.6 m, 2.4 m over the deck) at the back on -X with a coping; a warm steel door in a
//             dark doorway on its +Z face, a bracket and socket over it with the bare bulb, and a pool of bulb light on
//             the deck; a lit stair window on its +X face.
//   TANK      an upright tank (faceted cylinder, two dark hoops, a manhole) on a 2 m four-legged steel frame with
//             X braces and a platform, a caged ladder on the camera (+Z) face. Back +X corner.
//   PLANT     four AC condensers on a pad along the back between hut and tank (pale boxes, dark fan discs with a
//             grille cross), a pipe duct into the hut.
//   MAST      a 4.2 m pole on the hut roof, two Yagi antennas (boom along Z, elements across X), four guy wires to
//             the roof corners and a feed cable sagging from the mast to the front parapet.
//   PROPS     three terracotta pots with dark leaf clumps (two by the front-left parapet, one by the door) and a
//             folding chair facing the front edge.
//   SKYLINE   a low cut-out of three neighbouring blocks 2 m behind the back parapet, dark with a few lit windows.
// Proportions (real size, base unit the 2.4 m hut storey): deck 12 x 8, top 0.2; parapet 0.5 x 0.2; fence 1.2 over the
//   parapet; hut 3 x 2.6 x 2.4, coping 0.15; door 0.9 x 2.0; tank frame 2.0, tank 1.6 dia x 1.5; chair seat 0.45;
//   mast top 6.95 (the top of the set).
// Options: build(THREE, kit, colors, { height, skyline }).
//   height   scales the whole set uniformly so its top is `height` (as the torii does).
//   skyline  false drops the neighbouring blocks behind (default true).
// Clip: flicker (4 s): the bulb and its light pool drop out on a few literal off-intervals; pose("flicker@1.2").
// Colours (indigo, night), base / shade:
//   parapet, hut, coping, chair seat     moon #d5e2ff / sky #1b2d6b, threshold 0.1
//   deck, pad                            sky #1b2d6b, one tone (the dark concrete floor)
//   seams, gutters, doorway, wires, fan discs, hoops, socket, leaves   hair #16141c, one tone (lines and darks)
//   mesh fence                           line #e7eefc, one tone (pale wire over the dark deck)
//   steel (posts, rails, frame, ladders, mast)  line #e7eefc / sky #1b2d6b, threshold 0.1, 2 px ink
//   tank, AC units, duct                 sclera #f6f3ee / sky #1b2d6b, threshold 0.1
//   door                                 skin #f0c2ae / sky #1b2d6b (warm under the bulb)
//   pots                                 iris #e7a04a / accent #e23b4a
//   chair frame                          accent #e23b4a / sky #1b2d6b
//   skyline                              sky #1b2d6b, one tone with its hull
//   bulb, light pool, lit windows        practical #f0c36a, glow (threshold -0.25, no hull); the unlit bulb glass sky

export const meta = {
  name: "apartment-rooftop",
  height: 6.95,
  script: "indigo",
  colors: {
    wall: "#d5e2ff", wallShade: "#1b2d6b",
    deck: "#1b2d6b",
    dark: "#16141c",
    net: "#e7eefc",
    steel: "#e7eefc", steelShade: "#1b2d6b",
    pale: "#f6f3ee", paleShade: "#1b2d6b",
    door: "#f0c2ae", doorShade: "#1b2d6b",
    pot: "#e7a04a", potShade: "#e23b4a",
    chair: "#e23b4a", chairShade: "#1b2d6b",
    city: "#1b2d6b",
    glow: "#f0c36a",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const SKY = opts.skyline !== false;
  const root = new THREE.Group();
  root.name = "apartment-rooftop";
  const body = new THREE.Group(); // uniform size scale lives here, root stays the plain contract node
  body.name = "body";
  root.add(body);
  const joints = {};

  // ---------- triangle soups, one per material ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  function tri(key, a, b, e, ref) { // one triangle wound away from `ref`
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    S(key).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
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
  function cyl(key, cx, cz, y0, y1, r0, n = 20, r1 = r0) { // upright faceted (frustum) cylinder, capped
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const p = (a, y, r) => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
      const ref = [cx, (y0 + y1) / 2, cz];
      quad(key, p(a0, y0, r0), p(a1, y0, r0), p(a1, y1, r1), p(a0, y1, r1), ref);
      tri(key, [cx, y1, cz], p(a0, y1, r1), p(a1, y1, r1), [cx, y1 - 1, cz]);
      tri(key, [cx, y0, cz], p(a0, y0, r0), p(a1, y0, r0), [cx, y0 + 1, cz]);
    }
  }
  function ball(key, cx, cy, cz, rx, ry = rx, rz = rx, nu = 8, nv = 5) { // low UV ellipsoid
    const P = (i, j) => {
      const u = (i / nu) * Math.PI * 2, v = (j / nv) * Math.PI;
      return [cx + Math.sin(v) * Math.cos(u) * rx, cy + Math.cos(v) * ry, cz + Math.sin(v) * Math.sin(u) * rz];
    };
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const ref = [cx, cy, cz];
      if (j > 0) tri(key, P(i, j), P(i + 1, j), P(i + 1, j + 1), ref);
      if (j < nv - 1) tri(key, P(i, j), P(i + 1, j + 1), P(i, j + 1), ref);
    }
  }
  function bar(key, p, q, w) { // a square bar from p to q, half-width w
    const t = sub(q, p), tl = Math.hypot(...t);
    let s = cross(t, [0, 1, 0]);
    if (Math.hypot(...s) < 1e-6 * tl) s = [1, 0, 0];
    const sl = Math.hypot(...s), sv = s.map((v) => (v / sl) * w);
    const uv = cross(sv, t), ul = Math.hypot(...uv), uu = uv.map((v) => (v / ul) * w);
    const C = (pt, i, j) => [pt[0] + sv[0] * i + uu[0] * j, pt[1] + sv[1] * i + uu[1] * j, pt[2] + sv[2] * i + uu[2] * j];
    hex(key, [C(p, -1, -1), C(p, 1, -1), C(p, 1, 1), C(p, -1, 1), C(q, -1, -1), C(q, 1, -1), C(q, 1, 1), C(q, -1, 1)]);
  }
  // wall faces: local (u along the wall, y, o out of the wall) -> world
  const face = (side, at) => (u, y, o) =>
    side === "+z" ? [u, y, at + o] : side === "-z" ? [-u, y, at - o] : side === "+x" ? [at + o, y, -u] : [at - o, y, u];
  const wquad = (key, f, u0, u1, y0, y1, o) => quad(key, f(u0, y0, o), f(u1, y0, o), f(u1, y1, o), f(u0, y1, o), f((u0 + u1) / 2, (y0 + y1) / 2, o - 1));

  // ---------- dimensions ----------
  const XW = 6, ZD = 4, D = 0.2; // deck half-extents, deck top
  const PAR = 0.5, PT = 0.2, PY = D + PAR; // parapet height, thickness, top
  const IX = XW - PT, IZ = ZD - PT; // inner parapet faces
  const HX0 = -5.6, HX1 = -2.6, HZ0 = -3.6, HZ1 = -1.0, HY = D + 2.4, CY = HY + 0.15; // hut, coping top
  const DX0 = -3.95, DX1 = DX0 + 0.9, DY = D + 2.0, DR = 0.12; // doorway, its recess
  const TX = 3.9, TZ = -2.5, TR = 0.8, L = 0.85, FY = D + 2.0, TY0 = FY + 0.1, TY1 = TY0 + 1.5; // tank
  const MX = -4.4, MZ = -2.6, MTOP = CY + 4.2; // mast

  // ---------- deck and parapet ----------
  box("deck", -XW, XW, 0, D, -ZD, ZD);
  box("wall", -XW, XW, D - 0.1, PY, ZD - PT, ZD);
  box("wall", -XW, XW, D - 0.1, PY, -ZD, -ZD + PT);
  box("wall", -XW, -XW + PT, D - 0.1, PY, -ZD + 0.1, ZD - 0.1);
  box("wall", XW - PT, XW, D - 0.1, PY, -ZD + 0.1, ZD - 0.1);
  box("wall", -XW - 0.04, XW + 0.04, PY, PY + 0.05, ZD - PT - 0.04, ZD + 0.04); // front cap
  const GW = 0.12, y1 = D + 0.006;
  flat("dark", -IX, IX, IZ - GW, IZ, y1);
  flat("dark", -IX, IX, -IZ, -IZ + GW, y1);
  flat("dark", -IX, -IX + GW, -IZ + GW, IZ - GW, y1);
  flat("dark", IX - GW, IX, -IZ + GW, IZ - GW, y1);
  flat("dark", IX - 0.5, IX - GW, IZ - 0.5, IZ - GW, y1); // drain
  const SW = 0.025;
  for (let x = -4; x <= 4; x += 2) {
    const z0 = x < HX1 + 0.1 ? HZ1 : -IZ + GW;
    flat("dark", x - SW, x + SW, z0, IZ - GW, y1);
  }
  for (const z of [-2, 0, 2]) {
    const x0 = z < HZ1 + 0.1 ? HX1 : -IX + GW;
    flat("dark", x0, IX - GW, z - SW, z + SW, y1);
  }

  // ---------- stair hut ----------
  box("wall", HX0, HX1, D - 0.1, HY, HZ0, HZ1 - DR);
  box("wall", HX0, DX0, D - 0.1, HY, HZ1 - DR - 0.05, HZ1);
  box("wall", DX1, HX1, D - 0.1, HY, HZ1 - DR - 0.05, HZ1);
  box("wall", DX0 - 0.05, DX1 + 0.05, DY, HY, HZ1 - DR - 0.05, HZ1);
  box("dark", DX0 - 0.01, DX1 + 0.01, D, DY + 0.01, HZ1 - DR - 0.02, HZ1 - 0.08); // doorway behind the door
  box("wall", HX0 - 0.08, HX1 + 0.08, HY, CY, HZ0 - 0.08, HZ1 + 0.08); // coping
  box("wall", DX0 - 0.2, DX1 + 0.2, DY + 0.2, DY + 0.28, HZ1 - 0.05, HZ1 + 0.4); // little door hood
  box("wall", DX0 - 0.3, DX1 + 0.3, D, D + 0.15, HZ1, HZ1 + 0.45); // step
  const pf = face("+z", HZ1);
  for (const [u0, u1, v0, v1] of [[DX0 - 0.06, DX0, D, DY + 0.06], [DX1, DX1 + 0.06, D, DY + 0.06], [DX0, DX1, DY, DY + 0.06]])
    wquad("dark", pf, u0, u1, v0, v1, 0.01); // door frame
  // door, shut, just inside the frame
  const DW = DX1 - DX0 - 0.02;
  box("door", DX0 + 0.01, DX0 + DW, D + 0.15, DY - 0.01, HZ1 - 0.1, HZ1 - 0.05);
  const df = face("+z", HZ1 - 0.05);
  box("dark", DX1 - 0.2, DX1 - 0.08, D + 1.0, D + 1.06, HZ1 - 0.05, HZ1 + 0.02); // lever
  wquad("dark", df, DX0 + 0.22, DX1 - 0.22, D + 1.35, D + 1.8, 0.005); // door window
  wquad("door", df, DX0 + 0.26, DX1 - 0.26, D + 1.39, D + 1.76, 0.01);
  // bare bulb on a bracket over the hood, toward +X so it hangs clear
  const BX = DX1 + 0.42, BY = DY + 0.55, BZ = HZ1 + 0.22;
  box("dark", BX - 0.04, BX + 0.04, BY + 0.12, BY + 0.2, HZ1, HZ1 + 0.03); // wall plate
  bar("dark", [BX, BY + 0.16, HZ1 + 0.02], [BX, BY + 0.16, BZ], 0.012); // arm
  cyl("dark", BX, BZ, BY + 0.06, BY + 0.17, 0.035, 8); // socket
  const lampJ = new THREE.Group(); // a marker at the bulb (no geometry), for framing the flicker
  lampJ.name = "lamp";
  lampJ.position.set(BX, BY, BZ);
  body.add(lampJ);
  joints.lamp = lampJ;
  ball("bulbDim", BX, BY, BZ, 0.07, 0.085, 0.07, 8, 6); // the glass when the bulb is off
  ball("bulb", BX, BY, BZ, 0.08, 0.095, 0.08, 8, 6);
  // light pool on the step and the deck in front of the door
  const pool = (y, r, n = 14) => {
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI, a1 = ((i + 1) / n) * Math.PI;
      const P = (a) => [BX - 0.4 - Math.cos(a) * r * 1.3, y, HZ1 + 0.02 + Math.sin(a) * r];
      tri("bulb", [BX - 0.4, y, HZ1 + 0.02], P(a0), P(a1), [BX - 0.4, y - 1, HZ1 + 0.02]);
    }
  };
  pool(D + 0.008, 1.5);
  // lit stair window on the +X face, and a dark vent
  const sf = face("+x", HX1);
  const wu = 2.35; // u on the +x face is -z
  wquad("dark", sf, wu - 0.4, wu + 0.4, D + 1.3, D + 2.0, 0.01);
  for (const s of [-1, 1]) wquad("glow", sf, wu + (s < 0 ? -0.34 : 0.03), wu + (s < 0 ? -0.03 : 0.34), D + 1.36, D + 1.94, 0.02);
  wquad("dark", sf, 1.3, 1.6, D + 1.9, D + 2.2, 0.01);

  // ---------- ladders ----------
  function ladderZ(z, x0, x1, ya, yb, cage) { // rails at x0, x1 on a plane at z, rungs every 0.3
    for (const x of [x0, x1]) box("steel", x - 0.025, x + 0.025, ya, yb, z - 0.025, z + 0.025);
    for (let y = ya + 0.3; y < yb - 0.1; y += 0.3) box("steel", x0, x1, y - 0.015, y + 0.015, z - 0.012, z + 0.012);
    if (cage) for (let y = ya + 1.2; y < yb; y += 0.5) { // hoop cage, three bars
      const cz = z + 0.35;
      bar("steel", [x0, y, z], [x0 - 0.05, y, cz], 0.012);
      bar("steel", [x1, y, z], [x1 + 0.05, y, cz], 0.012);
      bar("steel", [x0 - 0.05, y, cz], [x1 + 0.05, y, cz], 0.012);
    }
  }

  // ---------- water tank on its frame ----------
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box("steel", TX + sx * L - 0.06, TX + sx * L + 0.06, D, FY, TZ + sz * L - 0.06, TZ + sz * L + 0.06);
  for (const y of [D + 0.25, D + 1.1, FY - 0.08]) { // ring beams
    box("steel", TX - L, TX + L, y - 0.04, y + 0.04, TZ + L - 0.04, TZ + L + 0.04);
    box("steel", TX - L, TX + L, y - 0.04, y + 0.04, TZ - L - 0.04, TZ - L + 0.04);
    box("steel", TX + L - 0.04, TX + L + 0.04, y - 0.04, y + 0.04, TZ - L, TZ + L);
    box("steel", TX - L - 0.04, TX - L + 0.04, y - 0.04, y + 0.04, TZ - L, TZ + L);
  }
  for (const [ya, yb] of [[D + 0.25, D + 1.1], [D + 1.1, FY - 0.08]]) { // X braces on all four faces
    for (const sz of [-1, 1]) {
      bar("steel", [TX - L, ya, TZ + sz * L], [TX + L, yb, TZ + sz * L], 0.02);
      bar("steel", [TX + L, ya, TZ + sz * L], [TX - L, yb, TZ + sz * L], 0.02);
    }
    for (const sx of [-1, 1]) {
      bar("steel", [TX + sx * L, ya, TZ - L], [TX + sx * L, yb, TZ + L], 0.02);
      bar("steel", [TX + sx * L, ya, TZ + L], [TX + sx * L, yb, TZ - L], 0.02);
    }
  }
  box("steel", TX - L - 0.1, TX + L + 0.1, FY, TY0, TZ - L - 0.1, TZ + L + 0.1); // platform
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) box("steel", TX + sx * (L + 0.08) - 0.02, TX + sx * (L + 0.08) + 0.02, TY0, TY0 + 0.6, TZ + sz * (L + 0.08) - 0.02, TZ + sz * (L + 0.08) + 0.02);
  for (const sz of [-1, 1]) box("steel", TX - L - 0.1, TX + L + 0.1, TY0 + 0.57, TY0 + 0.61, TZ + sz * (L + 0.08) - 0.02, TZ + sz * (L + 0.08) + 0.02);
  for (const sx of [-1, 1]) box("steel", TX + sx * (L + 0.08) - 0.02, TX + sx * (L + 0.08) + 0.02, TY0 + 0.57, TY0 + 0.61, TZ - L - 0.1, TZ + L + 0.1);
  cyl("pale", TX, TZ, TY0, TY1, TR);
  for (const y of [TY0 + 0.5, TY0 + 1.0]) cyl("dark", TX, TZ, y - 0.03, y + 0.03, TR + 0.012);
  cyl("pale", TX, TZ, TY1, TY1 + 0.12, TR + 0.03, 20, TR * 0.6); // shallow domed lid
  cyl("dark", TX + 0.15, TZ + 0.1, TY1 + 0.1, TY1 + 0.18, 0.2, 12); // manhole
  ladderZ(TZ + L + 0.2, TX - 0.2, TX + 0.2, D, TY1 + 0.4, true);
  for (const x of [TX - 0.2, TX + 0.2]) box("steel", x - 0.02, x + 0.02, D + 0.6, D + 0.64, TZ + L, TZ + L + 0.2); // stand-offs

  // ---------- AC condensers, pad, duct ----------
  const UZ = -IZ + 0.45;
  box("deck", -2.3, 2.75, D - 0.05, D + 0.1, UZ - 0.32, UZ + 0.32);
  for (const x of [-1.7, -0.5, 0.7, 1.9]) {
    const y0 = D + 0.1, uy = y0 + 0.66;
    box("pale", x - 0.5, x + 0.5, y0 + 0.06, uy, UZ - 0.2, UZ + 0.15);
    for (const sx of [-1, 1]) box("dark", x + sx * 0.4 - 0.04, x + sx * 0.4 + 0.04, y0, y0 + 0.06, UZ - 0.16, UZ + 0.1);
    const ff = face("+z", UZ + 0.15), fx = x - 0.12, fy = y0 + 0.38, fr = 0.22;
    for (let i = 0; i < 16; i++) {
      const a0 = (i / 16) * Math.PI * 2, a1 = ((i + 1) / 16) * Math.PI * 2;
      tri("dark", ff(fx, fy, 0.01), ff(fx + Math.cos(a0) * fr, fy + Math.sin(a0) * fr, 0.01), ff(fx + Math.cos(a1) * fr, fy + Math.sin(a1) * fr, 0.01), ff(fx, fy, -1));
    }
    wquad("pale", ff, fx - fr, fx + fr, fy - 0.014, fy + 0.014, 0.02);
    wquad("pale", ff, fx - 0.014, fx + 0.014, fy - fr, fy + fr, 0.02);
    wquad("dark", ff, x + 0.22, x + 0.42, y0 + 0.14, y0 + 0.5, 0.01);
  }
  box("pale", HX1, -2.2, D, D + 0.16, UZ - 0.3, UZ - 0.16); // duct to the hut
  box("pale", HX1, HX1 + 0.18, D, D + 1.2, UZ - 0.3, UZ - 0.16); // up into the wall

  // ---------- fence ----------
  {
    const F0 = PY, FH = 1.2; // on the parapet top
    function fence(a, b) { // a, b: [x, z] on the parapet centre line
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), d = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
      const P = (u, y) => [a[0] + d[0] * u, y, a[1] + d[1] * u];
      const n = Math.max(1, Math.round(len / 2));
      for (let i = 0; i <= n; i++) bar("steel", P((len * i) / n, F0 - 0.02), P((len * i) / n, F0 + FH + 0.04), 0.035);
      for (const y of [F0 + 0.06, F0 + FH * 0.55, F0 + FH]) bar("steel", P(0, y), P(len, y), 0.025);
      const step = 0.2, hw = 0.009, nrm = [-d[1], 0, d[0]];
      const R = (p) => [p[0] - nrm[0], p[1], p[2] - nrm[2]];
      for (let u = step / 2; u < len; u += step) { // verticals
        const p = P(u - hw, F0 + 0.06), q = P(u + hw, F0 + FH);
        quad("net", p, P(u + hw, F0 + 0.06), q, P(u - hw, F0 + FH), R(P(u, F0 + FH / 2)));
      }
      for (let y = F0 + 0.06 + step; y < F0 + FH - 0.05; y += step) // horizontals
        quad("net", P(0, y - hw), P(len, y - hw), P(len, y + hw), P(0, y + hw), R(P(len / 2, y)));
    }
    const ex = XW - PT / 2, ez = ZD - PT / 2;
    fence([ex, ez], [-ex, ez]);
    fence([-ex, -ez], [ex, -ez]);
    fence([ex, -ez], [ex, ez]);
    fence([-ex, ez], [-ex, -ez]);
  }

  // ---------- antenna mast ----------
  cyl("steel", MX, MZ, CY, MTOP, 0.045, 8);
  cyl("steel", MX, MZ, CY, CY + 0.08, 0.2, 8); // base plate
  function yagi(y, boom, els) { // boom along Z through the mast, elements across X shrinking toward +Z
    bar("steel", [MX, y, MZ - boom * 0.35], [MX, y, MZ + boom * 0.65], 0.022);
    els.forEach((w, i) => {
      const z = MZ - boom * 0.35 + (boom * i) / (els.length - 1);
      bar("steel", [MX - w / 2, y, z], [MX + w / 2, y, z], 0.012);
    });
  }
  yagi(MTOP - 0.25, 1.9, [1.2, 1.0, 0.9, 0.8, 0.75, 0.7, 0.65]);
  yagi(MTOP - 1.25, 1.3, [0.9, 0.75, 0.65, 0.6, 0.55]);
  const GY = CY + 2.6;
  for (const [x, z] of [[HX0 + 0.1, HZ0 + 0.1], [HX1 - 0.1, HZ0 + 0.1], [HX0 + 0.1, HZ1 - 0.1], [HX1 - 0.1, HZ1 - 0.1]])
    bar("dark", [MX, GY, MZ], [x, CY, z], 0.01);
  // feed cable: down the mast, then sagging over to the front-left parapet post
  {
    const A = [MX + 0.06, CY + 1.8, MZ + 0.06], B = [-XW + PT / 2, PY + 1.2, 1.9], N = 10, sag = 0.9;
    let prev = A;
    for (let i = 1; i <= N; i++) {
      const t = i / N, p = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t - sag * 4 * t * (1 - t), A[2] + (B[2] - A[2]) * t];
      bar("dark", prev, p, 0.012);
      prev = p;
    }
    bar("dark", [MX + 0.06, CY + 1.8, MZ + 0.06], [MX + 0.06, MTOP - 1.25, MZ + 0.06], 0.012);
  }

  // ---------- potted plants ----------
  function plant(x, z, s, tall) {
    cyl("pot", x, z, D, D + 0.32 * s, 0.14 * s, 10, 0.19 * s);
    cyl("pot", x, z, D + 0.29 * s, D + 0.35 * s, 0.21 * s, 10);
    const y = D + 0.35 * s;
    if (tall) { // upright leaves fanning out
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2, r = 0.22 * s;
        const tip = [x + Math.cos(a) * r, y + (0.55 + (i % 2) * 0.2) * s, z + Math.sin(a) * r];
        const side = [-Math.sin(a) * 0.05 * s, 0, Math.cos(a) * 0.05 * s];
        const base = [x, y - 0.02, z], mid = [x + Math.cos(a) * r * 0.5, y + 0.3 * s, z + Math.sin(a) * r * 0.5];
        const ref = [x - Math.cos(a) * 0.3, y, z - Math.sin(a) * 0.3];
        quad("leaf", base, [mid[0] + side[0], mid[1], mid[2] + side[2]], tip, [mid[0] - side[0], mid[1], mid[2] - side[2]], ref);
      }
    } else {
      ball("leaf", x, y + 0.18 * s, z, 0.26 * s, 0.2 * s, 0.26 * s);
      ball("leaf", x + 0.12 * s, y + 0.36 * s, z - 0.05 * s, 0.17 * s, 0.15 * s, 0.17 * s);
      ball("leaf", x - 0.13 * s, y + 0.32 * s, z + 0.08 * s, 0.15 * s, 0.13 * s, 0.15 * s);
    }
  }
  plant(-5.25, 3.3, 1.2, false);
  plant(-4.55, 3.4, 1.0, true);
  plant(-4.95, 2.7, 0.85, false);
  plant(-2.25, -0.6, 1.0, true);

  // ---------- folding chair, facing the front edge (+Z), yawed a little toward the lit side ----------
  {
    const cx = 0.9, cz = 1.4, yaw = 0.35, cs = Math.cos(yaw), sn = Math.sin(yaw);
    const W = (x, y, z) => [cx + x * cs + z * sn, D + y, cz - x * sn + z * cs]; // chair local -> world
    for (const sx of [-1, 1]) {
      const x = sx * 0.21;
      bar("chair", W(x, 0, -0.24), W(x, 0.86, -0.16), 0.014); // rear leg up into the back post
      bar("chair", W(x, 0, 0.26), W(x, 0.46, -0.12), 0.014); // front leg up to the seat's back
      bar("chair", W(x, 0.44, 0.22), W(x, 0.44, -0.16), 0.014); // seat side rail
      bar("chair", W(x * 0.98, 0.15, 0.17), W(x * 0.98, 0.44, 0.22), 0.012); // seat hanger
    }
    bar("chair", W(-0.21, 0.02, 0.26), W(0.21, 0.02, 0.26), 0.012); // foot rail
    bar("chair", W(-0.21, 0.02, -0.24), W(0.21, 0.02, -0.24), 0.012);
    const plate = (key, pts, th) => { // a thin slab from four corners (chair local), thickness th along local up/back
      const [a, b, e, d] = pts, o = th;
      hex(key, [W(...a), W(...b), W(...e), W(...d), W(a[0], a[1] + o, a[2]), W(b[0], b[1] + o, b[2]), W(e[0], e[1] + o, e[2]), W(d[0], d[1] + o, d[2])]);
    };
    plate("wall", [[-0.2, 0.45, -0.15], [0.2, 0.45, -0.15], [0.2, 0.45, 0.22], [-0.2, 0.45, 0.22]], 0.03); // seat
    hex("wall", [W(-0.21, 0.6, -0.15), W(0.21, 0.6, -0.15), W(0.21, 0.6, -0.12), W(-0.21, 0.6, -0.12),
      W(-0.21, 0.84, -0.17), W(0.21, 0.84, -0.17), W(0.21, 0.84, -0.14), W(-0.21, 0.84, -0.14)]); // back
  }

  // ---------- skyline: neighbouring blocks behind the back parapet ----------
  if (SKY) {
    const Z0 = -ZD - 2.4, Z1 = -ZD - 2.0;
    const blocks = [[-6.2, -2.4, 4.0], [-2.2, 1.6, 3.1], [1.9, 6.2, 4.7]];
    // lit windows: [block, column 0.. , floor 0..]
    const lit = [[0, 0, 3], [0, 2, 2], [0, 3, 3], [1, 1, 2], [2, 1, 3], [2, 3, 3], [2, 0, 2], [2, 2, 1]];
    for (const [x0, x1, h] of blocks) {
      box("city", x0, x1, 0, h, Z0, Z1);
      box("city", x0 - 0.05, x1 + 0.05, h, h + 0.12, Z0 - 0.05, Z1 + 0.05);
    }
    const bf = face("+z", Z1);
    for (const [bi, col, fl] of lit) {
      const [x0] = blocks[bi], u = x0 + 0.5 + col * 0.9, y = 0.9 + fl * 0.9;
      if (y + 0.45 > blocks[bi][2]) continue;
      wquad("glow", bf, u, u + 0.45, y, y + 0.4, 0.01);
    }
  }

  // ---------- meshes ----------
  const MAT = {
    wall: [c.wall, c.wallShade, 0.1, {}],
    deck: [c.deck, c.deck, 0.1, {}],
    dark: [c.dark, c.dark, 0.1, { outline: false }],
    net: [c.net, c.net, 0.1, { outline: false, doubleSided: true }],
    steel: [c.steel, c.steelShade, 0.1, { px: 2 }],
    pale: [c.pale, c.paleShade, 0.1, {}],
    door: [c.door, c.doorShade, 0.1, {}],
    pot: [c.pot, c.potShade, 0.1, {}],
    leaf: [c.dark, c.dark, 0.1, { px: 2, doubleSided: true }],
    chair: [c.chair, c.chairShade, 0.1, { px: 2 }],
    city: [c.city, c.city, 0.1, {}],
    glow: [c.glow, c.glow, -0.25, { outline: false }],
    bulb: [c.glow, c.glow, -0.25, { outline: false }],
    bulbDim: [c.deck, c.deck, 0.1, { outline: false }],
  };
  const meshes = {};
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, o] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, { threshold, ...o });
    mesh.name = key;
    body.add(mesh);
    meshes[key] = mesh;
  }

  const k = opts.height ? opts.height / MTOP : 1;
  body.scale.setScalar(k);

  // flicker: literal off-intervals (s) in a 4 s loop
  const OFF = [[0.9, 1.05], [1.12, 1.2], [1.28, 1.55], [2.95, 3.05], [3.4, 3.48]];
  const CLIPS = { flicker: 4 };
  function lamp(on) {
    meshes.bulb.visible = on;
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`apartment-rooftop: no clip "${m[1]}" (clips: flicker)`);
      const t = ((+m[2] % 4) + 4) % 4;
      return lamp(!OFF.some(([a, b]) => t >= a && t < b));
    }
    if (name !== "rest") throw new Error(`apartment-rooftop: unknown pose "${name}" (rest, or flicker@<seconds>)`);
    lamp(true);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
