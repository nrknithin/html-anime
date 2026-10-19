// school-library.js - the school library corner of every slice-of-life anime: tall shelves of spines, a long reading
// table, the return counter with its date stamp, a book cart, and a sunny window whose sheer curtains breathe in the
// breeze. A cutaway set piece at real size, with one looping clip.
// Contract: harness/lab/README.md. Meters, +Y up, the room's open (cutaway) sides face +X and +Z so the lab's
// front-left cameras look in; the -Z wall holds the tall shelves, the -X wall the window. Stands on y = 0 (the floor
// slab's top is y = 0.05), centred on the room.
//
// Construction (boxes, 4-sided rods and one lofted sheet per curtain, all triangle soups merged per material, so the
// room is 16 meshes and ~10.2k triangles; every closed part is wound away from a point inside it, never by hand):
//   SHELL     a floor slab with light plank seams; two walls 12 cm thick (the -X one cut round a window), a dark-wood
//             wainscot with a rail, skirting, and a dark 2 cm section cap on every cut wall top. No ceiling.
//   CEILING   two dark-wood beams run along X out of the window wall's top, their open ends capped like the walls: the
//             only ceiling the cutaway keeps, so every fitting hangs from something.
//   SHELVES   six tall open bookcases (five 0.94 wide on the back wall, one 0.8 wide round the corner on the window wall) in varied
//             heights, and a low case under the window. Books are merged BLOCKS: a run of 1-5 spines of one colour and
//             height is one box with dark seam lines between the spines (a fixed sin-fract hash, no Math.random), with
//             gaps and a few leaning volumes, so a shelf is ~7 boxes, not 25.
//   READING   a long table (light top, dark apron and legs) with three chairs a side, a few books and an open one on it.
//   COUNTER   the return desk: a dark-wood body with a light top and librarian-side cubbies of books, a date stamp (red
//             handle, knob, dark foot) on its ink pad, a stack of returns and a card tray; a two-tier book cart on
//             four casters beside it.
//   WINDOW    three sashes and a transom in a dark frame, pale glass, a sill board; a rod on two brackets; two sheer
//             curtains lofted as thin closed sheets (a gather wave across, billowing into the room toward the bottom).
//   LIGHTS    four fluorescent fittings (a pale channel and two glowing tubes) on rods from the beams.
// Proportions (real size, base unit the storey H = 2.75 m over a 5 cm slab, 2.8 m in all = meta.height): interior
//   5.4 (x) by 4.5 (z); bookcases 0.32 deep, 1.7-2.3 tall, 0.33 shelf pitch; window 2.3 x 1.4 from a 0.9 sill;
//   table 2.4 x 0.9 at 0.72, chairs seat 0.44 back 0.86; counter 1.8 x 0.6 x 0.95; cart 0.8 x 0.4 x 0.85;
//   fittings 1.2 long at 2.3; beams 0.15 x 0.18.
// Options: build(THREE, kit, colors, { height }) scales the whole set uniformly so the wall top is `height` (2.8).
// Clip: breeze 4 s (pose("breeze@t")): the curtains sway, billow and fall back, a wave running across each from
//   the window's middle out; integer cycles, so t = 0 and t = 4 match. Rest is the clip at t = 0.
// Ink in pixels: walls, cases and furniture 2.5, books, curtains and steel 1.5 (a room is seen small; spines keep colour).
// Colours (noon, warm wood browns), base / shade:
//   walls        moon #fff6e4 / sky #f2d7ae, threshold 0.1 (the +Z-facing back wall stays lit)
//   dark wood    iris #5c3d32 / hair #241c16 (cases, wainscot, beams, frames, apron, legs, counter body, cart), as
//                the house's timber: noon has no tone between iris and ink, so the shade is only the faces turned away
//   light wood   sky #f2d7ae / skin #f0c2ae (table top, seats, counter top); floor skin flat, seams sky
//   books        accent #c4452d / iris, sky / skin, moon / sky, skin / sky, practical #fffaf2 / sclera #f6f3ee
//   glass        sky flat; curtains practical / sclera, threshold 0.45 so the gather folds alternate
//   fittings     sclera / sky, tubes practical glow (threshold -0.25); stamp handle and ink pad accent;
//   seams, caps, cubby openings  hair flat (they are lines)

