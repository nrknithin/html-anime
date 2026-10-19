// ufo-catcher.js - a Japanese arcade crane game (UFO catcher), the machine of the anime date scene: a pink cabinet
// with a lit marquee box on top, a glass case of round plush prizes, a gantry with a three-prong claw on a cable, a
// prize chute with a flap, a control panel with a joystick and two buttons, and a coin slot.
// Contract: harness/lab/README.md. Meters, +Y up, the machine faces +Z (the player), its left is +X, stands on y = 0,
// centred on x = 0, z = 0 (the control panel juts 0.14 m forward of the 1.2 m cabinet).
//
// Construction (boxes, discs, prisms, lat-long ellipsoids and tubes as triangle soups merged per material, so the whole
// machine is 12 meshes at any prize count; every triangle is wound away from a point inside its solid, never by hand):
//   CABINET  pink lower box on a dark recessed plinth; the control panel a pink ledge with a white top; the marquee a
//            pink box with a white cap, its four faces inset with a glow panel carrying flat pink hearts and stars (no
//            text, no hull, so they stay crisp at thumbnail size).
//   GLASS    suggested, not drawn: white corner posts, sill and top rail; slanted glints (line colour, no hull) on the
//            front and the +X side. Behind them a dark raised floor, back wall and ceiling give the open frame depth
//            (at night the back wall is a lit backdrop).
//   PRIZES   round plush blobs (a squashed ellipsoid, round or pointy ears, two eye dots and a nose), in a three-layer
//            heap that rises to the back; colours, sizes, yaw and tilt from an integer hash (no Math.random). The heap
//            leaves the front-right corner to the chute: a white-framed box with a dark mouth, which drops to the
//            outlet on the cabinet front (a dark opening with a white flap hinged over its top two thirds).
//   CLAW     two Z rails and an X bar at the top of the case carry a trolley; a cable drops to the claw head and three
//            prongs hang from its rim. Head, prongs and cable are ONE mesh: pose() rewrites its vertices from the
//            joints (each vertex stores its owner: cable top = static, head = claw, prong k = prongK), as the gachapon
//            cranks, so the claw stays one draw call but every part still moves on its own joint.
// Proportions (real size; base unit the cabinet width W = 1.2 m): footprint 1.2 x 1.2 (+0.14 panel), top 2.0. Plinth
//   0.05, lower cabinet to 0.92, case 0.92-1.80 (raised floor 0.99), marquee 1.82-1.98 with a 0.02 cap. Control panel
//   top 0.925, 0.14 deep. Plush r 0.088-0.105 on a 0.18 grid, heap layers 0.14 apart. Claw head r 0.068, prongs 0.22;
//   the claw rests with its head top at 1.63 and drops 0.20 into the pile.
// Options: build(THREE, kit, colors, { height, count, night }).
//   height  scales everything so the top is `height` (default 2.0 m).
//   count   plush prizes, 0..55 (default 47): the floor slots the glass shows fill first, then the heap, then the
//           floor slots buried under it.
//   night   lights the machine: marquee panels, the interior light bar, the back wall and the lit button glow
//           practical flat, and the prizes take an all-lit threshold (the case's own light); same script.
// Joints: claw (claw head pivot at its top centre; position.y moves it), prong0..2 (children of claw at the head rim,
//   rotation.y faces local +X outward, +rz swings the tip outward/open).
// Clips: grab (4 s): open at the top, descend 0.20 m, close, rise, hold, open again; loops.
// Budget: ~13.6k triangles at count 47 (plush ~220 each), 12 meshes.
// Colours (festival): cabinet, joystick ball, red button accent #ff4d6d / sky #24143a; trim (posts,
//   rails, gantry, panel top, flap, coin plate, chute frame) sclera #f6f3ee / moon #ffd7a1; dark (plinth, interior,
//   slot, outlet, chute mouth, joystick shaft) sky flat; glow (marquee panels, light bar, lit button) moon #ffd7a1 /
//   practical #ffb020 by day, practical flat at night; deco (hearts, stars) accent flat, no hull; plush A accent /
//   sky, B practical / accent, C sclera / moon, D skin #f0c2ae / accent; faces sky flat, no hull; glints line #fff1ea flat, no hull; claw sclera / moon.

