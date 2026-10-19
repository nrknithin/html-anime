// coin-laundry.js - a late-night coin laundromat, the empty fluorescent room of every anime night scene, as a cutaway
// set piece at real size, with one clip: two washers mid-wash, drums turning and the laundry tumbling.
// Contract: harness/lab/README.md. Meters, +Y up, the open (cutaway) sides face +X and +Z, so the lab's front-left
// cameras look in: the back wall is -Z, the street front (the big window) is the -X wall. Floor on y = 0, centred on
// x = z = 0.
//
// Construction (boxes, ring solids, holed panels, inward drums and low ellipsoids, all triangle soups merged per
// material, so the room is about twenty meshes; boxes are flat-shaded, rings, drums and blobs carry smooth normals).
// Every triangle is wound away from a point inside its solid (box centre, ring core, outside an inward drum, blob
// centre), never by hand.
//   SHELL     a floor slab with a tile grid, the back wall and the window wall as boxes 12 cm thick, a dark tiled band
//             (wainscot) round the lower walls, dark caps on the cut wall tops and ends. An L soffit (a dropped ceiling
//             band 0.7 m deep) runs along both wall tops; the fluorescent fixtures hang under it, so no light floats
//             in the open cutaway.
//   WASHERS   four front-loaders on a low plinth against the back wall: a white body whose front panel is cut round the
//             porthole, a dark control strip with a lit display, coin slot and dial, a rubber gasket and a dark drum
//             with three white baffles behind it, a round door (ring solid + glass streaks; the glass is two highlights,
//             as anime paints it, so the drum and laundry show through). Washers 2 and 3 run (their drums are joints);
//             washer 1 is idle; washer 4's door stands open on a right-hand hinge, a sock hanging over the gasket.
//   DRYERS    a 3 x 2 stack on the back wall, left of the washers: white bodies, a big round dark-glass door each, a
//             lint slot and a control strip.
//   AROUND    a change machine on the window wall beside the dryers (red body, pale front panel, lit display, bill
//             slot, coin cup, a lit header); a bench under the window with a magazine on it; a folding table mid-room
//             with a slotted laundry basket heaped with clothes; a wall clock (ten past two) and two blank posters above
//             the washers; the big window: aluminium frame, mullion and transom, dark glass with highlight streaks.
// Proportions (real size, base unit the wall height H = 2.6 m): interior 5.3 (x) by 3.5 (z); washers 0.62 x 0.86 x
//   0.66 on a 0.10 plinth, porthole 0.43 across at 0.50; dryers 0.66 x 0.86 x 0.68, stack top 1.80; change machine
//   0.50 x 1.55 x 0.40; table top 0.90, 1.5 x 0.7; bench seat 0.45; window sill 0.90, head 2.30, 1.85 m wide;
//   soffit 2.48-2.60, fixtures 1.2 x 0.26 under it.
// Options: build(THREE, kit, colors, { height }): height scales the whole room uniformly so the wall top is `height`
//   (default 2.6 m).
// Clip `spin` (2 s, loops): washer 2's drum turns two revolutions counter-clockwise (seen from the front), washer 3's
//   two clockwise; each drum's laundry (four blobs) is carried up the rising side to ~110 deg, then drops back along a
//   falling chord, three lifts a loop, each blob spinning on itself. pose("spin@0.7"); rest is spin@0.
// Joints: drumA, drumB (the drums, rotation z), blobA0..3, blobB0..3 (the laundry, position + rotation).
// Budget: ~6.5k triangles, 27 meshes. Ink in pixels: shell 3, machines 2.5, small parts 2 (a room is seen small).
// Colours (indigo, the cool night script), base / shade:
//   walls                     line #e7eefc / moon #d5e2ff at threshold 0.45 (window wall lit, back wall in its shade)
//   wainscot, caps, soffit, control strips, drums, gaskets, glass, plinth, table legs  sky #1b2d6b flat
//   floor                     moon #d5e2ff flat, tile grid line #e7eefc
//   washers and dryers        sclera #f6f3ee / moon #d5e2ff at threshold 0.1
//   door rings, window frame, drum baffles, clock face, change panel   moon #d5e2ff / sky #1b2d6b at threshold 0.1
//   fixtures, glass streaks, change header  line #e7eefc glowing (threshold -0.25); displays practical #f0c36a glowing
//   change machine, bench seat, sock, poster   accent #e23b4a / sky #1b2d6b
//   basket, magazine, laundry  iris #e7a04a / accent #e23b4a; practical #f0c36a / iris #e7a04a; sclera / moon

