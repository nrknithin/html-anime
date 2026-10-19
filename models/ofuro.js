// ofuro.js - a small Japanese home bathroom (ofuro), the steamy set of every anime bath scene, as a cutaway: two
// tiled walls and a floor, at real size, with rising steam and rippling water as a looping clip.
// Contract: harness/lab/README.md. Meters, +Y up, the open (cutaway) sides face +X and +Z, so the lab's front-left
// cameras look in; the tub stands against the back (-Z) wall and runs out to the +X cut, the washing place (arai-ba)
// is along the -X wall in front of it, so it reads as a home unit bath (1.6 x 2.0 m), not a public sento. Floor on
// y = 0, centred on x = z = 0.
//
// Construction (boxes, capped tubes, smooth tubes, lathes, flat plates and annuli, all triangle soups merged per
// material, so the static room is 14 meshes; every triangle is wound away from a point inside its solid):
//   SHELL     floor quad with a small mosaic grout grid and a drain grate; the -X and -Z walls as 10 cm boxes with a
//             tile grout grid and dark section caps where the cutaway opens them.
//   TUB       a deep square tub (0.92 x 0.82 m, rim 0.5 m) as wall boxes, a floor slab and a rim band, a recessed
//             apron panel on the front. WATER: the lab's hero camera sits ~0.35 m up (it is raised only until it clears
//             the floor), below any rim, so no water surface inside a tub can show from it. So the cutaway plane x = W
//             slices the tub: dark section caps on its walls and floor, and the water's section, a pale aqua face with
//             a rippled foam lip, faces the camera. From above (three4, top) the water is a heightfield of concentric
//             waves (smooth normals; crests catch the light as white at threshold 0.85), plus glints.
//             A folding lid, three green slats: one flat at the back, two folded up in a tent on it ("half on").
//   WASH      a wall mixer tap with two handles and a spout, a shower head on its hose in a holder on a riser bar, a
//             mirror over a shelf with three bottles (pump, tall, squat), a low wash stool and a yellow basin (oke).
//   WINDOW    a small frosted window high on the -Z wall over the tub: frame, stile, sill, pane with a fine grid.
//   STEAM     eight wisps (tapered S-curved smooth tubes) on joints steam0..7, three ripple rings on ripple0..2.
// Proportions (real size, base unit the wall height H = 2.2 m): interior 1.6 (x) by 2.0 (z); tub x -0.12..0.8,
//   z -1.0..-0.18, rim 0.5, water 0.47; tap 0.55, shelf 0.84, mirror 0.95-1.5, shower bar 0.85-1.75; window
//   1.4-1.85; stool seat 0.235, oke 0.12 tall.
// Options: build(THREE, kit, colors, { height }): height scales the whole room uniformly so the wall top is `height`
//   (default 2.2 m).
// Clip (build() returns clips { steam: 4 }; pose("steam@1.5")): the wisps rise ~0.95 m from the water, swell, sway
//   and shrink away as they climb, eight on staggered phases; the ripple rings spread from the middle of the open
//   water and sink under the surface at the end, twice per loop. Loops exactly at 4 s. Rest is the clip at 1.2 s.
// Budget: ~4.2k triangles, 25 meshes (14 static materials, 8 wisps, 3 rings).
// Ink in pixels: walls, floor, tub 3; fittings, bottles, lid, water 2; steam 2 in the sky tone (soft edges, not ink).
// Colours (meadow, one script), base / shade:
//   wall tiles                moon #f7f3e1 / sky #d7ecef, threshold 0.1; grout sky #d7ecef flat
//   floor mosaic              sky #d7ecef flat, grout sclera #f6f3ee
//   tub, apron, rim           sclera #f6f3ee / sky #d7ecef (white enamel)
//   water                     sclera #f6f3ee crests / sky #d7ecef body, threshold 0.85 (pale aqua, white ripples)
//   ripples, glints, steam    sclera #f6f3ee / sky #d7ecef
//   lid, stool                line #a9d16e / iris #3f8a47 (green plastic)
//   tap, shower, bar, shelf, window frame  sclera #f6f3ee / sky #d7ecef
//   mirror, frosted pane      sky #d7ecef flat; the pane's grid sclera
//   oke                       practical #f2c94c / skin #f0c2ae
//   bottles                   accent #d9483b, iris #3f8a47 / hair #2c5131, moon / skin
//   caps, hose, drain, pump   hair #2c5131 flat or inked (lines)

