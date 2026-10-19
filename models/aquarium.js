// aquarium.js - the aquarium of the anime date scene: a big viewing window into a deep blue tank, built as a cutaway
// set. Behind the glass, rock heaps with coral, golden kelp, a circling school of small silver fish and a manta
// gliding overhead; on the visitor side, a dark carpeted floor with pools of tank light, a backless bench facing the
// glass and a small blank info plaque beside the window.
// Contract: harness/lab/README.md. Meters, +Y up, the set faces +Z (the visitors look -Z into the tank), its left is
// +X, stands on y = 0, centred on x = 0 (z runs -2.8 tank back .. +2.6 visitor floor edge).
//
// Construction (boxes, lat-long ellipsoids, tubes and lofted sheets as triangle soups merged per material, so the
// whole set is 14 meshes at any fish count; every triangle is wound away from a point inside its solid, never by
// hand):
//   ROOM    a slice of the gallery, no ceiling or side walls: a dark floor slab under a carpet layer, a thick dark
//           facade wall with the window opening, a dark plinth under the tank and dark rim beams along its edges.
//   WATER   suggested by its walls, not drawn as a volume (no transparency): the tank's back, side, floor and surface
//           slabs are deep blue on both faces, so from outside the tank reads as a cut block of water (pale ripples
//           on the surface). The surface also stops a low camera seeing over the back wall through the window.
//           Light shafts (pale slanted tapers, no hull) fall down the back wall from the surface.
//   GLASS   a pale frame around the opening and slanted glint streaks (line colour, no hull) on the glass plane.
//   TANK    lumpy rock heaps (hashed ellipsoids, flat bottoms) left, right and back; orange branching coral and
//           pink brain domes and fans on them.
//   MOVING  three meshes whose vertices pose() rewrites each frame from the clip time (plain Mesh, no morphs):
//           fish (every fish of the school: a laterally flat ellipsoid body and a forked tail that wags), kelp
//           (every strand: a flat leafy ribbon that bends more toward its tip) and the manta (a lofted diamond with
//           a thin tail and two head fins, wings flapping at the tips). Each vertex stores its rest position in its
//           part's frame plus the part index, so the school stays one draw call however many fish there are.
// Proportions (real size; base unit the window height W = 2.5 m): set 6.0 wide x 3.3 high (facade). Window
//   5.0 x 2.5 with its sill 0.35 up; facade 0.25 thick. Tank 5.0 wide x 2.7 deep, water 0.3-3.22. Bench 1.8 x 0.4,
//   seat 0.46 up, 1.2 from the glass. Plaque 0.30 x 0.22 on the +X facade margin, 1.25 up. Fish 0.24-0.3 long;
//   manta span 1.6, body 0.74 long plus a 0.6 tail; kelp 1.6-2.4 tall.
// Options: build(THREE, kit, colors, { height, fish }).
//   height  scales everything so the facade top is `height` (default 3.3 m).
//   fish    fish in the school, 0..80 (default 40).
// Clips: swim (12 s, seamless loop): the school circles once around its centre, each fish bobbing and wagging; the
//   kelp sways twice; the manta glides once round an ellipse over the school, flapping three times, banking, and
//   climbing toward the glass on the +X side so its pale belly faces the visitors (that is its pose at t = 0).
// Budget: ~8.3k triangles at fish 40 (a fish 76; ~11.4k at fish 80), 14 meshes (13 at fish 0).
// Colours (indigo): dark (floor slab, facade, plinth, rims, rocks, plaque frame) hair #16141c / sky #1b2d6b, threshold
//   0.2 so camera-facing fronts stay dark; bench moon #d5e2ff / sky (tank-lit, so it reads on the dark carpet and
//   wall); water sky flat; carpet sky flat with light pools and surface ripples moon flat (no hull);
//   shafts moon flat (no hull); frame line #e7eefc / moon; glints line flat (no hull); plaque sclera #f6f3ee / moon;
//   coral A iris #e7a04a / accent #e23b4a; coral B skin #f0c2ae / iris; kelp practical #f0c36a / iris; fish
//   sclera / moon (thin hull); manta hair / moon (dark back, pale belly: the belly is the shaded side).

