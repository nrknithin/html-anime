// manga-studio.js - a cramped manga artist's studio at the deadline night: the mangaka room of every "making manga"
// anime, static set. Contract: harness/lab/README.md. Meters, +Y up, the room's open (cutaway) sides face +X and +Z
// so the low hero camera in the lit front-left quadrant looks in; the -X wall holds the drawing desk under the night
// window, the corkboard and the mini fridge, the -Z wall the two bookcases and the assistant desk; the futon roll
// stands in the back corner. Stands on y = 0 (the floorboards' top is y = 0.02, joints.floor), centred on the room.
//
// Construction (boxes, lathes, superellipsoid blobs, rods and flat decals, all triangle soups merged per material,
// helpers as bedroom.js; every closed part is wound away from a point inside it, never by hand):
//   SHELL    floorboards with dark seams, two walls 0.1 thick with a skirting board, the -X wall cut around a window
//            whose pane is a night city: sky above, a warm glow band at the horizon, dark building silhouettes with
//            lit windows. The walls have no hull of their own; whole-wall twins ("wallInk", hull only) ink them.
//   DESK     the artist's desk on the -X wall: a pale top on a side panel and a drawer pedestal, a drawing board
//            tilted 45 deg toward the room (so the low camera sees its face over the desk edge), a B4 page in
//            progress on it (paneled tiers, a face, a speech balloon, speed lines, all ink decals), a pen on the lip;
//            ink bottles, two pen cups with pens and brushes, an energy drink. A clamp lamp: a pole and arm from the
//            back corner, a red shade aimed at the page.
//   LAMP     (option) a glowing disc in the shade's mouth, a pool of light on the board under the page, and the glow
//            cone drawn as rows of screentone dots on the cone's surface (no transparency in the kit).
//   ASSIST   the assistant desk on the -Z wall with a smaller 40 deg board and its page, a manuscript pile, a pen cup
//            and a can; a wall shelf of volumes above it.
//   SHELVES  two tall bookcases, eight shelves of manga volumes: runs of one series share a colour and a height
//            (a hash, no Math.random), most with a pale label band; some volumes lie flat on top of a row, piles on
//            top of the cases.
//   CLUTTER  an office chair (five-star base, gas column, red seat and back) turned toward the desk; piles of
//            manuscript paper on the floor; crumpled sheets; a corkboard with six pinned storyboard sheets (panel
//            boxes, red pins); a mini fridge with energy drinks on top; a futon rolled and tied in the corner.
// Proportions (real size, base unit the wall top 2.4 m = meta.height): room 2.8 x 2.8 inside; desks at 0.72; the
//   board 0.62 x 0.7; page B4 0.257 x 0.364; window 1.0 x 0.83 from 1.25; bookcases 1.9 tall, 0.24 deep, shelf
//   pitch 0.23; volumes 0.016-0.022 x 0.17-0.21 x 0.113; fridge 0.52 x 0.48 x 0.84; futon roll r 0.16 x 0.95;
//   chair seat 0.47; storyboard sheets 0.15 x 0.21.
// Options: build(THREE, kit, colors, { height, lamp = true }).
//   height  scales the whole set so the wall top is `height` (default 2.4).
//   lamp    the desk lamp is on: its mouth, the pool on the board and the dotted glow cone (true by default).
// Ink: hulls are 1.5-2.5 px (a room is seen small); decals, glow, the city and the manga spines have none (a volume
//   is two pixels wide at 480x300 and inked spines turned the shelves black): flat spines, a hair gap line between
//   volumes, the inked shelf boards frame them.
// Colours (indigo script, every hex from it; roles in meta.colors): walls and the window sky sky #1b2d6b (flat);
//   floor, cork and some spines iris #e7a04a / accent #e23b4a; desks, shelves, frames, lamp arm moon #d5e2ff / sky;
//   paper (pages, piles, sheets, fridge, labels) sclera #f6f3ee / moon; dark parts (chair base, bottles, pens, ties)
//   sky / sky; red parts (chair, shade, cans, pins, spines) accent / sky; amber (cup, can bands, spines) practical
//   #f0c36a / iris; futon and spines skin #f0c2ae / iris; seams, panel ink, buildings hair #16141c (flat); city band
//   iris (flat); glow (lamp, pool, cone, lit windows) practical (flat); spines flat accent, skin, practical, iris,
//   sclera or sky, labels sclera (flat); pencil lines on the page sky (flat, in the wall mesh).
// Meshes: 14. ~13.3k triangles (11.9k with the lamp off).
// Joints: anchors floor, desk, page, lamp, window, assistant.