export const meta = {
  name: "ufo-catcher",
  height: 2.0,
  script: "festival",
  colors: {
    body: "#ff4d6d", bodyShade: "#24143a",
    trim: "#f6f3ee", trimShade: "#ffd7a1",
    dark: "#24143a", darkShade: "#24143a",
    glow: "#ffd7a1", glowShade: "#ffb020", glowLit: "#ffb020",
    plushA: "#ff4d6d", plushAShade: "#24143a",
    plushB: "#ffb020", plushBShade: "#ff4d6d",
    plushC: "#f6f3ee", plushCShade: "#ffd7a1",
    plushD: "#f0c2ae", plushDShade: "#ff4d6d",
    face: "#24143a",
    glint: "#fff1ea",
    claw: "#f6f3ee", clawShade: "#ffd7a1",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const NATURAL = 2.0;
  const { height = NATURAL, night = false } = opts;
  const count = Math.max(0, Math.min(55, Math.round(opts.count ?? 47)));
  const TAU = Math.PI * 2;
  const root = new THREE.Group();
  root.name = "ufo-catcher";
  const body = new THREE.Group();
  body.name = "machine";
  body.scale.setScalar(height / NATURAL);
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
  let owner = -1; // claw soup: -1 static, 0 claw head, 1..3 prongs
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
  // cylinder on the y axis: centre (x, z), y0..y1, radius r
  function cylY(key, x, z, y0, y1, r, seg = 14, r1 = r) {
    const ref = [x, (y0 + y1) / 2, z];
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * TAU, a1 = ((i + 1) / seg) * TAU;
      const [c0, s0, c1, s1] = [Math.cos(a0), Math.sin(a0), Math.cos(a1), Math.sin(a1)];
      const b0 = [x + r * c0, y0, z + r * s0], b1 = [x + r * c1, y0, z + r * s1];
      const t0 = [x + r1 * c0, y1, z + r1 * s0], t1 = [x + r1 * c1, y1, z + r1 * s1];
      const n0 = [c0, 0, s0], n1 = [c1, 0, s1];
      tri(key, b0, b1, t1, ref, n0, n1, n1);
      tri(key, b0, t1, t0, ref, n0, n1, n0);
      tri(key, [x, y1, z], t0, t1, ref);
      tri(key, [x, y0, z], b0, b1, ref);
    }
  }
  // a flat prism from a 2D outline (star-shaped about its first point's centroid) in a frame: o + u*U + v*V, depth along W
  function prism(key, pts, o, U, V, W, d) {
    const at = ([u, v], w) => add(add(add(o, mul(U, u)), mul(V, v)), mul(W, w));
    const cu = pts.reduce((s, q) => s + q[0], 0) / pts.length, cv = pts.reduce((s, q) => s + q[1], 0) / pts.length;
    const ref = at([cu, cv], d / 2);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      tri(key, at([cu, cv], d), at(a, d), at(b, d), ref);
      tri(key, at([cu, cv], 0), at(a, 0), at(b, 0), ref);
      quad(key, at(a, 0), at(b, 0), at(b, d), at(a, d), ref);
    }
  }
  const star = (r, k = 0.45) => Array.from({ length: 10 }, (_, i) => {
    const a = Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r * k : r;
    return [q * Math.cos(a), q * Math.sin(a)];
  });
  const heart = (r) => Array.from({ length: 24 }, (_, i) => {
    const t = (i / 24) * TAU;
    return [(r / 16) * 16 * Math.sin(t) ** 3, (r / 16) * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 3)];
  });
  // ellipsoid: centre C, radii R, rotation matrix M (THREE.Matrix4) or null; smooth normals
  const v3 = new THREE.Vector3();
  function ellipsoid(key, C, R, M, seg = 12, rings = 7) {
    const pt = (th, ph) => {
      const u = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
      v3.set(u[0] * R[0], u[1] * R[1], u[2] * R[2]);
      if (M) v3.applyMatrix4(M);
      const p = add(C, [v3.x, v3.y, v3.z]);
      v3.set(u[0] / R[0], u[1] / R[1], u[2] / R[2]);
      if (M) v3.transformDirection(M);
      return [p, nrm([v3.x, v3.y, v3.z])];
    };
    for (let k = 0; k < rings; k++) {
      const t0 = (k / rings) * Math.PI, t1 = ((k + 1) / rings) * Math.PI;
      for (let i = 0; i < seg; i++) {
        const p0 = (i / seg) * TAU, p1 = ((i + 1) / seg) * TAU;
        const [a, b, e, d] = [pt(t0, p0), pt(t0, p1), pt(t1, p1), pt(t1, p0)];
        if (k > 0) tri(key, a[0], b[0], e[0], C, a[1], b[1], e[1]);
        if (k < rings - 1) tri(key, a[0], e[0], d[0], C, a[1], e[1], d[1]);
      }
    }
  }
  // cone from base centre B (radius r, axis toward apex A)
  function cone(key, B, A, r, seg = 8) {
    const ax = nrm(sub(A, B)), t = nrm(cross(ax, Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), s = cross(ax, t);
    const ref = add(B, mul(sub(A, B), 0.25));
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * TAU, a1 = ((i + 1) / seg) * TAU;
      const q0 = add(B, add(mul(t, r * Math.cos(a0)), mul(s, r * Math.sin(a0))));
      const q1 = add(B, add(mul(t, r * Math.cos(a1)), mul(s, r * Math.sin(a1))));
      tri(key, q0, q1, A, ref);
      tri(key, q0, q1, B, ref);
    }
  }
  // a flat disc facing n at P (single-sided, outward), radius r
  function dot2(key, P, n, r, seg = 8) {
    const t = nrm(cross(n, Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), s = cross(n, t), ref = sub(P, n);
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * TAU, a1 = ((i + 1) / seg) * TAU;
      tri(key, P, add(P, add(mul(t, r * Math.cos(a0)), mul(s, r * Math.sin(a0)))), add(P, add(mul(t, r * Math.cos(a1)), mul(s, r * Math.sin(a1)))), ref);
    }
  }
  // tube through local points, radius r, closed ends (cone caps to the end points)
  function tube(key, pts, r, seg = 6) {
    const rings = pts.map((P, i) => {
      const T = nrm(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
      const t = nrm(cross(T, Math.abs(T[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0])), s = cross(T, t);
      return Array.from({ length: seg }, (_, j) => {
        const a = (j / seg) * TAU, d = add(mul(t, Math.cos(a)), mul(s, Math.sin(a)));
        return [add(P, mul(d, r)), d];
      });
    });
    for (let i = 0; i < rings.length - 1; i++)
      for (let j = 0; j < seg; j++) {
        const [a, b, e, d] = [rings[i][j], rings[i][(j + 1) % seg], rings[i + 1][(j + 1) % seg], rings[i + 1][j]];
        const ref = mul(add(pts[i], pts[i + 1]), 0.5);
        tri(key, a[0], b[0], e[0], ref, a[1], b[1], e[1]);
        tri(key, a[0], e[0], d[0], ref, a[1], e[1], d[1]);
      }
    for (const [k, dir] of [[0, -1], [rings.length - 1, 1]]) {
      const P = pts[k], T = nrm(sub(pts[Math.min(k + 1, pts.length - 1)], pts[Math.max(k - 1, 0)])), tip = add(P, mul(T, dir * r * 0.8));
      for (let j = 0; j < seg; j++) tri(key, rings[k][j][0], rings[k][(j + 1) % seg][0], tip, sub(P, mul(T, dir * r)));
    }
  }
  const hash = (i) => {
    let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  // ---------- cabinet ----------
  const HW = 0.6, F = 0.6;                               // half width, front face z
  box("dark", -HW + 0.03, HW - 0.03, 0, 0.05, -F + 0.03, F - 0.03);   // recessed plinth
  box("body", -HW, HW, 0.05, 0.92, -F, F);               // lower cabinet
  box("trim", -HW - 0.004, HW + 0.004, 0.05, 0.09, -F - 0.004, F + 0.004); // kick band
  // control panel ledge: pink, white top, a dark seam under its lip
  box("body", -0.55, 0.55, 0.78, 0.9, F, F + 0.14);
  box("trim", -0.56, 0.56, 0.9, 0.925, F - 0.02, F + 0.15);
  // joystick: dark collar and shaft, pink ball; two big round buttons (pink, and the glow one)
  const zp = F + 0.075;
  cylY("dark", -0.3, zp, 0.925, 0.94, 0.05, 16);
  cylY("dark", -0.3, zp, 0.94, 1.03, 0.012, 8);
  ellipsoid("body", [-0.3, 1.04, zp], [0.036, 0.036, 0.036], null, 10, 6);
  cylY("trim", 0.12, zp, 0.925, 0.935, 0.056, 16);
  cylY("body", 0.12, zp, 0.935, 0.955, 0.045, 16);
  ellipsoid("body", [0.12, 0.955, zp], [0.045, 0.022, 0.045], null, 14, 6);
  cylY("trim", 0.32, zp, 0.925, 0.935, 0.056, 16);
  cylY("glow", 0.32, zp, 0.935, 0.955, 0.045, 16);
  ellipsoid("glow", [0.32, 0.955, zp], [0.045, 0.022, 0.045], null, 14, 6);
  // coin plate (white) with a dark vertical slot and a dark return cup
  box("trim", -0.47, -0.33, 0.52, 0.74, F - 0.01, F + 0.012);
  box("dark", -0.408, -0.392, 0.62, 0.71, F, F + 0.018);
  box("dark", -0.44, -0.36, 0.55, 0.585, F, F + 0.018);
  // outlet: white frame, dark opening, white flap over its top two thirds, tilted out at its foot
  box("trim", 0.2, 0.52, 0.16, 0.48, F - 0.01, F + 0.01);
  box("dark", 0.23, 0.49, 0.19, 0.45, F, F + 0.016);
  quad("trim", [0.24, 0.44, F + 0.02], [0.48, 0.44, F + 0.02], [0.48, 0.27, F + 0.05], [0.24, 0.27, F + 0.05], [0.36, 0.36, F]);
  box("trim", 0.24, 0.48, 0.27, 0.44, F + 0.012, F + 0.02);
  // a white stripe across the front and +-X sides between panel and outlet height
  box("trim", -HW - 0.004, HW + 0.004, 0.58, 0.6, -F - 0.004, F + 0.004);

  // ---------- case: posts, sill, rails, interior ----------
  const Y0 = 0.92, Y1 = 1.8, PT = 0.045, FLOOR = 0.99;
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    box("trim", sx * HW - (sx > 0 ? PT : 0), sx * HW + (sx < 0 ? PT : 0), Y0, Y1, sz * F - (sz > 0 ? PT : 0), sz * F + (sz < 0 ? PT : 0));
  box("trim", -HW, HW, Y0, Y0 + 0.035, F - 0.03, F);          // front sill
  box("trim", HW - 0.03, HW, Y0, Y0 + 0.035, -F, F);          // +X sill
  box("trim", -HW, -HW + 0.03, Y0, Y0 + 0.035, -F, F);        // -X sill
  box("trim", -HW, HW, Y1 - 0.04, Y1, F - 0.035, F);          // top rails
  box("trim", HW - 0.035, HW, Y1 - 0.04, Y1, -F, F);
  box("trim", -HW, -HW + 0.035, Y1 - 0.04, Y1, -F, F);
  box("dark", -HW + 0.03, HW - 0.03, Y0, FLOOR, -F + 0.03, F - 0.03); // raised floor
  box(night ? "glow" : "dark", -HW + 0.02, HW - 0.02, Y0, Y1, -F + 0.005, -F + 0.03); // back wall: a lit backdrop at night
  box("dark", -HW + 0.03, HW - 0.03, Y1 - 0.03, Y1, -F + 0.03, F - 0.03); // ceiling
  box("glow", -0.5, 0.5, Y1 - 0.05, Y1 - 0.03, F - 0.09, F - 0.05);    // light bar
  // glints: slanted strips on the front glass, one pair on the +X side (no hull)
  const zg = F + 0.003, xg = HW + 0.003;
  const fstrip = (u0, w, v0, v1, sl) => quad("glint", [u0, v0, zg], [u0 + w, v0, zg], [u0 + w + sl, v1, zg], [u0 + sl, v1, zg], [0, 1.3, 0]);
  fstrip(-0.44, 0.04, 1.3, 1.64, 0.14);
  fstrip(-0.36, 0.014, 1.36, 1.58, 0.09);
  const sstrip = (z0, w, v0, v1, sl) => quad("glint", [xg, v0, z0], [xg, v0, z0 - w], [xg, v1, z0 - w - sl], [xg, v1, z0 - sl], [0, 1.3, 0]);
  sstrip(0.4, 0.04, 1.3, 1.64, 0.14);
  sstrip(0.32, 0.014, 1.36, 1.58, 0.09);

  // ---------- chute: front-right corner of the case ----------
  const cx0 = 0.24, cx1 = HW - PT, cz0 = 0.24, cz1 = F - PT, cy = 1.2;
  box("trim", cx0, cx1, cy - 0.025, cy, cz0, cz1);             // rim
  box("dark", cx0 + 0.03, cx1 - 0.02, cy - 0.024, cy + 0.002, cz0 + 0.03, cz1 - 0.02); // mouth
  for (const [x, z] of [[cx0, cz0], [cx0, cz1 - 0.02], [cx1 - 0.02, cz0]]) box("trim", x, x + 0.02, FLOOR, cy, z, z + 0.02);
  box("trim", cx0, cx0 + 0.02, FLOOR, FLOOR + 0.03, cz0, cz1);          // foot rails
  box("trim", cx0, cx1, FLOOR, FLOOR + 0.03, cz0, cz0 + 0.02);

  // ---------- marquee ----------
  const M0 = 1.82, M1 = 1.98, MY = 1.9, MH = 0.062;
  box("dark", -HW + 0.03, HW - 0.03, Y1, M0, -F + 0.03, F - 0.03); // neck
  box("body", -HW - 0.01, HW + 0.01, M0, M1, -F - 0.01, F + 0.01);
  box("trim", -HW - 0.02, HW + 0.02, M1, 2.0, -F - 0.02, F + 0.02);
  box("trim", -HW - 0.02, HW + 0.02, M0 - 0.012, M0, -F - 0.02, F + 0.02);
  const faces = [
    { o: [0, MY, F + 0.01], U: [1, 0, 0], W: [0, 0, 1], half: 0.53 },
    { o: [HW + 0.01, MY, 0], U: [0, 0, -1], W: [1, 0, 0], half: 0.53 },
    { o: [-HW - 0.01, MY, 0], U: [0, 0, 1], W: [-1, 0, 0], half: 0.53 },
    { o: [0, MY, -F - 0.01], U: [-1, 0, 0], W: [0, 0, -1], half: 0.53 },
  ];
  for (const f of faces) {
    const at = (u, v, w) => add(add(add(f.o, mul(f.U, u)), [0, v, 0]), mul(f.W, w));
    const a = at(-f.half, -MH, 0), b = at(f.half, -MH, 0), e = at(f.half, MH, 0), d = at(-f.half, MH, 0);
    const pa = at(-f.half, -MH, 0.006), pb = at(f.half, -MH, 0.006), pe = at(f.half, MH, 0.006), pd = at(-f.half, MH, 0.006);
    const ref = at(0, 0, -0.05);
    quad("glow", pa, pb, pe, pd, ref);
    quad("glow", a, b, pb, pa, ref), quad("glow", b, e, pe, pb, ref), quad("glow", e, d, pd, pe, ref), quad("glow", d, a, pa, pd, ref);
    const deco = (shape, u, v) => prism("deco", shape.map(([x, y]) => [x + u, y + v]), at(0, 0, 0.006), f.U, [0, 1, 0], f.W, 0.008);
    deco(heart(0.058), 0, -0.006);
    for (const s of [-1, 1]) deco(star(0.054), s * 0.2, 0), deco(heart(0.04), s * 0.36, -0.004), deco(star(0.04), s * 0.47, 0);
  }

  // ---------- gantry ----------
  const GY = 1.73, CLX = -0.08, CLZ = 0.22;
  for (const s of [-1, 1]) box("trim", s * 0.5 - 0.02, s * 0.5 + 0.02, GY, GY + 0.03, -0.52, 0.52);
  box("trim", -0.52, 0.52, GY - 0.03, GY, CLZ - 0.025, CLZ + 0.025);
  box("dark", CLX - 0.07, CLX + 0.07, GY - 0.06, GY - 0.03, CLZ - 0.06, CLZ + 0.06); // trolley
  box("trim", CLX - 0.06, CLX + 0.06, GY - 0.075, GY - 0.06, CLZ - 0.05, CLZ + 0.05);

  // ---------- plush prizes ----------
  const KINDS = ["plushA", "plushB", "plushC", "plushD"];
  const slots = [];
  const inChute = (x, z) => x > cx0 - 0.07 && z > cz0 - 0.07;
  const grid = [-0.45, -0.27, -0.09, 0.09, 0.27, 0.45];
  // order: the floor layer the glass shows, then the heap, then the floor slots buried under it (dropped first)
  const buried = [];
  for (const z of grid) for (const x of grid) if (!inChute(x, z)) (z < 0 && Math.abs(x) < 0.4 ? buried : slots).push([x, 0, z]);
  for (const z of [-0.41, -0.23, -0.05]) for (const x of [-0.36, -0.18, 0, 0.18, 0.36]) slots.push([x, 1, z]);
  for (const z of [-0.42, -0.24]) for (const x of [-0.27, -0.09, 0.09, 0.27]) slots.push([x, 2, z]);
  slots.push(...buried);
  const RM = new THREE.Matrix4();
  for (let i = 0; i < Math.min(count, slots.length); i++) {
    const [sx, layer, sz] = slots[i];
    const h = (u) => hash(i * 13 + u + 7);
    const r = 0.088 + h(1) * 0.017, kind = KINDS[Math.floor(h(2) * 4)];
    const x = sx + (h(3) - 0.5) * 0.03, z = sz + (h(4) - 0.5) * 0.03;
    const y = FLOOR + r * 0.88 + layer * 0.14 + (layer ? (h(5) - 0.5) * 0.02 : 0);
    const yaw = (h(6) - 0.5) * 0.9 + (sx > 0.3 ? 0.5 : sx < -0.3 ? -0.3 : 0), tilt = (h(7) - 0.5) * 0.4, roll = (h(8) - 0.5) * 0.4;
    RM.makeRotationFromEuler(new THREE.Euler(tilt, yaw, roll, "YXZ"));
    const C = [x, y, z], R = [r * 1.06, r * 0.9, r];
    ellipsoid(kind, C, R, RM, 12, 6);
    const L = (lx, ly, lz) => { v3.set(lx, ly, lz).applyMatrix4(RM); return add(C, [v3.x, v3.y, v3.z]); };
    const D = (lx, ly, lz) => { v3.set(lx, ly, lz).transformDirection(RM); return [v3.x, v3.y, v3.z]; };
    const pointy = h(9) < 0.4;
    for (const s of [-1, 1]) {
      if (pointy) cone(kind, L(s * r * 0.55, r * 0.6, 0), L(s * r * 0.75, r * 1.25, 0.01), r * 0.3, 7);
      else ellipsoid(kind, L(s * r * 0.62, r * 0.78, 0), [r * 0.32, r * 0.32, r * 0.18], RM, 8, 4);
      // eyes on the surface, a little forward of the equator
      const de = nrm([s * 0.36 / 1.06, 0.12 / 0.9, 0.92]);
      const pe = L(de[0] * R[0] * 1.01, de[1] * R[1] * 1.01, de[2] * R[2] * 1.01);
      dot2("face", pe, D(...nrm([s * 0.36, 0.12, 0.92])), r * 0.12, 8);
    }
    const pn = L(0, -0.12 * R[1], R[2] * 0.995 * 1.01);
    dot2("face", pn, D(0, -0.1, 1), r * 0.085, 6);
  }

  // ---------- claw (one mesh, vertices owned by joints) ----------
  const claw = new THREE.Object3D();
  claw.name = "claw";
  claw.position.set(CLX, 1.63, CLZ);
  body.add(claw);
  joints.claw = claw;
  const TROLLEY = GY - 0.075;
  // cable: four-sided rod; top ring static, bottom ring on the claw
  const cr = 0.006;
  for (let j = 0; j < 4; j++) {
    const a0 = (j / 4) * TAU + Math.PI / 4, a1 = ((j + 1) / 4) * TAU + Math.PI / 4;
    const p = (a, y) => [cr * Math.cos(a), y, cr * Math.sin(a)];
    const n0 = [Math.cos(a0), 0, Math.sin(a0)], n1 = [Math.cos(a1), 0, Math.sin(a1)];
    // stored as owner -1 (top, body coords) / 0 (bottom, claw local)
    const top0 = add([CLX, TROLLEY, CLZ], p(a0, 0)), top1 = add([CLX, TROLLEY, CLZ], p(a1, 0));
    const bot0 = p(a0, 0.02), bot1 = p(a1, 0.02);
    const s = S("claw");
    const push = (q, n, o) => (s.p.push(...q), s.n.push(...n), s.o.push(o));
    push(top0, n0, -1), push(bot1, n1, 0), push(bot0, n0, 0);
    push(top0, n0, -1), push(top1, n1, -1), push(bot1, n1, 0);
  }
  owner = 0;
  cylY("claw", 0, 0, -0.012, 0.02, 0.022, 10);                     // cable clamp
  cylY("claw", 0, 0, -0.075, -0.012, 0.068, 16, 0.045);              // head, tapering up
  cylY("claw", 0, 0, -0.09, -0.075, 0.064, 16);                     // rim
  const PRONG = [[0, 0, 0], [0.034, -0.033, 0], [0.056, -0.094, 0], [0.05, -0.165, 0], [0.016, -0.21, 0], [-0.004, -0.222, 0]];
  const prongs = [];
  for (let k = 0; k < 3; k++) {
    owner = k + 1;
    tube("claw", PRONG, 0.011, 6);
    const pj = new THREE.Object3D();
    pj.name = `prong${k}`;
    const a = Math.PI / 2 - (k * TAU) / 3 + 0.35; // one prong toward the front-left, the others behind
    pj.position.set(0.05 * Math.cos(a), -0.084, 0.05 * Math.sin(a));
    pj.rotation.set(0, -a, 0);
    claw.add(pj);
    joints[pj.name] = pj;
    prongs.push(pj);
  }
  owner = -1;

  // ---------- meshes: one per material ----------
  const lit = night ? -1 : null;
  const MAT = {
    body: [c.body, c.bodyShade, 0.15, 4], trim: [c.trim, c.trimShade, 0.2, 3], dark: [c.dark, c.darkShade, 0.15, 3],
    glow: night ? [c.glowLit, c.glowLit, -1, 3] : [c.glow, c.glowShade, 0.1, 3],
    plushA: [c.plushA, c.plushAShade, lit ?? 0.2, 2.5], plushB: [c.plushB, c.plushBShade, lit ?? 0.2, 2.5],
    plushC: [c.plushC, c.plushCShade, lit ?? 0.2, 2.5], plushD: [c.plushD, c.plushDShade, lit ?? 0.2, 2.5],
    face: [c.face, c.face, -1, 0], deco: [c.body, c.body, -1, 0], glint: [c.glint, c.glint, -1, 0], claw: [c.claw, c.clawShade, 0.2, 3],
  };
  let clawMesh = null, base = null;
  for (const [key, { p, n, o }] of Object.entries(soups)) {
    const [b, s, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, b, s, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    body.add(mesh);
    if (key === "claw") {
      clawMesh = mesh;
      kit.hullNormals(g);
      const hn = g.attributes.hullNormal;
      base = { p: Float32Array.from(p), n: Float32Array.from(n), h: hn ? Float32Array.from(hn.array) : null, o };
      mesh.frustumCulled = false;
    }
  }

  // rewrite the claw mesh from the joints (claw translates, prongs rotate about their rim pivots)
  const MS = [new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4()];
  const NS = MS.map(() => new THREE.Matrix3());
  function rig() {
    claw.updateMatrix();
    MS[0].copy(claw.matrix);
    prongs.forEach((pj, k) => (pj.updateMatrix(), MS[k + 1].multiplyMatrices(claw.matrix, pj.matrix)));
    MS.forEach((m, k) => NS[k].getNormalMatrix(m));
    const g = clawMesh.geometry, P3 = g.attributes.position.array, N3 = g.attributes.normal.array, H = g.attributes.hullNormal?.array;
    const q = new THREE.Vector3();
    for (let v = 0; v < base.o.length; v++) {
      const k = base.o[v], i = v * 3;
      if (k < 0) continue;
      q.fromArray(base.p, i).applyMatrix4(MS[k]).toArray(P3, i);
      q.fromArray(base.n, i).applyMatrix3(NS[k]).normalize().toArray(N3, i);
      if (H && base.h) q.fromArray(base.h, i).applyMatrix3(NS[k]).normalize().toArray(H, i);
    }
    g.attributes.position.needsUpdate = g.attributes.normal.needsUpdate = true;
    if (H) g.attributes.hullNormal.needsUpdate = true;
    g.computeBoundingSphere(), g.computeBoundingBox();
  }

  // ---------- poses and clips ----------
  // drop: claw head y below its top position (m); open: prong rz (rad, + opens)
  const TOP = 1.63, DROP = 0.2, OPEN = 0.55, SHUT = -0.12, REST_OPEN = 0.2;
  const CLIPS = { grab: 4 };
  const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  function apply(drop, open) {
    claw.position.set(CLX, TOP - drop, CLZ);
    for (const pj of prongs) pj.rotation.z = open;
    rig();
    root.updateMatrixWorld(true);
  }
  // grab timeline (s): 0-0.4 open at top, 0.4-1.6 descend, 1.6-2.1 close, 2.1-3.2 rise, 3.2-3.6 hold, 3.6-4 open
  function grab(t) {
    const u = ((t % 4) + 4) % 4;
    const drop = DROP * (ease((u - 0.4) / 1.2) - ease((u - 2.1) / 1.1));
    const open = REST_OPEN + (OPEN - REST_OPEN) * ease(u / 0.4) + (SHUT - OPEN) * ease((u - 1.6) / 0.5) + (REST_OPEN - SHUT) * ease((u - 3.6) / 0.4);
    return apply(drop, open);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`ufo-catcher: no clip "${m[1]}" (clips: grab)`);
      return grab(+m[2]);
    }
    if (name !== "rest") throw new Error(`ufo-catcher: unknown pose "${name}" (rest, or grab@<seconds>)`);
    apply(0, REST_OPEN);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
