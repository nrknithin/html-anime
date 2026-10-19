// apartment-block.js - the classic two-storey wooden / light-steel apartment house (apaato) of anime streets, static.
// Contract: harness/lab/README.md. Meters, +Y up, the doors and the open walkway face +Z (the street), its left is +X
// (the stair end), stands on y = 0, centred on x = 0, z = 0 (the bbox centre).
//
// Construction (boxes, prisms and flat quads, all triangle soups merged per look; flat-shaded so planes read crisp):
//   BODY      one prism: a pentagon in the (z, y) plane extruded along x, so the gable ends close under the low roof
//             by themselves. A concrete foundation band, horizontal siding lines (dark strips 4 mm proud, every 0.3 m,
//             clipped to the gable line) on all four walls, dark corner trims.
//   ROOF      two slabs of a low gable (8 deg) with the ridge along x, eaves 0.45 m past the walls, covering the front
//             walkway too; standing seams down each slope, a ridge cap, a dark fascia band on the eaves.
//   WALKWAY   the open second-floor corridor along the front on steel posts: a slab with a dark edge band, a steel
//             railing (top and bottom rails, balusters every 0.12 m), returning at both ends; it runs on past the +X
//             wall as the stair landing.
//   STAIR     an external straight steel stair along the +X end wall, foot at the back, top at the landing: two
//             channel stringers, open treads, a handrail on posts on both sides, a post under the landing.
//   UNITS     per unit and floor: a steel door in a frame (knob, mail slot), a door lamp on a bracket above it, a small
//             frosted window with a grille, an AC outdoor unit (fan disc, grille bars) under the window; the 2F set
//             stands on the walkway, the 1F set on the apron. Back walls get one sash window per unit and floor, the
//             -X end one small window per floor. A row of mailboxes (one per unit) on legs at the foot of the stair.
//   Every triangle is wound away from a point inside its solid (box centre, prism centroid, a point behind a flat
//   quad), never by hand.
// Proportions (real size, base unit the storey S = 2.7 m): walls 9.0 x 4.8, walkway 1.2 deep, overall ~10.4 x 6.8 at
//   the eaves; 1F floor 0.4, 2F floor 3.1, eave 5.65, ridge cap top 6.2 (2.3 S); doors 0.8 x 1.95, windows 0.7 x 0.6,
//   railing 1.0, stair 0.9 wide with 14 risers of 0.21 over a 4.3 m run (35 deg), mailboxes 0.25 x 0.28 x 0.35.
// Options: build(THREE, kit, colors, { height = 6.2, units = 4, night = false }).
//   height  scales the whole building uniformly (the ridge cap's top).
//   units   doors per floor, 2-4 (clamped); unit width 9 / units.
//   night   the door lamps and the frosted windows glow (threshold -0.25, base only). With the default colours, night
//           switches to meta.nightColors, the same roles on the indigo script; a film passing its own colours keeps
//           them and only the glow changes.
// Colours (noon by day): siding sky #f2d7ae / skin #f0c2ae (threshold 0.1, so the street face stays lit) with iris
//   #5c3d32 siding lines and corner trims; roof iris / hair #241c16 (0.25) with hair seams; doors iris / hair; steel
//   (stair, railing, posts) moon #fff6e4 / sclera #f6f3ee with ink; walkway edge band, frames, grilles iris flat;
//   frosted glass practical #fffaf2 / sclera; lamps moon; concrete and AC units sclera / sky; fan discs and slots hair.
// Night (indigo): siding moon #d5e2ff / sky #1b2d6b at 0.35, so the street face goes navy and the lit gable end stays
//   pale; lines sky / hair; steel line #e7eefc / moon; roof sky / hair; doors moon / sky; glass and lamps practical
//   #f0c36a glowing; concrete moon / sky.

