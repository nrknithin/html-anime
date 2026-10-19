// train-interior.js - the inside of a Japanese commuter train carriage: the "sitting across from each other on the
// train" set. Long bench seats down both sides, big windows over them, luggage racks, two rows of hanging hand-straps,
// a two-leaf sliding door in the middle of each side, stainless poles at the bench ends, ceiling light strips, blank ad
// frames along the ceiling cove and an end wall with a gangway door. Static set with one clip (sway).
// Contract: harness/lab/README.md. Meters, +Y up, the carriage runs along Z (the gangway end wall at -Z, the +Z end is
// the open cut of the section), the -X side is the far wall and the +X side is the removable one (cutaway, so a camera
// in the lit +X/+Z quadrant sees in), the floor slab stands on y = 0, centred on x = 0, z = 0.
//
// Construction (boxes, convex prisms, polygon tubes and swept rings, all triangle soups merged per material; flat
// shaded, so panels read crisp; every closed part is wound away from a point inside it, never by hand):
//   SHELL    floor slab, side walls built as bands around the openings (below the sill, piers between windows, above
//            the windows, door lintel), a 45-ish deg cove from the wall top to the flat ceiling, the ceiling slab, an
//            end wall of three convex prisms around the gangway door. Glass is a single inward-facing quad in the
//            middle of the wall, so the windows are see-through from outside. Outer faces carry the exterior red line.
//   SEATS    each bench: a plush cushion (rounded-rect prism), a low backrest (prism, rounded top), a dark heater skirt
//            under it, seat seams every 0.46 m; a seat-end screen (sodeita) with a stainless pole and a grab bar by
//            each door.
//   OVERHEAD luggage racks (bars on brackets) over the windows, two strap rails on ceiling drops, light strips (glow, a
//            thin ink), ad frames on both coves, an LED display box over each door.
//   STRAPS   a triangular ring (a tube swept round a rounded triangle, in the YZ plane so it faces the seated row) on a
//            belt, every 0.32 m on both rails. Rings and belts sit in the merged ring / trim meshes; each one records
//            its vertex range and hinge, and pose() rotates those vertices (positions, normals, hull normals) about the
//            hinge: one mesh per material, moved per ring.
// Proportions (real size, base unit the interior height Hi = 2.40 m): interior 2.90 wide (x +-1.45), walls 6 cm;
// floor top 0.02, seat top 0.44 (cushion 0.55 deep), backrest top 0.97, sill 0.98, window top 1.72, rack 1.80
// (0.30 deep), cove 1.95 -> 2.40 at |x| 1.13, strap rails 1.95 at |x| 0.88, ring bottoms ~1.62, light strips at |x|
// 0.46, ceiling top 2.45. Doors: 1.30 wide x 1.86 tall, centred on z = 0; gangway door 0.84 x 1.90. Section length 8 m.
// Colours (noon by day): walls sky #f2d7ae / skin #f0c2ae; ceiling moon #fff6e4 (always lit); floor skin #f0c2ae;
// seats accent #c4452d / iris #5c3d32; heater skirt iris flat; stainless moon / skin; glass practical
// #fffaf2 (blown-out daylight); light strips practical in an iris housing rim; ad paper practical / sclera; trim (seams, ad frames, belts,
// door seams, display) iris flat; rings moon / skin.
// Night (opts.night, still noon, NIGHT below): every surface drops to its shade under the lamps: walls skin, ceiling
// sky, steel and rings sky / skin; windows and door glass go hair #241c16 (dark outside); light strips and ads stay
// practical #fffaf2 and glow against it; seats and skirt unchanged.
// Options: build(THREE, kit, colors, { height, length, cutaway, nearBench, night }).
//   height   scales the whole set uniformly so the ceiling top is `height` (default 2.45, interior 2.40).
//   length   section length in metres before scaling (default 8, min 4): benches, windows, racks, straps, lights and
//            ads are laid out again for it; the doors stay in the middle.
//   cutaway  (default true) leaves out the +X wall with its windows, doors, rack, cove and ads (benches, poles,
//            straps stay), so the camera sees in. false closes the carriage.
//   nearBench the +X bench: true (full), "cushion" (cushion and skirt, no backrest or seat-end screen) or false (none,
//            only its poles). Default false with cutaway (its backrest was a red slab across the hero), true closed.
//   night    the lamp-lit night colours (dark windows, glowing strips, same script); `colors` is ignored then.
// Clip: sway 4 s (loops): every strap swings about its hinge, laterally (about Z, +-7.5 deg) and fore-aft (about X,
// +-5 deg), a slow wave travelling down the car, the two rails out of phase. pose("sway@1.2").
// Mesh count: 11 (one per material, plus their hulls), 9.7k triangles at 8 m (11k closed; the 46 straps are 6k).
// Ink px: shell and seats 3, skirt 2.5, stainless and rings 1.5, light strips 1, glass / ads / trim none.
// Joints: empty anchors for placing figures and cameras: seatL, seatR (a seat centre on each bench, at seat height; seatR stays put when nearBench is false),
// railL, railR (strap rails at z = 0), door (-X doorway floor), gangway (end-wall door floor).

