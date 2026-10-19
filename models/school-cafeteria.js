// school-cafeteria.js - the gakushoku of every school anime: a steel serving counter with a tray rail and steaming food
// wells, the meal-ticket machine by the door, a water dispenser, the tray return rack, long white tables with green
// benches set with a few lunch trays, a menu board of blank coloured slips and a wall of big windows. A cutaway set
// piece at real size.
// Contract: harness/lab/README.md. Meters, +Y up, the room's open (cutaway) sides face +X and +Z so the lab's
// front-left cameras look in; the -Z wall holds the kitchen, counter and menu board, the -X wall the windows and the
// tray return rack. Stands on y = 0 (the floor slab's top is y = 0.05), centred on the room.
//
// Construction (boxes, 4-sided rods and closed lathe solids for the tableware, all triangle soups merged per
// material: 12 meshes, ~7.8k triangles at the default three tables). Every box and rod is wound away from a point
// inside it; every lathe from its profile's outward normal (profiles run counter-clockwise in the r-y half plane),
// so concave bowls wind right without a hand-picked flip.
//   SHELL     a floor slab with a 0.5 m tile grid; two walls 12 cm thick (the -X one cut round a long window band),
//             a green wainscot with a rail and skirting, and a dark section cap on every cut wall top. No ceiling.
//   WINDOWS   one band of four tall sashes in dark frames from 0.9 to 2.45 m, a transom bar, pale glass, a sill board.
//   KITCHEN   a steel back bench against the wall with a stock pot and a rice cooker; a side bench closes it at +X.
//   COUNTER   the serving counter (green body, steel top, dark plinth), six food wells (steel rim, dark gap, coloured
//             food) each with two S-curved wisps of steam (closed tapered tubes rising out of the food), a stack of trays at its -X end, and a three-bar tray rail on
//             brackets along its customer side.
//   MENU      a board on the back wall above the kitchen: steel frame, dark field, a red header strip and two rows of
//             blank coloured slips (no text anywhere).
//   MACHINES  the meal-ticket machine (white body, red header, a 4 x 5 grid of blank buttons, dark slots and a ticket
//             tray) and a water dispenser (body, dark alcove with nozzle and drip grid, two buttons, cups on top).
//   RETURN    a steel tray return rack against the window wall: four wire shelves of trays and a few stacked bowls.
//   SEATING   `tables` long tables running along Z (white top and frame) each with a green bench either side; two lunch
//             trays per table (rice bowl, red miso bowl, a plate with a cutlet and cabbage, a cup, chopsticks).
// Proportions (real size, base unit the storey H = 2.75 m over a 5 cm slab, 2.8 m in all = meta.height): interior
//   6.0 (x) by 5.5 (z); counter 3.6 x 0.55 x 0.88; rail at 0.82; tables 2.5 x 0.8 at 0.72, benches 0.42 high 0.3 wide;
//   ticket machine 0.7 x 0.45 x 1.75; dispenser 0.45 x 0.4 x 1.2; return rack 0.9 x 0.45 x 1.55; menu board 3.1 x 0.75
//   from 1.7; trays 0.44 x 0.32, bowls 0.06 radius (a touch big so they survive the room shot).
// Options: build(THREE, kit, colors, { height, tables }): `height` scales the whole set uniformly so the wall top is
//   `height` (2.8); `tables` is 1-3 long tables (default 3), centred, 1.55 m apart.
// Ink in pixels: walls, counter, machines and furniture 2.5, tableware and small parts 1.5.
// Colours (meadow: greens and a pale sky), base / shade:
//   walls        moon #f7f3e1 / sky #d7ecef, threshold 0.1 (the +Z-facing back wall stays lit)
//   green        iris #3f8a47 / hair #2c5131 (wainscot, benches, counter body)
//   steel        sclera #f6f3ee / sky #d7ecef (counter top, kitchen, machines, rack, tables, bench frames, cups, rice); steam
//                sclera flat
//   floor        skin #f0c2ae flat, tile grid moon flat; glass sky flat
//   dark         hair #2c5131 flat with ink (frames, caps, menu field, well gaps, slots, plinths, chopsticks)
//   trays        line #a9d16e / iris (trays, cabbage, green slips and buttons)
//   red          accent #d9483b flat (miso bowls, header strips, slips, buttons)
//   yellow       practical #f2c94c flat (rice bowls, cutlets, curry well, slips, buttons)
//   food         skin flat (miso soup, the stew well)

