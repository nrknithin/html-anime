// kominka.js - a thatched countryside farmhouse (satoyama anime summer), static, real size.
// Contract: harness/lab/README.md. Meters, +Y up, the yard / entrance side faces +Z, its left is +X (the side with the
// firewood stack; the well stands off the -X / front corner, by the doma), stands on y = 0, centred on x = 0, z = 0 (the bbox with the well).
//
// Construction (triangle soups merged per material; flat-shaded, so planes read crisp and the round eave reads faceted):
//   THATCH   an irimoya roof in two closed solids that share one slope plane:
//            SKIRT  a loft of rounded rectangles (corner radius shrinking up the slope, so the hips are soft as thatch
//                   is): soffit ring at the wall, a five-ring rounded lip 0.6 m thick at the eave, then rings up the
//                   45 deg slope on all four sides to the gable height, closed flat there.
//            SHELL  the upper gable roof: a thick inverted V (0.75 m, cut square at the ends so the thatch thickness
//                   shows as a chevron) extruded along the ridge past the gable plane, its outer faces in the skirt's
//                   long-side planes. Under it the gable triangle (dark wood, board lines, a smoke-vent lattice).
//            Thatch layer lines are flat bands 5 cm proud of the slopes. Ridge: a dark box cap, six pairs of crossed
//            ridge logs (X over the cap) and a long log riding in the crotches.
//   BODY     a stone plinth band with joint lines, a plaster box, a dark timber frame laid on it (sill, posts on a 1.95 m
//            bay, tie beam, head beam), so the walls read as white panels in dark wood.
//   FRONT    left: the doma, a wide opening with one big plank door slid half open on its rail (the dark earth-floored
//            interior shows) and a threshold slab; right: an engawa deck on short legs with eight sliding doors (shoji
//            paper above a glass band, kumiko grid) and a shoe stone.
//   YARD     stepping stones to the doma; a stone well ring with a wooden lid frame, a bucket frame (two posts, a beam,
//            a small plank roof, pulley, rope, bucket); a firewood stack against the +X wall under the eave.
//   Solids are lofts of rings with caps, wound by their signed volume; boxes and flat bands are wound away from a point
//   inside, never by hand.
// Proportions (real size, base unit the bay B = 1.95 m): walls 12.0 x 8.0 (6.2 B x 4.1 B), plinth 0-0.35, wall top 2.7;
// eave lip 2.1-2.7 with 1.1 m overhang (14.2 x 10.2 at the eave), slope 45 deg, gable from 5.6, thatch apex 7.65,
// ridge cap 7.71, crossed logs to 8.19. Engawa 0.95 deep, floor 0.6. Doma opening 2.6 x 2.0. Well ring r 0.6, frame 2.2.
// Options: build(THREE, kit, colors, { height, well }): height scales everything uniformly (default meta.height);
//   well: false drops the well, its frame and its path (the bbox then loses 1.1 m on -X).
// Colours (noon): thatch sky #f2d7ae / iris #5c3d32 at threshold 0.35, so the lit slopes are straw gold and the eave
//   underside, the back and far slopes go brown; thatch lines iris. Timber, ridge, door, deck iris / hair; plaster
//   moon #fff6e4 / sky; shoji paper practical #fffaf2 / sclera #f6f3ee; glass sky / skin; stone sclera / skin (pale granite);
//   lines (stone joints, kumiko, boards) iris flat; the doma dark and well water hair flat; log ends sky / skin.

