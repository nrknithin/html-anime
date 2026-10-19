// ishidan.js - a long stone stairway up a grassy embankment to a hillside shrine, with stone lanterns, overhanging
// trees and a small vermilion torii on the top landing (the "climbing the shrine steps" shot), static.
// Contract: harness/lab/README.md. Meters, +Y up, the foot of the stairs faces +Z (you climb along -Z), its left is +X,
// stands on y = 0, centred on x = 0, z = 0 (the bbox of the set).
//
// Construction (everything a triangle soup merged per material: 9 meshes for the whole set):
//   PATH     a run coordinate s = 0 at the foot, uphill; world z = offset - s. Steps are laid one after another, each
//            with its own tread depth (0.34 m, a landing 1.7 m, the top landing 4.2 m) and a 0.2 m riser, flights split
//            evenly around the landings. g(s), the "grass line", runs through the top front edge of every step and stays
//            flat across each landing; the bank, kerbs, lanterns and trees all sit on it.
//   STEPS    rough-cut: each step is two (a landing three) separate stone blocks side by side, closed hexahedra whose
//            joint position, top height (+-12 mm), nosing line (+-25 mm, skewed per block) and side gap come from a
//            deterministic hash of the step index (no Math.random). Separate blocks so the hull inks every joint and nosing.
//            Blocks tuck 6 cm under the next step and reach 12 cm down into the one below, never below y = 0.
//   BANK     the embankment: a closed loft along s through the kinks of g, a trapezoid section (top 6.6 m wide plus
//            the side slope, sides falling 1 : 0.3 to the ground) whose top is 0.4 m under g, so no tread is cut; two grass
//            shoulders on it (from the kerb out to the bank edge, on the side-slope line) bring the ground beside the
//            stairs up to gs = g - 0.25. Every loft section is convex and each quad winds away from the sections' centroid.
//   KERBS    a low stepped kerb on each side: one stone per step (landings in blocks <= 1.4 m), 0.13 m above its tread,
//            so the kerb is a sawtooth standing proud of the grass: the stair profile reads from the side and from the
//            low hero camera, where the treads themselves are hidden. A taller end stone at the foot.
//   TORO     simple stone lanterns on the shoulders every 5th step, alternating sides, plus a pair at the foot and a
//            pair at the top landing: hexagonal foot, round post, platform, a box fire chamber with crossing dark
//            windows (they read from every side), a wide hexagonal roof and a jewel. 1.15 m.
//   TREES    (option) four leaning trunks on the outer shoulders (three on the far -X side, one on +X) with five
//            faceted foliage clumps each, leaning in so the canopy overhangs the kerbs and steps. Kept off the near +X
//            foot and the top landing so the stair line and the torii stay clear in hero and three-quarter views.
//   TORII    a 3.2 m myojin gate 1.4 m in from the top nosing: the torii model's proportions (models/torii.js) at 0.45,
//            pillars with black kamaki, nuki, gakuzuka with a blank plaque, shimaki, and a kasagi with a black top band,
//            swept up at the tips (sori). Primitive parts come from three.js geometry (their winding is right by
//            construction).
// Proportions (real size, base unit the riser r = 0.2 m): 40 steps (3 flights of 13 / 14 / 13 risers) climb 8.0 m
// (40 r) over 16.0 m from the first nosing to the top nosing; steps 3.0 m wide between kerbs (15 r), treads 0.34 m;
// landings 1.7 m deep; top landing 4.2 m; apron 1.2 m at the foot. Kerbs 0.32 wide; shoulders 1.5 m each side;
// lanterns 1.15 m at x = +-2.3; trees 4-4.5 m trunks (scaled down on climbs under 8 m); torii 3.2 m, tips at 11.19 m,
// the top of the set. 7.8k triangles, 9 meshes.
// Options: build(THREE, kit, colors, { height, steps, trees }).
//   height  the top of the set in m (default: the natural top, 11.19 m at 40 steps); scales the whole set uniformly.
//   steps   number of risers (default 40, min 4); the rise stays 0.2 m, so the climb is 0.2 * steps. Two landings from
//           24 steps, one from 12, none below.
//   trees   true (default) or false: the overhanging trees.
// Colours (noon, the torii's set; noon has no green or grey):
//   steps (treads, landings)   moon #fff6e4 / sky #f2d7ae at threshold 0.45: treads lit, risers (front dot 0.30) shade,
//                              so the flight reads as pale bands with warm shadow under every nosing
//   kerbs                      sclera #f6f3ee / skin #f0c2ae at 0.45 (a cooler stone than the steps, warmer shade)
//   bank (grass)               iris #5c3d32 / hair #241c16 at 0.5: a dark mossy bank in the paper palette, so the pale
//                              stairway cuts through it; the shaded -X side goes to hair
//   lanterns                   sclera / sky at 0.3 (as models/toro.js); windows hair
//   trunks                     iris / hair at 0.4; foliage skin #f0c2ae / iris at 0.35 (a warm sunlit canopy, distinct
//                              from the dark bank it overhangs and from the pale sky behind it)
//   torii                      accent #c4452d / iris at 0.1, lacquer iris / hair at 0.6 (models/torii.js)

