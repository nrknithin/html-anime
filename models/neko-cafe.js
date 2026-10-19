// neko-cafe.js - a cosy Japanese cat cafe (neko kafe) interior at real size: a cutaway room of two walls and a floor
// where six stylised cats lounge among low tables, a tall cat tower and wall steps. Static set plus one clip.
// Contract: harness/lab/README.md. Meters, +Y up, the cutaway's open sides face +X and +Z so a camera in the lit
// front-left quadrant looks in; the -Z wall holds the cat steps, the high shelf, the window and window seat and the
// counter, the -X wall the cat tower and the shoe-off entry. Stands on y = 0, centred on the room.
//
// Construction (triangle soups merged per material, every closed part wound away from a point inside it; boxes flat
// shaded so furniture reads crisp, blobs and rods carry analytic normals so cats and cushions read soft):
//   SHELL    a raised wood floor (top y = 0.1, boards every 0.15 m) with a sunken tiled genkan (entry) in the front
//            -X corner, edged by a wood step beam; two walls 0.1 thick with a cream wainscot and a wood rail at
//            0.85 m; the -Z wall is cut around a two-pane window (white frame, a tree outside). The walls carry no
//            hull; whole-wall twins ("wallInk", hull only) ink their silhouettes so the cut pieces show no seams.
//   CATS     big-headed stylised cats (head r 0.115 against a 0.25-0.4 m body, about 1.3x real so they read at
//            480x300) from superellipsoid blobs, rod legs, pyramid ears and decal faces (eye blobs on the head's
//            surface). Kept as merged props, not rigged. In option order: a sitting ginger tabby (front, facing
//            the camera), a ginger loaf on the tower, a calico peeking from a cardboard box, a tuxedo in a play-bow
//            stretch, a white cat curled asleep on the window seat, a dark cat on the high shelf with a paw down.
//   FURNITURE a cat tower (base, a hidey cube with a round door, four sisal posts with dark rope bands, two lime
//            carpeted platforms, a round red bed on top, a dangling pom); four wall-mounted steps zigzagging up the -Z
//            wall to a high shelf; a window seat with a red cushion; two low tables (chabudai) with zabuton
//            cushions and cups on saucers (matcha, latte, strawberry milk); a counter with a red front, a
//            cake dome and a treat jar under a blank menu board; a potted plant; a paw-print sign.
//   ENTRY    the genkan's cream tiles, a wood slipper rack on the -X wall with three pairs, one pair set out on the
//            raised floor at the step. Toys: a red ball and a feather wand on the floor.
// Proportions (real size, base unit the wall top 2.4 m = meta.height): room 3.6 x 3.2 inside; floor 0.1; tables
//   0.7 x 0.5 at 0.42; cushions 0.5 square; tower 0.65 x 0.7 base, platforms 0.62 and 1.12, bed 1.62; steps 0.32 x
//   0.25 every 0.3 m up to the high shelf at 1.85; window 0.95 x 1.05 from 0.95; window seat top 0.5; counter
//   0.65 x 0.85 at 1.0; genkan 0.85 x 0.75, tiles at 0.03.
// Options: build(THREE, kit, colors, { height = 2.4, cats = 6 }).
//   height  scales the whole set so the wall top is `height`.
//   cats    how many cats (1..6), in the order above; the box stays (empty) when its cat is left out.
// Clip: tail (2 s loop). Every tail is one tube in ONE mesh ("tails", a geometry group per coat) whose vertices
//   pose() rewrites each frame: a travelling wave bends each tail about its own swish axis from its root.
//   pose("tail@0.5"); rest holds the tails at their drawn shape.
// Colours (meadow; roles in meta.colors): walls sky #d7ecef (flat); floor skin #f0c2ae / practical #f2c94c; wood
//   and cardboard practical / skin; white trim, cups, cake dome sclera #f6f3ee / sky; cream wainscot, tiles, sisal,
//   zabuton moon #f7f3e1 / sky; red cushions, bed, counter front, ball accent #d9483b / hair #2c5131; carpet and
//   cushions line #a9d16e / iris #3f8a47; leaves iris / hair; seams, rope bands, cat faces and stripes hair (flat);
//   window pane moon (flat). Cats: ginger practical / skin, white sclera / sky, dark hair (flat; its eyes moon).
// Meshes: 14 (13 when a coat is unused). ~14k triangles at 6 cats (8.9k at 1).
// Joints: anchors floor, tower, window, counter, and one per cat (catSit, catLoaf, catBox, catStretch, catCurl,
//   catShelf) at its head.

