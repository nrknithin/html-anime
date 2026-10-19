// route-bus.js - a Japanese local route bus (rosen basu), the small cream city / countryside bus that pulls up at the
// rural bus stop in slice-of-life anime. Real size. Static body; the two folding doors are joints (option `doors`).
// Contract: harness/lab/README.md. Meters, +Y up, the front faces +Z, its left is +X (the kerb side in Japan, so both
// doors are on +X, the lit side the front-left camera sees), stands on y = 0 (tyres), centred on x = 0, z = 0.
//
// Construction (triangle soups merged per material, flat-shaded, every triangle wound away from a point inside its
// solid, never by hand):
//   TUB      one closed skin of cross-sections along z. Each section is a rounded rectangle: vertical walls, the roof
//            edges rounded at r 0.3 (5 steps), a flat floor. Section width and roof height shrink near the two ends on
//            quarter circles (r 0.15), so the front and back corners are rounded in plan and in profile and the end caps
//            stay flat. The wall carries fixed levels, and each band between two levels is its own material key, so the
//            livery stripes, the window band, the door openings and the dark underside are flush parts of the one skin (no z-fighting):
//            lower red band 0.76-0.86, brown pinstripe 1.08-1.13, red band 1.13-1.27, windows 1.32-2.30. Wheel arches
//            raise the section floor on a circle round each axle (levels below it collapse), and a dark liner box closes
//            the tunnel. The door openings move the +X wall in 0.6 m (a dark stairwell), with doubled
//            sections at the jambs so the step faces are square.
//   FRONT    a big flat windscreen (glass quad 6 mm proud on a dark surround 3 mm proud), two dark wipers, the
//            destination sign box above it (dark housing, a blank panel, no text), rectangular headlights at the
//            corners, a dark bumper, and the big Japanese bus mirrors: dark stalks out and forward from the roof corners,
//            mirror heads hanging in front of the windscreen corners. BACK: rear window, red tail lamps, bumper.
//   SIDES    windows in a row (glass flush in the skin, body-colour pillars 0.1 m), a driver's window, the two doors on
//            +X: front door ahead of the front axle, middle door mid-wheelbase; inside each opening a dark stairwell
//            with two pale steps, which is what reads when the doors fold open.
//   DOORS    each a two-leaf folding door: leaf A hinged at one jamb (joint doorF / doorM), leaf B hinged on A's free
//            edge (doorFb / doorMb). Leaves are glass slabs with their own hull (the hull is the frame).
//   ROOF     the air-conditioner pod: a chamfered box on the roof, two dark vent slots.
//   WHEELS   tyre lathes about X (dark), a pale hub disc proud of the face and a dark axle nut; front singles, rear
//            duals (6 tyres).
// Budget: 8085 triangles, 15 meshes (11 merged materials + 4 door leaves).
// Proportions (real size; base unit the length L = 9.0 m): width 2.30, roof 2.80, AC top 3.00; axles z +2.60 / -1.80
//   (wheelbase 4.4, overhang 1.9 front / 2.7 rear), tyre r 0.48, arch r 0.56; floor 0.32; front door z 3.40-4.25,
//   middle door z 0.20-1.20, door head 2.30.
// Options: build(THREE, kit, colors, { height, doors, night }).
//   height  scales everything uniformly so the top is `height` (default 3.0 m).
//   doors   0 closed (default) .. 1 open (leaf A 84 deg in, B folded back on it).
//   night   false (default) / true: windows, door glass, the stairwells, the sign and the headlights go to the
//           practical light at a glow threshold.
// Sign convention: doorF / doorM rotate about +Y; +ry swings the front leaf's free edge to -X (inward), the middle
//   door uses -ry (its leaf runs the other way). B is set to -2x A's angle so it folds flat back.
// Colours (noon, the bus stop's script, so they compose): body moon #fff6e4 / sky #f2d7ae; livery bands, tail lamps
//   accent #c4452d / iris #5c3d32; pinstripe and bumpers iris / hair #241c16; glass and door leaves iris / hair;
//   tyres, liners, underside, mirrors, wipers, surrounds and the stairwell walls hair / hair; door steps, the blank sign
//   panel and headlights sclera #f6f3ee / sky; hubs sclera / sky; AC pod sky / skin #f0c2ae. Pale parts at threshold
//   0.1, so the front (dot 0.30) stays lit. NIGHT: glass, leaves, stairwell, steps, sign and headlights go to practical
//   #fffaf2 / sclera at glow threshold -0.25, and the paint drops to its dark pair (body iris / hair, stripes accent /
//   hair, pinstripe hair) so the lit windows carry the frame, as a bus at dusk does.

