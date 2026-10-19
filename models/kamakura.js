// kamakura.js - a winter snow scene set piece: a kamakura snow hut, a two-ball snowman (yukidaruma) and three snow
// bunnies (yuki-usagi) on a lumpy patch of snow. Static.
// Contract: harness/lab/README.md. Meters, +Y up, the set faces +Z (the hut's doorway turned 40 deg toward +X), its
// left is +X, the snow patch's
// underside stands on y = 0, centred on x = 0, z = 0 (the patch is symmetric, so the bbox is centred).
//
// Construction (triangle soups with analytic normals, merged per material across every piece: 10 meshes):
//   PATCH  an elliptic heightfield on a polar grid: a gentle base, nine fixed lumps (gaussians) and two sine ripples,
//          flattened under the hut and the snowman, a low drift ringing the hut's foot (parted at the entrance),
//          falling to y = 0 at the rim; a flat underside closes it. Normals from the height gradient. Threshold 0.62,
//          so the flat snow stays lit and only the lumps' far slopes go to the cool shade.
//   HUT    two superellipse domes of revolution (|r/R|^p + |y/H|^p = 1, p = 2.3, so the walls rise near vertical at the
//          foot as a packed-snow kamakura's do): the outer shell outward, the inner shell (the cavity) inward, normals
//          from the implicit gradient. Cells whose centre lies inside a mid arch on the entrance side are dropped from
//          both shells. A doorway is swept through the wall between an inner arch (the opening) and an outer arch: its
//          front ring lies on the dome, from 1 cm under it at the outer arch to 3 cm proud at the opening, so it buries
//          the dome's jagged hole edge and meets the dome in a smooth crease; the passage (reveal) runs from 3 cm inside
//          the cavity to the ring. A charcoal tube rides the opening's edge as its ink line (the hull draws silhouettes
//          only). Hidden closing faces of the doorway sit 5 cm inside the wall in the unlined interior material.
//          The hut is turned 40 deg toward the hero / three4 cameras so the doorway and the interior read there.
//          Inside: a snow altar shelf on the back wall (left of centre, where the hero's line of sight lands) with a
//          small red shrine box and two mochi, a candle lantern beside it, a straw mat (goza) with weave lines, a round
//          hibachi brazier with coals on the mat.
//   SNOWMAN two stacked ellipsoid balls (the Japanese two-ball kind), charcoal eyes and a three-piece charcoal mouth,
//          an upturned red bucket (a closed frustum lathe and a rim band) tilted on the head, two forked twig arms
//          (tapered tubes, every end a point, the root buried in the body). Turned 25 deg toward the hero camera.
//   BUNNIES snow ovals (ellipsoids, half sunk), two red berry eyes each, two leaf ears raised 63 deg and laid back.
//   Every triangle is wound from its analytic normal (the cross product is checked against it), never by hand.
// Proportions (real size, base unit the hut diameter D = 2.4 m): hut 2.4 wide x 1.8 tall (0.75 D), walls 0.3 thick
//   (inner 1.8 x 1.5); doorway 0.68 wide x 1.0 tall, outer arch 1.12 x 1.25; cavity floor 0.077; shelf top 0.72;
//   mat 1.3 x 1.2; brazier 0.36 across, 0.2 tall. Snowman ~1.15 tall to the bucket top (body r 0.34, head r 0.25,
//   bucket 0.18); eyes 8 cm (1/14 of the snowman). Bunnies 0.36 long, ears 0.2. Patch 5.2 x 4.0, 6-20 cm deep.
//   Hut centre (-0.6, -0.35), snowman (1.45, 0.25), bunnies at (1.15, 0.9), (2.15, 0.65), (-1.7, 0.9).
// Options: build(THREE, kit, colors, { height, night, snowman }).
//   height   scales the whole set uniformly so the dome top is `height` (default 1.8 m).
//   night    false (default): the cavity is cool shadow, the lantern paper unlit, the coals charcoal. true: the cavity,
//            the passage, the mat, the lantern and the coals switch to the script's practical colours (no emissive in
//            the kit: a glow is a flat cel tone, as chochin's lit paper). Same script; the film's sky does the rest.
//   snowman  true (default); false leaves the hut, the patch and the bunnies.
// Budget: ~20.5k triangles (outer dome 6.5k, patch 4.4k), 10 meshes in either variant.
// Colours (indigo, base / shade):
//   snow      sclera #f6f3ee / moon #d5e2ff (warm white, cool moonlit shade) - hut, doorway ring, snowman, bunnies
//   reveal    the same pair, no hull (the passage, the shelf, the mochi: inside the doorway's ink)
//   patch     line #e7eefc / moon #d5e2ff (a cooler white than the hut, so the two snows separate)
//   interior  day moon #d5e2ff / sky #1b2d6b at 0.75 (deep-blue shadow, a lit sliver at the crown);
//             night practical #f0c36a / iris #e7a04a (the warm glow), no hull
//   mat       practical #f0c36a / iris #e7a04a (straw); night iris / accent #e23b4a
//   wood      iris #e7a04a / sky #1b2d6b (twigs, brazier): indigo has no brown; iris reads as wood in the cel look
//   red       accent #e23b4a / sky #1b2d6b (bucket, berries, shrine box; the coals at night)
//   char      hair #16141c flat, no hull (eyes, mouth, weave lines, doorway ink, caps; the coals by day)
//   leaf      sky #1b2d6b / hair #16141c (indigo has no green: a dark leaf in moonlight)
//   glow      day line #e7eefc / moon (unlit paper); night sclera #f6f3ee flat (the candle)

