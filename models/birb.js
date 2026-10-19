// birb.js - a round, chubby little perching bird (sparrow / Japanese white-eye / tit) for anime slice-of-life shots:
// on a railing, a power line, a windowsill, hopping on a path. Animated. Not the songbird (a slim flier) or the pigeon.
// Contract: harness/lab/README.md. Meters, +Y up, the bird faces +Z, its left is +X, toes on y = 0, centred on x, z = 0.
//
// Construction (one soft body so the head turns without a neck seam):
//   BODY   one closed mesh, rays from a centre inside the body to the smooth union of two implicit shapes: a big
//          egg (the puffed body) and a head sphere sitting forward on top of it (smooth-min, so the head is merged,
//          not a snowman). Lat/long rings around the vertical with single pole vertices: seam-free, so the hull
//          normal is the normal. Plumage is material groups on its triangles (cap, back, belly, cheek), tested on
//          their angles from the ray centre: cap and collar lines run along rings, so they are clean; the back /
//          belly edge is a slope and breaks into small teeth that read as feather tips. Marks with a shape (the
//          white-eye's yellow throat, the tit's cheeks and tie, the sparrow's bib and cheek spots) are decals: strips
//          sampled on the same surface 0.7 mm out, no hull, deformed with the body.
//   SOFT   pose() rebuilds the body and decal vertices: breathing (the egg swells), a throat puff (sing), and the
//          head turn, blended by a head weight (1 on the head, 0 below the neck) about a neck pivot. Eyes, beak and
//          eye rings are rigid parts on the head joint, which carries the same transform, so they ride the weight-1
//          surface.
//   PARTS  wings: closed lofts (flat paddles), folded along the flanks with an outward bow over the belly bulge,
//          opened (bow flattened) and beaten by rebuilding the wing joint's basis from a span and a leading-edge
//          direction; a wing bar and dark flight-feather tips are material groups along the span. Tail: a flat
//          wedge loft. Legs: thin tapered tubes on the bird, not the trunk (the feet stay planted when the trunk
//          dips or tips), three front toes and a hind toe curving onto y = 0. Eyes are big dark ellipsoids with
//          their own hull and two glints; a blink squashes the eye to a line. The beak is two cones: the lower
//          one is the jaw (sing), a mouth sphere sits between them.
// Proportions (base unit the egg's half-width R = 0.046 m): body egg R x 0.98 R x 1.07 R; head sphere 0.64 R, its
//   centre 0.83 R above and 0.46 R ahead of the egg's; eye 0.19 R radius; beak 0.28 R long; wing 1.2 R; tail 0.8 R
//   past the rump; legs ~0.3 R of bare tarsus. 0.123 m to the top of the head, 0.10 m wide, 0.13 m long with the
//   tail: a puffed cartoon bird (a real white-eye or sparrow is ~0.07-0.08 m tall perched): build(THREE, kit,
//   colors, { height }) scales it uniformly ({ height: 0.075 } for real size). ~2.8-3.0k triangles.
// Species: { species: "whiteeye" } (default; meadow script), "tit" (meadow), "sparrow" (noon). The default colors
//   are the white-eye's. A species whose palette is on another script takes its own palette when build() gets the
//   default colors; pass colors to override (every role below). PALETTES is exported for a film to remap.
// Two-tone pairs (base / shade). White-eye (meadow): head and back line #a9d16e / iris #3f8a47; wings and tail iris /
//   hair #2c5131; throat practical #f2c94c / line; belly sclera #f6f3ee / sky #d7ecef; eye ring sclera; eye hair with
//   a sclera glint; beak hair; legs iris / hair. Tit (meadow): hood and tie hair; cheeks sclera / sky; mantle line /
//   iris; wings iris / hair with a sclera bar; belly sclera / sky. Sparrow (noon): cap, back and wings accent
//   #c4452d / iris #5c3d32, flight-feather tips and tail iris; cheeks and collar practical #fffaf2 / sky #f2d7ae
//   with a hair #241c16 cheek spot and bib (single-tone marks, like the eyes); belly moon #fff6e4 / sky; wing bar
//   practical; beak iris; legs skin #f0c2ae / iris. Thresholds: head 0.2, body 0.3.
// Clips: build() returns clips { idle: 3.2, hop: 0.64, peck: 1.2, flap: 0.9, fly: 0.48, sing: 1.6 } (seconds);
//   pose("hop@0.2") is that clip at 0.2 s, looping. idle: head tilts and turns, two blinks, breathing, a tail flick.
//   hop: crouch, a two-footed hop in place, a squash on landing. peck: tip forward, two pecks at the ground. flap:
//   wings open and beat three times on the ground. fly: hovering, wings beating, legs hanging. sing: head up, beak
//   opens on three chirps with a throat puff. Feet stay planted in idle, peck, flap and sing.
//   Named poses: rest, look (idle frame), crouch, hop (apex), peck (beak at the ground), wings-up, sing.

