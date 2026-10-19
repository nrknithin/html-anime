// movie-theater.js - the anime date-scene cinema, cut away: raked rows of red flip seats facing a pale glowing screen
// in a red curtain frame, aisle step lights, wall sconces and a projection booth whose light cone runs to the screen.
// Contract: harness/lab/README.md. Meters, +Y up. The seats face -Z (the screen wall); the cutaway (open) sides are
// +Z (behind the back row) and +X (the aisle side), so the lab's front-left cameras look in over the seat backs.
// Stands on y = 0, centred on the footprint.
//
// Construction (boxes, convex prisms, lathes and flat glow slabs, all triangle soups merged per material, as
// karaoke-room.js; every closed part is wound away from a point inside it or from its profile's outward normal,
// never by hand):
//   SHELL   a base floor slab, one stepped tier per row behind the first (rise 0.3), a low stage under the screen,
//           the screen wall (-Z) and one side wall (-X). The aisle runs down the open +X side with a half step in
//           front of every riser; each tread nose carries a glowing strip.
//   SEATS   8 a row: a padded cushion (prism with a rounded front), a tall tombstone back reclined 10 deg, dark side
//           standards with armrests and a ring cup holder at each armrest's front. A few empty seats are flipped up.
//           The aisle-end standard of each row has a small glowing step light on its aisle face.
//   SCREEN  a dark masking frame, a glowing pale screen with abstract shapes (a disc, two hills, a bar), red pleated
//           curtains each side and a pleated valance on top.
//   BOOTH   a stub of the back wall on the -X side with a projection port, a cut-open booth behind it (floor, back
//           wall) holding a projector with two film reels. The light cone is one flat opaque pale wedge (a thin slab
//           in the vertical plane from the port to the screen centre), drawn without ink.
//   PROPS   one date pair at the aisle end of the back row: a popcorn tub (red and white stripes, a heap of puffs)
//           on the aisle armrest, where the lab's back-quarter cameras see it, and a drink with a lid and straw in
//           each of the pair's other two cup holders.
// Proportions (real size, base unit the wall height H = 4.0 m = meta.height): seat pitch 0.56, row pitch 1.0,
//   seat 0.48 high, back top 1.08; screen 4.8 x 2.1 at 1.05; port 3.05-3.4 high; room 5.9 wide.
// Options: build(THREE, kit, colors, { height, rows }).
//   height  scales the whole set so the wall top is `height` (default 4.0).
//   rows    seat rows (1-8, default 4); the room grows toward +Z.
// Clip: flicker 2 s, the light cone's spread and the screen shapes breathe a few percent (two sines, a seamless loop);
//   two meshes have their positions rewritten, nothing else moves (pose("flicker@0.5")).
// Colours (indigo script, every hex from it; a dark room): floor and walls sky #1b2d6b / hair #16141c (the screen
//   wall faces the camera, so it stays hair and the screen glows on it); seats and curtains accent #e23b4a / sky;
//   standards, armrests, booth and projector sky / hair; cups, cup holders, tub stripes sclera #f6f3ee / moon
//   #d5e2ff; screen moon (glow); shapes sclera (glow); cone line #e7eefc (glow); step lights, sconces, lens
//   practical #f0c36a (glow); sconce spill iris #e7a04a (glow); popcorn practical / iris; masking hair (flat).
// Joints: anchors screen, port, pair (the date pair's seat row centre).

