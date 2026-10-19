// school-pool.js - the outdoor school swimming pool of every summer anime: six lanes in a pale concrete deck, red and
// yellow lane ropes, starting blocks, steel ladders, a tall green mesh fence, a shower bar and a low changing-room block.
// Static. Contract: harness/lab/README.md. Meters, +Y up, lanes run along X (starting blocks at the -X end, facing +X),
// the changing rooms stand on the -Z side facing the pool, stands on y = 0, centred on x = 0, z = 0.
// One set with models/school.js (same script, same fence colours).
//
// Construction (boxes, flat quads and swept tubes, all triangle soups merged per material; flat-shaded, so the deck
// planes read crisp):
//   DECK     a raised concrete slab 0.4 m thick (the low pool edge of many school pools): ONE closed ring solid on a
//            4 x 4 grid round the pool hole (no T-junctions, so the hull has no seams), the hole's walls are the pool's.
//            The water is ONE flat quad 6 cm under the deck (no hull, sky one-tone): the identity cue is the big
//            pale-blue rectangle edged by the dark gutter.
//   GUTTER   the overflow grating: a dark band round the hole on the deck, the pool's drawn outline at any size.
//   WATER    lane lines on the floor seen through the water: stripes with their T ends, laid 4 mm over the water, dark
//            (hair on sky: lighter tones read as paint, not as a pool); sun glints: a lighter band along the far wall and short
//            sclera dashes (deterministic hash), 6 mm over the water.
//   ROPES    five float lines between the lanes: small boxes in runs, red (accent) within 5 m of each wall,
//            alternating yellow / red runs in the middle; no hull (hundreds of floats), the colour is the line.
//   BLOCKS   six starting blocks at the -X end, one per lane: inked pale pedestal, a red top plate sloping to the water.
//   LADDERS  two steel ladders on the -Z wall (they face the camera): two swept tubes over the coping into the water,
//            three rungs. Tubes wound by their axis; ends buried in the deck or under the water.
//   FENCE    round the deck edge: posts every ~2.5 m, two rails (inked 2 px; no bottom rail, so the floats show
//            under it) and a diagonal chain-link lattice (double-sided strips, no hull), as the school's rooftop fence.
//   ROOMS    a low block on the -Z deck: walls, a flat green roof slab, two dark doorways and a high window band
//            facing the pool; a shower bar (two posts, a pipe, five heads) beside it.
// Proportions (real size; base unit the lane 13/6 = 2.17 m): pool 25 x 13 (option length), deck border 2.0 (5.5 on
//   the room side); deck top 0.40, water 0.34 (floats rise 4 cm over the deck edge: the hero camera sits at deck
//   level); fence 2.5 over the deck (2.9); rooms 10 x 2.8, 2.8 tall + roof 0.2 (top 3.4);
//   blocks 0.5 x 0.55, top 0.72 over the deck; ladder rails 0.85 over the deck; shower bar 2.2.
// Options: build(THREE, kit, colors, { height, fence, length }) - length: pool length in m (12..50, default 25; the
//   deck, fence, ropes and lines follow); fence: false for none, or a number for its height (default 2.5); height
//   scales the whole set uniformly to that top (the room roof, or the fence when taller), as the school does.
// Colours (meadow, as the school), base / shade:
//   deck, rooms walls        moon #f7f3e1 / skin #f0c2ae, threshold 0.1
//   gutter, doorways, frames hair #2c5131 (one tone: lines)
//   water, window glass      sky #d7ecef, one tone
//   floor lane lines         hair #2c5131, one tone (a stripe seen through the water)
//   glints                   sclera #f6f3ee, one tone
//   floats                   accent #d9483b / practical #f2c94c, one tone each
//   block pedestals, steel   sclera #f6f3ee / sky #d7ecef, threshold 0.1
//   block tops               accent #d9483b / skin #f0c2ae
//   fence, roof              iris #3f8a47 / hair #2c5131, threshold 0.1

