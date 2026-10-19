// hinomi-yagura.js - a small-town fire watchtower (hinomi-yagura) with its fire-brigade shed, a strip of road and a
// utility pole: a countryside set piece. One clip, `bell`, swings the alarm bell.
// Contract: harness/lab/README.md. Meters, +Y up, the road side faces +Z, its left is +X; stands on y = 0, centred on
// its bbox in x and z.
//
// Construction (boxes, beams and lathes, all triangle soups merged per material; beams are flat-shaded, lathes carry
// radial normals so the bell, horn, pole and wheels read round):
//   TOWER    four steel angle legs on concrete footings, tapering from a 2.1 m square at the foot to 1.1 m at the
//            platform (7.2 m). Horizontal ties at five levels and one X-brace per panel and face: 4 panels, so 32
//            diagonals in all. The count is held there on purpose: at 480x300 a member is ~1.5 px plus a 1 px hull, and
//            more panels close up into ink. The two diagonals of an X sit 2 cm apart out of the face, never coplanar.
//   LADDER   a straight steel ladder up the +Z face, 0.3 m out of the face plane and leaning with it, rungs every
//            0.3 m, standoffs at every tie level; its rails run up through the deck hatch to the hand rail.
//   TOP      a square deck (1.9 m) with a two-rail railing; four corner posts carry a low pointed (pyramid) roof with a
//            fascia band, a closed soffit and a finial. A tie beam under the roof holds the hanshō.
//   BELL     the hanshō: a closed lathe (crown dome, straight flared barrel, thick lip, recessed mouth), a hanging loop
//            and two dark bands. It hangs from a pivot under the roof; its two meshes (bell, bellLine) are rewritten
//            by pose() each frame (positions, normals and hull normals rotated about the pivot's X axis), so the swing
//            costs no extra draw calls.
//   SIREN    a trumpet speaker horn (lathe, recessed mouth) on a bracket at the +X-Z roof post, aimed out and down,
//            so it stays clear of the bell in the hero view.
//   SHED     a small pale fire-brigade shed with a mono-pitch corrugated roof (ribs), a red roll-up shutter (slat lines,
//            a shutter box over it) on the road face and a small red lamp on a bracket.
//   CART     a red hand-pump cart: body box, two spoked wheels, a brass pump dome, a see-saw pump beam with two cross
//            handles, pull shafts with a crossbar.
//   RACK     a hose drying rack: two posts and two bars, four white hoses folded over the top bar, hanging to
//            different lengths, brass couplings on the ends.
//   STREET   a plain red hydrant box on legs (no lettering, by rule), a yard pad, a concrete curb, the road with a
//            dashed centre line, and a concrete utility pole with a crossarm and two insulators.
// Proportions (real size; base unit the platform height P = 7.2 m): footing 0.2; legs to P; ties at 0.3, 1.85, 3.6,
//   5.4, P; railing 7.6 / 8.0; roof posts to 8.92, eave 8.95 (2.36 m square, 37 deg pitch), apex 9.85, finial top 9.98
//   (1.39 P). Bell 0.6 tall, 0.45 across the lip (1/17 of the height), pivot 8.77, mouth 8.07.
//   Layout (set coordinates, then shifted -1.3 m in z to centre the bbox): tower axis (-1.2, -0.9); shed x 1.0-4.2,
//   z -2.0-0.6; cart at (0.45, 1.35); rack x -5.0 to -3.5 at z 0.5; hydrant (4.85, 1.55); pole (-5.9, 1.85); curb
//   z 2.25-2.4; road to z 5.6; the strip runs x -6.4 to 6.7. Shed 3.2 x 2.6, eaves 2.9 / 2.55; shutter 2.2 x 2.1.
//   Cart wheels 0.88; rack 3.6 tall; hydrant box 0.55 x 0.9 on 0.5 m legs; curb 0.15; road 3.2 wide; pole 9.0.
// Options: build(THREE, kit, colors, { height }): height scales the whole set uniformly so the finial top is `height`
//   (default 9.98).
// Clips (build() returns clips { name: seconds }; pose("bell@0.5")): bell (2 s loop) swings the bell +-22 deg about
//   its pivot's X axis (a sine, so the loop closes). Joint: bell (the pivot), rotation.x is the swing angle; +rx swings
//   the mouth toward -Z.
// Budget: 4.26k triangles (steel 2.2k), 12 meshes.
// Colours (meadow: pale sky, a red accent for the fire-brigade pieces): steel (legs, ties, braces, ladder, railing,
//   rack, wheels, shafts) hair #2c5131 flat with a 1.5 px hull, so members read as dark lines; red (tower roof, shutter,
//   cart, hydrant, lamp) accent #d9483b / hair, threshold 0.1 so road-facing faces stay red; slat and door lines hair;
//   bell and brass practical #f2c94c / iris #3f8a47 (patina bronze); horn and hoses sclera #f6f3ee / sky #d7ecef;
//   concrete (footings, shed walls, curb, pole) moon #f7f3e1 / sky; shed roof iris / hair with hair ribs; yard line
//   #a9d16e / iris; road sky flat, centre line practical.

