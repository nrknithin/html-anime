// science-lab.js - the school science room (rika-shitsu) of slice-of-life anime, at real size: a set piece with one clip.
// Contract: harness/lab/README.md. Meters, +Y up. A cutaway: the floor and two walls only, the front wall (blackboard,
// fume hood) at -Z and the display wall (specimen cabinet, skeleton, element chart) at -X, so the lab's front-left
// cameras (+X / +Z) look straight in from the pupils' side. Floor on y = 0, centred on x = z = 0.
//
// Construction (boxes, capped prisms, swept tubes, lathed glassware, ellipsoids, flat decals; all triangle soups merged
// per material, so the whole room is 14 meshes). Every triangle is wound away from a point inside its solid (box
// centre, prism or tube axis, lathe axis), never by hand.
//   SHELL      floor quad with a 40 cm tile grid; walls as boxes 12 cm thick with a dark section cap and skirting.
//   FRONT (-Z) a green blackboard in a pale aluminium frame with a chalk tray, chalk sticks and abstract chalk marks
//              (an atom of rings, a flask sketch, wave lines; no lettering); a fume hood at the +X end: base cabinet,
//              dark worktop, side panels, a dark open throat behind a half-raised glass sash, a duct into the wall.
//   BENCHES    a teacher's demonstration bench and four pupil benches (2 x 2): pale carcass on a dark plinth, black top
//              (dark green, the script's darkest tone above ink), a steel sink rim round a dark basin, a gooseneck tap,
//              four gas taps with red handles; four stools a bench (green seat, pale steel legs, a foot ring).
//   GLASSWARE  beakers, conical flasks and a test-tube rack on each bench, the liquid as the lower band of each lathe
//              (glass is opaque in cel, so the liquid colour is what reads); a microscope on the teacher's bench.
//   BUBBLE     on the pupil bench nearest the camera: a Bunsen burner fed by a red hose from a gas tap, a tripod with a
//              gauze square, a round-bottom flask of green liquid on it. Joint "flask" marks it for --focus.
//   DISPLAY    (-X) a glass-fronted green specimen cabinet (glazing bars and glints, no panes, so the jars on its
//              shelves read), a stylised skeleton on a stand (egg skull with dark sockets, rod spine, five rib hoops,
//              pelvis block, rod limbs, feet on the base plate, a hook from the stand's pole over the skull), and a
//              periodic-table-like chart: 18 x 7 cells in the familiar stepped outline plus two detached rows, blank
//              cells coloured by block, on a white sheet.
// Proportions (real size, base unit the storey H = 2.8 m): interior 6.4 (x) by 5.6 (z); bench tops 0.78 high,
//   1.8 x 1.0 (teacher 2.4 x 0.75); blackboard 3.0 x 1.2 at 0.9; hood 1.3 wide, worktop 0.88, top 2.45; cabinet 1.2 x
//   0.45 x 1.9; skeleton 1.62 on a 0.04 base, stand pole 1.78; chart 1.4 x 0.75 with its foot at 1.25; flask r 0.075.
// Clip: bubble (1 s loop, build() returns clips { bubble: 1 }; pose("bubble@0.3")). Two meshes are rewritten per frame,
//   nothing else moves: the flame (one lathe, scaled and leaned about its root by a sum of whole-cycle sines) and the
//   bubbles (18 small spheres: 12 rise over the liquid surface twice a loop, 6 steam puffs rise from the neck, swell and
//   shrink to nothing once a loop). Rest is bubble@0.
// Options: build(THREE, kit, colors, { height }). height scales the whole room uniformly so the wall top is `height`
//   (default 2.8 m), as the torii's.
// Budget: 13.8k triangles, 14 meshes (glass 3.3k, white 2.1k, green 2.0k, bone 1.5k, yellow 1.2k; bubbles 0.6k).
// Ink in pixels: shell 3; furniture 2; glassware, bones and bubbles 1.5-2.
// Colours (meadow), base / shade:
//   walls                       moon #f7f3e1 / sky #d7ecef, threshold 0.35 (the -X wall lit, the -Z wall in shade)
//   floor                       line #a9d16e flat (green lino), tile grid sky #d7ecef
//   dark (bench tops, board, plinths, caps, lids)   hair #2c5131 flat; dark decals (basins, sockets, throat) hair, no ink
//   white (carcasses, hood, chart sheet, rack, gauze, cells)       sclera #f6f3ee / sky #d7ecef, threshold 0.3
//   green (stools, cabinet, liquid, burner base, cells)            iris #3f8a47 / hair #2c5131, threshold 0.3
//   glass and steel (glassware, taps, frame, sash, cells)          sky #d7ecef flat
//   red (gas handles, hose, liquid, cells)  accent #d9483b flat;  yellow (liquid, jars, cells) practical #f2c94c flat
//   bone                        moon #f7f3e1 / skin #f0c2ae, threshold 0.3
//   flame                       practical #f2c94c / accent #d9483b, threshold 0.1 (a yellow lit side, a red core side)
//   bubbles and steam           sclera #f6f3ee flat;  chalk marks and cabinet glints sclera, no ink

