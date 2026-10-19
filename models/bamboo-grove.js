// bamboo-grove.js - a clump of grove bamboo (Arashiyama paths, shrine edges), with a looping wind sway.
// Contract: harness/lab/README.md. Meters, +Y up, faces +Z, its left is +X, stands on y = 0, centred on x = 0, z = 0.
//
// Construction (all procedural, deterministic from { count, seed }; one seeded mulberry32, never Math.random):
//   CULM    one smooth loft per culm: a 6-sided ring at the ground, at every node and at the tip, around a gently
//           leaning, bowing centreline; the radius tapers to ~32 % at the top and the tip closes in a short cone.
//           Ink 3 px (not 5): at hero size a culm is ~6 px wide and a 5 px hull would swallow the pale fill.
//   NODES   a short open band (6 sides, 16 % proud of the culm, 4 cm tall) at every node, flat iris, no hull: the
//           dark rings that make a pale pole read as bamboo. Internodes 0.30-0.40 m (shorter near the ground).
//   TWIGS   from the nodes of the upper ~40 % of each culm, alternating sides node to node (as real bamboo does),
//           a thin 3-sided twig rising 25-42 deg, pulled toward the outside of the clump, carrying feathery fans of
//           narrow lanceolate leaves (each leaf a thin closed solid with a midrib ridge, 6 tris, inked at 2 px): a
//           5-leaf fan at the twig tip and a 3-leaf fan on the twig. Each culm ends in a crown twig rising past its
//           tip with a drooping fan. A twig and its leaves are one merged mesh in one group (a joint, for sway).
//   CLUMP   culms on a jittered golden-angle spiral (min spacing 0.36 m), the tallest in the middle, leaning
//           3-7 deg out of the clump. After the build the whole clump is scaled uniformly so its top is exactly
//           `height` (meta.height by default) and re-centred on x = 0, z = 0, for any count or seed.
// Proportions (stylised moso; base unit the culm diameter D at the ground, ~0.2 m, ink included):
//   culms 6.0-9.2 m before scaling (30-46 D); leaves 0.44-0.54 x 0.07-0.085 m (stylised ~2x real so the fans
//   survive the thumbnail); twigs 0.4-1.15 m. Default clump: 7 culms, 4.4 x 9.0 x 4.7 m, 5.6k tris (9 culms 7.6k).
// Options: build(THREE, kit, colors, { count = 7, seed = 1, height = meta.height }).
// Animation: sway(phase, amount = 1) is returned next to pose(). phase 0..1 is one loop (every term has a whole-number
//   frequency, so phase 1 == phase 0); tops bend downwind (+X, the lit side, with a little +Z) by a steady lean plus a
//   swing (tip travel up to ~6 % of the culm), each culm with its own phase; every twig rides its culm's bent
//   centreline, tilts with its slope and flutters on its own (5-10 deg, 3 times a loop). Culm and band vertices are
//   rewritten in place (positions only; hull normals stay from rest). pose("rest") is still air;
//   pose("sway-1..4") = sway(0, 0.25, 0.5, 0.75). A film calls pose("rest") once, then sway((t / period) % 1) per
//   frame (period ~3-4 s).
// Colours (noon; none of the four scripts has a green): a pale golden-dry bamboo in the paper-noon ink-wash manner.
//   culm sky #f2d7ae / iris #5c3d32 at threshold -0.4 (a pale pole; only the far -X edge goes dark);
//   node bands, twigs and leaves flat iris #5c3d32 (lighter than ink #2c261f, distinct from the pale culm base).
//   Same script as the torii and the library bamboo, so they share a shrine-edge scene.

