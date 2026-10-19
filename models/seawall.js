// seawall.js - a stretch of Japanese seaside sea wall (teibo) with beach steps and a heap of tetrapods, static.
// Contract: harness/lab/README.md. Meters, +Y up, the SEA side faces +Z, the wall runs along X (its left is +X),
// stands on y = 0 (the beach), centred on x = 0, z = 0 (the bbox; the walkway lies on the -Z side).
//
// Construction (convex hexahedra and lathed tetrapod legs, all triangle soups merged per material, so the whole
// set is four meshes, five with the sea; boxes are flat-shaded, tetrapod legs carry sphere/cone normals):
//   WALL     one battered prism (sea face leans back 0.2 : 1, so it catches the light), a coping lip 12 cm proud
//            along the sea edge (its vertical face is the shade band that draws the top edge), a low footing at
//            the toe, and a low parapet along the land edge of the walkway. Dark expansion joints every 4 m and a
//            row of weep holes on the sea face (flat inked-colour quads 1 cm proud: the hull draws silhouettes only).
//   STEPS    a flight straight down the sea face to the beach near the +X end (the camera side of three4 and
//            hero), one closed solid with a sawtooth profile (step boxes z-fight on their shared side planes), so
//            the treads read lit and the risers (square to +Z) shade: the stair stripes; the +X side shows the
//            sawtooth. A sloped cheek wall on the heap side. Rise follows the height option, tread 0.32.
//   TETRAPODS four legs from one centre along the tetrahedral directions (one up, three down at 109.5 deg). Each
//            leg is a sphere-cone: a hub sphere (R 0.36) at the centre, a tangent cone, a tip sphere (r 0.20) at
//            0.95 m, so the four hubs blend into one rounded knot. Placement is a literal, deterministic heap
//            between the -X end and the steps: row A against the toe and row B in front, standing on three legs
//            (one up), neighbours turned 60 deg so legs fall into each other's gaps; row C rides in the hollows
//            between A and B at assorted angles from a sine hash (no Math.random). Feet of rows A and B on y = 0.
//   SEA      (sea: true) a flat slab 0.14 m deep, 7 m out from the toe, with a few flat foam rings, unlit and uninked,
//            around tetrapod feet and out on the water.
//   Every closed part is wound away from a point inside it (box centre, ring axis point), never by hand.
// Proportions (real size; base unit the sea-side height H = 2.5 m): length 16 (option), walkway 1.5 wide at H,
// sea face 0.5 batter, coping 0.12 x 0.25, footing 0.3 x 0.3, parapet 0.25 thick x 0.55 tall (top 3.05 = 1.22 H);
// steps 2.0 wide, rise H / 10 (0.25), tread 0.32; tetrapods ~2 m across the feet, 1.67 m tall standing, 1.75 apart.
// Options: build(THREE, kit, colors, { height, length, tetrapods, sea })
//   height     the sea-side wall height (default 2.5); the parapet stays 0.55 above it, steps re-divide. Not a scale.
//   length     wall length along X (default 16); the step flight stays 2.6 m from the +X end, the heap fills the rest.
//   tetrapods  how many (default 16, 0 for none), taken row A, then B, then C.
//   sea        true adds the sea slab and foam (default false).
// Colours (meadow: the summer-seaside script, and the only one with a blue): concrete wall and steps moon #f7f3e1
// / sky #d7ecef, sun-bleached concrete whose shade goes cool and blue as summer shadows do; tetrapods sclera
// #f6f3ee / skin #f0c2ae, the same pale concrete with a warm shade, so a shaded leg never melts into the cool wall
// shade or the sea; joints and weep holes ink #1c261b flat; sea sky / sky (meadow has one blue, the pale sky, so
// the water is one flat tone and the ink draws its edge); foam moon flat. noon has no blue at all.

