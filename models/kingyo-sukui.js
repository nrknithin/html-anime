// kingyo-sukui.js - the summer-festival goldfish-scooping stall (kingyo-sukui), at real size: a pipe-frame booth under a
// striped canopy with a blank board on top and lit paper lanterns along the front, a long shallow plastic pool on two
// trestles full of goldfish, paper scoops (poi) in a holder, small bowls, a row of water bags each holding one fish, and
// low stools for the customers.
// Contract: harness/lab/README.md. Meters, +Y up, the customer side faces +Z, its left is +X, stands on y = 0,
// centred on x = 0, z = 0.
//
// Construction (boxes, lathes, spheres and small prisms as triangle soups, merged per material, so the whole stall is
// one mesh per material, 15 at most; every triangle is wound away from a point inside its solid, never by hand):
//   FRAME    four 6-sided steel pipes, the back pair taller, top beams, sloped side beams, trestles under the pool.
//   CANOPY   one inked white slab sloping forward, red stripe decals 3 mm off its faces (front to back), a scalloped
//            valance on the front lip and red side drops. The slab's hull draws the outline, so stripe seams never ink.
//   BOARD    a blank wooden board standing on the front beam above the canopy lip (no lettering, by design).
//   LANTERNS seven lit chochin on a cord under the valance: practical paper at threshold -1 (one flat glow tone, the
//            night festival), black caps, two dark rib rings.
//   POOL     a long, shallow tub on trestles, low so customers reach it from the stools: indigo walls (festival has no
//            blue; its sky indigo stands in for the plastic's blue), a white rolled rim, the water a flat indigo plane
//            just under the rim. Water reads as water by what lies on it: pale ripple rings and the lanterns' amber
//            reflections stretched toward the viewer, and fish breaking the surface.
//   FISH     red, amber and a few black (demekin, with pale bulging eyes) goldfish: an ellipsoid body half under the
//            water plane and a two-lobed fan tail. Each fish and each tail is an owner: pose() rewrites the vertices of
//            the fish meshes from per-owner matrices (positions, normals and hull normals), so 40 fish are 3 meshes.
//            Fish are ~1.4x a real stall goldfish (0.12 m with the tail): smaller fish drop under a pixel at hero size.
//   KIT      a crate at the front +X corner with a holder of poi (red rings, white paper, red handles) and a stack of
//            bowls; one bowl on the rim before each stool. Water bags (white, red tie, one fish each): five on a rod
//            before a dark board on the red-and-white back curtain, four on a low rail along the open +X side with
//            their fish turned outward, so the hero sees goldfish. Each bag is an owner and sways about its tie.
//   STOOLS   three low wooden stools in front of the pool.
// Proportions (real size, base unit the canopy width W = 3.0 m): canopy 3.0 x 1.95 at 2.15 (front) - 2.45 (back);
//   pipes 48 mm at x +-1.42, z +0.85 / -0.90; board 2.5 x 0.4 on top of the front (top 2.6 = height); lanterns
//   0.15 x 0.20 every 0.42 m, centres at 1.86; pool 2.2 x 0.9 x 0.2, rim 0.44, water 0.415; stools 0.26 high;
//   bags 0.2 x 0.27 on rods at 1.62 (back) and 1.32 (side); poi 0.09 across.
// Options: build(THREE, kit, colors, { height = 2.6, fish = 40 }). height scales the whole stall uniformly (the board's
//   top); fish is the pool's goldfish count, 4..60 (every 8th black, every 3rd amber, the rest red).
// Clips: swim (6 s): each fish runs its own closed Lissajous loop round the pool with integer frequencies and a periodic
//   time warp, so it darts and coasts, its tail beating; the bags sway on their ties. t = 6 equals t = 0 exactly.
// Budget: 13.9k triangles at the defaults (fish 60: 15.8k), 14 meshes.
// Hero note: the lab's hero looks up from ~0.45 m, level with the pool's rim, so the water is edge-on there; the pool's
//   fish read from three4/top and any camera above ~1 m. The bags carry the goldfish to the hero.
// Colours (festival), base / shade:
//   canopy, curtain, bowls, poi paper    sclera #f6f3ee / skin #f0c2ae
//   stripes, side drops, poi, ties       accent #ff4d6d / sky #24143a
//   pipes, trestles, pool, bag board     sky #24143a / hair #1a1020 (above ink)
//   sign board, stools, crate            moon #ffd7a1 / skin #f0c2ae
//   lanterns (lit)                       practical #ffb020 flat
//   caps, cord, ribs, black fish         hair #1a1020 flat
//   rim, water bags                      line #fff1ea / skin #f0c2ae
//   water                                sky #24143a flat; ripples and eyes line #fff1ea flat; reflections practical flat
//   red fish                             accent #ff4d6d / accent (flat, so a shaded flank never sinks into the water)
//   amber fish                           practical #ffb020 / accent #ff4d6d

