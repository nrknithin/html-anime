// hinadan.js - a Hinamatsuri (Doll's Day) display: the seven-tier hinadan in the corner of a tatami room, static.
// Contract: harness/lab/README.md. Meters, +Y up, the display faces +Z, its left is +X, stands on y = 0 (the tatami
// top is y = 0.05), centred on the room. The room is a cutaway corner: plaster walls on the -Z and -X sides, open
// toward +X and +Z, so a camera in the lit front-left quadrant looks into the corner.
//
// Construction (boxes, lathes and rods, all triangle soups merged per material, so the whole set is 11 meshes; flat
// boxes read crisp, round parts carry smooth normals; every triangle is wound away from its solid's centre or along a
// given outward normal, never by hand):
//   STAND    one closed staircase solid of red felt (mōsen): the stepped side profile swept across the width. A dark
//            band 3 mm proud under every nose draws the steps from above, where no silhouette does; from the low hero
//            camera the hull adds the nose over the riser behind. Felt at threshold 0.1: treads, risers and the +X
//            side stay red; only the far -X side turns to shade.
//   DOLLS    one doll() for all fifteen: a frustum robe (elliptical, wider across), a flattened ball of sleeves held in
//            front, a white head, a hair ball set back so the face shows, and a hat (eboshi: a cap and a tall back
//            plate), a crown or long hair down the back. Court ladies have a red hakama under a white top.
//            Top tier: emperor (viewer's left, Kanto order) and empress on a black dais before a five-panel gold byōbu
//            (zigzag slabs in a dark frame), a bonbori either side (hex paper shade on a pole). Then three court ladies
//            with two pedestal stands, five musicians (three with drums), two ministers with diamond stands and trays,
//            three servants between a tachibana (dark foliage balls, gold fruit) and a peach tree (pink blossom balls
//            on rods), five lacquer pieces (tansu, nagamochi, mirror stand, hibachi, tea shelf) and on the bottom tier
//            a palanquin, a jubako stack and an ox cart with two wheels.
//   ROOM     yojōhan: four mats around a half mat, each 5 cm thick with dark heri on its long edges; two plaster walls
//            with a corner post, end posts, a baseboard and a kamoi band, cut at 2.0 m. A low lacquer table in the
//            front -X corner (clear of the hero camera's line to the stand) with hishi-mochi (three layered diamonds
//            on a diamond stand) and a bowl of hina-arare.
// Proportions (real size, base unit the tier rise R = 0.2 m): stand 1.5 wide, 7 tiers of R, treads 0.2 deep (top
//   0.38), top tread 1.45, byōbu to 1.80 (the display's height); walls 2.0 (meta.height); floor 2.73 square. Dolls (h,
//   the robe 0.6 h, head radius 0.13 h): emperor 0.24, empress 0.22, ladies 0.17, musicians 0.15, ministers 0.16,
//   servants 0.14.
// Options: build(THREE, kit, colors, { height, lamps = true }).
//   height  scales the whole set uniformly so the display stands `height` tall (default 1.8; the walls are 2.0, so the
//           lab's meta.height check warns at any other height).
//   lamps   the bonbori paper glows (threshold -1, one flat practical tone all round); false: unlit tan paper.
// Colours (noon: its vermilion is the true mōsen scarlet and the room reads as daylight; festival's red is pink and
//   its tatami and plaster would share one peach), base / shade:
//   felt and hakama accent #c4452d / iris #5c3d32 (threshold 0.1); nose bands, hair, hats, heri, frames, dais dark
//   hair #241c16 flat; plaster moon #fff6e4 / sky #f2d7ae; wood and lacquer iris / hair; tatami
//   sky / skin #f0c2ae; byōbu sky / iris at 0.3, so the zigzag alternates gold and brown and both dolls sit before a
//   lit panel (five panels: the symmetric ones share a tone); gold fittings, musicians, fruit sky / skin; white (faces,
//   robes, mochi) practical #fffaf2 / sky; pink (empress, blossoms, mochi) skin / accent; leaves iris / hair;
//   lamp paper practical flat when lit, sky / skin when not.
//   noon has no green: the hishi-mochi's yomogi layer and the tachibana leaves are the dark wood brown.
// Meshes: 11, one per material. 7.9k triangles.

