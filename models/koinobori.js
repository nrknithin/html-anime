// koinobori.js - a Children's Day (Kodomo no Hi) set piece: a family yard in May with a tall koinobori pole, its
// spinning arrow wheel and five-colour streamer, three carp windsocks flying out on the wind, the corner of a two-storey
// tiled house with a veranda and a kabuto on display, a hedge, a lawn, a bicycle and a wooden fence.
// Contract: harness/lab/README.md. Meters, +Y up, the yard's open side faces +Z, its left is +X (the fence side), stands
// on y = 0 (the lawn slab's underside), centred on x = 0, z = 0 (the 12 x 8 m lawn).
//
// Construction (triangle soups merged per material, 15 meshes; every triangle is wound away from a point inside its
// solid, evaluated once at build, never by hand):
//   SOCKS   the three carp and the fukinagashi are ONE parametric surface each: a vertex is stored as (sock, s, phi,
//           rho, off, side) = arc length from the mouth, angle round the body (0 = the side, pi/2 = the back), radius
//           factor, absolute radial offset, offset along the side axis. pose() integrates each sock's spine from its
//           mouth hoop on the pole (direction W, drooping by the wind option), adds a travelling wave (sideways and a
//           little up and down, growing toward the tail) and a radius ripple, frames it (S = the fixed horizontal side
//           axis, U = cross(T, S)) and rewrites every sock vertex of every mesh it lives in: hollow tube (outer wall,
//           inner wall in dark, rims), a gold mouth hoop, a forked tail fin as a thin closed slab, scale arcs, a gill
//           arc and four-disc eyes as decals 8-26 mm proud. The streamer is five closed cloth strips round one hoop.
//           Low wind droops the spine toward the pole and flattens the tube behind the hoop (limp cloth); the hoops then
//           swing clear of the pole and fan out sideways so the limp socks hang side by side, not through each other.
//           Cloth strips are wound from a point well past the opposite face: a 36-degree chord sags more than the 16 mm
//           cloth is thick, so a reference on the mid-surface lies outside the outer face (it turned the strips to ink).
//           Animated vertices that share parameters share one smooth normal and hull normal, rebuilt every pose.
//   MARKERS father, mother, child, streamer (hoop centres), wheel, kabuto, bike: empty joints for --focus only.
//   WHEEL   the yaguruma: eight arrows (shaft, head, two feather vanes) round a hub on the pole top, stored in pole-top
//           local coordinates; pose() turns them about the pole axis. The kago-dama ball above is static.
//   HOUSE   boxes and two hipped tile roofs (the house-japanese roof(): eave rectangle, rows inset at a pitch, sori lift
//           at the corners, fascia and soffit, tile rows and caps): a ground storey with a deep lower roof over the
//           engawa on the yard side, a set-back upper storey. Glass sliding doors behind the veranda, upper windows.
//   PROPS   kabuto (dark bowl, flared shikoro, side flaps, gold kuwagata horns) on a red stand on the veranda; hedge as
//           a row of lumpy lat-long ellipsoids; picket fence of boards on posts and rails; a kid's bicycle (torus tyres,
//           beam frame, seat, bars) on its stand; a stone pole base.
// Proportions (real size, base unit the pole P = 9.0 m): carp mouths at 7.25 / 6.1 / 5.1 (0.81 / 0.68 / 0.57 P), bodies
//   3.6 / 3.0 / 2.3 m long with 0.9 / 0.75 / 0.6 m tails, mouth radius 0.36 / 0.30 / 0.23 (L / R ~ 10, the sewn
//   proportion); streamer 4.0 m from 8.3; arrow wheel radius 0.45 at 8.72, ball top 9.0. House eaves 3.0 and 5.6, ridge
//   6.45; veranda 0.5 high, 0.9 deep; hedge 1.3; fence 1.05 (back half of the +X side, so the hero sees the yard);
//   bike wheels 20 in. Wind blows toward -Z and a little +X, so the hero (front-left, az 52) sees the carp side-on.
// Budget: 12.8k triangles (carp ~2.4k each with scales, streamer 0.9k, house 2.5k), 15 meshes.
// Options: build(THREE, kit, colors, { height, wind }). height scales the whole yard (default 9.0, the ball top).
//   wind 0..1 (default 0.8): 0 hangs the carp limp down the pole (flattened, no spin), 1 flies them dead straight.
// Clip: flutter (2 s loop): the travelling wave (1 Hz, an integer number of cycles per loop) ripples carp and streamer,
//   and the arrow wheel turns (a whole number of eighth turns per loop, so the loop closes). pose("flutter@0.5").
// Colours (meadow, clear May sky): father carp hair #2c5131 flat with practical #f2c94c scales; mother accent #d9483b flat
//   with sclera #f6f3ee scales; child iris #3f8a47 / hair with sclera scales; carp insides hair; eyes sclera / practical /
//   hair. Streamer accent, practical, sclera, iris, sky #d7ecef. Lawn line #a9d16e / iris; hedge iris / hair; plaster
//   and pole sclera / sky; wood skin #f0c2ae / sky; roof tiles hair, tile rows iris; glass and stone sky; bike accent.
//   The dark carp and the roof have no darker partner on meadow (ink is reserved for lines), so they are one tone.

