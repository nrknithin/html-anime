// konbini.js - a one-storey Japanese convenience store front (the anime street corner at any hour), static.
// Contract: harness/lab/README.md. Meters, +Y up, the shop front faces +Z (the street), its left is +X (the door
// side), stands on y = 0, centred on x = 0, z = 0.
//
// Construction (boxes, flat quads and a few swept tubes, all triangle soups merged per material; boxes flat-shaded):
//   SHELL   a plinth, two side walls and a back wall, a flat roof slab; a tall fascia band wrapping the front and both
//           sides (two stripes, a dark coping on top, no lettering); a thin canopy under it over the pavement, its
//           soffit set with square downlights (practicals).
//   FRONT   full-width glazing: a dark kick plate, a header, mullions; NO glass pane (a pane would hide the shop), the
//           glass is told by diagonal glints on the pane plane. An automatic two-leaf sliding door on the +X side with
//           its sensor box and a mat.
//   INSIDE  floor, ceiling with light strips, a lining on the walls, a low magazine rack along the window, two
//           gondolas stocked with rows of coloured product blocks, the till counter with registers and a hot-food case
//           in front of a cigarette wall (-X side), an ATM and a copy machine by the door (+X), lit drink coolers along
//           the back wall.
//   OUTSIDE a row of four recycling bins (coloured lids, dark slots) under the canopy, a bicycle rack of inverted-U
//           hoops at the kerb, two drink vending machines against the +X wall (so the side the hero view sees is not
//           blank), a downpipe, an AC unit with a fan grille on the roof.
//   Every triangle is wound away from a point inside its solid (box centre, tube axis, a point behind a flat quad).
// Proportions (real size, base unit the storey S = 2.8 m, the glazing head): plan 10.0 x 7.8 (walls), fascia
//   2.95-3.95 (0.36 S, the identity band), canopy 2.78-2.9 projecting 1.1 m, roof slab 3.55, AC unit top 4.2;
//   door 1.8 wide x 2.35, vending machines 1.75 x 1.0 x 0.75, gondolas 1.35 / 1.6 tall, counter 1.0, coolers 2.2, bins 0.95, rack hoops 0.8.
// Options: build(THREE, kit, colors, { height = 4.2, night = false }).
//   height  scales the whole store uniformly (the AC unit's top).
//   night   the interior, the coolers, the fascia and the downlights glow (threshold -0.25, base only) in practical
//           and sclera; the glints go (glass at night shows the light behind it, not the sky).
// Colours (indigo): walls line #e7eefc / moon #d5e2ff; fascia line / moon with stripes iris #e7a04a and accent
//   #e23b4a, coping and all frames (mullions, door, kick plate, canopy edge) sky #1b2d6b flat; downlights and
//   cooler fronts practical #f0c36a; interior floor and lining moon / line; gondolas line / moon; products accent,
//   iris, practical, skin #f0c2ae, sky; counter skin / iris with a moon top; bins line / moon with coloured lids;
//   rack moon / sky; AC line / moon; vending machines accent flat and line / moon; glints line. Night swaps the interior to practical / sclera #f6f3ee glow,
//   the walls go sky flat and the pavement stays lit.

