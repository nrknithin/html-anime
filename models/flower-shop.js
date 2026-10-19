// flower-shop.js - a small neighbourhood flower shop (hana-ya): an open single-storey shopfront under a striped
// awning, with buckets of cut flowers on tiered wooden stands spilling out onto the pavement. Optional breeze loop.
// Contract: harness/lab/README.md. Meters, +Y up, the street side faces +Z, its left is +X, stands on y = 0,
// centred on x = 0, z = 0.
//
// Construction (boxes, frustums and low spheres as triangle soups merged per material, so the whole shop is 13
// meshes; every triangle is wound away from a point inside its own solid, never by hand):
//   FACADE   a plaster front wall with three bays: a glass door on -X (dark frame, kick rail, pull bar, glints), a wide
//            open bay in the middle, and a display window on +X over a low plaster sill wall. A dark lintel, a blank
//            white signboard in a dark frame over the awning, a dark cornice on top.
//   AWNING   green / white stripes sloping out from the lintel on two dark arms, with a flat valance.
//   INSIDE   side and back walls, a dark ceiling, a concrete doma floor. A tall glass cooler case against the back
//            wall (white body, lime header band, three dark door frames with glints, shelves of small buckets of
//            flowers), and a wooden wrapping counter just inside the open bay with a roll of white paper on brackets,
//            a red ribbon spool on a peg and a paper-wrapped bouquet lying on the top.
//   STREET   a paved apron with seams. A three-tier wooden stand in front of the window and a two-tier one on the -X
//            side of the open bay, dark buckets on every tier (and extra ones on the ground), each with a bunch of
//            blossom heads on green stems over a collar of leaves; a terracotta pot with a round shrub by the door, two
//            small pots, and a yellow watering can on the paving.
//   BUNCHES  every bunch (stems, leaves, heads) is tagged with an owner; the breeze clip rotates each owner's
//            vertices about its bucket rim, so the moving parts live in the same per-material meshes.
// Proportions (real size, base unit the bay height B = 2.2 m): front 4.2 m wide, 3.4 m to the cornice, shop 1.9 m
//   deep inside; open bay 1.9 m wide; awning 2.45 -> 2.12 m, 0.95 m out; sign 2.62-3.16 m; cooler 2.0 m; counter
//   0.9 m; stand tiers 0.26 / 0.52 / 0.78 m; buckets 0.26-0.32 m with bunches reaching ~0.75 m above the rim.
// Budget: 12.6k triangles at the default 12 buckets (4.4k bare, 13.9k at 14), 13 meshes (one per material).
// Options: build(THREE, kit, colors, { height, buckets }). height scales the whole shop uniformly (default
//   meta.height); buckets 0-14 (default 12) fills the stand tiers first (6 on the tall stand, 4 on the low one), then
//   the paving in front.
// Clip: breeze (4 s loop): each bunch (and the potted shrub) nods up to 0.14 rad about its bucket rim, own phase.
// Colours (meadow): dark frame (posts, cornice, sign frame, buckets, ceiling) hair #2c5131 flat; plaster moon #f7f3e1 /
//   sky #d7ecef; green (awning stripes, leaves, stems, shrub) iris #3f8a47 / hair; white (stripes, sign, cooler,
//   paper, white blossoms) sclera #f6f3ee / sky; wood (stands, counter) skin #f0c2ae / practical #f2c94c; red
//   (blossoms, ribbon, terracotta) accent #d9483b / skin; yellow (blossoms, watering can) practical / skin; pink
//   blossoms skin / accent; lime (blossoms, cooler band) line #a9d16e / iris; paving and floor sky / line; glass sky
//   flat, glints sclera flat, seams hair flat (no hull on those three).

