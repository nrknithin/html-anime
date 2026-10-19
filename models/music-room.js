// music-room.js - the school music room (ongaku-shitsu) of light-music-club anime, static, at real size: a set piece.
// Contract: harness/lab/README.md. Meters, +Y up. A cutaway: the floor and two walls only, the window wall at -X and
// the blackboard wall at -Z, so the lab's front-left cameras (+X / +Z) look straight in. Floor on y = 0, centred on x = z = 0.
//
// Construction (boxes, capped prisms, lathed cymbals and drum shells, extruded instrument outlines and pleated curtains,
// all triangle soups merged per material, so the room is 13 meshes). Every triangle is wound away from a point inside
// its solid (box centre, prism axis, lathe axis, the outward edge normal of an extrusion), never by hand.
//   SHELL      floor quad with tile seams; walls 12 cm thick, the window wall a closed solid with one opening. Above a wood
//              chair rail (0.9 m) both walls are perforated acoustic board (yuukou board): a grid of dark holes in panels
//              split by pale seams, left clear behind the blackboard, portraits and window.
//   WINDOW     (-X) two tall lights with a wood casing and mullion, pale sky glass, a sill; green curtains gathered in
//              pleats at both jambs under a rail; the noon sun lays two patches on the floor.
//   BLACKBOARD (-Z) a green board in a wood frame with a chalk tray, three blank five-line staves in chalk.
//   PORTRAITS  a row of six composers above it as framed blank silhouettes (head, shoulders, a wig or a mane), no faces.
//   PIANO      an upright against the -Z wall: case, cheeks, keybed, white keys with the black-key pattern in octaves,
//              fallboard, music desk with a blank sheet, toes, three pedals, and its bench.
//   BAND       before the window: a drum kit (bass drum with a white front head, two rack toms, floor tom on legs, snare on
//              a stand, hi-hat, crash and ride on tripod stands, throne). On the open +X side a combo amp with an electric
//              guitar leaning on an A-frame stand. Near the camera a bass lying in its open case (red lining, lid laid back).
//   CHAIRS     five school chairs (wood seat and back on a pipe frame) on an arc facing the blackboard, each with a music
//              stand in front of it carrying a sheet of blank staves.
// Proportions (real size, base unit the storey H = 2.8 m): interior 5.2 (x) by 4.4 (z); window sill 0.9, head 2.3;
//   blackboard 2.4 x 1.15 at 0.85; portraits 0.36 x 0.46 at 2.38; upright 1.5 x 0.6 x 1.25, keys at 0.74;
//   bass drum 0.56 dia; amp 0.56 x 0.5; guitar 0.98 long; bass case 1.3 long; chairs seat 0.42; stands 1.05.
// Options: build(THREE, kit, colors, { height }).
//   height   scales the whole room uniformly so the wall top is `height` (default 2.8 m), as the torii's.
// Budget: ~7.7k triangles, 13 meshes (the acoustic-board holes are ~2.8k of them).
// Ink in pixels: walls, floor, caps 3; furniture and instruments 2; decals (holes, staves, heads, keys) none.
// Colours (meadow), base / shade:
//   walls                          moon #f7f3e1 / sky #d7ecef, threshold 0.35 (the -X wall lit, the -Z wall in shade)
//   floor                          skin #f0c2ae flat, tile seams and glass sky #d7ecef
//   board (blackboard, piano, amp, stands, case, throne)   hair #2c5131 flat
//   wood (frames, rail, chair seats, guitar neck, bass, cymbals)  practical #f2c94c flat
//   red (drum shells, guitar, case lining)                 accent #d9483b flat
//   white (keys, sheets, portrait mats, pickguards)        sclera #f6f3ee / sky #d7ecef, threshold 0.3
//   steel (chair frames, drum hardware, curtain rail, amp grille)  sky #d7ecef flat
//   curtains                       iris #3f8a47 / hair #2c5131, threshold 0.4
//   holes, silhouettes, black keys, staves on paper, skirting (unlined decals)  hair; chalk and drum heads sclera
//   sun patches                    moon, threshold -0.25

