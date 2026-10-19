// kokeshi.js - the lathe-turned wooden kokeshi doll, static; one doll or a family of up to five in a row.
// Contract: harness/lab/README.md. Meters, +Y up, the doll faces +Z, its left is +X, stands on y = 0, centred on
// x = 0, z = 0 (the bbox of the row).
//
// Construction (all triangle soups merged per material across every doll, so a family is still 8 meshes):
//   BODY   one closed lathe of the turned profile (flat foot cap, slight waist, rounded shoulder that runs on into the
//          head and closes inside it), 32 sides, smooth profile normals. The head is a sphere sitting on it, so the
//          shoulder shows a turned neck groove under the chin.
//   HAIR   a closed shell on the head: an outer skin at 1.035 R flaring to ~1.09 R at the lower edge of the bob, an
//          inner skin at 0.96 R inside the head, stitched along the edge. The edge is a polar angle per azimuth: a
//          straight fringe across the forehead, side locks dropping past the cheeks, the bob lowest at the back.
//   PAINT  every painted part is a thin closed slab standing proud of the wood (or of the paint under it), flat colour,
//          no ink: rings are lathe shells (each 0.6 mm proud of the paint it overlaps), motifs are 2D triangle sets projected onto
//          the body (arc length x height) or the head sphere (tangent plane) and extruded 2 mm into the surface
//          (petals 3 mm, flower hearts 3.8 mm), so layers never share a plane.
//   Every triangle is wound away from a reference point on the surface it rests on (the axis for the lathe, the head
//   centre for the sphere, the surface point under a slab's centroid), never by hand.
// Proportions (0.30 m doll; base unit the head radius R = 0.058): head diameter 2 R, centre 0.242 (top 0.30);
//   body 0.19 to the shoulder, foot radius 0.86 R, waist 0.81 R; fringe 58 deg from the crown, bob edge 110-118 deg;
//   eyes (closed arcs, 19 mm, 2.6 mm stroke) 6 deg below the head centre, mouth 21 deg below, cheeks 14 deg below.
// Options: build(THREE, kit, colors, { height, count }).
//   height  the tallest doll's top (default 0.30 m); everything scales uniformly.
//   count   1..5 dolls in a row along +X, descending (1, 0.84, 0.70, 0.58, 0.48 of height), 3 cm apart at full size;
//           each doll has its own table of kimono, bands, collar and flowers (traditional wood body for doll 2).
// Budget: ~6-7k triangles a doll (wood 1.6k, hair 1.3k, the rest paint); a family of five 31k in 8 meshes.
// Colours (festival): wood moon #ffd7a1 / skin #f0c2ae (body, head); hair #1a1020 / sky #24143a; painted flats:
//   red accent #ff4d6d (kimono, ornaments, mouth), gold practical #ffb020, plum sky #24143a, cream line #fff1ea,
//   eyes and brows hair #1a1020, cheeks skin #f0c2ae.

