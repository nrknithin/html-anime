// sakamichi.js - a steep seaside-town stair alley (an Onomichi-style sakamichi) in bright summer: a narrow concrete
// stair lane with two landings and a galvanised centre handrail, climbing between old tiled-roof houses, retaining
// walls, block walls, board fences and a gate, potted plants on the steps, a cat asleep on a step and another on a
// wall, a laundry pole, a utility pole with wires and a street lamp, a red pillar postbox at the foot and a band of sea
// beyond the harbour road. Static.
// Contract: harness/lab/README.md. Meters, +Y up, stands on y = 0, centred on x = 0, z = 0 (the bbox of the set).
// The lane climbs along -X: the foot, the road and the sea are at +X, so the low hero camera (front-left, az 52) looks
// up the stairs at a slant, and `--az 80` looks straight up the lane. +Z is the cut-away side (a stepped kerb, the
// laundry yard, a fence set back): it stays under the hero's sight line up the lane; the tall houses stand on -Z.
//
// Construction (triangle soups merged per material, flat-shaded: 15 meshes for the whole set):
//   PATH     a run coordinate s = 0 at the first riser, uphill; world x = -s. 33 risers of 0.18 m in three flights of
//            11, treads 0.25 m, two 1.0 m landings and a 3.0 m top landing that runs on between the top houses. g(s) is
//            the tread height under s. Every step is its own closed block from y = 0, so the hull inks every nosing;
//            the riser faces +X (dot 0.62) and the tread +Y (0.72), so a threshold of 0.67 puts every riser in shade
//            and the flight reads as pale bands with a cool shadow under each nosing.
//   LOTS     terraces either side, one closed block each with dressed-stone courses (joint strips) on the faces that
//            show. -Z lots sit at the lane height of their upper end (the lane cuts into the hill: a retaining wall
//            grows toward each lot's lower end); +Z lots sit well below the lane and stop 3-3.6 m out, a cut-away.
//   HOUSES   boxes with a gable roof solid (a convex pentagon lofted along the ridge), gable-end triangles, tile-row
//            lines down both slopes, an eave band and a ridge cap; windows are wood frames with dark panes and bars;
//            the lane house has a board skirt (koshiita) with battens.
//   EDGES    -Z: a block wall on lot A, the lane house wall on lot B, a board fence with a roofed two-leaf gate on the
//            top landing (lot C). +Z: a kerb block per step, 0.3 m over its tread (a sawtooth that shows the stair
//            profile from the camera side); a board fence on a block base along lot G's outer edge.
//   RAIL     a 60 mm pipe at z = 0 along the nosing line + 0.85 m, level across the landings, on posts at every
//            kink and mid-flight, closed rods (three.js cylinders, right winding by construction).
//   PROPS    pots (hexagonal tubs with a leaf clump) along both edges of the steps; a curled white-and-ginger cat
//            asleep on a tread and a dark cat sitting on lot A's block wall against the yellow house; a laundry pole
//            on two T-stands with three towels (lot F); a concrete utility pole at the road with cross arms, a
//            transformer, a lamp bracket over the foot and sagging wires up the lane, along the road and to the houses;
//            a round red pillar postbox; a summer tree and shrubs; the sea a flat slab past the quay with glint strips.
//            Marker joints catStep, catWall, postbox (no geometry) for --focus close-ups.
// Proportions (real size; base unit the riser r = 0.18 m): rise 5.94 m (33 r) over 10.0 m from the first riser to
// the top landing; lane 1.6 m wide between walls; the foot 0.4 m above the sea on a 2.4 m road; houses 2-storey
// (5.0-5.2 m to the eave) and 1-storey (3 m); utility pole 9 m; the lane house ridge is the top of the set (10.6 m).
// Budget: 7.2k triangles, 15 meshes.
// Options: build(THREE, kit, colors, { height }): height scales the whole set uniformly to that top (default 10.6 m).
// Colours (meadow: bright summer; the script has no grey and one blue, sky):
//   steps        moon #f7f3e1 / sky #d7ecef at 0.67: sun-bleached concrete, risers in cool shade
//   stone        sclera #f6f3ee / skin #f0c2ae at 0.2 (retaining walls, kerbs, block walls, road, quay); joints skin flat
//   plaster      practical #f2c94c / skin at 0.1 (warm earthen house walls; also the sleeping cat's ginger patches)
//   wood         hair #2c5131 / iris #3f8a47 at 0.4 (boards, frames, gate, trunk, cross arms, the dark cat)
//   roof         sky / iris at 0.3 (pale silver-blue kawara in the glare); tile lines, panes and wires hair, flat
//   metal        sclera / sky at 0.3 (handrail, utility pole, laundry pole, lamp, the white cat, a towel)
//   leaves       iris / hair; garden tops, shrubs and tree line #a9d16e / iris; pots skin / accent #d9483b
//   red          accent / hair (postbox, a towel); lamp globe practical, glowing; sea sky flat, glints sclera.
//   Every shade is lighter than ink #1c261b; hair is used only for lines, panes and dark wood.

