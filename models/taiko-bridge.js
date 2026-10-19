// taiko-bridge.js - a taikobashi (drum bridge): the steep, near-semicircular vermilion arched bridge over a shrine or
// garden pond, static. Contract: harness/lab/README.md. Meters, +Y up, the bridge's side elevation faces +Z (you walk
// across it along x), its left is +X, stands on y = 0, centred on x = 0, z = 0.
//
// Construction (triangle soups merged per material, so the whole bridge is 5 meshes, 8 with the pond; winding always comes from a
// point inside each solid, never by hand):
//   ARCH     one circular arc for the deck top through the two arch feet (x = +-S/2, y = YE) and the crown (y = YE + R):
//            radius r = ((S/2)^2 + R^2) / (2R). At the default span the feet leave at 53 deg, the drum look. Beyond the
//            feet the deck runs flat for LAND m over each stone abutment.
//   GIRDERS  two vermilion side beams (keta), lofted along the deck curve (sections perpendicular to it), from 0.32 m
//            under the deck top to a 6 cm curb above it; they carry the railing and draw the arch band in elevation.
//   DECK     transverse planks laid along the curve with 1.5 cm gaps over a dark sub-deck, so every seam shows as a line
//            from above; on the steep parts (slope > 20 deg) each plank carries a dark cleat (the stepped treads).
//   RAILING  koran on both sides: vertical posts at equal arc length (one at the crown), end posts (oyabashira) on the
//            abutments, a top rail (hoko-gi) and a mid rail at constant vertical height over the deck, both lofted.
//            Every post is topped by a bronze giboshi: a lathed onion bulb on a collar, larger on the end posts.
//   STONE    an abutment block at each end with a low step, wider than the deck, the arch feet buried in it, with
//            dark block joints on the faces that show.
//   WATER    (opts.water) a flat inked elliptical pond slab under the arch, between the abutments, and a lighter
//            reflection band on it: the girder band mirrored onto the water toward +Z (height y laid at z = W/2 + 0.7 y),
//            so from above the arch and its reflection close the drum; a few pale ripple streaks.
// Proportions (real size, base unit the width W = 1.8 m): span S = 8.0 (4.4 W), rise R = 2.0, arch feet on the abutments
// at YE = 0.35, crown deck top 2.35; railing top rail 0.85 over the deck, posts every ~1.55 m of arc; end posts 1.05 tall;
// giboshi 0.34 / 0.27 tall; abutments 1.3 x 0.35 x 2.5 per end; overall 10.9 m long, top 3.565 (crown giboshi).
// Options: build(THREE, kit, colors, { height, span, water }). span (m, default 8) changes the arc only: the rise stays
// 2.0 m (capped at 0.45 * span), so a 6 m span is steeper and a 10 m span flatter. height scales the whole bridge
// uniformly (height / 3.565), as the torii's does. water: true adds the pond (default false).
// Colours (noon, the torii / shrine set): vermilion accent #c4452d / iris #5c3d32 at threshold 0.1, so faces square to
// the camera stay vermilion. Deck planks sky #f2d7ae / skin #f0c2ae (pale unpainted wood); sub-deck and cleats hair
// #241c16 (lines, no hull). Giboshi bronze iris #5c3d32 / hair #241c16 at 0.3, a dark knob on the vermilion. Stone
// sclera #f6f3ee / skin. Water iris / hair (a dark still pond, flat top lit so one iris tone), the reflection band
// vermilion accent (lighter than the water, no hull), ripples sky.

