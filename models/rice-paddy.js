// rice-paddy.js - a countryside rice paddy plot (inaka anime set piece), static, in three seasons.
// Contract: harness/lab/README.md. Meters, +Y up, the front levee faces +Z, its left is +X (the channel side),
// stands on y = 0, centred on x = 0, z = 0 (the bbox of the plot).
//
// Construction (closed solids only, triangle soups merged per material, flat-shaded; 11 meshes in any option):
//   FIELD    one flooded rectangle W x D (default 12 x 8 m): an opaque water plane at y = 0.06 with pale glint streaks
//            laid along X 4 mm above it (the sky caught in the water: the cue that it is flooded, not a lawn).
//   LEVEES   aze: four straight trapezoid prisms (0.70 m at the toe, 0.44 m on top, 0.30 m tall) around the field, the
//            X sides butting into the Z sides' cores, so corners close without mitres. Grass all over, a trodden earth
//            strip (0.2 m decal) down the top. The +X levee is cut by a 0.44 m gap at the sluice.
//   CHANNEL  a narrow ditch (0.45 m of water at y = 0.14, higher than the field) between the +X levee and a lower outer
//            bank, the full depth of the plot. The SLUICE stands in the levee gap: two square posts, a plank board with
//            two cleats slotted between them holding the channel back, a lifting bar on studs; field water runs into it.
//   RICE     ONE mesh, rows along X 0.40 m apart, hills 0.36 m apart, tiny deterministic jitter (a sine hash, no
//            Math.random), a 0.5 m ring of open water inside the levees. Blades are thin closed wedges (tetrahedra):
//            a two-sided sheet z-fights with its own hull and goes black.
//            spring: young 4-blade tufts 0.24-0.34 m tall standing in open water (their tips fringe above the levees
//            in the low hero view). summer: each row one hedge solid, sampled every half hill (crowns and dips) with a
//            peaked cross-section (stem base 0.10 m wide, 0.30 m at 0.52 m, crest 0.80-0.86 m), two leaf blades
//            fanning out of every crown to ~1.0 m: rows of dense green with dark furrows between. autumn: the hedge
//            shorter, bulging out at 0.6 m, with two bent heads per crown (a wedge whose fourth corner is the knee)
//            nodding out and down over the furrows: heavy-headed gold.
//   SCARECROW kakashi: a post into the field and a crossbar (wood boxes), an old jacket (a flared box torso, box
//            sleeves along the bar, a patch on the chest), straw tufts (cones) out of the cuffs and the hem, a cloth
//            sack head (lathe) with dot eyes, brows and a smile (flat decals), a conical straw sugegasa hat (lathe with
//            a concave underside). Turned 24 deg toward +X so the face meets the three-quarter camera.
//   Every closed part is wound from a point inside it (centre, axis point, row core), never by hand.
// Proportions (real size; base unit the levee height 0.30 m): field 12 x 8 m (40 x 27 levee units), channel 0.45 m,
// sluice posts 0.84 m, board 0.50 x 0.46 m; rice spring 0.3, summer 1.0, autumn 0.9 m; scarecrow crossbar 1.45 m,
// span 1.3 m, head centre 1.68 m, hat 0.64 m wide, top 1.96 m (6.5 levee units, a person-sized figure).
// Options: build(THREE, kit, colors, { season, scarecrow, size, height }).
//   season     "summer" (default) | "spring" | "autumn".   scarecrow  true (default) | false.
//   size       [W, D] of the flooded field in m (default [12, 8]); a number n means [n, n * 2/3]. The scarecrow and
//              the sluice keep their places relative to the field.
//   height     scales the whole plot uniformly so its top is `height` (default: the natural top, 1.96 m with the
//              scarecrow, else the rice or the sluice posts).
// Budget: summer and autumn 14.1k triangles, spring 9.7k (rice is all but ~700 of them).
// Colours (meadow: the only script with field greens and a pale sky for the water; autumn gold from its practical):
//   water sky #d7ecef flat, glints moon #f7f3e1 flat (no ink: paint on the water);
//   levee and bank grass line #a9d16e / iris #3f8a47; path skin #f0c2ae flat (meadow has no brown: the warm pale
//   strip reads as dry trodden earth on green);
//   rice spring line / iris (young pale green), summer iris / hair #2c5131 (deep green; hair stays lighter than ink
//   #1c261b and differs from the levee's line base), autumn practical #f2c94c / line (ripe gold over green-gold
//   stalks: practical is meadow's only gold, and a line shade keeps the crop from going muddy). Rice at threshold 0.2
//   and 1 px ink so a field of blades stays colour, not a black mat;
//   wood moon / skin at 0.2 (weathered grey-cream boards, shade only on the far faces);
//   straw practical / line (the autumn crop's gold); jacket accent #d9483b / hair at -0.1 (a faded red noragi, the one
//   strong spot on a green or gold field; shade only on the far side); patch sky flat; sack moon / skin at -0.25 so
//   the camera-facing face stays lit (front dot 0.30); face marks hair flat.