export const meta = {
  name: "manga-studio",
  height: 2.4,
  script: "indigo",
  colors: {
    wall: "#1b2d6b",
    floor: "#e7a04a", floorShade: "#e23b4a",
    wood: "#d5e2ff", woodShade: "#1b2d6b",
    paper: "#f6f3ee", paperShade: "#d5e2ff",
    dark: "#1b2d6b", darkShade: "#1b2d6b",
    red: "#e23b4a", redShade: "#1b2d6b",
    amber: "#f0c36a", amberShade: "#e7a04a",
    skin: "#f0c2ae", skinShade: "#e7a04a",
    seam: "#16141c",
    haze: "#e7a04a",
    glow: "#f0c36a",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height, lamp = true } = opts;
  const c = { ...meta.colors, ...colors };
  const root = new THREE.Group();
  root.name = "manga-studio";
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
  // local +Y along `up`, origin o: for parts aimed along a direction (the lamp shade)
  function aim(o, up) {
    const ey = nrm(up), t = Math.abs(ey[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const ex = nrm(cross(ey, t)), ez = cross(ex, ey);
    M = new THREE.Matrix4().makeBasis(new THREE.Vector3(...ex), new THREE.Vector3(...ey), new THREE.Vector3(...ez)).setPosition(...o);
  }
  // an outlined rectangle (panel border) of line width w
  function frame(key, F, u0, u1, v0, v1, w) {
    rect(key, F, u0, u1, v0, v0 + w);
    rect(key, F, u0, u1, v1 - w, v1);
    rect(key, F, u0, u0 + w, v0, v1);
    rect(key, F, u1 - w, u1, v0, v1);
  }
  // a thin stroke from (u0, v0) to (u1, v1) on a plane
  function stroke(key, F, u0, v0, u1, v1, w) {
    const d = Math.hypot(u1 - u0, v1 - v0) || 1, nu = (-(v1 - v0) / d) * w * 0.5, nv = ((u1 - u0) / d) * w * 0.5;
    quad(key, F.W(u0 + nu, v0 + nv), F.W(u1 + nu, v1 + nv), F.W(u1 - nu, v1 - nv), F.W(u0 - nu, v0 - nv), F.back((u0 + u1) / 2, (v0 + v1) / 2));
  }

  // ---------- dimensions ----------
  const X0 = -1.4, X1 = 1.4, Z0 = -1.4, Z1 = 1.4, T = 0.1, FT = 0.02, CEIL = 2.4;
  const WIN = { z0: -0.45, z1: 0.45, y0: 1.25, y1: 2.08 };
  const DESK = { x0: X0, x1: -0.72, z0: -0.58, z1: 0.6, y: 0.72 };
  const BOARD = { x: -0.765, y: DESK.y + 0.03, z: -0.05, ang: Math.PI / 4, L: 0.62, W: 0.7, th: 0.022 };
  const AD = { x0: -0.26, x1: 0.72, z0: Z0, z1: -0.82, y: 0.72 };
  const CASES = [{ x0: -1.02, x1: -0.32 }, { x0: 0.78, x1: 1.38 }];
  const CASE = { z0: Z0, z1: Z0 + 0.24, y: 1.9, levels: [0.08, 0.31, 0.54, 0.77, 1.0, 1.23, 1.46, 1.69] };
  const FRIDGE = { x0: X0, x1: X0 + 0.48, z0: 0.74, z1: 1.26, y: 0.86 };
  const CORK = { z0: 0.6, z1: 1.34, y0: 1.06, y1: 1.82 };
  const FUTON = { x: X0 + 0.18, z: Z0 + 0.19, r: 0.165, h: 0.95 };
  const CHAIR = { x: -0.26, z: 0.0, yaw: -0.67 }; // seen side-on from the hero camera, so it hides neither page nor futon

  // ---------- floor ----------
  box("floor", X0 - T, X1, 0, FT, Z0 - T, Z1);
  const FL = onY(FT + 0.0008);
  for (let x = X0 + 0.16, k = 0; x < X1 - 0.05; x += 0.16, k++) {
    rect("seam", FL, x - 0.003, x + 0.003, Z0, Z1); // onY: u = x, v = z
    for (let z = Z0 + 0.3 + hash(k) * 1.0; z < Z1 - 0.1; z += 1.1 + hash(k + 50) * 0.4) rect("seam", FL, x, Math.min(x + 0.16, X1), z - 0.003, z + 0.003);
  }

  // ---------- walls (-X wall cut around the window) ----------
  box("wall", X0 - T, X0, FT, CEIL, Z0 - T, WIN.z0);
  box("wall", X0 - T, X0, FT, CEIL, WIN.z1, Z1);
  box("wall", X0 - T, X0, FT, WIN.y0, WIN.z0, WIN.z1);
  box("wall", X0 - T, X0, WIN.y1, CEIL, WIN.z0, WIN.z1);
  box("wall", X0, X1, FT, CEIL, Z0 - T, Z0); // -Z wall
  box("wallInk", X0 - T, X0, FT, CEIL, Z0 - T, Z1);
  box("wallInk", X0, X1, FT, CEIL, Z0 - T, Z0);
  box("wood", X0, X0 + 0.012, FT, 0.08, Z0, Z1); // skirting
  box("wood", X0, X1, FT, 0.08, Z0, Z0 + 0.012);

  // ---------- window: a night city ----------
  const WX = X0 - 0.06, fw = 0.045;
  rect("wall", onX(WX), WIN.z0, WIN.z1, WIN.y0, WIN.y1); // night sky
  const C1 = onX(WX + 0.002), C2 = onX(WX + 0.004), C3 = onX(WX + 0.006);
  rect("haze", C1, WIN.z0, WIN.z1, WIN.y0, WIN.y0 + 0.36); // the city's glow over the roofs
  rect("glow", C2, WIN.z0, WIN.z1, WIN.y0, WIN.y0 + 0.2);
  for (let z = WIN.z0 + fw, k = 0; z < WIN.z1 - fw; k++) { // buildings with lit windows
    const w = Math.min(0.06 + hash(k + 3) * 0.09, WIN.z1 - fw - z), top = WIN.y0 + 0.1 + hash(k + 11) * (k % 3 === 1 ? 0.45 : 0.24);
    rect("seam", C3, z, z + w, WIN.y0, top);
    for (let y = WIN.y0 + fw + 0.03; y < top - 0.03; y += 0.035)
      for (let q = z + 0.012; q < z + w - 0.012; q += 0.024)
        if (hash(k * 97 + Math.round(y * 300) + Math.round(q * 700)) > 0.55) rect("glow", onX(WX + 0.008), q, q + 0.01, y, y + 0.014);
    if (top > WIN.y0 + 0.4) rect("glow", onX(WX + 0.008), z + w / 2 - 0.006, z + w / 2 + 0.006, top + 0.002, top + 0.014); // aviation light
    z += w + 0.004 + hash(k + 21) * 0.03;
  }
  for (let i = 0; i < 7; i++) fan("glow", C1, disc(WIN.z0 + 0.08 + hash(i + 31) * 0.84, WIN.y1 - 0.06 - hash(i + 41) * 0.3, 0.006, 5)); // stars
  for (const [z0, z1, y0, y1] of [[WIN.z0, WIN.z1, WIN.y0, WIN.y0 + fw], [WIN.z0, WIN.z1, WIN.y1 - fw, WIN.y1], [WIN.z0, WIN.z0 + fw, WIN.y0, WIN.y1], [WIN.z1 - fw, WIN.z1, WIN.y0, WIN.y1]])
    box("wood", WX - 0.01, X0, y0, y1, z0, z1); // frame
  const wm = (WIN.z0 + WIN.z1) / 2;
  box("wood", WX + 0.01, WX + 0.05, WIN.y0, WIN.y1, wm - 0.022, wm + 0.022); // meeting stile
  box("wood", X0 - 0.03, X0 + 0.06, WIN.y0 - 0.035, WIN.y0, WIN.z0 - 0.06, WIN.z1 + 0.06); // sill

  // ---------- the artist's desk ----------
  const D = DESK, dt = 0.03;
  box("wood", D.x0, D.x1, D.y - dt, D.y, D.z0, D.z1); // top
  box("wood", D.x0, D.x1 - 0.02, FT, D.y - dt, D.z0, D.z0 + 0.025); // side panel
  box("wood", D.x0, D.x0 + 0.02, 0.3, D.y - dt, D.z0, 0.2); // modesty panel
  const pz0 = 0.2;
  box("wood", D.x0, D.x1 - 0.02, FT, D.y - dt, pz0, D.z1); // drawer pedestal
  const DF = onX(D.x1 - 0.02 + 0.0008);
  for (const [y0, y1] of [[0.04, 0.26], [0.28, 0.48], [0.5, 0.68]]) {
    rect("seam", DF, pz0 + 0.02, D.z1 - 0.02, y1 - 0.004, y1 + 0.004);
    box("dark", D.x1 - 0.02, D.x1 - 0.005, (y0 + y1) / 2 + 0.03, (y0 + y1) / 2 + 0.045, (pz0 + D.z1) / 2 - 0.06, (pz0 + D.z1) / 2 + 0.06);
  }
  // the tilted drawing board: local x runs down the slope to the front edge (x = 0), local y is its face normal
  const B = BOARD;
  const boardM = () => place(B.x, B.y, B.z, 0, 0, -B.ang);
  const BF = (h) => ({ W: (u, v) => [-u, B.th + h, v], back: (u, v) => [-u, B.th + h - 1, v] });
  boardM();
  box("wood", -B.L, 0, 0, B.th, -B.W / 2, B.W / 2);
  box("wood", 0, 0.02, -0.01, B.th + 0.022, -B.W / 2, B.W / 2); // pencil lip
  rod("dark", [0.008, B.th + 0.03, -0.22], [0.008, B.th + 0.03, -0.05], 0.006, 6); // a pen on the lip
  if (lamp) fan("glow", BF(0.0006), disc(0.31, 0.0, 0.29, 28, 0.33)); // pool of lamplight
  const PG = { u0: 0.12, u1: 0.484, v0: -0.13, v1: 0.13 };
  box("paper", -PG.u1, -PG.u0, B.th + 0.001, B.th + 0.004, PG.v0, PG.v1); // the B4 page
  const PF = BF(0.0045), lw = 0.0035;
  // tiers from the top of the page down (u grows up the slope; v = world z, +v is image-left)
  frame("seam", PF, 0.37, 0.464, 0.005, 0.11, lw); // top left panel: a speech balloon
  frame("seam", PF, 0.37, 0.464, -0.11, -0.005, lw); // top right: a skyline
  frame("seam", PF, 0.255, 0.36, -0.11, 0.11, lw); // wide middle: a face
  frame("seam", PF, 0.14, 0.245, 0.035, 0.11, lw); // bottom left: speed lines
  frame("seam", PF, 0.14, 0.245, -0.11, 0.025, lw); // bottom right: a figure, pencil only
  ring("seam", PF, 0.417, 0.058, 0.026, 0.03, 16);
  stroke("seam", PF, 0.395, 0.04, 0.38, 0.03, 0.004);
  for (let i = 0; i < 5; i++) rect("seam", PF, 0.375, 0.375 + 0.02 + hash(i + 70) * 0.05, -0.1 + i * 0.019, -0.09 + i * 0.019);
  ring("seam", PF, 0.305, -0.02, 0.034, 0.038, 18); // head
  for (const v of [-0.034, -0.006]) fan("seam", PF, disc(0.308, v, 0.006, 8, 0.004)); // eyes
  for (let i = 0; i < 6; i++) stroke("seam", PF, 0.34 - i * 0.006, 0.03 + i * 0.002, 0.3, 0.1, 0.003); // hair strokes
  for (let i = 0; i < 7; i++) stroke("seam", PF, 0.148 + i * 0.013, 0.105, 0.19, 0.045, 0.0025); // speed lines
  stroke("wall", PF, 0.16, -0.05, 0.225, -0.04, 0.003); // pencil figure (flat sky, no hull)
  ring("wall", PF, 0.228, -0.04, 0.008, 0.011, 10);
  stroke("wall", PF, 0.2, -0.045, 0.19, -0.075, 0.003);
  stroke("wall", PF, 0.2, -0.045, 0.19, -0.015, 0.003);
  place();
  // support behind the board
  box("wood", B.x - Math.cos(B.ang) * B.L + 0.01, B.x - Math.cos(B.ang) * B.L + 0.04, D.y, B.y + Math.sin(B.ang) * B.L - 0.02, B.z - 0.3, B.z + 0.3);
  const boardPt = (u, v, h = 0) => { boardM(); const p = P([-u, B.th + h, v]); place(); return p; };
  const pageC = boardPt(0.3, 0, 0.004);

  // inks, pens and a can on the desk's free end
  const DY = D.y;
  lathe("dark", [[0, DY], [0.032, DY], [0.032, DY + 0.05], [0.016, DY + 0.064], [0, DY + 0.064]], -0.92, 0.4, 8, false);
  cyl("red", -0.92, 0.4, DY + 0.064, DY + 0.084, 0.017, 10);
  lathe("paper", [[0, DY], [0.026, DY], [0.026, DY + 0.045], [0.014, DY + 0.056], [0, DY + 0.056]], -1.02, 0.52, 8, false);
  cyl("dark", -1.02, 0.52, DY + 0.056, DY + 0.074, 0.015, 10);
  rect("label", onX(-0.92 + 0.0326), 0.38, 0.42, DY + 0.012, DY + 0.036); // ink label
  cyl("red", -1.18, 0.34, DY, DY + 0.11, 0.04, 14); // pen cup
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05, k = ["dark", "wood", "amber", "dark", "paper", "dark"][i];
    rod(k, [-1.18 + 0.012 * Math.cos(a), DY + 0.04, 0.34 + 0.012 * Math.sin(a)], [-1.18 + 0.045 * Math.cos(a), DY + 0.24 + 0.015 * (i % 3), 0.34 + 0.045 * Math.sin(a)], 0.0055, 5);
  }
  cyl("amber", -1.26, 0.5, DY, DY + 0.1, 0.035, 14); // brush cup
  for (let i = 0; i < 4; i++) {
    const a = i * 1.6 + 0.4, tip = [-1.26 + 0.05 * Math.cos(a), DY + 0.25 + 0.01 * i, 0.5 + 0.05 * Math.sin(a)];
    rod("wood", [-1.26, DY + 0.04, 0.5], tip, 0.005, 5);
    rod("dark", tip, add(tip, [0.012 * Math.cos(a), 0.035, 0.012 * Math.sin(a)]), 0.007, 5);
  }
  function can(x, z, y = FT) {
    cyl("red", x, z, y, y + 0.122, 0.033, 12);
    cyl("amber", x, z, y + 0.05, y + 0.075, 0.0335, 12);
    cyl("wood", x, z, y + 0.122, y + 0.128, 0.029, 12);
  }
  can(-0.82, 0.54, DY);

  // the clamp lamp: pole and arm from the back corner, shade aimed at the page
  const LC = [-1.34, DY, -0.52], elbow = [-1.28, 1.58, -0.5], head = [-0.86, 1.56, -0.14];
  box("dark", LC[0] - 0.04, LC[0] + 0.04, DY - 0.08, DY + 0.03, LC[2] - 0.03, LC[2] + 0.03);
  rod("wood", [LC[0], DY + 0.03, LC[2]], elbow, 0.011, 6);
  rod("wood", elbow, head, 0.011, 6);
  rod("wood", add(elbow, [0, -0.06, 0]), add(head, [0.03, -0.04, 0]), 0.006, 5); // spring arm
  blob("dark", elbow, [0.022, 0.022, 0.022], 1, undefined, 4, 8);
  const ldir = nrm(sub(pageC, head));
  aim(head, mul(ldir, -1)); // local -Y points at the page
  lathe("red", [[0, 0.04], [0.035, 0.04], [0.045, 0.0], [0.1, -0.13], [0, -0.13]], 0, 0, 18);
  if (lamp) fan("glow", { W: (u, v) => [u, -0.1305, v], back: (u, v) => [u, 0, v] }, disc(0, 0, 0.096, 18));
  place();
  // the glow cone as screentone dots on the cone surface, mouth to the board
  if (lamp) {
    const mouth = add(head, mul(ldir, 0.13)), L = Math.hypot(...sub(pageC, mouth)) - 0.02;
    const t0 = Math.abs(ldir[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], e1 = nrm(cross(ldir, t0)), e2 = cross(e1, ldir);
    const rows = 12, cols = 28;
    for (let i = 0; i < rows; i++) {
      const f = (i + 0.6) / rows, r = 0.1 + f * 0.2, s = 0.004 + f * 0.006, ctr = add(mouth, mul(ldir, f * L));
      for (let j = 0; j < cols; j++) {
        const a = ((j + (i % 2) * 0.5) / cols) * Math.PI * 2, rad = add(mul(e1, Math.cos(a)), mul(e2, Math.sin(a)));
        const tan = cross(ldir, rad), p = add(ctr, mul(rad, r));
        const q = [add(p, mul(tan, s)), add(p, mul(ldir, s)), add(p, mul(tan, -s)), add(p, mul(ldir, -s))];
        quad("glow", ...q, ctr); // outward
        quad("glow", ...q, add(p, mul(rad, 1))); // inward
      }
    }
  }

  // ---------- assistant desk with a smaller board ----------
  const A = AD;
  box("wood", A.x0, A.x1, A.y - dt, A.y, A.z0, A.z1);
  box("wood", A.x0, A.x0 + 0.025, FT, A.y - dt, A.z0, A.z1 - 0.02);
  box("wood", A.x1 - 0.025, A.x1, FT, A.y - dt, A.z0, A.z1 - 0.02);
  box("wood", A.x0 + 0.025, A.x1 - 0.025, 0.35, A.y - dt, A.z0, A.z0 + 0.02);
  const AB = { x: 0.06, z: -0.88, ang: (40 * Math.PI) / 180, L: 0.42, W: 0.5 };
  place(AB.x, A.y, AB.z, -Math.PI / 2, 0, -AB.ang); // yaw so the board rises toward the wall and faces +Z
  box("wood", -AB.L, 0, 0, 0.02, -AB.W / 2, AB.W / 2);
  box("wood", 0, 0.018, -0.01, 0.04, -AB.W / 2, AB.W / 2);
  box("paper", -0.38, -0.08, 0.021, 0.024, -0.105, 0.105);
  const AF = { W: (u, v) => [-u, 0.0245, v], back: (u, v) => [-u, -1, v] };
  frame("seam", AF, 0.27, 0.36, -0.09, 0.09, 0.003);
  frame("seam", AF, 0.1, 0.26, 0.0, 0.09, 0.003);
  frame("seam", AF, 0.1, 0.26, -0.09, -0.01, 0.003);
  ring("seam", AF, 0.315, 0.03, 0.02, 0.023, 14);
  for (let i = 0; i < 6; i++) rect("seam", AF, 0.11 + i * 0.024, 0.122 + i * 0.024, -0.08, -0.02); // tone being cut
  place();
  box("wood", AB.x - 0.04, AB.x + 0.04, A.y, A.y + Math.sin(AB.ang) * AB.L - 0.02, AB.z - Math.cos(AB.ang) * AB.L - 0.01, AB.z - Math.cos(AB.ang) * AB.L + 0.02);
  cyl("amber", -0.18, -1.0, A.y, A.y + 0.1, 0.035, 12);
  for (let i = 0; i < 4; i++) rod(i % 2 ? "dark" : "wood", [-0.18, A.y + 0.04, -1.0], [-0.18 + 0.04 * Math.cos(i * 1.7), A.y + 0.22, -1.0 + 0.04 * Math.sin(i * 1.7)], 0.005, 5);
  can(0.38, -0.92, A.y);
  can(0.63, -0.9, A.y);

  // manuscript paper piles: B4 blocks, each a little turned
  function pile(x, z, y, n, seed) {
    for (let i = 0; i < n; i++) {
      const h = 0.025 + hash(seed + i) * 0.035;
      place(x + (hash(seed + i + 9) - 0.5) * 0.04, y, z + (hash(seed + i + 19) - 0.5) * 0.04, (hash(seed + i + 29) - 0.5) * 0.5);
      box("paper", -0.13, 0.13, 0, h, -0.18, 0.18);
      for (const fz of [0.1801, -0.1801]) rect("seam", { W: (u, v) => [u, v, fz], back: (u, v) => [u, v, 0] }, -0.125, 0.125, h * 0.5 - 0.0015, h * 0.5 + 0.0015);
      for (const fx of [0.1301, -0.1301]) rect("seam", { W: (u, v) => [fx, v, u], back: (u, v) => [0, v, u] }, -0.175, 0.175, h * 0.5 - 0.0015, h * 0.5 + 0.0015);
      y += h;
    }
    place();
  }
  pile(-0.5, 0.72, FT, 8, 100);
  pile(-0.2, 0.95, FT, 4, 140);
  pile(0.5, -1.18, A.y, 4, 160);
  pile(1.08, -0.86, FT, 6, 180);
  for (let i = 0; i < 3; i++) { // crumpled sheets
    const p = [-0.1 + hash(i + 200) * 0.9, FT + 0.035, 0.1 + hash(i + 210) * 0.9];
    blob("paper", p, [0.045, 0.038, 0.042], 1.3, undefined, 4, 6);
  }

  // ---------- bookcases crammed with manga ----------
  // spines are flat colour with no hull: at hero size a volume is two pixels wide and any ink would turn the shelves
  // black, so the shelf boards (inked) frame them and the series read as colour blocks of different heights
  const SPINE = ["bRed", "glow", "bSkin", "label", "haze", "bRed", "bSkin", "label", "wall", "haze"];
  // a row of series: runs of n volumes, one colour and height each; returns the x where it stopped
  // a volume: only the faces a camera in front of the shelf can see (front, top, both sides); flat, no hull
  function vol(key, x0, x1, y0, y1, z0, z1) {
    const r = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    quad(key, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], r);
    quad(key, [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], r);
    quad(key, [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1], r);
    quad(key, [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], r);
  }
  function row(x, stop, y, clear, front, seed) {
    let s = 0;
    while (x < stop - 0.03) {
      const id = seed + s++ * 13, n = 3 + Math.floor(hash(id) * 9), col = SPINE[Math.floor(hash(id + 1) * SPINE.length)];
      const h = Math.min(clear - 0.012, 0.172 + (hash(id + 2) > 0.8 ? 0.035 : hash(id + 3) * 0.012)), w = 0.016 + hash(id + 4) * 0.006;
      const band = hash(id + 5) > 0.3, bandKey = col === "label" ? "haze" : "label";
      for (let k = 0; k < n && x + w < stop; k++) {
        const fz = front - (k === 0 ? 0.004 : 0); // a series stands flush; its first volume sits back a little
        vol(col, x, x + w, y, y + h, fz - 0.113, fz);
        if (band) rect(bandKey, onZ(fz + 0.0006), x + 0.002, x + w - 0.0035, y + h * 0.78, y + h * 0.86);
        rect("seam", onZ(fz + 0.0008), x - 0.0011, x + 0.0011, y, y + h); // the gap between two volumes
        x += w;
      }
      x += 0.002;
      if (hash(id + 6) > 0.85 && x < stop - 0.14) { // a few volumes lying flat
        for (let q = 0; q < 3; q++) vol(SPINE[(Math.floor(hash(id + q + 8) * 7) + q) % SPINE.length], x, x + 0.115, y + q * 0.018, y + (q + 1) * 0.018 - 0.001, front - 0.176, front);
        x += 0.12;
      }
    }
    return x;
  }
  CASES.forEach((K, ci) => {
    const bt = 0.02;
    box("wood", K.x0, K.x0 + bt, FT, CASE.y, CASE.z0, CASE.z1);
    box("wood", K.x1 - bt, K.x1, FT, CASE.y, CASE.z0, CASE.z1);
    box("wood", K.x0, K.x1, CASE.y - bt, CASE.y, CASE.z0, CASE.z1);
    box("wood", K.x0 + bt, K.x1 - bt, FT, CASE.levels[0], CASE.z0, CASE.z1 - 0.01);
    for (const y of CASE.levels.slice(1)) box("wood", K.x0 + bt, K.x1 - bt, y - bt, y, CASE.z0, CASE.z1);
    CASE.levels.forEach((y, s) => {
      const top = s === CASE.levels.length - 1 ? CASE.y - bt : CASE.levels[s + 1] - bt;
      const x = row(K.x0 + bt + 0.004, K.x1 - bt - 0.004, y, top - y, CASE.z1 - 0.012, ci * 1000 + s * 97);
      // volumes stacked flat on top of the row where it leaves headroom
      if (top - y > 0.2 && hash(ci * 50 + s) > 0.5) vol(SPINE[(s + ci) % SPINE.length], K.x0 + 0.08, K.x0 + 0.08 + 0.18, y + 0.176, y + 0.176 + 0.016, CASE.z1 - 0.13, CASE.z1 - 0.017);
      void x;
    });
    pile(K.x0 + 0.2 + ci * 0.15, CASE.z0 + 0.13, CASE.y, 2 + ci, 300 + ci * 10); // paper on top
  });
  // wall shelf over the assistant desk
  const WS = { x0: A.x0 + 0.02, x1: A.x1 - 0.02, y: 1.34, d: 0.2 };
  box("wood", WS.x0, WS.x1, WS.y - 0.022, WS.y, Z0, Z0 + WS.d);
  for (const x of [WS.x0 + 0.1, WS.x1 - 0.1]) box("wood", x - 0.012, x + 0.012, WS.y - 0.16, WS.y - 0.022, Z0, Z0 + 0.14);
  row(WS.x0 + 0.01, WS.x1 - 0.06, WS.y, 0.3, Z0 + WS.d - 0.01, 5000);

  // ---------- office chair, turned toward the desk ----------
  place(CHAIR.x, 0, CHAIR.z, CHAIR.yaw);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3, tip = [0.3 * Math.cos(a), 0.075, 0.3 * Math.sin(a)];
    rod("dark", [0, 0.09, 0], tip, 0.017, 6);
    blob("dark", [tip[0], FT + 0.03, tip[2]], [0.028, 0.03, 0.028], 1, undefined, 4, 8); // caster
  }
  rod("dark", [0, 0.08, 0], [0, 0.42, 0], 0.024, 8); // gas column
  blob("red", [0, 0.47, 0.01], [0.25, 0.05, 0.24], 0.4, undefined, 6, 16); // seat
  box("dark", -0.03, 0.03, 0.44, 0.62, -0.25, -0.2); // back support
  place(CHAIR.x, 0, CHAIR.z, CHAIR.yaw, -0.12);
  blob("red", [0, 0.82, -0.24], [0.22, 0.26, 0.045], 0.45, undefined, 6, 16); // back
  place(CHAIR.x, 0, CHAIR.z, CHAIR.yaw);
  for (const x of [-0.23, 0.23]) {
    box("dark", x - 0.015, x + 0.015, 0.46, 0.64, -0.06, -0.02);
    box("dark", x - 0.025, x + 0.025, 0.64, 0.665, -0.16, 0.12);
  }
  place();

  // ---------- corkboard with pinned storyboard sheets ----------
  const K = CORK;
  box("wood", X0, X0 + 0.025, K.y0, K.y1, K.z0, K.z1);
  box("floor", X0, X0 + 0.03, K.y0 + 0.03, K.y1 - 0.03, K.z0 + 0.03, K.z1 - 0.03);
  for (let i = 0; i < 6; i++) {
    const zc = K.z0 + 0.14 + (i % 3) * 0.23, yc = K.y1 - 0.17 - Math.floor(i / 3) * 0.37 + (hash(i + 400) - 0.5) * 0.03;
    place(X0 + 0.03, yc, zc, 0, (hash(i + 410) - 0.5) * 0.18);
    box("paper", 0, 0.003, -0.105, 0.105, -0.075, 0.075);
    const SF = { W: (u, v) => [0.0036, v, u], back: (u, v) => [-1, v, u] };
    const tiers = 2 + (i % 2);
    for (let t = 0; t < tiers; t++) {
      const v1 = 0.09 - t * (0.18 / tiers), v0 = v1 - 0.18 / tiers + 0.01;
      if ((i + t) % 2) frame("seam", SF, -0.06, 0.06, v0, v1, 0.003);
      else (frame("seam", SF, -0.06, -0.004, v0, v1, 0.003), frame("seam", SF, 0.004, 0.06, v0, v1, 0.003));
    }
    blob("red", [0.012, 0.093, 0], [0.012, 0.012, 0.012], 1, undefined, 4, 8); // pin
  }
  place();

  // ---------- mini fridge with energy drinks ----------
  const F = FRIDGE;
  box("paper", F.x0, F.x1, FT, F.y, F.z0, F.z1);
  const FF = onX(F.x1 + 0.0008);
  frame("seam", FF, F.z0 + 0.02, F.z1 - 0.02, FT + 0.04, F.y - 0.03, 0.005);
  box("dark", F.x1, F.x1 + 0.02, F.y - 0.32, F.y - 0.08, F.z1 - 0.07, F.z1 - 0.045); // handle
  for (const [x, z] of [[-1.3, 0.85], [-1.2, 0.93], [-1.08, 0.83], [-1.25, 1.08], [-1.02, 1.12]]) can(x, z, F.y);
  place(-1.1, F.y + 0.033, 1.0, 0.6, 0, Math.PI / 2); // one lying down
  cyl("red", 0, 0, -0.061, 0.061, 0.033, 12);
  place();

  // ---------- futon rolled and tied in the corner ----------
  const U = FUTON;
  lathe("skin", [[0, FT], [U.r, FT], [U.r, FT + U.h], [0, FT + U.h]], U.x, U.z, 18);
  for (const y of [0.25, 0.72]) cyl("dark", U.x, U.z, y, y + 0.03, U.r + 0.008, 18);
  rect("seam", onX(U.x + U.r + 0.001), U.z - 0.004, U.z + 0.004, FT, FT + U.h); // the outer edge of the roll
  blob("paper", [U.x + 0.01, FT + U.h + 0.06, U.z + 0.01], [0.17, 0.06, 0.12], 0.5, undefined, 6, 12); // pillow on top
  for (let i = 0; i < 40; i++) { // the roll's spiral on its top
    const a0 = i * 0.42, a1 = a0 + 0.42, r0 = 0.02 + (a0 / (Math.PI * 2)) * 0.05, r1 = 0.02 + (a1 / (Math.PI * 2)) * 0.05;
    if (r1 > U.r - 0.01) break;
    stroke("seam", onY(FT + U.h + 0.001), U.x + r0 * Math.cos(a0), U.z + r0 * Math.sin(a0), U.x + r1 * Math.cos(a1), U.z + r1 * Math.sin(a1), 0.006);
  }

  // ---------- meshes ----------
  const MAT = { // [base, shade, threshold, ink px (0 = no hull)]
    wall: [c.wall, c.wall, -1, 0], // inked through the wallInk twins
    floor: [c.floor, c.floorShade, 0.1, 2],
    wood: [c.wood, c.woodShade, 0.1, 2],
    paper: [c.paper, c.paperShade, 0.1, 1.5],
    dark: [c.dark, c.darkShade, 0.1, 1.5],
    red: [c.red, c.redShade, 0.1, 1.5],
    amber: [c.amber, c.amberShade, 0.1, 1.5],
    skin: [c.skin, c.skinShade, 0.1, 2],
    label: [c.paper, c.paper, -1, 0],
    bRed: [c.red, c.red, -1, 0],
    bSkin: [c.skin, c.skin, -1, 0],
    seam: [c.seam, c.seam, -1, 0],
    haze: [c.haze, c.haze, -1, 0],
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
  const anchor = (name, p) => { const a = new THREE.Group(); a.name = name; a.position.set(...p); set.add(a); joints[name] = a; };
  anchor("floor", [0, FT, 0]);
  anchor("desk", [(D.x0 + D.x1) / 2, D.y, (D.z0 + D.z1) / 2]);
  anchor("page", pageC);
  anchor("lamp", head);
  anchor("window", [X0, (WIN.y0 + WIN.y1) / 2, wm]);
  anchor("assistant", [(A.x0 + A.x1) / 2, A.y, (A.z0 + A.z1) / 2]);

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
