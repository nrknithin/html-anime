// phone-booth.js - a Japanese street-corner public phone booth: slim glass box, green roof cap and corner posts,
// a folding glass door, and inside the green payphone on its shelf with a coiled cord and a phone-book binder.
// Contract: harness/lab/README.md. Meters, +Y up, the door faces +Z, the booth's left is +X, stands on y = 0,
// centred on x = 0, z = 0.
//
// Construction (boxes, a few hexahedra and two swept tubes, triangle soups merged per material; flat-shaded boxes):
//   SHELL   a grey plinth, four green corner posts, a green header band and a bevelled green roof cap that overhangs
//           the posts. Grey kick panels low on three sides and a grey transom rail all round.
//   GLASS   no transparency. The back (-Z) and far (-X) panes are solid pale glass: from outside they are glass, from
//           the front-left they are the lit backdrop the phone is seen against. The near panes (+X side, door leaves)
//           are open frames carrying only diagonal glint strips (double-sided), the anime shorthand for clear glass,
//           so the interior reads through them in the hero view.
//   DOOR    a two-leaf folding door on the front. Joint `door` is leaf A, hinged at the -X post; `doorB` is leaf B,
//           hinged to A's free edge. open t: A turns -78t deg about Y (its knee swings out to +Z), B turns +2x that,
//           so B's free edge slides along the front track (z = const). open(t) is a continuous control, pose("rest")
//           restores opts.open.
//   INSIDE  a grey shelf on the back wall at 0.92 m with the green payphone (sloped face, display window, 3 x 4 keys,
//           coin slot and return), its handset hung on the left side, a coiled cord (a helix swept along a spline
//           loop that droops past the shelf edge) back to the phone, and a dark binder hanging under the shelf.
//   ROOF    a small lit sign box on the cap: blank pale faces, each with a dark handset pictogram; a green lid.
//           A ceiling light panel under the cap.
//   Every closed part is wound away from a point inside it (its centre, or the tube axis), never by hand.
// Proportions (real size, base unit the footprint W = 0.9 m): plinth 0.92 x 0.06; posts 0.06 square to 1.92; header
// 1.92-2.0; cap 0.98 square, 2.0-2.1 (0.4 W of sign above at 2.12-2.3 = meta.height); door 2 x 0.39 leaves, 0.07-1.88;
// shelf top 0.93; phone 0.24 x 0.36 x 0.2 (0.27 W wide, ~1/6 of the height: survives the thumbnail); binder 0.28 x 0.3.
// Options: build(THREE, kit, colors, { height, open, night }). height scales uniformly (default 2.3 m). open 0..1 sets
//   the door (default 0). night swaps the sign faces, ceiling light and solid glass to practical colours (glow, the
//   threshold below every light dot), same script.
// Colours (meadow): green parts (posts, cap, header, lid, payphone) iris #3f8a47 / hair #2c5131; grey frame, rails,
//   kick panels, plinth, shelf sclera #f6f3ee / sky #d7ecef; glass sky #d7ecef flat (night practical #f2c94c);
//   glints moon #f7f3e1 flat; sign and ceiling light moon / sclera (night practical flat); phone details (keys,
//   display, binder label) sclera / moon; pictogram, cord, slots hair flat; binder hair / hair.

