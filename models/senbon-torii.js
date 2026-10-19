// senbon-torii.js - a Fushimi-Inari-style tunnel of closely spaced vermilion torii up a stone path, static.
// Contract: harness/lab/README.md. Meters, +Y up, the entrance faces +Z (you walk in along -Z, uphill), its left is +X,
// stands on y = 0 (the entrance ground), centred on x = 0, z = 0 (the bbox of the set).
//
// Construction (everything a triangle soup merged per material: 8 meshes for the whole set, so a film draws it cheaply):
//   PATH     a centreline s = 0..L (s = 0 at the entrance), x = -2.6 * curve * (s / L)^2 (a gentle bend to the -X side),
//            ground g(s) = a steady rise plus three low steps. The bed is a closed loft per flight (split at each step so
//            every step edge is a silhouette and gets ink): a raised earth bank from y = 0 to g(s), its sides in shade.
//            Paving: one slab per 0.6 m row, a closed box laid on the bed with 3 cm joints, so the hull inks each joint.
//            The entrance is a wider forecourt flight with the two foxes.
//   TORII    simplified myojin gates (Fushimi's senbon type: no centre strut, no plaque): two 8-sided round pillars on
//            black lacquer feet (kamaki), a straight nuki through both that sticks out, a vermilion shimaki and a black
//            kasagi above it, both short lofts (the torii model's beam()) with a small upward sweep (sori) at the tips.
//            Each gate is built in its own frame (faces +Z, on its own ground) and turned to the path tangent.
//   KITSUNE  a pair of small seated stone foxes on pedestals either side of the forecourt, turned a little toward the
//            path: haunch, upright chest, front legs, head with a pointed snout and two tall ears, the tail raised behind,
//            and a red bib (yodarekake) as a flattened cone around the neck.
//   Primitive parts come from three.js geometry (their winding is right by construction); lofts and slabs wind each
//   triangle away from a point inside the solid, never by hand.
// Proportions (real size, base unit the gate height H = 2.6 m at the kasagi tips): pillars at x +-0.8 (0.18 thick,
// 1.8 m across their outer faces, 1.42 clear), kamaki 0-0.36; nuki 1.84-1.96, reach +-1.0; shimaki 2.2-2.34, reach
// +-1.08; kasagi 2.34-2.52 at the centre, tips 2.6, reach +-1.2 (bottom) / +-1.28 (top). 40 gates 0.45 m apart (centre
// to centre: 0.27 m gaps between pillars, so they close into a tunnel at any angle off the axis). Path 20.6 m: forecourt
// 0-1.9 (4.4 wide), first gate at s = 2.4; bed 2.6 wide, slabs 1.3; rise 0.03 per m plus three 0.15 steps (1.07 m
// total). Foxes 0.71 tall on 0.55 pedestals at s = 0.9, x = +-1.55.
// Options: build(THREE, kit, colors, { height, count, curve }).
//   height  gate height in m (default 2.6); gates scale uniformly, the path keeps its width and pitch.
//   count   number of gates (default 40); the path is as long as the tunnel needs (2.55 + 0.45 * count m).
//   curve   bend factor (default 1: the far end 2.6 m off to -X, away from the lit side, so hero and three4 look down the
//           curve; 0 straight, negative bends to +X).
// Colours (noon, the torii's set): vermilion accent #c4452d / iris #5c3d32 at threshold 0.1, as the torii; lacquer
// (kamaki, kasagi) iris / hair #241c16, kamaki at 0.75 (black), kasagi at 0.55 (an iris sheen on the swept top). Paving
// slabs moon #fff6e4 / sky #f2d7ae; the earth bed skin #f0c2ae / iris at 0.67, so its top is lit and both sides are
// the dark bank under the pale path; pedestals sky / skin; foxes practical #fffaf2 / sclera #f6f3ee (pale stone, its
// shade distinct from the pedestal's sky); bibs vermilion. Gate ink is thinner (3 px) so forty gates stay red.

