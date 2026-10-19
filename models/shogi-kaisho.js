// shogi-kaisho.js - a neighbourhood shogi parlour (shogi kaisho), as a cutaway set piece, static, at real size.
// Contract: harness/lab/README.md. Meters, +Y up, the two open (cut) sides face +X and +Z so the lab's front-left
// cameras look in; the two built walls are the back (-Z: name-tag wall, tea counter, piece-box shelf, coat rack) and
// the side (-X: the big wall board and a sash window with a roll blind). Floor slab on y = 0, centred on x = z = 0.
//
// Why a wall board: the lab's hero camera sits about 0.7 m up, level with any real board top, so a board lying flat
// is seen edge-on there (raising it on legs or a platform only lifts it to eye level). The read the hero needs (the
// 9x9 grid and the pentagonal pieces) comes from the big vertical commentary board (oban) every kaisho hangs on its
// wall; the flat boards carry it in the three4 and top views and as thick legged blocks with komadai in the hero.
//
// Construction (boxes, rods, lathes and pentagonal prisms, all triangle soups merged per material signature, so the
// room is 11 meshes; boxes flat-shaded, round parts carry radial normals). Every triangle is wound away from a point
// inside its solid (box centre, rod axis, lathe axis, prism centre), never by hand.
//   FLOOR     a dark plank floor (lighter seams) with a dark sill on its open edges.
//   WALL BOARD (-X) a pale board in a dark frame, 9x9 grid of 10 x 11 cm cells, star points, the mid-game position at
//             2.9x scale with pieces standing out of it, and a small komadai panel with captured pieces at two corners.
//   PLATFORM  a raised tatami platform (agari) along the -X wall under the wall board: three mats with dark heri on a
//             dark riser and kamachi. On it two thick legged boards (6 sun, four squat legs), a red zabuton either
//             side, a komadai (top, post, foot) at each player's right and a chess clock on the mat.
//   TABLES    two pale tables on the floor, each with a 6 cm table board, two komadai trays, a chess clock and a chair at
//             either end; the players sit along x so no chair stands between the hero camera and a board.
//   BOARDS    pale kaya top with a 9x9 grid of dark lines and four star points; pieces are pentagonal prisms (13
//             triangles, open underneath) laid out mid-game, tips toward the opponent, pawns smaller; a few captured
//             pieces lie on each komadai. One literal position, mirrored per board so no two look alike.
//   CLOCKS    a dark body with a sloped top, two white dials with hands on the front, two red buttons.
//   WALLS     plaster boxes between dark pillars, skirting and a top beam; the cut ends finish on a pillar.
//   BACK      a name-tag board (fudakake): a dark frame and backing, five rails of blank pale plaques (no lettering, a
//             few hooks empty); a counter with a tea urn (body, knob, tap, handle) and a tray of six cups; a wall shelf
//             of piece boxes (upright and flat, dark lids); a standing coat rack with a coat and a hat.
//   WINDOW    (-X) a dark sash window with a glowing pane, a pale roll blind pulled half down with a bar and a cord.
//   SPARES    a stack of six spare table boards, slightly askew, in the front-right corner; the top one shows its grid.
// Proportions (real size, base unit the board: 0.333 x 0.364 m, 9 x 9 cells of 3.4 x 3.7 cm): room 4.2 (x) by 3.6 (z),
//   wall top 2.4; platform 0.25 high, 1.76 deep; legged board 0.18 thick on 0.09 legs; tables 0.9 x 0.6 at 0.7,
//   chairs 0.42 seat, 0.78 back; pieces 2.2-2.9 cm long, 9 mm thick (thickened ~12 %); clocks 0.17 x 0.1 x 0.07;
//   wall board 0.99 x 1.07 with its centre at 1.42; name-tag board 1.4 x 0.8.
// Options: build(THREE, kit, colors, { height = 2.4 }): scales the whole room uniformly so the wall top is `height`.
// Budget: ~8.1k triangles (pieces 2.6k), 11 meshes.
// Focus markers (empty joints, nothing poses them): board1, board2, table1, table2, oban, tags, urn for --focus.
// Colours (noon, warm wood browns), base / shade:
//   plaster walls                 moon #fff6e4 / sky #f2d7ae
//   floor planks                  iris #5c3d32 flat, seams hair #241c16
//   structure (pillars, beams, riser, sills, window, frames, coat rack, shelf, lids)  iris #5c3d32 / hair #241c16
//   pale wood (boards, tables, chairs, komadai, counter, blind, piece boxes, plaques)  sky #f2d7ae / skin #f0c2ae
//   tatami                        skin #f0c2ae flat; heri, grid lines, clock bodies, hat hair #241c16 flat
//   pieces                        moon #fff6e4 / sky #f2d7ae, a 1 px hull so each reads as a token
//   zabuton, clock buttons        accent #c4452d / iris #5c3d32
//   urn, cups, clock dials, coat  sclera #f6f3ee / sky #f2d7ae; window pane practical #fffaf2 glowing

