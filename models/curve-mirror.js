// curve-mirror.js - a Japanese roadside traffic convex mirror (curve mirror) on its orange pole, the round mirror at
// every blind corner of slice-of-life anime streets; optionally with a stretch of white guardrail and the road corner.
// Static. Contract: harness/lab/README.md. Meters, +Y up, the mirror faces the road (+Z, turned 20 deg toward +X so
// the front-left camera meets its face), its left is +X, stands on y = 0, centred on x = 0, z = 0 (the bbox of the set; the pole's foot is near it).
//
// Construction (three.js lathes, cylinders and boxes plus hand-made grids, all transformed into place and merged into
// one triangle soup per material, so the whole set is at most 8 meshes):
//   POLE     a 9 cm steel pipe (76 mm, thickened) on a small concrete collar, a flat cap on top, clamp bands where the
//            mirror bracket and the sign plate hold on.
//   MIRROR   housing: ONE closed lathe about the mirror axis, a shallow back shell that rolls over into the thick front
//            rim (7.5 cm lip, 4.6 cm proud of the glass edge), so the orange ring and the dome behind read from any
//            side. Glass: a paraboloid cap 4 cm deep tucked into the rim's inner wall (smooth radial normals), pale sky.
//            Over it, 4 mm proud: two diagonal highlight streaks (the anime glint, lower-left to upper-right in the upper
//            left) and a thin dark ring just inside the rim, since the hull draws silhouettes only. A bracket box ties
//            the back shell to the pole. Tilted 5 deg face-down, as real ones look down at the road.
//            Two mirrors: a horizontal arm across the pole, the mirrors on its ends turned +32 / -12 deg (a V that
//            watches both ways of the corner, biased toward +X so both faces meet the front-left camera).
//   PLATE    a blank white sign plate in a thin orange frame under the mirror (no lettering).
//   ROAD     (road: true) a 6 m W-beam guardrail on round posts in front of the pole: the corrugated beam is a closed
//            extrusion of the W profile (two ridges), flat-shaded so the ridges band lit / shade; and an L-shaped
//            asphalt patch (the street along X, a side street coming in from -Z on the +X side, the mirror on the inside
//            of the corner) with white edge lines as flat quads 2 mm above it.
//   Winding comes from geometry: closed parts by their signed volume, open grids by the side they must face; shading
//   normals are then turned to their triangle's side. Never by hand.
// Proportions (real size; base unit the mirror diameter D = 0.8 m glass, 0.87 m over the rim):
//   pole 3.5 m class: mirror centre 3.07 (rim top 3.50 = 4.4 D), pole r 0.045, top cap 3.24 (two mirrors: 3.30);
//   housing 0.17 deep; plate 0.50 x 0.32 centred at 2.35; two mirrors 0.95 apart on a 0.8 m arm.
//   Guardrail: beam 0.31 tall x 0.057 deep, centre 0.60, posts r 0.07 0.80 tall every ~1.9 m, z 0.47; road 3.5 m wide.
// Options: build(THREE, kit, colors, { height, mirrors, road }).
//   height   scales everything uniformly so the top is `height` (default 3.50 m).
//   mirrors  1 (default) or 2.
//   road     false (default) or true: the guardrail and the road corner (the bbox grows to ~10.5 x 7.5 m).
// Budget: 2052 triangles one mirror, 3672 two, +592 road; 5 meshes: paint, glass, glint, rimLine, plate (+ rail,
//   road, roadLine).
// Colours (indigo: the only script with a true orange and a pale sky blue; remap through `colors` for a day film):
//   orange paint (pole, housing, bracket, plate frame) iris #e7a04a / accent #e23b4a (red-orange shade);
//   glass moon #d5e2ff flat (the sky it reflects); glint sclera #f6f3ee, rim line hair #16141c (lines, no shade);
//   plate, collar, guardrail sclera #f6f3ee / moon #d5e2ff; asphalt sky #1b2d6b flat; road lines sclera.

