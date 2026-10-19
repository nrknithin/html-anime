// station-kiosk.js - a small train-platform kiosk stand (the newsstand booth on a Japanese station platform in
// slice-of-life anime), static. Contract: harness/lab/README.md. Meters, +Y up, the counter side faces +Z, its left
// is +X (the magazine-rack side), stands on y = 0, centred on x = 0, z = 0 (content re-centred on its own bbox).
//
// Construction (boxes, wedges and low lathes, all triangle soups merged per material; flat-shaded, so planes read
// crisp and the mesh count stays one per material):
//   FLOOR    a platform floor patch (a thin concrete slab) with two yellow tactile strips across the front: a dotted
//            warning strip (raised studs on tiles) and a guidance strip (four long raised bars). Studs and bars are a
//            pale un-inked mesh on the yellow tiles (inked studs turned the strip into a black grid); tile joints are
//            dark decal lines on the tile tops (the hull draws silhouettes only).
//   BOOTH    a green box of wall slabs around one counter window on the front: a dark kick band, the lower front wall,
//            a header band, a built-in glass-door drink cooler in the +X bay, and a white trim frame round the window.
//            The interior is a dark lining with two white back shelves of small boxed sweets, so the window reads as
//            an opening into a lit stall. A cream counter board juts out under the window; a coin tray (lime rubber
//            mat with a rim and three gold coins) sits on it, and a stepped sweets stand by the cooler (it fills the
//            window for the low hero camera, which cannot see the back shelves). Inside, the vendor's high stool (red round seat, low
//            backrest above the counter line so the stool reads through the window, dark legs and a foot ring).
//   CANOPY   a red roof slab over the booth, pitched to the front and overhanging it 0.55 m, with a front fascia;
//            the blank cream sign panel stands on its front lip in a green frame (no lettering, by design); set back
//            on the roof it hid behind the canopy from the low hero camera.
//   WARES    tilted newspaper tiers on the front wall under the counter (white sheets with a coloured masthead band),
//            a four-tier magazine rack on the +X side wall (blank covers in red, yellow, lime, white with a white
//            title band), a dark hanging rail under the canopy lip with crimped snack bags on clips, and a second
//            freestanding glass-front cooler beside the -X side. Cooler bottles stand 1 cm proud of a pale glass pane
//            behind a white door frame (no transparency in the cel look).
//   Every closed part is wound from its own centre (convex parts), never by hand.
// Proportions (real size, base unit the booth width W = 2.0 m): booth 2.0 x 1.4 x 2.3 (on a 4 cm floor patch);
//   counter top 0.95, window 0.95-2.0 x 1.32 wide; canopy 2.3 x 2.1, front lip 2.39, back 2.50; sign 1.9 x 0.42 on
//   top, its top 2.86 (meta.height). Built-in cooler bay 0.56 wide, door glass 0.22-1.92; side cooler 0.55 x 0.6 x
//   1.65. Floor patch 4.0 x 3.2; tactile strips 0.3 wide (tiles 0.3 square, studs 4 x 4 per tile).
// Options: build(THREE, kit, colors, { height, floor }).
//   floor   true (default): the floor patch and tactile strips; false: the booth and its wares alone, dropped 4 cm
//           so the booth base stands on y = 0 (to sit on station-platform); natural height 2.82.
//   height  scales the whole stand uniformly so its top is `height` (default 2.86 m; 2.82 without the floor).
// Budget: 6.6k triangles, 9 meshes (the tactile studs are 2.5k of it); 3.8k, 8 meshes without the floor.
// Colours (meadow), base / shade:
//   booth walls, sign frame          iris #3f8a47 / hair #2c5131
//   canopy, red covers, bottles,     accent #d9483b / hair #2c5131 (threshold 0.25: the canopy top stays red,
//     bags, stool seat                 its underside and fascia undersides go dark green, the eave shadow)
//   trim, coolers, white sheets      sclera #f6f3ee / sky #d7ecef
//   sign face, counter, floor        moon #f7f3e1 / sky #d7ecef
//   lime covers, coin tray, bags     line #a9d16e / iris #3f8a47
//   yellow covers, bags, tactile,    practical #f2c94c (flat, threshold -1: tactile tops and covers keep one tone)
//     coins, bottles
//   interior lining, rails, legs,    hair #2c5131 (flat; next to ink only in small parts and the interior)
//     joint lines
//   cooler glass                     sky #d7ecef (flat, no hull)
//   tactile studs and bars           moon #f7f3e1 (flat, no hull)
// Pale parts use threshold 0.1 so walls square to the camera stay lit (front dot 0.30).

