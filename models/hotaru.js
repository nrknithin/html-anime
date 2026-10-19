// hotaru.js - an early-summer firefly stream at night (hotaru), a set piece, animated.
// Contract: harness/lab/README.md. Meters, +Y up, the near bank faces +Z, its left is +X, stands on y = 0, centred on
// x = 0, z = 0. Real size: 12 m along x, 8 m along z.
//
// Construction (triangle soups merged per material, flat-shaded; every closed part is wound from a point inside it):
//   STREAM   a centre line zc(x) = 1 + 0.9 sin(0.55 x + 0.4) + 0.25 x running the full width (from the far
//            left toward the near right, so the hero camera sees it wind), half width hw(x) 0.45-0.65. The
//            ground is two grids (near and far), each with its columns at x and its rows running from the bank top to
//            the set edge, so the bank edge follows the curve exactly. Between them a bank strip on each side drops
//            from the bank top (y 0.25) under the water line (0.14) to the bed (0.05); the near bank widens into a
//            low pebble beach around x = -3. The water is one flat ribbon at y 0.14 tucked into both banks. A skirt
//            closes the set down to y = 0 all round (the channel ends fill to the water line).
//   ROCKS    mossy rocks: noise-warped icosahedra (detail 1) in and along the water; the moss is a cap of the rock's
//            upward faces lifted 8 mm along the face normal. Pebbles: small squashed octahedra on the beach and banks.
//   PLANTS   reeds: 3-sided tapered stalks in clumps, tall (1.2-1.9 m) on the far bank as a dark screen behind the
//            fireflies, low (0.75-1.0 m) on the near bank so the water reads from the front; grass tufts:
//            fans of 3-sided blades 0.3-0.6 m. Both carry a thin 2 px hull so they read as lines at any size.
//   BUILT    a stone slab footbridge (one slab on two bearer stones) where the path crosses at x ~ 1.6; stepping
//            stones from the near edge to the bridge and along a back path; a yotsume-gaki bamboo fence (posts,
//            three rails, verticals every 0.3 m alternating sides) along the back path; a plain wooden bench on the far
//            bank facing the water; a single cylindrical paper lantern on a short post by the bridge's far end.
//   FIREFLIES one mesh: each firefly is a 5 cm icosahedron with a glow-coloured hull (iris, 3 px) as its halo, so it
//            reads as a dot with a glow at any size; fireflies over the water add a flat reflection on the surface
//            (same mesh). pose() rewrites the whole mesh: positions (drift), scale (pulse) and the hull normals (a
//            dark firefly gets zero hull normals so its halo vanishes too).
// Proportions (base unit the bank height 0.25 m above the bed y 0): water 0.14, bed 0.05; bridge slab 2.3 x 0.55 x
//   0.12, top 0.43; bench seat 0.43 x 1.5 x 0.36; fence 1.0 tall, posts every 1.8 m; lantern post 0.9, paper 0.36 tall
//   x 0.26, top 1.33; tallest reed tip 2.15 (meta.height); fireflies 0.3-1.5 m.
// Budget: ~13.3k triangles in 12 meshes at the default 50 fireflies (each firefly 20 + 8 for a reflection; 80 is ~14.0k).
// Options build(THREE, kit, colors, { height, fireflies }):
//   height     scales the whole set uniformly (default meta.height, the tallest reed tip).
//   fireflies  10..80 (default 50); the first N of a fixed 80-firefly table (half over the water and its banks,
//              half over the grass anywhere, denser toward the near corner).
// Clip: glow 4 s loop (pose("glow@1.3")): every firefly drifts on a small closed loop (1 or 2 turns per 4 s, radius
//   4-14 cm) and pulses (1 or 2 blinks per 4 s, lit 45-70 % of each blink period, scale down to 0.04 and the halo
//   off when dark), all phases
//   from a table, so the loop closes. rest shows every firefly lit at its table position.
// Colours (indigo, night), base / shade:
//   ground and banks sky #1b2d6b flat (the night ambient); water hair #16141c flat (a black mirror) with moon #d5e2ff
//   glint streaks; stones (rocks, slab, stepping stones, bearers) moon / sky at 0.35 (moonlit tops, navy sides), moss
//   sky / hair; pebbles line #e7eefc / moon; reeds and grass hair flat; wood (bench, posts) sky / hair; bamboo moon /
//   sky; lantern paper sclera #f6f3ee flat (lit from inside) with hair caps and ribs; fireflies practical #f0c36a
//   flat with an iris #e7a04a halo. The fireflies and the lantern are the only light.

