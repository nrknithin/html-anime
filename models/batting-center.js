// batting-center.js - a Japanese neighbourhood batting center at night, cut away to two adjacent cages so a low camera
// in the lit front-left quadrant looks in: tall net walls on pipe frames, a batter's box mat and home plate in each
// cage, at the far end a pitching machine behind a big flat painted pitcher signboard with the ball hole at its hand
// (the iconic read), a lit speed sign over each cage ("80km", "120km"), a coin box at each cage door, and outside in
// the aisle a bench with helmets, a bat rack, a vending machine and floodlights on tall poles.
// Contract: harness/lab/README.md. Meters, +Y up, the cages run along Z with the batters near +Z (the aisle) and the
// machines at -Z, so the set faces +Z; its left is +X. Stands on y = 0 (floor top 0.04), centred on its footprint.
//
// Construction (boxes, rods, tubes, spheres and flat prisms, all triangle soups merged per material, as game-center.js
// and ufo-catcher.js, so the whole set is 14 meshes at either `lights`; every triangle is wound away from a point inside its solid,
// never by hand):
//   NETS     every net wall is a grid of thin flat strips (one double-sided flat material, no hull), so the camera sees
//            through it as through a real net: side walls, the divider, the back wall and the front wall the batter
//            stands before, all 5.4 m tall. The outer +X wall is cut away (frame only) so the hero camera sees in.
//   FRAME    pipes: posts every ~4 m, a top rail on every wall, a mid rail at 2.4 m, the door frames, the floodlight
//            poles and their cross arms, the bench and rack legs, the machine stand.
//   CAGE     a dark mat with two pale batter's box outlines and a pale home plate; at -Z the signboard: a dark board
//            in a red frame on two legs, painted (flat prisms, no hull) with a pale-uniformed pitcher in a red cap at
//            release, arm out to the side and the dark ball hole in a pale ring at the hand; behind it the machine
//            (a dark box, two pale throwing wheels, a hopper) on a stand.
//   SIGNS    a lit amber panel in a dark case over each cage door, the speed in stroke glyphs (seven-segment digits,
//            stroked k and m), dark on the panel.
//   AISLE    a red coin box on a post beside each door (dark slot, lit button); a bench with two helmets, a rack of
//            five bats (wood and metal) and a third helmet on its top; a white vending machine facing +X with a lit
//            panel, rows of drink samples, a dark pickup slot.
//   LIGHTS   four floodlight poles outside the side walls, each with a bank of six lamps tilted into the cages; with
//            `lights` the lamps glow and each throws a fan of flat rays to a pale amber pool on the floor (the glow cones).
//   BALL     one mesh holds both cages' balls and their speed streaks; pose() rewrites its vertices (each vertex stores
//            its owner: ball A, streak A, ball B, streak B), as the gachapon cranks and the ufo-catcher claw.
// Proportions (real size; base unit the cage width 3.4 m): two cages 3.4 x 20.2 m, net walls 5.4 tall; plate to the
//   signboard 15.8 m (a neighbourhood cage, shorter than the 18.44 m rubber); board 2.8 x 2.85 (figure painted at 1.2x life), hole at 2.4 m;
//   aisle 3.2 deep before the front wall; floodlights 7.2 m with heads to 7.59; speed signs 1.5 x 0.6 at 2.75-3.35;
//   coin box 0.26 x 0.36 at 1.2; bench seat 0.43; vending machine 1.0 x 0.75 x 1.83; bats 0.84, helmets r 0.125.
// Options: build(THREE, kit, colors, { height, lights }).
//   height  scales the whole set so the floodlight heads' top is `height` (default meta.height).
//   lights  true (default): lamps glow practical, rays and pools drawn. false: lamps unlit, no rays or pools.
// Clip: pitch (2 s, loops): cage A (80 km/h) throws at 0.2 s, cage B (120 km/h) at 1.1 s; each ball leaves the hole
//   with a streak, crosses the plate at the speed on its sign, hits the front net, drops and rolls, then is gone.
// Joints: anchors plateA, plateB, boardA, boardB, bench, vending, doorA, doorB (for placing characters and cameras).
// Ink: hulls 2 px (a set is seen small); nets, decals, glyphs, lamps, rays and pools have none.
// Colours (indigo, night): cage floor sky #1b2d6b flat; aisle and batter's mat hair #16141c flat; nets line #e7eefc
//   flat (double-sided); frame (pipes, poles, metal bats) moon #d5e2ff / sky; dark (board, machine, sign cases,
//   lamp banks) sky / hair; pale (plate, vending body) and ball sclera #f6f3ee / moon; red (frames, coin boxes,
//   helmets) accent #e23b4a / sky; wood (bench seat, wooden bats) iris #e7a04a / accent; glow (sign panels, lamps,
//   buttons, vending panel), rays and pools practical #f0c36a flat; unlit lamps moon flat; painted decals hair, sclera,
//   skin #f0c2ae and accent, flat. No green: indigo has none, so the nets read pale under the lights.

