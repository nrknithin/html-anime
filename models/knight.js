// knight.js — a Gothic knight in full plate (sallet + bevor), arming sword in the right hand, heater shield on the
// left forearm. Follows the model-lab contract (harness/lab/README.md): no imports, no clock, no randomness.
//
// Construction strategy
//   * One primitive does almost everything: loft(rings), a closed tube through superellipse cross-sections.
//     A ring is { y, w, f, b, p, x, z, ridge, drop, lift, bend }: half-width w (x), front reach f (+z), back reach b (-z),
//     superellipse power p (2 = ellipse, 1 = diamond, 4 = rounded box), a centre offset (x, z), a medial ridge on the
//     front, a drop that lowers the back of the ring (sallet tail), a lift that peaks the front centre (plackart)
//     and a bend that curves the section (shield).
//     The winding is fixed automatically from the signed volume, so a loft never renders inside-out.
//   * shell(profile, t) = a lathe with real thickness: the outer profile, then the same profile offset inward,
//     joined into one closed loop. Plates (pauldrons, couters, poleyns) are closed solids, never open shells,
//     so the ink hull never shows through their insides.
//   * Lames are overlapping shingles: each lower lame is a little wider than the bottom of the one above, so the
//     hull of the upper lame draws a seam where its rim faces away from the camera (fauld, pauldron, sabaton).
//     The hull cannot ink an edge that faces the camera, so key seams (plackart point, fauld lames) also get
//     seam(ring): an outline-free ink band copied from the plate's own edge ring, grown 1-2 mm.
//   * Every plate is parented to the joint it rides on, so the armour stays attached in every pose. The sword has
//     its own joint in the right fist; the shield is strapped across the left forearm (shield-up = forearm +Z), so
//     it stays upright whenever the forearm is level (rest carry, guard).
//
// Proportions (H = 1.80 m to the sallet crown, h = head unit 0.24 m, 7.5 heads; Met 04.3.293 Gothic harness)
//   shoulder line 1.51 (1.2 h below the crown), pauldron span 0.58 (2.4 h), breastplate 0.36 wide x 0.31 deep,
//   waist/fauld 1.04, crotch 0.86, knee 0.52, ankle 0.10, sabaton 0.44 long with a pointed toe,
//   sword 1.1 (blade 0.88), heater shield 0.62 x 0.46. ~10.7k triangles at rest.
//
// Two-tone pairs, all from the "indigo" script (Indigo moon). Shared shade = sky, so every shadow is one moonlit blue:
//   steel    moon #d5e2ff / sky #1b2d6b        polished plate: pale lit side, deep blue shadow
//   under    hair #16141c / ink #101628        mail, arming doublet, the gaps between plates
//   leather  iris #e7a04a / hair #16141c       straps, sword grip
//   gold     practical #f0c36a / iris #e7a04a  hilt, buckle, shield cross
//   cloth    accent #e23b4a / sky #1b2d6b      shield field, plume: the one hot colour
//   slit     ink #101628                       visor slit and seam bands (no hull)
// Thresholds: steel 0.45 (more shade = polished-metal bands), blade 0.3 (one bevel lit), shield field 0.05 (stays red
// even when it faces the camera, away from the light).

export const meta = {
  name: "knight",
  height: 1.8,
  script: "indigo",
  colors: {
    steel: "#d5e2ff",
    steelShade: "#1b2d6b",
    under: "#16141c",
    underShade: "#101628",
    leather: "#e7a04a",
    leatherShade: "#16141c",
    gold: "#f0c36a",
    goldShade: "#e7a04a",
    cloth: "#e23b4a",
    clothShade: "#1b2d6b",
    slit: "#101628",
  },
  poses: ["rest", "guard", "strike"],
};

