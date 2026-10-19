// lookout.js - a hilltop observation point over a town, the anime ending-scene viewpoint, static.
// Contract: harness/lab/README.md. Meters, +Y up, the visitor's side faces +Z (the bench back and the path), the
// view and the drop lie toward -Z, its left is +X (the lamp), stands on y = 0 (the valley floor), centred on x = 0, z = 0.
//
// Construction (boxes, prisms, swept tubes and low-poly blobs, all triangle soups merged per material; flat-shaded
// except tubes and blobs, which carry radial normals):
//   HILL     one closed hexahedron, its top the hilltop at P = 2.6 m: a steep cliff (70 deg) down to the valley floor
//            toward the view, so there is a visible drop between the railing and the town; the visitor's side is a cut
//            leaning in 0.5 m (a diorama base, in shade). A grass verge slab on top, a paved platform on that (11 cm,
//            so its edge reads as a kerb) and a path to the back edge.
//   RAILING  tube posts every ~0.8 m along the drop edge, a top rail and a mid rail, short returns at both ends.
//   FIXTURES a coin binocular viewer (tube post, a squat body box with a hood, two eyepieces toward the visitor and
//            two fat objective barrels toward the view) tilted down 8 deg; a park bench facing the view (four seat
//            slats, two back slats on cast side frames); a lamp post (tube with a crook, lantern box, cap); a small
//            blank information board on two posts, its panel turned toward the visitor.
//   TREE     a cherry after riverbank-path: a bent bole forking at 1.9 m, six limbs that split in two, four crown limbs,
//            all dark tubes; a cluster of 1-3 small flattened blobs at every tip and elbow, so limbs show in the gaps.
//   TOWN     a forced-perspective spread on the valley floor past the cliff foot: eight rows of wall boxes with gable
//            prisms, each row further out smaller (scale 0.50 -> 0.25) and wider, on a floor that rises gently (0 ->
//            0.6 m) like the far side of a valley; every roof stays >= 1.5 m under the deck. Window quads face the hill.
//            Sizes come from a fixed integer hash, never Math.random.
//   Every closed part is wound away from a point inside it, never by hand.
// Proportions (real size, base unit the railing height R = 1.1 m): deck 2.5 R over the cliff foot; platform 5.0 x 2.8
// (4.5 R x 2.5 R); bench 1.6 wide, seat 0.42, back 0.8; viewer eyepieces at 1.2; lamp 3.6 tall (its cap is the
// model's top); board 0.9 x 0.6 at 1.0-1.6; cherry crown ~3.6 m over the verge. Town houses 0.2-0.7 m tall.
// Options: build(THREE, kit, colors, { height, dusk }).
//   height  scales everything uniformly so the lamp cap is `height` (default 6.31 m).
//   dusk    the lamp lantern and the town windows glow practical (threshold -0.25, a thin shade rim only); the town
//           walls drop to hair so the lights pop.
// Colours (meadow): grass verge line #a9d16e / iris #3f8a47; hill and valley floor iris / hair #2c5131 (threshold
// 0.45, so the visitor-side cut and the cliff fall to hair); paving sclera #f6f3ee / sky #d7ecef; painted metal
// (railing, posts, frames) hair / hair; viewer accent #d9483b / hair; bench slats skin #f0c2ae / accent; board panel
// moon #f7f3e1 / sclera; lantern sclera / sky (dusk practical #f2c94c / practical); trunk and limbs hair flat; blossom
// sclera / skin at threshold 0.55 (white tops, sakura-pink sides, as riverbank-path); town walls moon / sky (dusk
// hair / hair), roofs iris / hair and accent / hair, windows sky (dusk practical). Pale parts use threshold 0.1 so
// faces square to the camera stay lit (front dot 0.30).

