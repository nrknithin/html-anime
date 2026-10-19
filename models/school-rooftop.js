// school-rooftop.js - the anime school rooftop (okujo) set: a concrete deck behind a tall green chain-link fence, the
// stairwell penthouse with its steel door, a water tank on legs over it. Static; the stairwell door is a joint.
// Contract: harness/lab/README.md. Meters, +Y up, the door side faces +Z, its left is +X, stands on y = 0, centred on
// x = 0, z = 0. One set with models/school.js (same script, same colour roles): the rooftop that school stands under.
//
// Construction (boxes, flat quads and faceted cylinders, all triangle soups merged per material; flat-shaded, so planes
// read crisp; every triangle wound away from a point inside its solid or behind its quad, never by hand):
//   DECK      one concrete slab 16 x 10 m, its top at 0.2 m, a 0.3 m parapet round the edge (bottoms buried in the slab,
//             no coplanar faces). Expansion-joint seams on a ~2 m grid and a dark gutter strip along the parapet foot,
//             with square drain grates in the corners: quads 5-6 mm over the deck, no hull (the seams are lines).
//   FENCE     the identity cue: green steel posts every ~2 m on the parapet, a top and bottom rail (inked 2 px), and the
//             chain-link as two families of thin diagonal strips (double-sided quads, no hull) that cross into diamonds,
//             with an inward-canted top section (the anti-climb lean every anime okujo fence has).
//   PENTHOUSE the stairwell box (3 x 3 m, 2.7 m over the deck) at the back on the +X side (near the lit three-quarter camera) with a coping. A steel door in a dark
//             doorway on its +Z face under a little hood; a small window and a ladder on its lit +X face.
//   TANK      an upright water tank (faceted cylinder, two dark hoops, a manhole) on a four-legged braced steel stand
//             on the penthouse roof, a short ladder up its side.
//   PLANT     three AC outdoor units on a pad along the back on the -X side (pale boxes, a dark fan disc with a grille cross), a pipe
//             cover running to the penthouse, two mushroom vents on the deck.
// Proportions (real size, base unit the storey-ish 2.7 m penthouse): deck 16 x 10, top 0.2; parapet 0.3 x 0.2;
//   fence 2.5 over the deck (2.2 over the parapet, top 0.35 canted 0.25 inward); penthouse 3 x 3 x 2.7, coping 0.15;
//   door 0.9 x 2.0; tank stand 1.1, tank 1.5 dia x 1.4; top of the tank ladder rails 6.15.
// Options: build(THREE, kit, colors, { height, fence, door }).
//   height  scales the whole set uniformly so its top is `height` (as the torii and school do).
//   fence   false drops the fence; a number is its height over the deck in m (default 2.5).
//   door    0..1 opens the stairwell door outward (joint `door`, rotation.y, 0 shut, 1 = 100 deg); pose "open" is 1.
// Colours (meadow, as models/school.js), base / shade:
//   parapet, penthouse, coping, hood, tank, vents   moon #f7f3e1 / skin #f0c2ae, threshold 0.1
//   deck, unit pad                                  sky #d7ecef / skin #f0c2ae, threshold 0.1 (pale concrete off the walls' cream)
//   seams                                           moon #f7f3e1, one tone (pale lines on the sky deck)
//   chain-link                                      line #a9d16e / iris #3f8a47 (lighter than the posts, so the set reads through it)
//   gutters, drains, doorway, frames, fans, hoops   hair #2c5131, one tone (lines)
//   glass                                           sky #d7ecef, one tone
//   fence, ladders, tank stand, steel door          iris #3f8a47 / hair #2c5131, threshold 0.1
//   AC units, pipe cover                            sclera #f6f3ee / sky #d7ecef, threshold 0.1

