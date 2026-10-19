// frog.js — procedural three.js frog for the html-anime model lab (contract: harness/lab/README.md).
//
// CONSTRUCTION. One continuous lofted body: head + trunk are a single skin (no neck), 36 rings of 24 points. Each ring
// has a REST cross-section (14 hand-placed stations read off the Rana temporaria side photo, Catmull-Rom spline) and
// a BALLOON cross-section (a sphere, radius 0.065, sitting on the ground). puff(a) lerps every ring (z, centre y,
// half width, top, bottom) and the superellipse exponent (2.4 -> 2.0) from rest to balloon, rewrites the skin
// vertices in place and recomputes the ink-hull normals. Rings keep their index, so a point on the skin is addressed
// by (u, theta): u = ring index (float), theta 0 = top, 90deg = +X flank, 180deg = belly.
// Pale belly strip = second loft (no ink: the colour change is the line). Mouth line and dorsal folds are thin
// tubes regenerated on every puff(). Eyes (bulging globe in a skin socket), dark temporal mask, tympanum, blush,
// nostrils and 8 dorsal blotches are decals: flat ellipsoids that ride the skin and are re-oriented to its normal.
// Limbs are tapered capsules (LatheGeometry) in Group pivots. Hind leg = thigh, shin, tarsus, webbed foot with 5
// toes (folded Z at rest); forearm hand has 4 splayed fingers (joint hand* closes the fan when scaled in x).
// PROPORTIONS (metres; snout-vent length 0.09): snout z=+0.049, rump z=-0.042, back peak 0.046 high, eye globe
// r=0.0063 (socket 0.0072) at the skull line, hind foot ~0.6 SVL, front arm ~0.3 SVL, extended hind limb ~1.5 SVL.
//
// RIG. root > body (pitch/position) > belly (skin, belly strip, tubes: geometry is rewritten, never scaled).
// Eyes, shoulders, hips and every decal are siblings of belly under body. Each has two anchors, REST and BALLOON
// ({u, theta, depth}); puff(a) lerps the anchor, seats the joint on the live skin (point - normal*depth) and, for
// decals, aligns it to the normal. Nothing is ever a child of a scaled node, so nothing shears.
//
// puff(amount 0..1) is returned from build() next to pose(): it sets the whole inflation state (body shape, eye
// size/bulge, decal growth, arm and leg angles lerped from the current pose's table toward PUFF_ROT) and may be
// called after pose() for any in-between drawing. pose("puff-1/2/3") = rest + puff(0.33 / 0.66 / 1.0). pose(name)
// is absolute: it resets everything, then applies its own puff (default 0).
// POSE TABLE keys: rot (joint -> [rx,ry,rz] deg), p (body position), puff (0..1), scl (extra joint scale: shoulder
// reach, hand.x closes the finger fan for pointing). Rotation convention: limbs hang along -Y, negative rx swings
// them forward (+Z), body rx negative = nose up; angles accumulate down a chain.
// COLOURS (script "noon"): skin #f0c2ae / shade iris #5c3d32; belly strip sky #f2d7ae (lit side practical #fffaf2);
//   eye sclera #f6f3ee / sky; iris sky #f2d7ae / iris; pupil hair #241c16; mask iris #5c3d32 / hair; blush accent #c4452d / iris.

export const meta = {
  name: "frog",
  height: 0.0485,
  script: "noon",
  colors: {
    skin: "#f0c2ae", skinShade: "#5c3d32",
    belly: "#fffaf2", bellyShade: "#f2d7ae",
    sclera: "#f6f3ee", scleraShade: "#f2d7ae",
    iris: "#f2d7ae", irisShade: "#5c3d32",
    pupil: "#241c16",
    mask: "#5c3d32", maskShade: "#241c16",
    accent: "#c4452d", accentShade: "#5c3d32",
  },
  poses: ["rest", "crouch", "leap", "point", "puff-1", "puff-2", "puff-3"],
};

