// bedroom.js - a teenager's Western-style bedroom: the anime heroine's room of every slice-of-life opening, static set.
// Contract: harness/lab/README.md. Meters, +Y up, the room's open (cutaway) sides face +X and +Z so a camera in the
// lit front-left quadrant looks in; the -Z wall holds the window, the desk and the bookshelf, the -X wall the bed, the
// posters and the closet. Stands on y = 0 (the floorboards' top is y = 0.02, joints.floor), centred on the room.
//
// Construction (boxes, lathes, superellipsoid blobs and lofted sheets, all triangle soups merged per material; boxes
// are flat shaded so furniture reads crisp, blobs and curtains carry analytic normals so cloth reads soft; every closed
// part is wound away from a point inside it, never by hand):
//   SHELL    floorboards (a slab with dark seams every 0.15 m and staggered butt joints), two walls 0.1 thick with a
//            skirting board, the -Z wall cut around a two-pane window (white frame, mullion, sill, a bright pane with
//            two treetops and a cloud outside). Closed (cutaway false): the +X wall with a door, the +Z wall, a ceiling.
//   BED      a white frame on short legs with a tall headboard and a low footboard, a cream mattress, a light green
//            duvet (a boxy superellipsoid that drapes past the frame) with its top folded back in a roll, one pillow.
//   DESK     under the window: white top on a side panel and a three-drawer pedestal, a desk lamp (round base, two-arm
//            stem, closed conical shade), a closed laptop, a stack of three books, a pencil cup; a white chair pulled out.
//   SHELF    a five-shelf white bookcase right of the window; books from a hash (sin-fract, no Math.random) of the
//            shelf and slot: width 2.4-5 cm, height 19-30 cm, colour from six script tones, a few lying flat.
//   WINDOW   a curtain rod with finials and two red curtains lofted as wave sheets, tied back at 1.3 m; a potted
//            plant (terracotta pot, leaf blobs on stems) between the bed and the desk.
//   DECOR    a red round rug with a cream ring, three blank posters (simple circles, triangles, stripes; no text, no
//            characters), a wall clock (red rim, cream face, ticks and hands) above the bookshelf; a sliding-door
//            closet on the -X wall at the front (two white doors on two tracks, dark finger pulls).
// Proportions (real size, base unit the ceiling 2.4 m): room 3.6 x 3.6 inside, walls 0.1, ceiling 2.4 (meta.height);
//   bed 0.95 x 2.05, mattress top 0.48, duvet top 0.6; desk 1.15 x 0.58 at 0.74; chair seat 0.47; bookcase 0.58 x
//   0.3 x 1.8; window 1.1 x 1.1, sill 0.95; closet 0.6 x 1.15 x 2.15; rug r 0.8; posters 0.42 x 0.58; clock r 0.14.
// Options: build(THREE, kit, colors, { height, cutaway = true, night = false }).
//   height  scales the whole set so the wall top is `height` (default 2.4).
//   cutaway leaves out the +X and +Z walls and the ceiling (true by default); false closes the room.
//   night   the window pane goes dark (hair) with a moon and stars, the lamp shade glows practical (no shade tone),
//           a pool of practical light on the desk. Same script; the room itself keeps its day tones (meadow has no
//           dark blue, and a room dropped to its green shades read as a different place, not as night).
// Ink: the walls are drawn without a hull; whole-wall twins ("wallInk", hull only) ink their silhouettes, so the
//   pieces cut around the window show no seams. Hulls are 1.5-2.5 px: a room is seen small, books stay coloured.
// Colours (meadow; walls/white/floor/seams/... are roles in meta.colors): walls sky #d7ecef (flat); white
//   furniture, trim, frames, chair, closet sclera #f6f3ee / sky; floorboards and honey parts (books, poster) practical
//   #f2c94c / skin #f0c2ae; seams, handles, hands, rod hair #2c5131 (flat); duvet and lamp shade line #a9d16e / iris
//   #3f8a47; red parts (rug, curtains, pot, books, poster shapes) accent #d9483b / hair; leaves and green books iris /
//   hair; cream parts (mattress, pillow, rug ring, clock face, posters) moon #f7f3e1 / sky; window pane moon / sky
//   by day, hair at night; glow practical.
// Meshes: 11 (12 at night). ~6.6k triangles.
// Joints: anchors floor, bed, desk, chair, window.

