// suisha.js - a countryside water wheel (suisha) beside a small mill hut, real size, the wheel turning.
// Contract: harness/lab/README.md. Meters, +Y up, the hut's door faces +Z, its left is +X (the wheel side), stands
// on y = 0, centred on x = 0, z = 0 (the bbox).
//
// Construction (triangle soups merged per material, two groups: the static set and the wheel joint; flat-shaded):
//   WHEEL    a joint at the axle centre turning about X. Two rims, each a ring of 48 box segments in a YZ plane;
//            12 radial spokes per rim from a round hub; 24 paddle boards spanning the rims, radial, reaching just
//            past the rims; the wheel's +X face is the lit one, so its spokes and paddles read light on dark water.
//   AXLE     a round shaft from inside the hut wall to a bearing block on a post standing on a stone pier on the far
//            bank; it belongs to the static set (round, so its turn does not show).
//   HUT      stone footings, a sill, corner posts and plank walls (vertical board lines), a dark door opening with a
//            plank door slid half open on the +Z face, a barred window, a gable roof of thick thatch (ridge along Z,
//            so a slope faces the wheel), thatch layer bands, a dark ridge cap.
//   STREAM   a channel along Z under the wheel between stone bank walls (staggered block joints); the water is a flat
//            slab just below the bank tops with pale ripple marks (arcs round the wheel foot, dashes downstream)
//            and four low faceted foam crests where the paddles meet it.
//   FLUME    a plank trough (bottom, two sides) from the back (-Z) to just past the wheel's crown, rising gently
//            backwards, on two A-frame trestles (cap beams, mid ties, a brace) on stone footings; water in it, and a
//            pale falling sheet from its lip onto the descending (+Z) paddles, so the wheel turns top-forward (+rx).
//   Boxes are wound away from their centre; logs and lofts by their signed volume; never by hand.
// Proportions (base unit the wheel radius R = 2.0 m): wheel D 4.0, width 0.6 between rims, axle at 2.3 (0.3 m above
//   the water), rims 0.14 deep, paddles 0.34 radial. Hut 3.0 x 3.0 walls, sill 0.4, wall top 2.55, eave 2.45 with
//   0.45 overhang, ridge 3.75. Channel 1.8 wide, 7.6 long; flume 0.55 wide, its floor 4.45 at the
//   wheel, top 4.89 at the back. Banks 0.32 high, water top 0.27.
// Options: build(THREE, kit, colors, { height, hut, water }): height scales everything uniformly (default meta.height);
//   hut: false drops the hut (the axle then ends at a second pier post); water: false drops the water slab, ripples,
//   the flume water and the falling sheet (an empty channel and a dry flume).
// Clip: turn (8 s, loops): the wheel joint turns one full turn. pose("turn@2") is a quarter turn.
// Colours (noon, same script as the kominka farmhouse so they compose): wheel and flume wood sky #f2d7ae / iris (fresh
//   timber, light on the dark hut and dark water); hut planks and frame iris #5c3d32 / hair; thatch sky / iris with
//   iris bands (as the kominka); stone sclera / skin; water iris flat with moon ripples; foam and the falling sheet moon / sclera;
//   lines and openings hair. 12 meshes (10 static, 2 on the wheel joint).

