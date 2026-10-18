// Wolf — a moonlit silver wolf, built from the html-anime-model skill as its validation build.
//
// Construction: every organic part is a two-rail loft authored in world side-view metres read off the
// side reference (rails [z, y], half-widths on X), so a landmark miss in the edge overlay is one number.
// Legs are rail lofts per segment with taper-through joints (knob on the upper segment, lower starts inside).
// Ears are flattened cones, eyes/nose/lip line small dark-and-amber parts on the head.
//
// Proportions (H = withers height 0.75 m): elbow 0.49 H, chest depth ~0.52 H, trunk 1.3 H shoulder-point to
// buttock, head 0.33 H, ear tips 1.16 H, tail hanging to 0.3 H. Side photo mapped at 1.485 mm/px (crop height =
// bbox height 0.87 m); nose z +0.60, tail rear z -0.61.
//
// Two-tone pairs (indigo script): coat moon/sky; saddle + mask sky/sky as material groups on the coat lofts
// (hair would be as dark as ink); inner ears line/sky; nose, lips, pupils, lids hair/ink; eyes iris.

export const meta = {
  name: "wolf",
  height: 0.887,
  script: "indigo",
  colors: {
    coat: "#d5e2ff", coatShade: "#1b2d6b",
    pale: "#e7eefc", paleShade: "#1b2d6b",
    saddle: "#1b2d6b",
    dark: "#16141c", darkShade: "#101628",
    eye: "#e7a04a",
  },
  poses: ["rest", "run-a", "run-b", "howl"],
};

