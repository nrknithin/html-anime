// game-center.js - an anime arcade (game center) aisle at night, cut away: a row of sit-down video-game cabinets with
// stools, a two-drum rhythm-game cabinet, a pair of purikura photo booths with curtains, a change machine, a patterned
// carpet and a ceiling-light grid fixed to the walls. No crane games (ufo-catcher.js is that machine).
// Contract: harness/lab/README.md. Meters, +Y up, the room's open (cutaway) sides face +X and +Z so a camera in the
// lit front-left quadrant looks in; the -Z wall backs the cabinet row and the drum cabinet, the -X wall backs the two
// booths and the change machine. Stands on y = 0 (carpet top y = 0.02, joints.floor), centred on the room's footprint.
//
// Construction (boxes, extruded profiles, rods, spheres and flat decals, all triangle soups merged per material, as
// karaoke-room.js, so the whole aisle is 12 meshes at any cabinet count; every triangle is wound away from a point
// inside its solid, never by hand; profiles are made CCW from their signed area and capped by ear clipping):
//   SHELL    a carpet slab and two walls 0.1 thick with a dark skirting board and two neon stripes near the top; flat
//            neon shapes (rings, stars) on the back wall over the cabinets. The carpet carries a hashed grid of small
//            flat shapes (dots, triangles, crosses) in the three glow tones.
//   CABINET  a "candy" cabinet: one extruded side profile (base, jutting control panel, screen slanted back, a hood);
//            on it flat decals: a dark bezel, a sky screen with four abstract shape slots, a lit hood strip, a coin
//            door with two lit slots, an accent stripe on each side. Joystick (rod and ball) and three buttons on the
//            panel; a round stool in front.
//   DRUM     a tall amber cabinet (extruded profile) with a big screen (five slots), a lit hood and two speakers; in
//            front a dark stand with two tilted drums (accent barrels, pale heads) and a pair of sticks on each.
//   BOOTHS   two pink boxes against the -X wall, each with a canopy over the opening (a lit panel with three slots), a
//            folded curtain (a wavy extruded slab) hanging in it, the dark gap under the curtain, and on the front
//            booth's +Z side a big lit poster of colour blocks.
//   CHANGE   an amber box on a dark plinth facing +X: dark face panel, a lit bill slot, a button, a coin tray, a lit
//            sign with a coin disc on top.
//   CEILING  a dark beam grid at 2.62 m that butts into both walls (brackets on the walls), a lit panel in each cell.
//   SCREENS  every screen shape slot is written into each of the three glow meshes (accent, practical, line); pose()
//            collapses the copies that are not the slot's colour this beat, so the screens cycle colour blocks with
//            no extra meshes or materials (the cheap "material swap").
// Proportions (real size; base unit the wall top 2.8 m = meta.height): room depth 3.4, width 4.1 + 0.78 a cabinet;
//   cabinet 0.74 wide (0.04 gaps), 1.5 tall, 0.8 deep with the panel at 0.74, screen 0.56 along its slant;
//   stool seat 0.5; drum cabinet 1.1 wide, 2.1 tall, drums r 0.22 at 0.82; booths 1.5 x 1.2 x 2.25, curtain
//   0.38-1.98; change machine 0.42 x 0.5 x 1.6; beams 2.60-2.66.
// Options: build(THREE, kit, colors, { height, cabinets }).
//   height    scales the whole set so the wall top is `height` (default 2.8).
//   cabinets  sit-down cabinets in the row, 1..8 (default 4); the room widens with the row.
// Clip: attract (1.5 s): three beats of 0.5 s, each screen slot steps to the next glow colour; loops seamlessly.
// Joints: anchors floor, cab0.., drum, booth0, booth1, change (each at its machine's front, for placing characters).
// Ink: hulls 2 px (a room is seen small); decals, screens and lights have none.
// Colours (festival, night): walls hair #1a1020 flat; carpet sky #24143a / hair; dark parts (skirting, beams, stand,
//   poles, joystick, plinth) sky / hair; cabinets, drum heads and sticks sclera #f6f3ee / iris #ffd0a1; booths, stool
//   seats, drum barrels and joystick balls accent #ff4d6d / sky; drum cabinet and change machine practical #ffb020 /
//   accent; curtains moon #ffd7a1 / iris; glow accent, practical and line #fff1ea flat (stripes, neon, carpet shapes,
//   lamps, screen blocks); bezels and openings hair flat; screen backgrounds sky flat.

