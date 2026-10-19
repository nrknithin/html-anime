// koi-garden.js - a small traditional Japanese garden corner at real size: a koi pond with a curved stone kerb, koi
// gliding at the surface, a low red bridge over the pond's waist, stepping stones, a yukimi lantern, raked gravel, a
// clipped pine with moss mounds and a shishi-odoshi (bamboo deer-scarer) with its spout and basin stone. Animated.
// Contract: harness/lab/README.md. Meters, +Y up, the garden's front (the stepping-stone path) faces +Z, its left is +X
// (the shishi-odoshi corner is back-left, the pine back-right), stands on y = 0, centred on x = 0, z = 0.
//
// Construction (triangle soups merged per material; flat normals for cut stone, wood and the lantern, analytic
// normals for blobs, tubes and koi; every triangle is wound away from a point inside its solid, never by hand):
//   GROUND  a 3.4 x 2.6 gravel slab 6 cm thick with the pond cut out: the top is quads between the pond outline and the
//           rectangle along rays from the pond centre (corner angles included). Rake lines are flat sky quads 1.5 mm
//           proud: three lines echoing the pond outline, rings around two ripple rocks, straight rows along x elsewhere,
//           clipped at the pond, stones, moss and the shishi-odoshi corner.
//   POND    a peanut outline r(t) = 1.08 (0.74 + 0.30 cos 2t + 0.06 cos t) (1.19 / 0.475 m half length / half waist),
//           its long axis turned 38 deg so it points at the hero camera (front-left): a near-horizontal hero sees water
//           mostly in depth, so the pond is laid along the view and nothing tall stands between it and the camera.
//           Water is one flat fan 1 cm under the gravel; the kerb a closed 6-point profile swept around the outline, with
//           dark joints every fifth sample so it reads as cut stones.
//   BRIDGE  a 0.46 m deck arched 0.10 over the waist (crown 0.20), two stringers, three posts a side, an arched top rail.
//   LANTERN yukimi: three splayed legs, hex platform, hex firebox with dark windows, a 12-point hex kasa with upturned
//           corners, a jewel on top (0.88 m).
//   PINE    a leaning trunk and branch tubes to five lumpy bun-shaped pads (2.09 m), moss mounds at its foot and around.
//   SHISHI  two bamboo posts hold a pin; the tube (a joint, its own two meshes) pivots about z at 0.5 m: back end down on
//           a striker stone at rest, slanted open mouth up under a spout pipe; tipped, the mouth dips into a basin stone.
//   KOI     spindle bodies (8 elliptical rings, flattened underneath), a horizontal fan tail and pectoral fins that float
//           at the waterline, so the backs and fins show above the opaque water. ONE mesh per koi material: pose()
//           rewrites their vertices (travelling tail-beat bend, heading, path, a slow bob) each frame, as the
//           ufo-catcher's claw; the water stream is rewritten too (it stops on the mouth, or falls to the basin water).
// Proportions (real size, base unit the pond half-waist W = 0.475 m): slab 3.4 x 2.6 (7 W x 5.5 W); pond 2.3 m long;
// kerb 0.115 wide, 2.8 cm over the water; bridge 1.56 long; koi 0.56 long incl. tail (1.2 W), backs 5 cm out of the
// water; lantern 0.88, kasa 0.84 wide; shishi tube 0.70 long, 8 cm across, pivot 0.5; pine 2.09 (the height).
// Options: build(THREE, kit, colors, { height, koi }). height scales the whole garden uniformly (default 2.09, the pine
// top); koi 0-6 fish (default 3: an orange one on the big lap through the waist, a red-spotted one circling the near
// lobe, a white one the far lobe; 4-6 add a second fish half a lap behind on each path; paths keep >= 12 cm apart).
// Clip: tock 10 s, seamless: fill 0-7.4 (the tube sags 22 -> 13 deg), tip 7.4-7.9 (to -35), pour 7.9-8.4, return
// 8.4-8.75 (the back end strikes the stone: tock), two bounces to 9.3, rest. Koi: one lap per clip, an integer count of
// tail beats (16 on the big lap, 10 on the lobes) and of bobs. pose("rest") is tock@0.
// Colours (meadow): gravel moon #f7f3e1 / sclera #f6f3ee; rake lines and water sky #d7ecef (one tone); rocks, stepping
// stones, lantern, basin white granite sclera / sky; kerb skin #f0c2ae / line #a9d16e (warm cut stone, so the pond
// keeps a frame against both the pale gravel and the pale water); bridge accent #d9483b / hair #2c5131; pine pads iris
// #3f8a47 / hair; trunk, windows, bamboo nodes, joints, plank lines hair (one tone); moss and bamboo line / iris; koi:
// orange practical #f2c94c / accent (gold back, red-orange flanks), white moon / sclera, spots accent. Pale parts use
// low thresholds so faces square to the camera stay lit. 15 meshes, ~7.5k triangles at defaults.