export const meta = {
  name: "coin-laundry",
  height: 2.6,
  script: "indigo",
  colors: {
    wall: "#e7eefc", wallShade: "#d5e2ff",
    dark: "#1b2d6b",
    floor: "#d5e2ff", grid: "#e7eefc",
    white: "#f6f3ee", whiteShade: "#d5e2ff",
    metal: "#d5e2ff", metalShade: "#1b2d6b",
    glow: "#e7eefc", lamp: "#f0c36a",
    red: "#e23b4a", redShade: "#1b2d6b",
    orange: "#e7a04a", orangeShade: "#e23b4a",
    yellow: "#f0c36a", yellowShade: "#e7a04a",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const NATURAL = 2.6;
  const { height = NATURAL } = opts;
  const root = new THREE.Group();
  root.name = "coin-laundry";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / NATURAL);
  root.add(body);
  const joints = {};
  const TAU = Math.PI * 2, D = Math.PI / 180;

  // ---------- triangle soups with normals, through a placement matrix ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  let soups = {}; // the current target: material key -> { p, n }
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
  // box; skip: face names to leave out (bottom, top, back = z0, right = x1, front = z1, left = x0)
  const FACES = { bottom: [0, 1, 2, 3], top: [4, 5, 6, 7], back: [0, 1, 5, 4], right: [1, 2, 6, 5], front: [2, 3, 7, 6], left: [3, 0, 4, 7] };
  function box(key, x0, x1, y0, y1, z0, z1, skip = []) {
    const p = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    const ref = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    for (const [name, f] of Object.entries(FACES)) if (!skip.includes(name)) quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  const pol = (cx, cy, r, a, z) => [cx + r * Math.cos(a), cy + r * Math.sin(a), z];
  // ring solid about the z axis through (cx, cy): radii ri..ro, depth z0..z1
  function ring(key, cx, cy, ri, ro, z0, z1, seg = 28) {
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * TAU, b = ((j + 1) / seg) * TAU, m = (a + b) / 2;
      const ref = pol(cx, cy, (ri + ro) / 2, m, (z0 + z1) / 2);
      const na = [Math.cos(a), Math.sin(a), 0], nb = [Math.cos(b), Math.sin(b), 0];
      tri(key, pol(cx, cy, ro, a, z0), pol(cx, cy, ro, b, z0), pol(cx, cy, ro, b, z1), ref, na, nb, nb);
      tri(key, pol(cx, cy, ro, a, z0), pol(cx, cy, ro, b, z1), pol(cx, cy, ro, a, z1), ref, na, nb, na);
      const ia = mul(na, -1), ib = mul(nb, -1);
      tri(key, pol(cx, cy, ri, a, z0), pol(cx, cy, ri, b, z0), pol(cx, cy, ri, b, z1), ref, ia, ib, ib);
      tri(key, pol(cx, cy, ri, a, z0), pol(cx, cy, ri, b, z1), pol(cx, cy, ri, a, z1), ref, ia, ib, ia);
      for (const z of [z0, z1]) quad(key, pol(cx, cy, ri, a, z), pol(cx, cy, ro, a, z), pol(cx, cy, ro, b, z), pol(cx, cy, ri, b, z), ref);
    }
  }
  // inward-facing tube (a drum or gasket seen from inside): radius r0 at z0 .. r1 at z1, normals toward the axis
  function inTube(key, cx, cy, r0, r1, z0, z1, seg = 24) {
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * TAU, b = ((j + 1) / seg) * TAU, m = (a + b) / 2;
      const ref = pol(cx, cy, 2 * Math.max(r0, r1), m, (z0 + z1) / 2);
      const na = [-Math.cos(a), -Math.sin(a), 0], nb = [-Math.cos(b), -Math.sin(b), 0];
      tri(key, pol(cx, cy, r0, a, z0), pol(cx, cy, r0, b, z0), pol(cx, cy, r1, b, z1), ref, na, nb, nb);
      tri(key, pol(cx, cy, r0, a, z0), pol(cx, cy, r1, b, z1), pol(cx, cy, r1, a, z1), ref, na, nb, na);
    }
  }
  // flat disc facing +Z (dir 1) or -Z (dir -1)
  function disc(key, cx, cy, r, z, dir = 1, seg = 24) {
    for (let j = 0; j < seg; j++)
      tri(key, [cx, cy, z], pol(cx, cy, r, (j / seg) * TAU, z), pol(cx, cy, r, ((j + 1) / seg) * TAU, z), [cx, cy, z - dir]);
  }
  // a rectangle x0..x1, y0..y1 at depth z, facing +Z, cut round a circular hole (cx, cy, r)
  function holedPanel(key, x0, x1, y0, y1, z, cx, cy, r, seg = 28) {
    const ref = [cx, cy, z - 1];
    const edge = (a) => {
      const dx = Math.cos(a), dy = Math.sin(a);
      const t = Math.min(dx > 1e-9 ? (x1 - cx) / dx : dx < -1e-9 ? (x0 - cx) / dx : Infinity,
        dy > 1e-9 ? (y1 - cy) / dy : dy < -1e-9 ? (y0 - cy) / dy : Infinity);
      return [cx + dx * t, cy + dy * t, z];
    };
    const corners = [[x1, y1], [x0, y1], [x0, y0], [x1, y0]].map(([x, y]) => ({ q: [x, y, z], a: (Math.atan2(y - cy, x - cx) + TAU) % TAU }));
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * TAU, b = ((j + 1) / seg) * TAU;
      const ia = pol(cx, cy, r, a, z), ib = pol(cx, cy, r, b, z);
      const outer = [edge(a), ...corners.filter((k) => k.a > a && k.a < b).map((k) => k.q), edge(b)];
      for (let k = 0; k < outer.length - 1; k++) tri(key, ia, outer[k], outer[k + 1], ref);
      tri(key, ia, outer[outer.length - 1], ib, ref);
    }
  }
  // low-poly ellipsoid (a cloth lump), centre ctr, radii rr, smooth normals
  function blob(key, ctr, rr, lat = 5, lon = 8) {
    const P = (i, j) => {
      const t = (i / lat) * Math.PI, f = (j / lon) * TAU;
      const u = [Math.sin(t) * Math.cos(f), Math.cos(t), Math.sin(t) * Math.sin(f)];
      return { q: add(ctr, [u[0] * rr[0], u[1] * rr[1], u[2] * rr[2]]), n: nrm([u[0] / rr[0], u[1] / rr[1], u[2] / rr[2]]) };
    };
    for (let i = 0; i < lat; i++)
      for (let j = 0; j < lon; j++) {
        const a = P(i, j), b = P(i + 1, j), e = P(i + 1, j + 1), d = P(i, j + 1);
        tri(key, a.q, b.q, e.q, ctr, a.n, b.n, e.n);
        tri(key, a.q, e.q, d.q, ctr, a.n, e.n, d.n);
      }
  }
  // run fn with a placement (translation + yaw about y) composed onto the current one
  const place = (x, y, z, yaw, fn) => {
    const saved = M;
    M = saved.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z)).multiply(new THREE.Matrix4().makeRotationY(yaw));
    fn();
    M = saved;
  };
  // run fn into a fresh soup set with the identity placement (for a moving part); returns that set
  const own = (fn) => {
    const [savedS, savedM] = [soups, M];
    soups = {};
    M = new THREE.Matrix4();
    fn();
    const out = soups;
    [soups, M] = [savedS, savedM];
    return out;
  };

  // ---------- room layout ----------
  const H = 2.6, F = 0.05, T = 0.12; // wall top, floor level, wall thickness
  const XL = -2.65, XR = 2.65, ZB = -1.75, ZF = 1.75; // interior: window wall x = XL, back wall z = ZB
  const BAND = 0.9; // wainscot top = window sill

  // ---------- shell ----------
  box("dark", XL - T, XR, 0, F - 0.002, ZB - T, ZF); // floor slab (its section reads dark at the cut)
  plateRect("floor", XL, XR, ZB, ZF, F);
  for (let x = XL + 0.5; x < XR - 0.01; x += 0.5) plateRect("grid", x - 0.007, x + 0.007, ZB, ZF, F + 0.001);
  for (let z = ZB + 0.5; z < ZF - 0.01; z += 0.5) plateRect("grid", XL, XR, z - 0.007, z + 0.007, F + 0.001);
  function plateRect(key, x0, x1, z0, z1, y) { quad(key, [x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [0, y - 1, 0]); }
  // back wall and window wall (window opening z -0.95..1.45, y 0.90..2.30)
  const WZ0 = -0.4, WZ1 = 1.45, WY0 = BAND, WY1 = 2.3;
  box("wall", XL - T, XR, F, H - 0.02, ZB - T, ZB);
  box("wall", XL - T, XL, F, WY0, ZB, ZF);
  box("wall", XL - T, XL, WY1, H - 0.02, ZB, ZF);
  box("wall", XL - T, XL, WY0, WY1, ZB, WZ0);
  box("wall", XL - T, XL, WY0, WY1, WZ1, ZF);
  // dark caps on the cut wall tops and ends
  box("dark", XL - T, XR, H - 0.02, H, ZB - T, ZB);
  box("dark", XL - T, XL, H - 0.02, H, ZB, ZF);
  box("dark", XR, XR + 0.006, F, H, ZB - T, ZB);
  box("dark", XL - T, XL, F, H, ZF, ZF + 0.006);
  // wainscot band, 6 mm proud of the walls
  box("dark", XL, XR, F, BAND, ZB, ZB + 0.006);
  box("dark", XL, XL + 0.006, F, BAND, ZB + 0.006, ZF);
  box("wall", XL, XR, BAND, BAND + 0.025, ZB, ZB + 0.012); // a pale rail on the band
  box("wall", XL, XL + 0.012, BAND, BAND + 0.025, ZB + 0.012, WZ0);
  // window: frame on the inner face, mullion and transom, glass in the wall plane, two highlight streaks
  const wx = XL - T / 2;
  box("metal", XL - T, XL + 0.03, WY0 - 0.03, WY0, WZ0 - 0.03, WZ1 + 0.03); // sill
  box("metal", XL - T, XL + 0.02, WY1, WY1 + 0.04, WZ0 - 0.03, WZ1 + 0.03); // head
  for (const [z0, z1] of [[WZ0 - 0.03, WZ0 + 0.02], [WZ1 - 0.02, WZ1 + 0.03], [0.22, 0.28]]) box("metal", XL - T, XL + 0.02, WY0, WY1, z0, z1);
  box("metal", XL - T, XL + 0.015, 1.98, 2.02, WZ0, WZ1); // transom
  box("glass", wx - 0.005, wx + 0.005, WY0, WY1, WZ0, WZ1);
  place(0, 0, 0, 0, () => {
    const streak = (zc, w, k) => {
      const y0 = WY0 + 0.12, y1 = 1.9, sl = 0.35 * k;
      quad("streak", [wx + 0.007, y0, zc], [wx + 0.007, y0, zc + w], [wx + 0.007, y1, zc + w + sl], [wx + 0.007, y1, zc + sl], [wx - 1, 1, 0]);
    };
    streak(-0.32, 0.09, 1), streak(-0.18, 0.035, 1), streak(0.55, 0.11, 1), streak(0.74, 0.04, 1);
  });
  // soffit: an L dropped-ceiling band along both walls; fixtures hang under it
  const SY = 2.48, SD = 0.7;
  box("dark", XL, XR, SY, H - 0.02, ZB, ZB + SD);
  box("dark", XL, XL + SD, SY, H - 0.02, ZB + SD, ZF);
  for (const x of [-1.75, 0, 1.75]) box("glow", x - 0.6, x + 0.6, SY - 0.06, SY, ZB + SD - 0.28, ZB + SD - 0.02);
  for (const z of [-0.2, 1.1]) box("glow", XL + SD - 0.28, XL + SD - 0.02, SY - 0.06, SY, z - 0.55, z + 0.55);
  // clock (ten past two) and two blank posters above the washers
  const clk = [0.55, 1.9, ZB];
  place(...clk, 0, () => {
    ring("metal", 0, 0, 0.15, 0.18, 0, 0.04);
    disc("white", 0, 0, 0.15, 0.025);
    const hand = (a, len, w) => {
      const d = [Math.sin(a), Math.cos(a), 0], s = [Math.cos(a) * w, -Math.sin(a) * w, 0];
      quad("darkFlat", add(s, [0, 0, 0.03]), add(mul(s, -1), [0, 0, 0.03]), add(add(mul(d, len), mul(s, -1)), [0, 0, 0.03]), add(add(mul(d, len), s), [0, 0, 0.03]), [0, 0, -1]);
    };
    hand(65 * D, 0.08, 0.012), hand(60 * D, 0.125, 0.007);
  });
  box("red", 1.0, 1.42, 1.62, 2.18, ZB, ZB + 0.008);
  box("yellow", 1.55, 1.92, 1.7, 2.12, ZB, ZB + 0.008);
  box("white", 1.6, 1.87, 1.76, 1.86, ZB + 0.008, ZB + 0.012);
  box("white", 1.05, 1.37, 1.68, 1.76, ZB + 0.008, ZB + 0.012);

  // ---------- washers ----------
  const WW = 0.64, WX0 = -0.02, WD = 0.66, PL = 0.1, WH = 0.86;
  const wzf = ZB + 0.01 + WD; // washer front plane
  box("dark", WX0, WX0 + 4 * WW, F, F + PL, ZB + 0.006, wzf + 0.03); // plinth
  const DR = 0.155, DDEP = 0.32; // drum radius and depth
  function drumGeo() { // in drum-local coordinates: axis z, front at z = 0, inside to -z
    inTube("dark", 0, 0, DR, DR, 0, -DDEP);
    disc("dark", 0, 0, DR, -DDEP, 1);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU - Math.PI / 2, w = 0.14;
      const corner = (r, s, z) => pol(0, 0, r, a + s * w * (r === DR ? 1 : 0.55), z);
      const f = [corner(DR, -1, -0.01), corner(DR, 1, -0.01), corner(0.12, 1, -0.01), corner(0.12, -1, -0.01)];
      hex("metal", [...f, ...f.map((v) => [v[0], v[1], -DDEP + 0.01])]);
    }
    disc("metal", 0, 0, 0.035, -DDEP + 0.004, 1, 10);
  }
  function doorGeo(open) { // door local: ring centred at x = y = 0, glass plane z = 0.03
    ring("metal", 0, 0, 0.15, 0.215, 0, 0.055);
    box("metal", 0.2, 0.245, -0.05, 0.05, 0.015, 0.07); // handle
    const st = (x0, w, z) => quad("streak", [x0, -0.07, z], [x0 + w, -0.07, z], [x0 + w + 0.06, 0.09, z], [x0 + 0.06, 0.09, z], [0, 0, z - 1]);
    if (!open) st(-0.12, 0.03, 0.032), st(-0.075, 0.012, 0.032);
    else disc("glass", 0, 0, 0.152, 0.03, -1, 20), disc("glass", 0, 0, 0.152, 0.031, 1, 20); // open door: glass seen edge-on
  }
  const drumJ = {}, blobJ = {};
  for (let i = 0; i < 4; i++) {
    const xc = WX0 + WW * (i + 0.5), yb = F + PL, cy = yb + 0.42;
    box("white", xc - WW / 2 + 0.01, xc + WW / 2 - 0.01, yb, yb + WH, ZB + 0.01, wzf, ["front"]);
    holedPanel("white", xc - WW / 2 + 0.01, xc + WW / 2 - 0.01, yb, yb + WH, wzf, xc, cy, 0.165);
    // control strip: dark band, lit display, coin slot, dial
    box("dark", xc - 0.29, xc + 0.29, yb + WH - 0.15, yb + WH - 0.02, wzf, wzf + 0.012);
    box("lamp", xc + 0.04, xc + 0.15, yb + WH - 0.11, yb + WH - 0.06, wzf + 0.012, wzf + 0.016);
    box("metal", xc - 0.24, xc - 0.1, yb + WH - 0.1, yb + WH - 0.07, wzf + 0.012, wzf + 0.02);
    place(xc + 0.22, yb + WH - 0.085, wzf + 0.012, 0, () => ring("metal", 0, 0, 0.0, 0.035, 0, 0.025, 12));
    box("dark", xc - 0.2, xc + 0.2, yb + 0.05, yb + 0.07, wzf, wzf + 0.004); // kick panel seam
    // gasket from the hole into the drum
    inTube("dark", xc, cy, 0.165, DR, wzf, wzf - 0.05);
    const drumZ = wzf - 0.05;
    if (i === 1 || i === 2) {
      const key = i === 1 ? "A" : "B";
      const g = new THREE.Group();
      g.name = "drum" + key;
      g.position.set(xc, cy, drumZ);
      body.add(g);
      joints["drum" + key] = drumJ[key] = g;
      g.userData.soups = own(drumGeo);
      const tub = new THREE.Group(); // the laundry lives in the washer frame, not on the drum
      tub.name = "tub" + key;
      tub.position.set(xc, cy, drumZ);
      body.add(tub);
      blobJ[key] = [];
      const cols = key === "A" ? ["red", "white", "yellow", "orange"] : ["white", "orange", "white", "red"];
      for (let k = 0; k < 4; k++) {
        const b = new THREE.Group();
        b.name = `blob${key}${k}`;
        tub.add(b);
        joints[b.name] = b;
        b.userData.soups = own(() => blob(cols[k], [0, 0, 0], [0.068, 0.046, 0.058]));
        blobJ[key].push(b);
      }
    } else {
      place(xc, cy, drumZ, 0, drumGeo);
      if (i === 0) place(xc, cy, drumZ, 0, () => (blob("white", [0.03, -0.11, -0.12], [0.07, 0.035, 0.06]), blob("orange", [-0.05, -0.12, -0.2], [0.06, 0.03, 0.06])));
      if (i === 3) place(xc, cy, drumZ, 0, () => { // a sock over the gasket lip
        blob("red", [0.0, -0.13, 0.02], [0.05, 0.022, 0.06]);
        blob("red", [0.0, -0.2, 0.08], [0.028, 0.065, 0.025]);
      });
    }
    // door: closed (on the panel) or open 100 deg on a right-hand hinge
    if (i !== 3) place(xc, cy, wzf, 0, () => doorGeo(false));
    else {
      const hx = xc + 0.235, hz = wzf + 0.03;
      box("metal", hx - 0.03, hx + 0.01, cy - 0.06, cy + 0.06, wzf, hz + 0.01); // hinge
      place(hx, cy, hz, 100 * D, () => place(-0.235, 0, 0, 0, () => doorGeo(true)));
    }
  }

  // ---------- dryers: 3 x 2 stack ----------
  const DW = 0.68, DX0 = -2.2, DH = 0.86, DDp = 0.68, dzf = ZB + 0.01 + DDp;
  for (let col = 0; col < 3; col++)
    for (let row = 0; row < 2; row++) {
      const xc = DX0 + DW * (col + 0.5), yb = F + row * (DH + 0.02), cy = yb + 0.4;
      box("white", xc - DW / 2 + 0.01, xc + DW / 2 - 0.01, yb, yb + DH, ZB + 0.01, dzf);
      ring("metal", xc, cy, 0.2, 0.26, dzf, dzf + 0.045);
      disc("glass", xc, cy, 0.2, dzf + 0.012);
      place(xc, cy, dzf + 0.014, 0, () => {
        quad("streak", [-0.12, -0.08, 0], [-0.065, -0.08, 0], [0.0, 0.11, 0], [-0.055, 0.11, 0], [0, 0, -1]);
        quad("streak", [-0.035, -0.08, 0], [-0.015, -0.08, 0], [0.05, 0.11, 0], [0.03, 0.11, 0], [0, 0, -1]);
      });
      box("dark", xc - 0.3, xc + 0.3, yb + DH - 0.13, yb + DH - 0.02, dzf, dzf + 0.012);
      box("lamp", xc + 0.12, xc + 0.24, yb + DH - 0.1, yb + DH - 0.05, dzf + 0.012, dzf + 0.016);
      box("metal", xc - 0.24, xc - 0.1, yb + DH - 0.09, yb + DH - 0.06, dzf + 0.012, dzf + 0.02);
      box("dark", xc - 0.16, xc + 0.16, yb + 0.06, yb + 0.1, dzf, dzf + 0.006); // lint slot
    }

  // ---------- change machine (on the window wall between the dryers and the window, facing +X) ----------
  const CX1 = XL + 0.4, CZ0 = -0.98, CZ1 = -0.48, CH = F + 1.55;
  box("red", XL + 0.006, CX1, F, CH, CZ0, CZ1);
  box("glow", XL + 0.006, CX1 + 0.01, CH, CH + 0.16, CZ0 + 0.02, CZ1 - 0.02); // lit header
  box("metal", CX1, CX1 + 0.012, 0.55, 1.35, CZ0 + 0.07, CZ1 - 0.07); // front panel
  box("lamp", CX1 + 0.012, CX1 + 0.016, 1.18, 1.28, CZ0 + 0.12, CZ1 - 0.12); // display
  box("dark", CX1 + 0.012, CX1 + 0.02, 0.98, 1.02, CZ0 + 0.14, CZ1 - 0.14); // bill slot
  for (const z of [CZ0 + 0.15, CZ0 + 0.25, CZ0 + 0.35]) box("red", CX1 + 0.012, CX1 + 0.03, 0.82, 0.88, z - 0.03, z + 0.03); // buttons
  box("dark", CX1 + 0.012, CX1 + 0.08, 0.6, 0.7, CZ0 + 0.16, CZ1 - 0.16); // coin cup

  // ---------- bench under the window, a magazine on it ----------
  const BX0 = XL + 0.02, BX1 = XL + 0.42, BZ0 = -0.25, BZ1 = 1.15, BY = F + 0.45;
  box("red", BX0, BX1, BY - 0.06, BY, BZ0, BZ1);
  for (const z of [BZ0 + 0.1, BZ1 - 0.1]) {
    box("darkInk", BX0 + 0.05, BX1 - 0.05, F, BY - 0.06, z - 0.03, z + 0.03);
  }
  place(XL + 0.22, BY, 0.6, 20 * D, () => {
    box("yellow", -0.105, 0.105, 0, 0.012, -0.14, 0.14);
    box("red", -0.106, 0.106, 0.012, 0.014, 0.03, 0.08);
  });

  // ---------- folding table with a laundry basket ----------
  const TX = 0.45, TZ = 0.75, TW = 1.4, TD = 0.7, TY = F + 0.9;
  box("white", TX - TW / 2, TX + TW / 2, TY - 0.035, TY, TZ - TD / 2, TZ + TD / 2);
  box("darkFlat", TX - TW / 2 - 0.004, TX + TW / 2 + 0.004, TY - 0.03, TY - 0.008, TZ + TD / 2, TZ + TD / 2 + 0.004);
  box("darkFlat", TX + TW / 2, TX + TW / 2 + 0.004, TY - 0.03, TY - 0.008, TZ - TD / 2, TZ + TD / 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = TX + sx * (TW / 2 - 0.06), z = TZ + sz * (TD / 2 - 0.06);
    box("darkInk", x - 0.02, x + 0.02, F, TY - 0.035, z - 0.02, z + 0.02);
  }
  for (const sx of [-1, 1]) box("darkInk", TX + sx * (TW / 2 - 0.06) - 0.015, TX + sx * (TW / 2 - 0.06) + 0.015, F + 0.15, F + 0.18, TZ - TD / 2 + 0.06, TZ + TD / 2 - 0.06);
  place(TX + 0.3, TY, TZ - 0.02, -12 * D, () => {
    const bw = 0.24, bd = 0.17, bh = 0.26;
    box("orange", -bw, bw, 0, bh, -bd, bd);
    box("orange", -bw - 0.012, bw + 0.012, bh - 0.03, bh, -bd - 0.012, bd + 0.012); // rim
    for (const y of [0.07, 0.15]) for (let k = -3; k <= 3; k++) {
      const x = k * 0.062;
      box("darkFlat", x - 0.02, x + 0.02, y, y + 0.045, bd, bd + 0.003);
      if (Math.abs(k) <= 2) box("darkFlat", bw, bw + 0.003, y, y + 0.045, x * 0.75 - 0.018, x * 0.75 + 0.018);
    }
    blob("white", [-0.1, bh + 0.01, 0.02], [0.14, 0.06, 0.12]);
    blob("yellow", [0.1, bh + 0.02, -0.03], [0.12, 0.06, 0.11]);
    blob("red", [0.02, bh + 0.05, 0.06], [0.1, 0.045, 0.08]);
    blob("white", [0.18, bh - 0.02, 0.1], [0.07, 0.09, 0.03]); // a towel over the rim
  });
  place(TX - 0.45, TY, TZ + 0.05, 8 * D, () => { // a folded stack
    box("white", -0.16, 0.16, 0, 0.05, -0.12, 0.12);
    box("yellow", -0.15, 0.15, 0.05, 0.09, -0.11, 0.11);
    box("red", -0.14, 0.14, 0.09, 0.125, -0.1, 0.1);
  });

  // ---------- centre the footprint on x = z = 0 ----------
  const lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (const { p } of Object.values(soups))
    for (let i = 0; i < p.length; i += 3)
      for (const [k, j] of [[0, 0], [1, 2]]) (lo[k] = Math.min(lo[k], p[i + j])), (hi[k] = Math.max(hi[k], p[i + j]));
  const sc = height / NATURAL;
  body.position.set((-(lo[0] + hi[0]) / 2) * sc, 0, (-(lo[1] + hi[1]) / 2) * sc);

  // ---------- meshes: one per material (and per moving part) ----------
  const MAT = {
    wall: [c.wall, c.wallShade, 0.45, 3],
    dark: [c.dark, c.dark, 0.1, 3],
    darkInk: [c.dark, c.dark, 0.1, 2],
    darkFlat: [c.dark, c.dark, 0.1, 0],
    floor: [c.floor, c.floor, 0.1, 0],
    grid: [c.grid, c.grid, 0.1, 0],
    white: [c.white, c.whiteShade, 0.1, 2.5],
    metal: [c.metal, c.metalShade, 0.1, 2],
    glass: [c.dark, c.dark, 0.1, 0],
    streak: [c.glow, c.glow, -0.25, 0],
    glow: [c.glow, c.glow, -0.25, 2],
    lamp: [c.lamp, c.lamp, -0.25, 0],
    red: [c.red, c.redShade, 0.1, 2.5],
    orange: [c.orange, c.orangeShade, 0.1, 2],
    yellow: [c.yellow, c.yellowShade, 0.1, 2],
  };
  const meshes = (set, parent) => {
    for (const [key, { p, n }] of Object.entries(set)) {
      const [base, shade, threshold, px] = MAT[key];
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
      const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
      mesh.name = parent === body ? key : `${parent.name}-${key}`;
      parent.add(mesh);
    }
  };
  meshes(soups, body);
  for (const j of Object.values(joints)) meshes(j.userData.soups, j), delete j.userData.soups;

  // ---------- clip: spin ----------
  // Drum A turns counter-clockwise seen from the front (+rz), drum B clockwise; two turns a loop. Laundry angle a is
  // measured from the drum's bottom toward the rising side; a blob rides up from -25 to 110 deg at radius 0.095, then
  // falls along the chord back to the bottom (y eased in, as gravity). Three lifts a loop; offsets spread the blobs.
  const CLIPS = { spin: 2 };
  const BLOBS = [ // [phase offset, lift radius, depth in drum, spin turns per loop x, y]
    [0.0, 0.085, -0.08, 2, 1], [0.27, 0.08, -0.17, -1, 2], [0.52, 0.088, -0.25, 3, -1], [0.78, 0.078, -0.13, -2, 1],
  ];
  const frac = (x) => x - Math.floor(x);
  function apply(t) {
    const ph = frac(t / CLIPS.spin);
    for (const [key, dir, off] of [["A", 1, 0], ["B", -1, 0.4]]) {
      drumJ[key].rotation.set(0, 0, dir * 2 * TAU * ph);
      blobJ[key].forEach((b, k) => {
        const [o, r, z, sx, sy] = BLOBS[k];
        const u = frac(3 * ph + o + off);
        const at = (a) => [dir * r * Math.sin(a), -r * Math.cos(a)];
        const a0 = -25 * D, a1 = 110 * D, lift = 0.62;
        let x, y;
        if (u < lift) [x, y] = at(a0 + (a1 - a0) * (u / lift));
        else {
          const s = (u - lift) / (1 - lift), P = at(a1), Q = at(a0);
          x = P[0] + (Q[0] - P[0]) * s;
          y = P[1] + (Q[1] - P[1]) * s * s;
        }
        b.position.set(x, y, z);
        b.rotation.set(sx * TAU * ph, sy * TAU * ph + k, dir * 2 * TAU * ph);
      });
    }
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`coin-laundry: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      return apply(+m[2]);
    }
    if (name !== "rest") throw new Error(`coin-laundry: unknown pose "${name}" (rest, or spin@<seconds>)`);
    apply(0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
