// Husky — a black-and-white Siberian Husky as anime draws it: the white face mask under a dark cap (a widow's peak
// down the forehead, white "eyebrow" spots, white goggles round pale ice-blue almond eyes, white muzzle and cheeks),
// medium triangular ears set high and close, a thick neck ruff, a bushy sickle tail carried up over the back, a
// longer and deeper frame than a spitz on long straight legs. Code model (no free library husky), derived from
// models/shiba.js: same lofts, solver and gait tracks, re-proportioned and re-marked.
//
// Construction: every organic part is a two-rail loft authored in side-view metres (rails [z, y], half-widths on X).
// The trunk, neck, legs and tail are authored on the Shiba's rails and stretched by one monotone map (Z x1.1; Y x1.12
// below the elbow line y 0.2, +0.024 above it), so the legs grow longer and the chest deeper without re-authoring a
// rail; joints are mapped the same way, and the mapped vertices keep their winding. The head (and its ears and jaw) is
// authored unmapped in its own frame and scaled as one piece. The mask and saddle are material groups on the coat
// lofts (a test on each triangle's rest centroid), so they share the coat's one hull and break cleanly. The lower jaw
// is its own loft on a hinge, closed at rest (its seam is the lip line), dropped open over a dark mouth for the howl.
//
// Proportions (H = withers height 0.56 m, dog units x1.353 = metres): trunk ~1.1 H point of shoulder to buttock,
// chest depth 0.49 H, elbow 0.53 H, head 0.44 H with the muzzle about half of it, ear tips 1.47 H, tail sickle top
// ~1.4 H. Landmarks (z, y m): withers (0.134, 0.56), croup (-0.231, 0.537), chest bottom 0.288, nose tip z 0.60.
//
// Two-tone pairs (indigo script): saddle, cap, ears and tail top sky #1b2d6b flat (sky / sky: the script has no dark
// tone lighter than ink for a shade; hair would sit on the ink); mask, chest, belly, legs, inner ears, eyebrow spots
// line #e7eefc / moon #d5e2ff; eyes moon #d5e2ff iris; nose, pupils, eye rims, mouth hair #16141c (flat, no hull); eye
// shine sclera #f6f3ee; ink #101628.
//
// Rig: dog (scale group, opts.height) -> body -> neck -> head -> earL/R, jaw; body -> tail; per side shoulder ->
// elbow -> wrist -> paw and hip -> stifle -> hock -> foot. Signs: everything rotates about X; +rx swings a hanging part
// back (-Z) and pitches the body nose-down; neck and head point forward-up, so +rx lowers them; +rx opens the jaw.
// Tail and ears: ry swings.
//
// Poses: rest, sit, howl (sitting, muzzle up ~60 deg, jaw open). Clips (build() returns clips {name: seconds};
// pose("walk@0.3")): idle 4 s (breathing, an ear twitch, slow tail sway), walk 0.9 s (lateral sequence LH LF RH RF;
// ground speed 0.44 m/s), run 0.42 s (rotary gallop, gathered suspension; 3.2 m/s), wag 0.6 s (happy: tail wag,
// bobbing head, ears eased back). Ground speeds are at the default size: scale them with { height }. In place: each
// paw follows a ground track; in stance the toe is held on y = 0 and carried back at the ground speed (the paw rolls
// about the toe), in swing a Hermite arc; a planar two-bone IK in the body frame places the wrist / hock, the pastern
// and paw take set world pitches. The body is lowered where a stance leg would over-reach, so planted toes never slide.
//
// Options: build(THREE, kit, colors, { height }) scales uniformly; height = top of the rest pose (ear tips), default
// meta.height (0.825 m, withers 0.56 m; a pup is about { height: 0.45 }).

