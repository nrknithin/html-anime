// toro-nagashi.js - a summer Obon toro-nagashi on a calm river at night, at real size (about 14 x 10 m): small paper box
// lanterns, lit from inside, drifting downstream in loose clusters past a stone embankment with steps down to the
// water, under a willow, with a low wooden footbridge crossing behind. Nobody is in it: on the bottom landing a table of
// unlit lanterns waits beside a bucket and a candle box.
// Contract: harness/lab/README.md. Meters, +Y up, the near bank faces +Z, its left is +X, stands on y = 0, centred on
// x = 0, z = 0. The river runs along X and flows toward +X (toward the hero camera's side).
//
// Construction (boxes, prisms and fans as triangle soups, merged per material, so the whole set is one mesh per
// material, 13 in all; every triangle is wound away from a point inside its solid, never by hand):
//   WATER     a dark slab, 0.25 m deep, between the embankment and the near bank: a cut-away diorama edge. Water reads as
//             water by what lies on it: pale ripple rings and each lantern's light stretched toward the viewer.
//   BANK      the far embankment: two stone blocks, a 3.6 m notch between them with five steps down to a landing that
//             juts into the river, a coping course along the top, stone-course seams on the faces (dark decals, the hull
//             draws silhouettes only). A low flagstone edge is the near bank (7 cm above the water, so the low hero still
//             sees the river), with the bridge abutment on it.
//   WILLOW    a leaning trunk on the promenade, limbs, a small crown core and 140 hanging strands (thin tapered
//             triangular prisms) in three rings: each rises from the crown, arches over and falls, longest over the
//             water, so the strands themselves draw the dome and the ragged curtain.
//   BRIDGE    a low arched wooden footbridge at x = -5 crossing the whole river: deck segments on the arch, stringers,
//             posts and a top rail on both sides, four pier bents of round piles standing between the lantern lanes.
//   PROPS     on the landing a low table with unlit lanterns (white paper), two more on the first step, a hooped bucket of
//             water and a small candle box with a pink band and white candles. No lettering.
//   LANTERNS  each a 0.36 m paper box (glowing, flat) on a 0.5 m wooden float, a dark top frame and corner posts. Amber
//             ones drift in lanes; the pink ones, just launched, turn slowly in an eddy off the landing (a lane's
//             lanterns trade places every period, so a lane has to be one colour for the loop to close). A lantern is
//             an owner, its light streak on the water another, its ripple ring rides with it.
//   STREAKS   the reflection of each lantern: five dashes of its paper colour on the water, laid toward the hero camera
//             (azimuth 52 degrees), long (2.9 m) because the low camera sees the water nearly edge-on; clipped at the
//             set's edges.
// Motion: pose() rewrites the vertices of the shared meshes from per-owner matrices (positions, normals, hull normals),
//   so 40 lanterns are still the same few meshes. Ripple ring vertices are rewritten from (centre, radius, width).
// Proportions (real size, base unit the lantern L = 0.30 m): set 14 x 10; water top 0.25; bank top 1.75 (embankment
//   1.5 = 5 L above the water) at z <= -2.6; steps 0.26 rise, 0.40 tread; landing 0.45, 0.8 deep; near edge 0.32 at
//   z >= 4.2; bridge deck 1.8-2.08, 1.4 wide, rail 0.75 above; willow trunk 1.75-4.0, crown top 6.0 = height;
//   lanterns 1.2 L paper on a 1.7 L float (1.2x a real one, so they hold at hero size).
// Options: build(THREE, kit, colors, { height = 6.0, lanterns = 24 }). height scales the whole set uniformly (the willow
//   crown's top); lanterns is the floating count, 8..40: round(n / 8) pink in the eddy (1..4), the rest amber in 1-4
//   lanes of 6..10, so a lane never runs faster than ~0.35 m/s.
// Clips: drift (6 s). Each lane is a loop the length of the river: lantern i sits at lane parameter
//   u = (i + t / T) / n, mapped to x by a warp g(u) = u + a sin(2 pi m u) / (2 pi m), so lanterns bunch where the
//   current slows (loose clusters) and every one moves to its neighbour's place in one period. Everything else (lane
//   wander, bob, tilt, yaw, ripple phase) is a function of (u, t), periodic in both; the eddy lanterns make one orbit
//   and half a turn (a square box looks the same), so t = 6 equals t = 0 exactly. At the river's ends the lanterns
//   shrink to nothing, so the wrap never pops. Ripple rings grow and thin to nothing, so they never pop either.
// Budget: 11.3k triangles at the defaults (lanterns 40: 14.1k, 8: 8.4k), 13 meshes.
// Hero note: the hero looks along the water from under 2 m up, so the water is a thin band; the glowing paper, the
//   streak dashes under each box and the willow and bridge silhouettes carry the read. Ripples read from three4 and top.
// Colours (festival, the night: the lanterns are the light), base / shade:
//   stone (bank, steps, edge)       moon #ffd7a1 / sky #24143a at 0.65 (only tops and treads catch the moon; every
//                                   wall face is purple, so the lanterns are the brightest thing in the hero)
//   seams, water                    hair #1a1020 flat (above ink #140c1c; darker than the stone's purple faces)
//   willow, floats, frames, hoops   sky #24143a / hair #1a1020 at 0.3, 2 px hull
//   wood (bridge, table, bucket)    iris #ffd0a1 / sky #24143a at 0.65 (pale deck and rail tops only)
//   unlit paper, candles            sclera #f6f3ee / skin #f0c2ae at 0.1
//   lit paper amber, its streaks    practical #ffb020 flat
//   lit paper pink, its streaks     accent #ff4d6d flat; the candle box band accent / sky
//   ripples                         line #fff1ea flat