export const meta = {
  name: "kokeshi",
  height: 0.3,
  script: "festival",
  colors: {
    wood: "#ffd7a1", woodShade: "#f0c2ae",
    hair: "#1a1020", hairShade: "#24143a",
    line: "#1a1020", red: "#ff4d6d", gold: "#ffb020", plum: "#24143a", cream: "#fff1ea", cheek: "#f0c2ae",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = 0.3 } = opts;
  const count = Math.max(1, Math.min(5, Math.floor(opts.count ?? 1)));
  const root = new THREE.Group();
  root.name = "kokeshi";
  const joints = {};

  // ---------- triangle soups, through a placement matrix ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  let M = new THREE.Matrix4();
  const v3 = new THREE.Vector3();
  const put = (s, q, nq) => {
    v3.set(...q).applyMatrix4(M);
    s.p.push(v3.x, v3.y, v3.z);
    v3.set(...nq).transformDirection(M);
    s.n.push(v3.x, v3.y, v3.z);
  };
  // one triangle wound away from ref; per-vertex normals, or the face normal
  function tri(key, a, b, e, ref, na, nb, ne) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const m = mul(add(add(a, b), e), 1 / 3);
    const flip = dot(n, sub(m, ref)) < 0;
    n = nrm(flip ? mul(n, -1) : n);
    const s = (soups[key] ??= { p: [], n: [] });
    const [B, NB, E, NE] = flip ? [e, ne, b, nb] : [b, nb, e, ne];
    put(s, a, na ?? n), put(s, B, NB ?? n), put(s, E, NE ?? n);
  }
  const quad = (key, a, b, e, d, ref, na, nb, ne, nd) => (tri(key, a, b, e, ref, na, nb, ne), tri(key, a, e, d, ref, na, ne, nd));

  // ---------- the turned body ----------
  const SIDES = 32, R = 0.062, HY = 0.238;
  const PROF = [[0, 0.047], [0.004, 0.05], [0.012, 0.051], [0.05, 0.0475], [0.09, 0.047], [0.13, 0.048], [0.16, 0.047],
    [0.172, 0.043], [0.18, 0.036], [0.186, 0.028], [0.192, 0.02], [0.198, 0.01], [0.2, 0]]; // [y, r]
  const rb = (y) => {
    for (let i = 1; i < PROF.length; i++)
      if (y <= PROF[i][0]) { const [y0, r0] = PROF[i - 1], [y1, r1] = PROF[i]; return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0); }
    return 0;
  };
  const ang = (j) => (j / SIDES) * Math.PI * 2;
  const at = (r, y, a) => [r * Math.sin(a), y, r * Math.cos(a)];
  function body() {
    const nr = PROF.map((p, i) => { // profile normals (r, y) from the neighbours; the foot rim is a hard edge
      const A = PROF[Math.max(i - 1, i === 1 ? 1 : 0)], B = PROF[Math.min(i + 1, PROF.length - 1)];
      const dy = B[0] - A[0], dr = B[1] - A[1], l = Math.hypot(dy, dr) || 1;
      return [dy / l, -dr / l];
    });
    for (let i = 0; i < PROF.length - 1; i++)
      for (let j = 0; j < SIDES; j++) {
        const [y0, r0] = PROF[i], [y1, r1] = PROF[i + 1], a0 = ang(j), a1 = ang(j + 1);
        const N = (k, a) => [nr[k][0] * Math.sin(a), nr[k][1], nr[k][0] * Math.cos(a)];
        quad("wood", at(r0, y0, a0), at(r0, y0, a1), at(r1, y1, a1), at(r1, y1, a0), [0, (y0 + y1) / 2, 0], N(i, a0), N(i, a1), N(i + 1, a1), N(i + 1, a0));
      }
    for (let j = 0; j < SIDES; j++) tri("wood", [0, 0, 0], at(PROF[0][1], 0, ang(j)), at(PROF[0][1], 0, ang(j + 1)), [0, 1, 0]);
  }
  // a painted ring between y0 and y1 standing d proud of the wood, 3 mm deep into it
  function ring(key, y0, y1, d) {
    const ys = [y0, ...PROF.map((p) => p[0]).filter((y) => y > y0 + 0.002 && y < y1 - 0.002), y1]; // the profile's own rows
    const out = (y, a) => at(rb(y) + d, y, a), inn = (y, a) => at(rb(y) - 0.003, y, a), mid = (y, a) => at(rb(y), y, a);
    for (let j = 0; j < SIDES; j++) {
      const a0 = ang(j), a1 = ang(j + 1), am = (a0 + a1) / 2;
      for (let k = 0; k < ys.length - 1; k++) {
        const ya = ys[k], yb = ys[k + 1], ref = mid((ya + yb) / 2, am);
        quad(key, out(ya, a0), out(ya, a1), out(yb, a1), out(yb, a0), ref);
        quad(key, inn(ya, a0), inn(ya, a1), inn(yb, a1), inn(yb, a0), ref);
      }
      quad(key, out(y0, a0), out(y0, a1), inn(y0, a1), inn(y0, a0), mid(y0 + 0.001, am));
      quad(key, out(y1, a0), out(y1, a1), inn(y1, a1), inn(y1, a0), mid(y1 - 0.001, am));
    }
  }

  // ---------- 2D motifs, projected and extruded ----------
  const disc = (cx, cy, rx, ry, rot = 0, n = 8) => {
    const t = [], P = (k) => { const a = (k / n) * Math.PI * 2, x = rx * Math.cos(a), y = ry * Math.sin(a);
      return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]; };
    for (let k = 0; k < n; k++) t.push([[cx, cy], P(k), P(k + 1)]);
    return t;
  };
  const stroke = (pts0, hw, n = 1) => { // a ribbon along pts0 (each span cut in n), half-width hw(i)
    const pts = pts0.flatMap((p, i) => i === 0 ? [p] : Array.from({ length: n }, (_, k) => {
      const q = pts0[i - 1], f = (k + 1) / n; return [q[0] + (p[0] - q[0]) * f, q[1] + (p[1] - q[1]) * f]; }));
    const t = [], L = pts.map((p, i) => {
      const A = pts[Math.max(0, i - 1)], B = pts[Math.min(pts.length - 1, i + 1)];
      const dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1, h = hw(i);
      return [[p[0] - (dy / l) * h, p[1] + (dx / l) * h], [p[0] + (dy / l) * h, p[1] - (dx / l) * h]];
    });
    for (let i = 0; i < L.length - 1; i++) t.push([L[i][0], L[i][1], L[i + 1][1]], [L[i][0], L[i + 1][1], L[i + 1][0]]);
    return t;
  };
  const arc = (cx, cy, w, sag, th, n = 8) => { // a closed-eye arc, lowest in the middle, tapered ends
    const pts = [];
    for (let i = 0; i <= n; i++) { const u = -1 + (2 * i) / n; pts.push([cx + (u * w) / 2, cy - sag * (1 - u * u)]); }
    return stroke(pts, (i) => (th / 2) * (0.35 + 0.65 * (1 - (-1 + (2 * i) / n) ** 2)));
  };
  const flower = (petals, size, kind) => { // [petal tris, heart tris] around 0,0
    const P = [], n = kind === "plum" ? 5 : 12;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + 0.3;
      if (kind === "plum") P.push(...disc(Math.cos(a) * size * 0.5, Math.sin(a) * size * 0.5, size * 0.42, size * 0.42, 0, 9));
      else P.push(...disc(Math.cos(a) * size * 0.55, Math.sin(a) * size * 0.55, size * 0.45, size * 0.15, a, 6));
    }
    return [P, disc(0, 0, size * (kind === "plum" ? 0.3 : 0.28), size * (kind === "plum" ? 0.3 : 0.28), 0, 10)];
  };
  // extrude 2D tris through proj(u, v, depth) -> 3D: top at depth e, walls down to -0.002 (the
  // buried bottom is never seen and the paint has no hull, so it stays open)
  function slab(key, tris, proj, e) {
    const edges = new Map(), K = (p) => p[0].toFixed(6) + "," + p[1].toFixed(6);
    for (const t of tris) {
      const cu = (t[0][0] + t[1][0] + t[2][0]) / 3, cv = (t[0][1] + t[1][1] + t[2][1]) / 3, ref = proj(cu, cv, 0);
      const [a, b, d] = t;
      tri(key, proj(...a, e), proj(...b, e), proj(...d, e), ref);
      for (const [p, q] of [[a, b], [b, d], [d, a]]) {
        const k1 = K(p) + "|" + K(q), k2 = K(q) + "|" + K(p);
        if (edges.has(k2)) edges.delete(k2); else edges.set(k1, [p, q, ref]);
      }
    }
    for (const [p, q, ref] of edges.values()) quad(key, proj(...p, e), proj(...q, e), proj(...q, -0.002), proj(...p, -0.002), ref);
  }
  const onBody = (a0, y0) => (u, v, d) => { const y = y0 + v, r = rb(y); return at(r + d, y, a0 + u / r); };
  // tangent-plane projection onto a sphere around [0, HY, 0]: az from +Z toward +X, el up from the equator (deg)
  const onHead = (az, el, rad = () => R) => {
    const A = (az * Math.PI) / 180, E = (el * Math.PI) / 180;
    const dir = [Math.sin(A) * Math.cos(E), Math.sin(E), Math.cos(A) * Math.cos(E)];
    const tu = nrm(cross([0, 1, 0], dir)), tv = cross(dir, tu);
    return (u, v, d) => { const n = nrm(add(dir, add(mul(tu, u / R), mul(tv, v / R)))); return add([0, HY, 0], mul(n, rad(n) + d)); };
  };

  // ---------- head, hair, face ----------
  const D2R = Math.PI / 180, ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const edgeAt = (th) => { const a = Math.abs(th) / D2R; return (58 + 52 * ss(34, 54, a) + 8 * ss(100, 170, a)) * D2R; };
  const hairR = (ph, th) => R * (1.035 + 0.055 * ss(60 * D2R, 118 * D2R, ph) * ss(30, 70, Math.abs(th) / D2R));
  function head() {
    const S = 24, T = 16;
    for (let i = 0; i < T; i++)
      for (let j = 0; j < S; j++) {
        const P = (ii, jj) => { const ph = (ii / T) * Math.PI, th = (jj / S) * Math.PI * 2;
          return [Math.sin(ph) * Math.sin(th), Math.cos(ph), Math.sin(ph) * Math.cos(th)]; };
        const q = [P(i, j), P(i, j + 1), P(i + 1, j + 1), P(i + 1, j)];
        quad("wood", ...q.map((n) => add([0, HY, 0], mul(n, R))), [0, HY, 0], ...q);
      }
    const S2 = 32, T2 = 8, H = (ii, jj, inner) => {
      const th = -Math.PI + (jj / S2) * Math.PI * 2, ph = (ii / T2) * edgeAt(th);
      const n = [Math.sin(ph) * Math.sin(th), Math.cos(ph), Math.sin(ph) * Math.cos(th)];
      return { q: add([0, HY, 0], mul(n, inner ? R * 0.96 : hairR(ph, th))), n, s: add([0, HY, 0], mul(n, R)) };
    };
    for (let j = 0; j < S2; j++) {
      for (let i = 0; i < T2; i++) {
        const o = [H(i, j), H(i, j + 1), H(i + 1, j + 1), H(i + 1, j)], u = [H(i, j, 1), H(i, j + 1, 1), H(i + 1, j + 1, 1), H(i + 1, j, 1)];
        const ref = mul(add(add(o[0].s, o[2].s), add(o[1].s, o[3].s)), 0.25);
        quad("hair", ...o.map((x) => x.q), ref, ...o.map((x) => x.n));
        quad("hair", ...u.map((x) => x.q), ref, ...u.map((x) => mul(x.n, -1)));
      }
      const a = H(T2, j), b = H(T2, j + 1), ai = H(T2, j, 1), bi = H(T2, j + 1, 1), up = H(T2 - 1, j);
      quad("hair", a.q, b.q, bi.q, ai.q, mul(add(a.s, up.s), 0.5));
    }
    // face: closed eyes, fine brows, a tiny mouth, cheeks
    for (const s of [-1, 1]) {
      slab("line", arc(0, 0, 0.019, 0.0035, 0.0026), onHead(s * 21, -6), 0.0012);
      slab("line", arc(0, 0.0012, 0.016, -0.0022, 0.0016), onHead(s * 21, 7), 0.0012);
      slab("cheek", disc(0, 0, 0.0075, 0.0055), onHead(s * 31, -14), 0.0008);
    }
    slab("red", [...disc(-0.0021, 0, 0.0026, 0.002), ...disc(0.0021, 0, 0.0026, 0.002), ...disc(0, -0.0013, 0.0024, 0.0019)], onHead(0, -21), 0.001);
  }
  // red flower ornaments on the hair, one each side above the temple
  function ornaments(heart) {
    for (const s of [-1, 1]) {
      const rad = (n) => hairR(Math.acos(n[1]), Math.atan2(n[0], n[2]));
      const [P, Hh] = flower(0, 0.024, "plum");
      slab("red", P, onHead(s * 62, 30, rad), 0.002);
      slab(heart, Hh, onHead(s * 62, 30, rad), 0.0032);
      const [P2, H2] = flower(0, 0.013, "plum");
      slab("red", P2, onHead(s * 84, 14, rad), 0.002);
      slab(heart, H2, onHead(s * 84, 14, rad), 0.0032);
    }
  }

  // ---------- the dolls: one paint table each ----------
  const DOLLS = [
    { kimono: ["red", 0.03, 0.184], rings: [["plum", 0.097, 0.117], ["gold", 0.094, 0.097], ["gold", 0.117, 0.12], ["plum", 0.012, 0.018]],
      collar: "cream", flowers: ["cream", "gold", "chrys", [[0, 0.064, 0.034], [1.25, 0.055, 0.024], [-1.25, 0.055, 0.024], [0.7, 0.148, 0.016], [-0.8, 0.152, 0.014]]], heart: "gold" },
    { kimono: null, rings: [["red", 0.172, 0.178], ["plum", 0.181, 0.185], ["red", 0.01, 0.022], ["plum", 0.027, 0.031], ["red", 0.164, 0.167]],
      collar: null, flowers: ["red", "gold", "chrys", [[0, 0.095, 0.04], [1.4, 0.08, 0.028], [-1.4, 0.08, 0.028], [2.6, 0.1, 0.03]]], heart: "gold" },
    { kimono: ["plum", 0.025, 0.184], rings: [["gold", 0.1, 0.122], ["red", 0.106, 0.109], ["red", 0.113, 0.116], ["red", 0.012, 0.017]],
      collar: "cream", flowers: ["red", "gold", "plum", [[0.15, 0.06, 0.034], [-1.0, 0.07, 0.026], [1.2, 0.05, 0.022], [0.7, 0.15, 0.02]]], heart: "gold" },
    { kimono: ["gold", 0.03, 0.184], rings: [["red", 0.1, 0.12], ["plum", 0.104, 0.106], ["plum", 0.114, 0.116], ["red", 0.012, 0.018]],
      collar: "red", flowers: ["red", "cream", "chrys", [[0, 0.064, 0.034], [-1.3, 0.06, 0.024], [1.3, 0.06, 0.024]]], heart: "cream" },
    { kimono: ["red", 0.0, 0.115], rings: [["plum", 0.115, 0.123], ["red", 0.172, 0.178], ["plum", 0.165, 0.168]],
      collar: null, flowers: ["cream", "gold", "plum", [[0, 0.06, 0.034], [1.3, 0.055, 0.026], [-1.3, 0.055, 0.026], [0, 0.145, 0.02]]], heart: "gold" },
  ];
  function doll(T) {
    body();
    head();
    ornaments(T.heart);
    // each ring stands 0.6 mm proud of the highest paint it overlaps (wood counts as 0.6 mm), so layers never share a plane
    const laid = [];
    for (const [k, y0, y1] of T.kimono ? [T.kimono, ...T.rings] : T.rings) {
      const d = 0.0006 + Math.max(0.0006, ...laid.filter((l) => l.y0 < y1 && l.y1 > y0).map((l) => l.d));
      ring(k, y0, y1, d);
      laid.push({ y0, y1, d });
    }
    if (T.collar) // a crossed V collar meeting under the chin, left over right
      for (const s of [-1, 1]) slab(T.collar, stroke([[s * 0.03, 0.186], [s * 0.017, 0.168], [-s * 0.004, 0.146]].map(([u, y]) => [u, y - 0.168]),
        () => 0.0036, 5), onBody(0, 0.168), s > 0 ? 0.0022 : 0.0026);
    const [pk, hk, kind, spots] = T.flowers;
    for (const [a, y, size] of spots) {
      const [P, Hh] = flower(0, size, kind);
      slab(pk, P, onBody(a, y), 0.003);
      slab(hk, Hh, onBody(a, y), 0.0038);
    }
  }
  const SCALE = [1, 0.84, 0.7, 0.58, 0.48], k0 = height / 0.3;
  let x = 0;
  for (let i = 0; i < count; i++) {
    const s = SCALE[i] * k0, w = 0.064 * s; // half-width: the bob's flare
    if (i > 0) x += w + 0.045 * k0;
    M = new THREE.Matrix4().makeTranslation(x, 0, 0).multiply(new THREE.Matrix4().makeScale(s, s, s));
    doll(DOLLS[i]);
    x += w;
  }
  const shift = -(x - 0.064 * k0) / 2; // the row spans -w0 .. x: centre it

  // ---------- meshes: one per material ----------
  const MAT = {
    wood: [c.wood, c.woodShade, -0.05, 3],
    hair: [c.hair, c.hairShade, 0.35, 3],
    line: [c.line, c.line], red: [c.red, c.red], gold: [c.gold, c.gold], plum: [c.plum, c.plum], cream: [c.cream, c.cream], cheek: [c.cheek, c.cheek],
  };
  for (const [key, { p, n }] of Object.entries(soups)) {
    const [base, shade, threshold = 0, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    mesh.position.x = shift;
    root.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
