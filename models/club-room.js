// club-room.js - the after-school culture-club room of slice-of-life anime, static, at real size: a set piece.
// Contract: harness/lab/README.md. Meters, +Y up, a cutaway: only the -X wall (the window) and the -Z wall (the
// whiteboard and the shelves) stand, so the lab's front-left cameras (+X / +Z) look straight in. Floor on y = 0,
// centred on x = z = 0. Where classroom.js is the tidy room with its desk grid, this is the cosy, messy one.
//
// Construction: boxes, capped n-sided rods, closed lathes (cups, kettle, teapot, hat), pleated curtain lofts and
// flat plates, all triangle soups merged per material, so the whole room is about a dozen meshes. Every triangle is
// wound away from a point inside its solid (box centre, rod or lathe axis, loft column), never by hand.
//   SHELL     floor quad with darker plank seams; two walls 12 cm thick, the -X one cut into sill wall, lintel and
//             piers round the window; a dark skirting band and a dark section cap on every cut wall top.
//   WINDOW    (-X wall) a wooden casing, two sashes overlapping at the middle, glass as two unlined plates back to
//             back; a sill board, a curtain rail, one curtain half drawn across the glass and one bunched at the far side.
//   COMFORT   (-X wall) an old sofa under the window, facing +X (plinth, two seat cushions, a back, two arms,
//             stubby legs, a cushion), a striped blanket thrown over its back and spilling onto the near cushion;
//             beside it, toward the open side, a small cabinet with a tray, a kettle, a teapot and two cups; a rug
//             with a red border and a floor cushion in front; a blank poster (no lettering) past the window.
//   WALL      (-Z) a whiteboard (steel frame, pale face, pen tray with two pens) with abstract scribbles (loops, a
//             zigzag, an arrow, boxes; thin strips 2 mm proud), magnets, and a calendar grid sheet stuck on its right.
//   STORAGE   (-Z, right) two steel shelf units, five boards each, crammed from a fixed hash: binders, file boxes
//             and stacks of board games, every spine blank, a box shoved on top of each; a cardboard box on the floor
//             overflowing with props (a wooden sword, a top hat, a folded cloth, a ball); two boxes stacked in the far
//             corner and a stack of comics by the sofa end.
//   CENTRE    two long tables pushed together (pale tops, a steel apron, tube legs), five folding chairs round them,
//             pulled out and turned (fixed numbers, no randomness); on the tables an open laptop (blank dark screen),
//             two closed laptops, four teacups, three snack bags, loose sheets.
// Proportions (real size, base unit the storey H = 2.7 m = meta.height): interior 4.2 (x) by 4.8 (z); window sill
//   0.85, head 2.1, 2.0 wide; whiteboard 1.75 x 1.1 from 0.85; shelves 1.8 tall, 0.38 deep, 0.72 wide each; tables
//   0.70 high, together 1.8 x 1.2; chair seat 0.44, back to 0.82; sofa seat 0.44, back 0.8, 1.7 long; cabinet 0.8.
// Options: build(THREE, kit, colors, { height }). height scales the whole room uniformly so the wall top is
//   `height` (default 2.7 m), as the torii's.
// Budget: ~4.9k triangles, 13 meshes.
// Ink in pixels: walls, floor edge and caps 3; wood, steel, props and cloth 2 (a room is seen small).
// Colours (noon, the warm wood-brown script), base / shade:
//   walls                  moon #fff6e4 / sky #f2d7ae, threshold 0.35 (the -X wall lit, the -Z wall falls to sky)
//   floor                  iris #5c3d32 / skin #f0c2ae (old boards; it faces the light, so it reads iris), plank
//                          seams hair flat; scribbles and calendar grid iris #5c3d32 flat
//   dark wood (window frame, sill, tray, sofa legs, sword, some binders and games)  iris #5c3d32 flat
//   tan (table tops, cardboard, cabinet, rug, file boxes, games, poster)  sky #f2d7ae / skin #f0c2ae
//   steel (shelves, chairs, table legs, laptops, cups, teapot, board frame, rail, blanket)  sclera #f6f3ee / sky
//   red (sofa, kettle, binders, games, snack bags, hat, rug border, floor cushion, magnets)  accent #c4452d / iris
//   paper (board face, sheets)  sclera #f6f3ee flat;  glass and calendar sheet sky #f2d7ae flat (the calendar is
//                          unlined: a 3 mm sheet's hull smears over the board); calendar header accent flat
//   curtain                moon #fff6e4 / skin #f0c2ae, threshold 0.45
//   lines (skirting, caps, laptop screen, hinge, pens, finger holes, dark scribbles)  hair #241c16 flat

