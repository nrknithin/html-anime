// grand-piano.js - a concert grand piano with its bench, the school music room's centrepiece; static, lid on its stick.
// Contract: harness/lab/README.md. Meters, +Y up, the keyboard faces +Z (the pianist sits at +Z, facing -Z), the
// model's left is +X (the curved bentside, toward the audience and the light), stands on y = 0, centred on x = 0,
// z = 0 at the piano (the bench adds 0.7 m in front).
//
// Construction (one plan outline, extruded and inset; boxes and capped cylinders; all triangle soups merged per
// material, so the whole set is ten meshes):
//   CASE    the plan outline: a straight front at z = +0.88, a short straight treble cheek on +X, the bentside (a
//           convex knuckle, then the long concave curve in toward the tail), the round tail, the straight spine on -X.
//           A centripetal Catmull-Rom through literal points, so the curve is one table. The rim is its outer wall
//           (smooth normals along the curve: the lacquer's light band slides round the bentside), a 5 cm top ring and
//           an inner wall down to the soundboard; a bottom plate closes it. Every cap is triangulated from the outline
//           (ShapeUtils, no holes), every wall wound along its outward normal, never by hand.
//   INSIDE  the spruce soundboard (the inner outline), the gilded iron plate on it (a slab; its one big opening is a
//           soundboard-coloured decal on top, behind the front block), a damper bar, and the strings: white strips
//           from the front block back to the plate's far edge.
//   LID     the outline clipped behind the music desk, 2.5 cm thick, hinged on the spine (joint `lid`, rotates about
//           z); the stick (joint `stick`) stands on the bentside rim and is solved to touch the lid's underside, so
//           any `lid` value reads as propped; closed, it lies flat inside the rim.
//   FRONT   keybed and cheek blocks, the fallboard, a tilted music desk with its ledge. 88 keys: the white keys are
//           ONE box with a dark groove strip at every white-key joint (top and front), the 36 black keys raised boxes
//           on every white joint except E-F and B-C, so they fall in twos and threes.
//   UNDER   three tapered legs (two at the cheeks, one at the tail) on brass caster cups and wheels; the lyre: two
//           posts, four lyre rods, a pedal box with three brass pedals and a back brace to the case.
//   BENCH   a lacquer frame on four tapered legs and a bevelled pad.
// Proportions (real size; base unit the case width W = 1.56 m): length 2.12 m over the keys (1.36 W), rim top
// 1.0 m, case depth 0.36, key tops 0.72, keyboard 1.22 m (52 white keys at 23.5 mm), black keys 13.7 x 95 mm and
// 12 mm proud, white key fronts 32 mm, lid propped at 36 deg (far corner 1.95 m), music desk to 1.30,
// bench seat 0.55 m high, 0.47 m in front of the keys.
// Options: build(THREE, kit, colors, { height, lid, bench }).
//   lid     0 (closed) .. 1 (full stick, 36 deg), default 1.  bench  true (default) or false.
//   height  scales everything so the top at rest is `height` (default: the natural top for that lid value).
// Colours (festival): lacquer sky #24143a / hair #1a1020 at threshold 0.45, so it is near-black shade with the
// lighter sky band only where the surface faces the light (the +X cheek and the bentside's knuckle, the rim and
// key-bed tops): hair is the shade, still lighter than ink #140c1c. Gloss: white sclera #f6f3ee streaks (flat, no
// hull), two diagonals on each face of the lid, three vertical ones on the bentside wall. White keys and strings
// sclera / skin #f0c2ae, key grooves hair (flat, no hull); black keys sky / hair; soundboard iris #ffd0a1 / skin;
// gold (iron plate, pedals, casters) moon #ffd7a1 / practical #ffb020 at threshold 0.75, so flat gold is practical
// and only the caster wheels catch a moon glint; bench pad accent #ff4d6d / sky.
// Meshes: lacquer, lid, stick, gloss, keys, groove, black, board, gold, pad (ten; about 2.5k triangles).
// Note: the straight side (spine) is the bass side, on the pianist's left (-X); the bentside is the treble side.

