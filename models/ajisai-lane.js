// ajisai-lane.js - a rainy-season temple lane (tsuyu anime set piece): a narrow stone-paved path beside a low temple
// wall, hydrangeas (ajisai) banked along both sides, a stone lantern, stepping stones, an open umbrella left against
// the wall, puddles on the paving, and a looping rain clip.
// Contract: harness/lab/README.md. Meters, +Y up, the open side of the lane faces +Z (the wall is at the back, -Z),
// the lane runs along X, its left is +X (the lantern end), stands on y = 0, centred on x = 0, z = 0.
//
// Construction (closed solids and decals, triangle soups merged per material, flat-shaded):
//   GROUND   one moss slab under everything (beds and the joints between paving stones show it).
//   LANE     ishidatami: three rows of rectangular slabs with deterministic lengths (a sine hash, no Math.random) and
//            2 cm joints, between two long kerb rows. Puddles are thin closed blobs (4 mm) on the slabs, pale sky
//            with a moon glint streak: the wet cue that reads from the raised hero camera.
//   WALL     a sujibei-style temple wall: a stone plinth, a plastered body with five pale horizontal lines (the
//            temple-rank stripes) near the top, and a small gabled tile cap: an eave fascia slab, a gable prism, a ridge
//            box, tile-row lines and eave-tile ends on the street slope.
//   AJISAI   each bush is a leaf mound (three bumped, squashed spheres), six broad pointed-oval leaves (closed
//            hexagon bipyramids, bent down along the midrib) drooping out under and between the heads, and 5-6 mophead
//            heads: a crowning head and a ring below it, spaced so a rim of leaf shows round each. A head is an inked
//            core dome under 14 four-petal florets (low square pyramids, each turned at random) spread over its outer
//            cap on a golden-angle spiral, so it reads as a dome of small flowers, not one rock. One tone per bush on a
//            fixed cycle per bed (~46 % blue, 36 % pink, 18 % white of the heads), with an odd head of another tone.
//            Back bushes 0.92-1.06 m (heads 0.17 m), front 0.52-0.62 m (0.14 m) and gapped so the paving shows.
//   PROPS    a kasuga-style stone lantern (hexagonal lathes: base, shaft, platform, light box with dark windows, roof,
//            jewel) in a gap of the back bed; three stepping stones across the front bed; an open umbrella (a scalloped
//            cone shell on 8 inked ribs, shaft and handle) with its crown against the wall and its handle on the lane.
//   RAIN     clip "rain" (1.2 s loop): crossed thin quads (straight streaks, slanted by a light wind) that fall 3
//            wraps of the band per loop, and teardrops that swell at leaf, umbrella-rim and lantern-roof tips, fall under
//            gravity and vanish into the ground, all in ONE mesh; ripple rings growing on the puddles ride on the pale
//            mesh after the wall stripes and glints. Positions are rewritten in pose(); nothing reads a clock.
//   Every closed part is wound from a point inside it or an explicit outward normal, never by hand.
// Proportions (real size; base unit the lane width 1.5 m): length 6 m (4 lane widths); kerbs 0.12 m; beds 0.68 m
// deep; wall plinth 0.3, body to 1.5, cap ridge 1.80 m (1.2 lane widths); lantern 1.42 m; umbrella 1.0 m across;
// ajisai heads 0.13-0.19 m radius; rain band 2.2 m (the top of the set with rain on).
// Options: build(THREE, kit, colors, { length, rain, height }).
//   length  lane length in m (default 6); bushes, slabs, puddles and rain scale with it; the umbrella and stepping
//           stones stay ~0.65 / 1.0 m from the +X end, the lantern at 0.1 length.
//   rain    true (default) | false | a density number (1 = ~150 streaks over 6 m). false drops the rain meshes and
//           the clip; the top is then the wall cap.
//   height  scales the whole set uniformly so its rest top is `height`.
// Budget: 14.3k triangles at the defaults (ajisai ~10.6k, rain ~1.6k), 13 meshes (one per material pair: tiles,
// lantern windows and umbrella ribs share the dark mesh). The front bed stops 1.5 m short of the +X end (stepping
// stones on grass there) and the umbrella stands at that end, so the low hero camera sees the paving.
// Colours (meadow, the one script: greens and a pale sky; no brown):
//   moss line #a9d16e / iris #3f8a47; paving, kerbs, lantern, stepping stones, plinth moon #f7f3e1 / skin #f0c2ae
//   (pale wet granite; shade only on far faces); puddles sky #d7ecef flat, glints and ripples sclera #f6f3ee flat;
//   wall plaster practical #f2c94c / skin (the ochre sujibei, the one warm field the hydrangeas sit against), stripes
//   sclera flat; tiles, lantern windows, umbrella ribs and handle hair #2c5131 flat (inked) with iris tile lines;
//   leaves iris / hair; heads blue sky / iris at 0.4 (cool sky florets with deep green in their shade facets, the
//   only blue the script has), pink skin / accent #d9483b, white sclera / line (the green-white of a fresh head);
//   umbrella accent / hair at -0.5 (the strong red spot; the camera-facing inside stays red); rain streaks and drops
//   sky, unlit and uninked. hair stays lighter than ink #1c261b and differs from the leaf base.