export const meta = {
  name: "shogi-kaisho",
  height: 2.4,
  script: "noon",
  colors: {
    wall: "#fff6e4", wallShade: "#f2d7ae",
    floor: "#5c3d32", seam: "#241c16",
    wood: "#5c3d32", woodShade: "#241c16",
    pale: "#f2d7ae", paleShade: "#f0c2ae",
    tatami: "#f0c2ae",
    piece: "#fff6e4", pieceShade: "#f2d7ae",
    accent: "#c4452d", accentShade: "#5c3d32",
    metal: "#f6f3ee", metalShade: "#f2d7ae",
    glow: "#fffaf2",
    dark: "#241c16",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const NATURAL = 2.4;
  const { height = NATURAL } = opts;
  const root = new THREE.Group();
  root.name = "shogi-kaisho";
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
  const quad = (key, a, b, e, d, ref, na, nb, ne, nd) => (tri(key, a, b, e, ref, na, nb, ne), tri(key, a, e, d, ref, na, ne, nd));
  function box(key, x0, x1, y0, y1, z0, z1) {
    const p = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    const ref = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  const cbox = (key, x, y, z, sx, sy, sz) => box(key, x - sx / 2, x + sx / 2, y - sy / 2, y + sy / 2, z - sz / 2, z + sz / 2);
  // a flat quad on the plane y = y, wound up
  const flat = (key, x0, x1, z0, z1, y) => quad(key, [x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [(x0 + x1) / 2, y - 1, (z0 + z1) / 2]);
  // a capped tube from a to b, radius r; ends pushed out by ext * r so joints overlap
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
  // a solid of revolution round a vertical axis: profile [[radius, y], ...] bottom to top, closed at both ends
  function lathe(key, cx, cz, prof, n = 8) {
    const P = (a, rr, y) => [cx + Math.sin(a) * rr, y, cz + Math.cos(a) * rr];
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n, b = (Math.PI * 2 * (i + 1)) / n;
      for (let k = 0; k + 1 < prof.length; k++) {
        const [r0, y0] = prof[k], [r1, y1] = prof[k + 1];
        const sl = nrm([y1 - y0, -(r1 - r0)]);
        const N = (aa) => [Math.sin(aa) * sl[0], sl[1], Math.cos(aa) * sl[0]];
        quad(key, P(a, r0, y0), P(b, r0, y0), P(b, r1, y1), P(a, r1, y1), [cx, (y0 + y1) / 2, cz], N(a), N(b), N(b), N(a));
      }
      const [rb, yb] = prof[0], [rt, yt] = prof[prof.length - 1];
      if (rb > 1e-6) tri(key, P(a, rb, yb), P(b, rb, yb), [cx, yb, cz], [cx, yb + 1, cz]);
      if (rt > 1e-6) tri(key, P(a, rt, yt), P(b, rt, yt), [cx, yt, cz], [cx, yt - 1, cz]);
    }
  }
  const place = (x, y, z, yaw, fn) => {
    const saved = M;
    M = saved.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z)).multiply(new THREE.Matrix4().makeRotationY(yaw));
    fn();
    M = saved;
  };
  // the same with any rotation matrix
  const placeM = (x, y, z, R, fn) => {
    const saved = M;
    M = saved.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z)).multiply(R);
    fn();
    M = saved;
  };

  // ---------- shogi: pieces, board, komadai, clock (local: board centre at x = z = 0, players at +-z) ----------
  // a piece lying flat: pentagon, base toward its owner, tip toward the opponent (dir = -1: tip to -z)
  function piece(x, y, z, dir, big, k = 1) {
    const w = (big ? 0.026 : 0.022) * k, L = (big ? 0.029 : 0.025) * k, h = 0.009 * Math.min(k, 1.4), ht = (big ? 1 : 0.9) * h;
    const pts = [[-w / 2, -L / 2], [w / 2, -L / 2], [w * 0.42, L * 0.22], [0, L / 2], [-w * 0.42, L * 0.22]]
      .map(([u, v]) => [x + u, z - dir * v]);
    const ctr = [x, y + h / 2, z];
    const top = pts.map(([px, pz]) => [px, y + ht, pz]), bot = pts.map(([px, pz]) => [px, y, pz]);
    for (let i = 0; i < 5; i++) quad("piece", bot[i], bot[(i + 1) % 5], top[(i + 1) % 5], top[i], ctr);
    for (let i = 1; i < 4; i++) tri("piece", top[0], top[i], top[i + 1], ctr);
  }
  // mid-game, rows from the -z player's back rank to the +z player's; a/A: +z player (tips to -z), b/B: -z player
  const POS = [
    "BB..B..BB",
    ".B...B.B.",
    "b.bb.bb.b",
    "..b..b...",
    "....b..a.",
    ".a.a..a..",
    "a.a.aa..a",
    ".A..A.AA.",
    "AA.A..A.A",
  ];
  const BW = 0.333, BL = 0.364, CW = 0.034, CL = 0.037;
  // the board top at y = 0 (local), grid, star points, pieces; variant mirrors the layout
  // k scales the cells and pieces (the wall board)
  function boardTop(variant, k = 1) {
    const cw = CW * k, cl = CL * k;
    const gx = (cw * 9) / 2, gz = (cl * 9) / 2, y = 0.0012, lw = 0.0018 * Math.sqrt(k);
    for (let i = 0; i <= 9; i++) {
      const x = -gx + i * cw, z = -gz + i * cl;
      flat("grid", x - lw, x + lw, -gz - lw, gz + lw, y);
      flat("grid", -gx - lw, gx + lw, z - lw, z + lw, y);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cbox("grid", sx * 1.5 * cw, y, sz * 1.5 * cl, 0.007 * k, 0.002, 0.007 * k);
    for (let r = 0; r < 9; r++)
      for (let f = 0; f < 9; f++) {
        const row = variant & 2 ? 8 - r : r;
        const col = variant & 1 ? 8 - f : f;
        const ch = POS[row][col];
        if (ch === ".") continue;
        const own = ch.toLowerCase() === "a" ? 1 : -1;
        const dir = variant & 2 ? -own : own; // flipping the rows swaps the sides
        const jx = (((r * 7 + f * 3 + variant) % 5) - 2) * 0.0012 * k; // pieces never sit dead centre
        piece(-gx + (f + 0.5) * cw + jx, 0, -gz + (r + 0.5) * cl, dir, ch === ch.toUpperCase(), k);
      }
  }
  // a komadai top at y = 0 with n captured pieces of its owner (dir)
  function captured(n, dir, k = 1) {
    const spots = [[-0.035, -0.03], [0.0, -0.03], [0.035, -0.03], [-0.02, 0.025], [0.02, 0.025]];
    for (let i = 0; i < n; i++) piece(spots[i][0] * k, 0, spots[i][1] * -dir * k, dir, i % 2 === 1, k);
  }
  // a chess clock standing on y = 0, faces +z: dark body, two dials, two buttons
  function clock() {
    box("dark", -0.085, 0.085, 0, 0.07, -0.035, 0.035);
    // sloped face: a wedge on top toward the front
    const f = [[-0.085, 0.07, 0.035], [0.085, 0.07, 0.035], [0.085, 0.095, -0.01], [-0.085, 0.095, -0.01]];
    const ref = [0, 0.06, 0];
    quad("dark", f[0], f[1], f[2], f[3], ref);
    quad("dark", [-0.085, 0.07, -0.035], [0.085, 0.07, -0.035], [0.085, 0.095, -0.01], [-0.085, 0.095, -0.01], [0, 0.06, 0.05]);
    for (const s of [-1, 1]) tri("dark", [s * 0.085, 0.07, 0.035], [s * 0.085, 0.095, -0.01], [s * 0.085, 0.07, -0.035], [0, 0.075, 0]);
    for (const s of [-1, 1]) {
      // dials on the front face
      const ctr = [s * 0.042, 0.04, 0.0365];
      const pts = Array.from({ length: 8 }, (_, k) => { const a = (k / 8) * Math.PI * 2; return [ctr[0] + Math.cos(a) * 0.027, ctr[1] + Math.sin(a) * 0.027, ctr[2]]; });
      for (let k = 1; k < 7; k++) tri("metal", pts[0], pts[k], pts[k + 1], [ctr[0], ctr[1], ctr[2] - 1]);
      rod("dark", ctr, [ctr[0] + 0.004, ctr[1] + 0.018, ctr[2] + 0.002], 0.002, 4, 0);
      lathe("accent", s * 0.045, 0.012, [[0.016, 0.084], [0.016, 0.1], [0.0, 0.104]], 6); // button
    }
  }
  // a thick board on legs (local floor y = 0) with both komadai and a clock on the floor beside it
  function leggedBoard(variant) {
    const LEG = 0.09, T = 0.18, top = LEG + T;
    box("pale", -BW / 2, BW / 2, LEG, top, -BL / 2, BL / 2);
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      lathe("pale", sx * 0.11, sz * 0.12, [[0.03, 0], [0.042, 0.03], [0.036, 0.06], [0.026, LEG + 0.01]], 6);
    place(0, top, 0, 0, () => boardTop(variant));
    for (const [x, z, dir] of [[-0.3, 0.12, 1], [0.3, -0.12, -1]]) { // each player's right
      box("pale", x - 0.075, x + 0.075, 0.15, 0.17, z - 0.075, z + 0.075);
      box("pale", x - 0.04, x + 0.04, 0, 0.15, z - 0.04, z + 0.04);
      box("pale", x - 0.06, x + 0.06, 0, 0.02, z - 0.06, z + 0.06);
      place(x, 0.17, z, 0, () => captured(3 + (variant % 2), dir));
    }
    place(0.3, 0, 0.14, -Math.PI / 2, clock);
    for (const z of [-0.5, 0.5]) { // zabuton
      box("accent", -0.25, 0.25, 0, 0.06, z - 0.27, z + 0.27);
    }
  }
  // a table (floor y = 0) with a table board, komadai trays and a clock; chairs at +-z
  function tableSet(variant) {
    const TH = 0.7;
    box("pale", -0.45, 0.45, TH - 0.03, TH, -0.3, 0.3);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box("pale", sx * 0.41 - 0.025, sx * 0.41 + 0.025, 0, TH - 0.03, sz * 0.26 - 0.025, sz * 0.26 + 0.025);
    for (const sz of [-1, 1]) box("pale", -0.39, 0.39, TH - 0.1, TH - 0.03, sz * 0.26 - 0.012, sz * 0.26 + 0.012); // aprons
    const T = 0.06;
    box("pale", -BW / 2, BW / 2, TH, TH + T, -BL / 2, BL / 2);
    place(0, TH + T, 0, 0, () => boardTop(variant));
    for (const [x, z, dir] of [[-0.3, 0.12, 1], [0.3, -0.12, -1]]) {
      box("pale", x - 0.07, x + 0.07, TH, TH + 0.03, z - 0.07, z + 0.07);
      place(x, TH + 0.03, z, 0, () => captured(2 + (variant % 3), dir));
    }
    place(0.33, TH, 0.15, -Math.PI / 2 + 0.2, clock);
    for (const s of [-1, 1]) place(0, 0, s * 0.55, s > 0 ? Math.PI : 0, chair);
  }
  // a chair facing +z (local), seat centred on x = z = 0
  function chair() {
    const SY = 0.42;
    box("pale", -0.2, 0.2, SY - 0.03, SY, -0.2, 0.2);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box("pale", sx * 0.17 - 0.018, sx * 0.17 + 0.018, 0, SY - 0.03, sz * 0.17 - 0.018, sz * 0.17 + 0.018);
    for (const sx of [-1, 1]) box("pale", sx * 0.17 - 0.018, sx * 0.17 + 0.018, SY, 0.78, -0.188, -0.152);
    box("pale", -0.19, 0.19, 0.6, 0.78, -0.185, -0.155);
  }

  // ---------- room: floor, walls, pillars, beams ----------
  const X0 = -2.1, X1 = 2.1, Z0 = -1.8, Z1 = 1.8, F = 0.08, H = 2.4, T = 0.12, P = 0.14;
  box("floor", X0, X1, 0, F, Z0, Z1);
  box("wood", X0, X1 + 0.05, 0, F + 0.008, Z1, Z1 + 0.06);
  box("wood", X1, X1 + 0.05, 0, F + 0.008, Z0, Z1);
  for (let i = 1; i < 20; i++) { const x = X0 + i * 0.21; flat("seam", x - 0.005, x + 0.005, Z0, Z1, F + 0.0015); }
  box("wall", X0 - T, X1, F, H - 0.14, Z0 - T, Z0);
  const WS = 1.05, WH = 2.0, WZ0 = -1.6, WZ1 = -0.72; // window on -X
  box("wall", X0 - T, X0, F, WS, Z0, Z1);
  box("wall", X0 - T, X0, WH, H - 0.14, Z0, Z1);
  box("wall", X0 - T, X0, WS, WH, Z0, WZ0);
  box("wall", X0 - T, X0, WS, WH, WZ1, Z1);
  for (const x of [X0, -0.34, X1 - P / 2]) box("wood", x - P / 2, x + P / 2, F, H, Z0 - T, Z0 + 0.05);
  for (const z of [Z1 - P / 2]) box("wood", X0 - T, X0 + 0.05, F, H, z - P / 2, z + P / 2);
  box("wood", X0, X1 - P, F, F + 0.08, Z0, Z0 + 0.02); // skirting
  box("wood", X0, X0 + 0.02, F, F + 0.08, Z0, Z1 - P);
  box("wood", X0 - T - 0.02, X1, H - 0.15, H, Z0 - T - 0.02, Z0 + 0.08); // top beams
  box("wood", X0 - T - 0.02, X0 + 0.08, H - 0.15, H, Z0, Z1);

  // ---------- window (-X) with a roll blind ----------
  {
    const xa = X0 - 0.03, xb = X0 + 0.03;
    quad("glow", [X0 - 0.06, WS, WZ0], [X0 - 0.06, WS, WZ1], [X0 - 0.06, WH, WZ1], [X0 - 0.06, WH, WZ0], [X0 - 1, 1.5, 0]);
    box("wood", X0 - T, X0 + 0.05, WS - 0.05, WS + 0.02, WZ0 - 0.05, WZ1 + 0.05); // sill
    box("wood", X0 - T, X0 + 0.03, WH - 0.02, WH + 0.05, WZ0 - 0.05, WZ1 + 0.05); // head
    for (const z of [WZ0, WZ1]) box("wood", X0 - T, X0 + 0.03, WS, WH, z - 0.04, z + 0.04);
    box("wood", xa, xb, WS, WH, (WZ0 + WZ1) / 2 - 0.025, (WZ0 + WZ1) / 2 + 0.025); // meeting stiles
    box("wood", xa, xb, (WS + WH) / 2 + 0.1 - 0.02, (WS + WH) / 2 + 0.1 + 0.02, WZ0, WZ1); // transom bar
    // roll blind: roller box, cloth down to just above the transom, bottom bar, cord
    const BY = 1.5;
    box("pale", X0, X0 + 0.07, WH - 0.06, WH + 0.02, WZ0 - 0.06, WZ1 + 0.06);
    box("pale", X0 + 0.04, X0 + 0.05, BY, WH - 0.06, WZ0 - 0.03, WZ1 + 0.03);
    box("wood", X0 + 0.035, X0 + 0.065, BY - 0.03, BY, WZ0 - 0.04, WZ1 + 0.04);
    rod("dark", [X0 + 0.06, BY, WZ1 - 0.1], [X0 + 0.06, BY - 0.2, WZ1 - 0.1], 0.004, 4, 0);
    cbox("dark", X0 + 0.06, BY - 0.21, WZ1 - 0.1, 0.014, 0.025, 0.014);
  }

  // ---------- wall board (oban, -X): the big commentary board, a vertical grid that faces the hero camera ----------
  const OK = 2.9, OZ = 0.42, OY = 1.42; // cell scale, centre on the wall
  {
    const hw = (CW * 9 * OK) / 2 + 0.05, hh = (CL * 9 * OK) / 2 + 0.05, x = X0 + 0.03;
    box("pale", X0, x, OY - hh, OY + hh, OZ - hw, OZ + hw);
    box("wood", X0, x + 0.03, OY - hh - 0.04, OY - hh, OZ - hw - 0.04, OZ + hw + 0.04); // frame
    box("wood", X0, x + 0.03, OY + hh, OY + hh + 0.04, OZ - hw - 0.04, OZ + hw + 0.04);
    for (const s of [-1, 1]) box("wood", X0, x + 0.03, OY - hh, OY + hh, OZ + s * (hw + 0.02) - 0.02, OZ + s * (hw + 0.02) + 0.02);
    // local y -> +x (out of the wall), local z -> -y (ranks run down), local x -> -z
    const R = new THREE.Matrix4().makeRotationZ(-Math.PI / 2).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2));
    placeM(x, OY, OZ, R, () => boardTop(1, OK));
    // komadai panels either side, low, with the captured pieces
    for (const [s, dir, n] of [[-1, 1, 3], [1, -1, 2]]) {
      const z = OZ + s * (hw + 0.2), y = s < 0 ? OY - hh + 0.16 : OY + hh - 0.16;
      box("pale", X0, x, y - 0.14, y + 0.14, z - 0.14, z + 0.14);
      box("wood", X0, x + 0.02, y - 0.16, y - 0.14, z - 0.15, z + 0.15);
      placeM(x, y, z, R, () => captured(n, dir, OK * 0.8));
    }
  }

  // ---------- tatami platform (-X, under the wall board) with two legged boards ----------
  const PH = F + 0.25, PX1 = -0.34, PZ0 = -0.84;
  box("wood", X0, PX1, F, PH, PZ0, Z1); // riser (the mats sit on it)
  box("wood", PX1 - 0.06, PX1 + 0.02, F, PH + 0.005, PZ0 - 0.02, Z1); // kamachi
  box("wood", X0, PX1 + 0.02, F, PH + 0.005, PZ0 - 0.02, PZ0 + 0.06);
  const TY = PH + 0.002;
  for (let k = 0; k < 3; k++) { // three mats, 1.76 x 0.88, long side along x
    const z0 = PZ0 + k * 0.88, z1 = z0 + 0.88;
    flat("tatami", X0, PX1 - 0.06, Math.max(z0, PZ0 + 0.06), z1, TY);
    for (const z of [z0 + 0.025, z1 - 0.025]) if (z > PZ0 + 0.07) flat("seam", X0, PX1 - 0.06, z - 0.022, z + 0.022, TY + 0.001); // heri
  }
  const boards = [[-1.22, -0.25, 0], [-1.22, 1.12, 3]];
  boards.forEach(([x, z, v]) => place(x, TY, z, Math.PI / 2, () => leggedBoard(v)));

  // ---------- tables (+X half, players along x so no chair stands between the camera and a board) ----------
  const tables = [[0.45, -1.05, 1], [1.32, 0.95, 2]];
  tables.forEach(([x, z, v]) => place(x, F, z, Math.PI / 2, () => tableSet(v)));

  // ---------- back wall: name-tag board, counter with urn and cups, piece-box shelf, coat rack ----------
  const TX0 = 0.55, TX1 = 1.95, TY0 = 1.3, TY1 = 2.1, wz = Z0;
  box("wood", TX0, TX1, TY0, TY1, wz, wz + 0.03); // backing
  box("wood", TX0 - 0.03, TX1 + 0.03, TY1, TY1 + 0.04, wz, wz + 0.06); // frame top
  box("wood", TX0 - 0.03, TX1 + 0.03, TY0 - 0.04, TY0, wz, wz + 0.06);
  for (const x of [TX0 - 0.015, TX1 + 0.015]) box("wood", x - 0.015, x + 0.015, TY0, TY1, wz, wz + 0.06);
  const ROWS = 5, PER = 24, rowH = (TY1 - TY0) / ROWS, pw = (TX1 - TX0 - 0.04) / PER;
  for (let r = 0; r < ROWS; r++) {
    const y0 = TY0 + r * rowH + 0.012, y1 = y0 + rowH - 0.03;
    box("dark", TX0, TX1, y1 + 0.004, y1 + 0.016, wz + 0.03, wz + 0.045); // rail
    for (let k = 0; k < PER; k++) {
      if ((r * 5 + k * 3) % 11 === 0) continue; // a few hooks stand empty
      const x = TX0 + 0.02 + k * pw;
      box("pale", x + 0.006, x + pw - 0.006, y0, y1, wz + 0.035, wz + 0.045);
    }
  }
  // counter
  const CX0 = 1.1, CX1 = 2.0, CH = 0.85, CD = 0.42;
  box("pale", CX0, CX1, F, CH, Z0, Z0 + CD);
  box("wood", CX0 - 0.01, CX1 + 0.01, CH, CH + 0.025, Z0, Z0 + CD + 0.02);
  box("wood", CX0 + 0.03, (CX0 + CX1) / 2 - 0.01, F + 0.1, CH - 0.06, Z0 + CD, Z0 + CD + 0.005); // door panels
  box("wood", (CX0 + CX1) / 2 + 0.01, CX1 - 0.03, F + 0.1, CH - 0.06, Z0 + CD, Z0 + CD + 0.005);
  {
    const ux = 1.75, uz = Z0 + 0.2, uy = CH + 0.025;
    lathe("metal", ux, uz, [[0.12, uy], [0.13, uy + 0.03], [0.13, uy + 0.3], [0.11, uy + 0.34], [0.05, uy + 0.37], [0.0, uy + 0.375]], 10);
    lathe("dark", ux, uz, [[0.018, uy + 0.37], [0.02, uy + 0.4], [0.0, uy + 0.405]], 6); // knob
    rod("dark", [ux, uy + 0.1, uz + 0.11], [ux, uy + 0.1, uz + 0.17], 0.012, 6, 0); // tap
    rod("dark", [ux, uy + 0.1, uz + 0.17], [ux, uy + 0.07, uz + 0.17], 0.01, 6, 0.4);
    box("dark", ux - 0.03, ux + 0.03, uy + 0.36, uy + 0.37, uz - 0.14, uz + 0.14); // handle
    for (const s of [-1, 1]) box("dark", ux - 0.008, ux + 0.008, uy + 0.3, uy + 0.37, uz + s * 0.13 - 0.008, uz + s * 0.13 + 0.008);
    // tray of cups
    const tx = 1.36, tz = Z0 + 0.24;
    box("wood", tx - 0.17, tx + 0.17, uy, uy + 0.015, tz - 0.12, tz + 0.12);
    for (let i = 0; i < 6; i++) {
      const cx = tx - 0.1 + (i % 3) * 0.1, cz = tz - 0.05 + Math.floor(i / 3) * 0.1;
      lathe("metal", cx, cz, [[0.026, uy + 0.015], [0.036, uy + 0.085], [0.0, uy + 0.085]], 7);
    }
  }
  // piece-box shelf over the platform
  {
    const SX0 = -1.95, SX1 = -0.6;
    for (const sy of [1.35, 1.7]) {
      box("wood", SX0, SX1, sy - 0.025, sy, Z0, Z0 + 0.22);
      for (const x of [SX0 + 0.1, SX1 - 0.1]) box("wood", x - 0.015, x + 0.015, sy - 0.12, sy - 0.025, Z0, Z0 + 0.03); // bracket
      let x = SX0 + 0.04;
      for (let k = 0; x < SX1 - 0.12; k++) {
        const w = 0.09 + (k % 3) * 0.01, hh = 0.07 + (k % 2) * 0.015;
        if (k % 4 === 3) { // a box lying flat, a lid on top
          box("pale", x, x + 0.12, sy, sy + 0.05, Z0 + 0.04, Z0 + 0.18);
          box("wood", x - 0.004, x + 0.124, sy + 0.05, sy + 0.065, Z0 + 0.036, Z0 + 0.184);
          x += 0.14;
        } else {
          box("pale", x, x + w, sy, sy + hh, Z0 + 0.05, Z0 + 0.17);
          box("wood", x - 0.004, x + w + 0.004, sy + hh, sy + hh + 0.018, Z0 + 0.046, Z0 + 0.174);
          x += w + 0.025;
        }
      }
    }
  }
  // coat rack: three feet, a pole, hooks, a coat and a hat
  {
    const rx = -0.12, rz = -1.5, top = 1.75;
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2 + 0.4; rod("wood", [rx, F + 0.03, rz], [rx + Math.sin(a) * 0.25, F + 0.015, rz + Math.cos(a) * 0.25], 0.016, 4, 0.3); }
    rod("wood", [rx, F, rz], [rx, F + top, rz], 0.02, 6, 0);
    lathe("wood", rx, rz, [[0.03, F + top], [0.0, F + top + 0.04]], 6);
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.3; rod("wood", [rx, F + top - 0.08, rz], [rx + Math.sin(a) * 0.14, F + top - 0.02, rz + Math.cos(a) * 0.14], 0.009, 4, 0.3); }
    // coat hanging on the front hook: a tapered slab, shoulders to hem
    const cz = rz + 0.13, cy = F + top - 0.06;
    lathe("metal", rx + 0.02, cz, [[0.0, cy - 0.95], [0.17, cy - 0.94], [0.15, cy - 0.5], [0.13, cy - 0.15], [0.07, cy - 0.02], [0.0, cy]], 7);
    // hat on the top
    lathe("dark", rx, rz, [[0.14, F + top + 0.02], [0.14, F + top + 0.035], [0.08, F + top + 0.04], [0.075, F + top + 0.12], [0.0, F + top + 0.13]], 8);
  }

  // ---------- spare boards stacked in the front-left corner ----------
  for (let k = 0; k < 6; k++) {
    const yaw = (((k * 5) % 7) - 3) * 0.035, y = F + k * 0.061;
    place(1.82, y, 1.55, yaw, () => box("pale", -BW / 2, BW / 2, 0, 0.06, -BL / 2, BL / 2));
  }
  place(1.82, F + 6 * 0.061, 1.55, 0.04, () => {
    const gx = (CW * 9) / 2, gz = (CL * 9) / 2, lw = 0.0018;
    for (let i = 0; i <= 9; i++) { flat("grid", -gx + i * CW - lw, -gx + i * CW + lw, -gz, gz, 0.0012); flat("grid", -gx, gx, -gz + i * CL - lw, -gz + i * CL + lw, 0.0012); }
  });

  // ---------- meshes: one per material signature ----------
  const MAT = {
    wall: [c.wall, c.wallShade, 0.1, 3],
    floor: [c.floor, c.floor, 0.1, 3],
    seam: [c.seam, c.seam, 0.1, 0],
    grid: [c.dark, c.dark, 0.1, 0],
    dark: [c.dark, c.dark, 0.1, 1.5],
    wood: [c.wood, c.woodShade, 0.1, 2.5],
    pale: [c.pale, c.paleShade, 0.1, 2],
    tatami: [c.tatami, c.tatami, 0.1, 0],
    piece: [c.piece, c.pieceShade, 0.1, 1],
    accent: [c.accent, c.accentShade, 0.2, 2],
    metal: [c.metal, c.metalShade, 0.1, 2],
    glow: [c.glow, c.glow, -0.25, 0],
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

  // focus markers (no geometry, nothing poses them): the lab frames a detail with --focus <name>
  const marks = [
    ["board1", [boards[0][0], TY + 0.3, boards[0][1]]], ["board2", [boards[1][0], TY + 0.3, boards[1][1]]],
    ["table1", [tables[0][0], F + 0.78, tables[0][1]]], ["table2", [tables[1][0], F + 0.78, tables[1][1]]],
    ["oban", [X0, OY, OZ]], ["tags", [(TX0 + TX1) / 2, (TY0 + TY1) / 2, Z0]], ["urn", [1.6, CH + 0.2, Z0 + 0.2]],
  ];
  for (const [name, p] of marks) {
    const o = new THREE.Object3D();
    o.name = name;
    o.position.set(...p);
    body.add(o);
    joints[name] = o;
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
