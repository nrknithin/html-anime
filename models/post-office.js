// post-office.js - the inside of a small-town post office (anime slice-of-life), a static cutaway set: two walls and a
// floor, the open sides toward the camera.
// Contract: harness/lab/README.md. Meters, +Y up, the open (cutaway) sides face +X and +Z so a camera in the lit
// front-left quadrant sees in. A service counter runs the full width across the back third of the room, parallel to
// the -Z wall: the clerk side behind it (parcel stack, sorting pigeonholes, clock on the -Z wall), the customer side in
// front. The -X wall carries the bank of PO boxes and the waiting bench. Stands on y = 0 (floor top 0.03, joints.floor),
// centred on the room.
//
// Construction (boxes, lathes, drums, polygon tubes and flat panels; all triangle soups merged per material, flat
// shaded so boards read crisp; every closed part is wound away from a point inside it, never by hand):
//   SHELL     a pale floor with a tile grid; -X and -Z walls with a green board wainscot to a rail at 0.9 (board seams as
//             hair bands) and plaster above, a top board; posts at the corner and the cut ends.
//   COUNTER   a green panelled body on a dark kick, a pale top slab with a customer ledge; a glass partition on it: dark
//             rails and mullions, the glass itself left open and drawn only as sky glint streaks, so the clerk side
//             reads through it. Two service windows: a heavier frame, a round speaking grille and a deal tray under a
//             slot, each with a blank hanging sign plate (red header). A letter scale sits at window 1 (red body, dial,
//             pan), a tiered rubber-stamp rack at window 2 on the clerk side.
//   CUSTOMER  an envelope spinner and a postcard spinner (wire tiers, blank cards in pockets, turned 30 deg); an island
//             writing desk on legs with two sloped tops, a form shelf on the ridge and three pens a side, each on a
//             slack chain from a brass holder; a red queue-ticket machine on a pedestal with a slip sticking out.
//   LAYOUT    set by the hero camera (az 52, low): the windows sit left of centre and both spinners at the counter's
//             open +X end (one on the floor, a small one on the ledge), so neither hides a service window.
//   FITTINGS  a bank of 6 x 7 brass PO-box doors (keyhole and blank plate each) in a dark cabinet; a waiting bench with red
//             cushion and back pad under a notice board (blank notices); a parcel stack (string-tied boxes) and a wall of sorting pigeonholes behind the counter; a
//             round wall clock.
// Proportions (real size, base unit the wall height 2.8): room 4.8 x 3.8 inside; counter 1.0 high, 0.6 deep at
//   z -0.95..-0.35, partition to 2.15; windows 0.66 x 0.58; PO bank 1.25 wide x 1.9 high, 0.35 deep; spinners 1.6 /
//   1.45 tall, 0.36 across; desk 1.2 x 0.6 at 0.95; bench seat 0.44 high.
// Options: build(THREE, kit, colors, { height = 2.8 }): scales the whole set so the wall top is `height`.
// Poses: rest. No clips.
// Colours (meadow): plaster moon #f7f3e1 / sky #d7ecef; wainscot and counter body iris #3f8a47 / hair #2c5131; trim and
//   frames hair flat; tops and paper sclera #f6f3ee / sky; floor sky / line #a9d16e; red parts accent #d9483b flat;
//   brass (PO doors, pen holders) practical #f2c94c / line; parcels skin #f0c2ae / practical; flat bands: seams and
//   keyholes hair, glass glints sky, tile grid sclera.
// Meshes: 12, one per material. 7.4k triangles.
// Joints: anchors floor, counter, window1, window2, poBoxes, bench, desk, ticket, spinnerA, spinnerB, parcels.