export const meta = {
  name: "neko-cafe",
  height: 2.4,
  script: "meadow",
  colors: {
    wall: "#d7ecef", wallShade: "#d7ecef",
    floor: "#f0c2ae", floorShade: "#f2c94c",
    wood: "#f2c94c", woodShade: "#f0c2ae",
    white: "#f6f3ee", whiteShade: "#d7ecef",
    cream: "#f7f3e1", creamShade: "#d7ecef",
    red: "#d9483b", redShade: "#2c5131",
    lime: "#a9d16e", limeShade: "#3f8a47",
    green: "#3f8a47", greenShade: "#2c5131",
    seam: "#2c5131",
    pane: "#f7f3e1",
    ginger: "#f2c94c", gingerShade: "#f0c2ae",
    pale: "#f6f3ee", paleShade: "#d7ecef",
    dark: "#2c5131", darkShade: "#2c5131",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height } = opts;
  const nCats = Math.max(1, Math.min(6, Math.round(opts.cats ?? 6)));
  const c = { ...meta.colors, ...colors };
  const root = new THREE.Group();
  root.name = "neko-cafe";
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
  function rod(key, a, b, r, n = 6, rb = r) {
    const d = nrm(sub(b, a)), up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const e1 = nrm(cross(d, up)), e2 = cross(e1, d);
    const ring = (o, rr) => Array.from({ length: n }, (_, j) => { const t = (j / n) * Math.PI * 2; return add(o, add(mul(e1, rr * Math.cos(t)), mul(e2, rr * Math.sin(t)))); });
    const ra = ring(a, r), rB = ring(b, rb), mid = mul(add(a, b), 0.5);
    for (let j = 0; j < n; j++) {
      const k = (j + 1) % n;
      quad(key, ra[j], ra[k], rB[k], rB[j], mid, nrm(sub(ra[j], a)), nrm(sub(ra[k], a)), nrm(sub(rB[k], b)), nrm(sub(rB[j], b)));
      tri(key, a, ra[j], ra[k], mid);
      tri(key, b, rB[j], rB[k], mid);
    }
  }
  // superellipsoid at o with radii r along the basis (ex, ey, ez); e < 1 boxy, e = 1 an ellipsoid
  const spow = (w, p) => Math.sign(w) * Math.pow(Math.abs(w), p);
  const AX = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  function blob(key, o, r, e = 1, basis = AX, nu = 8, nv = 14) {
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
  const rotX = (a) => [[1, 0, 0], [0, Math.cos(a), Math.sin(a)], [0, -Math.sin(a), Math.cos(a)]];
  const rotY = (a) => [[Math.cos(a), 0, -Math.sin(a)], [0, 1, 0], [Math.sin(a), 0, Math.cos(a)]];
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
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  // ---------- dimensions ----------
  const X0 = -1.8, X1 = 1.8, Z0 = -1.6, Z1 = 1.6, T = 0.1, FT = 0.1, CEIL = 2.4;
  const GEN = { x1: -0.95, z0: 0.85, y: 0.03 }; // genkan: x X0..x1, z z0..Z1, tiles at y
  const WIN = { x0: 0.05, x1: 1.0, y0: 0.95, y1: 2.0 };
  const WAIN = 0.85;

  // ---------- floor and genkan ----------
  { // one L-shaped slab (two boxes sharing a face would ink their seam): tops and bottoms as two rects, six sides
    const L = [[X0 - T, Z0 - T], [X1, Z0 - T], [X1, Z1], [GEN.x1, Z1], [GEN.x1, GEN.z0], [X0 - T, GEN.z0]];
    for (const y of [0, FT]) {
      const F = y ? onY(y) : { W: (u, v) => [u, 0, v], back: (u, v) => [u, 1, v] };
      rect("floor", F, X0 - T, X1, Z0 - T, GEN.z0);
      rect("floor", F, GEN.x1, X1, GEN.z0, Z1);
    }
    for (let i = 0; i < 6; i++) {
      const [a, b] = [L[i], L[(i + 1) % 6]], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const inward = i === 3 || i === 4 ? [mid[0] + (i === 3 ? 0.05 : 0), FT / 2, mid[1] + (i === 4 ? -0.05 : 0)] : [0, FT / 2, 0];
      quad("floor", [a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], FT, b[1]], [a[0], FT, a[1]], i === 3 ? [GEN.x1 + 0.05, FT / 2, (a[1] + b[1]) / 2] : i === 4 ? [(a[0] + b[0]) / 2, FT / 2, GEN.z0 - 0.05] : inward);
    }
  }
  const FL = onY(FT + 0.0008);
  for (let z = Z0 + 0.15, k = 0; z < Z1 - 0.05; z += 0.15, k++) {
    const xa = z > GEN.z0 ? GEN.x1 + 0.07 : X0;
    rect("seam", FL, xa, X1, z - 0.003, z + 0.003);
    for (let x = X0 + 0.3 + hash(k) * 1.1; x < X1 - 0.1; x += 1.1 + hash(k + 50) * 0.4)
      if (x > xa + 0.05) rect("seam", FL, x - 0.003, x + 0.003, z, Math.min(z + 0.15, Z1));
  }
  box("cream", X0 - T, GEN.x1, 0, GEN.y, GEN.z0, Z1); // tiles
  const TL = onY(GEN.y + 0.0008);
  for (let x = X0 + 0.25; x < GEN.x1 - 0.05; x += 0.25) rect("seam", TL, x - 0.004, x + 0.004, GEN.z0, Z1);
  for (let z = GEN.z0 + 0.25; z < Z1 - 0.05; z += 0.25) rect("seam", TL, X0, GEN.x1, z - 0.004, z + 0.004);
  box("wood", GEN.x1, GEN.x1 + 0.07, 0, FT + 0.012, GEN.z0, Z1); // step beam (agarikamachi)
  box("wood", X0, GEN.x1 + 0.07, 0, FT + 0.012, GEN.z0 - 0.07, GEN.z0);

  // ---------- walls ----------
  box("wall", X0 - T, X0, FT, CEIL, Z0 - T, GEN.z0); // -X wall
  box("wall", X0 - T, X0, GEN.y, CEIL, GEN.z0, Z1);
  box("wall", X0, WIN.x0, FT, CEIL, Z0 - T, Z0); // -Z wall, cut around the window
  box("wall", WIN.x1, X1, FT, CEIL, Z0 - T, Z0);
  box("wall", WIN.x0, WIN.x1, FT, WIN.y0, Z0 - T, Z0);
  box("wall", WIN.x0, WIN.x1, WIN.y1, CEIL, Z0 - T, Z0);
  box("wallInk", X0 - T, X0, 0, CEIL, Z0 - T, Z1);
  box("wallInk", X0, X1, 0, CEIL, Z0 - T, Z0);
  // wainscot and its rail
  box("cream", X0, X0 + 0.012, FT, WAIN, Z0, GEN.z0);
  box("cream", X0, X0 + 0.012, GEN.y, WAIN, GEN.z0, Z1);
  box("cream", X0, X1, FT, WAIN, Z0, Z0 + 0.012);
  box("wood", X0, X0 + 0.03, WAIN, WAIN + 0.04, Z0, Z1);
  box("wood", X0, X1, WAIN, WAIN + 0.04, Z0, Z0 + 0.03);
  for (let z = Z0 + 0.3; z < Z1 - 0.1; z += 0.3) rect("seam", onX(X0 + 0.013), z - 0.004, z + 0.004, z > GEN.z0 ? GEN.y : FT, WAIN);
  for (let x = X0 + 0.3; x < X1 - 0.1; x += 0.3) rect("seam", onZ(Z0 + 0.013), x - 0.004, x + 0.004, FT, WAIN);

  // ---------- window ----------
  const WZ = Z0 - 0.06, fw = 0.05;
  rect("pane", onZ(WZ), WIN.x0, WIN.x1, WIN.y0, WIN.y1);
  box("white", WIN.x0, WIN.x1, WIN.y0, WIN.y0 + fw, WZ, Z0);
  box("white", WIN.x0, WIN.x1, WIN.y1 - fw, WIN.y1, WZ, Z0);
  box("white", WIN.x0, WIN.x0 + fw, WIN.y0, WIN.y1, WZ, Z0);
  box("white", WIN.x1 - fw, WIN.x1, WIN.y0, WIN.y1, WZ, Z0);
  const wm = (WIN.x0 + WIN.x1) / 2;
  box("white", wm - 0.025, wm + 0.025, WIN.y0, WIN.y1, WZ, WZ + 0.04);
  const OUT = onZ(WZ + 0.002);
  fan("lime", OUT, disc(WIN.x0 + 0.25, WIN.y0 + 0.12, 0.26, 14, 0.22).filter((p) => p[1] > WIN.y0 + fw && p[0] > WIN.x0 + fw).concat([[WIN.x0 + fw, WIN.y0 + fw]]));
  fan("lime", OUT, disc(WIN.x1 - 0.18, WIN.y0 + fw + 0.02, 0.18, 12, 0.17).filter((p) => p[1] >= WIN.y0 + fw && p[0] < WIN.x1 - fw).concat([[WIN.x1 - fw, WIN.y0 + fw]]));
  fan("white", OUT, disc(WIN.x1 - 0.25, WIN.y1 - 0.22, 0.12, 12, 0.05));
  // short noren-like valance above (plain red, no lettering)
  box("red", WIN.x0 - 0.05, WIN.x1 + 0.05, WIN.y1 - 0.02, WIN.y1 + 0.14, Z0 + 0.02, Z0 + 0.05);
  for (const x of [WIN.x0 + 0.27, wm, WIN.x1 - 0.27]) rect("seam", onZ(Z0 + 0.0505), x - 0.005, x + 0.005, WIN.y1 - 0.02, WIN.y1 + 0.09);

  // window seat: a box bench with a red cushion
  const WS = { x0: -0.05, x1: 1.1, z1: Z0 + 0.45, y: FT + 0.32 };
  box("wood", WS.x0, WS.x1, FT, WS.y, Z0, WS.z1);
  rect("seam", onZ(WS.z1 + 0.0008), WS.x0 + 0.04, WS.x1 - 0.04, FT + 0.06, FT + 0.065);
  rect("seam", onZ(WS.z1 + 0.0008), wm - 0.004, wm + 0.004, FT + 0.065, WS.y - 0.03);
  blob("red", [(WS.x0 + WS.x1) / 2, WS.y + 0.04, (Z0 + WS.z1) / 2], [(WS.x1 - WS.x0) / 2 - 0.02, 0.05, (WS.z1 - Z0) / 2 - 0.02], 0.25, AX, 6, 16);
  const SEAT_TOP = WS.y + 0.085;

  // ---------- cat steps and the high shelf on the -Z wall ----------
  const STEPS = [[-0.55, 0.55], [-0.95, 0.85], [-0.55, 1.15], [-0.95, 1.45]];
  for (const [x, y] of STEPS) {
    box("wood", x - 0.16, x + 0.16, y - 0.04, y, Z0, Z0 + 0.25);
    box("lime", x - 0.14, x + 0.14, y, y + 0.012, Z0 + 0.01, Z0 + 0.23); // carpet pad
    box("wood", x - 0.015, x + 0.015, y - 0.18, y - 0.04, Z0, Z0 + 0.03); // bracket
    box("wood", x - 0.015, x + 0.015, y - 0.08, y - 0.04, Z0 + 0.03, Z0 + 0.2);
  }
  const SH = { x0: X0, x1: -0.62, y: 1.85, z1: Z0 + 0.32 };
  box("wood", SH.x0, SH.x1, SH.y - 0.05, SH.y, Z0, SH.z1);
  box("lime", SH.x0, SH.x1 - 0.02, SH.y, SH.y + 0.012, Z0 + 0.01, SH.z1 - 0.02);
  for (const x of [SH.x1 - 0.12, -1.45]) {
    box("wood", x - 0.015, x + 0.015, SH.y - 0.25, SH.y - 0.05, Z0, Z0 + 0.03);
    box("wood", x - 0.015, x + 0.015, SH.y - 0.11, SH.y - 0.05, Z0 + 0.03, SH.z1 - 0.04);
  }

  // ---------- cat tower against the -X wall ----------
  const TW = { x0: -1.76, x1: -1.1, z0: -0.85, z1: -0.15 };
  box("lime", TW.x0, TW.x1, FT, FT + 0.05, TW.z0, TW.z1); // base
  const TB = FT + 0.05;
  box("wood", TW.x0 + 0.02, TW.x0 + 0.42, TB, TB + 0.4, TW.z0 + 0.02, TW.z0 + 0.42); // hidey cube
  fan("seam", onX(TW.x0 + 0.4208), disc(TW.z0 + 0.22, TB + 0.19, 0.11, 16));
  box("lime", TW.x0 + 0.02, TW.x0 + 0.42, TB + 0.4, TB + 0.415, TW.z0 + 0.02, TW.z0 + 0.42);
  function post(x, z, y0, y1) {
    cyl("cream", x, z, y0, y1, 0.05, 10);
    for (let y = y0 + 0.045; y < y1 - 0.02; y += 0.06) cyl("seam", x, z, y, y + 0.008, 0.0515, 10);
  }
  const P1 = { y: 0.62, x0: -1.62, x1: -1.06, z0: -0.48, z1: -0.08 };
  const P2 = { y: 1.12, x0: -1.78, x1: -1.1, z0: -0.86, z1: -0.3 };
  post(-1.2, -0.25, TB, P1.y - 0.04);
  post(-1.6, -0.75, TB + 0.415, P2.y - 0.04);
  post(-1.3, -0.4, P1.y, P2.y - 0.04);
  post(-1.62, -0.45, P2.y, 1.58);
  for (const p of [P1, P2]) {
    box("wood", p.x0, p.x1, p.y - 0.04, p.y, p.z0, p.z1);
    box("lime", p.x0 + 0.01, p.x1 - 0.01, p.y, p.y + 0.015, p.z0 + 0.01, p.z1 - 0.01);
  }
  // round bed on top
  const BED = [-1.52, -0.5];
  cyl("red", BED[0], BED[1], 1.58, 1.625, 0.25, 18);
  cyl("cream", BED[0], BED[1], 1.625, 1.635, 0.19, 18); // the cushion inside
  for (let i = 0; i < 12; i++) { // the rim: a ring of short rods
    const a0 = (i / 12) * Math.PI * 2, a1 = ((i + 1.15) / 12) * Math.PI * 2, r = 0.215;
    rod("red", [BED[0] + r * Math.cos(a0), 1.655, BED[1] + r * Math.sin(a0)], [BED[0] + r * Math.cos(a1), 1.655, BED[1] + r * Math.sin(a1)], 0.04, 6);
  }
  // dangling pom from the lower platform's edge
  rod("seam", [-1.1, P1.y - 0.04, -0.12], [-1.1, P1.y - 0.3, -0.12], 0.004, 4);
  blob("red", [-1.1, P1.y - 0.33, -0.12], [0.035, 0.035, 0.035], 1, AX, 5, 8);

  // ---------- counter ----------
  const CT = { x0: 1.15, x1: 1.8, z0: Z0, z1: -0.75, y: FT + 0.9 };
  box("red", CT.x0 + 0.03, CT.x1, FT, CT.y - 0.04, CT.z0, CT.z1 - 0.03);
  box("wood", CT.x0, CT.x1, CT.y - 0.04, CT.y, CT.z0, CT.z1);
  box("wood", CT.x0 + 0.03, CT.x1, FT, FT + 0.06, CT.z0, CT.z1 - 0.03 + 0.005); // kick
  for (const z of [-1.2, -0.95]) rect("seam", onX(CT.x0 + 0.0295), z - 0.004, z + 0.004, FT + 0.1, CT.y - 0.1);
  // cake dome on a stand and a treat jar
  lathe("white", [[0, CT.y], [0.04, CT.y], [0.02, CT.y + 0.06], [0.14, CT.y + 0.065], [0.14, CT.y + 0.075], [0, CT.y + 0.075]], 1.5, -1.25, 16);
  lathe("white", [[0, CT.y + 0.075], [0.12, CT.y + 0.075], [0.12, CT.y + 0.14], [0.09, CT.y + 0.2], [0.03, CT.y + 0.22], [0.02, CT.y + 0.25], [0, CT.y + 0.25]], 1.5, -1.25, 16);
  lathe("red", [[0, CT.y + 0.076], [0.07, CT.y + 0.076], [0.07, CT.y + 0.12], [0, CT.y + 0.12]], 1.5, -1.25, 12); // a cake inside
  lathe("cream", [[0, CT.y], [0.06, CT.y], [0.065, CT.y + 0.13], [0.04, CT.y + 0.14], [0, CT.y + 0.14]], 1.48, -0.92, 12);
  cyl("red", 1.48, -0.92, CT.y + 0.14, CT.y + 0.165, 0.045, 12);
  // blank menu board above the counter
  box("wood", CT.x0 + 0.02, CT.x1 - 0.05, 1.45, 1.95, Z0, Z0 + 0.025);
  box("cream", CT.x0 + 0.05, CT.x1 - 0.08, 1.48, 1.92, Z0 + 0.025, Z0 + 0.03);
  for (let i = 0; i < 5; i++) rect("seam", onZ(Z0 + 0.031), CT.x0 + 0.1, CT.x0 + 0.3 + 0.08 * hash(i), 1.83 - i * 0.08, 1.845 - i * 0.08);
  for (let i = 0; i < 5; i++) rect("red", onZ(Z0 + 0.031), CT.x1 - 0.18, CT.x1 - 0.12, 1.83 - i * 0.08, 1.845 - i * 0.08);

  // ---------- potted plant by the counter ----------
  const PL = [-1.45, -1.28];
  lathe("red", [[0, FT], [0.1, FT], [0.13, FT + 0.28], [0.145, FT + 0.28], [0.145, FT + 0.32], [0, FT + 0.32]], PL[0], PL[1], 14);
  for (let i = 0; i < 12; i++) {
    const a = i * 2.39996, up = 0.35 + 0.55 * hash(i + 3), lean = 0.45 + 0.55 * hash(i + 11);
    const base = [PL[0] + 0.02 * Math.cos(a), FT + 0.3, PL[1] + 0.02 * Math.sin(a)];
    const tip = [PL[0] + lean * 0.2 * Math.cos(a), FT + 0.3 + up * 0.6, PL[1] + lean * 0.24 * Math.sin(a)];
    rod("green", base, tip, 0.006, 4);
    const d = nrm([Math.cos(a) * lean, 0.25 + 0.5 * hash(i), Math.sin(a) * lean * 0.8]);
    const ex = nrm(cross([0, 1, 0], d)), ey = cross(d, ex);
    blob("green", add(tip, mul(d, 0.09)), [0.065, 0.01, 0.13], 1, [ex, ey, d], 4, 8);
  }

  // ---------- paw-print sign on the -X wall ----------
  place(X0, 1.55, 0.35, 0, 0, -Math.PI / 2);
  lathe("wood", [[0, 0], [0.2, 0], [0.2, 0.025], [0, 0.025]], 0, 0, 20);
  place();
  const PS = onX(X0 + 0.0255), PS2 = onX(X0 + 0.027);
  fan("cream", PS, disc(0.35, 1.55, 0.175, 20));
  fan("seam", PS2, disc(0.35, 1.51, 0.06, 12, 0.05));
  for (const [du, dv] of [[-0.075, 0.04], [-0.03, 0.085], [0.03, 0.085], [0.075, 0.04]]) fan("seam", PS2, disc(0.35 + du, 1.55 + dv, 0.024, 8, 0.028));

  // ---------- low tables, zabuton, drinks ----------
  function cup(x, z, y, drink) {
    cyl("white", x, z, y, y + 0.008, 0.06, 12); // saucer
    lathe("white", [[0, y + 0.008], [0.032, y + 0.008], [0.042, y + 0.08], [0.036, y + 0.08], [0.033, y + 0.07], [0, y + 0.07]], x, z, 12);
    fan(drink, onY(y + 0.0705), disc(x, z, 0.034, 12));
    rod("white", [x + 0.04, y + 0.065, z], [x + 0.06, y + 0.04, z], 0.008, 5); // handle
  }
  function table(x, z, yaw, drinks) {
    place(x, FT, z, yaw);
    const ty = 0.32;
    box("wood", -0.35, 0.35, ty - 0.035, ty, -0.25, 0.25);
    for (const [lx, lz] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) box("wood", lx - 0.025, lx + 0.025, 0, ty - 0.035, lz - 0.025, lz + 0.025);
    drinks.forEach(([dx, dz, d]) => cup(dx, dz, ty, d));
    place();
  }
  function zabuton(x, z, yaw, key) {
    place(x, FT, z, yaw);
    blob(key, [0, 0.04, 0], [0.24, 0.045, 0.24], 0.25, AX, 6, 16);
    blob("seam", [0, 0.083, 0], [0.018, 0.008, 0.018], 1, AX, 3, 6); // tuft
    place();
  }
  table(0.6, -0.6, 0.05, [[-0.15, 0.08, "green"], [0.18, -0.05, "floor"]]);
  zabuton(0.62, -0.1, 0.1, "lime");
  zabuton(1.22, -0.48, 0.05, "red");
  table(-0.35, -0.25, -0.2, [[0.1, 0.06, "red"]]);
  zabuton(-0.25, 0.25, -0.15, "cream");
  zabuton(-0.32, -0.8, 0.2, "red");

  // ---------- toys ----------
  blob("red", [1.0, FT + 0.045, 1.2], [0.045, 0.045, 0.045], 1, AX, 6, 10);
  // feather wand: a wood stick, a string, three feathers
  const WA = [0.0, FT + 0.012, 1.45], WB = [-0.5, FT + 0.012, 1.22], WF = [-0.8, FT + 0.02, 0.92];
  rod("wood", WA, WB, 0.009, 6);
  rod("seam", WB, WF, 0.003, 4);
  [["red", 0.4], ["lime", 0.95], ["red", -0.2]].forEach(([k, a]) => {
    const d = [Math.cos(a), 0, -Math.sin(a)], ex = nrm(cross([0, 1, 0], d));
    blob(k, add(WF, mul(d, 0.06)), [0.015, 0.006, 0.065], 1, [ex, [0, 1, 0], d], 4, 8);
  });

  // ---------- genkan: slipper rack and slippers ----------
  function slipper(x, z, yaw, key) {
    place(x, FT, z, yaw);
    box(key, -0.045, 0.045, 0, 0.02, -0.12, 0.12);
    blob(key, [0, 0.025, 0.06], [0.05, 0.04, 0.065], 0.8, AX, 5, 10);
    place();
  }
  const RK = { x0: X0, x1: X0 + 0.3, z0: 0.95, z1: 1.52, y1: 0.78 };
  box("wood", RK.x0, RK.x1, GEN.y, RK.y1, RK.z0, RK.z0 + 0.025);
  box("wood", RK.x0, RK.x1, GEN.y, RK.y1, RK.z1 - 0.025, RK.z1);
  box("wood", RK.x0, RK.x1, RK.y1 - 0.025, RK.y1, RK.z0, RK.z1);
  [GEN.y + 0.04, 0.3, 0.54].forEach((y, i) => {
    box("wood", RK.x0, RK.x1, y - 0.02, y, RK.z0 + 0.025, RK.z1 - 0.025);
    const k = ["red", "lime", "cream"][i];
    for (const dz of [0.14, 0.26]) {
      place(RK.x0 + 0.15, y, RK.z0 + dz, Math.PI / 2);
      box(k, -0.04, 0.04, 0, 0.018, -0.11, 0.11);
      blob(k, [0, 0.018, 0.055], [0.045, 0.04, 0.06], 0.8, AX, 5, 10);
      place();
    }
  });
  slipper(-0.82, 1.15, -Math.PI / 2, "red");
  slipper(-0.82, 1.27, -Math.PI / 2, "red");
  slipper(-0.72, 1.0, -Math.PI / 2 + 0.3, "lime");

  // ---------- cats ----------
  // A cat is drawn in its own frame: faces +Z, stands on y = 0 of the frame, its left is +X. Head radii HR.
  const HR = [0.12, 0.105, 0.1];
  const TAILS = []; // { M, pts, r0, amp, axis, ph, coat }
  const COATS = ["ginger", "pale", "dark"];
  let catM = null;
  // a point on the head ellipsoid toward d, its normal, and a tangent basis (ex along the head's x)
  function onHead(H, d) {
    const dn = nrm(d);
    const p = add(H, [dn[0] * HR[0], dn[1] * HR[1], dn[2] * HR[2]]);
    const n = nrm([dn[0] / HR[0], dn[1] / HR[1], dn[2] / HR[2]]);
    let ex = sub([1, 0, 0], mul(n, n[0]));
    if (Math.hypot(...ex) < 0.2) ex = sub([0, 0, -1], mul(n, -n[2]));
    ex = nrm(ex);
    return { p, n, ex, ey: cross(n, ex) };
  }
  function decal(key, H, d, w, h, out = 0, rot = 0) {
    const { p, n, ex, ey } = onHead(H, d);
    const a = add(mul(ex, Math.cos(rot)), mul(ey, Math.sin(rot))), b = add(mul(ey, Math.cos(rot)), mul(ex, -Math.sin(rot)));
    blob(key, add(p, mul(n, out)), [w, h, 0.007], 1, [a, b, n], 4, 8);
  }
  function ear(key, H, side) {
    const { p, n } = onHead(H, [side * 0.55, 0.85, 0.1]);
    const ex = nrm(sub([1, 0, 0], mul(n, n[0]))), ez = cross(ex, n);
    const b = add(p, mul(n, -0.02));
    const base = [add(b, mul(ex, -0.05)), add(b, mul(ez, 0.03)), add(b, mul(ex, 0.05)), add(b, mul(ez, -0.03))];
    const apex = add(add(p, mul(n, 0.075)), [side * 0.012, 0.012, 0.005]);
    const ref = mul(add(add(base[0], base[2]), apex), 1 / 3);
    for (let i = 0; i < 4; i++) tri(key, base[i], base[(i + 1) % 4], apex, ref);
    quad(key, base[0], base[1], base[2], base[3], ref);
  }
  // head with ears, eyes (open, content or shut), nose; coat gives the colour keys
  function head(coat, H, eyes = "open", tabby = false) {
    const k = coat;
    blob(k, H, HR, 0.92, AX, 8, 14);
    ear(k, H, 1), ear(k, H, -1);
    // muzzle puffs
    for (const s of [1, -1]) blob(k === "dark" ? "dark" : k, add(H, [s * 0.03, -0.045, 0.075]), [0.035, 0.03, 0.028], 1, AX, 4, 8);
    const eyeKey = k === "dark" ? "pane" : "seam";
    for (const s of [1, -1]) {
      const d = [s * 0.42, 0.12, 0.9];
      if (eyes === "open") {
        decal(eyeKey, H, d, 0.02, 0.026);
        if (k === "dark") decal("seam", H, d, 0.007, 0.022, 0.003);
      } else if (eyes === "content") decal("seam", H, d, 0.024, 0.009, 0, s * 0.15);
      else decal("seam", H, [s * 0.42, 0.06, 0.9], 0.026, 0.006, 0, -s * 0.25);
    }
    decal(k === "dark" ? "pane" : "red", H, [0, -0.25, 1], 0.014, 0.01, 0.006); // nose
    if (tabby) for (const [x, a] of [[-0.25, -0.25], [0, 0], [0.25, 0.25]]) decal("seam", H, [x, 0.75, 0.62], 0.008, 0.032, 0.001, a);
  }
  function tail(coat, pts, r0, amp, axis, ph) {
    TAILS.push({ M: catM.clone(), pts, r0, amp, axis: nrm(axis), ph, coat: COATS.indexOf(coat) });
  }
  function catPlace(name, x, y, z, yaw) {
    place(x, y, z, yaw);
    catM = M.clone();
  }
  function anchorCat(name, H) {
    const a = new THREE.Group();
    a.name = name;
    v3.set(...H).applyMatrix4(catM);
    a.position.copy(v3);
    set.add(a);
    joints[name] = a;
  }

  // 1 sitting ginger tabby, front of the room, facing the camera
  function catSit() {
    catPlace("catSit", 0.4, FT, 0.9, 0.7);
    const k = "ginger", H = [0, 0.47, 0.07];
    blob(k, [0, 0.13, -0.03], [0.135, 0.13, 0.14], 1, AX, 8, 14); // haunches
    blob(k, [0, 0.27, 0.035], [0.1, 0.15, 0.09], 1, rotX(-0.25), 8, 14); // chest
    blob("pale", [0, 0.3, 0.085], [0.06, 0.09, 0.04], 1, rotX(-0.25), 6, 10); // white bib
    for (const s of [1, -1]) {
      rod(k, [s * 0.045, 0.3, 0.08], [s * 0.05, 0.03, 0.12], 0.027, 6, 0.024);
      blob("pale", [s * 0.05, 0.022, 0.135], [0.03, 0.022, 0.038], 1, AX, 4, 8);
      blob(k, [s * 0.105, 0.04, 0.05], [0.036, 0.035, 0.07], 1, AX, 5, 10); // hind feet
    }
    for (const [y, z] of [[0.2, -0.13], [0.12, -0.16]]) for (const s of [1, -1]) // flank stripes
      blob("seam", [s * 0.115, y, z + 0.04], [0.006, 0.06, 0.02], 1, rotX(0.4), 3, 6);
    head(k, H, "open", true);
    tail(k, [[0, 0.07, -0.13], [0, 0.05, -0.27], [0, 0.17, -0.36], [0.0, 0.33, -0.37], [0.04, 0.42, -0.3]], 0.026, 0.5, [0, 0, 1], 0);
    anchorCat("catSit", H);
  }
  // 2 ginger loaf on the tower's upper platform, facing out
  function catLoaf() {
    catPlace("catLoaf", -1.38, P2.y + 0.015, -0.55, Math.PI / 2 - 0.25);
    const k = "ginger", H = [0, 0.21, 0.17];
    blob(k, [0, 0.11, -0.02], [0.135, 0.11, 0.2], 0.7, AX, 8, 14);
    blob("pale", [0, 0.1, 0.13], [0.07, 0.07, 0.05], 1, AX, 5, 10); // chest
    head(k, H, "content");
    tail(k, [[0.06, 0.05, -0.18], [0.14, 0.03, -0.14], [0.17, 0.03, -0.0], [0.14, 0.03, 0.12]], 0.026, 0.35, [0, 1, 0], 1.3);
    anchorCat("catLoaf", H);
  }
  // 3 calico peeking out of a cardboard box
  function catBox(withCat) {
    catPlace("catBox", 1.3, FT, 0.25, 0.9);
    const bw = 0.22, bd = 0.19, bh = 0.27, t = 0.015;
    box("wood", -bw, bw, 0, t, -bd, bd);
    box("wood", -bw, bw, 0, bh, bd - t, bd);
    box("wood", -bw, bw, 0, bh, -bd, -bd + t);
    box("wood", -bw, -bw + t, 0, bh, -bd, bd);
    box("wood", bw - t, bw, 0, bh, -bd, bd);
    rect("seam", { W: (u, v) => [u, v, bd + 0.0008], back: (u, v) => [u, v, 0] }, -0.03, 0.03, bh - 0.08, bh); // tape
    // flaps hinged at the rim, leaning out
    const flap = (a, b, out, len, lean) => { // a, b rim corners; out unit outward
      const up = [out[0] * Math.sin(lean), Math.cos(lean), out[2] * Math.sin(lean)];
      const a2 = add(a, mul(up, len)), b2 = add(b, mul(up, len));
      const th = mul(out, t);
      hex("wood", [a, b, add(b, th), add(a, th), a2, b2, add(b2, th), add(a2, th)]);
    };
    flap([-bw, bh, bd], [bw, bh, bd], [0, 0, 1], 0.15, 1.1);
    flap([-bw, bh, -bd], [bw, bh, -bd], [0, 0, -1], 0.15, 0.6);
    flap([bw, bh, -bd], [bw, bh, bd], [1, 0, 0], 0.13, 1.25);
    flap([-bw, bh, -bd], [-bw, bh, bd], [-1, 0, 0], 0.13, 0.4);
    if (!withCat) return;
    const k = "pale", H = [0, 0.43, 0.04];
    blob(k, [0, 0.22, -0.02], [0.13, 0.13, 0.13], 1, AX, 8, 14);
    blob("ginger", [0.07, 0.3, -0.06], [0.09, 0.06, 0.09], 1, AX, 6, 10); // calico patches
    blob("dark", [-0.08, 0.29, -0.08], [0.07, 0.05, 0.08], 1, AX, 6, 10);
    head(k, H, "open");
    blob("ginger", add(H, [0.06, 0.05, -0.005]), [0.075, 0.07, 0.085], 1, AX, 6, 10); // head patch over one ear side
    blob("dark", add(H, [-0.065, 0.045, -0.015]), [0.07, 0.065, 0.08], 1, AX, 6, 10);
    for (const s of [1, -1]) blob(k, [s * 0.07, bh + 0.02, bd - 0.005], [0.035, 0.028, 0.045], 1, AX, 5, 8); // paws on the rim
    tail("ginger", [[0, 0.24, -0.12], [0.0, 0.31, -0.19], [0.0, 0.42, -0.24], [0.05, 0.52, -0.22]], 0.024, 0.55, [0, 0, 1], 2.1);
    anchorCat("catBox", H);
  }
  // 4 tuxedo in a play-bow stretch on the floor near the tower
  function catStretch() {
    catPlace("catStretch", -0.4, FT, 0.5, -0.85);
    const k = "dark", H = [0, 0.19, 0.29];
    blob(k, [0, 0.2, -0.04], [0.1, 0.09, 0.25], 1, rotX(0.3), 8, 14);
    blob("pale", [0, 0.15, 0.13], [0.065, 0.06, 0.08], 1, rotX(0.3), 5, 10); // white chest
    for (const s of [1, -1]) {
      rod(k, [s * 0.06, 0.24, -0.2], [s * 0.065, 0.03, -0.24], 0.032, 6, 0.024);
      blob("pale", [s * 0.065, 0.022, -0.22], [0.03, 0.022, 0.045], 1, AX, 4, 8);
      rod(k, [s * 0.05, 0.13, 0.15], [s * 0.055, 0.03, 0.38], 0.026, 6, 0.022);
      blob("pale", [s * 0.055, 0.022, 0.4], [0.03, 0.022, 0.042], 1, AX, 4, 8);
    }
    head(k, H, "shut");
    tail(k, [[0, 0.26, -0.26], [0, 0.34, -0.33], [0, 0.47, -0.36], [0.02, 0.58, -0.31]], 0.026, 0.6, [0, 0, 1], 3.0);
    anchorCat("catStretch", H);
  }
  // 5 white cat curled asleep on the window seat
  function catCurl() {
    catPlace("catCurl", 0.32, SEAT_TOP - 0.01, (Z0 + WS.z1) / 2 + 0.02, 0.35);
    const k = "pale", H = [0.08, 0.14, 0.09];
    blob(k, [0, 0.085, 0], [0.2, 0.085, 0.16], 0.85, AX, 8, 14);
    blob("ginger", [-0.07, 0.15, -0.04], [0.07, 0.03, 0.06], 1, AX, 5, 8); // one honey patch
    head(k, H, "shut");
    tail(k, [[-0.17, 0.05, -0.06], [-0.18, 0.05, 0.07], [-0.08, 0.045, 0.16], [0.06, 0.045, 0.19], [0.16, 0.045, 0.15]], 0.026, 0.25, [0, 1, 0], 4.2);
    anchorCat("catCurl", H);
  }
  // 6 dark cat on the high shelf, lying along it, a paw and its tail hanging over the edge
  function catShelf() {
    catPlace("catShelf", -1.15, SH.y + 0.012, Z0 + 0.17, Math.PI / 2);
    const k = "dark", H = [-0.04, 0.2, 0.2];
    blob(k, [0, 0.1, -0.02], [0.13, 0.1, 0.21], 0.8, AX, 8, 14);
    rod(k, [-0.07, 0.06, 0.13], [-0.17, 0.02, 0.15], 0.025, 6, 0.023);
    rod(k, [-0.17, 0.02, 0.15], [-0.18, -0.15, 0.15], 0.023, 6, 0.021);
    blob(k, [-0.18, -0.16, 0.15], [0.03, 0.025, 0.035], 1, AX, 4, 8);
    blob(k, [0.05, 0.03, 0.17], [0.03, 0.025, 0.06], 1, AX, 4, 8); // tucked paw
    head(k, H, "open");
    tail(k, [[-0.06, 0.07, -0.18], [-0.15, 0.04, -0.2], [-0.18, -0.08, -0.21], [-0.18, -0.28, -0.19], [-0.16, -0.4, -0.15]], 0.024, 0.45, [1, 0, 0], 5.1);
    anchorCat("catShelf", H);
  }
  const ORDER = [catSit, catLoaf, () => catBox(true), catStretch, catCurl, catShelf];
  ORDER.forEach((f, i) => (i < nCats ? f() : i === 2 ? catBox(false) : null));
  place();

  // ---------- meshes ----------
  const MAT = { // [base, shade, threshold, ink px (0 = no hull)]
    wall: [c.wall, c.wallShade, 0.1, 0],
    floor: [c.floor, c.floorShade, 0.1, 2.5],
    wood: [c.wood, c.woodShade, 0.1, 2],
    white: [c.white, c.whiteShade, 0.1, 2],
    cream: [c.cream, c.creamShade, 0.1, 2],
    red: [c.red, c.redShade, 0.0, 2],
    lime: [c.lime, c.limeShade, 0.05, 2],
    green: [c.green, c.greenShade, 0.15, 1.5],
    seam: [c.seam, c.seam, 0.1, 0],
    pane: [c.pane, c.pane, -1, 0],
    ginger: [c.ginger, c.gingerShade, 0.15, 2.5],
    pale: [c.pale, c.paleShade, 0.15, 2.5],
    dark: [c.dark, c.darkShade, 0.1, 2.5],
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

  // ---------- tails: one mesh, a geometry group per coat, vertices rewritten by pose() ----------
  const TN = 10, TS = 6; // segments along, sides around
  TAILS.sort((a, b) => a.coat - b.coat);
  const perTail = (TN * TS * 2 + TS * 2) * 3; // tube + two end fans, vertices
  const TP = new Float32Array(TAILS.length * perTail * 3), TNm = new Float32Array(TP.length);
  const vA = new THREE.Vector3(), q4 = new THREE.Quaternion(), axW = new THREE.Vector3();
  const cr = (p0, p1, p2, p3, u) => p1.map((_, i) => 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * u + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * u * u + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * u * u * u));
  function centreline(pts) { // Catmull-Rom through the control points, TN + 1 samples
    const n = pts.length - 1, out = [];
    for (let i = 0; i <= TN; i++) {
      const f = (i / TN) * n, k = Math.min(n - 1, Math.floor(f)), u = f - k;
      out.push(cr(pts[Math.max(0, k - 1)], pts[k], pts[k + 1], pts[Math.min(n, k + 2)], u));
    }
    return out;
  }
  function writeTails(time) {
    let o = 0;
    const put = (p, n) => (TP.set(p, o), TNm.set(n, o), (o += 3));
    for (const tl of TAILS) {
      const cl = centreline(tl.pts), b = cl[0];
      // swish: each sample turns about the tail's axis through its root by a travelling wave
      const pts = cl.map((p, i) => {
        const s = i / TN;
        const ang = time == null ? 0 : tl.amp * Math.pow(s, 1.2) * Math.sin((2 * Math.PI * time) / 2 + tl.ph - 2.2 * s);
        q4.setFromAxisAngle(axW.set(...tl.axis), ang);
        vA.set(...sub(p, b)).applyQuaternion(q4).add(axW.set(...b)).applyMatrix4(tl.M);
        return [vA.x, vA.y, vA.z];
      });
      const tan = pts.map((p, i) => nrm(sub(pts[Math.min(TN, i + 1)], pts[Math.max(0, i - 1)])));
      // parallel-transported frames
      let e1 = nrm(cross(tan[0], Math.abs(tan[0][1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]));
      const rings = pts.map((p, i) => {
        if (i) e1 = nrm(sub(e1, mul(tan[i], dot(e1, tan[i]))));
        const e2 = cross(tan[i], e1), r = tl.r0 * (1 - 0.45 * (i / TN));
        return Array.from({ length: TS }, (_, j) => {
          const a = (j / TS) * Math.PI * 2, d = add(mul(e1, Math.cos(a)), mul(e2, Math.sin(a)));
          return [add(p, mul(d, r)), d];
        });
      });
      for (let i = 0; i < TN; i++)
        for (let j = 0; j < TS; j++) {
          const k = (j + 1) % TS, A = rings[i][j], B = rings[i][k], C = rings[i + 1][k], D = rings[i + 1][j];
          // e2 = t x e1, so the ring runs counter-clockwise about the tangent and (A, B, C) faces out
          for (const v of [A, B, C, A, C, D]) put(v[0], v[1]);
        }
      const ends = [[0, mul(tan[0], -1), add(pts[0], mul(tan[0], -tl.r0 * 0.5))], [TN, tan[TN], add(pts[TN], mul(tan[TN], tl.r0 * 0.6))]];
      for (const [i, n, tip] of ends)
        for (let j = 0; j < TS; j++) {
          const k = (j + 1) % TS, A = rings[i][j], B = rings[i][k];
          const fwd = dot(cross(sub(B[0], A[0]), sub(tip, A[0])), n) > 0;
          for (const v of fwd ? [A, B, [tip, n]] : [A, [tip, n], B]) put(v[0], v[1]);
        }
    }
  }
  writeTails(null);
  let tailGeo = null;
  if (TAILS.length) {
    tailGeo = new THREE.BufferGeometry();
    tailGeo.setAttribute("position", new THREE.BufferAttribute(TP, 3));
    tailGeo.setAttribute("normal", new THREE.BufferAttribute(TNm, 3));
    tailGeo.setAttribute("hullNormal", new THREE.BufferAttribute(TNm, 3)); // smooth already: the hull follows the tube
    let start = 0;
    COATS.forEach((coat, m) => {
      const cnt = TAILS.filter((t) => t.coat === m).length * perTail;
      if (cnt) tailGeo.addGroup(start, cnt, m);
      start += cnt;
    });
    const mats = COATS.map((k) => kit.cel(MAT[k][0], MAT[k][1], { threshold: MAT[k][2] }));
    const mesh = kit.outline(new THREE.Mesh(tailGeo, mats), { px: 2.5 });
    mesh.name = "tails";
    mesh.frustumCulled = false;
    set.add(mesh);
  }

  const anchor = (name, x, y, z) => { const a = new THREE.Group(); a.name = name; a.position.set(x, y, z); set.add(a); joints[name] = a; };
  anchor("floor", 0, FT, 0);
  anchor("tower", -1.43, P2.y, -0.55);
  anchor("window", wm, (WIN.y0 + WIN.y1) / 2, Z0);
  anchor("counter", (CT.x0 + CT.x1) / 2, CT.y, (CT.z0 + CT.z1) / 2);

  // ---------- poses and the clip ----------
  const CLIPS = { tail: 2 };
  function applyTails(t) {
    if (!tailGeo) return;
    writeTails(t);
    tailGeo.attributes.position.needsUpdate = tailGeo.attributes.normal.needsUpdate = tailGeo.attributes.hullNormal.needsUpdate = true;
    tailGeo.computeBoundingSphere(), tailGeo.computeBoundingBox();
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`neko-cafe: no clip "${m[1]}" (clips: tail)`);
      applyTails(((+m[2] % 2) + 2) % 2);
    } else if (name === "rest") applyTails(null);
    else throw new Error(`neko-cafe: unknown pose "${name}" (rest, or tail@<seconds>)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
