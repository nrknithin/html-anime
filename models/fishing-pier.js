// fishing-pier.js - a small seaside-town fishing harbour quay as anime draws it: a concrete quay edge with iron
// bollards, hanging tyre fenders and a coiled rope, a small white fishing boat moored alongside on flat water, stacked
// fish crates, a cluster of float buoys, a lamp post, a bench and seagulls perched on the bollards. Real size.
// Contract: harness/lab/README.md. Metres, +Y up, the SEA side faces +Z, the quay edge runs along X (its left is +X),
// stands on y = 0 (the sea floor of the water slab), centred on x = 0, z = 0 (the bbox).
//
// Construction (triangle soups merged per material, so the whole set is 15 meshes at most):
//   QUAY     one block 12 m along X, 4 m deep, its sea face square to +Z (shade under the default light, so the
//            lit top edge reads), a coping lip 6 cm proud along the top edge, dark joint strips every 3 m.
//   FIXTURES lathed iron bollards (flange, post, flared head, dome cap) 0.4 m in from the edge; four tyre fenders
//            (tori) hung on short ropes against the face; a rope coil of flat tori on the quay top; a lamp post
//            (lathed base, pole, curved arm tube, cone shade over a lit glass) and a slatted bench facing the sea.
//   CLUTTER  plastic fish crates (boxes with dark grip slots) stacked 4-3-2 high, and a heap of float buoys
//            (spheres in two warm colours) in a pyramid of 5-3-1.
//   GULLS    simple shapes: an ellipsoid body, a head sphere, folded-wing ellipsoids with dark tips, a tail wedge and
//            a cone beak, sitting on two bollard caps.
//   BOAT     a two-rail hull loft along X: 19 stations x 8 rows a side, deck height, half-beam and keel from literal
//            curves of the station u (stern 0 -> bow 1), the stem raked by shifting lower rows aft near the bow; the
//            sheer stripe and the boot top are material groups on the hull rows (clean colour breaks, no ink). A
//            flat transom and deck close it. A wheelhouse (hex box, raked front, ink windows) with a red roof, a flag
//            pole and flag on the roof, a bow mast with a yard, a stern A-frame with a hanging net and a net heap with
//            red floats on the aft deck. The boat is one rigid group (its four meshes, one per material) that the
//            clip heaves, rolls and pitches; the two mooring lines are one mesh whose vertices pose() rewrites from
//            the bollards to the boat's cleats each frame.
//   WATER    a flat slab 0.3 m deep (the hull's draft hides inside it) and one ripple mesh rewritten per frame:
//            three rings around the hull that grow outward and fade (their width goes to zero at both ends of the
//            travel) plus drifting dashes on open water that taper to nothing at the wrap, so the loop is seamless.
//   Every closed part is wound from geometry (a point inside it, or the supplied outward normals), never by hand.
// Proportions (real size; base unit the quay freeboard F = 1.4 m above the water): quay top 1.7 (water 0.3 + F),
// boat 7.6 long (5.4 F), beam 2.3, deck 0.85-1.25 above water, wheelhouse 1.5 x 1.3 x 1.4, flag pole top 4.6;
// bollards 0.5 tall, tyres 0.86 across, crates 0.62 x 0.42 x 0.28, buoys 0.4 across, lamp post 3.71 above the quay,
// bench seat 0.42. Overall top 5.41 m (the lamp post), 12 x 10 m footprint.
// Two-tone pairs (meadow: the summer-seaside script, pale sky water, a white boat, warm accents):
//   concrete moon #f7f3e1 / skin #f0c2ae (warm shade, so the face never melts into the pale water)
//   iron (bollards, lamp, bench frame) iris #3f8a47 / hair #2c5131; tyres hair flat
//   wood, rope, lamp glass, mooring lines, buoys B practical #f2c94c / skin; buoys A, flag, roof accent #d9483b / skin
//   crates line #a9d16e / iris; gulls sclera #f6f3ee / sky #d7ecef; boat hull sclera / sky (low threshold, so the
//   broadside reads white); nets iris / hair; slots, windows, poles, wing tips ink #1c261b flat;
//   water sky / sky; ripples moon flat.
// Clip (build() returns clips { bob: 4 }; pose("bob@1.2")): the boat heaves 4 cm, rolls 3 deg and pitches 1 deg
// (pitch at twice the rate), the ripple rings grow one spacing and the dashes drift one spacing per 4 s loop.
// Options: build(THREE, kit, colors, { height, boat })
//   height  uniform scale; the top of the rest pose (default meta.height, 5.41 m).
//   boat    false leaves the berth empty (no boat, mooring lines or hull ripples; the drifting dashes stay).

