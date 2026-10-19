// sento.js - a traditional Japanese public bathhouse (sento) front, the temple-style Tokyo kind, static.
// Contract: harness/lab/README.md. Meters, +Y up, the street / entrance side faces +Z, its left is +X, stands on y = 0,
// centred on x = 0, z = 0.
//
// Construction (triangle soups merged per material, flat-shaded so planes read crisp):
//   BODY      a tall single-storey plaster box on a stone foundation, a dark wood wainscot band (koshiita) and corner and
//             bay posts. The attic is one solid under the main roof profile, so the front gable is a plaster triangle.
//   MAIN ROOF a gable roof with its gable to the street (tsumairi): a profile y(x), concave toward the eaves (temple
//             sori, exponent 1.3), extruded along Z as a closed slab (profile(): top, soffit, both caps, both edges, each
//             face wound away from its own inside hint). Tile rows are dark strips laid down each slope, eave tile ends
//             dark squares on the fascia; a ridge cap with raised onigawara; inked bargeboards on the rake with a gegyo.
//   KARAHAFU  the porch roof over the entrance: its front profile is a bell (a Gaussian bump normalised to 0 at the
//             ends, plus a flick at the tips), extruded back to the wall. A thick dark bargeboard follows the curve, a
//             pale plaster tympanum fills it down to the tie beam, with a kaerumata strut and a gegyo at the crown.
//             Two posts, tie beams, a stone floor and step.
//   ENTRANCE  two lattice glass sliding doors under a lattice transom, each with a short three-panel noren (left cool,
//             right red) on a rod; a blank yu mark (a filled oval bowl and three wavy steam strokes, no letters) on each
//             centre panel. Shoe lockers (getabako: a dark case, a grid of pale doors) flank the doors. Door glass and
//             the high windows are dark by day (the interior), with pale wood bars, so night lights them up.
//   CHIMNEY   a 20-sided tapered stack rising from the back (0-15 m, radius 0.8 -> 0.48), a dark band near the top, a
//             dark lip and a dark flue disc.
// Proportions (real size, base unit the wall height W = 3.95 m): walls 8.8 x 6.0 (x +-4.4, z -3.7..2.3), foundation
//   0-0.5; eaves +-5.1 at 4.1, ridge 6.8 (1.72 W), ridge cap top 7.07, onigawara 7.3; roof z -4.2..2.9. Karahafu 6.6 wide
//   at z 2.3..4.54, ends 3.45, crown 5.15; posts at x +-2.6, z 4.05, tie beam 3.05-3.3. Doors 1.5 x 2.1 at x +-1.1;
//   noren 1.69 x 0.97 (y 1.65-2.62). Footprint 10.3 x 9.4 with the step. Chimney at x -1.6, z -2.9, 15 m (3.8 W),
//   band 13.5-14.0. ~4.4k triangles, 14 meshes (one per material).
// Options build(THREE, kit, colors, { height, chimney = true, night = false }): height scales uniformly to the top
//   (the chimney's 15 m, or the onigawara's 7.3 m without it); chimney: false drops the stack; night: true turns the
//   door glass, the transom and the high side windows into practicals (threshold -1, one flat tone), the
//   entrance glow, on the same script; the film darkens its own sky.
// Colours (noon), base / shade:
//   plaster moon #fff6e4 / sky #f2d7ae (threshold 0.1, so walls square to the camera stay lit)
//   wood (posts, beams, bargeboards, wainscot, frames, lockers) iris #5c3d32 / hair #241c16 (0.1)
//   tiles iris / hair at 0.25 (the house's kawara); tile rows, tile ends, flue: hair (lines)
//   stone, locker doors, door and window bars sky / skin #f0c2ae; street-window glass sky / skin;
//   door, transom and high-window glass iris / hair by day, practical #fffaf2 lit at night
//   noren cool: sclera #f6f3ee / sky (noon's coolest tone; the script has no blue) with an accent #c4452d yu mark
//   noren red:  accent #c4452d / iris with a moon #fff6e4 yu mark; noren at 0.1 so the street faces stay lit
//   chimney skin / sky (pale brick) at 0.1, band and lip iris / hair

