// bus-interior.js - the inside of a Japanese local route bus (rosen basu): the rainy-ride / sleepy-ride set. Rows of
// green moquette two-seat benches with white headrest covers, a raised rear section with the long rear bench, hanging
// hand-straps on two aisle rails, yellow stanchions each with a stop-request button (one lit), the driver's corner with
// the fare box and ticket machine, a blank LED display over the windscreen, and rain running down every window.
// Cutaway: no roof and no +X side, so a camera in the lit +X/+Z quadrant sees in. Static set with one clip (ride).
// Contract: harness/lab/README.md. Meters, +Y up. The bus runs along Z with its FRONT AT -Z (the far end, so the hero
// looks down the aisle toward the driver, the way the scene is framed), its kerb side with both doors on -X (the
// bus's left when facing -Z, as in Japan), the driver on +X. The floor slab stands on y = 0, centred on x = 0, z = 0.
//
// Construction (boxes, prisms, tubes and swept rings as triangle soups merged per material; flat shaded, every closed
// part wound away from a point inside it, never by hand):
//   SHELL    floor slab (low front floor, two steps up to the raised rear floor, yellow nosings), the -X wall as bands
//            around the openings (below the sill, piers, above the windows), a roof cant strip along its top, the
//            front wall (lower panel, pillars, header) round the windscreen and the rear wall round the rear window.
//            Glass is one inward-facing quad per pane, so it is see-through from outside; rain streaks and drops are
//            flat quads 4 mm in front of it (polylines tapering down, a fat head drop, scattered beads).
//   DOORS    front door and middle door in the -X wall: two glazed leaves each, dark frames, a lower panel.
//   SEATS    each bench: a cushion (rounded prism), a tilted backrest (prism, rounded top), a headrest cover per seat
//            wrapped over its top, a dark under-frame and aisle leg, a yellow grab hoop on the aisle corner.
//   GRAB     two aisle rails at x +-0.30 (yellow), stanchions under them from the floor, a stop button on each (a white
//            housing with a dark push dome; ONE lit red), more buttons on the window piers.
//   FRONT    driver's seat, steering wheel, dash; the fare box on its stand (white hopper top, green LCD) and the
//            ticket machine on a post beside it; the interior LED display (white housing, blank dark face).
//   STRAPS   a belt and a rounded-triangle ring every 0.38 m on both rails over the low floor. Each records its vertex
//            range and hinge, and pose() rotates those vertices (positions, normals, hull normals) about the hinge:
//            one mesh per material (belt, ring), moved per strap.
// Proportions (real size, a full-size non-step city bus; base unit the interior width Wi = 2.30 m): shell 2.40 wide,
// 9.1 long; low floor top 0.05, rear floor 0.33 from z 1.8 (step 0.19 from z 1.5); sill 0.98, window top 1.88, wall
// top 2.02, cant to x -0.85 at 2.35 (the top). Benches 0.88 wide, seat 0.42 over its floor, backrest top 1.09, pitch
// 0.78, aisle 0.5. Rails y 1.95, ring bottoms ~1.64. Doors: front z -4.45..-3.65, middle z -0.55..0.45, 1.90 tall.
// Colours (meadow, the countryside-bus script): walls moon #f7f3e1 / sky #d7ecef; floor skin #f0c2ae flat; moquette
// iris #3f8a47 / hair #2c5131; covers, button housings, hopper, display housing sclera #f6f3ee / sky; frames, dash,
// fare box, wheel, door frames, blank display, unlit domes hair flat; poles, rails, hoops, nosings practical #f2c94c /
// line #a9d16e; glass hair flat (grey rain outside); rain sky #d7ecef flat; belts hair flat; rings sclera / sky; the
// lit button accent #d9483b glow; fare LCD line glow.
// Options: build(THREE, kit, colors, { height }): scales the whole set uniformly so its top is `height` (default 2.35).
// Clip: ride 4 s (loops): every strap swings about its hinge, fore-aft (about X, +-5 deg) with a smaller lateral
// sway (about Z, +-3 deg), a slow wave travelling down the bus, the two rails out of phase. pose("ride@1.2").
// Meshes: 12 (one per material). 9.8k triangles (the 21 straps 3.0k, the rain 1.3k). Ink px: shell 3, seats 2.5, small parts 1.5, glass / rain / belts none.
// Joints: empty anchors for figures and cameras: windowSeat (a -X window seat at seat height), rearSeat, driver,
// fareBox, aisle (floor centre), rail (between the strap rails), frontDoor, middleDoor.

