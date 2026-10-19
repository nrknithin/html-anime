// dorm-room.js - a two-person school dormitory room, the shared room of every boarding-school anime, static set.
// Contract: harness/lab/README.md. Meters, +Y up, the room's open (cutaway) sides face +X and +Z so a camera in the
// lit front-left quadrant looks in; the -Z wall holds the window and the two study desks, the -X wall the bunk bed,
// the closet and the fridge. Stands on y = 0 (the floorboards' top is y = 0.02, joints.floor), centred on the room.
// (bedroom.js is the family-home single room; this is the shared, two-of-everything dorm room.)
//
// Construction (boxes, lathes, rods, rumpled superellipsoid blobs and lofted sheets, all triangle soups merged per
// material; boxes flat shaded so furniture reads crisp, bedding and the beanbag carry finite-difference normals of a
// displaced surface so the rumples catch the two tones; every closed part is wound away from a point inside it):
//   SHELL    floorboards (a slab with dark seams every 0.15 m and staggered butt joints), two walls 0.1 thick with a
//            skirting board, the -Z wall cut around a wide two-sash window (light frame, meeting stile, sill, a pale pane
//            with a cloud and a far school roof outside) and short curtains tied back on a rod.
//   BUNK     a dark-wood bunk on four tall posts: head and foot boards on both decks, side rails, white mattresses, a
//            guard rail on the top deck, a ladder on the open side. Rumpled bedding: a red duvet kicked into a heap on
//            the lower deck, a pale duvet half thrown back on the upper one, a pillow on each (head at the -Z wall).
//   DESKS    two identical dark-wood study desks side by side under the window (pedestals on the outer sides, drawer
//            seams), each with an arm lamp (round base, two-arm stem, closed conical shade), a row of books between
//            bookends, a flat stack and an open notebook; two chairs pulled out with pale seat cushions.
//   STORAGE  a shared built-in closet (white, two doors facing +X, dark pulls) with a box on top; a small white fridge
//            (freezer seam, pulls) with a red kettle and a mug on top.
//   LAUNDRY  a standing pole rack in the open front-right corner: two uprights on T-feet, a top bar with two shirts on
//            hangers, a low bar with a towel folded over it.
//   DECOR    a red rug with a cream border, a pale beanbag cushion slumped on it, three posters with abstract shapes only
//            (no text, no characters): two above the top bunk, one above the fridge.
// Proportions (real size, base unit the ceiling 2.4 m): room 3.0 x 4.0 inside, walls 0.1, ceiling 2.4 (meta.height);
//   bunk 0.95 x 2.0, posts 1.8, decks 0.55 / 1.38 (mattress tops); desks 0.92 x 0.6 at 0.74; chair seats 0.47;
//   window 1.6 x 1.1, sill 0.95; closet 0.58 x 0.95 x 2.05; fridge 0.5 x 0.5 x 0.86; rack 1.6 tall, 1.06 long;
//   rug 1.3 x 1.1; beanbag r 0.38; posters 0.36 x 0.5.
// Options: build(THREE, kit, colors, { height, night = false }).
//   height  scales the whole set so the wall top is `height` (default 2.4).
//   night   the window pane goes dark (hair) with a moon and stars, both desk-lamp shades glow practical (no shade
//           tone), a pool of practical light on each desk. Same script; the room keeps its day tones.
// Ink: the walls are drawn without a hull; whole-wall twins ("wallInk", hull only) ink their silhouettes, so the
//   pieces cut around the window show no seams. Hulls 1.5-2.5 px: a room is seen small, so thin parts keep colour.
// Colours (noon; roles in meta.colors): walls moon #fff6e4 (flat); floorboards sky #f2d7ae / skin #f0c2ae; dark wood
//   (bunk, desks, chairs) iris #5c3d32 / hair #241c16; white parts (closet, fridge, window frame, rack, mattresses,
//   pillows, bookends, skirting) sclera #f6f3ee / sky; red (lower duvet, rug, kettle, books, shirt, poster shapes)
//   accent #c4452d / iris; pale cloth (seat cushions, curtains, towel, shirt, pages, poster grounds,
//   rug border, cloud) moon / skin, so its rumples shade pink against the sky-shaded whites; tan (upper duvet,
//   beanbag) sky / skin, so they separate from the white mattress and the moon cloth; seams, pulls and lines
//   hair (flat); window pane sky by day, hair at night; lamp shades accent / iris by day, glow practical #fffaf2 at
//   night.
// Meshes: 10 (11 at night). ~6.6k triangles (bedding and the beanbag are half of it).
// Joints: anchors floor, bunk, deskA, deskB, window.

