// shateki.js - a summer-festival shateki (cork-gun shooting gallery) stall at real size: a timber yatai under a
// striped awning, a hand-painted sign board, four red-felt steps of prizes, a red-cloth counter with two cork rifles
// and a dish of corks, and paper lanterns along the eave that sway in the night air.
// Contract: harness/lab/README.md. Meters, +Y up, the customer side faces +Z, its left is +X, stands on y = 0,
// centred on x = 0, z = 0.
//
// Construction (boxes, slabs, lathes and spheres, merged per material into triangle soups: one mesh per material,
// 10 meshes with lanterns, 9 without):
//   FRAME    four square timber posts (9 cm), the back pair taller, tied by top beams and sloped side beams. No side
//            rail: at the hero angle it cut straight across the prizes.
//   AWNING   one inked white slab sloping forward (back 2.60, front lip 2.30), 11 stripes front-to-back as red decals
//            3 mm off its faces (no hull, so stripe seams never ink), a short scalloped valance on the front lip.
//   SIGN     a white board standing on the front lip (2.24-2.71) in a red frame, the two characters painted in brush
//            strokes: flat ink quads 2 mm proud of the board, each stroke a polyline with a width (no font, no texture).
//   SHELVES  a dark indigo backdrop and four dark step blocks (tops 0.96 / 1.20 / 1.44 / 1.68, treads 0.22 deep) with
//            red felt laid over each tread and down each riser, so the sides stay dark and the prizes read against them.
//            Prizes are modelled at catalogue size and grown 1.3x about their feet (grow()) so they carry at 480x300:
//            small boxes, figure boxes with a dark window, lollipops in a cup, candy bags, three daruma (red, white face,
//            ink eyes, a gold belly mark), a white plush cat and an amber plush bear on the top step.
//   COUNTER  red cloth block (z 0.30-0.80, top 0.84), a pale timber edge strip and a dark kick band. One cork rifle
//            (pale stock, dark barrel, a cork in the muzzle) lies on it pointing into the stall; the other stands on its
//            heel leaning by the far front post, because the low hero camera cannot see the counter top. A white dish
//            of corks between.
//   LANTERNS five red chochin on a cord under the eave, in front of the valance. All five are ONE mesh (body with
//            shallow paper ribs, caps, string): pose() rewrites its vertices about each lantern's hook (owner per
//            vertex), as the ufo-catcher claw.
// Proportions (real size, base unit the stall width W = 2.5 m): posts at x +-1.15, z +0.85 / -0.90; awning 2.5 x 2.0;
//   counter 2.16 x 0.5; steps 2.08 wide; lanterns 0.17 x 0.22 (+ caps), every 0.5 m, centres at 2.05; sign 1.24 x 0.47,
//   characters 0.36 tall; daruma 0.31-0.36 tall, cat 0.45, figure boxes 0.29; rifles 0.82 long.
// Options: build(THREE, kit, colors, { height = 2.72, lanterns = true }). height scales the whole stall uniformly (the
//   sign's top). lanterns: false drops the lanterns and their cord.
// Clips: sway (2 s loop): each lantern swings about its hook, 0.16 rad side to side and 0.06 rad fore and aft, phases
//   staggered along the eave. rest hangs them plumb.
// Budget: 9.1k triangles (6.6k without lanterns).
// Colours (festival), base / shade:
//   canvas, sign board, cat, dish, faces   sclera #f6f3ee / skin #f0c2ae (threshold 0.1, so faces square to camera stay lit)
//   stripes, felt, counter cloth, daruma   accent #ff4d6d / sky #24143a
//   timber, rifle stocks, corks            moon #ffd7a1 / practical #ffb020 (festival has no brown: pale hinoki)
//   amber boxes, bear, candy               practical #ffb020 / accent #ff4d6d
//   backdrop, barrels, windows, kick band  sky #24143a / hair #1a1020 (above ink)
//   lanterns                               accent #ff4d6d / sky #24143a
//   ink strokes, eyes, caps                hair #1a1020 (single tone)
//   cream boxes, bags                      line #fff1ea / moon #ffd7a1

