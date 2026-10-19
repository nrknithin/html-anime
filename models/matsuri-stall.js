// matsuri-stall.js - a summer-festival stall (yatai at a matsuri), static: a pipe-frame booth under a striped awning,
// a blank banner, a counter, a row of paper lanterns, and one of three trades on the counter.
// Contract: harness/lab/README.md. Meters, +Y up, the customer side faces +Z, its left is +X, stands on y = 0,
// centred on x = 0, z = 0.
//
// Construction (boxes, slabs, lathes and spheres, all merged per material into triangle soups, so the whole stall is
// one mesh per material: 8-13 meshes by kind and night):
//   FRAME    four steel pipes (6-sided, radial normals), the back pair taller, tied by top beams, sloped side beams
//            and side rails at 1.0 m.
//   CURTAIN  a red-and-white kohaku maku closes the back: a white inked slab with red decal stripes on both faces. A
//            plain dark back merged with a night sky (both sky #24143a) and read as a hole at hero size.
//   AWNING   one inked slab sloping forward (back edge 2.60, front lip 2.15, 14 deg), 11 stripes front-to-back; the
//            slab is the white canvas and the red stripes are decals 3 mm off its top, underside and front edge (no
//            hull: the slab's hull draws the outline, so stripe seams never ink). A scalloped valance hangs from the
//            front lip, one scallop per stripe, red decals on both faces; the two side drops are red (the edge stripes).
//   BANNER   a blank white strip between the front pipes under the valance (no lettering, by design).
//   LANTERNS seven small red chochin on a cord along the valance hem (lathe bodies, black caps, two rib rings), hung in
//            front of the banner: red on white reads at hero size. (Alternating red and white lanterns lost the white
//            ones against the banner; a dark banner merged with the interior.)
//   COUNTER  a wood top board over an amber front apron with a dark kick band.
//   KIND     "goldfish" (default): a shallow indigo tub with a white rim on the counter, water a flat tone, 16 fish
//            (body + fanned tail, red and amber) on the surface, poi paddles standing in a holder, a stack of bowls, and
//            six water bags with a fish hung on a rod before a dark board (the bags carry the trade to a low camera,
//            which cannot see into the tub).
//            "takoyaki": a black burner under a dark iron plate of 4 x 12 dimples, most holding an amber ball standing
//            2 cm proud, a stack of boat trays, one full tray, sauce and mayo bottles.
//            "masks": a dark board on the curtain with 3 rows of 7 masks: round anime faces (big eyes with a catch
//            light, a small mouth; a black fringe or cat ears) in white, amber and pink, and fox masks (pointed ears with
//            red insides, a muzzle, red brow marks, slit eyes); small toy boxes on the counter. The masks use threshold
//            -0.3 so faces square to the camera stay their colour.
// Proportions (real size, base unit the awning width W = 2.7 m): awning 2.7 x 1.8 at 2.15-2.60, valance 0.12-0.19 deep;
//   pipes 48 mm (thickened from 42) at x +-1.28, z +0.80 / -0.80; banner 1.72-2.06; lanterns 0.15 x 0.20 (+ caps), every
//   0.40 m, centres at y 1.80; counter 2.44 x 0.54, top at 0.86; curtain at z -0.83, 15 stripes; masks 0.2 across.
// Options: build(THREE, kit, colors, { height = 2.6, kind = "goldfish" | "takoyaki" | "masks", night = false }).
//   height scales the whole stall uniformly (the awning's back edge). night lights the lanterns: the paper goes to
//   practical #ffb020 at threshold -1, one flat tone all round (no emissive in the kit; a halo is the film's job).
// Budget: ~10k triangles (goldfish 10.0k, takoyaki 10.2k), masks 15.2k (21 masks of smooth spheres).
// Colours (festival), base / shade:
//   canvas, banner, curtain, white masks   sclera #f6f3ee / skin #f0c2ae (threshold 0.1, so faces square to camera stay lit)
//   stripes, lanterns, fish, fox marks     accent #ff4d6d / sky #24143a
//   pipes, boards, tub, plate              sky #24143a / hair #1a1020 (above ink)
//   counter top, trays                     moon #ffd7a1 / skin #f0c2ae
//   apron, amber fish, balls, amber masks  practical #ffb020 / accent #ff4d6d
//   caps, eyes, dimples, cord, burner      hair #1a1020 (single tone)
//   tub rim, water bags                    line #fff1ea / skin #f0c2ae
//   water                                  sky #24143a flat (festival has no blue: its indigo stands in for the tub's blue)
//   night paper                            practical #ffb020 flat

