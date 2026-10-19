// yokocho.js - a narrow night drinking alley (yokocho): two rows of tiny izakaya fronts facing each other, a set piece.
// Contract: harness/lab/README.md. Meters, +Y up, the alley runs along z with its open mouth facing +Z (a film camera
// stands at the mouth and looks down -Z), its left is +X, stands on y = 0, centred on x = 0, z = 0.
//
// Construction (boxes, beams, flat quads, swept tubes and fans; triangle soups merged per material, flat-shaded so
// planes read crisp; every closed part is wound from a point inside it, never by hand):
//   ROWS     one shop per ~2 m bay on each side (round(length / 2) bays), facades at x = +-1.25. Each bay is a body box
//            to its own height (a literal table, so the roofline steps), with a stepped top lip. The bay's look comes
//            from index tables (door side, sign kind, noren colour, lantern count, window lit or dark), not chance.
//   GROUND   dark posts at every bay line, a head beam, a two-leaf sliding door (glowing panel, inked frame, lattice
//            bars, a solid kick panel), a noren of three split strips on a rod in front of it, a glowing koshi window
//            on a dark skirt, and on some bays a standing andon sign box. A sloped tin hisashi eave (pale top, corrugation
//            lines) runs over the whole row: its lit edges are the lines that converge down the alley.
//   SIGNS    blank glowing boards (shapes only, NO lettering): a wide board above the eave, or a tall blade sign
//            projecting into the alley on two brackets (the blades stack in depth looking down the alley).
//   UPPER    a window per bay (lit or dark), air-conditioner units on brackets with a pipe into the wall, drain pipes on
//            some bay lines, and overhead wires: catenaries across the alley and along each row under the lips.
//   OUTSIDE  the back walls get a small window per storey and a drain pipe per bay; each end wall carries a tall blank
//            sign by the alley corner, so both mouths are marked.
//   CLUTTER  beer crates stacked as stools (two colours, dark hand slots), one AC unit on a stand at ground level.
//   PAVING   a dark stone slab with pale joint lines in a running bond, a gutter strip at each foot, and irregular puddle
//            fans (pale, wet) with lantern-red and sign-amber reflections inside them.
//   LANTERNS one or two akachochin per bay hung from the eave edge, each on its own pivot joint "lantern<i>" at the hook.
//            They have no meshes of their own: paper, rib lines and caps are vertex ranges in the noren-red, lattice and
//            wood meshes, and pose() rewrites each lantern's ranges (positions, normals, hull normals) about its pivot.
// Proportions (real size, base unit the bay B = 2.0 m): alley 2.5 wide between facades (1.25 B), default 8 long (4 bays a
//   side), buildings 1.0 deep; eave 2.78 at the wall down to 2.52 at 0.6 out; door 1.0 x 1.85; noren 2.22-1.58; lanterns
//   0.34 wide, 0.48 paper, hook 2.49, bottom 1.92; boards 2.95-3.4, blades 2.95-4.15 and 0.45 out; upper windows
//   3.55-4.25; bays 4.5-5.2 tall plus a 0.08 lip (top 5.28 = 2.64 B); wires 4.2-4.45.
// Budget: ~12.5k triangles at the default length (12 lanterns at 600 each) in 15 meshes, one per material pair, at
//   any length; length 12 is ~18.5k.
// Hero: the lab's hero camera (az 52) sees the +X row's back wall. To check the shot down the alley, turn the set by
//   +52 deg about y in a scratch copy (set.rotation.y) so that camera looks in at the +Z mouth; a film puts its camera
//   at the mouth (z ~ length / 2 + 3, eye height) looking down -z.
// Options build(THREE, kit, colors, { length, height }):
//   length   alley length in metres (default 8): round(length / 2) bays per side, at least 2.
//   height   scales the whole set uniformly (default 5.28, the tallest lip), as the torii and house do.
// Clip: sway 3 s (pose("sway@1.2")): every lantern swings about its hook, +-6 deg along the alley and +-2.5 deg across,
//   each one a little behind its neighbour; whole cycles only, so the loop closes.
// Colours (indigo, night), base / shade:
//   walls sky #1b2d6b flat (night ambient); wood (posts, beams, frames, skirts, sign frames, brackets) hair #16141c
//   flat, lattice bars hair; tin eaves and lips moon #d5e2ff / sky at 0.35 (lit tops pale, alley-facing fascias of the
//   +X row in sky), corrugation lines sky; practicals at threshold -1 (flat, lit from inside): door and window glow
//   practical #f0c36a, boards and andons sclera #f6f3ee or practical, lantern paper accent #e23b4a (the noren-red
//   material) with hair ribs and caps (lattice, wood); noren accent or line #e7eefc flat; pipes and AC units line / moon at 0.35, AC grille hair; crates iris
//   #e7a04a / accent and accent / sky; paving hair with sky joints; puddles sky (they mirror the night sky) with a
//   moon glint and accent / practical reflections of the lanterns and signs;
//   wires hair. hair sits next to ink only in lines and small dark parts: indigo has no tone between sky and ink.

