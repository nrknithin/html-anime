// gas-station.js - a small Japanese roadside gas station at night, as a diorama tile, static.
// Contract: harness/lab/README.md. Meters, +Y up, the forecourt faces +Z (the road), its left is +X (the kiosk
// side), stands on y = 0, centred on x = 0, z = 0. Tile 18 x 12 m.
//
// Construction (boxes, flat quads, lathed solids and swept tubes, all triangle soups merged per material; every
// triangle is wound away from a point inside its solid: a box centre, a tube axis, a point behind a flat quad, a
// point just inside a lathe profile edge):
//   GROUND  a concrete forecourt slab, a road strip along +Z with a solid edge line and centre dashes, a curb with
//           two driveway gaps; under the canopy an oval light pool (option `lights`).
//   CANOPY  a broad flat slab on two square pillars that stand on one long island; a bright stripe wraps the fascia
//           (no lettering); the soffit glows amber with a grid of pale downlights (option `lights`).
//   FUEL    the Japanese overhead dispensers: four housings hung from the soffit over the two lanes, each with a dark
//           hose-reel drum under it and two hoses dangling to nozzles at head height (one pink, one amber); two low
//           ground-mounted pumps on the island with displays and holstered nozzles; an air-hose stand.
//   KIOSK   a small glass-fronted office (+X, back): full-height glazing with mullions and no pane, the inside
//           lit (back lining, floor, ceiling), a counter with a register, a side window, a stripe on its fascia.
//   EXTRAS  a car-wash brush gantry (-X, back) with two ridged vertical brushes, a top brush and ground rails; a tall
//           price pylon (-X, front) with four blank glowing panels and a blank logo square under a stripe cap; traffic
//           cones, a tyre stack.
// Proportions (real size, base unit the canopy clearance C = 4.9 m): canopy 9.0 x 6.4 m, slab 4.9-5.7 (stripe
//   5.15-5.45); pillars 0.5 square; island 5.6 x 1.0 x 0.2; overhead housings 1.0 x 0.4 x 0.55 at 4.5-4.9, nozzles
//   at 1.5-1.7 (0.33 C); ground pumps 0.9 x 1.5 x 0.6; kiosk 4.4 x 3.0 x 3.25; car wash 2.8 wide x 3.15; pylon 7.0
//   (1.43 C), the top of the model.
// Options: build(THREE, kit, colors, { height = 7.0, lights = true }).
//   height  scales the whole tile uniformly (the pylon's top).
//   lights  the soffit glows practical amber with sclera downlights and throws a moon-coloured pool on the
//           forecourt; off, the soffit goes sky flat and the pool goes. The kiosk and pylon stay lit either way.
// Colours (festival): forecourt sky #24143a / hair #1a1020; structure (canopy, pillars, island, pumps, housings,
//   kiosk walls, curb, gantry, pylon body) line #fff1ea / skin #f0c2ae; stripes, cones, pink nozzles, the counter
//   and the air stand accent #ff4d6d flat; soffit, amber nozzles and pump displays practical #ffb020 flat; light
//   pool moon #ffd7a1; kiosk interior iris #ffd0a1; pylon panels and downlights sclera #f6f3ee; hoses, reels,
//   mullions, frames, tyres, posts and the road hair #1a1020 flat; brushes accent / skin; road and cone bands line.