export const meta = {
  name: "matsuri-stall",
  height: 2.6,
  script: "festival",
  colors: {
    canvas: "#f6f3ee", canvasShade: "#f0c2ae",
    stripe: "#ff4d6d", stripeShade: "#24143a",
    frame: "#24143a", frameShade: "#1a1020",
    wood: "#ffd7a1", woodShade: "#f0c2ae",
    amber: "#ffb020", amberShade: "#ff4d6d",
    black: "#1a1020",
    rim: "#fff1ea", rimShade: "#f0c2ae",
    water: "#24143a",
    glow: "#ffb020",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, kind = "goldfish", night = false } = opts;
  if (!["goldfish", "takoyaki", "masks"].includes(kind)) throw new Error(`unknown kind "${kind}" (goldfish, takoyaki, masks)`);
  const root = new THREE.Group();
  root.name = "matsuri-stall";
  const stall = new THREE.Group(); // uniform size scale lives here, so root stays the plain contract node
  stall.name = "stall";
  stall.scale.setScalar(height / meta.height);
  root.add(stall);
  const joints = {};

  // ---------- soups: key -> positions + normals ----------
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
  // a flat triangle wound away from `ref` (a point inside the solid, or behind a decal)
  function tri(key, a, b, e, ref) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-9) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    const flip = dot(n, sub(m, ref)) < 0;
    n = norm(flip ? n.map((x) => -x) : n);
    const s = S(key);
    s.p.push(...a, ...(flip ? [...e, ...b] : [...b, ...e]));
    s.n.push(...n, ...n, ...n);
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
  // a THREE geometry placed by position / Euler / scale (positive scales only), normals carried
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), SV = new THREE.Vector3();
  function add(key, geo, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    M4.compose(V.set(...pos), Q.setFromEuler(E.set(...rot)), SV.set(...scl));
    g.applyMatrix4(M4);
    const s = S(key);
    s.p.push(...g.attributes.position.array);
    s.n.push(...g.attributes.normal.array);
  }
  const SPH = new THREE.SphereGeometry(1, 12, 8);
  const SPH_S = new THREE.SphereGeometry(1, 8, 6);
  const SPH_D = new THREE.SphereGeometry(1, 8, 4); // small decals (eyes, marks)
  // a pipe from a to b (6 sides, radial normals, capped)
  const PIPE = new THREE.CylinderGeometry(1, 1, 1, 6, 1);
  function pipe(key, a, b, r) {
    const d = sub(b, a), L = Math.hypot(...d);
    Q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...norm(d)));
    const g = PIPE.toNonIndexed();
    M4.compose(V.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), Q, SV.set(r, L, r));
    g.applyMatrix4(M4);
    const s = S(key);
    s.p.push(...g.attributes.position.array);
    s.n.push(...g.attributes.normal.array);
  }
  const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  // ---------- frame ----------
  const AX = 1.35, AZ0 = -0.9, AZ1 = 0.9, AY0 = 2.6, AY1 = 2.15, AT = 0.025; // awning
  const yTop = (z) => AY0 + ((AY1 - AY0) * (z - AZ0)) / (AZ1 - AZ0);
  const PX = 1.28, PZF = 0.8, PZB = -0.8, PR = 0.024;
  for (const x of [-PX, PX]) {
    for (const z of [PZF, PZB]) {
      pipe("frame", [x, 0, z], [x, yTop(z) - AT - 0.005, z], PR);
      box("frame", x - 0.05, x + 0.05, 0, 0.012, z - 0.05, z + 0.05); // foot plate
    }
    pipe("frame", [x, yTop(PZF) - AT - 0.03, PZF], [x, yTop(PZB) - AT - 0.03, PZB], PR * 0.85); // sloped side beam
    pipe("frame", [x, 1.0, PZF], [x, 1.0, PZB], PR * 0.85); // side rail
  }
  pipe("frame", [-PX, yTop(PZF) - AT - 0.03, PZF], [PX, yTop(PZF) - AT - 0.03, PZF], PR * 0.85);
  pipe("frame", [-PX, yTop(PZB) - AT - 0.03, PZB], [PX, yTop(PZB) - AT - 0.03, PZB], PR * 0.85);
  // back curtain: a red-and-white kohaku maku (white cloth, red decal stripes on both faces)
  const KY = yTop(-0.83) - AT, KN = 15, KW = (2 * PX) / KN;
  box("canvas", -PX, PX, 0.03, KY, -0.84, -0.82);
  for (let i = 0; i < KN; i += 2) {
    const x0 = -PX + i * KW, x1 = x0 + KW;
    for (const [z, ref] of [[-0.817, -0.83], [-0.843, -0.83]])
      quad("stripe", [x0, 0.03, z], [x1, 0.03, z], [x1, KY, z], [x0, KY, z], [x0, 0.5, ref]);
  }

  // ---------- awning: white slab + red stripe decals ----------
  const NS = 11, SW = (2 * AX) / NS, red = (i) => i % 2 === 0; // the two edge stripes are red
  const top = (x, z) => [x, yTop(z), z], bot = (x, z) => [x, yTop(z) - AT, z];
  hex("canvas", [bot(-AX, AZ0), bot(AX, AZ0), bot(AX, AZ1), bot(-AX, AZ1), top(-AX, AZ0), top(AX, AZ0), top(AX, AZ1), top(-AX, AZ1)]);
  const slopeN = norm([0, AZ1 - AZ0, AY0 - AY1]); // the slab's up normal
  const off = (p, k) => [p[0], p[1] + slopeN[1] * k, p[2] + slopeN[2] * k];
  for (let i = 0; i < NS; i++) {
    if (!red(i)) continue;
    const x0 = -AX + i * SW, x1 = x0 + SW;
    quad("stripe", off(top(x0, AZ0), 0.003), off(top(x1, AZ0), 0.003), off(top(x1, AZ1), 0.003), off(top(x0, AZ1), 0.003), [0, 0, 0]);
    quad("stripe", off(bot(x0, AZ0), -0.003), off(bot(x1, AZ0), -0.003), off(bot(x1, AZ1), -0.003), off(bot(x0, AZ1), -0.003), [0, 5, 0]);
  }
  // side drops (red, inked), along the slope under the edge stripes
  for (const s of [-1, 1]) {
    const x = s * (AX - 0.006);
    hex("stripeSolid", [bot(x - 0.006, AZ0), bot(x + 0.006, AZ0), bot(x + 0.006, AZ1), bot(x - 0.006, AZ1),
      [x - 0.006, yTop(AZ0) - AT - 0.1, AZ0], [x + 0.006, yTop(AZ0) - AT - 0.1, AZ0], [x + 0.006, yTop(AZ1) - AT - 0.1, AZ1], [x - 0.006, yTop(AZ1) - AT - 0.1, AZ1]]);
  }

  // ---------- front valance: scalloped, one scallop per stripe ----------
  const VZ = AZ1 + 0.002, VT = 0.012, VD = 0.12, VS = 0.07; // z, thickness, straight depth, scallop sag
  const hem = (u) => -VD - VS * Math.sin(Math.PI * u); // u 0..1 across one stripe
  const vShape = new THREE.Shape();
  vShape.moveTo(-AX, 0);
  vShape.lineTo(-AX, -VD);
  for (let i = 0; i < NS; i++) for (let k = 1; k <= 6; k++) vShape.lineTo(-AX + (i + k / 6) * SW, hem(k / 6));
  vShape.lineTo(AX, 0);
  vShape.lineTo(-AX, 0);
  add("canvas", new THREE.ExtrudeGeometry(vShape, { depth: VT, bevelEnabled: false }), [0, AY1, VZ]);
  for (let i = 0; i < NS; i++) {
    if (!red(i)) continue;
    const x0 = -AX + i * SW;
    const pts = [[x0, 0], [x0, -VD]];
    for (let k = 1; k <= 6; k++) pts.push([x0 + (k / 6) * SW, hem(k / 6)]);
    pts.push([x0 + SW, 0]);
    for (const [zf, ref] of [[VZ + VT + 0.003, VZ], [VZ - 0.003, VZ + VT]]) {
      const P = pts.map(([x, y]) => [x, AY1 + y, zf]);
      for (let k = 1; k < P.length - 1; k++) tri("stripe", P[0], P[k], P[k + 1], [P[0][0], P[0][1], ref]);
    }
  }
  // the front edge of the slab: red decals on the lip
  for (let i = 0; i < NS; i++) if (red(i)) {
    const x0 = -AX + i * SW, x1 = x0 + SW, z = AZ1 + 0.003;
    quad("stripe", [x0, AY1 - AT, z], [x1, AY1 - AT, z], [x1, AY1, z], [x0, AY1, z], [0, AY1, 0]);
  }

  // ---------- banner: blank dark strip ----------
  box("canvas", -PX - 0.02, PX + 0.02, 1.72, 2.06, PZF + 0.03, PZF + 0.042);

  // ---------- lanterns ----------
  const LR = 0.075, LH = 0.1, LY = 1.80, LZ = AZ1 + 0.05, LN = 7, LSP = 0.4;
  const lprof = [];
  for (let k = 0; k <= 10; k++) {
    const t = -1 + (2 * k) / 10;
    lprof.push(new THREE.Vector2(LR * Math.sqrt(Math.max(0, 1 - 0.72 * t * t)), LH * t));
  }
  const LBODY = new THREE.LatheGeometry(lprof, 12);
  const CAP = new THREE.CylinderGeometry(0.042, 0.042, 0.022, 10);
  const RIB = new THREE.TorusGeometry(1, 0.0035, 4, 14);
  const cordY = AY1 - VD - 0.005;
  pipe("black", [-AX + 0.04, cordY, LZ], [AX - 0.04, cordY, LZ], 0.005);
  for (let i = 0; i < LN; i++) {
    const x = (i - (LN - 1) / 2) * LSP;
    const paper = night ? "glow" : "stripeSolid";
    add(paper, LBODY, [x, LY, LZ]);
    add("black", CAP, [x, LY + LH + 0.006, LZ]);
    add("black", CAP, [x, LY - LH - 0.006, LZ]);
    for (const t of [-0.45, 0.45]) {
      const r = LR * Math.sqrt(1 - 0.72 * t * t) + 0.001;
      add("blackLine", RIB, [x, LY + LH * t, LZ], [Math.PI / 2, 0, 0], [r, r, 1]);
    }
    pipe("blackLine", [x, LY + LH + 0.017, LZ], [x, cordY, LZ], 0.003);
  }

  // ---------- counter ----------
  const CX = 1.22, CZ0 = 0.26, CZ1 = 0.8, CY = 0.86;
  box("wood", -CX, CX, CY - 0.04, CY, CZ0, CZ1);
  box("amber", -CX + 0.03, CX - 0.03, 0.07, CY - 0.04, CZ0 + 0.04, CZ1 - 0.03);
  box("frame", -CX + 0.03, CX - 0.03, 0.0, 0.07, CZ0 + 0.04, CZ1 - 0.035);

  // ---------- kinds ----------
  if (kind === "goldfish") {
    const TX0 = -1.12, TX1 = 0.82, TZ0 = 0.32, TZ1 = 0.74, TY = CY + 0.14, RW = 0.03;
    box("frame", TX0 + 0.01, TX1 - 0.01, CY, TY - 0.01, TZ0 + 0.01, TZ1 - 0.01);
    for (const [x0, x1, z0, z1] of [[TX0, TX1, TZ0, TZ0 + RW], [TX0, TX1, TZ1 - RW, TZ1], [TX0, TX0 + RW, TZ0, TZ1], [TX1 - RW, TX1, TZ0, TZ1]])
      box("rim", x0, x1, TY - 0.03, TY + 0.012, z0, z1);
    quad("water", [TX0 + RW, TY - 0.012, TZ0 + RW], [TX1 - RW, TY - 0.012, TZ0 + RW], [TX1 - RW, TY - 0.012, TZ1 - RW], [TX0 + RW, TY - 0.012, TZ1 - RW], [0, 0, 0]);
    const TAIL = new THREE.ConeGeometry(1, 1, 3);
    for (let i = 0; i < 16; i++) {
      const x = TX0 + 0.1 + ((i + hash(i) * 0.6) / 16) * (TX1 - TX0 - 0.2), z = TZ0 + 0.08 + hash(i + 40) * (TZ1 - TZ0 - 0.16);
      const a = hash(i + 80) * Math.PI * 2, key = i % 3 === 2 ? "amber" : "stripeSolid", y = TY - 0.01;
      add(key, SPH_S, [x, y, z], [0, a, 0], [0.042, 0.014, 0.023]);
      add(key, TAIL, [x - Math.cos(a) * 0.055, y, z + Math.sin(a) * 0.055], [0, a, -Math.PI / 2], [0.006, 0.036, 0.028]);
    }
    // poi paddles standing in a holder, and a stack of bowls
    box("frame", 0.9, 1.16, CY, CY + 0.1, 0.42, 0.52);
    const RING = new THREE.TorusGeometry(0.045, 0.006, 5, 16), DISC = new THREE.CylinderGeometry(0.043, 0.043, 0.003, 16);
    for (let k = 0; k < 3; k++) {
      const x = 0.95 + k * 0.08, y = CY + 0.24 + (k % 2) * 0.03, z = 0.47 + (k - 1) * 0.01, rz = (k - 1) * 0.12;
      add("stripeSolid", RING, [x, y, z], [0, 0, rz]);
      add("canvas", DISC, [x, y, z], [Math.PI / 2, 0, rz]);
      pipe("stripeSolid", [x + Math.sin(rz) * 0.045, y - Math.cos(rz) * 0.045, z], [x + Math.sin(rz) * 0.17, y - Math.cos(rz) * 0.17, z], 0.008);
    }
    const BOWL = new THREE.CylinderGeometry(0.07, 0.05, 0.035, 12);
    for (let k = 0; k < 3; k++) add("canvas", BOWL, [1.04, CY + 0.018 + k * 0.022, 0.67]);
    // water bags with a fish, on a rod inside
    const BZ = -0.72, BY = 1.62;
    box("frame", -1.22, 1.22, 1.0, 1.72, -0.815, -0.79); // a dark board behind the bags
    pipe("frame", [-PX, BY, BZ], [PX, BY, BZ], 0.012);
    const bprof = [], BR = 0.1, BH = 0.27; // round bottom (half ellipse) narrowing to a tied neck
    for (let k = 0; k <= 12; k++) {
      const t = k / 12, r = t < 0.5 ? BR * Math.sqrt(Math.max(0, 1 - ((0.5 - t) / 0.5) ** 2)) : BR + (0.012 - BR) * ((t - 0.5) / 0.5) ** 1.3;
      bprof.push(new THREE.Vector2(Math.max(0.0005, r), -BH + BH * t));
    }
    const BAG = new THREE.LatheGeometry(bprof, 12);
    for (let k = 0; k < 6; k++) {
      const x = -1.0 + k * 0.4, y = BY - 0.04;
      add("rim", BAG, [x, y, BZ]);
      add("stripeSolid", SPH_S, [x, y + 0.005, BZ], [0, 0, 0], [0.016, 0.022, 0.016]); // the tie
      pipe("blackLine", [x, y, BZ], [x, BY, BZ], 0.003);
      const fy = y - BH * 0.3, fz = BZ + BR * 0.98, key = k % 2 ? "amber" : "stripeSolid", a = k % 2 ? 0.25 : -0.25;
      add(key, SPH_S, [x + 0.01, fy, fz], [0, 0, a], [0.042, 0.024, 0.01]);
      add(key, TAIL, [x - 0.04, fy - a * 0.04, fz], [0, 0, -Math.PI / 2 + a], [0.028, 0.034, 0.006]);
    }
  } else if (kind === "takoyaki") {
    const GX0 = -0.2, GX1 = 1.0, GZ0 = 0.33, GZ1 = 0.75, GY = CY + 0.14;
    box("black", GX0 + 0.03, GX1 - 0.03, CY, GY - 0.02, GZ0 + 0.03, GZ1 - 0.03); // burner box
    box("frame", GX0, GX1, GY - 0.02, GY, GZ0, GZ1); // the iron plate
    const DIMPLE = new THREE.CircleGeometry(0.032, 12), BALL = new THREE.SphereGeometry(0.03, 10, 7);
    const NC = 12, NR = 4, sx = (GX1 - GX0 - 0.08) / NC, sz = (GZ1 - GZ0 - 0.06) / NR;
    for (let r = 0; r < NR; r++) for (let k = 0; k < NC; k++) {
      const x = GX0 + 0.04 + (k + 0.5) * sx, z = GZ0 + 0.03 + (r + 0.5) * sz;
      add("blackLine", DIMPLE, [x, GY + 0.002, z], [-Math.PI / 2, 0, 0]);
      if (hash(r * 31 + k) < 0.78) add("amber", BALL, [x, GY + 0.006, z]);
    }
    // boat trays: a stack, and one full tray
    for (let k = 0; k < 5; k++) box("wood", -1.1, -0.92, CY + k * 0.018, CY + 0.014 + k * 0.018, 0.4, 0.5);
    box("wood", -0.75, -0.45, CY, CY + 0.02, 0.5, 0.64);
    for (let k = 0; k < 6; k++) add("amber", BALL, [-0.71 + (k % 3) * 0.11, CY + 0.045, 0.535 + Math.floor(k / 3) * 0.07]);
    pipe("stripeSolid", [-0.5, CY, 0.38], [-0.5, CY + 0.2, 0.38], 0.03); // sauce bottle
    pipe("canvas", [-0.36, CY, 0.38], [-0.36, CY + 0.18, 0.38], 0.03); // mayo bottle
  } else {
    // masks on a board
    box("frame", -1.22, 1.22, 0.96, 1.86, -0.82, -0.79);
    const BZ = -0.79, MR = 0.1, CAPG = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.42);
    const EAR = new THREE.ConeGeometry(1, 1, 4);
    const rows = [1.1, 1.36, 1.62];
    for (let r = 0; r < 3; r++) for (let k = 0; k < 7; k++) {
      const x = -1.02 + k * 0.34, y = rows[r], i = r * 7 + k, type = (k + r * 2) % 4;
      const zf = BZ + MR * 0.45; // face front
      const eye = (ex, ey, sx, sy) => {
        add("blackLine", SPH_D, [x + ex, y + ey, zf - 0.004], [0, 0, 0], [sx, sy, 0.008]);
        add("canvasLine", SPH_D, [x + ex + 0.006, y + ey + sy * 0.4, zf + 0.002], [0, 0, 0], [sx * 0.35, sx * 0.35, 0.004]);
      };
      if (type === 1) { // fox
        add("maskWhite", SPH, [x, y + 0.01, BZ], [0, 0, 0], [MR * 0.9, MR * 1.05, MR * 0.45]);
        add("maskWhite", SPH, [x, y - 0.04, BZ + 0.045], [0.35, 0, 0], [0.045, 0.04, 0.06]); // muzzle
        add("blackLine", SPH_D, [x, y - 0.05, BZ + 0.105], [0, 0, 0], [0.012, 0.01, 0.008]); // nose
        for (const s of [-1, 1]) {
          add("maskWhite", EAR, [x + s * 0.06, y + 0.135, BZ], [0, 0, -s * 0.3], [0.035, 0.09, 0.02]);
          add("stripe", EAR, [x + s * 0.06, y + 0.13, BZ + 0.012], [0, 0, -s * 0.3], [0.018, 0.06, 0.012]);
          add("stripe", SPH_D, [x + s * 0.042, y + 0.035, zf - 0.006], [0, 0, s * 0.5], [0.03, 0.009, 0.008]); // brow flame
          add("blackLine", SPH_D, [x + s * 0.04, y + 0.008, zf - 0.006], [0, 0, s * 0.35], [0.022, 0.006, 0.008]); // slit eye
        }
      } else {
        const key = type === 0 ? "maskWhite" : type === 2 ? "maskAmber" : "maskPink";
        add(key, SPH, [x, y, BZ], [0, 0, 0], [MR, MR, MR * 0.45]);
        eye(-0.04, -0.005, 0.02, 0.03);
        eye(0.04, -0.005, 0.02, 0.03);
        add(type === 3 ? "canvasLine" : "stripe", SPH_D, [x, y - 0.06, zf - 0.012], [0, 0, 0], [0.014, 0.007, 0.006]); // mouth
        if (hash(i) < 0.5) add("black", CAPG, [x, y + 0.004, BZ - 0.002], [0, 0, 0], [MR * 1.04, MR * 1.04, MR * 0.5]); // fringe
        else for (const s of [-1, 1]) add(key, EAR, [x + s * 0.065, y + 0.095, BZ], [0, 0, -s * 0.45], [0.035, 0.06, 0.02]); // cat ears
      }
    }
    // small toys on the counter
    for (let k = 0; k < 6; k++) {
      const x = -1.0 + k * 0.4, key = ["stripeSolid", "amber", "canvas"][k % 3];
      box(key, x - 0.08, x + 0.08, CY, CY + 0.07 + (k % 2) * 0.04, 0.45, 0.6);
    }
  }

  // ---------- meshes ----------
  const MAT = {
    canvas: [c.canvas, c.canvasShade, 0.1, true, 3.5],
    canvasLine: [c.canvas, c.canvas, 0.1, false],
    stripe: [c.stripe, c.stripeShade, 0.1, false],
    stripeSolid: [c.stripe, c.stripeShade, 0.1, true, 3],
    frame: [c.frame, c.frameShade, 0.35, true, 3],
    wood: [c.wood, c.woodShade, 0.35, true, 3.5],
    amber: [c.amber, c.amberShade, 0.1, true, 3],
    black: [c.black, c.black, 0.35, true, 2.5],
    blackLine: [c.black, c.black, 0.35, false],
    rim: [c.rim, c.rimShade, 0.1, true, 3],
    water: [c.water, c.water, 0.35, false],
    maskWhite: [c.canvas, c.canvasShade, -0.3, true, 3],
    maskAmber: [c.amber, c.amberShade, -0.3, true, 3],
    maskPink: [c.stripe, c.canvasShade, -0.3, true, 3],
    glow: [c.glow, c.glow, -1, true, 3],
  };
  for (const [key, s] of Object.entries(soups)) {
    const [base, shade, threshold, outline, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    const mesh = kit.toon(g, base, shade, outline ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    stall.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
