// pufferfish.js - a pufferfish (fugu) for anime aquarium and comedy scenes, procedural, animated, with the puff gag.
// Contract: harness/lab/README.md. Metres, +Y up, the fish faces +Z, its left is +X. A fish has no ground: like the
// goldfish and koi code models its lowest rest point (the anal fin tip) is on y = 0 and it is centred on x = 0,
// z = 0; films lift it into the water. It inflates about its own axis, so the puffed ball reaches ~0.05 m below
// y = 0: keep that clearance over a tank floor.
//
// Construction (one morphing skin, so normal and puffed are the same mesh and every in-between is free):
//   BODY    one closed superellipse loft, 34 rings x 24, each ring a record { z, cy, hh, hw } in two tables of the
//           same topology: REST (a stubby, blunt-faced, slightly tapered fish read off a Takifugu side view) and
//           BALL (rings laid on a sphere R = 0.1 by their z fraction, the last rings left as a short tail stub).
//           morph(a) lerps the records and the superellipse exponent (2.2 -> 2.0) and rewrites the vertices in
//           place (a > 1 overshoots for the pop). The white belly is a material group on the same mesh.
//   RIDERS  everything on the skin is addressed by (rest z, theta) - theta 0 the back, 90 the left flank, 180 the
//           belly - and re-seated on the live skin each frame: eyes (bulge out and grow 1.3x when puffed), beak,
//           dark spots (flat disc decals, one merged mesh, growing ~sqrt of the swell), spines (one merged
//           mesh of 5-sided cones, hidden flat in the skin until the ball is half blown, then rising and
//           lengthening to standing: the ball first, then the spikes pop), and the fin pivots.
//   FINS    pectorals (little rounded fans that flutter), dorsal and anal (small, far back), rounded tail: two-layer
//           sheets (the goldfish's) rebuilt per frame in their pivot's frame, banded body colour -> pale edge.
//   SWAY    a gentle lateral wave along the spine (goldfish warp), damped as the fish rounds out.
// Proportions (base unit body length B = snout to tail root = 0.218 m; total 0.283 m): depth 0.45 B, width 0.39 B,
//   eye 0.14 B across, centred 0.18 B behind the snout and high on the head; dorsal and anal fins at 0.8 B; tail
//   0.3 B. Puffed: a 0.2 m ball (0.92 B), 111 spines 0.024 m long. 3.4k triangles at rest, 3.9k puffed.
//   build(THREE, kit, colors, { height }) or { length } (total, snout to tail tip) scales it uniformly.
// Two-tone pairs (festival script, ink #140c1c): back moon #ffd7a1 / practical #ffb020 (yellow-tan that warms in
//   shade); belly line #fff1ea / skin #f0c2ae; spots sky #24143a (one tone, lighter than ink); fins root moon /
//   practical, edge line / iris #ffd0a1 at threshold -0.2 (thin fins read lit); spines line / iris; eye sclera
//   #f6f3ee / skin with a practical / accent #ff4d6d iris ring, hair #1a1020 pupil and sclera glint; beak line /
//   iris with a hair slot.
// Clips: build() returns clips { swim: 0.8, idle: 2.4, puff: 0.6, deflate: 0.9 } (seconds). swim and idle loop;
//   puff (normal -> ball with a small overshoot) and deflate (ball -> normal) play once and hold their last frame.
//   pose("swim@0.3") is that clip at 0.3 s. Named poses: rest, swim, idle, half (a = 0.5), puffed (the held ball).
//   puff(a) (0..1) sets the inflation on top of the current pose for any in-between a film wants.

