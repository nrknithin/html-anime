// tanuki.js - a tanuki (Japanese raccoon dog, Nyctereutes viverrinus) in its fluffy winter coat, animated.
// Contract: harness/lab/README.md. Metres, +Y up, faces +Z, its left is +X, paws on y = 0, centred on x = 0, z = 0.
//
// Not a raccoon: no ringed tail, no hand-like paws, no continuous band across the eyes. What makes it a tanuki, in
// order: the dark eye mask (a bandit patch around each eye dropping back onto the cheek, the bridge between them pale)
// on a pale face with a short pointed muzzle and a dark nose; a round, fluffy, low-slung body on short legs in dark
// "stockings"; a darker band over the shoulders and a dark throat; small rounded-triangle ears with dark backs and
// rims; a short bushy tail with a dark tip. Buff / grey-brown coat.
//
// Construction (the wolf's recipe, quadrupeds.md): every organic part is a two-rail loft authored in world side-view
// metres (rails [z, y], half-widths on X), so a misfit is one number. Body-scale patterns (pale face, shoulder band,
// throat, tail tip) are material groups on those lofts: one mesh, one hull, no seams; their toothed edges read as fur.
// The mask is not a group (on the coarse head loft it drew a sawtooth): it is two ellipsoid decals per side sunk into
// the skull so only a 3.5 mm cap shows, placed on the surface by a ray from inside the head; the eye bead and its
// glint sit on the same surface frame. Fur: the belly and tail lofts push every other ring out (fur: 0.07-0.1), a
// tufted silhouette edge. Legs are tubes per segment with taper-through joints; paws are flat-soled lofts. Cheek ruffs
// are pale ellipsoids half inside the head. Ears are pinched spheres (rounded triangles): dark back leaf, pale front.
// The skull draws 10 % larger about the head pivot (a big, cute head; uniform, so nothing skews).
//
// Proportions (H = withers 0.34 m, top of the fur): 0.64 m nose to rump (1.9 H), belly 0.07 m off the ground (short
// legs), barrel half-width 0.155 m (round from above), head 0.21 m long with the ear tips at 0.413 m (meta.height),
// tail 0.2 m hanging to 0.07 m. 5.0k triangles.
// Scaling: build(THREE, kit, colors, { height }) scales the whole animal uniformly (height = ear tips at rest);
// or scale the film's placement group, as for any model.
//
// Two-tone pairs (noon script, Paper noon), base / shade:
//   coat  sky #f2d7ae / iris #5c3d32 (lit buff, shaded grey-brown)    pale (face, cheeks, inner ears)  moon #fff6e4 / sky
//   band  iris #5c3d32 flat (darker than the lit coat, lighter than the stockings)
//   dark  hair #241c16 / ink #2c261f (the horse's hoof pair): mask, stockings, throat, ear backs, tail tip, nose. The
//         mask must be near-black to read on the pale face; hair is noon's only near-black, and it still separates from
//         the coat's iris shade on the -X side.
//   eyes  hair bead on the mask, practical #fffaf2 glint (the glint is what makes the eye read inside the mask).
//
// Rig (signs): every joint is rx about +X. A hanging limb or tail: +rx swings it back (-Z). body, neck, head point
// +Z: +rx pitches the nose down. Ears: +rz on the left ear tips it out (toward +X), mirrored on the right.
// Poses: rest, sit (sitting up on the haunches, forepaws held in front of the belly, the folklore pose).
// Clips: build() returns clips { idle: 4, walk: 0.9, trot: 0.5, sit: 4 } (s); pose("walk@0.3") is that clip at 0.3 s,
// looping. In place. Feet are solved: each paw follows a ground track (planted paws carried back at the ground speed,
// flat, so they never slide; swing arcs join lift-off to the next strike with matched velocity) and a two-bone IK in
// the body frame sets upper + lower leg, the paw keeping its world pitch. Walk is a lateral sequence (LH, LF, RH, RF),
// trot diagonal pairs. Idle: two breaths, a sniff, an ear flick, tail sway, paws planted. Sit: the same, sitting up.