export const meta = {
  name: "fishing-pier",
  height: 5.41,
  script: "meadow",
  colors: {
    concrete: "#f7f3e1", concreteShade: "#f0c2ae",
    iron: "#3f8a47", ironShade: "#2c5131",
    tyre: "#2c5131",
    wood: "#f2c94c", woodShade: "#f0c2ae",
    warm: "#d9483b", warmShade: "#f0c2ae",
    crate: "#a9d16e", crateShade: "#3f8a47",
    gull: "#f6f3ee", gullShade: "#d7ecef",
    hull: "#f6f3ee", hullShade: "#d7ecef",
    net: "#3f8a47", netShade: "#2c5131",
    dark: "#1c261b",
    water: "#d7ecef",
    ripple: "#f7f3e1",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const { height = meta.height, boat: withBoat = true } = opts;
  const TAU = Math.PI * 2, D = Math.PI / 180;
  const root = new THREE.Group();
  root.name = "fishing-pier";
  const pier = new THREE.Group(); // uniform scale
  pier.name = "pier";
  root.add(pier);
  pier.scale.setScalar(height / meta.height);
  const body = new THREE.Group(); // shifted so the set's bbox is centred on x = 0, z = 0
  body.name = "body";
  pier.add(body);
  const joints = {};

  // ---------- vector helpers and triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  // flat triangle wound away from `ref`
  function tri(key, a, b, e, ref) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const flip = dot(n, sub(mul(add(add(a, b), e), 1 / 3), ref)) < 0;
    n = nrm(flip ? mul(n, -1) : n);
    const s = S(key);
    for (const q of flip ? [a, e, b] : [a, b, e]) s.p.push(...q), s.n.push(...n);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  // smooth triangle wound to agree with its vertex normals
  function tri2(key, a, b, e, na, nb, ne) {
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const s = S(key);
    if (dot(n, add(add(na, nb), ne)) >= 0) s.p.push(...a, ...b, ...e), s.n.push(...na, ...nb, ...ne);
    else s.p.push(...a, ...e, ...b), s.n.push(...na, ...ne, ...nb);
  }
  // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  const box = (key, x0, x1, y0, y1, z0, z1) =>
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  const M4 = (pos = [0, 0, 0], eul = [0, 0, 0], scl = [1, 1, 1]) =>
    new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...eul)), new THREE.Vector3(...scl));
  const v3 = new THREE.Vector3();
  const tp = (M, q) => (M ? v3.set(...q).applyMatrix4(M).toArray() : q);
  const tn = (M, q) => (M ? v3.set(...q).transformDirection(M).toArray() : q);
  // a rotated box: centre, half sizes, euler
  function boxM(key, M, hx, hy, hz) {
    const P = (x, y, z) => tp(M, [x * hx, y * hy, z * hz]);
    hex(key, [P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1), P(-1, 1, -1), P(1, 1, -1), P(1, 1, 1), P(-1, 1, 1)]);
  }
  // grid of {p, n} rows -> smooth quads (wrapJ closes each row)
  function surf(key, G, wrapJ, M) {
    const R = G.map((row) => row.map((u) => ({ p: tp(M, u.p), n: nrm(tn(M, u.n)) })));
    for (let i = 0; i + 1 < R.length; i++) {
      const J = R[i].length;
      for (let j = 0; j < (wrapJ ? J : J - 1); j++) {
        const a = R[i][j], b = R[i][(j + 1) % J], e = R[i + 1][(j + 1) % J], f = R[i + 1][j];
        tri2(key, a.p, b.p, e.p, a.n, b.n, e.n);
        tri2(key, a.p, e.p, f.p, a.n, e.n, f.n);
      }
    }
  }
  // lathe about local +Y: prof [[r, y], ...] bottom to top (r = 0 at both ends closes it); a repeated point is a crease
  function lathe(key, prof, sides, M) {
    const same = (a, b) => b && Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
    const G = prof.map((q, i) => {
      const pv = same(q, prof[i - 1]) ? q : prof[i - 1] ?? q, nx = same(q, prof[i + 1]) ? q : prof[i + 1] ?? q;
      let t = [nx[0] - pv[0], nx[1] - pv[1]];
      if (Math.hypot(...t) < 1e-9) t = [1, 0];
      const n2 = [t[1], -t[0]], l = Math.hypot(...n2) || 1;
      return Array.from({ length: sides }, (_, j) => {
        const a = (j / sides) * TAU, ca = Math.cos(a), sa = Math.sin(a);
        return { p: [q[0] * ca, q[1], q[0] * sa], n: [(n2[0] / l) * ca, n2[1] / l, (n2[0] / l) * sa] };
      });
    });
    surf(key, G, true, M);
  }
  function ellip(key, ctr, rx, ry, rz, M, seg = 10, rings = 6) {
    const G = [];
    for (let i = 0; i <= rings; i++) {
      const th = (i / rings) * Math.PI, row = [];
      for (let j = 0; j < seg; j++) {
        const ph = (j / seg) * TAU, s = Math.sin(th), q = [s * Math.cos(ph), -Math.cos(th), s * Math.sin(ph)];
        row.push({ p: [ctr[0] + rx * q[0], ctr[1] + ry * q[1], ctr[2] + rz * q[2]], n: [q[0] / rx, q[1] / ry, q[2] / rz] });
      }
      G.push(row);
    }
    surf(key, G, true, M);
  }
  // torus about local +Y
  function torus(key, R, r, M, seg = 16, sides = 8) {
    const G = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * TAU, row = [];
      for (let j = 0; j < sides; j++) {
        const b = (j / sides) * TAU, n = [Math.cos(b) * Math.cos(a), Math.sin(b), Math.cos(b) * Math.sin(a)];
        row.push({ p: [(R + r * Math.cos(b)) * Math.cos(a), r * Math.sin(b), (R + r * Math.cos(b)) * Math.sin(a)], n });
      }
      G.push(row);
    }
    surf(key, G, true, M);
  }
  // tube along a polyline, flat-capped; returns {p, n} arrays (fixed topology, so a rewrite can reuse it)
  function tubeArrays(pts, r, sides) {
    const out = { p: [], n: [] };
    const push = (a, b, e, na, nb, ne) => {
      const n = cross(sub(b, a), sub(e, a));
      if (dot(n, add(add(na, nb), ne)) >= 0) out.p.push(...a, ...b, ...e), out.n.push(...na, ...nb, ...ne);
      else out.p.push(...a, ...e, ...b), out.n.push(...na, ...ne, ...nb);
    };
    const rings = pts.map((q, i) => {
      const t = nrm(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
      const up = Math.abs(t[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
      const u = nrm(cross(t, up)), w = cross(u, t);
      return Array.from({ length: sides }, (_, j) => {
        const a = (j / sides) * TAU, n = add(mul(u, Math.cos(a)), mul(w, Math.sin(a)));
        return { p: add(q, mul(n, r)), n };
      });
    });
    for (let i = 0; i + 1 < rings.length; i++)
      for (let j = 0; j < sides; j++) {
        const a = rings[i][j], b = rings[i][(j + 1) % sides], e = rings[i + 1][(j + 1) % sides], f = rings[i + 1][j];
        push(a.p, b.p, e.p, a.n, b.n, e.n), push(a.p, e.p, f.p, a.n, e.n, f.n);
      }
    for (const [k, s] of [[0, -1], [rings.length - 1, 1]]) {
      const t = mul(nrm(sub(pts[Math.min(k + 1, pts.length - 1)], pts[Math.max(k - 1, 0)])), s);
      for (let j = 0; j < sides; j++) push(pts[k], rings[k][j].p, rings[k][(j + 1) % sides].p, t, t, t);
    }
    return out;
  }
  const tube = (key, pts, r, sides = 6) => { const t = tubeArrays(pts, r, sides); S(key).p.push(...t.p), S(key).n.push(...t.n); };

  // ---------- the quay ----------
  const W0 = 0.3, F = 1.4, QT = W0 + F; // water surface, freeboard, quay top
  const QX = 6, QZ = -4; // quay spans x -6..6, z -4..0 (sea face at z = 0)
  box("concrete", -QX, QX, 0, QT, QZ, 0);
  box("concrete", -QX, QX, QT - 0.22, QT + 0.03, -0.02, 0.06); // coping lip
  for (let x = -QX + 3; x < QX; x += 3) {
    quad("dark", [x - 0.025, W0, 0.004], [x + 0.025, W0, 0.004], [x + 0.025, QT - 0.22, 0.004], [x - 0.025, QT - 0.22, 0.004], [x, 1, -1]);
    quad("dark", [x - 0.025, QT + 0.004, QZ], [x + 0.025, QT + 0.004, QZ], [x + 0.025, QT + 0.004, -0.02], [x - 0.025, QT + 0.004, -0.02], [x, 0, -1]);
  }
  // bollards
  const BOL = [[-5.4, -0.42], [-1.2, -0.42], [3.3, -0.42], [5.3, -0.42]];
  const BOLP = [[0, 0], [0.2, 0], [0.2, 0], [0.2, 0.05], [0.2, 0.05], [0.14, 0.07], [0.13, 0.36], [0.2, 0.41], [0.2, 0.41], [0.2, 0.46], [0.2, 0.46], [0.15, 0.5], [0, 0.53]];
  for (const [x, z] of BOL) lathe("iron", BOLP, 12, M4([x, QT, z]));
  // tyre fenders: tori in the XY plane, hung on short ropes from the coping
  for (const x of [-4.0, -2.0, 0, 2.0]) {
    torus("tyre", 0.3, 0.13, M4([x, 1.05, 0.2], [Math.PI / 2, 0, 0]), 16, 8);
    tube("wood", [[x, QT + 0.03, 0.03], [x, QT - 0.05, 0.1], [x, 1.42, 0.18]], 0.022, 5);
  }
  // rope coil on the quay top
  [[0.34, 0.035], [0.27, 0.035], [0.2, 0.035], [0.28, 0.1]].forEach(([R, y]) => torus("wood", R, 0.036, M4([2.1, QT + y, -1.15]), 18, 6));
  // lamp post
  {
    const x = 2.2, z = -3.4;
    lathe("iron", [[0, 0], [0.17, 0], [0.17, 0], [0.17, 0.3], [0.17, 0.3], [0.1, 0.38], [0.065, 0.5], [0.06, 3.4], [0.06, 3.4], [0, 3.42]], 10, M4([x, QT, z]));
    const arm = [];
    for (let k = 0; k <= 6; k++) { const a = (k / 6) * Math.PI * 0.5; arm.push([x, QT + 3.35 + 0.3 * Math.sin(a), z + 0.3 * (1 - Math.cos(a))]); }
    arm.push([x, QT + 3.65, z + 0.75]);
    tube("iron", arm, 0.04, 6);
    lathe("iron", [[0, 0.02], [0.28, 0], [0.28, 0], [0.26, 0.06], [0.08, 0.2], [0.08, 0.2], [0, 0.21]], 12, M4([x, QT + 3.5, z + 0.75]));
    ellip("wood", [x, QT + 3.46, z + 0.75], 0.13, 0.11, 0.13, null, 10, 6);
  }
  // bench, facing the sea
  {
    const x0 = -0.9, x1 = 0.7, z = -3.0;
    for (const x of [x0 + 0.12, x1 - 0.12]) {
      box("iron", x - 0.035, x + 0.035, 0 + QT, 0.4 + QT, z - 0.2, z - 0.14);
      box("iron", x - 0.035, x + 0.035, 0 + QT, 0.4 + QT, z + 0.16, z + 0.22);
      hex("iron", [[x - 0.035, QT + 0.36, z - 0.24], [x + 0.035, QT + 0.36, z - 0.24], [x + 0.035, QT + 0.36, z + 0.24], [x - 0.035, QT + 0.36, z + 0.24],
        [x - 0.035, QT + 0.4, z - 0.24], [x + 0.035, QT + 0.4, z - 0.24], [x + 0.035, QT + 0.4, z + 0.24], [x - 0.035, QT + 0.4, z + 0.24]]);
      hex("iron", [[x - 0.035, QT + 0.36, z - 0.24], [x + 0.035, QT + 0.36, z - 0.24], [x + 0.035, QT + 0.36, z - 0.18], [x - 0.035, QT + 0.36, z - 0.18],
        [x - 0.035, QT + 0.88, z - 0.36], [x + 0.035, QT + 0.88, z - 0.36], [x + 0.035, QT + 0.88, z - 0.3], [x - 0.035, QT + 0.88, z - 0.3]]);
    }
    for (const zz of [z - 0.15, z, z + 0.15]) box("wood", x0, x1, QT + 0.4, QT + 0.44, zz - 0.065, zz + 0.065);
    for (const t of [0.35, 0.75]) {
      const zz = z - 0.24 - 0.12 * t, yy = QT + 0.4 + 0.48 * t;
      hex("wood", [[x0, yy - 0.07, zz - 0.035], [x1, yy - 0.07, zz - 0.035], [x1, yy - 0.07, zz + 0.005], [x0, yy - 0.07, zz + 0.005],
        [x0, yy + 0.07, zz - 0.06], [x1, yy + 0.07, zz - 0.06], [x1, yy + 0.07, zz - 0.02], [x0, yy + 0.07, zz - 0.02]]);
    }
  }
  // fish crates: stacks of 4, 3 and 2
  function crate(x, y, z, yaw) {
    const M = M4([x, y + 0.14, z], [0, yaw, 0]);
    boxM("crate", M, 0.31, 0.14, 0.21);
    for (const s of [-1, 1]) { // grip slots on the ends, two slits on the long sides
      const e = [tp(M, [s * 0.316, -0.03, -0.08]), tp(M, [s * 0.316, -0.03, 0.08]), tp(M, [s * 0.316, 0.06, 0.08]), tp(M, [s * 0.316, 0.06, -0.08])];
      quad("dark", ...e, tp(M, [0, 0, 0]));
      for (const yy of [-0.06, 0.04]) {
        const f = [tp(M, [-0.22, yy, s * 0.216]), tp(M, [0.22, yy, s * 0.216]), tp(M, [0.22, yy + 0.035, s * 0.216]), tp(M, [-0.22, yy + 0.035, s * 0.216])];
        quad("dark", ...f, tp(M, [0, 0, 0]));
      }
    }
  }
  [[3.75, -1.6, 4, 0.02], [4.43, -1.55, 3, -0.06], [4.05, -1.05, 2, 0.1]].forEach(([x, z, n, yaw]) => {
    for (let k = 0; k < n; k++) crate(x, QT + k * 0.285, z, yaw + 0.03 * Math.sin(k * 2.3));
  });
  // float buoys: a 5-3-1 heap
  {
    const r = 0.2, cx = 5.0, cz = -2.6;
    const pts = [[-0.4, 0, -0.1], [0, 0, -0.16], [0.4, 0, -0.08], [-0.2, 0, 0.26], [0.22, 0, 0.3], [-0.2, 1, 0.02], [0.2, 1, 0.05], [0, 1, -0.12], [0, 2, 0.0]];
    pts.forEach(([dx, layer, dz], k) => {
      const y = QT + r + layer * r * 1.25;
      ellip(k % 3 === 1 ? "wood" : "warm", [cx + dx * (1 - 0.3 * layer), y, cz + dz], r, r, r, null, 10, 6);
    });
  }
  // seagulls on bollard caps: body along local +Z (the head end)
  function gull([x, z], yaw, top) {
    const M = M4([x, top, z], [0, yaw, 0]);
    ellip("gull", [0, 0.11, 0], 0.1, 0.1, 0.2, M);
    ellip("gull", [0, 0.25, 0.15], 0.07, 0.07, 0.075, M);
    lathe("wood", [[0, 0], [0.022, 0], [0.022, 0], [0, 0.08]], 6, new THREE.Matrix4().multiplyMatrices(M, M4([0, 0.24, 0.21], [Math.PI / 2 - 0.15, 0, 0])));
    for (const s of [-1, 1]) {
      ellip("gull", [s * 0.075, 0.14, -0.04], 0.04, 0.075, 0.2, new THREE.Matrix4().multiplyMatrices(M, M4([0, 0, 0], [0.12, 0, 0])), 10, 6);
      ellip("dark", [s * 0.07, 0.17, -0.27], 0.035, 0.04, 0.09, new THREE.Matrix4().multiplyMatrices(M, M4([0, 0, 0], [0.12, 0, 0])), 8, 4);
      ellip("dark", [s * 0.068, 0.27, 0.19], 0.012, 0.012, 0.012, M, 6, 3); // eyes
    }
    hex("gull", [[-0.06, 0.06, -0.15], [0.06, 0.06, -0.15], [0.06, 0.16, -0.15], [-0.06, 0.16, -0.15],
      [-0.035, 0.1, -0.34], [0.035, 0.1, -0.34], [0.035, 0.14, -0.34], [-0.035, 0.14, -0.34]].map((q) => tp(M, q)));
  }
  gull(BOL[1], 0.9, QT + 0.5);
  gull(BOL[3], -0.5, QT + 0.5);

  // ---------- the boat (local: origin at the waterline centre, bow +X, port side -Z faces the quay) ----------
  const L = 7.6, HB = 1.15, BX = -1.0, BZ = 1.5;
  const boat = new THREE.Group();
  boat.name = "boat";
  joints.boat = boat;
  const bsoups = {};
  const cleats = [];
  if (withBoat) {
    const saved = { ...soups }; // collect the boat into its own soups, then restore the quay's
    for (const k of Object.keys(soups)) delete soups[k];
    // stations
    const NS = 18;
    const deck = (u) => 0.85 + 0.4 * u * u;
    const beam = (u) => HB * (u < 0.45 ? 0.88 + 0.12 * Math.sin((Math.PI / 2) * (u / 0.45)) : Math.cos((Math.PI / 2) * ((u - 0.45) / 0.55)) ** 0.75);
    const keel = (u) => -0.17 + 0.37 * Math.max(0, (u - 0.7) / 0.3) ** 2;
    const rowsAt = (u) => {
      const d = deck(u), k = keel(u), y3 = Math.max(0.18, k + 0.02), y4 = Math.max(0.03, k + 0.01);
      return [[d, 1], [d - 0.14, 1], [(d - 0.14 + y3) / 2, 0.99], [y3, 0.96], [y4, 0.9], [(y4 + k) / 2, 0.66], [k, 0.22], [k - 0.02, 0]];
    };
    const PT = (u, s) => rowsAt(u).map(([y, wf]) => [-L / 2 + u * L - 0.7 * u ** 4 * (deck(u) - y), y, s * beam(u) * wf]);
    for (const s of [1, -1]) {
      const G = [];
      for (let i = 0; i <= NS; i++) G.push(PT(i / NS, s));
      // normals by central differences, outward from the station's centre line
      const N = G.map((row, i) => row.map((p, j) => {
        const a = G[Math.min(i + 1, NS)][j], b = G[Math.max(i - 1, 0)][j];
        const e = row[Math.min(j + 1, row.length - 1)], f = row[Math.max(j - 1, 0)];
        let n = nrm(cross(sub(a, b), sub(e, f)));
        if (n[2] * s < 0 && j < 7) n = mul(n, -1);
        if (j === 7) n = [0, -1, 0];
        return n;
      }));
      for (let i = 0; i < NS; i++)
        for (let j = 0; j < 7; j++) {
          const key = j === 0 || j === 3 ? "bRed" : "bHull";
          const a = G[i][j], b = G[i + 1][j], e = G[i + 1][j + 1], f = G[i][j + 1];
          tri2(key, a, b, e, N[i][j], N[i + 1][j], N[i + 1][j + 1]);
          tri2(key, a, e, f, N[i][j], N[i + 1][j + 1], N[i][j + 1]);
        }
    }
    // deck and transom
    for (let i = 0; i < NS; i++) {
      const a = PT(i / NS, 1)[0], b = PT((i + 1) / NS, 1)[0], e = PT((i + 1) / NS, -1)[0], f = PT(i / NS, -1)[0];
      quad("bHull", a, b, e, f, [(a[0] + b[0]) / 2, 0, 0]);
    }
    {
      const st = PT(0, 1), pt = PT(0, -1);
      for (let j = 0; j < 7; j++) {
        const key = j === 0 || j === 3 ? "bRed" : "bHull";
        quad(key, st[j], st[j + 1], pt[j + 1], pt[j], [0, 0.3, 0]);
      }
    }
    // bulwark cap: a thin red rail along the sheer, both sides
    for (const s of [1, -1]) {
      const rail = [];
      for (let i = 0; i <= NS; i++) { const p = PT(i / NS, s)[0]; rail.push([p[0], p[1] + 0.05, p[2] * 0.97]); }
      tube("bRed", rail, 0.045, 5);
    }
    // wheelhouse
    const ud = (x) => (x + L / 2) / L;
    const DY = deck(ud(-1.2)) - 0.02;
    hex("bHull", [[-2.0, DY, -0.65], [-0.55, DY, -0.65], [-0.55, DY, 0.65], [-2.0, DY, 0.65],
      [-2.0, DY + 1.4, -0.62], [-0.75, DY + 1.4, -0.62], [-0.75, DY + 1.4, 0.62], [-2.0, DY + 1.4, 0.62]]);
    box("bRed", -2.12, -0.62, DY + 1.4, DY + 1.5, -0.74, 0.74);
    // windows: front (raked, +X) and both sides
    const fr = (t, y) => [-0.55 - 0.2 * ((y - DY) / 1.4) + 0.008, y, t];
    for (const [z0, z1] of [[-0.52, -0.2], [-0.15, 0.15], [0.2, 0.52]])
      quad("bDark", fr(z0, DY + 0.85), fr(z1, DY + 0.85), fr(z1, DY + 1.25), fr(z0, DY + 1.25), [-1.2, DY + 1, 0]);
    for (const s of [1, -1])
      for (const [x0, x1] of [[-1.85, -1.4], [-1.3, -0.85]])
        quad("bDark", [x0, DY + 0.85, s * 0.645], [x1, DY + 0.85, s * 0.645], [x1, DY + 1.25, s * 0.632], [x0, DY + 1.25, s * 0.632], [-1.2, DY + 1, 0]);
    // flag pole and flag on the roof
    const PY = DY + 1.5;
    tube("bDark", [[-1.7, PY, 0], [-1.7, PY + 1.95, 0]], 0.035, 6);
    for (let k = 0; k < 3; k++) {
      const xa = -1.72 - k * 0.3, xb = xa - 0.3, w = (t) => 0.06 * Math.sin(t * 3.2);
      hex("bRed", [[xa, PY + 1.3, w(k) - 0.012], [xb, PY + 1.3 - 0.02, w(k + 1) - 0.012], [xb, PY + 1.3 - 0.02, w(k + 1) + 0.012], [xa, PY + 1.3, w(k) + 0.012],
        [xa, PY + 1.9, w(k) - 0.012], [xb, PY + 1.88 - 0.04 * k, w(k + 1) - 0.012], [xb, PY + 1.88 - 0.04 * k, w(k + 1) + 0.012], [xa, PY + 1.9, w(k) + 0.012]]);
    }
    // bow mast with a yard
    const MY = deck(ud(2.3)) - 0.02;
    tube("bDark", [[2.3, MY, 0], [2.3, MY + 2.1, 0]], 0.04, 6);
    tube("bDark", [[2.3, MY + 1.7, -0.55], [2.3, MY + 1.7, 0.55]], 0.025, 5);
    ellip("bRed", [2.3, MY + 2.12, 0], 0.07, 0.07, 0.07, null, 8, 4);
    // stern A-frame, hanging net, net heap with floats
    const SY = deck(0.02) - 0.02, XA = -3.4;
    for (const s of [1, -1]) tube("bDark", [[XA, SY, s * 0.95], [XA + 0.15, SY + 1.85, s * 0.6]], 0.045, 6);
    tube("bDark", [[XA + 0.15, SY + 1.85, -0.7], [XA + 0.15, SY + 1.85, 0.7]], 0.045, 6);
    {
      const G = [];
      for (let i = 0; i <= 4; i++) {
        const t = i / 4, row = [];
        for (let j = 0; j <= 6; j++) {
          const zz = -0.55 + (1.1 * j) / 6, y = SY + 1.83 - t * 1.2, fold = 0.06 * Math.sin(j * 2.1 + t * 2);
          row.push([XA + 0.13 - t * 0.12 + fold, y, zz * (1 - 0.25 * t)]);
        }
        G.push(row);
      }
      // a closed sheet: front and back faces 4 cm apart, wound from the sheet centre
      const ctr = [XA + 0.08, SY + 1.2, 0];
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 6; j++)
          for (const o of [0.02, -0.02]) {
            const P = (q) => [q[0] + o, q[1], q[2]];
            quad("bNet", P(G[i][j]), P(G[i][j + 1]), P(G[i + 1][j + 1]), P(G[i + 1][j]), add(ctr, [-o * 10, 0, 0]));
          }
      for (let i = 0; i < 4; i++) for (const j of [0, 6]) quad("bNet", add(G[i][j], [0.02, 0, 0]), add(G[i + 1][j], [0.02, 0, 0]), add(G[i + 1][j], [-0.02, 0, 0]), add(G[i][j], [-0.02, 0, 0]), ctr);
      for (const i of [0, 4]) for (let j = 0; j < 6; j++) quad("bNet", add(G[i][j], [0.02, 0, 0]), add(G[i][j + 1], [0.02, 0, 0]), add(G[i][j + 1], [-0.02, 0, 0]), add(G[i][j], [-0.02, 0, 0]), ctr);
    }
    ellip("bNet", [-2.75, SY + 0.05, 0.05], 0.55, 0.32, 0.72, null, 12, 6);
    ellip("bNet", [-2.45, SY + 0.12, -0.25], 0.35, 0.26, 0.4, null, 10, 5);
    [[-3.1, 0.25, 0.5], [-2.75, 0.36, 0.45], [-2.35, 0.27, 0.55], [-2.95, 0.3, -0.45], [-2.4, 0.33, -0.4]].forEach(([x, y, z]) =>
      ellip("bRed", [x, SY + y, z], 0.085, 0.085, 0.085, null, 8, 4));
    // cleats on the port (quay) side, bow and stern
    for (const u of [0.83, 0.07]) {
      const p = PT(u, -1)[0];
      box("bDark", p[0] - 0.12, p[0] + 0.12, p[1] + 0.05, p[1] + 0.13, p[2] + 0.08, p[2] + 0.16);
      cleats.push([p[0], p[1] + 0.1, p[2] + 0.12]);
    }
    for (const k of Object.keys(soups)) bsoups[k] = soups[k], delete soups[k];
    Object.assign(soups, saved);
  }

  // ---------- water ----------
  const WZ = 6;
  box("water", -QX, QX, 0, W0, 0.0, WZ);
  const RY = W0 + 0.006, NR = 3, RSEG = 44, ND = 7, DSEG = 6;
  const ringFor = withBoat ? NR : 0;
  function ripples(t) {
    const p = [], ph = (((t / CLIP_T) % 1) + 1) % 1;
    const inWater = (x, z) => z > 0.12 && z < WZ - 0.1 && Math.abs(x) < QX - 0.1;
    const q = (a, b, e, d) => p.push(...a, ...b, ...e, ...a, ...e, ...d);
    for (let k = 0; k < ringFor; k++) {
      const f = (k + ph) / NR, s = 0.25 + 2.4 * f, w = 0.09 * Math.sin(Math.PI * f);
      const ax = L / 2 + 0.25 + s, az = HB + 0.15 + 0.7 * s;
      for (let j = 0; j < RSEG; j++) {
        const cl = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
        const pt = (a, o) => [cl(BX + (ax + o) * Math.cos(a), -QX + 0.1, QX - 0.1), RY, cl(BZ + (az + o) * Math.sin(a), 0.12, WZ - 0.1)];
        const a0 = (j / RSEG) * TAU, a1 = ((j + 1) / RSEG) * TAU;
        const m0 = inWater(...[pt(a0, 0)[0], pt(a0, 0)[2]]) && inWater(pt(a1, 0)[0], pt(a1, 0)[2]) ? 1 : 0;
        const wj = w * m0 * (j % 4 === 3 ? 0 : 1); // broken rings: every fourth segment is a gap
        q(pt(a0, -wj), pt(a1, -wj), pt(a1, wj), pt(a0, wj));
      }
    }
    for (let k = 0; k < ND; k++) { // dashes drifting +X across open water
      const f = (((k * 0.37 + ph) % 1) + 1) % 1, z = 3.2 + 0.36 * k + 0.5 * Math.sin(k * 1.7), x0 = -5.4 + 1.35 * k + 0.3 * Math.sin(k * 2.9) + 1.2 * f;
      const w = 0.06 * Math.sin(Math.PI * f), len = 0.9;
      for (let j = 0; j < DSEG; j++) {
        const u0 = j / DSEG, u1 = (j + 1) / DSEG, h = (u) => w * Math.sin(Math.PI * u);
        const xa = x0 + len * u0, xb = x0 + len * u1;
        q([xa, RY, z + h(u0)], [xb, RY, z + h(u1)], [xb, RY, z - h(u1)], [xa, RY, z - h(u0)]); // wound to face +Y
      }
    }
    return p;
  }
  const CLIP_T = 4;

  // ---------- meshes, one per material ----------
  const MAT = {
    concrete: [c.concrete, c.concreteShade, { threshold: 0.35, px: 4 }],
    iron: [c.iron, c.ironShade, { threshold: 0.3, px: 3 }],
    tyre: [c.tyre, c.tyre, { threshold: 0.3, px: 3 }],
    wood: [c.wood, c.woodShade, { threshold: 0.25, px: 3 }],
    warm: [c.warm, c.warmShade, { threshold: 0.3, px: 3 }],
    crate: [c.crate, c.crateShade, { threshold: 0.3, px: 3 }],
    gull: [c.gull, c.gullShade, { threshold: 0.2, px: 2.5 }],
    dark: [c.dark, c.dark, { outline: false }],
    water: [c.water, c.water, { threshold: 0.35, px: 3 }],
    bHull: [c.hull, c.hullShade, { threshold: 0.12, px: 4 }],
    bRed: [c.warm, c.warmShade, { threshold: -0.05, px: 3 }],
    bDark: [c.dark, c.dark, { outline: false }],
    bNet: [c.net, c.netShade, { threshold: 0.3, px: 3 }],
  };
  const mk = (s, key, parent) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    const [base, shade, o] = MAT[key];
    const mesh = kit.toon(g, base, shade, o);
    mesh.name = key;
    parent.add(mesh);
    return mesh;
  };
  for (const [key, s] of Object.entries(soups)) mk(s, key, body);
  if (withBoat) {
    for (const [key, s] of Object.entries(bsoups)) mk(s, key, boat);
    body.add(boat);
  }
  // ripples (rewritten per frame, normals up, no ink)
  const rp = ripples(0);
  const rg = new THREE.BufferGeometry();
  rg.setAttribute("position", new THREE.Float32BufferAttribute(rp, 3));
  rg.setAttribute("normal", new THREE.Float32BufferAttribute(rp.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  const rmesh = kit.toon(rg, c.ripple, c.ripple, { outline: false });
  rmesh.name = "ripple";
  rmesh.frustumCulled = false;
  body.add(rmesh);
  // mooring lines: bollard base -> cleat, a sagging tube (rewritten per frame)
  const MOOR = [[BOL[2][0] - 0.05, QT + 0.12, BOL[2][1] + 0.12], [BOL[0][0] + 0.05, QT + 0.12, BOL[0][1] + 0.12]];
  const qv = new THREE.Vector3();
  function moorArrays() {
    const out = { p: [], n: [] };
    cleats.forEach((cl, k) => {
      qv.set(...cl).applyMatrix4(boat.matrix);
      const a = MOOR[k], b = qv.toArray(), pts = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10, pp = add(a, mul(sub(b, a), t));
        pp[1] -= 0.35 * 4 * t * (1 - t);
        pts.push(pp);
      }
      const tb = tubeArrays(pts, 0.025, 5);
      out.p.push(...tb.p), out.n.push(...tb.n);
    });
    return out;
  }
  let mmesh = null;
  if (withBoat) {
    boat.position.set(BX, W0, BZ);
    boat.updateMatrix();
    const m0 = moorArrays();
    const mg = new THREE.BufferGeometry();
    mg.setAttribute("position", new THREE.Float32BufferAttribute(m0.p, 3));
    mg.setAttribute("normal", new THREE.Float32BufferAttribute(m0.n, 3));
    mmesh = kit.toon(mg, c.wood, c.woodShade, { threshold: 0.25, px: 2.5 });
    mmesh.name = "mooring";
    mmesh.frustumCulled = false;
    body.add(mmesh);
  }
  body.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(body);
  body.position.set(-(bb.min.x + bb.max.x) / 2, 0, -(bb.min.z + bb.max.z) / 2);

  // ---------- pose and clip ----------
  // bob: heave (m), roll about the boat's long axis X (+ lifts the sea side), pitch about Z (+ lifts the bow)
  const CLIPS = { bob: CLIP_T };
  function apply(t) {
    const w = TAU * (t / CLIP_T);
    if (withBoat) {
      boat.position.set(BX, W0 + 0.04 * Math.sin(w), BZ);
      boat.rotation.set(3 * D * Math.sin(w + 0.9), 0, 1 * D * Math.sin(2 * w + 0.4));
      boat.updateMatrix();
      const m = moorArrays(), g = mmesh.geometry;
      g.attributes.position.array.set(m.p), g.attributes.normal.array.set(m.n);
      g.attributes.position.needsUpdate = g.attributes.normal.needsUpdate = true;
      if (g.attributes.hullNormal) g.attributes.hullNormal.array.set(m.n), (g.attributes.hullNormal.needsUpdate = true);
      g.computeBoundingSphere();
    }
    rg.attributes.position.array.set(ripples(t));
    rg.attributes.position.needsUpdate = true;
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`fishing-pier: no clip "${m[1]}" (clips: bob)`);
      return apply(+m[2]);
    }
    if (name !== "rest") throw new Error(`fishing-pier: unknown pose "${name}" (rest, or bob@<seconds>)`);
    apply(0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