export const meta = {
  name: "rice-paddy",
  height: 1.96,
  script: "meadow",
  colors: {
    water: "#d7ecef", glint: "#f7f3e1",
    grass: "#a9d16e", grassShade: "#3f8a47",
    path: "#f0c2ae",
    rice: "#3f8a47", riceShade: "#2c5131",
    riceSpring: "#a9d16e", riceSpringShade: "#3f8a47",
    riceAutumn: "#f2c94c", riceAutumnShade: "#a9d16e",
    wood: "#f7f3e1", woodShade: "#f0c2ae",
    straw: "#f2c94c", strawShade: "#a9d16e",
    jacket: "#d9483b", jacketShade: "#2c5131",
    patch: "#d7ecef",
    sack: "#f7f3e1", sackShade: "#f0c2ae",
    mark: "#2c5131",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { season = "summer", scarecrow = true } = opts;
  let { size = [12, 8] } = opts;
  if (typeof size === "number") size = [size, (size * 2) / 3];
  const [W, D] = size;
  const root = new THREE.Group();
  root.name = "rice-paddy";
  const body = new THREE.Group(); // the uniform height scale lives here
  body.name = "body";
  root.add(body);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  let X = (p) => p; // placement of the part being built (the scarecrow's turn and spot); rigid, so winding survives
  function tri(key, a, b, e, ref) { // wound away from ref, a point inside the solid
    [a, b, e, ref] = [a, b, e, ref].map(X);
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-9) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    S(key).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  const up = (key, a, b, e) => tri(key, a, b, e, [a[0], a[1] - 1, a[2]]); // a flat decal facing +Y
  // a blade as a thin closed wedge (tetrahedron): a two-sided sheet z-fights with its own hull and goes black
  function blade(key, a, b, k, t) {
    const ref = [0, 1, 2].map((i) => (a[i] + b[i] + k[i] + t[i]) / 4);
    tri(key, a, b, k, ref); tri(key, a, b, t, ref); tri(key, a, k, t, ref); tri(key, b, k, t, ref);
  }
  function hex(key, p) { // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, cx, cy, cz, sx, sy, sz) {
    const [x0, x1, y0, y1, z0, z1] = [cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2];
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // deterministic jitter in [0, 1)
  const hash = (i, j, k = 0) => { const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); };

  // ---------- layout (x is shifted at the end so the plot's bbox is centred) ----------
  const WY = 0.06; // field water level
  const LB = 0.35, LT = 0.22, LH = 0.3; // levee half-widths at toe and top, height
  const xL = W / 2 + LB; // levee centrelines
  const zL = D / 2 + LB;
  const CW = 0.45, CY = 0.14; // channel width, its water level
  const xC0 = W / 2 + 2 * LB, xC1 = xC0 + CW; // channel between levee toe and bank toe
  const BB = 0.25, BT = 0.15, BH = 0.22; // outer bank
  const xB = xC1 + BB;
  const zs = -D / 8, gap = 0.22; // sluice z, half the levee gap
  const SX = W * 0.2, SZ = D * 0.15, SA = (24 * Math.PI) / 180; // scarecrow spot and turn toward +X

  // a levee prism along X (axis "x") or Z, from s0 to s1 along it, centred at `at` across it
  function levee(axis, at, s0, s1, b, t, h, path = true, key = "grass") {
    const P = (s, o, y) => (axis === "x" ? [s, y, at + o] : [at + o, y, s]);
    const sec = [[-b, 0], [b, 0], [t, h], [-t, h]];
    const ref = P((s0 + s1) / 2, 0, h / 2);
    for (let i = 0; i < 4; i++) {
      const [o0, y0] = sec[i], [o1, y1] = sec[(i + 1) % 4];
      quad(key, P(s0, o0, y0), P(s0, o1, y1), P(s1, o1, y1), P(s1, o0, y0), ref);
    }
    if (path) { // the trodden strip down the middle of the top, a decal
      const pw = 0.1, a = s0 + (axis === "x" ? 0.15 : 0), e = s1 - (axis === "x" ? 0.15 : 0);
      up("path", P(a, -pw, h + 0.003), P(e, -pw, h + 0.003), P(e, pw, h + 0.003));
      up("path", P(a, -pw, h + 0.003), P(e, pw, h + 0.003), P(a, pw, h + 0.003));
    }
    quad(key, ...sec.map(([o, y]) => P(s0, o, y)), ref);
    quad(key, ...sec.map(([o, y]) => P(s1, o, y)), ref);
  }
  levee("x", zL, -xL - LB, xL + LB, LB, LT, LH); // front
  levee("x", -zL, -xL - LB, xL + LB, LB, LT, LH); // back
  levee("z", -xL, -zL, zL, LB, LT, LH); // far (-X)
  levee("z", xL, -zL, zs - gap, LB, LT, LH); // channel side, cut at the sluice
  levee("z", xL, zs + gap, zL, LB, LT, LH);
  levee("z", xB, -zL - LB, zL + LB, BB, BT, BH, false); // outer bank of the channel

  // ---------- water ----------
  const flat = (key, x0, x1, z0, z1, y) => up(key, [x0, y, z0], [x1, y, z0], [x1, y, z1]) || up(key, [x0, y, z0], [x1, y, z1], [x0, y, z1]);
  flat("water", -xL, xL, -zL, zL, WY); // under the levees' cores, so no seam shows at the toe
  flat("water", xL - 0.1, xL + 0.22, zs - gap - 0.02, zs + gap + 0.02, WY); // into the sluice gap, up to the board
  flat("water", xC0 - 0.12, xC1 + 0.12, -zL - LB, zL + LB, CY); // the channel
  // glints: streaks along X, long and thin, a few per metre of depth
  const glint = (x, z, len, w, y) => flat("glint", x - len / 2, x + len / 2, z - w / 2, z + w / 2, y + 0.004);
  const nG = Math.round((W * D) / 4);
  for (let i = 0; i < nG; i++) {
    const x = (hash(i, 1) - 0.5) * (W - 1.2), z = (hash(i, 2) - 0.5) * (D - 0.8);
    glint(x, z, 0.5 + 1.6 * hash(i, 3), 0.05 + 0.07 * hash(i, 4), WY);
  }
  for (let i = 0; i < Math.round(D / 1.2); i++) { // across a narrow channel they run along it
    const z = -D / 2 + (i + hash(i, 9)) * 1.2, len = 0.25 + 0.4 * hash(i, 8), xc = (xC0 + xC1) / 2 + (hash(i, 7) - 0.5) * 0.15;
    flat("glint", xc - 0.02, xc + 0.02, z - len / 2, z + len / 2, CY + 0.004);
  }

  // ---------- sluice ----------
  const xs = xL + 0.12; // board plane, toward the channel side of the levee
  for (const sz of [-1, 1]) box("wood", xs, 0.42, zs + sz * (gap + 0.05), 0.11, 0.84, 0.11); // posts
  box("wood", xs, 0.27, zs, 0.04, 0.46, 2 * gap + 0.06); // the board, its top 0.50 (0.36 above the channel)
  box("wood", xs - 0.03, 0.24, zs, 0.02, 0.05, 2 * gap); // two cleats across the planks
  box("wood", xs - 0.03, 0.4, zs, 0.02, 0.05, 2 * gap);
  box("wood", xs, 0.62, zs, 0.06, 0.06, 0.34); // lifting bar on two studs
  for (const sz of [-1, 1]) box("wood", xs, 0.56, zs + sz * 0.1, 0.035, 0.1, 0.035);

  // ---------- rice: one mesh ----------
  const RK = "rice";
  const dx = 0.36, dz = 0.4, RM = 0.5; // hill spacing along a row, row spacing, open water margin to the levee toe
  const nx = Math.floor((W - 2 * RM) / dx), nz = Math.floor((D - 2 * RM) / dz);
  const autumn = season === "autumn";
  for (let j = 0; j <= nz; j++) {
    const z = -((nz * dz) / 2) + j * dz;
    if (season === "spring") {
      for (let i = 0; i <= nx; i++) {
        const cx = -((nx * dx) / 2) + i * dx + (hash(i, j, 1) - 0.5) * 0.04, cz = z + (hash(i, j, 2) - 0.5) * 0.04;
        const a0 = hash(i, j, 3) * Math.PI * 2;
        for (let k = 0; k < 4; k++) {
          const a = a0 + (k * Math.PI) / 2 + (hash(i, j, 10 + k) - 0.5) * 0.6;
          const h = 0.24 + 0.1 * hash(i, j, 20 + k), lean = 0.06 + 0.05 * hash(i, j, 30 + k);
          const ca = Math.cos(a), sa = Math.sin(a), w = 0.025;
          blade(RK, [cx - sa * w, WY - 0.01, cz + ca * w], [cx + sa * w, WY - 0.01, cz - ca * w], [cx - ca * 0.012, WY + 0.1, cz - sa * 0.012], [cx + ca * lean, WY + h, cz + sa * lean]);
        }
      }
      continue;
    }
    // summer / autumn: the row is one hedge, sampled every half hill: crowns (even) and the dips between (odd)
    const x0 = -((nx * dx) / 2) - 0.1, n = 2 * nx + 1, step = (nx * dx + 0.2) / n;
    const secs = [];
    for (let k = 0; k <= n; k++) {
      const crown = k % 2 === 0, r1 = hash(k, j, 5), r2 = hash(k, j, 6);
      const yt = autumn ? (crown ? 0.8 + 0.06 * r1 : 0.72 + 0.03 * r1) : crown ? 0.8 + 0.06 * r1 : 0.7 + 0.04 * r1;
      const ym = autumn ? 0.6 + 0.04 * r2 : 0.52;
      const wm = autumn ? (crown ? 0.17 : 0.14) + 0.02 * r2 : (crown ? 0.15 : 0.12) + 0.02 * r2;
      const zc = z + (hash(k, j, 8) - 0.5) * 0.02;
      const cx = x0 + k * step;
      if (crown && !autumn) { // leaf blades fanning out of the crown: the rice silhouette above the hedge
        const a0 = hash(k, j, 9) * Math.PI;
        for (let b = 0; b < 2; b++) {
          const a = a0 + b * Math.PI + 0.6 * (hash(k, j, 11 + b) - 0.5), ca = Math.cos(a), sa = Math.sin(a);
          const L = 0.16 + 0.1 * hash(k, j, 20 + b), H = 0.14 + 0.1 * hash(k, j, 30 + b), w = 0.03, y0 = yt - 0.08;
          blade(RK, [cx - sa * w, y0, zc + ca * w], [cx + sa * w, y0, zc - ca * w], [cx - ca * 0.02, y0 + 0.06, zc - sa * 0.02], [cx + ca * L, yt + H, zc + sa * L * 0.8]);
        }
      }
      if (crown && autumn) { // heavy heads: each a blade bent at a knee, nodding out over the furrows
        for (let b = 0; b < 2; b++) {
          const side = b % 2 ? 1 : -1, along = ((k / 2 + j) % 2 ? -1 : 1) * (b ? 1 : -1) * (0.04 + 0.05 * hash(k, j, 20 + b));
          const r = 0.2 + 0.06 * hash(k, j, 30 + b), w = 0.035, y0 = yt - 0.06;
          const base1 = [cx + along - w, y0, zc + side * 0.03], base2 = [cx + along + w, y0, zc + side * 0.03];
          const knee = [cx + along * 1.6, yt + 0.09, zc + side * 0.12];
          const tip = [cx + along * 2.2, yt - 0.1 - 0.06 * hash(k, j, 40 + b), zc + side * r];
          blade(RK, base1, base2, knee, tip); // the knee is the wedge's fourth corner: a bent, nodding head
        }
      }
      // across the row: stem base, belly and the crest, -Z side to +Z side
      secs.push([[-0.05, WY - 0.02], [-wm, ym], [0, yt], [wm, ym], [0.05, WY - 0.02]].map(([o, y]) => [cx, y, zc + o]));
    }
    for (let k = 0; k < n; k++) {
      const A = secs[k], B = secs[k + 1];
      const ref = [(A[0][0] + B[0][0]) / 2, 0.3, z];
      for (let q = 0; q < 4; q++) quad(RK, A[q], A[q + 1], B[q + 1], B[q], ref);
    }
    for (const [sec, dir] of [[secs[0], 1], [secs[n], -1]]) {
      const ref = [sec[0][0] + dir * 0.05, 0.3, z];
      for (let q = 1; q < 4; q++) tri(RK, sec[0], sec[q], sec[q + 1], ref);
    }
  }

  // ---------- scarecrow ----------
  if (scarecrow) {
    const ca = Math.cos(SA), sa = Math.sin(SA);
    X = (p) => [SX + p[0] * ca + p[2] * sa, p[1], SZ - p[0] * sa + p[2] * ca];
    // posts
    box("wood", 0, 0.83, 0, 0.07, 1.66, 0.07); // the post, into the mud
    box("wood", 0, 1.45, 0, 1.3, 0.06, 0.06); // crossbar
    // jacket: a torso flaring to the hem, sleeves along the bar
    const tor = (y, hw, hd) => [[-hw, y, -hd], [hw, y, -hd], [hw, y, hd], [-hw, y, hd]];
    hex("jacket", [...tor(1.0, 0.26, 0.13), ...tor(1.52, 0.2, 0.11)]);
    box("jacket", 0.39, 1.45, 0, 0.42, 0.17, 0.16);
    box("jacket", -0.39, 1.45, 0, 0.42, 0.17, 0.16);
    box("jacket", 0, 1.53, 0, 0.98, 0.04, 0.12); // shoulder line
    // straw: cuffs, hem
    const cone = (key, base, dir, r, len, n = 6) => { // closed cone from a disc at base along dir
      const d = Math.hypot(...dir), u = dir.map((v) => v / d);
      const t1 = Math.abs(u[1]) < 0.9 ? cross(u, [0, 1, 0]) : cross(u, [1, 0, 0]);
      const l1 = Math.hypot(...t1), e1 = t1.map((v) => v / l1), e2 = cross(u, e1);
      const tip = base.map((v, i) => v + u[i] * len);
      const ref = base.map((v, i) => v + u[i] * len * 0.3);
      const ring = Array.from({ length: n }, (_, k) => { const a = (k * 2 * Math.PI) / n; return base.map((v, i) => v + (e1[i] * Math.cos(a) + e2[i] * Math.sin(a)) * r); });
      for (let k = 0; k < n; k++) { tri(key, ring[k], ring[(k + 1) % n], tip, ref); tri(key, ring[(k + 1) % n], ring[k], base, ref); }
    };
    for (const s of [1, -1]) {
      cone("straw", [s * 0.58, 1.45, 0], [s, -0.15, 0.1], 0.08, 0.16);
      cone("straw", [s * 0.58, 1.45, 0], [s, 0.25, -0.15], 0.06, 0.13);
      cone("straw", [s * 0.58, 1.45, 0], [s, -0.6, -0.1], 0.06, 0.14);
    }
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + 0.3;
      cone("straw", [Math.cos(a) * 0.14, 1.02, Math.sin(a) * 0.07], [Math.cos(a) * 0.4, -1, Math.sin(a) * 0.4], 0.06, 0.2, 5);
    }
    // a patch on the chest
    quad("patch", [-0.17, 1.12, 0.128], [-0.05, 1.12, 0.128], [-0.05, 1.22, 0.124], [-0.17, 1.22, 0.124], [-0.1, 1.17, 0]);
    // lathe helper: profile [[r, y]], n segments, wound away from the axis point at each quad's height
    const lathe = (key, prof, n, y0 = 0) => {
      for (let p = 0; p < prof.length - 1; p++) {
        const [r0, h0] = prof[p], [r1, h1] = prof[p + 1];
        for (let k = 0; k < n; k++) {
          const a = (k * 2 * Math.PI) / n, b = ((k + 1) * 2 * Math.PI) / n;
          const P = (r, h, t) => [Math.cos(t) * r, y0 + h, Math.sin(t) * r];
          const ref = [0, y0 + (h0 + h1) / 2, 0];
          quad(key, P(r0, h0, a), P(r0, h0, b), P(r1, h1, b), P(r1, h1, a), ref);
        }
      }
    };
    // sack head: a slightly tall ball, tied at the neck
    const HR = 0.15, HY = 1.68;
    const sackProf = [];
    for (let k = 0; k <= 8; k++) { const t = -Math.PI / 2 + (k * Math.PI) / 8; sackProf.push([Math.max(0.0, Math.cos(t) * HR), Math.sin(t) * HR * 1.08]); }
    sackProf[0][0] = 0.035; // the neck tie
    lathe("sack", sackProf, 10, HY);
    lathe("sack", [[0.0, -0.1], [0.05, -0.14], [0.04, -0.2], [0.0, -0.21]], 6, HY); // the tie knot spill
    // the face: dot eyes, brows, a smile - flat decals on the sack front (+Z), lifted off the ball
    const face = (u, v, w, h) => { // a small quad on the sphere at (u, v) offsets, facing out
      const z = Math.sqrt(Math.max(0, HR * HR - u * u - (v / 1.08) * (v / 1.08))) + 0.004;
      const nrm = [u, v, z];
      quad("mark", [u - w, HY + v - h, z], [u + w, HY + v - h, z], [u + w, HY + v + h, z], [u - w, HY + v + h, z], [u - nrm[0], HY + v - nrm[1], z - nrm[2]]);
    };
    face(0.055, 0.025, 0.017, 0.022);
    face(-0.055, 0.025, 0.017, 0.022);
    face(0.055, 0.075, 0.03, 0.006);
    face(-0.055, 0.075, 0.03, 0.006);
    for (let k = -2; k <= 2; k++) face(k * 0.02, -0.06 + Math.abs(k) * 0.008, 0.012, 0.006);
    // the hat: a wide flat cone with a concave underside the head fits in
    lathe("straw", [[0.0, 0.28], [0.12, 0.22], [0.32, 0.12], [0.32, 0.105], [0.14, 0.13], [0.0, 0.19]], 14, HY);
    X = (p) => p;
  }

  // ---------- meshes ----------
  const riceTone = season === "spring" ? [c.riceSpring, c.riceSpringShade] : season === "autumn" ? [c.riceAutumn, c.riceAutumnShade] : [c.rice, c.riceShade];
  const MAT = {
    water: [c.water, c.water, 0.35, false],
    glint: [c.glint, c.glint, 0.35, false],
    grass: [c.grass, c.grassShade, 0.3, true],
    path: [c.path, c.path, 0.35, false],
    rice: [...riceTone, 0.2, true, 1],
    wood: [c.wood, c.woodShade, 0.2, true, 3],
    straw: [c.straw, c.strawShade, 0.2, true, 3],
    jacket: [c.jacket, c.jacketShade, -0.1, true, 3],
    patch: [c.patch, c.patch, 0.35, false],
    sack: [c.sack, c.sackShade, -0.25, true, 3],
    mark: [c.mark, c.mark, 0.35, false],
  };
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, outline, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.translate(-(xB + BB - xL - LB) / 2, 0, 0); // centre the plot's bbox on x = 0
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, px ? { threshold, outline, px } : { threshold, outline });
    mesh.name = key;
    body.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  const top = new THREE.Box3().setFromObject(body).max.y;
  if (opts.height) body.scale.setScalar(opts.height / top);
  pose("rest");
  return { root, joints, pose };
}
