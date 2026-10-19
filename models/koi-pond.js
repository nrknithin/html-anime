// koi-pond.js — a nishikigoi (ornamental carp) for shrine and garden ponds, procedural, animated. Contract:
// harness/lab/README.md. Metres, +Y up, faces +Z, its left is +X, lowest rest point on y = 0 (a fish has no ground:
// like the library fish, a film lifts it into the water), centred on x = 0, z = 0.
//
// CONSTRUCTION. Everything is authored STRAIGHT, in one frame where the fish lies along z (snout z = +0.28), and is
// then bent onto a swimming spine every pose. s = 0.28 - z is the distance from the snout. The spine is a heading
// angle theta(s) integrated along s (X += sin, Z -= cos), recentred on the body's area-weighted centre so the fish
// recoils around its middle instead of swinging from the nose. A straight-frame point (x, y, z) maps to
// C(s) + x * N(s) + y * up, N = (cos theta, 0, sin theta) its left; normals turn with N. So:
//   BODY      one closed superellipse loft, 37 rings x 20 (round nose cap over the first 9 % of SL, a broad back,
//             the caudal peduncle flattening into a blade that ends inside the tail root), rewritten per pose.
//   PATCHES   the pattern. Each patch is a polar grid laid on the body's own surface function surf(t, a) and lifted
//             1.6 mm along its normal (sumi spots 2.6 mm), 4-5 rings deep so no chord dips under the skin. Its edge
//             is a smooth wobbly curve, not a ring staircase, and it bends with the skin it sits on. No hull:
//             patches separate by colour only.
//   FINS      dorsal (long, high leading ray, concave edge), anal, forked tail: two-layer sheets (geometry.md
//             `sheet`) whose straight-frame grids are bent with the body. Pectorals and pelvics are rigid sheets on
//             pivots seated on the flank; they scull by rotation.
//   HEAD      lips (a small ellipsoid at the subterminal mouth) with a dark slot, two pairs of tapered barbels
//             (corner pair long, upper-lip pair short), gold-ringed eyes with navy pupils, all on one rigid joint.
// PROPORTIONS (base unit standard length SL = 0.45 m, snout to tail root; total length L = 0.56 m): max depth 0.127 m
//   (0.28 SL) at t = 0.40, max width 0.108 m (0.24 SL) at t = 0.30, gill line t ~0.21, eye at t = 0.085, dorsal fin
//   t 0.40-0.78 with a 0.05 m leading ray, pectorals at t = 0.24 (span 0.078 m), pelvics t = 0.52, anal t 0.80,
//   tail lobes +-0.078 m, fork notch 0.06 m deep. Height 0.199 m to the dorsal tip; ~3.9-4.4k triangles by variety.
// ANIMATION. clips (seconds): swim 1.0 loop (a travelling S-wave, amplitude 0.015 L at the head to 0.115 L at the
//   tail, wavelength 1.0 L; pectorals scull), idle 3.0 loop (slow tail sway, wavelength 1.3 L, pectoral flutter three
//   times, left/right out of phase), turn 1.2 one-shot (the heading change runs from head to tail through a C-bend,
//   ending 100 deg to its left, pivoting in place). pose("swim@0.25") is absolute; held drawings "swim" (= swim@0.25),
//   "idle" (idle@0.75), "turn" (turn@0.5, the C). Fin pivots: rz tilts a fin down from horizontal (- on the left),
//   ry sweeps it back (+ on the left); the right side mirrors ry and rz. build() also returns clips {name: seconds}
//   as library entries do, so the lab plays it: --clip swim --frames 8, --strip idle.
// VARIETIES. build(THREE, kit, colors, { variety }) with "kohaku" (default: white, four red patches), "sanke"
//   (kohaku + small sumi spots on the back, none on the head), "showa" (sumi body with red and white patches),
//   "ogon" (solid gold, gold fins).
// COLOURS (script "indigo", ink #101628): body sclera #f6f3ee / moon #d5e2ff (white that shades cool, as in water);
//   hi (red) iris #e7a04a / accent #e23b4a (orange-red lit, red in shade); sumi sky #1b2d6b single tone (navy-black,
//   lighter than ink); gold practical #f0c36a / iris #e7a04a; fins line #e7eefc / moon; eye ring practical / iris,
//   pupil and mouth sky.

