// mikoshi.js - a portable festival shrine on its carrying poles, resting on a pair of low wooden stands.
// Contract: harness/lab/README.md. Meters, +Y up, the shrine's front (doors, little torii) faces +Z, its left is +X,
// stands on y = 0 (the rests' feet), centred on x = 0, z = 0.
//
// Construction (three.js primitives and a few custom grids, transformed in place and merged per material; the lab
// sees ~9 meshes):
//   POLES    two long poles (nagabo) along Z under the base's left and right edges, two shorter cross poles (wakibo)
//            along X lying on them fore and aft; gold end caps on every pole end, red cord lashings where they cross
//            and where the base sits on them.
//   BASE     a plinth and a deck, both black with gold edge bands; a railing round the deck (black posts, gold top and
//            mid rails, gold onion finials on the corner posts) and a small gold torii in front of the doors.
//   BODY     a black box with gold corner posts, gold door frames, lattice and bosses on every face (thin gold quads
//            1 cm proud, no ink), a gold head beam; red cord swags across each face with a knot and a short tassel.
//   BRACKETS two widening bands under the eaves, the upper one studded with gold blocks (the masugumi rhythm).
//   ROOF     a square pyramid with a concave profile (steep at the top, flat at the eave: y = apex - H r (2 - r)) whose
//            eave lifts toward the corners (k |t|^3 r^4), a gold fascia band and a black soffit; gold hip ridges that
//            curl up at the corner tips (warabite); a gold stacked finial and the phoenix on it.
//   PHOENIX  a side-profile extrusion (head, beak, crest, neck, breast) and three tapered tail-plume ribbons swept up behind, and two
//            spread wings as front-view extrusions with scalloped feather tips, angled back 26 deg so the three-quarter
//            view reads them. All gold.
//   HANGERS  at each eave corner a gold bell and a big red tassel on a cord. They swing in the bounce clip by
//            rewriting their vertices about each corner pivot (two merged meshes, so the mesh count stays low).
//   RESTS    two low trestles (top beam, splayed legs, foot beams) under the long poles at z = +-1.0, outside the
//            carried group: they stay on the ground when the shrine heaves.
//   Winding: every custom grid is flipped from its own outward reference; three.js primitives come wound outward.
// Proportions (real size): poles 4.5 m long at x = +-0.50 (0.11 x 0.14), cross poles 2.0 m at z = +-1.45; rests
// 0.30 tall; shrine from y 0.44 (base bottom) to 2.30 (phoenix plume) = 1.86 m; base 1.2 m square, body 0.60 m
// square, eave 1.32 m square at y 1.44 (corner tips 1.56), roof apex 1.80, phoenix 0.40 tall, 0.55 m wingspan.
// Options: build(THREE, kit, colors, { height, rests }) - height scales uniformly (top of the rest pose, default
// meta.height 2.30 m with rests); rests: false drops the stands and lowers the shrine so the poles lie on y = 0.
// Clip (build() returns clips { bounce: 1.2 }; pose("bounce@0.3")): carried at shoulder height, two sharp heaves per
// loop (|sin|, the jolt at the bottom), a roll of +-4 deg that leans into each heave alternately, a small pitch; the
// hangers swing against the roll with a lag. The carried group never dips below 0.12 m of lift, so with or without
// the rests the lowest point stays >= 0.
// Colours (festival script): lacquer sky #24143a / hair #1a1020 (hair is lighter than ink #140c1c);
// gold moon #ffd7a1 / practical #ffb020 at threshold 0.55, so tops and the lit flank glint pale and everything else
// is amber; wood (poles, rests) iris #ffd0a1 / skin #f0c2ae; red cords and tassels accent #ff4d6d / sky #24143a at
// -0.35, so only faces turned well away go dark.

