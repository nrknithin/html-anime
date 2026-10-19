// sports-ground.js - a section of a Japanese school sports ground on sports day (undoukai): a dirt track with white
// lanes and a finish tape, the white event tent with its table and chairs, low concrete spectator steps, a string of
// bunting from the tent to a pole, a coiled tug-of-war rope, the basket-toss (tamaire) pole and its beanbags.
// Contract: harness/lab/README.md. Meters, +Y up, the track runs along X at the front (+Z, toward the camera), the
// tent and the steps face it from the back (-Z), the set's left is +X; stands on y = 0, centred on x = 0, z = 0.
//
// Construction (boxes, prisms, tubes, lathes and spheres as triangle soups merged per material across every piece, so
// the whole set piece is 14 meshes; every triangle is wound away from a point inside its solid, never by hand):
//   GROUND   one dirt slab 13 x 9 m, 3 cm thick. Lane lines are thin flat boxes 6 mm proud, no hull (chalk lines):
//            five lines make four 0.9 m lanes, a start line at the -X end and a wide finish line near +X.
//   FINISH   two white poles astride the lanes at the finish line, red ball tops, a red tape between them (a ribbon of
//            box segments along a shallow sag).
//   TENT     a 3.6 x 2.7 m gable tent: one closed prism roof (eave rectangle, ridge along X), a green valance band
//            round the eaves, four dark corner poles. Under it a folding table and three pipe chairs facing the track.
//   STEPS    three concrete tiers 0.33 m high and 0.6 m deep, each one box from the ground (inner faces stay hidden),
//            so treads (lit, moon) and risers (shade, sky) alternate.
//   BUNTING  a sagging string (parabola) from the tent's ridge end to a tall pole; 22 triangular flags hang from it,
//            each a 10 mm thick prism hinged on its string segment, colours dealt red, yellow, green, blue, white.
//   PROPS    the tug-of-war rope as one flat spiral tube (five turns) with a loose tail; the tamaire pole (white, on a
//            round foot) with a green open basket lathe on top; red and white beanbags scattered round its foot.
// Proportions (real size; base unit the lane width L = 0.9 m): track 4 lanes = 4 L, lines 8 cm (5 cm chalk, thickened
//   so they survive the thumbnail); finish poles 1.25 m, tape at 1.0 m; tent eaves 2.05 m, ridge 2.65 m; table 0.72 m,
//   chair seats 0.45 m; steps 0.99 m at the top; bunting pole 3.4 m, flags 0.3 x 0.36 m (stylised ~1.5x real);
//   tamaire pole 3.9 m with its basket rim at 4.25 m (the top of the set, meta.height); rope 7 cm thick (stylised ~1.6x);
//   beanbags 12 cm across (stylised ~1.5x).
// Options: build(THREE, kit, colors, { height = meta.height }) scales the whole set uniformly so its top is `height`.
// Clip: breeze 3 s, looping (pose("breeze@1.2")). A breeze toward +Z (the track and the camera): every flag swings about
//   its string segment with a lean plus whole-number-frequency flutter (n = 2, 3, so 3 s == 0 s), each vertex rotated by
//   an angle that grows and lags with its distance from the string, so the flags ripple, not swing as plates.
//   Positions, normals and hull normals of the five flag meshes are rewritten in place (the hull shares the geometry).
//   Everything else is still. pose("rest") is still air: the flags hang plumb.
// Colours (meadow: the one script with greens for the tent band and the chairs, a pale sky-grey for concrete and a
//   warm pale skin for dirt; festival's dark sky would put the whole ground in night):
//   dirt skin #f0c2ae / practical #f2c94c (only the slab edge is shade); chalk lines sclera #f6f3ee flat, no hull;
//   canvas, white poles and white beanbags (own mesh, thinner ink) sclera #f6f3ee / sky #d7ecef; concrete and table top moon #f7f3e1 / sky #d7ecef;
//   dark frame, string, tubes hair #2c5131 flat; tent band, chair seats, basket iris #3f8a47 / hair #2c5131;
//   rope moon #f7f3e1 / practical #f2c94c; tape, red beanbags, pole tops accent #d9483b flat; flags flat at threshold
//   -1: accent #d9483b, practical #f2c94c, iris #3f8a47, sky #d7ecef, sclera #f6f3ee. Every shade lighter than ink
//   #1c261b and distinct from what it overlaps.

