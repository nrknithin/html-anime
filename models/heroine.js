// heroine.js — an original anime heroine in a sailor-style school uniform (model-lab contract, harness/lab/README.md).
// No imports, no clock, no Math.random: THREE and the kit come in as arguments; every helper lives in this file.
//
// Proportions (teen, ~6.2 heads): height 1.56 m, head (hair top to chin) 0.25 m. Landmarks (y, m): hair top 1.56,
// eye centre 1.395, chin 1.31, shoulders 1.22, waist 0.96, skirt hem 0.665, knee 0.45, sock top 0.40, sole 0.
//
// Construction:
//   head   SphereGeometry deformed per vertex (superellipse front = flat face plane so the far eye survives 3/4,
//          jaw taper, chin drop and forward jut, nape tuck); normals averaged by position (no seam), then the face
//          normals are blended toward a sphere centred behind the mouth ("normal transfer") so the carved jaw does not
//          go all-shade under the up-light. Face threshold -0.25, other skin -0.2, neck 0.25 (front-facing neck = shade band under the chin).
//   face   flat ShapeGeometry decals (lash, sclera, iris, lash-shadow crescent, pupil, shines, brows, nose, mouth),
//          subdivided, then conformed to the head by raycasting along -Z and lifted 0.6-1 mm per layer: no z-fighting,
//          no hull (outline: false). Highlights sit on the light side (+X) in both eyes, not mirrored.
//   hair   a skull cap (ellipsoid grid whose rows run from a hairline curve to the crown, so the edge is smooth) +
//          tapered elliptical tubes along CatmullRom curves for bangs, side locks and the ponytail, roots buried in the
//          cap; each strand has its own ink hull, which draws the strand lines. Side locks stay behind the cheek plane.
//   torso  a loft of elliptical rings (lower on spine, upper on chest). The sailor collar and its stripes are column
//          strips wrapped on the analytic torso surface, so their edges are exact curves, not mask staircases.
//   skirt  a pleated lathe (sawtooth radius per pleat), flat normals so each pleat face takes one tone, closed by an
//          inner shell so low angles never see through it.
//   limbs  ring lofts per segment, pivots at the real joints; hands = palm + finger and thumb capsules.
//
// Poses rest, wave, run (literal tables). Clips: build() returns clips { idle: 6, walk: 1.04, run: 0.62 } (s), and
// pose("walk@0.3") is that clip at 0.3 s, looping. In place; the feet are solved by IK on ground tracks (planted, no
// sliding, soles on y = 0; idle keeps rest's footing), the walk's pelvis height from knee-bend aims; the ponytail
// swings about its tie and the skirt about the waist, both lagging the body.
//
// Colour script "indigo" (Indigo moon). Base / shade pairs:
//   skin     skin #f0c2ae / iris #e7a04a        hair    sky #1b2d6b / hair #16141c (blue-black: lit top reads navy)
//   blouse   line #e7eefc / moon #d5e2ff        collar, skirt, socks  sky #1b2d6b / ink #101628
//   scarf    accent #e23b4a / sky #1b2d6b       loafers hair #16141c / ink #101628
//   eyes     sclera #f6f3ee, iris #e7a04a, iris light practical #f0c36a, pupil + lashes hair #16141c
//   ink hull ink #101628 (the lab passes the script's ink to the kit)

export const meta = {
  name: "heroine",
  height: 1.56,
  script: "indigo",
  colors: {
    skin: "#f0c2ae",
    skinShade: "#e7a04a",
    hair: "#1b2d6b",
    hairShade: "#16141c",
    shirt: "#e7eefc",
    shirtShade: "#d5e2ff",
    navy: "#1b2d6b",
    navyShade: "#101628",
    stripe: "#e7eefc",
    scarf: "#e23b4a",
    scarfShade: "#1b2d6b",
    shoe: "#16141c",
    shoeShade: "#101628",
    sclera: "#f6f3ee",
    iris: "#e7a04a",
    irisLight: "#f0c36a",
    pupil: "#16141c",
    lash: "#16141c",
  },
  poses: ["rest", "wave", "run"],
};

// Joint rotations in degrees [rx, ry, rz], absolute. A pose = REST with its own rows on top.
// Faces +Z, left is +X. A hanging limb points -Y: -rx swings it forward, +rz swings it toward +X.
const REST = {
  pelvis: [0, 0, 0], spine: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0], skirt: [0, 0, 0],
  shoulderL: [0, 0, 7], elbowL: [-8, 0, 0], wristL: [0, 0, -4],
  shoulderR: [0, 0, -7], elbowR: [-8, 0, 0], wristR: [0, 0, 4],
  hipL: [0, 0, 1.5], kneeL: [0, 0, 0], ankleL: [0, 0, -1.5],
  hipR: [0, 0, -1.5], kneeR: [0, 0, 0], ankleR: [0, 0, 1.5],
};
const POSES = {
  rest: {},
  wave: {
    spine: [0, 0, 2], chest: [0, 0, 2], neck: [0, 0, 4], head: [0, -6, 8],
    shoulderR: [0, 0, -112], elbowR: [0, 0, -48], wristR: [0, -90, 0],
    shoulderL: [0, 0, 9], elbowL: [-14, 0, 0],
    hipR: [0, 0, -4], hipL: [0, 0, 2], kneeL: [6, 0, 0], ankleL: [-6, 0, -2],
  },
  run: {
    pelvisY: -0.03, pelvis: [0, 10, 0], spine: [10, -5, 0], chest: [4, -8, 0], neck: [-6, 0, 0], head: [-6, 6, 0],
    skirt: [-8, 0, 0],
    hipL: [-42, 0, 2], kneeL: [30, 0, 0], ankleL: [8, 0, 0],
    hipR: [30, 0, -2], kneeR: [85, 0, 0], ankleR: [30, 0, 0],
    shoulderR: [-50, 0, -10], elbowR: [-80, 0, 0],
    shoulderL: [40, 0, 10], elbowL: [-70, 0, 0],
  },
};
// Looping clips, seconds: pose("walk@0.3"). The legs are solved (see clip() in build); a gait row sets the foot track:
// duty = stance share of the cycle per foot, S = metres the planted foot travels, zc = track centre (z), x = track
// half-width, heel / toe = roll angles (deg) over heelT / toeT of the cycle, lift / kick = swing arc height and backward
// heel kick (m). Pelvis height: the walk solves it from knee = stance knee bend aims (deg) at stance 0 / 0.25 / 0.65 / 1;
// the run sets it, drop + bob (m). bobAt = phase of the lowest pelvis (the follow-through keys off it). The rest are
// degrees unless named: sway = pelvis side sway (m); yaw / roll = pelvis turn and hip drop; twist = chest counter-turn;
// arm = shoulder swing about armOff; elbow = [hanging, extra when forward]; lean = spine + chest pitch; skirt = hem
// pitch [mean, swing, phase of the most forward hem] (twice a cycle: each thigh drives it).
const CLIPS = { idle: 6, walk: 1.04, run: 0.62 };
const GAIT = {
  walk: { duty: 0.6, S: 0.36, zc: -0.01, x: 0.052, heel: 11, heelT: 0.09, toe: 30, toeT: 0.2, lift: 0.045, kick: 0.03,
    knee: [4, 14, 7, 4], bobAt: 0.06, sway: 0.014, yaw: 8, roll: 3.5, twist: 9, arm: 13, armOff: -2, elbow: [-10, -12], lean: 2, skirt: [-1.5, 2, 0.03] },
  run: { duty: 0.32, S: 0.5, zc: -0.065, x: 0.045, heel: 0, heelT: 0.01, toe: 30, toeT: 0.14, lift: 0.26, kick: 0.2, run: true,
    drop: -0.046, bob: 0.015, bobAt: 0.16, sway: 0.01, yaw: 10, roll: 3, twist: 12, arm: 40, armOff: -6, elbow: [-62, -22], lean: 13, skirt: [-9, 6, 0.2] },
};
const DEG = Math.PI / 180;
const SKIN = { threshold: -0.2 };
const FACE = { threshold: -0.25 }; // the face stays lit; shade only wraps the far cheek and under the jaw // skin faces the camera: a low threshold keeps it lit, shade only on the far side

