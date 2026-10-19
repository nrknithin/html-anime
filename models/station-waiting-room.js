// station-waiting-room.js - the little wooden waiting room of an unstaffed country station (mujin-eki), a static
// cutaway set: two walls and a floor, the open sides toward the camera.
// Contract: harness/lab/README.md. Meters, +Y up, the open (cutaway) sides face +X and +Z so a camera in the lit
// front-left quadrant sees in. The -Z wall is the platform wall: a two-sash window and a two-leaf sliding glass door,
// both looking out at the platform edge and the fields beyond, the stove and the clock in the gap between them. The -X
// wall carries the fare box and ticket-slip dispenser, the timetable board and two posters over a long bench. Stands on y = 0
// (floor top 0.03, joints.floor), centred on the room.
//
// Construction (boxes, lathes, polygon tubes, drums and flat panels; all triangle soups merged per material, flat
// shaded so boards read crisp; every closed part is wound away from a point inside it, never by hand):
//   SHELL    a pale concrete floor; -X and -Z walls with a board wainscot to a chair rail at 0.95 (vertical board
//            seams as iris bands) and plaster above, a head band at 1.95-2.03 and a top board; wood posts at the
//            corner and at both cut ends, so the cutaway edges are framed, not sliced.
//   OPENINGS the window (two sashes, mullions, a deep sill) and the sliding door (two glazed leaves on two tracks,
//            kick panels, a threshold) are cut out of the -Z wall boxes. The glass is opaque and painted with the view:
//            the platform surface, its pale coping edge, a band of low hills and the sky, continuous across both.
//   SEATING  an L of plank benches (front legs, apron, wall ledger) along -X and -Z, three red cushions on them.
//   FITTINGS timetable board (framed white board, header band, a blank two-column grid), a round wall clock, two
//            abstract posters, a wooden fare box on a bracket shelf with a slot, a white ticket-slip dispenser with a
//            slip sticking out and a red pull knob.
//   STOVE    a pot-belly (daruma) kerosene stove on three feet on a tin tray, with a fire window, a kettle on top and a
//            flue that rises behind it and turns back into the platform wall at 1.8 m, under the head band.
//   BEAM     a tie beam cantilevered from the -X wall on a wall post and a knee brace; a bare bulb on its cord hangs
//            from it, and a swallow's mud nest (two chicks) sits on it against the wall.
// Proportions (real size, base unit the wall height 2.6): room 3.8 x 2.8 inside, walls 0.1; benches seat 0.44 deep
//   at 0.42; window 1.05 x 0.85 from 1.0; door 1.25 x 1.92; timetable 0.86 x 0.72; clock r 0.17 at 2.28; stove r 0.24
//   belly, 0.75 tall plus kettle, 0.44 off the wall; bulb hangs to 1.75 at x -0.45 from a beam at 2.3-2.42.
// Layout is set by the hero camera (front-left, low): the stove stands so that it and its flue fall in the wall gap
// between window and door, under the clock, rather than across the corner.
// Options: build(THREE, kit, colors, { height = 2.6, evening = false }).
//   height  scales the whole set so the wall top is `height`.
//   evening the bulb glows (practical, threshold -0.25) and the glass goes dusk: iris sky, a red afterglow band
//           behind the hills, hills and platform in hair, the coping still pale; plaster and paper dim
//           to sky / skin, the wainscot to skin and the floor to sky, so the bulb is the brightest thing in the room.
// Poses: rest. No clips.
// Colours (noon): wood iris #5c3d32 flat (trim, benches, beam, stove; noon's only darker tone is hair, which is
//   darker than ink); board wainscot sky #f2d7ae / skin #f0c2ae; plaster moon #fff6e4 / sky; floor sclera #f6f3ee /
//   sky; cushions accent #c4452d / iris; paper (timetable, posters, clock face, dispenser, kettle) practical #fffaf2 /
//   sclera; glass moon (evening iris); flat bands: seams iris, grid and hands hair #241c16, view sky / skin / sclera,
//   accent for poster art and the afterglow; bulb moon / sclera (evening practical, glowing).
// Meshes: 14 (evening 13), one per material. 2.6k triangles.
// Joints: anchors floor, benchX, benchZ, stove, bulb, door, window, nest, fareBox.

