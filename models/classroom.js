// classroom.js - the Japanese high-school classroom of every slice-of-life anime, static, at real size: a set piece.
// Contract: harness/lab/README.md. Meters, +Y up, the open (cutaway) corridor side faces +X and the back of the
// room +Z, so the lab's front-left cameras look in; the pupils face -Z (the blackboard), their left is -X (the
// windows: light from the writing hand's other side, as in every Japanese school). Floor on y = 0, centred on x = z = 0.
//
// Construction (boxes, 6-sided tubes, pleated lofts and flat quads, all triangle soups merged per material, so the
// whole room is a dozen meshes; boxes are flat-shaded, tubes carry radial normals so a thin steel leg reads round).
// Every triangle is wound away from a point inside its solid (box centre, tube axis, loft column), never by hand.
//   SHELL     floor quad with lighter plank seams; walls as boxes 12 cm thick round the interior, cut into piers, sill
//             walls and lintels at the openings; dark skirting and picture-rail bands (unlined boxes 12 mm proud) draw
//             the floor and ceiling lines. Where the cutaway leaves a wall top open it gets a dark 2 cm section cap,
//             so the cut reads as a cut. Ceiling slab only with { cutaway: false }.
//   WINDOWS   (-X wall) four 2 m bays on 0.2 m piers: an aluminium casing, two sashes on two tracks overlapping at the
//             middle, a transom bar and three transom lights. Glass is two unlined sky plates back to back in the
//             wall's mid-plane, so the frames are the lines. A deep sill board, a curtain rail, and per bay one curtain
//             half drawn across the glass plus one bunched at the next pier: a pleated loft (sine front, flat back)
//             whose fold faces alternate base / shade at threshold 0.45.
//   CORRIDOR  (+X wall, only with { cutaway: false }) two pale-green sliding doors with a glass light each, a dark
//             head and pull, and a row of six high transom windows over the whole wall.
//   FRONT     (-Z) the green board 4.0 x 1.2 in a 3 cm aluminium frame, its chalk tray with three chalks and an eraser,
//             chalk lines and the vertical date / duty column at the right edge (unlined plates 3 mm proud); a low
//             dais the width of the room's middle and the teacher's desk on it (two steel pedestals and a drawer, a
//             modesty panel toward the pupils, birch top, a stack of books); the wall clock above the board: dark
//             bezel ring, blank pale face, hour and minute hands at 8:40.
//   BACK      (+Z) a wall-wide cubby locker (3 rows of 12, dark openings, a fixed hash puts bags and boxes in some),
//             under a green felt notice board with pinned sheets (the board only with the wall, { cutaway: false }).
//   DESKS     a rows x cols grid of student sets in the style of the school-desk model, on their own geometry: birch
//             top with a dark edge band, two inverted-U tube side frames on floor runners and rubber shoes, a low
//             stretcher, a steel book box open to the pupil and a bag hook; the chair a birch seat and bowed back on
//             splayed tube legs, the rear pair running up as back posts. Chairs are tucked by varying amounts and
//             turned a little (a fixed hash, no randomness).
//   LIGHTS    twelve fluorescent fittings in three lines along the room: a steel channel with two glowing tubes under
//             it, hung on two rods to the ceiling line (they stay in the cutaway: the strips are an identity cue).
// Proportions (real size, base unit the storey H = 3.0 m): interior 7.5 (x) by 9.0 (z), walls and ceiling 3.0
//   (meta.height); window sill 0.85, sash head 2.25, transoms to 2.65; board from 0.95 to 2.15; dais 0.18 x 6.0 x 0.9;
//   doors 0.95 x 1.95, transoms 2.15-2.7; lockers 1.05 high, 0.4 deep; clock 0.36 across at 2.55; desk 0.70
//   (top 0.65 x 0.45), chair seat 0.43, back to 0.79; grid pitch 1.05 (x) by 1.0 (z), front desk 1.6 m off the board.
// Options: build(THREE, kit, colors, { height, rows = 6, cols = 6, cutaway = true, evening = false }).
//   height      scales the whole room uniformly so the wall top is `height` (default 3.0 m), as the torii's.
//   rows, cols  the desk grid, 1-7 each, filled from the front row back (7 x 7 still clears the lockers and walls).
//   cutaway     true (default): the corridor wall and the ceiling are left out, and the back wall stops at the locker
//               top, so cameras on the +X / +Z side (the lab's three4 and hero) look straight in. false: the closed
//               room (corridor wall with doors, full back wall with the notice board, ceiling), for cameras inside it.
//   evening     warm window light, same script: the glass turns practical yellow, the curtains' fold shade turns
//               practical, the low sun throws one practical patch per bay across the floor, and the tubes go off.
// Budget: ~28k triangles at 6 x 6 (a desk set ~640, the room ~5k; 37k at 7 x 7), 14 meshes (13 in the evening).
// Ink in pixels: walls, wood, board and caps 3, steel and curtains 2 (a room is seen small: thin tubes keep their colour).
// Colours (meadow, the school models' script), base / shade:
//   walls, ceiling, lockers, birch (desk tops, seats, backs, dais, sills)  moon #f7f3e1 / skin #f0c2ae, threshold 0.1
//                            (one mesh; the +Z-facing front wall, dot 0.30, stays lit; the back wall reads skin)
//   floor                    skin #f0c2ae flat, plank seams moon
//   steel (sashes, frames, tray, legs, book boxes, teacher's desk, fittings)  sclera #f6f3ee / sky #d7ecef
//   glass                    sky #d7ecef one tone (evening practical #f2c94c)
//   curtains                 sclera #f6f3ee / sky #d7ecef (evening shade practical)
//   board                    iris #3f8a47 / hair #2c5131; chalk, sheets, clock face sclera flat
//   bands, caps, edge bands, rubber, cubby openings, clock bezel and hands  hair #2c5131 flat (they are lines)
//   doors, felt, books, some bags  line #a9d16e / iris #3f8a47; red chalk, sheets, bags accent #d9483b flat;
//   yellow chalk, sheets, evening sun practical #f2c94c flat; tubes moon glow (threshold -0.25)

