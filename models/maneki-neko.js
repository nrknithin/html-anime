// maneki-neko.js - the ceramic beckoning cat of every anime shop counter: a seated chunky white cat with a big round
// head, happy closed-arc eyes, red-lined triangle ears, a red collar with a gold bell, a few calico patches, one paw
// raised beside the face and the other holding a blank gold koban plaque against the belly. Code model (no library cat
// reads as a figurine).
//
// Construction: smooth closed solids only. Head and body are superellipse ring lofts along Y (rings authored as
// functions of height, so the face features are placed on the head's exact surface); ears are rounded pyramids; arms,
// tail and the collar are tubes along Catmull-Rom curves; paws, feet, bell and nose are ellipsoids; the koban is an oval
// slab loft. Everything static is merged into one mesh per material (rig parts aside: the raised arm and its forearm
// are their own meshes, under their joints). The calico patches are material groups on the white mesh (a test on
// each triangle's rest centroid against fixed spheres, so they are deterministic and share the white hull). Winding
// comes from the signed volume of each solid, never by hand. Eyes, mouth and whiskers are flat inked tubes (no hull).
//
// Proportions (authored at A = 0.312 m to the top of the ear tips, scaled to { height }, base unit the head width W = 0.18 m):
//   head 1.0 W wide, 0.82 W tall, centre at 0.68 A; body a pear 1.0 W wide at the haunches, 0.49 A tall to the
//   collar; ears 0.39 W tall, leaning out 18 deg; raised paw top at 0.89 A beside the cheek; koban 0.33 x 0.53 W,
//   standing on the haunch in front of the belly; collar at the head-body seam, bell 0.18 W.
//
// Two-tone pairs (festival script): ceramic sclera #f6f3ee / skin #f0c2ae; calico orange practical #ffb020 / moon
// #ffd7a1 and black hair #1a1020 / sky #24143a; collar, inner ears and nose accent #ff4d6d / skin #f0c2ae; gold (bell,
// koban) practical #ffb020 / moon #ffd7a1, the bell band and koban rim the swapped pair (flat, no hull); eyes, mouth,
// whiskers hair #1a1020 flat; toe lines the body shade, flat; ink #140c1c. White body threshold -0.2 (glazed ceramic
// stays mostly lit; only the -X flank and under the chin go to shade). Gold body variant: moon #ffd7a1 / practical
// #ffb020, its bell and koban practical / skin. Black body: hair / sky, with gold eyes and whiskers.
//
// Rig: root -> cat (scale group) -> head; cat -> arm (raised shoulder, static upper arm with the elbow knob) -> paw
// (elbow; the forearm starts inside the knob) -> wrist. Signs: +rx on paw and wrist tips the upward-pointing forearm
// and paw forward and down toward the viewer (+Z). head rx nods down, rz tilts toward the raised side.
// Budget: 11.2k triangles, 13 meshes (body, head, upper arm, forearm, paw, gold, gold lines, collar, inner ears,
// nose, face lines, bell slot, toe lines).
//
// Poses: rest (paw up), beckon (forearm bent down at the bottom of the stroke). Clip (build() returns clips; pose
// "beckon@0.3"): beckon 1.0 s loop, the forearm bends down from the elbow and back up, the wrist lagging so the paw
// curls, a small head nod in time.
//
// Options: build(THREE, kit, colors, { height, paw, color }). height = top of the rest pose (default 0.30 m, a counter
// figurine; { height: 2 } is a shop-front statue). paw "left" (default, the cat's left = +X, the lit side) or "right".
// color "white" (default, calico patches), "gold" or "black" (solid, no patches).

