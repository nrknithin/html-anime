// beach-day.js - a Japanese summer beach at real size, a diorama tile 14 x 10 m, with the clip `surf`.
// Contract: harness/lab/README.md. Meters, +Y up, the SEA faces +Z (the shoreline runs along X), the tile's left is
// +X, the tile stands on y = 0 (its underside), centred on x = 0, z = 0 (the bbox).
//
// Construction (three.js boxes, cylinders, cones, spheres and tori plus hand-built triangle soups, all transformed
// into world space and merged per material: one mesh per material, 12 meshes, 3.8k triangles). The tile is a sand slab 0.25 m thick
// (the diorama edge), every prop stands on its top Y0 = 0.25.
//   SHORE   bands along X, back to front: dry sand (the slab), a wet-sand band (darker, its landward edge wavy),
//           the shallow water (a sheet 2 cm over the slab with a skirt down the tile's sea edge), the foam line on
//           the water's landward edge (a scalloped band) and two thin foam streaks out on the water. Water and foam
//           are flat, unlit and uninked: the wet-sand / foam / water colour steps draw the shoreline.
//   TOWER   a tall wooden lifeguard tower at the -X back: four splayed legs, X braces on the sides, a deck with a
//           seat, a railing whose lower half is boarded white, four roof posts and a red shade roof, a ladder from
//           the sand to the deck front, and a flag pole at the +X back corner with a plain red-over-yellow flag
//           flying toward +X (along the shore, square to the hero camera).
//   BEACH   three parasols (eight gores, two colours each: red / white, yellow / white, green / white) over beach
//           mats (green with white stripes), a cooler (green, white lid and handle), a suikawari set (a watermelon
//           half buried in a sand rim, dark stripes, a stick and a red blindfold lying beside it), a red-and-white
//           swim ring lying on the sand, a sandcastle of wet sand near the wet band, a rinse shower post on a slatted
//           duckboard at the +X back, and a row of four pairs of flip-flops in front of it.
//   MOTION  the foam, the water sheet and the flag are each one mesh whose vertices pose() rewrites: the soups are
//           rebuilt from the clip time in a fixed triangle order and copied into the same buffers, the hull normals
//           of the flag recomputed through a slot table made once. Nothing else moves. Joints are geometry-free markers
//           (tower, flag, melon, castle, ring, shower, shore) for lab close-ups (--focus melon).
// Proportions (real size; base unit the tower top H = 5.0 m, the flag-pole tip): deck 0.52 H (2.6 m below the
// tip), legs 1.8 x 1.6 at the sand, 1.3 x 1.2 at the deck, roof 1.95 above the deck, flag 1.0 x 0.62;
// parasols 2.1 across, 2.25 tall; mats 1.8 x 1.0; melon 0.44 across; ring 0.8 across; castle 0.6 tall;
// shower 2.15 tall; flip-flops 0.26 long.
// Options: build(THREE, kit, colors, { height, parasols })
//   height    the flag-pole tip (default 5.0): legs, ladder, roof posts and pole follow; the deck stays 2.6 m below
//             the tip (never below 1.0 m; the seat, railing and roof keep their real size). Props keep their size.
//             Not a scale; the lab's meta.height check is for the default.
//   parasols  1-3 parasols, each with its mat (default 3); the cooler stays.
// Clip (build() returns clips { surf: 3 }; pose("surf@1.2")): a 3 s loop. The swash runs the water's edge and its
// foam 0.45 m up and down the wet band (the far streaks lag behind), and the flag flutters (four travelling waves
// in 3 s, the amplitude growing toward the fly end; a low threshold keeps most facets in the base colour so the
// red and yellow halves stay legible, only facets turned away go skin). pose("rest") is surf@0.
// Colours (meadow, the summer-seaside script with the pale sky; seawall and umi-no-ie use it too): dry sand moon
// #f7f3e1 / skin #f0c2ae; wet sand and castle skin / practical #f2c94c; water sky #d7ecef flat; foam sclera
// #f6f3ee flat; tower wood practical / skin; white boards, parasol and ring white, lid, shower sclera / sky;
// red roof, gores, ring, blindfold, flag accent #d9483b / skin; yellow gores and flag practical / skin; green gores,
// melon, cooler iris #3f8a47 / hair #2c5131; mats line #a9d16e / iris; melon stripes and straps hair flat.

