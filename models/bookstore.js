// bookstore.js - a small neighbourhood bookshop (machi no honya) of slice-of-life anime, static set, as a cutaway.
// Contract: harness/lab/README.md. Meters, +Y up, the open (cutaway) sides face +X and +Z so the lab's front-left
// cameras look in; the -Z wall holds the tall book wall and the register corner, the -X wall the side shelves, the
// shop window and the magazine rack. Stands on y = 0 (the floorboards' top is y = 0.03, joints.floor), centred.
//
// Construction (boxes only, placed by a yaw/pitch matrix where a part leans; every box is wound away from its own
// centre, never by hand; all triangle soups merged per material, flat shaded so shelves and books read crisp):
//   SHELL    a floor slab with dark plank seams every 0.2 m, two walls 0.1 thick with a dark skirting band and a dark
//            cap on the cut top edge; a shop window in the -X wall near the street side (dark frame, mullion and
//            transom bar over pale glass plates, a sill).
//   SHELVES  wall units of dark wood (two sides, six fixed boards, a kickboard and a crown), each bay filled by
//            shelfRow(): books as boxes from a hash (sin-fract, no Math.random) of the bay and slot, width 2-4.5 cm,
//            height 17-30 cm, depth 15-20 cm, in seven spine tones; a few short runs lie flat. A pale shelf-talker card
//            sticks out of a few boards (blank). Units: four bays on the back wall, three on the side wall.
//   TABLE    the hiradai: a light-wood flat table on dark legs in the middle of the floor, two rows of face-up book
//            stacks (2-5 books each, covers in the spine tones) and three blank POP cards on easel stands.
//   MAGS     a low dark-wood magazine rack under the window: three stepped, back-leaning ledges with a lip, magazines
//            leaning on them face out, each cover with one blank colour band.
//   COUNTER  the register counter in the back-right corner: a dark panelled body under a light-wood top with an
//            overhang, a pale register (sloped key block, a display on a post, a drawer line), a stack of pre-folded
//            book-cover wrapping paper (alternating paper and kraft sheets) beside it, a pen tray.
//   PROPS    a two-step light-wood step stool at the foot of the book wall; a blank hanging sign board on two hangers
//            from a dark bracket arm fixed to the back wall over the counter (nothing hangs from the missing ceiling).
// Proportions (real size, base unit the wall height 2.6 m = meta.height): floor 5.0 x 4.0, walls 0.1; wall shelves
//   2.15 tall, 0.32 deep, bays 0.8 wide, board pitch 0.33 from a 0.09 kickboard; centre table 1.5 x 0.85 at 0.74;
//   counter 1.25 x 0.6 at 0.95; magazine rack 1.3 x 0.45, 1.0 tall; window 1.4 x 1.2, sill 1.1; stool 0.45;
//   sign board 0.7 x 0.32, bottom at 1.85.
// Options: build(THREE, kit, colors, { height }): scales the whole set so the wall top is `height` (default 2.6).
// Ink in pixels: walls, floor, furniture 2.5, books and small props 1.5 (a shop is seen small: books keep colour).
// Colours (noon: warm wood browns), base / shade:
//   walls        moon #fff6e4 / sky #f2d7ae, threshold 0.1 (the +Z-facing back wall, dot 0.30, stays lit)
//   floor        sky #f2d7ae / skin #f0c2ae, plank seams iris #5c3d32 flat
//   dark wood    iris #5c3d32 one tone (shelves, legs, counter body, rack, frames, bracket, skirting, caps): noon has
//                no tone between iris and ink, and hair is darker than ink, so the dark wood stays flat and the ink
//                hull carries its form
//   light wood   sky #f2d7ae / skin #f0c2ae (table top, counter top, stool treads, sign board)
//   books        red accent #c4452d / iris, tan sky / skin, cream moon / sky, pink skin / sky, white practical
//                #fffaf2 / sclera #f6f3ee, brown iris flat; register sclera / sky; glass sky / skin.
// Meshes: 11. ~11.3k triangles (books ~8k).
// Joints: anchors floor, counter, table, rack, stool, sign.

