// living-room.js - the anime family living room (ima), Western style: low sofa, coffee table with tea, TV on a low
// cabinet, a big sliding glass door to the veranda behind a lace curtain. Static set.
// Contract: harness/lab/README.md. Meters, +Y up, the room's open (cutaway) sides face +X and +Z so a camera in the
// lit front-left quadrant looks in; the -Z wall holds the sliding door and the TV, the -X wall the sofa, the low
// bookshelf and the clock. Stands on y = 0 (the floorboards' top is y = 0.02, joints.floor); the veranda deck lies
// outside the -Z wall on the same ground.
//
// Construction (boxes, lathes, superellipsoid blobs and lofted sheets, triangle soups merged per material; boxes are
// flat shaded so furniture reads crisp, blobs and the lace carry analytic normals so cloth reads soft; every closed
// part is wound away from a point inside it, never by hand):
//   SHELL    floorboards (seams every 0.15 m, staggered butt joints), two walls 0.1 thick with a skirting board, the
//            -Z wall cut around a 1.7 x 2.03 sliding glass door (two framed panels on two tracks, the veranda railing
//            and a treetop seen through the glass), a veranda deck with a railing outside. A 0.8 m ceiling strip
//            runs from the -Z wall (into it) to the open front cut, a round lamp fixed flush under it over the table.
//            (A cross of two thin strips read as a ceiling fan at thumbnail size.)
//   SEATING  a low sofa on the -X wall (plinth, arms, back, boxy blob cushions, three throw cushions), a low wood
//            coffee table with a tea set (teapot with spout and lid, two cups on a tray) and a remote, a cream rug
//            with a green border.
//   TV WALL  a low white cabinet with a wood top and two doors, a flat TV on a foot, the screen a flat bright panel.
//   FITTINGS a lace curtain over the left door panel (a wave sheet, scalloped hem, sky lace motifs), a low bookshelf
//            with books (hash widths, no Math.random) and blank photo frames on top, a potted plant beside the sofa,
//            a wall clock above the sofa, a round pet bed with a cushion in front of the TV.
// Proportions (real size, base unit the ceiling 2.4 m): room 4.0 x 3.6 inside, walls 0.1, ceiling 2.4 (meta.height);
//   sofa 0.88 x 1.9, seat 0.42, back 0.75; coffee table 0.55 x 1.0 x 0.36; TV cabinet 1.3 x 0.42 x 0.45, TV 1.05 x
//   0.62; door 1.7 x 2.03; bookshelf 0.32 x 0.7 x 1.2; rug 1.6 x 1.7; pet bed r 0.3; lamp r 0.28; clock r 0.15.
// Options: build(THREE, kit, colors, { height, night = false }).
//   height  scales the whole set so the wall top is `height` (default 2.4).
//   night   the door glass goes dark (hair) with a moon and stars, the ceiling lamp glows practical, the TV screen
//           brightens to moon with sky glints (a sky pool on the floor read as a rug). The room keeps its day tones (meadow has no dark
//           blue; a room dropped to its shades reads as another place, not as night).
// Ink: the walls are drawn without a hull; whole-wall twins ("wallInk", hull only) ink their silhouettes, so the
//   pieces cut around the door show no seams. Hulls are 1.5-2.5 px: a room is seen small.
// Colours (meadow; roles in meta.colors): walls sky #d7ecef (flat); white furniture, frames, cabinet, cups sclera
//   #f6f3ee / sky; floorboards and wood (table, cabinet top, deck, photo frames) practical #f2c94c / skin #f0c2ae;
//   seams, remote, rail, TV body hair #2c5131; sofa and leaves iris #3f8a47 / hair; border, cushion, books line
//   #a9d16e / iris; teapot, cushion, pot, pet bed, books accent #d9483b / hair; rug, lace, cushion, frames' blanks moon
//   #f7f3e1 / sky; door glass sky (flat) by day, hair at night; screen sky by day, moon at night; glow practical.
// Meshes: 13 (14 at night). ~6.4k triangles.
// Joints: anchors floor, sofa, table, tv, door.