export const meta = {
  name: "game-center",
  height: 2.8,
  script: "festival",
  colors: {
    wall: "#1a1020",
    carpet: "#24143a", carpetShade: "#1a1020",
    dark: "#24143a", darkShade: "#1a1020",
    pale: "#f6f3ee", paleShade: "#ffd0a1",
    pink: "#ff4d6d", pinkShade: "#24143a",
    amber: "#ffb020", amberShade: "#ff4d6d",
    cream: "#ffd7a1", creamShade: "#ffd0a1",
    glowA: "#ff4d6d", glowP: "#ffb020", glowL: "#fff1ea",
    hole: "#1a1020",
    screen: "#24143a",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height } = opts;
  const nCab = Math.max(1, Math.min(8, Math.round(opts.cabinets ?? 4)));
  const c = { ...meta.colors, ...colors };
  const TAU = Math.PI * 2;
  const root = new THREE.Group();
  root.name = "game-center";
  const set = new THREE.Group(); // the uniform size scale lives here
  set.name = "aisle";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  function tri(key, a, b, e, ref, na, nb, ne) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const m = mul(add(add(a, b), e), 1 / 3);
    const flip = dot(n, sub(m, ref)) < 0;
    n = nrm(flip ? mul(n, -1) : n);
    const s = S(key);
    const push = (q, qn) => (s.p.push(...q), s.n.push(...(qn ?? n)));
    push(a, na);
    if (flip) push(e, ne), push(b, nb);
    else push(b, nb), push(e, ne);
  }
  const quad = (key, a, b, e, d, ref, na, nb, ne, nd) => (tri(key, a, b, e, ref, na, nb, ne), tri(key, a, e, d, ref, na, ne, nd));
  function box(key, x0, x1, y0, y1, z0, z1) {
    if (x0 > x1) [x0, x1] = [x1, x0];
    if (z0 > z1) [z0, z1] = [z1, z0];
    const p = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    const ref = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  // ear clipping of a CCW simple polygon -> index triples
  const cz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  function earclip(pts) {
    const idx = pts.map((_, i) => i), out = [];
    for (let guard = 0; idx.length > 3 && guard < 500; guard++) {
      for (let k = 0; k < idx.length; k++) {
        const i0 = idx[(k - 1 + idx.length) % idx.length], i1 = idx[k], i2 = idx[(k + 1) % idx.length];
        const [A, B, C] = [pts[i0], pts[i1], pts[i2]];
        if (cz(A, B, C) <= 1e-12) continue;
        if (idx.some((j) => j !== i0 && j !== i1 && j !== i2 && cz(A, B, pts[j]) >= 0 && cz(B, C, pts[j]) >= 0 && cz(C, A, pts[j]) >= 0)) continue;
        out.push([i0, i1, i2]);
        idx.splice(k, 1);
        break;
      }
    }
    out.push(idx.slice(0, 3));
    return out;
  }
  // a 2D profile extruded from t0 to t1; map(a, b, t) -> world point (affine)
  function prism(key, prof, map, t0, t1) {
    let area = 0;
    for (let i = 0; i < prof.length; i++) { const p = prof[i], q = prof[(i + 1) % prof.length]; area += p[0] * q[1] - q[0] * p[1]; }
    const P = area < 0 ? prof.slice().reverse() : prof;
    const tm = (t0 + t1) / 2;
    for (const [i, j, k] of earclip(P)) {
      const ref = map((P[i][0] + P[j][0] + P[k][0]) / 3, (P[i][1] + P[j][1] + P[k][1]) / 3, tm);
      for (const t of [t0, t1]) tri(key, map(...P[i], t), map(...P[j], t), map(...P[k], t), ref);
    }
    for (let i = 0; i < P.length; i++) {
      const p = P[i], q = P[(i + 1) % P.length];
      const d = [q[0] - p[0], q[1] - p[1]], L = Math.hypot(...d) || 1;
      const ref = map((p[0] + q[0]) / 2 - (d[1] / L) * 1e-3, (p[1] + q[1]) / 2 + (d[0] / L) * 1e-3, tm);
      quad(key, map(...p, t0), map(...q, t0), map(...q, t1), map(...p, t1), ref);
    }
  }
  // a round rod from a to b, capped, radial normals
  function rod(key, a, b, r, n = 8) {
    const d = nrm(sub(b, a)), up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const e1 = nrm(cross(d, up)), e2 = cross(e1, d);
    const ring = (o) => Array.from({ length: n }, (_, j) => { const t = (j / n) * TAU; return add(o, add(mul(e1, r * Math.cos(t)), mul(e2, r * Math.sin(t)))); });
    const ra = ring(a), rb = ring(b), mid = mul(add(a, b), 0.5);
    for (let j = 0; j < n; j++) {
      const k = (j + 1) % n;
      quad(key, ra[j], ra[k], rb[k], rb[j], mid, nrm(sub(ra[j], a)), nrm(sub(ra[k], a)), nrm(sub(rb[k], b)), nrm(sub(rb[j], b)));
      tri(key, a, ra[j], ra[k], mid);
      tri(key, b, rb[j], rb[k], mid);
    }
  }
  function sphere(key, C, r, seg = 8, rings = 5) {
    const at = (i, j) => { const th = (i / rings) * Math.PI, ph = (j / seg) * TAU; return [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]; };
    for (let i = 0; i < rings; i++)
      for (let j = 0; j < seg; j++) {
        const [a, b, e, d] = [at(i, j), at(i, j + 1), at(i + 1, j + 1), at(i + 1, j)];
        const P = (q) => add(C, mul(q, r));
        quad(key, P(a), P(b), P(e), P(d), C, a, b, e, d);
      }
  }
  // flat decals on a frame {O, U, V, N}: star-shaped polygons fanned from their centroid, `off` metres out along N
  const F = (O, U, V, N) => ({ O, U, V, N: N ?? nrm(cross(U, V)) });
  const at2 = (fr, u, v, off) => add(add(fr.O, add(mul(fr.U, u), mul(fr.V, v))), mul(fr.N, off));
  function decal(key, fr, pts, off = 0.004) {
    const cu = pts.reduce((s, p) => s + p[0], 0) / pts.length, cv = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const C = at2(fr, cu, cv, off), ref = sub(C, mul(fr.N, 0.01));
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      tri(key, C, at2(fr, p[0], p[1], off), at2(fr, q[0], q[1], off), ref, fr.N, fr.N, fr.N);
    }
  }
  const rect = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
  const circ = (u, v, r, n = 12) => Array.from({ length: n }, (_, i) => [u + r * Math.cos((i / n) * TAU), v + r * Math.sin((i / n) * TAU)]);
  const star = (u, v, r, n = 5) => Array.from({ length: n * 2 }, (_, i) => { const a = TAU / 4 + (i / (n * 2)) * TAU, rr = i % 2 ? r * 0.45 : r; return [u + rr * Math.cos(a), v + rr * Math.sin(a)]; });
  function ring(key, fr, u, v, r0, r1, n = 16, off = 0.004) {
    const ref = sub(at2(fr, u, v, off), mul(fr.N, 0.01));
    const p = (r, i) => at2(fr, u + r * Math.cos((i / n) * TAU), v + r * Math.sin((i / n) * TAU), off);
    for (let i = 0; i < n; i++) quad(key, p(r1, i), p(r1, i + 1), p(r0, i + 1), p(r0, i), ref, fr.N, fr.N, fr.N, fr.N);
  }
  // screen slots: one copy of the shape per glow colour; pose() keeps only the copy of the beat's colour
  const GLOW = ["glowA", "glowP", "glowL"];
  const slots = [];
  function slot(fr, pts, phase, off = 0.009) {
    GLOW.forEach((key, k) => {
      const s0 = S(key).p.length;
      decal(key, fr, pts, off);
      slots.push({ key, k, phase, s: s0, e: S(key).p.length });
    });
  }
  let seed = 7;
  const hash = (i) => { const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453; return x - Math.floor(x); };

  // ---------- room shell ----------
  const TOP = 2.8, FT = 0.02, TW = 0.1;
  const CW = 0.74, GAP = 0.04, ROW0 = -1.3;
  const rowEnd = ROW0 + nCab * (CW + GAP) - GAP;
  const DX0 = rowEnd + 0.16, DX1 = DX0 + 1.1;
  const X0 = -3.0, X1 = DX1 + 0.22, Z0 = -1.7, Z1 = 1.7;
  box("carpet", X0, X1, 0, FT, Z0, Z1);
  box("wall", X0 - TW, X1, 0, TOP, Z0 - TW, Z0);
  box("wall", X0 - TW, X0, 0, TOP, Z0, Z1);
  box("dark", X0, X1, FT, 0.1, Z0, Z0 + 0.015); // skirting
  box("dark", X0, X0 + 0.015, FT, 0.1, Z0 + 0.015, Z1);
  for (const [y, key] of [[2.36, "glowA"], [2.44, "glowP"]]) {
    box(key, X0, X1, y, y + 0.03, Z0, Z0 + 0.012);
    box(key, X0, X0 + 0.012, y, y + 0.03, Z0 + 0.012, Z1);
  }
  const backF = F([0, 0, Z0], [1, 0, 0], [0, 1, 0]); // back wall face, normal +Z
  // carpet pattern: a hashed grid of small flat shapes
  const floorF = F([0, FT, 0], [0, 0, 1], [1, 0, 0]); // u = z, v = x, normal +Y
  {
    const step = 0.36;
    let i = 0;
    for (let x = X0 + step / 2; x < X1; x += step)
      for (let z = Z0 + step / 2; z < Z1; z += step, i++) {
        const key = GLOW[Math.floor(hash(i) * 3)], kind = Math.floor(hash(i + 50) * 3);
        const u = z + (hash(i + 90) - 0.5) * 0.16, v = x + (hash(i + 130) - 0.5) * 0.16;
        if (kind === 0) decal(key, floorF, circ(u, v, 0.055, 8), 0.002);
        else if (kind === 1) { const a = hash(i + 170) * TAU; decal(key, floorF, [0, 1, 2].map((k) => [u + 0.075 * Math.cos(a + (k * TAU) / 3), v + 0.075 * Math.sin(a + (k * TAU) / 3)]), 0.002); }
        else { decal(key, floorF, rect(u - 0.07, v - 0.018, u + 0.07, v + 0.018), 0.002); decal(key, floorF, rect(u - 0.018, v - 0.07, u + 0.018, v + 0.07), 0.0025); }
      }
  }

  // ---------- sit-down cabinets ----------
  const CAB = [[0, 0], [0.6, 0], [0.6, 0.6], [0.8, 0.66], [0.8, 0.74], [0.62, 0.78], [0.42, 1.3], [0.48, 1.34], [0.48, 1.5], [0, 1.5]];
  const anchor = (name, x, y, z) => { const a = new THREE.Group(); a.name = name; a.position.set(x, y, z); set.add(a); joints[name] = a; };
  for (let i = 0; i < nCab; i++) {
    const cx = ROW0 + CW / 2 + i * (CW + GAP), hw = CW / 2;
    prism("pale", CAB, (zl, y, x) => [x, y, Z0 + zl], cx - hw, cx + hw);
    // screen on the slant F -> G
    const Fp = [cx, 0.78, Z0 + 0.62], Gp = [cx, 1.3, Z0 + 0.42];
    const scr = F(Fp, [1, 0, 0], nrm(sub(Gp, Fp)));
    decal("hole", scr, rect(-0.33, 0.015, 0.33, 0.545), 0.003);
    decal("screen", scr, rect(-0.29, 0.055, 0.29, 0.505), 0.006);
    const m = i % 2 ? -1 : 1, ph = i;
    slot(scr, rect(-0.27, 0.075, 0.27, 0.15), ph);
    slot(scr, circ(-0.12 * m, 0.32, 0.085, 14), ph + 1);
    slot(scr, [[0.0 * m, 0.17], [0.25 * m, 0.17], [0.13 * m, 0.4]], ph + 2);
    slot(scr, rect(0.15 * m - 0.03, 0.42, 0.15 * m + 0.03, 0.48), ph + 1);
    slot(scr, rect(-0.26 * m - 0.02, 0.44, -0.26 * m + 0.03, 0.48), ph);
    // hood strip, coin door, side stripes
    const hood = F([cx, 1.34, Z0 + 0.48], [1, 0, 0], [0, 1, 0]);
    decal("glowP", hood, rect(-0.31, 0.04, 0.31, 0.12));
    const front = F([cx, 0, Z0 + 0.6], [1, 0, 0], [0, 1, 0]);
    decal("hole", front, rect(-0.13, 0.22, 0.13, 0.46));
    decal("glowP", front, rect(-0.08, 0.38, -0.05, 0.43), 0.007);
    decal("glowP", front, rect(0.05, 0.38, 0.08, 0.43), 0.007);
    for (const s of [-1, 1]) {
      const side = F([cx + s * hw, 0, Z0], [0, 0, 1], [0, 1, 0], [s, 0, 0]); // normal +-X outward
      decal("glowA", side, [[0.05, 0.52], [0.6, 0.6], [0.6, 0.66], [0.05, 0.58]]);
    }
    // control panel: joystick and buttons on the panel top E -> F
    const Ep = [cx, 0.74, Z0 + 0.8], Pp = [cx, 0.78, Z0 + 0.62];
    const pan = F(Pp, [1, 0, 0], nrm(sub(Ep, Pp))); // normal up (and a little forward)
    const pn = pan.N[1] > 0 ? pan.N : mul(pan.N, -1);
    const P0 = at2(pan, -0.16, 0.09, 0);
    rod("dark", sub(P0, mul(pn, 0.01)), add(P0, mul(pn, 0.075)), 0.009, 6);
    sphere("pink", add(P0, mul(pn, 0.09)), 0.028);
    for (const [u, key] of [[0.02, "pink"], [0.1, "amber"], [0.18, "pink"]]) {
      const B = at2(pan, u, 0.09, 0);
      rod(key, sub(B, mul(pn, 0.005)), add(B, mul(pn, 0.016)), 0.022, 10);
    }
    // stool
    const sz = Z0 + 1.22;
    rod("dark", [cx, FT, sz], [cx, 0.05, sz], 0.19, 14);
    rod("dark", [cx, 0.05, sz], [cx, 0.43, sz], 0.03, 6);
    rod("pink", [cx, 0.42, sz], [cx, 0.5, sz], 0.18, 14);
    // neon on the back wall above
    if (i % 2) decal("glowL", backF, star(cx, 1.95, 0.17), 0.006);
    else ring("glowA", backF, cx, 1.95, 0.12, 0.16, 18, 0.006);
    anchor(`cab${i}`, cx, FT, Z0 + 0.8);
  }

  // ---------- rhythm-game drum cabinet ----------
  {
    const dcx = (DX0 + DX1) / 2, hw = 0.55;
    const PRO = [[0, 0], [0.7, 0], [0.7, 1.0], [0.6, 1.05], [0.6, 1.8], [0.74, 1.88], [0.74, 2.1], [0, 2.1]];
    prism("amber", PRO, (zl, y, x) => [x, y, Z0 + zl], DX0, DX1);
    const fr = F([dcx, 0, Z0 + 0.6], [1, 0, 0], [0, 1, 0]);
    decal("hole", fr, rect(-0.47, 1.1, 0.47, 1.76));
    decal("screen", fr, rect(-0.43, 1.14, 0.43, 1.72), 0.007);
    slot(fr, rect(-0.41, 1.16, 0.41, 1.25), 0);
    slot(fr, circ(-0.24, 1.47, 0.12, 16), 1);
    slot(fr, rect(-0.05, 1.38, 0.38, 1.44), 2);
    slot(fr, circ(0.16, 1.58, 0.07, 12), 0);
    slot(fr, star(0.33, 1.6, 0.08), 1);
    const hood = F([dcx, 0, Z0 + 0.74], [1, 0, 0], [0, 1, 0]);
    decal("glowA", hood, rect(-0.5, 1.93, 0.5, 2.05));
    const low = F([dcx, 0, Z0 + 0.7], [1, 0, 0], [0, 1, 0]);
    for (const s of [-1, 1]) { decal("hole", low, circ(s * 0.34, 0.78, 0.11, 14)); ring("glowP", low, s * 0.34, 0.78, 0.11, 0.135, 14); }
    // stand and drums
    const sz0 = Z0 + 0.7, sz1 = Z0 + 1.28;
    box("dark", DX0 + 0.04, DX1 - 0.04, FT, 0.62, sz0, sz1);
    const standF = F([dcx, 0, sz1], [1, 0, 0], [0, 1, 0]);
    decal("glowP", standF, rect(-0.5, 0.5, 0.5, 0.55));
    const d = nrm([0, 0.3, 0.95]);
    for (const s of [-1, 1]) {
      const C = [dcx + s * 0.26, 0.8, Z0 + 1.02];
      rod("pink", sub(C, mul(d, 0.17)), add(C, mul(d, 0.15)), 0.22, 18);
      rod("dark", add(C, mul(d, 0.12)), add(C, mul(d, 0.16)), 0.228, 18);
      rod("pale", add(C, mul(d, 0.155)), add(C, mul(d, 0.172)), 0.2, 18);
      for (const k of [-1, 1]) rod("pale", [C[0] + k * 0.16, 0.12, sz1 + 0.014], [C[0] + k * 0.17, 0.46, sz1 + 0.03], 0.013, 6);
    }
    anchor("drum", dcx, FT, sz1);
  }

  // ---------- purikura booths (against -X, opening toward +X) ----------
  const BX1 = X0 + 1.5, BW = 1.2;
  [Z0 + 0.12 + BW / 2, Z0 + 0.12 + BW * 1.5 + 0.1].forEach((zc, b) => {
    const z0 = zc - BW / 2, z1 = zc + BW / 2;
    box("pink", X0, BX1, FT, 2.25, z0, z1);
    box("pink", BX1, BX1 + 0.16, 1.98, 2.25, z0, z1); // canopy
    const can = F([BX1 + 0.16, 0, zc], [0, 0, -1], [0, 1, 0]); // normal +X
    decal("glowL", can, rect(-0.54, 2.01, 0.54, 2.22));
    slot(can, star(-0.36, 2.115, 0.08), b, 0.008);
    slot(can, circ(0, 2.115, 0.07, 12), b + 1, 0.008);
    slot(can, star(0.36, 2.115, 0.08), b + 2, 0.008);
    const face = F([BX1, 0, zc], [0, 0, -1], [0, 1, 0]);
    decal("hole", face, rect(-0.48, 0.02, 0.48, 0.42));
    // curtain: a folded slab hanging under the canopy, profile in (z, x) extruded over y
    const prof = [], NF = 32, x0c = BX1 + 0.012;
    for (let k = 0; k <= NF; k++) prof.push([zc - 0.5 + k / NF, x0c + 0.03 + 0.025 * Math.cos((k / NF) * TAU * 4)]);
    prof.push([zc + 0.5, x0c], [zc - 0.5, x0c]);
    prism("cream", prof, (zz, xx, y) => [xx, y, zz], 0.38, 1.98);
    anchor(`booth${b}`, BX1 + 0.1, FT, zc);
    if (b === 1) { // a big lit poster of colour blocks on the +Z side
      const side = F([0, 0, z1], [1, 0, 0], [0, 1, 0]);
      const u0 = X0 + 0.2, u1 = BX1 - 0.2;
      decal("glowL", side, rect(u0, 0.7, u1, 1.95));
      decal("glowA", side, circ(u0 + 0.36, 1.45, 0.24, 18), 0.007);
      decal("glowP", side, star(u0 + 0.8, 1.15, 0.2), 0.007);
      decal("glowA", side, rect(u0 + 0.1, 0.8, u1 - 0.1, 0.9), 0.007);
      decal("glowP", side, rect(u0 + 0.75, 1.62, u1 - 0.12, 1.84), 0.007);
    }
  });

  // ---------- change machine (against -X near the open front) ----------
  {
    const z0 = Z1 - 0.62, z1 = Z1 - 0.12, zc = (z0 + z1) / 2, x1 = X0 + 0.42;
    box("dark", X0, x1 - 0.02, FT, 0.1, z0 + 0.02, z1 - 0.02);
    box("amber", X0, x1, 0.1, 1.6, z0, z1);
    const fr = F([x1, 0, zc], [0, 0, -1], [0, 1, 0]);
    decal("hole", fr, rect(-0.19, 0.5, 0.19, 1.3));
    decal("glowL", fr, rect(-0.12, 1.12, 0.12, 1.16), 0.007);
    decal("glowA", fr, circ(0.0, 0.92, 0.05, 12), 0.007);
    decal("glowP", fr, rect(-0.13, 0.72, 0.13, 0.76), 0.007);
    box("dark", x1, x1 + 0.08, 0.3, 0.42, zc - 0.14, zc + 0.14); // coin tray
    box("glowA", x1, x1 + 0.006, 1.38, 1.56, z0 + 0.03, z1 - 0.03);
    const sign = F([x1 + 0.006, 0, zc], [0, 0, -1], [0, 1, 0]);
    decal("glowP", sign, circ(0, 1.47, 0.065, 14), 0.003);
    ring("glowL", sign, 0, 1.47, 0.04, 0.05, 14, 0.005);
    anchor("change", x1 + 0.1, FT, zc);
  }

  // ---------- ceiling-light grid, fixed to the walls ----------
  {
    const y0 = 2.6, y1 = 2.66, bw = 0.035;
    const nz = 3, nx = Math.max(3, Math.round((X1 - X0) / 1.0));
    const zs = Array.from({ length: nz + 1 }, (_, k) => Z0 + ((Z1 - Z0) * k) / nz);
    const xs = Array.from({ length: nx + 1 }, (_, k) => X0 + ((X1 - X0) * k) / nx);
    for (const z of zs.slice(1)) box("dark", X0, X1, y0, y1, z - bw, z);
    for (const x of xs.slice(1)) box("dark", Math.min(x, X1 - bw) - bw, Math.min(x, X1 - bw), y0, y1, Z0, Z1 - bw);
    for (const z of zs.slice(1, -1)) box("dark", X0, X0 + 0.1, y0 - 0.12, y1, z - bw - 0.03, z + 0.03); // wall brackets
    for (const x of xs.slice(1, -1)) box("dark", x - bw - 0.03, x + 0.03, y0 - 0.12, y1, Z0, Z0 + 0.1);
    for (let i = 0; i < nx; i++)
      for (let k = 0; k < nz; k++) {
        const xm = (xs[i] + xs[i + 1]) / 2, zm = (zs[k] + zs[k + 1]) / 2, h = 0.26;
        box("dark", xm - h, xm + h, y0 - 0.03, y0, zm - h, zm + h);
        box("glowL", xm - h + 0.03, xm + h - 0.03, y0 - 0.034, y0 - 0.03, zm - h + 0.03, zm + h - 0.03);
      }
  }

  // centre the footprint on x = z = 0
  const lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (const { p } of Object.values(soups))
    for (let i = 0; i < p.length; i += 3)
      for (const [k, j] of [[0, 0], [1, 2]]) (lo[k] = Math.min(lo[k], p[i + j])), (hi[k] = Math.max(hi[k], p[i + j]));
  const shift = [-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2];
  set.position.set(shift[0] * set.scale.x, 0, shift[1] * set.scale.x);
  anchor("floor", -shift[0], FT, -shift[1]);

  // ---------- meshes: one per material ----------
  const MAT = { // [base, shade, threshold, ink px (0 = no hull)]
    wall: [c.wall, c.wall, 0.1, 2],
    carpet: [c.carpet, c.carpetShade, 0.1, 2],
    dark: [c.dark, c.darkShade, 0.1, 2],
    pale: [c.pale, c.paleShade, 0.1, 2],
    pink: [c.pink, c.pinkShade, 0.1, 2],
    amber: [c.amber, c.amberShade, 0.1, 2],
    cream: [c.cream, c.creamShade, 0.5, 2],
    glowA: [c.glowA, c.glowA, -1, 0],
    glowP: [c.glowP, c.glowP, -1, 0],
    glowL: [c.glowL, c.glowL, -1, 0],
    hole: [c.hole, c.hole, -1, 0],
    screen: [c.screen, c.screen, -1, 0],
  };
  const geos = {}, orig = {};
  for (const [key, s] of Object.entries(soups)) {
    const [base, shade, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(s.p), 3));
    g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(s.n), 3));
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    set.add(mesh);
    geos[key] = g;
    if (GLOW.includes(key)) orig[key] = new Float32Array(s.p);
  }

  // ---------- poses and the attract clip ----------
  // Beat f (0..2): a slot shows glow colour (f + phase) mod 3; three beats return every slot to its start, so it loops.
  const CLIPS = { attract: 1.5 };
  function apply(f) {
    for (const { key, k, phase, s, e } of slots) {
      const pos = geos[key].attributes.position.array, src = orig[key];
      if ((f + phase) % 3 === k) pos.set(src.subarray(s, e), s);
      else for (let i = s; i < e; i += 3) (pos[i] = src[s]), (pos[i + 1] = src[s + 1]), (pos[i + 2] = src[s + 2]);
    }
    for (const key of GLOW) {
      const g = geos[key];
      if (!g) continue;
      g.attributes.position.needsUpdate = true;
      g.computeBoundingSphere();
      g.computeBoundingBox();
    }
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`game-center: no clip "${m[1]}" (clips: attract)`);
      const L = CLIPS[m[1]], t = ((+m[2] % L) + L) % L;
      return apply(Math.floor(t / 0.5) % 3);
    }
    if (name !== "rest") throw new Error(`game-center: unknown pose "${name}" (rest, or attract@<seconds>)`);
    apply(0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
