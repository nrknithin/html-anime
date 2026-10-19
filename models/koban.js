// koban.js - a Japanese neighbourhood police box (koban) on its street corner, static.
// Contract: harness/lab/README.md. Meters, +Y up, the street / entrance side faces +Z, its left is +X (the bicycle
// side), stands on y = 0, centred on x = 0, z = 0.
//
// Construction (boxes, beams, one swept roof slab, a lathe globe and tori, all triangle soups merged per material;
// boxes are flat-shaded, the globe and the tyres carry smooth normals):
//   BODY     a hollow one-room box on a stone plinth: back wall, two side walls and a front frame of corner pillars,
//            a glass bay and an open doorway. The interior (floor, inner walls, ceiling) is a lining of its own one
//            dark tone, so the street sees "a room behind glass", and a steel desk and a birch chair read through it.
//            A side window on the +X wall shows the same dark room.
//   ROOF     one curved mono-pitch slab: top y = 3.55 + 0.75 t^1.6 front-to-back (t = 0 at the back eave), so it sweeps
//            up into a deep canopy over the entrance; 28 cm thick, a pale fascia band along its front lip.
//   GLASS    no panes (a pane would hide the room): the bay is a dark-wood mullion grid, with pale diagonal glint
//            strips on the glass plane, the anime shorthand for glass.
//   LAMP     the identity cue: a red globe (r 0.24 m, 1/18 of the height) on a dark L-bracket above the doorway, under the
//            canopy, with a dark cap and a pale highlight. Day threshold -0.15 keeps most of it red; at night it is flat red (glowing).
//   FRONT    a step slab before the doorway, a blank vertical sign plate on the wall beside it, a standing notice board
//            (two blank paper panels under a little ridge cap) on the -X side, a parked white step-through bicycle
//            (mamachari: tyres, fenders, basket, rear carrier, kickstand) along the +X wall, front wheel to the street,
//            authored in its own frame and placed by B(), so it shows its profile in the hero view.
//   Every triangle is wound away from a point inside its solid (centre of a box, axis of a tube, behind a quad).
// Proportions (real size; base unit the storey S = 3.3 m): walls 4.0 x 4.0 (x -2..2, z -2.3..1.7); plinth 0.18;
//   glass bay 1.9 x 2.1 from 0.45, doorway 1.0 x 2.25; roof 4.7 x 5.0, back eave 3.55, front lip 4.30 (= height);
//   lamp centre 3.0, 0.55 m out of the wall; notice board 1.0 x 0.8 panel, top 1.85; bicycle 26" wheels, 1.1 m base.
// Options: build(THREE, kit, colors, { height, night }).
//   height  scales everything uniformly (default 4.30, the roof's front lip).
//   night   the lamp and the room glow: lamp accent / accent and the lining practical / practical at threshold -0.25
//           (every face lit), glints off. Same script; the film darkens the world around it.
// Colours (noon, as the house and torii): plaster moon #fff6e4 / sky #f2d7ae; wood and roof (pillars, mullions, slab,
// board frame, bracket, tyres) iris #5c3d32 / hair #241c16 (hair as the canopy underside, the eave shadow, and small shade, as on the house); stone sky /
// skin #f0c2ae; interior lining iris / hair by day, practical #fffaf2 at night; steel (desk, bicycle) sclera #f6f3ee /
// sky; paper (sign plate, notice panels, fascia band, glints) practical / sclera; lamp accent #c4452d / iris; glints and the lamp highlight practical, unshaded and uninked.
// Pale parts use threshold 0.1 so walls square to the camera stay lit (front dot 0.30).

