// ferris-wheel.js - an amusement-park ferris wheel (the anime date-scene ride), with a spin clip and a night variant.
// Contract: harness/lab/README.md. Meters, +Y up, the wheel's face and the boarding stairs face +Z, its left is +X,
// stands on y = 0, centred on x = 0, z = 0.
//
// Construction (thin members as merged triangle soups, one mesh per material; closed rods, every triangle wound away
// from a point inside its own member, never by hand):
//   WHEEL    a joint at the hub, turning about Z. Two rim planes (z = +-RZ), each an outer ring (R 20 m: a 40 m wheel)
//            and an inner ring (R 17.8) joined by a Warren zigzag with radial posts at the gondola angles; cross ties
//            join the planes between gondolas. Radial spokes per plane run from the hub flanges to the inner ring.
//            At every gondola angle two brackets leave the outer rings to a cross axle at R 21, the gondola pivot.
//            The hub is a drum with flanges and a cap. Rim and spoke bulbs are flat (no hull) octahedra: pale by day,
//            practical at night.
//   GONDOLA  one joint per cabin at its pivot, child of the wheel; pose() gives it the opposite turn, so it hangs level.
//            A cabin is one indexed lathe (a rounded-square section, a rounded-capsule profile), smooth normals, split
//            into material groups by each triangle's height and angle: body, roof and floor caps, a window band with
//            corner mullions, plus the hanger rod. One mesh and one hull per gondola; the colour comes from its
//            materials, picked from a fixed four-colour sequence by index.
//   SUPPORT  an A-frame on each side (z = +-), legs from footings to bearing blocks on the axle, a crossbar, and side
//            ties with diagonals between the two A-frames.
//   STATION  a boarding deck at the bottom with front steps, two mono-pitch canopies on posts either side of the
//            gondola path (the wheel turns between them).
// Proportions (real size, base unit the wheel radius R = 20 m): hub 26.6 m up (1.33 R), outer rim R, inner rim
//   0.89 R, pivots 1.075 R, rim planes 3.6 m apart, A-frame feet 25 m apart across and 14.4 m deep, cabins 2.6 x 2.6 x
//   3.0 m hung 0.6 m under the pivot (anime-large), deck 1.2 m high, canopies 3.7-4.75 m. Top (the top pivot axle) 48.24 m.
// Options: build(THREE, kit, colors, { height, gondolas, night }): height scales uniformly (default meta.height);
//   gondolas 16-24 (default 20); night lights the bulbs and the windows. Clip spin (60 s, loops): pose("spin@t").
// Colours (festival): steel sclera #f6f3ee / skin #f0c2ae; hub moon #ffd7a1 / practical #ffb020, hub cap accent
//   #ff4d6d / sky #24143a; cabins in sequence pink accent / sky, cream moon / practical, orange practical / accent,
//   white sclera / skin, with caps white on pink and orange, pink on cream and white; glass sky by day, practical at
//   night (moon on the orange cabins, so the lit windows still read); bulbs iris #ffd0a1 by day, practical at night;
//   deck and footings iris / skin; canopies accent / sky. Ink #140c1c.

