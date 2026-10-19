// school-gym.js - a Japanese school gymnasium interior (taiikukan: assemblies, club practice, the culture festival
// play), static. Contract: harness/lab/README.md. Meters, +Y up, the stage faces +Z down the long axis, its left is +X,
// stands on y = 0, centred on x = 0, z = 0. One set with models/school.js (same meadow script, same cream walls).
//
// Construction (boxes, beams and flat quads, all triangle soups merged per material; flat-shaded, so planes read crisp):
//   SHELL    a floor slab and four walls. The long walls (x = +-11) carry the gallery catwalk and the high windows; the
//            end walls rise to the roof arch. CUTAWAY (default) leaves out the +X long wall (with its catwalk, windows
//            and side hoops) and the roof cladding, so the lab's front-left cameras look in; the columns on +X stay,
//            holding the trusses, as the open cut of the section.
//   ROOF     seven arched steel trusses on wall columns, one per 5.67 m bay: bottom and top chords on parabolas, a
//            Warren web between them, purlins along Z on the top chord. All of it is thin dark-green bars without a
//            hull (the bar colour is the line; a hull on hundreds of members would scribble). Pale lamp discs hang
//            under the bottom chords.
//   FLOOR    the identity cue at three4: a honey wood floor with painted court lines as flat strips 6 and 12 mm over
//            it, a basketball court in red and a volleyball court in green, and plank joints in a faint skin tone.
//   STAGE    at -Z: a raised platform with a panelled riser (the under-stage chair drawers), a proscenium wall with
//            a dark trim frame, a red curtain valance, two heavy red curtains of diamond-prism folds (half open by
//            default, shut with stage: "closed"), a pale cyclorama backdrop, side steps and a wall clock above the opening.
//   WALLS    pale panelled wainscot to 2.4 m, the catwalk at 4.4 m (deck, kick plate, posts, two rails), windows
//            5.0-8.0 m per bay with a diagonal ball-guard mesh 15 cm in front, wooden wall bars (rokuboku) in one
//            bay of the far wall. Basketball hoops: the main pair at the court ends (the +Z end wall on a bracket,
//            the stage end hung from the roof), and cross-court hoops on wall brackets on each long wall. Outside:
//            the same high windows under sunshade ledges, low vent windows, a pale plinth band; on the +Z end wall
//            two green sliding doors under a canopy, two rows of windows and gable vents.
//   PROPS    volleyball poles with the net across the centre line, two carts of folded pipe chairs by the stage.
//   Every closed part is wound from its own centre (convex) or a point inside it, never by hand.
// Proportions (real size, base unit the bay B = 5.67 m): hall 22 x 34 m (inside), floor top 0.2; long walls and the
//   eave 9.5; truss bottom chord 8.5 at the walls to 10.0 at the centre, top chord 9.5 to 11.6 (end walls and top
//   11.7); stage 5.5 deep, floor 1.3, proscenium opening 14 x 5.5 m; court 26 x 14 (basketball), 18 x 9 (volleyball).
// Options: build(THREE, kit, colors, { height, cutaway = true, stage = "open" | "closed" }). height scales the whole
//   gym uniformly to that top; cutaway false closes the +X wall and lays the green metal roof on (top 11.9 m); stage
//   "open" draws the curtains half open (each covers a quarter of the opening), "closed" meets them at the centre.
// Colours (meadow, as the school: the one script with a pale sky for glass and greens for steel), base / shade:
//   floor, stage, wall bars   practical #f2c94c / skin #f0c2ae, threshold 0.1: meadow has no brown, and its warm
//                             lamp yellow is the only golden tone, the colour of a varnished maple floor under
//                             gym lamps; skin is the warm shade for stage sides and step risers
//   plank joints               skin #f0c2ae (one tone, a faint line on the honey)
//   basketball lines, valance trim, hoop marks and rims   accent #d9483b (one tone)
//   volleyball lines           iris #3f8a47 (one tone)
//   walls, columns, catwalk, proscenium    moon #f7f3e1 / skin #f0c2ae, threshold 0.1 (the school's walls)
//   wainscot, stage riser      sky #d7ecef / skin #f0c2ae, threshold 0.1 (pale painted panels, off the cream)
//   steel, frames, guard, rails, net, lamp stems   hair #2c5131 (one tone: they are lines)
//   glass, stage cyclorama     sky #d7ecef (one tone)
//   curtains                   accent #d9483b / hair #2c5131, threshold 0.1: folds turning from the light go dark
//   backboards, clock, poles   sclera #f6f3ee / skin #f0c2ae, threshold 0.1; net bands, lamps sclera (one tone)
//   chairs, doors, roof        iris #3f8a47 / hair #2c5131, threshold 0.1