export const meta = {
  name: "kingyo-sukui",
  height: 2.6,
  script: "festival",
  colors: {
    canvas: "#f6f3ee", canvasShade: "#f0c2ae",
    stripe: "#ff4d6d", stripeShade: "#24143a",
    frame: "#24143a", frameShade: "#1a1020",
    wood: "#ffd7a1", woodShade: "#f0c2ae",
    glow: "#ffb020",
    black: "#1a1020",
    rim: "#fff1ea", rimShade: "#f0c2ae",
    water: "#24143a",
    ripple: "#fff1ea",
    fishRed: "#ff4d6d",
    fishAmber: "#ffb020", fishAmberShade: "#ff4d6d",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, fish: FN = 40 } = opts;
  if (!(FN >= 4 && FN <= 60)) throw new Error(`kingyo-sukui: fish ${FN} out of range (4..60)`);
  const root = new THREE.Group();
  root.name = "kingyo-sukui";
  const stall = new THREE.Group(); // the uniform size scale lives here, so root stays the plain contract node
  stall.name = "stall";
  stall.scale.setScalar(height / meta.height);
  root.add(stall);
  const joints = {};

  // ---------- soups: key -> positions, normals, owner per vertex (-1 static) ----------
  const soups = {};
  let OWN = -1;
  const S = (key) => (soups[key] ??= { p: [], n: [], o: [] });
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
  function tri(key, a, b, e, ref) { // a flat triangle wound away from `ref`
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    const flip = dot(n, sub(m, ref)) < 0;
    n = norm(flip ? n.map((x) => -x) : n);
    const s = S(key);
    s.p.push(...a, ...(flip ? [...e, ...b] : [...b, ...e]));
    s.n.push(...n, ...n, ...n);
    s.o.push(OWN, OWN, OWN);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function hex(key, p) { // p[0..3] one face, p[4..7] the opposite face in the same order
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, x0, x1, y0, y1, z0, z1) {
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // a convex polygon (x, z) extruded between y0 and y1
  function prism(key, pts, y0, y1) {
    const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length, cz = pts.reduce((s, q) => s + q[1], 0) / pts.length;
    const ref = [cx, (y0 + y1) / 2, cz], L = pts.map(([x, z]) => [x, y0, z]), U = pts.map(([x, z]) => [x, y1, z]);
    for (let k = 1; k < pts.length - 1; k++) (tri(key, L[0], L[k], L[k + 1], ref), tri(key, U[0], U[k], U[k + 1], ref));
    for (let k = 0; k < pts.length; k++) { const j = (k + 1) % pts.length; quad(key, L[k], L[j], U[j], U[k], ref); }
  }
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), SV = new THREE.Vector3();
  function push(key, g) {
    const s = S(key), P = g.attributes.position.array;
    s.p.push(...P);
    s.n.push(...g.attributes.normal.array);
    for (let i = 0; i < P.length / 3; i++) s.o.push(OWN);
  }
  function add(key, geo, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    M4.compose(V.set(...pos), Q.setFromEuler(E.set(...rot)), SV.set(...scl));
    g.applyMatrix4(M4);
    push(key, g);
  }
  const PIPE = new THREE.CylinderGeometry(1, 1, 1, 6, 1);
  function pipe(key, a, b, r) { // a 6-sided capped pipe from a to b
    const d = sub(b, a), L = Math.hypot(...d);
    Q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...norm(d)));
    const g = PIPE.toNonIndexed();
    M4.compose(V.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), Q, SV.set(r, L, r));
    g.applyMatrix4(M4);
    push(key, g);
  }
  const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const SPH = new THREE.SphereGeometry(1, 10, 6), SPH_S = new THREE.SphereGeometry(1, 8, 5);
  const TAU = Math.PI * 2;

  // ---------- frame ----------
  const AX = 1.5, AZ0 = -0.98, AZ1 = 0.97, AY0 = 2.45, AY1 = 2.15, AT = 0.025; // canopy
  const yTop = (z) => AY0 + ((AY1 - AY0) * (z - AZ0)) / (AZ1 - AZ0);
  const PX = 1.42, PZF = 0.85, PZB = -0.9, PR = 0.024;
  for (const x of [-PX, PX]) {
    for (const z of [PZF, PZB]) {
      pipe("frame", [x, 0, z], [x, yTop(z) - AT - 0.005, z], PR);
      box("frame", x - 0.05, x + 0.05, 0, 0.012, z - 0.05, z + 0.05);
    }
    pipe("frame", [x, yTop(PZF) - AT - 0.03, PZF], [x, yTop(PZB) - AT - 0.03, PZB], PR * 0.85);
  }
  pipe("frame", [-PX, yTop(PZF) - AT - 0.03, PZF], [PX, yTop(PZF) - AT - 0.03, PZF], PR * 0.85);
  pipe("frame", [-PX, yTop(PZB) - AT - 0.03, PZB], [PX, yTop(PZB) - AT - 0.03, PZB], PR * 0.85);
  // back curtain: a red-and-white kohaku maku, the dark bag board on it
  const KZ = -0.93, KY = yTop(KZ) - AT;
  box("canvas", -PX, PX, 0.03, KY, KZ - 0.01, KZ + 0.01);
  for (let i = 0, KN = 15, KW = (2 * PX) / KN; i < KN; i += 2) { // kohaku: red decal stripes on both faces
    const x0 = -PX + i * KW, x1 = x0 + KW;
    for (const z of [KZ + 0.013, KZ - 0.013]) quad("stripe", [x0, 0.03, z], [x1, 0.03, z], [x1, KY, z], [x0, KY, z], [x0, 0.5, KZ]);
  }
  box("frame", -1.3, 1.3, 1.05, 1.85, KZ + 0.016, KZ + 0.04);

  // ---------- canopy: white slab + red stripe decals ----------
  const NS = 11, SW = (2 * AX) / NS, red = (i) => i % 2 === 0;
  const top = (x, z) => [x, yTop(z), z], bot = (x, z) => [x, yTop(z) - AT, z];
  hex("canvas", [bot(-AX, AZ0), bot(AX, AZ0), bot(AX, AZ1), bot(-AX, AZ1), top(-AX, AZ0), top(AX, AZ0), top(AX, AZ1), top(-AX, AZ1)]);
  const slopeN = norm([0, AZ1 - AZ0, AY0 - AY1]);
  const off = (p, k) => [p[0], p[1] + slopeN[1] * k, p[2] + slopeN[2] * k];
  for (let i = 0; i < NS; i++) {
    if (!red(i)) continue;
    const x0 = -AX + i * SW, x1 = x0 + SW;
    quad("stripe", off(top(x0, AZ0), 0.003), off(top(x1, AZ0), 0.003), off(top(x1, AZ1), 0.003), off(top(x0, AZ1), 0.003), [0, 0, 0]);
    quad("stripe", off(bot(x0, AZ0), -0.003), off(bot(x1, AZ0), -0.003), off(bot(x1, AZ1), -0.003), off(bot(x0, AZ1), -0.003), [0, 5, 0]);
  }
  for (const s of [-1, 1]) { // red side drops under the edge stripes
    const x = s * (AX - 0.006), d = 0.1;
    hex("stripeSolid", [bot(x - 0.006, AZ0), bot(x + 0.006, AZ0), bot(x + 0.006, AZ1), bot(x - 0.006, AZ1),
      [x - 0.006, yTop(AZ0) - AT - d, AZ0], [x + 0.006, yTop(AZ0) - AT - d, AZ0], [x + 0.006, yTop(AZ1) - AT - d, AZ1], [x - 0.006, yTop(AZ1) - AT - d, AZ1]]);
  }
  // front valance, one scallop per stripe
  const VZ = AZ1 + 0.002, VT = 0.012, VD = 0.12, VS = 0.07;
  const hem = (u) => -VD - VS * Math.sin(Math.PI * u);
  const vShape = new THREE.Shape();
  vShape.moveTo(-AX, 0);
  vShape.lineTo(-AX, -VD);
  for (let i = 0; i < NS; i++) for (let k = 1; k <= 6; k++) vShape.lineTo(-AX + (i + k / 6) * SW, hem(k / 6));
  vShape.lineTo(AX, 0);
  vShape.lineTo(-AX, 0);
  add("canvas", new THREE.ExtrudeGeometry(vShape, { depth: VT, bevelEnabled: false }), [0, AY1, VZ]);
  for (let i = 0; i < NS; i++) {
    if (!red(i)) continue;
    const x0 = -AX + i * SW, pts = [[x0, 0], [x0, -VD]];
    for (let k = 1; k <= 6; k++) pts.push([x0 + (k / 6) * SW, hem(k / 6)]);
    pts.push([x0 + SW, 0]);
    for (const [zf, ref] of [[VZ + VT + 0.003, VZ], [VZ - 0.003, VZ + VT]]) {
      const P = pts.map(([x, y]) => [x, AY1 + y, zf]);
      for (let k = 1; k < P.length - 1; k++) tri("stripe", P[0], P[k], P[k + 1], [P[0][0], P[0][1], ref]);
    }
    const x1 = x0 + SW, z = AZ1 + 0.003; // the slab's front lip
    quad("stripe", [x0, AY1 - AT, z], [x1, AY1 - AT, z], [x1, AY1, z], [x0, AY1, z], [0, AY1, 0]);
  }

  // ---------- top board: blank, standing on the front lip ----------
  const BDZ = AZ1 - 0.06;
  box("wood", -1.25, 1.25, AY1 + 0.03, 2.6, BDZ - 0.025, BDZ);
  box("frame", -1.29, 1.29, 2.56, 2.6, BDZ - 0.032, BDZ + 0.007); // dark top cap
  for (const x of [-1.29, 1.25]) box("frame", x, x + 0.04, AY1 + 0.0, 2.56, BDZ - 0.032, BDZ + 0.007); // side posts

  // ---------- lanterns (lit) ----------
  const LR = 0.075, LH = 0.1, LY = 1.86, LZ = AZ1 + 0.05, LN = 7, LSP = 0.42;
  const lprof = [];
  for (let k = 0; k <= 10; k++) {
    const t = -1 + (2 * k) / 10;
    lprof.push(new THREE.Vector2(LR * Math.sqrt(Math.max(0, 1 - 0.72 * t * t)), LH * t));
  }
  const LBODY = new THREE.LatheGeometry(lprof, 12);
  const CAP = new THREE.CylinderGeometry(0.042, 0.042, 0.022, 10);
  const RIB = new THREE.TorusGeometry(1, 0.0035, 3, 10);
  const cordY = AY1 - VD - 0.005;
  pipe("black", [-AX + 0.04, cordY, LZ], [AX - 0.04, cordY, LZ], 0.005);
  const lanternX = [];
  for (let i = 0; i < LN; i++) {
    const x = (i - (LN - 1) / 2) * LSP;
    lanternX.push(x);
    add("glow", LBODY, [x, LY, LZ]);
    add("black", CAP, [x, LY + LH + 0.006, LZ]);
    add("black", CAP, [x, LY - LH - 0.006, LZ]);
    for (const t of [-0.45, 0.45]) {
      const r = LR * Math.sqrt(1 - 0.72 * t * t) + 0.001;
      add("black", RIB, [x, LY + LH * t, LZ], [Math.PI / 2, 0, 0], [r, r, 1]);
    }
    pipe("black", [x, LY + LH + 0.017, LZ], [x, cordY, LZ], 0.003);
  }

  // ---------- pool on trestles ----------
  const PX0 = -1.1, PX1 = 1.1, PZ0 = -0.45, PZ1 = 0.45, PB = 0.24, PT = 0.44, WT = 0.03, WY = 0.415;
  box("frame", PX0 + 0.01, PX1 - 0.01, PB, PB + 0.02, PZ0 + 0.01, PZ1 - 0.01); // floor
  for (const [x0, x1, z0, z1] of [[PX0, PX1, PZ0, PZ0 + WT], [PX0, PX1, PZ1 - WT, PZ1], [PX0, PX0 + WT, PZ0, PZ1], [PX1 - WT, PX1, PZ0, PZ1]])
    box("frame", x0, x1, PB, PT - 0.012, z0, z1);
  const RW = 0.04; // rolled rim, a little proud of the walls
  for (const [x0, x1, z0, z1] of [[PX0 - 0.01, PX1 + 0.01, PZ0 - 0.01, PZ0 + RW], [PX0 - 0.01, PX1 + 0.01, PZ1 - RW, PZ1 + 0.01],
    [PX0 - 0.01, PX0 + RW, PZ0 + RW, PZ1 - RW], [PX1 - RW, PX1 + 0.01, PZ0 + RW, PZ1 - RW]])
    box("rim", x0, x1, PT - 0.025, PT, z0, z1);
  quad("water", [PX0 + WT, WY, PZ0 + WT], [PX1 - WT, WY, PZ0 + WT], [PX1 - WT, WY, PZ1 - WT], [PX0 + WT, WY, PZ1 - WT], [0, 0, 0]);
  for (const x of [-0.75, 0.75]) { // trestles: splayed legs and a cross bar
    for (const s of [-1, 1]) {
      pipe("frame", [x, PB, s * 0.32], [x, 0.012, s * 0.42], 0.018);
      pipe("frame", [x - 0.08, PB, s * 0.32], [x - 0.08, 0.012, s * 0.42], 0.018);
    }
    box("frame", x - 0.11, x + 0.03, PB - 0.04, PB, -0.38, 0.38);
    pipe("frame", [x - 0.04, 0.09, -0.39], [x - 0.04, 0.09, 0.39], 0.013);
  }
  // ripples and lantern reflections on the water
  const RING = new THREE.RingGeometry(0.9, 1, 18, 1);
  const rip = [[-0.82, -0.22, 0.07], [-0.35, 0.18, 0.09], [0.12, -0.25, 0.06], [0.55, 0.12, 0.08], [0.9, -0.15, 0.06], [-0.05, 0.3, 0.05], [-0.6, 0.05, 0.05]];
  for (const [x, z, r] of rip) for (const k of [1, 0.6]) add("ripple", RING, [x, WY + 0.002, z], [-Math.PI / 2, 0, 0], [r * k * 1.4, r * k, 1]);
  const DISC = new THREE.CircleGeometry(1, 12);
  for (const x of lanternX) if (Math.abs(x) < 1.0) {
    for (const [z, w, l] of [[0.33, 0.022, 0.05], [0.21, 0.016, 0.04], [0.11, 0.01, 0.025]])
      add("reflect", DISC, [x + 0.01 * Math.sin(z * 40), WY + 0.0015, z], [-Math.PI / 2, 0, 0], [w, l, 1]);
  }

  // ---------- crate with the poi holder and bowls (front +X corner) ----------
  const CXc = 0.92, CZc = 0.7;
  box("wood", CXc - 0.16, CXc + 0.16, 0, 0.32, CZc - 0.13, CZc + 0.13);
  box("frame", CXc - 0.16, CXc + 0.16, 0.12, 0.14, CZc + 0.13, CZc + 0.136); // slat line on the face
  box("stripeSolid", CXc - 0.13, CXc - 0.01, 0.32, 0.4, CZc - 0.07, CZc + 0.05); // holder box
  const PRING = new THREE.TorusGeometry(0.045, 0.006, 5, 16), PDISC = new THREE.CylinderGeometry(0.043, 0.043, 0.003, 16);
  for (let k = 0; k < 4; k++) {
    const x = CXc - 0.11 + k * 0.03, z = CZc - 0.04 + (k % 2) * 0.05, rz = (k - 1.5) * 0.16, y = 0.52 + (k % 2) * 0.03;
    add("stripeSolid", PRING, [x, y, z], [0, 0, rz]);
    add("canvas", PDISC, [x, y, z], [Math.PI / 2, 0, rz]);
    pipe("stripeSolid", [x + Math.sin(rz) * 0.045, y - Math.cos(rz) * 0.045, z], [x + Math.sin(rz) * 0.16, y - Math.cos(rz) * 0.16, z], 0.008);
  }
  const BOWL = new THREE.CylinderGeometry(0.06, 0.042, 0.035, 12);
  for (let k = 0; k < 4; k++) add("canvas", BOWL, [CXc + 0.08, 0.338 + k * 0.02, CZc + 0.02]);

  // ---------- stools, a bowl on the rim before each ----------
  for (const x of [-0.85, -0.2, 0.45]) {
    const z = 0.78, h = 0.26, s = 0.14;
    box("wood", x - s, x + s, h - 0.035, h, z - s, z + s);
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]])
      box("wood", x + dx * (s - 0.02) - 0.018, x + dx * (s - 0.02) + 0.018, 0, h - 0.035, z + dz * (s - 0.02) - 0.018, z + dz * (s - 0.02) + 0.018);
    box("wood", x - s + 0.02, x + s - 0.02, 0.08, 0.1, z + s - 0.03, z + s - 0.01);
    add("canvas", BOWL, [x + 0.18, PT + 0.018, PZ1 - 0.02]);
  }

  // ---------- moving parts: owners ----------
  // owner matrices are rebuilt per frame; geometry below is authored in each owner's local frame.
  const owners = []; // { kind: "fish"|"tail"|"bag", ... }
  const TAIL_L = [[-0.03, 0], [-0.084, 0.036], [-0.07, 0.003]];
  const TAIL_R = TAIL_L.map(([x, z]) => [x, -z]);
  function fishGeo(key, y0, black) { // body in the current owner, tail in the next
    if (black) add(key, SPH_S, [0, 0, 0], [0, 0, 0], [0.038, 0.02, 0.026]);
    else add(key, SPH_S, [0, 0, 0], [0, 0, 0], [0.042, 0.017, 0.021]);
    if (black) for (const s of [-1, 1]) add("ripple", SPH_S, [0.026, 0.013, s * 0.024], [0, 0, 0], [0.014, 0.011, 0.014]);
    OWN++;
    prism(key, TAIL_L, y0 - 0.002, y0 + 0.002);
    prism(key, TAIL_R, y0 - 0.002, y0 + 0.002);
  }
  // pool fish: each owns a loop (centre, amplitudes, integer frequencies, phases) and a time warp
  const IX0 = PX0 + WT + 0.09, IX1 = PX1 - WT - 0.09, IZ0 = PZ0 + WT + 0.08, IZ1 = PZ1 - WT - 0.08;
  for (let i = 0; i < FN; i++) {
    const black = i % 8 === 5, key = black ? "fishBlack" : i % 3 === 1 ? "fishAmber" : "fishRed";
    const h = (k) => hash(i * 13 + k);
    const ax = 0.12 + 0.4 * h(1), az = 0.06 + 0.12 * h(2);
    const cx = IX0 + ax + (IX1 - IX0 - 2 * ax) * ((i + 0.5 * h(3)) / FN), cz = IZ0 + az + (IZ1 - IZ0 - 2 * az) * h(4);
    const f = { kind: "fish", cx, cz, ax, az, nx: 1, nz: h(5) < 0.5 ? 1 : 2, px: TAU * h(6), pz: TAU * h(7), dir: h(8) < 0.5 ? 1 : -1,
      wk: 0.55 + 0.3 * h(9), wm: 2 + Math.floor(h(10) * 3), wp: TAU * h(11), beat: 5 + Math.floor(h(12) * 4), y: WY - 0.006 + 0.0012 * (i % 5) };
    f.nz = f.nz === 1 && Math.abs(Math.sin(f.px - f.pz)) < 0.3 ? 2 : f.nz; // keep 1:1 loops from collapsing to a line
    OWN = owners.length;
    owners.push(f);
    owners.push({ kind: "tail", fish: owners.length - 1 });
    fishGeo(key, 0.006, black);
  }
  OWN = -1;
  // water bags on a rod before the back board
  const BZ = KZ + 0.12, BY = 1.62, BR = 0.1, BH = 0.27, BN = 5;
  pipe("frame", [-PX, BY, BZ], [PX, BY, BZ], 0.012);
  for (const s of [-1, 1]) pipe("frame", [s * PX, BY, BZ], [s * PX, BY, PZB], 0.01);
  const bprof = [];
  for (let k = 0; k <= 10; k++) { // round bottom narrowing to a tied neck
    const t = k / 10, r = t < 0.5 ? BR * Math.sqrt(Math.max(0, 1 - ((0.5 - t) / 0.5) ** 2)) : BR + (0.012 - BR) * ((t - 0.5) / 0.5) ** 1.3;
    bprof.push(new THREE.Vector2(Math.max(0.0005, r), -BH + BH * t));
  }
  const BAG = new THREE.LatheGeometry(bprof, 10), BTAIL = new THREE.ConeGeometry(1, 1, 3);
  // the back row on the board, and a side row on a rail along the +X side (fish turned to face out of the stall)
  const SX = PX, SY = 1.32;
  pipe("frame", [SX, SY, PZB], [SX, SY, PZF], 0.011);
  const bags = [];
  for (let k = 0; k < BN; k++) bags.push([-0.96 + k * 0.48, BY, BZ, 0]);
  for (let k = 0; k < 4; k++) bags.push([SX, SY, -0.52 + k * 0.34, Math.PI / 2]);
  bags.forEach(([x, y, z, yaw], k) => {
    OWN = owners.length;
    owners.push({ kind: "bag", x, y, z, yaw, ph: TAU * hash(k + 200), fr: 1 + (k % 2), amp: 0.06 + 0.03 * hash(k + 220) });
    add("rim", BAG, [0, -0.04, 0]);
    add("stripeSolid", SPH_S, [0, -0.035, 0], [0, 0, 0], [0.016, 0.022, 0.016]); // the tie
    pipe("black", [0, -0.04, 0], [0, 0, 0], 0.003);
    const key = k % 3 === 1 ? "fishAmber" : k === 2 || k === 7 ? "fishBlack" : "fishRed", a = k % 2 ? 0.22 : -0.22;
    const fy = -0.04 - BH * 0.34, fz = BR * 0.96;
    add(key, SPH_S, [0.012, fy, fz], [0, 0, a], [0.05, 0.028, 0.012]);
    add(key, BTAIL, [-0.048, fy - a * 0.05, fz], [0, 0, -Math.PI / 2 + a], [0.032, 0.04, 0.007]);
    if (key === "fishBlack") add("ripple", SPH_S, [0.04, fy + 0.008 + a * 0.03, fz + 0.008], [0, 0, 0], [0.011, 0.011, 0.006]);
  });
  OWN = -1;

  // ---------- meshes ----------
  const MAT = {
    canvas: [c.canvas, c.canvasShade, 0.1, 3.5],
    stripe: [c.stripe, c.stripeShade, 0.1, 0],
    stripeSolid: [c.stripe, c.stripeShade, 0.1, 3],
    frame: [c.frame, c.frameShade, 0.35, 3],
    wood: [c.wood, c.woodShade, 0.3, 3],
    glow: [c.glow, c.glow, -1, 3],
    black: [c.black, c.black, 0.35, 2.5],
    rim: [c.rim, c.rimShade, 0.1, 3],
    water: [c.water, c.water, 0.35, 0],
    ripple: [c.ripple, c.ripple, -1, 0],
    reflect: [c.glow, c.glow, -1, 0],
    fishRed: [c.fishRed, c.fishRed, 0.2, 1.5],
    fishAmber: [c.fishAmber, c.fishAmberShade, -0.2, 1.5],
    fishBlack: [c.black, c.black, 0.2, 1.5],
  };
  const live = [];
  for (const [key, s] of Object.entries(soups)) {
    const [base, shade, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    stall.add(mesh);
    if (s.o.some((k) => k >= 0)) {
      kit.hullNormals(g);
      const hn = g.attributes.hullNormal;
      live.push({ g, o: s.o, p: Float32Array.from(s.p), n: Float32Array.from(s.n), h: hn ? Float32Array.from(hn.array) : null });
      mesh.frustumCulled = false;
    }
  }

  // ---------- rig ----------
  const MS = owners.map(() => new THREE.Matrix4()), NM = owners.map(() => new THREE.Matrix3());
  const T = 6;
  const tmp = new THREE.Matrix4(), q = new THREE.Vector3(), EB = new THREE.Euler();
  function setOwners(t) {
    const u0 = t / T;
    owners.forEach((w, k) => {
      if (w.kind === "fish") {
        // warped loop time: u in [0,1) per period; du/dt > 0 since wk < 1
        const u = w.dir * (u0 + (w.wk / (TAU * w.wm)) * Math.sin(TAU * w.wm * u0 + w.wp));
        const x = w.cx + w.ax * Math.sin(TAU * w.nx * u + w.px), z = w.cz + w.az * Math.sin(TAU * w.nz * u + w.pz);
        const vx = w.dir * w.ax * w.nx * Math.cos(TAU * w.nx * u + w.px), vz = w.dir * w.az * w.nz * Math.cos(TAU * w.nz * u + w.pz);
        const yaw = Math.atan2(-vz, vx); // local +x (head) along the velocity
        MS[k].makeRotationY(yaw).setPosition(x, w.y, z);
      } else if (w.kind === "tail") {
        const f = owners[w.fish];
        const wag = 0.35 * Math.sin(TAU * f.beat * u0 + f.wp);
        tmp.makeTranslation(-0.03, 0, 0).multiply(new THREE.Matrix4().makeRotationY(wag)).multiply(new THREE.Matrix4().makeTranslation(0.03, 0, 0));
        MS[k].multiplyMatrices(MS[w.fish], tmp);
      } else {
        const a = w.amp * Math.sin(TAU * w.fr * u0 + w.ph), b = 0.4 * w.amp * Math.sin(TAU * u0 + w.ph * 1.7);
        MS[k].makeRotationFromEuler(EB.set(b, w.yaw, a, "YXZ")).setPosition(w.x, w.y, w.z);
      }
      NM[k].getNormalMatrix(MS[k]);
    });
    for (const L of live) {
      const P = L.g.attributes.position.array, N = L.g.attributes.normal.array, H = L.g.attributes.hullNormal?.array;
      for (let v = 0; v < L.o.length; v++) {
        const k = L.o[v], i = v * 3;
        if (k < 0) continue;
        q.fromArray(L.p, i).applyMatrix4(MS[k]).toArray(P, i);
        q.fromArray(L.n, i).applyMatrix3(NM[k]).normalize().toArray(N, i);
        if (H && L.h) q.fromArray(L.h, i).applyMatrix3(NM[k]).normalize().toArray(H, i);
      }
      L.g.attributes.position.needsUpdate = L.g.attributes.normal.needsUpdate = true;
      if (H) L.g.attributes.hullNormal.needsUpdate = true;
      L.g.computeBoundingSphere();
      L.g.computeBoundingBox();
    }
    root.updateMatrixWorld(true);
  }
  const CLIPS = { swim: T };
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`kingyo-sukui: no clip "${m[1]}" (clips: swim)`);
      return setOwners(((+m[2] % T) + T) % T);
    }
    if (name !== "rest") throw new Error(`kingyo-sukui: unknown pose "${name}" (rest, or swim@<seconds>)`);
    setOwners(0); // rest is the clip's first frame
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