export const meta = {
  name: "living-room",
  height: 2.4,
  script: "meadow",
  colors: {
    wall: "#d7ecef", wallShade: "#d7ecef",
    white: "#f6f3ee", whiteShade: "#d7ecef",
    floor: "#f2c94c", floorShade: "#f0c2ae",
    wood: "#f2c94c", woodShade: "#f0c2ae",
    seam: "#2c5131",
    sofa: "#3f8a47", sofaShade: "#2c5131",
    lime: "#a9d16e", limeShade: "#3f8a47",
    red: "#d9483b", redShade: "#2c5131",
    cream: "#f7f3e1", creamShade: "#d7ecef",
    pane: "#d7ecef",
    screen: "#d7ecef", screenNight: "#f7f3e1",
    night: "#2c5131",
    glow: "#f2c94c",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height, night = false } = opts;
  const c = { ...meta.colors, ...colors };
  const root = new THREE.Group();
  root.name = "living-room";
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
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  // ---------- dimensions ----------
  const X0 = -2.0, X1 = 2.0, Z0 = -1.8, Z1 = 1.8, T = 0.1, FT = 0.02, CEIL = 2.4;
  const DOOR = { x0: -1.65, x1: 0.05, y1: 2.05 };
  const SOFA = { x0: X0, x1: X0 + 0.88, z0: -0.6, z1: 1.3 };
  const TABLE = { x0: -0.78, x1: -0.23, z0: -0.15, z1: 0.85, y: 0.36 };
  const RUG = { x0: -1.06, x1: 0.54, z0: -0.5, z1: 1.2 };
  const CAB = { x0: 0.55, x1: 1.85, z0: Z0, z1: Z0 + 0.42, y: 0.45 };
  const SHELF = { x0: X0, x1: X0 + 0.32, z0: -1.75, z1: -1.05, y: 1.2 };
  const LAMP = { x: -0.5, z: 0.35 };
  const PET = { x: 1.15, z: 0.55, r: 0.3 };
  const PLANT = [-1.7, 1.5];

  // ---------- floor ----------
  box("floor", X0 - T, X1, 0, FT, Z0 - T, Z1);
  const FL = onY(FT + 0.0008);
  for (let z = Z0 + 0.15, k = 0; z < Z1 - 0.05; z += 0.15, k++) {
    rect("seam", FL, X0, X1, z - 0.003, z + 0.003);
    for (let x = X0 + 0.4 + hash(k) * 1.2; x < X1 - 0.1; x += 1.2 + hash(k + 50) * 0.4) rect("seam", FL, x - 0.003, x + 0.003, z, Math.min(z + 0.15, Z1));
  }

  // ---------- walls ----------
  box("wall", X0 - T, X0, FT, CEIL, Z0 - T, Z1); // -X wall
  box("wall", X0, DOOR.x0, FT, CEIL, Z0 - T, Z0); // -Z wall, cut around the door
  box("wall", DOOR.x1, X1, FT, CEIL, Z0 - T, Z0);
  box("wall", DOOR.x0, DOOR.x1, DOOR.y1, CEIL, Z0 - T, Z0);
  box("wallInk", X0 - T, X0, FT, CEIL, Z0 - T, Z1);
  box("wallInk", X0, X1, FT, CEIL, Z0 - T, Z0);
  box("white", X0, X0 + 0.015, FT, 0.09, Z0, Z1); // skirting
  box("white", X0, DOOR.x0, FT, 0.09, Z0, Z0 + 0.015);
  box("white", DOOR.x1, X1, FT, 0.09, Z0, Z0 + 0.015);

  // ---------- ceiling strip (from the -Z wall to the cut) and the round lamp flush under it ----------
  const SW = 0.4, SY = CEIL - 0.06;
  box("white", LAMP.x - SW, LAMP.x + SW, SY, CEIL, Z0, Z1);
  lathe("lamp", [[0, SY - 0.12], [0.24, SY - 0.115], [0.31, SY - 0.085], [0.34, SY - 0.03], [0.34, SY], [0, SY]], LAMP.x, LAMP.z, 28);
  cyl("white", LAMP.x, LAMP.z, SY - 0.03, SY, 0.355, 28); // the rim that holds the shade to the strip

  // ---------- sliding glass door ----------
  const D = DOOR, fw = 0.05, dm = (D.x0 + D.x1) / 2;
  box("white", D.x0, D.x1, FT, FT + 0.04, Z0 - T, Z0 + 0.01); // sill track
  box("white", D.x0, D.x1, D.y1 - 0.04, D.y1, Z0 - T, Z0); // head
  box("white", D.x0, D.x0 + 0.03, FT, D.y1, Z0 - T, Z0); // jambs
  box("white", D.x1 - 0.03, D.x1, FT, D.y1, Z0 - T, Z0);
  // two panels on two tracks; each a frame with the glass inside
  const panels = [[D.x0 + 0.03, dm + 0.03, Z0 - 0.065], [dm - 0.03, D.x1 - 0.03, Z0 - 0.03]];
  for (const [x0, x1, z] of panels) {
    const y0 = FT + 0.04, y1 = D.y1 - 0.04, d = 0.025;
    box("white", x0, x1, y0, y0 + 0.07, z - d, z + d);
    box("white", x0, x1, y1 - fw, y1, z - d, z + d);
    box("white", x0, x0 + fw, y0, y1, z - d, z + d);
    box("white", x1 - fw, x1, y0, y1, z - d, z + d);
    const G = onZ(z), O = onZ(z + 0.0015);
    rect(night ? "night" : "pane", G, x0 + fw, x1 - fw, y0 + 0.07, y1 - fw);
    if (!night) {
      // the veranda railing and a treetop seen through the glass
      const rx0 = x0 + fw, rx1 = x1 - fw;
      rect("seam", O, rx0, rx1, 0.93, 0.96);
      rect("seam", O, rx0, rx1, 0.2, 0.22);
      for (let x = rx0 + 0.06; x < rx1 - 0.02; x += 0.11) rect("seam", O, x - 0.008, x + 0.008, 0.22, 0.93);
    }
    box("seam", x1 - fw - 0.02, x1 - fw - 0.005, 0.95, 1.1, z + d, z + d + 0.006); // handle
  }
  const OUT = onZ(panels[1][2] + 0.002);
  if (!night) {
    const tx0 = panels[1][0] + fw, tx1 = panels[1][1] - fw;
    fan("lime", OUT, disc(tx1 - 0.18, 1.12, 0.2, 14, 0.16).filter((p) => p[1] >= 0.97 && p[0] <= tx1).concat([[tx1, 0.97]]));
    fan("cream", OUT, disc(tx0 + 0.3, 1.7, 0.14, 12, 0.055));
    fan("cream", OUT, disc(tx0 + 0.42, 1.74, 0.09, 12, 0.045));
  } else {
    fan("cream", onZ(panels[1][2] + 0.002), disc(panels[1][1] - 0.3, 1.65, 0.08, 16));
    for (let i = 0; i < 7; i++) fan("glow", onZ(panels[1][2] + 0.002), disc(panels[1][0] + 0.12 + hash(i + 9) * 0.55, 1.0 + hash(i + 19) * 0.85, 0.012, 6));
  }
  // the veranda outside: a deck of boards and a low railing on its edge
  const VZ = Z0 - T, VD = 0.55;
  box("wood", D.x0 - 0.3, D.x1 + 0.3, 0, FT, VZ - VD, VZ);
  for (let x = D.x0 - 0.3 + 0.14; x < D.x1 + 0.28; x += 0.14) rect("seam", onY(FT + 0.0008), x - 0.003, x + 0.003, VZ - VD, VZ);
  for (let x = D.x0 - 0.27; x <= D.x1 + 0.28; x += 0.25) box("seam", x - 0.015, x + 0.015, FT, 0.9, VZ - VD + 0.02, VZ - VD + 0.05);
  box("seam", D.x0 - 0.3, D.x1 + 0.3, 0.9, 0.94, VZ - VD + 0.01, VZ - VD + 0.06);

  // ---------- lace curtain over the left panel ----------
  const RY = 2.18, RZ = Z0 + 0.09;
  rod("seam", [D.x0 - 0.12, RY, RZ], [D.x1 + 0.12, RY, RZ], 0.011, 8);
  for (const x of [D.x0 - 0.13, D.x1 + 0.13]) blob("seam", [x, RY, RZ], [0.022, 0.022, 0.022], 1, undefined, 5, 8);
  for (const x of [D.x0 - 0.05, D.x1 + 0.05]) box("seam", x - 0.01, x + 0.01, RY, RY + 0.012, Z0, RZ);
  {
    const lx0 = D.x0 - 0.06, lx1 = dm + 0.12, yTop = RY - 0.02, yBot = 0.07, nu = 18, nv = 6, th = 0.006, amp = 0.022, waves = 6;
    const zc = RZ - 0.01;
    const hem = (u) => yBot + 0.035 * Math.abs(Math.sin(u * waves * 2 * Math.PI));
    const zAt = (u) => zc + amp * Math.sin(u * waves * Math.PI * 2);
    const surf = (i, j, s) => {
      const u = i / nu, x = lx0 + u * (lx1 - lx0), yb = hem(u), y = yTop - (j / nv) * (yTop - yb);
      const dzdx = (amp * Math.cos(u * waves * Math.PI * 2) * waves * Math.PI * 2) / (lx1 - lx0);
      return [[x, y, zAt(u) + s * th], nrm([-dzdx * s, 0, s])];
    };
    for (const s of [1, -1])
      for (let j = 0; j < nv; j++)
        for (let i = 0; i < nu; i++) {
          const q = [surf(i, j, s), surf(i + 1, j, s), surf(i + 1, j + 1, s), surf(i, j + 1, s)];
          quad("cream", q[0][0], q[1][0], q[2][0], q[3][0], sub(q[0][0], [0, 0, s]), q[0][1], q[1][1], q[2][1], q[3][1]);
        }
    for (let j = 0; j < nv; j++)
      for (const i of [0, nu]) {
        const [a, b, e, d] = [surf(i, j, 1)[0], surf(i, j + 1, 1)[0], surf(i, j + 1, -1)[0], surf(i, j, -1)[0]];
        quad("cream", a, b, e, d, add(a, [i === 0 ? 0.5 : -0.5, 0, 0]));
      }
    for (const j of [0, nv])
      for (let i = 0; i < nu; i++) {
        const [a, b, e, d] = [surf(i, j, 1)[0], surf(i + 1, j, 1)[0], surf(i + 1, j, -1)[0], surf(i, j, -1)[0]];
        quad("cream", a, b, e, d, add(a, [0, j === 0 ? -0.5 : 0.5, 0]));
      }
    // lace motifs: small sky diamonds in rows on the room side, a denser band above the hem
    const motif = (x, y, r) => {
      const u = (x - lx0) / (lx1 - lx0), z = zAt(u) + th + 0.002;
      const F = onZ(z);
      fan("wall", F, [[x, y - r], [x + r * 0.7, y], [x, y + r], [x - r * 0.7, y]]);
    };
    for (let row = 0; row < 7; row++)
      for (let k = 0; k < 6; k++) {
        const x = lx0 + 0.1 + (k + (row % 2) * 0.5) * ((lx1 - lx0 - 0.2) / 5.5), y = 0.45 + row * 0.24;
        if (x < lx1 - 0.06) motif(x, y, 0.025);
      }
    for (let k = 0; k < 14; k++) motif(lx0 + 0.06 + k * ((lx1 - lx0 - 0.12) / 13), 0.23, 0.035);
  }

  // ---------- low sofa on the -X wall, facing +X ----------
  const SF = SOFA, sz = (SF.z0 + SF.z1) / 2;
  box("seam", SF.x0 + 0.06, SF.x1 - 0.06, FT, 0.08, SF.z0 + 0.06, SF.z1 - 0.06); // recessed plinth
  box("sofa", SF.x0, SF.x1, 0.08, 0.3, SF.z0, SF.z1); // seat base
  box("sofa", SF.x0, SF.x0 + 0.2, 0.3, 0.62, SF.z0, SF.z1); // back frame
  for (const [z0, z1] of [[SF.z0, SF.z0 + 0.16], [SF.z1 - 0.16, SF.z1]]) blob("sofa", [(SF.x0 + SF.x1) / 2, 0.36, (z0 + z1) / 2], [(SF.x1 - SF.x0) / 2, 0.2, 0.08], 0.3, undefined, 6, 14); // arms
  for (const zc of [sz - 0.39, sz + 0.39]) {
    blob("sofa", [SF.x0 + 0.5, 0.36, zc], [0.31, 0.075, 0.38], 0.3, undefined, 6, 14); // seat cushions
    blob("sofa", [SF.x0 + 0.27, 0.62, zc], [0.09, 0.2, 0.37], 0.35, undefined, 6, 14); // back cushions
  }
  // throw cushions leaning on the back
  const lean = (key, z, yaw, s = 1) => {
    const d = nrm([Math.cos(0.35), Math.sin(0.35), 0]); // the cushion's face normal, leaning back
    const ez = [Math.sin(yaw), 0, Math.cos(yaw)], ey = nrm(cross(d, ez));
    blob(key, [SF.x0 + 0.42, 0.57, z], [0.07 * s, 0.17 * s, 0.17 * s], 0.45, [d, ey, cross(ey, d)], 6, 12);
  };
  lean("red", SF.z0 + 0.38, 0);
  lean("lime", sz + 0.02, 0, 0.92);
  lean("cream", SF.z1 - 0.36, 0);

  // ---------- rug and coffee table with the tea set ----------
  box("cream", RUG.x0, RUG.x1, FT, FT + 0.01, RUG.z0, RUG.z1);
  const RG = onY(FT + 0.0108), bw = 0.09, bi = 0.08;
  rect("lime", RG, RUG.x0 + bi, RUG.x1 - bi, RUG.z0 + bi, RUG.z0 + bi + bw);
  rect("lime", RG, RUG.x0 + bi, RUG.x1 - bi, RUG.z1 - bi - bw, RUG.z1 - bi);
  rect("lime", RG, RUG.x0 + bi, RUG.x0 + bi + bw, RUG.z0 + bi + bw, RUG.z1 - bi - bw);
  rect("lime", RG, RUG.x1 - bi - bw, RUG.x1 - bi, RUG.z0 + bi + bw, RUG.z1 - bi - bw);
  const TB = TABLE, ty = FT + 0.01;
  box("wood", TB.x0, TB.x1, TB.y - 0.035, TB.y, TB.z0, TB.z1); // top
  box("wood", TB.x0 + 0.04, TB.x1 - 0.04, TB.y - 0.08, TB.y - 0.035, TB.z0 + 0.04, TB.z1 - 0.04); // apron
  for (const x of [TB.x0 + 0.05, TB.x1 - 0.05]) for (const z of [TB.z0 + 0.05, TB.z1 - 0.05]) box("wood", x - 0.025, x + 0.025, ty, TB.y - 0.035, z - 0.025, z + 0.025);
  rect("seam", onZ(TB.z1 + 0.0008), TB.x0, TB.x1, TB.y - 0.012, TB.y - 0.008); // top edge line
  // tray, teapot and two cups
  const TP = [(TB.x0 + TB.x1) / 2, TB.z0 + 0.32];
  box("white", TP[0] - 0.13, TP[0] + 0.13, TB.y, TB.y + 0.015, TP[1] - 0.2, TP[1] + 0.2);
  const ty2 = TB.y + 0.015;
  lathe("red", [[0, ty2], [0.055, ty2], [0.085, ty2 + 0.04], [0.08, ty2 + 0.08], [0.045, ty2 + 0.1], [0, ty2 + 0.1]], TP[0], TP[1] - 0.06, 14);
  cyl("red", TP[0], TP[1] - 0.06, ty2 + 0.1, ty2 + 0.115, 0.012, 8); // lid knob
  rod("red", [TP[0] + 0.06, ty2 + 0.04, TP[1] - 0.06], [TP[0] + 0.13, ty2 + 0.1, TP[1] - 0.06], 0.012, 6); // spout
  rod("seam", [TP[0] + 0.035, ty2 + 0.1, TP[1] - 0.06], [TP[0] - 0.065, ty2 + 0.16, TP[1] - 0.06], 0.005, 5); // bail handle
  for (const dz of [0.08, 0.15]) lathe("white", [[0, ty2], [0.025, ty2], [0.033, ty2 + 0.055], [0, ty2 + 0.055]], TP[0] + (dz > 0.1 ? 0.06 : -0.05), TP[1] + dz, 10);
  // the remote, angled on the free end
  place(TB.x0 + 0.27, TB.y, TB.z1 - 0.2, 0.5);
  box("seam", -0.022, 0.022, 0, 0.018, -0.09, 0.09);
  rect("red", onY(0.0186), -0.008, 0.008, 0.06, 0.075);
  place();

  // ---------- TV cabinet and TV ----------
  const C = CAB;
  box("white", C.x0, C.x1, FT + 0.05, C.y - 0.03, C.z0, C.z1); // body
  for (const x of [C.x0 + 0.05, C.x1 - 0.05]) box("white", x - 0.025, x + 0.025, FT, FT + 0.05, C.z1 - 0.08, C.z1 - 0.03); // feet
  for (const x of [C.x0 + 0.05, C.x1 - 0.05]) box("white", x - 0.025, x + 0.025, FT, FT + 0.05, C.z0 + 0.03, C.z0 + 0.08);
  box("wood", C.x0 - 0.01, C.x1 + 0.01, C.y - 0.03, C.y, C.z0, C.z1 + 0.01); // wood top
  const CF = onZ(C.z1 + 0.0008), cm = (C.x0 + C.x1) / 2;
  rect("seam", CF, cm - 0.004, cm + 0.004, FT + 0.07, C.y - 0.05);
  rect("seam", CF, C.x0 + 0.03, C.x1 - 0.03, 0.235, 0.243);
  for (const x of [cm - 0.06, cm + 0.06]) box("seam", x - 0.008, x + 0.008, 0.29, 0.38, C.z1, C.z1 + 0.012); // pulls
  const TVZ = C.z0 + 0.2, TVW = 1.05, TVH = 0.62, tv0 = C.y + 0.08;
  box("tv", cm - 0.17, cm + 0.17, C.y, C.y + 0.012, TVZ - 0.1, TVZ + 0.08); // foot
  box("tv", cm - 0.035, cm + 0.035, C.y, tv0 + 0.1, TVZ - 0.03, TVZ + 0.01); // neck
  box("tv", cm - TVW / 2, cm + TVW / 2, tv0, tv0 + TVH, TVZ, TVZ + 0.04); // panel
  const sx0 = cm - TVW / 2 + 0.025, sx1 = cm + TVW / 2 - 0.025, sy0 = tv0 + 0.03, sy1 = tv0 + TVH - 0.025;
  rect("screen", onZ(TVZ + 0.0408), sx0, sx1, sy0, sy1);
  // two diagonal glints across the blank screen (cream by day, sky on the bright night screen)
  for (const [u, w] of [[0.5, 0.07], [0.66, 0.025]]) {
    const xa = sx0 + u * (sx1 - sx0), dx = 0.2;
    fan(night ? "wall" : "cream", onZ(TVZ + 0.0412), [[xa, sy0], [xa + w, sy0], [xa + w + dx, sy1], [xa + dx, sy1]]);
  }

  // ---------- low bookshelf with blank photo frames ----------
  const B = SHELF, bt = 0.02;
  box("white", B.x0, B.x1, FT, B.y, B.z0, B.z0 + bt);
  box("white", B.x0, B.x1, FT, B.y, B.z1 - bt, B.z1);
  box("white", B.x0, B.x1 + 0.01, B.y - bt, B.y, B.z0, B.z1);
  box("white", B.x0, B.x1 - 0.01, FT, 0.07, B.z0 + bt, B.z1 - bt); // plinth
  const levels = [0.07, 0.45, 0.83];
  for (const y of levels.slice(1)) box("white", B.x0, B.x1, y - bt, y, B.z0 + bt, B.z1 - bt);
  const BOOK = ["red", "sofa", "lime", "wood", "cream", "red", "lime"];
  levels.forEach((y, s) => {
    const clear = (s === levels.length - 1 ? B.y - bt : levels[s + 1] - bt) - y;
    let z = B.z0 + bt + 0.01, k = 0;
    const stop = B.z1 - bt - (s === 1 ? 0.24 : 0.02);
    while (z < stop - 0.03) {
      const id = s * 37 + k++;
      const w = 0.026 + hash(id) * 0.026, h = Math.min(clear - 0.04, 0.2 + hash(id + 7) * 0.1), d = 0.2 + hash(id + 3) * 0.06;
      if (s === 2) break; // the top shelf holds frames
      box(BOOK[Math.floor(hash(id + 13) * BOOK.length)], B.x1 - 0.02 - d, B.x1 - 0.02, y, y + h, z, Math.min(z + w, stop));
      z += w + 0.002;
    }
  });
  // photo frames standing on the top shelf and on the shelf top, blank faces, leaning back a little
  const frame = (key, x, y, z, w, h) => {
    place(x, y, z, 0, 0, 0.12);
    box(key, -0.012, 0.012, 0, h, -w / 2, w / 2);
    rect("cream", onX(0.0125), -w / 2 + 0.018, w / 2 - 0.018, 0.018, h - 0.018);
    box(key, -0.07, -0.01, 0, 0.012, -0.01, 0.01); // the strut that keeps it standing
    place();
  };
  frame("wood", B.x0 + 0.2, B.y, B.z0 + 0.15, 0.16, 0.2);
  frame("red", B.x0 + 0.2, B.y, B.z0 + 0.37, 0.12, 0.15);
  frame("wood", B.x0 + 0.2, B.y, B.z1 - 0.13, 0.18, 0.13);
  frame("white", B.x0 + 0.2, levels[2], B.z0 + 0.2, 0.2, 0.25);
  frame("wood", B.x0 + 0.2, levels[2], B.z1 - 0.18, 0.15, 0.2);
  cyl("lime", B.x0 + 0.17, B.z1 - 0.13, levels[1], levels[1] + 0.09, 0.05, 12); // a small pot on the middle shelf

  // ---------- potted plant beside the sofa ----------
  lathe("red", [[0, FT], [0.1, FT], [0.135, 0.34], [0.15, 0.34], [0.15, 0.38], [0.128, 0.38], [0.128, 0.35], [0, 0.35]], PLANT[0], PLANT[1], 16);
  cyl("seam", PLANT[0], PLANT[1], 0.34, 0.365, 0.128, 14); // soil
  for (let i = 0; i < 13; i++) {
    const a = i * 2.39996, up = 0.4 + 0.6 * hash(i + 3), lw = 0.4 + 0.6 * hash(i + 11);
    const base = [PLANT[0] + 0.02 * Math.cos(a), 0.35, PLANT[1] + 0.02 * Math.sin(a)];
    const tip = [PLANT[0] + lw * 0.26 * Math.cos(a), 0.35 + up * 0.95, PLANT[1] + lw * 0.22 * Math.sin(a)];
    rod("sofa", base, tip, 0.006, 4);
    const d = nrm([Math.cos(a) * lw, 0.25 + 0.5 * hash(i), Math.sin(a) * lw * 0.8]);
    const ex = nrm(cross([0, 1, 0], d)), ey = cross(d, ex);
    blob("sofa", add(tip, mul(d, 0.1)), [0.08, 0.01, 0.15], 1, [ex, ey, d], 4, 10);
  }

  // ---------- pet bed in front of the TV ----------
  lathe("red", [[0, FT], [PET.r, FT], [PET.r + 0.02, FT + 0.08], [PET.r - 0.01, FT + 0.15], [PET.r - 0.08, FT + 0.14], [PET.r - 0.09, FT + 0.05], [0, FT + 0.05]], PET.x, PET.z, 22);
  blob("cream", [PET.x, FT + 0.075, PET.z], [PET.r - 0.1, 0.04, PET.r - 0.1], 0.6, undefined, 6, 16);

  // ---------- wall clock above the sofa ----------
  const CK = { y: 1.78, z: sz };
  place(X0, CK.y, CK.z, 0, 0, -Math.PI / 2);
  lathe("wood", [[0, 0], [0.155, 0], [0.155, 0.035], [0.13, 0.035], [0.13, 0.03], [0, 0.03]], 0, 0, 24);
  place();
  const CKF = onX(X0 + 0.0305), CKH = onX(X0 + 0.034);
  fan("cream", CKF, disc(CK.z, CK.y, 0.131, 24));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, r0 = i % 3 ? 0.108 : 0.092;
    const [ca, sa] = [Math.cos(a), Math.sin(a)];
    fan("seam", CKH, [[CK.z + ca * r0 - sa * 0.004, CK.y + sa * r0 + ca * 0.004], [CK.z + ca * 0.12 - sa * 0.004, CK.y + sa * 0.12 + ca * 0.004], [CK.z + ca * 0.12 + sa * 0.004, CK.y + sa * 0.12 - ca * 0.004], [CK.z + ca * r0 + sa * 0.004, CK.y + sa * r0 - ca * 0.004]]);
  }
  const hand = (a, L, w) => fan("seam", onX(X0 + 0.036), [[CK.z - Math.sin(a) * w, CK.y + Math.cos(a) * w], [CK.z + Math.cos(a) * L, CK.y + Math.sin(a) * L], [CK.z + Math.sin(a) * w, CK.y - Math.cos(a) * w]]);
  hand(Math.PI * 0.85, 0.07, 0.008);
  hand(Math.PI * 0.35, 0.105, 0.006);
  fan("red", onX(X0 + 0.037), disc(CK.z, CK.y, 0.01, 8));

  // ---------- meshes ----------
  const MAT = { // [base, shade, threshold, ink px (0 = no hull)]
    wall: [c.wall, c.wallShade, 0.1, 0], // inked through the wallInk twins
    white: [c.white, c.whiteShade, 0.1, 2],
    wood: [c.wood, c.woodShade, 0.1, 2],
    floor: [c.floor, c.floorShade, 0.1, 2.5],
    seam: [c.seam, c.seam, 0.1, 0],
    sofa: [c.sofa, c.sofaShade, 0.1, 2],
    lime: [c.lime, c.limeShade, 0.1, 1.5],
    red: [c.red, c.redShade, 0.0, 2],
    cream: [c.cream, c.creamShade, 0.1, 1.5],
    tv: [c.seam, c.seam, 0.1, 2],
    pane: [c.pane, c.pane, -1, 0],
    night: [c.night, c.night, -1, 0],
    screen: night ? [c.screenNight, c.screenNight, -1, 0] : [c.screen, c.screen, -1, 0],
    lamp: night ? [c.glow, c.glow, -1, 2] : [c.white, c.whiteShade, 0.1, 2],
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
  anchor("sofa", SF.x0 + 0.5, 0.43, sz);
  anchor("table", (TB.x0 + TB.x1) / 2, TB.y, (TB.z0 + TB.z1) / 2);
  anchor("tv", cm, tv0 + TVH / 2, TVZ);
  anchor("door", dm, D.y1 / 2, Z0);

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
