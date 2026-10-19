// pagoda.js - a five-storey wooden Buddhist pagoda (goju-no-to), static. One set with models/torii.js and models/shrine.js.
// Contract: harness/lab/README.md. Meters, +Y up, the door bays face all four ways (the steps are on +Z), its left is +X,
// stands on y = 0, centred on x = 0, z = 0.
//
// Construction (triangle soups merged per material, as house-japanese; flat-shaded so the roof planes read crisp):
//   PODIUM   a stone plinth band and podium box, five stone steps on the +Z side.
//   STOREY   five square bodies, each a plaster box ringed by vermilion posts (four per face), a sill and a head beam. The
//            centre bay of every face is a dark two-leaf door, the side bays dark windows with vermilion lattice bars.
//            Storeys 2-5 stand on a vermilion balcony deck with a two-rail railing, on the flat top of the roof below.
//   BRACKETS the bracket clusters (tokyo) as a stepped band under each eave: three slabs, each reaching 0.3 m further out,
//            vermilion / plaster / vermilion, so the band reads as red bracket arms with white wall between.
//   ROOFS    roof(): one closed solid per storey from its square eave. Rows are the square inset by d at y = eave + pitch
//            d, so four planes meet at 45 deg hips; storeys 1-4 are truncated flat where the next balcony sits, storey 5
//            runs to a point (hogyo). Sori: the eave and hips lift toward the corners, k |u|^3 (1 - d / D)^2, k = 0.24
//            (kept under the shrine's ~0.25 m limit, past which the eave folds edge-on and the hull scribbles).
//            The edge is a deep band: a dark tile fascia over a vermilion rafter band, and the underside (soffit) rises
//            back to the bracket band, vermilion. ALL five roofs are ONE mesh with two material groups (tile / rafter) and
//            ONE ink hull, so no slab's hull pokes through the layer above it. Dark tile courses run down each slope
//            (thin strips, no hull) and inked caps ride the hips, one loft per hip on
//            shared sections (two straight beams kinked into a chevron, seen end-on from the hero camera).
//   SPIRE    the bronze sorin from the top apex: dew basin (roban), inverted bowl (fukubachi) and lotus (ukebana) as one
//            lathe, a mast with nine rings (kurin), the water flame (suien, two crossed flat flames), the dragon vehicle
//            (ryusha) and the jewel (hoju). Wind bells (futaku) hang under every eave corner, still ({ bells: false } drops
//            them): they sit in the merged bronze mesh, so a sway would cost 20 more meshes.
// Proportions (real size, base unit the bottom body width W = 6.4 m): body half-width 3.2 tapering by 36 % to the top
// storey (2.05); eaves 2.5 -> 2.0 m past the body (bottom roof 11.4 m across, 1.8 W; top 8.1); podium 9 x 9 x 1.1;
// bodies 3.4 (storey 1) and 2.6 m tall, balconies 0.18, bracket band 0.9; roof pitch 0.42 (0.36 on the top roof);
// eaves at 5.4 / 10.0 / 14.6 / 19.0 / 23.5, apex 24.9 (3.9 W); spire 7.6 m, jewel tip 32.54 (5.1 W).
// { storeys: 3 } is a three-storey sanju-no-to: the same base, 30 % taper, apex 16.2, tip 23.8.
// Scaling: build(THREE, kit, colors, { height }) scales the whole pagoda uniformly (default: its real size).
// Colours (noon, the torii / shrine / house set), base / shade:
//   vermilion (posts, beams, brackets, rafters, soffits, railings)  accent #c4452d / iris #5c3d32, threshold 0.1 (the torii)
//   plaster (walls, the middle bracket slab)                        moon #fff6e4 / sky #f2d7ae (the house), threshold 0.1
//   tile (roof slabs, hip caps)                                     iris #5c3d32 / hair #241c16, threshold 0.25: every slope
//            and the camera-facing fascias stay iris; hair lands on back fascias only. hair is darker than ink #2c261f
//            (noon has nothing between iris and ink), the compromise the house and shrine document.
//   tile courses                                                    hair (lines, no shade)
//   doors, windows                                                  iris / hair, threshold 0.5
//   bronze (spire, bells)                                           iris / hair, threshold 0.35: a dark spire against the sky
//   stone (podium, steps)                                           sky #f2d7ae / skin #f0c2ae (the house), threshold 0.1

