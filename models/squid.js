// squid.js - a squid (ika, the common Japanese flying squid look) for aquarium, seaside and food scenes, animated.
// Contract: harness/lab/README.md. Metres, +Y up, the squid faces +Z (arms forward, mantle tip back), its left is +X.
// A swimmer has no ground: like the goldfish and koi code models its lowest rest point (the fin edges / ventral arms)
// sits on y = 0 and it is centred on x = 0, z = 0; films lift it into the water.
//
// Construction (one live skin per part, rewritten in pose(), so nothing rotated hangs off a scaled node):
//   MANTLE   a closed ring loft along z (torpedo: a dull point at the tip, widest just behind the collar), 16 seg.
//            Belly is a material group (the bottom arc), the chromatophore speckle is flattened-sphere decals seated
//            on the live surface at (z, theta). The jet pulse scales the rings radially (most in the middle).
//   FINS     one flat lens-section loft through the mantle tip: an arrowhead planform (rhombus, the front half hidden
//            in the mantle), so the hull draws one clean outline; the ripple is a travelling y wave on the rings.
//   HEAD     a short static loft out of the collar (narrower than the mantle, so the collar step reads), big eyes
//            (pale ring, dark pupil, glint) on its flanks, the arm crown at its front.
//   ARMS     eight tapered tubes and two long tentacles with clubs, each rebuilt per pose along a centreline
//            integrated from two angle functions (pitch alpha toward the arm's own radial u, yaw beta toward its
//            tangential w): a splay, a curl growing toward the tip and a deterministic travelling wave. Rings are
//            parallel-transported, so a tube never twists.
// Proportions (base unit mantle length ML = 0.26 m): mantle radius 0.13 ML, fins 0.42 ML long, span 0.52 ML; head
//   0.3 ML; arms 0.35-0.48 ML (pair III longest); tentacles 0.85 ML, club over the last quarter. Total 0.53 m tip to
//   tentacle club at rest, 0.066 m tall. Real size; build(THREE, kit, colors, { length }) (total) or { height }
//   scales it uniformly. ~3.7k triangles (octopus ~3.2k, 0.12 m tall, 0.23 m across: meta.height is the squid's).
// Varieties: { variety: "squid" } (default) or "octopus" (tako: round mantle sac above and behind the head, no fins,
//   eight arms spread on y = 0 with curled tips and a pale sucker band under each arm). Same clips.
// Two-tone pairs (noon script, ink #2c261f): body moon #fff6e4 / skin #f0c2ae (pale, a little translucent pink in
//   shade); belly practical #fffaf2 / moon; fins practical / skin with threshold -0.15 (thin, read light); arms skin /
//   accent #c4452d; speckle accent / iris #5c3d32; eye ring sclera #f6f3ee / sky #f2d7ae, pupil iris, glint practical.
//   Octopus: body accent / iris, suckers skin / sky.
// Clips: build() returns clips { swim: 1.2 s, idle: 3.0 s, grab: 1.0 s }; pose("swim@0.3") is that clip at 0.3 s.
//   swim and idle loop, grab plays once (clamped). Named poses: rest, swim (swim@0.25, contracted jet), idle
//   (idle@0.75), grab (grab@0.42, tentacles fully out).
// Sign convention (arms): alpha > 0 bends an arm away from the body axis (flare), < 0 toward it (gather); a squid
//   arm's u is radial out from the head axis; an octopus arm's u is +Y (alpha > 0 lifts / curls the tip up).

