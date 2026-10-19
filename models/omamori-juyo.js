// omamori-juyo.js - a New Year's Eve (hatsumode) corner of shrine grounds at real size, about 10 x 8 m: omikuji tying
// racks thick with white paper fortunes, a hexagonal omikuji box on a small table, a komodaru wall of straw sake
// barrels, a pair of kadomatsu flanking the stepping-stone path, a shimenawa with shide strung between two posts, a
// takibi bonfire in a ring of stones and paper lanterns, on dark gravel. One set with models/shrine.js and
// models/torii.js; the amulet office is models/juyosho.js and the votive rack models/ema-rack.js.
// Contract: harness/lab/README.md. Metres, +Y up, the path runs along z toward +Z (the set faces +Z), its left is +X,
// it stands on y = 0 and is centred on x = 0, z = 0 (the bbox of the gravel slab).
//
// Construction: every piece is triangles merged into one soup per material (15 meshes). THREE geometries (box,
// cylinder, lathe, tube, octahedron) are placed by a matrix; custom parts (paper knots, shide zigzags, slanted bamboo
// cuts, stepping stones) go through tri(), which winds each triangle away from a reference point inside its solid.
//   GROUND    a 4 cm dark gravel slab, 10 x 8; indigo pebble specks (3-sided chips, no ink) scattered by a seeded hash.
//   PATH      ten flat irregular stepping stones along x = 0 from the front edge to the back.
//   KADOMATSU at x +-0.95, z 2.7, flanking the path: a straw-wrapped base bound with three dark cords, three green-less
//             (night) bamboo poles in 7:5:3 heights with slanted cuts facing out (a pale cut face, a dark hollow),
//             pine sprays around their feet and a few red nanten berries.
//   SHIMENAWA two plain wood posts at x +-1.3, z 0.2 with dark caps; a thick rope of two twisted straw strands sagging
//             between them over the path, four white zigzag shide and three straw tassels hanging from it.
//   OMIKUJI   the identity cue, on the +X side: a wooden frame with seven dark wires (z -0.7) and a taller frame strung
//             with seven straw ropes behind it (z -2.2), every line crowded with white tied fortunes (one flat paper
//             tail per knot, a thin tetrahedron, up or down, rolled and spaced by the hash, ~100 per 2.8 m; some
//             lines sparser). The knots are flat white with no ink, so each line reads as one white band. In front, a small wooden
//             table with a white cloth and a red hexagonal omikuji box (a dark shaking hole on top, pale end bands).
//   KOMODARU  on the -X side, facing +X: a red three-step stage carrying a wall of 21 straw sake barrels (3 tiers of
//             7, upright), each with one plain wide band, red or indigo by a fixed pattern; no lettering.
//   TAKIBI    at (-3.5, 2.7), the front-left corner: twelve stones in a ring, six logs in a teepee, an ember bed, five flame tongues (red
//             outside) with three yellow cores. { fire: false } leaves cold logs on dark ash.
//   LANTERNS  two square paper andon on wooden posts (behind the shimenawa by the path and by the barrels) and a round chochin on an arm
//             of each shimenawa post, all in the glowing practical colour.
// Proportions (real size, base unit the barrel B = 0.54 m tall, 0.52 across): racks 1.8 and 1.95 tall, 2.8 and 2.7
//   long; knots 6-9 cm; barrel wall 2.06 tall (stage 0.34, step 0.56), 4.1 long; kadomatsu poles 1.6 / 1.3 / 1.05 on
//   a 0.6 x 0.5 base; shimenawa posts 2.7 (the top of the set, meta.height), rope at 2.25 sagging 0.28, 0.17 thick;
//   bonfire ring 1.5 across, flames 1.5; table top 0.72; omikuji box 0.2 across, 0.32 tall.
// Options: build(THREE, kit, colors, { height = 2.7, fire = true }). height scales the whole set uniformly so the post
//   tops are `height` (as the torii); fire: false puts the bonfire out.
// Clip: flicker (1.5 s loop, pose("flicker@0.4")): the flame and core meshes are rewritten per frame from their rest
//   vertices (tongues sway, stretch and narrow by height) and the shide mesh swings each strip about its knot on the
//   rope (a flutter that grows down the strip). Integer frequencies over 1.5 s, so the loop closes. rest = flicker@0.
// Script: indigo (night; no green, so pine is indigo and bamboo moonlit pale). Two-tone pairs (base / shade):
//   gravel hair #16141c / hair; pebbles sky #1b2d6b flat; stones moon #d5e2ff / sky #1b2d6b; wood iris #e7a04a /
//   accent #e23b4a (firelit); paper and shide sclera #f6f3ee / moon #d5e2ff;
//   knots sclera flat, no ink; straw practical #f0c36a / iris #e7a04a;
//   red (box, bands, stage, berries) accent #e23b4a / sky; indigo (pine, bands, bamboo nodes) sky flat (a hair shade read as a hole); bamboo moon / sky;
//   dark (wires, cords, hollows, caps, ash) hair flat, no ink; flames accent flat, cores practical flat (no ink);
//   lantern paper and embers practical flat (glow, inked). Ink #101628.
// Small parts (shide, cloth, cut faces) take a 1.5 px hull, knots and pebbles none: at hero size a 5 px hull per knot fills the
// rack with ink.