export const meta = {
  name: "ajisai-lane",
  height: 2.2,
  script: "meadow",
  colors: {
    moss: "#a9d16e", mossShade: "#3f8a47",
    stone: "#f7f3e1", stoneShade: "#f0c2ae",
    puddle: "#d7ecef", pale: "#f6f3ee",
    plaster: "#f2c94c", plasterShade: "#f0c2ae",
    tile: "#2c5131", tileLine: "#3f8a47",
    leaf: "#3f8a47", leafShade: "#2c5131",
    blue: "#d7ecef", blueShade: "#3f8a47",
    pink: "#f0c2ae", pinkShade: "#d9483b",
    white: "#f6f3ee", whiteShade: "#a9d16e",
    umbrella: "#d9483b", umbrellaShade: "#2c5131",
    rain: "#d7ecef",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const { length: L = 6 } = opts;
  const density = opts.rain === false ? 0 : opts.rain === true || opts.rain === undefined ? 1 : Math.max(0, +opts.rain);
  const root = new THREE.Group();
  root.name = "ajisai-lane";
  const body = new THREE.Group(); // centring offset and the uniform height scale live here
  body.name = "body";
  root.add(body);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  let X = (p) => p; // rigid placement of the part being built (the umbrella); winding survives it
  function tri(key, a, b, e, ref) { // wound away from ref, a point inside the solid
    [a, b, e, ref] = [a, b, e, ref].map(X);
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-10) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    S(key).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const triN = (key, a, b, e, n) => { // wound so the face normal agrees with n
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    tri(key, a, b, e, sub(m, n));
  };
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  const quadN = (key, a, b, e, d, n) => (triN(key, a, b, e, n), triN(key, a, e, d, n));
  function hex(key, p) { // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, x0, x1, y0, y1, z0, z1) {
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // vertical prism over a star-shaped (x, z) outline
  function prism(key, pts, y0, y1) {
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const ref = [cx, (y0 + y1) / 2, cz];
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % pts.length];
      quad(key, [p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]], ref);
      tri(key, [cx, y1, cz], [p[0], y1, p[1]], [q[0], y1, q[1]], ref);
      tri(key, [cx, y0, cz], [p[0], y0, p[1]], [q[0], y0, q[1]], ref);
    });
  }
  // lathe about a vertical axis at (cx, cz): profile [[r, y], ...] from the bottom (r = 0) to the top (r = 0)
  function lathe(key, prof, n, cx, cz, rot = 0) {
    for (let k = 0; k + 1 < prof.length; k++) {
      const [r0, y0] = prof[k], [r1, y1] = prof[k + 1], nr = y1 - y0, ny = -(r1 - r0);
      for (let j = 0; j < n; j++) {
        const a0 = rot + (j / n) * 2 * Math.PI, a1 = rot + ((j + 1) / n) * 2 * Math.PI, am = (a0 + a1) / 2;
        const P = (r, y, a) => [cx + r * Math.cos(a), y, cz + r * Math.sin(a)];
        quadN(key, P(r0, y0, a0), P(r0, y0, a1), P(r1, y1, a1), P(r1, y1, a0), [nr * Math.cos(am), ny, nr * Math.sin(am)]);
      }
    }
  }
  // deterministic jitter in [0, 1)
  const hash = (i, j = 0, k = 0) => { const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); };
  // a bumped, squashed sphere (centre c, radii r), seg around, rings top to bottom; bump = relative lump size
  function blob(key, cc, r, seg, rings, bump, seed, keep = () => true) {
    const V = [];
    for (let i = 0; i <= rings; i++) {
      const v = (i / rings) * Math.PI, row = [];
      for (let j = 0; j < seg; j++) {
        const u = ((j + (i % 2) * 0.5) / seg) * 2 * Math.PI;
        const f = i === 0 || i === rings ? 1 : 1 + bump * (hash(seed, i, j) - 0.5) * 2;
        row.push([cc[0] + r[0] * f * Math.sin(v) * Math.cos(u), cc[1] + r[1] * f * Math.cos(v), cc[2] + r[2] * f * Math.sin(v) * Math.sin(u)]);
      }
      V.push(row);
    }
    for (let i = 0; i < rings; i++)
      for (let j = 0; j < seg; j++) {
        const a = V[i][j], b = V[i][(j + 1) % seg], d = V[i + 1][j], e = V[i + 1][(j + 1) % seg];
        if (!keep(i, j)) continue;
        if (i > 0) tri(key, a, b, i % 2 ? e : d, cc);
        if (i < rings - 1) i % 2 ? tri(key, a, e, d, cc) : tri(key, b, e, d, cc);
      }
  }

  // ---------- layout ----------
  const LW = 0.75; // lane half-width (stone)
  const KW = 0.12; // kerb width
  const BZ0 = LW + KW; // beds start at |z| = BZ0
  const ZW = -1.55; // wall front face
  const ZF = 1.55; // front edge of the front bed
  const GY = 0.03, PY = 0.065; // ground top, paving top
  const xL = L * 0.1, xU = L / 2 - 0.65, xS = L / 2 - 1.0; // lantern, umbrella, stepping stones: the open end faces the hero camera

  // ground
  box("moss", -L / 2, L / 2, 0, GY, ZW - 0.02, ZF);

  // paving: three rows of slabs, kerbs on both edges
  const J = 0.02, rowW = (2 * LW - 2 * J) / 3;
  for (let r = 0; r < 3; r++) {
    const z0 = -LW + J / 2 + r * (rowW + J), z1 = z0 + rowW - J;
    let x = -L / 2 + J / 2 + hash(r, 7) * 0.3 * (r % 2);
    let k = 0;
    if (x > -L / 2 + 0.2) (box("stone", -L / 2, x - J, GY, PY, z0, z1));
    while (x < L / 2 - 0.05) {
      const len = 0.45 + 0.4 * hash(r, k, 3), x1 = Math.min(L / 2, x + len);
      box("stone", x, x1 - J, GY, PY - 0.006 * hash(r, k, 9), z0, z1);
      x = x1;
      k++;
    }
  }
  for (const s of [-1, 1]) {
    let x = -L / 2, k = 0;
    while (x < L / 2 - 0.05) {
      const x1 = Math.min(L / 2, x + 0.9 + 0.5 * hash(s, k, 5));
      box("stone", x + J / 2, x1 - J / 2, GY, PY + 0.03, s > 0 ? LW : -LW - KW, s > 0 ? LW + KW : -LW);
      x = x1;
      k++;
    }
  }

  // puddles: thin blobs on the slabs, a glint streak on each
  const blobOutline = (cx, cz, rx, rz, seed, n = 12) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * 2 * Math.PI, f = 0.82 + 0.3 * hash(seed, i);
      return [cx + rx * f * Math.cos(a), cz + rz * f * Math.sin(a)];
    });
  const nP = Math.max(2, Math.round(L / 1.6));
  const puddles = [];
  for (let i = 0; i < nP; i++) {
    const cx = -L / 2 + ((i + 0.5) / nP) * L + (hash(i, 21) - 0.5) * 0.5;
    const cz = (hash(i, 22) - 0.5) * 0.7, rx = 0.32 + 0.22 * hash(i, 23), rz = 0.17 + 0.1 * hash(i, 24);
    puddles.push([cx, cz, rx, rz]);
    prism("puddle", blobOutline(cx, cz, rx, rz, i), PY - 0.004, PY + 0.004);
    const gy = PY + 0.0055, gx = cx - rx * 0.25, gz = cz - rz * 0.25;
    tri("pale", [gx - rx * 0.4, gy, gz + 0.012], [gx + rx * 0.35, gy, gz - 0.025], [gx + rx * 0.4, gy, gz + 0.008], [gx, gy - 1, gz]);
    tri("pale", [gx - rx * 0.4, gy, gz + 0.012], [gx + rx * 0.4, gy, gz + 0.008], [gx - rx * 0.3, gy, gz + 0.04], [gx, gy - 1, gz]);
  }

  // ---------- wall ----------
  const WT = 0.34, ZB = ZW - WT;
  box("stone", -L / 2, L / 2, 0, 0.3, ZB - 0.03, ZW + 0.03);
  box("plaster", -L / 2 + 0.01, L / 2 - 0.01, 0.3, 1.5, ZB, ZW);
  for (let i = 0; i < 5; i++) box("pale", -L / 2 + 0.02, L / 2 - 0.02, 1.1 + i * 0.075, 1.13 + i * 0.075, ZW - 0.01, ZW + 0.004);
  // tile cap: fascia slab, gable prism, ridge box
  const ZC = (ZW + ZB) / 2, OV = 0.16;
  box("dark", -L / 2 - 0.04, L / 2 + 0.04, 1.5, 1.56, ZB - OV, ZW + OV);
  {
    const sec = [[ZW + OV, 1.56], [ZC, 1.74], [ZB - OV, 1.56]], ref = [0, 1.6, ZC];
    for (let i = 0; i < 3; i++) {
      const [z0, y0] = sec[i], [z1, y1] = sec[(i + 1) % 3];
      quad("dark", [-L / 2 - 0.04, y0, z0], [L / 2 + 0.04, y0, z0], [L / 2 + 0.04, y1, z1], [-L / 2 - 0.04, y1, z1], ref);
    }
    for (const x of [-L / 2 - 0.04, L / 2 + 0.04]) tri("dark", [x, sec[0][1], sec[0][0]], [x, sec[1][1], sec[1][0]], [x, sec[2][1], sec[2][0]], ref);
    box("dark", -L / 2 - 0.06, L / 2 + 0.06, 1.71, 1.8, ZC - 0.07, ZC + 0.07);
    // tile rows down the street slope (decals 3 mm above it), round eave-tile ends on the fascia
    const dz = ZC - (ZW + OV), dy = 1.74 - 1.56, ln = Math.hypot(dz, dy), nz = dy / ln, ny = -dz / ln; // slope normal (+z, +y)
    const off = 0.004, n = Math.round(L / 0.16);
    for (let i = 0; i <= n; i++) {
      const x = -L / 2 + (i / n) * L, w = 0.012;
      const A = (zz, yy) => [zz + nz * off, yy + ny * off];
      const [za, ya] = A(ZW + OV, 1.56), [zb, yb] = A(ZC - 0.07, 1.56 + dy * (ZC - 0.07 - ZW - OV) / (ZC - ZW - OV));
      quadN("tileLine", [x - w, ya, za], [x + w, ya, za], [x + w, yb, zb], [x - w, yb, zb], [0, ny, nz]);
      quadN("tileLine", [x - 0.03, 1.512, ZW + OV + 0.003], [x + 0.03, 1.512, ZW + OV + 0.003], [x + 0.03, 1.552, ZW + OV + 0.003], [x - 0.03, 1.552, ZW + OV + 0.003], [0, 0, 1]);
    }
  }

  // ---------- lantern (kasuga-style, hexagonal) ----------
  const LZ = ZW + 0.42;
  {
    const h6 = Math.PI / 6;
    lathe("stone", [[0, 0.02], [0.26, 0.02], [0.26, 0.1], [0.17, 0.15], [0, 0.15]], 6, xL, LZ, h6);
    lathe("stone", [[0, 0.14], [0.085, 0.14], [0.075, 0.42], [0.1, 0.44], [0.1, 0.48], [0.075, 0.5], [0.075, 0.74], [0, 0.74]], 8, xL, LZ);
    lathe("stone", [[0, 0.72], [0.1, 0.72], [0.24, 0.82], [0.24, 0.87], [0, 0.87]], 6, xL, LZ, h6);
    lathe("stone", [[0, 0.86], [0.16, 0.86], [0.16, 1.1], [0, 1.1]], 6, xL, LZ, h6);
    lathe("stone", [[0, 1.08], [0.36, 1.1], [0.37, 1.15], [0.2, 1.24], [0.07, 1.29], [0, 1.29]], 6, xL, LZ, h6);
    lathe("stone", [[0, 1.28], [0.045, 1.28], [0.04, 1.31], [0.065, 1.33], [0.07, 1.37], [0.04, 1.41], [0, 1.43]], 8, xL, LZ);
    // dark windows on the three faces toward the lane (+Z) and the lit +X side
    for (const a of [Math.PI / 6, Math.PI / 2, (5 * Math.PI) / 6].map((t) => t - Math.PI / 3)) {
      const nx = Math.cos(a + Math.PI / 6 + Math.PI / 6), nzz = Math.sin(a + Math.PI / 6 + Math.PI / 6);
      const ap = 0.16 * Math.cos(Math.PI / 6) + 0.003, tx = -nzz, tz = nx, w = 0.055;
      const P = (s, y) => [xL + nx * ap + tx * s, y, LZ + nzz * ap + tz * s];
      const Q = (sv, y, o) => [P(sv, y)[0] + nx * o, y, P(sv, y)[2] + nzz * o];
      hex("dark", [Q(-w, 0.92, -0.006), Q(w, 0.92, -0.006), Q(w, 1.05, -0.006), Q(-w, 1.05, -0.006), Q(-w, 0.92, 0.004), Q(w, 0.92, 0.004), Q(w, 1.05, 0.004), Q(-w, 1.05, 0.004)]);
    }
  }
  // stepping stones across the front bed
  for (let i = 0; i < 3; i++) {
    const cz = BZ0 + 0.13 + i * 0.22, cx = xS + (i - 1) * 0.08;
    prism("stone", blobOutline(cx, cz, 0.17, 0.11, 40 + i, 8), GY - 0.01, GY + 0.05);
  }

  // ---------- umbrella against the wall ----------
  const UX = xU, UZ = ZW + 0.42, drips = [];
  {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(UX, 0.64, ZW + 0.12),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.15, 0.35, 0, "YXZ")),
      new THREE.Vector3(1, 1, 1));
    const v = new THREE.Vector3();
    X = (p) => (v.set(p[0], p[1], p[2]).applyMatrix4(m), [v.x, v.y, v.z]);
    const n = 16, Ro = 0.5;
    const outer = (j) => { const a = (j / n) * 2 * Math.PI, sc = j % 2 ? 0.95 : 1; return [Ro * sc * Math.cos(a), j % 2 ? -0.24 : -0.28, Ro * sc * Math.sin(a)]; };
    const midO = (j) => { const a = (j / n) * 2 * Math.PI; return [0.27 * Math.cos(a), -0.11, 0.27 * Math.sin(a)]; };
    const inner = (j) => { const p = outer(j); return [p[0] * 0.975, p[1] - 0.02, p[2] * 0.975]; };
    const midI = (j) => { const p = midO(j); return [p[0] * 0.96, p[1] - 0.035, p[2] * 0.96]; };
    const tipO = [0, 0, 0], tipI = [0, -0.035, 0];
    for (let j = 0; j < n; j++) {
      const k = (j + 1) % n;
      tri("umbrella", tipO, midO(j), midO(k), [0, -0.5, 0]);
      quad("umbrella", midO(j), outer(j), outer(k), midO(k), [0, -0.7, 0]);
      tri("umbrella", tipI, midI(j), midI(k), [0, 0.5, 0]);
      quad("umbrella", midI(j), inner(j), inner(k), midI(k), [0, 0.5, 0]);
      quad("umbrella", outer(j), inner(j), inner(k), outer(k), [0, outer(j)[1], 0]);
    }
    // ribs under the canopy, shaft through the centre, a crook handle
    const beam = (key, a, b, w) => {
      const d = sub(b, a), up = Math.abs(d[1]) > 0.9 * Math.hypot(...d) ? [1, 0, 0] : [0, 1, 0];
      const nrm = (q) => { const l = Math.hypot(...q); return q.map((x) => x / l); };
      const s = nrm(cross(d, up)), u = nrm(cross(s, d));
      const P = (o, i, jj) => [0, 1, 2].map((t) => o[t] + s[t] * i * w / 2 + u[t] * jj * w / 2);
      hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
    };
    for (let j = 0; j < n; j += 2) {
      const p = inner(j), q = midI(j);
      beam("dark", [q[0], q[1] - 0.012, q[2]], [p[0] * 0.99, p[1] - 0.012, p[2] * 0.99], 0.014);
      beam("dark", [0, -0.05, 0], [q[0], q[1] - 0.012, q[2]], 0.014);
    }
    beam("dark", [0, 0.06, 0], [0, -0.86, 0], 0.026);
    beam("dark", [0, -0.84, 0], [0, -0.93, 0.07], 0.034);
    beam("dark", [0, -0.93, 0.07], [0, -0.88, 0.13], 0.034);
    // drip points: the two lowest rim points
    const rim = Array.from({ length: n }, (_, j) => X(outer(j))).sort((a, b) => a[1] - b[1]);
    drips.push([rim[0][0], rim[0][1] - 0.01, rim[0][2]], [rim[2][0], rim[2][1] - 0.01, rim[2][2]]);
    X = (p) => p;
  }
  // lantern roof corners drip too
  for (const a of [Math.PI / 6 + Math.PI / 3, Math.PI / 6 - Math.PI / 3]) drips.push([xL + 0.36 * Math.cos(a), 1.08, LZ + 0.36 * Math.sin(a)]);

  // ---------- ajisai ----------
  // tones run down a fixed cycle (10 blue, 6 pink, 4 white in 20; with the odd
  // mixed head that lands at ~46 % blue, 36 % pink, 18 % white of the heads), so no stretch of the lane goes one colour
  const CYCLE = "bwbpbpwbpbbpwbpbwbpb".split("").map((ch) => ({ b: "blue", p: "pink", w: "white" })[ch]);
  const bushes = [];
  for (const side of [-1, 1]) {
    const step = side < 0 ? 0.66 : 0.95, n = Math.max(2, Math.round((L - 0.3) / step));
    for (let i = 0; i < n; i++) {
      const x = -L / 2 + 0.3 + ((i + 0.5) / n) * (L - 0.6) + (hash(i, side, 31) - 0.5) * 0.18;
      if (side < 0 && (Math.abs(x - xL) < 0.5 || Math.abs(x - UX) < 0.55)) continue;
      if (side > 0 && x > xS - 0.5) continue; // the front bed stops short of the +X end, so the lane shows in the hero view
      const zc = side < 0 ? (ZW + -BZ0) / 2 + 0.02 : (BZ0 + ZF) / 2 - 0.02;
      const R = (side < 0 ? 0.42 : 0.34) + 0.06 * hash(i, side, 32);
      const H = side < 0 ? 0.92 + 0.14 * hash(i, side, 33) : 0.52 + 0.1 * hash(i, side, 33);
      bushes.push({ x, z: zc + (hash(i, side, 35) - 0.5) * 0.08, R, H, side, id: i * 2 + (side > 0 ? 1 : 0) });
    }
  }
  for (const side of [-1, 1]) // each bed runs the cycle from its own start, so neither side goes one colour
    bushes.filter((b) => b.side === side).forEach((b, i) => (b.tone = CYCLE[(i + (side > 0 ? 7 : 0)) % CYCLE.length]));
  const nrm = (q) => { const l = Math.hypot(...q) || 1; return q.map((v) => v / l); };
  // a mophead: an inked core dome under ~16 four-petal florets (low square pyramids) spread over its outer cap
  function head(key, p, rb, ax, seed) {
    blob(key, p, [rb * 0.8, rb * 0.72, rb * 0.8], 7, 4, 0.05, seed);
    const t0 = nrm(cross(ax, Math.abs(ax[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), t1 = cross(ax, t0);
    const NF = 14, s = rb * 0.36;
    for (let f = 0; f < NF; f++) {
      const th = Math.acos(1 - ((f + 0.5) / NF) * 1.3), ph = f * 2.39996 + seed; // golden-angle spiral over ~105 deg
      const n = nrm([0, 1, 2].map((q) => ax[q] * Math.cos(th) + Math.sin(th) * (t0[q] * Math.cos(ph) + t1[q] * Math.sin(ph))));
      const a = nrm(cross(n, Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), b2 = cross(n, a);
      const rot = hash(seed, f, 7) * Math.PI, ca = Math.cos(rot), sa = Math.sin(rot);
      const u = [0, 1, 2].map((q) => a[q] * ca + b2[q] * sa), v = [0, 1, 2].map((q) => b2[q] * ca - a[q] * sa);
      const q0 = [0, 1, 2].map((q) => p[q] + n[q] * rb * 0.74);
      const P = (i, j) => [0, 1, 2].map((q) => q0[q] + (u[q] * i + v[q] * j) * s);
      const c4 = [P(1, 0), P(0, 1), P(-1, 0), P(0, -1)], apex = [0, 1, 2].map((q) => q0[q] + n[q] * s * 0.5);
      const ref = [0, 1, 2].map((q) => q0[q] + n[q] * s * 0.15);
      for (let k = 0; k < 4; k++) tri(key, c4[k], c4[(k + 1) % 4], apex, ref);
      tri(key, c4[0], c4[1], c4[2], ref); tri(key, c4[0], c4[2], c4[3], ref);
    }
  }
  // a broad pointed oval leaf: a flat hexagon outline lifted along its midrib (closed bipyramid)
  function leaf(r0, dir, ln, wd) {
    const side = nrm([-dir[2], 0, dir[0]]), up = nrm(cross(side, dir));
    const at = (sv, w) => [0, 1, 2].map((q) => r0[q] + dir[q] * ln * sv + side[q] * w - up[q] * 0.07 * ln * sv * sv * 2);
    const rim = [at(0, 0), at(0.3, wd), at(0.68, wd * 0.78), at(1, 0), at(0.68, -wd * 0.78), at(0.3, -wd)];
    const mid = at(0.45, 0), top = [0, 1, 2].map((q) => mid[q] + up[q] * 0.018), bot = [0, 1, 2].map((q) => mid[q] - up[q] * 0.008);
    for (let k = 0; k < 6; k++) { tri("leaf", rim[k], rim[(k + 1) % 6], top, mid); tri("leaf", rim[k], rim[(k + 1) % 6], bot, mid); }
    return rim[3];
  }
  for (const b of bushes) {
    const { x, z, R, H, id, side } = b, my = H * 0.4;
    blob("leaf", [x, my, z], [R, H * 0.39, R * 0.82], 8, 5, 0.12, id);
    blob("leaf", [x - R * 0.55, H * 0.27, z + side * 0.04], [R * 0.58, H * 0.25, R * 0.58], 6, 3, 0.1, id + 100);
    blob("leaf", [x + R * 0.55, H * 0.29, z - side * 0.03], [R * 0.58, H * 0.25, R * 0.58], 6, 3, 0.1, id + 200);
    // heads: one crowning, a ring below it; centres spaced so each head keeps a rim of leaf around it
    const m = R > 0.4 ? 5 : 4, az0 = hash(id, 41) * 2 * Math.PI, rb0 = side < 0 ? 0.17 : 0.14, heads = [[hash(id, 46) * 6.28, 1.35]];
    for (let k = 0; k < m; k++) heads.push([az0 + (k / m) * 2 * Math.PI, 0.42 + 0.1 * hash(id, k, 43)]);
    heads.forEach(([a, el], k) => {
      const d = [Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)];
      const rb = rb0 * (0.9 + 0.2 * hash(id, k, 44));
      const p = [x + d[0] * (R + rb * 0.2), my + d[1] * (H * 0.39 + rb * 0.25), z + d[2] * (R * 0.82 + rb * 0.2)];
      const tone = hash(id, k, 45) < 0.1 ? (b.tone === "pink" ? "blue" : "pink") : b.tone;
      head(tone, p, rb, nrm([d[0], d[1] + 0.5, d[2]]), id * 31 + k);
    });
    // six broad leaves under and between the ring heads, drooping out over the bed
    for (let k = 0; k < 6; k++) {
      const a = az0 + ((k + 0.5) / 6) * 2 * Math.PI, el = 0.05 + 0.25 * hash(id, k, 2);
      const d = nrm([Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el) * 0.85]);
      const r0 = [x + d[0] * R * 0.75, my + d[1] * H * 0.36, z + d[2] * R * 0.62];
      const tip = leaf(r0, d, 0.26 + 0.06 * hash(id, k, 3), 0.085);
      if ((side < 0 ? d[2] > 0.3 : d[2] < -0.3) && tip[1] > 0.12) drips.push([tip[0], tip[1] - 0.012, tip[2]]);
    }
  }

  // ---------- static meshes (one per material pair) ----------
  const MAT = {
    moss: [c.moss, c.mossShade, 0.3, true, 3],
    stone: [c.stone, c.stoneShade, 0.2, true, 3],
    puddle: [c.puddle, c.puddle, 0.35, true, 2],
    plaster: [c.plaster, c.plasterShade, 0.1, true, 4],
    dark: [c.tile, c.tile, 0.35, true, 2], // tiles, lantern windows, umbrella ribs, shaft and handle
    tileLine: [c.tileLine, c.tileLine, 0.35, false],
    leaf: [c.leaf, c.leafShade, 0.25, true, 2],
    blue: [c.blue, c.blueShade, 0.4, true, 1.5],
    pink: [c.pink, c.pinkShade, 0.2, true, 1.5],
    white: [c.white, c.whiteShade, 0.2, true, 1.5],
    umbrella: [c.umbrella, c.umbrellaShade, -0.5, true, 3],
    pale: [c.pale, c.pale, -2, false], // wall stripes and puddle glints; the ripples join it when it rains
  };
  const sb = new THREE.Box3();
  for (const [key, arr] of Object.entries(soups)) {
    if (key === "pale" && density > 0) continue;
    const [base, shade, threshold, outline, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, px ? { threshold, outline, px } : { threshold, outline });
    mesh.name = key;
    body.add(mesh);
    g.computeBoundingBox();
    sb.union(g.boundingBox);
  }

  // ---------- rain: streaks and drops in one mesh, ripples on the pale mesh (rewritten per frame) ----------
  const T = 1.2, HB = 2.2, LS = 0.42, WRAPS = 3, SLANT = -0.1, G = 9.8;
  const dyn = [];
  if (density > 0) {
    // streaks: crossed quads, all one length, so every streak loops after WRAPS wraps of the band
    const ns = Math.round(25 * L * density), PB = HB - LS, W = 0.007;
    const zr = [ZW + 0.08, ZF - 0.05], streaks = [];
    for (let i = 0; i < ns; i++)
      streaks.push([-L / 2 + 0.3 + hash(i, 61) * (L - 0.3), zr[0] + hash(i, 62) * (zr[1] - zr[0]), hash(i, 63) * PB]);
    // drops: a teardrop (tip up) after the streaks in the same buffer
    const tpl = [[0, 1.7, 0], ...Array.from({ length: 6 }, (_, i) => [Math.cos((i / 6) * 2 * Math.PI), 0, Math.sin((i / 6) * 2 * Math.PI)]), [0, -1, 0]];
    const faces = [];
    for (let i = 0; i < 6; i++) faces.push([0, 1 + ((i + 1) % 6), 1 + i], [7, 1 + i, 1 + ((i + 1) % 6)]);
    const S0 = ns * 24 * 3, sp = new Float32Array(S0 + drips.length * faces.length * 9), DR = 0.018;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    const mesh = kit.toon(g, c.rain, c.rain, { threshold: -2, outline: false, doubleSided: true });
    mesh.name = "rain";
    mesh.frustumCulled = false;
    body.add(mesh);
    const dropAt = (i, cx, cy, cz, s, sy) => {
      let o = S0 + i * faces.length * 9;
      for (const f of faces) for (const v of f) { sp[o++] = cx + tpl[v][0] * s; sp[o++] = cy + tpl[v][1] * s * sy; sp[o++] = cz + tpl[v][2] * s; }
    };
    const dph = drips.map((_, i) => hash(i, 71));
    dyn.push((t) => {
      let o = 0;
      const put = (p) => (sp[o++] = p[0], sp[o++] = p[1], sp[o++] = p[2]);
      for (const [x0, z0, y0] of streaks) {
        const yb = ((((y0 - (WRAPS * PB * t) / T) % PB) + PB) % PB), yt = yb + LS;
        const xb = x0 + SLANT * yb, xt = x0 + SLANT * yt;
        for (const [ux, uz] of [[W, W], [W, -W]]) {
          const a = [xb - ux, yb, z0 - uz], b = [xb + ux, yb, z0 + uz], e = [xt + ux, yt, z0 + uz], d = [xt - ux, yt, z0 - uz];
          put(a); put(b); put(e); put(a); put(e); put(d);
          put(a); put(e); put(b); put(a); put(d); put(e);
        }
      }
      // each drop swells at its tip for 55 % of its cycle, falls under gravity, then vanishes into the ground
      drips.forEach(([x, y, z], i) => {
        const u = ((((t / T + dph[i]) % 1) + 1) % 1), tf = Math.sqrt((2 * (y - GY)) / G) / T;
        if (u < 0.55) dropAt(i, x, y - DR * 0.4 * (u / 0.55), z, DR * (0.45 + 0.55 * (u / 0.55)), 1);
        else if (u < 0.55 + tf) { const tau = (u - 0.55) * T; dropAt(i, x, y - 0.5 * G * tau * tau, z, DR, 1.6); }
        else dropAt(i, x, GY * 0.5, z, 0, 1);
      });
      g.attributes.position.needsUpdate = true;
      g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
    });
    // ripples: two rings per puddle, half a loop apart, growing and thinning; written after the static pale parts
    const rings = [];
    puddles.forEach(([cx, cz, rx, rz], i) => {
      for (let k = 0; k < 2; k++) rings.push([cx + (hash(i, k, 81) - 0.5) * rx * 0.5, cz + (hash(i, k, 82) - 0.5) * rz * 0.4, rz * 0.62, k * 0.5 + hash(i, 83) * 0.2]);
    });
    const pale = soups.pale ?? [], RS = 14, rp = new Float32Array(pale.length + rings.length * RS * 18);
    rp.set(pale);
    const g3 = new THREE.BufferGeometry();
    g3.setAttribute("position", new THREE.BufferAttribute(rp, 3));
    const rm = kit.toon(g3, c.pale, c.pale, { threshold: -2, outline: false });
    rm.name = "pale";
    rm.frustumCulled = false;
    body.add(rm);
    dyn.push((t) => {
      let o = pale.length;
      const put = (x, y, z) => (rp[o++] = x, rp[o++] = y, rp[o++] = z);
      const y = PY + 0.006;
      for (const [cx, cz, rmax, ph] of rings) {
        const u = ((((t / T + ph) % 1) + 1) % 1), r1 = 0.02 + rmax * u, r0 = Math.max(0.005, r1 - 0.018 * (1 - u) - 0.004);
        for (let j = 0; j < RS; j++) {
          const a0 = (j / RS) * 2 * Math.PI, a1 = ((j + 1) / RS) * 2 * Math.PI;
          const P = (r, a) => [cx + r * Math.cos(a), y, cz + r * 0.6 * Math.sin(a)];
          const [p, q, s, e] = [P(r0, a0), P(r1, a0), P(r1, a1), P(r0, a1)];
          put(...p); put(...e); put(...s); put(...p); put(...s); put(...q); // wound to face +Y
        }
      }
      g3.attributes.position.needsUpdate = true;
      g3.computeVertexNormals(); g3.computeBoundingBox(); g3.computeBoundingSphere();
    });
  }

  // centre the static set's footprint on x = 0, z = 0
  body.position.set(-(sb.min.x + sb.max.x) / 2, 0, -(sb.min.z + sb.max.z) / 2);

  const CLIPS = density > 0 ? { rain: T } : {};
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    let t = 0;
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`ajisai-lane: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ") || "none"})`);
      t = +m[2];
    } else if (name !== "rest") throw new Error(`ajisai-lane: unknown pose "${name}" (rest, or rain@<seconds>)`);
    for (const f of dyn) f(t);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  if (opts.height) {
    const top = new THREE.Box3().setFromObject(body).max.y;
    body.scale.setScalar(opts.height / top);
    body.position.multiplyScalar(opts.height / top);
    root.updateMatrixWorld(true);
  }
  return { root, joints, pose, clips: { ...CLIPS } };
}
