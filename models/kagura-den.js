// kagura-den.js - a Shinto shrine kagura dance stage (kaguraden): a raised open wooden stage on stone footings, a low
// railing on three sides with steps up at the front, under a deep hip-gable (irimoya) roof with a thick thatch edge.
// A shimenawa rope with paper shide strips runs along the front beam, two paper lanterns hang at the front corners, a
// taiko stands at the back before a bamboo-and-cloth backdrop with a crest circle. One set with models/shrine.js,
// models/torii.js and models/temizuya.js (same script, same wood / stone / dark-roof pairs).
// Contract: harness/lab/README.md. Meters, +Y up, the audience side (steps) faces +Z, its left is +X, stands on y = 0,
// centred on x = 0, z = 0.
//
// Construction (THREE primitives placed by matrices plus a few custom lofts, merged into one mesh per material; winding
// from three.js or picked per triangle against an outward hint, never by hand):
//   STAGE    a 5.5 x 4.3 deck slab 1.0 m up on twelve stilts, each on a stone footing; the four corner stilts run on up
//            as the main posts. A sill round the post line and low ties between the stilts read as an open underfloor.
//            Flat dark plank lines run across the deck.
//   RAILING  a low koran (0.5 m) on the two sides and the front, with posts, a round top rail and a mid rail; the front
//            opens in the middle for a five-riser stair down to a stone slab. The back is the backdrop.
//   ROOF     one closed solid lofted through nested rectangular rings, so the hip lines are exact ring corners. A ring
//            at parameter d (0 eave .. 1 ridge) has half sizes X(d), Z(d) and height Y(d) (sagging below its chord, so
//            the slopes curve). X shrinks to the gable half width XG at d = DG and then stays there: above DG the x-sides
//            of the rings are vertical and stack into the gable triangle (tsuma), the irimoya cue, for free. The corners
//            sweep up (sori, lift = L (|x|/XE * |z|/ZE)^2). Material groups under one hull: a dark top, a vertical cut
//            edge 0.38 m thick at the eaves (pale, the thatch look: the identity cue at the thumbnail), a dark soffit, and
//            the gable wall in wood. Two dark stripe lines run round the cut edge; a pale band follows each gable rake; a
//            dark lattice of lines fills the gable. A thick dark ridge log caps it.
//   FITTINGS shimenawa: a fat twisted three-strand rope sagging along the front beam (radius 0.1 mid, tapering closed
//            into the corner posts). Six shide (four stepped paper panels each) hang from it. Two paper lanterns
//            (lathe, dark caps and ribs) hang on cords from the front beam outside the rope. A taiko (red lathe barrel,
//            pale heads, turned 25 deg to the lit side) on a dark stand at the back left. The backdrop: a pleated white
//            cloth on a dark bamboo frame between the back posts, a red crest ring with a red centre disc (no text).
// Proportions (real size, base unit the deck height D = 1.0 m): posts at x +-2.4, z +-1.8 (0.22 dia) to the head beams
//   2.95-3.2; deck 5.5 x 4.3 x 0.12; railing 0.5 D; stair 1.3 wide, 5 risers of 0.2 D, run 0.27; roof eaves XE 3.35,
//   ZE 2.75 (0.95 past the posts) at 3.35 (cut edge to 2.97), gable base 4.1 at XG 1.7, ridge 5.2, log to 5.34;
//   rope sag 0.3; shide 0.44 long; lanterns 0.36 dia x 0.5; taiko 0.6 dia x 0.55 at 1.72; backdrop to 2.8.
// Options: build(THREE, kit, colors, { height }): height scales the whole set uniformly so its top is `height` (5.344).
// Clips: breeze (3 s, looping): the shide swing and flutter (more at their tips, each on its own phase) and the lanterns
//   rock on their cords. The shide, lantern and cap meshes are rewritten per frame (positions, normals, hull normals)
//   from each piece's pivot, so they stay three draw calls. pose("rest") hangs everything straight.
// Colours (noon), base / shade:
//   wood (posts, beams, deck, rails, stair, struts, gable wall)  skin #f0c2ae / iris #5c3d32, threshold 0.2 (hinoki)
//   stone (footings, stair slab)                                  sky #f2d7ae / iris #5c3d32, threshold 0.25
//   roof top, soffit, ridge log, bamboo, drum stand, caps         iris #5c3d32 / hair #241c16, threshold 0.1
//   thatch cut edge, rake bands, shimenawa                        sky #f2d7ae / iris #5c3d32 (rope at 0.35: the twist)
//   lines (deck planks, edge stripes, lattice, bamboo nodes)      hair #241c16 flat, no hull
//   shide                                                         practical #fffaf2 / moon #fff6e4, threshold -0.4
//   lanterns, drum barrel, crest                                  accent #c4452d / iris #5c3d32, threshold 0.1
//   backdrop cloth, drum heads                                    sclera #f6f3ee / sky #f2d7ae, threshold 0.15

