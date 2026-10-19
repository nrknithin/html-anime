// kissaten.js - a retro Japanese coffee shop (kissaten) interior: dark wood, red velvet, siphons, a static set.
// Contract: harness/lab/README.md. Meters, +Y up, the room's open (cutaway) sides face +X and +Z so a camera in the
// lit front-left quadrant sees in; the -X wall is the window wall with the two booths, the -Z wall holds the back
// shelf behind the long counter, the cake case and the pendulum clock. Stands on y = 0 (floor top 0.02, joints.floor),
// centred on the room.
//
// Construction (boxes, lathes, polygon tubes, flat panels and fans, all triangle soups merged per material; flat
// shaded so panels read crisp; every closed part is wound away from a point inside it, never by hand):
//   SHELL    a two-tone checker floor; -X and -Z walls of dark wood panelling to a picture rail at 2.05 (stiles and
//            inset panel lines as dark bands) with a cream plaster frieze above; the window in the -X wall: a wood
//            frame with mullions, glass, a deep sill and lace half-curtains (pleated sheet, scalloped hem, a rod).
//   COUNTER  a long panelled counter along the -Z side with a dark top slab and a foot rail; five round-seat stools
//            (red cushion, dark post, foot ring, base); two siphons (stand, rod, clamp, coffee-filled lower globe, glass
//            upper chamber, burner), cups on saucers, a sugar pot; a cash register at the left end.
//   BACK     a low cabinet along the -Z wall with three open shelves above it: rows of cups and coffee-bean jars.
//   BOOTHS   two booths at the window: four red velvet benches (seat and back cushions on wood plinths, wood back
//            caps, the middle two back to back), two pedestal tables with cups.
//   PROPS    five pendant lamps (dome shades on cords: three over the counter, one over each booth table), a glass cake
//            display case on a wood base with cakes, a wooden pendulum wall clock, a potted plant in the back corner
//            and a small one on the sill.
// Proportions (real size, base unit the ceiling height 2.6): room 7.0 x 5.0, walls 0.1; counter 4.0 long, top 1.02,
//   stools seat 0.72 r 0.19 at 0.7 pitch; booth benches 1.15 x 0.55, seats 0.45, backs 1.15; tables 0.95 x 0.7 at
//   0.72; window 0.95-2.0 over z -1.05..2.35; lamps r 0.2 hanging to 1.78 (counter) and 1.65 (tables); cake case
//   1.3 x 0.6 x 1.25; clock 0.34 x 0.66 at 1.6-2.26.
// Options: build(THREE, kit, colors, { height, cutaway = true, night = false }).
//   height  scales the whole set so the wall top is `height` (default 2.6).
//   cutaway leaves out the +X and +Z walls and the ceiling (true by default); false closes the room (panelled +X wall
//           with a glazed door, +Z wall, a board ceiling).
//   night   the lamp shades and the cake case light glow (practical, threshold -0.25), the window panes go dark and
//           the plaster frieze dims to sky / skin, so the lamps are the brightest thing in the room.
// Poses: rest.
// Colours (noon, the washitsu set): wood iris #5c3d32 / hair #241c16, panel lines and metal hair (flat); plaster moon
//   #fff6e4 / sky #f2d7ae; floor sky / skin #f0c2ae with skin checks; velvet accent #c4452d / iris; china moon / sclera
//   #f6f3ee; window glass sky / skin (night hair / iris); lace practical #fffaf2 / sclera; amber lamp shades sky / skin
//   (night practical, glowing); glassware sclera / moon; cake sponge skin / sky; coffee and leaves iris (flat).
//   noon has no green, so the plants are dark leaf silhouettes against the bright window and frieze.
// Meshes: 14 (night 15), one per material; the closed room's ceiling joins the plaster mesh. 15.4k triangles.
// Joints: anchors floor, counter, stool0..stool4, boothA, boothB, window, register.