export const meta = {
  name: "hinomi-yagura",
  height: 9.98,
  script: "meadow",
  colors: {
    steel: "#2c5131", steelShade: "#2c5131",
    red: "#d9483b", redShade: "#2c5131",
    line: "#2c5131",
    brass: "#f2c94c", brassShade: "#3f8a47",
    white: "#f6f3ee", whiteShade: "#d7ecef",
    concrete: "#f7f3e1", concreteShade: "#d7ecef",
    roof: "#3f8a47", roofShade: "#2c5131",
    grass: "#a9d16e", grassShade: "#3f8a47",
    road: "#d7ecef", roadShade: "#d7ecef",
    paint: "#f2c94c",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height } = opts;
  const root = new THREE.Group();
  root.name = "hinomi-yagura";
  const set = new THREE.Group(); // uniform scale lives here, so root stays the plain contract node
  set.name = "set";
  set.scale.setScalar(height / meta.height);
  set.position.z = -1.3 * (height / meta.height); // the road strip pushes the bbox to +Z: centre it
  root.add(set);
  const joints = {};

  // ---------- triangle soups: { p, n } per material ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  // a triangle wound so its face normal agrees with `out`; vertex normals na/nb/ne (default: the face normal)
  function triN(key, a, b, e, out, na, nb, ne) {
    const f = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...f) < 1e-9) return;
    const s = S(key), fn = nrm(f);
    if (dot(f, out) < 0) {
      s.p.push(...a, ...e, ...b);
      s.n.push(...(na ?? mul(fn, -1)), ...(ne ?? mul(fn, -1)), ...(nb ?? mul(fn, -1)));
    } else {
      s.p.push(...a, ...b, ...e);
      s.n.push(...(na ?? fn), ...(nb ?? fn), ...(ne ?? fn));
    }
  }
  // flat triangle wound away from `ref` (a point inside the solid)
  const tri = (key, a, b, e, ref) => triN(key, a, b, e, sub([(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3], ref));
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
  // a beam from a to b, w wide (across, perpendicular to `up`) and h deep (along `up`)
  function beam(key, a, b, w, h, up = [0, 1, 0]) {
    const d = sub(b, a);
    let s = cross(d, up);
    if (Math.hypot(...s) < 1e-6) s = cross(d, [1, 0, 0]);
    s = nrm(s);
    const u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // lathe around axis `ax` through `o`: profile [[r, s], ...] from the +s end to the -s end (solid on the inside), so
  // each segment's outward normal is (-ds, dr). Radial normals around, one normal per profile segment.
  function lathe(key, o, ax, prof, seg = 12) {
    const a = nrm(ax);
    const u = nrm(Math.abs(a[1]) < 0.9 ? cross(a, [0, 1, 0]) : cross(a, [1, 0, 0])), v = cross(a, u);
    const rad = (t) => add(mul(u, Math.cos(t)), mul(v, Math.sin(t)));
    for (let k = 0; k + 1 < prof.length; k++) {
      const [r0, s0] = prof[k], [r1, s1] = prof[k + 1];
      const nr = -(s1 - s0), ns = r1 - r0, l = Math.hypot(nr, ns) || 1;
      for (let i = 0; i < seg; i++) {
        const t0 = (i / seg) * Math.PI * 2, t1 = ((i + 1) / seg) * Math.PI * 2;
        const P = (r, s, t) => add(o, add(mul(a, s), mul(rad(t), r)));
        const N = (t) => nrm(add(mul(rad(t), nr / l), mul(a, ns / l)));
        const A = P(r0, s0, t0), B = P(r0, s0, t1), C = P(r1, s1, t1), D = P(r1, s1, t0);
        const tm = (t0 + t1) / 2, out = N(tm);
        triN(key, A, B, C, out, N(t0), N(t1), N(t1));
        triN(key, A, C, D, out, N(t0), N(t1), N(t0));
      }
    }
  }
  const cyl = (key, o, ax, r, len, seg = 10) => lathe(key, o, ax, [[0, len], [r, len], [r, 0], [0, 0]], seg);

  // ---------- layout ----------
  const TX = -1.2, TZ = -0.9; // tower axis
  const P = 7.2; // platform
  const HW0 = 1.05, HW1 = 0.55;
  const hw = (y) => HW0 + (HW1 - HW0) * (y / P);
  const corner = (y, sx, sz) => [TX + sx * hw(y), y, TZ + sz * hw(y)];
  const CORNERS = [[1, 1], [-1, 1], [-1, -1], [1, -1]]; // walked around: faces +Z, -X, -Z, +X between them

  // ---------- tower ----------
  for (const [sx, sz] of CORNERS) {
    const f = corner(0, sx, sz);
    box("concrete", f[0], 0.1, f[2], 0.4, 0.2, 0.4);
    beam("steel", corner(0.2, sx, sz), corner(P, sx, sz), 0.11, 0.11, [sx, 0, -sz]);
  }
  const LEVELS = [0.3, 1.85, 3.6, 5.4, P];
  for (let k = 0; k < 4; k++) {
    const [ax, az] = CORNERS[k], [bx, bz] = CORNERS[(k + 1) % 4];
    const out = nrm([ax + bx, 0.07, az + bz]); // face normal (tilted with the taper)
    for (const y of LEVELS) beam("steel", corner(y, ax, az), corner(y, bx, bz), 0.075, 0.05, out);
    for (let j = 0; j + 1 < LEVELS.length; j++) {
      const y0 = LEVELS[j], y1 = LEVELS[j + 1];
      const lift = (p, d) => add(p, mul(out, d));
      beam("steel", lift(corner(y0, ax, az), 0.0), lift(corner(y1, bx, bz), 0.0), 0.05, 0.02, out);
      beam("steel", lift(corner(y0, bx, bz), 0.02), lift(corner(y1, ax, az), 0.02), 0.05, 0.02, out);
    }
  }

  // ladder on the +Z face, 0.3 m out of it, leaning with it
  const LZ = (y) => TZ + hw(y) + 0.3;
  const LTOP = 8.0;
  for (const sx of [-1, 1]) {
    beam("steel", [TX + sx * 0.22, 0.02, LZ(0.02)], [TX + sx * 0.22, LTOP, LZ(LTOP)], 0.055, 0.055, [0, 0, 1]);
    for (const y of LEVELS.slice(1)) beam("steel", [TX + sx * 0.22, y, LZ(y)], [TX + sx * 0.22, y, TZ + hw(y)], 0.04, 0.04);
  }
  for (let y = 0.3; y < P - 0.05; y += 0.3) beam("steel", [TX - 0.22, y, LZ(y)], [TX + 0.22, y, LZ(y)], 0.035, 0.035);

  // deck, railing, roof posts
  const DH = 0.95, RP = 0.88;
  box("steel", TX, P + 0.04, TZ, DH * 2, 0.08, DH * 2);
  const railPts = [];
  for (const [sx, sz] of CORNERS) railPts.push([sx * RP, sz * RP]);
  for (let k = 0; k < 4; k++) {
    const [ax, az] = railPts[k], [bx, bz] = railPts[(k + 1) % 4];
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    beam("steel", [TX + mx, P + 0.08, TZ + mz], [TX + mx, 8.0, TZ + mz], 0.05, 0.05);
    for (const y of [7.6, 8.0]) beam("steel", [TX + ax, y, TZ + az], [TX + bx, y, TZ + bz], 0.06, 0.05);
    beam("steel", [TX + ax, 8.81, TZ + az], [TX + bx, 8.81, TZ + bz], 0.08, 0.08); // eave beam
  }
  for (const [ax, az] of railPts) beam("steel", [TX + ax, P + 0.08, TZ + az], [TX + ax, 8.92, TZ + az], 0.08, 0.08);
  beam("steel", [TX - RP, 8.8, TZ], [TX + RP, 8.8, TZ], 0.07, 0.07); // bell tie beam

  // pointed roof: pyramid with fascia and closed soffit
  {
    const E = 8.95, R = 1.18, A = 9.85, F = 0.1;
    const apex = [TX, A, TZ], low = [TX, E - F - 0.005, TZ], ref = [TX, E - 0.02, TZ];
    const pts = CORNERS.map(([sx, sz]) => [TX + sx * R, E, TZ + sz * R]);
    for (let k = 0; k < 4; k++) {
      const a = pts[k], b = pts[(k + 1) % 4];
      const ad = [a[0], a[1] - F, a[2]], bd = [b[0], b[1] - F, b[2]];
      tri("red", a, b, apex, ref);
      quad("red", a, b, bd, ad, ref);
      tri("red", ad, bd, low, ref);
    }
    // finial
    lathe("red", [TX, A - 0.02, TZ], [0, 1, 0], [[0, 0.15], [0.03, 0.12], [0.05, 0.06], [0.03, 0], [0, -0.01]], 8);
  }

  // siren horn on a bracket at the +X-Z post, aimed out and a little down (clear of the bell in the hero view)
  {
    const post = [TX + RP, 8.55, TZ - RP];
    const dir = nrm([1, -0.3, -0.3]);
    const base = add(post, mul(dir, 0.12));
    beam("steel", post, base, 0.05, 0.05);
    lathe("white", base, dir, [[0, 0.32], [0.2, 0.62], [0.235, 0.62], [0.235, 0.6], [0.06, 0.24], [0.05, 0.18], [0.085, 0.16], [0.085, 0], [0, 0]], 12);
  }

  // ---------- bell (moving) ----------
  const BP = [TX, 8.77, TZ]; // pivot
  const bellOwner = new Set(["bell", "bellLine"]);
  {
    const top = 8.67;
    beam("bellLine", [TX, BP[1] + 0.03, TZ], [TX, top + 0.04, TZ], 0.035, 0.035); // hanger
    box("bell", TX, top + 0.025, TZ, 0.04, 0.07, 0.13); // crown loop (ryuzu)
    lathe("bell", [TX, top, TZ], [0, 1, 0],
      [[0, 0], [0.09, -0.01], [0.14, -0.04], [0.165, -0.09], [0.172, -0.16], [0.18, -0.44], [0.2, -0.53], [0.225, -0.6], [0.18, -0.6], [0, -0.53]], 14);
    for (const [y, r] of [[-0.2, 0.174], [-0.42, 0.18]])
      lathe("bellLine", [TX, top + y, TZ], [0, 1, 0], [[0, 0.018], [r + 0.008, 0.018], [r + 0.008, -0.018], [0, -0.018]], 14);
  }

  // ---------- shed ----------
  const SX0 = 1.0, SX1 = 4.2, SZ0 = -2.0, SZ1 = 0.6;
  const HF = 2.85, HB = 2.5;
  hex("concrete", [[SX0, 0, SZ0], [SX1, 0, SZ0], [SX1, 0, SZ1], [SX0, 0, SZ1], [SX0, HB, SZ0], [SX1, HB, SZ0], [SX1, HF, SZ1], [SX0, HF, SZ1]]);
  {
    const o = 0.25, t = 0.08, z0 = SZ0 - o, z1 = SZ1 + o;
    const slope = (HF - HB) / (SZ1 - SZ0), y = (z) => HB + (z - SZ0) * slope + 0.02;
    const x0 = SX0 - o, x1 = SX1 + o;
    hex("roof", [[x0, y(z0), z0], [x1, y(z0), z0], [x1, y(z1), z1], [x0, y(z1), z1], [x0, y(z0) + t, z0], [x1, y(z0) + t, z0], [x1, y(z1) + t, z1], [x0, y(z1) + t, z1]]);
    for (let x = x0 + 0.2; x < x1 - 0.1; x += 0.25) beam("line", [x, y(z0) + t + 0.012, z0 + 0.02], [x, y(z1) + t + 0.012, z1 - 0.02], 0.03, 0.02);
    // shutter: frame, box, door, slats
    const DX = (SX0 + SX1) / 2, DW = 2.2, DHt = 2.1, f = SZ1;
    box("steel", DX, DHt / 2 + 0.05, f + 0.02, DW + 0.16, DHt + 0.1, 0.04);
    box("red", DX, DHt / 2, f + 0.05, DW, DHt, 0.04);
    box("red", DX, DHt + 0.2, f + 0.12, DW + 0.2, 0.3, 0.24);
    for (let yy = 0.12; yy < DHt - 0.04; yy += 0.12) box("line", DX, yy, f + 0.075, DW - 0.04, 0.018, 0.01);
    box("line", DX, 0.03, f + 0.08, DW * 0.35, 0.03, 0.02); // bottom bar
    // red lamp on a bracket at the +X corner
    beam("steel", [SX1 - 0.25, 2.55, f], [SX1 - 0.25, 2.55, f + 0.3], 0.04, 0.04);
    lathe("red", [SX1 - 0.25, 2.47, f + 0.3], [0, 1, 0], [[0, 0.2], [0.07, 0.17], [0.1, 0.1], [0.08, 0.02], [0, 0]], 10);
  }

  // ---------- hand-pump cart ----------
  {
    const CX = 0.45, CZ = 1.35, WR = 0.44;
    box("red", CX, 0.72, CZ, 1.1, 0.42, 0.52);
    box("red", CX, 0.96, CZ, 1.16, 0.06, 0.58);
    for (const sz of [-1, 1]) {
      const o = [CX, WR, CZ + sz * 0.34];
      lathe("steel", o, [0, 0, sz], [[WR - 0.06, 0.03], [WR, 0.03], [WR, -0.03], [WR - 0.06, -0.03], [WR - 0.06, 0.03]], 18);
      cyl("steel", add(o, [0, 0, -sz * 0.05]), [0, 0, sz], 0.07, 0.12, 8);
      for (let i = 0; i < 6; i++) {
        const t = (i / 6) * Math.PI * 2;
        beam("steel", o, add(o, [Math.cos(t) * (WR - 0.04), Math.sin(t) * (WR - 0.04), 0]), 0.035, 0.03, [0, 0, 1]);
      }
    }
    cyl("steel", [CX, WR, CZ - 0.42], [0, 0, 1], 0.03, 0.84, 6); // axle
    lathe("brass", [CX, 0.99, CZ], [0, 1, 0], [[0, 0.62], [0.06, 0.6], [0.11, 0.5], [0.12, 0.3], [0.12, 0], [0, 0]], 12);
    // see-saw pump beam along X with cross handles at its ends
    beam("steel", [CX, 0.99, CZ], [CX, 1.42, CZ], 0.06, 0.06);
    beam("steel", [CX - 0.85, 1.32, CZ], [CX + 0.85, 1.5, CZ], 0.06, 0.06, [0, 0, 1]);
    for (const [x, y] of [[CX - 0.85, 1.32], [CX + 0.85, 1.5]]) beam("steel", [x, y, CZ - 0.38], [x, y, CZ + 0.38], 0.05, 0.05);
    // pull shafts toward +X and a crossbar
    for (const sz of [-1, 1]) beam("steel", [CX + 0.5, 0.7, CZ + sz * 0.22], [CX + 1.35, 0.62, CZ + sz * 0.26], 0.045, 0.045);
    beam("steel", [CX + 1.35, 0.62, CZ - 0.3], [CX + 1.35, 0.62, CZ + 0.3], 0.05, 0.05);
    beam("steel", [CX - 0.5, 0.55, CZ], [CX - 0.75, 0.03, CZ], 0.05, 0.05); // rest leg
  }

  // ---------- hose drying rack ----------
  {
    const X0 = -5.0, X1 = -3.5, RZ = 0.5, H = 3.6;
    for (const x of [X0, X1]) {
      box("concrete", x, 0.08, RZ, 0.28, 0.16, 0.28);
      beam("steel", [x, 0.16, RZ], [x, H, RZ], 0.09, 0.09);
    }
    beam("steel", [X0 - 0.15, H - 0.05, RZ], [X1 + 0.15, H - 0.05, RZ], 0.08, 0.08);
    beam("steel", [X0, 1.2, RZ], [X1, 1.2, RZ], 0.06, 0.06);
    const T = H; // top of the bar
    const hoses = [[-4.78, 0.55, 0.9], [-4.43, 0.75, 0.45], [-4.08, 0.4, 0.7], [-3.73, 0.85, 0.5]];
    for (const [x, front, back] of hoses) {
      const zf = RZ + 0.065, zb = RZ - 0.065;
      box("white", x, T + 0.01, RZ, 0.12, 0.03, 0.16); // over the bar
      box("white", x, (T + front) / 2, zf, 0.12, T - front, 0.025);
      box("white", x, (T + back) / 2, zb, 0.12, T - back, 0.025);
      for (const [z, y] of [[zf, front], [zb, back]]) cyl("brass", [x, y + 0.02, z], [0, -1, 0], 0.05, 0.1, 8);
    }
  }

  // ---------- street ----------
  // hydrant box on legs (plain red, no lettering)
  {
    const HX = 4.85, HZ = 1.55;
    for (const sx of [-1, 1]) beam("steel", [HX + sx * 0.2, 0, HZ], [HX + sx * 0.2, 0.55, HZ], 0.05, 0.05);
    box("red", HX, 0.98, HZ, 0.55, 0.9, 0.26);
    box("red", HX, 1.46, HZ + 0.01, 0.62, 0.06, 0.32); // cap
    box("line", HX, 0.98, HZ + 0.132, 0.44, 0.012, 0.004);
    box("line", HX, 0.55 + 0.03 + 0.0, HZ + 0.132, 0.44, 0.012, 0.004);
    for (const sx of [-1, 1]) box("line", HX + sx * 0.22, 0.98, HZ + 0.132, 0.012, 0.78, 0.004);
    box("line", HX + 0.16, 0.98, HZ + 0.136, 0.025, 0.1, 0.008); // handle
  }
  // yard, curb, road
  const RX0 = -6.4, RX1 = 6.7, CZ0 = 2.25, CZ1 = 2.4, RZ1 = 5.6;
  box("grass", (RX0 + RX1) / 2, 0.01, (-3.0 + CZ0) / 2, RX1 - RX0, 0.02, CZ0 + 3.0);
  box("concrete", (RX0 + RX1) / 2, 0.075, (CZ0 + CZ1) / 2, RX1 - RX0, 0.15, CZ1 - CZ0);
  box("road", (RX0 + RX1) / 2, 0.015, (CZ1 + RZ1) / 2, RX1 - RX0, 0.03, RZ1 - CZ1);
  for (let x = RX0 + 0.5; x < RX1 - 1.2; x += 2.0) box("paint", x + 0.6, 0.033, RZ1 - 1.0, 1.2, 0.006, 0.12);
  // utility pole with a crossarm and insulators
  {
    const PX = -5.9, PZ = 1.85, PH = 9.0;
    lathe("concrete", [PX, 0, PZ], [0, 1, 0], [[0, PH + 0.05], [0.07, PH + 0.03], [0.1, PH], [0.17, 0], [0, 0]], 12);
    beam("steel", [PX, PH - 0.45, PZ - 0.9], [PX, PH - 0.45, PZ + 0.9], 0.09, 0.09);
    for (const z of [-0.7, 0.7]) lathe("white", [PX, PH - 0.4, PZ + z], [0, 1, 0], [[0, 0.16], [0.05, 0.14], [0.06, 0.06], [0.04, 0], [0, 0]], 8);
    for (let y = 2.4; y < PH - 1.0; y += 0.45) {
      const s = Math.round((y - 2.4) / 0.45) % 2 ? 1 : -1;
      beam("steel", [PX, y, PZ], [PX + s * 0.32, y, PZ], 0.025, 0.025);
    }
  }

  // ---------- meshes ----------
  const MAT = {
    steel: [c.steel, c.steelShade, 0.1, 1.5],
    red: [c.red, c.redShade, 0.1, 2.5],
    line: [c.line, c.line, 0.1, 0],
    brass: [c.brass, c.brassShade, 0.2, 2],
    bell: [c.brass, c.brassShade, 0.2, 2],
    bellLine: [c.line, c.line, 0.1, 0],
    white: [c.white, c.whiteShade, 0.1, 2],
    concrete: [c.concrete, c.concreteShade, 0.1, 2.5],
    roof: [c.roof, c.roofShade, 0.1, 2.5],
    grass: [c.grass, c.grassShade, 0.1, 2],
    road: [c.road, c.roadShade, 0.1, 2],
    paint: [c.paint, c.paint, 0.1, 0],
  };
  const moving = [];
  for (const [key, { p, n }] of Object.entries(soups)) {
    const [b, s, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, b, s, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    if (bellOwner.has(key)) {
      kit.hullNormals(g);
      const hn = g.attributes.hullNormal;
      moving.push({ g, p: Float32Array.from(p), n: Float32Array.from(n), h: hn ? Float32Array.from(hn.array) : null });
    }
    set.add(mesh);
  }
  const bell = new THREE.Group();
  bell.name = "bell";
  bell.position.set(...BP);
  set.add(bell);
  joints.bell = bell;

  // rewrite the bell meshes: rotate about the pivot's X axis by bell.rotation.x
  function swing() {
    const a = bell.rotation.x, co = Math.cos(a), si = Math.sin(a);
    for (const m of moving) {
      const P3 = m.g.attributes.position.array, N3 = m.g.attributes.normal.array, H = m.g.attributes.hullNormal?.array;
      for (let i = 0; i < m.p.length; i += 3) {
        const dy = m.p[i + 1] - BP[1], dz = m.p[i + 2] - BP[2];
        P3[i] = m.p[i];
        P3[i + 1] = BP[1] + dy * co - dz * si;
        P3[i + 2] = BP[2] + dy * si + dz * co;
        const rot = (src, dst) => { const y = src[i + 1], z = src[i + 2]; dst[i] = src[i], dst[i + 1] = y * co - z * si, dst[i + 2] = y * si + z * co; };
        rot(m.n, N3);
        if (H && m.h) rot(m.h, H);
      }
      m.g.attributes.position.needsUpdate = m.g.attributes.normal.needsUpdate = true;
      if (H) m.g.attributes.hullNormal.needsUpdate = true;
      m.g.computeBoundingSphere(), m.g.computeBoundingBox();
    }
  }

  // ---------- poses and clips ----------
  const CLIPS = { bell: 2 };
  function apply(a) {
    bell.rotation.set(a, 0, 0);
    swing();
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`hinomi-yagura: no clip "${m[1]}" (clips: bell)`);
      const u = (((+m[2] / CLIPS.bell) % 1) + 1) % 1;
      return apply(0.38 * Math.sin(u * Math.PI * 2));
    }
    if (name !== "rest") throw new Error(`hinomi-yagura: unknown pose "${name}" (rest, or bell@<seconds>)`);
    apply(0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