export const meta = {
  name: "husky",
  height: 0.825,
  script: "indigo",
  colors: {
    coat: "#1b2d6b", coatShade: "#1b2d6b",
    white: "#e7eefc", whiteShade: "#d5e2ff",
    eye: "#d5e2ff",
    dark: "#16141c",
    shine: "#f6f3ee",
  },
  poses: ["rest", "sit", "howl"],
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
  // dog units: the Shiba's side-view rails, stretched by one monotone map (longer legs, deeper chest, longer trunk)
  const KX = 1.08, KZ = 1.1, KL = 1.12, Y0 = 0.2, G = 1.3527;
  const mz = (z) => z * KZ, my = (y) => (y < Y0 ? y * KL : y + (KL - 1) * Y0);
  function mapGeo(g) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * KX, my(p.getY(i)), mz(p.getZ(i)));
    p.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }
  const { height = meta.height } = opts;
  const root = new THREE.Group();
  root.name = "root";
  const dog = new THREE.Group();
  dog.name = "dog";
  dog.scale.setScalar((G * height) / meta.height);
  root.add(dog);
  const joints = {}, pivots = { dog: [0, 0, 0] };
  // raw: pivot and geometry in the head's own unmapped frame (head, ears, jaw)
  function joint(name, parent, x, y, z, raw = parent.userData.raw) {
    const g = new THREE.Group();
    g.name = name;
    g.userData.raw = raw;
    const pp = pivots[parent.name] ?? [0, 0, 0];
    const at = raw ? [x, y, z] : [x * KX, my(y), mz(z)];
    g.position.set(at[0] - pp[0], at[1] - pp[1], at[2] - pp[2]);
    g.userData.rest = g.position.clone();
    parent.add(g);
    joints[name] = g;
    pivots[name] = at;
    return g;
  }
  const COAT = { threshold: 0.12 };
  function part(j, geo, base, shade, o) {
    if (!j.userData.raw) mapGeo(geo);
    const p = pivots[j.name];
    geo.translate(-p[0], -p[1], -p[2]);
    const m = kit.toon(geo, base, shade, { ...COAT, ...o });
    j.add(m);
    return m;
  }
  // coat with the white: group 0 dark coat, group 1 white; one mesh, one hull. Tests run on raw (unmapped) centroids.
  function coated(j, geo, test, name) {
    groups(geo, (x, y, z) => (test(x, y, z) ? 1 : 0));
    const m = part(j, geo, C.coat, C.coatShade);
    m.material = [kit.cel(C.coat, C.coatShade, COAT), kit.cel(C.white, C.whiteShade, COAT)];
    if (name) m.name = name;
    return m;
  }

  const body = joint("body", dog, 0, 0.3, 0);
  const neck = joint("neck", body, 0, 0.34, 0.15);
  // the head: authored unmapped about its pivot, then placed at the mapped pivot, a touch forward of the Shiba's
  // upright carriage (a husky carries the head forward on an arched neck)
  const HP = [0, 0.435, 0.245];
  const head = joint("head", neck, ...HP, true);
  head.position.set(0, my(HP[1]) - pivots.neck[1] + 0.006, mz(HP[2]) - pivots.neck[2] + 0.004);
  head.userData.rest = head.position.clone();
  head.scale.setScalar(1.04);
  const HEAD_RX = 6; // the muzzle carried level, not raised: added to every pose's head pitch
  const tail = joint("tail", body, 0, 0.352, -0.185);

  // --- trunk: top rail vs belly rail; white belly and lower flanks, and a bib rising up the chest front ---
  const bodyMesh = coated(body, railLoft(
    [[0.19, 0.335], [0.15, 0.375], [0.09, 0.39], [0.0, 0.382], [-0.085, 0.378], [-0.155, 0.373], [-0.197, 0.345], [-0.215, 0.30]],
    [[0.205, 0.27], [0.17, 0.21], [0.09, 0.19], [0.0, 0.198], [-0.065, 0.226], [-0.135, 0.248], [-0.19, 0.266], [-0.215, 0.29]],
    [0.066, 0.086, 0.092, 0.085, 0.076, 0.078, 0.064, 0.026], { seg: 16 }),
    (x, y, z) => y < 0.245 + 0.035 * Math.max(0, -z - 0.05) || (z > 0.14 && y < 0.285 + (z - 0.14) * 1.4), "trunk");

  // --- neck: crest vs throat, thick with the ruff; white throat and a white collar flash up the sides ---
  coated(neck, railLoft(
    [[0.252, 0.49], [0.2, 0.46], [0.145, 0.414], [0.095, 0.374]],
    [[0.284, 0.414], [0.272, 0.356], [0.237, 0.296], [0.18, 0.268]],
    [0.066, 0.086, 0.088, 0.062], { seg: 14 }),
    (x, y, z) => y < 0.296 + (z - 0.18) * 1.3 + 0.02 * Math.abs(x) / 0.09 || z > 0.262);

  // --- head (unmapped): forehead / muzzle bridge vs the lip line; the jaw is its own loft below ---
  // mask: white below the cap line, white goggles round the eyes, a dark widow's peak down the forehead to the stop
  const CAP = [[0.22, 0.415], [0.25, 0.44], [0.27, 0.462], [0.29, 0.482], [0.31, 0.494], [0.325, 0.5], [0.34, 0.53]];
  const EYE = [0.046, 0.481, 0.307];
  const capped = (x, y, z) => {
    const ax = Math.abs(x), peak = ax < 0.016 && z < 0.345 ? 0.03 : ax < 0.026 && z < 0.335 ? 0.012 : 0;
    const goggle = Math.hypot((ax - EYE[0]) / 1.3, y - EYE[1], (z - EYE[2]) / 1.4) < 0.0165;
    return y > lerpTab(CAP, z) - peak && !goggle;
  };
  coated(head, railLoft(
    [[0.226, 0.47], [0.255, 0.516], [0.285, 0.524], [0.31, 0.504], [0.335, 0.486], [0.36, 0.477], [0.383, 0.469], [0.4, 0.458]],
    [[0.226, 0.405], [0.255, 0.4], [0.285, 0.408], [0.31, 0.42], [0.335, 0.428], [0.36, 0.433], [0.383, 0.437], [0.398, 0.441]],
    [0.052, 0.076, 0.078, 0.06, 0.041, 0.033, 0.026, 0.015], { seg: 18 }),
    (x, y, z) => !capped(x, y, z), "skull");
  const flat = (o = {}) => ({ outline: false, ...o });
  // jaw: hinged under the ear; closed it tucks inside the head, its top seam the lip line
  const jaw = joint("jaw", head, 0, 0.42, 0.262);
  const jawMesh = part(jaw, railLoft(
    [[0.255, 0.43], [0.29, 0.425], [0.33, 0.43], [0.36, 0.435], [0.388, 0.44]],
    [[0.255, 0.4], [0.29, 0.397], [0.33, 0.408], [0.36, 0.415], [0.385, 0.425]],
    [0.05, 0.042, 0.032, 0.026, 0.016], { seg: 12, steps: 3 }), C.white, C.whiteShade);
  jawMesh.name = "jaw";
  // mouth: dark wedge inside the muzzle, shown only when the jaw is open
  const mouthGeo = railLoft([[0.27, 0.437], [0.32, 0.437], [0.37, 0.441], [0.388, 0.443]],
    [[0.27, 0.405], [0.32, 0.4], [0.37, 0.405], [0.388, 0.428]], [0.03, 0.028, 0.02, 0.01], { seg: 10, steps: 2 });
  const mouth = part(head, mouthGeo, C.dark, C.dark, flat());
  mouth.name = "mouth";
  // nose
  const nose = new THREE.SphereGeometry(0.0135, 10, 8);
  nose.scale(1.15, 0.8, 0.9).translate(0, 0.463, 0.398);
  part(head, nose, C.dark, C.dark, flat());
  for (const s of [1, -1]) {
    // almond eye, slanting up toward the ear: dark rim, pale ice-blue iris, round pupil, shine on the lit side
    // layers stacked along the eye's outward normal n (the almond's thin axis after the yaw)
    const n = [Math.cos(0.4) * s, 0, Math.sin(0.4)], c = [(EYE[0] - 0.0015) * s, EYE[1], EYE[2]];
    const eyePart = (sx, sy, sz, out, up, col, w, h) => {
      const g = new THREE.SphereGeometry(1, w, h);
      g.scale(sx, sy, sz).rotateX(0.42).rotateY(-0.4 * s).translate(c[0] + n[0] * out, c[1] + up, c[2] + n[2] * out);
      part(head, g, col, col, flat());
    };
    eyePart(0.006, 0.0118, 0.021, 0.001, 0, C.dark, 12, 7);
    eyePart(0.004, 0.0095, 0.016, 0.0052, 0, C.eye, 10, 6);
    eyePart(0.0025, 0.0045, 0.0045, 0.0078, 0.0004, C.dark, 7, 5);
    eyePart(0.0016, 0.0024, 0.0024, 0.0092, 0.0038, C.shine, 6, 4);
    // eyebrow spots: white dots on the dark cap above each eye
    const brow = new THREE.SphereGeometry(1, 8, 6);
    brow.scale(0.0045, 0.006, 0.0095).rotateY(0.6 * s).translate(0.0345 * s, 0.503, 0.302);
    part(head, brow, C.white, C.whiteShade, flat());
  }
  // ears: medium triangles, thick, set high and close, upright; dark outside, white inside
  for (const [s, side] of [[1, "L"], [-1, "R"]]) {
    const ear = joint("ear" + side, head, 0.037 * s, 0.508, 0.258);
    const outer = new THREE.ConeGeometry(0.033, 0.086, 4, 1);
    outer.rotateY(Math.PI / 4).scale(1, 1, 0.6).translate(0, 0.027, 0).rotateX(0.08).rotateZ(-0.17 * s)
      .translate(0.037 * s, 0.508, 0.258);
    part(ear, outer, C.coat, C.coatShade);
    const inner = new THREE.ConeGeometry(0.022, 0.054, 4, 1);
    inner.rotateY(Math.PI / 4).scale(1, 1, 0.3).translate(0, 0.026, 0).rotateX(0.08).rotateZ(-0.17 * s)
      .translate(0.037 * s, 0.509, 0.267);
    part(ear, inner, C.white, C.whiteShade, flat({ threshold: -0.3 }));
  }

  // --- tail: bushy sickle carried up over the back, not curled down onto it; dark on top, white beneath and tip ---
  const T = tube([[0, 0.335, -0.18], [0, 0.39, -0.228], [0, 0.45, -0.25], [0.003, 0.505, -0.238], [0.008, 0.54, -0.205],
    [0.014, 0.556, -0.163], [0.02, 0.552, -0.125]],
  (t) => 0.026 + 0.026 * Math.sin(Math.PI * Math.min(1, t * 1.15)) - 0.03 * Math.max(0, t - 0.78) / 0.22,
  { steps: 18, seg: 10, side: (P, d) => P.z > -0.145 || d.y * (P.y - 0.43) + d.z * (P.z + 0.16) < -0.75 * Math.hypot(P.y - 0.43, P.z + 0.16) });
  const tailMesh = part(tail, T.geo, C.coat, C.coatShade);
  tailMesh.material = [kit.cel(C.coat, C.coatShade, COAT), kit.cel(C.white, C.whiteShade, COAT)];
  tailMesh.name = "tailSickle";

  // --- legs: rail loft per segment, taper-through; dark only on the outer shoulder and thigh ---
  const paw = (x, z, f) => loftY([
    { y: 0.0, w: 0.024, f, b: 0.02, x, z },
    { y: 0.014, w: 0.026, f: f + 0.002, b: 0.022, x, z },
    { y: 0.032, w: 0.02, f: f - 0.01, b: 0.019, x, z },
  ], 12, { dome: 0 });
  const LEGS = {};
  for (const [s, side] of [[1, "L"], [-1, "R"]]) {
    const X = 0.048 * s, HX = 0.047 * s;
    const white = () => true;
    // fore: point of shoulder -> elbow -> wrist (carpus) -> paw
    const sh = joint("shoulder" + side, body, X, 0.29, 0.165);
    const el = joint("elbow" + side, sh, X, 0.195, 0.10);
    const wr = joint("wrist" + side, el, X, 0.06, 0.118);
    const pw = joint("paw" + side, wr, X, 0.025, 0.122);
    coated(sh, railLoft([[0.195, 0.335], [0.182, 0.27], [0.125, 0.205]], [[0.09, 0.335], [0.073, 0.26], [0.072, 0.198]],
      [0.012, 0.031, 0.025], { x0: X, seg: 12 }), (x, y, z) => y < 0.25 || (z > 0.17 && y < 0.3));
    coated(el, railLoft([[0.13, 0.218], [0.138, 0.15], [0.14, 0.088], [0.139, 0.058]],
      [[0.07, 0.218], [0.09, 0.15], [0.097, 0.088], [0.099, 0.058]],
      [0.027, 0.024, 0.021, 0.023], { x0: X, seg: 10, steps: 3 }), white);
    coated(wr, railLoft([[0.139, 0.072], [0.142, 0.03]], [[0.102, 0.072], [0.105, 0.03]], [0.017, 0.022], { x0: X, seg: 10 }),
      white);
    coated(pw, paw(X, 0.127, 0.03), white);
    // hind: hip -> stifle -> hock -> foot
    const hp = joint("hip" + side, body, HX, 0.31, -0.140);
    const st = joint("stifle" + side, hp, HX, 0.2, -0.095);
    const ho = joint("hock" + side, st, HX, 0.085, -0.190);
    const ft = joint("foot" + side, ho, HX, 0.025, -0.180);
    coated(hp, railLoft([[-0.075, 0.355], [-0.060, 0.28], [-0.075, 0.205]], [[-0.218, 0.335], [-0.212, 0.26], [-0.140, 0.188]],
      [0.014, 0.036, 0.026], { x0: HX, seg: 12 }), (x, y) => y < 0.2 || x * s < Math.abs(HX) - 0.02);
    coated(st, railLoft([[-0.078, 0.225], [-0.122, 0.155], [-0.168, 0.105], [-0.173, 0.082]],
      [[-0.145, 0.232], [-0.194, 0.16], [-0.218, 0.11], [-0.212, 0.07]],
      [0.026, 0.022, 0.019, 0.019], { x0: HX, seg: 10, steps: 3 }),
      (x, y) => y < 0.17 || x * s < Math.abs(HX) - 0.014);
    coated(ho, railLoft([[-0.170, 0.098], [-0.163, 0.03]], [[-0.209, 0.098], [-0.199, 0.03]], [0.016, 0.019], { x0: HX, seg: 10 }),
      white);
    coated(ft, paw(HX, -0.173, 0.03), white);
    LEGS[side + "F"] = { A: sh, B: el, Cj: wr, P: pw, toe: [mz(0.157), 0] };
    LEGS[side + "H"] = { A: hp, B: st, Cj: ho, P: ft, toe: [mz(-0.143), 0] };
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
  // A frame: body [y offset, rx, z offset], neck, head, jaw [rx, ry, rz], ears [rx, ry, rz] each, tail [rx, ry, rz]
  // (deg); feet: per leg [toe z, toe y, paw pitch, pastern pitch] (deg), dog units. Missing feet stay where rest has them.
  const REST_FEET = { LF: [mz(0.157), 0, 0, 0], RF: [mz(0.157), 0, 0, 0], LH: [mz(-0.143), 0, 0, 0], RH: [mz(-0.143), 0, 0, 0] };
  const SIT_FEET = { LF: [0.168, 0, 0, 2], RF: [0.168, 0, 0, 2], LH: [-0.06, 0, 0, -68], RH: [-0.06, 0, 0, -68] };
  const POSES = {
    rest: {},
    // sit: body pitched up 30 about the hips, haunches on the ground, hind paws flat ahead of the folded hocks,
    // forelegs straight under the shoulders; neck and head brought back to level
    sit: { body: [-0.161, -30, 0.012], neck: [16, 0, 0], head: [12, 0, 0], tail: [18, 0, 0], feet: SIT_FEET },
    // howl: sitting, neck stretched up, muzzle ~60 deg above level, jaw dropped, ears laid back, tail low
    howl: { body: [-0.161, -30, 0.012], neck: [-16, 0, 0], head: [-34, 0, 0], jaw: [22, 0, 0], earL: [40, 0, -4],
      earR: [40, 0, 4], tail: [24, 0, 0], feet: SIT_FEET },
  };
  const CLIPS = { idle: 4, walk: 0.9, run: 0.42, wag: 0.6 };
  // gait rows: duty = stance share; S = toe travel in stance (dog units); off = strike phase per leg; lift = swing
  // height; fore / hind pastern pitch [strike, toe-off], roll = paw pitch at toe-off, fold = extra pastern / paw pitch.
  const GAIT = {
    walk: { duty: 0.64, S: 0.187, off: { LH: 0, LF: 0.25, RH: 0.5, RF: 0.75 }, zc: { F: 0.178, H: -0.16 },
      lift: { F: 0.04, H: 0.034 }, phiF: [-4, 14], phiH: [-6, 18], roll: { F: 40, H: 34 }, fold: { F: [55, 40], H: [10, 20] },
      drop: -0.009, bob: 0.0045, pitch: 1.2 },
    run: { duty: 0.3, S: 0.297, off: { LH: 0, RH: 0.09, RF: 0.38, LF: 0.47 }, zc: { F: 0.209, H: -0.176 },
      lift: { F: 0.095, H: 0.078 }, phiF: [-10, 24], phiH: [-12, 26], roll: { F: 60, H: 50 }, fold: { F: [90, 75], H: [30, 45] },
      drop: -0.034, bob: 0.018, pitch: 8 },
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
    for (const k of ["neck", "head", "jaw", "tail", "earL", "earR"]) if (F[k]) joints[k].rotation.set(F[k][0] * D, F[k][1] * D, F[k][2] * D);
    head.rotation.x += HEAD_RX * D;
    const br = F.breath ?? 0;
    bodyMesh.scale.set(1 + 0.6 * br, 1 + br, 1);
    const feet = { ...REST_FEET, ...(F.feet ?? {}) }, stance = [];
    for (const [k, f] of Object.entries(feet)) if (f.stance !== false && f[1] === 0) stance.push([LEGS[k], f, f[2] * D, f[3] * D]);
    if (F.cap) {
      const cap = reachCap(stance);
      if (body.position.y > cap) body.position.y = cap;
    }
    for (const [k, f] of Object.entries(feet)) solveLeg(LEGS[k], f, f[2] * D, f[3] * D);
    mouth.visible = jaw.rotation.x > 0.01;
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
      tail: run ? [34 + 6 * cyc(1, ph), 6 * syc(1, ph), 0] : [2 * cyc(2, ph), 8 * syc(1, ph, 0.1), 4 * syc(1, ph, 0.15)],
      feet,
    };
  }

  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`husky: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      return apply(clip(m[1], +m[2]));
    }
    if (!POSES[name]) throw new Error(`husky: unknown pose "${name}" (${Object.keys(POSES).join(", ")}, or <clip>@<seconds>)`);
    apply(POSES[name]);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
