// campsite.js - a cosy anime campsite on a grassy lakeside pitch (the solo-camp look): a dome tent with its door flap
// propped open as an awning, a campfire in a stone ring with a pot on a tripod, two low folding chairs, a small
// folding table with mugs and a lantern, a firewood stack, a backpack, two pines and a sliver of lake. Real size.
// Contract: harness/lab/README.md. Metres, +Y up, the tent door and the fire face +Z, the set's left is +X, it stands
// on y = 0 and is centred on x = 0, z = 0 (the bbox of the whole set).
//
// Construction: every piece is triangles merged into one soup per material, so the set is 14 meshes. THREE geometries
// (box, cylinder, sphere, torus, extrude) are placed by a matrix, and custom parts (dome patches, star cones, flame
// lathes, ripples) go through tri(), which winds each triangle away from a reference point inside its solid.
//   GROUND  a 4 cm grass slab with a wobbly outline; its back edge is the lake shore, so the hull draws the bank.
//           Grass tufts are clusters of 3-sided spikes (no ink).
//   LAKE    a 1.5 cm water slab under the shore, pale ripple arcs on it (no ink).
//   TENT    a dome (ellipsoid cap, 2.1 m across, 1.15 m high), two red poles crossing over it, a dark doorway patch on
//           its front, the door flap propped out as an awning on two poles, guy lines to pegs.
//   FIRE    eleven stones in a ring, four logs in a teepee, flame tongues (red outside, yellow core in front), an iron
//           tripod with a chain and a pot. Smoke puffs rise above the pot.
//   CAMP    two low folding chairs (sling seat and back on X legs) facing the fire, a folding table (wood slats, X legs)
//           with two mugs and a lantern, a firewood stack (3-2-1 logs), a backpack by the awning.
//   PINES   trunks with stacked 8-point star cones, the anime pine silhouette.
// Proportions (real size): tent 2.1 x 1.15 m; stone ring 0.8 m across; tripod 1.15 m; chair seat 0.28 m, back top
// 0.68 m; table 0.62 x 0.42 x 0.38 m; pines 4.0 m and 3.3 m (the top of the set, meta.height = 4.0).
// Options: build(THREE, kit, colors, { height }): scales the whole set uniformly so the tall pine's top is `height`.
// Clip: fire (2 s loop, pose("fire@0.5")): the flame and smoke meshes are rewritten per frame from their rest vertices
// (flames sway and stretch by height along the tongue, smoke puffs rise, drift and swell, then shrink away). Integer
// frequencies over 2 s, so the loop closes.
// Script: meadow (greens, pale sky, red accent, yellow practical; no brown, so wood is skin over accent as tree-pine).
// Two-tone pairs (base / shade): grass line #a9d16e / iris #3f8a47; tufts iris flat; needles iris #3f8a47 / hair
// #2c5131 (also the backpack); wood skin #f0c2ae / accent #d9483b; canvas moon #f7f3e1 / sky #d7ecef (tent, awning,
// backpack pocket and mat); red (poles, hem, chair slings, backpack lid)
// accent #d9483b / hair #2c5131; dark (iron, doorway, legs, frames) hair flat; metal (pot, mugs, stones) sclera #f6f3ee
// / sky #d7ecef; water sky flat with moon ripples; flames accent flat with a practical #f2c94c core (glow); lantern
// glass practical (glow); smoke sclera / sky; guy lines sclera, thin ink. Ink #1c261b.