export const meta = {
  name: "flower-shop",
  height: 3.4,
  script: "meadow",
  colors: {
    frame: "#2c5131", frameShade: "#2c5131",
    wall: "#f7f3e1", wallShade: "#d7ecef",
    green: "#3f8a47", greenShade: "#2c5131",
    white: "#f6f3ee", whiteShade: "#d7ecef",
    wood: "#f0c2ae", woodShade: "#f2c94c",
    red: "#d9483b", redShade: "#f0c2ae",
    yellow: "#f2c94c", yellowShade: "#f0c2ae",
    pink: "#f0c2ae", pinkShade: "#d9483b",
    lime: "#a9d16e", limeShade: "#3f8a47",
    pave: "#d7ecef", paveShade: "#a9d16e",
    glass: "#d7ecef", glassShade: "#d7ecef",
    glint: "#f6f3ee", glintShade: "#f6f3ee",
    seam: "#2c5131", seamShade: "#2c5131",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height } = opts;
  const nBuckets = Math.max(0, Math.min(14, Math.round(opts.buckets ?? 12)));
  const root = new THREE.Group();
  root.name = "flower-shop";
  const shop = new THREE.Group();
  shop.name = "shop";
  shop.scale.setScalar(height / meta.height);
  root.add(shop);
  const joints = {};

  // ---------- triangle soups (p positions, n normals, o owner bunch per vertex, -1 static) ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  let own = -1;
  const S = (key) => (soups[key] ??= { p: [], n: [], o: [] });
  function tri(key, a, b, e, ref, na, nb, ne) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const flip = dot(n, sub(mul(add(add(a, b), e), 1 / 3), ref)) < 0;
    n = nrm(flip ? mul(n, -1) : n);
    const s = S(key);
    const vs = flip ? [[a, na], [e, ne], [b, nb]] : [[a, na], [b, nb], [e, ne]];
    for (const [q, nq] of vs) s.p.push(...q), s.n.push(...(nq ?? n)), s.o.push(own);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, x0, x1, y0, y1, z0, z1) {
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // a beam from a to b, w wide, h thick along `up`
  function beam(key, a, b, w, h, up = [0, 1, 0]) {
    const d = sub(b, a);
    const s = nrm(cross(d, up)), u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // an upright frustum, radius r0 at y0 to r1 at y0 + h, smooth sides, flat caps
  function cone(key, x, y0, z, r0, r1, h, seg = 10) {
    const ref = [x, y0 + h / 2, z];
    const sl = (r0 - r1) / h;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const n0 = nrm([Math.cos(a0), sl, Math.sin(a0)]), n1 = nrm([Math.cos(a1), sl, Math.sin(a1)]);
      const q = (a, r, y) => [x + r * Math.cos(a), y, z + r * Math.sin(a)];
      tri(key, q(a0, r0, y0), q(a1, r0, y0), q(a1, r1, y0 + h), ref, n0, n1, n1);
      tri(key, q(a0, r0, y0), q(a1, r1, y0 + h), q(a0, r1, y0 + h), ref, n0, n1, n0);
      tri(key, [x, y0 + h, z], q(a0, r1, y0 + h), q(a1, r1, y0 + h), ref);
      tri(key, [x, y0, z], q(a0, r0, y0), q(a1, r0, y0), ref);
    }
  }
  // a cylinder along x from x0 to x1 at (y, z)
  function cylX(key, x0, x1, y, z, r, seg = 10) {
    const ref = [(x0 + x1) / 2, y, z];
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const n0 = [0, Math.cos(a0), Math.sin(a0)], n1 = [0, Math.cos(a1), Math.sin(a1)];
      const q = (n, x) => [x, y + r * n[1], z + r * n[2]];
      tri(key, q(n0, x0), q(n1, x0), q(n1, x1), ref, n0, n1, n1);
      tri(key, q(n0, x0), q(n1, x1), q(n0, x1), ref, n0, n1, n0);
      tri(key, [x0, y, z], q(n0, x0), q(n1, x0), ref);
      tri(key, [x1, y, z], q(n0, x1), q(n1, x1), ref);
    }
  }
  // an ellipsoid at C with radii r (and r * sy vertically)
  function ball(key, C, r, sy = 1, seg = 6, rings = 4) {
    for (let k = 0; k < rings; k++) {
      const t0 = (k / rings) * Math.PI, t1 = ((k + 1) / rings) * Math.PI;
      for (let i = 0; i < seg; i++) {
        const p0 = (i / seg) * Math.PI * 2, p1 = ((i + 1) / seg) * Math.PI * 2;
        const u = (t, p) => [Math.sin(t) * Math.cos(p), Math.cos(t), Math.sin(t) * Math.sin(p)];
        const [a, b, e, d] = [u(t0, p0), u(t0, p1), u(t1, p1), u(t1, p0)];
        const W = (v) => [C[0] + v[0] * r, C[1] + v[1] * r * sy, C[2] + v[2] * r];
        const N = (v) => nrm([v[0], v[1] / sy, v[2]]);
        if (k > 0) tri(key, W(a), W(b), W(e), C, N(a), N(b), N(e));
        if (k < rings - 1) tri(key, W(a), W(e), W(d), C, N(a), N(e), N(d));
      }
    }
  }
  const flatZ = (key, x0, x1, y0, y1, z, sl = 0) => quad(key, [x0, y0, z], [x1, y0, z], [x1 + sl, y1, z], [x0 + sl, y1, z], [x0, y0, z - 1]);
  const hash = (i) => {
    let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  // ---------- shell ----------
  const X0 = -2.1, X1 = 2.1, ZB = -1.6, ZF = 0.3, FT = 0.12, WT = 0.1, BAY = 2.2, TOP = 3.4;
  const ZI = ZF - FT; // inner face of the front wall
  box("pave", X0, X1, 0, 0.04, ZB, ZF); // doma floor
  for (const [a, b] of [[X0, X0 + WT], [X1 - WT, X1]]) box("wall", a, b, 0, 2.9, ZB, ZI);
  box("pave", X0 + WT, X1 - WT, 0, 2.9, ZB, ZB + WT); // back wall, read as the inside
  box("frame", X0, X1, 2.9, 2.96, ZB - 0.02, ZI); // flat roof behind the parapet
  box("frame", X0 + WT, X1 - WT, 2.62, 2.66, ZB + WT, ZI); // ceiling
  // front wall pieces around the bays: door -1.95..-1.0, open -0.85..1.05, window 1.2..1.95
  for (const [a, b] of [[X0, -1.95], [-1.0, -0.85], [1.05, 1.2], [1.95, X1]]) box("wall", a, b, 0, BAY, ZI, ZF);
  box("wall", 1.2, 1.95, 0, 0.72, ZI, ZF); // window sill wall
  box("wall", X0, X1, BAY + 0.1, TOP - 0.12, ZI, ZF); // upper wall
  box("frame", X0 - 0.04, X1 + 0.04, BAY - 0.02, BAY + 0.1, ZI - 0.01, ZF + 0.03); // lintel
  box("frame", X0 - 0.06, X1 + 0.06, TOP - 0.12, TOP, ZI - 0.02, ZF + 0.08); // cornice
  for (const x of [X0 + 0.02, X1 - 0.02]) box("frame", x - 0.05, x + 0.05, 0, BAY, ZF - 0.02, ZF + 0.03); // corner pilasters
  for (const x of [-0.85, 1.05]) box("frame", x - 0.04, x + 0.04, 0.0, BAY, ZF - 0.02, ZF + 0.025); // open-bay jambs
  // sign board (blank)
  box("frame", -1.65, 1.65, 2.62, 3.16, ZF, ZF + 0.05);
  box("white", -1.58, 1.58, 2.67, 3.11, ZF + 0.04, ZF + 0.08);

  // glass door (-X bay)
  const DX0 = -1.95, DX1 = -1.0, DZ = ZF - 0.05;
  box("frame", DX0, DX0 + 0.06, 0, BAY - 0.02, DZ - 0.03, DZ + 0.03);
  box("frame", DX1 - 0.06, DX1, 0, BAY - 0.02, DZ - 0.03, DZ + 0.03);
  box("frame", DX0, DX1, BAY - 0.08, BAY - 0.02, DZ - 0.03, DZ + 0.03);
  box("frame", DX0, DX1, 0.0, 0.2, DZ - 0.03, DZ + 0.03); // kick rail
  box("glass", DX0 + 0.06, DX1 - 0.06, 0.2, BAY - 0.08, DZ - 0.005, DZ + 0.005);
  box("frame", DX1 - 0.17, DX1 - 0.13, 0.75, 1.35, DZ + 0.03, DZ + 0.07); // pull bar
  flatZ("glint", DX0 + 0.16, DX0 + 0.24, 0.5, 1.2, DZ + 0.007, 0.18);
  flatZ("glint", DX0 + 0.32, DX0 + 0.35, 0.6, 1.1, DZ + 0.007, 0.15);
  flatZ("glint", DX0 + 0.2, DX0 + 0.27, 1.4, 1.9, DZ + 0.007, 0.16);

  // display window (+X bay)
  const WX0 = 1.2, WX1 = 1.95, WZ = ZF - 0.04;
  box("frame", WX0, WX1, 0.72, 0.78, WZ - 0.03, WZ + 0.05); // sill
  box("frame", WX0, WX0 + 0.05, 0.72, BAY, WZ - 0.03, WZ + 0.03);
  box("frame", WX1 - 0.05, WX1, 0.72, BAY, WZ - 0.03, WZ + 0.03);
  box("frame", (WX0 + WX1) / 2 - 0.02, (WX0 + WX1) / 2 + 0.02, 0.78, BAY, WZ - 0.02, WZ + 0.02); // mullion
  box("glass", WX0 + 0.05, WX1 - 0.05, 0.78, BAY, WZ - 0.005, WZ + 0.005);
  for (const x of [WX0 + 0.1, WX0 + 0.47]) {
    flatZ("glint", x, x + 0.07, 1.0, 1.6, WZ + 0.007, 0.16);
    flatZ("glint", x + 0.13, x + 0.15, 1.1, 1.5, WZ + 0.007, 0.12);
  }

  // ---------- awning ----------
  const AY0 = 2.45, AZ0 = ZF + 0.02, AY1 = 2.12, AZ1 = ZF + 0.97, NS = 12, AX0 = -2.02, AX1 = 2.02, AT = 0.03;
  for (let i = 0; i < NS; i++) {
    const xa = AX0 + ((AX1 - AX0) * i) / NS, xb = AX0 + ((AX1 - AX0) * (i + 1)) / NS;
    const k = i % 2 ? "white" : "green";
    hex(k, [[xa, AY0, AZ0], [xb, AY0, AZ0], [xb, AY1, AZ1], [xa, AY1, AZ1],
      [xa, AY0 + AT, AZ0], [xb, AY0 + AT, AZ0], [xb, AY1 + AT, AZ1], [xa, AY1 + AT, AZ1]]);
    box(k, xa, xb, AY1 - 0.2, AY1 + AT, AZ1 - 0.025, AZ1); // valance
  }
  box("frame", AX0, AX1, AY0 - 0.02, AY0 + 0.06, ZF, ZF + 0.06); // header rail
  for (const x of [AX0 + 0.06, AX1 - 0.06]) beam("frame", [x, 1.85, ZF + 0.02], [x, AY1 - 0.03, AZ1 - 0.05], 0.035, 0.035, [0, 0, 1]);

  // ---------- paving ----------
  const PX0 = -2.3, PX1 = 2.3, PZ1 = 1.85;
  box("pave", PX0, PX1, 0, 0.03, ZF, PZ1);
  for (let x = PX0 + 0.46; x < PX1 - 0.1; x += 0.46) box("seam", x - 0.006, x + 0.006, 0.03, 0.034, ZF, PZ1);
  for (let z = ZF + 0.52; z < PZ1 - 0.1; z += 0.52) box("seam", PX0, PX1, 0.03, 0.034, z - 0.006, z + 0.006);
  box("frame", PX0, PX1, 0, 0.045, PZ1 - 0.06, PZ1); // kerb edge

  // ---------- bunches of flowers ----------
  const PALETTE = ["red", "yellow", "white", "pink", "lime", "red", "pink", "yellow", "white", "lime", "red", "yellow", "pink", "white"];
  const pivots = []; // per owner: [x, y, z, phase]
  function bunch(x, y, z, reach, key, seed, small = false) {
    own = pivots.length;
    pivots.push([x, y, z, hash(seed * 31) * Math.PI * 2, hash(seed * 37) * Math.PI * 2]);
    // a dome of blossom heads: a ring low, a ring high, one on top, on a sphere of radius R around the dome centre
    const hr = small ? 0.04 : 0.072, R = small ? 0.075 : 0.15;
    const D = [x, y + reach - R, z];
    const heads = [[0, 1, 0]];
    const ring = (n, el, off) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + off + hash(seed * 5 + i) * 0.3;
        heads.push([Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)]);
      }
    };
    ring(small ? 5 : 7, 0.25, hash(seed) * 3), ring(small ? 0 : 4, 0.95, hash(seed * 2) * 3);
    heads.forEach((h, i) => ball(key, add(D, mul(h, R)), hr * (0.9 + hash(seed * 7 + i) * 0.25), 0.8, 6, 4));
    // a few stems from the rim into the dome
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.8;
      beam("green", [x + Math.cos(a) * 0.02, y - 0.02, z + Math.sin(a) * 0.02], [x + Math.cos(a) * R * 0.6, D[1], z + Math.sin(a) * R * 0.6], 0.014, 0.014, [1, 0, 0]);
    }
    // collar of leaves at the rim
    const lr = small ? 0.05 : 0.09;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      ball("green", [x + Math.cos(a) * lr * 1.0, y + lr * 0.5, z + Math.sin(a) * lr * 1.0], lr, 0.7, 6, 3);
    }
    own = -1;
  }
  function bucket(x, y, z, i, small = false) {
    const r0 = small ? 0.06 : 0.1, r1 = small ? 0.075 : 0.13, h = small ? 0.16 : 0.26 + hash(i * 13) * 0.06;
    cone("frame", x, y, z, r0, r1, h, 10);
    cone("lime", x, y + h - 0.025, z, r1 + 0.008, r1 + 0.01, 0.03, 10); // rim band
    bunch(x, y + h, z, (small ? 0.2 : 0.3 + hash(i * 17) * 0.1), PALETTE[i % PALETTE.length], i + 3, small);
  }

  // ---------- wooden stands ----------
  // tall stand in front of the window: 3 tiers, back tier highest
  const TA = { x0: 1.1, x1: 2.05, tiers: [[0.26, 1.0, 1.32], [0.52, 0.68, 1.0], [0.78, 0.38, 0.68]] };
  // low stand on the -X side of the open bay: 2 tiers
  const TB = { x0: -0.85, x1: 0.1, tiers: [[0.24, 0.82, 1.14], [0.48, 0.48, 0.82]] };
  for (const T of [TA, TB]) {
    for (const [top, z0, z1] of T.tiers) {
      box("wood", T.x0, T.x1, top - 0.04, top, z0, z1); // shelf board
      box("wood", T.x0 + 0.02, T.x1 - 0.02, top - 0.12, top - 0.04, z1 - 0.03, z1); // apron
    }
    const zf = T.tiers[0][2], zb = T.tiers[T.tiers.length - 1][1], ht = T.tiers[T.tiers.length - 1][0];
    for (const x of [T.x0 + 0.03, T.x1 - 0.03]) {
      // side frames: a stepped post at each tier front, a back post, a foot rail
      for (const [top, , z1] of T.tiers) box("wood", x - 0.025, x + 0.025, 0, top - 0.04, z1 - 0.06, z1 - 0.01);
      box("wood", x - 0.025, x + 0.025, 0, ht - 0.04, zb + 0.01, zb + 0.06);
      box("wood", x - 0.02, x + 0.02, 0.06, 0.11, zb + 0.01, zf - 0.01);
    }
  }
  const slots = [];
  for (const [top, z0, z1] of TA.tiers) for (const x of [1.33, 1.82]) slots.push([x, top, (z0 + z1) / 2]);
  for (const [top, z0, z1] of TB.tiers) for (const x of [-0.6, -0.15]) slots.push([x, top, (z0 + z1) / 2]);
  for (const [x, z] of [[-0.5, 1.45], [1.3, 1.6], [-0.05, 1.5], [1.78, 1.55]]) slots.push([x, 0.03, z]);
  for (let i = 0; i < nBuckets; i++) bucket(slots[i][0], slots[i][1], slots[i][2], i);

  // ---------- potted plants and watering can ----------
  cone("red", -2.2, 0.03, 0.75, 0.15, 0.21, 0.36, 10); // terracotta pot by the door
  cone("red", -2.2, 0.36, 0.75, 0.225, 0.225, 0.05, 10); // its lip
  own = pivots.length;
  pivots.push([-2.2, 0.41, 0.75, 1.3, 2.1]);
  beam("frame", [-2.2, 0.35, 0.75], [-2.2, 0.75, 0.75], 0.04, 0.04, [1, 0, 0]); // trunk
  ball("green", [-2.2, 0.95, 0.75], 0.32, 0.95, 8, 5);
  ball("green", [-2.05, 1.22, 0.82], 0.2, 0.9, 7, 4);
  ball("green", [-2.33, 1.15, 0.68], 0.18, 0.9, 7, 4);
  ball("red", [-2.03, 1.0, 1.04], 0.035, 1, 6, 3); // a few berries
  ball("red", [-2.42, 0.92, 0.9], 0.035, 1, 6, 3);
  ball("red", [-2.1, 1.36, 0.93], 0.035, 1, 6, 3);
  own = -1;
  for (const [x, z, k] of [[-1.62, 0.66, "pink"], [-1.3, 0.62, "yellow"]]) {
    cone("red", x, 0.03, z, 0.09, 0.12, 0.17, 10);
    cone("red", x, 0.19, z, 0.13, 0.13, 0.03, 10);
    ball("green", [x, 0.26, z], 0.12, 0.6, 7, 4);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.3;
      ball(k, [x + Math.cos(a) * 0.07, 0.31, z + Math.sin(a) * 0.07], 0.035, 0.8, 6, 3);
    }
    ball(k, [x, 0.34, z], 0.035, 0.8, 6, 3);
  }
  // watering can on the paving, spout toward +X
  const WCX = 0.55, WCZ = 1.45;
  cone("yellow", WCX, 0.03, WCZ, 0.11, 0.1, 0.24, 12);
  cone("yellow", WCX, 0.27, WCZ, 0.1, 0.05, 0.04, 12);
  beam("yellow", [WCX + 0.08, 0.08, WCZ], [WCX + 0.3, 0.33, WCZ], 0.035, 0.035, [0, 0, 1]); // spout
  cone("yellow", WCX + 0.31, 0.32, WCZ, 0.03, 0.045, 0.04, 8); // rose
  beam("yellow", [WCX - 0.06, 0.32, WCZ], [WCX - 0.12, 0.32, WCZ], 0.03, 0.03, [0, 0, 1]);
  beam("yellow", [WCX - 0.12, 0.32, WCZ], [WCX - 0.15, 0.18, WCZ], 0.03, 0.03, [0, 0, 1]); // handle
  beam("yellow", [WCX - 0.15, 0.18, WCZ], [WCX - 0.1, 0.12, WCZ], 0.03, 0.03, [0, 0, 1]);

  // ---------- cooler case against the back wall ----------
  const CX0 = -1.6, CX1 = -0.2, CZ0 = ZB + WT, CZ1 = ZB + WT + 0.62, CY = 2.0;
  box("white", CX0, CX1, 0.04, 0.32, CZ0, CZ1); // plinth
  box("white", CX0, CX1, CY - 0.26, CY, CZ0, CZ1); // header
  box("lime", CX0 - 0.005, CX1 + 0.005, CY - 0.2, CY - 0.1, CZ1 - 0.02, CZ1 + 0.005); // header band
  for (const x of [CX0, CX1 - 0.06]) box("white", x, x + 0.06, 0.32, CY - 0.26, CZ0, CZ1);
  box("glass", CX0 + 0.06, CX1 - 0.06, 0.32, CY - 0.26, CZ0, CZ0 + 0.02); // light back panel
  for (const y of [0.85, 1.32]) box("white", CX0 + 0.06, CX1 - 0.06, y - 0.03, y, CZ0, CZ1 - 0.05);
  let ci = 0;
  for (const y of [0.32, 0.85, 1.32]) {
    for (const x of [-1.42, -1.1, -0.78, -0.46]) {
      if (y === 0.32 && x === -0.78) continue;
      const k = PALETTE[(ci * 5 + 2) % PALETTE.length];
      cone("frame", x, y, CZ0 + 0.3, 0.06, 0.075, 0.16, 8);
      ball("green", [x, y + 0.19, CZ0 + 0.3], 0.07, 0.6, 6, 3);
      for (const [dx, dy, dz] of [[0, 0.3, 0], [-0.05, 0.25, 0.04], [0.05, 0.26, 0.03], [0.0, 0.25, -0.05]])
        ball(k, [x + dx, y + dy, CZ0 + 0.3 + dz], 0.04, 0.8, 6, 3);
      ci++;
    }
  }
  for (const x of [CX0 + 0.47, CX0 + 0.93]) box("frame", x - 0.02, x + 0.02, 0.32, CY - 0.26, CZ1 - 0.03, CZ1);
  box("frame", CX0, CX1, 0.32, 0.35, CZ1 - 0.03, CZ1);
  box("frame", CX0, CX1, CY - 0.29, CY - 0.26, CZ1 - 0.03, CZ1);
  for (const x of [CX0 + 0.1, CX0 + 0.56, CX0 + 1.02]) {
    flatZ("glint", x, x + 0.05, 0.55, 1.2, CZ1 + 0.002, 0.14);
    flatZ("glint", x + 0.09, x + 0.11, 0.6, 1.05, CZ1 + 0.002, 0.11);
  }

  // ---------- wrapping counter just inside the open bay ----------
  const KX0 = -0.75, KX1 = 0.35, KZ0 = -0.62, KZ1 = -0.12, KY = 0.9;
  box("wood", KX0 + 0.03, KX1 - 0.03, 0.04, KY - 0.04, KZ0 + 0.03, KZ1 - 0.03); // body
  box("wood", KX0 - 0.03, KX1 + 0.03, KY - 0.04, KY, KZ0, KZ1 + 0.03); // top
  box("frame", KX0 + 0.03, KX1 - 0.03, 0.04, 0.12, KZ1 - 0.04, KZ1 - 0.02); // toe kick
  // paper roll on two brackets at the front edge, a sheet hanging over the front
  for (const x of [KX0 + 0.02, KX0 + 0.62]) box("frame", x - 0.015, x + 0.015, KY, KY + 0.12, KZ1 - 0.08, KZ1 - 0.04);
  cylX("white", KX0 + 0.04, KX0 + 0.6, KY + 0.1, KZ1 - 0.06, 0.055, 10);
  cylX("frame", KX0 - 0.0, KX0 + 0.64, KY + 0.1, KZ1 - 0.06, 0.012, 6);
  box("white", KX0 + 0.05, KX0 + 0.59, KY - 0.2, KY + 0.06, KZ1 + 0.035, KZ1 + 0.045); // sheet down the front
  // ribbon spool on a peg at the +X end
  box("frame", KX1 - 0.13, KX1 - 0.11, KY, KY + 0.16, KZ0 + 0.18, KZ0 + 0.2);
  cone("red", KX1 - 0.12, KY + 0.005, KZ0 + 0.19, 0.06, 0.06, 0.012, 12);
  cone("red", KX1 - 0.12, KY + 0.017, KZ0 + 0.19, 0.045, 0.045, 0.05, 12);
  cone("white", KX1 - 0.12, KY + 0.067, KZ0 + 0.19, 0.06, 0.06, 0.012, 12);
  // a wrapped bouquet lying on the top: a paper cone along x with heads at its mouth
  {
    const by = KY + 0.06, bz = KZ0 + 0.22, bx0 = -0.05, bx1 = 0.22, seg = 8;
    const ref = [(bx0 + bx1) / 2 - 0.03, by, bz];
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const q = (a, r, x) => [x, by + r * Math.cos(a), bz + r * Math.sin(a)];
      tri("white", [bx0 - 0.02, by, bz], q(a0, 0.07, bx1), q(a1, 0.07, bx1), ref);
      tri("white", [bx1, by, bz], q(a0, 0.07, bx1), q(a1, 0.07, bx1), ref);
    }
    for (const [dy, dz, k] of [[0.02, 0.02, "red"], [-0.025, -0.02, "pink"], [0.03, -0.035, "yellow"], [-0.02, 0.035, "red"]])
      ball(k, [bx1 + 0.03, by + dy, bz + dz], 0.035, 0.9, 6, 3);
  }

  // ---------- meshes ----------
  // [base, shade, threshold, hull px (0: no hull)]: blossoms and leaves get a thinner hull so the colour survives
  const MAT = {
    frame: [c.frame, c.frameShade, 0.1, 4],
    wall: [c.wall, c.wallShade, 0.1, 4],
    green: [c.green, c.greenShade, 0.15, 2.5],
    white: [c.white, c.whiteShade, 0.1, 3],
    wood: [c.wood, c.woodShade, 0.1, 3],
    red: [c.red, c.redShade, 0.05, 2.5],
    yellow: [c.yellow, c.yellowShade, 0.05, 2.5],
    pink: [c.pink, c.pinkShade, 0.05, 2.5],
    lime: [c.lime, c.limeShade, 0.1, 2.5],
    pave: [c.pave, c.paveShade, 0.1, 3],
    glass: [c.glass, c.glassShade, 0.1, 0],
    glint: [c.glint, c.glintShade, 0.1, 0],
    seam: [c.seam, c.seamShade, 0.1, 0],
  };

  const movers = []; // { g, idx (vertex indices with an owner), o, p, n, h }
  for (const [key, s] of Object.entries(soups)) {
    if (!s.p.length) continue;
    const [base, shade, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    shop.add(mesh);
    const idx = [];
    s.o.forEach((o, v) => o >= 0 && idx.push(v));
    if (idx.length) {
      const hn = g.attributes.hullNormal;
      movers.push({ g, idx, o: s.o, p: Float32Array.from(s.p), n: Float32Array.from(s.n), h: hn ? Float32Array.from(hn.array) : null });
      mesh.frustumCulled = false;
    }
  }

  // ---------- breeze: each bunch nods about its rim pivot ----------
  // angles (rad): rz tips the bunch toward -X (the wind blows from +X), rx toward +Z; both loop in 4 s
  const CLIPS = { breeze: 4 };
  const AMP = 0.14;
  const Ms = pivots.map(() => new THREE.Matrix4());
  const Ns = pivots.map(() => new THREE.Matrix3());
  const R = new THREE.Matrix4(), T1 = new THREE.Matrix4(), T2 = new THREE.Matrix4(), E = new THREE.Euler();
  const q = new THREE.Vector3();
  function apply(t) {
    pivots.forEach(([x, y, z, ph, ph2], k) => {
      const w = (2 * Math.PI * t) / 4;
      const az = t === null ? 0 : AMP * (0.55 + 0.45 * Math.sin(w + ph));
      const ax = t === null ? 0 : AMP * 0.45 * Math.sin(2 * w + ph2);
      R.makeRotationFromEuler(E.set(ax, 0, az));
      T1.makeTranslation(-x, -y, -z), T2.makeTranslation(x, y, z);
      Ms[k].multiplyMatrices(T2, R).multiply(T1);
      Ns[k].getNormalMatrix(Ms[k]);
    });
    for (const m of movers) {
      const P = m.g.attributes.position.array, N = m.g.attributes.normal.array, H = m.g.attributes.hullNormal?.array;
      for (const v of m.idx) {
        const k = m.o[v], i = v * 3;
        q.fromArray(m.p, i).applyMatrix4(Ms[k]).toArray(P, i);
        q.fromArray(m.n, i).applyMatrix3(Ns[k]).normalize().toArray(N, i);
        if (H && m.h) q.fromArray(m.h, i).applyMatrix3(Ns[k]).normalize().toArray(H, i);
      }
      m.g.attributes.position.needsUpdate = m.g.attributes.normal.needsUpdate = true;
      if (H) m.g.attributes.hullNormal.needsUpdate = true;
      m.g.computeBoundingSphere(), m.g.computeBoundingBox();
    }
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`flower-shop: no clip "${m[1]}" (clips: breeze)`);
      return apply((((+m[2]) % 4) + 4) % 4);
    }
    if (name !== "rest") throw new Error(`flower-shop: unknown pose "${name}" (rest, or breeze@<seconds>)`);
    apply(null);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