export const meta = {
  name: "train-interior",
  height: 2.45,
  script: "noon",
  colors: {
    wall: "#f2d7ae", wallShade: "#f0c2ae",
    ceiling: "#fff6e4", ceilingShade: "#fff6e4",
    floor: "#f0c2ae", floorShade: "#f0c2ae",
    seat: "#c4452d", seatShade: "#5c3d32",
    skirt: "#5c3d32", skirtShade: "#5c3d32",
    steel: "#fff6e4", steelShade: "#f0c2ae",
    glass: "#fffaf2", glassShade: "#fff6e4",
    light: "#fffaf2", lightShade: "#fffaf2",
    ad: "#fffaf2", adShade: "#f6f3ee",
    trim: "#5c3d32", trimShade: "#5c3d32",
    ring: "#fff6e4", ringShade: "#f0c2ae",
  },
  poses: ["rest"],
};

// night, still noon: every surface drops to its shade (warm, lamp-lit), the windows go dark, the practicals glow
const NIGHT = {
  wall: "#f0c2ae", wallShade: "#5c3d32",
  ceiling: "#f2d7ae", ceilingShade: "#f0c2ae",
  floor: "#f0c2ae", floorShade: "#f0c2ae",
  seat: "#c4452d", seatShade: "#5c3d32",
  skirt: "#5c3d32", skirtShade: "#5c3d32",
  steel: "#f2d7ae", steelShade: "#f0c2ae",
  glass: "#241c16", glassShade: "#241c16",
  light: "#fffaf2", lightShade: "#fffaf2",
  ad: "#fffaf2", adShade: "#fffaf2",
  trim: "#5c3d32", trimShade: "#5c3d32",
  ring: "#f2d7ae", ringShade: "#f0c2ae",
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height, length = 8, cutaway = true, night = false } = opts;
  const nearBench = opts.nearBench ?? !cutaway; // the +X bench: true, "cushion" (no backrest), or false (none)
  const c = night ? NIGHT : { ...meta.colors, ...colors };
  const root = new THREE.Group();
  root.name = "train-interior";
  const set = new THREE.Group(); // uniform size scale lives here
  set.name = "carriage";
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
  // box from corner ranges
  function box(key, x0, x1, y0, y1, z0, z1) {
    if (x0 > x1) [x0, x1] = [x1, x0];
    if (z0 > z1) [z0, z1] = [z1, z0];
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // beam from a to b, w wide and h tall (h along `up`)
  function beam(key, a, b, w, h, up = [0, 1, 0]) {
    const d = sub(b, a);
    const s = nrm(cross(d, up)), u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // convex XY polygon extruded along Z
  function prism(key, poly, z0, z1) {
    const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    const ref = [cx, cy, (z0 + z1) / 2];
    for (let i = 0; i < poly.length; i++) {
      const [a, b] = [poly[i], poly[(i + 1) % poly.length]];
      quad(key, [a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1], ref);
      tri(key, [cx, cy, z0], [a[0], a[1], z0], [b[0], b[1], z0], ref);
      tri(key, [cx, cy, z1], [a[0], a[1], z1], [b[0], b[1], z1], ref);
    }
  }
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

  // ---------- dimensions ----------
  const L = Math.max(4, length), H2 = L / 2;
  const W = 1.45, T = 0.06, FY = 0.02, CEIL = 2.4, TOP = 2.45, WALLTOP = 1.95, COVEX = 1.13;
  const SILL = 0.98, WINTOP = 1.72, RACKY = 1.8, DW = 0.65, DH = 1.86, DZ = 0.86, GW = 0.42, GH = 1.9;
  const RAILX = 0.88, RAILY = 1.95;
  const sides = cutaway ? [-1] : [-1, 1];
  const halves = [[-H2, -1], [H2, 1]]; // [far end, sign]
  // windows of one half (z > 0 coordinates, mirrored for the -Z half)
  const wz0 = DZ + 0.1, wz1 = H2 - 0.1, nWin = Math.max(1, Math.round((wz1 - wz0) / 1.45)), PIER = 0.18;
  const ww = (wz1 - wz0 - (nWin + 1) * PIER) / nWin;
  const wins = Array.from({ length: nWin }, (_, i) => wz0 + PIER + i * (ww + PIER)); // window start z

  // ---------- shell ----------
  box("floor", -W - T, W + T, 0, FY, -H2 - T, H2);
  box("ceiling", -COVEX, COVEX, CEIL, TOP, -H2 - T, H2);
  for (const s of sides) {
    const xi = s * W, xo = s * (W + T), xm = s * (W + T / 2);
    for (const [zEnd, h] of halves) {
      const zA = h * DW, zB = h < 0 ? zEnd - T : zEnd;
      box("wall", xi, xo, FY, SILL, zA, zB); // below the sill
      box("wall", xi, xo, WINTOP, WALLTOP, zA, zB); // above the windows
      // piers: door jamb to first window, between windows, last window to the end
      let z = DW;
      for (const w0 of wins) { box("wall", xi, xo, SILL, WINTOP, h * z, h * w0); z = w0 + ww; }
      box("wall", xi, xo, SILL, WINTOP, h * z, zB);
      // windows: glass in the wall's middle, facing in; inner frame band and a centre bar
      for (const w0 of wins) {
        const za = h * w0, zb = h * (w0 + ww), out = [s * 5, 1.3, (za + zb) / 2];
        quad("glass", [xm, SILL, za], [xm, SILL, zb], [xm, WINTOP, zb], [xm, WINTOP, za], out);
        const xf0 = xi, xf1 = s * (W - 0.014);
        box("steel", xf0, xf1, SILL - 0.03, SILL + 0.035, za, zb);
        box("steel", xf0, xf1, WINTOP - 0.04, WINTOP + 0.02, za, zb);
        box("steel", xf0, xf1, SILL, WINTOP, za - h * 0.02, za + h * 0.035);
        box("steel", xf0, xf1, SILL, WINTOP, zb - h * 0.035, zb + h * 0.02);
        const zc = (za + zb) / 2;
        box("steel", xf0, s * (W - 0.01), SILL, WINTOP, zc - 0.025, zc + 0.025);
      }
      // exterior red line
      box("seat", xo, s * (W + T + 0.006), 0.78, 0.9, zA, zB);
      // luggage rack: bars on brackets over the bench
      const r0 = h * (DZ + 0.05), r1 = h < 0 ? zEnd + 0.03 : zEnd;
      for (const [d, t] of [[0.05, 0.02], [0.12, 0.016], [0.19, 0.016], [0.29, 0.03]])
        box("steel", s * (W - d - t / 2), s * (W - d + t / 2), RACKY - (d > 0.25 ? 0.03 : 0.012), RACKY, r0, r1);
      const nb = Math.max(2, Math.round(Math.abs(r1 - r0) / 1.0) + 1);
      for (let i = 0; i < nb; i++) {
        const zq = r0 + (r1 - r0) * (0.04 + 0.92 * (i / (nb - 1)));
        beam("steel", [xi, RACKY - 0.005, zq], [s * (W - 0.3), RACKY - 0.005, zq], 0.025, 0.03);
        beam("steel", [xi, RACKY - 0.16, zq], [s * (W - 0.28), RACKY - 0.01, zq], 0.02, 0.02);
      }
    }
    // door: lintel, two leaves with windows, seam, threshold plate, LED display
    box("wall", xi, xo, DH, WALLTOP, -DW, DW);
    for (const h of [-1, 1]) {
      const za = 0, zb = h * DW;
      box("steel", s * (W + 0.012), s * (W + 0.042), FY, DH, za, zb);
      const zc = h * DW / 2, wq = 0.19;
      const xin = s * (W + 0.011), xout = s * (W + 0.043);
      quad("glass", [xin, 1.0, zc - wq], [xin, 1.0, zc + wq], [xin, 1.7, zc + wq], [xin, 1.7, zc - wq], [0, 1.3, zc]);
      quad("glass", [xout, 1.0, zc - wq], [xout, 1.0, zc + wq], [xout, 1.7, zc + wq], [xout, 1.7, zc - wq], [s * 5 * -1, 1.3, zc]);
      for (const [x0, x1] of [[W + 0.006, W + 0.012], [W + 0.042, W + 0.048]]) { // window rubber, both faces
        box("trim", s * x0, s * x1, 0.96, 1.74, zc - wq - 0.03, zc - wq);
        box("trim", s * x0, s * x1, 0.96, 1.74, zc + wq, zc + wq + 0.03);
        box("trim", s * x0, s * x1, 0.96, 1.0, zc - wq, zc + wq);
        box("trim", s * x0, s * x1, 1.7, 1.74, zc - wq, zc + wq);
      }
    }
    box("trim", s * (W + 0.005), s * (W + 0.012), FY, DH, -0.012, 0.012);
    box("trim", s * (W - 0.004), xi, DH - 0.03, DH, -DW, DW);
    box("steel", s * (W - 0.14), s * (W + T), FY, FY + 0.008, -DW, DW);
    box("trim", s * (W - 0.05), xi, DH + 0.01, WALLTOP - 0.01, -0.3, 0.3);
    // cove and its ad frames
    const cA = [s * W, WALLTOP], cB = [s * COVEX, CEIL];
    hex("wall", [[cA[0], cA[1], -H2 - T], [s * (W + T), WALLTOP, -H2 - T], [s * COVEX, TOP, -H2 - T], [cB[0], cB[1], -H2 - T],
      [cA[0], cA[1], H2], [s * (W + T), WALLTOP, H2], [s * COVEX, TOP, H2], [cB[0], cB[1], H2]]);
    const n = nrm([-s * (CEIL - WALLTOP), -(W - COVEX), 0]);
    const cp = (u, z, o) => [cA[0] + (cB[0] - cA[0]) * u + n[0] * o, cA[1] + (cB[1] - cA[1]) * u + n[1] * o, z];
    const nAd = Math.max(2, Math.round(L / 1.0));
    for (let i = 0; i < nAd; i++) {
      const z = -H2 + (L * (i + 0.5)) / nAd, hw = 0.36;
      const back = cp(0.5, z, -1);
      quad("trim", cp(0.15, z - hw - 0.014, 0.006), cp(0.15, z + hw + 0.014, 0.006), cp(0.87, z + hw + 0.014, 0.006), cp(0.87, z - hw - 0.014, 0.006), back);
      quad("ad", cp(0.17, z - hw, 0.011), cp(0.17, z + hw, 0.011), cp(0.85, z + hw, 0.011), cp(0.85, z - hw, 0.011), back);
    }
  }

  // ---------- end wall with the gangway door (-Z) ----------
  const ez0 = -H2 - T, ez1 = -H2;
  for (const s of [-1, 1]) {
    const poly = [[s * (W + T), 0], [s * GW, 0], [s * GW, TOP], [s * COVEX, TOP], [s * (W + T), WALLTOP]];
    prism("wall", poly, ez0, ez1);
    box("trim", s * GW, s * (GW + 0.035), FY, GH + 0.035, ez1, ez1 + 0.006);
  }
  box("wall", -GW, GW, GH, TOP, ez0, ez1);
  box("trim", -GW - 0.035, GW + 0.035, GH, GH + 0.035, ez1, ez1 + 0.006);
  box("steel", -GW, GW, FY, GH, ez0 + 0.012, ez1 - 0.014);
  quad("glass", [-0.2, 1.02, ez1 - 0.013], [0.2, 1.02, ez1 - 0.013], [0.2, 1.66, ez1 - 0.013], [-0.2, 1.66, ez1 - 0.013], [0, 1.3, ez0 - 1]);
  for (const [a, b, y0, y1] of [[-0.23, -0.2, 0.99, 1.69], [0.2, 0.23, 0.99, 1.69], [-0.2, 0.2, 0.99, 1.02], [-0.2, 0.2, 1.66, 1.69]])
    box("trim", a, b, y0, y1, ez1 - 0.014, ez1 - 0.008);
  box("trim", 0.28, 0.33, 0.95, 1.12, ez1 - 0.014, ez1 - 0.002); // handle

  // ---------- benches, screens, poles ----------
  for (const s of [-1, 1]) {
    const X = (d) => s * (W - d);
    for (const [zEnd, h] of halves) {
      const za = h * DZ, zb = h < 0 ? zEnd : zEnd;
      const [z0, z1] = za < zb ? [za, zb] : [zb, za];
      const near = s > 0 ? nearBench : true;
      if (near) {
        // cushion: rounded front corners; backrest: tilted slab, rounded top front
        const cush = rrect(0, 0.55, 0.3, 0.44, [0, 0.035, 0.05, 0]).map(([d, y]) => [X(d), y]);
        prism("seat", cush, z0, z1);
        const back = [[0, 0.44], [0.11, 0.46], [0.095, 0.93], [0.07, 0.965], [0.035, 0.975], [0, 0.975]].map(([d, y]) => [X(d), y]);
        if (near === true) prism("seat", back, z0, z1);
        box("skirt", X(near === true ? 0 : 0.06), X(0.47), FY, 0.3, z0, z1);
        // seams: one per seat across the cushion and up the backrest
        const nSeat = Math.round((z1 - z0) / 0.46);
        for (let i = 1; i < nSeat; i++) {
          const z = z0 + ((z1 - z0) * i) / nSeat;
          box("trim", X(near === true ? 0.11 : 0.06), X(0.52), 0.44, 0.445, z - 0.007, z + 0.007);
          if (near === true) beam("trim", [X(0.113), 0.47, z], [X(0.098), 0.92, z], 0.014, 0.008, [s, 0, 0]);
        }
      }
      // seat-end screen by the door (with its bench), its pole and grab bar
      const zs = h * (DZ - 0.015);
      if (near === true) box("wall", X(0), X(0.6), FY, 1.12, zs - 0.015, zs + 0.015);
      tube("steel", [X(0.63), FY, zs], [X(0.63), CEIL, zs], 0.018, 8);
      if (near === true) tube("steel", [X(0), 1.15, zs], [X(0.63), 1.15, zs], 0.014, 6);
      // vertical grab rail on the door jamb
      if (sides.includes(s)) tube("steel", [X(0.03), 0.8, h * (DW + 0.06)], [X(0.03), 1.75, h * (DW + 0.06)], 0.014, 6);
    }
  }

  // ---------- ceiling: light strips, strap rails ----------
  const nLight = Math.max(2, Math.round((L - 0.2) / 1.25));
  const segL = (L - 0.2) / nLight;
  for (const x of [-0.46, 0.46])
    for (let i = 0; i < nLight; i++) {
      const z = -H2 + 0.1 + i * segL;
      box("light", x - 0.08, x + 0.08, CEIL - 0.035, CEIL, z + 0.03, z + segL - 0.03);
      box("trim", x - 0.1, x + 0.1, CEIL - 0.012, CEIL, z + 0.01, z + segL - 0.01); // housing rim: the strip reads on a pale ceiling
    }
  const sway = []; // { key, start, end, hinge, z, side }
  const nDrop = Math.max(2, Math.round(L / 1.6) + 1);
  for (const s of [-1, 1]) {
    const x = s * RAILX;
    tube("steel", [x, RAILY, -H2], [x, RAILY, H2], 0.016, 6);
    for (let i = 0; i < nDrop; i++) {
      const z = -H2 + 0.2 + ((L - 0.4) * i) / (nDrop - 1);
      tube("steel", [x, RAILY, z], [x, CEIL, z], 0.012, 6);
    }
    // straps: belt + triangular ring, hinged at the rail
    const step = 0.32, n = Math.floor((L - 0.4) / step);
    const zStart = -((n - 1) * step) / 2;
    for (let i = 0; i < n; i++) {
      const z = zStart + i * step;
      const hinge = [x, RAILY - 0.018, z];
      box("steel", x - 0.02, x + 0.02, RAILY - 0.03, RAILY + 0.02, z - 0.025, z + 0.025); // clip on the rail
      const t0 = S("trim").length;
      box("trim", x - 0.004, x + 0.004, RAILY - 0.24, RAILY - 0.02, z - 0.015, z + 0.015); // belt
      box("trim", x - 0.012, x + 0.012, RAILY - 0.27, RAILY - 0.22, z - 0.022, z + 0.022); // ring holder
      sway.push({ key: "trim", start: t0, end: S("trim").length, hinge, z, side: s });
      const r0 = S("ring").length;
      triRing(x, RAILY - 0.255, z);
      sway.push({ key: "ring", start: r0, end: S("ring").length, hinge, z, side: s });
    }
  }
  // a tube swept round a rounded triangle in the plane x = x0, apex at (y, z)
  function triRing(x0, yTop, z0) {
    const corners = [[0, -0.012], [-0.062, -0.135], [0.062, -0.135]]; // (z, y) offsets, counter-clockwise
    const rc = 0.02, rt = 0.011, nt = 5, path = [];
    for (let k = 0; k < 3; k++) {
      const P = corners[(k + 2) % 3], C = corners[k], N = corners[(k + 1) % 3];
      const out = (A, B) => { const d = nrm([B[0] - A[0], B[1] - A[1], 0]); return [d[1], -d[0]]; };
      const n1 = out(P, C), n2 = out(C, N);
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

  // ---------- anchors (empty joints for placing characters and cameras; nothing hangs off them) ----------
  for (const [name, p] of Object.entries({
    seatL: [-(W - 0.3), 0.44, DZ + 1.2], seatR: [W - 0.3, 0.44, DZ + 1.2], // a seat's centre on each bench
    railL: [-RAILX, RAILY, 0], railR: [RAILX, RAILY, 0], door: [-W, 0, 0], gangway: [0, 0, -H2],
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
    ceiling: [c.ceiling, c.ceilingShade, -1, 3],
    floor: [c.floor, c.floorShade, -1, 3],
    seat: [c.seat, c.seatShade, 0.1, 3],
    skirt: [c.skirt, c.skirtShade, 0.1, 2.5],
    steel: [c.steel, c.steelShade, 0.25, 1.5],
    glass: [c.glass, c.glassShade, -1, 0],
    light: [c.light, c.lightShade, -1, 1],
    ad: [c.ad, c.adShade, -1, 0],
    trim: [c.trim, c.trimShade, -1, 0],
    ring: [c.ring, c.ringShade, 0.2, 1.5],
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
  // rest copies of everything the sway moves
  const rest = {};
  for (const key of ["trim", "ring"]) {
    const g = meshes[key].geometry, a = g.attributes;
    rest[key] = { p: a.position.array.slice(), n: a.normal.array.slice(), h: a.hullNormal ? a.hullNormal.array.slice() : null };
  }

  // ---------- poses and clips ----------
  // Sign convention: rz > 0 swings a strap's ring toward -X (right-hand rule about +Z at the hinge); rx > 0 swings it
  // toward +Z. Rest: every strap hangs straight.
  const CLIPS = { sway: 4 };
  const D = Math.PI / 180;
  function setStraps(angle) {
    for (const key of ["trim", "ring"]) {
      const g = meshes[key].geometry, a = g.attributes, R = rest[key];
      a.position.array.set(R.p);
      a.normal.array.set(R.n);
      if (R.h && a.hullNormal) a.hullNormal.array.set(R.h);
    }
    if (angle) {
      for (const e of sway) {
        const [rz, rx] = angle(e);
        const cz = Math.cos(rz), sz = Math.sin(rz), cx = Math.cos(rx), sx = Math.sin(rx);
        // R = Rz * Rx
        const rot = (v) => {
          const y1 = v[1] * cx - v[2] * sx, z1 = v[1] * sx + v[2] * cx;
          return [v[0] * cz - y1 * sz, v[0] * sz + y1 * cz, z1];
        };
        const g = meshes[e.key].geometry, a = g.attributes, R = rest[e.key];
        for (let i = e.start; i < e.end; i += 3) {
          const p = rot([R.p[i] - e.hinge[0], R.p[i + 1] - e.hinge[1], R.p[i + 2] - e.hinge[2]]);
          a.position.array[i] = p[0] + e.hinge[0]; a.position.array[i + 1] = p[1] + e.hinge[1]; a.position.array[i + 2] = p[2] + e.hinge[2];
          const nn = rot([R.n[i], R.n[i + 1], R.n[i + 2]]);
          a.normal.array.set(nn, i);
          if (R.h && a.hullNormal) a.hullNormal.array.set(rot([R.h[i], R.h[i + 1], R.h[i + 2]]), i);
        }
      }
    }
    for (const key of ["trim", "ring"]) {
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
      if (!CLIPS[m[1]]) throw new Error(`train-interior: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      const Tn = CLIPS[m[1]], ph = (((+m[2] % Tn) + Tn) % Tn) / Tn, TAU = Math.PI * 2;
      // lateral: one slow sway per loop plus a small double, a wave down the car; fore-aft: two per loop
      setStraps((e) => [
        D * (6 * Math.sin(TAU * ph - 0.35 * e.z + (e.side > 0 ? 0.6 : 0)) + 1.5 * Math.sin(TAU * 2 * ph + 0.9 * e.z)),
        D * 5 * Math.sin(TAU * ph - 0.8 * e.z + (e.side > 0 ? 1.1 : 0)),
      ]);
    } else {
      if (name !== "rest") throw new Error(`train-interior: unknown pose "${name}" (rest, or sway@<seconds>)`);
      setStraps(null);
    }
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
