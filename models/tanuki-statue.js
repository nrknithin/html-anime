// tanuki-statue.js - a Shigaraki-ware tanuki: the glazed ceramic raccoon-dog that stands outside shops and restaurants, static.
// Contract: harness/lab/README.md. Meters, +Y up, faces +Z, its left is +X, feet on y = 0, centred on x = 0, z = 0.
//
// Not the animal (models/tanuki.js is the live raccoon dog): this is the folk statue, a jolly figure standing up on two
// stubby legs. What makes it read, in order: the straw kasa hat tipped back on the head; the huge round pale belly
// sticking out; the big round eyes (white, dark-rimmed) and the wide grin under a pale muzzle; the sake flask (tokkuri)
// hanging from the left hand on a cord; the ledger (a blank promissory note book) in the right; the bushy tail behind,
// resting on the ground like a third leg; one glossy dark-brown glaze over everything else.
//
// Construction: smooth closed solids only, the way the potter throws and joins them. Spheres and ellipsoids (body,
// belly, head, muzzle, eyes, hands, feet), lathes (hat, flask) and swept tubes (arms, legs, tail, grin, cord) whose
// radius closes to zero at both ends with a superellipse profile, so every end is capped and rounded. Each part is wound
// from its own signed volume (flipped if negative), never by hand, then all parts are merged per material: eight meshes, ~15k triangles.
// Eyes and grin sit on their parent's surface by an ellipsoid ray from its centre, sunk so only a cap shows.
// Proportions (base unit the full height H = 0.9 m, hat top): belly sphere r 0.22 H centred 0.34 H, its front 0.09 H past
// the body; head 0.37 H wide centred at 0.76 H; hat 0.65 H across, tipped back 16 deg; feet 0.2 H long; flask 0.21 H tall.
// Scaling: build(THREE, kit, colors, { height }) scales the whole figure uniformly (0.3 m figurine to a 2 m giant);
// or scale the film's placement group.
//
// Two-tone pairs (noon script, Paper noon), base / shade:
//   glaze  iris #5c3d32 / hair #241c16 at threshold -0.1, so only the far side drops to the near-black (as the house's
//          wood; noon has no brown between iris and ink)
//   pale   moon #fff6e4 / sky #f2d7ae: belly, muzzle, flask (the pale slip glaze)
//   straw  sky #f2d7ae / skin #f0c2ae: the kasa (warmer and darker than the belly, distinct from the glaze it overlaps)
//   white  practical #fffaf2 / sclera #f6f3ee: eye whites, ledger pages (blank)
//   dark   hair #241c16 / ink #2c261f: eye masks (drooping, the tanuki's bandit patches), rims, pupils, nose, grin, ledger
//          spine; glint practical flat; cord accent #c4452d / iris; rib iris flat (straw weave lines on the hat, the
//          ledger's blank title slip). The hat and the tan face plate are straw at threshold -1 (always lit), so the
//          kasa's underside stays one straw tone instead of going pink.