export const meta = {
  name: "sakamichi",
  height: 10.6,
  script: "meadow",
  colors: {
    step: "#f7f3e1", stepShade: "#d7ecef",
    wall: "#f6f3ee", wallShade: "#f0c2ae",
    plaster: "#f2c94c", plasterShade: "#f0c2ae",
    wood: "#2c5131", woodShade: "#3f8a47",
    roof: "#d7ecef", roofShade: "#3f8a47",
    line: "#2c5131",
    metal: "#f6f3ee", metalShade: "#d7ecef",
    leaf: "#3f8a47", leafShade: "#2c5131",
    bush: "#a9d16e", bushShade: "#3f8a47",
    pot: "#f0c2ae", potShade: "#d9483b",
    red: "#d9483b", redShade: "#2c5131",
    glow: "#f2c94c",
    sea: "#d7ecef", glint: "#f6f3ee",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height } = opts;
  const root = new THREE.Group();
  root.name = "sakamichi";
  const set = new THREE.Group(); // uniform scale and the centring offset live here
  set.name = "set";
  root.add(set);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const avg = (ps) => [0, 1, 2].map((i) => ps.reduce((s, q) => s + q[i], 0) / ps.length);
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  function tri(key, a, b, e, ref) { // wound away from ref, a point inside the solid; slivers dropped
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-9) return;
    S(key).push(...a, ...(dot(n, sub(avg([a, b, e]), ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function hex(key, p) { // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
    const ref = avg(p);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  const box = (key, x0, x1, y0, y1, z0, z1) =>
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  function loft(key, secs) { // through convex sections (closed polygons, same point count), capped
    const cs = secs.map(avg);
    for (let i = 0; i < secs.length - 1; i++) {
      const A = secs[i], B = secs[i + 1], ref = avg([cs[i], cs[i + 1]]), m = A.length;
      for (let k = 0; k < m; k++) quad(key, A[k], A[(k + 1) % m], B[(k + 1) % m], B[k], ref);
    }
    for (const [sec, ref] of [[secs[0], avg([cs[0], cs[1]])], [secs[secs.length - 1], avg([cs[cs.length - 1], cs[cs.length - 2]])]])
      for (let k = 1; k < sec.length - 1; k++) tri(key, sec[0], sec[k], sec[k + 1], ref);
  }
  // a flat quad with its front toward `toward` (lines, panes, glints: only the front shows)
  const flat = (key, a, b, e, d, toward) => quad(key, a, b, e, d, sub(avg([a, b, e, d]), sub(toward, avg([a, b, e, d]))));
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3();
  function prim(key, geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    M4.compose(V.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
    const g = (geo.index ? geo.toNonIndexed() : geo).applyMatrix4(M4);
    S(key).push(...g.attributes.position.array);
    geo.dispose();
  }
  // a closed rod from a to b
  const UP = new THREE.Vector3(0, 1, 0);
  function rod(key, a, b, r, n = 6) {
    const d = new THREE.Vector3(...sub(b, a)), L = d.length();
    const g = new THREE.CylinderGeometry(r, r, L, n).toNonIndexed();
    M4.compose(new THREE.Vector3(...avg([a, b])), Q.setFromUnitVectors(UP, d.normalize()), new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(M4);
    S(key).push(...g.attributes.position.array);
    g.dispose();
  }
  // marker joints (no geometry) at the props, for --focus close-ups
  const mark = (name, x, y, z) => { const o = new THREE.Object3D(); o.name = name; o.position.set(x, y, z); set.add(o); joints[name] = o; };
  const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
  const jit = (i, k, a) => (hash(i, k) * 2 - 1) * a;

  // ---------- the path ----------
  const Y0 = 0.4, R = 0.18, T = 0.25, LAND = 1.0, TOPL = 3.0, HW = 0.8, NR = 33;
  const landAt = new Set([10, 21]);
  const steps = [];
  let s = 0;
  for (let k = 0; k < NR; k++) {
    const depth = k === NR - 1 ? TOPL : landAt.has(k) ? LAND : T;
    steps.push({ k, s0: s, depth, top: Y0 + (k + 1) * R });
    s += depth;
  }
  const SEND = s; // 13.0: the end of the top landing
  const g = (q) => { // tread height under run q
    if (q < 0) return Y0;
    for (const st of steps) if (q < st.s0 + st.depth) return st.top;
    return steps[NR - 1].top;
  };
  const YTOP = steps[NR - 1].top; // 6.34
  const X = (q) => -q;
  const ZB = -5.4, ZF = 5.0; // back and front of the set

  for (const st of steps) box("step", X(st.s0 + st.depth), X(st.s0), 0, st.top, -HW, HW);

  // ---------- road, quay, sea ----------
  const XR = 2.4, XS = 5.4;
  box("wall", 0, XR, 0, Y0, ZB, ZF);
  box("sea", XR, XS, 0, 0.08, ZB, ZF);
  for (let i = 0; i < 6; i++) { // glint strips on the water
    const x = XR + 0.35 + hash(i, 1) * 1.8, z = ZB + 0.6 + hash(i, 2) * (ZF - ZB - 1.2), w = 0.5 + hash(i, 3) * 0.9;
    flat("glint", [x, 0.085, z - w / 2], [x + 0.06, 0.085, z - w / 2], [x + 0.06, 0.085, z + w / 2], [x, 0.085, z + w / 2], [x, 1, z]);
  }

  // ---------- terraces ----------
  // -Z lots at the lane height of their upper end, +Z lots at their lower end: [s0, s1, level]
  const lotsB = [[-0.0, 3.5, g(3.4)], [3.5, 7.0, g(6.9)], [7.0, SEND, YTOP]];
  // the +Z lots sit well below the lane (the hill falls away on the camera side) and stop short of the set's front
  const lotsF = [[0, 2.5, Y0, 3.0], [2.5, 6.0, 1.5, 3.6], [6.0, 9.5, 2.8, 3.6], [9.5, SEND, YTOP, 4.8]];
  // dressed-stone courses on a retaining face: axis "z" (face toward +Z at z = at, u = x) or "x" (toward +X, u = z)
  function stones(axis, at, u0, u1, y0, y1, seed) {
    const CH = 0.42, J = 0.022, P = (u, y) => axis === "z" ? [u, y, at + 0.004] : [at + 0.004, y, u];
    const toward = axis === "z" ? [0, 0, 99] : [99, 0, 0];
    const bar = (ua, ub, ya, yb) => flat("joint", P(ua, ya), P(ub, ya), P(ub, yb), P(ua, yb), toward);
    let row = 0;
    for (let y = y1 - CH; y > y0 + 0.08; y -= CH, row++) {
      bar(u0, u1, y - J / 2, y + J / 2);
      for (let u = u0 + (row % 2 ? 0.35 : 0.8) + jit(seed, row, 0.15); u < u1 - 0.2; u += 0.9 + jit(seed + row, Math.round(u * 7), 0.2))
        bar(u - J / 2, u + J / 2, y, Math.min(y1, y + CH));
    }
  }
  for (const [a, b, y] of lotsB) {
    box("wall", X(b), X(a), 0, y, ZB, -HW);
    stones("z", -HW, X(b), X(a), Math.max(Y0, g(a) - 0.4), y, Math.round(a * 3));
  }
  stones("x", 0, ZB, -HW, Y0, lotsB[0][2], 7);
  const PZ = HW + 0.16; // the +Z parapet's outer face
  let prevY = 0;
  for (const [a, b, y, z1] of lotsF) {
    box("wall", X(b), X(a), 0, y, PZ - 0.01, z1);
    box("bush", X(b) + 0.02, X(a) - 0.02, y - 0.02, y + 0.06, PZ - 0.01, z1 - 0.03); // the garden top
    stones("z", z1, X(b), X(a), a === 0 ? Y0 : 0, y, Math.round(a * 5) + 11);
    if (y > prevY + 0.3 && a > 0) stones("x", X(a), PZ, z1, prevY, y, Math.round(a * 5) + 23);
    prevY = y;
  }

  // ---------- +Z kerb: one block per step, 0.3 m above its tread (a sawtooth: the stair profile from the camera) ----------
  const KH = 0.3;
  for (const st of steps) {
    const n = Math.max(1, Math.ceil(st.depth / 1.0));
    for (let j = 0; j < n; j++) {
      const a = st.s0 + (st.depth * j) / n, b = st.s0 + (st.depth * (j + 1)) / n;
      box("wall", X(b), X(a), 0, st.top + KH, HW, PZ);
    }
  }
  // ---------- board fence along lot G's outer edge, on a low block base (below the sight line up the lane) ----------
  {
    const [a, b] = [6.0, 9.5], y = lotsF[2][2], z0 = lotsF[2][3] - 0.16, z1 = lotsF[2][3];
    box("wall", X(b), X(a), y, y + 0.35, z0, z1);
    for (let yy = y + 0.17; yy < y + 0.3; yy += 0.2)
      flat("joint", [X(a), yy, z1 + 0.004], [X(b), yy, z1 + 0.004], [X(b), yy + 0.018, z1 + 0.004], [X(a), yy + 0.018, z1 + 0.004], [0, yy, 99]);
    for (let q2 = a + 0.03; q2 < b - 0.05; q2 += 0.13)
      box("wood", X(q2 + 0.1), X(q2), y + 0.3, y + 1.55 + jit(Math.round(q2 * 10), 3, 0.03), z0 + 0.03, z1 - 0.03);
    box("wood", X(b), X(a), y + 1.3, y + 1.36, z1 - 0.03, z1 + 0.01); // rail
  }

  // ---------- houses ----------
  // gable roof over [x0,x1] x [z0,z1], ridge along x, eave at ye, rise to the ridge, overhang o
  function gable(x0, x1, z0, z1, ye, rise, o = 0.45, wallKey = "plaster") {
    const zm = (z0 + z1) / 2, hw = (z1 - z0) / 2, th = 0.14, p = rise / hw;
    const ze0 = z0 - o, ze1 = z1 + o, yl = ye - o * p;
    const sec = (x) => [[x, yl, ze0], [x, yl, ze1], [x, yl + th, ze1], [x, ye + rise + th, zm], [x, yl + th, ze0]];
    loft("roof", [sec(x0 - 0.35), sec(x1 + 0.35)]);
    for (const x of [x0, x1]) { // gable-end triangles
      const sx = x === x0 ? -1 : 1;
      loft(wallKey, [[[x - sx * 0.01, ye, z0], [x - sx * 0.01, ye, z1], [x - sx * 0.01, ye + rise, zm]], [[x - sx * 0.2, ye, z0], [x - sx * 0.2, ye, z1], [x - sx * 0.2, ye + rise, zm]]]);
    }
    box("roof", x0 - 0.38, x1 + 0.38, ye + rise + 0.05, ye + rise + 0.24, zm - 0.12, zm + 0.12); // ridge cap
    // tile rows down both slopes
    const n = Math.max(3, Math.round((x1 - x0 + 0.7) / 0.28));
    for (let i = 0; i <= n; i++) {
      const x = x0 - 0.3 + (i * (x1 - x0 + 0.6)) / n;
      for (const [za, sgn] of [[ze0, -1], [ze1, 1]]) {
        const lift = 0.012, a = [x, yl + th + lift, za], b = [x, ye + rise + th + lift, zm];
        flat("line", [a[0] - 0.02, a[1], a[2]], [a[0] + 0.02, a[1], a[2]], [b[0] + 0.02, b[1], b[2]], [b[0] - 0.02, b[1], b[2]], [x, ye + rise + 3, zm + sgn * 3]);
      }
    }
    box("line", x0 - 0.35, x1 + 0.35, yl - 0.02, yl + th + 0.01, ze1 - 0.03, ze1 + 0.02); // eave-tile band (+Z)
  }
  // a window on a wall face: axis "z" (face toward +Z at z = at) or "x" (toward +X at x = at)
  function win(axis, at, u, y0, w, h, bars = 2) {
    const P = (uu, y, o) => axis === "z" ? [uu, y, at + o] : [at + o, y, uu];
    const B = (u0, u1, y0_, y1_, o0, o1) => {
      const a = P(u0, y0_, o0), b = P(u1, y1_, o1);
      box("wood", Math.min(a[0], b[0]), Math.max(a[0], b[0]), y0_, y1_, Math.min(a[2], b[2]), Math.max(a[2], b[2]));
    };
    B(u - w / 2 - 0.06, u + w / 2 + 0.06, y0 - 0.06, y0 + h + 0.06, 0, 0.05);
    const toward = P(u, y0 + h / 2, 5);
    const pq = (u0, u1, y0_, y1_, o) => flat("line", P(u0, y0_, o), P(u1, y0_, o), P(u1, y1_, o), P(u0, y1_, o), toward);
    pq(u - w / 2, u + w / 2, y0, y0 + h, 0.055);
    for (let i = 1; i < bars; i++) { const uu = u - w / 2 + (i * w) / bars; B(uu - 0.02, uu + 0.02, y0, y0 + h, 0.05, 0.07); }
    B(u - w / 2, u + w / 2, y0 + h * 0.5 - 0.02, y0 + h * 0.5 + 0.02, 0.05, 0.07);
  }

  // lot A (-Z, foot): block wall on the retaining wall, shrubs, a two-storey house set back
  {
    const y = lotsB[0][2], x0 = X(3.3), x1 = X(0.25);
    for (const [a, b] of [[0, 2.5], [2.5, 3.5]]) {
      box("wall", X(b), X(a), y, y + 1.1, -HW - 0.16, -HW);
      for (let yy = y + 0.2; yy < y + 1.05; yy += 0.2)
        flat("joint", [X(a), yy, -HW + 0.004], [X(b), yy, -HW + 0.004], [X(b), yy + 0.018, -HW + 0.004], [X(a), yy + 0.018, -HW + 0.004], [0, yy, 9]);
    }
    box("plaster", x0, x1, y, y + 5.2, -4.9, -1.9);
    box("wood", x0 - 0.02, x1 + 0.02, y + 2.6, y + 2.75, -4.92, -1.88); // floor band
    win("z", -1.9, -1.2, y + 0.9, 1.4, 1.1, 3);
    win("z", -1.9, -2.4, y + 3.4, 1.0, 1.0);
    win("x", x1, -3.4, y + 3.3, 1.4, 1.1, 3);
    win("x", x1, -2.6, y + 0.9, 0.9, 1.0);
    gable(x0, x1, -4.9, -1.9, y + 5.2, 1.0);
    for (let i = 0; i < 3; i++) // shrubs in the strip behind the block wall
      prim("bush", new THREE.IcosahedronGeometry(0.55 + jit(i, 5, 0.12), 1), X(0.4 + i * 0.7), y + 0.9 + jit(i, 6, 0.15), -1.35, jit(i, 7, 1), jit(i, 8, 1), 0, 1, 0.8, 1);
  }
  // lot B (-Z): the lane house, its wall on the retaining wall, board skirt, eave over the lane
  {
    const y = lotsB[1][2], x0 = X(6.9), x1 = X(3.6), zf = -HW - 0.06;
    box("plaster", x0, x1, y, y + 5.0, -4.6, zf);
    box("wood", x0 - 0.02, x1 + 0.02, y, y + 1.1, -4.62, zf + 0.03); // koshiita
    for (let q = 3.7; q < 6.85; q += 0.3) box("wood", X(q + 0.03), X(q), y, y + 1.1, zf + 0.03, zf + 0.05); // batten strips
    box("wood", x0 - 0.02, x1 + 0.02, y + 2.5, y + 2.65, -4.62, zf + 0.02);
    win("z", zf, -4.6, y + 1.35, 1.2, 0.9, 3);
    win("z", zf, -6.0, y + 3.2, 1.0, 1.0);
    win("z", zf, -4.3, y + 3.2, 0.8, 1.0);
    win("x", x1, -3.0, y + 3.2, 1.2, 1.0, 3);
    gable(x0, x1, -4.6, zf, y + 5.0, 1.0, 0.55);
  }
  // lot C (-Z, top): board fence and a roofed gate on the top landing, a one-storey house behind
  {
    const y = lotsB[2][2], gate = [9.75, 10.75];
    for (let q = 7.05; q < SEND - 0.1; q += 0.13) {
      if (q + 0.1 > gate[0] - 0.08 && q < gate[1] + 0.08) continue;
      box("wood", X(q + 0.1), X(q), y - 0.05, y + 1.5 + jit(Math.round(q * 10), 4, 0.03), -HW - 0.12, -HW - 0.03);
    }
    box("wood", X(SEND - 0.1), X(7.05), y + 1.25, y + 1.31, -HW - 0.03, -HW + 0.01);
    for (const q of gate) box("wood", X(q + 0.08), X(q - 0.08), y, y + 2.15, -HW - 0.2, -HW - 0.04); // posts
    box("wood", X(gate[1] + 0.25), X(gate[0] - 0.25), y + 1.95, y + 2.07, -HW - 0.2, -HW - 0.03); // lintel
    for (let q = gate[0] + 0.1; q < gate[1] - 0.1; q += 0.105) // the two closed leaves (vertical boards)
      box("wood", X(q + 0.08), X(q), y + 0.08, y + 1.85, -HW - 0.14, -HW - 0.1);
    box("wood", X(gate[1] - 0.08), X(gate[0] + 0.08), y + 0.9, y + 0.98, -HW - 0.1, -HW - 0.07);
    // the little gate roof
    const gz = -HW - 0.12, gw = 0.5;
    loft("roof", [[[X(gate[1] + 0.45), y + 2.12, gz - gw], [X(gate[1] + 0.45), y + 2.12, gz + gw], [X(gate[1] + 0.45), y + 2.22, gz + gw], [X(gate[1] + 0.45), y + 2.5, gz], [X(gate[1] + 0.45), y + 2.22, gz - gw]],
      [[X(gate[0] - 0.45), y + 2.12, gz - gw], [X(gate[0] - 0.45), y + 2.12, gz + gw], [X(gate[0] - 0.45), y + 2.22, gz + gw], [X(gate[0] - 0.45), y + 2.5, gz], [X(gate[0] - 0.45), y + 2.22, gz - gw]]]);
    const x0 = X(SEND - 0.2), x1 = X(7.3);
    box("plaster", x0, x1, y, y + 3.0, -5.0, -2.0);
    win("x", x1, -3.5, y + 0.9, 1.6, 1.1, 4);
    win("z", -2.0, X(8.4), y + 0.9, 1.2, 1.1, 3);
    gable(x0, x1, -5.0, -2.0, y + 3.0, 0.9);
  }
  // lot H (+Z, top): a one-storey house past the top of the stairs (behind the camera's line up the lane)
  {
    const y = YTOP, x0 = X(SEND - 0.2), x1 = X(9.9);
    box("plaster", x0, x1, y, y + 3.0, 1.7, 4.6);
    win("x", x1, 3.2, y + 0.9, 1.4, 1.1, 3);
    gable(x0, x1, 1.7, 4.6, y + 3.0, 0.9);
  }

  // ---------- handrail ----------
  {
    const H = 0.85, RP = 0.03;
    const nose = (k) => [steps[k].s0, steps[k].top]; // the nosing of step k: front edge of its tread
    const pts = [[0.12, Y0 + R + 0.06], nose(10), [steps[10].s0 + LAND, steps[10].top], nose(21), [steps[21].s0 + LAND, steps[21].top], nose(32), [steps[32].s0 + 1.0, YTOP]];
    // flights: from the first post to the landing nosing; the rail runs level across the landings
    const rail = pts.map(([q, y]) => [X(q), y + H, 0]);
    rail[0] = [X(0.12), Y0 + R + H - 0.12, 0];
    for (let i = 0; i < rail.length - 1; i++) rod("metal", rail[i], rail[i + 1], RP, 6);
    const post = (q) => { const y = g(q); const yr = railY(q); rod("metal", [X(q), y - 0.02, 0], [X(q), yr, 0], 0.025, 6); };
    function railY(q) {
      for (let i = 0; i < rail.length - 1; i++) {
        const qa = -rail[i][0], qb = -rail[i + 1][0];
        if (q >= qa - 1e-6 && q <= qb + 1e-6) return rail[i][1] + ((rail[i + 1][1] - rail[i][1]) * (q - qa)) / Math.max(1e-6, qb - qa);
      }
      return rail[rail.length - 1][1];
    }
    for (const q of [0.12, 1.3, 2.4, 3.55, 4.75, 5.9, 7.05, 8.25, 9.4, 10.5]) post(q);
  }

  // ---------- pots on the steps ----------
  {
    const spots = [[1, -1], [3, -1], [3, 1], [7, -1], [9, 1], [12, -1], [14, 1], [16, -1], [19, -1], [23, 1], [25, -1], [28, -1], [30, 1], [10, -1, 0.5], [21, 1, 0.4]];
    spots.forEach(([k, side, off = 0], i) => {
      const st = steps[k], q = st.s0 + (off || T * 0.5), y = st.top, z = side * (HW - 0.17);
      const r = 0.13 + jit(i, 1, 0.025), h = 0.2 + jit(i, 2, 0.04);
      prim("pot", new THREE.CylinderGeometry(r, r * 0.8, h, 6), X(q), y + h / 2, z, 0, jit(i, 3, 1));
      prim("leaf", new THREE.IcosahedronGeometry(r * 1.45, 0), X(q), y + h + r * 0.9, z, jit(i, 4, 1), jit(i, 5, 1), 0, 1, 1.15, 1);
    });
  }

  // ---------- cats ----------
  {
    // sleeping cat on step 6, +Z half of the tread: a curled loaf, head tucked, tail round the front
    const st = steps[6], q = st.s0 + 0.13, y = st.top, z = 0.42;
    mark("catStep", X(q), y + 0.1, z);
    prim("metal", new THREE.SphereGeometry(0.2, 8, 5), X(q), y + 0.1, z, 0, 0.3, 0, 1.1, 0.55, 0.62);
    prim("plaster", new THREE.SphereGeometry(0.15, 7, 4), X(q) - 0.06, y + 0.15, z - 0.02, 0, 0.3, 0, 1.0, 0.45, 0.7); // ginger saddle
    prim("metal", new THREE.SphereGeometry(0.085, 7, 5), X(q) + 0.17, y + 0.09, z + 0.07, 0, 0, 0, 1, 0.85, 1);
    prim("plaster", new THREE.ConeGeometry(0.035, 0.07, 4), X(q) + 0.2, y + 0.17, z + 0.03, 0, 0, -0.4);
    prim("plaster", new THREE.ConeGeometry(0.035, 0.07, 4), X(q) + 0.17, y + 0.17, z + 0.12, 0.3, 0, -0.3);
    rod("plaster", [X(q) - 0.2, y + 0.04, z + 0.06], [X(q) + 0.12, y + 0.03, z + 0.15], 0.032, 5);
    // dark cat sitting on lot A's block wall, against the yellow house, facing down the lane (+X)
    const q2 = 2.75, yt = lotsB[0][2] + 1.1, z2 = -HW - 0.08;
    mark("catWall", X(q2), yt + 0.25, z2);
    prim("wood", new THREE.SphereGeometry(0.13, 8, 5), X(q2), yt + 0.16, z2, 0, 0, 0.25, 1, 1.35, 0.85);
    prim("wood", new THREE.SphereGeometry(0.085, 7, 5), X(q2) + 0.06, yt + 0.42, z2);
    prim("wood", new THREE.ConeGeometry(0.035, 0.08, 4), X(q2) + 0.05, yt + 0.52, z2 - 0.045);
    prim("wood", new THREE.ConeGeometry(0.035, 0.08, 4), X(q2) + 0.05, yt + 0.52, z2 + 0.045);
    rod("wood", [X(q2) - 0.1, yt + 0.03, z2], [X(q2) - 0.12, yt - 0.3, z2 + 0.06], 0.025, 5); // tail down the wall
  }

  // ---------- laundry pole in lot F ----------
  {
    const y = lotsF[1][2], z = 2.4, xa = X(3.0), xb = X(5.6), hp = 1.8;
    for (const x of [xa, xb]) {
      rod("metal", [x, y, z], [x, y + hp + 0.05, z], 0.03);
      rod("metal", [x, y + hp, z - 0.35], [x, y + hp, z + 0.35], 0.025);
    }
    rod("metal", [xa + 0.2, y + hp + 0.05, z], [xb - 0.2, y + hp + 0.05, z], 0.022);
    const cloth = [["metal", 0.55, 0.7], ["red", 0.45, 0.55], ["sea", 0.6, 0.8]];
    cloth.forEach(([key, w, h], i) => {
      const xc = xa - 0.45 - i * 0.78;
      box(key, xc - w / 2, xc + w / 2, y + hp + 0.03 - h, y + hp + 0.03, z - 0.015, z + 0.015);
    });
  }

  // ---------- tree in lot G (back corner) ----------
  {
    const y = lotsF[2][2], x = X(7.8), z = 2.7;
    rod("wood", [x, y, z], [x - 0.2, y + 2.6, z - 0.1], 0.12, 6);
    [[0, 3.0, 0, 1.15], [0.7, 2.6, -0.4, 0.85], [-0.8, 2.7, 0.3, 0.9], [-0.1, 3.6, -0.3, 0.8]].forEach(([dx, dy, dz, r], j) =>
      prim("bush", new THREE.IcosahedronGeometry(r, 1), x + dx, y + dy, z + dz, jit(j, 9, 1), jit(j, 10, 1)));
    for (let i = 0; i < 3; i++) // shrubs along lot F's parapet foot and lot E
      prim("bush", new THREE.IcosahedronGeometry(0.45, 1), X(0.6 + i * 0.75), Y0 + 0.3, 1.5 + jit(i, 11, 0.2), jit(i, 12, 1), 0, 0, 1, 0.8, 1);
  }

  // ---------- utility pole, lamp, wires ----------
  {
    const px = 0.55, pz = -1.45, ph = 9.0, top = Y0 + ph;
    prim("metal", new THREE.CylinderGeometry(0.12, 0.17, ph, 10), px, Y0 + ph / 2, pz);
    box("wood", px - 0.06, px + 0.06, top - 0.55, top - 0.45, pz - 1.0, pz + 1.0); // cross arm along the road
    for (const dz of [-0.85, 0.85]) prim("metal", new THREE.CylinderGeometry(0.04, 0.05, 0.12, 6), px, top - 0.4, pz + dz);
    box("wood", px - 0.25, px + 0.25, top - 1.35, top - 1.25, pz - 0.06, pz + 0.06); // short arm toward the lane
    prim("metal", new THREE.CylinderGeometry(0.11, 0.11, 0.35, 8), px, top - 2.6, pz + 0.17); // transformer can
    // lamp bracket out over the foot of the stairs
    const ly = Y0 + 4.2;
    rod("metal", [px, ly, pz], [px - 0.3, ly + 0.25, pz + 1.0], 0.025);
    prim("metal", new THREE.CylinderGeometry(0.05, 0.16, 0.1, 8), px - 0.3, ly + 0.2, pz + 1.0);
    prim("glow", new THREE.SphereGeometry(0.1, 8, 5), px - 0.3, ly + 0.08, pz + 1.0);
    // sagging wires
    const wire = (a, b, sag) => {
      const n = 6;
      let prev = a;
      for (let i = 1; i <= n; i++) {
        const t = i / n, p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t];
        rod("line", prev, p, 0.016, 4);
        prev = p;
      }
    };
    for (const dz of [-0.85, 0.85]) wire([px, top - 0.35, ZB + 0.1], [px, top - 0.35, pz + dz], 0.2), wire([px, top - 0.35, pz + dz], [px, top - 0.35, ZF - 0.1], 0.15);
    // up the lane to an insulator on the top house's ridge, and service drops to the lane houses
    const ridgeC = [X(SEND - 0.4), YTOP + 3.9 + 0.2, -3.5];
    box("wood", ridgeC[0] - 0.05, ridgeC[0] + 0.05, ridgeC[1] - 0.6, ridgeC[1] + 0.05, ridgeC[2] - 0.05, ridgeC[2] + 0.05);
    wire([px, top - 1.3, pz - 0.2], ridgeC, 0.9);
    wire([px, top - 1.3, pz + 0.2], [X(SEND - 0.4), YTOP + 3.2, 3.1], 0.8);
    wire([px, top - 1.3, pz - 0.2], [X(0.25), lotsB[0][2] + 4.8, -1.95], 0.3);
    wire([px, top - 1.3, pz - 0.2], [X(3.6), lotsB[1][2] + 4.6, -HW - 0.1], 0.5);
  }

  // ---------- red pillar postbox at the foot ----------
  {
    const x = 0.75, z = -2.5;
    mark("postbox", x, Y0 + 0.7, z);
    prim("red", new THREE.CylinderGeometry(0.21, 0.21, 1.05, 10), x, Y0 + 0.525, z);
    prim("red", new THREE.CylinderGeometry(0.27, 0.27, 0.08, 10), x, Y0 + 1.09, z);
    prim("red", new THREE.SphereGeometry(0.24, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2), x, Y0 + 1.12, z, 0, 0, 0, 1, 0.55, 1);
    flat("line", [x + 0.215, Y0 + 0.82, z - 0.1], [x + 0.215, Y0 + 0.82, z + 0.1], [x + 0.215, Y0 + 0.86, z + 0.1], [x + 0.215, Y0 + 0.86, z - 0.1], [x + 5, Y0 + 0.84, z]);
    box("red", x - 0.25, x + 0.25, Y0, Y0 + 0.05, z - 0.25, z + 0.25);
  }

  // ---------- meshes ----------
  const MAT = {
    step: [c.step, c.stepShade, 0.67],
    wall: [c.wall, c.wallShade, 0.2],
    plaster: [c.plaster, c.plasterShade, 0.1],
    wood: [c.wood, c.woodShade, 0.4],
    roof: [c.roof, c.roofShade, 0.3],
    line: [c.line, c.line, 0.1, false],
    joint: [c.wallShade, c.wallShade, 0.1, false],
    metal: [c.metal, c.metalShade, 0.3],
    leaf: [c.leaf, c.leafShade, 0.35],
    bush: [c.bush, c.bushShade, 0.35],
    pot: [c.pot, c.potShade, 0.4],
    red: [c.red, c.redShade, 0.15],
    glow: [c.glow, c.glow, -0.25, false],
    sea: [c.sea, c.sea, 0.1],
    glint: [c.glint, c.glint, -1, false],
  };
  for (const [key, [base, shade, threshold, outline = true]] of Object.entries(MAT)) {
    if (!soups[key]) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(soups[key], 3));
    geo.computeVertexNormals();
    const mesh = kit.toon(geo, base, shade, { threshold, outline });
    mesh.name = key;
    set.add(mesh);
  }

  // centre on the bbox, then scale to the requested top
  set.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(set);
  const sc = height ? height / bb.max.y : 1;
  set.scale.setScalar(sc);
  set.position.set((-(bb.min.x + bb.max.x) / 2) * sc, 0, (-(bb.min.z + bb.max.z) / 2) * sc);

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