export const meta = {
  name: "shateki",
  height: 2.72,
  script: "festival",
  colors: {
    canvas: "#f6f3ee", canvasShade: "#f0c2ae",
    stripe: "#ff4d6d", stripeShade: "#24143a",
    wood: "#ffd7a1", woodShade: "#ffb020",
    amber: "#ffb020", amberShade: "#ff4d6d",
    dark: "#24143a", darkShade: "#1a1020",
    black: "#1a1020",
    cream: "#fff1ea", creamShade: "#ffd7a1",
    lantern: "#ff4d6d", lanternShade: "#24143a",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, lanterns = true } = opts;
  const root = new THREE.Group();
  root.name = "shateki";
  const stall = new THREE.Group(); // uniform size scale lives here
  stall.name = "stall";
  stall.scale.setScalar(height / meta.height);
  root.add(stall);
  const joints = {};

  // ---------- soups: key -> positions + normals (+ owner for the lantern soup) ----------
  const soups = {};
  let owner = -1;
  const S = (key) => (soups[key] ??= { p: [], n: [], o: [] });
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
  // a flat triangle wound away from `ref` (a point inside the solid, or behind a decal)
  function tri(key, a, b, e, ref) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    const flip = dot(n, sub(m, ref)) < 0;
    n = norm(flip ? n.map((x) => -x) : n);
    const s = S(key);
    s.p.push(...a, ...(flip ? [...e, ...b] : [...b, ...e]));
    s.n.push(...n, ...n, ...n);
    s.o.push(owner, owner, owner);
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
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), SV = new THREE.Vector3();
  function push(key, g) {
    const s = S(key);
    s.p.push(...g.attributes.position.array);
    s.n.push(...g.attributes.normal.array);
    for (let i = 0; i < g.attributes.position.count; i++) s.o.push(owner);
  }
  // a THREE geometry placed by position / Euler / scale (positive scales only)
  function add(key, geo, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    M4.compose(V.set(...pos), Q.setFromEuler(E.set(...rot)), SV.set(...scl));
    g.applyMatrix4(M4);
    push(key, g);
  }
  const CYL = new THREE.CylinderGeometry(1, 1, 1, 8, 1);
  function pipe(key, a, b, r, geo = CYL) {
    const d = sub(b, a), L = Math.hypot(...d);
    Q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...norm(d)));
    const g = geo.toNonIndexed();
    M4.compose(V.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), Q, SV.set(r, L, r));
    g.applyMatrix4(M4);
    push(key, g);
  }
  const SPH = new THREE.SphereGeometry(1, 14, 10);
  const SPH_S = new THREE.SphereGeometry(1, 8, 6);
  const CONE = new THREE.ConeGeometry(1, 1, 4);

  // ---------- frame: timber posts and beams ----------
  const AX = 1.25, AZ0 = -1.0, AZ1 = 0.95, AY0 = 2.6, AY1 = 2.3, AT = 0.025; // awning
  const yTop = (z) => AY0 + ((AY1 - AY0) * (z - AZ0)) / (AZ1 - AZ0);
  const PX = 1.15, PZF = 0.85, PZB = -0.9, PW = 0.045;
  for (const x of [-PX, PX]) {
    for (const z of [PZF, PZB]) box("wood", x - PW, x + PW, 0, yTop(z) - AT - 0.002, z - PW, z + PW);
    hex("wood", [[x - 0.03, yTop(PZB) - AT - 0.1, PZB], [x + 0.03, yTop(PZB) - AT - 0.1, PZB], [x + 0.03, yTop(PZF) - AT - 0.1, PZF], [x - 0.03, yTop(PZF) - AT - 0.1, PZF],
      [x - 0.03, yTop(PZB) - AT - 0.002, PZB], [x + 0.03, yTop(PZB) - AT - 0.002, PZB], [x + 0.03, yTop(PZF) - AT - 0.002, PZF], [x - 0.03, yTop(PZF) - AT - 0.002, PZF]]);
  }
  box("wood", -PX, PX, yTop(PZF) - AT - 0.1, yTop(PZF) - AT - 0.002, PZF - 0.03, PZF + 0.03); // front beam
  box("wood", -PX, PX, yTop(PZB) - AT - 0.1, yTop(PZB) - AT - 0.002, PZB - 0.03, PZB + 0.03); // back beam

  // ---------- awning: white slab + red stripe decals, scalloped valance ----------
  const NS = 11, SW = (2 * AX) / NS, red = (i) => i % 2 === 0;
  const top = (x, z) => [x, yTop(z), z], bot = (x, z) => [x, yTop(z) - AT, z];
  hex("canvas", [bot(-AX, AZ0), bot(AX, AZ0), bot(AX, AZ1), bot(-AX, AZ1), top(-AX, AZ0), top(AX, AZ0), top(AX, AZ1), top(-AX, AZ1)]);
  const slopeN = norm([0, AZ1 - AZ0, AY0 - AY1]);
  const off = (p, k) => [p[0], p[1] + slopeN[1] * k, p[2] + slopeN[2] * k];
  for (let i = 0; i < NS; i++) {
    if (!red(i)) continue;
    const x0 = -AX + i * SW, x1 = x0 + SW;
    quad("stripe", off(top(x0, AZ0), 0.003), off(top(x1, AZ0), 0.003), off(top(x1, AZ1), 0.003), off(top(x0, AZ1), 0.003), [0, 0, 0]);
    quad("stripe", off(bot(x0, AZ0), -0.003), off(bot(x1, AZ0), -0.003), off(bot(x1, AZ1), -0.003), off(bot(x0, AZ1), -0.003), [0, 5, 0]);
    const z = AZ1 + 0.003; // the lip
    quad("stripe", [x0, AY1 - AT, z], [x1, AY1 - AT, z], [x1, AY1, z], [x0, AY1, z], [0, AY1, 0]);
  }
  const VZ = AZ1 + 0.002, VT = 0.012, VD = 0.05, VS = 0.05;
  const hem = (u) => -VD - VS * Math.sin(Math.PI * u);
  const vShape = new THREE.Shape();
  vShape.moveTo(-AX, 0);
  vShape.lineTo(-AX, -VD);
  for (let i = 0; i < NS; i++) for (let k = 1; k <= 6; k++) vShape.lineTo(-AX + (i + k / 6) * SW, hem(k / 6));
  vShape.lineTo(AX, 0);
  vShape.lineTo(-AX, 0);
  add("canvas", new THREE.ExtrudeGeometry(vShape, { depth: VT, bevelEnabled: false }), [0, AY1 - AT, VZ]);
  for (let i = 0; i < NS; i++) {
    if (!red(i)) continue;
    const x0 = -AX + i * SW;
    const pts = [[x0, 0], [x0, -VD]];
    for (let k = 1; k <= 6; k++) pts.push([x0 + (k / 6) * SW, hem(k / 6)]);
    pts.push([x0 + SW, 0]);
    for (const [zf, ref] of [[VZ + VT + 0.003, VZ], [VZ - 0.003, VZ + VT]]) {
      const P = pts.map(([x, y]) => [x, AY1 - AT + y, zf]);
      for (let k = 1; k < P.length - 1; k++) tri("stripe", P[0], P[k], P[k + 1], [P[0][0], P[0][1], ref]);
    }
  }

  // ---------- sign board on the front lip, two brush-painted characters ----------
  const GX = 0.62, GY0 = 2.24, GY1 = 2.712, GZ = AZ1 + 0.03, GT = 0.03;
  box("canvas", -GX, GX, GY0, GY1, GZ, GZ + GT);
  const FR = 0.035; // red frame, proud of the face
  for (const [x0, x1, y0, y1] of [[-GX, GX, GY1 - FR, GY1], [-GX, GX, GY0, GY0 + FR], [-GX, -GX + FR, GY0, GY1], [GX - FR, GX, GY0, GY1]])
    box("stripeSolid", x0 - 0.008, x1 + 0.008, y0 - 0.008, y1 + 0.008, GZ - 0.004, GZ + GT + 0.008);
  for (const s of [-1, 1]) box("wood", s * 0.45 - 0.025, s * 0.45 + 0.025, AY1 - 0.06, GY0 + 0.1, GZ - 0.05, GZ); // struts
  // strokes in a unit cell (x right, y up), [width, ...points]
  const GLYPHS = [
    [ // 射: 身 + 寸
      [0.085, [0.31, 0.98], [0.2, 0.87]],
      [0.075, [0.12, 0.86], [0.42, 0.86]],
      [0.075, [0.12, 0.86], [0.12, 0.38]],
      [0.075, [0.42, 0.86], [0.42, 0.06], [0.33, 0.12]],
      [0.06, [0.12, 0.69], [0.42, 0.69]],
      [0.06, [0.12, 0.53], [0.42, 0.53]],
      [0.075, [0.03, 0.36], [0.5, 0.44]],
      [0.08, [0.36, 0.38], [0.2, 0.18], [0.04, 0.05]],
      [0.075, [0.55, 0.68], [0.98, 0.71]],
      [0.085, [0.83, 0.97], [0.83, 0.07], [0.72, 0.14]],
      [0.09, [0.62, 0.53], [0.69, 0.41]],
    ],
    [ // 的: 白 + 勺
      [0.085, [0.27, 0.99], [0.18, 0.86]],
      [0.075, [0.06, 0.8], [0.06, 0.06]],
      [0.075, [0.06, 0.8], [0.4, 0.8]],
      [0.075, [0.4, 0.8], [0.4, 0.06]],
      [0.06, [0.06, 0.44], [0.4, 0.44]],
      [0.07, [0.06, 0.09], [0.4, 0.09]],
      [0.085, [0.68, 0.98], [0.52, 0.64]],
      [0.075, [0.59, 0.81], [0.95, 0.81], [0.93, 0.08], [0.8, 0.15]],
      [0.095, [0.65, 0.53], [0.76, 0.38]],
    ],
  ];
  const CH = 0.36, CZ = GZ + GT + 0.002;
  GLYPHS.forEach((strokes, gi) => {
    const ox = (gi === 0 ? -0.06 : 0.06) + (gi - 1) * CH, oy = (GY0 + GY1) / 2 - CH / 2;
    for (const [w0, ...pts] of strokes) {
      const P = pts.map(([u, v]) => [ox + u * CH, oy + v * CH]), w = w0 * CH;
      for (let k = 0; k < P.length - 1; k++) {
        const [a, b] = [P[k], P[k + 1]], d = norm([b[0] - a[0], b[1] - a[1], 0]), h = w / 2;
        const t = [d[0] * h * 0.9, d[1] * h * 0.9], nx = -d[1] * h, ny = d[0] * h;
        const A = [a[0] - t[0], a[1] - t[1]], B = [b[0] + t[0], b[1] + t[1]];
        // a brush taper: a little narrower at the stroke's end
        const e = k === P.length - 2 ? 0.75 : 1;
        quad("ink", [A[0] + nx, A[1] + ny, CZ], [A[0] - nx, A[1] - ny, CZ], [B[0] - nx * e, B[1] - ny * e, CZ], [B[0] + nx * e, B[1] + ny * e, CZ], [A[0], A[1], CZ - 1]);
      }
    }
  });

  // ---------- backdrop and stepped red-felt shelves ----------
  const BZ = -0.86, SX = 1.04;
  box("dark", -1.1, 1.1, 0.0, yTop(BZ) - AT - 0.005, BZ - 0.03, BZ);
  const STEPS = [[0.96, 0.0], [1.2, -0.22], [1.44, -0.44], [1.68, -0.64]]; // tread top y, front z
  STEPS.forEach(([y, z], k) => {
    box("dark", -SX, SX, 0, y - 0.004, z, BZ); // the step block
    const y0 = k ? STEPS[k - 1][0] : 0.5;
    box("felt", -SX - 0.008, SX + 0.008, y - 0.004, y + 0.006, z + 0.01, BZ); // felt over the tread
    box("felt", -SX - 0.008, SX + 0.008, y0, y, z + 0.002, z + 0.01); // and down the riser
  });
  const tread = (k) => STEPS[k][0] + 0.006, mid = (k) => STEPS[k][1] - 0.11; // z centre of tread k

  // prize helpers
  function prizeBox(key, x, k, w, h, d, window = false) {
    const y = tread(k), z = mid(k);
    box(key, x - w / 2, x + w / 2, y, y + h, z - d / 2, z + d / 2);
    if (window) { // a dark window and a pale band on the front: a boxed figure
      box("dark", x - w * 0.32, x + w * 0.32, y + h * 0.18, y + h * 0.78, z + d / 2, z + d / 2 + 0.006);
      box("cream", x - w * 0.18, x + w * 0.18, y + h * 0.28, y + h * 0.62, z + d / 2 + 0.006, z + d / 2 + 0.012);
    }
  }
  function daruma(x, k, s = 1) {
    const y = tread(k), z = mid(k);
    add("felt", SPH, [x, y + 0.12 * s, z], [0, 0, 0], [0.1 * s, 0.12 * s, 0.095 * s]);
    add("canvas", SPH, [x, y + 0.14 * s, z + 0.05 * s], [0, 0, 0], [0.058 * s, 0.05 * s, 0.05 * s]);
    for (const e of [-1, 1]) add("ink", SPH_S, [x + e * 0.024 * s, y + 0.145 * s, z + 0.098 * s], [0, 0, 0], [0.011 * s, 0.011 * s, 0.004]);
    add("amber", SPH_S, [x, y + 0.055 * s, z + 0.083 * s], [0, 0, 0], [0.03 * s, 0.015 * s, 0.01]); // gold belly mark
  }
  function plush(key, x, k, s, cat) {
    const y = tread(k), z = mid(k) + 0.02;
    add(key, SPH, [x, y + 0.1 * s, z], [0, 0, 0], [0.11 * s, 0.1 * s, 0.085 * s]); // body
    add(key, SPH, [x, y + 0.25 * s, z + 0.01 * s], [0, 0, 0], [0.095 * s, 0.085 * s, 0.08 * s]); // head
    for (const e of [-1, 1]) {
      if (cat) add(key, CONE, [x + e * 0.055 * s, y + 0.34 * s, z + 0.005 * s], [0, Math.PI / 4, -e * 0.35], [0.032 * s, 0.07 * s, 0.024 * s]);
      else add(key, SPH_S, [x + e * 0.07 * s, y + 0.32 * s, z], [0, 0, 0], [0.03 * s, 0.03 * s, 0.02 * s]);
      add("ink", SPH_S, [x + e * 0.033 * s, y + 0.26 * s, z + 0.087 * s], [0, 0, 0], [0.011 * s, 0.014 * s, 0.006]);
      add(key, SPH_S, [x + e * 0.07 * s, y + 0.035 * s, z + 0.06 * s], [0, 0, 0], [0.035 * s, 0.03 * s, 0.04 * s]); // feet
    }
    add(cat ? "felt" : "ink", SPH_S, [x, y + 0.232 * s, z + 0.09 * s], [0, 0, 0], [0.01 * s, 0.008 * s, 0.005]); // nose
    if (cat) pipe(key, [x + 0.08 * s, y + 0.03 * s, z - 0.04 * s], [x + 0.15 * s, y + 0.17 * s, z - 0.05 * s], 0.016 * s); // tail
  }
  function lollipops(x, k) {
    const y = tread(k), z = mid(k);
    pipe("cream", [x, y, z], [x, y + 0.08, z], 0.045);
    const DISC = new THREE.CylinderGeometry(1, 1, 1, 12);
    [[-0.035, 0.17, "amber", -0.25], [0.0, 0.2, "canvas", 0], [0.035, 0.16, "felt", 0.25]].forEach(([dx, h, key, a]) => {
      const tx = x + dx + Math.sin(a) * 0.08, ty = y + h;
      pipe("cream", [x + dx * 0.4, y + 0.05, z], [tx, ty, z], 0.006);
      add(key, DISC, [tx, ty + 0.035, z], [Math.PI / 2, 0, 0], [0.042, 0.018, 0.042]);
    });
  }
  function bag(key, x, k) {
    const y = tread(k), z = mid(k);
    hex(key, [[x - 0.07, y, z - 0.03], [x + 0.07, y, z - 0.03], [x + 0.07, y, z + 0.03], [x - 0.07, y, z + 0.03],
      [x - 0.055, y + 0.17, z - 0.008], [x + 0.055, y + 0.17, z - 0.008], [x + 0.055, y + 0.17, z + 0.008], [x - 0.055, y + 0.17, z + 0.008]]);
    box("felt", x - 0.06, x + 0.06, y + 0.17, y + 0.2, z - 0.01, z + 0.01); // the crimped top
  }

  // every prize is drawn at catalogue size, then grown about its foot so it carries at the thumbnail
  const PS = 1.3, PSZ = 1.1;
  function grow(x, k, fn) {
    const marks = Object.fromEntries(Object.entries(soups).map(([key, s]) => [key, s.p.length]));
    fn();
    const ay = tread(k), az = mid(k);
    for (const [key, s] of Object.entries(soups))
      for (let i = marks[key] ?? 0; i < s.p.length; i += 3) {
        s.p[i] = x + (s.p[i] - x) * PS;
        s.p[i + 1] = ay + (s.p[i + 1] - ay) * PS;
        s.p[i + 2] = az + (s.p[i + 2] - az) * PSZ;
      }
  }
  const BOX = (key, w, h, d, win = false) => (x, k) => prizeBox(key, x, k, w, h, d, win);
  const ROWS = [
    // step 0 (lowest): small boxes and candy bags
    [[-0.86, BOX("amber", 0.14, 0.13, 0.12)], [-0.56, (x, k) => bag("cream", x, k)], [-0.28, BOX("dark", 0.13, 0.15, 0.1)],
      [0.0, BOX("amber", 0.12, 0.11, 0.12)], [0.28, (x, k) => bag("cream", x, k)], [0.57, BOX("canvas", 0.14, 0.12, 0.1)],
      [0.86, BOX("amber", 0.12, 0.14, 0.1)]],
    // step 1: figure boxes and lollipops
    [[-0.84, BOX("amber", 0.15, 0.22, 0.1, true)], [-0.5, BOX("canvas", 0.13, 0.12, 0.1)], [-0.17, lollipops],
      [0.18, BOX("amber", 0.15, 0.22, 0.1, true)], [0.5, BOX("cream", 0.14, 0.11, 0.1)], [0.85, lollipops]],
    // step 2: daruma and boxes
    [[-0.86, BOX("canvas", 0.13, 0.13, 0.12)], [-0.52, daruma], [-0.17, BOX("amber", 0.15, 0.2, 0.12, true)],
      [0.16, BOX("dark", 0.13, 0.12, 0.12)], [0.5, daruma], [0.86, BOX("amber", 0.13, 0.13, 0.12)]],
    // step 3 (top): the big prizes
    [[-0.84, BOX("cream", 0.13, 0.17, 0.12)], [-0.5, (x, k) => plush("amber", x, k, 1.0, false)], [-0.12, BOX("canvas", 0.18, 0.26, 0.12, true)],
      [0.24, (x, k) => plush("canvas", x, k, 1.05, true)], [0.62, (x, k) => daruma(x, k, 1.15)], [0.9, BOX("amber", 0.12, 0.18, 0.1, true)]],
  ];
  ROWS.forEach((row, k) => row.forEach(([x, fn]) => grow(x, k, () => fn(x, k))));

  // ---------- counter: red cloth, timber edge, kick band ----------
  const CX = 1.08, CZ0 = 0.3, CZ1 = 0.8, CY = 0.84;
  box("felt", -CX, CX, 0.1, CY, CZ0, CZ1);
  box("wood", -CX - 0.02, CX + 0.02, CY - 0.035, CY - 0.005, CZ1 - 0.005, CZ1 + 0.02); // front edge strip
  box("dark", -CX + 0.02, CX - 0.02, 0, 0.1, CZ0 + 0.02, CZ1 - 0.03);

  // two cork rifles lying along the counter: stock (wood), barrel (dark), a cork in the muzzle
  // rifle(o, dir): heel at o, the barrel along dir; the stock's tall side is "up" perpendicular to dir
  function rifle(o, dir) {
    const d = norm(dir), sd = norm(cross(d, [0, 1, 0])), up = cross(sd, d);
    const P = (u, v, w) => [0, 1, 2].map((i) => o[i] + d[i] * u + up[i] * v + sd[i] * w);
    const T = 0.022; // half thickness
    // butt stock: tall at the heel, narrowing to the wrist
    hex("wood", [P(0, 0, -T), P(0.3, 0.015, -T), P(0.3, 0.015, T), P(0, 0, T), P(0, 0.11, -T), P(0.3, 0.06, -T), P(0.3, 0.06, T), P(0, 0.11, T)]);
    hex("wood", [P(0.3, 0.015, -T * 0.9), P(0.56, 0.02, -T * 0.9), P(0.56, 0.02, T * 0.9), P(0.3, 0.015, T * 0.9),
      P(0.3, 0.06, -T * 0.9), P(0.56, 0.055, -T * 0.9), P(0.56, 0.055, T * 0.9), P(0.3, 0.06, T * 0.9)]); // forend
    pipe("dark", P(0.28, 0.075, 0), P(0.8, 0.075, 0), 0.02); // barrel
    pipe("dark", P(0.34, 0.03, 0), P(0.34, 0.085, 0), 0.008); // cocking lever post
    pipe("wood", P(0.8, 0.075, 0), P(0.825, 0.075, 0), 0.014); // cork
  }
  rifle([0.45, CY, 0.92], [-0.08, 0, -1]); // lying on the cloth, pointing into the stall, the butt over the front edge
  rifle([-0.8, CY, 0.66], [-0.26, 0.74, 0.12]); // stood on its heel, leaning on the far front post
  // dish of corks
  const DX = -0.15, DZ = 0.6;
  add("canvas", new THREE.CylinderGeometry(0.1, 0.07, 0.03, 16), [DX, CY + 0.015, DZ]);
  const CORK = new THREE.CylinderGeometry(0.013, 0.016, 0.026, 8);
  for (let k = 0; k < 9; k++) {
    const a = k * 2.4, r = 0.02 + 0.055 * ((k * 0.37) % 1);
    add("wood", CORK, [DX + Math.cos(a) * r, CY + 0.035 + (k % 3) * 0.008, DZ + Math.sin(a) * r], [k % 2 ? 1.4 : 0.2, a, 0]);
  }

  // ---------- lanterns: one mesh, each lantern owned by its hook ----------
  const LR = 0.085, LH = 0.11, LZ = AZ1 + 0.07, LN = 5, LSP = 0.5, ROD = AY1 - AT - 0.012, LY = 2.05;
  const hooks = [];
  if (lanterns) {
    pipe("ink", [-AX + 0.02, ROD, LZ], [AX - 0.02, ROD, LZ], 0.006); // cord
    const prof = [];
    for (let k = 0; k <= 14; k++) {
      const t = -1 + (2 * k) / 14, rib = 1 + 0.035 * Math.cos(t * Math.PI * 3.5); // shallow paper ribs
      prof.push(new THREE.Vector2(LR * Math.sqrt(Math.max(0, 1 - 0.7 * t * t)) * rib, LH * t));
    }
    const BODY = new THREE.LatheGeometry(prof, 14);
    const CAP = new THREE.CylinderGeometry(0.045, 0.045, 0.024, 12);
    for (let i = 0; i < LN; i++) {
      const x = (i - (LN - 1) / 2) * LSP;
      owner = i;
      hooks.push([x, ROD, LZ]);
      add("lantern", BODY, [x, LY, LZ]);
      add("lantern", CAP, [x, LY + LH + 0.008, LZ]);
      add("lantern", CAP, [x, LY - LH - 0.008, LZ]);
      pipe("lantern", [x, LY + LH + 0.018, LZ], [x, ROD, LZ], 0.004, new THREE.CylinderGeometry(1, 1, 1, 4, 1));
      owner = -1;
    }
  }

  // ---------- meshes ----------
  const MAT = {
    canvas: [c.canvas, c.canvasShade, 0.1, true, 3.5],
    stripe: [c.stripe, c.stripeShade, 0.1, false],
    stripeSolid: [c.stripe, c.stripeShade, 0.1, true, 3],
    felt: [c.stripe, c.stripeShade, 0.0, true, 3],
    wood: [c.wood, c.woodShade, 0.2, true, 3],
    amber: [c.amber, c.amberShade, 0.1, true, 3],
    dark: [c.dark, c.darkShade, 0.35, true, 3],
    ink: [c.black, c.black, -1, false],
    cream: [c.cream, c.creamShade, 0.1, true, 3],
    lantern: [c.lantern, c.lanternShade, 0.05, true, 3],
  };
  let lanternMesh = null, base = null;
  for (const [key, s] of Object.entries(soups)) {
    const [b, sh, threshold, outline, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    const mesh = kit.toon(g, b, sh, outline ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    stall.add(mesh);
    if (key === "lantern") {
      lanternMesh = mesh;
      kit.hullNormals(g);
      const hn = g.attributes.hullNormal;
      base = { p: Float32Array.from(s.p), n: Float32Array.from(s.n), h: hn ? Float32Array.from(hn.array) : null, o: s.o };
      mesh.frustumCulled = false;
    }
  }

  // rewrite the lantern mesh: each lantern turns about its hook by (rx, rz)
  const RM = [], NM = [];
  function swing(angles) {
    if (!lanternMesh) return;
    angles.forEach(([rx, rz], i) => {
      const [hx, hy, hz] = hooks[i];
      const R = new THREE.Matrix4().makeRotationFromEuler(E.set(rx, 0, rz));
      RM[i] = new THREE.Matrix4().makeTranslation(hx, hy, hz).multiply(R).multiply(new THREE.Matrix4().makeTranslation(-hx, -hy, -hz));
      NM[i] = new THREE.Matrix3().getNormalMatrix(RM[i]);
    });
    const g = lanternMesh.geometry, P3 = g.attributes.position.array, N3 = g.attributes.normal.array, H = g.attributes.hullNormal?.array;
    const q = new THREE.Vector3();
    for (let v = 0; v < base.o.length; v++) {
      const k = base.o[v], i = v * 3;
      if (k < 0) continue;
      q.fromArray(base.p, i).applyMatrix4(RM[k]).toArray(P3, i);
      q.fromArray(base.n, i).applyMatrix3(NM[k]).normalize().toArray(N3, i);
      if (H && base.h) q.fromArray(base.h, i).applyMatrix3(NM[k]).normalize().toArray(H, i);
    }
    g.attributes.position.needsUpdate = g.attributes.normal.needsUpdate = true;
    if (H) g.attributes.hullNormal.needsUpdate = true;
    g.computeBoundingSphere(), g.computeBoundingBox();
  }

  // ---------- poses and clips ----------
  // sway: rz + swings a lantern's bottom toward -X (its right), rx + swings it toward +Z (the customer).
  const CLIPS = { sway: 2 };
  const SWAY_Z = 0.16, SWAY_X = 0.06, PHASE = 0.9;
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`shateki: no clip "${m[1]}" (clips: sway)`);
      const w = (2 * Math.PI * (+m[2])) / CLIPS.sway;
      swing(hooks.map((_, i) => [SWAY_X * Math.sin(w + i * PHASE + 1.3), SWAY_Z * Math.sin(w + i * PHASE)]));
    } else if (name === "rest") swing(hooks.map(() => [0, 0]));
    else throw new Error(`shateki: unknown pose "${name}" (rest, or sway@<seconds>)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
