// juyosho.js - a shrine amulet office (juyosho, the omamori counter), static. One set with models/shrine.js,
// models/torii.js and models/ema-rack.js.
// Contract: harness/lab/README.md. Meters, +Y up, the counter faces +Z, its left is +X, stands on y = 0, centred on
// x = 0, z = 0.
//
// Construction (boxes, prisms and curved sheets, all triangle soups merged per material; flat-shaded so slabs read
// crisp). Every solid is wound from an interior reference point, never by hand.
//   ROOF     the shrine's gable: ridge along x, both slopes sag below their chord (y = ridge - drop (t + 0.35 t (1 - t)))
//            and the whole roof sweeps up toward both gables (y += 0.06 (|x| / 2.2)^3), as the shrine's does. Each
//            slope is a dark bark sheet over a vermilion rafter sheet inset 2-3 cm, so every eave shows a dark band over
//            a red band. A dark ridge cap rides the same sweep; pale wood gable boards close both ends.
//   FRAME    four square vermilion posts on a low wood deck, head beams front and back, side beams.
//   WALLS    wood board back and side walls; the front is open between the posts. Set back behind the counter at
//            z = 0.3, the sliding glass window: wood frame rails and stiles, four dark panes in two tracks (the dark
//            interior seen through the glass, so the charms pop in front of it), the middle pair slid apart to leave
//            the selling gap, two pale glint stripes on each pane, and white plaster above to the roof.
//   COUNTER  the identity stage: a long wood counter between the front posts, under a white cloth that drapes over its
//            front and ends. On it, a three-tier dark display stand carries `count` omamori per tier.
//   OMAMORI  the identity cue. Small upright pouches with clipped shoulders, leaning back a little, each with a pale
//            brocade patch on its face and a knot (a bead and two loops) on top, in a deterministic colour pattern
//            ((k + 3 r) mod 4 over red, white, pink, gold). A large count shrinks the charms so they never overlap.
//   EMA      at the +X end, on the side wall: two rails of pentagonal wooden plaques on red strings, facing +X.
//   OMIKUJI  at the -X end of the counter: a stack of three white hexagonal fortune boxes with a red band and a dark
//            hole on top. Beside it a small wooden offering tray (sanbo) with a folded white paper.
// Proportions (real size, base unit the bay B = 3.7 m between post centres): posts at x +-1.85, z +-1.1, 0.14 square,
//   2.28 tall; roof 4.4 x 3.2 (eaves at 2.25, z +-1.6), ridge 2.86, cap 2.94 at the centre, 3.0 at the gables. Counter
//   top 0.92, z 0.3 .. 1.18; window 0.93 .. 2.1 at z 0.3. Omamori 9 x 13 cm (a large kind, for the thumbnail), tiers 15 cm apart. Ema 15 x 10 cm.
//   Omikuji boxes 0.15 across, 0.2 tall.
// Options: build(THREE, kit, colors, { height = 3.0, count = 18 }). height scales uniformly (as the torii), count is
//   omamori per tier.
// Colours (noon), base / shade:
//   vermilion (posts, beams, rafter sheets)                     accent #c4452d / iris #5c3d32, threshold 0.1 (as the torii)
//   roof (bark, ridge cap, glass panes, stand, ema rails)        iris #5c3d32 / hair #241c16, threshold 0.1 (as the shrine)
//   wood (deck, walls, counter, window frame, gable boards, tray) skin #f0c2ae / iris #5c3d32 (as the shrine's wood)
//   cloth (counter cloth, plaster, white omamori, omikuji boxes, paper)  sclera #f6f3ee / sky #f2d7ae
//   omamori red / pink                                           accent / iris, skin / iris (noon has no blue, green or
//            purple; the gold charms share the ema material)
//   glint (brocade patches, glass glints), no ink                practical #fffaf2
//   ema (plaques, gold omamori)                                  sky #f2d7ae / iris #5c3d32, threshold 0.02 (as the ema-rack)
//   red (knots, strings, ema pictures, omikuji bands), no ink    accent #c4452d
//   dark (ema writing, omikuji holes), no ink                    hair #241c16
// Small parts (omamori, ema, boxes) take a 2 px hull, not 5: at hero size a 5 px hull per charm fills the stand with ink.