export const meta = {
  name: "music-room",
  height: 2.8,
  script: "meadow",
  colors: {
    wall: "#f7f3e1", wallShade: "#d7ecef",
    floor: "#f0c2ae", seam: "#d7ecef",
    board: "#2c5131",
    wood: "#f2c94c",
    red: "#d9483b",
    white: "#f6f3ee", whiteShade: "#d7ecef",
    steel: "#d7ecef",
    curtain: "#3f8a47", curtainShade: "#2c5131",
    glass: "#d7ecef", sun: "#f7f3e1",
    dark: "#2c5131", chalk: "#f6f3ee",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const NATURAL = 2.8;
  const { height = NATURAL } = opts;
  const root = new THREE.Group();
  root.name = "music-room";
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
  function hexa(key, p) { // 8 corners (bottom 0-3, top 4-7, same order), flat-shaded
    const ref = mul(p.reduce((s, q) => add(s, q), [0, 0, 0]), 1 / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  const box = (key, x0, x1, y0, y1, z0, z1) =>
    hexa(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  const cbox = (key, x, y, z, w, h, d) => box(key, x - w / 2, x + w / 2, y - h / 2, y + h / 2, z - d / 2, z + d / 2);
  function plate(key, ctr, n, w, h) { // flat quad facing unit axis n
    const up = Math.abs(n[1]) > 0.5 ? [0, 0, 1] : [0, 1, 0];
    const r = nrm(cross(up, n)), u = cross(n, r);
    const P = (a, b) => add(ctr, add(mul(r, a * w / 2), mul(u, b * h / 2)));
    quad(key, P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), sub(ctr, n));
  }
  function disc(key, ctr, n, rx, ry = rx, sides = 10, a0 = 0, a1 = Math.PI * 2) { // flat ellipse (or a sector)
    const up = Math.abs(n[1]) > 0.5 ? [0, 0, 1] : [0, 1, 0];
    const r = nrm(cross(up, n)), u = cross(n, r);
    const P = (t) => add(ctr, add(mul(r, Math.cos(t) * rx), mul(u, Math.sin(t) * ry)));
    for (let j = 0; j < sides; j++) tri(key, ctr, P(a0 + (j / sides) * (a1 - a0)), P(a0 + ((j + 1) / sides) * (a1 - a0)), sub(ctr, n));
  }
  // a capped prism from a to b, radius r; ends pushed out by ext * r so joints overlap
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
  // a drum: shell from a to b with a head decal on each end
  function drum(a, b, r, heads = "chalk") {
    rod("red", a, b, r, 14, 0);
    const T = nrm(sub(b, a));
    rod("steel", sub(a, mul(T, 0.004)), add(a, mul(T, 0.02)), r + 0.008, 14, 0); // hoops
    rod("steel", sub(b, mul(T, 0.02)), add(b, mul(T, 0.004)), r + 0.008, 14, 0);
    disc(heads, add(b, mul(T, 0.0055)), T, r - 0.004, r - 0.004, 14);
    disc(heads, sub(a, mul(T, 0.0055)), mul(T, -1), r - 0.004, r - 0.004, 14);
  }
  // a closed lathe about the local vertical axis: profile [[r, y], ...] bottom to top, flat caps
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
  // an extrusion of a star-shaped ccw outline [[x, y], ...] in the local XY plane, from z0 to z1
  function prism(key, pts, z0, z1, k = 1, cx = 0, cy = 0) {
    const q = pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
    const ctr = q.reduce((s, p) => [s[0] + p[0] / q.length, s[1] + p[1] / q.length], [0, 0]);
    const zm = (z0 + z1) / 2;
    for (let i = 0; i < q.length; i++) {
      const A = q[i], B = q[(i + 1) % q.length];
      tri(key, [ctr[0], ctr[1], z1], [A[0], A[1], z1], [B[0], B[1], z1], [ctr[0], ctr[1], zm]);
      tri(key, [ctr[0], ctr[1], z0], [A[0], A[1], z0], [B[0], B[1], z0], [ctr[0], ctr[1], zm]);
      const on = [B[1] - A[1], -(B[0] - A[0])]; // outward normal of a ccw edge
      const ref = [(A[0] + B[0]) / 2 - on[0], (A[1] + B[1]) / 2 - on[1], zm];
      quad(key, [A[0], A[1], z0], [B[0], B[1], z0], [B[0], B[1], z1], [A[0], A[1], z1], ref);
    }
  }
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const place = (x, y, z, yaw, fn, pitch = 0, roll = 0) => {
    const saved = M;
    M = saved.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z))
      .multiply(new THREE.Matrix4().makeRotationY(yaw)).multiply(new THREE.Matrix4().makeRotationX(pitch))
      .multiply(new THREE.Matrix4().makeRotationZ(roll));
    fn();
    M = saved;
  };
  // blank staves: n five-line staves on a face, local x across, y up, decal offset dz along +Z
  function staves(key, x0, x1, yTop, n, gap, spacing, lw, dz) {
    for (let s = 0; s < n; s++)
      for (let l = 0; l < 5; l++) {
        const y = yTop - s * spacing - l * gap;
        quad(key, [x0, y - lw / 2, dz], [x1, y - lw / 2, dz], [x1, y + lw / 2, dz], [x0, y + lw / 2, dz], [0, y, dz - 1]);
      }
  }

  // ---------- the shell ----------
  const W = 2.6, L = 2.2, H = 2.8, T = 0.12, CAP = 0.02, RAIL = 0.9, TOPB = 2.68;
  quad("floor", [-W, 0, -L], [W, 0, -L], [W, 0, L], [-W, 0, L], [0, -1, 0]);
  for (let i = 1; i < 10; i++) { // tile seams both ways
    const z = -L + (i * 2 * L) / 10, x = -W + (i * 2 * W) / 10;
    quad("seam", [-W, 0.0015, z - 0.005], [W, 0.0015, z - 0.005], [W, 0.0015, z + 0.005], [-W, 0.0015, z + 0.005], [0, -1, z]);
    quad("seam", [x - 0.005, 0.0015, -L], [x + 0.005, 0.0015, -L], [x + 0.005, 0.0015, L], [x - 0.005, 0.0015, L], [x, -1, 0]);
  }
  // back wall (-Z), full width, skirting and chair rail
  box("wall", -W - T, W, 0, H - CAP, -L - T, -L);
  box("cap", -W - T, W, H - CAP, H, -L - T, -L);
  box("dark", -W, W, 0, 0.08, -L, -L + 0.012);
  box("wood", -W, W, RAIL - 0.04, RAIL, -L, -L + 0.025);
  box("wood", -W, W, TOPB, TOPB + 0.03, -L, -L + 0.02);
  // window wall (-X): opening z in [Z0, Z1], sill to head, one closed solid with a hole
  const SILL = 0.9, HEAD = 2.3, Z0 = -0.45, Z1 = 1.65, wx0 = -W - T, wx1 = -W, xm = (wx0 + wx1) / 2;
  {
    const Hc = H - CAP, ym = Hc / 2;
    for (const [x, rx] of [[wx0, wx1], [wx1, wx0]]) {
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
  box("wood", -W, -W + 0.025, RAIL - 0.04, RAIL, -L, Z0);
  box("wood", -W, -W + 0.025, RAIL - 0.04, RAIL, Z1, L);
  box("wood", -W, -W + 0.02, TOPB, TOPB + 0.03, -L, L);
  // casing, mullion, glass, sill board
  const FR = 0.05, ZM = (Z0 + Z1) / 2;
  box("wood", wx0, wx1 + 0.015, SILL, SILL + FR, Z0, Z1);
  box("wood", wx0, wx1 + 0.015, HEAD - FR, HEAD, Z0, Z1);
  box("wood", wx0, wx1 + 0.015, SILL, HEAD, Z0, Z0 + FR);
  box("wood", wx0, wx1 + 0.015, SILL, HEAD, Z1 - FR, Z1);
  box("wood", xm - 0.025, xm + 0.025, SILL, HEAD, ZM - 0.025, ZM + 0.025);
  box("wood", xm - 0.025, xm + 0.025, 1.8 - 0.02, 1.8 + 0.02, Z0, Z1); // transom
  for (const [a, b] of [[Z0 + FR, ZM - 0.025], [ZM + 0.025, Z1 - FR]]) {
    for (const s of [1, -1]) plate("glass", [xm + s * 0.001, (SILL + HEAD) / 2, (a + b) / 2], [s, 0, 0], b - a + 0.01, HEAD - SILL - 2 * FR + 0.01);
    const k1 = 0.55, k2 = 0.15, proj = (y, z) => [-W + y * k1, 0.003, z + y * k2];
    const za = a + 0.04, zb = b - 0.04, ya = SILL + FR + 0.1, yb = 1.7;
    quad("sun", proj(ya, za), proj(ya, zb), proj(yb, zb), proj(yb, za), [0, -1, 0]);
  }
  box("wood", wx1, wx1 + 0.16, SILL - 0.035, SILL, Z0 - 0.06, Z1 + 0.06);
  // curtains: pleated bunches at both jambs, a rail over the window
  rod("steel", [-W + 0.09, 2.42, Z0 - 0.45], [-W + 0.09, 2.42, Z1 + 0.45], 0.014, 6, 0);
  for (const [za, zb] of [[Z0 - 0.42, Z0 + 0.12], [Z1 - 0.12, Z1 + 0.42]]) {
    const n = 8, xb = -W + 0.035, y0 = 0.62, y1 = 2.4;
    for (let i = 0; i < n; i++) {
      const p0 = za + ((zb - za) * i) / n, p1 = za + ((zb - za) * (i + 1)) / n;
      const d0 = 0.06 + (i % 2) * 0.06, d1 = 0.06 + ((i + 1) % 2) * 0.06;
      const h0 = y0 + 0.04 * hash(i + za * 10), h1 = y0 + 0.04 * hash(i + 1 + za * 10);
      hexa("curtain", [[xb, h0, p0], [xb + d0, h0, p0], [xb + d1, h1, p1], [xb, h1, p1], [xb, y1, p0], [xb + d0, y1, p0], [xb + d1, y1, p1], [xb, y1, p1]]);
    }
  }

  // ---------- blackboard and portraits (-Z) ----------
  const BX0 = -1.55, BX1 = 0.85, BY0 = 0.85, BY1 = 2.0, BZ = -L;
  box("board", BX0, BX1, BY0, BY1, BZ, BZ + 0.02);
  box("wood", BX0 - 0.05, BX1 + 0.05, BY1, BY1 + 0.05, BZ, BZ + 0.035);
  box("wood", BX0 - 0.05, BX0, BY0, BY1, BZ, BZ + 0.035);
  box("wood", BX1, BX1 + 0.05, BY0, BY1, BZ, BZ + 0.035);
  box("wood", BX0 - 0.05, BX1 + 0.05, BY0 - 0.05, BY0, BZ, BZ + 0.09); // chalk tray
  place(0, 0, BZ + 0.0215, 0, () => staves("chalk", BX0 + 0.1, BX1 - 0.1, BY1 - 0.15, 3, 0.042, 0.33, 0.011, 0));
  box("chalk", BX0 + 0.3, BX0 + 0.38, BY0 + 0.001, BY0 + 0.016, BZ + 0.05, BZ + 0.065); // chalk sticks
  box("chalk", BX0 + 0.5, BX0 + 0.56, BY0 + 0.001, BY0 + 0.016, BZ + 0.045, BZ + 0.06);
  const PORT = [-2.1, -1.25, -0.4, 0.45, 1.3, 2.15], PW = 0.36, PH = 0.46, PY = 2.36;
  PORT.forEach((x, i) => {
    box("wood", x - PW / 2, x + PW / 2, PY - PH / 2, PY + PH / 2, -L, -L + 0.03);
    box("white", x - PW / 2 + 0.04, x + PW / 2 - 0.04, PY - PH / 2 + 0.04, PY + PH / 2 - 0.04, -L + 0.03, -L + 0.034);
    const z = -L + 0.0355, F = [0, 0, 1], hy = PY + 0.05;
    disc("dark", [x, PY - PH / 2 + 0.04, z], F, 0.12, 0.13, 10, 0, Math.PI); // shoulders
    rod("dark", [x, PY - 0.07, z - 0.001], [x, hy - 0.02, z - 0.001], 0.03, 4, 0); // neck as a flat bar
    if (i % 3 === 0) { // a powdered wig: big lobes either side
      disc("dark", [x - 0.06, hy - 0.02, z], F, 0.045, 0.07, 8), disc("dark", [x + 0.06, hy - 0.02, z], F, 0.045, 0.07, 8);
    } else if (i % 3 === 1) { // a wild mane
      for (let k = 0; k < 5; k++) { const t = 0.3 + k * 0.6; disc("dark", [x + Math.cos(t) * 0.055, hy + 0.01 + Math.sin(t) * 0.05, z], F, 0.035, 0.035, 7); }
    }
    disc("dark", [x, hy, z], F, 0.065, 0.08, 12);
  });

  // ---------- perforated acoustic board on both walls ----------
  const SP = 0.085, HOLE = 0.017;
  const backClear = [[BX0 - 0.1, BX1 + 0.1, BY0 - 0.1, BY1 + 0.1], [0.95, 2.6, 0, 1.33]];
  for (const x of PORT) backClear.push([x - PW / 2 - 0.04, x + PW / 2 + 0.04, PY - PH / 2 - 0.04, PY + PH / 2 + 0.04]);
  const sideClear = [[Z0 - 0.5, Z1 + 0.5, SILL - 0.2, HEAD + 0.2]];
  const hit = (list, u, y) => list.some(([a, b, c0, d]) => u > a && u < b && y > c0 && y < d);
  const PANEL = 0.9;
  for (let p = 0; p < 6; p++) { // back wall panels along x
    const u0 = -W + p * PANEL, u1 = Math.min(W, u0 + PANEL);
    if (p) quad("seam", [u0 - 0.006, RAIL, -L + 0.002], [u0 + 0.006, RAIL, -L + 0.002], [u0 + 0.006, TOPB, -L + 0.002], [u0 - 0.006, TOPB, -L + 0.002], [u0, 1.5, -L - 1]);
    for (let u = u0 + SP * 0.75; u < u1 - SP * 0.4; u += SP)
      for (let y = RAIL + SP * 0.75; y < TOPB - SP * 0.4; y += SP)
        if (!hit(backClear, u, y)) plate("dark", [u, y, -L + 0.0025], [0, 0, 1], HOLE, HOLE);
  }
  for (let p = 0; p < 5; p++) { // window wall panels along z
    const u0 = -L + p * PANEL, u1 = Math.min(L, u0 + PANEL);
    if (p) quad("seam", [-W + 0.002, RAIL, u0 - 0.006], [-W + 0.002, RAIL, u0 + 0.006], [-W + 0.002, TOPB, u0 + 0.006], [-W + 0.002, TOPB, u0 - 0.006], [-W - 1, 1.5, u0]);
    for (let u = u0 + SP * 0.75; u < u1 - SP * 0.4; u += SP)
      for (let y = RAIL + SP * 0.75; y < TOPB - SP * 0.4; y += SP)
        if (!hit(sideClear, u, y)) plate("dark", [-W + 0.0025, y, u], [1, 0, 0], HOLE, HOLE);
  }

  // ---------- upright piano (-Z, right of the board) ----------
  {
    const X0 = 1.0, X1 = 2.5, ZB = -L, ZF = -L + 0.58, KB = 0.7, KZ = -L + 0.8;
    box("board", X0 + 0.05, X1 - 0.05, 0.06, KB - 0.04, ZB, ZF - 0.04); // lower case (kneeboard)
    box("board", X0, X1, KB + 0.06, 1.26, ZB, ZF - 0.12); // upper case
    box("board", X0 - 0.03, X1 + 0.03, 1.26, 1.3, ZB, ZF - 0.09); // top lid
    for (const x of [X0, X1 - 0.055]) { // cheeks and toes
      box("board", x, x + 0.055, 0.0, 1.26, ZB, ZF - 0.12);
      box("board", x, x + 0.055, KB - 0.06, KB + 0.13, ZB, KZ);
      box("board", x, x + 0.055, 0, 0.07, ZB, KZ - 0.04);
    }
    box("board", X0 + 0.05, X1 - 0.05, KB - 0.04, KB, ZB, KZ); // keybed
    box("board", X0 + 0.05, X1 - 0.05, KB, KB + 0.03, KZ - 0.025, KZ); // key slip
    // keys: 52 whites in the slot, blacks in the 2-3 pattern
    const k0 = X0 + 0.06, k1 = X1 - 0.06, nW = 52, kw = (k1 - k0) / nW;
    box("white", k0, k1, KB, KB + 0.025, KZ - 0.22, KZ - 0.025);
    for (let i = 1; i < nW; i++) // gaps between whites
      quad("dark", [k0 + i * kw - 0.0012, KB + 0.0255, KZ - 0.22], [k0 + i * kw + 0.0012, KB + 0.0255, KZ - 0.22], [k0 + i * kw + 0.0012, KB + 0.0255, KZ - 0.025], [k0 + i * kw - 0.0012, KB + 0.0255, KZ - 0.025], [0, 0, 0]);
    for (let i = 0; i < nW - 1; i++) {
      const n = (i + 5) % 7; // the keyboard starts on A: A B | C D E F G
      if (n === 2 || n === 6) continue; // no black after E or B
      const x = k0 + (i + 1) * kw;
      box("dark", x - kw * 0.3, x + kw * 0.3, KB + 0.025, KB + 0.045, KZ - 0.22, KZ - 0.11);
    }
    // fallboard (open, standing back) and music desk with a sheet
    hexa("board", [[X0 + 0.06, KB + 0.03, KZ - 0.24], [X1 - 0.06, KB + 0.03, KZ - 0.24], [X1 - 0.06, KB + 0.03, KZ - 0.21], [X0 + 0.06, KB + 0.03, KZ - 0.21],
      [X0 + 0.06, KB + 0.2, KZ - 0.28], [X1 - 0.06, KB + 0.2, KZ - 0.28], [X1 - 0.06, KB + 0.2, KZ - 0.25], [X0 + 0.06, KB + 0.2, KZ - 0.25]]);
    box("board", X0 + 0.25, X1 - 0.25, KB + 0.2, KB + 0.23, ZF - 0.14, ZF - 0.07); // desk ledge
    place((X0 + X1) / 2 - 0.05, KB + 0.23, ZF - 0.122, 0, () => {
      box("white", -0.21, 0.21, 0, 0.3, -0.004, 0);
      staves("dark", -0.18, 0.18, 0.26, 6, 0.006, 0.042, 0.0022, 0.0012);
    }, -0.15);
    // pedals
    for (let k = -1; k <= 1; k++) box("wood", (X0 + X1) / 2 + k * 0.09 - 0.018, (X0 + X1) / 2 + k * 0.09 + 0.018, 0.06, 0.08, ZF - 0.06, ZF + 0.07);
    // bench
    const bx = (X0 + X1) / 2, bz = -L + 1.18;
    box("board", bx - 0.38, bx + 0.38, 0.46, 0.52, bz - 0.18, bz + 0.18);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box("board", bx + sx * 0.33 - 0.025, bx + sx * 0.33 + 0.025, 0, 0.46, bz + sz * 0.13 - 0.025, bz + sz * 0.13 + 0.025);
  }

  // ---------- drum kit (before the window; local +Z toward the room) ----------
  function cymbal(x, y, z, r, tilt) {
    place(x, y, z, 0, () => lathe("wood", 0, 0, [[0.015, -0.006], [r, -0.022], [r, -0.016], [0.03, 0.006], [0.015, 0.012]], 14), tilt);
  }
  function tripod(x, z, top, h0 = 0.012) {
    rod("steel", [x, h0, z], [x, top, z], 0.009, 5, 0);
    for (let k = 0; k < 3; k++) {
      const t = (k / 3) * Math.PI * 2 + 0.4;
      rod("steel", [x + Math.cos(t) * 0.26, h0, z + Math.sin(t) * 0.26], [x, 0.3, z], 0.007, 4, 0);
    }
  }
  place(-1.6, 0, 0.7, 0.95, () => {
    drum([0, 0.29, -0.2], [0, 0.29, 0.2], 0.28); // bass drum, front head to the room
    disc("red", [0, 0.26, 0.2 + 0.0075], [0, 0, 1], 0.07, 0.07, 10); // port on the head
    for (const sx of [-1, 1]) rod("steel", [sx * 0.2, 0.16, 0.12], [sx * 0.32, 0.012, 0.2], 0.009, 4, 0); // spurs
    rod("steel", [0, 0.55, -0.02], [0, 0.66, -0.06], 0.012, 5, 0); // tom mount
    for (const sx of [-1, 1]) place(sx * 0.15, 0.73, -0.06, sx * -0.12, () => drum([0, 0, 0.09], [0, 0, -0.09], 0.12), -1.15);
    // floor tom on legs
    drum([0.52, 0.32, -0.42], [0.52, 0.6, -0.42], 0.19);
    for (let k = 0; k < 3; k++) {
      const t = (k / 3) * Math.PI * 2 + 0.5, ox = 0.52 + Math.cos(t) * 0.2, oz = -0.42 + Math.sin(t) * 0.2;
      rod("steel", [ox, 0.012, oz], [ox, 0.5, oz], 0.008, 4, 0);
    }
    // snare on its stand
    tripod(-0.4, -0.42, 0.55);
    place(-0.4, 0.62, -0.42, 0, () => drum([0, -0.07, 0], [0, 0.07, 0], 0.18), -0.12);
    // hi-hat, crash, ride
    tripod(-0.72, -0.2, 0.95);
    cymbal(-0.72, 0.9, -0.2, 0.18, 0);
    cymbal(-0.72, 0.94, -0.2, 0.18, 0);
    tripod(-0.42, 0.12, 1.28);
    cymbal(-0.42, 1.33, 0.12, 0.23, 0.35);
    tripod(0.72, 0.0, 1.12);
    cymbal(0.72, 1.17, 0.0, 0.26, 0.25);
    // throne
    lathe("board", 0, -0.82, [[0.18, 0.44], [0.19, 0.48], [0.18, 0.52]], 12);
    tripod(0, -0.82, 0.45, 0.012);
  });

  // ---------- amp and guitar on the open +X side, facing the room front ----------
  place(2.2, 0, 0.05, 0.2, () => {
    box("board", -0.28, 0.28, 0.04, 0.54, -0.15, 0.15);
    for (const sx of [-1, 1]) box("board", sx * 0.2 - 0.03, sx * 0.2 + 0.03, 0, 0.04, -0.12, 0.12); // feet
    plate("steel", [0, 0.24, 0.152], [0, 0, 1], 0.48, 0.34);
    box("wood", -0.25, 0.25, 0.43, 0.5, 0.14, 0.152); // control strip
    for (let k = 0; k < 6; k++) disc("dark", [-0.2 + k * 0.08, 0.465, 0.1535], [0, 0, 1], 0.012, 0.012, 6);
    rod("board", [-0.1, 0.54, 0], [0.1, 0.54, 0], 0.012, 4, 0.5); // handle
  });
  // body outline, ccw, local x across, y toward the neck (a double cutaway)
  const BODY = [[0, -0.24], [0.13, -0.21], [0.17, -0.12], [0.15, -0.02], [0.12, 0.04], [0.15, 0.12], [0.16, 0.2], [0.12, 0.21],
    [0.06, 0.1], [0.03, 0.1], [-0.03, 0.1], [-0.06, 0.12], [-0.11, 0.17], [-0.14, 0.15], [-0.13, 0.06], [-0.15, -0.02],
    [-0.17, -0.12], [-0.13, -0.21]];
  const GUARD = [[0.02, -0.08], [0.1, -0.06], [0.11, 0.02], [0.07, 0.08], [-0.05, 0.1], [-0.09, 0.08], [-0.08, -0.02], [-0.02, -0.12]];
  function guitar(key, s, neck, heads) { // body face +Z, neck +Y, body centre at the origin
    place(0, 0, 0, 0, () => {
      M.multiply(new THREE.Matrix4().makeScale(s, s, 1));
      prism(key, BODY, -0.022, 0.022);
      prism("white", GUARD, 0.022, 0.026);
      for (const y of [-0.06, 0.02]) box("dark", -0.035, 0.035, y - 0.009, y + 0.009, 0.026, 0.029); // pickups
      box("dark", -0.04, 0.04, -0.15, -0.135, 0.022, 0.03); // bridge
    });
    box("wood", -0.022, 0.022, 0.08 * s, 0.08 * s + neck, -0.008, 0.02); // neck
    const hy = 0.08 * s + neck;
    hexa("wood", [[-0.03, hy, -0.008], [0.03, hy, -0.008], [0.03, hy, 0.012], [-0.03, hy, 0.012],
      [-0.035, hy + 0.17, -0.008], [0.04, hy + 0.17, -0.008], [0.04, hy + 0.17, 0.012], [-0.035, hy + 0.17, 0.012]]);
    for (let k = 0; k < heads; k++) disc("dark", [0.032, hy + 0.03 + k * 0.035, 0.0125], [0, 0, 1], 0.009, 0.009, 6);
  }
  place(2.17, 0, 0.72, 0.1, () => {
    // A-frame stand
    for (const sx of [-1, 1]) rod("board", [sx * 0.18, 0.012, 0.1], [sx * 0.05, 0.62, -0.12], 0.011, 4, 0);
    rod("board", [0, 0.62, -0.12], [0, 0.012, -0.32], 0.011, 4, 0);
    rod("board", [-0.19, 0.12, 0.12], [0.19, 0.12, 0.12], 0.014, 4, 0.5); // cradle
    place(0, 0.38, 0.06, 0, () => guitar("red", 1, 0.52, 3), -0.22);
  });

  // ---------- bass in its open case (front centre, lid laid back on the floor) ----------
  const CASE = [[0, -0.36], [0.19, -0.33], [0.25, -0.2], [0.25, 0.05], [0.2, 0.2], [0.11, 0.3], [0.1, 0.92], [0.08, 0.97],
    [-0.08, 0.97], [-0.1, 0.92], [-0.11, 0.3], [-0.2, 0.2], [-0.25, 0.05], [-0.25, -0.2], [-0.19, -0.33]];
  place(0.45, 0, 1.45, -0.75, () => {
    prism("board", CASE, 0, 0.1);
    prism("red", CASE, 0.03, 0.102, 0.9, 0, 0.3);
    place(0, -0.03, 0.12, 0, () => guitar("wood", 1.12, 0.66, 4));
    // the lid, hinged on the -x edge, standing open past upright
    const hinge = -0.25;
    const saved = M;
    M = saved.clone().multiply(new THREE.Matrix4().makeTranslation(hinge, 0, 0.1))
      .multiply(new THREE.Matrix4().makeRotationY(-Math.PI - 0.075)).multiply(new THREE.Matrix4().makeTranslation(-hinge, 0, -0.1));
    prism("board", CASE, 0.1, 0.16);
    prism("red", CASE, 0.098, 0.13, 0.9, 0, 0.3);
    M = saved;
    for (const y of [-0.05, 0.5]) box("steel", 0.24, 0.27, y, y + 0.06, 0.06, 0.09); // latches
  }, -Math.PI / 2);

  // ---------- chairs on an arc, each with a music stand ----------
  function chair() { // seat centre at the origin, facing +Z
    box("wood", -0.2, 0.2, 0.42, 0.44, -0.19, 0.19);
    hexa("wood", [[-0.19, 0.6, -0.2], [0.19, 0.6, -0.2], [0.19, 0.6, -0.18], [-0.19, 0.6, -0.18],
      [-0.19, 0.82, -0.23], [0.19, 0.82, -0.23], [0.19, 0.82, -0.21], [-0.19, 0.82, -0.21]]);
    for (const sx of [-1, 1]) {
      rod("steel", [sx * 0.18, 0.012, 0.17], [sx * 0.18, 0.42, 0.16], 0.011, 5, 0);
      rod("steel", [sx * 0.18, 0.012, -0.19], [sx * 0.18, 0.42, -0.18], 0.011, 5, 0);
      rod("steel", [sx * 0.18, 0.42, -0.18], [sx * 0.18, 0.84, -0.225], 0.011, 5, 0);
      rod("steel", [sx * 0.18, 0.012, 0.17], [sx * 0.18, 0.012, -0.19], 0.011, 5, 0); // runner
    }
    rod("steel", [-0.18, 0.4, 0.16], [0.18, 0.4, 0.16], 0.009, 4, 0);
  }
  function stand() { // desk faces +Z (toward its player)
    for (let k = 0; k < 3; k++) {
      const t = (k / 3) * Math.PI * 2 + Math.PI / 2;
      rod("board", [Math.cos(t) * 0.24, 0.012, Math.sin(t) * 0.24], [0, 0.32, 0], 0.008, 4, 0);
    }
    rod("board", [0, 0.012, 0], [0, 0.98, 0], 0.01, 5, 0);
    place(0, 0.94, 0, 0, () => {
      box("board", -0.25, 0.25, 0, 0.34, -0.012, 0);
      box("board", -0.25, 0.25, -0.012, 0.012, 0, 0.04); // ledge
      box("white", -0.2, 0.2, 0.012, 0.3, 0, 0.003);
      staves("dark", -0.17, 0.17, 0.27, 6, 0.0065, 0.042, 0.0024, 0.0042);
    }, -0.35);
  }
  const CX = -0.1, CZ = -1.5, R = 1.8;
  for (let i = 0; i < 5; i++) {
    const a = ((38 + i * 26) * Math.PI) / 180;
    const x = CX + Math.cos(a) * R, z = CZ + Math.sin(a) * R;
    const yaw = Math.atan2(CX - x, CZ - z);
    place(x, 0, z, yaw, () => {
      chair();
      place(0, 0, 0.6, Math.PI, stand);
    });
  }

  // ---------- meshes: one per material signature ----------
  const MAT = {
    wall: [c.wall, c.wallShade, 0.35, 3],
    cap: [c.board, c.board, 0.1, 3],
    floor: [c.floor, c.floor, 0.1, 3],
    seam: [c.seam, c.seam, 0.1, 0],
    glass: [c.glass, c.glass, 0.1, 0],
    dark: [c.dark, c.dark, 0.1, 0],
    chalk: [c.chalk, c.chalk, 0.1, 0],
    sun: [c.sun, c.sun, -0.25, 0],
    board: [c.board, c.board, 0.1, 2],
    wood: [c.wood, c.wood, 0.1, 2],
    red: [c.red, c.red, 0.1, 2],
    white: [c.white, c.whiteShade, 0.3, 2],
    steel: [c.steel, c.steel, 0.1, 2],
    curtain: [c.curtain, c.curtainShade, 0.4, 2],
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