export const meta = {
  name: "sento",
  height: 15.0,
  script: "noon",
  colors: {
    plaster: "#fff6e4", plasterShade: "#f2d7ae",
    wood: "#5c3d32", woodShade: "#241c16",
    tile: "#5c3d32", tileShade: "#241c16",
    tileLine: "#241c16",
    stone: "#f2d7ae", stoneShade: "#f0c2ae",
    glass: "#f2d7ae", glassShade: "#f0c2ae",
    glow: "#fffaf2",
    norenCool: "#f6f3ee", norenCoolShade: "#f2d7ae",
    norenRed: "#c4452d", norenRedShade: "#5c3d32",
    markRed: "#c4452d", markWhite: "#fff6e4",
    chimney: "#f0c2ae", chimneyShade: "#f2d7ae",
    doorGlass: "#5c3d32", doorGlassShade: "#241c16",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { chimney = true, night = false } = opts;
  const TOP = chimney ? 15.0 : 7.3;
  const { height = TOP } = opts;
  const root = new THREE.Group();
  root.name = "sento";
  const body = new THREE.Group(); // uniform size scale lives here, so root stays the plain contract node
  body.name = "body";
  body.scale.setScalar(height / TOP);
  root.add(body);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  // one triangle wound away from `ref` (a point on its inner side); slivers dropped
  function tri(key, a, b, e, ref) {
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-8) return;
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
  // a closed slab between top(x) and bot(x) over xs, extruded z0..z1; each face wound away from its own inside
  function profile(key, xs, top, bot, z0, z1) {
    const n = xs.length - 1;
    for (let i = 0; i < n; i++) {
      const [a, b] = [xs[i], xs[i + 1]];
      const [ta, tb, ba, bb] = [top(a), top(b), bot(a), bot(b)];
      const mid = (ta + tb + ba + bb) / 4, mx = (a + b) / 2;
      quad(key, [a, ta, z0], [b, tb, z0], [b, tb, z1], [a, ta, z1], [mx, mid, (z0 + z1) / 2]); // top
      quad(key, [a, ba, z0], [b, bb, z0], [b, bb, z1], [a, ba, z1], [mx, mid + 9, (z0 + z1) / 2]); // underside
      quad(key, [a, ba, z1], [b, bb, z1], [b, tb, z1], [a, ta, z1], [mx, mid, z1 - 1]); // front cap
      quad(key, [a, ba, z0], [b, bb, z0], [b, tb, z0], [a, ta, z0], [mx, mid, z0 + 1]); // back cap
    }
    for (const [x, s] of [[xs[0], 1], [xs[n], -1]]) {
      const [t, b] = [top(x), bot(x)];
      quad(key, [x, b, z0], [x, b, z1], [x, t, z1], [x, t, z0], [x + s, (t + b) / 2, (z0 + z1) / 2]);
    }
  }
  const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
  // a closed tapered prism (lathe soup) around (cx, cz): radius r0 at y0 to r1 at y1
  function stack(key, cx, cz, y0, y1, r0, r1, n = 20) {
    const ref = [cx, (y0 + y1) / 2, cz];
    for (let i = 0; i < n; i++) {
      const [a0, a1] = [(i / n) * 2 * Math.PI, ((i + 1) / n) * 2 * Math.PI];
      const P = (a, y, r) => [cx + Math.sin(a) * r, y, cz + Math.cos(a) * r];
      quad(key, P(a0, y0, r0), P(a1, y0, r0), P(a1, y1, r1), P(a0, y1, r1), ref);
      tri(key, P(a0, y1, r1), P(a1, y1, r1), [cx, y1, cz], [cx, y1 - 1, cz]);
      tri(key, P(a0, y0, r0), P(a1, y0, r0), [cx, y0, cz], [cx, y0 + 1, cz]);
    }
  }

  // ---------- wall faces: local (u along the wall, y, o out of the wall) -> world ----------
  const face = (side, at) => ({
    side, at,
    p: (u, y, o) => side === "+z" ? [u, y, at + o] : side === "-z" ? [-u, y, at - o] : side === "+x" ? [at + o, y, -u] : [at - o, y, u],
    s: (w, h, d) => (side[1] === "z" ? [w, h, d] : [d, h, w]),
  });
  const wbox = (key, f, u, y, o, w, h, d) => box(key, ...f.p(u, y, o), ...f.s(w, h, d));
  const wquad = (key, f, u, y, o, w, h) =>
    quad(key, f.p(u - w / 2, y - h / 2, o), f.p(u + w / 2, y - h / 2, o), f.p(u + w / 2, y + h / 2, o), f.p(u - w / 2, y + h / 2, o), f.p(u, y, o - 1));
  function win(f, u, y0, w, h, { pane = "glass", bars = [0, 1], bar = 0.04, sill = true, sash = false, barKey = "lattice" } = {}) {
    const yc = y0 + h / 2;
    wbox("frame", f, u, yc, 0.03, w + 0.14, h + 0.14, 0.06);
    if (sill) wbox("frame", f, u, y0 - 0.08, 0.06, w + 0.24, 0.05, 0.12);
    wquad(pane, f, u, yc, 0.07, w, h);
    const [nv, nh] = bars;
    for (let i = 1; i <= nv; i++) wquad(barKey, f, u - w / 2 + (i * w) / (nv + 1), yc, 0.078, bar, h);
    for (let j = 1; j <= nh; j++) wquad(barKey, f, u, y0 + (j * h) / (nh + 1), 0.078, w, bar);
    if (sash) wquad(barKey, f, u, yc, 0.084, 0.07, h);
  }

  // ---------- body ----------
  const WX = 4.4, Z0 = -3.7, Z1 = 2.3, FY = 0.5, WY = 3.95;
  box("stone", 0, FY / 2, (Z0 + Z1) / 2, 2 * WX + 0.12, FY, Z1 - Z0 + 0.12);
  box("plaster", 0, (FY + WY) / 2, (Z0 + Z1) / 2, 2 * WX, WY - FY, Z1 - Z0);
  box("frame", 0, 0.82, (Z0 + Z1) / 2, 2 * WX + 0.05, 0.64, Z1 - Z0 + 0.05); // koshiita wainscot
  for (const [x, z] of [[-WX, Z1], [WX, Z1], [-WX, Z0], [WX, Z0], [-2.75, Z1], [2.75, Z1]]) box("frame", x, (FY + WY) / 2 + 0.05, z, 0.2, WY - FY + 0.1, 0.2);
  for (const z of [-1.95, 0.3]) for (const x of [-WX, WX]) box("frame", x, (FY + WY) / 2, z, 0.18, WY - FY, 0.18);
  for (const x of [-WX, WX]) box("frame", x, WY - 0.1, (Z0 + Z1) / 2, 0.1, 0.18, Z1 - Z0 + 0.1); // head beams
  box("frame", 0, WY - 0.1, Z1, 2 * WX + 0.1, 0.18, 0.1);

  // ---------- main roof: gable to the street ----------
  const RX = 5.1, EY = 4.1, RY = 6.8, RT = 0.28, RZ0 = -4.2, RZ1 = 2.9;
  const yr = (x) => EY + (RY - EY) * Math.pow(Math.max(0, 1 - Math.abs(x) / RX), 1.3);
  const xsR = range(-RX, RX, 34);
  profile("tile", xsR, yr, (x) => yr(x) - RT, RZ0, RZ1);
  // attic: the gable triangle and its back twin, plaster under the soffit
  profile("plaster", range(-WX, WX, 30), (x) => yr(x) - RT + 0.02, () => WY - 0.2, Z0, Z1);
  // tile rows down both slopes, and dark eave tile ends on both fascias
  for (let z = RZ0 + 0.3; z < RZ1 - 0.15; z += 0.4) {
    for (const s of [-1, 1]) {
      const xs = range(0.25, RX - 0.02, 8);
      for (let i = 0; i < 8; i++) {
        const [a, b] = [s * xs[i], s * xs[i + 1]];
        quad("tileLine", [a, yr(a) + 0.03, z - 0.035], [b, yr(b) + 0.03, z - 0.035], [b, yr(b) + 0.03, z + 0.035], [a, yr(a) + 0.03, z + 0.035], [a, yr(a) - 1, z]);
      }
      const y = EY - 0.04;
      quad("tileLine", [s * (RX + 0.012), y, z - 0.07], [s * (RX + 0.012), y, z + 0.07], [s * (RX + 0.012), y - 0.16, z + 0.07], [s * (RX + 0.012), y - 0.16, z - 0.07], [0, y, z]);
    }
  }
  // ridge cap and onigawara
  beam("tile", [0, RY + 0.1, RZ0 - 0.05], [0, RY + 0.1, RZ1 + 0.05], 0.4, 0.34);
  for (const z of [RZ0 - 0.05, RZ1 + 0.05]) box("tile", 0, RY + 0.25, z, 0.55, 0.5, 0.3);
  // bargeboards (hafu) on both rakes and the gegyo pendant at the front apex
  const xsH = range(-RX - 0.05, RX + 0.05, 34);
  for (const [za, zb] of [[RZ1, RZ1 + 0.12], [RZ0 - 0.12, RZ0]]) profile("frame", xsH, (x) => yr(x) + 0.06, (x) => yr(x) - 0.42, za, zb);
  hex("frame", [[-0.32, RY - 0.25, RZ1 + 0.02], [0.32, RY - 0.25, RZ1 + 0.02], [0.32, RY - 0.25, RZ1 + 0.16], [-0.32, RY - 0.25, RZ1 + 0.16],
    [-0.12, RY - 0.95, RZ1 + 0.02], [0.12, RY - 0.95, RZ1 + 0.02], [0.12, RY - 0.95, RZ1 + 0.16], [-0.12, RY - 0.95, RZ1 + 0.16]]);
  // gable lattice (kitsuregoshi) in the front triangle
  const front = face("+z", Z1);
  for (let x = -3.6; x <= 3.61; x += 0.6) {
    const top = yr(x) - RT - 0.05, bot = WY + 0.05;
    if (top - bot > 0.2) wquad("lattice", front, x, (top + bot) / 2, 0.02, 0.07, top - bot);
  }
  wquad("lattice", front, 0, WY + 0.55, 0.025, 2 * WX - 0.4, 0.07);

  // ---------- karahafu porch ----------
  const KX = 3.3, KE = 3.45, KC = 5.15, KZ0 = Z1, KZ1 = 4.4;
  const e4 = Math.exp(-4);
  const yk = (x) => {
    const u = Math.min(1, Math.abs(x) / KX);
    const bell = (Math.exp(-((u / 0.5) ** 2)) - e4) / (1 - e4);
    const flick = u > 0.82 ? 0.14 * ((u - 0.82) / 0.18) ** 2 : 0;
    return KE + (KC - KE) * bell + flick;
  };
  const xsK = range(-KX, KX, 40);
  profile("tile", xsK, (x) => yk(x) + 0.12, (x) => yk(x) - 0.14, KZ0, KZ1);
  for (let x = -KX + 0.12; x < KX - 0.05; x += 0.28) {
    const y = yk(x) + 0.13;
    quad("tileLine", [x - 0.035, y, KZ0 + 0.1], [x + 0.035, y, KZ0 + 0.1], [x + 0.035, y, KZ1 - 0.02], [x - 0.035, y, KZ1 - 0.02], [x, y - 1, 3]);
  }
  // the curved bargeboard and its pale under-edge, the tympanum, the kaerumata and gegyo
  profile("frame", range(-KX - 0.05, KX + 0.05, 40), (x) => yk(x) + 0.02, (x) => yk(x) - 0.5, KZ1, KZ1 + 0.14);
  profile("trim", range(-KX + 0.12, KX - 0.12, 40), (x) => yk(x) - 0.5, (x) => yk(x) - 0.58, KZ1 + 0.02, KZ1 + 0.12);
  const TY = 3.3, PZ = 4.05;
  profile("plaster", range(-2.6, 2.6, 30), (x) => yk(x) - 0.48, () => TY, KZ1 - 0.12, KZ1 - 0.02);
  hex("frame", [[-0.5, TY, KZ1 - 0.02], [0.5, TY, KZ1 - 0.02], [0.5, TY, KZ1 + 0.05], [-0.5, TY, KZ1 + 0.05],
    [-0.12, TY + 0.55, KZ1 - 0.02], [0.12, TY + 0.55, KZ1 - 0.02], [0.12, TY + 0.55, KZ1 + 0.05], [-0.12, TY + 0.55, KZ1 + 0.05]]);
  hex("frame", [[-0.26, KC - 0.4, KZ1 + 0.1], [0.26, KC - 0.4, KZ1 + 0.1], [0.26, KC - 0.4, KZ1 + 0.2], [-0.26, KC - 0.4, KZ1 + 0.2],
    [-0.08, KC - 0.85, KZ1 + 0.1], [0.08, KC - 0.85, KZ1 + 0.1], [0.08, KC - 0.85, KZ1 + 0.2], [-0.08, KC - 0.85, KZ1 + 0.2]]);
  // posts, tie beams, floor and step
  for (const s of [-1, 1]) {
    box("frame", s * 2.6, (FY + TY) / 2, PZ, 0.24, TY - FY, 0.24);
    box("frame", s * 2.6, TY - 0.12, (Z1 + PZ) / 2, 0.16, 0.24, PZ - Z1);
    box("stone", s * 2.6, FY + 0.06, PZ, 0.34, 0.12, 0.34);
  }
  box("frame", 0, TY - 0.12, PZ, 2 * 2.6 + 0.5, 0.26, 0.2);
  box("frame", 0, TY + 0.12, KZ1 - 0.1, 2 * 2.6 + 0.3, 0.22, 0.14);
  box("stone", 0, FY / 2, (Z1 + KZ1) / 2 + 0.05, 2 * KX - 0.2, FY, KZ1 - Z1 + 0.1);
  box("stone", 0, 0.12, KZ1 + 0.35, 2.6, 0.24, 0.5);

  // ---------- entrance: doors, transom, noren, lockers ----------
  const lit = night ? "glow" : "doorGlass";
  for (const s of [-1, 1]) win(front, s * 1.1, FY, 1.5, 2.1, { pane: lit, bars: [2, 3], sill: false, sash: true, barKey: "trim" });
  win(front, 0, 2.85, 3.8, 0.42, { pane: lit, bars: [11, 0], sill: false, barKey: "trim" });
  const NY0 = 1.65, NY1 = 2.62, NZ = Z1 + 0.24;
  for (const s of [-1, 1]) {
    const key = s < 0 ? "norenCool" : "norenRed", mark = s < 0 ? "markRed" : "markWhite";
    const cx = s * 1.1;
    beam("frame", [cx - 0.92, NY1 + 0.05, NZ], [cx + 0.92, NY1 + 0.05, NZ], 0.05, 0.05); // rod
    for (const s2 of [-1, 1]) box("frame", cx + s2 * 0.86, NY1 + 0.15, (Z1 + NZ) / 2, 0.04, 0.04, NZ - Z1); // rod brackets
    const pw = 0.55;
    for (let i = -1; i <= 1; i++) box(key, cx + i * (pw + 0.02), (NY0 + NY1) / 2, NZ, pw, NY1 - NY0, 0.025);
    // yu mark: an oval bowl and three wavy steam strokes, 1.5 cm proud of the centre panel
    const mz = NZ + 0.0135, bx = 0.2, by = 0.12, byc = NY0 + 0.26;
    for (let k = 0; k < 16; k++) {
      const [a0, a1] = [(k / 16) * 2 * Math.PI, ((k + 1) / 16) * 2 * Math.PI];
      tri(mark, [cx, byc, mz], [cx + Math.cos(a0) * bx, byc + Math.sin(a0) * by, mz], [cx + Math.cos(a1) * bx, byc + Math.sin(a1) * by, mz], [cx, byc, mz - 1]);
    }
    for (const dx of [-0.1, 0, 0.1]) {
      const ys = range(byc + by + 0.04, NY1 - 0.07, 6);
      const wx = (y) => cx + dx + 0.03 * Math.sin(((y - ys[0]) / (ys[6] - ys[0])) * 2 * Math.PI);
      for (let k = 0; k < 6; k++) {
        const [ya, yb] = [ys[k], ys[k + 1]];
        quad(mark, [wx(ya) - 0.025, ya, mz], [wx(ya) + 0.025, ya, mz], [wx(yb) + 0.025, yb, mz], [wx(yb) - 0.025, yb, mz], [cx, ya, mz - 1]);
      }
    }
    // getabako: dark case, a 2 x 5 grid of pale locker doors
    const lx = s * 2.22;
    box("frame", lx, FY + 0.8, Z1 + 0.18, 0.48, 1.6, 0.36);
    for (let col = 0; col < 2; col++) for (let row = 0; row < 5; row++)
      quad("trim", [lx - 0.21 + col * 0.215, FY + 0.12 + row * 0.29, Z1 + 0.365], [lx - 0.21 + col * 0.215 + 0.2, FY + 0.12 + row * 0.29, Z1 + 0.365],
        [lx - 0.21 + col * 0.215 + 0.2, FY + 0.12 + row * 0.29 + 0.25, Z1 + 0.365], [lx - 0.21 + col * 0.215, FY + 0.12 + row * 0.29 + 0.25, Z1 + 0.365], [lx, FY + 1, Z1]);
  }
  // ---------- sides and back ----------
  const left = face("+x", WX), right = face("-x", -WX), back = face("-z", Z0);
  for (const u of [-1.5, 0.8, 3.0]) win(left, u, 2.55, 1.6, 0.95, { pane: lit, bars: [5, 0], barKey: "trim" });
  for (const u of [-3.0, -0.8, 1.5]) win(right, u, 2.55, 1.6, 0.95, { pane: lit, bars: [5, 0], barKey: "trim" });
  for (const u of [-2.4, 2.4]) win(back, u, 2.55, 1.6, 0.95, { bars: [5, 0] });
  for (const s of [-1, 1]) win(front, s * 3.5, 1.4, 1.2, 1.1, { bars: [7, 0], bar: 0.05 });

  // ---------- chimney ----------
  if (chimney) {
    const CX = -1.6, CZ = -2.9, CH = 15.0, r = (y) => 0.8 + (0.48 - 0.8) * (y / CH);
    stack("chimney", CX, CZ, 0, CH - 0.15, r(0), r(CH - 0.15));
    stack("frame", CX, CZ, 13.5, 14.0, r(13.5) + 0.06, r(14.0) + 0.06);
    stack("frame", CX, CZ, CH - 0.2, CH, r(CH) + 0.07, r(CH) + 0.07);
    for (let k = 0; k < 20; k++) {
      const [a0, a1] = [(k / 20) * 2 * Math.PI, ((k + 1) / 20) * 2 * Math.PI], rr = r(CH) - 0.04;
      tri("tileLine", [CX, CH + 0.003, CZ], [CX + Math.sin(a0) * rr, CH + 0.003, CZ + Math.cos(a0) * rr], [CX + Math.sin(a1) * rr, CH + 0.003, CZ + Math.cos(a1) * rr], [CX, CH - 1, CZ]);
    }
  }

  // ---------- meshes ----------
  const MAT = {
    plaster: [c.plaster, c.plasterShade, 0.1, true],
    stone: [c.stone, c.stoneShade, 0.1, true],
    frame: [c.wood, c.woodShade, 0.1, true],
    lattice: [c.wood, c.woodShade, 0.1, false],
    trim: [c.stone, c.stoneShade, 0.1, false],
    tile: [c.tile, c.tileShade, 0.25, true],
    tileLine: [c.tileLine, c.tileLine, 0.1, false],
    glass: [c.glass, c.glassShade, 0.1, false],
    glow: [c.glow, c.glow, -1, false],
    norenCool: [c.norenCool, c.norenCoolShade, 0.1, true],
    norenRed: [c.norenRed, c.norenRedShade, 0.1, true],
    markRed: [c.markRed, c.markRed, 0.1, false],
    markWhite: [c.markWhite, c.markWhite, 0.1, false],
    chimney: [c.chimney, c.chimneyShade, 0.1, true],
    doorGlass: [c.doorGlass, c.doorGlassShade, 0.1, false],
  };
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, { threshold, outline });
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
