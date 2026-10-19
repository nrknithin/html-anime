// Shiba — a red Shiba Inu as anime draws it: fox wedge head, small upright triangle ears, almond eyes, the urajiro
// (cream cheeks, muzzle, throat, chest, belly, inner legs, tail underside) on a red-orange coat, a thick tail curled
// over the back, a compact square body on neat straight legs. Code model (no library Shiba; the library dog is a pug).
//
// Construction: every organic part is a two-rail loft authored in world side-view metres (rails [z, y], half-widths
// on X), as the wolf: a misfit is one number. The urajiro is a material group on the coat lofts (a test on each
// triangle's rest centroid), so it shares the coat's one hull and its edge is a clean colour break, not an ink line.
// Legs: one loft per segment, taper-through joints (knob on the upper segment). The tail is a tube along a curl,
// radius peaking mid-way, cream on the outside of the curl (the tail's underside shows when it is carried up).
//
// Proportions (H = withers height 0.39 m; Shiba standard height : length 10 : 11): trunk 1.1 H point of shoulder to
// buttock, chest depth 0.5 H, elbow 0.5 H, head 0.41 H long (authored 1:1, carried at x1.1) with the muzzle ~0.4 of it,
// skull top 1.4 H, ear tips 1.53 H, tail curl top 1.28 H. Landmarks (z, y m): withers (0.09, 0.39), croup
// (-0.155, 0.373), buttock z -0.215, nose tip z 0.38, chest bottom 0.195, front toes z 0.157, hind toes z -0.143.
//
// Two-tone pairs (noon script): coat accent #c4452d / iris #5c3d32; urajiro + inner ears + brow dots moon #fff6e4 /
// sky #f2d7ae; nose, eyes, lip line hair #241c16 (flat, no hull); eye shine practical #fffaf2; ink #2c261f.
//
// Rig: dog (scale group, opts.height) -> body -> neck -> head -> earL/R; body -> tail; per side shoulder -> elbow ->
// wrist -> paw and hip -> stifle -> hock -> foot. Signs: everything rotates about X; +rx swings a hanging part back
// (-Z) and pitches the body nose-down; neck and head point forward-up, so +rx lowers them. Tail and ears: ry swings.
//
// Poses: rest, sit (literal tables; legs solved). Clips (build() returns clips {name: seconds}; pose("walk@0.3")):
// idle 4 s (breathing, an ear twitch, slow tail sway), walk 0.8 s (lateral sequence LH LF RH RF; ground speed
// 0.33 m/s), run 0.4 s (rotary gallop, gathered suspension; 2.25 m/s), wag 0.6 s (happy: fast tail wag, bobbing head,
// ears eased back). Ground speeds are at the default size: scale them with { height }. In place: each paw
// follows a ground track; in stance the toe is held on y = 0 and carried back at the ground speed (the paw rolls about
// the toe), in swing a Hermite arc; a planar two-bone IK in the body frame places the wrist / hock, the pastern and
// paw take set world pitches. The body is lowered where a stance leg would over-reach, so planted toes never slide.
//
// Options: build(THREE, kit, colors, { height }) scales uniformly; height = top of the rest pose (ear tips), default
// meta.height (0.598 m, withers 0.39 m; a puppy is about { height: 0.35 }).