export const meta = {
  name: "kagura-den",
  height: 5.344,
  script: "noon",
  colors: {
    wood: "#f0c2ae", woodShade: "#5c3d32",
    stone: "#f2d7ae", stoneShade: "#5c3d32",
    roof: "#5c3d32", roofShade: "#241c16",
    thatch: "#f2d7ae", thatchShade: "#5c3d32",
    line: "#241c16",
    rope: "#f2d7ae", ropeShade: "#5c3d32",
    shide: "#fffaf2", shideShade: "#fff6e4",
    lantern: "#c4452d", lanternShade: "#5c3d32",
    dark: "#5c3d32", darkShade: "#241c16",
    cloth: "#f6f3ee", clothShade: "#f2d7ae",
    crest: "#c4452d", crestShade: "#5c3d32",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const H0 = meta.height;
  const { height = H0 } = opts;
  const root = new THREE.Group();
  root.name = "kagura-den";
  const body = new THREE.Group(); // the uniform size scale lives here, root stays the plain contract node
  body.name = "body";
  body.scale.setScalar(height / H0);
  root.add(body);
  const stage = new THREE.Group();
  stage.name = "stage";
  stage.position.set(0, 1.0, 0);
  body.add(stage);
  const joints = { stage };

  // ---------- soups: per material positions, normals and an owner per vertex (the moving piece it belongs to) ----------
  const soups = {};
  let owner = -1;
  const soup = (k) => (soups[k] ??= { p: [], n: [], o: [] });
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e3 = new THREE.Euler(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3();
  const n3 = new THREE.Matrix3();
  function put(key, geo, mat) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.applyMatrix4(mat);
    const s = soup(key), P = g.attributes.position.array, N = g.attributes.normal.array;
    for (let i = 0; i < P.length; i++) s.p.push(P[i]), s.n.push(N[i]);
    for (let i = 0; i < P.length / 3; i++) s.o.push(owner);
  }
  function add(key, geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    q4.setFromEuler(e3.set(rx, ry, rz));
    put(key, geo, m4.compose(p3.set(x, y, z), q4, s3.set(1, 1, 1)));
  }
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cyl = (r0, r1, h, n = 10) => new THREE.CylinderGeometry(r0, r1, h, n);
  // a cylinder from point a to point b (radius ra at a, rb at b)
  function rod(key, a, b, ra, rb = ra, n = 10) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const d = B.clone().sub(A), len = d.length();
    q4.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    put(key, cyl(rb, ra, len, n), m4.compose(A.add(B).multiplyScalar(0.5), q4, s3.set(1, 1, 1)));
  }
  // one triangle, wound so its normal points along `out`, flat normal
  function tri(key, a, b, e, out) {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [e[0] - a[0], e[1] - a[1], e[2] - a[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const l = Math.hypot(...n);
    if (l < 1e-9) return;
    n = n.map((x) => x / l);
    const flip = n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0;
    if (flip) [b, e] = [e, b], (n = n.map((x) => -x));
    const s = soup(key);
    s.p.push(...a, ...b, ...e);
    for (let i = 0; i < 3; i++) s.n.push(...n), s.o.push(owner);
  }
  const quad = (key, a, b, e, f, out) => (tri(key, a, b, e, out), tri(key, a, e, f, out));

  // ---------- stage: stilts, footings, sill, deck, planks ----------
  const DECK = 1.0, PX = 2.4, PZ = 1.8, PR = 0.11, BEAM0 = 2.95, BEAM1 = 3.2;
  const DX = 2.75, DZ = 2.15;
  for (const x of [-PX, -0.8, 0.8, PX]) for (const z of [-PZ, 0, PZ]) {
    if (z === 0 && Math.abs(x) < 1) continue; // the middle two would hide under the deck anyway
    const corner = Math.abs(x) === PX && z !== 0;
    rod("wood", [x, 0.12, z], [x, corner ? BEAM1 - 0.02 : DECK - 0.1, z], corner ? PR : 0.09, corner ? PR : 0.09, 10);
    add("stone", box(0.36, 0.16, 0.36), x, 0.08, z);
    add("stone", box(0.26, 0.06, 0.26), x, 0.18, z, 0, Math.PI / 4, 0); // a chamfered top course
  }
  for (const sz of [1, -1]) {
    add("wood", box(2 * PX + 0.2, 0.2, 0.14), 0, DECK - 0.22, sz * PZ); // sill under the deck
    add("wood", box(2 * PX, 0.09, 0.08), 0, 0.46, sz * PZ); // low tie between stilts
  }
  for (const sx of [1, -1]) {
    add("wood", box(0.14, 0.2, 2 * PZ + 0.2), sx * PX, DECK - 0.22, 0);
    add("wood", box(0.08, 0.09, 2 * PZ), sx * PX, 0.46, 0);
  }
  add("wood", box(2 * DX, 0.12, 2 * DZ), 0, DECK - 0.06, 0); // deck slab
  for (let x = -DX + 0.3; x < DX - 0.1; x += 0.3) add("line", box(0.014, 0.004, 2 * DZ - 0.04), x, DECK + 0.002, 0);

  // ---------- railing (sides and front, front open for the stair) ----------
  const RX = DX - 0.08, RZ = DZ - 0.08, RH = DECK + 0.5, GAP = 0.72;
  const railPosts = [];
  for (const sx of [1, -1]) {
    rod("wood", [sx * RX, RH, -PZ], [sx * RX, RH, RZ], 0.035, 0.035, 8);
    add("wood", box(0.04, 0.05, RZ + PZ), sx * RX, DECK + 0.22, (RZ - PZ) / 2);
    for (let i = 0; i <= 5; i++) railPosts.push([sx * RX, -PZ + ((RZ + PZ) * i) / 5]);
    rod("wood", [sx * RX, RH, RZ], [sx * GAP, RH, RZ], 0.035, 0.035, 8);
    add("wood", box(RX - GAP, 0.05, 0.04), (sx * (RX + GAP)) / 2, DECK + 0.22, RZ);
    for (let i = 1; i <= 3; i++) railPosts.push([sx * (RX - ((RX - GAP) * i) / 3), RZ]);
  }
  for (const [x, z] of railPosts) {
    add("wood", box(0.07, 0.5, 0.07), x, DECK + 0.25, z);
    if (Math.abs(x) === GAP) add("wood", new THREE.SphereGeometry(0.06, 8, 6), x, RH + 0.04, z); // giboshi knob at the gap
  }

  // ---------- stair down the front ----------
  const SW = 1.3, RUN = 0.27, NR = 5, RISE = DECK / NR;
  for (let i = 1; i < NR; i++) add("wood", box(SW, 0.05, RUN + 0.03), 0, DECK - i * RISE - 0.025, DZ + (i - 0.5) * RUN);
  for (const sx of [1, -1]) {
    const a = [sx * (SW / 2 + 0.04), DECK - 0.02, DZ - 0.05], b = [sx * (SW / 2 + 0.04), 0.11, DZ + (NR - 1) * RUN + 0.1];
    const L = Math.hypot(b[1] - a[1], b[2] - a[2]);
    add("wood", box(0.07, 0.2, L), a[0], (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, Math.atan2(a[1] - b[1], b[2] - a[2]), 0, 0);
  }
  add("stone", box(SW + 0.4, 0.08, 0.55), 0, 0.04, DZ + (NR - 1) * RUN + 0.05);

  // ---------- head beams and struts up into the roof ----------
  for (const sz of [1, -1]) add("wood", box(2 * PX + 0.45, BEAM1 - BEAM0, 0.16), 0, (BEAM0 + BEAM1) / 2, sz * PZ);
  for (const sx of [1, -1]) add("wood", box(0.16, BEAM1 - BEAM0, 2 * PZ + 0.45), sx * PX, (BEAM0 + BEAM1) / 2, 0);
  for (const x of [-PX, -1.2, 0, 1.2, PX]) for (const sz of [1, -1]) add("wood", box(0.22, 0.5, 0.18), x, BEAM1 + 0.24, sz * PZ);
  for (const sx of [1, -1]) for (const z of [-0.9, 0, 0.9]) add("wood", box(0.18, 0.5, 0.22), sx * PX, BEAM1 + 0.24, z);

  // ---------- roof: nested rings, hip below DG, gable above ----------
  const XE = 3.35, ZE = 2.75, YE = 3.35, YR = 5.2, XG = 1.7, DG = 0.55, SAG = 0.3, T = 0.38, LIFT = 0.36;
  const Yd = (d) => YE + (YR - YE) * (d - SAG * d * (1 - d));
  const Xd = (d) => (d < DG ? XE - ((XE - XG) * d) / DG : XG);
  const Zd = (d) => ZE * (1 - d);
  const lift = (x, z) => LIFT * Math.pow((Math.abs(x) / XE) * (Math.abs(z) / ZE), 2);
  const MX = 16, MZ = 12, SIDES = [MX, MZ, MX, MZ], OUT = [[0, 0, 1], [-1, 0, 0], [0, 0, -1], [1, 0, 0]];
  // ring points: side 0 front (+Z, x from +X to -X), 1 right (-X), 2 back, 3 left (+X); `off` pushes along the side normal
  function ring(d, drop = 0, off = 0, ext = 0) {
    const X = Xd(d), Z = Zd(d), C = [[X, Z], [-X, Z], [-X, -Z], [X, -Z], [X, Z]], pts = [];
    for (let s = 0; s < 4; s++) {
      const [ax, az] = C[s], [bx, bz] = C[s + 1], o = OUT[s];
      for (let j = 0; j <= SIDES[s]; j++) {
        const t = j / SIDES[s], tt = -ext + t * (1 + 2 * ext);
        const x = ax + (bx - ax) * tt + o[0] * off, z = az + (bz - az) * tt + o[2] * off;
        pts.push({ p: [x, Yd(d) + lift(ax + (bx - ax) * t, az + (bz - az) * t) - drop, z], s });
      }
    }
    return pts;
  }
  const RD = [0, 0.06, 0.13, 0.21, 0.3, 0.39, 0.47, DG, 0.63, 0.71, 0.79, 0.86, 0.92, 0.97, 1];
  const rings = RD.map((d) => ring(d));
  for (let r = 0; r < rings.length - 1; r++) {
    const A = rings[r], B = rings[r + 1], wall = RD[r] >= DG;
    for (let j = 0; j < A.length - 1; j++) {
      if (A[j].s !== A[j + 1].s) continue;
      const s = A[j].s, isWall = wall && (s === 1 || s === 3);
      quad(isWall ? "rWall" : "rTop", A[j].p, A[j + 1].p, B[j + 1].p, B[j].p, isWall ? OUT[s] : [0, 1, 0]);
    }
  }
  const eave = rings[0], eaveLow = ring(0, T);
  for (let j = 0; j < eave.length - 1; j++) {
    if (eave[j].s !== eave[j + 1].s) continue;
    quad("rEdge", eave[j].p, eave[j + 1].p, eaveLow[j + 1].p, eaveLow[j].p, OUT[eave[j].s]);
  }
  const DU = [0, 0.12, 0.25, 0.4], under = DU.map((d) => ring(d, T));
  for (let r = 0; r < under.length - 1; r++) {
    const A = under[r], B = under[r + 1];
    for (let j = 0; j < A.length - 1; j++) {
      if (A[j].s !== A[j + 1].s) continue;
      quad("rUnder", A[j].p, A[j + 1].p, B[j + 1].p, B[j].p, [0, -1, 0]);
    }
  }
  const last = under[under.length - 1], ctr = [0, Yd(0.4) - T, 0];
  for (let j = 0; j < last.length - 1; j++) if (last[j].s === last[j + 1].s) tri("rUnder", ctr, last[j].p, last[j + 1].p, [0, -1, 0]);
  // stripe lines round the cut edge
  for (const f of [0.36, 0.7]) {
    const hi = ring(0, f * T - 0.016, 0.007, 0.004), lo = ring(0, f * T + 0.016, 0.007, 0.004);
    for (let j = 0; j < hi.length - 1; j++) {
      if (hi[j].s !== hi[j + 1].s) continue;
      quad("line", hi[j].p, hi[j + 1].p, lo[j + 1].p, lo[j].p, OUT[hi[j].s]);
    }
  }
  // gable: a pale rake band along each roof edge, a dark lattice in the wall below it
  const rakeY = (z) => Yd(1 - Math.abs(z) / ZE);
  for (const sx of [1, -1]) {
    const zs = [];
    for (let i = 0; i <= 10; i++) zs.push(-Zd(DG) + (2 * Zd(DG) * i) / 10);
    for (let i = 0; i < zs.length - 1; i++) {
      const za = zs[i], zb = zs[i + 1];
      const pa = (zz, dy, dx) => [sx * (XG + dx), rakeY(zz) + lift(XG, zz) - dy + 0.02, zz];
      const BH = 0.3;
      for (const [dx, o] of [[0.045, [sx, 0, 0]], [-0.01, [-sx, 0, 0]]]) quad("edge", pa(za, 0, dx), pa(zb, 0, dx), pa(zb, BH, dx), pa(za, BH, dx), o);
      quad("edge", pa(za, BH, -0.01), pa(zb, BH, -0.01), pa(zb, BH, 0.045), pa(za, BH, 0.045), [0, -1, 0]);
      quad("edge", pa(za, 0, -0.01), pa(zb, 0, -0.01), pa(zb, 0, 0.045), pa(za, 0, 0.045), [0, 1, 0]);
    }
    for (const zz of [-Zd(DG), Zd(DG)]) { // close the band ends
      const pa = (dy, dx) => [sx * (XG + dx), rakeY(zz) + lift(XG, zz) - dy + 0.02, zz];
      quad("edge", pa(0, -0.01), pa(0, 0.045), pa(0.3, 0.045), pa(0.3, -0.01), [0, 0, Math.sign(zz)]);
    }
    const yb = Yd(DG) + 0.04;
    for (let z = -Zd(DG) + 0.3; z < Zd(DG) - 0.2; z += 0.26) {
      const yt = rakeY(z) - 0.3;
      if (yt > yb + 0.05) quad("line", [sx * (XG + 0.006), yb, z - 0.012], [sx * (XG + 0.006), yb, z + 0.012], [sx * (XG + 0.006), yt, z + 0.012], [sx * (XG + 0.006), yt, z - 0.012], [sx, 0, 0]);
    }
    for (const y of [yb + 0.32, yb + 0.68]) {
      let z0 = Zd(DG); // walk in from the gable base until the line clears the rake band
      for (let k = 0; k < 40 && rakeY(z0) - 0.3 < y; k++) z0 -= 0.03;
      if (z0 > 0.1) quad("line", [sx * (XG + 0.006), y - 0.012, -z0], [sx * (XG + 0.006), y - 0.012, z0], [sx * (XG + 0.006), y + 0.012, z0], [sx * (XG + 0.006), y + 0.012, -z0], [sx, 0, 0]);
    }
  }
  rod("dark", [-XG - 0.12, YR + 0.02, 0], [XG + 0.12, YR + 0.02, 0], 0.13, 0.13, 10); // ridge log
  for (const x of [-1.1, -0.35, 0.35, 1.1]) add("dark", box(0.12, 0.08, 0.5), x, YR + 0.1, 0); // ridge ties

  // ---------- shimenawa along the front beam ----------
  const RZ0 = PZ + 0.12, RY0 = BEAM0 - 0.04, SAGR = 0.3, HX = PX - 0.05;
  const ropeY = (x) => RY0 - SAGR * (1 - (x / HX) ** 2);
  const ropeR = (x) => 0.045 + 0.06 * (1 - (x / HX) ** 2);
  {
    const NS = 72, NA = 12, rr = [];
    for (let i = 0; i <= NS; i++) {
      const x = -HX + (2 * HX * i) / NS, row = [];
      const taper = Math.min(1, (HX - Math.abs(x)) / 0.12 + 0.15);
      for (let a = 0; a < NA; a++) {
        const ph = (a / NA) * Math.PI * 2;
        const r = ropeR(x) * taper * (1 + 0.16 * Math.cos(3 * ph - x * 9));
        row.push([x, ropeY(x) + r * Math.cos(ph), RZ0 + r * Math.sin(ph)]);
      }
      rr.push(row);
    }
    for (let i = 0; i < NS; i++) for (let a = 0; a < NA; a++) {
      const b = (a + 1) % NA, cx = -HX + (2 * HX * (i + 0.5)) / NS, cy = ropeY(cx);
      const P = rr[i][a], o = [0, P[1] - cy, P[2] - RZ0];
      quad("rope", rr[i][a], rr[i][b], rr[i + 1][b], rr[i + 1][a], o);
    }
    for (const [i, sx] of [[0, -1], [NS, 1]]) {
      const tip = [sx * (HX + 0.03), ropeY(sx * HX), RZ0];
      for (let a = 0; a < NA; a++) tri("rope", tip, rr[i][a], rr[i][(a + 1) % NA], [sx, 0, 0]);
    }
  }

  // ---------- shide: stepped paper strips hanging from the rope (moving: owner = shide index) ----------
  const SHIDE_X = [-1.6, -0.96, -0.32, 0.32, 0.96, 1.6], shidePivot = [];
  const PW = 0.1, PH = 0.125, PT = 0.012;
  SHIDE_X.forEach((x, k) => {
    owner = k;
    const top = ropeY(x) - ropeR(x) * 0.6;
    shidePivot.push([x, top, RZ0]);
    for (let i = 0; i < 4; i++) {
      const ox = (i % 2 ? 1 : -1) * 0.022 * (i === 0 ? 0 : 1);
      add("shide", box(PW, PH + 0.006, PT), x + ox, top - PH / 2 - i * PH, RZ0 + 0.002 * i);
    }
  });
  owner = -1;

  // ---------- lanterns on cords from the front beam (moving: owner = lantern index) ----------
  const LX = 1.98, LR = 0.18, LH = 0.5, lanternPivot = [];
  [LX, -LX].forEach((x, k) => {
    owner = k;
    const py = BEAM0, pz = PZ + 0.02, top = py - 0.26;
    lanternPivot.push([x, py, pz]);
    rod("cap", [x, py + 0.01, pz], [x, top + 0.02, pz], 0.012, 0.012, 6); // cord
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const s = i / 10;
      pts.push(new THREE.Vector2(0.06 + (LR - 0.06) * Math.sin(Math.PI * s) ** 0.6, -(1 - s) * LH)); // bottom to top: the lathe faces out
    }
    put("lantern", new THREE.LatheGeometry(pts, 14), m4.makeTranslation(x, top, pz));
    add("cap", cyl(0.075, 0.075, 0.05, 12), x, top, pz);
    add("cap", cyl(0.075, 0.075, 0.05, 12), x, top - LH, pz);
    for (const s of [0.33, 0.67]) {
      const r = 0.06 + (LR - 0.06) * Math.sin(Math.PI * s) ** 0.6;
      add("cap", new THREE.TorusGeometry(r + 0.004, 0.009, 4, 18), x, top - s * LH, pz, Math.PI / 2, 0, 0);
    }
  });
  owner = -1;

  // ---------- backdrop: pleated cloth on a bamboo frame between the back posts ----------
  const BZ = -PZ + 0.03, BT = 2.8, BB = DECK + 0.02, BX = PX - PR - 0.02;
  rod("dark", [-PX, BT + 0.04, BZ], [PX, BT + 0.04, BZ], 0.045, 0.045, 10);
  for (const sx of [1, -1]) rod("dark", [sx * (BX - 0.03), DECK, BZ], [sx * (BX - 0.03), BT + 0.04, BZ], 0.04, 0.04, 10);
  for (const x of [-1.5, -0.5, 0.5, 1.5]) add("line", cyl(0.05, 0.05, 0.02, 10), x, BT + 0.04, BZ, 0, 0, Math.PI / 2);
  for (const sx of [1, -1]) for (const y of [1.6, 2.25]) add("line", cyl(0.046, 0.046, 0.02, 10), sx * (BX - 0.03), y, BZ);
  {
    const NXC = 64, CT = 0.02, cx0 = -BX + 0.05, cx1 = BX - 0.05;
    const zf = (x, y) => BZ + 0.05 + 0.03 * Math.sin(((x - cx0) / 0.36) * Math.PI * 2) * (0.4 + 0.6 * (BT - y) / (BT - BB));
    for (let i = 0; i < NXC; i++) {
      const xa = cx0 + ((cx1 - cx0) * i) / NXC, xb = cx0 + ((cx1 - cx0) * (i + 1)) / NXC;
      const F = (x, y, dz) => [x, y, zf(x, y) + dz];
      quad("cloth", F(xa, BB, 0), F(xb, BB, 0), F(xb, BT, 0), F(xa, BT, 0), [0, 0, 1]);
      quad("cloth", F(xa, BB, -CT), F(xb, BB, -CT), F(xb, BT, -CT), F(xa, BT, -CT), [0, 0, -1]);
      quad("cloth", F(xa, BT, 0), F(xb, BT, 0), F(xb, BT, -CT), F(xa, BT, -CT), [0, 1, 0]);
      quad("cloth", F(xa, BB, 0), F(xb, BB, 0), F(xb, BB, -CT), F(xa, BB, -CT), [0, -1, 0]);
    }
    for (const x of [cx0, cx1]) quad("cloth", [x, BB, zf(x, BB)], [x, BT, zf(x, BT)], [x, BT, zf(x, BT) - CT], [x, BB, zf(x, BB) - CT], [Math.sign(x), 0, 0]);
    // crest: a red ring and a red disc, flat, just proud of the pleat crests
    const CY = 2.02, CZ = BZ + 0.05 + 0.045;
    add("crest", new THREE.RingGeometry(0.33, 0.43, 32), 0, CY, CZ);
    add("crest", new THREE.CircleGeometry(0.17, 24), 0, CY, CZ);
  }

  // ---------- taiko on its stand, back left ----------
  {
    const DCx = 1.25, DCy = DECK + 0.72, DCz = -1.05, DR = 0.3, DL = 0.55, yaw = 0.44, tilt = 0.08;
    const qd = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 - tilt, 0, 0)); // lathe y -> +z, tipped up
    qd.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
    const M = new THREE.Matrix4().compose(new THREE.Vector3(DCx, DCy, DCz), qd, new THREE.Vector3(1, 1, 1));
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const s = i / 8;
      pts.push(new THREE.Vector2(DR * (0.92 + 0.1 * Math.sin(Math.PI * s)), -DL / 2 + s * DL));
    }
    put("drum", new THREE.LatheGeometry(pts, 20), M);
    for (const sy of [1, -1]) {
      const g = cyl(DR * 0.93, DR * 0.93, 0.02, 20);
      g.translate(0, sy * (DL / 2 + 0.005), 0);
      put("cloth", g, M);
      const r = new THREE.TorusGeometry(DR * 0.93, 0.016, 4, 20);
      r.rotateX(Math.PI / 2), r.translate(0, sy * (DL / 2 - 0.02), 0);
      put("dark", r, M);
    }
    // stand: two A-frames either side of the barrel along its axis, a skid under each, a cross bar
    const ax = new THREE.Vector3(0, 0, 1).applyQuaternion(qd).setY(0).normalize(), pe = new THREE.Vector3(ax.z, 0, -ax.x);
    for (const s of [1, -1]) {
      const cxs = DCx + ax.x * s * 0.2, czs = DCz + ax.z * s * 0.2;
      for (const t of [1, -1]) rod("dark", [cxs + pe.x * t * 0.32, DECK, czs + pe.z * t * 0.32], [cxs + pe.x * t * 0.1, DCy - DR + 0.02, czs + pe.z * t * 0.1], 0.03, 0.03, 6);
      rod("dark", [cxs + pe.x * 0.38, DECK + 0.03, czs + pe.z * 0.38], [cxs - pe.x * 0.38, DECK + 0.03, czs - pe.z * 0.38], 0.035, 0.035, 6);
    }
    rod("dark", [DCx + ax.x * 0.2, DECK + 0.28, DCz + ax.z * 0.2], [DCx - ax.x * 0.2, DECK + 0.28, DCz - ax.z * 0.2], 0.025, 0.025, 6);
  }

  // ---------- meshes ----------
  const geoOf = ({ p, n }) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    return g;
  };
  // roof solid: one mesh, four material groups, one hull
  {
    const parts = ["rTop", "rEdge", "rUnder", "rWall"].map((k) => soups[k]);
    const p = [], n = [], g = new THREE.BufferGeometry();
    let start = 0;
    parts.forEach((s, i) => {
      p.push(...s.p), n.push(...s.n);
      g.addGroup(start, s.p.length / 3, i);
      start += s.p.length / 3;
    });
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = new THREE.Mesh(g, [
      kit.cel(c.roof, c.roofShade, { threshold: 0.1 }),
      kit.cel(c.thatch, c.thatchShade, { threshold: 0.1 }),
      kit.cel(c.roof, c.roofShade, { threshold: 0.1 }),
      kit.cel(c.wood, c.woodShade, { threshold: 0.2 }),
    ]);
    mesh.name = "roof";
    body.add(kit.outline(mesh));
    for (const k of ["rTop", "rEdge", "rUnder", "rWall"]) delete soups[k];
  }
  const MAT = {
    wood: [c.wood, c.woodShade, 0.2], stone: [c.stone, c.stoneShade, 0.25], edge: [c.thatch, c.thatchShade, 0.1],
    line: [c.line, c.line, 0.1, 0], rope: [c.rope, c.ropeShade, 0.35, 3], shide: [c.shide, c.shideShade, -0.4, 2],
    lantern: [c.lantern, c.lanternShade, 0.0, 3], cap: [c.dark, c.darkShade, 0.1, 2], dark: [c.dark, c.darkShade, 0.1, 3],
    cloth: [c.cloth, c.clothShade, 0.15], crest: [c.crest, c.crestShade, 0.1, 2], drum: [c.lantern, c.lanternShade, 0.1],
  };
  const moving = {}; // key -> { mesh, base positions/normals/hull, owners }
  for (const [key, s] of Object.entries(soups)) {
    const [b, sh, threshold, px] = MAT[key];
    const g = geoOf(s);
    const mesh = px === 0 ? new THREE.Mesh(g, kit.cel(b, sh, { threshold })) : kit.toon(g, b, sh, px ? { threshold, px } : { threshold });
    mesh.name = key;
    body.add(mesh);
    if (key === "shide" || key === "lantern" || key === "cap") {
      kit.hullNormals(g);
      const hn = g.attributes.hullNormal;
      moving[key] = { g, p: Float32Array.from(s.p), n: Float32Array.from(s.n), h: hn ? Float32Array.from(hn.array) : null, o: s.o };
    }
  }

  // rotate a moving mesh's vertices about their owner's pivot: rot(k, dropBelowPivot) -> [ax, az] (radians about x, z)
  function rewrite(key, pivots, rot) {
    const m = moving[key];
    if (!m) return;
    const P = m.g.attributes.position.array, N = m.g.attributes.normal.array, H = m.g.attributes.hullNormal?.array;
    for (let v = 0; v < m.o.length; v++) {
      const i = v * 3, [cx, cy, cz] = pivots[m.o[v]];
      const [ax, az] = rot(m.o[v], cy - m.p[i + 1]);
      const ca = Math.cos(ax), sa = Math.sin(ax), cb = Math.cos(az), sb = Math.sin(az);
      const tf = (x, y, z) => { // about x (y, z), then about z (x, y)
        const y1 = y * ca - z * sa, z1 = y * sa + z * ca;
        return [x * cb - y1 * sb, x * sb + y1 * cb, z1];
      };
      const q = tf(m.p[i] - cx, m.p[i + 1] - cy, m.p[i + 2] - cz);
      P[i] = cx + q[0], P[i + 1] = cy + q[1], P[i + 2] = cz + q[2];
      const nn = tf(m.n[i], m.n[i + 1], m.n[i + 2]);
      N[i] = nn[0], N[i + 1] = nn[1], N[i + 2] = nn[2];
      if (H && m.h) {
        const hh = tf(m.h[i], m.h[i + 1], m.h[i + 2]);
        H[i] = hh[0], H[i + 1] = hh[1], H[i + 2] = hh[2];
      }
    }
    m.g.attributes.position.needsUpdate = m.g.attributes.normal.needsUpdate = true;
    if (H) m.g.attributes.hullNormal.needsUpdate = true;
    m.g.computeBoundingSphere(), m.g.computeBoundingBox();
  }

  // ---------- poses and clips ----------
  // Sign convention: +ax swings a hanging piece's lower end toward +Z (the audience), +az toward +X.
  const CLIPS = { breeze: 3 };
  const SH_PH = [0, 1.7, 3.1, 0.8, 2.4, 4.0], LN_PH = [0.6, 2.2];
  function apply(u, amp) { // u in [0, 1): the loop phase
    const w = (ph, k = 1) => Math.sin(2 * Math.PI * u * k + ph);
    rewrite("shide", shidePivot, (k, d) => {
      const bend = 0.6 + 0.8 * (d / 0.5);
      return [amp * bend * (0.2 * w(SH_PH[k]) + 0.06 * w(2 * SH_PH[k], 2) + 0.08), amp * bend * 0.1 * w(SH_PH[k] + 1.3, 1)];
    });
    const lan = (k) => [amp * (0.05 * w(LN_PH[k]) + 0.03), amp * 0.1 * w(LN_PH[k] + 1.1)];
    rewrite("lantern", lanternPivot, lan);
    rewrite("cap", lanternPivot, lan);
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`kagura-den: no clip "${m[1]}" (clips: breeze)`);
      const T0 = CLIPS[m[1]];
      return apply((((+m[2] % T0) + T0) % T0) / T0, 1);
    }
    if (name !== "rest") throw new Error(`kagura-den: unknown pose "${name}" (rest, or breeze@<seconds>)`);
    apply(0, 0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