export const meta = {
  name: "classroom",
  height: 3.0,
  script: "meadow",
  colors: {
    wall: "#f7f3e1", wallShade: "#f0c2ae",
    floor: "#f0c2ae", seam: "#f7f3e1",
    wood: "#f7f3e1", woodShade: "#f0c2ae",
    steel: "#f6f3ee", steelShade: "#d7ecef",
    glass: "#d7ecef",
    curtain: "#f6f3ee", curtainShade: "#d7ecef",
    board: "#3f8a47", boardShade: "#2c5131",
    dark: "#2c5131",
    green: "#a9d16e", greenShade: "#3f8a47",
    paper: "#f6f3ee", yellow: "#f2c94c", red: "#d9483b",
    tube: "#f7f3e1",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const NATURAL = 3.0;
  const { height = NATURAL, cutaway = true, evening = false } = opts;
  const rows = Math.max(1, Math.min(7, Math.floor(opts.rows ?? 6)));
  const cols = Math.max(1, Math.min(7, Math.floor(opts.cols ?? 6)));
  const root = new THREE.Group();
  root.name = "classroom";
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
  // a flat quad facing `n` (unit axis), centred on a point: for glass, sheets, seams, sun patches
  function plate(key, ctr, n, w, h) {
    const up = Math.abs(n[1]) > 0.5 ? [0, 0, 1] : [0, 1, 0];
    const r = nrm(cross(up, n)), u = cross(n, r);
    const P = (a, b) => add(ctr, add(mul(r, a * w / 2), mul(u, b * h / 2)));
    const ref = sub(ctr, n);
    quad(key, P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), ref);
  }
  // glass: two plates back to back (1 mm apart), so a pane reads from both sides in every mode
  const pane = (ctr, n, w, h) => {
    plate("glass", add(ctr, mul(n, 0.001)), n, w, h);
    plate("glass", sub(ctr, mul(n, 0.001)), mul(n, -1), w, h);
  };
  // a capped 6-sided tube from a to b (straight), radius r; ends pushed out by r so joints overlap
  function rod(key, a, b, r, sides = 6) {
    const T = nrm(sub(b, a));
    a = sub(a, mul(T, r * 0.6)), b = add(b, mul(T, r * 0.6));
    const up = Math.abs(T[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = nrm(cross(up, T)), w = cross(T, u);
    const ring = (P) => Array.from({ length: sides }, (_, j) => {
      const t = (j / sides) * Math.PI * 2, d = add(mul(u, Math.cos(t)), mul(w, Math.sin(t)));
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
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const place = (x, z, yaw, fn) => {
    const saved = M;
    M = saved.clone().multiply(new THREE.Matrix4().makeTranslation(x, 0, z)).multiply(new THREE.Matrix4().makeRotationY(yaw));
    fn();
    M = saved;
  };

  // ---------- the shell ----------
  const W = 3.75, L = 4.5, H = 3.0, T = 0.12; // interior half-width (x), half-length (z), height, wall thickness
  quad("floor", [-W, 0, -L], [W, 0, -L], [W, 0, L], [-W, 0, L], [0, -1, 0]);
  for (let i = 1; i < 13; i++) { // plank seams along the room (toward the board)
    const x = -W + (i * 2 * W) / 13;
    quad("seam", [x - 0.006, 0.0015, -L], [x + 0.006, 0.0015, -L], [x + 0.006, 0.0015, L], [x - 0.006, 0.0015, L], [x, -1, 0]);
  }
  const SILL = 0.85, SASH = 2.25, HEAD = 2.65, BAY = 2.0, PIER = 0.2;
  const bays = [-3, -1, 1, 3]; // bay centres along z
  // window wall (-X): sill wall, lintel, piers
  const wx0 = -W - T, wx1 = -W;
  // a wall box; a top left open by the cutaway gets a dark section cap, so the cut reads as a cut
  const CAP = 0.02;
  const wall = (x0, x1, y0, y1, z0, z1, cut = cutaway) => {
    box("wall", x0, x1, y0, cut ? y1 - CAP : y1, z0, z1);
    if (cut) box("cap", x0, x1, y1 - CAP, y1, z0, z1);
  };
  box("wall", wx0, wx1, 0, SILL, -L - T, L + T);
  wall(wx0, wx1, HEAD, H, -L - T, L + T);
  box("wall", wx0, wx1, SILL, HEAD, -L - T, -4 + PIER / 2);
  for (const z of [-2, 0, 2]) box("wall", wx0, wx1, SILL, HEAD, z - PIER / 2, z + PIER / 2);
  box("wall", wx0, wx1, SILL, HEAD, 4 - PIER / 2, L + T);
  // sashes and glass per bay
  const FR = 0.035; // frame bar width
  const xm = (wx0 + wx1) / 2;
  for (const zc of bays) {
    const z0 = zc - BAY / 2 + PIER / 2, z1 = zc + BAY / 2 - PIER / 2;
    // outer frame of the opening (aluminium casing)
    box("steel", wx0 - 0.005, wx1 + 0.012, SILL, SILL + FR, z0, z1);
    box("steel", wx0 - 0.005, wx1 + 0.012, HEAD - FR, HEAD, z0, z1);
    box("steel", wx0 - 0.005, wx1 + 0.012, SILL, HEAD, z0, z0 + FR);
    box("steel", wx0 - 0.005, wx1 + 0.012, SILL, HEAD, z1 - FR, z1);
    box("steel", wx0 - 0.005, wx1 + 0.012, SASH - FR / 2, SASH + FR / 2, z0, z1); // transom bar
    // two sashes on two tracks, overlapping 6 cm at the middle
    for (const [s, dx] of [[-1, -0.03], [1, 0.03]]) {
      const sz0 = s < 0 ? z0 + FR : zc - 0.03, sz1 = s < 0 ? zc + 0.03 : z1 - FR;
      const x0 = xm + dx - 0.014, x1 = xm + dx + 0.014;
      box("steel", x0, x1, SILL + FR, SILL + FR + 0.05, sz0, sz1);
      box("steel", x0, x1, SASH - FR / 2 - 0.045, SASH - FR / 2, sz0, sz1);
      box("steel", x0, x1, SILL + FR, SASH - FR / 2, sz0, sz0 + 0.04);
      box("steel", x0, x1, SILL + FR, SASH - FR / 2, sz1 - 0.04, sz1);
      pane([xm + dx, (SILL + SASH) / 2 + 0.01, (sz0 + sz1) / 2], [1, 0, 0], sz1 - sz0 - 0.07, SASH - SILL - 0.12);
    }
    // transom lights: three panes over the sashes
    for (let k = 0; k < 3; k++) {
      const a = z0 + FR + (k * (z1 - z0 - 2 * FR)) / 3, b = z0 + FR + ((k + 1) * (z1 - z0 - 2 * FR)) / 3;
      if (k > 0) box("steel", xm - 0.015, xm + 0.015, SASH, HEAD - FR, a - 0.015, a + 0.015);
      pane([xm, (SASH + HEAD - FR) / 2, (a + b) / 2], [1, 0, 0], b - a - 0.01, HEAD - FR - SASH);
    }
  }
  // sill board, curtain rail
  box("wood", wx1, wx1 + 0.16, SILL - 0.03, SILL, -L, L);
  box("steel", wx1 + 0.12, wx1 + 0.15, HEAD + 0.1, HEAD + 0.13, -L + 0.2, L - 0.2);
  // curtains: per bay one panel half drawn from the front pier, one bunched against the back pier
  const CY0 = SILL + 0.06, CY1 = HEAD + 0.1;
  function curtain(za, zb, folds, depth) {
    const n = folds * 4, xb = wx1 + 0.1, xf = xb + 0.04;
    const col = (i) => {
      const z = za + ((zb - za) * i) / n, f = xf + depth * (0.5 + 0.5 * Math.sin((i / 4) * Math.PI * 2));
      return [[xf - 0.03 + (f - xf), CY0, z], [f, CY1, z], [xb, CY1, z], [xb, CY0, z]].map((p, k) => (k === 0 ? [f, CY0, z] : p));
    };
    const C = Array.from({ length: n + 1 }, (_, i) => col(i));
    const mid = (a, b) => [xb + 0.005, (CY0 + CY1) / 2, (a[0][2] + b[0][2]) / 2];
    for (let i = 0; i < n; i++)
      for (let k = 0; k < 4; k++) quad("curtain", C[i][k], C[i][(k + 1) % 4], C[i + 1][(k + 1) % 4], C[i + 1][k], mid(C[i], C[i + 1]));
    for (const [A, B] of [[C[0], C[1]], [C[n], C[n - 1]]]) quad("curtain", A[0], A[1], A[2], A[3], mid(A, B));
  }
  bays.forEach((zc, i) => {
    const z0 = zc - BAY / 2 + PIER / 2, z1 = zc + BAY / 2 - PIER / 2;
    const drawn = 0.55 + 0.25 * hash(i + 3);
    curtain(z0 - 0.06, z0 + drawn, 4, 0.07);
    curtain(z1 - 0.28, z1 + 0.06, 3, 0.1);
  });
  // evening sun: one patch per bay thrown across the floor (the sun low in the -X sky, a little behind the pupils)
  if (evening)
    bays.forEach((zc) => {
      const z0 = zc - 0.6, z1 = zc + 0.6, x0 = -W + 0.25, x1 = -W + 3.6, sk = 0.88; // stays inside the floor
      quad("sun", [x0, 0.003, z0], [x0, 0.003, z1], [x1, 0.003, z1 + sk], [x1, 0.003, z0 + sk], [0, -1, 0]);
    });

  // front wall (-Z): plain, with the board
  wall(-W, W + T, 0, H, -L - T, -L);
  // back wall (+Z): to the locker top in the cutaway, full otherwise
  const LOCK = 1.05;
  wall(-W, W + T, 0, cutaway ? LOCK + 0.04 : H, L, L + T);
  // corridor wall (+X): two doors, transom row
  const DOOR = 1.95, DW = 0.95, doors = [-L + 0.9, L - 0.9];
  if (!cutaway) {
    const cx0 = W, cx1 = W + T, TR0 = 2.15, TR1 = 2.7;
    box("wall", cx0, cx1, TR1, H, -L, L);
    box("wall", cx0, cx1, DOOR, TR0, -L, L);
    box("wall", cx0, cx1, 0, DOOR, -L, doors[0] - DW / 2);
    box("wall", cx0, cx1, 0, DOOR, doors[0] + DW / 2, doors[1] - DW / 2);
    box("wall", cx0, cx1, 0, DOOR, doors[1] + DW / 2, L);
    const xm2 = (cx0 + cx1) / 2;
    for (let k = 0; k < 6; k++) {
      const a = -L + (k * 2 * L) / 6, b = -L + ((k + 1) * 2 * L) / 6;
      box("steel", cx0 - 0.012, cx1 + 0.005, TR0, TR1, a, a + 0.04);
      pane([xm2, (TR0 + TR1) / 2, (a + b) / 2 + 0.02], [-1, 0, 0], b - a - 0.04, TR1 - TR0);
    }
    box("steel", cx0 - 0.012, cx1 + 0.005, TR0, TR1, L - 0.04, L);
    box("steel", cx0 - 0.012, cx1 + 0.005, TR0, TR0 + 0.04, -L, L);
    box("steel", cx0 - 0.012, cx1 + 0.005, TR1 - 0.04, TR1, -L, L);
    for (const zd of doors) {
      box("door", cx0 + 0.02, cx0 + 0.06, 0.01, DOOR - 0.01, zd - DW / 2, zd + DW / 2 + 0.02);
      pane([cx0 + 0.015, 1.45, zd + 0.15], [-1, 0, 0], 0.4, 0.55);
      box("dark", cx0 + 0.012, cx0 + 0.02, 0.95, 1.1, zd - DW / 2 + 0.06, zd - DW / 2 + 0.1); // pull
      box("dark", cx0 - 0.01, cx1, DOOR, DOOR + 0.04, zd - DW / 2, zd + DW / 2); // head
    }
  }
  if (!cutaway) box("wall", -W, W, H - 0.08, H - 0.001, -L, L); // ceiling slab, inside the walls
  // skirting and picture rail bands on the remaining walls (flat lines)
  const bandW = (y0, y1, along) => {
    if (along !== "x") box("dark", -W, -W + 0.012, y0, y1, -L, L);
    if (!cutaway && along !== "x") {
      box("dark", W - 0.012, W, y0, y1, -L, doors[0] - DW / 2);
      box("dark", W - 0.012, W, y0, y1, doors[0] + DW / 2, doors[1] - DW / 2);
      box("dark", W - 0.012, W, y0, y1, doors[1] + DW / 2, L);
    }
  };
  bandW(0, 0.08);
  box("dark", -W, W, 0, 0.08, -L, -L + 0.012);
  box("dark", -W, W, 0, 0.08, L - 0.012, L);
  box("dark", -W, W, H - 0.12, H - 0.09, -L, -L + 0.012);
  if (!cutaway) box("dark", -W, W, H - 0.12, H - 0.09, L - 0.012, L);

  // ---------- front: board, tray, dais, teacher's desk, clock ----------
  const BW = 4.0, B0 = 0.95, B1 = 2.15, fz = -L;
  box("board", -BW / 2, BW / 2, B0, B1, fz, fz + 0.02);
  box("steel", -BW / 2 - 0.03, BW / 2 + 0.03, B1, B1 + 0.03, fz, fz + 0.035);
  box("steel", -BW / 2 - 0.03, -BW / 2, B0 - 0.03, B1, fz, fz + 0.035);
  box("steel", BW / 2, BW / 2 + 0.03, B0 - 0.03, B1, fz, fz + 0.035);
  box("steel", -BW / 2 - 0.03, BW / 2 + 0.03, B0 - 0.03, B0, fz, fz + 0.035);
  box("steel", -BW / 2, BW / 2, B0 - 0.05, B0 - 0.03, fz, fz + 0.1); // chalk tray floor
  box("steel", -BW / 2, BW / 2, B0 - 0.05, B0, fz + 0.09, fz + 0.1); // its lip
  for (const [x, k] of [[-0.6, "paper"], [-0.5, "yellow"], [0.9, "red"]]) rod(k, [x, B0 - 0.018, fz + 0.05], [x + 0.08, B0 - 0.018, fz + 0.05], 0.007);
  box("dark", 1.25, 1.4, B0 - 0.03, B0 + 0.0, fz + 0.03, fz + 0.08); // eraser
  // chalk: the date / duty column at the right edge, a title line and a few rows of dashes
  const chalk = (x0, x1, y, w = 0.012) => plate("paper", [(x0 + x1) / 2, y, fz + 0.023], [0, 0, 1], x1 - x0, w);
  const chalkV = (x, y0, y1) => plate("paper", [x, (y0 + y1) / 2, fz + 0.023], [0, 0, 1], 0.012, y1 - y0);
  chalkV(1.62, 1.1, 2.0), chalkV(1.78, 1.45, 2.0);
  chalk(-1.7, -0.6, 1.95, 0.02);
  [[-1.75, -0.2, 1.75], [-1.75, 0.4, 1.6], [-1.75, -0.5, 1.45], [-1.6, 0.9, 1.3]].forEach(([a, b, y]) => chalk(a, b, y));
  // dais and teacher's desk
  const DX = 3.0, DZ = 0.9, DH = 0.18;
  box("wood", -DX, DX, 0, DH, fz, fz + DZ);
  box("dark", -DX, DX, DH - 0.012, DH, fz + DZ, fz + DZ + 0.006); // nosing line
  const tz = fz + 0.62, ty = DH + 0.74;
  box("wood", -0.65, 0.65, ty - 0.03, ty, tz - 0.33, tz + 0.33);
  box("steel", -0.62, -0.18, DH, ty - 0.03, tz - 0.3, tz + 0.3); // pedestal
  box("steel", 0.18, 0.62, DH, ty - 0.03, tz - 0.3, tz + 0.3);
  box("steel", -0.18, 0.18, ty - 0.2, ty - 0.03, tz - 0.3, tz + 0.3); // drawer
  box("steel", -0.6, 0.6, DH + 0.1, ty - 0.2, tz + 0.27, tz + 0.29); // modesty panel toward the pupils
  for (const y of [ty - 0.3, ty - 0.52]) box("dark", 0.25, 0.55, y, y + 0.012, tz + 0.3, tz + 0.306);
  box("dark", -0.55, -0.25, ty - 0.3, ty - 0.288, tz + 0.3, tz + 0.306);
  // a stack of books on the desk
  box("green", 0.2, 0.46, ty, ty + 0.04, tz - 0.1, tz + 0.08);
  box("paper", 0.22, 0.44, ty + 0.04, ty + 0.07, tz - 0.08, tz + 0.06);
  // clock above the board
  const CY = 2.55, CR = 0.18;
  {
    const n = 16, ring = (r, z) => Array.from({ length: n }, (_, j) => [Math.cos((j / n) * Math.PI * 2) * r, CY + Math.sin((j / n) * Math.PI * 2) * r, z]);
    const o0 = ring(CR, fz), o1 = ring(CR, fz + 0.05), i1 = ring(CR - 0.025, fz + 0.05), i0 = ring(CR - 0.025, fz + 0.035);
    const ctr = [0, CY, fz + 0.025];
    for (let j = 0; j < n; j++) {
      const k = (j + 1) % n;
      quad("dark", o0[j], o0[k], o1[k], o1[j], ctr);
      tri("dark", o1[j], o1[k], i1[k], [0, CY, fz]), tri("dark", o1[j], i1[k], i1[j], [0, CY, fz]);
      tri("dark", i1[j], i1[k], i0[k], [0, CY, fz + 0.5]), tri("dark", i1[j], i0[k], i0[j], [0, CY, fz + 0.5]);
      tri("face", [0, CY, fz + 0.035], i0[j], i0[k], [0, CY, fz]);
    }
    const hand = (ang, len, w) => {
      const d = [Math.sin(ang), Math.cos(ang), 0], p = [Math.cos(ang), -Math.sin(ang), 0];
      const z = fz + 0.042, a = add([0, CY, z], mul(d, -0.02)), b = add([0, CY, z], mul(d, len));
      quad("hands", add(a, mul(p, w)), add(b, mul(p, w * 0.5)), add(b, mul(p, -w * 0.5)), add(a, mul(p, -w)), [0, CY, fz]);
    };
    hand(((8 + 40 / 60) / 12) * Math.PI * 2, 0.09, 0.012); // 8:40, clockwise seen from the room; a blank face
    hand((40 / 60) * Math.PI * 2, 0.135, 0.008);
  }

  // ---------- back: cubby lockers and notice board ----------
  const LZ1 = L, LZ0 = L - 0.4, LX = 3.55;
  box("wood", -LX, LX, 0, LOCK, LZ0, LZ1);
  box("dark", -LX, LX, 0, 0.07, LZ0 - 0.004, LZ0 + 0.01); // plinth line
  const CC = 12, CRW = 3, cw = (2 * LX - 0.04) / CC, ch = (LOCK - 0.11) / CRW;
  for (let r = 0; r < CRW; r++)
    for (let k = 0; k < CC; k++) {
      const x0 = -LX + 0.02 + k * cw + 0.02, x1 = x0 + cw - 0.04, y0 = 0.09 + r * ch + 0.02, y1 = y0 + ch - 0.04;
      plate("dark", [(x0 + x1) / 2, (y0 + y1) / 2, LZ0 - 0.003], [0, 0, -1], x1 - x0, y1 - y0);
      const h = hash(r * 31 + k * 7);
      if (h > 0.55) box(h > 0.85 ? "red" : h > 0.7 ? "steel" : "green", x0 + 0.04, x1 - 0.04 - 0.06 * hash(k), y0, y0 + (y1 - y0) * (0.55 + 0.3 * hash(k + r)), LZ0 - 0.05, LZ0 + 0.2);
    }
  if (!cutaway) {
    const NB0 = 1.35, NB1 = 2.3, NX = 2.6, nz = L;
    box("green", -NX, NX, NB0, NB1, nz - 0.02, nz);
    box("steel", -NX - 0.03, NX + 0.03, NB1, NB1 + 0.03, nz - 0.03, nz);
    box("steel", -NX - 0.03, NX + 0.03, NB0 - 0.03, NB0, nz - 0.03, nz);
    box("steel", -NX - 0.03, -NX, NB0, NB1, nz - 0.03, nz);
    box("steel", NX, NX + 0.03, NB0, NB1, nz - 0.03, nz);
    for (let k = 0; k < 9; k++) {
      const h = hash(k + 50), w = 0.3 + 0.2 * hash(k + 60), hh = 0.3 + 0.15 * h;
      const x = -NX + 0.3 + k * 0.6, y = NB0 + 0.15 + hh / 2 + 0.35 * hash(k + 70);
      plate(h > 0.75 ? "yellow" : h > 0.6 ? "red" : "paper", [x, Math.min(y, NB1 - hh / 2 - 0.06), nz - 0.023], [0, 0, -1], w, hh);
    }
  }

  // ---------- fluorescent fittings ----------
  for (const x of [-2.2, 0, 2.2])
    for (const z of [-3.0, -1.0, 1.0, 3.0]) {
      const y = 2.72;
      box("steel", x - 0.08, x + 0.08, y, y + 0.06, z - 0.62, z + 0.62);
      for (const dx of [-0.04, 0.04]) rod("tube", [x + dx, y - 0.012, z - 0.6], [x + dx, y - 0.012, z + 0.6], 0.014);
      for (const dz of [-0.45, 0.45]) rod("steel", [x, y + 0.06, z + dz], [x, H - (cutaway ? 0 : 0.08), z + dz], 0.005, 4);
    }

  // ---------- desks ----------
  const TUBE = 0.012;
  function desk() { // local: top centred on x = z = 0, the pupil at +Z, the board at -Z
    const DW2 = 0.325, DD = 0.225, DHt = 0.7, TT = 0.022;
    box("wood", -DW2, DW2, DHt - TT, DHt, -DD, DD);
    const e = 0.004, ey0 = DHt - TT - 0.001, ey1 = DHt - 0.002;
    box("dark", -DW2 - e, DW2 + e, ey0, ey1, DD - 0.006, DD + e);
    box("dark", -DW2 - e, DW2 + e, ey0, ey1, -DD - e, -DD + 0.006);
    box("dark", DW2 - 0.006, DW2 + e, ey0, ey1, -DD, DD);
    box("dark", -DW2 - e, -DW2 + 0.006, ey0, ey1, -DD, DD);
    const fx = 0.285, lz = 0.185, ry = DHt - TT - TUBE;
    for (const s of [-1, 1]) {
      const x = s * fx;
      rod("steel", [x, 0.03, lz], [x, ry, lz], TUBE);
      rod("steel", [x, 0.03, -lz], [x, ry, -lz], TUBE);
      rod("steel", [x, ry, -lz], [x, ry, lz], TUBE);
      rod("steel", [x, 0.03, -lz - 0.03], [x, 0.03, lz + 0.03], TUBE); // runner on the floor
      box("dark", x - 0.016, x + 0.016, 0, 0.018, lz - 0.02, lz + 0.05);
      box("dark", x - 0.016, x + 0.016, 0, 0.018, -lz - 0.05, -lz + 0.02);
    }
    rod("steel", [-fx, 0.2, -lz], [fx, 0.2, -lz], 0.009); // stretcher on the board side
    // steel book box under the top, open to the pupil
    const bx = fx - TUBE, by0 = 0.56, by1 = DHt - TT - 0.025, t = 0.006;
    box("steel", -bx, bx, by0, by0 + t, -lz, lz - 0.02);
    box("steel", -bx, bx, by0, by1, -lz - t, -lz);
    box("steel", -bx, -bx + t, by0, by1, -lz, lz - 0.02);
    box("steel", bx - t, bx, by0, by1, -lz, lz - 0.02);
    rod("steel", [fx, 0.6, 0.1], [fx + 0.05, 0.6, 0.1], 0.006); // bag hook
    rod("steel", [fx + 0.05, 0.6, 0.1], [fx + 0.05, 0.56, 0.1], 0.006);
  }
  function chair() { // local: seat centred, the pupil faces -Z (toward the desk)
    const SY = 0.43, ST = 0.018, SW = 0.19, SD = 0.18, lx = 0.165, r = 0.011;
    box("wood", -SW, SW, SY - ST, SY, -SD, SD);
    const ry = SY - ST - r;
    for (const s of [-1, 1]) {
      const x = s * lx, xf = s * (lx + 0.012);
      rod("steel", [xf, 0.02, -0.2], [x, ry, -0.15], r); // front leg
      rod("steel", [xf, 0.02, 0.22], [x, ry, 0.15], r); // rear leg
      rod("steel", [x, ry, 0.15], [x, 0.79, 0.2], r); // back post
      rod("steel", [x, ry, -0.15], [x, ry, 0.15], r); // seat rail
      for (const z of [-0.2, 0.22]) box("dark", xf - 0.014, xf + 0.014, 0, 0.022, z - 0.014, z + 0.014);
    }
    rod("steel", [-lx, ry, -0.15], [lx, ry, -0.15], 0.009);
    rod("steel", [-lx, 0.15, 0.17], [lx, 0.15, 0.17], 0.008);
    // bowed backrest in front of the posts (toward the pupil), leaning with them
    const n = 5, BWd = 0.37, by0 = 0.65, by1 = 0.79, th = 0.014, bow = 0.02;
    const zAt = (y) => 0.15 + ((y - ry) / (0.79 - ry)) * 0.05 - r - 0.002;
    const col = (i) => {
      const x = -BWd / 2 + (i / n) * BWd, dz = bow * (1 - (2 * x / BWd) ** 2);
      return [[by0, 0], [by1, 0], [by1, th], [by0, th]].map(([y, f]) => [x, y, zAt(y) + dz + f]);
    };
    const C = Array.from({ length: n + 1 }, (_, i) => col(i));
    const mid = (a, b) => mul(add(add(a[0], a[2]), add(b[0], b[2])), 0.25);
    for (let i = 0; i < n; i++)
      for (let k = 0; k < 4; k++) quad("wood", C[i][k], C[i][(k + 1) % 4], C[i + 1][(k + 1) % 4], C[i + 1][k], mid(C[i], C[i + 1]));
    for (const [A, B] of [[C[0], C[1]], [C[n], C[n - 1]]]) quad("wood", A[0], A[1], A[2], A[3], mid(A, B));
  }
  const PX = 1.05, PZ = 1.0, frontZ = -L + DZ + 0.975, gx0 = -((cols - 1) / 2) * PX - 0.1;
  for (let r = 0; r < rows; r++)
    for (let k = 0; k < cols; k++) {
      const x = gx0 + k * PX, z = frontZ + r * PZ, h = hash(r * 13 + k * 5 + 1);
      place(x, z, 0, desk);
      place(x + 0.06 * (hash(r + k * 3) - 0.5), z + 0.3 + 0.16 * h, (h - 0.5) * 0.35, chair);
    }

  // ---------- meshes: one per material signature ----------
  const MAT = {
    wall: [c.wall, c.wallShade, 0.1, 3],
    floor: [c.floor, c.floor, 0.1, 3],
    seam: [c.seam, c.seam, 0.1, 0],
    wood: [c.wood, c.woodShade, 0.1, 3],
    steel: [c.steel, c.steelShade, 0.1, 2],
    glass: evening ? [c.yellow, c.yellow, 0.1, 0] : [c.glass, c.glass, 0.1, 0],
    curtain: [c.curtain, evening ? c.yellow : c.curtainShade, 0.45, 2],
    board: [c.board, c.boardShade, 0.1, 3],
    dark: [c.dark, c.dark, 0.1, 0],
    cap: [c.dark, c.dark, 0.1, 3],
    hands: [c.dark, c.dark, 0.1, 0],
    door: [c.green, c.greenShade, 0.1, 3],
    green: [c.green, c.greenShade, 0.1, 2],
    face: [c.paper, c.paper, 0.1, 0],
    paper: [c.paper, c.paper, 0.1, 0],
    yellow: [c.yellow, c.yellow, 0.1, 0],
    sun: [c.yellow, c.yellow, 0.1, 0],
    red: [c.red, c.red, 0.1, 0],
    tube: evening ? [c.steel, c.steelShade, 0.1, 0] : [c.tube, c.tube, -0.25, 0],
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