export const meta = {
  name: "sports-ground",
  height: 4.24,
  script: "meadow",
  colors: {
    dirt: "#f0c2ae", dirtShade: "#f2c94c",
    chalk: "#f6f3ee",
    canvas: "#f6f3ee", canvasShade: "#d7ecef",
    concrete: "#f7f3e1", concreteShade: "#d7ecef",
    frame: "#2c5131",
    green: "#3f8a47", greenShade: "#2c5131",
    rope: "#f7f3e1", ropeShade: "#f2c94c",
    red: "#d9483b",
    flagRed: "#d9483b", flagYellow: "#f2c94c", flagGreen: "#3f8a47", flagBlue: "#d7ecef", flagWhite: "#f6f3ee",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const { height = meta.height } = opts;
  const TAU = Math.PI * 2;
  const root = new THREE.Group();
  root.name = "sports-ground";
  const body = new THREE.Group(); // the size scale lives here
  body.name = "body";
  root.add(body);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  const count = (key) => S(key).p.length / 3;
  // one triangle wound away from `ref`; vertex normals given, or the face normal
  function tri(key, a, b, e, ref, na, nb, ne) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const m = mul(add(add(a, b), e), 1 / 3);
    const flip = dot(n, sub(m, ref)) < 0;
    if (flip) n = mul(n, -1);
    n = nrm(n);
    const [B, NB, E, NE] = flip ? [e, ne, b, nb] : [b, nb, e, ne];
    const s = S(key);
    for (const [q, nq] of [[a, na], [B, NB], [E, NE]]) s.p.push(...q), s.n.push(...(nq ?? n));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  const centroid = (pts) => [0, 1, 2].map((i) => pts.reduce((s, q) => s + q[i], 0) / pts.length);
  // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
  function hex(key, p) {
    const ref = centroid(p);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  const box = (key, x0, x1, y0, y1, z0, z1) =>
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  // a tube of radius r along a smooth path; pn fixes the ring basis (a direction never along the path); ends capped
  function tube(key, path, r, pn = [1, 0, 0], sides = 6) {
    const L = path.length;
    const rings = path.map((P, i) => {
      const T = nrm(sub(path[Math.min(L - 1, i + 1)], path[Math.max(0, i - 1)]));
      const u = nrm(sub(pn, mul(T, dot(pn, T)))), w = cross(T, u);
      const ring = [];
      for (let j = 0; j < sides; j++) {
        const a = (j / sides) * TAU;
        const d = add(mul(u, Math.cos(a)), mul(w, Math.sin(a)));
        ring.push({ q: add(P, mul(d, r)), n: d });
      }
      return { P, T, ring };
    });
    for (let i = 0; i < L - 1; i++) {
      const R0 = rings[i], R1 = rings[i + 1], ref = mul(add(R0.P, R1.P), 0.5);
      for (let j = 0; j < sides; j++) {
        const k = (j + 1) % sides;
        const [a, b, e, d] = [R0.ring[j], R0.ring[k], R1.ring[k], R1.ring[j]];
        tri(key, a.q, b.q, e.q, ref, a.n, b.n, e.n);
        tri(key, a.q, e.q, d.q, ref, a.n, e.n, d.n);
      }
    }
    for (const [R, s] of [[rings[0], -1], [rings[L - 1], 1]]) {
      const ref = sub(R.P, mul(R.T, s * r)), cn = mul(R.T, s);
      for (let j = 1; j < sides - 1; j++) tri(key, R.ring[0].q, R.ring[j].q, R.ring[j + 1].q, ref, cn, cn, cn);
    }
  }
  const pole = (key, x, z, y0, y1, r, sides = 6) => tube(key, [[x, y0, z], [x, y1, z]], r, [1, 0, 0], sides);
  // a closed profile loop [[r, y], ...] revolved about the vertical through (cx, cz); smooth normals per profile edge
  function lathe(key, prof, cx, cz, segs = 12) {
    const pc = centroid(prof.map(([r, y]) => [r, y, 0]));
    const at = (r, y, a) => [cx + r * Math.cos(a), y, cz + r * Math.sin(a)];
    for (let s = 0; s < segs; s++) {
      const a0 = (s / segs) * TAU, a1 = ((s + 1) / segs) * TAU, am = (a0 + a1) / 2;
      const ref = at(pc[0], pc[1], am);
      for (let i = 0; i < prof.length; i++) {
        const [r0, y0] = prof[i], [r1, y1] = prof[(i + 1) % prof.length];
        quad(key, at(r0, y0, a0), at(r1, y1, a0), at(r1, y1, a1), at(r0, y0, a1), ref);
      }
    }
  }
  function sphere(key, cx, cy, cz, r, sy = 1, seg = 8, rows = 5) {
    const C = [cx, cy, cz];
    const P = (i, j) => {
      const th = (i / rows) * Math.PI, ph = (j / seg) * TAU;
      const n = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
      return { q: [cx + n[0] * r, cy + n[1] * r * sy, cz + n[2] * r], n };
    };
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < seg; j++) {
        const a = P(i, j), b = P(i, j + 1), e = P(i + 1, j + 1), d = P(i + 1, j);
        if (i > 0) tri(key, a.q, b.q, e.q, C, a.n, b.n, e.n);
        if (i < rows - 1) tri(key, a.q, e.q, d.q, C, a.n, e.n, d.n);
      }
  }

  // ---------- ground and track ----------
  const G = 0.03; // ground top
  const X0 = -6.5, X1 = 6.5, Z0 = -4.5, Z1 = 4.5;
  box("dirt", X0, X1, 0, G, Z0, Z1);
  const LINE = 0.08, LY = G + 0.006;
  const LANES = [0.4, 1.3, 2.2, 3.1, 4.0];
  for (const z of LANES) box("chalk", X0 + 0.05, X1 - 0.05, G, LY, z - LINE / 2, z + LINE / 2);
  const FX = 3.0; // finish line
  box("chalk", FX - 0.06, FX + 0.06, G, LY, LANES[0], LANES[4]);
  box("chalk", -5.6, -5.52, G, LY, LANES[0], LANES[4]); // start line
  // finish poles and tape
  const TZ0 = 0.18, TZ1 = 4.22, TY = 1.0;
  for (const z of [TZ0, TZ1]) {
    pole("canvas", FX, z, G, 1.25, 0.028);
    sphere("red", FX, 1.27, z, 0.05);
  }
  {
    const n = 12, h = 0.035, t = 0.008;
    for (let i = 0; i < n; i++) {
      const z0 = TZ0 + ((TZ1 - TZ0) * i) / n, z1 = TZ0 + ((TZ1 - TZ0) * (i + 1)) / n;
      const sag = (z) => TY - 0.07 * (1 - ((2 * (z - TZ0)) / (TZ1 - TZ0) - 1) ** 2);
      const y0 = sag(z0), y1 = sag(z1);
      hex("red", [[FX - t, y0 - h, z0], [FX + t, y0 - h, z0], [FX + t, y0 + h, z0], [FX - t, y0 + h, z0],
        [FX - t, y1 - h, z1], [FX + t, y1 - h, z1], [FX + t, y1 + h, z1], [FX - t, y1 + h, z1]]);
    }
  }

  // ---------- tent ----------
  const TX0 = 1.6, TX1 = 5.2, TZ_0 = -3.4, TZ_1 = -0.7, EY = 2.05, RY = 2.65, TZM = (TZ_0 + TZ_1) / 2;
  {
    const o = 0.06, a0 = TX0 - o, a1 = TX1 + o, b0 = TZ_0 - o, b1 = TZ_1 + o;
    const E = [[a0, EY, b0], [a1, EY, b0], [a1, EY, b1], [a0, EY, b1]], R = [[a0, RY, TZM], [a1, RY, TZM]];
    const ref = [(a0 + a1) / 2, (EY * 2 + RY) / 3, TZM];
    quad("canvas", E[0], E[1], E[2], E[3], ref); // underside
    quad("canvas", E[0], E[1], R[1], R[0], ref); // back slope
    quad("canvas", E[3], E[2], R[1], R[0], ref); // front slope
    tri("canvas", E[0], E[3], R[0], ref); // gable ends
    tri("canvas", E[1], E[2], R[1], ref);
    // valance band round the eaves
    const V0 = EY - 0.24, t = 0.018;
    box("green", a0 - t, a1 + t, V0, EY, b1, b1 + t);
    box("green", a0 - t, a1 + t, V0, EY, b0 - t, b0);
    box("green", a0 - t, a0, V0, EY, b0, b1);
    box("green", a1, a1 + t, V0, EY, b0, b1);
    for (const x of [TX0, TX1]) for (const z of [TZ_0, TZ_1]) pole("frame", x, z, G, EY, 0.026);
  }
  // folding table and pipe chairs facing the track
  {
    const x0 = 2.45, x1 = 4.35, z0 = -1.6, z1 = -1.05, ty = 0.72;
    box("concrete", x0, x1, ty - 0.03, ty, z0, z1);
    box("canvas", x0, x1, 0.42, ty - 0.03, z1 - 0.012, z1); // white cloth skirt toward the track
    for (const x of [x0 + 0.08, x1 - 0.08]) for (const z of [z0 + 0.06, z1 - 0.06]) pole("frame", x, z, G, ty - 0.03, 0.016);
    for (const cx of [2.8, 3.4, 4.0]) {
      const cz = -2.05, w = 0.2;
      box("green", cx - w, cx + w, 0.43, 0.46, cz - 0.19, cz + 0.19);
      box("green", cx - w, cx + w, 0.62, 0.84, cz - 0.24, cz - 0.215);
      for (const sx of [-1, 1]) {
        const x = cx + sx * (w - 0.02);
        tube("frame", [[x, G, cz + 0.22], [x, 0.43, cz + 0.16]], 0.013);
        tube("frame", [[x, G, cz - 0.26], [x, 0.43, cz - 0.22], [x, 0.85, cz - 0.23]], 0.013);
      }
    }
  }

  // ---------- spectators' steps ----------
  {
    const sx0 = -6.2, sx1 = 0.8, back = -4.3;
    [[-2.5, 0.33], [-3.1, 0.66], [-3.7, 0.99]].forEach(([front, top]) => box("concrete", sx0, sx1, G, top, back, front));
  }

  // ---------- bunting ----------
  const PX = -5.3, PZ = TZM, PY = 3.4;
  pole("canvas", PX, PZ, G, PY + 0.05, 0.04);
  sphere("red", PX, PY + 0.08, PZ, 0.06);
  lathe("concrete", [[0, G], [0.22, G], [0.2, G + 0.08], [0, G + 0.08]], PX, PZ, 10);
  const SA = [PX, PY, PZ], SB = [TX0 - 0.06, RY, TZM];
  const strAt = (t) => [SA[0] + (SB[0] - SA[0]) * t, SA[1] + (SB[1] - SA[1]) * t - 0.45 * 4 * t * (1 - t), SA[2]];
  tube("frame", Array.from({ length: 17 }, (_, i) => strAt(i / 16)), 0.01, [0, 0, 1], 4);
  const FLAGS = ["flagRed", "flagYellow", "flagGreen", "flagBlue", "flagWhite"];
  const flags = [];
  {
    const n = 19, fw = 0.32, fh = 0.44, th = 0.005;
    for (let i = 0; i < n; i++) {
      const t0 = (i + 0.5) / (n + 1) + 0.0, t1 = t0 + fw / Math.abs(SB[0] - SA[0]);
      const A = strAt(t0), B = strAt(Math.min(1, t1));
      const mid = mul(add(A, B), 0.5), C = [mid[0], Math.min(A[1], B[1]) - fh, mid[2]];
      const key = FLAGS[i % FLAGS.length];
      const a = count(key);
      const z = [0, 0, th];
      const P = [sub(A, z), sub(B, z), sub(C, z), add(A, z), add(B, z), add(C, z)];
      const ref = centroid(P);
      tri(key, P[0], P[1], P[2], ref);
      tri(key, P[3], P[4], P[5], ref);
      quad(key, P[0], P[1], P[4], P[3], ref);
      quad(key, P[1], P[2], P[5], P[4], ref);
      quad(key, P[2], P[0], P[3], P[5], ref);
      flags.push({ key, a, b: count(key), A, axis: nrm(sub(B, A)), top: Math.max(A[1], B[1]), len: fh, ph: (i * 0.137) % 1, ph2: (i * 0.311) % 1 });
    }
  }

  // ---------- tug-of-war rope ----------
  {
    const cx = -4.0, cz = -1.2, rr = 0.035, y = G + rr;
    const path = [];
    const turns = 5, r0 = 0.16, r1 = 0.52, steps = turns * 14;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps, a = u * turns * TAU, r = r0 + (r1 - r0) * u;
      path.push([cx + r * Math.cos(a), y, cz + r * Math.sin(a)]);
    }
    // the tail leaves the outer turn tangentially (toward -Z at angle 0) and curls out toward the track
    const last = path[path.length - 1];
    for (const [dx, dz] of [[0.02, 0.25], [0.12, 0.55], [0.35, 0.8], [0.7, 0.95], [1.05, 1.0]]) path.push([last[0] + dx, y, last[2] + dz]);
    tube("rope", path, rr, [0, 1, 0], 7);
  }

  // ---------- tamaire pole, basket and beanbags ----------
  {
    const cx = -1.0, cz = -0.9, top = 3.9;
    lathe("concrete", [[0, G], [0.3, G], [0.26, G + 0.1], [0.06, G + 0.14], [0, G + 0.14]], cx, cz, 12);
    pole("canvas", cx, cz, G, top + 0.02, 0.04, 8);
    // open basket: a closed wall profile (outer then inner), wider at the rim
    const b0 = top, b1 = top + 0.34, w = 0.025;
    lathe("green", [[0, b0], [0.17, b0], [0.32, b1], [0.32 - w, b1], [0.17 - w, b0 + w], [0, b0 + w]], cx, cz, 14);
    // beanbags: scattered round the foot by a fixed hash (thrown and fallen short), alternately red and white
    const h = (k) => { const s = Math.sin(k * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
    for (let i = 0; i < 26; i++) {
      const a = TAU * h(i + 0.5), r = 0.38 + 1.05 * h(i + 31.7) ** 1.6;
      sphere(i % 2 ? "bags" : "red", cx + r * Math.cos(a), G + 0.045, cz + r * Math.sin(a), 0.06, 0.72, 7, 4);
    }
  }

  // ---------- meshes ----------
  const MAT = {
    dirt: [c.dirt, c.dirtShade, { threshold: 0.2, px: 3 }],
    chalk: [c.chalk, c.chalk, { outline: false }],
    canvas: [c.canvas, c.canvasShade, { threshold: 0.35, px: 3 }],
    concrete: [c.concrete, c.concreteShade, { threshold: 0.35, px: 3 }],
    frame: [c.frame, c.frame, { px: 1.5 }],
    green: [c.green, c.greenShade, { threshold: 0.2, px: 2.5 }],
    rope: [c.rope, c.ropeShade, { threshold: 0.3, px: 1.5 }],
    red: [c.red, c.red, { px: 1.5 }],
    bags: [c.canvas, c.canvasShade, { threshold: 0.2, px: 1.5 }],
  };
  for (const k of FLAGS) MAT[k] = [c[k], c[k], { threshold: -1, px: 2 }];
  const meshes = {};
  for (const [key, s] of Object.entries(soups)) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    const [base, shade, o] = MAT[key];
    const mesh = kit.toon(g, base, shade, o);
    mesh.name = key;
    body.add(mesh);
    const hn = g.attributes.hullNormal;
    meshes[key] = { g, P: Float32Array.from(s.p), N: Float32Array.from(s.n), HN: hn ? Float32Array.from(hn.array) : null };
  }

  // ---------- size ----------
  root.updateMatrixWorld(true);
  const natural = new THREE.Box3().setFromObject(body).max.y;
  body.scale.setScalar(height / natural);

  // ---------- breeze ----------
  // Sign convention: a flag's hinge axis runs along its string segment toward +X; rotation by +a about it swings the
  // hanging tip toward +Z (downwind, the track). Terms are sin(2 pi (n f + ph)) with whole n: f = 1 is f = 0.
  const CLIPS = { breeze: 3 };
  const q = new THREE.Quaternion(), ax = new THREE.Vector3(), o = new THREE.Vector3(), nv = new THREE.Vector3(), pv = new THREE.Vector3();
  function apply(f, on) {
    const sw = (n, ph) => Math.sin(TAU * (n * f + ph));
    for (const fl of flags) {
      const m = meshes[fl.key], P = m.g.attributes.position.array, N = m.g.attributes.normal.array;
      const HN = m.HN && m.g.attributes.hullNormal.array;
      ax.set(...fl.axis);
      pv.set(...fl.A);
      for (let v = fl.a; v < fl.b; v++) {
        const i = v * 3;
        const d = Math.min(1, Math.max(0, (fl.top - m.P[i + 1]) / fl.len));
        const ang = on ? (0.3 + 0.3 * d) * (0.7 + 0.4 * sw(2, fl.ph - 0.35 * d) + 0.15 * sw(3, fl.ph2 - 0.5 * d)) : 0;
        q.setFromAxisAngle(ax, -ang); // axis along +X: -ang lifts the tip toward +Z
        o.set(m.P[i], m.P[i + 1], m.P[i + 2]).sub(pv).applyQuaternion(q).add(pv);
        P[i] = o.x, P[i + 1] = o.y, P[i + 2] = o.z;
        nv.set(m.N[i], m.N[i + 1], m.N[i + 2]).applyQuaternion(q);
        N[i] = nv.x, N[i + 1] = nv.y, N[i + 2] = nv.z;
        if (HN) nv.set(m.HN[i], m.HN[i + 1], m.HN[i + 2]).applyQuaternion(q), (HN[i] = nv.x), (HN[i + 1] = nv.y), (HN[i + 2] = nv.z);
      }
    }
    for (const k of FLAGS) {
      const m = meshes[k];
      if (!m) continue;
      m.g.attributes.position.needsUpdate = true;
      m.g.attributes.normal.needsUpdate = true;
      if (m.HN) m.g.attributes.hullNormal.needsUpdate = true;
      m.g.computeBoundingSphere();
      m.g.computeBoundingBox();
    }
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`sports-ground: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      const T = CLIPS[m[1]];
      return apply((((+m[2] % T) + T) % T) / T, true);
    }
    if (name !== "rest") throw new Error(`sports-ground: unknown pose "${name}" (rest, or breeze@<seconds>)`);
    apply(0, false);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