export const meta = {
  name: "bookstore",
  height: 2.6,
  script: "noon",
  colors: {
    wall: "#fff6e4", wallShade: "#f2d7ae",
    floor: "#f2d7ae", floorShade: "#f0c2ae",
    dark: "#5c3d32", darkShade: "#5c3d32",
    wood: "#f2d7ae", woodShade: "#f0c2ae",
    red: "#c4452d", redShade: "#5c3d32",
    tan: "#f2d7ae", tanShade: "#f0c2ae",
    cream: "#fff6e4", creamShade: "#f2d7ae",
    pink: "#f0c2ae", pinkShade: "#f2d7ae",
    white: "#fffaf2", whiteShade: "#f6f3ee",
    glass: "#f2d7ae", glassShade: "#f0c2ae",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height } = opts;
  const c = { ...meta.colors, ...colors };
  const root = new THREE.Group();
  root.name = "bookstore";
  const set = new THREE.Group(); // the uniform size scale lives here
  set.name = "shop";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = {};

  // ---------- triangle soups through an optional placement matrix ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soups = {};
  let M = null;
  const v3 = new THREE.Vector3();
  const P = (q) => (M ? (v3.set(...q).applyMatrix4(M), [v3.x, v3.y, v3.z]) : q);
  // place(x, y, z, yaw, pitch) then draw in local coordinates; place() alone resets
  function place(x, y, z, ry = 0, rx = 0) {
    if (x === undefined) return (M = null);
    M = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, 0, "YXZ")), new THREE.Vector3(1, 1, 1));
  }
  function tri(key, a, b, e, ref) {
    [a, b, e, ref] = [P(a), P(b), P(e), P(ref)];
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    (soups[key] ??= []).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function box(key, x0, x1, y0, y1, z0, z1) {
    if (x0 > x1) [x0, x1] = [x1, x0];
    if (z0 > z1) [z0, z1] = [z1, z0];
    const p = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    const ref = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  // ---------- room ----------
  const X0 = -2.5, X1 = 2.5, Z0 = -2.0, Z1 = 2.0, H = 2.6, FT = 0.03, WT = 0.1;
  // wall frames: u along the wall, o out of the wall into the room
  const BACK = { p: (u, y, o) => [u, y, Z0 + o] }; // -Z wall, u = x
  const SIDE = { p: (u, y, o) => [X0 + o, y, u] }; // -X wall, u = z
  const wb = (key, F, u0, u1, y0, y1, o0, o1) => {
    const a = F.p(u0, y0, o0), b = F.p(u1, y1, o1);
    box(key, a[0], b[0], a[1], b[1], a[2], b[2]);
  };

  box("floor", X0, X1, 0, FT, Z0, Z1);
  for (let x = X0 + 0.2; x < X1 - 0.05; x += 0.2) box("seam", x - 0.004, x + 0.004, FT, FT + 0.002, Z0, Z1);
  box("wall", X0 - WT, X1, 0, H, Z0 - WT, Z0); // back wall, runs past the corner
  box("wall", X0 - WT, X0, 0, H, Z0, Z1); // side wall
  // skirting and the dark cap on the cut tops
  wb("dark", BACK, X0, X1, FT, 0.1, 0, 0.012);
  wb("dark", SIDE, Z0, Z1, FT, 0.1, 0, 0.012);
  box("dark", X0 - WT - 0.005, X1 + 0.005, H - 0.02, H + 0.001, Z0 - WT - 0.005, Z0 + 0.005);
  box("dark", X0 - WT - 0.005, X0 + 0.005, H - 0.02, H + 0.001, Z0, Z1 + 0.005);
  box("dark", X1, X1 + 0.012, 0, H, Z0 - WT, Z0); // cut ends of the walls
  box("dark", X0 - WT, X0, 0, H, Z1, Z1 + 0.012);

  // window in the side wall near the street
  const WIN = { u0: 0.45, u1: 1.85, y0: 1.1, y1: 2.3 };
  wb("glass", SIDE, WIN.u0, WIN.u1, WIN.y0, WIN.y1, 0, 0.006);
  const fr = 0.05;
  wb("dark", SIDE, WIN.u0 - fr, WIN.u1 + fr, WIN.y1, WIN.y1 + fr, 0, 0.04);
  wb("dark", SIDE, WIN.u0 - fr, WIN.u1 + fr, WIN.y0 - fr, WIN.y0, 0, 0.04);
  wb("dark", SIDE, WIN.u0 - fr, WIN.u0, WIN.y0, WIN.y1, 0, 0.04);
  wb("dark", SIDE, WIN.u1, WIN.u1 + fr, WIN.y0, WIN.y1, 0, 0.04);
  wb("dark", SIDE, (WIN.u0 + WIN.u1) / 2 - 0.02, (WIN.u0 + WIN.u1) / 2 + 0.02, WIN.y0, WIN.y1, 0, 0.03);
  wb("dark", SIDE, WIN.u0, WIN.u1, WIN.y1 - 0.32, WIN.y1 - 0.29, 0, 0.03);
  wb("wood", SIDE, WIN.u0 - 0.1, WIN.u1 + 0.1, WIN.y0 - fr - 0.03, WIN.y0 - fr, 0, 0.1);

  // ---------- wall shelves ----------
  const BOOK = ["red", "tan", "cream", "dark", "pink", "white", "red", "cream", "dark", "tan"];
  const SH = { d: 0.32, top: 2.15, kick: 0.09, pitch: 0.33, t: 0.022, bay: 0.8 };
  let bookId = 0;
  // one row of books on a board in wall frame F, u0..u1, standing on y, clear height `clear`
  function shelfRow(F, u0, u1, y, clear, seed) {
    let u = u0 + 0.01 + hash(seed) * 0.02;
    while (u < u1 - 0.03) {
      const id = bookId++;
      const col = BOOK[Math.floor(hash(id * 3 + seed) * BOOK.length)];
      if (hash(id + seed * 7) > 0.93 && u < u1 - 0.28) { // a short pile lying flat
        let yy = y;
        for (let q = 0; q < 3; q++) {
          const hh = 0.025 + hash(id + q) * 0.012;
          wb(BOOK[(Math.floor(hash(id + q + 40) * 6) + q) % BOOK.length], F, u + 0.005 * q, u + 0.21 - 0.008 * q, yy, yy + hh, 0.03, 0.03 + 0.15 + 0.01 * q);
          yy += hh;
        }
        u += 0.25;
        continue;
      }
      const w = 0.02 + hash(id + 5) * 0.025;
      const h = Math.min(clear - 0.035, 0.17 + hash(id + 7) * 0.13);
      const d = 0.15 + hash(id + 3) * 0.05;
      if (u + w > u1 - 0.005) break;
      wb(col, F, u, u + w, y, y + h, 0.03, 0.03 + d);
      u += w + 0.002;
    }
  }
  function shelfUnit(F, u0, bays, seed) {
    const u1 = u0 + bays * SH.bay;
    wb("dark", F, u0, u1, FT, SH.kick, 0, SH.d); // kickboard / plinth
    wb("dark", F, u0, u1, SH.top - 0.04, SH.top, 0, SH.d + 0.02); // crown
    for (let b = 0; b <= bays; b++) { // uprights
      const u = u0 + b * SH.bay;
      wb("dark", F, u - SH.t / 2, u + SH.t / 2, FT, SH.top - 0.04, 0, SH.d);
    }
    for (let r = 0; ; r++) {
      const y = SH.kick + r * SH.pitch;
      if (y + 0.2 > SH.top - 0.04) break;
      wb("dark", F, u0, u1, y - (r ? SH.t : 0), y, 0, SH.d);
      const clear = Math.min(SH.pitch, SH.top - 0.04 - y) - SH.t;
      for (let b = 0; b < bays; b++)
        shelfRow(F, u0 + b * SH.bay + SH.t / 2, u0 + (b + 1) * SH.bay - SH.t / 2, y, clear, seed + r * 10 + b);
      // blank shelf-talkers on a few boards
      if (r > 0 && r < 5 && hash(seed + r * 3) > 0.45) {
        const b = Math.floor(hash(seed + r) * bays), u = u0 + b * SH.bay + 0.25 + hash(seed + r + 9) * 0.3;
        wb("white", F, u, u + 0.09, y - SH.t - 0.05, y - SH.t + 0.005, SH.d, SH.d + 0.006);
      }
    }
  }
  shelfUnit(BACK, -2.38, 4, 11); // back wall, x -2.38..0.82
  shelfUnit(SIDE, -1.62, 2, 57); // side wall, z -1.62..-0.02 (past the back unit's depth)

  // ---------- magazine rack under the window ----------
  const RK = { u0: 0.45, u1: 1.75, o: 0.45, h: 1.0 };
  wb("dark", SIDE, RK.u0, RK.u0 + 0.025, FT, RK.h, 0, RK.o); // side panels
  wb("dark", SIDE, RK.u1 - 0.025, RK.u1, FT, RK.h, 0, RK.o);
  wb("dark", SIDE, RK.u0 + 0.025, RK.u1 - 0.025, FT, 0.12, RK.o - 0.02, RK.o); // toe board
  wb("dark", SIDE, RK.u0 + 0.025, RK.u1 - 0.025, FT, RK.h, 0, 0.02); // back panel
  const tiers = [[0.12, 0.42], [0.42, 0.28], [0.72, 0.14]]; // [ledge y, ledge front o]
  const MAG = ["red", "white", "tan", "cream", "pink", "red", "white", "tan"];
  const BAND = { red: "white", white: "red", tan: "dark", cream: "red", pink: "dark" };
  let mi = 0;
  for (const [y, o] of tiers) {
    wb("dark", SIDE, RK.u0 + 0.025, RK.u1 - 0.025, y, y + 0.025, 0.02, o); // ledge
    wb("dark", SIDE, RK.u0 + 0.025, RK.u1 - 0.025, y, y + 0.07, o - 0.02, o); // lip
    for (let k = 0; k < 5; k++) {
      const uc = RK.u0 + 0.14 + k * 0.255, col = MAG[mi++ % MAG.length];
      const hgt = 0.28, tilt = 0.28; // leaning back by ~16 deg
      // local frame of a magazine: x along the rack (+z world), y up the cover, z out of the cover (+x world)
      place(X0 + o - 0.035, y + 0.025, uc, Math.PI / 2, -tilt);
      box(col, -0.105, 0.105, 0, hgt, -0.008, 0);
      box(BAND[col], -0.095, 0.095, hgt - 0.07, hgt - 0.02, 0, 0.002);
      box(BAND[col], -0.095, -0.02, 0.04, 0.12, 0, 0.002);
      place();
    }
  }

  // ---------- centre table (hiradai) with face-up books and POP cards ----------
  const TB = { x: -0.45, z: 0.55, w: 1.5, d: 0.85, y: 0.74 };
  const tx0 = TB.x - TB.w / 2, tx1 = TB.x + TB.w / 2, tz0 = TB.z - TB.d / 2, tz1 = TB.z + TB.d / 2;
  box("wood", tx0, tx1, TB.y - 0.04, TB.y, tz0, tz1);
  box("dark", tx0 + 0.04, tx1 - 0.04, TB.y - 0.14, TB.y - 0.04, tz0 + 0.04, tz1 - 0.04); // apron
  for (const [lx, lz] of [[tx0 + 0.05, tz0 + 0.05], [tx1 - 0.05, tz0 + 0.05], [tx0 + 0.05, tz1 - 0.05], [tx1 - 0.05, tz1 - 0.05]])
    box("dark", lx - 0.03, lx + 0.03, FT, TB.y - 0.04, lz - 0.03, lz + 0.03);
  box("dark", tx0 + 0.08, tx1 - 0.08, 0.15, 0.18, tz0 + 0.08, tz1 - 0.08); // low shelf
  for (let row = 0; row < 2; row++)
    for (let k = 0; k < 6; k++) {
      const id = 300 + row * 10 + k;
      const cx = tx0 + 0.15 + k * 0.24, cz = TB.z + (row ? 0.2 : -0.18);
      const n = 2 + Math.floor(hash(id) * 4);
      let yy = TB.y;
      for (let q = 0; q < n; q++) {
        const hh = 0.022 + hash(id + q * 11) * 0.012;
        const col = q === n - 1 ? MAG[(k + row * 3) % MAG.length] : BOOK[(k + q + row) % BOOK.length];
        const j = (hash(id + q) - 0.5) * 0.012;
        box(col, cx - 0.075 + j, cx + 0.075 + j, yy, yy + hh, cz - 0.105, cz + 0.105);
        yy += hh;
      }
      // the top cover's colour band
      const top = MAG[(k + row * 3) % MAG.length];
      box(BAND[top], cx - 0.06, cx + 0.06, yy, yy + 0.002, cz - 0.09, cz - 0.04);
      if ((row === 1 && (k === 1 || k === 4)) || (row === 0 && k === 3)) { // blank POP card on an easel, behind the stack
        place(cx, yy, cz - 0.11, 0, -0.25);
        box("white", -0.06, 0.06, 0, 0.15, -0.003, 0.003);
        box("red", -0.06, 0.06, 0.12, 0.15, 0.003, 0.005);
        place();
      }
    }

  // ---------- register counter ----------
  const CT = { x0: 1.15, x1: 2.4, z0: -1.65, z1: -1.05, y: 0.95 };
  box("dark", CT.x0, CT.x1, FT, CT.y - 0.04, CT.z0, CT.z1);
  box("wood", CT.x0 - 0.03, CT.x1 + 0.03, CT.y - 0.04, CT.y, CT.z0 - 0.03, CT.z1 + 0.06);
  for (let k = 0; k < 3; k++) { // front panels in light-wood frames
    const a = CT.x0 + 0.06 + k * 0.4;
    box("wood", a, a + 0.34, 0.16, CT.y - 0.12, CT.z1, CT.z1 + 0.012);
    box("dark", a + 0.03, a + 0.31, 0.19, CT.y - 0.15, CT.z1 + 0.012, CT.z1 + 0.018);
  }
  box("dark", CT.x0 - 0.01, CT.x1 + 0.01, FT, 0.1, CT.z1 - 0.02, CT.z1 + 0.02); // toe kick
  // register
  const RG = { x: 1.95, z: -1.4 };
  box("white", RG.x - 0.2, RG.x + 0.2, CT.y, CT.y + 0.1, RG.z - 0.18, RG.z + 0.18); // drawer base
  box("dark", RG.x - 0.18, RG.x + 0.18, CT.y + 0.045, CT.y + 0.052, RG.z + 0.18, RG.z + 0.183); // drawer line
  place(RG.x, CT.y + 0.1, RG.z + 0.02, 0, 0.35);
  box("white", -0.17, 0.17, 0, 0.06, -0.14, 0.14); // sloped key block
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++)
    box("dark", -0.12 + i * 0.065, -0.08 + i * 0.065, 0.06, 0.068, -0.08 + j * 0.06, -0.045 + j * 0.06);
  place();
  box("white", RG.x - 0.025, RG.x + 0.025, CT.y + 0.1, CT.y + 0.32, RG.z - 0.15, RG.z - 0.11); // display post
  box("dark", RG.x - 0.1, RG.x + 0.1, CT.y + 0.3, CT.y + 0.38, RG.z - 0.16, RG.z - 0.1); // display
  // book-cover wrapping paper stack: pre-folded sheets, paper and kraft alternating
  const WR = { x: 1.45, z: -1.3 };
  let wy = CT.y;
  for (let q = 0; q < 8; q++) {
    const hh = 0.01, j = (hash(500 + q) - 0.5) * 0.02;
    box(q % 2 ? "tan" : "white", WR.x - 0.16 + j, WR.x + 0.16 + j, wy, wy + hh, WR.z - 0.12, WR.z + 0.12);
    wy += hh;
  }
  box("red", WR.x - 0.16, WR.x + 0.16, wy, wy + 0.004, WR.z - 0.02, WR.z + 0.02); // the shop's band on the top sheet
  box("dark", 1.7, 1.78, CT.y, CT.y + 0.015, -1.3, -1.12); // pen tray
  // low shelf behind the counter, against the back wall
  wb("dark", BACK, 1.105, 2.445, FT, 0.1, 0, 0.3); // plinth
  wb("dark", BACK, 1.105, 2.445, 0.83, 0.86, 0, 0.3); // top
  wb("dark", BACK, 1.105, 2.445, 0.46, 0.48, 0, 0.3); // middle board
  wb("dark", BACK, 1.1, 1.125, FT, 0.83, 0, 0.3); // sides
  wb("dark", BACK, 2.425, 2.45, FT, 0.83, 0, 0.3);
  shelfRow(BACK, 1.125, 2.425, 0.1, 0.36, 900);
  shelfRow(BACK, 1.125, 2.425, 0.48, 0.35, 907);

  // ---------- step stool ----------
  const ST = { x: 0.4, z: -1.3 };
  for (const s of [-1, 1]) { // stepped side frames: tall at the back, low at the front
    box("dark", ST.x + s * 0.2 - 0.015, ST.x + s * 0.2 + 0.015, FT, 0.42, ST.z - 0.18, ST.z);
    box("dark", ST.x + s * 0.2 - 0.015, ST.x + s * 0.2 + 0.015, FT, 0.2, ST.z, ST.z + 0.2);
  }
  box("wood", ST.x - 0.22, ST.x + 0.22, 0.42, 0.45, ST.z - 0.2, ST.z + 0.01); // top tread
  box("wood", ST.x - 0.22, ST.x + 0.22, 0.2, 0.23, ST.z + 0.01, ST.z + 0.22); // lower tread
  box("dark", ST.x - 0.185, ST.x + 0.185, 0.23, 0.42, ST.z - 0.02, ST.z); // riser
  box("dark", ST.x - 0.185, ST.x + 0.185, 0.06, 0.12, ST.z + 0.16, ST.z + 0.18); // stretchers
  box("dark", ST.x - 0.185, ST.x + 0.185, 0.06, 0.12, ST.z - 0.17, ST.z - 0.15);

  // ---------- hanging sign board on a wall bracket over the counter ----------
  const SG = { x: 1.78, z: -1.25, y: 1.88 };
  box("dark", SG.x - 0.025, SG.x + 0.025, 2.33, 2.38, Z0, SG.z + 0.05); // arm
  box("dark", SG.x - 0.025, SG.x + 0.025, 2.2, 2.38, Z0, Z0 + 0.03); // wall plate
  place(SG.x, 2.2, Z0 + 0.02, 0, -Math.atan2(0.13, 0.4)); // diagonal brace
  box("dark", -0.012, 0.012, 0, 0.42, -0.012, 0.012);
  place();
  for (const s of [-1, 1]) box("dark", SG.x + s * 0.28 - 0.006, SG.x + s * 0.28 + 0.006, SG.y + 0.3, 2.33, SG.z - 0.006, SG.z + 0.006);
  box("wood", SG.x - 0.35, SG.x + 0.35, SG.y, SG.y + 0.32, SG.z - 0.015, SG.z + 0.015);
  box("dark", SG.x - 0.31, SG.x + 0.31, SG.y + 0.04, SG.y + 0.28, SG.z + 0.015, SG.z + 0.02); // inset frame line
  box("red", SG.x - 0.29, SG.x + 0.29, SG.y + 0.06, SG.y + 0.26, SG.z + 0.02, SG.z + 0.024); // blank face

  // ---------- meshes ----------
  const MAT = { // [base, shade, threshold, ink px (0 = no hull)]
    wall: [c.wall, c.wallShade, 0.1, 2.5],
    floor: [c.floor, c.floorShade, 0.1, 2.5],
    seam: [c.dark, c.dark, -1, 0],
    dark: [c.dark, c.darkShade, -1, 2],
    wood: [c.wood, c.woodShade, 0.1, 2],
    glass: [c.glass, c.glassShade, 0.1, 0],
    red: [c.red, c.redShade, 0.1, 1.2],
    tan: [c.tan, c.tanShade, 0.1, 1.2],
    cream: [c.cream, c.creamShade, 0.1, 1.2],
    pink: [c.pink, c.pinkShade, 0.1, 1.2],
    white: [c.white, c.whiteShade, 0.1, 1.2],
  };
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    set.add(mesh);
  }
  const anchor = (name, x, y, z) => { const a = new THREE.Group(); a.name = name; a.position.set(x, y, z); set.add(a); joints[name] = a; };
  anchor("floor", 0, FT, 0);
  anchor("counter", (CT.x0 + CT.x1) / 2, CT.y, (CT.z0 + CT.z1) / 2);
  anchor("table", TB.x, TB.y, TB.z);
  anchor("rack", X0 + 0.25, RK.h, (RK.u0 + RK.u1) / 2);
  anchor("stool", ST.x, 0.45, ST.z);
  anchor("sign", SG.x, SG.y, SG.z);

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
