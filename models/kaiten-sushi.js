// kaiten-sushi.js - a conveyor-belt sushi restaurant corner (kaiten-zushi): a cutaway set with a looping belt of plates.
// Contract: harness/lab/README.md. Meters, +Y up; the open (cutaway) sides face +X and +Z so a camera in the lit
// front-left quadrant sees in. The -Z wall is the kitchen wall with a noren doorway, the -X wall holds the booth.
// Stands on y = 0 (floor top 0.02, joints.floor), centred on the room.
//
// Construction (boxes, lathes, stadium prisms and flat panels, all triangle soups merged per material; flat shaded so
// panels read crisp; every closed part is wound away from a point inside it, never by hand):
//   SHELL    a floor slab; -X and -Z plaster walls over a wood wainscot with a rail and a cornice, a plate-colour
//            chart (discs, no text) and a row of blank wooden menu tags; a doorway in the -Z wall behind the chef with
//            a three-panel noren (plain, no lettering) on a rod.
//   COUNTER  a long island counter: the customer ledge (+Z) at 0.72, the belt housing (a stadium prism) on top of it
//            with a pale belt lane, dark slat seams and a raised centre divider; the chef counter (-Z) at 1.1 (a dark
//            backdrop for the plates) with a dark top, a cutting board, a tuna block, a salmon block, a knife and a
//            rice tub. The customer counter body is pale hinoki, the belt housing wood.
//   FITTINGS per seat on the ledge: a tea tap on the housing face under the belt (box, spout, red button),
//            two cups, a soy bottle, a pickled ginger box (pink through the lid) and a plate-return slot; three swivel stools in front.
//   BOOTH    two benches facing across a table at the -X wall, a touch-panel tablet on a stand (blank screen).
//   PLATES   N plates on the oval, in four kinds: red plate + two salmon nigiri, dark plate + two tuna nigiri,
//            yellow plate + three maki (nori, rice top, red core), brown plate + two tamago nigiri with a nori band.
//            Each plate kind's parts live in the moving meshes below; pose() rewrites their vertices (rotation about
//            Y and a translation along the oval), so the hull, which shares the geometry, moves with them.
// Proportions (real size, base unit the wall height 2.5): room 4.6 x 3.5; counter 2.7 long; belt centreline a
//   stadium of straight 1.7 and end radius 0.24 (length 4.91), lane 0.28 wide at 0.98; ledge at 0.72;
//   chef counter 1.1; stools seat 0.64 r 0.17 at 0.75 pitch; plates r 0.085 and sushi at real size, drawn 1.5x so
//   they survive the low hero view; booth benches 1.1 x 0.45, table 0.7 x 1.0 at 0.72; noren 0.95 wide, 2.05 to 1.45.
// Options: build(THREE, kit, colors, { height, plates }).
//   height  scales the whole set so the wall top is `height` (default 2.5).
//   plates  how many plates ride the belt (default 14, 0..18), evenly spaced.
// Poses: rest (= belt@0). Clips: belt 20 s, one full circuit of the oval, so the loop is seamless: pose("belt@3.5").
// Colours (noon): wood iris #5c3d32 / hair #241c16; dark hair (flat): slats, posts, soy, nori, chef top, bezel;
//   plaster moon #fff6e4 / sky #f2d7ae; floor and counter body sky / skin #f0c2ae; steel and china (belt lane, cups,
//   board, screen) sclera #f6f3ee / sky; accent #c4452d / iris: stool seats, noren, tuna, red plates, soy caps;
//   pink skin / sky: salmon, ginger; plates: red accent / iris, dark hair flat, yellow sky / skin, brown iris / hair;
//   rice practical #fffaf2 / sclera. noon has no blue or green, so the plate kinds are told apart by red, black,
//   yellow and brown, and the toppings by pink, red, dark nori and yellow egg.
// Meshes: 13 (7 static, 6 moving), one per material. 7.5k triangles at defaults (8.6k at 18 plates).
// Joints: anchors floor, counter, belt, stool0..stool2, booth, tablet, board, noren.