export const meta = {
  name: "hinadan",
  height: 2.0,
  script: "noon",
  colors: {
    felt: "#c4452d", feltShade: "#5c3d32",
    plaster: "#fff6e4", plasterShade: "#f2d7ae",
    wood: "#5c3d32", woodShade: "#241c16",
    tatami: "#f2d7ae", tatamiShade: "#f0c2ae",
    dark: "#241c16",
    gold: "#f2d7ae", goldShade: "#f0c2ae",
    screen: "#f2d7ae", screenShade: "#5c3d32",
    white: "#fffaf2", whiteShade: "#f2d7ae",
    pink: "#f0c2ae", pinkShade: "#c4452d",
    leaf: "#5c3d32", leafShade: "#241c16",
    lamp: "#fffaf2", lampOff: "#f2d7ae", lampOffShade: "#f0c2ae",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const { height = 1.8, lamps = true } = opts;
  const root = new THREE.Group();
  root.name = "hinadan";
  const set = new THREE.Group(); // the uniform size scale lives here
  set.name = "set";
  set.scale.setScalar(height / 1.8);
  root.add(set);
  const joints = {};

  // ---------- triangle soups: positions + normals per material ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
  const soups = {};
  const S = (k) => (soups[k] ??= { p: [], n: [] });
  // one triangle, flipped so its face normal agrees with `out`; vertex normals optional (smooth parts)
  function tri(k, a, b, e, out, na, nb, ne) {
    const f = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...f) < 1e-11) return;
    const flip = dot(f, out) < 0, s = S(k);
    const vs = flip ? [a, e, b] : [a, b, e];
    const ns = na ? (flip ? [na, ne, nb] : [na, nb, ne]) : null;
    const fn = nrm(flip ? f.map((v) => -v) : f);
    for (let i = 0; i < 3; i++) (s.p.push(...vs[i]), s.n.push(...(ns ? ns[i] : fn)));
  }
  const cen = (...q) => [0, 1, 2].map((i) => q.reduce((s, v) => s + v[i], 0) / q.length);
  // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
  function hex(k, p) {
    const ref = cen(...p);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]) {
      const [a, b, e, d] = f.map((i) => p[i]), m = cen(a, b, e, d);
      tri(k, a, b, e, sub(m, ref)), tri(k, a, e, d, sub(m, ref));
    }
  }
  function box(k, x0, x1, y0, y1, z0, z1) {
    hex(k, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  const boxc = (k, x, y, z, sx, sy, sz) => box(k, x - sx / 2, x + sx / 2, y, y + sy, z - sz / 2, z + sz / 2);
  // a thin wall between two plan points (x0,z0)-(x1,z1), t thick
  function slab(k, x0, z0, x1, z1, y0, y1, t) {
    const [dx, dz] = nrm([x1 - x0, z1 - z0]), ox = -dz * t / 2, oz = dx * t / 2;
    const q = [[x0 - ox, z0 - oz], [x1 - ox, z1 - oz], [x1 + ox, z1 + oz], [x0 + ox, z0 + oz]];
    hex(k, [...q.map(([x, z]) => [x, y0, z]), ...q.map(([x, z]) => [x, y1, z])]);
  }
  // Surface of revolution. prof [[r, y], ...] bottom to top (y relative to at[1]); open ends are capped.
  // axis "y" (default), "x" or "z"; sx, sz stretch the ring (local x, z); n segments; smooth normals unless flat.
  function lathe(k, prof, at, { n = 8, sx = 1, sz = 1, axis = "y", flat = false, a0 = 0 } = {}) {
    const R = axis === "y" ? (v) => v : axis === "z" ? (v) => [v[0], -v[2], v[1]] : (v) => [v[1], -v[0], v[2]];
    const W = (v) => add(at, R(v));
    const pn = prof.map((p, i) => {
      if (p.length > 2) return [p[2], p[3]];
      const a = prof[Math.max(0, i - 1)], b = prof[Math.min(prof.length - 1, i + 1)];
      return nrm([b[1] - a[1], -(b[0] - a[0])]);
    });
    const ang = (j) => a0 + (j / n) * Math.PI * 2;
    const P = (i, j) => W([prof[i][0] * Math.cos(ang(j)) * sx, prof[i][1], prof[i][0] * Math.sin(ang(j)) * sz]);
    const N = (i, j) => nrm(R([pn[i][0] * Math.cos(ang(j)) / sx, pn[i][1], pn[i][0] * Math.sin(ang(j)) / sz]));
    for (let i = 0; i + 1 < prof.length; i++)
      for (let j = 0; j < n; j++) {
        const v = [P(i, j), P(i, j + 1), P(i + 1, j + 1), P(i + 1, j)], m = [N(i, j), N(i, j + 1), N(i + 1, j + 1), N(i + 1, j)];
        const out = nrm(add(add(m[0], m[1]), add(m[2], m[3])));
        if (flat) (tri(k, v[0], v[1], v[2], out), tri(k, v[0], v[2], v[3], out));
        else (tri(k, v[0], v[1], v[2], out, m[0], m[1], m[2]), tri(k, v[0], v[2], v[3], out, m[0], m[2], m[3]));
      }
    for (const [i, s] of [[0, -1], [prof.length - 1, 1]]) {
      if (prof[i][0] < 1e-6) continue;
      const o = W([0, prof[i][1], 0]), up = R([0, s, 0]);
      for (let j = 0; j < n; j++) tri(k, o, P(i, j), P(i, j + 1), up);
    }
  }
  const cyl = (k, r, h, at, o = {}) => lathe(k, [[r, 0], [r, h]], at, { flat: true, ...o });
  function ball(k, r, at, { n = 8, m = 5, sx = 1, sy = 1, sz = 1 } = {}) {
    const prof = [];
    for (let i = 0; i <= m; i++) {
      const f = -Math.PI / 2 + (i / m) * Math.PI;
      prof.push([r * Math.cos(f), r * Math.sin(f) * sy, Math.cos(f) / 1, Math.sin(f) / sy]);
    }
    lathe(k, prof, at, { n, sx, sz });
  }
  // a polygon rod from a to b, radius r, closed ends
  function rod(k, a, b, r, n = 5) {
    const d = nrm(sub(b, a)), up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const e1 = nrm(cross(d, up)), e2 = cross(e1, d);
    const ring = (o) => Array.from({ length: n }, (_, j) => {
      const t = (j / n) * Math.PI * 2;
      return [0, 1, 2].map((i) => o[i] + r * (Math.cos(t) * e1[i] + Math.sin(t) * e2[i]));
    });
    const A = ring(a), B = ring(b), m = cen(a, b);
    for (let j = 0; j < n; j++) {
      const j1 = (j + 1) % n;
      tri(k, A[j], A[j1], B[j1], sub(cen(A[j], B[j1]), m)), tri(k, A[j], B[j1], B[j], sub(cen(A[j], B[j1]), m));
      tri(k, a, A[j], A[j1], sub(a, b)), tri(k, b, B[j], B[j1], sub(b, a));
    }
  }

  // ---------- the room: yojōhan floor, two plaster walls ----------
  const F = 0.05, E = 1.365, WALL = 2.0, T = 0.1;
  const mats = [[-E, 0.455, -E, -0.455, "x"], [0.455, E, -E, 0.455, "z"], [-0.455, E, 0.455, E, "x"], [-E, -0.455, -0.455, E, "z"], [-0.455, 0.455, -0.455, 0.455, "x"]];
  for (const [x0, x1, z0, z1, along] of mats) {
    box("tatami", x0, x1, 0, F, z0, z1);
    const h = 0.03; // heri on the two long edges, 2 mm proud
    if (along === "x") (box("dark", x0, x1, F - 0.004, F + 0.002, z0, z0 + h), box("dark", x0, x1, F - 0.004, F + 0.002, z1 - h, z1));
    else (box("dark", x0, x0 + h, F - 0.004, F + 0.002, z0, z1), box("dark", x1 - h, x1, F - 0.004, F + 0.002, z0, z1));
  }
  box("plaster", -E - T, E, 0, WALL, -E - T, -E); // back wall (-Z)
  box("plaster", -E - T, -E, 0, WALL, -E, E); // side wall (-X)
  const P = 0.11; // posts: the corner and both cut ends
  box("wood", -E, -E + P, 0, WALL, -E, -E + P);
  box("wood", E - P, E + 0.01, 0, WALL, -E - T - 0.01, -E + 0.02);
  box("wood", -E - T - 0.01, -E + 0.02, 0, WALL, E - P, E + 0.01);
  for (const [y0, y1] of [[F, F + 0.07], [1.86, 1.93]]) {
    box("wood", -E + P, E - P, y0, y1, -E, -E + 0.018);
    box("wood", -E, -E + 0.018, y0, y1, -E + P, E - P);
  }

  // ---------- the stand: seven felt columns ----------
  const XS = 0.3, SW = 1.5, ZB = -E + 0.02, R = 0.2, DT = 0.38, D = 0.2;
  const top = (i) => F + (i + 1) * R; // tread height of tier i (0 = bottom)
  const zf = (i) => ZB + DT + (6 - i) * D; // front edge of tier i
  const zc = (i) => (i === 6 ? ZB + DT / 2 : zf(i) - D / 2); // middle of tier i's tread
  { // one closed staircase solid: the profile (z, y) counter-clockwise, swept along X; sides as one quad per column
    const x0 = XS - SW / 2, x1 = XS + SW / 2, pr = [[ZB, 0], [zf(0), 0]];
    for (let i = 0; i < 7; i++) pr.push([zf(i), top(i)], [i === 6 ? ZB : zf(i + 1), top(i)]);
    for (let i = 0; i < pr.length; i++) {
      const [a, b] = [pr[i], pr[(i + 1) % pr.length]];
      const o = [0, -(b[0] - a[0]), b[1] - a[1]]; // (x, y, z) outward = (0, -dz, dy)
      const A0 = [x0, a[1], a[0]], A1 = [x1, a[1], a[0]], B0 = [x0, b[1], b[0]], B1 = [x1, b[1], b[0]];
      tri("felt", A0, A1, B1, o), tri("felt", A0, B1, B0, o);
    }
    for (let i = 0; i < 7; i++)
      for (const [x, s] of [[x0, -1], [x1, 1]]) {
        const za = i === 6 ? ZB : zf(i + 1), zb = zf(i);
        tri("felt", [x, 0, za], [x, 0, zb], [x, top(i), zb], [s, 0, 0]), tri("felt", [x, 0, za], [x, top(i), zb], [x, top(i), za], [s, 0, 0]);
      }
    // a dark band under every nose, 3 mm proud: the step lines from above, where no silhouette draws them
    for (let i = 0; i < 6; i++) box("dark", x0 - 0.003, x1 + 0.003, top(i) - 0.011, top(i) + 0.002, zf(i) - 0.004, zf(i) + 0.003);
  }

  // ---------- dolls ----------
  // h: nominal height; robe: key or [hakama key, top key]; hat: "eboshi" | "crown" | "long" | null
  function doll(x, y, z, h, robe, hat = "eboshi", wide = 1) {
    const rb = 0.33 * h * wide, rt = 0.1 * h, hr = 0.6 * h, rh = 0.13 * h, sx = 1.15, sz = 0.85;
    if (Array.isArray(robe)) {
      const s = 0.42, rs = rb + (rt - rb) * s;
      lathe(robe[0], [[rb, 0], [rs, hr * s]], [x, y, z], { n: 10, sx, sz });
      lathe(robe[1], [[rs * 1.04, hr * s - 0.002], [rt, hr]], [x, y, z], { n: 10, sx, sz });
    } else lathe(robe, [[rb, 0], [rb * 0.97, 0.06 * h], [rt, hr]], [x, y, z], { n: 10, sx, sz });
    const sk = Array.isArray(robe) ? robe[1] : robe;
    ball(sk, 0.3 * h * wide, [x, y + 0.36 * h, z + 0.1 * h], { n: 8, m: 4, sy: 0.32, sz: 0.42 }); // sleeves held in front
    const hy = y + hr + 0.8 * rh;
    ball("white", rh, [x, hy, z + 0.01 * h], { n: 8, m: 5 });
    ball("dark", rh * 1.08, [x, hy + 0.12 * rh, z - 0.22 * rh], { n: 8, m: 5, sz: 0.95 });
    if (hat === "eboshi") {
      cyl("dark", rh * 0.62, rh * 0.9, [x, hy + rh * 0.75, z - 0.1 * rh], { n: 8 });
      boxc("dark", x, hy + rh * 1.2, z - 0.55 * rh, rh * 0.35, rh * 1.5, rh * 0.18);
    } else if (hat === "crown") {
      boxc("gold", x, hy + rh * 0.95, z, rh * 1.2, rh * 0.35, rh * 0.25);
      ball("dark", rh * 0.9, [x, y + hr * 0.75, z - rh * 0.75], { n: 6, m: 4, sx: 0.8, sy: 2.0, sz: 0.45 });
    } else if (hat === "long") ball("dark", rh * 0.85, [x, y + hr * 0.78, z - rh * 0.7], { n: 6, m: 4, sx: 0.8, sy: 2.0, sz: 0.45 });
  }

  // top tier: byōbu, dais, the pair, bonbori
  {
    const y = top(6), n = 5, w = 1.0, zz = [ZB + 0.06, ZB + 0.12];
    const pts = Array.from({ length: n + 1 }, (_, j) => [XS - w / 2 + (j * w) / n, zz[j % 2]]);
    for (let j = 0; j < n; j++) {
      const [[x0, z0], [x1, z1]] = [pts[j], pts[j + 1]];
      slab("screen", x0, z0, x1, z1, y + 0.02, 1.775, 0.012);
      slab("dark", x0, z0, x1, z1, y, y + 0.025, 0.02);
      slab("dark", x0, z0, x1, z1, 1.775, 1.8, 0.02);
    }
    for (const [x, z] of pts) cyl("dark", 0.009, 1.8 - y, [x, y, z], { n: 5 });
    box("dark", XS - 0.42, XS + 0.42, y, y + 0.03, zc(6) - 0.08, zc(6) + 0.14);
    box("tatami", XS - 0.4, XS + 0.4, y + 0.03, y + 0.04, zc(6) - 0.06, zc(6) + 0.12);
    doll(XS - 0.2, y + 0.04, zc(6) + 0.03, 0.24, "wood", "eboshi", 1.15);
    doll(XS + 0.2, y + 0.04, zc(6) + 0.03, 0.22, "pink", "crown", 1.25);
    for (const s of [-1, 1]) {
      const x = XS + s * 0.58, z = zc(6) + 0.08;
      lathe("wood", [[0.028, 0], [0.02, 0.012], [0.006, 0.02]], [x, y, z], { n: 8, flat: true });
      cyl("wood", 0.005, 0.12, [x, y + 0.012, z], { n: 5 });
      cyl("lamp", 0.036, 0.075, [x, y + 0.1, z], { n: 6 });
      lathe("dark", [[0.04, 0], [0.012, 0.02]], [x, y + 0.173, z], { n: 6, flat: true });
    }
  }
  // tier 6: three court ladies, two pedestal stands
  {
    const y = top(5), z = zc(5);
    for (const dx of [-0.32, 0, 0.32]) doll(XS + dx, y, z, dx === 0 ? 0.16 : 0.17, ["felt", "white"], "long");
    for (const dx of [-0.16, 0.16]) {
      lathe("wood", [[0.025, 0], [0.008, 0.01], [0.008, 0.04], [0.03, 0.05]], [XS + dx, y, z + 0.03], { n: 8, flat: true });
      ball("white", 0.02, [XS + dx, y + 0.06, z + 0.03], { n: 6, m: 4, sy: 0.7 });
    }
  }
  // tier 5: five musicians, three drums
  {
    const y = top(4), z = zc(4);
    for (let j = 0; j < 5; j++) {
      const x = XS - 0.56 + j * 0.28;
      doll(x, y, z - 0.01, 0.15, "gold", "eboshi");
      if (j < 3) lathe(j === 0 ? "felt" : "wood", [[0.02, 0], [0.014, 0.015], [0.02, 0.03]], [x, y + 0.02, z + 0.07], { n: 8, axis: "z", flat: true });
    }
  }
  // tier 4: two ministers, diamond stands with mochi, trays
  {
    const y = top(3), z = zc(3);
    doll(XS - 0.36, y, z, 0.16, "wood", "eboshi");
    doll(XS + 0.36, y, z, 0.16, "felt", "eboshi");
    for (const dx of [-0.13, 0.13]) {
      lathe("wood", [[0.06, 0], [0.06, 0.03]], [XS + dx, y, z], { n: 4, sz: 0.6, flat: true });
      lathe("pink", [[0.05, 0], [0.05, 0.012]], [XS + dx, y + 0.03, z], { n: 4, sz: 0.6, flat: true });
      lathe("white", [[0.05, 0], [0.05, 0.012]], [XS + dx, y + 0.042, z], { n: 4, sz: 0.6, flat: true });
    }
    for (const dx of [-0.6, 0.6]) (boxc("wood", XS + dx, y, z, 0.1, 0.05, 0.1), boxc("felt", XS + dx, y + 0.05, z, 0.06, 0.02, 0.06));
  }
  // tier 3: three servants between the tachibana and the peach tree
  {
    const y = top(2), z = zc(2);
    for (const dx of [-0.22, 0, 0.22]) doll(XS + dx, y, z, 0.14, "white", "eboshi");
    for (const s of [-1, 1]) {
      const x = XS + s * 0.6;
      boxc("wood", x, y, z, 0.13, 0.05, 0.11);
      box("gold", x - 0.066, x + 0.066, y + 0.012, y + 0.024, z - 0.056, z + 0.056);
      cyl("wood", 0.012, 0.13, [x, y + 0.05, z], { n: 5 });
      if (s < 0) {
        for (const [dx, dy, dz, r] of [[0, 0.24, 0, 0.075], [-0.05, 0.19, 0.01, 0.06], [0.05, 0.19, -0.01, 0.06], [0, 0.29, 0, 0.05]])
          ball("leaf", r, [x + dx, y + dy, z + dz], { n: 7, m: 5 });
        for (const [dx, dy, dz] of [[0.035, 0.27, 0.05], [-0.06, 0.2, 0.05], [0.07, 0.17, 0.04], [-0.02, 0.22, 0.07], [0.02, 0.32, 0.03], [0.09, 0.21, -0.02]])
          ball("gold", 0.014, [x + dx, y + dy, z + dz], { n: 6, m: 4 });
      } else {
        const tips = [[-0.08, 0.27, 0.02], [0.08, 0.25, 0], [0, 0.32, 0.01], [-0.03, 0.2, 0.06], [0.06, 0.18, -0.04]];
        for (const [dx, dy, dz] of tips) {
          rod("wood", [x, y + 0.16, z], [x + dx, y + dy, z + dz], 0.006);
          ball("pink", 0.04, [x + dx, y + dy, z + dz], { n: 7, m: 4 });
        }
        for (const [dx, dy, dz] of [[-0.04, 0.23, 0.04], [0.04, 0.22, 0.04], [0.02, 0.28, -0.03]]) ball("white", 0.022, [x + dx, y + dy, z + dz], { n: 6, m: 4 });
      }
    }
  }
  // tier 2: lacquer furniture
  {
    const y = top(1), z = zc(1);
    let x = XS - 0.56; // tansu: chest with drawer lines
    boxc("wood", x, y, z, 0.13, 0.17, 0.1);
    for (const h of [0.05, 0.1, 0.145]) box("gold", x - 0.055, x + 0.055, y + h, y + h + 0.007, z + 0.05, z + 0.053);
    x = XS - 0.3; // nagamochi: long chest, lid, carrying pole
    boxc("wood", x, y, z, 0.2, 0.08, 0.1);
    boxc("wood", x, y + 0.08, z, 0.21, 0.02, 0.11);
    box("gold", x - 0.1, x + 0.1, y + 0.035, y + 0.045, z + 0.05, z + 0.054);
    rod("dark", [x - 0.15, y + 0.11, z], [x + 0.15, y + 0.11, z], 0.007);
    x = XS - 0.05; // kyodai: mirror stand
    boxc("wood", x, y, z, 0.1, 0.05, 0.07);
    cyl("wood", 0.006, 0.08, [x, y + 0.05, z - 0.01], { n: 5 });
    cyl("gold", 0.04, 0.008, [x, y + 0.13, z - 0.012], { n: 10, axis: "z" });
    x = XS + 0.2; // hibachi with white ash
    lathe("wood", [[0.045, 0], [0.05, 0.03], [0.045, 0.06]], [x, y, z], { n: 8, flat: true });
    cyl("white", 0.038, 0.004, [x, y + 0.06, z], { n: 8 });
    x = XS + 0.48; // tea shelf: two boards on posts, a pot
    for (const h of [0, 0.07, 0.14]) boxc("wood", x, y + h, z, 0.16, 0.012, 0.09);
    for (const dx of [-0.07, 0.07]) boxc("wood", x + dx, y, z, 0.012, 0.15, 0.08);
    ball("gold", 0.022, [x - 0.02, y + 0.1, z], { n: 6, m: 4 });
  }
  // bottom tier: palanquin, jubako, ox cart
  {
    const y = top(0), z = zc(0);
    let x = XS - 0.42; // kago: box, roof, pole along it
    boxc("wood", x, y, z, 0.16, 0.12, 0.1);
    box("gold", x - 0.05, x + 0.05, y + 0.04, y + 0.09, z + 0.05, z + 0.053);
    hex("dark", [[x - 0.1, y + 0.12, z - 0.065], [x + 0.1, y + 0.12, z - 0.065], [x + 0.1, y + 0.12, z + 0.065], [x - 0.1, y + 0.12, z + 0.065],
      [x - 0.08, y + 0.15, z - 0.01], [x + 0.08, y + 0.15, z - 0.01], [x + 0.08, y + 0.15, z + 0.01], [x - 0.08, y + 0.15, z + 0.01]]);
    rod("wood", [x - 0.24, y + 0.16, z], [x + 0.24, y + 0.16, z], 0.009, 6);
    x = XS - 0.08; // jubako: three stacked boxes, lid
    for (const h of [0, 0.04, 0.08]) (boxc("wood", x, y + h, z, 0.09, 0.038, 0.09), box("gold", x - 0.045, x + 0.045, y + h + 0.015, y + h + 0.022, z + 0.045, z + 0.048));
    boxc("felt", x, y + 0.12, z, 0.095, 0.012, 0.095);
    x = XS + 0.36; // gissha: cabin on two wheels, shafts to -X
    boxc("wood", x, y + 0.05, z, 0.2, 0.12, 0.09);
    box("gold", x - 0.07, x + 0.07, y + 0.08, y + 0.14, z + 0.045, z + 0.048);
    hex("dark", [[x - 0.12, y + 0.17, z - 0.06], [x + 0.12, y + 0.17, z - 0.06], [x + 0.12, y + 0.17, z + 0.06], [x - 0.12, y + 0.17, z + 0.06],
      [x - 0.1, y + 0.2, z - 0.04], [x + 0.1, y + 0.2, z - 0.04], [x + 0.1, y + 0.2, z + 0.04], [x - 0.1, y + 0.2, z + 0.04]]);
    for (const s of [-1, 1]) {
      const wz = z + s * 0.055;
      cyl("dark", 0.075, 0.014, [x + 0.02, y + 0.075, wz - 0.007], { n: 12, axis: "z" });
      cyl("gold", 0.058, 0.016, [x + 0.02, y + 0.075, wz - 0.008], { n: 12, axis: "z" });
      cyl("dark", 0.018, 0.03, [x + 0.02, y + 0.075, wz - 0.015], { n: 8, axis: "z" });
      rod("wood", [x - 0.08, y + 0.06, wz * 0 + z + s * 0.035], [x - 0.27, y + 0.01, z + s * 0.035], 0.006);
    }
  }

  // ---------- the table: hishi-mochi and hina-arare ----------
  {
    const x = -0.82, z = 0.72, ty = F + 0.28;
    box("wood", x - 0.3, x + 0.3, ty - 0.025, ty, z - 0.2, z + 0.2);
    for (const [dx, dz] of [[-0.27, -0.17], [0.27, -0.17], [0.27, 0.17], [-0.27, 0.17]]) boxc("wood", x + dx, F, z + dz, 0.035, ty - 0.025 - F, 0.035);
    const mx = x - 0.1, mz = z;
    lathe("dark", [[0.12, 0], [0.12, 0.04]], [mx, ty, mz], { n: 4, sz: 0.6, flat: true });
    const layer = (k, y0) => lathe(k, [[0.105, 0], [0.105, 0.024]], [mx, y0, mz], { n: 4, sz: 0.6, flat: true });
    layer("leaf", ty + 0.04), layer("white", ty + 0.064), layer("pink", ty + 0.088);
    const bx = x + 0.15, bz = z + 0.02;
    lathe("wood", [[0.03, 0], [0.04, 0.008], [0.075, 0.05], [0.07, 0.055]], [bx, ty, bz], { n: 10, flat: true });
    lathe("white", [[0.068, 0], [0.04, 0.025], [0, 0.032]], [bx, ty + 0.05, bz], { n: 10 });
    const keys = ["pink", "gold", "white", "pink", "gold", "pink", "white", "gold"];
    for (let j = 0; j < 8; j++) {
      const a = (j / 8) * Math.PI * 2, rr = j % 2 ? 0.045 : 0.025;
      ball(keys[j], 0.014, [bx + rr * Math.cos(a), ty + 0.07 + (0.045 - rr) * 0.4, bz + rr * Math.sin(a)], { n: 6, m: 3 });
    }
    joints.table = new THREE.Object3D();
    joints.table.position.set(x, ty, z);
  }

  // ---------- meshes, one per material ----------
  const MAT = { // key: [base, shade, threshold, ink px]
    felt: [c.felt, c.feltShade, 0.1, 2.5],
    plaster: [c.plaster, c.plasterShade, 0.1, 3],
    wood: [c.wood, c.woodShade, 0.35, 2],
    tatami: [c.tatami, c.tatamiShade, 0.1, 2.5],
    dark: [c.dark, c.dark, 0.35, 1.5],
    gold: [c.gold, c.goldShade, 0.3, 1.5],
    screen: [c.screen, c.screenShade, 0.3, 1.5],
    white: [c.white, c.whiteShade, 0.2, 1.5],
    pink: [c.pink, c.pinkShade, 0.2, 1.5],
    leaf: [c.leaf, c.leafShade, 0.35, 1.5],
    lamp: lamps ? [c.lamp, c.lamp, -1, 1.5] : [c.lampOff, c.lampOffShade, 0.35, 1.5],
  };
  for (const [k, s] of Object.entries(soups)) {
    const [base, shade, threshold, px] = MAT[k];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    const mesh = kit.toon(g, base, shade, { threshold, px });
    mesh.name = k;
    set.add(mesh);
  }
  joints.topTier = new THREE.Object3D();
  joints.topTier.position.set(XS, top(6), zc(6));
  for (const j of Object.values(joints)) set.add(j);

  function pose() { root.updateMatrixWorld(true); }
  pose("rest");
  return { root, joints, pose };
}