export const meta = {
  name: "gas-station",
  height: 7.0,
  script: "festival",
  colors: {
    ground: "#24143a", groundShade: "#1a1020",
    white: "#fff1ea", whiteShade: "#f0c2ae",
    accent: "#ff4d6d",
    amber: "#ffb020",
    pool: "#ffd7a1",
    glass: "#ffd0a1",
    panel: "#f6f3ee",
    dark: "#1a1020",
    night: "#24143a",
    line: "#fff1ea",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, lights = true } = opts;
  const root = new THREE.Group();
  root.name = "gas-station";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / meta.height);
  root.add(body);
  const joints = {};

  // ---------- triangle soups ----------
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
  function box(key, x0, x1, y0, y1, z0, z1) {
    const p = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    const ref = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  // flat quads: in the plane z = z facing +Z (dir -1: -Z), x = x facing +X (dir -1: -X), y = y facing up / down
  const fz = (key, x0, x1, y0, y1, z, dir = 1) => quad(key, [x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [x0, y0, z - dir]);
  const fx = (key, z0, z1, y0, y1, x, dir = 1) => quad(key, [x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0], [x - dir, y0, z0]);
  const fy = (key, x0, x1, z0, z1, y, dir = 1) => quad(key, [x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [x0, y - dir, z0]);
  // a solid of revolution: prof is a closed CCW loop in (r, y) (r to the right); axis "y" (vertical) or "x"
  function lathe(key, cx, cy, cz, prof, sides = 12, axis = "y") {
    const P = (r, y, a) => axis === "y"
      ? [cx + r * Math.cos(a), cy + y, cz + r * Math.sin(a)]
      : [cx + y, cy + r * Math.cos(a), cz + r * Math.sin(a)];
    const L = prof.length;
    for (let i = 0; i < L; i++) {
      const [r0, y0] = prof[i], [r1, y1] = prof[(i + 1) % L];
      const nr = y1 - y0, ny = -(r1 - r0), nl = Math.hypot(nr, ny) || 1; // outward normal of a CCW edge
      const rm = ((r0 + r1) / 2) * Math.cos(Math.PI / sides) - (nr / nl) * 0.01, ym = (y0 + y1) / 2 - (ny / nl) * 0.01; // on the chord
      for (let j = 0; j < sides; j++) {
        const a0 = (j / sides) * Math.PI * 2, a1 = ((j + 1) / sides) * Math.PI * 2, am = (a0 + a1) / 2;
        quad(key, P(r0, y0, a0), P(r0, y0, a1), P(r1, y1, a1), P(r1, y1, a0), P(rm, ym, am));
      }
    }
  }
  // a planar tube along pts (plane normal pn), corners rounded, ends capped
  function tube(key, pts, r, pn, { bend = 0.08, sides = 6 } = {}) {
    const path = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const Q = pts[i];
      if (i === 0 || i === n - 1) { path.push(Q); continue; }
      const da = nrm(sub(pts[i - 1], Q)), dc = nrm(sub(pts[i + 1], Q));
      const p0 = add(Q, mul(da, bend)), p2 = add(Q, mul(dc, bend));
      for (const u of [0, 0.25, 0.5, 0.75, 1])
        path.push([0, 1, 2].map((k) => (1 - u) * (1 - u) * p0[k] + 2 * u * (1 - u) * Q[k] + u * u * p2[k]));
    }
    const L = path.length;
    const rings = path.map((Q, i) => {
      const T = nrm(sub(path[Math.min(L - 1, i + 1)], path[Math.max(0, i - 1)]));
      const u = nrm(sub(pn, mul(T, dot(pn, T)))), w = cross(T, u);
      const ring = [];
      for (let j = 0; j < sides; j++) {
        const a = (j / sides) * Math.PI * 2, d = add(mul(u, Math.cos(a)), mul(w, Math.sin(a)));
        ring.push({ q: add(Q, mul(d, r)), n: d });
      }
      return { Q, T, ring };
    });
    for (let i = 0; i < L - 1; i++) {
      const R0 = rings[i], R1 = rings[i + 1], ref = mul(add(R0.Q, R1.Q), 0.5);
      for (let j = 0; j < sides; j++) {
        const k = (j + 1) % sides, [a, b, e, d] = [R0.ring[j], R0.ring[k], R1.ring[k], R1.ring[j]];
        tri(key, a.q, b.q, e.q, ref, a.n, b.n, e.n);
        tri(key, a.q, e.q, d.q, ref, a.n, e.n, d.n);
      }
    }
    for (const [R, s] of [[rings[0], -1], [rings[L - 1], 1]]) {
      const ref = sub(R.Q, mul(R.T, s * r)), cn = mul(R.T, s);
      for (let j = 1; j < sides - 1; j++) tri(key, R.ring[0].q, R.ring[j].q, R.ring[j + 1].q, ref, cn, cn, cn);
    }
  }

  // ---------- ground: forecourt, curb, road ----------
  const G0 = 0.06; // forecourt top
  const ZC0 = 3.5, ZC1 = 3.8; // curb
  box("ground", -9, 9, 0, G0, -6, ZC0);
  for (const [x0, x1] of [[-9, -6.2], [-3.2, 1.2], [4.2, 9]]) box("white", x0, x1, 0, 0.18, ZC0, ZC1);
  for (const [x0, x1] of [[-6.2, -3.2], [1.2, 4.2]]) box("ground", x0, x1, 0, G0, ZC0, ZC1); // driveway aprons
  box("dark", -9, 9, 0, 0.03, ZC1, 6);
  fy("line", -9, 9, 3.95, 4.07, 0.032);
  for (let x = -8.4; x < 9; x += 3) fy("line", x, x + 1.5, 4.86, 4.98, 0.032);
  // stop bars in front of the island lanes
  for (const z of [-2.5, 1.7]) fy("line", 2.2, 2.32, z - 0.9, z + 0.9, G0 + 0.002);

  // ---------- canopy ----------
  const CX0 = -5.6, CX1 = 3.4, CZ0 = -3.6, CZ1 = 2.8, CY0 = 4.9, CY1 = 5.7;
  box("white", CX0, CX1, CY0, CY1, CZ0, CZ1);
  const o = 0.02; // the stripe stands proud of the fascia
  box("accent", CX0 - o, CX1 + o, 5.15, 5.45, CZ0 - o, CZ1 + o);
  fy(lights ? "soffit" : "night", CX0 + 0.02, CX1 - 0.02, CZ0 + 0.02, CZ1 - 0.02, CY0 - 0.004, -1);
  if (lights)
    for (let x = CX0 + 1.0; x < CX1 - 0.5; x += 1.75)
      for (const z of [CZ0 + 0.7, -0.4, CZ1 - 0.7]) fy("panel", x - 0.28, x + 0.28, z - 0.28, z + 0.28, CY0 - 0.008, -1);
  // island and the two pillars
  const IZ = -0.4, IY = G0 + 0.2;
  box("white", -4.0, 2.0, G0, IY, IZ - 0.5, IZ + 0.5);
  for (const x of [-4.0, 2.0]) box("accent", x - 0.15, x + 0.15, G0, IY + 0.12, IZ - 0.52, IZ + 0.52); // nose bumpers
  for (const x of [-3.2, 1.2]) {
    box("white", x - 0.25, x + 0.25, IY, CY0 + 0.1, IZ - 0.25, IZ + 0.25);
    box("accent", x - 0.27, x + 0.27, IY, IY + 0.35, IZ - 0.27, IZ + 0.27); // base band
  }
  // light pool on the forecourt
  if (lights) {
    const pc = [-1.1, G0 + 0.003, -0.4], ax = 5.6, az = 4.2, N = 28;
    for (let j = 0; j < N; j++) {
      const a0 = (j / N) * Math.PI * 2, a1 = ((j + 1) / N) * Math.PI * 2;
      tri("pool", pc, [pc[0] + ax * Math.cos(a0), pc[1], pc[2] + az * Math.sin(a0)],
        [pc[0] + ax * Math.cos(a1), pc[1], pc[2] + az * Math.sin(a1)], [pc[0], pc[1] - 1, pc[2]]);
    }
  }

  // ---------- overhead dispensers: housing, reel drum, two hoses, two nozzles ----------
  const nozzle = (key, x, y, z, s) => {
    // a hanging nozzle: grip block, a guard loop and a spout pointing down and outward (s = +-1 along z)
    box(key, x - 0.05, x + 0.05, y - 0.08, y + 0.12, z - 0.06, z + 0.06);
    tube(key, [[x, y - 0.06, z], [x, y - 0.16, z + s * 0.05], [x, y - 0.3, z + s * 0.12]], 0.022, [1, 0, 0], { bend: 0.04, sides: 5 });
    tube("dark", [[x, y + 0.08, z - s * 0.06], [x, y - 0.12, z - s * 0.12], [x, y - 0.1, z + 0.0]], 0.012, [1, 0, 0], { bend: 0.04, sides: 4 });
  };
  for (const z of [-2.4, 1.6])
    for (const x of [-2.1, 0.1]) {
      box("white", x - 0.5, x + 0.5, 4.5, CY0, z - 0.28, z + 0.28);
      box("accent", x - 0.51, x + 0.51, 4.5, 4.6, z - 0.29, z + 0.29);
      const s = z > IZ ? 1 : -1; // the side facing the open lane
      fz("amber", x - 0.32, x + 0.08, 4.66, 4.82, z + s * 0.285, s); // display window
      lathe("dark", x - 0.4, 4.36, z, [[0, 0], [0.13, 0], [0.13, 0.8], [0, 0.8]], 10, "x"); // reel drum along x
      box("dark", x - 0.42, x - 0.38, 4.32, 4.5, z - 0.04, z + 0.04);
      box("dark", x + 0.38, x + 0.42, 4.32, 4.5, z - 0.04, z + 0.04);
      for (const [dx, key, yn] of [[-0.28, "accent", 1.72], [0.28, "amberInk", 1.58]]) {
        const hx = x + dx;
        tube("dark", [[hx, 4.3, z], [hx, 3.0, z + s * 0.18], [hx + dx * 0.15, yn + 0.12, z + s * 0.12]], 0.035, [1, 0, 0], { bend: 0.5, sides: 6 });
        nozzle(key, hx + dx * 0.15, yn, z + s * 0.12, s);
      }
    }

  // ---------- ground pumps on the island ----------
  for (const x of [-2.1, 0.1]) {
    const y0 = IY, y1 = IY + 1.45, z0 = IZ - 0.3, z1 = IZ + 0.3;
    box("white", x - 0.45, x + 0.45, y0, y1, z0, z1);
    box("accent", x - 0.47, x + 0.47, y1, y1 + 0.14, z0 - 0.02, z1 + 0.02);
    box("dark", x - 0.4, x + 0.4, y0, y0 + 0.18, z0 - 0.01, z1 + 0.01); // plinth
    for (const s of [-1, 1]) {
      const zf = s > 0 ? z1 + 0.004 : z0 - 0.004;
      fz("dark", x - 0.36, x + 0.36, y0 + 0.85, y0 + 1.32, zf, s); // display bezel
      fz("amber", x - 0.3, x + 0.3, y0 + 1.06, y0 + 1.24, zf + s * 0.003, s);
      fz("amber", x - 0.3, x - 0.02, y0 + 0.92, y0 + 1.0, zf + s * 0.003, s);
      fz("panel", x + 0.04, x + 0.3, y0 + 0.92, y0 + 1.0, zf + s * 0.003, s);
      fz("line", x - 0.3, x + 0.3, y0 + 0.45, y0 + 0.5, zf, s); // blank label stripe
    }
    // holstered nozzles on the ends, short hoses looping down
    for (const [sx, key] of [[-1, "accent"], [1, "amberInk"]]) {
      const ex = x + sx * 0.45;
      box(key, ex + (sx < 0 ? -0.1 : 0), ex + (sx > 0 ? 0.1 : 0), y0 + 0.85, y0 + 1.1, IZ - 0.06, IZ + 0.06);
      tube("dark", [[ex, y0 + 0.6, IZ + 0.12], [ex + sx * 0.12, y0 + 0.3, IZ + 0.12], [ex + sx * 0.12, y0 + 0.9, IZ + 0.12]], 0.025, [0, 0, 1], { bend: 0.12 });
    }
  }
  // air-hose stand at the +X end of the island lane
  {
    const x = 2.75, z = -0.4;
    box("dark", x - 0.18, x + 0.18, G0, G0 + 0.08, z - 0.18, z + 0.18);
    box("accent", x - 0.07, x + 0.07, G0 + 0.08, 1.15, z - 0.07, z + 0.07);
    box("white", x - 0.16, x + 0.16, 1.15, 1.45, z - 0.13, z + 0.13);
    fz("dark", x - 0.1, x + 0.1, 1.22, 1.4, z + 0.135); // gauge
    tube("dark", [[x + 0.16, 1.25, z], [x + 0.32, 0.5, z + 0.05], [x + 0.2, 0.35, z + 0.08], [x + 0.08, 0.95, z + 0.1]], 0.02, [0, 0, 1], { bend: 0.15 });
  }

  // ---------- kiosk office ----------
  const KX0 = 4.0, KX1 = 8.4, KZ0 = -5.7, KZ1 = -2.7, KH = 3.0, T = 0.18;
  box("white", KX0, KX1, KH, KH + 0.25, KZ0, KZ1 + 0.1); // roof slab, slightly over the glass
  box("accent", KX0 - 0.015, KX1 + 0.015, KH + 0.06, KH + 0.18, KZ0 - 0.015, KZ1 + 0.115);
  box("white", KX0, KX1, G0, KH, KZ0, KZ0 + T); // back wall
  box("white", KX0, KX0 + T, G0, KH, KZ0, KZ1); // -X wall
  box("white", KX1 - T, KX1, G0, KH, KZ0, KZ1); // +X wall
  box("white", KX0, KX1, 2.55, KH, KZ1 - T, KZ1); // header over the glazing
  // inside, lit
  fz("glass", KX0 + T, KX1 - T, G0, KH, KZ0 + T + 0.002);
  fx("glass", KZ0 + T, KZ1 - T, G0, KH, KX0 + T + 0.002);
  fx("glass", KZ0 + T, KZ1 - T, G0, KH, KX1 - T - 0.002, -1);
  fy("glass", KX0 + T, KX1 - T, KZ0 + T, KZ1, G0 + 0.002);
  fy("glass", KX0 + T, KX1 - T, KZ0 + T, KZ1 - T, 2.55 - 0.002, -1);
  // counter with a register, a shelf behind
  box("accent", 4.5, 6.9, G0, 1.0, -4.5, -3.9);
  box("white", 4.45, 6.95, 1.0, 1.06, -4.55, -3.85);
  box("dark", 5.0, 5.4, 1.06, 1.22, -4.4, -4.05);
  box("dark", 5.15, 5.25, 1.22, 1.38, -4.35, -4.3);
  box("dark", 5.0, 5.4, 1.32, 1.56, -4.36, -4.3);
  box("white", 4.4, 6.6, G0, 1.9, KZ0 + T, KZ0 + T + 0.35);
  for (const y of [0.7, 1.3]) box("dark", 4.45, 6.55, y, y + 0.04, KZ0 + T + 0.3, KZ0 + T + 0.36);
  // glazing frame: kick plate, mullions, transom; a door on the +X side
  const GZ = KZ1 - 0.05;
  box("dark", KX0 + T, KX1 - T, G0, 0.3, GZ - 0.04, GZ + 0.04);
  box("dark", KX0 + T, KX1 - T, 2.5, 2.58, GZ - 0.04, GZ + 0.04);
  for (const x of [KX0 + T + 0.04, 5.3, 6.5, 7.15, KX1 - T - 0.04]) box("dark", x - 0.04, x + 0.04, G0, 2.55, GZ - 0.04, GZ + 0.05);
  box("dark", 7.15, KX1 - T, 2.2, 2.27, GZ - 0.04, GZ + 0.05); // door head
  box("dark", 7.75, 7.8, 1.0, 1.4, GZ + 0.05, GZ + 0.1); // handle
  box("dark", 7.2, 8.15, G0, G0 + 0.02, KZ1, KZ1 + 0.7); // mat
  // side window on the +X wall
  fx("dark", -5.2, -3.3, 0.95, 2.25, KX1 + 0.004);
  fx("glass", -5.12, -3.38, 1.03, 2.17, KX1 + 0.007);
  fx("dark", -4.28, -4.22, 1.03, 2.17, KX1 + 0.01);
  // tyre stack by the kiosk's -X wall
  const tyre = [[0.2, 0], [0.34, 0.01], [0.36, 0.11], [0.34, 0.21], [0.2, 0.22], [0.19, 0.11]];
  for (let i = 0; i < 4; i++) lathe("tyre", 3.35, G0 + i * 0.225, -5.1, tyre, 12);
  for (let i = 0; i < 2; i++) lathe("tyre", 3.4, G0 + i * 0.225, -4.25, tyre, 12);

  // ---------- car-wash gantry (-X, back) ----------
  {
    const X0 = -8.7, X1 = -5.9, Z = -3.6, Y = 3.15;
    for (const x of [-8.45, -6.15]) box("dark", x - 0.08, x + 0.08, G0, G0 + 0.05, -5.8, -1.2); // rails
    box("white", X0, X0 + 0.35, G0, Y, Z - 0.4, Z + 0.4);
    box("white", X1 - 0.35, X1, G0, Y, Z - 0.4, Z + 0.4);
    box("white", X0, X1, 2.7, Y, Z - 0.42, Z + 0.42);
    box("accent", X0 - 0.015, X1 + 0.015, 2.82, 3.0, Z - 0.435, Z + 0.435);
    for (const x of [X0 + 0.02, X1 - 0.37]) box("accent", x - 0.01, x + 0.36, G0, G0 + 0.3, Z - 0.41, Z + 0.41);
    // ridged brushes: two vertical, one along x on top
    const ridges = (len, r0, r1) => {
      const p = [[0, 0]];
      for (let k = 0, n = Math.round(len / 0.2); k <= n; k++) p.push([k % 2 ? r1 : r0, (k / n) * len]);
      p.push([0, len]);
      return p;
    };
    for (const x of [-7.85, -6.75]) {
      lathe("brush", x, 0.16, Z, ridges(1.8, 0.44, 0.38), 12);
      box("dark", x - 0.04, x + 0.04, 1.96, 2.7, Z - 0.04, Z + 0.04);
    }
    lathe("brush", -8.3, 2.33, Z, ridges(2.0, 0.3, 0.25), 12, "x");
  }

  // ---------- price pylon (-X, front) ----------
  {
    const PX = -8.1, PZ = 2.7, x0 = PX - 0.2, x1 = PX + 0.2, z0 = PZ - 0.62, z1 = PZ + 0.62;
    box("white", PX - 0.35, PX + 0.35, G0, 0.45, z0 - 0.1, z1 + 0.1); // footing
    for (const z of [z0 + 0.2, z1 - 0.2]) box("dark", PX - 0.1, PX + 0.1, 0.45, 2.7, z - 0.1, z + 0.1);
    box("white", x0, x1, 2.6, 6.6, z0, z1);
    box("accent", x0 - 0.04, x1 + 0.04, 6.6, 7.0, z0 - 0.04, z1 + 0.04);
    for (const s of [-1, 1]) {
      const xf = s > 0 ? x1 : x0;
      fx("accent", z0 + 0.15, z1 - 0.15, 5.7, 6.45, xf + s * 0.004, s); // blank logo square
      fx("panel", z0 + 0.33, z1 - 0.33, 5.82, 6.33, xf + s * 0.007, s);
      for (let r = 0; r < 4; r++) {
        const y = 2.8 + r * 0.7;
        fx("dark", z0 + 0.08, z1 - 0.08, y, y + 0.6, xf + s * 0.004, s);
        fx(r % 2 ? "amber" : "accent", z0 + 0.14, z0 + 0.34, y + 0.08, y + 0.52, xf + s * 0.007, s); // grade tab
        fx("panel", z0 + 0.42, z1 - 0.14, y + 0.08, y + 0.52, xf + s * 0.007, s); // blank price
      }
    }
  }

  // ---------- traffic cones ----------
  const cone = [[0, 0], [0.2, 0], [0.2, 0.04], [0.13, 0.04], [0.035, 0.7], [0, 0.7]];
  const band = [[0.088, 0.3], [0.106, 0.3], [0.088, 0.44], [0.07, 0.44]];
  for (const [x, z] of [[-5.0, 3.05], [-0.6, 3.1], [4.7, 3.05], [-5.3, -4.9]]) {
    lathe("accent", x, G0, z, cone, 10);
    lathe("line", x, G0, z, band, 10);
  }

  // ---------- meshes ----------
  // [base, shade, threshold, hull px (0 = none)]; G is the glow threshold (base everywhere)
  const G = -0.25;
  const MAT = {
    ground: [c.ground, c.groundShade, 0.1, 4],
    white: [c.white, c.whiteShade, 0.1, 3],
    accent: [c.accent, c.accent, G, 2.5],
    amberInk: [c.amber, c.amber, G, 2.5],
    soffit: [c.amber, c.amber, G, 0],
    amber: [c.amber, c.amber, G, 0],
    night: [c.night, c.night, G, 0],
    pool: [c.pool, c.pool, G, 0],
    glass: [c.glass, c.glass, G, 0],
    panel: [c.panel, c.panel, G, 0],
    dark: [c.dark, c.dark, G, 2.5],
    tyre: [c.dark, c.night, 0.1, 2.5],
    brush: [c.accent, c.whiteShade, 0.1, 3],
    line: [c.line, c.line, G, 0],
  };
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
