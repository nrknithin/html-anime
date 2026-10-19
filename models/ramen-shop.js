// ramen-shop.js - a narrow two-storey wooden ramen shop front (anime street scene), static.
// Contract: harness/lab/README.md. Meters, +Y up, the street / shopfront faces +Z, its left is +X, stands on y = 0,
// centred on x = 0, z = 0.
//
// Construction (boxes, beams, flat quads, one lathe; triangle soups merged per material, flat-shaded so planes read crisp):
//   BODY     one closed plaster pentagonal prism (both storeys and the gables: a narrow machiya-like shop is flush; one
//            solid, so no inner wall-top edge gets a hull line) on a stone
//            foundation band, dark wood corner posts, a floor beam and an eave beam across the front.
//   ROOF     a gable with its ridge along x (hirairi: the street sees the slope): two tiled slabs (closed hexahedra) with
//            dark tile rows laid down the slope, eave-tile ends on the fascia, barge boards on both gables, a ridge cap
//            with raised end tiles. A small tiled pent roof (hisashi) over the ground floor on two brackets.
//   SHOP     two sliding lattice-and-glass doors (one 4 cm in front of the other, as sliding doors overlap), wood kick
//            panels; a split noren (4 panels under a joined top hem) on a wood rod over the doorway; a red akachochin
//            (one smooth LatheGeometry, dark rib bands, lacquer caps) hanging on a cord from the hisashi between the door
//            and a take-out window; that window has one pane slid open on a dark interior and a wood counter shelf, over
//            koshi slats. A blank vertical sign board on the left wall (moon panel in a dark wood frame).
//   UPPER    a two-leaf window with sash bars behind a wooden railing (rails, balusters, two arms to the wall); a second
//            blank board projects square to the street from the upper +X corner (tsukidashi kanban), so the hero view sees it.
//   SIDES    wood board skirts (koshiita) on both side walls; small windows on both sides and the back.
//   STREET   two beer-crate stools (red crates with dark hand slots, one turned), a stone step at the door.
//   Every closed part is wound from its own centre (or a point inside it), never by hand.
// Proportions (real size, base unit the storey S = 2.95 m): walls 4.0 x 6.0, foundation 0-0.3, floor beam 2.94-3.1,
//   wall top 5.2; roof pitch 0.3 (17 deg), eave ~5.0 at z +-3.6, sides overhang 0.35, ridge cap and onigawara top 6.5.
//   Hisashi 3.05 at the wall to 2.75 at z 3.95, 4.4 wide. Doorway 1.8 x 2.1 at x -0.4; noren 1.0 long from 2.45 (4 panels
//   0.47 wide); lantern 0.48 x 0.6 paper, centre x 0.84, z 3.5, cap top 2.56; take-out window 0.8 x 0.95 at sill 1.0;
//   wall sign 0.4 x 1.95; projecting sign 0.5 x 1.7; upper window 2.2 x 1.15; crates 0.33 x 0.30 x 0.46.
// Budget: ~3.3k triangles in 13 meshes.
// Options build(THREE, kit, colors, { height, night }):
//   height   scales the whole shop uniformly (default 6.5, the ridge cap top), as the torii and house do.
//   night    the sun goes off and the practicals come on: the lantern paper and ribs and every pane (doors, take-out,
//            upper and side windows) go to a negative threshold (flat base all round; the kit has no emissive), glass to
//            practical #fffaf2; every other material except the stone goes to threshold 2 (flat shade: plaster sky, wood,
//            tiles and caps hair); stone, noren and crates keep their day tones (street and doorway
//            light). Same 13 meshes, same geometry.
// Colours (noon), base / shade:
//   plaster moon #fff6e4 / sky #f2d7ae (threshold 0.1, so walls square to the camera stay lit)
//   wood (posts, frames, lattice, rail, counter, rod, brackets, barge) iris #5c3d32 / hair #241c16
//   tiles iris / hair at 0.25, tile rows and eave ends hair (lines); interior and crate slots hair (flat)
//   glass sky #f2d7ae flat (threshold -1) by day, practical #fffaf2 flat at night
//   noren, lantern paper, crates accent #c4452d / iris #5c3d32; lantern ribs iris / hair; caps iris / hair at 0.8
//   sign moon / sky (blank); stone sky / skin. hair sits next to ink only in lines and small parts, as on the house.