export const meta = {
  name: "club-room",
  height: 2.7,
  script: "noon",
  colors: {
    wall: "#fff6e4", wallShade: "#f2d7ae",
    floor: "#5c3d32", floorShade: "#f0c2ae", seam: "#5c3d32",
    wood: "#5c3d32",
    tan: "#f2d7ae", tanShade: "#f0c2ae",
    steel: "#f6f3ee", steelShade: "#f2d7ae",
    red: "#c4452d", redShade: "#5c3d32",
    paper: "#f6f3ee", glass: "#f2d7ae",
    curtain: "#fff6e4", curtainShade: "#f0c2ae",
    dark: "#241c16",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const NATURAL = 2.7;
  const { height = NATURAL } = opts;
  const root = new THREE.Group();
  root.name = "club-room";
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
  function box(key, x0, x1, y0, y1, z0, z1) {
    const p = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    const ref = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  // a box by centre and size, turned `yaw` about its own vertical axis and tilted `tilt` about its own x
  function obox(key, cx, cy, cz, sx, sy, sz, yaw = 0, tilt = 0) {
    const saved = M;
    M = saved.clone().multiply(new THREE.Matrix4().makeTranslation(cx, cy, cz))
      .multiply(new THREE.Matrix4().makeRotationY(yaw)).multiply(new THREE.Matrix4().makeRotationX(tilt));
    box(key, -sx / 2, sx / 2, -sy / 2, sy / 2, -sz / 2, sz / 2);
    M = saved;
  }
  // a flat quad facing `n` (unit axis), centred on a point
  function plate(key, ctr, n, w, h) {
    const up = Math.abs(n[1]) > 0.5 ? [0, 0, 1] : [0, 1, 0];
    const r = nrm(cross(up, n)), u = cross(n, r);
    const P = (a, b) => add(ctr, add(mul(r, a * w / 2), mul(u, b * h / 2)));
    quad(key, P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), sub(ctr, n));
  }
  const pane = (ctr, n, w, h) => {
    plate("glass", add(ctr, mul(n, 0.001)), n, w, h);
    plate("glass", sub(ctr, mul(n, 0.001)), mul(n, -1), w, h);
  };
  // a capped rod (n sides) from a to b, radius r; ends pushed out by 0.6 r so joints overlap
  function rod(key, a, b, r, sides = 4, push = 0.6) {
    const T = nrm(sub(b, a));
    a = sub(a, mul(T, r * push)), b = add(b, mul(T, r * push));
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
  // a closed lathe about a vertical axis at (x, z): profile [[r, y], ...] bottom to top, flat caps at both ends
  function lathe(key, x, y0, z, prof, sides = 8) {
    const R = prof.map(([r, y]) => Array.from({ length: sides }, (_, j) => {
      const t = (j / sides) * Math.PI * 2;
      return [x + r * Math.cos(t), y0 + y, z + r * Math.sin(t)];
    }));
    for (let i = 0; i + 1 < R.length; i++) {
      const ref = [x, y0 + (prof[i][1] + prof[i + 1][1]) / 2, z];
      for (let j = 0; j < sides; j++) {
        const k = (j + 1) % sides;
        quad(key, R[i][j], R[i][k], R[i + 1][k], R[i + 1][j], ref);
      }
    }
    const yc = y0 + (prof[0][1] + prof[prof.length - 1][1]) / 2;
    for (const i of [0, R.length - 1])
      for (let j = 1; j < sides - 1; j++) tri(key, R[i][0], R[i][j], R[i][j + 1], [x, yc, z]);
  }
  // a flat strip on a wall plane following a 2D polyline (u along the wall, v up), `off` proud of it
  function strip(key, pts, wid, toPlane) {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [u0, v0] = pts[i], [u1, v1] = pts[i + 1];
      const d = nrm([u1 - u0, v1 - v0, 0]), nx = -d[1] * wid / 2, ny = d[0] * wid / 2;
      const ex = d[0] * wid / 2, ey = d[1] * wid / 2; // overlap the joints a little
      const A = toPlane(u0 - nx - ex, v0 - ny - ey), B = toPlane(u0 + nx - ex, v0 + ny - ey);
      const C = toPlane(u1 + nx + ex, v1 + ny + ey), D = toPlane(u1 - nx + ex, v1 - ny + ey);
      quad(key, A, B, C, D, toPlane.back(u0, v0));
    }
  }
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const place = (x, y, z, yaw, fn) => {
    const saved = M;
    M = saved.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z)).multiply(new THREE.Matrix4().makeRotationY(yaw));
    fn();
    M = saved;
  };

  // ---------- the shell ----------
  const W = 2.1, L = 2.4, H = 2.7, T = 0.12, CAP = 0.02;
  quad("floor", [-W, 0, -L], [W, 0, -L], [W, 0, L], [-W, 0, L], [0, -1, 0]);
  for (let i = 1; i < 12; i++) { // plank seams running along z
    const x = -W + (i * 2 * W) / 12;
    quad("dark", [x - 0.008, 0.0015, -L], [x + 0.008, 0.0015, -L], [x + 0.008, 0.0015, L], [x - 0.008, 0.0015, L], [x, -1, 0]);
  }
  const wall = (x0, x1, y0, y1, z0, z1, cut) => {
    box("wall", x0, x1, y0, cut ? y1 - CAP : y1, z0, z1);
    if (cut) box("cap", x0, x1, y1 - CAP, y1, z0, z1);
  };
  const SILL = 0.85, HEAD = 2.1, WZ0 = -0.6, WZ1 = 1.4; // window opening on the -X wall
  const wx0 = -W - T, wx1 = -W;
  wall(wx0, wx1, 0, SILL, -L - T, L, false);
  wall(wx0, wx1, HEAD, H, -L - T, L, true);
  wall(wx0, wx1, SILL, HEAD, -L - T, WZ0, false);
  wall(wx0, wx1, SILL, HEAD, WZ1, L, false);
  box("cap", wx0, wx1, 0, H - CAP, L - CAP, L); // the cut front edge of the -X wall
  wall(-W, W, 0, H, -L - T, -L, true);
  box("cap", W - CAP, W, 0, H - CAP, -L - T, -L); // the cut end of the -Z wall
  // skirting
  box("dark", -W, -W + 0.012, 0, 0.08, -L, L);
  box("dark", -W, W, 0, 0.08, -L, -L + 0.012);

  // ---------- window ----------
  const FR = 0.045, xm = (wx0 + wx1) / 2, zc = (WZ0 + WZ1) / 2;
  box("wood", wx0 - 0.005, wx1 + 0.02, SILL, SILL + FR, WZ0, WZ1);
  box("wood", wx0 - 0.005, wx1 + 0.02, HEAD - FR, HEAD, WZ0, WZ1);
  box("wood", wx0 - 0.005, wx1 + 0.02, SILL, HEAD, WZ0, WZ0 + FR);
  box("wood", wx0 - 0.005, wx1 + 0.02, SILL, HEAD, WZ1 - FR, WZ1);
  for (const [s, dx] of [[-1, -0.025], [1, 0.025]]) {
    const z0 = s < 0 ? WZ0 + FR : zc - 0.03, z1 = s < 0 ? zc + 0.03 : WZ1 - FR, x0 = xm + dx - 0.015, x1 = xm + dx + 0.015;
    box("wood", x0, x1, SILL + FR, SILL + FR + 0.05, z0, z1);
    box("wood", x0, x1, HEAD - FR - 0.05, HEAD - FR, z0, z1);
    box("wood", x0, x1, SILL + FR, HEAD - FR, z0, z0 + 0.045);
    box("wood", x0, x1, SILL + FR, HEAD - FR, z1 - 0.045, z1);
    box("wood", x0, x1, (SILL + HEAD) / 2 - 0.015, (SILL + HEAD) / 2 + 0.015, z0, z1); // a glazing bar
    pane([xm + dx, (SILL + HEAD) / 2, (z0 + z1) / 2], [1, 0, 0], z1 - z0 - 0.08, HEAD - SILL - 0.18);
  }
  box("wood", wx1, wx1 + 0.14, SILL - 0.03, SILL, WZ0 - 0.08, WZ1 + 0.08); // sill board
  rod("steel", [wx1 + 0.1, HEAD + 0.12, WZ0 - 0.25], [wx1 + 0.1, HEAD + 0.12, WZ1 + 0.25], 0.012, 6);
  const CY0 = SILL - 0.12, CY1 = HEAD + 0.1;
  function curtain(za, zb, folds, depth) {
    const n = folds * 2, xb = wx1 + 0.07, xf = xb + 0.035;
    const col = (i) => {
      const z = za + ((zb - za) * i) / n, f = xf + depth * (i % 2);
      return [[f, CY0, z], [f, CY1, z], [xb, CY1, z], [xb, CY0, z]];
    };
    const C = Array.from({ length: n + 1 }, (_, i) => col(i));
    const mid = (a, b) => [xb + 0.004, (CY0 + CY1) / 2, (a[0][2] + b[0][2]) / 2];
    for (let i = 0; i < n; i++)
      for (let k = 0; k < 4; k++) quad("curtain", C[i][k], C[i][(k + 1) % 4], C[i + 1][(k + 1) % 4], C[i + 1][k], mid(C[i], C[i + 1]));
    for (const [A, B] of [[C[0], C[1]], [C[n], C[n - 1]]]) quad("curtain", A[0], A[1], A[2], A[3], mid(A, B));
  }
  curtain(WZ1 - 1.05, WZ1 + 0.18, 5, 0.07); // half drawn across the near sash
  curtain(WZ0 - 0.2, WZ0 + 0.12, 2, 0.09);  // bunched at the far side

  // ---------- comfort corner: cabinet with the tea things, the sofa, the blanket ----------
  const CBX0 = -W + 0.02, CBX1 = -W + 0.47, CBZ0 = 1.42, CBZ1 = 1.98, CBH = 0.8;
  box("tan", CBX0, CBX1, 0.06, CBH, CBZ0, CBZ1);
  box("dark", CBX0 + 0.03, CBX1 - 0.03, 0, 0.06, CBZ0 + 0.03, CBZ1 - 0.03); // plinth
  box("dark", CBX1, CBX1 + 0.004, 0.42, 0.43, CBZ0 + 0.02, CBZ1 - 0.02);     // door split (drawer line)
  box("dark", CBX1, CBX1 + 0.004, 0.08, CBH - 0.02, (CBZ0 + CBZ1) / 2 - 0.004, (CBZ0 + CBZ1) / 2 + 0.004);
  for (const z of [(CBZ0 + CBZ1) / 2 - 0.05, (CBZ0 + CBZ1) / 2 + 0.05]) box("wood", CBX1, CBX1 + 0.02, 0.5, 0.6, z - 0.01, z + 0.01);
  box("wood", CBX0 + 0.05, CBX1 - 0.05, CBH, CBH + 0.015, CBZ0 + 0.22, CBZ1 - 0.04); // tray
  const kx = CBX0 + 0.2, kz = CBZ0 + 0.12;
  lathe("red", kx, CBH, kz, [[0.07, 0], [0.08, 0.02], [0.075, 0.17], [0.05, 0.2], [0.02, 0.215]], 10); // kettle
  rod("dark", [kx - 0.075, CBH + 0.06, kz], [kx - 0.075, CBH + 0.2, kz], 0.012, 4, 0.3);
  rod("dark", [kx - 0.075, CBH + 0.2, kz], [kx - 0.02, CBH + 0.22, kz], 0.012, 4, 0.3);
  rod("red", [kx + 0.06, CBH + 0.13, kz], [kx + 0.12, CBH + 0.18, kz], 0.012, 4, 0.3);
  const tpx = CBX0 + 0.24, tpz = CBZ0 + 0.37;
  lathe("steel", tpx, CBH + 0.015, tpz, [[0.04, 0], [0.07, 0.04], [0.065, 0.09], [0.035, 0.11], [0.015, 0.13]], 10); // teapot
  rod("steel", [tpx + 0.06, CBH + 0.06, tpz], [tpx + 0.12, CBH + 0.11, tpz], 0.01, 4, 0.3);
  rod("dark", [tpx - 0.065, CBH + 0.05, tpz], [tpx - 0.09, CBH + 0.09, tpz], 0.01, 4, 0.5);
  const cup = (x, y, z, key = "steel") => lathe(key, x, y, z, [[0.025, 0], [0.035, 0.065]], 8);
  cup(CBX0 + 0.13, CBH + 0.015, CBZ1 - 0.1);
  cup(CBX0 + 0.32, CBH + 0.015, CBZ1 - 0.09);

  // sofa along the -X wall, facing +X
  const SX0 = -W + 0.04, SX1 = -W + 0.86, SZ0 = -0.45, SZ1 = 1.25, ARM = 0.17;
  for (const z of [SZ0 + 0.08, SZ1 - 0.08]) for (const x of [SX0 + 0.08, SX1 - 0.08]) box("wood", x - 0.03, x + 0.03, 0, 0.09, z - 0.03, z + 0.03);
  box("red", SX0, SX1, 0.08, 0.3, SZ0, SZ1);                       // plinth
  box("red", SX0, SX0 + 0.22, 0.3, 0.8, SZ0 + ARM, SZ1 - ARM);      // back
  for (const [z0, z1] of [[SZ0, SZ0 + ARM], [SZ1 - ARM, SZ1]]) box("red", SX0, SX1, 0.08, 0.6, z0, z1); // arms
  const cushW = (SZ1 - SZ0 - 2 * ARM) / 2;
  for (let i = 0; i < 2; i++) {
    const z0 = SZ0 + ARM + i * cushW + 0.008, z1 = z0 + cushW - 0.016;
    obox("red", (SX0 + 0.22 + SX1) / 2 + 0.01, 0.37, (z0 + z1) / 2, SX1 - SX0 - 0.22, 0.14 - 0.02 * i, z1 - z0, 0, 0);
  }
  // blanket thrown over the back and spilling onto the near cushion, folded back on itself at the seat front
  const bz0 = SZ1 - ARM - 0.62, bz1 = SZ1 - ARM - 0.04, BX = SX0 + 0.22;
  box("blanket", SX0 - 0.012, BX + 0.02, 0.8, 0.825, bz0, bz1);           // over the back top
  box("blanket", SX0 - 0.012, SX0 + 0.008, 0.62, 0.825, bz0, bz1);        // down the back's rear
  box("blanket", BX, BX + 0.02, 0.43, 0.825, bz0, bz1);                   // down its front
  obox("blanket", (BX + SX1) / 2 - 0.03, 0.45, (bz0 + bz1) / 2 + 0.02, SX1 - BX - 0.06, 0.03, bz1 - bz0, 0.12, 0);
  obox("blanket", SX1 - 0.02, 0.36, (bz0 + bz1) / 2 + 0.06, 0.03, 0.2, bz1 - bz0 - 0.1, 0.12, 0); // over the seat edge
  for (let k = 0; k < 3; k++) box("red", BX + 0.02, BX + 0.026, 0.5 + k * 0.1, 0.52 + k * 0.1, bz0, bz1); // stripes
  // a cushion at the far end
  obox("tan", SX0 + 0.33, 0.55, SZ0 + ARM + 0.15, 0.1, 0.3, 0.3, 0.3, -0.25);

  // ---------- whiteboard on the -Z wall ----------
  const BX0 = -1.3, BX1 = 0.45, BY0 = 0.85, BY1 = 1.95, bzf = -L + 0.03;
  box("steel", BX0, BX1, BY0, BY1, -L, -L + 0.02);
  box("paper", BX0 + 0.03, BX1 - 0.03, BY0 + 0.03, BY1 - 0.03, -L + 0.02, bzf);
  box("steel", BX0 + 0.1, BX1 - 0.1, BY0 - 0.02, BY0 + 0.01, -L, -L + 0.08); // pen tray
  rod("dark", [BX0 + 0.3, BY0 + 0.025, -L + 0.05], [BX0 + 0.42, BY0 + 0.025, -L + 0.05], 0.009, 5);
  rod("red", [BX0 + 0.5, BY0 + 0.025, -L + 0.05], [BX0 + 0.62, BY0 + 0.025, -L + 0.05], 0.009, 5);
  const onBoard = (u, v) => [u, v, bzf + 0.002];
  onBoard.back = (u, v) => [u, v, bzf - 1];
  const loop = (cu, cv, ru, rv, n, turns, k0 = 0) => Array.from({ length: n + 1 }, (_, i) => {
    const t = k0 + (i / n) * turns * Math.PI * 2, s = 1 + 0.18 * Math.sin(3 * t);
    return [cu + ru * s * Math.cos(t), cv + rv * s * Math.sin(t)];
  });
  strip("dark", loop(BX0 + 0.32, 1.6, 0.17, 0.14, 18, 1.1), 0.012, onBoard);
  strip("dark", [[BX0 + 0.55, 1.6], [BX0 + 0.85, 1.55], [BX0 + 0.8, 1.6], [BX0 + 0.85, 1.55], [BX0 + 0.8, 1.5]], 0.012, onBoard); // arrow
  strip("red", loop(BX0 + 1.05, 1.5, 0.12, 0.1, 14, 1.0, 0.5), 0.012, onBoard);
  strip("seam", Array.from({ length: 9 }, (_, i) => [BX0 + 0.15 + i * 0.07, 1.2 + (i % 2 ? 0.07 : -0.03)]), 0.012, onBoard); // zigzag
  strip("seam", [[BX0 + 0.75, 1.1], [BX0 + 1.0, 1.1], [BX0 + 1.0, 1.28], [BX0 + 0.75, 1.28], [BX0 + 0.75, 1.1]], 0.01, onBoard);
  for (let i = 0; i < 4; i++) strip("dark", [[BX0 + 0.12, 1.86 - i * 0.06 - 0.04], [BX0 + 0.12 + 0.35 - 0.07 * (i % 3), 1.86 - i * 0.06 - 0.04]], 0.01, onBoard);
  // calendar grid stuck on the right of the board
  const CU0 = BX1 - 0.47, CU1 = BX1 - 0.08, CV0 = 1.0, CV1 = 1.82;
  box("sheet", CU0, CU1, CV0, CV1, bzf + 0.002, bzf + 0.005); // unlined: a 3 mm sheet's hull smears over the board
  box("sheetRed", CU0, CU1, CV1 - 0.1, CV1, bzf + 0.002, bzf + 0.006);
  const onCal = (u, v) => [u, v, bzf + 0.0065];
  onCal.back = (u, v) => [u, v, bzf - 1];
  for (let i = 0; i <= 7; i++) { const u = CU0 + 0.02 + (i * (CU1 - CU0 - 0.04)) / 7; strip("seam", [[u, CV0 + 0.03], [u, CV1 - 0.12]], 0.005, onCal); }
  for (let j = 0; j <= 5; j++) { const v = CV0 + 0.03 + (j * (CV1 - CV0 - 0.15)) / 5; strip("seam", [[CU0 + 0.02, v], [CU1 - 0.02, v]], 0.005, onCal); }
  for (const [u, v] of [[CU0 + 0.2, CV1 - 0.42], [CU0 + 0.31, CV0 + 0.2]]) strip("red", loop(u, v, 0.03, 0.03, 8, 1), 0.008, onCal);
  for (const [u, v] of [[(CU0 + CU1) / 2, CV1 + 0.03], [BX0 + 0.2, 1.08], [BX0 + 1.3, 1.82]]) box("red", u - 0.02, u + 0.02, v - 0.02, v + 0.02, bzf, bzf + 0.02); // magnets

  // ---------- storage: two steel shelf units, crammed ----------
  const SH0 = 0.62, SHW = 0.72, SHD = 0.38, SHH = 1.8, SZB = -L + 0.02;
  let seed = 1;
  for (let u = 0; u < 2; u++) {
    const x0 = SH0 + u * (SHW + 0.02), x1 = x0 + SHW, z0 = SZB, z1 = SZB + SHD;
    for (const x of [x0, x1 - 0.03]) for (const z of [z0, z1 - 0.03]) box("steel", x, x + 0.03, 0, SHH, z, z + 0.03);
    const boards = [0.05, 0.42, 0.79, 1.16, 1.53, SHH - 0.02];
    for (const y of boards) box("steel", x0 + 0.005, x1 - 0.005, y, y + 0.02, z0 + 0.005, z1 - 0.005);
    for (let s = 0; s < boards.length - 1; s++) {
      const yb = boards[s] + 0.02, room = boards[s + 1] - yb - 0.02;
      let x = x0 + 0.035;
      while (x < x1 - 0.07) {
        const h = hash(seed++), kind = h < 0.45 ? "binder" : h < 0.7 ? "file" : "games";
        if (kind === "binder") { // a run of binders, spines out (+Z)
          const n = 2 + Math.floor(hash(seed++) * 4), key = ["red", "wood", "tan", "steel"][Math.floor(hash(seed++) * 4)];
          for (let i = 0; i < n && x < x1 - 0.06; i++) {
            const t = 0.055, hh = room * (0.78 + 0.12 * hash(seed++));
            box(key, x, x + t - 0.006, yb, yb + hh, z0 + 0.05, z1 - 0.02);
            box("dark", x + 0.012, x + t - 0.018, yb + hh * 0.18, yb + hh * 0.18 + 0.03, z1 - 0.02, z1 - 0.016); // finger hole
            x += t;
          }
          if (hash(seed++) < 0.35 && x < x1 - 0.12) { // one leaning over
            const hh = room * 0.8;
            obox(key, x + 0.07, yb + hh * 0.47, (z0 + z1) / 2 + 0.01, 0.05, hh, SHD - 0.08, 0, 0);
            x += 0.12;
          }
        } else if (kind === "file") { // a file box
          const w = 0.18 + 0.08 * hash(seed++), hh = room * (0.55 + 0.3 * hash(seed++));
          if (x + w > x1 - 0.03) break;
          box("tan", x, x + w, yb, yb + hh, z0 + 0.03, z1 - 0.03);
          box("dark", x + w * 0.35, x + w * 0.65, yb + hh * 0.7, yb + hh * 0.7 + 0.025, z1 - 0.03, z1 - 0.026);
          x += w + 0.01;
        } else { // a stack of board games, flat, sticking out a little
          const w = 0.26 + 0.06 * hash(seed++);
          if (x + w > x1 - 0.03) break;
          let y = yb;
          const n = 2 + Math.floor(hash(seed++) * 3);
          for (let i = 0; i < n && y < yb + room - 0.08; i++) {
            const t = 0.05 + 0.03 * hash(seed++), key = ["red", "tan", "steel", "wood"][Math.floor(hash(seed++) * 4)];
            const sh = (hash(seed++) - 0.5) * 0.03;
            box(key, x + sh, x + w + sh, y, y + t, z0 + 0.04, z1 + 0.02 * hash(seed++));
            y += t + 0.002;
          }
          x += w + 0.015;
        }
      }
    }
    // a box shoved on top of each unit
    box("tan", x0 + 0.06 + u * 0.1, x0 + 0.5 + u * 0.1, SHH, SHH + 0.26 - u * 0.06, z0 + 0.03, z1 - 0.01);
  }

  // ---------- cardboard box overflowing with props ----------
  const pbx = 1.45, pbz = -L + 0.9, PW = 0.58, PD = 0.44, PH = 0.42;
  place(pbx, 0, pbz, 0.2, () => {
    box("tan", -PW / 2, PW / 2, 0, PH, -PD / 2, PD / 2);
    box("dark", -PW / 2 - 0.004, PW / 2 + 0.004, PH * 0.55, PH * 0.55 + 0.04, -PD / 2 - 0.004, PD / 2 + 0.004); // tape band
    obox("tan", -PW / 2 - 0.09, PH + 0.06, 0, 0.012, 0.2, PD - 0.02, 0, 0); // flaps, open
    box("tan", -PW / 2 - 0.1, -PW / 2 - 0.085, PH - 0.02, PH + 0.17, -PD / 2 + 0.01, PD / 2 - 0.01);
    box("tan", PW / 2 + 0.085, PW / 2 + 0.1, PH - 0.02, PH + 0.17, -PD / 2 + 0.01, PD / 2 - 0.01);
    box("tan", -PW / 2 + 0.01, PW / 2 - 0.01, PH - 0.02, PH + 0.15, PD / 2 + 0.085, PD / 2 + 0.1);
    rod("wood", [-0.12, 0.15, -0.05], [0.05, 1.0, 0.04], 0.022, 5);            // wooden sword
    rod("wood", [-0.05, 0.62, 0.0], [0.07, 0.6, 0.06], 0.035, 6, 0.1);          // its guard
    lathe("red", 0.12, PH - 0.03, 0.02, [[0.0001, 0], [0.16, 0.0], [0.16, 0.02], [0.09, 0.03], [0.085, 0.2], [0.0001, 0.2]], 10); // top hat
    obox("red", 0.15, PH + 0.03, -0.12, 0.3, 0.06, 0.22, 0.5, 0.25);           // folded cloth
    lathe("steel", -0.16, PH - 0.06, 0.1, [[0.0001, 0], [0.08, 0.03], [0.11, 0.11], [0.08, 0.19], [0.0001, 0.22]], 8); // ball
  });
  // two boxes stacked in the far corner
  place(-W + 0.4, 0, -L + 0.4, 0.2, () => {
    box("tan", -0.28, 0.28, 0, 0.36, -0.22, 0.22);
    box("dark", -0.284, 0.284, 0.17, 0.2, -0.224, 0.224);
    box("tan", -0.2, 0.22, 0.36, 0.62, -0.17, 0.19);
    box("dark", -0.204, 0.224, 0.47, 0.5, -0.174, 0.194);
  });

  // a poster on the -X wall past the window (blank: a pale field, a red disc, a dark band), and floor clutter
  box("tan", -W, -W + 0.006, 1.2, 1.95, 1.6, 2.1);
  box("paper", -W + 0.006, -W + 0.009, 1.28, 1.6, 1.65, 2.05);
  box("red", -W + 0.006, -W + 0.012, 1.68, 1.88, 1.72, 1.98);
  box("dark", -W + 0.006, -W + 0.012, 1.3, 1.36, 1.7, 2.0);
  // a rug in front of the sofa with a floor cushion (zabuton) by it
  box("tan", -1.25, 0.0, 0, 0.008, -0.35, 1.15);
  for (const [x0, x1, z0, z1] of [[-1.25, 0.0, -0.35, -0.28], [-1.25, 0.0, 1.08, 1.15], [-1.25, -1.18, -0.35, 1.15], [-0.07, 0.0, -0.35, 1.15]])
    box("red", x0, x1, 0.001, 0.01, z0, z1);
  obox("red", -0.85, 0.045, 1.4, 0.48, 0.07, 0.48, 0.4, 0);
  place(-1.5, 0, -0.85, 0.3, () => { // a stack of comics / magazines by the sofa end
    let y = 0;
    for (let i = 0; i < 7; i++) {
      const t = 0.025 + 0.012 * hash(50 + i), key = ["red", "tan", "steel", "wood"][i % 4], r = (hash(60 + i) - 0.5) * 0.4;
      obox(key, (hash(70 + i) - 0.5) * 0.03, y + t / 2, 0, 0.18, t, 0.26, r, 0);
      y += t;
    }
  });

  // ---------- centre: two long tables pushed together ----------
  const TX = 0.4, TZ = 0.4, TL = 1.8, TD = 0.6, TH = 0.7;
  for (const dz of [-TD / 2, TD / 2]) {
    const z = TZ + dz;
    box("tan", TX - TL / 2, TX + TL / 2, TH - 0.03, TH, z - TD / 2 + 0.003, z + TD / 2 - 0.003);
    box("steel", TX - TL / 2 + 0.06, TX + TL / 2 - 0.06, TH - 0.09, TH - 0.03, z - TD / 2 + 0.05, z + TD / 2 - 0.05); // apron
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      rod("steel", [TX + sx * (TL / 2 - 0.1), 0.01, z + sz * (TD / 2 - 0.08)], [TX + sx * (TL / 2 - 0.1), TH - 0.06, z + sz * (TD / 2 - 0.08)], 0.016, 6);
  }
  // folding chair at the origin facing -Z (toward the table from +Z), seat 0.44
  function chair() {
    const sw = 0.4, sd = 0.38;
    for (const sx of [-1, 1]) {
      const x = sx * (sw / 2 - 0.02);
      rod("steel", [x, 0.008, -sd / 2 + 0.02], [x, 0.44, -sd / 2 + 0.06], 0.012, 5);  // front leg
      rod("steel", [x, 0.008, sd / 2 + 0.04], [x, 0.84, sd / 2 - 0.02], 0.012, 5);    // back leg and post
      rod("steel", [x, 0.42, -sd / 2 + 0.06], [x, 0.42, sd / 2 - 0.01], 0.01, 4);
    }
    rod("steel", [-sw / 2 + 0.02, 0.06, -sd / 2 + 0.03], [sw / 2 - 0.02, 0.06, -sd / 2 + 0.03], 0.009, 4);
    box("steel", -sw / 2, sw / 2, 0.43, 0.46, -sd / 2 + 0.02, sd / 2 - 0.02);
    obox("steel", 0, 0.73, sd / 2 - 0.02, sw - 0.02, 0.17, 0.025, 0, -0.08);
  }
  const chairs = [ // x, z, yaw (0 faces -Z)
    [TX + 0.0, TZ + TD + 0.45, 0.2], [TX + 0.6, TZ + TD + 0.52, -0.35],
    [TX - 0.4, TZ - TD - 0.38, Math.PI + 0.1], [TX + 0.5, TZ - TD - 0.45, Math.PI - 0.3],
    [TX + TL / 2 + 0.42, TZ + 0.1, Math.PI / 2 + 0.25],
  ];
  for (const [x, z, yaw] of chairs) place(x, 0, z, yaw, () => chair());

  // on the tables
  const TOP = TH;
  place(TX - 0.45, TOP, TZ + 0.3, 0.2, () => { // open laptop, blank screen, facing +Z
    box("steel", -0.17, 0.17, 0, 0.018, -0.12, 0.12);
    obox("steel", 0, 0.12, -0.13, 0.34, 0.24, 0.014, 0, -0.22);
    obox("dark", 0, 0.123, -0.122, 0.3, 0.2, 0.004, 0, -0.22);
    box("dark", -0.14, 0.14, 0.018, 0.021, -0.1, 0.0); // keyboard field
  });
  place(TX + 0.35, TOP, TZ - 0.32, 0.4, () => { // two closed laptops, stacked askew
    box("steel", -0.16, 0.16, 0, 0.025, -0.11, 0.11);
    box("dark", -0.16, 0.16, 0.012, 0.014, -0.112, -0.108);
    obox("wood", 0.02, 0.037, 0.01, 0.3, 0.022, 0.2, 0.3, 0);
  });
  place(TX + 0.55, TOP, TZ + 0.35, -0.25, () => {
    box("steel", -0.15, 0.15, 0, 0.024, -0.1, 0.1);
    box("dark", -0.15, 0.15, 0.011, 0.013, 0.098, 0.102);
  });
  for (const [x, z] of [[TX - 0.1, TZ + 0.45], [TX + 0.2, TZ + 0.12], [TX - 0.62, TZ - 0.25], [TX + 0.78, TZ - 0.05]]) cup(x, TOP, z);
  const bag = (x, z, yaw, key) => place(x, TOP, z, yaw, () => { // a snack bag: a pillow with crimped ends
    obox(key, 0, 0.025, 0, 0.16, 0.05, 0.2);
    box(key, -0.085, 0.085, 0.002, 0.02, -0.115, -0.1);
    box(key, -0.085, 0.085, 0.002, 0.02, 0.1, 0.115);
    box("tan", -0.04, 0.04, 0.05, 0.052, -0.05, 0.05);
  });
  bag(TX - 0.15, TZ - 0.2, 0.6, "red");
  bag(TX + 0.05, TZ - 0.42, -0.3, "red");
  bag(TX - 0.72, TZ + 0.1, 1.2, "tan");
  for (const [x, z, yaw] of [[TX + 0.15, TZ + 0.42, 0.3], [TX + 0.22, TZ + 0.38, -0.2], [TX - 0.3, TZ - 0.4, 0.8]])
    place(x, TOP + 0.003, z, yaw, () => box("paper", -0.105, 0.105, 0, 0.003, -0.148, 0.148));

  // ---------- meshes: one per material signature ----------
  const MAT = {
    wall: [c.wall, c.wallShade, 0.35, 3],
    floor: [c.floor, c.floorShade, 0.1, 3],
    seam: [c.seam, c.seam, 0.1, 0],
    cap: [c.dark, c.dark, 0.1, 3],
    dark: [c.dark, c.dark, 0.1, 0],
    wood: [c.wood, c.wood, 0.1, 2],
    tan: [c.tan, c.tanShade, 0.1, 2],
    steel: [c.steel, c.steelShade, 0.1, 2],
    red: [c.red, c.redShade, 0.1, 2],
    paper: [c.paper, c.paper, 0.1, 0],
    glass: [c.glass, c.glass, 0.1, 0],
    curtain: [c.curtain, c.curtainShade, 0.45, 2],
    blanket: [c.steel, c.steelShade, 0.1, 2],
    sheet: [c.tan, c.tan, 0.1, 0],
    sheetRed: [c.red, c.red, 0.1, 0],
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
