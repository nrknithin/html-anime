// jizo.js - a roadside Jizo: a small stone monk with a red knitted cap and a red bib on a two-tier plinth, static;
// one statue, a row of up to six, optionally under a small wooden hokora shelter.
// Contract: harness/lab/README.md. Meters, +Y up, the statue faces +Z, its left is +X, stands on y = 0, centred on
// x = 0, z = 0 (the bbox of the row, or of the shelter).
//
// Construction (lathes, spheres, capsules and boxes, merged per material across every statue, so a six-statue row
// under its shelter is eleven meshes; every closed lathe is oriented from its signed volume, every soup triangle is
// wound away from a point inside its solid, never by hand):
//   PLINTH  two flat-shaded stone boxes, the upper tier narrower (the classic stepped dai-ishi).
//   BODY    one closed lathe with an elliptical cross-section (z 0.82): a robe that flares a little at the hem, rounded
//           shoulders and a short neck buried in the head. Lathe poles get axis normals (no shade speck on a crown).
//   HEAD    a smooth, slightly tall ellipsoid (the shaven head), long earlobes as small ellipsoids at the sides.
//           Face: closed eyes as two gentle downward arcs and a small smile, flat ribbons 2 mm off the head surface,
//           projected onto the ellipsoid (dark line material, no hull).
//   CAP     a closed lathe shell (outer 1 cm off the head, inner just inside it) from the crown down to a folded cuff
//           above the eyes: the red knitted cap. Cuff ribs as short dark-red ribbons.
//   BIB     the yodarekake: a closed slab (two layers 8 mm apart, edges joined) laid 4 mm off the robe's front and
//           flaring to 2 cm off it at the hem (cloth hanging over the arms), from under the chin to a U hem; wraps
//           ~190 deg around the chest; normals averaged per position so it shades as cloth. A dark tie line on top.
//   HANDS   two poses by statue index. "gassho": sleeves as capsules from the shoulders to the elbows to the wrists,
//           palms pressed together as one pointed lathe in front of the belly, just under the bib (so the bib is never
//           covered), a dark line between them.
//           "staff": the right hand grips a shakujo (wooden shaft, iron ring head) at the side, the left cups a jewel.
//   HOKORA  (shelter) four square posts, a back wall of planks, a front lintel, a gabled roof (two slabs with a ridge
//           board), all wood.
// Proportions (real size, base unit the figure height F = 0.483 m on a 0.20 m plinth, total 0.683 m):
//   plinth tiers 0.38 x 0.11 x 0.31 and 0.30 x 0.09 x 0.25; robe 0.325 tall, hem radius 0.12 (0.5 F wide);
//   head 0.16 wide x 0.172 tall (0.36 F, chibi-like, as roadside jizo are), cap crown 1.2 cm above it.
// Options: build(THREE, kit, colors, { height, count, shelter }).
//   height   scales everything uniformly so statue 0 tops out at `height` (default 0.683; the shelter roof and a
//            staff stand taller).
//   count    1-6 statues side by side, 0.44 m apart; each has its own deterministic size (0.88-1.0), turn and pose
//            from literal tables (statue 0 is the full-size gassho one, so count 1 is the hero).
//   shelter  a wooden hokora over the row (posts, back wall, gabled roof; 1.21 m to the ridge board).
// Budget: ~2.5k triangles a statue (3.3k with a staff), ~0.4k the shelter; six under a shelter 17.5k in 11 meshes.
// Colours (noon): stone figure sclera #f6f3ee / sky #f2d7ae (pale grey worked stone, beige shade); plinth sky
// #f2d7ae / skin #f0c2ae (one step darker, so the figure separates from its base); cap and bib accent #c4452d /
// iris #5c3d32 at threshold 0.05 (stays red facing the camera); carved lines hair #241c16 flat; jewel moon #fff6e4 /
// sky; staff and shelter wood iris #5c3d32 / hair #241c16 (roof at threshold 0.25); staff rings and plank joints hair flat. Stone at threshold 0.1 so the
// camera-facing robe stays lit (front dot 0.30).

