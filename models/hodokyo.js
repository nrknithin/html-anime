// hodokyo.js - a Japanese pedestrian overpass (hodokyo) over a two-lane road, the anime spot for sunset conversations.
// Static. Contract: harness/lab/README.md. Meters, +Y up, the road runs along X (traffic sees the signs on the +X / -X
// faces), the deck crosses it along Z, front is +Z, its left is +X, stands on y = 0, centred on x = 0, z = 0.
//
// Construction (boxes, prisms and two tori as triangle soups merged per material; flat-shaded, so plates read crisp;
// every closed part is wound away from a point inside it, flat quads away from a point behind them, never by hand):
//   DECK     a steel box girder 1.7 m wide along Z over the road and both sidewalks, a floor on it, and the solid side
//            panels (the hodokyo's identity: a pale painted wall at handrail height) with a cap rail. Panel joints and a
//            band under the cap are dark inked strips, since the hull draws silhouettes only. A blank sign plate on each
//            face that meets the traffic (+X, -X), white frame, dark field, no lettering.
//   STAIRS   two straight flights with a mid landing at each end, on the sidewalks, running along the road, the top
//            landing on the deck end; the set has 180 deg symmetry (one half, rotated), so the +Z stair descends to +X
//            and the -Z stair to -X: the front view reads as a flat top with a slope down each side. Step blocks on a
//            sloped stringer slab, closed between two solid side panels that follow the stair route (one hex per leg).
//   PIERS    a two-column portal under each deck end and a column under each top and mid landing.
//   ROAD     asphalt slab with white edge lines, a dashed centre line and a zebra crossing on the +X side; raised
//            sidewalks with white curbs; white pedestrian guard pipes along both curbs, open at the crossing.
//   PROPS    two street lights (white pole, arm over the road, dark lamp head; opts.lights picks the lens tone), a convex traffic
//            mirror on its pole, a mamachari (step-through city bicycle with a front basket) by the +Z stair foot.
// Proportions (real size, base unit the deck height 5.0 m = floor): road z +-3.0, lanes 2.75 m, sidewalks 3.0-5.45
//   (curb 0.2, top 0.2); deck x +-0.85, girder 4.5-5.0, panels to 6.15, cap 6.22; stairs z 3.9-5.3 (1.4 wide), 28
//   risers of 0.171, treads 0.28, mid landing 1.2 m at y 2.6, foot at x 10.08; lights 7.0 m (lamp head bottom 6.75);
//   mirror centre 2.9 m, D 0.8; bicycle wheels r 0.33.
// Options build(THREE, kit, colors, { height, lights }): height scales the whole set uniformly (meta.height = the
//   street light tops); lights true (default) = lamp lenses flat practical (lit, threshold -1), false = dark glass.
// Colours (eclipse, the dark-red sunset: its one cool tone, practical #f3f6ff, is the pale-blue paint, and the dark
//   red sky makes the pale deck the silhouette): paint (girder, panels, piers, stair slabs) practical #f3f6ff / skin
//   #e8b8a8; paving (treads, floors, sidewalks) skin / iris #ff5a4a; white (curbs, guard pipes, light poles, sign
//   frame) sclera #f6f3ee / skin; asphalt sky #2a1016 / hair #1a1014; markings sclera flat; lines (panel joints, cap
//   band) hair flat; dark (sign field, lamp heads, tyres, saddle, basket) sky / hair; red (bicycle frame, mirror housing and pole) iris /
//   accent #ff3b3b; mirror glass line #f6e4e4 flat; lamp lit practical flat, off sky / hair. Pale parts at threshold
//   0.1 so faces square to the camera stay lit.