export const meta = {
  name: "post-office",
  height: 2.8,
  script: "meadow",
  colors: {
    plaster: "#f7f3e1", plasterShade: "#d7ecef",
    green: "#3f8a47", greenShade: "#2c5131",
    wood: "#2c5131",
    top: "#f6f3ee", topShade: "#d7ecef",
    floor: "#d7ecef", floorShade: "#a9d16e",
    red: "#d9483b",
    brass: "#f2c94c", brassShade: "#a9d16e",
    parcel: "#f0c2ae", parcelShade: "#f2c94c",
    paper: "#f6f3ee", paperShade: "#d7ecef",
    dark: "#2c5131", glint: "#d7ecef", grid: "#f6f3ee",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height } = opts;
  const c = { ...meta.colors, ...colors };
  const root = new THREE.Group();
  root.name = "post-office";
  const set = new THREE.Group(); // the uniform size scale lives here
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
  // a box turned by yaw `a` about its centre (cx, cy, cz), half sizes hx, hy, hz in its own frame
  function obox(key, cx, cy, cz, hx, hy, hz, a) {
    const ca = Math.cos(a), sa = Math.sin(a);
    const P = (i, j, k) => [cx + i * hx * ca + k * hz * sa, cy + j * hy, cz - i * hx * sa + k * hz * ca];
    hex(key, [P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1), P(-1, 1, -1), P(1, 1, -1), P(1, 1, 1), P(-1, 1, 1)]);
  }
  // surface of revolution about (cx, cz): profile [[r, y], ...] from the bottom centre to the top centre
  function lathe(key, prof, cx, cz, n = 12) {
    const ym = prof.reduce((s, p) => s + p[1], 0) / prof.length;
    const ref = [cx, ym, cz];
    const P = (p, j) => { const a = (j / n) * Math.PI * 2; return [cx + p[0] * Math.cos(a), p[1], cz + p[0] * Math.sin(a)]; };
    for (let i = 0; i + 1 < prof.length; i++)
      for (let j = 0; j < n; j++) {
        const flat = Math.abs(prof[i][1] - prof[i + 1][1]) < 1e-6;
        const cap = prof[i][0] < 1e-6 || prof[i + 1][0] < 1e-6;
        const yr = [cx, (prof[i][1] + prof[i + 1][1]) / 2, cz];
        quad(key, P(prof[i], j), P(prof[i], j + 1), P(prof[i + 1], j + 1), P(prof[i + 1], j), flat || cap ? ref : yr);
      }
  }
  // polygon tube along a polyline with radius r, closed at both ends
  function tube(key, pts, r, n = 6) {
    const rings = pts.map((p, i) => {
      const d = nrm(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
      const up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
      const e1 = nrm(cross(d, up)), e2 = cross(e1, d);
      return Array.from({ length: n }, (_, j) => {
        const t = (j / n) * Math.PI * 2 + Math.PI / n;
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
  // a drum (cylinder) whose axis is +Z, from z0 to z1, centre (cx, cy)
  function drumZ(key, cx, cy, z0, z1, r, n = 16) {
    const ref = [cx, cy, (z0 + z1) / 2];
    const P = (j, z) => { const a = (j / n) * Math.PI * 2; return [cx + r * Math.cos(a), cy + r * Math.sin(a), z]; };
    for (let j = 0; j < n; j++) {
      quad(key, P(j, z0), P(j + 1, z0), P(j + 1, z1), P(j, z1), ref);
      tri(key, [cx, cy, z1], P(j, z1), P(j + 1, z1), ref);
      tri(key, [cx, cy, z0], P(j, z0), P(j + 1, z0), ref);
    }
  }
  // flat shapes on a plane: W(u, v) -> world, back(u, v) a point behind it
  const wallZ = (z) => ({ W: (u, v) => [u, v, z], back: (u, v) => [u, v, z - 1] }); // facing +Z
  const wallX = (x) => ({ W: (u, v) => [x, v, u], back: (u, v) => [x - 1, v, u] }); // facing +X
  const flatY = (y) => ({ W: (u, v) => [u, y, v], back: (u, v) => [u, y - 1, v] }); // facing +Y
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
  function anchor(name, x, y, z) { const a = new THREE.Group(); a.name = name; a.position.set(x, y, z); set.add(a); joints[name] = a; }

  // ---------- dimensions ----------
  const X0 = -2.4, X1 = 2.4, Z0 = -1.9, Z1 = 1.9, T = 0.1, H = 2.8, FT = 0.03, WS = 0.9;
  const CZ0 = -0.95, CZ1 = -0.35, CH = 1.0, PZ = -0.66; // counter depth, height, partition plane
  const PT = 2.15; // partition top

  // ---------- floor ----------
  box("floor", X0 - T, X1, 0, FT, Z0 - T, Z1);
  const fl = flatY(FT + 0.002);
  for (let x = X0 + 0.4; x < X1 - 0.05; x += 0.4) rect("grid", fl, x - 0.008, x + 0.008, Z0, Z1);
  for (let z = Z0 + 0.4; z < Z1 - 0.05; z += 0.4) rect("grid", fl, X0, X1, z - 0.008, z + 0.008);

  // ---------- walls ----------
  box("green", X0 - T, X1, FT, WS, Z0 - T, Z0);
  box("plaster", X0 - T, X1, WS, H, Z0 - T, Z0 - 0.01);
  box("green", X0 - T, X0, FT, WS, Z0, Z1);
  box("plaster", X0 - T, X0 - 0.01, WS, H, Z0, Z1);
  // board seams on the wainscot
  for (let x = X0 + 0.15; x < X1 - 0.05; x += 0.15) rect("dark", wallZ(Z0 + 0.002), x - 0.006, x + 0.006, FT + 0.1, WS - 0.04);
  const wx = wallX(X0 + 0.002);
  for (let z = Z0 + 0.15; z < Z1 - 0.05; z += 0.15) rect("dark", wx, z - 0.006, z + 0.006, FT + 0.1, WS - 0.04);
  // trim: skirting, wainscot rail, top board, posts
  box("wood", X0, X1, FT, FT + 0.1, Z0, Z0 + 0.015);
  box("wood", X0, X0 + 0.015, FT, FT + 0.1, Z0, Z1);
  box("wood", X0, X1, WS - 0.04, WS + 0.02, Z0, Z0 + 0.035);
  box("wood", X0, X0 + 0.035, WS - 0.04, WS + 0.02, Z0, Z1);
  box("wood", X0, X1, H - 0.12, H, Z0, Z0 + 0.03);
  box("wood", X0, X0 + 0.03, H - 0.12, H, Z0, Z1);
  box("wood", X0 - T - 0.02, X0 + 0.06, FT, H + 0.02, Z0 - T - 0.02, Z0 + 0.06); // corner post
  box("wood", X1 - 0.06, X1 + 0.02, FT, H + 0.02, Z0 - T - 0.02, Z0 + 0.02); // cut end posts
  box("wood", X0 - T - 0.02, X0 + 0.02, FT, H + 0.02, Z1 - 0.06, Z1 + 0.02);

  // ---------- counter ----------
  box("wood", X0, X1, FT, FT + 0.1, CZ0 + 0.04, CZ1 - 0.04); // kick
  box("green", X0, X1, FT + 0.1, CH - 0.03, CZ0, CZ1 - 0.02); // body
  // raised panels on the customer face
  const cf = wallZ(CZ1 - 0.018);
  for (let x = X0 + 0.1; x + 0.5 < X1; x += 0.6) {
    rect("dark", cf, x, x + 0.5, 0.24, 0.255);
    rect("dark", cf, x, x + 0.5, CH - 0.15, CH - 0.135);
    rect("dark", cf, x, x + 0.015, 0.24, CH - 0.135);
    rect("dark", cf, x + 0.485, x + 0.5, 0.24, CH - 0.135);
  }
  box("top", X0, X1 + 0.01, CH - 0.03, CH + 0.02, CZ0 - 0.03, CZ1 + 0.05); // top slab
  // the partition: bottom rail, top rail, mullions, glass glints
  box("wood", X0, X1, CH + 0.02, CH + 0.08, PZ - 0.03, PZ + 0.03);
  box("wood", X0, X1, PT - 0.08, PT, PZ - 0.035, PZ + 0.035);
  const W1 = -1.0, W2 = 0.4, WW = 0.66, WY0 = CH + 0.08, WY1 = CH + 0.66;
  const mull = [X0 + 0.04, -1.75, -0.3, 1.15, X1 - 0.04];
  for (const x of mull) box("wood", x - 0.035, x + 0.035, CH + 0.02, PT, PZ - 0.035, PZ + 0.035);
  const gp = wallZ(PZ + 0.004);
  for (let i = 0; i + 1 < mull.length; i++) {
    const a = mull[i] + 0.035, b = mull[i + 1] - 0.035, m = a + (b - a) * 0.62;
    // two slanted glint streaks per pane
    quad("glint", gp.W(m - 0.18, CH + 0.5), gp.W(m - 0.08, CH + 0.5), gp.W(m + 0.12, PT - 0.25), gp.W(m + 0.02, PT - 0.25), gp.back(m, 1.6));
    quad("glint", gp.W(m + 0.0, CH + 0.62), gp.W(m + 0.04, CH + 0.62), gp.W(m + 0.2, PT - 0.32), gp.W(m + 0.16, PT - 0.32), gp.back(m, 1.6));
  }
  // service windows: frame, speaking grille, slot tray, hanging sign
  for (const [i, wcx] of [[1, W1], [2, W2]]) {
    const x0 = wcx - WW / 2, x1 = wcx + WW / 2;
    box("wood", x0 - 0.05, x0, WY0, WY1 + 0.05, PZ - 0.045, PZ + 0.045);
    box("wood", x1, x1 + 0.05, WY0, WY1 + 0.05, PZ - 0.045, PZ + 0.045);
    box("wood", x0 - 0.05, x1 + 0.05, WY1, WY1 + 0.05, PZ - 0.045, PZ + 0.045);
    box("wood", x0, x1, WY0 + 0.07, WY0 + 0.1, PZ - 0.03, PZ + 0.03); // rail over the slot
    // speaking grille: a pale disc with a dark rim and holes
    drumZ("wood", wcx, CH + 0.4, PZ - 0.01, PZ + 0.02, 0.085, 14);
    drumZ("top", wcx, CH + 0.4, PZ + 0.02, PZ + 0.03, 0.07, 14);
    for (const [du, dv] of [[0, 0], [0.032, 0], [-0.032, 0], [0, 0.032], [0, -0.032]])
      fan("dark", wallZ(PZ + 0.032), disc(wcx + du, CH + 0.4 + dv, 0.009, 6));
    // deal tray under the slot, through the glass
    box("wood", wcx - 0.2, wcx + 0.2, CH + 0.02, CH + 0.035, PZ - 0.2, PZ + 0.2);
    box("top", wcx - 0.18, wcx + 0.18, CH + 0.035, CH + 0.04, PZ - 0.18, PZ + 0.18);
    // blank sign plate hung from the top rail on two rods
    const sy0 = WY1 + 0.2, sy1 = PT - 0.14;
    tube("wood", [[wcx - 0.2, PT - 0.08, PZ + 0.04], [wcx - 0.2, sy1, PZ + 0.04]], 0.006, 4);
    tube("wood", [[wcx + 0.2, PT - 0.08, PZ + 0.04], [wcx + 0.2, sy1, PZ + 0.04]], 0.006, 4);
    box("paper", wcx - 0.28, wcx + 0.28, sy0, sy1, PZ + 0.03, PZ + 0.05);
    box("red", wcx - 0.28, wcx + 0.28, sy1 - 0.07, sy1, PZ + 0.025, PZ + 0.055);
    rect("dark", wallZ(PZ + 0.052), wcx - 0.18, wcx + 0.18, sy0 + 0.07, sy0 + 0.09); // blank text bar
    anchor(`window${i}`, wcx, CH + 0.04, PZ);
  }
  anchor("counter", 0, CH + 0.02, (CZ0 + CZ1) / 2);

  // letter scale on the customer ledge beside window 1: red body, dial facing +Z, pan on top
  {
    const sx = W1 + 0.52, sz = CZ1 - 0.12, b = CH + 0.02;
    box("red", sx - 0.12, sx + 0.12, b, b + 0.05, sz - 0.1, sz + 0.1);
    box("red", sx - 0.09, sx + 0.09, b + 0.05, b + 0.24, sz - 0.07, sz + 0.03);
    drumZ("top", sx, b + 0.16, sz + 0.03, sz + 0.045, 0.075, 16);
    drumZ("wood", sx, b + 0.16, sz + 0.025, sz + 0.04, 0.083, 16);
    tube("dark", [[sx, b + 0.16, sz + 0.05], [sx + 0.045, b + 0.2, sz + 0.05]], 0.005, 4); // needle
    for (let k = 0; k < 7; k++) {
      const a = Math.PI * (0.15 + (k / 6) * 0.7);
      const p = [sx + 0.06 * Math.cos(a), b + 0.16 + 0.06 * Math.sin(a), sz + 0.048];
      box("dark", p[0] - 0.003, p[0] + 0.003, p[1] - 0.003, p[1] + 0.003, sz + 0.045, sz + 0.05);
    }
    tube("wood", [[sx, b + 0.24, sz - 0.02], [sx, b + 0.28, sz - 0.02]], 0.01, 6);
    lathe("brass", [[0, b + 0.28], [0.11, b + 0.28], [0.13, b + 0.31], [0.12, b + 0.315], [0, b + 0.3]], sx, sz - 0.02, 16);
  }

  // rubber-stamp rack on the clerk side of window 2: two tiers of hanging stamps (red handles)
  {
    const rx = W2 + 0.5, rz = CZ0 + 0.12, b = CH + 0.02;
    box("wood", rx - 0.2, rx + 0.2, b, b + 0.03, rz - 0.07, rz + 0.07);
    box("wood", rx - 0.2, rx - 0.18, b, b + 0.42, rz - 0.015, rz + 0.015);
    box("wood", rx + 0.18, rx + 0.2, b, b + 0.42, rz - 0.015, rz + 0.015);
    for (const ty of [b + 0.2, b + 0.4]) {
      box("wood", rx - 0.2, rx + 0.2, ty - 0.02, ty, rz - 0.06, rz + 0.06);
      for (let k = 0; k < 5; k++) {
        const x = rx - 0.14 + k * 0.07;
        tube("red", [[x, ty - 0.02, rz + 0.03], [x, ty - 0.09, rz + 0.03]], 0.013, 6); // handle
        box("dark", x - 0.02, x + 0.02, ty - 0.13, ty - 0.09, rz + 0.01, rz + 0.05); // die block
      }
    }
  }

  // ---------- behind the counter: sorting pigeonholes, parcel stack, clock ----------
  {
    const px0 = 0.0, px1 = 2.2, py0 = 1.0, py1 = 2.2, d = 0.3, nc = 7, nr = 4;
    box("wood", px0, px1, py0 - 0.05, py0, Z0, Z0 + d);
    box("wood", px0, px1, py1, py1 + 0.04, Z0, Z0 + d);
    for (let i = 0; i <= nc; i++) {
      const x = px0 + (i * (px1 - px0)) / nc;
      box("wood", x - 0.015, x + 0.015, py0, py1, Z0, Z0 + d);
    }
    for (let j = 1; j < nr; j++) {
      const y = py0 + (j * (py1 - py0)) / nr;
      box("wood", px0, px1, y - 0.012, y + 0.012, Z0, Z0 + d);
    }
    // letters standing in some cells (a fixed pattern)
    const fill = [1, 0, 2, 1, 0, 1, 2, 0, 1, 1, 2, 0, 1, 0, 0, 2, 1, 1, 0, 1, 2, 1, 0, 1, 1, 0, 2, 1];
    const cw = (px1 - px0) / nc, ch = (py1 - py0) / nr;
    for (let j = 0; j < nr; j++)
      for (let i = 0; i < nc; i++) {
        const n = fill[j * nc + i];
        for (let k = 0; k < n; k++) {
          const x = px0 + i * cw + 0.06 + k * 0.05, y = py0 + j * ch + 0.012;
          box("paper", x, x + 0.015 + 0.12 - k * 0.04, y, y + ch * (0.7 - k * 0.15), Z0 + 0.04 + k * 0.05, Z0 + 0.05 + k * 0.05);
        }
      }
    // clock
    const cx = -1.6, cy = 2.4;
    drumZ("wood", cx, cy, Z0, Z0 + 0.05, 0.18, 18);
    drumZ("top", cx, cy, Z0 + 0.05, Z0 + 0.055, 0.155, 18);
    tube("dark", [[cx, cy, Z0 + 0.06], [cx + 0.02, cy + 0.11, Z0 + 0.06]], 0.007, 4);
    tube("dark", [[cx, cy, Z0 + 0.065], [cx + 0.075, cy - 0.03, Z0 + 0.065]], 0.007, 4);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2, r = 0.13;
      const p = [cx + r * Math.cos(a), cy + r * Math.sin(a)];
      box("dark", p[0] - 0.007, p[0] + 0.007, p[1] - 0.007, p[1] + 0.007, Z0 + 0.054, Z0 + 0.058);
    }
  }
  {
    // parcels: string-tied boxes stacked in the -X back corner behind the counter
    const parcels = [
      // cx, cz, w, d, h, y0, yaw
      [-2.0, -1.6, 0.5, 0.42, 0.34, FT, 0],
      [-1.45, -1.62, 0.5, 0.38, 0.4, FT, 0.08],
      [-0.9, -1.6, 0.42, 0.4, 0.3, FT, -0.05],
      [-1.95, -1.6, 0.44, 0.36, 0.3, FT + 0.34, 0.1],
      [-1.45, -1.6, 0.38, 0.32, 0.26, FT + 0.4, -0.08],
      [-0.92, -1.58, 0.32, 0.3, 0.24, FT + 0.3, 0.12],
      [-1.95, -1.62, 0.34, 0.3, 0.24, FT + 0.64, -0.06],
      [-1.5, -1.6, 0.28, 0.26, 0.2, FT + 0.66, 0.15],
      [-1.95, -1.6, 0.26, 0.22, 0.18, FT + 0.88, 0.05],
      [-1.35, -1.2, 0.36, 0.3, 0.28, FT, 0.2],
      [-1.5, -1.6, 0.42, 0.36, 0.28, FT + 0.86, -0.1],
      [-1.95, -1.62, 0.36, 0.3, 0.3, FT + 1.06, 0.12],
      [-1.45, -1.58, 0.3, 0.28, 0.22, FT + 1.14, 0.2],
      [-0.92, -1.6, 0.36, 0.32, 0.3, FT + 0.54, 0.0],
      [-0.9, -1.58, 0.26, 0.24, 0.2, FT + 0.84, -0.15],
    ];
    for (const [cx, cz, w, d, h, y0, a] of parcels) {
      obox("parcel", cx, y0 + h / 2, cz, w / 2, h / 2, d / 2, a);
      obox("dark", cx, y0 + h / 2, cz, 0.012, h / 2 + 0.004, d / 2 + 0.004, a); // string around
      obox("dark", cx, y0 + h + 0.002, cz, w / 2 + 0.004, 0.004, 0.012, a);
      obox("dark", cx, y0 + h / 2, cz + (d / 2 + 0.003) * Math.cos(a), w / 2 + 0.002, 0.006, 0.003, a);
      obox("paper", cx - (w * 0.2) * Math.cos(a), y0 + h * 0.62, cz + (d / 2 + 0.006) * Math.cos(a) + (w * 0.2) * Math.sin(a), w * 0.13, h * 0.13, 0.004, a); // label
    }
    anchor("parcels", -1.45, FT, -1.6);
  }

  // ---------- PO boxes: a bank of brass doors on the -X wall ----------
  {
    const bz0 = -0.25, bz1 = 1.0, by0 = 0.15, by1 = 2.05, d = 0.35, fx = X0 + d, nc = 6, nr = 7;
    box("wood", X0, fx, FT, by1 + 0.08, bz0 - 0.04, bz1 + 0.04); // cabinet
    box("wood", X0, fx + 0.03, by1 + 0.08, by1 + 0.14, bz0 - 0.06, bz1 + 0.06); // cornice
    const fw = wallX(fx + 0.004), cw = (bz1 - bz0) / nc, ch = (by1 - by0) / nr;
    for (let j = 0; j < nr; j++)
      for (let i = 0; i < nc; i++) {
        const u0 = bz0 + i * cw + 0.012, u1 = bz0 + (i + 1) * cw - 0.012, v0 = by0 + j * ch + 0.012, v1 = by0 + (j + 1) * ch - 0.012;
        box("brass", fx, fx + 0.012, v0, v1, u0, u1);
        const uc = (u0 + u1) / 2;
        rect("paper", wallX(fx + 0.014), uc - 0.045, uc + 0.045, v1 - 0.06, v1 - 0.03); // blank number plate
        fan("dark", wallX(fx + 0.014), disc(u1 - 0.035, (v0 + v1) / 2 - 0.02, 0.012, 6)); // keyhole
      }
    anchor("poBoxes", fx, by0, (bz0 + bz1) / 2);
  }

  // ---------- waiting bench on the -X wall ----------
  {
    const z0 = 1.15, z1 = Z1 - 0.12, sx0 = X0 + 0.05, sx1 = X0 + 0.5, SEAT = 0.44;
    for (const z of [z0 + 0.05, z1 - 0.05])
      for (const x of [sx0 + 0.04, sx1 - 0.05]) box("wood", x - 0.025, x + 0.025, FT, SEAT - 0.05, z - 0.025, z + 0.025);
    box("wood", sx0, sx1, SEAT - 0.07, SEAT - 0.03, z0, z1);
    box("wood", sx0, sx1, 0.12, 0.15, z0 + 0.04, z1 - 0.04); // stretcher shelf
    box("red", sx0 + 0.02, sx1 - 0.01, SEAT - 0.03, SEAT + 0.04, z0 + 0.02, z1 - 0.02); // cushion
    box("wood", X0, X0 + 0.03, SEAT + 0.1, SEAT + 0.44, z0 + 0.02, z0 + 0.06); // backrest brackets
    box("wood", X0, X0 + 0.03, SEAT + 0.1, SEAT + 0.44, z1 - 0.06, z1 - 0.02);
    box("red", X0 + 0.03, X0 + 0.08, SEAT + 0.16, SEAT + 0.36, z0, z1); // backrest pad
    anchor("bench", (sx0 + sx1) / 2, SEAT, (z0 + z1) / 2);
  }

  // ---------- notice board over the bench: blank notices, red header strips ----------
  {
    const z0 = 1.2, z1 = 1.78, y0 = 1.15, y1 = 1.8;
    box("wood", X0, X0 + 0.04, y0, y1, z0, z1);
    box("green", X0 + 0.04, X0 + 0.05, y0 + 0.03, y1 - 0.03, z0 + 0.03, z1 - 0.03);
    for (const [u0, u1, v0, v1, hd] of [[1.25, 1.47, 1.42, 1.74, 1], [1.51, 1.73, 1.48, 1.72, 0], [1.27, 1.45, 1.2, 1.38, 0], [1.5, 1.74, 1.19, 1.43, 1]]) {
      box("paper", X0 + 0.05, X0 + 0.056, v0, v1, u0, u1);
      if (hd) rect("red", wallX(X0 + 0.058), u0, u1, v1 - 0.05, v1);
      rect("dark", wallX(X0 + 0.058), u0 + 0.03, u1 - 0.05, (v0 + v1) / 2 - 0.01, (v0 + v1) / 2);
      rect("dark", wallX(X0 + 0.058), u0 + 0.03, u1 - 0.08, (v0 + v1) / 2 - 0.05, (v0 + v1) / 2 - 0.04);
    }
  }

  // ---------- writing desk: an island with two sloped tops, a form shelf and pens on chains ----------
  {
    const dx = -0.5, dz = 1.3, w = 1.2, dp = 0.62, hl = 0.9, hr = 1.0;
    for (const sx of [-1, 1]) {
      const lx = dx + sx * (w / 2 - 0.08);
      for (const sz of [-1, 1]) box("wood", lx - 0.03, lx + 0.03, FT, hl - 0.02, dz + sz * (dp / 2 - 0.1) - 0.03, dz + sz * (dp / 2 - 0.1) + 0.03); // legs
      box("wood", lx - 0.025, lx + 0.025, 0.25, 0.3, dz - dp / 2 + 0.1, dz + dp / 2 - 0.1); // side stretcher
      box("wood", lx - 0.025, lx + 0.025, hl - 0.12, hl - 0.04, dz - dp / 2 + 0.1, dz + dp / 2 - 0.1); // apron
    }
    box("wood", dx - w / 2 + 0.1, dx + w / 2 - 0.1, 0.3, 0.33, dz - 0.18, dz + 0.18); // low shelf
    // two sloped tops, falling from the ridge (hr) to the edges (hl), as solid wedges
    for (const sz of [-1, 1]) {
      const zr = dz + sz * 0.05, ze = dz + sz * dp / 2;
      const P = (x, y, z) => [x, y, z];
      hex("top", [P(dx - w / 2, hl - 0.04, ze), P(dx + w / 2, hl - 0.04, ze), P(dx + w / 2, hr - 0.04, zr), P(dx - w / 2, hr - 0.04, zr),
        P(dx - w / 2, hl, ze), P(dx + w / 2, hl, ze), P(dx + w / 2, hr, zr), P(dx - w / 2, hr, zr)]);
      box("wood", dx - w / 2, dx + w / 2, hl - 0.06, hl + 0.015, ze - sz * 0.02, ze + sz * 0.015); // lip, proud of the top's edge
    }
    // form shelf on the ridge with stacked blank forms
    box("wood", dx - w / 2 + 0.02, dx + w / 2 - 0.02, hr, hr + 0.03, dz - 0.05, dz + 0.05);
    box("wood", dx - w / 2 + 0.02, dx + w / 2 - 0.02, hr + 0.03, hr + 0.22, dz - 0.012, dz + 0.012);
    for (let k = 0; k < 4; k++) {
      const x = dx - w / 2 + 0.12 + k * 0.27;
      obox("paper", x + 0.06, hr + 0.12, dz + 0.035, 0.09, 0.11, 0.008, 0);
      obox("paper", x + 0.06, hr + 0.12, dz - 0.035, 0.09, 0.11, 0.008, 0);
      box("wood", x - 0.04, x - 0.03, hr + 0.03, hr + 0.18, dz - 0.05, dz + 0.05); // dividers
    }
    // pens on chains, three a side: a brass holder at the edge, a chain looping down to a pen lying on the slope
    for (const sz of [-1, 1])
      for (let k = 0; k < 3; k++) {
        const x = dx - 0.38 + k * 0.38;
        const ze = dz + sz * (dp / 2 - 0.06), slope = (z) => hr - ((hr - hl) * (Math.abs(z - dz) - 0.05)) / (dp / 2 - 0.05);
        const yh = slope(ze) + 0.01;
        lathe("brass", [[0, yh - 0.005], [0.022, yh - 0.005], [0.018, yh + 0.025], [0, yh + 0.025]], x, ze, 8); // holder
        const zp = dz + sz * 0.17, yp = slope(zp) + 0.012;
        tube("dark", [[x + 0.02, yp, zp], [x + 0.13, yp, zp - sz * 0.03]], 0.008, 6); // pen
        // the chain lies slack on the slope from the holder to the pen's cap, a little S in plan
        const chain = [0, 0.25, 0.5, 0.75, 1].map((t) => {
          const z = ze + (zp - ze) * t;
          return [x + 0.02 * t + 0.025 * Math.sin(t * Math.PI * 2), slope(z) + 0.007, z];
        });
        chain[0][1] = yh + 0.01;
        tube("dark", chain, 0.0045, 4); // chain
      }
    anchor("desk", dx, hr, dz);
  }

  // ---------- queue-ticket machine on a pedestal near the counter's left end ----------
  {
    const tx = -1.0, tz = 0.0;
    lathe("wood", [[0, FT], [0.17, FT], [0.17, FT + 0.03], [0.04, FT + 0.05], [0, FT + 0.05]], tx, tz, 14);
    tube("wood", [[tx, FT + 0.04, tz], [tx, 1.0, tz]], 0.028, 8);
    const b = 1.0, a = 0.35;
    obox("red", tx, b + 0.17, tz, 0.15, 0.17, 0.11, a);
    obox("red", tx, b + 0.36, tz - 0.015 * 0, 0.16, 0.02, 0.125, a); // cap
    const ca = Math.cos(a), sa = Math.sin(a);
    const fz = 0.11; // front face offset
    const F = (u, v, o = 0) => [tx + u * ca + (fz + o) * sa, b + v, tz - u * sa + (fz + o) * ca];
    const fref = [tx, b + 0.17, tz];
    quad("dark", F(-0.1, 0.22, 0.003), F(0.1, 0.22, 0.003), F(0.1, 0.3, 0.003), F(-0.1, 0.3, 0.003), fref); // display
    quad("brass", F(-0.07, 0.24, 0.006), F(0.07, 0.24, 0.006), F(0.07, 0.28, 0.006), F(-0.07, 0.28, 0.006), fref); // lit digits field
    obox("brass", ...F(0.0, 0.13, 0.015), 0.045, 0.045, 0.015, a); // button
    obox("dark", ...F(0.0, 0.05, 0.004), 0.07, 0.008, 0.004, a); // slot
    obox("paper", ...F(0.0, 0.0, 0.03), 0.05, 0.004, 0.035, a); // ticket slip sticking out
    anchor("ticket", tx, b + 0.17, tz);
  }

  // ---------- spinner racks: envelopes (tall) and postcards ----------
  function spinner(name, sx, sz, tiers, ht, cw, chh, yaw, R, y0) {
    // cross feet, pole, wire tiers with blank cards in pockets on four faces
    if (y0 < 0.5) for (const a of [yaw, yaw + Math.PI / 2]) obox("wood", sx, y0 + 0.02, sz, 0.24, 0.02, 0.025, a);
    else lathe("wood", [[0, y0], [0.1, y0], [0.1, y0 + 0.025], [0, y0 + 0.03]], sx, sz, 12); // table base
    tube("wood", [[sx, y0 + 0.02, sz], [sx, ht, sz]], 0.018 * (R / 0.18 + 1) / 2, 8);
    lathe("red", [[0, ht], [0.035, ht], [0.035, ht + 0.06], [0, ht + 0.07]], sx, sz, 10); // finial
    const lo = y0 + (y0 < 0.5 ? 0.32 : 0.08);
    const step = (ht - lo) / tiers;
    for (let t = 0; t < tiers; t++) {
      const y = lo + t * step;
      for (let f = 0; f < 4; f++) {
        const a = yaw + (f * Math.PI) / 2;
        const ox = Math.sin(a), oz = Math.cos(a); // outward normal of the face
        const cx = sx + ox * R, cz = sz + oz * R;
        obox("wood", cx, y, cz, R + 0.01, 0.008, 0.012, a); // pocket lip wire
        obox("wood", sx + ox * (R - 0.04), y + step - 0.03, sz + oz * (R - 0.04), R, 0.006, 0.006, a); // back wire
        for (const du of [-1, 1]) {
          const u = du * (R / 2);
          const px = cx + u * Math.cos(a) - ox * 0.03, pz = cz - u * Math.sin(a) - oz * 0.03;
          // the card leans back a little: a thin box, its top pushed in
          const hy = chh / 2, lean = 0.025;
          const P = (i, j, k) => [px + i * (cw / 2) * Math.cos(a) + (k * 0.004 - (j + 1) * lean * 0.5) * ox, y + 0.01 + (j + 1) * hy, pz - i * (cw / 2) * Math.sin(a) + (k * 0.004 - (j + 1) * lean * 0.5) * oz];
          hex("paper", [P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1), P(-1, 1, -1), P(1, 1, -1), P(1, 1, 1), P(-1, 1, 1)]);
        }
      }
    }
    anchor(name, sx, ht, sz);
  }
  spinner("spinnerA", 2.05, 0.05, 5, 1.6, 0.15, 0.11, Math.PI / 6, 0.18, FT);
  spinner("spinnerB", 2.1, CZ1 - 0.17, 3, CH + 0.62, 0.08, 0.12, -Math.PI / 9, 0.11, CH + 0.02);

  // ---------- meshes ----------
  const MAT = {
    plaster: [c.plaster, c.plasterShade, 0.1, 2.5],
    green: [c.green, c.greenShade, 0.1, 2.5],
    wood: [c.wood, c.wood, 0.1, 2.5],
    top: [c.top, c.topShade, 0.1, 2.5],
    floor: [c.floor, c.floorShade, 0.1, 2.5],
    red: [c.red, c.red, 0.1, 2],
    brass: [c.brass, c.brassShade, 0.1, 1.5],
    parcel: [c.parcel, c.parcelShade, 0.1, 2],
    paper: [c.paper, c.paperShade, 0.1, 1.5],
    dark: [c.dark, c.dark, 0.1, 0],
    glint: [c.glint, c.glint, 0.1, 0],
    grid: [c.grid, c.grid, 0.1, 0],
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
  anchor("floor", 0, FT, 0);

  function pose(name) {
    if (name !== "rest") throw new Error(`post-office: unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
