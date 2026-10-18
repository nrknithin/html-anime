// dragon.js — a four-legged Western dragon with bat wings, for the model lab (see harness/lab/README.md).
// No imports, no clock, no Math.random: THREE and the kit come in as arguments.
//
// Construction
// - Neck + torso + tail are ONE loft: rings swept along a Catmull-Rom spine (tail tip -> nape) and
//   CPU-skinned to the chain tail5..tail0, body, neck0..neck3, head (linear blend of two joints near
//   each pivot), so the neck and tail bend without seams. The belly band is material group 1; twin rings
//   2 cm apart give thin plate seams (group 2, iris) from mid-tail to the throat.
// - Head, jaw, limbs, horns, claws: static lofts (superellipse rings along a polyline) under their joints.
// - Wings: arm + four finger spars on joints. Each membrane panel is a ruled surface between two
//   polylines (arm or wrist apex -> scalloped trailing edge), rebuilt in pose() from the joint positions,
//   stored as two layers 1.2 cm apart so it shades and inks from both sides; rim vertices get a hull
//   normal that points outward in the sheet, so the ink closes face-on and stays a line edge-on.
// - Right limbs/wing live under a mirrored group (scale.x = -1): the same pose numbers mirror themselves.
// - Bind pose = all joint rotations zero (wings spread flat along +X). REST folds the wings.
//
// Proportions, measured on the model (B = snout tip to hip joint = 2.5 m; BRIEF ratios Bertuch / Welsh in brackets)
//   head 0.27 B [0.25/0.33], neck 0.36 B S-curved up like Welsh [0.35/0.32], trunk wing-root->hip 0.37 B [0.40/0.50],
//   tail 1.3 B lying low with a lifted arrow tip [1.3], legs 0.35 B front / 0.39 B hind standing [Welsh 0.33-0.35;
//   Bertuch crouches at 0.2], back 0.52 B above ground, head top 0.88 B.
//   Wing: humerus 0.48, forearm 0.85, digits II-V 0.72 / 1.38 / 1.25 / 1.10 m (bat: 0.55 F / F / 0.87 / 1.63 / 1.5 / 1.38 F),
//   span 4.9 m = 1.9 B in wings-down (heraldic size; a true bat would be 3.6 B).
//
// Two-tone pairs, base / shade, all from the "noon" script (Paper noon):
//   hide     accent #c4452d / iris #5c3d32     belly  moon #fff6e4 / sky #f2d7ae
//   membrane skin #f0c2ae / iris #5c3d32       bone   iris #5c3d32 / hair #241c16 (spines, spade)
//   (membrane shade is iris, not accent: a wing seen from below must not merge with the red body; spars are hide red)
//   horn     sky #f2d7ae / iris #5c3d32        teeth  practical #fffaf2 / sky #f2d7ae
//   eye      practical #fffaf2 (glow, -0.25)   pupil, mouth hair #241c16 / ink #2c261f

export const meta = {
  name: "dragon",
  height: 2.21,
  script: "noon",
  colors: {
    hide: "#c4452d", hideShade: "#5c3d32",
    belly: "#fff6e4", bellyShade: "#f2d7ae",
    wing: "#f0c2ae", wingShade: "#5c3d32",
    bone: "#5c3d32", boneShade: "#241c16",
    horn: "#f2d7ae", hornShade: "#5c3d32",
    tooth: "#fffaf2", toothShade: "#f2d7ae",
    eye: "#fffaf2", pupil: "#241c16",
    mouth: "#241c16", mouthShade: "#2c261f",
  },
  poses: ["rest", "wings-up", "wings-down", "roar"],
};