// Joint rotations in degrees [rx, ry, rz], absolute. The model faces +Z, its left is +X.
// A hanging limb points down -Y: -rx swings it forward, +rz swings it toward +X.
// rest: right hand on the planted sword (sword joint 145 = 90 + 55: cancels the shoulder + elbow angles so the
// blade points straight down; rz 90 turns the guard across the body), shield carried on the level left forearm.
const REST = {
  pelvis: [0, 0, 0], spine: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0],
  shoulderL: [8, 25, 8], elbowL: [-95, 0, 0], wristL: [0, 0, 0],
  shoulderR: [-20, 0, 0], elbowR: [-35, 0, 0], wristR: [0, 0, 0], sword: [145, 0, 90],
  hipL: [0, 10, 2], kneeL: [0, 0, 0], ankleL: [0, 0, -2], // ry splays the pointed sabatons outward
  hipR: [0, -10, -2], kneeR: [0, 0, 0], ankleR: [0, 0, 2],
};
const POSES = {
  rest: {},
  // guard: left foot forward, knees bent, shield square in front of the chest, sword forward and up past it.
  // Leg angles are solved so both soles stay on y = 0: drop = 0.38 cos(hip) + 0.42 cos(hip + knee) = 0.747 m,
  // ankle = -(hip + knee) keeps the sole flat. Shield: the shoulder twist (ry -80) lays the forearm across the
  // chest and the elbow twist (ry +60) turns the shield face forward.
  guard: {
    pelvis: [0, -6, 0], spine: [6, 2, 0], chest: [4, 2, 0], neck: [0, 2, 0], head: [-6, 2, 0],
    hipL: [-30, 8, 6], kneeL: [25, 0, 0], ankleL: [5, 0, -6],
    hipR: [18, -12, -6], kneeR: [2, 0, 0], ankleR: [-20, 0, 6],
    shoulderL: [-60, -80, 0], elbowL: [-90, 60, 0], wristL: [0, 0, 0],
    shoulderR: [-30, 0, -12], elbowR: [-60, 0, 0], wristR: [0, 0, 0], sword: [62, 0, 0],
  },
  // strike: deep lunge (drop 0.687 m), torso wound up, sword raised overhead with the blade rising up-back above
  // the helmet (so it clears the head silhouette from the front), shield held forward.
  strike: {
    pelvis: [0, -12, 0], spine: [-4, 6, 0], chest: [-6, 6, 0], neck: [0, 0, 0], head: [-4, 0, 0],
    hipL: [-45, 6, 7], kneeL: [50, 0, 0], ankleL: [-5, 0, -7],
    hipR: [25, -10, -7], kneeR: [6, 0, 0], ankleR: [-31, 0, 7],
    shoulderL: [-50, -70, 0], elbowL: [-70, 50, 0], wristL: [0, 0, 0],
    shoulderR: [-160, 0, -22], elbowR: [-30, 0, 0], wristR: [0, 0, 0], sword: [50, 0, 0],
  },
};
const LIFT = { rest: 0.002, guard: -0.045, strike: -0.102 }; // pelvis height offset per pose (m), for crouches
const DEG = Math.PI / 180;
const SHX = 0.2; // shoulder joint half-spacing
const GEAR = true; // false = bare harness (no sword, no shield): used to fit the body over the museum photos