export const meta = {
  name: "koi-pond",
  height: 0.199,
  script: "indigo",
  colors: {
    body: "#f6f3ee", bodyShade: "#d5e2ff",
    hi: "#e7a04a", hiShade: "#e23b4a",
    sumi: "#1b2d6b", sumiShade: "#1b2d6b",
    gold: "#f0c36a", goldShade: "#e7a04a",
    fin: "#e7eefc", finShade: "#d5e2ff",
    eye: "#f0c36a", eyeShade: "#e7a04a",
    pupil: "#1b2d6b",
  },
  poses: ["rest", "swim", "idle", "turn"],
  clips: { swim: { seconds: 1.0, loop: true }, idle: { seconds: 3.0, loop: true }, turn: { seconds: 1.2, loop: false } },
};

const L = 0.56, SL = 0.45, ZS = 0.28, DEG = Math.PI / 180, TAU = Math.PI * 2;
// Base cross-section stations over t = s / SL (metres); the nose cap rounds the first NOSE of them to a point.
const T = [0, 0.05, 0.12, 0.2, 0.3, 0.4, 0.55, 0.7, 0.85, 0.94, 1.0, 1.04];
const HT = [0.03, 0.037, 0.047, 0.057, 0.064, 0.066, 0.06, 0.047, 0.033, 0.026, 0.023, 0.012]; // centre to back
const HB = [0.024, 0.03, 0.04, 0.051, 0.059, 0.061, 0.054, 0.039, 0.027, 0.022, 0.02, 0.01]; // centre to belly
const HW = [0.03, 0.035, 0.043, 0.05, 0.054, 0.053, 0.045, 0.031, 0.017, 0.009, 0.005, 0.002]; // half width
const YC = [-0.01, -0.007, -0.003, 0, 0, 0, 0.001, 0.002, 0.003, 0.004, 0.004, 0.004]; // centre line
const NOSE = 0.09;
// Patterns: [t, a, rt, ra, wobble phase]; a = angle round the body from the top (+ toward its left, +X).
const PATTERNS = {
  kohaku: { hi: [[0.13, 0.05, 0.068, 1.12, 0.3], [0.37, 0.22, 0.12, 1.5, 1.7], [0.6, -0.25, 0.08, 1.35, 2.9], [0.83, 0.1, 0.068, 1.3, 4.1]] },
  sanke: {
    hi: [[0.13, 0.05, 0.068, 1.12, 0.3], [0.37, 0.22, 0.12, 1.5, 1.7], [0.6, -0.25, 0.08, 1.35, 2.9], [0.83, 0.1, 0.068, 1.3, 4.1]],
    sumi: [[0.3, -0.55, 0.022, 0.32, 0.5], [0.42, 0.75, 0.018, 0.28, 1.1], [0.5, -0.1, 0.02, 0.3, 2.2], [0.68, 0.45, 0.022, 0.3, 3.3], [0.74, -0.7, 0.016, 0.26, 4.4], [0.9, -0.2, 0.015, 0.24, 5.5]],
  },
  showa: {
    hi: [[0.12, 0.0, 0.07, 1.05, 0.9], [0.4, -0.3, 0.12, 1.2, 2.3], [0.76, 0.35, 0.09, 1.05, 3.7]],
    white: [[0.27, 1.25, 0.06, 0.7, 1.4], [0.55, 1.05, 0.07, 0.8, 0.2], [0.6, -1.35, 0.08, 0.75, 4.8], [0.22, -1.4, 0.05, 0.6, 2.6], [0.9, -1.0, 0.04, 0.6, 3.1]],
  },
  ogon: {},
};
const SWIM = { T: 1.0, lam: 1.0 * L, a0: 0.015 * L, a1: 0.1 * L };
const IDLE = { T: 3.0, lam: 1.3 * L, a0: 0.004 * L, a1: 0.035 * L };
const TURN = { T: 1.2, angle: -100 * DEG }; // negative heading = the head swings to its left (+X)

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const variety = opts.variety || "kohaku";
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const spow = (v, e) => Math.sign(v) * Math.abs(v) ** e;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const root = new THREE.Group();
  root.name = "koi";
  const space = new THREE.Group(); // lifted so the lowest rest point is y = 0
  space.name = "space";
  root.add(space);
  const joints = {};

  // ---------- profile and surface (straight frame) ----------
  function herm(ys, t) {
    const n = T.length;
    t = clamp(t, T[0], T[n - 1]);
    let i = 0;
    while (i < n - 2 && t > T[i + 1]) i++;
    const m = (k) => (k <= 0 ? (ys[1] - ys[0]) / (T[1] - T[0]) : k >= n - 1 ? (ys[n - 1] - ys[n - 2]) / (T[n - 1] - T[n - 2]) : (ys[k + 1] - ys[k - 1]) / (T[k + 1] - T[k - 1]));
    const h = T[i + 1] - T[i], u = (t - T[i]) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * m(i) + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * m(i + 1);
  }
  const prof = (t) => {
    const k = t >= NOSE ? 1 : Math.sqrt(Math.max(0, 1 - (1 - t / NOSE) ** 2));
    return { yc: herm(YC, t), ht: herm(HT, t) * k, hb: herm(HB, t) * k, hw: herm(HW, t) * k };
  };
  // point on the skin at (t, a): a = 0 top, +pi/2 its left flank, pi the belly
  function pt(t, a) {
    const p = prof(t), sa = Math.sin(a), ca = Math.cos(a);
    return V(p.hw * spow(sa, 2 / 2.3), p.yc + (ca >= 0 ? p.ht * spow(ca, 2 / 2.4) : p.hb * spow(ca, 2 / 2.1)), ZS - t * SL);
  }
  function surf(t, a, off = 0) {
    const e = 1e-3, p = pt(t, a);
    const dt = pt(t + e, a).sub(pt(t - e, a)), da = pt(t, a + e).sub(pt(t, a - e));
    const n = V().crossVectors(da, dt).normalize();
    return p.addScaledVector(n, off);
  }
  const normalAt = (t, a) => surf(t, a, 1).sub(surf(t, a, 0)).normalize();

  // ---------- geometry helpers ----------
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
      const a = idx[i] * 3, b = idx[i + 1] * 3, d = idx[i + 2] * 3;
      v += pos[a] * (pos[b + 1] * pos[d + 2] - pos[b + 2] * pos[d + 1]) - pos[a + 1] * (pos[b] * pos[d + 2] - pos[b + 2] * pos[d]) + pos[a + 2] * (pos[b] * pos[d + 1] - pos[b + 1] * pos[d]);
    }
    if (v < 0) for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    return geom(pos, idx);
  }
  function skin(rings, dome = 0.5) {
    const seg = rings[0].length, R = rings.length, pos = rings.flat(2), idx = [];
    for (let i = 0; i < R - 1; i++)
      for (let j = 0; j < seg; j++) {
        const a = i * seg + j, b = i * seg + ((j + 1) % seg), cc = (i + 1) * seg + j, d = (i + 1) * seg + ((j + 1) % seg);
        idx.push(a, b, cc, b, d, cc);
      }
    const mid = (r) => r.reduce((s, p) => [s[0] + p[0] / seg, s[1] + p[1] / seg, s[2] + p[2] / seg], [0, 0, 0]);
    for (const [k, nb, first] of [[0, 1, true], [R - 1, R - 2, false]]) {
      const m = mid(rings[k]), n = mid(rings[nb]);
      const d = [m[0] - n[0], m[1] - n[1], m[2] - n[2]], dl = Math.hypot(...d) || 1;
      const rad = rings[k].reduce((s, p) => s + Math.hypot(p[0] - m[0], p[1] - m[1], p[2] - m[2]), 0) / seg;
      const cIdx = pos.length / 3;
      pos.push(...m.map((v, i) => v + (d[i] / dl) * rad * dome));
      for (let j = 0; j < seg; j++) {
        const a = k * seg + j, b = k * seg + ((j + 1) % seg);
        if (first) idx.push(cIdx, b, a); else idx.push(cIdx, a, b);
      }
    }
    return solid(pos, idx);
  }
  // two-layer sheet (geometry.md): grid(i, j) -> Vector3; update() rebuilds it.
  function sheet(nu, nv, base, shade, grid, th = 0.0018, threshold = 0.35) {
    const n1 = (nu + 1) * (nv + 1), id = (i, j) => i * (nv + 1) + j, one = [];
    for (let i = 0; i < nu; i++)
      for (let j = 0; j < nv; j++) {
        const a = id(i, j), b = id(i + 1, j), cc = id(i + 1, j + 1), d = id(i, j + 1);
        one.push(a, b, cc, a, cc, d);
      }
    const idx = [...one];
    for (let k = 0; k < one.length; k += 3) idx.push(one[k] + n1, one[k + 2] + n1, one[k + 1] + n1);
    const g = new THREE.BufferGeometry();
    for (const k of ["position", "normal", "hullNormal"]) g.setAttribute(k, new THREE.BufferAttribute(new Float32Array(n1 * 6), 3));
    g.setIndex(idx);
    const mesh = kit.toon(g, base, shade, { threshold });
    mesh.frustumCulled = false;
    const P = [], N = [];
    function update() {
      for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { P[id(i, j)] = grid(i, j); N[id(i, j)] = V(); }
      const e1 = V(), e2 = V();
      for (let k = 0; k < one.length; k += 3) {
        const [a, b, cc] = [one[k], one[k + 1], one[k + 2]];
        e1.subVectors(P[b], P[a]).cross(e2.subVectors(P[cc], P[a]));
        N[a].add(e1); N[b].add(e1); N[cc].add(e1);
      }
      const pos = g.attributes.position.array, nor = g.attributes.normal.array, hul = g.attributes.hullNormal.array;
      for (let i = 0; i <= nu; i++)
        for (let j = 0; j <= nv; j++) {
          const v = id(i, j), n = N[v].lengthSq() > 1e-14 ? N[v].normalize() : V(0, 1, 0);
          const ii = clamp(i, 1, nu - 1), jj = clamp(j, 1, nv - 1);
          const o = P[v].clone().sub(P[id(ii, jj)]);
          o.addScaledVector(n, -o.dot(n));
          const rim = (ii !== i || jj !== j) && o.lengthSq() > 1e-14;
          if (rim) o.normalize();
          for (const [Lo, sg] of [[0, 1], [n1, -1]]) {
            const t = (v + Lo) * 3, h = rim ? o.clone().addScaledVector(n, 0.35 * sg).normalize() : n.clone().multiplyScalar(sg);
            pos[t] = P[v].x + n.x * th * sg; pos[t + 1] = P[v].y + n.y * th * sg; pos[t + 2] = P[v].z + n.z * th * sg;
            nor[t] = n.x * sg; nor[t + 1] = n.y * sg; nor[t + 2] = n.z * sg;
            hul[t] = h.x; hul[t + 1] = h.y; hul[t + 2] = h.z;
          }
        }
      for (const k of ["position", "normal", "hullNormal"]) g.attributes[k].needsUpdate = true;
      g.computeBoundingSphere();
    }
    return { mesh, update };
  }

  // ---------- the spine ----------
  const NS = 96, SMAX = L + 0.02, DS = SMAX / (NS - 1);
  const SX = new Float64Array(NS), SZ = new Float64Array(NS), STH = new Float64Array(NS), WGT = new Float64Array(NS);
  for (let k = 0; k < NS; k++) {
    const t = (k * DS) / SL, p = prof(Math.min(t, 1.04));
    WGT[k] = t <= 1 ? p.hw * (p.ht + p.hb) : 0;
  }
  const WSUM = WGT.reduce((a, b) => a + b, 0);
  const RESTZ = WGT.reduce((a, w, k) => a + w * (ZS - k * DS), 0) / WSUM;
  function setSpine(theta) {
    let x = 0, z = ZS;
    for (let k = 0; k < NS; k++) {
      const s = k * DS;
      STH[k] = theta(s);
      if (k > 0) {
        const tm = (STH[k] + STH[k - 1]) / 2;
        x += Math.sin(tm) * DS;
        z -= Math.cos(tm) * DS;
      }
      SX[k] = x; SZ[k] = z;
    }
    let mx = 0, mz = 0;
    for (let k = 0; k < NS; k++) { mx += WGT[k] * SX[k]; mz += WGT[k] * SZ[k]; }
    mx /= WSUM; mz = mz / WSUM - RESTZ;
    for (let k = 0; k < NS; k++) { SX[k] -= mx; SZ[k] -= mz; }
  }
  const frame = { x: 0, z: 0, th: 0 };
  function at(s) {
    const sc = clamp(s, 0, SMAX), f = sc / DS, k = Math.min(NS - 2, Math.floor(f)), u = f - k;
    frame.th = STH[k] + (STH[k + 1] - STH[k]) * u;
    const ex = s - sc; // beyond the ends: straight along the end tangent
    frame.x = SX[k] + (SX[k + 1] - SX[k]) * u + Math.sin(frame.th) * ex;
    frame.z = SZ[k] + (SZ[k + 1] - SZ[k]) * u - Math.cos(frame.th) * ex;
    return frame;
  }
  const bendTo = (out, x, y, z) => {
    const f = at(ZS - z), co = Math.cos(f.th), si = Math.sin(f.th);
    return out.set(f.x + x * co, y, f.z + x * si);
  };
  const bend = (p) => bendTo(V(), p.x, p.y, p.z);

  // A deformable mesh: rest positions in the straight frame, rewritten through the spine, normals recomputed.
  const deform = [];
  function bendable(g, mesh, hullIsNormal) {
    const rest = Float32Array.from(g.attributes.position.array);
    mesh.frustumCulled = false;
    deform.push({ g, rest, hullIsNormal });
    return mesh;
  }
  const tmp = V();
  function applyBend() {
    for (const { g, rest, hullIsNormal } of deform) {
      const p = g.attributes.position.array;
      for (let i = 0; i < rest.length; i += 3) {
        bendTo(tmp, rest[i], rest[i + 1], rest[i + 2]);
        p[i] = tmp.x; p[i + 1] = tmp.y; p[i + 2] = tmp.z;
      }
      g.attributes.position.needsUpdate = true;
      g.computeVertexNormals();
      if (hullIsNormal && g.attributes.hullNormal) {
        g.attributes.hullNormal.array.set(g.attributes.normal.array);
        g.attributes.hullNormal.needsUpdate = true;
      }
      g.computeBoundingSphere();
    }
    for (const f of sheets) f.update();
    for (const [j, s] of riders) {
      const f = at(s);
      j.position.set(f.x, 0, f.z);
      j.rotation.set(0, -f.th, 0);
    }
  }
  const sheets = [];
  const riders = []; // [group, s]: rigid parts that ride the spine at one station
  function rider(name, s) {
    const g = new THREE.Group();
    g.name = name;
    space.add(g);
    riders.push([g, s]);
    if (name) joints[name] = g;
    return g;
  }
  // local coordinates in a rider at station s0, from a straight-frame point
  const local = (p, s0) => V(p.x, p.y, p.z - (ZS - s0));

  // ---------- colours by variety ----------
  const ogon = variety === "ogon", showa = variety === "showa";
  const skinPair = ogon ? [c.gold, c.goldShade] : showa ? [c.sumi, c.sumiShade] : [c.body, c.bodyShade];
  const finPair = ogon ? [c.gold, c.goldShade] : [c.fin, c.finShade];
  const pattern = PATTERNS[variety] || PATTERNS.kohaku;

  // ---------- body ----------
  const TS = [0.004, 0.012, 0.025, 0.045, 0.07, 0.1];
  for (let t = 0.13; t < 0.995; t += 0.03) TS.push(+t.toFixed(3));
  TS.push(1.0, 1.02, 1.035);
  const NA = 20;
  const rings = TS.map((t) => Array.from({ length: NA }, (_, j) => pt(t, (j / NA) * TAU).toArray()));
  const bodyG = skin(rings, 0.5);
  const body = kit.toon(bodyG, skinPair[0], skinPair[1], { threshold: 0.25 });
  body.name = "body";
  space.add(bendable(bodyG, body, true));

  // ---------- patches ----------
  function patch([tc, ac, rt, ra, ph], base, shade, lift) {
    const small = ra < 0.5, NR = small ? 2 : ra >= 1.3 ? 5 : 4, NP = small ? 14 : 22, pos = [], idx = [];
    const R = (f) => 1 + 0.13 * Math.sin(3 * f + ph) + 0.07 * Math.sin(5 * f + 2 * ph) + 0.04 * Math.sin(7 * f + 3 * ph);
    const P0 = surf(tc, ac, lift);
    pos.push(P0.x, P0.y, P0.z);
    for (let r = 1; r <= NR; r++)
      for (let k = 0; k < NP; k++) {
        const f = (k / NP) * TAU, q = (r / NR) * R(f);
        const p = surf(clamp(tc + q * rt * Math.cos(f), 0.02, 1.0), ac + q * ra * Math.sin(f), lift);
        pos.push(p.x, p.y, p.z);
      }
    const id = (r, k) => (r === 0 ? 0 : 1 + (r - 1) * NP + (k % NP));
    for (let k = 0; k < NP; k++) idx.push(0, id(1, k), id(1, k + 1));
    for (let r = 1; r < NR; r++)
      for (let k = 0; k < NP; k++) idx.push(id(r, k), id(r + 1, k), id(r + 1, k + 1), id(r, k), id(r + 1, k + 1), id(r, k + 1));
    // winding from the surface: the first triangle must face along the outward normal
    const a = V(...pos.slice(0, 3)), b = V(...pos.slice(3, 6)), d = V(...pos.slice(6, 9));
    if (V().crossVectors(b.sub(a), d.sub(a)).dot(normalAt(tc, ac)) < 0) for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    const g = geom(pos, idx);
    const m = kit.toon(g, base, shade, { threshold: 0.25, outline: false });
    m.name = "patch";
    space.add(bendable(g, m, false));
  }
  for (const p of pattern.white || []) patch(p, c.body, c.bodyShade, 0.0016);
  for (const p of pattern.hi || []) patch(p, c.hi, c.hiShade, 0.0016);
  for (const p of pattern.sumi || []) patch(p, c.sumi, c.sumiShade, 0.0026);
  // gill-cover line: a 2 mm navy strip laid on the skin along a crescent (convex toward the tail), both sides
  for (const sd of [1, -1]) {
    const N = 14, pos = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const a = 0.75 + (1.75 * i) / N, tg = 0.21 - 0.03 * ((a - 1.55) / 0.85) ** 2, w = 0.0036 * Math.sin((Math.PI * (i + 0.6)) / (N + 1.2));
      for (const dt of [-w, w]) { const p = surf(tg + dt, a * sd, 0.0022); pos.push(p.x, p.y, p.z); }
      if (i < N) idx.push(2 * i, 2 * i + 1, 2 * i + 3, 2 * i, 2 * i + 3, 2 * i + 2);
    }
    const a0 = V(...pos.slice(0, 3)), b0 = V(...pos.slice(3, 6)), d0 = V(...pos.slice(9, 12));
    if (V().crossVectors(b0.sub(a0), d0.sub(a0)).dot(normalAt(0.17, 1.5 * sd)) < 0) for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    const g = geom(pos, idx);
    const m = kit.toon(g, c.pupil, c.pupil, { outline: false });
    m.name = "gill";
    space.add(bendable(g, m, false));
  }

  // ---------- vertical fins: straight-frame grids bent with the body ----------
  const top = (t) => { const p = prof(t); return p.yc + p.ht; };
  const bot = (t) => { const p = prof(t); return p.yc - p.hb; };
  const zOf = (t) => ZS - t * SL;
  function bentSheet(name, nu, nv, gridRest, th) {
    const f = sheet(nu, nv, finPair[0], finPair[1], (i, j) => bend(gridRest(i, j)), th, 0.3);
    f.mesh.name = name;
    space.add(f.mesh);
    sheets.push(f);
    return f;
  }
  // dorsal: root t 0.40-0.78 buried 6 mm; edge from the leading ray tip (t 0.44, +50 mm) back to t 0.80
  bentSheet("dorsal", 14, 3, (i, j) => {
    const u = i / 14, v = j / 3;
    const tr = 0.4 + 0.38 * u, te = 0.44 + 0.36 * u ** 0.9;
    const yr = top(tr) - 0.006, ye = top(te) + 0.05 * (1 - u) ** 1.5 + 0.004 * u + 0.006 * Math.sin(Math.PI * u) * (1 - u);
    return V(0, yr + (ye - yr) * v, zOf(tr + (te - tr) * v));
  }, 0.001);
  // anal: under the belly, t 0.78-0.88
  bentSheet("anal", 5, 2, (i, j) => {
    const u = i / 5, v = j / 2;
    const tr = 0.78 + 0.1 * u, te = 0.81 + 0.1 * u;
    const yr = bot(tr) + 0.005, ye = bot(te) - 0.03 * (1 - u) ** 1.2 - 0.003;
    return V(0, yr + (ye - yr) * v, zOf(tr + (te - tr) * v));
  }, 0.0016);
  // tail: root at the peduncle (s 0.425), two lobes to s ~0.555, fork notch at s 0.50
  bentSheet("tail", 16, 3, (i, j) => {
    const w = i / 8 - 1, aw = Math.abs(w), v = j / 3;
    const sr = 0.425, yr = 0.004 + w * 0.02;
    const se = 0.5 + 0.068 * aw ** 1.35 - 0.022 * Math.max(0, (aw - 0.78) / 0.22) ** 2, ye = 0.004 + Math.sign(w) * 0.078 * Math.sin((aw * Math.PI) / 2) ** 0.85;
    return V(0, yr + (ye - yr) * v, ZS - (sr + (se - sr) * v));
  }, 0.0018);

  // ---------- paired fins: rigid sheets on pivots ----------
  function pairedFin(name, t, a, span, sweep, wRoot, wGrow) {
    for (const side of [1, -1]) {
      const s0 = t * SL, seat = surf(t, a * side, -0.003);
      const r = rider(null, s0);
      const pivot = new THREE.Group();
      pivot.name = name + (side > 0 ? "L" : "R");
      pivot.position.copy(local(seat, s0));
      r.add(pivot);
      joints[pivot.name] = pivot;
      const f = sheet(10, 4, finPair[0], finPair[1], (i, j) => {
        const u = i / 10, v = j / 2 - 1;
        const hw = (wRoot + wGrow * u) * Math.sqrt(Math.max(0, 1 - (Math.max(0, u - 0.5) / 0.5) ** 2)) + 0.0015;
        return V(side * u * span, 0, -sweep * u * span + v * hw);
      }, 0.0015, 0.3);
      f.update();
      f.mesh.name = name;
      pivot.add(f.mesh);
    }
  }
  pairedFin("pec", 0.24, 2.15, 0.078, 0.45, 0.013, 0.042);
  pairedFin("pelvic", 0.52, 2.75, 0.048, 0.9, 0.006, 0.016);

  // ---------- head: lips, mouth, barbels, eyes ----------
  const HS = 0.04; // head rider station
  const head = rider("head", HS);
  const hl = (x, y, z) => local(V(x, y, z), HS);
  const ellip = (rx, ry, rz, w = 10, h = 7) => {
    const g = new THREE.SphereGeometry(1, w, h);
    g.scale(rx, ry, rz);
    return g;
  };
  const yMouth = prof(0).yc - 0.006;
  const lips = kit.toon(ellip(0.012, 0.0085, 0.009), skinPair[0], skinPair[1], { threshold: 0.25 });
  lips.name = "lips";
  lips.position.copy(hl(0, yMouth, ZS - 0.004));
  head.add(lips);
  const slot = kit.toon(ellip(0.0075, 0.0028, 0.002, 8, 5), c.pupil, c.pupil, { outline: false });
  slot.name = "mouth";
  slot.position.copy(hl(0, yMouth - 0.001, ZS + 0.0045));
  head.add(slot);
  function barbel(pts, r0, r1) {
    const P = pts.map((p) => hl(...p));
    const rs = [];
    for (let i = 0; i < P.length; i++) {
      const tg = P[Math.min(i + 1, P.length - 1)].clone().sub(P[Math.max(i - 1, 0)]).normalize();
      const s1 = V().crossVectors(tg, Math.abs(tg.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0)).normalize(), s2 = V().crossVectors(tg, s1);
      const r = r0 + (r1 - r0) * (i / (P.length - 1));
      rs.push(Array.from({ length: 6 }, (_, k) => { const q = (k / 6) * TAU; return P[i].clone().addScaledVector(s1, Math.cos(q) * r).addScaledVector(s2, Math.sin(q) * r).toArray(); }));
    }
    const m = kit.toon(skin(rs, 0.6), skinPair[0], skinPair[1], { threshold: 0.25, px: 3 });
    m.name = "barbel";
    head.add(m);
  }
  for (const sd of [1, -1]) {
    const x0 = 0.009 * sd;
    barbel([[x0, yMouth - 0.002, ZS - 0.008], [x0 + 0.008 * sd, yMouth - 0.01, ZS - 0.012], [x0 + 0.014 * sd, yMouth - 0.02, ZS - 0.02], [x0 + 0.017 * sd, yMouth - 0.027, ZS - 0.03]], 0.0024, 0.0013);
    barbel([[0.006 * sd, yMouth + 0.005, ZS - 0.002], [0.011 * sd, yMouth + 0.0, ZS + 0.004], [0.016 * sd, yMouth - 0.006, ZS + 0.008]], 0.0019, 0.0011);
  }
  for (const sd of [1, -1]) {
    const te = 0.085, ae = 1.2 * sd, n = normalAt(te, ae);
    const eye = new THREE.Group();
    eye.name = sd > 0 ? "eyeL" : "eyeR";
    eye.position.copy(local(surf(te, ae, -0.002), HS));
    eye.quaternion.setFromUnitVectors(V(0, 0, 1), n);
    head.add(eye);
    joints[eye.name] = eye;
    const ball = kit.toon(ellip(0.0088, 0.0088, 0.005, 10, 6), c.eye, c.eyeShade, { threshold: 0.1, px: 3 });
    ball.name = "eye";
    eye.add(ball);
    const pupil = kit.toon(ellip(0.0052, 0.0052, 0.002, 8, 5), c.pupil, c.pupil, { outline: false });
    pupil.name = "pupil";
    pupil.position.z = 0.0042;
    eye.add(pupil);
  }

  // ---------- poses and clips ----------
  // theta(s): heading of the spine tangent toward the tail; theta > 0 moves the points behind s toward its left (+X)
  const wave = (W, tau) => (s) => {
    const A = (x) => (W.a0 + W.a1 * (Math.max(0, x) / L) ** 2.5) * Math.sin(TAU * (tau / W.T) - (TAU * x) / W.lam);
    const e = 0.002;
    return Math.atan((A(s + e) - A(s - e)) / (2 * e));
  };
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const FIN0 = { pec: [0, -4, -28], pelvic: [0, 0, -45] }; // [rx, ry, rz] deg, left side; ry+ sweeps back, rz- tilts down
  function fins(table) {
    for (const [k, [rx, ry, rz]] of Object.entries(table)) {
      joints[k + "L"].rotation.set(rx * DEG, ry * DEG, rz * DEG);
      joints[k + "R"].rotation.set(rx * DEG, -ry * DEG, -rz * DEG);
    }
  }
  const clipLen = { swim: SWIM.T, idle: IDLE.T, turn: TURN.T };
  function pose(name) {
    const held = { swim: "swim@0.25", idle: "idle@0.75", turn: "turn@0.5" };
    if (held[name]) name = held[name];
    let theta = () => 0, finT = { ...FIN0 };
    let finR = null;
    const m = /^(swim|idle|turn)@(-?[\d.]+)$/.exec(name);
    if (m) {
      const clip = m[1], len = clipLen[clip];
      let tau = +m[2];
      tau = clip === "turn" ? clamp(tau, 0, len) : ((tau % len) + len) % len;
      const ph = TAU * (tau / len);
      if (clip === "swim") {
        theta = wave(SWIM, tau);
        finR = { pec: [0, 14 * Math.sin(ph), -38 + 12 * Math.sin(ph + 0.8)], pelvic: [0, 6 * Math.sin(ph), -58] };
      } else if (clip === "idle") {
        theta = wave(IDLE, tau);
        const fl = TAU * 3 * (tau / len);
        fins(FIN0);
        joints.pecL.rotation.set(0, (-18 + 14 * Math.sin(fl)) * DEG, (-32 + 16 * Math.sin(fl + 1.2)) * DEG);
        joints.pecR.rotation.set(0, -(-18 + 14 * Math.sin(fl + Math.PI)) * DEG, -(-32 + 16 * Math.sin(fl + Math.PI + 1.2)) * DEG);
        joints.pelvicL.rotation.set(0, 4 * Math.sin(fl * 0.5) * DEG, -50 * DEG);
        joints.pelvicR.rotation.set(0, -4 * Math.sin(fl * 0.5) * DEG, 50 * DEG);
        finT = null;
      } else {
        const p = tau / len, w = wave(SWIM, tau * 0.6);
        theta = (s) => TURN.angle * smooth(1.8 * p - (0.8 * s) / L) + 0.4 * Math.sin(Math.PI * p) * w(s);
        const k = Math.sin(Math.PI * p);
        finR = { pec: [0, -18 + 30 * k, -32 - 10 * k], pelvic: [0, 0, -50] };
        // the inside fin (its left) opens as a brake, the outside one folds
      }
    } else if (name !== "rest") throw new Error(`koi-pond: no pose "${name}" (poses: ${meta.poses.join(", ")}; clips: swim@s, idle@s, turn@s)`);
    setSpine(theta);
    if (finT) fins(finR || finT);
    applyBend();
    root.updateMatrixWorld(true);
  }

  pose("rest");
  // lift the rest pose onto y = 0 (measured, so the bbox bottom is exact)
  const box = new THREE.Box3().setFromObject(root);
  space.position.y = -box.min.y;
  root.updateMatrixWorld(true);
  const clips = { swim: SWIM.T, idle: IDLE.T, turn: TURN.T };
  return { root, joints, pose, clips };
}
