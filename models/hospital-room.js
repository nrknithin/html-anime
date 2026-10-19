// hospital-room.js - a single hospital room, the quiet set of every anime bedside scene, static but for the bed's
// backrest, at real size: a set piece.
// Contract: harness/lab/README.md. Meters, +Y up, the open (cutaway) sides face +X and +Z, so the lab's front-left
// cameras look in; the bed's head is on the -X wall and the large window on the -Z wall, beside the bed, so the patient
// looks out of it and the visitor sits on the +Z side. Floor on y = 0, centred on x = z = 0.
//
// Construction (boxes, capped tubes, superellipsoid cushions, lathes and pleated lofts, all triangle soups merged per
// material, so the room is about a dozen meshes; boxes are flat-shaded, cushions and tubes carry smooth normals).
// Every triangle is wound away from a point inside its solid (box centre, tube axis, cushion centre, lathe axis, loft
// column), never by hand.
//   SHELL     floor quad with a pale tile grid; walls as boxes 12 cm thick, the window wall cut into a sill wall, a
//             lintel and two piers. Dark skirting bands; where the cutaway leaves a wall top open it gets a dark section
//             cap. With { cutaway: false } the +X wall (a pale-green sliding door) and the +Z wall close the room under
//             a ceiling slab with a light panel.
//   WINDOW    (-Z) 2.2 x 1.4 m: aluminium casing, two sashes on two tracks, glass as two unlined plates back to back, a
//             deep sill board; a venetian blind lowered over the top third (inked slats), two sheer panels bunched at
//             the sides (zigzag pleats whose fold faces alternate base / shade) on a rail.
//   BED       head on the -X wall: pale-green head and foot boards, a white steel frame on four legs with dark casters,
//             tube side rails on both sides of the head half. A white mattress and duvet (rounded cushions, the duvet
//             hanging over the sides, a turned-down sheet band); the backrest section (mattress + pillow) is its own
//             mesh on the joint `backrest`, pivoting where the deck folds, 0.75 m from the head.
//   AROUND    a bedside cabinet (drawer, door, dark pulls) with a green vase of red and yellow flowers and a wicker
//             basket of apples, oranges and bananas; an IV stand (five-leg base, pole, hook bar, drip bag with a blank
//             label, drip chamber, line down to the rail); an over-bed table on a one-sided castor base across the duvet
//             with a cup; a visitor chair turned to the bed; a headwall console over the bed with a blank call panel
//             (red button) and a corded handset clipped to the rail; a wall basin with a tap and a mirror.
//   CURTAIN   an L ceiling track (wall to wall, so it never floats) round the bed's foot and visitor side; the privacy
//             curtain half drawn along the foot from the window, a bunch parked at the corner, each with the white mesh
//             band at the top.
// Proportions (real size, base unit the ceiling height H = 2.6 m): interior 4.0 (x) by 5.0 (z); window sill 0.85,
//   head 2.25, x -1.7..0.5; bed 2.0 x 0.9 mattress, deck 0.47, mattress top 0.61, rails to 0.9, boards to 1.0 / 0.85;
//   cabinet 0.48 x 0.48 x 0.79; IV pole 1.95; table top 0.95; chair seat 0.45; console 1.3-1.5; basin rim 0.85.
// Options: build(THREE, kit, colors, { height, cutaway = true, incline = 0.5, evening = false }).
//   height    scales the whole room uniformly so the wall top is `height` (default 2.6 m).
//   cutaway   true (default): the +X and +Z walls and the ceiling are left out. false: the closed room.
//   incline   the backrest, 0 flat .. 1 sitting up (66 deg); the rest pose uses it. Poses "flat" and "upright" are 0 / 1.
//   evening   warm window light, same script: glass and the sheers' fold shade turn practical yellow, and the low sun
//             throws a practical patch across the floor and the duvet.
// Joint: backrest, pivot on the deck fold line; +rz would push the head down, so the rest table writes -incline * 66 deg.
// Budget: ~6.2k triangles, 13 meshes (15 in the evening: the glass and the sun patch go flat yellow, the sheers split off).
// Ink in pixels: walls, floor, wood 3; boards, cloth, steel, fruit 2 (a room is seen small: thin tubes keep their colour).
// Colours (meadow, the classroom's script), base / shade:
//   walls, ceiling            moon #f7f3e1 / sky #d7ecef, threshold 0.1 (cool shade: clean and clinical)
//   floor                     skin #f0c2ae flat (warm vinyl), tile grid sky
//   sheets, pillow, steel frames and rails, sheers, blind, drip bag, basin, console, cup   sclera #f6f3ee / sky #d7ecef
//   glass, mirror, basin bowl  sky #d7ecef one tone (evening glass practical #f2c94c)
//   bed boards, chair cushions, vase, door  line #a9d16e / iris #3f8a47
//   privacy curtain           sky #d7ecef / line #a9d16e at threshold 0.45 (pale blue folds with green shadows)
//   cabinet, table top, sill, basket  moon #f7f3e1 / skin #f0c2ae
//   leaves and stems          iris #3f8a47 / hair #2c5131
//   bands, caps, casters, pulls, cord  hair #2c5131 flat (they are lines)
//   flowers, apples, call button  accent #d9483b; flowers, oranges, bananas, evening sun  practical #f2c94c

