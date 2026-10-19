// gachapon.js - a bank of Japanese capsule-toy machines: a row of units stacked two high on a low stand, each with a
// clear box of two-tone capsules over a coloured body, a display card, a big crank, a coin slot and an outlet flap.
// Contract: harness/lab/README.md. Meters, +Y up, the bank faces +Z (the customer), its left is +X, stands on y = 0,
// centred on x = 0, z = 0.
//
// Construction (boxes, discs and lat-long spheres as triangle soups, merged per material across every machine, so
// a 16-machine bank is still 11 meshes; every triangle is wound away from a point inside its solid, never by hand):
//   STAND  one dark plinth under each column, a recessed toe so it reads as a base, not a block.
//   BODY   the coloured lower box (three colours cycling along the row, offset per row), a thin lid slab on top of the clear box,
//          both in the body colour. The front carries: the display card (a white panel with a coloured band and a
//          big capsule picture: a disc on a disc, simple shapes, no text), the crank (a chrome dial with a thick grip
//          bar across it on a dark collar: the dial is static, the bar turns), the coin plate (white, with a dark vertical slot) and the outlet (a dark
//          opening, its white flap hanging over the top two thirds).
//   CLEAR  the clear box is suggested, not drawn: four white corner posts and a white sill, a dark interior box
//          behind the capsules (so the gaps read as depth, not as paint), and glints (two slanted strips on the
//          front, one on the +X side) in line colour with no hull. The interior box stops below the pile's top, so
//          the background shows through the top gaps. Capsules fill the box to ~90 % in a hex pile:
//          the front layer and the layers down each side (the only ones the glass shows), deterministic colours
//          and jitter from an integer hash, each a sphere split at a tilted equator: coloured top, white bottom.
//   CRANK  all grip bars are one mesh. Each machine's crank is a joint `crank<row>_<col>` at the dial centre; pose()
//          sets the joints' rotation.z and rewrites that mesh's positions and normals from them (plain Mesh, no
//          morphs), so the bank stays one draw call and every crank still turns alone.
// Proportions (real size; base unit the machine pitch P = 0.50 m): unit 0.48 W x 0.44 D x 0.80 H: body 0.40,
//   clear box 0.36 (0.46 x 0.40), lid 0.04. Stand 0.16. Capsules 90 mm (r 0.045), 4 rows. Crank dial r 0.07 on a
//   r 0.08 collar at 0.165 m up, grip bar 0.164 long. Card 0.42 x 0.13. Coin plate 0.07 x 0.11. Outlet 0.13 x 0.09.
// Options: build(THREE, kit, colors, { height, count, rows }).
//   count  machines per row, 1..8 (default 4). rows 1..2 (default 2), row 1 sits on row 0.
//   height scales everything so the top is `height` (default 1.76 m for two rows, 0.96 for one: meta.height is the
//          default, so the lab warns for rows 1 or any other height).
// Budget: ~2.1k triangles a machine (capsules 1.7k), 18.7k for the default 4 x 2 bank, 11 meshes at any size.
// Joints: crank<row>_<col>, +rz turns the crank counter-clockwise seen from the front (a customer turns it -rz).
// Clips: turn (1 s): every crank one full clockwise turn, eased in and out, looping.
// Colours (festival): bodies accent #ff4d6d / sky #24143a, practical #ffb020 / accent, moon #ffd7a1 / practical;
//   capsule tops accent, practical, skin #f0c2ae / accent, sky / sky (flat purple); white (capsule bottoms, card,
//   crank dial, coin plate, flap, posts) sclera #f6f3ee / moon; dark (stand, interior, slot, outlet, grip bars) sky flat;
//   glints line #fff1ea flat, no hull.