export const meta = {
  name: "bus-interior",
  height: 2.35,
  script: "meadow",
  colors: {
    wall: "#f7f3e1", wallShade: "#d7ecef",
    floor: "#d7ecef", floorShade: "#d7ecef",
    seat: "#3f8a47", seatShade: "#2c5131",
    cover: "#f6f3ee", coverShade: "#d7ecef",
    frame: "#2c5131", frameShade: "#2c5131",
    pole: "#f2c94c", poleShade: "#a9d16e",
    glass: "#2c5131", glassShade: "#2c5131",
    rain: "#d7ecef", rainShade: "#d7ecef",
    belt: "#2c5131", beltShade: "#2c5131",
    ring: "#f6f3ee", ringShade: "#d7ecef",
    lamp: "#d9483b", lampShade: "#d9483b",
    lcd: "#a9d16e", lcdShade: "#a9d16e",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height } = opts;
  const c = { ...meta.colors, ...colors };
  const root = new THREE.Group();
  root.name = "bus-interior";
  const set = new THREE.Group(); // the uniform size scale lives here
  set.name = "bus";
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
    if (Math.hypot(...n) < 1e-12) return;
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
    if (y0 > y1) [y0, y1] = [y1, y0];
    if (z0 > z1) [z0, z1] = [z1, z0];
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // convex polygon of (a, b) pairs extruded along one axis; map(a, b, t) -> world point
  function prismBy(key, poly, t0, t1, map) {
    const ca = poly.reduce((s, p) => s + p[0], 0) / poly.length, cb = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    const ref = map(ca, cb, (t0 + t1) / 2);
    for (let i = 0; i < poly.length; i++) {
      const [a, b] = [poly[i], poly[(i + 1) % poly.length]];
      quad(key, map(a[0], a[1], t0), map(b[0], b[1], t0), map(b[0], b[1], t1), map(a[0], a[1], t1), ref);
      tri(key, map(ca, cb, t0), map(a[0], a[1], t0), map(b[0], b[1], t0), ref);
      tri(key, map(ca, cb, t1), map(a[0], a[1], t1), map(b[0], b[1], t1), ref);
    }
  }
  const prismZ = (key, polyXY, z0, z1) => prismBy(key, polyXY, z0, z1, (x, y, z) => [x, y, z]);
  const prismX = (key, polyZY, x0, x1) => prismBy(key, polyZY, x0, x1, (z, y, x) => [x, y, z]);
  // n-gon tube from a to b, radius r, capped
  function tube(key, a, b, r, n = 6) {
    const d = nrm(sub(b, a));
    const up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const e1 = nrm(cross(d, up)), e2 = cross(e1, d);
    const ref = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const ring = (o) => Array.from({ length: n }, (_, j) => {
      const t = (j / n) * Math.PI * 2;
      return [0, 1, 2].map((k) => o[k] + r * (Math.cos(t) * e1[k] + Math.sin(t) * e2[k]));
    });
    const A = ring(a), B = ring(b);
    for (let j = 0; j < n; j++) {
      const k = (j + 1) % n;
      quad(key, A[j], A[k], B[k], B[j], ref);
      tri(key, a, A[j], A[k], ref);
      tri(key, b, B[j], B[k], ref);
    }
  }
  // rounded-rect polygon (convex), corner radii [bl, br, tr, tl]
  function rrect(x0, x1, y0, y1, rad, seg = 3) {
    const out = [];
    const C = [[x0 + rad[0], y0 + rad[0], Math.PI], [x1 - rad[1], y0 + rad[1], 1.5 * Math.PI], [x1 - rad[2], y1 - rad[2], 0], [x0 + rad[3], y1 - rad[3], 0.5 * Math.PI]];
    C.forEach(([cx, cy, a0], i) => {
      const r = rad[i];
      if (r <= 0) out.push([cx, cy]);
      else for (let k = 0; k <= seg; k++) { const a = a0 + (k / seg) * Math.PI / 2; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    });
    return out;
  }
  // deterministic hash in [0, 1)
  const rnd = (i) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

  // ---------- dimensions ----------
  const W = 1.15, T = 0.05, ZF = -4.5, ZB = 4.5; // inner half width, wall, front and rear inner faces
  const FY = 0.05, RY = 0.33, SY = 0.19, ZS1 = 1.5, ZS2 = 1.8; // floors and steps
  const SILL = 0.98, WT = 1.88, WTOP = 2.02, TOP = 2.35;
  const RAILX = 0.3, RAILY = 1.95;
  const floorAt = (z) => (z >= ZS2 ? RY : z >= ZS1 ? SY : FY);
  const DOORS = [[-4.45, -3.65], [-0.55, 0.45]]; // -X openings (z ranges)
  const DH = 1.9;

  // ---------- floor ----------
  box("floor", -W - T, W + T, 0, FY, ZF - T, ZS1);
  box("floor", -W - T, W + T, 0, SY, ZS1, ZS2);
  box("floor", -W - T, W + T, 0, RY, ZS2, ZB + T);
  for (const [z, y] of [[ZS1, SY], [ZS2, RY]]) box("pole", -W, W + T, y, y + 0.006, z, z + 0.05); // yellow nosings

  // ---------- -X wall ----------
  const xi = -W, xo = -W - T, xg = -W - T / 2; // inner face, outer face, glass plane
  const windowRuns = [[-3.6, -0.6], [0.5, 4.45]];
  const panes = []; // [z0, z1, y0, y1] glass rectangles that get rain
  // below the sill and above the windows run the whole length except the door openings
  const solid = [[ZF - T, DOORS[0][0]], [DOORS[0][1], DOORS[1][0]], [DOORS[1][1], ZB + T]];
  for (const [z0, z1] of solid) {
    box("wall", xi, xo, FY, SILL, z0, z1);
  }
  box("wall", xi, xo, WT, WTOP, ZF - T, ZB + T);
  for (const [z0, z1] of DOORS) box("wall", xi, xo, DH, WT, z0, z1); // door heads
  for (const [r0, r1] of windowRuns) {
    const n = Math.max(1, Math.round((r1 - r0) / 1.15)), P = 0.09;
    const pw = (r1 - r0 - (n + 1) * P) / n;
    let z = r0;
    for (let i = 0; i < n; i++) {
      box("wall", xi, xo, SILL, WT, z, z + P);
      const za = z + P, zb = za + pw;
      quad("glass", [xg, SILL, za], [xg, SILL, zb], [xg, WT, zb], [xg, WT, za], [-5, 1.4, (za + zb) / 2]);
      panes.push({ x: xg + 0.004, za, zb, y0: SILL, y1: WT });
      // inner frame: rubber round the pane and the upper sliding pane's bar
      const f0 = xi, f1 = xi + 0.018;
      box("frame", f0, f1, SILL, SILL + 0.025, za, zb);
      box("frame", f0, f1, WT - 0.025, WT, za, zb);
      box("frame", f0, f1, SILL, WT, za, za + 0.022);
      box("frame", f0, f1, SILL, WT, zb - 0.022, zb);
      box("frame", f0, f1 + 0.006, 1.56, 1.6, za, zb);
      z = zb;
    }
    box("wall", xi, xo, SILL, WT, z, r1);
  }
  // piers between the door openings and the window runs
  box("wall", xi, xo, SILL, WT, ZF - T, DOORS[0][0]);
  box("wall", xi, xo, SILL, WT, DOORS[0][1], windowRuns[0][0]);
  box("wall", xi, xo, SILL, WT, windowRuns[0][1], DOORS[1][0]);
  box("wall", xi, xo, SILL, WT, DOORS[1][1], windowRuns[1][0]);
  box("wall", xi, xo, SILL, WT, windowRuns[1][1], ZB + T);
  // roof cant strip along the wall top
  prismZ("wall", [[xo, WTOP], [xi, WTOP], [-0.85, TOP - 0.06], [-0.85, TOP], [-1.1, TOP]], ZF - T, ZB + T);

  // ---------- doors: two glazed leaves per opening ----------
  for (const [z0, z1] of DOORS) {
    const mid = (z0 + z1) / 2;
    for (const [a, b] of [[z0, mid], [mid, z1]]) {
      const xl = -W - 0.01, xr = -W - 0.04;
      box("frame", xl, xr, FY, DH, a, a + 0.04);
      box("frame", xl, xr, FY, DH, b - 0.04, b);
      box("frame", xl, xr, DH - 0.05, DH, a, b);
      box("frame", xl, xr, FY, 0.38, a, b); // kick panel
      const za = a + 0.04, zb = b - 0.04;
      quad("glass", [xl + 0.001, 0.38, za], [xl + 0.001, 0.38, zb], [xl + 0.001, DH - 0.05, zb], [xl + 0.001, DH - 0.05, za], [-5, 1, mid]);
      panes.push({ x: xl + 0.005, za, zb, y0: 0.38, y1: DH - 0.05 });
    }
    tube("pole", [-W + 0.04, 0.85, z1 + 0.06], [-W + 0.04, 1.75, z1 + 0.06], 0.016, 6); // jamb grab rail
  }

  // ---------- front wall (windscreen) ----------
  const fz0 = ZF - T, fz1 = ZF, WSB = 0.95, WSX = 1.03;
  box("wall", -W - T, W + T, 0, WSB, fz0, fz1);
  for (const s of [-1, 1]) box("wall", s * WSX, s * (W + T), WSB, 2.0, fz0, fz1);
  prismZ("wall", rrect(-W - T, W + T, 1.9, TOP, [0, 0, 0.3, 0.3]), fz0, fz1);
  quad("glass", [-WSX, WSB, ZF - T / 2], [WSX, WSB, ZF - T / 2], [WSX, 1.9, ZF - T / 2], [-WSX, 1.9, ZF - T / 2], [0, 1.4, ZF - 5]);
  panes.push({ front: true, z: ZF - T / 2 + 0.004, xa: -WSX, xb: WSX, y0: WSB, y1: 1.9 });
  // dash across the front, instrument hood over the driver
  box("frame", 0.25, W, FY, WSB + 0.04, ZF, ZF + 0.22);
  box("frame", 0.32, W - 0.05, WSB + 0.04, WSB + 0.14, ZF, ZF + 0.3);

  // ---------- rear wall (rear window) ----------
  const rz0 = ZB, rz1 = ZB + T, RWB = 1.3, RWX = 0.85;
  box("wall", -W - T, W + T, 0, RWB, rz0, rz1);
  for (const s of [-1, 1]) box("wall", s * RWX, s * (W + T), RWB, 2.0, rz0, rz1);
  prismZ("wall", rrect(-W - T, W + T, 1.88, TOP, [0, 0, 0.3, 0.3]), rz0, rz1);
  quad("glass", [-RWX, RWB, ZB + T / 2], [RWX, RWB, ZB + T / 2], [RWX, 1.88, ZB + T / 2], [-RWX, 1.88, ZB + T / 2], [0, 1.5, ZB + 5]);
  panes.push({ rear: true, z: ZB + T / 2 - 0.004, xa: -RWX, xb: RWX, y0: RWB, y1: 1.88 });

  // ---------- rain on the glass ----------
  // u across the pane, v up; each pane maps (u, v) to world, offset toward the inside
  let seed = 1;
  for (const p of panes) {
    const wide = p.front || p.rear ? p.xb - p.xa : p.zb - p.za, tall = p.y1 - p.y0;
    const at = (u, v) => p.front || p.rear ? [p.xa + u, p.y0 + v, p.z] : [p.x, p.y0 + v, p.za + u];
    const inside = p.front ? [0, p.y0 + tall / 2, 5] : p.rear ? [0, p.y0 + tall / 2, -5] : [5, p.y0 + tall / 2, (p.za + p.zb) / 2];
    const ref = [2 * (at(wide / 2, tall / 2)[0]) - inside[0], 2 * at(wide / 2, tall / 2)[1] - inside[1], 2 * at(wide / 2, tall / 2)[2] - inside[2]];
    const flat = (u0, v0, u1, v1, w0, w1) => { // a tapered strip from (u0,v0) w0 wide to (u1,v1) w1 wide
      quad("rain", at(u0 - w0 / 2, v0), at(u0 + w0 / 2, v0), at(u1 + w1 / 2, v1), at(u1 - w1 / 2, v1), ref);
    };
    const drop = (u, v, r) => { // a diamond bead, longer than wide
      quad("rain", at(u, v + r * 1.3), at(u + r, v), at(u, v - r * 1.1), at(u - r, v), ref);
    };
    const nStreak = Math.max(2, Math.round(wide * 4.2));
    for (let k = 0; k < nStreak; k++) {
      const r = (q) => rnd(seed * 13.7 + k * 3.1 + q * 0.71);
      let u = wide * (0.08 + 0.84 * (k + r(1) * 0.8) / nStreak), v = tall * (0.82 + 0.16 * r(2));
      const len = tall * (0.35 + 0.55 * r(3)), steps = 6, w = 0.016 + 0.01 * r(4);
      for (let i = 0; i < steps; i++) {
        const v2 = v - len / steps, u2 = Math.min(wide - 0.02, Math.max(0.02, u + (r(10 + i) - 0.5) * 0.035));
        flat(u, v, u2, v2, w * (1 - 0.1 * i), w * (1 - 0.1 * (i + 1)));
        u = u2; v = v2;
      }
      drop(u, v, w * 0.95);
    }
    const nBead = Math.round(wide * tall * 26);
    for (let k = 0; k < nBead; k++) {
      const r = (q) => rnd(seed * 7.3 + k * 1.9 + q * 0.37 + 50);
      drop(wide * (0.04 + 0.92 * r(1)), tall * (0.05 + 0.9 * r(2)), 0.007 + 0.009 * r(3));
    }
    seed++;
  }

  // ---------- seats ----------
  // A forward-facing bench (the sitter faces -Z): x range, front edge zf, its floor fy, aisle end +1 / -1 (x1 / x0).
  // Profile (u back from zf, v up from the floor).
  const CUSH = rrect(0, 0.44, 0.3, 0.43, [0.03, 0, 0, 0.05]);
  const BACK = [[0.38, 0.4], [0.5, 0.4], [0.6, 1.0], [0.58, 1.05], [0.53, 1.085], [0.48, 1.065], [0.46, 1.0]];
  const COVER = [[0.432, 0.84], [0.588, 0.84], [0.613, 1.0], [0.592, 1.06], [0.532, 1.097], [0.472, 1.076], [0.448, 1.0]];
  function bench(x0, x1, zf, fy, aisle, nSeat = 2) {
    const P = (poly) => poly.map(([u, v]) => [zf + u, fy + v]);
    prismX("seat", P(CUSH), x0, x1);
    prismX("seat", P(BACK), x0 + 0.01, x1 - 0.01);
    const sw = (x1 - x0) / nSeat;
    for (let i = 0; i < nSeat; i++) prismX("cover", P(COVER), x0 + i * sw + 0.04, x0 + (i + 1) * sw - 0.04);
    for (let i = 1; i < nSeat; i++) { // seam between seats
      const x = x0 + i * sw;
      box("frame", x - 0.006, x + 0.006, fy + 0.43, fy + 0.436, zf + 0.04, zf + 0.42);
    }
    box("frame", x0 + 0.04, x1 - 0.04, fy + 0.22, fy + 0.3, zf + 0.06, zf + 0.4); // under-frame
    const xa = aisle > 0 ? x1 - 0.05 : x0 + 0.05;
    box("frame", xa - 0.02, xa + 0.02, fy, fy + 0.24, zf + 0.18, zf + 0.24); // aisle leg
    box("frame", xa - 0.03, xa + 0.03, fy, fy + 0.02, zf + 0.08, zf + 0.34); // its foot
    // grab hoop on the aisle corner of the backrest top
    const h0 = aisle > 0 ? x1 - 0.04 : x0 + 0.04, h1 = h0 - aisle * 0.14, zh = zf + 0.55, yt = fy + 1.07;
    tube("pole", [h0, yt - 0.03, zh], [h0, yt + 0.08, zh], 0.013, 6);
    tube("pole", [h1, yt - 0.01, zh], [h1, yt + 0.08, zh], 0.013, 6);
    tube("pole", [h0, yt + 0.08, zh], [h1, yt + 0.08, zh], 0.013, 6);
  }
  const PITCH = 0.78;
  const BX = [[-W + 0.02, -0.26], [0.26, W - 0.02]]; // -X bench, +X bench x ranges
  const rowsL = [-3.45, -3.45 + PITCH, -3.45 + 2 * PITCH, 0.62, 1.95, 1.95 + PITCH];
  const rowsR = [-3.0, -3.0 + PITCH, 1.95, 1.95 + PITCH];
  for (const z of rowsL) bench(BX[0][0], BX[0][1], z, floorAt(z), +1);
  for (const z of rowsR) bench(BX[1][0], BX[1][1], z, floorAt(z), -1);
  // the rear bench: five seats right across, its back against the rear wall
  const RZ = ZB - 0.62;
  bench(-W + 0.02, W - 0.02, RZ, RY, +1, 5);

  // ---------- rails, stanchions, stop buttons ----------
  for (const s of [-1, 1]) tube("pole", [s * RAILX, RAILY, -3.55], [s * RAILX, RAILY, ZB], 0.016, 6);
  tube("pole", [-RAILX, RAILY, -3.55], [RAILX, RAILY, -3.55], 0.016, 6); // cross bar behind the driver
  const lit = [-RAILX, -1.25]; // the pressed button
  function stopButton(x, y, z, face, on) { // face: +1 faces +X, -1 faces -X, "z" faces +Z
    const d = face === "z" ? [0, 0, 1] : [face, 0, 0];
    const along = (o, a, b, w, h) => { // a box from offset a to b along d, w wide, h tall
      const p0 = [x + d[0] * a, y, z + d[2] * a], p1 = [x + d[0] * b, y, z + d[2] * b];
      const hw = w / 2;
      if (face === "z") box(o, p0[0] - hw, p0[0] + hw, y - h / 2, y + h / 2, p0[2], p1[2]);
      else box(o, p0[0], p1[0], y - h / 2, y + h / 2, z - hw, z + hw);
    };
    along("cover", 0, 0.045, 0.075, 0.095);
    along(on ? "lamp" : "frame", 0.04, 0.058, 0.045, 0.045);
    if (on) along("lamp", 0.0, 0.05, 0.085, 0.012); // lit band over the housing
  }
  const poles = [
    [-RAILX, -3.55], [-RAILX, -1.25], [-RAILX, 0.0], [-RAILX, 1.45], [-RAILX, 3.4],
    [RAILX, -3.55], [RAILX, -1.6], [RAILX, -0.3], [RAILX, 1.45], [RAILX, 3.4],
  ];
  for (const [x, z] of poles) {
    const fy = floorAt(z);
    tube("pole", [x, fy, z], [x, RAILY, z], 0.018, 8);
    const s = Math.sign(x);
    stopButton(x - s * 0.012, 1.3, z, -s, x === lit[0] && z === lit[1]);
  }
  // buttons on the window piers over the -X benches
  for (const z of rowsL) stopButton(xi, SILL + 0.17, z + 0.62, 1, false);

  // ---------- straps ----------
  const sway = []; // { key, start, end, hinge, z, side }
  const STEP = 0.38, nS = Math.floor((1.3 - -3.2) / STEP) + 1;
  for (const s of [-1, 1]) {
    const x = s * RAILX;
    for (let i = 0; i < nS; i++) {
      const z = -3.2 + i * STEP;
      if (poles.some(([px, pz]) => px === x && Math.abs(pz - z) < 0.15)) continue; // no ring swings into a pole
      const hinge = [x, RAILY - 0.018, z];
      box("pole", x - 0.02, x + 0.02, RAILY - 0.03, RAILY + 0.02, z - 0.025, z + 0.025); // clip on the rail
      const b0 = S("belt").length;
      box("belt", x - 0.004, x + 0.004, RAILY - 0.2, RAILY - 0.02, z - 0.016, z + 0.016);
      box("belt", x - 0.012, x + 0.012, RAILY - 0.23, RAILY - 0.18, z - 0.022, z + 0.022);
      sway.push({ key: "belt", start: b0, end: S("belt").length, hinge, z, side: s });
      const r0 = S("ring").length;
      triRing(x, RAILY - 0.215, z);
      sway.push({ key: "ring", start: r0, end: S("ring").length, hinge, z, side: s });
    }
  }
  // a tube swept round a rounded triangle in the plane x = x0, apex at (yTop, z0)
  function triRing(x0, yTop, z0) {
    const corners = [[0, -0.012], [-0.06, -0.125], [0.06, -0.125]]; // (z, y) offsets
    const rc = 0.02, rt = 0.011, nt = 5, path = [];
    for (let k = 0; k < 3; k++) {
      const Pv = corners[(k + 2) % 3], C = corners[k], N = corners[(k + 1) % 3];
      const out = (A, B) => { const d = nrm([B[0] - A[0], B[1] - A[1], 0]); return [d[1], -d[0]]; };
      const n1 = out(Pv, C), n2 = out(C, N);
      let a1 = Math.atan2(n1[1], n1[0]), a2 = Math.atan2(n2[1], n2[0]);
      while (a2 < a1) a2 += Math.PI * 2;
      for (let j = 0; j <= 3; j++) {
        const a = a1 + ((a2 - a1) * j) / 3;
        path.push([x0, yTop + C[1] + rc * Math.sin(a), z0 + C[0] + rc * Math.cos(a)]);
      }
    }
    const m = path.length, rings = [];
    for (let i = 0; i < m; i++) {
      const p = path[i], t = nrm(sub(path[(i + 1) % m], path[(i + m - 1) % m]));
      const e1 = [1, 0, 0], e2 = nrm(cross(t, e1));
      rings.push(Array.from({ length: nt }, (_, j) => {
        const a = (j / nt) * Math.PI * 2;
        return [0, 1, 2].map((k) => p[k] + rt * (Math.cos(a) * e1[k] + Math.sin(a) * e2[k]));
      }));
    }
    for (let i = 0; i < m; i++) {
      const i2 = (i + 1) % m, ref = [0, 1, 2].map((k) => (path[i][k] + path[i2][k]) / 2);
      for (let j = 0; j < nt; j++) {
        const j2 = (j + 1) % nt;
        quad("ring", rings[i][j], rings[i2][j], rings[i2][j2], rings[i][j2], ref);
      }
    }
  }

  // ---------- driver's corner, fare box, ticket machine, LED display ----------
  // driver's seat (+X, faces -Z) and its pedestal
  const dzf = -4.02;
  prismX("seat", [[dzf, 0.4], [dzf + 0.46, 0.4], [dzf + 0.46, 0.53], [dzf + 0.04, 0.53], [dzf, 0.5]], 0.5, 0.98);
  prismX("seat", [[dzf + 0.4, 0.5], [dzf + 0.52, 0.5], [dzf + 0.62, 1.22], [dzf + 0.56, 1.28], [dzf + 0.5, 1.22]], 0.52, 0.96);
  box("frame", 0.6, 0.88, FY, 0.4, dzf + 0.1, dzf + 0.4);
  // steering wheel: a ring of tubes in a plane tilted back 35 deg from vertical, on a column
  {
    const cx = 0.74, cy = 1.02, cz = -4.2, R = 0.21, tilt = (35 * Math.PI) / 180, n = 14;
    const pt = (a) => [cx + R * Math.cos(a), cy + R * Math.sin(a) * Math.cos(tilt), cz + R * Math.sin(a) * Math.sin(tilt)];
    for (let i = 0; i < n; i++) tube("frame", pt((i / n) * Math.PI * 2), pt(((i + 1) / n) * Math.PI * 2), 0.018, 5);
    tube("frame", [cx, cy, cz], [cx, 0.8, ZF + 0.12], 0.03, 6);
    tube("frame", [cx - R, cy, cz], [cx + R, cy, cz], 0.014, 5);
  }
  // fare box: stand, body, white hopper top, green LCD on its rear face, a dark bill slot
  {
    const x0 = 0.06, x1 = 0.42, z0 = -4.05, z1 = -3.74;
    box("frame", 0.14, 0.34, FY, 0.6, z0 + 0.06, z1 - 0.06);
    box("cover", x0, x1, 0.6, 1.08, z0, z1);
    prismX("frame", [[z0 - 0.01, 1.08], [z1 + 0.01, 1.08], [z1 + 0.01, 1.13], [z0 + 0.04, 1.2], [z0 - 0.01, 1.2]], x0 - 0.01, x1 + 0.01);
    box("frame", x0 + 0.03, x1 - 0.03, 0.66, 1.05, z1, z1 + 0.006); // dark face
    box("lcd", x0 + 0.07, x1 - 0.07, 0.93, 1.02, z1, z1 + 0.01);
    box("cover", x0 + 0.08, x1 - 0.08, 0.76, 0.79, z1, z1 + 0.012); // bill slot lip
    box("frame", x0 - 0.008, x0, 0.7, 1.0, z0 + 0.05, z1 - 0.05); // aisle-side panel
  }
  // ticket machine on its post beside the fare box (aisle side), facing +Z and -X
  {
    tube("pole", [-0.08, FY, -3.86], [-0.08, 1.02, -3.86], 0.02, 6);
    box("cover", -0.17, 0.0, 1.02, 1.28, -3.95, -3.78);
    box("frame", -0.15, -0.02, 1.16, 1.24, -3.78, -3.772); // ticket slot plate
    box("lamp", -0.12, -0.05, 1.07, 1.1, -3.78, -3.774); // its little issue lamp
  }
  // interior LED display over the windscreen, hung from the header: white housing, blank dark face
  box("cover", -0.58, 0.58, 2.0, 2.26, ZF + 0.02, ZF + 0.14);
  box("frame", -0.53, 0.53, 2.03, 2.23, ZF + 0.14, ZF + 0.146);
  for (const s of [-1, 1]) box("cover", s * 0.4 - 0.015, s * 0.4 + 0.015, 2.26, TOP - 0.06, ZF + 0.06, ZF + 0.1);

  // ---------- anchors ----------
  for (const [name, p] of Object.entries({
    windowSeat: [-0.9, FY + 0.43, rowsL[1] + 0.22], rearSeat: [0, RY + 0.43, RZ + 0.22], driver: [0.74, 0.53, dzf + 0.22],
    fareBox: [0.24, 1.2, -3.9], aisle: [0, FY, 0], rail: [0, RAILY, -1.2], frontDoor: [-W, FY, -4.05], middleDoor: [-W, FY, -0.05],
  })) {
    const j = new THREE.Group();
    j.name = name;
    j.position.set(...p);
    set.add(j);
    joints[name] = j;
  }

  // ---------- meshes ----------
  // [base, shade, threshold, hull px (0 = none)]
  const MAT = {
    wall: [c.wall, c.wallShade, 0.03, 3],
    floor: [c.floor, c.floorShade, -1, 3],
    seat: [c.seat, c.seatShade, 0.1, 2.5],
    cover: [c.cover, c.coverShade, 0.15, 1.5],
    frame: [c.frame, c.frameShade, -1, 1.5],
    pole: [c.pole, c.poleShade, 0.2, 1.5],
    glass: [c.glass, c.glassShade, -1, 0],
    rain: [c.rain, c.rainShade, -1, 0],
    belt: [c.belt, c.beltShade, -1, 0],
    ring: [c.ring, c.ringShade, 0.2, 1.5],
    lamp: [c.lamp, c.lampShade, -1, 0],
    lcd: [c.lcd, c.lcdShade, -1, 0],
  };
  const meshes = {};
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    set.add(mesh);
    meshes[key] = mesh;
  }
  const MOVING = ["belt", "ring"];
  const rest = {};
  for (const key of MOVING) {
    const a = meshes[key].geometry.attributes;
    rest[key] = { p: a.position.array.slice(), n: a.normal.array.slice(), h: a.hullNormal ? a.hullNormal.array.slice() : null };
  }

  // ---------- poses and clips ----------
  // Sign convention: rx > 0 swings a strap's ring toward +Z (the rear: the bus pulling away); rz > 0 swings it toward
  // -X (right-hand rule about +Z at the hinge). Rest: every strap hangs straight.
  const CLIPS = { ride: 4 };
  const D = Math.PI / 180;
  function setStraps(angle) {
    for (const key of MOVING) {
      const a = meshes[key].geometry.attributes, R = rest[key];
      a.position.array.set(R.p);
      a.normal.array.set(R.n);
      if (R.h && a.hullNormal) a.hullNormal.array.set(R.h);
    }
    if (angle) {
      for (const e of sway) {
        const [rx, rz] = angle(e);
        const cx = Math.cos(rx), sx = Math.sin(rx), cz = Math.cos(rz), sz = Math.sin(rz);
        // R = Rz * Rx
        const rot = (v) => {
          const y1 = v[1] * cx - v[2] * sx, z1 = v[1] * sx + v[2] * cx;
          return [v[0] * cz - y1 * sz, v[0] * sz + y1 * cz, z1];
        };
        const a = meshes[e.key].geometry.attributes, R = rest[e.key];
        for (let i = e.start; i < e.end; i += 3) {
          const p = rot([R.p[i] - e.hinge[0], R.p[i + 1] - e.hinge[1], R.p[i + 2] - e.hinge[2]]);
          a.position.array[i] = p[0] + e.hinge[0]; a.position.array[i + 1] = p[1] + e.hinge[1]; a.position.array[i + 2] = p[2] + e.hinge[2];
          a.normal.array.set(rot([R.n[i], R.n[i + 1], R.n[i + 2]]), i);
          if (R.h && a.hullNormal) a.hullNormal.array.set(rot([R.h[i], R.h[i + 1], R.h[i + 2]]), i);
        }
      }
    }
    for (const key of MOVING) {
      const g = meshes[key].geometry, a = g.attributes;
      a.position.needsUpdate = true;
      a.normal.needsUpdate = true;
      if (a.hullNormal) a.hullNormal.needsUpdate = true;
      g.computeBoundingBox();
      g.computeBoundingSphere();
    }
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`bus-interior: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      const Tn = CLIPS[m[1]], ph = (((+m[2] % Tn) + Tn) % Tn) / Tn, TAU = Math.PI * 2;
      // fore-aft: one slow swing per loop plus a small double (the road), a wave down the bus; lateral: smaller
      setStraps((e) => [
        D * (4.5 * Math.sin(TAU * ph - 0.45 * e.z + (e.side > 0 ? 0.7 : 0)) + 1 * Math.sin(TAU * 2 * ph + 0.8 * e.z)),
        D * 3 * Math.sin(TAU * ph + 1.3 - 0.6 * e.z + (e.side > 0 ? 1.2 : 0)),
      ]);
    } else {
      if (name !== "rest") throw new Error(`bus-interior: unknown pose "${name}" (rest, or ride@<seconds>)`);
      setStraps(null);
    }
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
