// horse.js — a procedural cel horse for the model lab (see harness/lab/README.md).
//
// Construction strategy
// - Every organic part is a RAIL LOFT: two side-profile rails ([z, y] keys read straight off the side reference,
//   Catmull-Rom interpolated) plus a half-width curve. Each ring is a superellipse spanning X and the vector
//   between the rails, so a part is "drawn" as its side outline and a plan width. Barrel: top/belly rails.
//   Neck: crest/throat rails. Head: forehead/jaw rails (a triangle: poll, muzzle, throatlatch; the jaw line is
//   nearly level). Legs: front/back rails per segment. The winding is picked from the rails' handedness.
// - Mane = a CAP loft that reuses the neck's own rails over its top third, 1.12 x wider, with a sawtooth lower
//   rail (no smoothing) so it ends in pointed locks. Cheek = a flattened sphere proud of the jowl by ~1 cm, so
//   its ink draws the jowl curve. Blaze and socks are unlined decals within 3 mm of the surface.
// - Geometry is authored in WORLD rest coordinates (meters, +Y up, faces +Z, hooves on y = 0) and each mesh is
//   translated by minus its joint's world pivot, so the numbers stay readable against the reference.
// - Rigid segments hang from Group pivots at the real joints; segment ends overlap the joint with near-
//   hemispherical caps, hidden ends (upper arm, thigh) taper to a point inside the barrel. The neck pivots at
//   the withers base so the crest root stays put when the neck swings. No skinning, no morphs.
// Proportions (H = withers height = 1.55 m; ratios from the reference brief, Barb side photo as the overlay):
//   body length ~1.15 H, depth 0.44 H, elbow 0.55 H, knee 0.30 H, hock 0.35 H, fetlock 0.09 H,
//   head 0.36 H at ~49 deg, neck crest rising ~40 deg, ear tips ~1.5 H.
// Two-tone pairs from the "noon" script:
//   coat     accent #c4452d / iris #5c3d32       (chestnut)
//   hair     hair #241c16 / ink #2c261f          (mane, tail, hooves)
//   marking  practical #fffaf2 / sky #f2d7ae     (blaze, socks)
//   eye      hair #241c16, glint practical #fffaf2

export const meta = {
  name: "horse",
  height: 2.33,
  script: "noon",
  colors: {
    coat: "#c4452d",
    coatShade: "#5c3d32",
    hair: "#241c16",
    hairShade: "#2c261f",
    mark: "#fffaf2",
    markShade: "#f2d7ae",
    eye: "#241c16",
    glint: "#fffaf2",
  },
  poses: ["rest", "gallop-a", "gallop-b", "rear"],
};