export const meta = {
  name: "konbini",
  height: 4.2,
  script: "indigo",
  colors: {
    wall: "#e7eefc", wallShade: "#d5e2ff",
    stripeA: "#e7a04a", stripeB: "#e23b4a",
    frame: "#1b2d6b",
    lamp: "#f0c36a", glow: "#f6f3ee",
    floor: "#d5e2ff", floorShade: "#e7eefc",
    counter: "#f0c2ae", counterShade: "#e7a04a",
    metal: "#d5e2ff", metalShade: "#1b2d6b",
    glint: "#e7eefc",
    red: "#e23b4a", orange: "#e7a04a", yellow: "#f0c36a", pink: "#f0c2ae", white: "#e7eefc", navy: "#1b2d6b",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, night = false } = opts;
  const root = new THREE.Group();
  root.name = "konbini";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / meta.height);
  root.add(body);
  const joints = {};

  // ---------- triangle soups with normals ----------
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
    if (flip) n = mul(n, -1);
    n = nrm(n);
    const s = S(key);
    const [B, NB, E, NE] = flip ? [e, ne, b, nb] : [b, nb, e, ne];
    for (const [q, nq] of [[a, na ?? n], [B, NB ?? n], [E, NE ?? n]]) s.p.push(...q), s.n.push(...nq);
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
  // a flat quad in the plane z = z facing +Z (or -Z with dir = -1)
  const fz = (key, x0, x1, y0, y1, z, dir = 1) => quad(key, [x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [x0, y0, z - dir]);
  // a flat quad in the plane x = x facing +X
  const fx = (key, z0, z1, y0, y1, x) => quad(key, [x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0], [x - 1, y0, z0]);
  // a flat quad in the plane y = y facing down
  const fdown = (key, x0, x1, z0, z1, y) => quad(key, [x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [x0, y + 1, z0]);
  // a planar tube along pts (plane normal pn), corners rounded, open ends capped
  function tube(key, pts, r, pn, { bend = 0.08, sides = 6 } = {}) {
    const path = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const P = pts[i];
      if (i === 0 || i === n - 1) { path.push(P); continue; }
      const da = nrm(sub(pts[i - 1], P)), dc = nrm(sub(pts[i + 1], P));
      const p0 = add(P, mul(da, bend)), p2 = add(P, mul(dc, bend));
      for (const u of [0, 0.25, 0.5, 0.75, 1])
        path.push([0, 1, 2].map((k) => (1 - u) * (1 - u) * p0[k] + 2 * u * (1 - u) * P[k] + u * u * p2[k]));
    }
    const L = path.length;
    const rings = path.map((P, i) => {
      const T = nrm(sub(path[Math.min(L - 1, i + 1)], path[Math.max(0, i - 1)]));
      const u = nrm(sub(pn, mul(T, dot(pn, T)))), w = cross(T, u);
      const ring = [];
      for (let j = 0; j < sides; j++) {
        const a = (j / sides) * Math.PI * 2, d = add(mul(u, Math.cos(a)), mul(w, Math.sin(a)));
        ring.push({ q: add(P, mul(d, r)), n: d });
      }
      return { P, T, ring };
    });
    for (let i = 0; i < L - 1; i++) {
      const R0 = rings[i], R1 = rings[i + 1], ref = mul(add(R0.P, R1.P), 0.5);
      for (let j = 0; j < sides; j++) {
        const k = (j + 1) % sides, [a, b, e, d] = [R0.ring[j], R0.ring[k], R1.ring[k], R1.ring[j]];
        tri(key, a.q, b.q, e.q, ref, a.n, b.n, e.n);
        tri(key, a.q, e.q, d.q, ref, a.n, e.n, d.n);
      }
    }
    for (const [R, s] of [[rings[0], -1], [rings[L - 1], 1]]) {
      const ref = sub(R.P, mul(R.T, s * r)), cn = mul(R.T, s);
      for (let j = 1; j < sides - 1; j++) tri(key, R.ring[0].q, R.ring[j].q, R.ring[j + 1].q, ref, cn, cn, cn);
    }
  }

  // ---------- plan ----------
  const X = 5.0, ZF = 3.2, ZB = -4.6, FL = 0.15, T = 0.25; // half width, front glazing plane, back, floor, wall
  const HEAD = 2.8, FAS0 = 2.95, FAS1 = 3.95, ROOF = 3.55;
  const XI = X - T, ZBI = ZB + T; // inner faces

  // ---------- shell ----------
  box("ground", -X - 0.2, X + 0.2, 0, 0.1, ZF, 4.9); // pavement apron
  box("ground", -X, X, 0, FL, ZB, ZF); // plinth
  for (const s of [-1, 1]) box("wall", s > 0 ? XI : -X, s > 0 ? X : -XI, FL, ROOF - 0.15, ZB, ZF);
  box("wall", -XI, XI, FL, ROOF - 0.15, ZB, ZBI);
  box("wall", -X, X, ROOF - 0.15, ROOF, ZB, ZF); // roof slab
  // fascia: front and both sides, standing proud of the walls; stripes and coping
  const FZ = ZF + 0.25, FX = X + 0.1;
  box("fascia", -FX, FX, FAS0, FAS1, ZF - 0.05, FZ);
  for (const s of [-1, 1]) box("fascia", s > 0 ? X - 0.05 : -FX, s > 0 ? FX : -X + 0.05, FAS0, FAS1, ZB + 0.6, ZF);
  const band = (key, y0, y1, o) => {
    box(key, -FX - o, FX + o, y0, y1, ZF, FZ + o);
    for (const s of [-1, 1]) box(key, s > 0 ? FX - 0.02 : -FX - o, s > 0 ? FX + o : -FX + 0.02, y0, y1, ZB + 0.6, ZF + 0.01);
  };
  band("stripeA", 3.42, 3.62, 0.012);
  band("stripeB", 3.12, 3.3, 0.012);
  band("coping", FAS1 - 0.08, FAS1 + 0.02, 0.03);
  box("wall", -X + 0.05, X - 0.05, ROOF, 3.75, ZB, ZB + 0.15); // back parapet
  // canopy over the pavement, its edge band and downlights
  const CZ = ZF + 1.1;
  box("canopy", -FX, FX, 2.78, 2.9, ZF, CZ);
  box("frame", -FX - 0.01, FX + 0.01, 2.76, 2.92, CZ - 0.06, CZ + 0.01);
  for (let x = -4.2; x <= 4.3; x += 1.4) fdown("lamp", x - 0.13, x + 0.13, ZF + 0.42, ZF + 0.68, 2.775);

  // ---------- front: glazing frame, mullions, door ----------
  const D0 = 1.5, D1 = 3.3, DH = 2.35; // door opening
  box("frame", -XI, XI, FL, 0.38, ZF - 0.06, ZF + 0.04); // kick plate
  box("frame", -XI, XI, HEAD, FAS0, ZF - 0.06, ZF + 0.04); // header
  for (const x of [-3.25, -1.75, -0.2, D0, D1]) box("frame", x - 0.05, x + 0.05, 0.38, HEAD, ZF - 0.06, ZF + 0.05);
  for (const s of [-1, 1]) box("frame", s > 0 ? XI - 0.09 : -XI, s > 0 ? XI : -XI + 0.09, FL, HEAD, ZF - 0.06, ZF + 0.05);
  box("frame", D0, D1, DH, DH + 0.1, ZF - 0.06, ZF + 0.05); // door transom
  box("frame", (D0 + D1) / 2 - 0.25, (D0 + D1) / 2 + 0.25, DH + 0.12, DH + 0.26, ZF, ZF + 0.12); // sensor
  box("frame", D0 + 0.05, D1 - 0.05, FL, 0.2, ZF - 0.06, ZF + 0.04); // door threshold rail (no kick plate)
  // two sliding leaves, each a framed rectangle, offset 4 cm so they read as two
  const leaf = (x0, x1, z) => {
    const t = 0.055, y0 = 0.2, y1 = DH - 0.02;
    box("frame", x0, x1, y0, y0 + 0.12, z - 0.02, z + 0.02);
    box("frame", x0, x1, y1 - t, y1, z - 0.02, z + 0.02);
    box("frame", x0, x0 + t, y0, y1, z - 0.02, z + 0.02);
    box("frame", x1 - t, x1, y0, y1, z - 0.02, z + 0.02);
  };
  const DM = (D0 + D1) / 2;
  leaf(D0 + 0.05, DM + 0.03, ZF + 0.1);
  leaf(DM - 0.03, D1 - 0.05, ZF + 0.15);
  box("mat", D0 - 0.1, D1 + 0.1, 0.1, 0.12, ZF + 0.25, ZF + 1.0);
  // glints on the pane plane: two parallel diagonals in some panes
  const glint = (xa, w, y, len) => {
    for (const [o, ww] of [[0, w], [w * 1.6, w * 0.5]]) {
      const x = xa + o, z = ZF + 0.055;
      quad("glint", [x, y, z], [x + ww, y, z], [x + ww + len * 0.55, y + len, z], [x + len * 0.55, y + len, z], [x, y, z - 1]);
    }
  };
  if (!night) {
    glint(-4.45, 0.16, 1.2, 1.2);
    glint(-2.9, 0.13, 0.9, 1.05);
    glint(-1.2, 0.16, 1.35, 1.1);
    glint(3.7, 0.14, 1.0, 1.1);
  }

  // ---------- inside ----------
  box("floor", -XI, XI, FL, FL + 0.01, ZBI, ZF - 0.06);
  box("inner", -XI, XI, 2.72, 2.76, ZBI, ZF - 0.06); // ceiling
  for (const z of [2.3, 0.4, -1.5, -3.2]) box("lamp", -XI + 0.4, XI - 0.4, 2.69, 2.72, z - 0.09, z + 0.09);
  box("inner", -XI, XI, FL, 2.72, ZBI, ZBI + 0.02); // back lining
  for (const s of [-1, 1]) box("inner", s > 0 ? XI - 0.02 : -XI, s > 0 ? XI : -XI + 0.02, FL, 2.72, ZBI, ZF - 0.06);
  // product colours, cycled from literal sequences (no randomness)
  const PROD = ["red", "yellow", "white", "orange", "navy", "pink", "red", "white", "orange"];
  const WID = [0.16, 0.12, 0.2, 0.14, 0.18, 0.12, 0.22];
  const stock = (x0, x1, y0, h, zf, depth, seed) => {
    let x = x0 + 0.02, i = seed;
    while (x < x1 - 0.1) {
      const w = Math.min(WID[i % WID.length], x1 - 0.02 - x);
      const hh = h * (0.7 + 0.1 * ((i * 3) % 4));
      box(PROD[(i * 4 + seed) % PROD.length], x, x + w - 0.015, y0, y0 + hh, zf - depth, zf);
      x += w;
      i++;
    }
  };
  // gondola: a body with a +Z face of shelves; each shelf a ledge with a row of products standing on it
  const gondola = (x0, x1, zc, h, seed) => {
    const d = 0.45; // half depth
    box("shelf", x0, x1, FL, FL + 0.18, zc - d, zc + d); // base
    box("shelf", x0, x1, FL, h, zc - 0.08, zc + 0.08); // spine
    for (const s of [-1, 1]) box("shelf", s > 0 ? x1 - 0.05 : x0, s > 0 ? x1 : x0 + 0.05, FL, h, zc - d, zc + d); // ends
    const rows = Math.round((h - 0.35) / 0.33);
    for (let r = 0; r < rows; r++) {
      const y = FL + 0.18 + r * 0.33;
      if (r > 0) box("ledge", x0 + 0.05, x1 - 0.05, y - 0.03, y, zc + 0.08, zc + d - 0.02 - r * 0.04);
      for (const side of [1, -1]) {
        const zf = side > 0 ? zc + d - 0.04 - r * 0.04 : zc - d + 0.04 + r * 0.04;
        if (side > 0) stock(x0 + 0.05, x1 - 0.05, y, 0.25, zf, 0.22, seed + r * 5);
        else box("shelf", x0 + 0.05, x1 - 0.05, y, y + 0.22, zc - d + 0.02, zc - 0.08); // back face: a block of stock
      }
    }
    box("topper", x0 + 0.3, x1 - 0.3, h, h + 0.22, zc - 0.03, zc + 0.03); // aisle sign board (no text)
  };
  gondola(-0.9, 3.7, 1.0, 1.35, 0);
  gondola(-0.9, 3.7, -1.5, 1.6, 3);
  // magazine rack along the window (its back to the glass), magazines on top facing in
  box("shelf", -XI + 0.1, D0 - 0.25, FL, 1.0, ZF - 0.55, ZF - 0.12);
  for (let x = -XI + 0.15, i = 0; x < D0 - 0.45; x += 0.27, i++)
    hex(PROD[(i * 5 + 1) % PROD.length], [[x, 1.0, ZF - 0.5], [x + 0.22, 1.0, ZF - 0.5], [x + 0.22, 1.0, ZF - 0.2], [x, 1.0, ZF - 0.2],
      [x, 1.32, ZF - 0.27], [x + 0.22, 1.32, ZF - 0.27], [x + 0.22, 1.32, ZF - 0.21], [x, 1.32, ZF - 0.21]]);
  // till counter (-X), registers, hot-food case; the cigarette wall behind
  const K0 = -4.5, K1 = -1.6, KZ = -0.3;
  box("counter", K0, K1, FL, 1.0, KZ - 0.35, KZ + 0.35);
  box("top", K0 - 0.05, K1 + 0.05, 1.0, 1.05, KZ - 0.4, KZ + 0.4);
  for (const x of [-3.9, -2.3]) {
    box("navy", x - 0.2, x + 0.2, 1.05, 1.2, KZ - 0.15, KZ + 0.2); // register
    box("navy", x - 0.03, x + 0.03, 1.2, 1.38, KZ - 0.05, KZ); // screen post
    box("navy", x - 0.17, x + 0.17, 1.33, 1.58, KZ - 0.04, KZ + 0.02); // customer screen
  }
  box("warmer", -3.35, -2.75, 1.05, 1.5, KZ - 0.2, KZ + 0.3); // hot-food case (glows)
  box("frame", -3.37, -2.73, 1.5, 1.56, KZ - 0.22, KZ + 0.32);
  box("shelf", K0, K1, FL, 2.2, -1.25, -0.95); // cigarette wall
  for (let r = 0; r < 4; r++) stock(K0 + 0.05, K1 - 0.05, 1.2 + r * 0.24, 0.14, -0.94, 0.05, 2 + r * 3);
  box("navy", K0, K1, 0.9, 1.15, -0.94, -0.92);
  // ATM and copy machine by the door (+X), standing against the side wall, facing the aisle (-X)
  box("navy", XI - 0.75, XI - 0.02, FL, 1.75, 1.95, 2.75); // ATM body
  box("red", XI - 0.75, XI - 0.02, 1.75, 1.95, 1.95, 2.75); // its sign band
  box("lamp", XI - 0.77, XI - 0.6, 1.05, 1.4, 2.1, 2.6); // screen
  box("white", XI - 0.95, XI - 0.6, 0.9, 0.95, 2.1, 2.6); // ledge
  box("copier", XI - 0.75, XI - 0.02, FL, 1.05, 0.45, 1.6); // copy machine
  box("navy", XI - 0.8, XI - 0.02, 1.05, 1.13, 0.45, 1.6); // its lid
  box("lamp", XI - 0.82, XI - 0.6, 0.95, 1.08, 0.7, 1.1); // control panel
  // drink coolers along the back wall: lit fronts with door mullions and stock bands
  const C0 = -1.0, C1 = XI - 0.05, CZb = ZBI + 0.6;
  box("shelf", C0, C1, FL, 2.3, ZBI, CZb - 0.02);
  fz("cooler", C0 + 0.05, C1 - 0.05, FL + 0.15, 2.1, CZb);
  for (let r = 0; r < 5; r++) stock(C0 + 0.08, C1 - 0.08, FL + 0.25 + r * 0.37, 0.2, CZb + 0.01, 0.005, 1 + r * 2);
  for (let x = C0 + 0.05; x <= C1 - 0.04; x += (C1 - C0 - 0.1) / 6) box("frame", x - 0.03, x + 0.03, FL + 0.12, 2.12, CZb, CZb + 0.04);
  box("frame", C0 + 0.02, C1 - 0.02, 2.1, 2.16, CZb, CZb + 0.04);
  box("frame", C0 + 0.02, C1 - 0.02, FL + 0.1, FL + 0.16, CZb, CZb + 0.04);

  // ---------- outside: bins, bicycle rack, AC unit ----------
  const LID = ["red", "orange", "yellow", "navy"];
  for (let i = 0; i < 4; i++) {
    const x = -4.55 + i * 0.58, w = 0.52, z0 = ZF + 0.3, z1 = ZF + 0.8;
    box("bin", x, x + w, 0.1, 0.92, z0, z1);
    box(LID[i], x - 0.01, x + w + 0.01, 0.92, 1.0, z0 - 0.01, z1 + 0.01);
    fz("slot", x + 0.11, x + w - 0.11, 0.62, 0.78, z1 + 0.004);
  }
  for (let i = 0; i < 4; i++) {
    const x = -1.4 + i * 0.75, z0 = 4.05, z1 = 4.75;
    tube("metal", [[x, 0.1, z0], [x, 0.85, z0], [x, 0.85, z1], [x, 0.1, z1]], 0.025, [1, 0, 0], { bend: 0.12 });
  }
  tube("metal", [[-1.55, 0.14, 4.4], [1.0, 0.14, 4.4]], 0.02, [0, 1, 0]);
  // two vending machines against the +X wall, facing the side street; a downpipe at the back corner
  for (const [z0, z1, key] of [[1.95, 2.95, "vendA"], [0.85, 1.85, "vendB"]]) {
    const x1 = X + 0.75;
    box(key, X, x1, 0.1, 1.85, z0, z1);
    fx("lamp", z0 + 0.08, z1 - 0.08, 1.05, 1.72, x1 + 0.005);
    for (let r = 0; r < 2; r++)
      for (let i = 0; i < 6; i++) {
        const zz = z0 + 0.13 + i * 0.13, yy = 1.12 + r * 0.31;
        fx(PROD[(i + r * 3 + (key === "vendA" ? 0 : 4)) % PROD.length], zz, zz + 0.09, yy, yy + 0.2, x1 + 0.01);
        fx("navy", zz + 0.02, zz + 0.07, yy - 0.05, yy - 0.02, x1 + 0.01); // buttons
      }
    fx("slot", z0 + 0.15, z1 - 0.15, 0.25, 0.45, x1 + 0.005);
    fx("slot", z1 - 0.32, z1 - 0.12, 0.75, 0.95, x1 + 0.005); // coin / card panel
  }
  tube("frame", [[X + 0.07, 0.1, ZB + 0.15], [X + 0.07, FAS0, ZB + 0.15]], 0.05, [0, 0, 1]);
  // AC unit on the roof: casing, fan grille (a dark disc with a hub), feet
  const AX = 3.0, AZ = -3.2;
  box("ac", AX - 0.5, AX + 0.5, ROOF + 0.06, 4.2, AZ - 0.35, AZ + 0.35);
  for (const s of [-1, 1]) box("frame", AX + s * 0.42 - 0.05, AX + s * 0.42 + 0.05, ROOF, ROOF + 0.06, AZ - 0.3, AZ + 0.3);
  const ring = 12, gr = 0.24, gc = [AX - 0.12, (ROOF + 4.2) / 2, AZ + 0.352];
  for (let j = 0; j < ring; j++) {
    const a0 = (j / ring) * Math.PI * 2, a1 = ((j + 1) / ring) * Math.PI * 2;
    tri("slot", gc, [gc[0] + gr * Math.cos(a0), gc[1] + gr * Math.sin(a0), gc[2]], [gc[0] + gr * Math.cos(a1), gc[1] + gr * Math.sin(a1), gc[2]], [gc[0], gc[1], gc[2] - 1]);
  }
  box("ac", gc[0] - 0.04, gc[0] + 0.04, gc[1] - 0.04, gc[1] + 0.04, AZ + 0.35, AZ + 0.38);
  for (let k = -2; k <= 2; k++) box("ac", AX + 0.22, AX + 0.44, gc[1] + k * 0.09 - 0.015, gc[1] + k * 0.09 + 0.015, AZ + 0.35, AZ + 0.37);
  box("frame", AX + 0.5, AX + 0.56, ROOF, 3.9, AZ - 0.05, AZ + 0.05); // refrigerant pipe cover

  // ---------- meshes ----------
  // [base, shade, threshold, hull px (0 = none)]; night: the interior and the practicals glow. Hull widths are
  // shared in tiers (2, 2.5, 3, 4, 5) so equal looks merge into one mesh below.
  const G = -0.25;
  const MAT = {
    ground: night ? [c.floor, c.navy, 0.1, 4] : [c.floor, c.wallShade, 0.1, 4],
    wall: night ? [c.navy, c.navy, G, 5] : [c.wall, c.wallShade, 0.1, 5],
    canopy: night ? [c.floor, c.floor, G, 5] : [c.wall, c.wallShade, 0.1, 5],
    vendA: [c.red, c.red, G, 3],
    vendB: [c.white, c.floor, 0.1, 3],
    fascia: night ? [c.glow, c.glow, G, 5] : [c.wall, c.wallShade, 0.1, 5],
    stripeA: [c.stripeA, c.stripeA, G, 0],
    stripeB: [c.stripeB, c.stripeB, G, 0],
    coping: [c.frame, c.frame, G, 2.5],
    frame: [c.frame, c.frame, G, 2.5],
    mat: [c.frame, c.frame, G, 2.5],
    glint: [c.glint, c.glint, G, 0],
    lamp: [c.lamp, c.lamp, G, 0],
    floor: night ? [c.glow, c.glow, G, 0] : [c.floor, c.floorShade, 0.1, 0],
    inner: night ? [c.lamp, c.lamp, G, 0] : [c.floor, c.floorShade, 0.1, 0],
    shelf: night ? [c.glow, c.floor, 0.1, 3] : [c.wall, c.floor, 0.1, 3],
    ledge: [c.wall, c.floor, 0.1, 0],
    topper: [c.stripeB, c.stripeB, G, 3],
    counter: [c.counter, c.counterShade, 0.1, 2.5],
    top: [c.white, c.floor, 0.1, 3],
    warmer: [c.lamp, c.lamp, G, 0],
    cooler: [c.lamp, c.lamp, G, 0],
    copier: [c.white, c.floor, 0.1, 3],
    bin: [c.wall, c.wallShade, 0.1, 3],
    slot: [c.navy, c.navy, G, 0],
    metal: [c.metal, c.metalShade, 0.1, 2.5],
    ac: [c.wall, c.wallShade, 0.1, 3],
    red: [c.red, c.red, G, 0], orange: [c.orange, c.orange, G, 0], yellow: [c.yellow, c.yellow, G, 0],
    pink: [c.pink, c.pink, G, 0], white: [c.white, c.floor, 0.1, 0], navy: [c.navy, c.navy, G, 0],
  };
  // one mesh per distinct material (base, shade, threshold, hull): parts that share a look share a mesh
  const groups = {};
  for (const [key, { p, n }] of Object.entries(soups)) {
    const g = (groups[MAT[key].join("|")] ??= { m: MAT[key], keys: [], p: [], n: [] });
    g.keys.push(key), g.p.push(...p), g.n.push(...n);
  }
  for (const { m: [base, shade, threshold, px], keys, p, n } of Object.values(groups)) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = keys.join("+");
    body.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