export const meta = {
  name: "beach-day",
  height: 5.0,
  script: "meadow",
  colors: {
    sand: "#f7f3e1", sandShade: "#f0c2ae",
    wet: "#f0c2ae", wetShade: "#f2c94c",
    water: "#d7ecef",
    foam: "#f6f3ee",
    wood: "#f2c94c", woodShade: "#f0c2ae",
    white: "#f6f3ee", whiteShade: "#d7ecef",
    red: "#d9483b", redShade: "#f0c2ae",
    green: "#3f8a47", greenShade: "#2c5131",
    mat: "#a9d16e", matShade: "#3f8a47",
    dark: "#2c5131",
    flagRed: "#d9483b", flagRedShade: "#f0c2ae",
    flagYellow: "#f2c94c", flagYellowShade: "#f0c2ae",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const H = opts.height ?? 5.0;
  const NP = Math.max(1, Math.min(3, Math.round(opts.parasols ?? 3)));
  const root = new THREE.Group();
  root.name = "beach-day";
  const joints = {};
  const TAU = Math.PI * 2;

  // ---------- soups: world positions + normals per material ----------
  let soups = {};
  const S = (k) => (soups[k] ??= { p: [], n: [] });
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const M = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
    new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), V(sx, sy, sz));
  function put(key, geo, m) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.applyMatrix4(m);
    const s = S(key), p = g.attributes.position.array, n = g.attributes.normal.array;
    for (let i = 0; i < p.length; i++) (s.p.push(p[i]), s.n.push(n[i]));
    geo.dispose();
  }
  const box = (key, x, y, z, sx, sy, sz, ry = 0) => put(key, new THREE.BoxGeometry(sx, sy, sz), M(x, y, z, 0, ry));
  const blk = (key, x0, x1, y0, y1, z0, z1) => box(key, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0);
  const cyl = (key, x, y, z, r0, r1, h, seg = 8) => put(key, new THREE.CylinderGeometry(r1, r0, h, seg), M(x, y + h / 2, z));
  // a beam (section w x h) between points a and b
  function beam(key, a, b, w, h = w) {
    const A = V(...a), B = V(...b), L = A.distanceTo(B);
    const up = Math.abs(B.y - A.y) > 0.9 * L ? V(0, 0, 1) : V(0, 1, 0);
    const m = new THREE.Matrix4().lookAt(A, B, up);
    m.setPosition(A.clone().add(B).multiplyScalar(0.5));
    put(key, new THREE.BoxGeometry(w, h, L), m);
  }
  // one flat triangle wound so its normal points along `out` (never skipped, so animated soups keep their length)
  function tri(key, a, b, e, out) {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ae = [e[0] - a[0], e[1] - a[1], e[2] - a[2]];
    let n = [ab[1] * ae[2] - ab[2] * ae[1], ab[2] * ae[0] - ab[0] * ae[2], ab[0] * ae[1] - ab[1] * ae[0]];
    const l = Math.hypot(...n) || 1;
    n = n.map((v) => v / l);
    const s = S(key);
    if (n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0) (s.p.push(...a, ...e, ...b), n = n.map((v) => -v));
    else s.p.push(...a, ...b, ...e);
    s.n.push(...n, ...n, ...n);
  }
  const quad = (key, a, b, e, d, out) => (tri(key, a, b, e, out), tri(key, a, e, d, out));
  const UP = [0, 1, 0];

  // ---------- layout ----------
  const X0 = -7, X1 = 7, Z0 = -5, Z1 = 5, Y0 = 0.25; // tile and its top
  const NX = 42; // segments along the shore
  const xs = (i) => X0 + ((X1 - X0) * i) / NX;
  const wetEdge = (x) => 1.0 + 0.16 * Math.sin(0.62 * x + 0.4) + 0.07 * Math.sin(1.7 * x);
  const swash = (t) => Math.sin((TAU * t) / 3); // -1 .. 1, one wave in 3 s
  const waterEdge = (x, t) => 2.55 + 0.45 * swash(t) + 0.14 * Math.sin(0.8 * x + 1.1) + 0.06 * Math.sin(2.3 * x);

  // sand slab and the wet band (static)
  blk("sand", X0, X1, 0, Y0, Z0, Z1);
  for (let i = 0; i < NX; i++) {
    const xa = xs(i), xb = xs(i + 1), y = Y0 + 0.008;
    quad("wet", [xa, y, wetEdge(xa)], [xb, y, wetEdge(xb)], [xb, y, 3.6], [xa, y, 3.6], UP);
  }

  // ---------- animated soups ----------
  function shore(t) {
    const yw = Y0 + 0.02, yf = Y0 + 0.032;
    for (let i = 0; i < NX; i++) {
      const xa = xs(i), xb = xs(i + 1);
      const ea = waterEdge(xa, t), eb = waterEdge(xb, t);
      quad("water", [xa, yw, ea], [xb, yw, eb], [xb, yw, Z1], [xa, yw, Z1], UP);
      // foam line: a scalloped landward lip, the band riding the edge
      const sa = 0.2 + 0.12 * Math.abs(Math.sin(2.4 * xa)), sb = 0.2 + 0.12 * Math.abs(Math.sin(2.4 * xb));
      quad("foam", [xa, yf, ea - sa], [xb, yf, eb - sb], [xb, yf, eb + 0.3], [xa, yf, ea + 0.3], UP);
      // two thin streaks out on the water, lagging the swash
      for (const [off, lag, w] of [[0.95, 0.35, 0.13], [1.75, 0.7, 0.09]]) {
        const fa = Math.min(Z1 - 0.1 - w, waterEdge(xa, t - lag) + off + 0.12 * Math.sin(1.3 * xa));
        const fb = Math.min(Z1 - 0.1 - w, waterEdge(xb, t - lag) + off + 0.12 * Math.sin(1.3 * xb));
        quad("foam", [xa, yf, fa], [xb, yf, fb], [xb, yf, fb + w], [xa, yf, fa + w], UP);
      }
    }
    // the water skirt down the tile's sea edge and the two ends, so the diorama edge reads as sea
    const ys = Y0 + 0.02;
    quad("water", [X0 - 0.004, 0, Z1 + 0.004], [X1 + 0.004, 0, Z1 + 0.004], [X1 + 0.004, ys, Z1 + 0.004], [X0 - 0.004, ys, Z1 + 0.004], [0, 0, 1]);
    for (const s of [-1, 1]) {
      const x = s * (X1 + 0.004), ea = waterEdge(s * X1, t);
      quad("water", [x, 0, ea], [x, 0, Z1 + 0.004], [x, ys, Z1 + 0.004], [x, ys, ea], [s, 0, 0]);
    }
  }

  // the flag: two closed thin slabs (red over yellow) on the pole, flying toward +X
  const PX = -3.2, PZ = -1.55; // pole position
  const FL = 1.0, FH = 0.62, FT = 0.02, FU = 8;
  function flag(t) {
    const yTop = H - 0.12;
    const wave = (u) => 0.13 * Math.pow(u, 1.2) * Math.sin(TAU * (1.25 * u - (4 * t) / 3));
    const P = (u, v, side) => {
      const x = PX + 0.05 + FL * u * (1 - 0.04 * Math.abs(Math.sin(TAU * (1.25 * u - (4 * t) / 3))) * u);
      return [x, yTop - FH * v - 0.05 * u * u, PZ + wave(u) + side * FT * 0.5];
    };
    for (const [key, v0, v1] of [["flagRed", 0, 0.5], ["flagYellow", 0.5, 1]]) {
      for (let i = 0; i < FU; i++) {
        const u0 = i / FU, u1 = (i + 1) / FU;
        for (const side of [1, -1]) quad(key, P(u0, v0, side), P(u1, v0, side), P(u1, v1, side), P(u0, v1, side), [0, 0, side]);
        quad(key, P(u0, v0, -1), P(u1, v0, -1), P(u1, v0, 1), P(u0, v0, 1), [0, 1, 0]); // top edge
        quad(key, P(u0, v1, -1), P(u1, v1, -1), P(u1, v1, 1), P(u0, v1, 1), [0, -1, 0]); // bottom edge
      }
      quad(key, P(1, v0, -1), P(1, v1, -1), P(1, v1, 1), P(1, v0, 1), [1, 0, 0]); // fly end
      quad(key, P(0, v0, -1), P(0, v1, -1), P(0, v1, 1), P(0, v0, 1), [-1, 0, 0]); // hoist
    }
  }

  // ---------- the lifeguard tower ----------
  const TX = -4.3, TZ = -1.6; // centre of the footprint
  const DY = Math.max(Y0 + 1.0, H - 2.6); // deck top
  const LW = 0.11;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) beam("wood", [TX + sx * 0.9, Y0, TZ + sz * 0.8], [TX + sx * 0.66, DY - 0.08, TZ + sz * 0.6], LW);
  // X braces on both sides and the back, two tiers
  const legAt = (sx, sz, y) => { const f = (y - Y0) / (DY - 0.08 - Y0); return [TX + sx * (0.9 - 0.24 * f), y, TZ + sz * (0.8 - 0.2 * f)]; };
  const yb = [Y0 + 0.35, Y0 + (DY - Y0) * 0.5, DY - 0.25];
  for (let k = 0; k < 2; k++) {
    for (const sx of [-1, 1]) {
      beam("wood", legAt(sx, -1, yb[k]), legAt(sx, 1, yb[k + 1]), 0.06);
      beam("wood", legAt(sx, 1, yb[k]), legAt(sx, -1, yb[k + 1]), 0.06);
    }
    beam("wood", legAt(-1, -1, yb[k]), legAt(1, -1, yb[k + 1]), 0.06);
    beam("wood", legAt(1, -1, yb[k]), legAt(-1, -1, yb[k + 1]), 0.06);
  }
  // deck, seat
  blk("wood", TX - 0.8, TX + 0.8, DY - 0.1, DY, TZ - 0.72, TZ + 0.72);
  blk("white", TX - 0.3, TX + 0.3, DY + 0.42, DY + 0.48, TZ - 0.35, TZ + 0.1);
  for (const sx of [-1, 1]) for (const sz of [-0.3, 0.05]) blk("wood", TX + sx * 0.25 - 0.025, TX + sx * 0.25 + 0.025, DY, DY + 0.42, TZ + sz - 0.025, TZ + sz + 0.025);
  blk("white", TX - 0.3, TX + 0.3, DY + 0.48, DY + 0.95, TZ - 0.38, TZ - 0.33);
  // railing: corner posts, top rail, boarded lower half (front leaves the ladder gap)
  const RY = DY + 0.95;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) blk("wood", TX + sx * 0.78 - 0.04, TX + sx * 0.78 + 0.04, DY, RY + 0.04, TZ + sz * 0.7 - 0.04, TZ + sz * 0.7 + 0.04);
  for (const sz of [-1, 1]) beam("wood", [TX - 0.82, RY, TZ + sz * 0.7], [TX + 0.82, RY, TZ + sz * 0.7], 0.07);
  for (const sx of [-1, 1]) beam("wood", [TX + sx * 0.78, RY, TZ - 0.74], [TX + sx * 0.78, RY, TZ + 0.74], 0.07);
  for (const sx of [-1, 1]) blk("white", TX + sx * 0.78 - 0.025, TX + sx * 0.78 + 0.025, DY, DY + 0.55, TZ - 0.66, TZ + 0.66);
  blk("white", TX - 0.74, TX + 0.74, DY, DY + 0.55, TZ - 0.725, TZ - 0.675);
  for (const sx of [-1, 1]) blk("white", sx > 0 ? TX + 0.3 : TX - 0.74, sx > 0 ? TX + 0.74 : TX - 0.3, DY, DY + 0.55, TZ + 0.675, TZ + 0.725);
  // roof posts and the red shade roof (falls toward the back)
  const RT = DY + 1.95;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) blk("wood", TX + sx * 0.74 - 0.035, TX + sx * 0.74 + 0.035, RY, RT - (sz < 0 ? 0.12 : 0), TZ + sz * 0.66 - 0.035, TZ + sz * 0.66 + 0.035);
  put("red", new THREE.BoxGeometry(2.0, 0.07, 1.85), M(TX, RT - 0.03, TZ + 0.02, -0.065));
  put("red", new THREE.BoxGeometry(2.04, 0.16, 0.04), M(TX, RT - 0.1, TZ + 0.97, -0.065));
  // ladder from the sand to the deck front
  const LZ0 = TZ + 1.75, LZ1 = TZ + 0.74;
  for (const sx of [-1, 1]) beam("wood", [TX + sx * 0.24, Y0, LZ0], [TX + sx * 0.24, DY + 0.5, LZ1 - 0.12], 0.07);
  const nR = Math.max(3, Math.round((DY - Y0) / 0.3));
  for (let k = 1; k < nR; k++) {
    const f = k / nR, y = Y0 + (DY - Y0) * f, z = LZ0 + (LZ1 - LZ0 - 0.12) * (f * (DY - Y0)) / (DY + 0.5 - Y0);
    beam("wood", [TX - 0.24, y, z], [TX + 0.24, y, z], 0.05, 0.035);
  }
  // flag pole at the +X back corner
  cyl("white", PX, Y0, PZ, 0.04, 0.028, H - 0.04 - Y0, 8);
  put("white", new THREE.SphereGeometry(0.05, 8, 5), M(PX, H - 0.05, PZ));
  beam("white", [TX + 0.78, DY + 0.5, PZ], [PX, DY + 0.5, PZ], 0.05); // stay to the tower

  // ---------- parasols and mats ----------
  const SPOTS = [
    [-0.6, -1.7, 0.1, 0.3, "red"],
    [1.8, -2.6, -0.09, -0.5, "wood"],
    [4.0, -3.3, 0.08, 0.9, "green"],
  ];
  for (const [px, pz, tilt, yaw, col] of SPOTS.slice(0, NP)) {
    const tm = M(px, Y0, pz, tilt, yaw, 0);
    const P = (x, y, z) => V(x, y, z).applyMatrix4(tm).toArray();
    const R = 1.05, yR = 1.85, yA = 2.25, nG = 8;
    put("white", new THREE.CylinderGeometry(0.022, 0.025, yA + 0.12, 6), tm.clone().multiply(M(0, (yA + 0.12) / 2 - 0.1, 0)));
    put("white", new THREE.SphereGeometry(0.045, 8, 4), tm.clone().multiply(M(0, yA + 0.05, 0)));
    for (let i = 0; i < nG; i++) {
      const a0 = (i / nG) * TAU, a1 = ((i + 1) / nG) * TAU, key = i % 2 ? "white" : col;
      const e0 = [R * Math.cos(a0), yR, R * Math.sin(a0)], e1 = [R * Math.cos(a1), yR, R * Math.sin(a1)];
      const am = (a0 + a1) / 2, mid = [0.56 * R * Math.cos(am), yR + 0.24, 0.56 * R * Math.sin(am)];
      const o = V(Math.cos(am) * 0.5, 1, Math.sin(am) * 0.5).transformDirection(tm).toArray();
      tri(key, P(0, yA, 0), P(...mid), P(...e0), o);
      tri(key, P(0, yA, 0), P(...e1), P(...mid), o);
      tri(key, P(...mid), P(...e1), P(...e0), o);
      const d0 = [e0[0] * 1.02, yR - 0.1, e0[2] * 1.02], d1 = [e1[0] * 1.02, yR - 0.1, e1[2] * 1.02];
      quad(key, P(...e0), P(...e1), P(...d1), P(...d0), V(Math.cos(am), -0.1, Math.sin(am)).transformDirection(tm).toArray());
      tri(key, P(0, yR - 0.06, 0), P(...d0), P(...d1), V(0, -1, 0).transformDirection(tm).toArray());
    }
    // the mat in front of the pole (toward the sea), with white stripes
    const mm = M(px + 0.15, Y0, pz + 0.35, 0, yaw * 0.4);
    put("mat", new THREE.BoxGeometry(1.8, 0.02, 1.0), mm.clone().multiply(M(0, 0.01, 0)));
    for (const sx of [-0.6, 0, 0.6]) put("white", new THREE.BoxGeometry(0.14, 0.02, 1.0), mm.clone().multiply(M(sx, 0.016, 0)));
  }
  // cooler beside the second parasol spot
  {
    const kx = 2.75, kz = -1.45, ry = -0.35;
    const km = M(kx, Y0, kz, 0, ry);
    put("green", new THREE.BoxGeometry(0.6, 0.36, 0.38), km.clone().multiply(M(0, 0.18, 0)));
    put("white", new THREE.BoxGeometry(0.63, 0.08, 0.41), km.clone().multiply(M(0, 0.4, 0)));
    put("white", new THREE.BoxGeometry(0.36, 0.035, 0.035), km.clone().multiply(M(0, 0.5, 0)));
    for (const s of [-1, 1]) put("white", new THREE.BoxGeometry(0.035, 0.08, 0.035), km.clone().multiply(M(s * 0.17, 0.46, 0)));
  }

  // ---------- suikawari: melon, stick, blindfold ----------
  {
    const mx = 0.6, mz = 0.2, r = 0.22;
    put("green", new THREE.SphereGeometry(r, 14, 6, 0, TAU, 0, Math.PI * 0.55), M(mx, Y0 - 0.02, mz));
    // dark stripes: wavy meridian bands just proud of the rind
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * TAU + 0.2, nS = 6;
      for (let j = 0; j < nS; j++) {
        const th0 = (j / nS) * 1.62, th1 = ((j + 1) / nS) * 1.62;
        const pt = (th, d) => {
          const aa = a + 0.12 * Math.sin(th * 7) + d;
          return [mx + r * 1.012 * Math.sin(th) * Math.cos(aa), Y0 - 0.02 + r * 1.012 * Math.cos(th), mz + r * 1.012 * Math.sin(th) * Math.sin(aa)];
        };
        const w0 = 0.02 + 0.13 * Math.sin(Math.max(th0, 0.12)), w1 = 0.13 * Math.sin(th1) + 0.02;
        const o = [Math.sin(th1) * Math.cos(a), Math.cos(th1), Math.sin(th1) * Math.sin(a)];
        quad("dark", pt(th0, -w0 * 0.5), pt(th1, -w1 * 0.5), pt(th1, w1 * 0.5), pt(th0, w0 * 0.5), o);
      }
    }
    // the sand rim it sits in
    put("sand", new THREE.TorusGeometry(r * 1.05, 0.055, 4, 14), M(mx, Y0 + 0.005, mz, Math.PI / 2, 0, 0, 1, 1, 0.6));
    // the stick lying on the sand, and the red blindfold beside it
    beam("wood", [mx - 0.25, Y0 + 0.022, mz + 0.42], [mx - 1.2, Y0 + 0.022, mz + 0.05], 0.045);
    put("red", new THREE.TorusGeometry(0.11, 0.022, 4, 12), M(mx + 0.42, Y0 + 0.012, mz + 0.35, Math.PI / 2, 0, 0, 1.25, 1, 0.5));
    beam("red", [mx + 0.52, Y0 + 0.01, mz + 0.4], [mx + 0.78, Y0 + 0.01, mz + 0.5], 0.06, 0.012);
    beam("red", [mx + 0.52, Y0 + 0.01, mz + 0.36], [mx + 0.76, Y0 + 0.01, mz + 0.28], 0.06, 0.012);
  }

  // ---------- swim ring, sandcastle ----------
  {
    const gx = 3.55, gz = 0.75, R = 0.3, r = 0.11, nS = 8;
    const gm = M(gx, Y0 + r * 0.9 + 0.06, gz, Math.PI / 2 - 0.22, 0.5, 0);
    for (let k = 0; k < nS; k++)
      put(k % 2 ? "white" : "red", new THREE.TorusGeometry(R, r, 7, 4, TAU / nS), gm.clone().multiply(M(0, 0, 0, 0, 0, (k * TAU) / nS)));
  }
  {
    const sx = -2.4, sz = 1.5;
    cyl("wet", sx, Y0, sz, 0.5, 0.4, 0.16, 12);
    cyl("wet", sx, Y0 + 0.16, sz, 0.27, 0.25, 0.26, 10);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU;
      put("wet", new THREE.BoxGeometry(0.08, 0.07, 0.08), M(sx + 0.21 * Math.cos(a), Y0 + 0.455, sz + 0.21 * Math.sin(a), 0, -a));
    }
    for (const [dx, dz] of [[0.36, 0.1], [-0.3, 0.2], [0.05, -0.36]]) {
      cyl("wet", sx + dx, Y0 + 0.13, sz + dz, 0.09, 0.08, 0.14, 7);
      put("wet", new THREE.ConeGeometry(0.1, 0.16, 7), M(sx + dx, Y0 + 0.35, sz + dz));
    }
    put("wet", new THREE.ConeGeometry(0.14, 0.2, 9), M(sx, Y0 + 0.52, sz));
  }

  // ---------- rinse shower and flip-flops ----------
  {
    const hx = 6.2, hz = -4.2;
    // slatted duckboard
    for (let k = 0; k < 6; k++) blk("wood", hx - 0.6, hx + 0.6, Y0, Y0 + 0.06, hz - 0.55 + k * 0.2, hz - 0.55 + k * 0.2 + 0.14);
    blk("white", hx - 0.07, hx + 0.07, Y0, Y0 + 2.15, hz - 0.45, hz - 0.31);
    beam("white", [hx, Y0 + 2.1, hz - 0.38], [hx, Y0 + 2.1, hz + 0.12], 0.06);
    put("white", new THREE.CylinderGeometry(0.11, 0.06, 0.07, 10), M(hx, Y0 + 2.04, hz + 0.12));
    beam("white", [hx, Y0 + 0.95, hz - 0.31], [hx, Y0 + 0.95, hz - 0.18], 0.04);
    put("red", new THREE.CylinderGeometry(0.05, 0.05, 0.03, 8), M(hx, Y0 + 1.0, hz - 0.18));
  }
  {
    const cols = ["red", "wood", "green", "white"];
    for (let k = 0; k < 4; k++) {
      const fx = 5.3 + k * 0.42, fz = -3.3 + 0.04 * Math.sin(k * 2.1);
      for (const s of [-1, 1]) {
        const x = fx + s * 0.07, ry = s * 0.05;
        const fm = M(x, Y0, fz, 0, ry);
        put(cols[k], new THREE.CylinderGeometry(0.05, 0.05, 0.022, 10), fm.clone().multiply(M(0, 0.011, 0.0, 0, 0, 0, 1, 1, 2.6)));
        // the V strap
        const Q = (a, b, cc) => V(a, b, cc).applyMatrix4(fm).toArray();
        beam("dark", Q(0, 0.035, 0.09), Q(-0.04, 0.03, -0.01), 0.016);
        beam("dark", Q(0, 0.035, 0.09), Q(0.04, 0.03, -0.01), 0.016);
      }
    }
  }

  // ---------- meshes ----------
  const MAT = {
    sand: [c.sand, c.sandShade, 0.1, 3],
    wet: [c.wet, c.wetShade, 0.1, 2.5],
    water: [c.water, c.water, -1, 0],
    foam: [c.foam, c.foam, -1, 0],
    wood: [c.wood, c.woodShade, 0.1, 2.5],
    white: [c.white, c.whiteShade, 0.1, 2.5],
    red: [c.red, c.redShade, 0.05, 2.5],
    green: [c.green, c.greenShade, 0.1, 2.5],
    mat: [c.mat, c.matShade, 0.1, 2],
    dark: [c.dark, c.dark, -1, 0],
    flagRed: [c.flagRed, c.flagRedShade, -0.12, 2],
    flagYellow: [c.flagYellow, c.flagYellowShade, -0.12, 2],
  };
  const meshes = {};
  function makeMesh(key, s) {
    const [base, shade, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    root.add(mesh);
    meshes[key] = mesh;
  }
  for (const [key, s] of Object.entries(soups)) makeMesh(key, s);

  // animated meshes: built once at t = 0, then rewritten in place
  const ANIM = ["water", "foam", "flagRed", "flagYellow"];
  const slots = {};
  soups = {};
  shore(0), flag(0);
  for (const key of ANIM) {
    makeMesh(key, soups[key]);
    const g = meshes[key].geometry;
    if (g.attributes.hullNormal) {
      // slot table: vertices sharing a rest position share a hull normal
      const p = g.attributes.position.array, ids = new Map(), sl = new Int32Array(p.length / 3);
      for (let i = 0; i < sl.length; i++) {
        const k = `${Math.round(p[i * 3] * 1e4)},${Math.round(p[i * 3 + 1] * 1e4)},${Math.round(p[i * 3 + 2] * 1e4)}`;
        if (!ids.has(k)) ids.set(k, ids.size);
        sl[i] = ids.get(k);
      }
      slots[key] = { sl, n: ids.size };
    }
  }
  function surf(t) {
    soups = {};
    shore(t), flag(t);
    for (const key of ANIM) {
      const g = meshes[key].geometry, s = soups[key];
      g.attributes.position.array.set(s.p);
      g.attributes.normal.array.set(s.n);
      g.attributes.position.needsUpdate = g.attributes.normal.needsUpdate = true;
      const st = slots[key];
      if (st && g.attributes.hullNormal) {
        const sum = new Float32Array(st.n * 3), out = g.attributes.hullNormal.array;
        for (let i = 0; i < st.sl.length; i++) for (let d = 0; d < 3; d++) sum[st.sl[i] * 3 + d] += s.n[i * 3 + d];
        for (let i = 0; i < st.sl.length; i++) {
          const j = st.sl[i] * 3, l = Math.hypot(sum[j], sum[j + 1], sum[j + 2]) || 1;
          out[i * 3] = sum[j] / l, out[i * 3 + 1] = sum[j + 1] / l, out[i * 3 + 2] = sum[j + 2] / l;
        }
        g.attributes.hullNormal.needsUpdate = true;
      }
      g.computeBoundingSphere(), g.computeBoundingBox();
    }
    root.updateMatrixWorld(true);
  }

  // marker joints (no geometry) for close-ups in the lab: --focus melon
  for (const [k, x, y, z] of [["tower", TX, DY, TZ], ["flag", PX + 0.5, H - 0.45, PZ], ["melon", 0.6, Y0, 0.2], ["castle", -2.4, Y0 + 0.3, 1.5],
    ["ring", 3.55, Y0, 0.75], ["shower", 6.2, Y0 + 1.0, -4.2], ["shore", -1, Y0, 2.6]]) {
    const j = new THREE.Object3D();
    j.name = k, j.position.set(x, y, z);
    root.add(j), (joints[k] = j);
  }

  const CLIPS = { surf: 3 };
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`beach-day: no clip "${m[1]}" (clips: surf)`);
      return surf(((+m[2] % 3) + 3) % 3);
    }
    if (name !== "rest") throw new Error(`beach-day: unknown pose "${name}" (rest, or surf@<seconds>)`);
    surf(0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
