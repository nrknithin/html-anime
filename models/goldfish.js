// goldfish.js - a fancy goldfish (ryukin / wakin look) for festival kingyo-sukui and fishbowl shots, animated.
// Contract: harness/lab/README.md. Meters, +Y up, the fish faces +Z, its left is +X. A fish has no ground: like the
// library fish its lowest rest point (the lower tail lobes) is on y = 0 and it is centred on x = 0, z = 0; films lift
// it into the water.
//
// Construction (one deformable fish, so the whole body sways in one piece):
//   BODY   one two-rail loft, rings at constant z between a top rail and a belly rail read off a ryukin side view
//          (short, deep, egg-shaped, the back humped behind the head), superellipse 2.2. Colour patterns are
//          material groups on that one mesh, so there is one hull and no seams.
//   FINS   every fin (dorsal, pectorals, pelvics, anal pair, the twin tail) is a two-layer sheet (the dragon's
//          membrane) rebuilt in pose() from a planform function, with rim hull normals so it inks face-on and stays a
//          line edge-on. Fins are banded by material groups: body colour at the root, pale toward the edge, so they
//          read as thin and translucent.
//   TAIL   the signature double tail: two fan sheets joined along their top edges at the midline and splaying apart
//          below (a tent seen from behind, a butterfly from above), each forked into an upper and a longer, drooping
//          lower lobe. Longer than the body.
//   SWAY   warp(): a lateral travelling wave along a spine x = s(z), applied to every body vertex and fin point
//          (each point turned about the spine at its own z; points behind the tail root ride the root's tangent).
//          Eyes, mouth and gill line are rigid parts on the head joint, which follows the same spine.
// Proportions (base unit the body length B = snout to tail root = 0.070 m): depth 0.76 B, width 0.39 B, eye 0.18 B
//   across, 0.19 B behind the snout; dorsal fin 0.37 B tall; tail lobes 1.0-1.1 B; total 1.98 B = 0.139 m long,
//   0.105 m from the lower lobe tips to the dorsal tip. Real size; build(THREE, kit, colors, { height }) or
//   { length } (total, snout to tail tip) scales it uniformly. ~3.0k triangles (3.3k patterned: denser rings).
// Patterns: { pattern: "red" } (default, orange-red with a paler belly), "redwhite" (white with a red head cap and
//   saddle, the common anime fish), "calico" (white, orange patches, two dark patches). Patterns are wavy material
//   groups on the body rings; keep their edges along the body (a vertical white band reads as a clownfish).
// Two-tone pairs (festival script): body practical #ffb020 lit / accent #ff4d6d shade (an orange fish that turns red
//   in shade); belly iris #ffd0a1 / practical; white line #fff1ea / skin #f0c2ae; dark patches sky #24143a; fins:
//   root in the body pair, mid moon #ffd7a1 / skin, edge line / iris, threshold -0.2 so a thin fin mostly reads lit;
//   eye moon / practical with a hair #1a1020 pupil and a sclera #f6f3ee glint; mouth hair.
// Clips: build() returns clips { swim: 0.8 s, idle: 2.4 s }; pose("swim@0.3") is that clip at 0.3 s and loops. Named
//   poses: rest (fins spread, still), swim-a / swim-b (half a stroke apart), idle (a hover frame).