export const meta = {
  name: "kaiten-sushi",
  height: 2.5,
  script: "noon",
  colors: {
    wood: "#5c3d32", woodShade: "#241c16",
    dark: "#241c16",
    plaster: "#fff6e4", plasterShade: "#f2d7ae",
    floor: "#f2d7ae", floorShade: "#f0c2ae",
    steel: "#f6f3ee", steelShade: "#f2d7ae",
    accent: "#c4452d", accentShade: "#5c3d32",
    pink: "#f0c2ae", pinkShade: "#f2d7ae",
    yellow: "#f2d7ae", yellowShade: "#f0c2ae",
    rice: "#fffaf2", riceShade: "#f6f3ee",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height } = opts;
  const N = Math.max(0, Math.min(18, Math.round(opts.plates ?? 14)));
  const c = { ...meta.colors, ...colors };
  const root = new THREE.Group();
  root.name = "kaiten-sushi";
  const set = new THREE.Group();
  set.name = "set";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soups = {};
  let target = null; // when set, parts go to this local plate soup instead
  const S = (key) => (target ? (target[key] ??= []) : (soups[key] ??= []));
  function tri(key, a, b, e, ref) {
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-10) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    S(key).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
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
  // a box whose top is inset by i on every side (a soft slab: rice, fish)
  function slab(key, x0, x1, y0, y1, z0, z1, i) {
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0 + i, y1, z0 + i], [x1 - i, y1, z0 + i], [x1 - i, y1, z1 - i], [x0 + i, y1, z1 - i]]);
  }
  // surface of revolution about (cx, cz): profile [[r, y], ...] from the bottom centre to the top centre
  function lathe(key, prof, cx, cz, n = 12) {
    const ym = prof.reduce((s, p) => s + p[1], 0) / prof.length;
    const ref = [cx, ym, cz];
    const P = (p, j) => { const a = (j / n) * Math.PI * 2; return [cx + p[0] * Math.cos(a), p[1], cz + p[0] * Math.sin(a)]; };
    for (let i = 0; i + 1 < prof.length; i++)
      for (let j = 0; j < n; j++) {
        const yr = [cx, (prof[i][1] + prof[i + 1][1]) / 2, cz];
        const r = Math.abs(prof[i][1] - prof[i + 1][1]) < 1e-6 ? ref : yr;
        quad(key, P(prof[i], j), P(prof[i], j + 1), P(prof[i + 1], j + 1), P(prof[i + 1], j), r);
      }
  }
  const cyl = (key, cx, cz, r, y0, y1, n = 12) => lathe(key, [[0, y0], [r, y0], [r, y1], [0, y1]], cx, cz, n);
  const wallZ = (z, s = 1) => ({ W: (u, v) => [u, v, z], back: (u, v) => [u, v, z - s] });
  const wallX = (x, s = 1) => ({ W: (u, v) => [x, v, u], back: (u, v) => [x - s, v, u] });
  const flatY = (y) => ({ W: (u, v) => [u, y, v], back: (u, v) => [u, y - 1, v] });
  function rect(key, P, u0, u1, v0, v1) {
    quad(key, P.W(u0, v0), P.W(u1, v0), P.W(u1, v1), P.W(u0, v1), P.back((u0 + u1) / 2, (v0 + v1) / 2));
  }
  function fan(key, P, poly) {
    const cu = poly.reduce((s, p) => s + p[0], 0) / poly.length, cv = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      tri(key, P.W(cu, cv), P.W(a[0], a[1]), P.W(b[0], b[1]), P.back(cu, cv));
    }
  }
  const disc = (u, v, r, n = 14) => Array.from({ length: n }, (_, i) => [u + r * Math.cos((i / n) * 2 * Math.PI), v + r * Math.sin((i / n) * 2 * Math.PI)]);

  // ---------- dimensions ----------
  const X0 = -2.4, X1 = 2.2, Z0 = -1.9, Z1 = 1.6, T = 0.1, H = 2.5, FT = 0.02, WAIN = 0.95;
  const XA = -0.1, XB = 1.6, R = 0.24, LANE = 0.14; // belt centreline: semicircle centres (XA, 0), (XB, 0)
  const BELT = 0.98, HOUSE = R + LANE + 0.03; // belt top; housing outer radius
  const CX0 = XA - 0.5, CX1 = XB + 0.5; // counter ends
  const LEDGE = { y: 0.72, z0: HOUSE - 0.02, z1: 0.68 };
  const CHEF = { y: 1.1, z0: -0.88, z1: -HOUSE + 0.02 };
  const STOOLS = [0.0, 0.75, 1.5], SZ = 1.02;
  const L = 2 * (XB - XA) + 2 * Math.PI * R;

  // oval path: s in [0, L) -> [x, z, heading]; heading θ turns local +X to the travel direction (cos θ, -sin θ)
  function path(s) {
    s = ((s % L) + L) % L;
    const D = XB - XA, A = Math.PI * R;
    if (s < D) return [XA + s, R, 0];
    if (s < D + A) { const p = (s - D) / R; return [XB + R * Math.sin(p), R * Math.cos(p), p]; }
    if (s < 2 * D + A) return [XB - (s - D - A), -R, Math.PI];
    const p = Math.PI + (s - 2 * D - A) / R;
    return [XA + R * Math.sin(p), R * Math.cos(p), p];
  }
  // stadium outline at radius rr from the semicircle centres (same point count for every rr, so rings pair up)
  function stadium(rr, n = 14) {
    const pts = [];
    for (let i = 0; i <= n; i++) { const p = (i / n) * Math.PI; pts.push([XB + rr * Math.sin(p), rr * Math.cos(p)]); }
    for (let i = 0; i <= n; i++) { const p = Math.PI + (i / n) * Math.PI; pts.push([XA + rr * Math.sin(p), rr * Math.cos(p)]); }
    return pts;
  }
  // a closed prism over a convex stadium
  function stadPrism(key, rr, y0, y1) {
    const p = stadium(rr), m = p.length, ref = [(XA + XB) / 2, (y0 + y1) / 2, 0];
    for (let i = 0; i < m; i++) {
      const a = p[i], b = p[(i + 1) % m];
      quad(key, [a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], ref);
      tri(key, [ref[0], y1, 0], [a[0], y1, a[1]], [b[0], y1, b[1]], [ref[0], y0, 0]);
      tri(key, [ref[0], y0, 0], [a[0], y0, a[1]], [b[0], y0, b[1]], [ref[0], y1, 0]);
    }
  }
  // a flat annulus between two stadiums at height y, facing up
  function stadRing(key, r0, r1, y) {
    const a = stadium(r0), b = stadium(r1), m = a.length;
    for (let i = 0; i < m; i++) {
      const j = (i + 1) % m;
      quad(key, [a[i][0], y, a[i][1]], [a[j][0], y, a[j][1]], [b[j][0], y, b[j][1]], [b[i][0], y, b[i][1]], [a[i][0], y - 1, a[i][1]]);
    }
  }

  // ---------- floor and walls ----------
  box("floor", X0, X1, 0, FT, Z0, Z1);
  // back wall (-Z) with a doorway behind the chef
  const DOOR = { x0: 0.35, x1: 1.3, y1: 2.05 };
  box("plaster", X0 - T, DOOR.x0, 0, H, Z0 - T, Z0);
  box("plaster", DOOR.x1, X1, 0, H, Z0 - T, Z0);
  box("plaster", DOOR.x0, DOOR.x1, DOOR.y1, H, Z0 - T, Z0);
  box("dark", DOOR.x0, DOOR.x1, 0, DOOR.y1, Z0 - T, Z0 - T + 0.02); // the dark kitchen beyond
  box("wood", DOOR.x0 - 0.06, DOOR.x0, 0, DOOR.y1 + 0.06, Z0, Z0 + 0.04); // door frame
  box("wood", DOOR.x1, DOOR.x1 + 0.06, 0, DOOR.y1 + 0.06, Z0, Z0 + 0.04);
  box("wood", DOOR.x0 - 0.06, DOOR.x1 + 0.06, DOOR.y1, DOOR.y1 + 0.06, Z0, Z0 + 0.04);
  // side wall (-X)
  box("plaster", X0 - T, X0, 0, H, Z0, Z1);
  // wainscot, rail, skirting and cornice on both walls (gapped at the door)
  for (const [a, b] of [[X0, DOOR.x0 - 0.06], [DOOR.x1 + 0.06, X1]]) {
    box("wood", a, b, FT, WAIN, Z0, Z0 + 0.02);
    box("wood", a, b, WAIN, WAIN + 0.05, Z0, Z0 + 0.045);
  }
  box("wood", X0, X0 + 0.02, FT, WAIN, Z0, Z1);
  box("wood", X0, X0 + 0.045, WAIN, WAIN + 0.05, Z0, Z1);
  box("wood", X0, X1, H - 0.1, H, Z0, Z0 + 0.06);
  box("wood", X0, X0 + 0.06, H - 0.1, H, Z0, Z1);
  // wainscot board seams
  for (let x = X0 + 0.3; x < X1; x += 0.3) if (x < DOOR.x0 - 0.1 || x > DOOR.x1 + 0.1) rect("dark", wallZ(Z0 + 0.021), x - 0.006, x + 0.006, FT + 0.02, WAIN);
  for (let z = Z0 + 0.3; z < Z1; z += 0.3) rect("dark", wallX(X0 + 0.021), z - 0.006, z + 0.006, FT + 0.02, WAIN);
  // noren: three plain panels on a rod across the doorway
  {
    const z = Z0 + 0.09, top = 2.0, bot = 1.42, w = (DOOR.x1 - DOOR.x0 + 0.04) / 3;
    box("wood", DOOR.x0 - 0.1, DOOR.x1 + 0.1, top, top + 0.035, z - 0.018, z + 0.018);
    for (let i = 0; i < 3; i++) {
      const a = DOOR.x0 - 0.02 + i * w + 0.008, b = a + w - 0.016;
      box("accent", a, b, bot, top, z + 0.018, z + 0.03);
      box("dark", a, b, top - 0.08, top - 0.06, z + 0.03, z + 0.032); // sewn hem band under the rod
    }
  }
  // plate-price chart on the back wall: a board with the four plate colours as discs (no text)
  {
    const P = wallZ(Z0 + 0.03), P2 = wallZ(Z0 + 0.032), x0 = -1.35, y0 = 1.45;
    box("wood", x0 - 0.03, x0 + 1.15, y0 - 0.03, y0 + 0.35, Z0, Z0 + 0.03);
    rect("steel", wallZ(Z0 + 0.031), x0, x0 + 1.12, y0, y0 + 0.32);
    ["accent", "dark", "floor", "wood"].forEach((k, i) => fan(k, P2, disc(x0 + 0.16 + i * 0.27, y0 + 0.16, 0.1, 16)));
    void P;
  }

  // a row of blank wooden menu tags over the booth (no lettering)
  for (let i = 0; i < 7; i++) {
    const z = -0.3 + i * 0.26;
    box("wood", X0, X0 + 0.025, 1.5, 1.98, z - 0.1, z + 0.1);
    rect("steel", wallX(X0 + 0.026), z - 0.08, z + 0.08, 1.52, 1.96);
  }
  box("wood", X0, X0 + 0.05, 1.98, 2.03, -0.45, 1.4); // the rail they hang from

  // ---------- counter and belt ----------
  box("floor", CX0, CX1, FT, LEDGE.y - 0.03, CHEF.z1, LEDGE.z1 - 0.04); // counter body (pale hinoki)
  box("wood", CX0, CX1, LEDGE.y - 0.03, LEDGE.y, LEDGE.z0 - 0.1, LEDGE.z1); // customer ledge top
  for (let x = CX0 + 0.45; x < CX1 - 0.2; x += 0.45) rect("dark", wallZ(LEDGE.z1 - 0.039), x - 0.006, x + 0.006, 0.12, LEDGE.y - 0.05); // front panel seams
  // belt housing, lane, slats, centre divider
  stadPrism("wood", HOUSE, LEDGE.y - 0.01, BELT - 0.005); // housing
  stadRing("steel", R - LANE, R + LANE, BELT); // the belt lane
  stadRing("dark", R + LANE, R + LANE + 0.012, BELT + 0.0005); // seams at the lane edges
  stadRing("dark", R - LANE - 0.012, R - LANE, BELT + 0.0005);
  stadPrism("steel", R - LANE - 0.012, BELT - 0.01, BELT + 0.05); // centre divider
  for (let s = 0; s < L; s += 0.075) { // slat seams
    const [x, z, th] = path(s), d = [Math.cos(th), -Math.sin(th)], nn = [Math.sin(th), Math.cos(th)], w = 0.004;
    const P = (o, t) => [x + nn[0] * o + d[0] * t, BELT + 0.001, z + nn[1] * o + d[1] * t];
    quad("dark", P(-LANE, -w), P(LANE, -w), P(LANE, w), P(-LANE, w), [x, BELT - 1, z]);
  }
  // chef counter behind the belt
  box("wood", CX0, CX1, FT, CHEF.y - 0.04, CHEF.z0, CHEF.z1); // dark backdrop for the plates
  box("dark", CX0 - 0.02, CX1 + 0.02, CHEF.y - 0.04, CHEF.y, CHEF.z0 - 0.02, CHEF.z1);
  {
    const y = CHEF.y, bx = 0.45, bz = (CHEF.z0 + CHEF.z1) / 2 - 0.04;
    box("steel", bx - 0.3, bx + 0.3, y, y + 0.03, bz - 0.17, bz + 0.17); // cutting board
    slab("accent", bx - 0.2, bx + 0.0, y + 0.03, y + 0.09, bz - 0.06, bz + 0.06, 0.008); // tuna block
    slab("pink", bx + 0.04, bx + 0.2, y + 0.03, y + 0.075, bz - 0.1, bz - 0.0, 0.008); // salmon block
    rect("dark", flatY(y + 0.0755), bx + 0.06, bx + 0.18, bz - 0.07, bz - 0.064);
    rect("dark", flatY(y + 0.0755), bx + 0.06, bx + 0.18, bz - 0.04, bz - 0.034);
    box("steel", bx - 0.22, bx + 0.08, y + 0.03, y + 0.036, bz + 0.09, bz + 0.13); // knife blade
    box("dark", bx + 0.08, bx + 0.21, y + 0.03, y + 0.05, bz + 0.1, bz + 0.12); // handle
    // rice tub (hangiri): a wood ring with rice
    const rx = 1.25, rz = bz;
    lathe("wood", [[0, y], [0.2, y], [0.21, y + 0.1], [0.19, y + 0.1], [0.18, y + 0.03], [0, y + 0.03]], rx, rz, 18);
    lathe("plaster", [[0, y + 0.03], [0.182, y + 0.03], [0.17, y + 0.08], [0.1, y + 0.095], [0, y + 0.1]], rx, rz, 16);
    lathe("dark", [[0.2, y + 0.04], [0.214, y + 0.04], [0.214, y + 0.06], [0.2, y + 0.06], [0.2, y + 0.04]], rx, rz, 18); // hoop
    // a wasabi-free soy dish and a small stack of plates for the chef
    for (let i = 0; i < 4; i++) lathe("accent", [[0, y + i * 0.015], [0.08, y + i * 0.015], [0.085, y + i * 0.015 + 0.014], [0, y + i * 0.015 + 0.012]], 1.75, bz - 0.05, 14);
    anchor("board", bx, y + 0.03, bz);
  }
  // per-seat fittings on the ledge
  STOOLS.forEach((sx, k) => {
    const y = LEDGE.y, zb = LEDGE.z0 + 0.05;
    // tea tap against the housing: steel body, spout, red push button
    const tx = sx + 0.28, zt = HOUSE; // mounted on the housing face, under the belt
    box("dark", tx - 0.045, tx + 0.045, y + 0.03, BELT - 0.03, zt - 0.01, zt + 0.05);
    box("steel", tx - 0.012, tx + 0.012, y + 0.06, y + 0.09, zt + 0.05, zt + 0.08); // spout
    box("accent", tx - 0.025, tx + 0.025, BELT - 0.08, BELT - 0.05, zt + 0.05, zt + 0.065); // button
    // stack of tea cups
    const cx = sx + 0.42;
    for (let i = 0; i < 2; i++) { const b = y + i * 0.045; lathe("steel", [[0, b], [0.03, b], [0.038, b + 0.06], [0, b + 0.06]], cx, zb, 10); }
    // soy bottle with a red cap
    const sx2 = sx - 0.22;
    lathe("dark", [[0, y], [0.028, y], [0.03, y + 0.07], [0.016, y + 0.1], [0, y + 0.1]], sx2, zb, 10);
    lathe("accent", [[0, y + 0.1], [0.018, y + 0.1], [0.016, y + 0.125], [0, y + 0.13]], sx2, zb, 8);
    // pickled ginger box: steel tub with a pink top showing through the lid
    const gx = sx - 0.12;
    box("steel", gx - 0.05, gx + 0.05, y, y + 0.07, zb - 0.06, zb + 0.04);
    box("pink", gx - 0.042, gx + 0.042, y + 0.07, y + 0.078, zb - 0.052, zb + 0.032);
    // plate-return slot in the ledge, in front of the seat
    rect("steel", flatY(y + 0.002), sx - 0.12, sx + 0.12, LEDGE.z1 - 0.2, LEDGE.z1 - 0.12);
    rect("dark", flatY(y + 0.004), sx - 0.1, sx + 0.1, LEDGE.z1 - 0.185, LEDGE.z1 - 0.135);
    // stool: base, post, swivel seat with a red cushion
    lathe("dark", [[0, FT], [0.2, FT], [0.2, FT + 0.025], [0.05, FT + 0.05], [0, FT + 0.05]], sx, SZ, 14);
    cyl("dark", sx, SZ, 0.035, FT + 0.04, 0.56, 8);
    lathe("dark", [[0, 0.55], [0.12, 0.55], [0.16, 0.575], [0, 0.575]], sx, SZ, 14);
    lathe("accent", [[0, 0.575], [0.17, 0.575], [0.18, 0.61], [0.16, 0.64], [0, 0.645]], sx, SZ, 16);
    anchor("stool" + k, sx, 0.645, SZ);
  });

  // ---------- booth ----------
  const BX = X0 + 1.1, TZ = 0.5;
  function bench(zb, s) { // zb: back face, s: +1 when the seat extends toward +Z
    const z0 = Math.min(zb, zb + s * 0.5), z1 = Math.max(zb, zb + s * 0.5);
    box("wood", X0, BX, FT, 0.2, z0, z1);
    slab("accent", X0 + 0.02, BX - 0.02, 0.2, 0.44, Math.min(zb + s * 0.1, zb + s * 0.5), Math.max(zb + s * 0.1, zb + s * 0.5), 0.02);
    const zt = zb + s * 0.1;
    hex("accent", [[X0 + 0.02, 0.42, zb], [BX - 0.02, 0.42, zb], [BX - 0.02, 0.42, zt + s * 0.04], [X0 + 0.02, 0.42, zt + s * 0.04],
      [X0 + 0.02, 1.0, zb], [BX - 0.02, 1.0, zb], [BX - 0.02, 1.0, zb + s * 0.07], [X0 + 0.02, 1.0, zb + s * 0.07]]);
    box("wood", X0, BX + 0.02, FT, 1.08, zb - s * 0.05, zb);
    box("wood", X0, BX + 0.03, 1.04, 1.1, Math.min(zb - s * 0.06, zb + s * 0.06), Math.max(zb - s * 0.06, zb + s * 0.06));
  }
  bench(TZ - 0.85, 1);
  bench(TZ + 0.85, -1);
  {
    const x1 = X0 + 0.95, zh = 0.33, ty = 0.72;
    box("wood", X0 + 0.02, x1, ty - 0.04, ty, TZ - zh, TZ + zh);
    box("dark", X0 + 0.04, x1 - 0.02, ty - 0.065, ty - 0.04, TZ - zh + 0.02, TZ + zh - 0.02);
    cyl("dark", (X0 + x1) / 2, TZ, 0.04, FT, ty - 0.06, 8);
    lathe("dark", [[0, FT], [0.24, FT], [0.24, FT + 0.03], [0.05, FT + 0.06], [0, FT + 0.06]], (X0 + x1) / 2, TZ, 12);
    // touch-panel tablet on a stand at the wall end, screen toward +X (blank)
    const tx = X0 + 0.14, tz = TZ - 0.05, a = 0.3; // lean back by a
    box("dark", tx - 0.04, tx + 0.06, ty, ty + 0.02, tz - 0.07, tz + 0.07);
    const lean = (u, v, d) => [tx + d + v * Math.sin(a), ty + 0.02 + v * Math.cos(a), tz + u];
    const p = [lean(-0.12, 0, 0), lean(0.12, 0, 0), lean(0.12, 0, 0.025), lean(-0.12, 0, 0.025), lean(-0.12, 0.2, 0), lean(0.12, 0.2, 0), lean(0.12, 0.2, 0.025), lean(-0.12, 0.2, 0.025)];
    hex("dark", [p[0], p[3], p[2], p[1], p[4], p[7], p[6], p[5]]);
    const sp = (u, v) => lean(u, v, 0.0265);
    quad("steel", sp(-0.105, 0.018), sp(0.105, 0.018), sp(0.105, 0.182), sp(-0.105, 0.182), lean(0, 0.1, -1));
    // tea cups and a soy dish on the table
    lathe("steel", [[0, ty], [0.03, ty], [0.038, ty + 0.07], [0, ty + 0.07]], X0 + 0.6, TZ - 0.18, 10);
    lathe("steel", [[0, ty], [0.03, ty], [0.038, ty + 0.07], [0, ty + 0.07]], X0 + 0.62, TZ + 0.2, 10);
    for (let i = 0; i < 3; i++) lathe("accent", [[0, ty + i * 0.015], [0.08, ty + i * 0.015], [0.085, ty + i * 0.015 + 0.014], [0, ty + i * 0.015 + 0.012]], X0 + 0.75, TZ + 0.02, 14);
    anchor("tablet", tx, ty + 0.12, tz);
    anchor("booth", (X0 + x1) / 2, ty, TZ);
  }

  // ---------- plates (local: centred on the plate, bottom at y = 0, travel along +X) ----------
  const PR = 0.085, PK = 1.5; // plates and sushi modelled at real size, drawn 1.2x for the thumbnail
  function plateDish(key) {
    lathe(key, [[0, 0], [0.05, 0], [0.052, 0.008], [PR, 0.02], [PR - 0.005, 0.024], [0.06, 0.014], [0, 0.014]], 0, 0, 16);
  }
  function nigiri(z, fish, band) {
    const y = 0.014;
    slab("rice", -0.04, 0.04, y, y + 0.032, z - 0.02, z + 0.02, 0.008);
    slab(fish, -0.048, 0.048, y + 0.03, y + 0.045, z - 0.024, z + 0.024, 0.006);
    if (band) box("dark", -0.008, 0.008, y + 0.002, y + 0.047, z - 0.0255, z + 0.0255);
  }
  function maki(x, z) {
    const y = 0.014, r = 0.025;
    cyl("dark", x, z, r, y, y + 0.04, 10);
    lathe("rice", [[0, y + 0.04], [r - 0.004, y + 0.04], [r - 0.004, y + 0.044], [0, y + 0.044]], x, z, 10);
    lathe("accent", [[0, y + 0.044], [0.009, y + 0.044], [0, y + 0.0445]], x, z, 6);
  }
  const KINDS = [
    () => { plateDish("accent"); nigiri(-0.027, "pink"); nigiri(0.027, "pink"); },
    () => { plateDish("pDark"); nigiri(-0.027, "pTuna"); nigiri(0.027, "pTuna"); },
    () => { plateDish("yellow"); maki(-0.03, -0.022); maki(0.03, -0.022); maki(0, 0.03); },
    () => { plateDish("wood"); nigiri(-0.027, "yellow", true); nigiri(0.027, "yellow", true); },
  ];
  // the moving meshes, by material: each plate writes a range of every soup it touches
  const MOVE = {}; // key -> { arr: [], ranges: [[plate, start, end]] }
  const plateS = [];
  for (let i = 0; i < N; i++) {
    target = {};
    KINDS[[0, 1, 2, 3, 1, 0, 3, 2][i % 8]]();
    const loc = target;
    target = null;
    for (const [k0, arr] of Object.entries(loc)) {
      const k = "m_" + k0;
      const m = (MOVE[k] ??= { arr: [], ranges: [] });
      m.ranges.push([i, m.arr.length / 3, (m.arr.length + arr.length) / 3]);
      m.arr.push(...arr.map((v) => v * PK));
    }
    plateS.push((i / Math.max(N, 1)) * L);
  }

  // ---------- meshes ----------
  const MAT = {
    wood: [c.wood, c.woodShade, 0.1, 2.5],
    dark: [c.dark, c.dark, 0.1, 0],
    plaster: [c.plaster, c.plasterShade, 0.1, 2.5],
    floor: [c.floor, c.floorShade, 0.1, 2.5],
    steel: [c.steel, c.steelShade, 0.1, 2],
    accent: [c.accent, c.accentShade, 0.15, 2],
    pink: [c.pink, c.pinkShade, 0.1, 1.5],
    m_accent: [c.accent, c.accentShade, 0.15, 1.5],
    m_pDark: [c.dark, c.dark, 0.1, 1.5],
    m_pTuna: [c.accent, c.accentShade, 0.15, 1.5],
    m_yellow: [c.yellow, c.yellowShade, 0.1, 1.5],
    m_wood: [c.wood, c.woodShade, 0.1, 1.5],
    m_rice: [c.rice, c.riceShade, 0.1, 1.5],
    m_pink: [c.pink, c.pinkShade, 0.1, 1.5],
    m_dark: [c.dark, c.dark, 0.1, 1.5],
  };
  // same-colour moving soups share a mesh: tuna rides with the red plates, nori with the dark plates
  const MERGE = { m_pTuna: "m_accent", m_pDark: "m_dark" };
  for (const [k, v] of Object.entries(MERGE)) {
    if (!MOVE[k]) continue;
    const m = (MOVE[v] ??= { arr: [], ranges: [] });
    const off = m.arr.length / 3;
    for (const [i, a, b] of MOVE[k].ranges) m.ranges.push([i, a + off, b + off]);
    m.arr.push(...MOVE[k].arr);
    delete MOVE[k];
  }
  const geo = (arr) => {
    const gm = new THREE.BufferGeometry();
    gm.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    gm.computeVertexNormals();
    return gm;
  };
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, px] = MAT[key];
    const mesh = kit.toon(geo(arr), base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    set.add(mesh);
  }
  // moving meshes: placed at t = 0 before the hull is made (so hull normals never merge across plates), then their
  // local positions, normals and hull normals are kept for pose() to re-place
  const movers = [];
  const place = (s) => { const [x, z, th] = path(s); return { x, z, cs: Math.cos(th), sn: Math.sin(th) }; };
  for (const [key, m] of Object.entries(MOVE)) {
    const local = Float32Array.from(m.arr);
    const placed = new Float32Array(local.length);
    const owner = new Int32Array(local.length / 3);
    for (const [i, a, b] of m.ranges) for (let v = a; v < b; v++) owner[v] = i;
    const xf = (src, dst, s0, translate) => {
      for (let v = 0; v < owner.length; v++) {
        const p = place(s0[owner[v]]), x = src[v * 3], z = src[v * 3 + 2];
        dst[v * 3] = x * p.cs + z * p.sn + (translate ? p.x : 0);
        dst[v * 3 + 1] = src[v * 3 + 1] + (translate ? BELT + 0.001 : 0);
        dst[v * 3 + 2] = -x * p.sn + z * p.cs + (translate ? p.z : 0);
      }
    };
    xf(local, placed, plateS, true);
    const g = geo(placed);
    const [base, shade, threshold, px] = MAT[key];
    const mesh = kit.toon(g, base, shade, { threshold, px });
    mesh.name = key.slice(2) === "accent" ? "redPlates" : key.slice(2) + "Plates";
    mesh.frustumCulled = false;
    mesh.children.forEach((h) => (h.frustumCulled = false));
    set.add(mesh);
    // back to local: inverse rotation (rotate by -θ) of the placed normals
    const toLocal = (arr) => {
      const out = new Float32Array(arr.length);
      for (let v = 0; v < owner.length; v++) {
        const p = place(plateS[owner[v]]), x = arr[v * 3], z = arr[v * 3 + 2];
        out[v * 3] = x * p.cs - z * p.sn;
        out[v * 3 + 1] = arr[v * 3 + 1];
        out[v * 3 + 2] = x * p.sn + z * p.cs;
      }
      return out;
    };
    const nrm = toLocal(g.attributes.normal.array);
    const hull = g.attributes.hullNormal ? toLocal(g.attributes.hullNormal.array) : null;
    movers.push({ g, local, nrm, hull, xf });
  }

  function anchor(name, x, y, z) { const a = new THREE.Group(); a.name = name; a.position.set(x, y, z); set.add(a); joints[name] = a; }
  anchor("floor", 0, FT, 0);
  anchor("counter", (CX0 + CX1) / 2, LEDGE.y, LEDGE.z1);
  anchor("belt", (XA + XB) / 2, BELT, 0);
  anchor("noren", (DOOR.x0 + DOOR.x1) / 2, 1.7, Z0 + 0.1);

  // ---------- poses and the belt clip ----------
  const CLIPS = { belt: 20 }; // one full circuit: seamless
  function setBelt(t) {
    const D = CLIPS.belt, u = (((t % D) + D) % D) / D;
    const s = plateS.map((s0) => s0 + u * L);
    for (const m of movers) {
      m.xf(m.local, m.g.attributes.position.array, s, true);
      m.xf(m.nrm, m.g.attributes.normal.array, s, false);
      m.g.attributes.position.needsUpdate = true;
      m.g.attributes.normal.needsUpdate = true;
      if (m.hull && m.g.attributes.hullNormal) {
        m.xf(m.hull, m.g.attributes.hullNormal.array, s, false);
        m.g.attributes.hullNormal.needsUpdate = true;
      }
      m.g.computeBoundingBox();
      m.g.computeBoundingSphere();
    }
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`kaiten-sushi: no clip "${m[1]}" (clips: belt)`);
      setBelt(+m[2]);
    } else if (name === "rest") setBelt(0);
    else throw new Error(`kaiten-sushi: unknown pose "${name}" (rest, or belt@<seconds>)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