export const meta = {
  name: "koinobori",
  height: 9.0,
  script: "meadow",
  colors: {
    lawn: "#a9d16e", lawnShade: "#3f8a47",
    green: "#3f8a47", greenShade: "#2c5131",
    plaster: "#f6f3ee", plasterShade: "#d7ecef",
    wood: "#f0c2ae", woodShade: "#d7ecef",
    dark: "#2c5131", darkShade: "#2c5131",
    red: "#d9483b", redShade: "#d9483b",
    gold: "#f2c94c", goldShade: "#f2c94c",
    white: "#f6f3ee", whiteShade: "#f6f3ee",
    sky: "#d7ecef", skyShade: "#d7ecef",
    roof: "#2c5131", roofShade: "#2c5131",
    tileLine: "#3f8a47",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height } = opts;
  const wind = Math.min(1, Math.max(0, opts.wind ?? 0.8));
  const root = new THREE.Group();
  root.name = "koinobori";
  const yard = new THREE.Group(); // uniform size scale lives here
  yard.name = "yard";
  yard.scale.setScalar(height / meta.height);
  root.add(yard);
  const joints = {};

  // ---------- vectors ----------
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const UP = [0, 1, 0];
  const TAU = Math.PI * 2;

  // ---------- the socks (3 carp + streamer) and the wheel ----------
  const GY = 0.04; // lawn top
  const POLE = [1.0, 0, 2.2]; // pole foot (x, z)
  const POLE_TOP = 8.86;
  const W = nrm([0.3, 0, -0.95]); // wind direction (downwind)
  const S = nrm(cross(UP, W)); // fixed horizontal side axis; cross(W, S) = up
  const socks = [
    { L: 3.6, F: 0.9, R0: 0.36, y: 7.25, carp: true, name: "father", side: 0 },
    { L: 3.0, F: 0.75, R0: 0.3, y: 6.1, carp: true, name: "mother", side: 0.45 },
    { L: 2.3, F: 0.6, R0: 0.23, y: 5.1, carp: true, name: "child", side: -0.45 },
    { L: 4.0, F: 0, R0: 0.3, y: 8.32, carp: false, name: "streamer", side: 0.9 },
  ];
  const NS = 48;
  for (const k of socks) {
    k.Smax = k.L + k.F;
    k.ds = k.Smax / (NS - 1);
    k.C = new Float64Array(NS * 3); k.Sx = new Float64Array(NS * 3); k.U = new Float64Array(NS * 3);
    k.R = new Float64Array(NS); k.kS = new Float64Array(NS); k.kU = new Float64Array(NS);
  }
  const Rof = (k, s) => {
    const u = Math.min(1, s / k.L);
    return k.carp ? k.R0 * (1 + 0.6 * u - 1.1 * u * u) : k.R0 * (1 - 0.15 * u);
  };
  const smooth = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  const droop = (Math.PI / 2) * 0.97 * Math.pow(1 - wind, 1.3); // spine angle below horizontal, mouth .. tail
  const infl = Math.pow(Math.min(1, wind / 0.55), 0.6); // 1 = fully blown open
  // hoop centres: just downwind of the pole when flying; as the spine droops they swing clear of the pole and fan out
  // sideways, so limp socks hang beside the pole and beside each other instead of through them
  const sag = Math.sin(droop * 0.72);
  for (const k of socks) {
    const out = 0.12 + (1.55 * k.R0 + 0.08) * sag, side = k.side * sag;
    k.mouth = [POLE[0] + W[0] * out + S[0] * side, k.y, POLE[2] + W[2] * out + S[2] * side];
  }
  const turns = (1 + Math.round(wind * 8)) / 8; // wheel turns per 2 s loop (whole eighths)
  const CLIPS = { flutter: 2 };
  let OMEGA = 0;

  function spine(t) {
    for (const k of socks) {
      const lam = 0.9 * k.Smax;
      const A = k.R0 * (k.carp ? 0.5 + 0.6 * wind : 0.9 + 0.9 * wind);
      let p = k.mouth.slice();
      const base = [];
      for (let i = 0; i < NS; i++) {
        const s = i * k.ds, u = s / k.Smax;
        const th = droop * (0.72 + 0.28 * u);
        base.push(p);
        p = add(p, add(mul(W, Math.cos(th) * k.ds), mul(UP, -Math.sin(th) * k.ds)));
      }
      const pts = [];
      for (let i = 0; i < NS; i++) {
        const s = i * k.ds, u = s / k.Smax;
        const th = droop * (0.72 + 0.28 * u);
        const T0 = add(mul(W, Math.cos(th)), mul(UP, -Math.sin(th)));
        const U0 = nrm(cross(T0, S));
        const psi = TAU * (1 * t - s / lam);
        const a = A * Math.pow(u, 1.5);
        pts.push(add(base[i], add(mul(S, a * Math.sin(psi)), mul(U0, 0.35 * a * Math.cos(psi)))));
        k.R[i] = Rof(k, s) * (1 + (k.carp ? 0.07 : 0.03) * u * Math.sin(psi + 1.2));
        const g = 1 - (1 - infl) * smooth(0, 0.25 * k.Smax, s);
        k.kS[i] = 0.22 + 0.78 * g;
        k.kU[i] = 1 + 0.4 * (1 - g);
      }
      for (let i = 0; i < NS; i++) {
        const T = nrm(sub(pts[Math.min(NS - 1, i + 1)], pts[Math.max(0, i - 1)]));
        const U = nrm(cross(T, S)), Sx = nrm(cross(U, T));
        k.C.set(pts[i], i * 3); k.U.set(U, i * 3); k.Sx.set(Sx, i * 3);
      }
    }
    OMEGA = TAU * turns * (t / 2);
  }

  // a stored vertex: [def, a, b, c, d, e]; def 0-3 sock (s, phi, rho, off, side), def 4 wheel (local x, y, z)
  function evalV(v, out = [0, 0, 0]) {
    const d = v[0];
    if (d === 4) {
      const co = Math.cos(OMEGA), si = Math.sin(OMEGA);
      out[0] = POLE[0] + v[1] * co + v[3] * si;
      out[1] = v[2];
      out[2] = POLE[2] - v[1] * si + v[3] * co;
      return out;
    }
    const k = socks[d];
    const f = Math.min(NS - 1.000001, Math.max(0, v[1] / k.ds));
    const i = Math.floor(f), w = f - i, j = i * 3, J = j + 3;
    const L = (A, q) => A[j + q] * (1 - w) + A[J + q] * w;
    const R = k.R[i] * (1 - w) + k.R[i + 1] * w;
    const kS = k.kS[i] * (1 - w) + k.kS[i + 1] * w, kU = k.kU[i] * (1 - w) + k.kU[i + 1] * w;
    const r = R * v[3] + v[4], cs = Math.cos(v[2]) * r * kS, sn = Math.sin(v[2]) * r * kU;
    for (let q = 0; q < 3; q++) out[q] = L(k.C, q) + cs * L(k.Sx, q) + sn * L(k.U, q) + v[5] * L(k.Sx, q);
    return out;
  }

  // ---------- triangle soups ----------
  const soups = {};
  const SOUP = (key) => (soups[key] ??= { p: [], v: [] });
  const isA = (q) => q.length === 6;
  const W3 = (q) => (isA(q) ? evalV(q, [0, 0, 0]) : q);
  // one triangle wound away from `ref` (a point, or a stored vertex, inside the solid); slivers dropped
  function tri(key, a, b, e, ref) {
    const [A, B, E, Rf] = [W3(a), W3(b), W3(e), W3(ref)];
    const n = cross(sub(B, A), sub(E, A));
    if (Math.hypot(...n) < 1e-9) return;
    const m = [(A[0] + B[0] + E[0]) / 3, (A[1] + B[1] + E[1]) / 3, (A[2] + B[2] + E[2]) / 3];
    const order = dot(n, sub(m, Rf)) < 0 ? [[a, A], [e, E], [b, B]] : [[a, A], [b, B], [e, E]];
    const sp = SOUP(key);
    for (const [q, Q] of order) { sp.p.push(...Q); sp.v.push(...(isA(q) ? q : [-1, 0, 0, 0, 0, 0])); }
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, cx, cy, cz, sx, sy, sz) {
    const [x0, x1, y0, y1, z0, z1] = [cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2];
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  function beam(key, a, b, w, h, up = UP) {
    const d = sub(b, a);
    let s = cross(d, up);
    if (Math.hypot(...s) < 1e-6) s = cross(d, [1, 0, 0]);
    s = nrm(s);
    const u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // closed tapered cylinder a -> b, n sides (convex: wound from its axis midpoint)
  function cyl(key, a, b, ra, rb, n = 8) {
    const d = nrm(sub(b, a));
    const e1 = nrm(cross(d, Math.abs(d[1]) > 0.9 ? [1, 0, 0] : UP)), e2 = cross(d, e1);
    const ring = (o, r) => Array.from({ length: n }, (_, i) => add(o, add(mul(e1, r * Math.cos((i / n) * TAU)), mul(e2, r * Math.sin((i / n) * TAU)))));
    const A = ring(a, ra), B = ring(b, rb), ref = mul(add(a, b), 0.5);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      quad(key, A[i], A[j], B[j], B[i], ref);
      tri(key, a, A[i], A[j], ref);
      tri(key, b, B[i], B[j], ref);
    }
  }
  // lat-long ellipsoid (or its upper half), wound from its centre
  function ell(key, o, r, nLon = 8, nLat = 5, half = false, bump = null) {
    const P = (i, j) => {
      const lon = (i / nLon) * TAU, lat = half ? (j / nLat) * (Math.PI / 2) : -Math.PI / 2 + (j / nLat) * Math.PI;
      const k = bump ? bump(i % nLon, j) : 1;
      return [o[0] + r[0] * k * Math.cos(lat) * Math.cos(lon), o[1] + r[1] * k * Math.sin(lat), o[2] + r[2] * k * Math.cos(lat) * Math.sin(lon)];
    };
    for (let i = 0; i < nLon; i++) for (let j = 0; j < nLat; j++) quad(key, P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1), o);
    if (half) for (let i = 0; i < nLon; i++) tri(key, o, P(i, 0), P(i + 1, 0), add(o, [0, 0.01, 0]));
  }
  // torus round centre o with axis ax (unit), ring radius R, tube radius r; each quad wound from its core point
  function torus(key, o, ax, R, r, nU = 18, nV = 6) {
    const e1 = nrm(cross(ax, Math.abs(ax[1]) > 0.9 ? [1, 0, 0] : UP)), e2 = cross(ax, e1);
    const core = (u) => add(o, add(mul(e1, R * Math.cos(u)), mul(e2, R * Math.sin(u))));
    const P = (i, j) => {
      const u = (i / nU) * TAU, v = (j / nV) * TAU;
      const rad = nrm(sub(core(u), o));
      return add(core(u), add(mul(rad, r * Math.cos(v)), mul(ax, r * Math.sin(v))));
    };
    for (let i = 0; i < nU; i++) for (let j = 0; j < nV; j++) quad(key, P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1), core(((i + 0.5) / nU) * TAU));
  }

  // ---------- carp ----------
  const V = (d, s, phi, rho, off = 0, side = 0) => [d, s, phi, rho, off, side];
  const TH = 0.03; // cloth wall (thickened so the inside never fights the outside)
  spine(0);
  function carp(d, bodyKey, scaleKey) {
    const k = socks[d], L = k.L, R0 = k.R0;
    const nC = 16, outerS = Array.from({ length: 19 }, (_, i) => (i / 18) * L), innerS = outerS.filter((_, i) => i % 2 === 0);
    const phi = (j) => (j / nC) * TAU;
    const mid = (s, p) => V(d, s, p, 1, -TH / 2);
    for (let i = 0; i < outerS.length - 1; i++)
      for (let j = 0; j < nC; j++) {
        const [s0, s1, p0, p1] = [outerS[i], outerS[i + 1], phi(j), phi(j + 1)];
        quad(bodyKey, V(d, s0, p0, 1), V(d, s1, p0, 1), V(d, s1, p1, 1), V(d, s0, p1, 1), mid((s0 + s1) / 2, (p0 + p1) / 2));
      }
    for (let i = 0; i < innerS.length - 1; i++)
      for (let j = 0; j < nC; j++) {
        const [s0, s1, p0, p1] = [innerS[i], innerS[i + 1], phi(j), phi(j + 1)];
        quad("dark", V(d, s0, p0, 1, -TH), V(d, s1, p0, 1, -TH), V(d, s1, p1, 1, -TH), V(d, s0, p1, 1, -TH), mid((s0 + s1) / 2, (p0 + p1) / 2));
      }
    // tail rim (the mouth rim is covered by the hoop)
    for (let j = 0; j < nC; j++)
      quad("dark", V(d, L, phi(j), 1), V(d, L, phi(j + 1), 1), V(d, L, phi(j + 1), 1, -TH), V(d, L, phi(j), 1, -TH), mid(L - 0.05, phi(j + 0.5)));
    // mouth hoop: a closed square-section ring over the rim
    for (let j = 0; j < nC; j++) {
      const ring = [[-0.01, -TH - 0.012], [0.05, -TH - 0.012], [0.05, 0.022], [-0.01, 0.022]];
      for (let q = 0; q < 4; q++) {
        const [a, b] = [ring[q], ring[(q + 1) % 4]];
        quad("gold", V(d, a[0], phi(j), 1, a[1]), V(d, b[0], phi(j), 1, b[1]), V(d, b[0], phi(j + 1), 1, b[1]), V(d, a[0], phi(j + 1), 1, a[1]), V(d, 0.02, phi(j + 0.5), 1, -TH / 2 + 0.005));
      }
    }
    // forked tail fin: thin closed slab in the T-U plane, root at s = L over the tail opening
    const RL = Rof(k, L), F = k.F, nI = 5, nJ = 6, ft = 0.012;
    const fin = (i, j, side) => {
      const vn = -1 + (2 * j) / nJ;
      const s = L - 0.04 + (i / nI) * (F * (0.5 + 0.5 * Math.abs(vn)) + 0.04);
      const v = vn * RL * (1 + 0.9 * ((s - L) / F) * (0.6 + 0.4 * Math.abs(vn)));
      return V(d, s, Math.PI / 2, 0, v, side);
    };
    const finMid = (i, j) => { const q = fin(i, j, 0); return q; };
    for (let i = 0; i < nI; i++)
      for (let j = 0; j < nJ; j++)
        for (const sd of [ft, -ft]) quad(bodyKey, fin(i, j, sd), fin(i + 1, j, sd), fin(i + 1, j + 1, sd), fin(i, j + 1, sd), finMid(i + 0.5, j + 0.5));
    const edge = [];
    for (let j = 0; j < nJ; j++) edge.push([nI, j, nI, j + 1]);
    for (let i = 0; i < nI; i++) edge.push([i, 0, i + 1, 0], [i, nJ, i + 1, nJ]);
    for (let j = 0; j < nJ; j++) edge.push([0, j, 0, j + 1]);
    for (const [i0, j0, i1, j1] of edge)
      quad(bodyKey, fin(i0, j0, ft), fin(i1, j1, ft), fin(i1, j1, -ft), fin(i0, j0, -ft), finMid(nI / 2, nJ / 2));
    // fin rays: decal strokes on both faces
    for (const jj of [1.5, 3, 4.5]) for (const sd of [ft + 0.006, -ft - 0.006]) {
      for (let i = 1; i < nI; i++) {
        const w = 0.18;
        quad(scaleKey, fin(i, jj - w, sd), fin(i + 1, jj - w, sd), fin(i + 1, jj + w, sd), fin(i, jj + w, sd), fin(i + 0.5, jj, 0));
      }
    }
    // decals on the outer wall (no hull): scales, gill arc, eyes
    const decal = (key, pts, off) => {
      // pts: closed list of [s, phi] around a convex patch; fan from its centre
      const cs = pts.reduce((m, q) => m + q[0], 0) / pts.length, cp = pts.reduce((m, q) => m + q[1], 0) / pts.length;
      for (let q = 0; q < pts.length; q++) {
        const [a, b] = [pts[q], pts[(q + 1) % pts.length]];
        tri(key, V(d, cs, cp, 1, off), V(d, a[0], a[1], 1, off), V(d, b[0], b[1], 1, off), V(d, cs, cp, 1, off - 0.05));
      }
    };
    const strip = (key, line, half, off) => {
      // a stroke along a polyline of [s, phi], `half` m wide across it (in s)
      for (let q = 0; q < line.length - 1; q++) {
        const [a, b] = [line[q], line[q + 1]];
        quad(key, V(d, a[0] - half, a[1], 1, off), V(d, b[0] - half, b[1], 1, off), V(d, b[0] + half, b[1], 1, off), V(d, a[0] + half, a[1], 1, off), V(d, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 1, off - 0.05));
      }
    };
    // scales: rows of arcs bulging toward the tail, 6 round the body, alternate rows offset half a column
    const NCOL = 6, dphi = TAU / NCOL;
    const sStart = 1.9 * R0, sEnd = 0.93 * L;
    let row = 0;
    for (let s = sStart; s < sEnd; row++) {
      const R = Rof(k, s), r = 0.5 * R * dphi;
      for (let col = 0; col < NCOL; col++) {
        const pc = (col + (row % 2) * 0.5) * dphi;
        const line = [];
        for (let q = 0; q <= 4; q++) {
          const al = -Math.PI / 2 + (q / 4) * Math.PI;
          line.push([s + 0.85 * r * Math.cos(al), pc + (r * Math.sin(al)) / R]);
        }
        strip(scaleKey, line, 0.09 * r, 0.008);
      }
      s += 0.62 * r;
    }
    // gill arc: a band round the body behind the head, sweeping back at the sides
    const sg = 1.45 * R0, gl = [];
    for (let q = 0; q <= 16; q++) { const p = (q / 16) * TAU; gl.push([sg + 0.35 * R0 * Math.cos(p) ** 2, p]); }
    strip(scaleKey, gl, 0.035 * R0 + 0.01, 0.008);
    // eyes on both sides: white, gold iris, dark pupil, white catch-light
    const se = 0.72 * R0, pe = 0.42;
    for (const p0 of [pe, Math.PI - pe]) {
      const Re = Rof(k, se);
      const disc = (key, ds, dp, rad, off, n = 14) =>
        decal(key, Array.from({ length: n }, (_, q) => [se + ds + rad * Math.cos((q / n) * TAU), p0 + (dp + rad * Math.sin((q / n) * TAU)) / Re]), off);
      const re = 0.4 * R0;
      disc("whiteDecal", 0, 0, re, 0.01);
      disc("goldDecal", 0, 0, 0.7 * re, 0.016);
      disc("darkDecal", 0, 0, 0.46 * re, 0.022);
      disc("whiteDecal", -0.15 * re, (p0 < 1.5 ? 1 : -1) * 0.15 * re, 0.14 * re, 0.028, 8);
    }
  }
  carp(0, "dark", "goldDecal");
  carp(1, "red", "whiteDecal");
  carp(2, "green", "whiteDecal");

  // ---------- fukinagashi: a gold hoop and five closed cloth strips ----------
  {
    const d = 3, k = socks[3], L = k.L, keys = ["green", "gold", "red", "white", "sky"]; // by angle from the far side: red faces the yard
    const nC = 15;
    for (let j = 0; j < nC; j++) {
      const ring = [[-0.01, -0.03], [0.06, -0.03], [0.06, 0.02], [-0.01, 0.02]];
      const p0 = (j / nC) * TAU, p1 = ((j + 1) / nC) * TAU;
      for (let q = 0; q < 4; q++) {
        const [a, b] = [ring[q], ring[(q + 1) % 4]];
        quad("gold", V(d, a[0], p0, 1, a[1]), V(d, b[0], p0, 1, b[1]), V(d, b[0], p1, 1, b[1]), V(d, a[0], p1, 1, a[1]), V(d, 0.025, (p0 + p1) / 2, 1, -0.005));
      }
    }
    const nA = 14, nB = 2, ct = 0.008;
    keys.forEach((key, m) => {
      const Lm = L * (0.9 + 0.1 * (((m * 3) % 5) / 4));
      const pc = (m + 0.5) * (TAU / 5);
      const P = (i, b, off) => {
        const s = 0.03 + (i / nA) * (Lm - 0.03);
        const hw = (Math.PI / 5) * (0.94 - 0.3 * (s / L));
        return V(d, s, pc + (-1 + (2 * b) / nB) * hw, 1, off);
      };
      const ref = (i, b) => P(i, b, 0);
      for (let i = 0; i < nA; i++)
        for (let b = 0; b < nB; b++)
          // faces wound from a point well past the other face: a chord across 36 deg sags more than the cloth is thick
          for (const off of [ct, -ct]) quad(key, P(i, b, off), P(i + 1, b, off), P(i + 1, b + 1, off), P(i, b + 1, off), P(i + 0.5, b + 0.5, -25 * off));
      const edge = [];
      for (let i = 0; i < nA; i++) edge.push([i, 0, i + 1, 0], [i, nB, i + 1, nB]);
      for (let b = 0; b < nB; b++) edge.push([0, b, 0, b + 1], [nA, b, nA, b + 1]);
      for (const [i0, b0, i1, b1] of edge) {
        const mi = (i0 + i1) / 2, inward = i0 === i1 ? (i0 === 0 ? 0.5 : nA - 0.5) : mi;
        const mb = b0 === b1 ? (b0 === 0 ? 0.5 : nB - 0.5) : (b0 + b1) / 2;
        quad(key, P(i0, b0, ct), P(i1, b1, ct), P(i1, b1, -ct), P(i0, b0, -ct), ref(inward, mb));
      }
    });
  }

  // ---------- pole, arrow wheel, ball, cords ----------
  box("sky", POLE[0], GY + 0.12, POLE[2], 0.5, 0.24, 0.5); // stone base
  cyl("pole", [POLE[0], GY + 0.2, POLE[2]], [POLE[0], POLE_TOP, POLE[2]], 0.075, 0.045, 8);
  ell("gold", [POLE[0], 8.93, POLE[2]], [0.07, 0.07, 0.07], 8, 4);
  {
    const WV = (x, y, z) => [4, x, y, z, 0, 0];
    const yw = 8.72;
    // hub
    const hubN = 8;
    for (let i = 0; i < hubN; i++) {
      const a0 = (i / hubN) * TAU, a1 = ((i + 1) / hubN) * TAU, r = 0.09;
      const p = (a, y) => WV(r * Math.cos(a), y, r * Math.sin(a));
      quad("gold", p(a0, yw - 0.03), p(a1, yw - 0.03), p(a1, yw + 0.03), p(a0, yw + 0.03), WV(0, yw, 0));
      tri("gold", WV(0, yw + 0.03, 0), p(a0, yw + 0.03), p(a1, yw + 0.03), WV(0, yw, 0));
      tri("gold", WV(0, yw - 0.03, 0), p(a0, yw - 0.03), p(a1, yw - 0.03), WV(0, yw, 0));
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU, ca = Math.cos(a), sa = Math.sin(a), ta = [-sa, 0, ca];
      const at = (r, y, t = 0) => WV(r * ca + t * ta[0], y, r * sa + t * ta[2]);
      // shaft: a square beam r 0.08 .. 0.44
      const hw = 0.012;
      const pts = [];
      for (const r of [0.08, 0.42]) for (const [t, y] of [[-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]]) pts.push(at(r, yw + y, t));
      const ref = at(0.25, yw);
      for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
        quad("gold", pts[f[0]], pts[f[1]], pts[f[2]], pts[f[3]], ref);
      // two feather vanes at the outer end (thin vertical slabs), red and white alternating
      const fk = i % 2 ? "red" : "white";
      for (const sgn of [1, -1]) {
        const v = (r, h, side) => at(r, yw + sgn * h, side);
        const fp = [v(0.3, 0.01, -0.006), v(0.46, 0.01, -0.006), v(0.48, 0.1, -0.006), v(0.36, 0.1, -0.006),
          v(0.3, 0.01, 0.006), v(0.46, 0.01, 0.006), v(0.48, 0.1, 0.006), v(0.36, 0.1, 0.006)];
        const fr = v(0.4, 0.05, 0);
        for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
          quad(fk, fp[f[0]], fp[f[1]], fp[f[2]], fp[f[3]], fr);
      }
    }
  }
  // cords from the pole to each hoop top (static at the build's wind)
  for (const k of socks) {
    const top = evalV([socks.indexOf(k), 0.02, Math.PI / 2, 1, 0.02, 0]);
    beam("dark", [POLE[0], top[1] + 0.02, POLE[2]], top, 0.018, 0.018);
  }

  // ---------- lawn, hedge, stepping stones ----------
  box("lawn", 0, GY / 2, 0, 12, GY, 8);
  for (let i = 0; i < 11; i++) {
    const x = -5.5 + i * 1.07, h = 1.25 + 0.1 * Math.sin(i * 2.1);
    ell("green", [x, GY + h / 2 + 0.03, -3.6], [0.72, h / 2, 0.42], 8, 5, false, (a, b) => 1 + 0.07 * Math.sin(a * 2.3 + b * 1.7 + i));
  }
  for (const [x, z, r] of [[-1.0, 1.4, 0.26], [-0.2, 1.8, 0.22], [0.5, 2.5, 0.24]]) cyl("sky", [x, GY - 0.01, z], [x, GY + 0.035, z], r, r * 0.92, 8);

  // ---------- house ----------
  const face = (side, at) => ({
    p: (u, y, o) => side === "+z" ? [u, y, at + o] : side === "-z" ? [-u, y, at - o] : side === "+x" ? [at + o, y, -u] : [at - o, y, u],
    s: (w, h, d) => (side[1] === "z" ? [w, h, d] : [d, h, w]),
  });
  const wbox = (key, f, u, y, o, w, h, d) => box(key, ...f.p(u, y, o), ...f.s(w, h, d));
  const wquad = (key, f, u, y, o, w, h) =>
    quad(key, f.p(u - w / 2, y - h / 2, o), f.p(u + w / 2, y - h / 2, o), f.p(u + w / 2, y + h / 2, o), f.p(u - w / 2, y + h / 2, o), f.p(u, y, o - 1));
  function win(f, u, y0, w, h, nv = 1, nh = 1) {
    const yc = y0 + h / 2;
    wbox("wood", f, u, yc, 0.03, w + 0.14, h + 0.14, 0.06);
    wquad("sky", f, u, yc, 0.07, w, h);
    for (let i = 1; i <= nv; i++) wquad("wood", f, u - w / 2 + (i * w) / (nv + 1), yc, 0.078, 0.05, h);
    for (let j = 1; j <= nh; j++) wquad("wood", f, u, y0 + (j * h) / (nh + 1), 0.078, w, 0.04);
  }
  function roof(key, { x0, x1, z0, z1, e, D, p, k = 0.14, t = 0.18, n = 6, m = 3, gap = 0.42 }) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const sori = (u) => k * Math.pow(Math.abs(2 * u - 1), 3);
    const sides = [[[x1, z1], [x0, z1], [0, -1]], [[x0, z1], [x0, z0], [1, 0]], [[x0, z0], [x1, z0], [0, 1]], [[x1, z0], [x1, z1], [-1, 0]]];
    const surf = (A, B, N, a, d) => {
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]), dir = [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
      const v = Math.min(1, d / D), span = Math.max(1e-6, L - 2 * v * D), u = (a - v * D) / span;
      return [A[0] + dir[0] * a + N[0] * d, e + p * d + sori(Math.min(1, Math.max(0, u))) * (1 - v) * (1 - v), A[1] + dir[1] * a + N[1] * d];
    };
    const ref = [cx, e - t + 0.02, cz], low = [cx, e - t - 0.25, cz], top = [cx, e + p * D, cz];
    for (const [A, B, N] of sides) {
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const row = (v) => Array.from({ length: n + 1 }, (_, i) => surf(A, B, N, v * D + (i / n) * (L - 2 * v * D), v * D));
      const rows = Array.from({ length: m + 1 }, (_, j) => row(j / m));
      for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) quad(key, rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i], ref);
      const edge = rows[0], drop = edge.map((q) => [q[0], q[1] - t, q[2]]);
      for (let i = 0; i < n; i++) {
        quad(key, edge[i], edge[i + 1], drop[i + 1], drop[i], ref);
        tri(key, drop[i], drop[i + 1], low, ref);
        tri(key, rows[m][i], rows[m][i + 1], top, ref);
      }
      for (let a = gap * 0.75; a < L - gap * 0.5; a += gap) {
        const dMax = Math.min(a, L - a, D) - 0.04;
        if (dMax < 0.15) continue;
        const steps = Math.max(2, Math.ceil((dMax / D) * m)), hw = 0.03;
        for (let s = 0; s < steps; s++) {
          const d0 = (s / steps) * dMax, d1 = ((s + 1) / steps) * dMax;
          const q = [surf(A, B, N, a - hw, d0), surf(A, B, N, a + hw, d0), surf(A, B, N, a + hw, d1), surf(A, B, N, a - hw, d1)];
          for (const r of q) r[1] += 0.02;
          quad("tileLine", q[0], q[1], q[2], q[3], [q[0][0], q[0][1] - 1, q[0][2]]);
        }
      }
    }
    const xi0 = x0 + D, xi1 = x1 - D, zi0 = z0 + D, zi1 = z1 - D, ytop = e + p * D;
    for (const [xo, zo, xi, zi] of [[x0, z0, xi0, zi0], [x1, z0, xi1, zi0], [x1, z1, xi1, zi1], [x0, z1, xi0, zi1]])
      beam(key, [xo, e + k + 0.04, zo], [xi, ytop + 0.07, zi], 0.16, 0.12);
    return { xi0, xi1, zi0, zi1, ytop };
  }
  const G = { x0: -5.6, x1: -2.6, z0: -1.6, z1: 3.4 };
  const U = { x0: -5.6, x1: -3.2, z0: -1.6, z1: 2.6 };
  const FY = 0.45;
  box("sky", (G.x0 + G.x1) / 2, (GY + FY) / 2, (G.z0 + G.z1) / 2, G.x1 - G.x0 + 0.08, FY - GY, G.z1 - G.z0 + 0.08);
  box("plaster", (G.x0 + G.x1) / 2, (FY + 3.1) / 2, (G.z0 + G.z1) / 2, G.x1 - G.x0, 3.1 - FY, G.z1 - G.z0);
  box("plaster", (U.x0 + U.x1) / 2, (3.0 + 5.7) / 2, (U.z0 + U.z1) / 2, U.x1 - U.x0, 2.7, U.z1 - U.z0);
  for (const [x, z] of [[G.x1, G.z1], [G.x1, G.z0], [G.x0, G.z1]]) box("wood", x, (FY + 3.0) / 2, z, 0.14, 3.0 - FY, 0.14);
  for (const [x, z] of [[U.x1, U.z1], [U.x1, U.z0], [U.x0, U.z1]]) box("wood", x, 4.35, z, 0.14, 2.7, 0.14);
  roof("roof", { x0: -6.0, x1: -1.55, z0: -2.0, z1: 3.85, e: 3.0, D: 1.62, p: 0.36, k: 0.1, m: 2 });
  const mr = roof("roof", { x0: -6.15, x1: -2.65, z0: -2.15, z1: 3.15, e: 5.6, D: 1.75, p: 0.48, k: 0.14, m: 3 });
  const rx = (mr.xi0 + mr.xi1) / 2;
  beam("roof", [rx, mr.ytop + 0.08, mr.zi0 - 0.1], [rx, mr.ytop + 0.08, mr.zi1 + 0.1], 0.24, 0.18);
  for (const z of [mr.zi0 - 0.12, mr.zi1 + 0.12]) box("roof", rx, mr.ytop + 0.14, z, 0.32, 0.3, 0.16);
  // yard side (+X): glass sliding doors behind the veranda, upper windows
  const side = face("+x", G.x1), upSide = face("+x", U.x1), front = face("+z", G.z1), upFront = face("+z", U.z1);
  for (const u of [-2.55, -1.15, 0.25]) win(side, u, 0.55, 1.3, 2.0, 1, 2);
  win(upSide, -1.7, 3.8, 1.3, 1.05, 1, 1);
  win(upSide, 0.3, 3.8, 1.3, 1.05, 1, 1);
  win(front, -4.1, 1.2, 1.5, 1.05, 1, 1);
  win(upFront, -4.4, 3.8, 1.4, 1.05, 1, 1);
  // engawa: deck, board joints, posts, eave beam, step stone
  const EX = G.x1 + 0.9, EZ0 = -1.3, EZ1 = 3.15;
  box("wood", (G.x1 + EX) / 2, 0.46, (EZ0 + EZ1) / 2, EX - G.x1, 0.08, EZ1 - EZ0);
  for (let z = EZ0 + 0.35; z < EZ1 - 0.1; z += 0.55) box("wood", (G.x1 + EX) / 2, 0.502, z, EX - G.x1 - 0.06, 0.006, 0.025);
  for (const z of [EZ0 + 0.06, 0.95, EZ1 - 0.06]) {
    box("wood", EX - 0.07, 1.7, z, 0.12, 2.5, 0.12);
    box("wood", EX - 0.07, 0.22, z, 0.1, 0.4, 0.1);
  }
  box("wood", EX - 0.07, 2.91, (EZ0 + EZ1) / 2, 0.15, 0.18, EZ1 - EZ0 + 0.25);
  box("sky", EX + 0.35, GY + 0.1, 1.9, 0.55, 0.2, 0.9);

  // ---------- kabuto on its stand, facing the yard (+X) ----------
  {
    const kx = -2.1, kz = 1.95, ky = 0.5;
    box("red", kx, ky + 0.05, kz, 0.46, 0.1, 0.56); // stand
    box("dark", kx, ky + 0.15, kz, 0.2, 0.1, 0.2); // helmet rest
    const hy = ky + 0.3;
    ell("dark", [kx, hy, kz], [0.15, 0.15, 0.15], 10, 4, true); // bowl
    cyl("dark", [kx, hy + 0.01, kz], [kx, hy - 0.11, kz], 0.16, 0.25, 10); // shikoro (flared neck guard)
    for (const sgn of [1, -1]) box("dark", kx + 0.1, hy - 0.02, kz + sgn * 0.2, 0.08, 0.1, 0.03); // fukigaeshi
    box("gold", kx + 0.15, hy + 0.02, kz, 0.03, 0.04, 0.16); // brow plate
    for (const sgn of [1, -1]) beam("gold", [kx + 0.15, hy + 0.03, kz + sgn * 0.04], [kx + 0.2, hy + 0.27, kz + sgn * 0.17], 0.035, 0.014, [1, 0, 0]);
  }

  // ---------- fence along the +X side ----------
  {
    const fx = 5.78, z0 = -3.25, z1 = 1.55, h = 1.05;
    for (let z = z0; z <= z1 + 0.01; z += (z1 - z0) / 3) box("wood", fx, GY + h / 2 + 0.05, z, 0.1, h + 0.1, 0.1);
    for (const y of [0.3, 0.85]) box("wood", fx - 0.07, GY + y, (z0 + z1) / 2, 0.04, 0.07, z1 - z0);
    for (let z = z0 + 0.12; z < z1 - 0.06; z += 0.16) {
      const p = [fx - 0.11, GY + 0.06, z];
      hex("wood", [[p[0] - 0.012, p[1], z - 0.05], [p[0] + 0.012, p[1], z - 0.05], [p[0] + 0.012, p[1], z + 0.05], [p[0] - 0.012, p[1], z + 0.05],
        [p[0] - 0.012, GY + h - 0.03, z - 0.05], [p[0] + 0.012, GY + h - 0.03, z - 0.05], [p[0] + 0.012, GY + h + 0.03, z + 0.05], [p[0] - 0.012, GY + h + 0.03, z + 0.05]]);
    }
  }

  // ---------- bicycle (kid's, 20 in), parked on its stand ----------
  const BIKE = [4.4, GY, 2.9];
  {
    const O = BIKE, fwd = nrm([0.62, 0, -0.79]), lat = cross(fwd, UP), lean = 0.07;
    const up = nrm(add(UP, mul(lat, -lean)));
    const B = (x, y, z = 0) => add(O, add(mul(fwd, x), add(mul(up, y), mul(lat, z))));
    const wr = 0.28;
    for (const x of [-0.43, 0.43]) {
      torus("dark", B(x, wr), lat, wr - 0.03, 0.03, 18, 5);
      cyl("white", B(x, wr, -0.045), B(x, wr, 0.045), 0.035, 0.035, 6);
      for (let q = 0; q < 3; q++) {
        const a = (q / 3) * Math.PI + 0.3;
        beam("white", B(x - Math.cos(a) * (wr - 0.05), wr - Math.sin(a) * (wr - 0.05)), B(x + Math.cos(a) * (wr - 0.05), wr + Math.sin(a) * (wr - 0.05)), 0.012, 0.012, lat);
      }
    }
    const tb = (a, b, w = 0.035) => beam("red", B(...a), B(...b), w, w, lat);
    const BB = [0, 0.27], ST = [-0.12, 0.64], HT = [0.3, 0.64], HT2 = [0.33, 0.76];
    tb(BB, ST); tb(ST, HT); tb(BB, HT); tb(HT, HT2);
    for (const sgn of [1, -1]) {
      tb([...BB, sgn * 0.04], [-0.43, wr, sgn * 0.05], 0.025);
      tb([...ST, sgn * 0.02], [-0.43, wr, sgn * 0.05], 0.025);
      tb([HT[0] - 0.01, HT[1], sgn * 0.035], [0.43, wr, sgn * 0.05], 0.028);
    }
    tb(HT2, [0.31, 0.88], 0.03);
    beam("dark", B(0.31, 0.88, -0.25), B(0.31, 0.88, 0.25), 0.03, 0.03, fwd);
    beam("white", B(-0.12, 0.64), B(-0.14, 0.74), 0.025, 0.025, lat);
    box("dark", ...B(-0.15, 0.77), 0.1, 0.05, 0.1);
    beam("dark", B(-0.22, 0.77), B(-0.06, 0.77), 0.14, 0.05, UP); // saddle
    // basket on the bars
    beam("white", B(0.36, 0.76), B(0.55, 0.76), 0.24, 0.16, UP);
    beam("white", B(-0.02, 0.24, -0.06), [O[0] - fwd[0] * 0.15 - lat[0] * 0.22, GY, O[2] - fwd[2] * 0.15 - lat[2] * 0.22], 0.022, 0.022); // stand
  }

  // ---------- markers (for --focus; nothing hangs off them) ----------
  const mark = (name, p) => { const o = new THREE.Group(); o.name = name; o.position.set(...p); yard.add(o); joints[name] = o; };
  for (const k of socks) mark(k.name, k.mouth);
  mark("wheel", [POLE[0], 8.72, POLE[2]]);
  mark("kabuto", [-2.1, 0.8, 1.95]);
  mark("bike", BIKE);

  // ---------- meshes ----------
  const MAT = {
    lawn: [c.lawn, c.lawnShade, 0.1, 3],
    green: [c.green, c.greenShade, 0.15, 3],
    plaster: [c.plaster, c.plasterShade, 0.1, 3],
    pole: [c.plaster, c.plasterShade, 0.0, 2],
    wood: [c.wood, c.woodShade, 0.1, 2.5],
    dark: [c.dark, c.darkShade, 0.1, 3],
    red: [c.red, c.redShade, 0.1, 3],
    gold: [c.gold, c.goldShade, 0.1, 2.5],
    white: [c.white, c.whiteShade, 0.1, 2.5],
    sky: [c.sky, c.skyShade, 0.1, 2.5],
    roof: [c.roof, c.roofShade, 0.1, 3],
    tileLine: [c.tileLine, c.tileLine, 0.1, 0],
    whiteDecal: [c.white, c.white, -1, 0],
    goldDecal: [c.gold, c.gold, -1, 0],
    darkDecal: [c.dark, c.dark, -1, 0],
  };
  const live = [];
  const tmp = [0, 0, 0];
  for (const [key, { p, v }] of Object.entries(soups)) {
    const [base, shade, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    yard.add(mesh);
    const n = p.length / 3, idx = [];
    for (let i = 0; i < n; i++) if (v[i * 6] >= 0) idx.push(i);
    if (!idx.length) continue;
    // animated vertices that share their parameters share a slot (seam phi wrapped), so normals average smoothly
    const slotOf = new Int32Array(n).fill(-1), keys = new Map();
    for (const i of idx) {
      const q = v.slice(i * 6, i * 6 + 6);
      if (q[0] < 4) q[2] = ((q[2] % TAU) + TAU) % TAU;
      const kk = q.map((x, m) => Math.round(m === 2 && q[0] < 4 && Math.abs(x - TAU) < 1e-6 ? 0 : x * 1e4)).join(",");
      let sIdx = keys.get(kk);
      if (sIdx === undefined) keys.set(kk, (sIdx = keys.size));
      slotOf[i] = sIdx;
    }
    const tris = [];
    for (let t = 0; t < n / 3; t++) if (slotOf[t * 3] >= 0) tris.push(t);
    mesh.frustumCulled = false;
    for (const ch of mesh.children) ch.frustumCulled = false;
    live.push({ g, v: Float32Array.from(v), idx, slotOf, tris, nSlots: keys.size });
  }
  function rewrite() {
    for (const L of live) {
      const P = L.g.attributes.position.array, N = L.g.attributes.normal.array, H = L.g.attributes.hullNormal?.array;
      const q = [0, 0, 0, 0, 0, 0];
      for (const i of L.idx) {
        for (let m = 0; m < 6; m++) q[m] = L.v[i * 6 + m];
        evalV(q, tmp);
        P[i * 3] = tmp[0]; P[i * 3 + 1] = tmp[1]; P[i * 3 + 2] = tmp[2];
      }
      const acc = new Float64Array(L.nSlots * 3);
      for (const t of L.tris) {
        const a = t * 9;
        const e1 = [P[a + 3] - P[a], P[a + 4] - P[a + 1], P[a + 5] - P[a + 2]], e2 = [P[a + 6] - P[a], P[a + 7] - P[a + 1], P[a + 8] - P[a + 2]];
        const fn = cross(e1, e2);
        for (let m = 0; m < 3; m++) { const s = L.slotOf[t * 3 + m] * 3; acc[s] += fn[0]; acc[s + 1] += fn[1]; acc[s + 2] += fn[2]; }
      }
      for (const i of L.idx) {
        const s = L.slotOf[i] * 3, l = Math.hypot(acc[s], acc[s + 1], acc[s + 2]) || 1;
        for (let m = 0; m < 3; m++) { N[i * 3 + m] = acc[s + m] / l; if (H) H[i * 3 + m] = acc[s + m] / l; }
      }
      L.g.attributes.position.needsUpdate = L.g.attributes.normal.needsUpdate = true;
      if (H) L.g.attributes.hullNormal.needsUpdate = true;
      L.g.computeBoundingSphere();
      L.g.computeBoundingBox();
    }
  }

  // ---------- poses and clips ----------
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    let t = 0;
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`koinobori: no clip "${m[1]}" (clips: flutter)`);
      t = ((+m[2] % 2) + 2) % 2;
    } else if (name !== "rest") throw new Error(`koinobori: unknown pose "${name}" (rest, or flutter@<seconds>)`);
    spine(t);
    rewrite();
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