export const meta = {
  name: "station-waiting-room",
  height: 2.6,
  script: "noon",
  colors: {
    wood: "#5c3d32", woodShade: "#5c3d32",
    board: "#f2d7ae", boardShade: "#f0c2ae",
    plaster: "#fff6e4", plasterShade: "#f2d7ae",
    floor: "#f6f3ee", floorShade: "#f2d7ae",
    cushion: "#c4452d", cushionShade: "#5c3d32",
    paper: "#fffaf2", paperShade: "#f6f3ee",
    glass: "#fff6e4", nightGlass: "#5c3d32",
    seam: "#5c3d32", dark: "#241c16",
    viewSky: "#f2d7ae", viewSkin: "#f0c2ae", viewPale: "#f6f3ee",
    accent: "#c4452d",
    bulb: "#fff6e4", bulbShade: "#f6f3ee", glow: "#fffaf2",
    eveBoard: "#f0c2ae", evePlaster: "#f2d7ae", evePlasterShade: "#f0c2ae",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height, evening = false } = opts;
  const c = { ...meta.colors, ...colors };
  const root = new THREE.Group();
  root.name = "station-waiting-room";
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
  // a drum (cylinder) whose axis is the wall normal +Z, from z0 to z1, centre (cx, cy)
  function drumZ(key, cx, cy, z0, z1, r, n = 16) {
    const ref = [cx, cy, (z0 + z1) / 2];
    const P = (j, z) => { const a = (j / n) * Math.PI * 2; return [cx + r * Math.cos(a), cy + r * Math.sin(a), z]; };
    for (let j = 0; j < n; j++) {
      quad(key, P(j, z0), P(j + 1, z0), P(j + 1, z1), P(j, z1), ref);
      tri(key, [cx, cy, z1], P(j, z1), P(j + 1, z1), ref);
      tri(key, [cx, cy, z0], P(j, z0), P(j + 1, z0), ref);
    }
  }
  // the same along +X, from x0 to x1, centre (cz, cy)
  function drumX(key, x0, x1, cz, cy, r, n = 12) {
    const ref = [(x0 + x1) / 2, cy, cz];
    const P = (j, x) => { const a = (j / n) * Math.PI * 2; return [x, cy + r * Math.sin(a), cz + r * Math.cos(a)]; };
    for (let j = 0; j < n; j++) {
      quad(key, P(j, x0), P(j + 1, x0), P(j + 1, x1), P(j, x1), ref);
      tri(key, [x1, cy, cz], P(j, x1), P(j + 1, x1), ref);
      tri(key, [x0, cy, cz], P(j, x0), P(j + 1, x0), ref);
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

  // ---------- dimensions ----------
  const X0 = -1.8, X1 = 2.0, Z0 = -1.4, Z1 = 1.4, T = 0.1, H = 2.6, FT = 0.03, WS = 0.95;
  const HB = 1.95; // head band bottom
  const WIN = { x0: -1.6, x1: -0.55, y0: 1.0, y1: 1.85 };
  const DR = { x0: 0.5, x1: 1.75, y1: 1.92 };
  const SEAT = 0.42;

  // ---------- floor ----------
  box("floor", X0 - T, X1, 0, FT, Z0 - T, Z1);

  // ---------- walls ----------
  // -Z wall (room face z = Z0), openings cut out of the boxes
  box("board", X0 - T, DR.x0, FT, WS, Z0 - T, Z0);
  box("board", DR.x1, X1, FT, WS, Z0 - T, Z0);
  box("plaster", X0 - T, WIN.x0, WS, H, Z0 - T, Z0 - 0.01);
  box("plaster", WIN.x1, DR.x0, WS, H, Z0 - T, Z0 - 0.01);
  box("plaster", DR.x1, X1, WS, H, Z0 - T, Z0 - 0.01);
  box("plaster", WIN.x0, WIN.x1, WS, WIN.y0, Z0 - T, Z0 - 0.01);
  box("plaster", WIN.x0, WIN.x1, WIN.y1, H, Z0 - T, Z0 - 0.01);
  box("plaster", DR.x0, DR.x1, DR.y1, H, Z0 - T, Z0 - 0.01);
  // -X wall (room face x = X0)
  box("board", X0 - T, X0, FT, WS, Z0, Z1);
  box("plaster", X0 - T, X0 - 0.01, WS, H, Z0, Z1);
  // trim: skirting, chair rail, head band, top board (on both walls, broken by the door)
  for (const [y0, y1, d] of [[FT, 0.11, 0.02], [WS - 0.02, WS + 0.03, 0.03], [HB, HB + 0.08, 0.025], [H - 0.07, H, 0.03]]) {
    const door = y0 < DR.y1 && y1 > FT;
    if (door) {
      box("wood", X0, DR.x0, y0, y1, Z0, Z0 + d);
      box("wood", DR.x1, X1, y0, y1, Z0, Z0 + d);
    } else box("wood", X0, X1, y0, y1, Z0, Z0 + d);
    box("wood", X0, X0 + d, y0, y1, Z0 + d, Z1);
  }
  // posts: the corner and both cut ends, floor to top
  box("wood", X0, X0 + 0.06, FT, H, Z0, Z0 + 0.06);
  box("wood", X1 - 0.1, X1 + 0.008, 0, H + 0.008, Z0 - T - 0.008, Z0 + 0.04); // proud of the cut, so no wall end shows
  box("wood", X0 - T - 0.008, X0 + 0.04, 0, H + 0.008, Z1 - 0.1, Z1 + 0.008);
  // board seams on the wainscot
  {
    const P = wallZ(Z0 + 0.001), Q = wallX(X0 + 0.001);
    for (let x = X0 + 0.2; x < X1 - 0.12; x += 0.17) if (x < DR.x0 - 0.02 || x > DR.x1 + 0.02) rect("seam", P, x - 0.006, x + 0.006, 0.11, WS - 0.02);
    for (let z = Z0 + 0.2; z < Z1 - 0.12; z += 0.17) rect("seam", Q, z - 0.006, z + 0.006, 0.11, WS - 0.02);
  }

  // ---------- the view: painted on the opaque glass, continuous across window and door ----------
  const HZ = 1.12; // platform coping line
  const hill = (u) => HZ + 0.17 + 0.07 * Math.sin(u * 2.3 + 0.8) + 0.04 * Math.sin(u * 5.1 + 0.3);
  function view(z, u0, u1, v0, v1) {
    rect("glass", wallZ(z), u0, u1, v0, v1);
    const P1 = wallZ(z + 0.001), P2 = wallZ(z + 0.002), P3 = wallZ(z + 0.003);
    if (evening) rect("accent", P1, u0, u1, HZ + 0.03, Math.min(v1, HZ + 0.3));
    const steps = Math.max(2, Math.round((u1 - u0) / 0.06));
    for (let i = 0; i < steps; i++) {
      const a = u0 + ((u1 - u0) * i) / steps, b = u0 + ((u1 - u0) * (i + 1)) / steps;
      quad(evening ? "dark" : "viewSky", P2.W(a, HZ), P2.W(b, HZ), P2.W(b, Math.min(v1, hill(b))), P2.W(a, Math.min(v1, hill(a))), P2.back(a, HZ));
    }
    if (v0 < HZ) rect(evening ? "dark" : "viewPale", P3, u0, u1, v0, HZ);
    rect("viewSkin", P3, u0, u1, Math.max(v0, HZ), HZ + 0.03);
    // a platform lamp post out on the platform, seen through the door
    if (u0 < 1.4 && u1 > 1.44) {
      rect(evening ? "viewSkin" : "seam", P3, 1.41, 1.43, HZ + 0.02, 1.62);
      rect(evening ? "viewSkin" : "seam", P3, 1.37, 1.48, 1.62, 1.65);
    }
  }

  // ---------- window: two sashes ----------
  {
    const { x0, x1, y0, y1 } = WIN, fw = 0.06, xm = (x0 + x1) / 2;
    box("wood", x0 - fw, x1 + fw, y1, y1 + fw, Z0 - 0.04, Z0 + 0.03); // head
    box("wood", x0 - fw, x0, y0, y1, Z0 - 0.04, Z0 + 0.03);
    box("wood", x1, x1 + fw, y0, y1, Z0 - 0.04, Z0 + 0.03);
    box("wood", x0 - fw - 0.03, x1 + fw + 0.03, y0 - 0.04, y0, Z0 - 0.04, Z0 + 0.09); // sill
    view(Z0 - 0.06, x0, x1, y0, y1);
    // sash frames: two sashes overlapping at the centre, a muntin across each
    box("wood", xm - 0.03, xm + 0.03, y0, y1, Z0 - 0.055, Z0 - 0.015);
    for (const [a, b] of [[x0, xm], [xm, x1]]) {
      box("wood", a, b, y0, y0 + 0.04, Z0 - 0.055, Z0 - 0.02);
      box("wood", a, b, y1 - 0.04, y1, Z0 - 0.055, Z0 - 0.02);
      box("wood", a, b, 1.42, 1.445, Z0 - 0.055, Z0 - 0.025);
    }
    anchor("window", xm, (y0 + y1) / 2, Z0);
  }

  // ---------- sliding door: two glazed leaves on two tracks ----------
  {
    const { x0, x1, y1 } = DR, fw = 0.06, xm = (x0 + x1) / 2;
    box("wood", x0 - fw, x1 + fw, y1, y1 + fw, Z0 - 0.05, Z0 + 0.03); // head
    box("wood", x0 - fw, x0, FT, y1, Z0 - 0.05, Z0 + 0.03); // jambs
    box("wood", x1, x1 + fw, FT, y1, Z0 - 0.05, Z0 + 0.03);
    box("wood", x0, x1, 0, FT + 0.012, Z0 - T, Z0 + 0.04); // threshold with the tracks
    rect("dark", flatY(FT + 0.0125), x0, x1, Z0 - 0.06, Z0 - 0.052);
    rect("dark", flatY(FT + 0.0125), x0, x1, Z0 - 0.028, Z0 - 0.02);
    // leaf: stiles, rails, kick panel, glass with the view, a muntin; zb..zf its depth
    function leaf(a, b, zb, zf) {
      const k = 0.78;
      box("wood", a, a + 0.055, FT + 0.012, y1, zb, zf);
      box("wood", b - 0.055, b, FT + 0.012, y1, zb, zf);
      box("wood", a + 0.055, b - 0.055, y1 - 0.06, y1, zb, zf);
      box("wood", a + 0.055, b - 0.055, FT + 0.012, k, zb, zf); // kick panel
      box("wood", a + 0.055, b - 0.055, 1.36, 1.385, zb + 0.004, zf - 0.004); // muntin
      view((zb + zf) / 2, a + 0.055, b - 0.055, k, y1 - 0.06);
      rect("dark", wallZ(zf + 0.001), b - 0.11, b - 0.08, 0.95, 1.08); // finger pull
    }
    leaf(x0, xm + 0.03, Z0 - 0.07, Z0 - 0.04);
    leaf(xm - 0.03, x1, Z0 - 0.035, Z0 - 0.005);
    anchor("door", xm, 0.95, Z0);
  }

  // ---------- benches: an L along -X and -Z ----------
  function bench(x0, x1, z0, z1, along) { // along: "z" runs along the -X wall, "x" along the -Z wall
    box("wood", x0, x1, SEAT - 0.04, SEAT, z0, z1); // plank seat
    // seam lines between planks
    if (along === "z") for (const f of [0.33, 0.66]) rect("seam", flatY(SEAT + 0.001), x0 + (x1 - x0) * f - 0.004, x0 + (x1 - x0) * f + 0.004, z0, z1);
    else for (const f of [0.33, 0.66]) rect("seam", flatY(SEAT + 0.001), x0, x1, z0 + (z1 - z0) * f - 0.004, z0 + (z1 - z0) * f + 0.004);
    const L = along === "z" ? z1 - z0 : x1 - x0, n = Math.max(2, Math.round(L / 0.8) + 1);
    for (let i = 0; i < n; i++) {
      const t = 0.05 + (0.9 * i) / (n - 1);
      if (along === "z") {
        const z = z0 + L * t;
        box("wood", x1 - 0.08, x1 - 0.03, FT, SEAT - 0.04, z - 0.025, z + 0.025);
      } else {
        const x = x0 + L * t;
        box("wood", x - 0.025, x + 0.025, FT, SEAT - 0.04, z1 - 0.08, z1 - 0.03);
      }
    }
    if (along === "z") {
      box("wood", x1 - 0.05, x1 - 0.02, SEAT - 0.14, SEAT - 0.04, z0, z1); // apron
      box("wood", X0, X0 + 0.05, SEAT - 0.12, SEAT - 0.04, z0, z1); // wall ledger
      box("wood", X0 + 0.05, x1 - 0.05, 0.12, 0.16, z0 + 0.1, z0 + 0.14); // stretcher
    } else {
      box("wood", x0, x1, SEAT - 0.14, SEAT - 0.04, z1 - 0.05, z1 - 0.02);
      box("wood", x0, x1, SEAT - 0.12, SEAT - 0.04, Z0, Z0 + 0.05);
    }
  }
  const BX = X0 + 0.46, BZ = Z0 + 0.46;
  bench(X0 + 0.02, BX, BZ, 1.0, "z");
  bench(X0 + 0.02, -0.62, Z0 + 0.02, BZ, "x");
  // cushions
  pillow("cushion", X0 + 0.06, BX - 0.04, -0.62, 0.02, SEAT, SEAT + 0.04, SEAT + 0.065, 0.0, 0.03);
  pillow("cushion", X0 + 0.06, BX - 0.04, 0.12, 0.76, SEAT, SEAT + 0.04, SEAT + 0.065, 0.0, 0.03);
  pillow("cushion", X0 + 0.12, -0.72, Z0 + 0.06, BZ - 0.04, SEAT, SEAT + 0.04, SEAT + 0.065, 0.0, 0.03);
  anchor("benchX", (X0 + BX) / 2, SEAT + 0.065, 0.4);
  anchor("benchZ", -1.1, SEAT + 0.065, (Z0 + BZ) / 2);

  // ---------- timetable board (-X wall): blank grid ----------
  {
    const z0 = -0.12, z1 = 0.74, y0 = 1.16, y1 = 1.88, d = X0 + 0.04;
    box("wood", X0, d, y0, y1, z0, z1); // frame
    box("paper", X0, d + 0.006, y0 + 0.04, y1 - 0.04, z0 + 0.04, z1 - 0.04);
    const P = wallX(d + 0.007);
    rect("seam", P, z0 + 0.04, z1 - 0.04, y1 - 0.12, y1 - 0.04); // header band
    const zm = (z0 + z1) / 2;
    rect("dark", P, zm - 0.005, zm + 0.005, y0 + 0.04, y1 - 0.12);
    for (const zz of [z0 + 0.16, zm + 0.12]) rect("dark", P, zz - 0.003, zz + 0.003, y0 + 0.04, y1 - 0.12); // hour columns
    for (let y = y1 - 0.18; y > y0 + 0.06; y -= 0.06) rect("dark", P, z0 + 0.04, z1 - 0.04, y - 0.0025, y + 0.0025);
  }
  // ---------- posters (-X wall) ----------
  {
    const d = X0 + 0.006;
    // poster 1: a red sun over a pale field
    box("paper", X0, d, 1.48, 1.9, -1.18, -0.86);
    const P = wallX(d + 0.001), P2 = wallX(d + 0.002);
    rect("viewSkin", P, -1.155, -0.885, 1.505, 1.875);
    fan("accent", P2, disc(-1.02, 1.74, 0.085, 16));
    rect("seam", P2, -1.155, -0.885, 1.55, 1.575);
    // poster 2: abstract hills
    box("paper", X0, d, 1.3, 1.8, 0.88, 1.2);
    rect("viewSky", P, 0.905, 1.175, 1.325, 1.775);
    fan("seam", P2, [[0.905, 1.36], [1.175, 1.36], [1.175, 1.5], [1.07, 1.63], [0.99, 1.52], [0.905, 1.58]]);
    rect("accent", P2, 0.905, 1.175, 1.69, 1.73);
  }

  // ---------- clock (-Z wall, over the stove between window and door) ----------
  {
    const cx = -0.02, cy = 2.28;
    drumZ("wood", cx, cy, Z0, Z0 + 0.06, 0.17, 18);
    drumZ("paper", cx, cy, Z0, Z0 + 0.066, 0.145, 18);
    const P = wallZ(Z0 + 0.067);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 2 * Math.PI, r0 = i % 3 ? 0.115 : 0.1, r1 = 0.132, w = 0.005;
      const s = Math.sin(a), co = Math.cos(a);
      quad("dark", P.W(cx + r0 * s - w * co, cy + r0 * co + w * s), P.W(cx + r0 * s + w * co, cy + r0 * co - w * s),
        P.W(cx + r1 * s + w * co, cy + r1 * co - w * s), P.W(cx + r1 * s - w * co, cy + r1 * co + w * s), P.back(cx, cy));
    }
    const P2 = wallZ(Z0 + 0.068);
    fan("dark", P2, [[cx - 0.007, cy], [cx + 0.007, cy], [cx + 0.003, cy + 0.11], [cx - 0.003, cy + 0.11]]); // minute (12)
    fan("dark", P2, [[cx, cy - 0.008], [cx, cy + 0.008], [cx + 0.065, cy + 0.035], [cx + 0.06, cy + 0.045]]); // hour (2)
    fan("accent", wallZ(Z0 + 0.069), disc(cx, cy, 0.012, 8));
  }

  // ---------- fare box and ticket-slip dispenser (-X wall, over the corner of the bench) ----------
  {
    // bracket shelf; the box has a sloped lid with a slot and a blank plate. u along the wall (z), w out of it (x)
    const u0 = -1.27, u1 = -0.99, y = 1.05, X = (w) => X0 + w;
    box("wood", X(0), X(0.22), y - 0.03, y, u0 - 0.02, u1 + 0.02);
    tube("wood", [[X(0.02), y - 0.25, (u0 + u1) / 2], [X(0.19), y - 0.03, (u0 + u1) / 2]], 0.016, 4);
    hex("wood", [[X(0), y, u0], [X(0.18), y, u0], [X(0.18), y, u1], [X(0), y, u1],
      [X(0), y + 0.3, u0], [X(0.18), y + 0.24, u0], [X(0.18), y + 0.24, u1], [X(0), y + 0.3, u1]]);
    const lid = (u, t) => [X(0.18 * t), y + 0.3 - 0.06 * t + 0.002, u];
    quad("dark", lid(u0 + 0.06, 0.35), lid(u1 - 0.06, 0.35), lid(u1 - 0.06, 0.5), lid(u0 + 0.06, 0.5), [X(0.09), y, (u0 + u1) / 2]);
    rect("paper", wallX(X(0.181)), u0 + 0.05, u1 - 0.05, y + 0.07, y + 0.17);
    rect("accent", wallX(X(0.182)), u0 + 0.05, u1 - 0.05, y + 0.07, y + 0.095);
    anchor("fareBox", X(0.09), y + 0.3, (u0 + u1) / 2);
    // dispenser: white box, a slot with a slip, a label band, a red pull knob
    const a = -0.88, b = -0.69, yb = 1.1, yt = 1.38;
    box("paper", X(0), X(0.11), yb, yt, a, b);
    rect("dark", wallX(X(0.111)), a + 0.03, b - 0.03, yb + 0.06, yb + 0.075);
    box("paper", X(0.1), X(0.118), yb + 0.005, yb + 0.068, a + 0.05, b - 0.05); // the slip
    rect("viewSkin", wallX(X(0.1185)), a + 0.055, b - 0.055, yb + 0.01, yb + 0.06);
    rect("seam", wallX(X(0.111)), a + 0.02, b - 0.02, yt - 0.06, yt - 0.03);
    drumX("cushion", X(0.11), X(0.14), (a + b) / 2, yb + 0.15, 0.022, 10);
  }

  // ---------- pot-belly kerosene stove, in front of the wall between window and door ----------
  const SX = 0.15, SZ = Z0 + 0.44;
  {
    box("board", SX - 0.36, SX + 0.36, FT, FT + 0.012, SZ - 0.38, SZ + 0.36); // tin tray
    const y0 = FT + 0.012;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * 2 * Math.PI + 0.5;
      tube("wood", [[SX + 0.2 * Math.cos(a), y0, SZ + 0.2 * Math.sin(a)], [SX + 0.15 * Math.cos(a), y0 + 0.15, SZ + 0.15 * Math.sin(a)]], 0.025, 5);
    }
    const b = y0 + 0.12;
    lathe("wood", [[0, b], [0.15, b], [0.21, b + 0.12], [0.24, b + 0.28], [0.23, b + 0.42], [0.19, b + 0.54], [0.2, b + 0.56],
      [0.2, b + 0.6], [0.0, b + 0.6]], SX, SZ, 18);
    lathe("wood", [[0, b + 0.6], [0.13, b + 0.6], [0.12, b + 0.66], [0, b + 0.67]], SX, SZ, 14); // top dome
    // fire window facing the open quadrant
    const ang = Math.PI / 4, r = 0.243;
    const at = (da, y, dr = 0) => [SX + (r + dr) * Math.cos(ang + da), y, SZ + (r + dr) * Math.sin(ang + da)];
    quad("dark", at(-0.32, b + 0.2, 0.003), at(0.32, b + 0.2, 0.003), at(0.32, b + 0.36, -0.004), at(-0.32, b + 0.36, -0.004), [SX, b + 0.28, SZ]);
    quad("accent", at(-0.25, b + 0.22, 0.006), at(0.25, b + 0.22, 0.006), at(0.25, b + 0.34, -0.001), at(-0.25, b + 0.34, -0.001), [SX, b + 0.28, SZ]);
    // kettle on the front of the top plate
    const k = b + 0.6, kx = SX + 0.02, kz = SZ + 0.08;
    lathe("paper", [[0, k], [0.1, k], [0.12, k + 0.06], [0.1, k + 0.11], [0.04, k + 0.13], [0.03, k + 0.15], [0, k + 0.155]], kx, kz, 14);
    tube("paper", [[kx + 0.1, k + 0.05, kz + 0.03], [kx + 0.17, k + 0.11, kz + 0.06], [kx + 0.2, k + 0.13, kz + 0.07]], 0.016, 5); // spout
    tube("wood", [[kx - 0.08, k + 0.1, kz], [kx - 0.07, k + 0.2, kz], [kx, k + 0.23, kz], [kx + 0.07, k + 0.2, kz], [kx + 0.08, k + 0.1, kz]], 0.009, 5); // handle
    // flue: out of the back of the top, up, and back into the wall under the head band
    const FY = 1.8;
    tube("wood", [[SX, b + 0.56, SZ - 0.13], [SX, FY - 0.08, SZ - 0.13], [SX, FY, SZ - 0.21], [SX, FY, Z0 - 0.02]], 0.055, 8);
    drumZ("wood", SX, FY, Z0, Z0 + 0.025, 0.1, 12); // wall collar
    anchor("stove", SX, b + 0.6, SZ);
  }

  // ---------- beam on a wall post and knee brace, the bare bulb, the swallow's nest ----------
  {
    const BZc = -0.35, by0 = 2.3, by1 = 2.42, bw = 0.06, bx1 = 0.05;
    box("wood", X0 + 0.05, X0 + 0.11, FT, by1, BZc - bw, BZc + bw); // wall post
    box("wood", X0 + 0.11, bx1, by0, by1, BZc - bw, BZc + bw); // beam
    tube("wood", [[X0 + 0.1, 1.86, BZc], [X0 + 0.62, by0 + 0.01, BZc]], 0.035, 4); // knee brace
    // bulb on its cord
    const lx = -0.45, ly = 1.8;
    tube("wood", [[lx, by0 + 0.01, BZc], [lx, ly + 0.15, BZc]], 0.006, 4);
    lathe("wood", [[0, ly + 0.11], [0.028, ly + 0.11], [0.03, ly + 0.17], [0, ly + 0.17]], lx, BZc, 10); // socket
    lathe("bulb", [[0, ly - 0.05], [0.04, ly - 0.04], [0.065, ly + 0.01], [0.06, ly + 0.06], [0.024, ly + 0.1], [0.024, ly + 0.115], [0, ly + 0.115]], lx, BZc, 14);
    anchor("bulb", lx, ly + 0.03, BZc);
    // swallow's nest: a mud cup on the beam, against the wall, two chicks
    const nx = X0 + 0.25, ny = by1;
    lathe("board", [[0, ny], [0.08, ny], [0.13, ny + 0.07], [0.14, ny + 0.12], [0.12, ny + 0.125], [0.0, ny + 0.1]], nx, BZc, 12);
    for (const [dz, s] of [[-0.04, 1], [0.04, 0.9]]) {
      const h = ny + 0.1, t = h + 0.08 * s;
      lathe("dark", [[0, h], [0.03 * s, h + 0.01], [0.034 * s, h + 0.045 * s], [0.02 * s, t - 0.008], [0, t]], nx + 0.02, BZc + dz, 8);
      tube("accent", [[nx + 0.04, h + 0.05 * s, BZc + dz], [nx + 0.075, h + 0.045 * s, BZc + dz]], 0.011, 4); // gape
    }
    anchor("nest", nx, ny + 0.1, BZc);
  }

  // ---------- meshes ----------
  const MAT = {
    wood: [c.wood, c.woodShade, 0.1, 2.5],
    board: evening ? [c.eveBoard, c.eveBoard, 0.1, 2.5] : [c.board, c.boardShade, 0.1, 2.5],
    plaster: evening ? [c.evePlaster, c.evePlasterShade, 0.1, 2.5] : [c.plaster, c.plasterShade, 0.1, 2.5],
    floor: evening ? [c.floorShade, c.eveBoard, 0.1, 2.5] : [c.floor, c.floorShade, 0.1, 2.5],
    cushion: [c.cushion, c.cushionShade, 0.2, 2],
    paper: evening ? [c.evePlaster, c.evePlasterShade, 0.1, 2] : [c.paper, c.paperShade, 0.1, 2],
    glass: evening ? [c.nightGlass, c.nightGlass, 0.1, 0] : [c.glass, c.glass, 0.1, 0],
    seam: [c.seam, c.seam, 0.1, 0],
    dark: [c.dark, c.dark, 0.1, 0],
    viewSky: [c.viewSky, c.viewSky, 0.1, 0],
    viewSkin: [c.viewSkin, c.viewSkin, 0.1, 0],
    viewPale: [c.viewPale, c.viewPale, 0.1, 0],
    accent: [c.accent, c.accent, 0.1, 0],
    bulb: evening ? [c.glow, c.glow, -0.25, 2] : [c.bulb, c.bulbShade, 0.1, 2],
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

  function pose(name) {
    if (name !== "rest") throw new Error(`station-waiting-room: unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