export const meta = {
  name: "school-cafeteria",
  height: 2.8,
  script: "meadow",
  colors: {
    wall: "#f7f3e1", wallShade: "#d7ecef",
    green: "#3f8a47", greenShade: "#2c5131",
    steel: "#f6f3ee", steelShade: "#d7ecef",
    floor: "#f0c2ae", seam: "#f7f3e1",
    dark: "#2c5131",
    glass: "#d7ecef",
    tray: "#a9d16e", trayShade: "#3f8a47",
    red: "#d9483b",
    yellow: "#f2c94c",
    food: "#f0c2ae",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const NATURAL = 2.8;
  const height = opts.height ?? NATURAL;
  const nTables = Math.max(1, Math.min(3, Math.round(opts.tables ?? 3)));
  const root = new THREE.Group();
  root.name = "school-cafeteria";
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
  const F = 0.05; // floor slab: room coordinates start on its top
  let M = new THREE.Matrix4().makeTranslation(0, F, 0);
  const v3 = new THREE.Vector3();
  const put = (s, q, nq) => {
    v3.set(...q).applyMatrix4(M);
    s.p.push(v3.x, v3.y, v3.z);
    v3.set(...nq).transformDirection(M);
    s.n.push(v3.x, v3.y, v3.z);
  };
  // a triangle wound so its face normal points along `out` (a direction), optional smooth vertex normals
  function triOut(key, a, b, e, out, na, nb, ne) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const flip = dot(n, out) < 0;
    if (flip) n = mul(n, -1);
    n = nrm(n);
    const s = S(key);
    const [B, NB, E, NE] = flip ? [e, ne, b, nb] : [b, nb, e, ne];
    put(s, a, na ?? n), put(s, B, NB ?? n), put(s, E, NE ?? n);
  }
  // a triangle wound away from a point `ref` inside the solid
  const tri = (key, a, b, e, ref, na, nb, ne) =>
    triOut(key, a, b, e, sub(mul(add(add(a, b), e), 1 / 3), ref), na, nb, ne);
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
  // a capped n-sided rod from a to b, radius r
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
  // a closed lathe solid round the vertical axis at (cx, y0, cz): `prof` is [r, y] counter-clockwise in the r-y
  // half plane, starting and ending on the axis, so each segment's outward normal is (dy, -dr)
  function lathe(key, cx, y0, cz, prof, seg = 8) {
    for (let k = 0; k < prof.length - 1; k++) {
      const [r0, h0] = prof[k], [r1, h1] = prof[k + 1];
      const [nr, ny] = (() => { const l = Math.hypot(h1 - h0, r1 - r0) || 1; return [(h1 - h0) / l, -(r1 - r0) / l]; })();
      for (let i = 0; i < seg; i++) {
        const t0 = (i / seg) * Math.PI * 2, t1 = ((i + 1) / seg) * Math.PI * 2;
        const P = (r, h, t) => [cx + r * Math.cos(t), y0 + h, cz + r * Math.sin(t)];
        const N = (t) => [nr * Math.cos(t), ny, nr * Math.sin(t)];
        const tm = (t0 + t1) / 2, out = N(tm);
        triOut(key, P(r0, h0, t0), P(r1, h1, t0), P(r1, h1, t1), out, N(t0), N(t0), N(t1));
        triOut(key, P(r0, h0, t0), P(r1, h1, t1), P(r0, h0, t1), out, N(t0), N(t1), N(t1));
      }
    }
  }
  // a closed tube along a polyline, radius rad(i) per point (0 at both ends closes it to points)
  function tube(key, pts, rad, sides = 5) {
    const rings = pts.map((P, i) => {
      const T = nrm(sub(pts[Math.min(pts.length - 1, i + 1)], pts[Math.max(0, i - 1)]));
      const up = Math.abs(T[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
      const u = nrm(cross(up, T)), w = cross(T, u);
      return Array.from({ length: sides }, (_, j) => {
        const t = (j / sides) * Math.PI * 2, d = add(mul(u, Math.cos(t)), mul(w, Math.sin(t)));
        return { q: add(P, mul(d, rad(i))), n: d };
      });
    });
    for (let i = 0; i < pts.length - 1; i++) {
      const A = rings[i], B = rings[i + 1], mid = mul(add(pts[i], pts[i + 1]), 0.5);
      for (let j = 0; j < sides; j++) {
        const k = (j + 1) % sides;
        tri(key, A[j].q, A[k].q, B[k].q, mid, A[j].n, A[k].n, B[k].n);
        tri(key, A[j].q, B[k].q, B[j].q, mid, A[j].n, B[k].n, B[j].n);
      }
    }
  }
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const place = (x, z, yaw, fn, y = 0) => {
    const saved = M;
    M = saved.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z)).multiply(new THREE.Matrix4().makeRotationY(yaw));
    fn();
    M = saved;
  };

  // ---------- the shell ----------
  const W = 3.0, L = 2.75, H = 2.75, T = 0.12, CAP = 0.025;
  box("floor", -W - T, W, -F, 0, -L - T, L);
  for (let x = -W + 0.5; x < W - 0.01; x += 0.5) plate("seam", [x, 0.0015, 0], [0, 1, 0], 0.012, 2 * L - 0.01);
  for (let z = -L + 0.5; z < L - 0.01; z += 0.5) plate("seam", [0, 0.0015, z], [0, 1, 0], 2 * W - 0.01, 0.012);
  const SILL = 0.9, HEAD = 2.45, WZ0 = -2.3, WZ1 = 1.4;
  const wallBox = (x0, x1, y0, y1, z0, z1, cut) => {
    box("wall", x0, x1, y0, cut ? y1 - CAP : y1, z0, z1);
    if (cut) box("dark", x0, x1, y1 - CAP, y1, z0, z1);
  };
  wallBox(-W - T, W, -F, H, -L - T, -L, true); // back wall (-Z)
  const wx0 = -W - T, wx1 = -W;
  wallBox(wx0, wx1, -F, SILL, -L, L, false);
  wallBox(wx0, wx1, HEAD, H, -L, L, true);
  wallBox(wx0, wx1, SILL, HEAD, -L, WZ0, false);
  wallBox(wx0, wx1, SILL, HEAD, WZ1, L, true);
  box("dark", wx0, wx1, SILL, HEAD, L - 0.001, L); // the cut end of the wall past the window, capped
  // green wainscot 1.5 cm proud with a rail; dark skirting
  const WS = 0.86;
  box("green", -W, W, 0, WS, -L, -L + 0.015);
  box("green", -W, -W + 0.015, 0, WS, -L, L);
  box("green", -W, W, WS, WS + 0.04, -L, -L + 0.03);
  box("green", -W, -W + 0.03, WS, WS + 0.04, -L, L);
  box("dark", -W, W, 0, 0.08, -L + 0.015, -L + 0.022);
  box("dark", -W + 0.015, -W + 0.022, 0, 0.08, -L, L);

  // ---------- windows: one band of four sashes ----------
  {
    const FR = 0.05, xm = (wx0 + wx1) / 2, TR = 2.05;
    box("dark", wx0 - 0.01, wx1 + 0.02, SILL, SILL + FR, WZ0, WZ1);
    box("dark", wx0 - 0.01, wx1 + 0.02, HEAD - FR, HEAD, WZ0, WZ1);
    box("dark", wx0 - 0.01, wx1 + 0.02, SILL, HEAD, WZ0, WZ0 + FR);
    box("dark", wx0 - 0.01, wx1 + 0.02, SILL, HEAD, WZ1 - FR, WZ1);
    box("dark", xm - 0.02, xm + 0.025, TR - 0.02, TR + 0.02, WZ0, WZ1); // transom bar
    const span = WZ1 - WZ0 - 2 * FR;
    for (let k = 1; k < 4; k++) {
      const z = WZ0 + FR + (k * span) / 4;
      box("dark", xm - 0.02, xm + 0.025, SILL, HEAD, z - 0.025, z + 0.025);
    }
    plate("glass", [xm + 0.004, (SILL + HEAD) / 2, (WZ0 + WZ1) / 2], [1, 0, 0], span, HEAD - SILL - 2 * FR);
    plate("glass", [xm - 0.004, (SILL + HEAD) / 2, (WZ0 + WZ1) / 2], [-1, 0, 0], span, HEAD - SILL - 2 * FR);
    box("steel", wx1, wx1 + 0.1, SILL - 0.03, SILL, WZ0 - 0.04, WZ1 + 0.04); // sill board
  }

  // ---------- kitchen: back bench, side bench, pot and rice cooker ----------
  const KX0 = -W + 0.02, KX1 = 1.2, BY = 0.88;
  box("steel", KX0, KX1, 0.1, BY, -L + 0.02, -L + 0.58);
  box("dark", KX0, KX1, 0, 0.1, -L + 0.04, -L + 0.54);
  box("dark", KX0 + 0.05, KX1 - 0.05, 0.45, 0.46, -L + 0.581, -L + 0.585); // a drawer line
  lathe("steel", -1.6, BY, -L + 0.3, [[0, 0], [0.19, 0], [0.2, 0.34], [0.21, 0.36], [0.17, 0.36], [0, 0.35]], 10); // stock pot
  rod("dark", [-1.81, BY + 0.3, -L + 0.3], [-1.86, BY + 0.3, -L + 0.3], 0.014);
  rod("dark", [-1.39, BY + 0.3, -L + 0.3], [-1.34, BY + 0.3, -L + 0.3], 0.014);
  lathe("steel", 0.2, BY, -L + 0.3, [[0, 0], [0.17, 0], [0.19, 0.12], [0.18, 0.22], [0.12, 0.27], [0, 0.28]], 10); // rice cooker
  box("dark", 0.15, 0.25, BY + 0.27, BY + 0.3, -L + 0.27, -L + 0.33);
  box("red", 0.12, 0.2, BY + 0.06, BY + 0.1, -L + 0.46, -L + 0.5);

  // ---------- serving counter, wells, trays stack, tray rail ----------
  const CX0 = -2.4, CX1 = 1.2, CZ0 = -1.75, CZ1 = -1.2, CH = 0.88;
  box("green", CX0, CX1, 0.12, CH - 0.04, CZ0 + 0.02, CZ1 - 0.02);
  box("dark", CX0 + 0.02, CX1 - 0.02, 0, 0.12, CZ0 + 0.04, CZ1 - 0.04); // kick plinth
  box("steel", CX0 - 0.03, CX1 + 0.03, CH - 0.04, CH, CZ0, CZ1 + 0.02); // top
  box("dark", CX0, CX1, CH - 0.2, CH - 0.19, CZ1 - 0.02, CZ1 - 0.012); // panel groove
  box("steel", KX1, KX1 + 0.32, 0, CH, -L + 0.02, CZ1 - 0.02); // side bench closing the kitchen at +X
  const FOOD = ["yellow", "food", "tray", "red", "yellow", "food"];
  const WELL0 = -1.65, WELLW = 0.42, wz0 = CZ0 + 0.08, wz1 = CZ1 - 0.1;
  FOOD.forEach((f, i) => {
    const x0 = WELL0 + i * (WELLW + 0.06), x1 = x0 + WELLW;
    box("steel", x0, x1, CH, CH + 0.02, wz0, wz1);
    box("dark", x0 + 0.02, x1 - 0.02, CH + 0.02, CH + 0.022, wz0 + 0.02, wz1 - 0.02);
    // the food sits a hair proud of the gap, rounded up in the middle
    const y0 = CH + 0.022, a = x0 + 0.04, b = x1 - 0.04, za = wz0 + 0.04, zb = wz1 - 0.04, mx = (a + b) / 2, mz = (za + zb) / 2;
    hex(f, [[a, y0, za], [b, y0, za], [b, y0, zb], [a, y0, zb],
      [a, y0 + 0.01, za], [b, y0 + 0.01, za], [b, y0 + 0.01, zb], [a, y0 + 0.01, zb]]);
    lathe(f, mx, y0 + 0.005, mz, [[0, 0], [0.12, 0], [0.08, 0.03], [0, 0.04]], 6);
    // two wisps of steam rising out of the food in S curves, tapering to points
    for (let w = 0; w < 2; w++) {
      const ph = hash(i * 2 + w + 7) * 6.28, ox = (w - 0.5) * 0.14, N = 9;
      const pts = Array.from({ length: N }, (_, j) => {
        const t = j / (N - 1);
        return [mx + ox + 0.04 * Math.sin(ph + t * 7.5) * t, y0 + 0.01 + t * (0.3 + 0.06 * w), mz + 0.02 * Math.cos(ph + t * 5)];
      });
      tube("steam", pts, (j) => 0.022 * Math.pow(Math.sin(Math.PI * Math.min(0.999, (j / (N - 1)) * 0.92 + 0.04)), 0.7) * (1 - 0.35 * j / (N - 1)) * (j === 0 || j === N - 1 ? 0 : 1), 5);
    }
  });
  // stack of clean trays at the counter's -X end, where the line starts
  for (let i = 0; i < 7; i++) box("tray", CX0 + 0.05, CX0 + 0.37, CH + i * 0.022, CH + i * 0.022 + 0.018, CZ0 + 0.06, CZ0 + 0.5);
  // tray rail: three bars on brackets from the counter's customer face
  const RY = 0.82, RZ = CZ1 + 0.26;
  for (let x = CX0 + 0.15; x < CX1; x += 0.6) {
    box("steel", x - 0.015, x + 0.015, RY - 0.06, RY - 0.03, CZ1 - 0.02, RZ + 0.02);
    box("steel", x - 0.015, x + 0.015, RY - 0.16, RY - 0.03, CZ1 - 0.02, CZ1 + 0.01);
  }
  for (const dz of [0.04, 0.13, 0.22]) rod("steel", [CX0 - 0.05, RY - 0.015, CZ1 + dz], [CX1 + 0.05, RY - 0.015, CZ1 + dz], 0.014, 6);

  // ---------- menu board above the kitchen ----------
  {
    const x0 = -2.35, x1 = 0.85, y0 = 1.68, y1 = 2.45, z = -L;
    box("steel", x0, x1, y0, y1, z, z + 0.03);
    box("dark", x0 + 0.04, x1 - 0.04, y0 + 0.04, y1 - 0.04, z + 0.03, z + 0.035);
    box("red", x0 + 0.08, x1 - 0.08, y1 - 0.15, y1 - 0.07, z + 0.035, z + 0.045); // header strip
    const SLIP = ["steel", "yellow", "steel", "tray", "red", "steel", "yellow", "tray"];
    for (const [r, top, h] of [[0, y1 - 0.2, 0.26], [1, y1 - 0.5, 0.2]]) {
      const n = r ? 11 : 14, sw = (x1 - x0 - 0.16) / n;
      for (let i = 0; i < n; i++) {
        const key = SLIP[Math.floor(hash(i * 3.7 + r * 50) * SLIP.length)];
        const xa = x0 + 0.08 + i * sw + 0.015;
        box(key, xa, xa + sw - 0.03, top - h, top, z + 0.035, z + 0.043);
      }
    }
  }

  // ---------- meal-ticket machine (local: back against the wall at z = 0, faces +Z) ----------
  function ticketMachine() {
    const hw = 0.35, D = 0.45, TH = 1.75;
    box("dark", -hw + 0.03, hw - 0.03, 0, 0.08, 0.02, D - 0.03);
    box("steel", -hw, hw, 0.08, TH, 0, D);
    box("red", -hw + 0.04, hw - 0.04, TH - 0.2, TH - 0.06, D, D + 0.012); // blank header
    box("steel", -hw + 0.03, hw - 0.03, 0.95, 1.5, D, D + 0.03); // button panel, proud
    const BTN = ["yellow", "steel", "tray", "yellow", "red", "tray", "steel", "yellow"];
    for (let r = 0; r < 5; r++)
      for (let k = 0; k < 4; k++) {
        const key = BTN[Math.floor(hash(r * 4 + k + 200) * BTN.length)];
        const x = -hw + 0.07 + k * 0.145, y = 1.43 - r * 0.095;
        box(key === "steel" ? "food" : key, x, x + 0.12, y - 0.065, y, D + 0.03, D + 0.045);
      }
    box("dark", 0.12, 0.28, 0.8, 0.83, D, D + 0.008); // bill slot
    box("dark", -0.26, -0.18, 0.78, 0.86, D, D + 0.008); // coin slot plate
    box("dark", -0.2, 0.2, 0.42, 0.56, D - 0.06, D + 0.004); // ticket and change outlet
    box("steel", -0.22, 0.22, 0.38, 0.42, D - 0.06, D + 0.06); // its lip
  }
  place(1.95, -L, 0, ticketMachine);

  // ---------- water dispenser (local: back at z = 0, faces +Z) ----------
  function dispenser() {
    const hw = 0.22, D = 0.4, TH = 1.2;
    box("steel", -hw, hw, 0, TH, 0, D);
    box("dark", -hw + 0.04, hw - 0.04, 0.72, 1.05, D - 0.1, D + 0.002); // alcove
    box("steel", -0.03, 0.03, 0.98, 1.05, D - 0.08, D - 0.03); // nozzle
    box("steel", -hw + 0.05, hw - 0.05, 0.72, 0.76, D - 0.1, D + 0.03); // drip grid
    box("red", -0.12, -0.04, 1.1, 1.15, D, D + 0.015);
    box("tray", 0.04, 0.12, 1.1, 1.15, D, D + 0.015);
    box("dark", -hw + 0.04, hw - 0.04, 0.2, 0.21, D, D + 0.004); // service panel line
    for (let i = 0; i < 2; i++) // two stacks of cups on top
      lathe("steel", -0.08 + i * 0.16, TH, 0.2, [[0, 0], [0.032, 0], [0.04, 0.16 - i * 0.04], [0, 0.16 - i * 0.04]], 8);
  }
  place(2.62, -L, 0, dispenser);

  // ---------- tableware (local: tray centre on its top, the diner at +Z) ----------
  function bowl(key, x, y, z, R, h) {
    lathe(key, x, y, z, [[0, 0], [R * 0.55, 0], [R * 0.55, 0.008], [R * 0.85, h * 0.35], [R, h], [R - 0.006, h],
      [R * 0.8, h * 0.4], [R * 0.45, h * 0.15], [0, h * 0.15]], 8);
  }
  function lunch(seed) {
    box("tray", -0.22, 0.22, -0.018, 0, -0.16, 0.16);
    box("tray", -0.22, 0.22, 0, 0.012, 0.145, 0.16); // raised lips front and back
    box("tray", -0.22, 0.22, 0, 0.012, -0.16, -0.145);
    // rice bowl (yellow melamine) with a dome of rice
    bowl("yellow", -0.1, 0, 0.07, 0.06, 0.055);
    lathe("steel", -0.1, 0.035, 0.07, [[0, 0], [0.05, 0], [0.052, 0.02], [0.035, 0.04], [0, 0.048]], 8);
    // miso bowl (red lacquer) with soup
    bowl("red", 0.06, 0, 0.07, 0.055, 0.055);
    lathe("food", 0.06, 0.03, 0.07, [[0, 0], [0.043, 0], [0.047, 0.018], [0, 0.018]], 8);
    // main plate: cutlet and cabbage
    lathe("steel", -0.05, 0, -0.07, [[0, 0], [0.06, 0], [0.09, 0.016], [0.085, 0.02], [0, 0.012]], 10);
    box("yellow", -0.1, -0.01, 0.012, 0.035, -0.105, -0.045);
    lathe("tray", 0.005, 0.012, -0.07, [[0, 0], [0.035, 0], [0.03, 0.02], [0.012, 0.035], [0, 0.038]], 6);
    // cup
    lathe("steel", 0.15, 0, -0.065, [[0, 0], [0.03, 0], [0.036, 0.09], [0, 0.09]], 8);
    // chopsticks along the front lip
    const s = 0.004 * hash(seed);
    rod("dark", [-0.15, 0.016, 0.125 + s], [0.12, 0.016, 0.12 + s], 0.005);
    rod("dark", [-0.15, 0.016, 0.135 + s], [0.12, 0.016, 0.136 + s], 0.005);
  }

  // ---------- tables and benches (local: long along z, centred) ----------
  const TY = 0.72, TL = 1.25, TW = 0.4, BH = 0.42, BOFF = 0.62;
  function table() {
    box("steel", -TW, TW, TY - 0.035, TY, -TL, TL);
    box("steel", -TW + 0.06, TW - 0.06, TY - 0.11, TY - 0.035, -TL + 0.1, TL - 0.1); // apron
    for (const sz of [-1, 0, 1]) { // three leg frames
      const z = sz * (TL - 0.2);
      box("steel", -TW + 0.1, TW - 0.1, 0.0, 0.05, z - 0.03, z + 0.03);
      box("steel", -0.03, 0.03, 0.05, TY - 0.11, z - 0.03, z + 0.03);
    }
    for (const sx of [-1, 1]) { // benches
      const x = sx * BOFF;
      box("green", x - 0.15, x + 0.15, BH - 0.04, BH, -TL + 0.05, TL - 0.05);
      for (const sz of [-1, 1]) { // an end frame: two posts on a foot bar
        const z = sz * (TL - 0.25);
        box("steel", x - 0.12, x + 0.12, 0, 0.035, z - 0.02, z + 0.02);
        for (const dx of [-0.09, 0.09]) box("steel", x + dx - 0.02, x + dx + 0.02, 0.035, BH - 0.04, z - 0.02, z + 0.02);
      }
    }
  }
  const TX = Array.from({ length: nTables }, (_, i) => (i - (nTables - 1) / 2) * 1.55 + 0.1), TZ = 1.35;
  TX.forEach((x, ti) => {
    place(x, TZ, 0, table);
    // two lunches per table, on alternating sides
    for (let j = 0; j < 2; j++) {
      const side = (ti + j) % 2 ? 1 : -1, z = TZ - 0.7 + j * 1.05 + 0.3 * hash(ti * 5 + j);
      place(x + side * 0.2, z, side * Math.PI / 2, () => lunch(ti * 9 + j), TY + 0.018);
    }
  });

  // ---------- tray return rack against the window wall (local: back at z = 0, faces +Z) ----------
  function returnRack() {
    const hw = 0.45, D = 0.45, TH = 1.55;
    for (const sx of [-1, 1]) for (const zz of [0.02, D - 0.02])
      box("steel", sx * hw - 0.02, sx * hw + 0.02, 0, TH, zz - 0.02, zz + 0.02);
    box("steel", -hw - 0.02, hw + 0.02, TH - 0.03, TH, 0, D);
    const shelves = [0.12, 0.48, 0.84, 1.2];
    shelves.forEach((y, i) => {
      box("steel", -hw, hw, y - 0.02, y, 0.02, D - 0.02);
      for (let k = 0; k < 2; k++) {
        const out = 0.04 * hash(i * 3 + k), x = -0.42 + k * 0.42;
        for (let t = 0; t < (i === 3 ? 1 : 3 - k); t++)
          box("tray", x + 0.02, x + 0.4, y + t * 0.022, y + t * 0.022 + 0.018, 0.04 + out, 0.36 + out);
      }
      if (i === 1 || i === 3) for (let b = 0; b < 3; b++) bowl(b % 2 ? "red" : "yellow", 0.22, y + 0.022 + b * 0.025, 0.2, 0.06, 0.055);
    });
  }
  place(-W, 2.05, Math.PI / 2, returnRack);

  // ---------- meshes ----------
  const MAT = {
    wall: [c.wall, c.wallShade, 0.1, 2.5],
    floor: [c.floor, c.floor, 0.1, 2.5],
    seam: [c.seam, c.seam, 0.1, 0],
    dark: [c.dark, c.dark, 0.1, 2],
    green: [c.green, c.greenShade, 0.1, 2.5],
    steel: [c.steel, c.steelShade, 0.1, 2],
    glass: [c.glass, c.glass, 0.1, 0],
    tray: [c.tray, c.trayShade, 0.1, 1.5],
    red: [c.red, c.red, 0.1, 1.5],
    yellow: [c.yellow, c.yellow, 0.1, 1.5],
    food: [c.food, c.food, 0.1, 1.5],
    steam: [c.steel, c.steel, 0.1, 1.5],
  };
  const makeGeom = (p, n) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    return g;
  };
  for (const [key, soup] of Object.entries(soups)) {
    const [base, shade, threshold, px] = MAT[key];
    const mesh = kit.toon(makeGeom(soup.p, soup.n), base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    body.add(mesh);
  }
  const anchor = new THREE.Group(); // the serving counter's middle, for close-ups (--focus counter)
  anchor.name = "counter";
  anchor.position.set((CX0 + CX1) / 2, F + CH, (CZ0 + CZ1) / 2);
  body.add(anchor);
  joints.counter = anchor;

  function pose(name) {
    if (name !== "rest") throw new Error(`school-cafeteria: unknown pose "${name}" (rest only)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