export const meta = {
  name: "kamakura",
  height: 1.8,
  script: "indigo",
  colors: {
    snow: "#f6f3ee", snowShade: "#d5e2ff",
    patch: "#e7eefc", patchShade: "#d5e2ff",
    inside: "#d5e2ff", insideShade: "#1b2d6b",
    insideLit: "#f0c36a", insideLitShade: "#e7a04a",
    mat: "#f0c36a", matShade: "#e7a04a",
    matLit: "#e7a04a", matLitShade: "#e23b4a",
    wood: "#e7a04a", woodShade: "#1b2d6b",
    red: "#e23b4a", redShade: "#1b2d6b",
    char: "#16141c",
    leaf: "#1b2d6b", leafShade: "#16141c",
    paper: "#e7eefc", paperShade: "#d5e2ff",
    paperLit: "#f6f3ee",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, night = false, snowman = true } = opts;
  const root = new THREE.Group();
  root.name = "kamakura";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / meta.height);
  root.add(body);
  const joints = {};

  // ---------- soups: positions + normals per material ----------
  const soups = {};
  const S = (k) => (soups[k] ??= { p: [], n: [] });
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  // one triangle, wound so its face normal agrees with the summed vertex normals; slivers dropped
  let CUR = null; // a placement applied to everything emitted while set (the hut is built at the origin, then turned)
  function tri(k, a, b, e, na, nb, ne) {
    if (CUR) [a, b, e, na, nb, ne] = [CUR.p(a), CUR.p(b), CUR.p(e), CUR.n(na), CUR.n(nb), CUR.n(ne)];
    const f = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...f) < 1e-9) return;
    const s = S(k);
    const m = [na[0] + nb[0] + ne[0], na[1] + nb[1] + ne[1], na[2] + nb[2] + ne[2]];
    if (dot(f, m) < 0) [b, e, nb, ne] = [e, b, ne, nb];
    s.p.push(...a, ...b, ...e);
    s.n.push(...na, ...nb, ...ne);
  }
  const quad = (k, a, b, e, d, na, nb, ne, nd) => (tri(k, a, b, e, na, nb, ne), tri(k, a, e, d, na, ne, nd));
  // a grid of P[i][j] = [point, normal], (U+1) x (V+1); skip(i, j) drops a cell
  function grid(k, P, skip) {
    for (let i = 0; i + 1 < P.length; i++)
      for (let j = 0; j + 1 < P[i].length; j++) {
        if (skip && skip(P, i, j)) continue;
        const [a, b, e, d] = [P[i][j], P[i + 1][j], P[i + 1][j + 1], P[i][j + 1]];
        quad(k, a[0], b[0], e[0], d[0], a[1], b[1], e[1], d[1]);
      }
  }
  // transform: rotate (Euler, radians) then translate
  const M = (pos, rot = [0, 0, 0]) => {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rot, "YXZ"));
    m.setPosition(...pos);
    const v = new THREE.Vector3();
    return {
      p: (q) => (v.set(...q).applyMatrix4(m), [v.x, v.y, v.z]),
      n: (q) => (v.set(...q).transformDirection(m), [v.x, v.y, v.z]),
    };
  };
  // ellipsoid with radii r at pos, rotated
  function ell(k, pos, r, rot, seg = 14) {
    const T = M(pos, rot), P = [];
    for (let i = 0; i <= seg; i++) {
      const th = (i / seg) * Math.PI, row = [];
      for (let j = 0; j <= seg * 2; j++) {
        const ph = (j / (seg * 2)) * Math.PI * 2;
        const u = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
        row.push([T.p([u[0] * r[0], u[1] * r[1], u[2] * r[2]]), T.n(nrm([u[0] / r[0], u[1] / r[1], u[2] / r[2]]))]);
      }
      P.push(row);
    }
    grid(k, P);
  }
  // lathe of a profile [[r, y], ...] from r = 0 to r = 0 (closed); flat per profile segment, smooth around
  function lathe(k, pos, rot, prof, seg = 16) {
    const T = M(pos, rot);
    for (let s = 0; s + 1 < prof.length; s++) {
      const [r0, y0] = prof[s], [r1, y1] = prof[s + 1];
      const mid = [(r0 + r1) / 2, (y0 + y1) / 2];
      let n2 = [y1 - y0, -(r1 - r0)]; // a normal of the segment in (r, y)
      // outward: away from the profile's centroid (r small, y mid) - the lathe is convex enough for this
      const cy = prof.reduce((q, v) => q + v[1], 0) / prof.length;
      if (n2[0] * mid[0] + n2[1] * (mid[1] - cy) < 0) n2 = [-n2[0], -n2[1]];
      for (let j = 0; j < seg; j++) {
        const a0 = (j / seg) * Math.PI * 2, a1 = ((j + 1) / seg) * Math.PI * 2;
        const P = (r, y, a) => T.p([r * Math.cos(a), y, r * Math.sin(a)]);
        const N = (a) => T.n(nrm([n2[0] * Math.cos(a), n2[1], n2[0] * Math.sin(a)]));
        quad(k, P(r0, y0, a0), P(r0, y0, a1), P(r1, y1, a1), P(r1, y1, a0), N(a0), N(a1), N(a1), N(a0));
      }
    }
  }
  function box(k, cx, cy, cz, sx, sy, sz, rotY = 0) {
    const T = M([cx, cy, cz], [0, rotY, 0]);
    const h = [sx / 2, sy / 2, sz / 2];
    for (let ax = 0; ax < 3; ax++)
      for (const sg of [-1, 1]) {
        const [u, v] = [(ax + 1) % 3, (ax + 2) % 3];
        const n = [0, 0, 0]; n[ax] = sg;
        const corner = (a, b) => { const q = [0, 0, 0]; q[ax] = sg * h[ax]; q[u] = a * h[u]; q[v] = b * h[v]; return T.p(q); };
        const N = T.n(n);
        quad(k, corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1), N, N, N, N);
      }
  }
  // tapered tube along pts with radii rs (0 at an end makes a point); radial normals
  function tube(k, pts, rs, sides = 6) {
    const rings = pts.map((p, i) => {
      const d = nrm(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
      const up = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const s = nrm(cross(d, up)), u = cross(s, d);
      return Array.from({ length: sides + 1 }, (_, j) => {
        const a = (j / sides) * Math.PI * 2;
        const n = [0, 1, 2].map((q) => s[q] * Math.cos(a) + u[q] * Math.sin(a));
        return [[0, 1, 2].map((q) => p[q] + n[q] * rs[i]), rs[i] === 0 ? d.map((x) => x * (i === 0 ? -1 : 1)) : n];
      });
    });
    grid(k, rings);
  }

  // ---------- the snow patch ----------
  const HUT = [-0.6, -0.35], HUT_YAW = 0.7, MAN = [1.45, 0.25];
  const A = 2.6, B = 2.0;
  const LUMPS = [[1.6, -1.0, 0.45, 0.12], [-2.0, 0.6, 0.4, 0.1], [-0.2, 1.45, 0.35, 0.08], [2.0, 0.9, 0.35, 0.1],
    [-1.3, 1.35, 0.3, 0.09], [0.6, -1.45, 0.4, 0.1], [-2.1, -0.7, 0.32, 0.08], [1.5, 1.45, 0.28, 0.07], [0.55, -0.4, 0.25, 0.06]];
  const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const GROUND = 0.065; // the patch height under the hut and the snowman
  function hRaw(x, z) {
    let b = 0;
    for (const [lx, lz, s, a] of LUMPS) b += a * Math.exp(-((x - lx) ** 2 + (z - lz) ** 2) / (s * s));
    b += 0.012 * Math.sin(3.1 * x + 0.7) * Math.sin(2.3 * z + 1.9) + 0.008 * Math.sin(5.3 * x - 4.1 * z);
    const dh = Math.hypot(x - HUT[0], z - HUT[1]), dm = Math.hypot(x - MAN[0], z - MAN[1]);
    const flat = smooth(1.15, 1.7, dh) * smooth(0.35, 0.7, dm);
    const ang = Math.atan2(x - HUT[0], z - HUT[1]) - HUT_YAW; // 0 straight out of the entrance
    const gap = smooth(0.45, 0.75, Math.abs(Math.atan2(Math.sin(ang), Math.cos(ang))));
    const drift = 0.07 * Math.exp(-(((dh - 1.3) / 0.2) ** 2)) * (dh > 1.15 ? 1 : 0.3) * gap;
    return GROUND + drift + flat * (0.025 + b);
  }
  const rim = (x, z) => { const q = Math.hypot(x / A, z / B); return Math.sqrt(Math.max(0, 1 - q ** 8)); };
  const h = (x, z) => hRaw(x, z) * rim(x, z);
  {
    const K = 34, MM = 64, P = [], e = 1e-3;
    for (let i = 0; i <= K; i++) {
      const row = [], q = i / K;
      for (let j = 0; j <= MM; j++) {
        const a = (j / MM) * Math.PI * 2, x = A * q * Math.cos(a), z = B * q * Math.sin(a);
        const y = h(x, z);
        const gx = (h(x + e, z) - h(x - e, z)) / (2 * e), gz = (h(x, z + e) - h(x, z - e)) / (2 * e);
        row.push([[x, y, z], i === K ? nrm([Math.cos(a) / A, 0.3, Math.sin(a) / B]) : nrm([-gx, 1, -gz])]);
      }
      P.push(row);
    }
    grid("patch", P);
    const down = [0, -1, 0];
    for (let j = 0; j < MM; j++) tri("patch", [0, 0, 0], P[K][j][0], P[K][j + 1][0], down, down, down);
  }

  // ---------- the hut ----------
  const hx = 0, hz = 0;
  CUR = M([HUT[0], 0, HUT[1]], [0, HUT_YAW, 0]);
  const PE = 2.3, E = 2 / PE;
  const RO = 1.2, HO = 1.8, RI = 0.9, FL = GROUND + 0.012, HI = 1.5 - GROUND;
  // inner arch (the opening), mid arch (where shell cells are dropped), outer arch (the tunnel's skin)
  const arch = (hw, crown) => ({ hw, spring: crown - hw });
  const IN = arch(0.34, 1.0), MID = arch(0.4, 1.06), OUT = arch(0.56, 1.25);
  const inArch = (ar, x, y) => Math.abs(x) < ar.hw && (y < ar.spring || x * x + (y - ar.spring) ** 2 < ar.hw * ar.hw);
  function dome(k, R, H, y0, sign, NT, NA) {
    const P = [];
    for (let i = 0; i <= NT; i++) {
      const t = (i / NT) * Math.PI / 2, cc = Math.cos(t), ss = Math.sin(t);
      const r = R * Math.pow(cc, E), y = H * Math.pow(ss, E);
      const nr = Math.pow(r, PE - 1) / Math.pow(R, PE), ny = Math.pow(y, PE - 1) / Math.pow(H, PE);
      const row = [];
      for (let j = 0; j <= NA; j++) {
        const a = (j / NA) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        row.push([[hx + r * ca, y0 + y, hz + r * sa], nrm([sign * nr * ca, sign * ny, sign * nr * sa])]);
      }
      P.push(row);
    }
    grid(k, P, (P, i, j) => {
      const q = [P[i][j], P[i + 1][j], P[i + 1][j + 1], P[i][j + 1]].map((v) => v[0]);
      const m = [0, 1, 2].map((a) => q.reduce((s, v) => s + v[a], 0) / 4);
      return m[2] > hz && inArch(MID, m[0] - hx, m[1]);
    });
  }
  const interior = night ? "insideLit" : "inside";
  dome("snow", RO, HO, 0, 1, 34, 96);
  dome(interior, RI, HI, FL, -1, 22, 72);
  // cavity floor
  {
    const up = [0, 1, 0], N = 48;
    for (let j = 0; j < N; j++) {
      const a0 = (j / N) * Math.PI * 2, a1 = ((j + 1) / N) * Math.PI * 2;
      tri(interior, [hx, FL, hz], [hx + RI * Math.cos(a0), FL, hz + RI * Math.sin(a0)], [hx + RI * Math.cos(a1), FL, hz + RI * Math.sin(a1)], up, up, up);
    }
  }
  // the tunnel: arch paths with matching parameters, swept along z from zb (inside the cavity) to zf (proud of the wall)
  {
    const zb = hz + 0.5, NP = 36;
    const path = (ar, y0) => {
      const pts = [];
      const legL = ar.spring - y0, arc = Math.PI * ar.hw, L = 2 * legL + arc;
      for (let i = 0; i <= NP; i++) {
        const s = (i / NP) * L;
        if (s <= legL) pts.push([[-ar.hw, y0 + s], [-1, 0]]);
        else if (s >= legL + arc) pts.push([[ar.hw, ar.spring - (s - legL - arc)], [1, 0]]);
        else { const a = Math.PI - ((s - legL) / arc) * Math.PI; pts.push([[ar.hw * Math.cos(a), ar.spring + ar.hw * Math.sin(a)], [Math.cos(a), Math.sin(a)]]); }
      }
      return pts;
    };
    const po = path(OUT, 0), pi = path(IN, FL);
    // the front follows the dome, 3 cm proud: a hole cut in the dome with a thick reveal, not an igloo tunnel
    const rOut = (y) => RO * Math.pow(Math.max(0, 1 - Math.pow(Math.min(y, HO) / HO, PE)), 1 / PE);
    const zfAt = (q, lip = 0.03) => Math.sqrt(Math.max(0.0025, rOut(q[1]) ** 2 - q[0] * q[0])) + lip;
    const dN = (q) => {
      const z = zfAt(q, 0), r = Math.hypot(q[0], z) || 1;
      const nr = Math.pow(r, PE - 1) / Math.pow(RO, PE), ny = Math.pow(Math.max(q[1], 0), PE - 1) / Math.pow(HO, PE);
      return nrm([nr * q[0] / r, ny, nr * z / r]);
    };
    const rIn = (y) => RI * Math.pow(Math.max(0, 1 - Math.pow(Math.min(Math.max(y - FL, 0), HI) / HI, PE)), 1 / PE);
    const ziAt = (q) => Math.sqrt(Math.max(0.0025, rIn(q[1]) ** 2 - q[0] * q[0])) - 0.03; // the passage starts 3 cm into the cavity
    const W = (q, z) => [hx + q[0], q[1], z];
    for (let i = 0; i < NP; i++) {
      const [a, b] = [po[i], po[i + 1]], n = (v) => [v[1][0], v[1][1], 0];
      quad(interior, W(a[0], zb), W(b[0], zb), W(b[0], zfAt(b[0], -0.05)), W(a[0], zfAt(a[0], -0.05)), n(a), n(b), n(b), n(a));
      const [ia, ib] = [pi[i], pi[i + 1]], m = (v) => [-v[1][0], -v[1][1], 0];
      quad(night ? interior : "reveal", W(ia[0], ziAt(ia[0])), W(ib[0], ziAt(ib[0])), W(ib[0], zfAt(ib[0])), W(ia[0], zfAt(ia[0])), m(ia), m(ib), m(ib), m(ia));
      const bk = [0, 0, -1];
      quad("snow", W(a[0], zfAt(a[0], -0.01)), W(b[0], zfAt(b[0], -0.01)), W(ib[0], zfAt(ib[0])), W(ia[0], zfAt(ia[0])), dN(a[0]), dN(b[0]), dN(ib[0]), dN(ia[0]));
      quad(interior, W(a[0], zb), W(b[0], zb), W(ib[0], zb), W(ia[0], zb), bk, bk, bk, bk);
    }
    const zf = zfAt([IN.hw, FL]);
    // the doorway's ink: a charcoal-coloured tube along the inner arch at the face (the hull draws silhouettes only)
    tube("char", pi.map((v) => W([v[0][0] - Math.sign(v[1][0]) * 0.0 , v[0][1]], zfAt(v[0], 0.03))), pi.map(() => 0.016), 6);
    // the passage floor and the buried leg bottoms
    const up = [0, 1, 0], dn = [0, -1, 0];
    for (let k = 0; k < 8; k++) {
      const [x0, x1] = [-IN.hw + (k / 8) * 2 * IN.hw, -IN.hw + ((k + 1) / 8) * 2 * IN.hw], y = FL + 0.002;
      quad(night ? interior : "reveal", [hx + x0, y, ziAt([x0, y])], [hx + x1, y, ziAt([x1, y])], [hx + x1, y, zfAt([x1, y], 0)], [hx + x0, y, zfAt([x0, y], 0)], up, up, up, up);
    }
    for (const sg of [-1, 1]) {
      const [x0, x1] = [hx + sg * OUT.hw, hx + sg * IN.hw];
      quad(interior, [x0, 0, zb], [x1, FL, zb], [x1, FL, zf], [x0, 0, zf], dn, dn, dn, dn);
    }
  }
  // inside: the altar shelf on the back wall, a shrine box, mochi, a candle lantern
  const sx = hx - 0.3, zw = hz - Math.sqrt(0.824 ** 2 - 0.3 ** 2); // left of centre, where the hero's line of sight lands
  box("reveal", sx, 0.69, zw + 0.12, 0.62, 0.06, 0.3);
  box("red", sx - 0.08, 0.79, zw + 0.15, 0.14, 0.14, 0.11);
  box("char", sx - 0.08, 0.875, zw + 0.15, 0.18, 0.03, 0.15);
  ell("reveal", [sx - 0.08, 0.745, zw + 0.25], [0.04, 0.022, 0.04], [0, 0, 0], 8);
  ell("reveal", [sx - 0.08, 0.775, zw + 0.25], [0.028, 0.017, 0.028], [0, 0, 0], 8);
  lathe("char", [sx + 0.16, 0.72, zw + 0.16], [0, 0, 0], [[0, 0], [0.075, 0], [0.075, 0.025], [0, 0.025]], 12);
  lathe(night ? "glowLit" : "glow", [sx + 0.16, 0.745, zw + 0.16], [0, 0, 0], [[0, 0], [0.065, 0], [0.065, 0.15], [0, 0.15]], 12);
  lathe("char", [sx + 0.16, 0.895, zw + 0.16], [0, 0, 0], [[0, 0], [0.078, 0], [0.04, 0.035], [0, 0.035]], 12);
  // the mat and its weave lines
  const mz = hz + 0.12;
  box(night ? "matLit" : "mat", hx, FL + 0.012, mz, 1.3, 0.024, 1.2);
  for (let i = -3; i <= 3; i++) box("char", hx + i * 0.17, FL + 0.0255, mz, 0.007, 0.002, 1.18);
  // the hibachi and its coals
  const bz = hz + 0.08;
  lathe("wood", [hx, FL + 0.024, bz], [0, 0, 0], [[0, 0], [0.15, 0], [0.18, 0.06], [0.18, 0.17], [0.165, 0.2], [0.13, 0.2], [0.13, 0.16], [0, 0.16]], 18);
  for (const [dx, dz, r] of [[0, 0, 0.05], [0.06, 0.04, 0.035], [-0.05, 0.05, 0.04], [0.04, -0.06, 0.04], [-0.06, -0.04, 0.035]])
    ell(night ? "red" : "char", [hx + dx, FL + 0.19, bz + dz], [r, r * 0.6, r], [0, 0, 0], 6);
  CUR = null;

  // ---------- the snowman ----------
  if (snowman) {
    const [sx, sz] = MAN, g = GROUND, yaw = 0.44;
    const T = M([sx, 0, sz], [0, yaw, 0]);
    const at = (q) => T.p(q);
    ell("snow", at([0, g + 0.28, 0]), [0.34, 0.31, 0.34], [0, yaw, 0], 13);
    const hy = g + 0.28 + 0.27 + 0.2; // head centre
    ell("snow", at([0, hy, 0]), [0.25, 0.23, 0.25], [0, yaw, 0], 12);
    // charcoal face on the head's front (+Z local)
    const onHead = (ex, ey, d = 0.0) => { const v = nrm([ex, ey, 1]); return at([v[0] * 0.25 * 0.97, hy + v[1] * 0.23 * 0.97, v[2] * 0.25 * 0.97 + d]); };
    for (const s of [-1, 1]) ell("char", onHead(s * 0.36, 0.22), [0.038, 0.042, 0.022], [-0.2, yaw + s * 0.36, 0], 8);
    for (const ex of [-0.24, 0, 0.24]) ell("char", onHead(ex, -0.3 + Math.abs(ex) * 0.35), [0.03, 0.016, 0.018], [0.3, yaw + ex, 0], 6);
    // the upturned bucket, tilted back and to its left
    lathe("red", at([0.03, hy + 0.16, -0.03]), [-0.22, yaw, 0.12], [[0, 0], [0.155, 0], [0.12, 0.18], [0, 0.18]], 18);
    lathe("red", at([0.03, hy + 0.16, -0.03]), [-0.22, yaw, 0.12], [[0, 0.01], [0.165, 0.01], [0.165, 0.035], [0, 0.035]], 18);
    // twig arms: a root inside the body, out and up, a fork near the tip
    for (const s of [-1, 1]) {
      const p = (x, y, z) => at([s * x, g + y, z]);
      tube("wood", [p(0.15, 0.42, 0), p(0.33, 0.47, 0.02), p(0.52, 0.56, 0.04), p(0.68, 0.66, 0.05)], [0.022, 0.02, 0.014, 0]);
      tube("wood", [p(0.5, 0.55, 0.04), p(0.6, 0.53, 0.09), p(0.68, 0.52, 0.12)], [0.012, 0.009, 0], 5);
      tube("wood", [p(0.58, 0.6, 0.045), p(0.62, 0.7, 0.03), p(0.64, 0.76, 0.02)], [0.01, 0.007, 0], 5);
    }
  }

  // ---------- the snow bunnies ----------
  // each faces local +Z; yaw turns it. Ears: leaves rooted on the crown, raised 55 deg and laid back, splayed.
  for (const [bx, bzz, yaw] of [[1.15, 0.9, -0.5], [2.15, 0.65, 0.35], [-1.7, 0.9, 0.9]]) {
    const y0 = h(bx, bzz), T = M([bx, 0, bzz], [0, yaw, 0]);
    ell("snow", T.p([0, y0 + 0.045, 0]), [0.12, 0.105, 0.18], [0, yaw, 0], 10);
    for (const s of [-1, 1]) {
      ell("red", T.p([s * 0.07, y0 + 0.1, 0.105]), [0.024, 0.024, 0.024], [0, 0, 0], 6);
      const dir = [s * 0.2, Math.sin(1.1), -Math.cos(1.1)], base = [s * 0.035, y0 + 0.14, 0.04], L = 0.1;
      const cen = [base[0] + dir[0] * L, base[1] + dir[1] * L, base[2] + dir[2] * L];
      ell("leaf", T.p(cen), [0.036, 0.009, L + 0.01], [-1.1, yaw + s * 0.25, 0], 6);
    }
  }

  // ---------- meshes ----------
  const MAT = {
    snow: [c.snow, c.snowShade, 0.3, true],
    patch: [c.patch, c.patchShade, 0.62, true],
    inside: [c.inside, c.insideShade, 0.75, false],
    insideLit: [c.insideLit, c.insideLitShade, 0.3, false],
    mat: [c.mat, c.matShade, 0.2, true],
    matLit: [c.matLit, c.matLitShade, 0.2, true],
    reveal: [c.snow, c.snowShade, 0.3, false],
    wood: [c.wood, c.woodShade, 0.2, true],
    red: [c.red, c.redShade, 0.2, true],
    char: [c.char, c.char, 0, false],
    leaf: [c.leaf, c.leafShade, 0.2, true],
    glow: [c.paper, c.paperShade, 0.2, true],
    glowLit: [c.paperLit, c.paperLit, -1, true],
  };
  for (const [key, s] of Object.entries(soups)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
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