export const meta = {
  name: "school-gym",
  height: 11.7,
  script: "meadow",
  colors: {
    floor: "#f2c94c", floorShade: "#f0c2ae",
    plank: "#f0c2ae",
    lineA: "#d9483b",
    lineB: "#3f8a47",
    wall: "#f7f3e1", wallShade: "#f0c2ae",
    panel: "#d7ecef", panelShade: "#f0c2ae",
    steel: "#2c5131",
    glass: "#d7ecef",
    curtain: "#d9483b", curtainShade: "#2c5131",
    white: "#f6f3ee", whiteShade: "#f0c2ae",
    green: "#3f8a47", greenShade: "#2c5131",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const { height = meta.height, cutaway = true, stage = "open" } = opts;
  const root = new THREE.Group();
  root.name = "school-gym";
  const gym = new THREE.Group(); // uniform size scale lives here, root stays the plain contract node
  gym.name = "body";
  gym.scale.setScalar(height / meta.height);
  root.add(gym);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  // one triangle wound away from `ref` (a point inside the solid, or behind a sheet); slivers dropped
  function tri(key, a, b, e, ref) {
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-9) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    S(key).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  // axis box from corner ranges
  function abox(key, x0, x1, y0, y1, z0, z1) {
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // a bar from a to b, w wide and h tall, its height along `up` (default world up)
  function beam(key, a, b, w, h = w, up = [0, 1, 0]) {
    const d = sub(b, a);
    const nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
    let s = cross(d, up);
    if (Math.hypot(...s) < 1e-6) s = cross(d, [1, 0, 0]);
    s = nrm(s);
    const u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }

  // ---------- wall faces: local (u along the wall, y, o out of the wall) -> world ----------
  const face = (side, at) => ({
    p: (u, y, o) => side === "+z" ? [u, y, at + o] : side === "-z" ? [-u, y, at - o] : side === "+x" ? [at + o, y, -u] : [at - o, y, u],
  });
  // a flat quad facing out of the wall, corners (u0,y0)-(u1,y1)
  const fquad = (key, f, u0, y0, u1, y1, o) =>
    quad(key, f.p(u0, y0, o), f.p(u1, y0, o), f.p(u1, y1, o), f.p(u0, y1, o), f.p((u0 + u1) / 2, (y0 + y1) / 2, o - 1));
  // a strip w wide in the wall plane from (u0,y0) to (u1,y1)
  function fstrip(key, f, u0, y0, u1, y1, w, o) {
    const L = Math.hypot(u1 - u0, y1 - y0), nu = (-(y1 - y0) / L) * w / 2, ny = ((u1 - u0) / L) * w / 2;
    quad(key, f.p(u0 + nu, y0 + ny, o), f.p(u1 + nu, y1 + ny, o), f.p(u1 - nu, y1 - ny, o), f.p(u0 - nu, y0 - ny, o),
      f.p((u0 + u1) / 2, (y0 + y1) / 2, o - 1));
  }
  // a box on the wall: u0..u1 along, y0..y1, o0..o1 out
  function fbox(key, f, u0, u1, y0, y1, o0, o1) {
    const P = (u, y, o) => f.p(u, y, o);
    hex(key, [P(u0, y0, o0), P(u1, y0, o0), P(u1, y0, o1), P(u0, y0, o1), P(u0, y1, o0), P(u1, y1, o0), P(u1, y1, o1), P(u0, y1, o1)]);
  }
  const frect = (key, f, u0, y0, u1, y1, w, o) => {
    fquad(key, f, u0, y0, u1, y0 + w, o); fquad(key, f, u0, y1 - w, u1, y1, o);
    fquad(key, f, u0, y0, u0 + w, y1, o); fquad(key, f, u1 - w, y0, u1, y1, o);
  };

  // ---------- floor strips ----------
  const FY = 0.2; // floor top
  function seg(key, x0, z0, x1, z1, w, y) { // a flat strip on the floor
    const L = Math.hypot(x1 - x0, z1 - z0), nx = (-(z1 - z0) / L) * w / 2, nz = ((x1 - x0) / L) * w / 2;
    quad(key, [x0 + nx, y, z0 + nz], [x1 + nx, y, z1 + nz], [x1 - nx, y, z1 - nz], [x0 - nx, y, z0 - nz], [x0, y - 1, z0]);
  }
  function arc(key, cx, cz, r, a0, a1, w, y, n = 24) { // angle from +Z toward +X
    for (let i = 0; i < n; i++) {
      const t0 = a0 + ((a1 - a0) * i) / n, t1 = a0 + ((a1 - a0) * (i + 1)) / n;
      const P = (t, rr) => [cx + rr * Math.sin(t), y, cz + rr * Math.cos(t)];
      quad(key, P(t0, r - w / 2), P(t1, r - w / 2), P(t1, r + w / 2), P(t0, r + w / 2), [cx, y - 1, cz]);
    }
  }
  const rectLines = (key, x0, z0, x1, z1, w, y) => {
    seg(key, x0, z0, x1, z0, w, y); seg(key, x0, z1, x1, z1, w, y);
    seg(key, x0, z0 - w / 2, x0, z1 + w / 2, w, y); seg(key, x1, z0 - w / 2, x1, z1 + w / 2, w, y);
  };

  // ---------- plan ----------
  const HX = 11, HZ = 17, T = 0.25; // inside half-width, half-length, wall thickness
  const EAVE = 9.5;
  const yB = (x) => 8.5 + 1.5 * (1 - (x / HX) ** 2); // truss bottom chord
  const yT = (x) => 9.5 + 2.1 * (1 - (x / HX) ** 2); // top chord
  const BAY = (2 * HZ) / 6;
  const lines = Array.from({ length: 7 }, (_, i) => -HZ + i * BAY); // column / truss lines
  const SZ = -11.5, PZ = -13, SY = 1.3; // stage front, proscenium plane, stage floor
  const sides = cutaway ? [-1] : [-1, 1];

  // ---------- floor ----------
  abox("floor", -HX - T, HX + T, 0, FY, -HZ - T, HZ + T);
  for (let x = -HX + 1.1; x < HX - 0.5; x += 1.1) seg("plank", x, SZ + 0.05, x, HZ - 0.05, 0.035, FY + 0.003);
  // basketball (red): 26 x 14, centred between the stage and the +Z wall
  const CZ = (SZ + HZ) / 2, yA = FY + 0.006, yV = FY + 0.012, LW = 0.15;
  rectLines("lineA", -7, CZ - 13, 7, CZ + 13, LW, yA);
  seg("lineA", -7, CZ, 7, CZ, LW, yA);
  arc("lineA", 0, CZ, 1.8, 0, 2 * Math.PI, LW, yA, 32);
  for (const s of [-1, 1]) {
    const zb = CZ + s * 13, zk = zb - s * 5.8, hz = zb - s * 1.575;
    rectLines("lineA", -2.45, Math.min(zb, zk), 2.45, Math.max(zb, zk), LW, yA);
    arc("lineA", 0, zk, 1.8, 0, 2 * Math.PI, LW, yA, 28);
    const a = Math.asin(6.6 / 6.75), zs = hz - s * 6.75 * Math.cos(a);
    for (const x of [-6.6, 6.6]) seg("lineA", x, zb, x, zs, LW, yA);
    if (s > 0) arc("lineA", 0, hz, 6.75, Math.PI - a, Math.PI + a, LW, yA, 30);
    else arc("lineA", 0, hz, 6.75, -a, a, LW, yA, 30);
  }
  // volleyball (green): 18 x 9, attack lines 3 m from the centre
  rectLines("lineB", -4.5, CZ - 9, 4.5, CZ + 9, LW, yV);
  for (const dz of [-3, 0, 3]) seg("lineB", -4.5, CZ + dz, 4.5, CZ + dz, LW, yV);

  // ---------- long walls ----------
  for (const s of sides) {
    const xw = s * HX;
    abox("wall", Math.min(xw, xw + s * T), Math.max(xw, xw + s * T), FY, EAVE, -HZ - T, HZ + T);
    const f = s < 0 ? face("+x", xw) : face("-x", xw); // interior face, u runs -z (s<0) or +z (s>0)
    const U = (z) => (s < 0 ? -z : z);
    const span = (z0, z1) => [Math.min(U(z0), U(z1)), Math.max(U(z0), U(z1))];
    // baseboard and wainscot panels (stage bay: only above the stage floor)
    const [wa, wb] = span(SZ, HZ);
    fquad("steel", f, wa, FY, wb, FY + 0.12, 0.045);
    fbox("panel", f, wa, wb, FY, 2.4, 0, 0.04);
    for (let z = SZ + 0.9; z < HZ - 0.3; z += 0.9) { const [u] = span(z, z); fquad("steel", f, u - 0.012, FY + 0.12, u + 0.012, 2.4, 0.045); }
    // catwalk
    const CW = 1.0, CY = 4.4;
    const [ca, cb] = span(-HZ, HZ);
    fbox("wall", f, ca, cb, CY, CY + 0.15, 0, CW);
    fbox("wall", f, ca, cb, CY + 0.15, CY + 0.32, CW - 0.06, CW); // kick plate
    for (let z = -HZ + 0.7; z < HZ; z += 1.4) { const [u] = span(z, z); fbox("steel", f, u - 0.03, u + 0.03, CY + 0.32, CY + 1.1, CW - 0.06, CW); }
    fbox("steel", f, ca, cb, CY + 1.05, CY + 1.12, CW - 0.07, CW + 0.01);
    fbox("steel", f, ca, cb, CY + 0.7, CY + 0.75, CW - 0.06, CW);
    // columns, catwalk brackets
    for (const z of lines) {
      const [u0, u1] = span(z - 0.2, z + 0.2);
      if (Math.abs(z) < HZ - 0.1) fbox("wall", f, u0, u1, FY, EAVE, 0, 0.42);
      const [u] = span(z, z);
      beam("steel", f.p(u, CY - 0.9, 0.02), f.p(u, CY - 0.02, CW - 0.1), 0.08, 0.08);
    }
    // high windows with the ball-guard mesh, one per bay
    for (let i = 0; i < 6; i++) {
      const [u0, u1] = span(lines[i] + 0.55, lines[i + 1] - 0.55);
      const y0 = 5.0, y1 = 8.0;
      fquad("glass", f, u0, y0, u1, y1, 0.01);
      frect("steel", f, u0, y0, u1, y1, 0.09, 0.02);
      for (let k = 1; k < 3; k++) fquad("steel", f, u0 + ((u1 - u0) * k) / 3 - 0.03, y0, u0 + ((u1 - u0) * k) / 3 + 0.03, y1, 0.02);
      fquad("steel", f, u0, 6.95, u1, 7.02, 0.02);
      // guard: a diamond lattice in its own frame 15 cm out
      const W = u1 - u0, H = y1 - y0, pitch = 0.42, o = 0.16;
      frect("steel", f, u0, y0, u1, y1, 0.05, o);
      for (let k = -H; k < W; k += pitch) {
        const a0 = Math.max(0, -k), a1 = Math.min(W, H - k);
        if (a1 - a0 > 0.05) fstrip("steel", f, u0 + a0, y0 + a0 + k, u0 + a1, y0 + a1 + k, 0.022, o);
      }
      for (let k = 0; k < W + H; k += pitch) {
        const a0 = Math.max(0, k - H), a1 = Math.min(W, k);
        if (a1 - a0 > 0.05) fstrip("steel", f, u0 + a0, y0 + k - a0, u0 + a1, y0 + k - a1, 0.022, o + 0.005);
      }
    }
    // the outside: the same high windows, a sunshade ledge and a row of low vent windows (only seen with the wall on)
    const xf = s < 0 ? face("-x", xw - T) : face("+x", xw + T), XU = (z) => (s < 0 ? z : -z);
    fbox("panel", xf, -HZ - T, HZ + T, FY, 1.2, 0, 0.04);
    for (let i = 0; i < 6; i++) {
      const [u0, u1] = [Math.min(XU(lines[i] + 0.55), XU(lines[i + 1] - 0.55)), Math.max(XU(lines[i] + 0.55), XU(lines[i + 1] - 0.55))];
      fquad("glass", xf, u0, 5.0, u1, 8.0, 0.01);
      frect("steel", xf, u0, 5.0, u1, 8.0, 0.09, 0.02);
      for (let k = 1; k < 4; k++) fquad("steel", xf, u0 + ((u1 - u0) * k) / 4 - 0.03, 5.0, u0 + ((u1 - u0) * k) / 4 + 0.03, 8.0, 0.02);
      fbox("wall", xf, u0 - 0.2, u1 + 0.2, 8.15, 8.3, 0, 0.6);
      fquad("glass", xf, u0 + 0.3, 1.4, u1 - 0.3, 2.1, 0.05);
      frect("steel", xf, u0 + 0.3, 1.4, u1 - 0.3, 2.1, 0.07, 0.06);
    }
    // cross-court hoops on wall brackets
    for (const z of [-3.5, 8.5]) hoop(s < 0 ? [1, 0, 0] : [-1, 0, 0], [xw - s * 1.3, 0, z], xw);
  }
  if (cutaway) { // the open cut: the +X columns stay under the trusses, with an eave beam on them
    for (const z of lines) if (Math.abs(z) < HZ - 0.1) abox("steel", HX - 0.1, HX + 0.2, FY, EAVE, z - 0.14, z + 0.14);
    abox("steel", HX - 0.1, HX + 0.2, EAVE - 0.3, EAVE, -HZ, HZ);
  }

  // ---------- hoops ----------
  // n = the way the board faces (into the court), p = board centre in plan (y ignored), wall = the wall plane coordinate
  function hoop(n, p, wall) {
    const [nx, , nz] = n;
    const tx = -nz, tz = nx; // along the board
    const yb = FY + 2.9 + 0.525; // board centre
    const P = (a, y, b) => [p[0] + tx * a + nx * b, y, p[2] + tz * a + nz * b];
    const bx = (key, a0, a1, y0, y1, b0, b1) =>
      hex(key, [P(a0, y0, b0), P(a1, y0, b0), P(a1, y0, b1), P(a0, y0, b1), P(a0, y1, b0), P(a1, y1, b0), P(a1, y1, b1), P(a0, y1, b1)]);
    bx("white", -0.9, 0.9, yb - 0.525, yb + 0.525, -0.03, 0.03);
    const m = (a0, a1, y0, y1) => quad("lineA", P(a0, y0, 0.036), P(a1, y0, 0.036), P(a1, y1, 0.036), P(a0, y1, 0.036), P(0, yb, -1));
    for (const [a0, a1, y0, y1] of [[-0.86, 0.86, yb + 0.44, yb + 0.49], [-0.86, 0.86, yb - 0.49, yb - 0.44], [-0.86, -0.81, yb - 0.49, yb + 0.49], [0.81, 0.86, yb - 0.49, yb + 0.49],
      [-0.3, 0.3, yb - 0.37, yb - 0.32], [-0.3, 0.3, yb + 0.08, yb + 0.13], [-0.3, -0.25, yb - 0.37, yb + 0.13], [0.25, 0.3, yb - 0.37, yb + 0.13]]) m(a0, a1, y0, y1);
    // rim and net
    const ry = FY + 3.05, rc = 0.38, rr = 0.23;
    for (let i = 0; i < 12; i++) {
      const t0 = (i / 12) * 2 * Math.PI, t1 = ((i + 1) / 12) * 2 * Math.PI;
      beam("lineA", P(rr * Math.sin(t0), ry, rc + rr * Math.cos(t0)), P(rr * Math.sin(t1), ry, rc + rr * Math.cos(t1)), 0.03, 0.03);
    }
    beam("lineA", P(0, ry, 0.03), P(0, ry, rc - rr), 0.06, 0.04);
    for (let i = 0; i < 8; i++) {
      const t = (i / 8) * 2 * Math.PI;
      beam("steel", P(rr * Math.sin(t), ry, rc + rr * Math.cos(t)), P(0.13 * Math.sin(t), ry - 0.42, rc + 0.13 * Math.cos(t)), 0.015, 0.015);
    }
    // bracket to the wall (or none: the caller hangs it)
    if (wall !== null) {
      const d = Math.abs((nx ? p[0] : p[2]) - wall);
      for (const a of [-0.6, 0.6]) {
        beam("steel", P(a, yb + 0.4, -0.03), P(a, yb + 0.4, -d), 0.1, 0.1);
        beam("steel", P(a, yb - 0.4, -0.03), P(a, yb + 1.3, -d), 0.08, 0.08);
      }
      beam("steel", P(-0.6, yb + 0.4, -d * 0.5), P(0.6, yb + 0.4, -d * 0.5), 0.08, 0.08);
    }
    return P;
  }
  hoop([0, 0, -1], [0, 0, CZ + 13 - 1.2], HZ); // +Z end wall
  { // stage end: hung from the roof on a steel frame
    const P = hoop([0, 0, 1], [0, 0, CZ - 13 + 1.2], null), yb = FY + 3.425;
    for (const a of [-0.6, 0.6]) {
      beam("steel", P(a, yb + 0.5, -0.05), P(a, yB(a) + 0.05, -0.05), 0.09, 0.09);
      beam("steel", P(a, yb + 0.5, -0.05), P(a, yB(a) + 0.05, -(lines[1] - (CZ - 13 + 1.2)) - 0.02), 0.07, 0.07);
    }
    beam("steel", P(-0.6, yb + 0.5, -0.05), P(0.6, yb + 0.5, -0.05), 0.08, 0.08);
  }

  // ---------- end walls (to the roof arch) ----------
  // one convex prism: a flat bottom, an arched top sampled in n steps, z0..z1 thick (no inner seams for the hull to ink)
  const archWall = (key, z0, z1, xa, xb, ybot, top, n = 16) => {
    const pts = [[xa, ybot], [xb, ybot]];
    for (let i = n; i >= 0; i--) { const x = xa + ((xb - xa) * i) / n; pts.push([x, top(x)]); }
    const cx = pts.reduce((a, q) => a + q[0], 0) / pts.length, cy = pts.reduce((a, q) => a + q[1], 0) / pts.length;
    const ref = [cx, cy, (z0 + z1) / 2];
    for (let i = 0; i < pts.length; i++) {
      const [a, b] = [pts[i], pts[(i + 1) % pts.length]];
      tri(key, [a[0], a[1], z0], [b[0], b[1], z0], [cx, cy, z0], ref);
      tri(key, [a[0], a[1], z1], [b[0], b[1], z1], [cx, cy, z1], ref);
      quad(key, [a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1], ref);
    }
  };
  const wallTop = (x) => (Math.abs(x) > HX ? EAVE : yT(x) + 0.1);
  archWall("wall", HZ, HZ + T, -HX - T, HX + T, FY, wallTop);
  archWall("wall", -HZ - T, -HZ, -HX - T, HX + T, FY, wallTop);
  // +Z end wall exterior: a band, sliding doors, high windows
  const ef = face("+z", HZ + T);
  fbox("panel", ef, -HX - T, HX + T, FY, 1.2, 0, 0.04);
  for (const u of [-3.2, 3.2]) {
    fbox("green", ef, u - 1.6, u + 1.6, FY, 3.2, 0.04, 0.12);
    fquad("steel", ef, u - 0.03, FY, u + 0.03, 3.2, 0.125);
    for (const v of [-0.8, 0.8]) { fquad("glass", ef, u + v - 0.45, 2.0, u + v + 0.45, 2.9, 0.125); frect("steel", ef, u + v - 0.45, 2.0, u + v + 0.45, 2.9, 0.05, 0.13); }
  }
  fbox("wall", ef, -6, 6, 3.45, 3.6, 0, 1.4); // canopy
  for (let i = -3; i <= 3; i++) {
    const u = i * 2.9, y0 = 5.4, y1 = 7.6;
    fquad("glass", ef, u - 1.0, y0, u + 1.0, y1, 0.01);
    frect("steel", ef, u - 1.0, y0, u + 1.0, y1, 0.08, 0.02);
    fquad("steel", ef, u - 0.03, y0, u + 0.03, y1, 0.02);
  }
  for (let i = -2; i <= 2; i++) { // gable vents
    const u = i * 2.2;
    fquad("glass", ef, u - 0.6, 8.6, u + 0.6, 9.6, 0.01);
    frect("steel", ef, u - 0.6, 8.6, u + 0.6, 9.6, 0.07, 0.02);
  }

  // ---------- trusses and purlins ----------
  const NT = 16;
  const xs = Array.from({ length: NT + 1 }, (_, i) => -HX + (2 * HX * i) / NT);
  for (const z of lines) {
    if (Math.abs(z) > HZ - 0.1) continue;
    for (let i = 0; i < NT; i++) {
      const [x0, x1] = [xs[i], xs[i + 1]];
      beam("steel", [x0, yB(x0), z], [x1, yB(x1), z], 0.12, 0.16, [0, 0, 1]);
      beam("steel", [x0, yT(x0), z], [x1, yT(x1), z], 0.12, 0.16, [0, 0, 1]);
      const xm = (x0 + x1) / 2;
      beam("steel", [x0, yB(x0), z], [xm, yT(xm), z], 0.055, 0.055, [0, 0, 1]);
      beam("steel", [xm, yT(xm), z], [x1, yB(x1), z], 0.055, 0.055, [0, 0, 1]);
    }
    for (const x of [-HX, HX]) beam("steel", [x, yB(x), z], [x, yT(x), z], 0.12, 0.12, [0, 0, 1]);
  }
  for (let i = 0; i <= NT; i += 4) beam("steel", [xs[i], yT(xs[i]) + 0.14, -HZ], [xs[i], yT(xs[i]) + 0.14, HZ], 0.08, 0.1);
  // ceiling lamps under the bottom chords (pale discs, a grid)
  for (const z of lines.slice(1, 6)) for (const x of [-6, 0, 6]) {
    beam("steel", [x, yB(x) - 0.6, z], [x, yB(x), z], 0.03, 0.03);
    const y = yB(x) - 0.6;
    for (let k = 0; k < 8; k++) {
      const t0 = (k / 8) * 2 * Math.PI, t1 = ((k + 1) / 8) * 2 * Math.PI, r = 0.35;
      hex("lineW", [[x, y, z], [x + r * Math.sin(t0), y - 0.15, z + r * Math.cos(t0)], [x + r * Math.sin(t1), y - 0.15, z + r * Math.cos(t1)], [x, y, z],
        [x, y - 0.17, z], [x + r * Math.sin(t0), y - 0.2, z + r * Math.cos(t0)], [x + r * Math.sin(t1), y - 0.2, z + r * Math.cos(t1)], [x, y - 0.17, z]]);
    }
  }

  // ---------- roof cladding (closed only) ----------
  if (!cutaway) {
    const n = 20, o = 0.6, ry = (x) => yT(Math.max(-HX, Math.min(HX, x))) + 0.22 - (Math.abs(x) > HX ? (Math.abs(x) - HX) * 0.18 : 0);
    for (let i = 0; i < n; i++) {
      const x0 = -HX - o + ((2 * HX + 2 * o) * i) / n, x1 = -HX - o + ((2 * HX + 2 * o) * (i + 1)) / n;
      const z0 = -HZ - T - o, z1 = HZ + T + o;
      hex("green", [[x0, ry(x0), z0], [x1, ry(x1), z0], [x1, ry(x1), z1], [x0, ry(x0), z1],
        [x0, ry(x0) + 0.15, z0], [x1, ry(x1) + 0.15, z0], [x1, ry(x1) + 0.15, z1], [x0, ry(x0) + 0.15, z1]]);
    }
  }

  // ---------- stage ----------
  abox("floor", -HX, HX, FY, SY, -HZ, SZ);
  const sf = face("+z", SZ);
  fbox("panel", sf, -HX, HX, FY, SY - 0.12, 0, 0.03);
  for (let u = -HX + 1.1; u < HX - 0.5; u += 2.2) fquad("steel", sf, u - 0.025, FY + 0.1, u + 0.025, SY - 0.2, 0.035); // drawer joints
  fquad("steel", sf, -HX, FY + 0.6, HX, FY + 0.64, 0.035);
  for (const s of [-1, 1]) { // side steps
    const x0 = s * 8.4, x1 = s * 10.2;
    for (let k = 0; k < 4; k++) {
      const zf = SZ + 0.3 * (4 - k);
      abox("floor", Math.min(x0, x1), Math.max(x0, x1), FY, FY + ((SY - FY) * (k + 1)) / 4 - 0.0, SZ - 0.01, zf);
    }
  }
  // proscenium wall with the opening, a dark trim frame
  const OW = 7, OY = SY + 5.5;
  const ptop = (x) => yB(Math.max(-HX, Math.min(HX, x))) + 0.02;
  archWall("wall", PZ - 0.4, PZ, -HX - 0.12, -OW, SY, ptop);
  archWall("wall", PZ - 0.4, PZ, OW, HX + 0.12, SY, ptop);
  archWall("wall", PZ - 0.4, PZ, -OW, OW, OY, ptop);
  const pf = face("+z", PZ);
  fbox("floor", pf, -OW - 0.4, -OW, SY, OY + 0.4, 0, 0.12); // a wood frame round the opening
  fbox("floor", pf, OW, OW + 0.4, SY, OY + 0.4, 0, 0.12);
  fbox("floor", pf, -OW - 0.4, OW + 0.4, OY, OY + 0.4, 0, 0.12);
  // clock above the opening
  {
    const cy = OY + 1.3, r = 0.5, n = 16, cz = PZ;
    for (let k = 0; k < n; k++) {
      const t0 = (k / n) * 2 * Math.PI, t1 = ((k + 1) / n) * 2 * Math.PI;
      hex("white", [[0, cy, cz], [r * Math.sin(t0), cy + r * Math.cos(t0), cz], [r * Math.sin(t1), cy + r * Math.cos(t1), cz], [0, cy, cz],
        [0, cy, cz + 0.12], [r * Math.sin(t0), cy + r * Math.cos(t0), cz + 0.1], [r * Math.sin(t1), cy + r * Math.cos(t1), cz + 0.1], [0, cy, cz + 0.12]]);
    }
    fstrip("steel", pf, 0, cy, 0.22, cy + 0.2, 0.06, 0.13);
    fstrip("steel", pf, 0, cy, -0.05, cy + 0.38, 0.04, 0.13);
  }
  // curtains: diamond-prism folds behind the proscenium; open = each covers a quarter of the opening
  const closed = stage === "closed";
  const CZc = PZ - 0.7, fold = 0.5, amp = 0.2;
  for (const s of [-1, 1]) {
    const xin = closed ? 0 : s * OW * 0.5, xout = s * (OW + 0.6);
    const L = Math.abs(xout - xin), n = Math.max(2, Math.round(L / fold)), w = L / n;
    for (let i = 0; i < n; i++) {
      const xa = Math.min(xin, xout) + w * i, xb = xa + w, xm = (xa + xb) / 2;
      const zc = CZc + (i % 2) * 0.06;
      const ring = (y) => [[xa, y, zc], [xm, y, zc + amp], [xb, y, zc], [xm, y, zc - amp]];
      const lo = ring(SY + 0.02), hi = ring(OY + 0.6);
      hex("curtain", [lo[0], lo[1], lo[2], lo[3], hi[0], hi[1], hi[2], hi[3]]);
    }
  }
  { // valance across the top of the opening, shallow folds
    const n = 28, w = (2 * OW + 1.2) / n, y0 = OY - 0.85, y1 = OY + 0.3, zc = PZ - 0.35;
    for (let i = 0; i < n; i++) {
      const xa = -OW - 0.6 + w * i, xb = xa + w, xm = (xa + xb) / 2;
      hex("curtain", [[xa, y0, zc], [xm, y0, zc + 0.12], [xb, y0, zc], [xm, y0, zc - 0.12], [xa, y1, zc], [xm, y1, zc + 0.12], [xb, y1, zc], [xm, y1, zc - 0.12]]);
    }
    quad("lineA", [-OW - 0.6, y0 + 0.12, zc + 0.13], [OW + 0.6, y0 + 0.12, zc + 0.13], [OW + 0.6, y0 + 0.2, zc + 0.13], [-OW - 0.6, y0 + 0.2, zc + 0.13], [0, y0, zc - 1]);
  }
  fquad("glass", face("+z", -HZ), -HX, SY, HX, OY + 1.5, 0.3); // backdrop

  // ---------- wall bars (rokuboku) on the far wall ----------
  {
    const x = -HX, z0 = 0.6, z1 = 5.0, n = 6;
    for (let i = 0; i <= n; i++) {
      const z = z0 + ((z1 - z0) * i) / n;
      abox("floor", x, x + 0.16, FY, 2.75, z - 0.05, z + 0.05);
    }
    for (let k = 0; k < 15; k++) {
      const y = FY + 0.25 + k * 0.17;
      beam("floor", [x + 0.08, y, z0], [x + 0.08, y, z1], 0.045, 0.045);
    }
    abox("floor", x, x + 0.18, 2.75, 2.85, z0 - 0.1, z1 + 0.1);
  }

  // ---------- volleyball poles and net ----------
  {
    const NY = FY + 2.24;
    for (const x of [-5.5, 5.5]) {
      beam("white", [x, FY, CZ], [x, FY + 2.55, CZ], 0.1, 0.1, [0, 0, 1]);
      abox("white", x - 0.25, x + 0.25, FY, FY + 0.05, CZ - 0.25, CZ + 0.25);
    }
    const net = (y0, y1, x0, x1) => quad("lineW", [x0, y0, CZ], [x1, y0, CZ], [x1, y1, CZ], [x0, y1, CZ], [0, y0, CZ - 1]);
    net(NY - 0.07, NY, -5.45, 5.45);
    for (let x = -5.25; x <= 5.3; x += 0.25) beam("steel", [x, NY - 1.0, CZ + 0.005], [x, NY - 0.07, CZ + 0.005], 0.012, 0.012);
    for (let y = NY - 1.0; y < NY - 0.1; y += 0.25) beam("steel", [-5.45, y, CZ + 0.005], [5.45, y, CZ + 0.005], 0.012, 0.012);
    net(NY - 1.05, NY - 1.0, -5.45, 5.45);
  }

  // ---------- folded pipe chairs on carts by the stage ----------
  for (const [cx, cz] of [[5.6, SZ + 0.9], [7.3, SZ + 0.9]]) {
    abox("steel", cx - 0.3, cx + 0.3, FY + 0.06, FY + 0.16, cz - 0.6, cz + 0.6);
    for (let k = 0; k < 14; k++) {
      const z = cz - 0.55 + k * 0.08;
      abox("green", cx - 0.22, cx + 0.22, FY + 0.16, FY + 0.98, z, z + 0.05);
    }
  }

  // ---------- meshes ----------
  const MAT = {
    floor: [c.floor, c.floorShade, 0.1, true],
    plank: [c.plank, c.plank, 0.1, false],
    lineA: [c.lineA, c.lineA, 0.1, false],
    lineB: [c.lineB, c.lineB, 0.1, false],
    lineW: [c.white, c.white, 0.1, false],
    wall: [c.wall, c.wallShade, 0.1, true],
    panel: [c.panel, c.panelShade, 0.1, true],
    steel: [c.steel, c.steel, 0.1, false],
    glass: [c.glass, c.glass, 0.1, false],
    curtain: [c.curtain, c.curtainShade, 0.1, true],
    white: [c.white, c.whiteShade, 0.1, true],
    green: [c.green, c.greenShade, 0.1, true],
  };
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, { threshold, outline });
    mesh.name = key;
    gym.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