export function build(THREE, kit, colors = meta.colors) {
  const c = colors;
  const TAU = Math.PI * 2;
  const root = new THREE.Group();
  root.name = "knight";
  const joints = {};

  // ---------- geometry helpers ----------
  function orient(g) {
    // flip the winding if the signed volume is negative (inside-out)
    const p = g.attributes.position, ix = g.index.array;
    let v = 0;
    for (let i = 0; i < ix.length; i += 3) {
      const [a, b, d] = [ix[i] * 3, ix[i + 1] * 3, ix[i + 2] * 3], q = p.array;
      v += q[a] * (q[b + 1] * q[d + 2] - q[b + 2] * q[d + 1]) - q[a + 1] * (q[b] * q[d + 2] - q[b + 2] * q[d]) + q[a + 2] * (q[b] * q[d + 1] - q[b + 1] * q[d]);
    }
    if (v < 0) for (let i = 0; i < ix.length; i += 3) [ix[i + 1], ix[i + 2]] = [ix[i + 2], ix[i + 1]];
    return g;
  }
  function loft(rings, { seg = 20, flat = false, loop = false } = {}) {
    const pos = [], idx = [], R = rings.length;
    for (const r of rings) {
      const e = 2 / (r.p ?? 2), w = Math.max(r.w, 1e-4);
      for (let i = 0; i < seg; i++) {
        const t = (i / seg) * TAU, co = Math.cos(t), si = Math.sin(t);
        const x = w * Math.sign(co) * Math.abs(co) ** e;
        let z = (si >= 0 ? r.f : r.b) * Math.sign(si) * Math.abs(si) ** e;
        if (r.ridge && si > 0) z += r.ridge * si * Math.exp(-12 * (x / w) ** 2);
        if (r.bend) z -= r.bend * x * x;
        let y = r.y;
        if (r.drop && z < 0) y += r.drop * (-z / r.b) ** 1.5;
        if (r.lift && z > 0) y += r.lift * Math.max(0, 1 - Math.abs(x) / w) ** 1.5;
        pos.push(x + (r.x ?? 0), y, z + (r.z ?? 0));
      }
    }
    const last = loop ? R : R - 1;
    for (let k = 0; k < last; k++) {
      const k2 = (k + 1) % R;
      for (let i = 0; i < seg; i++) {
        const a = k * seg + i, b = k * seg + ((i + 1) % seg), cc = k2 * seg + i, d = k2 * seg + ((i + 1) % seg);
        idx.push(a, b, cc, b, d, cc);
      }
    }
    if (!loop) {
      for (const [k, dir] of [[0, 1], [R - 1, -1]]) {
        const base = pos.length / 3;
        let cx = 0, cy = 0, cz = 0;
        for (let i = 0; i < seg; i++) {
          const j = (k * seg + i) * 3;
          pos.push(pos[j], pos[j + 1], pos[j + 2]);
          cx += pos[j] / seg; cy += pos[j + 1] / seg; cz += pos[j + 2] / seg;
        }
        pos.push(cx, cy, cz);
        const ctr = base + seg;
        for (let i = 0; i < seg; i++) {
          const a = base + i, b = base + ((i + 1) % seg);
          if (dir > 0) idx.push(ctr, b, a); else idx.push(ctr, a, b);
        }
      }
    }
    let g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    orient(g);
    if (flat) g = g.toNonIndexed();
    g.computeVertexNormals();
    return g;
  }
  // Lathe with thickness: profile [[r, y], ...] from the top down, offset inward by t, one closed loop.
  function shell(pts, t, { seg = 20, sx = 1, sz = 1, p = 2 } = {}) {
    const n = pts.length, out = [], inn = [];
    for (let i = 0; i < n; i++) {
      const [r0, y0] = pts[Math.max(i - 1, 0)], [r1, y1] = pts[Math.min(i + 1, n - 1)];
      const dr = r1 - r0, dy = y1 - y0, l = Math.hypot(dr, dy) || 1;
      const [nr, ny] = [-dy / l, dr / l];
      const [r, y] = pts[i];
      out.push({ y, w: r * sx, f: r * sz, b: r * sz, p });
      const ri = Math.max(r - t * nr, 1e-4);
      inn.push({ y: y - t * ny, w: ri * sx, f: ri * sz, b: ri * sz, p });
    }
    return loft([...out, ...inn.reverse()], { seg, loop: true });
  }

  // ---------- rig helpers ----------
  const world = {}; // rest (build-time, unrotated) world position of each joint
  const joint = (name, parent, x, y, z) => {
    const g = new THREE.Group();
    g.name = name;
    const pw = parent === root ? [0, 0, 0] : world[parent.name];
    g.position.set(x - pw[0], y - pw[1], z - pw[2]); // joints are given in world coordinates
    world[name] = [x, y, z];
    parent.add(g);
    joints[name] = g;
    return g;
  };
  // put a mesh on a joint at WORLD build-pose coordinates
  const put = (j, mesh, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const w = world[j.name];
    mesh.position.set(x - w[0], y - w[1], z - w[2]);
    mesh.rotation.set(rx, ry, rz);
    j.add(mesh);
    return mesh;
  };
  const steel = (g, o) => kit.toon(g, c.steel, c.steelShade, { threshold: 0.45, ...o });
  const under = (g, o) => kit.toon(g, c.under, c.underShade, o);
  const ring = (y, w, f, b, extra = {}) => ({ y, w, f, b, ...extra });
  const circ = (y, r, extra = {}) => ({ y, w: r, f: r, b: r, ...extra });
  // Seam line: the inverted hull only inks silhouettes, so a plate edge that faces the camera gets no line.
  // A seam is a thin ink band (no hull) copied from a plate's edge ring, grown by e and extruded down by dy.
  const seam = (r, dy = 0.007, e = 0.0025, seg = 24) => {
    const g = (y) => ({ ...r, y, w: r.w + e, f: r.f + e, b: r.b ? r.b + e : 0 });
    return kit.toon(loft([g(r.y), g(r.y - dy)], { seg }), c.slit, c.slit, { outline: false });
  };

  // ---------- trunk ----------
  const pelvis = joint("pelvis", root, 0, 0.96, 0);
  const spine = joint("spine", pelvis, 0, 1.04, 0);
  const chest = joint("chest", spine, 0, 1.24, 0);
  const neck = joint("neck", chest, 0, 1.5, -0.01);
  const head = joint("head", neck, 0, 1.57, 0);

  // mail brief between the legs (dark), seen in the crotch gap
  put(pelvis, under(loft([ring(1.0, 0.15, 0.12, 0.11), ring(0.92, 0.14, 0.11, 0.1), ring(0.86, 0.085, 0.07, 0.07), ring(0.83, 0.03, 0.03, 0.03)], { seg: 16 })));
  // fauld: three overlapping lames, each wider at the bottom
  for (let k = 0; k < 3; k++) {
    const top = 1.06 - k * 0.045, bot = top - 0.06, s = k * 0.012;
    const lameBot = ring(bot, 0.168 + s, 0.152 + s, 0.132 + s, { p: 2.2 });
    put(pelvis, steel(loft([ring(top, 0.148 + s, 0.136 + s, 0.12 + s, { p: 2.2 }), lameBot], { seg: 24 })));
    put(pelvis, seam({ ...lameBot, y: bot + 0.008 }, 0.006, 0.001));
  }
  // cuirass: breastplate + backplate as one loft, globose with a medial ridge, pinched at the waist
  put(chest, steel(loft([
    ring(1.03, 0.15, 0.135, 0.118, { p: 2.2 }),
    ring(1.08, 0.142, 0.14, 0.112, { p: 2.2 }),
    ring(1.16, 0.158, 0.168, 0.118, { p: 2.3, ridge: 0.012 }),
    ring(1.25, 0.178, 0.185, 0.125, { p: 2.4, ridge: 0.014 }),
    ring(1.34, 0.19, 0.178, 0.13, { p: 2.5, ridge: 0.008 }),
    ring(1.41, 0.185, 0.155, 0.13, { p: 2.5 }),
    ring(1.46, 0.15, 0.12, 0.12, { p: 2.2 }),
    ring(1.49, 0.08, 0.07, 0.08),
  ], { seg: 28 })));
  // plackart: the Gothic lower breastplate, rising to a point at the sternum; a front-only shell (b = 0) just proud
  // of the cuirass, so its hull draws the pointed seam across the torso
  const plackTop = ring(1.17, 0.168, 0.18, 0.0, { p: 2.3, ridge: 0.02, lift: 0.085 });
  put(chest, steel(loft([ring(1.035, 0.158, 0.146, 0.0, { p: 2.2 }), ring(1.1, 0.152, 0.156, 0.0, { p: 2.25 }), plackTop], { seg: 28 })));
  put(chest, seam(plackTop, 0.008, 0.002, 28));
  // bevor: chin-and-throat defence strapped to the breastplate (rides the chest, so the head turns inside it)
  put(chest, steel(loft([
    ring(1.43, 0.13, 0.15, 0.1), ring(1.5, 0.105, 0.145, 0.085, { ridge: 0.008 }), ring(1.56, 0.095, 0.135, 0.07, { ridge: 0.008 }),
    ring(1.6, 0.085, 0.12, 0.05), ring(1.615, 0.05, 0.07, 0.03),
  ], { seg: 24 })));

  // sword belt: a leather band over the waist, gold buckle
  put(pelvis, kit.toon(loft([ring(1.05, 0.162, 0.152, 0.132, { p: 2.2 }), ring(1.02, 0.166, 0.156, 0.136, { p: 2.2 })], { seg: 24 }), c.leather, c.leatherShade));
  put(pelvis, kit.toon(new THREE.BoxGeometry(0.045, 0.04, 0.012), c.gold, c.goldShade), 0, 1.035, 0.158);

  // ---------- head: sallet ----------
  put(head, steel(loft([
    circ(1.8, 0.012),
    ring(1.79, 0.055, 0.06, 0.065),
    ring(1.765, 0.085, 0.09, 0.1),
    ring(1.73, 0.102, 0.112, 0.122, { ridge: 0.006 }),
    ring(1.68, 0.11, 0.125, 0.132, { ridge: 0.004 }),
    ring(1.63, 0.112, 0.13, 0.14),
    ring(1.605, 0.114, 0.134, 0.155, { drop: -0.012 }),
    ring(1.585, 0.118, 0.138, 0.175, { drop: -0.035 }),
    ring(1.575, 0.122, 0.138, 0.19, { drop: -0.05 }),
  ], { seg: 28 })));
  // plume: red feathers from a holder at the back of the crown, swept back (loft bent by per-ring z offsets)
  const plumeG = loft([circ(0, 0.008), circ(0.04, 0.028, { z: -0.004 }), circ(0.11, 0.042, { z: -0.02 }), circ(0.19, 0.04, { z: -0.055 }), circ(0.26, 0.026, { z: -0.1 }), circ(0.31, 0.005, { z: -0.15 })], { seg: 14 });
  put(head, kit.toon(plumeG, c.cloth, c.clothShade), 0, 1.77, -0.075, -78 * DEG, 0, 0);
  // visor: the lower front plate, a little proud of the skull so its edge reads (the Met sallet's step under the slit)
  put(head, steel(loft([ring(1.657, 0.104, 0.131, 0.0), ring(1.62, 0.115, 0.142, 0.0), ring(1.588, 0.12, 0.146, 0.0)], { seg: 28 })));
  // visor slit: a dark band just proud of the helmet front, no hull
  put(head, kit.toon(loft([ring(1.672, 0.105, 0.129, 0.0), ring(1.66, 0.105, 0.13, 0.0)], { seg: 28 }), c.slit, c.slit, { outline: false }), 0, 0, 0.004);

  // ---------- arms ----------
  for (const [S, s] of [["L", 1], ["R", -1]]) {
    const sh = joint(`shoulder${S}`, chest, s * SHX, 1.44, -0.005);
    const el = joint(`elbow${S}`, sh, s * SHX, 1.15, -0.005);
    const wr = joint(`wrist${S}`, el, s * SHX, 0.9, -0.005);
    const x = s * SHX;
    // pauldron: domed cop + two lames, tilted outward
    put(sh, steel(shell([[0, 0.072], [0.042, 0.067], [0.068, 0.048], [0.083, 0.015], [0.09, -0.03], [0.094, -0.07]], 0.008, { seg: 20, sz: 1.15 })), x - s * 0.01, 1.45, 0, 0, 0, -s * 10 * DEG);
    put(sh, steel(loft([circ(1.39, 0.072), circ(1.34, 0.079)], { seg: 18 })), x + s * 0.012, 0, 0, 0, 0, 0);
    put(sh, steel(loft([circ(1.35, 0.066), circ(1.3, 0.072)], { seg: 18 })), x + s * 0.01, 0, 0, 0, 0, 0);
    // rerebrace
    put(sh, steel(loft([circ(1.33, 0.058), circ(1.2, 0.052)], { seg: 16 })), x, 0, -0.005);
    // elbow: dark joint, couter cup, couter fan on the outside
    put(el, under(new THREE.SphereGeometry(0.048, 12, 8)), x, 1.15, -0.005);
    put(el, steel(shell([[0, 0.066], [0.035, 0.058], [0.058, 0.032], [0.066, 0.0]], 0.007, { seg: 16 })), x, 1.15, -0.02, -90 * DEG, 0, 0);
    put(el, steel(shell([[0, 0.018], [0.045, 0.014], [0.08, 0.0]], 0.006, { seg: 18 })), x + s * 0.05, 1.15, -0.01, 0, 0, -s * 90 * DEG);
    // couter spike: the Gothic wing's point, out and back from the fan. Sword arm only: on the shield arm it would
    // pierce the shield whenever the forearm comes across the body.
    const spikeDir = new THREE.Vector3(s * 0.75, -0.1, -0.65).normalize();
    if (s < 0) {
      const spike = put(el, steel(new THREE.ConeGeometry(0.017, 0.12, 8)), x + s * 0.05 + spikeDir.x * 0.065, 1.15 + spikeDir.y * 0.065, -0.01 + spikeDir.z * 0.065);
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), spikeDir);
    }
    // vambrace
    put(el, steel(loft([circ(1.12, 0.05), circ(1.02, 0.047), circ(0.93, 0.04)], { seg: 16 })), x, 0, -0.005);
    // gauntlet: bell cuff + fist (palm faces the body, knuckles front-to-back)
    put(wr, steel(loft([circ(0.97, 0.068), circ(0.94, 0.06), circ(0.9, 0.045)], { seg: 16 })), x, 0, -0.005);
    put(wr, steel(loft([ring(0.9, 0.03, 0.04, 0.03, { p: 3 }), ring(0.86, 0.036, 0.05, 0.035, { p: 3 }), ring(0.81, 0.034, 0.048, 0.032, { p: 3 }), ring(0.79, 0.02, 0.035, 0.02, { p: 3 })], { seg: 16 })), x, 0, -0.005);
  }

  // ---------- legs ----------
  for (const [S, s] of [["L", 1], ["R", -1]]) {
    const x = s * 0.1;
    const hip = joint(`hip${S}`, pelvis, x, 0.9, 0);
    const kn = joint(`knee${S}`, hip, x, 0.52, 0);
    const an = joint(`ankle${S}`, kn, x, 0.1, 0);
    // cuisse
    put(hip, steel(loft([ring(0.93, 0.094, 0.095, 0.09), ring(0.82, 0.09, 0.093, 0.082), ring(0.7, 0.075, 0.08, 0.07), ring(0.6, 0.065, 0.07, 0.06), ring(0.555, 0.06, 0.065, 0.055)], { seg: 18 })), x, 0, 0);
    // tasset: small pointed plate hanging over the thigh front
    put(hip, steel(loft([ring(0.95, 0.065, 0.008, 0.008, { bend: 6 }), ring(0.88, 0.062, 0.008, 0.008, { bend: 6 }), ring(0.82, 0.02, 0.008, 0.008, { bend: 6 })], { seg: 16 })), x, 0, 0.1);
    // knee: dark joint, poleyn cup, outer wing
    put(kn, under(new THREE.SphereGeometry(0.05, 12, 8)), x, 0.52, 0);
    put(kn, steel(shell([[0, 0.075], [0.03, 0.06], [0.055, 0.035], [0.068, 0.0]], 0.007, { seg: 16 })), x, 0.52, 0.02, 90 * DEG, 0, 0);
    put(kn, steel(shell([[0, 0.016], [0.045, 0.012], [0.07, 0.0]], 0.006, { seg: 18 })), x + s * 0.06, 0.52, 0.0, 0, 0, -s * 90 * DEG);
    // greave with a calf swell
    put(kn, steel(loft([ring(0.54, 0.062, 0.065, 0.06, { ridge: 0.008 }), ring(0.44, 0.062, 0.06, 0.08, { ridge: 0.01 }), ring(0.32, 0.053, 0.052, 0.065, { ridge: 0.01 }), ring(0.2, 0.042, 0.045, 0.045, { ridge: 0.006 }), ring(0.11, 0.045, 0.05, 0.05)], { seg: 18 })), x, 0, 0);
    // sabaton: lofted along z (heel -> long pointed toe), then rotated so loft-y is world +z
    // three shingles (heel cuff, instep lame, long toe), each starting a little proud of the one behind it
    const footPieces = [
      [[-0.085, 0.035, 0.085, 0.012], [-0.065, 0.048, 0.11, 0.0], [0.0, 0.052, 0.118, 0.0], [0.05, 0.052, 0.097, 0.0]],
      [[0.035, 0.057, 0.108, -0.002], [0.11, 0.05, 0.075, 0.0]],
      [[0.1, 0.054, 0.083, -0.002], [0.15, 0.045, 0.06, 0.0], [0.22, 0.03, 0.042, 0.003], [0.3, 0.014, 0.024, 0.006], [0.36, 0.003, 0.013, 0.009]],
    ];
    for (const piece of footPieces) {
      const sg = loft(piece.map(([z, w, top, bot]) => ({ y: z, w, f: (top - bot) / 2, b: (top - bot) / 2, z: -(top + bot) / 2, p: 2.4 })), { seg: 16 });
      sg.rotateX(Math.PI / 2);
      put(an, steel(sg), x, 0, 0);
    }
  }

  if (GEAR) {
  // ---------- sword (right hand) ----------
  // The sword joint sits in the fist; the sword is built along its local +Y (blade up), edges along local z.
  const sword = joint("sword", joints.wristR, -SHX, 0.845, -0.005);
  const blade = new THREE.Group();
  blade.rotation.x = Math.PI / 2; // local +Y -> wrist +Z: the blade leaves the thumb side of the fist
  sword.add(blade);
  const bladeG = loft([ring(0.07, 0.006, 0.024, 0.024, { p: 1 }), ring(0.55, 0.005, 0.02, 0.02, { p: 1 }), ring(0.88, 0.004, 0.012, 0.012, { p: 1 }), ring(0.95, 0.001, 0.001, 0.001, { p: 1 })], { seg: 4, flat: true });
  blade.add(steel(bladeG, { threshold: 0.3 })); // one bevel lit, one dark
  const cross = kit.toon(loft([ring(-0.11, 0.012, 0.012, 0.012), ring(0.11, 0.012, 0.012, 0.012)], { seg: 8 }), c.gold, c.goldShade);
  cross.rotation.x = Math.PI / 2; cross.position.y = 0.065;
  blade.add(cross);
  const grip = kit.toon(loft([circ(0.06, 0.015), circ(-0.09, 0.017)], { seg: 10 }), c.leather, c.leatherShade);
  blade.add(grip);
  const pommel = kit.toon(new THREE.SphereGeometry(0.025, 12, 8), c.gold, c.goldShade);
  pommel.position.y = -0.105;
  blade.add(pommel);

  // ---------- shield (left forearm) ----------
  // Strapped across the forearm like a real heater: shield-up = forearm +Z (up when the elbow is bent 90 deg),
  // shield-face = forearm +X (outward), so the shield stays upright whenever the forearm is level.
  const mount = new THREE.Group();
  mount.position.set(0.09, -0.15, 0.0);
  mount.setRotationFromMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
  joints.elbowL.add(mount);
  const shieldFace = new THREE.Group();
  shieldFace.position.set(0, 0.04, 0); // grip sits a little above the shield centre
  mount.add(shieldFace);
  const heater = (inset) => {
    const rs = [];
    for (let i = 0; i <= 12; i++) {
      const y = 0.31 - (i / 12) * 0.62;
      const w = y > 0.05 ? 0.23 : 0.23 * Math.sqrt(Math.max(1 - ((0.05 - y) / 0.36) ** 2, 0));
      rs.push({ y, w: Math.max(w - inset, 0.002), f: 0.016, b: 0.016, p: 6, bend: 1.2 });
    }
    return rs;
  };
  const heaterRim = heater(-0.014).map((r) => ({ ...r, f: 0.011, b: 0.011 }));
  heaterRim[0].y += 0.012; heaterRim[12].y -= 0.016;
  shieldFace.add(kit.toon(loft(heaterRim, { seg: 24 }), c.steel, c.steelShade, { threshold: 0.45 })); // steel rim
  shieldFace.add(kit.toon(loft(heater(0), { seg: 24 }), c.cloth, c.clothShade, { threshold: 0.05 })); // red field: low threshold keeps it red
  // gold cross charge, bent with the field, thin ink
  const bar = (y0, y1, w) => loft([y0, (y0 + y1) / 2, y1].map((y) => ({ y, w, f: 0.005, b: 0.005, z: 0.017, p: 6, bend: 1.2 })), { seg: 16 });
  shieldFace.add(kit.toon(bar(0.26, -0.24, 0.026), c.gold, c.goldShade, { px: 2, threshold: 0.05 }));
  shieldFace.add(kit.toon(bar(0.1, 0.045, 0.19), c.gold, c.goldShade, { px: 2, threshold: 0.05 }));

  }

  // ---------- poses ----------
  function pose(name) {
    const rows = POSES[name];
    if (!rows) throw new Error(`unknown pose "${name}" (${Object.keys(POSES).join(", ")})`);
    const table = { ...REST, ...rows };
    for (const [j, [rx, ry, rz]] of Object.entries(table)) if (joints[j]) joints[j].rotation.set(rx * DEG, ry * DEG, rz * DEG);
    joints.pelvis.position.y = 0.96 + (LIFT[name] ?? 0);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