export const meta = {
  name: "bedroom",
  height: 2.4,
  script: "meadow",
  colors: {
    wall: "#d7ecef", wallShade: "#d7ecef",
    white: "#f6f3ee", whiteShade: "#d7ecef",
    floor: "#f2c94c", floorShade: "#f0c2ae",
    honey: "#f2c94c", honeyShade: "#f0c2ae",
    seam: "#2c5131",
    duvet: "#a9d16e", duvetShade: "#3f8a47",
    red: "#d9483b", redShade: "#2c5131",
    green: "#3f8a47", greenShade: "#2c5131",
    cream: "#f7f3e1", creamShade: "#d7ecef",
    pane: "#f7f3e1", paneShade: "#d7ecef",
    night: "#2c5131",
    glow: "#f2c94c",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height, cutaway = true, night = false } = opts;
  const c = { ...meta.colors, ...colors };
  const root = new THREE.Group();
  root.name = "bedroom";
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

  // ---------- dimensions ----------
  const X0 = -1.8, X1 = 1.8, Z0 = -1.8, Z1 = 1.8, T = 0.1, FT = 0.02, CEIL = 2.4;
  const WIN = { x0: -0.25, x1: 0.85, y0: 0.95, y1: 2.05 };
  const BED = { x0: X0, x1: -0.85, z0: Z0, z1: 0.25 };
  const DESK = { x0: -0.25, x1: 0.9, z0: Z0, z1: -1.22, y: 0.74 };
  const SHELF = { x0: 1.2, x1: 1.78, z0: Z0, z1: -1.5, y: 1.8 };
  const CLOSET = { x0: X0, x1: -1.2, z0: 0.62, z1: 1.77, y: 2.15 };
  const RUG = { x: 0.35, z: 0.35, r: 0.8 };
  const CHAIR = { x: 0.35, z: -0.88, yaw: 0.2 };

  // ---------- floor ----------
  const fx0 = X0 - T, fz0 = Z0 - T, fx1 = cutaway ? X1 : X1 + T, fz1 = cutaway ? Z1 : Z1 + T;
  box("floor", fx0, fx1, 0, FT, fz0, fz1);
  const FL = onY(FT + 0.0008);
  for (let z = Z0 + 0.15, k = 0; z < fz1 - 0.05; z += 0.15, k++) {
    rect("seam", FL, X0, fx1, z - 0.003, z + 0.003);
    for (let x = X0 + 0.4 + hash(k) * 1.2; x < fx1 - 0.1; x += 1.2 + hash(k + 50) * 0.4) rect("seam", FL, x - 0.003, x + 0.003, z, Math.min(z + 0.15, fz1));
  }

  // ---------- walls ----------
  // the walls are drawn without ink; their silhouettes come from whole-wall twins ("wallInk", hull only), so the
  // pieces cut around the window show no seams
  box("wall", X0 - T, X0, FT, CEIL, Z0 - T, Z1); // -X wall
  box("wall", X0, WIN.x0, FT, CEIL, Z0 - T, Z0); // -Z wall, cut around the window
  box("wall", WIN.x1, fx1, FT, CEIL, Z0 - T, Z0);
  box("wall", WIN.x0, WIN.x1, FT, WIN.y0, Z0 - T, Z0);
  box("wall", WIN.x0, WIN.x1, WIN.y1, CEIL, Z0 - T, Z0);
  box("wallInk", X0 - T, X0, FT, CEIL, Z0 - T, Z1);
  box("wallInk", X0, fx1, FT, CEIL, Z0 - T, Z0);
  box("white", X0, X0 + 0.015, FT, 0.1, Z0, Z1); // skirting
  box("white", X0, fx1, FT, 0.1, Z0, Z0 + 0.015);
  if (!cutaway) {
    for (const k of ["wall", "wallInk"]) {
      box(k, X1, X1 + T, FT, CEIL, Z0 - T, Z1 + T);
      box(k, X0 - T, X1, FT, CEIL, Z1, Z1 + T);
    }
    box("white", X0, X1, CEIL - 0.04, CEIL, Z0, Z1); // ceiling
    box("white", X1 - 0.03, X1, FT, 2.08, 0.4, 1.3); // door
    box("seam", X1 - 0.05, X1 - 0.03, 1.0, 1.04, 1.15, 1.22);
  }

  // ---------- window ----------
  const WZ = Z0 - 0.06, fw = 0.05;
  rect(night ? "night" : "pane", onZ(WZ), WIN.x0, WIN.x1, WIN.y0, WIN.y1);
  box("white", WIN.x0, WIN.x1, WIN.y0, WIN.y0 + fw, WZ, Z0); // frame
  box("white", WIN.x0, WIN.x1, WIN.y1 - fw, WIN.y1, WZ, Z0);
  box("white", WIN.x0, WIN.x0 + fw, WIN.y0, WIN.y1, WZ, Z0);
  box("white", WIN.x1 - fw, WIN.x1, WIN.y0, WIN.y1, WZ, Z0);
  const wm = (WIN.x0 + WIN.x1) / 2;
  box("white", wm - 0.025, wm + 0.025, WIN.y0, WIN.y1, WZ, WZ + 0.04); // meeting stile
  box("white", WIN.x0 - 0.07, WIN.x1 + 0.07, WIN.y0 - 0.04, WIN.y0, Z0 - 0.02, Z0 + 0.08); // sill
  const OUT = onZ(WZ + 0.002);
  if (!night) {
    fan("duvet", OUT, [...disc(WIN.x0 + 0.22, WIN.y0 + 0.08, 0.24, 14, 0.2)].filter((p) => p[1] > WIN.y0 + fw && p[0] > WIN.x0 + fw).concat([[WIN.x0 + fw, WIN.y0 + fw]]));
    fan("duvet", OUT, disc(WIN.x1 - 0.2, WIN.y0 + fw + 0.02, 0.17, 12, 0.16).filter((p) => p[1] >= WIN.y0 + fw && p[0] < WIN.x1 - fw).concat([[WIN.x1 - fw, WIN.y0 + fw]]));
    fan("cream", OUT, disc(WIN.x1 - 0.22, WIN.y1 - 0.24, 0.12, 12, 0.05));
  } else {
    fan("cream", OUT, disc(WIN.x0 + 0.24, WIN.y1 - 0.24, 0.09, 16));
    for (let i = 0; i < 6; i++) fan("glow", OUT, disc(WIN.x0 + 0.1 + hash(i + 9) * (WIN.x1 - WIN.x0 - 0.2), WIN.y0 + 0.25 + hash(i + 19) * 0.7, 0.012, 6));
  }
  // curtain rod with finials
  const RY = 2.2, RZ = Z0 + 0.1;
  rod("seam", [WIN.x0 - 0.4, RY, RZ], [WIN.x1 + 0.34, RY, RZ], 0.012, 8);
  for (const x of [WIN.x0 - 0.42, WIN.x1 + 0.36]) blob("seam", [x, RY, RZ], [0.025, 0.025, 0.025], 1, undefined, 5, 8);
  for (const x of [WIN.x0 - 0.3, WIN.x1 + 0.25]) box("seam", x - 0.01, x + 0.01, RY, RY + 0.012, Z0, RZ); // brackets
  // curtains: a wavy sheet hung from the rod, gathered to a tie-back at 1.3 m. outer = the wall-side edge x,
  // dir = +1 when the curtain spreads toward +X. Width profile w(y): full at the rod, pinched at the tie.
  function curtain(outer, dir, full) {
    const yTop = RY - 0.03, yBot = 0.86, tie = 1.3, nu = 14, nv = 12, th = 0.012, amp = 0.025, waves = 3.5;
    const wAt = (y) => (y > tie ? 0.55 + 0.45 * ((y - tie) / (yTop - tie)) ** 0.8 : 0.55 + 0.25 * ((tie - y) / (tie - yBot)));
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
          const ref = sub(q[0][0], [0, 0, s]);
          quad("red", q[0][0], q[1][0], q[2][0], q[3][0], ref, q[0][1], q[1][1], q[2][1], q[3][1]);
        }
    for (let j = 0; j < nv; j++) // the two vertical edges
      for (const i of [0, nu]) {
        const [a, b, e, d] = [surf(i, j, 1)[0], surf(i, j + 1, 1)[0], surf(i, j + 1, -1)[0], surf(i, j, -1)[0]];
        const inX = i === 0 ? dir : -dir;
        quad("red", a, b, e, d, add(a, [inX * 0.5, 0, 0]));
      }
    for (const j of [0, nv]) // top and hem
      for (let i = 0; i < nu; i++) {
        const [a, b, e, d] = [surf(i, j, 1)[0], surf(i + 1, j, 1)[0], surf(i + 1, j, -1)[0], surf(i, j, -1)[0]];
        quad("red", a, b, e, d, add(a, [0, j === 0 ? -0.5 : 0.5, 0]));
      }
    // tie-back band
    const tw = full * wAt(tie);
    box("cream", Math.min(outer, outer + dir * (tw + 0.01)), Math.max(outer, outer + dir * (tw + 0.01)), tie - 0.025, tie + 0.025, zc - 0.045, zc + 0.045);
  }
  curtain(WIN.x0 - 0.38, 1, 0.42);
  curtain(WIN.x1 + 0.32, -1, 0.4);

  // ---------- bed ----------
  const bx = (BED.x0 + BED.x1) / 2;
  for (const [x, z] of [[BED.x0 + 0.05, BED.z1 - 0.05], [BED.x1 - 0.05, BED.z1 - 0.05], [BED.x1 - 0.05, BED.z0 + 0.1]])
    box("white", x - 0.035, x + 0.035, FT, 0.12, z - 0.035, z + 0.035);
  box("white", BED.x0, BED.x1, 0.12, 0.3, BED.z0 + 0.06, BED.z1); // frame
  box("white", BED.x0, BED.x1, FT, 0.95, BED.z0, BED.z0 + 0.06); // headboard
  box("white", BED.x0, BED.x1 + 0.02, 0.95, 0.99, BED.z0 - 0.01, BED.z0 + 0.08); // its cap
  box("white", BED.x0, BED.x1, FT, 0.56, BED.z1 - 0.05, BED.z1); // footboard
  box("cream", BED.x0 + 0.02, BED.x1 - 0.03, 0.3, 0.48, BED.z0 + 0.07, BED.z1 - 0.06); // mattress
  blob("duvet", [bx, 0.47, -0.42], [0.53, 0.13, 0.62], 0.22, undefined, 10, 20); // duvet, past the frame side
  blob("duvet", [bx, 0.555, -1.03], [0.54, 0.065, 0.09], 0.55, undefined, 8, 16); // folded-back roll
  blob("cream", [bx + 0.02, 0.56, -1.44], [0.31, 0.08, 0.18], 0.45, undefined, 8, 16); // pillow

  // ---------- desk ----------
  const D = DESK, dt = 0.03;
  box("white", D.x0, D.x1, D.y - dt, D.y, D.z0, D.z1); // top
  box("white", D.x0, D.x0 + 0.025, FT, D.y - dt, D.z0, D.z1 - 0.02); // left side panel
  box("white", D.x0 + 0.025, 0.5, 0.35, D.y - dt, D.z0, D.z0 + 0.02); // modesty panel
  const px0 = 0.5;
  box("white", px0, D.x1, FT, D.y - dt, D.z0, D.z1 - 0.02); // pedestal
  const DF = onZ(D.z1 - 0.019);
  for (const [y0, y1] of [[0.05, 0.27], [0.29, 0.49], [0.51, 0.69]]) {
    rect("seam", DF, px0 + 0.02, D.x1 - 0.02, y1 - 0.004, y1 + 0.004);
    box("seam", (px0 + D.x1) / 2 - 0.05, (px0 + D.x1) / 2 + 0.05, (y0 + y1) / 2 + 0.03, (y0 + y1) / 2 + 0.045, D.z1 - 0.02, D.z1 - 0.005);
  }
  // desk lamp: round base, two arms, conical shade aimed at the desk
  const LB = [-0.1, D.y, -1.6];
  cyl("white", LB[0], LB[2], D.y, D.y + 0.025, 0.075, 16);
  const elbow = [-0.16, D.y + 0.38, -1.7], head = [0.08, D.y + 0.45, -1.5];
  rod("white", [LB[0], D.y + 0.02, LB[2]], elbow, 0.011, 6);
  rod("white", elbow, head, 0.011, 6);
  blob("white", elbow, [0.02, 0.02, 0.02], 1, undefined, 4, 8);
  place(...head, 0, 0.45, -0.4); // shade axis tilted so the mouth faces the desk front
  lathe("lamp", [[0, 0.03], [0.04, 0.03], [0.11, -0.12], [0, -0.12]], 0, 0, 18); // a closed cone: its mouth is the lit disc
  place();
  if (night) fan("glow", onY(D.y + 0.001), disc(0.15, -1.5, 0.38, 24, 0.26)); // pool of lamplight
  // closed laptop, a book stack, a pencil cup
  place(0.22, D.y, -1.47, 0.12);
  box("white", -0.165, 0.165, 0, 0.012, -0.115, 0.115);
  box("wall", -0.165, 0.165, 0.012, 0.022, -0.115, 0.115);
  rect("seam", onZ(0.1152), -0.14, 0.14, 0.009, 0.014);
  place(0.66, D.y, -1.6, -0.15);
  [["green", 0.24, 0.17, 0.035], ["red", 0.22, 0.16, 0.03], ["honey", 0.2, 0.15, 0.028]].reduce((y, [k, w, d, h], i) => {
    place(0.66 + i * 0.01, D.y + y, -1.6, -0.15 + i * 0.12);
    box(k, -w / 2, w / 2, 0, h, -d / 2, d / 2);
    box("cream", -w / 2 + 0.008, w / 2 - 0.004, 0.004, h - 0.004, -d / 2 - 0.002, d / 2 + 0.002); // page block
    return y + h;
  }, 0);
  place();
  cyl("red", 0.78, -1.36, D.y, D.y + 0.1, 0.035, 12);
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1;
    rod(i === 1 ? "green" : "honey", [0.78 + 0.012 * Math.cos(a), D.y + 0.05, -1.36 + 0.012 * Math.sin(a)], [0.78 + 0.03 * Math.cos(a), D.y + 0.17 + 0.01 * i, -1.36 + 0.03 * Math.sin(a)], 0.005, 5);
  }

  // ---------- chair (pulled out, facing the desk) ----------
  place(CHAIR.x, 0, CHAIR.z, CHAIR.yaw);
  const sw = 0.21, sd = 0.2;
  box("white", -sw, sw, 0.44, 0.48, -sd, sd); // seat
  for (const [x, z] of [[-sw + 0.03, -sd + 0.03], [sw - 0.03, -sd + 0.03], [-sw + 0.03, sd - 0.03], [sw - 0.03, sd - 0.03]])
    box("white", x - 0.018, x + 0.018, FT, 0.44, z - 0.018, z + 0.018);
  for (const x of [-sw + 0.03, sw - 0.03]) box("white", x - 0.018, x + 0.018, 0.48, 0.9, sd - 0.048, sd - 0.012); // back posts
  box("white", -sw, sw, 0.72, 0.88, sd - 0.045, sd - 0.015); // back rail
  box("white", -sw + 0.03, sw - 0.03, 0.15, 0.18, -sd + 0.015, -sd + 0.045); // stretchers
  box("white", -sw + 0.03, sw - 0.03, 0.15, 0.18, sd - 0.045, sd - 0.015);
  place();

  // ---------- bookcase ----------
  const B = SHELF, bt = 0.02;
  box("white", B.x0, B.x0 + bt, FT, B.y, B.z0, B.z1);
  box("white", B.x1 - bt, B.x1, FT, B.y, B.z0, B.z1);
  box("white", B.x0, B.x1, B.y - bt, B.y, B.z0, B.z1);
  box("white", B.x0 + bt, B.x1 - bt, FT, 0.08, B.z0, B.z1 - 0.01); // plinth
  box("wall", B.x0 + bt, B.x1 - bt, 0.08, B.y - bt, B.z0, B.z0 + 0.008); // back panel (wall tone)
  const levels = [0.08, 0.42, 0.76, 1.1, 1.44];
  for (const y of levels.slice(1)) box("white", B.x0 + bt, B.x1 - bt, y - bt, y, B.z0, B.z1);
  const BOOK = ["red", "green", "honey", "duvet", "cream", "white", "red", "green"];
  levels.forEach((y, s) => {
    const clear = (s === levels.length - 1 ? B.y - bt : levels[s + 1] - bt) - y;
    let x = B.x0 + bt + 0.01, k = 0;
    const stop = B.x1 - bt - (s % 2 ? 0.12 : 0.04);
    while (x < stop - 0.03) {
      const id = s * 31 + k++;
      const w = 0.024 + hash(id) * 0.026, h = Math.min(clear - 0.03, 0.19 + hash(id + 7) * 0.11), d = 0.2 + hash(id + 3) * 0.05;
      const col = BOOK[Math.floor(hash(id + 13) * BOOK.length)];
      if (hash(id + 21) > 0.86 && x < stop - 0.24) { // a short pile lying flat
        let yy = y;
        for (let q = 0; q < 2; q++) {
          const hh = 0.03 + hash(id + q) * 0.015;
          box(BOOK[(Math.floor(hash(id + q + 40) * 6) + q) % 6], x, x + 0.2 + 0.02 * q, yy, yy + hh, B.z1 - 0.02 - d, B.z1 - 0.02);
          yy += hh;
        }
        x += 0.24;
        continue;
      }
      box(col, x, x + w, y, y + h, B.z1 - 0.02 - d, B.z1 - 0.02);
      if (col !== "cream" && col !== "white") rect("cream", onZ(B.z1 - 0.0195), x + 0.004, x + w - 0.004, y + h * 0.72, y + h * 0.76); // spine band
      x += w + 0.002;
    }
  });
  // a small round box on the top-but-one gap
  cyl("duvet", B.x1 - 0.09, B.z1 - 0.13, levels[1], levels[1] + 0.07, 0.04, 12);

  // ---------- potted plant (between the bed and the desk) ----------
  const PL = [-0.56, -1.4];
  lathe("red", [[0, FT], [0.1, FT], [0.135, 0.3], [0.15, 0.3], [0.15, 0.34], [0.128, 0.34], [0.128, 0.31], [0, 0.31]], PL[0], PL[1], 16);
  cyl("seam", PL[0], PL[1], 0.3, 0.325, 0.128, 14); // soil
  for (let i = 0; i < 14; i++) {
    const a = i * 2.39996, up = 0.3 + 0.6 * hash(i + 3), lean = 0.45 + 0.55 * hash(i + 11);
    const base = [PL[0] + 0.02 * Math.cos(a), 0.31, PL[1] + 0.02 * Math.sin(a)];
    const tip = [PL[0] + lean * 0.32 * Math.cos(a), 0.31 + up * 0.85, PL[1] + lean * 0.24 * Math.sin(a)];
    rod("green", base, tip, 0.006, 4);
    const d = nrm([Math.cos(a) * lean, 0.2 + 0.5 * hash(i), Math.sin(a) * lean * 0.8]);
    const ex = nrm(cross([0, 1, 0], d)), ey = cross(d, ex);
    blob("green", add(tip, mul(d, 0.1)), [0.07, 0.01, 0.15], 1, [ex, ey, d], 4, 10);
  }

  // ---------- rug ----------
  cyl("red", RUG.x, RUG.z, FT, FT + 0.012, RUG.r, 36);
  ring("cream", onY(FT + 0.0128), RUG.x, RUG.z, RUG.r - 0.16, RUG.r - 0.1, 36);
  ring("cream", onY(FT + 0.0128), RUG.x, RUG.z, 0.22, 0.26, 24);

  // ---------- closet (sliding doors on two tracks) ----------
  const C = CLOSET, cw = (C.z1 - C.z0) / 2;
  box("white", C.x0, C.x1, FT, C.y, C.z0, C.z0 + 0.025);
  box("white", C.x0, C.x1, FT, C.y, C.z1 - 0.025, C.z1);
  box("white", C.x0, C.x1, C.y - 0.06, C.y, C.z0, C.z1); // header
  box("white", C.x0, C.x1 - 0.04, FT, 0.06, C.z0, C.z1); // floor track
  for (const [i, x] of [[0, C.x1 - 0.045], [1, C.x1 - 0.02]]) {
    const z0 = C.z0 + 0.02 + i * (cw - 0.04), z1 = z0 + cw + 0.02;
    box("white", x - 0.02, x, 0.06, C.y - 0.06, z0, z1);
    const F = onX(x + 0.0008), m = 0.05;
    for (const [u0, u1, v0, v1] of [[z0 + m, z1 - m, 0.12, 0.125], [z0 + m, z1 - m, C.y - 0.125, C.y - 0.12], [z0 + m, z0 + m + 0.005, 0.12, C.y - 0.12], [z1 - m - 0.005, z1 - m, 0.12, C.y - 0.12]])
      rect("seam", F, u0, u1, v0, v1);
    const hz = i === 0 ? z1 - 0.1 : z0 + 0.1;
    rect("seam", F, hz - 0.015, hz + 0.015, 0.95, 1.2); // finger pull
  }

  // ---------- posters (blank shapes) and the clock ----------
  const PX = onX(X0 + 0.004), PX2 = onX(X0 + 0.007);
  const poster = (F, F2, u, v, w, h, bg, draw) => (rect(bg, F, u - w / 2, u + w / 2, v - h / 2, v + h / 2), draw(F2, u, v, w, h));
  box("cream", X0, X0 + 0.003, 1.22, 1.8, -1.31, -0.89);
  poster(PX, PX2, -1.1, 1.51, 0.38, 0.54, "cream", (F, u, v, w, h) => {
    fan("honey", F, disc(u + 0.06, v + 0.12, 0.08));
    fan("green", F, [[u - w / 2 + 0.02, v - h / 2 + 0.03], [u + w / 2 - 0.02, v - h / 2 + 0.03], [u - 0.02, v + 0.06]]);
    fan("duvet", F, [[u - 0.02, v - h / 2 + 0.03], [u + w / 2 - 0.02, v - h / 2 + 0.03], [u + 0.1, v - 0.04]]);
  });
  box("red", X0, X0 + 0.003, 1.32, 1.92, -0.6, -0.16);
  poster(onX(X0 + 0.0045), onX(X0 + 0.008), -0.38, 1.62, 0.36, 0.52, "red", (F, u, v, w, h) => {
    fan("cream", F, disc(u, v + 0.06, 0.12));
    fan("red", onX(X0 + 0.011), disc(u, v + 0.06, 0.06));
    for (let i = 0; i < 3; i++) rect("cream", F, u - w / 2 + 0.04, u + w / 2 - 0.04, v - 0.14 - i * 0.04, v - 0.125 - i * 0.04);
  });
  const PZ = onZ(Z0 + 0.004), PZ2 = onZ(Z0 + 0.007);
  box("honey", -1.52, -1.0, 1.25, 1.75, Z0, Z0 + 0.003);
  poster(PZ, PZ2, -1.26, 1.5, 0.48, 0.46, "honey", (F, u, v) => {
    for (let i = 0; i < 4; i++) rect(["red", "green", "duvet", "cream"][i], F, u - 0.2 + i * 0.1, u - 0.12 + i * 0.1, v - 0.18, v + 0.04 + 0.04 * i);
    fan("cream", F, disc(u + 0.13, v + 0.13, 0.05));
  });
  // wall clock above the bookcase
  const CK = { x: (B.x0 + B.x1) / 2, y: 2.1 };
  place(CK.x, CK.y, Z0, 0, Math.PI / 2);
  lathe("red", [[0, 0], [0.145, 0], [0.145, 0.035], [0.12, 0.035], [0.12, 0.03], [0, 0.03]], 0, 0, 24);
  place();
  const CF = onZ(Z0 + 0.0305), CH = onZ(Z0 + 0.034);
  fan("cream", CF, disc(CK.x, CK.y, 0.121, 24));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, r0 = i % 3 ? 0.1 : 0.085;
    const [ca, sa] = [Math.cos(a), Math.sin(a)];
    fan("seam", CH, [[CK.x + ca * r0 - sa * 0.004, CK.y + sa * r0 + ca * 0.004], [CK.x + ca * 0.112 - sa * 0.004, CK.y + sa * 0.112 + ca * 0.004], [CK.x + ca * 0.112 + sa * 0.004, CK.y + sa * 0.112 - ca * 0.004], [CK.x + ca * r0 + sa * 0.004, CK.y + sa * r0 - ca * 0.004]]);
  }
  const hand = (a, L, w) => fan("seam", onZ(Z0 + 0.036), [[CK.x - Math.sin(a) * w, CK.y + Math.cos(a) * -w], [CK.x + Math.cos(a) * L, CK.y + Math.sin(a) * L], [CK.x + Math.sin(a) * w, CK.y - Math.cos(a) * -w]]);
  hand(Math.PI * 0.62, 0.065, 0.008); // ten past four-ish: hour
  hand(Math.PI * 0.18, 0.1, 0.006); // minute
  fan("red", onZ(Z0 + 0.037), disc(CK.x, CK.y, 0.01, 8));

  // ---------- meshes ----------
  const MAT = { // [base, shade, threshold, ink px (0 = no hull)]
    wall: [c.wall, c.wallShade, 0.1, 0], // inked through the wallInk twins
    white: [c.white, c.whiteShade, 0.1, 2],
    honey: [c.honey, c.honeyShade, 0.1, 2],
    floor: [c.floor, c.floorShade, 0.1, 2.5],
    seam: [c.seam, c.seam, 0.1, 0],
    duvet: [c.duvet, c.duvetShade, 0.05, 2],
    red: [c.red, c.redShade, 0.0, 2],
    green: [c.green, c.greenShade, 0.15, 1.5],
    cream: [c.cream, c.creamShade, 0.1, 1.5],
    pane: [c.pane, c.paneShade, -1, 0],
    night: [c.night, c.night, -1, 0],
    lamp: night ? [c.glow, c.glow, -1, 2] : [c.duvet, c.duvetShade, 0.05, 2],
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
    if (key === "wall") // ink the whole-wall twins and keep only their hulls
      for (const h of kit.outline(new THREE.Mesh(geo(soups.wallInk), mesh.material), { px: 2.5 }).children.slice()) mesh.add(h);
    set.add(mesh);
  }
  const anchor = (name, x, y, z) => { const a = new THREE.Group(); a.name = name; a.position.set(x, y, z); set.add(a); joints[name] = a; };
  anchor("floor", 0, FT, 0);
  anchor("bed", bx, 0.6, -0.4);
  anchor("desk", 0.3, D.y, -1.5);
  anchor("chair", CHAIR.x, 0.48, CHAIR.z);
  anchor("window", wm, (WIN.y0 + WIN.y1) / 2, Z0);

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