export const meta = {
  name: "batting-center",
  height: 7.59,
  script: "indigo",
  colors: {
    floor: "#1b2d6b",
    aisle: "#16141c",
    net: "#e7eefc",
    frame: "#d5e2ff", frameShade: "#1b2d6b",
    dark: "#1b2d6b", darkShade: "#16141c",
    pale: "#f6f3ee", paleShade: "#d5e2ff",
    red: "#e23b4a", redShade: "#1b2d6b",
    skin: "#f0c2ae", skinShade: "#e7a04a",
    wood: "#e7a04a", woodShade: "#e23b4a",
    glow: "#f0c36a",
    unlit: "#d5e2ff",
    decal: "#16141c",
    decalPale: "#f6f3ee",
    ray: "#f0c36a",
    ball: "#f6f3ee", ballShade: "#d5e2ff",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const NATURAL = 7.59;
  const { height = NATURAL, lights = true } = opts;
  const TAU = Math.PI * 2;
  const root = new THREE.Group();
  root.name = "batting-center";
  const body = new THREE.Group();
  body.name = "set";
  const K = height / NATURAL;
  body.scale.setScalar(K);
  root.add(body);
  const joints = {};

  // ---------- layout (authoring coords; the body group shifts z so the footprint is centred) ----------
  const W = 3.4;                    // cage width
  const XS = [-W, 0, W];            // wall lines
  const CX = [-W / 2, W / 2];       // cage centres
  const NET_H = 5.4;
  const ZF = 4.0;                   // front net wall (batter side)
  const ZP = 2.6;                   // home plate (back point)
  const ZBD = ZP - 15.8;            // signboard face
  const ZB = ZBD - 2.6;             // back net wall
  const ZA = ZF + 3.2;              // aisle front edge
  const XL = -W - 1.15, XR = W + 0.35;  // floor extent in x
  const Z0 = -(ZA + ZB) / 2;        // centring shift
  const FT = 0.04;                  // floor top
  const FS = 1.2, FHX = -0.62, FHY = 2.0;       // the painted figure's scale and its hand (figure units)
  const HOLE_Y = FHY * FS, HOLE_DX = FHX * FS;

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [], o: [] });
  let owner = -1;
  function tri(key, a, b, e, ref, na, nb, ne) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-14) return;
    const flip = dot(n, sub(mul(add(add(a, b), e), 1 / 3), ref)) < 0;
    n = nrm(flip ? mul(n, -1) : n);
    const s = S(key);
    const vs = flip ? [[a, na], [e, ne], [b, nb]] : [[a, na], [b, nb], [e, ne]];
    for (const [q, nq] of vs) s.p.push(...q), s.n.push(...(nq ?? n)), s.o.push(owner);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function box(key, x0, x1, y0, y1, z0, z1) {
    const p = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    const ref = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  // oriented box: centre C, unit axes U V Wd, half sizes
  function obox(key, C, U, V, Wd, hu, hv, hw) {
    const P = (su, sv, sw) => add(add(add(C, mul(U, su * hu)), mul(V, sv * hv)), mul(Wd, sw * hw));
    const p = [P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1), P(-1, 1, -1), P(1, 1, -1), P(1, 1, 1), P(-1, 1, 1)];
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], C);
  }
  function basis(d) {
    const U = nrm(d);
    const h = Math.abs(U[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const V = nrm(cross(h, U));
    return [U, V, cross(U, V)];
  }
  // tube from A to B, radii r0 -> r1, capped; smooth side normals
  function tube(key, A, B, r0, r1 = r0, seg = 8) {
    const [U, V, Wd] = basis(sub(B, A));
    const ref = mul(add(A, B), 0.5);
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * TAU, a1 = ((i + 1) / seg) * TAU;
      const d0 = add(mul(V, Math.cos(a0)), mul(Wd, Math.sin(a0))), d1 = add(mul(V, Math.cos(a1)), mul(Wd, Math.sin(a1)));
      const b0 = add(A, mul(d0, r0)), b1 = add(A, mul(d1, r0)), t0 = add(B, mul(d0, r1)), t1 = add(B, mul(d1, r1));
      tri(key, b0, b1, t1, ref, d0, d1, d1);
      tri(key, b0, t1, t0, ref, d0, d1, d0);
      if (r1 > 0) tri(key, B, t0, t1, ref);
      if (r0 > 0) tri(key, A, b0, b1, ref);
    }
  }
  const rod = (key, A, B, r, seg = 6) => tube(key, A, B, r, r, seg);
  // lat-long ellipsoid; frac < 1 cuts it to a dome (closed with a flat cap)
  function ellipsoid(key, C, R, seg = 10, rings = 6, frac = 1) {
    const pt = (th, ph) => {
      const u = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
      return [add(C, [u[0] * R[0], u[1] * R[1], u[2] * R[2]]), nrm([u[0] / R[0], u[1] / R[1], u[2] / R[2]])];
    };
    const thMax = Math.PI * frac;
    for (let k = 0; k < rings; k++) {
      const t0 = (k / rings) * thMax, t1 = ((k + 1) / rings) * thMax;
      for (let i = 0; i < seg; i++) {
        const p0 = (i / seg) * TAU, p1 = ((i + 1) / seg) * TAU;
        const [a, na] = pt(t0, p0), [b, nb] = pt(t0, p1), [d, nd] = pt(t1, p0), [e, ne] = pt(t1, p1);
        tri(key, a, b, e, C, na, nb, ne);
        tri(key, a, e, d, C, na, ne, nd);
        if (frac < 1 && k === rings - 1) tri(key, add(C, [0, Math.cos(thMax) * R[1], 0]), d, e, add(C, [0, R[1], 0]));
      }
    }
  }
  // flat prism from a 2D outline (star-shaped about its centroid) in frame o + u*U + v*V, depth d along N
  function prism(key, pts, o, U, V, N, d) {
    const at = ([u, v], w) => add(add(add(o, mul(U, u)), mul(V, v)), mul(N, w));
    const cu = pts.reduce((s, q) => s + q[0], 0) / pts.length, cv = pts.reduce((s, q) => s + q[1], 0) / pts.length;
    const ref = at([cu, cv], d / 2);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      tri(key, at([cu, cv], d), at(a, d), at(b, d), ref);
      tri(key, at([cu, cv], 0), at(a, 0), at(b, 0), ref);
      quad(key, at(a, 0), at(b, 0), at(b, d), at(a, d), ref);
    }
  }
  const circle = (cu, cv, r, n = 14, rv = r) => Array.from({ length: n }, (_, i) => [cu + r * Math.cos((i / n) * TAU), cv + rv * Math.sin((i / n) * TAU)]);
  const rect = (u0, u1, v0, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
  // a stroke p -> q of width w as a 2D quad
  const stroke = (p, q, w) => {
    const d = nrm([q[0] - p[0], q[1] - p[1], 0]), n = [-d[1] * w / 2, d[0] * w / 2];
    return [[p[0] + n[0], p[1] + n[1]], [q[0] + n[0], q[1] + n[1]], [q[0] - n[0], q[1] - n[1]], [p[0] - n[0], p[1] - n[1]]];
  };
  // a flat sheet quad (double-sided materials)
  function sheet(key, a, b, e, d) {
    const n = nrm(cross(sub(b, a), sub(d, a)));
    const ref = sub(mul(add(add(a, b), add(e, d)), 0.25), mul(n, 0.01));
    quad(key, a, b, e, d, ref);
  }

  // ---------- floor ----------
  box("floor", XL, XR, 0, FT, ZB - 0.3, ZF);
  box("aisle", XL, XR, 0, FT, ZF, ZA);

  // ---------- nets: thin strip grids ----------
  const NS = 0.36, NW = 0.022;
  // a net on a vertical plane: along axis "x" (z fixed) or "z" (x fixed), from s0 to s1, y0 to y1
  function net(axis, fixed, s0, s1, y0, y1) {
    const P = (s, y) => (axis === "x" ? [s, y, fixed] : [fixed, y, s]);
    const h = NW / Math.SQRT2;
    for (const dir of [1, -1]) {
      // diamond mesh: lines y = dir * s + k, clipped to the wall
      for (let k = -2 * (Math.abs(s0) + Math.abs(s1)) - y1; k <= 2 * (Math.abs(s0) + Math.abs(s1)) + y1; k += NS * Math.SQRT2) {
        const sa = Math.max(s0, dir > 0 ? y0 - k : k - y1), sb = Math.min(s1, dir > 0 ? y1 - k : k - y0);
        if (sb - sa < 0.02) continue;
        const ya = dir * sa + k, yb = dir * sb + k;
        sheet("net", P(sa, ya - h), P(sb, yb - h), P(sb, yb + h), P(sa, ya + h));
      }
    }
  }
  net("z", XS[0], ZB, ZF, FT, NET_H);
  net("z", XS[1], ZB, ZF, FT, NET_H);
  net("x", ZB, XS[0], XS[2], FT, NET_H);
  net("x", ZF, XS[0], XS[2], FT, NET_H);

  // ---------- frame ----------
  const PR = 0.05;
  const postZ = [];
  for (let z = ZF; z >= ZB - 1e-6; z -= (ZF - ZB) / 5) postZ.push(z);
  for (const x of XS) {
    for (const z of postZ) rod("frame", [x, 0, z], [x, NET_H + 0.05, z], PR);
    rod("frame", [x, NET_H, ZB], [x, NET_H, ZF], PR * 0.8);
    if (x !== XS[2]) rod("frame", [x, 2.4, ZB], [x, 2.4, ZF], PR * 0.6);
  }
  for (const z of [ZF, ZB]) {
    for (let i = 1; i < 4; i++) { const x = XS[0] + (i * W) / 2; if (Math.abs(x) > 0.01) rod("frame", [x, 0, z], [x, NET_H + 0.05, z], PR); }
    rod("frame", [XS[0], NET_H, z], [XS[2], NET_H, z], PR * 0.8);
    rod("frame", [XS[0], 2.4, z], [XS[2], 2.4, z], PR * 0.6);
  }

  // ---------- each cage ----------
  const GLYPH = {
    "8": [[0, 2, 1, 2], [1, 2, 1, 1], [1, 1, 1, 0], [0, 0, 1, 0], [0, 0, 0, 1], [0, 1, 0, 2], [0, 1, 1, 1]],
    "0": [[0, 2, 1, 2], [1, 2, 1, 0], [0, 0, 1, 0], [0, 0, 0, 2]],
    "1": [[0.6, 2, 0.6, 0], [0.25, 1.7, 0.6, 2]],
    "2": [[0, 2, 1, 2], [1, 2, 1, 1], [1, 1, 0, 1], [0, 1, 0, 0], [0, 0, 1, 0]],
    k: [[0, 0, 0, 1.6], [0, 0.45, 0.7, 1.1], [0.25, 0.65, 0.75, 0]],
    m: [[0, 0, 0, 1.0], [0, 1.0, 1.0, 1.0], [0.5, 1.0, 0.5, 0], [1.0, 1.0, 1.0, 0]],
  };
  const ADV = { "8": 1.45, "0": 1.45, "1": 1.0, "2": 1.45, k: 1.05, m: 1.4 };
  // stroke text on the plane z = zf facing +Z, baseline v0, centred on xc; unit = cell height / 2
  function text(str, xc, v0, unit, sw, zf, small) {
    let wTot = 0;
    for (const ch of str) wTot += ADV[ch] * (small.includes(ch) ? unit * 0.75 : unit);
    let x = xc - wTot / 2;
    for (const ch of str) {
      const u = small.includes(ch) ? unit * 0.75 : unit;
      for (const [a, b, e, d] of GLYPH[ch]) {
        const p = [x + a * u, v0 + b * u], q = [x + e * u, v0 + d * u];
        const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
        const ext = [(q[0] - p[0]) / len * sw / 2, (q[1] - p[1]) / len * sw / 2];
        prism("decal", stroke([p[0] - ext[0], p[1] - ext[1]], [q[0] + ext[0], q[1] + ext[1]], sw), [0, 0, zf], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.006);
      }
      x += ADV[ch] * u;
    }
  }

  const Zp = [0, 0, 1], Xp = [1, 0, 0], Yp = [0, 1, 0];
  const SPEED = ["80km", "120km"];
  for (let ci = 0; ci < 2; ci++) {
    const xc = CX[ci];
    // batter's box mat, box outlines and home plate
    box("aisle", xc - 1.0, xc + 1.0, FT, FT + 0.02, ZP - 1.35, ZP + 0.85);
    const yM = FT + 0.02;
    for (const s of [-1, 1]) {
      const u0 = xc + s * 0.33, u1 = xc + s * 0.93;
      const lo = Math.min(u0, u1), hi = Math.max(u0, u1);
      const z0 = ZP - 1.0, z1 = ZP + 0.6, lw = 0.05;
      for (const r of [rect(lo, hi, z0, z0 + lw), rect(lo, hi, z1 - lw, z1), rect(lo, lo + lw, z0, z1), rect(hi - lw, hi, z0, z1)])
        prism("decalPale", r.map(([u, v]) => [u, -v]), [0, yM, 0], Xp, [0, 0, -1], Yp, 0.006);
    }
    const plate = [[0, 0], [0.215, -0.215], [0.215, -0.43], [-0.215, -0.43], [-0.215, -0.215]].map(([u, v]) => [xc + u, -(ZP + v)]);
    prism("pale", plate, [0, yM, 0], Xp, [0, 0, -1], Yp, 0.012);

    // signboard: board, frame, legs; the painted pitcher on its +Z face
    const BW = 1.4, BY0 = 0.2, BY1 = 3.05, BT = 0.06;
    box("dark", xc - BW, xc + BW, BY0, BY1, ZBD - BT, ZBD);
    const FR = 0.07;
    box("red", xc - BW - FR, xc + BW + FR, BY1, BY1 + FR, ZBD - BT - 0.01, ZBD + 0.02);
    box("red", xc - BW - FR, xc + BW + FR, BY0 - FR, BY0, ZBD - BT - 0.01, ZBD + 0.02);
    box("red", xc - BW - FR, xc - BW, BY0, BY1, ZBD - BT - 0.01, ZBD + 0.02);
    box("red", xc + BW, xc + BW + FR, BY0, BY1, ZBD - BT - 0.01, ZBD + 0.02);
    for (const s of [-1, 1]) box("frame", xc + s * 0.8 - 0.05, xc + s * 0.8 + 0.05, 0, BY0, ZBD - 0.12, ZBD - 0.02);
    const L1 = ZBD + 0.004, L2 = ZBD + 0.012, L3 = ZBD + 0.02;
    const paint = (key, pts, z) => prism(key, pts.map(([u, v]) => [xc + u * FS, v * FS]), [0, 0, z], Xp, Yp, Zp, 0.006);
    // legs (pivot leg image-left trailing, stride leg image-right), pale trousers, red socks, dark shoes
    const limb = (key, pts, w, z) => {
      for (let i = 0; i + 1 < pts.length; i++) paint(key, stroke(pts[i], pts[i + 1], w), z);
      for (let i = 1; i + 1 < pts.length; i++) paint(key, circle(pts[i][0], pts[i][1], w / 2, 10), z);
    };
    limb("decalPale", [[-0.13, 1.25], [-0.36, 0.75], [-0.5, 0.5]], 0.24, L1);
    limb("decalPale", [[0.13, 1.25], [0.4, 0.8], [0.4, 0.55]], 0.24, L1);
    limb("red", [[-0.5, 0.52], [-0.6, 0.32]], 0.17, L2);
    limb("red", [[0.4, 0.56], [0.41, 0.33]], 0.17, L2);
    paint("decal", circle(-0.66, 0.29, 0.14, 12, 0.07), L2);
    paint("decal", circle(0.45, 0.3, 0.15, 12, 0.07), L2);
    // torso, belt, neck, head, cap
    paint("decalPale", [[-0.33, 2.0], [0.33, 2.0], [0.25, 1.22], [-0.25, 1.22]], L1);
    paint("decal", rect(-0.25, 0.25, 1.24, 1.31), L2);
    paint("red", stroke([-0.26, 1.98], [0.22, 1.32], 0.05), L2);
    paint("skin", rect(-0.07, 0.07, 1.96, 2.08), L1);
    paint("skin", circle(0.03, 2.24, 0.19, 16, 0.2), L1);
    paint("decal", circle(-0.04, 2.24, 0.022, 8), L2);
    paint("decal", circle(0.1, 2.24, 0.022, 8), L2);
    paint("red", [...Array.from({ length: 11 }, (_, i) => [0.03 + 0.2 * Math.cos((i / 10) * Math.PI), 2.31 + 0.15 * Math.sin((i / 10) * Math.PI)])], L2);
    paint("red", rect(-0.19, 0.3, 2.29, 2.34), L2);
    // throwing arm out to the hole (pale sleeve, skin forearm), glove arm folded in (dark glove)
    limb("decalPale", [[-0.27, 1.92], [-0.45, 1.97]], 0.16, L1);
    limb("skin", [[-0.44, 1.97], [FHX + 0.05, FHY - 0.02]], 0.12, L1);
    limb("decalPale", [[0.27, 1.92], [0.5, 1.6]], 0.16, L1);
    limb("skin", [[0.5, 1.6], [0.35, 1.45]], 0.11, L1);
    paint("decal", circle(0.31, 1.43, 0.14, 14), L2);
    // ball hole: pale ring, dark hole
    paint("decalPale", circle(FHX, FHY, 0.17, 18), L2);
    paint("decal", circle(FHX, FHY, 0.12, 18), L3);

    // machine behind the board: stand, body, wheels, hopper
    const mx = xc + HOLE_DX, mz = ZBD - 0.75;
    for (const s of [-1, 1]) for (const t of [-1, 1]) rod("frame", [mx + s * 0.3, 0, mz + t * 0.35], [mx + s * 0.3, 1.35, mz + t * 0.35], 0.035);
    box("dark", mx - 0.38, mx + 0.38, 1.35, 1.75, mz - 0.45, mz + 0.45);
    for (const s of [-1, 1]) {
      const wy = HOLE_Y + s * 0.22;
      tube("pale", [mx - 0.08, wy, ZBD - 0.35], [mx + 0.08, wy, ZBD - 0.35], 0.2, 0.2, 14);
    }
    box("dark", mx - 0.12, mx + 0.12, 1.75, HOLE_Y + 0.5, ZBD - 0.5, ZBD - 0.2);
    tube("dark", [mx, HOLE_Y + 0.6, mz - 0.1], [mx, HOLE_Y + 1.0, mz - 0.1], 0.18, 0.38, 12);

    // front wall: door frame, coin box, speed sign
    const dx0 = ci === 0 ? -0.95 : W - 0.95, dx1 = dx0 + 0.8;
    rod("frame", [dx0, 0, ZF + 0.03], [dx0, 2.05, ZF + 0.03], 0.035);
    rod("frame", [dx1, 0, ZF + 0.03], [dx1, 2.05, ZF + 0.03], 0.035);
    rod("frame", [dx0, 2.05, ZF + 0.03], [dx1, 2.05, ZF + 0.03], 0.035);
    box("dark", dx1 - 0.12, dx1 - 0.05, 0.95, 1.1, ZF + 0.03, ZF + 0.08);
    const cbx = dx0 - 0.28;
    rod("frame", [cbx, 0, ZF + 0.12], [cbx, 1.05, ZF + 0.12], 0.035);
    box("red", cbx - 0.13, cbx + 0.13, 1.02, 1.38, ZF + 0.05, ZF + 0.2);
    box("decal", cbx - 0.09, cbx + 0.09, 1.25, 1.31, ZF + 0.2, ZF + 0.207);
    box("decal", cbx - 0.03, cbx + 0.03, 1.12, 1.2, ZF + 0.2, ZF + 0.207);
    box("glow", cbx - 0.1, cbx - 0.05, 1.09, 1.13, ZF + 0.2, ZF + 0.215);
    box("glow", cbx + 0.05, cbx + 0.1, 1.09, 1.13, ZF + 0.2, ZF + 0.215);
    joints[ci ? "doorB" : "doorA"] = anchor(ci ? "doorB" : "doorA", (dx0 + dx1) / 2, FT, ZF + 0.6);
    // speed sign over the cage, on two hangers from the top rail
    const sy0 = 2.7, sy1 = 3.5, sw = 1.0;
    box("dark", xc - sw - 0.05, xc + sw + 0.05, sy0 - 0.05, sy1 + 0.05, ZF + 0.06, ZF + 0.16);
    box("glow", xc - sw, xc + sw, sy0, sy1, ZF + 0.16, ZF + 0.17);
    for (const s of [-1, 1]) rod("frame", [xc + s * 0.75, sy1 + 0.05, ZF + 0.11], [xc + s * 0.75, NET_H, ZF + 0.03], 0.02, 5);
    text(SPEED[ci], xc, sy0 + 0.12, 0.26, 0.085, ZF + 0.172, "km");

    joints[ci ? "plateB" : "plateA"] = anchor(ci ? "plateB" : "plateA", xc, yM, ZP);
    joints[ci ? "boardB" : "boardA"] = anchor(ci ? "boardB" : "boardA", xc + HOLE_DX, HOLE_Y, ZBD);
  }
  function anchor(name, x, y, z) {
    const j = new THREE.Group();
    j.name = name;
    j.position.set(x, y, z);
    body.add(j);
    return j;
  }

  // ---------- aisle: bench, helmets, bat rack, vending machine ----------
  const bz = ZF + 0.55, bx0 = -W + 0.35, bx1 = bx0 + 1.5;
  box("wood", bx0, bx1, 0.4, 0.45, bz - 0.2, bz + 0.2);
  for (const x of [bx0 + 0.12, bx1 - 0.12]) for (const t of [-1, 1]) rod("frame", [x, 0, bz + t * 0.15], [x, 0.4, bz + t * 0.15], 0.025, 5);
  const helmet = (x, y, z, yaw) => {
    ellipsoid("red", [x, y, z], [0.125, 0.13, 0.14], 12, 5, 0.5);
    const f = [Math.sin(yaw), 0, Math.cos(yaw)];
    obox("red", add([x, y + 0.01, z], mul(f, 0.15)), [f[2], 0, -f[0]], Yp, f, 0.1, 0.012, 0.05);
    for (const s of [-1, 1]) ellipsoid("red", add([x, y - 0.04, z], [f[2] * s * 0.11, 0, -f[0] * s * 0.11]), [0.03, 0.06, 0.07], 8, 4);
  };
  helmet(bx0 + 0.35, 0.45, bz, 0.4);
  helmet(bx0 + 0.85, 0.45, bz + 0.03, -0.3);
  joints.bench = anchor("bench", (bx0 + bx1) / 2, 0.45, bz);
  // rack: a low box frame with a top bar; bats standing handle-up
  const rx0 = bx1 + 0.15, rx1 = rx0 + 0.75, rz = ZF + 0.35;
  for (const x of [rx0, rx1]) { rod("frame", [x, 0, rz], [x, 0.75, rz], 0.025, 5); rod("frame", [x, 0, rz + 0.2], [x, 0.75, rz + 0.2], 0.025, 5); rod("frame", [x, 0.75, rz], [x, 0.75, rz + 0.2], 0.02, 5); }
  rod("frame", [rx0, 0.75, rz + 0.1], [rx1, 0.75, rz + 0.1], 0.025, 5);
  box("dark", rx0, rx1, 0.04, 0.1, rz - 0.02, rz + 0.22);
  for (let i = 0; i < 5; i++) {
    const x = rx0 + 0.1 + i * 0.137, lean = (i % 2 ? 0.05 : -0.04);
    const A = [x, 0.11, rz + 0.1], B = [x + lean, 0.95, rz + 0.1 + 0.05];
    const key = i % 2 ? "frame" : "wood";
    const mid = add(A, mul(sub(B, A), 0.55));
    tube(key, A, mid, 0.034, 0.03, 8);
    tube(key, mid, B, 0.03, 0.014, 8);
    ellipsoid(key, add(B, [0, 0.008, 0]), [0.022, 0.012, 0.022], 6, 3);
  }
  helmet(rx1 - 0.15, 0.77, rz + 0.1, 0.2);
  // vending machine facing +X
  const vx = -W - 0.4, vz = ZF + 1.7, vd = 0.375, vw = 0.5;
  box("pale", vx - vd, vx + vd, FT, 1.83, vz - vw, vz + vw);
  const vf = vx + vd;
  box("glow", vf, vf + 0.008, 1.45, 1.75, vz - 0.44, vz + 0.44);
  box("decal", vf, vf + 0.006, 0.75, 1.42, vz - 0.44, vz + 0.44);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) {
    const y = 0.82 + r * 0.21, z = vz - 0.36 + k * 0.144;
    box(k % 2 ? "red" : "pale", vf + 0.006, vf + 0.05, y, y + 0.14, z - 0.035, z + 0.035);
    box("glow", vf + 0.006, vf + 0.02, y - 0.03, y - 0.01, z - 0.02, z + 0.02);
  }
  box("decal", vf, vf + 0.006, 0.2, 0.42, vz - 0.38, vz + 0.2);
  box("decal", vf, vf + 0.006, 0.95, 1.2, vz + 0.47 - 0.02, vz + 0.47);
  box("dark", vf - 0.02, vf + 0.04, 0.6, 0.7, vz + 0.26, vz + 0.42);
  joints.vending = anchor("vending", vf + 0.5, FT, vz);

  // ---------- floodlights ----------
  const POLES = [[-W - 0.45, ZF - 0.6], [W + 0.25, ZF - 0.6], [-W - 0.45, ZP - 7.4], [W + 0.25, ZP - 7.4]];
  const PH = 7.2;
  for (const [px, pz] of POLES) {
    const s = px < 0 ? 1 : -1;               // toward the cages
    tube("frame", [px, 0, pz], [px, PH, pz], 0.11, 0.075, 8);
    // head: a lamp bank tilted down and in, on a short arm
    const hc = [px + s * 0.35, PH + 0.1, pz];
    rod("frame", [px, PH - 0.15, pz], hc, 0.05, 6);
    const tilt = 0.75;
    const N = nrm([s * Math.cos(tilt), -Math.sin(tilt), 0]);   // lamp face normal
    const U = [0, 0, 1], V = nrm(cross(N, U));
    obox("dark", hc, U, V, N, 0.75, 0.32, 0.08);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      const lc = add(add(add(hc, mul(U, (i - 1) * 0.48)), mul(V, (j - 0.5) * 0.3)), mul(N, 0.085));
      prism(lights ? "glow" : "unlit", circle(0, 0, 0.13, 12), lc, U, V, N, 0.012);
    }
    // the glow cone: a fan of thin rays from the bank to a pale pool on the floor
    if (lights) {
      const target = [px + s * 2.3, FT + 0.01, pz - (pz > 0 ? 1.2 : 0)];
      const tip = add(hc, mul(N, 0.1));
      for (let k = 0; k < 5; k++) {
        const fz = (k - 2) * 0.95, wz = 0.16;
        const f0 = add(target, [s * (k % 2 ? 0.35 : -0.2), 0, fz - wz]), f1 = add(target, [s * (k % 2 ? 0.35 : -0.2), 0, fz + wz]);
        const t0 = add(tip, [0, 0, (k - 2) * 0.22]);
        tri("ray", t0, f0, f1, add(t0, [s * 0.01, 0.01, 0]));
      }
      prism("ray", circle(0, 0, 2.4, 20, 1.15), [target[0], FT + 0.002, target[2]], [0, 0, 1], [1, 0, 0], [0, 1, 0], 0.004);
    }
  }

  // ---------- balls (one mesh; owner 0 ball A, 1 streak A, 2 ball B, 3 streak B; authored around the origin) ----------
  const BR = 0.05;
  for (let b = 0; b < 2; b++) {
    owner = b * 2;
    ellipsoid("ball", [0, 0, 0], [BR, BR, BR], 10, 6);
    owner = b * 2 + 1;
    tube("ball", [0, 0, -1.8], [0, 0, -0.01], 0.0, BR * 0.85, 8);
  }
  owner = -1;

  // ---------- meshes: one per material ----------
  const MAT = {
    floor: [c.floor, c.floor, -1, 2], aisle: [c.aisle, c.aisle, -1, 2],
    net: [c.net, c.net, -1, 0, true], frame: [c.frame, c.frameShade, 0.1, 2],
    dark: [c.dark, c.darkShade, 0.1, 2], pale: [c.pale, c.paleShade, 0.1, 2], red: [c.red, c.redShade, 0.1, 2],
    skin: [c.skin, c.skin, -1, 0], wood: [c.wood, c.woodShade, 0.1, 2],
    glow: [c.glow, c.glow, -1, 0], unlit: [c.unlit, c.unlit, -1, 0],
    decal: [c.decal, c.decal, -1, 0], decalPale: [c.decalPale, c.decalPale, -1, 0],
    ray: [c.ray, c.ray, -1, 0, true], ball: [c.ball, c.ballShade, 0.1, 2],
  };
  let ballMesh = null, base = null;
  for (const [key, { p, n, o }] of Object.entries(soups)) {
    const [b, s, threshold, px, doubleSided] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, b, s, px ? { threshold, px } : { threshold, outline: false, doubleSided: !!doubleSided });
    mesh.name = key;
    body.add(mesh);
    if (key === "ball") {
      ballMesh = mesh;
      base = { p: Float32Array.from(p), o };
      mesh.frustumCulled = false;
    }
  }
  body.position.z = Z0 * K;

  // ---------- pitch clip ----------
  // per cage: release time (s), flight time hole -> front net (s, from the sign's km/h), drop time
  const HIDE = [0, 1.55, ZBD - 0.7];   // inside the machine body, behind the board
  const CAGE = [
    { t0: 0.2, v: 80 / 3.6 },
    { t0: 1.1, v: 120 / 3.6 },
  ];
  const ZN = ZF - 0.08;
  function ballAt(ci, t) {
    const { t0, v } = CAGE[ci];
    const xc = CX[ci];
    const H = [xc + HOLE_DX, HOLE_Y, ZBD + 0.03];
    const T = [xc + 0.05, 0.85, ZP - 0.2];          // over the plate
    const dist = ZN - H[2], fl = dist / v;
    const u = (((t - t0) % 2) + 2) % 2;
    if (u > 1.75) return null;
    if (u <= fl) {
      const k = u / fl;
      const kp = (T[2] - H[2]) / dist;              // fraction at the plate
      const x = H[0] + (T[0] - H[0]) * k / kp;
      const sag = 0.25 * 4 * k * (1 - k);
      const y = H[1] + (T[1] - H[1]) * k / kp + sag * (ci ? 0.4 : 1) - 0.25 * (k > kp ? 0 : 0);
      return { p: [x, y, H[2] + dist * k], fly: true };
    }
    const xe = H[0] + (T[0] - H[0]) / ((T[2] - H[2]) / dist);
    const ye = H[1] + (T[1] - H[1]) / ((T[2] - H[2]) / dist);
    const d = u - fl;
    if (d < 0.32) {                                  // falls down the net
      const y = Math.max(FT + BR, ye - 0.5 * 9.8 * d * d);
      return { p: [xe, y, ZN - 0.05 - d * 0.6], fly: false };
    }
    const r = Math.min(1, (d - 0.32) / 0.6);         // rolls back a little
    return { p: [xe, FT + BR, ZN - 0.25 - 0.5 * (1 - (1 - r) * (1 - r))], fly: false };
  }
  function rig(t) {
    const P3 = ballMesh.geometry.attributes.position.array;
    for (let ci = 0; ci < 2; ci++) {
      const st = t == null ? null : ballAt(ci, t);
      for (let v = 0; v < base.o.length; v++) {
        const k = base.o[v];
        if (k >> 1 !== ci) continue;
        const i = v * 3;
        if (!st || (k & 1 && !st.fly)) { P3[i] = HIDE[0] + CX[ci]; P3[i + 1] = HIDE[1]; P3[i + 2] = HIDE[2]; continue; }
        P3[i] = st.p[0] + base.p[i]; P3[i + 1] = st.p[1] + base.p[i + 1]; P3[i + 2] = st.p[2] + base.p[i + 2];
      }
    }
    const g = ballMesh.geometry;
    g.attributes.position.needsUpdate = true;
    g.computeBoundingSphere(), g.computeBoundingBox();
  }
  const CLIPS = { pitch: 2 };
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`batting-center: no clip "${m[1]}" (clips: pitch)`);
      rig(+m[2]);
    } else {
      if (name !== "rest") throw new Error(`batting-center: unknown pose "${name}" (rest, or pitch@<seconds>)`);
      rig(null);
    }
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