export const meta = {
  name: "toro-nagashi",
  height: 6.0,
  script: "festival",
  colors: {
    stone: "#ffd7a1", stoneShade: "#24143a",
    seam: "#1a1020",
    water: "#1a1020",
    dark: "#24143a", darkShade: "#1a1020",
    wood: "#ffd0a1", woodShade: "#24143a",
    paper: "#f6f3ee", paperShade: "#f0c2ae",
    glow: "#ffb020",
    glowPink: "#ff4d6d",
    band: "#ff4d6d", bandShade: "#24143a",
    ripple: "#fff1ea",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, lanterns: LN = 24 } = opts;
  if (!(LN >= 8 && LN <= 40)) throw new Error(`toro-nagashi: lanterns ${LN} out of range (8..40)`);
  const root = new THREE.Group();
  root.name = "toro-nagashi";
  const set = new THREE.Group(); // the uniform size scale lives here, so root stays the plain contract node
  set.name = "set";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = {};

  // ---------- soups: key -> positions, normals, owner per vertex (-1 static), ring per vertex (-1 none) ----------
  const soups = {};
  let OWN = -1;
  const S = (key) => (soups[key] ??= { p: [], n: [], o: [], r: [] });
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
  function tri(key, a, b, e, ref) { // a flat triangle wound away from `ref`
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    const flip = dot(n, sub(m, ref)) < 0;
    n = norm(flip ? n.map((x) => -x) : n);
    const s = S(key);
    s.p.push(...a, ...(flip ? [...e, ...b] : [...b, ...e]));
    s.n.push(...n, ...n, ...n);
    s.o.push(OWN, OWN, OWN);
    s.r.push(-1, 0, 0, -1, 0, 0, -1, 0, 0); // ring meta, 3 per vertex
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function hex(key, p) { // p[0..3] one face, p[4..7] the opposite face in the same order
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, x0, x1, y0, y1, z0, z1) {
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  function pipe(key, a, b, r, n = 6) { // an n-sided capped pipe from a to b
    const d = norm(sub(b, a)), up = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u = norm(cross(d, up)), v = cross(d, u);
    const ring = (o) => Array.from({ length: n }, (_, k) => {
      const t = (2 * Math.PI * k) / n;
      return [0, 1, 2].map((i) => o[i] + r * (Math.cos(t) * u[i] + Math.sin(t) * v[i]));
    });
    const A = ring(a), B = ring(b), ref = [0, 1, 2].map((i) => (a[i] + b[i]) / 2);
    for (let k = 0; k < n; k++) { const j = (k + 1) % n; quad(key, A[k], A[j], B[j], B[k], ref); }
    for (let k = 1; k < n - 1; k++) (tri(key, A[0], A[k], A[k + 1], ref), tri(key, B[0], B[k], B[k + 1], ref));
  }
  // a tapered triangular strand along a polyline (pts), width w0 -> w1, the flat face toward `face`
  function strand(key, pts, w0, w1) {
    for (let k = 0; k < pts.length - 1; k++) {
      const t0 = k / (pts.length - 1), t1 = (k + 1) / (pts.length - 1);
      const sec = (p, t) => {
        const w = w0 + (w1 - w0) * t;
        return [[p[0] - w * 0.5, p[1], p[2] + w * 0.35], [p[0] + w * 0.5, p[1], p[2] + w * 0.35], [p[0], p[1], p[2] - w * 0.5]];
      };
      const A = sec(pts[k], t0), B = sec(pts[k + 1], t1);
      const ref = [0, 1, 2].map((i) => (pts[k][i] + pts[k + 1][i]) / 2);
      for (let j = 0; j < 3; j++) { const i2 = (j + 1) % 3; quad(key, A[j], A[i2], B[i2], B[j], ref); }
      if (k === 0) tri(key, A[0], A[1], A[2], [ref[0], ref[1] - 1, ref[2]]);
      if (k === pts.length - 2) tri(key, B[0], B[1], B[2], [ref[0], ref[1] + 1, ref[2]]);
    }
  }
  function blob(key, cx, cy, cz, rx, ry, rz, nu = 9, nv = 5) { // a closed ellipsoid
    const P = (i, j) => {
      const th = (2 * Math.PI * i) / nu, ph = -Math.PI / 2 + (Math.PI * j) / nv;
      return [cx + rx * Math.cos(ph) * Math.cos(th), cy + ry * Math.sin(ph), cz + rz * Math.cos(ph) * Math.sin(th)];
    };
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = P(i, j), b = P(i + 1, j), e = P(i + 1, j + 1), d = P(i, j + 1);
      if (j > 0) tri(key, a, b, e, [cx, cy, cz]);
      if (j < nv - 1) tri(key, a, e, d, [cx, cy, cz]);
    }
  }
  function flat(key, pts, y) { // a convex polygon (x, z) lying at height y, facing up
    const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length, cz = pts.reduce((s, q) => s + q[1], 0) / pts.length;
    for (let k = 0; k < pts.length; k++) {
      const a = pts[k], b = pts[(k + 1) % pts.length];
      tri(key, [cx, y, cz], [a[0], y, a[1]], [b[0], y, b[1]], [cx, y - 1, cz]);
    }
  }
  const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const TAU = Math.PI * 2;

  // ---------- water and the near bank ----------
  const X0 = -7, X1 = 7, WY = 0.25, ZW = -2.6, ZN = 4.2, ZE = 5, ZB = -5, TOP = 1.75;
  box("water", X0, X1, 0, WY, ZW - 0.05, ZN + 0.02);
  box("stone", X0, X1, 0, 0.32, ZN, ZE); // near bank: a low flagstone edge, so the hero still sees the water

  // ---------- the far embankment with its steps ----------
  const SX0 = -1.0, SX1 = 2.6, LZ = -1.95, LY = 0.45, RISE = 0.26, TREAD = 0.4;
  box("stone", X0, SX0, 0, TOP, ZB, ZW);
  box("stone", SX1, X1, 0, TOP, ZB, ZW);
  box("stone", SX0, SX1, 0, LY, ZB, LZ); // the landing, jutting into the river
  for (let k = 1; k <= 5; k++) box("stone", SX0, SX1, 0, LY + RISE * k, ZB, -2.75 - TREAD * (k - 1));
  // coping course along the wall top (proud of the face) and its seams
  for (const [x0, x1] of [[X0, SX0], [SX1, X1]]) box("stone", x0, x1, TOP - 0.16, TOP + 0.04, ZW - 0.2, ZW + 0.08);
  // stone courses on the wall face: horizontal joints and staggered verticals (decals 2 mm proud)
  const FZ = ZW + 0.003;
  for (const [x0, x1] of [[X0, SX0], [SX1, X1]]) {
    for (let r = 0, y = WY + 0.32; y < TOP - 0.2; r++, y += 0.34) {
      box("seam", x0, x1, y - 0.012, y + 0.012, ZW, FZ);
      for (let x = x0 + (r % 2 ? 0.35 : 0.7); x < x1 - 0.1; x += 0.75) {
        const yt = Math.min(y + 0.34, TOP - 0.17);
        box("seam", x - 0.012, x + 0.012, y, yt, ZW, FZ);
      }
    }
    box("seam", x0, x1, TOP - 0.17, TOP - 0.15, ZW + 0.08, ZW + 0.083); // under the coping lip
  }
  // step nosing seams (risers meet treads) on the landing face
  box("seam", SX0, SX1, LY - 0.02, LY - 0.005, LZ, LZ + 0.003);

  // ---------- willow on the promenade (+X end) ----------
  const TX = 4.7, TZ = -3.6;
  const trunk = [[TX, TOP - 0.05, TZ], [TX - 0.1, 2.5, TZ + 0.15], [TX - 0.3, 3.3, TZ + 0.45], [TX - 0.6, 4.0, TZ + 0.85]];
  const trR = [0.26, 0.21, 0.16, 0.12];
  for (let k = 0; k < trunk.length - 1; k++) pipe("dark", trunk[k], trunk[k + 1], trR[k], 7);
  const CX = TX - 0.9, CY = 4.75, CZ = TZ + 1.15; // crown centre, leaning out over the wall
  const fork = trunk[3];
  // limbs arch up and out from the fork; the crown masses sit on them
  const limbs = [[-1.2, 0.2], [1.0, -0.4], [-0.3, 1.1], [0.4, -1.2], [0.9, 0.7], [-1.0, -0.8]];
  for (const [dx, dz] of limbs) pipe("dark", fork, [CX + dx, CY + 0.55, CZ + dz], 0.07, 5);
  // a small crown core; the dome's outline comes from the strands themselves, which arch out from near the top
  for (const [dx, dy, dz, rx, ry, rz] of [[0, 0.7, 0, 1.0, 0.42, 0.85], [-0.7, 0.45, 0.35, 0.7, 0.35, 0.6], [0.7, 0.5, -0.4, 0.7, 0.35, 0.6]])
    blob("willow", CX + dx, CY + dy, CZ + dz, rx, ry, rz, 10, 6);
  // hanging strands: each rises a little from a root on the crown, arches over and falls straight; longest over the
  // water (+Z), shorter toward the promenade; outer rings hang outside the inner ones, so the outline is one dome
  const WS = 140;
  for (let i = 0; i < WS; i++) {
    const a = TAU * ((i * 0.618034) % 1), ring = i % 3; // 0 outer, 1 middle, 2 inner
    const r0 = [0.75, 0.55, 0.3][ring] + 0.2 * hash(i + 20), r1 = [1.95, 1.5, 1.0][ring] + 0.25 * hash(i + 30);
    const y0 = CY + [0.5, 0.85, 1.05][ring] - 0.3 * hash(i + 50), ex = 0.85; // crown is a little narrower in z
    const water = 0.5 + 0.5 * Math.sin(a); // 1 on the river side
    const yEnd = Math.max(TOP + 0.15, CY - 0.6 - 1.6 * hash(i + 40) - 1.2 * water - (ring === 0 ? 0.4 : 0));
    const P = (r, y) => [CX + r * Math.cos(a), y, CZ + ex * r * Math.sin(a)];
    const pts = [P(r0, y0), P(r0 + 0.45 * (r1 - r0), y0 + 0.08 + 0.12 * hash(i + 60)), P(r1 - 0.08, y0 - 0.15), P(r1 + 0.05, y0 - 0.55), P(r1 + 0.32, yEnd)];
    strand("willow", pts, 0.075, 0.03);
  }

  // ---------- the footbridge (x = -5) ----------
  const BX = -5, BW = 0.7, ZA = -3.0, ZBn = 4.7, BN = 10;
  const deckY = (z) => 1.8 + 0.28 * Math.sin((Math.PI * (z - ZA)) / (ZBn - ZA));
  box("stone", BX - 1.0, BX + 1.0, 0.32, 1.72, ZN, ZE); // near abutment
  for (let k = 0; k < BN; k++) {
    const z0 = ZA + ((ZBn - ZA) * k) / BN, z1 = ZA + ((ZBn - ZA) * (k + 1)) / BN, y0 = deckY(z0), y1 = deckY(z1);
    hex("wood", [[BX - BW, y0 - 0.08, z0], [BX + BW, y0 - 0.08, z0], [BX + BW, y1 - 0.08, z1], [BX - BW, y1 - 0.08, z1],
      [BX - BW, y0, z0], [BX + BW, y0, z0], [BX + BW, y1, z1], [BX - BW, y1, z1]]);
    for (const s of [-1, 1]) { // stringer and top rail
      const x = BX + s * (BW - 0.04);
      hex("wood", [[x - 0.05, y0 - 0.26, z0], [x + 0.05, y0 - 0.26, z0], [x + 0.05, y1 - 0.26, z1], [x - 0.05, y1 - 0.26, z1],
        [x - 0.05, y0 - 0.08, z0], [x + 0.05, y0 - 0.08, z0], [x + 0.05, y1 - 0.08, z1], [x - 0.05, y1 - 0.08, z1]]);
      hex("wood", [[x - 0.04, y0 + 0.68, z0], [x + 0.04, y0 + 0.68, z0], [x + 0.04, y1 + 0.68, z1], [x - 0.04, y1 + 0.68, z1],
        [x - 0.04, y0 + 0.76, z0], [x + 0.04, y0 + 0.76, z0], [x + 0.04, y1 + 0.76, z1], [x - 0.04, y1 + 0.76, z1]]);
    }
  }
  for (let k = 0; k <= BN; k += 2) {
    const z = ZA + ((ZBn - ZA) * k) / BN, y = deckY(z);
    for (const s of [-1, 1]) box("wood", BX + s * (BW - 0.04) - 0.045, BX + s * (BW - 0.04) + 0.045, y, y + 0.78, z - 0.045, z + 0.045);
  }
  for (const z of [-1.4, 0.08, 1.43, 2.78]) { // pier bents, between the lanes: two piles and a cap beam
    const y = deckY(z) - 0.26;
    for (const s of [-1, 1]) pipe("wood", [BX + s * 0.55, 0.05, z], [BX + s * 0.55, y, z], 0.09, 6);
    box("wood", BX - 0.75, BX + 0.75, y - 0.12, y, z - 0.08, z + 0.08);
  }

  // ---------- props on the landing ----------
  const PZ = -2.38; // landing centre line
  // low table of unlit lanterns
  const TX0 = -0.78, TX1 = 0.92, TY = LY + 0.42;
  box("wood", TX0, TX1, TY - 0.04, TY, PZ - 0.28, PZ + 0.28);
  for (const x of [TX0 + 0.05, TX1 - 0.05]) for (const z of [PZ - 0.23, PZ + 0.23]) box("wood", x - 0.025, x + 0.025, LY, TY - 0.04, z - 0.025, z + 0.025);
  const LS = 1.2; // lanterns at 1.2x a real 0.25 m one, so they hold at hero size
  function lanternBox(paperKey, x, y, z, yaw = 0) { // local frame: float bottom at y, paper above; centre x, z
    const P = (px, py, pz) => [x + LS * (px * Math.cos(yaw) + pz * Math.sin(yaw)), y + LS * py, z + LS * (-px * Math.sin(yaw) + pz * Math.cos(yaw))];
    const bx = (key, x0, x1, y0, y1, z0, z1) => hex(key, [P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1), P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)]);
    bx("dark", -0.21, 0.21, 0, 0.07, -0.21, 0.21); // float
    bx(paperKey, -0.15, 0.15, 0.07, 0.38, -0.15, 0.15); // paper
    for (const [x0, x1, z0, z1] of [[-0.17, 0.17, -0.17, -0.14], [-0.17, 0.17, 0.14, 0.17], [-0.17, -0.14, -0.14, 0.14], [0.14, 0.17, -0.14, 0.14]])
      bx("dark", x0, x1, 0.36, 0.4, z0, z1); // top frame
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) bx("dark", sx * 0.165 - 0.016, sx * 0.165 + 0.016, 0.07, 0.36, sz * 0.165 - 0.016, sz * 0.165 + 0.016);
  }
  for (const [x, z, yaw] of [[-0.48, PZ - 0.02, 0.1], [0.07, PZ + 0.03, -0.15], [0.62, PZ - 0.04, 0.2]]) lanternBox("paper", x, TY, z, yaw);
  for (const [x, yaw] of [[-0.68, 0.3], [-0.1, -0.2]]) lanternBox("paper", x, LY + RISE, -2.95, yaw);
  // bucket: a hooped wooden tub, water at its top
  const BKX = 1.45, BKZ = PZ + 0.05, BKR = 0.17, BKH = 0.32;
  pipe("wood", [BKX, LY, BKZ], [BKX, LY + BKH, BKZ], BKR, 10);
  pipe("dark", [BKX, LY + 0.06, BKZ], [BKX, LY + 0.1, BKZ], BKR + 0.012, 10);
  pipe("dark", [BKX, LY + BKH - 0.1, BKZ], [BKX, LY + BKH - 0.06, BKZ], BKR + 0.012, 10);
  flat("water", Array.from({ length: 10 }, (_, k) => [BKX + (BKR - 0.015) * Math.cos((TAU * k) / 10), BKZ + (BKR - 0.015) * Math.sin((TAU * k) / 10)]), LY + BKH + 0.003);
  // candle box with a pink band and a few white candles standing in it
  const CBX = 2.05, CBZ = PZ - 0.05;
  box("wood", CBX - 0.18, CBX + 0.18, LY, LY + 0.16, CBZ - 0.11, CBZ + 0.11);
  box("band", CBX - 0.185, CBX + 0.185, LY + 0.06, LY + 0.11, CBZ - 0.115, CBZ + 0.115);
  for (let k = 0; k < 5; k++) pipe("paper", [CBX - 0.12 + k * 0.06, LY + 0.1, CBZ + (k % 2 ? 0.03 : -0.03)], [CBX - 0.12 + k * 0.06, LY + 0.24 + (k % 2) * 0.02, CBZ + (k % 2 ? 0.03 : -0.03)], 0.014, 5);

  // ---------- floating lanterns: owners ----------
  // owners: { kind: "lantern" | "streak", lane, i }; geometry authored in each owner's local frame
  const owners = [];
  const VIEW = [Math.sin((52 * Math.PI) / 180), Math.cos((52 * Math.PI) / 180)]; // toward the hero camera, on the water
  const SIDE = [VIEW[1], -VIEW[0]];
  // amber lanterns drift in lanes; the pink ones (just launched) turn slowly in an eddy off the landing. A lane's
  // lanterns trade places each period, so a lane must be one colour for the loop to close: hence pink in the eddy.
  const pinkN = Math.max(1, Math.min(4, Math.round(LN / 8))), amberN = LN - pinkN;
  const nLanes = Math.max(1, Math.min(4, Math.floor(amberN / 6)));
  const LANES_Z = { 1: [1.4], 2: [0.1, 2.1], 3: [-0.6, 1.4, 3.1], 4: [-0.6, 0.75, 2.1, 3.45] }[nLanes];
  const lanes = LANES_Z.map((z, k) => ({ z, n: Math.floor(amberN / nLanes) + (k < amberN % nLanes ? 1 : 0), ph: hash(k + 7), a: 0.62 + 0.1 * hash(k + 11), m: 2 + (k % 2), wz: TAU * hash(k + 13) }));
  const lant = [];
  const STREAK = [[0.45, 0.33, 0.22], [1.08, 0.3, 0.18], [1.66, 0.28, 0.14], [2.2, 0.25, 0.1], [2.68, 0.21, 0.06]];
  function floater(pink, o) {
    OWN = owners.length;
    owners.push({ kind: "lantern", ...o });
    lanternBox(pink ? "glowPink" : "glow", 0, -0.035, 0); // float 3.5 cm deep, all local (waterline y = 0)
    // the streak: dashes toward the camera, world-aligned (its owner never turns)
    OWN = owners.length;
    owners.push({ kind: "streak" });
    for (const [d, l, w] of STREAK) {
      const pts = [];
      for (let k = 0; k < 6; k++) {
        const th = (TAU * k) / 6, along = d + l * Math.cos(th), across = w * Math.sin(th) + 0.04 * Math.sin(d * 5);
        pts.push([VIEW[0] * along + SIDE[0] * across, VIEW[1] * along + SIDE[1] * across]);
      }
      flat(pink ? "reflectPink" : "reflect", pts, 0.004);
    }
    lant.push({ own: OWN - 1, pink });
  }
  lanes.forEach((L, li) => { for (let i = 0; i < L.n; i++) floater(false, { li, i }); });
  for (let k = 0; k < pinkN; k++) floater(true, { eddy: true, cx: SX0 + 0.45 + ((SX1 - SX0 - 0.9) * (k + 0.5)) / pinkN - 0.1, cz: -1.6, ph: 0.4 * k, dir: 1 });
  OWN = -1;

  // ---------- ripple rings: static sites in open water and one under each lantern ----------
  const rings = []; // { cx, cz, follow (lantern owner) | -1, R, w, f, ph }
  const sites = [[-3.2, 3.5], [0.6, 3.7], [2.2, -0.9], [3.9, 1.9], [-6.3, 1.2], [-2.4, -1.7]];
  sites.forEach(([x, z], k) => {
    for (const off of [0, 0.5]) rings.push({ cx: x, cz: z, follow: -1, R: 0.55 + 0.25 * hash(k + 60), w: 0.05, f: 1, ph: hash(k + 70) + off });
  });
  for (const L of lant) rings.push({ cx: 0, cz: 0, follow: L.own, R: 0.5, w: 0.04, f: 1, ph: 0, lane: L.li });
  const RSEG = 14;
  rings.forEach((g, ri) => { // vertex meta: ring index, angle, side (0 inner, 1 outer); wound to face up
    const s = S("ripple");
    for (let k = 0; k < RSEG; k++) {
      const a0 = (TAU * k) / RSEG, a1 = (TAU * (k + 1)) / RSEG;
      // increasing angle runs clockwise seen from +Y, so (inner a0, outer a0, outer a1) faces down: list it reversed
      for (const [a, sd] of [[a0, 0], [a1, 1], [a0, 1], [a0, 0], [a1, 0], [a1, 1]]) {
        s.p.push(0, 0, 0);
        s.n.push(0, 1, 0);
        s.o.push(-1);
        s.r.push(ri, a, sd);
      }
    }
  });

  // ---------- meshes ----------
  const MAT = {
    stone: [c.stone, c.stoneShade, 0.65, 3],
    seam: [c.seam, c.seam, 0.35, 0],
    water: [c.water, c.water, 0.35, 3],
    dark: [c.dark, c.darkShade, 0.3, 2],
    willow: [c.dark, c.darkShade, 0.3, 2],
    wood: [c.wood, c.woodShade, 0.65, 2.5],
    paper: [c.paper, c.paperShade, 0.1, 2],
    glow: [c.glow, c.glow, -1, 2],
    glowPink: [c.glowPink, c.glowPink, -1, 2],
    reflect: [c.glow, c.glow, -1, 0],
    reflectPink: [c.glowPink, c.glowPink, -1, 0],
    band: [c.band, c.bandShade, 0.1, 2],
    ripple: [c.ripple, c.ripple, -1, 0],
  };
  const live = [];
  for (const [key, s] of Object.entries(soups)) {
    const [base, shade, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    set.add(mesh);
    const ring = s.r.some((k) => k >= 0), owned = s.o.some((k) => k >= 0);
    if (ring || owned) {
      if (px) kit.hullNormals(g);
      const hn = g.attributes.hullNormal;
      live.push({ g, o: s.o, r: ring ? s.r : null, p: Float32Array.from(s.p), n: Float32Array.from(s.n), h: hn ? Float32Array.from(hn.array) : null });
      mesh.frustumCulled = false;
      mesh.traverse((m) => (m.frustumCulled = false));
    }
  }

  // ---------- rig ----------
  const T = 6, XA = X0 + 0.05, XL = X1 - X0 - 0.1, FADE = 0.9;
  const MS = owners.map(() => new THREE.Matrix4()), NM = owners.map(() => new THREE.Matrix3());
  const state = owners.map(() => ({ x: 0, z: 0, s: 1 }));
  const q = new THREE.Vector3(), EB = new THREE.Euler(), QT = new THREE.Quaternion(), V = new THREE.Vector3(), SV = new THREE.Vector3();
  const smooth = (e) => { const x = Math.min(1, Math.max(0, e)); return x * x * (3 - 2 * x); };
  function setTime(t) {
    const w = TAU * (t / T);
    owners.forEach((o, k) => {
      if (o.kind !== "lantern") return;
      if (o.eddy) { // a slow closed orbit, one turn per period
        const a = o.dir * w + o.ph, x = o.cx + 0.2 * Math.cos(a), z = o.cz + 0.07 * Math.sin(a);
        const bob = 0.02 * Math.sin(2 * w + o.ph), yaw = o.dir * w * 0.5 + o.ph; // half a turn per period: a box looks the same
        MS[k].compose(V.set(x, WY + bob, z), QT.setFromEuler(EB.set(0.04 * Math.sin(w + o.ph), yaw, 0.05 * Math.sin(2 * w), "YXZ")), SV.set(1, 1, 1));
        NM[k].getNormalMatrix(MS[k]);
        Object.assign(state[k], { x, z, s: 1, u: o.ph / TAU });
        MS[k + 1].compose(V.set(x, WY, z), QT.identity(), SV.set(1, 1, 1));
        NM[k + 1].identity();
        return;
      }
      const L = lanes[o.li];
      const u = (o.i + t / T + L.ph) / L.n; // lane parameter; one period moves each lantern to its neighbour's place
      const g = u + (L.a * Math.sin(TAU * L.m * u)) / (TAU * L.m);
      const fr = ((g % 1) + 1) % 1;
      const x = XA + XL * fr;
      const z = L.z + 0.24 * Math.sin(TAU * 2 * u + L.wz) + 0.08 * Math.sin(TAU * 5 * u + 1.3 * L.wz);
      const s = Math.max(1e-3, smooth((x - XA) / FADE) * smooth((XA + XL - x) / FADE));
      const bob = 0.022 * Math.sin(2 * w + TAU * 3 * u + L.wz);
      const roll = 0.06 * Math.sin(w + TAU * 4 * u), pitch = 0.05 * Math.sin(2 * w + TAU * 2 * u + 1.1);
      const yaw = 0.5 * Math.sin(TAU * u + L.wz) + 0.25 * Math.sin(w + TAU * 3 * u);
      MS[k].compose(V.set(x, WY + bob * s, z), QT.setFromEuler(EB.set(pitch, yaw, roll, "YXZ")), SV.set(s, s, s));
      NM[k].getNormalMatrix(MS[k]);
      Object.assign(state[k], { x, z, s, u });
      const st = k + 1; // its streak
      const reach = Math.max(0, Math.min((X1 - 0.05 - x) / VIEW[0], (ZN - 0.05 - z) / VIEW[1]) / 2.95); // stay on the water
      const ss = Math.max(1e-3, Math.min(s, reach));
      MS[st].compose(V.set(x, WY, z), QT.identity(), SV.set(ss, 1, ss));
      NM[st].identity();
    });
    for (const Lv of live) {
      const P = Lv.g.attributes.position.array, N = Lv.g.attributes.normal.array, H = Lv.g.attributes.hullNormal?.array;
      for (let v = 0; v < Lv.o.length; v++) {
        const i = v * 3;
        if (Lv.r && Lv.r[i] >= 0) {
          const g = rings[Lv.r[i]], a = Lv.r[i + 1], sd = Lv.r[i + 2];
          let cx = g.cx, cz = g.cz, sc = 1, ph = g.ph;
          if (g.follow >= 0) { const st = state[g.follow]; cx = st.x; cz = st.z; sc = st.s; ph = 2 * st.u; }
          const f = (((g.f * t) / T + ph) % 1 + 1) % 1; // ring age 0..1
          const R = g.R * (0.25 + 0.75 * f) * sc, wd = g.w * Math.sin(Math.PI * f) * sc + 0.002;
          const r = R + (sd ? wd / 2 : -wd / 2);
          P[i] = cx + r * Math.cos(a);
          P[i + 1] = WY + 0.006;
          P[i + 2] = cz + 0.8 * r * Math.sin(a);
          continue;
        }
        const k = Lv.o[v];
        if (k < 0) continue;
        q.fromArray(Lv.p, i).applyMatrix4(MS[k]).toArray(P, i);
        q.fromArray(Lv.n, i).applyMatrix3(NM[k]).normalize().toArray(N, i);
        if (H && Lv.h) q.fromArray(Lv.h, i).applyMatrix3(NM[k]).normalize().toArray(H, i);
      }
      Lv.g.attributes.position.needsUpdate = Lv.g.attributes.normal.needsUpdate = true;
      if (H) Lv.g.attributes.hullNormal.needsUpdate = true;
      Lv.g.computeBoundingSphere();
      Lv.g.computeBoundingBox();
    }
    root.updateMatrixWorld(true);
  }
  const CLIPS = { drift: T };
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`toro-nagashi: no clip "${m[1]}" (clips: drift)`);
      return setTime(((+m[2] % T) + T) % T);
    }
    if (name !== "rest") throw new Error(`toro-nagashi: unknown pose "${name}" (rest, or drift@<seconds>)`);
    setTime(0); // rest is the clip's first frame
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