// Joint rotations in degrees [rx, ry, rz], absolute. A key without L/R sets both sides (the right side is
// mirrored, so one row is symmetric). Wing bones lie along +X; ry folds in the wing plane (+ = toward the tail
// when spread), rz lifts. Neck (points +Z/up): -rx lifts the far end. Tail (points -Z): +rx lifts it.
const BIND = {
  body: [0, 0, 0], neck0: [0, 0, 0], neck1: [0, 0, 0], neck2: [0, 0, 0], neck3: [0, 0, 0], head: [0, 0, 0], jaw: [0, 0, 0],
  tail0: [0, 0, 0], tail1: [0, 0, 0], tail2: [0, 0, 0], tail3: [0, 0, 0], tail4: [0, 0, 0], tail5: [0, 0, 0],
  shoulder: [0, 0, 0], elbow: [0, 0, 0], wrist: [0, 0, 0], hip: [0, 0, 0], knee: [0, 0, 0], ankle: [0, 0, 0],
  wing: [0, 0, 0], wingElbow: [0, 0, 0], wingWrist: [0, 0, 0], finger1: [0, 0, 0], finger2: [0, 0, 0], finger3: [0, 0, 0], finger4: [0, 0, 0],
};
const REST = {
  ...BIND,
  head: [6, 0, 0], tail2: [0, 8, 0], tail3: [0, 10, 0], tail4: [10, -6, 0], tail5: [16, 0, 0], // tail tip lifts
  // folded: humerus back along the flank, forearm up-forward (wrist knuckle above the shoulders), fingers back
  wing: [70, 13, -84], wingElbow: [0, 151, 0], finger1: [0, -147, 0], finger2: [0, -157, 0], finger3: [0, -166, 0], finger4: [0, -178, 0],
  shoulder: [0, 0, 5], wrist: [0, 0, -5], hip: [0, 0, 4], ankle: [0, 0, -4], // legs splay a little, feet flat
};
const SPREAD = { wingElbow: [0, -60, 0], finger1: [0, 8, 0], finger2: [0, 36, 0], finger3: [0, 68, 0], finger4: [0, 100, 0] };
const POSES = {
  rest: {},
  "wings-up": { ...SPREAD, wing: [0, 52, 60], wingElbow: [0, -60, 10], wingWrist: [0, 0, 8] },
  "wings-down": { ...SPREAD, wing: [10, 22, -20], wingElbow: [0, -68, -6], wingWrist: [0, 0, -4] }, // downstroke sweeps forward
  roar: {
    neck0: [-14, 0, 0], neck1: [-12, 0, 0], neck2: [6, 0, 0], neck3: [12, 0, 0], head: [-34, 0, 0], jaw: [38, 0, 0],
    ...SPREAD, wing: [-10, 38, 42], wingElbow: [0, -72, 6],
    tail0: [6, 0, 0], tail1: [6, 8, 0], tail2: [-4, 12, 0], tail3: [-8, 14, 0], tail4: [-6, 10, 0],
  },
};
const DEG = Math.PI / 180;
const ZO = 0.69; // model-space shift along z