export const meta = {
  name: "lookout",
  height: 6.31,
  script: "meadow",
  colors: {
    grass: "#a9d16e", grassShade: "#3f8a47",
    hill: "#3f8a47", hillShade: "#2c5131",
    paving: "#f6f3ee", pavingShade: "#d7ecef",
    metal: "#2c5131", metalShade: "#2c5131",
    viewer: "#d9483b", viewerShade: "#2c5131",
    wood: "#f0c2ae", woodShade: "#d9483b",
    panel: "#f7f3e1", panelShade: "#f6f3ee",
    lamp: "#f6f3ee", lampShade: "#d7ecef",
    glow: "#f2c94c",
    trunk: "#2c5131",
    blossom: "#f6f3ee", blossomShade: "#f0c2ae",
    wall: "#f7f3e1", wallShade: "#d7ecef",
    roofA: "#3f8a47", roofB: "#d9483b", roofShade: "#2c5131",
    window: "#d7ecef",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, dusk = false } = opts;
  const root = new THREE.Group();
  root.name = "lookout";
  const body = new THREE.Group(); // uniform size scale lives here
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
    const m = mul(add(add(a, b), e), 1 / 3);
    const flip = dot(n, sub(m, ref)) < 0;
    if (flip) n = mul(n, -1);
    n = nrm(n);
    const s = S(key);
    const [B, NB, E, NE] = flip ? [e, ne, b, nb] : [b, nb, e, ne];
    put(s, a, na ?? n), put(s, B, NB ?? n), put(s, E, NE ?? n);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, x0, x1, y0, y1, z0, z1) {
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // gable prism over x0..x1, z0..z1 from y0, ridge along x at y1
  function gable(key, x0, x1, y0, y1, z0, z1) {
    const zm = (z0 + z1) / 2, ref = [(x0 + x1) / 2, (y0 * 2 + y1) / 3, zm];
    quad(key, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], ref);
    quad(key, [x0, y0, z1], [x1, y0, z1], [x1, y1, zm], [x0, y1, zm], ref);
    quad(key, [x0, y0, z0], [x1, y0, z0], [x1, y1, zm], [x0, y1, zm], ref);
    tri(key, [x0, y0, z0], [x0, y0, z1], [x0, y1, zm], ref);
    tri(key, [x1, y0, z0], [x1, y0, z1], [x1, y1, zm], ref);
  }
  // tube along a polyline (radius r, or [r0, r1] tapered), ring basis from plane normal pn; capped ends
  function tube(key, pts, r, pn, { bend = 0.03, sides = 6 } = {}) {
    const path = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const P = pts[i];
      if (i === 0 || i === n - 1) { path.push(P); continue; }
      const A = pts[i - 1], C = pts[i + 1];
      const da = nrm(sub(A, P)), dc = nrm(sub(C, P));
      const t = Math.min(bend, Math.hypot(...sub(A, P)) / 2.2, Math.hypot(...sub(C, P)) / 2.2);
      const p0 = add(P, mul(da, t)), p2 = add(P, mul(dc, t));
      for (const u of [0, 0.5, 1]) path.push([0, 1, 2].map((k) => (1 - u) * (1 - u) * p0[k] + 2 * u * (1 - u) * P[k] + u * u * p2[k]));
    }
    const L = path.length;
    const [r0, r1] = Array.isArray(r) ? r : [r, r];
    const rings = path.map((P, i) => {
      const T = nrm(sub(path[Math.min(L - 1, i + 1)], path[Math.max(0, i - 1)]));
      let u = sub(pn, mul(T, dot(pn, T)));
      if (Math.hypot(...u) < 1e-6) u = Math.abs(T[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1];
      u = nrm(sub(u, mul(T, dot(u, T))));
      const w = cross(T, u), rr = r0 + (r1 - r0) * (i / (L - 1));
      const ring = [];
      for (let j = 0; j < sides; j++) {
        const a = (j / sides) * Math.PI * 2;
        const d = add(mul(u, Math.cos(a)), mul(w, Math.sin(a)));
        ring.push({ q: add(P, mul(d, rr)), n: d });
      }
      return { P, T, ring, rr };
    });
    for (let i = 0; i < L - 1; i++) {
      const R0 = rings[i], R1 = rings[i + 1];
      const ref = mul(add(R0.P, R1.P), 0.5);
      for (let j = 0; j < sides; j++) {
        const k = (j + 1) % sides;
        const [a, b, e, d] = [R0.ring[j], R0.ring[k], R1.ring[k], R1.ring[j]];
        tri(key, a.q, b.q, e.q, ref, a.n, b.n, e.n);
        tri(key, a.q, e.q, d.q, ref, a.n, e.n, d.n);
      }
    }
    for (const [R, s] of [[rings[0], -1], [rings[L - 1], 1]]) {
      const ref = sub(R.P, mul(R.T, s * Math.max(R.rr, 1e-3))), cn = mul(R.T, s);
      for (let j = 1; j < sides - 1; j++) tri(key, R.ring[0].q, R.ring[j].q, R.ring[j + 1].q, ref, cn, cn, cn);
    }
  }
  // blossom blob: a low sphere (6 x 4), flattened, scaled per axis and turned about y; smooth radial normals
  const sph = new THREE.SphereGeometry(1, 6, 4);
  const sP = sph.getAttribute("position"), sI = sph.getIndex();
  function blob(key, C, sx, sy, sz, yaw = 0) {
    const cy = Math.cos(yaw), sn = Math.sin(yaw);
    const at = (i) => {
      const x = sP.getX(i) * sx, z = sP.getZ(i) * sz;
      return [C[0] + x * cy + z * sn, C[1] + sP.getY(i) * sy, C[2] - x * sn + z * cy];
    };
    const nAt = (q) => nrm([(q[0] - C[0]) / (sx * sx), (q[1] - C[1]) / (sy * sy), (q[2] - C[2]) / (sz * sz)]);
    for (let i = 0; i < sI.count; i += 3) {
      const q = [0, 1, 2].map((k) => at(sI.getX(i + k)));
      tri(key, q[0], q[1], q[2], C, nAt(q[0]), nAt(q[1]), nAt(q[2]));
    }
  }
  const place = (x, y, z, yaw, fn, pitch = 0) => {
    const saved = M;
    M = saved.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z)).multiply(new THREE.Matrix4().makeRotationY(yaw)).multiply(new THREE.Matrix4().makeRotationX(pitch));
    fn();
    M = saved;
  };
  const hash = (i) => { let h = (i * 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return (h >>> 0) / 4294967296; };

  // ---------- hill, verge, platform ----------
  const P = 2.6, EDGE = -1.0; // hilltop height, z of the drop edge
  const BZ = 4.0, CZ = -2.3, BACK = BZ - 0.5; // the visitor-side cut leans in a little (undercut) // back edge of the top, cliff foot, back foot
  // a steep cliff toward the view; the visitor's side is a cut leaning in 0.5 m (a diorama base), so the model ends
  // just behind the path
  hex("hill", [[-5.0, 0, CZ], [5.0, 0, CZ], [4.9, 0, BACK], [-4.9, 0, BACK], [-4.6, P, EDGE - 0.35], [4.6, P, EDGE - 0.35], [4.6, P, BZ], [-4.6, P, BZ]]);
  box("grass", -4.6, 4.6, P - 0.05, P + 0.03, EDGE - 0.37, BZ + 0.02);
  const PX = 2.5, PZ0 = EDGE - 0.2, PZ1 = 1.6, PT = P + 0.11;
  box("paving", -PX, PX, P, PT, PZ0, PZ1);
  box("paving", -0.6, 0.6, P, PT - 0.02, PZ1, BZ + 0.03); // the path in, toward the visitor
  // paving joint lines: dark strips 2 mm proud, a sparse grid
  for (let x = -PX + 1.0; x < PX - 0.1; x += 1.0) box("metal", x - 0.012, x + 0.012, PT, PT + 0.002, PZ0 + 0.02, PZ1 - 0.02);
  for (const z of [PZ0 + 0.9, PZ0 + 1.8]) box("metal", -PX + 0.02, PX - 0.02, PT, PT + 0.002, z - 0.012, z + 0.012);

  // ---------- railing along the drop edge ----------
  const RH = 1.1, RZ = PZ0 + 0.1, RX = PX - 0.08;
  const posts = 6;
  for (let i = 0; i <= posts; i++) {
    const x = -RX + (2 * RX * i) / posts;
    tube("metal", [[x, PT, RZ], [x, PT + RH, RZ]], 0.03, [1, 0, 0]);
  }
  for (const y of [RH, RH * 0.5]) tube("metal", [[-RX, PT + y, RZ + 0.9], [-RX, PT + y, RZ], [RX, PT + y, RZ], [RX, PT + y, RZ + 0.9]], y === RH ? 0.028 : 0.02, [0, 1, 0], { bend: 0.08 });
  for (const s of [-1, 1]) tube("metal", [[s * RX, PT, RZ + 0.9], [s * RX, PT + RH, RZ + 0.9]], 0.03, [1, 0, 0]);

  // ---------- binocular viewer (local: faces -Z, the visitor at +Z) ----------
  place(-1.2, PT, RZ + 0.75, -0.12, () => {
    tube("metal", [[0, 0, 0], [0, 1.08, 0]], 0.05, [1, 0, 0]);
    box("metal", -0.13, 0.13, 0, 0.05, -0.13, 0.13); // base flange
    place(0, 1.12, 0, 0, () => {
      box("viewer", -0.24, 0.24, -0.08, 0.18, -0.19, 0.19); // body
      box("viewer", -0.27, 0.27, 0.18, 0.23, -0.27, 0.21); // hood
      box("metal", -0.06, 0.06, -0.12, -0.06, -0.06, 0.06); // yoke
      for (const s of [-1, 1]) {
        tube("metal", [[s * 0.08, 0.07, 0.19], [s * 0.08, 0.07, 0.28]], 0.035, [1, 0, 0]); // eyepieces
        tube("viewer", [[s * 0.12, 0.04, -0.19], [s * 0.12, 0.04, -0.4]], [0.08, 0.095], [1, 0, 0], { sides: 8 }); // objectives
      }
      box("panel", 0.1, 0.17, -0.03, 0.06, 0.19, 0.196); // coin plate on the visitor side
    }, -0.14);
  });

  // ---------- bench facing the view ----------
  place(0.45, PT, 0.85, 0, () => {
    const W = 0.8, SY = 0.42;
    for (const s of [-1, 1]) {
      const x = s * (W - 0.12);
      // cast side frame: front leg, rear leg rising into the back support, seat arm
      tube("metal", [[x, 0, -0.22], [x, SY - 0.03, -0.2], [x, SY - 0.03, 0.2], [x, 0, 0.24]], 0.025, [1, 0, 0], { bend: 0.04 });
      tube("metal", [[x, SY - 0.03, 0.18], [x, 0.82, 0.3]], 0.025, [1, 0, 0]);
    }
    for (let i = 0; i < 4; i++) {
      const z = -0.2 + i * 0.12;
      box("wood", -W, W, SY - 0.03, SY + 0.005, z - 0.05, z + 0.05);
    }
    for (const [y, z] of [[0.58, 0.245], [0.74, 0.28]]) box("wood", -W, W, y - 0.06, y + 0.06, z - 0.02, z + 0.02);
  });

  // ---------- lamp post ----------
  place(2.25, PT, 1.2, 0, () => {
    tube("metal", [[0, 0, 0], [0, 3.15, 0], [0, 3.3, -0.25]], [0.07, 0.045], [1, 0, 0], { bend: 0.18, sides: 8 });
    box("metal", -0.12, 0.12, 0, 0.35, -0.12, 0.12); // base
    place(0, 3.0, -0.32, 0, () => {
      box("lamp", -0.17, 0.17, 0.02, 0.42, -0.17, 0.17);
      box("metal", -0.24, 0.24, 0.42, 0.48, -0.24, 0.24); // cap
      gable("metal", -0.16, 0.16, 0.48, 0.6, -0.16, 0.16);
      box("metal", -0.19, 0.19, -0.02, 0.02, -0.19, 0.19); // bottom ring
    });
  });

  // ---------- information board (panel toward the visitor) ----------
  place(1.45, PT, -0.4, 0.3, () => {
    for (const s of [-1, 1]) tube("metal", [[s * 0.42, 0, 0], [s * 0.42, 1.62, 0]], 0.035, [1, 0, 0]);
    box("metal", -0.47, 0.47, 0.98, 1.62, -0.03, 0.01); // frame / back
    box("panel", -0.42, 0.42, 1.03, 1.57, 0.01, 0.025); // the blank face
    box("metal", -0.52, 0.52, 1.62, 1.68, -0.08, 0.06); // little roof board
  });

  // ---------- cherry tree on the -X verge ----------
  // a bent bole forking at 1.9 m, six limbs that each split in two; a cluster of 2-3 small flattened blobs at every
  // split tip and one at each limb's elbow, plus a low crown, so dark limbs show through gaps in the canopy.
  place(-3.5, P, 0.9, 0, () => {
    let seed = 11;
    const rr = (a, b) => a + (b - a) * hash(seed++);
    const fork = [0.15, 1.9, -0.1];
    tube("trunk", [[0, -0.05, 0], [0.02, 0.9, 0.04], fork], [0.2, 0.13], [0, 0, 1], { bend: 0.35, sides: 7 });
    const cluster = (C, n, r0, r1) => {
      for (let k = 0; k < n; k++) {
        const r = rr(r0, r1);
        const q = k === 0 ? C : [C[0] + rr(-0.35, 0.35), C[1] + rr(-0.1, 0.15), C[2] + rr(-0.3, 0.3)];
        blob("blossom", q, r * rr(1.1, 1.3), r * 0.72, r, rr(0, 6.28));
      }
    };
    for (let i = 0; i < 6; i++) {
      const az = (i + rr(0.2, 0.8)) * ((Math.PI * 2) / 6), reach = rr(1.7, 2.1);
      const dir = (a, d) => [Math.sin(a) * d, 0, Math.cos(a) * d];
      const mid = add(add(fork, dir(az, reach * 0.45)), [0, rr(0.55, 0.8), 0]);
      tube("trunk", [fork, mid], [0.09, 0.06], [0, 1, 0], { sides: 5 });
      cluster(add(mid, [0, 0.3, 0]), 1, 0.32, 0.4);
      for (const da of [-0.4, 0.4]) {
        const tip = add(add(fork, dir(az + da, reach * rr(0.85, 1.05))), [0, mid[1] - fork[1] + rr(-0.15, 0.25), 0]);
        tube("trunk", [mid, tip], [0.05, 0.025], [0, 1, 0], { sides: 5 });
        cluster(tip, 2 + (hash(i * 7 + (da > 0 ? 1 : 0)) > 0.5 ? 1 : 0), 0.26, 0.38);
      }
    }
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + 0.4, C = [fork[0] + Math.sin(a) * 0.8, fork[1] + rr(1.15, 1.4), fork[2] + Math.cos(a) * 0.8];
      tube("trunk", [fork, add(fork, mul(sub(C, fork), 0.8))], [0.07, 0.035], [0, 1, 0], { sides: 5 });
      cluster(C, 2, 0.32, 0.42);
    }
  });

  // ---------- town spread on the valley floor, past the cliff foot ----------
  // forced perspective: each row further out is smaller (scale sc) and wider, and steps up a little as the far side of
  // the valley rises; every roof stays >= 1.5 m under the deck. Rows: [z, scale, terrace y, span].
  const ROWS = [[-4.3, 0.5, 11], [-5.7, 0.46, 12], [-7.1, 0.42, 13], [-8.5, 0.38, 14], [-9.9, 0.34, 15], [-11.3, 0.31, 15.5], [-12.7, 0.28, 16], [-14.1, 0.25, 16]];
  const ZB = -15.0, ZF = CZ + 0.3, YB = 0.6; // the valley floor rises gently from the cliff foot to YB at the far edge
  const yAt = (z) => 0.04 + ((YB - 0.04) * (ZF - z)) / (ZF - ZB);
  hex("hill", [[-8.4, 0, ZF], [8.4, 0, ZF], [8.4, 0, ZB], [-8.4, 0, ZB], [-8.4, 0.04, ZF], [8.4, 0.04, ZF], [8.4, YB, ZB], [-8.4, YB, ZB]]);
  let k = 0;
  for (const [z, sc, span] of ROWS) {
    const step = 1.5 * sc, n = Math.floor(span / step);
    for (let i = 0; i < n; i++, k++) {
      const r1 = hash(k * 3 + 1), r2 = hash(k * 3 + 2), r3 = hash(k * 3 + 3);
      if (r3 < 0.08) continue; // a gap now and then: a lane, a lot
      const w = step * (0.6 + 0.3 * r1), d = sc * (0.8 + 0.4 * r2);
      const x = -span / 2 + step * (i + 0.5) + (r2 - 0.5) * step * 0.3, zz = z + (r1 - 0.5) * sc * 0.6;
      const h = sc * (0.75 + 0.6 * r3), z0 = zz - d / 2, z1 = zz + d / 2, y0 = yAt(z1) - 0.02, top = yAt(z0) + h;
      box("wall", x - w / 2, x + w / 2, y0 + 0.02, top, z0, z1);
      gable(r1 > 0.42 ? "roofA" : "roofB", x - w / 2 - 0.04 * sc, x + w / 2 + 0.04 * sc, top, top + sc * (0.3 + 0.15 * r2), z0 - 0.06 * sc, z1 + 0.06 * sc);
      // windows on the face toward the hill (+Z)
      const ww = 0.11 * sc, wh = 0.1 * sc, cols = Math.max(1, Math.round(w / (0.32 * sc)));
      for (let j = 0; j < cols; j++) {
        if (hash(k * 97 + j * 7) < 0.4) continue;
        const wx = x - w / 2 + (w * (j + 0.5)) / cols, wy = y0 + h * 0.45;
        quad("window", [wx - ww, wy, z1 + 0.006], [wx + ww, wy, z1 + 0.006], [wx + ww, wy + 2 * wh, z1 + 0.006], [wx - ww, wy + 2 * wh, z1 + 0.006], [wx, wy, z1 - 1]);
      }
    }
  }

  // centre the footprint on x = z = 0
  const lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (const { p } of Object.values(soups))
    for (let i = 0; i < p.length; i += 3)
      for (const [kk, j] of [[0, 0], [1, 2]]) (lo[kk] = Math.min(lo[kk], p[i + j])), (hi[kk] = Math.max(hi[kk], p[i + j]));
  body.position.set((-(lo[0] + hi[0]) / 2) * body.scale.x, 0, (-(lo[1] + hi[1]) / 2) * body.scale.x);

  // ---------- meshes: one per material ----------
  const G = -0.25; // glowing practicals keep only a thin shade rim
  const MAT = {
    hill: [c.hill, c.hillShade, 0.45, 3],
    grass: [c.grass, c.grassShade, 0.1, 3],
    paving: [c.paving, c.pavingShade, 0.1, 3],
    metal: [c.metal, c.metalShade, 0.1, 2],
    viewer: [c.viewer, c.viewerShade, 0.1, 3],
    wood: [c.wood, c.woodShade, 0.1, 2.5],
    panel: [c.panel, c.panelShade, 0.1, 0],
    lamp: dusk ? [c.glow, c.glow, G, 3] : [c.lamp, c.lampShade, 0.1, 3],
    trunk: [c.trunk, c.trunk, 0.1, 3],
    blossom: [c.blossom, c.blossomShade, 0.55, 3],
    wall: dusk ? [c.hillShade, c.hillShade, 0.1, 1.5] : [c.wall, c.wallShade, 0.1, 1.5],
    roofA: [c.roofA, c.roofShade, 0.1, 1.5],
    roofB: [c.roofB, c.roofShade, 0.1, 1.5],
    window: dusk ? [c.glow, c.glow, G, 0] : [c.window, c.window, 0.1, 0],
  };
  for (const [key, { p, n }] of Object.entries(soups)) {
    const [base, shade, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
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