export const meta = {
  name: "goldfish",
  height: 0.1045,
  script: "festival",
  colors: {
    body: "#ffb020", bodyShade: "#ff4d6d",
    belly: "#ffd0a1", bellyShade: "#ffb020",
    white: "#fff1ea", whiteShade: "#f0c2ae",
    spot: "#24143a",
    finMid: "#ffd7a1", finMidShade: "#f0c2ae",
    finEdge: "#fff1ea", finEdgeShade: "#ffd0a1",
    eye: "#ffd7a1", eyeShade: "#ffb020",
    pupil: "#1a1020", glint: "#f6f3ee",
  },
  poses: ["rest", "swim-a", "swim-b", "idle"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const C = colors;
  const { pattern = "red" } = opts;
  if (!["red", "redwhite", "calico"].includes(pattern)) throw new Error(`goldfish: pattern must be red, redwhite or calico (got ${pattern})`);
  const TAU = Math.PI * 2, D = Math.PI / 180;
  const spow = (v, e) => Math.sign(v) * Math.abs(v) ** e;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

  const root = new THREE.Group();
  root.name = "goldfish";
  const space = new THREE.Group(); // uniform size scale
  space.name = "space";
  root.add(space);
  const fish = new THREE.Group(); // authored fish frame, shifted so the rest bbox sits on y = 0 and centres on z = 0
  fish.name = "fish";
  space.add(fish);
  const joints = {};

  // ---------- geometry helpers (references/geometry.md) ----------
  function geom(pos, idx) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
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
  function groups(g, test) {
    const p = g.attributes.position, ix = g.index.array, buckets = [];
    for (let i = 0; i < ix.length; i += 3) {
      let cx = 0, cy = 0, cz = 0;
      for (let k = 0; k < 3; k++) { cx += p.getX(ix[i + k]) / 3; cy += p.getY(ix[i + k]) / 3; cz += p.getZ(ix[i + k]) / 3; }
      (buckets[test(cx, cy, cz)] ??= []).push(ix[i], ix[i + 1], ix[i + 2]);
    }
    g.setIndex(buckets.map((b) => b ?? []).flat());
    g.clearGroups();
    let start = 0;
    buckets.forEach((b = [], k) => { g.addGroup(start, b.length, k); start += b.length; });
    return g;
  }

  // ---------- body rails (fish frame: snout z = +0.040, tail root z = -0.030, body axis y = 0) ----------
  //            snout                                                                  tail root
  const BZ = [0.0405, 0.037, 0.031, 0.023, 0.013, 0.002, -0.009, -0.017, -0.023, -0.028, -0.0325];
  const BT = [-0.001, 0.007, 0.0145, 0.0225, 0.0285, 0.0295, 0.026, 0.018, 0.011, 0.0074, 0.0058]; // top
  const BB = [-0.003, -0.010, -0.017, -0.022, -0.024, -0.0225, -0.018, -0.0125, -0.008, -0.0059, -0.0048]; // belly
  const BW = [0.0018, 0.0064, 0.0096, 0.012, 0.0135, 0.0135, 0.0118, 0.009, 0.0063, 0.0038, 0.0028]; // half-width
  const ST = pattern === "red" ? 2 : 3, SEG = 16, NP = 2.2; // patterns cross rings: denser rings, smaller teeth
  const rz = spline(BZ, ST), rt = spline(BT, ST), rb = spline(BB, ST), rw = spline(BW, ST);
  const at = (arr, z) => { // linear lookup by z (rz descends)
    if (z >= rz[0]) return arr[0];
    for (let i = 1; i < rz.length; i++) if (z >= rz[i]) { const f = (rz[i - 1] - z) / (rz[i - 1] - rz[i]); return arr[i - 1] + (arr[i] - arr[i - 1]) * f; }
    return arr[arr.length - 1];
  };
  const topY = (z) => at(rt, z), botY = (z) => at(rb, z), halfW = (z) => at(rw, z);
  // surface x on the near (+X) side at height y, station z
  const surfX = (y, z) => {
    const cy = (topY(z) + botY(z)) / 2, dy = (topY(z) - botY(z)) / 2, v = Math.min(1, Math.abs((y - cy) / dy));
    return halfW(z) * (1 - v ** NP) ** (1 / NP);
  };
  const bodyGeo = skin(rz.map((z, i) => {
    const cy = (rt[i] + rb[i]) / 2, dy = (rt[i] - rb[i]) / 2;
    return Array.from({ length: SEG }, (_, s) => {
      const t = (s / SEG) * TAU;
      return [rw[i] * spow(Math.cos(t), 2 / NP), cy + dy * spow(Math.sin(t), 2 / NP), z];
    });
  }), { dome: 0.6 });

  // pattern groups: 0 body colour, 1 belly / white, 2 dark patch
  const yRel = (y, z) => (y - (topY(z) + botY(z)) / 2) / ((topY(z) - botY(z)) / 2);
  const patterns = {
    red: (x, y, z) => (yRel(y, z) < -0.45 && z < 0.034 ? 1 : 0),
    // red back and head cap over a white belly, the edge waving along the flank (never a vertical band: that reads clownfish)
    redwhite: (x, y, z) => {
      const head = Math.min(1, Math.max(0, (z - 0.01) / 0.014));
      const edge = 0.12 + 0.28 * Math.sin(z * 150 + 0.8 + x * 40) - 0.5 * head;
      return yRel(y, z) > edge && z < 0.036 ? 0 : 1;
    },
    // white with round orange patches and two dark ones (blobs: x, y, z, radius)
    calico: (x, y, z) => {
      const inside = (B) => B.some(([bx, by, bz, r]) => (x - bx) ** 2 + (y - by) ** 2 + (z - bz) ** 2 < r * r);
      if (inside(DARK)) return 2;
      return inside(ORANGE) ? 0 : 1;
    },
  };
  const ORANGE = [[0.009, 0.016, 0.022, 0.012], [-0.006, 0.022, 0.001, 0.014], [0.012, 0.004, -0.012, 0.009],
    [-0.012, -0.004, 0.02, 0.009], [0.0, 0.01, -0.024, 0.008]];
  const DARK = [[0.01, 0.02, 0.006, 0.0095], [-0.009, 0.012, -0.012, 0.009]];
  groups(bodyGeo, patterns[pattern]);
  const pairs = {
    red: [[C.body, C.bodyShade], [C.belly, C.bellyShade]],
    redwhite: [[C.body, C.bodyShade], [C.white, C.whiteShade]],
    calico: [[C.body, C.bodyShade], [C.white, C.whiteShade], [C.spot, C.spot]],
  }[pattern];
  const bodyMesh = kit.toon(bodyGeo, ...pairs[0]);
  bodyMesh.material = pairs.map(([b, s]) => kit.cel(b, s));
  bodyMesh.name = "body";
  bodyMesh.frustumCulled = false;
  bodyMesh.children.forEach((h) => (h.frustumCulled = false));
  fish.add(bodyMesh);
  const bodyRest = bodyGeo.attributes.position.array.slice();

  // ---------- the spine wave ----------
  const Z_HEAD = 0.0405, Z_ROOT = -0.029; // the tail sheets root here
  const W = { amp0: 0, amp1: 0, k: 0, ph: 0 }; // set per frame in pose()
  const sOf = (z) => (W.amp0 + W.amp1 * ((Z_HEAD - z) / 0.07) ** 2) * Math.sin(W.ph - W.k * (Z_HEAD - z));
  const slope = (z) => (sOf(z + 0.0005) - sOf(z - 0.0005)) / 0.001;
  // fish frame point -> swayed point (written into out)
  function warp(x, y, z, out) {
    const zz = Math.max(z, Z_ROOT), s = sOf(zz), a = Math.atan(slope(zz)), dz = z - zz;
    out[0] = s + x * Math.cos(a) + dz * Math.sin(a);
    out[1] = y;
    out[2] = zz - x * Math.sin(a) + dz * Math.cos(a);
    return out;
  }

  // ---------- two-layer fin sheets with banded colours ----------
  const FIN_T = -0.2;
  const finPairs = [[C.body, C.bodyShade], [C.finMid, C.finMidShade], [C.finEdge, C.finEdgeShade]];
  if (pattern !== "red") finPairs[0] = [C.body, C.bodyShade];
  const sheets = [];
  // grid(u, v, P) -> [x, y, z] in the fish frame; band(u, v) -> material index; u 0..nu, v 0..nv
  function sheet(name, nu, nv, grid, band, th = 0.00035) {
    const n1 = (nu + 1) * (nv + 1), id = (i, j) => i * (nv + 1) + j, quads = [[], [], []];
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = id(i, j), b = id(i + 1, j), c = id(i + 1, j + 1), d = id(i, j + 1);
      quads[band((i + 0.5) / nu, (j + 0.5) / nv)].push(a, b, c, a, c, d);
    }
    const one = quads.flat(), idx = [];
    const g = new THREE.BufferGeometry();
    g.clearGroups();
    let start = 0;
    quads.forEach((q, k) => { // layer A then layer B per band, so each group is one range
      idx.push(...q);
      for (let t = 0; t < q.length; t += 3) idx.push(q[t] + n1, q[t + 2] + n1, q[t + 1] + n1);
      g.addGroup(start, q.length * 2, k);
      start += q.length * 2;
    });
    for (const k of ["position", "normal", "hullNormal"]) g.setAttribute(k, new THREE.BufferAttribute(new Float32Array(n1 * 6), 3));
    g.setIndex(idx);
    const mesh = kit.toon(g, ...finPairs[0], { threshold: FIN_T });
    mesh.material = finPairs.map(([b, s]) => kit.cel(b, s, { threshold: FIN_T }));
    mesh.name = name;
    mesh.frustumCulled = false;
    mesh.children.forEach((h) => (h.frustumCulled = false));
    fish.add(mesh);
    const P = [], N = [], tmp = [0, 0, 0];
    for (let k = 0; k < n1; k++) { P.push(V()); N.push(V()); }
    const e1 = V(), e2 = V();
    function update() {
      for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
        const q = grid(i / nu, j / nv);
        warp(q[0], q[1], q[2], tmp);
        P[id(i, j)].set(tmp[0], tmp[1], tmp[2]);
        N[id(i, j)].set(0, 0, 0);
      }
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
  // radial bands: body colour near the root, pale toward the edge
  const bands = (r0, r1) => (u) => (u < r0 ? 0 : u < r1 ? 1 : 2);

  // Per-frame fin motion, set in pose(): F.<fin> = { a: amplitude, ph: phase }
  const F = { tail: { a: 0, ph: 0, k: 0 }, dorsal: { a: 0, ph: 0 }, pec: { a: 0, ph: 0 }, pel: { a: 0, ph: 0 }, anal: { a: 0, ph: 0 } };

  // TAIL: two fans (sx = +1 left, -1 right). u: root -> edge (radial), v: top edge -> bottom edge.
  const TR_TOP = 0.0062, TR_BOT = -0.0045; // tail root at Z_ROOT, inside the peduncle
  for (const sx of [1, -1]) {
    sheet(sx > 0 ? "tailL" : "tailR", 8, 12, (u, v) => {
      const th = (36 - 92 * v) * D;                           // fan angle from straight back, + up
      const w = Math.abs(2 * v - 1);                          // 0 at the notch, 1 at the lobe edges
      const f = w < 0.75 ? Math.sin((Math.PI / 2) * (w / 0.75)) ** 1.3 : 1 - 0.55 * ((w - 0.75) / 0.25) ** 2; // rounded lobes
      const L = (0.046 + (v < 0.5 ? 0.026 : 0.032) * f) * (1 + 0.035 * Math.sin(v * TAU * 3)); // notch 0.046, lobes 0.072 / 0.078, a frilled edge
      const d = L * u;
      const ry = TR_TOP + (TR_BOT - TR_TOP) * v;
      const yTop = TR_TOP + Math.sin(36 * D) * d;             // the joined top edge at this reach
      const h = ry + Math.sin(th) * d - yTop;                 // drop below the top edge (<= 0)
      const fold = 30 * D * v ** 0.8;                         // each fan opens outward like a book, joined on top
      let y = yTop + h * Math.cos(fold) - 0.8 * d * d;        // the long lobes droop
      let z = Z_ROOT - 0.001 - Math.cos(th) * d;
      let x = sx * (0.0006 - h * Math.sin(fold));
      const T = F.tail, fl = (d / 0.07) ** 1.4;
      x += T.a * fl * Math.sin(T.ph - T.k * d);               // the flowing wave rides on down the tail
      y += 0.3 * T.a * fl * (0.5 + 0.5 * Math.sin(T.ph - T.k * d + 1.2 + v * 2)) * (0.4 + v); // ripples lift, never sink
      return [x, y, z];
    }, bands(0.24, 0.6));
  }

  // DORSAL: u front -> back along the back, v base -> free edge
  sheet("dorsal", 8, 5, (u, v) => {
    const z0 = 0.009 - 0.031 * u;
    const H = 0.024 * (1 - u) ** 0.55 * (1 - 0.15 * u) + 0.002;
    const base = topY(z0) - 0.0012;
    const y = base + H * v;
    const z = z0 - (0.009 + 0.006 * u) * v ** 1.2;
    const x = F.dorsal.a * v ** 1.5 * Math.sin(F.dorsal.ph - 4 * u);
    return [x, y, z];
  }, (u, v) => (v < 0.3 ? 0 : v < 0.75 ? 1 : 2));

  // paired paddle fins: root R, chord direction e1, span direction e2 (fish frame, left side), flapped about e1
  function paddle(name, sx, R, e1, e2, chord, span, motion, sweep) {
    const a1 = V(...e1).normalize(), a2 = V(...e2).normalize();
    return sheet(name, 5, 4, (u, v) => {
      const M = F[motion], ang = sweep * M.a * Math.sin(M.ph);
      const s2 = a2.clone().applyAxisAngle(a1, ang);
      const n = V().crossVectors(a1, s2).normalize();
      const c = (u - 0.5) * chord * (0.55 + 0.9 * Math.sin(Math.PI * (0.25 + 0.6 * v))) * (1 - 0.35 * v ** 3);
      const s = span * v * (1 - 0.25 * (2 * u - 1) ** 2);
      const cup = 0.12 * span * v * v * Math.sin(M.ph - 2 * v) * M.a;
      const p = V(R[0], R[1], R[2]).addScaledVector(a1, c).addScaledVector(s2, s).addScaledVector(n, cup);
      return [sx * p.x, p.y, p.z];
    }, (u, v) => (v < 0.3 ? 0 : v < 0.75 ? 1 : 2));
  }
  for (const sx of [1, -1]) {
    const k = sx > 0 ? "L" : "R";
    paddle("pectoral" + k, sx, [0.0085, -0.0085, 0.017], [0, 1, 0.35], [0.45, -0.35, -1], 0.0065, 0.016, "pec", 1);
    paddle("pelvic" + k, sx, [0.0045, -0.0185, 0.002], [0, 0.25, 1], [0.35, -1, -0.6], 0.0075, 0.02, "pel", 0.6);
    paddle("anal" + k, sx, [0.0022, -0.0105, -0.018], [0, 0.3, 1], [0.3, -1, -0.8], 0.007, 0.017, "anal", 0.6);
  }

  // ---------- head: eyes, mouth, gill line (rigid, on the head joint) ----------
  const head = new THREE.Group();
  head.name = "head";
  const HEAD_Z = 0.026;
  head.userData.rest = V(0, 0, HEAD_Z);
  fish.add(head);
  joints.head = head;
  const onHead = (mesh, x, y, z) => { mesh.position.set(x, y, z - HEAD_Z); head.add(mesh); return mesh; };
  const EYE = { y: 0.0045, z: 0.0272, r: 0.0062 };
  for (const sx of [1, -1]) {
    const k = sx > 0 ? "L" : "R";
    const eye = new THREE.Group();
    eye.name = "eye" + k;
    const ex = sx * (surfX(EYE.y, EYE.z) - 0.0026);
    eye.position.set(ex, EYE.y, EYE.z - HEAD_Z);
    // face outward and a little forward and up
    const out = V(sx * 0.86, 0.12, 0.5).normalize();
    eye.quaternion.setFromUnitVectors(V(0, 0, 1), out);
    head.add(eye);
    joints["eye" + k] = eye;
    const ball = kit.toon(new THREE.SphereGeometry(EYE.r, 12, 8), C.eye, C.eyeShade, { threshold: -0.1 });
    ball.scale.set(1, 1, 0.62);
    ball.name = "eyeball" + k;
    eye.add(ball);
    const pupil = kit.toon(new THREE.SphereGeometry(EYE.r * 0.68, 10, 6), C.pupil, C.pupil, { outline: false });
    pupil.scale.set(1, 1, 0.3);
    pupil.position.z = EYE.r * 0.62 - EYE.r * 0.68 * 0.3 + 0.0006;
    pupil.name = "pupil" + k;
    eye.add(pupil);
    const glint = kit.toon(new THREE.SphereGeometry(EYE.r * 0.24, 8, 6), C.glint, C.glint, { outline: false });
    glint.scale.set(1, 1, 0.3);
    glint.position.set(EYE.r * 0.22 * sx, EYE.r * 0.3, EYE.r * 0.62 + 0.0004);
    glint.name = "glint" + k;
    eye.add(glint);
  }
  // mouth: a small dark pucker at the snout tip
  const mouth = kit.toon(new THREE.SphereGeometry(0.0021, 8, 5), C.pupil, C.pupil, { outline: false });
  mouth.scale.set(1.15, 0.75, 0.6);
  mouth.name = "mouth";
  onHead(mouth, 0, -0.0022, 0.0405);
  // gill cover line: a thin arc in body shade on each side
  for (const sx of [1, -1]) {
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8, y = 0.011 - 0.02 * t, z = 0.0195 + 0.004 * Math.sin(Math.PI * t) - 0.002 * t;
      pts.push(V(sx * (surfX(y, z) + 0.0002), y, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const line = kit.toon(new THREE.TubeGeometry(curve, 10, 0.00045, 4, false), C.bodyShade, C.bodyShade, { outline: false });
    line.name = "gill" + (sx > 0 ? "L" : "R");
    onHead(line, 0, 0, 0);
  }

  // ---------- marker joints for fins (positions follow the spine; the sheets are rebuilt from the same warp) ----------
  const marks = { dorsal: [0, 0.026, 0.0], pectoralL: [0.0085, -0.0085, 0.017], pectoralR: [-0.0085, -0.0085, 0.017],
    pelvicL: [0.0045, -0.0185, 0.002], pelvicR: [-0.0045, -0.0185, 0.002], analL: [0.0022, -0.0105, -0.018],
    analR: [-0.0022, -0.0105, -0.018], tail: [0, 0.001, Z_ROOT] };
  for (const [k, p] of Object.entries(marks)) {
    const g = new THREE.Group();
    g.name = k;
    g.userData.rest = V(...p);
    fish.add(g);
    joints[k] = g;
  }

  // ---------- clips and poses ----------
  // A clip row: seconds T, spine amp0 (head) / amp1 (tail root) in metres, spine wave number k (rad/m), and per fin
  // amplitude a and phase lag (cycles). Tail a is a lateral offset at the tip (m); paddle a is a flap angle (rad);
  // dorsal a is a lateral offset at the edge (m). Every fin cycles an integer number of times per clip, so it loops.
  const CLIPS = {
    swim: { T: 0.8, amp0: 0.0012, amp1: 0.0065, k: 45, tail: { a: 0.011, lag: 0.15, k: 55 }, dorsal: { a: 0.003, lag: 0.1 },
      pec: { a: 0.45, lag: 0, n: 1 }, pel: { a: 0.2, lag: 0.3, n: 1 }, anal: { a: 0.2, lag: 0.4, n: 1 } },
    idle: { T: 2.4, amp0: 0.0003, amp1: 0.0016, k: 35, tail: { a: 0.0045, lag: 0.2, k: 45 }, dorsal: { a: 0.0015, lag: 0.15 },
      pec: { a: 0.55, lag: 0, n: 3 }, pel: { a: 0.25, lag: 0.25, n: 2 }, anal: { a: 0.25, lag: 0.5, n: 2 } },
  };
  const clips = Object.fromEntries(Object.entries(CLIPS).map(([k, c]) => [k, c.T]));
  const POSES = { rest: null, "swim-a": ["swim", 0.2], "swim-b": ["swim", 0.6], idle: ["idle", 0.3] };

  const tmp = [0, 0, 0];
  function apply(clip, t) {
    const c = clip ? CLIPS[clip] : null;
    const ph = c ? TAU * (((t % c.T) + c.T) % c.T) / c.T : 0;
    W.amp0 = c ? c.amp0 : 0; W.amp1 = c ? c.amp1 : 0; W.k = c ? c.k : 0; W.ph = ph;
    for (const f of ["tail", "dorsal", "pec", "pel", "anal"]) {
      F[f].a = c ? c[f].a : 0;
      F[f].ph = c ? (c[f].n ?? 1) * ph - TAU * c[f].lag : 0;
      if (f === "tail") F[f].k = c ? c.tail.k : 0;
    }
    // body vertices
    const pos = bodyGeo.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      warp(bodyRest[i], bodyRest[i + 1], bodyRest[i + 2], tmp);
      pos[i] = tmp[0]; pos[i + 1] = tmp[1]; pos[i + 2] = tmp[2];
    }
    bodyGeo.attributes.position.needsUpdate = true;
    bodyGeo.computeVertexNormals();
    if (bodyGeo.attributes.hullNormal) {
      bodyGeo.attributes.hullNormal.array.set(bodyGeo.attributes.normal.array); // seam-free loft: hull normal = normal
      bodyGeo.attributes.hullNormal.needsUpdate = true;
    }
    bodyGeo.computeBoundingSphere();
    bodyGeo.computeBoundingBox();
    // joints ride the spine
    for (const j of Object.values(joints)) {
      if (!j.userData.rest || j.parent !== fish) continue;
      const r = j.userData.rest;
      warp(r.x, r.y, r.z, tmp);
      j.position.set(tmp[0], tmp[1], tmp[2]);
      j.rotation.set(0, Math.atan(slope(Math.max(r.z, Z_ROOT))), 0);
    }
    for (const u of sheets) u();
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`goldfish: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      return apply(m[1], +m[2]);
    }
    if (!(name in POSES)) throw new Error(`goldfish: unknown pose "${name}" (${Object.keys(POSES).join(", ")})`);
    const p = POSES[name];
    if (p) apply(p[0], p[1] * CLIPS[p[0]].T); else apply(null, 0);
  }

  // rest bbox -> sit the lowest point on y = 0, centre on z = 0, then size
  apply(null, 0);
  const box = new THREE.Box3().setFromObject(fish, true);
  fish.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  const restH = box.max.y - box.min.y, restL = box.max.z - box.min.z;
  space.scale.setScalar(opts.height ? opts.height / restH : opts.length ? opts.length / restL : 1);
  pose("rest");
  return { root, joints, pose, clips };
}