export const meta = {
  name: "campsite",
  height: 4.0,
  script: "meadow",
  colors: {
    grass: "#a9d16e", grassShade: "#3f8a47",
    tuft: "#3f8a47",
    needle: "#3f8a47", needleShade: "#2c5131",
    wood: "#f0c2ae", woodShade: "#d9483b",
    canvas: "#f7f3e1", canvasShade: "#d7ecef",
    red: "#d9483b", redShade: "#2c5131",
    dark: "#2c5131",
    metal: "#f6f3ee", metalShade: "#d7ecef",
    water: "#d7ecef", ripple: "#f7f3e1",
    flame: "#d9483b", core: "#f2c94c", glow: "#f2c94c",
    smoke: "#f6f3ee", smokeShade: "#d7ecef",
    cord: "#f6f3ee",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const { height = meta.height } = opts;
  const TAU = Math.PI * 2;
  const root = new THREE.Group();
  root.name = "campsite";
  const body = new THREE.Group();
  body.name = "set";
  body.scale.setScalar(height / meta.height);
  root.add(body);
  const joints = {};

  // ---------- seeded hash (no Math.random) ----------
  let seed = 0x2c1d5a6b;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // ---------- triangle soups ----------
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [], o: [] });
  let owner = -1; // animated soups: which tongue / puff a vertex belongs to
  const _a = V(), _b = V(), _n = V(), _r = V();
  function tri(key, a, b, e, ref, na, nb, ne) {
    _a.subVectors(b, a), _b.subVectors(e, a), _n.crossVectors(_a, _b);
    if (_n.lengthSq() < 1e-14) return;
    _r.copy(a).add(b).add(e).multiplyScalar(1 / 3).sub(ref);
    const flip = _n.dot(_r) < 0;
    _n.normalize();
    if (flip) _n.negate();
    const s = S(key);
    const vs = flip ? [[a, na], [e, ne], [b, nb]] : [[a, na], [b, nb], [e, ne]];
    for (const [q, nq] of vs) s.p.push(q.x, q.y, q.z), s.n.push(...(nq ? [nq.x, nq.y, nq.z] : [_n.x, _n.y, _n.z])), s.o.push(owner);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  // place a THREE geometry by a matrix (rotation, translation, positive scale)
  function geoM(key, g, m) {
    const q = g.index ? g.toNonIndexed() : g.clone();
    if (!q.attributes.normal) q.computeVertexNormals();
    q.applyMatrix4(m);
    const s = S(key), P = q.attributes.position.array, N = q.attributes.normal.array;
    for (let i = 0; i < P.length; i++) s.p.push(P[i]), s.n.push(N[i]);
    for (let i = 0; i < P.length / 3; i++) s.o.push(owner);
  }
  const M = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
    new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), V(sx, sy, sz));
  const at = (parent, m) => (parent ? parent.clone().multiply(m) : m);
  const box = (key, x, y, z, w, h, d, rx = 0, ry = 0, rz = 0, parent) => geoM(key, new THREE.BoxGeometry(w, h, d), at(parent, M(x, y, z, rx, ry, rz)));
  // a rod between two points
  const UP = V(0, 1, 0);
  function rod(key, a, b, r, seg = 6, parent) {
    const A = parent ? a.clone().applyMatrix4(parent) : a, B = parent ? b.clone().applyMatrix4(parent) : b;
    const d = V().subVectors(B, A), len = d.length();
    const m = new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()), V(1, 1, 1));
    geoM(key, new THREE.CylinderGeometry(r, r, len, seg), m);
  }
  // a log: a capped cylinder along a direction
  function log(key, cx, cy, cz, len, r, ry, rz = Math.PI / 2, seg = 8) {
    geoM(key, new THREE.CylinderGeometry(r, r, len, seg), M(cx, cy, cz, 0, ry, rz));
  }
  // superellipsoid lump: half sizes a, b, d, bottom on y
  function lump(key, x, y, z, a, b, d, e = 0.6, ey = 0.8, ry = 0, seg = 10) {
    const g = new THREE.SphereGeometry(1, seg, Math.max(4, Math.round(seg / 2)));
    const p = g.attributes.position, f = (v, k) => Math.sign(v) * Math.abs(v) ** k;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, f(p.getX(i), e), f(p.getY(i), ey), f(p.getZ(i), e));
    g.computeVertexNormals();
    geoM(key, g, M(x, y + b, z, 0, ry, 0, a, b, d));
  }
  // a flat slab from an outline [[x, z], ...] between y0 and y0 + h
  function slab(key, pts, y0, h) {
    const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 1 });
    geoM(key, g, M(0, y0, 0, -Math.PI / 2, 0, 0));
  }
  // a solid of revolution about a vertical axis: profile [[r, y], ...] from bottom (r 0) to top (r 0)
  function lathe(key, cx, cz, prof, seg = 8, y0 = 0) {
    for (let j = 0; j < prof.length - 1; j++) {
      const [r0, h0] = prof[j], [r1, h1] = prof[j + 1];
      const ref = V(cx, y0 + (h0 + h1) / 2, cz);
      for (let k = 0; k < seg; k++) {
        const t0 = (k / seg) * TAU, t1 = ((k + 1) / seg) * TAU;
        const P = (r, h, t) => V(cx + r * Math.cos(t), y0 + h, cz + r * Math.sin(t));
        const a = P(r0, h0, t0), b = P(r0, h0, t1), e = P(r1, h1, t1), d = P(r1, h1, t0);
        if (r0 > 1e-6) tri(key, a, b, e, ref);
        if (r1 > 1e-6) tri(key, a, e, d, ref);
      }
    }
  }

  // ---------- layout ----------
  const TENT = { x: -1.2, z: -0.55, R: 1.05, H: 1.15 };
  const F = { x: 0.5, z: 0.55 }; // fire centre
  const G = 0.04; // grass top

  // ---------- ground and lake ----------
  {
    const pts = [];
    const N = 72;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * TAU, cx = Math.cos(t), sz = Math.sin(t);
      let x = 3.3 * Math.sign(cx) * Math.abs(cx) ** 0.6, z = 2.25 * Math.sign(sz) * Math.abs(sz) ** 0.6 + 0.05 * Math.sin(5 * t);
      if (z < -1.6) z = -1.6 - (2.25 - 1.6) * 0.55 + 0.12 * Math.sin(3.1 * x + 0.6) + 0.06 * Math.sin(7.3 * x); // the shore
      pts.push([x * (1 + 0.02 * Math.sin(7 * t)), z]);
    }
    slab("grass", pts, 0, G);
    const lake = [];
    for (let i = 0; i <= 32; i++) {
      const x = -3.15 + (6.3 * i) / 32;
      lake.push([x, -1.7 - 1.25 * Math.max(0, 1 - (x / 3.15) ** 2) ** 0.35 - 0.06 * Math.sin(1.7 * x + 1.1)]);
    }
    lake.push([3.15, -1.6], [-3.15, -1.6]);
    slab("water", lake, 0, 0.015);
    // ripples: thin arcs on the water
    const ring = (cx, cz, rx, rz, t0, t1, w) => {
      const n = 14, ref = V(cx, -1, cz);
      for (let k = 0; k < n; k++) {
        const ta = t0 + ((t1 - t0) * k) / n, tb = t0 + ((t1 - t0) * (k + 1)) / n;
        const P = (t, s) => V(cx + (rx + s) * Math.cos(ta + (t - ta)), 0.0165, cz + (rz + s * 0.5) * Math.sin(t));
        quad("ripple", P(ta, 0), P(tb, 0), P(tb, w), P(ta, w), ref);
      }
    };
    for (const [cx, cz, r] of [[-1.3, -2.45, 0.4], [1.2, -2.5, 0.45], [0.0, -2.35, 0.22], [2.25, -2.15, 0.25]]) {
      ring(cx, cz, r, r * 0.28, 0.2, Math.PI - 0.2, 0.025);
      ring(cx, cz, r * 1.7, r * 0.45, 0.35, Math.PI - 0.35, 0.02);
    }
    // grass tufts
    const near = (x, z) =>
      Math.hypot((x - TENT.x) / (TENT.R + 0.3), (z - TENT.z) / (TENT.R + 0.3)) < 1 || Math.hypot(x - F.x, z - F.z) < 0.6 || z < -1.75;
    let placed = 0;
    for (let tries = 0; placed < 70 && tries < 800; tries++) {
      const x = (rand() * 2 - 1) * 3.0, z = (rand() * 2 - 1) * 2.0;
      if (near(x, z)) continue;
      placed++;
      for (let b = 0; b < 3; b++) {
        const h = 0.08 + 0.06 * rand(), lean = (rand() - 0.5) * 0.6;
        geoM("tuft", new THREE.ConeGeometry(0.018, h, 3), M(x + (b - 1) * 0.025, G + h / 2 - 0.005, z + (rand() - 0.5) * 0.02, 0, rand() * TAU, lean));
      }
    }
  }

  // ---------- tent ----------
  const domeY = (x, z) => {
    const u = 1 - ((x - TENT.x) / TENT.R) ** 2 - ((z - TENT.z) / TENT.R) ** 2;
    return u > 0 ? TENT.H * Math.sqrt(u) : 0;
  };
  const onDome = (az, el, off = 0) => {
    // az around +Y from +Z toward +X, el the polar elevation (0 at the ground, PI/2 at the top)
    const ce = Math.cos(el), se = Math.sin(el);
    const p = V(TENT.x + TENT.R * ce * Math.sin(az), G + TENT.H * se, TENT.z + TENT.R * ce * Math.cos(az));
    const n = V((ce * Math.sin(az)) / TENT.R, se / TENT.H, (ce * Math.cos(az)) / TENT.R).normalize();
    return p.addScaledVector(n, off);
  };
  {
    const g = new THREE.SphereGeometry(1, 28, 10, 0, TAU, 0, Math.PI / 2);
    geoM("canvas", g, M(TENT.x, G - 0.002, TENT.z, 0, 0, 0, TENT.R, TENT.H, TENT.R));
    // poles: two arches crossing over the top, on the diagonals
    for (const az0 of [Math.PI / 4, -Math.PI / 4]) {
      const pts = [];
      for (let i = 0; i <= 20; i++) {
        const s = -1 + (2 * i) / 20; // -1..1 across the top
        const az = s < 0 ? az0 + Math.PI : az0, el = (1 - Math.abs(s)) * (Math.PI / 2);
        pts.push(onDome(az, Math.max(0.02, el), 0.012));
      }
      geoM("red", new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.02, 5, false), new THREE.Matrix4());
    }
    // a ridge seam band around the dome at mid height (fly hem)
    {
      const pts = [];
      for (let i = 0; i <= 40; i++) pts.push(onDome((i / 40) * TAU, 0.09, 0.008));
      geoM("red", new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 60, 0.025, 4, true), new THREE.Matrix4());
    }
    // doorway: an arch patch on the front of the dome
    const DW = 0.5, DH = 0.92;
    const ref = V(TENT.x, G + 0.3, TENT.z);
    const nu = 12, nv = 8;
    const dp = (i, j) => {
      const u = -1 + (2 * i) / nu;
      const x = TENT.x + u * DW, yTop = DH * Math.sqrt(Math.max(0, 1 - u * u)) ** 0.8;
      const y = 0.02 + (yTop - 0.02) * (j / nv);
      const zz = 1 - ((x - TENT.x) / TENT.R) ** 2 - (y / TENT.H) ** 2;
      const z = TENT.z + TENT.R * Math.sqrt(Math.max(0, zz));
      const n = V((x - TENT.x) / TENT.R ** 2, y / TENT.H ** 2, (z - TENT.z) / TENT.R ** 2).normalize();
      return V(x, G + y, z).addScaledVector(n, 0.008);
    };
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) quad("dark", dp(i, j), dp(i + 1, j), dp(i + 1, j + 1), dp(i, j + 1), ref);
    // door flap as an awning: hinged at the door top, propped on two poles
    const hingeY = G + DH - 0.02;
    const hingeZ = TENT.z + TENT.R * Math.sqrt(1 - ((DH - 0.02) / TENT.H) ** 2);
    const FL = 0.85, FW = 1.15, tilt = 0.2;
    const fz = hingeZ + (FL / 2) * Math.cos(tilt), fy = hingeY - (FL / 2) * Math.sin(tilt);
    box("canvas", TENT.x, fy, fz, FW, 0.025, FL, tilt, 0, 0);
    const tipZ = hingeZ + FL * Math.cos(tilt) - 0.03, tipY = hingeY - FL * Math.sin(tilt) - 0.012;
    for (const sx of [-1, 1]) {
      const px = TENT.x + sx * (FW / 2 - 0.04);
      rod("dark", V(px, G, tipZ), V(px, tipY + 0.06, tipZ), 0.014, 6);
      // guy line from the pole top forward-out to a peg
      const peg = V(px + sx * 0.35, G, tipZ + 0.55);
      rod("cord", V(px, tipY + 0.05, tipZ), peg, 0.006, 4);
      rod("dark", V(peg.x, G - 0.02, peg.z), V(peg.x, G + 0.06, peg.z), 0.012, 5);
    }
    // dome guy lines: from the pole feet area at mid height out to pegs
    for (const az of [Math.PI / 4 + Math.PI, -Math.PI / 4 + Math.PI, Math.PI / 2 + 0.5, -Math.PI / 2 - 0.5]) {
      const a = onDome(az, 0.75, 0.01);
      const dir = V(Math.sin(az), 0, Math.cos(az));
      const peg = V(TENT.x + dir.x * (TENT.R + 0.65), G, TENT.z + dir.z * (TENT.R + 0.65));
      rod("cord", a, peg, 0.006, 4);
      rod("dark", V(peg.x, G - 0.02, peg.z), V(peg.x, G + 0.06, peg.z), 0.012, 5);
    }
  }

  // ---------- campfire ----------
  {
    for (let k = 0; k < 11; k++) {
      const t = (k / 11) * TAU + 0.2;
      lump("metal", F.x + 0.36 * Math.cos(t), G - 0.01, F.z + 0.36 * Math.sin(t), 0.08 + 0.025 * rand(), 0.045 + 0.02 * rand(), 0.075, 0.6, 0.7, -t, 8);
    }
    // teepee logs
    for (let k = 0; k < 4; k++) {
      const t = (k / 4) * TAU + 0.4;
      const a = V(F.x + 0.22 * Math.cos(t), G, F.z + 0.22 * Math.sin(t)), b = V(F.x + 0.03 * Math.cos(t), G + 0.26, F.z + 0.03 * Math.sin(t));
      rod("wood", a, b, 0.032, 6);
    }
    lump("dark", F.x, G - 0.005, F.z, 0.2, 0.025, 0.2, 0.9, 0.9, 0, 10); // ash bed
    // tripod, chain, pot
    const apex = V(F.x, G + 1.38, F.z);
    for (let k = 0; k < 3; k++) {
      const t = (k / 3) * TAU + 1.98; // no leg between the hero camera and the flames
      rod("dark", V(F.x + 0.7 * Math.cos(t), G, F.z + 0.7 * Math.sin(t)), apex.clone().add(V(0.04 * Math.cos(t), 0.08, 0.04 * Math.sin(t))), 0.016, 6);
    }
    const potTop = G + 0.88, potH = 0.15, potR = 0.14;
    rod("dark", V(F.x, apex.y - 0.02, F.z), V(F.x, potTop + 0.18, F.z), 0.006, 4);
    lathe("metal", F.x, F.z, [[0, 0], [potR * 0.85, 0.005], [potR, 0.03], [potR, potH], [potR * 1.04, potH + 0.005], [potR * 0.9, potH + 0.02], [0.03, potH + 0.045], [0.022, potH + 0.06], [0, potH + 0.065]], 14, potTop - potH);
    const bail = [];
    for (let i = 0; i <= 12; i++) {
      const t = (i / 12) * Math.PI;
      bail.push(V(F.x + potR * 1.02 * Math.cos(t), potTop - 0.01 + 0.18 * Math.sin(t) ** 1.4, F.z));
    }
    geoM("dark", new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bail), 16, 0.006, 4, false), new THREE.Matrix4());
  }

  // ---------- flames (one accent mesh, one core mesh, rewritten by the clip) ----------
  const tongues = [];
  const flameProf = (R, H) => {
    const out = [[0, 0]];
    for (let i = 1; i < 8; i++) {
      const v = i / 8;
      out.push([R * Math.sin(Math.PI * Math.min(1, v * 1.4) ** 0.8 * 0.5 + Math.PI * 0.5 * v) * (1 - v) ** 0.55, H * v]);
    }
    out.push([0, H]);
    return out;
  };
  function tongue(key, x, z, R, H, ph) {
    owner = tongues.length;
    tongues.push({ key, x, z, H, ph });
    lathe(key, x, z, flameProf(R, H), 8, G + 0.02);
    owner = -1;
  }
  tongue("flame", F.x, F.z, 0.16, 0.64, 0.0);
  tongue("flame", F.x + 0.11, F.z - 0.07, 0.11, 0.46, 0.37);
  tongue("flame", F.x - 0.11, F.z + 0.02, 0.11, 0.5, 0.71);
  tongue("flame", F.x + 0.02, F.z + 0.12, 0.1, 0.4, 0.53);
  tongue("core", F.x + 0.08, F.z + 0.11, 0.1, 0.36, 0.2);
  tongue("core", F.x - 0.03, F.z + 0.14, 0.075, 0.27, 0.85);

  // ---------- smoke puffs ----------
  const PUFFS = 7;
  const puffGeo = new THREE.IcosahedronGeometry(1, 1);
  for (let k = 0; k < PUFFS; k++) {
    owner = 1000 + k;
    geoM("smoke", puffGeo, M(0, 0, 0));
    owner = -1;
  }

  // ---------- chairs ----------
  function chair(x, z, yaw) {
    const P = M(x, G, z, 0, yaw, 0); // chair local: faces +Z, seat centre at origin
    const SW = 0.48, SD = 0.42, SH = 0.28;
    box("red", 0, SH, 0, SW, 0.04, SD, -0.12, 0, 0, P);
    // back, tilted back
    const bt = 0.3, BH = 0.46;
    box("red", 0, SH + 0.02 + (BH / 2) * Math.cos(bt), -SD / 2 - (BH / 2) * Math.sin(bt) + 0.02, SW, BH, 0.035, -bt, 0, 0, P);
    for (const sx of [-1, 1]) {
      const xx = sx * (SW / 2 + 0.015);
      // X legs on each side
      rod("dark", V(xx, 0, SD / 2), V(xx, SH, -SD / 2), 0.012, 5, P);
      rod("dark", V(xx, 0, -SD / 2), V(xx, SH, SD / 2), 0.012, 5, P);
      // back upright and armrest
      rod("dark", V(xx, SH, -SD / 2 + 0.02), V(xx, SH + 0.02 + BH * Math.cos(bt), -SD / 2 - BH * Math.sin(bt) + 0.02), 0.012, 5, P);
      rod("dark", V(xx, SH + 0.17, SD / 2 - 0.03), V(xx, SH + 0.17, -SD / 2 + 0.02), 0.014, 5, P);
      rod("dark", V(xx, SH, SD / 2 - 0.03), V(xx, SH + 0.17, SD / 2 - 0.03), 0.012, 5, P);
    }
    for (const zz of [SD / 2, -SD / 2]) rod("dark", V(-SW / 2 - 0.015, 0.012, zz), V(SW / 2 + 0.015, 0.012, zz), 0.011, 5, P);
  }
  const face = (x, z) => Math.atan2(F.x - x, F.z - z);
  chair(1.5, -0.1, face(1.5, -0.1));
  chair(-0.45, 1.3, face(-0.45, 1.3));

  // ---------- table, mugs, lantern ----------
  {
    const TX = 2.25, TZ = 0.45, yaw = face(TX, TZ) + 0.2;
    const P = M(TX, G, TZ, 0, yaw, 0);
    const TW = 0.62, TD = 0.42, TH = 0.36;
    for (let k = 0; k < 5; k++) box("wood", 0, TH + 0.015, -TD / 2 + TD * (k + 0.5) / 5, TW, 0.03, TD / 5 - 0.01, 0, 0, 0, P);
    for (const sx of [-1, 1]) {
      const xx = sx * (TW / 2 - 0.06);
      rod("dark", V(xx, 0, TD / 2 - 0.03), V(xx, TH, -TD / 2 + 0.03), 0.012, 5, P);
      rod("dark", V(xx, 0, -TD / 2 + 0.03), V(xx, TH, TD / 2 - 0.03), 0.012, 5, P);
    }
    const top = TH + 0.03;
    const place = (lx, lz) => V(lx, top, lz).applyMatrix4(P);
    for (const [lx, lz] of [[-0.16, 0.08], [0.0, 0.12]]) {
      const q = place(lx, lz);
      geoM("metal", new THREE.CylinderGeometry(0.045, 0.042, 0.1, 10), M(q.x, q.y + 0.05, q.z));
      geoM("metal", new THREE.TorusGeometry(0.028, 0.009, 4, 8), M(q.x + 0.05, q.y + 0.052, q.z, 0, 0, 0));
      geoM("dark", new THREE.CylinderGeometry(0.036, 0.036, 0.004, 10), M(q.x, q.y + 0.099, q.z)); // drink
    }
    // lantern
    const L = place(0.17, -0.05);
    geoM("dark", new THREE.CylinderGeometry(0.07, 0.08, 0.04, 10), M(L.x, L.y + 0.02, L.z));
    geoM("glow", new THREE.CylinderGeometry(0.055, 0.055, 0.13, 10), M(L.x, L.y + 0.04 + 0.065, L.z));
    for (let k = 0; k < 4; k++) {
      const t = (k / 4) * TAU + 0.4;
      rod("dark", V(L.x + 0.062 * Math.cos(t), L.y + 0.04, L.z + 0.062 * Math.sin(t)), V(L.x + 0.062 * Math.cos(t), L.y + 0.17, L.z + 0.062 * Math.sin(t)), 0.006, 4);
    }
    geoM("dark", new THREE.ConeGeometry(0.085, 0.06, 10), M(L.x, L.y + 0.2, L.z));
    geoM("dark", new THREE.TorusGeometry(0.045, 0.007, 4, 10, Math.PI), M(L.x, L.y + 0.23, L.z));
  }

  // ---------- firewood stack ----------
  {
    const WX = 1.25, WZ = -1.15, r = 0.055, ry = 0.35;
    const ax = V(Math.cos(ry), 0, -Math.sin(ry)), side = V(Math.sin(ry), 0, Math.cos(ry));
    const rows = [3, 2, 1];
    rows.forEach((n, j) => {
      for (let i = 0; i < n; i++) {
        const s = (i - (n - 1) / 2) * 2 * r * 1.02;
        const len = 0.5 - 0.03 * ((i + j) % 2);
        geoM("wood", new THREE.CylinderGeometry(r, r, len, 8), M(WX + side.x * s, G + r + j * r * 1.75, WZ + side.z * s, 0, ry, Math.PI / 2));
      }
    });
    // a split log leaning on the stack
    rod("wood", V(WX + side.x * 0.25, G, WZ + side.z * 0.25), V(WX + side.x * 0.12 + ax.x * 0.05, G + 0.3, WZ + side.z * 0.12 + ax.z * 0.05), 0.045, 6);
  }

  // ---------- backpack ----------
  {
    const BX = -2.25, BZ = 0.75, yaw = 0.7, lean = -0.12;
    const P = M(BX, G, BZ, lean, yaw, 0);
    geoM("needle", (() => {
      const g = new THREE.SphereGeometry(1, 12, 8);
      const p = g.attributes.position, f = (v, k) => Math.sign(v) * Math.abs(v) ** k;
      for (let i = 0; i < p.count; i++) p.setXYZ(i, f(p.getX(i), 0.5), f(p.getY(i), 0.6), f(p.getZ(i), 0.5));
      g.computeVertexNormals();
      return g;
    })(), at(P, M(0, 0.25, 0, 0, 0, 0, 0.19, 0.25, 0.13)));
    geoM("canvas", new THREE.SphereGeometry(1, 10, 6), at(P, M(0, 0.17, 0.11, 0, 0, 0, 0.13, 0.09, 0.05))); // front pocket
    for (const sx of [-1, 1]) geoM("dark", new THREE.BoxGeometry(0.03, 0.4, 0.02), at(P, M(sx * 0.08, 0.27, 0.13, -0.05, 0, 0))); // straps
    geoM("red", new THREE.BoxGeometry(0.34, 0.07, 0.24), at(P, M(0, 0.48, 0.01, -0.12, 0, 0))); // lid
    geoM("canvas", new THREE.CylinderGeometry(0.06, 0.06, 0.32, 8), at(P, M(0, 0.57, -0.02, 0, 0, Math.PI / 2))); // rolled mat
  }

  // ---------- pines ----------
  function pine(x, z, H) {
    const trunkH = H * 0.22;
    geoM("wood", new THREE.CylinderGeometry(H * 0.022, H * 0.034, trunkH + 0.2, 8), M(x, G + (trunkH + 0.2) / 2 - 0.03, z));
    const tiers = 5;
    for (let k = 0; k < tiers; k++) {
      const u = k / tiers;
      const y0 = G + trunkH + (H - trunkH) * u * 0.82, top = y0 + (H - trunkH) * (0.36 - 0.06 * u);
      const R = H * (0.2 - 0.13 * u);
      const yt = k === tiers - 1 ? H : top;
      const ref = V(x, y0 + (yt - y0) * 0.3, z);
      const apex = V(x, yt, z), under = V(x, y0 + (yt - y0) * 0.12, z);
      const n = 16, rot = k * 0.5;
      for (let i = 0; i < n; i++) {
        const P = (j) => {
          const t = (j / n) * TAU + rot, r = R * (j % 2 ? 0.72 : 1);
          return V(x + r * Math.cos(t), y0 - (j % 2 ? 0 : 0.06 * R), z + r * Math.sin(t));
        };
        tri("needle", apex, P(i), P(i + 1), ref);
        tri("needle", under, P(i + 1), P(i), ref);
      }
    }
  }
  pine(-2.55, -1.15, 4.0);
  pine(2.6, -1.25, 3.3);

  // a pivot at the fire, for close-ups (--focus fire)
  const fireJ = new THREE.Group();
  fireJ.name = "fire";
  fireJ.position.set(F.x, G + 0.5, F.z);
  body.add(fireJ);
  joints.fire = fireJ;

  // ---------- centre the footprint ----------
  const lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (const { p } of Object.values(soups))
    for (let i = 0; i < p.length; i += 3) {
      lo[0] = Math.min(lo[0], p[i]), hi[0] = Math.max(hi[0], p[i]);
      lo[1] = Math.min(lo[1], p[i + 2]), hi[1] = Math.max(hi[1], p[i + 2]);
    }
  body.position.set((-(lo[0] + hi[0]) / 2) * body.scale.x, 0, (-(lo[1] + hi[1]) / 2) * body.scale.x);

  // ---------- meshes ----------
  const MAT = {
    grass: [c.grass, c.grassShade, 0.35, 3],
    tuft: [c.tuft, c.tuft, 0.35, 0],
    water: [c.water, c.water, 0.35, 2.5],
    ripple: [c.ripple, c.ripple, 0.35, 0],
    needle: [c.needle, c.needleShade, 0.35, 3],
    wood: [c.wood, c.woodShade, 0.3, 2.5],
    canvas: [c.canvas, c.canvasShade, 0.3, 3],
    red: [c.red, c.redShade, 0.1, 2.5],
    dark: [c.dark, c.dark, 0.35, 2],
    metal: [c.metal, c.metalShade, 0.3, 2.5],
    cord: [c.cord, c.cord, 0.35, 1.2],
    glow: [c.glow, c.glow, -1, 2],
    flame: [c.flame, c.flame, -1, 2.5],
    core: [c.core, c.core, -1, 0],
    smoke: [c.smoke, c.smokeShade, 0.2, 2],
  };
  const live = {};
  for (const [key, { p, n, o }] of Object.entries(soups)) {
    const [b, s, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, b, s, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    body.add(mesh);
    if (key === "flame" || key === "core" || key === "smoke") {
      mesh.frustumCulled = false;
      live[key] = { g, p: Float32Array.from(p), o };
    }
  }

  // ---------- the fire clip: rewrite flame and smoke vertices ----------
  const CLIPS = { fire: 2 };
  const PER = 2;
  function fire(t) {
    const w = TAU / PER;
    for (const key of ["flame", "core"]) {
      const L = live[key];
      if (!L) continue;
      const P3 = L.g.attributes.position.array;
      for (let v = 0; v < L.o.length; v++) {
        const i = v * 3, tg = tongues[L.o[v]];
        if (!tg) continue;
        const lx = L.p[i] - tg.x, ly = L.p[i + 1] - (G + 0.02), lz = L.p[i + 2] - tg.z;
        const h = Math.max(0, ly / tg.H);
        const ph = tg.ph * TAU;
        const stretch = 1 + 0.16 * Math.sin(3 * w * t + ph) + 0.06 * Math.sin(5 * w * t + 2 * ph);
        const narrow = 1 - 0.12 * Math.sin(3 * w * t + ph);
        const sway = h ** 1.6 * tg.H * 0.28;
        const dx = sway * (Math.sin(2 * w * t + ph + h * 2.2) * 0.8 + 0.25 * Math.sin(4 * w * t + 1.3 * ph));
        const dz = sway * 0.6 * Math.sin(3 * w * t + 0.5 * ph + h * 1.7);
        P3[i] = tg.x + lx * narrow + dx;
        P3[i + 1] = G + 0.02 + ly * stretch;
        P3[i + 2] = tg.z + lz * narrow + dz;
      }
      L.g.attributes.position.needsUpdate = true;
      L.g.computeBoundingSphere();
      L.g.computeBoundingBox();
    }
    const L = live.smoke;
    if (L) {
      const P3 = L.g.attributes.position.array;
      for (let v = 0; v < L.o.length; v++) {
        const i = v * 3, k = L.o[v] - 1000;
        const u = (((t / PER + k / PUFFS) % 1) + 1) % 1;
        const sm = (a, b, x) => { const q = Math.min(1, Math.max(0, (x - a) / (b - a))); return q * q * (3 - 2 * q); };
        const s = (0.05 + 0.3 * u) * (0.85 + 0.3 * ((k * 0.618) % 1)) * sm(0, 0.12, u) * (1 - sm(0.72, 1, u));
        const cx = F.x + 0.6 * u ** 1.4 + 0.1 * Math.sin(TAU * u * 2 + k), cy = G + 1.12 + 1.6 * u, cz = F.z - 0.25 * u + 0.05 * Math.cos(TAU * u + k);
        P3[i] = cx + L.p[i] * s;
        P3[i + 1] = cy + L.p[i + 1] * s * 0.85;
        P3[i + 2] = cz + L.p[i + 2] * s;
      }
      L.g.attributes.position.needsUpdate = true;
      L.g.computeBoundingSphere();
      L.g.computeBoundingBox();
    }
    root.updateMatrixWorld(true);
  }

  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`campsite: no clip "${m[1]}" (clips: fire)`);
      return fire(+m[2]);
    }
    if (name !== "rest") throw new Error(`campsite: unknown pose "${name}" (rest, or fire@<seconds>)`);
    fire(0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