export const meta = {
  name: "ishidan",
  height: 11.19,
  script: "noon",
  colors: {
    step: "#fff6e4", stepShade: "#f2d7ae",
    kerb: "#f6f3ee", kerbShade: "#f0c2ae",
    bank: "#5c3d32", bankShade: "#241c16",
    lamp: "#f6f3ee", lampShade: "#f2d7ae",
    hollow: "#241c16",
    trunk: "#5c3d32", trunkShade: "#241c16",
    leaf: "#f0c2ae", leafShade: "#5c3d32",
    vermilion: "#c4452d", vermilionShade: "#5c3d32",
    lacquer: "#5c3d32", lacquerShade: "#241c16",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height, steps = 40, trees = true } = opts;
  const N = Math.max(4, Math.floor(steps));
  const root = new THREE.Group();
  root.name = "ishidan";
  const set = new THREE.Group(); // uniform scale and the centring offset live here, so root stays the plain contract node
  set.name = "set";
  root.add(set);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const avg = (ps) => [0, 1, 2].map((i) => ps.reduce((s, q) => s + q[i], 0) / ps.length);
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  function tri(key, a, b, e, ref) { // wound away from ref, a point inside the solid; slivers dropped
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-8) return;
    S(key).push(...a, ...(dot(n, sub(avg([a, b, e]), ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function hex(key, p) { // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
    const ref = avg(p);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  // a loft through convex sections (each a closed polygon, same point count), capped at both ends
  function loft(key, secs) {
    const cs = secs.map(avg);
    for (let i = 0; i < secs.length - 1; i++) {
      const A = secs[i], B = secs[i + 1], ref = avg([cs[i], cs[i + 1]]), m = A.length;
      for (let k = 0; k < m; k++) quad(key, A[k], A[(k + 1) % m], B[(k + 1) % m], B[k], ref);
    }
    for (const [sec, ref] of [[secs[0], avg([cs[0], cs[1]])], [secs[secs.length - 1], avg([cs[cs.length - 1], cs[cs.length - 2]])]])
      for (let k = 1; k < sec.length - 1; k++) tri(key, sec[0], sec[k], sec[k + 1], ref);
  }
  // a three.js primitive, flat soup, placed by position / rotation (its own winding is right)
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1);
  function prim(key, geo, x, y, z, rx = 0, ry = 0, rz = 0) {
    M.compose(V.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), ONE);
    const g = (geo.index ? geo.toNonIndexed() : geo).applyMatrix4(M);
    S(key).push(...g.attributes.position.array);
    geo.dispose();
  }
  const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
  const jit = (i, k, a) => (hash(i, k) * 2 - 1) * a;

  // ---------- the path: steps, landings, grass line g(s) ----------
  const R = 0.2, T = 0.34, LAND = 1.7, TOP = 4.2, APRON = 1.2, HW = 1.5; // riser, tread, landing, top, apron, half width
  const nLand = N >= 24 ? 2 : N >= 12 ? 1 : 0;
  const ends = new Set(); // step indices that are landings (the last riser of a flight steps onto them)
  for (let f = 1; f <= nLand; f++) ends.add(Math.round((f * N) / (nLand + 1)) - 1);
  const stepList = [];
  let s = APRON;
  for (let k = 0; k < N; k++) {
    const depth = k === N - 1 ? TOP : ends.has(k) ? LAND : T;
    stepList.push({ k, s0: s, depth, top: (k + 1) * R });
    s += depth;
  }
  const L = s; // total run
  const gp = [[0, 0], [APRON - T, 0]];
  for (const st of stepList) {
    gp.push([st.s0, st.top]);
    if (st.depth > T) gp.push([st.s0 + st.depth - (st.k === N - 1 ? 0 : T), st.top]);
  }
  const g = (q) => {
    if (q <= gp[0][0]) return gp[0][1];
    for (let i = 1; i < gp.length; i++) if (q <= gp[i][0]) {
      const [s0, y0] = gp[i - 1], [s1, y1] = gp[i];
      return y0 + ((y1 - y0) * (q - s0)) / Math.max(1e-6, s1 - s0);
    }
    return gp[gp.length - 1][1];
  };
  const W = (x, y, q) => [x, y, -q]; // run s to world z (the centring offset is applied to the set group)

  // ---------- steps ----------
  for (const st of stepList) {
    const { k, s0, depth, top } = st;
    const nb = depth > T ? 3 : 2;
    const cuts = [-HW - 0.05];
    for (let b = 1; b < nb; b++) cuts.push(-HW + (2 * HW * b) / nb + jit(k, b, nb === 2 ? 0.55 : 0.25));
    cuts.push(HW + 0.05);
    const back = s0 + depth + (k === N - 1 ? 0 : 0.06);
    const yb = Math.max(0, top - R - 0.12);
    for (let b = 0; b < nb; b++) {
      const xa = cuts[b] + (b ? 0.012 : 0), xb = cuts[b + 1] - (b < nb - 1 ? 0.012 : 0);
      const yt = top + jit(k, 10 + b, 0.012);
      const za = s0 + jit(k, 20 + b, 0.025), zb = s0 + jit(k, 30 + b, 0.025); // front edge at xa / xb (skewed nosing)
      hex("step", [W(xa, yb, za), W(xb, yb, zb), W(xb, yb, back), W(xa, yb, back),
        W(xa, yt, za), W(xb, yt, zb), W(xb, yt, back), W(xa, yt, back)]);
    }
  }
  // apron: two flat slabs at the foot
  for (const [xa, xb] of [[-HW, -0.1 + jit(99, 1, 0.3)], [-0.08 + jit(99, 1, 0.3), HW]])
    hex("step", [W(xa, 0, 0.1), W(xb, 0, 0.1), W(xb, 0, APRON + 0.05), W(xa, 0, APRON + 0.05),
      W(xa, 0.04, 0.1), W(xb, 0.04, 0.1), W(xb, 0.04, APRON + 0.05), W(xa, 0.04, APRON + 0.05)]);

  // ---------- bank and shoulders ----------
  // gs(s): the grass beside the kerbs, SH under g, so the stepped kerbs stand proud of it as a sawtooth
  const XT = 3.3, SL = 0.3, KI = HW - 0.02, KO = HW + 0.32, DROP = R + 0.2, SH = 0.25;
  const gs = (q) => Math.max(0, g(q) - SH);
  const bankS = gp.filter((p, i) => i > 0).map((p) => p[0]);
  bankS[0] = APRON - T - 0.02;
  const bankSec = (q) => {
    const yt = Math.max(0.02, g(q) - DROP), xo = XT + SL * (DROP - SH) + SL * yt;
    return [W(-xo, 0, q), W(xo, 0, q), W(XT + SL * (DROP - SH), yt, q), W(-XT - SL * (DROP - SH), yt, q)];
  };
  loft("bank", bankS.map(bankSec));
  for (const sx of [1, -1]) {
    const sec = (q) => {
      const y = Math.max(0.04, gs(q)), yl = Math.max(0, Math.max(0.02, g(q) - DROP) - 0.03), xo = XT + SL * (y - yl);
      return [W(sx * (KI + 0.05), yl, q), W(sx * xo, yl, q), W(sx * XT, y, q), W(sx * (KI + 0.05), y, q)];
    };
    loft("bank", bankS.map(sec));
  }

  // ---------- kerbs: one stone per step (a sawtooth), landings in blocks <= 1.4 m ----------
  for (const sx of [1, -1]) {
    const x0 = sx * KI, x1 = sx * KO;
    for (const st of stepList) {
      const n = Math.max(1, Math.ceil(st.depth / 1.4));
      for (let j = 0; j < n; j++) {
        const a = st.s0 - 0.03 + (st.depth * j) / n + (j ? 0.01 : 0), b = st.s0 - 0.03 + (st.depth * (j + 1)) / n - 0.01;
        const yt = st.top + 0.13 + jit(st.k * 3 + j, sx > 0 ? 40 : 41, 0.02), yb = Math.max(0, st.top - 0.45);
        hex("kerb", [W(x0, yb, a), W(x1, yb, a), W(x1, yb, b), W(x0, yb, b), W(x0, yt, a), W(x1, yt, a), W(x1, yt, b), W(x0, yt, b)]);
      }
    }
    // end stone at the foot
    const q = APRON - 0.36;
    hex("kerb", [W(sx * (KI - 0.03), 0, q - 0.3), W(sx * (KO + 0.05), 0, q - 0.3), W(sx * (KO + 0.05), 0, q + 0.32), W(sx * (KI - 0.03), 0, q + 0.32),
      W(sx * (KI - 0.03), 0.5, q - 0.3), W(sx * (KO + 0.05), 0.5, q - 0.3), W(sx * (KO + 0.05), 0.5, q + 0.32), W(sx * (KI - 0.03), 0.5, q + 0.32)]);
  }

  // ---------- stone lanterns ----------
  function toro(x, q, i) {
    const y0 = Math.max(0.06, gs(q) - 0.06), z = -q, ry = jit(i, 50, 0.2);
    prim("lamp", new THREE.CylinderGeometry(0.22, 0.26, 0.22, 6), x, y0 + 0.05, z, 0, ry);
    prim("lamp", new THREE.CylinderGeometry(0.075, 0.09, 0.48, 8), x, y0 + 0.4, z, 0, ry);
    prim("lamp", new THREE.CylinderGeometry(0.2, 0.13, 0.1, 6), x, y0 + 0.66, z, 0, ry);
    prim("lamp", new THREE.BoxGeometry(0.26, 0.24, 0.26), x, y0 + 0.83, z, 0, ry);
    prim("hollow", new THREE.BoxGeometry(0.15, 0.13, 0.28), x, y0 + 0.84, z, 0, ry);
    prim("hollow", new THREE.BoxGeometry(0.28, 0.13, 0.15), x, y0 + 0.84, z, 0, ry);
    prim("lamp", new THREE.CylinderGeometry(0.36, 0.38, 0.05, 6), x, y0 + 0.975, z, 0, ry);
    prim("lamp", new THREE.CylinderGeometry(0.05, 0.36, 0.14, 6), x, y0 + 1.07, z, 0, ry);
    prim("lamp", new THREE.IcosahedronGeometry(0.06, 0), x, y0 + 1.17, z, 0, ry);
  }
  const XL = 2.3;
  let li = 0;
  for (let k = 2; k < N - 2; k += 5, li++) {
    const st = stepList[k];
    toro((li % 2 ? -1 : 1) * XL, st.s0 + 0.17, li);
  }
  // a pair at the foot and a pair flanking the top landing
  for (const sx of [1, -1]) toro(sx * XL, APRON - 0.55, 90 + sx);
  const topS = stepList[N - 1].s0;
  for (const sx of [1, -1]) toro(sx * XL, topS + 0.5, 95 + sx);

  // ---------- trees ----------
  if (trees) {
    // [side, s as a fraction of the stair run, trunk height, lean]
    const T_ = [[-1, 0.1, 4.0, 0.3], [-1, 0.4, 4.5, 0.26], [-1, 0.68, 4.0, 0.3], [1, 0.3, 4.2, 0.28]];
    const run = topS - APRON, ts = Math.min(1, Math.max(0.55, (N * R) / 8)); // smaller trees on a short climb
    T_.forEach(([sx, f, h, lean], i) => {
      const q = APRON + run * f, x = sx * 2.95, y0 = g(q) - 0.1;
      const rz = sx * lean; // lean the top toward the stairs (-sx)
      const len = h * ts;
      prim("trunk", new THREE.CylinderGeometry(0.13 * ts, 0.26 * ts, len, 7), x - (Math.sin(rz) * len) / 2, y0 + (Math.cos(rz) * len) / 2, -q, 0, 0, rz);
      const tx = x - Math.sin(rz) * len, ty = y0 + Math.cos(rz) * len;
      const clumps = [[0, 0.1, 0, 1.4], [sx * 0.9, -0.45, 0.6, 1.0], [-sx * 1.2, -0.4, -0.4, 1.15], [-sx * 0.5, 0.5, -0.9, 1.0], [-sx * 0.3, -0.3, 1.0, 0.95]];
      clumps.forEach(([dx, dy, dz, r], j) => {
        prim("leaf", new THREE.IcosahedronGeometry(r * ts * (1 + jit(i, 60 + j, 0.1)), 1), tx + dx * ts, ty + dy * ts, -q + dz * ts, jit(i, 70 + j, 1), jit(i, 80 + j, 1));
      });
    });
  }

  // ---------- torii on the top landing ----------
  {
    const k = 0.45, q = topS + 1.4, y0 = stepList[N - 1].top, z = -q; // torii.js proportions at 0.45
    const sori = (x) => 0.34 * k * Math.pow(Math.min(1, Math.abs(x) / (4.05 * k)), 2.3);
    const beam = (key, rb, rt, ya, yb, d) => { // a swept beam along x, flat soup
      const n = 8, secs = [];
      for (let i = -n; i <= n; i++) {
        const u = i / n, xb = u * rb, xt = u * rt;
        secs.push([[xb, y0 + ya + sori(xb), z - d / 2], [xb, y0 + ya + sori(xb), z + d / 2], [xt, y0 + yb + sori(xt), z + d / 2], [xt, y0 + yb + sori(xt), z - d / 2]]);
      }
      loft(key, secs);
    };
    const XB = 2.6 * k, XTp = 2.4 * k, YT = 5.95 * k;
    for (const sx of [1, -1]) {
      const lean = Math.atan((XB - XTp) / YT), len = YT + 0.1;
      prim("vermilion", new THREE.CylinderGeometry(0.25 * k, 0.275 * k, len, 10), sx * (XB + XTp) / 2, y0 + len / 2, z, 0, 0, sx * lean);
      prim("lacquer", new THREE.CylinderGeometry(0.33 * k, 0.345 * k, 0.65 * k, 10), sx * XB, y0 + 0.325 * k, z);
    }
    beam("vermilion", 3.2 * k, 3.2 * k, 4.65 * k, 5.1 * k, 0.26 * k); // nuki
    prim("vermilion", new THREE.BoxGeometry(0.36 * k, (5.95 - 5.1) * k + 0.02, 0.24 * k), 0, y0 + ((5.95 + 5.1) / 2) * k, z);
    prim("lacquer", new THREE.BoxGeometry(0.6 * k, 0.74 * k, 0.08 * k), 0, y0 + ((5.95 + 5.1) / 2) * k, z + 0.16 * k);
    beam("vermilion", 3.35 * k, 3.35 * k, 5.95 * k, 6.33 * k, 0.5 * k); // shimaki
    beam("vermilion", 3.75 * k, 3.92 * k, 6.3 * k, 6.55 * k, 0.64 * k); // kasagi
    beam("lacquer", 3.92 * k, 4.05 * k, 6.52 * k, 6.75 * k, 0.66 * k); // kasagi top band
  }

  // ---------- meshes ----------
  const MAT = {
    bank: [c.bank, c.bankShade, 0.5],
    step: [c.step, c.stepShade, 0.45],
    kerb: [c.kerb, c.kerbShade, 0.45],
    lamp: [c.lamp, c.lampShade, 0.3],
    hollow: [c.hollow, c.hollow, 0.1, false],
    trunk: [c.trunk, c.trunkShade, 0.4],
    leaf: [c.leaf, c.leafShade, 0.35],
    vermilion: [c.vermilion, c.vermilionShade, 0.1],
    lacquer: [c.lacquer, c.lacquerShade, 0.6],
  };
  for (const [key, [base, shade, threshold, outline = true]] of Object.entries(MAT)) {
    if (!soups[key]) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(soups[key], 3));
    geo.computeVertexNormals();
    const mesh = kit.toon(geo, base, shade, { threshold, outline });
    mesh.name = key;
    set.add(mesh);
  }

  // centre on the bbox, then scale to the requested top
  set.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(set);
  const sc = height ? height / box.max.y : 1;
  set.scale.setScalar(sc);
  set.position.set(0, 0, (-(box.min.z + box.max.z) / 2) * sc);

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