export const meta = {
  name: "taiko-bridge",
  height: 3.565,
  script: "noon",
  colors: {
    vermilion: "#c4452d", vermilionShade: "#5c3d32",
    plank: "#f2d7ae", plankShade: "#f0c2ae",
    line: "#241c16",
    bronze: "#5c3d32", bronzeShade: "#241c16",
    stone: "#f6f3ee", stoneShade: "#f0c2ae",
    water: "#5c3d32", waterShade: "#241c16",
    reflection: "#c4452d",
    ripple: "#f2d7ae",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, span = 8, water = false } = opts;
  const root = new THREE.Group();
  root.name = "taiko-bridge";
  const bridge = new THREE.Group(); // uniform size scale lives here, so root stays the plain contract node
  bridge.name = "bridge";
  bridge.scale.setScalar(height / meta.height);
  root.add(bridge);
  const joints = {};

  // ---------- triangle soups (positions + normals per material key) ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  // one flat triangle wound away from `ref` (a point inside the solid); slivers dropped
  function tri(key, a, b, e, ref) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-9) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    const flip = dot(n, sub(m, ref)) < 0;
    if (flip) n = n.map((x) => -x);
    n = nrm(n);
    const s = S(key);
    s.p.push(...a, ...(flip ? [...e, ...b] : [...b, ...e]));
    s.n.push(...n, ...n, ...n);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, cx, cy, cz, sx, sy, sz) {
    const [x0, x1, y0, y1, z0, z1] = [cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2];
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // a smooth lathe (giboshi) appended to a soup at (x, y, z); profile [radius, height] from the axis to the axis
  function lathe(key, profile, x, y, z, seg = 12) {
    const g = new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), seg).toNonIndexed();
    g.computeVertexNormals();
    const P = g.attributes.position.array, N = g.attributes.normal.array, s = S(key);
    for (let i = 0; i < P.length; i += 3) s.p.push(P[i] + x, P[i + 1] + y, P[i + 2] + z);
    // LatheGeometry's own normals average the seam; keep them (smooth bulb)
    for (let i = 0; i < N.length; i++) s.n.push(N[i]);
  }

  // ---------- the deck curve ----------
  const W = 1.8, YE = 0.35, LAND = 0.6;
  const R = Math.min(2.0, 0.45 * span), H = span / 2;
  const r = (H * H + R * R) / (2 * R), yc = YE + R - r, TH = Math.asin(H / r);
  const deckY = (x) => (Math.abs(x) >= H ? YE : yc + Math.sqrt(r * r - x * x));
  const XEND = H + LAND; // deck and rails end here, over the abutments
  // samples of the deck top along x, with the arc dense and the flat landings as two points each
  const ARC_N = 48;
  const curve = [[-XEND, YE]];
  for (let i = 0; i <= ARC_N; i++) { const a = -TH + (2 * TH * i) / ARC_N; curve.push([r * Math.sin(a), yc + r * Math.cos(a)]); }
  curve.push([XEND, YE]);
  // unit normal (up-ish) of the curve at sample i, from the averaged neighbouring segments
  const curveN = (pts, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const t = nrm([b[0] - a[0], b[1] - a[1], 0]);
    return [-t[1], t[0]];
  };

  // loft along a 2D path in the XY plane at depth z: section = [[normal offset, z offset], ...] (convex, ring order)
  function sweep(key, pts, z, section) {
    const rings = pts.map((p, i) => {
      const n = curveN(pts, i);
      return section.map(([o, dz]) => [p[0] + n[0] * o, p[1] + n[1] * o, z + dz]);
    });
    const cen = (i) => { const rr = rings[i]; return [0, 1, 2].map((k) => rr.reduce((s, q) => s + q[k], 0) / rr.length); };
    const m = section.length;
    for (let i = 0; i < rings.length - 1; i++) {
      const ref = cen(i).map((v, k) => (v + cen(i + 1)[k]) / 2);
      for (let k = 0; k < m; k++) quad(key, rings[i][k], rings[i][(k + 1) % m], rings[i + 1][(k + 1) % m], rings[i + 1][k], ref);
    }
    for (const [i, j] of [[0, 1], [rings.length - 1, rings.length - 2]]) {
      const ref = cen(j);
      for (let k = 1; k < m - 1; k++) tri(key, rings[i][0], rings[i][k], rings[i][k + 1], ref);
    }
  }
  const rect = (o0, o1, hz) => [[o0, -hz], [o1, -hz], [o1, hz], [o0, hz]];

  // ---------- girders (keta) and sub-deck ----------
  const ZG = W / 2 - 0.06; // girder centre
  for (const s of [1, -1]) sweep("vermilion", curve, s * ZG, rect(-0.32, 0.06, 0.07));
  sweep("line", curve, 0, rect(-0.12, -0.065, ZG - 0.05));

  // ---------- planks and cleats ----------
  const PW = W - 0.26, PT = 0.06; // plank length (across), thickness
  const plank = (p0, p1, n0, n1) => {
    const hz = PW / 2, P = (p, n, o, zz) => [p[0] + n[0] * o, p[1] + n[1] * o, zz];
    hex("plank", [P(p0, n0, -PT, -hz), P(p1, n1, -PT, -hz), P(p1, n1, -PT, hz), P(p0, n0, -PT, hz),
      P(p0, n0, 0, -hz), P(p1, n1, 0, -hz), P(p1, n1, 0, hz), P(p0, n0, 0, hz)]);
  };
  const arcLen = 2 * r * TH, NP = Math.round(arcLen / 0.24), gapA = 0.015 / r;
  const at = (a) => [r * Math.sin(a), yc + r * Math.cos(a)], nAt = (a) => [Math.sin(a), Math.cos(a)];
  for (let i = 0; i < NP; i++) {
    const a0 = -TH + (2 * TH * i) / NP + gapA / 2, a1 = -TH + (2 * TH * (i + 1)) / NP - gapA / 2;
    plank(at(a0), at(a1), nAt(a0), nAt(a1));
    const am = (a0 + a1) / 2;
    if (Math.abs(am) > 20 * Math.PI / 180) {
      // cleat on the downhill third of the plank: a dark batten 3 cm proud, across the plank
      const ac = am - Math.sign(am) * (a1 - a0) * 0.2, hw = 0.022 / r;
      const p0 = at(ac - hw), p1 = at(ac + hw), n0 = nAt(ac - hw), n1 = nAt(ac + hw), hz = PW / 2 - 0.04;
      const P = (p, n, o, zz) => [p[0] + n[0] * o, p[1] + n[1] * o, zz];
      hex("line", [P(p0, n0, -0.01, -hz), P(p1, n1, -0.01, -hz), P(p1, n1, -0.01, hz), P(p0, n0, -0.01, hz),
        P(p0, n0, 0.035, -hz), P(p1, n1, 0.035, -hz), P(p1, n1, 0.035, hz), P(p0, n0, 0.035, hz)]);
    }
  }
  for (const s of [1, -1]) // flat landing planks over the abutments
    for (let x = H + 0.02; x < XEND - 0.1; x += 0.255) plank([s * x, YE], [s * (x + 0.24), YE], [0, 1], [0, 1]);

  // ---------- railing (koran) ----------
  const RAIL = 0.85, MID = 0.45;
  const railPath = (dy) => curve.map(([x, y]) => [x, y + dy]);
  const ZR = ZG; // posts and rails ride the girder
  // posts: equal arc length on the arch, one at the crown; end posts over the abutments
  const NSEG = 2 * Math.max(1, Math.round(arcLen / 3.1)); // even: a crown post
  const posts = [];
  for (let k = 1; k < NSEG; k++) posts.push({ x: r * Math.sin(-TH + (2 * TH * k) / NSEG), end: false });
  for (const s of [1, -1]) posts.push({ x: s * (XEND - 0.1), end: true });
  for (const s of [1, -1]) {
    const z = s * ZR;
    sweep("vermilion", railPath(RAIL), z, [[0, -0.05], [0.035, -0.035], [0.05, 0], [0.035, 0.035], [0, 0.05], [-0.035, 0.035], [-0.05, 0], [-0.035, -0.035]]);
    sweep("vermilion", railPath(MID), z, rect(-0.03, 0.03, 0.03));
    for (const { x, end } of posts) {
      const y0 = deckY(x) - 0.02, top = deckY(x) + (end ? 1.05 : RAIL + 0.1), hw = end ? 0.09 : 0.06;
      box("vermilion", x, (y0 + top) / 2, z, 2 * hw, top - y0, 2 * hw);
      // giboshi: collar disc, waist, onion bulb, drawn point
      const k = end ? 1.3 : 1;
      lathe("bronze", [[0, 0], [hw * 1.08, 0], [hw * 1.08, 0.035 * k], [0.035 * k, 0.05 * k], [0.06 * k, 0.075 * k],
        [0.092 * k, 0.115 * k], [0.088 * k, 0.15 * k], [0.06 * k, 0.18 * k], [0.022 * k, 0.205 * k], [0.008 * k, 0.23 * k], [0, 0.265 * k]], x, top, z, 10);
    }
  }

  // ---------- stone abutments ----------
  for (const s of [1, -1]) {
    box("stone", s * (H + 0.35), YE / 2, 0, 1.3, YE, W + 0.7);
    box("stone", s * (H + 1.2), 0.09, 0, 0.5, 0.18, W + 0.3); // low step stone off the end
    // block joints: dark strips 1 cm proud on the faces that show (top, both long sides, the outer end)
    const x0 = s * (H - 0.3), x1 = s * (H + 1.0), zf = (W + 0.7) / 2;
    for (const f of [0.3, 0.62]) {
      const x = x0 + (x1 - x0) * f;
      box("line", x, YE + 0.004, zf - 0.22, 0.022, 0.01, 0.44); // across the top edge strip, beside the deck
      box("line", x, YE + 0.004, -zf + 0.22, 0.022, 0.01, 0.44);
      for (const sz of [1, -1]) box("line", x, YE / 2, sz * (zf + 0.004), 0.022, YE - 0.02, 0.01);
    }
    for (const zz of [-0.6, 0.6]) box("line", x1 + s * 0.004, YE / 2, zz, 0.01, YE - 0.02, 0.022);
  }

  // ---------- pond ----------
  if (water) {
    const RX = H + 0.25, RZ = 3.0, N = 40, YW = 0.03;
    const ring = (y) => Array.from({ length: N }, (_, i) => { const a = (i / N) * Math.PI * 2; return [RX * Math.cos(a), y, RZ * Math.sin(a)]; });
    const lo = ring(0), hi = ring(YW), ref = [0, YW / 2, 0];
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      tri("water", [0, YW, 0], hi[i], hi[j], ref);
      tri("water", [0, 0, 0], lo[i], lo[j], ref);
      quad("water", lo[i], lo[j], hi[j], hi[i], ref);
    }
    // reflection: the girder band mirrored in the water and laid toward the viewer (+Z), its height y drawn at
    // z = W/2 + k * y, so from above the arch and its reflection close the drum; then a few pale ripple streaks
    const z0 = W / 2, k = 0.7, yb = YW + 0.012, up = [0, yb - 1, 0];
    for (let i = 0; i < ARC_N; i++) {
      const xa = r * Math.sin(-TH + (2 * TH * i) / ARC_N), xb = r * Math.sin(-TH + (2 * TH * (i + 1)) / ARC_N);
      const Z = (x, dy) => z0 + k * (deckY(x) + dy);
      quad("reflection", [xa, yb, Z(xa, -0.32)], [xb, yb, Z(xb, -0.32)], [xb, yb, Z(xb, 0.06)], [xa, yb, Z(xa, 0.06)], up);
    }
    const inPond = (x, z) => (x / RX) ** 2 + (z / RZ) ** 2 < 0.8;
    for (const [x, z, l] of [[-1.6, 2.15, 1.4], [0.9, 2.45, 1.0], [2.6, 1.55, 0.8], [-3.0, 1.25, 0.7], [0.2, -1.7, 1.6], [-2.2, -2.1, 0.9]]) {
      if (!inPond(x - l / 2, z) || !inPond(x + l / 2, z)) continue;
      quad("ripple", [x - l / 2, yb, z - 0.03], [x + l / 2, yb, z - 0.03], [x + l / 2, yb, z + 0.03], [x - l / 2, yb, z + 0.03], up);
    }
  }

  // ---------- meshes ----------
  const MAT = {
    vermilion: [c.vermilion, c.vermilionShade, 0.1, true],
    plank: [c.plank, c.plankShade, 0.1, true],
    line: [c.line, c.line, 0.1, false],
    bronze: [c.bronze, c.bronzeShade, 0.3, true],
    stone: [c.stone, c.stoneShade, 0.1, true],
    water: [c.water, c.waterShade, 0.1, true],
    reflection: [c.reflection, c.reflection, 0.1, false],
    ripple: [c.ripple, c.ripple, 0.1, false],
  };
  for (const [key, { p, n }] of Object.entries(soups)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, base, shade, { threshold, outline });
    mesh.name = key;
    bridge.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
