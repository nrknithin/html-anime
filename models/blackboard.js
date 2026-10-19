// blackboard.js - the front wall of every anime classroom, static: the green chalkboard in its aluminium frame, the
// chalk ledge with chalk and two erasers, the teacher's platform (kyodan) and the slanted-top lectern (kyotaku).
// Contract: harness/lab/README.md. Meters, +Y up, the unit faces +Z (toward the pupils), its left is +X,
// stands on y = 0, centred on x = 0, z = 0 (the bbox footprint).
//
// Construction (boxes, hexahedra and 6-sided tubes, all triangle soups merged per material, so the whole wall is
// seven meshes; boxes are flat-shaded, chalk tubes carry radial normals). The board face is one box with an aluminium
// frame 15 mm proud around it, so the frame's hull closes the outline and the face reads as an inset panel. The ledge
// is a shallow tray (bottom plate and front lip) under the bottom rail. The platform is one long low box butting the
// wall; the lectern is a box body with a plinth and a separate slanted top board that overhangs it, so the slope and
// the overhang read in silhouette. Chalk strokes ({ chalk: true }) are single camera-facing quads 3 mm proud of the
// board, unlined: three "text" rows of dashes, an underline, a boxed diagram, and the vertical date/duty column at
// the right edge every Japanese board carries. Every triangle is wound away from a point inside its solid, never by hand.
// Proportions (real size; base unit the board height B = 1.2 m):
//   board 3.6 x 1.2 (3 B x B), bottom edge 0.80 off the floor, frame 3 cm, top of frame 2.03 (meta.height);
//   ledge 9 cm deep at 0.75-0.785; platform 0.20 high, board width + 0.9 long, 0.95 deep; lectern 0.62 wide,
//   0.44 deep, 0.92 tall on the platform (front edge of the slanted top higher, sloping 12 deg down to the teacher).
// Options: build(THREE, kit, colors, { platform = true, lectern = true, chalk = false, width = 3.6, height }).
//   width   board width in m (frame, ledge and platform follow; chalk strokes span it).
//   height  scales everything uniformly so the frame top is `height` (default 2.03 m), as the torii's.
//   lectern needs the platform; without it the lectern stands on the floor at the same place.
// Budget: 316 triangles in 6 meshes; 388 in 7 with { chalk: true } (the strokes are one unlined mesh).
// Colours (meadow): board iris #3f8a47 / hair #2c5131 (the face takes the base at a low threshold, its edges the
// shade; both are real greens, well lighter than ink #1c261b); aluminium frame and ledge sclera #f6f3ee / sky #d7ecef;
// platform and lectern wood moon #f7f3e1 / skin #f0c2ae (pale birch: its shade is the desk's noon birch shade
// #f0c2ae exactly, so the front wall and the noon desks read as one pale-wood room); chalk white moon (felt of the
// erasers too), yellow practical #f2c94c, red accent #d9483b (also the eraser backs); strokes sclera, unlined.