export const meta = {
  name: "koi-garden",
  height: 2.09,
  script: "meadow",
  colors: {
    gravel: "#f7f3e1", gravelShade: "#f6f3ee",
    rake: "#d7ecef",
    water: "#d7ecef",
    stone: "#f6f3ee", stoneShade: "#d7ecef",
    kerb: "#f0c2ae", kerbShade: "#a9d16e",
    wood: "#d9483b", woodShade: "#2c5131",
    pine: "#3f8a47", pineShade: "#2c5131",
    dark: "#2c5131",
    moss: "#a9d16e", mossShade: "#3f8a47",
    bamboo: "#a9d16e", bambooShade: "#3f8a47",
    koiOrange: "#f2c94c", koiOrangeShade: "#d9483b",
    koiWhite: "#f7f3e1", koiWhiteShade: "#f6f3ee",
    koiSpot: "#d9483b",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, koi = 3 } = opts;
  const nKoi = Math.max(0, Math.min(6, Math.round(koi)));
  const root = new THREE.Group();
  root.name = "koi-garden";
  const garden = new THREE.Group(); // the uniform size scale lives here
  garden.name = "garden";
  garden.scale.setScalar(height / meta.height);
  root.add(garden);
  const joints = {};
  const TAU = Math.PI * 2, D = Math.PI / 180;

  // ---------- vectors and soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const mean = (pts) => mul(pts.reduce((s, q) => add(s, q), [0, 0, 0]), 1 / pts.length);
  const soups = {};
  const S = (k) => (soups[k] ??= { p: [], n: [] });
  // flat triangle wound away from ref (a point inside the solid); slivers dropped
  function tri(k, a, b, e, ref) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-9) return;
    const m = mul(add(add(a, b), e), 1 / 3);
    if (dot(n, sub(m, ref)) < 0) [b, e, n] = [e, b, mul(n, -1)];
    n = nrm(n);
    const s = S(k);
    s.p.push(...a, ...b, ...e);
    s.n.push(...n, ...n, ...n);
  }
  const quad = (k, a, b, e, d, ref) => (tri(k, a, b, e, ref), tri(k, a, e, d, ref));
  // smooth triangle wound to agree with its vertex normals
  function triS(k, a, b, e, na, nb, ne) {
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-9) return;
    if (dot(n, add(add(na, nb), ne)) < 0) [b, e, nb, ne] = [e, b, ne, nb];
    const s = S(k);
    s.p.push(...a, ...b, ...e);
    s.n.push(...na, ...nb, ...ne);
  }
  // rings (closed loops of equal length) joined in order; smooth = radial normals from each ring's centre
  function loft(k, rings, { smooth = false, caps = [true, true], closed = false } = {}) {
    const C = rings.map(mean), R = rings.length, N = rings[0].length;
    for (let j = 0; j < (closed ? R : R - 1); j++) {
      const j2 = (j + 1) % R, ref = mul(add(C[j], C[j2]), 0.5);
      for (let i = 0; i < N; i++) {
        const i2 = (i + 1) % N, a = rings[j][i], b = rings[j][i2], e = rings[j2][i2], d = rings[j2][i];
        if (!smooth) { quad(k, a, b, e, d, ref); continue; }
        const nv = (p, cc) => nrm(sub(p, cc));
        triS(k, a, b, e, nv(a, C[j]), nv(b, C[j]), nv(e, C[j2]));
        triS(k, a, e, d, nv(a, C[j]), nv(e, C[j2]), nv(d, C[j2]));
      }
    }
    if (closed) return;
    const cap = (ring, cc, inside) => { for (let i = 0; i < N; i++) tri(k, cc, ring[i], ring[(i + 1) % N], inside); };
    if (caps[0]) cap(rings[0], C[0], C[1]);
    if (caps[1]) cap(rings[R - 1], C[R - 1], C[R - 2]);
  }
  // a ring of n points of radius r around p, perpendicular to direction d
  function ringAt(p, d, r, n, rot = 0) {
    d = nrm(d);
    let s = cross(d, [0, 1, 0]);
    if (Math.hypot(...s) < 1e-3) s = cross(d, [1, 0, 0]);
    s = nrm(s);
    const u = cross(s, d);
    return Array.from({ length: n }, (_, i) => {
      const a = rot + (i / n) * TAU;
      return add(p, add(mul(s, r * Math.cos(a)), mul(u, r * Math.sin(a))));
    });
  }
  // a tube along a polyline; radii per point; rings perpendicular to the averaged tangent
  function tube(k, pts, radii, n = 8, o = {}) {
    const rings = pts.map((p, i) => {
      const d = sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]);
      return ringAt(p, d, typeof radii === "number" ? radii : radii[i], n, o.rot ?? 0);
    });
    loft(k, rings, { smooth: o.smooth ?? true, caps: o.caps ?? [true, true] });
  }
  // vertical prism, n sides of radius r (corner at angle rot) from y0 to y1
  const ring = (n, r, y, rot = 0, cx = 0, cz = 0) =>
    Array.from({ length: n }, (_, i) => [cx + r * Math.cos(rot + (i / n) * TAU), y, cz + r * Math.sin(rot + (i / n) * TAU)]);
  const prism = (k, n, r, y0, y1, rot = 0, cx = 0, cz = 0, r1 = r) =>
    loft(k, [ring(n, r, y0, rot, cx, cz), ring(n, r1, y1, rot, cx, cz)]);
  // deterministic lumps
  const lumpN = (a, b, s) => 0.6 * Math.sin(3 * a + s) * Math.cos(2 * b + 1.3 * s) + 0.4 * Math.sin(5 * a - 2 * b + 2.1 * s);
  // a smooth blob: ellipsoid radii r (x, y, z), bottom half squashed by `flat`, turned rotY, lumped
  function blob(k, cc, r, { nu = 12, nv = 7, rotY = 0, lump = 0, seed = 0, flat = 1 } = {}) {
    const cy = Math.cos(rotY), sy = Math.sin(rotY);
    const P = [], Nn = [];
    for (let j = 0; j <= nv; j++) {
      const lat = -Math.PI / 2 + (j / nv) * Math.PI, rowP = [], rowN = [];
      for (let i = 0; i < nu; i++) {
        const lon = (i / nu) * TAU, dx = Math.cos(lat) * Math.cos(lon), dy = Math.sin(lat), dz = Math.cos(lat) * Math.sin(lon);
        const f = 1 + lump * lumpN(lon, lat, seed) * Math.cos(lat), ry = r[1] * (dy < 0 ? flat : 1);
        const lx = r[0] * dx * f, lz = r[2] * dz * f, ly = ry * dy * (j === 0 || j === nv ? 1 : f);
        rowP.push([cc[0] + lx * cy + lz * sy, cc[1] + ly, cc[2] - lx * sy + lz * cy]);
        const nx = dx / r[0], nz = dz / r[2];
        rowN.push(nrm([nx * cy + nz * sy, dy / ry, -nx * sy + nz * cy]));
      }
      P.push(rowP), Nn.push(rowN);
    }
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < nu; i++) {
        const i2 = (i + 1) % nu;
        triS(k, P[j][i], P[j][i2], P[j + 1][i2], Nn[j][i], Nn[j][i2], Nn[j + 1][i2]);
        triS(k, P[j][i], P[j + 1][i2], P[j + 1][i], Nn[j][i], Nn[j + 1][i2], Nn[j + 1][i]);
      }
  }
  // lathe with a profile [[r, y], ...] walked so the outside is on the right; flat facets
  function lathe(k, prof, n, cx, cz) {
    for (let j = 0; j < prof.length - 1; j++) {
      const [r0, y0] = prof[j], [r1, y1] = prof[j + 1], n2 = [y1 - y0, -(r1 - r0)];
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU, am = (a0 + a1) / 2;
        const P = (r, y, a) => [cx + r * Math.cos(a), y, cz + r * Math.sin(a)];
        const out = [n2[0] * Math.cos(am), n2[1], n2[0] * Math.sin(am)];
        const a = P(r0, y0, a0), b = P(r0, y0, a1), e = P(r1, y1, a1), d = P(r1, y1, a0);
        const ref = sub(mul(add(add(a, b), add(e, d)), 0.25), out);
        quad(k, a, b, e, d, ref);
      }
    }
  }

  // ---------- plan: pond frame ----------
  const GY = 0.06, WY = 0.05; // gravel top, water level
  const X0 = -1.7, X1 = 1.7, Z0 = -1.3, Z1 = 1.3;
  const PC = [0.42, 0.22], AL = 38 * D; // the long axis points at the hero camera
  const E1 = [Math.cos(AL), Math.sin(AL)], E2 = [-Math.sin(AL), Math.cos(AL)];
  const pr = (t) => 1.08 * (0.74 + 0.3 * Math.cos(2 * t) + 0.06 * Math.cos(t));
  const L2W = (u, v) => [PC[0] + u * E1[0] + v * E2[0], PC[1] + u * E1[1] + v * E2[1]];
  const W2L = (x, z) => { const dx = x - PC[0], dz = z - PC[1]; return [dx * E1[0] + dz * E1[1], dx * E2[0] + dz * E2[1]]; };
  const pondPt = (t, m = 0) => L2W((pr(t) + m) * Math.cos(t), (pr(t) + m) * Math.sin(t));
  const pondRho = (x, z) => { const [u, v] = W2L(x, z), t = Math.atan2(v, u); return Math.hypot(u, v) - pr(t); };

  // ---------- gravel slab ----------
  const NP = 80;
  const angs = Array.from({ length: NP }, (_, i) => (i / NP) * TAU - Math.PI);
  const corners = [[X1, Z1], [X0, Z1], [X0, Z0], [X1, Z0]];
  const cornerAngs = corners.map(([x, z]) => { const [u, v] = W2L(x, z); return Math.atan2(v, u); });
  const gAngs = [...angs, ...cornerAngs].sort((a, b) => a - b);
  const rectHit = (t) => {
    const dx = Math.cos(t) * E1[0] + Math.sin(t) * E2[0], dz = Math.cos(t) * E1[1] + Math.sin(t) * E2[1];
    const ts = [];
    if (dx > 1e-9) ts.push((X1 - PC[0]) / dx); if (dx < -1e-9) ts.push((X0 - PC[0]) / dx);
    if (dz > 1e-9) ts.push((Z1 - PC[1]) / dz); if (dz < -1e-9) ts.push((Z0 - PC[1]) / dz);
    const s = Math.min(...ts);
    return [PC[0] + dx * s, PC[1] + dz * s];
  };
  for (let i = 0; i < gAngs.length; i++) {
    const t0 = gAngs[i], t1 = gAngs[(i + 1) % gAngs.length];
    const [a, b] = [pondPt(t0, 0.03), pondPt(t1, 0.03)], [q0, q1] = [rectHit(t0), rectHit(t1)];
    quad("gravel", [a[0], GY, a[1]], [b[0], GY, b[1]], [q1[0], GY, q1[1]], [q0[0], GY, q0[1]], [PC[0], -1, PC[1]]);
  }
  for (let i = 0; i < 4; i++) {
    const [a, b] = [corners[i], corners[(i + 1) % 4]];
    quad("gravel", [a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], GY, b[1]], [a[0], GY, a[1]], [0, GY / 2, 0]);
  }
  // water: one fan, its rim under the kerb
  for (let i = 0; i < NP; i++) {
    const a = pondPt(angs[i], 0.02), b = pondPt(angs[(i + 1) % NP], 0.02);
    tri("water", [PC[0], WY, PC[1]], [a[0], WY, a[1]], [b[0], WY, b[1]], [PC[0], -1, PC[1]]);
  }
  // kerb: a closed profile (offset out of the outline, y) swept around it
  const KP = [[-0.035, 0.0], [-0.035, 0.065], [-0.012, 0.078], [0.06, 0.078], [0.08, 0.066], [0.08, 0.0]];
  loft("kerb", angs.map((t) => KP.map(([m, y]) => { const q = pondPt(t, m); return [q[0], y, q[1]]; })), { closed: true });
  // joints between the cut kerb stones: dark bars across the top every fifth sample
  for (let i = 0; i < NP; i += 5) {
    const t = angs[i], dt = 0.012, y = KP[2][1] + 0.0015;
    const a = pondPt(t - dt, -0.012), b = pondPt(t + dt, -0.012), e = pondPt(t + dt, 0.06), d = pondPt(t - dt, 0.06);
    quad("dark", [a[0], y, a[1]], [b[0], y, b[1]], [e[0], y, e[1]], [d[0], y, d[1]], [a[0], -1, a[1]]);
  }

  // ---------- stones, rocks, moss ----------
  const STEPS = [
    [-0.2, 1.0, 0.16, 0.13, 0.3], [-0.52, 1.06, 0.17, 0.14, -0.2], [-0.9, 1.13, 0.15, 0.13, 0.5],
    [-1.28, 1.04, 0.15, 0.12, 0.1], [1.05, -0.6, 0.16, 0.13, -0.4], [0.7, -0.62, 0.15, 0.12, 0.7],
    [0.32, -0.8, 0.15, 0.13, 0.2], [-0.07, -0.98, 0.15, 0.13, -0.3],
  ];
  STEPS.forEach(([x, z, rx, rz, rot], i) => blob("stone", [x, GY, z], [rx, 0.05, rz], { nu: 12, nv: 4, rotY: rot, lump: 0.08, seed: i, flat: 0.3 }));
  // rocks: [x, z, r, h]; ripple rocks get raked rings
  const ROCKS = [[0.3, -0.51, 0.15, 0.18], [-0.52, -0.2, 0.16, 0.2]];
  const RIPPLE = [[-1.2, 0.6, 0.17, 0.2], [1.35, -0.33, 0.14, 0.15]];
  [...ROCKS, ...RIPPLE].forEach(([x, z, r, h], i) =>
    blob("stone", [x, GY - 0.02, z], [r, h, r * 0.85], { nu: 12, nv: 7, rotY: i * 1.7, lump: 0.16, seed: i + 3, flat: 0.12 }));
  const MOSS = [
    [-1.15, -0.8, 0.4, 0.13], [-0.72, -1.05, 0.26, 0.1], [-1.44, -0.34, 0.22, 0.09], [-1.44, -1.04, 0.2, 0.09],
    [0.42, -1.1, 0.22, 0.1], [1.45, -1.08, 0.2, 0.09], [-1.44, 1.04, 0.2, 0.08], [1.5, 0.1, 0.16, 0.07],
    [-1.0, 0.45, 0.13, 0.06],
  ];
  MOSS.forEach(([x, z, r, h], i) => blob("moss", [x, GY - 0.01, z], [r, h, r * 0.8], { nu: 12, nv: 5, rotY: i, lump: 0.14, seed: i * 2.3, flat: 0.15 }));

  // ---------- raked gravel ----------
  const EXCL = [
    ...STEPS.map(([x, z, rx]) => [x, z, rx + 0.05]), ...ROCKS.map(([x, z, r]) => [x, z, r + 0.05]),
    ...MOSS.map(([x, z, r]) => [x, z, r + 0.04]), [-0.75, 0.2, 0.33],
  ];
  const RINGS = RIPPLE.map(([x, z, r]) => ({ x, z, r0: r + 0.07, n: 4, gap: 0.055 }));
  const ECHO = [0.16, 0.22, 0.28]; // raked lines echoing the pond's outline
  function blocked(x, z, ringIdx = -1) {
    if (x < X0 + 0.05 || x > X1 - 0.05 || z < Z0 + 0.05 || z > Z1 - 0.05) return true;
    if (pondRho(x, z) < (ringIdx === -2 ? 0.12 : 0.33)) return true;
    const [u, v] = W2L(x, z);
    if (Math.abs(u) < 0.3 && Math.abs(v) < 0.85) return true; // bridge feet
    if (x > 0.42 && z < -0.72) return true; // shishi-odoshi corner
    for (const [ex, ez, er] of EXCL) if (Math.hypot(x - ex, z - ez) < er) return true;
    for (let k = 0; k < RINGS.length; k++) {
      const R = RINGS[k], d = Math.hypot(x - R.x, z - R.z);
      if (k === ringIdx) { if (d < R.r0 - 0.03) return true; } else if (d < R.r0 + R.n * R.gap + 0.01) return true;
    }
    return false;
  }
  const RY = GY + 0.0015, RW = 0.0075;
  const strip = (a, b) => { // a flat quad along a -> b in the gravel plane
    const d = nrm([b[0] - a[0], 0, b[1] - a[1]]), s = [-d[2] * RW, 0, d[0] * RW];
    quad("rake", [a[0] + s[0], RY, a[1] + s[2]], [b[0] + s[0], RY, b[1] + s[2]], [b[0] - s[0], RY, b[1] - s[2]], [a[0] - s[0], RY, a[1] - s[2]], [a[0], -1, a[1]]);
  };
  for (let z = Z0 + 0.09; z < Z1 - 0.05; z += 0.075)
    for (let x = X0 + 0.05; x < X1 - 0.05; x += 0.1) {
      const x2 = Math.min(x + 0.1, X1 - 0.05);
      if (!blocked(x, z) && !blocked(x2, z) && !blocked((x + x2) / 2, z)) strip([x, z], [x2, z]);
    }
  for (const m of ECHO)
    for (let i = 0; i < NP; i++) {
      const p0 = pondPt(angs[i], m), p1 = pondPt(angs[(i + 1) % NP], m);
      if (!blocked(...p0, -2) && !blocked(...p1, -2)) strip(p0, p1);
    }
  RINGS.forEach((R, k) => {
    for (let j = 0; j < R.n; j++) {
      const r = R.r0 + j * R.gap, n = Math.max(12, Math.round((TAU * r) / 0.07));
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
        const p0 = [R.x + r * Math.cos(a0), R.z + r * Math.sin(a0)], p1 = [R.x + r * Math.cos(a1), R.z + r * Math.sin(a1)];
        if (!blocked(...p0, k) && !blocked(...p1, k)) strip(p0, p1);
      }
    }
  });

  // ---------- bridge (along the pond's minor axis, over the waist) ----------
  const BL = 0.78, BW = 0.23;
  const by = (v) => 0.1 + 0.1 * (1 - (v / BL) ** 2);
  const BP = (u, v, y) => { const q = L2W(u, v); return [q[0], y, q[1]]; };
  const NB = 12, bvs = Array.from({ length: NB + 1 }, (_, i) => -BL + (2 * BL * i) / NB);
  // deck: a rectangular section swept along the arch
  loft("wood", bvs.map((v) => [BP(-BW, v, by(v)), BP(BW, v, by(v)), BP(BW, v, by(v) - 0.05), BP(-BW, v, by(v) - 0.05)]));
  for (const su of [-1, 1]) {
    // stringer under each deck edge
    loft("wood", bvs.map((v) => [BP(su * (BW - 0.01), v, by(v) - 0.05), BP(su * (BW - 0.07), v, by(v) - 0.05), BP(su * (BW - 0.07), v, by(v) - 0.085), BP(su * (BW - 0.01), v, by(v) - 0.08)]));
    // posts and an arched top rail
    for (const v of [-0.72, 0, 0.72]) {
      const u = su * (BW - 0.03), y0 = by(v) - 0.02, y1 = by(v) + 0.17;
      loft("wood", [[BP(u - 0.025, v - 0.025, y0), BP(u + 0.025, v - 0.025, y0), BP(u + 0.025, v + 0.025, y0), BP(u - 0.025, v + 0.025, y0)],
        [BP(u - 0.025, v - 0.025, y1), BP(u + 0.025, v - 0.025, y1), BP(u + 0.025, v + 0.025, y1), BP(u - 0.025, v + 0.025, y1)]]);
    }
    const rv = Array.from({ length: 9 }, (_, i) => -0.74 + (1.48 * i) / 8);
    loft("wood", rv.map((v) => { const u = su * (BW - 0.03), y = by(v) + 0.15; return [BP(u - 0.02, v, y), BP(u + 0.02, v, y), BP(u + 0.02, v, y + 0.035), BP(u - 0.02, v, y + 0.035)]; }));
  }
  // plank joints across the deck top
  for (let i = 1; i < 16; i++) {
    const v = -BL + (2 * BL * i) / 16, y = by(v) + 0.0015, dv = 0.005;
    quad("dark", BP(-BW + 0.01, v - dv, y), BP(BW - 0.01, v - dv, y), BP(BW - 0.01, v + dv, y), BP(-BW + 0.01, v + dv, y), BP(0, v, y - 1));
  }

  // ---------- yukimi lantern ----------
  const LX = -0.75, LZ = 0.2;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + 0.6, ca = Math.cos(a), sa = Math.sin(a);
    const P = (r, y) => [LX + r * ca, y, LZ + r * sa];
    tube("stone", [P(0.09, 0.37), P(0.17, 0.25), P(0.24, 0.12), P(0.26, GY - 0.01)], [0.032, 0.03, 0.03, 0.034], 5, { smooth: false });
  }
  prism("stone", 6, 0.18, 0.33, 0.39, 0, LX, LZ, 0.16);
  prism("stone", 6, 0.115, 0.39, 0.56, 0, LX, LZ);
  for (let i = 0; i < 6; i++) { // a dark window on each firebox face
    const a = ((i + 0.5) / 6) * TAU, ap = 0.1 * Math.cos(Math.PI / 6) + 0.002, cx = LX + ap * Math.cos(a), cz = LZ + ap * Math.sin(a);
    const t = [-Math.sin(a), 0, Math.cos(a)], hw = 0.035;
    const Q = (s, y) => [cx + t[0] * s * hw + 0.0155 * Math.cos(a), y, cz + t[2] * s * hw + 0.0155 * Math.sin(a)];
    quad("dark", Q(-1, 0.42), Q(1, 0.42), Q(1, 0.52), Q(-1, 0.52), [LX, 0.47, LZ]);
  }
  const kasaRing = (r, y, lift) => Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * TAU, corner = i % 2 === 0, rr = corner ? r : r * Math.cos(Math.PI / 6) * 1.02;
    return [LX + rr * Math.cos(a), y + (corner ? lift : 0), LZ + rr * Math.sin(a)];
  });
  loft("stone", [kasaRing(0.36, 0.56, 0.03), kasaRing(0.42, 0.585, 0.05), kasaRing(0.42, 0.625, 0.05), kasaRing(0.075, 0.76, 0)]);
  prism("stone", 8, 0.04, 0.755, 0.79, 0, LX, LZ);
  blob("stone", [LX, 0.82, LZ], [0.045, 0.045, 0.045], { nu: 8, nv: 5 });
  blob("stone", [LX, 0.865, LZ], [0.012, 0.012, 0.012], { nu: 6, nv: 3 });

  // ---------- pine ----------
  const TB = [-1.15, -0.8];
  const T = (x, y, z) => [TB[0] + x, y, TB[1] + z];
  tube("dark", [T(0, GY - 0.02, 0), T(0.06, 0.45, 0.03), T(0.22, 0.85, 0.06), T(0.16, 1.3, 0.02), T(0.05, 1.7, -0.02), T(0.04, 1.95, 0)],
    [0.1, 0.085, 0.075, 0.06, 0.045, 0.03], 8);
  const PADS = [
    [T(0.72, 0.82, 0.28), [0.5, 0.14, 0.36], T(0.2, 0.78, 0.06)],
    [T(-0.16, 1.12, 0.1), [0.34, 0.13, 0.28], T(0.19, 1.05, 0.04)],
    [T(0.58, 1.38, -0.02), [0.38, 0.13, 0.3], T(0.16, 1.3, 0.02)],
    [T(-0.2, 1.62, -0.06), [0.3, 0.12, 0.26], T(0.06, 1.62, -0.01)],
    [T(0.05, 1.94, 0), [0.25, 0.15, 0.23], null],
  ];
  PADS.forEach(([cc, r, from], i) => {
    if (from) tube("dark", [from, mul(add(from, cc), 0.5), [cc[0], cc[1] - 0.03, cc[2]]], [0.035, 0.028, 0.022], 6);
    blob("pine", cc, r, { nu: 16, nv: 7, rotY: i * 0.8, lump: 0.12, seed: i * 1.9, flat: 0.55 });
  });

  // ---------- shishi-odoshi ----------
  const PX = 0.85, PZ = -0.95, PY = 0.5, ML = 0.4;
  for (const dz of [-0.065, 0.065]) {
    tube("bamboo", [[PX, GY - 0.01, PZ + dz], [PX, PY + 0.07, PZ + dz]], 0.022, 8);
    tube("dark", [[PX, 0.27, PZ + dz], [PX, 0.282, PZ + dz]], 0.025, 8);
  }
  tube("dark", [[PX, PY, PZ - 0.095], [PX, PY, PZ + 0.095]], 0.008, 5); // the pin
  // spout post and pipe
  const SX = PX + 0.37, SY = 0.785;
  tube("bamboo", [[PX + 0.62, GY - 0.01, PZ], [PX + 0.62, 0.9, PZ]], 0.034, 8);
  tube("dark", [[PX + 0.62, 0.5, PZ], [PX + 0.62, 0.512, PZ]], 0.037, 8);
  tube("bamboo", [[PX + 0.64, 0.8, PZ], [SX, SY, PZ]], 0.017, 7);
  loft("dark", [ringAt([SX - 0.0015, SY, PZ], [-1, 0, 0], 0.011, 7), ringAt([SX - 0.002, SY, PZ], [-1, 0, 0], 0.001, 7)]);
  // striker and basin stones
  blob("stone", [PX - 0.25, GY, PZ], [0.11, 0.3, 0.1], { nu: 10, nv: 6, lump: 0.1, seed: 7, flat: 0.2 });
  const BX = PX + 0.36, BWY = 0.19;
  lathe("stone", [[0.15, GY - 0.01], [0.18, 0.1], [0.165, 0.2], [0.12, 0.2], [0.11, 0.175], [0, 0.175]], 14, BX, PZ);
  for (let i = 0; i < 14; i++) {
    const a0 = (i / 14) * TAU, a1 = ((i + 1) / 14) * TAU;
    tri("water", [BX, BWY, PZ], [BX + 0.116 * Math.cos(a0), BWY, PZ + 0.116 * Math.sin(a0)], [BX + 0.116 * Math.cos(a1), BWY, PZ + 0.116 * Math.sin(a1)], [BX, -1, PZ]);
  }
  // the stream: a thin prism under the spout, its bottom ring rewritten by pose()
  const streamStart = S("water").p.length / 3;
  loft("water", [ring(5, 0.006, SY - 0.01, 0, SX - 0.004, PZ), ring(5, 0.006, 0.6, 0, SX - 0.004, PZ)]);
  const streamEnd = S("water").p.length / 3;
  // the tube (joint): back end x -0.28, slanted mouth x 0.40 - 0.045 sin(phi) (open upward), radius 0.04
  const tubeJ = new THREE.Group();
  tubeJ.name = "tube";
  tubeJ.position.set(PX, PY, PZ);
  joints.tube = tubeJ;
  garden.add(tubeJ);
  const TR = 0.04, tRing = (x, r = TR, mouth = false) => Array.from({ length: 12 }, (_, i) => {
    const f = (i / 12) * TAU, y = r * Math.sin(f), z = r * Math.cos(f);
    return [mouth ? ML - 0.045 * Math.sin(f) : x, y, z];
  });
  loft("tube", [tRing(-0.28), tRing(-0.1), tRing(0.12), tRing(0.3), tRing(0, TR, true)], { smooth: true });
  for (const x of [-0.13, 0.15]) loft("tubeDark", [tRing(x - 0.006, TR + 0.003), tRing(x + 0.006, TR + 0.003)], { smooth: true });
  { // the dark hollow on the mouth's cut face
    const m = tRing(0, TR, true), cc = mean(m), nn = nrm(cross(sub(m[3], m[0]), sub(m[6], m[0])));
    const out = dot(nn, [1, 0.5, 0]) > 0 ? nn : mul(nn, -1);
    const h = m.map((q) => add(add(cc, mul(sub(q, cc), 0.78)), mul(out, 0.0015)));
    for (let i = 0; i < 12; i++) tri("tubeDark", add(cc, mul(out, 0.0015)), h[i], h[(i + 1) % 12], sub(cc, out));
  }

  // ---------- koi (built at the origin, head +z; pose() places them) ----------
  const KS = [[0, 0.012, 0.014], [0.15, 0.022, 0.024], [0.35, 0.04, 0.04], [0.55, 0.05, 0.046], [0.75, 0.047, 0.041],
    [0.88, 0.037, 0.032], [0.96, 0.022, 0.018], [1, 0.001, 0.001]];
  const KZ0 = -0.13, KLEN = 0.31, KTOP = 0.182, KSC = 1.3; // body z range, nose z (authored), scale to a 0.56 m koi
  const grow = (k, st) => { const a = S(k).p; for (let i = st * 3; i < a.length; i++) a[i] *= KSC; };
  const kh = (z) => { const s = (z - KZ0) / KLEN; let i = 0; while (i < KS.length - 2 && KS[i + 1][0] < s) i++; const [s0, , h0] = KS[i], [s1, , h1] = KS[i + 1]; return h0 + ((h1 - h0) * (s - s0)) / (s1 - s0); };
  const KOIK = [];
  function koiBody(k) {
    const st = S(k).p.length / 3;
    const R = KS.map(([s, w, h]) => Array.from({ length: 8 }, (_, i) => { const f = (i / 8) * TAU; return [w * Math.cos(f), h * Math.sin(f) * (Math.sin(f) < 0 ? 0.45 : 1), KZ0 + s * KLEN]; }));
    const Nr = KS.map(([, w, h]) => Array.from({ length: 8 }, (_, i) => { const f = (i / 8) * TAU; return nrm([Math.cos(f) / w, Math.sin(f) / (h * (Math.sin(f) < 0 ? 0.45 : 1)), 0]); }));
    for (let j = 0; j < R.length - 1; j++)
      for (let i = 0; i < 8; i++) {
        const i2 = (i + 1) % 8;
        const nose = j === R.length - 2, nN = [0, 0, 1];
        triS(k, R[j][i], R[j][i2], R[j + 1][i2], Nr[j][i], Nr[j][i2], nose ? nN : Nr[j + 1][i2]);
        triS(k, R[j][i], R[j + 1][i2], R[j + 1][i], Nr[j][i], nose ? nN : Nr[j + 1][i2], nose ? nN : Nr[j + 1][i]);
      }
    for (let i = 0; i < 8; i++) tri(k, [0, 0, KZ0], R[0][i], R[0][(i + 1) % 8], [0, 0, KZ0 + 0.05]);
    // horizontal fan tail and pectoral fins, thin slabs floating at the waterline
    const slab = (pts, y0, y1) => loft(k, [pts.map(([x, z]) => [x, y0, z]), pts.map(([x, z]) => [x, y1, z])]);
    slab([[0, -0.115], [0.014, -0.125], [0.062, -0.235], [0.03, -0.225], [0, -0.205], [-0.03, -0.225], [-0.062, -0.235], [-0.014, -0.125]], 0.011, 0.017);
    for (const s of [-1, 1]) slab([[s * 0.025, 0.085], [s * 0.088, 0.03], [s * 0.07, 0.022], [s * 0.025, 0.05]], 0.016, 0.021);
    grow(k, st);
    return [st, S(k).p.length / 3];
  }
  function koiSpots(k) {
    const st = S(k).p.length / 3;
    for (const [x, z, rx, rz] of [[0.004, 0.11, 0.03, 0.045], [0.014, 0.0, 0.032, 0.05], [-0.012, -0.075, 0.022, 0.035]])
      blob(k, [x, 0, z], [rx, kh(z) + 0.003, rz], { nu: 10, nv: 6, flat: 0.4 });
    grow(k, st);
    return [st, S(k).p.length / 3];
  }
  const KTYPE = ["koiOrange", "koiSpotted", "koiWhite"];
  for (let i = 0; i < nKoi; i++) {
    const type = KTYPE[i % 3], parts = [];
    if (type === "koiOrange") parts.push(["koiOrange", koiBody("koiOrange")]);
    else parts.push(["koiWhite", koiBody("koiWhite")]);
    if (type === "koiSpotted") parts.push(["koiSpot", koiSpots("koiSpot")]);
    KOIK.push({ path: i % 3, phase: Math.floor(i / 3) * 0.5, parts });
  }

  // ---------- meshes ----------
  const MAT = {
    gravel: [c.gravel, c.gravelShade, 0.1, 3], rake: [c.rake, c.rake, -1, 0], water: [c.water, c.water, -1, 1.2],
    stone: [c.stone, c.stoneShade, 0.2, 3], kerb: [c.kerb, c.kerbShade, 0.2, 3], wood: [c.wood, c.woodShade, 0.25, 3], pine: [c.pine, c.pineShade, 0.3, 3.5],
    dark: [c.dark, c.dark, -1, 2.5], moss: [c.moss, c.mossShade, 0.15, 3], bamboo: [c.bamboo, c.bambooShade, 0.2, 2.5],
    tube: [c.bamboo, c.bambooShade, 0.2, 2.5], tubeDark: [c.dark, c.dark, -1, 2],
    koiOrange: [c.koiOrange, c.koiOrangeShade, 0.3, 2], koiWhite: [c.koiWhite, c.koiWhiteShade, 0.2, 2], koiSpot: [c.koiSpot, c.koiSpot, -1, 0],
  };
  const meshes = {};
  for (const [key, { p, n }] of Object.entries(soups)) {
    const [b, s, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, b, s, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    (key.startsWith("tube") ? tubeJ : garden).add(mesh);
    meshes[key] = mesh;
    if (key.startsWith("koi") || key === "water") {
      kit.hullNormals(g);
      mesh.frustumCulled = false;
      mesh.userData.base = { p: Float32Array.from(p), n: Float32Array.from(n), h: g.attributes.hullNormal ? Float32Array.from(g.attributes.hullNormal.array) : null };
    }
  }

  // ---------- motion ----------
  const CLIPS = { tock: 10 };
  const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  const cl = (u) => Math.min(1, Math.max(0, u));
  // tube angle (deg, + = mouth up) over the 10 s cycle
  function tubeAngle(t) {
    if (t < 7.4) return 22 - 9 * (t / 7.4) ** 2;
    if (t < 7.9) return 13 - 48 * cl((t - 7.4) / 0.5) ** 2;
    if (t < 8.4) return -35 - 2 * Math.sin(Math.PI * cl((t - 7.9) / 0.5));
    if (t < 8.75) return -35 + 57 * cl((t - 8.4) / 0.35) ** 2;
    if (t < 9.05) return 22 - 7 * Math.sin(Math.PI * cl((t - 8.75) / 0.3));
    if (t < 9.3) return 22 - 2 * Math.sin(Math.PI * cl((t - 9.05) / 0.25));
    return 22;
  }
  // koi paths in pond coordinates (u, v), one lap per clip: [point(ph), tail beats per clip]
  const PATHS = [
    [(ph) => { const t = TAU * ph; return [0.82 * pr(t) * Math.cos(t), 0.82 * pr(t) * Math.sin(t)]; }, 16],
    [(ph) => { const t = -TAU * ph - 1.3; return [0.47 + 0.2 * Math.cos(t), 0.16 * Math.sin(t)]; }, 10],
    [(ph) => { const t = TAU * ph + 2.5; return [-0.47 + 0.17 * Math.cos(t), 0.15 * Math.sin(t)]; }, 10],
  ];
  function rewrite(key, ranges) {
    const m = meshes[key], g = m.geometry, B = m.userData.base, P3 = g.attributes.position.array, N3 = g.attributes.normal.array, H = g.attributes.hullNormal?.array;
    for (const [s, e, f] of ranges) for (let v = s; v < e; v++) f(v, B, P3, N3, H);
    g.attributes.position.needsUpdate = g.attributes.normal.needsUpdate = true;
    if (H) g.attributes.hullNormal.needsUpdate = true;
    g.computeBoundingSphere(), g.computeBoundingBox();
  }
  function koiAt(t) {
    const byKey = {};
    for (const K of KOIK) {
      const [fn, beats] = PATHS[K.path], ph = t / CLIPS.tock + K.phase;
      const [u, v] = fn(ph), [u2, v2] = fn(ph + 0.002);
      const [wx, wz] = L2W(u, v), [wx2, wz2] = L2W(u2, v2);
      const psi = Math.atan2(wx2 - wx, wz2 - wz), cp = Math.cos(psi), sp = Math.sin(psi);
      const om = TAU * beats * (t / CLIPS.tock), ky = WY - 0.005 + 0.003 * Math.sin(TAU * (t / CLIPS.tock) * 3 + K.path);
      const f = (vi, B, P3, N3, H) => {
        const i = vi * 3, x = B.p[i], y = B.p[i + 1], z = B.p[i + 2], KL = 0.42 * KSC, KW = 0.5 * KSC, AMP = 0.028 * KSC;
        const q = Math.max(0, KTOP * KSC - z) / KL, phs = om - (TAU / KW) * (KTOP * KSC - z), a = q * q * AMP;
        const bx = a * Math.sin(phs), db = AMP * (-2 * q / KL) * Math.sin(phs) + a * (TAU / KW) * Math.cos(phs);
        const be = Math.atan(db), cb = Math.cos(be), sb = Math.sin(be);
        const lx = x + bx;
        P3[i] = wx + lx * cp + z * sp, P3[i + 1] = ky + y, P3[i + 2] = wz - lx * sp + z * cp;
        for (const [src, dst] of [[B.n, N3], [B.h, H]]) {
          if (!src || !dst) continue;
          const nx = src[i] * cb + src[i + 2] * sb, nz = -src[i] * sb + src[i + 2] * cb;
          dst[i] = nx * cp + nz * sp, dst[i + 1] = src[i + 1], dst[i + 2] = -nx * sp + nz * cp;
        }
      };
      for (const [key, [s, e]] of K.parts) (byKey[key] ??= []).push([s, e, f]);
    }
    for (const [key, ranges] of Object.entries(byKey)) rewrite(key, ranges);
  }
  function apply(t) {
    t = ((t % CLIPS.tock) + CLIPS.tock) % CLIPS.tock;
    const th = tubeAngle(t) * D;
    tubeJ.rotation.set(0, 0, th);
    // stream bottom: on the tube axis under the spout while the mouth is there, else the basin water
    const dd = (SX - 0.004 - PX) / Math.cos(th), yb = dd < ML - 0.005 ? PY + dd * Math.tan(th) : BWY;
    rewrite("water", [[streamStart, streamEnd, (v, B, P3) => { if (B.p[v * 3 + 1] < 0.7) P3[v * 3 + 1] = yb; }]]);
    if (KOIK.length) koiAt(t);
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`koi-garden: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      return apply(+m[2]);
    }
    if (name !== "rest") throw new Error(`koi-garden: unknown pose "${name}" (rest, or tock@<seconds>)`);
    apply(0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