export const meta = {
  name: "ramen-shop",
  height: 6.5,
  script: "noon",
  colors: {
    plaster: "#fff6e4", plasterShade: "#f2d7ae",
    wood: "#5c3d32", woodShade: "#241c16",
    tile: "#5c3d32", tileShade: "#241c16",
    line: "#241c16",
    glass: "#f2d7ae", glassShade: "#f0c2ae",
    glassLit: "#fffaf2",
    cloth: "#c4452d", clothShade: "#5c3d32",
    rib: "#5c3d32", ribShade: "#241c16",
    sign: "#fff6e4", signShade: "#f2d7ae",
    stone: "#f2d7ae", stoneShade: "#f0c2ae",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, night = false } = opts;
  const root = new THREE.Group();
  root.name = "ramen-shop";
  const shop = new THREE.Group(); // uniform size scale lives here, so root stays the plain contract node
  shop.name = "body";
  shop.scale.setScalar(height / meta.height);
  root.add(shop);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  function tri(key, a, b, e, ref) { // wound away from ref (a point inside the solid); slivers dropped
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-7) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    S(key).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function hex(key, p) { // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  // a box turned ry about y around its centre
  function box(key, cx, cy, cz, sx, sy, sz, ry = 0) {
    const cs = Math.cos(ry), sn = Math.sin(ry);
    const P = (i, j, k) => { const x = i * sx / 2, z = k * sz / 2; return [cx + x * cs + z * sn, cy + j * sy / 2, cz - x * sn + z * cs]; };
    hex(key, [P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1), P(-1, 1, -1), P(1, 1, -1), P(1, 1, 1), P(-1, 1, 1)]);
  }
  function beam(key, a, b, w, h, up = [0, 1, 0]) { // a beam from a to b, w wide and h tall along `up`
    const d = sub(b, a);
    const nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
    const s = nrm(cross(d, up)), u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // a flat quad on the front plane z, facing +Z (panes, lattice bars, slots: only their front ever shows)
  const fquad = (key, x, y, z, w, h) =>
    quad(key, [x - w / 2, y - h / 2, z], [x + w / 2, y - h / 2, z], [x + w / 2, y + h / 2, z], [x - w / 2, y + h / 2, z], [x, y, z - 1]);
  // a lattice glass panel on the front: inked frame, glass, bars [vertical, horizontal]
  function panel(x, y0, w, h, z, { glass = "glass", bars = [2, 3], kick = 0 } = {}) {
    box("frame", x, y0 + h / 2, z, w, h, 0.05);
    const gy0 = y0 + kick + 0.06, gh = h - kick - 0.12, gw = w - 0.1;
    fquad(glass, x, gy0 + gh / 2, z + 0.027, gw, gh);
    if (kick > 0) fquad("lattice", x, y0 + kick / 2 + 0.03, z + 0.029, gw, kick); // wood kick panel
    const [nv, nh] = bars;
    for (let i = 1; i <= nv; i++) fquad("lattice", x - gw / 2 + (i * gw) / (nv + 1), gy0 + gh / 2, z + 0.033, 0.03, gh);
    for (let j = 1; j <= nh; j++) fquad("lattice", x, gy0 + (j * gh) / (nh + 1), z + 0.034, gw, 0.03);
  }

  // ---------- body ----------
  const W = 2.0, D = 3.0, FY = 0.3, WT = 5.2, ZF = D; // half width, half depth, foundation top, wall top, front plane
  box("stone", 0, FY / 2, 0, 2 * W + 0.08, FY, 2 * D + 0.08);
  const RP = 0.3, RID = WT + RP * D; // roof pitch; gable apex under the ridge
  { // both storeys and the gables as ONE closed pentagonal prism, so no inner wall-top edge gets a hull line
    const pent = [[-D, FY], [D, FY], [D, WT], [0, RID], [-D, WT]]; // (z, y) around the gable
    const ref = [0, (FY + WT) / 2, 0];
    for (let i = 0; i < 5; i++) {
      const [z0, y0] = pent[i], [z1, y1] = pent[(i + 1) % 5];
      quad("plaster", [-W, y0, z0], [W, y0, z0], [W, y1, z1], [-W, y1, z1], ref);
      for (const x of [-W, W]) tri("plaster", [x, y0, z0], [x, y1, z1], [x, ref[1], 0], ref);
    }
  }
  for (const x of [-W, W]) for (const z of [-D, D]) box("frame", x, (FY + WT) / 2, z, 0.16, WT - FY, 0.16);
  box("frame", 0, 3.02, ZF + 0.03, 2 * W + 0.1, 0.16, 0.1); // floor beam
  box("frame", 0, WT - 0.08, ZF + 0.03, 2 * W + 0.1, 0.16, 0.1); // eave beam
  box("frame", 0, 3.02, -D - 0.03, 2 * W + 0.1, 0.16, 0.1);
  for (const x of [-W - 0.03, W + 0.03]) box("frame", x, 3.02, 0, 0.1, 0.16, 2 * D + 0.1); // floor beam round the sides

  // ---------- main roof: gable, ridge along x ----------
  const RX = W + 0.35, RE = D + 0.6, RT = 0.16; // half width at the barge, eave z, slab thickness
  const yb = (z) => WT + RP * (D - Math.abs(z)) - 0.03; // sunk 3 cm into the walls // slab underside
  for (const s of [-1, 1]) {
    const e = s * RE, yE = yb(RE);
    hex("tile", [[-RX, yE, e], [RX, yE, e], [RX, RID, 0], [-RX, RID, 0],
      [-RX, yE + RT, e], [RX, yE + RT, e], [RX, RID + RT, 0], [-RX, RID + RT, 0]]);
    // tile rows down the slope and eave-tile ends on the fascia
    for (let x = -RX + 0.2; x <= RX - 0.15; x += 0.3) {
      beam("line", [x, yE + RT + 0.02, e], [x, RID + RT + 0.02, 0], 0.05, 0.02);
      if (s > 0) fquad("line", x, yE + RT / 2, e + 0.004, 0.1, 0.1);
      else quad("line", [x - 0.05, yE + 0.03, e - 0.004], [x + 0.05, yE + 0.03, e - 0.004], [x + 0.05, yE + 0.13, e - 0.004], [x - 0.05, yE + 0.13, e - 0.004], [x, yE + 0.08, e + 1]);
    }
    // barge boards on both gables
    for (const x of [-RX - 0.03, RX + 0.03]) beam("frame", [x, yE - 0.06, e], [x, RID - 0.06 + RT, 0], 0.07, 0.3, [s, 0, 0]);
  }
  beam("tile", [-RX - 0.08, RID + RT + 0.06, 0], [RX + 0.08, RID + RT + 0.06, 0], 0.3, 0.2);
  for (const x of [-RX - 0.06, RX + 0.06]) box("tile", x, RID + RT + 0.1, 0, 0.18, 0.28, 0.4); // onigawara, top 6.5

  // ---------- hisashi (pent roof) over the ground floor ----------
  const HX = W + 0.2, HZ = ZF + 0.95, HY0 = 3.05, HY1 = 2.75, HT = 0.1;
  hex("tile", [[-HX, HY0, ZF], [HX, HY0, ZF], [HX, HY1, HZ], [-HX, HY1, HZ],
    [-HX, HY0 + HT, ZF], [HX, HY0 + HT, ZF], [HX, HY1 + HT, HZ], [-HX, HY1 + HT, HZ]]);
  for (let x = -HX + 0.15; x <= HX - 0.1; x += 0.25) {
    beam("line", [x, HY0 + HT + 0.015, ZF + 0.05], [x, HY1 + HT + 0.015, HZ], 0.045, 0.02);
    fquad("line", x, HY1 + HT / 2, HZ + 0.004, 0.09, 0.08);
  }
  for (const x of [-W + 0.05, W - 0.05]) beam("frame", [x, 2.3, ZF], [x, 2.8, ZF + 0.85], 0.08, 0.1, [1, 0, 0]); // brackets
  const hisashiUnder = (z) => HY0 + (HY1 - HY0) * (z - ZF) / (HZ - ZF);

  // ---------- shopfront ----------
  const DX = -0.4, DW = 1.8, DY = FY, DH = 2.1; // doorway centre x, width, sill, height
  box("frame", DX - DW / 2 - 0.06, (FY + 2.95) / 2, ZF + 0.03, 0.12, 2.95 - FY, 0.08); // door posts
  box("frame", DX + DW / 2 + 0.06, (FY + 2.95) / 2, ZF + 0.03, 0.12, 2.95 - FY, 0.08);
  box("frame", DX, DY + DH + 0.05, ZF + 0.03, DW + 0.24, 0.1, 0.08); // lintel (kamoi)
  fquad("dark", DX, DY + DH / 2, ZF + 0.005, DW, DH); // the shop behind the doors
  const lw = DW / 2 + 0.03;
  panel(DX - DW / 4 - 0.015, DY, lw, DH, ZF + 0.03, { glass: "glass", bars: [2, 4], kick: 0.45 });
  panel(DX + DW / 4 + 0.015, DY, lw, DH, ZF + 0.08, { glass: "glass", bars: [2, 4], kick: 0.45 });
  box("stone", DX, 0.09, ZF + 0.35, DW + 0.3, 0.18, 0.55); // step stone

  // noren: a joined top hem and 4 split panels, a slight alternating sway, on a wood rod
  const NZ = ZF + 0.2, NY = DY + DH + 0.05, NL = 1.0, NW = DW + 0.12, gap = 0.035, np = 4;
  beam("frame", [DX - NW / 2 - 0.1, NY + 0.02, NZ], [DX + NW / 2 + 0.1, NY + 0.02, NZ], 0.04, 0.04);
  for (const x of [DX - NW / 2 - 0.08, DX + NW / 2 + 0.08]) beam("frame", [x, NY + 0.02, NZ], [x, NY + 0.02, ZF + 0.05], 0.03, 0.03); // rod hooks
  box("cloth", DX, NY - 0.08, NZ, NW, 0.16, 0.025);
  const pw = (NW - gap * (np - 1)) / np;
  for (let i = 0; i < np; i++) {
    const x = DX - NW / 2 + pw / 2 + i * (pw + gap), t = i % 2 ? 1 : -1;
    const top = NY - 0.15, bot = NY - NL, zb = NZ + 0.03 * t;
    hex("cloth", [[x - pw / 2, top, NZ - 0.012], [x + pw / 2, top, NZ - 0.012], [x + pw / 2, bot, zb - 0.012], [x - pw / 2, bot, zb - 0.012],
      [x - pw / 2, top, NZ + 0.012], [x + pw / 2, top, NZ + 0.012], [x + pw / 2, bot, zb + 0.012], [x - pw / 2, bot, zb + 0.012]]);
  }

  // take-out window: one pane slid open on the dark shop, a counter shelf, koshi slats under it
  const WX = 1.5, WW = 0.8, WY = 1.0, WH = 0.95;
  box("frame", WX, WY + WH / 2, ZF + 0.02, WW + 0.14, WH + 0.12, 0.05);
  fquad("dark", WX, WY + WH / 2, ZF + 0.046, WW, WH);
  panel(WX + WW / 4, WY, WW / 2 + 0.02, WH, ZF + 0.07, { glass: "glass", bars: [1, 2] });
  panel(WX + WW / 4 - 0.04, WY, WW / 2 + 0.02, WH, ZF + 0.12, { glass: "glass", bars: [1, 2] }); // both panes stacked right: the left half stands open
  box("frame", WX, WY - 0.03, ZF + 0.16, WW + 0.3, 0.06, 0.32); // counter shelf
  for (const x of [WX - WW / 2 + 0.05, WX + WW / 2 - 0.05]) beam("frame", [x, WY - 0.35, ZF], [x, WY - 0.06, ZF + 0.25], 0.05, 0.06, [1, 0, 0]);
  box("frame", WX, (FY + WY - 0.06) / 2, ZF + 0.02, WW + 0.2, WY - 0.06 - FY, 0.04);
  for (let x = WX - WW / 2; x <= WX + WW / 2 + 0.01; x += 0.09) fquad("line", x, (FY + WY - 0.06) / 2, ZF + 0.042, 0.022, WY - 0.1 - FY);

  // blank vertical sign board on the left wall
  const SX = -1.7;
  box("frame", SX, 1.6, ZF + 0.04, 0.4, 1.95, 0.06);
  box("sign", SX, 1.6, ZF + 0.075, 0.3, 1.83, 0.03);
  // a second blank board projecting from the upper +X corner, square to the street (tsukidashi kanban)
  const PX = 1.72, PZ = ZF + 0.42;
  box("frame", PX, 4.2, PZ, 0.07, 1.7, 0.5);
  box("sign", PX, 4.2, PZ, 0.09, 1.56, 0.38);
  for (const y of [3.55, 4.85]) beam("frame", [PX, y, ZF], [PX, y, PZ - 0.2], 0.03, 0.04);

  // akachochin: one smooth lathe body, dark rib bands, lacquer caps, a cord to the hisashi
  const LX = 0.84, LZ = ZF + 0.5, LB = 1.9, LR = 0.24, LH = 0.6; // centre x, z, bottom cap, radius, paper height
  const RE2 = 0.13, K = Math.sqrt(1 - (RE2 / LR) ** 2), LYc = LB + 0.03 + LH / 2;
  const rad = (t) => LR * Math.sqrt(Math.max(0, 1 - (K * t) ** 2));
  const prof = [];
  for (let i = 0; i <= 16; i++) { const t = -1 + (2 * i) / 16; prof.push(new THREE.Vector2(rad(t), LYc + t * LH / 2)); }
  const paperGeo = new THREE.LatheGeometry(prof, 24);
  const NR = 9;
  for (let r = 1; r < NR; r++) {
    const t = -1 + (2 * r) / NR, y = LYc + t * LH / 2, rr = rad(t) + 0.004, hh = 0.007;
    for (let k = 0; k < 24; k++) {
      const a0 = (k / 24) * Math.PI * 2, a1 = ((k + 1) / 24) * Math.PI * 2;
      const P = (a, yy) => [LX + rr * Math.sin(a), yy, LZ + rr * Math.cos(a)];
      quad("rib", P(a0, y - hh), P(a1, y - hh), P(a1, y + hh), P(a0, y + hh), [LX, y, LZ]);
    }
  }
  for (const [y0, y1] of [[LB, LB + 0.05], [LB + LH + 0.01, LB + LH + 0.06]]) { // lacquer caps, 16-sided drums
    const r = RE2 + 0.012, ref = [LX, (y0 + y1) / 2, LZ];
    for (let k = 0; k < 16; k++) {
      const a0 = (k / 16) * Math.PI * 2, a1 = ((k + 1) / 16) * Math.PI * 2;
      const P = (a, y) => [LX + r * Math.sin(a), y, LZ + r * Math.cos(a)];
      quad("cap", P(a0, y0), P(a1, y0), P(a1, y1), P(a0, y1), ref);
      tri("cap", P(a0, y0), P(a1, y0), [LX, y0, LZ], ref);
      tri("cap", P(a0, y1), P(a1, y1), [LX, y1, LZ], ref);
    }
  }
  beam("frame", [LX, LB + LH + 0.06, LZ], [LX, hisashiUnder(LZ) + 0.02, LZ], 0.015, 0.015, [1, 0, 0]); // cord

  // ---------- upper floor: window behind a wooden railing ----------
  const UY = 3.6, UW = 2.2, UH = 1.15;
  box("frame", 0, UY + UH / 2, ZF + 0.02, UW + 0.16, UH + 0.16, 0.05);
  panel(-UW / 4 - 0.01, UY, UW / 2 + 0.02, UH, ZF + 0.05, { glass: "glass", bars: [2, 2] });
  panel(UW / 4 + 0.01, UY, UW / 2 + 0.02, UH, ZF + 0.1, { glass: "glass", bars: [2, 2] });
  const RZ = ZF + 0.32, RW = UW + 0.5;
  for (const y of [3.42, 3.95]) beam("frame", [-RW / 2, y, RZ], [RW / 2, y, RZ], 0.07, 0.06);
  for (let x = -RW / 2 + 0.06; x <= RW / 2 - 0.05; x += 0.13) box("frame", x, 3.68, RZ, 0.035, 0.5, 0.035);
  for (const x of [-RW / 2 + 0.03, RW / 2 - 0.03]) {
    beam("frame", [x, 3.95, ZF], [x, 3.95, RZ + 0.02], 0.06, 0.06);
    beam("frame", [x, 3.42, ZF], [x, 3.42, RZ + 0.02], 0.06, 0.06);
  }

  // ---------- sides and back: small windows, so the turn is not blank ----------
  for (const sx of [-1, 1]) for (const [y, z] of [[1.4, -0.8], [4.0, -0.5]]) {
    const X = (o) => sx * (W + o);
    box("frame", X(0.02), y + 0.4, z, 0.05, 0.92, 1.12);
    quad("glass", [X(0.047), y, z - 0.5], [X(0.047), y, z + 0.5], [X(0.047), y + 0.8, z + 0.5], [X(0.047), y + 0.8, z - 0.5], [0, y, z]);
    quad("lattice", [X(0.05), y, z - 0.015], [X(0.05), y, z + 0.015], [X(0.05), y + 0.8, z + 0.015], [X(0.05), y + 0.8, z - 0.015], [0, y, z]);
  }
  for (const [x, y] of [[0.6, 1.4], [-0.5, 4.0]]) { // back (-Z)
    box("frame", x, y + 0.4, -D - 0.02, 1.12, 0.92, 0.05);
    quad("glass", [x - 0.5, y, -D - 0.047], [x + 0.5, y, -D - 0.047], [x + 0.5, y + 0.8, -D - 0.047], [x - 0.5, y + 0.8, -D - 0.047], [x, y, 0]);
    quad("lattice", [x - 0.015, y, -D - 0.05], [x + 0.015, y, -D - 0.05], [x + 0.015, y + 0.8, -D - 0.05], [x - 0.015, y + 0.8, -D - 0.05], [x, y, 0]);
  }

  // wood board skirts (koshiita) on both side walls
  for (const sx of [-1, 1]) {
    box("frame", sx * (W + 0.015), 0.8, 0, 0.03, 1.0, 2 * D - 0.1);
    for (let z = -D + 0.2; z < D - 0.1; z += 0.2)
      quad("line", [sx * (W + 0.032), 0.32, z - 0.01], [sx * (W + 0.032), 0.32, z + 0.01], [sx * (W + 0.032), 1.28, z + 0.01], [sx * (W + 0.032), 1.28, z - 0.01], [0, 0.8, z]);
  }

  // ---------- beer-crate stools ----------
  function crate(x, z, ry) {
    const cw = 0.33, ch = 0.3, cd = 0.46, cs = Math.cos(ry), sn = Math.sin(ry);
    box("cloth", x, ch / 2, z, cw, ch, cd, ry);
    const at = (u, v, y) => [x + u * cs + v * sn, y, z - u * sn + v * cs];
    // hand slots on the short ends, a dark grid of bottle cells on top, slots along the long sides
    for (const s of [-1, 1]) {
      const v = s * (cd / 2 + 0.003);
      quad("dark", at(-0.08, v, ch - 0.1), at(0.08, v, ch - 0.1), at(0.08, v, ch - 0.05), at(-0.08, v, ch - 0.05), [x, ch / 2, z]);
      const u = s * (cw / 2 + 0.003);
      for (const v0 of [-0.15, 0, 0.15]) quad("dark", at(u, v0 - 0.05, 0.06), at(u, v0 + 0.05, 0.06), at(u, v0 + 0.05, 0.2), at(u, v0 - 0.05, 0.2), [x, ch / 2, z]);
    }
    for (let i = 1; i < 4; i++) { const u = -cw / 2 + (i * cw) / 4; quad("dark", at(u - 0.01, -cd / 2 + 0.02, ch + 0.003), at(u + 0.01, -cd / 2 + 0.02, ch + 0.003), at(u + 0.01, cd / 2 - 0.02, ch + 0.003), at(u - 0.01, cd / 2 - 0.02, ch + 0.003), [x, 0, z]); }
    for (let j = 1; j < 5; j++) { const v = -cd / 2 + (j * cd) / 5; quad("dark", at(-cw / 2 + 0.02, v - 0.01, ch + 0.003), at(cw / 2 - 0.02, v - 0.01, ch + 0.003), at(cw / 2 - 0.02, v + 0.01, ch + 0.003), at(-cw / 2 + 0.02, v + 0.01, ch + 0.003), [x, 0, z]); }
  }

  crate(0.45, ZF + 1.05, 0.15);
  crate(1.45, ZF + 0.75, -0.25);

  // ---------- meshes ----------
  const glassMat = night ? [c.glassLit, c.glassLit, -1, false] : [c.glass, c.glassShade, -1, false]; // panes: flat by day too
  // night: the sun is off, so every material that is not a practical sits flat in its shade (threshold 2)
  const T = (t) => (night ? 2 : t);
  const MAT = {
    plaster: [c.plaster, c.plasterShade, T(0.1), true],
    stone: [c.stone, c.stoneShade, 0.1, true], // the street lamp keeps the pavement lit at night
    frame: [c.wood, c.woodShade, T(0.1), true],
    lattice: [c.wood, c.woodShade, T(0.1), false],
    glass: glassMat,
    tile: [c.tile, c.tileShade, T(0.25), true],
    line: [c.line, c.line, T(0.1), false],
    dark: [c.line, c.line, T(0.1), false],
    cloth: [c.cloth, c.clothShade, 0.1, true], // the doorway light keeps the noren (and the crates) red at night
    sign: [c.sign, c.signShade, T(0.1), false],
    cap: [c.rib, c.ribShade, T(0.8), true],
    rib: [c.rib, c.ribShade, night ? -1 : 0.1, false],
  };
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, { threshold, outline });
    mesh.name = key;
    shop.add(mesh);
  }
  paperGeo.translate(LX, 0, LZ);
  const paper = kit.toon(paperGeo, c.cloth, c.clothShade, { threshold: night ? -1 : 0.1 });
  paper.name = "lantern";
  shop.add(paper);

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
