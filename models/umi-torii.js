// umi-torii.js - a great vermilion torii standing in the sea at dusk (an original four-legged ryobu gate, studied from
// the kind of floating gate Itsukushima made famous), with its patch of shallow water, a shore strip, a stone lantern
// and gulls on mooring posts. Static set, plus one looping clip ("waves", 4 s) that moves the ripples.
// Contract: harness/lab/README.md. Meters, +Y up, the gate faces +Z (the shore side; you would row through it along -Z),
// its left is +X, stands on y = 0 (the sea floor), centred on x = 0, z = 0.
//
// Construction (everything a triangle soup merged per material: 14 meshes for the whole set):
//   HASHIRA   two big round main pillars (cylinders, 24 sides), leaning in a little, their tops buried in the shimaki.
//   SODE      the ryobu bracing: two thinner support legs in front of and behind each main pillar, tied to it by two
//             through-beams along z (at 3.3-3.9 and 6.3-6.9 m), each leg under its own little hipped cap (a vermilion
//             block and a black four-sided roof).
//   NUKI      the tie beam between the main pillars, sticking out past them, with a wedge (kusabi) outside each pillar.
//   GAKUZUKA  the centre post between nuki and shimaki, carrying a big plaque: a vermilion frame round a blank black board.
//   SHIMAKI / KASAGI  the double top beam: lofts along x whose centreline sweeps up toward the tips (sori = K * (|x| /
//             12.15)^2.3, K = 0.5 m); the kasagi's bottom edge stops short of its top edge, so the ends are cut on a slant;
//             vermilion below, a black roof band on top. Winding from the centreline point inboard of each triangle.
//   SEA       an elliptical slab of dark water (top at the tide level, its rim inked), over a sand floor with a low sandbar
//             under each pair of legs (it shows at low tide). Each leg wears a dark wet band from the floor to the
//             high-water mark (1.55 m), so at high tide a dark collar shows above the water and at low tide the whole stain.
//   RIPPLES   one flat, uninked mesh in the foam colour whose vertices pose() rewrites: a foam collar hugging every leg,
//             rock and post at the water line, rings that grow out of it and thin to nothing (two or three per source,
//             phased), and short glints lying across the hero view. A second rewritten mesh lays the gate's vermilion
//             reflection on the water as broken dashes running from each leg toward the hero camera (az 52 deg). The low
//             hero camera sees the water nearly edge-on, so these flat marks, the collars and the wet bands carry "in the sea".
//   ROCKS     six lumpy half-domes (faceted), barnacle clusters as small dark cones on their upper flanks.
//   SHORE     a sand bank loft along x at the front (+Z), its sea edge wavy, tapering out at both ends; a hexagonal stone
//             lantern (kiso, sao, chudai, a glowing hibukuro framed by six posts, kasa, hoju) on it at the image-left.
//   GULLS     three gulls (ellipsoid body and head, dark beak and folded wingtips) on three mooring posts to the image-right.
// Proportions (real size, base unit the main pillar diameter D = 2.2 m): kasagi tips 16.0 m (7.3 D), centre top 15.5;
// main pillars x +-5.5 at the floor, +-5.25 at 13.45 (opening ~8.7 m clear); support legs 0.9 m thick at z +-3.8 to
// 7.0 m, caps to 7.8; nuki 9.8-10.7 reach +-8.2; gakuzuka 10.7-13.45, plaque 2.3 x 2.6; shimaki 13.45-14.35 reach
// +-10.5; kasagi 14.3-15.15 (vermilion) + 15.12-15.5 (black), reach +-11.4 bottom / +-12.15 top. Water ellipse 31 x 23 m,
// tide level 0.12 (tide 0) to 0.9 m (tide 1); shore top 1.5 m; lantern 2.75 m; posts 2.0-2.7 m; gulls 0.55 m long.
// Options: build(THREE, kit, colors, { height, tide }).
//   height  kasagi tip height in m (default 16); the gate scales uniformly, the sea, shore, lantern and gulls stay real size.
//   tide    0 = low tide (water 0.12 m: the sandbars round the legs and the wet stains show), 1 = high tide (default).
// Clips: waves (4 s loop): pose("waves@1.5") rewrites the ripple and reflection meshes; "rest" is waves@0.
// Colours (eclipse, the dark red sunset): vermilion accent #ff3b3b / sky #2a1016 at threshold 0.1, so faces turned to the
// camera stay vermilion and only the far (-X) side and undersides go to the dusk shade. Black lacquer (kasagi roof band,
// leg caps, plaque board) sky / hair #1a1014 at 0.55. Wet bands sky / hair at -0.3 (one dark wine collar, a hair rim on the
// far side). Water hair / hair: the darkest field, set off by the ink rim and the marks on it. Ripples and glints line
// #f6e4e4, reflection accent, both single tone and uninked. Sand and rocks skin #e8b8a8 / sky; barnacles hair. Lantern
// line / sky, its light practical #f3f6ff. Posts sky / hair. Gulls sclera #f6f3ee / skin; beaks and wingtips hair.
// Eclipse can do water: it has two near-black reds (sky, hair) above the ink for a dark sea and a near-white (line) for
// the gleams, which is exactly the dusk-sea read; no fallback to festival was needed.