export const meta = {
  name: "juyosho",
  height: 3.0,
  script: "noon",
  colors: {
    vermilion: "#c4452d", vermilionShade: "#5c3d32",
    roof: "#5c3d32", roofShade: "#241c16",
    wood: "#f0c2ae", woodShade: "#5c3d32",
    cloth: "#f6f3ee", clothShade: "#f2d7ae",
    omRed: "#c4452d", omRedShade: "#5c3d32",
    omPink: "#f0c2ae", omPinkShade: "#5c3d32",
    glint: "#fffaf2",
    ema: "#f2d7ae", emaShade: "#5c3d32",
    red: "#c4452d",
    dark: "#241c16",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, count = 18 } = opts;
  const root = new THREE.Group();
  root.name = "juyosho";
  const set = new THREE.Group(); // uniform size scale lives here, root stays the plain contract node
  set.name = "set";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const mid = (...p) => [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / p.length);
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  // one triangle wound away from `ref` (a point inside the solid)
  function tri(key, a, b, e, ref) {
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-10) return;
    S(key).push(...a, ...(dot(n, sub(mid(a, b, e), ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  // a convex prism: ring A (n points) and ring B (the same outline moved along the axis)
  function prism(key, A, B) {
    const n = A.length, ref = mid(...A, ...B);
    for (let i = 1; i < n - 1; i++) (tri(key, A[0], A[i], A[i + 1], ref), tri(key, B[0], B[i], B[i + 1], ref));
    for (let i = 0; i < n; i++) quad(key, A[i], A[(i + 1) % n], B[(i + 1) % n], B[i], ref);
  }
  function box(key, cx, cy, cz, sx, sy, sz) {
    const [x0, x1, y0, y1, z0, z1] = [cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2];
    prism(key, [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]);
  }
  // box from corner ranges
  const bx = (key, x0, x1, y0, y1, z0, z1) => box(key, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0);
  // a strand from a to b, w square (strings, loops)
  function strand(key, a, b, w) {
    const d = sub(b, a);
    const nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
    let s = cross(d, [0, 0, 1]);
    if (Math.hypot(...s) < 1e-6) s = cross(d, [1, 0, 0]);
    s = nrm(s);
    const u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + (s[k] * i + u[k] * j) * w / 2);
    prism(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1)], [P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // a curved sheet: top surface T(i, j) on an (nu + 1) x (nv + 1) grid, thickness th straight down; closed
  function sheet(key, T, nu, nv, th) {
    const top = [], bot = [];
    for (let i = 0; i <= nu; i++) {
      top.push([]), bot.push([]);
      for (let j = 0; j <= nv; j++) { const p = T(i / nu, j / nv); top[i].push(p); bot[i].push([p[0], p[1] - th, p[2]]); }
    }
    const down = (p) => [p[0], p[1] - th / 2, p[2]];
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const ref = down(mid(top[i][j], top[i + 1][j + 1]));
      quad(key, top[i][j], top[i + 1][j], top[i + 1][j + 1], top[i][j + 1], ref);
      quad(key, bot[i][j], bot[i + 1][j], bot[i + 1][j + 1], bot[i][j + 1], ref);
    }
    for (let i = 0; i < nu; i++) for (const j of [0, nv]) {
      const jj = j === 0 ? 1 : nv - 1, ref = down(mid(top[i][jj], top[i + 1][jj], top[i][j], top[i + 1][j]));
      quad(key, top[i][j], top[i + 1][j], bot[i + 1][j], bot[i][j], ref);
    }
    for (let j = 0; j < nv; j++) for (const i of [0, nu]) {
      const ii = i === 0 ? 1 : nu - 1, ref = down(mid(top[ii][j], top[ii][j + 1], top[i][j], top[i][j + 1]));
      quad(key, top[i][j], top[i][j + 1], bot[i][j + 1], bot[i][j], ref);
    }
  }
  // a local frame: rotation (yaw about y, then pitch about x, then roll about z) and a translation
  const V = new THREE.Vector3(), E = new THREE.Euler();
  const frame = (x, y, z, yaw, pitch, roll) => {
    E.set(pitch, yaw, roll, "YXZ");
    const m = new THREE.Matrix4().makeRotationFromEuler(E);
    m.setPosition(x, y, z);
    return (p) => V.set(p[0], p[1], p[2]).applyMatrix4(m).toArray();
  };
  // a flat outline (u, v) extruded along local z from z0 to z1 in frame f
  const slab = (key, f, outline, z0, z1) => prism(key, outline.map(([u, v]) => f([u, v, z1])), outline.map(([u, v]) => f([u, v, z0])));
  // deterministic hash in [0, 1)
  const hash = (i, k) => { const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };
  const jit = (i, k, a) => (hash(i, k) * 2 - 1) * a;
  const ring = (n, r, cx, cy, a0 = 0) => Array.from({ length: n }, (_, k) => { const a = a0 + (k / n) * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });

  // ---------- deck, posts, beams ----------
  const XP = 1.85, ZP = 1.1, PW = 0.14, YT = 2.28; // post centres, size, top
  bx("wood", -2.0, 2.0, 0, 0.08, -1.25, 1.28); // deck
  for (const x of [-XP, XP]) for (const z of [-ZP, ZP]) box("vermilion", x, (0.08 + YT) / 2, z, PW, YT - 0.08, PW);
  for (const z of [-ZP, ZP]) bx("vermilion", -XP - 0.16, XP + 0.16, 2.12, YT, z - 0.075, z + 0.075); // head beams
  for (const x of [-XP, XP]) bx("vermilion", x - 0.065, x + 0.065, 2.12, 2.26, -ZP, ZP); // side beams

  // ---------- roof ----------
  const RX = 2.2, EZ = 1.6, RY = 2.86, EY = 2.25, T1 = 0.06, T2 = 0.05;
  const lift = (x) => 0.06 * Math.pow(Math.abs(x) / RX, 3);
  const roofY = (x, z) => { const t = Math.min(1, Math.abs(z) / EZ); return RY - (RY - EY) * (t + 0.35 * t * (1 - t)) + lift(x); };
  for (const s of [1, -1]) {
    sheet("roof", (u, v) => { const x = -RX + 2 * RX * u, z = s * EZ * v; return [x, roofY(x, z), z]; }, 16, 8, T1);
    const rx = RX - 0.02, ez = EZ - 0.03;
    sheet("vermilion", (u, v) => { const x = -rx + 2 * rx * u, z = s * ez * v; return [x, roofY(x, z) - T1 - 0.002, z]; }, 16, 8, T2);
  }
  sheet("roof", (u, v) => { const x = -RX - 0.03 + 2 * (RX + 0.03) * u, z = -0.1 + 0.2 * v; return [x, RY + 0.08 + lift(x), z]; }, 16, 1, 0.13);
  // gable boards: under the roof at the end posts, from the head beams up to the rafter sheet
  for (const x of [-XP, XP]) {
    const pts = [];
    const n = 8;
    for (let k = 0; k <= n; k++) { const z = -ZP + (2 * ZP * k) / n; pts.push([z, Math.max(YT, roofY(x, z) - T1 - T2 - 0.004)]); }
    const outline = [[ZP, YT - 0.02], [-ZP, YT - 0.02], ...pts];
    // convex outline (the sag keeps it convex enough to fan from its centre); a prism along x
    const A = outline.map(([z, y]) => [x - 0.02, y, z]), B = outline.map(([z, y]) => [x + 0.02, y, z]);
    prism("wood", A, B);
  }

  // ---------- walls ----------
  const ZW = 0.3; // window plane
  bx("wood", -XP + 0.07, XP - 0.07, 0.08, 2.12, -ZP - 0.02, -ZP + 0.03); // back wall
  for (const s of [1, -1]) {
    bx("wood", s * XP - 0.025, s * XP + 0.025, 0.08, 2.12, -ZP + 0.07, ZW + 0.075); // side walls behind the window
  }
  // plaster transom over the window, up into the roof
  const yTr = roofY(0, ZW) - T1 - T2 + 0.01;
  bx("cloth", -XP + 0.025, XP - 0.025, 2.1, yTr, ZW - 0.03, ZW + 0.01);
  // window: frame rails and stiles (roof), four panes in two tracks, glints
  const YW0 = 0.935, YW1 = 2.1, WX = XP - 0.025;
  bx("wood", -WX, WX, YW0, YW0 + 0.05, ZW - 0.02, ZW + 0.07); // sill rail
  bx("wood", -WX, WX, YW1 - 0.06, YW1, ZW - 0.02, ZW + 0.07); // head rail
  const PWD = (2 * WX) / 4 + 0.04; // pane width (overlapping)
  // pane left edges (x0): outer two fixed in the back track, middle two slid outward in the front track to open a gap
  const panes = [[-WX, 0], [WX - PWD, 0], [-WX + PWD - 0.12, 1], [WX - 2 * PWD + 0.12, 1]];
  for (const [x0, track] of panes) {
    const z0 = ZW + 0.005 + track * 0.03, z1 = z0 + 0.02, y0 = YW0 + 0.05, y1 = YW1 - 0.06, f = 0.035;
    bx("wood", x0, x0 + f, y0, y1, z0 - 0.004, z1 + 0.004); // stiles
    bx("wood", x0 + PWD - f, x0 + PWD, y0, y1, z0 - 0.004, z1 + 0.004);
    bx("wood", x0, x0 + PWD, y0, y0 + f, z0 - 0.004, z1 + 0.004); // rails
    bx("wood", x0, x0 + PWD, y1 - f, y1, z0 - 0.004, z1 + 0.004);
    bx("roof", x0 + f, x0 + PWD - f, y0 + f, y1 - f, z0 + 0.008, z0 + 0.012);
    // glint: a slanted stripe on the pane's front face
    const gx = x0 + PWD * 0.55, gz = z0 + 0.0125;
    for (const [o, w] of [[0, 0.11], [0.15, 0.04]]) {
      const g = [[gx + o - w, y1 - f], [gx + o, y1 - f], [gx + o - 0.2, y0 + f + 0.3], [gx + o - 0.2 - w, y0 + f + 0.3]];
      prism("glint", g.map(([x, y]) => [x, y, gz + 0.002]), g.map(([x, y]) => [x, y, gz]));
    }
  }

  // ---------- counter and cloth ----------
  const CX = XP - PW / 2, YC = 0.9, ZF = 1.12; // counter half length, top, front face
  bx("wood", -CX, CX, 0.08, YC, ZW, ZF); // counter body
  bx("wood", -CX - 0.0, CX, YC - 0.02, YC + 0.02, ZW - 0.02, ZF + 0.04); // counter top board (lip)
  const YCl = YC + 0.02; // cloth lies on the board
  bx("cloth", -CX + 0.01, CX - 0.01, YCl, YCl + 0.012, ZW + 0.06, ZF + 0.06); // cloth top
  bx("cloth", -CX + 0.01, CX - 0.01, YCl - 0.42, YCl + 0.012, ZF + 0.05, ZF + 0.065); // front drape
  for (const s of [1, -1]) bx("cloth", s * (CX - 0.01) - 0.008, s * (CX - 0.01) + 0.008, YCl - 0.42, YCl + 0.012, ZW + 0.06, ZF + 0.065); // ends
  const YT0 = YCl + 0.012; // top of the cloth

  // ---------- display stand and omamori ----------
  const SX0 = -0.72, SX1 = 1.66, TD = 0.15, TH = 0.15, ZS = 1.02; // stand x range, tier depth and rise, front edge
  for (let r = 0; r < 3; r++) bx("roof", SX0, SX1, YT0, YT0 + 0.05 + r * TH, ZS - (r + 1) * TD, ZS - r * TD);
  const OW = 0.09, OH = 0.13, OT = 0.018, CUT = 0.016;
  const POUCH = [[-OW / 2, 0], [OW / 2, 0], [OW / 2, OH - CUT], [OW / 2 - CUT, OH], [-OW / 2 + CUT, OH], [-OW / 2, OH - CUT]];
  const KINDS = ["omRed", "cloth", "omPink", "ema"];
  const n = Math.max(1, Math.round(count));
  const pitch = (SX1 - SX0 - 0.04) / n;
  const sc = Math.min(1, (pitch * 0.85) / OW); // a crowded stand (large count) gets smaller charms, never overlapping
  let id = 0;
  for (let r = 0; r < 3; r++) {
    const y = YT0 + 0.05 + r * TH, z = ZS - r * TD - 0.06;
    for (let k = 0; k < n; k++) {
      const i = id++;
      const kind = KINDS[(k + 3 * r) % 4];
      const x = SX0 + 0.02 + pitch * (k + 0.5) + jit(i, 1, 0.004);
      const f0 = frame(x, y, z, jit(i, 2, 0.08), -0.16 + jit(i, 3, 0.03), jit(i, 4, 0.03));
      const f = (p) => f0([p[0] * sc, p[1] * sc, p[2] * sc]);
      slab(kind, f, POUCH, -OT / 2, OT / 2);
      // brocade patch on the face (red on white pouches)
      const pk = kind === "cloth" ? "red" : "glint";
      const pw = OW * 0.32, p0 = OH * 0.22, p1 = OH * 0.78;
      slab(pk, f, [[-pw, p0], [pw, p0], [pw, p1], [-pw, p1]], OT / 2 + 0.0005, OT / 2 + 0.002);
      // knot: a bead and two loops on top
      const kk = kind === "omRed" ? "glint" : "red";
      slab(kk, f, ring(6, 0.009, 0, OH + 0.006), -0.007, 0.007);
      for (const s of [1, -1]) {
        strand(kk, f([s * 0.004, OH + 0.008, 0]), f([s * 0.016, OH + 0.026, 0]), 0.0045);
        strand(kk, f([s * 0.016, OH + 0.026, 0]), f([s * 0.006, OH + 0.032, 0]), 0.0045);
      }
    }
  }

  // ---------- omikuji boxes and offering tray (-X end) ----------
  const HR = 0.075, HH = 0.2; // hexagon radius, box height
  const hexBox = (x, y, z) => {
    const h = ring(6, HR, 0, 0, Math.PI / 6);
    prism("cloth", h.map(([u, v]) => [x + u, y, z + v]), h.map(([u, v]) => [x + u, y + HH, z + v]));
    const hb = ring(6, HR + 0.004, 0, 0, Math.PI / 6);
    prism("red", hb.map(([u, v]) => [x + u, y + HH - 0.06, z + v]), hb.map(([u, v]) => [x + u, y + HH - 0.035, z + v]));
    const hole = ring(8, 0.016, 0, 0);
    prism("dark", hole.map(([u, v]) => [x + u, y + HH + 0.001, z + v]), hole.map(([u, v]) => [x + u, y + HH + 0.003, z + v]));
  };
  hexBox(-1.62, YT0, 0.78);
  hexBox(-1.46, YT0, 0.78);
  hexBox(-1.54, YT0 + HH + 0.003, 0.78);
  // sanbo: a cut-corner tray on an open box stand
  const TX = -1.08, TZ = 0.82;
  bx("wood", TX - 0.1, TX + 0.1, YT0, YT0 + 0.1, TZ - 0.08, TZ + 0.08);
  const oct = [[-0.15, -0.14], [0.15, -0.14], [0.17, -0.12], [0.17, 0.12], [0.15, 0.14], [-0.15, 0.14], [-0.17, 0.12], [-0.17, -0.12]];
  prism("wood", oct.map(([u, v]) => [TX + u, YT0 + 0.1, TZ + v]), oct.map(([u, v]) => [TX + u, YT0 + 0.12, TZ + v]));
  for (const [u0, u1, v0, v1] of [[-0.17, 0.17, 0.12, 0.14], [-0.17, 0.17, -0.14, -0.12], [-0.17, -0.15, -0.12, 0.12], [0.15, 0.17, -0.12, 0.12]])
    bx("wood", TX + u0, TX + u1, YT0 + 0.12, YT0 + 0.16, TZ + v0, TZ + v1); // rim
  // folded paper on the tray
  const fp = frame(TX, YT0 + 0.121, TZ, 0.3, 0, 0);
  prism("cloth", [[-0.1, 0, -0.06], [0.1, 0, -0.06], [0.1, 0, 0.06], [-0.1, 0, 0.06]].map(fp), [[-0.1, 0.012, -0.06], [0.1, 0.012, -0.06], [0.1, 0.012, 0.06], [-0.1, 0.012, 0.06]].map(fp));

  // ---------- ema at the +X end, on the side wall ----------
  const EXW = XP + 0.025; // wall face
  const PL = [[0, 0], [0.075, -0.03], [0.075, -0.1], [-0.075, -0.1], [-0.075, -0.03]];
  const ER = [1.62, 1.22], EZ0 = -0.92, EZ1 = 0.18;
  for (const y of ER) {
    bx("roof", EXW, EXW + 0.06, y - 0.02, y + 0.02, EZ0 - 0.06, EZ1 + 0.06); // rail
    for (const z of [EZ0 - 0.03, EZ1 + 0.03]) bx("roof", EXW, EXW + 0.06, y - 0.06, y + 0.02, z - 0.02, z + 0.02); // brackets
    const m = 7;
    for (let k = 0; k < m; k++) {
      const i = 500 + id++;
      const z = EZ0 + 0.06 + ((EZ1 - EZ0 - 0.12) * k) / (m - 1) + jit(i, 1, 0.01);
      const layer = k % 2;
      const xf = EXW + 0.07 + layer * 0.012;
      const f = frame(xf, y - 0.05 - layer * 0.03 - jit(i, 2, 0.01), z, Math.PI / 2 + jit(i, 3, 0.15), -0.06, jit(i, 4, 0.12));
      slab("ema", f, PL, -0.005, 0.005);
      for (const u of [-0.03, 0.03]) strand("red", f([u, -0.022, 0.006]), [EXW + 0.06, y + 0.022, z + u * 0.25], 0.005);
      if (hash(i, 6) < 0.45) slab("red", f, ring(8, 0.022, 0, -0.055), 0.0052, 0.0064);
      else for (const [v, w] of [[-0.05, 0.09], [-0.072, 0.06]]) slab("dark", f, [[-w / 2, v - 0.004], [w / 2, v - 0.004], [w / 2, v + 0.004], [-w / 2, v + 0.004]], 0.0052, 0.0064);
    }
  }

  // ---------- meshes ----------
  const MAT = {
    vermilion: [c.vermilion, c.vermilionShade, 0.1, true, 5],
    roof: [c.roof, c.roofShade, 0.1, true, 5],
    wood: [c.wood, c.woodShade, 0.1, true, 5],
    cloth: [c.cloth, c.clothShade, 0.1, true, 2],
    omRed: [c.omRed, c.omRedShade, 0.1, true, 2],
    omPink: [c.omPink, c.omPinkShade, 0.1, true, 2],
    glint: [c.glint, c.glint, 0.1, false, 0],
    ema: [c.ema, c.emaShade, 0.02, true, 2],
    red: [c.red, c.red, 0.1, false, 0],
    dark: [c.dark, c.dark, 0.1, false, 0],
  };
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, outline, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, { threshold, outline, px });
    mesh.name = key;
    set.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