const DEG = Math.PI / 180;

export function build(THREE, kit, colors = meta.colors) {
  const c = colors;
  const root = new THREE.Group();
  root.name = "frog";
  const joints = {};

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
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (v) => Math.min(Math.max(v, 0), 1);

  // ---- geometry helpers -------------------------------------------------------------------------------------
  // Tapered capsule hanging from y=0 (radius r0) down to y=-len (radius r1), rounded at both ends.
  function limb(len, r0, r1, seg = 8) {
    const pts = [];
    for (let i = 0; i <= 2; i++) { const a = (i / 2) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.sin(a) * r1, -len - Math.cos(a) * r1)); }
    for (let i = 0; i <= 2; i++) { const a = (i / 2) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.cos(a) * r0, Math.sin(a) * r0)); }
    return new THREE.LatheGeometry(pts, seg);
  }
  const ball = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);

  // ---- ring tables: rest profile and balloon profile --------------------------------------------------------
  // station = [z, centre y, half width, top height above centre, bottom height below centre]
  const STATIONS = [
    [0.0489, 0.0358, 0.0000, 0.0000, 0.0000],
    [0.0476, 0.0360, 0.0065, 0.0026, 0.0024],
    [0.0440, 0.0351, 0.0105, 0.0052, 0.0051],
    [0.0380, 0.0349, 0.0165, 0.0082, 0.0081],
    [0.0300, 0.0346, 0.0215, 0.0106, 0.0106],
    [0.0200, 0.0305, 0.0250, 0.0128, 0.0150],
    [0.0100, 0.0262, 0.0268, 0.0176, 0.0206],
    [0.0000, 0.0257, 0.0275, 0.0201, 0.0201],
    [-0.0100, 0.0258, 0.0280, 0.0214, 0.0208],
    [-0.0200, 0.0252, 0.0278, 0.0206, 0.0202],
    [-0.0300, 0.0230, 0.0262, 0.0170, 0.0170],
    [-0.0370, 0.0210, 0.0210, 0.0110, 0.0110],
    [-0.0412, 0.0235, 0.0105, 0.0035, 0.0035],
    [-0.0424, 0.0235, 0.0000, 0.0000, 0.0000],
  ];
  const N = 36, EXP_REST = 2 / 2.4, EXP_BAL = 1;
  const curveA = new THREE.CatmullRomCurve3(STATIONS.map((s) => new THREE.Vector3(s[0], s[1], s[2])), false, "centripetal");
  const curveB = new THREE.CatmullRomCurve3(STATIONS.map((s) => new THREE.Vector3(s[3], s[4], 0)), false, "centripetal");
  const REST_RINGS = [], BAL_RINGS = [], RINGS = [];
  const BR = 0.065, BY = 0.0655, BZ = 0.002; // balloon radius, centre height, centre z
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = curveA.getPoint(t), b = curveB.getPoint(t);
    REST_RINGS.push({ z: a.x, cy: a.y, hw: Math.max(a.z, 0), ht: Math.max(b.x, 0), hb: Math.max(b.y, 0) });
    const phi = Math.PI * t, sn = Math.sin(phi);
    BAL_RINGS.push({ z: BZ + BR * Math.cos(phi), cy: BY, hw: BR * sn, ht: BR * sn, hb: BR * sn * 0.92 });
    RINGS.push({ ...REST_RINGS[i] });
  }
  let curExp = EXP_REST;
  const sgnpow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
  const ringPoint = (r, th) => new THREE.Vector3(r.hw * sgnpow(Math.sin(th), curExp), r.cy + (Math.cos(th) >= 0 ? r.ht : r.hb) * sgnpow(Math.cos(th), curExp), r.z);
  // u (float ring index) of a rest z
  function uOfZ(z) {
    let i = 0;
    while (i < N - 1 && REST_RINGS[i + 1].z > z) i++;
    const a = REST_RINGS[i], b = REST_RINGS[i + 1];
    return i + clamp01((a.z - z) / (a.z - b.z));
  }
  function ringAt(u) {
    u = Math.min(Math.max(u, 0), N - 1e-6);
    const i = Math.floor(u), f = u - i, a = RINGS[i], b = RINGS[i + 1];
    return { z: lerp(a.z, b.z, f), cy: lerp(a.cy, b.cy, f), hw: lerp(a.hw, b.hw, f), ht: lerp(a.ht, b.ht, f), hb: lerp(a.hb, b.hb, f) };
  }
  const surf = (u, th) => ringPoint(ringAt(u), th);
  function surfNormal(u, th) {
    u = Math.min(Math.max(u, 0.3), N - 0.3);
    const du = surf(u + 0.25, th).sub(surf(u - 0.25, th));
    const dv = surf(u, th + 0.02).sub(surf(u, th - 0.02));
    const n = du.cross(dv).normalize();
    const r = ringAt(u);
    if (n.dot(surf(u, th).sub(new THREE.Vector3(0, r.cy, r.z))) < 0) n.negate();
    return n;
  }

  // Loft strip over rings i0..i1, theta range per ring from thRange(i), pushed off the skin by offset.
  function loftGeo(i0, i1, M) {
    const nr = i1 - i0 + 1, idx = [];
    for (let i = 0; i < nr - 1; i++) for (let j = 0; j < M; j++) {
      const a = i * (M + 1) + j, b = a + 1, d = a + M + 1, e = d + 1;
      idx.push(a, b, d, b, e, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(nr * (M + 1) * 3), 3));
    g.setIndex(idx);
    return g;
  }
  function fillLoft(g, i0, i1, M, thRange, offset = 0) {
    const p = g.attributes.position;
    let k = 0;
    for (let i = i0; i <= i1; i++) {
      const [a0, a1] = thRange(i);
      for (let j = 0; j <= M; j++) { const v = ringPoint(RINGS[i], a0 + ((a1 - a0) * j) / M); p.setXYZ(k++, v.x, v.y, v.z); }
    }
    g.computeVertexNormals();
    if (offset) {
      const n = g.attributes.normal;
      for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * offset, p.getY(i) + n.getY(i) * offset, p.getZ(i) + n.getZ(i) * offset);
    }
    p.needsUpdate = true;
    if (g.attributes.hullNormal) { g.deleteAttribute("hullNormal"); kit.hullNormals(g); } // ink hull follows the new shape
    g.computeBoundingSphere();
  }

  // ---- rig --------------------------------------------------------------------------------------------------
  const body = joint("body", root, 0, 0, 0);
  const belly = joint("belly", body, 0, 0, 0);

  const SKIN_M = 24, BELLY_M = 10;
  const skinGeo = loftGeo(0, N, SKIN_M);
  belly.add(kit.toon(skinGeo, c.skin, c.skinShade));
  // Pale belly and throat strip; narrows to a point at the rump (rings uFull..uZero).
  const B0 = Math.ceil(uOfZ(0.046)), B1 = Math.floor(uOfZ(-0.037)), UFULL = uOfZ(-0.017), UZERO = uOfZ(-0.037);
  const bellyGeo = loftGeo(B0, B1, BELLY_M);
  let puffAmt = 0;
  const bellyRange = (i) => {
    const f = clamp01((UZERO - i) / (UZERO - UFULL)), w = f * f * (3 - 2 * f), t0 = lerp(125, 108, puffAmt);
    return [(180 - (180 - t0) * w) * DEG, (180 + (180 - t0) * w) * DEG];
  };
  belly.add(kit.toon(bellyGeo, c.belly, c.bellyShade, { outline: false }));
  const bellyMesh = belly.children[1];

  // Thin tubes on the skin (mouth line, dorsal folds): points are {rest:[z,th], bal:[u,th]|null}, regenerated per puff.
  const tubes = [];
  function addTube(pts, side, radius, base, shade, grow) {
    const mesh = kit.toon(new THREE.BufferGeometry(), base, shade, { outline: false });
    belly.add(mesh);
    tubes.push({ mesh, side, radius, grow, pts: pts.map(([z, th, bu, bth]) => ({ u: uOfZ(z), th, bu: bu ?? uOfZ(z), bth: bth ?? th })) });
  }
  function refreshTube(t, a) {
    const pts = t.pts.map((p) => {
      const u = lerp(p.u, p.bu, a), th = t.side * lerp(p.th, p.bth, a) * DEG;
      return surf(u, th).addScaledVector(surfNormal(u, th), 0.0003);
    });
    t.mesh.geometry.dispose();
    t.mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, t.radius * lerp(1, t.grow, a), 4, false);
  }
  // Mouth: rest line (z, theta) and its balloon version (u, theta) = a wide grin around the front of the sphere.
  for (const s of [1, -1]) {
    addTube([[0.0472, 104, 0.6, 106], [0.0420, 108, 2.2, 108], [0.0340, 109, 5.5, 108], [0.0260, 100, 9.5, 102], [0.0205, 84, 13.5, 86]], s, 0.00055, c.pupil, c.pupil, 1.8);
    addTube([[0.0250, 38], [0.0150, 36], [0.0040, 38], [-0.0080, 42], [-0.0190, 47], [-0.0290, 52]], s, 0.00055, c.mask, c.mask, 1.8);
  }

  // Riders: things seated on the live skin. anchor = { u, th (rad, >=0), depth (under the skin, negative = outside) }.
  const riders = [];
  function anchorOf(p0) {
    const u = uOfZ(p0[2]);
    let best = null;
    for (let t = 0; t <= 180; t += 1) {
      const q = surf(u, t * DEG), n = surfNormal(u, t * DEG);
      const d = new THREE.Vector3(...p0).sub(q);
      if (!best || d.lengthSq() < best.score) best = { score: d.lengthSq(), th: t * DEG, u, depth: -d.dot(n) };
    }
    return best;
  }
  const anchor = (u, thDeg, depth) => ({ u, th: thDeg * DEG, depth });
  function ride(joint, rest, bal, side, extra = {}) {
    const r = { joint, rest, bal, side, ...extra };
    riders.push(r);
    return r;
  }
  const _z = new THREE.Vector3(0, 0, 1);
  function seat(r, a) {
    const u = lerp(r.rest.u, r.bal.u, a), th = r.side * lerp(r.rest.th, r.bal.th, a), depth = lerp(r.rest.depth, r.bal.depth, a);
    const n = surfNormal(u, th);
    r.joint.position.copy(surf(u, th)).addScaledVector(n, -depth);
    if (r.orient) r.joint.quaternion.setFromUnitVectors(_z, n);
    if (r.kMax) r.joint.scale.setScalar(lerp(1, r.kMax, a));
  }
  // Flat ellipsoid decal riding the skin. rest = [z, thetaDeg]; bal = [u, thetaDeg] (null = same u, theta).
  function decal(geo, base, shade, rest, bal, side, sx, sy, sz, lift, kMax) {
    const m = kit.toon(geo, base, shade, { outline: false });
    m.scale.set(sx, sy, sz);
    const g = new THREE.Group();
    g.add(m);
    body.add(g);
    const ru = uOfZ(rest[0]);
    ride(g, anchor(ru, rest[1], -lift), anchor(bal ? bal[0] : ru, bal ? bal[1] : rest[1], -lift), side, { orient: true, kMax });
  }
  for (const s of [1, -1]) {
    decal(ball(1, 10, 7), c.mask, c.maskShade, [0.0215, 90], [12.5, 92], s, 0.0058, 0.0068, 0.0008, 0.0001, 1.45); // temporal mask
    decal(ball(1, 8, 6), c.iris, c.irisShade, [0.0215, 90], [12.5, 92], s, 0.0032, 0.0032, 0.0008, 0.0003, 1.45); // tympanum
    decal(ball(1, 8, 6), c.accent, c.accentShade, [0.0262, 74], [10.5, 74], s, 0.0034, 0.0022, 0.0008, 0.0001, 1.45); // blush
    decal(ball(1, 6, 4), c.pupil, c.pupil, [0.0452, 24], [1.6, 26], s, 0.0009, 0.0007, 0.0005, 0.0001, 1.4); // nostril
  }
  for (const [z, th, r] of [[0.0160, -16, 0.0034], [0.0100, 22, 0.0040], [0.0020, -26, 0.0046], [-0.0060, 12, 0.0042], [-0.0120, -22, 0.0038], [-0.0200, 26, 0.0040], [-0.0240, -10, 0.0034], [-0.0300, 16, 0.0030]])
    decal(ball(1, 8, 5), c.mask, c.maskShade, [z, Math.abs(th)], null, Math.sign(th), r, r * 0.8, 0.0007, 0.0001, 1.7); // dorsal blotches

  // Eyes (bulging, at the skull line). The bulge grows with puff: eye scale up, depth factor down.
  const EYE_REST = [0.0140, 0.0412, 0.0320];
  const eyes = {};
  for (const [name, s] of [["eyeL", 1], ["eyeR", -1]]) {
    const e = joint(name, body, s * EYE_REST[0], EYE_REST[1], EYE_REST[2]);
    put(e, kit.toon(ball(0.0072, 12, 8), c.skin, c.skinShade));
    const globe = put(e, kit.toon(ball(0.0063, 12, 8), c.sclera, c.scleraShade), s * 0.0010, 0.0006, 0.0013);
    // iris, pupil and glint are flattened discs on the globe, facing out-and-forward so they read from front and side
    const dir = new THREE.Vector3(s * 0.55, 0.22, 0.8).normalize();
    const disc = (r, h, dist, base, shade, dx = 0, dy = 0) => {
      const m = kit.toon(ball(1, 10, 6), base, shade, { outline: false });
      m.scale.set(r, r, h);
      m.quaternion.setFromUnitVectors(_z, dir);
      m.position.copy(dir).multiplyScalar(dist).add(new THREE.Vector3(dx, dy, 0));
      globe.add(m);
    };
    disc(0.0044, 0.0008, 0.0054, c.iris, c.irisShade);
    disc(0.0030, 0.0008, 0.0061, c.pupil, c.pupil);
    disc(0.0010, 0.0006, 0.0065, c.sclera, c.sclera, s * 0.0012, 0.0014);
    eyes[name] = e;
    const rest = anchorOf([EYE_REST[0], EYE_REST[1], EYE_REST[2]]);
    ride(e, rest, anchor(8, 48, -0.0015), s, { eyeMax: 1.5 });
  }

  // Limbs
  const SHOULDER_REST = [0.0225, 0.0285, 0.0090];
  const HIP_REST = [0.0270, 0.0270, -0.0270];
  function hand(wrist, s, side) {
    const hj = joint(`hand${side}`, wrist, 0, 0, 0); // scaling hand.x closes the fan of fingers (pointing)
    const palm = put(hj, kit.toon(ball(0.0040, 8, 6), c.skin, c.skinShade), 0, -0.0010, 0.0005);
    palm.scale.set(1.2, 1, 0.65);
    for (const [ang, len] of [[-34, 0.0098], [-12, 0.0128], [12, 0.0128], [34, 0.0098]]) {
      const f = new THREE.Group();
      f.rotation.z = ang * DEG * s;
      hj.add(f);
      put(f, kit.toon(limb(len, 0.0021, 0.0017, 5), c.skin, c.skinShade), 0, -0.0030, 0);
    }
  }
  for (const [side, s] of [["L", 1], ["R", -1]]) {
    const sh = joint(`shoulder${side}`, body, s * SHOULDER_REST[0], SHOULDER_REST[1], SHOULDER_REST[2]);
    ride(sh, anchorOf(SHOULDER_REST), anchor(10, 135, 0), s);
    put(sh, kit.toon(limb(0.0145, 0.0062, 0.0050), c.skin, c.skinShade));
    const el = joint(`elbow${side}`, sh, 0, -0.0145, 0);
    put(el, kit.toon(limb(0.0150, 0.0048, 0.0040), c.skin, c.skinShade));
    const wr = joint(`wrist${side}`, el, 0, -0.0150, 0);
    hand(wr, s, side);

    const hp = joint(`hip${side}`, body, s * HIP_REST[0], HIP_REST[1], HIP_REST[2]);
    ride(hp, anchorOf(HIP_REST), anchor(27, 122, 0), s);
    const thigh = put(hp, kit.toon(limb(0.0340, 0.0112, 0.0082), c.skin, c.skinShade));
    thigh.scale.set(0.85, 1, 1);
    const kn = joint(`knee${side}`, hp, 0, -0.0340, 0);
    const shin = put(kn, kit.toon(limb(0.0420, 0.0080, 0.0054), c.skin, c.skinShade));
    shin.scale.set(0.8, 1, 1);
    const an = joint(`ankle${side}`, kn, 0, -0.0420, 0);
    put(an, kit.toon(limb(0.0240, 0.0048, 0.0040, 8), c.skin, c.skinShade));
    const ft = joint(`foot${side}`, an, 0, -0.0240, 0);
    // webbed foot: a flat fan + 5 toes along -Y of the foot pivot
    const toes = [[-30, 0.0210], [-15, 0.0280], [0, 0.0320], [15, 0.0350], [30, 0.0270]];
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    toes.forEach(([a, l], i) => {
      const x = Math.sin(a * DEG * s) * l * 0.9, y = -Math.cos(a * DEG) * l * 0.9;
      i === 0 ? shape.lineTo(x, y) : shape.quadraticCurveTo(x * 0.55, y * 0.6, x, y);
    });
    shape.lineTo(0, 0);
    const web = new THREE.ExtrudeGeometry(shape, { depth: 0.0008, bevelEnabled: false, curveSegments: 4 });
    web.translate(0, 0, -0.0004);
    ft.add(kit.toon(web, c.bellyShade, c.skinShade, { outline: false }));
    toes.forEach(([a, l]) => {
      const t = new THREE.Group();
      t.rotation.z = a * DEG * s;
      ft.add(t);
      put(t, kit.toon(limb(l, 0.0027, 0.0020, 5), c.skin, c.skinShade), 0, -0.0020, 0);
    });
  }

  // ---- poses ------------------------------------------------------------------------------------------------
  const REST = {
    body: [0, 0, 0],
    eyeL: [0, 0, 0], eyeR: [0, 0, 0],
    shoulderL: [30, 0, 12], elbowL: [-62, 0, 0], wristL: [-58, 0, 0],
    shoulderR: [30, 0, -12], elbowR: [-62, 0, 0], wristR: [-58, 0, 0],
    hipL: [-63, 0, 12], kneeL: [146, 0, -8], ankleL: [-171, 0, 0], footL: [0, 0, 0],
    hipR: [-63, 0, -12], kneeR: [146, 0, 8], ankleR: [-171, 0, 0], footR: [0, 0, 0],
  };
  // Limb angles at full puff (a=1); at a<1 each is lerped from the pose's own table (hand flat: shoulder+elbow+wrist=-90).
  const PUFF_ROT = {
    body: [0, 0, 0],
    shoulderL: [15, 0, 38], elbowL: [-55, 0, 0], wristL: [-50, 0, 0],
    shoulderR: [15, 0, -38], elbowR: [-55, 0, 0], wristR: [-50, 0, 0],
    hipL: [-38, 0, 30], kneeL: [115, 0, -12], ankleL: [-160, 0, 0],
    hipR: [-38, 0, -30], kneeR: [115, 0, 12], ankleR: [-160, 0, 0],
  };
  const BASE = { p: [0, 0, 0], puff: 0 };
  const POSES = {
    rest: { ...BASE, rot: {} },
    crouch: {
      ...BASE, p: [0, 0.0016, 0],
      rot: { body: [-14, 0, 0], shoulderL: [-10, 0, 10], shoulderR: [-10, 0, -10], elbowL: [-50, 0, 0], elbowR: [-50, 0, 0], wristL: [-16, 0, 0], wristR: [-16, 0, 0],
        hipL: [-82, 0, 10], hipR: [-82, 0, -10], kneeL: [170, 0, -6], kneeR: [170, 0, 6], ankleL: [-158, 0, 0], ankleR: [-158, 0, 0] },
    },
    leap: {
      ...BASE, p: [0, 0.0556, 0],
      rot: { body: [-30, 0, 0], shoulderL: [-90, 0, 12], shoulderR: [-90, 0, -12], elbowL: [-5, 0, 0], elbowR: [-5, 0, 0], wristL: [-5, 0, 0], wristR: [-5, 0, 0],
        hipL: [90, 0, 6], hipR: [90, 0, -6], kneeL: [8, 0, 0], kneeR: [8, 0, 0], ankleL: [-10, 0, 0], ankleR: [-10, 0, 0] },
    },
    point: {
      ...BASE, p: [0, 0.0033, 0],
      scl: { shoulderL: [1.15, 1.6, 1.15], handL: [0.4, 1, 1] },
      rot: { body: [-6, 0, 0], shoulderL: [-98, 0, 28], elbowL: [-4, 0, 0], wristL: [-4, 0, 0] },
    },
    "puff-1": { ...BASE, puff: 0.33, rot: {} },
    "puff-2": { ...BASE, puff: 0.66, rot: {} },
    "puff-3": { ...BASE, puff: 1, rot: {} },
  };

  const SCALED = ["shoulderL", "shoulderR", "handL", "handR"]; // joints a pose may scale (arm reach, closed hand)
  let baseTable = { ...REST };
  function puff(a) {
    a = clamp01(a);
    puffAmt = a;
    curExp = lerp(EXP_REST, EXP_BAL, a);
    for (let i = 0; i <= N; i++) {
      const r = REST_RINGS[i], b = BAL_RINGS[i], o = RINGS[i];
      o.z = lerp(r.z, b.z, a); o.cy = lerp(r.cy, b.cy, a); o.hw = lerp(r.hw, b.hw, a); o.ht = lerp(r.ht, b.ht, a); o.hb = lerp(r.hb, b.hb, a);
    }
    fillLoft(skinGeo, 0, N, SKIN_M, () => [0, Math.PI * 2]);
    fillLoft(bellyGeo, B0, B1, BELLY_M, bellyRange, lerp(0.0003, 0.0008, a));
    for (const t of tubes) refreshTube(t, a);
    for (const [j, v] of Object.entries(baseTable)) {
      const to = PUFF_ROT[j] ?? v;
      joints[j].rotation.set(lerp(v[0], to[0], a) * DEG, lerp(v[1], to[1], a) * DEG, lerp(v[2], to[2], a) * DEG);
    }
    for (const r of riders) seat(r, a);
    const es = lerp(1, 1.5, a);
    eyes.eyeL.scale.setScalar(es);
    eyes.eyeR.scale.setScalar(es);
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const P = POSES[name];
    if (!P) throw new Error(`unknown pose "${name}" (${Object.keys(POSES).join(", ")})`);
    baseTable = { ...REST, ...P.rot };
    body.position.set(...P.p);
    for (const j of SCALED) joints[j].scale.set(...(P.scl?.[j] ?? [1, 1, 1]));
    puff(P.puff);
  }
  pose("rest");
  return { root, joints, pose, puff };
}