export const meta = {
  name: "senbon-torii",
  height: 3.65,
  script: "noon",
  colors: {
    vermilion: "#c4452d", vermilionShade: "#5c3d32",
    lacquer: "#5c3d32", lacquerShade: "#241c16",
    slab: "#fff6e4", slabShade: "#f2d7ae",
    bed: "#f0c2ae", bedShade: "#5c3d32",
    pedestal: "#f2d7ae", pedestalShade: "#f0c2ae",
    fox: "#fffaf2", foxShade: "#f6f3ee",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = 2.6, count = 40, curve = 1 } = opts;
  const N = Math.max(1, Math.floor(count));
  const k = height / 2.6;
  const root = new THREE.Group();
  root.name = "senbon-torii";
  const set = new THREE.Group(); // the centring offset lives here, so root stays the plain contract node
  set.name = "set";
  root.add(set);
  const joints = {};

  // ---------- soups ----------
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  // a three.js geometry, transformed by m, into the soup
  function add(key, geom, m) {
    const g = (geom.index ? geom.toNonIndexed() : geom).clone();
    if (m) g.applyMatrix4(m);
    const s = S(key), P = g.attributes.position, Nn = g.attributes.normal;
    for (let i = 0; i < P.count; i++) {
      s.p.push(P.getX(i), P.getY(i), P.getZ(i));
      s.n.push(Nn.getX(i), Nn.getY(i), Nn.getZ(i));
    }
  }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  // one flat triangle wound away from ref (a point inside the solid)
  function tri(key, a, b, e, ref) {
    const nv = cross(sub(b, a), sub(e, a));
    const l = Math.hypot(...nv);
    if (l < 1e-9) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    const flip = dot(nv, sub(m, ref)) < 0;
    const s = S(key);
    s.p.push(...a, ...(flip ? e : b), ...(flip ? b : e));
    const f = flip ? -1 / l : 1 / l;
    for (let i = 0; i < 3; i++) s.n.push(nv[0] * f, nv[1] * f, nv[2] * f);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  // a loft of 4-corner rings (each ring one cross-section), closed at both ends
  function loft(key, rings) {
    const ctr = (R) => [0, 1, 2].map((i) => R.reduce((t, q) => t + q[i], 0) / 4);
    for (let i = 0; i < rings.length - 1; i++) {
      const A = rings[i], B = rings[i + 1], ca = ctr(A), cb = ctr(B);
      const ref = [(ca[0] + cb[0]) / 2, (ca[1] + cb[1]) / 2, (ca[2] + cb[2]) / 2];
      for (let j = 0; j < 4; j++) quad(key, A[j], A[(j + 1) % 4], B[(j + 1) % 4], B[j], ref);
    }
    for (const [R, O] of [[rings[0], rings[1]], [rings[rings.length - 1], rings[rings.length - 2]]]) {
      const cr = ctr(R), co = ctr(O);
      const ref = [0, 1, 2].map((i) => cr[i] * 0.9 + co[i] * 0.1);
      quad(key, R[0], R[1], R[2], R[3], ref);
    }
  }

  // ---------- path: centreline, ground, frames ----------
  const S0 = 2.4, GAP = 0.45; // first gate, gate spacing
  const L = S0 + GAP * (N - 1) + 0.6;
  const BEND = -2.6 * curve; // bends away from the lit +X side, so the hero and three4 views look along the far gates
  const STEP = 0.15, RISE = 0.03;
  const steps = [1.9, S0 + GAP * (Math.round(N / 3) - 0.5), S0 + GAP * (Math.round((2 * N) / 3) - 0.5)].filter((s, i) => i === 0 || (s > S0 && s < L - 0.5));
  const g = (s) => RISE * s + STEP * steps.filter((t) => s >= t).length;
  const cx = (s) => BEND * (s / L) ** 2;
  const dcx = (s) => (2 * BEND * s) / (L * L);
  const zc = (s) => -s; // walking in along -Z
  // the frame at s: origin on the centreline at height y, right = the path's +X-ish side unit vector
  const frame = (s) => {
    const tx = dcx(s), tz = -1, l = Math.hypot(tx, tz);
    return { o: [cx(s), zc(s)], side: [-tz / l, tx / l], yaw: Math.atan2(-tx, 1) }; // side = tangent x up, toward +X
  };
  const at = (s, u, y) => { const f = frame(s); return [f.o[0] + f.side[0] * u, y, f.o[1] + f.side[1] * u]; };

  // bed: one closed loft per flight, from y = 0 to g(s); flights split at the steps
  const cuts = [0, ...steps, L];
  for (let f = 0; f < cuts.length - 1; f++) {
    const a = cuts[f], b = cuts[f + 1], hw = f === 0 ? 2.2 : 1.3;
    const n = Math.max(1, Math.ceil((b - a) / 0.5)), rings = [];
    for (let i = 0; i <= n; i++) {
      const s = a + ((b - a) * i) / n, y = RISE * s + STEP * f;
      rings.push([at(s, -hw, 0), at(s, -hw, y + 0.0001), at(s, hw, y + 0.0001), at(s, hw, 0)]);
    }
    loft("bed", rings);
    // paving: rows of slabs inside this flight
    const rows = Math.max(1, Math.round((b - a) / 0.6)), ds = (b - a) / rows;
    for (let r = 0; r < rows; r++) {
      const s0 = a + r * ds + 0.015, s1 = a + (r + 1) * ds - 0.015;
      const sw = f === 0 ? 0.9 : 0.65, y0 = (s) => RISE * s + STEP * f;
      const top = 0.05, bot = f === 0 ? 0 : -0.02;
      loft("slab", [
        [at(s0, -sw, y0(s0) + bot), at(s0, -sw, y0(s0) + top), at(s0, sw, y0(s0) + top), at(s0, sw, y0(s0) + bot)],
        [at(s1, -sw, y0(s1) + bot), at(s1, -sw, y0(s1) + top), at(s1, sw, y0(s1) + top), at(s1, sw, y0(s1) + bot)],
      ]);
    }
  }

  // ---------- torii ----------
  // beam(): the torii model's loft along x, reach [bottom, top] half-lengths, y0/y1 bottom and top, depth d
  function beam({ reach: [rb, rt], y0, y1, d, n = 3 }) {
    const zf = d / 2, zb = -d / 2, rings = [];
    for (let i = -n; i <= n; i++) {
      const u = i / n, xb = u * rb, xt = u * rt;
      rings.push([[xb, y0(xb), zb], [xb, y0(xb), zf], [xt, y1(xt), zf], [xt, y1(xt), zb]]);
    }
    const out = [];
    const push = (a, b, e) => {
      const nv = cross(sub(b, a), sub(e, a));
      const mx = (a[0] + b[0] + e[0]) / 3, my = (a[1] + b[1] + e[1]) / 3, mz = (a[2] + b[2] + e[2]) / 3;
      const rx = mx * 0.95, ry = (y0(rx) + y1(rx)) / 2;
      const flip = nv[0] * (mx - rx) + nv[1] * (my - ry) + nv[2] * mz < 0;
      out.push(...a, ...(flip ? e : b), ...(flip ? b : e));
    };
    for (let i = 0; i < rings.length - 1; i++) {
      const A = rings[i], B = rings[i + 1];
      for (let j = 0; j < 4; j++) { const j2 = (j + 1) % 4; push(A[j], A[j2], B[j]); push(A[j2], B[j2], B[j]); }
    }
    for (const R of [rings[0], rings[rings.length - 1]]) { push(R[0], R[1], R[2]); push(R[0], R[2], R[3]); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
    geo.computeVertexNormals();
    return geo;
  }
  const PX = 0.8, PR = 0.1, SEG = 8;
  const sori = (x) => 0.08 * Math.min(1, Math.abs(x) / 1.28) ** 2.2;
  const G = {
    pillar: new THREE.CylinderGeometry(PR * 0.95, PR, 2.3, SEG).translate(0, 1.15, 0),
    kamaki: new THREE.CylinderGeometry(PR + 0.018, PR + 0.022, 0.36, SEG).translate(0, 0.18, 0),
    nuki: new THREE.BoxGeometry(2.0, 0.12, 0.1).translate(0, 1.9, 0),
    shimaki: beam({ reach: [1.08, 1.08], y0: (x) => 2.2 + sori(x), y1: (x) => 2.35 + sori(x), d: 0.15 }),
    kasagi: beam({ reach: [1.2, 1.28], y0: (x) => 2.34 + sori(x), y1: (x) => 2.52 + sori(x), d: 0.2 }),
  };
  const M = new THREE.Matrix4(), Mp = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < N; i++) {
    const s = S0 + GAP * i, f = frame(s);
    q.setFromAxisAngle(Y, f.yaw);
    M.compose(new THREE.Vector3(f.o[0], g(s), f.o[1]), q, new THREE.Vector3(k, k, k));
    for (const sx of [-1, 1]) {
      Mp.makeTranslation(sx * PX, 0, 0).premultiply(M);
      add("red", G.pillar, Mp);
      add("foot", G.kamaki, Mp);
    }
    add("red", G.nuki, M);
    add("red", G.shimaki, M);
    add("kasagi", G.kasagi, M);
  }

  // ---------- kitsune on pedestals ----------
  const geoS = new THREE.SphereGeometry(1, 10, 8);
  const T = (x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) =>
    new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), new THREE.Vector3(sx, sy, sz));
  const fox = [
    ["fox", geoS, T(0, 0.13, -0.03, 0.14, 0.13, 0.17)], // haunch
    ["fox", geoS, T(0, 0.29, 0.03, 0.1, 0.19, 0.1, -0.15)], // chest
    ["fox", new THREE.CylinderGeometry(0.026, 0.032, 0.3, 6), T(0.05, 0.15, 0.09)], // front legs
    ["fox", new THREE.CylinderGeometry(0.026, 0.032, 0.3, 6), T(-0.05, 0.15, 0.09)],
    ["fox", geoS, T(0, 0.5, 0.06, 0.08, 0.075, 0.085)], // head
    ["fox", new THREE.ConeGeometry(0.042, 0.13, 8), T(0, 0.48, 0.17, 1, 1, 1, Math.PI / 2)], // snout
    ["fox", new THREE.ConeGeometry(0.03, 0.12, 6), T(0.045, 0.6, 0.04, 1, 1, 0.6, 0, -0.25)], // ears
    ["fox", new THREE.ConeGeometry(0.03, 0.12, 6), T(-0.045, 0.6, 0.04, 1, 1, 0.6, 0, 0.25)],
    ["fox", geoS, T(0, 0.33, -0.18, 0.065, 0.22, 0.07, -0.4)], // tail, raised behind
    ["bib", new THREE.ConeGeometry(0.15, 0.16, 10), T(0, 0.37, 0.06, 1, 1, 0.85, 0.3)], // red bib round the neck
  ];
  const PH = 0.55, FS = 1.15; // pedestal height, fox scale
  for (const sx of [-1, 1]) {
    const s = 0.9, p = at(s, sx * 1.55, 0);
    const base = new THREE.Matrix4().compose(new THREE.Vector3(p[0], g(s), p[2]), new THREE.Quaternion().setFromAxisAngle(Y, frame(s).yaw - sx * 0.35), new THREE.Vector3(1, 1, 1));
    add("pedestal", new THREE.BoxGeometry(0.44, PH - 0.06, 0.5).translate(0, (PH - 0.06) / 2, 0), base);
    add("pedestal", new THREE.BoxGeometry(0.52, 0.06, 0.58).translate(0, PH - 0.03, 0), base);
    const top = new THREE.Matrix4().makeScale(FS, FS, FS).premultiply(new THREE.Matrix4().makeTranslation(0, PH, 0)).premultiply(base);
    for (const [key, geo, m] of fox) add(key, geo, m.clone().premultiply(top));
    const mark = new THREE.Object3D(); // a marker at the fox's seat, for framing (no geometry hangs off it)
    mark.name = sx > 0 ? "foxL" : "foxR";
    mark.applyMatrix4(top);
    set.add(mark);
    joints[mark.name] = mark;
  }

  // ---------- meshes ----------
  const MAT = {
    red: [c.vermilion, c.vermilionShade, 0.1, 3],
    foot: [c.lacquer, c.lacquerShade, 0.75, 3],
    kasagi: [c.lacquer, c.lacquerShade, 0.55, 3],
    bib: [c.vermilion, c.vermilionShade, 0.1, 4],
    slab: [c.slab, c.slabShade, 0.1, 3],
    bed: [c.bed, c.bedShade, 0.67, 4],
    pedestal: [c.pedestal, c.pedestalShade, 0.1, 4],
    fox: [c.fox, c.foxShade, 0.1, 4],
  };
  const box = new THREE.Box3();
  for (const [key, { p, n }] of Object.entries(soups)) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    geo.computeBoundingBox();
    box.union(geo.boundingBox);
    const [base, shade, threshold, px] = MAT[key];
    const mesh = kit.toon(geo, base, shade, { threshold, px });
    mesh.name = key;
    set.add(mesh);
  }
  set.position.set(-(box.min.x + box.max.x) / 2, 0, -(box.min.z + box.max.z) / 2);

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