export const meta = {
  name: "curve-mirror",
  height: 3.5,
  script: "indigo",
  colors: {
    paint: "#e7a04a", paintShade: "#e23b4a",
    glass: "#d5e2ff", glassShade: "#d5e2ff",
    glint: "#f6f3ee", glintShade: "#f6f3ee",
    rimLine: "#16141c", rimLineShade: "#16141c",
    plate: "#f6f3ee", plateShade: "#d5e2ff",
    rail: "#f6f3ee", railShade: "#d5e2ff",
    road: "#1b2d6b", roadShade: "#1b2d6b",
    roadLine: "#f6f3ee", roadLineShade: "#f6f3ee",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const { height = meta.height, mirrors = 1, road = false } = opts;
  const root = new THREE.Group();
  root.name = "curve-mirror";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / meta.height);
  root.add(body);
  const joints = {};
  const M4 = THREE.Matrix4;
  const V2 = THREE.Vector2;

  // ---------- soups: one per material ----------
  const soups = {};
  function geo(pos, nrm) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    if (nrm) g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
    return g;
  }
  // append a geometry under matrix m. closed: wind by signed volume; else wind so the faces look along `facing`.
  function add(key, g0, m, { flat = false, facing = null } = {}) {
    let g = g0.index ? g0.toNonIndexed() : g0;
    if (m) g.applyMatrix4(m);
    if (flat || !g.getAttribute("normal")) {
      if (g.getAttribute("normal")) g.deleteAttribute("normal");
      g.computeVertexNormals(); // non-indexed: per-face normals
    }
    const P = Array.from(g.getAttribute("position").array), N = Array.from(g.getAttribute("normal").array);
    const T = P.length / 9;
    const fn = (t) => {
      const o = t * 9;
      const ax = P[o + 3] - P[o], ay = P[o + 4] - P[o + 1], az = P[o + 5] - P[o + 2];
      const bx = P[o + 6] - P[o], by = P[o + 7] - P[o + 1], bz = P[o + 8] - P[o + 2];
      return [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];
    };
    let score = 0;
    for (let t = 0; t < T; t++) {
      const o = t * 9;
      if (facing) { const n = fn(t); score += n[0] * facing[0] + n[1] * facing[1] + n[2] * facing[2]; }
      else score += P[o] * (P[o + 4] * P[o + 8] - P[o + 5] * P[o + 7]) - P[o + 1] * (P[o + 3] * P[o + 8] - P[o + 5] * P[o + 6]) + P[o + 2] * (P[o + 3] * P[o + 7] - P[o + 4] * P[o + 6]);
    }
    const S = (soups[key] ??= { pos: [], nrm: [] });
    for (let t = 0; t < T; t++) {
      const o = t * 9;
      if (score < 0) for (let k = 0; k < 3; k++) {
        [P[o + 3 + k], P[o + 6 + k]] = [P[o + 6 + k], P[o + 3 + k]];
        [N[o + 3 + k], N[o + 6 + k]] = [N[o + 6 + k], N[o + 3 + k]];
      }
      const n = fn(t);
      if (Math.hypot(...n) < 1e-10) continue; // sliver
      for (let v = 0; v < 3; v++) {
        const q = o + v * 3;
        const s = N[q] * n[0] + N[q + 1] * n[1] + N[q + 2] * n[2] < 0 ? -1 : 1;
        S.pos.push(P[q], P[q + 1], P[q + 2]);
        S.nrm.push(s * N[q], s * N[q + 1], s * N[q + 2]);
      }
    }
  }
  const T = (x, y, z) => new M4().makeTranslation(x, y, z);
  const box = (key, x, y, z, sx, sy, sz, m = new M4()) =>
    add(key, new THREE.BoxGeometry(sx, sy, sz), m.clone().multiply(T(x, y, z)), { flat: true });
  const cyl = (key, x, y0, y1, z, r, n = 16) =>
    add(key, new THREE.CylinderGeometry(r, r, y1 - y0, n), T(x, (y0 + y1) / 2, z));

  // ---------- one mirror, local axis +Z, centred on its glass ----------
  const RD = 0.36; // glass radius (tucked 6 mm into the rim's inner wall)
  const Z0 = 0.02, SAG = 0.04;
  const zf = (r) => Z0 + SAG * (1 - (r / RD) ** 2);
  const dn = (x, y) => { const k = (2 * SAG) / (RD * RD), n = [k * x, k * y, 1], l = Math.hypot(...n); return n.map((a) => a / l); };
  // a grid on the glass surface: pt(i, j) -> [x, y], lifted `lift` along +Z
  function surf(ni, nj, pt, lift) {
    const pos = [], nrm = [];
    const P = (i, j) => { const [x, y] = pt(i, j); return [x, y, zf(Math.hypot(x, y)) + lift]; };
    for (let i = 0; i < ni; i++)
      for (let j = 0; j < nj; j++)
        for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]]) {
          const p = P(i + a, j + b);
          pos.push(...p); nrm.push(...dn(p[0], p[1]));
        }
    return geo(pos, nrm);
  }
  const SEG = 40;
  const glassGeo = surf(8, SEG, (i, j) => { const r = (RD * i) / 8, a = (2 * Math.PI * j) / SEG; return [r * Math.cos(a), r * Math.sin(a)]; }, 0);
  const ringGeo = surf(1, 48, (i, j) => { const r = 0.338 + 0.018 * i, a = (2 * Math.PI * j) / 48; return [r * Math.cos(a), r * Math.sin(a)]; }, 0.003);
  // glint streak across offset u0 (half width w), running along (cos 45, sin 45)
  const streak = (u0, w) => surf(2, 12, (i, j) => {
    const u = u0 - w + w * i, L = Math.sqrt(Math.max(0, (RD - 0.03) ** 2 - u * u)), v = -L + (2 * L * j) / 12;
    const ux = Math.SQRT1_2, uy = -Math.SQRT1_2; // u points lower-right
    return [u * ux - v * uy, u * uy + v * ux];
  }, 0.004);
  const glints = [streak(-0.12, 0.05), streak(-0.215, 0.016), streak(0.2, 0.012)];
  const housingGeo = new THREE.LatheGeometry([
    [0, -0.135], [0.15, -0.13], [0.27, -0.115], [0.36, -0.09], [0.41, -0.06], [0.432, -0.025], [0.438, 0.01],
    [0.434, 0.04], [0.42, 0.058], [0.395, 0.066], [0.37, 0.064], [0.356, 0.052], [0.354, 0.02], [0, 0.02],
  ].map(([r, z]) => new V2(r, z)), 32);
  housingGeo.rotateX(Math.PI / 2); // lathe axis Y -> mirror axis Z

  // centre of the glass at (x, y, z), turned yaw about Y, tilted face-down `tilt`
  function mirror(x, y, z, yaw, tilt = (5 * Math.PI) / 180) {
    const m = T(x, y, z).multiply(new M4().makeRotationY(yaw)).multiply(new M4().makeRotationX(tilt));
    add("paint", housingGeo.clone(), m);
    add("glass", glassGeo.clone(), m, { facing: dirZ(m) });
    add("rimLine", ringGeo.clone(), m, { facing: dirZ(m) });
    for (const g of glints) add("glint", g.clone(), m, { facing: dirZ(m) });
    box("paint", 0, 0, -0.15, 0.13, 0.17, 0.06, m); // bracket on the back shell
  }
  const dirZ = (m) => new THREE.Vector3(0, 0, 1).transformDirection(m).toArray();

  // ---------- pole, mirrors, plate ----------
  const PR = 0.045, MY = 3.07;
  const two = mirrors === 2;
  const topY = two ? 3.3 : 3.24;
  cyl("plate", 0, 0, 0.05, 0, 0.11, 16); // concrete collar
  cyl("paint", 0, 0, topY, 0, PR, 16);
  cyl("paint", 0, topY, topY + 0.03, 0, PR + 0.012, 16); // cap
  cyl("paint", 0, MY - 0.12, MY + 0.12, 0, PR + 0.01, 16); // clamp band
  if (!two) {
    box("paint", 0, MY, 0.06, 0.1, 0.14, 0.09); // bracket to the back shell
    const yaw = (20 * Math.PI) / 180;
    mirror(Math.sin(yaw) * 0.25, MY, 0.06 + Math.cos(yaw) * 0.25 - 0.06, yaw);
  } else {
    box("paint", 0, MY, 0.07, 0.86, 0.06, 0.06); // horizontal arm
    // the V is biased toward +X (yaws +32 / -12 deg) so both faces meet the front-left camera
    for (const [s, deg] of [[1, 32], [-1, -12]]) {
      const yaw = (deg * Math.PI) / 180, ax = s * 0.43, az = 0.07;
      mirror(ax + Math.sin(yaw) * 0.2, MY, az + Math.cos(yaw) * 0.2, yaw);
    }
  }
  // blank sign plate in an orange frame, on two clamp bands
  box("paint", 0, 2.35, PR + 0.03, 0.54, 0.36, 0.02);
  box("plate", 0, 2.35, PR + 0.045, 0.5, 0.32, 0.02);
  for (const y of [2.24, 2.46]) cyl("paint", 0, y - 0.025, y + 0.025, 0, PR + 0.008, 16);
  box("paint", 0, 2.35, PR / 2 + 0.01, 0.08, 0.3, PR + 0.02); // plate bracket

  // ---------- guardrail and road corner ----------
  if (road) {
    const X0 = -5.6, X1 = 0.4, ZB = 0.53, YB = 0.445, H = 0.31, NB = 16;
    const zFront = (y) => ZB + 0.012 + 0.045 * (1 - Math.cos((4 * Math.PI * (y - YB)) / H)) / 2;
    const pos = [];
    const q = (a, b, e, d) => pos.push(...a, ...b, ...e, ...a, ...e, ...d);
    for (let i = 0; i < NB; i++) {
      const y0 = YB + (H * i) / NB, y1 = YB + (H * (i + 1)) / NB;
      const f0 = zFront(y0), f1 = zFront(y1);
      q([X0, y0, f0], [X1, y0, f0], [X1, y1, f1], [X0, y1, f1]); // corrugated face
      q([X0, y0, ZB], [X0, y1, ZB], [X1, y1, ZB], [X1, y0, ZB]); // flat back
      q([X0, y0, ZB], [X0, y0, f0], [X0, y1, f1], [X0, y1, ZB]); // end caps
      q([X1, y0, ZB], [X1, y1, ZB], [X1, y1, f1], [X1, y0, f0]);
    }
    const fB = zFront(YB), fT = zFront(YB + H);
    q([X0, YB, ZB], [X1, YB, ZB], [X1, YB, fB], [X0, YB, fB]); // bottom and top strips
    q([X0, YB + H, ZB], [X0, YB + H, fT], [X1, YB + H, fT], [X1, YB + H, ZB]);
    add("rail", geo(pos), null, { flat: true });
    for (const x of [-5.25, -3.35, -1.45, 0.2]) {
      cyl("rail", x, 0, 0.8, 0.46, 0.07, 12);
      cyl("rail", x, 0.8, 0.83, 0.46, 0.078, 12); // cap
      box("rail", x, 0.6, 0.51, 0.1, 0.16, 0.05); // bracket to the beam
    }
    // asphalt: the street along X in front, the side street from -Z on the +X side
    // one L-shaped slab (two boxes would ink their shared seam)
    const L = new THREE.Shape([[-6, 0.8], [1.0, 0.8], [1.0, -3.2], [4.5, -3.2], [4.5, 4.3], [-6, 4.3]].map(([x, z]) => new V2(x, -z)));
    const slab = new THREE.ExtrudeGeometry(L, { depth: 0.02, bevelEnabled: false });
    slab.rotateX(-Math.PI / 2); // shape y -> world -z, depth -> world +y
    add("road", slab, null, { flat: true });
    const line = [];
    const flatQ = (x0, z0, x1, z1) => line.push(x0, 0.022, z0, x1, 0.022, z0, x1, 0.022, z1, x0, 0.022, z0, x1, 0.022, z1, x0, 0.022, z1);
    const W = 0.15;
    flatQ(-6.0, 0.95, 1.15 + W, 0.95 + W); // near edge of the street, round the corner
    flatQ(1.15, -3.2, 1.15 + W, 0.95); // left edge of the side street
    flatQ(4.35 - W, -3.2, 4.35, 0.95 + W); // right edge of the side street
    flatQ(-6.0, 4.15 - W, 4.5, 4.15); // far edge of the street
    add("roadLine", geo(line), null, { flat: true, facing: [0, 1, 0] });
  }

  // ---------- meshes ----------
  const MAT = {
    paint: [c.paint, c.paintShade, 0.1, true, 3],
    glass: [c.glass, c.glassShade, -1, false],
    glint: [c.glint, c.glintShade, -1, false],
    rimLine: [c.rimLine, c.rimLineShade, -1, false],
    plate: [c.plate, c.plateShade, 0.1, true, 3],
    rail: [c.rail, c.railShade, 0.2, true, 2.5],
    road: [c.road, c.roadShade, -1, true, 2.5],
    roadLine: [c.roadLine, c.roadLineShade, -1, false],
  };
  for (const [key, s] of Object.entries(soups)) {
    const [base, shade, threshold, outline, px] = MAT[key];
    const mesh = kit.toon(geo(s.pos, s.nrm), base, shade, { threshold, outline, ...(px ? { px } : {}) });
    mesh.name = key;
    body.add(mesh);
  }

  // centre the set's bbox on x = 0, z = 0 (the pole's foot sits a little behind it)
  root.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(body);
  body.position.set(-(bb.min.x + bb.max.x) / 2, 0, -(bb.min.z + bb.max.z) / 2);

  function pose(name) {
    if (name !== "rest") throw new Error(`curve-mirror: unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