export const meta = {
  name: "gachapon",
  height: 1.76,
  script: "festival",
  colors: {
    bodyA: "#ff4d6d", bodyAShade: "#24143a",
    bodyB: "#ffb020", bodyBShade: "#ff4d6d",
    bodyC: "#ffd7a1", bodyCShade: "#ffb020",
    capA: "#ff4d6d", capAShade: "#24143a",
    capB: "#ffb020", capBShade: "#ff4d6d",
    capC: "#f0c2ae", capCShade: "#ff4d6d",
    capD: "#24143a", capDShade: "#24143a",
    white: "#f6f3ee", whiteShade: "#ffd7a1",
    dark: "#24143a", darkShade: "#24143a",
    glint: "#fff1ea", glintShade: "#fff1ea",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const count = Math.max(1, Math.min(8, Math.round(opts.count ?? 4)));
  const rows = Math.max(1, Math.min(2, Math.round(opts.rows ?? 2)));
  const P = 0.5, W = 0.48, D = 0.44, UNIT = 0.8, STAND = 0.16, BODY = 0.4, BOX = 0.36, LID = 0.04;
  const natural = STAND + rows * UNIT;
  const { height = natural } = opts;
  const root = new THREE.Group();
  root.name = "gachapon";
  const body = new THREE.Group();
  body.name = "body";
  body.scale.setScalar(height / natural);
  root.add(body);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [], o: [] });
  let owner = -1; // crank index for the crank soup
  function tri(key, a, b, e, ref, na, nb, ne) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const flip = dot(n, sub(mul(add(add(a, b), e), 1 / 3), ref)) < 0;
    n = nrm(flip ? mul(n, -1) : n);
    const s = S(key);
    const vs = flip ? [[a, na], [e, ne], [b, nb]] : [[a, na], [b, nb], [e, ne]];
    for (const [q, nq] of vs) s.p.push(...q), s.n.push(...(nq ?? n)), s.o.push(owner);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function box(key, x0, x1, y0, y1, z0, z1) {
    const p = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    const ref = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  // a disc (short cylinder) on the z axis: centre (x, y), from z0 to z1, radius r
  function disc(key, x, y, z0, z1, r, seg = 16) {
    const ref = [x, y, (z0 + z1) / 2];
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const q0 = [x + r * Math.cos(a0), y + r * Math.sin(a0)], q1 = [x + r * Math.cos(a1), y + r * Math.sin(a1)];
      const n0 = [Math.cos(a0), Math.sin(a0), 0], n1 = [Math.cos(a1), Math.sin(a1), 0];
      tri(key, [...q0, z0], [...q1, z0], [...q1, z1], ref, n0, n1, n1);
      tri(key, [...q0, z0], [...q1, z1], [...q0, z1], ref, n0, n1, n0);
      tri(key, [x, y, z1], [...q0, z1], [...q1, z1], ref);
      tri(key, [x, y, z0], [...q0, z0], [...q1, z0], ref);
    }
  }
  // a capsule: sphere of radius r, split at an equator tilted by (ax, az); top half `top`, bottom half "white"
  function capsule(top, C, r, ax, az, seg = 8, half = 2) {
    const R = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(ax, 0, az));
    const v = new THREE.Vector3();
    const pt = (th, ph) => {
      v.set(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)).applyMatrix4(R);
      return [v.x, v.y, v.z];
    };
    for (let k = 0; k < 2 * half; k++) {
      const key = k < half ? top : "white";
      const t0 = (k / (2 * half)) * Math.PI, t1 = ((k + 1) / (2 * half)) * Math.PI;
      for (let i = 0; i < seg; i++) {
        const p0 = (i / seg) * Math.PI * 2, p1 = ((i + 1) / seg) * Math.PI * 2;
        const [a, b, e, d] = [pt(t0, p0), pt(t0, p1), pt(t1, p1), pt(t1, p0)];
        const W4 = (u) => add(C, mul(u, r));
        if (k > 0) tri(key, W4(a), W4(b), W4(e), C, a, b, e);
        if (k < 2 * half - 1) tri(key, W4(a), W4(e), W4(d), C, a, e, d);
      }
    }
  }
  const hash = (i) => {
    let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  // ---------- one machine at (x, y0), index m ----------
  const BODIES = ["bodyA", "bodyB", "bodyC"];
  const CAPS = ["capA", "capB", "capC", "capD"];
  const cranks = []; // { x, y, z } per crank owner
  function machine(x, y0, m, tone, name) {
    const bk = BODIES[tone % 3];
    const zf = D / 2, zb = -D / 2;
    // body box and lid
    box(bk, x - W / 2, x + W / 2, y0, y0 + BODY, zb, zf);
    const bx = 0.23, bz0 = -0.2, bz1 = 0.2, yb0 = y0 + BODY, yb1 = yb0 + BOX;
    box(bk, x - W / 2, x + W / 2, yb1, yb1 + LID, zb, zf);
    // clear box: posts, sill, interior
    const PT = 0.016;
    for (const sx of [-1, 1]) for (const z of [bz0, bz1])
      box("white", x + sx * bx - PT / 2, x + sx * bx + PT / 2, yb0, yb1, z - PT / 2, z + PT / 2);
    box("white", x - bx, x + bx, yb0, yb0 + 0.012, bz1 - PT / 2, bz1 + PT / 2);
    const r = 0.045, pitch = 0.088, rowH = 0.077;
    const zFront = bz1 - 0.01 - r, xSide = bx - 0.01 - r;
    box("dark", x - xSide + r, x + xSide - r, yb0, yb0 + 0.25, bz0 + 0.01, zFront - r * 0.5);
    // capsules: a hex pile; the front layer, plus the side layers the glass shows
    let i = m * 997;
    const put = (cx, cy, cz) => {
      i++;
      const k = Math.floor(hash(i) * 4);
      const j = (u) => (hash(i * 7 + u) - 0.5) * 0.01;
      capsule(CAPS[k], [cx + j(1), cy + j(2), cz + j(3)], r, (hash(i * 3) - 0.5) * 1.1, (hash(i * 5) - 0.5) * 1.1);
    };
    for (let row = 0; row < 4; row++) {
      const odd = row % 2, cols = odd ? 4 : 5;
      const cy = yb0 + 0.012 + r + row * rowH;
      for (let col = 0; col < cols; col++) {
        if (row === 3 && hash(m * 31 + col) < 0.4) continue; // uneven top of the pile
        put(x + (col - (cols - 1) / 2) * pitch, cy, zFront);
      }
      for (const sx of [-1, 1])
        for (let d = 1; d < 4; d++) {
          const z = zFront - d * pitch + (odd ? pitch / 2 : 0);
          if (z > bz0 + r && !(row === 3 && hash(m * 41 + d + sx) < 0.4)) put(x + sx * xSide, cy, z);
        }
    }
    // glints: two slanted strips on the front glass, one on the +X side (no hull)
    const zg = bz1 + PT / 2 + 0.003;
    const strip = (u0, w, v0, v1, slant) =>
      quad("glint", [x + u0, yb0 + v0, zg], [x + u0 + w, yb0 + v0, zg], [x + u0 + w + slant, yb0 + v1, zg], [x + u0 + slant, yb0 + v1, zg], [x, yb0, zg - 1]);
    strip(-0.17, 0.035, 0.05, 0.3, 0.06);
    strip(-0.11, 0.012, 0.08, 0.26, 0.05);
    const xg = x + bx + PT / 2 + 0.003;
    quad("glint", [xg, yb0 + 0.06, 0.1], [xg, yb0 + 0.06, 0.13], [xg, yb0 + 0.3, 0.06], [xg, yb0 + 0.3, 0.03], [xg - 1, yb0, 0]);
    // display card: white panel, coloured band, a capsule picture (disc on disc)
    const zc = zf + 0.006;
    box("white", x - 0.21, x + 0.21, y0 + 0.255, y0 + 0.385, zf - 0.01, zc);
    const ck = CAPS[(m + 1) % 4], ck2 = CAPS[(m + 2) % 4];
    box(ck2, x - 0.2, x + 0.2, y0 + 0.36, y0 + 0.375, zc - 0.004, zc + 0.003);
    disc(ck, x - 0.12, y0 + 0.305, zc - 0.004, zc + 0.004, 0.042, 14);
    disc("white", x - 0.12, y0 + 0.305, zc, zc + 0.008, 0.026, 12);
    box(ck, x - 0.04, x + 0.17, y0 + 0.315, y0 + 0.335, zc - 0.004, zc + 0.003);
    box(ck2, x - 0.04, x + 0.11, y0 + 0.28, y0 + 0.295, zc - 0.004, zc + 0.003);
    // coin plate and slot
    const xc = x + 0.165, yc = y0 + 0.165;
    box("white", xc - 0.035, xc + 0.035, yc - 0.055, yc + 0.055, zf - 0.01, zf + 0.01);
    box("dark", xc - 0.006, xc + 0.006, yc - 0.03, yc + 0.035, zf, zf + 0.014);
    // outlet: dark opening, white flap over its top two thirds
    const xo = x - 0.14, yo = y0 + 0.015;
    box("dark", xo - 0.065, xo + 0.065, yo, yo + 0.09, zf - 0.01, zf + 0.008);
    box("white", xo - 0.052, xo + 0.052, yo + 0.03, yo + 0.08, zf - 0.005, zf + 0.014);
    // crank: dark collar (static), dial + grip bar on the joint
    const xk = x - 0.005, yk = y0 + 0.165;
    disc("dark", xk, yk, zf - 0.01, zf + 0.012, 0.08, 18);
    disc("white", xk, yk, zf + 0.012, zf + 0.036, 0.07, 18);
    owner = cranks.length;
    cranks.push([xk, yk]);
    box("crank", xk - 0.082, xk + 0.082, yk - 0.021, yk + 0.021, zf + 0.03, zf + 0.08);
    disc("crank", xk, yk, zf + 0.03, zf + 0.09, 0.03, 10);
    owner = -1;
    const j = new THREE.Object3D();
    j.name = name;
    j.position.set(xk, yk, zf + 0.04);
    body.add(j);
    joints[name] = j;
  }

  // ---------- the bank ----------
  for (let col = 0; col < count; col++) {
    const x = (col - (count - 1) / 2) * P;
    // stand: plinth with a recessed toe
    box("dark", x - P / 2 + 0.005, x + P / 2 - 0.005, 0.03, STAND, -D / 2 - 0.01, D / 2 + 0.02);
    box("dark", x - P / 2 + 0.03, x + P / 2 - 0.03, 0, 0.03, -D / 2 + 0.02, D / 2 - 0.02);
    for (let row = 0; row < rows; row++) machine(x, STAND + row * UNIT, row * 8 + col, col + 2 * row, `crank${row}_${col}`);
  }

  // ---------- meshes: one per material ----------
  const MAT = {
    bodyA: [c.bodyA, c.bodyAShade, 0.15, 4], bodyB: [c.bodyB, c.bodyBShade, 0.15, 4], bodyC: [c.bodyC, c.bodyCShade, 0.15, 4],
    capA: [c.capA, c.capAShade, 0.15, 2.5], capB: [c.capB, c.capBShade, 0.15, 2.5],
    capC: [c.capC, c.capCShade, 0.15, 2.5], capD: [c.capD, c.capDShade, 0.15, 2.5],
    white: [c.white, c.whiteShade, 0.15, 2.5], crank: [c.dark, c.darkShade, 0.15, 3],
    dark: [c.dark, c.darkShade, 0.15, 3], glint: [c.glint, c.glintShade, -1, 0],
  };
  let crankMesh = null, base = null;
  for (const [key, { p, n, o }] of Object.entries(soups)) {
    const [b, s, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, b, s, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    body.add(mesh);
    if (key === "crank") {
      crankMesh = mesh;
      kit.hullNormals(g);
      const hn = g.attributes.hullNormal;
      base = { p: Float32Array.from(p), n: Float32Array.from(n), h: hn ? Float32Array.from(hn.array) : null, o };
    }
  }

  // rewrite the crank mesh from the joints' rotation.z
  function spin() {
    const g = crankMesh.geometry;
    const P3 = g.attributes.position.array, N3 = g.attributes.normal.array, H = g.attributes.hullNormal?.array;
    const ang = Object.values(joints).map((jt) => jt.rotation.z);
    for (let v = 0; v < base.o.length; v++) {
      const k = base.o[v], [cx, cy] = cranks[k], a = ang[k], co = Math.cos(a), si = Math.sin(a);
      const i = v * 3, dx = base.p[i] - cx, dy = base.p[i + 1] - cy;
      P3[i] = cx + dx * co - dy * si, P3[i + 1] = cy + dx * si + dy * co;
      const rot = (src, dst) => { const x = src[i], y = src[i + 1]; dst[i] = x * co - y * si, dst[i + 1] = x * si + y * co; };
      rot(base.n, N3);
      if (H && base.h) rot(base.h, H);
    }
    g.attributes.position.needsUpdate = g.attributes.normal.needsUpdate = true;
    if (H) g.attributes.hullNormal.needsUpdate = true;
    g.computeBoundingSphere(), g.computeBoundingBox();
  }

  // ---------- poses and clips ----------
  const CLIPS = { turn: 1 };
  function apply(a) {
    for (const jt of Object.values(joints)) jt.rotation.set(0, 0, a);
    spin();
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`gachapon: no clip "${m[1]}" (clips: turn)`);
      const u = ((+m[2] % 1) + 1) % 1; // one clockwise turn a second, eased in and out
      return apply(-Math.PI * 2 * (u - Math.sin(u * Math.PI * 2) / (Math.PI * 2)));
    }
    if (name !== "rest") throw new Error(`gachapon: unknown pose "${name}" (rest, or turn@<seconds>)`);
    apply(0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