export const meta = {
  name: "school-pool",
  height: 3.4,
  script: "meadow",
  colors: {
    deck: "#f7f3e1", deckShade: "#f0c2ae",
    dark: "#2c5131",
    water: "#d7ecef",
    lane: "#2c5131",
    glint: "#f6f3ee",
    floatA: "#d9483b", floatB: "#f2c94c",
    steel: "#f6f3ee", steelShade: "#d7ecef",
    top: "#d9483b", topShade: "#f0c2ae",
    fence: "#3f8a47", fenceShade: "#2c5131",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const L = Math.min(50, Math.max(12, opts.length ?? 25));
  const FT = opts.fence === false ? 0 : typeof opts.fence === "number" ? Math.max(0.5, opts.fence) : 2.5;
  const root = new THREE.Group();
  root.name = "school-pool";
  const body = new THREE.Group(); // uniform size scale lives here
  body.name = "body";
  root.add(body);

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  function tri(key, a, b, e, ref) { // wound away from ref (inside the solid, or behind a flat quad)
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-9) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    S(key).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  const box = (key, x0, x1, y0, y1, z0, z1) =>
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  // flat horizontal quad facing up at height y
  const flat = (key, x0, x1, z0, z1, y) => quad(key, [x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [(x0 + x1) / 2, y - 1, (z0 + z1) / 2]);
  // vertical quad on the plane z = z, facing +Z (toward the pool from the -Z side)
  const zface = (key, x0, x1, y0, y1, z) => quad(key, [x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [(x0 + x1) / 2, (y0 + y1) / 2, z - 1]);
  const hash = (...k) => {
    let h = 2166136261;
    for (const v of k) h = Math.imul(h ^ (v + 0x9e37), 16777619) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
    return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
  };
  // swept tube along a polyline, both ends capped (flat-shaded like the rest of the soup)
  function tube(key, pts, r, seg = 6) {
    const path = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0.1);
    const g = new THREE.TubeGeometry(path, pts.length * 6, r, seg, false).toNonIndexed();
    S(key).push(...g.attributes.position.array);
    for (const [p, q] of [[pts[0], pts[1]], [pts[pts.length - 1], pts[pts.length - 2]]]) { // caps: fans wound outward
      const ctr = [p[0], p[1], p[2]], inside = [p[0] + (q[0] - p[0]) * 0.01, p[1] + (q[1] - p[1]) * 0.01, p[2] + (q[2] - p[2]) * 0.01];
      const d = sub(q, p), l = Math.hypot(...d), t = d.map((v) => v / l);
      const u0 = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const u = cross(t, u0), ul = Math.hypot(...u), uu = u.map((v) => v / ul), vv = cross(t, uu);
      for (let i = 0; i < seg; i++) {
        const P = (k) => { const a = (k / seg) * Math.PI * 2; return [0, 1, 2].map((j) => ctr[j] + r * (Math.cos(a) * uu[j] + Math.sin(a) * vv[j])); };
        tri(key, ctr, P(i), P(i + 1), inside);
      }
    }
  }

  // ---------- dimensions ----------
  const W = 13, HL = L / 2, HW = W / 2, LANE = W / 6;
  const BR = 2.0, BB = 5.5; // deck border, deck on the room side (-Z)
  const D = 0.4, WY = 0.34; // deck top, water level
  const X0 = -HL - BR, X1 = HL + BR, Z0 = -HW - BB, Z1 = HW + BR; // deck outline
  const RH = 2.8, RT = 0.2; // room wall height, roof slab
  const top = Math.max(D + RH + RT, D + FT + 0.05);
  const k = opts.height ? opts.height / top : 1;
  body.scale.setScalar(k);
  body.position.set(0, 0, (-(Z0 + Z1) / 2) * k);

  // ---------- deck: four boxes round the hole ----------
  // one closed ring solid on a 4 x 4 grid (no T-junctions, so the hull closes without seams at the box joins)
  const xs = [X0, -HL, HL, X1], zs = [Z0, -HW, HW, Z1];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      if (i === 1 && j === 1) continue;
      const [a, b, e, f] = [xs[i], xs[i + 1], zs[j], zs[j + 1]];
      quad("deck", [a, D, e], [b, D, e], [b, D, f], [a, D, f], [a, 0, e]); // top
      quad("deck", [a, 0, e], [b, 0, e], [b, 0, f], [a, 0, f], [a, D, e]); // bottom
    }
  for (let i = 0; i < 3; i++) { // outer walls, split at the grid
    for (const z of [Z0, Z1]) quad("deck", [xs[i], 0, z], [xs[i + 1], 0, z], [xs[i + 1], D, z], [xs[i], D, z], [0, D / 2, 0]);
    for (const x of [X0, X1]) quad("deck", [x, 0, zs[i]], [x, 0, zs[i + 1]], [x, D, zs[i + 1]], [x, D, zs[i]], [0, D / 2, 0]);
  }
  for (const s of [-1, 1]) { // pool walls, facing into the hole
    quad("deck", [-HL, 0, s * HW], [HL, 0, s * HW], [HL, D, s * HW], [-HL, D, s * HW], [0, D / 2, s * (HW + 1)]);
    quad("deck", [s * HL, 0, -HW], [s * HL, 0, HW], [s * HL, D, HW], [s * HL, D, -HW], [s * (HL + 1), D / 2, 0]);
  }
  // gutter grating round the hole, 4 mm proud of the deck
  const G = 0.22, gy = D + 0.004;
  flat("dark", -HL - G, HL + G, HW, HW + G, gy);
  flat("dark", -HL - G, HL + G, -HW - G, -HW, gy);
  flat("dark", -HL - G, -HL, -HW, HW, gy);
  flat("dark", HL, HL + G, -HW, HW, gy);

  // ---------- water ----------
  flat("water", -HL, HL, -HW, HW, WY);
  const ly = WY + 0.004;
  for (let i = 0; i < 6; i++) { // floor lane lines with T ends, 2 m short of each wall
    const z = -HW + LANE * (i + 0.5), hw = 0.11;
    flat("lane", -HL + 2, HL - 2, z - hw, z + hw, ly);
    for (const x of [-HL + 2, HL - 2]) flat("lane", x - hw, x + hw, z - 0.5, z + 0.5, ly + 0.001);
  }
  // end-wall targets: short stripes at the water edge, in line with the lanes
  for (let i = 0; i < 6; i++) {
    const z = -HW + LANE * (i + 0.5);
    for (const x of [-HL, HL - 0.6]) flat("lane", x, x + 0.6, z - 0.13, z + 0.13, ly);
  }
  // glints: a pale band along the far (-Z) wall, and short dashes scattered in the lanes
  const gl = WY + 0.006;
  flat("glint", -HL, HL, -HW, -HW + 0.3, gl);
  for (let i = 0; i < Math.round(L * 1.1); i++) {
    const x = -HL + 1 + hash(i, 1) * (L - 2), z = -HW + 0.8 + hash(i, 2) * (W - 1.6), len = 1.0 + hash(i, 3) * 2.0;
    if (Math.abs(((z + HW) / LANE) % 1) < 0.12) continue; // keep off the ropes
    quad("glint", [x, gl, z], [x + len, gl, z - 0.05], [x + len, gl, z + 0.03], [x, gl, z + 0.08], [x, gl - 1, z]);
  }

  // ---------- lane ropes ----------
  const FS = 0.3, FH = 0.1, FW = 0.16; // float spacing, height over water, width
  for (let r = 1; r < 6; r++) {
    const z = -HW + LANE * r, n = Math.floor(L / FS);
    for (let i = 0; i < n; i++) {
      const x = -HL + FS * (i + 0.5), fromWall = Math.min(x + HL, HL - x);
      const key = fromWall < 5 ? "floatA" : Math.floor((x + HL) / (FS * 3)) % 2 ? "floatB" : "floatA";
      box(key, x - FW * 0.45, x + FW * 0.45, WY - 0.03, WY + FH, z - FW / 2, z + FW / 2);
    }
  }

  // ---------- starting blocks at the -X end ----------
  for (let i = 0; i < 6; i++) {
    const z = -HW + LANE * (i + 0.5), xb = -HL - 0.62, xf = -HL - 0.08;
    box("steel", xb + 0.05, xf - 0.05, D - 0.05, D + 0.6, z - 0.22, z + 0.22);
    hex("top", [[xb, D + 0.62, z - 0.27], [xf + 0.04, D + 0.6, z - 0.27], [xf + 0.04, D + 0.6, z + 0.27], [xb, D + 0.62, z + 0.27],
      [xb, D + 0.78, z - 0.27], [xf + 0.04, D + 0.7, z - 0.27], [xf + 0.04, D + 0.7, z + 0.27], [xb, D + 0.78, z + 0.27]]);
  }

  // ---------- ladders on the -Z wall ----------
  for (const xc of [-HL + 2.2, HL - 2.2]) {
    for (const s of [-0.26, 0.26]) {
      const x = xc + s;
      tube("steel", [[x, D - 0.05, -HW - 0.45], [x, D + 0.6, -HW - 0.4], [x, D + 0.85, -HW - 0.2], [x, D + 0.7, -HW + 0.08],
        [x, D + 0.2, -HW + 0.16], [x, WY - 0.2, -HW + 0.16]], 0.035);
    }
    for (const y of [D - 0.02, WY - 0.1]) box("steel", xc - 0.26, xc + 0.26, y - 0.025, y + 0.025, -HW + 0.12, -HW + 0.2);
  }

  // ---------- changing rooms and shower bar on the -Z deck ----------
  const RL = Math.min(10, L - 9), rx0 = -HL + 1.5, rx1 = rx0 + RL;
  const rz0 = Z0 + 0.6, rz1 = rz0 + 2.8;
  box("deck", rx0, rx1, D - 0.05, D + RH, rz0, rz1);
  box("fence", rx0 - 0.3, rx1 + 0.3, D + RH, D + RH + RT, rz0 - 0.3, rz1 + 0.4); // flat roof slab
  const fz = rz1 + 0.01;
  for (const u of [0.25, 0.75]) { // two dark doorways
    const xd = rx0 + RL * u;
    zface("dark", xd - 0.5, xd + 0.5, D, D + 2.05, fz);
  }
  for (const [u0, u1] of [[0.05, 0.17], [0.33, 0.67], [0.83, 0.95]]) { // high window band
    const a = rx0 + RL * u0, b = rx0 + RL * u1;
    zface("dark", a - 0.05, b + 0.05, D + 1.75, D + 2.35, fz);
    const n = Math.max(1, Math.round((b - a) / 0.9));
    for (let i = 0; i < n; i++) zface("water", a + ((b - a) * i) / n + 0.04, a + ((b - a) * (i + 1)) / n - 0.04, D + 1.79, D + 2.31, fz + 0.01);
  }
  // shower bar
  const sx0 = Math.min(rx1 + 2.0, HL - 1), sx1 = Math.min(sx0 + 4.5, X1 - 1), sz = rz1 + 1.1, sy = D + 2.2;
  for (const x of [sx0, sx1]) box("steel", x - 0.05, x + 0.05, D - 0.05, sy + 0.05, sz - 0.05, sz + 0.05);
  box("steel", sx0, sx1, sy - 0.04, sy + 0.04, sz - 0.04, sz + 0.04);
  for (let i = 1; i <= 5; i++) {
    const x = sx0 + ((sx1 - sx0) * i) / 6;
    box("steel", x - 0.025, x + 0.025, sy - 0.25, sy, sz - 0.025, sz + 0.025);
    box("steel", x - 0.08, x + 0.08, sy - 0.32, sy - 0.25, sz - 0.08, sz + 0.08);
  }
  flat("dark", sx0 - 0.3, sx1 + 0.3, sz - 0.5, sz + 0.5, gy); // drain grating under it

  // ---------- fence ----------
  if (FT > 0) {
    const ins = 0.12, fx0 = X0 + ins, fx1 = X1 - ins, fz0 = Z0 + ins, fz1 = Z1 - ins;
    const fence = (a, b) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), d = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
      const P = (u, y, o = 0) => [a[0] + d[0] * u - d[1] * o, y, a[1] + d[1] * u + d[0] * o];
      const n = Math.max(1, Math.round(len / 2.5));
      for (let i = 0; i <= n; i++) {
        const [x, , z] = P((len * i) / n, 0);
        box("fence", x - 0.05, x + 0.05, D - 0.05, D + FT + 0.05, z - 0.05, z + 0.05);
      }
      for (const y of [D + FT * 0.5, D + FT]) { // no bottom rail: the float lines show under the mesh at hero
        const [x0, , z0] = P(0, 0), [x1, , z1] = P(len, 0);
        box("fence", Math.min(x0, x1) - 0.03, Math.max(x0, x1) + 0.03, y - 0.03, y + 0.03, Math.min(z0, z1) - 0.03, Math.max(z0, z1) + 0.03);
      }
      const step = 0.45, hw = 0.022, h = FT - 0.1, y0 = D + 0.1;
      for (const dir of [1, -1]) {
        for (let s = -h; s < len; s += step) {
          const t0 = Math.max(0, -s), t1 = Math.min(h, len - s);
          if (t1 - t0 < 0.02) continue;
          const yA = dir > 0 ? t0 : h - t0, yB = dir > 0 ? t1 : h - t1, ua = s + t0, ub = s + t1, q = hw * Math.SQRT2;
          quad("net", P(ua - q, y0 + yA), P(ub - q, y0 + yB), P(ub + q, y0 + yB), P(ua + q, y0 + yA), P((ua + ub) / 2, y0 + h / 2, -1));
        }
      }
    };
    fence([fx0, fz1], [fx1, fz1]);
    fence([fx1, fz1], [fx1, fz0]);
    fence([fx1, fz0], [fx0, fz0]);
    fence([fx0, fz0], [fx0, fz1]);
  }

  // ---------- meshes ----------
  const MAT = {
    deck: [c.deck, c.deckShade, 0.1, {}],
    dark: [c.dark, c.dark, 0.1, { outline: false }],
    water: [c.water, c.water, -0.4, { outline: false }],
    lane: [c.lane, c.lane, -0.4, { outline: false }],
    glint: [c.glint, c.glint, -0.4, { outline: false }],
    floatA: [c.floatA, c.floatA, -0.4, { outline: false }],
    floatB: [c.floatB, c.floatB, -0.4, { outline: false }],
    steel: [c.steel, c.steelShade, 0.1, { px: 2 }],
    top: [c.top, c.topShade, 0.1, { px: 3 }],
    fence: [c.fence, c.fenceShade, 0.1, { px: 2 }],
    net: [c.fence, c.fenceShade, 0.1, { outline: false, doubleSided: true }],
  };
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, o] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, { threshold, ...o });
    mesh.name = key;
    body.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints: {}, pose };
}