// Head (head-centre-relative metres). The cranium is an ellipsoid; the jaw is carved in headGeo.
const HEAD = { cy: 0.125, cz: 0.012, rx: 0.096, ry: 0.102, rz: 0.096, chin: 0.028 };
const EYE = { x: 0.04, y: -0.052, k: 1.24 };

// Torso rings, world y: [y, rx, rz, cz].
const TORSO = [
  [0.855, 0.152, 0.124, 0.0],
  [0.87, 0.15, 0.121, 0.0],
  [0.92, 0.128, 0.1, 0.0],
  [0.98, 0.096, 0.072, 0.0],
  [1.05, 0.1, 0.075, 0.005],
  [1.11, 0.112, 0.085, 0.012],
  [1.16, 0.118, 0.08, 0.006],
  [1.2, 0.128, 0.072, 0.0],
  [1.245, 0.11, 0.066, -0.004],
  [1.285, 0.052, 0.046, -0.004],
];
const SKIRT = [
  [0.975, 0.092, 0.07],
  [0.92, 0.12, 0.094],
  [0.87, 0.143, 0.115],
  [0.78, 0.175, 0.145],
  [0.665, 0.2, 0.165],
];

export function build(THREE, kit, colors = meta.colors) {
  const c = colors;
  const root = new THREE.Group();
  root.name = "heroine";
  const joints = {};
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  const joint = (name, parent, x, y, z) => {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    parent.add(g);
    joints[name] = g;
    return g;
  };
  const put = (parent, mesh, x = 0, y = 0, z = 0) => {
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  // ---------- geometry helpers ----------
  // Average normals of vertices that share a position (sphere seams, cap rims): the tone split stays continuous.
  function smooth(g) {
    if (!g.attributes.normal) g.computeVertexNormals();
    const p = g.attributes.position, n = g.attributes.normal;
    const ids = new Map(), slot = new Int32Array(p.count), sum = [];
    for (let i = 0; i < p.count; i++) {
      const k = `${Math.round(p.getX(i) * 1e5)},${Math.round(p.getY(i) * 1e5)},${Math.round(p.getZ(i) * 1e5)}`;
      let s = ids.get(k);
      if (s === undefined) (ids.set(k, (s = sum.length / 3)), sum.push(0, 0, 0));
      slot[i] = s;
      sum[s * 3] += n.getX(i); sum[s * 3 + 1] += n.getY(i); sum[s * 3 + 2] += n.getZ(i);
    }
    for (let i = 0; i < p.count; i++) {
      const s = slot[i] * 3, l = Math.hypot(sum[s], sum[s + 1], sum[s + 2]) || 1;
      n.setXYZ(i, sum[s] / l, sum[s + 1] / l, sum[s + 2] / l);
    }
    return g;
  }
  const geo = (pos, idx) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };
  // Loft of elliptical rings along Y: rings [y, rx, rz, cz = 0, cx = 0]; a = 0 is the front (+Z). Capped ends.
  function loftY(rings, seg = 16, caps = true) {
    const pos = [], idx = [];
    const up = rings[rings.length - 1][0] > rings[0][0];
    for (const [y, rx, rz, cz = 0, cx = 0] of rings)
      for (let j = 0; j < seg; j++) {
        const a = (j / seg) * Math.PI * 2;
        pos.push(cx + rx * Math.sin(a), y, cz + rz * Math.cos(a));
      }
    for (let i = 0; i < rings.length - 1; i++)
      for (let j = 0; j < seg; j++) {
        const a = i * seg + j, b = i * seg + ((j + 1) % seg), d = a + seg, e = b + seg;
        if (up) idx.push(a, b, d, b, e, d);
        else idx.push(a, d, b, b, d, e);
      }
    if (caps)
      for (const [k, top] of [[0, !up], [rings.length - 1, up]]) {
        const [y, , , cz = 0, cx = 0] = rings[k];
        const ci = pos.length / 3;
        pos.push(cx, y, cz);
        for (let j = 0; j < seg; j++) {
          const a = k * seg + j, b = k * seg + ((j + 1) % seg);
          if (top) idx.push(ci, a, b);
          else idx.push(ci, b, a);
        }
      }
    return geo(pos, idx);
  }
  // Tapered tube along a CatmullRom curve. size(t) -> [width, thickness]; the width lies across `out(p)`.
  function tube(pts, size, out, segs = 10, radial = 6) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => V3(...p)));
    const pos = [], idx = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, P = curve.getPointAt(t), T = curve.getTangentAt(t);
      const O = out(P, t).normalize();
      const S = new THREE.Vector3().crossVectors(T, O).normalize();
      const N = new THREE.Vector3().crossVectors(S, T).normalize();
      const [w, h] = size(t);
      for (let k = 0; k < radial; k++) {
        const ang = (k / radial) * Math.PI * 2;
        const q = P.clone().addScaledVector(S, (Math.cos(ang) * w) / 2).addScaledVector(N, (Math.sin(ang) * h) / 2);
        pos.push(q.x, q.y, q.z);
      }
    }
    for (let i = 0; i < segs; i++)
      for (let k = 0; k < radial; k++) {
        const a = i * radial + k, b = i * radial + ((k + 1) % radial);
        idx.push(a, a + radial, b, b, a + radial, b + radial);
      }
    const p0 = curve.getPointAt(0), p1 = curve.getPointAt(1), c0 = pos.length / 3;
    pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
    for (let k = 0; k < radial; k++) {
      const k2 = (k + 1) % radial;
      idx.push(c0, k, k2);
      idx.push(c0 + 1, segs * radial + k2, segs * radial + k);
    }
    return geo(pos, idx);
  }
  const capsule = (r, len, cap = 4, rad = 10) => new THREE.CapsuleGeometry(r, Math.max(len - 2 * r, 0.001), cap, rad);
  const ball = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);

  // ---------- head ----------
  function headGeo() {
    const g = new THREE.SphereGeometry(1, 32, 24);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      let X = x * HEAD.rx, Y = y * HEAD.ry, Z = z * HEAD.rz;
      if (z > 0) {
        // superellipse in xz on the front half: a flatter, wider face plane so the far eye survives a 3/4 view
        const th = Math.atan2(Math.abs(z), Math.abs(x)), n = 3.2;
        const k = Math.pow(Math.pow(Math.abs(Math.cos(th)), n) + Math.pow(Math.abs(Math.sin(th)), n), -1 / n);
        X *= k; Z *= k;
      }
      if (y < 0) {
        const t = -y, f = Math.max(0, z);
        X *= 1 - 0.36 * Math.pow(t, 1.4) * (0.45 + 0.55 * f); // jaw narrows toward the chin, most in front
        Y -= HEAD.chin * Math.pow(t, 1.6) * (0.25 + 0.75 * f); // chin drops in front
        Z += 0.012 * Math.pow(t, 1.3) * f; // and juts forward a little: a chin in profile
        if (z < 0) Z *= 1 - 0.3 * t; // nape tucks toward the neck
      }
      p.setXYZ(i, X, Y + HEAD.cy, Z + HEAD.cz);
    }
    g.computeVertexNormals();
    smooth(g);
    // Normal transfer (the anime-3D face trick): the carved jaw faces down and would go all-shade, so blend the
    // face normals toward a sphere's normals around a point behind the nose. The tone split becomes one clean curve.
    const n = g.attributes.normal, C = V3(0, HEAD.cy - 0.06, HEAD.cz - 0.05), q = V3(0, 0, 0), m = V3(0, 0, 0);
    for (let i = 0; i < p.count; i++) {
      const w = Math.min(1, Math.max(0, (p.getZ(i) - HEAD.cz) / 0.04));
      if (w <= 0) continue;
      q.set(p.getX(i), p.getY(i), p.getZ(i)).sub(C).normalize();
      m.set(n.getX(i), n.getY(i), n.getZ(i)).lerp(q, w).normalize();
      n.setXYZ(i, m.x, m.y, m.z);
    }
    return g;
  }
  // Point on the (approximate) skin ellipsoid, head-joint coords; az from front toward +X, el up.
  const hp = (az, el, off = 0) =>
    [(HEAD.rx + off) * Math.cos(el) * Math.sin(az), HEAD.cy + (HEAD.ry + off) * Math.sin(el), HEAD.cz + (HEAD.rz + off) * Math.cos(el) * Math.cos(az)];

  // Subdivide a non-indexed geometry: each triangle -> 4.
  function subdivide(g) {
    const p = g.attributes.position, out = [];
    const v = (i) => [p.getX(i), p.getY(i), p.getZ(i)];
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    for (let i = 0; i < p.count; i += 3) {
      const a = v(i), b = v(i + 1), cc = v(i + 2), ab = mid(a, b), bc = mid(b, cc), ca = mid(cc, a);
      out.push(...a, ...ab, ...ca, ...ab, ...b, ...bc, ...ca, ...bc, ...cc, ...ab, ...bc, ...ca);
    }
    const r = new THREE.BufferGeometry();
    r.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
    return r;
  }

  // ---------- skeleton ----------
  const pelvisY = 0.86;
  const pelvis = joint("pelvis", root, 0, pelvisY, 0);
  const spine = joint("spine", pelvis, 0, 0.95 - pelvisY, 0);
  const chest = joint("chest", spine, 0, 1.08 - 0.95, 0);
  const neck = joint("neck", chest, 0, 1.25 - 1.08, 0);
  const head = joint("head", neck, 0, 1.32 - 1.25, 0);
  const skirtJ = joint("skirt", pelvis, 0, 0.975 - pelvisY, 0);

  // ---------- torso ----------
  const torsoAt = (y) => {
    if (y <= TORSO[0][0]) return TORSO[0];
    for (let i = 0; i < TORSO.length - 1; i++) {
      const [y0, ...r0] = TORSO[i], [y1, ...r1] = TORSO[i + 1];
      if (y <= y1) {
        const t = (y - y0) / (y1 - y0);
        return [y, ...r0.map((v, k) => v + (r1[k] - v) * t)];
      }
    }
    return TORSO[TORSO.length - 1];
  };
  const torsoP = (a, y) => {
    const [, rx, rz, cz] = torsoAt(y);
    return V3(rx * Math.sin(a), y, cz + rz * Math.cos(a));
  };
  // Point on the torso surface pushed `off` along its normal (numeric), world coords.
  const torsoSurf = (a, y, off) => {
    const P = torsoP(a, y);
    const Pa = torsoP(a + 1e-3, y).sub(torsoP(a - 1e-3, y));
    const Py = torsoP(a, y + 1e-3).sub(torsoP(a, y - 1e-3));
    const n = new THREE.Vector3().crossVectors(Pa, Py).normalize();
    return P.addScaledVector(n, off);
  };
  const sliceY = (y0, y1, oy) => TORSO.filter(([y]) => y >= y0 - 1e-6 && y <= y1 + 1e-6).map(([y, ...r]) => [y - oy, ...r]);
  put(spine, kit.toon(smooth(loftY([...sliceY(0.855, 1.05, 0.95), torsoAt(1.1).map((v, i) => (i ? v : 1.1 - 0.95))], 28)), c.shirt, c.shirtShade));
  put(chest, kit.toon(smooth(loftY([torsoAt(1.06).map((v, i) => (i ? v : 1.06 - 1.08)), ...sliceY(1.11, 1.285, 1.08)], 28)), c.shirt, c.shirtShade));

  // Sailor collar: column strip over angle a in [0, 2pi) (front = 0), between the outer edge and the neckline / V.
  const FLAP = 2.25; // |a| where the square back flap starts
  const yOuter = (A) => (A >= FLAP ? 1.035 : A <= 1.4 ? 1.1 + (A / 1.4) * 0.095 : 1.195);
  const yTop = (A) => (A < 0.75 ? 1.1 + 0.185 * Math.pow(A / 0.75, 1.25) : 1.285);
  function strip(cols, lo, hi, off, rows = 6) {
    const pos = [], idx = [];
    cols.forEach((a) => {
      const A = Math.min(a, Math.PI * 2 - a);
      const y0 = lo(A, a), y1 = hi(A, a);
      for (let r = 0; r <= rows; r++) {
        const q = torsoSurf(a, y0 + ((y1 - y0) * r) / rows, off);
        pos.push(q.x, q.y - 1.08, q.z);
      }
    });
    for (let i = 0; i < cols.length - 1; i++)
      for (let r = 0; r < rows; r++) {
        const a = i * (rows + 1) + r, b = a + rows + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    return geo(pos, idx);
  }
  const cols = [];
  const NC = 72;
  for (let i = 0; i <= NC; i++) {
    const a = 0.02 + ((Math.PI * 2 - 0.04) * i) / NC;
    cols.push(a);
  }
  // duplicate columns at the flap corners give vertical edges
  const colsWithFlap = [];
  for (let i = 0; i < cols.length; i++) {
    const a = cols[i];
    colsWithFlap.push(a);
    const nx = cols[i + 1];
    for (const edge of [FLAP, Math.PI * 2 - FLAP]) if (nx !== undefined && a < edge && nx > edge) colsWithFlap.push(edge - 1e-4, edge + 1e-4);
  }
  const collar = strip(colsWithFlap, (A) => yOuter(A), (A) => yTop(A), 0.006);
  put(chest, kit.toon(collar, c.navy, c.navyShade, { outline: false }));
  const stripeLo = (A) => (A >= FLAP ? 1.044 : yOuter(A) + 0.008);
  const stripe = strip(colsWithFlap.filter((a) => Math.min(a, Math.PI * 2 - a) > 0.08), stripeLo, (A) => Math.min(stripeLo(A) + 0.006, yTop(A)), 0.0075, 1);
  put(chest, kit.toon(stripe, c.stripe, c.stripe, { outline: false }));
  // vertical stripe runs down each side edge of the back flap
  for (const cs of [[FLAP + 0.05, FLAP + 0.11], [Math.PI * 2 - FLAP - 0.11, Math.PI * 2 - FLAP - 0.05]])
    put(chest, kit.toon(strip(cs, () => 1.044, () => 1.209, 0.0075, 8), c.stripe, c.stripe, { outline: false }));

  // Neckerchief: knot at the V, two tails.
  const vPt = torsoSurf(0, 1.105, 0.012);
  const knot = put(chest, kit.toon(ball(0.022, 12, 8), c.scarf, c.scarfShade, SKIN), 0, vPt.y - 1.08, vPt.z);
  knot.scale.set(1.15, 0.8, 0.45);
  for (const s of [-1, 1]) {
    const t0 = torsoSurf(0.06 * s, 1.095, 0.01), t1 = torsoSurf(0.2 * s, 1.03, 0.011), t2 = torsoSurf(0.26 * s, 0.98, 0.012);
    const tail = tube([[t0.x, t0.y - 1.08, t0.z], [t1.x, t1.y - 1.08, t1.z], [t2.x, t2.y - 1.08, t2.z]],
      (t) => [0.042 * (1 - 0.35 * t), 0.007], () => V3(0, 0, 1), 6, 6);
    put(chest, kit.toon(tail, c.scarf, c.scarfShade, SKIN));
  }

  // ---------- neck + head ----------
  put(neck, kit.toon(smooth(loftY([[0.0, 0.04, 0.036], [0.028, 0.03, 0.029], [0.045, 0.027, 0.028], [0.12, 0.03, 0.032]], 14)), c.skin, c.skinShade, { threshold: 0.25 }), 0, 0, 0.002);
  const skull = kit.toon(headGeo(), c.skin, c.skinShade, FACE);
  put(head, skull);

  // Face decals conformed to the skull by raycasting along -Z.
  skull.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  const hits = [];
  function decal(shape, color, lift, level = 1) {
    let g = new THREE.ShapeGeometry(shape, 5).toNonIndexed();
    for (let i = 0; i < level; i++) g = subdivide(g);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i) + HEAD.cy;
      ray.set(V3(x, y, 1), V3(0, 0, -1));
      hits.length = 0;
      skull.raycast(ray, hits);
      let z = HEAD.cz + 0.06;
      if (hits.length) z = hits.reduce((m, h) => Math.max(m, h.point.z), -1);
      p.setXYZ(i, x, y, z + lift);
    }
    g.computeVertexNormals();
    return put(head, kit.toon(g, color, color, { outline: false }));
  }
  const spl = (pts) => {
    const sh = new THREE.Shape();
    sh.moveTo(...pts[0]);
    sh.splineThru([...pts.slice(1), pts[0]].map(([x, y]) => new THREE.Vector2(x, y)));
    return sh;
  };
  const ell = (x, y, rx, ry) => {
    const sh = new THREE.Shape();
    sh.absellipse(x, y, rx, ry, 0, Math.PI * 2, false, 0);
    return sh;
  };
  for (const s of [-1, 1]) {
    // eye space: u outward (toward the ear), v up -> head coords
    const E = (pts) => pts.map(([u, v]) => [s * (EYE.x + u * EYE.k), EYE.y + v * EYE.k]);
    const sclera = spl(E([[-0.021, -0.001], [-0.012, 0.013], [0.004, 0.019], [0.018, 0.014], [0.024, 0.004], [0.019, -0.012], [0.004, -0.02], [-0.011, -0.015]]));
    decal(sclera, c.sclera, 0.002, 2); // level 2: big curved shape, chords must not dip under the skin
    const [ix, iy] = E([[0.002, -0.002]])[0];
    const k = EYE.k;
    decal(ell(ix, iy, 0.0125 * k, 0.017 * k), c.iris, 0.003);
    decal(ell(ix, iy - 0.007 * k, 0.009 * k, 0.0065 * k), c.irisLight, 0.0036);
    decal(ell(ix, iy + 0.001 * k, 0.0055 * k, 0.0085 * k), c.pupil, 0.0042);
    // lash shadow: a dark crescent over the top of the iris (the classic anime iris gradient, in two flat tones)
    const cres = new THREE.Shape(), rx = 0.0125 * k, ry = 0.017 * k;
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * (0.06 + (0.88 * i) / 12);
      const P = [ix + rx * Math.cos(a), iy + ry * Math.sin(a)];
      if (i === 0) cres.moveTo(...P); else cres.lineTo(...P);
    }
    for (let i = 12; i >= 0; i--) {
      const a = Math.PI * (0.06 + (0.88 * i) / 12);
      cres.lineTo(ix + rx * 0.96 * Math.cos(a), iy + ry * 0.35 + ry * 0.32 * Math.sin(a));
    }
    decal(cres, c.pupil, 0.0046);
    decal(ell(ix + 0.0045 * k, iy + 0.008 * k, 0.0045 * k, 0.0045 * k), c.sclera, 0.0056, 0);
    decal(ell(ix - 0.005 * k, iy - 0.008 * k, 0.0022 * k, 0.0022 * k), c.sclera, 0.0056, 0);
    const lashTop = E([[-0.023, 0.0], [-0.013, 0.016], [0.004, 0.0225], [0.019, 0.0175], [0.028, 0.006], [0.031, 0.0005]]);
    const lashBot = E([[0.024, 0.002], [0.017, 0.0095], [0.004, 0.0135], [-0.011, 0.0085], [-0.02, -0.003]]);
    const lash = new THREE.Shape();
    lash.moveTo(...lashTop[0]);
    lash.splineThru(lashTop.slice(1).map(([x, y]) => new THREE.Vector2(x, y)));
    lash.lineTo(...lashBot[0]);
    lash.splineThru(lashBot.slice(1).map(([x, y]) => new THREE.Vector2(x, y)));
    decal(lash, c.lash, 0.006);
    decal(spl(E([[0.004, -0.0205], [0.013, -0.018], [0.0205, -0.011], [0.019, -0.0105], [0.012, -0.0162], [0.004, -0.0185]])), c.lash, 0.0024, 0);
    decal(spl(E([[-0.016, 0.034], [0.0, 0.0375], [0.018, 0.032], [0.0175, 0.0345], [0.0, 0.0402], [-0.016, 0.0365]])), c.lash, 0.0015, 0);
  }
  decal(spl([[-0.001, -0.077], [0.004, -0.081], [-0.001, -0.082]]), c.skinShade, 0.0015, 0);
  decal(spl([[-0.008, -0.1015], [0.0, -0.1045], [0.008, -0.1015], [0.0075, -0.1025], [0.0, -0.1065], [-0.0075, -0.1025]]), c.lash, 0.0015, 0);

  for (const s of [-1, 1]) {
    const ear = put(head, kit.toon(ball(0.02, 10, 8), c.skin, c.skinShade, SKIN), s * 0.086, HEAD.cy - 0.04, HEAD.cz - 0.012);
    ear.scale.set(0.35, 1.05, 0.62);
    ear.rotation.y = s * 0.35;
  }

  // ---------- hair ----------
  const hairMat = [c.hair, c.hairShade, { threshold: 0.62 }]; // mostly black; navy only where the crown faces the light
  // Cap: ellipsoid grid; keep cells above the hairline.
  {
    const NA = 36, NE = 20, off = 0.017, pos = [], idx = [];
    const hairline = (az) => {
      const k = Math.cos(az);
      return k > 0 ? -0.12 + 0.47 * k * k : -0.12 - 0.75 * Math.pow(-k, 1.3);
    };
    for (let i = 0; i <= NE; i++)
      for (let j = 0; j < NA; j++) {
        const az = -Math.PI + (2 * Math.PI * j) / NA, h0 = hairline(az);
        const el = h0 + (Math.PI / 2 - h0) * Math.pow(i / NE, 0.85); // rows run from the hairline to the crown: a smooth edge
        const [x, y, z] = hp(az, el, off);
        pos.push(x * 1.05, y + 0.004 * Math.max(0, Math.sin(el)), z - 0.006);
      }
    for (let i = 0; i < NE; i++)
      for (let j = 0; j < NA; j++) {
        const a = i * NA + j, b = i * NA + ((j + 1) % NA), d = a + NA, e = b + NA;
        idx.push(a, b, d, b, e, d);
      }
    const g = geo(pos, idx);
    put(head, kit.toon(smooth(g), ...hairMat));
  }
  const outward = (p) => V3(p.x, p.y - HEAD.cy, p.z - HEAD.cz);
  const lock = (pts, w, th, taper = 0.6) =>
    put(head, kit.toon(tube(pts, (t) => [w * Math.pow(1 - t, taper) * (1 + 0.25 * Math.sin(Math.PI * t)) + 0.0008, th * (1 - 0.6 * t) + 0.0008], outward, 10, 6), ...hairMat));
  // Bangs: [az, tip elevation, width]
  for (const [az, tipEl, w] of [[-0.84, 0.0, 0.03], [-0.6, -0.08, 0.034], [-0.36, -0.2, 0.036], [-0.12, -0.14, 0.034], [0.12, -0.21, 0.036], [0.36, -0.12, 0.034], [0.6, -0.05, 0.032], [0.84, 0.02, 0.03]])
    lock([hp(az * 0.7, 1.1, 0.006), hp(az * 0.9, 0.62, 0.02), hp(az, 0.4, 0.022), hp(az * 1.05, 0.12, 0.017), hp(az * 1.1, tipEl, 0.01)], w, 0.012);
  // Side locks framing the face.
  for (const s of [-1, 1])
    lock([hp(s * 1.0, 0.6, 0.02), hp(s * 1.22, 0.12, 0.024), [s * 0.086, HEAD.cy - 0.06, HEAD.cz + 0.0], [s * 0.08, HEAD.cy - 0.11, HEAD.cz + 0.004], [s * 0.066, HEAD.cy - 0.15, HEAD.cz + 0.012]], 0.042, 0.013, 0.55);
  // Ponytail from a tie high on the back of the head. Its pivot sits at the head origin with no transform at rest
  // (so rest is bit-for-bit the unpivoted build); clips turn it about the tie by moving the pivot (tie - R tie).
  const tie = [0, HEAD.cy + 0.07, HEAD.cz - 0.098];
  const tail = joint("ponytail", head, 0, 0, 0);
  for (const [dx, dz, len, w] of [[0, 0, 1, 0.056], [-0.022, 0.01, 0.9, 0.04], [0.022, 0.01, 0.92, 0.04], [0, -0.02, 0.8, 0.04]])
    put(tail, kit.toon(tube([tie, [dx * 0.5, tie[1] + 0.02, tie[2] - 0.06 + dz], [dx, tie[1] - 0.07, tie[2] - 0.1 + dz], [dx * 1.4, tie[1] - 0.24 * len, tie[2] - 0.09 + dz], [dx * 1.8, tie[1] - 0.38 * len, tie[2] - 0.05 + dz]],
      (t) => [w * Math.pow(1 - t, 0.7) * (1 + 0.5 * Math.sin(Math.PI * t)) + 0.001, w * 0.7 * Math.pow(1 - t, 0.7) + 0.001], () => V3(1, 0, 0), 12, 6), ...hairMat));
  // Hair tie.
  // scrunchie: one fat torus around the tail root, its axis along the tail
  const scrunchie = put(head, kit.toon(new THREE.TorusGeometry(0.019, 0.009, 8, 16), c.scarf, c.scarfShade, SKIN), 0, tie[1] + 0.012, tie[2] - 0.03);
  scrunchie.rotation.x = -0.35;

  // ---------- arms ----------
  for (const [side, s] of [["L", 1], ["R", -1]]) {
    const sh = joint(`shoulder${side}`, chest, s * 0.14, 1.2 - 1.08, -0.005);
    put(sh, kit.toon(smooth(loftY([[0.02, 0.03, 0.03], [0.0, 0.043, 0.042], [-0.06, 0.04, 0.039], [-0.22, 0.031, 0.031], [-0.24, 0.029, 0.029], [-0.27, 0.019, 0.019]], 14)), c.skin, c.skinShade, SKIN));
    // short puff sleeve with a navy cuff
    put(sh, kit.toon(smooth(loftY([[0.035, 0.028, 0.028, 0, -s * 0.01], [0.015, 0.049, 0.047, 0, -s * 0.004], [-0.04, 0.053, 0.05], [-0.1, 0.047, 0.045], [-0.115, 0.042, 0.041]], 16)), c.shirt, c.shirtShade));
    put(sh, kit.toon(smooth(loftY([[-0.1, 0.0485, 0.0465], [-0.117, 0.0445, 0.0435]], 16, false)), c.navy, c.navyShade, { outline: false }));
    const el = joint(`elbow${side}`, sh, 0, -0.24, 0);
    put(el, kit.toon(smooth(loftY([[0.03, 0.019, 0.019], [0.0, 0.029, 0.028], [-0.02, 0.031, 0.03], [-0.06, 0.031, 0.029], [-0.2, 0.022, 0.02], [-0.225, 0.02, 0.019]], 12)), c.skin, c.skinShade, SKIN));
    const wr = joint(`wrist${side}`, el, 0, -0.22, 0);
    // hand: palm is thin in x (palm faces the thigh at rest), fingers fan in the palm plane, thumb splayed forward
    const hand = new THREE.Group();
    hand.scale.setScalar(1.15);
    wr.add(hand);
    const palm = put(hand, kit.toon(ball(0.03, 12, 8), c.skin, c.skinShade, SKIN), 0, -0.035, 0.002);
    palm.scale.set(0.42, 1.15, 0.9);
    for (let f = 0; f < 4; f++) {
      const fl = 0.05 - Math.abs(f - 1.2) * 0.006;
      const knuckle = new THREE.Group();
      knuckle.position.set(-s * 0.002, -0.06, 0.017 - f * 0.0115);
      knuckle.rotation.x = -(1.5 - f) * 0.13;
      hand.add(knuckle);
      put(knuckle, kit.toon(capsule(0.0068, fl, 3, 6), c.skin, c.skinShade, SKIN), 0, -fl / 2 + 0.004, 0);
    }
    const th = put(hand, kit.toon(capsule(0.0078, 0.042, 3, 6), c.skin, c.skinShade, SKIN), -s * 0.006, -0.042, 0.03);
    th.rotation.x = -0.6;
  }

  // ---------- skirt + hips ----------
  put(pelvis, kit.toon(smooth(loftY([[0.975 - pelvisY, 0.098, 0.078], [0.8 - pelvisY, 0.125, 0.09], [0.74 - pelvisY, 0.07, 0.06]], 16)), c.navyShade, c.navyShade));
  {
    const NP = 22, pos = [], idx = [];
    const per = NP * 2;
    const ringPts = (y, rx, rz, amp, scale) => {
      for (let j = 0; j < per; j++) {
        const k = j % 2 === 0 ? 0 : 0.78;
        const a = ((Math.floor(j / 2) + k) / NP) * Math.PI * 2;
        const m = (j % 2 === 0 ? 1 + amp : 1 - amp * 0.4) * scale;
        pos.push(rx * m * Math.sin(a), y - 0.975, rz * m * Math.cos(a));
      }
    };
    const n = SKIRT.length;
    SKIRT.forEach(([y, rx, rz], i) => ringPts(y, rx, rz, 0.06 * (i / (n - 1)), 1));
    for (let i = n - 1; i >= 0; i--) {
      const [y, rx, rz] = SKIRT[i];
      ringPts(y + (i === n - 1 ? 0 : 0), rx, rz, 0.06 * (i / (n - 1)), i === 0 ? 0.97 : 0.95);
    }
    const R = 2 * n;
    for (let i = 0; i < R - 1; i++)
      for (let j = 0; j < per; j++) {
        const a = i * per + j, b = i * per + ((j + 1) % per), d = a + per, e = b + per;
        idx.push(a, d, b, b, d, e);
      }
    let g = geo(pos, idx).toNonIndexed();
    g.computeVertexNormals();
    put(skirtJ, kit.toon(g, c.navy, c.navyShade));
  }

  // ---------- legs ----------
  for (const [side, s] of [["L", 1], ["R", -1]]) {
    const hip = joint(`hip${side}`, pelvis, s * 0.072, 0.8 - pelvisY, 0);
    put(hip, kit.toon(smooth(loftY([[0.05, 0.066, 0.064], [-0.03, 0.075, 0.072], [-0.18, 0.061, 0.062], [-0.33, 0.045, 0.047], [-0.35, 0.044, 0.046], [-0.39, 0.03, 0.032]], 16)), c.skin, c.skinShade, SKIN));
    const kn = joint(`knee${side}`, hip, 0, -0.35, 0);
    put(kn, kit.toon(smooth(loftY([[0.04, 0.03, 0.032], [0.0, 0.044, 0.046], [-0.03, 0.043, 0.045], [-0.06, 0.045, 0.048]], 14)), c.skin, c.skinShade, SKIN));
    put(kn, kit.toon(smooth(loftY([[-0.045, 0.046, 0.049, -0.002], [-0.1, 0.048, 0.052, -0.004], [-0.22, 0.036, 0.04], [-0.33, 0.026, 0.03], [-0.385, 0.026, 0.03]], 14)), c.navy, c.navyShade));
    const an = joint(`ankle${side}`, kn, 0, -0.38, 0);
    // loafer: rings along the foot [along, half width, half height, -centre height], rotated so "along" is +Z
    const shoeG = loftY([[-0.06, 0.026, 0.026, -0.032], [-0.045, 0.031, 0.034, -0.036], [0.0, 0.034, 0.036, -0.034], [0.07, 0.035, 0.027, -0.026], [0.12, 0.03, 0.02, -0.02], [0.145, 0.016, 0.013, -0.016]], 14);
    shoeG.rotateX(Math.PI / 2);
    const sp = shoeG.attributes.position;
    for (let i = 0; i < sp.count; i++) sp.setY(i, Math.max(sp.getY(i), 0.003)); // flat sole
    shoeG.computeVertexNormals();
    put(an, kit.toon(smooth(shoeG), c.shoe, c.shoeShade), 0, -0.07, 0.0);
  }

  // ---------- clips ----------
  // Feet: the ankle follows a ground track. In stance it is carried back at the ground speed (in place, like library
  // walk clips) while the foot rolls heel -> flat -> toe about a point on the sole, so the contact never slides; in
  // swing a Hermite arc joins toe-off to the next strike with matched velocities, plus a lift and a heel kick. A
  // two-bone IK in the pelvis frame turns each ankle target into hip [rx, 0, rz] + knee rx (knees only fold back), and
  // the ankle takes the world foot pitch. Idle plants the feet where rest has them. Everything is periodic in t.
  const L1 = 0.35, L2 = 0.38, SOLE = 0.067, HEEL = -0.045, TOE = 0.145; // thigh, shin; ankle frame: sole depth, heel / toe on it
  const TAU = Math.PI * 2;
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const cyc = (n, ph, lag = 0) => Math.cos(TAU * n * (ph - lag));
  const syc = (n, ph, lag = 0) => Math.sin(TAU * n * (ph - lag));
  // Stance phase u in [0, duty): ankle [z, y] and foot pitch (deg, + toe down), rolling about the heel or toe point.
  function stance(g, u) {
    let p = 0, zp = 0;
    if (u < g.heelT) (p = -g.heel * (1 - ease(u / g.heelT))), (zp = HEEL);
    else if (u > g.duty - g.toeT) (p = g.toe * ease((u - g.duty + g.toeT) / g.toeT)), (zp = TOE);
    const r = p * DEG, zf = g.zc + g.S / 2 - (g.S * u) / g.duty;
    return [zf + zp * (1 - Math.cos(r)) + SOLE * Math.sin(r), SOLE * Math.cos(r) + zp * Math.sin(r), p];
  }
  function track(g, u) {
    if (u < g.duty) return stance(g, u);
    const w = (u - g.duty) / (1 - g.duty), e = 1e-4, span = 1 - g.duty;
    const a = stance(g, g.duty - e), a0 = stance(g, g.duty - 2 * e), b = stance(g, 0), b1 = stance(g, e);
    const h = [2 * w ** 3 - 3 * w * w + 1, w ** 3 - 2 * w * w + w, -2 * w ** 3 + 3 * w * w, w ** 3 - w * w];
    const v = a.map((v0, i) => h[0] * v0 + h[1] * ((v0 - a0[i]) / e) * span + h[2] * b[i] + h[3] * ((b1[i] - b[i]) / e) * span);
    const arc = Math.sin(Math.PI * w) ** 2;
    v[0] -= g.kick * arc * (1 - w);
    v[1] += g.lift * Math.sin(Math.PI * Math.pow(w, 0.8)) ** 2;
    return v;
  }
  const _m = new THREE.Matrix4(), _v = V3(0, 0, 0), _q = new THREE.Quaternion(), _qf = new THREE.Quaternion(), _e = new THREE.Euler();
  function leg(side, x, y, z, pitch) {
    const hip = joints[`hip${side}`], kn = joints[`knee${side}`], an = joints[`ankle${side}`];
    _v.set(x, y, z).applyMatrix4(_m.copy(pelvis.matrixWorld).invert()).sub(hip.position);
    const d = Math.min(_v.length(), L1 + L2 - 1e-6);
    const k = Math.acos(Math.max(-1, Math.min(1, (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2))));
    const yv = -L1 - L2 * Math.cos(k), zv = -L2 * Math.sin(k);
    const c = Math.asin(Math.max(-1, Math.min(1, -_v.x / yv)));
    hip.rotation.set(Math.atan2(_v.z, _v.y) - Math.atan2(zv, yv * Math.cos(c)), 0, c);
    kn.rotation.set(k, 0, 0);
    hip.updateMatrixWorld(true);
    kn.getWorldQuaternion(_q).invert();
    an.quaternion.copy(_q.multiply(_qf.setFromEuler(_e.set(pitch * DEG, 0, 0))));
  }
  let restFeet = null; // ankle world positions at rest, for idle

  // Walk: the pelvis height is solved too, so the bob comes out of the legs and no knee is over-stretched: the soft
  // minimum over both legs of the height where that leg's knee has its aim bend (g.knee over stance, its last key
  // through swing, where the raised foot leaves the bound slack). Run: a set bob, lowest at mid-stance, highest in
  // flight; the run's stance stays inside the legs' reach (checked with the probe over 64 frames).
  const pelvisRot = (g, ph) => [g.run ? 4 : 0, -g.yaw * cyc(1, ph), g.roll * syc(1, ph, 0.03)];
  const pelvisX = (g, ph) => g.sway * syc(1, ph, 0.04);
  function kneeAim(g, s) {
    const K = g.knee, S = [0, 0.25, 0.65, 1], i = s < S[1] ? 0 : s < S[2] ? 1 : 2;
    return K[i] + (K[i + 1] - K[i]) * ease((s - S[i]) / (S[i + 1] - S[i]));
  }
  function heightFor(g, side, ph) {
    const s = side === "L" ? 1 : -1, u = (ph + (s > 0 ? 1 : 1.5)) % 1, [z, y] = track(g, u), r = pelvisRot(g, ph);
    const hp = V3(s * 0.072, -0.06, 0).applyEuler(_e.set(r[0] * DEG, r[1] * DEG, r[2] * DEG));
    const k = kneeAim(g, Math.min(1, u / g.duty)) * DEG, D2 = L1 * L1 + L2 * L2 + 2 * L1 * L2 * Math.cos(k);
    const h2 = (pelvisX(g, ph) + hp.x - s * g.x) ** 2 + (hp.z - z) ** 2;
    return y + Math.sqrt(Math.max(0, D2 - h2)) - hp.y;
  }
  function pelvisHeight(g, ph) {
    if (!g.knee) return pelvisY + g.drop - g.bob * cyc(2, ph, g.bobAt);
    const hL = heightFor(g, "L", ph), hR = heightFor(g, "R", ph), lo = Math.min(hL, hR);
    return lo - 0.003 * Math.log(Math.exp((lo - hL) / 0.003) + Math.exp((lo - hR) / 0.003));
  }

  function clip(name, t) {
    const T = CLIPS[name], ph = (((t % T) + T) % T) / T, g = GAIT[name];
    const R = Object.fromEntries(Object.entries(REST).map(([k, v]) => [k, [...v]]));
    let px = 0, py = pelvisY, tl = [0, 0, 0];
    if (name === "idle") {
      // two breaths and one slow weight shift per loop; hair and skirt sway come and go with an envelope
      const b = syc(2, ph), w = syc(1, ph), env = Math.max(0, Math.sin(TAU * ph + 0.6)) ** 2;
      px = 0.011 * w; py = pelvisY - 0.007 - 0.002 * w * w;
      R.pelvis = [0, 2 * syc(1, ph, 0.05), 1.6 * w];
      R.spine = [0.4 * b, -1.2 * syc(1, ph, 0.05), -2.1 * w];
      R.chest = [-1.1 * b, 0, -0.5 * syc(1, ph, 0.04)];
      R.neck = [0.4 * b, 0, 0.5 * w];
      R.head = [-0.6 * b + 1.2 * syc(1, ph, 0.3), 4 * syc(1, ph, 0.12), 1.8 * syc(1, ph, 0.08)];
      R.shoulderL = [1.2 * syc(1, ph, 0.12), 0, 7 + 0.8 * b + 1.2 * syc(1, ph, 0.1)];
      R.shoulderR = [-1.2 * syc(1, ph, 0.12), 0, -7 - 0.8 * b + 1.2 * syc(1, ph, 0.1)];
      R.elbowL = [-8 - 1.5 * syc(1, ph, 0.18), 0, 0]; R.elbowR = [-8 + 1.5 * syc(1, ph, 0.18), 0, 0];
      R.skirt = [0.6 * syc(2, ph, 0.1), 0, -1.2 * syc(1, ph, 0.05) + 1.4 * env * syc(3, ph, 0.05)];
      tl = [1.5 * syc(2, ph, 0.12), 0, 3 * syc(1, ph, 0.14) + 3 * env * syc(3, ph, 0.1)];
    } else {
      // gait: left heel strikes at ph = 0, right at 0.5. Pelvis yaws the forward hip forward and drops the swing hip;
      // the chest counter-turns, the head holds the line of travel; arms swing contralaterally, a beat behind.
      const run = !!g.run, Y = g.yaw, ro = g.roll;
      px = pelvisX(g, ph);
      py = pelvisHeight(g, ph);
      R.pelvis = pelvisRot(g, ph);
      R.spine = [g.lean * 0.6 + (run ? 2 : 0.6) * cyc(2, ph, g.bobAt + 0.08), 0.6 * Y * cyc(1, ph), -0.8 * ro * syc(1, ph, 0.03)];
      R.chest = [g.lean * 0.4, 0.4 * Y * cyc(1, ph) + g.twist * cyc(1, ph, 0.02), -0.3 * ro * syc(1, ph, 0.06)];
      R.neck = [-g.lean * 0.4, -0.5 * g.twist * cyc(1, ph, 0.02), 0.4 * ro * syc(1, ph, 0.06)];
      R.head = [-g.lean * 0.6 - (run ? 3 : 1) - (run ? 1.5 : 0.8) * cyc(2, ph, g.bobAt + 0.1), -0.5 * g.twist * cyc(1, ph, 0.02), 0.5 * ro * syc(1, ph, 0.08)];
      for (const [side, s, n] of [["L", 1, 0], ["R", -1, 0.5]]) {
        const fwd = 0.5 - 0.5 * cyc(1, ph, n + 0.06); // 1 when this arm is fully forward (the other leg leads)
        R[`shoulder${side}`] = [g.armOff - g.arm * cyc(1, ph, n + 0.54), 0, s * (run ? 13 : 8) + s * (run ? 3 : 1.5) * fwd];
        R[`elbow${side}`] = [g.elbow[0] + g.elbow[1] * (0.5 - 0.5 * cyc(1, ph, n + 0.1)), 0, 0];
        R[`wrist${side}`] = [(run ? 6 : 8) * syc(1, ph, n + 0.62), 0, -s * 4];
      }
      R.skirt = [g.skirt[0] - g.skirt[1] * cyc(2, ph, g.skirt[2]), Y * (0.7 * cyc(1, ph, 0.1) - cyc(1, ph)), ro * (1.4 * syc(1, ph, 0.14) - syc(1, ph, 0.03))];
      tl = [(run ? 14 : 3) + (run ? 6 : 4) * cyc(2, ph, g.bobAt + 0.2), 0, (run ? 8 : 6) * syc(1, ph, 0.2)];
    }
    for (const [j, v] of Object.entries(R)) joints[j].rotation.set(v[0] * DEG, v[1] * DEG, v[2] * DEG);
    pelvis.position.set(px, py, 0);
    tail.rotation.set(tl[0] * DEG, tl[1] * DEG, tl[2] * DEG);
    tail.position.set(...tie).sub(V3(...tie).applyEuler(tail.rotation));
    root.updateMatrixWorld(true);
    if (name === "idle") for (const side of ["L", "R"]) leg(side, ...restFeet[side], 0);
    else
      for (const [side, s, n] of [["L", 1, 0], ["R", -1, 0.5]]) {
        const [z, y, p] = track(g, (ph + n) % 1);
        leg(side, s * g.x, y, z, p);
      }
    root.updateMatrixWorld(true);
  }

  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`heroine: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      return clip(m[1], +m[2]);
    }
    const rows = POSES[name];
    if (!rows) throw new Error(`unknown pose "${name}" (${Object.keys(POSES).join(", ")}, or <clip>@<seconds>)`);
    const table = { ...REST, ...rows };
    for (const [j, v] of Object.entries(table)) {
      if (!joints[j]) continue;
      joints[j].rotation.set(v[0] * DEG, v[1] * DEG, v[2] * DEG);
    }
    pelvis.position.set(0, pelvisY + (rows.pelvisY || 0), 0);
    tail.rotation.set(0, 0, 0);
    tail.position.set(0, 0, 0);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  restFeet = Object.fromEntries(["L", "R"].map((s) => [s, joints[`ankle${s}`].getWorldPosition(V3(0, 0, 0)).toArray()]));
  return { root, joints, pose, clips: { ...CLIPS } };
}