export const meta = {
  name: "aquarium",
  height: 3.3,
  script: "indigo",
  colors: {
    dark: "#16141c", darkShade: "#1b2d6b",
    water: "#1b2d6b",
    carpet: "#1b2d6b",
    pool: "#d5e2ff",
    shaft: "#d5e2ff",
    frame: "#e7eefc", frameShade: "#d5e2ff",
    glint: "#e7eefc",
    plaque: "#f6f3ee", plaqueShade: "#d5e2ff",
    coralA: "#e7a04a", coralAShade: "#e23b4a",
    coralB: "#f0c2ae", coralBShade: "#e7a04a",
    bench: "#d5e2ff", benchShade: "#1b2d6b",
    kelp: "#f0c36a", kelpShade: "#e7a04a",
    fish: "#f6f3ee", fishShade: "#d5e2ff",
    manta: "#16141c", mantaShade: "#d5e2ff",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const NATURAL = 3.3;
  const { height = NATURAL } = opts;
  const FISH = Math.max(0, Math.min(80, Math.round(opts.fish ?? 40)));
  const TAU = Math.PI * 2;
  const root = new THREE.Group();
  root.name = "aquarium";
  const body = new THREE.Group();
  body.name = "set";
  body.scale.setScalar(height / NATURAL);
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
  const S = (key) => (soups[key] ??= { p: [], n: [], o: [], e: [] });
  let owner = -1, aux = 0; // moving soups: owner = part index, aux = per-vertex weight (computed by the caller)
  let auxOf = null;        // optional (point) -> aux
  function tri(key, a, b, e, ref, na, nb, ne) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const flip = dot(n, sub(mul(add(add(a, b), e), 1 / 3), ref)) < 0;
    n = nrm(flip ? mul(n, -1) : n);
    const s = S(key);
    const vs = flip ? [[a, na], [e, ne], [b, nb]] : [[a, na], [b, nb], [e, ne]];
    for (const [q, nq] of vs) s.p.push(...q), s.n.push(...(nq ?? n)), s.o.push(owner), s.e.push(auxOf ? auxOf(q) : aux);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function box(key, x0, x1, y0, y1, z0, z1) {
    const p = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    const ref = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  // ellipsoid: centre C, radii R, optional radial jitter j(k, i) and floor clamp; smooth normals unless jittered
  function ellipsoid(key, C, R, seg = 10, rings = 6, jit = null, floor = -Infinity) {
    const pt = (k, i) => {
      const th = (k / rings) * Math.PI, ph = ((i % seg) / seg) * TAU;
      const u = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
      const f = jit && k > 0 && k < rings ? jit(k, i % seg) : 1;
      const p = [C[0] + u[0] * R[0] * f, Math.max(floor, C[1] + u[1] * R[1] * f), C[2] + u[2] * R[2] * f];
      return [p, jit ? undefined : nrm([u[0] / R[0], u[1] / R[1], u[2] / R[2]])];
    };
    for (let k = 0; k < rings; k++)
      for (let i = 0; i < seg; i++) {
        const [a, b, e, d] = [pt(k, i), pt(k, i + 1), pt(k + 1, i + 1), pt(k + 1, i)];
        if (k > 0) tri(key, a[0], b[0], e[0], C, a[1], b[1], e[1]);
        if (k < rings - 1) tri(key, a[0], e[0], d[0], C, a[1], e[1], d[1]);
      }
  }
  // tube through points with per-point radius (number or [rx, ry] in the ring's frame), closed cone ends
  function tube(key, pts, rad, seg = 6, up = [0, 0, 1]) {
    const rings = pts.map((P, i) => {
      const T = nrm(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
      const t = nrm(cross(T, Math.abs(dot(T, up)) < 0.9 ? up : [1, 0, 0])), s = cross(T, t);
      const r = typeof rad === "function" ? rad(i) : rad;
      const [ra, rb] = Array.isArray(r) ? r : [r, r];
      return Array.from({ length: seg }, (_, j) => {
        const a = (j / seg) * TAU;
        return [add(P, add(mul(t, ra * Math.cos(a)), mul(s, rb * Math.sin(a)))), nrm(add(mul(t, Math.cos(a) / ra), mul(s, Math.sin(a) / rb)))];
      });
    });
    for (let i = 0; i < rings.length - 1; i++)
      for (let j = 0; j < seg; j++) {
        const [a, b, e, d] = [rings[i][j], rings[i][(j + 1) % seg], rings[i + 1][(j + 1) % seg], rings[i + 1][j]];
        const ref = mul(add(pts[i], pts[i + 1]), 0.5);
        tri(key, a[0], b[0], e[0], ref, a[1], b[1], e[1]);
        tri(key, a[0], e[0], d[0], ref, a[1], e[1], d[1]);
      }
    for (const [k, dir] of [[0, -1], [rings.length - 1, 1]]) {
      const P = pts[k], T = nrm(sub(pts[Math.min(k + 1, pts.length - 1)], pts[Math.max(k - 1, 0)]));
      const r = typeof rad === "function" ? rad(k) : rad, rr = Array.isArray(r) ? Math.min(...r) : r;
      const tip = add(P, mul(T, dir * rr * 0.8));
      for (let j = 0; j < seg; j++) tri(key, rings[k][j][0], rings[k][(j + 1) % seg][0], tip, sub(P, mul(T, dir * rr)));
    }
  }
  const hash = (i) => {
    let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  // ---------- room ----------
  const HX = 3.0, WX = 2.5, SILL = 0.35, TOPW = 2.85, FZ = 0.25, TOP = 3.3;
  const TB = -2.8, TF = 0.0, TY0 = 0.3, TY1 = 3.22;       // tank box: back z, front z, floor y, water top
  box("dark", -HX, HX, 0, 0.05, FZ, 2.6);                 // visitor floor slab
  box("carpet", -HX + 0.02, HX - 0.02, 0.05, 0.065, FZ, 2.58);
  box("dark", -HX, HX, 0, SILL, 0, FZ);                   // facade below the window
  box("dark", -HX, HX, TOPW, TOP, 0, FZ);                 // above
  box("dark", -HX, -WX, SILL, TOPW, 0, FZ);               // sides
  box("dark", WX, HX, SILL, TOPW, 0, FZ);
  box("dark", -WX - 0.1, WX + 0.1, 0, TY0, TB, TF);       // tank plinth
  // rim beams on the open tank's top edges and down its back corners
  box("dark", -WX - 0.1, WX + 0.1, TY1, TY1 + 0.08, TB, TB + 0.1);
  for (const s of [-1, 1]) {
    box("dark", s > 0 ? WX : -WX - 0.1, s > 0 ? WX + 0.1 : -WX, TY1, TY1 + 0.08, TB, TF);
    box("dark", s > 0 ? WX : -WX - 0.1, s > 0 ? WX + 0.1 : -WX, TY0, TY1, TB, TB + 0.1);
  }
  // water: back, sides, floor slabs
  box("water", -WX, WX, TY0, TY1, TB + 0.1, TB + 0.12);
  for (const s of [-1, 1]) box("water", s > 0 ? WX : -WX - 0.1, s > 0 ? WX + 0.1 : -WX, TY0, TY1, TB + 0.1, TF);
  box("water", -WX, WX, TY0, TY0 + 0.02, TB + 0.12, TF);
  box("water", -WX, WX, TY1 - 0.02, TY1, TB + 0.12, TF);  // the surface, so a low camera never sees over the back wall
  // ripples on the surface, seen from above (flat, no hull)
  for (let r = 0; r < 9; r++) {
    const z = TB + 0.4 + r * 0.27, x0 = -WX + 0.2 + hash(r * 3 + 1) * 2.4, x1 = Math.min(WX - 0.2, x0 + 1.0 + hash(r * 3 + 2) * 1.6), y = TY1 + 0.003;
    const wv = (x) => z + 0.05 * Math.sin(x * 4 + r);
    for (let i = 0; i < 8; i++) {
      const a = x0 + ((x1 - x0) * i) / 8, b = x0 + ((x1 - x0) * (i + 1)) / 8, hw = 0.025 * Math.sin((Math.PI * (i + 0.5)) / 8);
      quad("pool", [a, y, wv(a) - hw], [b, y, wv(b) - hw], [b, y, wv(b) + hw], [a, y, wv(a) + hw], [0, y - 1, z]);
    }
  }
  // light shafts down the back wall: slanted tapers from the surface (no hull)
  const zs = TB + 0.125;
  for (const [x, w, len, sl] of [[-1.9, 0.22, 1.7, 0.5], [-1.15, 0.1, 1.3, 0.4], [-0.3, 0.32, 2.0, 0.6], [0.55, 0.12, 1.4, 0.45], [1.35, 0.26, 1.8, 0.55], [2.0, 0.09, 1.1, 0.35]]) {
    const y0 = TY1 - 0.02, y1 = TY1 - 0.3 - len;
    tri("shaft", [x - w / 2, y0, zs], [x + w / 2, y0, zs], [x + sl + w * 0.08, y1, zs], [0, 0, zs - 1]);
  }
  // window frame (pale), proud of the facade front
  const FW = 0.08, FR = FZ + 0.04;
  box("frame", -WX - FW, WX + FW, SILL - FW, SILL, FZ - 0.02, FR);
  box("frame", -WX - FW, WX + FW, TOPW, TOPW + FW, FZ - 0.02, FR);
  box("frame", -WX - FW, -WX, SILL, TOPW, FZ - 0.02, FR);
  box("frame", WX, WX + FW, SILL, TOPW, FZ - 0.02, FR);
  // glints on the glass plane
  const zg = FZ - 0.03;
  const glint = (u0, w, v0, v1, sl) => quad("glint", [u0, v0, zg], [u0 + w, v0, zg], [u0 + w + sl, v1, zg], [u0 + sl, v1, zg], [0, 1.5, zg - 1]);
  glint(-2.2, 0.12, 1.75, 2.65, 0.4);
  glint(-1.95, 0.04, 1.95, 2.55, 0.26);
  glint(1.55, 0.1, 0.55, 1.35, 0.36);
  glint(1.8, 0.035, 0.7, 1.2, 0.2);
  // plaque on the +X facade margin: dark frame, pale blank face
  box("dark", 2.58, 2.92, 1.12, 1.38, FZ, FZ + 0.03);
  box("plaque", 2.6, 2.9, 1.14, 1.36, FZ + 0.03, FZ + 0.04);
  // light pools on the carpet: wavy patches thrown by the tank (flat, no hull)
  for (const [x, z, rx, rz, k] of [[-1.6, 0.75, 0.55, 0.22, 1], [0.1, 0.95, 0.75, 0.26, 2], [1.7, 0.7, 0.5, 0.2, 3], [-0.7, 1.95, 0.4, 0.14, 4], [1.0, 2.1, 0.45, 0.15, 5]]) {
    const seg = 14, y = 0.067;
    for (let i = 0; i < seg; i++) {
      const r = (j) => 1 + 0.18 * Math.sin(j * 3 + k) + 0.1 * Math.cos(j * 5 + k * 2);
      const a0 = (i / seg) * TAU, a1 = ((i + 1) / seg) * TAU;
      tri("pool", [x, y, z], [x + rx * r(i) * Math.cos(a0), y, z + rz * r(i) * Math.sin(a0)], [x + rx * r(i + 1) * Math.cos(a1), y, z + rz * r(i + 1) * Math.sin(a1)], [x, y - 1, z]);
    }
  }
  // bench: backless, two slab legs, facing the glass
  const BZ0 = 1.45, BZ1 = 1.85;
  box("bench", -0.9, 0.9, 0.36, 0.46, BZ0, BZ1);
  for (const s of [-1, 1]) box("bench", s * 0.66 - 0.05, s * 0.66 + 0.05, 0.065, 0.36, BZ0 + 0.05, BZ1 - 0.05);
  box("bench", -0.66, 0.66, 0.16, 0.21, BZ0 + 0.17, BZ1 - 0.17);

  // ---------- tank floor: rocks and coral ----------
  const FY = TY0 + 0.02;
  const ROCKS = [
    [-2.0, 0.55, -1.9, 0.55, 0.5], [-1.45, 0.3, -2.3, 0.4, 0.42], [-2.15, 0.25, -0.9, 0.35, 0.3], [-1.0, 0.18, -2.4, 0.3, 0.25],
    [1.85, 0.62, -2.1, 0.6, 0.5], [1.25, 0.32, -2.45, 0.42, 0.3], [2.1, 0.3, -1.1, 0.35, 0.4], [0.3, 0.22, -2.45, 0.5, 0.25],
    [-0.45, 0.12, -1.0, 0.28, 0.2], [0.9, 0.1, -0.7, 0.22, 0.16],
  ];
  ROCKS.forEach(([x, h, z, rx, rz], k) => {
    const jit = (a, b) => 0.82 + 0.3 * hash(k * 97 + a * 13 + b);
    ellipsoid("dark", [x, FY, z], [rx, h * 1.6, rz], 9, 6, jit, FY);
  });
  // branching coral (coral A) on the rock heaps
  const branch = (x, y, z, s, k) => {
    const pts = (dx, dz, n) => Array.from({ length: n }, (_, i) => {
      const u = i / (n - 1);
      return [x + dx * u * s + 0.03 * Math.sin(u * 5 + k), y + u * 0.42 * s, z + dz * u * s];
    });
    tube("coralA", pts(0, 0, 4), (i) => 0.035 * s * (1 - i * 0.15), 6);
    for (const [dx, dz, j] of [[0.22, 0.05, 1], [-0.2, 0.08, 2], [0.06, -0.2, 3]]) {
      const b0 = [x, y + 0.14 * s * j * 0.6, z];
      const bp = Array.from({ length: 4 }, (_, i) => {
        const u = i / 3;
        return [b0[0] + dx * s * u, b0[1] + (0.3 - 0.04 * j) * s * Math.sqrt(u), b0[2] + dz * s * u];
      });
      tube("coralA", bp, (i) => 0.026 * s * (1 - i * 0.18), 5);
    }
  };
  branch(-1.85, FY + 0.65, -1.75, 1.0, 1);
  branch(-1.35, FY + 0.35, -2.1, 0.8, 2);
  branch(1.7, FY + 0.75, -1.9, 1.1, 3);
  branch(2.05, FY + 0.32, -0.95, 0.75, 4);
  branch(0.35, FY + 0.25, -2.35, 0.7, 5);
  // brain domes and fans (coral B)
  for (const [x, y, z, r] of [[-2.15, 0.3, -0.75, 0.16], [1.2, 0.36, -2.3, 0.18], [-0.45, 0.14, -0.95, 0.13], [0.95, 0.1, -0.62, 0.11], [2.25, 0.36, -1.35, 0.14]])
    ellipsoid("coralB", [x, FY + y, z], [r, r * 0.7, r], 10, 5, null, FY + y - r * 0.3);
  for (const [x, y, z, w, h, yaw] of [[-1.55, 0.5, -2.35, 0.36, 0.42, 0.3], [1.45, 0.6, -2.55, 0.42, 0.5, -0.2], [-0.95, 0.2, -2.5, 0.28, 0.32, 0.1]]) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const R = (lx, ly, lz) => [x + lx * cy + lz * sy, FY + y + ly, z - lx * sy + lz * cy];
    const C = R(0, h * 0.5, 0);
    const seg = 12;
    const rim = (i, d) => { const a = Math.PI * (i / seg); return R(-Math.cos(a) * w, Math.sin(a) * h + 0.02, d); };
    for (let i = 0; i < seg; i++) {
      tri("coralB", rim(i, 0.015), rim(i + 1, 0.015), R(0, 0.02, 0.015), C);
      tri("coralB", rim(i, -0.015), rim(i + 1, -0.015), R(0, 0.02, -0.015), C);
      quad("coralB", rim(i, 0.015), rim(i + 1, 0.015), rim(i + 1, -0.015), rim(i, -0.015), C);
    }
    quad("coralB", rim(0, 0.015), rim(seg, 0.015), rim(seg, -0.015), rim(0, -0.015), C);
    tube("coralB", [R(0, -0.05, 0), R(0, 0.06, 0)], 0.025, 5);
  }

  // ---------- kelp (one mesh): owner = strand, aux = height fraction ----------
  const KELP = [
    [-2.1, -2.4, 2.35], [-1.7, -2.45, 2.1], [-2.15, -1.4, 1.7], [-0.6, -2.45, 2.3], [-0.15, -2.35, 1.6],
    [1.05, -2.45, 2.25], [2.05, -2.4, 2.4], [2.15, -1.65, 1.9], [1.6, -2.5, 1.75], [-1.2, -2.45, 1.9],
  ];
  const kelpBase = [];
  KELP.forEach(([x, z, H], k) => {
    owner = k;
    kelpBase.push([x, FY, z, H]);
    const n = 16, yaw = hash(k * 7 + 3) * Math.PI;
    const pts = Array.from({ length: n }, (_, i) => {
      const u = i / (n - 1);
      return [0.03 * Math.sin(u * 9 + k), u * H, 0.03 * Math.cos(u * 7 + k)];
    });
    auxOf = (q) => Math.max(0, q[1]) / H;
    const wv = (i) => {
      const u = i / (n - 1);
      return [(0.035 + 0.05 * Math.abs(Math.sin(u * 11 + k))) * (1 - 0.5 * u) + 0.012, 0.012];
    };
    tube("kelp", pts, wv, 6, [Math.cos(yaw), 0, Math.sin(yaw)]);
    auxOf = null;
  });
  owner = -1;

  // ---------- fish school (one mesh): owner = fish, aux = 1 on the tail ----------
  const SCHOOL = { x: -0.75, y: 1.45, z: -1.45, rx: 0.95, rz: 0.6 };
  const fishP = [];
  for (let i = 0; i < FISH; i++) {
    owner = i;
    const h = (u) => hash(i * 31 + u + 101);
    fishP.push({ th: (i / Math.max(1, FISH)) * TAU + (h(1) - 0.5) * 0.5, s: 0.72 + 0.5 * h(2), dy: (h(3) - 0.5) * 0.8, ph: h(4) * TAU, k: 1.1 + 0.25 * h(5) });
    const L = 0.085 * fishP[i].k;
    aux = 0;
    ellipsoid("fish", [0, 0, 0], [0.02 * fishP[i].k, 0.034 * fishP[i].k, L], 8, 5);
    aux = 1;
    const tz = -L * 0.85, tl = 0.07 * fishP[i].k, th = 0.045 * fishP[i].k, d = 0.006;
    const A = [0, 0, tz], B = [0, th, tz - tl], C2 = [0, 0, tz - tl * 0.6], D = [0, -th, tz - tl];
    for (const [p, q] of [[A, B], [B, C2], [C2, D], [D, A]]) {
      const ref = [0, 0, tz - tl * 0.5];
      quad("fish", add(p, [d, 0, 0]), add(q, [d, 0, 0]), add(q, [-d, 0, 0]), add(p, [-d, 0, 0]), ref);
    }
    tri("fish", add(A, [d, 0, 0]), add(B, [d, 0, 0]), add(C2, [d, 0, 0]), [-1, 0, tz - tl * 0.5]);
    tri("fish", add(A, [d, 0, 0]), add(C2, [d, 0, 0]), add(D, [d, 0, 0]), [-1, 0, tz - tl * 0.5]);
    tri("fish", add(A, [-d, 0, 0]), add(B, [-d, 0, 0]), add(C2, [-d, 0, 0]), [1, 0, tz - tl * 0.5]);
    tri("fish", add(A, [-d, 0, 0]), add(C2, [-d, 0, 0]), add(D, [-d, 0, 0]), [1, 0, tz - tl * 0.5]);
  }
  owner = -1, aux = 0;

  // ---------- manta (one mesh): local frame faces +Z, span on X; aux = |u| (wing weight) ----------
  owner = 0;
  {
    const SPAN = 1.6, N = 14, M = 7;
    const lead = (u) => 0.4 - 0.58 * Math.abs(u) ** 1.6;
    const trail = (u) => -0.34 + 0.45 * Math.abs(u) ** 0.7 - 0.33 * Math.abs(u) ** 4;
    const thick = (u, v) => 0.09 * (1 - u * u) ** 1.2 * Math.sin(Math.PI * v) ** 0.8;
    const P = (i, j, side) => {
      const u = -1 + (2 * i) / N, v = j / M;
      const z = lead(u) + (trail(u) - lead(u)) * v;
      return [u * SPAN / 2, side * thick(u, v) * (side > 0 ? 1 : 0.6), z];
    };
    auxOf = (q) => Math.abs(q[0]) / (SPAN / 2);
    for (let i = 0; i < N; i++)
      for (let j = 0; j < M; j++)
        for (const side of [1, -1]) {
          const a = P(i, j, side), b = P(i + 1, j, side), e = P(i + 1, j + 1, side), d = P(i, j + 1, side);
          const mid = mul(add(add(a, b), add(e, d)), 0.25);
          const ref = [mid[0], -side * 0.5, mid[2]];
          tri("manta", a, b, e, ref), tri("manta", a, e, d, ref);
        }
    // tail and head fins
    tube("manta", [[0, 0, -0.3], [0, 0.005, -0.62], [0, 0.01, -0.98]], (i) => [0.018 - i * 0.007, 0.012 - i * 0.004], 5, [0, 1, 0]);
    for (const s of [-1, 1]) tube("manta", [[s * 0.12, 0, 0.36], [s * 0.15, -0.02, 0.48], [s * 0.12, -0.04, 0.56]], (i) => [0.022 - i * 0.006, 0.01], 5, [0, 1, 0]);
    auxOf = null;
  }
  owner = -1;

  // ---------- meshes: one per material ----------
  const MAT = {
    dark: [c.dark, c.darkShade, 0.2, 3], water: [c.water, c.water, -1, 3], carpet: [c.carpet, c.carpet, -1, 3],
    pool: [c.pool, c.pool, -1, 0], shaft: [c.shaft, c.shaft, -1, 0], frame: [c.frame, c.frameShade, 0.2, 3],
    glint: [c.glint, c.glint, -1, 0], plaque: [c.plaque, c.plaqueShade, 0.2, 2], bench: [c.bench, c.benchShade, 0.2, 3],
    coralA: [c.coralA, c.coralAShade, 0.25, 2.5], coralB: [c.coralB, c.coralBShade, 0.25, 2.5],
    kelp: [c.kelp, c.kelpShade, 0.2, 2.5], fish: [c.fish, c.fishShade, 0.3, 1.5], manta: [c.manta, c.mantaShade, 0.0, 3],
  };
  const movers = {};
  for (const [key, { p, n, o, e }] of Object.entries(soups)) {
    const [b, s, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, b, s, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    body.add(mesh);
    if (key === "fish" || key === "kelp" || key === "manta") {
      kit.hullNormals(g);
      const hn = g.attributes.hullNormal;
      movers[key] = { g, p: Float32Array.from(p), n: Float32Array.from(n), h: hn ? Float32Array.from(hn.array) : null, o, e };
      if (key === "manta") {
        // vertices sharing a rest position share a normal slot (the top and belly meet at the rim)
        const ids = new Map(), slot = new Int32Array(o.length);
        for (let v = 0; v < o.length; v++) {
          const k = `${Math.round(p[v * 3] * 1e4)},${Math.round(p[v * 3 + 1] * 1e4)},${Math.round(p[v * 3 + 2] * 1e4)}`;
          if (!ids.has(k)) ids.set(k, ids.size);
          slot[v] = ids.get(k);
        }
        Object.assign(movers[key], { slot, acc: new Float32Array(ids.size * 3) });
      }
      mesh.frustumCulled = false;
    }
  }

  // ---------- the clip ----------
  // swim (T s): school angle = th + TAU t/T (counter-clockwise seen from above), bob 2x, tail wag 12x per loop;
  // kelp sway 2x per loop, more at the tip (aux^1.6); manta once round its ellipse clockwise, 3 flaps per loop.
  const T = 12;
  const CLIPS = { swim: T };
  const MANTA = { x: 0.2, y: 2.2, z: -1.4, rx: 1.0, rz: 0.45, rise: 0.25 };
  // write a vertex from local q / normals through yaw (about y), then pitch (about local x), then roll (local z)
  const rot = (v, yaw, pitch, roll) => {
    let [x, y, z] = v;
    [x, y] = [x * Math.cos(roll) - y * Math.sin(roll), x * Math.sin(roll) + y * Math.cos(roll)];
    [y, z] = [y * Math.cos(pitch) - z * Math.sin(pitch), y * Math.sin(pitch) + z * Math.cos(pitch)];
    [x, z] = [x * Math.cos(yaw) + z * Math.sin(yaw), -x * Math.sin(yaw) + z * Math.cos(yaw)];
    return [x, y, z];
  };
  function frame(t) {
    const w = (TAU * (((t % T) + T) % T)) / T; // loop phase 0..TAU
    // fish
    const F = movers.fish;
    if (F) {
      const P3 = F.g.attributes.position.array, N3 = F.g.attributes.normal.array, H3 = F.g.attributes.hullNormal?.array;
      const pose = fishP.map((f) => {
        const a = f.th + w;
        const x = SCHOOL.x + SCHOOL.rx * f.s * Math.cos(a), z = SCHOOL.z - SCHOOL.rz * f.s * Math.sin(a);
        const y = SCHOOL.y + f.dy + 0.07 * Math.sin(2 * w + f.ph);
        // heading: d/da of (cos a, -sin a) -> (-sin a, -cos a)
        const yaw = Math.atan2(-SCHOOL.rx * Math.sin(a), -SCHOOL.rz * Math.cos(a));
        return { x, y, z, yaw, pitch: -0.14 * Math.cos(2 * w + f.ph), wag: 0.45 * Math.sin(12 * w + f.ph * 3) };
      });
      for (let v = 0; v < F.o.length; v++) {
        const f = pose[F.o[v]], i = v * 3;
        let q = [F.p[i], F.p[i + 1], F.p[i + 2]], nn = [F.n[i], F.n[i + 1], F.n[i + 2]];
        if (F.e[v]) q = rot(q, f.wag * Math.min(1, -q[2] / 0.12), 0, 0);
        else if (q[2] < 0) q = rot(q, f.wag * 0.25 * (-q[2] / 0.09), 0, 0);
        const r = rot(q, f.yaw, f.pitch, 0);
        P3[i] = r[0] + f.x, P3[i + 1] = r[1] + f.y, P3[i + 2] = r[2] + f.z;
        nn = rot(nn, f.yaw, f.pitch, 0);
        N3[i] = nn[0], N3[i + 1] = nn[1], N3[i + 2] = nn[2];
        if (H3 && F.h) {
          const hh = rot([F.h[i], F.h[i + 1], F.h[i + 2]], f.yaw, f.pitch, 0);
          H3[i] = hh[0], H3[i + 1] = hh[1], H3[i + 2] = hh[2];
        }
      }
      F.dirty = true;
    }
    // kelp
    const K = movers.kelp;
    if (K) {
      const P3 = K.g.attributes.position.array;
      for (let v = 0; v < K.o.length; v++) {
        const k = K.o[v], i = v * 3, [bx, by, bz, H] = kelpBase[k], u = K.e[v];
        const ph = hash(k * 5 + 11) * TAU, bend = Math.pow(u, 1.6) * H * 0.11;
        const dx = bend * Math.sin(2 * w + ph - 2.2 * u), dz = bend * 0.5 * Math.cos(2 * w + ph - 2.2 * u);
        P3[i] = bx + K.p[i] + dx, P3[i + 1] = by + K.p[i + 1] - Math.abs(dx) * 0.08 * u, P3[i + 2] = bz + K.p[i + 2] + dz;
      }
      K.dirty = true;
    }
    // manta
    const M = movers.manta;
    if (M) {
      const P3 = M.g.attributes.position.array, N3 = M.g.attributes.normal.array, H3 = M.g.attributes.hullNormal?.array;
      const a = -w + 0.15; // clockwise from above; at t = 0 it climbs toward the glass on the +X side
      const x = MANTA.x + MANTA.rx * Math.cos(a), z = MANTA.z - MANTA.rz * Math.sin(a), y = MANTA.y - MANTA.rise * Math.sin(a);
      // heading = d/dt of the path with a decreasing: -(d/da)
      const yaw = Math.atan2(MANTA.rx * Math.sin(a), MANTA.rz * Math.cos(a));
      const speed = Math.hypot(MANTA.rx * Math.sin(a), MANTA.rz * Math.cos(a));
      const roll = 0.15, pitch = -Math.atan2(MANTA.rise * Math.cos(a), speed) - 0.15, flap = 0.32 * Math.sin(3 * w);
      for (let v = 0; v < M.o.length; v++) {
        const i = v * 3, u = M.e[v];
        const q = [M.p[i], M.p[i + 1] + flap * Math.pow(u, 1.7) * 0.7 - 0.04 * Math.abs(flap) * u, M.p[i + 2] - 0.06 * Math.pow(u, 2) * Math.abs(flap)];
        const r = rot(q, yaw, pitch, roll);
        P3[i] = r[0] + x, P3[i + 1] = r[1] + y, P3[i + 2] = r[2] + z;
        if (H3 && M.h) {
          const hh = rot([M.h[i], M.h[i + 1], M.h[i + 2]], yaw, pitch, roll);
          H3[i] = hh[0], H3[i + 1] = hh[1], H3[i + 2] = hh[2];
        }
      }
      // smooth normals from the flapped triangles: face normals summed per shared rest position
      M.acc.fill(0);
      for (let v = 0; v < M.o.length; v += 3) {
        const i = v * 3;
        const A = [P3[i], P3[i + 1], P3[i + 2]], B = [P3[i + 3], P3[i + 4], P3[i + 5]], C3 = [P3[i + 6], P3[i + 7], P3[i + 8]];
        const fn = cross(sub(B, A), sub(C3, A));
        for (let k = 0; k < 3; k++) for (let d = 0; d < 3; d++) M.acc[M.slot[v + k] * 3 + d] += fn[d];
      }
      for (let v = 0; v < M.o.length; v++) {
        const s3 = M.slot[v] * 3, nn = nrm([M.acc[s3], M.acc[s3 + 1], M.acc[s3 + 2]]);
        N3[v * 3] = nn[0], N3[v * 3 + 1] = nn[1], N3[v * 3 + 2] = nn[2];
      }
      M.dirty = true;
    }
    for (const m of Object.values(movers)) {
      const g = m.g;
      g.attributes.position.needsUpdate = g.attributes.normal.needsUpdate = true;
      if (g.attributes.hullNormal) g.attributes.hullNormal.needsUpdate = true;
      g.computeBoundingSphere(), g.computeBoundingBox();
    }
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`aquarium: no clip "${m[1]}" (clips: swim)`);
      return frame(+m[2]);
    }
    if (name !== "rest") throw new Error(`aquarium: unknown pose "${name}" (rest, or swim@<seconds>)`);
    frame(0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