export const meta = {
  name: "koban",
  height: 4.3,
  script: "noon",
  colors: {
    plaster: "#fff6e4", plasterShade: "#f2d7ae",
    wood: "#5c3d32", woodShade: "#241c16",
    stone: "#f2d7ae", stoneShade: "#f0c2ae",
    room: "#5c3d32", roomShade: "#241c16",
    roomLit: "#fffaf2",
    steel: "#f6f3ee", steelShade: "#f2d7ae",
    paper: "#fffaf2", paperShade: "#f6f3ee",
    lamp: "#c4452d", lampShade: "#5c3d32",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, night = false } = opts;
  const root = new THREE.Group();
  root.name = "koban";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / meta.height);
  root.add(body);
  const joints = {};

  // ---------- triangle soups (flat normals unless given) ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  function tri(key, a, b, e, ref, na, nb, ne) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-10) return;
    const m = mul(add(add(a, b), e), 1 / 3);
    const flip = dot(n, sub(m, ref)) < 0;
    n = nrm(flip ? mul(n, -1) : n);
    const s = S(key);
    const [B, NB, E, NE] = flip ? [e, ne, b, nb] : [b, nb, e, ne];
    for (const [q, nq] of [[a, na], [B, NB], [E, NE]]) s.p.push(...q), s.n.push(...(nq ?? n));
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
  // a square beam from a to b, w wide, its width across `up` x direction
  function beam(key, a, b, w, h = w, up = [0, 1, 0]) {
    const d = sub(b, a);
    let s = cross(d, up);
    if (Math.hypot(...s) < 1e-9) s = cross(d, [1, 0, 0]);
    s = nrm(s);
    const u = nrm(cross(s, d));
    const P = (o, i, j) => add(o, add(mul(s, (i * w) / 2), mul(u, (j * h) / 2)));
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  const path = (key, pts, w) => { for (let i = 0; i + 1 < pts.length; i++) beam(key, pts[i], pts[i + 1], w); };
  // a flat quad on the plane z = const (or x = const), visible from the side `dir` points to
  const zquad = (key, x0, x1, y0, y1, z, dir = 1) => quad(key, [x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [0, 0, z - dir]);
  const xquad = (key, x, z0, z1, y0, y1, dir = 1) => quad(key, [x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0], [x - dir, 0, 0]);
  // sphere (smooth), wound away from its centre
  function ball(key, C, r, n = 14, m = 9) {
    const P = (i, j) => {
      const th = (j / m) * Math.PI, ph = (i / n) * Math.PI * 2;
      const d = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
      return [add(C, mul(d, r)), d];
    };
    for (let j = 0; j < m; j++)
      for (let i = 0; i < n; i++) {
        const [a, na] = P(i, j), [b, nb] = P(i + 1, j), [e, ne] = P(i + 1, j + 1), [d, nd] = P(i, j + 1);
        tri(key, a, b, e, C, na, nb, ne);
        tri(key, a, e, d, C, na, ne, nd);
      }
  }
  // torus (a tyre) round centre C in the plane of unit axes e1, e2; ring radius R, tube r; smooth
  function torus(key, C, e1, e2, R, r, n = 22, m = 6) {
    const e3 = cross(e1, e2);
    const P = (i, j) => {
      const a = (i / n) * Math.PI * 2, b = (j / m) * Math.PI * 2;
      const radial = add(mul(e1, Math.cos(a)), mul(e2, Math.sin(a)));
      const ax = add(C, mul(radial, R));
      const d = add(mul(radial, Math.cos(b)), mul(e3, Math.sin(b)));
      return [add(ax, mul(d, r)), d, ax];
    };
    for (let i = 0; i < n; i++)
      for (let j = 0; j < m; j++) {
        const [a, na, ax] = P(i, j), [b, nb, ax1] = P(i + 1, j), [e, ne] = P(i + 1, j + 1), [d, nd] = P(i, j + 1);
        const ref = mul(add(ax, ax1), 0.5);
        tri(key, a, b, e, ref, na, nb, ne);
        tri(key, a, e, d, ref, na, ne, nd);
      }
  }

  // ---------- body ----------
  const X0 = -2.0, X1 = 2.0, ZB = -2.3, ZF = 1.7, FY = 0.18, T = 0.15; // walls, plinth top, wall thickness
  const RZ0 = -2.6, RZ1 = 2.4, RX = 2.35, RT = 0.28; // roof extent and thickness
  const roofTop = (z) => 3.55 + 0.75 * Math.pow(Math.max(0, (z - RZ0) / (RZ1 - RZ0)), 1.6);
  const wallTop = (z) => roofTop(z) - RT + 0.1;
  box("stone", X0 - 0.12, X1 + 0.12, 0, FY, ZB - 0.12, ZF + 0.12); // plinth
  box("stone", -0.1, 1.7, 0, 0.09, ZF + 0.12, ZF + 0.6); // step before the doorway
  // back and side walls (tops follow the roof underside, sunk into the slab)
  box("plaster", X0, X1, FY, wallTop(ZB), ZB, ZB + T);
  for (const [a, b] of [[X0, X0 + T], [X1 - T, X1]]) {
    const z0 = ZB, z1 = ZF, y0 = FY, t0 = wallTop(z0), t1 = wallTop(z1);
    hex("plaster", [[a, y0, z0], [b, y0, z0], [b, y0, z1], [a, y0, z1], [a, t0, z0], [b, t0, z0], [b, t1, z1], [a, t1, z1]]);
  }
  // front: corner pillars, glass bay, door pillar, doorway, sign wall, transom wall
  const FZ = ZF, top = wallTop(ZF);
  const GX0 = -1.76, GX1 = 0.15, GY0 = 0.45, GY1 = 2.37; // glass bay (its head is the door head rail)
  const DX0 = 0.3, DX1 = 1.3, DY1 = 2.43; // doorway
  box("wood", X0 - 0.03, X0 + 0.24, FY, top, FZ - 0.2, FZ + 0.05);
  box("wood", X1 - 0.24, X1 + 0.03, FY, top, FZ - 0.2, FZ + 0.05);
  box("plaster", GX0, GX1, FY, GY0, FZ - T, FZ); // sill wall
  box("wood", GX0, GX1, GY0 - 0.05, GY0, FZ - 0.17, FZ + 0.03); // sill
  box("wood", GX1, DX0, FY, DY1, FZ - 0.17, FZ + 0.03); // door pillar
  box("plaster", DX1, X1 - 0.24, FY, DY1, FZ - T, FZ); // sign wall
  box("plaster", X0 + 0.24, X1 - 0.24, DY1, top, FZ - T, FZ); // transom wall (over bay and door)
  box("wood", X0 + 0.24, X1 - 0.24, DY1 - 0.06, DY1, FZ - 0.17, FZ + 0.03); // head rail
  // mullion grid: frame, one mullion, one transom bar
  const MZ0 = FZ - 0.09, MZ1 = FZ - 0.03;
  box("wood", GX0, GX1, GY1 - 0.05, GY1, MZ0, MZ1);
  box("wood", GX0, GX0 + 0.05, GY0, GY1, MZ0, MZ1);
  box("wood", GX1 - 0.05, GX1, GY0, GY1, MZ0, MZ1);
  box("wood", -0.83, -0.78, GY0, GY1, MZ0, MZ1);
  box("wood", GX0, GX1, 1.98, 2.02, MZ0, MZ1);
  // door frame: the sliding leaf stands open behind the sign wall, its edge showing
  box("wood", DX1 - 0.06, DX1, FY, DY1, FZ - 0.17, FZ + 0.03);
  box("wood", DX0, DX1, FY, FY + 0.03, FZ - 0.17, FZ + 0.02); // threshold rail
  // glints on the glass plane (z = FZ - 0.06)
  if (!night) {
    const GZ = FZ - 0.05;
    for (const [x, w, y0] of [[-1.55, 0.16, 0.8], [-1.25, 0.07, 0.8], [-0.55, 0.12, 1.1]]) {
      const h = 0.9, k = 0.45;
      quad("glint", [x, y0, GZ], [x + w, y0, GZ], [x + w + k, y0 + h, GZ], [x + k, y0 + h, GZ], [0, 0, GZ - 1]);
    }
  }
  // sign plate: blank, vertical, on the sign wall
  box("wood", 1.4, 1.68, 1.0, 2.25, FZ, FZ + 0.03);
  box("paper", 1.43, 1.65, 1.03, 2.22, FZ + 0.03, FZ + 0.05);

  // side window on the +X wall: a wood frame round a dark pane (the room), one mullion, one glint
  box("wood", X1 - 0.02, X1 + 0.04, 1.15, 2.35, -1.75, -0.35);
  box("wood", X1 - 0.02, X1 + 0.1, 1.08, 1.15, -1.82, -0.28); // sill
  xquad("room", X1 + 0.045, -1.68, -0.42, 1.22, 2.28, 1);
  box("wood", X1 + 0.04, X1 + 0.07, 1.22, 2.28, -1.07, -1.03);
  if (!night) quad("glint", [X1 + 0.05, 1.4, -1.55], [X1 + 0.05, 1.4, -1.45], [X1 + 0.05, 2.1, -1.2], [X1 + 0.05, 2.1, -1.3], [X1, 1.7, -1.4]);

  // ---------- interior lining ----------
  const room = "room", IX0 = X0 + T + 0.005, IX1 = X1 - T - 0.005, IZ0 = ZB + T + 0.005, IY0 = FY + 0.005;
  const iTop = wallTop(ZB) - 0.2;
  zquad(room, IX0, IX1, IY0, iTop, IZ0, 1); // back wall face
  xquad(room, IX0, IZ0, FZ - T - 0.005, IY0, iTop, 1); // -X wall, seen from +X
  xquad(room, IX1, IZ0, FZ - T - 0.005, IY0, iTop, -1);
  quad(room, [IX0, IY0, IZ0], [IX1, IY0, IZ0], [IX1, IY0, FZ - 0.01], [IX0, IY0, FZ - 0.01], [0, IY0 - 1, 0]); // floor
  quad(room, [IX0, iTop, IZ0], [IX1, iTop, IZ0], [IX1, iTop, FZ - T], [IX0, iTop, FZ - T], [0, iTop + 1, 0]); // ceiling
  zquad(room, IX0, IX1, DY1, iTop, FZ - T - 0.005, -1); // inner face of the transom wall
  // the open sliding leaf, parked behind the sign wall: its glass is a dark slot with a wood edge
  // steel desk facing the street, a wooden chair pulled out beside it
  const dx = -0.85, dz = 0.75;
  box("steel", dx - 0.55, dx + 0.55, 0.69, 0.73, dz - 0.32, dz + 0.32); // top
  box("steel", dx - 0.53, dx - 0.12, FY, 0.69, dz - 0.3, dz + 0.3); // pedestal
  box("steel", dx - 0.12, dx + 0.53, 0.45, 0.69, dz + 0.26, dz + 0.29); // modesty panel
  box("steel", dx + 0.48, dx + 0.53, FY, 0.69, dz - 0.3, dz + 0.3); // end panel
  for (const y of [0.33, 0.5]) box("wood", dx - 0.12, dx - 0.08, y - 0.01, y + 0.01, dz + 0.3, dz + 0.31); // drawer pulls
  const cx = 0.1, cz = 0.55;
  box("stone", cx - 0.2, cx + 0.2, 0.44, 0.48, cz - 0.2, cz + 0.2); // seat
  box("stone", cx - 0.2, cx + 0.2, 0.62, 0.9, cz - 0.22, cz - 0.19); // back
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box("stone", cx + sx * 0.18 - 0.02, cx + sx * 0.18 + 0.02, FY, 0.44, cz + sz * 0.18 - 0.02, cz + sz * 0.18 + 0.02);
  for (const sx of [-1, 1]) box("stone", cx + sx * 0.18 - 0.02, cx + sx * 0.18 + 0.02, 0.48, 0.9, cz - 0.215, cz - 0.195);

  // ---------- roof: one curved slab ----------
  const NZ = 16;
  const zs = Array.from({ length: NZ + 1 }, (_, i) => RZ0 + ((RZ1 - RZ0) * i) / NZ);
  for (let i = 0; i < NZ; i++) {
    const za = zs[i], zb = zs[i + 1], ya = roofTop(za), yb = roofTop(zb);
    const r = [0, (ya + yb) / 2 - RT / 2, (za + zb) / 2]; // a point inside the slab here
    quad("wood", [-RX, ya, za], [RX, ya, za], [RX, yb, zb], [-RX, yb, zb], r); // top
    quad("wood", [-RX, ya - RT, za], [RX, ya - RT, za], [RX, yb - RT, zb], [-RX, yb - RT, zb], r); // underside
    for (const x of [-RX, RX]) quad("wood", [x, ya - RT, za], [x, yb - RT, zb], [x, yb, zb], [x, ya, za], r); // ends
  }
  for (const z of [RZ0, RZ1]) {
    const y = roofTop(z);
    quad("wood", [-RX, y - RT, z], [RX, y - RT, z], [RX, y, z], [-RX, y, z], [0, y - RT / 2, 0]); // back and front lips
  }
  // pale fascia band on the front lip
  const yl = roofTop(RZ1);
  box("paper", -RX - 0.01, RX + 0.01, yl - RT + 0.06, yl - 0.08, RZ1 - 0.02, RZ1 + 0.015);

  // ---------- the red lamp ----------
  const LX = (DX0 + DX1) / 2, LY = 3.0, LZ = FZ + 0.55, LR = 0.24;
  box("wood", LX - 0.09, LX + 0.09, LY + 0.26, LY + 0.54, FZ, FZ + 0.04); // wall plate
  beam("wood", [LX, LY + 0.42, FZ + 0.02], [LX, LY + 0.42, LZ], 0.06); // arm
  beam("wood", [LX, LY + 0.45, LZ], [LX, LY + LR, LZ], 0.05); // drop
  box("wood", LX - 0.1, LX + 0.1, LY + LR - 0.04, LY + LR + 0.03, LZ - 0.1, LZ + 0.1); // cap
  beam("wood", [LX, LY + 0.42, FZ + 0.28], [LX, LY + 0.26, FZ + 0.04], 0.035); // brace
  ball("lamp", [LX, LY, LZ], LR);
  ball("glint", [LX + 0.085, LY + 0.1, LZ + 0.18], 0.05, 8, 6); // highlight
  box("wood", LX - 0.04, LX + 0.04, LY - LR - 0.05, LY - LR + 0.02, LZ - 0.04, LZ + 0.04); // bottom finial

  // ---------- notice board (blank), on the -X side ----------
  const bx = -2.75, bz = 2.2;
  for (const s of [-1, 1]) box("wood", bx + s * 0.45 - 0.03, bx + s * 0.45 + 0.03, 0, 1.75, bz - 0.03, bz + 0.03);
  box("wood", bx - 0.52, bx + 0.52, 0.95, 1.75, bz - 0.025, bz + 0.025);
  for (const s of [-1, 1]) box("paper", bx + s * 0.235 - 0.2, bx + s * 0.235 + 0.2, 1.01, 1.69, bz + 0.025, bz + 0.035);
  hex("wood", [[bx - 0.6, 1.75, bz - 0.12], [bx + 0.6, 1.75, bz - 0.12], [bx + 0.6, 1.75, bz + 0.12], [bx - 0.6, 1.75, bz + 0.12],
    [bx - 0.6, 1.86, bz - 0.01], [bx + 0.6, 1.86, bz - 0.01], [bx + 0.6, 1.86, bz + 0.01], [bx - 0.6, 1.86, bz + 0.01]]);
  box("stone", bx - 0.55, bx + 0.55, 0, 0.06, bz - 0.15, bz + 0.15); // footing

  // ---------- white bicycle, parked along the +X wall, front wheel to +Z ----------
  // authored in its own frame (u forward from the rear hub, y up, w to the bike's left), placed by B()
  const BX = 2.42, BZ = -0.2, wr = 0.33, wy = wr + 0.02, FU = 1.1;
  const B = (u, y, w = 0) => [BX - w, y, BZ + u];
  const bbox = (key, u0, u1, y0, y1, w0, w1) =>
    hex(key, [B(u0, y0, w0), B(u1, y0, w0), B(u1, y0, w1), B(u0, y0, w1), B(u0, y1, w0), B(u1, y1, w0), B(u1, y1, w1), B(u0, y1, w1)]);
  for (const u of [0, FU]) {
    torus("wood", B(u, wy), [0, 0, 1], [0, 1, 0], wr - 0.02, 0.025);
    bbox("steel", u - 0.03, u + 0.03, wy - 0.03, wy + 0.03, -0.05, 0.05); // hub
    const fp = []; // fender: an arc over the top half
    for (let k = 0; k <= 6; k++) { const a = Math.PI * (0.1 + 0.8 * (k / 6)); fp.push(B(u + Math.cos(a) * (wr + 0.04), wy + Math.sin(a) * (wr + 0.04))); }
    path("steel", fp, 0.05);
  }
  const BB = B(0.45, 0.3), ST = B(0.31, 0.86), HB = B(0.95, 0.74), HT = B(0.91, 0.96);
  path("steel", [BB, B(0.65, 0.36), HB], 0.045); // low step-through down tube
  beam("steel", BB, ST, 0.04); // seat tube
  beam("steel", HB, HT, 0.05); // head tube
  beam("steel", HB, B(FU, wy), 0.035); // fork
  beam("steel", BB, B(0, wy), 0.03); // chain stay
  beam("steel", B(0.35, 0.72), B(0, wy), 0.03); // seat stay
  bbox("steel", 0.39, 0.55, 0.22, 0.38, -0.02, 0.07); // chain guard / crank
  bbox("wood", 0.18, 0.44, 0.88, 0.95, -0.08, 0.08); // saddle
  beam("steel", HT, B(0.89, 1.07), 0.035); // stem
  path("steel", [B(0.77, 1.06, -0.3), B(0.89, 1.08, -0.18), B(0.89, 1.08, 0.18), B(0.77, 1.06, 0.3)], 0.03); // bars
  for (const sw of [-1, 1]) bbox("wood", 0.7, 0.81, 1.03, 1.08, sw * 0.3 - 0.025, sw * 0.3 + 0.025); // grips
  bbox("steel", 1.07, 1.41, 0.82, 1.06, -0.17, 0.17); // front basket
  bbox("wood", 1.09, 1.39, 1.0, 1.065, -0.15, 0.15); // basket opening (dark inside)
  path("steel", [B(-0.23, 0.76), B(0.33, 0.76)], 0.06); // rear carrier
  beam("steel", B(-0.15, 0.76), B(0, wy), 0.02);
  beam("steel", B(0.15, 0.3, -0.06), B(0, 0.015, -0.1), 0.03); // kickstand

  // ---------- meshes ----------
  const MAT = {
    plaster: [c.plaster, c.plasterShade, 0.1, true],
    wood: [c.wood, c.woodShade, 0.1, true],
    stone: [c.stone, c.stoneShade, 0.1, true],
    room: night ? [c.roomLit, c.roomLit, -0.25, false] : [c.room, c.roomShade, 0.1, false],
    steel: [c.steel, c.steelShade, 0.1, true],
    paper: [c.paper, c.paperShade, 0.1, true],
    glint: [c.paper, c.paper, -1, false],
    lamp: night ? [c.lamp, c.lamp, -0.25, true] : [c.lamp, c.lampShade, -0.15, true],
  };
  for (const [key, s] of Object.entries(soups)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    const mesh = kit.toon(g, base, shade, { threshold, outline });
    mesh.name = key;
    body.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
