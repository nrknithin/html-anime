// art-room.js - the school art club room (bijutsu-shitsu) of slice-of-life anime, static, at real size: a set piece.
// Contract: harness/lab/README.md. Meters, +Y up. A cutaway: the floor and two walls only, the window wall at -X and
// the shelf wall at -Z, so the lab's front-left cameras (+X / +Z) look straight in. Floor on y = 0, centred on x = z = 0.
//
// Construction (boxes, capped prisms, lathed jars and a vase, an ellipsoid head, pleated cloth and flat plates, all
// triangle soups merged per material, so the whole room is a dozen meshes). Every triangle is wound away from a point
// inside its solid (box centre, prism axis, lathe axis, cloth's stand), never by hand.
//   SHELL      floor quad with plank seams; walls as boxes 12 cm thick, the window wall cut into a sill wall, lintel and
//              piers. Dark skirting bands draw the floor line; open wall tops get a dark 2 cm section cap.
//   WINDOW     (-X) one wide opening in three lights: dark wooden casing and mullions, warm sky glass (two plates back
//              to back), a deep sill; the noon sun lays three bright patches across the floor toward the easels.
//   STILL LIFE (the -X/-Z corner) a plaster bust on a tall pedestal (egg head with a nose, neck, tapered chest block),
//              and a low stand under a pleated drape with a vase and an apple on it.
//   EASELS     1-6 studio A-frame easels on an arc round the still life, turned so their canvases face the painters
//              (and the camera). The centre one carries a large canvas half painted with abstract blocks, a disc and a
//              stripe; the others carry blank canvases or a few colour blocks. No figures, no lettering.
//   TABLES     two big worktables (thick top over four square legs and stretchers) with splattered tops, jars of
//              brushes, paint tubes and palettes with paint; four stools.
//   SHELVES    (-Z) an open wooden shelf unit of supplies: boxes, jars, rolled paper, stacked canvases; two abstract
//              canvases hang on the wall beside it.
// Proportions (real size, base unit the storey H = 2.8 m): interior 5.2 (x) by 4.4 (z); window sill 0.85, head 2.3,
//   2.6 wide; pedestal 1.0, bust 0.42; stand 0.55; easel 1.85 tall, ledge 0.78; canvases 0.5 x 0.62, large 0.95 x 0.78;
//   tables 0.74 high, 1.8 x 0.9; shelf unit 1.9 x 2.0 x 0.38.
// Options: build(THREE, kit, colors, { height, easels = 4 }).
//   height   scales the whole room uniformly so the wall top is `height` (default 2.8 m), as the torii's.
//   easels   1-6, placed on the arc so the line from the camera corner to the bust stays open.
// Budget: ~4.8k triangles at the defaults (5.1k with 6 easels), 12 meshes.
// Ink in pixels: walls, floor, caps 3; furniture and props 2.
// Colours (noon), base / shade:
//   walls, pedestal               moon #fff6e4 / sky #f2d7ae, threshold 0.35 (the -X wall lit, the -Z wall in shade)
//   floor                         skin #f0c2ae flat, plank seams sky
//   wood (easels, frames, legs, shelves, stools, brush handles, vase)  iris #5c3d32 flat
//   white (canvases, plaster bust, table tops, jars, paper)          sclera #f6f3ee / sky #f2d7ae, threshold 0.3
//   tan (drape, palettes, boxes, rolled paper, stool seats)          sky #f2d7ae / skin #f0c2ae, threshold 0.45
//   red (apple, boxes, tubes)     accent #c4452d flat
//   glass                         sky #f2d7ae flat; sun patches practical #fffaf2 (threshold -0.25)
//   paint, splatter, skirting, caps (unlined decals)  accent, iris, sky, skin flat