export const meta = {
  name: "kominka",
  height: 8.19,
  script: "noon",
  colors: {
    thatch: "#f2d7ae", thatchShade: "#5c3d32",
    thatchLine: "#5c3d32",
    wood: "#5c3d32", woodShade: "#241c16",
    plaster: "#fff6e4", plasterShade: "#f2d7ae",
    paper: "#fffaf2", paperShade: "#f6f3ee",
    glass: "#f2d7ae", glassShade: "#f0c2ae",
    stone: "#f6f3ee", stoneShade: "#f0c2ae",
    line: "#5c3d32",
    dark: "#241c16",
    cut: "#f2d7ae", cutShade: "#f0c2ae",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, well = true } = opts;
  const root = new THREE.Group();
  root.name = "kominka";
  const house = new THREE.Group(); // the uniform size scale lives here, root stays the plain contract node
  house.name = "body";
  house.scale.setScalar(height / meta.height);
  root.add(house);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  // one triangle wound away from `ref` (a point inside the solid); slivers dropped
  function tri(key, a, b, e, ref) {
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-7) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    S(key).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, cx, cy, cz, sx, sy, sz) {
    const [x0, x1, y0, y1, z0, z1] = [cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2];
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  const nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  function beam(key, a, b, w, h, up = [0, 1, 0]) {
    const d = sub(b, a);
    const s = nrm(cross(d, up)), u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // a closed solid lofted through rings (closed loops of equal length), capped by fans to c0 / c1; wound by the sign
  // of its volume, so only the ring order has to be consistent
  function solid(key, rings, c0, c1) {
    const t = [];
    const add = (a, b, e) => { if (Math.hypot(...cross(sub(b, a), sub(e, a))) > 1e-8) t.push([a, b, e]); };
    const n = rings[0].length;
    for (let k = 0; k + 1 < rings.length; k++)
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, A = rings[k][i], B = rings[k + 1][i], C = rings[k + 1][j], D = rings[k][j];
        add(A, B, C); add(A, C, D);
      }
    const cen = (r) => [0, 1, 2].map((q) => r.reduce((s, p) => s + p[q], 0) / r.length);
    const r0 = rings[0], r1 = rings[rings.length - 1];
    const a0 = c0 ?? cen(r0), a1 = c1 ?? cen(r1);
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; add(a0, r0[i], r0[j]); add(a1, r1[j], r1[i]); }
    const vol = t.reduce((s, [a, b, e]) => s + dot(a, cross(b, e)), 0);
    for (const [a, b, e] of t) S(key).push(...a, ...(vol < 0 ? [...e, ...b] : [...b, ...e]));
  }
  // a round log from a to b, n-sided
  function cyl(key, a, b, r, n = 6, r1 = r) {
    const d = nrm(sub(b, a));
    const s = nrm(cross(d, Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), u = cross(s, d);
    const ring = (o, rr) => Array.from({ length: n }, (_, i) => {
      const t = (i / n) * Math.PI * 2;
      return [0, 1, 2].map((q) => o[q] + rr * (Math.cos(t) * s[q] + Math.sin(t) * u[q]));
    });
    solid(key, [ring(a, r), ring(b, r1)]);
    return { s, u, d };
  }
  // deterministic jitter in [-1, 1]
  const jit = (i) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return 2 * (v - Math.floor(v)) - 1; };

  // ---------- wall faces: local (u along the wall, y, o out of the wall) -> world; `at` is the wall's distance ----------
  const face = (side, at) => ({
    p: (u, y, o) => side === "+z" ? [u, y, at + o] : side === "-z" ? [-u, y, -at - o] : side === "+x" ? [at + o, y, -u] : [-at - o, y, u],
    s: (w, h, d) => (side[1] === "z" ? [w, h, d] : [d, h, w]),
  });
  const wbox = (key, f, u, y, o, w, h, d) => box(key, ...f.p(u, y, o), ...f.s(w, h, d));
  const wquad = (key, f, u, y, o, w, h) =>
    quad(key, f.p(u - w / 2, y - h / 2, o), f.p(u + w / 2, y - h / 2, o), f.p(u + w / 2, y + h / 2, o), f.p(u - w / 2, y + h / 2, o), f.p(u, y, o - 1));
  // a window: inked frame, pane, lattice bars [vertical, horizontal]
  function win(f, u, y0, w, h, { pane = "paper", bars = [4, 2], bar = 0.03 } = {}) {
    const yc = y0 + h / 2;
    wbox("frame", f, u, yc, 0.03, w + 0.14, h + 0.14, 0.06);
    wquad(pane, f, u, yc, 0.07, w, h);
    const [nv, nh] = bars;
    for (let i = 1; i <= nv; i++) wquad("line", f, u - w / 2 + (i * w) / (nv + 1), yc, 0.078, bar, h);
    for (let j = 1; j <= nh; j++) wquad("line", f, u, y0 + (j * h) / (nh + 1), 0.078, w, bar);
  }

  // ---------- body ----------
  const WX = 6.0, WZ = 4.0, PY = 0.35, TOP = 2.7; // half walls, plinth top, wall top
  box("stone", 0, PY / 2, 0, 2 * WX + 0.16, PY, 2 * WZ + 0.16);
  box("plaster", 0, (PY + TOP + 0.1) / 2, 0, 2 * WX, TOP + 0.1 - PY, 2 * WZ);
  // plinth joints: vertical lines on the four faces, staggered
  for (const [f, L] of [[face("+z", WZ + 0.08), WX], [face("-z", WZ + 0.08), WX], [face("+x", WX + 0.08), WZ], [face("-x", WX + 0.08), WZ]])
    for (let u = -L + 0.45, i = 0; u < L - 0.2; u += 0.62 + 0.12 * jit(i), i++) wquad("line", f, u, PY / 2, 0.004, 0.03, PY);
  // timber frame on every wall: sill, posts every bay, tie beam (on solid walls), head beam
  const walls = [
    { f: face("+z", WZ), L: WX }, { f: face("-z", WZ), L: WX },
    { f: face("+x", WX), L: WZ }, { f: face("-x", WX), L: WZ },
  ];
  for (const { f, L } of walls) {
    wbox("frame", f, 0, PY + 0.08, 0.03, 2 * L + 0.12, 0.16, 0.1); // sill (dodai)
    wbox("frame", f, 0, 2.47, 0.04, 2 * L + 0.12, 0.2, 0.12); // head beam (nageshi)
    const n = Math.round((2 * L) / 1.95);
    for (let i = 0; i <= n; i++) wbox("frame", f, -L + (i * 2 * L) / n, (PY + 2.6) / 2, 0.04, 0.18, 2.6 - PY, 0.12);
  }
  const front = face("+z", WZ), side = face("+x", WX), back = face("-z", WZ), far = face("-x", WX);
  // tie beams on the plaster-only walls
  for (const f of [side, back, far]) wbox("frame", f, 0, 1.45, 0.03, (f === side || f === far ? 2 * WZ : 2 * WX) + 0.1, 0.11, 0.08);
  wbox("frame", front, -4.9, 1.45, 0.03, 2.2, 0.11, 0.08); // front, left of the doma door

  // ---------- doma: a wide opening, one big plank door slid half open ----------
  const DX0 = -4.95, DX1 = -2.35, DY1 = 2.15; // opening
  wquad("dark", front, (DX0 + DX1) / 2, (PY + DY1) / 2, 0.012, DX1 - DX0, DY1 - PY);
  wbox("frame", front, (DX0 + DX1) / 2, DY1 + 0.06, 0.05, DX1 - DX0 + 0.3, 0.14, 0.12); // lintel / door rail
  const doorX = DX0 + 0.75; // the door leaf (1.55 wide) slid to the left over the wall
  wbox("frame", front, doorX, (PY + DY1) / 2 + 0.02, 0.11, 1.55, DY1 - PY + 0.02, 0.06);
  for (let i = 1; i < 6; i++) wquad("dark", front, doorX - 0.775 + (i * 1.55) / 6, (PY + DY1) / 2, 0.142, 0.022, DY1 - PY - 0.1);
  for (const y of [0.6, 1.3, 1.95]) wbox("frame", front, doorX, y, 0.15, 1.5, 0.09, 0.03); // battens
  box("stone", (DX0 + DX1) / 2, 0.06, WZ + 0.38, DX1 - DX0 + 0.3, 0.12, 0.62); // threshold slab
  // a barred window high on the doma wall
  win(front, -5.5, 1.4, 0.5, 0.65, { pane: "dark", bars: [3, 0], bar: 0.04 });
  for (let i = 1; i <= 3; i++) wquad("frame", front, -5.5 - 0.25 + i * 0.125, 1.725, 0.085, 0.04, 0.65);

  // ---------- engawa: deck, eight sliding doors (paper over a glass band), shoe stone ----------
  const EX0 = -1.95, EX1 = WX, EZ = WZ + 0.95, FY = 0.6;
  box("frame", (EX0 + EX1) / 2, FY - 0.05, (WZ + EZ) / 2, EX1 - EX0 + 0.12, 0.1, EZ - WZ);
  for (let x = EX0 + 0.06; x < EX1; x += (EX1 - EX0) / 4) {
    box("frame", x, (FY - 0.1) / 2, EZ - 0.12, 0.12, FY - 0.1, 0.12); // legs
  }
  box("frame", EX1 - 0.06, (FY - 0.1) / 2, EZ - 0.12, 0.12, FY - 0.1, 0.12);
  for (let i = 1; i < 4; i++) box("line", (EX0 + EX1) / 2, FY + 0.002, WZ + (i * (EZ - WZ)) / 4, EX1 - EX0, 0.004, 0.02); // boards
  box("frame", (EX0 + EX1) / 2, FY - 0.02, EZ - 0.02, EX1 - EX0 + 0.14, 0.08, 0.06); // edge board
  const nd = 8, dw = (EX1 - EX0) / nd, d0 = FY + 0.02, dh = 2.36 - d0;
  for (let i = 0; i < nd; i++) {
    const u = EX0 + dw * (i + 0.5), o = i % 2 ? 0.05 : 0.09; // alternate sliding tracks
    wbox("frame", front, u, d0 + dh / 2, o - 0.02, dw - 0.02, dh, 0.04);
    const gy = d0 + 0.12, gh = 0.55, py0 = gy + gh + 0.06, ph = d0 + dh - 0.07 - py0;
    wquad("glass", front, u, gy + gh / 2, o + 0.005, dw - 0.14, gh);
    wquad("paper", front, u, py0 + ph / 2, o + 0.005, dw - 0.14, ph);
    wquad("line", front, u, gy + gh / 2, o + 0.01, 0.025, gh);
    for (let k = 1; k <= 2; k++) wquad("line", front, u - (dw - 0.14) / 2 + (k * (dw - 0.14)) / 3, py0 + ph / 2, o + 0.01, 0.025, ph);
    for (let k = 1; k <= 4; k++) wquad("line", front, u, py0 + (k * ph) / 5, o + 0.01, dw - 0.14, 0.025);
  }
  box("stone", 2.1, 0.12, EZ + 0.42, 1.1, 0.24, 0.55); // shoe stone (kutsunugi-ishi)

  // ---------- other walls: windows ----------
  win(side, 1.6, 1.0, 1.5, 1.1, { pane: "paper", bars: [3, 2] });
  win(back, -2.9, 1.0, 1.6, 1.0, { pane: "paper", bars: [3, 2] });
  win(back, 2.9, 1.2, 0.9, 0.8, { pane: "dark", bars: [4, 0], bar: 0.04 });
  win(far, 0, 1.0, 1.6, 1.1, { pane: "paper", bars: [3, 2] });

  // ---------- thatch ----------
  const AX = WX + 1.1, AZ = WZ + 1.1, YB = 2.1, E = 2.7, P = 1.0, YG = 5.6, T = 0.75, RC = 1.6;
  const ins = (y) => 0.15 + (y - E) / P; // inset of the slope plane at height y
  const zo = (y) => AZ - ins(y);
  const YA = E + (AZ - 0.15) * P; // apex of the slope planes
  const GX = AX - ins(YG), XS = GX + 0.6; // gable plane, end of the gable shell
  function rr(i, y, r, nc = 4) { // rounded rectangle inset i, corner radius r
    const ax = AX - i, az = AZ - i, pts = [];
    r = Math.max(0, Math.min(r, ax, az));
    for (const [sx, sz, a0] of [[1, 1, 0], [-1, 1, 90], [-1, -1, 180], [1, -1, 270]])
      for (let j = 0; j <= nc; j++) {
        const a = ((a0 + (90 * j) / nc) * Math.PI) / 180;
        pts.push([sx * (ax - r) + r * Math.cos(a), y, sz * (az - r) + r * Math.sin(a)]);
      }
    return pts;
  }
  const rad = (i) => Math.max(0.2, RC - 0.45 * i);
  const lip = (i, y) => rr(i, y, RC - i); // concentric with the eave corners
  const skirt = [
    rr(1.05, TOP - 0.02, rad(1.05)),
    lip(0.32, YB), lip(0.1, YB + 0.1), lip(0, YB + 0.28), lip(0.05, YB + 0.46), lip(0.15, E),
  ];
  for (let j = 1; j <= 4; j++) { const y = E + ((YG - E) * j) / 4; skirt.push(rr(ins(y), y, rad(ins(y)))); }
  solid("thatch", skirt, [0, TOP, 0], [0, YG, 0]);
  // gable shell: pairs (outer, inner) from the -Z leg over the apex to the +Z leg, extruded from -XS to XS
  const prof = [];
  for (const y of [YG, (YG + YA) / 2]) prof.push([-zo(y), y]);
  prof.push([0, YA]);
  for (const y of [(YG + YA) / 2, YG]) prof.push([zo(y), y]);
  solid("thatch", prof.map(([z, y]) => [[-XS, y, z], [XS, y, z], [XS, y - T, z], [-XS, y - T, z]]));
  // gable triangle (dark wood) inside the shell, boards and a smoke-vent lattice on both ends
  const zi = zo(YG + T) - 0.02, yi = YA - T - 0.03;
  solid("frame", [-GX, GX].map((x) => [[x, YG, -zi], [x, YG, zi], [x, yi, 0]]));
  for (const sx of [1, -1]) {
    const g = face(sx > 0 ? "+x" : "-x", GX);
    for (let u = -zi + 0.3; u < zi - 0.2; u += 0.3) {
      const hgt = (yi - YG) * (1 - Math.abs(u) / zi) - 0.06;
      if (hgt > 0.1) wquad("dark", g, u, YG + hgt / 2 + 0.02, 0.01, 0.025, hgt);
    }
    win(g, 0, YG + 0.35, 0.9, 0.55, { pane: "dark", bars: [4, 0], bar: 0.04 });
    for (let k = 1; k <= 4; k++) wquad("frame", g, -0.45 + k * 0.18, YG + 0.625, 0.085, 0.045, 0.55);
  }
  // thatch layer lines: bands around the skirt and along the shell
  function band(y, h = 0.07) {
    const i0 = ins(y) - 0.05, i1 = ins(y + h) - 0.05;
    const r0 = rr(i0, y, rad(i0 + 0.05)), r1 = rr(i1, y + h, rad(i0 + 0.05));
    for (let k = 0; k < r0.length; k++) {
      const j = (k + 1) % r0.length;
      quad("thatchLine", r0[k], r0[j], r1[j], r1[k], [0, y - 0.5, 0]);
    }
  }
  for (const y of [E + 0.06, 3.75, 4.75]) band(y);
  for (const y of [YG + 0.25, 6.6]) for (const sz of [1, -1]) {
    const z0 = sz * (zo(y) + 0.05), z1 = sz * (zo(y + 0.07) + 0.05), ref = [0, y - 0.5, 0];
    quad("thatchLine", [-XS + 0.03, y, z0], [XS - 0.03, y, z0], [XS - 0.03, y + 0.07, z1], [-XS + 0.03, y + 0.07, z1], ref);
  }
  // eave lip line, under the round of the lip
  {
    const r0 = lip(0.012, YB + 0.2), r1 = lip(-0.012, YB + 0.28);
    for (let k = 0; k < r0.length; k++) {
      const j = (k + 1) % r0.length;
      quad("thatchLine", r0[k], r0[j], r1[j], r1[k], [0, YB, 0]);
    }
  }

  // ---------- ridge: box cap, crossed logs, long log ----------
  const RL = XS + 0.2;
  solid("ridge", [-RL, RL].map((x) => [[x, YA - 0.66, -0.62], [x, YA - 0.66, 0.62], [x, YA + 0.06, 0.32], [x, YA + 0.06, -0.32]]));
  const YX = YA + 0.08; // crossing height
  for (let i = 0; i < 6; i++) {
    const x = -RL + 0.45 + (i * (2 * RL - 0.9)) / 5;
    for (const sz of [1, -1]) cyl("ridge", [x, YX - 0.6, -sz * 0.8], [x, YX + 0.4, sz * 0.53], 0.08, 6);
  }
  cyl("ridge", [-RL - 0.15, YX + 0.19, 0], [RL + 0.15, YX + 0.19, 0], 0.11, 6);

  // ---------- yard: stepping stones ----------
  function slab(cx, cz, rx, rz, h, seed) {
    const ring = (y, k) => Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2 + 0.2 * seed, f = 1 + 0.12 * jit(seed * 9 + i);
      return [cx + Math.cos(a) * rx * f * k, y, cz + Math.sin(a) * rz * f * k];
    });
    solid("stone", [ring(0, 1), ring(h, 0.9)]);
  }
  [[-3.5, 5.35], [-3.85, 6.05], [-3.4, 6.75], [-3.75, 7.45]].forEach(([x, z], i) => slab(x, z, 0.36, 0.3, 0.08, i + 1));
  [[-0.2, 5.4], [1.05, 5.55]].forEach(([x, z], i) => slab(x, z, 0.32, 0.27, 0.07, i + 7));

  // ---------- firewood stack against the +X wall ----------
  const FX0 = WX + 0.1, FX1 = WX + 0.6;
  for (let row = 0; row < 9; row++)
    for (let k = 0; k < 18; k++) {
      const z = -3.45 + k * 0.155 + (row % 2) * 0.077, y = 0.075 + row * 0.132, id = row * 31 + k;
      if (row % 2 && k === 17) continue;
      const r = 0.07 + 0.008 * jit(id), x1 = FX1 + 0.04 * jit(id + 7);
      cyl("frame", [FX0, y, z], [x1, y, z], r, 6);
      const cap = Array.from({ length: 6 }, (_, i) => [x1 + 0.006, y + 0.8 * r * Math.cos((i / 6) * Math.PI * 2), z + 0.8 * r * Math.sin((i / 6) * Math.PI * 2)]);
      for (let i = 1; i < 5; i++) tri("cut", cap[0], cap[i], cap[i + 1], [x1 - 1, y, z]);
    }
  box("frame", (FX0 + FX1) / 2, 0.03, -2.05, 0.6, 0.06, 2.9); // skids under it

  // ---------- well: stone ring, lid frame, bucket frame ----------
  if (well) {
    const WCX = -7.6, WCZ = 5.7, n = 12;
    [[-5.4, 5.2], [-6.2, 5.55]].forEach(([x, z], i) => slab(x, z, 0.3, 0.26, 0.07, i + 11)); // path to it
    const circ = (r, y) => Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return [WCX + r * Math.cos(a), y, WCZ + r * Math.sin(a)];
    });
    solid("stone", [circ(0.62, 0), circ(0.6, 0.72), circ(0.44, 0.72), circ(0.44, 0.4)], [WCX, 0, WCZ], [WCX, 0.4, WCZ]);
    for (let i = 0; i < n; i++) { // water
      const a = circ(0.43, 0.42);
      tri("dark", [WCX, 0.42, WCZ], a[i], a[(i + 1) % n], [WCX, 0, WCZ]);
    }
    for (const y of [0.24, 0.48]) { // stone courses
      const r0 = circ(0.622 - 0.02 * (y / 0.72) + 0.006, y), r1 = circ(0.622 - 0.02 * ((y + 0.04) / 0.72) + 0.006, y + 0.04);
      for (let i = 0; i < n; i++) quad("line", r0[i], r0[(i + 1) % n], r1[(i + 1) % n], r1[i], [WCX, y, WCZ]);
    }
    // square wooden lid frame on the rim
    for (const s of [1, -1]) {
      box("frame", WCX + s * 0.58, 0.79, WCZ, 0.1, 0.14, 1.3);
      box("frame", WCX, 0.79, WCZ + s * 0.58, 1.06, 0.14, 0.1);
    }
    // bucket frame: two posts (along z), beam, plank roof, pulley, rope, bucket
    for (const s of [1, -1]) box("frame", WCX, 1.1, WCZ + s * 0.78, 0.12, 2.2, 0.12);
    box("frame", WCX, 2.12, WCZ, 0.14, 0.14, 1.85);
    for (const s of [1, -1]) beam("ridge", [WCX, 2.42, WCZ], [WCX + s * 0.55, 2.16, WCZ], 2.1, 0.05);
    box("ridge", WCX, 2.45, WCZ, 0.1, 0.08, 2.15);
    cyl("frame", [WCX - 0.03, 1.9, WCZ], [WCX + 0.03, 1.9, WCZ], 0.12, 8); // pulley
    box("frame", WCX, 2.0, WCZ, 0.04, 0.12, 0.04);
    box("line", WCX + 0.04, 1.42, WCZ + 0.1, 0.02, 0.96, 0.02); // rope
    box("line", WCX + 0.04, 1.62, WCZ - 0.1, 0.02, 0.56, 0.02);
    cyl("frame", [WCX + 0.04, 0.88, WCZ + 0.1], [WCX + 0.04, 1.14, WCZ + 0.1], 0.12, 8, 0.145); // bucket
    beam("line", [WCX + 0.04, 1.14, WCZ - 0.04], [WCX + 0.04, 1.14, WCZ + 0.24], 0.02, 0.02, [1, 0, 0]);
  }

  // ---------- meshes ----------
  const MAT = {
    thatch: [c.thatch, c.thatchShade, 0.35, true],
    thatchLine: [c.thatchLine, c.thatchLine, 0.1, false],
    ridge: [c.wood, c.woodShade, 0.25, true],
    frame: [c.wood, c.woodShade, 0.1, true],
    plaster: [c.plaster, c.plasterShade, 0.1, true],
    paper: [c.paper, c.paperShade, 0.1, false],
    glass: [c.glass, c.glassShade, 0.1, false],
    stone: [c.stone, c.stoneShade, 0.1, true],
    line: [c.line, c.line, 0.1, false],
    dark: [c.dark, c.dark, 0.1, false],
    cut: [c.cut, c.cutShade, 0.1, false],
  };
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, { threshold, outline });
    mesh.name = key;
    house.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