export const meta = {
  name: "pagoda",
  height: 32.54,
  script: "noon",
  colors: {
    vermilion: "#c4452d", vermilionShade: "#5c3d32",
    plaster: "#fff6e4", plasterShade: "#f2d7ae",
    tile: "#5c3d32", tileShade: "#241c16",
    tileLine: "#241c16",
    door: "#5c3d32", doorShade: "#241c16",
    bronze: "#5c3d32", bronzeShade: "#241c16",
    stone: "#f2d7ae", stoneShade: "#f0c2ae",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const N = opts.storeys === 3 ? 3 : 5;
  const bells = opts.bells !== false;
  const root = new THREE.Group();
  root.name = "pagoda";
  const body = new THREE.Group(); // the size scale lives here, root stays the plain contract node
  body.name = "body";
  root.add(body);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  // one triangle wound so its normal points along `out` (a direction); slivers dropped
  function tri(key, a, b, e, out) {
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-7) return;
    S(key).push(...a, ...(dot(n, out) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, out) => (tri(key, a, b, e, out), tri(key, a, e, d, out));
  // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order; wound from its centre
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]) {
      const m = [0, 1, 2].map((i) => f.reduce((s, j) => s + p[j][i], 0) / 4);
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], sub(m, ref));
    }
  }
  function box(key, cx, cy, cz, sx, sy, sz) {
    const [x0, x1, y0, y1, z0, z1] = [cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2];
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // a square ring of four boxes round the axis: half-size h (to the outer face), thickness t, height sy, centre y
  const ring = (key, h, t, y, sy) => {
    for (const s of [1, -1]) {
      box(key, 0, y, s * (h - t / 2), 2 * h, sy, t);
      box(key, s * (h - t / 2), y, 0, t, sy, 2 * h - 2 * t);
    }
  };
  // a loft of a w x h rectangle through the points pts, its width along the horizontal side s, its height vertical
  function rail(key, pts, s, w, h) {
    const sec = (q) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => [q[0] + s[0] * i * w / 2, q[1] + j * h / 2, q[2] + s[2] * i * w / 2]);
    const secs = pts.map(sec), outs = [[0, -1, 0], s, [0, 1, 0], s.map((x) => -x)];
    for (let k = 0; k < pts.length - 1; k++)
      for (let f = 0; f < 4; f++)
        quad(key, secs[k][f], secs[k][(f + 1) % 4], secs[k + 1][(f + 1) % 4], secs[k + 1][f], outs[f]);
    const n = pts.length - 1;
    quad(key, ...secs[0], sub(pts[0], pts[1]));
    quad(key, ...secs[n], sub(pts[n], pts[n - 1]));
  }
  // a three.js geometry (already wound) baked into a soup at (x, y, z)
  const _m = new THREE.Matrix4();
  function geo(key, g, x = 0, y = 0, z = 0, rx = 0, ry = 0) {
    _m.makeRotationFromEuler(new THREE.Euler(rx, ry, 0)).setPosition(x, y, z);
    const p = (g.index ? g.toNonIndexed() : g).applyMatrix4(_m).attributes.position.array;
    for (let i = 0; i < p.length; i++) S(key).push(p[i]);
  }
  // the four faces of a square body: local (u along the face, y, o out of it) -> world, and its outward direction
  const FACES = [
    (h) => [(u, y, o) => [u, y, h + o], [0, 0, 1]],
    (h) => [(u, y, o) => [h + o, y, -u], [1, 0, 0]],
    (h) => [(u, y, o) => [-u, y, -h - o], [0, 0, -1]],
    (h) => [(u, y, o) => [-h - o, y, u], [-1, 0, 0]],
  ];
  const fquad = (key, F, out, u, y, o, w, h) =>
    quad(key, F(u - w / 2, y - h / 2, o), F(u + w / 2, y - h / 2, o), F(u + w / 2, y + h / 2, o), F(u - w / 2, y + h / 2, o), out);

  // ---------- roof solid ----------
  // Square eave of half-size R at y = e. D = inset of the flat top (R: a point), p = pitch, k = corner lift, t1 tile
  // fascia, t2 rafter band, ds = soffit inset where it meets the bracket band at y = yk.
  const US = [0, 0.4, 0.7, 0.88, 1];
  const UA = [...US.slice(1).map((u) => -u).reverse(), ...US]; // stations along a side, crowded toward the corners
  function roof({ R, e, D, p, k = 0.24, t1 = 0.16, t2 = 0.3, ds, yk, gap = 0.75 }) {
    const M = 3; // rows up the slope
    const lift = (u, v) => k * Math.pow(Math.abs(u), 3) * (1 - v) * (1 - v);
    const sides = [0, 1, 2, 3].map((i) => FACES[i](0)); // F(u, y, o): o = distance out from the axis plane
    const top = (F, u, d) => { const h = R - d; return F(u * h, e + p * d + lift(u, Math.min(1, d / D)), h); };
    const und = (F, u, d) => { const h = R - d, v = d / ds; return F(u * h, e - t1 - t2 + (yk - e + t1 + t2) * v + lift(u, v), h); };
    for (const [F, out] of sides) {
      const up = [0, 1, 0], down = [0, -1, 0];
      for (let j = 0; j < M; j++) {
        const d0 = (j / M) * D, d1 = ((j + 1) / M) * D;
        for (let i = 0; i < UA.length - 1; i++)
          quad("roof0", top(F, UA[i], d0), top(F, UA[i + 1], d0), top(F, UA[i + 1], d1), top(F, UA[i], d1), up);
      }
      for (let j = 0; j < 2; j++) {
        const d0 = (j / 2) * ds, d1 = ((j + 1) / 2) * ds;
        for (let i = 0; i < UA.length - 1; i++)
          quad("roof1", und(F, UA[i], d0), und(F, UA[i + 1], d0), und(F, UA[i + 1], d1), und(F, UA[i], d1), down);
      }
      for (let i = 0; i < UA.length - 1; i++) {
        const [a, b] = [top(F, UA[i], 0), top(F, UA[i + 1], 0)];
        const dn = (q, t) => [q[0], q[1] - t, q[2]];
        quad("roof0", a, b, dn(b, t1), dn(a, t1), out);
        quad("roof1", dn(a, t1), dn(b, t1), und(F, UA[i + 1], 0), und(F, UA[i], 0), out);
      }
      // flat caps (straight edges, the lift is 0 there): the top where the next balcony sits (zero area at an apex,
      // dropped) and the bottom inside the brackets
      tri("roof0", top(F, -1, D), top(F, 1, D), [0, e + p * D, 0], up);
      tri("roof1", und(F, -1, ds), und(F, 1, ds), [0, yk, 0], down);
      // tile courses: dark strips straight down the slope, cut at the hips, 2.5 cm above the tiles
      const hw = 0.035;
      for (let a = -R + gap * 0.8; a < R - gap * 0.5; a += gap) {
        const dMax = Math.min(R - Math.abs(a), D) - 0.06;
        if (dMax < 0.2) continue;
        const steps = Math.max(2, Math.ceil((dMax / D) * 3));
        const P = (aa, d) => { const h = R - d; return F(aa, e + p * d + lift(aa / h, Math.min(1, d / D)) + 0.025, h); };
        for (let s = 0; s < steps; s++) {
          const d0 = (s / steps) * dMax, d1 = ((s + 1) / steps) * dMax;
          quad("tileLine", P(a - hw, d0), P(a + hw, d0), P(a + hw, d1), P(a - hw, d1), up);
        }
      }
    }
    // hip caps: one inked loft per hip with shared sections, following the corner lift (two straight beams kinked
    // into a chevron where they met, seen end-on from the hero camera)
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
      const H = (v) => { const d = v * D, h = R - d; return [sx * h, e + p * d + lift(1, v) + 0.07, sz * h]; };
      const vs = (D === R ? [0, 0.15, 0.45, 0.97] : [0, 0.15, 0.45, 1]).map(H);
      rail("ridge", vs, [sz / Math.SQRT2, 0, -sx / Math.SQRT2], 0.2, 0.16);
      if (bells) { // wind bell under the corner, its top buried in the rafter band
        const q = H(0), by = q[1] - 0.07 - t1 - t2 + 0.06 - 0.25;
        geo("bronze", new THREE.CylinderGeometry(0.05, 0.16, 0.5, 6), q[0] * 0.98, by, q[2] * 0.98);
      }
    }
  }

  // ---------- storeys ----------
  const PODH = 1.1, PODR = 4.5;
  box("stone", 0, 0.15, 0, 2 * PODR + 0.5, 0.3, 2 * PODR + 0.5);
  box("stone", 0, PODH / 2, 0, 2 * PODR, PODH, 2 * PODR);
  { // front steps: one stair solid, a (z, y) profile extruded along x (shape u = -z, then rotateY(+90 deg), a proper
    // rotation, so earcut's winding survives)
    const rise = PODH / 5, run = 0.32, pts = [[PODR - 0.05, 0], [PODR + 5 * run, 0]];
    for (let i = 0; i < 5; i++) pts.push([PODR + (5 - i) * run, rise * (i + 1)], [PODR + (4 - i) * run, rise * (i + 1)]);
    pts.push([PODR - 0.05, PODH]);
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(-z, y))), { depth: 2.6, bevelEnabled: false });
    g.rotateY(Math.PI / 2);
    geo("stone", g, -1.3);
  }

  const taper = N === 3 ? 0.3 : 0.36;
  const half = (i) => 3.2 * (1 - (taper * i) / (N - 1));
  let y0 = PODH;
  let apex = 0;
  for (let i = 0; i < N; i++) {
    const f = i / (N - 1), w = half(i), last = i === N - 1;
    const hb = i === 0 ? 3.4 : 2.6, hk = 0.9;
    const o = 2.5 - 0.5 * f, R = w + o;
    // balcony and railing on storeys 2..N, on the flat top of the roof below
    let wy = y0;
    if (i > 0) {
      const W = w + 0.66; // covers the upper ends of the hip caps below
      box("vermilion", 0, y0 + 0.08, 0, 2 * W, 0.2, 2 * W);
      wy = y0 + 0.18;
      const RW = W - 0.05;
      ring("vermilion", RW + 0.035, 0.07, wy + 0.78, 0.07);
      ring("vermilion", RW + 0.03, 0.06, wy + 0.38, 0.06);
      const np = Math.max(2, Math.round((2 * RW) / 1.5));
      for (let s = 0; s < 4; s++) {
        const [F] = FACES[s](RW);
        for (let j = 0; j < np; j++) {
          const u = -RW + (2 * RW * j) / np;
          const q = F(u, wy + 0.41, -0.03);
          box("vermilion", q[0], q[1], q[2], 0.08, 0.82, 0.08);
        }
      }
    }
    const yt = wy + hb; // top of the walls, foot of the bracket band
    box("plaster", 0, (wy + yt) / 2, 0, 2 * w - 0.1, hb, 2 * w - 0.1);
    box("vermilion", 0, wy + 0.1, 0, 2 * w + 0.06, 0.2, 2 * w + 0.06); // sill, a band 3 cm proud of the plaster
    box("vermilion", 0, yt - 0.14, 0, 2 * w + 0.06, 0.28, 2 * w + 0.06); // head beam
    for (let s = 0; s < 4; s++) {
      const [F, out] = FACES[s](w - 0.05);
      for (const u of [-1, -1 / 3, 1 / 3]) {
        const q = F(u * (w - 0.07), (wy + yt) / 2, 0.04);
        box("vermilion", q[0], q[1], q[2], 0.24, hb, 0.24);
      }
      const bay = (2 * w) / 3 - 0.24;
      // door: two dark leaves either side of a vermilion meeting stile
      const dh = hb * 0.72, dy = wy + 0.2 + dh / 2;
      fquad("door", F, out, 0, dy, 0.02, bay - 0.24, dh);
      fquad("lattice", F, out, 0, dy, 0.03, 0.08, dh);
      // side windows: dark with vermilion bars
      const wh = Math.min(1.1, hb * 0.38), wy2 = wy + hb * 0.55;
      for (const u of [-(2 * w) / 3, (2 * w) / 3]) {
        const ww = bay - 0.5;
        fquad("door", F, out, u, wy2, 0.02, ww, wh);
        for (let b = 1; b <= 4; b++) fquad("lattice", F, out, u - ww / 2 + (b * ww) / 5, wy2, 0.03, 0.06, wh);
      }
    }
    // bracket band: three slabs stepping out
    const keys = ["vermilion", "plaster", "vermilion"];
    for (let b = 0; b < 3; b++) {
      const h = w + 0.3 * (b + 1);
      box(keys[b], 0, yt + 0.3 * b + 0.15, 0, 2 * h, 0.3, 2 * h);
    }
    const yk = yt + hk, e = yk;
    const pitch = last ? 0.36 : 0.42;
    const D = last ? R : R - (half(i + 1) + 0.6);
    roof({ R, e, D, p: pitch, ds: o - 0.95, yk });
    y0 = e + pitch * D;
    apex = y0;
  }

  // ---------- spire (sorin) ----------
  {
    const V = (r, y) => new THREE.Vector2(r, y);
    // dew basin as a box, then the bowl and lotus as one lathe (bottom to top, so the faces wind outward)
    box("bronze", 0, apex + 0.05, 0, 1.2, 0.6, 1.2);
    const a = apex + 0.35;
    const prof = [V(0, a), V(0.62, a), V(0.6, a + 0.18), V(0.5, a + 0.42), V(0.3, a + 0.56), V(0.32, a + 0.62),
      V(0.5, a + 0.78), V(0.52, a + 0.86), V(0.12, a + 0.9), V(0, a + 0.9)];
    geo("bronze", new THREE.LatheGeometry(prof, 10));
    const m0 = a + 0.85, m1 = a + 1.25 + 9 * 0.42 + 1.75;
    geo("bronze", new THREE.CylinderGeometry(0.1, 0.12, m1 - m0, 8), 0, (m0 + m1) / 2, 0);
    for (let r = 0; r < 9; r++) {
      const ry = a + 1.25 + r * 0.42, rr = 0.56 - r * 0.015;
      geo("bronze", new THREE.CylinderGeometry(rr, rr, 0.1, 8), 0, ry, 0);
    }
    // water flame: two crossed flat flames
    const fy = a + 1.25 + 9 * 0.42 + 0.15;
    const fl = new THREE.Shape();
    [[0, 0], [0.38, 0.25], [0.5, 0.65], [0.3, 1.0], [0.12, 1.15], [0, 1.25], [-0.12, 1.15], [-0.3, 1.0], [-0.5, 0.65], [-0.38, 0.25]]
      .forEach(([x, y], i) => (i ? fl.lineTo(x, y) : fl.moveTo(x, y)));
    for (const ry of [Math.PI / 4, -Math.PI / 4]) {
      const g = new THREE.ExtrudeGeometry(fl, { depth: 0.06, bevelEnabled: false });
      g.translate(0, 0, -0.03);
      geo("bronze", g, 0, fy, 0, 0, ry);
    }
    const jy = fy + 1.25;
    geo("bronze", new THREE.SphereGeometry(0.2, 8, 6), 0, jy + 0.12, 0);
    const jewel = [V(0, jy + 0.3), V(0.2, jy + 0.36), V(0.26, jy + 0.48), V(0.2, jy + 0.62), V(0.1, jy + 0.72), V(0, jy + 0.82)];
    geo("bronze", new THREE.LatheGeometry(jewel, 10));
    joints.tip = new THREE.Object3D();
    joints.tip.name = "tip";
    joints.tip.position.set(0, jy + 0.82, 0);
    body.add(joints.tip);
  }

  // ---------- meshes ----------
  const flat = (arr) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    return g;
  };
  const MAT = {
    vermilion: [c.vermilion, c.vermilionShade, 0.1, true],
    lattice: [c.vermilion, c.vermilionShade, 0.1, false],
    plaster: [c.plaster, c.plasterShade, 0.1, true],
    door: [c.door, c.doorShade, 0.5, false],
    tileLine: [c.tileLine, c.tileLine, 0.1, false],
    ridge: [c.tile, c.tileShade, 0.25, true],
    bronze: [c.bronze, c.bronzeShade, 0.35, true],
    stone: [c.stone, c.stoneShade, 0.1, true],
  };
  for (const [key, arr] of Object.entries(soups)) {
    if (key.startsWith("roof")) continue;
    const [base, shade, threshold, outline] = MAT[key];
    const mesh = kit.toon(flat(arr), base, shade, { threshold, outline });
    mesh.name = key;
    body.add(mesh);
  }
  // all roofs: one mesh, tile and rafter groups, one hull
  const r0 = soups.roof0, r1 = soups.roof1;
  const rg = flat(r0.concat(r1));
  rg.addGroup(0, r0.length / 3, 0);
  rg.addGroup(r0.length / 3, r1.length / 3, 1);
  const roofs = new THREE.Mesh(rg, [
    kit.cel(c.tile, c.tileShade, { threshold: 0.25 }),
    kit.cel(c.vermilion, c.vermilionShade, { threshold: 0.1 }),
  ]);
  roofs.name = "roofs";
  body.add(kit.outline(roofs));

  const natural = joints.tip.position.y;
  body.scale.setScalar((opts.height ?? natural) / natural);

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