export const meta = {
  name: "ofuro",
  height: 2.2,
  script: "meadow",
  colors: {
    wall: "#f7f3e1", wallShade: "#d7ecef",
    grout: "#d7ecef",
    floor: "#d7ecef", floorGrout: "#f6f3ee",
    tub: "#f6f3ee", tubShade: "#d7ecef",
    water: "#d7ecef", waterLit: "#f6f3ee",
    foam: "#f6f3ee", foamShade: "#d7ecef",
    green: "#a9d16e", greenShade: "#3f8a47",
    metal: "#f6f3ee", metalShade: "#d7ecef",
    mirror: "#d7ecef",
    frost: "#d7ecef", frostGrid: "#f6f3ee",
    oke: "#f2c94c", okeShade: "#f0c2ae",
    red: "#d9483b",
    leaf: "#3f8a47", leafShade: "#2c5131",
    cream: "#f7f3e1", creamShade: "#f0c2ae",
    dark: "#2c5131",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const NATURAL = 2.2;
  const { height = NATURAL } = opts;
  const root = new THREE.Group();
  root.name = "ofuro";
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
  // a flat quad facing `n` (unit axis), centred on a point
  function plate(key, ctr, n, w, h) {
    const up = Math.abs(n[1]) > 0.5 ? [0, 0, 1] : [0, 1, 0];
    const r = nrm(cross(up, n)), u = cross(n, r);
    const P = (a, b) => add(ctr, add(mul(r, (a * w) / 2), mul(u, (b * h) / 2)));
    quad(key, P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), sub(ctr, n));
  }
  // a capped tube from a to b, radius r; ends pushed out by 0.6 r so joints overlap
  function rod(key, a, b, r, sides = 6, r2 = r) {
    const T = nrm(sub(b, a));
    a = sub(a, mul(T, r * 0.6)), b = add(b, mul(T, r2 * 0.6));
    const up = Math.abs(T[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = nrm(cross(up, T)), w = cross(T, u);
    const ring = (P, rr) => Array.from({ length: sides }, (_, j) => {
      const t = (j / sides) * Math.PI * 2, d = add(mul(u, Math.cos(t)), mul(w, Math.sin(t)));
      return { q: add(P, mul(d, rr)), n: d };
    });
    const A = ring(a, r), B = ring(b, r2), mid = mul(add(a, b), 0.5);
    for (let j = 0; j < sides; j++) {
      const k = (j + 1) % sides;
      tri(key, A[j].q, A[k].q, B[k].q, mid, A[j].n, A[k].n, B[k].n);
      tri(key, A[j].q, B[k].q, B[j].q, mid, A[j].n, B[k].n, B[j].n);
    }
    for (const [R, s] of [[A, -1], [B, 1]])
      for (let j = 1; j < sides - 1; j++) tri(key, R[0].q, R[j].q, R[j + 1].q, mid, mul(T, s), mul(T, s), mul(T, s));
  }
  // one smooth tube through pts with radii rad (continuous rings, smooth normals), both ends capped
  function tube(key, pts, rad, sides = 8) {
    const R = pts.map((P, i) => {
      const T = nrm(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
      const u = nrm(cross(Math.abs(T[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1], T)), w = cross(T, u);
      return Array.from({ length: sides }, (_, j) => {
        const t = (j / sides) * Math.PI * 2, d = add(mul(u, Math.cos(t)), mul(w, Math.sin(t)));
        return { q: add(P, mul(d, rad[i])), n: d, c: P };
      });
    });
    for (let i = 0; i + 1 < R.length; i++)
      for (let j = 0; j < sides; j++) {
        const k = (j + 1) % sides, a = R[i][j], b = R[i][k], d = R[i + 1][k], f = R[i + 1][j];
        const ref = mul(add(a.c, f.c), 0.5);
        tri(key, a.q, b.q, d.q, ref, a.n, b.n, d.n);
        tri(key, a.q, d.q, f.q, ref, a.n, d.n, f.n);
      }
    for (const [Rg, nb] of [[R[0], R[1]], [R[R.length - 1], R[R.length - 2]]])
      for (let j = 1; j < sides - 1; j++) tri(key, Rg[0].q, Rg[j].q, Rg[j + 1].q, nb[0].c);
  }
  const path = (key, pts, r, sides) => { for (let i = 0; i + 1 < pts.length; i++) rod(key, pts[i], pts[i + 1], r, sides); };
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
  // a flat ring (annulus) in the XZ plane facing up, radii r0 < r1, squashed in z by k
  function annulus(key, ctr, r0, r1, sides = 20, k = 1) {
    const P = (r, j) => { const t = (j / sides) * Math.PI * 2; return add(ctr, [Math.cos(t) * r, 0, Math.sin(t) * r * k]); };
    const ref = add(ctr, [0, -1, 0]);
    for (let j = 0; j < sides; j++) quad(key, P(r0, j), P(r1, j), P(r1, j + 1), P(r0, j + 1), ref);
  }
  // a flat ellipse in the XZ plane facing up
  function disc(key, ctr, rx, rz, sides = 10, yaw = 0) {
    const P = (j) => {
      const t = (j / sides) * Math.PI * 2, x = Math.cos(t) * rx, z = Math.sin(t) * rz;
      return add(ctr, [x * Math.cos(yaw) - z * Math.sin(yaw), 0, x * Math.sin(yaw) + z * Math.cos(yaw)]);
    };
    for (let j = 1; j < sides - 1; j++) tri(key, P(0), P(j), P(j + 1), add(ctr, [0, -1, 0]));
  }
  const place = (x, y, z, yaw, fn) => {
    const saved = M;
    M = saved.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z)).multiply(new THREE.Matrix4().makeRotationY(yaw));
    fn();
    M = saved;
  };

  // ---------- the shell ----------
  const W = 0.8, L = 1.0, H = 2.2, T = 0.1, CAP = 0.02;
  quad("floor", [-W, 0, -L], [W, 0, -L], [W, 0, L], [-W, 0, L], [0, -1, 0]);
  const FT = 0.1; // floor mosaic
  for (let x = -W + FT; x < W - 0.01; x += FT) quad("fgrout", [x - 0.004, 0.0015, -L], [x + 0.004, 0.0015, -L], [x + 0.004, 0.0015, L], [x - 0.004, 0.0015, L], [x, -1, 0]);
  for (let z = -L + FT; z < L - 0.01; z += FT) quad("fgrout", [-W, 0.0016, z - 0.004], [W, 0.0016, z - 0.004], [W, 0.0016, z + 0.004], [-W, 0.0016, z + 0.004], [0, -1, z]);
  // walls with dark section caps on the cut tops and ends
  box("wall", -W - T, -W, 0, H - CAP, -L - T, L);
  box("dark", -W - T, -W, H - CAP, H, -L - T, L);
  box("dark", -W - T, -W, 0, H - CAP, L - CAP, L);
  box("wall", -W, W, 0, H - CAP, -L - T, -L);
  box("dark", -W, W, H - CAP, H, -L - T, -L);
  box("dark", W - CAP, W, 0, H - CAP, -L - T, -L);
  // tile grout: 0.2 m tiles, light lines 2 mm proud of the wall face
  const TL = 0.2, G = 0.005;
  for (let y = TL; y < H - 0.05; y += TL) {
    quad("grout", [-W + 0.002, y - G, -L], [-W + 0.002, y + G, -L], [-W + 0.002, y + G, L - CAP], [-W + 0.002, y - G, L - CAP], [-W - 1, y, 0]);
    quad("grout", [-W, y - G, -L + 0.002], [W - CAP, y - G, -L + 0.002], [W - CAP, y + G, -L + 0.002], [-W, y + G, -L + 0.002], [0, y, -L - 1]);
  }
  for (let z = -L + TL; z < L - 0.05; z += TL)
    quad("grout", [-W + 0.002, 0, z - G], [-W + 0.002, H - CAP, z - G], [-W + 0.002, H - CAP, z + G], [-W + 0.002, 0, z + G], [-W - 1, 1, z]);
  for (let x = -W + TL; x < W - 0.05; x += TL)
    quad("grout", [x - G, 0, -L + 0.002], [x - G, H - CAP, -L + 0.002], [x + G, H - CAP, -L + 0.002], [x + G, 0, -L + 0.002], [x, 1, -L - 1]);
  // drain grate by the tub
  box("dark", -0.32, -0.16, 0, 0.004, -0.12, 0.04);
  for (let k = 0; k < 4; k++) box("metal", -0.3, -0.18, 0.004, 0.008, -0.1 + k * 0.04, -0.085 + k * 0.04);

  // ---------- the tub: back corner, against the -Z wall, running out to the +X cut ----------
  // The cutaway plane x = W slices the tub: its walls and floor show dark section caps there and the water shows its
  // section, a pale aqua face with a rippled top edge, so the water reads from the low hero camera too.
  const TX0 = -0.12, TX1 = W - CAP, TZ0 = -L, TZ1 = -0.18, RIM = 0.5, WT = 0.07, BOT = 0.08;
  box("tub", TX0, TX1, 0, RIM - 0.03, TZ1 - WT, TZ1); // front wall (+Z)
  box("tub", TX0, TX0 + WT, 0, RIM - 0.03, TZ0, TZ1); // inner side wall (-X)
  box("tub", TX0, TX1, 0, RIM - 0.03, TZ0, TZ0 + 0.03); // back
  box("tub", TX0, TX1, 0, BOT, TZ0, TZ1); // floor
  // rim band, slightly proud
  box("tub", TX0 - 0.01, TX1, RIM - 0.035, RIM, TZ1 - WT - 0.005, TZ1 + 0.01);
  box("tub", TX0 - 0.01, TX0 + WT + 0.005, RIM - 0.035, RIM, TZ0, TZ1 + 0.01);
  box("tub", TX0, TX1, RIM - 0.035, RIM, TZ0, TZ0 + 0.05);
  // section caps on the cut
  box("dark", TX1, W, 0, RIM, TZ1 - WT - 0.005, TZ1 + 0.01);
  box("dark", TX1, W, 0, RIM, TZ0, TZ0 + 0.05);
  box("dark", TX1, W, 0, BOT, TZ0, TZ1);
  // apron: a dark seam frames a recessed panel on the front; a dark toe kick
  box("dark", TX0 + 0.04, TX1 - 0.02, 0.0, 0.035, TZ1, TZ1 + 0.004);
  box("dark", TX0 - 0.004, TX0, 0.0, 0.035, TZ0 + 0.04, TZ1 - 0.04);
  for (const [y0, y1] of [[0.06, 0.065], [0.4, 0.405]]) box("dark", TX0 + 0.05, TX1 - 0.05, y0, y1, TZ1, TZ1 + 0.003);
  box("dark", TX0 + 0.05, TX0 + 0.055, 0.06, 0.405, TZ1, TZ1 + 0.003);
  box("dark", TX1 - 0.055, TX1 - 0.05, 0.06, 0.405, TZ1, TZ1 + 0.003);
  // water: a heightfield, rings of small waves spreading from RC, filling the tub to ~3 cm under the rim
  const IX0 = TX0 + WT, IX1 = W, IZ0 = TZ0 + 0.03, IZ1 = TZ1 - WT, WL = RIM - 0.03, RC = [0.34, -0.5];
  const wave = (x, z) => {
    const r = Math.hypot(x - RC[0], (z - RC[1]) / 0.62);
    return 0.012 * Math.cos((r / 0.11) * 2 * Math.PI) * Math.exp(-r / 0.7);
  };
  const NX = 22, NZ = 10, hx = (IX1 - IX0) / NX, hz = (IZ1 - IZ0) / NZ, wref = [(IX0 + IX1) / 2, 0.25, (IZ0 + IZ1) / 2];
  const wp = (i, k) => { const x = IX0 + i * hx, z = IZ0 + k * hz; return [x, WL + wave(x, z), z]; };
  const wn = (i, k) => {
    const [x, , z] = wp(i, k), e = 0.004;
    return nrm([-(wave(x + e, z) - wave(x - e, z)) / (2 * e), 1, -(wave(x, z + e) - wave(x, z - e)) / (2 * e)]);
  };
  for (let i = 0; i < NX; i++)
    for (let k = 0; k < NZ; k++) {
      tri("water", wp(i, k), wp(i + 1, k), wp(i + 1, k + 1), wref, wn(i, k), wn(i + 1, k), wn(i + 1, k + 1));
      tri("water", wp(i, k), wp(i + 1, k + 1), wp(i, k + 1), wref, wn(i, k), wn(i + 1, k + 1), wn(i, k + 1));
    }
  // the section face on the cut (x = W) and the hidden sides, down to the tub floor
  const side = (P, Q) => quad("water", P, Q, [Q[0], BOT, Q[2]], [P[0], BOT, P[2]], wref);
  for (let k = 0; k < NZ; k++) side(wp(NX, k), wp(NX, k + 1)), side(wp(0, k), wp(0, k + 1));
  for (let i = 0; i < NX; i++) side(wp(i, 0), wp(i + 1, 0)), side(wp(i, NZ), wp(i + 1, NZ));
  // a pale foam line along the section's top edge, and glints on the surface
  for (let k = 0; k < NZ; k++) {
    const P = wp(NX, k), Q = wp(NX, k + 1);
    quad("foam", [W + 0.001, P[1] - 0.02, P[2]], [W + 0.001, Q[1] - 0.02, Q[2]], [W + 0.001, Q[1] - 0.004, Q[2]], [W + 0.001, P[1] - 0.004, P[2]], [0, 0.3, P[2]]);
  }
  disc("foam", [0.1, WL + 0.01, -0.32], 0.07, 0.012, 10, 0.25);
  disc("foam", [0.19, WL + 0.01, -0.29], 0.025, 0.008, 8, 0.25);
  // folding lid: four slats across the tub (along x). Back two flat, the front two folded up in a tent on them.
  const LX0 = TX0 + 0.005, LX1 = W, SL = 0.205, LT = 0.025;
  const slatAt = (z0, z1, y0) => {
    box("green", LX0, LX1, y0, y0 + LT, z0, z1);
    box("dark", LX0, LX1, y0 + LT, y0 + LT + 0.003, z1 - 0.008, z1);
  };
  slatAt(TZ0 + 0.005, TZ0 + SL + 0.01, RIM);
  // the folded pair: a tent standing on the flat slats, hinge at the top
  const TENT = 62 * Math.PI / 180, ZF = TZ0 + 0.02, YF = RIM + LT;
  for (const [z0, dir] of [[ZF, 1], [ZF + 2 * SL * Math.cos(TENT), -1]]) {
    const saved = M;
    M = saved.clone().multiply(new THREE.Matrix4().makeTranslation((LX0 + LX1) / 2, YF, z0))
      .multiply(new THREE.Matrix4().makeRotationX(-dir * TENT));
    box("green", -(LX1 - LX0) / 2, (LX1 - LX0) / 2, 0, LT, dir > 0 ? 0 : -SL, dir > 0 ? SL : 0);
    M = saved;
  }
  box("dark", LX0 + 0.02, LX1 - 0.02, YF + SL * Math.sin(TENT) - 0.005, YF + SL * Math.sin(TENT) + 0.02, ZF + SL * Math.cos(TENT) - 0.012, ZF + SL * Math.cos(TENT) + 0.012); // hinge

  // ---------- the window: small, frosted, high on the -Z wall over the tub ----------
  const WX0 = 0.08, WX1 = 0.62, WY0 = 1.4, WY1 = 1.85, wz = -L;
  box("metal", WX0 - 0.04, WX1 + 0.04, WY0 - 0.04, WY0, wz, wz + 0.04);
  box("metal", WX0 - 0.04, WX1 + 0.04, WY1, WY1 + 0.04, wz, wz + 0.04);
  box("metal", WX0 - 0.04, WX0, WY0, WY1, wz, wz + 0.04);
  box("metal", WX1, WX1 + 0.04, WY0, WY1, wz, wz + 0.04);
  box("metal", (WX0 + WX1) / 2 - 0.015, (WX0 + WX1) / 2 + 0.015, WY0, WY1, wz, wz + 0.03); // meeting stile
  box("metal", WX0 - 0.06, WX1 + 0.06, WY0 - 0.07, WY0 - 0.04, wz, wz + 0.09); // sill
  plate("frost", [(WX0 + WX1) / 2, (WY0 + WY1) / 2, wz + 0.012], [0, 0, 1], WX1 - WX0, WY1 - WY0);
  for (let x = WX0 + 0.045; x < WX1 - 0.02; x += 0.045) plate("fgrid", [x, (WY0 + WY1) / 2, wz + 0.014], [0, 0, 1], 0.004, WY1 - WY0);
  for (let y = WY0 + 0.045; y < WY1 - 0.02; y += 0.045) plate("fgrid", [(WX0 + WX1) / 2, y, wz + 0.014], [0, 0, 1], WX1 - WX0, 0.004);

  // ---------- the washing place along the -X wall ----------
  const XW = -W;
  // mirror over a shelf
  const MZ0 = -0.02, MZ1 = 0.5, MY0 = 0.95, MY1 = 1.5;
  box("metal", XW, XW + 0.02, MY0 - 0.02, MY1 + 0.02, MZ0 - 0.02, MZ1 + 0.02);
  plate("mirror", [XW + 0.021, (MY0 + MY1) / 2, (MZ0 + MZ1) / 2], [1, 0, 0], MZ1 - MZ0, MY1 - MY0);
  plate("foam", [XW + 0.022, MY1 - 0.12, MZ1 - 0.12], [1, 0, 0], 0.025, 0.16); // glint strokes
  plate("foam", [XW + 0.022, MY1 - 0.1, MZ1 - 0.07], [1, 0, 0], 0.012, 0.09);
  const SHY = 0.84;
  box("metal", XW, XW + 0.13, SHY, SHY + 0.025, MZ0 - 0.04, MZ1 + 0.04);
  box("metal", XW + 0.12, XW + 0.13, SHY + 0.025, SHY + 0.045, MZ0 - 0.04, MZ1 + 0.04); // lip
  // bottles: pump bottle, tall bottle, squat jar
  const BY = SHY + 0.025;
  lathe("red", [XW + 0.065, BY, 0.04], [[0.035, 0], [0.038, 0.02], [0.038, 0.16], [0.03, 0.18], [0.012, 0.19]], 10);
  rod("dark", [XW + 0.065, BY + 0.185, 0.04], [XW + 0.065, BY + 0.235, 0.04], 0.008, 6);
  rod("dark", [XW + 0.065, BY + 0.235, 0.04], [XW + 0.11, BY + 0.235, 0.04], 0.008, 6);
  lathe("leaf", [XW + 0.065, BY, 0.14], [[0.03, 0], [0.033, 0.02], [0.033, 0.2], [0.02, 0.22]], 10);
  lathe("dark", [XW + 0.065, BY + 0.215, 0.14], [[0.02, 0], [0.02, 0.035]], 8);
  lathe("cream", [XW + 0.065, BY, 0.25], [[0.042, 0], [0.045, 0.015], [0.045, 0.09], [0.038, 0.1]], 10);
  lathe("dark", [XW + 0.065, BY + 0.095, 0.25], [[0.04, 0], [0.04, 0.025]], 10);
  // mixer tap: wall body, two handles, spout
  const TPY = 0.55, TPZ = 0.28;
  box("metal", XW, XW + 0.06, TPY - 0.035, TPY + 0.035, TPZ - 0.14, TPZ + 0.14);
  for (const s of [-1, 1]) lathe("metal", [XW + 0.03, TPY + 0.035, TPZ + s * 0.11], [[0.022, 0], [0.025, 0.03], [0.018, 0.05]], 8);
  rod("metal", [XW + 0.05, TPY - 0.01, TPZ], [XW + 0.17, TPY - 0.03, TPZ], 0.014, 6);
  rod("metal", [XW + 0.17, TPY - 0.03, TPZ], [XW + 0.18, TPY - 0.07, TPZ], 0.013, 6);
  rod("dark", [XW + 0.03, TPY - 0.035, TPZ - 0.1], [XW + 0.03, TPY - 0.07, TPZ - 0.1], 0.012, 6); // hose outlet
  // riser bar with the shower head in its holder
  const BZ = 0.72;
  rod("metal", [XW + 0.04, 0.85, BZ], [XW + 0.04, 1.75, BZ], 0.012, 6);
  for (const y of [0.85, 1.75]) box("metal", XW, XW + 0.05, y - 0.02, y + 0.02, BZ - 0.02, BZ + 0.02);
  box("metal", XW + 0.02, XW + 0.08, 1.48, 1.54, BZ - 0.03, BZ + 0.03); // holder
  const HD = [XW + 0.1, 1.63, BZ], HB = [XW + 0.07, 1.47, BZ];
  rod("metal", [XW + 0.065, 1.4, BZ], HB, 0.014, 6); // handle
  rod("metal", HB, HD, 0.015, 6, 0.04); // flared head
  plate("dark", add(HD, [0.022, 0.012, 0]), nrm([0.85, 0.5, 0]), 0.055, 0.055); // nozzle face
  // hose: from the outlet down in a sag and up to the handle bottom
  path("dark", [[XW + 0.03, TPY - 0.07, TPZ - 0.1], [XW + 0.08, 0.32, TPZ - 0.02], [XW + 0.12, 0.24, 0.45], [XW + 0.11, 0.4, 0.66], [XW + 0.07, 0.9, BZ + 0.03], [XW + 0.065, 1.4, BZ]], 0.011, 6);
  // wash stool: a low seat on two slab legs, the seat dished; faces the tap
  place(-0.36, 0, 0.3, Math.PI / 2, () => {
    box("green", -0.17, 0.17, 0.2, 0.235, -0.12, 0.12);
    box("green", -0.15, -0.11, 0, 0.2, -0.12, 0.12);
    box("green", 0.11, 0.15, 0, 0.2, -0.12, 0.12);
    box("dark", -0.12, 0.12, 0.235, 0.238, -0.004, 0.004); // seat slot
  });
  // oke (basin): a yellow tapered bowl beside the stool, on the floor
  const OX = -0.1, OZ = 0.58;
  lathe("oke", [OX, 0, OZ], [[0.095, 0], [0.105, 0.01], [0.125, 0.11], [0.13, 0.12]], 14);
  annulus("okeIn", [OX, 0.1205, OZ], 0.0, 0.112, 14); // the inside seen as a disc
  annulus("dark", [OX, 0.1206, OZ], 0.112, 0.118, 14);

  // ---------- steam and ripples on joints ----------
  const WISPS = 8, RINGS = 3;
  const wisp = (i) => { // a tapered S-curved tube, local origin at its root
    const n = 14, pts = [], rad = [];
    const bend = i % 2 ? 1 : -1, ht = 0.3 + 0.05 * (i % 3);
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      pts.push([bend * 0.05 * Math.sin(t * Math.PI * 1.5), t * ht, 0.02 * Math.sin(t * Math.PI)]);
      rad.push(0.008 + 0.064 * Math.sin(Math.PI * Math.min(1, t * 1.1)) ** 0.6 * (1 - 0.45 * t));
    }
    tube(`steam${i}`, pts, rad, 8);
  };
  for (let i = 0; i < WISPS; i++) wisp(i);
  for (let k = 0; k < RINGS; k++) annulus(`ripple${k}`, [0, 0, 0], 0.86, 1, 22, 0.62);

  // ---------- meshes: static ones merged per material signature ----------
  const fit = [c.metal, c.metalShade, 0.3, 2];
  const MAT = {
    floor: [c.floor, c.floor, 0.1, 3],
    fgrout: [c.floorGrout, c.floorGrout, 0.1, 0],
    wall: [c.wall, c.wallShade, 0.1, 3],
    grout: [c.grout, c.grout, 0.1, 0],
    dark: [c.dark, c.dark, 0.1, 0],
    tub: [c.tub, c.tubShade, 0.2, 3],
    water: [c.waterLit, c.water, 0.85, 2],
    foam: [c.foam, c.foam, 0.1, 0],
    green: [c.green, c.greenShade, 0.15, 2],
    metal: fit,
    mirror: [c.mirror, c.mirror, 0.1, 0],
    frost: [c.frost, c.frost, 0.1, 0],
    fgrid: [c.frostGrid, c.frostGrid, 0.1, 0],
    oke: [c.oke, c.okeShade, 0.15, 2],
    okeIn: [c.okeShade, c.okeShade, 0.1, 0],
    red: [c.red, c.red, 0.1, 2],
    leaf: [c.leaf, c.leafShade, 0.15, 2],
    cream: [c.cream, c.creamShade, 0.15, 2],
  };
  const groups = new Map();
  for (const [key, soup] of Object.entries(soups)) {
    if (!MAT[key]) continue;
    const sig = MAT[key].join("|");
    if (!groups.has(sig)) groups.set(sig, { key, m: MAT[key], p: [], n: [] });
    const g = groups.get(sig);
    for (let i = 0; i < soup.p.length; i++) g.p.push(soup.p[i]), g.n.push(soup.n[i]);
  }
  const mk = (p, n, base, shade, threshold, px, ink) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    return kit.toon(g, base, shade, px ? { threshold, px, ...(ink ? { ink } : {}) } : { threshold, outline: false });
  };
  for (const { key, m, p, n } of groups.values()) {
    const mesh = mk(p, n, ...m);
    mesh.name = key;
    body.add(mesh);
  }
  const steam = [], ripples = [];
  for (let i = 0; i < WISPS; i++) {
    const j = new THREE.Group();
    j.name = `steam${i}`;
    const mesh = mk(soups[`steam${i}`].p, soups[`steam${i}`].n, c.foam, c.foamShade, 0.2, 2, c.foamShade);
    mesh.name = `wisp${i}`;
    j.add(mesh);
    body.add(j);
    joints[j.name] = j;
    steam.push(j);
  }
  for (let k = 0; k < RINGS; k++) {
    const j = new THREE.Group();
    j.name = `ripple${k}`;
    const mesh = mk(soups[`ripple${k}`].p, soups[`ripple${k}`].n, c.foam, c.foam, 0.1, 0);
    mesh.name = `ring${k}`;
    j.add(mesh);
    body.add(j);
    joints[j.name] = j;
    ripples.push(j);
  }

  // ---------- clip: steam (4 s loop) ----------
  // Wisp i: phase f = frac(t / 4 + i / 6). It rises from the water by 0.95 m over the loop, swelling in then
  // shrinking away (scale sin(pi f)), swaying in x and turning slowly. Ripple k: phase frac(t / 2 + k / 3); radius
  // 0.03 -> 0.19 m around the middle of the open water, sunk under the surface for the last 15 % (it fades out).
  const CLIPS = { steam: 4 };
  const ROOTS = [[0.12, -0.5], [0.42, -0.32], [0.62, -0.56], [0.26, -0.62], [0.5, -0.42], [0.04, -0.34], [0.34, -0.5], [0.7, -0.36]];
  const frac = (v) => v - Math.floor(v);
  function at(t) {
    for (let i = 0; i < WISPS; i++) {
      const f = frac(t / CLIPS.steam + i / WISPS), s = Math.sin(Math.PI * f) ** 0.7;
      const [x, z] = ROOTS[i];
      steam[i].position.set(x + 0.06 * Math.sin(2 * Math.PI * (f + i * 0.17)), WL + 0.02 + f * 0.95, z + 0.03 * f);
      steam[i].scale.set(0.6 + 0.6 * s, 0.4 + 0.9 * s, 0.6 + 0.6 * s).multiplyScalar(Math.max(0.001, s));
      steam[i].rotation.set(0, 0.6 * i + 2 * Math.PI * f * 0.25, 0.15 * Math.sin(2 * Math.PI * f));
    }
    for (let k = 0; k < RINGS; k++) {
      const f = frac(t / 2 + k / RINGS), r = 0.03 + 0.16 * f;
      ripples[k].position.set(RC[0], f < 0.85 ? WL + 0.0025 : WL - 0.01, RC[1]);
      ripples[k].scale.set(r, 1, r);
    }
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`ofuro: no clip "${m[1]}" (clips: steam)`);
      at(+m[2]);
    } else if (name === "rest") at(1.2);
    else throw new Error(`ofuro: unknown pose "${name}" (rest, or steam@<seconds>)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