export const meta = {
  name: "squid",
  height: 0.066,
  script: "noon",
  colors: {
    body: "#fff6e4", bodyShade: "#f0c2ae",
    belly: "#fffaf2", bellyShade: "#fff6e4",
    fin: "#fffaf2", finShade: "#f0c2ae",
    arm: "#f0c2ae", armShade: "#c4452d",
    spot: "#c4452d", spotShade: "#5c3d32",
    eye: "#f6f3ee", eyeShade: "#f2d7ae",
    pupil: "#5c3d32", glint: "#fffaf2",
    octo: "#c4452d", octoShade: "#5c3d32",
    sucker: "#f0c2ae", suckerShade: "#f2d7ae",
  },
  poses: ["rest", "swim", "idle", "grab"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const C = colors;
  const { variety = "squid" } = opts;
  if (!["squid", "octopus"].includes(variety)) throw new Error(`squid: variety must be squid or octopus (got ${variety})`);
  const OCTO = variety === "octopus";
  const TAU = Math.PI * 2, D = Math.PI / 180;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  const root = new THREE.Group();
  root.name = "squid";
  const space = new THREE.Group(); // uniform size scale
  space.name = "space";
  root.add(space);
  const body = new THREE.Group(); // authored frame, shifted so the rest bbox sits on y = 0 and centres on x, z
  body.name = "body";
  space.add(body);
  const joints = {};

  // ---------- live ring skins (fixed topology, positions rewritten per pose) ----------
  // set(rings, a, b): rings = R arrays of seg [x, y, z]; a / b the apex of the first / last cap.
  function live(name, R, seg, mats, groupOf = null, th = 0.35) {
    const n = R * seg + 2, idx = [], tri = [];
    for (let i = 0; i < R - 1; i++) for (let j = 0; j < seg; j++) {
      const a = i * seg + j, b = i * seg + ((j + 1) % seg), c = a + seg, d = b + seg;
      tri.push([a, b, c, i, j], [b, d, c, i, j]);
    }
    for (let j = 0; j < seg; j++) {
      tri.push([n - 2, (j + 1) % seg, j, 0, j]);
      tri.push([n - 1, (R - 1) * seg + j, (R - 1) * seg + ((j + 1) % seg), R - 2, j]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("hullNormal", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const buckets = [];
    for (const t of tri) (buckets[groupOf ? groupOf(t[3], t[4]) : 0] ??= []).push(t[0], t[1], t[2]);
    let start = 0;
    const flat = [];
    buckets.forEach((b = [], k) => { g.addGroup(start, b.length, k); start += b.length; flat.push(...b); });
    g.setIndex(flat);
    const mesh = kit.toon(g, mats[0][0], mats[0][1], { threshold: th });
    mesh.material = mats.map(([b, s]) => kit.cel(b, s, { threshold: th }));
    mesh.name = name;
    mesh.frustumCulled = false;
    mesh.children.forEach((h) => (h.frustumCulled = false));
    body.add(mesh);
    let flip = null;
    function set(rings, a, b) {
      const p = g.attributes.position.array;
      let k = 0;
      for (const r of rings) for (const q of r) { p[k++] = q[0]; p[k++] = q[1]; p[k++] = q[2]; }
      p.set(a, k); p.set(b, k + 3);
      if (flip === null) { // winding from the signed volume, decided once (ring handedness never changes)
        let v = 0;
        const ix = g.index.array;
        for (let i = 0; i < ix.length; i += 3) {
          const [u, w, z] = [ix[i] * 3, ix[i + 1] * 3, ix[i + 2] * 3];
          v += p[u] * (p[w + 1] * p[z + 2] - p[w + 2] * p[z + 1]) - p[u + 1] * (p[w] * p[z + 2] - p[w + 2] * p[z]) + p[u + 2] * (p[w] * p[z + 1] - p[w + 1] * p[z]);
        }
        flip = v < 0;
        if (flip) for (let i = 0; i < ix.length; i += 3) [ix[i + 1], ix[i + 2]] = [ix[i + 2], ix[i + 1]];
        g.index.needsUpdate = true;
      }
      g.attributes.position.needsUpdate = true;
      g.computeVertexNormals();
      g.attributes.hullNormal.array.set(g.attributes.normal.array); // seam-free rings: hull normal = normal
      g.attributes.hullNormal.needsUpdate = true;
      g.computeBoundingSphere();
      g.computeBoundingBox();
    }
    return { mesh, set };
  }
  const T = V(), N = V(), B = V(), tmp = V();
  // rings around a centreline (parallel transport from ref), radius r[i], section squash flat (along B)
  function tubeRings(pts, r, ref, seg, flat = 1) {
    const rings = [];
    N.copy(ref);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      T.subVectors(b, a).normalize();
      N.addScaledVector(T, -N.dot(T)).normalize();
      B.crossVectors(T, N);
      const ring = [];
      for (let j = 0; j < seg; j++) {
        const t = (j / seg) * TAU, c = Math.cos(t) * r[i], s = Math.sin(t) * r[i] * flat;
        ring.push([pts[i].x + N.x * c + B.x * s, pts[i].y + N.y * c + B.y * s, pts[i].z + N.z * c + B.z * s]);
      }
      rings.push(ring);
    }
    return rings;
  }

  // ---------- state set by pose() ----------
  const S = { pulse: 0, finA: 0, finPh: 0, finK: 0, arm: [], breathe: 0 };

  // ---------- MANTLE ----------
  // squid: tip z -0.235, collar z +0.025; octopus: an egg sac above and behind the head
  const MZ = OCTO ? [-0.105, -0.095, -0.075, -0.05, -0.02, 0.005, 0.02, 0.028] : [-0.235, -0.215, -0.18, -0.13, -0.07, -0.02, 0.01, 0.025];
  const MR = OCTO ? [0.009, 0.026, 0.037, 0.042, 0.041, 0.034, 0.025, 0.02] : [0.003, 0.012, 0.021, 0.029, 0.0335, 0.0345, 0.0335, 0.032];
  const MRING = 22, MSEG = 16;
  const lerpTab = (Z, R, z) => {
    if (z <= Z[0]) return R[0];
    for (let i = 1; i < Z.length; i++) if (z <= Z[i]) { const f = (z - Z[i - 1]) / (Z[i] - Z[i - 1]), e = (1 - Math.cos(Math.PI * f)) / 2; return R[i - 1] + (R[i] - R[i - 1]) * e; }
    return R[R.length - 1];
  };
  // octopus sac axis: tilted 35 deg up-back from the head, centre lifted
  const SAC_TILT = 25 * D, SAC_Y = 0.045;
  const mz = (i) => MZ[0] + (MZ[MZ.length - 1] - MZ[0]) * (0.5 - 0.5 * Math.cos(Math.PI * i / (MRING - 1)));
  function mantlePoint(z, t, out) { // surface point at station z, angle t (0 = +X, 90 deg = dorsal)
    const L = MZ[MZ.length - 1] - MZ[0], u = (z - MZ[0]) / L;
    const sq = 1 - S.pulse * 0.22 * Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 0.7 + S.breathe * Math.sin(Math.PI * u);
    const r = lerpTab(MZ, MR, z) * sq;
    const x = r * Math.cos(t), y = r * Math.sin(t) * (OCTO ? 1 : 0.94);
    if (!OCTO) return out.set(x, y, z);
    // tilt: local z runs back and up
    return out.set(x, SAC_Y + y * Math.cos(SAC_TILT) - z * Math.sin(SAC_TILT), y * Math.sin(SAC_TILT) + z * Math.cos(SAC_TILT));
  }
  const mantle = live("mantle", MRING, MSEG, [[C.body, C.bodyShade], [C.belly, C.bellyShade]].map((p, k) => (OCTO ? [[C.octo, C.octoShade], [C.octo, C.octoShade]][k] : p)),
    (i, j) => { const t = ((j + 0.5) / MSEG) * TAU; return Math.sin(t) < -0.55 ? 1 : 0; });
  function setMantle() {
    const rings = [];
    for (let i = 0; i < MRING; i++) {
      const z = mz(i), ring = [];
      for (let j = 0; j < MSEG; j++) { mantlePoint(z, (j / MSEG) * TAU, tmp); ring.push([tmp.x, tmp.y, tmp.z]); }
      rings.push(ring);
    }
    const tip = OCTO ? mantlePoint(MZ[0] - 0.006, 0, V()).setX(0) : V(0, 0, MZ[0] - 0.004);
    if (OCTO) { tip.set(0, SAC_Y - (MZ[0] - 0.006) * Math.sin(SAC_TILT), (MZ[0] - 0.006) * Math.cos(SAC_TILT)); }
    const top = MZ[MZ.length - 1];
    const cap = OCTO ? [0, SAC_Y - top * Math.sin(SAC_TILT), top * Math.cos(SAC_TILT)] : [0, 0, top - 0.004];
    mantle.set(rings, [tip.x, tip.y, tip.z], cap);
  }

  // ---------- speckle decals on the mantle (z, theta deg, radius m) ----------
  const SPOTS = OCTO
    ? [[-0.06, 70, 0.006], [-0.03, 110, 0.007], [-0.08, 120, 0.005], [-0.02, 40, 0.005], [-0.05, 150, 0.006], [-0.085, 50, 0.0045]]
    : [[-0.12, 80, 0.0055], [-0.085, 112, 0.0065], [-0.05, 72, 0.006], [-0.02, 105, 0.0075], [-0.15, 100, 0.0045],
      [-0.06, 140, 0.005], [-0.03, 45, 0.005], [-0.1, 40, 0.0045], [-0.11, 135, 0.0045], [0.005, 70, 0.0055], [-0.17, 70, 0.0035]];
  const spots = SPOTS.map(([z, a, r], k) => {
    const m = kit.toon(new THREE.CircleGeometry(r, 10), C.spot, C.spotShade, { outline: false });
    if (OCTO) m.material = kit.cel(C.octoShade, C.octoShade);
    m.name = "spot" + k;
    body.add(m);
    return { m, z, t: a * D, r };
  });
  const p0 = V(), p1 = V(), p2 = V(), nrm = V(), Z1 = V(0, 0, 1);
  function setSpots() {
    for (const s of spots) {
      mantlePoint(s.z, s.t, p0); mantlePoint(s.z + 0.002, s.t, p1); mantlePoint(s.z, s.t + 0.05, p2);
      nrm.crossVectors(p1.sub(p0), p2.sub(p0)).normalize(); // outward for this winding of (z, theta)
      if (nrm.dot(tmp.copy(p0).setZ(OCTO ? p0.z : 0).sub(OCTO ? V(0, SAC_Y, 0) : V(0, 0, 0))) < 0) nrm.negate();
      s.m.position.copy(p0).addScaledVector(nrm, 0.0003);
      s.m.quaternion.setFromUnitVectors(Z1, nrm);
      s.m.scale.set(1, OCTO ? 1 : 1.35, 1);
    }
  }

  // ---------- FINS (squid only): one flat arrowhead loft through the mantle tip ----------
  const FZ0 = -0.238, FZ1 = -0.128, FMAX = -0.172, FSPAN = 0.068, FH = 0.0028, FRING = 12, FSEG = 12;
  const finW = (z) => (z < FMAX ? FSPAN * ((z - FZ0) / (FMAX - FZ0)) ** 0.9 : FSPAN * (1 - ((z - FMAX) / (FZ1 - FMAX)) ** 1.25));
  const fins = OCTO ? null : live("fins", FRING, FSEG, [[C.fin, C.finShade]], null, -0.15);
  function setFins() {
    if (!fins) return;
    const rings = [];
    for (let i = 0; i < FRING; i++) {
      const z = FZ0 + (FZ1 - FZ0) * ((i + 0.5) / FRING), w = Math.max(finW(z), 0.002), ring = [];
      for (let j = 0; j < FSEG; j++) {
        const t = (j / FSEG) * TAU, x = w * Math.cos(t), e = Math.abs(x) / FSPAN;
        const y = FH * Math.sin(t) * (1 - 0.6 * (Math.abs(x) / w) ** 2) + S.finA * e ** 1.3 * Math.sin(S.finPh - S.finK * (z - FZ0) + (x > 0 ? 0 : 0.6));
        ring.push([x, y + 0.002 + 0.2 * Math.max(0, Math.abs(x) - 0.012), z]);
      }
      rings.push(ring);
    }
    fins.set(rings, [0, 0.002, FZ0 - 0.002], [0, 0.002, FZ1 + 0.002]);
  }

  // ---------- HEAD (static) ----------
  const HZ = OCTO ? [-0.002, 0.012, 0.028, 0.042, 0.052] : [0.012, 0.03, 0.05, 0.068, 0.082, 0.09];
  const HR = OCTO ? [0.024, 0.03, 0.03, 0.024, 0.016] : [0.0255, 0.0275, 0.0285, 0.024, 0.0175, 0.012];
  const HY = OCTO ? 0.02 : 0;
  {
    const R = 10, SEG = 14, rings = [];
    for (let i = 0; i < R; i++) {
      const z = HZ[0] + (HZ[HZ.length - 1] - HZ[0]) * (i / (R - 1)), r = lerpTab(HZ, HR, z), ring = [];
      for (let j = 0; j < SEG; j++) { const t = (j / SEG) * TAU; ring.push([r * Math.cos(t), HY + r * Math.sin(t) * 0.92, z]); }
      rings.push(ring);
    }
    const head = live("head", R, SEG, OCTO ? [[C.octo, C.octoShade], [C.sucker, C.suckerShade]] : [[C.body, C.bodyShade], [C.belly, C.bellyShade]],
      (i, j) => (Math.sin(((j + 0.5) / SEG) * TAU) < -0.55 && !OCTO ? 1 : 0));
    head.set(rings, [0, HY, HZ[0] - 0.003], [0, HY, HZ[HZ.length - 1] + 0.004]);
    head.mesh.name = "headSkin";
  }
  const headJ = new THREE.Group();
  headJ.name = "head";
  headJ.position.set(0, HY, OCTO ? 0.026 : 0.05);
  body.add(headJ);
  joints.head = headJ;
  // eyes: big, on the flanks, facing out and a little forward and up
  const ER = OCTO ? 0.0115 : 0.0125, EX = OCTO ? 0.022 : 0.0225, EY = OCTO ? 0.021 : 0.004;
  for (const sx of [1, -1]) {
    const k = sx > 0 ? "L" : "R", eye = new THREE.Group();
    eye.name = "eye" + k;
    eye.position.set(sx * EX, EY, OCTO ? 0.01 : 0);
    eye.quaternion.setFromUnitVectors(Z1, OCTO ? V(sx * 0.6, 0.4, 0.7).normalize() : V(sx * 0.9, 0.2, 0.38).normalize());
    headJ.add(eye);
    joints["eye" + k] = eye;
    const ball = kit.toon(new THREE.SphereGeometry(ER, 12, 8), C.eye, C.eyeShade, { threshold: -0.1 });
    ball.scale.set(1, 1, 0.6);
    eye.add(ball);
    const pupil = kit.toon(new THREE.SphereGeometry(ER * 0.72, 10, 6), C.pupil, C.pupil, { outline: false });
    pupil.scale.set(OCTO ? 1 : 1, OCTO ? 0.55 : 1, 0.3);
    pupil.position.z = ER * 0.6 - ER * 0.72 * 0.3 + 0.0005;
    eye.add(pupil);
    const glint = kit.toon(new THREE.SphereGeometry(ER * 0.24, 8, 5), C.glint, C.glint, { outline: false });
    glint.scale.set(1, 1, 0.3);
    glint.position.set(ER * 0.25, ER * 0.3, ER * 0.6 + 0.0004);
    eye.add(glint);
  }

  // ---------- ARMS and TENTACLES ----------
  // def: base B, basis f (forward), u (pitch side), w (yaw side), length L, base radius r0, tentacle flag, phase psi
  const AZ = 0.084, defs = [];
  if (!OCTO) {
    // pairs I (dorsal) .. IV (ventral) by angle from +X (90 = dorsal); tentacles between III and IV
    const pairs = [[67.5, 0.09, 0.0050], [22.5, 0.108, 0.0054], [-22.5, 0.124, 0.0056], [-67.5, 0.114, 0.0056]];
    for (const [a, L, r0] of pairs) for (const sx of [1, -1]) {
      const ang = (sx > 0 ? a : 180 - a) * D, u = V(Math.cos(ang), Math.sin(ang) * 0.94, 0), w = V(-Math.sin(ang), Math.cos(ang), 0);
      defs.push({ name: `arm${defs.length + 1}`, B: V(u.x * 0.0075, u.y * 0.0075, AZ), f: V(0, 0, 1), u, w, L, r0, tent: false, psi: defs.length * 0.9, side: sx });
    }
    for (const sx of [1, -1]) {
      const ang = (sx > 0 ? -45 : 225) * D, u = V(Math.cos(ang), Math.sin(ang), 0), w = V(-Math.sin(ang), Math.cos(ang), 0);
      defs.push({ name: sx > 0 ? "tentacleL" : "tentacleR", B: V(u.x * 0.005, u.y * 0.005, AZ - 0.008), f: V(0, 0, 1), u, w, L: 0.215, r0: 0.0028, tent: true, psi: sx > 0 ? 0 : 1.3, side: sx });
    }
  } else {
    // eight arms out of the crown under the head, spread on the ground (u = +Y lifts)
    for (let k = 0; k < 8; k++) {
      const a = (k + 0.5) / 8 * TAU, f = V(Math.sin(a), 0, Math.cos(a)), w = V(Math.cos(a), 0, -Math.sin(a));
      const L = 0.15 + 0.02 * Math.sin(k * 2.1);
      defs.push({ name: `arm${k + 1}`, B: V(f.x * 0.012, 0.012, 0.022 + f.z * 0.012), f, u: V(0, 1, 0), w, L, r0: 0.0095, tent: false, psi: k * 1.1, side: f.x >= 0 ? 1 : -1 });
    }
  }
  const ASTEP = OCTO ? 16 : 12, ASEG = 6, TSTEP = 22;
  for (const d of defs) {
    const R = d.tent ? TSTEP : ASTEP;
    d.R = R;
    const mats = OCTO ? [[C.octo, C.octoShade], [C.sucker, C.suckerShade]] : [[C.arm, C.armShade]];
    // octopus sucker band: the ring faces on the -u side, every other ring, out of the first 10 % (hidden in the crown)
    d.skin = live(d.name, R, ASEG, mats, OCTO ? (i, j) => (i > 1 && i % 2 === 0 && Math.abs(j + 0.5 - ASEG * 0.5) < 1.2 ? 1 : 0) : null);
    const j = new THREE.Group();
    j.name = d.name;
    j.position.copy(d.B);
    body.add(j);
    joints[d.name] = j;
  }
  const radius = (d, q, st) => {
    if (!d.tent) return Math.max(d.r0 * (1 - 0.9 * q ** 1.1), 0.0005);
    const club = smooth(0.7, 0.8, q) * (1 - smooth(0.9, 1, q));
    return Math.max(d.r0 * (1 - 0.2 * q) + 0.0024 * club * st.clubR, 0.0006 + 0.0028 * (1 - smooth(0.93, 1, q)));
  };
  function setArm(d, st) {
    const L = d.L * (st.stretch ?? 1), n = d.R, pts = [], r = [];
    const p = d.B.clone(), dir = V();
    for (let i = 0; i < n; i++) {
      const q = i / (n - 1), s = q * L;
      const al = st.splay + st.curl * q ** 2 + st.tip * smooth(0.45, 1, q) ** 1.5 + st.wa * q * Math.sin(st.ph - st.k * q + d.psi);
      const be = 1.5 * st.yaw * q + st.wb * q * Math.sin(st.ph * 0.5 + 1.7 - st.k * q + d.psi * 1.3);
      if (i > 0) {
        dir.copy(d.f).multiplyScalar(Math.cos(al) * Math.cos(be)).addScaledVector(d.u, Math.sin(al)).addScaledVector(d.w, Math.cos(al) * Math.sin(be));
        p.addScaledVector(dir, L / (n - 1));
      }
      pts.push(p.clone());
      r.push(radius(d, q, st));
    }
    if (OCTO) for (const q of pts) q.y = Math.max(q.y, r[pts.indexOf(q)] * 0.8); // lie on the ground, never through it
    const rings = tubeRings(pts, r, d.u, ASEG, OCTO ? 0.8 : 1);
    const tdir = pts[n - 1].clone().sub(pts[n - 2]).normalize();
    const tip = pts[n - 1].clone().addScaledVector(tdir, r[n - 1] * 0.8);
    const base = pts[0].clone().addScaledVector(pts[1].clone().sub(pts[0]).normalize(), -r[0] * 0.6);
    d.skin.set(rings, [base.x, base.y, base.z], [tip.x, tip.y, tip.z]);
  }

  // ---------- poses and clips ----------
  // Arm state per arm: splay / curl / tip (rad, alpha terms), wa / wb wave amplitudes (rad), k wave number over the arm,
  // ph phase, yaw (beta offset), stretch (length factor), clubR (club swelling, tentacles).
  const REST_ARM = OCTO ? { splay: -0.1, curl: 0, tip: 3.4, wa: 0, wb: 0, k: 0, ph: 0, yaw: 0, stretch: 1, clubR: 1 }
    : { splay: 0.3, curl: -0.3, tip: 0.25, wa: 0, wb: 0, k: 0, ph: 0, yaw: 0, stretch: 1, clubR: 1 };
  const REST_TENT = { ...REST_ARM, splay: 0.06, curl: -0.12, tip: 0.05 };
  const clips = { swim: 1.2, idle: 3.0, grab: 1.0 };
  const HELD = { swim: "swim@0.25", idle: "idle@0.75", grab: "grab@0.42" };
  function apply(clip, t) {
    S.pulse = 0; S.breathe = 0; S.finA = 0; S.finPh = 0; S.finK = 0;
    const arm = defs.map((d) => { const a = { ...(d.tent ? REST_TENT : REST_ARM), yaw: OCTO ? 0.75 * Math.sin(d.psi * 2.3) : 0 }; if (!d.tent) a.tip += 0.3 * Math.sin(d.psi * 1.9); return a; });
    if (clip === "swim") {
      // jet: fast contraction over the first 30 %, slow refill; arms gather and trail on the jet, flare on the refill
      const u = ((t % clips.swim) + clips.swim) % clips.swim / clips.swim, ph = TAU * u;
      const jet = u < 0.3 ? Math.sin((Math.PI / 2) * (u / 0.3)) : Math.cos((Math.PI / 2) * ((u - 0.3) / 0.7)) ** 2;
      S.pulse = jet;
      S.finA = OCTO ? 0 : 0.006; S.finPh = ph * 2; S.finK = 60;
      arm.forEach((a, i) => {
        const d = defs[i];
        // octopus: the curls straighten on the jet and wind back up on the refill
        a.splay = OCTO ? -0.1 : 0.32 - 0.42 * jet;
        a.curl = OCTO ? 0.1 * jet : -0.3 + 0.18 * jet;
        a.tip = OCTO ? a.tip - 2.4 * jet : 0.25 - 0.15 * jet;
        a.wa = 0.16; a.k = 3.2; a.ph = ph - 0.9; a.wb = 0.08;
        if (d.tent) { a.splay = 0.08 - 0.1 * jet; a.curl = -0.08; a.tip = 0.1; a.wa = 0.1; }
      });
    } else if (clip === "idle") {
      const u = ((t % clips.idle) + clips.idle) % clips.idle / clips.idle, ph = TAU * u;
      S.breathe = 0.035 * Math.sin(ph * 2);
      S.finA = OCTO ? 0 : 0.0055; S.finPh = ph * 3; S.finK = 75;
      arm.forEach((a, i) => {
        const d = defs[i];
        a.splay += 0.06 * Math.sin(ph + d.psi);
        a.wa = OCTO ? 0.3 : 0.2; a.wb = OCTO ? 0.25 : 0.14; a.k = 2.6; a.ph = ph;
        a.tip += (OCTO ? 0.5 : 0.35) * (0.5 + 0.5 * Math.sin(ph * 2 + d.psi * 1.7));
        if (d.tent) { a.wa = 0.12; a.tip = 0.12 + 0.2 * (0.5 + 0.5 * Math.sin(ph + d.psi)); }
      });
    } else if (clip === "grab") {
      // arms open 0-0.25, tentacles shoot out 0.15-0.42, clubs hook 0.42-0.6, reel in 0.6-1, arms close round the catch
      const u = Math.min(1, Math.max(0, t / clips.grab));
      const open = smooth(0, 0.22, u) * (1 - smooth(0.55, 0.95, u));
      const shoot = smooth(0.15, 0.42, u), reel = smooth(0.6, 1, u), hook = smooth(0.4, 0.6, u);
      S.finA = OCTO ? 0 : 0.004 * (1 - u); S.finPh = TAU * 2 * u; S.finK = 60;
      S.pulse = 0.4 * smooth(0.05, 0.2, u) * (1 - smooth(0.3, 0.5, u));
      arm.forEach((a, i) => {
        const d = defs[i];
        if (d.tent || (OCTO && (i === 0 || i === 7))) {
          // octopus: the front pair lifts, reaches forward level, hooks down on the catch and curls it back in
          a.splay = OCTO ? -0.1 + 0.55 * shoot * (1 - reel) : 0.06 - 0.03 * shoot;
          a.curl = OCTO ? -0.65 * shoot * (1 - reel) : -0.12 + 0.12 * shoot;
          a.tip = OCTO ? a.tip * (1 - shoot) - 1.0 * hook * (1 - reel) + 3.0 * reel : 0.05 - 0.9 * hook * (1 - 0.5 * reel);
          a.stretch = 1 + (OCTO ? 0.2 : 0.45) * shoot - (OCTO ? 0.2 : 0.4) * reel;
          a.clubR = 1 + 0.3 * hook;
          a.yaw = OCTO ? a.yaw * (1 - shoot) - d.side * 0.3 * shoot : 0;
        } else {
          a.splay += (OCTO ? 0.25 : 0.45) * open - (OCTO ? 0.2 : 0.18) * reel;
          a.curl -= (OCTO ? 0 : 0.5) * reel;
          a.tip += (OCTO ? -0.6 * open : 0.2 * open) + (OCTO ? 0.4 : 0.9) * reel;
        }
      });
    }
    S.arm = arm;
    setMantle();
    setSpots();
    setFins();
    defs.forEach((d, i) => setArm(d, arm[i]));
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    if (name in HELD) name = HELD[name];
    const m = /^(swim|idle|grab)@(-?[\d.]+)$/.exec(name);
    if (m) return apply(m[1], +m[2]);
    if (name !== "rest") throw new Error(`squid: no pose "${name}" (poses: ${meta.poses.join(", ")}; clips: swim@s, idle@s, grab@s)`);
    apply(null, 0);
  }

  // rest bbox -> lowest point on y = 0, centred on x and z, then size
  apply(null, 0);
  const box = new THREE.Box3().setFromObject(body, true);
  body.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  const restH = box.max.y - box.min.y, restL = box.max.z - box.min.z;
  space.scale.setScalar(opts.height ? opts.height / restH : opts.length ? opts.length / restL : 1);
  pose("rest");
  return { root, joints, pose, clips };
}