export const meta = {
  name: "maneki-neko",
  height: 0.3,
  script: "festival",
  colors: {
    white: "#f6f3ee", whiteShade: "#f0c2ae",
    orange: "#ffb020", orangeShade: "#ffd7a1",
    black: "#1a1020", blackShade: "#24143a",
    red: "#ff4d6d", redShade: "#f0c2ae",
    gold: "#ffb020", goldShade: "#ffd7a1",
    eye: "#1a1020",
  },
  poses: ["rest", "beckon"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const C = { ...meta.colors, ...colors };
  const { height = meta.height, paw: pawSide = "left", color = "white" } = opts;
  const s = pawSide === "right" ? -1 : 1; // raised side
  const TAU = Math.PI * 2, D = Math.PI / 180;
  const AUTH = 0.3124; // authored top of the rest pose, the ear tips (m)
  const spow = (v, e) => Math.sign(v) * Math.abs(v) ** e;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

  // body tones per colour variant
  const BODY = {
    white: [C.white, C.whiteShade],
    gold: ["#ffd7a1", "#ffb020"],
    black: [C.black, C.blackShade],
  }[color] ?? [C.white, C.whiteShade];
  const EYE = color === "black" ? C.gold : C.eye;
  const GOLD = color === "gold" ? [C.gold, C.whiteShade] : [C.gold, C.goldShade];

  // ---------- geometry helpers ----------
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
  // rings (arrays of [x, y, z]) skinned and capped at both ends (cap apex pushed out by dome x ring radius)
  function skin(rings, { dome = 0.5 } = {}) {
    const seg = rings[0].length, R = rings.length, pos = rings.flat(2), idx = [];
    for (let i = 0; i < R - 1; i++) {
      const k = (i + 1) * seg;
      for (let j = 0; j < seg; j++) {
        const a = i * seg + j, b = i * seg + ((j + 1) % seg), c = k + j, d = k + ((j + 1) % seg);
        idx.push(a, b, c, b, d, c);
      }
    }
    const mid = (r) => r.reduce((m, p) => [m[0] + p[0] / seg, m[1] + p[1] / seg, m[2] + p[2] / seg], [0, 0, 0]);
    for (const [k, nb, first] of [[0, 1, true], [R - 1, R - 2, false]]) {
      const m = mid(rings[k]), n = mid(rings[nb]);
      const d = [m[0] - n[0], m[1] - n[1], m[2] - n[2]], dl = Math.hypot(...d) || 1;
      const rad = rings[k].reduce((t, p) => t + Math.hypot(p[0] - m[0], p[1] - m[1], p[2] - m[2]), 0) / seg;
      const c = pos.length / 3;
      pos.push(...m.map((v, i) => v + (d[i] / dl) * rad * dome));
      for (let j = 0; j < seg; j++) {
        const a = k * seg + j, b = k * seg + ((j + 1) % seg);
        if (first) idx.push(c, b, a); else idx.push(c, a, b);
      }
    }
    return solid(pos, idx);
  }
  // horizontal superellipse ring: half-width w on X, front depth f, back depth b, exponent p
  function ringY({ y, w, f, b = f, p = 2, x = 0, z = 0 }, seg) {
    const e = 2 / p, pts = [];
    for (let i = 0; i < seg; i++) {
      const t = (i / seg) * TAU;
      pts.push([x + w * spow(Math.cos(t), e), y, z + (Math.sin(t) >= 0 ? f : b) * spow(Math.sin(t), e)]);
    }
    return pts;
  }
  // Catmull-Rom through keys, `steps` samples per span
  function spline(keys, steps) {
    const out = [], n = keys.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = keys[Math.max(i - 1, 0)], p1 = keys[i], p2 = keys[i + 1], p3 = keys[Math.min(i + 2, n - 1)];
      for (let k = 0; k < steps; k++) {
        const t = k / steps;
        out.push(0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t ** 3));
      }
    }
    out.push(keys[n - 1]);
    return out;
  }
  function ellipsoid(cx, cy, cz, rx, ry, rz, n = 10) {
    const g = new THREE.SphereGeometry(1, n * 2, n);
    g.deleteAttribute("uv");
    g.scale(rx, ry, rz).translate(cx, cy, cz);
    g.computeVertexNormals();
    return g;
  }
  // tube along a Catmull-Rom curve, radius rad(t), capped (dome) at both ends
  function tube(pts, rad, { steps = 12, seg = 10, dome = 0.8, flat = 1 } = {}) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => V(...p)));
    const fr = curve.computeFrenetFrames(steps, false), rings = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, P = curve.getPointAt(t), N = fr.normals[i], B = fr.binormals[i];
      const r = Math.max(typeof rad === "function" ? rad(t) : rad, 1e-4);
      rings.push(Array.from({ length: seg }, (_, j) => {
        const a = (j / seg) * TAU;
        return P.clone().addScaledVector(N, Math.cos(a) * r).addScaledVector(B, Math.sin(a) * r * flat).toArray();
      }));
    }
    return skin(rings, { dome });
  }
  function merge(list) {
    const pos = [], nor = [], idx = [];
    for (const g of list) {
      const base = pos.length / 3, p = g.attributes.position, n = g.attributes.normal;
      for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); }
      const ix = g.index ? g.index.array : Array.from({ length: p.count }, (_, i) => i);
      for (let i = 0; i < ix.length; i++) idx.push(ix[i] + base);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    g.setIndex(idx);
    return g;
  }
  // material groups by a test on each triangle's rest centroid
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
  const root = new THREE.Group();
  root.name = "root";
  const cat = new THREE.Group();
  cat.name = "cat";
  cat.scale.setScalar(height / AUTH);
  root.add(cat);
  const joints = {}, pivots = { cat: [0, 0, 0] };
  function joint(name, parent, x, y, z) {
    const g = new THREE.Group();
    g.name = name;
    const pp = pivots[parent.name] ?? [0, 0, 0];
    g.position.set(x - pp[0], y - pp[1], z - pp[2]);
    parent.add(g);
    joints[name] = g;
    pivots[name] = [x, y, z];
    return g;
  }
  const TH = { threshold: -0.2 };
  function put(j, geo, base, shade, o = {}) {
    const p = pivots[j.name];
    geo.translate(-p[0], -p[1], -p[2]);
    const m = kit.toon(geo, base, shade, { ...TH, ...o });
    j.add(m);
    return m;
  }

  // ---------- head (rings as functions of height, so the face sits on its surface) ----------
  const HC = 0.212, HR = 0.074; // head centre y, half height
  function headRing(th) { // th 0 = chin, PI = crown
    const sn = Math.sin(th), y = HC - HR * Math.cos(th);
    const cheek = Math.exp(-(((th - 1.05) / 0.55) ** 2)); // jowls just below the eye line
    return { y, w: 0.088 * sn ** 0.7 * (1 + 0.07 * cheek), f: 0.07 * sn ** 0.75 * (1 + 0.05 * cheek), b: 0.064 * sn ** 0.8, p: 2.25, z: 0.008 };
  }
  // surface point on the front of the head at (x, y), pushed out by `out`
  function face(x, y, out = 0) {
    const th = Math.acos(Math.min(1, Math.max(-1, (HC - y) / HR)));
    const r = headRing(th), u = Math.min(Math.abs(x) / r.w, 0.999);
    return [x, y, r.z + r.f * (1 - u ** r.p) ** (1 / r.p) + out];
  }
  const head = joint("head", cat, 0, 0.15, 0.01);
  const headRings = [];
  for (let i = 0; i <= 26; i++) headRings.push(ringY(headRing(0.02 + (i / 26) * (Math.PI - 0.04)), 36));
  const headGeo = skin(headRings, { dome: 0.15 });
  // ears: rounded pyramids leaning out, inner red slab in front
  const earGeos = [], innerGeos = [];
  for (const k of [1, -1]) {
    const rings = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10, w = 0.034 * (1 - t) ** 1.1 + 0.003;
      rings.push(ringY({ y: t * 0.07, w, f: w * 0.55, b: w * 0.7, p: 2.2, x: 0, z: 0 }, 16));
    }
    const ear = skin(rings, { dome: 0.4 });
    ear.rotateZ(-k * 0.32).translate(k * 0.05, 0.245, 0);
    earGeos.push(ear);
    const inn = [];
    for (let i = 0; i <= 5; i++) {
      const t = i / 5, w = 0.022 * (1 - t) ** 1.1 + 0.002;
      inn.push(ringY({ y: 0.013 + t * 0.05, w, f: w * 0.35, b: w * 0.2, p: 2.2, z: 0.0 }, 10));
    }
    const ig = skin(inn, { dome: 0.4 });
    ig.translate(0, 0, 0.012).rotateZ(-k * 0.32).translate(k * 0.05, 0.245, 0);
    innerGeos.push(ig);
  }

  // ---------- body ----------
  const BK = [
    { y: 0.0018, w: 0.074, f: 0.07, b: 0.062 },
    { y: 0.012, w: 0.084, f: 0.08, b: 0.07 },
    { y: 0.045, w: 0.088, f: 0.085, b: 0.074 },
    { y: 0.085, w: 0.08, f: 0.078, b: 0.07 },
    { y: 0.12, w: 0.068, f: 0.066, b: 0.062 },
    { y: 0.155, w: 0.058, f: 0.056, b: 0.054 },
    { y: 0.175, w: 0.05, f: 0.048, b: 0.048 },
  ];
  const sp = (k) => spline(BK.map((r) => r[k]), 5);
  const BY = sp("y"), BW = sp("w"), BF = sp("f"), BB = sp("b");
  const bodyRings = BY.map((y, i) => ringY({ y, w: BW[i], f: BF[i], b: BB[i], p: 2.3 }, 44));
  const bodyGeo = skin(bodyRings, { dome: 0.02 });
  // hind feet
  const feetGeos = [1, -1].map((k) => ellipsoid(k * 0.045, 0.0152, 0.072, 0.024, 0.015, 0.03));
  // tail curled round the +X haunch, lying on the base
  const tailGeo = tube([[0, 0.03, -0.065], [0.035, 0.018, -0.082], [0.07, 0.016, -0.062], [0.088, 0.02, -0.028], [0.082, 0.04, -0.008]],
    (t) => 0.013 - 0.003 * t, { steps: 14, seg: 10 });
  // holding arm (the other side) down to the koban
  const o = -s;
  const holdArm = tube([[o * 0.055, 0.135, 0.02], [o * 0.078, 0.112, 0.05], [o * 0.068, 0.098, 0.085]], (t) => 0.021 - 0.002 * t, { steps: 10, seg: 10 });
  const holdPaw = ellipsoid(o * 0.06, 0.098, 0.098, 0.024, 0.02, 0.02);
  // raised upper arm (static: the shoulder is the arm joint, the upper arm stays put)
  const SH = [s * 0.055, 0.135, 0.015], E = [s * 0.118, 0.165, 0.025], Wr = [s * 0.124, 0.232, 0.03], PC = [s * 0.124, 0.252, 0.034];
  const arm = joint("arm", cat, ...SH);
  const upper = merge([tube([SH, [s * 0.095, 0.148, 0.022], E], 0.021, { steps: 10, seg: 12 }), ellipsoid(...E, 0.022, 0.022, 0.022, 8)]);

  // calico patches (white variant only): spheres, group 1 orange, 2 black
  const PATCH = color !== "white" ? [] : [
    [1, 0.06, 0.295, -0.005, 0.045], [1, 0.0, 0.12, -0.085, 0.055], [1, 0.085, 0.04, -0.01, 0.03],
    [2, -0.065, 0.29, 0.0, 0.035], [2, 0.075, 0.09, -0.04, 0.032], [2, -0.06, 0.05, -0.06, 0.03],
  ];
  const patch = (x, y, z) => {
    for (const [g, px, py, pz, r] of PATCH) if ((x - px) ** 2 + (y - py) ** 2 + (z - pz) ** 2 < r * r) return g;
    return 0;
  };
  const whiteGeo = groups(merge([bodyGeo, ...feetGeos, tailGeo, holdArm, holdPaw]), patch);
  const MAT = [kit.cel(BODY[0], BODY[1], TH), kit.cel(C.orange, C.orangeShade, TH), kit.cel(C.black, C.blackShade, TH)];
  const bodyMesh = put(cat, whiteGeo, BODY[0], BODY[1]);
  bodyMesh.material = MAT;
  bodyMesh.name = "body";
  const headMesh = put(head, groups(merge([headGeo, ...earGeos]), patch), BODY[0], BODY[1]);
  headMesh.material = MAT;
  headMesh.name = "headMesh";
  const upperMesh = put(arm, groups(upper, patch), BODY[0], BODY[1]);
  upperMesh.material = MAT;

  // face: closed-arc eyes, nose, mouth, whiskers
  const lineGeos = [];
  for (const k of [1, -1]) {
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI * (0.1 + 0.8 * (i / 6));
      pts.push(face(k * 0.036 + Math.cos(a) * 0.017, 0.214 + Math.sin(a) * 0.009, 0.002));
    }
    lineGeos.push(tube(pts, 0.0032, { steps: 12, seg: 6, dome: 0.6 }));
    for (const [dy, ang] of [[0.0, 0.25], [-0.011, -0.2]]) {
      const wp = [0.052, 0.064, 0.076].map((x, i) => face(k * x, 0.192 + dy + ang * (x - 0.052) + (i === 1 ? 0.0015 : 0), 0.0015));
      lineGeos.push(tube(wp, 0.0019, { steps: 6, seg: 5 }));
    }
    // mouth: two small arcs under the nose
    const m = [];
    for (let i = 0; i <= 4; i++) {
      const a = Math.PI * (1 + i / 4);
      m.push(face(k * 0.008 + Math.cos(a) * 0.008 * k, 0.183 + Math.sin(a) * 0.006, 0.001));
    }
    lineGeos.push(tube(m, 0.0022, { steps: 8, seg: 5 }));
  }
  const fn = face(0, 0.193, -0.002);
  const noseGeo = ellipsoid(fn[0], fn[1], fn[2], 0.009, 0.006, 0.006, 6);

  // collar with bell
  const collarGeo = new THREE.TorusGeometry(0.056, 0.0085, 8, 32);
  collarGeo.deleteAttribute("uv");
  collarGeo.rotateX(Math.PI / 2).scale(1.0, 1, 1.02).rotateX(0.16).translate(0, 0.152, 0.004);
  const bellGeo = ellipsoid(0, 0.128, 0.068, 0.016, 0.016, 0.016, 10);
  const bandGeo = new THREE.TorusGeometry(0.0158, 0.0022, 6, 20);
  bandGeo.deleteAttribute("uv");
  bandGeo.rotateX(Math.PI / 2).translate(0, 0.13, 0.068);
  const slotGeo = ellipsoid(0, 0.12, 0.0835, 0.0025, 0.006, 0.0015, 5);

  // koban plaque: oval slab standing on the haunch, tilted back, with a raised rim
  const KX = o * 0.036, KY = 0.072, KZ = 0.09, KW = 0.03, KH = 0.048, KT = 0.009;
  const kRings = [[-1, 0.88], [-0.75, 1], [0.75, 1], [1, 0.9]].map(([zz, sc]) =>
    Array.from({ length: 28 }, (_, i) => { const t = (i / 28) * TAU; return [KW * sc * Math.cos(t), KH * sc * Math.sin(t), zz * KT * 0.5]; }));
  const kobanGeo = skin(kRings, { dome: 0.01 });
  const rimPts = Array.from({ length: 33 }, (_, i) => { const t = (i / 32) * TAU; return [KW * 0.8 * Math.cos(t), KH * 0.84 * Math.sin(t), KT * 0.5]; });
  const rimGeo = tube(rimPts, 0.0018, { steps: 48, seg: 5 });
  for (const g of [kobanGeo, rimGeo]) g.rotateX(-0.2).translate(KX, KY, KZ);

  put(cat, merge([bellGeo, kobanGeo]), GOLD[0], GOLD[1], { threshold: 0.1 });
  put(cat, merge([bandGeo, rimGeo]), GOLD[1], GOLD[0], { outline: false });
  put(cat, collarGeo, C.red, C.redShade, { threshold: 0.0 });
  put(head, merge(innerGeos), C.red, C.redShade, { outline: false, threshold: -0.5 });
  put(head, noseGeo, C.red, C.red, { outline: false });
  put(head, merge(lineGeos), EYE, EYE, { outline: false });
  put(cat, slotGeo, C.eye, C.eye, { outline: false });

  // ---------- raised forearm (joint paw at the elbow) and paw (joint wrist) ----------
  const paw = joint("paw", arm, ...E);
  const fore = tube([[E[0], E[1] - 0.006, E[2] - 0.002], [(E[0] + Wr[0]) / 2, (E[1] + Wr[1]) / 2, (E[2] + Wr[2]) / 2], Wr], (t) => 0.019 + 0.002 * t, { steps: 8, seg: 12 });
  const foreMesh = put(paw, groups(fore, patch), BODY[0], BODY[1]);
  foreMesh.material = MAT;
  const wrist = joint("wrist", paw, ...Wr);
  const hand = ellipsoid(...PC, 0.025, 0.027, 0.021, 10);
  const handMesh = put(wrist, groups(hand, patch), BODY[0], BODY[1]);
  handMesh.material = MAT;
  // toe lines on the palm (front)
  const toes = [];
  for (const dx of [-0.008, 0.008]) {
    toes.push(tube([[PC[0] + dx, PC[1] + 0.018, PC[2] + 0.014], [PC[0] + dx, PC[1] + 0.01, PC[2] + 0.0195], [PC[0] + dx, PC[1] + 0.002, PC[2] + 0.0205]], 0.0017, { steps: 5, seg: 5 }));
  }
  put(wrist, merge(toes), BODY[1], BODY[1], { outline: false });

  // ---------- poses and clip ----------
  // frame: paw (elbow) rx, wrist rx, head [rx, rz] (deg)
  const POSES = {
    rest: { paw: 0, wrist: 8, head: [0, 0] },
    beckon: { paw: 44, wrist: 55, head: [4, 3] },
  };
  const CLIPS = { beckon: 1.0 };
  function apply(F) {
    joints.paw.rotation.set(F.paw * D, 0, 0);
    joints.wrist.rotation.set(F.wrist * D, 0, 0);
    joints.head.rotation.set(F.head[0] * D, 0, s * F.head[1] * D);
    joints.arm.rotation.set(0, 0, 0);
    root.updateMatrixWorld(true);
  }
  function clip(name, t) {
    const T = CLIPS[name], ph = (((t % T) + T) % T) / T;
    const b = 0.5 - 0.5 * Math.cos(TAU * ph), bl = 0.5 - 0.5 * Math.cos(TAU * (ph - 0.08));
    const A = POSES.rest, B = POSES.beckon;
    return { paw: A.paw + (B.paw - A.paw) * b, wrist: A.wrist + (B.wrist - A.wrist) * bl, head: [B.head[0] * b, B.head[1] * b] };
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`maneki-neko: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      return apply(clip(m[1], +m[2]));
    }
    if (!POSES[name]) throw new Error(`maneki-neko: unknown pose "${name}" (${Object.keys(POSES).join(", ")}, or <clip>@<seconds>)`);
    apply(POSES[name]);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