export const meta = {
  name: "jizo",
  height: 0.683,
  script: "noon",
  colors: {
    stone: "#f6f3ee", stoneShade: "#f2d7ae",
    plinth: "#f2d7ae", plinthShade: "#f0c2ae",
    red: "#c4452d", redShade: "#5c3d32",
    line: "#241c16",
    jewel: "#fff6e4", jewelShade: "#f2d7ae",
    wood: "#5c3d32", woodShade: "#241c16",
  },
  poses: ["rest"],
};

// per-statue variation (index 0 is the hero): figure scale, turn about Y (rad), pose
const VARY = [
  [1.0, 0.0, "gassho"],
  [0.92, 0.1, "staff"],
  [0.95, -0.08, "gassho"],
  [0.88, 0.06, "gassho"],
  [0.97, -0.05, "staff"],
  [0.9, 0.12, "gassho"],
];
const NATURAL = 0.683;
const PITCH = 0.44; // statue spacing in the row

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = NATURAL, shelter = false } = opts;
  const count = Math.max(1, Math.min(6, Math.round(opts.count ?? 1)));
  const root = new THREE.Group();
  root.name = "jizo";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / NATURAL);
  root.add(body);
  const joints = {};

  // ---------- accumulators: per material, non-indexed positions + normals ----------
  const acc = {};
  const A = (key) => (acc[key] ??= { p: [], n: [] });
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // a three.js geometry, oriented outward by its signed volume, placed by matrix m
  function signedVolume(g) {
    const p = g.attributes.position, a = V(0, 0, 0), b = V(0, 0, 0), e = V(0, 0, 0);
    let vol = 0;
    for (let i = 0; i < p.count; i += 3) {
      a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); e.fromBufferAttribute(p, i + 2);
      vol += a.dot(b.cross(e));
    }
    return vol;
  }
  function geom(key, g, m) {
    g = g.index ? g.toNonIndexed() : g;
    const p = g.attributes.position;
    if (signedVolume(g) < 0) { // inside out: swap two corners of every triangle (flat normals after)
      for (let i = 0; i < p.count; i += 3) {
        const x = [p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)];
        p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
        p.setXYZ(i + 2, ...x);
      }
      g.deleteAttribute("normal");
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(m);
    const s = A(key), n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      s.p.push(p.getX(i), p.getY(i), p.getZ(i));
      s.n.push(n.getX(i), n.getY(i), n.getZ(i));
    }
  }
  // one flat triangle wound away from ref (a point inside its solid)
  function tri(key, a, b, e, ref) {
    const u = V(...b).sub(V(...a)), w = V(...e).sub(V(...a));
    const n = u.clone().cross(w);
    if (n.length() < 1e-10) return;
    const mid = V(...a).add(V(...b)).add(V(...e)).multiplyScalar(1 / 3);
    const flip = n.dot(mid.sub(V(...ref))) < 0;
    if (flip) n.negate();
    n.normalize();
    const s = A(key);
    for (const q of flip ? [a, e, b] : [a, b, e]) (s.p.push(...q), s.n.push(n.x, n.y, n.z));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function box(key, m, cx, cy, cz, sx, sy, sz) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    geom(key, g, m.clone().multiply(new THREE.Matrix4().makeTranslation(cx, cy, cz)));
  }
  // closed lathe from [r, y] points (start and end on the axis), optional elliptical z scale
  function lathe(key, m, pts, seg, sz = 1) {
    const make = (q) => new THREE.LatheGeometry(q.map(([r, y]) => new THREE.Vector2(r, y)), seg).toNonIndexed();
    let g = make(pts);
    if (signedVolume(g) < 0) g = make([...pts].reverse()); // the lathe's own normals follow its winding
    // poles: the lathe gives axis points a sideways normal (a shade speck on a crown); point them along the axis
    const p = g.attributes.position, n = g.attributes.normal, my = pts.reduce((s, q) => s + q[1], 0) / pts.length;
    for (let i = 0; i < p.count; i++)
      if (Math.hypot(p.getX(i), p.getZ(i)) < 1e-6) n.setXYZ(i, 0, p.getY(i) > my ? 1 : -1, 0);
    geom(key, g, m.clone().multiply(new THREE.Matrix4().makeScale(1, 1, sz)));
  }
  function ellipsoid(key, m, x, y, z, rx, ry, rz, seg = 14) {
    const g = new THREE.SphereGeometry(1, seg, Math.max(6, seg >> 1));
    geom(key, g, m.clone().multiply(new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion(), V(rx, ry, rz))));
  }
  // capsule from a to b
  function capsule(key, m, a, b, r, seg = 8) {
    const d = b.clone().sub(a), L = d.length();
    const g = new THREE.CapsuleGeometry(r, L, 3, seg);
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize());
    geom(key, g, m.clone().multiply(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, V(1, 1, 1))));
  }
  const apply = (m, v) => v.clone().applyMatrix4(m).toArray();

  // ---------- one statue (local: plinth on y = 0, figure base at y = PL) ----------
  const PL = 0.2; // plinth height
  const RZ = 0.82; // robe cross-section depth / width
  // robe profile [r, y] above the figure base, bottom to top
  const ROBE = [[0, 0], [0.114, 0], [0.12, 0.025], [0.121, 0.09], [0.116, 0.17], [0.106, 0.235], [0.09, 0.275],
    [0.064, 0.3], [0.04, 0.315], [0, 0.325]];
  const robeR = (y) => {
    for (let i = 1; i < ROBE.length - 1; i++) {
      const [r0, y0] = ROBE[i], [r1, y1] = ROBE[i + 1];
      if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0 || 1);
    }
    return 0;
  };
  const robeP = (th, y, off = 0) => { // a point on the robe at angle th (0 = +Z front), pushed `off` along its normal
    const r = robeR(y), p = V(r * Math.sin(th), y, r * RZ * Math.cos(th));
    const e = 1e-3;
    const pt = V(robeR(y) * Math.sin(th + e), y, robeR(y) * RZ * Math.cos(th + e)).sub(p);
    const py = V(robeR(y + e) * Math.sin(th), y + e, robeR(y + e) * RZ * Math.cos(th)).sub(p);
    return p.add(pt.cross(py).normalize().multiplyScalar(off));
  };
  const HC = 0.385, HX = 0.08, HY = 0.086, HZ = 0.078; // head centre (above figure base) and radii
  const headP = (x, y, off) => { // the front of the head at (x, y), pushed off along the ellipsoid normal
    const zz = HZ * Math.sqrt(Math.max(0, 1 - (x / HX) ** 2 - ((y - HC) / HY) ** 2));
    const n = V(x / (HX * HX), (y - HC) / (HY * HY), zz / (HZ * HZ)).normalize();
    return V(x, y, zz).add(n.multiplyScalar(off));
  };
  // a flat ribbon through points on the head front, w wide (vertical), facing out
  function headRibbon(key, m, pts, w, off = 0.002) {
    const ref = apply(m, V(0, HC, 0));
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      quad(key, apply(m, headP(x0, y0 - w / 2, off)), apply(m, headP(x1, y1 - w / 2, off)),
        apply(m, headP(x1, y1 + w / 2, off)), apply(m, headP(x0, y0 + w / 2, off)), ref);
    }
  }

  function statue(m, pose) {
    // plinth
    box("plinth", m, 0, 0.055, 0, 0.38, 0.11, 0.31);
    box("plinth", m, 0, 0.155, 0, 0.3, 0.09, 0.25);
    const f = m.clone().multiply(new THREE.Matrix4().makeTranslation(0, PL, 0)); // figure frame
    // robe and hem ring
    lathe("stone", f, ROBE, 20, RZ);
    // head, earlobes
    ellipsoid("stone", f, 0, HC, 0, HX, HY, HZ, 18);
    for (const s of [-1, 1]) ellipsoid("stone", f, s * 0.078, HC - 0.016, -0.004, 0.013, 0.032, 0.018, 8);
    // face: closed eyes (gentle downward arcs) and a small smile
    for (const s of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= 6; i++) {
        const t = i / 3 - 1;
        pts.push([s * 0.03 + t * 0.016, HC - 0.008 - 0.005 * (1 - t * t)]);
      }
      headRibbon("line", f, pts, 0.0055);
    }
    const mouth = [];
    for (let i = 0; i <= 4; i++) { const t = i / 2 - 1; mouth.push([t * 0.012, HC - 0.05 - 0.003 * (1 - t * t)]); }
    headRibbon("line", f, mouth, 0.004);
    // cap: closed shell from the crown to a folded cuff above the eyes
    const capPts = [];
    const ring = (phi, off) => [(HX + off) * Math.sin(phi), HC + (HY + off) * Math.cos(phi)];
    capPts.push([0, HC + HY + 0.012]);
    for (const deg of [15, 30, 45, 58]) capPts.push(ring((deg * Math.PI) / 180, 0.011));
    capPts.push(ring((60 * Math.PI) / 180, 0.02), ring((66 * Math.PI) / 180, 0.022), ring((72 * Math.PI) / 180, 0.02));
    capPts.push(ring((73 * Math.PI) / 180, -0.004));
    for (const deg of [55, 35, 15]) capPts.push(ring((deg * Math.PI) / 180, -0.004));
    capPts.push([0, HC + HY - 0.004]);
    // lathe wants bottom-to-top-ish order of a closed loop; orientation is fixed from the signed volume
    lathe("red", f, capPts.reverse(), 24, HZ / HX);
    // cuff ribs: short vertical dark-red lines on the front of the cuff
    for (let k = -4; k <= 4; k++) {
      const th = k * 0.22, ph0 = (61 * Math.PI) / 180, ph1 = (71 * Math.PI) / 180, o = 0.0235, w = 0.0025;
      const P = (ph, dth) => {
        const r = (HX + o) * Math.sin(ph);
        return apply(f, V(r * Math.sin(th + dth), HC + (HY + o) * Math.cos(ph), r * (HZ / HX) * Math.cos(th + dth)));
      };
      const dw = w / ((HX + o) * 0.9);
      quad("redLine", P(ph0, -dw), P(ph0, dw), P(ph1, dw), P(ph1, -dw), apply(f, V(0, HC, 0)));
    }
    // bib: closed slab off the robe front, from under the chin to a U hem
    const T0 = 1.65, NU = 18, NV = 6, g0 = 0.004, g1 = 0.012, flare = 0.016;
    const yTop = 0.296, yBot = (th) => 0.165 + 0.105 * (th / T0) ** 2;
    const BP = (i, j, off) => {
      const th = -T0 + (2 * T0 * i) / NU, y = yTop + ((yBot(th) - yTop) * j) / NV;
      return robeP(th, y, off + (flare * j) / NV);
    };
    for (let i = 0; i < NU; i++)
      for (let j = 0; j < NV; j++) {
        const ref = apply(f, BP(i + 0.5, j + 0.5, (g0 + g1) / 2));
        for (const off of [g0, g1])
          quad("bib", apply(f, BP(i, j, off)), apply(f, BP(i + 1, j, off)), apply(f, BP(i + 1, j + 1, off)), apply(f, BP(i, j + 1, off)), ref);
      }
    const rim = (i, j, i2, j2) => {
      const ref = apply(f, BP((i + i2) / 2, (j + j2) / 2, (g0 + g1) / 2));
      quad("bib", apply(f, BP(i, j, g0)), apply(f, BP(i2, j2, g0)), apply(f, BP(i2, j2, g1)), apply(f, BP(i, j, g1)), ref);
    };
    for (let i = 0; i < NU; i++) (rim(i, 0, i + 1, 0), rim(i, NV, i + 1, NV));
    for (let j = 0; j < NV; j++) (rim(0, j, 0, j + 1), rim(NU, j, NU, j + 1));
    // a thin dark tie line along the bib's top
    for (let i = 0; i < NU; i++) {
      const P = (ii, dy, off) => { const th = -T0 + (2 * T0 * ii) / NU; return apply(f, robeP(th, yTop - dy, off)); };
      quad("redLine", P(i, 0.002, g1 + 0.001), P(i + 1, 0.002, g1 + 0.001), P(i + 1, 0.009, g1 + 0.001), P(i, 0.009, g1 + 0.001),
        apply(f, V(0, yTop, 0)));
    }
    // arms and hands
    const sh = (s) => V(s * 0.09, 0.26, -0.005);
    if (pose === "gassho") {
      for (const s of [-1, 1]) {
        const el = V(s * 0.124, 0.085, 0.025), wr = V(s * 0.024, 0.09, 0.122);
        capsule("stone", f, sh(s), el, 0.033);
        capsule("stone", f, el, wr, 0.031);
      }
      // pressed palms, tilted a little forward, with a line between them
      const pm = f.clone().multiply(new THREE.Matrix4().compose(V(0, 0.118, 0.136),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.15, 0, 0)), V(1, 1, 1)));
      lathe("stone", pm, [[0, -0.035], [0.02, -0.03], [0.024, -0.005], [0.018, 0.022], [0.007, 0.038], [0, 0.044]], 12, 0.75);
      const L = (y, x) => apply(pm, V(x, y, 0.0185 * Math.sqrt(Math.max(0, 1 - (y / 0.045) ** 2)) + 0.0012));
      quad("line", L(-0.026, -0.0016), L(-0.026, 0.0016), L(0.03, 0.0016), L(0.03, -0.0016), apply(pm, V(0, 0, 0)));
    } else {
      // right (-X) hand grips the staff at the side, left cups a jewel in front
      const elR = V(-0.124, 0.16, 0.04), wrR = V(-0.142, 0.195, 0.088);
      capsule("stone", f, sh(-1), elR, 0.033);
      capsule("stone", f, elR, wrR, 0.031);
      ellipsoid("stone", f, -0.144, 0.205, 0.093, 0.026, 0.03, 0.026, 10); // fist
      const elL = V(0.12, 0.15, 0.035), wrL = V(0.03, 0.17, 0.115);
      capsule("stone", f, sh(1), elL, 0.033);
      capsule("stone", f, elL, wrL, 0.031);
      ellipsoid("stone", f, 0.012, 0.17, 0.125, 0.03, 0.014, 0.024, 10); // cupped palm
      lathe("jewel", f.clone().multiply(new THREE.Matrix4().makeTranslation(0.012, 0.178, 0.128)),
        [[0, 0], [0.016, 0.006], [0.02, 0.018], [0.014, 0.032], [0.005, 0.042], [0, 0.048]], 12);
      // shakujo: wooden shaft from the plinth top past the head, an iron ring head
      const sx = -0.144, sz = 0.093;
      capsule("wood", f, V(sx, 0.0, sz), V(sx, 0.54, sz), 0.0085, 6);
      const tor = new THREE.TorusGeometry(0.032, 0.0055, 6, 16);
      geom("iron", tor, f.clone().multiply(new THREE.Matrix4().makeTranslation(sx, 0.58, sz)));
      for (const s of [-1, 1]) {
        const t2 = new THREE.TorusGeometry(0.011, 0.003, 5, 10);
        geom("iron", t2, f.clone().multiply(new THREE.Matrix4().makeTranslation(sx + s * 0.03, 0.555, sz)));
      }
      ellipsoid("iron", f, sx, 0.616, sz, 0.008, 0.012, 0.008, 6);
    }
  }

  // ---------- the row ----------
  const x0 = -((count - 1) * PITCH) / 2;
  for (let i = 0; i < count; i++) {
    const [s, yaw, pose] = VARY[i];
    const m = new THREE.Matrix4().compose(V(x0 + i * PITCH, 0, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), V(s, s, s));
    statue(m, pose);
  }

  // ---------- hokora shelter ----------
  if (shelter) {
    const I = new THREE.Matrix4();
    const W = count * PITCH + 0.06, hx = W / 2, zf = 0.24, zb = -0.24, PH = 0.92;
    for (const x of [-hx, hx]) for (const z of [zf, zb]) box("wood", I, x, PH / 2, z, 0.055, PH, 0.055);
    box("wood", I, 0, PH - 0.04, zf, W + 0.05, 0.07, 0.06); // front lintel
    box("wood", I, 0, PH - 0.04, zb, W + 0.05, 0.07, 0.06);
    for (const x of [-hx, hx]) box("wood", I, x, PH - 0.04, 0, 0.06, 0.07, zf - zb); // side rails
    box("wood", I, 0, 0.03, zb, W, 0.06, 0.05); // back sill
    // back wall planks with dark joints
    box("wood", I, 0, PH / 2, zb - 0.005, W - 0.03, PH - 0.08, 0.02);
    const nP = Math.max(3, Math.round(W / 0.12));
    for (let k = 1; k < nP; k++) {
      const x = -hx + (k * W) / nP;
      box("woodLine", I, x, PH / 2, zb + 0.0075, 0.008, PH - 0.12, 0.006);
    }
    // gabled roof: two slabs from the eaves to the ridge (ridge along X), with overhangs
    const ex = hx + 0.12, ez = 0.42, ey = PH + 0.02, ry = PH + 0.22, t = 0.035;
    for (const s of [-1, 1]) {
      const p = [[-ex, ey, s * ez], [ex, ey, s * ez], [ex, ry, 0], [-ex, ry, 0]];
      const q = p.map(([x, y, z]) => [x, y + t, z]);
      const ref = [0, (ey + ry) / 2 + t / 2 - 0.01, (s * ez) / 2];
      quad("roof", ...p, ref);
      quad("roof", ...q, ref);
      for (let k = 0; k < 4; k++) quad("roof", p[k], p[(k + 1) % 4], q[(k + 1) % 4], q[k], ref);
    }
    box("wood", I, 0, ry + t + 0.012, 0, 2 * ex + 0.04, 0.05, 0.06); // ridge board
    // gable boards under the roof ends
    for (const s of [-1, 1]) {
      const x = s * hx, ref = [x - s * 0.01, (PH + ry) / 2 - 0.05, 0];
      const a = [x, PH, zb - 0.03], b = [x, PH, zf + 0.03], e = [x, ry - 0.01, 0];
      const a2 = [x - s * 0.02, ...a.slice(1)], b2 = [x - s * 0.02, ...b.slice(1)], e2 = [x - s * 0.02, ...e.slice(1)];
      tri("wood", a, b, e, ref); tri("wood", a2, b2, e2, ref);
      quad("wood", a, b, b2, a2, ref); quad("wood", b, e, e2, b2, ref); quad("wood", e, a, a2, e2, ref);
    }
  }

  // ---------- meshes ----------
  const MAT = {
    stone: [c.stone, c.stoneShade, 0.1, true],
    plinth: [c.plinth, c.plinthShade, 0.1, true],
    red: [c.red, c.redShade, 0.05, true],
    redLine: [c.redShade, c.redShade, 0.1, false],
    line: [c.line, c.line, 0.1, false],
    jewel: [c.jewel, c.jewelShade, 0.1, true],
    wood: [c.wood, c.woodShade, 0.1, true],
    woodLine: [c.woodShade, c.woodShade, 0.1, false],
    iron: [c.woodShade, c.woodShade, 0.1, true],
    roof: [c.wood, c.woodShade, 0.25, true],
  };
  MAT.bib = MAT.red;
  // the bib is a soup of flat triangles: average its normals per position so the cloth shades smooth
  function smooth({ p, n }) {
    const sum = new Map(), k = (i) => `${Math.round(p[i] * 1e5)},${Math.round(p[i + 1] * 1e5)},${Math.round(p[i + 2] * 1e5)}`;
    for (let i = 0; i < p.length; i += 3) {
      const s = sum.get(k(i)) ?? [0, 0, 0];
      s[0] += n[i]; s[1] += n[i + 1]; s[2] += n[i + 2];
      sum.set(k(i), s);
    }
    const out = [];
    for (let i = 0; i < p.length; i += 3) {
      const s = sum.get(k(i)), l = Math.hypot(...s) || 1;
      out.push(s[0] / l, s[1] / l, s[2] / l);
    }
    return { p, n: out };
  }
  if (acc.bib) acc.bib = smooth(acc.bib);
  for (const [key, { p, n }] of Object.entries(acc)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, base, shade, { threshold, outline });
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