export const meta = {
  name: "school-library",
  height: 2.8,
  script: "noon",
  colors: {
    wall: "#fff6e4", wallShade: "#f2d7ae",
    wood: "#5c3d32", woodShade: "#241c16",
    light: "#f2d7ae", lightShade: "#f0c2ae",
    floor: "#f2d7ae", seam: "#f0c2ae",
    dark: "#241c16",
    glass: "#f2d7ae",
    curtain: "#fffaf2", curtainShade: "#f2d7ae",
    steel: "#f6f3ee", steelShade: "#f2d7ae",
    tube: "#fffaf2",
    red: "#c4452d", redShade: "#5c3d32",
    tan: "#f2d7ae", tanShade: "#f0c2ae",
    cream: "#fff6e4", creamShade: "#f2d7ae",
    pink: "#f0c2ae", pinkShade: "#f2d7ae",
    white: "#fffaf2", whiteShade: "#f6f3ee",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const NATURAL = 2.8;
  const { height = NATURAL } = opts;
  const root = new THREE.Group();
  root.name = "school-library";
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
  let soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  const F = 0.05; // floor slab: room coordinates start on its top
  const M0 = new THREE.Matrix4().makeTranslation(0, F, 0);
  let M = M0;
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
  const FACES = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of FACES) quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  const box = (key, x0, x1, y0, y1, z0, z1) =>
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  // a flat quad facing `n` (unit axis), centred on a point
  function plate(key, ctr, n, w, h) {
    const up = Math.abs(n[1]) > 0.5 ? [0, 0, 1] : [0, 1, 0];
    const r = nrm(cross(up, n)), u = cross(n, r);
    const P = (a, b) => add(ctr, add(mul(r, a * w / 2), mul(u, b * h / 2)));
    quad(key, P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), sub(ctr, n));
  }
  // a capped 4-sided rod from a to b, radius r
  function rod(key, a, b, r, sides = 4) {
    const T = nrm(sub(b, a));
    const up = Math.abs(T[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = nrm(cross(up, T)), w = cross(T, u);
    const ring = (P) => Array.from({ length: sides }, (_, j) => {
      const t = ((j + 0.5) / sides) * Math.PI * 2, d = add(mul(u, Math.cos(t)), mul(w, Math.sin(t)));
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
  const W = 2.7, L = 2.25, H = 2.75, T = 0.12, CAP = 0.02;
  box("floor", -W - T, W, -F, 0, -L - T, L);
  for (let i = 1; i < 18; i++) { // plank seams along z
    const x = -W + (i * 2 * W) / 18;
    plate("seam", [x, 0.0015, 0], [0, 1, 0], 0.01, 2 * L - 0.01);
  }
  const SILL = 0.9, HEAD = 2.3, WZ0 = -0.85, WZ1 = 1.45;
  const wallBox = (x0, x1, y0, y1, z0, z1, cut) => {
    box("wall", x0, x1, y0, cut ? y1 - CAP : y1, z0, z1);
    if (cut) box("cap", x0, x1, y1 - CAP, y1, z0, z1);
  };
  wallBox(-W - T, W, -F, H, -L - T, -L, true); // back wall (-Z)
  const wx0 = -W - T, wx1 = -W;
  wallBox(wx0, wx1, -F, SILL, -L, L, false);
  wallBox(wx0, wx1, HEAD, H, -L, L, true);
  wallBox(wx0, wx1, SILL, HEAD, -L, WZ0, false);
  wallBox(wx0, wx1, SILL, HEAD, WZ1, L, false);
  // wainscot (dark wood 1.5 cm proud) with a rail, on both walls; skirting under it
  const WS = 0.88;
  box("wood", -W, W, 0, WS, -L, -L + 0.015);
  box("wood", -W, -W + 0.015, 0, WS, -L, L);
  box("wood", -W, W, WS, WS + 0.04, -L, -L + 0.03);
  box("wood", -W, -W + 0.03, WS, WS + 0.04, -L, WZ0), box("wood", -W, -W + 0.03, WS, WS + 0.04, WZ1, L);
  box("dark", -W, W, 0, 0.07, -L + 0.015, -L + 0.022);
  box("dark", -W + 0.015, -W + 0.022, 0, 0.07, -L, L);
  // picture rail line near the top
  box("dark", -W, W, H - 0.2, H - 0.18, -L, -L + 0.01);
  box("dark", -W, -W + 0.01, H - 0.2, H - 0.18, -L, L);

  // ---------- window ----------
  {
    const FR = 0.05, xm = (wx0 + wx1) / 2, TR = 1.95;
    box("wood", wx0 - 0.01, wx1 + 0.02, SILL, SILL + FR, WZ0, WZ1);
    box("wood", wx0 - 0.01, wx1 + 0.02, HEAD - FR, HEAD, WZ0, WZ1);
    box("wood", wx0 - 0.01, wx1 + 0.02, SILL, HEAD, WZ0, WZ0 + FR);
    box("wood", wx0 - 0.01, wx1 + 0.02, SILL, HEAD, WZ1 - FR, WZ1);
    box("wood", xm - 0.02, xm + 0.02, TR - 0.02, TR + 0.02, WZ0, WZ1); // transom bar
    const span = WZ1 - WZ0 - 2 * FR;
    for (let k = 1; k < 3; k++) {
      const z = WZ0 + FR + (k * span) / 3;
      box("wood", xm - 0.02, xm + 0.02, SILL, HEAD, z - 0.02, z + 0.02);
    }
    plate("glass", [xm + 0.004, (SILL + HEAD) / 2, (WZ0 + WZ1) / 2], [1, 0, 0], span, HEAD - SILL - 2 * FR);
    plate("glass", [xm - 0.004, (SILL + HEAD) / 2, (WZ0 + WZ1) / 2], [-1, 0, 0], span, HEAD - SILL - 2 * FR);
    box("light", wx1, wx1 + 0.12, SILL - 0.03, SILL, WZ0 - 0.06, WZ1 + 0.06); // sill board
    // curtain rod on two brackets
    rod("wood", [-W + 0.09, 2.44, WZ0 - 0.25], [-W + 0.09, 2.44, WZ1 + 0.25], 0.014, 6);
    for (const z of [WZ0 - 0.22, WZ1 + 0.22]) box("wood", -W, -W + 0.1, 2.42, 2.46, z - 0.015, z + 0.015);
  }

  // ---------- ceiling beams and fluorescent fittings ----------
  const BEAMS = [0.55, -1.3];
  for (const z of BEAMS) {
    box("wall", -W, W - CAP, H - 0.16, H, z - 0.07, z + 0.07);
    box("cap", W - CAP, W, H - 0.16, H, z - 0.07, z + 0.07);
  }
  const FY = 2.12;
  for (const z of BEAMS)
    for (const x of [-1.15, 0.15]) {
      box("steel", x - 0.6, x + 0.6, FY, FY + 0.05, z - 0.09, z + 0.09);
      for (const dz of [-0.045, 0.045]) rod("tube", [x - 0.57, FY - 0.016, z + dz], [x + 0.57, FY - 0.016, z + dz], 0.014, 6);
      for (const dx of [-0.42, 0.42]) rod("steel", [x + dx, FY + 0.05, z], [x + dx, H - 0.15, z], 0.006);
    }

  // ---------- books ----------
  const BOOK = ["red", "tan", "cream", "red", "pink", "white", "tan", "red"];
  // a run of books on a shelf from x0 to x1 (local), standing on y0, spines at z = zf, at most hmax tall
  function books(x0, x1, y0, zf, hmax, seed) {
    let x = x0 + 0.01, k = 0;
    while (x < x1 - 0.04) {
      const h0 = hash(seed + k * 7.3);
      if (h0 < 0.1 && k > 0) { x += 0.04 + 0.08 * hash(seed + k); k++; continue; } // a gap
      const key = BOOK[Math.floor(hash(seed + k * 3.1) * BOOK.length)];
      const nb = 1 + Math.floor(hash(seed + k * 5.7) * 5), bw = 0.028 + 0.016 * hash(seed + k * 2.9);
      const w = Math.min(nb * bw, x1 - x - 0.005);
      const h = Math.min(hmax, 0.17 + 0.12 * hash(seed + k * 1.7)), d = 0.17 + 0.06 * hash(seed + k * 4.1);
      if (h0 > 0.93 && w < 0.06) { // a leaning volume, its foot on the shelf
        const a = 0.28, dx = Math.sin(a) * h, xr = x + w + dx;
        const pts = (z) => [[x, y0, z], [x + w, y0, z], [xr, y0 + Math.cos(a) * h, z], [xr - w * Math.cos(a), y0 + Math.cos(a) * h + w * Math.sin(a), z]];
        const A = pts(zf - d), B = pts(zf);
        hex(key, [A[0], A[1], B[1], B[0], A[3], A[2], B[2], B[3]]);
        x = xr + 0.01;
      } else {
        box(key, x, x + w, y0, y0 + h, zf - d, zf);
        const n = Math.round(w / bw);
        for (let j = 1; j < n; j++) plate("dark", [x + (j * w) / n, y0 + h / 2, zf + 0.001], [0, 0, 1], 0.004, h - 0.012);
        if (hash(seed + k * 9.1) > 0.6) plate("dark", [x + w / 2, y0 + h * 0.78, zf + 0.0012], [0, 0, 1], w - 0.008, 0.008); // a title band
        x += w + 0.002;
      }
      k++;
    }
  }

  // ---------- bookcases (local: width w centred on x = 0, back at z = 0, faces +Z) ----------
  const D = 0.32, ST = 0.025;
  function bookcase(w, h, seed, pitch = 0.33) {
    const hw = w / 2;
    box("wood", -hw, -hw + ST, 0, h, 0, D);
    box("wood", hw - ST, hw, 0, h, 0, D);
    box("wood", -hw - 0.015, hw + 0.015, h - 0.04, h, 0, D + 0.02); // top with a small cornice
    box("wood", -hw + ST, hw - ST, 0, 0.09, 0.01, D - 0.01); // plinth
    box("wood", -hw + ST, hw - ST, 0.09, h - 0.04, 0, 0.012); // back
    const n = Math.max(1, Math.round((h - 0.13) / pitch)), p = (h - 0.13) / n;
    for (let i = 0; i < n; i++) {
      const y = 0.09 + i * p;
      if (i > 0) box("wood", -hw + ST, hw - ST, y - 0.012, y + 0.012, 0, D - 0.005);
      books(-hw + ST, hw - ST, y + 0.012, D - 0.02, p - 0.05, seed + i * 17);
    }
  }
  const CASES = [[-2.2, 2.1], [-1.24, 2.3], [-0.28, 2.0], [0.68, 2.3], [1.64, 1.75]]; // x centre, height (0.94 wide)
  CASES.forEach(([x, h], i) => place(x, -L, 0, () => bookcase(0.94, h, 100 + i * 211)));
  place(-W, -L + D + 0.4, Math.PI / 2, () => bookcase(0.8, 2.2, 1500)); // round the corner on the window wall
  place(-W, (WZ0 + WZ1) / 2, Math.PI / 2, () => bookcase(WZ1 - WZ0 + 0.3, 0.84, 1900, 0.37)); // low case under the window

  // ---------- reading table and chairs ----------
  const TX = -0.4, TZ = 0.55, TY = 0.72;
  function table() {
    const hx = 1.2, hz = 0.45;
    box("wood", -hx, hx, TY - 0.04, TY, -hz, hz);
    box("wood", -hx + 0.08, hx - 0.08, TY - 0.13, TY - 0.04, -hz + 0.07, hz - 0.07); // apron
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      box("wood", sx * (hx - 0.14), sx * (hx - 0.08), 0, TY - 0.04, sz * (hz - 0.13), sz * (hz - 0.07));
  }
  function chair() { // local: seat centred, the sitter faces +Z
    const SY = 0.44, hs = 0.21;
    box("light", -hs, hs, SY - 0.035, SY, -hs, hs);
    for (const sx of [-1, 1]) {
      const x0 = sx > 0 ? hs - 0.04 : -hs, x1 = x0 + 0.04;
      box("wood", x0, x1, 0, SY - 0.035, hs - 0.04, hs); // front leg
      box("wood", x0, x1, 0, 0.86, -hs, -hs + 0.04); // back post
      box("wood", x0, x1, 0.12, 0.15, -hs + 0.04, hs - 0.04); // side stretcher
    }
    box("wood", -hs + 0.04, hs - 0.04, 0.62, 0.84, -hs, -hs + 0.025); // back panel
  }
  place(TX, TZ, 0, table);
  [-0.8, 0, 0.8].forEach((dx, i) => {
    const h = hash(i + 40);
    place(TX + dx + 0.05 * (h - 0.5), TZ - 0.62 - 0.1 * h, (h - 0.5) * 0.2, chair);
    const g = hash(i + 60);
    place(TX + dx + 0.05 * (g - 0.5), TZ + 0.62 + 0.12 * g, Math.PI + (g - 0.5) * 0.25, chair);
  });
  // books on the table: a closed pair and one open
  box("red", TX - 0.75, TX - 0.53, TY, TY + 0.03, TZ - 0.25, TZ - 0.09);
  box("cream", TX - 0.73, TX - 0.55, TY + 0.03, TY + 0.055, TZ - 0.24, TZ - 0.11);
  {
    const ox = TX + 0.35, oz = TZ + 0.12;
    hex("white", [[ox - 0.2, TY, oz - 0.13], [ox, TY, oz - 0.13], [ox, TY, oz + 0.13], [ox - 0.2, TY, oz + 0.13],
      [ox - 0.2, TY + 0.02, oz - 0.13], [ox, TY + 0.012, oz - 0.13], [ox, TY + 0.012, oz + 0.13], [ox - 0.2, TY + 0.02, oz + 0.13]]);
    hex("white", [[ox, TY, oz - 0.13], [ox + 0.2, TY, oz - 0.13], [ox + 0.2, TY, oz + 0.13], [ox, TY, oz + 0.13],
      [ox, TY + 0.012, oz - 0.13], [ox + 0.2, TY + 0.02, oz - 0.13], [ox + 0.2, TY + 0.02, oz + 0.13], [ox, TY + 0.012, oz + 0.13]]);
    box("red", ox - 0.21, ox + 0.21, TY - 0.002, TY + 0.006, oz - 0.14, oz + 0.14);
  }

  // ---------- return counter (local: long along x, patrons at -Z, the librarian at +Z) ----------
  function counter() {
    const hx = 0.9, hz = 0.3, CH = 0.95;
    box("wood", -hx, hx, 0, CH - 0.04, -hz, -hz + 0.04); // front panel
    box("wood", -hx, -hx + 0.04, 0, CH - 0.04, -hz, hz);
    box("wood", hx - 0.04, hx, 0, CH - 0.04, -hz, hz);
    box("wood", -hx + 0.04, hx - 0.04, 0, 0.08, -hz + 0.04, hz - 0.02); // plinth / bottom
    box("wood", -hx + 0.04, hx - 0.04, 0.45, 0.47, -hz + 0.04, hz - 0.02); // inner shelf
    box("wood", -0.02, 0.02, 0.08, CH - 0.04, -hz + 0.04, hz - 0.02); // divider
    plate("dark", [0, (0.08 + CH - 0.04) / 2, -hz + 0.045], [0, 0, 1], 2 * hx - 0.08, CH - 0.12); // the cubbies' depth
    for (const [y0, y1] of [[0.08, 0.45], [0.47, CH - 0.04]]) {
      books(-hx + 0.04, -0.02, y0, hz - 0.03, y1 - y0 - 0.04, 2300 + y0 * 100);
      books(0.02, hx - 0.04, y0, hz - 0.03, y1 - y0 - 0.04, 2500 + y0 * 100);
    }
    box("dark", -hx, hx, CH - 0.25, CH - 0.24, -hz - 0.002, -hz + 0.01); // a groove line on the front panel
    box("light", -hx - 0.03, hx + 0.03, CH - 0.04, CH, -hz - 0.04, hz + 0.03); // top
    const y = CH;
    // date stamp on its ink pad
    box("wood", -0.48, -0.32, y, y + 0.02, -0.05, 0.07);
    box("red", -0.47, -0.33, y + 0.02, y + 0.024, -0.04, 0.06);
    box("dark", -0.18, -0.1, y, y + 0.02, -0.01, 0.06); // stamp foot
    box("wood", -0.17, -0.11, y + 0.02, y + 0.04, 0.0, 0.05);
    rod("red", [-0.14, y + 0.04, 0.025], [-0.14, y + 0.11, 0.025], 0.014, 6);
    rod("red", [-0.14, y + 0.11, 0.025], [-0.14, y + 0.135, 0.025], 0.024, 6); // knob
    // returns stack and card tray
    [["red", 0.03], ["tan", 0.025], ["white", 0.03], ["cream", 0.02]].reduce((yy, [k, t], i) => {
      const s = 0.012 * hash(i + 90);
      box(k, 0.25 + s, 0.48 + s, yy, yy + t, -0.12 + s, 0.05 + s);
      return yy + t;
    }, y);
    box("light", 0.6, 0.78, y, y + 0.06, -0.1, 0.02);
    plate("white", [0.69, y + 0.07, -0.04], [0, 0, 1], 0.14, 0.04);
  }
  place(2.05, -0.85, Math.PI / 2, counter);

  // ---------- book cart (local: long along x, faces +Z) ----------
  function cart() {
    const hx = 0.4, hz = 0.2;
    for (const sx of [-1, 1]) box("wood", sx * hx - 0.02, sx * hx + 0.02, 0.08, 0.85, -hz, hz);
    for (const [y, tilt] of [[0.2, 0], [0.55, 0]]) {
      box("wood", -hx + 0.02, hx - 0.02, y - 0.02 + tilt, y, -hz, hz);
      box("wood", -hx + 0.02, hx - 0.02, y, y + 0.06, hz - 0.02, hz);
      books(-hx + 0.02, hx - 0.02, y, hz - 0.03, 0.24, 3100 + y * 100);
    }
    rod("wood", [-hx, 0.85, 0], [hx, 0.85, 0], 0.016, 6); // handle rail
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      box("dark", sx * (hx - 0.03) - 0.015, sx * (hx - 0.03) + 0.015, 0.06, 0.09, sz * (hz - 0.04) - 0.015, sz * (hz - 0.04) + 0.015);
      rod("dark", [sx * (hx - 0.03) - 0.012, 0.035, sz * (hz - 0.04)], [sx * (hx - 0.03) + 0.012, 0.035, sz * (hz - 0.04)], 0.035, 6);
    }
  }
  place(1.3, 0.75, 0.75, cart);

  // ---------- meshes ----------
  const MAT = {
    wall: [c.wall, c.wallShade, 0.1, 2.5],
    floor: [c.floor, c.floor, 0.1, 2.5],
    seam: [c.seam, c.seam, 0.1, 0],
    cap: [c.dark, c.dark, 0.1, 2.5],
    dark: [c.dark, c.dark, 0.1, 0],
    wood: [c.wood, c.woodShade, 0.1, 2.5],
    light: [c.light, c.lightShade, 0.1, 2.5],
    glass: [c.glass, c.glass, 0.1, 0],
    steel: [c.steel, c.steelShade, 0.1, 1.5],
    tube: [c.tube, c.tube, -0.25, 0],
    red: [c.red, c.redShade, 0.1, 1.5],
    tan: [c.tan, c.tanShade, 0.1, 1.5],
    cream: [c.cream, c.creamShade, 0.1, 1.5],
    pink: [c.pink, c.pinkShade, 0.1, 1.5],
    white: [c.white, c.whiteShade, 0.1, 1.5],
    curtain: [c.curtain, c.curtainShade, 0.45, 1.5],
  };
  const makeGeom = (p, n) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    return g;
  };
  const makeMesh = (key, p, n) => {
    const [base, shade, threshold, px] = MAT[key];
    const mesh = kit.toon(makeGeom(p, n), base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    return mesh;
  };
  const groups = new Map();
  for (const [key, soup] of Object.entries(soups)) {
    const sig = MAT[key].join("|");
    if (!groups.has(sig)) groups.set(sig, { key, p: [], n: [] });
    const g = groups.get(sig);
    for (let i = 0; i < soup.p.length; i++) g.p.push(soup.p[i]), g.n.push(soup.n[i]);
  }
  for (const { key, p, n } of groups.values()) body.add(makeMesh(key, p, n));

  // ---------- curtains: two thin closed sheets, rebuilt per frame of the clip ----------
  const CLIPS = { breeze: 4 };
  const CT = 2.42, CB = 1.0, NU = 18, NV = 9, TH = 0.007, TAU = Math.PI * 2;
  const PANELS = [[WZ0 - 0.18, WZ0 + 0.72, 1], [WZ1 + 0.18, WZ1 - 0.72, -1]]; // outer edge z, inner edge z, sign
  function sheet(t) {
    soups = {};
    M = M0;
    const ph = t / CLIPS.breeze;
    PANELS.forEach(([zo, zi, sgn], pi) => {
      const lag = pi * 0.17;
      const P = (u, v) => { // u 0 at the outer edge -> 1 at the inner edge, v 0 at the rod -> 1 at the hem
        const gather = 0.045 * Math.sin(TAU * 4.5 * u) * (1 - 0.4 * v);
        const swell = 0.5 - 0.5 * Math.cos(TAU * (ph - lag) - 1.6 * u); // the gust, running from the inner edge out
        const bil = Math.pow(v, 1.7) * (0.06 + 0.24 * (0.35 + 0.65 * u) * swell + 0.03 * Math.sin(TAU * 2 * (ph - lag) - 3 * u));
        const sway = sgn * Math.pow(v, 2) * (0.05 * Math.sin(TAU * (ph - lag) - 1.0 * u) + 0.04 * u * swell);
        const x = -W + 0.09 + 0.02 + gather + bil;
        const y = CT - (CT - CB) * v + 0.45 * bil * v;
        const z = zo + (zi - zo) * u * (1 - 0.12 * (1 - v)) + sway;
        return [x, y, z];
      };
      const G = [];
      for (let j = 0; j <= NV; j++) {
        const row = [];
        for (let i = 0; i <= NU; i++) row.push(P(i / NU, j / NV));
        G.push(row);
      }
      const N = G.map((row, j) => row.map((q, i) => {
        const du = sub(row[Math.min(NU, i + 1)], row[Math.max(0, i - 1)]);
        const dv = sub(G[Math.min(NV, j + 1)][i], G[Math.max(0, j - 1)][i]);
        let n = nrm(cross(du, dv));
        if (n[0] < 0) n = mul(n, -1); // the room side (+X)
        return n;
      }));
      const front = G.map((row, j) => row.map((q, i) => add(q, mul(N[j][i], TH / 2))));
      const back = G.map((row, j) => row.map((q, i) => add(q, mul(N[j][i], -TH / 2))));
      for (let j = 0; j < NV; j++)
        for (let i = 0; i < NU; i++) {
          const ids = [[j, i], [j, i + 1], [j + 1, i + 1], [j + 1, i]];
          const nAvg = nrm(ids.reduce((s, [a, b]) => add(s, N[a][b]), [0, 0, 0]));
          const cen = mul(ids.reduce((s, [a, b]) => add(s, G[a][b]), [0, 0, 0]), 0.25);
          const f = ids.map(([a, b]) => front[a][b]), fn = ids.map(([a, b]) => N[a][b]);
          tri("curtain", f[0], f[1], f[2], sub(cen, nAvg), fn[0], fn[1], fn[2]);
          tri("curtain", f[0], f[2], f[3], sub(cen, nAvg), fn[0], fn[2], fn[3]);
          const b = ids.map(([a, b2]) => back[a][b2]), bn = fn.map((v) => mul(v, -1));
          tri("curtain", b[0], b[1], b[2], add(cen, nAvg), bn[0], bn[1], bn[2]);
          tri("curtain", b[0], b[2], b[3], add(cen, nAvg), bn[0], bn[2], bn[3]);
        }
      // close the four edges: each edge quad wound away from the neighbouring interior point
      const edge = (cells) => {
        for (let k = 0; k < cells.length - 1; k++) {
          const [[a0, b0, r0], [a1, b1]] = [cells[k], cells[k + 1]];
          quad("curtain", front[a0][b0], front[a1][b1], back[a1][b1], back[a0][b0], G[r0[0]][r0[1]]);
        }
      };
      const cl = (v) => Math.max(1, Math.min(v, 1e9));
      edge(Array.from({ length: NU + 1 }, (_, i) => [0, i, [1, Math.min(NU - 1, cl(i))]]));
      edge(Array.from({ length: NU + 1 }, (_, i) => [NV, i, [NV - 1, Math.min(NU - 1, cl(i))]]));
      edge(Array.from({ length: NV + 1 }, (_, j) => [j, 0, [Math.min(NV - 1, cl(j)), 1]]));
      edge(Array.from({ length: NV + 1 }, (_, j) => [j, NU, [Math.min(NV - 1, cl(j)), NU - 1]]));
    });
    return soups.curtain;
  }
  const first = sheet(0);
  const curtains = makeMesh("curtain", first.p, first.n);
  curtains.name = "curtains";
  body.add(curtains);
  const anchor = new THREE.Group(); // the window's centre, for close-ups (--focus window)
  anchor.name = "window";
  anchor.position.set(-W + 0.1, F + (SILL + HEAD) / 2, (WZ0 + WZ1) / 2);
  body.add(anchor);
  joints.window = anchor;

  function setCurtains(t) {
    const s = sheet(t);
    const g = makeGeom(s.p, s.n);
    curtains.geometry.dispose();
    curtains.geometry = g;
    for (const ch of curtains.children) if (ch.userData.isHull) ch.geometry = kit.hullNormals(g);
  }

  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`school-library: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      setCurtains((((+m[2]) % CLIPS[m[1]]) + CLIPS[m[1]]) % CLIPS[m[1]]);
    } else if (name === "rest") setCurtains(0);
    else throw new Error(`school-library: unknown pose "${name}" (rest, or breeze@<seconds>)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