export const meta = {
  name: "omamori-juyo",
  height: 2.7,
  script: "indigo",
  colors: {
    gravel: "#16141c", gravelShade: "#16141c",
    pebble: "#1b2d6b",
    stone: "#d5e2ff", stoneShade: "#1b2d6b",
    wood: "#e7a04a", woodShade: "#e23b4a",
    paper: "#f6f3ee", paperShade: "#d5e2ff",
    straw: "#f0c36a", strawShade: "#e7a04a",
    red: "#e23b4a", redShade: "#1b2d6b",
    indigo: "#1b2d6b", indigoShade: "#1b2d6b",
    bamboo: "#d5e2ff", bambooShade: "#1b2d6b",
    dark: "#16141c",
    flame: "#e23b4a", core: "#f0c36a", glow: "#f0c36a",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const { height = meta.height, fire = true } = opts;
  const TAU = Math.PI * 2;
  const root = new THREE.Group();
  root.name = "omamori-juyo";
  const body = new THREE.Group(); // uniform size scale lives here, root stays the plain contract node
  body.name = "set";
  body.scale.setScalar(height / meta.height);
  root.add(body);
  const joints = {};

  // ---------- seeded hash (no Math.random) ----------
  let seed = 0x5eed1e05;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const jr = (a) => (rand() * 2 - 1) * a;

  // ---------- triangle soups ----------
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [], o: [] });
  let owner = -1; // animated soups: which tongue / shide a vertex belongs to
  const _a = V(), _b = V(), _n = V(), _r = V();
  function tri(key, a, b, e, ref) {
    _a.subVectors(b, a), _b.subVectors(e, a), _n.crossVectors(_a, _b);
    if (_n.lengthSq() < 1e-14) return;
    _r.copy(a).add(b).add(e).multiplyScalar(1 / 3).sub(ref);
    const flip = _n.dot(_r) < 0;
    _n.normalize();
    if (flip) _n.negate();
    const s = S(key);
    for (const q of flip ? [a, e, b] : [a, b, e]) s.p.push(q.x, q.y, q.z), s.n.push(_n.x, _n.y, _n.z), s.o.push(owner);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  // a convex prism between two rings of the same count
  function prism(key, A, B) {
    const n = A.length, ref = V(0, 0, 0);
    for (const q of [...A, ...B]) ref.add(q);
    ref.multiplyScalar(1 / (2 * n));
    for (let i = 1; i < n - 1; i++) (tri(key, A[0], A[i], A[i + 1], ref), tri(key, B[0], B[i], B[i + 1], ref));
    for (let i = 0; i < n; i++) quad(key, A[i], A[(i + 1) % n], B[(i + 1) % n], B[i], ref);
  }
  // place a THREE geometry by a matrix
  function geoM(key, g, m) {
    const q = g.index ? g.toNonIndexed() : g.clone();
    if (!q.attributes.normal) q.computeVertexNormals();
    q.applyMatrix4(m);
    const s = S(key), P = q.attributes.position.array, N = q.attributes.normal.array;
    for (let i = 0; i < P.length; i++) s.p.push(P[i]), s.n.push(N[i]);
    for (let i = 0; i < P.length / 3; i++) s.o.push(owner);
  }
  const M = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
    new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), V(sx, sy, sz));
  const box = (key, x, y, z, w, h, d, ry = 0) => geoM(key, new THREE.BoxGeometry(w, h, d), M(x, y, z, 0, ry, 0));
  const UP = V(0, 1, 0);
  function rod(key, a, b, r, seg = 6) {
    const d = V().subVectors(b, a), len = d.length();
    const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()), V(1, 1, 1));
    geoM(key, new THREE.CylinderGeometry(r, r, len, seg), m);
  }
  // a solid of revolution, profile [[r, y], ...] bottom to top, smooth normals
  const lathe = (key, x, y, z, prof, seg = 10, ry = 0) =>
    geoM(key, new THREE.LatheGeometry(prof.map(([r, h]) => new THREE.Vector2(r, h)), seg), M(x, y, z, 0, ry, 0));
  // a ring band hugging a lathe body: radius r, from y0 to y1 (closed: discs inside the body)
  const band = (key, x, y, z, r, y0, y1, seg = 10) => lathe(key, x, y, z, [[0, y0], [r, y0], [r, y1], [0, y1]], seg);
  // an open hoop around a lathe body (its inside is hidden by the body)
  const hoop = (key, x, y, z, r, y0, y1, seg = 10) => geoM(key, new THREE.CylinderGeometry(r, r, y1 - y0, seg, 1, true), M(x, y + (y0 + y1) / 2, z));

  const G = 0.04; // gravel top

  // ---------- ground: gravel slab and pebble specks ----------
  box("gravel", 0, G / 2, 0, 10, G, 8);
  for (let i = 0; i < 140; i++) {
    const x = jr(4.9), z = jr(3.9);
    if (Math.abs(x) < 0.45 && z > -3.8) continue; // the path stays clean
    const r = 0.018 + rand() * 0.022, a0 = rand() * TAU, ref = V(x, G - 0.01, z);
    const top = V(x, G + r * 0.5, z);
    const P = [0, 1, 2].map((k) => V(x + Math.cos(a0 + (k * TAU) / 3) * r, G - 0.002, z + Math.sin(a0 + (k * TAU) / 3) * r));
    for (let k = 0; k < 3; k++) tri("pebble", P[k], P[(k + 1) % 3], top, ref);
  }

  // ---------- stepping stones ----------
  function flatStone(key, x, z, rx, rz, h, y0 = G - 0.01, n = 8) {
    const A = [], B = [], a0 = rand() * TAU;
    for (let k = 0; k < n; k++) {
      const a = a0 + (k / n) * TAU, w = 1 + jr(0.12);
      A.push(V(x + Math.cos(a) * rx * w, y0, z + Math.sin(a) * rz * w));
      B.push(V(x + Math.cos(a) * rx * w * 0.9, y0 + h, z + Math.sin(a) * rz * w * 0.9));
    }
    prism(key, A, B);
  }
  for (let k = 0; k < 10; k++) {
    const z = 3.6 - k * 0.76;
    flatStone("stone", jr(0.06) + (k % 2 ? 0.05 : -0.05), z, 0.3 + jr(0.03), 0.24 + jr(0.03), 0.05);
  }

  // ---------- kadomatsu ----------
  function kadomatsu(cx, cz, side) {
    // straw base, bound with three dark cords
    lathe("straw", cx, G, cz, [[0, 0], [0.3, 0], [0.31, 0.05], [0.3, 0.46], [0.28, 0.5], [0, 0.5]], 12);
    for (const y of [0.1, 0.24, 0.38]) hoop("dark", cx, G, cz, 0.312, y, y + 0.03, 12);
    // bamboo: [dx, dz, top, r]; the tallest in the middle, cut faces turned out to the path's front
    const poles = [[0, -0.02, 1.6, 0.06], [-0.1 * side, 0.07, 1.3, 0.055], [0.1 * side, 0.08, 1.05, 0.055]];
    const n = 10, tilt = 0.9; // cut slope: dy per unit along the facing direction
    const fx = 0.35 * -side, fz = 0.94; // the cut faces +Z, toward the path
    for (const [dx, dz, top, r] of poles) {
      const x = cx + dx, z = cz + dz;
      const ring = (yc, rr, slope) => {
        const out = [];
        for (let k = 0; k < n; k++) {
          const a = (k / n) * TAU, ox = Math.cos(a) * rr, oz = Math.sin(a) * rr;
          out.push(V(x + ox, yc - slope * (ox * fx + oz * fz), z + oz));
        }
        return out;
      };
      prism("bamboo", ring(G + 0.3, r, 0), ring(G + top, r, tilt));
      // node rings
      for (const y of [0.62, top - 0.35]) if (y < top - 0.2) hoop("indigo", x, G, z, r + 0.006, y, y + 0.025, n);
      // the cut face: a pale rim inside, a dark hollow; layered 5 mm above the cut plane
      const nrm = V(fx * tilt, 1, fz * tilt).normalize();
      const off = (q, d) => q.clone().addScaledVector(nrm, d);
      const pale = ring(G + top, r * 0.86, tilt), hole = ring(G + top, r * 0.55, tilt);
      prism("paper", pale.map((q) => off(q, 0.001)), pale.map((q) => off(q, 0.006)));
      prism("dark", hole.map((q) => off(q, 0.006)), hole.map((q) => off(q, 0.011)));
    }
    // pine sprays around the bamboo feet, and red nanten berries
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * TAU + jr(0.2), rr = 0.17 + jr(0.04);
      const g = new THREE.OctahedronGeometry(1, 0);
      geoM("indigo", g, M(cx + Math.cos(a) * rr, G + 0.58 + jr(0.06), cz + Math.sin(a) * rr, jr(0.3), a, jr(0.3), 0.16, 0.08, 0.1));
    }
    for (let k = 0; k < 2; k++) geoM("indigo", new THREE.OctahedronGeometry(1, 0), M(cx + jr(0.05), G + 0.74 + k * 0.08, cz + 0.05, 0, k, 0, 0.12, 0.07, 0.12));
    for (let k = 0; k < 7; k++) {
      const a = 1.2 + k * 0.18 * side, rr = 0.26;
      geoM("red", new THREE.OctahedronGeometry(0.022, 0), M(cx + Math.sin(a) * rr * side * 0.6, G + 0.6 + (k % 3) * 0.025, cz + Math.cos(a - 1.2) * rr, 0, k, 0));
    }
  }
  kadomatsu(0.95, 2.7, 1);
  kadomatsu(-0.95, 2.7, -1);

  // ---------- shimenawa ----------
  const SX = 1.3, SZ = 0.2, RY = 2.25, SAG = 0.28;
  for (const s of [1, -1]) {
    geoM("wood", new THREE.CylinderGeometry(0.085, 0.095, 2.66 - G, 8), M(s * SX, G + (2.66 - G) / 2, SZ));
    lathe("dark", s * SX, 2.6, SZ, [[0, 0], [0.11, 0], [0.11, 0.04], [0.02, 0.1], [0, 0.1]], 8);
    // chochin on an arm toward the path, hanging at 1.85
    rod("wood", V(s * SX, 2.05, SZ), V(s * (SX - 0.42), 2.05, SZ), 0.025, 6);
    rod("dark", V(s * (SX - 0.36), 2.05, SZ), V(s * (SX - 0.36), 1.95, SZ), 0.008, 4);
    const cx = s * (SX - 0.36);
    lathe("glow", cx, 1.62, SZ, [[0, 0], [0.09, 0], [0.15, 0.06], [0.17, 0.16], [0.15, 0.26], [0.09, 0.32], [0, 0.32]], 10);
    band("dark", cx, 1.62, SZ, 0.1, -0.02, 0.03, 10);
    band("dark", cx, 1.62, SZ, 0.1, 0.29, 0.34, 10);
  }
  const ropeY = (x) => RY - SAG * (1 - (x / SX) ** 2);
  for (let st = 0; st < 2; st++) {
    const pts = [];
    for (let i = 0; i <= 28; i++) {
      const x = -SX + (2 * SX * i) / 28, ph = st * Math.PI + (i / 28) * TAU * 3.5;
      const end = Math.min(1, (SX - Math.abs(x)) / 0.4 + 0.45); // thinner at the posts
      pts.push(V(x, ropeY(x) + Math.cos(ph) * 0.04 * end, SZ + Math.sin(ph) * 0.04 * end));
    }
    geoM("straw", new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.06, 6, false), new THREE.Matrix4());
  }
  // straw tassels between the shide
  for (const x of [-0.42, 0, 0.42]) {
    const y = ropeY(x) - 0.04;
    geoM("straw", new THREE.ConeGeometry(0.035, 0.24, 6), M(x, y - 0.12, SZ, Math.PI, 0, 0));
  }
  // shide: zigzag paper strips, four steps each, thin slabs facing +Z
  const shide = [];
  [-0.62, -0.21, 0.21, 0.62].forEach((x0, k) => {
    owner = 2000 + k;
    const top = ropeY(x0) - 0.05;
    shide.push({ x: x0, y: top + 0.03, z: SZ, ph: k * 0.27 + 0.1 });
    const W = 0.055, Hs = 0.1, T = 0.003;
    for (let j = 0; j < 4; j++) {
      const sx = x0 + (j % 2 ? 0.03 : -0.03) + (j === 0 ? 0.03 : 0);
      const y1 = top - j * Hs * 0.92, y0 = y1 - Hs;
      const lean = j % 2 ? -0.015 : 0.015; // a parallelogram, the zigzag's slant
      const out = [[sx - W / 2 - lean, y0], [sx + W / 2 - lean, y0], [sx + W / 2 + lean, y1], [sx - W / 2 + lean, y1]];
      prism("shide", out.map(([x, y]) => V(x, y, SZ + 0.07 + T)), out.map(([x, y]) => V(x, y, SZ + 0.07 - T)));
    }
    owner = -1;
  });

  // ---------- omikuji racks ----------
  function knot(x, y, z, ry) {
    // a tied fortune: one flat paper tail, wide at the knot on the line, a thin tetrahedron; most hang down, every
    // third sticks up (the other end of the fold), all rolled and splayed by the hash
    const s = rand() < 0.45 ? 1 : -1;
    const roll = jr(0.5), len = 0.055 + rand() * 0.03, w = 0.032 + rand() * 0.012, t = 0.006;
    const cr = Math.cos(roll), sr = Math.sin(roll), cy = Math.cos(ry), sy = Math.sin(ry);
    const P = (u, v, d) => {
      const uu = u * cr - v * sr, vv = u * sr + v * cr;
      return V(x + uu * cy + d * sy, y + vv, z - uu * sy + d * cy);
    };
    const tip = P(jr(0.012), s * len, 0), a = P(-w, -s * 0.01, t), b = P(w, -s * 0.01, t), e = P(0, -s * 0.01, -t);
    const ref = P(0, s * len * 0.25, 0);
    tri("knot", a, b, tip, ref), tri("knot", b, e, tip, ref), tri("knot", e, a, tip, ref), tri("knot", a, e, b, ref);
  }
  function rack(x0, x1, z, H, lines, rope) {
    for (const x of [x0, x1, (x0 + x1) / 2]) {
      box("wood", x, G + (H - G) / 2, z, 0.08, H - G, 0.08);
      box("wood", x, G + 0.03, z, 0.1, 0.06, 0.45);
    }
    box("wood", (x0 + x1) / 2, H + 0.03, z, x1 - x0 + 0.24, 0.07, 0.11);
    lines.forEach((y, w) => {
      if (rope) rod("straw", V(x0, y, z), V(x1, y, z), 0.014, 5);
      else rod("dark", V(x0, y, z), V(x1, y, z), 0.005, 4);
      const full = w % 3 === 1 ? 0.75 : 1; // some lines fuller than others
      const n = Math.round(KN * full * (x1 - x0) / 2.8);
      for (let k = 0; k < n; k++) {
        const x = x0 + 0.06 + ((x1 - x0 - 0.12) * (k + 0.5 + jr(0.45))) / n;
        if (Math.abs(x - (x0 + x1) / 2) < 0.05) continue;
        knot(x, y + jr(0.008), z + jr(0.02), jr(0.6));
      }
    });
  }
  const KN = 100; // knots per 2.8 m of line
  rack(1.55, 4.35, -0.7, 1.8, [0.62, 0.78, 0.94, 1.1, 1.26, 1.42, 1.58], false);
  rack(1.9, 4.6, -2.2, 1.95, [0.7, 0.88, 1.06, 1.24, 1.42, 1.6, 1.78], true);

  // ---------- omikuji table and box ----------
  const TX = 2.3, TZ = 0.55, TY = 0.72;
  box("wood", TX, TY - 0.02, TZ, 0.8, 0.04, 0.5);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box("wood", TX + sx * 0.35, G + (TY - 0.04 - G) / 2, TZ + sz * 0.2, 0.05, TY - 0.04 - G, 0.05);
  box("paper", TX, TY + 0.003, TZ, 0.84, 0.01, 0.54); // white cloth
  box("paper", TX, TY - 0.09, TZ + 0.27, 0.84, 0.18, 0.008); // its front drop
  {
    const r = 0.1, h = 0.32, y0 = TY + 0.008;
    const hex = (yy, rr) => [0, 1, 2, 3, 4, 5].map((k) => V(TX + Math.cos((k * TAU) / 6) * rr, yy, TZ + Math.sin((k * TAU) / 6) * rr));
    prism("red", hex(y0, r), hex(y0 + h, r));
    prism("paper", hex(y0 + 0.02, r + 0.006), hex(y0 + 0.06, r + 0.006));
    prism("paper", hex(y0 + h - 0.06, r + 0.006), hex(y0 + h - 0.02, r + 0.006));
    lathe("dark", TX, y0 + h, TZ, [[0, 0], [0.025, 0], [0.025, 0.006], [0, 0.006]], 8);
    // a small tray of drawn fortunes beside it
    box("wood", TX - 0.24, TY + 0.025, TZ + 0.05, 0.22, 0.03, 0.16);
    for (let k = 0; k < 4; k++) box("paper", TX - 0.24 + jr(0.06), TY + 0.045, TZ + 0.05 + jr(0.04), 0.03, 0.006, 0.12, jr(0.6));
  }

  // ---------- komodaru wall ----------
  const KX = -3.55, KZ0 = -3.0, KS = 0.58, STEP = 0.56, BASE = 0.34;
  for (let t = 0; t < 3; t++) {
    const xf = KX + 0.31 - t * 0.55, top = BASE + t * STEP;
    const xb = -4.95;
    const zlen = 7 * KS + 0.14 - t * 0.002;
    box("red", (xf + xb) / 2, G + (top - G) / 2 - 0.0, KZ0 + 3 * KS, xf - xb, top - G, zlen);
  }
  const barrel = [[0, 0], [0.25, 0], [0.27, 0.27], [0.24, 0.54], [0.2, 0.54], [0, 0.52]];
  for (let t = 0; t < 3; t++) {
    for (let j = 0; j < 7; j++) {
      const x = KX - t * 0.55, z = KZ0 + j * KS, y = G + BASE + t * STEP - G;
      lathe("straw", x, y, z, barrel, 10);
      hoop((j + t) % 3 === 1 ? "indigo" : "red", x, y, z, 0.279, 0.17, 0.37, 10);
    }
  }

  // ---------- andon lanterns ----------
  function andon(x, z) {
    box("wood", x, G + 0.55, z, 0.07, 1.1, 0.07);
    box("wood", x, 1.16, z, 0.32, 0.04, 0.32);
    box("glow", x, 1.36, z, 0.26, 0.36, 0.26);
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box("wood", x + dx * 0.135, 1.36, z + dz * 0.135, 0.03, 0.38, 0.03);
    lathe("dark", x, 1.54, z, [[0, 0], [0.24, 0], [0.24, 0.03], [0.05, 0.12], [0, 0.12]], 4, Math.PI / 4);
  }
  andon(-0.9, -1.3);
  andon(-2.75, -1.9);

  // ---------- takibi ----------
  const F = { x: -3.5, z: 2.7 };
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU + jr(0.08);
    const g = new THREE.DodecahedronGeometry(1, 0);
    geoM("stone", g, M(F.x + Math.cos(a) * 0.72, G + 0.075, F.z + Math.sin(a) * 0.72, jr(0.4), a, jr(0.4), 0.13, 0.1, 0.15));
  }
  lathe(fire ? "glow" : "dark", F.x, G - 0.01, F.z, [[0, 0], [0.55, 0], [0.45, 0.05], [0, 0.07]], 12);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + 0.3, foot = V(F.x + Math.cos(a) * 0.5, G + 0.04, F.z + Math.sin(a) * 0.5);
    rod("wood", foot, V(F.x + Math.cos(a) * 0.06, G + 0.82, F.z + Math.sin(a) * 0.06), 0.045, 6);
  }
  const tongues = [];
  if (fire) {
    const prof = (R, H) => {
      const out = [[0, 0]];
      for (let i = 1; i < 8; i++) {
        const v = i / 8;
        out.push([R * Math.sin(Math.PI * Math.min(1, v * 1.4) ** 0.8 * 0.5 + Math.PI * 0.5 * v) * (1 - v) ** 0.6, H * v]);
      }
      out.push([0, H]);
      return out;
    };
    const tongue = (key, dx, dz, R, H, ph) => {
      owner = tongues.length;
      tongues.push({ x: F.x + dx, z: F.z + dz, H, ph });
      lathe(key, F.x + dx, G + 0.03, F.z + dz, prof(R, H), 8);
      owner = -1;
    };
    tongue("flame", 0, 0, 0.34, 1.5, 0.0);
    tongue("flame", 0.26, -0.1, 0.22, 1.1, 0.37);
    tongue("flame", -0.25, 0.08, 0.22, 1.2, 0.71);
    tongue("flame", 0.06, 0.22, 0.22, 0.8, 0.53);
    tongue("flame", -0.1, -0.22, 0.2, 0.75, 0.19);
    tongue("core", 0.12, 0.22, 0.24, 0.9, 0.2);
    tongue("core", -0.06, 0.25, 0.16, 0.55, 0.85);
    tongue("core", 0.25, 0.08, 0.14, 0.5, 0.6);
  }

  // a pivot at the fire and at the racks, for close-ups (--focus fire, --focus omikuji)
  for (const [name, p] of [["fire", [F.x, 0.6, F.z]], ["omikuji", [3.0, 1.1, -1.6]], ["shimenawa", [0, RY, SZ]]]) {
    const j = new THREE.Group();
    j.name = name;
    j.position.set(...p);
    body.add(j);
    joints[name] = j;
  }

  // ---------- meshes ----------
  // key: [base, shade, threshold, hull px (0 = no ink)]
  const MAT = {
    gravel: [c.gravel, c.gravelShade, 0.35, 3],
    pebble: [c.pebble, c.pebble, 0.35, 0],
    stone: [c.stone, c.stoneShade, 0.25, 2.5],
    wood: [c.wood, c.woodShade, 0.2, 2.5],
    paper: [c.paper, c.paperShade, 0.1, 1.5],
    knot: [c.paper, c.paper, 0.1, 0],
    shide: [c.paper, c.paperShade, 0.1, 1.5],
    straw: [c.straw, c.strawShade, 0.25, 2.5],
    red: [c.red, c.redShade, 0.15, 2.5],
    indigo: [c.indigo, c.indigoShade, 0.3, 2],
    bamboo: [c.bamboo, c.bambooShade, 0.2, 2.5],
    dark: [c.dark, c.dark, 0.35, 0],
    flame: [c.flame, c.flame, -1, 2.5],
    core: [c.core, c.core, -1, 0],
    glow: [c.glow, c.glow, -1, 2],
  };
  const live = {};
  for (const [key, { p, n, o }] of Object.entries(soups)) {
    const [b, s, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, b, s, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    body.add(mesh);
    if (key === "flame" || key === "core" || key === "shide") {
      mesh.frustumCulled = false;
      live[key] = { g, p: Float32Array.from(p), o };
    }
  }

  // ---------- the flicker clip: rewrite flame, core and shide vertices ----------
  const CLIPS = { flicker: 1.5 };
  const PER = 1.5;
  function flicker(t) {
    const w = TAU / PER;
    for (const key of ["flame", "core"]) {
      const L = live[key];
      if (!L) continue;
      const P3 = L.g.attributes.position.array;
      for (let v = 0; v < L.o.length; v++) {
        const i = v * 3, tg = tongues[L.o[v]];
        if (!tg) continue;
        const y0 = G + 0.03;
        const lx = L.p[i] - tg.x, ly = L.p[i + 1] - y0, lz = L.p[i + 2] - tg.z;
        const h = Math.max(0, ly / tg.H), ph = tg.ph * TAU;
        const stretch = 1 + 0.14 * Math.sin(3 * w * t + ph) + 0.06 * Math.sin(5 * w * t + 2 * ph);
        const narrow = 1 - 0.1 * Math.sin(3 * w * t + ph);
        const sway = h ** 1.6 * tg.H * 0.22;
        const dx = sway * (Math.sin(2 * w * t + ph + h * 2.2) * 0.8 + 0.25 * Math.sin(4 * w * t + 1.3 * ph));
        const dz = sway * 0.6 * Math.sin(3 * w * t + 0.5 * ph + h * 1.7);
        P3[i] = tg.x + lx * narrow + dx;
        P3[i + 1] = y0 + ly * stretch;
        P3[i + 2] = tg.z + lz * narrow + dz;
      }
      L.g.attributes.position.needsUpdate = true;
      L.g.computeBoundingSphere();
      L.g.computeBoundingBox();
    }
    const L = live.shide;
    if (L) {
      const P3 = L.g.attributes.position.array;
      for (let v = 0; v < L.o.length; v++) {
        const i = v * 3, sd = shide[L.o[v] - 2000];
        const ph = sd.ph * TAU;
        const ly = L.p[i + 1] - sd.y, lz = L.p[i + 2] - sd.z, lx = L.p[i] - sd.x;
        const d = Math.min(1, -ly / 0.45); // flutter grows down the strip
        const ax = (0.28 * Math.sin(w * t + ph) + 0.12 * Math.sin(3 * w * t + 2 * ph)) * (0.5 + d);
        const az = 0.1 * Math.sin(2 * w * t + ph) * d;
        const ca = Math.cos(ax), sa = Math.sin(ax), cb = Math.cos(az), sb = Math.sin(az);
        // swing about x (toward +-z), then a little about z
        const y1 = ly * ca - lz * sa, z1 = ly * sa + lz * ca;
        P3[i] = sd.x + lx * cb - y1 * sb;
        P3[i + 1] = sd.y + lx * sb + y1 * cb;
        P3[i + 2] = sd.z + z1;
      }
      L.g.attributes.position.needsUpdate = true;
      L.g.computeBoundingSphere();
      L.g.computeBoundingBox();
    }
    root.updateMatrixWorld(true);
  }

  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`omamori-juyo: no clip "${m[1]}" (clips: flicker)`);
      return flicker(+m[2]);
    }
    if (name !== "rest") throw new Error(`omamori-juyo: unknown pose "${name}" (rest, or flicker@<seconds>)`);
    flicker(0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