export const meta = {
  name: "grand-piano",
  height: 1.951,
  script: "festival",
  colors: {
    lacquer: "#24143a", lacquerShade: "#1a1020",
    keys: "#f6f3ee", keysShade: "#f0c2ae",
    groove: "#1a1020", grooveShade: "#1a1020",
    black: "#24143a", blackShade: "#1a1020",
    board: "#ffd0a1", boardShade: "#f0c2ae",
    gold: "#ffd7a1", goldShade: "#ffb020",
    gloss: "#f6f3ee",
    pad: "#ff4d6d", padShade: "#24143a",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const lidOpen = Math.min(1, Math.max(0, opts.lid ?? 1));
  const withBench = opts.bench ?? true;
  const root = new THREE.Group();
  root.name = "grand-piano";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  root.add(body);

  // ---------- triangle soups with normals ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  // one triangle wound so its face normal points along `dir`; per-vertex normals, or the face normal
  function tri(key, a, b, e, dir, na, nb, ne) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const flip = dot(n, dir) < 0;
    n = nrm(flip ? mul(n, -1) : n);
    const s = S(key);
    const [B, NB, E, NE] = flip ? [e, ne, b, nb] : [b, nb, e, ne];
    for (const [q, qn] of [[a, na], [B, NB], [E, NE]]) s.p.push(...q), s.n.push(...(qn ?? n));
  }
  const quad = (key, a, b, e, d, dir, na, nb, ne, nd) => (tri(key, a, b, e, dir, na, nb, ne), tri(key, a, e, d, dir, na, ne, nd));
  // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order; wound away from its centre
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]) {
      const m = mul(add(add(p[f[0]], p[f[1]]), add(p[f[2]], p[f[3]])), 0.25);
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], sub(m, ref));
    }
  }
  const box = (key, x0, x1, y0, y1, z0, z1) =>
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  // a tapered square leg: half-widths a (top) and b (bottom), centred on (x, z)
  const taper = (key, x, z, y0, y1, b, a) =>
    hex(key, [[x - b, y0, z - b], [x + b, y0, z - b], [x + b, y0, z + b], [x - b, y0, z + b], [x - a, y1, z - a], [x + a, y1, z - a], [x + a, y1, z + a], [x - a, y1, z + a]]);
  // a capped cylinder from A to B, radius r, smooth sides
  function cyl(key, A, B, r, sides = 10) {
    const T = nrm(sub(B, A)), h = Math.abs(T[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u = nrm(cross(T, h)), w = cross(T, u);
    const ring = (P) => Array.from({ length: sides }, (_, j) => {
      const a = (j / sides) * Math.PI * 2, d = add(mul(u, Math.cos(a)), mul(w, Math.sin(a)));
      return { q: add(P, mul(d, r)), n: d };
    });
    const R0 = ring(A), R1 = ring(B);
    for (let j = 0; j < sides; j++) {
      const k = (j + 1) % sides, d = add(R0[j].n, R0[k].n);
      quad(key, R0[j].q, R0[k].q, R1[k].q, R1[j].q, d, R0[j].n, R0[k].n, R1[k].n, R1[j].n);
    }
    for (const [R, s] of [[R0, -1], [R1, 1]])
      for (let j = 1; j < sides - 1; j++) tri(key, R[0].q, R[j].q, R[j + 1].q, mul(T, s));
  }

  // ---------- plan polygons [x, z] ----------
  const area = (P) => P.reduce((s, q, i) => { const r = P[(i + 1) % P.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0) / 2;
  // outward unit normal of each edge i (P[i] -> P[i+1])
  const edgeN = (P) => {
    const sg = area(P) > 0 ? 1 : -1;
    return P.map((q, i) => {
      const r = P[(i + 1) % P.length], dx = r[0] - q[0], dz = r[1] - q[1], l = Math.hypot(dx, dz);
      return [(sg * dz) / l, (-sg * dx) / l];
    });
  };
  // inward offset by d (negative: outward), mitred
  function offset(P, d) {
    const N = edgeN(P), L = P.length;
    return P.map((q, i) => {
      const n1 = N[(i - 1 + L) % L], n2 = N[i];
      let m = [n1[0] + n2[0], n1[1] + n2[1]];
      const ml = Math.hypot(...m);
      m = [m[0] / ml, m[1] / ml];
      const k = d / Math.max(0.3, m[0] * n2[0] + m[1] * n2[1]);
      return [q[0] - m[0] * k, q[1] - m[1] * k];
    });
  }
  // keep the part with z <= zc (Sutherland-Hodgman, one half-plane)
  function clipZ(P, zc) {
    const out = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length], ia = a[1] <= zc, ib = b[1] <= zc;
      if (ia) out.push(a);
      if (ia !== ib) {
        const t = (zc - a[1]) / (b[1] - a[1]);
        out.push([a[0] + t * (b[0] - a[0]), zc]);
      }
    }
    return out;
  }
  // where a line z = const or x = const crosses the outline: all crossings of the free coordinate
  const crossings = (P, axis, v) => {
    const o = 1 - axis, hits = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      if ((a[axis] - v) * (b[axis] - v) <= 0 && a[axis] !== b[axis]) hits.push(a[o] + ((v - a[axis]) / (b[axis] - a[axis])) * (b[o] - a[o]));
    }
    return hits;
  };
  const rightX = (P, z) => Math.max(...crossings(P, 1, z));
  const backZ = (P, x) => Math.min(...crossings(P, 0, x));

  // vertical wall along a closed outline, y0..y1, facing out (sgn 1) or in (-1); smooth normals except at corners
  function wall(key, P, y0, y1, sgn = 1) {
    const N = edgeN(P), L = P.length;
    const vn = (i, e) => { // the normal at vertex i for edge e (e is i or i - 1)
      const n1 = N[(i - 1 + L) % L], n2 = N[i];
      if (n1[0] * n2[0] + n1[1] * n2[1] < 0.8) return N[e];
      const m = [n1[0] + n2[0], n1[1] + n2[1]], l = Math.hypot(...m);
      return [m[0] / l, m[1] / l];
    };
    for (let i = 0; i < L; i++) {
      const j = (i + 1) % L, a = P[i], b = P[j];
      const na = vn(i, i), nb = vn(j, i), f = N[i];
      const A3 = [na[0] * sgn, 0, na[1] * sgn], B3 = [nb[0] * sgn, 0, nb[1] * sgn];
      quad(key, [a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], [f[0] * sgn, 0, f[1] * sgn], A3, B3, B3, A3);
    }
  }
  // flat cap of a simple outline at height y, facing up (1) or down (-1). No holes: earcut left slivers with them.
  function cap(key, P, y, up) {
    const C = P.map((q) => new THREE.Vector2(q[0], q[1])); // triangulateShape drops a duplicate end point in place
    for (const f of THREE.ShapeUtils.triangulateShape(C, [])) {
      const [a, b, e] = f.map((i) => [C[i].x, y, C[i].y]);
      tri(key, a, b, e, [0, up, 0]);
    }
  }
  const slab = (key, P, y0, y1) => (cap(key, P, y1, 1), cap(key, P, y0, -1), wall(key, P, y0, y1, 1));

  // ---------- the case outline ----------
  const curve = new THREE.CatmullRomCurve3(
    [[0.78, 0.55], [0.78, 0.45], [0.755, 0.33], [0.7, 0.22], [0.52, 0.02], [0.36, -0.22], [0.25, -0.5], [0.17, -0.76],
      [0.08, -0.94], [-0.06, -1.03], [-0.33, -1.07], [-0.6, -1.05], [-0.75, -0.96], [-0.78, -0.86], [-0.78, -0.76]].map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false, "centripetal");
  const pts = curve.getPoints(52).map((v) => [v.x, v.z]);
  const P = [[-0.78, 0.88], [0.78, 0.88], ...pts]; // the spine closes back to the front-left corner
  const RIM = 1.0, BOT = 0.64, BOARD = 0.88;
  const inner = offset(P, 0.05);

  // rim: outer wall, top ring, inner wall, bottom; soundboard
  wall("lacq", P, BOT, RIM, 1);
  for (let i = 0; i < P.length; i++) { // the top ring: inner is P offset point for point, so quads match up
    const j = (i + 1) % P.length;
    quad("lacq", [P[i][0], RIM, P[i][1]], [P[j][0], RIM, P[j][1]], [inner[j][0], RIM, inner[j][1]], [inner[i][0], RIM, inner[i][1]], [0, 1, 0]);
  }
  wall("lacq", inner, BOARD, RIM, -1);
  cap("lacq", P, BOT, -1);
  cap("board", inner, BOARD, 1);
  // plate: a gilded slab over the soundboard; its big opening behind the front block is a soundboard-coloured
  // decal on it (no hull), so the plate is one simple polygon
  slab("gold", offset(P, 0.075), BOARD, 0.925);
  cap("board", clipZ(offset(P, 0.19), 0.36), 0.9265, 1);
  // strings: flat strips from the front block back to the plate's far edge
  const plateIn = offset(P, 0.11);
  for (let x = -0.67; x <= 0.6; x += 0.032) {
    const zb = backZ(plateIn, x), w = 0.0022;
    quad("keys", [x - w, 0.94, 0.72], [x + w, 0.94, 0.72], [x + w, 0.94, zb], [x - w, 0.94, zb], [0, 1, 0]);
  }
  // pins/dampers row: a lacquer bar across the front block
  box("lacq", -0.66, 0.66, 0.925, 0.95, 0.6, 0.66);

  // ---------- front: keybed, cheeks, fallboard, music desk ----------
  const KW = 0.611, KT = 0.72;
  box("lacq", -0.78, 0.78, 0.62, 0.688, 0.86, 1.035); // keybed
  for (const s of [-1, 1]) box("lacq", s > 0 ? KW + 0.002 : -0.78, s > 0 ? 0.78 : -KW - 0.002, 0.62, 0.785, 0.86, 1.07); // cheek blocks
  box("lacq", -KW, KW, 0.742, 0.84, 0.865, 0.905); // fallboard (closed over the key backs)
  // white keys: one strip, grooves at every white-key joint
  const WK = (2 * KW) / 52;
  box("keys", -KW, KW, 0.688, KT, 0.88, 1.05);
  for (let i = 1; i < 52; i++) {
    const x = -KW + i * WK, g = 0.0016;
    quad("groove", [x - g, KT + 0.0006, 0.905], [x + g, KT + 0.0006, 0.905], [x + g, KT + 0.0006, 1.05], [x - g, KT + 0.0006, 1.05], [0, 1, 0]);
    quad("groove", [x - g, 0.688, 1.0506], [x + g, 0.688, 1.0506], [x + g, KT, 1.0506], [x - g, KT, 1.0506], [0, 0, 1]);
  }
  // black keys: notes A0..C8, pitch class (n + 9) % 12; a black key sits on the joint after the white key below it
  let white = 0;
  for (let n = 0; n < 88; n++) {
    const pc = (n + 9) % 12;
    if ([1, 3, 6, 8, 10].includes(pc)) {
      const x = -KW + white * WK, bw = 0.0068;
      hex("black", [[x - bw, KT, 0.905], [x + bw, KT, 0.905], [x + bw, KT, 1.0], [x - bw, KT, 1.0],
        [x - bw * 0.8, KT + 0.012, 0.905], [x + bw * 0.8, KT + 0.012, 0.905], [x + bw * 0.8, KT + 0.012, 0.995], [x - bw * 0.8, KT + 0.012, 0.995]]);
    } else white++;
  }
  // music desk: a board tilted back 14 deg on the front block, with a ledge
  {
    const t = (14 * Math.PI) / 180, z0 = 0.7, y0 = 0.95, h = 0.36, th = 0.022, W = 0.4;
    const up = [0, Math.cos(t), -Math.sin(t)], bk = [0, Math.sin(t), Math.cos(t)];
    const at = (x, v, d) => [x, y0 + up[1] * v - bk[1] * d, z0 + up[2] * v - bk[2] * d];
    hex("lacq", [at(-W, 0, 0), at(W, 0, 0), at(W, 0, th), at(-W, 0, th), at(-W, h, 0), at(W, h, 0), at(W, h, th), at(-W, h, th)]);
    box("lacq", -W, W, y0 + 0.07, y0 + 0.09, z0 - 0.02, z0 + 0.045); // ledge
  }

  // ---------- legs, casters, lyre ----------
  const legAt = [[-0.64, 0.74], [0.64, 0.74], [-0.42, -0.8]];
  for (const [x, z] of legAt) {
    taper("lacq", x, z, 0.075, BOT - 0.04, 0.038, 0.062);
    box("lacq", x - 0.08, x + 0.08, BOT - 0.05, BOT, z - 0.08, z + 0.08); // leg block
    cyl("gold", [x, 0.062, z], [x, 0.09, z], 0.048, 12); // caster cup
    cyl("gold", [x - 0.018, 0.034, z + 0.012], [x + 0.018, 0.034, z + 0.012], 0.034, 12); // wheel
  }
  const LZ = 0.6;
  for (const s of [-1, 1]) box("lacq", s * 0.13 - 0.022, s * 0.13 + 0.022, 0.17, BOT, LZ - 0.025, LZ + 0.025); // lyre posts
  for (const x of [-0.06, -0.02, 0.02, 0.06]) box("lacq", x - 0.006, x + 0.006, 0.18, BOT - 0.05, LZ - 0.008, LZ + 0.008); // lyre rods
  box("lacq", -0.2, 0.2, 0.06, 0.18, LZ - 0.06, LZ + 0.06); // pedal box
  cyl("lacq", [0, 0.15, LZ - 0.05], [0, BOT, 0.18], 0.016, 8); // lyre brace
  for (const x of [-0.07, 0, 0.07]) {
    box("gold", x - 0.013, x + 0.013, 0.095, 0.11, LZ + 0.06, LZ + 0.12);
    box("gold", x - 0.018, x + 0.018, 0.088, 0.112, LZ + 0.12, LZ + 0.165); // the foot
  }

  // ---------- bench ----------
  if (withBench) {
    const BZ = 1.52, BX = 0.38, BD = 0.18, SY = 0.46;
    box("lacq", -BX, BX, SY - 0.06, SY, BZ - BD, BZ + BD); // apron
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) taper("lacq", sx * (BX - 0.04), BZ + sz * (BD - 0.04), 0, SY - 0.06, 0.022, 0.032);
    // pad: a slab with a bevelled top
    const R = [[-BX - 0.005, BZ - BD - 0.005], [BX + 0.005, BZ - BD - 0.005], [BX + 0.005, BZ + BD + 0.005], [-BX - 0.005, BZ + BD + 0.005]];
    const Ri = offset(R, 0.03), y1 = SY + 0.06, y2 = SY + 0.085;
    cap("pad", R, SY, -1), wall("pad", R, SY, y1, 1), cap("pad", Ri, y2, 1);
    const N = edgeN(R);
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4, f = N[i], d = [f[0] * 0.6, 0.8, f[1] * 0.6];
      quad("pad", [R[i][0], y1, R[i][1]], [R[j][0], y1, R[j][1]], [Ri[j][0], y2, Ri[j][1]], [Ri[i][0], y2, Ri[i][1]], d);
    }
  }

  // ---------- lid and stick (their own pivots) ----------
  const HINGE = [-0.79, RIM]; // the lid hinge runs along z on top of the spine
  const lidPlan = clipZ(offset(P, -0.012), 0.56);
  slab("lid", lidPlan.map(([x, z]) => [x - HINGE[0], z]), 0, 0.025);
  const SZ = -0.05, SB = [rightX(inner, SZ) - 0.035, RIM - 0.015]; // stick foot on the bentside, just inside the rim
  const tipT = rightX(P, SZ) + 0.012 - HINGE[0] - 0.08; // the stick tip's distance from the hinge along the lid
  // gloss: two white streaks across each face of the lid, and two up the bentside wall where it faces the hero camera
  {
    const streak = (key, a, b, w, y, f) => { // a parallelogram from plan point a to b (lid frame), w wide across x
      quad(key, [a[0] - w, y, a[1]], [a[0] + w, y, a[1]], [b[0] + w, y, b[1]], [b[0] - w, y, b[1]], [0, f, 0]);
    };
    for (const [y, f] of [[-0.002, -1], [0.027, 1]]) {
      streak("gloss", [0.55, 0.47], [0.97, -0.45], 0.03, y, f);
      streak("gloss", [0.68, 0.47], [1.06, -0.3], 0.01, y, f);
    }
    const N = edgeN(P);
    const strip = (z, w) => { // a vertical strip on the outer wall around the outline point nearest plan z on the bentside
      let i = 2;
      for (let k = 2; k < P.length; k++) if (Math.abs(P[k][1] - z) < Math.abs(P[i][1] - z)) i = k;
      const n = N[i], a = P[i], b = P[i + 1], t = w / Math.hypot(b[0] - a[0], b[1] - a[1]);
      const e = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], o = 0.002;
      const q = (p, y) => [p[0] + n[0] * o, y, p[1] + n[1] * o];
      quad("keys", q(a, BOT + 0.05), q(e, BOT + 0.05), q(e, RIM - 0.05), q(a, RIM - 0.05), [n[0], 0, n[1]]);
    };
    strip(0.3, 0.035), strip(0.22, 0.012), strip(-0.2, 0.03);
  }
  box("stick", -0.012, 0.012, 0, 1, -0.014, 0.014); // unit length, scaled in pose

  const joints = {};
  const groups = { lid: new THREE.Group(), stick: new THREE.Group() };
  const parentOf = { lid: "lid", gloss: "lid", stick: "stick" };
  groups.lid.position.set(HINGE[0], HINGE[1], 0);
  groups.stick.position.set(SB[0], SB[1], SZ);
  for (const [k, g] of Object.entries(groups)) (g.name = k), (joints[k] = g), body.add(g);

  // ---------- meshes: one per material ----------
  const MAT = {
    lacq: [c.lacquer, c.lacquerShade, 0.45, 3],
    lid: [c.lacquer, c.lacquerShade, 0.45, 3],
    stick: [c.lacquer, c.lacquerShade, 0.45, 2],
    keys: [c.keys, c.keysShade, 0.1, 2],
    groove: [c.groove, c.grooveShade, 0.1, 0],
    black: [c.black, c.blackShade, 0.3, 1],
    board: [c.board, c.boardShade, 0.2, 0],
    gold: [c.gold, c.goldShade, 0.75, 2],
    gloss: [c.gloss, c.gloss, 0, 0],
    pad: [c.pad, c.padShade, 0.1, 3],
  };
  for (const [key, { p, n }] of Object.entries(soups)) {
    const [base, shade, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    (groups[parentOf[key]] ?? body).add(mesh);
  }

  // ---------- pose: the lid angle from opts.lid, the stick solved to its underside ----------
  // Signs: lid.rotation.z > 0 lifts its +X (bentside) edge about the spine hinge. The stick's local +Y points along
  // its length; rotation.z = phi - 90 deg points it at angle phi from +X in the x-y plane.
  const theta = lidOpen * ((36 * Math.PI) / 180);
  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    groups.lid.rotation.set(0, 0, theta);
    const st = groups.stick;
    if (theta > (3 * Math.PI) / 180) {
      const T = [HINGE[0] + tipT * Math.cos(theta), HINGE[1] + tipT * Math.sin(theta)];
      const d = [T[0] - SB[0], T[1] - SB[1]];
      st.rotation.set(0, 0, Math.atan2(d[1], d[0]) - Math.PI / 2);
      st.scale.set(1, Math.hypot(...d) - 0.02, 1); // stops just under the lid, so no corner pokes through
    } else {
      st.rotation.set(0, 0, Math.PI / 2); // folded flat inside the rim, pointing at the spine
      st.scale.set(1, 0.6, 1);
    }
    root.updateMatrixWorld(true);
  }
  pose("rest");
  if (opts.height) body.scale.setScalar(opts.height / new THREE.Box3().setFromObject(root).max.y);
  root.updateMatrixWorld(true);
  return { root, joints, pose };
}
