// tanabata.js - a Tanabata festival bamboo (sasa kazari): a tall cut bamboo standing in a round weighted base, its
// leafy upper branches hung with paper wish strips, paper chains, two streamers, paper cranes and a paper net.
// Contract: harness/lab/README.md. Meters, +Y up, faces +Z, its left is +X, stands on y = 0, centred on x = 0, z = 0.
//
// Construction (all procedural, deterministic from a seeded mulberry32, never Math.random; every part is a triangle
// soup merged per material, so the whole set piece is 10 meshes; winding picked per face from a point inside the part
// or from the part's analytic outward normal, never by hand):
//   BASE     a lathe: a round weight (r 0.30 m, chamfered) with a raised collar the culm sits in, a straw rope ring
//            tied round the culm just above it.
//   CULM     one smooth 8-sided loft through rings at every node, tapering r 0.06 -> 0.022 m, nodding toward +X at the
//            top. Node rings: a dark band 8 % proud of the culm, 3 cm tall, at every node (internodes 0.26-0.36 m),
//            flat hair with no hull: the dark rings that make a light green pole read as bamboo.
//   BRANCHES three from every node above 1.55 m (a main pair, as madake bears them, and a short third), the set
//            turning on a golden-angle spiral; each a 4-sided tapered twig along an arch (rises, then droops at the tip
//            under its load) with a side twig; longest at mid crown (1.15 m), short at the top, so the crown is a tall
//            feathery plume, not a cone. Leaves: narrow blades (0.27 x 0.045 m, ~1.7x real so they survive the
//            thumbnail, each a thin closed solid with a midrib ridge, 6 tris) in fans of 6-7 at the twig tips and
//            pendant sprays of 4 on the outer half of each branch, so the inner half stays clear for the strips.
//            Three short sprays and a fan finish the nodding tip.
//   PAPER    tanzaku: blank strips 0.085 x 0.26-0.34 m (stylised ~1.4x), each on a 6-16 cm thread below a point on
//            the inner half of a branch, yawed so none is edge-on to the hero camera, colours dealt round the six
//            papers. Paper is 10-12 mm thick: at 4 mm the far face's hull z-fights the near face in small shots. Kusari: links are closed
//            paper loops (rectangular section) alternating 90 deg, one swag across the front of the crown and one hanging
//            chain. Fukinagashi: a kusudama ball on a thread with 10 long ribbons (1.0-1.25 m) round a ring under it, two
//            of them. Orizuru: low-poly folded cranes (keel, raised wings, neck, head, tail as thin plates), a string of
//            three and two singles. Amikazari: a paper net, a diamond lattice of thin bars on a bag-shaped surface.
// Proportions (base unit the culm diameter D at the base, 0.12 m, stylised ~1.4x a 4 m sasa so the pole reads at hero
//   size): culm 3.75 m (31 D) standing in a 0.30 m base, crown from 1.55 m to 4.07 m (top of the rest pose, leaf tips),
//   crown ~2.4 m across; strips ~2.5 D long.
// Options: build(THREE, kit, colors, { height = meta.height, strips = 60 }): height scales uniformly (the top of the
//   rest pose); strips is how many tanzaku hang, 0-86 (86 fixed hang points, dealt in a fixed shuffled order).
// Clip: breeze 4 s, looping (pose("breeze@1.3")). A breeze toward +X (the lit side): every strip, thread, crane, net and
//   chain swings about its own hang point with its own phase (lean plus whole-number-frequency swings, so 4 s == 0 s),
//   strips and cranes twist a little about the thread; streamer ribbons bend progressively along their length with
//   a travelling wave (each vertex rotates about the hang point by an angle that grows and lags with depth). Vertices,
//   normals and hull normals of the paper meshes are rewritten in place (the hull shares the geometry). The bamboo is
//   still. pose("rest") is still air: everything hangs plumb.
// Colours (meadow, not festival: the green pole and leaves are the first identity cue and festival has no green;
//   meadow still deals the five Tanabata colours: red, yellow, white, a pale blue, green, plus pink):
//   culm line #a9d16e / iris #3f8a47 at threshold -0.4 (light green pole, mid green on the far -X edge);
//   node rings and threads flat hair #2c5131 (no hull); leaves and twigs iris #3f8a47 / hair #2c5131 at 0.35;
//   papers flat at threshold -1 (paper glows in sun, a two-tone strip would read as two strips): red accent #d9483b,
//   yellow practical #f2c94c (also the rope), white moon #f7f3e1, blue sky #d7ecef, pink skin #f0c2ae, lime line #a9d16e
//   (lime strips pop against the dark leaves); base sclera #f6f3ee / sky #d7ecef at 0.1. Every shade lighter than ink
//   #1c261b and distinct from what it overlaps.

