// hanami-picnic.js - a cherry-blossom viewing picnic spread (hanami): blue sheet, jubako bento, drinks, petals. Static.
// Contract: harness/lab/README.md. Meters, +Y up, the open side of the spread (the shoes, the open bento) faces +Z,
// its left is +X, stands on y = 0, centred on x = 0, z = 0 (the bbox of the whole set).
//
// Construction (triangle soups merged per material across every piece, so the whole spread is 8 meshes):
//   SHEET    the "blue sheet": one closed heightfield slab (80 x 80 grid, smooth normals, 4 mm thick, flat bottom).
//            Soft wrinkles are ridges, each a Gaussian cross-section along a short segment with a sine envelope: two
//            fanning in from every weighted corner, a few running in from the edges. They fade to flat under every
//            item's footprint, so things sit on the sheet. The sheet's tone pair is inverted on purpose: base = the
//            pale moon highlight, shade = the indigo sky, threshold 0.86. A flat sheet (dot 0.72) is all indigo; only
//            wrinkle slopes tilted ~15 deg toward the light flip to the pale streak, the anime plastic sheen.
//   BENTO    a lacquered jubako, 24 cm square: tiers are red boxes with a black lacquer band at every lip and a lid.
//            "closed": three tiers and the lid stacked. "open": two tiers and the lid stacked, the third tier set
//            in front of them, open, with a raised rice bed so the food clears the rim from a low camera: three
//            onigiri (rounded triangles, extruded and bevelled, a nori band) standing at the back, tamagoyaki slices
//            and octopus sausages (capsule bodies, six splayed legs) at the front, sawtooth baran dividers between.
//   PROPS    a thermos with a red cup-cap, three paper cups (tea surfaces), two cans and one on its side, two pairs of
//            chopsticks on the open tier's flank, two zabuton cushions (superellipsoids), four rocks pinning the
//            corners, a pair of sneakers left at the front edge, heels to the sheet.
//   PETALS   flat notched sakura petals (2 mm prisms, no ink), scattered by a seeded hash (mulberry32), tilted to the
//            sheet's slope; most on the sheet away from the items, a few on the ground around it, some on the lid
//            and the cushions.
//   Built from THREE geometries (non-indexed, transformed, wound by three.js, never mirrored) plus the custom sheet,
//   whose triangles are wound away from a point inside the slab.
// Proportions (real size): sheet 2.7 x 2.7 m (a 3.6 x 3.6 shaku "blue sheet" is 2.7 m); jubako 24 x 24 cm, tiers
// 6.5 cm, lid 3 cm; thermos 9 cm across, 33 cm with its cap (the top of the set, meta.height); cups 8.5 cm; cans
// 12.2 cm; zabuton 55 x 59 x 10 cm; sneakers 26 cm; petals 3.6 cm (sakura petals are 1.5-2 cm: drawn twice size so
// they survive the thumbnail, as anime draws them).
// Options: build(THREE, kit, colors, { height, petals, bento }).
//   height  scales the set uniformly so its top (the thermos cap) is `height` (default meta.height).
//   petals  how many petals (default 180; 0 for none). The positions are the same for a given count.
//   bento   "open" (default) or "closed".
// Script: indigo. It is the only script with a saturated blue (sky #1b2d6b) for the blue sheet, the biggest mass and
// the one cue that says "hanami spot" before anything else; the pale-pink skin #f0c2ae petals sit on it at full value
// contrast. meadow's only blue is the pale sky #d7ecef, against which the same skin petals all but vanish (one value
// apart), and its lacquer would have to be green-black. The cost: indigo has no green, so the baran dividers are
// the pale moon tone; they read as dividers by their sawtooth, not their colour.
// Colours (indigo): sheet moon #d5e2ff (sheen) / sky #1b2d6b; lacquer accent #e23b4a flat (red jubako, sausages,
// thermos cap, sneaker uppers, a can); black lacquer bands, nori, sneaker collars hair #16141c flat (lines, no hull);
// white sclera #f6f3ee / moon #d5e2ff (onigiri, rice bed, cups, thermos, rocks, soles, can lids); egg practical
// #f0c36a / iris #e7a04a (tamagoyaki, a cushion, the gold can, chopsticks); pale moon #d5e2ff / line #e7eefc
// (dividers, the second cushion, the silver can); tea iris flat; petals skin #f0c2ae flat.