const P_WHITEEYE = {
  head: "#a9d16e", headShade: "#3f8a47", back: "#a9d16e", backShade: "#3f8a47",
  wing: "#3f8a47", wingShade: "#2c5131", bar: "#3f8a47", barShade: "#2c5131", tail: "#3f8a47", tailShade: "#2c5131",
  belly: "#f6f3ee", bellyShade: "#d7ecef", throat: "#f2c94c", throatShade: "#a9d16e",
  cheek: "#a9d16e", cheekShade: "#3f8a47", mark: "#2c5131", eye: "#2c5131", glint: "#f6f3ee", ring: "#f6f3ee",
  beak: "#2c5131", beakShade: "#2c5131", mouth: "#d9483b", leg: "#3f8a47", legShade: "#2c5131",
};
export const PALETTES = {
  whiteeye: { script: "meadow", colors: P_WHITEEYE },
  tit: { script: "meadow", colors: {
    head: "#2c5131", headShade: "#2c5131", back: "#a9d16e", backShade: "#3f8a47",
    wing: "#3f8a47", wingShade: "#2c5131", bar: "#f6f3ee", barShade: "#d7ecef", tail: "#3f8a47", tailShade: "#2c5131",
    belly: "#f6f3ee", bellyShade: "#d7ecef", throat: "#2c5131", throatShade: "#2c5131",
    cheek: "#f6f3ee", cheekShade: "#d7ecef", mark: "#2c5131", eye: "#2c5131", glint: "#f6f3ee", ring: "#f6f3ee",
    beak: "#2c5131", beakShade: "#2c5131", mouth: "#d9483b", leg: "#3f8a47", legShade: "#2c5131",
  } },
  sparrow: { script: "noon", colors: {
    head: "#c4452d", headShade: "#5c3d32", back: "#c4452d", backShade: "#5c3d32",
    wing: "#c4452d", wingShade: "#5c3d32", bar: "#fffaf2", barShade: "#f2d7ae", tail: "#5c3d32", tailShade: "#5c3d32",
    belly: "#fff6e4", bellyShade: "#f2d7ae", throat: "#fff6e4", throatShade: "#f2d7ae",
    cheek: "#fffaf2", cheekShade: "#f2d7ae", mark: "#241c16", eye: "#241c16", glint: "#fffaf2", ring: "#fffaf2",
    beak: "#5c3d32", beakShade: "#5c3d32", mouth: "#c4452d", leg: "#f0c2ae", legShade: "#5c3d32",
  } },
};