export const meta = {
  name: "seawall",
  height: 3.05,
  script: "meadow",
  colors: {
    concrete: "#f7f3e1", concreteShade: "#d7ecef",
    tetrapod: "#f6f3ee", tetrapodShade: "#f0c2ae",
    joint: "#1c261b", jointShade: "#1c261b",
    sea: "#d7ecef", seaShade: "#d7ecef",
    foam: "#f7f3e1", foamShade: "#f7f3e1",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height: H = 2.5, length: LEN = 16, tetrapods: COUNT = 16, sea = false } = opts;
  const root = new THREE.Group();
  root.name = "seawall";
  const body = new THREE.Group(); // shifted so the set's bbox is centred on x = 0, z = 0
  body.name = "body";
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
  // one triangle wound away from `ref`; per-vertex normals, or the face normal
  function tri(key, a, b, e, ref, na, nb, ne) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-10) return;
    const flip = dot(n, sub(mul(add(add(a, b), e), 1 / 3), ref)) < 0;
    n = nrm(flip ? mul(n, -1) : n);
    const [B, NB, E, NE] = flip ? [e, ne, b, nb] : [b, nb, e, ne];
    const s = S(key);
    for (const [q, nq] of [[a, na ?? n], [B, NB ?? n], [E, NE ?? n]]) s.p.push(...q), s.n.push(...nq);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  const box = (key, x0, x1, y0, y1, z0, z1) =>
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  // a prism along X from a convex cross-section [[z, y], ...] (counter-clockwise or not: wound from its centre)
  function prism(key, x0, x1, sec) {
    const zc = sec.reduce((s, q) => s + q[0], 0) / sec.length, yc = sec.reduce((s, q) => s + q[1], 0) / sec.length;
    const ref = [(x0 + x1) / 2, yc, zc];
    const P = (x, q) => [x, q[1], q[0]];
    for (let i = 0; i < sec.length; i++) {
      const a = sec[i], b = sec[(i + 1) % sec.length];
      quad(key, P(x0, a), P(x0, b), P(x1, b), P(x1, a), ref);
      tri(key, P(x0, [zc, yc]), P(x0, a), P(x0, b), ref);
      tri(key, P(x1, [zc, yc]), P(x1, a), P(x1, b), ref);
    }
  }

  // ---------- the wall ----------
  const X0 = -LEN / 2, X1 = LEN / 2;
  const ZS = 0.75, ZL = -0.75; // sea and land edges of the walkway
  const BAT = 0.2 * H; // sea face batter
  const zFace = (y) => ZS + BAT * (1 - y / H); // the sea face at height y
  const PAR = 0.55; // parapet height above the walkway
  prism("concrete", X0, X1, [[ZL, 0], [ZS + BAT, 0], [ZS, H], [ZL, H]]);
  box("concrete", X0, X1, H - 0.25, H, ZS - 0.1, ZS + 0.12); // coping lip
  box("concrete", X0, X1, 0, 0.3, ZS + BAT - 0.1, ZS + BAT + 0.3); // footing at the toe
  box("concrete", X0, X1, H - 0.02, H + PAR, ZL, ZL + 0.25); // parapet
  // expansion joints: a dark band down the sea face, over the coping, the walkway and the parapet
  const faceQuad = (key, x, w, y0, y1, o) => { // a flat strip on the battered face, o metres proud
    const n = nrm([0, BAT / H, 1]);
    const at = (xx, y) => add([xx, y, zFace(y)], mul(n, o));
    quad(key, at(x - w / 2, y0), at(x + w / 2, y0), at(x + w / 2, y1), at(x - w / 2, y1), add([x, (y0 + y1) / 2, zFace((y0 + y1) / 2)], mul(n, -1)));
  };
  const SX = X1 - 2.6; // step flight centre
  for (let x = X0 + 4; x < X1 - 0.5; x += 4) {
    if (Math.abs(x - SX) < 1.4) continue;
    faceQuad("joint", x, 0.05, 0.31, H - 0.26, 0.012);
    quad("joint", [x - 0.025, H - 0.25, ZS + 0.132], [x + 0.025, H - 0.25, ZS + 0.132], [x + 0.025, H, ZS + 0.132], [x - 0.025, H, ZS + 0.132], [x, H - 0.1, 0]);
    quad("joint", [x - 0.025, H + 0.008, ZL + 0.25], [x + 0.025, H + 0.008, ZL + 0.25], [x + 0.025, H + 0.008, ZS + 0.12], [x - 0.025, H + 0.008, ZS + 0.12], [x, 0, 0]);
    quad("joint", [x - 0.025, H, ZL + 0.26], [x + 0.025, H, ZL + 0.26], [x + 0.025, H + PAR + 0.01, ZL + 0.26], [x - 0.025, H + PAR + 0.01, ZL + 0.26], [x, H, ZL]);
  }
  // weep holes: small dark squares at 0.7 m, every 2 m between the joints
  for (let x = X0 + 2; x < X1 - 0.5; x += 4) if (Math.abs(x - SX) > 1.5) faceQuad("joint", x, 0.16, 0.62, 0.78, 0.012);

  // ---------- the steps ----------
  const NSTEP = Math.max(3, Math.round(H / 0.25));
  const RISE = H / NSTEP, TREAD = 0.32, SW = 2.0;
  // one closed solid with a sawtooth profile (separate step boxes z-fight on their shared side planes)
  {
    const xa = SX - SW / 2, xb = SX + SW / 2, zb = ZS - 0.1;
    const zs = [zb], ys = [H]; // zs[i] the nosing of step i, ys[i] its tread height (i >= 1)
    for (let i = 1; i < NSTEP; i++) zs.push(ZS + 0.12 + i * TREAD), ys.push(H - i * RISE);
    const n = NSTEP - 1, Q = (x, z, y) => [x, y, z];
    const face = (z0, y0, z1, y1, ref) => quad("concrete", Q(xa, z0, y0), Q(xb, z0, y0), Q(xb, z1, y1), Q(xa, z1, y1), ref);
    for (let i = 1; i <= n; i++) {
      const zm = (zs[i - 1] + zs[i]) / 2;
      face(zs[i - 1], ys[i], zs[i], ys[i], [SX, ys[i] - 0.05, zm]); // tread
      face(zs[i], ys[i], zs[i], i < n ? ys[i + 1] : 0, [SX, ys[i] / 2, zs[i] - 0.05]); // riser
      face(zs[i - 1], 0, zs[i], 0, [SX, 0.05, zm]); // bottom
      for (const x of [xa, xb]) // the side: one rectangle per column, no overlaps
        quad("concrete", Q(x, zs[i - 1], 0), Q(x, zs[i], 0), Q(x, zs[i], ys[i]), Q(x, zs[i - 1], ys[i]), [SX, ys[i] / 2, zm]);
    }
    face(zb, 0, zb, ys[1], [SX, ys[1] / 2, zb + 0.05]); // back, inside the wall
  }
  const ZOUT = ZS + 0.12 + (NSTEP - 1) * TREAD; // nosing of the lowest step
  for (const s of [-1]) { // cheek walls: a sloped coping beside the flight, 0.25 above the nosings
    const x0 = SX + s * (SW / 2) + (s > 0 ? 0 : -0.25), x1 = x0 + 0.25;
    hex("concrete", [
      [x0, 0, zFace(H) - 0.1], [x1, 0, zFace(H) - 0.1], [x1, 0, ZOUT], [x0, 0, ZOUT],
      [x0, H + 0.12, zFace(H) - 0.1], [x1, H + 0.12, zFace(H) - 0.1], [x1, RISE + 0.25, ZOUT], [x0, RISE + 0.25, ZOUT],
    ]);
  }

  // ---------- tetrapods ----------
  const LEG = 0.95, R0 = 0.36, R1 = 0.2, SIDES = 10;
  // sphere-cone leg along +Y from the origin: hub sphere R0 at 0, tip sphere R1 at LEG, tangent cone between
  const alpha = Math.acos((R0 - R1) / LEG); // polar angle of the tangent circle on both spheres
  const profile = []; // [axial y, radius, normal angle from +axis]
  for (let k = 0; k <= 3; k++) { const t = Math.PI - (k / 3) * (Math.PI - alpha); profile.push([R0 * Math.cos(t), R0 * Math.sin(t), t]); }
  for (let k = 0; k <= 4; k++) { const t = alpha - (k / 4) * alpha; profile.push([LEG + R1 * Math.cos(t), R1 * Math.sin(t), t]); }
  const legRings = profile.map(([y, r, t]) =>
    Array.from({ length: SIDES }, (_, j) => {
      const a = (j / SIDES) * Math.PI * 2;
      return { p: [r * Math.cos(a), y, r * Math.sin(a)], n: [Math.sin(t) * Math.cos(a), Math.cos(t), Math.sin(t) * Math.sin(a)], ref: [0, y, 0] };
    }));
  const DIRS = [[0, 1, 0], ...[0, 1, 2].map((k) => [Math.sqrt(8) / 3 * Math.cos(k * 2.0944), -1 / 3, Math.sqrt(8) / 3 * Math.sin(k * 2.0944)])];
  const v3 = new THREE.Vector3(), q3 = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
  function tetrapod(pos, euler) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...euler)), new THREE.Vector3(1, 1, 1));
    for (const d of DIRS) {
      const L = new THREE.Matrix4().makeRotationFromQuaternion(q3.setFromUnitVectors(Y, new THREE.Vector3(...d))).premultiply(m);
      const P = (q) => v3.set(...q).applyMatrix4(L).toArray();
      const N = (q) => v3.set(...q).transformDirection(L).toArray();
      const rings = legRings.map((ring) => ring.map((u) => ({ p: P(u.p), n: N(u.n), ref: P(u.ref) })));
      for (let i = 0; i + 1 < rings.length; i++)
        for (let j = 0; j < SIDES; j++) {
          const a = rings[i][j], b = rings[i][(j + 1) % SIDES], e = rings[i + 1][(j + 1) % SIDES], f = rings[i + 1][j];
          const ref = mul(add(a.ref, f.ref), 0.5);
          tri("tetrapod", a.p, b.p, e.p, ref, a.n, b.n, e.n);
          tri("tetrapod", a.p, e.p, f.p, ref, a.n, e.n, f.n);
        }
    }
  }
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const STAND = (LEG) / 3 + R1; // centre height when standing on three feet
  const HX0 = X0 + 2.4, HX1 = SX - SW / 2 - 1.4; // heap extent along X
  const ZA = ZS + BAT + 0.3 + 1.0, ZB = ZA + 1.55;
  const slots = [];
  for (let x = HX1, k = 0; x > HX0 - 0.01; x -= 1.75, k++) slots.push({ row: 0, p: [x, STAND, ZA], e: [0, (k % 2) * Math.PI / 3 + 0.2, 0] });
  for (let x = HX1 - 0.875, k = 0; x > HX0 - 0.5; x -= 1.75, k++) slots.push({ row: 1, p: [x, STAND, ZB], e: [0, (k % 2) * Math.PI / 3 + 0.7, 0] });
  for (let x = HX1 - 0.875, k = 0; x > HX0; x -= 1.75, k++) {
    const h = hash(k + 1);
    slots.push({ row: 2, p: [x + (h - 0.5) * 0.3, STAND + 1.05 + 0.1 * h, (ZA + ZB) / 2 - 0.2], e: [0.5 + 1.6 * h, 2.1 * hash(k + 9), 0.4 * (hash(k + 17) - 0.5)] });
  }
  slots.sort((a, b) => a.row - b.row);
  slots.slice(0, Math.max(0, COUNT)).forEach((s) => tetrapod(s.p, s.e));

  // ---------- the sea ----------
  if (sea) {
    const ZW = ZS + BAT + 0.3, ZE = ZW + 7, SY = 0.14;
    box("sea", X0, X1, 0, SY, ZW, ZE);
    // foam: flat rings just above the water, around the front feet and out on the swell
    const ring = (x, z, r, w) => {
      const n = 14, y = SY + 0.012;
      for (let j = 0; j < n; j++) {
        const a = (j / n) * Math.PI * 2, b = ((j + 1) / n) * Math.PI * 2;
        const P = (t, rr) => [x + rr * Math.cos(t), y, z + rr * Math.sin(t) * 0.8];
        quad("foam", P(a, r), P(b, r), P(b, r + w), P(a, r + w), [x, y - 1, z]);
      }
    };
    const front = slots.filter((s) => s.row === 1).slice(0, Math.max(0, COUNT - slots.filter((s) => s.row === 0).length));
    front.slice(0, 3).forEach((s, k) => ring(s.p[0] + 0.3, s.p[2] + 0.75, 0.55 + 0.2 * k, 0.12));
    [[X0 + 3, ZE - 2.5, 0.9], [SX - 1.0, ZW + 5.6, 0.7], [X0 + 7.5, ZE - 1.3, 0.6], [SX + 1.5, ZOUT + 0.9, 0.5]].forEach(([x, z, r]) => ring(x, z, r, 0.1));
  }

  // ---------- meshes, one per material ----------
  const MAT = {
    concrete: [c.concrete, c.concreteShade, { threshold: 0.35, px: 4 }],
    tetrapod: [c.tetrapod, c.tetrapodShade, { threshold: 0.3, px: 4 }],
    joint: [c.joint, c.jointShade, { outline: false }],
    sea: [c.sea, c.seaShade, { threshold: 0.35, px: 3 }],
    foam: [c.foam, c.foamShade, { outline: false }],
  };
  for (const [key, s] of Object.entries(soups)) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    const [base, shade, o] = MAT[key];
    const mesh = kit.toon(g, base, shade, o);
    mesh.name = key;
    body.add(mesh);
  }
  const bb = new THREE.Box3().setFromObject(body);
  body.position.set(-(bb.min.x + bb.max.x) / 2, 0, -(bb.min.z + bb.max.z) / 2);

  function pose() { root.updateMatrixWorld(true); }
  pose("rest");
  return { root, joints, pose };
}
