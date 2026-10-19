// school-desk.js - the Japanese school desk and chair of every anime classroom, static; one set or a whole room.
// Contract: harness/lab/README.md. Meters, +Y up, the pupil faces +Z (toward the blackboard), its left is +X,
// stands on y = 0, centred on x = 0, z = 0 (the bbox of the set, or of the grid).
//
// Construction (boxes and swept tubes, all triangle soups merged per material across every piece, so a 30-desk room
// is five meshes; boxes are flat-shaded, tubes carry radial normals so a 6-sided tube reads round):
//   DESK   a birch top (one inked box) with a dark edge band 4 mm proud on its four sides (no hull: the top's hull
//          draws the outline). Two side frames, each ONE closed tube loop in the plane x = +-0.29: foot bar on the floor,
//          two legs, a rail under the top, rounded corners (bend radius 3 cm). A steel book tray (bottom, sides, front
//          plate) hangs between the frames under the top, open toward the pupil (-Z). A low stretcher ties the front
//          legs; a J-shaped bag hook sticks out of the +X frame on the pupil side. Dark glides under the foot bars.
//   CHAIR  a birch seat board and a bowed birch backrest (curved in plan, concave toward the pupil) on two tube sides.
//          Each side is two tubes: the front leg splayed forward that bends into the seat rail, and the rear leg splayed
//          back that runs on up as the back post. Two cross bars under the seat, a rubber foot under each leg.
//   Tubes: tube() sweeps a polyline with rounded corners; the ring basis comes from a plane normal (each tube is planar),
//   so closed loops have no twist seam; open ends are capped. Every triangle is wound away from a point inside its
//   solid (the axis point for tubes, the centre for boxes), never by hand.
// Proportions (real size, JIS desk and chair for a ~165 cm pupil; base unit the top depth T = 0.45 m):
//   desk 0.70 tall, top 0.65 x 0.45 x 0.022, frame tube 25 mm (thickened 12 % from 22), frames 0.58 apart, legs 0.38 apart;
//   tray 0.56 x 0.40 x 0.08, 3 cm under the top; chair seat 0.43 high (0.38 x 0.36), backrest 0.36 x 0.14
//   with its top at 0.80, feet splayed 3-4 cm past the seat. Set: chair seat 10 cm under the desk top ("tucked").
// Options: build(THREE, kit, colors, { part: "set" | "desk" | "chair", chairPulled, count, rows, height, ink }).
//   part      "set" (default), "desk" or "chair" alone. chairPulled: the chair 32 cm out, 8 cm to +X, turned 18 deg.
//   count, rows  a classroom grid of `count` sets in `rows` rows (front row at +Z), columns 1.15 m apart, rows 1.05 m.
//   height    scales everything uniformly so the tallest piece's top is `height` (default 0.80 m, the backrest; 0.70 for
//             part "desk", so the lab's meta.height check warns for that part and for any height).
//   ink       hull width factor (default 1, 0.6 for a grid): a room is seen small, so thin tubes keep their colour.
// Budget: 1000 triangles a set (desk 592, chair 408; a 30-set room 30k in 5 meshes).
// Ink in pixels: wood 3.5, tray 3, tubes and feet 2.5, so a 25 mm tube stays steel at hero size, not a black line.
// Colours (noon): birch sky #f2d7ae / skin #f0c2ae (top, seat, backrest); edge band and rubber iris #5c3d32 flat
// (a line band, as the house's tile rows); painted steel frame and tray sclera #f6f3ee / sky #f2d7ae (light grey
// paint warmed by the paper-noon light; noon has no cool grey, and meadow's only greys are blue-sky or saturated green).