export const meta = {
  name: "apartment-block",
  height: 6.2,
  script: "noon",
  colors: {
    wall: "#f2d7ae", wallShade: "#f0c2ae",
    line: "#5c3d32", lineShade: "#5c3d32",
    roof: "#5c3d32", roofShade: "#241c16",
    seam: "#241c16",
    door: "#5c3d32", doorShade: "#241c16",
    steel: "#fff6e4", steelShade: "#f6f3ee",
    trim: "#5c3d32",
    glass: "#fffaf2", glassShade: "#f6f3ee",
    lamp: "#fff6e4",
    concrete: "#f6f3ee", concreteShade: "#f2d7ae",
    dark: "#241c16",
  },
  nightColors: {
    wall: "#d5e2ff", wallShade: "#1b2d6b",
    line: "#1b2d6b", lineShade: "#16141c",
    roof: "#1b2d6b", roofShade: "#16141c",
    seam: "#16141c",
    door: "#d5e2ff", doorShade: "#1b2d6b",
    steel: "#e7eefc", steelShade: "#d5e2ff",
    trim: "#1b2d6b",
    glass: "#f0c36a", glassShade: "#f0c36a",
    lamp: "#f0c36a",
    concrete: "#d5e2ff", concreteShade: "#1b2d6b",
    dark: "#16141c",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height, night = false } = opts;
  const units = Math.max(2, Math.min(4, Math.round(opts.units ?? 4)));
  const c = night && colors === meta.colors ? meta.nightColors : colors;
  const root = new THREE.Group();
  root.name = "apartment-block";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / meta.height);
  root.add(body);
  const shift = new THREE.Group(); // centres the bbox (the stair and mailboxes stick out on +X)
  shift.position.x = -0.5;
  body.add(shift);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  function tri(key, a, b, e, ref) {
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-9) return;
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
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // a box centred at (x, y, z) of size (w, h, d)
  const cbox = (key, x, y, z, w, h, d) => box(key, x - w / 2, x + w / 2, y - h / 2, y + h / 2, z - d / 2, z + d / 2);
  // a beam from a to b, w wide and h deep, its depth across `up`
  function beam(key, a, b, w, h, up = [0, 1, 0]) {
    const d = sub(b, a);
    const s = nrm(cross(d, up)), u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // a convex polygon in the (z, y) plane extruded from x0 to x1
  function prism(key, x0, x1, poly) {
    const zc = poly.reduce((s, p) => s + p[0], 0) / poly.length, yc = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    const ref = [(x0 + x1) / 2, yc, zc];
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const [za, ya] = poly[i], [zb, yb] = poly[(i + 1) % n];
      quad(key, [x0, ya, za], [x0, yb, zb], [x1, yb, zb], [x1, ya, za], ref);
      for (const x of [x0, x1]) tri(key, [x, yc, zc], [x, ya, za], [x, yb, zb], [x + (x === x0 ? 1 : -1), yc, zc]);
    }
  }
  // flat quads facing out of a wall: +Z (z plane), -Z, +X, -X
  const fz = (key, x0, x1, y0, y1, z, dir = 1) => quad(key, [x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [x0, y0, z - dir]);
  const fx = (key, z0, z1, y0, y1, x, dir = 1) => quad(key, [x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0], [x - dir, y0, z0]);

  // ---------- plan ----------
  const X0 = -4.5, X1 = 4.5, ZB = -3.0, ZF = 1.8, WZ = 3.0; // walls, walkway outer edge
  const F1 = 0.4, F2 = 3.1, RAIL = 1.0; // floor levels, railing height
  const XL = 5.6; // the landing's +X edge
  const RZ = 3.45, RX0 = X0 - 0.45, RX1 = X1 + 0.45; // roof half-depth and ends
  const RT = 6.12, RP = (RT - 5.65) / RZ, RTH = 0.14; // ridge top, pitch, slab thickness
  const under = (z) => RT - RTH - RP * Math.abs(z); // roof underside

  // ---------- body, foundation, apron ----------
  box("concrete", X0 - 0.04, X1 + 0.04, 0, F1, ZB - 0.04, ZF + 0.04);
  prism("wall", X0, X1, [[ZB, F1], [ZF, F1], [ZF, under(ZF) + 0.02], [0, under(0) + 0.02], [ZB, under(ZB) + 0.02]]);
  box("concrete", X0 - 0.1, XL, 0, 0.1, ZF + 0.04, WZ + 0.25); // apron under the walkway
  for (const [x, z] of [[X0, ZF], [X1, ZF], [X0, ZB], [X1, ZB]]) cbox("trim", x, (F1 + under(z)) / 2, z, 0.1, under(z) - F1, 0.1);
  // siding lines: front and back across the width, ends clipped to the gable line
  for (let y = F1 + 0.3; y < under(ZF) - 0.05; y += 0.3) {
    fz("line", X0, X1, y - 0.008, y + 0.008, ZF + 0.004);
    fz("line", X0, X1, y - 0.008, y + 0.008, ZB - 0.004, -1);
  }
  for (let y = F1 + 0.3; y < under(0) - 0.05; y += 0.3) {
    const zMax = Math.min(ZF, (RT - RTH - y) / RP), zMin = Math.max(ZB, -(RT - RTH - y) / RP);
    fx("line", zMin, zMax, y - 0.008, y + 0.008, X1 + 0.004);
    fx("line", zMin, zMax, y - 0.008, y + 0.008, X0 - 0.004, -1);
  }
  box("trim", X0 - 0.03, X1 + 0.03, F2 - 0.18, F2 - 0.04, ZB - 0.03, ZB + 0.02); // floor band on the back

  // ---------- roof ----------
  for (const s of [-1, 1]) {
    const zo = s * RZ;
    hex("roof", [[RX0, RT, 0], [RX1, RT, 0], [RX1, RT - RP * RZ, zo], [RX0, RT - RP * RZ, zo],
      [RX0, RT - RTH, 0], [RX1, RT - RTH, 0], [RX1, RT - RTH - RP * RZ, zo], [RX0, RT - RTH - RP * RZ, zo]]);
    // standing seams down the slope
    for (let x = RX0 + 0.35; x < RX1 - 0.2; x += 0.45)
      beam("seam", [x, RT + 0.012, s * 0.1], [x, RT - RP * (RZ - 0.04) + 0.012, s * (RZ - 0.04)], 0.035, 0.02, [1, 0, 0]);
    // fascia band on the eave
    hex("trim", [[RX0 - 0.02, RT - RP * RZ + 0.02, zo], [RX1 + 0.02, RT - RP * RZ + 0.02, zo],
      [RX1 + 0.02, RT - RP * RZ - RTH - 0.06, zo], [RX0 - 0.02, RT - RP * RZ - RTH - 0.06, zo],
      [RX0 - 0.02, RT - RP * RZ + 0.02, zo + s * 0.05], [RX1 + 0.02, RT - RP * RZ + 0.02, zo + s * 0.05],
      [RX1 + 0.02, RT - RP * RZ - RTH - 0.06, zo + s * 0.05], [RX0 - 0.02, RT - RP * RZ - RTH - 0.06, zo + s * 0.05]]);
  }
  // barge boards on the gable ends
  for (const x of [RX0 - 0.03, RX1 + 0.03])
    for (const s of [-1, 1]) beam("trim", [x, RT - 0.07, 0], [x, RT - RP * RZ - 0.07, s * RZ], 0.05, 0.16, [1, 0, 0]);
  box("roof", RX0 - 0.03, RX1 + 0.03, RT - 0.02, meta.height, -0.14, 0.14); // ridge cap

  // ---------- walkway (2F) ----------
  box("concrete", X0, XL, F2 - 0.15, F2, ZF, WZ);
  box("trim", X0 - 0.02, XL + 0.02, F2 - 0.2, F2 + 0.02, WZ - 0.02, WZ + 0.04); // edge band
  for (const [z0, z1, x] of [[ZF, WZ, X0 - 0.02], [ZF - 0.02, WZ, XL + 0.02]]) box("trim", x - 0.03, x + 0.03, F2 - 0.2, F2 + 0.02, z0, z1);
  // posts from the apron to the roof
  for (const x of [X0 + 0.05, -1.5, 1.5, X1 - 0.05, XL - 0.05]) cbox("steel", x, (0.1 + under(WZ)) / 2, WZ - 0.06, 0.1, under(WZ) - 0.1, 0.1);
  cbox("steel", XL - 0.05, (0.1 + F2) / 2, ZF + 0.06, 0.1, F2 - 0.1, 0.1); // under the landing's back corner
  beam("steel", [X0, under(WZ) - 0.06, WZ - 0.06], [XL, under(WZ) - 0.06, WZ - 0.06], 0.08, 0.12); // head beam
  // railing: rails and balusters along the front, returns at both ends
  const railRun = (a, b) => {
    const L = Math.hypot(b[0] - a[0], b[2] - a[2]);
    beam("steel", [a[0], F2 + RAIL, a[2]], [b[0], F2 + RAIL, b[2]], 0.06, 0.05);
    beam("steel", [a[0], F2 + 0.12, a[2]], [b[0], F2 + 0.12, b[2]], 0.04, 0.04);
    const n = Math.max(1, Math.round(L / 0.12));
    for (let i = 1; i < n; i++) {
      const t = i / n, x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t;
      cbox("steel", x, F2 + (0.12 + RAIL) / 2, z, 0.022, RAIL - 0.12, 0.022);
    }
  };
  railRun([X0 + 0.03, 0, WZ - 0.06], [XL - 0.03, 0, WZ - 0.06]);
  railRun([X0 + 0.03, 0, ZF + 0.05], [X0 + 0.03, 0, WZ - 0.06]);
  railRun([XL - 0.03, 0, ZF + 0.02], [XL - 0.03, 0, WZ - 0.06]);

  // ---------- stair along the +X end ----------
  const SX0 = 4.62, SX1 = 5.5, SZ0 = ZF - 4.3, NR = 14; // inner and outer stringer, foot
  const rise = (F2 - 0.1) / NR, run = (ZF - SZ0) / (NR - 1);
  const lineY = (z) => 0.1 + (rise * (z - SZ0)) / run; // through the tread nosings minus half a rise
  for (let i = 1; i < NR; i++) {
    const z0 = SZ0 + (i - 1) * run;
    box("steel", SX0 + 0.04, SX1 - 0.04, 0.1 + i * rise - 0.035, 0.1 + i * rise, z0 + 0.02, z0 + run);
  }
  for (const x of [SX0, SX1]) {
    beam("steel", [x, lineY(SZ0) + 0.02, SZ0], [x, lineY(ZF) + 0.02, ZF], 0.06, 0.24); // stringer
    // handrail posts and the rail, 0.9 above the nosings, running into the landing railing
    const hz = (z) => lineY(z) + rise / 2 + 0.9;
    for (const z of [SZ0 + 0.1, SZ0 + 1.5, SZ0 + 2.9, ZF - 0.05]) beam("steel", [x, lineY(z), z], [x, hz(z), z], 0.04, 0.04, [0, 0, 1]);
    beam("steel", [x, hz(SZ0 + 0.05), SZ0 + 0.05], [x, hz(ZF), ZF], 0.05, 0.05);
  }
  box("concrete", SX0 - 0.05, SX1 + 0.05, 0, 0.1, SZ0 - 0.35, SZ0 + 0.2); // foot pad

  // ---------- mailboxes at the foot of the stair, facing +X ----------
  const MX = 5.95, MD = 0.35, NM = units * 2, cols = Math.ceil(NM / 2), mw = 0.25;
  const mz0 = SZ0 + 0.05, mz1 = mz0 + cols * mw;
  for (const z of [mz0 + 0.04, mz1 - 0.04]) cbox("dark", MX - MD / 2, 0.35, z, 0.05, 0.7, 0.05); // legs
  box("concrete", MX - MD, MX, 0.7, 1.3, mz0, mz1);
  for (let r = 0; r < 2; r++)
    for (let k = 0; k < cols; k++) {
      const z = mz0 + k * mw, y = 0.7 + r * 0.3;
      fx("grille", z + 0.015, z + mw - 0.015, y + 0.015, y + 0.285, MX + 0.004); // door
      fx("dark", z + 0.05, z + mw - 0.05, y + 0.2, y + 0.235, MX + 0.008); // slot
      fx("lamp", z + mw - 0.07, z + mw - 0.035, y + 0.07, y + 0.13, MX + 0.008); // name card
    }
  box("trim", MX - MD - 0.02, MX + 0.02, 1.3, 1.34, mz0 - 0.02, mz1 + 0.02); // top cap

  // ---------- units ----------
  const W = (X1 - X0) / units;
  const DW = 0.8, DH = 1.95, WW = 0.7, WH = 0.6;
  for (let i = 0; i < units; i++) {
    const cx = X0 + W * (i + 0.5), dx = cx - W * 0.2, wx = cx + W * 0.2;
    for (const fl of [F1, F2]) {
      const z = ZF;
      // door: frame, leaf, knob, mail slot; lamp on a bracket above
      fz("trim", dx - DW / 2 - 0.06, dx + DW / 2 + 0.06, fl, fl + DH + 0.06, z + 0.01);
      box("door", dx - DW / 2, dx + DW / 2, fl + 0.01, fl + DH, z, z + 0.045);
      cbox("dark", dx + DW / 2 - 0.1, fl + 0.95, z + 0.065, 0.06, 0.06, 0.04);
      fz("dark", dx - 0.15, dx + 0.15, fl + 1.2, fl + 1.24, z + 0.047);
      cbox("trim", dx + DW / 2 + 0.2, fl + DH + 0.22, z + 0.04, 0.05, 0.05, 0.08); // bracket
      cbox("lamp", dx + DW / 2 + 0.2, fl + DH + 0.12, z + 0.11, 0.16, 0.22, 0.12);
      // frosted window with a grille
      const wy = fl + 1.15;
      box("trim", wx - WW / 2 - 0.05, wx + WW / 2 + 0.05, wy - 0.05, wy + WH + 0.05, z, z + 0.03);
      fz("glass", wx - WW / 2, wx + WW / 2, wy, wy + WH, z + 0.035);
      for (let k = 1; k <= 3; k++) fz("grille", wx - WW / 2 + (k * WW) / 4 - 0.012, wx - WW / 2 + (k * WW) / 4 + 0.012, wy - 0.02, wy + WH + 0.02, z + 0.06);
      cbox("trim", wx, wy - 0.06, z + 0.07, WW + 0.14, 0.04, 0.1); // sill / grille rail
      // AC outdoor unit under the window
      const ay = fl === F1 ? 0.1 : F2, az0 = z + 0.08, az1 = az0 + 0.3;
      box("ac", wx - 0.4, wx + 0.4, ay + 0.06, ay + 0.6, az0, az1);
      cbox("dark", wx - 0.4 + 0.08, ay + 0.03, (az0 + az1) / 2, 0.06, 0.06, 0.24);
      cbox("dark", wx + 0.4 - 0.08, ay + 0.03, (az0 + az1) / 2, 0.06, 0.06, 0.24);
      const fc = [wx - 0.1, ay + 0.33, az1 + 0.003], fr = 0.19;
      for (let j = 0; j < 12; j++) {
        const a0 = (j / 12) * Math.PI * 2, a1 = ((j + 1) / 12) * Math.PI * 2;
        tri("dark", fc, [fc[0] + fr * Math.cos(a0), fc[1] + fr * Math.sin(a0), fc[2]], [fc[0] + fr * Math.cos(a1), fc[1] + fr * Math.sin(a1), fc[2]], [fc[0], fc[1], fc[2] - 1]);
      }
      for (let k = -2; k <= 2; k++) fz("dark", wx + 0.17, wx + 0.34, fc[1] + k * 0.08 - 0.012, fc[1] + k * 0.08 + 0.012, az1 + 0.003);
      cbox("ac", wx - 0.1, fc[1], az1 + 0.012, 0.06, 0.06, 0.02); // hub
    }
    // back: one sash window per unit and floor
    for (const fl of [F1, F2]) {
      const bx = -cx, y0 = fl + 0.8, bw = Math.min(1.6, W * 0.6), bh = 1.1;
      box("trim", bx - bw / 2 - 0.05, bx + bw / 2 + 0.05, y0 - 0.05, y0 + bh + 0.05, ZB - 0.03, ZB);
      fz("glass", bx - bw / 2, bx + bw / 2, y0, y0 + bh, ZB - 0.035, -1);
      cbox("trim", bx, y0 + bh / 2, ZB - 0.05, 0.05, bh, 0.02);
    }
  }
  // -X end: one small window per floor
  for (const fl of [F1, F2]) {
    box("trim", X0 - 0.03, X0, fl + 1.1, fl + 1.8, -0.5, 0.3);
    fx("glass", -0.45, 0.25, fl + 1.15, fl + 1.75, X0 - 0.035, -1);
  }

  // ---------- meshes ----------
  // [base, shade, threshold, hull px (0 = none)]; equal looks share one mesh.
  const G = -0.25;
  const wallT = night ? 0.35 : 0.1;
  const MAT = {
    wall: [c.wall, c.wallShade, wallT, 5],
    line: [c.line, c.lineShade, wallT, 0],
    roof: [c.roof, c.roofShade, 0.25, 5],
    seam: [c.seam, c.seam, G, 0],
    trim: [c.trim, c.trim, G, 2.5],
    grille: [c.trim, c.trim, G, 0],
    door: [c.door, c.doorShade, 0.1, 2.5],
    steel: [c.steel, c.steelShade, 0.1, 2],
    glass: night ? [c.glass, c.glass, G, 0] : [c.glass, c.glassShade, 0.1, 0],
    lamp: [c.lamp, c.lamp, G, 2],
    concrete: [c.concrete, c.concreteShade, 0.1, 3],
    ac: [c.concrete, c.concreteShade, 0.1, 2.5],
    dark: [c.dark, c.dark, G, 0],
  };
  const groups = {};
  for (const [key, arr] of Object.entries(soups)) {
    const g = (groups[MAT[key].join("|")] ??= { m: MAT[key], keys: [], p: [] });
    g.keys.push(key), g.p.push(...arr);
  }
  for (const { m: [base, shade, threshold, px], keys, p } of Object.values(groups)) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = keys.join("+");
    shift.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