export const meta = {
  name: "tanabata",
  height: 4.07,
  script: "meadow",
  colors: {
    culm: "#a9d16e", culmShade: "#3f8a47",
    node: "#2c5131",
    leaf: "#3f8a47", leafShade: "#2c5131",
    red: "#d9483b", yellow: "#f2c94c", white: "#f7f3e1", blue: "#d7ecef", pink: "#f0c2ae", lime: "#a9d16e",
    base: "#f6f3ee", baseShade: "#d7ecef",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const { height = meta.height, strips = 60 } = opts;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

  // ---------- seeded random ----------
  let st = 0x2545f491;
  const rnd = () => {
    st = (st + 0x6d2b79f5) >>> 0;
    let t = st;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const range = (a, b) => a + (b - a) * rnd();

  const root = new THREE.Group();
  root.name = "tanabata";
  const body = new THREE.Group(); // the size scale lives here
  body.name = "body";
  root.add(body);
  const joints = { body };

  // ---------- soups: per material positions + normals ----------
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  const count = (key) => (soups[key] ? soups[key].p.length / 3 : 0);
  const tmpA = V(), tmpB = V();
  // one triangle; `out` is a point inside the part (Vector3) or {dir} the outward normal; ns optional smooth normals
  function tri(key, a, b, e, out, ns = null) {
    const fn = tmpA.subVectors(b, a).cross(tmpB.subVectors(e, a));
    if (fn.lengthSq() < 1e-14) return;
    const flip = out.dir ? fn.dot(out.dir) < 0 : fn.dot(V().add(a).add(b).add(e).multiplyScalar(1 / 3).sub(out)) < 0;
    const s = S(key), f = fn.clone().normalize().multiplyScalar(flip ? -1 : 1);
    const P = flip ? [a, e, b] : [a, b, e];
    const N = ns ? (flip ? [ns[0], ns[2], ns[1]] : ns) : [f, f, f];
    for (let k = 0; k < 3; k++) s.p.push(P[k].x, P[k].y, P[k].z), s.n.push(N[k].x, N[k].y, N[k].z);
  }
  const ctr = (ring) => ring.reduce((m, p) => m.add(p), V()).multiplyScalar(1 / ring.length);
  // loft through rings of equal size: side quads (winding from the segment centre), closed end caps unless loop
  function loft(key, rings, { loop = false, caps = true, smooth = false } = {}) {
    const m = rings[0].length, R = rings.length, cs = rings.map(ctr);
    const nrm = (i, j) => (smooth ? rings[i][j].clone().sub(cs[i]).normalize() : null);
    const segs = loop ? R : R - 1;
    for (let i = 0; i < segs; i++) {
      const i2 = (i + 1) % R, ref = cs[i].clone().add(cs[i2]).multiplyScalar(0.5);
      for (let j = 0; j < m; j++) {
        const j2 = (j + 1) % m, a = rings[i][j], b = rings[i][j2], d = rings[i2][j2], e = rings[i2][j];
        tri(key, a, b, d, ref, smooth && [nrm(i, j), nrm(i, j2), nrm(i2, j2)]);
        tri(key, a, d, e, ref, smooth && [nrm(i, j), nrm(i2, j2), nrm(i2, j)]);
      }
    }
    if (!loop && caps)
      for (const [k, nb] of [[0, 1], [R - 1, R - 2]])
        for (let j = 0; j < m; j++) tri(key, cs[k], rings[k][j], rings[k][(j + 1) % m], cs[nb]);
  }
  // a thin closed plate from a convex planar polygon
  function plate(key, pts, th) {
    const n = V().subVectors(pts[1], pts[0]).cross(V().subVectors(pts[2], pts[0])).normalize().multiplyScalar(th / 2);
    loft(key, [pts.map((p) => p.clone().sub(n)), pts.map((p) => p.clone().add(n))]);
  }
  // lathe about the vertical axis through (cx, cz): profile [[r, y]] counter-clockwise in (r, y); band normals analytic
  function lathe(key, prof, seg, cx = 0, cz = 0, closed = false) {
    const nb = closed ? prof.length : prof.length - 1;
    for (let i = 0; i < nb; i++) {
      const [r0, y0] = prof[i], [r1, y1] = prof[(i + 1) % prof.length];
      for (let j = 0; j < seg; j++) {
        const a0 = (j / seg) * TAU, a1 = ((j + 1) / seg) * TAU, am = (a0 + a1) / 2;
        const P = (r, y, a) => V(cx + r * Math.cos(a), y, cz + r * Math.sin(a));
        const dir = V(Math.cos(am) * (y1 - y0), -(r1 - r0), Math.sin(am) * (y1 - y0));
        const A = P(r0, y0, a0), B = P(r0, y0, a1), C = P(r1, y1, a1), D = P(r1, y1, a0);
        tri(key, A, B, C, { dir }), tri(key, A, C, D, { dir });
      }
    }
  }
  // a frame (u, w) perpendicular to d
  function frame(d) {
    const u = Math.abs(d.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0);
    const s1 = u.clone().cross(d).normalize();
    return [s1, d.clone().cross(s1).normalize()];
  }
  // a tapered n-sided rod along a polyline
  function rod(key, pts, r0, r1, n = 4) {
    const rings = pts.map((p, i) => {
      const d = V().subVectors(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]).normalize();
      const [s1, s2] = frame(d), r = r0 + ((r1 - r0) * i) / (pts.length - 1);
      return Array.from({ length: n }, (_, k) => p.clone().addScaledVector(s1, Math.cos((k * TAU) / n + 0.4) * r).addScaledVector(s2, Math.sin((k * TAU) / n + 0.4) * r));
    });
    loft(key, rings);
  }
  // a flat ribbon (w wide along `across`, th thick) down a polyline
  function ribbon(key, pts, w, th, across) {
    const rings = pts.map((p, i) => {
      const d = V().subVectors(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]).normalize();
      const a = across.clone().addScaledVector(d, -across.dot(d)).normalize().multiplyScalar(w / 2);
      const t = d.clone().cross(a).normalize().multiplyScalar(th / 2);
      return [p.clone().add(a).add(t), p.clone().sub(a).add(t), p.clone().sub(a).sub(t), p.clone().add(a).sub(t)];
    });
    loft(key, rings);
  }

  // ---------- base ----------
  lathe("base", [[0, 0], [0.3, 0], [0.3, 0.17], [0.27, 0.2], [0.12, 0.21], [0.11, 0.3], [0, 0.3]], 20);
  lathe("yellow", Array.from({ length: 6 }, (_, k) => [0.073 + 0.016 * Math.cos((k * TAU) / 6), 0.38 + 0.016 * Math.sin((k * TAU) / 6)]), 14, 0, 0, true);
  lathe("yellow", Array.from({ length: 6 }, (_, k) => [0.071 + 0.015 * Math.cos((k * TAU) / 6), 0.42 + 0.015 * Math.sin((k * TAU) / 6)]), 14, 0, 0, true);

  // ---------- culm ----------
  const H = 3.75, R0 = 0.06;
  const centre = (y) => V(0.2 * Math.pow(Math.max(0, y) / H, 2.6), y, -0.03 * Math.pow(Math.max(0, y) / H, 2));
  const radius = (y) => R0 * (1 - 0.63 * Math.pow(y / H, 1.3));
  const nodes = [];
  for (let y = 0.5; y < H - 0.2; y += 0.26 + 0.1 * Math.min(1, y / 2)) nodes.push(y);
  {
    const ys = [0.22, ...nodes.flatMap((y) => [y - 0.01, y + 0.01]), H];
    const rings = ys.map((y) => {
      const p = centre(y), r = radius(y);
      return Array.from({ length: 8 }, (_, k) => p.clone().add(V(Math.cos((k * TAU) / 8) * r, 0, Math.sin((k * TAU) / 8) * r)));
    });
    loft("culm", rings, { smooth: true, caps: false });
    // closed ends: flat bottom (hidden in the collar), a short cone at the cut top
    const b = rings[0], t = rings[rings.length - 1], tip = centre(H).add(V(0, 0.05, 0));
    for (let k = 0; k < 8; k++) {
      tri("culm", ctr(b), b[k], b[(k + 1) % 8], centre(0.5));
      tri("culm", tip, t[k], t[(k + 1) % 8], centre(H - 0.2));
    }
    for (const y of nodes) {
      const p = centre(y), r = radius(y) * 1.08;
      const ring = (rr, yy) => Array.from({ length: 8 }, (_, k) => p.clone().add(V(Math.cos((k * TAU) / 8) * rr, yy - y, Math.sin((k * TAU) / 8) * rr)));
      // a closed ring: outer band and a slightly smaller inner band, joined top and bottom
      const ro = ring(r, y - 0.015), ro2 = ring(r, y + 0.015), ri2 = ring(r * 0.9, y + 0.015), ri = ring(r * 0.9, y - 0.015);
      for (let k = 0; k < 8; k++) {
        const k2 = (k + 1) % 8, sec = [ro[k], ro2[k], ri2[k], ri[k]], sec2 = [ro[k2], ro2[k2], ri2[k2], ri[k2]];
        const ref = ctr([...sec, ...sec2]);
        for (let q = 0; q < 4; q++) {
          const q2 = (q + 1) % 4;
          tri("node", sec[q], sec[q2], sec2[q2], ref), tri("node", sec[q], sec2[q2], sec2[q], ref);
        }
      }
    }
  }

  // ---------- leaves and branches ----------
  // one leaf blade from o along unit d, flat across unit w: thin solid widest at 0.3 L, a midrib ridge on top, 6 tris
  function leaf(o, d, w, L, W) {
    const t = d.clone().cross(w).normalize().multiplyScalar(W * 0.2);
    if (t.y < 0) t.negate();
    const m = o.clone().addScaledVector(d, 0.3 * L), tip = o.clone().addScaledVector(d, L);
    const ring = [m.clone().addScaledVector(w, W / 2), m.clone().add(t), m.clone().addScaledVector(w, -W / 2)];
    const inside = m.clone().addScaledVector(t, 0.3);
    for (let k = 0; k < 3; k++) {
      const a = ring[k], b = ring[(k + 1) % 3];
      tri("leaf", o, a, b, inside), tri("leaf", tip, b, a, inside);
    }
  }
  function fan(p, az, n, spread, droop0, L = 0.27) {
    for (let k = 0; k < n; k++) {
      const u = n === 1 ? 0 : k / (n - 1) - 0.5;
      const a = az + u * spread + range(-0.15, 0.15);
      const dr = (droop0 + Math.abs(u) * 35 + range(-8, 8)) * DEG;
      const d = V(Math.cos(a) * Math.cos(dr), -Math.sin(dr), Math.sin(a) * Math.cos(dr)).normalize();
      const w = V(0, 1, 0).cross(d).normalize();
      w.applyAxisAngle(d, range(-0.4, 0.4));
      leaf(p, d, w, L * range(0.85, 1.1), 0.045 * range(0.9, 1.1));
    }
  }
  const branches = [];
  const crown0 = 1.55;
  // three branches per node (a main pair, as madake bears them, and a short third), turning round the culm on a golden-angle spiral
  nodes.filter((y) => y > crown0).flatMap((y, k) => [[y, k * 2.39996 + 0.6, 1], [y, k * 2.39996 + 0.6 + 1.1, 0.8], [y, k * 2.39996 + 0.6 - 1.4, 0.55]]).forEach(([y, az0, lf], k) => {
    const t = (y - crown0) / (H - crown0);
    const az = az0 + range(-0.3, 0.3);
    const L = (0.3 + 0.85 * Math.sin(Math.PI * Math.min(1, 0.22 + 0.95 * (1 - t))) * range(0.9, 1.05)) * lf;
    const dir = V(Math.cos(az), 0, Math.sin(az)), b0 = centre(y).addScaledVector(dir, radius(y) * 0.7);
    const rise = 0.6 + 0.4 * t;
    const at = (s) => b0.clone().addScaledVector(dir, L * s).add(V(0, L * (rise * s - 0.62 * s * s), 0));
    const pts = [0, 0.25, 0.5, 0.75, 1].map(at);
    rod("culm", pts, 0.013, 0.006);
    // side twig from mid-branch, swinging off to one side, with its fan
    const sa = az + (k % 2 ? 0.7 : -0.7), sd = V(Math.cos(sa), 0.35, Math.sin(sa)).normalize();
    const s0 = at(0.5), s1 = s0.clone().addScaledVector(sd, 0.38 * L);
    rod("culm", [s0, s1], 0.008, 0.005);
    fan(s1, sa, 6, 2.0, 32);
    fan(at(1), az, 7, 2.4, 30);
    // pendant sprays down the branch, alternating sides (bamboo leaves hang in clusters off short twiglets)
    for (let f = 0.5, side = 1; f < 0.95; f += 0.16, side = -side)
      fan(at(f), az + side * range(0.9, 1.4), 4, 1.3, 50, 0.25);
    branches.push({ y, az, L, at, used: false });
  });
  // the nodding tip: three short sprays and a fan
  {
    const tip = centre(H);
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + 0.3, d = V(Math.cos(a) * 0.6, 0.8, Math.sin(a) * 0.6).normalize();
      const e = tip.clone().addScaledVector(d, 0.28);
      rod("culm", [centre(H - 0.15), e], 0.008, 0.005);
      fan(e, a, 4, 2.0, 20);
    }
    fan(tip.clone().add(V(0, 0.04, 0)), 0.2, 5, 2.6, 15);
  }

  // ---------- hanging paper ----------
  const PAPERS = ["red", "yellow", "blue", "lime", "pink", "white"];
  const hangers = [];
  // record what fn() adds to every soup as one hanger swinging about pivot
  function hang(pivot, kind, fn, extra = {}) {
    const before = Object.fromEntries(Object.keys(soups).map((k) => [k, count(k)]));
    fn();
    const ranges = Object.keys(soups).map((k) => ({ key: k, a: before[k] ?? 0, b: count(k) })).filter((r) => r.b > r.a);
    hangers.push({ pivot: pivot.clone(), kind, ranges, ph: rnd(), ph2: rnd(), ph3: rnd(), ...extra });
  }
  const thread = (a, b) => rod("node", [a, b], 0.005, 0.005, 3);
  const hero = Math.PI / 4; // hero camera azimuth (+X +Z): strips are turned to face it, give or take 40 deg
  function tanzaku(p, i) {
    const len = range(0.26, 0.34), w = 0.085, tl = range(0.06, 0.16), yaw = hero + range(-0.7, 0.7);
    const top = p.clone().add(V(0, -tl, 0));
    const ax = V(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(w / 2); // across the strip
    hang(p, "strip", () => {
      thread(p, top.clone().add(V(0, 0.01, 0)));
      plate(PAPERS[i % PAPERS.length], [top.clone().add(ax), top.clone().sub(ax), top.clone().sub(ax).add(V(0, -len, 0)), top.clone().add(ax).add(V(0, -len, 0))], 0.012);
    }, { amp: range(12, 20) * DEG });
  }
  function link(cp, u, w, key) {
    const n = u.clone().cross(w).normalize(), L = 0.1, Wd = 0.055, bw = 0.028, th = 0.005, rings = [];
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * TAU, P = cp.clone().addScaledVector(u, (L / 2) * Math.cos(a)).addScaledVector(w, (Wd / 2) * Math.sin(a));
      const rad = u.clone().multiplyScalar(Math.cos(a) / (L / 2)).addScaledVector(w, Math.sin(a) / (Wd / 2)).normalize();
      rings.push([P.clone().addScaledVector(n, bw / 2).addScaledVector(rad, th / 2), P.clone().addScaledVector(n, -bw / 2).addScaledVector(rad, th / 2),
        P.clone().addScaledVector(n, -bw / 2).addScaledVector(rad, -th / 2), P.clone().addScaledVector(n, bw / 2).addScaledVector(rad, -th / 2)]);
    }
    loft(key, rings, { loop: true });
  }
  // a chain of links along a curve (points), colours alternating through `keys`
  function chain(curve, keys) {
    const lens = [0];
    for (let i = 1; i < curve.length; i++) lens.push(lens[i - 1] + curve[i].distanceTo(curve[i - 1]));
    const step = 0.065, total = lens[lens.length - 1];
    for (let s = 0.04, k = 0; s < total - 0.03; s += step, k++) {
      let i = 1;
      while (lens[i] < s) i++;
      const f = (s - lens[i - 1]) / (lens[i] - lens[i - 1]), p = curve[i - 1].clone().lerp(curve[i], f);
      const u = V().subVectors(curve[i], curve[i - 1]).normalize(), [s1, s2] = frame(u);
      link(p, u, k % 2 ? s1 : s2, keys[k % keys.length]);
    }
  }
  function crane(p, key, yaw, s = 0.45) {
    const q = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw);
    const T = (x, y, z) => V(x * s, y * s - 0.07 * s, z * s).applyQuaternion(q).add(p);
    plate(key, [T(0, 0.03, 0.16), T(0, -0.09, 0), T(0, 0.03, -0.16), T(0, 0.07, 0)], 0.035 * s);
    plate(key, [T(0.01, 0.05, 0.1), T(0.01, 0.05, -0.1), T(0.48, 0.2, -0.06)], 0.012 * s);
    plate(key, [T(-0.01, 0.05, 0.1), T(-0.01, 0.05, -0.1), T(-0.48, 0.2, -0.06)], 0.012 * s);
    plate(key, [T(0, -0.01, 0.09), T(0, 0.05, 0.13), T(0, 0.36, 0.36)], 0.025 * s);
    plate(key, [T(0, 0.37, 0.36), T(0, 0.3, 0.33), T(0, 0.3, 0.47)], 0.025 * s);
    plate(key, [T(0, -0.01, -0.09), T(0, 0.05, -0.13), T(0, 0.38, -0.39)], 0.025 * s);
  }
  function streamer(p, k0) {
    const ball = p.clone().add(V(0, -0.22, 0)), Rb = 0.13;
    hang(p, "wave", () => {
      thread(p, ball.clone().add(V(0, Rb - 0.01, 0)));
      lathe(PAPERS[k0 % 6], Array.from({ length: 7 }, (_, k) => [Rb * Math.cos(-Math.PI / 2 + (k * Math.PI) / 6), Rb * Math.sin(-Math.PI / 2 + (k * Math.PI) / 6) + ball.y]), 10, ball.x, ball.z);
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * TAU + 0.2, len = range(1.0, 1.25);
        const o = ball.clone().add(V(Math.cos(a) * 0.1, -0.05, Math.sin(a) * 0.1));
        const pts = Array.from({ length: 9 }, (_, j) => o.clone().add(V(0, (-len * j) / 8, 0)));
        ribbon(PAPERS[(k + k0 + 1) % 6], pts, 0.05, 0.01, V(-Math.sin(a), 0, Math.cos(a)));
      }
    }, { amp: 13 * DEG, len: 1.5 });
  }
  function net(p, key) {
    const n = 7, rows = 9, len = 0.6, top = p.clone().add(V(0, -0.28, 0));
    const r = (v) => 0.035 + 0.1 * Math.sin(Math.PI * Math.pow(v, 0.75)) + 0.02 * v;
    const P = (i, j) => { const v = j / rows, a = ((i + 0.5 * (j % 2)) / n) * TAU; return top.clone().add(V(Math.cos(a) * r(v), -len * v, Math.sin(a) * r(v))); };
    hang(p, "swing", () => {
      thread(p, top);
      lathe(key, [[0.03, top.y - 0.03], [0.042, top.y - 0.03], [0.042, top.y + 0.005], [0.03, top.y + 0.005]], 10, top.x, top.z, true);
      for (let j = 0; j < rows; j++) for (let i = 0; i < n; i++) {
        const i2 = j % 2 ? i + 1 : i - 1;
        rod(key, [P(i, j), P(i, j + 1)], 0.006, 0.006, 3);
        rod(key, [P(i, j), P(((i2 % n) + n) % n, j + 1)], 0.006, 0.006, 3);
      }
    }, { amp: 10 * DEG });
  }

  // pick the unused branch nearest a target height and azimuth
  function pick(y, az) {
    let best = null, bd = 1e9;
    for (const b of branches) {
      if (b.used) continue;
      const da = Math.atan2(Math.sin(b.az - az), Math.cos(b.az - az)), d = Math.abs(b.y - y) * 2 + Math.abs(da);
      if (d < bd) (bd = d), (best = b);
    }
    best.used = true;
    return best;
  }
  const specials = [];
  {
    const b1 = pick(2.9, 0.3), b2 = pick(2.6, 2.7);
    specials.push(b1.at(0.9), b2.at(0.9));
    streamer(b1.at(0.9), 0);
    streamer(b2.at(0.9), 3);
    const bn = pick(2.0, 1.1);
    specials.push(bn.at(0.92));
    net(bn.at(0.92), "pink");
    // a string of three cranes, and two singles
    const bc = pick(3.05, 1.0), pc = bc.at(0.7);
    specials.push(pc);
    hang(pc, "spin", () => {
      thread(pc, pc.clone().add(V(0, -0.62, 0)));
      ["white", "red", "yellow"].forEach((k, i) => crane(pc.clone().add(V(0, -0.15 - i * 0.22, 0)), k, -hero + 0.3 * i));
    }, { amp: 8 * DEG });
    for (const [y, az, key] of [[2.0, 0.1, "red"], [2.6, 1.9, "blue"]]) {
      const b = pick(y, az), p = b.at(0.85);
      specials.push(p);
      hang(p, "spin", () => { thread(p, p.clone().add(V(0, -0.14, 0))); crane(p.clone().add(V(0, -0.17, 0)), key, -hero + range(-0.4, 0.4)); }, { amp: 12 * DEG });
    }
    // kusari: a swag across the front of the crown, and one chain hanging straight
    const ba = pick(2.3, 0.4), bb = pick(2.55, 2.1), A = ba.at(0.9), B = bb.at(0.9);
    const swag = Array.from({ length: 13 }, (_, k) => { const f = k / 12; return A.clone().lerp(B, f).add(V(0, -0.45 * 4 * f * (1 - f), 0)); });
    hang(A.clone().lerp(B, 0.5), "swag", () => chain(swag, ["red", "yellow", "blue"]), { amp: 6 * DEG, axis: V().subVectors(B, A).normalize(), A });
    const bv = pick(3.3, 2.0), pv = bv.at(0.75);
    specials.push(pv);
    hang(pv, "swing", () => chain([pv, pv.clone().add(V(0, -0.85, 0))], ["lime", "pink", "white"]), { amp: 8 * DEG });
  }
  // tanzaku: hang points along every branch, kept clear of the specials, dealt in a shuffled order
  {
    const cand = [];
    for (const b of branches) {
      const k = Math.max(2, Math.round(b.L / 0.1));
      for (let i = 0; i < k; i++) {
        const p = b.at(0.22 + (0.55 * (i + 0.5)) / k).add(V(0, -0.01, 0));
        if (specials.every((q) => Math.hypot(p.x - q.x, p.z - q.z) > 0.16 || Math.abs(p.y - q.y) > 0.9)) cand.push({ p, key: rnd() });
      }
    }
    cand.sort((a, b) => a.key - b.key);
    cand.slice(0, Math.max(0, strips)).forEach((cd, i) => tanzaku(cd.p, i));
  }

  // ---------- meshes ----------
  const MAT = {
    culm: [c.culm, c.culmShade, { threshold: -0.4, px: 3 }],
    node: [c.node, c.node, { outline: false }],
    leaf: [c.leaf, c.leafShade, { threshold: 0.35, px: 2 }],
    base: [c.base, c.baseShade, { threshold: 0.1, px: 3 }],
  };
  for (const k of PAPERS) MAT[k] = [c[k], c[k], { threshold: -1, px: 2 }];
  const meshes = {};
  for (const [key, s] of Object.entries(soups)) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    const [base, shade, o] = MAT[key];
    const mesh = kit.toon(g, base, shade, o);
    mesh.name = key;
    body.add(mesh);
    const hn = g.attributes.hullNormal;
    meshes[key] = { g, P: Float32Array.from(s.p), N: Float32Array.from(s.n), HN: hn ? Float32Array.from(hn.array) : null };
  }

  // ---------- size ----------
  root.updateMatrixWorld(true);
  const top = new THREE.Box3().setFromObject(body).max.y;
  body.scale.setScalar(height / top);

  // ---------- breeze ----------
  // Sign convention: rotation about +Z by +a swings a hanging part toward +X (downwind); about +X by +a toward -Z.
  // Every term is sin(2 pi (n f + ph)) with whole n, so f = 1 is f = 0: the clip loops.
  const CLIPS = { breeze: 4 };
  const q = new THREE.Quaternion(), e = new THREE.Euler(), o = V(), nv = V();
  function apply(f, on) {
    const sw = (n, ph) => Math.sin(TAU * (n * f + ph));
    for (const h of hangers) {
      let fixed = null;
      if (!on) fixed = q.identity();
      else if (h.kind === "swag") fixed = q.setFromAxisAngle(h.axis, h.amp * (0.5 + sw(1, h.ph)));
      else if (h.kind !== "wave") {
        const twist = h.kind === "spin" ? 0.45 * sw(1, h.ph3) : h.kind === "strip" ? 0.35 * sw(2, h.ph3) : 0;
        e.set(h.amp * 0.4 * sw(1, h.ph2), twist, h.amp * (0.45 + 0.55 * sw(1, h.ph) + 0.2 * sw(3, h.ph2)), "ZXY");
        fixed = q.setFromEuler(e);
      }
      const piv = h.kind === "swag" ? h.A : h.pivot;
      for (const r of h.ranges) {
        const m = meshes[r.key], P = m.g.attributes.position.array, N = m.g.attributes.normal.array, HN = m.HN && m.g.attributes.hullNormal.array;
        for (let v = r.a; v < r.b; v++) {
          const i = v * 3;
          if (!fixed) {
            const d = Math.max(0, h.pivot.y - m.P[i + 1]) / h.len;
            e.set(h.amp * 0.5 * d * sw(1, h.ph2 - 0.6 * d), 0, h.amp * (0.3 + 0.8 * d) * (0.55 + 0.45 * sw(1, h.ph - 0.9 * d) + 0.15 * sw(2, h.ph3 - d)), "ZXY");
            q.setFromEuler(e);
          }
          o.set(m.P[i] - piv.x, m.P[i + 1] - piv.y, m.P[i + 2] - piv.z).applyQuaternion(q).add(piv);
          P[i] = o.x, P[i + 1] = o.y, P[i + 2] = o.z;
          nv.set(m.N[i], m.N[i + 1], m.N[i + 2]).applyQuaternion(q);
          N[i] = nv.x, N[i + 1] = nv.y, N[i + 2] = nv.z;
          if (HN) nv.set(m.HN[i], m.HN[i + 1], m.HN[i + 2]).applyQuaternion(q), (HN[i] = nv.x), (HN[i + 1] = nv.y), (HN[i + 2] = nv.z);
        }
      }
    }
    for (const m of Object.values(meshes)) {
      m.g.attributes.position.needsUpdate = true;
      m.g.attributes.normal.needsUpdate = true;
      if (m.HN) m.g.attributes.hullNormal.needsUpdate = true;
      m.g.computeBoundingSphere();
      m.g.computeBoundingBox();
    }
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`tanabata: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      const T = CLIPS[m[1]];
      return apply((((+m[2] % T) + T) % T) / T, true);
    }
    if (name !== "rest") throw new Error(`tanabata: unknown pose "${name}" (rest, or breeze@<seconds>)`);
    apply(0, false);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