export const meta = {
  name: "shiba",
  height: 0.598,
  script: "noon",
  colors: {
    coat: "#c4452d", coatShade: "#5c3d32",
    cream: "#fff6e4", creamShade: "#f2d7ae",
    dark: "#241c16",
    shine: "#fffaf2",
  },
  poses: ["rest", "sit"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const C = { ...meta.colors, ...colors };
  const TAU = Math.PI * 2, D = Math.PI / 180;
  const spow = (v, e) => Math.sign(v) * Math.abs(v) ** e;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const lerpTab = (tab, z) => {
    if (z <= tab[0][0]) return tab[0][1];
    for (let i = 1; i < tab.length; i++)
      if (z <= tab[i][0]) return tab[i - 1][1] + ((tab[i][1] - tab[i - 1][1]) * (z - tab[i - 1][0])) / (tab[i][0] - tab[i - 1][0]);
    return tab[tab.length - 1][1];
  };

  // ---------- geometry helpers (as wolf.js) ----------
  function solid(pos, idx) {
    let v = 0;
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
      v += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1])
         - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c])
         + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
    }
    if (v < 0) for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
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
  function ringY({ y, w, f, b = f, p = 2, x = 0, z = 0 }, seg) {
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
  // tube along a Catmull-Rom curve; rad(t) radius, flat squashes the binormal axis
  // side(P, dir): optional, true puts that quad (ring centre P, outward direction dir) in material group 1; the split
  // runs along the quad edges, so the colour break is a clean line down the tube
  function tube(pts, rad, { steps = 10, seg = 8, dome = 0.5, flat = 1, side = null } = {}) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => V(...p)));
    const fr = curve.computeFrenetFrames(steps, false), rings = [], tags = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, P = curve.getPointAt(t), N = fr.normals[i], B = fr.binormals[i];
      const r = Math.max(typeof rad === "function" ? rad(t) : rad, 1e-4);
      rings.push(Array.from({ length: seg }, (_, j) => {
        const a = (j / seg) * TAU;
        return P.clone().addScaledVector(N, Math.cos(a) * r).addScaledVector(B, Math.sin(a) * r * flat).toArray();
      }));
      if (side && i < steps)
        for (let j = 0; j < seg; j++) {
          const a = ((j + 0.5) / seg) * TAU, g = side(P, N.clone().multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a))) ? 1 : 0;
          tags.push(g, g);
        }
    }
    const geo = skin(rings, { dome });
    if (side) {
      const ix = geo.index.array, bk = [[], []];
      for (let k = 0; k < ix.length / 3; k++) bk[tags[k] ?? 0].push(ix[3 * k], ix[3 * k + 1], ix[3 * k + 2]);
      geo.setIndex(bk.flat());
      geo.clearGroups();
      geo.addGroup(0, bk[0].length, 0);
      geo.addGroup(bk[0].length, bk[1].length, 1);
    }
    return { geo, curve };
  }
  // material groups by a test on each triangle's centroid (world rest coordinates, before part() translates)
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

  // ---------- rig ----------
  const { height = meta.height } = opts;
  const root = new THREE.Group();
  root.name = "root";
  const dog = new THREE.Group();
  dog.name = "dog";
  dog.scale.setScalar(height / meta.height);
  root.add(dog);
  const joints = {}, pivots = { dog: [0, 0, 0] };
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
  const COAT = { threshold: 0.12 };
  function part(j, geo, base, shade, o) {
    const p = pivots[j.name];
    geo.translate(-p[0], -p[1], -p[2]);
    const m = kit.toon(geo, base, shade, { ...COAT, ...o });
    j.add(m);
    return m;
  }
  // coat with the urajiro: group 0 coat, group 1 cream; one mesh, one hull
  function coated(j, geo, test, name) {
    groups(geo, (x, y, z) => (test(x, y, z) ? 1 : 0));
    const m = part(j, geo, C.coat, C.coatShade);
    m.material = [kit.cel(C.coat, C.coatShade, COAT), kit.cel(C.cream, C.creamShade, COAT)];
    if (name) m.name = name;
    return m;
  }

  const body = joint("body", dog, 0, 0.3, 0);
  const neck = joint("neck", body, 0, 0.34, 0.15);
  const head = joint("head", neck, 0, 0.435, 0.245);
  // the head is authored at 1:1 and carried 10 % larger and a little higher and back: a big round Shiba head on an
  // upright neck (the fox read came from a small head pushed forward, trial 2)
  head.userData.rest.add(V(0, 0.024, -0.014));
  head.scale.setScalar(1.1);
  const tail = joint("tail", body, 0, 0.352, -0.185);

  // --- trunk: top rail vs belly rail; cream belly, and a bib rising up the chest front ---
  const bodyMesh = coated(body, railLoft(
    [[0.19, 0.335], [0.15, 0.375], [0.09, 0.39], [0.0, 0.38], [-0.085, 0.376], [-0.155, 0.373], [-0.197, 0.345], [-0.215, 0.30]],
    [[0.205, 0.27], [0.17, 0.212], [0.09, 0.195], [0.0, 0.205], [-0.065, 0.232], [-0.135, 0.25], [-0.19, 0.268], [-0.215, 0.29]],
    [0.058, 0.08, 0.09, 0.085, 0.077, 0.079, 0.064, 0.026], { seg: 16 }),
    (x, y, z) => y < 0.228 + 0.04 * Math.max(0, -z - 0.05) || (z > 0.15 && y < 0.27 + (z - 0.15) * 1.4), "trunk");

  // --- neck: crest vs throat, thick (the Shiba's ruff); cream throat ---
  coated(neck, railLoft(
    [[0.248, 0.488], [0.2, 0.455], [0.145, 0.41], [0.095, 0.372]],
    [[0.282, 0.418], [0.268, 0.36], [0.235, 0.30], [0.18, 0.272]],
    [0.058, 0.075, 0.082, 0.07], { seg: 14 }),
    (x, y, z) => y < 0.3 + (z - 0.18) * 1.25 + 0.012 * Math.abs(x) / 0.07 || z > 0.262);

  // --- head: forehead / muzzle bridge vs jaw; the urajiro mask covers jaw, lips, muzzle sides and cheeks ---
  const MASK = [[0.225, 0.42], [0.255, 0.445], [0.285, 0.466], [0.31, 0.47], [0.335, 0.464], [0.36, 0.456], [0.39, 0.452]];
  coated(head, railLoft(
    [[0.228, 0.47], [0.255, 0.515], [0.285, 0.523], [0.31, 0.503], [0.33, 0.482], [0.35, 0.473], [0.368, 0.464]],
    [[0.228, 0.405], [0.255, 0.395], [0.285, 0.398], [0.31, 0.41], [0.33, 0.418], [0.35, 0.426], [0.366, 0.436]],
    [0.052, 0.076, 0.079, 0.062, 0.042, 0.031, 0.018], { seg: 18 }),
    (x, y, z) => y < lerpTab(MASK, z), "skull");
  const flat = (o = {}) => ({ outline: false, ...o });
  // nose, lip line
  const nose = new THREE.SphereGeometry(0.0125, 10, 8);
  nose.scale(1.1, 0.8, 0.9).translate(0, 0.462, 0.368);
  part(head, nose, C.dark, C.dark, flat());
  for (const s of [1, -1]) {
    part(head, tube([[0.003 * s, 0.44, 0.366], [0.017 * s, 0.431, 0.351], [0.027 * s, 0.433, 0.337]], 0.0026, { seg: 5, steps: 6 }).geo,
      C.dark, C.dark, flat());
    // almond eye, slanting up toward the ear; dark rim reads as the Shiba's black eye line; shine on the lit side
    const eye = new THREE.SphereGeometry(1, 12, 8);
    eye.scale(0.006, 0.0105, 0.019).rotateX(0.45).rotateY(0.5 * s).translate(0.044 * s, 0.485, 0.311);
    part(head, eye, C.dark, C.dark, flat());
    const shine = new THREE.SphereGeometry(0.0035, 6, 5);
    shine.translate(0.0485 * s, 0.4895, 0.315);
    part(head, shine, C.shine, C.shine, flat());
    // brow dots (the cream "eyebrows" of the urajiro)
    const brow = new THREE.SphereGeometry(1, 8, 6);
    brow.scale(0.004, 0.0055, 0.008).rotateY(0.6 * s).translate(0.038 * s, 0.499, 0.309);
    part(head, brow, C.cream, C.creamShade, flat());
  }
  // ears: small thick triangles, upright, a little forward and out; cream inside
  for (const [s, side] of [[1, "L"], [-1, "R"]]) {
    const ear = joint("ear" + side, head, 0.042 * s, 0.505, 0.262);
    const outer = new THREE.ConeGeometry(0.03, 0.062, 4, 1);
    outer.rotateY(Math.PI / 4).scale(1, 1, 0.6).translate(0, 0.028, 0).rotateX(0.15).rotateZ(-0.24 * s)
      .translate(0.042 * s, 0.505, 0.262);
    part(ear, outer, C.coat, C.coatShade);
    const inner = new THREE.ConeGeometry(0.02, 0.045, 4, 1);
    inner.rotateY(Math.PI / 4).scale(1, 1, 0.3).translate(0, 0.022, 0).rotateX(0.15).rotateZ(-0.24 * s)
      .translate(0.042 * s, 0.5055, 0.27);
    part(ear, inner, C.cream, C.creamShade, flat({ threshold: -0.3 }));
  }

  // --- tail: thick, curled up and forward over the back, tip resting on the left of the back ---
  const T = tube([[0, 0.335, -0.18], [0, 0.39, -0.222], [0.004, 0.448, -0.228], [0.012, 0.488, -0.195], [0.024, 0.497, -0.148],
    [0.036, 0.478, -0.105], [0.044, 0.445, -0.09], [0.044, 0.415, -0.105]],
  (t) => 0.029 + 0.016 * Math.sin(Math.PI * Math.min(1, t * 1.25)) - 0.022 * Math.max(0, t - 0.7) / 0.3,
  { steps: 18, seg: 10, side: (P, d) => d.y * (P.y - 0.44) + d.z * (P.z + 0.155) > 0.5 * Math.hypot(P.y - 0.44, P.z + 0.155) });
  const tailMesh = part(tail, T.geo, C.coat, C.coatShade);
  tailMesh.material = [kit.cel(C.coat, C.coatShade, COAT), kit.cel(C.cream, C.creamShade, COAT)];
  tailMesh.name = "tailCurl";

  // --- legs: rail loft per segment, taper-through; cream on the inner half and the paws ---
  const paw = (x, z, f) => loftY([
    { y: 0.0, w: 0.024, f, b: 0.02, x, z },
    { y: 0.014, w: 0.026, f: f + 0.002, b: 0.022, x, z },
    { y: 0.032, w: 0.02, f: f - 0.01, b: 0.019, x, z },
  ], 12, { dome: 0 });
  const LEGS = {};
  for (const [s, side] of [[1, "L"], [-1, "R"]]) {
    const X = 0.048 * s, HX = 0.047 * s;
    const inner = (lowY) => (x, y) => y < lowY || x * s < Math.abs(X) - 0.006;
    // fore: point of shoulder -> elbow -> wrist (carpus) -> paw
    const sh = joint("shoulder" + side, body, X, 0.29, 0.165);
    const el = joint("elbow" + side, sh, X, 0.195, 0.10);
    const wr = joint("wrist" + side, el, X, 0.06, 0.118);
    const pw = joint("paw" + side, wr, X, 0.025, 0.122);
    coated(sh, railLoft([[0.195, 0.335], [0.182, 0.27], [0.125, 0.205]], [[0.09, 0.335], [0.073, 0.26], [0.072, 0.198]],
      [0.012, 0.031, 0.025], { x0: X, seg: 12 }), inner(0));
    coated(el, railLoft([[0.13, 0.218], [0.138, 0.15], [0.14, 0.088], [0.139, 0.058]],
      [[0.07, 0.218], [0.09, 0.15], [0.097, 0.088], [0.099, 0.058]],
      [0.025, 0.022, 0.02, 0.021], { x0: X, seg: 10, steps: 3 }), inner(0.1));
    coated(wr, railLoft([[0.139, 0.072], [0.142, 0.03]], [[0.102, 0.072], [0.105, 0.03]], [0.018, 0.02], { x0: X, seg: 10 }),
      () => true);
    coated(pw, paw(X, 0.127, 0.03), () => true);
    // hind: hip -> stifle -> hock -> foot
    const hp = joint("hip" + side, body, HX, 0.31, -0.140);
    const st = joint("stifle" + side, hp, HX, 0.2, -0.095);
    const ho = joint("hock" + side, st, HX, 0.085, -0.190);
    const ft = joint("foot" + side, ho, HX, 0.025, -0.180);
    coated(hp, railLoft([[-0.075, 0.355], [-0.060, 0.28], [-0.075, 0.205]], [[-0.218, 0.335], [-0.212, 0.26], [-0.140, 0.188]],
      [0.014, 0.036, 0.026], { x0: HX, seg: 12 }), (x) => x * s < Math.abs(HX) - 0.008);
    coated(st, railLoft([[-0.078, 0.225], [-0.122, 0.155], [-0.168, 0.105], [-0.173, 0.082]],
      [[-0.145, 0.232], [-0.194, 0.16], [-0.218, 0.11], [-0.212, 0.07]],
      [0.027, 0.023, 0.019, 0.016], { x0: HX, seg: 10, steps: 3 }), (x, y, z) => x * s < Math.abs(HX) - 0.006 || z < -0.202);
    coated(ho, railLoft([[-0.170, 0.098], [-0.163, 0.03]], [[-0.209, 0.098], [-0.199, 0.03]], [0.017, 0.019], { x0: HX, seg: 10 }),
      () => true);
    coated(ft, paw(HX, -0.173, 0.03), () => true);
    LEGS[side + "F"] = { A: sh, B: el, Cj: wr, P: pw, toe: [0.157, 0] };
    LEGS[side + "H"] = { A: hp, B: st, Cj: ho, P: ft, toe: [-0.143, 0] };
  }
  // per leg: segment vectors in the sagittal plane [y, z], toe offset from the paw joint
  for (const L of Object.values(LEGS)) {
    L.u1 = [L.B.position.y, L.B.position.z];
    L.u2 = [L.Cj.position.y, L.Cj.position.z];
    L.r3 = [L.P.position.y, L.P.position.z];
    const pp = pivots[L.P.name];
    L.r4 = [L.toe[1] - pp[1], L.toe[0] - pp[2]];
    L.L1 = Math.hypot(...L.u1); L.L2 = Math.hypot(...L.u2);
  }

  // ---------- solver ----------
  const rot = ([y, z], a) => [y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
  const ang = ([y, z]) => Math.atan2(z, y);
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  // wrist / hock target in dog space for a toe at F = [z, y] with paw pitch psi and pastern pitch phi (rad)
  function wristTarget(L, F, psi, phi) {
    const r4 = rot(L.r4, psi), r3 = rot(L.r3, phi);
    return [F[1] - r4[0] - r3[0], F[0] - r4[1] - r3[1]]; // [y, z]
  }
  // A (upper pivot) in dog space [y, z]
  function upper(L) {
    const a = rot([L.A.position.y, L.A.position.z], body.rotation.x);
    return [a[0] + body.position.y, a[1] + body.position.z];
  }
  function solveLeg(L, F, psi, phi) {
    const Tw = wristTarget(L, F, psi, phi), bx = body.rotation.x;
    // into body space
    const t = rot([Tw[0] - body.position.y, Tw[1] - body.position.z], -bx);
    const A = [L.A.position.y, L.A.position.z], v = [t[0] - A[0], t[1] - A[1]];
    let d = Math.hypot(...v);
    const e = [v[0] / d, v[1] / d];
    d = Math.min(Math.max(d, Math.abs(L.L1 - L.L2) + 1e-4), L.L1 + L.L2 - 1e-5);
    const a = (L.L1 * L.L1 - L.L2 * L.L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L.L1 * L.L1 - a * a));
    const cr = (p, q) => p[0] * q[1] - p[1] * q[0], sgn = Math.sign(cr(L.u1, L.u2));
    let K = [e[0] * a - e[1] * h, e[1] * a + e[0] * h];
    if (Math.sign(cr(K, [e[0] * d - K[0], e[1] * d - K[1]])) !== sgn) K = [e[0] * a + e[1] * h, e[1] * a - e[0] * h];
    const tA = ang(K) - ang(L.u1), tAB = ang([e[0] * d - K[0], e[1] * d - K[1]]) - ang(L.u2);
    L.A.rotation.set(tA, 0, 0);
    L.B.rotation.set(tAB - tA, 0, 0);
    L.Cj.rotation.set(phi - bx - tAB, 0, 0);
    L.P.rotation.set(psi - phi, 0, 0);
  }
  // body height cap: the highest body y at which every stance leg reaches its wrist target with 2 % to spare
  function reachCap(stance) {
    let cap = Infinity;
    for (const [L, F, psi, phi] of stance) {
      const Tw = wristTarget(L, F, psi, phi), lim = 0.98 * (L.L1 + L.L2);
      const a = rot([L.A.position.y, L.A.position.z], body.rotation.x), dz = a[1] + body.position.z - Tw[1];
      if (Math.abs(dz) < lim) cap = Math.min(cap, Tw[0] + Math.sqrt(lim * lim - dz * dz) - a[0]);
    }
    return cap;
  }

  // ---------- poses and clips ----------
  // A frame: body [y offset, rx], neck, head [rx, ry, rz], ears [rx, ry, rz] each, tail [rx, ry, rz] (deg); feet: per leg
  // [toe z, toe y, paw pitch, pastern pitch] (deg). Missing feet stay where rest has them.
  const REST_FEET = { LF: [0.157, 0, 0, 0], RF: [0.157, 0, 0, 0], LH: [-0.143, 0, 0, 0], RH: [-0.143, 0, 0, 0] };
  const POSES = {
    rest: {},
    // sit: body pitched up 30 about the hips, haunches on the ground, hind paws flat ahead of the folded hocks,
    // forelegs straight under the shoulders; neck and head brought back to level
    sit: {
      body: [-0.128, -30, 0.012], neck: [16, 0, 0], head: [12, 0, 0], tail: [18, 0, 0],
      feet: { LF: [0.15, 0, 0, 2], RF: [0.15, 0, 0, 2], LH: [-0.06, 0, 0, -68], RH: [-0.06, 0, 0, -68] },
    },
  };
  const CLIPS = { idle: 4, walk: 0.8, run: 0.4, wag: 0.6 };
  // gait rows: duty = stance share; S = toe travel in stance (m); off = strike phase per leg; lift = swing height (m);
  // fore / hind pastern pitch [strike, toe-off], roll = paw pitch at toe-off, fold = extra pastern / paw pitch mid-swing.
  const GAIT = {
    walk: { duty: 0.64, S: 0.17, off: { LH: 0, LF: 0.25, RH: 0.5, RF: 0.75 }, zc: { F: 0.162, H: -0.145 },
      lift: { F: 0.035, H: 0.03 }, phiF: [-4, 14], phiH: [-6, 18], roll: { F: 40, H: 34 }, fold: { F: [55, 40], H: [10, 20] },
      drop: -0.008, bob: 0.004, pitch: 1.2 },
    run: { duty: 0.3, S: 0.27, off: { LH: 0, RH: 0.09, RF: 0.38, LF: 0.47 }, zc: { F: 0.19, H: -0.16 },
      lift: { F: 0.085, H: 0.07 }, phiF: [-10, 24], phiH: [-12, 26], roll: { F: 60, H: 50 }, fold: { F: [90, 75], H: [30, 45] },
      drop: -0.03, bob: 0.016, pitch: 8 },
  };
  function foot(g, key, ph) {
    const end = key[1], u = (((ph - g.off[key]) % 1) + 1) % 1, zc = g.zc[end], S = g.S, du = g.duty;
    const phiR = end === "F" ? g.phiF : g.phiH, roll = g.roll[end], rollT = 0.32 * du;
    const st = (uu) => {
      const s = uu / du;
      return [zc + S / 2 - S * s, 0, roll * ease((uu - (du - rollT)) / rollT), phiR[0] + (phiR[1] - phiR[0]) * ease(s)];
    };
    if (u < du) return { v: st(u), stance: true };
    const w = (u - du) / (1 - du), span = 1 - du, e = 1e-4;
    const a = st(du - e), a0 = st(du - 2 * e), b = st(0), b1 = st(e);
    const h = [2 * w ** 3 - 3 * w * w + 1, w ** 3 - 2 * w * w + w, -2 * w ** 3 + 3 * w * w, w ** 3 - w * w];
    const z = h[0] * a[0] + h[1] * ((a[0] - a0[0]) / e) * span + h[2] * b[0] + h[3] * ((b1[0] - b[0]) / e) * span;
    const y = g.lift[end] * Math.sin(Math.PI * Math.pow(w, 0.85)) ** 2;
    const bump = Math.sin(Math.PI * w);
    const [fp, fq] = g.fold[end];
    const psi = a[2] * (1 - ease(w)) + fq * bump, phi = a[3] * (1 - ease(w)) + b[3] * ease(w) + fp * bump;
    return { v: [z, y, Math.max(0, psi), phi], stance: false };
  }

  function apply(F) {
    for (const j of Object.values(joints)) { j.rotation.set(0, 0, 0); j.position.copy(j.userData.rest); }
    const b = F.body ?? [0, 0, 0];
    body.position.y += b[0];
    body.position.z += b[2] ?? 0;
    body.rotation.x = b[1] * D;
    for (const k of ["neck", "head", "tail", "earL", "earR"]) if (F[k]) joints[k].rotation.set(F[k][0] * D, F[k][1] * D, F[k][2] * D);
    const br = F.breath ?? 0;
    bodyMesh.scale.set(1 + 0.6 * br, 1 + br, 1);
    const feet = { ...REST_FEET, ...(F.feet ?? {}) }, stance = [];
    for (const [k, f] of Object.entries(feet)) if (f.stance !== false && f[1] === 0) stance.push([LEGS[k], f, f[2] * D, f[3] * D]);
    if (F.cap) {
      const cap = reachCap(stance);
      if (body.position.y > cap) body.position.y = cap;
    }
    for (const [k, f] of Object.entries(feet)) solveLeg(LEGS[k], f, f[2] * D, f[3] * D);
    root.updateMatrixWorld(true);
  }

  const cyc = (n, ph, lag = 0) => Math.cos(TAU * n * (ph - lag));
  const syc = (n, ph, lag = 0) => Math.sin(TAU * n * (ph - lag));
  function clip(name, t) {
    const Tn = CLIPS[name], ph = (((t % Tn) + Tn) % Tn) / Tn;
    if (name === "idle" || name === "wag") {
      const wag = name === "wag";
      // idle: two breaths, one ear twitch (left ear at 0.3, a quick flick back), a slow tail sway and head turn
      const b = syc(wag ? 2 : 3, ph), tw = Math.exp(-(((ph - 0.3) / 0.045) ** 2)), tw2 = Math.exp(-(((ph - 0.4) / 0.035) ** 2));
      const hop = wag ? 0.5 - 0.5 * cyc(3, ph, 0.08) : 0;
      return {
        body: [0.0015 * b - 0.004 * hop, -0.6 * b - (wag ? 2 * hop : 0), 0], breath: 0.012 * b,
        neck: [0.8 * b - (wag ? 4 * hop : 0), 0, 0],
        head: wag ? [-4 * hop, 6 * syc(1, ph), 7 * syc(1, ph, 0.1)] : [-0.5 * b, 9 * syc(1, ph, 0.15), 3 * syc(1, ph, 0.2)],
        earL: wag ? [-14 - 4 * hop, 0, 0] : [-22 * tw - 10 * tw2, 0, 8 * tw], earR: wag ? [-14 - 4 * hop, 0, 0] : [0, 0, 0],
        tail: wag ? [-4 + 3 * hop, 28 * syc(3, ph), 10 * syc(3, ph, 0.04)] : [1.5 * b, 7 * syc(1, ph, 0.3), 3 * syc(1, ph, 0.35)],
      };
    }
    const g = GAIT[name], feet = {};
    for (const k of Object.keys(g.off)) {
      const f = foot(g, k, ph);
      feet[k] = f.v;
      if (!f.stance) feet[k].stance = false;
    }
    const run = name === "run";
    return {
      cap: true,
      // run: body lowest and nose-down as the fores land, nose-up as the hinds push into the gathered suspension
      body: run ? [g.drop + g.bob * cyc(1, ph, 0.85), g.pitch * syc(1, ph, 0.1), 0] : [g.drop - g.bob * cyc(4, ph, 0.05), g.pitch * syc(2, ph), 0],
      neck: run ? [16 - 8 * syc(1, ph, 0.1), 0, 0] : [2 + 2 * cyc(4, ph, 0.1), 0, 0],
      head: run ? [-6 - 6 * syc(1, ph, 0.25), 0, 0] : [-1.5 - 1.5 * cyc(4, ph, 0.15), 2 * syc(1, ph), 0],
      earL: run ? [-42, 0, -8] : [-3, 0, 0], earR: run ? [-42, 0, 8] : [-3, 0, 0],
      tail: run ? [6 * cyc(1, ph), 6 * syc(1, ph), 0] : [2 * cyc(2, ph), 8 * syc(1, ph, 0.1), 4 * syc(1, ph, 0.15)],
      feet,
    };
  }

  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`shiba: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      return apply(clip(m[1], +m[2]));
    }
    if (!POSES[name]) throw new Error(`shiba: unknown pose "${name}" (${Object.keys(POSES).join(", ")}, or <clip>@<seconds>)`);
    apply(POSES[name]);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