export const meta = {
  name: "route-bus",
  height: 3.0,
  script: "noon",
  colors: {
    body: "#fff6e4", bodyShade: "#f2d7ae",
    stripe: "#c4452d", stripeShade: "#5c3d32",
    pin: "#5c3d32", pinShade: "#241c16",
    glass: "#5c3d32", glassShade: "#241c16",
    trim: "#241c16", trimShade: "#241c16",
    inner: "#241c16", innerShade: "#241c16",
    step: "#f6f3ee", stepShade: "#f2d7ae",
    hub: "#f6f3ee", hubShade: "#f2d7ae",
    lamp: "#f6f3ee", lampShade: "#f2d7ae",
    sign: "#f6f3ee", signShade: "#f2d7ae",
    ac: "#f2d7ae", acShade: "#f0c2ae",
    light: "#fffaf2", lightShade: "#f6f3ee",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, doors = 0, night = false } = opts;
  const root = new THREE.Group();
  root.name = "route-bus";
  const bus = new THREE.Group(); // the uniform size scale lives here
  bus.name = "body";
  bus.scale.setScalar(height / meta.height);
  root.add(bus);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  function tri(key, a, b, e, ref) {
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-8) return;
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
  function beam(key, a, b, w, h, up = [0, 1, 0]) {
    const d = sub(b, a);
    const nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
    const s = nrm(cross(d, up)), u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // a closed lathe about the X axis at (y, z): prof = [[r, x], ...] from one face to the other
  function wheelLathe(key, prof, y, z, sides = 16) {
    const xs = prof.map((p) => p[1]);
    const ref = [(Math.min(...xs) + Math.max(...xs)) / 2, y, z];
    const ring = (r, x) => Array.from({ length: sides }, (_, i) => {
      const a = (i / sides) * Math.PI * 2;
      return [x, y + r * Math.cos(a), z + r * Math.sin(a)];
    });
    const rings = prof.map(([r, x]) => ring(r, x));
    for (let j = 0; j < rings.length - 1; j++)
      for (let i = 0; i < sides; i++) {
        const k = (i + 1) % sides;
        quad(key, rings[j][i], rings[j][k], rings[j + 1][k], rings[j + 1][i], ref);
      }
    for (const [r, x] of [prof[0], prof[prof.length - 1]]) {
      const cen = [x, y, z], rg = ring(r, x);
      for (let i = 0; i < sides; i++) tri(key, cen, rg[i], rg[(i + 1) % sides], ref);
    }
  }

  // ---------- layout ----------
  const L = 9.0, W = 2.3, H = 2.8, HW = W / 2, ZF = L / 2, ZB = -L / 2;
  const RR = 0.3, RC = 0.15, FLOOR = 0.32; // roof edge radius, end corner radius, skirt bottom
  const AX = [2.6, -1.8], TR = 0.48, AR = 0.56, AY = TR; // axles, tyre r, arch r
  const DOORS = [[3.4, 4.25], [0.2, 1.2]]; // +X door openings (z0, z1)
  const DEPTH = 0.6, DOOR_TOP = 2.3;
  const WY0 = 1.32, WY1 = 2.3; // window band
  const LEVELS = [0.76, 0.86, 1.08, 1.13, 1.27, WY0, WY1, WY1]; // wall levels above the floor (the doubled one is the door head)
  const BAND = ["body", "stripe", "body", "pin", "stripe", "body", "win", "head", "body"]; // from floor to each level, then to shoulder
  const split = (z0, z1, n, gap = 0.1) => Array.from({ length: n }, (_, i) => {
    const w = (z1 - z0 - gap * (n - 1)) / n;
    return [z0 + i * (w + gap), z0 + i * (w + gap) + w];
  });
  const WIN = {
    "+x": [...split(1.32, 3.25, 2), ...split(-4.3, 0.1, 4)],
    "-x": [[3.35, 4.3], ...split(-4.3, 3.25, 7)],
  };
  const inDoor = (z) => DOORS.some(([a, b]) => z > a && z < b);
  const inWin = (side, z) => WIN[side].some(([a, b]) => z > a && z < b);

  // section shape at z
  const endD = (z) => Math.max(0, RC - (ZF - Math.abs(z)));
  const shrink = (z) => { const d = Math.min(endD(z), RC); return RC * (1 - Math.sqrt(Math.max(0, 1 - (d / RC) ** 2))); };
  const floorAt = (z) => {
    let y = FLOOR;
    for (const za of AX) if (Math.abs(z - za) < AR) y = Math.max(y, AY + Math.sqrt(AR * AR - (z - za) ** 2));
    return y;
  };
  // section points (closed loop) and the band key of each segment to the next point
  function section(z, door) {
    const w = HW - shrink(z), top = H - shrink(z), sh = top - RR, yb = floorAt(z);
    const pts = [], keys = [];
    const ys = [yb, ...LEVELS.map((y) => Math.max(y, yb))];
    // +X wall going up
    ys.forEach((y, i) => {
      const recess = door && i < ys.length - 1; // all but the upper copy of the door-head level
      pts.push([recess ? w - DEPTH : w, y, z]);
      keys.push(i === ys.length - 2 && door ? "inner" : null);
    });
    const N = 5, arcPts = (sx) => Array.from({ length: N + 1 }, (_, i) => {
      const a = (i / N) * (Math.PI / 2);
      return [sx * (w - RR + RR * Math.cos(a)), sh + RR * Math.sin(a), z];
    });
    const arcR = arcPts(1), arcL = arcPts(-1).reverse();
    for (const p of arcR) (pts.push(p), keys.push("body"));
    for (const p of arcL) (pts.push(p), keys.push("body"));
    // -X wall going down
    for (let i = ys.length - 1; i >= 0; i--) (pts.push([-w, ys[i], z]), keys.push(null));
    return { pts, ys, w, top, sh, yb };
  }
  // the band key between point i and i+1 of a section loop, judged at the section pair's mid z
  function keyFor(i, n, zm, door) {
    const nWall = LEVELS.length + 1; // points on one wall
    const side = i < nWall - 1 ? "+x" : i >= n - nWall ? "-x" : null;
    if (i === n - 1) return "trim"; // floor (closing segment): dark underside and wheel wells
    if (!side) return "body";
    const b = side === "+x" ? i : n - 2 - i; // band index from the floor
    if (side === "+x" && door && b < BAND.length - 1) return "inner";
    let k = BAND[b];
    if (k === "win") k = inWin(side, zm) ? "glass" : "body";
    if (k === "head") k = "body";
    return k;
  }

  // section stations: a coarse grid, fine near the arches and the ends, every window and door edge
  const zs = new Set();
  for (let z = ZB; z <= ZF + 1e-9; z += 0.25) zs.add(+z.toFixed(4));
  for (const za of AX) for (let i = -10; i <= 10; i++) zs.add(+(za + (i / 10) * AR).toFixed(4));
  for (let i = 0; i <= 6; i++) { zs.add(+(ZF - (i / 6) * RC).toFixed(4)); zs.add(+(ZB + (i / 6) * RC).toFixed(4)); }
  for (const side of ["+x", "-x"]) for (const [a, b] of WIN[side]) (zs.add(a), zs.add(b));
  const stations = [];
  for (const z of [...zs].sort((a, b) => a - b)) {
    const d = DOORS.find(([a, b]) => Math.abs(z - a) < 1e-6 || Math.abs(z - b) < 1e-6);
    if (d) {
      // doubled jamb section: flush on the outside of the opening, recessed inside it
      const entering = Math.abs(z - d[0]) < 1e-6;
      stations.push({ z, door: !entering }, { z, door: entering });
    } else stations.push({ z, door: inDoor(z) });
  }
  const secs = stations.map((s) => ({ ...s, ...section(s.z, s.door) }));
  for (let s = 0; s < secs.length - 1; s++) {
    const A = secs[s], B = secs[s + 1];
    const zm = (A.z + B.z) / 2, n = A.pts.length;
    let refZ = zm;
    if (A.z === B.z) refZ = A.door ? zm + 0.3 : zm - 0.3; // the jamb step: the solid is on the flush side
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      let key = keyFor(i, n, zm, A.z === B.z ? true : inDoor(zm));
      if (A.z === B.z && !(i < LEVELS.length + 1)) continue; // only the +X wall steps at a jamb
      const ref = [0, 1.3, refZ];
      if (A.z === B.z) key = "inner";
      quad(key, A.pts[i], A.pts[j], B.pts[j], B.pts[i], ref);
    }
  }
  // flat end caps, as horizontal strips so the livery bands run across them
  for (const E of [secs[0], secs[secs.length - 1]]) {
    const n = E.pts.length, ref = [0, 1.3, E.z > 0 ? E.z - 1 : E.z + 1];
    for (let i = 0; i < n / 2 - 1; i++) {
      const a = E.pts[i], b = E.pts[i + 1], d = E.pts[n - 1 - i], e = E.pts[n - 2 - i];
      quad(keyFor(i, n, E.z, false) === "glass" ? "body" : keyFor(i, n, E.z, false), a, b, e, d, ref);
    }
  }
  // door steps: a low pale step inside each opening, a second one deeper in
  for (const [z0, z1] of DOORS) {
    box("step", HW - 0.33, FLOOR + 0.05, (z0 + z1) / 2, 0.5, 0.1, z1 - z0 - 0.01);
    box("step", HW - 0.5, FLOOR + 0.2, (z0 + z1) / 2, 0.2, 0.2, z1 - z0 - 0.01);
  }
  // arch liners: dark boxes that close the wheel tunnels
  for (const za of AX) box("trim", 0, (0.2 + AY + AR) / 2 - 0.02, za, 1.0, AY + AR - 0.2, 2 * AR - 0.02);

  // ---------- front ----------
  const zf = ZF;
  const fq = (key, x0, x1, y0, y1, o) => quad(key, [x0, y0, zf + o], [x1, y0, zf + o], [x1, y1, zf + o], [x0, y1, zf + o], [0, 1.3, zf - 1]);
  fq("trim", -0.97, 0.97, 1.0, 2.34, 0.003); // windscreen surround
  fq("glass", -0.93, 0.93, 1.04, 2.3, 0.006); // the big windscreen
  box("trim", 0, 2.53, zf + 0.02, 1.7, 0.3, 0.04); // destination sign housing
  fq("sign", -0.79, 0.79, 2.42, 2.64, 0.042); // blank sign panel
  for (const s of [-1, 1]) {
    box("lamp", s * 0.83, 0.62, zf + 0.012, 0.3, 0.13, 0.03); // headlights
    box("trim", s * 0.83, 0.62, zf + 0.004, 0.36, 0.19, 0.012);
    beam("trim", [s * 0.62, 1.08, zf + 0.012], [s * 0.1, 1.5, zf + 0.012], 0.035, 0.02, [0, 0, 1]); // wipers
    // mirror stalks from the roof corner, out and forward, then down to the mirror head
    const r0 = [s * (HW - 0.12), 2.45, zf - 0.3], r1 = [s * (HW + 0.12), 2.55, zf + 0.42], r2 = [s * (HW + 0.12), 2.28, zf + 0.42];
    beam("trim", r0, r1, 0.045, 0.045);
    beam("trim", r1, r2, 0.045, 0.045, [0, 0, 1]);
    box("trim", s * (HW + 0.12), 2.02, zf + 0.42, 0.24, 0.42, 0.07); // mirror head
  }
  box("pin", 0, 0.39, zf + 0.06, W - 0.12, 0.22, 0.14); // bumper

  // ---------- back ----------
  const zb = ZB;
  const bq = (key, x0, x1, y0, y1, o) => quad(key, [x0, y0, zb - o], [x1, y0, zb - o], [x1, y1, zb - o], [x0, y1, zb - o], [0, 1.3, zb + 1]);
  bq("trim", -0.82, 0.82, 1.56, 2.34, 0.003);
  bq("glass", -0.78, 0.78, 1.6, 2.3, 0.006);
  box("trim", 0, 2.52, zb - 0.015, 1.0, 0.22, 0.03); // rear sign housing
  bq("sign", -0.44, 0.44, 2.45, 2.59, 0.032);
  for (const s of [-1, 1]) box("stripe", s * 0.88, 0.95, zb - 0.012, 0.22, 0.42, 0.03); // tail lamps
  box("pin", 0, 0.39, zb - 0.06, W - 0.12, 0.22, 0.14);

  // ---------- roof: air-conditioner pod ----------
  {
    const x0 = 0.92, x1 = 0.8, y0 = H - 0.03, y1 = 3.0, z0 = -1.6, z1 = 1.1, ch = 0.12;
    hex("ac", [[-x0, y0, z0], [x0, y0, z0], [x0, y0, z1], [-x0, y0, z1], [-x1, y1, z0 + ch], [x1, y1, z0 + ch], [x1, y1, z1 - ch], [-x1, y1, z1 - ch]]);
    for (const zz of [-0.9, 0.4]) quad("trim", [-0.55, y1 + 0.004, zz - 0.25], [0.55, y1 + 0.004, zz - 0.25], [0.55, y1 + 0.004, zz + 0.25], [-0.55, y1 + 0.004, zz + 0.25], [0, y1 - 1, zz]);
  }

  // ---------- wheels ----------
  const tyre = (xa, xb) => [[0.3, xa], [TR - 0.04, xa], [TR, xa + 0.04], [TR, xb - 0.04], [TR - 0.04, xb], [0.3, xb]];
  const span = (p, q) => [Math.min(p, q), Math.max(p, q)];
  for (const s of [-1, 1]) {
    for (const [za, dual] of [[AX[0], false], [AX[1], true]]) {
      const xo = s * (HW - 0.03), wd = 0.28; // outer tyre face, tyre width
      wheelLathe("trim", tyre(...span(xo, xo - s * wd)), AY, za);
      if (dual) wheelLathe("trim", tyre(...span(xo - s * (wd + 0.02), xo - s * (2 * wd + 0.02))), AY, za);
      // hub: a pale disc proud of the tyre face, a hub cap proud of it
      const [h0, h1] = span(xo, xo + s * 0.015), [k0, k1] = span(xo + s * 0.015, xo + s * 0.06);
      wheelLathe("hub", [[0.3, h0], [0.3, h1]], AY, za);
      wheelLathe("trim", [[0.07, k0], [0.07, k1]], AY, za, 10);
    }
  }

  // ---------- doors: two-leaf folding, glass slabs on hinges ----------
  const LEAF_Y0 = FLOOR + 0.1, LEAF_Y1 = DOOR_TOP - 0.03, XH = HW - 0.05;
  function leafGeo(len, dir) {
    soups.__leaf = [];
    box("__leaf", 0, (LEAF_Y0 + LEAF_Y1) / 2, (dir * len) / 2, 0.035, LEAF_Y1 - LEAF_Y0, len - 0.012);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(soups.__leaf, 3));
    g.computeVertexNormals();
    delete soups.__leaf;
    return g;
  }
  const glassCol = night ? [c.light, c.lightShade, -0.25] : [c.glass, c.glassShade, 0.1];
  const leafMats = [];
  function door(name, z0, z1, hingeAtFront) {
    const len = (z1 - z0) / 2, dir = hingeAtFront ? -1 : 1;
    const A = new THREE.Group();
    A.name = name;
    A.position.set(XH, 0, hingeAtFront ? z1 : z0);
    const B = new THREE.Group();
    B.name = name + "b";
    B.position.set(0, 0, dir * len);
    for (const g of [A, B]) {
      const m = kit.toon(leafGeo(len, dir), glassCol[0], glassCol[1], { threshold: glassCol[2] });
      m.name = g.name + "-leaf";
      g.add(m);
      leafMats.push(m);
    }
    A.add(B);
    bus.add(A);
    joints[name] = A;
    joints[name + "b"] = B;
  }
  door("doorF", DOORS[0][0], DOORS[0][1], true);
  door("doorM", DOORS[1][0], DOORS[1][1], false);

  // ---------- meshes ----------
  const lit = (base, shade, t) => (night ? [c.light, c.lightShade, -0.25, true] : [base, shade, t, true]);
  const MAT = {
    // at night the paint drops to its dark pair, so the practical-lit glass, sign and lamps carry the frame
    body: night ? [c.pin, c.pinShade, 0.1, true] : [c.body, c.bodyShade, 0.1, true],
    stripe: night ? [c.stripe, c.pinShade, 0.1, true] : [c.stripe, c.stripeShade, 0.1, true],
    pin: night ? [c.pinShade, c.pinShade, 0.1, true] : [c.pin, c.pinShade, 0.1, true],
    glass: lit(c.glass, c.glassShade, 0.1),
    trim: [c.trim, c.trimShade, 0.1, true],
    inner: lit(c.inner, c.innerShade, 0.1),
    sign: lit(c.sign, c.signShade, 0.1),
    lamp: lit(c.lamp, c.lampShade, 0.1),
    hub: [c.hub, c.hubShade, 0.1, true],
    step: lit(c.step, c.stepShade, 0.1),
    ac: night ? [c.pin, c.pinShade, 0.1, true] : [c.ac, c.acShade, 0.1, true],
  };
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, { threshold, outline });
    mesh.name = key;
    bus.add(mesh);
  }

  // ---------- pose ----------
  const OPEN = 84 * (Math.PI / 180);
  const REST = { doorF: 0, doorFb: 0, doorM: 0, doorMb: 0 };
  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    const a = Math.max(0, Math.min(1, doors)) * OPEN;
    const T = { ...REST, doorF: a, doorFb: -2 * a, doorM: -a, doorMb: 2 * a };
    for (const [k, v] of Object.entries(T)) joints[k].rotation.set(0, v, 0);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