export const meta = {
  name: "birb",
  height: 0.123,
  script: "meadow",
  colors: P_WHITEEYE,
  poses: ["rest", "look", "crouch", "hop", "peck", "wings-up", "sing"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { species = "whiteeye" } = opts;
  if (!PALETTES[species]) throw new Error(`birb: species must be ${Object.keys(PALETTES).join(", ")} (got ${species})`);
  const C = colors === meta.colors ? PALETTES[species].colors : colors;
  const TAU = Math.PI * 2;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const smooth = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };

  const root = new THREE.Group();
  root.name = "birb";
  const space = new THREE.Group(); // uniform size
  space.name = "space";
  root.add(space);
  const bird = new THREE.Group(); // lift (hop, hover)
  bird.name = "bird";
  space.add(bird);
  const joints = {};

  // ---------- geometry helpers ----------
  function solid(pos, idx) { // wind outward by signed volume
    let v = 0;
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
      v += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1])
         - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c])
         + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
    }
    return v < 0;
  }
  // rings (arrays of [x,y,z]) -> closed skin with pole caps; groupOf(i) -> material index of the band after ring i
  function skin(rings, groupOf = () => 0, dome = 0.4) {
    const seg = rings[0].length, R = rings.length, pos = rings.flat(2), quads = [];
    for (let i = 0; i < R - 1; i++) {
      const k = (i + 1) * seg, g = groupOf(i);
      for (let j = 0; j < seg; j++) {
        const a = i * seg + j, b = i * seg + ((j + 1) % seg), c = k + j, d = k + ((j + 1) % seg);
        (quads[g] ??= []).push(a, b, c, b, d, c);
      }
    }
    const caps = [];
    const mid = (r) => r.reduce((s, p) => [s[0] + p[0] / seg, s[1] + p[1] / seg, s[2] + p[2] / seg], [0, 0, 0]);
    for (const [k, nb, first] of [[0, 1, true], [R - 1, R - 2, false]]) {
      const m = mid(rings[k]), n = mid(rings[nb]);
      const d = [m[0] - n[0], m[1] - n[1], m[2] - n[2]], dl = Math.hypot(...d) || 1;
      const rad = rings[k].reduce((s, p) => s + Math.hypot(p[0] - m[0], p[1] - m[1], p[2] - m[2]), 0) / seg;
      const c = pos.length / 3;
      pos.push(...m.map((v, i) => v + (d[i] / dl) * rad * dome));
      const g = groupOf(first ? 0 : R - 2);
      for (let j = 0; j < seg; j++) {
        const a = k * seg + j, b = k * seg + ((j + 1) % seg);
        (quads[g] ??= []).push(...(first ? [c, b, a] : [c, a, b]));
      }
    }
    return finish(pos, quads);
  }
  function finish(pos, quads) {
    const all = quads.flat();
    const flip = solid(pos, all);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    const idx = [];
    let start = 0;
    quads.forEach((q = [], k) => {
      for (let t = 0; t < q.length; t += 3) idx.push(q[t], flip ? q[t + 2] : q[t + 1], flip ? q[t + 1] : q[t + 2]);
      g.addGroup(start, q.length, k);
      start += q.length;
    });
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  // a loft: frame(u) -> { P, A, B } (centre, width axis, thickness axis), prof(u) -> [a, b] half extents
  function loft(n, seg, frame, prof, groupOf) {
    const rings = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, { P, A, B } = frame(u), [a, b] = prof(u);
      rings.push(Array.from({ length: seg }, (_, s) => {
        const t = (s / seg) * TAU;
        return [P.x + A.x * a * Math.cos(t) + B.x * b * Math.sin(t), P.y + A.y * a * Math.cos(t) + B.y * b * Math.sin(t),
          P.z + A.z * a * Math.cos(t) + B.z * b * Math.sin(t)];
      }));
    }
    return skin(rings, groupOf ? (i) => groupOf((i + 0.5) / n) : undefined, 0.5);
  }
  // a tapered tube through points, radius r(u); ends closed
  function tube(pts, r, n = 5, seg = 6) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => V(...p)));
    const up = V(0, 0, 1);
    return loft(n, seg, (u) => {
      const P = curve.getPointAt(u), T = curve.getTangentAt(u);
      const ref = Math.abs(T.dot(up)) > 0.9 ? V(1, 0, 0) : up;
      const A = V().crossVectors(T, ref).normalize(), B = V().crossVectors(T, A).normalize();
      return { P, A, B };
    }, (u) => [r(u), r(u)]);
  }
  const mesh = (g, base, shade, o = {}) => {
    const m = kit.toon(g, base, shade, o);
    m.frustumCulled = false;
    m.children.forEach((h) => (h.frustumCulled = false));
    return m;
  };

  // ---------- trunk: everything but the legs; pivots at the hips ----------
  const HIP = V(0, 0.024, 0);
  const trunk = new THREE.Group();
  trunk.name = "trunk";
  trunk.position.copy(HIP);
  bird.add(trunk);
  joints.trunk = trunk;
  const T0 = new THREE.Group(); // authored in bird coordinates
  T0.position.copy(HIP).negate();
  trunk.add(T0);

  // ---------- the body: smooth union of the egg and the head ----------
  const EGG = { c: V(0, 0.056, -0.004), r: V(0.046, 0.045, 0.049) };
  const HEAD = { c: V(0, 0.094, 0.017), r: 0.0295 };
  const NECK = V(0, 0.083, 0.006); // head pivot
  const sdEgg = (p) => {
    const qx = (p.x - EGG.c.x) / EGG.r.x, qy = (p.y - EGG.c.y) / EGG.r.y, qz = (p.z - EGG.c.z) / EGG.r.z;
    const k0 = Math.hypot(qx, qy, qz), k1 = Math.hypot(qx / EGG.r.x, qy / EGG.r.y, qz / EGG.r.z);
    return (k0 * (k0 - 1)) / (k1 || 1);
  };
  const sdHead = (p) => p.distanceTo(HEAD.c) - HEAD.r;
  const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - (h * h * k) / 4; };
  const sdf = (p) => smin(sdEgg(p), sdHead(p), 0.02);
  const O = V(0, 0.072, 0.004); // ray centre, inside both
  const NL = 18, NS = 28; // latitude rings (no poles), longitudes
  const ray = (d) => {
    let lo = 0, hi = 0.004;
    const q = V();
    while (sdf(q.copy(d).multiplyScalar(hi).add(O)) < 0) { lo = hi; hi += 0.004; }
    for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (sdf(q.copy(d).multiplyScalar(m).add(O)) < 0) lo = m; else hi = m; }
    return q.copy(d).multiplyScalar((lo + hi) / 2).add(O);
  };
  const bodyPos = [];
  const dirAt = (i, j) => { // i 0 top pole .. NL+1 bottom pole; longitude 0 at the front (+Z), a column centred there
    const th = (i / (NL + 1)) * Math.PI, ph = ((j + 0.5) / NS) * TAU;
    return V(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph));
  };
  const vid = (i, j) => (i === 0 ? 0 : i === NL + 1 ? 1 + NL * NS : 1 + (i - 1) * NS + (((j % NS) + NS) % NS));
  bodyPos.push(...ray(V(0, 1, 0)).toArray());
  for (let i = 1; i <= NL; i++) for (let j = 0; j < NS; j++) bodyPos.push(...ray(dirAt(i, j)).toArray());
  bodyPos.push(...ray(V(0, -1, 0)).toArray());
  const vtx = (k) => V(bodyPos[k * 3], bodyPos[k * 3 + 1], bodyPos[k * 3 + 2]);

  // plumage regions on the body: 0 cap, 1 back, 2 belly, 3 cheek. Tested on the cell's angles seen from O (th from
  // straight up, aph from straight ahead, degrees). Cap lines run along rings (9.47 deg apart), so they are clean; the
  // back / belly edge is a slope, so it breaks into small teeth that read as feather tips. Marks are decals (below).
  const headW = (p) => smooth((p.y - 0.074 + 0.25 * (p.z - 0.01)) / 0.018);
  const RING = 180 / (NL + 1);
  const angles = (p) => {
    const d = V().subVectors(p, O).normalize();
    return [(Math.acos(d.y) * 180) / Math.PI, Math.abs((Math.atan2(d.x, d.z) * 180) / Math.PI)];
  };
  function region(p) {
    const [th, aph] = angles(p), row = Math.floor(th / RING);
    const belly = row > 8 && aph < 105 || th > 84.5 + 0.3 * Math.max(0, aph - 40); // the back colour stays behind the wing
    if (species === "whiteeye") return belly ? 2 : row <= 8 ? 0 : 1;
    if (species === "tit") return row <= 8 && (aph < 150 || row <= 6) ? 0 : belly ? 2 : 1; // black hood, green mantle
    if (row <= 5 || (row <= 8 && aph > 118)) return 0;          // sparrow: chestnut cap and nape
    if (row <= 8) return 3;                                     // white cheeks and half collar
    return belly ? 2 : 1;
  }
  const bodyQuads = [];
  const centroid = (a, b, c) => vtx(a).add(vtx(b)).add(vtx(c)).multiplyScalar(1 / 3);
  for (let i = 0; i <= NL; i++) for (let j = 0; j < NS; j++) {
    let tris;
    if (i === 0) tris = [[vid(0, 0), vid(1, j + 1), vid(1, j)]];
    else if (i === NL) tris = [[vid(NL, j), vid(NL, j + 1), vid(NL + 1, 0)]];
    else { const a = vid(i, j), b = vid(i, j + 1), c = vid(i + 1, j), d = vid(i + 1, j + 1); tris = [[a, b, c], [b, d, c]]; }
    for (const t of tris) (bodyQuads[region(centroid(...t))] ??= []).push(...t);
  }
  const bodyGeo = finish(bodyPos, [0, 1, 2, 3].map((k) => bodyQuads[k] ?? []));
  const BODY_T = 0.3, HEAD_T = 0.2;
  const soft = []; // every mesh that rides the soft body: { geo, rest, nrm, w }
  const addSoft = (geo) => {
    const rest = geo.attributes.position.array.slice(), w = new Float32Array(rest.length / 3);
    for (let k = 0; k < w.length; k++) w[k] = headW(V(rest[k * 3], rest[k * 3 + 1], rest[k * 3 + 2]));
    soft.push({ geo, rest, nrm: geo.attributes.normal.array.slice(), w });
  };
  addSoft(bodyGeo);
  const bodyMesh = mesh(bodyGeo, C.back, C.backShade);
  bodyMesh.material = [[C.head, C.headShade, HEAD_T], [C.back, C.backShade, BODY_T], [C.belly, C.bellyShade, BODY_T],
    [C.cheek, C.cheekShade, HEAD_T]].map(([b, s, t]) => kit.cel(b, s, { threshold: t }));
  bodyMesh.name = "body";
  T0.add(bodyMesh);

  // ---------- decals: plumage marks lying 0.7 mm off the body, deformed with it ----------
  // A strip from th0 to th1 (deg from up, seen from O) centred on longitude phc (deg, + toward the bird's left),
  // half-width w(t) deg. Rounded ends: w = W * 2 sqrt(t (1 - t)).
  const D2R = Math.PI / 180;
  const sdfN = (p) => {
    const e = 0.0002, n = V(sdf(V(p.x + e, p.y, p.z)) - sdf(V(p.x - e, p.y, p.z)), sdf(V(p.x, p.y + e, p.z)) - sdf(V(p.x, p.y - e, p.z)),
      sdf(V(p.x, p.y, p.z + e)) - sdf(V(p.x, p.y, p.z - e)));
    return n.normalize();
  };
  const ell = (W) => (t) => W * 2 * Math.sqrt(Math.max(0, t * (1 - t)));
  function decal(name, th0, th1, phc, w, base, shade = base, nt = 8, ns = 4, threshold = BODY_T) {
    const pos = [], idx = [];
    for (let a = 0; a <= nt; a++) for (let b = 0; b <= ns; b++) {
      const t = a / nt, s = (2 * b) / ns - 1, th = (th0 + (th1 - th0) * t) * D2R, ph = (phc + w(t) * s) * D2R;
      const p = ray(V(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph)));
      p.addScaledVector(sdfN(p), 0.0007);
      pos.push(p.x, p.y, p.z);
    }
    for (let a = 0; a < nt; a++) for (let b = 0; b < ns; b++) {
      const k = a * (ns + 1) + b;
      idx.push(k, k + 1, k + ns + 1, k + 1, k + ns + 2, k + ns + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    // wind outward: compare the first quad's face normal with the surface normal there
    const P = (k) => V(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]);
    const c = Math.floor(nt / 2) * (ns + 1) + Math.floor(ns / 2);
    const fn = V().subVectors(P(c + 1), P(c)).cross(V().subVectors(P(c + ns + 1), P(c)));
    if (fn.dot(sdfN(P(c))) < 0) for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    g.setIndex(idx);
    g.computeVertexNormals();
    addSoft(g);
    const m = mesh(g, base, shade, { outline: false, threshold });
    m.name = name;
    T0.add(m);
    return m;
  }
  if (species === "whiteeye") decal("throat", 62, 104, 0, (t) => (54 - 30 * t) * Math.sqrt(Math.min(1, (1 - t) * 4)), C.throat, C.throatShade, 8, 8, HEAD_T);
  if (species === "tit") {
    for (const sx of [1, -1]) decal("cheek" + (sx > 0 ? "L" : "R"), 42, 86, sx * 58, ell(36), C.cheek, C.cheekShade, 8, 8, HEAD_T);
    decal("tie", 74, 150, 0, (t) => (t < 0.25 ? 17 : 17 - 9 * ((t - 0.25) / 0.75)) * Math.sqrt(Math.min(1, (1 - t) * 6)), C.mark, C.mark, 10, 4);
  }
  if (species === "sparrow") {
    for (const sx of [1, -1]) decal("spot" + (sx > 0 ? "L" : "R"), 60, 77, sx * 70, ell(10), C.mark);
    decal("bib", 66, 88, 0, (t) => 12 * Math.sqrt(Math.min(1, (1 - t) * 2.5)), C.mark);
  }

  // ---------- head parts (rigid, on the head joint at the neck pivot) ----------
  const head = new THREE.Group();
  head.name = "head";
  head.position.copy(NECK);
  T0.add(head);
  joints.head = head;
  const onHead = (o, p) => { o.position.copy(p).sub(NECK); head.add(o); return o; };
  const headSurf = (d) => { // surface point along a direction from the head centre
    d = V().copy(d).normalize();
    let lo = 0, hi = 0.05;
    const q = V();
    for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (sdf(q.copy(d).multiplyScalar(m).add(HEAD.c)) < 0) lo = m; else hi = m; }
    return q.copy(d).multiplyScalar(lo).add(HEAD.c);
  };
  const EYE_R = 0.0088;
  const eyes = [];
  for (const sx of [1, -1]) {
    const k = sx > 0 ? "L" : "R";
    const dir = V(sx * 0.76, 0.17, 0.63).normalize();
    const eye = new THREE.Group();
    eye.name = "eye" + k;
    onHead(eye, headSurf(dir).addScaledVector(dir, -0.0028));
    eye.quaternion.setFromUnitVectors(V(0, 0, 1), dir);
    joints["eye" + k] = eye;
    const lid = new THREE.Group(); // the blink squashes this
    lid.name = "lid" + k;
    eye.add(lid);
    const ball = mesh(new THREE.SphereGeometry(EYE_R, 12, 8), C.eye, C.eye);
    ball.scale.set(1, 1.08, 0.55);
    ball.name = "eyeball" + k;
    lid.add(ball);
    const glint = mesh(new THREE.SphereGeometry(EYE_R * 0.3, 8, 6), C.glint, C.glint, { outline: false });
    glint.scale.set(1, 1, 0.35);
    glint.position.set(EYE_R * 0.3 * sx, EYE_R * 0.38, EYE_R * 0.55 * 0.9);
    glint.name = "glint" + k;
    lid.add(glint);
    const glint2 = mesh(new THREE.SphereGeometry(EYE_R * 0.13, 6, 4), C.glint, C.glint, { outline: false });
    glint2.scale.set(1, 1, 0.35);
    glint2.position.set(-EYE_R * 0.32 * sx, -EYE_R * 0.38, EYE_R * 0.55 * 0.88);
    glint2.name = "glintB" + k;
    lid.add(glint2);
    if (species === "whiteeye") {
      const ring = mesh(new THREE.TorusGeometry(EYE_R * 1.2, 0.0021, 4, 14), C.ring, C.ring, { outline: false });
      ring.position.z = 0.0006;
      ring.name = "ring" + k;
      eye.add(ring);
    }
    eyes.push(lid);
  }
  // beak: an upper and a lower mandible (the lower opens to sing), a mouth inside
  const BEAK_DIR = V(0, -0.2, 1).normalize();
  const BEAK0 = headSurf(V(0, -0.24, 1)).addScaledVector(BEAK_DIR, -0.0022);
  const beak = new THREE.Group();
  beak.name = "beak";
  onHead(beak, BEAK0);
  beak.quaternion.setFromUnitVectors(V(0, 0, 1), BEAK_DIR);
  joints.beak = beak;
  const BL = 0.013, BR = 0.0068;
  const cone = (len, r, sy) => { // a cone along +Z, base at z = 0
    const g = new THREE.ConeGeometry(r, len, 10, 1);
    g.rotateX(Math.PI / 2);
    g.translate(0, 0, len / 2);
    g.scale(1, sy, 1);
    return g;
  };
  const upper = mesh(cone(BL, BR, 0.7), C.beak, C.beakShade);
  upper.position.y = 0.0013;
  upper.name = "beakUpper";
  beak.add(upper);
  const jaw = new THREE.Group();
  jaw.name = "jaw";
  jaw.position.y = -0.0006;
  beak.add(jaw);
  joints.jaw = jaw;
  const lower = mesh(cone(BL * 0.84, BR * 0.86, 0.48), C.beak, C.beakShade);
  lower.name = "beakLower";
  jaw.add(lower);
  const mouth = mesh(new THREE.SphereGeometry(0.0042, 8, 6), C.mouth, C.mouth, { outline: false });
  mouth.scale.set(1, 0.7, 1);
  mouth.position.set(0, 0, 0.0018);
  mouth.name = "mouth";
  beak.add(mouth);
  const tip = new THREE.Group();
  tip.name = "beakTip";
  tip.position.set(0, 0, BL);
  beak.add(tip);
  joints.beakTip = tip;

  // ---------- wings ----------
  const WL = 0.056;
  const chord = (u) => 0.025 * (0.82 + 0.5 * Math.sin(Math.PI * Math.min(1, u * 1.6)) ** 0.7) * (u > 0.62 ? Math.sqrt(Math.max(0, 1 - ((u - 0.62) / 0.38) ** 2)) : 1) + 0.0004;
  // bow: the folded wing arches out over the flank (local -Y is outward when folded); open wings flatten
  const wingGeo = (bow) => loft(10, 8, (u) => ({ P: V(WL * u, -bow * Math.sin(Math.PI * u), 0.0045 - 0.42 * chord(u)), A: V(0, 0, 1), B: V(0, 1, 0) }),
    (u) => [chord(u) / 2, (0.0032 * (1 - 0.55 * u)) * Math.min(1, 0.35 + u * 6)],
    (u) => (u > 0.3 && u < 0.4 ? 1 : u > 0.72 ? 2 : 0)); // 1 the wing bar, 2 dark flight-feather tips
  const BOW = 0.012;
  const wings = [];
  for (const sx of [1, -1]) {
    const k = sx > 0 ? "L" : "R";
    const w = new THREE.Group();
    w.name = "wing" + k;
    w.position.set(sx * 0.037, 0.08, 0.014);
    T0.add(w);
    joints["wing" + k] = w;
    const g = wingGeo(sx * BOW);
    const m = mesh(g, C.wing, C.wingShade);
    m.material = [kit.cel(C.wing, C.wingShade), kit.cel(C.bar, C.barShade), kit.cel(C.tail, C.tailShade)];
    m.name = "wingBlade" + k;
    w.add(m);
    wings.push([w, sx, g]);
  }
  // wing basis from a span direction s and a leading-edge direction c (bird frame, left wing; mirrored for the right)
  const M4 = new THREE.Matrix4();
  function setWing(w, sx, s, c) {
    const S = V(sx * s[0], s[1], s[2]).normalize();
    const Cc = V(sx * c[0], c[1], c[2]);
    Cc.addScaledVector(S, -Cc.dot(S)).normalize();
    const Y = V().crossVectors(Cc, S);
    // local X -> span, local Z -> leading edge, local Y = Z x X
    M4.makeBasis(S, Y, Cc); // the right wing's basis is the mirror's negative Y: its bow flips, so pass -bow there
    w.quaternion.setFromRotationMatrix(M4);
  }

  // ---------- tail ----------
  const tailJ = new THREE.Group();
  tailJ.name = "tail";
  tailJ.position.set(0, 0.047, -0.04);
  T0.add(tailJ);
  joints.tail = tailJ;
  const TLEN = 0.036;
  const tailGeo = loft(6, 8, (u) => ({ P: V(0, 0.014 * u + 0.004 * u * u, -TLEN * u), A: V(1, 0, 0), B: V(0, 1, 0.4).normalize() }),
    (u) => [(0.007 + 0.008 * u) * (u > 0.75 ? Math.sqrt(Math.max(0.02, 1 - ((u - 0.75) / 0.25) ** 2)) : 1),
      0.0048 - 0.0024 * u]);
  const tailM = mesh(tailGeo, C.tail, C.tailShade);
  tailM.name = "tailFan";
  tailJ.add(tailM);

  // ---------- legs and toes (on the bird, not the trunk: the feet stay planted when the trunk dips) ----------
  const legs = [];
  for (const sx of [1, -1]) {
    const k = sx > 0 ? "L" : "R";
    const leg = new THREE.Group();
    leg.name = "leg" + k;
    leg.position.set(sx * 0.012, 0.024, 0.003);
    bird.add(leg);
    joints["leg" + k] = leg;
    const LR = 0.0019;
    const tars = mesh(tube([[0, 0.006, -0.002], [sx * 0.0006, -0.008, 0.001], [sx * 0.001, -0.0185, 0.003]], (u) => LR * (1 - 0.15 * u), 4, 6), C.leg, C.legShade);
    tars.name = "tarsus" + k;
    leg.add(tars);
    const foot = new THREE.Group(); // at the ankle
    foot.name = "foot" + k;
    foot.position.set(sx * 0.001, -0.0185, 0.003);
    leg.add(foot);
    joints["foot" + k] = foot;
    // toes: ankle -> knuckle -> tip on the ground (foot frame: ground at y = -0.0055)
    const toe = (ang, len) => {
      const dx = Math.sin(ang) * len, dz = Math.cos(ang) * len;
      return tube([[0, 0, 0], [dx * 0.35, -0.0036, dz * 0.35], [dx * 0.75, -0.0042, dz * 0.75], [dx, -0.0048, dz]],
        (u) => 0.00145 * (1 - 0.45 * u), 4, 4);
    };
    for (const [ang, len] of [[sx * 0.42, 0.0115], [0, 0.0135], [-sx * 0.42, 0.0115], [Math.PI, 0.0085]]) {
      const t = mesh(toe(ang, len), C.leg, C.legShade);
      t.name = "toe" + k;
      foot.add(t);
    }
    legs.push([leg, foot, sx]);
  }

  // ---------- clips ----------
  // State: head pitch hx (+ nods forward/down), yaw hy (+ looks to its left, +X), roll hz (+ tilts its left ear down),
  //   head shift hdz/hdy (m), blink 0..1, breath (egg swell), puff (throat, m), beak 0..1 open, trunk pitch tx
  //   (+ tips forward), dip (m, trunk down), lift (m, whole bird up), wing 0 folded .. 1 open, beat -1 down .. 1 up,
  //   tail pitch (+ up), legs swing (+ back), toes curl (rad, + tips down).
  const ZERO = { hx: 0, hy: 0, hz: 0, hdz: 0, hdy: 0, blink: 0, breath: 0, puff: 0, beak: 0, tx: 0, dip: 0, lift: 0,
    wing: 0, beat: 0, tail: 0, legs: 0, toes: 0, squash: 0 };
  // keyframes: [[t, v], ...] over one clip, eased between, looping (first key repeated at T)
  const ease = (keys, t, T) => {
    t = ((t % T) + T) % T;
    const ks = [...keys, [T, keys[0][1]]];
    for (let i = 0; i < ks.length - 1; i++) if (t <= ks[i + 1][0]) {
      const f = (t - ks[i][0]) / Math.max(1e-6, ks[i + 1][0] - ks[i][0]);
      return ks[i][1] + (ks[i + 1][1] - ks[i][1]) * smooth(f);
    }
    return keys[0][1];
  };
  const blinkAt = (t, at, len = 0.14) => { const d = Math.abs(t - at) / (len / 2); return d < 1 ? 1 - d * d : 0; };
  const CLIPS = {
    idle: { T: 3.2, f: (t) => ({
      hy: ease([[0, 0], [0.25, 0], [0.55, 0.42], [1.25, 0.42], [1.55, -0.3], [2.3, -0.3], [2.6, 0]], t, 3.2),
      hz: ease([[0, 0], [0.25, 0], [0.55, 0.32], [1.25, 0.32], [1.55, -0.18], [2.3, -0.18], [2.6, 0]], t, 3.2),
      hx: ease([[0, 0], [0.55, -0.08], [1.25, -0.08], [1.55, 0.06], [2.3, 0.06], [2.6, 0]], t, 3.2),
      blink: Math.max(blinkAt(t, 0.95), blinkAt(t, 2.75)),
      breath: 0.022 * (0.5 - 0.5 * Math.cos((TAU * t) / 0.8)),
      tail: ease([[0, 0], [1.9, 0], [1.98, 0.35], [2.08, -0.05], [2.2, 0.2], [2.4, 0]], t, 3.2),
    }) },
    hop: { T: 0.64, f: (t) => {
      const air = t > 0.14 && t < 0.44 ? (t - 0.14) / 0.3 : -1;
      return {
        dip: -ease([[0, 0], [0.04, 0], [0.12, 0.007], [0.16, 0], [0.42, 0], [0.48, 0.006], [0.6, 0]], t, 0.64),
        squash: ease([[0, 0], [0.12, 0.06], [0.16, -0.04], [0.3, 0], [0.42, 0], [0.48, 0.07], [0.6, 0]], t, 0.64),
        lift: air >= 0 ? 0.034 * 4 * air * (1 - air) : 0,
        tx: ease([[0, 0], [0.12, 0.12], [0.2, -0.08], [0.4, 0.05], [0.48, 0.1], [0.6, 0]], t, 0.64),
        hx: ease([[0, 0], [0.12, -0.1], [0.3, 0.05], [0.48, -0.08], [0.6, 0]], t, 0.64),
        wing: ease([[0, 0], [0.14, 0], [0.22, 0.25], [0.36, 0.1], [0.44, 0], [0.6, 0]], t, 0.64),
        beat: 0.6,
        tail: ease([[0, 0], [0.12, 0.25], [0.3, -0.1], [0.48, 0.35], [0.6, 0]], t, 0.64),
        toes: air >= 0 ? 0.35 * Math.sin(Math.PI * air) : 0,
        legs: air >= 0 ? 0.2 * Math.sin(Math.PI * air) : 0,
      };
    } },
    peck: { T: 1.2, f: (t) => {
      const jab = Math.max(blinkAt(t, 0.36, 0.14), blinkAt(t, 0.52, 0.14)); // two quick jabs at the ground
      return {
        tx: ease([[0, 0], [0.12, 0], [0.3, 0.66], [0.62, 0.66], [0.88, 0], [1.2, 0]], t, 1.2),
        hx: ease([[0, 0], [0.12, 0], [0.3, 0.45], [0.62, 0.45], [0.88, 0], [1.2, 0]], t, 1.2) + 0.3 * jab,
        hdz: ease([[0, 0], [0.3, 0.004], [0.62, 0.004], [0.88, 0]], t, 1.2) + 0.006 * jab,
        hdy: -0.008 * jab,
        tail: ease([[0, 0], [0.3, 0.3], [0.62, 0.3], [0.88, 0]], t, 1.2),
        blink: Math.max(0.5 * jab, blinkAt(t, 1.05)),
        breath: 0.012 * (0.5 - 0.5 * Math.cos((TAU * t) / 1.2)),
      };
    } },
    flap: { T: 0.9, f: (t) => ({
      wing: ease([[0, 0], [0.12, 1], [0.7, 1], [0.86, 0]], t, 0.9),
      beat: t > 0.12 && t < 0.72 ? Math.cos((TAU * 3 * (t - 0.12)) / 0.6) : 1,
      tx: ease([[0, 0], [0.12, -0.18], [0.7, -0.18], [0.86, 0]], t, 0.9),
      hx: ease([[0, 0], [0.12, 0.1], [0.7, 0.1], [0.86, 0]], t, 0.9),
      tail: ease([[0, 0], [0.12, 0.2], [0.7, 0.2], [0.86, 0]], t, 0.9),
      breath: 0.015,
    }) },
    fly: { T: 0.48, f: (t) => {
      const ph = (TAU * 2 * t) / 0.48;
      return { wing: 1, beat: Math.cos(ph), lift: 0.05 + 0.003 * Math.cos(ph + 0.9), tx: -0.3, hx: 0.22, tail: 0.15,
        legs: 0.55, toes: 0.75, breath: 0.01 };
    } },
    sing: { T: 1.6, f: (t) => {
      const chirp = Math.max(blinkAt(t, 0.32, 0.22), blinkAt(t, 0.6, 0.22), 1.1 * blinkAt(t, 0.98, 0.42));
      return {
        hx: ease([[0, 0], [0.18, -0.42], [1.3, -0.42], [1.55, 0]], t, 1.6),
        hz: ease([[0, 0], [0.18, 0.08], [1.3, 0.08], [1.55, 0]], t, 1.6),
        tx: ease([[0, 0], [0.18, -0.12], [1.3, -0.12], [1.55, 0]], t, 1.6),
        beak: Math.min(1, chirp),
        puff: 0.007 * Math.min(1, chirp),
        breath: 0.02 * Math.min(1, chirp),
        tail: ease([[0, 0], [0.18, -0.15], [1.3, -0.15], [1.55, 0]], t, 1.6),
        blink: blinkAt(t, 1.42),
      };
    } },
  };
  const clips = Object.fromEntries(Object.entries(CLIPS).map(([k, c]) => [k, c.T]));
  const POSES = { rest: null, look: ["idle", 0.9], crouch: ["hop", 0.12], hop: ["hop", 0.29], peck: ["peck", 0.36],
    "wings-up": ["fly", 0], sing: ["sing", 0.98] };

  const THROAT = V(0, 0.08, 0.034);
  const RQ = new THREE.Quaternion(), E = new THREE.Euler(), tmp = V(), off = V(), restP = V(), hp = V();
  function apply(S) {
    // head transform
    E.set(S.hx, S.hy, S.hz, "YXZ");
    RQ.setFromEuler(E);
    off.set(0, S.hdy, S.hdz);
    head.position.copy(NECK).add(off);
    head.quaternion.copy(RQ);
    // soft body: the body and its decals
    for (const { geo, rest, nrm, w: W } of soft) {
      const pos = geo.attributes.position.array;
      for (let k = 0; k < W.length; k++) {
        const w = W[k];
        restP.set(rest[k * 3], rest[k * 3 + 1], rest[k * 3 + 2]);
        tmp.copy(restP);
        const b = S.breath * (1 - w);
        tmp.x += (restP.x - EGG.c.x) * b;
        tmp.z += (restP.z - EGG.c.z) * b;
        tmp.y += Math.max(0, restP.y - 0.02) * b * 0.4;
        if (S.puff) {
          const d2 = restP.distanceToSquared(THROAT), g = S.puff * Math.exp(-d2 / (0.013 * 0.013));
          tmp.x += nrm[k * 3] * g; tmp.y += nrm[k * 3 + 1] * g; tmp.z += nrm[k * 3 + 2] * g;
        }
        if (w > 0) tmp.lerp(hp.subVectors(tmp, NECK).applyQuaternion(RQ).add(NECK).add(off), w);
        pos[k * 3] = tmp.x; pos[k * 3 + 1] = tmp.y; pos[k * 3 + 2] = tmp.z;
      }
      geo.attributes.position.needsUpdate = true;
      geo.computeVertexNormals();
      if (geo.attributes.hullNormal) { // seam-free: the hull normal is the normal
        geo.attributes.hullNormal.array.set(geo.attributes.normal.array);
        geo.attributes.hullNormal.needsUpdate = true;
      }
      geo.computeBoundingSphere();
      geo.computeBoundingBox();
    }
    // eyes, beak
    for (const lid of eyes) lid.scale.set(1, 1 - 0.88 * S.blink, 1);
    jaw.rotation.set(0.9 * S.beak, 0, 0);
    upper.rotation.set(-0.22 * S.beak, 0, 0);
    // trunk
    trunk.position.set(HIP.x, HIP.y + S.dip, HIP.z);
    trunk.rotation.set(S.tx, 0, 0);
    trunk.scale.set(1 + S.squash * 0.6, 1 - S.squash, 1 + S.squash * 0.6);
    bird.position.y = S.lift;
    // wings: folded -> open, beat between up and down strokes
    const fold = { s: [-0.08, -0.5, -1], c: [0.12, 1, -0.4] };
    const up = { s: [0.6, 1.0, -0.3], c: [0, 0.55, 1] }, down = { s: [1, -0.5, 0.1], c: [0, 0.75, 0.7] }; // faces tilted to the front
    const bt = 0.5 + 0.5 * S.beat; // 1 up, 0 down
    const lerp3 = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
    const os = lerp3(down.s, up.s, bt), oc = lerp3(down.c, up.c, bt);
    const s = lerp3(V(...fold.s).normalize().toArray(), V(...os).normalize().toArray(), S.wing);
    const c = lerp3(V(...fold.c).normalize().toArray(), V(...oc).normalize().toArray(), S.wing);
    const bow = BOW * (1 - S.wing);
    for (const [w, sx, g] of wings) {
      setWing(w, sx, s, c);
      if (w.userData.bow !== sx * bow) { // rebuild the blade for this bow (same topology)
        const n = wingGeo(sx * bow);
        g.attributes.position.array.set(n.attributes.position.array);
        g.attributes.position.needsUpdate = true;
        g.computeVertexNormals();
        if (g.attributes.hullNormal) { g.attributes.hullNormal.array.set(g.attributes.normal.array); g.attributes.hullNormal.needsUpdate = true; }
        g.computeBoundingSphere();
        g.computeBoundingBox();
        w.userData.bow = sx * bow;
      }
    }
    tailJ.rotation.set(-S.tail, 0, 0);
    for (const [leg, foot] of legs) {
      leg.rotation.set(S.legs, 0, 0);
      foot.rotation.set(S.toes, 0, 0);
    }
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    let clip = null, t = 0;
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`birb: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      [clip, t] = [m[1], +m[2]];
    } else {
      if (!(name in POSES)) throw new Error(`birb: unknown pose "${name}" (${Object.keys(POSES).join(", ")})`);
      if (POSES[name]) [clip, t] = POSES[name];
    }
    const c = clip && CLIPS[clip];
    apply({ ...ZERO, ...(c ? c.f((((t % c.T) + c.T) % c.T)) : {}) });
  }

  space.scale.setScalar((opts.height ?? meta.height) / meta.height);
  pose("rest");
  return { root, joints, pose, clips };
}