export const meta = {
  name: "mikoshi",
  height: 2.30,
  script: "festival",
  colors: {
    lacquer: "#24143a", lacquerShade: "#1a1020",
    gold: "#ffd7a1", goldShade: "#ffb020",
    wood: "#ffd0a1", woodShade: "#f0c2ae",
    red: "#ff4d6d", redShade: "#24143a",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const REST = 0.30; // top of the rests = bottom of the long poles
  const drop = opts.rests === false ? REST : 0;
  const { height = meta.height - drop, rests = true } = opts;
  const root = new THREE.Group();
  root.name = "mikoshi";
  const scaleG = new THREE.Group();
  scaleG.name = "scale";
  scaleG.scale.setScalar(height / (meta.height - drop));
  root.add(scaleG);
  // carried group: pivot at the poles' centre, so roll and pitch turn about the bearers' shoulders
  const PIV = REST + 0.07;
  const carry = new THREE.Group();
  carry.name = "carry";
  carry.position.y = PIV - drop;
  scaleG.add(carry);
  const body = new THREE.Group(); // content in absolute coordinates
  body.position.y = -PIV;
  carry.add(body);
  const joints = { carry };

  // ---------- soups: positions + normals per material ----------
  const soups = {};
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E3 = new THREE.Euler(), V = new THREE.Vector3(), Sc = new THREE.Vector3();
  function add(key, geo, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1], tag = -1) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!g.attributes.normal) g.computeVertexNormals();
    M4.compose(V.set(...pos), Q.setFromEuler(E3.set(...rot)), Sc.set(...scl));
    g.applyMatrix4(M4);
    const s = (soups[key] ??= { p: [], n: [], tag: [] });
    const P = g.attributes.position, N = g.attributes.normal;
    for (let i = 0; i < P.count; i++) {
      s.p.push(P.getX(i), P.getY(i), P.getZ(i));
      s.n.push(N.getX(i), N.getY(i), N.getZ(i));
      s.tag.push(tag);
    }
  }
  const box = (key, cx, cy, cz, sx, sy, sz, tag) => add(key, new THREE.BoxGeometry(sx, sy, sz), [cx, cy, cz], [0, 0, 0], [1, 1, 1], tag);
  const yb = (key, half, y0, y1, h2 = half) => box(key, 0, (y0 + y1) / 2, 0, 2 * half, y1 - y0, 2 * h2);
  const lathe = (key, pts, pos, seg = 12, tag) => add(key, new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), pos, [0, 0, 0], [1, 1, 1], tag);
  const tube = (key, pts, r, seg = 24, tag) => add(key, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, 6, false), [0, 0, 0], [0, 0, 0], [1, 1, 1], tag);
  const ball = (key, r, pos, tag) => add(key, new THREE.SphereGeometry(r, 10, 7), pos, [0, 0, 0], [1, 1, 1], tag);
  // an indexed grid f(i/nu, j/nv) -> [x,y,z], smooth normals, wound to face away from `ref`
  function grid(key, f, nu, nv, ref) {
    const pos = [], idx = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) pos.push(...f(i / nu, j / nv));
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < nu; i++) {
        const a = j * (nu + 1) + i, b = a + 1, d = a + nu + 1, e = d + 1;
        idx.push(a, b, e, a, e, d);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    // orientation from a middle quad
    const k = (Math.floor(nv / 2) * nu + Math.floor(nu / 2)) * 6;
    const A = new THREE.Vector3().fromArray(pos, idx[k] * 3), B = new THREE.Vector3().fromArray(pos, idx[k + 1] * 3), C = new THREE.Vector3().fromArray(pos, idx[k + 2] * 3);
    const n = B.clone().sub(A).cross(C.clone().sub(A));
    if (n.dot(A.clone().sub(new THREE.Vector3(...ref))) < 0) for (let t = 0; t < idx.length; t += 3) [idx[t + 1], idx[t + 2]] = [idx[t + 2], idx[t + 1]];
    g.setIndex(idx);
    g.computeVertexNormals();
    add(key, g);
  }

  // ---------- poles ----------
  const PX = 0.5, PL = 4.5, PW = 0.11, PH = 0.14, PY = REST + PH / 2;
  const XZ = 1.45, XL = 2.0, XW = 0.10, XH = 0.12, XY = REST + PH + XH / 2;
  for (const sx of [-1, 1]) {
    box("wood", sx * PX, PY, 0, PW, PH, PL);
    for (const sz of [-1, 1]) {
      box("gold", sx * PX, PY + 0.01, sz * (PL / 2 - 0.05), PW + 0.02, PH + 0.02, 0.12); // end caps
      for (const z of [0.6, 0.68]) add("red", new THREE.TorusGeometry(0.083, 0.013, 5, 14), [sx * PX, PY, sz * z], [0, 0, 0], [0.85, 0.72, 1]); // lashings
    }
  }
  for (const sz of [-1, 1]) {
    box("wood", 0, XY, sz * XZ, XL, XH, XW);
    for (const sx of [-1, 1]) {
      box("gold", sx * (XL / 2 - 0.05), XY, sz * XZ, 0.12, XH + 0.02, XW + 0.02);
      for (const x of [PX - 0.1, PX + 0.1]) add("red", new THREE.TorusGeometry(0.072, 0.012, 5, 14), [sx * x, XY, sz * XZ], [0, Math.PI / 2, 0]);
    }
  }

  // ---------- base, deck, railing, torii ----------
  const B0 = REST + PH; // 0.44
  yb("lacquer", 0.55, B0, 0.58);
  yb("gold", 0.56, B0, B0 + 0.025);
  yb("gold", 0.565, 0.555, 0.58);
  yb("lacquer", 0.60, 0.58, 0.63);
  yb("gold", 0.605, 0.595, 0.62);
  const RI = 0.565, RT = 0.80;
  for (let i = 0; i <= 4; i++) {
    const u = -RI + (i * 2 * RI) / 4;
    for (const [x, z] of [[u, RI], [u, -RI], [RI, u], [-RI, u]]) box("lacquer", x, (0.63 + RT) / 2, z, 0.035, RT - 0.63, 0.035);
  }
  for (const s of [-1, 1]) {
    for (const [y, t] of [[RT, 0.03], [0.70, 0.022]]) {
      box("gold", 0, y, s * RI, 2 * RI + 0.04, t, t + 0.01);
      box("gold", s * RI, y, 0, t + 0.01, t, 2 * RI + 0.04);
    }
    for (const t of [-1, 1]) lathe("gold", [[0, 0], [0.03, 0], [0.03, 0.02], [0.045, 0.05], [0.03, 0.085], [0.008, 0.11], [0, 0.12]], [s * RI, RT + 0.01, t * RI]);
  }
  // torii in front of the doors
  const TZ = 0.47;
  for (const s of [-1, 1]) {
    add("gold", new THREE.CylinderGeometry(0.016, 0.018, 0.27, 8), [s * 0.12, 0.63 + 0.135, TZ]);
    box("gold", s * 0.12, 0.645, TZ, 0.05, 0.03, 0.05);
  }
  box("gold", 0, 0.83, TZ, 0.30, 0.022, 0.025);
  add("gold", new THREE.BoxGeometry(0.40, 0.03, 0.045), [0, 0.905, TZ]);
  box("gold", 0, 0.88, TZ, 0.34, 0.02, 0.03);

  // ---------- body ----------
  const BH = 0.30, BY0 = 0.68, BY1 = 1.24;
  yb("lacquer", 0.38, 0.63, BY0);
  yb("gold", 0.385, 0.66, 0.675);
  yb("lacquer", BH, BY0, BY1);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box("gold", sx * (BH - 0.005), (BY0 + BY1) / 2, sz * (BH - 0.005), 0.045, BY1 - BY0, 0.045);
  yb("gold", BH + 0.012, 1.19, BY1);
  // doors on every face: frame band, two leaves of lattice, bosses (flat gold quads, no ink)
  const faces = [
    (u, y, o) => [u, y, BH + o], (u, y, o) => [-u, y, -BH - o],
    (u, y, o) => [BH + o, y, -u], (u, y, o) => [-BH - o, y, u],
  ];
  const rot = [[0, 0, 0], [0, Math.PI, 0], [0, Math.PI / 2, 0], [0, -Math.PI / 2, 0]];
  const flat = (f, r, u, y, o, w, h) => add("goldLine", new THREE.PlaneGeometry(w, h), f(u, y, o), r);
  faces.forEach((f, k) => {
    const r = rot[k], y0 = 0.73, y1 = 1.16, w = 0.21, yc = (y0 + y1) / 2, hh = y1 - y0;
    for (const s of [-1, 1]) flat(f, r, s * w, yc, 0.004, 0.03, hh);
    flat(f, r, 0, y0, 0.004, 2 * w + 0.03, 0.03);
    flat(f, r, 0, y1, 0.004, 2 * w + 0.03, 0.03);
    flat(f, r, 0, yc, 0.006, 0.022, hh);
    for (const s of [-1, 1]) {
      for (let i = 1; i <= 2; i++) flat(f, r, s * (w * i) / 3, yc + 0.06, 0.008, 0.012, hh * 0.5);
      for (let j = 0; j < 3; j++) flat(f, r, s * w / 2, yc + 0.0 + j * 0.06, 0.008, w, 0.012);
      flat(f, r, s * w / 2, y0 + 0.07, 0.008, w * 0.6, 0.06);
      add("goldBoss", new THREE.CircleGeometry(0.022, 12), f(s * 0.035, yc - 0.03, 0.011), r);
    }
  });
  // red cord swags across each face, knot and short tassel at mid
  for (let k = 0; k < 4; k++) {
    const f = faces[k];
    const pts = [];
    for (let i = 0; i <= 8; i++) { const u = -BH + (i / 8) * 2 * BH, sag = 0.16 * (1 - (u / BH) ** 2); pts.push(f(u, 1.17 - sag, 0.03)); }
    tube("red", pts, 0.012, 20);
    ball("red", 0.026, f(0, 1.0, 0.035));
    lathe("red", [[0, -0.16], [0.032, -0.155], [0.028, -0.06], [0.014, -0.02], [0.012, 0], [0, 0.005]], f(0, 0.985, 0.035), 10);
  }

  // ---------- brackets ----------
  yb("lacquer", 0.36, BY1, 1.29);
  yb("gold", 0.365, 1.275, 1.29);
  yb("lacquer", 0.44, 1.29, 1.37);
  for (const s of [-1, 1])
    for (let i = 0; i < 7; i++) {
      const u = -0.36 + i * 0.12;
      box("gold", u, 1.33, s * 0.445, 0.05, 0.05, 0.02);
      box("gold", s * 0.445, 1.33, u, 0.02, 0.05, 0.05);
    }

  // ---------- roof ----------
  const S = 0.66, E = 1.44, AP = 1.80, H = AP - E, K = 0.12, TH = 0.05, R0 = 0.08;
  const lift = (t, r) => K * Math.abs(t) ** 3 * r ** 4;
  const yR = (t, r) => AP - H * r * (2 - r) + lift(t, r);
  const sideMap = [
    (a, b) => [a, b], (a, b) => [-a, -b], (a, b) => [b, -a], (a, b) => [-b, a],
  ]; // (along, out) -> (x, z) for the four sides: +Z, -Z, +X, -X
  for (const m of sideMap) {
    // top: r from R0 to 1, t across the side (the side's points sit on the square ring of half-size S r)
    grid("lacquer", (i, j) => {
      const r = R0 + (1 - R0) * j, t = 2 * i - 1, [x, z] = m(t * S * r, S * r);
      return [x, yR(t, r), z];
    }, 16, 10, [0, -5, 0]);
    // gold fascia band at the eave
    grid("gold", (i, j) => {
      const t = 2 * i - 1, [x, z] = m(t * S, S);
      return [x, yR(t, 1) - TH * j, z];
    }, 16, 1, [0, E, 0]);
    // soffit, from the eave in to the brackets
    grid("lacquer", (i, j) => {
      const r = 1 - 0.36 * j, t = 2 * i - 1, [x, z] = m(t * S * r, S * r);
      return [x, yR(t, r) - TH, z];
    }, 16, 3, [0, 5, 0]);
  }
  // hip ridges with corner curls
  const curlPts = (sx, sz) => {
    const pts = [];
    for (let i = 0; i <= 8; i++) { const r = 0.12 + (0.86 * i) / 8; pts.push([sx * S * r, yR(1, r) + 0.025, sz * S * r]); }
    const tip = [sx * S * 1.03, yR(1, 1) + 0.03, sz * S * 1.03];
    pts.push(tip, [sx * S * 1.07, tip[1] + 0.05, sz * S * 1.07], [sx * S * 1.04, tip[1] + 0.09, sz * S * 1.04], [sx * S * 1.0, tip[1] + 0.07, sz * S * 1.0]);
    return pts;
  };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const pts = curlPts(sx, sz);
    tube("gold", pts, 0.018, 40);
    ball("gold", 0.02, pts[pts.length - 1]);
  }
  // finial stack
  lathe("gold", [[0, AP - 0.06], [0.11, AP - 0.06], [0.1, AP], [0.06, AP + 0.02], [0.075, AP + 0.05], [0.04, AP + 0.07], [0.035, AP + 0.09], [0.05, AP + 0.1], [0, AP + 0.11]], [0, 0, 0], 14);

  // ---------- phoenix ----------
  const PB = AP + 0.10; // feet on the finial
  const fin = new THREE.Object3D(); // marker for close-ups (--focus phoenix)
  fin.position.set(0, PB + 0.15, 0);
  body.add(fin);
  joints.phoenix = fin;
  const shape = (pts) => { const s = new THREE.Shape(); s.moveTo(...pts[0]); for (const p of pts.slice(1)) s.lineTo(...p); return s; };
  const extr = (pts, depth) => { const g = new THREE.ExtrudeGeometry(shape(pts), { depth, bevelEnabled: false, curveSegments: 4 }); g.translate(0, 0, -depth / 2); return g; };
  // side profile in (z, y) above PB: breast, neck and head forward (+z) with a crest; plumes are separate ribbons
  const prof = [
    [-0.02, 0.0], [0.03, 0.02], [0.07, 0.07], [0.08, 0.13], [0.075, 0.19], [0.09, 0.24], [0.115, 0.255], // breast, neck
    [0.16, 0.245], [0.12, 0.27], [0.1, 0.285], [0.065, 0.33], [0.075, 0.28], [0.06, 0.26], // beak, head, crest
    [0.045, 0.22], [0.04, 0.16], [0.0, 0.12], [-0.07, 0.11], [-0.09, 0.06], // nape, back, rump
  ];
  add("gold", extr(prof, 0.08), [0, PB, 0], [0, -Math.PI / 2, 0]);
  // tail plumes: tapered ribbons along a centreline (z, y), each its own extrusion so none self-intersects
  const ribbon = (pts, w0) => {
    const L = [], R = [];
    pts.forEach((p, i) => {
      const q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)];
      const dz = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dz, dy), w = w0 * (1 - (0.85 * i) / (pts.length - 1));
      L.push([p[0] - (dy / l) * w, p[1] + (dz / l) * w]);
      R.push([p[0] + (dy / l) * w, p[1] - (dz / l) * w]);
    });
    return [...L, ...R.reverse()];
  };
  const plumes = [
    [[-0.05, 0.09], [-0.12, 0.14], [-0.16, 0.22], [-0.15, 0.31], [-0.19, 0.38], [-0.24, 0.40]],
    [[-0.05, 0.08], [-0.14, 0.1], [-0.21, 0.16], [-0.24, 0.25], [-0.29, 0.29]],
    [[-0.05, 0.07], [-0.15, 0.06], [-0.23, 0.08], [-0.28, 0.14], [-0.33, 0.15]],
  ];
  plumes.forEach((pl, i) => add("gold", extr(ribbon(pl, 0.032), 0.03), [(i - 1) * 0.012, PB, 0], [0, -Math.PI / 2, 0]));
  // legs onto the finial
  for (const s of [-1, 1]) add("gold", new THREE.CylinderGeometry(0.009, 0.009, 0.05, 6), [s * 0.015, PB + 0.01, 0.0]);
  // wings: front view (x out, y up) from the shoulder, raised and spread, scalloped primaries on the trailing edge
  const wing = (s) => [
    [0, 0.0], [0.05, 0.06], [0.11, 0.12], [0.18, 0.18], [0.27, 0.24], [0.25, 0.2], [0.28, 0.185], [0.24, 0.15],
    [0.265, 0.125], [0.21, 0.1], [0.23, 0.07], [0.17, 0.055], [0.18, 0.025], [0.12, 0.02], [0.11, -0.01], [0.05, -0.02],
  ].map(([x, y]) => [s * x, y]);
  for (const s of [-1, 1]) add("gold", extr(wing(s), 0.03), [s * 0.02, PB + 0.11, -0.01], [0, s * 0.45, 0]);

  // ---------- hangers at the eave corners (they swing: tagged per corner) ----------
  const pivots = [];
  let ci = 0;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const p = [sx * S * 1.01, yR(1, 1) - 0.01, sz * S * 1.01];
    pivots.push(p);
    const at = (dy) => [p[0], p[1] + dy, p[2]];
    add("hangGold", new THREE.CylinderGeometry(0.005, 0.005, 0.06, 5), at(-0.03), [0, 0, 0], [1, 1, 1], ci);
    lathe("hangGold", [[0, -0.12], [0.05, -0.12], [0.048, -0.105], [0.04, -0.08], [0.036, -0.06], [0.02, -0.05], [0, -0.048]], at(0), 12, ci);
    lathe("hangRed", [[0, -0.42], [0.052, -0.415], [0.04, -0.3], [0.024, -0.2], [0.02, -0.175], [0.03, -0.16], [0.02, -0.135], [0.005, -0.12], [0, -0.12]], at(0), 12, ci);
    ci++;
  }

  // ---------- rests ----------
  const restG = new THREE.Group();
  restG.name = "rests";
  if (rests) {
    scaleG.add(restG);
    for (const sz of [-1, 1]) {
      const z = sz * 1.0;
      box("rest", 0, REST - 0.04, z, 1.5, 0.08, 0.11);
      for (const sx of [-1, 1]) {
        for (const s2 of [-1, 1]) add("rest", new THREE.BoxGeometry(0.06, 0.25, 0.06), [sx * 0.62, 0.135, z + s2 * 0.06], [-s2 * 0.38, 0, 0]);
        box("rest", sx * 0.62, 0.025, z, 0.08, 0.05, 0.36);
      }
    }
  }

  // ---------- meshes ----------
  const MAT = {
    lacquer: [c.lacquer, c.lacquerShade, 0.35, true],
    gold: [c.gold, c.goldShade, 0.55, true],
    goldLine: [c.goldShade, c.goldShade, 0.55, false],
    goldBoss: [c.gold, c.gold, 0.55, false],
    wood: [c.wood, c.woodShade, 0.2, true],
    red: [c.red, c.redShade, -0.35, true],
    hangGold: [c.gold, c.goldShade, 0.55, true],
    hangRed: [c.red, c.redShade, -0.35, true],
    rest: [c.wood, c.woodShade, 0.2, true],
  };
  const hang = [];
  for (const [key, s] of Object.entries(soups)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    const mesh = kit.toon(g, base, shade, { threshold, outline });
    mesh.name = key;
    (key === "rest" ? restG : body).add(mesh);
    if (key.startsWith("hang")) hang.push({ g, p0: Float32Array.from(s.p), n0: Float32Array.from(s.n), h0: g.attributes.hullNormal ? Float32Array.from(g.attributes.hullNormal.array) : null, tag: s.tag });
  }

  // ---------- poses and clips ----------
  // Signs: carry.rotation.z > 0 rolls the shrine's top toward -X (its right); rotation.x > 0 dips the front (+Z).
  // Hanger swing (sx about X, sz about Z) is relative to the shrine, so a free bell lags opposite the roll.
  const CLIPS = { bounce: 1.2 };
  const D2R = Math.PI / 180;
  const rq = new THREE.Quaternion(), rv = new THREE.Vector3();
  function swing(ax, az) {
    rq.setFromEuler(E3.set(ax * D2R, 0, az * D2R));
    for (const h of hang) {
      const P = h.g.attributes.position.array, N = h.g.attributes.normal.array, HN = h.g.attributes.hullNormal?.array;
      for (let i = 0; i < h.tag.length; i++) {
        const pv = pivots[h.tag[i]];
        rv.set(h.p0[3 * i] - pv[0], h.p0[3 * i + 1] - pv[1], h.p0[3 * i + 2] - pv[2]).applyQuaternion(rq);
        P[3 * i] = rv.x + pv[0]; P[3 * i + 1] = rv.y + pv[1]; P[3 * i + 2] = rv.z + pv[2];
        rv.fromArray(h.n0, 3 * i).applyQuaternion(rq).toArray(N, 3 * i);
        if (HN && h.h0) rv.fromArray(h.h0, 3 * i).applyQuaternion(rq).toArray(HN, 3 * i);
      }
      h.g.attributes.position.needsUpdate = true;
      h.g.attributes.normal.needsUpdate = true;
      if (HN) h.g.attributes.hullNormal.needsUpdate = true;
      h.g.computeBoundingBox();
      h.g.computeBoundingSphere();
    }
  }
  function apply({ lift = 0, roll = 0, pitch = 0, sx = 0, sz = 0 }) {
    carry.position.y = PIV - drop + lift;
    carry.rotation.set(pitch * D2R, 0, roll * D2R);
    swing(sx, sz);
    root.updateMatrixWorld(true);
  }
  function bounce(t) {
    const T = CLIPS.bounce, w = (2 * Math.PI) / T, ph = ((t % T) + T) % T;
    const heave = (x) => Math.abs(Math.sin(w * x)); // two humps a loop, a sharp jolt at the bottom
    const roll = (x) => 4 * Math.sin(w * x);
    const pitch = (x) => 1.5 * Math.sin(2 * w * x + 0.8);
    const lag = 0.18;
    return {
      lift: 0.12 + 0.16 * heave(ph), roll: roll(ph), pitch: pitch(ph),
      sz: -1.6 * roll(ph - lag), sx: -2.5 * pitch(ph - lag) - 6 * (heave(ph - lag) - 0.64),
    };
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`mikoshi: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      return apply(bounce(+m[2]));
    }
    if (name !== "rest") throw new Error(`mikoshi: unknown pose "${name}" (rest, or bounce@<seconds>)`);
    apply({});
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