export const meta = {
  name: "phone-booth",
  height: 2.3,
  script: "meadow",
  colors: {
    green: "#3f8a47", greenShade: "#2c5131",
    frame: "#f6f3ee", frameShade: "#d7ecef",
    glass: "#d7ecef", glassShade: "#d7ecef",
    glint: "#f7f3e1",
    sign: "#f7f3e1", signShade: "#f6f3ee",
    lit: "#f2c94c",
    detail: "#f6f3ee", detailShade: "#f7f3e1",
    dark: "#2c5131",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, open: open0 = 0, night = false } = opts;
  const root = new THREE.Group();
  root.name = "phone-booth";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / meta.height);
  root.add(body);
  const joints = {};

  // ---------- triangle soups with normals ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  let soups = {}; // switched per group: static shell, door leaf A, door leaf B
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  function tri(key, a, b, e, ref, na, nb, ne) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-10) return;
    const flip = dot(n, sub(mul(add(add(a, b), e), 1 / 3), ref)) < 0;
    n = nrm(flip ? mul(n, -1) : n);
    const s = S(key);
    const [B, NB, E, NE] = flip ? [e, ne, b, nb] : [b, nb, e, ne];
    s.p.push(...a, ...B, ...E);
    s.n.push(...(na ?? n), ...(NB ?? n), ...(NE ?? n));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  const box = (key, x0, x1, y0, y1, z0, z1) =>
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  // a flat sheet facing `out` (the ref sits behind it), for decals and glints
  const sheet = (key, a, b, e, d, out) => {
    const m = mul(add(add(a, b), add(e, d)), 0.25);
    quad(key, a, b, e, d, sub(m, out));
  };
  // a diagonal glint strip on a pane: frame p(u, v) -> world, pane u in [0,1], v in [0,1]
  function glint(key, p, out, u0, v0, len, w, slope = 0.9) {
    const a = p(u0, v0), b = p(u0 + w, v0), e = p(u0 + w + len, v0 + len * slope), d = p(u0 + len, v0 + len * slope);
    sheet(key, a, b, e, d, out);
  }
  // a tube of radius r along a polyline, parallel-transported rings, capped ends
  function tube(key, path, r, sides = 5) {
    const L = path.length;
    let u = null;
    const rings = path.map((P, i) => {
      const T = nrm(sub(path[Math.min(L - 1, i + 1)], path[Math.max(0, i - 1)]));
      if (!u) u = nrm(cross(T, Math.abs(T[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
      u = nrm(sub(u, mul(T, dot(u, T))));
      const w = cross(T, u);
      const ring = [];
      for (let j = 0; j < sides; j++) {
        const a = (j / sides) * Math.PI * 2;
        const d = add(mul(u, Math.cos(a)), mul(w, Math.sin(a)));
        ring.push({ q: add(P, mul(d, r)), n: d });
      }
      return { P, T, ring };
    });
    for (let i = 0; i < L - 1; i++) {
      const R0 = rings[i], R1 = rings[i + 1], ref = mul(add(R0.P, R1.P), 0.5);
      for (let j = 0; j < sides; j++) {
        const k = (j + 1) % sides;
        const [a, b, e, d] = [R0.ring[j], R0.ring[k], R1.ring[k], R1.ring[j]];
        tri(key, a.q, b.q, e.q, ref, a.n, b.n, e.n);
        tri(key, a.q, e.q, d.q, ref, a.n, e.n, d.n);
      }
    }
    for (const [R, s] of [[rings[0], -1], [rings[L - 1], 1]]) {
      const ref = sub(R.P, mul(R.T, s * r)), cn = mul(R.T, s);
      for (let j = 1; j < sides - 1; j++) tri(key, R.ring[0].q, R.ring[j].q, R.ring[j + 1].q, ref, cn, cn, cn);
    }
  }
  // Catmull-Rom through control points, n samples per span
  function spline(P, n) {
    const out = [];
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      for (let s = 0; s < n; s++) {
        const t = s / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1, 2].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
      }
    }
    out.push(P[P.length - 1]);
    return out;
  }

  // ---------- dimensions ----------
  const H = 0.45, PO = 0.42, PW = 0.03; // half footprint, post centre, post half width
  const IN = PO - PW; // 0.39: inner face of the posts
  const KICK = 0.28, TR0 = 1.88, TR1 = 1.92, CAP0 = 2.0, CAP1 = 2.1;

  // ---------- shell ----------
  box("frame", -0.46, 0.46, 0, 0.06, -0.46, 0.46); // plinth
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    box("green", sx * PO - PW, sx * PO + PW, 0.06, CAP0, sz * PO - PW, sz * PO + PW); // corner posts
  // header band all round, between transom and cap
  box("green", -H, H, TR1, CAP0, H - 0.05, H);
  box("green", -H, H, TR1, CAP0, -H, -H + 0.05);
  box("green", -H, -H + 0.05, TR1, CAP0, -H, H);
  box("green", H - 0.05, H, TR1, CAP0, -H, H);
  // roof cap: overhanging, bevelled top
  hex("green", [[-0.49, CAP0, -0.49], [0.49, CAP0, -0.49], [0.49, CAP0, 0.49], [-0.49, CAP0, 0.49],
    [-0.44, CAP1, -0.44], [0.44, CAP1, -0.44], [0.44, CAP1, 0.44], [-0.44, CAP1, 0.44]]);
  // transom rail on four sides; kick panels on three (the door leaves carry their own)
  box("frame", -IN, IN, TR0, TR1, PO - 0.02, PO + 0.02);
  box("frame", -IN, IN, TR0, TR1, -PO - 0.02, -PO + 0.02);
  for (const sx of [-1, 1]) box("frame", sx * PO - 0.02, sx * PO + 0.02, TR0, TR1, -IN, IN);
  box("frame", -IN, IN, 0.06, KICK, -PO - 0.015, -PO + 0.015);
  for (const sx of [-1, 1]) box("frame", sx * PO - 0.015, sx * PO + 0.015, 0.06, KICK, -IN, IN);
  // floor mat and front threshold/track
  box("frame", -IN, IN, 0.06, 0.07, PO - 0.02, PO + 0.02);
  // solid panes: back (-Z) and far side (-X)
  box("glass", -IN, IN, KICK, TR0, -PO - 0.006, -PO + 0.006);
  box("glass", -PO - 0.006, -PO + 0.006, KICK, TR0, -IN, IN);
  // glints on the outside of the solid panes (seen from back and right) and on the open +X pane, both faces
  const paneZ = (z) => (u, v) => [-IN + u * 2 * IN, KICK + v * (TR0 - KICK), z];
  const paneX = (x, s) => (u, v) => [x, KICK + v * (TR0 - KICK), s * (-IN + u * 2 * IN)];
  glint("glint", paneZ(-PO - 0.008), [0, 0, -1], 0.55, 0.45, 0.22, 0.06);
  glint("glint", paneZ(-PO - 0.008), [0, 0, -1], 0.7, 0.42, 0.14, 0.025);
  glint("glint", paneX(-PO - 0.008, 1), [-1, 0, 0], 0.55, 0.45, 0.22, 0.06);
  glint("glint", paneX(-PO - 0.008, 1), [-1, 0, 0], 0.7, 0.42, 0.14, 0.025);
  // the +X pane is clear: a pair of glints, u runs from front (+Z) to back
  glint("glint", paneX(PO, -1), [1, 0, 0], 0.08, 0.52, 0.26, 0.07, 1.6);
  glint("glint", paneX(PO, -1), [1, 0, 0], 0.27, 0.56, 0.16, 0.03, 1.6);
  // ceiling light
  box("light", -0.22, 0.22, TR1 - 0.02, TR1, -0.22, 0.22);

  // ---------- sign box on the roof ----------
  const SB = 0.27, SY0 = 2.12, SY1 = 2.27;
  box("green", -0.2, 0.2, CAP1, SY0, -0.2, 0.2); // plinth under the sign
  box("light", -SB, SB, SY0, SY1, -SB, SB);
  hex("green", [[-SB - 0.015, SY1, -SB - 0.015], [SB + 0.015, SY1, -SB - 0.015], [SB + 0.015, SY1, SB + 0.015], [-SB - 0.015, SY1, SB + 0.015],
    [-SB + 0.03, 2.3, -SB + 0.03], [SB - 0.03, 2.3, -SB + 0.03], [SB - 0.03, 2.3, SB - 0.03], [-SB + 0.03, 2.3, SB - 0.03]]);
  // handset pictogram on each face: an arched grip with two pads; f(u, v) -> world on that face
  const ym = (SY0 + SY1) / 2;
  const faces = [
    [(u, v) => [u, ym + v, SB + 0.003], [0, 0, 1]],
    [(u, v) => [-u, ym + v, -SB - 0.003], [0, 0, -1]],
    [(u, v) => [SB + 0.003, ym + v, -u], [1, 0, 0]],
    [(u, v) => [-SB - 0.003, ym + v, u], [-1, 0, 0]],
  ];
  for (const [f, out] of faces) {
    const R0 = 0.05, R1 = 0.074, cy = -0.035, n = 8;
    for (let i = 0; i < n; i++) {
      const a0 = Math.PI * (0.18 + (0.64 * i) / n), a1 = Math.PI * (0.18 + (0.64 * (i + 1)) / n);
      const P = (r, a) => f(r * Math.cos(a), cy + r * Math.sin(a));
      sheet("dark", P(R0, a0), P(R1, a0), P(R1, a1), P(R0, a1), out);
    }
    for (const s of [-1, 1]) { // ear and mouth pads
      const x0 = s * 0.045, x1 = s * 0.098;
      sheet("dark", f(Math.min(x0, x1), cy - 0.012), f(Math.max(x0, x1), cy - 0.012), f(Math.max(x0, x1), cy + 0.03), f(Math.min(x0, x1), cy + 0.03), out);
    }
  }

  // ---------- shelf, payphone, cord, binder ----------
  const SH = 0.93, BZ = -PO + 0.006; // shelf top, back pane inner face
  box("frame", -IN, IN, SH - 0.03, SH, BZ, -0.15);
  for (const x of [-0.3, 0.3]) hex("frame", [[x - 0.012, SH - 0.03, BZ], [x + 0.012, SH - 0.03, BZ], [x + 0.012, SH - 0.03, -0.18], [x - 0.012, SH - 0.03, -0.18],
    [x - 0.012, SH - 0.2, BZ], [x + 0.012, SH - 0.2, BZ], [x + 0.012, SH - 0.2, BZ + 0.02], [x - 0.012, SH - 0.2, BZ + 0.02]]); // brackets
  // phone body: box with a face sloped back toward the top
  const PX0 = 0.1, PX1 = 0.34, PZ0 = BZ, PZF = -0.2, PZT = -0.25, PT = SH + 0.36;
  hex("green", [[PX0, SH, PZ0], [PX1, SH, PZ0], [PX1, SH, PZF], [PX0, SH, PZF],
    [PX0, PT, PZ0], [PX1, PT, PZ0], [PX1, PT, PZT], [PX0, PT, PZT]]);
  // face points: (u across from PX0, h up from SH) on the sloped face, o out of it
  const slope = (PZT - PZF) / (PT - SH);
  const fn = nrm([0, -slope, 1]);
  const FP = (x, h, o = 0.004) => add([x, SH + h, PZF + slope * h], mul(fn, o));
  const fq = (key, x0, x1, h0, h1, o) => sheet(key, FP(x0, h0, o), FP(x1, h0, o), FP(x1, h1, o), FP(x0, h1, o), fn);
  fq("detail", 0.0, 0.16, 0.25, 0.32); // display window
  fq("dark", 0.005, 0.155, 0.255, 0.315, 0.006); // its dark glass, inset by a light border
  fq("detail", 0.03, 0.13, 0.272, 0.298, 0.008); // the lit digits strip
  for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) { // 3 x 4 keys
    const x = 0.02 + k * 0.036, h = 0.06 + r * 0.04;
    fq("detail", x, x + 0.026, h, h + 0.028);
  }
  fq("dark", 0.135, 0.165, 0.08, 0.2); // card slot
  box("dark", PX1 - 0.07, PX1 - 0.025, PT, PT + 0.003, PZT - 0.06, PZT - 0.02); // coin slot on top
  fq("dark", 0.135, 0.17, 0.015, 0.05); // coin return
  // handset: hung on the left side, vertical, earpiece up
  const HX0 = PX0 - 0.055, HX1 = PX0 - 0.005, HZ = -0.22;
  box("green", PX0 - 0.012, PX0, SH + 0.12, SH + 0.3, -0.33, -0.25); // the hook plate
  box("green", HX0 + 0.012, HX1 - 0.012, SH + 0.06, SH + 0.3, HZ - 0.055, HZ - 0.02); // grip
  box("green", HX0, HX1, SH + 0.25, SH + 0.33, HZ - 0.07, HZ); // earpiece
  box("green", HX0, HX1, SH + 0.02, SH + 0.1, HZ - 0.07, HZ); // mouthpiece
  // coiled cord: helix along a spline that leaves the handset foot, droops past the shelf edge and climbs to the phone
  const axis = spline([[HX0 + 0.025, SH + 0.02, HZ - 0.035], [HX0 + 0.01, SH - 0.02, -0.13], [HX0 + 0.03, SH - 0.17, -0.11],
    [PX0 + 0.06, SH - 0.2, -0.11], [PX0 + 0.1, SH - 0.08, -0.12], [PX0 + 0.09, SH + 0.006, -0.16], [PX0 + 0.08, SH + 0.02, PZF + 0.002]], 10);
  const coil = [];
  let turn = 0, prevT = null, cu = null;
  for (let i = 0; i < axis.length; i++) {
    const P = axis[i], T = nrm(sub(axis[Math.min(axis.length - 1, i + 1)], axis[Math.max(0, i - 1)]));
    if (!cu) cu = nrm(cross(T, [1, 0, 0]));
    cu = nrm(sub(cu, mul(T, dot(cu, T))));
    const w = cross(T, cu);
    const seg = i ? Math.hypot(...sub(P, axis[i - 1])) : 0;
    const steps = Math.max(1, Math.ceil(seg / 0.004));
    for (let s = i ? 1 : 0; s <= steps; s++) {
      if (!i && s) break;
      const t = s / steps, Q = i ? add(axis[i - 1], mul(sub(P, axis[i - 1]), t)) : P;
      turn += i ? (seg / steps) * (2 * Math.PI / 0.012) : 0;
      coil.push(add(Q, add(mul(cu, 0.013 * Math.cos(turn)), mul(w, 0.013 * Math.sin(turn)))));
    }
    prevT = T;
  }
  tube("dark", coil, 0.0045, 4);
  // phone-book binder hanging under the shelf: cover, page block, blank label
  const BX0 = -0.06, BX1 = 0.22, BY0 = SH - 0.36, BY1 = SH - 0.06;
  hex("binder", [[BX0, BY0, BZ], [BX1, BY0, BZ], [BX1, BY0, BZ + 0.05], [BX0, BY0, BZ + 0.07],
    [BX0, BY1, BZ], [BX1, BY1, BZ], [BX1, BY1, BZ + 0.05], [BX0, BY1, BZ + 0.07]]);
  box("detail", BX1, BX1 + 0.006, BY0 + 0.012, BY1 - 0.012, BZ + 0.004, BZ + 0.044); // page edges
  const bn = nrm([-(0.02) / (BX1 - BX0), 0, 1]);
  const BP = (x, y) => add([x, y, BZ + 0.07 - (0.02 * (x - BX0)) / (BX1 - BX0)], mul(bn, 0.004));
  sheet("detail", BP(BX0 + 0.06, BY1 - 0.1), BP(BX1 - 0.06, BY1 - 0.1), BP(BX1 - 0.06, BY1 - 0.05), BP(BX0 + 0.06, BY1 - 0.05), bn);
  box("dark", BX0 - 0.012, BX0, BY0, BY1, BZ, BZ + 0.07); // spine
  box("frame", BX0 - 0.03, BX1 + 0.03, BY1, BY1 + 0.015, BZ, BZ + 0.08); // hanging rail

  // ---------- meshes ----------
  const LIT = [c.lit, c.lit, -0.25, 0];
  const MAT = {
    green: [c.green, c.greenShade, 0.1, 4],
    frame: [c.frame, c.frameShade, 0.1, 3],
    glass: night ? LIT : [c.glass, c.glassShade, 0.1, 0],
    glint: [c.glint, c.glint, -1, 0, true],
    light: night ? [c.lit, c.lit, -1, 3] : [c.sign, c.signShade, 0.1, 3],
    detail: [c.detail, c.detailShade, 0.1, 0],
    dark: [c.dark, c.dark, -1, 0],
    binder: [c.dark, c.dark, -1, 2.5],
  };
  function meshes(group) {
    for (const [key, { p, n }] of Object.entries(soups)) {
      const [base, shade, threshold, px, doubleSided = false] = MAT[key];
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
      const mesh = kit.toon(g, base, shade, px ? { threshold, px, doubleSided } : { threshold, outline: false, doubleSided });
      mesh.name = key;
      group.add(mesh);
    }
    soups = {};
  }
  meshes(body);

  // ---------- folding door: leaf A on the -X post, leaf B on A's free edge ----------
  const LW = IN; // each leaf 0.39 wide, the pair spans -IN..IN
  function leaf(withHandle) { // local: hinge edge at x = 0, leaf along +x, centred on z = 0
    const t = 0.012, st = 0.03;
    box("frame", 0, st, 0.07, TR0, -t, t);
    box("frame", LW - st, LW, 0.07, TR0, -t, t);
    box("frame", st, LW - st, TR0 - 0.04, TR0, -t, t);
    box("frame", st, LW - st, 0.07, KICK, -t, t);
    if (withHandle) box("frame", LW - st - 0.03, LW - st - 0.012, 0.85, 1.25, t, t + 0.025);
    const p = (u, v) => [st + u * (LW - 2 * st), KICK + v * (TR0 - 0.04 - KICK), 0];
    glint("glint", p, [0, 0, 1], 0.1, 0.55, 0.3, 0.12, 1.1);
    glint("glint", p, [0, 0, 1], 0.42, 0.6, 0.18, 0.05, 1.1);
  }
  const doorA = new THREE.Group();
  doorA.name = "door";
  doorA.position.set(-IN, 0, PO);
  body.add(doorA);
  leaf(true);
  meshes(doorA);
  const doorB = new THREE.Group();
  doorB.name = "doorB";
  doorB.position.set(LW, 0, 0);
  doorA.add(doorB);
  leaf(false);
  meshes(doorB);
  joints.door = doorA;
  joints.doorB = doorB;

  // open(t): A swings its knee out to +Z, B folds back so its free edge stays on the track
  function open(t) {
    const a = (Math.min(1, Math.max(0, t)) * 78 * Math.PI) / 180;
    doorA.rotation.set(0, -a, 0);
    doorB.rotation.set(0, 2 * a, 0);
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    open(open0);
  }
  pose("rest");
  return { root, joints, pose, open };
}