export const meta = {
  name: "yokocho",
  height: 5.28,
  script: "indigo",
  colors: {
    wall: "#1b2d6b",
    wood: "#16141c",
    tin: "#d5e2ff", tinShade: "#1b2d6b", tinLine: "#1b2d6b",
    glow: "#f0c36a", signWhite: "#f6f3ee", signAmber: "#f0c36a",
    norenRed: "#e23b4a", norenWhite: "#e7eefc",
    metal: "#e7eefc", metalShade: "#d5e2ff", grille: "#16141c",
    crate: "#e7a04a", crateShade: "#e23b4a", crateRed: "#e23b4a", crateRedShade: "#1b2d6b",
    pave: "#16141c", paveLine: "#1b2d6b", puddle: "#1b2d6b", glint: "#d5e2ff", reflRed: "#e23b4a", reflAmber: "#f0c36a",
    wire: "#16141c",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { length = 8, height = meta.height } = opts;
  const root = new THREE.Group();
  root.name = "yokocho";
  const set = new THREE.Group(); // the uniform size scale lives here
  set.name = "set";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  function tri(key, a, b, e, ref) { // wound away from ref
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-9) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    S(key).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
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
  const nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  function beam(key, a, b, w, h, up = [0, 1, 0]) {
    const d = sub(b, a), s = nrm(cross(d, up)), u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // an open tube along a polyline (ends hidden in walls), n sides, wound from its axis
  function tube(key, pts, r, n = 5) {
    const rings = pts.map((p, i) => {
      const d = nrm(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
      const s = nrm(cross(d, Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), u = cross(s, d);
      return Array.from({ length: n }, (_, k) => {
        const a = (k / n) * Math.PI * 2;
        return [0, 1, 2].map((j) => p[j] + r * (Math.cos(a) * s[j] + Math.sin(a) * u[j]));
      });
    });
    for (let i = 0; i + 1 < pts.length; i++) {
      const ref = pts[i].map((v, j) => (v + pts[i + 1][j]) / 2);
      for (let k = 0; k < n; k++) quad(key, rings[i][k], rings[i][(k + 1) % n], rings[i + 1][(k + 1) % n], rings[i + 1][k], ref);
    }
  }
  // a closed cylinder from a to b
  function cyl(key, a, b, r, n = 8) {
    tube(key, [a, b], r, n);
    for (const [p, q] of [[a, b], [b, a]]) {
      const d = nrm(sub(p, q)), s = nrm(cross(d, Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), u = cross(s, d);
      const R = (k) => [0, 1, 2].map((j) => p[j] + r * (Math.cos((k / n) * 6.2832) * s[j] + Math.sin((k / n) * 6.2832) * u[j]));
      for (let k = 0; k < n; k++) tri(key, p, R(k), R(k + 1), q);
    }
  }
  const sag = (a, b, dip, m = 10) => Array.from({ length: m + 1 }, (_, i) => {
    const t = i / m;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - dip * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t];
  });
  // flat irregular blob on the ground (fan), lobes from literal phases
  function blob(key, cx, cz, rx, rz, y, ph, m = 14) {
    const P = (k) => {
      const a = (k / m) * Math.PI * 2, f = 1 + 0.22 * Math.sin(3 * a + ph) + 0.1 * Math.cos(5 * a + 2 * ph);
      return [cx + rx * f * Math.cos(a), y, cz + rz * f * Math.sin(a)];
    };
    for (let k = 0; k < m; k++) tri(key, [cx, y, cz], P(k), P(k + 1), [cx, y - 1, cz]);
  }

  // ---------- the alley frame ----------
  const HW = 1.25, DEEP = 1.0, PV = 0.04; // half width, building depth, paving top
  const nBay = Math.max(2, Math.round(length / 2)), B = length / nBay, L = length;
  const zOf = (i) => -L / 2 + B * (i + 0.5); // bay centre, i = 0 at the back
  // facade coordinates: side s = +1 (the +X row, facing -X) or -1; z along the alley; o out of the wall into the alley
  const F = (s, z, y, o) => [s * (HW - o), y, z];
  const fbox = (key, s, z, y, o, wz, h, d) => box(key, s * (HW - o), y, z, d, h, wz);
  const fquad = (key, s, z, y, o, wz, h) =>
    quad(key, F(s, z - wz / 2, y - h / 2, o), F(s, z + wz / 2, y - h / 2, o), F(s, z + wz / 2, y + h / 2, o), F(s, z - wz / 2, y + h / 2, o), F(s, z, y, o - 1));

  // literal bay tables, indexed per side (mod their length)
  const T = {
    h: [[4.6, 5.0, 4.5, 5.2, 4.8, 4.7], [5.2, 4.6, 4.9, 4.5, 5.0, 4.6]],
    door: [[1, -1, 1, -1, 1, -1], [-1, 1, -1, 1, -1, 1]], // door toward +z (1) or -z (-1) inside the bay
    sign: [["blade", "board", "blade", "board", "blade", "board"], ["board", "blade", "board", "blade", "board", "blade"]],
    signCol: [["signWhite", "signAmber", "signAmber", "signWhite", "signWhite", "signAmber"], ["signAmber", "signWhite", "signWhite", "signAmber", "signAmber", "signWhite"]],
    noren: [["norenRed", "norenWhite", "norenRed", "norenRed", "norenWhite", "norenRed"], ["norenWhite", "norenRed", "norenRed", "norenWhite", "norenRed", "norenWhite"]],
    lanterns: [[2, 1, 1, 2, 1, 2], [1, 2, 2, 1, 2, 1]],
    lit: [[1, 0, 1, 1, 0, 1], [0, 1, 1, 0, 1, 1]],
    andon: [[0, 1, 0, 0, 1, 0], [1, 0, 0, 1, 0, 0]],
    ac: [[0, 1, 0, 1, 0, 0], [1, 0, 0, 0, 1, 0]],
  };
  const tb = (k, s, i) => { const a = T[k][s > 0 ? 0 : 1]; return a[i % a.length]; };
  const lanternAt = [];

  for (const s of [1, -1]) {
    for (let i = 0; i < nBay; i++) {
      const zc = zOf(i), H = tb("h", s, i), ds = tb("door", s, i);
      const dz = zc + ds * 0.42, wz = zc - ds * 0.5; // door and window centres
      // body and its stepped lip
      box("wall", s * (HW + DEEP / 2), H / 2, zc, DEEP, H, B);
      fbox("tin", s, zc, H + 0.04, -0.08, B, 0.08, 0.44);
      // posts at the bay lines, head beam
      fbox("wood", s, zc - B / 2 + 0.06, 1.27, 0.06, 0.12, 2.46, 0.12);
      if (i === nBay - 1) fbox("wood", s, zc + B / 2 - 0.06, 1.27, 0.06, 0.12, 2.46, 0.12);
      fbox("wood", s, zc, 2.38, 0.05, B, 0.14, 0.1);
      // sliding door: glow, frame, two leaves of lattice, kick panels
      fquad("glow", s, dz, PV + 0.92, 0.03, 1.0, 1.84);
      fbox("wood", s, dz, 1.92, 0.05, 1.12, 0.08, 0.08);
      for (const e of [-1, 1]) fbox("wood", s, dz + e * 0.53, 0.98, 0.05, 0.07, 1.88, 0.08);
      fbox("wood", s, dz, PV + 0.2, 0.045, 1.0, 0.4, 0.05);
      fquad("lattice", s, dz, 1.02, 0.06, 0.05, 1.8);
      for (const e of [-0.25, 0.25]) fquad("lattice", s, dz + e, 1.1, 0.055, 0.025, 1.6);
      for (const y of [0.9, 1.4]) fquad("lattice", s, dz, y, 0.055, 1.0, 0.025);
      // noren on a rod, three strips with gaps
      fbox("wood", s, dz, 2.24, 0.16, 1.16, 0.035, 0.035);
      for (let k = -1; k <= 1; k++) fbox(tb("noren", s, i), s, dz + k * 0.34, 1.9, 0.16, 0.31, 0.64, 0.015);
      // koshi window on a dark skirt
      fbox("wood", s, wz, PV + 0.42, 0.04, 0.76, 0.84, 0.06);
      fquad("glow", s, wz, 1.32, 0.03, 0.7, 0.9);
      fbox("wood", s, wz, 1.79, 0.05, 0.8, 0.06, 0.08);
      for (let k = -3; k <= 3; k++) fquad("lattice", s, wz + k * 0.09, 1.32, 0.05, 0.022, 0.9);
      if (tb("andon", s, i)) { // standing sign box beside the window
        fbox(tb("signCol", s, i), s, wz - ds * 0.05, PV + 0.36, 0.38, 0.26, 0.56, 0.22);
        fbox("wood", s, wz - ds * 0.05, PV + 0.67, 0.38, 0.3, 0.05, 0.26);
      }
      // tin hisashi eave over the whole bay, with corrugation lines
      const e0 = 2.78, e1 = 2.52, eo = 0.6, et = 0.06;
      hex("tin", [F(s, zc - B / 2, e0 - et, 0), F(s, zc + B / 2, e0 - et, 0), F(s, zc + B / 2, e1 - et, eo), F(s, zc - B / 2, e1 - et, eo),
        F(s, zc - B / 2, e0, 0), F(s, zc + B / 2, e0, 0), F(s, zc + B / 2, e1, eo), F(s, zc - B / 2, e1, eo)]);
      for (let z = zc - B / 2 + 0.12; z < zc + B / 2 - 0.05; z += 0.2)
        quad("tinLine", F(s, z - 0.015, e0 + 0.006, 0.02), F(s, z + 0.015, e0 + 0.006, 0.02), F(s, z + 0.015, e1 + 0.006, eo - 0.01), F(s, z - 0.015, e1 + 0.006, eo - 0.01), F(s, z, e0 - 1, 0.3));
      // signs (blank)
      const sc = tb("signCol", s, i);
      if (tb("sign", s, i) === "board") {
        fbox("wood", s, zc, 3.18, 0.025, 1.46, 0.56, 0.05);
        fquad(sc, s, zc, 3.18, 0.056, 1.32, 0.42);
      } else {
        const bz = zc - ds * (B / 2 - 0.3);
        fbox(sc, s, bz, 3.55, 0.36, 0.14, 1.2, 0.42);
        fbox("wood", s, bz, 3.55, 0.37, 0.09, 1.3, 0.52);
        for (const y of [3.05, 4.05]) beam("wood", F(s, bz, y, 0), F(s, bz, y, 0.62), 0.05, 0.05);
      }
      // upper window
      const ux = zc + ds * 0.1;
      fbox("wood", s, ux, 3.9, 0.03, 1.08, 0.78, 0.06);
      fquad(tb("lit", s, i) ? "glow" : "wood", s, ux, 3.9, 0.065, 0.94, 0.64);
      fquad("lattice", s, ux, 3.9, 0.07, 0.03, 0.64);
      // AC unit on brackets, pipe into the wall
      if (tb("ac", s, i)) {
        const az = zc - ds * 0.62, ay = Math.min(4.6, H - 0.4);
        fbox("metal", s, az, ay, 0.2, 0.66, 0.46, 0.26);
        fquad("grille", s, az - 0.1, ay, 0.335, 0.32, 0.32);
        for (const e of [-0.25, 0.25]) beam("wood", F(s, az + e, ay - 0.26, 0), F(s, az + e, ay - 0.26, 0.3), 0.04, 0.04);
        tube("metal", [F(s, az + 0.36, ay - 0.1, 0.15), F(s, az + 0.46, ay - 0.1, 0.15), F(s, az + 0.46, ay - 0.6, 0.08), F(s, az + 0.46, ay - 0.6, -0.05)], 0.025, 6);
      }
      // lanterns (pivots filled below)
      const nl = tb("lanterns", s, i);
      for (let k = 0; k < nl; k++) lanternAt.push(F(s, zc - ds * (k ? 0.62 : 0.15), 2.49, 0.5));
    }
    // the outer (back) walls: a small window per storey, lit by the table, and a drain pipe per bay
    for (let i = 0; i < nBay; i++) {
      const zc = zOf(i), X = s * (HW + DEEP), ds = tb("door", s, i);
      for (const [y, lit] of [[1.5, tb("lit", s, i + 1)], [3.8, tb("lit", s, i)]]) {
        box("wood", X + s * 0.02, y, zc + ds * 0.3, 0.06, 0.76, 0.86);
        quad(lit ? "glow" : "wood", [X + s * 0.055, y - 0.3, zc + ds * 0.3 - 0.35], [X + s * 0.055, y - 0.3, zc + ds * 0.3 + 0.35], [X + s * 0.055, y + 0.3, zc + ds * 0.3 + 0.35], [X + s * 0.055, y + 0.3, zc + ds * 0.3 - 0.35], [0, y, zc]);
        quad("lattice", [X + s * 0.06, y - 0.3, zc + ds * 0.3 - 0.015], [X + s * 0.06, y - 0.3, zc + ds * 0.3 + 0.015], [X + s * 0.06, y + 0.3, zc + ds * 0.3 + 0.015], [X + s * 0.06, y + 0.3, zc + ds * 0.3 - 0.015], [0, y, zc]);
      }
      cyl("metal", [X + s * 0.08, PV, zc - ds * 0.6], [X + s * 0.08, tb("h", s, i) - 0.05, zc - ds * 0.6], 0.045, 8);
    }
    // drain pipes on alternate bay lines, wires along the row
    for (let i = 1; i < nBay; i += 2) {
      const z = -L / 2 + B * i + 0.16, top = Math.min(tb("h", s, i), tb("h", s, i - 1));
      cyl("metal", F(s, z, PV, 0.1), F(s, z, top - 0.05, 0.1), 0.045, 8);
      for (const y of [1.2, 2.2, 3.4]) fbox("wood", s, z, y, 0.06, 0.12, 0.04, 0.12);
    }
    for (let i = 0; i < nBay; i++) {
      const z0 = -L / 2 + B * i, y = 4.38 - 0.06 * (i % 2);
      tube("wire", sag(F(s, z0, y, 0.18), F(s, z0 + B, y + 0.04, 0.18), 0.14), 0.014);
    }
  }
  // tall blank signs on the end walls at both mouths, by the alley corner
  for (const s of [1, -1]) for (const e of [1, -1]) {
    const x = s * (HW + 0.32), z = e * L / 2;
    box("wood", x, 3.75, z + e * 0.025, 0.34, 1.7, 0.05);
    box(e > 0 ? (s > 0 ? "signAmber" : "signWhite") : "signWhite", x, 3.75, z + e * 0.06, 0.24, 1.56, 0.04);
  }
  // wires across the alley
  for (let i = 0; i <= nBay; i++) {
    const z = -L / 2 + B * i + 0.3 - 0.6 * (i % 2);
    if (z < -L / 2 + 0.2 || z > L / 2 - 0.2) continue;
    tube("wire", sag([HW, 4.42, z], [-HW, 4.3, z + 0.35], 0.28, 14), 0.014);
  }

  // ---------- paving ----------
  box("pave", 0, PV / 2, 0, 2 * HW + 2 * DEEP, PV, L + 0.6);
  for (let z = -L / 2 - 0.3 + 0.5; z < L / 2 + 0.3; z += 0.5) // running bond: cross joints, offset longitudinal joints
    quad("paveLine", [-HW, PV + 0.004, z - 0.012], [HW, PV + 0.004, z - 0.012], [HW, PV + 0.004, z + 0.012], [-HW, PV + 0.004, z + 0.012], [0, 0, z]);
  for (let z = -L / 2 - 0.3, r = 0; z < L / 2 + 0.3 - 0.01; z += 0.5, r++)
    for (const x of r % 2 ? [-0.62, 0.62] : [-0.0]) {
      const z1 = Math.min(z + 0.5, L / 2 + 0.3);
      quad("paveLine", [x - 0.012, PV + 0.004, z], [x + 0.012, PV + 0.004, z], [x + 0.012, PV + 0.004, z1], [x - 0.012, PV + 0.004, z1], [x, 0, z]);
    }
  for (const s of [1, -1]) // gutter strips at the feet of the walls
    quad("paveLine", [s * (HW - 0.02), PV + 0.004, -L / 2 - 0.3], [s * (HW - 0.2), PV + 0.004, -L / 2 - 0.3], [s * (HW - 0.2), PV + 0.004, L / 2 + 0.3], [s * (HW - 0.02), PV + 0.004, L / 2 + 0.3], [s, 0, 0]);
  // puddles: [x, z share of L, rx, rz, phase], reflections inside the bigger ones
  const PUD = [[0.25, 0.32, 0.42, 0.85, 0.4], [-0.45, 0.06, 0.32, 0.55, 2.1], [0.4, -0.22, 0.3, 0.7, 4.0], [-0.2, -0.4, 0.38, 0.6, 1.3]];
  for (const [x, f, rx, rz0, ph] of PUD) {
    const z = f * L, rz = rz0 * Math.min(1, L / 8); // short alleys get shorter puddles, so they stay apart
    blob("puddle", x, z, rx, rz, PV + 0.009, ph);
    blob(x > 0 ? "reflRed" : "reflAmber", x + (x > 0 ? 0.08 : -0.06), z - rz * 0.25, rx * 0.25, rz * 0.32, PV + 0.015, ph + 1);
    blob("reflAmber", x - 0.05, z + rz * 0.35, rx * 0.18, rz * 0.2, PV + 0.015, ph + 2);
    quad("glint", [x - rx * 0.5, PV + 0.013, z + rz * 0.05], [x + rx * 0.35, PV + 0.013, z - rz * 0.1], [x + rx * 0.35, PV + 0.013, z - rz * 0.06], [x - rx * 0.5, PV + 0.013, z + rz * 0.09], [x, 0, z]);
  }

  // ---------- clutter: beer crates in front of windows without an andon (side, bay, along, stack, colour), a ground AC ----------
  const winZ = (s, i) => zOf(i) - tb("door", s, i) * 0.5;
  const CR = [[1, 2, 0, 2, 0], [1, 2, 0.46, 1, 1], [1, 3, 0.1, 1, 0], [-1, 1, 0, 3, 0], [-1, 2, -0.1, 2, 1], [-1, 2, 0.36, 1, 0], [1, 5, 0, 2, 1], [-1, 4, 0, 2, 0]];
  for (const [s, i, a, n, col] of CR) {
    if (i >= nBay) continue;
    const z = winZ(s, i) + a, o = 0.5, key = col ? "crateRed" : "crate";
    for (let k = 0; k < n; k++) {
      const y = PV + 0.155 + k * 0.31;
      fbox(key, s, z, y, o, 0.44, 0.3, 0.34);
      fquad("grille", s, z, y + 0.08, o + 0.172, 0.16, 0.05); // hand slots on the alley face and the ends
      for (const e of [-1, 1]) quad("grille", F(s, z + e * 0.222, y + 0.055, o - 0.08), F(s, z + e * 0.222, y + 0.055, o + 0.08), F(s, z + e * 0.222, y + 0.105, o + 0.08), F(s, z + e * 0.222, y + 0.105, o - 0.08), F(s, z, y, o));
      fquad("grille", s, z, y - 0.04, o + 0.172, 0.4, 0.02);
    }
  }
  const gz = winZ(1, 0);
  fbox("metal", 1, gz, PV + 0.5, 0.22, 0.75, 0.52, 0.3);
  fquad("grille", 1, gz + 0.1, PV + 0.5, 0.375, 0.34, 0.34);
  fbox("wood", 1, gz, PV + 0.12, 0.22, 0.7, 0.04, 0.34);
  for (const e of [-0.3, 0.3]) fbox("wood", 1, gz + e, PV + 0.07, 0.22, 0.04, 0.1, 0.3);


  // ---------- lantern template (local: hook at the origin, hangs down -y) ----------
  // Paper r(t) = R sqrt(1 - (k t)^2) between the caps, rib lines as thin rows. Three parts: paper, ribs, caps.
  const R = 0.17, PH = 0.24, PY = -0.33, RE = 0.095, kk = Math.sqrt(1 - (RE / R) ** 2), NS = 10;
  const parts = [[], [], []];
  const gtri = (gi, a, b, e, ref) => { const k = "__l"; soups[k] = []; tri(k, a, b, e, ref); parts[gi].push(...soups[k]); };
  const ring = (y, r) => Array.from({ length: NS }, (_, j) => [r * Math.cos((j / NS) * 6.2832), y, r * Math.sin((j / NS) * 6.2832)]);
  const rows = [];
  const NB = 8, RIB = 0.006;
  for (let b = 0; b <= NB; b++) {
    const t = -1 + (2 * b) / NB;
    for (const dt of b === 0 ? [0, RIB] : b === NB ? [-RIB, 0] : [-RIB, RIB]) {
      const tt = Math.max(-1, Math.min(1, t + dt / PH));
      rows.push({ y: PY + tt * PH, r: R * Math.sqrt(1 - (kk * tt) ** 2) * (1.02 - 0.02 * Math.abs(Math.cos(Math.PI * NB * (tt + 1) / 2))) });
    }
  }
  for (let q = 0; q + 1 < rows.length; q++) {
    const A = ring(rows[q].y, rows[q].r), Bq = ring(rows[q + 1].y, rows[q + 1].r), ref = [0, (rows[q].y + rows[q + 1].y) / 2, 0];
    for (let j = 0; j < NS; j++) { gtri(0, A[j], A[(j + 1) % NS], Bq[(j + 1) % NS], ref); gtri(0, A[j], Bq[(j + 1) % NS], Bq[j], ref); }
    // the thin rows at each rib: a dark band 4 mm proud of the closed paper (the paper keeps one unbroken hull)
    if (q % 2 === 0 && q > 0 && q < rows.length - 2) {
      const out = (P) => P.map((v) => [v[0] * (1 + 0.004 / R), v[1], v[2] * (1 + 0.004 / R)]);
      const [Ao, Bo] = [out(A), out(Bq)];
      for (let j = 0; j < NS; j++) { gtri(1, Ao[j], Ao[(j + 1) % NS], Bo[(j + 1) % NS], ref); gtri(1, Ao[j], Bo[(j + 1) % NS], Bo[j], ref); }
    }
  }
  // caps: short closed cylinders overlapping the paper ends; a hanger into the eave
  const capCyl = (y0, y1, r) => {
    const A = ring(y0, r), Bc = ring(y1, r), ref = [0, (y0 + y1) / 2, 0];
    for (let j = 0; j < NS; j++) {
      const j1 = (j + 1) % NS;
      gtri(2, A[j], A[j1], Bc[j1], ref); gtri(2, A[j], Bc[j1], Bc[j], ref);
      gtri(2, [0, y0, 0], A[j], A[j1], ref); gtri(2, [0, y1, 0], Bc[j], Bc[j1], ref);
    }
  };
  capCyl(PY + PH - 0.02, PY + PH + 0.03, RE + 0.012);
  capCyl(PY - PH - 0.03, PY - PH + 0.02, RE + 0.012);
  capCyl(PY + PH + 0.03, 0.04, 0.012);
  delete soups.__l;

  // ---------- meshes: one per material pair ----------
  // Soup keys that share a material are merged (ALIAS). The lanterns ride in the norenRed (paper), lattice (ribs) and
  // wood (caps) meshes: each lantern owns a vertex range in each, and pose() rewrites those ranges about its pivot.
  const FLAT = -1; // practical glow: one flat base tone all round
  const MAT = {
    wall: [c.wall, c.wall, 0.35, true], wood: [c.wood, c.wood, 0.35, true], lattice: [c.wood, c.wood, 0.35, false],
    tin: [c.tin, c.tinShade, 0.35, true], skyLine: [c.tinLine, c.tinLine, 0.35, false],
    glow: [c.glow, c.glow, FLAT, false], signWhite: [c.signWhite, c.signWhite, FLAT, true], signAmber: [c.signAmber, c.signAmber, FLAT, true],
    norenRed: [c.norenRed, c.norenRed, FLAT, true], norenWhite: [c.norenWhite, c.norenWhite, FLAT, true],
    metal: [c.metal, c.metalShade, 0.35, true],
    crate: [c.crate, c.crateShade, 0.35, true], crateRed: [c.crateRed, c.crateRedShade, 0.35, true],
    glint: [c.glint, c.glint, FLAT, false], reflRed: [c.reflRed, c.reflRed, FLAT, false],
  };
  // pave and wire share wood's hair; grille is lattice; paving joints, puddles and corrugation are one sky; reflAmber is glow
  const ALIAS = { pave: "wood", grille: "lattice", wire: "lattice", tinLine: "skyLine", paveLine: "skyLine", puddle: "skyLine", reflAmber: "glow" };
  const merged = {};
  for (const [key, arr] of Object.entries(soups)) (merged[ALIAS[key] ?? key] ??= []).push(...arr);
  const LPART = ["norenRed", "lattice", "wood"]; // paper, ribs, caps
  const lanterns = lanternAt.map((p) => {
    const ranges = LPART.map((key, gi) => {
      const arr = (merged[key] ??= []), start = arr.length;
      for (let v = 0; v < parts[gi].length; v += 3) arr.push(parts[gi][v] + p[0], parts[gi][v + 1] + p[1], parts[gi][v + 2] + p[2]);
      return { key, start, local: parts[gi] };
    });
    return { p, ranges };
  });
  const meshes = {};
  for (const [key, arr] of Object.entries(merged)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, { threshold, outline });
    mesh.name = key;
    set.add(mesh);
    meshes[key] = mesh;
  }
  // rest normals (and hull normals, in cel) of every lantern range, to rotate with it
  for (const l of lanterns)
    for (const r of l.ranges) {
      const g = meshes[r.key].geometry, n = r.local.length;
      r.normal = g.attributes.normal.array.slice(r.start, r.start + n);
      if (g.attributes.hullNormal) r.hull = g.attributes.hullNormal.array.slice(r.start, r.start + n);
    }
  // pivots stay as joints (for --joints and films); they carry no mesh, pose() reads their rotation
  const pivots = lanterns.map((l, i) => {
    const pv = new THREE.Group();
    pv.name = `lantern${i}`;
    pv.position.set(...l.p);
    set.add(pv);
    joints[pv.name] = pv;
    return pv;
  });
  const v3 = new THREE.Vector3(), m3 = new THREE.Matrix3();
  function writeLanterns() {
    const touched = new Set();
    lanterns.forEach((l, i) => {
      const pv = pivots[i];
      pv.updateMatrix();
      m3.setFromMatrix4(pv.matrix);
      for (const r of l.ranges) {
        const g = meshes[r.key].geometry, P = g.attributes.position.array, N = g.attributes.normal.array, Hn = g.attributes.hullNormal?.array;
        for (let v = 0; v < r.local.length; v += 3) {
          v3.set(r.local[v], r.local[v + 1], r.local[v + 2]).applyMatrix4(pv.matrix);
          P[r.start + v] = v3.x; P[r.start + v + 1] = v3.y; P[r.start + v + 2] = v3.z;
          v3.set(r.normal[v], r.normal[v + 1], r.normal[v + 2]).applyMatrix3(m3);
          N[r.start + v] = v3.x; N[r.start + v + 1] = v3.y; N[r.start + v + 2] = v3.z;
          if (Hn && r.hull) {
            v3.set(r.hull[v], r.hull[v + 1], r.hull[v + 2]).applyMatrix3(m3);
            Hn[r.start + v] = v3.x; Hn[r.start + v + 1] = v3.y; Hn[r.start + v + 2] = v3.z;
          }
        }
        touched.add(r.key);
      }
    });
    for (const key of touched) {
      const g = meshes[key].geometry;
      g.attributes.position.needsUpdate = true;
      g.attributes.normal.needsUpdate = true;
      if (g.attributes.hullNormal) g.attributes.hullNormal.needsUpdate = true;
      g.computeBoundingSphere();
      g.computeBoundingBox();
    }
  }

  // ---------- pose and clip ----------
  // Sign convention: +rx swings a lantern's bottom toward -z (along the alley), +rz toward +x.
  const CLIPS = { sway: 3 };
  const TAU = Math.PI * 2, D2R = Math.PI / 180;
  function apply(ph) {
    pivots.forEach((pv, i) => {
      if (ph === null) return pv.rotation.set(0, 0, 0);
      pv.rotation.set(6 * D2R * Math.sin(TAU * (ph - i * 0.11)), 0, 2.5 * D2R * Math.sin(TAU * 2 * (ph - i * 0.07) + 0.6));
    });
    writeLanterns();
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`yokocho: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      const Tn = CLIPS[m[1]];
      return apply((((+m[2] % Tn) + Tn) % Tn) / Tn);
    }
    if (name !== "rest") throw new Error(`yokocho: unknown pose "${name}" (rest, or sway@<seconds>)`);
    apply(null);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