export const meta = {
  name: "art-room",
  height: 2.8,
  script: "noon",
  colors: {
    wall: "#fff6e4", wallShade: "#f2d7ae",
    floor: "#f0c2ae", seam: "#f2d7ae",
    wood: "#5c3d32",
    white: "#f6f3ee", whiteShade: "#f2d7ae",
    tan: "#f2d7ae", tanShade: "#f0c2ae",
    red: "#c4452d",
    glass: "#f2d7ae", sun: "#fffaf2",
    paintRed: "#c4452d", paintBrown: "#5c3d32", paintTan: "#f2d7ae", paintPink: "#f0c2ae",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const NATURAL = 2.8;
  const { height = NATURAL } = opts;
  const easels = Math.max(1, Math.min(6, Math.floor(opts.easels ?? 4)));
  const root = new THREE.Group();
  root.name = "art-room";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / NATURAL);
  root.add(body);
  const joints = {};

  // ---------- triangle soups with normals, through a placement matrix ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  let M = new THREE.Matrix4();
  const v3 = new THREE.Vector3();
  const put = (s, q, nq) => {
    v3.set(...q).applyMatrix4(M);
    s.p.push(v3.x, v3.y, v3.z);
    v3.set(...nq).transformDirection(M);
    s.n.push(v3.x, v3.y, v3.z);
  };
  function tri(key, a, b, e, ref, na, nb, ne) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const flip = dot(n, sub(mul(add(add(a, b), e), 1 / 3), ref)) < 0;
    if (flip) n = mul(n, -1);
    n = nrm(n);
    const s = S(key);
    const [B, NB, E, NE] = flip ? [e, ne, b, nb] : [b, nb, e, ne];
    put(s, a, na ?? n), put(s, B, NB ?? n), put(s, E, NE ?? n);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  // a hexahedron from 8 corners (bottom 0-3, top 4-7, same order), flat-shaded
  function hexa(key, p) {
    const ref = mul(p.reduce((s, q) => add(s, q), [0, 0, 0]), 1 / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  const box = (key, x0, x1, y0, y1, z0, z1) =>
    hexa(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  // box by centre and size
  const cbox = (key, x, y, z, w, h, d) => box(key, x - w / 2, x + w / 2, y - h / 2, y + h / 2, z - d / 2, z + d / 2);
  // flat quad facing unit axis n, centred on ctr
  function plate(key, ctr, n, w, h) {
    const up = Math.abs(n[1]) > 0.5 ? [0, 0, 1] : [0, 1, 0];
    const r = nrm(cross(up, n)), u = cross(n, r);
    const P = (a, b) => add(ctr, add(mul(r, a * w / 2), mul(u, b * h / 2)));
    quad(key, P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), sub(ctr, n));
  }
  // flat ellipse facing n (a decal or a splash)
  function disc(key, ctr, n, rx, ry = rx, sides = 10) {
    const up = Math.abs(n[1]) > 0.5 ? [0, 0, 1] : [0, 1, 0];
    const r = nrm(cross(up, n)), u = cross(n, r);
    const P = (t) => add(ctr, add(mul(r, Math.cos(t) * rx), mul(u, Math.sin(t) * ry)));
    for (let j = 0; j < sides; j++) tri(key, ctr, P((j / sides) * Math.PI * 2), P(((j + 1) / sides) * Math.PI * 2), sub(ctr, n));
  }
  // a capped prism (4 sides by default) from a to b, radius r; ends pushed out by ext * r so joints overlap
  function rod(key, a, b, r, sides = 4, ext = 0.6) {
    const T = nrm(sub(b, a));
    a = sub(a, mul(T, r * ext)), b = add(b, mul(T, r * ext));
    const up = Math.abs(T[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = nrm(cross(up, T)), w = cross(T, u);
    const ring = (P) => Array.from({ length: sides }, (_, j) => {
      const t = (j / sides) * Math.PI * 2 + Math.PI / sides, d = add(mul(u, Math.cos(t)), mul(w, Math.sin(t)));
      return { q: add(P, mul(d, r)), n: d };
    });
    const A = ring(a), B = ring(b), mid = mul(add(a, b), 0.5);
    for (let j = 0; j < sides; j++) {
      const k = (j + 1) % sides;
      tri(key, A[j].q, A[k].q, B[k].q, mid, A[j].n, A[k].n, B[k].n);
      tri(key, A[j].q, B[k].q, B[j].q, mid, A[j].n, B[k].n, B[j].n);
    }
    for (const [R, s] of [[A, -1], [B, 1]])
      for (let j = 1; j < sides - 1; j++) tri(key, R[0].q, R[j].q, R[j + 1].q, mid, mul(T, s), mul(T, s), mul(T, s));
  }
  const cyl = (key, x, y0, y1, z, r, sides = 8) => rod(key, [x, y0, z], [x, y1, z], r, sides, 0);
  // a closed lathe about the vertical axis at (x, z): profile [[r, y], ...] bottom to top, flat caps
  function lathe(key, x, z, prof, sides = 10) {
    const P = (i, j) => { const t = (j / sides) * Math.PI * 2; return [x + Math.cos(t) * prof[i][0], prof[i][1], z + Math.sin(t) * prof[i][0]]; };
    for (let i = 0; i < prof.length - 1; i++) {
      const ref = [x, (prof[i][1] + prof[i + 1][1]) / 2, z];
      for (let j = 0; j < sides; j++) quad(key, P(i, j), P(i, j + 1), P(i + 1, j + 1), P(i + 1, j), ref);
    }
    for (const i of [0, prof.length - 1]) {
      const cy = prof[i][1], ref = [x, cy + (i ? -1 : 1), z];
      for (let j = 0; j < sides; j++) tri(key, [x, cy, z], P(i, j), P(i, j + 1), ref);
    }
  }
  // an ellipsoid with smooth normals
  function ellipsoid(key, ctr, rx, ry, rz, us = 10, vs = 7) {
    const P = (i, j) => {
      const ph = (i / vs) * Math.PI, th = (j / us) * Math.PI * 2;
      const d = [Math.sin(ph) * Math.cos(th), -Math.cos(ph), Math.sin(ph) * Math.sin(th)];
      return { q: add(ctr, [d[0] * rx, d[1] * ry, d[2] * rz]), n: nrm([d[0] / rx, d[1] / ry, d[2] / rz]) };
    };
    for (let i = 0; i < vs; i++)
      for (let j = 0; j < us; j++) {
        const a = P(i, j), b = P(i, j + 1), e = P(i + 1, j + 1), d = P(i + 1, j);
        if (i > 0) tri(key, a.q, b.q, e.q, ctr, a.n, b.n, e.n);
        if (i < vs - 1) tri(key, a.q, e.q, d.q, ctr, a.n, e.n, d.n);
      }
  }
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const place = (x, y, z, yaw, fn, pitch = 0) => {
    const saved = M;
    M = saved.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z))
      .multiply(new THREE.Matrix4().makeRotationY(yaw)).multiply(new THREE.Matrix4().makeRotationX(pitch));
    fn();
    M = saved;
  };
  const PAINTS = ["pRed", "pBrown", "pTan", "pPink"];

  // ---------- the shell ----------
  const W = 2.6, L = 2.2, H = 2.8, T = 0.12, CAP = 0.02;
  quad("floor", [-W, 0, -L], [W, 0, -L], [W, 0, L], [-W, 0, L], [0, -1, 0]);
  for (let i = 1; i < 12; i++) { // plank seams running away from the window
    const z = -L + (i * 2 * L) / 12;
    quad("seam", [-W, 0.0015, z - 0.006], [W, 0.0015, z - 0.006], [W, 0.0015, z + 0.006], [-W, 0.0015, z + 0.006], [0, -1, z]);
  }
  const wall = (x0, x1, y0, y1, z0, z1) => { box("wall", x0, x1, y0, y1 - CAP, z0, z1); box("cap", x0, x1, y1 - CAP, y1, z0, z1); };
  // back wall (-Z), full width, and its skirting
  wall(-W - T, W, 0, H, -L - T, -L);
  box("dark", -W, W, 0, 0.08, -L, -L + 0.012);
  // window wall (-X): opening z in [Z0, Z1], sill to head
  const SILL = 0.85, HEAD = 2.3, Z0 = -0.85, Z1 = 1.75, wx0 = -W - T, wx1 = -W, xm = (wx0 + wx1) / 2;
  // one closed solid with a hole (no box seams to ink on the wall face), then the cap along the top
  {
    const Hc = H - CAP, ym = Hc / 2;
    for (const [x, rx] of [[wx0, wx1], [wx1, wx0]]) { // both faces, ref on the far side
      const F = (z0, z1, y0, y1) => quad("wall", [x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0], [rx, (y0 + y1) / 2, (z0 + z1) / 2]);
      F(-L, L, 0, SILL), F(-L, L, HEAD, Hc), F(-L, Z0, SILL, HEAD), F(Z1, L, SILL, HEAD);
    }
    const Y = (y, z0, z1, ry) => quad("wall", [wx0, y, z0], [wx1, y, z0], [wx1, y, z1], [wx0, y, z1], [xm, ry, (z0 + z1) / 2]);
    const Z = (z, y0, y1, rz) => quad("wall", [wx0, y0, z], [wx1, y0, z], [wx1, y1, z], [wx0, y1, z], [xm, (y0 + y1) / 2, rz]);
    Y(Hc, -L, L, ym), Y(0, -L, L, ym), Z(-L, 0, Hc, 0), Z(L, 0, Hc, 0);
    Y(SILL, Z0, Z1, SILL - 0.1), Y(HEAD, Z0, Z1, HEAD + 0.1), Z(Z0, SILL, HEAD, Z0 - 0.1), Z(Z1, SILL, HEAD, Z1 + 0.1);
    box("cap", wx0, wx1, Hc, H, -L, L);
  }
  box("dark", -W, -W + 0.012, 0, 0.08, -L, L);
  // casing, mullions, transom, glass
  const FR = 0.05;
  box("wood", wx0, wx1 + 0.015, SILL, SILL + FR, Z0, Z1);
  box("wood", wx0, wx1 + 0.015, HEAD - FR, HEAD, Z0, Z1);
  box("wood", wx0, wx1 + 0.015, SILL, HEAD, Z0, Z0 + FR);
  box("wood", wx0, wx1 + 0.015, SILL, HEAD, Z1 - FR, Z1);
  const TR = 1.95; // transom bar
  box("wood", xm - 0.025, xm + 0.025, TR - 0.02, TR + 0.02, Z0, Z1);
  const lights = 3, LW = (Z1 - Z0 - 2 * FR) / lights;
  for (let k = 0; k < lights; k++) {
    const a = Z0 + FR + k * LW, b = a + LW;
    if (k > 0) box("wood", xm - 0.025, xm + 0.025, SILL, HEAD, a - 0.02, a + 0.02);
    for (const [y0, y1] of [[SILL + FR, TR - 0.02], [TR + 0.02, HEAD - FR]]) {
      for (const s of [1, -1]) plate("glass", [xm + s * 0.001, (y0 + y1) / 2, (a + b) / 2], [s, 0, 0], b - a + 0.01, y1 - y0 + 0.01);
    }
    // the sun through this light: a parallelogram on the floor, thrown toward +X and a little +Z
    const k1 = 0.62, k2 = 0.18;
    const proj = (y, z) => [-W + y * k1, 0.003, z + y * k2];
    const za = a + 0.03, zb = b - 0.03;
    quad("sun", proj(SILL + FR, za), proj(SILL + FR, zb), proj(TR - 0.02, zb), proj(TR - 0.02, za), [0, -1, 0]);
  }
  box("wood", wx1, wx1 + 0.2, SILL - 0.035, SILL, Z0 - 0.06, Z1 + 0.06); // sill board

  // ---------- still life ----------
  // plaster bust on a pedestal, near the window wall, turned toward the easels
  const BX = -2.05, BZ = -1.15;
  box("wall", BX - 0.19, BX + 0.19, 0, 1.09, BZ - 0.19, BZ + 0.19);
  box("wall", BX - 0.23, BX + 0.23, 1.09, 1.15, BZ - 0.23, BZ + 0.23);
  box("dark", BX - 0.205, BX + 0.205, 0, 0.06, BZ - 0.205, BZ + 0.205); // plinth band
  place(BX, 1.15, BZ, 0.9, () => {
    hexa("white", [[-0.17, 0, -0.09], [0.17, 0, -0.09], [0.17, 0, 0.09], [-0.17, 0, 0.09],
      [-0.1, 0.15, -0.065], [0.1, 0.15, -0.065], [0.1, 0.15, 0.075], [-0.1, 0.15, 0.075]]);
    cyl("white", 0, 0.12, 0.26, 0.005, 0.048, 8);
    ellipsoid("white", [0, 0.33, 0.012], 0.085, 0.112, 0.1, 12, 8);
    // nose: a small wedge on the face; brow ridge implied by the egg
    hexa("white", [[-0.014, 0.3, 0.1], [0.014, 0.3, 0.1], [0.014, 0.3, 0.13], [-0.014, 0.3, 0.13],
      [-0.01, 0.36, 0.098], [0.01, 0.36, 0.098], [0.008, 0.33, 0.113], [-0.008, 0.33, 0.113]]);
  }, -0.08);
  // low stand under a pleated drape, with a vase and an apple
  const SX = -1.15, SZ = -1.75, SW = 0.7, SD = 0.5, SH = 0.8;
  box("wood", SX - SW / 2 + 0.02, SX + SW / 2 - 0.02, 0, SH - 0.01, SZ - SD / 2 + 0.02, SZ + SD / 2 - 0.02);
  box("tan", SX - SW / 2, SX + SW / 2, SH - 0.01, SH + 0.01, SZ - SD / 2, SZ + SD / 2);
  // drape skirts on the +Z and +X sides (the ones the painters see), zigzag folds
  function skirt(a, b, out, folds, drop) {
    const n = folds * 2, ref = [SX, SH * 0.5, SZ];
    const top = (i) => add(a, mul(sub(b, a), i / n));
    for (let i = 0; i < n; i++) {
      const p0 = top(i), p1 = top(i + 1);
      const o0 = (i % 2) * 0.035 + 0.012, o1 = ((i + 1) % 2) * 0.035 + 0.012;
      const d0 = drop + 0.06 * hash(i * 7 + folds), d1 = drop + 0.06 * hash((i + 1) * 7 + folds);
      const q0 = add(p0, mul(out, o0)), q1 = add(p1, mul(out, o1));
      quad("drape", add(p0, mul(out, 0.012)), add(p1, mul(out, 0.012)),
        add(q1, [0, -d1, 0]), add(q0, [0, -d0, 0]), ref);
    }
  }
  skirt([SX - SW / 2, SH + 0.012, SZ + SD / 2], [SX + SW / 2, SH + 0.012, SZ + SD / 2], [0, 0, 1], 5, 0.6);
  skirt([SX + SW / 2, SH + 0.012, SZ + SD / 2], [SX + SW / 2, SH + 0.012, SZ - SD / 2], [1, 0, 0], 4, 0.55);
  box("drape", SX - SW / 2 - 0.012, SX + SW / 2 + 0.012, SH + 0.01, SH + 0.022, SZ - SD / 2, SZ + SD / 2 + 0.012);
  // a raised fold of cloth behind the props (draped over a hidden block)
  hexa("drape", [[SX - 0.3, SH + 0.02, SZ - 0.22], [SX + 0.1, SH + 0.02, SZ - 0.22], [SX + 0.18, SH + 0.02, SZ - 0.02], [SX - 0.3, SH + 0.02, SZ - 0.06],
    [SX - 0.3, SH + 0.22, SZ - 0.22], [SX - 0.02, SH + 0.2, SZ - 0.22], [SX + 0.02, SH + 0.05, SZ - 0.06], [SX - 0.3, SH + 0.12, SZ - 0.12]]);
  lathe("wood", SX - 0.12, SZ - 0.04, [[0.05, SH + 0.022], [0.075, SH + 0.08], [0.07, SH + 0.15], [0.035, SH + 0.22], [0.03, SH + 0.27], [0.045, SH + 0.3]], 10);
  ellipsoid("red", [SX + 0.13, SH + 0.022 + 0.045, SZ + 0.08], 0.05, 0.045, 0.05, 9, 6);
  rod("wood", [SX + 0.13, SH + 0.1, SZ + 0.08], [SX + 0.14, SH + 0.125, SZ + 0.08], 0.005, 4, 0);

  // ---------- easels ----------
  const CX = -1.75, CZ = -1.45; // the still life's centre, what the easels face
  // canvas: w x h, its painted face +Z, bottom centre at the origin; kind: 0 blank, 1 blocks, 2 the half-painted one
  function canvas(w, h, kind, seed) {
    box("white", -w / 2, w / 2, 0, h, -0.025, 0.0);
    box("wood", -w / 2 + 0.02, w / 2 - 0.02, 0.02, h - 0.02, -0.03, -0.025); // stretcher bars seen from behind
    const z = 0.003, F = [0, 0, 1];
    if (kind === 1) {
      for (let i = 0; i < 3; i++) {
        const bw = w * (0.25 + 0.3 * hash(seed + i)), bh = h * (0.2 + 0.3 * hash(seed + i + 9));
        const x = (hash(seed + i * 3 + 1) - 0.5) * (w - bw), y = bh / 2 + 0.04 + hash(seed + i * 5 + 2) * (h - bh - 0.08);
        plate(PAINTS[(seed + i) % 4], [x, y, z + i * 0.0015], F, bw, bh);
      }
    } else if (kind === 2) { // left half worked, right half still blank
      plate("pTan", [-w * 0.25, h * 0.5, z], F, w * 0.48, h * 0.9);
      plate("pRed", [-w * 0.32, h * 0.66, z + 0.0015], F, w * 0.26, h * 0.4);
      plate("pBrown", [-w * 0.1, h * 0.27, z + 0.0015], F, w * 0.22, h * 0.34);
      disc("pPink", [-w * 0.2, h * 0.42, z + 0.003], F, w * 0.11, w * 0.11, 12);
      disc("pRed", [-w * 0.06, h * 0.78, z + 0.003], F, w * 0.05, w * 0.05, 10);
      // a diagonal stripe running past the worked half
      const a = [-w * 0.46, h * 0.12, z + 0.0045], b = [w * 0.08, h * 0.86, z + 0.0045], t = nrm(sub(b, a)), q = mul([-t[1], t[0], 0], 0.02);
      quad("pBrown", add(a, q), sub(a, q), sub(b, q), add(b, q), [0, 0, -1]);
      // a few loose strokes on the blank side
      plate("pPink", [w * 0.12, h * 0.55, z], F, w * 0.08, h * 0.25);
    }
  }
  function easel(cw, ch, kind, seed) {
    const r = 0.018, LEDGE = 0.78;
    rod("wood", [-0.3, 0.012, 0.06], [-0.045, 1.78, -0.06], r, 4, 0);
    rod("wood", [0.3, 0.012, 0.06], [0.045, 1.78, -0.06], r, 4, 0);
    rod("wood", [0, 0.55, 0.0], [0, 1.85, -0.07], r * 1.1); // mast
    rod("wood", [0, 1.55, -0.07], [0, 0.012, -0.68], r, 4, 0); // back leg
    rod("wood", [-0.2, 0.36, 0.035], [0.2, 0.36, 0.035], r * 0.8); // cross bar
    rod("wood", [0, 0.36, 0.03], [0, 0.42, -0.36], r * 0.7); // brace to the back leg
    box("wood", -Math.max(0.36, cw / 2 - 0.05), Math.max(0.36, cw / 2 - 0.05), LEDGE - 0.03, LEDGE, -0.02, 0.07); // ledge
    box("wood", -0.05, 0.05, LEDGE + ch + 0.005, LEDGE + ch + 0.04, -0.07, 0.03); // top clamp
    place(0, LEDGE, 0.06, 0, () => canvas(cw, ch, kind, seed), -0.065);
  }
  // arc slots, angle from +X toward +Z (rad) and radius; the 45 deg line to the camera stays open
  const SLOTS = [[0.3, 2.0], [1.25, 2.05], [-0.05, 1.75], [1.62, 1.6], [0.15, 2.85], [1.45, 2.85]];
  for (let i = 0; i < easels; i++) {
    const [a, R] = SLOTS[i];
    const dx = Math.cos(a), dz = Math.sin(a);
    const x = CX + dx * R, z = CZ + dz * R;
    const big = i === 0, kind = big ? 2 : (i % 2 ? 1 : 0);
    place(x, 0, z, Math.atan2(dx, dz) + (hash(i + 4) - 0.5) * 0.2, () => easel(big ? 0.95 : 0.5, big ? 0.78 : 0.62, kind, i * 11 + 3));
  }

  // ---------- worktables ----------
  function table(w, d, seed) { // centred, w along x, d along z
    const TH = 0.74, tt = 0.05, lg = 0.06;
    box("white", -w / 2, w / 2, TH - tt, TH, -d / 2, d / 2);
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      box("wood", sx * (w / 2 - 0.08) - lg / 2, sx * (w / 2 - 0.08) + lg / 2, 0, TH - tt, sz * (d / 2 - 0.08) - lg / 2, sz * (d / 2 - 0.08) + lg / 2);
    for (const sz of [-1, 1]) box("wood", -w / 2 + 0.1, w / 2 - 0.1, 0.12, 0.17, sz * (d / 2 - 0.08) - 0.02, sz * (d / 2 - 0.08) + 0.02);
    box("wood", -w / 2 + 0.1, w / 2 - 0.1, TH - tt - 0.09, TH - tt, -d / 2 + 0.06, -d / 2 + 0.09); // apron
    // splatter on the top
    for (let i = 0; i < 26; i++) {
      const x = (hash(seed + i * 3) - 0.5) * (w - 0.06), z = (hash(seed + i * 7 + 1) - 0.5) * (d - 0.06);
      const r = 0.015 + 0.05 * hash(seed + i * 5 + 2) ** 2;
      disc(PAINTS[(i + seed) % 4], [x, TH + 0.0015 + (i % 4) * 0.0004, z], [0, 1, 0], r, r * (0.6 + 0.6 * hash(i + seed)), 7);
    }
    // drips down the front edge
    for (let i = 0; i < 4; i++) plate(PAINTS[i % 2 ? 0 : 1], [(hash(seed + i) - 0.5) * w * 0.8, TH - 0.04, d / 2 + 0.002], [0, 0, 1], 0.025, 0.05 + 0.04 * hash(i + 2));
    return TH;
  }
  function jar(x, z, y, seed) { // a glass jar of brushes
    lathe("white", x, z, [[0.045, y], [0.05, y + 0.01], [0.05, y + 0.12], [0.042, y + 0.135]], 8);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + seed, lean = 0.05 + 0.04 * hash(seed + i);
      const b = [x + Math.cos(a) * 0.02, y + 0.03, z + Math.sin(a) * 0.02];
      const top = [x + Math.cos(a) * lean * 2.2, y + 0.21 + 0.06 * hash(seed + i * 3), z + Math.sin(a) * lean * 2.2];
      rod("wood", b, top, 0.0055, 4, 0);
      const tip = add(top, mul(nrm(sub(top, b)), 0.03));
      rod(i % 3 ? "red" : "tan", top, tip, 0.008, 4, 0);
    }
  }
  function tube(x, y, z, yaw, key) {
    place(x, y, z, yaw, () => {
      hexa(key, [[-0.07, 0, -0.016], [0.06, 0, -0.016], [0.06, 0, 0.016], [-0.07, 0, 0.016],
        [-0.07, 0.006, -0.005], [0.06, 0.03, -0.016], [0.06, 0.03, 0.016], [-0.07, 0.006, 0.005]]);
      box("wood", 0.06, 0.085, 0.005, 0.025, -0.01, 0.01);
    });
  }
  function palette(x, y, z, yaw, seed) {
    place(x, y, z, yaw, () => {
      const sides = 14, pts = Array.from({ length: sides }, (_, j) => { const t = (j / sides) * Math.PI * 2; return [Math.cos(t) * 0.2, Math.sin(t) * 0.14]; });
      for (let j = 0; j < sides; j++) {
        const [ax, az] = pts[j], [bx, bz] = pts[(j + 1) % sides];
        tri("tan", [0, 0.012, 0], [ax, 0.012, az], [bx, 0.012, bz], [0, -1, 0]);
        quad("tan", [ax, 0, az], [bx, 0, bz], [bx, 0.012, bz], [ax, 0.012, az], [0, 0.006, 0]);
      }
      disc("pBrown", [-0.12, 0.0135, 0.02], [0, 1, 0], 0.03, 0.03, 8); // thumb hole read as a dark spot
      for (let i = 0; i < 5; i++) {
        const t = -0.6 + i * 0.45;
        disc(i % 2 ? "pRed" : PAINTS[(i + seed) % 4], [0.13 * Math.cos(t) + 0.02, 0.014, 0.1 * Math.sin(t)], [0, 1, 0], 0.024, 0.02, 7);
      }
    });
  }
  // table A along z near the shelves, table B across the front
  place(1.85, 0, 0.3, Math.PI / 2, () => {
    const TH = table(1.8, 0.9, 5);
    jar(-0.55, -0.15, TH, 1);
    jar(0.72, 0.22, TH, 2);
    palette(0.5, TH, -0.12, 0.3, 1);
    for (let i = 0; i < 4; i++) tube(-0.15 + i * 0.05, TH, -0.2 + 0.06 * i, 0.4 + i * 0.5, i % 2 ? "red" : "white");
  });
  place(0.3, 0, 1.6, 0, () => {
    const TH = table(1.8, 0.9, 17);
    jar(0.6, -0.2, TH, 3);
    palette(-0.35, TH, 0.1, -0.4, 2);
    for (let i = 0; i < 3; i++) tube(0.2 + i * 0.07, TH, 0.15 - i * 0.05, -0.3 + i * 0.7, i === 1 ? "red" : "tan");
    cbox("white", 0.05, TH + 0.006, -0.22, 0.42, 0.012, 0.3); // a sheet of paper
  });
  // stools: square seat on four splayed legs
  function stool(x, z, yaw) {
    place(x, 0, z, yaw, () => {
      box("tan", -0.16, 0.16, 0.44, 0.48, -0.16, 0.16);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) rod("wood", [sx * 0.17, 0.012, sz * 0.17], [sx * 0.12, 0.44, sz * 0.12], 0.016, 4, 0);
      rod("wood", [-0.15, 0.16, 0.15], [0.15, 0.16, 0.15], 0.012);
      rod("wood", [-0.15, 0.16, -0.15], [0.15, 0.16, -0.15], 0.012);
    });
  }
  stool(1.15, 0.6, 0.2);
  stool(1.2, -0.25, -0.1);
  stool(-0.1, 0.95, 0.3);
  stool(0.85, 0.95, 0.6);

  // ---------- shelves (-Z) ----------
  const X0 = 0.3, X1 = 2.3, D = 0.38, ZB = -L, ZF = -L + D, SHH = 1.9;
  for (const x of [X0, (X0 + X1) / 2, X1]) box("wood", x - 0.02, x + 0.02, 0, SHH, ZB, ZF);
  const LEVELS = [0.06, 0.5, 0.95, 1.4, 1.88];
  for (const y of LEVELS) box("wood", X0, X1, y - 0.025, y, ZB, ZF);
  box("dark", X0, X1, 0, 0.06, ZB, ZF - 0.03);
  // contents: per bay and shelf a run of items from a fixed hash
  let seed = 0;
  for (let b = 0; b < 2; b++) {
    const bx0 = (b ? (X0 + X1) / 2 : X0) + 0.04, bx1 = (b ? X1 : (X0 + X1) / 2) - 0.04;
    for (let s = 0; s < 4; s++) {
      const y = LEVELS[s], room = LEVELS[s + 1] - y - 0.05;
      let x = bx0;
      while (x < bx1 - 0.1) {
        const h = hash(seed++), kind = Math.floor(h * 5), zc = ZB + D / 2 + 0.02;
        if (kind === 0) { // box of supplies
          const w = 0.18 + 0.12 * hash(seed), hh = Math.min(room, 0.14 + 0.16 * hash(seed + 1));
          if (x + w > bx1) break;
          box(hash(seed + 2) > 0.5 ? "red" : "tan", x, x + w, y, y + hh, zc - 0.13, zc + 0.12);
          x += w + 0.02;
        } else if (kind === 1) { // jars
          for (let j = 0; j < 2 && x < bx1 - 0.08; j++) { lathe("white", x + 0.045, zc + 0.04, [[0.04, y], [0.045, y + 0.01], [0.045, y + 0.13], [0.03, y + 0.15]], 8); cyl("wood", x + 0.045, y + 0.15, y + 0.17, zc + 0.04, 0.032, 8); x += 0.1; }
        } else if (kind === 2) { // rolled paper lying along x
          for (let j = 0; j < 3; j++) rod(j === 1 ? "white" : "tan", [x, y + 0.035 + (j === 2 ? 0.06 : 0), zc - 0.08 + j * 0.07 - (j === 2 ? 0.035 : 0)], [Math.min(bx1, x + 0.36), y + 0.035 + (j === 2 ? 0.06 : 0), zc - 0.08 + j * 0.07 - (j === 2 ? 0.035 : 0)], 0.032, 6, 0);
          x += 0.38;
        } else if (kind === 3) { // standing canvases, edge on
          const n = 3 + Math.floor(hash(seed) * 3), hh = Math.min(room, 0.3);
          for (let j = 0; j < n; j++) box("white", x + j * 0.03, x + j * 0.03 + 0.022, y, y + hh - 0.02 * (j % 2), zc - 0.15, zc + 0.15);
          x += n * 0.03 + 0.04;
        } else { // a stack of sketchbooks
          const w = 0.26;
          if (x + w > bx1) break;
          for (let j = 0; j < 4; j++) box(j % 2 ? "white" : "tan", x + 0.01 * (j % 2), x + w - 0.01 * (j % 3), y + j * 0.025, y + (j + 1) * 0.025, zc - 0.15, zc + 0.1);
          x += w + 0.03;
        }
      }
    }
  }
  // two abstract canvases hung on the -Z wall, left of the shelves
  place(-0.45, 1.25, -L + 0.03, 0, () => canvas(0.5, 0.62, 1, 41));
  place(-0.95, 1.55, -L + 0.03, 0, () => canvas(0.36, 0.44, 1, 52));

  // ---------- meshes: one per material signature ----------
  const MAT = {
    wall: [c.wall, c.wallShade, 0.35, 3],
    cap: [c.wood, c.wood, 0.1, 3],
    floor: [c.floor, c.floor, 0.1, 3],
    seam: [c.seam, c.seam, 0.1, 0],
    dark: [c.wood, c.wood, 0.1, 0],
    wood: [c.wood, c.wood, 0.1, 2],
    white: [c.white, c.whiteShade, 0.3, 2],
    tan: [c.tan, c.tanShade, 0.45, 2],
    drape: [c.tan, c.tanShade, 0.45, 2],
    red: [c.red, c.red, 0.1, 2],
    glass: [c.glass, c.glass, 0.1, 0],
    sun: [c.sun, c.sun, -0.25, 0],
    pRed: [c.paintRed, c.paintRed, 0.1, 0],
    pBrown: [c.paintBrown, c.paintBrown, 0.1, 0],
    pTan: [c.paintTan, c.paintTan, 0.1, 0],
    pPink: [c.paintPink, c.paintPink, 0.1, 0],
  };
  const groups = new Map();
  for (const [key, soup] of Object.entries(soups)) {
    const sig = MAT[key].join("|");
    if (!groups.has(sig)) groups.set(sig, { key, m: MAT[key], p: [], n: [] });
    const g = groups.get(sig);
    for (let i = 0; i < soup.p.length; i++) g.p.push(soup.p[i]), g.n.push(soup.n[i]);
  }
  for (const { key, m, p, n } of groups.values()) {
    const [base, shade, threshold, px] = m;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    body.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