export const meta = {
  name: "suisha",
  height: 4.894,
  script: "noon",
  colors: {
    wood: "#f2d7ae", woodShade: "#5c3d32",
    plank: "#5c3d32", plankShade: "#241c16",
    thatch: "#f2d7ae", thatchShade: "#5c3d32",
    thatchLine: "#5c3d32",
    stone: "#f6f3ee", stoneShade: "#f0c2ae",
    water: "#5c3d32",
    ripple: "#fff6e4",
    line: "#241c16",
    dark: "#241c16",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, hut = true, water = true } = opts;
  const root = new THREE.Group();
  root.name = "suisha";
  const body = new THREE.Group(); // uniform size scale and the centring shift live here
  body.name = "body";
  body.scale.setScalar(height / meta.height);
  root.add(body);
  const set = new THREE.Group();
  set.name = "set";
  body.add(set);
  const joints = {};

  // ---------- triangle soups, keyed "group:material" ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  const soups = {};
  let G = "set";
  const S = (key) => (soups[`${G}:${key}`] ??= []);
  function tri(key, a, b, e, ref) {
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-9) return;
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
  function beam(key, a, b, w, h, up = [0, 1, 0]) {
    const d = sub(b, a);
    const s = nrm(cross(d, up)), u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  function solid(key, rings, c0, c1) {
    const t = [];
    const add = (a, b, e) => { if (Math.hypot(...cross(sub(b, a), sub(e, a))) > 1e-9) t.push([a, b, e]); };
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
  function cyl(key, a, b, r, n = 8, r1 = r) {
    const d = nrm(sub(b, a));
    const s = nrm(cross(d, Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), u = cross(s, d);
    const ring = (o, rr) => Array.from({ length: n }, (_, i) => {
      const t = (i / n) * Math.PI * 2;
      return [0, 1, 2].map((q) => o[q] + rr * (Math.cos(t) * s[q] + Math.sin(t) * u[q]));
    });
    solid(key, [ring(a, r), ring(b, r1)]);
  }
  const jit = (i) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return 2 * (v - Math.floor(v)) - 1; };
  // a flat strip on a horizontal plane at y, from (x0,z0) to (x1,z1), w wide, facing up
  function strip(key, y, x0, z0, x1, z1, w) {
    const d = nrm([x1 - x0, 0, z1 - z0]), s = [-d[2] * w / 2, 0, d[0] * w / 2];
    quad(key, [x0 + s[0], y, z0 + s[2]], [x1 + s[0], y, z1 + s[2]], [x1 - s[0], y, z1 - s[2]], [x0 - s[0], y, z0 - s[2]], [x0, y - 1, z0]);
  }

  // ---------- layout ----------
  const WX = 1.2, AY = 2.3, R = 2.0, HW = 0.3; // wheel plane x, axle height, rim radius, half width between rims
  const CX0 = 0.3, CX1 = 2.1, BY = 0.32, WY = 0.2; // channel inner walls, bank top, water top
  const CZ = 3.8; // channel half length
  const HX0 = -3.2, HX1 = -0.2, HZ = 1.5; // hut walls

  // ---------- stream: banks, bed, water, ripples ----------
  for (const [x0, x1, k] of [[CX0 - 0.42, CX0, 0], [CX1, CX1 + 0.42, 1]]) {
    const xc = (x0 + x1) / 2;
    box("stone", xc, BY / 2, 0, x1 - x0, BY, 2 * CZ);
    const xf = k ? x0 - 0.004 : x1 + 0.004; // the face toward the water
    // block joints: one course line and staggered verticals on the water face, verticals on the top
    quad("line", [xf, BY * 0.5 - 0.012, -CZ], [xf, BY * 0.5 - 0.012, CZ], [xf, BY * 0.5 + 0.012, CZ], [xf, BY * 0.5 + 0.012, -CZ], [xc, BY / 2, 0]);
    for (let z = -CZ + 0.3, i = 0; z < CZ - 0.2; z += 0.55 + 0.1 * jit(i + 20 * k), i++) {
      const y0 = i % 2 ? BY * 0.5 : 0, y1 = i % 2 ? BY : BY * 0.5;
      quad("line", [xf, y0, z - 0.012], [xf, y0, z + 0.012], [xf, y1, z + 0.012], [xf, y1, z - 0.012], [xc, BY / 2, z]);
      strip("line", BY + 0.003, x0, z + 0.2, x1, z + 0.2, 0.024);
    }
  }
  box("stone", (CX0 + CX1) / 2, 0.04, 0, CX1 - CX0, 0.08, 2 * CZ); // bed
  if (water) {
    box("water", (CX0 + CX1) / 2, (0.08 + WY) / 2, 0, CX1 - CX0, WY - 0.08, 2 * CZ - 0.02);
    const RY = WY + 0.004;
    // arcs round the wheel foot (the paddles stir it), and downstream dashes
    for (const [rr, z0, a0, a1] of [[0.35, 0.15, -0.9, 0.9], [0.6, 0.25, -0.75, 0.75], [0.85, 0.35, -0.6, 0.6]]) {
      const n = 6;
      for (let i = 0; i < n; i++) {
        const t0 = a0 + ((a1 - a0) * i) / n, t1 = a0 + ((a1 - a0) * (i + 1)) / n;
        strip("ripple", RY, WX + rr * Math.sin(t0), z0 + rr * Math.cos(t0), WX + rr * Math.sin(t1), z0 + rr * Math.cos(t1), 0.05);
      }
    }
    // foam: low faceted crests round the wheel foot, tall enough to clear the banks from a low camera
    [[WX - 0.12, 0.2, 0.42, 0.34], [WX + 0.22, 0.5, 0.3, 0.3], [WX - 0.05, 0.85, 0.2, 0.26], [WX + 0.12, -0.35, 0.22, 0.24]].forEach(([x, z, h, r], k) => {
      const n = 8, ring = (rr, y, jj) => Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2, q = rr * (1 + jj * 0.25 * jit(k * 10 + i));
        return [x + q * Math.cos(a), y, z + q * 0.7 * Math.sin(a)];
      });
      solid("foam", [ring(r, WY - 0.02, 0), ring(r * 0.55, WY + h * 0.55, 1)], undefined, [x + 0.03, WY + h, z]);
    });
    for (const [x, z, L] of [[0.55, 1.6, 0.7], [1.75, 1.4, 0.8], [1.1, 2.1, 0.9], [0.7, 2.8, 0.6], [1.6, 2.6, 0.7], [1.2, 3.35, 0.5],
      [0.6, -1.2, 0.6], [1.7, -1.6, 0.7], [1.15, -2.4, 0.8], [0.75, -3.1, 0.5], [1.6, -3.2, 0.6]])
      strip("ripple", RY, x, z - L / 2, x, z + L / 2, 0.045);
  }

  // ---------- axle, bearing post on a pier ----------
  cyl("plank", [hut ? HX1 - 0.1 : 0.0, AY, 0], [CX1 + 0.32, AY, 0], 0.08, 8);
  const pier = (x) => {
    box("stone", x, BY + 0.12, 0, 0.5, 0.24, 0.5);
    box("plank", x, (BY + 0.24 + AY - 0.1) / 2, 0, 0.2, AY - 0.1 - BY - 0.24, 0.2);
    box("plank", x, AY, 0, 0.26, 0.24, 0.34); // bearing block
  };
  pier(CX1 + 0.21);
  if (!hut) pier(CX0 - 0.21);

  // ---------- hut ----------
  if (hut) {
    const cx = (HX0 + HX1) / 2, SY = 0.4, TOP = 2.55;
    // footing stones under the sill
    for (const x of [HX0 + 0.1, cx, HX1 - 0.1]) for (const z of [-HZ + 0.1, 0, HZ - 0.1])
      if (x === cx && z === 0) continue; else box("stone", x, 0.14, z, 0.38 + 0.04 * jit(x * 7 + z), 0.28, 0.38);
    box("plank", cx, 0.34, 0, HX1 - HX0 + 0.08, 0.14, 2 * HZ + 0.08); // sill
    box("plank", cx, (SY + TOP) / 2, 0, HX1 - HX0, TOP - SY, 2 * HZ); // plank walls
    for (const x of [HX0, HX1]) for (const z of [-HZ, HZ]) box("plank", x, (SY + TOP) / 2, z, 0.16, TOP - SY, 0.16); // corner posts
    box("plank", cx, TOP - 0.06, 0, HX1 - HX0 + 0.14, 0.14, 2 * HZ + 0.14); // wall plate
    // vertical board lines on the four walls
    const lineV = (p0, p1, o) => quad("line", p0, p1, [p1[0] + o[0], p1[1], p1[2] + o[2]], [p0[0] + o[0], p0[1], p0[2] + o[2]], [cx, 1.4, 0]);
    for (let u = -HZ + 0.25; u < HZ - 0.1; u += 0.25) {
      lineV([HX1 + 0.004, SY + 0.08, u], [HX1 + 0.004, TOP - 0.13, u], [0, 0, 0.022]);
      lineV([HX0 - 0.004, SY + 0.08, u], [HX0 - 0.004, TOP - 0.13, u], [0, 0, 0.022]);
    }
    for (let u = HX0 + 0.25; u < HX1 - 0.1; u += 0.25) {
      lineV([u, SY + 0.08, HZ + 0.004], [u, TOP - 0.13, HZ + 0.004], [0.022, 0, 0]);
      lineV([u, SY + 0.08, -HZ - 0.004], [u, TOP - 0.13, -HZ - 0.004], [0.022, 0, 0]);
    }
    // door on +Z: a dark opening, a plank door slid half over it, a lintel; a barred window
    const DX = -2.15, DW = 0.85, DT = 2.15;
    box("dark", DX, (SY + DT) / 2, HZ + 0.006, DW, DT - SY, 0.01);
    box("plank", DX, DT + 0.05, HZ + 0.03, DW + 0.3, 0.1, 0.06);
    box("plank", DX - 0.4, (SY + DT) / 2 + 0.02, HZ + 0.06, DW, DT - SY - 0.02, 0.04);
    for (let i = 1; i < 4; i++) box("line", DX - 0.4 - DW / 2 + (i * DW) / 4, (SY + DT) / 2, HZ + 0.082, 0.02, DT - SY - 0.1, 0.004);
    box("plank", DX - 0.4, 0.9, HZ + 0.09, DW - 0.08, 0.08, 0.025); // batten
    box("plank", DX - 0.4, 1.75, HZ + 0.09, DW - 0.08, 0.08, 0.025);
    box("dark", -0.95, 1.75, HZ + 0.006, 0.55, 0.4, 0.01);
    for (const [ox, oy, sx, sy] of [[0, 0.23, 0.67, 0.06], [0, -0.23, 0.67, 0.06], [0.3, 0, 0.06, 0.52], [-0.3, 0, 0.06, 0.52]])
      box("plank", -0.95 + ox, 1.75 + oy, HZ + 0.03, sx, sy, 0.05);
    for (let i = 1; i <= 3; i++) box("plank", -0.95 - 0.275 + i * 0.1375, 1.75, HZ + 0.03, 0.035, 0.4, 0.04);
    // roof: thick thatch, ridge along Z
    const EY = 2.45, RY = 3.75, OV = 0.45, T = 0.32, RZ = HZ + 0.5;
    const xl = HX0 - OV, xr = HX1 + OV;
    const sec = (z) => [[xl, EY, z], [xl, EY + T * 0.8, z], [cx, RY + T * 0.6, z], [xr, EY + T * 0.8, z], [xr, EY, z], [cx, RY - 0.25, z]];
    solid("thatch", [sec(-RZ), sec(RZ)]);
    // thatch layer bands on both slopes, and the gable ends' cut showing as bands
    const E = (sg) => [sg < 0 ? xl : xr, EY + T * 0.8], A = [cx, RY + T * 0.6];
    for (const f of [0.22, 0.48, 0.74]) for (const sg of [-1, 1]) {
      const e = E(sg), P = (g) => [e[0] + g * (A[0] - e[0]), e[1] + g * (A[1] - e[1]) + 0.025];
      const [p0, p1] = [P(f), P(f + 0.05)];
      quad("thatchLine", [p0[0], p0[1], -RZ - 0.01], [p0[0], p0[1], RZ + 0.01], [p1[0], p1[1], RZ + 0.01], [p1[0], p1[1], -RZ - 0.01], [cx, EY, 0]);
    }
    box("plank", cx, RY + T * 0.6 + 0.02, 0, 0.36, 0.16, 2 * RZ + 0.1); // ridge cap
    for (const z of [-RZ + 0.25, -RZ + 1.0, 0, RZ - 1.0, RZ - 0.25]) box("plank", cx, RY + T * 0.6 + 0.08, z, 0.7, 0.08, 0.1);
  }

  // ---------- flume on trestles ----------
  const FZ0 = 0.35, FZ1 = -CZ, FY0 = 4.45, RISE = 0.025, FW = 0.55, FH = 0.34, FT = 0.05;
  const fy = (z) => FY0 + RISE * (FZ0 - z);
  const run = (key, x0, x1, y0, y1) => { // a board along the flume between heights y0..y1 above its floor line
    hex(key, [[x0, fy(FZ0) + y0, FZ0], [x1, fy(FZ0) + y0, FZ0], [x1, fy(FZ0) + y1, FZ0], [x0, fy(FZ0) + y1, FZ0],
      [x0, fy(FZ1) + y0, FZ1], [x1, fy(FZ1) + y0, FZ1], [x1, fy(FZ1) + y1, FZ1], [x0, fy(FZ1) + y1, FZ1]]);
  };
  run("wood", WX - FW / 2, WX + FW / 2, 0, FT); // floor
  run("wood", WX - FW / 2, WX - FW / 2 + FT, FT, FH); // sides
  run("wood", WX + FW / 2 - FT, WX + FW / 2, FT, FH);
  for (let z = FZ0 - 0.4; z > FZ1 + 0.2; z -= 0.8) beam("wood", [WX - FW / 2 - 0.04, fy(z) + FH - 0.03, z], [WX + FW / 2 + 0.04, fy(z) + FH - 0.03, z], 0.06, 0.06, [0, 1, 0]); // ribs
  if (water) {
    run("water", WX - FW / 2 + FT, WX + FW / 2 - FT, FT, FT + 0.14);
    // the falling sheet: from the lip, curving down onto the descending paddles
    const pts = [[FZ0 + 0.02, fy(FZ0) + FT + 0.1], [FZ0 + 0.16, fy(FZ0) - 0.05], [FZ0 + 0.3, fy(FZ0) - 0.3], [FZ0 + 0.42, fy(FZ0) - 0.6]];
    for (let i = 0; i + 1 < pts.length; i++) {
      const [z0, y0] = pts[i], [z1, y1] = pts[i + 1];
      beam("foam", [WX, y0, z0], [WX, y1, z1], 0.07, 0.4 - i * 0.04, [1, 0, 0]);
    }
  }
  for (const z of [-1.55, -3.1]) {
    const top = fy(z) - 0.02;
    for (const s of [-1, 1]) {
      const xb = s < 0 ? CX0 - 0.21 : CX1 + 0.21, xt = WX + s * (FW / 2 - 0.05);
      box("stone", xb, BY + 0.08, z, 0.34, 0.16, 0.34);
      beam("wood", [xb, BY + 0.16, z], [xt, top - 0.12, z], 0.13, 0.13, [0, 0, 1]);
    }
    box("wood", WX, top - 0.08, z, FW + 0.7, 0.14, 0.16); // cap beam
    box("wood", WX, 2.6, z, 2.0, 0.1, 0.12); // mid tie
    beam("wood", [CX0 - 0.15, BY + 0.5, z + 0.03], [CX1 + 0.05, 2.55, z + 0.03], 0.08, 0.08, [0, 0, 1]); // brace
  }
  beam("wood", [WX, fy(-1.55) - 0.6, -1.55], [WX, fy(-3.1) - 0.6, -3.1], 0.1, 0.1, [1, 0, 0]); // longitudinal tie

  // ---------- wheel (joint) ----------
  G = "wheel";
  const NR = 48, RI = R - 0.16, NP = 24, NS = 12;
  const yz = (r, a) => [r * Math.cos(a), r * Math.sin(a)]; // local (y, z) for angle a
  for (const xs of [-HW, HW]) {
    const x0 = xs - 0.045, x1 = xs + 0.045;
    for (let i = 0; i < NR; i++) {
      const a0 = (i / NR) * Math.PI * 2, a1 = ((i + 1) / NR) * Math.PI * 2;
      const [p, q, r_, s] = [yz(RI, a0), yz(R, a0), yz(R, a1), yz(RI, a1)];
      hex("wood", [[x0, ...p], [x0, ...q], [x0, ...r_], [x0, ...s], [x1, ...p], [x1, ...q], [x1, ...r_], [x1, ...s]]);
    }
    for (let i = 0; i < NS; i++) {
      const a = ((i + 0.5) / NS) * Math.PI * 2, [y1, z1] = yz(RI + 0.04, a), [y0, z0] = yz(0.2, a);
      beam("wood", [xs, y0, z0], [xs, y1, z1], 0.07, 0.08, [1, 0, 0]);
    }
  }
  cyl("wood", [-HW - 0.12, 0, 0], [HW + 0.12, 0, 0], 0.26, 12); // hub
  cyl("dark", [-HW - 0.125, 0, 0], [HW + 0.125, 0, 0], 0.1, 8); // axle hole ends (dark discs)
  for (let i = 0; i < NP; i++) {
    const a = (i / NP) * Math.PI * 2, [ya, za] = yz(R - 0.3, a), [yb, zb] = yz(R + 0.06, a);
    // a radial board: length along x, thickness tangential
    const t = [-Math.sin(a) * 0.025, Math.cos(a) * 0.025]; // tangent in (y,z) * half thickness
    const L = HW + 0.06;
    hex("wood", [[-L, ya - t[0], za - t[1]], [-L, yb - t[0], zb - t[1]], [-L, yb + t[0], zb + t[1]], [-L, ya + t[0], za + t[1]],
      [L, ya - t[0], za - t[1]], [L, yb - t[0], zb - t[1]], [L, yb + t[0], zb + t[1]], [L, ya + t[0], za + t[1]]]);
  }
  G = "set";

  // ---------- meshes ----------
  const MAT = {
    wood: [c.wood, c.woodShade, 0.1, true],
    plank: [c.plank, c.plankShade, 0.1, true],
    thatch: [c.thatch, c.thatchShade, 0.35, true],
    thatchLine: [c.thatchLine, c.thatchLine, 0.1, false],
    stone: [c.stone, c.stoneShade, 0.1, true],
    water: [c.water, c.water, 0.1, false],
    ripple: [c.ripple, c.ripple, 0.1, false],
    foam: [c.ripple, c.stone, 0.1, true],
    line: [c.line, c.line, 0.1, false],
    dark: [c.dark, c.dark, 0.1, false],
  };
  const wheel = new THREE.Group();
  wheel.name = "wheel";
  wheel.position.set(WX, AY, 0);
  set.add(wheel);
  joints.wheel = wheel;
  for (const [gk, arr] of Object.entries(soups)) {
    const [grp, key] = gk.split(":");
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, { threshold, outline });
    mesh.name = grp === "wheel" ? `wheel-${key}` : key;
    (grp === "wheel" ? wheel : set).add(mesh);
  }
  // centre the bbox on x = 0, z = 0
  const bb = new THREE.Box3().setFromObject(set);
  set.position.set(-(bb.min.x + bb.max.x) / 2, 0, -(bb.min.z + bb.max.z) / 2);

  const CLIPS = { turn: 8 };
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    let a = 0;
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`suisha: no clip "${m[1]}" (clips: turn)`);
      const t = ((+m[2] % CLIPS.turn) + CLIPS.turn) % CLIPS.turn;
      a = (t / CLIPS.turn) * Math.PI * 2;
    } else if (name !== "rest") throw new Error(`suisha: unknown pose "${name}" (rest, or turn@<seconds>)`);
    wheel.rotation.set(a, 0, 0);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