export const meta = {
  name: "tanuki-statue",
  height: 0.9,
  script: "noon",
  colors: {
    glaze: "#5c3d32", glazeShade: "#241c16",
    pale: "#fff6e4", paleShade: "#f2d7ae",
    straw: "#f2d7ae", strawShade: "#f0c2ae",
    white: "#fffaf2", whiteShade: "#f6f3ee",
    dark: "#241c16", darkShade: "#2c261f",
    glint: "#fffaf2",
    cord: "#c4452d", cordShade: "#5c3d32",
    rib: "#5c3d32",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height } = opts;
  const root = new THREE.Group();
  root.name = "tanuki-statue";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / meta.height);
  root.add(body);
  const joints = {};
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---------- parts, collected per material ----------
  const parts = {};
  // wind outward from the signed volume, then bake the transform and keep it for its material
  function add(key, g, m) {
    if (m) g.applyMatrix4(m);
    g = g.index ? g.toNonIndexed() : g;
    const p = g.attributes.position.array;
    let vol = 0;
    for (let i = 0; i < p.length; i += 9)
      vol += p[i] * (p[i + 4] * p[i + 8] - p[i + 5] * p[i + 7]) - p[i + 1] * (p[i + 3] * p[i + 8] - p[i + 5] * p[i + 6]) +
        p[i + 2] * (p[i + 3] * p[i + 7] - p[i + 4] * p[i + 6]);
    if (vol < 0) {
      const n = g.attributes.normal.array; // inside-out: normals came from the same winding, so they flip too
      for (let i = 0; i < n.length; i++) n[i] = -n[i];
      for (let i = 0; i < p.length; i += 9)
        for (let k = 0; k < 3; k++) {
          [p[i + 3 + k], p[i + 6 + k]] = [p[i + 6 + k], p[i + 3 + k]];
          [n[i + 3 + k], n[i + 6 + k]] = [n[i + 6 + k], n[i + 3 + k]];
        }
    }
    (parts[key] ??= []).push(g);
  }
  const M = (pos, rot = [0, 0, 0], scl = [1, 1, 1]) =>
    new THREE.Matrix4().compose(V(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), V(...scl));
  // ellipsoid at pos with radii r (and an optional rotation)
  const ball = (key, pos, r, rot, w = 20, h = 14) =>
    add(key, new THREE.SphereGeometry(1, w, h), M(pos, rot, Array.isArray(r) ? r : [r, r, r]));
  // a point on an axis-aligned ellipsoid surface along a direction, and its outward normal
  function surf(cen, rad, dir, out = 0) {
    const d = V(...dir).normalize();
    const t = 1 / Math.hypot(d.x / rad[0], d.y / rad[1], d.z / rad[2]);
    const p = V(cen[0] + d.x * t, cen[1] + d.y * t, cen[2] + d.z * t);
    const n = V((p.x - cen[0]) / rad[0] ** 2, (p.y - cen[1]) / rad[1] ** 2, (p.z - cen[2]) / rad[2] ** 2).normalize();
    return { p: p.addScaledVector(n, out), n };
  }
  // a disc-ish ellipsoid lying on a surface: r across, t thick along the normal, its centre sunk `sink` below the surface
  // (r may be [across, up] with a spin in radians about the normal)
  function decal(key, s, r, t, sink, spin = 0, w = 16, h = 10) {
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), s.n)
      .multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), spin));
    const pos = s.p.clone().addScaledVector(s.n, -sink);
    const [rx, ry] = Array.isArray(r) ? r : [r, r];
    add(key, new THREE.SphereGeometry(1, w, h), new THREE.Matrix4().compose(pos, q, V(rx, ry, t)));
  }
  // swept tube through points; the radius closes at both ends (superellipse power p: 2 round, higher = blunter)
  function tube(key, pts, R, { p = 3, n = 18, sides = 10, r0 = 1, r1 = 1 } = {}) {
    const curve = new THREE.CatmullRomCurve3(pts.map((q) => V(...q)));
    const fr = curve.computeFrenetFrames(n, false);
    const pos = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, e = Math.abs(2 * u - 1);
      const r = R * (r0 + (r1 - r0) * u) * Math.pow(Math.max(0, 1 - Math.pow(e, p)), 1 / p);
      const o = curve.getPointAt(u);
      for (let j = 0; j < sides; j++) {
        const a = (j / sides) * Math.PI * 2;
        const v = fr.normals[i].clone().multiplyScalar(Math.cos(a) * r).addScaledVector(fr.binormals[i], Math.sin(a) * r);
        pos.push(o.x + v.x, o.y + v.y, o.z + v.z);
      }
    }
    for (let i = 0; i < n; i++)
      for (let j = 0; j < sides; j++) {
        const a = i * sides + j, b = i * sides + ((j + 1) % sides), d = a + sides, e2 = b + sides;
        idx.push(a, b, e2, a, e2, d);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    add(key, g);
  }
  // smooth > 0 resamples the profile as a Catmull-Rom spline through its points
  const lathe = (key, prof, m, seg = 24, smooth = 0) => {
    let pts = prof.map(([r, y]) => new THREE.Vector2(r, y));
    if (smooth) pts = new THREE.SplineCurve(pts).getSpacedPoints(smooth).map((q) => new THREE.Vector2(Math.max(0, q.x), q.y));
    const g = new THREE.LatheGeometry(pts, seg);
    g.computeVertexNormals();
    add(key, g, m);
  };

  // ---------- body ----------
  const BODY = [0, 0.33, -0.03], BODYR = [0.215, 0.255, 0.2];
  ball("glaze", BODY, BODYR);
  const BELLY = [0, 0.3, 0.06], BELLYR = [0.2, 0.2, 0.2];
  ball("pale", BELLY, BELLYR, [0, 0, 0], 24, 18);
  // stubby legs and round feet, toes out
  for (const s of [1, -1]) {
    tube("glaze", [[0.09 * s, 0.2, -0.02], [0.105 * s, 0.11, 0.0], [0.11 * s, 0.05, 0.03]], 0.065, { p: 4 });
    ball("glaze", [0.115 * s, 0.04, 0.07], [0.065, 0.04, 0.09], [0, 0.25 * s, 0]);
  }
  // bushy tail: out of the lower back, down onto the ground behind
  tube("glaze", [[0, 0.22, -0.17], [0.02, 0.13, -0.27], [0.06, 0.075, -0.31], [0.11, 0.07, -0.29]], 0.075, { p: 2.5, r0: 0.8, r1: 1.0 });

  // ---------- arms, hands ----------
  const HANDL = [0.235, 0.35, 0.09], HANDR = [-0.25, 0.41, 0.14];
  tube("glaze", [[0.14, 0.55, -0.02], [0.215, 0.47, 0.02], [0.235, 0.38, 0.07]], 0.058, { p: 3, r1: 0.85 });
  ball("glaze", HANDL, [0.05, 0.048, 0.05]);
  tube("glaze", [[-0.14, 0.55, -0.02], [-0.225, 0.49, 0.04], [-0.25, 0.44, 0.11]], 0.058, { p: 3, r1: 0.85 });
  ball("glaze", HANDR, [0.05, 0.048, 0.05]);

  // ---------- sake flask (tokkuri) on a cord from the left hand ----------
  const FL = [0.265, 0.075, 0.1];
  lathe("pale", [[0, 0], [0.04, 0.003], [0.062, 0.03], [0.07, 0.065], [0.06, 0.1], [0.032, 0.13], [0.019, 0.15],
    [0.017, 0.19], [0.024, 0.205], [0.03, 0.212], [0.018, 0.216], [0, 0.216]], M(FL), 28, 40);
  // a glaze band at the shoulder, and the cord from the neck up into the fist
  lathe("glaze", [[0, 0.118], [0.052, 0.118], [0.05, 0.128], [0.042, 0.135], [0, 0.135]], M(FL), 20);
  tube("cord", [[FL[0] - 0.02, FL[1] + 0.175, FL[2]], [FL[0] - 0.006, FL[1] + 0.2, FL[2] + 0.02], [HANDL[0] - 0.005, HANDL[1] - 0.02, HANDL[2] + 0.005]], 0.008, { p: 8, n: 8, sides: 6 });
  tube("cord", [[FL[0] - 0.021, FL[1] + 0.175, FL[2] + 0.002], [FL[0], FL[1] + 0.172, FL[2] + 0.024], [FL[0] + 0.021, FL[1] + 0.175, FL[2] + 0.002]], 0.007, { p: 8, n: 8, sides: 6 });

  // ---------- ledger (a blank promissory-note book) in the right hand ----------
  const LG = M([-0.265, 0.33, 0.165], [0.05, 0.55, 0.08]);
  add("white", new THREE.BoxGeometry(0.13, 0.19, 0.03), LG);
  add("dark", new THREE.BoxGeometry(0.02, 0.194, 0.034), LG.clone().multiply(M([-0.06, 0, 0])));
  add("rib", new THREE.BoxGeometry(0.03, 0.11, 0.004), LG.clone().multiply(M([0.015, 0.02, 0.015]))); // a blank title slip

  // ---------- head ----------
  const HEAD = [0, 0.68, 0.0], HEADR = [0.165, 0.145, 0.15];
  ball("glaze", HEAD, HEADR, [0, 0, 0], 22, 16);
  // the tan face: a plate over the front of the head, eyes and muzzle on it
  decal("straw", surf(HEAD, HEADR, [0, -0.02, 1]), [0.14, 0.1], 0.05, 0.043);
  // pale muzzle and dark nose
  const MUZ = [0, 0.625, 0.12], MUZR = [0.08, 0.058, 0.075];
  ball("pale", MUZ, MUZR);
  ball("dark", [0, 0.652, 0.192], [0.026, 0.02, 0.02]);
  // the grin: a wide arc on the muzzle's lower front, lifting at the corners
  const grin = [];
  for (let i = 0; i <= 8; i++) {
    const a = -0.95 + (1.9 * i) / 8;
    grin.push(surf(MUZ, MUZR, [Math.sin(a), -0.55 + 0.35 * a * a, Math.cos(a)], -0.002).p.toArray());
  }
  tube("dark", grin, 0.009, { p: 6, n: 24, sides: 6 });
  // big round eyes: dark rim, white, pupil, glint
  for (const s of [1, -1]) {
    const dir = [0.42 * s, 0.32, 0.85];
    decal("dark", surf(HEAD, HEADR, [0.45 * s, 0.24, 0.85], 0.009), [0.07, 0.05], 0.02, 0.012, 0.45 * s); // the mask, drooping out
    decal("dark", surf(HEAD, HEADR, dir, 0.009), 0.05, 0.02, 0.006);
    decal("white", surf(HEAD, HEADR, dir, 0.009), 0.042, 0.02, 0.004);
    decal("dark", surf(HEAD, HEADR, [0.36 * s, 0.3, 0.88], 0.009), 0.022, 0.012, -0.007);
    decal("glint", surf(HEAD, HEADR, [0.33 * s + 0.03, 0.36, 0.88], 0.009), 0.008, 0.006, -0.012, 0, 8, 6);
  }

  // ---------- straw kasa, tipped back ----------
  const HAT = M([0, 0.805, -0.035], [-0.3, 0, 0]);
  const hatY = (r) => 0.095 * (1 - r / 0.29) ** 1.15; // the top surface: a shallow cone, a touch convex
  lathe("straw", [[0, 0.097], [0.04, hatY(0.04)], [0.1, hatY(0.1)], [0.17, hatY(0.17)], [0.24, hatY(0.24)], [0.29, 0],
    [0.292, -0.01], [0.28, -0.016], [0.14, 0.014], [0.06, 0.028], [0, 0.03]], HAT, 40);
  // woven straw: radial ribs and two rings, a hair line laid on the top surface
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2, pt = (r) => V(Math.cos(a) * r, hatY(r) + 0.003, Math.sin(a) * r).applyMatrix4(HAT).toArray();
    tube("rib", [pt(0.03), pt(0.14), pt(0.282)], 0.0035, { p: 8, n: 6, sides: 4 });
  }
  for (const r of [0.12, 0.22]) {
    const ring = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      ring.push(V(Math.cos(a) * r, hatY(r) + 0.003, Math.sin(a) * r).applyMatrix4(HAT).toArray());
    }
    tube("rib", ring, 0.0035, { p: 40, n: 64, sides: 4 });
  }

  // ---------- merge per material ----------
  const MAT = {
    glaze: [c.glaze, c.glazeShade, -0.1, 4],
    pale: [c.pale, c.paleShade, 0.0, 4],
    straw: [c.straw, c.strawShade, -1, 4],
    rib: [c.rib, c.rib, -1, 0],
    white: [c.white, c.whiteShade, -0.3, 3],
    dark: [c.dark, c.darkShade, 0.1, 0],
    glint: [c.glint, c.glint, -1, 0],
    cord: [c.cord, c.cordShade, 0.1, 0],
  };
  for (const [key, list] of Object.entries(parts)) {
    let count = 0;
    for (const g of list) count += g.attributes.position.count;
    const P = new Float32Array(count * 3), N = new Float32Array(count * 3);
    let o = 0;
    for (const g of list) {
      P.set(g.attributes.position.array, o);
      N.set(g.attributes.normal.array, o);
      o += g.attributes.position.array.length;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(P, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
    const [base, shade, threshold, px] = MAT[key];
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