// Joint rotations in degrees [rx, ry, rz], absolute. +rx swings a hanging limb BACK (and tips the nose down).
// Front knee flexes with +rx (cannon folds back); hock flexes with -rx (cannon swings forward).
const REST = {
  body: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0], tail: [0, 0, 0], tailTip: [0, 0, 0],
  shoulderL: [0, 0, 0], elbowL: [0, 0, 0], kneeL: [0, 0, 0], fetlockFL: [0, 0, 0],
  shoulderR: [0, 0, 0], elbowR: [0, 0, 0], kneeR: [0, 0, 0], fetlockFR: [0, 0, 0],
  hipL: [0, 0, 0], stifleL: [0, 0, 0], hockL: [0, 0, 0], fetlockHL: [0, 0, 0],
  hipR: [0, 0, 0], stifleR: [0, 0, 0], hockR: [0, 0, 0], fetlockHR: [0, 0, 0],
};
const REST_POS = { body: [0, 0, 0] }; // body offset in meters, absolute
const POSES = {
  rest: {},
  // Muybridge 1878 frame 3: gathered suspension, all four hooves bunched under the belly, airborne
  "gallop-a": {
    body: [-3, 0, 0], neck: [32, 0, 0], head: [-26, 0, 0], tail: [62, 0, 0], tailTip: [-15, 0, 0],
    shoulderL: [30, 0, 0], elbowL: [5, 0, 0], kneeL: [95, 0, 0], fetlockFL: [30, 0, 0],
    shoulderR: [-15, 0, 0], elbowR: [10, 0, 0], kneeR: [45, 0, 0], fetlockFR: [25, 0, 0],
    hipL: [-50, 0, 0], stifleL: [12, 0, 0], hockL: [-42, 0, 0], fetlockHL: [25, 0, 0],
    hipR: [-40, 0, 0], stifleR: [10, 0, 0], hockR: [-34, 0, 0], fetlockHR: [20, 0, 0],
    pos: { body: [0, 0.04, 0] },
  },
  // Muybridge 1878 frame 7: extension; leading foreleg reaches, the other is planted and angled back,
  // one hind leg planted under the hip, the other trailing high; body long and low, neck stretched
  "gallop-b": {
    body: [2, 0, 0], neck: [32, 0, 0], head: [-40, 0, 0], tail: [72, 0, 0], tailTip: [-12, 0, 0],
    shoulderL: [-55, 0, 0], elbowL: [-5, 0, 0], kneeL: [0, 0, 0], fetlockFL: [-25, 0, 0],
    shoulderR: [18, 0, 0], elbowR: [0, 0, 0], kneeR: [0, 0, 0], fetlockFR: [-25, 0, 0],
    hipL: [22, 0, 0], stifleL: [4, 0, 0], hockL: [10, 0, 0], fetlockHL: [-22, 0, 0],
    hipR: [48, 0, 0], stifleR: [15, 0, 0], hockR: [42, 0, 0], fetlockHR: [30, 0, 0],
    pos: { body: [0, -0.078, 0] },
  },
  // up on the hind legs: body pitched 45 deg nose-up about the hip, hocks flexed under it, forelegs folded
  rear: {
    body: [-45, 0, 0], neck: [-5, 0, 0], head: [25, 0, 0], tail: [40, 0, 0], tailTip: [-10, 0, 0],
    shoulderL: [-22, 0, 0], elbowL: [-40, 0, 0], kneeL: [120, 0, 0], fetlockFL: [40, 0, 0],
    shoulderR: [-12, 0, 0], elbowR: [-30, 0, 0], kneeR: [100, 0, 0], fetlockFR: [30, 0, 0],
    hipL: [22, 0, 0], stifleL: [25, 0, 0], hockL: [-25, 0, 0], fetlockHL: [5, 0, 0],
    hipR: [30, 0, 0], stifleR: [20, 0, 0], hockR: [-20, 0, 0], fetlockHR: [0, 0, 0],
    pos: { body: [0, -0.1, 0] },
  },
};
const DEG = Math.PI / 180;