export const meta = {
  name: "science-lab",
  height: 2.8,
  script: "meadow",
  colors: {
    wall: "#f7f3e1", wallShade: "#d7ecef",
    floor: "#a9d16e", seam: "#d7ecef",
    dark: "#2c5131",
    white: "#f6f3ee", whiteShade: "#d7ecef",
    green: "#3f8a47", greenShade: "#2c5131",
    glass: "#d7ecef",
    red: "#d9483b", yellow: "#f2c94c",
    bone: "#f7f3e1", boneShade: "#f0c2ae",
    flame: "#f2c94c", flameShade: "#d9483b",
    bubble: "#f6f3ee", chalk: "#f6f3ee",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const NATURAL = 2.8;
  const { height = NATURAL } = opts;
  const root = new THREE.Group();
  root.name = "science-lab";
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
  function hexa(key, p) {
    const ref = mul(p.reduce((s, q) => add(s, q), [0, 0, 0]), 1 / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  const box = (key, x0, x1, y0, y1, z0, z1) =>
    hexa(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  const cbox = (key, x, y, z, w, h, d) => box(key, x - w / 2, x + w / 2, y - h / 2, y + h / 2, z - d / 2, z + d / 2);
  // flat quad facing unit axis n, centred on ctr
  function plate(key, ctr, n, w, h) {
    const up = Math.abs(n[1]) > 0.5 ? [0, 0, 1] : [0, 1, 0];
    const r = nrm(cross(up, n)), u = cross(n, r);
    const P = (a, b) => add(ctr, add(mul(r, a * w / 2), mul(u, b * h / 2)));
    quad(key, P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), sub(ctr, n));
  }
  // a flat strip from a to b (both on a plane facing n), width w
  function strip(key, a, b, n, w) {
    const t = nrm(sub(b, a)), q = mul(nrm(cross(n, t)), w / 2);
    quad(key, add(a, q), sub(a, q), sub(b, q), add(b, q), sub(a, n));
  }
  function disc(key, ctr, n, rx, ry = rx, sides = 10) {
    const up = Math.abs(n[1]) > 0.5 ? [0, 0, 1] : [0, 1, 0];
    const r = nrm(cross(up, n)), u = cross(n, r);
    const P = (t) => add(ctr, add(mul(r, Math.cos(t) * rx), mul(u, Math.sin(t) * ry)));
    for (let j = 0; j < sides; j++) tri(key, ctr, P((j / sides) * Math.PI * 2), P(((j + 1) / sides) * Math.PI * 2), sub(ctr, n));
  }
  // a capped prism from a to b, radius r; ends pushed out by ext * r so joints overlap
  function rod(key, a, b, r, sides = 4, ext = 0.6) {
    const T = nrm(sub(b, a));
    a = sub(a, mul(T, r * ext)), b = add(b, mul(T, r * ext));
    const up = Math.abs(T[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = nrm(cross(up, T)), w = cross(T, u);
    const ring = (P) => Array.from({ length: sides }, (_, j) => {
      const t = (j / sides) * Math.PI * 2 + Math.PI / sides, d = add(mul(u, Math.cos(t)), mul(w, Math.sin(t)));
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
  const cyl = (key, x, y0, y1, z, r, sides = 8) => rod(key, [x, y0, z], [x, y1, z], r, sides, 0);
  // a tube of radius r along a polyline with rounded corners; the points lie in a plane with normal pn (fixes the ring
  // basis, so closed loops have no twist seam). closed: a loop; else both ends get flat caps.
  function tube(key, pts, r, pn, { closed = false, bend = 0.03, sides = 4 } = {}) {
    const path = [], n = pts.length;
    for (let i = 0; i < n; i++) {
      const P = pts[i];
      if (!(closed || (i > 0 && i < n - 1))) { path.push(P); continue; }
      const A = pts[(i - 1 + n) % n], C = pts[(i + 1) % n];
      const da = nrm(sub(A, P)), dc = nrm(sub(C, P));
      const t = Math.min(bend, Math.hypot(...sub(A, P)) / 2.2, Math.hypot(...sub(C, P)) / 2.2);
      const p0 = add(P, mul(da, t)), p2 = add(P, mul(dc, t));
      for (const u of [0, 0.5, 1]) path.push([0, 1, 2].map((k) => (1 - u) * (1 - u) * p0[k] + 2 * u * (1 - u) * P[k] + u * u * p2[k]));
    }
    const L = path.length;
    const rings = path.map((P, i) => {
      const prev = path[closed ? (i - 1 + L) % L : Math.max(0, i - 1)], next = path[closed ? (i + 1) % L : Math.min(L - 1, i + 1)];
      const T = nrm(sub(next, prev)), u = nrm(sub(pn, mul(T, dot(pn, T)))), w = cross(T, u);
      const ring = [];
      for (let j = 0; j < sides; j++) {
        const a = (j / sides + 0.5 / sides) * Math.PI * 2, d = add(mul(u, Math.cos(a)), mul(w, Math.sin(a)));
        ring.push({ q: add(P, mul(d, r)), n: d });
      }
      return { P, T, ring };
    });
    for (let i = 0; i < (closed ? L : L - 1); i++) {
      const R0 = rings[i], R1 = rings[(i + 1) % L], ref = mul(add(R0.P, R1.P), 0.5);
      for (let j = 0; j < sides; j++) {
        const k = (j + 1) % sides, [a, b, e, d] = [R0.ring[j], R0.ring[k], R1.ring[k], R1.ring[j]];
        tri(key, a.q, b.q, e.q, ref, a.n, b.n, e.n);
        tri(key, a.q, e.q, d.q, ref, a.n, e.n, d.n);
      }
    }
    if (!closed)
      for (const [R, s] of [[rings[0], -1], [rings[L - 1], 1]]) {
        const ref = sub(R.P, mul(R.T, s * r)), cn = mul(R.T, s);
        for (let j = 1; j < sides - 1; j++) tri(key, R.ring[0].q, R.ring[j].q, R.ring[j + 1].q, ref, cn, cn, cn);
      }
  }
  // a closed lathe about the vertical axis at (x, z): profile [[r, y], ...] bottom to top, flat caps (r > 0 at both ends)
  function lathe(key, x, z, prof, sides = 10) {
    const P = (i, j) => { const t = (j / sides) * Math.PI * 2; return [x + Math.cos(t) * prof[i][0], prof[i][1], z + Math.sin(t) * prof[i][0]]; };
    const N = (i, j) => { // smooth radial normal tilted by the profile slope
      const t = (j / sides) * Math.PI * 2, a = prof[Math.max(0, i - 1)], b = prof[Math.min(prof.length - 1, i + 1)];
      const dr = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dr, dy) || 1;
      return [Math.cos(t) * dy / l, -dr / l, Math.sin(t) * dy / l];
    };
    for (let i = 0; i < prof.length - 1; i++) {
      const ref = [x, (prof[i][1] + prof[i + 1][1]) / 2, z];
      for (let j = 0; j < sides; j++) {
        tri(key, P(i, j), P(i, j + 1), P(i + 1, j + 1), ref, N(i, j), N(i, j + 1), N(i + 1, j + 1));
        tri(key, P(i, j), P(i + 1, j + 1), P(i + 1, j), ref, N(i, j), N(i + 1, j + 1), N(i + 1, j));
      }
    }
    for (const i of [0, prof.length - 1]) {
      const cy = prof[i][1], ref = [x, cy + (i ? -1 : 1), z];
      if (prof[i][0] > 1e-5) for (let j = 0; j < sides; j++) tri(key, [x, cy, z], P(i, j), P(i, j + 1), ref);
    }
  }
  function ellipsoid(key, ctr, rx, ry, rz, us = 10, vs = 7) {
    const P = (i, j) => {
      const ph = (i / vs) * Math.PI, th = (j / us) * Math.PI * 2;
      const d = [Math.sin(ph) * Math.cos(th), -Math.cos(ph), Math.sin(ph) * Math.sin(th)];
      return { q: add(ctr, [d[0] * rx, d[1] * ry, d[2] * rz]), n: nrm([d[0] / rx, d[1] / ry, d[2] / rz]) };
    };
    for (let i = 0; i < vs; i++)
      for (let j = 0; j < us; j++) {
        const a = P(i, j), b = P(i, j + 1), e = P(i + 1, j + 1), d = P(i + 1, j);
        if (i > 0) tri(key, a.q, b.q, e.q, ctr, a.n, b.n, e.n);
        if (i < vs - 1) tri(key, a.q, e.q, d.q, ctr, a.n, e.n, d.n);
      }
  }
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const place = (x, y, z, yaw, fn) => {
    const saved = M;
    M = saved.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z)).multiply(new THREE.Matrix4().makeRotationY(yaw));
    fn();
    M = saved;
  };
  const LIQ = ["green", "red", "yellow"];

  // ---------- the shell ----------
  const W = 3.2, L = 2.8, H = 2.8, T = 0.12, CAP = 0.02;
  quad("floor", [-W, 0, -L], [W, 0, -L], [W, 0, L], [-W, 0, L], [0, -1, 0]);
  for (let x = -W + 0.4; x < W - 0.01; x += 0.4) quad("seam", [x - 0.006, 0.0015, -L], [x + 0.006, 0.0015, -L], [x + 0.006, 0.0015, L], [x - 0.006, 0.0015, L], [x, -1, 0]);
  for (let z = -L + 0.4; z < L - 0.01; z += 0.4) quad("seam", [-W, 0.0016, z - 0.006], [W, 0.0016, z - 0.006], [W, 0.0016, z + 0.006], [-W, 0.0016, z + 0.006], [0, -1, z]);
  const wall = (x0, x1, z0, z1) => { box("wall", x0, x1, 0, H - CAP, z0, z1); box("dark", x0, x1, H - CAP, H, z0, z1); };
  wall(-W - T, W, -L - T, -L); // front wall (-Z)
  wall(-W - T, -W, -L, L); // display wall (-X)
  box("ddark", -W, W, 0, 0.08, -L, -L + 0.006);
  box("ddark", -W, -W + 0.006, 0, 0.08, -L, L);

  // ---------- front wall: blackboard ----------
  const FZ = -L;
  {
    const x0 = -2.0, x1 = 1.0, y0 = 0.9, y1 = 2.1, F = 0.035;
    box("dark", x0, x1, y0, y1, FZ, FZ + 0.02);
    box("glass", x0 - F, x1 + F, y0 - F, y0, FZ, FZ + 0.03);
    box("glass", x0 - F, x1 + F, y1, y1 + F, FZ, FZ + 0.03);
    box("glass", x0 - F, x0, y0, y1, FZ, FZ + 0.03);
    box("glass", x1, x1 + F, y0, y1, FZ, FZ + 0.03);
    box("glass", x0, x1, y0 - F - 0.015, y0 - F, FZ, FZ + 0.09); // chalk tray
    for (let i = 0; i < 4; i++) cbox(["white", "red", "yellow", "white"][i], -0.4 + i * 0.09, y0 - F + 0.006, FZ + 0.06, 0.06, 0.012, 0.012);
    const zc = FZ + 0.0215, N = [0, 0, 1];
    // an atom: nucleus and three tilted orbits
    const ax = -1.3, ay = 1.55;
    disc("chalk", [ax, ay, zc], N, 0.035, 0.035, 10);
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI) / 3, ca = Math.cos(a), sa = Math.sin(a), n = 20;
      const pt = (t) => [ax + 0.3 * Math.cos(t) * ca - 0.1 * Math.sin(t) * sa, ay + 0.3 * Math.cos(t) * sa + 0.1 * Math.sin(t) * ca, zc + 0.0004 * k];
      for (let i = 0; i < n; i++) strip("chalk", pt((i / n) * Math.PI * 2), pt(((i + 1) / n) * Math.PI * 2), N, 0.012);
      disc("chalk", add(pt(k * 2.1 + 0.6), [0, 0, 0.001]), N, 0.018, 0.018, 8);
    }
    // a conical flask sketch on a burner
    const fx = -0.35, fy = 1.25, outline = [[-0.03, 0.5], [-0.03, 0.36], [-0.17, 0.08], [0.17, 0.08], [0.03, 0.36], [0.03, 0.5]];
    for (let i = 0; i < outline.length - 1; i++) strip("chalk", [fx + outline[i][0], fy + outline[i][1], zc], [fx + outline[i + 1][0], fy + outline[i + 1][1], zc], N, 0.012);
    strip("chalk", [fx - 0.12, fy + 0.18, zc], [fx + 0.12, fy + 0.18, zc], N, 0.01);
    strip("chalk", [fx, fy - 0.12, zc], [fx, fy + 0.03, zc], N, 0.02);
    for (let i = 0; i < 3; i++) disc("chalk", [fx - 0.04 + i * 0.04, fy + 0.6 + i * 0.05, zc], N, 0.02 + 0.006 * i, 0.02 + 0.006 * i, 8);
    // wave lines
    for (let r = 0; r < 3; r++) {
      const y = 1.85 - r * 0.22, n = 14;
      for (let i = 0; i < n; i++) {
        const xa = 0.15 + (i / n) * 0.7, xb = 0.15 + ((i + 1) / n) * 0.7;
        strip("chalk", [xa, y + 0.05 * Math.sin(xa * (12 + r * 5)), zc], [xb, y + 0.05 * Math.sin(xb * (12 + r * 5)), zc], N, 0.011);
      }
    }
  }

  // ---------- front wall: fume hood ----------
  {
    const x0 = 1.75, x1 = 3.05, z0 = FZ, z1 = FZ + 0.75, xm = (x0 + x1) / 2;
    box("ddark", x0 + 0.03, x1 - 0.03, 0, 0.08, z0, z1 - 0.04); // plinth
    box("white", x0, x1, 0.08, 0.84, z0, z1);
    box("ddark", xm - 0.003, xm + 0.003, 0.12, 0.8, z1, z1 + 0.003); // door split
    box("dark", x0 - 0.02, x1 + 0.02, 0.84, 0.88, z0, z1 + 0.02); // worktop
    box("white", x0, x0 + 0.06, 0.88, 2.2, z0, z1); // side panels
    box("white", x1 - 0.06, x1, 0.88, 2.2, z0, z1);
    box("white", x0, x1, 2.2, 2.45, z0, z1); // top box
    box("ddark", x0 + 0.06, x1 - 0.06, 0.88, 2.2, z0, z0 + 0.03); // the dark throat: back of the hood
    box("dark", x0 + 0.06, x1 - 0.06, 0.88, 0.95, z0 + 0.03, z0 + 0.2); // baffle slot at the back
    // half-raised sash: green frame round a glass pane, riding in the side panels
    const sy0 = 1.45, sy1 = 2.25, sz = z1 - 0.06;
    box("green", x0 + 0.06, x1 - 0.06, sy0, sy0 + 0.05, sz - 0.02, sz + 0.02);
    box("green", x0 + 0.06, x0 + 0.1, sy0, sy1 - 0.05, sz - 0.02, sz + 0.02);
    box("green", x1 - 0.1, x1 - 0.06, sy0, sy1 - 0.05, sz - 0.02, sz + 0.02);
    box("glass", x0 + 0.1, x1 - 0.1, sy0 + 0.05, sy1 - 0.05, sz - 0.006, sz + 0.006);
    box("dark", x0 + 0.35, x1 - 0.35, sy0 - 0.03, sy0, sz - 0.01, sz + 0.03); // handle
    for (const [xa, xb, ya, yb, w] of [[x0 + 0.1, x0 + 0.42, 1.95, sy1 - 0.05, 0.05], [x0 + 0.1, x0 + 0.62, 1.62, sy1 - 0.05, 0.025], [x1 - 0.4, x1 - 0.1, sy0 + 0.05, 1.75, 0.04]])
      strip("chalk", [xa, ya, sz + 0.0065], [xb, yb, sz + 0.0065], [0, 0, 1], w); // glints on the sash glass
    // a ring stand inside
    box("white", 2.05, 2.25, 0.88, 0.9, z0 + 0.25, z0 + 0.4);
    cyl("glass", 2.1, 0.9, 1.35, z0 + 0.32, 0.008, 4);
    tube("glass", [[2.1, 1.15, z0 + 0.32], [2.25, 1.15, z0 + 0.32], [2.25, 1.15, z0 + 0.45], [2.1, 1.15, z0 + 0.45]], 0.006, [0, 1, 0], { closed: true, bend: 0.05 });
    // duct up from the top box, bending into the wall
    box("white", xm - 0.14, xm + 0.14, 2.45, 2.72, z0, z0 + 0.3);
    box("ddark", xm - 0.14, xm + 0.14, 2.55, 2.557, z0 + 0.3, z0 + 0.303); // a seam band round the duct
    box("ddark", xm + 0.14, xm + 0.143, 2.55, 2.557, z0, z0 + 0.3);
  }

  // ---------- benches ----------
  const TOP = 0.78;
  function gasTap(x, z, s) {
    cyl("glass", x, TOP, TOP + 0.05, z, 0.016, 6);
    box("red", x - 0.008, x + 0.008, TOP + 0.045, TOP + 0.06, z - 0.035 * s, z + 0.005 * s);
  }
  // bench centred at the origin, w along x, d along z; carcass, top, sink in the middle, gooseneck tap, gas taps
  function bench(w, d, sinkAt = 0) {
    box("ddark", -w / 2 + 0.06, w / 2 - 0.06, 0, 0.08, -d / 2 + 0.08, d / 2 - 0.08);
    box("white", -w / 2 + 0.03, w / 2 - 0.03, 0.08, TOP - 0.04, -d / 2 + 0.05, d / 2 - 0.05);
    for (const s of [-1, 1]) for (const k of [-1, 0, 1]) // door splits on both long faces
      box("ddark", k * w * 0.25 - 0.003, k * w * 0.25 + 0.003, 0.12, TOP - 0.08, s * (d / 2 - 0.05) - 0.002, s * (d / 2 - 0.05) + 0.002);
    box("dark", -w / 2, w / 2, TOP - 0.04, TOP, -d / 2, d / 2);
    const sw = 0.42, sd = 0.3;
    box("glass", sinkAt - sw / 2, sinkAt + sw / 2, TOP, TOP + 0.006, -sd / 2, sd / 2);
    box("ddark", sinkAt - sw / 2 + 0.03, sinkAt + sw / 2 - 0.03, TOP + 0.006, TOP + 0.008, -sd / 2 + 0.03, sd / 2 - 0.03);
    tube("glass", [[sinkAt, TOP, -sd / 2 - 0.05], [sinkAt, TOP + 0.32, -sd / 2 - 0.05], [sinkAt, TOP + 0.32, -0.02], [sinkAt, TOP + 0.24, -0.02]], 0.012, [1, 0, 0], { bend: 0.06, sides: 6 });
    cyl("glass", sinkAt, TOP, TOP + 0.02, -sd / 2 - 0.05, 0.025, 6);
    for (const s of [-1, 1]) for (const x of [-w * 0.3, w * 0.3]) gasTap(x, s * (d / 2 - 0.08), s);
  }
  function stool(x, z) {
    place(x, 0, z, 0, () => {
      cyl("green", 0, 0.44, 0.48, 0, 0.16, 10);
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) rod("white", [sx * 0.15, 0.01, sz * 0.15], [sx * 0.1, 0.44, sz * 0.1], 0.012, 4, 0);
      const q = [[0.136, 0.136], [0.136, -0.136], [-0.136, -0.136], [-0.136, 0.136]]; // foot ring on the legs' axes at y 0.16
      for (let k = 0; k < 4; k++) rod("white", [q[k][0], 0.16, q[k][1]], [q[(k + 1) % 4][0], 0.16, q[(k + 1) % 4][1]], 0.009, 4, 0.8);
    });
  }
  // glassware, standing on y = y
  function beaker(x, z, y, r, h, liq) {
    lathe(liq, x, z, [[r * 0.95, y], [r, y + 0.006], [r, y + h * 0.45]], 8);
    lathe("glass", x, z, [[r, y + h * 0.45], [r, y + h], [r * 1.08, y + h + 0.004]], 8);
  }
  function conical(x, z, y, r, liq) {
    lathe(liq, x, z, [[r * 0.95, y], [r, y + 0.008], [r * 0.62, y + r * 0.8]], 8);
    lathe("glass", x, z, [[r * 0.62, y + r * 0.8], [r * 0.26, y + r * 1.55], [r * 0.24, y + r * 2.1], [r * 0.3, y + r * 2.15]], 8);
  }
  function rack(x, z, y, yaw, seed) {
    place(x, y, z, yaw, () => {
      box("white", -0.13, 0.13, 0, 0.012, -0.045, 0.045);
      box("white", -0.13, 0.13, 0.08, 0.092, -0.045, 0.045);
      for (const s of [-1, 1]) box("white", s * 0.13 - 0.008, s * 0.13 + 0.008, 0, 0.092, -0.045, 0.045);
      for (let i = 0; i < 5; i++) {
        const tx = -0.1 + i * 0.05, top = 0.15 + 0.01 * (i % 2);
        lathe(LIQ[(seed + i) % 3], tx, 0, [[0.006, 0.012], [0.011, 0.02], [0.011, 0.06 + 0.03 * hash(seed + i)]], 5);
        lathe("glass", tx, 0, [[0.011, 0.06 + 0.03 * hash(seed + i)], [0.011, top]], 5);
      }
    });
  }
  // the teacher's bench at the front, the pupils' benches in a 2 x 2 grid
  place(-0.5, 0, -1.75, 0, () => {
    bench(2.4, 0.75, 0.6);
    conical(-0.85, 0.1, TOP, 0.07, "red");
    beaker(-0.65, -0.12, TOP, 0.05, 0.12, "yellow");
    beaker(-0.5, 0.12, TOP, 0.04, 0.09, "green");
    rack(1.0, 0.15, TOP, 0, 7);
    // microscope: foot, pillar, arm, tube, stage
    place(-0.2, TOP, -0.05, 0.6, () => {
      box("green", -0.06, 0.06, 0, 0.025, -0.08, 0.06);
      box("green", -0.02, 0.02, 0.025, 0.2, -0.07, -0.035);
      box("dark", -0.05, 0.05, 0.1, 0.11, -0.04, 0.06); // stage
      rod("green", [0, 0.19, -0.05], [0, 0.26, 0.02], 0.016, 6, 0.5); // arm
      rod("white", [0, 0.13, 0.02], [0, 0.32, 0.02], 0.016, 8, 0); // body tube
      rod("dark", [0, 0.32, 0.02], [0, 0.35, 0.025], 0.012, 8, 0); // eyepiece
      rod("dark", [0, 0.115, 0.02], [0, 0.14, 0.02], 0.01, 6, 0); // objective
    });
  });
  const BENCHES = [[-1.3, -0.3], [1.3, -0.3], [-1.3, 1.5], [1.3, 1.5]];
  BENCHES.forEach(([bx, bz], i) => {
    place(bx, 0, bz, 0, () => {
      bench(1.8, 1.0);
      if (i !== 3) {
        conical(-0.55, -0.22 + 0.05 * i, TOP, 0.055, LIQ[i % 3]);
        beaker(0.45, 0.25, TOP, 0.045, 0.1, LIQ[(i + 1) % 3]);
        beaker(0.58, 0.2, TOP, 0.035, 0.08, LIQ[(i + 2) % 3]);
        rack(-0.5, 0.25, TOP, 0.1 * i, i * 3);
      } else {
        rack(-0.55, -0.25, TOP, -0.15, 11);
        beaker(-0.3, -0.25, TOP, 0.04, 0.1, "yellow");
      }
    });
    for (const sx of [-0.45, 0.45]) for (const sz of [-0.72, 0.72]) stool(bx + sx, bz + sz);
  });

  // ---------- the bubbling flask (pupil bench nearest the camera) ----------
  const BX = 1.3 + 0.45, BZ = 1.5 + 0.12; // burner axis, world
  const BT = TOP + 0.1, RY = TOP + 0.235, FR = 0.075, FY = RY + 0.01 + FR * 0.97, NECK = FY + FR + 0.115; // burner top, ring, flask
  {
    // hose from the near +X gas tap (bench x 0.54, z 0.42) to the burner foot
    const tx = 1.3 + 0.54, tz = 1.5 + 0.42;
    tube("red", [[tx, TOP + 0.04, tz - 0.03], [tx, TOP + 0.012, tz - 0.12], [BX + 0.06, TOP + 0.012, BZ + 0.1], [BX + 0.03, TOP + 0.012, BZ + 0.02]], 0.008, [0, 1, 0], { bend: 0.04 });
    lathe("green", BX, BZ, [[0.05, TOP], [0.05, TOP + 0.012], [0.03, TOP + 0.02]], 10); // foot
    cyl("glass", BX, TOP + 0.02, BT, BZ, 0.013, 8); // barrel
    cyl("glass", BX, TOP + 0.04, TOP + 0.055, BZ, 0.017, 8); // air collar
    // tripod: three splayed legs to a ring, a gauze square on it
    const RR = 0.075;
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.4;
      rod("dark", [BX + Math.cos(a) * 0.11, TOP + 0.004, BZ + Math.sin(a) * 0.11], [BX + Math.cos(a) * RR, RY, BZ + Math.sin(a) * RR], 0.006, 4, 0);
    }
    tube("dark", Array.from({ length: 8 }, (_, k) => { const a = (k / 8) * Math.PI * 2; return [BX + Math.cos(a) * RR, RY, BZ + Math.sin(a) * RR]; }), 0.006, [0, 1, 0], { closed: true, bend: 0.02 });
    box("white", BX - 0.09, BX + 0.09, RY + 0.006, RY + 0.01, BZ - 0.09, BZ + 0.09);
    // round-bottom flask: liquid below, glass above, a neck
    const ring = (u) => [FR * Math.sin(u), FY - FR * Math.cos(u)];
    const low = [], high = [];
    for (let i = 1; i <= 6; i++) low.push(ring((i / 6) * 1.9));
    for (let i = 0; i <= 5; i++) high.push(ring(1.9 + (i / 5) * (2.9 - 1.9)));
    lathe("green", BX, BZ, [[0.012, FY - FR * 0.97], ...low], 12);
    lathe("glass", BX, BZ, [...high, [0.02, FY + FR * 1.02], [0.019, NECK - 0.005], [0.024, NECK]], 12);
    const flask = new THREE.Group();
    flask.name = "flask";
    flask.position.set(BX, FY, BZ);
    body.add(flask);
    joints.flask = flask;
  }

  // ---------- display wall (-X): specimen cabinet ----------
  const DX = -W;
  {
    const z0 = -2.6, z1 = -1.35, d = 0.45, x1 = DX + d, h = 1.9, F = 0.04;
    box("green", DX, x1, 0, 0.1, z0, z1); // plinth
    box("green", DX, x1, h - 0.06, h, z0, z1); // top
    box("green", DX, x1, 0.1, h - 0.06, z0, z0 + F); // ends
    box("green", DX, x1, 0.1, h - 0.06, z1 - F, z1);
    box("white", DX, DX + 0.02, 0.1, h - 0.06, z0 + F, z1 - F); // back
    const LEVELS = [0.1, 0.62, 1.12, 1.52];
    LEVELS.slice(1).forEach((y) => box("white", DX + 0.02, x1 - 0.03, y - 0.02, y, z0 + F, z1 - F));
    // glazing: two doors, frames and a mid rail, no panes
    const gx = x1 - 0.015, zm = (z0 + z1) / 2;
    box("green", gx - 0.015, gx + 0.015, 0.1, 0.16, z0 + F, z1 - F);
    box("green", gx - 0.015, gx + 0.015, h - 0.12, h - 0.06, z0 + F, z1 - F);
    box("green", gx - 0.015, gx + 0.015, 0.16, h - 0.12, zm - 0.02, zm + 0.02);
    box("green", gx - 0.015, gx + 0.015, 0.95, 0.99, z0 + F, z1 - F);
    box("dark", gx + 0.012, gx + 0.03, 0.9, 1.04, zm + 0.03, zm + 0.05); // knobs
    box("dark", gx + 0.012, gx + 0.03, 0.9, 1.04, zm - 0.05, zm - 0.03);
    // glints: diagonal strips from frame to frame on the door planes
    for (const [za, zb, ya, yb] of [[z0 + F, zm - 0.15, 1.3, 1.78], [z0 + F + 0.2, zm - 0.02, 1.45, 1.78], [zm + 0.02, z1 - F - 0.25, 0.5, 0.94]])
      strip("chalk", [gx + 0.016, ya, za], [gx + 0.016, yb, zb], [1, 0, 0], 0.03);
    // specimen jars on the shelves
    for (let s = 0; s < 3; s++)
      for (let j = 0; j < 4; j++) {
        const y = LEVELS[s], jz = z0 + 0.15 + j * 0.27 + 0.03 * hash(s * 5 + j), jx = DX + 0.2, jr = 0.05 + 0.02 * hash(s * 7 + j), jh = 0.16 + 0.12 * hash(s * 3 + j + 1);
        if (s === 2 && j === 1) { // a mineral lump and a small globe of a cell model
          hexa("green", [[jx - 0.06, y, jz - 0.07], [jx + 0.07, y, jz - 0.05], [jx + 0.06, y, jz + 0.07], [jx - 0.05, y, jz + 0.06],
            [jx - 0.03, y + 0.09, jz - 0.04], [jx + 0.04, y + 0.11, jz - 0.02], [jx + 0.03, y + 0.07, jz + 0.04], [jx - 0.03, y + 0.08, jz + 0.03]]);
          continue;
        }
        lathe((s + j) % 3 ? "yellow" : "green", jx, jz, [[jr, y], [jr, y + jh * 0.8]], 8);
        lathe("glass", jx, jz, [[jr, y + jh * 0.8], [jr, y + jh], [jr * 0.75, y + jh + 0.01]], 8);
        cyl("dark", jx, y + jh + 0.01, y + jh + 0.035, jz, jr * 0.8, 8);
      }
  }

  // ---------- display wall: skeleton on a stand ----------
  {
    const SX = -2.78, SZ = 1.95, B = 0.04;
    place(SX, 0, SZ, 1.05, () => { // faces +Z locally, turned toward the room
      // stand: five-spoke foot, base plate, pole behind the spine, hook over the skull
      lathe("green", 0, -0.08, [[0.2, 0], [0.2, B * 0.6], [0.16, B]], 10);
      cyl("white", 0, B, 1.78, -0.12, 0.014, 6);
      tube("white", [[0, 1.76, -0.12], [0, 1.76, -0.04], [0, 1.71, -0.03]], 0.008, [1, 0, 0], { bend: 0.03 });
      rod("white", [0, 1.3, -0.12], [0, 1.3, -0.045], 0.01, 4, 0); // bracket to the spine
      const R = (a, b, r = 0.016) => rod("bone", a, b, r, 6, 0.4);
      // legs and feet (feet on the base plate)
      for (const s of [-1, 1]) {
        const hip = [s * 0.09, 0.88, 0], knee = [s * 0.1, 0.48, 0.01], ank = [s * 0.1, B + 0.07, -0.01];
        R(hip, knee, 0.02), R(knee, ank, 0.016);
        ellipsoid("bone", add(knee, [0, 0, 0.015]), 0.028, 0.03, 0.025, 6, 4); // kneecap
        hexa("bone", [[s * 0.07, B, -0.04], [s * 0.13, B, -0.04], [s * 0.14, B, 0.12], [s * 0.065, B, 0.12],
          [s * 0.08, B + 0.06, -0.03], [s * 0.12, B + 0.06, -0.03], [s * 0.12, B + 0.02, 0.1], [s * 0.08, B + 0.02, 0.1]]);
      }
      // pelvis: a wide bowl block
      hexa("bone", [[-0.1, 0.84, -0.05], [0.1, 0.84, -0.05], [0.1, 0.84, 0.04], [-0.1, 0.84, 0.04],
        [-0.16, 1.0, -0.06], [0.16, 1.0, -0.06], [0.15, 1.0, 0.05], [-0.15, 1.0, 0.05]]);
      // spine and ribs
      R([0, 0.95, -0.04], [0, 1.47, -0.03], 0.018);
      for (let k = 0; k < 5; k++) {
        const y = 1.15 + k * 0.065, rx = 0.13 - 0.012 * (4 - k) * (k < 2 ? 1 : 0.6) - (k === 4 ? 0.03 : 0), rz = 0.09 - 0.004 * Math.abs(k - 2);
        tube("bone", Array.from({ length: 8 }, (_, j) => { const a = (j / 8) * Math.PI * 2; return [Math.sin(a) * rx, y - 0.02 * Math.cos(a) - 0.02, -0.03 + rz * Math.cos(a)]; }), 0.009, [0, 1, 0], { closed: true, bend: 0.03 });
      }
      R([0, 1.14, 0.065], [0, 1.4, 0.055], 0.014); // sternum
      // shoulders, arms, hands
      R([-0.17, 1.44, 0.0], [0.17, 1.44, 0.0], 0.012); // clavicles
      for (const s of [-1, 1]) {
        const sh = [s * 0.18, 1.43, -0.01], el = [s * 0.21, 1.13, 0.0], wr = [s * 0.2, 0.86, 0.04];
        R(sh, el, 0.017), R(el, wr, 0.014);
        ellipsoid("bone", sh, 0.03, 0.03, 0.03, 6, 4);
        hexa("bone", [[s * 0.18, 0.86, 0.02], [s * 0.22, 0.86, 0.02], [s * 0.22, 0.86, 0.07], [s * 0.18, 0.86, 0.07],
          [s * 0.185, 0.74, 0.03], [s * 0.215, 0.74, 0.03], [s * 0.215, 0.74, 0.06], [s * 0.185, 0.74, 0.06]]);
      }
      // neck and skull: an egg cranium, a jaw block, dark sockets and nose hole
      R([0, 1.47, -0.03], [0, 1.53, -0.02], 0.022);
      ellipsoid("bone", [0, 1.615, 0.0], 0.082, 0.1, 0.098, 10, 7);
      hexa("bone", [[-0.05, 1.5, 0.02], [0.05, 1.5, 0.02], [0.045, 1.5, 0.09], [-0.045, 1.5, 0.09],
        [-0.065, 1.57, -0.0], [0.065, 1.57, -0.0], [0.06, 1.57, 0.085], [-0.06, 1.57, 0.085]]);
      for (const s of [-1, 1]) {
        place(s * 0.032, 1.625, 0.088, s * 0.3, () => disc("ddark", [0, 0, 0], [0, 0, 1], 0.024, 0.02, 8));
      }
      place(0, 1.585, 0.096, 0, () => disc("ddark", [0, 0, 0], [0, 0, 1], 0.009, 0.014, 6));
      place(0, 1.55, 0.089, 0, () => { for (let k = -2; k <= 2; k++) plate("ddark", [k * 0.013, 0, 0], [0, 0, 1], 0.004, 0.022); });
    });
  }

  // ---------- display wall: element chart (blank cells) ----------
  {
    const z0 = -1.05, cw = 0.075, gap = 0.008, y0 = 1.25, x = DX + 0.006;
    // column 1 at +Z, so the chart reads left to right as the room is seen from the pupils' side
    const rows = 7, cz = (col) => z0 + 0.06 + (17 - col) * cw, cy = (row) => y0 + 0.08 + (8.5 - row) * cw;
    box("white", DX, x, y0, y0 + 0.86, z0, z0 + 18 * cw + 0.12); // the sheet
    const has = (r, col) => r === 0 ? col === 0 || col === 17 : r < 3 ? col < 2 || col > 11 : true;
    const blockKey = (r, col) => (col < 2 ? "red" : col === 17 ? "glass" : col > 11 ? "floor" : "yellow");
    for (let r = 0; r < rows; r++)
      for (let col = 0; col < 18; col++)
        if (has(r, col)) box(r === 0 && col === 0 ? "white" : blockKey(r, col), x, x + 0.006, cy(r) - (cw - gap) / 2, cy(r) + (cw - gap) / 2, cz(col) - (cw - gap) / 2, cz(col) + (cw - gap) / 2);
    for (let r = 0; r < 2; r++)
      for (let col = 2; col < 17; col++)
        box("green", x, x + 0.006, cy(7.5 + r) - (cw - gap) / 2, cy(7.5 + r) + (cw - gap) / 2, cz(col) - 0.03 - (cw - gap) / 2, cz(col) - 0.03 + (cw - gap) / 2);
  }

  // ---------- meshes: one per material signature; the flame and the bubbles are rewritten per frame ----------
  // the flame: a teardrop lathe on the barrel top, its root on the barrel top
  const F0 = [BX, BT, BZ];
  lathe("flame", BX, BZ, [[0.012, F0[1]], [0.02, F0[1] + 0.022], [0.018, F0[1] + 0.05], [0.009, F0[1] + 0.075], [0.0015, F0[1] + 0.09]], 8);
  // the bubbles: 18 unit spheres, rewritten by bubble(t)
  const NB = 18, NS = 12, unit = { p: [], n: [] };
  {
    const saved = soups.unit;
    ellipsoid("unit", [0, 0, 0], 1, 1, 1, 6, 4);
    Object.assign(unit, soups.unit);
    delete soups.unit;
    if (saved) soups.unit = saved;
  }
  const UV = unit.p.length / 3;
  soups.bubble = { p: new Array(NB * UV * 3).fill(0), n: new Array(NB * UV * 3).fill(0) };
  for (let k = 0; k < NB; k++) for (let i = 0; i < UV * 3; i++) soups.bubble.n[k * UV * 3 + i] = unit.n[i];

  const MAT = {
    wall: [c.wall, c.wallShade, 0.35, 3],
    floor: [c.floor, c.floor, 0.1, 3],
    seam: [c.seam, c.seam, 0.1, 0],
    dark: [c.dark, c.dark, 0.1, 2],
    ddark: [c.dark, c.dark, 0.1, 0],
    white: [c.white, c.whiteShade, 0.3, 2],
    green: [c.green, c.greenShade, 0.3, 2],
    glass: [c.glass, c.glass, 0.1, 1.5],
    red: [c.red, c.red, 0.1, 1.5],
    yellow: [c.yellow, c.yellow, 0.1, 1.5],
    bone: [c.bone, c.boneShade, 0.3, 1.5],
    flame: [c.flame, c.flameShade, 0.1, 1.5, "flame"],
    bubble: [c.bubble, c.bubble, 0.1, 1.5, "bubble"],
    chalk: [c.chalk, c.chalk, 0.1, 0],
  };
  const groups = new Map();
  for (const [key, soup] of Object.entries(soups)) {
    const sig = MAT[key].join("|");
    if (!groups.has(sig)) groups.set(sig, { key, m: MAT[key], p: [], n: [] });
    const g = groups.get(sig);
    for (let i = 0; i < soup.p.length; i++) g.p.push(soup.p[i]), g.n.push(soup.n[i]);
  }
  const live = {};
  for (const { key, m, p, n } of groups.values()) {
    const [base, shade, threshold, px] = m;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    if (key === "bubble") g.setAttribute("hullNormal", new THREE.Float32BufferAttribute(n, 3)); // spheres: smooth already
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    body.add(mesh);
    if (key === "flame" || key === "bubble") {
      mesh.frustumCulled = false;
      for (const ch of mesh.children) ch.frustumCulled = false;
      live[key] = { g, base: Float32Array.from(p) };
    }
  }

  // ---------- the bubble clip ----------
  // one loop is 1 s; every motion is a whole number of cycles in it, so @0 and @1 are the same drawing.
  const CLIPS = { bubble: 1 };
  const TAU = Math.PI * 2;
  function frame(t) {
    const u = ((t % 1) + 1) % 1;
    // flame: height and width breathe, the tip leans; sums of whole-cycle sines
    {
      const { g, base } = live.flame, P = g.attributes.position.array;
      const sy = 1 + 0.16 * Math.sin(TAU * 3 * u) + 0.08 * Math.sin(TAU * 7 * u + 1);
      const sx = 1 - 0.08 * Math.sin(TAU * 3 * u + 0.5);
      const lean = 0.18 * Math.sin(TAU * 2 * u + 0.3), leanZ = 0.1 * Math.sin(TAU * 5 * u);
      for (let i = 0; i < P.length; i += 3) {
        const dx = base[i] - F0[0], dy = base[i + 1] - F0[1], dz = base[i + 2] - F0[2], h = dy * sy;
        P[i] = F0[0] + dx * sx + lean * h * (h / 0.09);
        P[i + 1] = F0[1] + h;
        P[i + 2] = F0[2] + dz * sx + leanZ * h * (h / 0.09);
      }
      g.attributes.position.needsUpdate = true;
    }
    // bubbles: k < NS climb the liquid surface twice a loop (mostly on the camera side); the rest are steam puffs, once a loop
    {
      const { g } = live.bubble, P = g.attributes.position.array;
      for (let k = 0; k < NB; k++) {
        let C, r;
        if (k < NS) {
          const v = (2 * u + k / NS + 0.37 * hash(k)) % 1, az = k % 3 ? Math.PI / 4 + 2.4 * (hash(k + 20) - 0.5) : TAU * hash(k + 20);
          const ang = 0.5 + v * 1.4; // polar angle from the bottom, up to the liquid line (1.9)
          const R = FR * 1.0;
          C = [BX + Math.sin(ang) * R * Math.cos(az), FY - Math.cos(ang) * R, BZ + Math.sin(ang) * R * Math.sin(az)];
          r = 0.005 + 0.009 * Math.sin(Math.PI * v);
        } else {
          const v = (u + (k - NS) / (NB - NS)) % 1, sw = 0.012 * Math.sin(TAU * (v + hash(k)));
          C = [BX + sw + 0.01 * (hash(k) - 0.5), NECK + 0.01 + v * 0.22, BZ + 0.008 * Math.cos(TAU * v + k)];
          r = 0.024 * Math.sin(Math.PI * Math.min(1, v * 1.15)) ** 0.7 + 0.0005;
        }
        for (let i = 0; i < UV; i++) {
          const o = (k * UV + i) * 3;
          P[o] = C[0] + r * unit.p[i * 3], P[o + 1] = C[1] + r * unit.p[i * 3 + 1], P[o + 2] = C[2] + r * unit.p[i * 3 + 2];
        }
      }
      g.attributes.position.needsUpdate = true;
    }
    for (const { g } of Object.values(live)) g.computeBoundingSphere(), g.computeBoundingBox();
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`science-lab: no clip "${m[1]}" (clips: bubble)`);
      return frame(+m[2]);
    }
    if (name !== "rest") throw new Error(`science-lab: unknown pose "${name}" (rest, or bubble@<seconds>)`);
    frame(0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