export const meta = {
  name: "station-kiosk",
  height: 2.86,
  script: "meadow",
  colors: {
    wall: "#3f8a47", wallShade: "#2c5131",
    red: "#d9483b", redShade: "#2c5131",
    trim: "#f6f3ee", trimShade: "#d7ecef",
    cream: "#f7f3e1", creamShade: "#d7ecef",
    lime: "#a9d16e", limeShade: "#3f8a47",
    yellow: "#f2c94c",
    dark: "#2c5131",
    glass: "#d7ecef",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const F = 0.04; // floor top: the booth stands on it
  const { floor = true } = opts;
  const natural = floor ? meta.height : meta.height - F;
  const { height = natural } = opts;
  const root = new THREE.Group();
  root.name = "kiosk";
  const body = new THREE.Group(); // uniform size scale lives here, so root stays the plain contract node
  body.name = "body";
  body.scale.setScalar(height / natural);
  root.add(body);
  const content = new THREE.Group();
  content.name = "content";
  body.add(content);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
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
  // axis box from min / max corners
  function bx(key, x0, y0, z0, x1, y1, z1) {
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // a slab leaning back: bottom edge at (y0, z0) on the front, top edge pushed back by `lean` m toward -Z (or +X side)
  function leanFront(key, x0, x1, y0, y1, z0, t, lean) {
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z0 + t], [x0, y0, z0 + t],
      [x0, y1, z0 - lean], [x1, y1, z0 - lean], [x1, y1, z0 - lean + t], [x0, y1, z0 - lean + t]]);
  }
  function leanSide(key, z0, z1, y0, y1, x0, t, lean) { // on a +X wall, leaning back toward -X
    hex(key, [[x0, y0, z0], [x0 + t, y0, z0], [x0 + t, y0, z1], [x0, y0, z1],
      [x0 - lean, y1, z0], [x0 - lean + t, y1, z0], [x0 - lean + t, y1, z1], [x0 - lean, y1, z1]]);
  }
  // a vertical n-sided cylinder, closed both ends
  function cyl(key, cx, cz, r, y0, y1, n = 10) {
    const ref = [cx, (y0 + y1) / 2, cz];
    const P = (i, y) => [cx + r * Math.cos((i / n) * Math.PI * 2), y, cz + r * Math.sin((i / n) * Math.PI * 2)];
    for (let i = 0; i < n; i++) {
      quad(key, P(i, y0), P(i + 1, y0), P(i + 1, y1), P(i, y1), ref);
      tri(key, [cx, y0, cz], P(i, y0), P(i + 1, y0), ref);
      tri(key, [cx, y1, cz], P(i, y1), P(i + 1, y1), ref);
    }
  }

  const COVER = ["red", "yellow", "lime", "trim"];

  // ---------- floor patch and tactile strips ----------
  if (floor) {
    bx("cream", -2.0, 0, -1.2, 2.0, F, 2.0);
    // dotted warning strip
    const Tz0 = 1.12, Tz1 = 1.42, Ty = F + 0.008;
    bx("yellow", -1.95, F, Tz0, 1.95, Ty, Tz1);
    for (let x = -1.8; x < 1.9; x += 0.3)
      for (let i = 0; i < 4; i++)
        for (let k = 0; k < 4; k++) {
          const sx = x - 0.1125 + i * 0.075, sz = Tz0 + 0.0375 + k * 0.075;
          bx("stud", sx - 0.018, Ty, sz - 0.018, sx + 0.018, Ty + 0.006, sz + 0.018);
        }
    // guidance strip: four long bars
    const Gz0 = 1.55, Gz1 = 1.85;
    bx("yellow", -1.95, F, Gz0, 1.95, Ty, Gz1);
    for (let k = 0; k < 4; k++) {
      const sz = Gz0 + 0.0375 + k * 0.075;
      bx("stud", -1.93, Ty, sz - 0.014, 1.93, Ty + 0.006, sz + 0.014);
    }
    // tile joints (dark decal lines on the tile tops)
    for (let x = -1.65; x < 1.7; x += 0.3) {
      bx("dark", x - 0.006, Ty, Tz0, x + 0.006, Ty + 0.003, Tz1);
      bx("dark", x - 0.006, Ty, Gz0, x + 0.006, Ty + 0.003, Gz1);
    }
  }

  // ---------- booth ----------
  const X0 = -1.0, X1 = 1.0, Z0 = -0.7, Z1 = 0.7, TOP = 2.34, T = 0.06;
  const WX0 = -0.92, WX1 = 0.40, WY0 = 0.95, WY1 = 2.0; // window opening
  const CX0 = 0.42; // cooler bay from here to X1
  bx("wall", X0, F, Z0, X1, TOP, Z0 + T); // back
  bx("wall", X0, F, Z0, X0 + T, TOP, Z1); // -X side
  bx("wall", X1 - T, F, Z0, X1, TOP, Z1); // +X side
  bx("wall", X0, 0.15, Z1 - T, CX0, WY0 - 0.06, Z1); // lower front
  bx("dark", X0 - 0.005, F, Z1 - T, CX0, 0.15, Z1 + 0.005); // kick band
  bx("wall", X0, WY1, Z1 - T, X1, TOP, Z1); // header
  bx("wall", CX0 - 0.02, F, Z1 - T - 0.02, X1, WY1, Z1 - 0.06); // cooler bay back face
  // window trim
  bx("trim", WX0 - 0.05, WY1, Z1, WX1 + 0.05, WY1 + 0.05, Z1 + 0.02);
  bx("trim", WX0 - 0.05, WY0 - 0.06, Z1, WX0, WY1, Z1 + 0.02);
  bx("trim", WX1, WY0 - 0.06, Z1, WX1 + 0.05, WY1, Z1 + 0.02);
  // interior lining
  bx("dark", X0 + T, F, Z0 + T, X1 - T, TOP - 0.01, Z0 + T + 0.01);
  bx("dark", X0 + T, F, Z0 + T, X0 + T + 0.01, TOP - 0.01, Z1 - T);
  bx("dark", X1 - T - 0.01, F, Z0 + T, X1 - T, TOP - 0.01, Z1 - T);
  bx("dark", X0 + T, TOP - 0.02, Z0 + T, X1 - T, TOP - 0.01, Z1 - T);
  // back shelves with small boxed sweets
  for (const y of [1.3, 1.65]) {
    bx("trim", X0 + T + 0.01, y, Z0 + T + 0.01, X1 - T - 0.01, y + 0.025, Z0 + T + 0.26);
    for (let i = 0; i < 11; i++) {
      const x = -0.85 + i * 0.16, h = 0.12 + ((i * 7) % 3) * 0.03;
      bx(COVER[(i + (y > 1.5 ? 2 : 0)) % 4], x - 0.06, y + 0.025, Z0 + T + 0.06, x + 0.06, y + 0.025 + h, Z0 + T + 0.2);
    }
  }
  // counter board
  bx("cream", WX0 - 0.03, WY0 - 0.05, Z1 - 0.3, WX1 + 0.05, WY0, Z1 + 0.18);
  // coin tray with rim and coins
  const ty = WY0, tx = -0.3, tz = Z1 + 0.04;
  bx("lime", tx - 0.11, ty, tz - 0.08, tx + 0.11, ty + 0.01, tz + 0.08);
  bx("lime", tx - 0.11, ty + 0.01, tz - 0.08, tx + 0.11, ty + 0.025, tz - 0.065);
  bx("lime", tx - 0.11, ty + 0.01, tz + 0.065, tx + 0.11, ty + 0.025, tz + 0.08);
  bx("lime", tx - 0.11, ty + 0.01, tz - 0.065, tx - 0.095, ty + 0.025, tz + 0.065);
  bx("lime", tx + 0.095, ty + 0.01, tz - 0.065, tx + 0.11, ty + 0.025, tz + 0.065);
  for (const [dx, dz, h] of [[-0.04, -0.02, 0.006], [0.02, 0.025, 0.006], [0.045, -0.025, 0.012]])
    cyl("yellow", tx + dx, tz + dz, 0.022, ty + 0.01, ty + 0.01 + h, 8);
  // stepped sweets stand on the counter, by the cooler (reads through the window from a low camera)
  for (let s = 0; s < 3; s++) {
    const y0 = WY0 + s * 0.09, zf = Z1 + 0.1 - s * 0.11;
    bx("trim", 0.0, WY0, zf - 0.11, 0.37, y0 + 0.09, zf);
    for (let i = 0; i < 4; i++) {
      const x = 0.05 + i * 0.09;
      bx(COVER[(i + s) % 3], x - 0.035, y0 + 0.09, zf - 0.08, x + 0.035, y0 + 0.17, zf - 0.03);
    }
  }
  // vendor's high stool
  const sx = -0.35, sz = -0.05;
  for (const [dx, dz] of [[-0.12, -0.12], [0.12, -0.12], [0.12, 0.12], [-0.12, 0.12]])
    bx("dark", sx + dx - 0.015, F, sz + dz - 0.015, sx + dx * 0.8 + 0.015, 0.78, sz + dz * 0.8 + 0.015);
  bx("dark", sx - 0.13, 0.3, sz - 0.13, sx + 0.13, 0.32, sz + 0.13);
  cyl("red", sx, sz, 0.19, 0.78, 0.84, 12);
  bx("dark", sx - 0.015, 0.84, sz - 0.17, sx + 0.015, 1.02, sz - 0.14);
  bx("red", sx - 0.17, 1.0, sz - 0.2, sx + 0.17, 1.14, sz - 0.13);

  // ---------- built-in cooler (+X bay) ----------
  function cooler(x0, x1, y0, y1, zf, rows) {
    const gx0 = x0 + 0.05, gx1 = x1 - 0.05, gy0 = y0 + 0.1, gy1 = y1 - 0.08;
    bx("glass", gx0, gy0, zf - 0.01, gx1, gy1, zf);
    const rh = (gy1 - gy0) / rows;
    for (let r = 0; r < rows; r++) {
      const y = gy0 + r * rh;
      bx("trim", gx0, y, zf, gx1, y + 0.02, zf + 0.03); // shelf lip
      const n = Math.max(3, Math.round((gx1 - gx0) / 0.085));
      const step = (gx1 - gx0) / n;
      for (let i = 0; i < n; i++) {
        const x = gx0 + step * (i + 0.5), key = COVER[(i + r) % 4 === 3 ? 0 : (i + r) % 4];
        const bh = Math.min(rh - 0.06, 0.22);
        bx(key, x - 0.026, y + 0.02, zf + 0.002, x + 0.026, y + 0.02 + bh * 0.72, zf + 0.012);
        bx(key, x - 0.012, y + 0.02 + bh * 0.72, zf + 0.002, x + 0.012, y + 0.02 + bh, zf + 0.012);
      }
    }
    // door frame (white, proud of everything) and a handle
    bx("trim", x0, y0, zf + 0.012, x1, gy0, zf + 0.05);
    bx("trim", x0, gy1, zf + 0.012, x1, y1, zf + 0.05);
    bx("trim", x0, gy0, zf + 0.012, gx0, gy1, zf + 0.05);
    bx("trim", gx1, gy0, zf + 0.012, x1, gy1, zf + 0.05);
    bx("dark", gx0 + 0.005, (gy0 + gy1) / 2 - 0.15, zf + 0.05, gx0 + 0.025, (gy0 + gy1) / 2 + 0.15, zf + 0.07);
  }
  cooler(CX0, X1, F, WY1, Z1 - 0.04, 5);
  // freestanding cooler beside the -X side
  const kx0 = -1.62, kx1 = -1.06, kz0 = -0.45, kz1 = 0.16, ky1 = 1.68;
  bx("trim", kx0, F, kz0, kx1, ky1, kz1);
  bx("red", kx0 - 0.01, ky1 - 0.16, kz1, kx1 + 0.01, ky1 + 0.01, kz1 + 0.05); // header band
  cooler(kx0, kx1, F, ky1 - 0.16, kz1, 4);

  // ---------- canopy and sign ----------
  const RX0 = -1.15, RX1 = 1.15, RZ0 = -0.82, RZ1 = 1.25, RYb = 2.5, RYf = 2.39, RT = 0.07;
  hex("red", [[RX0, RYb - RT, RZ0], [RX1, RYb - RT, RZ0], [RX1, RYf - RT, RZ1], [RX0, RYf - RT, RZ1],
    [RX0, RYb, RZ0], [RX1, RYb, RZ0], [RX1, RYf, RZ1], [RX0, RYf, RZ1]]);
  bx("red", RX0, RYf - RT - 0.1, RZ1 - 0.04, RX1, RYf - RT + 0.02, RZ1 + 0.02); // fascia
  // roof block from the wall tops up to 1 cm under the sloped slab
  const under = (z) => RYb - RT - 0.01 + ((RYf - RYb) * (z - RZ0)) / (RZ1 - RZ0);
  hex("wall", [[X0, TOP - 0.01, Z0], [X1, TOP - 0.01, Z0], [X1, TOP - 0.01, Z1], [X0, TOP - 0.01, Z1],
    [X0, under(Z0), Z0], [X1, under(Z0), Z0], [X1, under(Z1), Z1], [X0, under(Z1), Z1]]);
  const SZ = RZ1 - 0.03, SY0 = RYf - 0.02, SY1 = 2.86;
  bx("wall", -0.98, SY0, SZ - 0.03, 0.98, SY1, SZ + 0.05); // frame
  bx("cream", -0.92, SY0 + 0.06, SZ + 0.05, 0.92, SY1 - 0.06, SZ + 0.065); // blank face
  // snack-bag rail under the canopy lip
  const ry = RYf - RT - 0.14, rz = Z1 + 0.42;
  bx("dark", WX0 - 0.1, ry - 0.012, rz - 0.012, WX1 + 0.1, ry + 0.012, rz + 0.012);
  for (const x of [WX0 - 0.06, WX1 + 0.06]) bx("dark", x - 0.01, ry, rz - 0.01, x + 0.01, RYf - RT - 0.02, rz + 0.01);
  const BAGS = ["red", "yellow", "lime", "red", "yellow", "lime", "red"];
  for (let i = 0; i < 7; i++) {
    const x = WX0 + 0.07 + i * ((WX1 - WX0 - 0.14) / 6), k = BAGS[i];
    const by1 = ry - 0.045, by0 = by1 - 0.26 - (i % 2) * 0.03, w = 0.075;
    bx("dark", x - 0.015, by1 - 0.005, rz - 0.008, x + 0.015, ry, rz + 0.008); // clip
    // pillow bag: thin crimp at the top, full bulge low down
    hex(k, [[x - w, by0, rz - 0.04], [x + w, by0, rz - 0.04], [x + w, by0, rz + 0.04], [x - w, by0, rz + 0.04],
      [x - w, by1 - 0.035, rz - 0.012], [x + w, by1 - 0.035, rz - 0.012], [x + w, by1 - 0.035, rz + 0.012], [x - w, by1 - 0.035, rz + 0.012]]);
    bx(k, x - w, by1 - 0.035, rz - 0.006, x + w, by1, rz + 0.006);
    bx("trim", x - w * 0.6, (by0 + by1) / 2 - 0.04, rz + 0.02, x + w * 0.6, (by0 + by1) / 2 + 0.02, rz + 0.032); // label
  }

  // ---------- newspaper tiers (front wall under the counter) ----------
  for (let t = 0; t < 3; t++) {
    const y = 0.18 + t * 0.23, z = Z1 + 0.16 - t * 0.04;
    bx("dark", X0 + 0.04, y - 0.02, Z1, CX0 - 0.04, y, z + 0.05); // tier shelf
    bx("dark", X0 + 0.04, y, z + 0.035, CX0 - 0.04, y + 0.05, z + 0.05); // lip
    for (let i = 0; i < 4; i++) {
      const x0 = X0 + 0.08 + i * 0.35, x1 = x0 + 0.3;
      leanFront("trim", x0, x1, y, y + 0.24, z + 0.02, 0.012, 0.08);
      leanFront(COVER[(i + t) % 3], x0 + 0.02, x1 - 0.02, y + 0.17, y + 0.22, z + 0.02 - 0.08 * 0.7 + 0.01, 0.005, 0.017);
    }
  }

  // ---------- magazine rack (+X side wall) ----------
  for (let t = 0; t < 4; t++) {
    const y = 0.28 + t * 0.36, x = X1 + 0.2 - t * 0.03;
    bx("dark", X1, y - 0.02, Z0 + 0.06, x + 0.05, y, Z1 - 0.06);
    bx("dark", x + 0.035, y, Z0 + 0.06, x + 0.05, y + 0.06, Z1 - 0.06);
    for (let i = 0; i < 5; i++) {
      const z0 = Z0 + 0.1 + i * 0.25, z1 = z0 + 0.21, k = COVER[(i + t * 3) % 4];
      leanSide(k, z0, z1, y, y + 0.3, x + 0.02, 0.012, 0.1);
      // white title band near the top of the cover
      leanSide(k === "trim" ? "red" : "trim", z0 + 0.02, z1 - 0.02, y + 0.22, y + 0.27, x + 0.032 - 0.1 * 0.733, 0.005, 0.0167);
    }
  }

  // ---------- re-centre on the bbox (x, z) ----------
  let mnx = Infinity, mxx = -Infinity, mnz = Infinity, mxz = -Infinity;
  for (const arr of Object.values(soups))
    for (let i = 0; i < arr.length; i += 3) {
      mnx = Math.min(mnx, arr[i]); mxx = Math.max(mxx, arr[i]);
      mnz = Math.min(mnz, arr[i + 2]); mxz = Math.max(mxz, arr[i + 2]);
    }
  content.position.set(-(mnx + mxx) / 2, floor ? 0 : -F, -(mnz + mxz) / 2);

  // ---------- meshes ----------
  const MAT = {
    wall: [c.wall, c.wallShade, 0.1, true],
    red: [c.red, c.redShade, 0.25, true],
    trim: [c.trim, c.trimShade, 0.1, true],
    cream: [c.cream, c.creamShade, 0.1, true],
    lime: [c.lime, c.limeShade, 0.1, true],
    yellow: [c.yellow, c.yellow, -1, true],
    dark: [c.dark, c.dark, 0.1, false],
    glass: [c.glass, c.glass, -1, false],
    stud: [c.cream, c.cream, -1, false],
  };
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, { threshold, outline });
    mesh.name = key;
    content.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