export const meta = {
  name: "dorm-room",
  height: 2.4,
  script: "noon",
  colors: {
    wall: "#fff6e4", wallShade: "#fff6e4",
    floor: "#f2d7ae", floorShade: "#f0c2ae",
    seam: "#241c16",
    wood: "#5c3d32", woodShade: "#241c16",
    white: "#f6f3ee", whiteShade: "#f2d7ae",
    red: "#c4452d", redShade: "#5c3d32",
    cloth: "#fff6e4", clothShade: "#f0c2ae",
    tan: "#f2d7ae", tanShade: "#f0c2ae",
    pane: "#f2d7ae", night: "#241c16",
    glow: "#fffaf2",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height, night = false } = opts;
  const c = { ...meta.colors, ...colors };
  const root = new THREE.Group();
  root.name = "dorm-room";
  const set = new THREE.Group(); // the uniform size scale lives here
  set.name = "room";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = {};


  // ---------- triangle soups with normals, through an optional placement matrix ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  let M = null; // THREE.Matrix4 placement for the part being written, or null
  const v3 = new THREE.Vector3();
  const P = (q) => (M ? (v3.set(...q).applyMatrix4(M), [v3.x, v3.y, v3.z]) : q);
  const N = (q) => (M ? (v3.set(...q).transformDirection(M), [v3.x, v3.y, v3.z]) : q);
  // place(x, y, z, yaw, pitch, roll) then draw in local coordinates; place() alone resets
  function place(x, y, z, ry = 0, rx = 0, rz = 0) {
    if (x === undefined) return (M = null);
    M = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), new THREE.Vector3(1, 1, 1));
  }
  // one triangle wound away from `ref`; vertex normals if given, else the face normal
  function tri(key, a, b, e, ref, na, nb, ne) {
    [a, b, e, ref] = [P(a), P(b), P(e), P(ref)];
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-11) return;
    const m = mul(add(add(a, b), e), 1 / 3);
    const flip = dot(n, sub(m, ref)) < 0;
    n = nrm(flip ? mul(n, -1) : n);
    const [A, B, E] = [na, nb, ne].map((q) => (q ? N(q) : n));
    const s = S(key);
    const push = (q, qn) => (s.p.push(...q), s.n.push(...qn));
    push(a, A);
    if (flip) push(e, E), push(b, B);
    else push(b, B), push(e, E);
  }
  const quad = (key, a, b, e, d, ref, na, nb, ne, nd) => (tri(key, a, b, e, ref, na, nb, ne), tri(key, a, e, d, ref, na, ne, nd));
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, x0, x1, y0, y1, z0, z1) {
    if (x0 > x1) [x0, x1] = [x1, x0];
    if (z0 > z1) [z0, z1] = [z1, z0];
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // surface of revolution about the local y axis at (cx, cz): profile [[r, y], ...] bottom centre to top centre
  function lathe(key, prof, cx, cz, n = 16, smooth = true) {
    const ym = prof.reduce((s, p) => s + p[1], 0) / prof.length;
    const ref = [cx, ym, cz];
    const at = (p, j) => { const a = (j / n) * Math.PI * 2; return [cx + p[0] * Math.cos(a), p[1], cz + p[0] * Math.sin(a)]; };
    const rad = (j) => { const a = (j / n) * Math.PI * 2; return [Math.cos(a), 0, Math.sin(a)]; };
    for (let i = 0; i + 1 < prof.length; i++) {
      const flat = Math.abs(prof[i][1] - prof[i + 1][1]) < 1e-6;
      const side = !flat && smooth;
      for (let j = 0; j < n; j++) {
        const r = flat ? ref : [cx, (prof[i][1] + prof[i + 1][1]) / 2, cz];
        const nn = side ? [rad(j), rad(j + 1), rad(j + 1), rad(j)] : [];
        quad(key, at(prof[i], j), at(prof[i], j + 1), at(prof[i + 1], j + 1), at(prof[i + 1], j), r, ...nn);
      }
    }
  }
  const cyl = (key, cx, cz, y0, y1, r, n = 16) => lathe(key, [[0, y0], [r, y0], [r, y1], [0, y1]], cx, cz, n);
  // a round rod from a to b (radius r, n sides), capped
  function rod(key, a, b, r, n = 6) {
    const d = nrm(sub(b, a)), up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const e1 = nrm(cross(d, up)), e2 = cross(e1, d);
    const ring = (o) => Array.from({ length: n }, (_, j) => { const t = (j / n) * Math.PI * 2; return add(o, add(mul(e1, r * Math.cos(t)), mul(e2, r * Math.sin(t)))); });
    const ra = ring(a), rb = ring(b), mid = mul(add(a, b), 0.5);
    for (let j = 0; j < n; j++) {
      const k = (j + 1) % n;
      quad(key, ra[j], ra[k], rb[k], rb[j], mid, nrm(sub(ra[j], a)), nrm(sub(ra[k], a)), nrm(sub(rb[k], b)), nrm(sub(rb[j], b)));
      tri(key, a, ra[j], ra[k], mid);
      tri(key, b, rb[j], rb[k], mid);
    }
  }
  // superellipsoid at o with radii r along the basis (ex, ey, ez); e < 1 boxy, e = 1 an ellipsoid
  const spow = (w, p) => Math.sign(w) * Math.pow(Math.abs(w), p);
  function blob(key, o, r, e = 1, basis = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], nu = 8, nv = 14) {
    const [ex, ey, ez] = basis;
    const W = (l) => add(o, add(add(mul(ex, l[0]), mul(ey, l[1])), mul(ez, l[2])));
    const Wn = (l) => nrm(add(add(mul(ex, l[0]), mul(ey, l[1])), mul(ez, l[2])));
    const pt = (i, j) => {
      const th = -Math.PI / 2 + (i / nu) * Math.PI, ph = (j / nv) * Math.PI * 2;
      const [ct, st, cp, sp] = [Math.cos(th), Math.sin(th), Math.cos(ph), Math.sin(ph)];
      const p = [r[0] * spow(ct, e) * spow(cp, e), r[1] * spow(st, e), r[2] * spow(ct, e) * spow(sp, e)];
      const q = 2 - e;
      const n = [spow(ct, q) * spow(cp, q) / r[0], spow(st, q) / r[1], spow(ct, q) * spow(sp, q) / r[2]];
      return [W(p), Wn(Math.hypot(...n) < 1e-9 ? [0, Math.sign(st), 0] : n)];
    };
    for (let i = 0; i < nu; i++)
      for (let j = 0; j < nv; j++) {
        const [a, b, d, f] = [pt(i, j), pt(i, j + 1), pt(i + 1, j + 1), pt(i + 1, j)];
        quad(key, a[0], b[0], d[0], f[0], o, a[1], b[1], d[1], f[1]);
      }
  }
  // flat shapes on a plane: W(u, v) maps plane coordinates to world, back(u, v) is a point behind the plane
  const onZ = (z) => ({ W: (u, v) => [u, v, z], back: (u, v) => [u, v, z - 1] }); // facing +Z
  const onX = (x) => ({ W: (u, v) => [x, v, u], back: (u, v) => [x - 1, v, u] }); // facing +X
  const onY = (y) => ({ W: (u, v) => [u, y, v], back: (u, v) => [u, y - 1, v] }); // facing up
  const rect = (key, F, u0, u1, v0, v1) => quad(key, F.W(u0, v0), F.W(u1, v0), F.W(u1, v1), F.W(u0, v1), F.back((u0 + u1) / 2, (v0 + v1) / 2));
  function fan(key, F, poly) {
    const cu = poly.reduce((s, p) => s + p[0], 0) / poly.length, cv = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      tri(key, F.W(cu, cv), F.W(a[0], a[1]), F.W(b[0], b[1]), F.back(cu, cv));
    }
  }
  const disc = (u, v, r, n = 16, ry = r) => Array.from({ length: n }, (_, i) => [u + r * Math.cos((i / n) * 2 * Math.PI), v + ry * Math.sin((i / n) * 2 * Math.PI)]);
  function ring(key, F, u, v, r0, r1, n = 24) {
    for (let i = 0; i < n; i++) {
      const [a, b] = [(i / n) * Math.PI * 2, ((i + 1) / n) * Math.PI * 2];
      const q = (r, t) => F.W(u + r * Math.cos(t), v + r * Math.sin(t));
      quad(key, q(r0, a), q(r1, a), q(r1, b), q(r0, b), F.back(u, v));
    }
  }
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  // a rumpled blob: a superellipsoid (radii r, squareness e) pushed along its normal by amp * a sum of sines, its
  // normals from finite differences of the displaced grid, so the folds catch both tones. sink lowers the top centre.
  function rumple(key, o, r, e, amp, seed, nu = 10, nv = 22, sink = 0) {
    const raw = (i, j) => {
      const th = -Math.PI / 2 + (i / nu) * Math.PI, ph = (j / nv) * Math.PI * 2;
      const [ct, st, cp, sp] = [Math.cos(th), Math.sin(th), Math.cos(ph), Math.sin(ph)];
      const l = [r[0] * spow(ct, e) * spow(cp, e), r[1] * spow(st, e), r[2] * spow(ct, e) * spow(sp, e)];
      const q = 2 - e;
      const n = nrm([spow(ct, q) * spow(cp, q) / r[0], spow(st, q) / r[1], spow(ct, q) * spow(sp, q) / r[2]]);
      const f = Math.sin(3 * ph + seed) * Math.cos(2.2 * th + seed * 0.7) + 0.6 * Math.sin(5 * ph + 3 * th + seed * 2.1) + 0.35 * Math.sin(8 * ph - seed);
      const w = amp * f * Math.pow(Math.max(0, ct), 0.6) * (st < -0.3 ? 0.3 : 1); // no folds at the poles or underneath
      let p = add(l, mul(n, w));
      if (sink && st > 0) p = add(p, [0, -sink * st ** 3, 0]);
      return add(o, p);
    };
    const G = [];
    for (let i = 0; i <= nu; i++) { G.push([]); for (let j = 0; j < nv; j++) G[i].push(raw(i, j)); }
    const at = (i, j) => G[Math.max(0, Math.min(nu, i))][(j + nv) % nv];
    const nAt = (i, j) => {
      if (i === 0) return [0, -1, 0];
      if (i === nu) return [0, 1, 0];
      const du = sub(at(i + 1, j), at(i - 1, j)), dv = sub(at(i, j + 1), at(i, j - 1));
      let n = nrm(cross(dv, du));
      if (dot(n, sub(at(i, j), o)) < 0) n = mul(n, -1);
      return n;
    };
    for (let i = 0; i < nu; i++)
      for (let j = 0; j < nv; j++)
        quad(key, at(i, j), at(i, j + 1), at(i + 1, j + 1), at(i + 1, j), o, nAt(i, j), nAt(i, j + 1), nAt(i + 1, j + 1), nAt(i + 1, j));
  }

  // ---------- dimensions ----------
  const X0 = -1.5, X1 = 1.5, Z0 = -2.0, Z1 = 2.0, T = 0.1, FT = 0.02, CEIL = 2.4;
  const WIN = { x0: -0.3, x1: 1.3, y0: 0.95, y1: 2.05 };
  const BUNK = { x0: X0, x1: -0.55, z0: Z0, z1: 0.0, post: 1.8 };
  const DESK = { z0: Z0, z1: -1.4, y: 0.74 };
  const DESKS = [{ x0: -0.45, x1: 0.47, ped: -1 }, { x0: 0.53, x1: 1.45, ped: 1 }];
  const CLOSET = { x0: X0, x1: -0.92, z0: 0.3, z1: 1.25, y: 2.05 };
  const FRIDGE = { x0: X0 + 0.04, x1: -0.96, z0: 1.36, z1: 1.86, y: 0.86 };
  const RUG = { x0: -0.3, x1: 1.0, z0: -0.6, z1: 0.5 };
  const RACK = { x: 0, z0: -0.53, z1: 0.53, y: 1.5, at: [0.62, 1.7] }; // local frame: bars along z, turned to run along x

  // ---------- floor ----------
  box("floor", X0 - T, X1, 0, FT, Z0 - T, Z1);
  const FL = onY(FT + 0.0008);
  for (let z = Z0 + 0.15, k = 0; z < Z1 - 0.05; z += 0.15, k++) {
    rect("seam", FL, X0, X1, z - 0.003, z + 0.003);
    for (let x = X0 + 0.4 + hash(k) * 1.2; x < X1 - 0.1; x += 1.2 + hash(k + 50) * 0.4) rect("seam", FL, x - 0.003, x + 0.003, z, Math.min(z + 0.15, Z1));
  }

  // ---------- walls ----------
  box("wall", X0 - T, X0, FT, CEIL, Z0 - T, Z1); // -X wall
  box("wall", X0, WIN.x0, FT, CEIL, Z0 - T, Z0); // -Z wall, cut around the window
  box("wall", WIN.x1, X1, FT, CEIL, Z0 - T, Z0);
  box("wall", WIN.x0, WIN.x1, FT, WIN.y0, Z0 - T, Z0);
  box("wall", WIN.x0, WIN.x1, WIN.y1, CEIL, Z0 - T, Z0);
  box("wallInk", X0 - T, X0, FT, CEIL, Z0 - T, Z1);
  box("wallInk", X0, X1, FT, CEIL, Z0 - T, Z0);
  box("white", X0, X0 + 0.015, FT, 0.1, Z0, Z1); // skirting
  box("white", X0, X1, FT, 0.1, Z0, Z0 + 0.015);

  // ---------- window: two sliding sashes ----------
  const WZ = Z0 - 0.06, fw = 0.05, wm = (WIN.x0 + WIN.x1) / 2;
  rect(night ? "night" : "pane", onZ(WZ), WIN.x0, WIN.x1, WIN.y0, WIN.y1);
  box("white", WIN.x0, WIN.x1, WIN.y0, WIN.y0 + fw, WZ, Z0);
  box("white", WIN.x0, WIN.x1, WIN.y1 - fw, WIN.y1, WZ, Z0);
  box("white", WIN.x0, WIN.x0 + fw, WIN.y0, WIN.y1, WZ, Z0);
  box("white", WIN.x1 - fw, WIN.x1, WIN.y0, WIN.y1, WZ, Z0);
  box("white", wm - 0.03, wm + 0.03, WIN.y0, WIN.y1, WZ, WZ + 0.045); // meeting stiles
  box("white", WIN.x0 - 0.06, WIN.x1 + 0.06, WIN.y0 - 0.04, WIN.y0, Z0 - 0.02, Z0 + 0.06); // sill
  const OUT = onZ(WZ + 0.002), OUT2 = onZ(WZ + 0.004);
  if (!night) {
    fan("cloth", OUT, disc(WIN.x0 + 0.42, WIN.y1 - 0.26, 0.16, 14, 0.06));
    fan("cloth", OUT, disc(WIN.x0 + 0.3, WIN.y1 - 0.24, 0.1, 12, 0.05));
    fan("cloth", OUT, disc(WIN.x1 - 0.32, WIN.y1 - 0.4, 0.12, 12, 0.04));
    // a far school building: a long block with a row of windows, and a low hill line
    rect("white", OUT, WIN.x0 + fw, WIN.x1 - fw, WIN.y0 + fw, WIN.y0 + 0.3);
    rect("seam", OUT, WIN.x0 + fw, WIN.x1 - fw, WIN.y0 + 0.3, WIN.y0 + 0.315);
    for (let i = 0; i < 9; i++) {
      const x = WIN.x0 + 0.1 + i * 0.16;
      if (Math.abs(x + 0.04 - wm) > 0.06) rect("pane", OUT2, x, x + 0.08, WIN.y0 + 0.15, WIN.y0 + 0.23);
    }
  } else {
    fan("cloth", OUT, disc(WIN.x0 + 0.3, WIN.y1 - 0.25, 0.09, 16));
    for (let i = 0; i < 8; i++) fan("glow", OUT, disc(WIN.x0 + 0.1 + hash(i + 9) * (WIN.x1 - WIN.x0 - 0.2), WIN.y0 + 0.4 + hash(i + 19) * 0.55, 0.012, 6));
    rect("seam", OUT, WIN.x0 + fw, WIN.x1 - fw, WIN.y0 + fw, WIN.y0 + 0.3); // the far building, dark
    for (let i = 0; i < 9; i++) {
      const x = WIN.x0 + 0.1 + i * 0.16;
      if (hash(i + 3) > 0.45 && Math.abs(x + 0.04 - wm) > 0.06) rect("glow", OUT2, x, x + 0.08, WIN.y0 + 0.15, WIN.y0 + 0.23);
    }
  }
  // curtain rod and two short curtains tied back at the window's sides
  const RY = 2.2, RZ = Z0 + 0.07;
  rod("seam", [WIN.x0 - 0.22, RY, RZ], [WIN.x1 + 0.18, RY, RZ], 0.011, 8);
  for (const x of [WIN.x0 - 0.12, WIN.x1 + 0.1]) box("seam", x - 0.01, x + 0.01, RY, RY + 0.012, Z0, RZ);
  function curtain(outer, dir, full) {
    const yTop = RY - 0.03, yBot = 1.0, tie = 1.4, nu = 12, nv = 10, th = 0.01, amp = 0.02, waves = 3;
    const wAt = (y) => (y > tie ? 0.5 + 0.5 * ((y - tie) / (yTop - tie)) ** 0.8 : 0.5 + 0.25 * ((tie - y) / (tie - yBot)));
    const zc = RZ - 0.01;
    const surf = (i, j, s) => {
      const y = yTop - (j / nv) * (yTop - yBot), w = full * wAt(y), u = i / nu;
      const ph = u * waves * Math.PI * 2, x = outer + dir * u * w;
      const z = zc + amp * Math.sin(ph) * (0.6 + 0.4 * (w / full)) + s * th;
      const dzdx = (amp * Math.cos(ph) * waves * Math.PI * 2) / w;
      return [[x, y, z], nrm([-dzdx * dir * s, 0, s])];
    };
    for (const s of [1, -1])
      for (let j = 0; j < nv; j++)
        for (let i = 0; i < nu; i++) {
          const q = [surf(i, j, s), surf(i + 1, j, s), surf(i + 1, j + 1, s), surf(i, j + 1, s)];
          quad("cloth", q[0][0], q[1][0], q[2][0], q[3][0], sub(q[0][0], [0, 0, s]), q[0][1], q[1][1], q[2][1], q[3][1]);
        }
    for (let j = 0; j < nv; j++)
      for (const i of [0, nu]) {
        const [a, b, e, d] = [surf(i, j, 1)[0], surf(i, j + 1, 1)[0], surf(i, j + 1, -1)[0], surf(i, j, -1)[0]];
        quad("cloth", a, b, e, d, add(a, [(i === 0 ? dir : -dir) * 0.5, 0, 0]));
      }
    for (const j of [0, nv])
      for (let i = 0; i < nu; i++) {
        const [a, b, e, d] = [surf(i, j, 1)[0], surf(i + 1, j, 1)[0], surf(i + 1, j, -1)[0], surf(i, j, -1)[0]];
        quad("cloth", a, b, e, d, add(a, [0, j === 0 ? -0.5 : 0.5, 0]));
      }
    const tw = full * wAt(tie);
    box("red", Math.min(outer, outer + dir * (tw + 0.01)), Math.max(outer, outer + dir * (tw + 0.01)), tie - 0.02, tie + 0.02, zc - 0.035, zc + 0.035);
  }
  curtain(WIN.x0 - 0.2, 1, 0.34);
  curtain(WIN.x1 + 0.16, -1, 0.32);

  // ---------- bunk bed (head at the -Z wall, ladder on the open +X side) ----------
  const B = BUNK, bxm = (B.x0 + B.x1) / 2, pw = 0.035;
  const PX = [B.x0 + pw + 0.005, B.x1 - pw], PZ = [B.z0 + pw + 0.005, B.z1 - pw];
  for (const x of PX) for (const z of PZ) box("wood", x - pw, x + pw, FT, B.post, z - pw, z + pw);
  for (const y of [0.3, 1.13]) {
    for (const x of PX) box("wood", x - 0.02, x + 0.02, y, y + 0.13, PZ[0], PZ[1]); // side rails
    box("white", B.x0 + 0.04, B.x1 - 0.04, y + 0.1, y + 0.25, PZ[0] + 0.03, PZ[1] - 0.03); // mattress
  }
  for (const z of PZ) { // head and foot boards
    box("wood", PX[0], PX[1], 0.3, 0.72, z - 0.015, z + 0.015);
    box("wood", PX[0], PX[1], 1.13, 1.62, z - 0.015, z + 0.015);
  }
  box("wood", PX[1] - 0.02, PX[1] + 0.02, 1.52, 1.6, PZ[0], -0.46); // guard rail, open at the ladder
  box("wood", PX[1] - 0.02, PX[1] + 0.02, 1.38, 1.6, -0.5, -0.46);
  for (const z of [-0.44, -0.12]) box("wood", B.x1 - 0.005, B.x1 + 0.04, FT, 1.66, z - 0.022, z + 0.022); // ladder sides
  for (let k = 0; k < 4; k++) { const y = 0.33 + k * 0.3; box("wood", B.x1 + 0.0, B.x1 + 0.035, y, y + 0.035, -0.44, -0.12); }
  // bedding: the lower duvet kicked into a heap toward the foot, the upper one half thrown back
  rumple("red", [bxm + 0.03, 0.62, -0.55], [0.44, 0.13, 0.5], 0.45, 0.035, 1.3, 10, 24);
  rumple("red", [bxm - 0.05, 0.6, -1.12], [0.4, 0.07, 0.3], 0.5, 0.025, 4.1, 8, 18);
  rumple("white", [bxm, 0.69, -1.72], [0.28, 0.07, 0.16], 0.45, 0.012, 2.2, 8, 16); // pillow
  rumple("tan", [bxm, 1.45, -0.62], [0.45, 0.1, 0.6], 0.3, 0.035, 0.4, 10, 26);
  rumple("tan", [bxm + 0.02, 1.5, -1.28], [0.44, 0.08, 0.12], 0.55, 0.02, 2.9, 8, 18); // the thrown-back roll
  rumple("white", [bxm, 1.48, -1.72], [0.28, 0.07, 0.16], 0.45, 0.012, 5.2, 8, 16);
  // posters above the top bunk, abstract shapes only
  const PXW = onX(X0 + 0.004), PXW2 = onX(X0 + 0.007);
  box("cloth", X0, X0 + 0.003, 1.78, 2.28, -1.72, -1.36);
  fan("red", PXW, disc(-1.54, 2.1, 0.09));
  for (let i = 0; i < 3; i++) rect("seam", PXW, -1.68, -1.4, 1.84 + i * 0.05, 1.86 + i * 0.05);
  box("red", X0, X0 + 0.003, 1.8, 2.3, -1.1, -0.74);
  fan("cloth", PXW2, [[-1.06, 1.86], [-0.78, 1.86], [-0.92, 2.2]]);
  fan("seam", onX(X0 + 0.01), disc(-0.92, 1.98, 0.035, 10));

  // ---------- desks ----------
  const dt = 0.03;
  DESKS.forEach((D, di) => {
    const y = DESK.y;
    box("wood", D.x0, D.x1, y - dt, y, DESK.z0, DESK.z1); // top
    box("wood", D.x0, D.x0 + 0.025, FT, y - dt, DESK.z0, DESK.z1 - 0.02); // side panels
    box("wood", D.x1 - 0.025, D.x1, FT, y - dt, DESK.z0, DESK.z1 - 0.02);
    box("wood", D.x0 + 0.025, D.x1 - 0.025, 0.36, y - dt, DESK.z0, DESK.z0 + 0.02); // modesty panel
    const [p0, p1] = D.ped < 0 ? [D.x0 + 0.025, D.x0 + 0.4] : [D.x1 - 0.4, D.x1 - 0.025];
    box("wood", p0, p1, FT, y - dt, DESK.z0, DESK.z1 - 0.02); // pedestal
    const DF = onZ(DESK.z1 - 0.019);
    for (const [y0, y1] of [[0.04, 0.27], [0.29, 0.49], [0.51, 0.69]]) {
      rect("seam", DF, p0 + 0.01, p1 - 0.01, y1 - 0.005, y1 + 0.005);
      box("white", (p0 + p1) / 2 - 0.06, (p0 + p1) / 2 + 0.06, (y0 + y1) / 2 + 0.02, (y0 + y1) / 2 + 0.04, DESK.z1 - 0.02, DESK.z1 - 0.004);
    }
    // arm lamp at the outer back corner, its shade over the desk's middle
    const s = D.ped < 0 ? 1 : -1; // toward the desk's middle
    const lx = D.ped < 0 ? D.x0 + 0.13 : D.x1 - 0.13, lz = DESK.z0 + 0.14;
    cyl("white", lx, lz, y, y + 0.025, 0.07, 14);
    const elbow = [lx - s * 0.04, y + 0.4, lz - 0.05], head = [lx + s * 0.2, y + 0.47, lz + 0.14];
    rod("white", [lx, y + 0.02, lz], elbow, 0.011, 6);
    rod("white", elbow, head, 0.011, 6);
    blob("white", elbow, [0.02, 0.02, 0.02], 1, undefined, 4, 8);
    place(...head, 0, 0.35, s * 0.45);
    lathe("lamp", [[0, 0.03], [0.04, 0.03], [0.1, -0.11], [0, -0.11]], 0, 0, 16);
    place();
    if (night) fan("glow", onY(y + 0.001), disc(lx + s * 0.3, lz + 0.22, 0.3, 22, 0.22));
    // books upright between bookends at the back, a flat stack at the front corner, an open notebook
    const bz0 = DESK.z0 + 0.12;
    let x = D.ped < 0 ? D.x0 + 0.3 : D.x0 + 0.08, k = 0;
    const stop = x + 0.42;
    box("white", x - 0.012, x, y, y + 0.16, bz0, bz0 + 0.14);
    const BOOK = ["red", "cloth", "white", "red", "wood", "cloth"];
    while (x < stop) {
      const id = di * 37 + k++;
      const w = 0.025 + hash(id) * 0.025, h = 0.19 + hash(id + 7) * 0.08, d = 0.15 + hash(id + 3) * 0.04;
      const col = BOOK[Math.floor(hash(id + 13) * BOOK.length)];
      box(col, x, x + w, y, y + h, bz0, bz0 + d);
      if (col === "red" || col === "wood") rect("cloth", onZ(bz0 + d + 0.0005), x + 0.004, x + w - 0.004, y + h * 0.7, y + h * 0.75);
      x += w + 0.002;
    }
    box("white", x, x + 0.012, y, y + 0.16, bz0, bz0 + 0.14);
    const sx = D.ped < 0 ? D.x1 - 0.18 : D.x0 + 0.18;
    [["red", 0.22, 0.16, 0.03], ["cloth", 0.2, 0.15, 0.026], ["wood", 0.19, 0.14, 0.028]].reduce((yy, [kk, w, d, h], i) => {
      place(sx, y + yy, -1.6, (di ? -0.2 : 0.15) + i * 0.13);
      box(kk, -w / 2, w / 2, 0, h, -d / 2, d / 2);
      if (kk !== "cloth") box("cloth", -w / 2 + 0.006, w / 2 - 0.003, 0.004, h - 0.004, -d / 2 - 0.002, d / 2 + 0.002); // page block
      return yy + h;
    }, 0);
    place((D.x0 + D.x1) / 2 + (di ? -0.06 : 0.04), y, -1.55, di ? 0.1 : -0.12);
    box("cloth", -0.15, 0.15, 0, 0.008, -0.1, 0.1);
    rect("seam", onY(0.0088), -0.004, 0.004, -0.1, 0.1);
    for (let i = 0; i < 4; i++) for (const u of [-1, 1]) rect("seam", onY(0.0088), u > 0 ? 0.02 : -0.13, u > 0 ? 0.13 : -0.02, -0.06 + i * 0.035, -0.057 + i * 0.035);
    place();
  });

  // ---------- chairs, pulled out, facing the desks ----------
  for (const [cx, cz, yaw] of [[0.05, -1.08, 0.18], [1.0, -1.02, -0.22]]) {
    place(cx, 0, cz, yaw);
    const sw = 0.2, sd = 0.2;
    box("wood", -sw, sw, 0.42, 0.45, -sd, sd); // seat
    box("cloth", -sw + 0.02, sw - 0.02, 0.45, 0.48, -sd + 0.02, sd - 0.03); // cushion
    for (const [x, z] of [[-sw + 0.03, -sd + 0.03], [sw - 0.03, -sd + 0.03], [-sw + 0.03, sd - 0.03], [sw - 0.03, sd - 0.03]])
      box("wood", x - 0.018, x + 0.018, FT, 0.42, z - 0.018, z + 0.018);
    for (const x of [-sw + 0.03, sw - 0.03]) box("wood", x - 0.018, x + 0.018, 0.45, 0.88, sd - 0.048, sd - 0.012);
    box("wood", -sw, sw, 0.7, 0.86, sd - 0.045, sd - 0.015); // back rail
    box("wood", -sw + 0.03, sw - 0.03, 0.15, 0.18, -sd + 0.015, -sd + 0.045);
    box("wood", -sw + 0.03, sw - 0.03, 0.15, 0.18, sd - 0.045, sd - 0.015);
    place();
  }

  // ---------- shared closet (two doors facing +X) and a box on top ----------
  const C = CLOSET, cm = (C.z0 + C.z1) / 2;
  box("white", C.x0, C.x1, FT, C.y, C.z0, C.z1);
  const CF = onX(C.x1 + 0.0008);
  rect("seam", CF, cm - 0.004, cm + 0.004, 0.08, C.y - 0.05);
  rect("seam", CF, C.z0 + 0.02, C.z1 - 0.02, C.y - 0.06, C.y - 0.052);
  rect("seam", CF, C.z0 + 0.02, C.z1 - 0.02, 0.08, 0.088);
  for (const z of [cm - 0.06, cm + 0.06]) box("seam", C.x1, C.x1 + 0.02, 0.95, 1.25, z - 0.012, z + 0.012);
  box("cloth", C.x0 + 0.04, C.x1 - 0.06, C.y, C.y + 0.24, C.z0 + 0.12, C.z1 - 0.2); // storage box
  rect("seam", onX(C.x1 - 0.06 + 0.0008), C.z0 + 0.12, C.z1 - 0.2, C.y + 0.17, C.y + 0.178);

  // ---------- fridge, kettle and mug ----------
  const F = FRIDGE;
  box("white", F.x0, F.x1, FT, F.y, F.z0, F.z1);
  const FF = onX(F.x1 + 0.0008);
  rect("seam", FF, F.z0 + 0.01, F.z1 - 0.01, 0.6, 0.61);
  box("seam", F.x1, F.x1 + 0.02, 0.66, 0.8, F.z0 + 0.04, F.z0 + 0.06);
  box("seam", F.x1, F.x1 + 0.02, 0.35, 0.55, F.z0 + 0.04, F.z0 + 0.06);
  const KX = (F.x0 + F.x1) / 2, KZ = F.z0 + 0.17;
  lathe("red", [[0, F.y], [0.075, F.y], [0.085, F.y + 0.12], [0.06, F.y + 0.2], [0.03, F.y + 0.21], [0, F.y + 0.21]], KX, KZ, 14);
  rod("seam", [KX, F.y + 0.2, KZ + 0.06], [KX, F.y + 0.2, KZ - 0.07], 0.012, 5); // handle
  rod("red", [KX + 0.06, F.y + 0.1, KZ + 0.02], [KX + 0.12, F.y + 0.16, KZ + 0.03], 0.014, 6); // spout
  cyl("cloth", KX + 0.03, F.z1 - 0.1, F.y, F.y + 0.09, 0.04, 12);
  // poster above the fridge
  box("cloth", X0, X0 + 0.003, 1.22, 1.72, 1.43, 1.79);
  for (let i = 0; i < 4; i++) rect(["red", "seam", "red", "wood"][i], PXW, 1.47 + i * 0.075, 1.53 + i * 0.075, 1.28, 1.42 + 0.06 * i);
  fan("red", PXW, disc(1.61, 1.62, 0.05, 12));

  // ---------- laundry rack (pole stand) with two shirts and a towel ----------
  const R = RACK;
  place(R.at[0], 0, R.at[1], -Math.PI / 2); // local +X (the shirts' faces) -> world +Z
  for (const z of [R.z0, R.z1]) {
    rod("white", [R.x, FT, z], [R.x, R.y, z], 0.013, 6);
    rod("white", [R.x - 0.26, FT + 0.015, z], [R.x + 0.26, FT + 0.015, z], 0.015, 6); // T-foot
  }
  rod("white", [R.x, R.y - 0.02, R.z0 - 0.03], [R.x, R.y - 0.02, R.z1 + 0.03], 0.012, 6); // top bar
  rod("white", [R.x, 0.82, R.z0], [R.x, 0.82, R.z1], 0.011, 6); // low bar
  // a shirt on a hanger: a thin body and two slanted sleeves in the plane x = R.x, facing +X
  function shirt(key, z, w, len) {
    const y1 = R.y - 0.12, th = 0.016;
    rod("seam", [R.x, R.y - 0.02, z], [R.x, y1 + 0.03, z], 0.004, 4); // hook
    rod("seam", [R.x, y1 + 0.03, z], [R.x, y1, z - w], 0.004, 4);
    rod("seam", [R.x, y1 + 0.03, z], [R.x, y1, z + w], 0.004, 4);
    box(key, R.x - th, R.x + th, y1 - len, y1, z - w * 0.9, z + w * 0.9);
    for (const s of [-1, 1]) {
      const a = [z + s * w * 0.85, y1], b = [z + s * (w + 0.12), y1 - 0.12], d = [z + s * (w + 0.06), y1 - 0.2], e = [z + s * w * 0.85, y1 - 0.13];
      const q = [a, b, d, e];
      hex(key, [...q.map(([zz, yy]) => [R.x - th * 0.9, yy, zz]), ...q.map(([zz, yy]) => [R.x + th * 0.9, yy, zz])]);
    }
    rect("seam", onX(R.x + th + 0.0008), z - 0.05, z + 0.05, y1 - 0.025, y1 - 0.012); // collar line
  }
  shirt("red", R.z0 + 0.27, 0.17, 0.52);
  shirt("cloth", R.z1 - 0.27, 0.16, 0.46);
  // towel folded over the low bar
  box("cloth", R.x - 0.03, R.x - 0.012, 0.42, 0.835, -0.18, 0.18);
  box("cloth", R.x + 0.012, R.x + 0.03, 0.52, 0.835, -0.18, 0.18);
  box("cloth", R.x - 0.03, R.x + 0.03, 0.83, 0.85, -0.18, 0.18);
  rect("red", onX(R.x + 0.0308), -0.18, 0.18, 0.57, 0.6);
  place();

  // ---------- rug and beanbag ----------
  box("red", RUG.x0, RUG.x1, FT, FT + 0.012, RUG.z0, RUG.z1);
  const RG = onY(FT + 0.0128), bd = 0.07, bw = 0.03;
  rect("cloth", RG, RUG.x0 + bd, RUG.x1 - bd, RUG.z0 + bd, RUG.z0 + bd + bw);
  rect("cloth", RG, RUG.x0 + bd, RUG.x1 - bd, RUG.z1 - bd - bw, RUG.z1 - bd);
  rect("cloth", RG, RUG.x0 + bd, RUG.x0 + bd + bw, RUG.z0 + bd + bw, RUG.z1 - bd - bw);
  rect("cloth", RG, RUG.x1 - bd - bw, RUG.x1 - bd, RUG.z0 + bd + bw, RUG.z1 - bd - bw);
  rumple("tan", [0.55, 0.25, 0.0], [0.42, 0.23, 0.4], 0.8, 0.03, 3.3, 12, 24, 0.1);

  // ---------- meshes ----------
  const MAT = { // [base, shade, threshold, ink px (0 = no hull)]
    wall: [c.wall, c.wallShade, 0.1, 0],
    floor: [c.floor, c.floorShade, 0.1, 2.5],
    seam: [c.seam, c.seam, 0.1, 0],
    wood: [c.wood, c.woodShade, 0.2, 2],
    white: [c.white, c.whiteShade, 0.1, 2],
    red: [c.red, c.redShade, 0.0, 2],
    cloth: [c.cloth, c.clothShade, 0.1, 1.5],
    tan: [c.tan, c.tanShade, 0.1, 1.5],
    pane: [c.pane, c.pane, -1, 0],
    night: [c.night, c.night, -1, 0],
    lamp: night ? [c.glow, c.glow, -1, 2] : [c.red, c.redShade, 0.05, 2],
    glow: [c.glow, c.glow, -1, 0],
  };
  const geo = (s) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    return g;
  };
  for (const [key, s] of Object.entries(soups)) {
    if (key === "wallInk") continue;
    const [base, shade, threshold, px] = MAT[key];
    const mesh = kit.toon(geo(s), base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    if (key === "wall")
      for (const h of kit.outline(new THREE.Mesh(geo(soups.wallInk), mesh.material), { px: 2.5 }).children.slice()) mesh.add(h);
    set.add(mesh);
  }
  const anchor = (name, x, y, z) => { const a = new THREE.Group(); a.name = name; a.position.set(x, y, z); set.add(a); joints[name] = a; };
  anchor("floor", 0, FT, 0);
  anchor("bunk", bxm, 1.4, -1.0);
  anchor("deskA", (DESKS[0].x0 + DESKS[0].x1) / 2, DESK.y, -1.7);
  anchor("deskB", (DESKS[1].x0 + DESKS[1].x1) / 2, DESK.y, -1.7);
  anchor("window", wm, (WIN.y0 + WIN.y1) / 2, Z0);

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
