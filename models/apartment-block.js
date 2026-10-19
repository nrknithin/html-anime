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
//   STAIR     an external switchback steel stair along the +X end wall: flight 1 (outer lane) climbs from its foot at
//             the street end to a mid landing at the back, flight 2 (against the wall) climbs back onto the walkway
//             landing. Channel stringers, open treads, handrails on posts on both sides, a railed mid landing on posts.
//   UNITS     per unit and floor: a steel door in a frame (knob, mail slot), a door lamp on a bracket above it, a small
//             frosted window with a grille, an AC outdoor unit (fan disc, grille bars) under the window; the 2F set
//             stands on the walkway, the 1F set on the apron. Back walls get one sash window per unit and floor, the
//             -X end one small window per floor. A bank of mailboxes (one per unit, two rows) on legs under the landing,
//             beside the stair foot, facing the street.
//   Every triangle is wound away from a point inside its solid (box centre, prism centroid, a point behind a flat
//   quad), never by hand.
// Proportions (real size, base unit the storey S = 2.7 m): walls 9.0 x 4.8, walkway 1.2 deep, overall ~10.4 x 6.8 at
//   the eaves; 1F floor 0.4, 2F floor 3.1, eave 5.65, ridge cap top 6.2 (2.3 S); doors 0.8 x 1.95, windows 0.7 x 0.6,
//   railing 1.0, stair lanes 0.84 wide, 2 x 7 risers of 0.21 on 0.3 m treads (35 deg), mid landing 0.9 deep at 1.6,
//   mailboxes 0.2 x 0.3 x 0.32 each.
// Options: build(THREE, kit, colors, { height = 6.2, units = 4, night = false }).
//   height  scales the whole building uniformly (the ridge cap's top).
//   units   doors per floor, 2-4 (clamped); unit width 9 / units.
//   night   the sun goes off, still on noon: every part that is not a practical sits flat in its shade (threshold 2):
//           roof and doors hair, steel sclera, concrete sky; the siding goes wallNight iris #5c3d32 flat with hair lines
//           (its day shade, skin, is too close to sky to read as night); door lamps and frosted windows glow practical.
// Colours (noon): siding sky #f2d7ae / skin #f0c2ae (threshold 0.1, so the street face stays lit) with iris
//   #5c3d32 siding lines and corner trims; roof iris / hair #241c16 (0.25) with hair seams; doors iris / hair; steel
//   (stair, railing, posts) moon #fff6e4 / sclera #f6f3ee with ink; walkway edge band, frames, grilles iris flat;
//   frosted glass sclera / sky by day, practical #fffaf2 at night; lamps sclera / practical; concrete and AC units
//   sclera / sky; fan discs and slots hair.

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
    glass: "#f6f3ee", glassShade: "#f2d7ae",
    lamp: "#f6f3ee",
    glow: "#fffaf2",
    wallNight: "#5c3d32",
    concrete: "#f6f3ee", concreteShade: "#f2d7ae",
    dark: "#241c16",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height, night = false } = opts;
  const units = Math.max(2, Math.min(4, Math.round(opts.units ?? 4)));
  const c = colors;
  const root = new THREE.Group();
  root.name = "apartment-block";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / meta.height);
  root.add(body);
  const shift = new THREE.Group(); // centres the bbox (the stair and mailboxes stick out on +X)
  shift.position.x = -0.73;
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
  const XL = 5.5; // the landing's +X edge (over the stair's inner lane)
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
  beam("steel", [X0, under(WZ) - 0.06, WZ - 0.06], [XL, under(WZ) - 0.06, WZ - 0.06], 0.08, 0.12); // head beam
  // railing: rails and balusters from a to b on a floor at y0
  const railRun = (a, b, y0 = F2) => {
    const L = Math.hypot(b[0] - a[0], b[2] - a[2]);
    beam("steel", [a[0], y0 + RAIL, a[2]], [b[0], y0 + RAIL, b[2]], 0.06, 0.05);
    beam("steel", [a[0], y0 + 0.12, a[2]], [b[0], y0 + 0.12, b[2]], 0.04, 0.04);
    const n = Math.max(1, Math.round(L / 0.12));
    for (let i = 1; i < n; i++) {
      const t = i / n, x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t;
      cbox("steel", x, y0 + (0.12 + RAIL) / 2, z, 0.022, RAIL - 0.12, 0.022);
    }
  };
  railRun([X0 + 0.03, 0, WZ - 0.06], [XL - 0.03, 0, WZ - 0.06]);
  railRun([X0 + 0.03, 0, ZF + 0.05], [X0 + 0.03, 0, WZ - 0.06]);
  railRun([XL - 0.03, 0, ZF + 0.02], [XL - 0.03, 0, WZ - 0.06]);

  // ---------- switchback stair along the +X end ----------
  // Flight 1 (outer lane) climbs from the street end toward the back to a mid landing; flight 2 (inner lane, against
  // the wall) climbs back toward the street onto the walkway landing. 7 risers each, 0.3 m treads.
  const NR = 7, rise = (F2 - 0.1) / (2 * NR), run = 0.3, FLEN = (NR - 1) * run;
  const IN = [4.6, 5.44], OUT = [5.6, 6.44]; // stringer x of each lane
  const MZ0 = ZF - FLEN - 0.9, MZ1 = ZF - FLEN, MY = 0.1 + NR * rise; // mid landing
  // a flight from its foot at z = zf, climbing in direction dir from y0, between stringers xa and xb
  function flight([xa, xb], zf, dir, y0) {
    for (let i = 1; i < NR; i++) {
      const z0 = zf + dir * (i - 1) * run, z1 = zf + dir * i * run;
      box("steel", xa + 0.04, xb - 0.04, y0 + i * rise - 0.035, y0 + i * rise, Math.min(z0, z1) + 0.01, Math.max(z0, z1) - 0.01);
    }
    const ly = (z) => y0 + (rise * dir * (z - zf)) / run; // half a rise under the nosings
    const ze = zf + dir * FLEN;
    for (const x of [xa, xb]) {
      beam("steel", [x, ly(zf) + 0.02, zf], [x, ly(ze) + 0.02, ze], 0.06, 0.24); // stringer
      const hz = (z) => ly(z) + rise / 2 + 0.9;
      for (const t of [0.04, 0.5, 0.96]) {
        const z = zf + dir * FLEN * t;
        beam("steel", [x, ly(z), z], [x, hz(z), z], 0.04, 0.04, [0, 0, 1]); // handrail posts
      }
      beam("steel", [x, hz(zf + dir * 0.04 * FLEN), zf + dir * 0.04 * FLEN], [x, hz(ze), ze], 0.05, 0.05); // handrail
    }
  }
  flight(OUT, ZF, -1, 0.1);
  flight(IN, MZ1, 1, MY);
  box("steel", IN[0], OUT[1], MY - 0.12, MY, MZ0, MZ1); // mid landing
  box("trim", IN[0] - 0.01, OUT[1] + 0.01, MY - 0.18, MY - 0.1, MZ0 - 0.02, MZ0 + 0.03);
  for (const [x, z] of [[OUT[1] - 0.04, MZ0 + 0.04], [OUT[1] - 0.04, MZ1 - 0.04], [IN[0] + 0.05, MZ0 + 0.04]])
    cbox("steel", x, (0.1 + MY - 0.12) / 2, z, 0.08, MY - 0.22, 0.08);
  railRun([IN[0] + 0.03, 0, MZ0 + 0.03], [OUT[1], 0, MZ0 + 0.03], MY);
  railRun([OUT[1], 0, MZ0 + 0.03], [OUT[1], 0, MZ1], MY);
  box("concrete", OUT[0] - 0.05, OUT[1] + 0.05, 0, 0.1, ZF - 0.2, ZF + 0.45); // foot pad

  // ---------- mailboxes beside the stair foot, under the landing, facing the street ----------
  const MW = 0.2, cols = units, MZ = WZ - 0.35, MD = 0.32;
  const mx0 = (IN[0] + IN[1]) / 2 - (cols * MW) / 2, mx1 = mx0 + cols * MW;
  for (const x of [mx0 + 0.04, mx1 - 0.04]) cbox("dark", x, 0.4, MZ - MD / 2, 0.05, 0.6, 0.05); // legs
  box("concrete", mx0, mx1, 0.7, 1.3, MZ - MD, MZ);
  for (let r = 0; r < 2; r++)
    for (let k = 0; k < cols; k++) {
      const x = mx0 + k * MW, y = 0.7 + r * 0.3;
      fz("grille", x + 0.015, x + MW - 0.015, y + 0.015, y + 0.285, MZ + 0.004); // door
      fz("dark", x + 0.04, x + MW - 0.04, y + 0.2, y + 0.235, MZ + 0.008); // slot
      fz("card", x + MW - 0.07, x + MW - 0.035, y + 0.07, y + 0.13, MZ + 0.008); // name card
    }
  box("trim", mx0 - 0.02, mx1 + 0.02, 1.3, 1.34, MZ - MD - 0.02, MZ + 0.02); // top cap

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
  // night: the sun is off, so every part that is not a practical sits flat in its shade (threshold 2)
  const G = -0.25, T = (t) => (night ? 2 : t);
  const MAT = {
    wall: night ? [c.wallNight, c.wallNight, 2, 5] : [c.wall, c.wallShade, 0.1, 5],
    line: night ? [c.seam, c.seam, 2, 0] : [c.line, c.lineShade, 0.1, 0],
    roof: [c.roof, c.roofShade, T(0.25), 5],
    seam: [c.seam, c.seam, G, 0],
    trim: [c.trim, c.trim, G, 2.5],
    grille: [c.trim, c.trim, G, 0],
    door: [c.door, c.doorShade, T(0.1), 2.5],
    steel: [c.steel, c.steelShade, T(0.1), 2],
    card: [c.steel, c.steelShade, T(0.1), 0],
    glass: night ? [c.glow, c.glow, G, 0] : [c.glass, c.glassShade, 0.1, 0],
    lamp: night ? [c.glow, c.glow, G, 2] : [c.lamp, c.lamp, G, 2],
    concrete: [c.concrete, c.concreteShade, T(0.1), 3],
    ac: [c.concrete, c.concreteShade, T(0.1), 2.5],
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