export const meta = {
  name: "hotaru",
  height: 2.15,
  script: "indigo",
  colors: {
    ground: "#1b2d6b",
    water: "#d5e2ff", glint: "#1b2d6b",
    stone: "#d5e2ff", stoneShade: "#1b2d6b",
    moss: "#1b2d6b", mossShade: "#16141c",
    pebble: "#e7eefc", pebbleShade: "#d5e2ff",
    reed: "#16141c",
    wood: "#1b2d6b", woodShade: "#16141c",
    bamboo: "#d5e2ff", bambooShade: "#1b2d6b",
    paper: "#f6f3ee", lanternFrame: "#16141c",
    firefly: "#f0c36a", halo: "#e7a04a",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const height = opts.height ?? meta.height;
  const NF = Math.max(10, Math.min(80, Math.round(opts.fireflies ?? 50)));
  const root = new THREE.Group();
  root.name = "hotaru";
  const set = new THREE.Group();
  set.name = "set";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = {};
  const TAU = Math.PI * 2;

  // ---------- deterministic noise ----------
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const rnd = (i, k, a = 0, b = 1) => a + (b - a) * hash(i * 17.13 + k * 3.71);

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  function tri(key, a, b, e, ref) { // wound away from ref
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-10) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    S(key).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  const up = (p) => [p[0], p[1] - 1, p[2]]; // ref below a surface: faces up
  // an oriented box: centre, half sizes, yaw about y
  function obox(key, cx, cy, cz, hx, hy, hz, yaw = 0) {
    const co = Math.cos(yaw), si = Math.sin(yaw);
    const P = (i, j, k) => [cx + co * i * hx + si * k * hz, cy + j * hy, cz - si * i * hx + co * k * hz];
    const v = [P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1), P(-1, 1, -1), P(1, 1, -1), P(1, 1, 1), P(-1, 1, 1)];
    const ref = [cx, cy, cz];
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]) quad(key, v[f[0]], v[f[1]], v[f[2]], v[f[3]], ref);
  }
  // closed cylinder a -> b, n sides
  function cyl(key, a, b, r, n = 6, r2 = r) {
    const d = nrm(sub(b, a)), s = nrm(cross(d, Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), u = cross(s, d);
    const R = (p, rr, k) => [0, 1, 2].map((j) => p[j] + rr * (Math.cos((k / n) * TAU) * s[j] + Math.sin((k / n) * TAU) * u[j]));
    const ref = a.map((v, j) => (v + b[j]) / 2);
    for (let k = 0; k < n; k++) {
      quad(key, R(a, r, k), R(a, r, k + 1), R(b, r2, k + 1), R(b, r2, k), ref);
      tri(key, a, R(a, r, k), R(a, r, k + 1), ref);
      tri(key, b, R(b, r2, k), R(b, r2, k + 1), ref);
    }
  }
  // tapered 3-sided stalk along a polyline, closing to a point at the tip (base buried)
  function stalk(key, pts, r0) {
    const n = 3, m = pts.length - 1;
    const rings = pts.map((p, i) => {
      const d = nrm(sub(pts[Math.min(i + 1, m)], pts[Math.max(i - 1, 0)]));
      const s = nrm(cross(d, [1, 0, 0.3])), u = cross(s, d), r = r0 * (1 - i / m) ** 0.8;
      return Array.from({ length: n }, (_, k) => [0, 1, 2].map((j) => p[j] + r * (Math.cos((k / n) * TAU) * s[j] + Math.sin((k / n) * TAU) * u[j])));
    });
    for (let i = 0; i < m; i++) {
      const ref = pts[i].map((v, j) => (v + pts[i + 1][j]) / 2);
      for (let k = 0; k < n; k++) {
        if (i === m - 1) tri(key, rings[i][k], rings[i][(k + 1) % n], pts[m], ref);
        else quad(key, rings[i][k], rings[i][(k + 1) % n], rings[i + 1][(k + 1) % n], rings[i + 1][k], ref);
      }
    }
  }

  // ---------- the stream ----------
  const X0 = -6, X1 = 6, ZN = 4, ZF = -4; // set edges: near z = +4, far z = -4
  const YB = 0.25, YW = 0.14, YBED = 0.05;
  const zc = (x) => 1.0 + 0.9 * Math.sin(0.55 * x + 0.4) + 0.25 * x;
  const hw = (x) => 0.55 + 0.1 * Math.sin(0.9 * x + 1);
  const beach = (x) => Math.exp(-(((x + 3) / 1.3) ** 2)); // the near bank widens into a beach around x = -3
  // bank profiles: [offset beyond the water edge (z), y]; near bank (+z) and far bank (-z)
  const nearBank = (x) => { const w = 0.35 + 0.9 * beach(x); return [[w, YB], [w * 0.55, YB - 0.04 - 0.02 * beach(x)], [0.08, YW + 0.005], [-0.12, YBED]]; };
  const farBank = () => [[0.35, YB], [0.22, YB - 0.03], [0.06, YW + 0.01], [-0.12, YBED]];
  const NX = 40;
  const xs = Array.from({ length: NX + 1 }, (_, i) => X0 + ((X1 - X0) * i) / NX);
  // ground grids
  const NV = 10;
  for (const side of [1, -1]) {
    const edge = side > 0 ? ZN : ZF;
    const zTop = (x) => zc(x) + side * (hw(x) + (side > 0 ? nearBank(x) : farBank())[0][0]);
    const P = (x, j) => { const z0 = zTop(x), t = j / NV; return [x, YB, z0 + (edge - z0) * t ** 1.2]; };
    for (let i = 0; i < NX; i++)
      for (let j = 0; j < NV; j++) {
        const a = P(xs[i], j), b = P(xs[i + 1], j), e = P(xs[i + 1], j + 1), d = P(xs[i], j + 1);
        quad("ground", a, b, e, d, up(a));
      }
    // bank strip
    for (let i = 0; i < NX; i++) {
      const pa = side > 0 ? nearBank(xs[i]) : farBank(), pb = side > 0 ? nearBank(xs[i + 1]) : farBank();
      const Q = (x, pr, k) => [x, pr[k][1], zc(x) + side * (hw(x) + pr[k][0])];
      for (let k = 0; k < 3; k++) {
        const a = Q(xs[i], pa, k), b = Q(xs[i + 1], pb, k), e = Q(xs[i + 1], pb, k + 1), d = Q(xs[i], pa, k + 1);
        const ref = [a[0], a[1] - 0.3, a[2] + side * 0.3];
        quad("ground", a, b, e, d, ref);
      }
    }
    // front / back skirt
    for (let i = 0; i < NX; i++) quad("ground", [xs[i], YB, edge], [xs[i + 1], YB, edge], [xs[i + 1], 0, edge], [xs[i], 0, edge], [0, 0.1, 0]);
  }
  // bed (under the water, closes the channel)
  for (let i = 0; i < NX; i++) {
    const Z = (x, s) => zc(x) + s * (hw(x) - 0.12);
    quad("ground", [xs[i], YBED, Z(xs[i], 1)], [xs[i + 1], YBED, Z(xs[i + 1], 1)], [xs[i + 1], YBED, Z(xs[i + 1], -1)], [xs[i], YBED, Z(xs[i], -1)], [xs[i], -1, zc(xs[i])]);
  }
  // side skirts at x = -6 and x = +6: the full cross-section from the near edge to the far edge, down to y = 0
  for (const x of [X0, X1]) {
    const nb = nearBank(x), fb = farBank();
    const prof = [[ZN, YB], ...nb.map(([o, y]) => [zc(x) + hw(x) + o, Math.max(y, YW)]), ...fb.slice().reverse().map(([o, y]) => [zc(x) - hw(x) - o, Math.max(y, YW)]), [ZF, YB]];
    const ref = [0, 0.1, 0];
    for (let k = 0; k + 1 < prof.length; k++) {
      const [za, ya] = prof[k], [zb, yb] = prof[k + 1];
      quad("ground", [x, ya, za], [x, yb, zb], [x, 0, zb], [x, 0, za], ref);
    }
  }
  // water ribbon
  for (let i = 0; i < NX; i++) {
    const Z = (x, s) => zc(x) + s * (hw(x) + (s > 0 ? 0.1 : 0.09));
    quad("water", [xs[i], YW, Z(xs[i], 1)], [xs[i + 1], YW, Z(xs[i + 1], 1)], [xs[i + 1], YW, Z(xs[i + 1], -1)], [xs[i], YW, Z(xs[i], -1)], [xs[i], -1, zc(xs[i])]);
  }
  // moonlight glints: thin streaks along the flow
  for (let g = 0; g < 26; g++) {
    const x = X0 + 0.4 + (11.2 * g) / 25 + rnd(g, 1, -0.15, 0.15), o = rnd(g, 2, -0.75, 0.75) * hw(x), len = rnd(g, 3, 0.18, 0.5), w = rnd(g, 4, 0.012, 0.025);
    const dz = (zc(x + 0.01) - zc(x - 0.01)) / 0.02, t = nrm([1, 0, dz]), n = [-t[2], 0, t[0]];
    const p = [x, YW + 0.003, zc(x) + o];
    const A = (u, v) => [p[0] + t[0] * u + n[0] * v, p[1], p[2] + t[2] * u + n[2] * v];
    quad("glint", A(-len / 2, 0), A(0, -w), A(len / 2, 0), A(0, w), up(p));
  }

  // ---------- rocks, moss, pebbles ----------
  function rock(key, mossKey, cx, cy, cz, sx, sy, sz, seed) {
    const g = new THREE.IcosahedronGeometry(1, 1), P = g.attributes.position.array;
    const warp = (x, y, z) => {
      const f = 1 + 0.18 * Math.sin(3.1 * x + seed) * Math.cos(2.3 * z + seed * 1.7) + 0.08 * Math.sin(5 * y + seed * 2.3);
      return [cx + x * sx * f, Math.max(0.03, cy + Math.max(y, -0.35) * sy * f), cz + z * sz * f];
    };
    const ref = [cx, cy, cz];
    for (let v = 0; v < P.length; v += 9) {
      const a = warp(P[v], P[v + 1], P[v + 2]), b = warp(P[v + 3], P[v + 4], P[v + 5]), e = warp(P[v + 6], P[v + 7], P[v + 8]);
      tri(key, a, b, e, ref);
      if (mossKey && P[v + 1] > 0.3 && P[v + 4] > 0.3 && P[v + 7] > 0.3) {
        let n = nrm(cross(sub(b, a), sub(e, a)));
        const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
        if (dot(n, sub(m, ref)) < 0) n = n.map((q) => -q);
        const lift = (q) => q.map((v2, j) => v2 + n[j] * 0.008);
        tri(mossKey, lift(a), lift(b), lift(e), ref);
      }
    }
  }
  // [x, offset across the stream in half widths, size, height, seed]
  const ROCKS = [[-5.1, -0.55, 0.32, 0.22, 1], [-4.3, 0.95, 0.42, 0.3, 2], [-3.4, 0.2, 0.26, 0.18, 3], [-1.6, -1.05, 0.5, 0.34, 4], [-0.6, 0.45, 0.24, 0.17, 5],
    [0.8, -0.3, 0.3, 0.2, 6], [2.7, 1.05, 0.45, 0.32, 7], [3.6, -0.6, 0.28, 0.2, 8], [4.6, 1.1, 0.55, 0.4, 9], [5.4, 0.1, 0.3, 0.2, 10], [-2.2, 1.0, 0.22, 0.15, 11]];
  for (const [x, o, s, h, seed] of ROCKS) rock("stone", "moss", x, YW - 0.02, zc(x) + o * hw(x), s, h, s * rnd(seed, 1, 0.75, 1.0), seed);
  function pebble(x, y, z, r, seed) {
    const yaw = rnd(seed, 5, 0, TAU), sx = r * rnd(seed, 6, 1, 1.5), sy = r * 0.55, co = Math.cos(yaw), si = Math.sin(yaw);
    const V = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(([a, b, e]) => [x + co * a * sx + si * e * r, y + b * sy, z - si * a * sx + co * e * r]);
    const ref = [x, y, z];
    for (const [a, b] of [[0, 4], [4, 1], [1, 5], [5, 0]]) { tri("pebble", V[a], V[b], V[2], ref); tri("pebble", V[a], V[b], V[3], ref); }
  }
  for (let p = 0; p < 70; p++) {
    const x = Math.max(-5.8, Math.min(5.8, -3 + rnd(p, 7, -1.9, 1.9) * (p < 50 ? 1 : 2.8)));
    const nb = nearBank(x), o = hw(x) + rnd(p, 8, 0.05, nb[0][0] * 0.9);
    const t = (o - hw(x)) / nb[0][0], y = YW + (YB - YW) * Math.min(1, t * 1.15);
    pebble(x, y, zc(x) + o, rnd(p, 9, 0.03, 0.07), p);
  }

  // ---------- path: stepping stones and the stone slab bridge ----------
  const BX = 1.6; // bridge crossing
  const bdz = (zc(BX + 0.01) - zc(BX - 0.01)) / 0.02, byaw = Math.atan(bdz); // the slab runs across the flow
  const bz = zc(BX);
  obox("stone", BX, 0.37, bz, 0.275, 0.06, 1.15, byaw); // slab: 0.55 wide, 2.3 long, top 0.43
  for (const s of [1, -1]) obox("stone", BX - Math.sin(byaw) * s * 0.85, 0.2, bz + Math.cos(byaw) * s * 0.85, 0.3, 0.12, 0.22, byaw + 0.1 * s);
  const stepStone = (x, z, r, seed) => {
    const n = 7, yaw = rnd(seed, 3, 0, TAU), ref = [x, YB, z], top = YB + 0.035, pts = [];
    for (let k = 0; k < n; k++) { const a = yaw + (k / n) * TAU, f = r * (1 + 0.15 * Math.sin(3 * a + seed)); pts.push([x + f * Math.cos(a), z + f * 0.8 * Math.sin(a)]); }
    for (let k = 0; k < n; k++) {
      const [ax, az] = pts[k], [bx, bz2] = pts[(k + 1) % n];
      tri("stone", [x, top, z], [ax, top, az], [bx, top, bz2], [x, 0, z]);
      quad("stone", [ax, top, az], [bx, top, bz2], [bx, YB - 0.03, bz2], [ax, YB - 0.03, az], ref);
    }
  };
  // near path: from the front edge to the bridge's near end
  const nearEnd = [BX - Math.sin(byaw) * 1.25, bz + Math.cos(byaw) * 1.25], farEnd = [BX + Math.sin(byaw) * 1.25, bz - Math.cos(byaw) * 1.25];
  const NEAR = 2;
  for (let k = 0; k < NEAR; k++) {
    const t = (k + 0.5) / NEAR, x = nearEnd[0] + (2.6 - nearEnd[0]) * t, z = nearEnd[1] + (3.8 - nearEnd[1]) * t;
    stepStone(x, z, 0.24, 20 + k);
  }
  // far path: from the bridge to the back path, then along the fence
  const BACKZ = -2.85;
  for (let k = 0; k < 4; k++) { const t = (k + 0.5) / 4; stepStone(farEnd[0] + (1.9 - farEnd[0]) * t, farEnd[1] + (BACKZ - farEnd[1]) * t, 0.23, 30 + k); }
  for (let k = 0; k < 15; k++) { const x = -5.6 + k * 0.75; if (Math.abs(x - 1.9) > 0.3) stepStone(x, BACKZ + 0.08 * Math.sin(k * 1.7), 0.22, 40 + k); }

  // ---------- bamboo fence (yotsume-gaki) along the back path ----------
  const FZ = -3.45, FA = -5.7, FB = 5.7;
  for (let x = FA; x <= FB + 1e-6; x += (FB - FA) / 6) cyl("wood", [x, YB - 0.05, FZ], [x, YB + 1.0, FZ], 0.04, 6);
  for (const y of [0.38, 0.65, 0.92]) cyl("bamboo", [FA - 0.08, YB + y, FZ + 0.045], [FB + 0.08, YB + y, FZ + 0.045], 0.018, 6);
  for (let k = 0, x = FA + 0.15; x < FB - 0.1; x += 0.3, k++) {
    if (Math.abs(((x - FA) / ((FB - FA) / 6)) % 1) < 0.08 || Math.abs(((x - FA) / ((FB - FA) / 6)) % 1) > 0.92) continue;
    const z = FZ + (k % 2 ? 0.075 : 0.015);
    cyl("bamboo", [x, YB - 0.03, z], [x, YB + 0.97 + 0.03 * (k % 3), z], 0.016, 6);
  }

  // ---------- bench on the far bank, facing the water ----------
  {
    const x = 3.6, z = 0.95, yaw = -0.3;
    obox("wood", x, YB + 0.41, z, 0.75, 0.025, 0.18, yaw);
    for (const sx of [-0.62, 0.62]) {
      const lx = x + Math.cos(yaw) * sx, lz = z - Math.sin(yaw) * sx;
      obox("wood", lx, YB + 0.19, lz, 0.04, 0.2, 0.15, yaw);
    }
    obox("wood", x, YB + 0.12, z, 0.6, 0.02, 0.03, yaw); // stretcher
  }

  // ---------- lantern on a short post by the bridge's far end ----------
  const LX = farEnd[0] + 0.75, LZ = farEnd[1] - 0.15;
  cyl("wood", [LX, YB - 0.05, LZ], [LX, YB + 0.72, LZ], 0.045, 6);
  obox("wood", LX, YB + 0.735, LZ, 0.15, 0.015, 0.15);
  {
    const n = 10, y0 = YB + 0.75, y1 = y0 + 0.34, r = 0.13;
    const ring = (y, rr) => Array.from({ length: n }, (_, k) => [LX + rr * Math.cos((k / n) * TAU), y, LZ + rr * Math.sin((k / n) * TAU)]);
    const rows = [[y0 + 0.02, r * 0.82], [y0 + 0.09, r * 0.98], [y0 + 0.17, r], [y1 - 0.09, r * 0.98], [y1 - 0.02, r * 0.82]].map(([y, rr]) => ring(y, rr));
    const ref = [LX, (y0 + y1) / 2, LZ];
    for (let i = 0; i + 1 < rows.length; i++) for (let k = 0; k < n; k++) quad("paper", rows[i][k], rows[i][(k + 1) % n], rows[i + 1][(k + 1) % n], rows[i + 1][k], ref);
    cyl("lanternFrame", [LX, y0 - 0.005, LZ], [LX, y0 + 0.03, LZ], r * 0.86, n);
    cyl("lanternFrame", [LX, y1 - 0.03, LZ], [LX, y1 + 0.01, LZ], r * 0.86, n);
    cyl("lanternFrame", [LX, y1 + 0.01, LZ], [LX, y1 + 0.04, LZ], r * 0.35, n);
    for (const y of [y0 + 0.13, y0 + 0.21]) { // ribs: thin rings proud of the paper
      const A = ring(y - 0.006, r * 1.012), B2 = ring(y + 0.006, r * 1.012);
      for (let k = 0; k < n; k++) quad("lanternFrame", A[k], A[(k + 1) % n], B2[(k + 1) % n], B2[k], ref);
    }
  }

  // ---------- reeds and grass ----------
  // clumps: [x, side (+1 near / -1 far), offset beyond the water edge, count, tallest]
  // the far bank carries the tall reeds (the dark screen the fireflies glow against); the near bank stays low so the
  // water reads from the front
  const CLUMPS = [[-5.5, -1, 0.15, 9, 1.75], [-3.9, -1, 0.2, 9, 1.9], [-0.2, -1, 0.15, 8, 1.6], [3.1, -1, 0.14, 9, 1.85],
    [5.3, -1, 0.2, 8, 1.65], [-2.0, -1, 1.6, 6, 1.5], [-4.6, -1, 2.0, 5, 1.3], [5.0, -1, 2.4, 5, 1.25], [4.3, -1, 3.6, 6, 1.3],
    [-0.6, -1, 2.3, 5, 1.2], [1.0, -1, 0.3, 5, 1.4],
    [-4.7, 1, 0.12, 6, 0.95], [-1.0, 1, 0.12, 6, 0.9], [0.4, 1, 0.18, 4, 0.8], [3.4, 1, 0.2, 5, 0.85], [5.3, 1, 0.25, 6, 0.95],
    [-5.6, 1, 0.3, 5, 1.0], [5.5, 1, 0.8, 4, 0.75]];
  let rid = 0;
  for (const [cx, side, off, cnt, tall] of CLUMPS) {
    for (let k = 0; k < cnt; k++, rid++) {
      const x = Math.max(-5.85, Math.min(5.85, cx + rnd(rid, 1, -0.35, 0.35))), o = off + rnd(rid, 2, -0.1, 0.25), z = Math.max(-3.6, Math.min(3.7, zc(x) + side * (hw(x) + o)));
      const h = tall * (k === 0 ? 1 : rnd(rid, 3, 0.62, 0.97)), lean = rnd(rid, 4, -0.18, 0.18), leanZ = side * rnd(rid, 5, -0.05, 0.2);
      const pts = Array.from({ length: 6 }, (_, i) => { const t = i / 5; return [x + lean * h * t * t, YB - 0.1 + (h + 0.1) * t, z + leanZ * h * t * t]; });
      stalk("reed", pts, 0.012);
    }
  }
  // grass tufts: fans of blades
  const TUFTS = [];
  for (let t = 0; t < 84; t++) {
    const x = rnd(t, 11, -5.8, 5.8), z = rnd(t, 12, -3.1, 3.85);
    if (Math.abs(z - zc(x)) < hw(x) + 0.3 + (z > zc(x) ? 0.6 * beach(x) : 0)) continue;
    TUFTS.push([x, z]);
  }
  for (let t = 0; t < 16; t++) { // the near corner: along the front and the +x edges
    const u = rnd(t, 60), x = t % 2 ? rnd(t, 61, -1, 5.85) : rnd(t, 62, 4.6, 5.85), z = t % 2 ? rnd(t, 63, 3.2, 3.85) : rnd(t, 64, -3.0, 1.2);
    if (Math.abs(z - zc(x)) > hw(x) + 0.3 && u >= 0) TUFTS.push([x, z]);
  }
  for (let t = 0; t < 10; t++) TUFTS.push([rnd(t, 21, -5.6, 5.6), FZ + 0.25 + rnd(t, 22, 0, 0.2)]); // along the fence foot
  TUFTS.forEach(([x, z], t) => {
    if (Math.abs(x - LX) < 0.3 && Math.abs(z - LZ) < 0.3) return;
    const nb = 4, h = rnd(t, 13, 0.3, 0.6);
    for (let b = 0; b < nb; b++) {
      const a = (b / nb) * TAU + rnd(t, 14 + b, 0, 1), sp = rnd(t, 20 + b, 0.08, 0.22) * h, hh = h * rnd(t, 30 + b, 0.6, 1);
      stalk("reed", [[x, YB - 0.03, z], [x + Math.cos(a) * sp * 0.3, YB + hh * 0.5, z + Math.sin(a) * sp * 0.3], [x + Math.cos(a) * sp, YB + hh, z + Math.sin(a) * sp]], 0.01);
    }
  });

  // ---------- meshes ----------
  const FLAT = -1;
  const MAT = { // key: [base, shade, threshold, outline px (0 = none)]
    ground: [c.ground, c.ground, FLAT, 5], water: [c.water, c.water, FLAT, 0], glint: [c.glint, c.glint, FLAT, 0],
    stone: [c.stone, c.stoneShade, 0.35, 4], moss: [c.moss, c.mossShade, 0.35, 0], pebble: [c.pebble, c.pebbleShade, 0.35, 2],
    reed: [c.reed, c.reed, FLAT, 2], wood: [c.wood, c.woodShade, 0.35, 4], bamboo: [c.bamboo, c.bambooShade, 0.2, 3],
    paper: [c.paper, c.paper, FLAT, 4], lanternFrame: [c.lanternFrame, c.lanternFrame, FLAT, 3],
  };
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = px ? kit.toon(g, base, shade, { threshold, px }) : kit.toon(g, base, shade, { threshold, outline: false });
    mesh.name = key;
    set.add(mesh);
  }

  // ---------- fireflies: one mesh, rewritten every pose ----------
  // table of 80: [x, y, z, loop radius, loop turns, axis tilt, blink count, blink length (s), phase]
  const FLIES = [];
  for (let f = 0; f < 80; f++) {
    let x, z, y;
    const kind = f % 2; // 0: over the water and its banks; 1: over the grass anywhere
    x = -5.7 + 11.4 * (((f * 0.6180339887 + rnd(f, 40, 0, 0.08)) % 1 + 1) % 1);
    if (kind === 0) { z = zc(x) + rnd(f, 41, -1.6, 1.6) * hw(x); y = rnd(f, 42, 0.3, 1.2) ** 1.0; }
    else { x = -5.7 + 11.4 * Math.sqrt(rnd(f, 50)); z = -3.1 + 6.9 * Math.sqrt(((f * 0.3819660113 + rnd(f, 41, 0, 0.1)) % 1 + 1) % 1); y = rnd(f, 42, 0.3, 1.4); }
    FLIES.push({ x, y: Math.max(y, YB + 0.18), z, r: rnd(f, 43, 0.04, 0.14), turns: rnd(f, 44) < 0.6 ? 1 : 2, tilt: rnd(f, 45, -0.8, 0.8),
      blinks: rnd(f, 46) < 0.5 ? 1 : 2, len: rnd(f, 47, 0.45, 0.7), ph: rnd(f, 48), ph2: rnd(f, 49, 0, TAU) });
  }
  const flies = FLIES.slice(0, NF);
  const ico = new THREE.IcosahedronGeometry(1, 0).attributes.position.array; // 20 tris, unit
  const FR = 0.027; // body radius: 5.4 cm dot
  const REF = [[1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1]]; // reflection: a flat 4-point diamond fan, up and down
  const refl = [];
  for (let k = 0; k < 4; k++) { const a = REF[k], b = REF[(k + 1) % 4]; refl.push([0, 0.25, 0], a, b, [0, -0.25, 0], b, a); }
  const onWater = (x, z) => Math.abs(z - zc(x)) < hw(x) * 0.95;
  const nIco = ico.length / 3, nRefl = refl.length;
  const parts = flies.map((f) => ({ f, refl: onWater(f.x, f.z) }));
  const nVert = parts.reduce((s, p) => s + nIco + (p.refl ? nRefl : 0), 0);
  const fg = new THREE.BufferGeometry();
  const posA = new Float32Array(nVert * 3), norA = new Float32Array(nVert * 3), hulA = new Float32Array(nVert * 3);
  fg.setAttribute("position", new THREE.BufferAttribute(posA, 3));
  fg.setAttribute("normal", new THREE.BufferAttribute(norA, 3));
  fg.setAttribute("hullNormal", new THREE.BufferAttribute(hulA, 3));
  // static normals: unit directions (a sphere's own); reflections get horizontal hull normals
  {
    let v = 0;
    for (const p of parts) {
      for (let i = 0; i < nIco; i++, v++) for (let j = 0; j < 3; j++) norA[v * 3 + j] = ico[i * 3 + j];
      if (p.refl) for (let i = 0; i < nRefl; i++, v++) { const q = refl[i], h = nrm([q[0], 0, q[2]]); norA.set([0, Math.sign(q[1]) || 1, 0], v * 3); hulA.set(q[0] || q[2] ? h : [0, 0, 0], v * 3); }
    }
  }
  const fmesh = new THREE.Mesh(fg, kit.cel(c.firefly, c.firefly, { threshold: FLAT }));
  kit.outline(fmesh, { px: 3, ink: c.halo });
  fmesh.name = "fireflies";
  fmesh.frustumCulled = false;
  set.add(fmesh);
  joints.fireflies = fmesh;

  const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  function writeFlies(time) { // time in seconds within the 4 s loop, or null for rest (all lit, at the table centre)
    let v = 0;
    for (const p of parts) {
      const f = p.f;
      let x = f.x, y = f.y, z = f.z, s = 1;
      if (time !== null) {
        const w = (TAU * f.turns * time) / CLIP + f.ph2;
        const ca = Math.cos(f.tilt), sa = Math.sin(f.tilt);
        const lx = f.r * Math.cos(w), lz = f.r * Math.sin(w) * 0.8, ly = f.r * 0.5 * Math.sin(2 * w + f.ph2);
        x += lx * ca - lz * sa; z += lx * sa + lz * ca; y += ly;
        const period = CLIP / f.blinks, u = ((((time / CLIP + f.ph) * CLIP) % period) + period) % period;
        const on = f.len * period;
        s = Math.max(0.04, smooth(0, 0.2, u) * (1 - smooth(on - 0.3, on, u)));
      }
      const lit = s > 0.3;
      for (let i = 0; i < nIco; i++, v++) {
        posA[v * 3] = x + ico[i * 3] * FR * s; posA[v * 3 + 1] = y + ico[i * 3 + 1] * FR * s; posA[v * 3 + 2] = z + ico[i * 3 + 2] * FR * s;
        for (let j = 0; j < 3; j++) hulA[v * 3 + j] = lit ? ico[i * 3 + j] : 0;
      }
      if (p.refl) {
        const rs = 0.032 * s * Math.max(0.35, 1 - (y - YW) / 2);
        for (let i = 0; i < nRefl; i++, v++) {
          const q = refl[i];
          posA[v * 3] = x + q[0] * rs * 1.4; posA[v * 3 + 1] = YW + 0.004 + q[1] * 0.004; posA[v * 3 + 2] = z + q[2] * rs;
          if (!lit) hulA.fill(0, v * 3, v * 3 + 3);
          else { const h = q[0] || q[2] ? nrm([q[0], 0, q[2]]) : [0, 0, 0]; hulA.set(h, v * 3); }
        }
      }
    }
    fg.attributes.position.needsUpdate = true;
    fg.attributes.hullNormal.needsUpdate = true;
    fg.computeBoundingSphere();
    fg.computeBoundingBox();
  }

  // ---------- pose and clip ----------
  const CLIP = 4;
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (m[1] !== "glow") throw new Error(`hotaru: no clip "${m[1]}" (clips: glow)`);
      writeFlies((((+m[2] % CLIP) + CLIP) % CLIP));
    } else if (name === "rest") writeFlies(null);
    else throw new Error(`hotaru: unknown pose "${name}" (rest, or glow@<seconds>)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose, clips: { glow: CLIP } };
}