export function build(THREE, kit, colors = meta.colors) {
  const c = colors;
  const root = new THREE.Group();
  root.name = "horse";
  const joints = {};
  const pivots = {}; // world rest pivot of every joint

  // ---- geometry helpers -------------------------------------------------------------------------------
  // Uniform Catmull-Rom through numeric keys; `steps` samples per span; returns the dense array.
  const spline = (keys, steps) => {
    const out = [];
    const n = keys.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = keys[Math.max(i - 1, 0)], p1 = keys[i], p2 = keys[i + 1], p3 = keys[Math.min(i + 2, n - 1)];
      for (let s = 0; s < steps; s++) {
        const t = s / steps, t2 = t * t, t3 = t2 * t;
        out.push(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3));
      }
    }
    out.push(keys[n - 1]);
    return out;
  };
  const spow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);

  // Rail loft. a, b: [[z, y], ...] rails (same count) in the YZ plane; w: half-widths along X.
  // opts: steps per span, segs around, n superellipse exponent (2 = ellipse), pinch (b side narrower 0..1),
  //       x0 (x offset), lean (x shift per unit of b-ward travel), cap (end bulge as a fraction of ring radius).
  function railLoft(a, b, w, { steps = 4, segs = 16, n = 2.2, pinch = 0, x0 = 0, cap = 0.5 } = {}) {
    const az = spline(a.map((p) => p[0]), steps), ay = spline(a.map((p) => p[1]), steps);
    const bz = spline(b.map((p) => p[0]), steps), by = spline(b.map((p) => p[1]), steps);
    const ww = spline(w, steps);
    const R = az.length, e = 2 / n;
    const pos = [];
    const ring = (i) => {
      const cy = (ay[i] + by[i]) / 2, cz = (az[i] + bz[i]) / 2;
      let uy = ay[i] - by[i], uz = az[i] - bz[i];
      const r = Math.hypot(uy, uz) / 2 || 1e-4;
      uy /= 2 * r; uz /= 2 * r;
      for (let s = 0; s < segs; s++) {
        const t = (s / segs) * Math.PI * 2, ct = Math.cos(t), st = Math.sin(t);
        const k = 1 - pinch * (1 - ct) / 2;
        const x = x0 + ww[i] * k * spow(st, e), d = r * spow(ct, e);
        pos.push(x, cy + uy * d, cz + uz * d);
      }
      return { cy, cz, r };
    };
    const info = [];
    for (let i = 0; i < R; i++) info.push(ring(i));
    // winding: outward when (rail a - rail b) x (loft direction) points +X; flip otherwise
    let hand = 0;
    for (let i = 0; i < R - 1; i++) hand += (ay[i] - by[i]) * (info[i + 1].cz - info[i].cz) - (az[i] - bz[i]) * (info[i + 1].cy - info[i].cy);
    const tri = hand >= 0 ? (p, q, r) => idx.push(p, q, r) : (p, q, r) => idx.push(p, r, q);
    const idx = [];
    for (let i = 0; i < R - 1; i++)
      for (let s = 0; s < segs; s++) {
        const p = i * segs + s, q = i * segs + ((s + 1) % segs);
        tri(p, p + segs, q);
        tri(q, p + segs, q + segs);
      }
    // caps: a centre vertex pushed out along the end tangent
    for (const [i, j, first] of [[0, 1, true], [R - 1, R - 2, false]]) {
      const A = info[i], B = info[j];
      let ty = A.cy - B.cy, tz = A.cz - B.cz;
      const tl = Math.hypot(ty, tz) || 1;
      const bulge = cap * Math.min(A.r, ww[i]);
      const ci = pos.length / 3;
      pos.push(x0, A.cy + (ty / tl) * bulge, A.cz + (tz / tl) * bulge);
      for (let s = 0; s < segs; s++) {
        const p = i * segs + s, q = i * segs + ((s + 1) % segs);
        if (first) tri(ci, p, q); else tri(ci, q, p);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  // ---- rig helpers ------------------------------------------------------------------------------------
  const joint = (name, parent, x, y, z) => {
    const g = new THREE.Group();
    g.name = name;
    const pp = parent === root ? [0, 0, 0] : pivots[parent.name];
    g.position.set(x - pp[0], y - pp[1], z - pp[2]);
    parent.add(g);
    joints[name] = g;
    pivots[name] = [x, y, z];
    return g;
  };
  // geometry authored in world rest coordinates -> parented under joint j
  const part = (j, geo, base, shade, opts) => {
    const p = pivots[j.name];
    geo.translate(-p[0], -p[1], -p[2]);
    const m = kit.toon(geo, base, shade, opts);
    j.add(m);
    return m;
  };
  const coat = [c.coat, c.coatShade], hair = [c.hair, c.hairShade], mark = [c.mark, c.markShade];

  // ---- body -------------------------------------------------------------------------------------------
  const body = joint("body", root, 0, 1.2, -0.8);
  {
    const Z = [-1.13, -1.1, -1.02, -0.88, -0.7, -0.5, -0.3, -0.05, 0.15, 0.36, 0.52, 0.62, 0.68];
    const T = [1.32, 1.43, 1.51, 1.57, 1.58, 1.53, 1.51, 1.53, 1.55, 1.45, 1.32, 1.22, 1.15];
    const B = [1.12, 1.04, 0.99, 0.97, 0.97, 0.96, 0.91, 0.87, 0.86, 0.87, 0.9, 0.98, 1.05];
    const W = [0.06, 0.15, 0.22, 0.27, 0.28, 0.27, 0.285, 0.28, 0.24, 0.21, 0.18, 0.12, 0.05];
    part(body, railLoft(Z.map((z, i) => [z, T[i]]), Z.map((z, i) => [z, B[i]]), W, { steps: 3, segs: 24, n: 2.3 }), ...coat);
  }

  // ---- neck + mane ------------------------------------------------------------------------------------
  const neck = joint("neck", body, 0, 1.38, 0.2); // pivot at the withers base: the crest root barely moves when the neck swings
  const crest = [[0.05, 1.5], [0.25, 1.66], [0.44, 1.86], [0.64, 2.05], [0.8, 2.16], [0.9, 2.19]];
  const throat = [[0.56, 1.0], [0.72, 1.2], [0.79, 1.4], [0.82, 1.56], [0.84, 1.72], [0.85, 1.86]];
  const NECK_W = [0.24, 0.21, 0.17, 0.13, 0.11, 0.1];
  part(neck, railLoft(crest, throat, NECK_W, { steps: 4, segs: 20 }), ...coat);
  {
    // mane: a CAP over the top of the neck. It reuses the neck's dense rails: rail a sits 3.5 cm above the
    // crest, rail b dips 22-43% of the way to the throat in a 4-sample sawtooth (steps 1 = no smoothing, so the points
    // stay sharp), width 1.12 x the neck. Where it dives into the neck we get a clean hair/coat boundary.
    const nz = spline(crest.map((p) => p[0]), 8), ny = spline(crest.map((p) => p[1]), 8);
    const tz = spline(throat.map((p) => p[0]), 8), ty = spline(throat.map((p) => p[1]), 8);
    const nw = spline(NECK_W, 8);
    const ma = [], mb = [], mw = [];
    for (let i = 1; i < nz.length - 3; i++) {
      const dz = nz[i] - tz[i], dy = ny[i] - ty[i], dl = Math.hypot(dz, dy);
      const f = 0.22 + (0.07 - 0.03 * (i / nz.length)) * (3 - (i % 4)); // sawtooth: teeth point back to the withers
      ma.push([nz[i] + (0.035 * dz) / dl, ny[i] + (0.035 * dy) / dl]);
      mb.push([nz[i] - f * dz, ny[i] - f * dy]);
      mw.push(nw[i] * 1.12);
    }
    part(neck, railLoft(ma, mb, mw, { steps: 1, segs: 20, cap: 0.3 }), ...hair);
  }

  // ---- head (local frame: +Z along the head from poll to muzzle, +Y the forehead side) ---------------
  const head = joint("head", neck, 0, 2.08, 0.88);
  {
    // forehead rail vs jaw rail, world side view: poll -> muzzle; the jaw line is nearly horizontal
    const fore = [[0.86, 2.21], [0.95, 2.18], [1.06, 2.06], [1.16, 1.94], [1.22, 1.86], [1.255, 1.79], [1.27, 1.76]];
    const jaw = [[0.83, 1.93], [0.87, 1.75], [0.97, 1.68], [1.08, 1.665], [1.15, 1.655], [1.215, 1.655], [1.25, 1.67]];
    part(head, railLoft(fore, jaw, [0.08, 0.11, 0.115, 0.09, 0.075, 0.08, 0.075], { steps: 3, segs: 18, n: 2.4, pinch: 0.3, cap: 0.7 }), ...coat);
    // blaze: a thin strip riding the forehead/nose line (normal (z,y) = (0.75, 0.66))
    const bz = [[1.0, 2.12], [1.12, 1.99], [1.24, 1.85], [1.3, 1.775]];
    part(head, railLoft(bz.map(([z, y]) => [z + 0.003, y + 0.0027]), bz.map(([z, y]) => [z - 0.02, y - 0.018]), [0.018, 0.026, 0.034, 0.03], { steps: 3, segs: 10 }), ...mark, { outline: false });
    const put = (geo, base, shade, x, y, z, opts) => part(head, geo.translate(x, y, z), base, shade, opts);
    for (const s of [-1, 1]) {
      // ears: flattened cones at the poll, pricked up and a little forward and out
      const ear = new THREE.ConeGeometry(0.05, 0.18, 8).scale(1, 1, 0.55).rotateZ(-s * 16 * DEG).rotateX(8 * DEG);
      put(ear, ...coat, s * 0.075, 2.245, 0.92);
      // eye with a glint, on the side of the head below the forehead line
      put(new THREE.SphereGeometry(0.036, 12, 8).scale(0.45, 1.05, 1.25), c.eye, c.eye, s * 0.097, 2.03, 1.02, { outline: false });
      put(new THREE.SphereGeometry(0.011, 8, 6), c.glint, c.glint, s * 0.111, 2.045, 1.035, { outline: false });
      // nostril
      put(new THREE.SphereGeometry(0.018, 10, 6).scale(0.6, 1, 1.4), c.hair, c.hair, s * 0.05, 1.75, 1.28, { outline: false });
      // round cheek (jowl) plate: protrudes ~1 cm so its ink draws the classic cheek curve
      put(new THREE.SphereGeometry(0.085, 14, 10).scale(0.35, 1, 1.05), ...coat, s * 0.078, 1.79, 0.96);
    }
    // forelock falling on the forehead
    put(new THREE.ConeGeometry(0.05, 0.17, 8).scale(1, 1, 0.4).rotateX(140 * DEG), ...hair, 0, 2.15, 0.98);
  }

  // ---- tail ------------------------------------------------------------------------------------------
  const tail = joint("tail", body, 0, 1.47, -1.0);
  part(tail, railLoft([[-1.0, 1.52], [-1.1, 1.45], [-1.16, 1.3], [-1.16, 1.05]], [[-0.98, 1.42], [-1.04, 1.36], [-1.08, 1.25], [-1.08, 1.05]], [0.05, 0.06, 0.07, 0.08], { steps: 3, segs: 12 }), ...hair);
  const tailTip = joint("tailTip", tail, 0, 1.08, -1.12);
  part(tailTip, railLoft([[-1.16, 1.12], [-1.18, 0.85], [-1.16, 0.6], [-1.08, 0.37]], [[-1.06, 1.12], [-1.02, 0.85], [-0.97, 0.6], [-0.99, 0.39]], [0.08, 0.1, 0.1, 0.05], { steps: 3, segs: 12 }), ...hair);

  // ---- legs ------------------------------------------------------------------------------------------
  // Each segment is a rail loft (front rail, back rail, half-widths; world [z, y], top to bottom) under its joint.
  // Segment ends overlap the joint and close with near-hemispherical caps, so a bend shows a knuckle, not a gap.
  // Hidden upper ends (upper arm, thigh) taper to a point inside the barrel so no shelf pokes out.
  const seg = (j, front, back, w, x0, opts = {}) =>
    part(j, railLoft(front, back, w, { steps: 3, segs: 14, cap: 0.9, x0, ...opts }), ...(opts.tone || coat));
  const lower = (j, dz, x0, sock) => {
    // pastern + hoof below a fetlock pivot at (dz, 0.14); the hoof toe points +Z, pastern ~55 deg
    const sh = (pts) => pts.map(([z, y]) => [z + dz, y]);
    seg(j, sh([[0.04, 0.19], [0.045, 0.12], [0.06, 0.09], [0.08, 0.075]]), sh([[-0.05, 0.19], [-0.06, 0.13], [-0.03, 0.08], [0.01, 0.07]]),
      [0.042, 0.046, 0.04, 0.042], x0, { steps: 2, segs: 12, tone: sock ? mark : coat });
    seg(j, sh([[0.075, 0.085], [0.11, 0.0]]), sh([[-0.02, 0.08], [-0.01, 0.0]]), [0.046, 0.056], x0, { steps: 2, segs: 12, cap: 0.01, tone: hair });
  };
  for (const [S, x] of [["L", 1], ["R", -1]]) {
    const xf = x * 0.16, xh = x * 0.15;
    // front leg: shoulder (point of shoulder) -> elbow -> knee (carpus) -> fetlock
    const sh = joint(`shoulder${S}`, body, x * 0.14, 1.12, 0.66);
    seg(sh, [[0.6, 1.34], [0.68, 1.2], [0.7, 1.06], [0.64, 0.94], [0.53, 0.84]], [[0.5, 1.34], [0.46, 1.18], [0.42, 1.02], [0.37, 0.9], [0.38, 0.82]],
      [0.05, 0.11, 0.12, 0.11, 0.08], x * 0.12, { segs: 16, cap: 0.8 });
    const el = joint(`elbow${S}`, sh, xf, 0.86, 0.45);
    seg(el, [[0.52, 0.93], [0.535, 0.8], [0.515, 0.64], [0.495, 0.5], [0.49, 0.45]], [[0.37, 0.92], [0.37, 0.8], [0.4, 0.64], [0.41, 0.5], [0.42, 0.45]],
      [0.075, 0.07, 0.055, 0.045, 0.042], xf);
    const kn = joint(`knee${S}`, el, xf, 0.47, 0.455);
    seg(kn, [[0.5, 0.52], [0.505, 0.47], [0.495, 0.4], [0.49, 0.26], [0.492, 0.16], [0.49, 0.12]], [[0.405, 0.52], [0.405, 0.46], [0.415, 0.4], [0.412, 0.26], [0.4, 0.16], [0.405, 0.12]],
      [0.05, 0.05, 0.035, 0.033, 0.042, 0.04], xf);
    const fF = joint(`fetlockF${S}`, kn, xf, 0.14, 0.45);
    lower(fF, 0.45, xf, S === "L");
    // hind leg: hip -> stifle -> hock -> fetlock
    const hip = joint(`hip${S}`, body, x * 0.14, 1.2, -0.8);
    seg(hip, [[-0.66, 1.45], [-0.58, 1.28], [-0.52, 1.1], [-0.5, 0.96], [-0.55, 0.86]], [[-0.98, 1.45], [-1.08, 1.28], [-1.1, 1.12], [-1.07, 0.98], [-1.02, 0.86]],
      [0.08, 0.15, 0.17, 0.15, 0.12], x * 0.13, { segs: 18, cap: 0.8 });
    const st = joint(`stifle${S}`, hip, xh, 0.88, -0.62);
    seg(st, [[-0.54, 0.94], [-0.58, 0.82], [-0.68, 0.68], [-0.8, 0.57], [-0.84, 0.53]], [[-1.02, 0.94], [-1.0, 0.8], [-0.99, 0.66], [-0.99, 0.57], [-0.98, 0.52]],
      [0.08, 0.095, 0.07, 0.06, 0.055], xh);
    const hk = joint(`hock${S}`, st, xh, 0.54, -0.92);
    seg(hk, [[-0.84, 0.6], [-0.86, 0.5], [-0.88, 0.4], [-0.88, 0.26], [-0.875, 0.16], [-0.88, 0.12]], [[-1.0, 0.6], [-0.98, 0.5], [-0.96, 0.4], [-0.955, 0.26], [-0.97, 0.16], [-0.965, 0.12]],
      [0.045, 0.05, 0.036, 0.034, 0.042, 0.04], xh);
    const fH = joint(`fetlockH${S}`, hk, xh, 0.14, -0.92);
    lower(fH, -0.92, xh, S === "R");
  }

  function pose(name) {
    const rows = POSES[name];
    if (!rows) throw new Error(`unknown pose "${name}" (${Object.keys(POSES).join(", ")})`);
    const table = { ...REST, ...rows };
    delete table.pos;
    for (const [j, [rx, ry, rz]] of Object.entries(table)) joints[j].rotation.set(rx * DEG, ry * DEG, rz * DEG);
    const P = { ...REST_POS, ...(rows.pos || {}) };
    for (const [j, [x, y, z]] of Object.entries(P)) {
      const pv = pivots[j];
      joints[j].position.set(pv[0] + x, pv[1] + y, pv[2] + z);
    }
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