export const meta = {
  name: "hospital-room",
  height: 2.6,
  script: "meadow",
  colors: {
    wall: "#f7f3e1", wallShade: "#d7ecef",
    floor: "#d7ecef", seam: "#f7f3e1",
    cloth: "#f6f3ee", clothShade: "#d7ecef",
    glass: "#d7ecef",
    green: "#a9d16e", greenShade: "#3f8a47",
    curtain: "#d7ecef", curtainShade: "#a9d16e",
    wood: "#f7f3e1", woodShade: "#f0c2ae",
    leaf: "#3f8a47", leafShade: "#2c5131",
    dark: "#2c5131",
    red: "#d9483b", yellow: "#f2c94c",
  },
  poses: ["rest", "flat", "upright"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const NATURAL = 2.6;
  const { height = NATURAL, cutaway = true, evening = false } = opts;
  const incline = Math.max(0, Math.min(1, opts.incline ?? 0.5));
  const root = new THREE.Group();
  root.name = "hospital-room";
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
  const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  let M = new THREE.Matrix4();
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
  function box(key, x0, x1, y0, y1, z0, z1) {
    const p = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    const ref = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  // a flat quad facing `n` (unit axis), centred on a point: glass, seams, labels, sun patches
  function plate(key, ctr, n, w, h) {
    const up = Math.abs(n[1]) > 0.5 ? [0, 0, 1] : [0, 1, 0];
    const r = nrm(cross(up, n)), u = cross(n, r);
    const P = (a, b) => add(ctr, add(mul(r, a * w / 2), mul(u, b * h / 2)));
    quad(key, P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), sub(ctr, n));
  }
  const pane = (ctr, n, w, h) => {
    plate("glass", add(ctr, mul(n, 0.001)), n, w, h);
    plate("glass", sub(ctr, mul(n, 0.001)), mul(n, -1), w, h);
  };
  // a capped tube from a to b, radius r; ends pushed out by 0.6 r so joints overlap
  function rod(key, a, b, r, sides = 6) {
    const T = nrm(sub(b, a));
    a = sub(a, mul(T, r * 0.6)), b = add(b, mul(T, r * 0.6));
    const up = Math.abs(T[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = nrm(cross(up, T)), w = cross(T, u);
    const ring = (P) => Array.from({ length: sides }, (_, j) => {
      const t = (j / sides) * Math.PI * 2, d = add(mul(u, Math.cos(t)), mul(w, Math.sin(t)));
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
  const path = (key, pts, r, sides) => { for (let i = 0; i + 1 < pts.length; i++) rod(key, pts[i], pts[i + 1], r, sides); };
  // superellipsoid cushion at ctr with half-sizes r; e < 1 squares it (0.25 a mattress, 1 an ellipsoid)
  function blob(key, ctr, r, e = 1, nu = 12, nv = 8) {
    const sp = (x, p) => Math.sign(x) * Math.abs(x) ** p;
    const pt = (i, j) => {
      const v = -Math.PI / 2 + (Math.PI * i) / nv, u = (2 * Math.PI * j) / nu;
      const cv = Math.cos(v), sv = Math.sin(v), cu = Math.cos(u), su = Math.sin(u);
      return {
        q: add(ctr, [r[0] * sp(cv, e) * sp(cu, e), r[1] * sp(sv, e), r[2] * sp(cv, e) * sp(su, e)]),
        n: nrm([sp(cv, 2 - e) * sp(cu, 2 - e) / r[0], sp(sv, 2 - e) / r[1], sp(cv, 2 - e) * sp(su, 2 - e) / r[2]]),
      };
    };
    for (let i = 0; i < nv; i++)
      for (let j = 0; j < nu; j++) {
        const a = pt(i, j), b = pt(i, j + 1), d = pt(i + 1, j + 1), f = pt(i + 1, j);
        tri(key, a.q, b.q, d.q, ctr, a.n, b.n, d.n);
        tri(key, a.q, d.q, f.q, ctr, a.n, d.n, f.n);
      }
  }
  // solid of revolution about the vertical through ctr: prof = [[radius, y], ...] bottom to top, both ends capped
  function lathe(key, ctr, prof, sides = 10) {
    const ring = ([r, y]) => Array.from({ length: sides }, (_, j) => {
      const t = (j / sides) * Math.PI * 2;
      return { q: add(ctr, [Math.cos(t) * r, y, Math.sin(t) * r]), n: [Math.cos(t), 0, Math.sin(t)] };
    });
    const R = prof.map(ring);
    for (let i = 0; i + 1 < prof.length; i++) {
      const ref = add(ctr, [0, (prof[i][1] + prof[i + 1][1]) / 2, 0]);
      for (let j = 0; j < sides; j++) {
        const k = (j + 1) % sides, a = R[i][j], b = R[i][k], d = R[i + 1][k], f = R[i + 1][j];
        tri(key, a.q, b.q, d.q, ref, a.n, b.n, d.n);
        tri(key, a.q, d.q, f.q, ref, a.n, d.n, f.n);
      }
    }
    const y0 = prof[0][1], y1 = prof[prof.length - 1][1];
    for (const [Rg, ref] of [[R[0], add(ctr, [0, y0 + 0.01, 0])], [R[R.length - 1], add(ctr, [0, y1 - 0.01, 0])]])
      for (let j = 1; j < sides - 1; j++) tri(key, Rg[0].q, Rg[j].q, Rg[j + 1].q, ref);
  }
  // a pleated curtain hanging between plan points a, b ([x, z]): flat back on the line, zigzag front pushed out along
  // the plan normal nd by th + depth on every other column, so the fold faces alternate toward and away from the light
  function pleat(key, a, b, nd, y0, y1, folds, depth, th = 0.012) {
    const n = folds * 2;
    const C = Array.from({ length: n + 1 }, (_, i) => {
      const [x, z] = lerp(a, b, i / n), f = th + depth * (i % 2);
      const fx = x + nd[0] * f, fz = z + nd[1] * f;
      return [[fx, y0, fz], [fx, y1, fz], [x, y1, z], [x, y0, z]];
    });
    const mid = (A, B) => {
      const p = mul(add(A[3], B[3]), 0.5);
      return [p[0] + nd[0] * th * 0.5, (y0 + y1) / 2, p[2] + nd[1] * th * 0.5];
    };
    for (let i = 0; i < n; i++)
      for (let k = 0; k < 4; k++) quad(key, C[i][k], C[i][(k + 1) % 4], C[i + 1][(k + 1) % 4], C[i + 1][k], mid(C[i], C[i + 1]));
    for (const [A, B] of [[C[0], C[1]], [C[n], C[n - 1]]]) quad(key, A[0], A[1], A[2], A[3], mid(A, B));
  }
  const place = (x, z, yaw, fn) => {
    const saved = M;
    M = saved.clone().multiply(new THREE.Matrix4().makeTranslation(x, 0, z)).multiply(new THREE.Matrix4().makeRotationY(yaw));
    fn();
    M = saved;
  };

  // ---------- the shell ----------
  const W = 2.0, L = 2.5, H = 2.6, T = 0.12; // interior half-width (x), half-length (z), height, wall thickness
  quad("floor", [-W, 0, -L], [W, 0, -L], [W, 0, L], [-W, 0, L], [0, -1, 0]);
  const TILE = 0.5;
  for (let x = -W + TILE; x < W - 0.01; x += TILE) quad("grid", [x - 0.006, 0.0015, -L], [x + 0.006, 0.0015, -L], [x + 0.006, 0.0015, L], [x - 0.006, 0.0015, L], [x, -1, 0]);
  for (let z = -L + TILE; z < L - 0.01; z += TILE) quad("grid", [-W, 0.0016, z - 0.006], [W, 0.0016, z - 0.006], [W, 0.0016, z + 0.006], [-W, 0.0016, z + 0.006], [0, -1, z]);
  const CAP = 0.02;
  const wall = (x0, x1, y0, y1, z0, z1, cut = cutaway) => {
    box("wall", x0, x1, y0, cut ? y1 - CAP : y1, z0, z1);
    if (cut) box("dark", x0, x1, y1 - CAP, y1, z0, z1);
  };
  // head wall (-X), full length to the open corner
  wall(-W - T, -W, 0, H, -L - T, L + (cutaway ? 0 : T));
  // window wall (-Z): sill wall, lintel, two piers
  const SILL = 0.85, HEAD = 2.25, WX0 = -1.7, WX1 = 0.5, wz0 = -L - T, wz1 = -L, wzm = (wz0 + wz1) / 2;
  box("wall", -W, W, 0, SILL, wz0, wz1);
  wall(-W, W, HEAD, H, wz0, wz1);
  box("wall", -W, WX0, SILL, HEAD, wz0, wz1);
  box("wall", WX1, W, SILL, HEAD, wz0, wz1);
  if (cutaway) { // the open wall ends get a dark section cap on their cut face too
    box("dark", -W - T, -W, 0, H, L - CAP, L);
    box("dark", W - CAP, W, 0, H, wz0, wz1);
  }
  // skirting
  box("dark", -W, -W + 0.012, 0, 0.1, -L, L);
  box("dark", -W, W, 0, 0.1, -L, -L + 0.012);
  // window casing, two sashes, glass, sill board
  const FR = 0.04;
  box("cloth", WX0, WX1, SILL, SILL + FR, wz0 - 0.005, wz1 + 0.012);
  box("cloth", WX0, WX1, HEAD - FR, HEAD, wz0 - 0.005, wz1 + 0.012);
  box("cloth", WX0, WX0 + FR, SILL, HEAD, wz0 - 0.005, wz1 + 0.012);
  box("cloth", WX1 - FR, WX1, SILL, HEAD, wz0 - 0.005, wz1 + 0.012);
  const wxm = (WX0 + WX1) / 2;
  for (const [s, dz] of [[-1, -0.03], [1, 0.03]]) {
    const sx0 = s < 0 ? WX0 + FR : wxm - 0.03, sx1 = s < 0 ? wxm + 0.03 : WX1 - FR;
    const z0 = wzm + dz - 0.014, z1 = wzm + dz + 0.014, y0 = SILL + FR, y1 = HEAD - FR;
    box("cloth", sx0, sx1, y0, y0 + 0.05, z0, z1);
    box("cloth", sx0, sx1, y1 - 0.05, y1, z0, z1);
    box("cloth", sx0, sx0 + 0.045, y0, y1, z0, z1);
    box("cloth", sx1 - 0.045, sx1, y0, y1, z0, z1);
    pane([(sx0 + sx1) / 2, (y0 + y1) / 2, wzm + dz], [0, 0, 1], sx1 - sx0 - 0.08, y1 - y0 - 0.09);
  }
  box("wood", WX0 - 0.05, WX1 + 0.05, SILL - 0.03, SILL, wz1, wz1 + 0.15);
  // venetian blind over the top third, in front of the glass
  const BZ0 = wz1 + 0.025, BZ1 = BZ0 + 0.035, BLIND = 1.72;
  box("cloth", WX0 + 0.01, WX1 - 0.01, HEAD - 0.06, HEAD - 0.01, BZ0 - 0.005, BZ1 + 0.01); // head rail
  for (let y = HEAD - 0.12; y > BLIND + 0.04; y -= 0.075) box("cloth", WX0 + 0.03, WX1 - 0.03, y, y + 0.008, BZ0, BZ1);
  box("cloth", WX0 + 0.03, WX1 - 0.03, BLIND - 0.02, BLIND + 0.005, BZ0 - 0.003, BZ1 + 0.003); // bottom bar
  // sheers on a rail, bunched at both sides
  const SZ = BZ1 + 0.03, RY = HEAD + 0.12;
  rod("cloth", [WX0 - 0.25, RY, SZ + 0.03], [WX1 + 0.25, RY, SZ + 0.03], 0.012);
  pleat("sheer", [WX0 - 0.22, SZ], [WX0 + 0.38, SZ], [0, 1], SILL - 0.1, RY - 0.02, 4, 0.07);
  pleat("sheer", [WX1 - 0.36, SZ], [WX1 + 0.22, SZ], [0, 1], SILL - 0.1, RY - 0.02, 4, 0.07);

  // closed room: +X wall with a sliding door, +Z wall, ceiling with a light panel
  if (!cutaway) {
    const DZ0 = 0.9, DZ1 = 1.95, DH = 2.05;
    box("wall", W, W + T, DH, H, -L - T, L + T);
    box("wall", W, W + T, 0, DH, -L - T, DZ0);
    box("wall", W, W + T, 0, DH, DZ1, L + T);
    box("green", W - 0.05, W - 0.01, 0.01, DH - 0.01, DZ0 - 0.02, DZ1 - 0.02);
    box("dark", W - 0.06, W - 0.05, 0.9, 1.15, DZ0 + 0.06, DZ0 + 0.1); // pull
    pane([W - 0.055, 1.5, (DZ0 + DZ1) / 2 + 0.15], [-1, 0, 0], 0.12, 0.6);
    box("wall", -W, W, 0, H, L, L + T);
    box("wall", -W, W, H - 0.06, H, -L, L);
    box("cloth", -1.0, 0.2, H - 0.08, H - 0.06, -1.3, -0.7);
    box("dark", W - 0.012, W, 0, 0.1, -L, DZ0), box("dark", W - 0.012, W, 0, 0.1, DZ1, L);
    box("dark", -W, W, 0, 0.1, L - 0.012, L);
  }

  // ---------- the bed ----------
  const ZB = -1.0, HX = -1.88, FX = 0.17, MW = 0.45, DECK = 0.47, MT = 0.61, PIV = HX + 0.78;
  // head and foot boards, pale green
  blob("green", [HX - 0.04, 0.68, ZB], [0.03, 0.34, 0.53], 0.18, 16, 8);
  blob("green", [FX + 0.04, 0.6, ZB], [0.03, 0.26, 0.53], 0.18, 16, 8);
  // frame, legs, casters
  box("cloth", HX, FX, DECK - 0.09, DECK, ZB - MW - 0.02, ZB - MW + 0.02);
  box("cloth", HX, FX, DECK - 0.09, DECK, ZB + MW - 0.02, ZB + MW + 0.02);
  box("cloth", HX, FX, DECK - 0.04, DECK - 0.01, ZB - MW, ZB + MW);
  for (const x of [HX + 0.06, FX - 0.06])
    for (const z of [ZB - MW + 0.05, ZB + MW - 0.05]) {
      rod("cloth", [x, 0.1, z], [x, DECK - 0.05, z], 0.022);
      box("dark", x - 0.03, x + 0.03, 0, 0.09, z - 0.045, z + 0.045);
    }
  // fixed mattress (foot part) and duvet with a turned-down sheet band
  blob("cloth", [(PIV + FX) / 2, (DECK + MT) / 2, ZB], [(FX - PIV) / 2, (MT - DECK) / 2, MW], 0.25, 16, 8);
  const DUV0 = PIV + 0.2;
  blob("cloth", [(DUV0 + FX + 0.01) / 2, 0.545, ZB], [(FX + 0.01 - DUV0) / 2, 0.125, MW + 0.04], 0.2, 16, 8);
  blob("cloth", [DUV0 + 0.06, 0.6, ZB], [0.07, 0.085, MW + 0.05], 0.3, 20, 6);
  // side rails on both sides of the head half
  for (const s of [-1, 1]) {
    const z = ZB + s * (MW + 0.08), xa = HX + 0.12, xb = PIV + 0.35, y0 = DECK + 0.02, y1 = 0.9;
    path("cloth", [[xa, y0, z], [xa, y1, z], [xb, y1, z], [xb, y0, z]], 0.014);
    rod("cloth", [xa, 0.72, z], [xb, 0.72, z], 0.011);
    for (let k = 1; k < 4; k++) rod("cloth", [xa + ((xb - xa) * k) / 4, 0.72, z], [xa + ((xb - xa) * k) / 4, y1, z], 0.01);
  }
  // backrest section on its joint: mattress head part and pillow, authored in world coordinates
  const back = new THREE.Group();
  back.name = "backrest";
  back.position.set(PIV, DECK, ZB);
  body.add(back);
  joints.backrest = back;
  {
    const saved = M;
    M = new THREE.Matrix4().makeTranslation(-PIV, -DECK, -ZB);
    blob("jcloth", [(HX + PIV + 0.04) / 2, (DECK + MT) / 2, ZB], [(PIV + 0.04 - HX) / 2, (MT - DECK) / 2, MW], 0.25, 16, 8);
    blob("jcloth", [HX + 0.28, MT + 0.07, ZB], [0.2, 0.075, 0.33], 0.45, 14, 8);
    M = saved;
  }

  // ---------- headwall console, call panel, corded handset ----------
  const CX = -W + 0.035;
  box("cloth", -W, CX, 1.3, 1.5, ZB - 0.75, ZB + 0.75);
  box("dark", CX, CX + 0.004, 1.38, 1.39, ZB - 0.72, ZB + 0.42);
  const PZ = ZB + 0.6;
  box("dark", CX, CX + 0.006, 1.33, 1.47, PZ - 0.08, PZ + 0.08);
  box("cloth", CX + 0.006, CX + 0.016, 1.34, 1.46, PZ - 0.07, PZ + 0.07);
  rod("red", [CX + 0.016, 1.42, PZ], [CX + 0.03, 1.42, PZ], 0.022, 10);
  rod("dark", [CX + 0.016, 1.36, PZ + 0.035], [CX + 0.024, 1.36, PZ + 0.035], 0.008);
  const rz = ZB + MW + 0.08;
  path("dark", [[CX + 0.02, 1.35, PZ - 0.03], [-1.93, 1.05, rz - 0.02], [-1.7, 0.93, rz], [-1.45, 0.92, rz + 0.015], [-1.4, 0.8, rz + 0.02]], 0.006, 4);
  box("cloth", -1.43, -1.37, 0.66, 0.8, rz + 0.01, rz + 0.04);
  rod("red", [-1.4, 0.76, rz + 0.04], [-1.4, 0.76, rz + 0.05], 0.013, 8);

  // ---------- bedside cabinet with flowers and fruit ----------
  const KX0 = -W + 0.03, KX1 = KX0 + 0.48, KZ0 = -0.36, KZ1 = KZ0 + 0.48, KY = 0.79;
  box("wood", KX0, KX1, 0.06, KY - 0.03, KZ0, KZ1);
  box("dark", KX0 + 0.02, KX1, 0, 0.06, KZ0 + 0.02, KZ1 - 0.02); // plinth
  box("wood", KX0 - 0.01, KX1 + 0.02, KY - 0.03, KY, KZ0 - 0.015, KZ1 + 0.015);
  box("dark", KX1, KX1 + 0.004, 0.57, 0.58, KZ0 + 0.02, KZ1 - 0.02); // drawer split
  box("dark", KX1, KX1 + 0.012, 0.64, 0.66, (KZ0 + KZ1) / 2 - 0.07, (KZ0 + KZ1) / 2 + 0.07); // drawer pull
  box("dark", KX1, KX1 + 0.012, 0.3, 0.46, KZ1 - 0.07, KZ1 - 0.05); // door pull
  // vase and flowers
  const VX = KX0 + 0.13, VZ = KZ0 + 0.14;
  lathe("green", [VX, KY, VZ], [[0.045, 0], [0.062, 0.07], [0.052, 0.16], [0.032, 0.21], [0.042, 0.24]], 10);
  const heads = [[0.0, 0.5, 0.0, "red"], [-0.09, 0.44, 0.05, "yellow"], [0.08, 0.46, -0.04, "red"], [0.03, 0.4, 0.1, "yellow"], [-0.05, 0.43, -0.08, "red"], [0.1, 0.38, 0.07, "yellow"], [-0.11, 0.37, -0.02, "red"]];
  for (const [dx, dy, dz, k] of heads) {
    const top = [VX + dx, KY + dy, VZ + dz];
    rod("leaf", [VX + dx * 0.15, KY + 0.2, VZ + dz * 0.15], top, 0.006, 4);
    blob(k, top, [0.045, 0.035, 0.045], 0.8, 8, 6);
    blob(k === "red" ? "yellow" : "red", add(top, [0, 0.028, 0]), [0.015, 0.012, 0.015], 1, 6, 4);
  }
  for (const [dx, dz, dy] of [[0.07, 0.03, 0.3], [-0.06, -0.05, 0.32], [0.0, 0.08, 0.28]])
    blob("leaf", [VX + dx, KY + dy, VZ + dz], [0.05, 0.012, 0.025], 0.9, 8, 4);
  // wicker basket of fruit
  const BX = KX0 + 0.33, BZ = KZ0 + 0.31, BY = KY;
  lathe("wood", [BX, BY, BZ], [[0.08, 0], [0.12, 0.045], [0.135, 0.085]], 12);
  box("dark", BX - 0.135, BX + 0.135, BY + 0.06, BY + 0.066, BZ - 0.004, BZ + 0.004); // weave line (inside the rim)
  path("wood", [[BX - 0.12, BY + 0.085, BZ], [BX - 0.09, BY + 0.2, BZ], [BX, BY + 0.24, BZ], [BX + 0.09, BY + 0.2, BZ], [BX + 0.12, BY + 0.085, BZ]], 0.01, 6);
  for (const [dx, dz, k, r] of [[-0.05, 0.03, "red", 0.042], [0.04, 0.05, "yellow", 0.04], [0.02, -0.05, "red", 0.042], [-0.06, -0.05, "yellow", 0.038], [0.075, -0.01, "red", 0.038]])
    blob(k, [BX + dx, BY + 0.09 + r * 0.5, BZ + dz], [r, r * 0.92, r], 1, 10, 6);
  path("yellow", [[BX - 0.07, BY + 0.16, BZ + 0.02], [BX - 0.02, BY + 0.18, BZ + 0.03], [BX + 0.05, BY + 0.17, BZ + 0.02], [BX + 0.09, BY + 0.14, BZ + 0.01]], 0.018, 6);
  path("yellow", [[BX - 0.06, BY + 0.15, BZ - 0.02], [BX, BY + 0.165, BZ - 0.025], [BX + 0.07, BY + 0.15, BZ - 0.02]], 0.017, 6);

  // ---------- IV stand ----------
  const IX = -1.45, IZ = -1.78;
  for (let k = 0; k < 5; k++) {
    const t = (k / 5) * Math.PI * 2 + 0.3, e = [IX + Math.cos(t) * 0.28, 0.05, IZ + Math.sin(t) * 0.28];
    rod("cloth", [IX, 0.1, IZ], e, 0.012, 4);
    box("dark", e[0] - 0.025, e[0] + 0.025, 0, 0.05, e[2] - 0.025, e[2] + 0.025);
  }
  rod("cloth", [IX, 0.08, IZ], [IX, 1.95, IZ], 0.014);
  rod("cloth", [IX - 0.16, 1.92, IZ], [IX + 0.16, 1.92, IZ], 0.01);
  for (const s of [-1, 1]) rod("cloth", [IX + s * 0.16, 1.92, IZ], [IX + s * 0.16, 1.86, IZ], 0.008, 4);
  const BAGY = 1.66, BAGX = IX + 0.16;
  blob("cloth", [BAGX, BAGY, IZ], [0.1, 0.16, 0.03], 0.45, 12, 8);
  plate("seam", [BAGX, BAGY + 0.01, IZ + 0.031], [0, 0, 1], 0.11, 0.12); // blank label
  rod("cloth", [BAGX, BAGY - 0.16, IZ], [BAGX, BAGY - 0.26, IZ], 0.013, 6); // drip chamber
  path("cloth", [[BAGX, BAGY - 0.26, IZ], [BAGX + 0.02, 1.1, IZ + 0.15], [-1.3, 0.95, ZB - MW - 0.08]], 0.004, 4);

  // ---------- over-bed table across the duvet ----------
  const TX = -0.35, TZ0 = ZB - 0.32, TZ1 = ZB + MW + 0.2, TY = 0.95, PZC = TZ1 - 0.05;
  box("wood", TX - 0.26, TX + 0.26, TY - 0.03, TY, TZ0, TZ1);
  box("dark", TX - 0.262, TX + 0.262, TY - 0.03, TY - 0.022, TZ0 - 0.002, TZ1 + 0.002);
  box("cloth", TX - 0.06, TX + 0.06, TY - 0.07, TY - 0.03, PZC - 0.05, TZ1 - 0.01);
  rod("cloth", [TX, 0.07, PZC], [TX, TY - 0.06, PZC], 0.025);
  rod("cloth", [TX - 0.38, 0.06, PZC], [TX + 0.38, 0.06, PZC], 0.02);
  for (const s of [-1, 1]) box("dark", TX + s * 0.36 - 0.025, TX + s * 0.36 + 0.025, 0, 0.045, PZC - 0.03, PZC + 0.03);
  lathe("cloth", [TX + 0.08, TY, ZB + 0.15], [[0.03, 0], [0.038, 0.1]], 10);

  // ---------- visitor chair, turned to the bed ----------
  place(-0.9, 0.42, -2.72, () => { // local: the sitter faces +Z, the back at -Z
    for (const x of [-0.19, 0.19])
      for (const z of [-0.18, 0.18]) rod("cloth", [x, 0.008, z], [x, 0.42, z], 0.012, 4);
    for (const x of [-0.19, 0.19]) rod("cloth", [x, 0.42, -0.18], [x, 0.78, -0.21], 0.012, 4);
    blob("green", [0, 0.445, 0], [0.22, 0.04, 0.22], 0.3, 12, 6);
    blob("green", [0, 0.66, -0.205], [0.21, 0.11, 0.03], 0.3, 12, 6);
  });

  // ---------- wall basin, tap, mirror ----------
  const SZc = 1.75, SX1 = -W + 0.45;
  box("cloth", -W, SX1, 0.72, 0.85, SZc - 0.27, SZc + 0.27);
  plate("seam", [(-W + SX1) / 2 + 0.04, 0.851, SZc], [0, 1, 0], 0.32, 0.42);
  path("cloth", [[-W + 0.04, 0.85, SZc], [-W + 0.04, 0.99, SZc], [-W + 0.16, 0.99, SZc], [-W + 0.16, 0.95, SZc]], 0.012, 6);
  rod("dark", [-W + 0.1, 0.72, SZc], [-W + 0.1, 0.45, SZc], 0.02); // trap
  rod("dark", [-W + 0.1, 0.45, SZc], [-W, 0.45, SZc], 0.02);
  box("cloth", -W, -W + 0.02, 1.08, 1.62, SZc - 0.24, SZc + 0.24);
  plate("seam", [-W + 0.021, 1.35, SZc], [1, 0, 0], 0.42, 0.48);

  // ---------- privacy curtain on an L track ----------
  const CZ = 0.45, CXr = 0.66, TRY = 2.47;
  box("cloth", -W, CXr + 0.015, TRY, TRY + 0.03, CZ - 0.015, CZ + 0.015);
  box("cloth", CXr - 0.015, CXr + 0.015, TRY, TRY + 0.03, -L, CZ + 0.015);
  const MESH = 2.08, HEM = 0.38;
  const drape = (a, b, nd, folds, depth) => {
    pleat("cloth", a, b, nd, MESH, TRY - 0.01, folds, depth, 0.01); // white mesh band
    pleat("curtain", a, b, nd, HEM, MESH, folds, depth, 0.012);
  };
  drape([CXr, -L + 0.03], [CXr, -1.55], [1, 0], 6, 0.08); // half drawn along the foot, from the window

  // ---------- evening sun ----------
  if (evening) {
    quad("sun", [WX0 + 0.1, 0.003, -L + 0.02], [WX1 + 0.05, 0.003, -L + 0.02], [WX1 + 0.9, 0.003, -L + 1.7], [WX0 + 0.95, 0.003, -L + 1.7], [0, -1, 0]);
    plate("sun", [-0.25, 0.673, ZB - 0.05], [0, 1, 0], 0.55, 0.6);
  }

  // ---------- meshes: one per material signature ----------
  const cloth = [c.cloth, c.clothShade, 0.3, 2];
  const MAT = {
    wall: [c.wall, c.wallShade, 0.1, 3],
    floor: [c.floor, c.floor, 0.1, 3],
    seam: [c.glass, c.glass, 0.1, 0],
    grid: [c.seam, c.seam, 0.1, 0],
    glass: evening ? [c.yellow, c.yellow, 0.1, 0] : [c.glass, c.glass, 0.1, 0],
    cloth,
    jcloth: cloth,
    sheer: [c.cloth, evening ? c.yellow : c.clothShade, 0.3, 2],
    green: [c.green, c.greenShade, 0.1, 2],
    curtain: [c.curtain, c.curtainShade, 0.45, 2],
    wood: [c.wood, c.woodShade, 0.1, 3],
    leaf: [c.leaf, c.leafShade, 0.1, 2],
    dark: [c.dark, c.dark, 0.1, 0],
    red: [c.red, c.red, 0.1, 2],
    yellow: [c.yellow, c.yellow, 0.1, 2],
    sun: [c.yellow, c.yellow, 0.1, 0],
  };
  const groups = new Map();
  for (const [key, soup] of Object.entries(soups)) {
    const sig = (key === "jcloth" ? "J|" : "") + MAT[key].join("|");
    if (!groups.has(sig)) groups.set(sig, { key, m: MAT[key], p: [], n: [] });
    const g = groups.get(sig);
    for (let i = 0; i < soup.p.length; i++) g.p.push(soup.p[i]), g.n.push(soup.n[i]);
  }
  for (const { key, m, p, n } of groups.values()) {
    const [base, shade, threshold, px] = m;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    (key === "jcloth" ? back : body).add(mesh);
  }

  // ---------- pose: the backrest only; -rz lifts the head end ----------
  const MAXA = (66 * Math.PI) / 180;
  const POSES = { rest: incline, flat: 0, upright: 1 };
  function pose(name) {
    if (!(name in POSES)) throw new Error(`unknown pose "${name}" (rest, flat, upright)`);
    back.rotation.set(0, 0, -POSES[name] * MAXA);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