export function build(THREE, kit, colors = meta.colors) {
  const C = colors;
  const TAU = Math.PI * 2;
  const spow = (v, e) => Math.sign(v) * Math.abs(v) ** e;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

  function geom(pos, idx) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  function solid(pos, idx) {
    let v = 0;
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
      v += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1])
         - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c])
         + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
    }
    if (v < 0) for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    return geom(pos, idx);
  }
  function skin(rings, { dome = 0.5 } = {}) {
    const seg = rings[0].length, R = rings.length, pos = rings.flat(2), idx = [];
    for (let i = 0; i < R - 1; i++) {
      const k = (i + 1) * seg;
      for (let j = 0; j < seg; j++) {
        const a = i * seg + j, b = i * seg + ((j + 1) % seg), c = k + j, d = k + ((j + 1) % seg);
        idx.push(a, b, c, b, d, c);
      }
    }
    const mid = (r) => r.reduce((s, p) => [s[0] + p[0] / seg, s[1] + p[1] / seg, s[2] + p[2] / seg], [0, 0, 0]);
    for (const [k, nb, first] of [[0, 1, true], [R - 1, R - 2, false]]) {
      const m = mid(rings[k]), n = mid(rings[nb]);
      const d = [m[0] - n[0], m[1] - n[1], m[2] - n[2]], dl = Math.hypot(...d) || 1;
      const rad = rings[k].reduce((s, p) => s + Math.hypot(p[0] - m[0], p[1] - m[1], p[2] - m[2]), 0) / seg;
      const c = pos.length / 3;
      pos.push(...m.map((v, i) => v + (d[i] / dl) * rad * dome));
      for (let j = 0; j < seg; j++) {
        const a = k * seg + j, b = k * seg + ((j + 1) % seg);
        if (first) idx.push(c, b, a); else idx.push(c, a, b);
      }
    }
    return solid(pos, idx);
  }
  function ringY({ y, w, f, b = f, p = 2, x = 0, z = 0 }, seg = 12) {
    const e = 2 / p, pts = [];
    for (let i = 0; i < seg; i++) {
      const t = (i / seg) * TAU;
      pts.push([x + w * spow(Math.cos(t), e), y, z + (Math.sin(t) >= 0 ? f : b) * spow(Math.sin(t), e)]);
    }
    return pts;
  }
  const loftY = (rings, seg, o) => skin(rings.map((r) => ringY(r, seg)), o);
  function spline(keys, steps) {
    const out = [], n = keys.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = keys[Math.max(i - 1, 0)], p1 = keys[i], p2 = keys[i + 1], p3 = keys[Math.min(i + 2, n - 1)];
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        out.push(0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t ** 3));
      }
    }
    out.push(keys[n - 1]);
    return out;
  }
  // A, B: rails [[z, y], ...]; W: half-widths on X. Rings span X and the A-B vector.
  function railLoft(A, B, W, { steps = 4, seg = 16, n = 2.2, x0 = 0, dome = 0.5 } = {}) {
    const sp = (k) => spline(k, steps);
    const az = sp(A.map((p) => p[0])), ay = sp(A.map((p) => p[1])), bz = sp(B.map((p) => p[0])), by = sp(B.map((p) => p[1])), ww = sp(W);
    const rings = az.map((_, i) => {
      const cz = (az[i] + bz[i]) / 2, cy = (ay[i] + by[i]) / 2, dz = (az[i] - bz[i]) / 2, dy = (ay[i] - by[i]) / 2;
      return Array.from({ length: seg }, (_, s) => {
        const t = (s / seg) * TAU, u = spow(Math.cos(t), 2 / n), v = spow(Math.sin(t), 2 / n);
        return [x0 + ww[i] * u, cy + dy * v, cz + dz * v];
      });
    });
    return skin(rings, { dome });
  }
  // up: the flattened axis points along it (a fur tuft lies flat on the cheek when up points out of the head)
  function tube(pts, r0, r1, { steps = 10, seg = 6, dome = 0.5, flat = 1, up = null } = {}) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => V(...p)));
    const fr = up ? null : curve.computeFrenetFrames(steps, false), rings = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, P = curve.getPointAt(t), T = curve.getTangentAt(t);
      const N = up ? V().crossVectors(T, up).normalize() : fr.normals[i];
      const B = V().crossVectors(T, N).normalize();
      const r = Math.max(r0 + (r1 - r0) * t, 1e-4);
      rings.push(Array.from({ length: seg }, (_, j) => {
        const a = (j / seg) * TAU;
        return P.clone().addScaledVector(N, Math.cos(a) * r).addScaledVector(B, Math.sin(a) * r * flat).toArray();
      }));
    }
    return skin(rings, { dome: r1 > 0 ? dome : 0 });
  }
  // Sort triangles into material groups by a test on the centroid (world rest coordinates, before part() translates).
  function groups(g, test) {
    const p = g.attributes.position, ix = g.index.array, buckets = [];
    for (let i = 0; i < ix.length; i += 3) {
      let cx = 0, cy = 0, cz = 0;
      for (let k = 0; k < 3; k++) { cx += p.getX(ix[i + k]) / 3; cy += p.getY(ix[i + k]) / 3; cz += p.getZ(ix[i + k]) / 3; }
      (buckets[test(cx, cy, cz)] ??= []).push(ix[i], ix[i + 1], ix[i + 2]);
    }
    g.setIndex(buckets.flat());
    g.clearGroups();
    let start = 0;
    buckets.forEach((b, k) => { if (b) { g.addGroup(start, b.length, k); start += b.length; } });
    return g;
  }

  // --- rig helpers (world rest coordinates) ---
  const root = new THREE.Group();
  const joints = {}, pivots = { root: [0, 0, 0] };
  root.name = "root";
  function joint(name, parent, x, y, z) {
    const g = new THREE.Group();
    g.name = name;
    const pp = pivots[parent.name] ?? [0, 0, 0];
    g.position.set(x - pp[0], y - pp[1], z - pp[2]);
    g.userData.rest = g.position.clone();
    parent.add(g);
    joints[name] = g;
    pivots[name] = [x, y, z];
    return g;
  }
  function part(j, geo, base, shade, opts) {
    const p = pivots[j.name];
    geo.translate(-p[0], -p[1], -p[2]);
    const m = kit.toon(geo, base, shade, opts);
    j.add(m);
    return m;
  }
  // Coat with a dark saddle: group 0 coat, group 1 saddle. One mesh, one hull (the hull ignores groups).
  const SADDLE = [C.saddle, C.saddle];
  function coated(j, geo, test) {
    groups(geo, (x, y, z) => (test(x, y, z) ? 1 : 0));
    const m = part(j, geo, C.coat, C.coatShade);
    m.material = [kit.cel(C.coat, C.coatShade), kit.cel(...SADDLE)];
    return m;
  }

  const body = joint("body", root, 0, 0.6, 0);
  const neck = joint("neck", body, 0, 0.64, 0.22);
  const head = joint("head", neck, 0, 0.7, 0.42);
  const tail = joint("tail", body, 0, 0.69, -0.56);

  // --- trunk: top rail vs belly rail ---
  // deep chest, tucked waist; the saddle is the top third from withers to croup
  coated(body, railLoft(
    [[0.30, 0.66], [0.24, 0.72], [0.13, 0.745], [-0.09, 0.735], [-0.28, 0.74], [-0.43, 0.73], [-0.535, 0.685], [-0.58, 0.60]],
    [[0.44, 0.47], [0.38, 0.39], [0.22, 0.355], [-0.02, 0.37], [-0.24, 0.43], [-0.40, 0.48], [-0.52, 0.52], [-0.58, 0.58]],
    [0.08, 0.12, 0.145, 0.125, 0.095, 0.11, 0.095, 0.04], { seg: 18 }), (x, y, z) => y > 0.672 && z > -0.52);

  // --- neck: crest vs throat; its back end is narrower and sunk inside the barrel's slanted front ---
  coated(neck, railLoft(
    [[0.42, 0.775], [0.34, 0.765], [0.25, 0.745], [0.17, 0.70]],
    [[0.46, 0.585], [0.455, 0.53], [0.44, 0.49], [0.37, 0.50]],
    [0.06, 0.09, 0.10, 0.07], { seg: 16 }), (x, y, z) => y > 0.672 && z < 0.40);

  // --- head: forehead/muzzle top vs jaw; the mask is dark above a line from the eyes down the bridge ---
  coated(head, railLoft(
    [[0.37, 0.755], [0.425, 0.78], [0.47, 0.775], [0.515, 0.718], [0.55, 0.69], [0.585, 0.66]],
    [[0.37, 0.62], [0.425, 0.585], [0.47, 0.585], [0.515, 0.598], [0.55, 0.607], [0.582, 0.628]],
    [0.05, 0.08, 0.072, 0.045, 0.034, 0.024], { seg: 16 }), (x, y, z) => y > 0.71 - 0.55 * Math.max(0, z - 0.44));
  // nose, lip line, eyes
  const nose = new THREE.SphereGeometry(0.016, 10, 8);
  nose.scale(1.1, 0.8, 0.9).translate(0, 0.656, 0.578);
  part(head, nose, C.dark, C.darkShade, { outline: false });
  for (const s of [1, -1]) {
    part(head, tube([[0.02 * s, 0.626, 0.578], [0.04 * s, 0.612, 0.53], [0.05 * s, 0.618, 0.48]], 0.004, 0.003),
      C.dark, C.dark, { outline: false });
    // almond eye slanting up toward the ear (+rx drops the front end), pupil, dark upper lid
    const eye = new THREE.SphereGeometry(1, 10, 8);
    eye.scale(0.006, 0.014, 0.024).rotateX(0.3).translate(0.063 * s, 0.716, 0.47);
    part(head, eye, C.eye, C.eye, { outline: false });
    const pupil = new THREE.SphereGeometry(1, 8, 6);
    pupil.scale(0.004, 0.009, 0.008).translate(0.068 * s, 0.716, 0.472);
    part(head, pupil, C.dark, C.dark, { outline: false });
    // lid traces the rotated eye's upper edge: front end (z+0.023, y-0.007), top (z+0.004, y+0.013), back (z-0.023, y+0.007)
    part(head, tube([[0.066 * s, 0.711, 0.494], [0.0695 * s, 0.731, 0.474], [0.068 * s, 0.725, 0.447]], 0.0028, 0.0018),
      C.dark, C.dark, { outline: false });
    // cheek ruff: one solid flattened cone per side, tip swept back and down from the jaw angle (two thin
    // flat tubes here drew crossing ink lines that read as scribbles, trial 3)
    const ruff = new THREE.ConeGeometry(0.034, 0.1, 6);
    ruff.scale(0.45, 1, 1).rotateX(-2.2).rotateY(-0.5 * s).translate(0.08 * s, 0.6, 0.405);
    part(head, ruff, C.coat, C.coatShade);
    // ears: flattened cones, tilted out and back
    const ear = new THREE.ConeGeometry(0.035, 0.11, 8);
    ear.scale(1, 1, 0.45).rotateZ(-0.25 * s).rotateX(-0.12).translate(0.045 * s, 0.82, 0.43);
    part(head, ear, C.coat, C.coatShade);
    const inner = new THREE.ConeGeometry(0.022, 0.075, 8);
    inner.scale(1, 1, 0.3).rotateZ(-0.25 * s).rotateX(-0.12).translate(0.044 * s, 0.81, 0.438);
    part(head, inner, C.pale, C.paleShade, { outline: false });
  }

  // --- tail: bushy, widest mid-length ---
  coated(tail, railLoft(
    [[-0.545, 0.69], [-0.56, 0.55], [-0.55, 0.42], [-0.545, 0.30], [-0.56, 0.22]],
    [[-0.575, 0.70], [-0.605, 0.56], [-0.615, 0.42], [-0.61, 0.30], [-0.585, 0.22]],
    [0.03, 0.045, 0.055, 0.05, 0.015], { seg: 12 }), (x, y, z) => y < 0.29 || z < -0.598);

  // --- legs: rail lofts per segment, taper-through joints ---
  const paw = (x, z) => loftY([
    { y: 0.0, w: 0.026, f: 0.042, b: 0.02, x, z },
    { y: 0.022, w: 0.03, f: 0.046, b: 0.024, x, z },
    { y: 0.045, w: 0.022, f: 0.028, b: 0.02, x, z },
  ], 12, { dome: 0 });
  for (const s of [1, -1]) {
    const X = 0.075 * s, side = s > 0 ? "L" : "R";
    // fore: the carpus knob belongs to the forearm, which then tapers inside the pastern (taper-through)
    const sh = joint("shoulder" + side, body, X, 0.58, 0.17);
    const el = joint("elbow" + side, sh, X, 0.37, 0.105);
    const ca = joint("carpus" + side, el, X, 0.15, 0.08);
    part(sh, railLoft([[0.26, 0.62], [0.22, 0.50], [0.15, 0.40]], [[0.11, 0.62], [0.075, 0.50], [0.075, 0.385]],
      [0.05, 0.048, 0.03], { x0: X, seg: 12 }), C.coat, C.coatShade);
    part(el, railLoft([[0.14, 0.41], [0.13, 0.30], [0.11, 0.19], [0.105, 0.15], [0.10, 0.115]],
      [[0.075, 0.41], [0.075, 0.30], [0.065, 0.19], [0.06, 0.15], [0.07, 0.115]],
      [0.026, 0.023, 0.019, 0.022, 0.012], { x0: X, seg: 10 }), C.coat, C.coatShade);
    part(ca, railLoft([[0.10, 0.17], [0.105, 0.08], [0.11, 0.035]], [[0.068, 0.17], [0.066, 0.08], [0.07, 0.035]],
      [0.015, 0.017, 0.02], { x0: X, seg: 10 }), C.coat, C.coatShade);
    part(ca, paw(X, 0.09), C.coat, C.coatShade);

    // hind: the hock knob belongs to the gaskin, the metatarsus starts inside it at <= 80 % girth
    const HX = 0.08 * s;
    const hip = joint("hip" + side, body, HX, 0.6, -0.43);
    const st = joint("stifle" + side, hip, HX, 0.4, -0.29);
    const ho = joint("hock" + side, st, HX, 0.17, -0.41);
    part(hip, railLoft([[-0.32, 0.62], [-0.265, 0.48], [-0.265, 0.38]], [[-0.565, 0.60], [-0.51, 0.46], [-0.39, 0.36]],
      [0.06, 0.065, 0.045], { x0: HX, seg: 12 }), C.coat, C.coatShade);
    part(st, railLoft([[-0.275, 0.41], [-0.32, 0.28], [-0.36, 0.19], [-0.365, 0.15]],
      [[-0.37, 0.43], [-0.42, 0.30], [-0.435, 0.19], [-0.415, 0.14]],
      [0.04, 0.03, 0.024, 0.012], { x0: HX, seg: 10 }), C.coat, C.coatShade);
    part(ho, railLoft([[-0.36, 0.21], [-0.355, 0.08], [-0.35, 0.035]], [[-0.41, 0.21], [-0.40, 0.08], [-0.39, 0.035]],
      [0.017, 0.019, 0.021], { x0: HX, seg: 10 }), C.coat, C.coatShade);
    part(ho, paw(HX, -0.365), C.coat, C.coatShade);
  }

  // --- poses: degrees [rx, ry, rz], absolute over REST (all zero) ---
  // Signs: legs and tail hang (-Y): +rx swings back (-Z). Neck/head point forward-up: +rx lowers, -rx lifts.
  // body points +Z: +rx pitches the nose down. pos: body offset in metres (grounded with the probe).
  const D = Math.PI / 180;
  const POSES = {
    rest: {},
    // gathered (suspension): fores tucked back under the chest, hinds reaching under the belly, back rounded
    // (trial 5: carpus 60-70 flipped the paws into stubs and the folded legs bunched like sticks; open the reach)
    "run-a": {
      pos: [0, -0.07, 0],
      body: [-6, 0, 0], neck: [8, 0, 0], head: [-4, 0, 0], tail: [35, 0, 0],
      shoulderL: [30, 0, 0], elbowL: [10, 0, 0], carpusL: [35, 0, 0],
      shoulderR: [38, 0, 0], elbowR: [12, 0, 0], carpusR: [45, 0, 0],
      hipL: [-55, 0, 0], stifleL: [25, 0, 0], hockL: [-20, 0, 0],
      hipR: [-45, 0, 0], stifleR: [20, 0, 0], hockR: [-15, 0, 0],
    },
    // extension: fores reaching, hinds stretched back, one hind still on the ground
    "run-b": {
      pos: [0, -0.017, 0],
      body: [4, 0, 0], neck: [18, 0, 0], head: [-12, 0, 0], tail: [55, 0, 0],
      shoulderL: [-55, 0, 0], elbowL: [10, 0, 0], carpusL: [5, 0, 0],
      shoulderR: [-45, 0, 0], elbowR: [12, 0, 0], carpusR: [10, 0, 0],
      hipL: [45, 0, 0], stifleL: [-10, 0, 0], hockL: [20, 0, 0],
      hipR: [35, 0, 0], stifleR: [-5, 0, 0], hockR: [15, 0, 0],
    },
    // standing howl: neck and head lifted until the muzzle points at the sky
    // (trial 5: neck -45 exposed its hidden root and the head's back dome; move the lift into the head)
    howl: { neck: [-28, 0, 0], head: [-52, 0, 0], tail: [15, 0, 0] },
  };
  function pose(name) {
    const P = POSES[name] ?? {};
    for (const [k, j] of Object.entries(joints)) {
      const r = P[k] ?? [0, 0, 0];
      j.rotation.set(r[0] * D, r[1] * D, r[2] * D);
      j.position.copy(j.userData.rest);
    }
    if (P.pos) body.position.add(V(...P.pos));
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