export const meta = {
  name: "hodokyo",
  height: 7.08,
  script: "eclipse",
  colors: {
    paint: "#f3f6ff", paintShade: "#e8b8a8",
    pave: "#e8b8a8", paveShade: "#ff5a4a",
    white: "#f6f3ee", whiteShade: "#e8b8a8",
    asphalt: "#2a1016", asphaltShade: "#1a1014",
    marking: "#f6f3ee",
    line: "#1a1014",
    dark: "#2a1016", darkShade: "#1a1014",
    red: "#ff5a4a", redShade: "#ff3b3b",
    glass: "#f6e4e4",
    lamp: "#f3f6ff",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const { height = meta.height, lights = true } = opts;
  const root = new THREE.Group();
  root.name = "hodokyo";
  const set = new THREE.Group(); // the uniform size scale lives here
  set.name = "set";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  const soups = {};
  function tri(key, a, b, e, ref) {
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-8) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    (soups[key] ??= []).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  // the half-set transform: s = 1 as written, s = -1 the 180 deg turn about Y
  let S = 1, MX = 1;
  const R = (p) => [MX * S * p[0], p[1], S * p[2]];
  const bx = (key, x0, x1, y0, y1, z0, z1) =>
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]].map(R));
  // a flat quad, facing away from `ref`
  const fq = (key, a, b, e, d, ref) => quad(key, R(a), R(b), R(e), R(d), R(ref));
  // a beam from a to b, w wide and h tall (height along `up`)
  function beam(key, a, b, w, h, up = [0, 1, 0]) {
    const d = sub(b, a), s = nrm(cross(d, up)), u = nrm(cross(s, d));
    const P = (o, i, j) => R([0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2));
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // a closed n-sided prism of radius r from a to b
  function prism(key, a, b, r, n = 8) {
    const d = nrm(sub(b, a));
    const t = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u = nrm(cross(d, t)), v = cross(d, u);
    const ring = (o) => Array.from({ length: n }, (_, i) => {
      const q = (2 * Math.PI * (i + 0.5)) / n;
      return R([0, 1, 2].map((k) => o[k] + r * (Math.cos(q) * u[k] + Math.sin(q) * v[k])));
    });
    const A = ring(a), B = ring(b), ref = R(a.map((x, k) => (x + b[k]) / 2)), ca = R(a), cb = R(b);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      quad(key, A[i], A[j], B[j], B[i], ref);
      tri(key, ca, A[j], A[i], ref);
      tri(key, cb, B[i], B[j], ref);
    }
  }
  // a torus in the plane normal to `ax` (unit, one of the world axes), centre o
  function torus(key, o, ax, R0, r, n = 16, m = 6) {
    const t = Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u = nrm(cross(ax, t)), v = cross(ax, u);
    const P = (i, j) => {
      const a = (2 * Math.PI * i) / n, b = (2 * Math.PI * j) / m;
      const e = [0, 1, 2].map((k) => Math.cos(a) * u[k] + Math.sin(a) * v[k]);
      return R([0, 1, 2].map((k) => o[k] + e[k] * (R0 + r * Math.cos(b)) + ax[k] * r * Math.sin(b)));
    };
    for (let i = 0; i < n; i++) {
      const core = R([0, 1, 2].map((k) => o[k] + R0 * (Math.cos((2 * Math.PI * (i + 0.5)) / n) * u[k] + Math.sin((2 * Math.PI * (i + 0.5)) / n) * v[k])));
      for (let j = 0; j < m; j++) quad(key, P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1), core);
    }
  }

  // ---------- dimensions ----------
  const RW = 3.0, SW0 = 3.2, SW1 = 5.45, SWY = 0.2, XL = 11; // road half width, sidewalk band, top, road half length
  const DX = 0.85, GY0 = 4.5, FY = 5.0, PT = 0.06, PY = 6.15; // deck half width, girder bottom, floor, panel, panel top
  const SZ0 = 3.9, SZ1 = 5.3; // stair band (z)
  const RISE = (FY - SWY) / 28, TREAD = 0.28;
  const X1 = 1.6, X2 = X1 + 13 * TREAD, X3 = X2 + 1.2, X4 = X3 + 13 * TREAD; // flight 1 top, mid landing, flight 2, foot
  const YM = FY - 14 * RISE; // mid landing
  // the stair route in (x, walking level) for the panels and the slab
  const route = [[-DX, FY], [X1, FY], [X2, YM], [X3, YM], [X4, SWY]];

  // ---------- road, sidewalks, curbs, markings (whole) ----------
  S = 1;
  bx("asphalt", -XL, XL, 0, 0.05, -RW, RW);
  for (const s of [1, -1]) {
    S = s;
    bx("pave", -XL, XL, 0, SWY, SW0, SW1);
    bx("white", -XL, XL, 0, SWY + 0.01, RW, SW0);
  }
  S = 1;
  const MY = 0.052, up = [0, -1, 0];
  const mark = (x0, x1, z0, z1) => fq("marking", [x0, MY, z0], [x1, MY, z0], [x1, MY, z1], [x0, MY, z1], [x0, 0, z0]);
  const CW0 = 5.6, CW1 = 8.6; // the crossing
  for (const z of [-2.8, 2.8]) { mark(-XL, CW0 - 0.5, z - 0.075, z + 0.075); mark(CW1 + 0.5, XL, z - 0.075, z + 0.075); }
  for (let x = -XL + 0.3; x < XL; x += 5) {
    const a = x, b = Math.min(x + 2.5, XL);
    if (b < CW0 - 0.5 || a > CW1 + 0.5) mark(a, b, -0.075, 0.075);
  }
  for (let z = -2.45; z < 2.6; z += 0.9) mark(CW0, CW1, z - 0.225, z + 0.225);
  mark(CW0 - 0.9, CW0 - 0.6, 0.15, 2.75); // stop line before the crossing (traffic on +Z lane runs toward +X)
  mark(CW1 + 0.6, CW1 + 0.9, -2.75, -0.15);
  void up;

  // ---------- guard pipes along both curbs, open at the crossing ----------
  for (const s of [1, -1]) {
    S = s;
    const z = 3.12;
    const runs = s > 0 ? [[-XL + 0.3, CW0 - 0.3], [CW1 + 0.3, XL - 0.3]] : [[-XL + 0.3, -CW1 - 0.3], [-CW0 + 0.3, XL - 0.3]];
    for (const [a, b] of runs) {
      for (const y of [0.62, 0.98]) beam("white", [a, y, z], [b, y, z], 0.06, 0.06);
      const n = Math.max(1, Math.round((b - a) / 2));
      for (let i = 0; i <= n; i++) bx("white", a + ((b - a) * i) / n - 0.035, a + ((b - a) * i) / n + 0.035, SWY, 1.02, z - 0.035, z + 0.035);
    }
  }

  // ---------- the girder and floor (whole) ----------
  S = 1;
  bx("paint", -DX, DX, GY0, FY - 0.02, -SZ1 - PT, SZ1 + PT);
  bx("pave", -DX + PT, DX - PT, FY - 0.03, FY, -SZ1, SZ1);

  // ---------- one half (and its 180 deg turn), written for the +Z stair descending to +X, then mirrored in x ----------
  MX = -1;
  for (const s of [1, -1]) {
    S = s;
    // deck side panel on +X, open where the +Z stair leaves it; cap rail; sign plate facing the traffic
    bx("paint", DX - PT, DX, FY - 0.05, PY, -SZ1 - PT, SZ0);
    beam("paint", [DX - PT / 2, PY + 0.035, -SZ1 - PT], [DX - PT / 2, PY + 0.035, SZ0], 0.12, 0.07);
    fq("line", [DX + 0.003, PY - 0.07, -SZ1 - PT], [DX + 0.003, PY - 0.07, SZ0], [DX + 0.003, PY - 0.035, SZ0], [DX + 0.003, PY - 0.035, -SZ1 - PT], [0, PY, 0]);
    fq("line", [DX + 0.003, GY0 + 0.08, -SZ1 - PT], [DX + 0.003, GY0 + 0.08, SZ0], [DX + 0.003, GY0 + 0.11, SZ0], [DX + 0.003, GY0 + 0.11, -SZ1 - PT], [0, PY, 0]);
    for (let z = -4.2; z < SZ0 - 0.3; z += 1.4) {
      if (Math.abs(z) < 1.4) continue; // the sign
      fq("line", [DX + 0.003, FY, z - 0.015], [DX + 0.003, FY, z + 0.015], [DX + 0.003, PY - 0.07, z + 0.015], [DX + 0.003, PY - 0.07, z - 0.015], [0, PY, z]);
    }
    bx("white", DX, DX + 0.025, 5.1, 5.95, -1.3, 1.3);
    bx("dark", DX + 0.02, DX + 0.04, 5.16, 5.89, -1.23, 1.23);
    // piers: a portal under the deck end, columns under the stair's top and mid landings
    for (const x of [-0.5, 0.5]) bx("paint", x - 0.16, x + 0.16, SWY, GY0, 3.29, 3.61);
    bx("paint", -DX, DX, GY0 - 0.35, GY0, 3.25, 3.65);
    bx("paint", 1.08, 1.38, SWY, GY0, 4.45, 4.75);
    bx("paint", (X2 + X3) / 2 - 0.15, (X2 + X3) / 2 + 0.15, SWY, YM - 0.4, 4.45, 4.75);

    // stair: step blocks, landings, the stringer slab
    for (const [xs, ys] of [[X1, FY], [X3, YM]])
      for (let k = 0; k < 13; k++) {
        const yt = ys - (k + 1) * RISE;
        bx("pave", xs + k * TREAD, xs + (k + 1) * TREAD + 0.002, yt - 0.3, yt, SZ0, SZ1);
        fq("line", [xs + k * TREAD, yt + 0.003, SZ0], [xs + k * TREAD + 0.04, yt + 0.003, SZ0], [xs + k * TREAD + 0.04, yt + 0.003, SZ1], [xs + k * TREAD, yt + 0.003, SZ1], [xs + k * TREAD, 0, SZ0]);
      }
    bx("pave", DX - 0.01, X1, FY - 0.03, FY, SZ0, SZ1);
    bx("pave", X2, X3, YM - 0.3, YM, SZ0, SZ1);
    bx("paint", DX, X1, GY0, FY - 0.03, SZ0, SZ1);
    bx("paint", X2 - 0.05, X3 + 0.05, YM - 0.42, YM - 0.29, SZ0, SZ1);
    const slab = (a, b) => {
      const lo = (y) => Math.max(SWY, y - 0.48), hi = (y) => Math.max(SWY + 0.04, y - 0.22);
      hex("paint", [[a[0], lo(a[1]), SZ0], [b[0], lo(b[1]), SZ0], [b[0], lo(b[1]), SZ1], [a[0], lo(a[1]), SZ1],
        [a[0], hi(a[1]), SZ0], [b[0], hi(b[1]), SZ0], [b[0], hi(b[1]), SZ1], [a[0], hi(a[1]), SZ1]].map(R));
    };
    slab([X1, FY], [X2, YM]);
    slab([X3, YM], [X4, SWY]);

    // stair side panels, one hex per leg of the route, cap rail and dark bands on their outer faces
    const sides = [[SZ0 - PT, SZ0, -1], [SZ1, SZ1 + PT, 1]];
    for (const [z0, z1, o] of sides) {
      const legs = route.slice(o < 0 ? 1 : 0);
      for (let i = 0; i + 1 < legs.length; i++) {
        const [xa, ya] = legs[i], [xb, yb] = legs[i + 1];
        const ba = Math.max(SWY, ya - 0.5), bb = Math.max(SWY, yb - 0.5), H = PY - FY;
        const xa0 = o < 0 && i === 0 ? DX - PT : xa;
        hex("paint", [[xa0, ba, z0], [xb, bb, z0], [xb, bb, z1], [xa0, ba, z1], [xa0, ya + H, z0], [xb, yb + H, z0], [xb, yb + H, z1], [xa0, ya + H, z1]].map(R));
        const zc = (z0 + z1) / 2;
        beam("paint", [xa0 - 0.03, ya + H + 0.035, zc], [xb + 0.03, yb + H + 0.035, zc], 0.12, 0.07);
        const zf = o > 0 ? z1 + 0.003 : z0 - 0.003, ref = [xa, ya, zc];
        fq("line", [xa0, ya + H - 0.07, zf], [xb, yb + H - 0.07, zf], [xb, yb + H - 0.035, zf], [xa0, ya + H - 0.035, zf], ref);
        // panel joints every ~1.4 m along the leg
        const L = xb - xa0, nj = Math.floor(L / 1.4);
        for (let j = 1; j <= nj; j++) {
          const x = xa0 + (L * j) / (nj + 1), y = ya + ((yb - ya) * (x - xa0)) / L;
          fq("line", [x - 0.015, Math.max(SWY, y - 0.5), zf], [x + 0.015, Math.max(SWY, y - 0.5), zf], [x + 0.015, y + H - 0.07, zf], [x - 0.015, y + H - 0.07, zf], ref);
        }
      }
      // the panel's end at the foot
      const [xe, ye] = route[route.length - 1];
      bx("paint", xe - 0.02, xe + 0.06, SWY, ye + PY - FY, z0, z1);
    }

    // street light: pole by the curb in front of the stair, arm over the road
    const LX = 3.4, LZ = 3.38, LT = 7.0;
    prism("white", [LX, SWY, LZ], [LX, LT - 0.25, LZ], 0.09, 8);
    beam("white", [LX, LT - 0.3, LZ], [LX, LT - 0.06, LZ - 0.9], 0.08, 0.08, [1, 0, 0]);
    beam("white", [LX, LT - 0.06, LZ - 0.9], [LX, LT - 0.04, LZ - 2.1], 0.08, 0.08, [1, 0, 0]);
    bx("dark", LX - 0.17, LX + 0.17, LT - 0.2, LT + 0.08, LZ - 2.75, LZ - 1.95);
    bx("lamp", LX - 0.13, LX + 0.13, LT - 0.25, LT - 0.19, LZ - 2.7, LZ - 2.0);
  }
  S = 1; MX = 1;

  // ---------- convex traffic mirror on the +Z sidewalk, turned to the front-left ----------
  {
    const px = 2.6, pz = 3.4, my = 2.9, yaw = (55 * Math.PI) / 180;
    const f = [Math.sin(yaw), -0.08, Math.cos(yaw)];
    prism("red", [px, SWY, pz], [px, my + 0.15, pz], 0.045, 8);
    const ctr = [px + f[0] * 0.12, my, pz + f[2] * 0.12];
    beam("red", [px, my, pz], ctr, 0.08, 0.08);
    prism("red", ctr, [ctr[0] + f[0] * 0.1, ctr[1] + f[1] * 0.1, ctr[2] + f[2] * 0.1], 0.43, 16);
    const g = [ctr[0] + f[0] * 0.105, ctr[1] + f[1] * 0.105, ctr[2] + f[2] * 0.105];
    const u = nrm(cross(f, [0, 1, 0])), v = cross(u, f);
    for (let i = 0; i < 16; i++) {
      const a0 = (2 * Math.PI * i) / 16, a1 = (2 * Math.PI * (i + 1)) / 16, r = 0.36;
      const P = (a) => [0, 1, 2].map((k) => g[k] + r * (Math.cos(a) * u[k] + Math.sin(a) * v[k]));
      tri("glass", g, P(a0), P(a1), ctr);
    }
  }

  // ---------- mamachari by the +Z stair foot, facing +Z ----------
  {
    const bxp = 10.6, bz = -4.3, W = 0.33, hy = SWY + W;
    const B = (y, z) => [bxp, y, bz + z]; // bike plane
    torus("dark", B(hy, -0.55), [1, 0, 0], W - 0.02, 0.03, 18, 5);
    torus("dark", B(hy, 0.55), [1, 0, 0], W - 0.02, 0.03, 18, 5);
    const T = 0.032;
    const tube = (a, b) => prism("red", a, b, T, 6);
    const bb = B(SWY + 0.28, -0.05), seat = B(SWY + 0.86, -0.27), headT = B(SWY + 0.92, 0.36), headB = B(SWY + 0.66, 0.43);
    tube(headB, B(SWY + 0.36, 0.12)); tube(B(SWY + 0.36, 0.12), bb); // the low step-through down tube
    tube(bb, seat); tube(bb, B(hy, -0.55)); tube(B(SWY + 0.74, -0.24), B(hy, -0.55));
    tube(headB, headT); tube(headB, B(hy, 0.55));
    tube(headT, B(SWY + 1.05, 0.3));
    prism("red", [bxp - 0.28, SWY + 1.05, bz + 0.22], [bxp + 0.28, SWY + 1.05, bz + 0.22], 0.022, 6);
    bx("dark", bxp - 0.09, bxp + 0.09, SWY + 0.86, SWY + 0.93, bz - 0.4, bz - 0.15); // saddle
    bx("dark", bxp - 0.17, bxp + 0.17, SWY + 0.78, SWY + 1.0, bz + 0.5, bz + 0.82); // front basket
    bx("red", bxp - 0.12, bxp + 0.12, SWY + 0.7, SWY + 0.73, bz - 0.85, bz - 0.3); // rear carrier
    bx("red", bxp - 0.13, bxp + 0.13, SWY + 0.68, SWY + 0.7, bz + 0.3, bz + 0.85); // front mudguard (flat)
  }

  // ---------- meshes ----------
  const lampLit = lights;
  const MAT = {
    paint: [c.paint, c.paintShade, 0.1, true],
    pave: [c.pave, c.paveShade, 0.1, true],
    white: [c.white, c.whiteShade, 0.1, true],
    asphalt: [c.asphalt, c.asphaltShade, 0.1, true],
    marking: [c.marking, c.marking, -1, false],
    line: [c.line, c.line, -1, false],
    dark: [c.dark, c.darkShade, 0.1, true],
    red: [c.red, c.redShade, 0.1, true],
    glass: [c.glass, c.glass, -1, false],
    lamp: lampLit ? [c.lamp, c.lamp, -1, true] : [c.dark, c.darkShade, 0.1, true],
  };
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, { threshold, outline });
    mesh.name = key;
    set.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