export const meta = {
  name: "ferris-wheel",
  height: 48.24,
  script: "festival",
  colors: {
    steel: "#f6f3ee", steelShade: "#f0c2ae",
    hub: "#ffd7a1", hubShade: "#ffb020",
    hubCap: "#ff4d6d", hubCapShade: "#24143a",
    cabPink: "#ff4d6d", cabPinkShade: "#24143a",
    cabCream: "#ffd7a1", cabCreamShade: "#ffb020",
    cabOrange: "#ffb020", cabOrangeShade: "#ff4d6d",
    cabWhite: "#f6f3ee", cabWhiteShade: "#f0c2ae",
    glass: "#24143a", glow: "#ffb020", glowAlt: "#ffd7a1",
    bulb: "#ffd0a1", bulbLit: "#ffb020",
    deck: "#ffd0a1", deckShade: "#f0c2ae",
    roof: "#ff4d6d", roofShade: "#24143a",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const TAU = Math.PI * 2;
  const height = opts.height ?? meta.height;
  const N = Math.max(16, Math.min(24, Math.round(opts.gondolas ?? 20)));
  const night = !!opts.night;

  const root = new THREE.Group();
  root.name = "ferris-wheel";
  const body = new THREE.Group(); // uniform size scale lives here, so root stays the plain contract node
  body.name = "body";
  body.scale.setScalar(height / meta.height);
  root.add(body);
  const joints = {};

  // ---------- dimensions ----------
  const HUB_Y = 26.6, RO = 20, RI = 17.8, RP = 21.5, RZ = 1.8;
  const M = 4 * N; // rim nodes per ring
  const th = (k) => -Math.PI / 2 + (k * TAU) / M; // node angle, k = 0 at the bottom
  const P = (R, a, z) => [R * Math.cos(a), R * Math.sin(a), z];

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (a) => mul(a, 1 / (Math.hypot(...a) || 1));
  const lerp = (a, b, t) => add(a, mul(sub(b, a), t));
  function soupSet() {
    const s = {};
    const S = (k) => (s[k] ??= []);
    function tri(k, a, b, e, ref) {
      const n = cross(sub(b, a), sub(e, a));
      if (Math.hypot(...n) < 1e-9) return;
      const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
      S(k).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
    }
    const quad = (k, a, b, e, d, ref) => (tri(k, a, b, e, ref), tri(k, a, e, d, ref));
    // closed round rod a -> b
    function rod(k, a, b, r, seg = 6) {
      const d = norm(sub(b, a));
      const u = norm(cross(d, Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), v = cross(d, u);
      const ring = (o) => Array.from({ length: seg }, (_, i) => {
        const t = (i / seg) * TAU;
        return add(o, add(mul(u, r * Math.cos(t)), mul(v, r * Math.sin(t))));
      });
      const A = ring(a), B = ring(b), mid = lerp(a, b, 0.5);
      for (let i = 0; i < seg; i++) {
        const j = (i + 1) % seg;
        quad(k, A[i], A[j], B[j], B[i], mid);
        tri(k, a, A[i], A[j], mid);
        tri(k, b, B[i], B[j], mid);
      }
    }
    // tube ring about the Z axis at depth z, radius R, cross-section r, M straight segments between the rim nodes
    function ringTube(k, R, z, r, seg = 6) {
      for (let i = 0; i < M; i++) {
        const a0 = th(i), a1 = th(i + 1), ref = P(R, (a0 + a1) / 2, z);
        const pt = (a, f) => {
          const rad = [Math.cos(a), Math.sin(a), 0];
          return add(P(R, a, z), add(mul(rad, r * Math.cos(f)), [0, 0, r * Math.sin(f)]));
        };
        for (let j = 0; j < seg; j++) {
          const f0 = (j / seg) * TAU, f1 = ((j + 1) / seg) * TAU;
          quad(k, pt(a0, f0), pt(a1, f0), pt(a1, f1), pt(a0, f1), ref);
        }
      }
    }
    // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
    function hex(k, p) {
      const ref = [0, 1, 2].map((i) => p.reduce((s2, q) => s2 + q[i], 0) / 8);
      for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
        quad(k, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
    }
    function box(k, x0, x1, y0, y1, z0, z1) {
      hex(k, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
    }
    // a flat bulb: an octahedron of radius r
    function bulb(k, o, r) {
      const X = [r, 0, 0], Y = [0, r, 0], Z = [0, 0, r];
      for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1])
        tri(k, add(o, mul(X, sx)), add(o, mul(Y, sy)), add(o, mul(Z, sz)), o);
    }
    return { s, tri, quad, rod, ringTube, hex, box, bulb };
  }
  function meshes(soups, MAT, parent) {
    for (const [key, arr] of Object.entries(soups.s)) {
      const [base, shade, threshold, outline, px] = MAT[key];
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
      g.computeVertexNormals();
      const mesh = kit.toon(g, base, shade, { threshold, outline, px });
      mesh.name = key;
      parent.add(mesh);
    }
  }

  // ---------- the wheel (rotating) ----------
  const wheel = new THREE.Group();
  wheel.name = "wheel";
  wheel.position.set(0, HUB_Y, 0);
  body.add(wheel);
  joints.wheel = wheel;
  const W = soupSet();
  for (const z of [RZ, -RZ]) {
    W.ringTube("steel", RO, z, 0.32);
    W.ringTube("steel", RI, z, 0.26);
    for (let k = 0; k < M; k++) {
      if (k % 4 === 0) W.rod("steel", P(RI, th(k), z), P(RO, th(k), z), 0.16, 5);
      // zigzag: outer at even nodes, inner at odd nodes
      const a = k % 2 === 0 ? P(RO, th(k), z) : P(RI, th(k), z);
      const b = k % 2 === 0 ? P(RI, th(k + 1), z) : P(RO, th(k + 1), z);
      W.rod("steel", a, b, 0.12, 4);
    }
    const zh = Math.sign(z) * 2.4;
    for (let g = 0; g < N; g++) {
      const a = th(4 * g);
      W.rod("steel", P(1.5, a, zh), P(RI, a, z), 0.15, 5); // spoke
      W.rod("steel", P(RO, a, z), P(RP, a, z * 0.9), 0.17, 5); // pivot bracket
      for (const f of [0.3, 0.5, 0.7, 0.88]) {
        const q = lerp(P(1.5, a, zh), P(RI, a, z), f);
        W.bulb("bulb", add(q, [0, 0, Math.sign(z) * 0.2]), 0.34);
      }
    }
  }
  for (let g = 0; g < N; g++) {
    const a = th(4 * g), am = th(4 * g + 2);
    W.rod("steel", P(RP, a, -RZ * 0.95), P(RP, a, RZ * 0.95), 0.16, 6); // pivot axle
    W.rod("steel", P(RO, am, -RZ), P(RO, am, RZ), 0.12, 4); // cross ties between the planes
    W.rod("steel", P(RI, am, -RZ), P(RI, am, RZ), 0.12, 4);
  }
  for (let k = 0; k < M; k++)
    for (const z of [RZ, -RZ]) W.bulb("bulb", P(RO + 0.32, th(k + 0.5), z), 0.36);
  // hub drum, flanges, cap
  W.rod("hub", [0, 0, -2.6], [0, 0, 2.6], 1.6, 16);
  for (const s of [1, -1]) {
    W.rod("hub", [0, 0, s * 2.1], [0, 0, s * 2.6], 2.1, 20);
    W.rod("hubCap", [0, 0, s * 2.6], [0, 0, s * 2.9], 1.1, 16);
  }
  const lit = night ? c.bulbLit : c.bulb;
  meshes(W, {
    steel: [c.steel, c.steelShade, 0.2, true, 2],
    hub: [c.hub, c.hubShade, 0.2, true, 3],
    hubCap: [c.hubCap, c.hubCapShade, 0.1, true, 3],
    bulb: [lit, lit, -0.25, false],
  }, wheel);

  // ---------- gondolas ----------
  // cabin lathe: section a rounded square (superellipse n = 3), profile a rounded capsule; y relative to the pivot
  const CW = 1.3, CY0 = -3.6, CY1 = -0.6;
  const levels = [0, 0.05, 0.12, 0.22, 0.46, 0.62, 0.78, 0.84, 0.92, 1];
  const prof = (v) => { const u = Math.abs(2 * v - 1); return Math.max(0, 1 - u ** 3.2) ** (1 / 3.2); };
  const angs = [];
  for (let q = 0; q < 4; q++) for (const d of [0, 22, 39, 51, 68]) angs.push(((q * 90 + d) * Math.PI) / 180);
  const sp = (t, e) => Math.sign(t) * Math.abs(t) ** e;
  const cabin = (() => {
    const pos = [], tris = [];
    const rows = levels.map((v) => {
      const y = CY0 + (CY1 - CY0) * v, w = CW * prof(v);
      if (w < 1e-6) { pos.push(0, y, 0); return null; }
      const start = pos.length / 3;
      for (const a of angs) pos.push(w * sp(Math.cos(a), 2 / 3), y, w * sp(Math.sin(a), 2 / 3));
      return start;
    });
    // poles: vertex 0 (bottom) and the last pushed before row 9's start... track them
    const bottom = 0, A = angs.length;
    let topIdx = 0;
    // find top pole index: it is the last vertex pushed
    topIdx = pos.length / 3 - 1;
    const tagOf = (v, a) => {
      if (v < 0.12 || v > 0.84) return 1; // caps
      if (v > 0.46 && v < 0.78) {
        const d = ((a * 180) / Math.PI) % 90;
        return d > 39 && d < 51 ? 0 : 2; // corner mullion or glass
      }
      return 0;
    };
    for (let r = 0; r < levels.length - 1; r++) {
      const v = (levels[r] + levels[r + 1]) / 2;
      for (let i = 0; i < A; i++) {
        const j = (i + 1) % A, am = (angs[i] + (j === 0 ? TAU : angs[j])) / 2, tg = tagOf(v, am);
        const r0 = rows[r], r1 = rows[r + 1];
        if (r0 === null) tris.push([bottom, r1 + j, r1 + i, tg]);
        else if (r1 === null) tris.push([r0 + i, r0 + j, topIdx, tg]);
        else tris.push([r0 + i, r0 + j, r1 + j, tg], [r0 + i, r1 + j, r1 + i, tg]);
      }
    }
    // wind outward from the cabin's axis
    const pt = (i) => [pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]];
    for (const t of tris) {
      const a = pt(t[0]), b = pt(t[1]), e = pt(t[2]);
      const n = cross(sub(b, a), sub(e, a)), m = mul(add(add(a, b), e), 1 / 3);
      if (dot(n, sub(m, [0, m[1], 0])) < 0) [t[1], t[2]] = [t[2], t[1]];
    }
    // hanger rod: pivot down into the roof, its own vertices
    const hang = soupSet();
    hang.rod("h", [0, 0.12, 0], [0, CY1 - 0.15, 0], 0.09, 6);
    const hp = hang.s.h, base = pos.length / 3;
    for (let i = 0; i < hp.length; i += 3) pos.push(hp[i], hp[i + 1], hp[i + 2]);
    for (let i = 0; i < hp.length / 3; i += 3) tris.push([base + i, base + i + 1, base + i + 2, 3]);
    const idx = [], g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    let start = 0;
    for (let k = 0; k < 4; k++) {
      const part = tris.filter((t) => t[3] === k);
      for (const t of part) idx.push(t[0], t[1], t[2]);
      g.addGroup(start, part.length * 3, k);
      start += part.length * 3;
    }
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  })();
  const CABS = [
    [c.cabPink, c.cabPinkShade, c.cabWhite, c.cabWhiteShade, c.glow],
    [c.cabCream, c.cabCreamShade, c.cabPink, c.cabPinkShade, c.glow],
    [c.cabOrange, c.cabOrangeShade, c.cabWhite, c.cabWhiteShade, c.glowAlt],
    [c.cabWhite, c.cabWhiteShade, c.cabPink, c.cabPinkShade, c.glow],
  ];
  const gondolas = [];
  for (let g = 0; g < N; g++) {
    const j = new THREE.Group();
    j.name = `gondola${g}`;
    j.position.set(...P(RP, th(4 * g), 0));
    wheel.add(j);
    joints[j.name] = j;
    gondolas.push(j);
    const [b, bs, cp, cps, gl] = CABS[g % 4];
    const glass = night ? gl : c.glass;
    const m = kit.toon(cabin, b, bs, { threshold: 0.15, px: 3 });
    m.material = [
      kit.cel(b, bs, { threshold: 0.15 }),
      kit.cel(cp, cps, { threshold: 0.15 }),
      kit.cel(glass, glass, { threshold: -0.25 }),
      kit.cel(c.steel, c.steelShade, { threshold: 0.2 }),
    ];
    m.name = "cabin";
    j.add(m);
  }

  // ---------- supports, station (static) ----------
  const T = soupSet();
  const FX = 12.5, FZ = 7.2, AX = 0.7, AZ = 4.6;
  const leg = (sx, sz, y) => { const t = y / HUB_Y; return [sx * (FX + (AX - FX) * t), y, sz * (FZ + (AZ - FZ) * t)]; };
  T.rod("steel", [0, HUB_Y, -AZ - 1.1], [0, HUB_Y, AZ + 1.1], 0.6, 10); // axle
  for (const sz of [1, -1]) {
    for (const sx of [1, -1]) {
      T.rod("steel", leg(sx, sz, 0.3), leg(sx, sz, HUB_Y - 0.2), 0.55, 8);
      const f = leg(sx, sz, 0);
      T.box("deck", f[0] - 1.3, f[0] + 1.3, 0, 0.6, f[2] - 1.3, f[2] + 1.3);
    }
    T.box("steel", -1.1, 1.1, HUB_Y - 1.1, HUB_Y + 1.1, sz * AZ - 0.7, sz * AZ + 0.7); // bearing block
    T.rod("steel", leg(-1, sz, 8), leg(1, sz, 8), 0.35, 6); // A crossbar
    T.rod("steel", leg(-1, sz, 16), leg(1, sz, 16), 0.3, 6);
  }
  for (const sx of [1, -1]) {
    for (const y of [8, 16]) T.rod("steel", leg(sx, 1, y), leg(sx, -1, y), 0.28, 6);
    T.rod("steel", leg(sx, 1, 0.8), leg(sx, -1, 8), 0.22, 6);
    T.rod("steel", leg(sx, -1, 0.8), leg(sx, 1, 8), 0.22, 6);
    T.rod("steel", leg(sx, 1, 8), leg(sx, -1, 16), 0.2, 6);
    T.rod("steel", leg(sx, -1, 8), leg(sx, 1, 16), 0.2, 6);
  }
  // boarding deck and steps
  T.box("deck", -8.5, 8.5, 0, 1.2, -5.2, 5.2);
  for (let i = 0; i < 3; i++) T.box("deck", -3, 3, 0, 0.4 * (3 - i), 5.2, 5.2 + 0.55 * (i + 1));
  // canopies either side of the gondola path: posts and a mono-pitch roof falling away from the wheel
  for (const sz of [1, -1]) {
    for (const x of [-6, 6]) for (const z of [2.7, 5.0]) T.rod("steel", [x, 1.2, sz * z], [x, 3.8, sz * z], 0.14, 6);
    const zi = sz * 2.4, zo = sz * 5.8, yi = 4.3, yo = 3.7, t = 0.45;
    T.hex("roof", [[-7.4, yi, zi], [7.4, yi, zi], [7.4, yo, zo], [-7.4, yo, zo], [-7.4, yi + t, zi], [7.4, yi + t, zi], [7.4, yo + t, zo], [-7.4, yo + t, zo]]);
  }
  meshes(T, {
    steel: [c.steel, c.steelShade, 0.2, true, 2],
    deck: [c.deck, c.deckShade, 0.15, true, 3],
    roof: [c.roof, c.roofShade, 0.1, true, 3],
  }, body);

  // ---------- poses and clips ----------
  // sign: wheel.rotation.z > 0 turns it counter-clockwise seen from the front (+Z); each gondola takes the negative,
  // so its world rotation is zero and it hangs level.
  const CLIPS = { spin: 60 };
  function apply(turn) {
    wheel.rotation.z = turn;
    for (const j of gondolas) j.rotation.z = -turn;
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`ferris-wheel: no clip "${m[1]}" (clips: spin)`);
      const T0 = CLIPS[m[1]], ph = (((+m[2] % T0) + T0) % T0) / T0;
      return apply(-TAU * ph); // clockwise from the front
    }
    if (name !== "rest") throw new Error(`ferris-wheel: unknown pose "${name}" (rest, or spin@<seconds>)`);
    apply(0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