export const meta = {
  name: "hanami-picnic",
  height: 0.33,
  script: "indigo",
  colors: {
    sheet: "#d5e2ff", sheetShade: "#1b2d6b",
    lacquer: "#e23b4a", lacquerShade: "#e23b4a",
    black: "#16141c", blackShade: "#16141c",
    white: "#f6f3ee", whiteShade: "#d5e2ff",
    egg: "#f0c36a", eggShade: "#e7a04a",
    pale: "#d5e2ff", paleShade: "#e7eefc",
    tea: "#e7a04a", teaShade: "#e7a04a",
    petal: "#f0c2ae", petalShade: "#f0c2ae",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, petals = 220, bento = "open" } = opts;
  const open = bento !== "closed";
  const root = new THREE.Group();
  root.name = "hanami-picnic";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / meta.height);
  root.add(body);
  const joints = {};

  // ---------- seeded hash ----------
  let seed = 0x5a6b2c1d;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // ---------- triangle soups ----------
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();
  // place a THREE geometry: scale (positive only), Euler rotation (YXZ), translation
  function geo(key, g, [x, y, z], [rx, ry, rz] = [0, 0, 0], [sx, sy, sz] = [1, 1, 1], parent) {
    let q = g.index ? g.toNonIndexed() : g.clone();
    if (!q.attributes.normal) q.computeVertexNormals();
    tmpM.compose(tmpP.set(x, y, z), tmpQ.setFromEuler(tmpE.set(rx, ry, rz, "YXZ")), tmpS.set(sx, sy, sz));
    if (parent) tmpM.premultiply(parent);
    q.applyMatrix4(tmpM);
    const s = S(key), P = q.attributes.position.array, N = q.attributes.normal.array;
    for (let i = 0; i < P.length; i++) s.p.push(P[i]), s.n.push(N[i]);
  }
  const box = (key, [x, y, z], [w, h, d], rot, parent) => geo(key, new THREE.BoxGeometry(w, h, d), [x, y + h / 2, z], rot, undefined, parent);
  const cyl = (key, [x, y, z], rt, rb, h, seg = 14, rot, parent) => geo(key, new THREE.CylinderGeometry(rt, rb, h, seg), [x, y + h / 2, z], rot, undefined, parent);
  // superellipsoid: a sphere pushed toward a box (e < 1 squarer), half sizes a, b, d, bottom on y
  function superBall(key, [x, y, z], [a, b, d], e = 0.35, ey = 0.7, ry = 0, seg = 20) {
    const g = new THREE.SphereGeometry(1, seg, Math.round(seg / 2));
    const p = g.attributes.position;
    const f = (v, k) => Math.sign(v) * Math.abs(v) ** k;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, f(p.getX(i), e), f(p.getY(i), ey), f(p.getZ(i), e));
    g.computeVertexNormals();
    geo(key, g, [x, y + b, z], [0, ry, 0], [a, b, d]);
  }

  // ---------- the sheet ----------
  const HALF = 1.35, T = 0.004;
  const keep = []; // item footprints the wrinkles fade away from: [x, z, r]
  const ridges = [];
  const ridge = (x0, z0, ang, len, amp, w) => ridges.push({ x0, z0, dx: Math.cos(ang), dz: Math.sin(ang), len, amp, w });
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const base = Math.atan2(-sz, -sx); // toward the centre
    for (const k of [-1, 1]) ridge(sx * (HALF - 0.14), sz * (HALF - 0.14), base + k * (0.28 + 0.12 * rand()), 0.55 + 0.4 * rand(), 0.028 + 0.012 * rand(), 0.05 + 0.02 * rand());
  }
  for (let e = 0; e < 4; e++)
    for (let k = 0; k < 2; k++) {
      const u = (rand() - 0.5) * 1.6, ang = (e * Math.PI) / 2 + Math.PI + (rand() - 0.5) * 0.7;
      const [x0, z0] = [[HALF, u], [u, HALF], [-HALF, u], [u, -HALF]][e];
      ridge(x0, z0, ang, 0.3 + 0.3 * rand(), 0.022 + 0.01 * rand(), 0.045 + 0.02 * rand());
    }
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  function lift(x, z) {
    let h = 0;
    for (const r of ridges) {
      const px = x - r.x0, pz = z - r.z0, t = (px * r.dx + pz * r.dz) / r.len;
      if (t <= 0 || t >= 1) continue;
      const d = px * -r.dz + pz * r.dx;
      h += r.amp * Math.sin(Math.PI * t) ** 0.7 * Math.exp(-((d / r.w) ** 2));
    }
    for (const [kx, kz, kr] of keep) h *= smooth(kr, kr + 0.12, Math.hypot(x - kx, z - kz));
    return h;
  }
  const top = (x, z) => T + lift(x, z);

  // ---------- layout (x, z of each piece) ----------
  const J = 0.24, TIER = 0.065, LID = 0.03;
  const stackAt = [-0.12, -0.08], openAt = [0.2, 0.2];
  const thermosAt = [-0.6, -0.12], cupsAt = [[-0.45, 0.1], [-0.6, 0.12], [-0.42, -0.32]];
  const cansAt = [[0.52, -0.38], [0.64, -0.3]], canLyingAt = [0.46, -0.16];
  const cushA = [0.02, 0.82], cushB = [-0.72, 0.62];
  const rocksAt = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sz]) => [sx * (HALF - 0.11), sz * (HALF - 0.11)]);
  keep.push([...stackAt, 0.2], [...thermosAt, 0.08], [-0.52, 0.11, 0.12], [-0.42, -0.32, 0.06], [0.56, -0.3, 0.17], [...cushA, 0.36], [...cushB, 0.36]);
  for (const r of rocksAt) keep.push([...r, 0.1]);
  if (open) keep.push([...openAt, 0.2], [0.42, 0.24, 0.12]);

  // sheet slab
  {
    const N = 80, s = S("sheet");
    const V = [], Nn = [];
    const e = 0.004;
    for (let j = 0; j <= N; j++)
      for (let i = 0; i <= N; i++) {
        const x = -HALF + (2 * HALF * i) / N, z = -HALF + (2 * HALF * j) / N;
        V.push([x, top(x, z), z]);
        const gx = (lift(x + e, z) - lift(x - e, z)) / (2 * e), gz = (lift(x, z + e) - lift(x, z - e)) / (2 * e);
        const l = Math.hypot(gx, 1, gz);
        Nn.push([-gx / l, 1 / l, -gz / l]);
      }
    const id = (i, j) => j * (N + 1) + i;
    const push = (a, na) => (s.p.push(...a), s.n.push(...na));
    // top: (i,j) (i,j+1) (i+1,j+1) has normal +Y (x right, z toward the viewer)
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const a = id(i, j), b = id(i + 1, j), cc = id(i + 1, j + 1), d = id(i, j + 1);
        for (const k of [a, d, cc, a, cc, b]) push(V[k], Nn[k]);
      }
    // sides and bottom, wound away from the slab's inside
    const ring = [];
    for (let i = 0; i < N; i++) ring.push(id(i, 0));
    for (let j = 0; j < N; j++) ring.push(id(N, j));
    for (let i = N; i > 0; i--) ring.push(id(i, N));
    for (let j = N; j > 0; j--) ring.push(id(0, j));
    const tri = (A, B, C, ref) => {
      const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], v = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
      let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const m = [(A[0] + B[0] + C[0]) / 3 - ref[0], (A[1] + B[1] + C[1]) / 3 - ref[1], (A[2] + B[2] + C[2]) / 3 - ref[2]];
      const flip = n[0] * m[0] + n[1] * m[1] + n[2] * m[2] < 0;
      const l = Math.hypot(...n) * (flip ? -1 : 1);
      n = n.map((q) => q / l);
      if (flip) push(A, n), push(C, n), push(B, n);
      else push(A, n), push(B, n), push(C, n);
    };
    for (let k = 0; k < ring.length; k++) {
      const A = V[ring[k]], B = V[ring[(k + 1) % ring.length]];
      const a0 = [A[0], 0, A[2]], b0 = [B[0], 0, B[2]];
      const ref = [A[0] * 0.9, 0.002, A[2] * 0.9];
      tri(a0, b0, B, ref), tri(a0, B, A, ref);
    }
    const ref = [0, 1, 0];
    tri([-HALF, 0, -HALF], [HALF, 0, -HALF], [HALF, 0, HALF], ref);
    tri([-HALF, 0, -HALF], [HALF, 0, HALF], [-HALF, 0, HALF], ref);
  }

  // ---------- jubako ----------
  const BAND = 0.007;
  function tier(x, y, z, ry, hollow) {
    const M = new THREE.Matrix4().compose(tmpP.set(x, y, z), tmpQ.setFromEuler(tmpE.set(0, ry, 0)), tmpS.set(1, 1, 1));
    if (!hollow) box("lacquer", [0, 0, 0], [J, TIER, J], undefined, M);
    else {
      const w = 0.01;
      box("lacquer", [0, 0, 0], [J, 0.01, J], undefined, M);
      box("lacquer", [0, 0, J / 2 - w / 2], [J, TIER, w], undefined, M);
      box("lacquer", [0, 0, -J / 2 + w / 2], [J, TIER, w], undefined, M);
      box("lacquer", [J / 2 - w / 2, 0, 0], [w, TIER, J - 2 * w], undefined, M);
      box("lacquer", [-J / 2 + w / 2, 0, 0], [w, TIER, J - 2 * w], undefined, M);
    }
    // black lacquer band round the lip, 1.5 mm proud
    if (!hollow) box("black", [0, TIER - BAND, 0], [J + 0.003, BAND, J + 0.003], undefined, M);
    else {
      const b = 0.0115, o = J + 0.003; // a frame round the rim, 1.5 mm proud outside and inside
      box("black", [0, TIER - BAND, o / 2 - b / 2], [o, BAND, b], undefined, M);
      box("black", [0, TIER - BAND, -o / 2 + b / 2], [o, BAND, b], undefined, M);
      box("black", [o / 2 - b / 2, TIER - BAND, 0], [b, BAND, o - 2 * b], undefined, M);
      box("black", [-o / 2 + b / 2, TIER - BAND, 0], [b, BAND, o - 2 * b], undefined, M);
    }
    return M;
  }
  function lid(x, y, z, ry) {
    const M = new THREE.Matrix4().compose(tmpP.set(x, y, z), tmpQ.setFromEuler(tmpE.set(0, ry, 0)), tmpS.set(1, 1, 1));
    box("lacquer", [0, 0, 0], [J + 0.006, LID - 0.006, J + 0.006], undefined, M);
    box("lacquer", [0, LID - 0.006, 0], [J - 0.02, 0.006, J - 0.02], undefined, M);
    box("black", [0, 0, 0], [J + 0.009, BAND, J + 0.009], undefined, M);
    return M;
  }
  const nStack = open ? 2 : 3, stackYaw = 0.12;
  for (let k = 0; k < nStack; k++) tier(stackAt[0], T + k * TIER, stackAt[1], stackYaw, false);
  const lidY = T + nStack * TIER;
  lid(stackAt[0], lidY, stackAt[1], stackYaw);
  const lidTop = lidY + LID;

  // the open tier and its food (local frame: tier centred, floor at y = 0)
  if (open) {
    const M = tier(openAt[0], T, openAt[1], -0.18, true);
    const BED = 0.03, I = J / 2 - 0.01; // rice bed top, inner half size
    box("white", [0, 0.01, 0], [2 * I, BED - 0.01, 2 * I], undefined, M);
    // onigiri: rounded triangles standing along the back, a nori band at the base
    // a triangle with fat rounded corners: each corner a quadratic curve between points 30 % along its two edges
    const tri = new THREE.Shape();
    const R = 0.042, cor = [0, 1, 2].map((k) => [R * Math.cos(Math.PI / 2 + (k * 2 * Math.PI) / 3), R * Math.sin(Math.PI / 2 + (k * 2 * Math.PI) / 3)]);
    const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    for (let k = 0; k < 3; k++) {
      const P = cor[k], A = lerp2(P, cor[(k + 2) % 3], 0.3), B = lerp2(P, cor[(k + 1) % 3], 0.3);
      k ? tri.lineTo(...A) : tri.moveTo(...A);
      tri.quadraticCurveTo(...P, ...B);
    }
    tri.closePath();
    const oni = new THREE.ExtrudeGeometry(tri, { depth: 0.016, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 3, curveSegments: 5 });
    oni.translate(0, R / 2 + 0.006, -0.008); // base on y = 0, centred in depth
    const nori = new THREE.BoxGeometry(0.032, 0.036, 0.036);
    nori.translate(0, 0.018, 0);
    for (let k = 0; k < 3; k++) {
      const ox = -0.072 + k * 0.072, oz = -0.06;
      geo("white", oni, [ox, BED, oz], [-0.12, 0, 0], [1, 1, 1], M);
      geo("black", nori, [ox, BED - 0.001, oz + 0.001], [-0.12, 0, 0], [1, 1, 1], M);
    }
    // baran: sawtooth dividers
    function baran(x, z, len, ry) {
      const sh = new THREE.Shape();
      sh.moveTo(-len / 2, 0);
      sh.lineTo(len / 2, 0);
      const n = Math.round(len / 0.016);
      for (let k = n; k >= 0; k--) sh.lineTo(-len / 2 + (k * len) / n, k % 2 ? 0.034 : 0.024);
      sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.004, bevelEnabled: false });
      g.translate(0, 0, -0.002);
      geo("pale", g, [x, BED - 0.004, z], [0, ry, 0], [1, 1, 1], M);
    }
    baran(0, -0.012, 2 * I - 0.006, 0);
    baran(0.0, 0.055, 2 * I * 0.5 - 0.01, Math.PI / 2);
    // tamagoyaki: four slices leaning on each other, front-left
    for (let k = 0; k < 4; k++) {
      const g = new THREE.BoxGeometry(0.024, 0.036, 0.042);
      g.translate(0, 0.018, 0);
      geo("egg", g, [-0.083 + k * 0.023, BED, 0.052], [0, 0, -0.1], [1, 1, 1], M);
    }
    // octopus sausages, front-right: a capsule head over six splayed legs
    const head = new THREE.CapsuleGeometry(0.011, 0.012, 3, 8);
    const leg = new THREE.ConeGeometry(0.0045, 0.02, 5);
    for (const [sx, sz, a] of [[0.035, 0.03, 0.3], [0.075, 0.035, 1.2], [0.04, 0.078, 2.1], [0.08, 0.08, 0.7]]) {
      geo("lacquer", head, [sx, BED + 0.031, sz], [0.2, a, 0.15], [1, 1, 1], M);
      for (let k = 0; k < 6; k++) {
        const b = a + (k * Math.PI) / 3;
        geo("lacquer", leg, [sx + 0.011 * Math.sin(b), BED + 0.009, sz + 0.011 * Math.cos(b)], [2.0, b, 0], [1, 1, 1], M);
      }
    }
    // chopsticks: two pairs beside the tier
    for (const [x, z, a, key] of [[0.4, 0.2, 0.15, "egg"], [0.44, 0.27, 0.05, "egg"]])
      for (const d of [-0.006, 0.006])
        geo(key, new THREE.CylinderGeometry(0.0022, 0.0038, 0.22, 6), [x + d, T + 0.0038, z], [Math.PI / 2, a, 0]);
  }

  // ---------- drinks ----------
  cyl("white", [thermosAt[0], T, thermosAt[1]], 0.045, 0.045, 0.25, 18);
  cyl("white", [thermosAt[0], T + 0.25, thermosAt[1]], 0.036, 0.045, 0.02, 18);
  cyl("lacquer", [thermosAt[0], T + 0.268, thermosAt[1]], 0.047, 0.04, 0.058, 18);
  for (const [x, z] of cupsAt) {
    cyl("white", [x, T, z], 0.037, 0.027, 0.085, 14);
    cyl("tea", [x, T + 0.085, z], 0.031, 0.031, 0.0015, 14);
  }
  const canKeys = ["egg", "lacquer"];
  cansAt.forEach(([x, z], k) => {
    cyl(canKeys[k], [x, T + 0.008, z], 0.033, 0.033, 0.106, 16);
    cyl("white", [x, T, z], 0.03, 0.027, 0.008, 16);
    cyl("white", [x, T + 0.114, z], 0.028, 0.033, 0.008, 16);
  });
  geo("pale", new THREE.CylinderGeometry(0.033, 0.033, 0.12, 16), [canLyingAt[0], T + 0.033, canLyingAt[1]], [0, 0.9, Math.PI / 2]);

  // ---------- cushions, rocks, shoes ----------
  superBall("egg", [cushA[0], T, cushA[1]], [0.275, 0.05, 0.295], 0.3, 0.75, 0.2);
  superBall("pale", [cushB[0], T, cushB[1]], [0.275, 0.05, 0.295], 0.3, 0.75, -0.15);
  for (const [x, z] of rocksAt) {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      // deterministic lumps keyed on the vertex direction, so shared corners move together
      const k = 1 + 0.16 * Math.sin(7.1 * p.getX(i) + 3.3 * p.getY(i) + 5.7 * p.getZ(i) + x * 9 + z * 4);
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
    }
    g.computeVertexNormals();
    geo("white", g, [x, T + 0.033, z], [0, x * 3 + z, 0], [0.07, 0.03, 0.058]);
  }
  // sneakers at the front edge, heels toward the sheet, toes out (+Z)
  for (const [x, a] of [[0.12, 0.08], [0.25, -0.05]]) {
    const z = HALF + 0.17;
    const M = new THREE.Matrix4().compose(tmpP.set(x, 0, z), tmpQ.setFromEuler(tmpE.set(0, a, 0)), tmpS.set(1, 1, 1));
    const sole = new THREE.SphereGeometry(1, 16, 8);
    const pp = sole.attributes.position;
    for (let i = 0; i < pp.count; i++) {
      const f = (v, k) => Math.sign(v) * Math.abs(v) ** k;
      pp.setXYZ(i, f(pp.getX(i), 0.45), f(pp.getY(i), 0.4), f(pp.getZ(i), 0.6));
    }
    sole.computeVertexNormals();
    geo("white", sole, [0, 0.012, 0], [0, 0, 0], [0.046, 0.012, 0.13], M);
    // upper: a dome dropping toward the toe, a raised heel collar, a white toe cap and a dark opening
    geo("lacquer", new THREE.SphereGeometry(1, 16, 10), [0, 0.038, -0.01], [0.14, 0, 0], [0.041, 0.034, 0.108], M);
    geo("lacquer", new THREE.CylinderGeometry(0.034, 0.038, 0.06, 14), [0, 0.042, -0.07], [-0.12, 0, 0], [1, 1, 1], M);
    geo("black", new THREE.CylinderGeometry(0.028, 0.028, 0.004, 14), [0, 0.073, -0.074], [-0.12, 0, 0], [1, 1, 1.25], M);
    geo("white", new THREE.SphereGeometry(1, 12, 6), [0, 0.02, 0.078], [0, 0, 0], [0.038, 0.02, 0.04], M);
  }
  // zabuton tufts (the centre tie)
  for (const [x, z] of [cushA, cushB]) cyl("lacquer", [x, T + 0.096, z], 0.014, 0.018, 0.012, 8);

  // ---------- petals ----------
  {
    const sh = new THREE.Shape(), L = 0.044, W = 0.032;
    sh.moveTo(0, 0);
    sh.bezierCurveTo(W * 0.55, L * 0.25, W * 0.6, L * 0.75, W * 0.28, L);
    sh.lineTo(0, L * 0.86); // the notch
    sh.lineTo(-W * 0.28, L);
    sh.bezierCurveTo(-W * 0.6, L * 0.75, -W * 0.55, L * 0.25, 0, 0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.002, bevelEnabled: false, curveSegments: 3 });
    g.translate(0, -L / 2, 0);
    g.rotateX(-Math.PI / 2); // lie flat, extruded upward
    const blocked = (x, z) => keep.some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr + 0.02) || (x > -0.05 && x < 0.4 && z > HALF + 0.02 && z < HALF + 0.33);
    let placed = 0, tries = 0;
    const onLid = Math.min(petals, 4), onCush = Math.min(Math.max(0, petals - onLid), 6);
    const base = Math.max(0, petals - onLid - onCush);
    while (placed < base && tries < base * 20) {
      tries++;
      const off = rand() < 0.1; // a few blown off the sheet
      const x = off ? (rand() * 2 - 1) * (HALF + 0.22) : (rand() * 2 - 1) * (HALF - 0.04);
      const z = off ? (rand() * 2 - 1) * (HALF + 0.22) : (rand() * 2 - 1) * (HALF - 0.04);
      const yaw = rand() * Math.PI * 2;
      if (off && Math.max(Math.abs(x), Math.abs(z)) < HALF + 0.04) continue;
      if (blocked(x, z)) continue;
      placed++;
      const onSheet = !off;
      const y = onSheet ? top(x, z) + 0.0008 : 0.0008;
      let rx = 0, rz = 0;
      if (onSheet) {
        const e = 0.01;
        rz = Math.atan((lift(x + e, z) - lift(x - e, z)) / (2 * e));
        rx = -Math.atan((lift(x, z + e) - lift(x, z - e)) / (2 * e));
      }
      geo("petal", g, [x, y, z], [rx, yaw, rz]);
    }
    for (let k = 0; k < onLid; k++) geo("petal", g, [stackAt[0] - 0.06 + 0.05 * k * (k % 2 ? 1 : 0.6), lidTop + 0.0008, stackAt[1] - 0.05 + 0.035 * k], [0, rand() * 6.28, 0]);
    for (let k = 0; k < onCush; k++) {
      const [cx, cz] = k % 2 ? cushA : cushB;
      geo("petal", g, [cx + (rand() - 0.5) * 0.3, T + 0.1 + 0.0005, cz + (rand() - 0.5) * 0.3], [0, rand() * 6.28, 0]);
    }
  }

  // ---------- centre the footprint ----------
  const lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (const { p } of Object.values(soups))
    for (let i = 0; i < p.length; i += 3)
      for (const [k, j] of [[0, 0], [1, 2]]) (lo[k] = Math.min(lo[k], p[i + j])), (hi[k] = Math.max(hi[k], p[i + j]));
  body.position.set((-(lo[0] + hi[0]) / 2) * body.scale.x, 0, (-(lo[1] + hi[1]) / 2) * body.scale.x);

  // ---------- meshes: one per material ----------
  const MAT = {
    sheet: [c.sheet, c.sheetShade, 0.86, 3],
    lacquer: [c.lacquer, c.lacquerShade, 0.35, 2.5],
    black: [c.black, c.blackShade, 0.35, 0],
    white: [c.white, c.whiteShade, 0.1, 2.5],
    egg: [c.egg, c.eggShade, 0.3, 2],
    pale: [c.pale, c.paleShade, 0.3, 2],
    tea: [c.tea, c.teaShade, 0.35, 0],
    petal: [c.petal, c.petalShade, 0.35, 0],
  };
  for (const [key, { p, n }] of Object.entries(soups)) {
    const [base, shade, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    body.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