export const meta = {
  name: "pufferfish",
  height: 0.1,
  script: "festival",
  colors: {
    back: "#ffd7a1", backShade: "#ffb020",
    belly: "#fff1ea", bellyShade: "#f0c2ae",
    spot: "#24143a",
    fin: "#ffd7a1", finShade: "#ffb020",
    finEdge: "#fff1ea", finEdgeShade: "#ffd0a1",
    spine: "#fff1ea", spineShade: "#ffd0a1",
    eye: "#f6f3ee", eyeShade: "#f0c2ae",
    iris: "#ffb020", irisShade: "#ff4d6d",
    pupil: "#1a1020", glint: "#f6f3ee",
    beak: "#fff1ea", beakShade: "#ffd0a1",
  },
  poses: ["rest", "swim", "idle", "half", "puffed"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const C = colors;
  const TAU = Math.PI * 2, D = Math.PI / 180;
  const spow = (v, e) => Math.sign(v) * Math.abs(v) ** e;
  const lerp = (a, b, t) => a + (b - a) * t;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

  const root = new THREE.Group();
  root.name = "pufferfish";
  const space = new THREE.Group(); // uniform size scale
  space.name = "space";
  root.add(space);
  const fish = new THREE.Group(); // authored frame, shifted so the rest bbox sits on y = 0 and centres on z = 0
  fish.name = "fish";
  space.add(fish);
  const joints = {};
  const toon = (g, b, s, o) => {
    const m = kit.toon(g, b, s, o);
    m.frustumCulled = false;
    m.children.forEach((h) => (h.frustumCulled = false));
    return m;
  };

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

  // ---------- ring tables ----------
  //            snout                                                                    tail root
  const BZ = [0.130, 0.125, 0.113, 0.096, 0.072, 0.042, 0.012, -0.018, -0.043, -0.063, -0.077, -0.088];
  const BT = [0.003, 0.021, 0.035, 0.044, 0.049, 0.0495, 0.046, 0.037, 0.025, 0.015, 0.0115, 0.0098]; // top
  const BB = [-0.011, -0.026, -0.038, -0.045, -0.048, -0.048, -0.044, -0.035, -0.022, -0.012, -0.0092, -0.0080]; // belly
  const BW = [0.006, 0.023, 0.033, 0.039, 0.042, 0.043, 0.040, 0.032, 0.021, 0.012, 0.0080, 0.0058]; // half-width
  const rz = spline(BZ, 3), rt = spline(BT, 3), rb = spline(BB, 3), rw = spline(BW, 3);
  const NR = rz.length, SEG = 24;
  const Z0 = 0.130, ZE = -0.063, BR = 0.1, BZC = 0.022, BYC = 0.0; // ball: radius and centre
  const REST = rz.map((z, i) => ({ z, cy: (rt[i] + rb[i]) / 2, hh: (rt[i] - rb[i]) / 2, hw: rw[i] }));
  const zSphEnd = BZC + BR * (1 - 2 * 0.987);
  const BALL = REST.map((r) => {
    if (r.z >= ZE) {
      const f = (Z0 - r.z) / (Z0 - ZE), c = 1 - 2 * (0.012 + 0.975 * f), s = Math.sqrt(1 - c * c) * BR;
      return { z: BZC + BR * c, cy: BYC, hh: s, hw: s };
    }
    const k = (ZE - r.z) / (ZE - BZ[BZ.length - 1]); // the stub: rest section, a little fuller, out of the ball
    return { z: zSphEnd - (ZE - r.z) * 1.05, cy: BYC, hh: lerp(0.016, r.hh * 1.15, k), hw: lerp(0.013, r.hw * 1.25, k) };
  });
  const REC = REST.map((r) => ({ ...r })); // live rings
  let NEXP = 2.2;
  let A = 0; // live inflation
  const restZ = (z) => { // rest z -> fractional ring index
    if (z >= rz[0]) return 0;
    for (let i = 1; i < NR; i++) if (z >= rz[i]) return i - 1 + (rz[i - 1] - z) / (rz[i - 1] - rz[i]);
    return NR - 1;
  };
  function morph(a) {
    A = a;
    for (let i = 0; i < NR; i++) for (const k of ["z", "cy", "hh", "hw"]) REC[i][k] = lerp(REST[i][k], BALL[i][k], a);
    NEXP = Math.max(1.9, lerp(2.2, 2.0, a));
  }
  const ringPt = (r, th) => [r.hw * spow(Math.sin(th), 2 / NEXP), r.cy + r.hh * spow(Math.cos(th), 2 / NEXP), r.z];
  function surf(u, th) { // live (unswayed) skin point at fractional ring u
    const i = Math.min(NR - 2, Math.max(0, Math.floor(u))), f = u - i, a = REC[i], b = REC[i + 1];
    return ringPt({ z: lerp(a.z, b.z, f), cy: lerp(a.cy, b.cy, f), hh: lerp(a.hh, b.hh, f), hw: lerp(a.hw, b.hw, f) }, th);
  }
  // point, outward normal and the backward surface tangent at (u, theta)
  function frame(u, th) {
    const p = V(...surf(u, th));
    const du = V(...surf(Math.min(NR - 1, u + 0.05), th)).sub(V(...surf(Math.max(0, u - 0.05), th))).normalize();
    const dt = V(...surf(u, th + 0.02)).sub(V(...surf(u, th - 0.02)));
    const n = V().crossVectors(dt, du).normalize();
    const c = surf(u, th); // outward test: away from the ring centre
    const i = Math.min(NR - 1, Math.round(u));
    if (n.x * c[0] + n.y * (c[1] - REC[i].cy) < 0) n.negate();
    return { p, n, back: du };
  }

  // ---------- the spine wave (sway) ----------
  const ZH = 0.13;
  const W = { amp0: 0, amp1: 0, k: 0, ph: 0 };
  const sOf = (z) => (W.amp0 + W.amp1 * ((ZH - z) / 0.22) ** 2) * Math.sin(W.ph - W.k * (ZH - z));
  const yawAt = (z) => Math.atan((sOf(z + 0.0005) - sOf(z - 0.0005)) / 0.001);
  function warp(x, y, z, out) {
    const a = yawAt(z);
    out[0] = sOf(z) + x * Math.cos(a);
    out[1] = y;
    out[2] = z - x * Math.sin(a);
    return out;
  }
  const yawVec = (v, z) => v.applyAxisAngle(V(0, 1, 0), yawAt(z));

  // ---------- body skin ----------
  const NV = NR * SEG + 2, FP = NR * SEG, BP = NR * SEG + 1;
  const bodyGeo = new THREE.BufferGeometry();
  bodyGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(NV * 3), 3));
  const quads = [[], []]; // 0 back, 1 belly
  const bellyEdge = (z) => (98 + 26 * Math.min(1, Math.max(0, (0.1 - z) / 0.17))) * D;
  for (let i = 0; i < NR - 1; i++) for (let j = 0; j < SEG; j++) {
    const a = i * SEG + j, b = i * SEG + ((j + 1) % SEG), c = a + SEG, d = b + SEG;
    const th = ((j + 0.5) / SEG) * TAU, e = bellyEdge((rz[i] + rz[i + 1]) / 2);
    quads[th > e && th < TAU - e ? 1 : 0].push(a, b, c, b, d, c);
  }
  for (let j = 0; j < SEG; j++) {
    const b = (j + 1) % SEG, th = ((j + 0.5) / SEG) * TAU, e = bellyEdge(0.13);
    quads[th > e && th < TAU - e ? 1 : 0].push(FP, b, j);
    quads[0].push(BP, (NR - 1) * SEG + j, (NR - 1) * SEG + b);
  }
  function writeBody() {
    const pos = bodyGeo.attributes.position.array, t = [0, 0, 0];
    for (let i = 0; i < NR; i++) for (let j = 0; j < SEG; j++) {
      const p = ringPt(REC[i], (j / SEG) * TAU);
      warp(p[0], p[1], p[2], t);
      pos.set(t, (i * SEG + j) * 3);
    }
    const r0 = REC[0], rl = REC[NR - 1];
    const front = [0, lerp(r0.cy, BYC, A), lerp(r0.z + 0.6 * r0.hw, BZC + BR, A)];
    pos.set(warp(...front, t), FP * 3);
    pos.set(warp(0, rl.cy, rl.z - 0.5 * rl.hw, t), BP * 3);
    bodyGeo.attributes.position.needsUpdate = true;
    if (!bodyGeo.index) return; // first call: positions only, for the winding test
    bodyGeo.computeVertexNormals();
    bodyGeo.attributes.hullNormal.array.set(bodyGeo.attributes.normal.array); // seam-free loft: hull = normal
    bodyGeo.attributes.hullNormal.needsUpdate = true;
    bodyGeo.computeBoundingSphere();
    bodyGeo.computeBoundingBox();
  }
  morph(0);
  writeBody();
  function signedVolume(pos, idx) {
    let v = 0;
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
      v += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1]) - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c])
        + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
    }
    return v;
  }
  if (signedVolume(bodyGeo.attributes.position.array, quads.flat()) < 0)
    for (const q of quads) for (let i = 0; i < q.length; i += 3) [q[i + 1], q[i + 2]] = [q[i + 2], q[i + 1]];
  bodyGeo.setIndex(quads.flat());
  bodyGeo.addGroup(0, quads[0].length, 0);
  bodyGeo.addGroup(quads[0].length, quads[1].length, 1);
  bodyGeo.computeVertexNormals();
  bodyGeo.setAttribute("hullNormal", bodyGeo.attributes.normal.clone());
  const body = toon(bodyGeo, C.back, C.backShade);
  body.material = [kit.cel(C.back, C.backShade), kit.cel(C.belly, C.bellyShade)];
  body.name = "body";
  fish.add(body);

  // ---------- merged rider meshes (spines, spots): rewritten per frame ----------
  function merged(name, nItems, vPer, tris, base, shade, o) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(nItems * vPer * 3), 3));
    const idx = [];
    for (let k = 0; k < nItems; k++) for (const t of tris) idx.push(t + k * vPer);
    g.setIndex(idx);
    g.computeVertexNormals();
    if (o.outline !== false) g.setAttribute("hullNormal", g.attributes.normal.clone());
    const m = toon(g, base, shade, o);
    m.name = name;
    fish.add(m);
    return m;
  }
  const finish = (g) => {
    g.attributes.position.needsUpdate = true;
    g.computeVertexNormals();
    if (g.attributes.hullNormal) { g.attributes.hullNormal.array.set(g.attributes.normal.array); g.attributes.hullNormal.needsUpdate = true; }
    g.computeBoundingSphere();
    g.computeBoundingBox();
  };

  // anchors (rest z, theta deg)
  const EYE = { z: 0.091, th: 57, r: 0.0152 };
  const PEC = { z: 0.052, th: 104 };
  const DOR = { z: -0.047, th: 0 }, ANA = { z: -0.052, th: 180 };

  // SPINES: rows by z fraction on the ball, count per row by the ball's girth, staggered; clear of eyes, fins, beak
  const SPINES = [];
  {
    morph(1);
    const keep = [[EYE.z, EYE.th, 0.034], [EYE.z, -EYE.th, 0.034], [PEC.z, PEC.th, 0.026], [PEC.z, -PEC.th, 0.026],
      [DOR.z, 0, 0.03], [ANA.z, 180, 0.03]].map(([z, th, r]) => [frame(restZ(z), th * D).p, r]);
    const ROWS = 8;
    for (let k = 0; k < ROWS; k++) {
      const f = 0.07 + 0.86 * (k / (ROWS - 1)), z = Z0 - f * (Z0 - ZE), u = restZ(z);
      const rad = REC[Math.round(u)].hw, n = Math.max(5, Math.round(TAU * rad / 0.032));
      for (let j = 0; j < n; j++) {
        const th = ((j + (k % 2) * 0.5) / n) * TAU + 0.11;
        const p = frame(u, th).p;
        if (keep.some(([q, r]) => q.distanceTo(p) < r)) continue;
        if (z > 0.115 && Math.abs(Math.cos(th)) < 1) { if (p.distanceTo(V(0, BYC, BZC + BR)) < 0.03) continue; }
        SPINES.push({ u, th });
      }
    }
    morph(0);
  }
  const NS = 5, SV = NS + 1, coneTris = [];
  for (let s = 0; s < NS; s++) coneTris.push(s, (s + 1) % NS, NS);
  const spines = merged("spines", SPINES.length, SV, coneTris, C.spine, C.spineShade, { threshold: 0.1 });
  {
    // winding check on one upright test cone
    const g = spines.geometry, pos = g.attributes.position.array;
    for (let s = 0; s < NS; s++) pos.set([Math.cos(s * TAU / NS), 0, Math.sin(s * TAU / NS)], s * 3);
    pos.set([0, 1, 0], NS * 3);
    const idx = g.index.array;
    let v = 0;
    for (let i = 0; i < NS * 3; i += 3) {
      const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
      v += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1]) - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c])
        + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
    }
    if (v < 0) for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    g.index.needsUpdate = true;
    pos.fill(0); // hidden at rest: keep the parked cones inside the body for the bbox
  }
  function writeSpines() {
    const g = spines.geometry, pos = g.attributes.position.array, t = [0, 0, 0];
    const a = Math.max(0, (A - 0.55) / 0.45), on = a > 0.05; // the ball first, then the spines pop (the gag's beat)
    spines.visible = on;
    if (!on) return;
    const len = 0.024 * Math.min(1.15, a), rB = 0.0068 * Math.min(1, 0.4 + 0.6 * a), el = (25 + 55 * Math.min(1, a)) * D;
    const ax = V(), e1 = V(), e2 = V(), q = V();
    SPINES.forEach((s, k) => {
      const { p, n, back } = frame(s.u, s.th);
      const bt = back.clone().addScaledVector(n, -back.dot(n)).normalize();
      ax.copy(bt).multiplyScalar(Math.cos(el)).addScaledVector(n, Math.sin(el)).normalize();
      e1.crossVectors(ax, n).normalize();
      if (e1.lengthSq() < 1e-8) e1.set(1, 0, 0);
      e2.crossVectors(ax, e1).normalize();
      const o = k * SV * 3;
      for (let j = 0; j < NS; j++) {
        const an = (j / NS) * TAU;
        q.copy(p).addScaledVector(n, -0.0022).addScaledVector(e1, Math.cos(an) * rB).addScaledVector(e2, Math.sin(an) * rB);
        pos.set(warp(q.x, q.y, q.z, t), o + j * 3);
      }
      q.copy(p).addScaledVector(ax, len);
      pos.set(warp(q.x, q.y, q.z, t), o + NS * 3);
    });
    finish(g);
  }

  // SPOTS: flat 10-gon discs a hair above the skin, scattered over the back and upper flanks (golden-angle, fixed)
  const SPOTS = [];
  for (let k = 0; SPOTS.length < 26 && k < 200; k++) {
    const f = ((k * 0.618034) % 1), z = 0.105 - f * 0.17;
    const th = (8 + ((k * 37) % 89)) * D * (k % 2 ? 1 : -1);
    const r = 0.0052 + 0.0028 * ((k * 0.7548) % 1);
    if (Math.abs(th) > bellyEdge(z) - 16 * D) continue;
    const de = Math.hypot((z - EYE.z) * 1.0, (Math.abs(th) - EYE.th * D) * 0.04);
    if (de < 0.022) continue;
    if (Math.hypot(z - PEC.z, (Math.abs(th) - PEC.th * D) * 0.043) < 0.016) continue;
    if (SPOTS.some((s) => Math.hypot(s.z - z, (s.th - th) * 0.043) < s.r + r + 0.004)) continue;
    SPOTS.push({ z, th, r, u: restZ(z) });
  }
  const DN = 8, DV = DN + 1, discTris = [];
  for (let s = 0; s < DN; s++) discTris.push(DN, s, (s + 1) % DN);
  const spots = merged("spots", SPOTS.length, DV, discTris, C.spot, C.spot, { outline: false });
  function writeSpots() {
    const g = spots.geometry, pos = g.attributes.position.array, t = [0, 0, 0];
    const grow = Math.sqrt(1 + 1.2 * Math.max(0, A)), e1 = V(), e2 = V(), q = V();
    SPOTS.forEach((s, k) => {
      const { p, n, back } = frame(s.u, s.th);
      e1.copy(back).addScaledVector(n, -back.dot(n)).normalize();
      e2.crossVectors(n, e1).normalize();
      const o = k * DV * 3, lift = 0.0009 + 0.0003 * A;
      for (let j = 0; j < DN; j++) {
        const an = (j / DN) * TAU, rr = s.r * grow;
        q.copy(p).addScaledVector(n, lift).addScaledVector(e1, Math.cos(an) * rr).addScaledVector(e2, Math.sin(an) * rr * 0.9);
        // drop the rim onto the curved skin: sagitta of the body radius at this point
        q.addScaledVector(n, -(rr * rr) / (2 * Math.max(0.02, REC[Math.round(s.u)].hw * 1.1)));
        pos.set(warp(q.x, q.y, q.z, t), o + j * 3);
      }
      q.copy(p).addScaledVector(n, lift);
      pos.set(warp(q.x, q.y, q.z, t), o + DN * 3);
    });
    finish(g);
    // a disc's normal must face out: flip winding once if the first disc points in
    if (!spots.userData.checked) {
      spots.userData.checked = true;
      const nm = g.attributes.normal, f = frame(SPOTS[0].u, SPOTS[0].th).n;
      if (nm.getX(DN) * f.x + nm.getY(DN) * f.y + nm.getZ(DN) * f.z < 0) {
        const idx = g.index.array;
        for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
        g.index.needsUpdate = true;
        finish(g);
      }
    }
  }

  // ---------- fins: two-layer sheets in a pivot's frame ----------
  const FIN_T = -0.2;
  const finPairs = [[C.fin, C.finShade], [C.finEdge, C.finEdgeShade]];
  const sheets = [];
  function sheet(name, parent, nu, nv, grid, band, th = 0.0008) {
    const n1 = (nu + 1) * (nv + 1), id = (i, j) => i * (nv + 1) + j, qd = [[], []];
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = id(i, j), b = id(i + 1, j), c = id(i + 1, j + 1), d = id(i, j + 1);
      qd[band((i + 0.5) / nu, (j + 0.5) / nv)].push(a, b, c, a, c, d);
    }
    const one = qd.flat(), idx = [];
    const g = new THREE.BufferGeometry();
    let start = 0;
    qd.forEach((q, k) => {
      idx.push(...q);
      for (let t = 0; t < q.length; t += 3) idx.push(q[t] + n1, q[t + 2] + n1, q[t + 1] + n1);
      g.addGroup(start, q.length * 2, k);
      start += q.length * 2;
    });
    for (const k of ["position", "normal", "hullNormal"]) g.setAttribute(k, new THREE.BufferAttribute(new Float32Array(n1 * 6), 3));
    g.setIndex(idx);
    const mesh = toon(g, ...finPairs[0], { threshold: FIN_T });
    mesh.material = finPairs.map(([b, s]) => kit.cel(b, s, { threshold: FIN_T }));
    mesh.name = name + "Sheet";
    parent.add(mesh);
    const P = [], N = [];
    for (let k = 0; k < n1; k++) { P.push(V()); N.push(V()); }
    const e1 = V(), e2 = V();
    function update() {
      for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { P[id(i, j)].set(...grid(i / nu, j / nv)); N[id(i, j)].set(0, 0, 0); }
      for (let k = 0; k < one.length; k += 3) {
        const [a, b, c] = [one[k], one[k + 1], one[k + 2]];
        e1.subVectors(P[b], P[a]).cross(e2.subVectors(P[c], P[a]));
        N[a].add(e1); N[b].add(e1); N[c].add(e1);
      }
      const pos = g.attributes.position.array, nor = g.attributes.normal.array, hul = g.attributes.hullNormal.array;
      for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
        const v = id(i, j), n = N[v].lengthSq() > 1e-20 ? N[v].normalize() : V(0, 1, 0);
        const ii = Math.min(Math.max(i, 1), nu - 1), jj = Math.min(Math.max(j, 1), nv - 1);
        const o = P[v].clone().sub(P[id(ii, jj)]);
        o.addScaledVector(n, -o.dot(n));
        const rim = (ii !== i || jj !== j) && o.lengthSq() > 1e-14;
        if (rim) o.normalize();
        for (const [L, sg] of [[0, 1], [n1, -1]]) {
          const t = (v + L) * 3, h = rim ? o.clone().addScaledVector(n, 0.35 * sg).normalize() : n.clone().multiplyScalar(sg);
          pos[t] = P[v].x + n.x * th * sg; pos[t + 1] = P[v].y + n.y * th * sg; pos[t + 2] = P[v].z + n.z * th * sg;
          nor[t] = n.x * sg; nor[t + 1] = n.y * sg; nor[t + 2] = n.z * sg;
          hul[t] = h.x; hul[t + 1] = h.y; hul[t + 2] = h.z;
        }
      }
      for (const k of ["position", "normal", "hullNormal"]) g.attributes[k].needsUpdate = true;
      g.computeBoundingSphere();
      g.computeBoundingBox();
    }
    sheets.push(update);
    return mesh;
  }
  const pivot = (name) => { const g = new THREE.Group(); g.name = name; fish.add(g); joints[name] = g; return g; };
  const F = { pec: { a: 0, ph: 0 }, dorsal: { a: 0, ph: 0 }, anal: { a: 0, ph: 0 }, tail: { a: 0, ph: 0, k: 0 } };
  let finScale = 1;

  // PECTORALS: pivot on the flank; a rounded fan, chord up the body, span back and out, flapped about the chord
  for (const sx of [1, -1]) {
    const k = sx > 0 ? "L" : "R";
    const pv = pivot("pectoral" + k);
    sheet("pectoral" + k, pv, 5, 4, (u, v) => {
      const s = finScale, M = F.pec;
      const ang = (32 + 34 * M.a * Math.sin(M.ph + (sx > 0 ? 0 : M.lr ?? 0))) * D;
      const chord = 0.024 * s, span = 0.026 * s;
      const c = (u - 0.5) * chord * (0.6 + 0.75 * Math.sin(Math.PI * (0.2 + 0.65 * v))) * (1 - 0.3 * v ** 3);
      const sp = span * v * (1 - 0.3 * (2 * u - 1) ** 2) - 0.003;
      const cup = 0.18 * span * v * v * Math.sin(M.ph - 2.2 * v) * M.a;
      // local: x out, y up, z forward. span direction rotates from straight back (-z) outward by ang
      const x = sp * Math.sin(ang) + cup * Math.cos(ang), z = -sp * Math.cos(ang) + cup * Math.sin(ang) + c * 0.25;
      return [sx * x, c, z];
    }, (u, v) => (v < 0.45 ? 0 : 1));
  }
  // DORSAL and ANAL: small rounded flags raked back
  for (const [name, sy, len] of [["dorsal", 1, 0.026], ["anal", -1, 0.024]]) {
    const pv = pivot(name);
    sheet(name, pv, 6, 4, (u, v) => {
      const s = finScale, M = F[name];
      const H = len * s * (0.5 + 0.5 * (1 - u)) * (1 - u) ** 0.35 + 0.003;
      const y = (H * v - 0.004) * sy;
      const z = (0.012 - 0.026 * u) * s - 0.014 * s * v ** 1.3;
      const x = M.a * v ** 1.5 * Math.sin(M.ph - 3 * u);
      return [x, y, z];
    }, (u, v) => (v < 0.4 ? 0 : 1));
  }
  // TAIL: a rounded fan off the peduncle
  {
    const pv = pivot("tail");
    sheet("tail", pv, 7, 9, (u, v) => {
      const T = F.tail;
      const th = (38 - 76 * v) * D, w = Math.abs(2 * v - 1);
      const L = 0.062 * (1 - 0.18 * w ** 3) * (0.97 + 0.03 * Math.cos(v * TAU * 3));
      const r0 = 0.0075 * (1 - 2 * v);
      const d = L * u;
      let y = r0 * (1 - u) + Math.sin(th) * d, z = 0.006 - Math.cos(th) * d;
      const fl = (d / 0.062) ** 1.3;
      const x = T.a * fl * Math.sin(T.ph - T.k * d);
      return [x, y, z];
    }, (u) => (u < 0.5 ? 0 : 1));
  }

  // ---------- eyes and beak ----------
  for (const sx of [1, -1]) {
    const k = sx > 0 ? "L" : "R";
    const eye = pivot("eye" + k);
    const R = EYE.r;
    const ball = toon(new THREE.SphereGeometry(R, 12, 8), C.eye, C.eyeShade, { threshold: -0.15 });
    ball.scale.set(1, 1, 0.8);
    ball.name = "eyeball" + k;
    eye.add(ball);
    const disc = (name, r, z, b, s, seg = 14) => {
      const m = toon(new THREE.SphereGeometry(r, seg, 4), b, s, { outline: false });
      m.scale.set(1, 1, 0.25);
      m.position.z = z;
      m.name = name + k;
      eye.add(m);
      return m;
    };
    disc("iris", R * 0.74, R * 0.8 - R * 0.74 * 0.25 + 0.0006, C.iris, C.irisShade).material = kit.cel(C.iris, C.irisShade, { threshold: -0.6 });
    disc("pupil", R * 0.52, R * 0.8 - R * 0.52 * 0.25 + 0.0012, C.pupil, C.pupil);
    const gl = disc("glint", R * 0.2, R * 0.8 + 0.0008, C.glint, C.glint, 8);
    gl.position.x = R * 0.22 * sx;
    gl.position.y = R * 0.28;
  }
  const beak = pivot("beak");
  {
    const lip = toon(new THREE.SphereGeometry(0.0074, 10, 6), C.beak, C.beakShade, { threshold: -0.1 });
    lip.scale.set(1, 0.66, 0.75);
    lip.name = "lips";
    beak.add(lip);
    const slot = toon(new THREE.SphereGeometry(0.0052, 10, 4), C.pupil, C.pupil, { outline: false });
    slot.scale.set(1, 0.16, 0.5);
    slot.position.set(0, -0.0004, 0.0034);
    slot.name = "mouthSlot";
    beak.add(slot);
  }

  // seat every rider on the live skin
  const tmp = [0, 0, 0], Q = new THREE.Quaternion(), M4 = new THREE.Matrix4();
  function seat(j, p, z, yawExtra = 0) {
    warp(p.x, p.y, p.z, tmp);
    j.position.set(tmp[0], tmp[1], tmp[2]);
    j.rotation.set(0, yawAt(z) + yawExtra, 0);
  }
  function placeRiders() {
    const a = Math.max(0, A), am = Math.min(1, a);
    for (const sx of [1, -1]) {
      const k = sx > 0 ? "L" : "R", eye = joints["eye" + k];
      const { p, n } = frame(restZ(EYE.z), sx * EYE.th * D);
      const sc = 1 + 0.32 * am, depth = EYE.r * lerp(0.5, 0.08, am) * sc;
      p.addScaledVector(n, -depth);
      warp(p.x, p.y, p.z, tmp);
      eye.position.set(tmp[0], tmp[1], tmp[2]);
      const look = yawVec(n.clone().add(V(0, -0.08, 0.32)).normalize(), p.z);
      M4.lookAt(V(), look.negate(), V(0, 1, 0));
      Q.setFromRotationMatrix(M4);
      eye.quaternion.copy(Q);
      eye.scale.setScalar(sc);
    }
    const r0 = REC[0];
    const fz = lerp(r0.z + 0.6 * r0.hw, BZC + BR, a), fy = lerp(r0.cy, BYC, a);
    seat(beak, V(0, fy - 0.0025, fz - 0.0028), fz);
    for (const sx of [1, -1]) {
      const { p, n } = frame(restZ(PEC.z), sx * PEC.th * D);
      p.addScaledVector(n, -0.001);
      seat(joints["pectoral" + (sx > 0 ? "L" : "R")], p, p.z);
    }
    for (const [name, sp] of [["dorsal", DOR], ["anal", ANA]]) {
      const { p } = frame(restZ(sp.z), sp.th * D);
      seat(joints[name], p, p.z);
    }
    const rl = REC[NR - 1];
    seat(joints.tail, V(0, rl.cy, rl.z), rl.z);
    finScale = lerp(1, 0.78, am);
  }

  // ---------- clips and poses ----------
  // Per clip: T seconds; sway amp0 / amp1 (m, head / tail root) and k (rad/m); per fin a (pec: flap gain, dorsal /
  // anal / tail: lateral m) and n cycles per clip with a phase lag in cycles; bob (m, n cycles); inf(t) inflation.
  const ease = (x) => x * x * (3 - 2 * x);
  const CLIPS = {
    swim: { T: 0.8, loop: true, amp0: 0.0012, amp1: 0.0055, k: 22, bob: [0.0012, 1],
      pec: [1, 2, 0], dorsal: [0.006, 2, 0], anal: [0.006, 2, 0.5], tail: [0.010, 1, 0.12, 40] },
    idle: { T: 2.4, loop: true, amp0: 0.0003, amp1: 0.0016, k: 18, bob: [0.003, 1],
      pec: [0.7, 4, 0, 0.5], dorsal: [0.003, 2, 0], anal: [0.003, 2, 0.5], tail: [0.004, 1, 0.2, 30] },
    puff: { T: 0.6, loop: false, amp0: 0, amp1: 0, k: 0, bob: [0, 1], inf: (x) => (x < 0.7 ? 1.08 * ease(x / 0.7) : 1.08 - 0.08 * ease(Math.min(1, (x - 0.7) / 0.3))),
      pec: [1.2, 5, 0], dorsal: [0.002, 3, 0], anal: [0.002, 3, 0.5], tail: [0.008, 3, 0, 40] },
    deflate: { T: 0.9, loop: false, amp0: 0.0004, amp1: 0.002, k: 20, bob: [0, 1],
      inf: (x) => 1 - ease(Math.min(1, x / 0.9)) + 0.04 * Math.sin(x * TAU * 3) * (1 - x),
      pec: [0.8, 4, 0], dorsal: [0.003, 3, 0], anal: [0.003, 3, 0.5], tail: [0.006, 2, 0, 35] },
  };
  const clips = Object.fromEntries(Object.entries(CLIPS).map(([k, c]) => [k, c.T]));
  const POSES = { rest: null, swim: ["swim", 0.2], idle: ["idle", 0.3], half: [null, 0, 0.5], puffed: [null, 0, 1] };

  let cur = { clip: null, t: 0, a: 0 };
  function apply(clip, t, aOverride) {
    const c = clip ? CLIPS[clip] : null;
    let x = 0;
    if (c) x = c.loop ? (((t % c.T) + c.T) % c.T) / c.T : Math.min(1, Math.max(0, t / c.T));
    const ph = TAU * x;
    const a = aOverride ?? (c && c.inf ? c.inf(x) : 0);
    cur = { clip, t, a };
    morph(a);
    const damp = 1 - 0.75 * Math.min(1, Math.max(0, a));
    W.amp0 = c ? c.amp0 * damp : 0; W.amp1 = c ? c.amp1 * damp : 0; W.k = c ? c.k : 0; W.ph = ph;
    for (const f of ["pec", "dorsal", "anal", "tail"]) {
      const r = c ? c[f] : [0, 1, 0];
      F[f].a = r[0];
      F[f].ph = r[1] * ph - TAU * r[2];
      if (f === "pec") F.pec.lr = TAU * (r[3] ?? 0);
      if (f === "tail") F.tail.k = r[3] ?? 0;
    }
    fish.position.y = baseY + (c ? c.bob[0] * Math.sin(c.bob[1] * ph) : 0);
    writeBody();
    writeSpines();
    writeSpots();
    placeRiders();
    for (const u of sheets) u();
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`pufferfish: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      return apply(m[1], +m[2]);
    }
    if (!(name in POSES)) throw new Error(`pufferfish: unknown pose "${name}" (${Object.keys(POSES).join(", ")})`);
    const p = POSES[name];
    if (!p) return apply(null, 0);
    if (p[0]) return apply(p[0], p[1] * CLIPS[p[0]].T);
    return apply(null, 0, p[2]);
  }
  function puff(a) { apply(cur.clip, cur.t, a); }

  // rest bbox -> lowest point on y = 0, centre on x, z; then size
  let baseY = 0;
  apply(null, 0);
  const box = new THREE.Box3().setFromObject(fish, true);
  baseY = -box.min.y;
  fish.position.set(-(box.min.x + box.max.x) / 2, baseY, -(box.min.z + box.max.z) / 2);
  const restH = box.max.y - box.min.y, restL = box.max.z - box.min.z;
  space.scale.setScalar(opts.height ? opts.height / restH : opts.length ? opts.length / restL : 1);
  pose("rest");
  return { root, joints, pose, puff, clips };
}