export const meta = {
  name: "school-rooftop",
  height: 6.15,
  script: "meadow",
  colors: {
    wall: "#f7f3e1", wallShade: "#f0c2ae",
    stone: "#d7ecef", stoneShade: "#f0c2ae",
    seam: "#f7f3e1",
    net: "#a9d16e", netShade: "#3f8a47",
    frame: "#2c5131",
    glass: "#d7ecef", glassShade: "#d7ecef",
    fence: "#3f8a47", fenceShade: "#2c5131",
    unit: "#f6f3ee", unitShade: "#d7ecef",
  },
  poses: ["rest", "open"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const FENCE = opts.fence === false ? 0 : typeof opts.fence === "number" ? opts.fence : 2.5;
  const root = new THREE.Group();
  root.name = "school-rooftop";
  const body = new THREE.Group(); // uniform size scale lives here, root stays the plain contract node
  body.name = "body";
  root.add(body);
  const joints = {};

  // ---------- triangle soups (as school / house-japanese), one set per node ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const sets = { body: {}, door: {} };
  let soups = sets.body;
  const S = (key) => (soups[key] ??= []);
  function tri(key, a, b, e, ref) { // one triangle wound away from `ref`
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
  function box(key, x0, x1, y0, y1, z0, z1) {
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // a flat horizontal quad (deck lines), facing up
  const flat = (key, x0, x1, z0, z1, y) => quad(key, [x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [x0, y - 1, z0]);
  // upright faceted cylinder, capped
  function cyl(key, cx, cz, y0, y1, r, n = 20) {
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const p = (a, y) => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
      quad(key, p(a0, y0), p(a1, y0), p(a1, y1), p(a0, y1), [cx, (y0 + y1) / 2, cz]);
      tri(key, [cx, y1, cz], p(a0, y1), p(a1, y1), [cx, y1 - 1, cz]);
      tri(key, [cx, y0, cz], p(a0, y0), p(a1, y0), [cx, y0 + 1, cz]);
    }
  }
  // wall faces: local (u along the wall, y, o out of the wall) -> world
  const face = (side, at) => (u, y, o) =>
    side === "+z" ? [u, y, at + o] : side === "-z" ? [-u, y, at - o] : side === "+x" ? [at + o, y, -u] : [at - o, y, u];
  const wquad = (key, f, u0, u1, y0, y1, o) => quad(key, f(u0, y0, o), f(u1, y0, o), f(u1, y1, o), f(u0, y1, o), f((u0 + u1) / 2, (y0 + y1) / 2, o - 1));

  // ---------- dimensions ----------
  const XW = 8, ZD = 5, D = 0.2; // deck half-extents, deck top
  const PAR = 0.3, PT = 0.2, PY = D + PAR; // parapet height, thickness, top
  const HX0 = 3.4, HX1 = 6.4, HZ0 = -4.2, HZ1 = -1.2, HY = D + 2.7, CY = HY + 0.15; // penthouse, coping top
  const TX = (HX0 + HX1) / 2, TZ = (HZ0 + HZ1) / 2, TR = 0.75; // tank axis, radius
  const SY = CY + 1.1, TY0 = SY + 0.1, TY1 = TY0 + 1.4; // stand top, tank bottom / top
  const top = TY1 + 0.5; // the tank ladder's grab rails

  // ---------- deck and parapet ----------
  box("stone", -XW, XW, 0, D, -ZD, ZD);
  box("wall", -XW, XW, D - 0.1, PY, ZD - PT, ZD);
  box("wall", -XW, XW, D - 0.1, PY, -ZD, -ZD + PT);
  box("wall", -XW, -XW + PT, D - 0.1, PY, -ZD + 0.1, ZD - 0.1);
  box("wall", XW - PT, XW, D - 0.1, PY, -ZD + 0.1, ZD - 0.1);
  // gutters along the parapet foot, drain grates in the corners
  const IX = XW - PT, IZ = ZD - PT, GW = 0.14, y1 = D + 0.006, y2 = D + 0.01;
  flat("frame", -IX, IX, IZ - GW, IZ, y1);
  flat("frame", -IX, IX, -IZ, -IZ + GW, y1);
  flat("frame", -IX, -IX + GW, -IZ + GW, IZ - GW, y1);
  flat("frame", IX - GW, IX, -IZ + GW, IZ - GW, y1);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * (IX - 0.25), z = sz * (IZ - 0.25);
    flat("frame", x - 0.25, x + 0.25, z - 0.25, z + 0.25, y1);
  }
  // expansion-joint seams, ~2 m grid, stopping at the gutters and around the penthouse
  const SW = 0.035;
  for (let i = 1; i < 8; i++) {
    const x = -XW + i * 2;
    const zs = x > HX0 - 0.1 && x < HX1 + 0.1 ? [[HZ1, IZ - GW]] : [[-IZ + GW, IZ - GW]];
    for (const [z0, z1] of zs) flat("seam", x - SW, x + SW, z0, z1, y2);
  }
  for (const z of [-2.5, 0, 2.5]) {
    const runs = z > HZ0 - 0.1 && z < HZ1 + 0.1 ? [[-IX + GW, HX0], [HX1, IX - GW]] : [[-IX + GW, IX - GW]];
    for (const [x0, x1] of runs) flat("seam", x0, x1, z - SW, z + SW, y2);
  }

  // ---------- penthouse ----------
  const DX0 = HX0 + 0.5, DX1 = DX0 + 0.9, DY = D + 2.0, DR = 0.15; // doorway, its recess
  box("wall", HX0, HX1, D - 0.1, HY, HZ0, HZ1 - DR);
  box("wall", HX0, DX0, D - 0.1, HY, HZ1 - DR - 0.05, HZ1);
  box("wall", DX1, HX1, D - 0.1, HY, HZ1 - DR - 0.05, HZ1);
  box("wall", DX0 - 0.05, DX1 + 0.05, DY, HY, HZ1 - DR - 0.05, HZ1);
  box("frame", DX0 - 0.01, DX1 + 0.01, D, DY + 0.01, HZ1 - DR - 0.02, HZ1 - 0.1); // the dark stairwell behind the door
  box("wall", HX0 - 0.1, HX1 + 0.1, HY, CY, HZ0 - 0.1, HZ1 + 0.1); // coping
  box("wall", DX0 - 0.35, DX1 + 0.35, DY + 0.25, DY + 0.35, HZ1 - 0.1, HZ1 + 0.55); // door hood
  const pf = face("+z", HZ1);
  for (const [u0, u1, v0, v1] of [[DX0 - 0.07, DX0, D, DY + 0.07], [DX1, DX1 + 0.07, D, DY + 0.07], [DX0, DX1, DY, DY + 0.07]])
    wquad("frame", pf, u0, u1, v0, v1, 0.01); // door frame
  // small window on the lit +X face, toward the front
  const sf = face("+x", HX1);
  const wu = -(HZ1 - 0.85); // u on the +x face is -z
  wquad("frame", sf, wu - 0.42, wu + 0.42, D + 1.45, D + 2.2, 0.01);
  for (const s of [-1, 1]) wquad("glass", sf, wu + (s < 0 ? -0.36 : 0.03), wu + (s < 0 ? -0.03 : 0.36), D + 1.51, D + 2.14, 0.025);

  // ladder up the +X face, toward the back, with hoops over the coping
  function ladder(x, z0, z1, ya, yb, out) {
    for (const z of [z0, z1]) box("fence", x, x + 0.05, ya, yb, z - 0.025, z + 0.025);
    for (let y = ya + 0.3; y < yb - 0.1; y += 0.3) box("fence", x + 0.01, x + 0.04, y - 0.015, y + 0.015, z0, z1);
    for (const z of [z0, z1]) box("fence", x - out, x + 0.05, ya + 0.15, ya + 0.2, z - 0.02, z + 0.02); // stand-offs
  }
  ladder(HX1 + 0.18, HZ0 + 0.35, HZ0 + 0.8, D, CY + 0.9, 0.18);
  box("fence", HX1 - 0.3, HX1 + 0.23, CY + 0.85, CY + 0.9, HZ0 + 0.33, HZ0 + 0.37); // hand rails over the coping
  box("fence", HX1 - 0.3, HX1 + 0.23, CY + 0.85, CY + 0.9, HZ0 + 0.78, HZ0 + 0.82);

  // ---------- water tank on its stand ----------
  const L = 0.95;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box("fence", TX + sx * L - 0.05, TX + sx * L + 0.05, CY, SY, TZ + sz * L - 0.05, TZ + sz * L + 0.05);
  for (const y of [CY + 0.35]) {
    box("fence", TX - L, TX + L, y - 0.03, y + 0.03, TZ + L - 0.03, TZ + L + 0.03);
    box("fence", TX - L, TX + L, y - 0.03, y + 0.03, TZ - L - 0.03, TZ - L + 0.03);
    box("fence", TX + L - 0.03, TX + L + 0.03, y - 0.03, y + 0.03, TZ - L, TZ + L);
    box("fence", TX - L - 0.03, TX - L + 0.03, y - 0.03, y + 0.03, TZ - L, TZ + L);
  }
  box("fence", TX - L - 0.08, TX + L + 0.08, SY, TY0, TZ - L - 0.08, TZ + L + 0.08); // platform
  cyl("wall", TX, TZ, TY0, TY1, TR);
  for (const y of [TY0 + 0.45, TY0 + 0.95]) cyl("frame", TX, TZ, y - 0.035, y + 0.035, TR + 0.012);
  cyl("wall", TX, TZ, TY1, TY1 + 0.04, TR + 0.04); // lid rim
  cyl("frame", TX + 0.2, TZ + 0.15, TY1 + 0.04, TY1 + 0.14, 0.24, 12); // manhole
  ladder(TX + TR + 0.12, TZ - 0.2, TZ + 0.2, TY0, TY1 + 0.5, 0.12);

  // ---------- AC units, pipe cover, vents ----------
  const UZ = -IZ + 0.75;
  box("stone", -5.3, -0.9, D - 0.05, D + 0.12, UZ - 0.35, UZ + 0.3); // pad
  for (const x of [-4.6, -3.1, -1.6]) {
    const y0 = D + 0.12, uy = y0 + 0.62;
    box("unit", x - 0.6, x + 0.6, y0 + 0.06, uy, UZ - 0.25, UZ + 0.15);
    for (const sx of [-1, 1]) box("frame", x + sx * 0.5 - 0.04, x + sx * 0.5 + 0.04, y0, y0 + 0.06, UZ - 0.2, UZ + 0.1); // feet
    const ff = face("+z", UZ + 0.15), fx = x - 0.16, fy = y0 + 0.36, fr = 0.21;
    for (let i = 0; i < 16; i++) { // dark fan disc
      const a0 = (i / 16) * Math.PI * 2, a1 = ((i + 1) / 16) * Math.PI * 2;
      tri("frame", ff(fx, fy, 0.01), ff(fx + Math.cos(a0) * fr, fy + Math.sin(a0) * fr, 0.01), ff(fx + Math.cos(a1) * fr, fy + Math.sin(a1) * fr, 0.01), ff(fx, fy, -1));
    }
    wquad("unit", ff, fx - fr, fx + fr, fy - 0.012, fy + 0.012, 0.02); // grille cross
    wquad("unit", ff, fx - 0.012, fx + 0.012, fy - fr, fy + fr, 0.02);
    wquad("frame", ff, x + 0.24, x + 0.5, y0 + 0.14, y0 + 0.5, 0.01); // service panel line
    wquad("unit", ff, x + 0.26, x + 0.48, y0 + 0.16, y0 + 0.48, 0.015);
  }
  box("unit", -0.9, HX0, D, D + 0.14, UZ - 0.32, UZ - 0.18); // pipe cover to the penthouse
  for (const [x, z] of [[-5.4, 1.4], [1.2, -3.0]]) {
    cyl("wall", x, z, D, D + 0.85, 0.09, 10);
    cyl("wall", x, z, D + 0.85, D + 0.95, 0.24, 12); // mushroom cap
    cyl("wall", x, z, D + 0.95, D + 1.0, 0.15, 12);
  }

  // ---------- fence ----------
  if (FENCE > 0) {
    const FY = PY, FT = Math.max(0.6, FENCE - PAR - 0.35), LEAN = 0.35, IN = 0.25; // straight part, canted top
    function fence(a, b) { // a, b: [x, z] on the parapet centre line, running so that +o (left of a->b) is inward
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), d = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
      const P = (u, y, o = 0) => [a[0] + d[0] * u - d[1] * o, y, a[1] + d[1] * u + d[0] * o];
      const n = Math.max(1, Math.round(len / 2));
      const pb = (p, q, w, key = "fence") => { // a square bar from p to q, half-width w
        const t = sub(q, p), tl = Math.hypot(...t);
        let s = cross(t, [0, 1, 0]);
        if (Math.hypot(...s) < 1e-6) s = [1, 0, 0];
        const sl = Math.hypot(...s), sv = s.map((v) => (v / sl) * w);
        const uv = cross(sv, t).map((v) => (v / tl));
        const ul = Math.hypot(...uv), uu = uv.map((v) => (v / ul) * w);
        const C = (pt, i, j) => [pt[0] + sv[0] * i + uu[0] * j, pt[1] + sv[1] * i + uu[1] * j, pt[2] + sv[2] * i + uu[2] * j];
        hex(key, [C(p, -1, -1), C(p, 1, -1), C(p, 1, 1), C(p, -1, 1), C(q, -1, -1), C(q, 1, -1), C(q, 1, 1), C(q, -1, 1)]);
      };
      for (let i = 0; i <= n; i++) {
        const u = (len * i) / n;
        pb(P(u, FY), P(u, FY + FT + 0.03), 0.045);
        pb(P(u, FY + FT), P(u, FY + FT + LEAN, IN), 0.035);
      }
      pb(P(0, FY + 0.06), P(len, FY + 0.06), 0.03);
      pb(P(0, FY + FT), P(len, FY + FT), 0.035);
      pb(P(0, FY + FT + LEAN, IN), P(len, FY + FT + LEAN, IN), 0.03);
      // chain-link: two families of thin diagonals crossing into diamonds, on the straight part and the canted top
      const step = 0.26, hw = 0.011;
      const strips = (Y0, H, o0, o1) => {
        const Q = (u, t) => P(u, Y0 + t, o0 + (o1 - o0) * (t / H));
        for (const dir of [1, -1]) for (let s = -H; s < len; s += step) {
          const t0 = Math.max(0, -s), t1 = Math.min(H, len - s);
          if (t1 - t0 < 0.02) continue;
          const yA = dir > 0 ? t0 : H - t0, yB = dir > 0 ? t1 : H - t1;
          const ua = s + t0, ub = s + t1, k = hw * Math.SQRT2;
          quad("net", Q(ua - k, yA), Q(ub - k, yB), Q(ub + k, yB), Q(ua + k, yA), P((ua + ub) / 2, Y0 + H / 2, (o0 + o1) / 2 - 1));
        }
      };
      strips(FY + 0.06, FT - 0.06, 0, 0);
      strips(FY + FT, LEAN, 0, IN);
    }
    const ex = XW - PT / 2, ez = ZD - PT / 2;
    // +o is (-d.z, d.x): run each side so that points inward
    fence([ex, ez], [-ex, ez]);
    fence([-ex, -ez], [ex, -ez]);
    fence([ex, -ez], [ex, ez]);
    fence([-ex, ez], [-ex, -ez]);
  }

  // ---------- door (joint) ----------
  const door = new THREE.Group();
  door.name = "door";
  door.position.set(DX0, D, HZ1 - 0.04);
  body.add(door);
  joints.door = door;
  soups = sets.door;
  const DW = DX1 - DX0 - 0.02, DH = DY - D - 0.01;
  box("steel", 0.01, DW, 0, DH, -0.05, 0);
  const df = face("+z", 0);
  wquad("frame", df, 0.24, DW - 0.24, 1.3, 1.78, 0.005);
  wquad("glass", df, 0.28, DW - 0.28, 1.34, 1.74, 0.01);
  box("frame", DW - 0.2, DW - 0.08, 0.98, 1.04, 0, 0.07); // lever handle
  wquad("frame", df, 0.12, DW - 0.12, 0.12, 0.16, 0.005); // kick plate line

  // ---------- meshes ----------
  const MAT = {
    wall: [c.wall, c.wallShade, 0.1, {}],
    stone: [c.stone, c.stoneShade, 0.1, {}],
    seam: [c.seam, c.seam, 0.1, { outline: false }],
    frame: [c.frame, c.frame, 0.1, { outline: false }],
    glass: [c.glass, c.glassShade, -0.4, { outline: false }],
    fence: [c.fence, c.fenceShade, 0.1, { px: 2 }],
    net: [c.net, c.netShade, 0.1, { outline: false, doubleSided: true }],
    unit: [c.unit, c.unitShade, 0.1, {}],
    steel: [c.fence, c.fenceShade, 0.1, {}],
  };
  for (const [node, set] of [[body, sets.body], [door, sets.door]]) {
    for (const [key, arr] of Object.entries(set)) {
      const [base, shade, threshold, o] = MAT[key];
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
      g.computeVertexNormals();
      const mesh = kit.toon(g, base, shade, { threshold, ...o });
      mesh.name = node === door ? "door-" + key : key;
      node.add(mesh);
    }
  }

  const k = opts.height ? opts.height / top : 1;
  body.scale.setScalar(k);

  // door: 0 shut, 1 open 100 deg outward (hinge on its -X edge, so -rotation.y swings it toward +Z)
  function openDoor(a) {
    joints.door.rotation.set(0, -Math.max(0, Math.min(1, a)) * (100 / 180) * Math.PI, 0);
    root.updateMatrixWorld(true);
  }
  const REST = { rest: opts.door ?? 0, open: 1 };
  function pose(name) {
    if (!(name in REST)) throw new Error(`unknown pose "${name}" (rest, open)`);
    openDoor(REST[name]);
  }
  pose("rest");
  return { root, joints, pose, door: openDoor };
}