export const meta = {
  name: "school-desk",
  height: 0.8,
  script: "noon",
  colors: {
    wood: "#f2d7ae", woodShade: "#f0c2ae",
    edge: "#5c3d32", edgeShade: "#5c3d32",
    steel: "#f6f3ee", steelShade: "#f2d7ae",
    rubber: "#5c3d32", rubberShade: "#5c3d32",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { part = "set", chairPulled = false, count = 1, rows = 1 } = opts;
  const { ink = count > 1 ? 0.6 : 1 } = opts; // hull width factor: a room is seen small, so its tubes keep their colour
  const natural = part === "desk" ? 0.7 : 0.8;
  const { height = natural } = opts;
  const root = new THREE.Group();
  root.name = "school-desk";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / natural);
  root.add(body);
  const joints = {};

  // ---------- triangle soups with normals, through a placement matrix ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  let M = new THREE.Matrix4(); // current placement (rotation about y + translation)
  const v3 = new THREE.Vector3();
  const put = (s, q, nq) => {
    v3.set(...q).applyMatrix4(M);
    s.p.push(v3.x, v3.y, v3.z);
    v3.set(...nq).transformDirection(M);
    s.n.push(v3.x, v3.y, v3.z);
  };
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
    put(s, a, na ?? n), put(s, B, NB ?? n), put(s, E, NE ?? n);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, x0, x1, y0, y1, z0, z1) {
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // a tube of radius r along the polyline pts, corners rounded with radius bend (3 arc points); every pts lies in
  // a plane with normal pn, which fixes the ring basis. closed: a loop; else both ends get flat caps.
  function tube(key, pts, r, pn, { closed = false, bend = 0.03, sides = 6 } = {}) {
    const path = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const P = pts[i];
      const corner = closed || (i > 0 && i < n - 1);
      if (!corner) { path.push(P); continue; }
      const A = pts[(i - 1 + n) % n], C = pts[(i + 1) % n];
      const da = nrm(sub(A, P)), dc = nrm(sub(C, P));
      const t = Math.min(bend, Math.hypot(...sub(A, P)) / 2.2, Math.hypot(...sub(C, P)) / 2.2);
      const p0 = add(P, mul(da, t)), p2 = add(P, mul(dc, t));
      for (const u of [0, 0.5, 1]) // quadratic Bezier p0 -> P -> p2
        path.push([0, 1, 2].map((k) => (1 - u) * (1 - u) * p0[k] + 2 * u * (1 - u) * P[k] + u * u * p2[k]));
    }
    const L = path.length;
    const rings = path.map((P, i) => {
      const prev = path[closed ? (i - 1 + L) % L : Math.max(0, i - 1)];
      const next = path[closed ? (i + 1) % L : Math.min(L - 1, i + 1)];
      const T = nrm(sub(next, prev));
      const u = nrm(sub(pn, mul(T, dot(pn, T)))), w = cross(T, u);
      const ring = [];
      for (let j = 0; j < sides; j++) {
        const a = (j / sides) * Math.PI * 2;
        const d = add(mul(u, Math.cos(a)), mul(w, Math.sin(a)));
        ring.push({ q: add(P, mul(d, r)), n: d });
      }
      return { P, T, ring };
    });
    const segs = closed ? L : L - 1;
    for (let i = 0; i < segs; i++) {
      const R0 = rings[i], R1 = rings[(i + 1) % L];
      const ref = mul(add(R0.P, R1.P), 0.5);
      for (let j = 0; j < sides; j++) {
        const k = (j + 1) % sides;
        const [a, b, e, d] = [R0.ring[j], R0.ring[k], R1.ring[k], R1.ring[j]];
        tri(key, a.q, b.q, e.q, ref, a.n, b.n, e.n);
        tri(key, a.q, e.q, d.q, ref, a.n, e.n, d.n);
      }
    }
    if (!closed)
      for (const [R, s] of [[rings[0], -1], [rings[L - 1], 1]]) {
        const ref = sub(R.P, mul(R.T, s * r)), cn = mul(R.T, s);
        for (let j = 1; j < sides - 1; j++) tri(key, R.ring[0].q, R.ring[j].q, R.ring[j + 1].q, ref, cn, cn, cn);
      }
  }

  // ---------- desk (local: top centred on x = z = 0, the pupil at -Z) ----------
  const TUBE = 0.0125;
  function desk() {
    const W = 0.65, D = 0.45, H = 0.7, TT = 0.022, y0 = H - TT;
    box("wood", -W / 2, W / 2, y0, H, -D / 2, D / 2);
    const e = 0.004, ey0 = y0 - 0.001, ey1 = H - 0.0015;
    box("edge", -W / 2 - e, W / 2 + e, ey0, ey1, D / 2 - 0.006, D / 2 + e);
    box("edge", -W / 2 - e, W / 2 + e, ey0, ey1, -D / 2 - e, -D / 2 + 0.006);
    box("edge", W / 2 - 0.006, W / 2 + e, ey0, ey1, -D / 2, D / 2);
    box("edge", -W / 2 - e, -W / 2 + 0.006, ey0, ey1, -D / 2, D / 2);
    const fx = 0.29, fz = 0.19, rail = y0 - TUBE - 0.002;
    for (const s of [-1, 1]) {
      const x = s * fx;
      tube("steel", [[x, TUBE + 0.006, fz + 0.03], [x, TUBE + 0.006, -fz - 0.03], [x, rail, -fz], [x, rail, fz]], TUBE, [1, 0, 0], { closed: true, bend: 0.035 });
      for (const z of [fz + 0.01, -fz - 0.01]) box("rubber", x - 0.014, x + 0.014, 0, 0.006, z - 0.025, z + 0.025);
    }
    // book tray: bottom, two sides, front plate (toward +Z), open to the pupil
    const tx = fx - TUBE, ty0 = 0.565, ty1 = y0 - 0.03, tz0 = -0.205, tz1 = fz + 0.004, t = 0.007;
    box("tray", -tx + t, tx - t, ty0, ty0 + t, tz0, tz1 - t); // plates butt, never overlap coplanar faces
    for (const s of [-1, 1]) box("tray", s > 0 ? tx - t : -tx, s > 0 ? tx : -tx + t, ty0, ty1, tz0, tz1 - t);
    box("tray", -tx, tx, ty0, ty1, tz1 - t, tz1);
    // low stretcher between the front legs
    const sy = 0.17, sz = fz + 0.03 * (rail - sy) / (rail - TUBE - 0.006); // on the slanted leg's axis
    tube("steel", [[-fx, sy, sz], [fx, sy, sz]], 0.01, [0, 1, 0]);
    // bag hook on the +X frame, pupil side: out, down, up
    const hz = -0.11, hr = 0.0065;
    tube("steel", [[fx, 0.6, hz], [fx + 0.045, 0.6, hz], [fx + 0.05, 0.545, hz], [fx + 0.075, 0.545, hz], [fx + 0.078, 0.57, hz]], hr, [0, 0, 1], { bend: 0.012 });
  }

  // ---------- chair (local: seat centred on x = z = 0, faces +Z) ----------
  function chair() {
    const SY = 0.43, ST = 0.018, SW = 0.38, SD = 0.36, sx = 0.165, ry = SY - ST - 0.011, r = 0.011;
    box("wood", -SW / 2, SW / 2, SY - ST, SY, -SD / 2, SD / 2);
    const foot = 0.02;
    for (const s of [-1, 1]) {
      const x = s * sx, xf = s * (sx + 0.012);
      // front leg (splayed forward) bending into the seat rail; ends inside the rear post
      tube("steel", [[xf, foot, 0.205], [x, ry, 0.15], [x, ry, -0.15]], r, [1, 0, 0], { bend: 0.04 });
      // rear leg (splayed back) running on up as the back post
      tube("steel", [[xf, foot, -0.235], [x, ry, -0.16], [x, 0.79, -0.2]], r, [1, 0, 0], { bend: 0.05 });
      for (const [z, rr] of [[0.205, 0.014], [-0.235, 0.014]]) tube("rubber", [[xf, 0, z], [xf, foot + 0.004, z]], rr, [1, 0, 0], { sides: 6 });
    }
    for (const z of [0.15, -0.16]) tube("steel", [[-sx, ry, z], [sx, ry, z]], 0.009, [0, 1, 0]);
    // backrest: a bowed panel in front of the posts, concave toward the pupil, leaning with them
    const n = 6, BW = 0.36, by0 = 0.66, by1 = 0.8, th = 0.014, bow = 0.022;
    const zAt = (y) => -0.16 - ((y - ry) / (0.79 - ry)) * 0.04 + r + 0.002; // front of the post at height y
    // one loft: a column of 4 corners (front-bottom, front-top, back-top, back-bottom) per x, no inner faces
    const col = (i) => {
      const x = -BW / 2 + (i / n) * BW, dz = -bow * (1 - (2 * x / BW) ** 2);
      return [[by0, 0], [by1, 0], [by1, -th], [by0, -th]].map(([y, f]) => [x, y, zAt(y) + dz + f]);
    };
    const cols = Array.from({ length: n + 1 }, (_, i) => col(i));
    const mid = (a, b) => mul(add(add(a[0], a[2]), add(b[0], b[2])), 0.25);
    for (let i = 0; i < n; i++)
      for (let k = 0; k < 4; k++) quad("wood", cols[i][k], cols[i][(k + 1) % 4], cols[i + 1][(k + 1) % 4], cols[i + 1][k], mid(cols[i], cols[i + 1]));
    for (const [C, D] of [[cols[0], cols[1]], [cols[n], cols[n - 1]]]) quad("wood", C[0], C[1], C[2], C[3], mid(C, D));
  }

  // ---------- placement: one set, or the grid ----------
  const place = (x, z, yaw, fn) => {
    const saved = M;
    M = saved.clone().multiply(new THREE.Matrix4().makeTranslation(x, 0, z)).multiply(new THREE.Matrix4().makeRotationY(yaw));
    fn();
    M = saved;
  };
  const set = () => {
    if (part !== "chair") place(0, 0, 0, desk);
    if (part === "chair") place(0, 0, 0, chair);
    else if (part === "set") {
      if (chairPulled) place(0.08, -0.62, 0.32, chair);
      else place(0, -0.3, 0, chair);
    }
  };
  const nAll = Math.max(1, Math.floor(count)), nRows = Math.max(1, Math.min(nAll, Math.floor(rows)));
  const nCols = Math.ceil(nAll / nRows), PX = 1.15, PZ = 1.05;
  for (let k = 0; k < nAll; k++) {
    const row = Math.floor(k / nCols), col = k % nCols;
    place((col - (nCols - 1) / 2) * PX, ((nRows - 1) / 2 - row) * PZ, 0, set);
  }
  // centre the footprint (set, piece or grid) on x = z = 0
  const lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (const { p } of Object.values(soups))
    for (let i = 0; i < p.length; i += 3)
      for (const [k, j] of [[0, 0], [1, 2]]) (lo[k] = Math.min(lo[k], p[i + j])), (hi[k] = Math.max(hi[k], p[i + j]));
  body.position.set((-(lo[0] + hi[0]) / 2) * body.scale.x, 0, (-(lo[1] + hi[1]) / 2) * body.scale.x);

  // ---------- meshes: one per material ----------
  const MAT = {
    wood: [c.wood, c.woodShade, 0.1, 3.5],
    edge: [c.edge, c.edgeShade, 0.1, 0],
    steel: [c.steel, c.steelShade, 0.35, 2.5],
    tray: [c.steel, c.steelShade, 0.1, 3],
    rubber: [c.rubber, c.rubberShade, 0.1, 2.5],
  };
  for (const [key, { p, n }] of Object.entries(soups)) {
    const [base, shade, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, base, shade, px ? { threshold, px: Math.max(1, px * ink) } : { threshold, outline: false });
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