export const meta = {
  name: "umi-torii",
  height: 16.0,
  script: "eclipse",
  colors: {
    vermilion: "#ff3b3b", vermilionShade: "#2a1016",
    lacquer: "#2a1016", lacquerShade: "#1a1014",
    wet: "#2a1016", wetShade: "#1a1014",
    water: "#1a1014", waterShade: "#1a1014",
    foam: "#f6e4e4",
    reflection: "#ff3b3b",
    sand: "#e8b8a8", sandShade: "#2a1016",
    rock: "#e8b8a8", rockShade: "#2a1016",
    barnacle: "#1a1014",
    stone: "#2a1016", stoneShade: "#1a1014",
    glow: "#f3f6ff",
    post: "#2a1016", postShade: "#1a1014",
    gull: "#f6f3ee", gullShade: "#e8b8a8",
    gullDark: "#1a1014",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const height = opts.height ?? meta.height;
  const tide = Math.min(1, Math.max(0, opts.tide ?? 1));
  const k = height / meta.height; // gate scale
  const WL = 0.12 + 0.78 * tide; // water level
  const HW = 1.55; // high-water mark: top of the wet bands
  const root = new THREE.Group();
  root.name = "umi-torii";
  const gate = new THREE.Group(); // the gate's uniform scale lives here, so root stays the plain contract node
  gate.name = "gate";
  gate.scale.setScalar(k);
  const set = new THREE.Group();
  set.name = "set";
  root.add(gate, set);
  const joints = { gate };

  // ---------- triangle soups (positions + normals) ----------
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  // one flat triangle wound away from `ref` (a point inside the solid); slivers dropped
  function tri(key, a, b, e, ref) {
    const n = cross(sub(b, a), sub(e, a));
    const l = Math.hypot(...n);
    if (l < 1e-8) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    const flip = n[0] * (m[0] - ref[0]) + n[1] * (m[1] - ref[1]) + n[2] * (m[2] - ref[2]) < 0;
    const s = S(key), nn = flip ? [-n[0] / l, -n[1] / l, -n[2] / l] : [n[0] / l, n[1] / l, n[2] / l];
    s.p.push(...a, ...(flip ? e : b), ...(flip ? b : e));
    s.n.push(...nn, ...nn, ...nn);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  const M = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
    new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  // a three.js primitive (right winding by construction) placed by matrix m into a soup; flat = faceted normals
  function geo(key, g, m, flat = false) {
    let h = g.index ? g.toNonIndexed() : g;
    h.applyMatrix4(m);
    if (flat) h.computeVertexNormals();
    const P = h.attributes.position.array, N = h.attributes.normal.array, s = S(key);
    for (let i = 0; i < P.length; i++) (s.p.push(P[i]), s.n.push(N[i]));
    g.dispose();
    if (h !== g) h.dispose();
  }
  const box = (key, x, y, z, sx, sy, sz, ry = 0) => geo(key, new THREE.BoxGeometry(sx, sy, sz), M(x, y, z, 0, ry));

  // a beam along x: reach [bottom, top] half-lengths (slanted ends when they differ), bottom y0(x) / top y1(x), depth d
  function beam(key, { reach: [rb, rt], y0, y1, d, n = 16 }) {
    const zf = d / 2, zb = -d / 2, rings = [];
    for (let i = -n; i <= n; i++) {
      const u = i / n, xb = u * rb, xt = u * rt;
      rings.push([[xb, y0(xb), zb], [xb, y0(xb), zf], [xt, y1(xt), zf], [xt, y1(xt), zb]]);
    }
    const ref = (a, b, e) => { const rx = ((a[0] + b[0] + e[0]) / 3) * 0.95; return [rx, (y0(rx) + y1(rx)) / 2, 0]; };
    const T = (a, b, e) => tri(key, a, b, e, ref(a, b, e));
    for (let i = 0; i < rings.length - 1; i++) {
      const A = rings[i], B = rings[i + 1];
      for (let q = 0; q < 4; q++) { const q2 = (q + 1) % 4; T(A[q], A[q2], B[q]); T(A[q2], B[q2], B[q]); }
    }
    for (const R of [rings[0], rings[rings.length - 1]]) { T(R[0], R[1], R[2]); T(R[0], R[2], R[3]); }
  }

  // =====================================================================================================  THE GATE
  const XB = 5.5, XT = 5.25, YT = 13.45, RB = 1.1, RT = 1.0; // main pillars
  const pillarX = (y) => XB + ((XT - XB) * y) / YT;
  const XS = 5.42, ZS = 3.8, RS = 0.45, YS = 7.0; // support legs
  for (const s of [1, -1]) {
    const y1 = YT + 0.25, len = Math.hypot(y1, pillarX(y1) - XB);
    geo("vermilion", new THREE.CylinderGeometry(RT, RB, len, 24), M(s * (XB + pillarX(y1)) / 2, y1 / 2 + 0.025, 0, 0, 0, s * Math.atan((XB - XT) / YT)));
    for (const z of [ZS, -ZS]) {
      geo("vermilion", new THREE.CylinderGeometry(RS, RS * 1.06, YS + 0.05, 16), M(s * XS, (YS + 0.05) / 2, z));
      box("vermilion", s * XS, YS + 0.16, z, 1.45, 0.34, 1.45); // cap block
      geo("lacquer", new THREE.ConeGeometry(1.1, 0.5, 4), M(s * XS, YS + 0.33 + 0.25, z, 0, Math.PI / 4), true); // hipped cap
    }
    for (const [ya, yb] of [[3.3, 3.9], [6.3, 6.9]]) { // through-beams along z: main pillar <-> support legs
      const xc = s * pillarX((ya + yb) / 2);
      box("vermilion", (xc + s * XS) / 2, (ya + yb) / 2, 0, 0.6, yb - ya, 2 * ZS + 1.6);
    }
    box("vermilion", s * (pillarX(10.7) + RT + 0.2), 10.82, 0, 0.26, 0.26, 0.85); // kusabi wedge on the nuki
  }
  beam("vermilion", { reach: [8.2, 8.2], y0: () => 9.8, y1: () => 10.7, d: 0.75, n: 4 }); // nuki
  box("vermilion", 0, (10.7 + YT) / 2, 0, 0.95, YT - 10.7 + 0.06, 0.75); // gakuzuka
  box("vermilion", 0, 12.05, 0.42, 2.3, 2.6, 0.3); // plaque frame
  box("lacquer", 0, 12.05, 0.6, 1.85, 2.15, 0.12); // the board itself, left blank
  const SR = 12.15, K = 0.5;
  const sori = (x) => K * Math.pow(Math.min(1, Math.abs(x) / SR), 2.3);
  beam("vermilion", { reach: [10.5, 10.5], y0: (x) => YT + sori(x), y1: (x) => 14.35 + sori(x), d: 1.05 }); // shimaki
  beam("vermilion", { reach: [11.4, 12.0], y0: (x) => 14.3 + sori(x), y1: (x) => 15.15 + sori(x), d: 1.35, n: 20 }); // kasagi
  beam("lacquer", { reach: [12.0, SR], y0: (x) => 15.12 + sori(x), y1: (x) => 15.5 + sori(x), d: 1.42, n: 20 }); // roof band

  // ========================================================================================================  THE SEA
  // leg footprints in set metres (the gate group is scaled by k)
  const legs = [];
  for (const s of [1, -1]) {
    legs.push({ x: s * pillarX(WL) * k, z: 0, r: (RB - ((RB - RT) * WL) / YT) * k, main: true });
    for (const z of [ZS, -ZS]) legs.push({ x: s * XS * k, z: z * k, r: RS * 1.06 * k, main: false });
  }
  for (const L of legs) // wet band from the floor to the high-water mark
    geo("wet", new THREE.CylinderGeometry(L.r + 0.035, L.r + 0.04, HW, L.main ? 24 : 16), M(L.x, HW / 2, L.z));
  const WX = 15.5, WZ = 11.5, WC = -0.5; // water ellipse
  geo("water", new THREE.CylinderGeometry(1, 1, WL, 56), M(0, WL / 2, WC, 0, 0, 0, WX, 1, WZ));
  for (const s of [1, -1]) // sandbars under each pair of legs
    geo("sand", new THREE.SphereGeometry(1, 20, 5, 0, Math.PI * 2, 0, Math.PI / 2), M(s * XS * k, 0, 0, 0, 0, 0, 2.9 * k + 0.4, 0.42, 5.4 * k + 0.6));

  // ---------- shore: a sand bank along x at the front ----------
  {
    const X0 = -16.5, X1 = 3.5, N = 22, ZB = 13.8, TOP = 1.4;
    const rings = [];
    for (let i = 0; i <= N; i++) {
      const x = X0 + ((X1 - X0) * i) / N;
      const e = Math.sqrt(Math.max(0.02, Math.min(1, (x - X0) / 3.5, (X1 - x) / 3.5)));
      const toe = 8.7 + 0.45 * Math.sin(0.5 * x + 1) + 0.25 * Math.sin(1.3 * x) + 2.6 * (1 - e);
      rings.push([[x, 0, toe], [x, TOP * e, toe + 1.7 * e], [x, TOP * e * 0.97, ZB], [x, 0, ZB]]);
    }
    for (let i = 0; i < N; i++) {
      const A = rings[i], B = rings[i + 1];
      const ref = [(A[0][0] + B[0][0]) / 2, 0.4, (A[0][2] + ZB) / 2];
      for (let q = 0; q < 4; q++) { const q2 = (q + 1) % 4; quad("sand", A[q], A[q2], B[q2], B[q], ref); }
    }
    for (const R of [rings[0], rings[N]]) {
      const ref = [R[0][0] + (R === rings[0] ? 1 : -1), 0.3, (R[0][2] + ZB) / 2];
      quad("sand", R[0], R[1], R[2], R[3], ref);
    }
  }

  // ---------- rocks with barnacles ----------
  const hash = (i) => { const v = Math.sin(i * 12.9898 + 4.1414) * 43758.5453; return v - Math.floor(v); };
  const ROCKS = [[-9.5, 3.6, 1.15, 1.3], [-2.2, 7.0, 0.8, 1.12], [9.0, 4.6, 0.95, 1.2], [2.6, -6.6, 1.0, 1.25], [-12.2, -4.2, 1.25, 1.38], [10.6, -6.4, 0.8, 1.1]];
  const bump = (x, y, z, i) => 1 + 0.13 * Math.sin(3.1 * x + 1.7 * z + i) + 0.09 * Math.sin(5.3 * z - 2.2 * y + 2 * i);
  ROCKS.forEach(([x, z, r, h], i) => {
    const g = new THREE.SphereGeometry(1, 11, 5, 0, Math.PI * 2, 0, Math.PI / 2).toNonIndexed();
    const P = g.attributes.position;
    for (let v = 0; v < P.count; v++) {
      const [px, py, pz] = [P.getX(v), P.getY(v), P.getZ(v)], f = bump(px, py, pz, i);
      P.setXYZ(v, px * f, py * (0.9 + 0.1 * f), pz * f * 0.85);
    }
    geo("rock", g, M(x, 0, z, 0, i * 1.3, 0, r, h, r), true);
    for (let j = 0; j < 9; j++) { // barnacle clusters on the upper flanks
      const th = 6.283 * hash(i * 31 + j), ph = 0.45 + 0.5 * hash(i * 17 + j + 7);
      const ux = Math.sin(ph) * Math.cos(th), uy = Math.cos(ph), uz = Math.sin(ph) * Math.sin(th), f = bump(ux, uy, uz, i);
      const lx = ux * f, ly = uy * (0.9 + 0.1 * f), lz = uz * f * 0.85;
      const ca = Math.cos(i * 1.3), sa = Math.sin(i * 1.3); // the rock's yaw
      const wx = x + r * (lx * ca + lz * sa), wy = h * ly, wz = z + r * (-lx * sa + lz * ca);
      if (wy < WL + 0.08) continue;
      geo("barnacle", new THREE.ConeGeometry(0.11, 0.1, 5), M(wx, wy + 0.01, wz, (ux - 0.0) * 0.6, 0, -ux * 0.6));
    }
  });

  // ---------- mooring posts and gulls ----------
  const POSTS = [[13.2, -1.6, 2.7, 0.6], [14.4, 1.6, 2.3, -0.5], [11.4, -5.0, 2.05, 2.2]];
  for (const [x, z, top, yaw] of POSTS) {
    geo("post", new THREE.CylinderGeometry(0.15, 0.18, top, 8), M(x, top / 2, z, 0, 0.3, 0));
    const G = M(x, top, z, 0, yaw, 0);
    const at = (x2, y2, z2, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => G.clone().multiply(M(x2, y2, z2, rx, ry, rz, sx, sy, sz));
    geo("gull", new THREE.SphereGeometry(1, 12, 8), at(0, 0.16, 0, -0.1, 0, 0, 0.115, 0.105, 0.28)); // body
    geo("gull", new THREE.SphereGeometry(0.072, 10, 7), at(0, 0.29, 0.2)); // head
    geo("gull", new THREE.SphereGeometry(1, 10, 6), at(0.085, 0.19, -0.04, -0.15, 0.06, 0, 0.055, 0.08, 0.25)); // folded wings
    geo("gull", new THREE.SphereGeometry(1, 10, 6), at(-0.085, 0.19, -0.04, -0.15, -0.06, 0, 0.055, 0.08, 0.25));
    geo("gullDark", new THREE.ConeGeometry(0.075, 0.24, 6), at(0, 0.21, -0.3, -Math.PI / 2 - 0.15, 0, 0, 1.4, 1, 0.55)); // wingtips
    geo("gullDark", new THREE.ConeGeometry(0.024, 0.1, 6), at(0, 0.28, 0.3, Math.PI / 2 + 0.1, 0, 0)); // beak
    geo("gullDark", new THREE.CylinderGeometry(0.014, 0.014, 0.1, 5), at(0.04, 0.03, 0.02)); // legs
    geo("gullDark", new THREE.CylinderGeometry(0.014, 0.014, 0.1, 5), at(-0.04, 0.03, 0.02));
  }

  // ---------- stone lantern on the shore ----------
  {
    const [lx, ly, lz] = [-11.6, 1.47, 11.8];
    const L = (key, g, y, ry = Math.PI / 6, flat = true) => geo(key, g, M(lx, ly + y, lz, 0, ry, 0), flat);
    L("stone", new THREE.CylinderGeometry(0.58, 0.66, 0.3, 6), 0.15); // kiso
    L("stone", new THREE.CylinderGeometry(0.17, 0.2, 1.05, 10), 0.8, 0, false); // sao
    L("stone", new THREE.CylinderGeometry(0.5, 0.32, 0.26, 6), 1.43); // chudai
    L("glow", new THREE.CylinderGeometry(0.31, 0.31, 0.5, 6), 1.81); // hibukuro light
    for (let j = 0; j < 6; j++) { // its six corner posts
      const a = (j * Math.PI) / 3;
      geo("stone", new THREE.BoxGeometry(0.1, 0.52, 0.1), M(lx + 0.33 * Math.cos(a), ly + 1.81, lz + 0.33 * Math.sin(a), 0, -a));
    }
    L("stone", new THREE.CylinderGeometry(0.8, 0.8, 0.08, 6), 2.1); // kasa lip
    L("stone", new THREE.ConeGeometry(0.8, 0.42, 6), 2.35); // kasa
    L("stone", new THREE.SphereGeometry(0.13, 10, 7), 2.62, 0, false); // hoju
    L("stone", new THREE.ConeGeometry(0.07, 0.14, 8), 2.78, 0, false);
  }

  // focus markers for close-ups (empty groups): the first gull, the lantern, the nearest rock
  for (const [name, x, y, z] of [["gull", POSTS[0][0], POSTS[0][2] + 0.2, POSTS[0][1]], ["lantern", -11.6, 2.8, 11.8], ["rock", ROCKS[1][0], 0.8, ROCKS[1][1]]]) {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    set.add(g);
    joints[name] = g;
  }

  // ---------- static meshes ----------
  const MAT = { // key: [base, shade, threshold, outline]
    vermilion: [c.vermilion, c.vermilionShade, 0.1, true],
    lacquer: [c.lacquer, c.lacquerShade, 0.55, true],
    wet: [c.wet, c.wetShade, -0.3, true],
    water: [c.water, c.waterShade, 0.1, true],
    sand: [c.sand, c.sandShade, 0.15, true],
    rock: [c.rock, c.rockShade, 0.25, true],
    barnacle: [c.barnacle, c.barnacle, 0.1, false],
    stone: [c.stone, c.stoneShade, 0.2, true],
    glow: [c.glow, c.glow, 0.1, true],
    post: [c.post, c.postShade, 0.1, true],
    gull: [c.gull, c.gullShade, 0.1, true],
    gullDark: [c.gullDark, c.gullDark, 0.1, true],
  };
  for (const [key, { p, n }] of Object.entries(soups)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, base, shade, { threshold, outline });
    mesh.name = key;
    (key === "vermilion" || key === "lacquer" ? gate : set).add(mesh);
  }

  // =================================================================================  RIPPLES (rewritten per frame)
  const TAU = Math.PI * 2, LOOP = 4;
  const frac = (v) => v - Math.floor(v);
  const HV = [Math.sin((52 * Math.PI) / 180), Math.cos((52 * Math.PI) / 180)]; // toward the hero camera, in plan (x, z)
  const HR = [HV[1], -HV[0]]; // across the hero view
  // ripple sources: centre, water-line radius, number of rings, how far they travel, ring width, collar width
  const SRC = legs.map((L) => ({ x: L.x, z: L.z, r: L.r + 0.04, n: L.main ? 3 : 2, span: L.main ? 4.2 : 2.6, w: L.main ? 0.75 : 0.5, seg: L.main ? 44 : 28 }));
  for (const [x, z, r, h] of ROCKS) if (WL < h) SRC.push({ x, z, r: r * 0.92 * Math.sqrt(1 - (WL / h) ** 2), n: 2, span: 2.2, w: 0.45, seg: 28 });
  for (const [x, z] of POSTS) SRC.push({ x, z, r: 0.19, n: 2, span: 1.4, w: 0.3, seg: 16 });
  SRC.forEach((s, i) => (s.off = hash(i + 101)));
  // glints: short streaks across the hero view, kept off the legs, rocks and shore
  const GL = [];
  for (let j = 0; GL.length < 40 && j < 600; j++) {
    const x = (hash(j * 3 + 1) * 2 - 1) * WX * 0.92, z = WC + (hash(j * 3 + 2) * 2 - 1) * WZ * 0.92;
    if ((x / WX) ** 2 + ((z - WC) / WZ) ** 2 > 0.8 || z > 8.2) continue;
    if (SRC.some((s) => Math.hypot(x - s.x, z - s.z) < s.r + 1.3)) continue;
    if (Math.abs(x - XS * k) < 3.2 * k + 0.4 && Math.abs(z) < 5.6 * k + 0.6 && tide < 0.5) continue; // dry sandbar
    GL.push({ x, z, len: 1.4 + 2.6 * hash(j * 7 + 5), w: 0.35 + 0.35 * hash(j * 5 + 3), ph: hash(j * 11 + 9) });
  }

  // emitters: flat triangles at height y, wound to face +Y
  function writer(arr) {
    let i = 0;
    // ref given: wound away from it (walls); else facing +Y
    const emit = (a, b, e, ref) => {
      let f;
      if (ref) {
        const n = cross(sub(b, a), sub(e, a));
        f = n[0] * (a[0] - ref[0]) + n[2] * (a[2] - ref[2]);
      } else f = (b[2] - a[2]) * (e[0] - a[0]) - (b[0] - a[0]) * (e[2] - a[2]);
      const v = f >= 0 ? [a, b, e] : [a, e, b];
      for (const p of v) { if (arr) arr.set(p, i); i += 3; }
    };
    return { emit, count: () => i };
  }
  function ring(emit, cx, cz, r, w, y, seg) {
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * TAU, a1 = ((i + 1) / seg) * TAU;
      const I0 = [cx + r * Math.cos(a0), y, cz + r * Math.sin(a0)], I1 = [cx + r * Math.cos(a1), y, cz + r * Math.sin(a1)];
      const O0 = [cx + (r + w) * Math.cos(a0), y, cz + (r + w) * Math.sin(a0)], O1 = [cx + (r + w) * Math.cos(a1), y, cz + (r + w) * Math.sin(a1)];
      emit(I0, O1, O0);
      emit(I0, I1, O1);
    }
  }
  // a flat strip centred at (cx, cz) along unit plan direction d, len long and w wide
  function strip(emit, cx, cz, d, len, w, y) {
    const [ax, az] = [(d[0] * len) / 2, (d[1] * len) / 2], [bx, bz] = [(-d[1] * w) / 2, (d[0] * w) / 2];
    const A = [cx - ax - bx, y, cz - az - bz], B = [cx + ax - bx, y, cz + az - bz], C = [cx + ax + bx, y, cz + az + bz], D = [cx - ax + bx, y, cz - az + bz];
    emit(A, B, C);
    emit(A, C, D);
  }
  // a short upright band (the foam lip where a leg meets the water), wound outward
  function lip(emit, cx, cz, r, y0, y1, seg) {
    const ref = [cx, 0, cz];
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * TAU, a1 = ((i + 1) / seg) * TAU;
      const P = (a, y) => [cx + r * Math.cos(a), y, cz + r * Math.sin(a)];
      emit(P(a0, y0), P(a1, y0), P(a1, y1), ref);
      emit(P(a0, y0), P(a1, y1), P(a0, y1), ref);
    }
  }
  function foam(emit, t) {
    const u = t / LOOP;
    for (const s of SRC) {
      lip(emit, s.x, s.z, s.r + 0.01, WL - 0.02, WL + 0.2 + 0.08 * Math.sin(TAU * (u + s.off) + 1), s.seg);
      ring(emit, s.x, s.z, s.r - 0.02, s.w * (0.75 + 0.2 * Math.sin(TAU * (u + s.off))), WL + 0.025, s.seg); // collar
      for (let q = 0; q < s.n; q++) {
        const ph = frac(u + q / s.n + s.off);
        ring(emit, s.x, s.z, s.r + 0.1 + ph * s.span, s.w * Math.min(1, ph * 5) * (1 - ph), WL + 0.02, s.seg);
      }
    }
    for (const g of GL) {
      const a = TAU * (u + g.ph), sh = 0.35 * Math.sin(a);
      strip(emit, g.x + HR[0] * sh, g.z + HR[1] * sh, HR, g.len * (0.75 + 0.25 * Math.cos(a)), g.w, WL + 0.015);
    }
  }
  function reflect(emit, t) {
    const u = t / LOOP;
    legs.forEach((L, li) => {
      const n = L.main ? 6 : 3;
      for (let j = 0; j < n; j++) {
        const d = L.r + 0.5 + j * (L.main ? 2.2 : 1.6) + 0.3 * Math.sin(TAU * u + j + li);
        const len = (L.main ? 1.3 : 0.9) * (1 - j * 0.08), w = 2 * L.r * (0.95 - j * 0.11) * (1 + 0.12 * Math.sin(TAU * (u + 0.25) + 2 * j + li));
        const sx = 0.25 * Math.sin(TAU * (u + j * 0.17)); // dashes drift sideways
        const px = L.x + HV[0] * d + HR[0] * sx, pz = L.z + HV[1] * d + HR[1] * sx;
        const wet = (px / WX) ** 2 + ((pz - WC) / WZ) ** 2 < 0.86 && pz < 8.0; // on open water (else drawn at zero size)
        strip(emit, px, pz, HR, wet ? w : 0, len, WL + 0.012);
      }
    });
  }
  function flatMesh(fill, color, name) {
    const probe = writer(null);
    fill(probe.emit, 0);
    const pos = new Float32Array(probe.count()), nrm = new Float32Array(probe.count());
    for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
    const mesh = kit.toon(g, color, color, { threshold: 0.1, outline: false });
    mesh.name = name;
    mesh.frustumCulled = false;
    set.add(mesh);
    return (t) => {
      fill(writer(pos).emit, t);
      g.attributes.position.needsUpdate = true;
      g.computeBoundingSphere();
      g.computeBoundingBox();
    };
  }
  const drawFoam = flatMesh(foam, c.foam, "ripples");
  const drawReflect = flatMesh(reflect, c.reflection, "reflection");

  // ---------- poses and clips ----------
  const CLIPS = { waves: LOOP };
  function waves(t) {
    const u = ((t % LOOP) + LOOP) % LOOP;
    drawFoam(u);
    drawReflect(u);
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`umi-torii: no clip "${m[1]}" (clips: waves)`);
      return waves(+m[2]);
    }
    if (name !== "rest") throw new Error(`umi-torii: unknown pose "${name}" (rest, or waves@<seconds>)`);
    waves(0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