export function build(THREE, kit, colors = meta.colors) {
  const c = colors;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const root = new THREE.Group();
  root.name = "dragon";
  const space = new THREE.Group(); // model space, shifted so the bbox centers on z = 0 (the tail is long)
  space.position.z = ZO;
  root.add(space);
  const joints = {};
  const abs = new Map([[space, V()]]); // rest (bind) position of every group in model space

  // A pivot at an absolute bind position (nothing is rotated at bind, so local = abs - parent abs).
  const joint = (name, parent, x, y, z) => {
    const g = new THREE.Group();
    g.name = name;
    const p = abs.get(parent);
    g.position.set(x - p.x, y - p.y, z - p.z);
    parent.add(g);
    abs.set(g, V(x, y, z));
    if (name) joints[name] = g;
    return g;
  };
  const put = (parent, mesh, x = 0, y = 0, z = 0) => (mesh.position.set(x, y, z), parent.add(mesh), mesh);
  const toon = (g, base, shade, o) => kit.toon(g, base, shade, o);

  // ---------- geometry helpers ----------
  // Loft: stations [x, y, z, rx, ry]; rings are superellipses (pow 2 = ellipse, higher = boxier) in the
  // plane across the polyline; rx runs along `side`, ry along tangent x side. rx = ry = 0 is a pointed cap.
  // `band` = [deg0, deg1] puts faces in that ring arc (90 = up, 270 = down) into material group 1;
  // `seam(i)` true puts the band faces between rings i and i+1 into group 2 (thin plate lines).
  function loft(st, { seg = 12, side = [1, 0, 0], pow = 2, under = 1, band = null, seam = null } = {}) {
    const pos = [], main = [], grp = [], grp2 = [], ring = [], S0 = V(...side);
    const isPt = (i) => st[i][3] === 0 && st[i][4] === 0;
    for (let i = 0; i < st.length; i++) {
      const [x, y, z, rx, ry] = st[i];
      const T = V(...st[Math.min(i + 1, st.length - 1)]).sub(V(...st[Math.max(i - 1, 0)])).normalize();
      const S = S0.clone().addScaledVector(T, -S0.dot(T)).normalize();
      const U = V().crossVectors(T, S);
      ring.push(pos.length / 3);
      if (isPt(i)) { pos.push(x, y, z); continue; }
      for (let j = 0; j < seg; j++) {
        const t = (j / seg) * 2 * Math.PI, co = Math.cos(t), si = Math.sin(t);
        const px = rx * Math.sign(co) * Math.abs(co) ** (2 / pow);
        const py = ry * Math.sign(si) * Math.abs(si) ** (2 / pow) * (si < 0 ? under : 1);
        pos.push(x + S.x * px + U.x * py, y + S.y * px + U.y * py, z + S.z * px + U.z * py);
      }
    }
    const inBand = (j) => band && (j + 0.5) * (360 / seg) > band[0] && (j + 0.5) * (360 / seg) < band[1];
    for (let i = 0; i < st.length - 1; i++) {
      for (let j = 0; j < seg; j++) {
        const j1 = (j + 1) % seg;
        const a0 = isPt(i) ? ring[i] : ring[i] + j, a1 = isPt(i) ? ring[i] : ring[i] + j1;
        const b0 = isPt(i + 1) ? ring[i + 1] : ring[i + 1] + j, b1 = isPt(i + 1) ? ring[i + 1] : ring[i + 1] + j1;
        const out = inBand(j) ? (seam && seam(i) ? grp2 : grp) : main;
        if (!isPt(i)) out.push(a0, a1, b0);
        if (!isPt(i + 1)) out.push(a1, b1, b0);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex([...main, ...grp, ...grp2]);
    if (band) { g.addGroup(0, main.length, 0); g.addGroup(main.length, grp.length, 1); }
    if (grp2.length) g.addGroup(main.length + grp.length, grp2.length, 2);
    g.computeVertexNormals();
    g.userData.ring = ring;
    return g;
  }
  // Round both ends of a station list with a hemisphere-ish cap (limbs, bones) instead of a spike.
  const capped = (st) => {
    const end = (i, j) => {
      const [x, y, z, rx, ry] = st[i], T = V(...st[i]).sub(V(...st[j])).normalize(), r = Math.max(rx, ry);
      return [[x + T.x * r * 0.55, y + T.y * r * 0.55, z + T.z * r * 0.55, rx * 0.83, ry * 0.83], [x + T.x * r * 0.95, y + T.y * r * 0.95, z + T.z * r * 0.95, 0, 0]];
    };
    const [a1, a2] = end(0, 1), [b1, b2] = end(st.length - 1, st.length - 2);
    return [a2, a1, ...st, b1, b2];
  };
  // Tapered tube along points (radius r0 -> r1); pointed tip when r1 = 0, round caps otherwise (an open end shows
  // as a black hole: the BackSide hull is visible through it).
  const tube = (pts, r0, r1, o = {}) => {
    const st = capped(pts.map((p, i) => { const r = r0 + (r1 - r0) * (i / (pts.length - 1)); return [...p, r, r * (o.flat ?? 1)]; }));
    return loft(r1 > 0 ? st : st.slice(0, -2), { seg: 8, ...o });
  };
  // A two-material mesh (group 0 / group 1) with one ink hull.
  const toon2 = (g, b0, s0, b1, s1) => { const m = toon(g, b0, s0); m.material = [kit.cel(b0, s0), kit.cel(b1, s1)]; return m; };
  const ellipsoid = (rx, ry, rz, w = 12, h = 8) => new THREE.SphereGeometry(1, w, h).scale(rx, ry, rz);
  // Flat extruded spike (shape in XY, tip up and swept back), turned so shape-X runs to -Z, thickness along X.
  function spikeGeo(w, h, t) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.quadraticCurveTo(-w * 0.05, h * 0.62, w * 0.42, h);
    s.quadraticCurveTo(w * 0.3, h * 0.4, w / 2, 0);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 4 });
    g.translate(0, 0, -t / 2);
    g.rotateY(Math.PI / 2);
    return g;
  }
  // Curved claw: from p, along dir d (unit-ish), hooking down.
  const claw = (x, y, z, len, r, dz = 1) =>
    tube([[x, y + r * 0.6, z], [x, y + r * 0.3, z + len * 0.55 * dz], [x, y - len * 0.25, z + len * dz]], r, 0, { seg: 6 });

  // ---------- spine: neck + torso + tail, one skinned loft ----------
  // [joint, z, y, rx, ry]; the curve passes through every row, joints sit on their rows.
  const CTRL = [
    [null, -3.5, 0.5, 0, 0],
    ["tail5", -3.2, 0.31, 0.035, 0.04],
    ["tail4", -2.7, 0.22, 0.055, 0.06],
    ["tail3", -2.15, 0.27, 0.085, 0.09],
    ["tail2", -1.6, 0.45, 0.12, 0.13],
    ["tail1", -1.05, 0.74, 0.165, 0.18],
    ["tail0", -0.55, 0.97, 0.22, 0.25],
    [null, -0.15, 1.01, 0.26, 0.29],
    ["body", 0.35, 0.97, 0.27, 0.3],
    [null, 0.85, 1.0, 0.29, 0.34],
    ["neck0", 1.18, 1.15, 0.22, 0.25],
    ["neck1", 1.38, 1.4, 0.16, 0.18],
    ["neck2", 1.48, 1.62, 0.135, 0.145],
    ["neck3", 1.55, 1.8, 0.12, 0.13],
    ["head", 1.62, 1.92, 0.11, 0.12],
    [null, 1.74, 1.93, 0, 0],
  ];
  const at = (name) => { const r = CTRL.find((q) => q[0] === name); return [0, r[2], r[1]]; };
  const body = joint("body", space, ...at("body"));
  const tails = [];
  let prev = body;
  for (const n of ["tail0", "tail1", "tail2", "tail3", "tail4", "tail5"]) tails.push((prev = joint(n, prev, ...at(n))));
  prev = body;
  for (const n of ["neck0", "neck1", "neck2", "neck3", "head"]) prev = joint(n, prev, ...at(n));
  const head = joints.head;

  const curve = new THREE.CatmullRomCurve3(CTRL.map((q) => V(0, q[2], q[1])), false, "centripetal");
  const DIV = 40, lens = curve.getLengths((CTRL.length - 1) * DIV), total = lens[lens.length - 1];
  const sOf = (i) => lens[i * DIV]; // arc length at control row i
  const tOfS = (s) => { // curve param at arc length s, from our own table (getUtoTmapping uses another one)
    let i = 1;
    while (i < lens.length - 1 && lens[i] < s) i++;
    const f = (s - lens[i - 1]) / (lens[i] - lens[i - 1] || 1);
    return Math.min(1, Math.max(0, (i - 1 + f) / (lens.length - 1)));
  };
  const sAt = Object.fromEntries(CTRL.map((q, i) => [q[0], sOf(i)]).filter((e) => e[0]));
  const cr = (a, b, c2, d, f) => 0.5 * (2 * b + (c2 - a) * f + (2 * a - 5 * b + 4 * c2 - d) * f * f + (3 * b - a - 3 * c2 + d) * f * f * f);
  const radiusAt = (u, k) => { // u = curve param 0..1, k = 3 (rx) or 4 (ry)
    const n = CTRL.length - 1, t = Math.min(u * n, n - 1e-6), i = Math.floor(t), f = t - i;
    const g = (j) => CTRL[Math.max(0, Math.min(n, j))][k];
    return Math.max(0, cr(g(i - 1), g(i), g(i + 1), g(i + 2), f));
  };
  // Rings every total/74 (~7.7 cm); from mid-tail to the throat every second ring gets a twin 2 cm behind it,
  // and the belly-band faces between the pair become a dark plate seam.
  const NS = 74, sList = [], seamRing = new Set();
  for (let k = 0; k <= NS; k++) {
    const s = (k / NS) * total;
    sList.push(s);
    if (k % 2 === 0 && s > sAt.tail3 && s < sAt.head - 0.12) { seamRing.add(sList.length - 1); sList.push(s + 0.02); }
  }
  const stations = [], sStation = [], LAST = sList.length - 1;
  sList.forEach((s, k) => {
    const u = tOfS(s), p = curve.getPoint(u), end = k === 0 || k === LAST;
    stations.push([p.x, p.y, p.z, end ? 0 : radiusAt(u, 3), end ? 0 : radiusAt(u, 4)]);
    sStation.push(s);
  });
  // bone intervals along the spine and blend weights (50/50 at a pivot, rigid mid-bone)
  const BONES = [
    ["tail5", 0, sAt.tail5], ["tail4", sAt.tail5, sAt.tail4], ["tail3", sAt.tail4, sAt.tail3], ["tail2", sAt.tail3, sAt.tail2],
    ["tail1", sAt.tail2, sAt.tail1], ["tail0", sAt.tail1, sAt.tail0], ["body", sAt.tail0, sAt.neck0],
    ["neck0", sAt.neck0, sAt.neck1], ["neck1", sAt.neck1, sAt.neck2], ["neck2", sAt.neck2, sAt.neck3], ["neck3", sAt.neck3, sAt.head], ["head", sAt.head, total + 1],
  ];
  const weights = sStation.map((s) => {
    const b = Math.max(0, BONES.findIndex(([, s0, s1]) => s >= s0 && s < s1));
    const [, s0, s1] = BONES[b], h = Math.min(0.18, 0.45 * (s1 - s0)), w = [[b, 1]];
    if (b < BONES.length - 1 && s1 - s < h) { const x = 0.5 * (1 - (s1 - s) / h); w[0][1] -= x; w.push([b + 1, x]); }
    if (b > 0 && s - s0 < h) { const x = 0.5 * (1 - (s - s0) / h); w[0][1] -= x; w.push([b - 1, x]); }
    return w;
  });
  const hullGeo = loft(stations, { seg: 16, pow: 2.2, under: 0.92, band: [230, 310], seam: (i) => seamRing.has(i) });
  const hullRest = hullGeo.attributes.position.array.slice();
  const vStation = new Int32Array(hullGeo.attributes.position.count);
  hullGeo.userData.ring.forEach((r0, k) => { const r1 = hullGeo.userData.ring[k + 1] ?? vStation.length; for (let v = r0; v < r1; v++) vStation[v] = k; });
  hullGeo.setAttribute("hullNormal", hullGeo.attributes.normal.clone());
  const hide = toon2(hullGeo, c.hide, c.hideShade, c.belly, c.bellyShade);
  hide.material.push(kit.cel(c.hideShade, c.hideShade)); // plate seams: iris on both tones, an interior line
  hide.name = "hide";
  hide.frustumCulled = false;
  space.add(hide);

  // Back spines: flat spikes on the dorsal line, each riding the joint that owns its station.
  const frameAt = (k) => {
    const [x, y, z, , ry] = stations[k];
    const T = V(...stations[Math.min(k + 1, LAST)]).sub(V(...stations[Math.max(k - 1, 0)])).normalize();
    const S = V(1, 0, 0), U = V().crossVectors(T, S);
    return { P: V(x, y, z), T, S, U, ry };
  };
  const ownerOf = (k) => joints[BONES[weights[k][0][0]][0]];
  const placeOn = (k, mesh, lift) => {
    const f = frameAt(k), j = ownerOf(k), p = f.P.clone().addScaledVector(f.U, f.ry * lift).sub(abs.get(j));
    mesh.position.copy(p);
    mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.S, f.U, f.T));
    j.add(mesh);
    return mesh;
  };
  for (let s0 = 0.6; s0 < total - 0.4; s0 += 0.23) {
    const k = sStation.findIndex((q) => q >= s0), s = sStation[k] / total; // 0 tail tip .. 1 nape
    const h = 0.05 + 0.11 * Math.sin(Math.min(1, s * 1.25) * Math.PI) ** 0.7;
    placeOn(k, toon(spikeGeo(h * 0.9, h, 0.022), c.bone, c.boneShade), 0.82);
  }
  // Tail spade (heraldic arrow) at the tip.
  {
    const s = new THREE.Shape();
    const P = [[-0.08, 0.03], [0.06, 0.06], [-0.02, 0.19], [0.34, 0], [-0.02, -0.19], [0.06, -0.06], [-0.08, -0.03]];
    s.moveTo(...P[0]);
    for (const p of P.slice(1)) s.lineTo(...p);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false });
    g.translate(0, 0, -0.015);
    g.rotateY(Math.PI / 2);
    const k = 3; // a few stations up from the tip
    const f = frameAt(k), j = joints.tail5, m = toon(g, c.bone, c.boneShade);
    m.position.copy(f.P.clone().sub(abs.get(j)));
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.S, f.U, f.T));
    j.add(m);
  }

  // ---------- head ----------
  // [z, yTop, yBottom, halfWidth] in head space (pivot at the nape, snout toward +Z)
  const HEAD = [
    [-0.14, 0.02, 0.0, 0], [-0.11, 0.1, -0.09, 0.09], [-0.03, 0.14, -0.12, 0.125], [0.07, 0.155, -0.11, 0.135],
    [0.15, 0.125, -0.095, 0.12], [0.25, 0.08, -0.085, 0.095], [0.37, 0.062, -0.08, 0.085], [0.45, 0.07, -0.075, 0.082],
    [0.51, 0.045, -0.065, 0.06], [0.545, -0.005, 0, 0],
  ];
  const headGeo = loft(HEAD.map(([z, t, b, w]) => [0, (t + b) / 2, z, w, (t - b) / 2]), { seg: 16, pow: 2.6, band: [235, 305] });
  put(head, toon2(headGeo, c.hide, c.hideShade, c.mouth, c.mouthShade));
  // skull crest: small spikes on the midline between the horns, continuing the neck row
  for (const [z, h] of [[0.06, 0.06], [-0.04, 0.085], [-0.13, 0.07]]) {
    const y = z > 0 ? 0.15 : 0.14 + z * 0.3;
    put(head, toon(spikeGeo(h * 0.9, h, 0.018), c.bone, c.boneShade), 0, y - 0.01, z);
  }
  const jaw = joint("jaw", head, 0, abs.get(head).y - 0.08, abs.get(head).z - 0.01);
  const JAW = [[-0.05, 0.0, -0.03, 0], [0.0, 0.0, -0.065, 0.11], [0.12, 0.004, -0.08, 0.112], [0.26, 0.006, -0.064, 0.088], [0.39, 0.006, -0.052, 0.074], [0.48, 0.0, -0.042, 0.054], [0.51, -0.015, 0, 0]];
  put(jaw, toon2(loft(JAW.map(([z, t, b, w]) => [0, (t + b) / 2, z, w, (t - b) / 2]), { seg: 14, pow: 2.4, band: [50, 130] }), c.hide, c.hideShade, c.mouth, c.mouthShade));
  for (const sx of [-1, 1]) {
    // horns: two sweeping back from the crown, two short ones off the cheek
    put(head, toon(tube([[0.075 * sx, 0.12, -0.04], [0.11 * sx, 0.2, -0.2], [0.14 * sx, 0.24, -0.38], [0.15 * sx, 0.22, -0.52]], 0.042, 0), c.horn, c.hornShade));
    put(head, toon(tube([[0.11 * sx, -0.02, -0.04], [0.17 * sx, -0.02, -0.15], [0.22 * sx, 0.01, -0.25]], 0.028, 0), c.horn, c.hornShade));
    // brow ridge, eye with a slit pupil, nostril
    put(head, toon(tube([[0.095 * sx, 0.105, 0.21], [0.122 * sx, 0.13, 0.12], [0.112 * sx, 0.15, 0.02], [0.085 * sx, 0.14, -0.06]], 0.022, 0.03, { seg: 8, flat: 0.8 }), c.hide, c.hideShade));
    const eye = put(head, toon(ellipsoid(0.015, 0.022, 0.044), c.eye, c.eye, { threshold: -0.25 }), 0.118 * sx, 0.078, 0.11);
    eye.rotation.set(0.15, 0.25 * sx, 0);
    put(head, toon(ellipsoid(0.007, 0.02, 0.008, 8, 6), c.pupil, c.pupil, { outline: false }), 0.131 * sx, 0.078, 0.117);
    put(head, toon(ellipsoid(0.012, 0.01, 0.016, 8, 6), c.mouth, c.mouth, { outline: false }), 0.045 * sx, 0.06, 0.5);
    // teeth along the upper lip (two fangs show over the closed jaw), smaller ones on the jaw
    for (const [z, len] of [[0.2, 0.03], [0.27, 0.035], [0.34, 0.035], [0.42, 0.065], [0.48, 0.035]]) {
      const w = 0.085 - 0.03 * (z - 0.2), t = put(head, toon(new THREE.ConeGeometry(0.012, len, 5), c.tooth, c.toothShade, { outline: len > 0.05 }), w * sx, -0.075 - len / 2, z);
      t.rotation.x = Math.PI;
    }
    for (const z of [0.22, 0.3, 0.38, 0.45]) put(jaw, toon(new THREE.ConeGeometry(0.01, 0.03, 5), c.tooth, c.toothShade, { outline: false }), (0.08 - 0.05 * (z - 0.2)) * sx, 0.015, z);
  }

  // ---------- legs and wings (left built at +X, right is the mirror) ----------
  const sides = { L: new THREE.Group(), R: new THREE.Group() };
  sides.R.scale.x = -1;
  for (const g of Object.values(sides)) { body.add(g); abs.set(g, abs.get(body)); }
  const FINGERS = [0.72, 1.38, 1.25, 1.1];
  const foot = (parent, y0, z0, w) => { // palm + three toes with claws; sole at local y0
    put(parent, toon(ellipsoid(w, 0.07, 0.12), c.hide, c.hideShade), 0, y0 + 0.065, z0);
    for (const dx of [-1, 0, 1]) {
      const x = dx * w * 0.66;
      put(parent, toon(tube([[x * 0.8, y0 + 0.055, z0 + 0.04], [x, y0 + 0.04, z0 + 0.15]], 0.042, 0.032), c.hide, c.hideShade));
      put(parent, toon(claw(x, y0 + 0.04, z0 + 0.16, 0.1, 0.024), c.horn, c.hornShade));
    }
  };
  const membranes = [];
  for (const [sd, grp] of Object.entries(sides)) {
    const J = (n, parent, x, y, z) => joint(n + sd, parent, x, y, z);
    // front leg
    const sh = J("shoulder", grp, 0.24, 0.88, 0.92);
    const limb = (parent, st) => put(parent, toon(loft(capped(st)), c.hide, c.hideShade));
    limb(sh, [[0, 0.06, 0.02, 0.12, 0.16], [0, -0.08, -0.04, 0.135, 0.165], [0, -0.24, -0.11, 0.095, 0.105], [0, -0.35, -0.15, 0.075, 0.08]]);
    const el = J("elbow", sh, 0.24, 0.53, 0.76);
    limb(el, [[0, 0, 0, 0.078, 0.085], [0, -0.1, 0.04, 0.08, 0.09], [0, -0.26, 0.1, 0.06, 0.064], [0, -0.38, 0.14, 0.052, 0.055]]);
    const wr = J("wrist", el, 0.24, 0.15, 0.91);
    foot(wr, -0.15, 0.05, 0.095);
    // hind leg: heavy haunch, shin back, ankle up off the ground
    const hp = J("hip", grp, 0.23, 0.98, -0.15);
    limb(hp, [[0, 0.08, -0.05, 0.16, 0.24], [0, -0.1, 0.04, 0.175, 0.25], [0, -0.28, 0.12, 0.13, 0.15], [0, -0.38, 0.17, 0.09, 0.1]]);
    const kn = J("knee", hp, 0.23, 0.58, 0.03);
    limb(kn, [[0, 0, 0, 0.09, 0.1], [0, -0.18, -0.07, 0.075, 0.08], [0, -0.36, -0.15, 0.058, 0.06]]);
    const an = J("ankle", kn, 0.23, 0.2, -0.13);
    limb(an, [[0, 0, 0, 0.06, 0.062], [0, -0.1, 0.04, 0.055, 0.055], [0, -0.15, 0.07, 0.05, 0.05]]);
    foot(an, -0.2, 0.1, 0.09);

    // wing: humerus, forearm, thumb claw, four finger spars
    const wg = J("wing", grp, 0.24, 1.24, 0.78);
    const xs = { side: [0, 0, -1], seg: 10 };
    put(wg, toon(loft(capped([[0.0, 0, 0, 0.065, 0.06], [0.2, 0, 0, 0.055, 0.048], [0.48, 0, 0, 0.04, 0.036]]), xs), c.hide, c.hideShade));
    const we = J("wingElbow", wg, 0.24 + 0.48, 1.24, 0.78);
    put(we, toon(loft(capped([[0, 0, 0, 0.045, 0.04], [0.45, 0, 0, 0.038, 0.034], [0.85, 0, 0, 0.034, 0.03]]), xs), c.hide, c.hideShade));
    const ww = J("wingWrist", we, 0.24 + 0.48 + 0.85, 1.24, 0.78);
    put(ww, toon(tube([[0, 0.01, 0.02], [0.02, 0.03, 0.1], [0.0, 0.0, 0.16]], 0.03, 0, { seg: 6 }), c.horn, c.hornShade));
    const tips = FINGERS.map((len, i) => {
      const f = J(`finger${i + 1}`, ww, 0.24 + 0.48 + 0.85, 1.24, 0.78);
      put(f, toon(loft([[-0.02, 0, 0, 0, 0], [0.02, 0, 0, 0.03, 0.028], [len * 0.5, 0, 0, 0.02, 0.018], [len, 0, 0, 0, 0]], { side: [0, 0, -1], seg: 6 }), c.hide, c.hideShade));
      return [f, len];
    });
    membranes.push(makeMembrane(sd, grp, wg, we, ww, tips));
  }

  // ---------- membranes ----------
  // Panels are ruled surfaces between two polylines c0 (u) and c1 (u): S(u, v) = lerp(c0(u), c1(u), v).
  // c1 is a scalloped trailing edge when `sc` > 0 (pulled toward c0 by sc * edge length * sin(pi u)).
  function makeMembrane(sd, grp, wg, we, ww, tips) {
    const PANELS = [
      { c0: ["R", "W"], c1: ["R", "E", "W"], nu: 6, nv: 2, sc: 0 },
      { c0: ["W"], c1: ["T1", "T2"], nu: 3, nv: 5, sc: 0.1 },
      { c0: ["W"], c1: ["T2", "T3"], nu: 6, nv: 5, sc: 0.2 },
      { c0: ["W"], c1: ["T3", "T4"], nu: 6, nv: 5, sc: 0.2 },
      { c0: ["R", "E", "W"], c1: ["H", "T4"], nu: 8, nv: 6, sc: 0.16 },
    ];
    const HIP = V(0.2, 1.1, -0.25).sub(abs.get(body)); // flank attachment, in side-group space
    let nv = 0;
    for (const p of PANELS) { p.base = nv; nv += (p.nu + 1) * (p.nv + 1); }
    const idx = [];
    for (const p of PANELS) for (let i = 0; i < p.nu; i++) for (let j = 0; j < p.nv; j++) {
      const a = p.base + i * (p.nv + 1) + j, b = a + p.nv + 1;
      idx.push(a, b, b + 1, a, b + 1, a + 1);
    }
    const idxAll = [...idx];
    for (let k = 0; k < idx.length; k += 3) idxAll.push(idx[k] + nv, idx[k + 2] + nv, idx[k + 1] + nv);
    const g = new THREE.BufferGeometry();
    const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3);
    for (const a of ["position", "normal", "hullNormal"]) g.setAttribute(a, new THREE.BufferAttribute(new Float32Array(nv * 6), 3));
    g.setIndex(idxAll);
    const mesh = toon(g, c.wing, c.wingShade);
    mesh.name = `membrane${sd}`;
    mesh.frustumCulled = false;
    space.add(mesh);
    const TH = 0.006; // half thickness
    const line = (pts, u) => { // point at arc fraction u along a polyline
      if (pts.length === 1) return pts[0].clone();
      const L = []; let tot = 0;
      for (let i = 1; i < pts.length; i++) { L.push(pts[i].distanceTo(pts[i - 1])); tot += L[L.length - 1]; }
      let d = u * tot;
      for (let i = 0; i < L.length; i++) { if (d <= L[i] || i === L.length - 1) return pts[i].clone().lerp(pts[i + 1], L[i] ? Math.min(1, d / L[i]) : 0); d -= L[i]; }
    };
    function update() {
      const w = (o, x = 0) => space.worldToLocal(o.localToWorld(V(x, 0, 0)));
      const pt = { R: w(wg), E: w(we), W: w(ww), H: space.worldToLocal(grp.localToWorld(HIP.clone())) };
      tips.forEach(([f, len], i) => (pt[`T${i + 1}`] = w(f, len)));
      N.fill(0);
      for (const p of PANELS) {
        const c0 = p.c0.map((k) => pt[k]), c1 = p.c1.map((k) => pt[k]);
        const mid0 = line(c0, 0.5), A = c1[0], B = c1[c1.length - 1], inward = mid0.clone().sub(A.clone().lerp(B, 0.5)).normalize(), depth = p.sc * A.distanceTo(B);
        for (let i = 0; i <= p.nu; i++) {
          const u = i / p.nu, q0 = line(c0, u), q1 = line(c1, u).addScaledVector(inward, depth * Math.sin(Math.PI * u));
          for (let j = 0; j <= p.nv; j++) q0.clone().lerp(q1, j / p.nv).toArray(P, (p.base + i * (p.nv + 1) + j) * 3);
        }
      }
      const e1 = V(), e2 = V(), a = V(), b = V(), cc = V();
      for (let k = 0; k < idx.length; k += 3) {
        a.fromArray(P, idx[k] * 3); b.fromArray(P, idx[k + 1] * 3); cc.fromArray(P, idx[k + 2] * 3);
        e1.subVectors(b, a).cross(e2.subVectors(cc, a));
        for (const v of [idx[k], idx[k + 1], idx[k + 2]]) { N[v * 3] += e1.x; N[v * 3 + 1] += e1.y; N[v * 3 + 2] += e1.z; }
      }
      const pos = g.attributes.position.array, nor = g.attributes.normal.array, hul = g.attributes.hullNormal.array;
      const n = V(), o = V(), q = V();
      for (const p of PANELS) for (let i = 0; i <= p.nu; i++) for (let j = 0; j <= p.nv; j++) {
        const v = p.base + i * (p.nv + 1) + j;
        n.fromArray(N, v * 3);
        if (n.lengthSq() < 1e-12) n.set(0, 1, 0);
        n.normalize();
        q.fromArray(P, v * 3);
        const rim = i === 0 || i === p.nu || j === 0 || j === p.nv;
        o.set(0, 0, 0);
        if (rim) { // outward in the sheet: away from the inner neighbour
          const ii = i === 0 ? 1 : i === p.nu ? p.nu - 1 : i, jj = j === 0 ? 1 : j === p.nv ? p.nv - 1 : j;
          o.fromArray(P, (p.base + ii * (p.nv + 1) + jj) * 3).sub(q).negate().addScaledVector(n, -o.dot(n));
          if (o.lengthSq() > 1e-12) o.normalize();
        }
        for (const [L, sg] of [[0, 1], [nv, -1]]) {
          const t = (v + L) * 3;
          pos[t] = q.x + n.x * TH * sg; pos[t + 1] = q.y + n.y * TH * sg; pos[t + 2] = q.z + n.z * TH * sg;
          nor[t] = n.x * sg; nor[t + 1] = n.y * sg; nor[t + 2] = n.z * sg;
          const h = rim ? o.clone().addScaledVector(n, 0.35 * sg).normalize() : n.clone().multiplyScalar(sg);
          hul[t] = h.x; hul[t + 1] = h.y; hul[t + 2] = h.z;
        }
      }
      for (const a2 of ["position", "normal", "hullNormal"]) g.attributes[a2].needsUpdate = true;
      g.computeBoundingSphere();
      g.computeBoundingBox();
    }
    return update;
  }

  // ---------- skinning ----------
  root.updateMatrixWorld(true);
  const spaceInv = new THREE.Matrix4();
  const boneJ = BONES.map(([n]) => joints[n]);
  spaceInv.copy(space.matrixWorld).invert();
  const bindInv = boneJ.map((j) => spaceInv.clone().multiply(j.matrixWorld).invert()); // bind pose, model space
  const skinM = boneJ.map(() => new THREE.Matrix4());
  function skin() {
    spaceInv.copy(space.matrixWorld).invert();
    boneJ.forEach((j, b) => skinM[b].multiplyMatrices(spaceInv, j.matrixWorld).multiply(bindInv[b]));
    const pos = hullGeo.attributes.position.array, v = V(), acc = V(), t = V();
    for (let i = 0; i < vStation.length; i++) {
      v.fromArray(hullRest, i * 3);
      acc.set(0, 0, 0);
      for (const [b, w] of weights[vStation[i]]) acc.addScaledVector(t.copy(v).applyMatrix4(skinM[b]), w);
      acc.toArray(pos, i * 3);
    }
    hullGeo.attributes.position.needsUpdate = true;
    hullGeo.computeVertexNormals();
    hullGeo.attributes.hullNormal.array.set(hullGeo.attributes.normal.array);
    hullGeo.attributes.hullNormal.needsUpdate = true;
    hullGeo.computeBoundingSphere();
    hullGeo.computeBoundingBox();
  }

  function pose(name) {
    const rows = POSES[name];
    if (!rows) throw new Error(`unknown pose "${name}" (${Object.keys(POSES).join(", ")})`);
    const table = { ...REST, ...rows };
    for (const [k, [rx, ry, rz]] of Object.entries(table)) {
      for (const j of joints[k] ? [joints[k]] : [joints[k + "L"], joints[k + "R"]]) if (j) j.rotation.set(rx * DEG, ry * DEG, rz * DEG);
    }
    root.updateMatrixWorld(true);
    skin();
    for (const m of membranes) m();
  }
  pose("rest");
  return { root, joints, pose };
}
