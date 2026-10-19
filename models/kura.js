// kura.js - a traditional Japanese kura (white plaster storehouse) in a countryside yard, with a persimmon tree and
// stacked barrels. Static set; the heavy double door swings by option or clip.
// Contract: harness/lab/README.md. Meters, +Y up, the gable end with the door faces +Z, its left is +X, stands on y = 0,
// the kura centred on x = 0, z = 0 (the tree stands off its -X front corner, the barrels by its +X wall).
//
// Construction (boxes, prisms, frusta and lathes, all triangle soups merged per material; flat-shaded so planes read crisp):
//   BODY     one closed pentagonal prism: the two-storey walls and the plaster under-roof (dozo yane) rising to a ridge,
//            on a stone plinth one step wider. A proud plaster band (hachimaki) rings the wall top, another the
//            namako top. The kura reads by the identity cues, ranked: 1 namako band, 2 floating tiled roof with the dark
//            okiyane gap, 3 stepped heavy door, 4 small shuttered window, 5 crest on the gable.
//   NAMAKO   the lower wall band (0.45-1.65 m) on all four sides: a dark tile panel (inked thin box) with raised white
//            joints on both diagonals, every joint a box strip clipped to the panel rectangle (pitch 0.34 m squares).
//   ROOF     okiyane: two tiled slabs floating 0.35 m above the plaster under-roof, on short wood posts in the side slots;
//            the gap on each gable is a recessed dark chevron under a white plastered barge board. Tile rows run down each
//            slope with dark eave-tile ends, a heavy ridge and a horned onigawara with a roundel at each end.
//   DOOR     a two-step dark surround (kuro plaster), a dark doorway, and two thick stepped plaster leaves (a back block that fits
//            the opening, a wider front block over the inner step) with iron straps, ring pulls and a hasp latch.
//            The leaves and their iron are two meshes whose vertices swing() rewrites about the hinge posts (opts.door,
//            or the swing clip). Upper windows: the same stepped surround, a dark opening with wood bars, two heavy
//            white stepped shutters standing open. Crest: a raised plaster roundel with an iron ring and four diamonds.
//   YARD     a persimmon tree (tapered 6-sided frusta grown recursively from a seeded LCG, squat fruit at the twig tips,
//            no leaves: the late-autumn tree), and three cedar barrels (lathes with iron hoops), two upright, one on top.
// Proportions (real size, base unit the storey S = 1.78 m): walls 4.0 x 5.5, plinth 0-0.45, walls to 4.0 (2.0 S + plinth),
// plaster ridge 4.85, roof slabs 0.24 thick over a 0.35 gap, eaves out 0.6, ridge top 5.71, onigawara horns 6.0.
// Door opening 1.3 x 1.95, surround 2.1 wide; leaves 0.25 thick. Window 0.6 square at 3.0-3.6. Tree 4.3 m, barrels 0.6.
// Options: build(THREE, kit, colors, { height = 6.0, door = 0 }): height scales the whole set uniformly; door 0 closed .. 1
// open (100 deg). Clip swing (6 s): closed, opens, holds, closes.
// Colours (noon, the house's set): plaster moon #fff6e4 / sky #f2d7ae (threshold 0.1, walls square to the camera stay lit);
// namako tiles, roof tiles, ridge, door and window surrounds, posts, bark iris #5c3d32 / hair #241c16; namako joints moon / sky, flat (lines);
// tile rows, iron, gaps, doorway hair flat; stone sky / skin #f0c2ae; barrels sky / skin; persimmons accent #c4452d / iris.