export const meta = {
  name: "bamboo-grove",
  height: 9.0,
  script: "noon",
  colors: {
    culm: "#f2d7ae", culmShade: "#5c3d32",
    node: "#5c3d32",
    leaf: "#5c3d32", leafShade: "#5c3d32",
  },
  poses: ["rest", "sway-1", "sway-2", "sway-3", "sway-4"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { count = 7, seed = 1, height = meta.height } = opts;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

  // ---------- seeded random ----------
  let st = (seed * 0x9e3779b1) >>> 0 || 1;
  const rnd = () => {
    st = (st + 0x6d2b79f5) >>> 0;
    let t = st;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const range = (a, b) => a + (b - a) * rnd();

  const root = new THREE.Group();
  root.name = "bamboo-grove";
  const clump = new THREE.Group();
  clump.name = "clump";
  root.add(clump);
  const joints = { clump };

  const culmMat = { threshold: -0.4, px: 3 };
  const leafMat = { threshold: 0.35, px: 2 };

  // Indexed geometry with its winding chosen from the signed volume (positive = outward), never by hand.
  function solid(pos, idx) {
    let vol = 0;
    for (let k = 0; k < idx.length; k += 3) {
      const [a, b, e] = [idx[k] * 3, idx[k + 1] * 3, idx[k + 2] * 3];
      vol += pos[a] * (pos[b + 1] * pos[e + 2] - pos[b + 2] * pos[e + 1])
        - pos[a + 1] * (pos[b] * pos[e + 2] - pos[b + 2] * pos[e])
        + pos[a + 2] * (pos[b] * pos[e + 1] - pos[b + 1] * pos[e]);
    }
    if (vol < 0) for (let k = 0; k < idx.length; k += 3) [idx[k + 1], idx[k + 2]] = [idx[k + 2], idx[k + 1]];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  // Triangle soup: each triangle faces away from its own interior point (flat normals; the leaves are flat iris).
  function soup(tris) {
    const out = [];
    for (const [a, b, e, inside] of tris) {
      const n = V().subVectors(b, a).cross(V().subVectors(e, a));
      const m = V().add(a).add(b).add(e).multiplyScalar(1 / 3).sub(inside);
      const [p, q] = n.dot(m) < 0 ? [e, b] : [b, e];
      out.push(a.x, a.y, a.z, p.x, p.y, p.z, q.x, q.y, q.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
    g.computeVertexNormals();
    return g;
  }

  // One leaf, base at o, along unit dir d, flat across unit w: a thin closed solid widest at 0.3 L, its cross-section
  // a low triangle (two edges and a midrib ridge on the upper face), 6 tris.
  function leaf(tris, o, d, w, L, W) {
    const t = d.clone().cross(w).normalize().multiplyScalar(W * 0.2);
    const m = o.clone().addScaledVector(d, 0.3 * L);
    const tip = o.clone().addScaledVector(d, L);
    const ring = [m.clone().addScaledVector(w, W / 2), m.clone().add(t), m.clone().addScaledVector(w, -W / 2)];
    const inside = m.clone().addScaledVector(t, 0.3);
    for (let k = 0; k < 3; k++) {
      const a = ring[k], b = ring[(k + 1) % 3];
      tris.push([o, a, b, inside], [tip, b, a, inside]);
    }
  }

  // A fan of n leaves at point p (twig-local), spread around azimuth az (rad, about local Y), drooping.
  function fan(tris, p, az, n, spread, droop0) {
    for (let k = 0; k < n; k++) {
      const u = n === 1 ? 0 : k / (n - 1) - 0.5;
      const a = az + u * spread + range(-0.12, 0.12);
      const dr = (droop0 + Math.abs(u) * 40 + range(-8, 8)) * DEG;
      const d = V(Math.cos(a) * Math.cos(dr), -Math.sin(dr), Math.sin(a) * Math.cos(dr)).normalize();
      const w = V(0, 1, 0).cross(d).normalize();
      w.applyAxisAngle(d, range(-0.35, 0.35)); // leaves twist a little, so the fan shows faces and edges
      leaf(tris, p, d, w, range(0.44, 0.54), range(0.07, 0.085));
    }
  }

  // A 3-sided tapered twig from a to b (closed prism).
  function twig(tris, a, b, r0, r1) {
    const d = V().subVectors(b, a).normalize();
    const u = Math.abs(d.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0);
    const s1 = u.clone().cross(d).normalize(), s2 = d.clone().cross(s1).normalize();
    const ringAt = (p, r) => [0, 1, 2].map((k) => p.clone().addScaledVector(s1, Math.cos(k * TAU / 3) * r).addScaledVector(s2, Math.sin(k * TAU / 3) * r));
    const A = ringAt(a, r0), B = ringAt(b, r1), mid = a.clone().add(b).multiplyScalar(0.5);
    for (let k = 0; k < 3; k++) {
      const k2 = (k + 1) % 3;
      tris.push([A[k], A[k2], B[k], mid], [A[k2], B[k2], B[k], mid]);
    }
    tris.push([A[0], A[1], A[2], mid], [B[0], B[1], B[2], mid]);
  }

  // ---------- clump layout ----------
  const culms = [];
  const spots = [];
  for (let i = 0; i < count; i++) {
    let x = 0, z = 0;
    for (let tries = 0; tries < 30; tries++) {
      const r = 0.4 * Math.sqrt(i + 0.3) + range(-0.08, 0.12), a = i * 2.39996 + range(-0.5, 0.5);
      x = r * Math.cos(a); z = r * Math.sin(a);
      if (spots.every(([sx, sz]) => Math.hypot(x - sx, z - sz) > 0.36)) break;
    }
    spots.push([x, z]);
  }

  spots.forEach(([bx, bz], i) => {
    const out = Math.hypot(bx, bz) > 1e-3 ? Math.atan2(bz, bx) : range(0, TAU);
    const H = i === 0 ? 9.2 : range(6.0, 8.8) - 0.3 * Math.hypot(bx, bz); // the tallest in the middle
    const r0 = range(0.09, 0.105) * (0.85 + 0.15 * H / 9);
    const lean = range(3, 7) * DEG, bow = range(0.012, 0.03) * H, dirA = out + range(-0.5, 0.5);
    const lx = Math.cos(dirA), lz = Math.sin(dirA);
    // centreline offset at height y: a straight lean plus a bow that grows toward the nodding tip
    const off = (y) => Math.tan(lean) * y + bow * Math.pow(y / H, 2.6);
    const centre = (y) => V(lx * off(y), y, lz * off(y));
    const radius = (y) => r0 * (1 - 0.68 * Math.pow(y / H, 1.4));

    // nodes: internodes 0.30 m near the ground growing to 0.40 m by mid-culm
    const nodes = [];
    for (let y = 0.22; y < H - 0.25; y += 0.30 + 0.10 * Math.min(1, y / (0.5 * H))) nodes.push(y);

    const g = new THREE.Group();
    g.name = `culm${i}`;
    g.position.set(bx, 0, bz);
    clump.add(g);
    joints[`culm${i}`] = g;

    // culm loft
    const S = 6, ys = [0, ...nodes, H];
    const pos = [], idx = [];
    const twist = range(0, TAU);
    for (const y of ys) {
      const p = centre(y), r = radius(y);
      for (let k = 0; k < S; k++) {
        const a = twist + (k * TAU) / S;
        pos.push(p.x + Math.cos(a) * r, y, p.z + Math.sin(a) * r);
      }
    }
    const nR = ys.length, base = nR * S, apex = base + 1;
    const tp = centre(H + 0.12);
    pos.push(0, 0, 0, tp.x, H + 0.12, tp.z);
    for (let j = 0; j < nR - 1; j++) for (let k = 0; k < S; k++) {
      const a = j * S + k, b = j * S + ((k + 1) % S), d = a + S, e = b + S;
      idx.push(a, d, b, b, d, e);
    }
    for (let k = 0; k < S; k++) {
      idx.push(base, k, (k + 1) % S);
      idx.push(apex, (nR - 1) * S + ((k + 1) % S), (nR - 1) * S + k);
    }
    const cg = solid(pos, idx);
    const culm = kit.toon(cg, c.culm, c.culmShade, culmMat);
    culm.name = `culm${i}Pole`;
    g.add(culm);

    // node bands: open short tubes, flat iris, double-sided, no hull
    const bp = [], bi = [];
    for (const y of nodes) {
      const p = centre(y), r = radius(y) * 1.16, o = bp.length / 3;
      for (const dy of [-0.02, 0.02]) for (let k = 0; k < S; k++) {
        const a = twist + (k * TAU) / S;
        bp.push(p.x + Math.cos(a) * r, y + dy, p.z + Math.sin(a) * r);
      }
      for (let k = 0; k < S; k++) {
        const a = o + k, b = o + ((k + 1) % S);
        bi.push(a, a + S, b, b, a + S, b + S);
      }
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute("position", new THREE.Float32BufferAttribute(bp, 3));
    bg.setIndex(bi);
    bg.computeVertexNormals();
    const bands = new THREE.Mesh(bg, kit.cel(c.node, c.node, { doubleSided: true }));
    bands.name = `culm${i}Nodes`;
    g.add(bands);

    // twigs with leaf fans, from the upper nodes, alternating sides; plus a spray at the tip
    const twigs = [];
    const upper = nodes.filter((y) => y > 0.58 * H);
    let side = range(0, TAU);
    upper.forEach((y, k) => {
      side += Math.PI + range(-0.6, 0.6);
      if (k % 2 === 1 && rnd() < 0.55) return; // sparse: about two thirds of the upper nodes branch
      // pull the twig azimuth toward the outside of the clump so the fans fill the crown, not the middle
      const az = Math.atan2(Math.sin(side) + 0.8 * Math.sin(out), Math.cos(side) + 0.8 * Math.cos(out));
      const f = (y - 0.58 * H) / (0.42 * H);
      const L = range(0.75, 1.15) * (1 - 0.45 * f), el = range(25, 42) * DEG;
      const tris = [];
      const a0 = V(0, 0, 0), dir = V(Math.cos(el), Math.sin(el), 0);
      const tip = dir.clone().multiplyScalar(L);
      twig(tris, a0, tip, 0.016, 0.008);
      fan(tris, tip, 0, 5, 1.9, 24);
      fan(tris, dir.clone().multiplyScalar(L * 0.55), range(-0.3, 0.3), 3, 1.4, 22);
      twigs.push({ y, az, tris, at: radius(y) * 0.6 });
    });
    {
      // the crown: a twig rising past the culm tip with a drooping fan, so the tip ends in leaves, not a bare spike
      const tris = [], d = V(0.45, 0.9, 0).normalize();
      twig(tris, V(0, 0, 0), d.clone().multiplyScalar(0.5), 0.012, 0.007);
      fan(tris, d.clone().multiplyScalar(0.5), 0, 5, 2.4, 24);
      fan(tris, V(0, 0, 0), Math.PI * 0.85, 2, 1.2, 30);
      twigs.push({ y: H - 0.3, az: dirA, tris, at: radius(H - 0.3) * 0.5 });
    }
    const twigGroups = twigs.map((t, k) => {
      const tg = new THREE.Group();
      tg.name = `culm${i}Twig${k}`;
      const mesh = kit.toon(soup(t.tris), c.leaf, c.leafShade, leafMat);
      mesh.name = `culm${i}Twig${k}Mesh`;
      tg.add(mesh);
      g.add(tg);
      joints[tg.name] = tg;
      const p = centre(t.y).add(V(Math.cos(t.az) * t.at, 0, Math.sin(t.az) * t.at));
      tg.position.copy(p);
      tg.rotation.set(0, -t.az, 0); // local +X -> azimuth az
      return { tg, rest: p.clone(), restQ: tg.quaternion.clone(), y: t.y, ph: rnd(), amp: range(5, 10) * DEG };
    });

    culms.push({
      H, culm, bands, twigGroups,
      restC: Float32Array.from(cg.attributes.position.array),
      restB: Float32Array.from(bg.attributes.position.array),
      ph: rnd(), amp: range(0.8, 1.1) * 0.06 * H, ph2: rnd(),
    });
  });

  // ---------- normalise: top at `height`, centred on x = 0, z = 0 ----------
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(clump);
  const k = height / box.max.y;
  clump.scale.setScalar(k);
  clump.position.set((-(box.min.x + box.max.x) / 2) * k, 0, (-(box.min.z + box.max.z) / 2) * k);

  // ---------- wind ----------
  // Downwind is WIND (mostly +X). bend(y) = lateral offset (authored metres) of a culm point at height y.
  // Sign convention: positive s pushes the tops toward +X; twigs tilt by -atan(slope) about the axis up x WIND.
  const WIND = V(0.92, 0, 0.39).normalize();
  const TILT_AXIS = V(0, 1, 0).cross(WIND).normalize();
  const qT = new THREE.Quaternion(), qF = new THREE.Quaternion(), X = V(1, 0, 0);
  function bendArr(rest, attr, H, A) {
    const a = attr.array;
    for (let v = 0; v < a.length; v += 3) {
      const t = Math.max(0, rest[v + 1]) / H, o = A * t * t;
      a[v] = rest[v] + WIND.x * o;
      a[v + 1] = rest[v + 1];
      a[v + 2] = rest[v + 2] + WIND.z * o;
    }
    attr.needsUpdate = true;
  }
  function sway(phase, amount = 1) {
    for (const cm of culms) {
      const s = amount * (0.45 + 0.4 * Math.sin(TAU * (phase + cm.ph)) + 0.15 * Math.sin(TAU * (2 * phase + cm.ph2)));
      const A = cm.amp * s;
      bendArr(cm.restC, cm.culm.geometry.attributes.position, cm.H, A);
      bendArr(cm.restB, cm.bands.geometry.attributes.position, cm.H, A);
      cm.culm.geometry.computeBoundingSphere();
      cm.bands.geometry.computeBoundingSphere();
      for (const tw of cm.twigGroups) {
        const t = tw.y / cm.H, o = A * t * t, slope = (2 * A * t) / cm.H;
        tw.tg.position.copy(tw.rest).addScaledVector(WIND, o);
        qT.setFromAxisAngle(TILT_AXIS, -Math.atan(slope));
        qF.setFromAxisAngle(X, amount * tw.amp * Math.sin(TAU * (3 * phase + tw.ph)));
        tw.tg.quaternion.copy(qT).multiply(tw.restQ).multiply(qF);
      }
    }
    root.updateMatrixWorld(true);
  }

  const POSES = { rest: null, "sway-1": 0, "sway-2": 0.25, "sway-3": 0.5, "sway-4": 0.75 };
  function pose(name) {
    if (!(name in POSES)) throw new Error(`unknown pose "${name}" (${Object.keys(POSES).join(", ")})`);
    sway(0, 0); // still air underneath every pose
    if (POSES[name] !== null) sway(POSES[name], 1);
  }
  pose("rest");
  return { root, joints, pose, sway };
}