export const meta = {
  name: "blackboard",
  height: 2.03,
  script: "meadow",
  colors: {
    board: "#3f8a47", boardShade: "#2c5131",
    metal: "#f6f3ee", metalShade: "#d7ecef",
    wood: "#f7f3e1", woodShade: "#f0c2ae",
    chalk: "#f7f3e1", chalkShade: "#f6f3ee",
    yellow: "#f2c94c", yellowShade: "#f2c94c",
    red: "#d9483b", redShade: "#d9483b",
    stroke: "#f6f3ee", strokeShade: "#f6f3ee",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { platform = true, lectern = true, chalk = false, width = 3.6 } = opts;
  const NATURAL = 2.03;
  const { height = NATURAL } = opts;
  const root = new THREE.Group();
  root.name = "blackboard";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / NATURAL);
  root.add(body);
  const joints = {};

  // ---------- triangle soups with normals ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  // one triangle wound away from `ref`; normals per vertex, or the face normal
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
  // convex hexahedron: p[0..3] the bottom face, p[4..7] the top face in the same order
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  const box = (key, x0, x1, y0, y1, z0, z1) =>
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  // a straight capped tube of radius r from A to B (chalk sticks), its ring basis from the plane normal pn
  function stick(key, A, B, r, pn, sides = 6) {
    const T = nrm(sub(B, A)), u = nrm(sub(pn, mul(T, dot(pn, T)))), w = cross(T, u);
    const ring = (P) => Array.from({ length: sides }, (_, j) => {
      const a = (j / sides) * Math.PI * 2, d = add(mul(u, Math.cos(a)), mul(w, Math.sin(a)));
      return { q: add(P, mul(d, r)), n: d };
    });
    const R0 = ring(A), R1 = ring(B), mid = mul(add(A, B), 0.5);
    for (let j = 0; j < sides; j++) {
      const k = (j + 1) % sides;
      tri(key, R0[j].q, R0[k].q, R1[k].q, mid, R0[j].n, R0[k].n, R1[k].n);
      tri(key, R0[j].q, R1[k].q, R1[j].q, mid, R0[j].n, R1[k].n, R1[j].n);
    }
    for (const R of [R0, R1]) for (let j = 1; j < sides - 1; j++) tri(key, R[0].q, R[j].q, R[j + 1].q, mid);
  }
  // a flat chalk stroke on the board face, facing +Z (2 triangles)
  const ZS = 0.003;
  const mark = (x0, x1, y0, y1) => quad("stroke", [x0, y0, ZS], [x1, y0, ZS], [x1, y1, ZS], [x0, y1, ZS], [0, 0, -1]);
  const line = (ax, ay, bx, by, t = 0.014) => { // a stroke of thickness t from A to B
    const d = nrm([bx - ax, by - ay, 0]), o = [-d[1] * t / 2, d[0] * t / 2, 0];
    quad("stroke", [ax - o[0], ay - o[1], ZS], [bx - o[0], by - o[1], ZS], [bx + o[0], by + o[1], ZS], [ax + o[0], ay + o[1], ZS], [0, 0, -1]);
  };

  // ---------- the board: face, frame, ledge (board face front at z = 0) ----------
  const W = Math.max(1, width), H0 = 0.8, H1 = 2.0, F = 0.03, hw = W / 2;
  box("board", -hw, hw, H0, H1, -0.02, 0);
  box("metal", -hw - F, hw + F, H1, H1 + F, -0.025, 0.015); // top rail
  box("metal", -hw - F, hw + F, H0 - F, H0, -0.025, 0.015); // bottom rail
  for (const s of [-1, 1]) box("metal", s > 0 ? hw : -hw - F, s > 0 ? hw + F : -hw, H0, H1, -0.025, 0.015);
  // ledge tray under the bottom rail: plate, front lip, end caps
  const LY = H0 - F - 0.022, LZ = 0.1;
  box("metal", -hw - F, hw + F, LY, LY + 0.012, 0.015, LZ);
  box("metal", -hw - F, hw + F, LY, LY + 0.034, LZ - 0.01, LZ);
  for (const s of [-1, 1]) box("metal", s > 0 ? hw + F - 0.008 : -hw - F, s > 0 ? hw + F : -hw - F + 0.008, LY + 0.012, LY + 0.03, 0.015, LZ - 0.01);
  // chalk on the ledge: white, yellow, red; lying along the ledge, one a little askew
  const cy = LY + 0.012 + 0.0077, R = 0.0075; // 12 mm chalk thickened to 15 so it survives the hull
  for (const [key, x, len, skew] of [["chalk", -0.62, 0.075, 0.1], ["chalk", -0.52, 0.06, -0.2], ["yellow", -0.4, 0.07, 0.05], ["red", -0.3, 0.05, 0.3], ["chalk", 0.95, 0.08, -0.1]]) {
    const dz = Math.sin(skew) * len / 2, dx = Math.cos(skew) * len / 2;
    stick(key, [x - dx, cy, 0.05 - dz], [x + dx, cy, 0.05 + dz], R, [0, 1, 0]);
  }
  // two felt erasers: a red back on a pale felt pad
  for (const x of [0.25, 1.15]) {
    const ex = 0.065, ez = 0.025, fy = LY + 0.012;
    box("chalk", x - ex, x + ex, fy, fy + 0.012, 0.055 - ez, 0.055 + ez);
    box("red", x - ex + 0.004, x + ex - 0.004, fy + 0.012, fy + 0.034, 0.055 - ez + 0.003, 0.055 + ez - 0.003);
  }

  // ---------- chalk writing ({ chalk: true }) ----------
  if (chalk) {
    const x0 = -hw + 0.18;
    // a title, underlined
    for (const [a, b] of [[0, 0.09], [0.12, 0.2], [0.24, 0.36]]) mark(x0 + a, x0 + b, 1.86, 1.89);
    line(x0 - 0.02, 1.83, x0 + 0.42, 1.835, 0.01);
    // three rows of "text": dashes of varied length
    const rows = [[0.05, 0.14, 0.2, 0.31, 0.36, 0.52, 0.58, 0.66], [0.05, 0.22, 0.27, 0.35, 0.4, 0.58], [0.05, 0.12, 0.17, 0.33, 0.38, 0.46, 0.51, 0.6]];
    rows.forEach((r, i) => { for (let k = 0; k < r.length; k += 2) mark(x0 + r[k], x0 + r[k + 1], 1.68 - i * 0.14, 1.70 - i * 0.14); });
    // a boxed diagram with an arrow to the middle of the board
    const bx = -0.15, by = 1.32, bw = 0.42, bh = 0.34;
    line(bx, by, bx + bw, by), line(bx + bw, by, bx + bw, by + bh), line(bx + bw, by + bh, bx, by + bh), line(bx, by + bh, bx, by);
    line(bx + 0.05, by + 0.08, bx + 0.2, by + 0.26), line(bx + 0.2, by + 0.26, bx + 0.36, by + 0.1);
    line(x0 + 0.68, 1.69, bx - 0.04, by + bh * 0.6), line(bx - 0.04, by + bh * 0.6, bx - 0.09, by + bh * 0.6 + 0.04), line(bx - 0.04, by + bh * 0.6, bx - 0.1, by + bh * 0.6 - 0.02);
    // more text right of the diagram
    for (let i = 0; i < 2; i++) for (const [a, b] of [[0.38, 0.56], [0.6, 0.7], [0.74, 0.92]]) mark(a, b, 1.6 - i * 0.14, 1.62 - i * 0.14);
    // the date / duty column at the right edge: a frame line and vertical dashes
    const dx = hw - 0.28;
    line(dx, H0 + 0.08, dx, H1 - 0.06, 0.01);
    for (const [y0, y1] of [[1.82, 1.9], [1.7, 1.78], [1.5, 1.62], [1.36, 1.46], [1.12, 1.24]]) mark(dx + 0.1, dx + 0.13, y0, y1);
  }

  // ---------- the teacher's platform and lectern ----------
  const PD = 0.95, PH = 0.2, pw = hw + 0.45;
  if (platform) box("wood", -pw, pw, 0, PH, -0.025, PD);
  if (lectern) {
    const y0 = platform ? PH : 0, LW = 0.31, z0 = 0.4, z1 = 0.84, hb = 0.8, hf = 0.9, plinth = 0.06;
    // plinth, set in 2 cm, then the body with a sloped top (high at the pupils' side, +Z)
    box("wood", -LW + 0.02, LW - 0.02, y0, y0 + plinth, z0 + 0.02, z1 - 0.02);
    hex("wood", [[-LW, y0 + plinth, z0], [LW, y0 + plinth, z0], [LW, y0 + plinth, z1], [-LW, y0 + plinth, z1],
      [-LW, y0 + hb, z0], [LW, y0 + hb, z0], [LW, y0 + hf, z1], [-LW, y0 + hf, z1]]);
    // the slanted top board, overhanging 3 cm all round, 2.5 cm thick, with a pen lip at its low edge
    const o = 0.03, t = 0.025, slope = (hf - hb) / (z1 - z0);
    const yAt = (z) => y0 + hb + (z - z0) * slope;
    const za = z0 - o, zb = z1 + o;
    hex("wood", [[-LW - o, yAt(za), za], [LW + o, yAt(za), za], [LW + o, yAt(zb), zb], [-LW - o, yAt(zb), zb],
      [-LW - o, yAt(za) + t, za], [LW + o, yAt(za) + t, za], [LW + o, yAt(zb) + t, zb], [-LW - o, yAt(zb) + t, zb]]);
    box("wood", -LW - o, LW + o, yAt(za) + t - 0.002, yAt(za) + t + 0.018, za, za + 0.016);
  }

  // centre the footprint on x = z = 0
  const lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (const { p } of Object.values(soups))
    for (let i = 0; i < p.length; i += 3)
      for (const [k, j] of [[0, 0], [1, 2]]) (lo[k] = Math.min(lo[k], p[i + j])), (hi[k] = Math.max(hi[k], p[i + j]));
  body.position.set((-(lo[0] + hi[0]) / 2) * body.scale.x, 0, (-(lo[1] + hi[1]) / 2) * body.scale.x);

  // ---------- meshes: one per material [base, shade, threshold, ink px (0 = no hull)] ----------
  const MAT = {
    board: [c.board, c.boardShade, 0.2, 3],
    metal: [c.metal, c.metalShade, 0.35, 2.5],
    wood: [c.wood, c.woodShade, 0.35, 3.5],
    chalk: [c.chalk, c.chalkShade, 0.1, 2],
    yellow: [c.yellow, c.yellowShade, 0.1, 2],
    red: [c.red, c.redShade, 0.1, 2],
    stroke: [c.stroke, c.strokeShade, 0.1, 0],
  };
  for (const [key, { p, n }] of Object.entries(soups)) {
    const [base, shade, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    body.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