export const meta = {
  name: "kura",
  height: 6.0,
  script: "noon",
  colors: {
    plaster: "#fff6e4", plasterShade: "#f2d7ae",
    tile: "#5c3d32", tileShade: "#241c16",
    joint: "#fff6e4", jointShade: "#f2d7ae",
    line: "#241c16",
    wood: "#5c3d32", woodShade: "#241c16",
    stone: "#f2d7ae", stoneShade: "#f0c2ae",
    barrel: "#f2d7ae", barrelShade: "#f0c2ae",
    fruit: "#c4452d", fruitShade: "#5c3d32",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, door = 0 } = opts;
  const root = new THREE.Group();
  root.name = "kura";
  const set = new THREE.Group(); // uniform size scale lives here, so root stays the plain contract node
  set.name = "set";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  const soups = {}, tags = {};
  let TAG = 0; // door leaf of the triangles being written: -1 left, +1 right
  const S = (key) => (soups[key] ??= []);
  // one triangle wound away from `ref` (a point inside the solid); slivers dropped
  function tri(key, a, b, e, ref) {
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-8) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    S(key).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
    (tags[key] ??= []).push(TAG, TAG, TAG);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  const corners = (x0, x1, y0, y1, z0, z1) =>
    [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
  const box = (key, cx, cy, cz, sx, sy, sz) =>
    hex(key, corners(cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2));
  // a beam from a to b, w wide and h tall, its height along `up`
  function beam(key, a, b, w, h, up = [0, 1, 0]) {
    const d = sub(b, a);
    const s = nrm(cross(d, up)), u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // convex prism: polygon in the XY plane, extruded over [z0, z1]
  function prism(key, poly, z0, z1) {
    const cx = poly.reduce((s, q) => s + q[0], 0) / poly.length, cy = poly.reduce((s, q) => s + q[1], 0) / poly.length;
    const ref = [cx, cy, (z0 + z1) / 2];
    poly.forEach((q, i) => {
      const r = poly[(i + 1) % poly.length];
      quad(key, [q[0], q[1], z0], [r[0], r[1], z0], [r[0], r[1], z1], [q[0], q[1], z1], ref);
      tri(key, [cx, cy, z0], [q[0], q[1], z0], [r[0], r[1], z0], ref);
      tri(key, [cx, cy, z1], [q[0], q[1], z1], [r[0], r[1], z1], ref);
    });
  }
  // tapered n-sided frustum from a (radius ra) to b (radius rb), ends closed
  function limb(key, a, b, ra, rb, n = 6) {
    const d = nrm(sub(b, a));
    const s = nrm(cross(d, Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), t = cross(d, s);
    const ring = (o, r) => Array.from({ length: n }, (_, i) => {
      const q = (i / n) * Math.PI * 2;
      return [0, 1, 2].map((k) => o[k] + (s[k] * Math.cos(q) + t[k] * Math.sin(q)) * r);
    });
    const A = ring(a, ra), B = ring(b, rb), ref = [0, 1, 2].map((k) => (a[k] + b[k]) / 2);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      quad(key, A[i], A[j], B[j], B[i], ref);
      tri(key, a, A[i], A[j], ref);
      tri(key, b, B[i], B[j], ref);
    }
  }
  // lathe along an axis: profile [[t, r], ...] from the base point o along unit axis ax, closed caps
  function lathe(key, o, ax, prof, n = 12) {
    const s = nrm(cross(ax, Math.abs(ax[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), t = cross(ax, s);
    const P = (h, r, i) => {
      const q = (i / n) * Math.PI * 2;
      return [0, 1, 2].map((k) => o[k] + ax[k] * h + (s[k] * Math.cos(q) + t[k] * Math.sin(q)) * r);
    };
    for (let j = 0; j < prof.length - 1; j++) {
      const [h0, r0] = prof[j], [h1, r1] = prof[j + 1];
      const ref = [0, 1, 2].map((k) => o[k] + ax[k] * (h0 + h1) / 2);
      for (let i = 0; i < n; i++) quad(key, P(h0, r0, i), P(h0, r0, i + 1), P(h1, r1, i + 1), P(h1, r1, i), ref);
    }
    const [hA, rA] = prof[0], [hB, rB] = prof[prof.length - 1], mid = (hA + hB) / 2;
    const ref = [0, 1, 2].map((k) => o[k] + ax[k] * mid);
    const ca = [0, 1, 2].map((k) => o[k] + ax[k] * hA), cb = [0, 1, 2].map((k) => o[k] + ax[k] * hB);
    for (let i = 0; i < n; i++) {
      tri(key, ca, P(hA, rA, i), P(hA, rA, i + 1), ref);
      tri(key, cb, P(hB, rB, i), P(hB, rB, i + 1), ref);
    }
  }

  // ---------- wall faces: local (u along the wall, y, o out of the wall) -> world ----------
  const face = (side, at) => ({
    p: (u, y, o) => side === "+z" ? [u, y, at + o] : side === "-z" ? [-u, y, at - o] : side === "+x" ? [at + o, y, -u] : [at - o, y, u],
  });
  // a box in face coordinates, optionally turned by `ang` about the vertical line (hu, ho) in the u-o plane
  function lbox(key, f, u0, u1, y0, y1, o0, o1, rot) {
    const P = corners(u0, u1, y0, y1, o0, o1).map(([u, y, o]) => {
      if (rot) {
        const du = u - rot.hu, dz = o - rot.ho, co = Math.cos(rot.a), si = Math.sin(rot.a);
        u = rot.hu + du * co + dz * si, o = rot.ho - du * si + dz * co;
      }
      return f.p(u, y, o);
    });
    hex(key, P);
  }
  // a flat quad facing out of the wall (lines, panels: only their front ever shows)
  const lquad = (key, f, u0, u1, y0, y1, o) =>
    quad(key, f.p(u0, y0, o), f.p(u1, y0, o), f.p(u1, y1, o), f.p(u0, y1, o), f.p((u0 + u1) / 2, (y0 + y1) / 2, o - 1));
  // stepped plaster surround around an opening [u0,u1] x [y0,y1]: an inner step 0.1 proud, an outer step 0.2 proud
  function surround(f, u0, u1, y0, y1, b1, b2, sill = true) {
    const step = (ua, ub, ya, yb, w, d) => {
      lbox("frame", f, ua - w, ua, ya, yb + w, 0, d);
      lbox("frame", f, ub, ub + w, ya, yb + w, 0, d);
      lbox("frame", f, ua, ub, yb, yb + w, 0, d);
      if (sill) lbox("frame", f, ua, ub, ya - w, ya, 0, d);
    };
    step(u0, u1, sill ? y0 : y0, y1, b1, 0.1);
    step(u0 - b1, u1 + b1, sill ? y0 - b1 : y0, y1 + b1, b2, 0.2);
  }

  // ---------- body ----------
  const W = { x0: -2.0, x1: 2.0, z0: -2.75, z1: 2.75 };
  const PY = 0.45, EY = 4.0, RY = 4.85, PITCH = (RY - EY) / W.x1; // plinth top, wall top, plaster ridge
  box("stone", 0, PY / 2, 0, W.x1 - W.x0 + 0.24, PY, W.z1 - W.z0 + 0.24);
  for (const y of [0.17, 0.31]) // plinth courses
    for (const [f, L] of [[face("+z", W.z1 + 0.12), 2.12], [face("+x", W.x1 + 0.12), 2.87], [face("-x", W.x1 + 0.12), 2.87], [face("-z", W.z1 + 0.12), 2.12]])
      lquad("line", f, -L, L, y - 0.012, y + 0.012, 0.004);
  prism("plaster", [[W.x0, PY], [W.x1, PY], [W.x1, EY], [0, RY], [W.x0, EY]], W.z0, W.z1);
  const walls = [
    [face("+z", W.z1), 2.0], [face("-z", -W.z0), 2.0], [face("+x", W.x1), 2.75], [face("-x", -W.x0), 2.75],
  ];
  // hachimaki band at the wall top, and the band over the namako
  const NY0 = PY, NY1 = 1.65;
  const DW = 0.65, DH = 1.95, B1 = 0.15, B2 = 0.25; // door half opening, opening height, surround steps
  const DO = DW + B1 + B2; // the door surround's outer edge
  walls.forEach(([f, L], i) => {
    lbox("plaster", f, -L - 0.06, L + 0.06, EY - 0.22, EY, 0, 0.06);
    if (i) lbox("plaster", f, -L - 0.06, L + 0.06, NY1, NY1 + 0.12, 0, 0.07);
    else for (const s of [-1, 1]) lbox("plaster", f, ...(s > 0 ? [DO, L + 0.06] : [-L - 0.06, -DO]), NY1, NY1 + 0.12, 0, 0.07);
  });

  // ---------- namako band ----------
  const A = 0.34, D2 = A * Math.SQRT2; // tile side, joint spacing along u / y
  function namako(f, u0, u1) {
    lbox("tile", f, u0, u1, NY0, NY1, 0, 0.03);
    const o = 0.045, up = sub(f.p(0, 0, 1), f.p(0, 0, 0));
    const strip = (ua, ya, ub, yb) => {
      if (Math.hypot(ub - ua, yb - ya) < 0.05) return;
      beam("joint", f.p(ua, ya, o), f.p(ub, yb, o), 0.065, 0.035, up);
    };
    for (let k = -30; k <= 30; k++) {
      const cc = k * D2;
      // y = u + cc
      let a0 = Math.max(u0, NY0 - cc), a1 = Math.min(u1, NY1 - cc);
      if (a1 > a0) strip(a0, a0 + cc, a1, a1 + cc);
      // y = -u + cc
      a0 = Math.max(u0, cc - NY1), a1 = Math.min(u1, cc - NY0);
      if (a1 > a0) strip(a0, cc - a0, a1, cc - a1);
    }
  }
  const front = face("+z", W.z1);
  namako(front, -2.0, -DO);
  namako(front, DO, 2.0);
  namako(face("-z", -W.z0), -2.0, 2.0);
  namako(face("+x", W.x1), -2.75, 2.75);
  namako(face("-x", -W.x0), -2.75, 2.75);

  // ---------- okiyane roof ----------
  const GAP = 0.35, T = 0.24, OV = 0.6, ZR = W.z1 + OV;
  const under = (x) => RY + GAP - PITCH * Math.abs(x); // roof underside
  const XE = W.x1 + OV;
  for (const s of [-1, 1]) {
    const p0 = [0, under(0)], p1 = [s * XE, under(XE)];
    hex("tile", [[p0[0], p0[1], -ZR], [p1[0], p1[1], -ZR], [p1[0], p1[1], ZR], [p0[0], p0[1], ZR],
      [p0[0], p0[1] + T, -ZR], [p1[0], p1[1] + T, -ZR], [p1[0], p1[1] + T, ZR], [p0[0], p0[1] + T, ZR]]);
    // tile rows down the slope and eave-tile ends
    const top = (x) => under(x) + T;
    for (let z = -ZR + 0.22; z < ZR - 0.1; z += 0.3) {
      const a = [s * 0.2, top(0.2) + 0.012, z], b = [s * (XE - 0.02), top(XE - 0.02) + 0.012, z];
      quad("line", [a[0], a[1], z - 0.035], [b[0], b[1], z - 0.035], [b[0], b[1], z + 0.035], [a[0], a[1], z + 0.035], [a[0], a[1] - 1, z]);
      const ex = s * (XE + 0.004), ey = under(XE) + T / 2;
      quad("line", [ex, ey - 0.08, z - 0.08], [ex, ey + 0.08, z - 0.08], [ex, ey + 0.08, z + 0.08], [ex, ey - 0.08, z + 0.08], [0, ey, z]);
    }
    // white plastered barge boards on both gable edges (the white chevron over the dark okiyane gap)
    for (const zs of [-1, 1]) {
      const z = zs * (ZR + 0.03);
      beam("plaster", [0, under(0) + T / 2 + 0.05, z], [s * (XE + 0.05), under(XE + 0.05) + T / 2 + 0.05, z], 0.12, 0.4);
    }
    // posts in the side slot between the wall top and the roof
    for (let z = -2.5; z <= 2.51; z += 0.833) box("wood", s * (W.x1 - 0.08), EY + GAP / 2 + 0.02, z, 0.12, GAP + 0.04, 0.12);
  }
  // the gap on each gable: a recessed dark chevron between the plaster slope and the roof underside
  for (const zs of [-1, 1]) {
    const z = zs * (W.z1 + 0.003), N = 6;
    for (let i = 0; i < N; i++) {
      const x0 = W.x0 + (i / N) * (W.x1 - W.x0), x1 = W.x0 + ((i + 1) / N) * (W.x1 - W.x0);
      const y0 = (x) => RY - PITCH * Math.abs(x) - 0.01, y1 = (x) => under(x) + 0.01;
      quad("line", [x0, y0(x0), z], [x1, y0(x1), z], [x1, y1(x1), z], [x0, y1(x0), z], [(x0 + x1) / 2, RY, z - zs]);
    }
    // two posts in the gap on each gable
    for (const x of [-1.1, 1.1]) box("wood", x, (RY - PITCH * 1.1 + under(1.1)) / 2, zs * (W.z1 - 0.1), 0.12, GAP + 0.06, 0.12);
  }
  // ridge and onigawara
  const RT = under(0) + T;
  box("tile", 0, RT + 0.1, 0, 0.42, 0.34, 2 * ZR + 0.1);
  box("line", 0, RT + 0.2, 0, 0.44, 0.04, 2 * ZR + 0.08);
  for (const zs of [-1, 1]) {
    // onigawara: a flared plate with two horns, and a raised roundel on its face
    const z0 = zs * (ZR - 0.02), z1 = zs * (ZR + 0.16), yb = RT - 0.12, ym = 5.78, yt = 6.0;
    hex("tile", [[-0.3, yb, z0], [0.3, yb, z0], [0.3, yb, z1], [-0.3, yb, z1],
      [-0.48, ym, z0], [0.48, ym, z0], [0.48, ym, z1], [-0.48, ym, z1]]);
    for (const s of [-1, 1])
      hex("tile", [[s * 0.2, ym - 0.02, z0], [s * 0.48, ym - 0.02, z0], [s * 0.48, ym - 0.02, z1], [s * 0.2, ym - 0.02, z1],
        [s * 0.44, yt, z0], [s * 0.6, yt, z0], [s * 0.6, yt, z1], [s * 0.44, yt, z1]]);
    lathe("tile", [0, RT + 0.12, z1], [0, 0, zs], [[0, 0.17], [0.05, 0.14]], 12);
  }

  // ---------- crest on the front gable ----------
  {
    const cy = 4.42, R = 0.3, z = W.z1;
    lathe("plaster", [0, cy, z - 0.01], [0, 0, 1], [[0, R + 0.06], [0.05, R + 0.06]], 16);
    const zf = z + 0.045, n = 20;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const P = (r, a) => [Math.cos(a) * r, cy + Math.sin(a) * r, zf];
      quad("line", P(R - 0.05, a0), P(R, a0), P(R, a1), P(R - 0.05, a1), [0, cy, zf - 1]);
    }
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const cx = dx * 0.1, yy = cy + dy * 0.1, h = 0.085;
      quad("line", [cx, yy - h, zf], [cx + h, yy, zf], [cx, yy + h, zf], [cx - h, yy, zf], [cx, yy, zf - 1]);
    }
  }

  // ---------- door ----------
  surround(front, -DW, DW, PY, PY + DH, B1, B2, false);
  lquad("line", front, -DW, DW, PY, PY + DH, 0.004); // the dark doorway
  box("stone", 0, 0.2, W.z1 + 0.55, 2.0, 0.4, 0.55); // step stone
  const HX = DW + B1, HZ = W.z1 + 0.22; // hinge posts at the front blocks' outer corners
  for (const s of [-1, 1]) {
    TAG = s;
    const xs = (a, b) => (s > 0 ? [a, b] : [-b, -a]);
    // back block fits the opening, front block covers the inner step
    lbox("door", front, ...xs(0, DW), PY + 0.01, PY + DH, 0.0, 0.11);
    lbox("door", front, ...xs(0, HX), PY + 0.01, PY + DH + B1 - 0.01, 0.11, 0.22);
    // a third, raised panel step
    lbox("door", front, ...xs(0.1, HX - 0.12), PY + 0.2, PY + DH - 0.1, 0.22, 0.26);
    // iron straps, ring pull, half of the hasp
    for (const y of [PY + 0.35, PY + DH - 0.3]) lbox("doorIron", front, ...xs(0.12, HX + 0.02), y, y + 0.08, 0.22, 0.24);
    lbox("doorIron", front, ...xs(0.12, 0.3), PY + 1.0, PY + 1.12, 0.26, 0.29);
    lathe("doorIron", [s * 0.4, PY + 1.06, W.z1 + 0.26], [0, 0, 1], [[0, 0.07], [0.03, 0.07]], 8);
    if (s > 0) lbox("doorIron", front, -0.18, 0.3, PY + 1.2, PY + 1.32, 0.26, 0.3); // the latch bar across the seam
    else lbox("doorIron", front, -0.1, 0.0, PY + 1.17, PY + 1.36, 0.26, 0.33); // its staple
  }
  TAG = 0;

  // ---------- upper windows ----------
  function window(f, u, y0, w, h) {
    surround(f, u - w / 2, u + w / 2, y0, y0 + h, 0.1, 0.14);
    lquad("line", f, u - w / 2, u + w / 2, y0, y0 + h, 0.004);
    for (let i = 1; i <= 3; i++) lbox("wood", f, u - w / 2 + (i * w) / 4 - 0.02, u - w / 2 + (i * w) / 4 + 0.02, y0, y0 + h, 0.0, 0.05);
    // heavy stepped shutters, open 105 deg about the outer step's front corners
    for (const s of [-1, 1]) {
      const hu = u + s * (w / 2 + 0.1), rot = { hu, ho: 0.2, a: s * 1.83 };
      const xs = (a, b) => (s > 0 ? [hu - b, hu - a] : [hu + a, hu + b]);
      lbox("plaster", f, ...xs(0, w / 2 + 0.1), y0 - 0.1, y0 + h + 0.1, 0.2, 0.32, rot);
      lbox("plaster", f, ...xs(0.1, w / 2 + 0.1), y0, y0 + h, 0.32, 0.4, rot);
    }
  }
  window(front, 0, 3.0, 0.6, 0.6);
  window(face("+x", W.x1), 0.9, 2.75, 0.6, 0.6);

  // ---------- persimmon tree ----------
  let seed = 20231;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const TX = -3.3, TZ = 3.2, fruitAt = [];
  function grow(p, dir, len, r, depth) {
    const q = [p[0] + dir[0] * len, p[1] + dir[1] * len, p[2] + dir[2] * len];
    limb("wood", p, q, r, r * 0.68);
    if (depth === 0) { if (rnd() > 0.25) fruitAt.push([q[0], q[1] - 0.09, q[2]]); return; }
    if (depth === 1 && rnd() > 0.6) fruitAt.push([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - 0.1, (p[2] + q[2]) / 2]);
    const kids = 2;
    for (let i = 0; i < kids; i++) {
      const az = rnd() * Math.PI * 2, tilt = 0.45 + rnd() * 0.35;
      const nd = nrm([dir[0] + Math.cos(az) * tilt, dir[1] + 0.12, dir[2] + Math.sin(az) * tilt]);
      grow(q, nd, len * (0.62 + rnd() * 0.12), r * 0.62, depth - 1);
    }
  }
  limb("wood", [TX, 0.015, TZ], [TX + 0.12, 1.5, TZ + 0.05], 0.17, 0.13);
  limb("wood", [TX + 0.12, 1.5, TZ + 0.05], [TX + 0.02, 2.1, TZ], 0.13, 0.11);
  for (let i = 0; i < 4; i++) {
    const az = 0.5 + i * 1.62 + rnd() * 0.4, el = 0.7 + rnd() * 0.3;
    const d = nrm([Math.cos(az) * Math.cos(el) * 1.15, Math.sin(el), Math.sin(az) * Math.cos(el)]);
    grow([TX + 0.02, 2.05, TZ], d, 1.05 + rnd() * 0.2, 0.09, 3);
  }
  const fruitGeo = new THREE.SphereGeometry(0.095, 8, 6).toNonIndexed();
  const fp = fruitGeo.attributes.position.array;
  for (const [x, y, z] of fruitAt) {
    for (let i = 0; i < fp.length; i += 9) {
      const v = [0, 3, 6].map((k) => [x + fp[i + k], y + fp[i + k + 1] * 0.82, z + fp[i + k + 2]]);
      tri("fruit", v[0], v[1], v[2], [x, y, z]);
    }
  }
  fruitGeo.dispose();

  // ---------- barrels ----------
  const BR = 0.28, BH = 0.62;
  const barrelProf = [[0, BR * 0.9], [BH * 0.25, BR * 0.99], [BH * 0.5, BR], [BH * 0.75, BR * 0.99], [BH, BR * 0.9]];
  function barrel(o, ax) {
    lathe("barrel", o, ax, barrelProf, 12);
    for (const h of [0.12, 0.88]) lathe("line", [0, 1, 2].map((k) => o[k] + ax[k] * (h * BH - 0.02)), ax, [[0, BR * 0.99], [0.045, BR * 0.99]], 12);
  }
  const BX = 2.75;
  barrel([BX, 0, -1.25], [0, 1, 0]);
  barrel([BX, 0, -1.85], [0, 1, 0]);
  barrel([BX + 0.02, BH + BR * 0.95, -1.55 - BH / 2], [0, 0, 1]);

  // ---------- meshes ----------
  const MAT = {
    plaster: [c.plaster, c.plasterShade, 0.1, 4],
    stone: [c.stone, c.stoneShade, 0.1, 4],
    tile: [c.tile, c.tileShade, 0.1, 4],
    frame: [c.tile, c.tileShade, 0.1, 3],
    joint: [c.joint, c.jointShade, -0.2, 0],
    line: [c.line, c.line, 0.1, 0],
    wood: [c.wood, c.woodShade, 0.1, 3],
    door: [c.plaster, c.plasterShade, 0.1, 4],
    doorIron: [c.line, c.line, 0.1, 0],
    barrel: [c.barrel, c.barrelShade, 0.1, 3],
    fruit: [c.fruit, c.fruitShade, -0.3, 2.5],
  };
  const moving = [];
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    set.add(mesh);
    if (key === "door" || key === "doorIron") {
      kit.hullNormals(g);
      const hn = g.attributes.hullNormal;
      moving.push({ g, p: Float32Array.from(arr), n: Float32Array.from(g.attributes.normal.array), h: hn ? Float32Array.from(hn.array) : null, t: tags[key] });
    }
  }

  // rewrite the leaves about their hinge posts: open in [0, 1] -> 0 .. 100 deg, both leaves out toward +Z
  function swing(open) {
    const th = Math.max(0, Math.min(1, open)) * (100 * Math.PI) / 180;
    for (const m of moving) {
      const P3 = m.g.attributes.position.array, N3 = m.g.attributes.normal.array, H = m.g.attributes.hullNormal?.array;
      for (let v = 0; v < m.t.length; v++) {
        const s = m.t[v], i = v * 3;
        if (!s) continue;
        const a = s * th, co = Math.cos(a), si = Math.sin(a), hx = s * HX;
        const dx = m.p[i] - hx, dz = m.p[i + 2] - HZ;
        P3[i] = hx + dx * co + dz * si, P3[i + 2] = HZ - dx * si + dz * co;
        const rot = (src, dst) => { const x = src[i], z = src[i + 2]; dst[i] = x * co + z * si, dst[i + 2] = -x * si + z * co; };
        rot(m.n, N3);
        if (H && m.h) rot(m.h, H);
      }
      m.g.attributes.position.needsUpdate = m.g.attributes.normal.needsUpdate = true;
      if (H) m.g.attributes.hullNormal.needsUpdate = true;
      m.g.computeBoundingSphere(), m.g.computeBoundingBox();
    }
  }

  // ---------- poses and clips ----------
  const CLIPS = { swing: 6 };
  const ease = (u) => u * u * (3 - 2 * u);
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`kura: no clip "${m[1]}" (clips: swing)`);
      const t = ((+m[2] % 6) + 6) % 6; // closed 0-1 s, opens 1-2.5, holds 2.5-4, closes 4-5.5, closed
      swing(t < 1 ? 0 : t < 2.5 ? ease((t - 1) / 1.5) : t < 4 ? 1 : t < 5.5 ? 1 - ease((t - 4) / 1.5) : 0);
    } else if (name === "rest") swing(door);
    else throw new Error(`kura: unknown pose "${name}" (rest, or swing@<seconds>)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