export const meta = {
  name: "tanuki",
  height: 0.413,
  script: "noon",
  colors: {
    coat: "#f2d7ae", coatShade: "#5c3d32",
    pale: "#fff6e4", paleShade: "#f2d7ae",
    dark: "#241c16", darkShade: "#2c261f",
    band: "#5c3d32",
    glint: "#fffaf2",
  },
  poses: ["rest", "sit"],
};

const CLIPS = { idle: 4, walk: 0.9, trot: 0.5, sit: 4 };
// Gait rows: T period (s, in CLIPS), duty = stance share per paw, S = metres a planted paw travels, lift = swing arc
// height (m), flexF / flexH = paw fold in swing (deg, + folds the sole back), phase = strike phase per leg, bob = body
// rise (m) twice a cycle, pitch = body pitch swing (deg), nod = head counter-nod (deg), tail = tail sway (deg).
const GAIT = {
  walk: { duty: 0.66, S: 0.12, lift: 0.035, flexF: 70, flexH: 40, phase: { HL: 0, FL: 0.25, HR: 0.5, FR: 0.75 },
    bob: 0.004, pitch: 1.2, nod: 3, tail: 12, drop: -0.006 },
  trot: { duty: 0.42, S: 0.13, lift: 0.045, flexF: 85, flexH: 50, phase: { FL: 0, HR: 0, FR: 0.5, HL: 0.5 },
    bob: 0.007, pitch: 1.5, nod: 4, tail: 16, drop: -0.012 },
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const C = colors;
  const { height = meta.height } = opts;
  const TAU = Math.PI * 2, D = Math.PI / 180;
  const spow = (v, e) => Math.sign(v) * Math.abs(v) ** e;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

  // ---------- geometry helpers (wolf.js) ----------
  function geom(pos, idx) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  // winding from the signed volume, never by hand
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
  // fur: every other ring pushed out by that fraction (on the lower half only with below), a tufted silhouette edge
  function railLoft(A, B, W, { steps = 4, seg = 16, n = 2.2, x0 = 0, dome = 0.5, fur = 0, below = false } = {}) {
    const sp = (k) => spline(k, steps);
    const az = sp(A.map((p) => p[0])), ay = sp(A.map((p) => p[1])), bz = sp(B.map((p) => p[0])), by = sp(B.map((p) => p[1])), ww = sp(W);
    const rings = az.map((_, i) => {
      const cz = (az[i] + bz[i]) / 2, cy = (ay[i] + by[i]) / 2, dz = (az[i] - bz[i]) / 2, dy = (ay[i] - by[i]) / 2;
      return Array.from({ length: seg }, (_, s) => {
        const t = (s / seg) * TAU, u = spow(Math.cos(t), 2 / n), v = spow(Math.sin(t), 2 / n);
        const k = 1 + (i % 2 && i < az.length - 1 ? fur * (below ? Math.max(0, -Math.sin(t)) : 1) : 0);
        return [x0 + ww[i] * u * k, cy + dy * v * k, cz + dz * v * k];
      });
    });
    return skin(rings, { dome });
  }
  function tube(pts, r0, r1, { steps = 4, seg = 8, dome = 0.6 } = {}) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => V(...p)));
    const fr = curve.computeFrenetFrames(steps, false), rings = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, P = curve.getPointAt(t), N = fr.normals[i], B = fr.binormals[i];
      const r = r0 + (r1 - r0) * t;
      rings.push(Array.from({ length: seg }, (_, j) => {
        const a = (j / seg) * TAU;
        return P.clone().addScaledVector(N, Math.cos(a) * r).addScaledVector(B, Math.sin(a) * r).toArray();
      }));
    }
    return skin(rings, { dome });
  }
  // rings at constant y (paws): flat sole when the first ring has dome 0
  function loftY(rings, seg = 10) {
    return skin(rings.map(({ y, w, f, b, x, z }) => Array.from({ length: seg }, (_, i) => {
      const t = (i / seg) * TAU;
      return [x + w * spow(Math.cos(t), 0.8), y, z + (Math.sin(t) >= 0 ? f : b) * spow(Math.sin(t), 0.8)];
    })), { dome: 0 });
  }
  // material groups by a centroid test (world rest coordinates, before part() moves the geometry to its pivot)
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

  // ---------- rig helpers (world rest coordinates) ----------
  const root = new THREE.Group();
  root.name = "tanuki";
  const size = new THREE.Group(); // the uniform { height } scale lives here; nothing in the rig is scaled
  size.name = "size";
  size.scale.setScalar(height / meta.height);
  root.add(size);
  const joints = {}, pivots = { size: [0, 0, 0] };
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
  const COAT = [C.coat, C.coatShade], PALE = [C.pale, C.paleShade], DARK = [C.dark, C.darkShade], BAND = [C.band, C.band];
  // one mesh, one hull; tones = [base, shade] per material group index the test returns
  function part(j, geo, tones, test = null, opts) {
    const p = pivots[j.name];
    if (test) groups(geo, test);
    geo.translate(-p[0], -p[1], -p[2]);
    const m = kit.toon(geo, tones[0][0], tones[0][1], opts);
    if (test) m.material = tones.map((t) => kit.cel(t[0], t[1], opts?.threshold != null ? { threshold: opts.threshold } : undefined));
    j.add(m);
    return m;
  }

  const body = joint("body", size, 0, 0.2, -0.02);
  const barrel = new THREE.Group(); // breathing scales this mesh only (legs hang off body, not off a scaled node)
  barrel.name = "barrel";
  body.add(barrel);
  pivots.barrel = pivots.body;
  const neck = joint("neck", body, 0, 0.27, 0.15);
  const head = joint("head", neck, 0, 0.28, 0.22);
  // the skull is authored at real size and drawn 10 % larger about the head pivot (a cute, big head); the scale is
  // uniform, so the ears rotating under it do not skew
  const skull = new THREE.Group();
  skull.name = "skull";
  skull.scale.setScalar(1.1);
  head.add(skull);
  pivots.skull = pivots.head;
  const tail = joint("tail", body, 0, 0.255, -0.24);

  // ---------- trunk: round, fluffy, low; dark band over the shoulders into the forelegs, dark throat/chest ----------
  // band: a saddle over the withers (flat iris, darker than the coat, lighter than the stockings) that narrows down the
  // sides toward the forelegs; throat and chest between the forelegs dark
  const band = (x, y, z) => y > 0.215 && z < 0.105 && z > 0.035;
  const throat = (x, y, z) => z > 0.13 && y < 0.165 && Math.abs(x) < 0.07;
  part(barrel, railLoft(
    [[0.17, 0.25], [0.135, 0.3], [0.07, 0.332], [-0.03, 0.343], [-0.12, 0.333], [-0.19, 0.305], [-0.237, 0.258], [-0.262, 0.19]],
    [[0.19, 0.16], [0.145, 0.1], [0.07, 0.076], [-0.03, 0.07], [-0.12, 0.078], [-0.19, 0.1], [-0.237, 0.13], [-0.262, 0.172]],
    [0.075, 0.125, 0.148, 0.155, 0.15, 0.13, 0.098, 0.035], { seg: 16, n: 2.1, fur: 0.07, below: true }),
  [COAT, DARK, BAND], (x, y, z) => (band(x, y, z) ? 2 : throat(x, y, z) ? 1 : 0));
  // neck ruff: a fat short loft from inside the chest to the back of the head, dark under the throat
  part(neck, railLoft(
    [[0.09, 0.30], [0.15, 0.325], [0.21, 0.33]],
    [[0.13, 0.14], [0.19, 0.175], [0.23, 0.215]],
    [0.11, 0.105, 0.075], { seg: 14, n: 2.1, steps: 3 }),
  [COAT, DARK, BAND], (x, y, z) => (y < 0.19 + 0.3 * (z - 0.17) && Math.abs(x) < 0.07 ? 1 : band(x, y, z) ? 2 : 0));

  // ---------- head: broad round skull, short pointed muzzle; mask, pale face ----------
  const headG = railLoft(
    [[0.16, 0.32], [0.2, 0.358], [0.245, 0.366], [0.28, 0.345], [0.306, 0.314], [0.328, 0.295], [0.348, 0.283]],
    [[0.16, 0.216], [0.2, 0.205], [0.245, 0.212], [0.28, 0.233], [0.306, 0.25], [0.328, 0.26], [0.346, 0.27]],
    [0.07, 0.095, 0.094, 0.068, 0.04, 0.026, 0.014], { seg: 14, n: 2.1 });
  // Surface frames on the head, found by a ray from inside the skull toward an aim point: [hit, normal, along, up].
  const probeMesh = new THREE.Mesh(headG.clone(), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const ray = new THREE.Raycaster();
  function onHead(aim) {
    const o = V(0, 0.29, 0.24), d = V(...aim).sub(o).normalize();
    ray.set(o, d);
    const h = ray.intersectObject(probeMesh)[0];
    const n = h.face.normal.clone();
    if (n.dot(d) < 0) n.negate();
    const up = V(0, 1, 0).addScaledVector(n, -n.y).normalize(), along = V().crossVectors(up, n);
    return [h.point, n, along, up];
  }
  // A decal: an ellipsoid sunk into the surface so only a thin cap shows; its edge is the smooth curve where it meets
  // the skin (a material group on the coarse loft would draw a sawtooth edge). r = [along, up, depth], tilt in degrees.
  function decal(aim, r, sink, tilt, tones) {
    const [p, n, al, up] = onHead(aim), t = tilt * D;
    const a = al.clone().multiplyScalar(Math.cos(t)).addScaledVector(up, Math.sin(t)), u = V().crossVectors(n, a);
    const g = new THREE.SphereGeometry(1, 12, 7).scale(...r);
    g.applyMatrix4(new THREE.Matrix4().makeBasis(a, u, n).setPosition(p.clone().addScaledVector(n, -sink)));
    return part(skull, g, tones, null, { outline: false });
  }
  part(skull, headG, [COAT, PALE], (x, y, z) => (z > 0.27 || (z > 0.2 && y < 0.24) ? 1 : 0));
  // nose: dark, a little proud of the muzzle tip
  const noseG = new THREE.SphereGeometry(0.0135, 8, 6);
  noseG.scale(1.2, 0.85, 0.9).translate(0, 0.285, 0.346);
  part(skull, noseG, [DARK], null, { outline: false });
  for (const s of [1, -1]) {
    const side = s > 0 ? "L" : "R";
    // mask: an eye patch, and a second patch dropping back and down from it onto the cheek (the bandit mask); the
    // bridge between the eyes stays pale, so it reads as two patches, not a raccoon's band
    decal([0.05 * s, 0.31, 0.29], [0.044, 0.026, 0.01], 0.0065, -12 * s, [DARK]);
    decal([0.064 * s, 0.284, 0.262], [0.034, 0.026, 0.01], 0.0065, -30 * s, [DARK]);
    // eye: a dark bead on the mask with a bright glint toward the light (the glint is what reads inside the mask)
    const [ep, en, eal, eup] = onHead([0.05 * s, 0.312, 0.29]);
    const eye = new THREE.SphereGeometry(1, 8, 6);
    eye.scale(0.0085, 0.0095, 0.008).translate(...ep.clone().addScaledVector(en, 0.0035).toArray());
    part(skull, eye, [[C.dark, C.dark]], null, { outline: false });
    const gl = new THREE.SphereGeometry(0.0032, 6, 4);
    gl.translate(...ep.clone().addScaledVector(en, 0.01).addScaledVector(eup, 0.003).addScaledVector(eal, 0.0025 * s).toArray());
    part(skull, gl, [[C.glint, C.glint]], null, { outline: false });
    // cheek ruff: a puffy pale ellipsoid behind the mask that widens the face (the winter ruff), half inside the head
    const cheek = new THREE.SphereGeometry(1, 10, 6);
    cheek.scale(0.032, 0.036, 0.05).rotateX(0.35).rotateY(0.45 * s).translate(0.058 * s, 0.25, 0.235);
    part(skull, cheek, [PALE]);
    // ear: small and rounded, dark back leaf with a pale front leaf set inside it (dark rim all round)
    const ear = joint("ear" + side, skull, 0.058 * s, 0.35, 0.21);
    const leaf = (w, h, d, dz) => {
      const g = new THREE.SphereGeometry(1, 9, 6), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * (1 - 0.42 * Math.max(0, p.getY(i)))); // pinch the top: rounded triangle
      g.computeVertexNormals();
      return g.scale(w, h, d).translate(0, h * 0.75, 0).rotateZ(-0.5 * s).rotateX(-0.25).translate(0.058 * s, 0.35, 0.21 + dz);
    };
    part(ear, leaf(0.026, 0.034, 0.011, 0), [DARK]);
    part(ear, leaf(0.016, 0.024, 0.005, 0.007), [PALE], null, { outline: false });
  }

  // ---------- tail: short, bushy, hanging; dark tip ----------
  const tailTip = joint("tailTip", tail, 0, 0.17, -0.3);
  part(tail, railLoft(
    [[-0.232, 0.285], [-0.285, 0.27], [-0.32, 0.225], [-0.33, 0.17]],
    [[-0.22, 0.245], [-0.245, 0.205], [-0.27, 0.175], [-0.285, 0.15]],
    [0.03, 0.05, 0.058, 0.052], { seg: 11, dome: 0.3, fur: 0.1 }), [COAT]);
  part(tailTip, railLoft(
    [[-0.325, 0.19], [-0.335, 0.14], [-0.33, 0.1], [-0.32, 0.075]],
    [[-0.28, 0.165], [-0.295, 0.125], [-0.3, 0.095], [-0.31, 0.075]],
    [0.05, 0.052, 0.04, 0.012], { seg: 11, fur: 0.1 }), [COAT, DARK], (x, y) => (y < 0.13 ? 1 : 0));

  // ---------- legs: short, dark stockings; taper-through joints ----------
  // per leg: upper pivot, middle pivot, foot pivot, paw centre (contact) - world rest coordinates
  const LEG = {
    F: { x: 0.068, p: [[0.2, 0.12], [0.125, 0.07], [0.045, 0.11]], c: 0.125, front: true },
    H: { x: 0.075, p: [[0.2, -0.19], [0.12, -0.14], [0.05, -0.215]], c: -0.19, front: false },
  };
  const legs = {};
  for (const s of [1, -1]) {
    for (const k of ["F", "H"]) {
      const L = LEG[k], X = L.x * s, side = s > 0 ? "L" : "R", [p0, p1, p2] = L.p;
      const names = k === "F" ? ["shoulder", "elbow", "wrist"] : ["hip", "stifle", "hock"];
      const j0 = joint(names[0] + side, body, X, p0[0], p0[1]);
      const j1 = joint(names[1] + side, j0, X, p1[0], p1[1]);
      const j2 = joint(names[2] + side, j1, X, p2[0], p2[1]);
      if (k === "F") {
        part(j0, tube([[X, 0.235, 0.13], [X, p0[0], p0[1]], [X, p1[0] + 0.008, p1[1] + 0.003]], 0.036, 0.026), [DARK]);
        part(j1, tube([[X, p1[0] + 0.01, p1[1] + 0.004], [X, 0.09, 0.09], [X, p2[0] + 0.004, p2[1] - 0.002]], 0.021, 0.019), [DARK]);
      } else {
        // thigh in coat (it is the haunch, mostly inside the body), shin and hock dark
        part(j0, tube([[X * 0.8, 0.25, -0.19], [X, p0[0], p0[1]], [X, p1[0] + 0.01, p1[1] - 0.004]], 0.045, 0.03), [COAT]);
        part(j1, tube([[X, p1[0] + 0.012, p1[1] - 0.004], [X, 0.085, -0.18], [X, p2[0] + 0.004, p2[1] + 0.002]], 0.025, 0.019), [DARK]);
      }
      // foot: pastern / metatarsus from the foot pivot into a round paw with a flat sole at y = 0
      part(j2, tube([[X, p2[0] + 0.008, p2[1]], [X, 0.025, (p2[1] + L.c) / 2 + 0.004]], 0.019, 0.019, { steps: 2 }), [DARK]);
      part(j2, loftY([
        { y: 0.0, w: 0.021, f: 0.03, b: 0.02, x: X, z: L.c },
        { y: 0.012, w: 0.024, f: 0.033, b: 0.022, x: X, z: L.c },
        { y: 0.026, w: 0.02, f: 0.024, b: 0.019, x: X, z: L.c - 0.002 },
        { y: 0.036, w: 0.011, f: 0.012, b: 0.011, x: X, z: L.c - 0.004 },
      ]), [DARK]);
      // IK data, body frame (relative to the body pivot)
      const bp = pivots.body, rel = (p) => [p[1] - bp[2], p[0] - bp[1]]; // [z, y]
      const u = rel(p0), m = rel(p1), f = rel(p2), cz = L.c - bp[2], cy = -bp[1];
      const ang = (a, b) => Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])); // 0 = straight down, + = back
      legs[k + side] = {
        j: [j0, j1, j2], x: X, front: L.front, u, cz: L.c,
        L1: Math.hypot(m[0] - u[0], m[1] - u[1]), L2: Math.hypot(f[0] - m[0], f[1] - m[1]),
        a1: ang(u, m), a2: ang(m, f), o: [cz - f[0], cy - f[1]], // contact minus foot pivot [z, y]
      };
    }
  }

  // ---------- solving ----------
  const _m = new THREE.Matrix4(), _v = V();
  // Paw contact target (z, y) in model space (before { height }), paw world pitch pw (deg, 0 = sole flat).
  function solve(name, z, y, pw = 0) {
    const g = legs[name], [j0, j1, j2] = g.j;
    body.updateMatrix();
    _v.set(g.x, y, z).applyMatrix4(_m.copy(body.matrix).invert());
    const pb = body.rotation.x, r3 = pw * D - pb; // paw rotation in the body frame
    // foot pivot = contact - R(r3) o, in the body frame [z, y]
    const oz = g.o[0], oy = g.o[1], rz = oy * Math.sin(r3) + oz * Math.cos(r3), ry = oy * Math.cos(r3) - oz * Math.sin(r3);
    const tz = _v.z - rz - g.u[0], ty = _v.y - ry - g.u[1];
    const Dd = Math.min(Math.max(Math.hypot(tz, ty), Math.abs(g.L1 - g.L2) + 1e-4), g.L1 + g.L2 - 1e-5);
    const phi = Math.atan2(-tz, -ty);
    const al = Math.acos(Math.max(-1, Math.min(1, (g.L1 ** 2 + Dd ** 2 - g.L2 ** 2) / (2 * g.L1 * Dd))));
    const t1 = g.front ? phi + al : phi - al;
    const kz = -g.L1 * Math.sin(t1), ky = -g.L1 * Math.cos(t1);
    const t2 = Math.atan2(-(tz - kz), -(ty - ky));
    const R1 = t1 - g.a1, R2 = t2 - g.a2;
    j0.rotation.set(R1, 0, 0);
    j1.rotation.set(R2 - R1, 0, 0);
    j2.rotation.set(r3 - R2, 0, 0);
  }
  function reset() {
    for (const j of Object.values(joints)) { j.rotation.set(0, 0, 0); j.position.copy(j.userData.rest); }
    barrel.scale.set(1, 1, 1);
  }
  const bump = (ph, at, w) => { const d = ((ph - at + 1.5) % 1) - 0.5; return Math.abs(d) < w ? Math.sin(Math.PI * (0.5 + d / (2 * w))) ** 2 : 0; };
  const set = (j, rx = 0, ry = 0, rz = 0) => joints[j].rotation.set(rx * D, ry * D, rz * D);

  // Sit: body pitched up about its pivot and lifted so the rump sits on the ground, hind paws planted ahead of the
  // haunch, forelegs off the ground and folded in front of the belly, neck and head counter-pitched to face forward,
  // tail laid back along the ground. Ground clearance checked with the probe.
  const SIT = { pitch: -55, pos: [0, 0.035, 0.02], hindZ: -0.06, neck: 22, head: 28, tail: 105, tailTip: 15,
    shoulder: 32, elbow: -62, wrist: 70 };
  function sitBase() {
    body.position.set(...pivots.body).add(V(...SIT.pos));
    body.rotation.x = SIT.pitch * D;
    set("neck", SIT.neck); set("head", SIT.head); set("tail", SIT.tail); set("tailTip", SIT.tailTip);
    for (const s of ["L", "R"]) { set("shoulder" + s, SIT.shoulder); set("elbow" + s, SIT.elbow); set("wrist" + s, SIT.wrist); }
  }

  // idle extras shared by idle and sit: breaths, a sniff, an ear flick, a slow tail sway
  function life(ph, headBase) {
    const b = Math.sin(TAU * 2 * ph);
    barrel.scale.set(1 + 0.012 * b, 1 + 0.016 * b, 1);
    const sn = bump(ph, 0.35, 0.12); // the sniff: quick small nods with the muzzle raised
    set("head", headBase - 6 * sn + 2.2 * sn * Math.sin(TAU * 14 * ph) + 0.8 * b, 6 * Math.sin(TAU * ph + 1), 0);
    set("neck", (joints.neck.rotation.x / D) - 1.5 * sn, 0, 0);
    const fl = bump(ph, 0.72, 0.05); // the ear flick: left ear out and back, right ear a beat later and smaller
    set("earL", -14 * fl, 0, 22 * fl);
    set("earR", -6 * bump(ph, 0.78, 0.04), 0, -8 * bump(ph, 0.78, 0.04));
    joints.tail.rotation.y = 8 * Math.sin(TAU * ph) * D;
    joints.tailTip.rotation.y = 6 * Math.sin(TAU * ph - 0.8) * D;
  }

  function clip(name, t) {
    const T = CLIPS[name], ph = (((t % T) + T) % T) / T;
    reset();
    if (name === "idle") {
      body.position.y += -0.002 * (1 - Math.cos(TAU * ph));
      body.rotation.x = 0.6 * Math.sin(TAU * ph) * D;
      life(ph, 0);
      for (const n of Object.keys(legs)) solve(n, legs[n].cz, 0);
    } else if (name === "sit") {
      sitBase();
      body.rotation.x += 0.8 * Math.sin(TAU * ph) * D;
      life(ph, SIT.head);
      for (const n of ["HL", "HR"]) solve(n, SIT.hindZ, 0);
    } else {
      const g = GAIT[name];
      body.position.y += g.drop + g.bob * Math.cos(TAU * 2 * ph);
      body.rotation.x = g.pitch * Math.sin(TAU * 2 * ph + 0.6) * D;
      set("head", -g.nod * Math.sin(TAU * 2 * ph + 0.6) + 4, 3 * Math.sin(TAU * ph), 0);
      set("neck", -2, 0, 0);
      joints.tail.rotation.set(-5 * D, g.tail * Math.sin(TAU * ph) * D, 0);
      joints.tailTip.rotation.set(0, 0.7 * g.tail * Math.sin(TAU * ph - 0.9) * D, 0);
      set("earL", -4, 0, 3 * Math.sin(TAU * 2 * ph)); set("earR", -4, 0, -3 * Math.sin(TAU * 2 * ph));
      for (const [n, off] of Object.entries(g.phase)) {
        const L = legs[n];
        const u = (((ph - off) % 1) + 1) % 1, S = g.S, span = 1 - g.duty;
        let z, y = 0, pw = 0;
        if (u < g.duty) z = L.cz + S / 2 - (S * u) / g.duty;
        else {
          // Hermite from lift-off to strike, end velocities matched to the stance's ground speed
          const w = (u - g.duty) / span, m = (-S / g.duty) * span, z0 = L.cz - S / 2, z1 = L.cz + S / 2;
          const h00 = 2 * w ** 3 - 3 * w * w + 1, h10 = w ** 3 - 2 * w * w + w, h01 = -2 * w ** 3 + 3 * w * w, h11 = w ** 3 - w * w;
          z = h00 * z0 + h10 * m + h01 * z1 + h11 * m;
          y = g.lift * Math.sin(Math.PI * w);
          pw = (L.front ? g.flexF : g.flexH) * Math.sin(Math.PI * Math.min(1, w * 1.15)) ** 1.5;
        }
        solve(n, z, y, pw);
      }
    }
    root.updateMatrixWorld(true);
  }

  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`tanuki: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      return clip(m[1], +m[2]);
    }
    if (!meta.poses.includes(name)) throw new Error(`tanuki: unknown pose "${name}" (${meta.poses.join(", ")}, or <clip>@<seconds>)`);
    reset();
    if (name === "sit") {
      sitBase();
      for (const n of ["HL", "HR"]) solve(n, SIT.hindZ, 0);
    }
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