export const meta = {
  name: "movie-theater",
  height: 4.0,
  script: "indigo",
  colors: {
    floor: "#1b2d6b", floorShade: "#16141c",
    wall: "#1b2d6b", wallShade: "#16141c",
    seat: "#e23b4a", seatShade: "#1b2d6b",
    dark: "#1b2d6b", darkShade: "#16141c",
    white: "#f6f3ee", whiteShade: "#d5e2ff",
    corn: "#f0c36a", cornShade: "#e7a04a",
    screen: "#d5e2ff",
    shapes: "#f6f3ee",
    cone: "#e7eefc",
    glow: "#f0c36a",
    spill: "#e7a04a",
    masking: "#16141c",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const { height = meta.height } = opts;
  const rows = Math.max(1, Math.min(8, Math.floor(opts.rows ?? 4)));
  const TAU = Math.PI * 2, D = Math.PI / 180;
  const root = new THREE.Group();
  root.name = "movie-theater";
  const set = new THREE.Group(); // uniform size scale
  set.name = "theater";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const body = new THREE.Group(); // centring offset
  body.name = "body";
  set.add(body);
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
  let M = null;
  const v3 = new THREE.Vector3();
  const P = (q) => (M ? (v3.set(...q).applyMatrix4(M), [v3.x, v3.y, v3.z]) : q);
  const N = (q) => (M ? (v3.set(...q).transformDirection(M), [v3.x, v3.y, v3.z]) : q);
  function place(x, y, z, ry = 0, rx = 0) {
    if (x === undefined) return (M = null);
    M = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, 0, "YXZ")), new THREE.Vector3(1, 1, 1));
  }
  // one triangle wound away from ref (local coords); optional per-vertex normals
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
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
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
  // convex 2D profile extruded along an axis: "z" profile [x, y] from z0 to z1; "x" profile [z, y] from x0 to x1
  function prism(key, prof, axis, w0, w1) {
    const at = (q, w) => (axis === "z" ? [q[0], q[1], w] : [w, q[1], q[0]]);
    const cu = prof.reduce((s, q) => s + q[0], 0) / prof.length, cv = prof.reduce((s, q) => s + q[1], 0) / prof.length;
    const ref = at([cu, cv], (w0 + w1) / 2), n = prof.length;
    for (let i = 0; i < n; i++) {
      const a = prof[i], b = prof[(i + 1) % n];
      quad(key, at(a, w0), at(b, w0), at(b, w1), at(a, w1), ref);
      if (i > 0 && i < n - 1) for (const w of [w0, w1]) tri(key, at(prof[0], w), at(a, w), at(b, w), ref);
    }
  }
  // rounded rectangle profile (corners rounded with radius r at the listed corners: "tl","tr","bl","br")
  function rrect(u0, u1, v0, v1, r, corners, seg = 3) {
    const out = [];
    const C = { bl: [u0 + r, v0 + r, Math.PI], br: [u1 - r, v0 + r, 1.5 * Math.PI], tr: [u1 - r, v1 - r, 0], tl: [u0 + r, v1 - r, 0.5 * Math.PI] };
    const sharp = { bl: [u0, v0], br: [u1, v0], tr: [u1, v1], tl: [u0, v1] };
    for (const k of ["bl", "br", "tr", "tl"]) {
      if (!corners.includes(k)) { out.push(sharp[k]); continue; }
      const [cu, cv, a0] = C[k];
      for (let i = 0; i <= seg; i++) { const a = a0 + (i / seg) * (Math.PI / 2); out.push([cu + r * Math.cos(a), cv + r * Math.sin(a)]); }
    }
    return out;
  }
  // surface of revolution about y at (cx, cz): profile [[r, y], ...] from the bottom centre to the top centre, in
  // order (outward normal of each segment is (dy, -dr)); sideKey(j) may colour each of the n sectors
  function lathe(key, prof, cx, cz, n = 8, sideKey = null) {
    const at = (q, j) => { const a = (j / n) * TAU; return [cx + q[0] * Math.cos(a), q[1], cz + q[0] * Math.sin(a)]; };
    for (let i = 0; i + 1 < prof.length; i++) {
      const [r0, y0] = prof[i], [r1, y1] = prof[i + 1];
      const nr = y1 - y0, ny = -(r1 - r0);
      for (let j = 0; j < n; j++) {
        const am = ((j + 0.5) / n) * TAU, rm = (r0 + r1) / 2, ym = (y0 + y1) / 2;
        const mid = [cx + rm * Math.cos(am), ym, cz + rm * Math.sin(am)];
        const out = nrm([nr * Math.cos(am), ny, nr * Math.sin(am)]);
        const ref = sub(mid, mul(out, 0.01));
        const k = sideKey && Math.abs(nr) > 1e-6 ? sideKey(j) : key;
        quad(k, at(prof[i], j), at(prof[i], j + 1), at(prof[i + 1], j + 1), at(prof[i + 1], j), ref);
      }
    }
  }
  // a round rod from a to b (radius r, n sides), capped
  function rod(key, a, b, r, n = 6) {
    const d = nrm(sub(b, a)), up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const e1 = nrm(cross(d, up)), e2 = cross(e1, d);
    const ring = (o) => Array.from({ length: n }, (_, j) => { const t = (j / n) * TAU; return add(o, add(mul(e1, r * Math.cos(t)), mul(e2, r * Math.sin(t)))); });
    const ra = ring(a), rb = ring(b), mid = mul(add(a, b), 0.5);
    for (let j = 0; j < n; j++) {
      const k = (j + 1) % n;
      quad(key, ra[j], ra[k], rb[k], rb[j], mid);
      tri(key, a, ra[j], ra[k], mid);
      tri(key, b, rb[j], rb[k], mid);
    }
  }
  // an octahedron puff (popcorn)
  function puff(key, o, r) {
    const V = [[r, 0, 0], [-r, 0, 0], [0, r, 0], [0, -r * 0.8, 0], [0, 0, r], [0, 0, -r]].map((q) => add(o, q));
    for (const [a, b] of [[0, 4], [4, 1], [1, 5], [5, 0]]) for (const y of [2, 3]) tri(key, V[a], V[b], V[y], o);
  }

  // ---------- layout (before centring: screen wall inner face z = 0, rows toward +Z) ----------
  const H = 4.0, FL = 0.12, RISE = 0.3, ROW0 = 3.0, PITCH = 1.0;
  const XW = -2.9, XE = 3.0, AX0 = 1.76; // inner -X wall face, open +X edge, aisle start
  const NS = 8, SP = 0.56, SX0 = -2.52; // seats a row, pitch, first seat centre
  const rowZ = (i) => ROW0 + PITCH * i, tierY = (i) => FL + RISE * i;
  const ZE = rowZ(rows - 1) + 0.6; // back edge of the last tier

  // floor, tiers, stage
  box("floor", XW, XE, 0, FL, 0, ZE);
  for (let i = 1; i < rows; i++) {
    box("floor", XW, XE, FL - 0.01, tierY(i), rowZ(i) - 0.5, i === rows - 1 ? ZE : rowZ(i) + 0.5);
    // aisle half step in front of the riser, and glowing nosings
    const zs = rowZ(i) - 0.5, ys = tierY(i - 1) + RISE / 2;
    box("floor", AX0, XE - 0.004, tierY(i - 1) - 0.01, ys, zs - 0.42, zs);
    box("glow", AX0 + 0.08, XE - 0.08, ys, ys + 0.008, zs - 0.42, zs - 0.37);
    box("glow", AX0 + 0.08, XE - 0.08, tierY(i), tierY(i) + 0.008, zs, zs + 0.05);
  }
  box("floor", XW, XE, FL - 0.01, 0.45, 0, 0.8); // stage

  // walls: screen wall and the -X wall; a back-wall stub with the projection port
  box("wall", XW - 0.15, XE, 0, H, -0.15, 0);
  box("wall", XW - 0.15, XW, 0, H, 0, ZE + 1.05);
  // back wall: only a lintel band over the entrance gap, holding the projection port; the booth floor behind it
  const PX0 = -2.45, PX1 = -2.1, PY0 = 3.05, PY1 = 3.4, BX1 = -1.6, ZB = ZE + 0.15, LY = 2.75, LT = 3.75;
  box("wall", XW, BX1, LY, PY0, ZE, ZB);
  box("wall", XW, BX1, PY1, LT, ZE, ZB);
  box("wall", XW, PX0, PY0, PY1, ZE, ZB);
  box("wall", PX1, BX1, PY0, PY1, ZE, ZB);
  box("wall", XW, BX1, LY - 0.1, LY, ZB, ZE + 1.05);
  const PCX = (PX0 + PX1) / 2, PCY = (PY0 + PY1) / 2;
  box("dark", PCX - 0.14, PCX + 0.14, LY, 2.9, ZB + 0.35, ZB + 0.75); // pedestal
  box("dark", PCX - 0.24, PCX + 0.24, 2.9, 3.36, ZB + 0.2, ZB + 0.9); // body
  rod("dark", [PCX, PCY, ZB + 0.2], [PCX, PCY, ZB + 0.04], 0.075, 8); // lens barrel
  rod("glow", [PCX, PCY, ZB + 0.04], [PCX, PCY, ZB + 0.025], 0.055, 8); // lens
  for (const z of [ZB + 0.3, ZB + 0.82]) {
    rod("dark", [PCX - 0.035, 3.62, z], [PCX + 0.035, 3.62, z], 0.25, 12); // reel
    rod("white", [PCX + 0.035, 3.62, z], [PCX + 0.045, 3.62, z], 0.05, 6); // hub
    box("dark", PCX - 0.015, PCX + 0.015, 3.36, 3.5, z - 0.03, z + 0.03); // arm
  }

  // sconces on the -X wall, each with a fan of light up the wall
  for (let z = 1.6; z < ZE - 0.2; z += 2.4) {
    const y0 = 2.45, y1 = 2.7, x0 = XW, x1 = XW + 0.09;
    hex("glow", [[x0, y0, z - 0.07], [x1, y0, z - 0.05], [x1, y0, z + 0.05], [x0, y0, z + 0.07], [x0, y1, z - 0.14], [x1, y1, z - 0.11], [x1, y1, z + 0.11], [x0, y1, z + 0.14]]);
    const xs = XW + 0.004;
    hex("spill", [[XW, y1, z - 0.14], [xs, y1, z - 0.14], [xs, y1, z + 0.14], [XW, y1, z + 0.14], [XW, y1 + 0.4, z - 0.26], [xs, y1 + 0.4, z - 0.26], [xs, y1 + 0.4, z + 0.26], [XW, y1 + 0.4, z + 0.26]]);
    hex("spill", [[XW, y0 - 0.2, z - 0.1], [xs, y0 - 0.2, z - 0.1], [xs, y0 - 0.2, z + 0.1], [XW, y0 - 0.2, z + 0.1], [XW, y0, z - 0.07], [xs, y0, z - 0.07], [xs, y0, z + 0.07], [XW, y0, z + 0.07]]);
  }

  // screen: masking, glowing screen, shapes (their own soup: they move), curtains and valance
  const SX = [-2.4, 2.4], SY = [1.05, 3.15];
  box("masking", SX[0] - 0.15, SX[1] + 0.15, SY[0] - 0.1, SY[1] + 0.12, 0, 0.012);
  box("screen", SX[0], SX[1], SY[0], SY[1], 0.012, 0.024);
  // abstract shapes: each scales about its own centre in the flicker; shapeOf[v] is the centre of vertex v
  const ZS0 = 0.027, ZS1 = 0.031, shapeOf = [];
  function shape(prof) {
    const o = [prof.reduce((s, q) => s + q[0], 0) / prof.length, prof.reduce((s, q) => s + q[1], 0) / prof.length];
    const before = S("shapes").p.length;
    prism("shapes", prof, "z", ZS0, ZS1);
    for (let k = before; k < S("shapes").p.length; k += 3) shapeOf.push(o);
  }
  shape(Array.from({ length: 14 }, (_, j) => [0.85 + 0.5 * Math.cos((j / 14) * TAU), 2.3 + 0.5 * Math.sin((j / 14) * TAU)])); // disc
  shape([[-2.3, 1.12], [-0.6, 1.12], [-1.35, 2.05]]); // hills
  shape([[-1.0, 1.12], [0.4, 1.12], [-0.25, 1.7]]);
  shape([[-2.0, 2.72], [-0.3, 2.72], [-0.3, 2.82], [-2.0, 2.82]]); // bar
  // pleated drape: a row of triangular prisms standing on the wall, ridges toward +Z
  function drape(key, x0, x1, y0, y1, z0, depth, w) {
    const n = Math.max(1, Math.round(Math.abs(x1 - x0) / w)), dx = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const a = x0 + i * dx, b = a + dx, m = a + dx * 0.75;
      hex(key, [[a, y0, z0], [b, y0, z0], [m, y0, z0 + depth], [m, y0, z0 + depth], [a, y1, z0], [b, y1, z0], [m, y1, z0 + depth], [m, y1, z0 + depth]]);
    }
  }
  drape("curtain", SX[0] - 0.5, SX[0] + 0.18, 0.45, 3.55, 0.035, 0.13, 0.17);
  drape("curtain", SX[1] - 0.18, SX[1] + 0.5, 0.45, 3.55, 0.035, 0.13, 0.17);
  drape("curtain", SX[0] - 0.55, SX[1] + 0.55, 3.3, 3.8, 0.06, 0.16, 0.2);

  // light cone: a thin vertical slab from the port to the screen centre (its own soup: it breathes)
  const CA = [PCX, PCY, ZE - 0.01], CB = [0.0, 2.1, 0.035]; // apex (port, inside face) and screen centre
  const halfA = 0.07, halfB = 0.5, th = 0.012;
  const cdir = nrm(sub(CB, CA)), cside = nrm(cross(cdir, [0, 1, 0]));
  {
    const o = (p, s) => add(p, mul(cside, s));
    const a0 = [CA[0], CA[1] - halfA, CA[2]], a1 = [CA[0], CA[1] + halfA, CA[2]];
    const b0 = [CB[0], CB[1] - halfB, CB[2]], b1 = [CB[0], CB[1] + halfB, CB[2]];
    hex("cone", [o(a0, -th), o(b0, -th), o(b0, th), o(a0, th), o(a1, -th), o(b1, -th), o(b1, th), o(a1, th)]);
  }

  // ---------- seats ----------
  const pairRow = rows - 1, pairSeats = [6, 7];
  const flipped = (i, k) => (i * 5 + k * 3) % 7 === 2 && !(i === pairRow && pairSeats.includes(k));
  const ARM = 0.66;
  function standard(x, Y, Z, aisle) {
    place(x, Y, Z);
    box("dark", -0.03, 0.03, 0, ARM - 0.06, -0.28, 0.18);
    box("dark", -0.045, 0.045, ARM - 0.06, ARM, -0.36, 0.2);
    lathe("white", [[0, ARM - 0.1], [0.05, ARM - 0.1], [0.05, ARM + 0.01], [0.036, ARM + 0.01], [0.036, ARM - 0.04], [0, ARM - 0.04]], 0, -0.4, 8);
    if (aisle) box("glow", 0.03, 0.036, 0.1, 0.2, -0.06, 0.06);
    place();
  }
  function seat(x, Y, Z, up) {
    place(x, Y, Z);
    if (up) prism("seat", rrect(0.02, 0.14, 0.28, 0.74, 0.05, ["tl", "tr"]), "x", -0.235, 0.235);
    else prism("seat", rrect(-0.32, 0.12, 0.36, 0.48, 0.06, ["bl", "tl"]), "x", -0.235, 0.235);
    place(x, Y + 0.42, Z + 0.17, 0, 10 * D);
    prism("seat", rrect(-0.25, 0.25, -0.02, 0.66, 0.12, ["tl", "tr"]), "z", -0.07, 0.07);
    place();
  }
  for (let i = 0; i < rows; i++) {
    const Y = tierY(i), Z = rowZ(i);
    for (let k = 0; k < NS; k++) seat(SX0 + k * SP, Y, Z, flipped(i, k));
    for (let k = 0; k <= NS; k++) standard(SX0 + (k - 0.5) * SP, Y, Z, k === NS);
  }

  // ---------- props: popcorn tub on the pair's shared armrest, a drink in each outer cup holder ----------
  {
    const Y = tierY(pairRow), Z = rowZ(pairRow);
    const xm = SX0 + 7.5 * SP, tz = Z - 0.12, ty = Y + ARM;
    lathe("white", [[0, ty], [0.085, ty], [0.12, ty + 0.25], [0.11, ty + 0.25], [0, ty + 0.25]], xm, tz, 16, (j) => (j % 2 ? "seat" : "white"));
    const pts = [[0, 0, 0.07], [0.06, 0, 0.03], [-0.06, 0, 0.03], [0.05, 0, -0.06], [-0.05, 0, -0.06], [0, 0, -0.02], [0.09, -0.02, -0.02], [-0.09, -0.02, -0.01],
      [0.03, 0.05, 0.03], [-0.03, 0.05, 0.02], [0.02, 0.05, -0.04], [-0.03, 0.05, -0.04], [0, 0.09, 0]];
    for (const [dx, dy, dz] of pts) puff("corn", [xm + dx, ty + 0.27 + dy, tz + dz], 0.045);
    for (const xs of [SX0 + 5.5 * SP, SX0 + 6.5 * SP]) {
      const zc = Z - 0.4, y0 = Y + ARM - 0.04;
      lathe("white", [[0, y0], [0.042, y0], [0.056, y0 + 0.2], [0, y0 + 0.2]], xs, zc, 10);
      lathe("seat", [[0, y0 + 0.2], [0.06, y0 + 0.2], [0.06, y0 + 0.215], [0.035, y0 + 0.235], [0, y0 + 0.235]], xs, zc, 10);
      rod("seat", [xs + 0.01, y0 + 0.2, zc], [xs + 0.04, y0 + 0.36, zc + 0.03], 0.011, 5);
    }
  }

  // ---------- centre the footprint, meshes per material ----------
  const lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (const { p } of Object.values(soups))
    for (let i = 0; i < p.length; i += 3)
      for (const [k, j] of [[0, 0], [1, 2]]) (lo[k] = Math.min(lo[k], p[i + j])), (hi[k] = Math.max(hi[k], p[i + j]));
  body.position.set(-(lo[0] + hi[0]) / 2, 0, -(lo[1] + hi[1]) / 2);

  const MAT = { // base, shade, threshold, hull px (0 = no hull)
    floor: [c.floor, c.floorShade, 0.2, 2],
    wall: [c.wall, c.wallShade, 0.35, 2],
    seat: [c.seat, c.seatShade, 0.1, 2],
    dark: [c.dark, c.darkShade, 0.35, 2],
    white: [c.white, c.whiteShade, 0.1, 1.5],
    corn: [c.corn, c.cornShade, 0.1, 1.5],
    curtain: [c.seat, c.seatShade, 0.35, 2],
    masking: [c.masking, c.masking, -1, 0],
    screen: [c.screen, c.screen, -1, 0],
    shapes: [c.shapes, c.shapes, -1, 0],
    cone: [c.cone, c.cone, -1, 0],
    glow: [c.glow, c.glow, -1, 0],
    spill: [c.spill, c.spill, -1, 0],
  };
  const live = {};
  for (const [key, { p, n }] of Object.entries(soups)) {
    const [base, shade, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    body.add(mesh);
    if (key === "cone" || key === "shapes") live[key] = { g, rest: Float32Array.from(p) };
  }

  const anchor = (name, x, y, z) => { const a = new THREE.Group(); a.name = name; a.position.set(x, y, z); body.add(a); joints[name] = a; };
  anchor("screen", 0, (SY[0] + SY[1]) / 2, 0.024);
  anchor("port", PCX, PCY, ZE);
  anchor("pair", SX0 + 6.5 * SP, tierY(pairRow), rowZ(pairRow));

  // ---------- flicker: cone spread s about its axis, shapes scaled about their centres by q ----------
  const CLIPS = { flicker: 2 };
  function apply(s, q) {
    { // cone: offset from the axis line (apex -> screen centre) in y and across, scaled by s
      const { g, rest } = live.cone, pos = g.attributes.position.array;
      for (let i = 0; i < rest.length; i += 3) {
        const p = [rest[i], rest[i + 1], rest[i + 2]];
        const t = Math.max(0, Math.min(1, dot(sub(p, CA), cdir) / Math.hypot(...sub(CB, CA))));
        const axis = add(CA, mul(sub(CB, CA), t));
        pos[i + 1] = axis[1] + (p[1] - axis[1]) * s;
      }
      g.attributes.position.needsUpdate = true;
      g.computeBoundingSphere();
    }
    {
      const { g, rest } = live.shapes, pos = g.attributes.position.array;
      for (let v = 0; v < rest.length / 3; v++) {
        const [cx, cy] = shapeOf[v];
        pos[v * 3] = cx + (rest[v * 3] - cx) * q;
        pos[v * 3 + 1] = cy + (rest[v * 3 + 1] - cy) * q;
      }
      g.attributes.position.needsUpdate = true;
      g.computeBoundingSphere();
    }
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`movie-theater: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      const T = CLIPS[m[1]], ph = ((((+m[2]) % T) + T) % T) / T;
      return apply(1 + 0.035 * Math.sin(TAU * ph) + 0.015 * Math.sin(TAU * 3 * ph + 1), 1 + 0.03 * Math.sin(TAU * ph + 0.6));
    }
    if (name !== "rest") throw new Error(`movie-theater: unknown pose "${name}" (rest, or flicker@<seconds>)`);
    apply(1, 1);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