export const meta = {
  name: "kissaten",
  height: 2.6,
  script: "noon",
  colors: {
    wood: "#5c3d32", woodShade: "#241c16",
    dark: "#241c16",
    plaster: "#fff6e4", plasterShade: "#f2d7ae",
    nightPlaster: "#f2d7ae", nightPlasterShade: "#f0c2ae",
    floor: "#f2d7ae", floorShade: "#f0c2ae",
    check: "#f0c2ae",
    velvet: "#c4452d", velvetShade: "#5c3d32",
    china: "#fff6e4", chinaShade: "#f6f3ee",
    glass: "#f2d7ae", glassShade: "#f0c2ae",
    nightGlass: "#241c16", nightGlassShade: "#5c3d32",
    lace: "#fffaf2", laceShade: "#f6f3ee",
    lamp: "#f2d7ae", lampShade: "#f0c2ae",
    glow: "#fffaf2",
    glassware: "#f6f3ee", glasswareShade: "#fff6e4",
    cake: "#f0c2ae", cakeShade: "#f2d7ae",
    coffee: "#5c3d32",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height, cutaway = true, night = false } = opts;
  const c = { ...meta.colors, ...colors };
  const root = new THREE.Group();
  root.name = "kissaten";
  const set = new THREE.Group(); // uniform size scale lives here
  set.name = "room";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  const soups = {};
  const S = (key) => (soups[key] ??= []);
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
  // a frustum cushion: bottom rect at y0 inset i0, widest at ym, top at y1 inset i1
  function pillow(key, x0, x1, z0, z1, y0, ym, y1, i0, i1) {
    const R = (y, i) => [[x0 + i, y, z0 + i], [x1 - i, y, z0 + i], [x1 - i, y, z1 - i], [x0 + i, y, z1 - i]];
    hex(key, [...R(y0, i0), ...R(ym, 0)]);
    hex(key, [...R(ym, 0), ...R(y1, i1)]);
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
        const cap = prof[i][0] < 1e-6 || prof[i + 1][0] < 1e-6;
        quad(key, P(prof[i], j), P(prof[i], j + 1), P(prof[i + 1], j + 1), P(prof[i + 1], j), cap ? ref : r);
      }
  }
  const cyl = (key, cx, cz, r, y0, y1, n = 12) => lathe(key, [[0, y0], [r, y0], [r, y1], [0, y1]], cx, cz, n);
  // polygon tube along a polyline with radius r, closed at both ends
  function tube(key, pts, r, n = 6) {
    const rings = pts.map((p, i) => {
      const d = nrm(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
      const up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
      const e1 = nrm(cross(d, up)), e2 = cross(e1, d);
      return Array.from({ length: n }, (_, j) => {
        const t = (j / n) * Math.PI * 2;
        return [0, 1, 2].map((k) => p[k] + r * (Math.cos(t) * e1[k] + Math.sin(t) * e2[k]));
      });
    });
    for (let i = 0; i + 1 < pts.length; i++) {
      const ref = pts[i].map((v, k) => (v + pts[i + 1][k]) / 2);
      for (let j = 0; j < n; j++) quad(key, rings[i][j], rings[i][(j + 1) % n], rings[i + 1][(j + 1) % n], rings[i + 1][j], ref);
    }
    const a = pts[0], b = pts[pts.length - 1], L = rings.length - 1;
    const ra = pts[1].map((v, k) => (v + a[k]) / 2), rb = pts[L - 1].map((v, k) => (v + b[k]) / 2);
    for (let j = 0; j < n; j++) {
      tri(key, a, rings[0][j], rings[0][(j + 1) % n], ra);
      tri(key, b, rings[L][j], rings[L][(j + 1) % n], rb);
    }
  }
  const ring = (cx, cy, cz, r, n = 12) => Array.from({ length: n + 1 }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), cy, cz + r * Math.sin((i / n) * 2 * Math.PI)]);
  // flat shapes on a wall plane: W(u, v) -> world, back(u, v) a point behind the plane
  const wallZ = (z, s = 1) => ({ W: (u, v) => [u, v, z], back: (u, v) => [u, v, z - s] }); // facing +Z (s = 1)
  const wallX = (x, s = 1) => ({ W: (u, v) => [x, v, u], back: (u, v) => [x - s, v, u] }); // facing +X (s = 1)
  const flatY = (y) => ({ W: (u, v) => [u, y, v], back: (u, v) => [u, y - 1, v] });
  function rect(key, P, u0, u1, v0, v1) {
    quad(key, P.W(u0, v0), P.W(u1, v0), P.W(u1, v1), P.W(u0, v1), P.back((u0 + u1) / 2, (v0 + v1) / 2));
  }
  function frameRect(key, P, u0, u1, v0, v1, w) {
    rect(key, P, u0, u1, v0, v0 + w); rect(key, P, u0, u1, v1 - w, v1);
    rect(key, P, u0, u0 + w, v0 + w, v1 - w); rect(key, P, u1 - w, u1, v0 + w, v1 - w);
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
  const X0 = -3.5, X1 = 3.5, Z0 = -2.5, Z1 = 2.5, T = 0.1, H = 2.6, FT = 0.02, RAIL = 2.05;
  const WIN = { z0: -1.05, z1: 2.35, y0: 0.95, y1: 2.0 };
  const CT = { x0: -0.7, x1: 3.0, z0: -1.55, z1: -1.0, y: 1.02 }; // counter body; top overhangs to z1 + 0.14
  const STOOLS = [0.0, 0.7, 1.4, 2.1, 2.8];
  const SZ = -0.55;

  // ---------- floor: checker tiles ----------
  box("floor", X0, X1, 0, FT, Z0, Z1);
  const TL = 0.5;
  for (let i = 0; i < 14; i++)
    for (let j = 0; j < 10; j++)
      if ((i + j) % 2) rect("check", flatY(FT + 0.0008), X0 + i * TL, X0 + (i + 1) * TL, Z0 + j * TL, Z0 + (j + 1) * TL);

  // ---------- panelled walls ----------
  // a wall run: wood panelling 0..RAIL with a skirting board, a picture rail and plaster above, on a wall plane P
  // (u along it, v up), proud by `o` toward the room. holes = [[u0, u1, v0, v1]] skip the panel lines there.
  function panelLines(P, u0, u1, v0, v1, bay) {
    const n = Math.max(1, Math.round((u1 - u0) / bay)), w = (u1 - u0) / n;
    for (let i = 0; i < n; i++) {
      const a = u0 + i * w;
      if (i > 0) rect("dark", P, a - 0.012, a + 0.012, v0, v1); // stile seam
      frameRect("dark", P, a + 0.08, a + w - 0.08, v0 + 0.1, v1 - 0.1, 0.014); // inset panel line
    }
  }
  // back wall (-Z), room face at z = Z0
  box("wood", X0 - T, X1, 0, RAIL, Z0 - T, Z0);
  box("plaster", X0 - T, X1, RAIL, H, Z0 - T, Z0 - 0.02);
  box("wood", X0, X1, RAIL - 0.02, RAIL + 0.06, Z0, Z0 + 0.04); // picture rail
  box("wood", X0, X1, FT, 0.14, Z0, Z0 + 0.025); // skirting
  box("wood", X0, X1, H - 0.08, H, Z0, Z0 + 0.05); // cornice
  {
    const P = wallZ(Z0 + 0.001);
    panelLines(P, X0, -2.15, 0.14, RAIL - 0.02, 0.6); // beside the cake case and plant
  }
  // window wall (-X), room face at x = X0; the window opening is cut out of the boxes
  const WX = X0;
  box("wood", X0 - T, X0, 0, WIN.y0, Z0, Z1);
  box("wood", X0 - T, X0, WIN.y0, RAIL, Z0, WIN.z0);
  box("wood", X0 - T, X0, WIN.y0, RAIL, WIN.z1, Z1);
  box("wood", X0 - T, X0, WIN.y1, RAIL, WIN.z0, WIN.z1);
  box("plaster", X0 - T, X0 - 0.02, RAIL, H, Z0, Z1);
  box("wood", X0, X0 + 0.04, RAIL - 0.02, RAIL + 0.06, Z0, Z1);
  box("wood", X0, X0 + 0.025, FT, 0.14, Z0, Z1);
  box("wood", X0, X0 + 0.05, H - 0.08, H, Z0, Z1);
  {
    const P = wallX(WX + 0.001);
    panelLines(P, Z0, WIN.z0, 0.14, RAIL - 0.02, 0.6);
    panelLines(P, WIN.z1, Z1, 0.14, RAIL - 0.02, 0.6);
  }
  // the window: frame, sill, mullions, glass, lace half-curtains on a rod
  {
    const fw = 0.07;
    box("wood", WX - 0.02, WX + 0.04, WIN.y1, WIN.y1 + fw, WIN.z0 - fw, WIN.z1 + fw); // head
    box("wood", WX - 0.02, WX + 0.04, WIN.y0 - 0.06, WIN.y0, WIN.z0 - fw, WIN.z1 + fw);
    box("wood", WX - 0.02, WX + 0.16, WIN.y0 - 0.02, WIN.y0 + 0.02, WIN.z0 - fw - 0.04, WIN.z1 + fw + 0.04); // sill
    box("wood", WX - 0.02, WX + 0.04, WIN.y0, WIN.y1, WIN.z0 - fw, WIN.z0);
    box("wood", WX - 0.02, WX + 0.04, WIN.y0, WIN.y1, WIN.z1, WIN.z1 + fw);
    const GX = WX - 0.05;
    rect(night ? "nglass" : "glass", wallX(GX), WIN.z0, WIN.z1, WIN.y0, WIN.y1);
    const n = 4, w = (WIN.z1 - WIN.z0) / n;
    for (let i = 1; i < n; i++) box("wood", GX, WX + 0.02, WIN.y0, WIN.y1, WIN.z0 + i * w - 0.03, WIN.z0 + i * w + 0.03);
    box("wood", GX, WX + 0.02, 1.6 - 0.025, 1.6 + 0.025, WIN.z0, WIN.z1); // transom bar
    for (let i = 0; i < n; i++) for (const s of [0.33, 0.67]) box("wood", GX, GX + 0.02, WIN.y0, 1.6, WIN.z0 + (i + s) * w - 0.008, WIN.z0 + (i + s) * w + 0.008);
    // lace: a pleated sheet from the rod at 1.52 down to a scalloped hem at ~1.08
    const LX = WX + 0.07, top = 1.52, hem = 1.1, pl = 0.06;
    tube("dark", [[LX, top + 0.02, WIN.z0 - 0.02], [LX, top + 0.02, WIN.z1 + 0.02]], 0.012, 6);
    const P = (z, y, k) => [LX + (k % 2 ? 0.018 : -0.0) , y, z];
    const cols = Math.round((WIN.z1 - WIN.z0) / pl);
    for (let k = 0; k < cols; k++) {
      const za = WIN.z0 + k * pl, zb = za + pl;
      const sc = (z) => hem - 0.035 * Math.sin(((z - WIN.z0) / (pl * 2)) * Math.PI) ** 2;
      const a0 = P(za, top, k), a1 = P(zb, top, k + 1), b1 = P(zb, sc(zb), k + 1), b0 = P(za, sc(za), k);
      quad("lace", a0, a1, b1, b0, [LX - 1, (top + hem) / 2, (za + zb) / 2]);
      // a lace pattern row: small diamonds
      const zm = (za + zb) / 2;
      for (const y of [1.2, 1.32, 1.44]) {
        const x = LX + (k % 2 ? 0.009 : 0.009) + 0.003;
        const d = 0.012;
        quad("laceDot", [x, y - d, zm], [x, y, zm + d], [x, y + d, zm], [x, y, zm - d], [x - 1, y, zm]);
      }
    }
  }

  // ---------- counter ----------
  {
    const { x0, x1, z0, z1, y } = CT;
    box("wood", x0, x1, FT, y - 0.06, z0, z1);
    box("wood", x0 - 0.03, x1 + 0.03, FT, 0.1, z1 - 0.03, z1 + 0.03); // kick plinth
    box("dark", x0 - 0.04, x1 + 0.04, y - 0.06, y, z0 - 0.04, z1 + 0.16); // varnished top slab
    box("wood", x0 - 0.05, x1 + 0.05, y - 0.1, y - 0.06, z1 + 0.1, z1 + 0.17); // top edge apron
    panelLines(wallZ(z1 + 0.001), x0, x1, 0.12, y - 0.12, 0.62);
    panelLines(wallX(x0 - 0.001, -1), z0, z1, 0.12, y - 0.12, 0.6);
    // foot rail on stand-offs
    tube("dark", [[x0 + 0.05, 0.22, z1 + 0.16], [x1 - 0.05, 0.22, z1 + 0.16]], 0.022, 6);
    for (const x of [x0 + 0.15, (x0 + x1) / 2, x1 - 0.15]) tube("dark", [[x, 0.22, z1], [x, 0.22, z1 + 0.16]], 0.014, 5);
  }
  // stools
  STOOLS.forEach((x) => {
    lathe("dark", [[0, FT], [0.21, FT], [0.21, FT + 0.025], [0.05, FT + 0.05], [0, FT + 0.05]], x, SZ, 14);
    cyl("dark", x, SZ, 0.03, FT + 0.04, 0.63, 8);
    const fr = ring(x, 0.3, SZ, 0.17, 12);
    tube("dark", fr, 0.012, 5);
    for (const a of [0, 2, 4]) { const t = (a / 6) * 2 * Math.PI; tube("dark", [[x, 0.3, SZ], [x + 0.17 * Math.cos(t), 0.3, SZ + 0.17 * Math.sin(t)]], 0.01, 4); }
    lathe("dark", [[0, 0.62], [0.1, 0.62], [0.17, 0.645], [0, 0.645]], x, SZ, 14);
    lathe("velvet", [[0, 0.645], [0.19, 0.645], [0.2, 0.68], [0.18, 0.72], [0, 0.73]], x, SZ, 16);
  });

  // ---------- on the counter ----------
  const CY = CT.y;
  function cup(x, z, y = CY, saucer = true) {
    if (saucer) lathe("china", [[0, y], [0.055, y], [0.075, y + 0.012], [0, y + 0.012]], x, z, 12);
    const b = y + (saucer ? 0.012 : 0);
    lathe("china", [[0, b], [0.03, b], [0.042, b + 0.05], [0.0, b + 0.05]], x, z, 10);
    rect("brown", flatY(b + 0.0505), x - 0.025, x + 0.025, z - 0.025, z + 0.025);
    tube("china", [[x + 0.04, b + 0.042, z], [x + 0.06, b + 0.035, z], [x + 0.058, b + 0.015, z], [x + 0.036, b + 0.012, z]], 0.006, 4);
  }
  function siphon(x, z) {
    const y = CY;
    box("dark", x - 0.08, x + 0.08, y, y + 0.02, z - 0.06, z + 0.06); // base
    cyl("dark", x - 0.065, z, 0.009, y + 0.02, y + 0.46, 6); // rod
    lathe("dark", [[0, y + 0.02], [0.035, y + 0.02], [0.03, y + 0.06], [0, y + 0.065]], x + 0.015, z, 10); // burner
    lathe("velvet", [[0, y + 0.065], [0.008, y + 0.065], [0, y + 0.085]], x + 0.015, z, 6); // flame
    const g = y + 0.1, R = 0.065;
    // lower globe: coffee below, glass above
    const lower = [], upper = [];
    for (let i = 0; i <= 8; i++) {
      const a = -Math.PI / 2 + (i / 8) * Math.PI, p = [R * Math.cos(a), g + R + R * Math.sin(a)];
      (i <= 4 ? lower : upper).push(p);
      if (i === 4) upper.push(p);
    }
    lathe("brown", [[0, g], ...lower.slice(1), [0, lower[lower.length - 1][1]]], x + 0.015, z, 12);
    lathe("glassware", [[0, upper[0][1]], ...upper, [0.018, g + 2 * R], [0.018, g + 2 * R + 0.03], [0, g + 2 * R + 0.03]], x + 0.015, z, 12);
    // upper chamber with its stem going into the globe
    const u0 = g + 2 * R + 0.02;
    lathe("glassware", [[0, u0], [0.014, u0], [0.014, u0 + 0.03], [0.045, u0 + 0.07], [0.048, u0 + 0.2], [0.052, u0 + 0.21], [0, u0 + 0.21]], x + 0.015, z, 12);
    box("dark", x - 0.065, x + 0.015, u0 + 0.06, u0 + 0.075, z - 0.01, z + 0.01); // clamp arm
    lathe("dark", [[0.049, u0 + 0.055], [0.056, u0 + 0.055], [0.056, u0 + 0.08], [0.049, u0 + 0.08], [0.049, u0 + 0.055]], x + 0.015, z, 12);
  }
  siphon(1.0, -1.3);
  siphon(1.7, -1.3);
  cup(0.7, -0.98);
  cup(2.1, -0.98);
  cup(2.8, -1.0);
  lathe("china", [[0, CY], [0.04, CY], [0.05, CY + 0.05], [0.035, CY + 0.07], [0.012, CY + 0.08], [0, CY + 0.09]], 0.0, -1.05, 12); // sugar pot
  // cash register at the left end
  {
    const x = -0.35, z = -1.22, y = CY;
    hex("wood", [[x - 0.17, y, z - 0.16], [x + 0.17, y, z - 0.16], [x + 0.17, y, z + 0.18], [x - 0.17, y, z + 0.18],
      [x - 0.17, y + 0.22, z - 0.16], [x + 0.17, y + 0.22, z - 0.16], [x + 0.17, y + 0.1, z + 0.18], [x - 0.17, y + 0.1, z + 0.18]]);
    box("dark", x - 0.18, x + 0.18, y, y + 0.05, z - 0.17, z + 0.19); // cash drawer band
    box("wood", x - 0.08, x + 0.08, y + 0.2, y + 0.34, z - 0.13, z - 0.05); // display tower
    rect("china", wallZ(z - 0.049), x - 0.06, x + 0.06, y + 0.26, y + 0.31);
    const slope = (u, t) => [u, y + 0.22 - 0.12 * t + 0.006, z - 0.16 + 0.34 * t];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      const u = x - 0.12 + i * 0.08, t = 0.25 + j * 0.22;
      const a = slope(u - 0.025, t - 0.08), b = slope(u + 0.025, t - 0.08), e = slope(u + 0.025, t + 0.08), d = slope(u - 0.025, t + 0.08);
      quad("china", a, b, e, d, [u, y, z]);
    }
    anchor("register", x, y, z);
  }

  // ---------- back cabinet and shelves ----------
  {
    const x0 = -0.6, x1 = 3.4, z0 = Z0, z1 = Z0 + 0.5, y = 0.92;
    box("wood", x0, x1, FT, y - 0.04, z0, z1);
    box("dark", x0 - 0.02, x1 + 0.02, y - 0.04, y, z0, z1 + 0.03);
    panelLines(wallZ(z1 + 0.001), x0, x1, 0.12, y - 0.1, 0.5);
    for (let x = x0 + 0.25; x < x1; x += 0.5) lathe("dark", [[0, 0.5], [0.015, 0.5], [0.015, 0.52], [0, 0.52]].map(([r, v]) => [r, v]), x, z1 + 0.01, 6);
    // a coffee grinder and a kettle on the back counter
    box("wood", 2.7, 2.86, y, y + 0.16, z0 + 0.15, z0 + 0.31);
    lathe("glassware", [[0, y + 0.16], [0.06, y + 0.16], [0.07, y + 0.28], [0, y + 0.3]], 2.78, z0 + 0.23, 10);
    lathe("dark", [[0, y], [0.09, y], [0.1, y + 0.1], [0.06, y + 0.16], [0.02, y + 0.17], [0, y + 0.18]], 0.3, z0 + 0.25, 12);
    tube("dark", [[0.37, y + 0.06, z0 + 0.25], [0.46, y + 0.14, z0 + 0.25], [0.5, y + 0.16, z0 + 0.25]], 0.01, 4);
    // open shelves: uprights and boards
    const sd = 0.26, sy = [1.32, 1.66, 2.0];
    for (const x of [x0, (x0 + x1) / 2, x1]) box("wood", x - 0.025, x + 0.025, y, 2.02, z0, z0 + sd);
    sy.forEach((v) => box("wood", x0, x1, v - 0.03, v, z0, z0 + sd));
    // cups on the lower two shelves, jars on the top one
    for (let s = 0; s < 2; s++)
      for (let x = x0 + 0.14; x < x1 - 0.1; x += 0.17) {
        if (Math.abs(x - (x0 + x1) / 2) < 0.08) continue;
        if (s === 0) cup(x, z0 + 0.14, sy[s], true);
        else lathe("china", [[0, sy[s]], [0.032, sy[s]], [0.045, sy[s] + 0.055], [0.04, sy[s] + 0.06], [0, sy[s] + 0.062]], x, z0 + 0.14, 10);
      }
    for (let x = x0 + 0.2; x < x1 - 0.1; x += 0.3) {
      if (Math.abs(x - (x0 + x1) / 2) < 0.1) continue;
      const v = sy[2];
      lathe("brown", [[0, v], [0.07, v], [0.07, v + 0.13], [0, v + 0.13]], x, z0 + 0.13, 10);
      lathe("glassware", [[0.072, v + 0.13], [0.072, v + 0.17], [0.05, v + 0.19], [0, v + 0.19], [0, v + 0.13]], x, z0 + 0.13, 10);
      lathe("dark", [[0, v + 0.19], [0.045, v + 0.19], [0.045, v + 0.215], [0, v + 0.215]], x, z0 + 0.13, 10);
    }
    // the bean jars' front faces, so the glass reads as glass over beans
  }

  // ---------- booths ----------
  // bench along x from the wall to BX, seat between z0 and z1, back cushion on the `back` side (-1: z0 side, +1: z1)
  const BX = X0 + 1.15;
  function bench(z0, z1, back) {
    const zb = back < 0 ? z0 : z1, zf = back < 0 ? z1 : z0, s = back < 0 ? 1 : -1; // s points from back to front
    box("wood", X0, BX, FT, 0.16, Math.min(z0, z1) + 0.03, Math.max(z0, z1) - 0.0);
    pillow("velvet", X0 + 0.02, BX - 0.03, Math.min(zb + s * 0.14, zf), Math.max(zb + s * 0.14, zf), 0.16, 0.38, 0.46, 0.0, 0.03);
    // back cushion: tilted slab from the seat to 1.08
    const zt = zb + s * 0.05, zl = zb + s * 0.16;
    const p = [[X0 + 0.02, 0.44, zb], [BX - 0.03, 0.44, zb], [BX - 0.03, 0.44, zl], [X0 + 0.02, 0.44, zl],
      [X0 + 0.02, 1.08, zb], [BX - 0.03, 1.08, zb], [BX - 0.03, 1.08, zt + s * 0.06], [X0 + 0.02, 1.08, zt + s * 0.06]];
    hex("velvet", p);
    for (let x = X0 + 0.28; x < BX - 0.1; x += 0.28) { // tufting lines
      const zz = (y) => zl + (zt + s * 0.06 - zl) * ((y - 0.44) / 0.64) + s * 0.002;
      quad("brown", [x - 0.008, 0.5, zz(0.5)], [x + 0.008, 0.5, zz(0.5)], [x + 0.008, 1.02, zz(1.02)], [x - 0.008, 1.02, zz(1.02)], [x, 0.75, zz(0.75) - s]);
    }
    box("wood", X0, BX + 0.02, 0.14, 1.15, zb - s * 0.0, zb + s * 0.045 * 0 - s * 0.03); // back board
    box("wood", X0, BX + 0.03, 1.08, 1.15, Math.min(zb - s * 0.03, zb + s * 0.11), Math.max(zb - s * 0.03, zb + s * 0.11)); // cap
    box("wood", BX - 0.03, BX + 0.02, FT, 1.08, Math.min(zb, zb + s * 0.2), Math.max(zb, zb + s * 0.2)); // end post
  }
  function table(zc) {
    const x1 = X0 + 0.95, zh = 0.35;
    box("wood", X0 + 0.02, x1, 0.69, 0.73, zc - zh, zc + zh);
    box("dark", X0 + 0.04, x1 - 0.02, 0.665, 0.69, zc - zh + 0.02, zc + zh - 0.02);
    cyl("dark", (X0 + x1) / 2, zc, 0.04, FT, 0.67, 8);
    lathe("dark", [[0, FT], [0.26, FT], [0.26, FT + 0.03], [0.05, FT + 0.06], [0, FT + 0.06]], (X0 + x1) / 2, zc, 12);
    return { x: (X0 + x1) / 2, y: 0.73 };
  }
  bench(-1.25, -0.66, -1);
  bench(0.04, 0.6, 1);
  bench(0.65, 1.21, -1);
  bench(1.9, 2.46, 1);
  const tA = table(-0.31), tB = table(1.555);
  cup(tA.x + 0.12, -0.5, tA.y);
  cup(tA.x - 0.05, -0.08, tA.y);
  cup(tB.x + 0.1, 1.75, tB.y);
  lathe("china", [[0, tA.y], [0.03, tA.y], [0.035, tA.y + 0.05], [0.015, tA.y + 0.07], [0, tA.y + 0.075]], X0 + 0.14, -0.31, 10);
  lathe("china", [[0, tB.y], [0.03, tB.y], [0.035, tB.y + 0.05], [0.015, tB.y + 0.07], [0, tB.y + 0.075]], X0 + 0.14, 1.555, 10);
  // a cake on a plate on table B
  lathe("china", [[0, tB.y], [0.09, tB.y], [0.1, tB.y + 0.01], [0, tB.y + 0.01]], tB.x - 0.05, 1.38, 12);

  // ---------- pendant lamps ----------
  function lamp(x, z, yb) {
    tube("dark", [[x, H, z], [x, yb + 0.19, z]], 0.006, 4);
    lathe("dark", [[0, yb + 0.18], [0.03, yb + 0.18], [0.03, yb + 0.22], [0, yb + 0.22]], x, z, 8);
    lathe(night ? "glowLamp" : "lamp", [[0, yb + 0.07], [0.2, yb], [0.21, yb + 0.02], [0.17, yb + 0.1], [0.09, yb + 0.17], [0.03, yb + 0.2], [0, yb + 0.2]], x, z, 16);
    lathe("dark", [[0.19, yb - 0.004], [0.212, yb - 0.004], [0.212, yb + 0.018], [0.19, yb + 0.018], [0.19, yb - 0.004]], x, z, 16);
    lathe(night ? "glowLamp" : "china", [[0, yb + 0.02], [0.045, yb + 0.04], [0.04, yb + 0.08], [0, yb + 0.09]], x, z, 8); // bulb
  }
  for (const x of [0.35, 1.4, 2.45]) lamp(x, -0.95, 1.78);
  lamp(tA.x, -0.31, 1.62);
  lamp(tB.x, 1.555, 1.62);

  // ---------- cake display case ----------
  {
    const x0 = -2.05, x1 = -0.8, z0 = Z0 + 0.02, z1 = Z0 + 0.62;
    box("wood", x0, x1, FT, 0.82, z0, z1);
    panelLines(wallZ(z1 + 0.001), x0, x1, 0.1, 0.74, 0.62);
    box("dark", x0 - 0.01, x1 + 0.01, 0.82, 0.86, z0, z1 + 0.01);
    // glass box: corner posts, top, two shelves of cakes inside, glass front and side as flat panes
    const yt = 1.28;
    for (const [x, z] of [[x0, z1], [x1, z1], [x0, z0], [x1, z0]]) box("wood", x - 0.015 + (x === x0 ? 0.015 : -0.015), x + 0.015 + (x === x0 ? 0.015 : -0.015), 0.86, yt, z - 0.015 + (z === z0 ? 0.015 : -0.015), z + 0.015 + (z === z0 ? 0.015 : -0.015));
    box("wood", x0, x1, yt, yt + 0.04, z0, z1);
    box(night ? "glowLamp" : "china", x0 + 0.03, x1 - 0.03, yt - 0.015, yt, z0 + 0.03, z1 - 0.03); // light panel
    box("china", x0 + 0.03, x1 - 0.03, 1.06, 1.075, z0 + 0.03, z1 - 0.06); // glass shelf
    rect("china", wallZ(z0 + 0.03), x0 + 0.03, x1 - 0.03, 0.86, yt - 0.02); // inner back
    const cakes = [[x0 + 0.2, 0.86, "round"], [x0 + 0.52, 0.86, "slice"], [x0 + 0.85, 0.86, "round"], [x0 + 0.25, 1.075, "slice"], [x0 + 0.58, 1.075, "round"], [x0 + 0.95, 1.075, "slice"]];
    for (const [x, y, k] of cakes) {
      const z = (z0 + z1) / 2 + 0.03;
      lathe("china", [[0, y], [0.1, y], [0.1, y + 0.008], [0, y + 0.008]], x, z, 12);
      if (k === "round") {
        cyl("cake", x, z, 0.075, y + 0.008, y + 0.075, 12);
        lathe("china", [[0, y + 0.075], [0.077, y + 0.075], [0.077, y + 0.09], [0, y + 0.092]], x, z, 12); // cream top
        lathe("velvet", [[0, y + 0.09], [0.02, y + 0.09], [0.018, y + 0.11], [0, y + 0.125]], x, z, 6); // strawberry
      } else {
        const a = [x - 0.06, y + 0.008, z - 0.05], b = [x + 0.06, y + 0.008, z - 0.05], e = [x, y + 0.008, z + 0.07];
        const up = (p, h) => [p[0], p[1] + h, p[2]];
        const ref = [x, y + 0.04, z];
        for (const [p, q] of [[a, b], [b, e], [e, a]]) quad("cake", p, q, up(q, 0.07), up(p, 0.07), ref);
        tri("china", up(a, 0.07), up(b, 0.07), up(e, 0.07), ref);
        tri("china", a, b, e, ref);
        rect("china", wallZ(z + 0.07 * 0 - 0.0499 + 0.0), x - 0.059, x + 0.059, y + 0.035, y + 0.045); // cream layer
        lathe("velvet", [[0, y + 0.078], [0.017, y + 0.078], [0.015, y + 0.095], [0, y + 0.108]], x, z - 0.02, 6);
      }
    }
    // glass: front and the +X side, pale panes with a sheen stripe, set in front of the cakes
    const G = night ? "glassware" : "glassware";
    const gz = z1 - 0.005;
    void G;
    for (const [u0, u1] of [[x0 + 0.06, x0 + 0.1], [x1 - 0.32, x1 - 0.28]]) quad("lace", [u0, 0.9, gz + 0.002], [u0 + 0.04, 0.9, gz + 0.002], [u1 + 0.16, yt - 0.04, gz + 0.002], [u1 + 0.12, yt - 0.04, gz + 0.002], [u0, 1, gz - 1]);
    anchor("cakeCase", (x0 + x1) / 2, 0.86, z1);
  }

  // ---------- pendulum wall clock ----------
  {
    const x = -1.42, y0 = 1.58, y1 = 2.24, z = Z0;
    box("wood", x - 0.17, x + 0.17, y0, y1, z, z + 0.1);
    hex("wood", [[x - 0.2, y1, z], [x + 0.2, y1, z], [x + 0.2, y1, z + 0.12], [x - 0.2, y1, z + 0.12], [x - 0.12, y1 + 0.07, z], [x + 0.12, y1 + 0.07, z], [x + 0.12, y1 + 0.07, z + 0.12], [x - 0.12, y1 + 0.07, z + 0.12]]); // pediment
    box("wood", x - 0.19, x + 0.19, y0 - 0.04, y0, z, z + 0.12);
    const P = wallZ(z + 0.101), P2 = wallZ(z + 0.103);
    const fy = y1 - 0.15;
    fan("dark", P, disc(x, fy, 0.135, 18));
    fan("china", P2, disc(x, fy, 0.12, 18));
    const P3 = wallZ(z + 0.105);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * 2 * Math.PI, r0 = 0.1, r1 = 0.114; quad("dark", P3.W(x + r0 * Math.sin(a) - 0.004, fy + r0 * Math.cos(a)), P3.W(x + r0 * Math.sin(a) + 0.004, fy + r0 * Math.cos(a)), P3.W(x + r1 * Math.sin(a) + 0.004, fy + r1 * Math.cos(a)), P3.W(x + r1 * Math.sin(a) - 0.004, fy + r1 * Math.cos(a)), P3.back(x, fy)); }
    const P4 = wallZ(z + 0.107);
    fan("dark", P4, [[x - 0.006, fy], [x + 0.006, fy], [x + 0.002, fy + 0.085], [x - 0.002, fy + 0.085]]); // minute hand (12)
    fan("dark", P4, [[x, fy - 0.006], [x, fy + 0.006], [x + 0.06, fy - 0.03], [x + 0.055, fy - 0.038]]); // hour hand (4)
    // pendulum window
    rect("dark", P, x - 0.11, x + 0.11, y0 + 0.04, fy - 0.17);
    rect("glass", P2, x - 0.095, x + 0.095, y0 + 0.055, fy - 0.185);
    const P5 = wallZ(z + 0.106);
    rect("dark", P5, x - 0.006, x + 0.006, y0 + 0.13, fy - 0.19);
    fan("dark", P5, disc(x, y0 + 0.12, 0.035, 10));
  }

  // ---------- plants ----------
  function plant(cx, cz, y, s, pot) {
    lathe(pot, [[0, y], [0.13 * s, y], [0.17 * s, y + 0.28 * s], [0.18 * s, y + 0.3 * s], [0.16 * s, y + 0.3 * s], [0, y + 0.27 * s]], cx, cz, 12);
    cyl("dark", cx, cz, 0.012 * s + 0.004, y + 0.2 * s, y + 0.75 * s, 5);
    // leaves: flat double-faced blades fanned around the stem, each a diamond with a fold
    const N = 9;
    for (let i = 0; i < N; i++) {
      const a = -1.35 + (i / (N - 1)) * 2.7, h = y + (0.4 + 0.42 * ((i * 5) % N) / N) * s, L = (0.24 + 0.06 * (i % 3)) * s, w = 0.07 * s;
      const d = [Math.cos(a), Math.sin(a)];
      const base = [cx + d[0] * 0.02, h, cz + d[1] * 0.02];
      const tip = [cx + d[0] * L, h + 0.06 * s - 0.08 * s * (i % 2), cz + d[1] * L];
      const mid = [cx + d[0] * L * 0.5, h + 0.07 * s, cz + d[1] * L * 0.5];
      const l = [mid[0] - d[1] * w, mid[1] - 0.01, mid[2] + d[0] * w], r = [mid[0] + d[1] * w, mid[1] - 0.01, mid[2] - d[0] * w];
      const below = [mid[0], mid[1] - 0.2, mid[2]], above = [mid[0], mid[1] + 0.2, mid[2]];
      tri("dark", base, l, mid, below); tri("dark", mid, l, tip, below);
      tri("dark", base, mid, r, below); tri("dark", mid, tip, r, below);
      tri("dark", base, l, mid, above); tri("dark", mid, l, tip, above);
      tri("dark", base, mid, r, above); tri("dark", mid, tip, r, above);
    }
  }
  plant(WX + 0.1, 1.555, WIN.y0 + 0.02, 0.8, "velvet");

  // ---------- closed room: +X wall with a door, +Z wall, ceiling ----------
  if (!cutaway) {
    box("wood", X1, X1 + T, 0, RAIL, Z0 - T, -0.2);
    box("wood", X1, X1 + T, 0, RAIL, 0.75, Z1 + T);
    box("wood", X1, X1 + T, 2.15, RAIL, -0.2, 0.75);
    box("plaster", X1 + 0.02, X1 + T, RAIL, H, Z0 - T, Z1 + T);
    box("wood", X1 + 0.02, X1 + 0.06, 0, 2.15, -0.2, 0.75); // door
    rect("glass", wallX(X1 + 0.019, -1), -0.05, 0.6, 1.1, 1.95);
    panelLines(wallX(X1 - 0.001, -1), Z0, -0.2, 0.14, RAIL - 0.02, 0.6);
    panelLines(wallX(X1 - 0.001, -1), 0.75, Z1, 0.14, RAIL - 0.02, 0.6);
    box("wood", X0 - T, X1 + T, 0, RAIL, Z1, Z1 + T);
    box("plaster", X0 - T, X1 + T, RAIL, H, Z1 + 0.02, Z1 + T);
    panelLines(wallZ(Z1 - 0.001, -1), X0, X1, 0.14, RAIL - 0.02, 0.6);
    box("plaster", X0 - T, X1 + T, H - 0.04, H, Z0 - T, Z1 + T);
    for (let x = X0 + 0.7; x < X1; x += 0.7) box("wood", x - 0.04, x + 0.04, H - 0.12, H - 0.04, Z0, Z1);
  }

  // ---------- meshes ----------
  const MAT = {
    wood: [c.wood, c.woodShade, 0.1, 2.5],
    dark: [c.dark, c.dark, 0.1, 2],
    plaster: night ? [c.nightPlaster, c.nightPlasterShade, 0.1, 2.5] : [c.plaster, c.plasterShade, 0.1, 2.5],
    floor: [c.floor, c.floorShade, 0.1, 2.5],
    check: [c.check, c.check, 0.1, 0],
    velvet: [c.velvet, c.velvetShade, 0.2, 2],
    china: [c.china, c.chinaShade, 0.1, 1.5],
    glass: [c.glass, c.glassShade, 0.1, 0],
    nglass: [c.nightGlass, c.nightGlassShade, 0.1, 0],
    lace: [c.lace, c.laceShade, 0.1, 0],
    laceDot: [c.laceShade, c.laceShade, 0.1, 0],
    lamp: [c.lamp, c.lampShade, 0.1, 2],
    glowLamp: [c.glow, c.glow, -0.25, 2],
    glassware: [c.glassware, c.glasswareShade, 0.1, 1.5],
    cake: [c.cake, c.cakeShade, 0.1, 1.5],
    brown: [c.coffee, c.coffee, 0.1, 0],
  };
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

  function anchor(name, x, y, z) { const a = new THREE.Group(); a.name = name; a.position.set(x, y, z); set.add(a); joints[name] = a; }
  anchor("floor", 0, FT, 0);
  anchor("counter", (CT.x0 + CT.x1) / 2, CT.y, CT.z1 + 0.05);
  STOOLS.forEach((x, i) => anchor("stool" + i, x, 0.73, SZ));
  anchor("boothA", tA.x, 0.46, -0.31);
  anchor("boothB", tB.x, 0.46, 1.555);
  anchor("window", WX, (WIN.y0 + WIN.y1) / 2, (WIN.z0 + WIN.z1) / 2);

  function pose(name) {
    if (name !== "rest") throw new Error(`kissaten: unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
