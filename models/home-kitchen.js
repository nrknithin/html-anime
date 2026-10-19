// home-kitchen.js - the anime family kitchen and dining corner (dinner scenes, breakfast cut-ins), a cutaway set with
// one animated clip. Contract: harness/lab/README.md. Meters, +Y up, the open (cutaway) sides face +X and +Z so a camera
// in the lit front-left quadrant looks in; the -Z wall holds the counter run, the window and the fridge, the -X wall
// the dining corner. Stands on y = 0 (the floor's top is y = 0.02, joints.floor), centred on the room.
//
// Construction (boxes, lathes, superellipsoid blobs and rods, all triangle soups merged per material; boxes are flat
// shaded so furniture reads crisp, blobs and lathes carry smooth normals; every closed part is wound away from a point
// inside it, never by hand):
//   SHELL    a floor slab with tile seams, two walls 0.1 thick, the -Z wall cut around the window over the sink, a
//            tiled backsplash (wall-tone tiles, white grout lines and a white top trim) so white steam reads against it,
//            a skirting board.
//   COUNTER  mint carcass on a dark recessed plinth with door and drawer seams and dark handles, a white worktop cut
//            around a sink (inner walls wound toward the basin, drain, a gooseneck tap), a dark two-burner gas hob with
//            grates and front knobs, a red enamel pot on the front burner and a white kettle behind it, a rice cooker,
//            a ladle rail (dark rod on brackets, S hooks, ladle, turner, whisk, spatula: wooden handles, white heads),
//            two mint wall cabinets, a mat in front of the sink.
//   WINDOW   white frame and sill over the sink, a pane with two treetops and a cloud by day, dark with a moon and
//            stars at night.
//   FRIDGE   a tall white two-door fridge with a drawer, dark bar handles, round and square magnets holding a note.
//   DINING   a table with a red-and-cream gingham cloth (dropping past the top on all four sides), four chairs pulled
//            around it (the two at the back tucked in, the two in front pulled out and turned), four green rice bowls
//            heaped with rice, dark chopsticks on rests, a dish in the middle. A white dome pendant hangs on a cord from
//            a wall-mounted arm: a plate fixed to the -X wall, the arm out over the table and a diagonal brace under it.
//   WALLS    a red wall clock (seven o'clock) and a calendar on the -X wall; a plant pot on the window sill.
//   CLIP     simmer (2 s loop): the lid (joints.lid, a pivot on the pot rim) rattles in four bursts, rocking and lifting
//            a few mm on its rim, and seven steam puffs rise from the rim, growing then shrinking to nothing so the loop wraps
//            invisibly. The puffs are one mesh whose vertices pose() rewrites (translate and uniform scale only, so the
//            normals and the hull normals stay true).
// Proportions (real size, base unit the wall 2.4 m): room 3.6 x 3.0 inside; counter 0.86 high, 0.62 deep, 2.7 long;
//   window 0.8 x 0.83 from 1.12; fridge 0.7 x 0.68 x 1.8; wall cabinets 0.35 deep from 1.82 to 2.32 (clear of the steam); table 1.2 x 0.78 at
//   0.72; chair seats 0.44; lamp arm at 2.2, pendant bottom 1.48; pot r 0.13 x 0.14; steam to 1.7.
// Options: build(THREE, kit, colors, { height, night }).
//   height  scales the whole set so the wall top is `height` (default 2.4).
//   night   the window goes dark (hair) with a moon and stars, the pendant glows practical (no shade tone) with a pool of
//           light on the cloth. Same script; the room keeps its day tones, as the bedroom does.
// Poses: rest (lid seated, steam at the loop's start). Clips: simmer 2 s (pose("simmer@0.5")).
// Ink: walls without a hull, inked through whole-wall twins (wallInk) so the cut pieces show no seams; hulls 1.5-2.5 px.
// Colours (meadow): walls and tiles sky #d7ecef (flat); worktop, grout, fridge, rice cooker, kettle, frames, steam
//   sclera #f6f3ee / sky; cabinets and chairs line #a9d16e / iris #3f8a47; floor and wood (handles, table legs) practical
//   #f2c94c / skin #f0c2ae; hob, plinth, lamp arm, rail, chopsticks hair #2c5131 (dark, outlined); seams hair flat; pot, lid,
//   gingham and magnets accent #d9483b / hair; cloth, rice, note, cloud moon #f7f3e1 / sky; bowls iris / hair;
//   pane moon / sky by day, hair at night; glow practical.
// Meshes: 14 by day, 15 at night (the glow). ~6.9k triangles.
// Joints: anchors floor, counter, hob, table, window, fridge, lamp; pivot lid.

export const meta = {
  name: "home-kitchen",
  height: 2.4,
  script: "meadow",
  colors: {
    wall: "#d7ecef", wallShade: "#d7ecef",
    white: "#f6f3ee", whiteShade: "#d7ecef",
    mint: "#a9d16e", mintShade: "#3f8a47",
    wood: "#f2c94c", woodShade: "#f0c2ae",
    dark: "#2c5131", darkShade: "#2c5131",
    seam: "#2c5131",
    red: "#d9483b", redShade: "#2c5131",
    cream: "#f7f3e1", creamShade: "#d7ecef",
    green: "#3f8a47", greenShade: "#2c5131",
    pane: "#f7f3e1", paneShade: "#d7ecef",
    night: "#2c5131",
    glow: "#f2c94c",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height, night = false } = opts;
  const c = { ...meta.colors, ...colors };
  const root = new THREE.Group();
  root.name = "home-kitchen";
  const set = new THREE.Group(); // the uniform size scale lives here
  set.name = "room";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = {};

  // ---------- triangle soups with normals, through an optional placement matrix ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  let M = null; // THREE.Matrix4 placement for the part being written, or null
  const v3 = new THREE.Vector3();
  const P = (q) => (M ? (v3.set(...q).applyMatrix4(M), [v3.x, v3.y, v3.z]) : q);
  const N = (q) => (M ? (v3.set(...q).transformDirection(M), [v3.x, v3.y, v3.z]) : q);
  function place(x, y, z, ry = 0, rx = 0, rz = 0) {
    if (x === undefined) return (M = null);
    M = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), new THREE.Vector3(1, 1, 1));
  }
  // one triangle wound away from `ref`; vertex normals if given, else the face normal
  function tri(key, a, b, e, ref, na, nb, ne) {
    [a, b, e, ref] = [P(a), P(b), P(e), P(ref)];
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-11) return;
    const m = mul(add(add(a, b), e), 1 / 3);
    const flip = dot(n, sub(m, ref)) < 0;
    n = nrm(flip ? mul(n, -1) : n);
    const [A, B, E] = [na, nb, ne].map((q) => (q ? N(q) : n));
    const s = S(key);
    const push = (q, qn) => (s.p.push(...q), s.n.push(...qn));
    push(a, A);
    if (flip) push(e, E), push(b, B);
    else push(b, B), push(e, E);
  }
  const quad = (key, a, b, e, d, ref, na, nb, ne, nd) => (tri(key, a, b, e, ref, na, nb, ne), tri(key, a, e, d, ref, na, ne, nd));
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, x0, x1, y0, y1, z0, z1) {
    if (x0 > x1) [x0, x1] = [x1, x0];
    if (z0 > z1) [z0, z1] = [z1, z0];
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // surface of revolution about the local y axis at (cx, cz): profile [[r, y], ...] bottom centre to top centre
  function lathe(key, prof, cx, cz, n = 16, smooth = true) {
    const ym = prof.reduce((s, p) => s + p[1], 0) / prof.length;
    const ref = [cx, ym, cz];
    const at = (p, j) => { const a = (j / n) * Math.PI * 2; return [cx + p[0] * Math.cos(a), p[1], cz + p[0] * Math.sin(a)]; };
    const rad = (j) => { const a = (j / n) * Math.PI * 2; return [Math.cos(a), 0, Math.sin(a)]; };
    for (let i = 0; i + 1 < prof.length; i++) {
      const flat = Math.abs(prof[i][1] - prof[i + 1][1]) < 1e-6;
      const side = !flat && smooth;
      for (let j = 0; j < n; j++) {
        const r = flat ? ref : [cx, (prof[i][1] + prof[i + 1][1]) / 2, cz];
        const nn = side ? [rad(j), rad(j + 1), rad(j + 1), rad(j)] : [];
        quad(key, at(prof[i], j), at(prof[i], j + 1), at(prof[i + 1], j + 1), at(prof[i + 1], j), r, ...nn);
      }
    }
  }
  const cyl = (key, cx, cz, y0, y1, r, n = 16) => lathe(key, [[0, y0], [r, y0], [r, y1], [0, y1]], cx, cz, n);
  // a round rod from a to b (radius r, n sides), capped
  function rod(key, a, b, r, n = 6) {
    const d = nrm(sub(b, a)), up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const e1 = nrm(cross(d, up)), e2 = cross(e1, d);
    const ring = (o) => Array.from({ length: n }, (_, j) => { const t = (j / n) * Math.PI * 2; return add(o, add(mul(e1, r * Math.cos(t)), mul(e2, r * Math.sin(t)))); });
    const ra = ring(a), rb = ring(b), mid = mul(add(a, b), 0.5);
    for (let j = 0; j < n; j++) {
      const k = (j + 1) % n;
      quad(key, ra[j], ra[k], rb[k], rb[j], mid, nrm(sub(ra[j], a)), nrm(sub(ra[k], a)), nrm(sub(rb[k], b)), nrm(sub(rb[j], b)));
      tri(key, a, ra[j], ra[k], mid);
      tri(key, b, rb[j], rb[k], mid);
    }
  }
  const path = (key, pts, r, n = 6) => pts.slice(1).forEach((q, i) => rod(key, pts[i], q, r, n));
  // superellipsoid at o with radii r along the basis (ex, ey, ez); e < 1 boxy, e = 1 an ellipsoid
  const spow = (w, p) => Math.sign(w) * Math.pow(Math.abs(w), p);
  function blob(key, o, r, e = 1, basis = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], nu = 8, nv = 14) {
    const [ex, ey, ez] = basis;
    const W = (l) => add(o, add(add(mul(ex, l[0]), mul(ey, l[1])), mul(ez, l[2])));
    const Wn = (l) => nrm(add(add(mul(ex, l[0]), mul(ey, l[1])), mul(ez, l[2])));
    const pt = (i, j) => {
      const th = -Math.PI / 2 + (i / nu) * Math.PI, ph = (j / nv) * Math.PI * 2;
      const [ct, st, cp, sp] = [Math.cos(th), Math.sin(th), Math.cos(ph), Math.sin(ph)];
      const p = [r[0] * spow(ct, e) * spow(cp, e), r[1] * spow(st, e), r[2] * spow(ct, e) * spow(sp, e)];
      const q = 2 - e;
      const n = [spow(ct, q) * spow(cp, q) / r[0], spow(st, q) / r[1], spow(ct, q) * spow(sp, q) / r[2]];
      return [W(p), Wn(Math.hypot(...n) < 1e-9 ? [0, Math.sign(st), 0] : n)];
    };
    for (let i = 0; i < nu; i++)
      for (let j = 0; j < nv; j++) {
        const [a, b, d, f] = [pt(i, j), pt(i, j + 1), pt(i + 1, j + 1), pt(i + 1, j)];
        quad(key, a[0], b[0], d[0], f[0], o, a[1], b[1], d[1], f[1]);
      }
  }
  // flat shapes on a plane: W(u, v) maps plane coordinates to world, back(u, v) is a point behind the plane
  const onZ = (z) => ({ W: (u, v) => [u, v, z], back: (u, v) => [u, v, z - 1] }); // facing +Z
  const onX = (x) => ({ W: (u, v) => [x, v, u], back: (u, v) => [x - 1, v, u] }); // facing +X
  const onY = (y) => ({ W: (u, v) => [u, y, v], back: (u, v) => [u, y - 1, v] }); // facing up
  const rect = (key, F, u0, u1, v0, v1) => quad(key, F.W(u0, v0), F.W(u1, v0), F.W(u1, v1), F.W(u0, v1), F.back((u0 + u1) / 2, (v0 + v1) / 2));
  function fan(key, F, poly) {
    const cu = poly.reduce((s, p) => s + p[0], 0) / poly.length, cv = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      tri(key, F.W(cu, cv), F.W(a[0], a[1]), F.W(b[0], b[1]), F.back(cu, cv));
    }
  }
  const disc = (u, v, r, n = 16, ry = r) => Array.from({ length: n }, (_, i) => [u + r * Math.cos((i / n) * 2 * Math.PI), v + ry * Math.sin((i / n) * 2 * Math.PI)]);
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  // ---------- dimensions ----------
  const X0 = -1.8, X1 = 1.8, Z0 = -1.5, Z1 = 1.5, T = 0.1, FT = 0.02, CEIL = 2.4;
  const CT = { x0: X0, x1: 0.9, z1: Z0 + 0.62, y: 0.86 }; // counter run along the -Z wall
  const SK = { x0: -1.0, x1: -0.46, z0: Z0 + 0.1, z1: Z0 + 0.5, y0: 0.66 }; // sink basin
  const WIN = { x0: -1.13, x1: -0.33, y0: 1.12, y1: 1.95 };
  const HOB = { x0: 0.08, x1: 0.72, z0: Z0 + 0.06, z1: Z0 + 0.56 };
  const POT = { x: 0.24, z: Z0 + 0.41, r: 0.13, h: 0.14 };
  const FR = { x0: 1.0, x1: 1.72, z0: Z0 + 0.01, z1: Z0 + 0.69, y: 1.8 };
  const TB = { x: -1.0, z: 0.4, w: 1.2, d: 0.78, y: 0.72 };

  // ---------- floor (large tiles) ----------
  box("floor", X0 - T, X1, 0, FT, Z0 - T, Z1);
  const FL = onY(FT + 0.0008);
  for (let z = Z0 + 0.4; z < Z1 - 0.05; z += 0.4) rect("seam", FL, X0, X1, z - 0.004, z + 0.004);
  for (let x = X0 + 0.4; x < X1 - 0.05; x += 0.4) rect("seam", FL, x - 0.004, x + 0.004, Z0, Z1);
  // mat in front of the sink
  box("mint", -1.1, -0.36, FT, FT + 0.01, CT.z1 + 0.06, CT.z1 + 0.5);
  for (let i = 0; i < 3; i++) rect("green", onY(FT + 0.0108), -1.04, -0.42, CT.z1 + 0.14 + i * 0.13, CT.z1 + 0.165 + i * 0.13);

  // ---------- walls ----------
  box("wall", X0 - T, X0, FT, CEIL, Z0 - T, Z1); // -X wall
  box("wall", X0, WIN.x0, FT, CEIL, Z0 - T, Z0); // -Z wall, cut around the window
  box("wall", WIN.x1, X1, FT, CEIL, Z0 - T, Z0);
  box("wall", WIN.x0, WIN.x1, FT, WIN.y0, Z0 - T, Z0);
  box("wall", WIN.x0, WIN.x1, WIN.y1, CEIL, Z0 - T, Z0);
  box("wallInk", X0 - T, X0, FT, CEIL, Z0 - T, Z1);
  box("wallInk", X0, X1, FT, CEIL, Z0 - T, Z0);
  box("white", X0, X0 + 0.015, FT, 0.09, Z0, Z1); // skirting
  box("white", CT.x1, X1, FT, 0.09, Z0, Z0 + 0.015);
  // backsplash: white tiles with wall-tone grout, cut under the window
  const BS = { y0: CT.y, y1: 1.52, z: Z0 + 0.012 };
  box("wall", X0, WIN.x0 - 0.05, BS.y0, BS.y1, Z0, BS.z);
  box("wall", WIN.x1 + 0.05, CT.x1, BS.y0, BS.y1, Z0, BS.z);
  box("wall", WIN.x0 - 0.05, WIN.x1 + 0.05, BS.y0, WIN.y0 - 0.04, Z0, BS.z);
  box("white", X0, CT.x1, BS.y1, BS.y1 + 0.02, Z0, BS.z + 0.008); // trim on top
  const GR = onZ(BS.z + 0.0008);
  for (let y = BS.y0 + 0.11; y < BS.y1 - 0.02; y += 0.11) {
    const under = y < WIN.y0 - 0.05;
    if (under) rect("white", GR, X0, CT.x1, y - 0.003, y + 0.003);
    else for (const [a, b] of [[X0, WIN.x0 - 0.05], [WIN.x1 + 0.05, CT.x1]]) rect("white", GR, a, b, y - 0.003, y + 0.003);
  }
  for (let x = X0 + 0.11; x < CT.x1 - 0.02; x += 0.11) {
    const top = x > WIN.x0 - 0.05 && x < WIN.x1 + 0.05 ? WIN.y0 - 0.04 : BS.y1;
    rect("white", GR, x - 0.003, x + 0.003, BS.y0, top);
  }

  // ---------- window over the sink ----------
  const WZ = Z0 - 0.06, fw = 0.045;
  rect(night ? "night" : "pane", onZ(WZ), WIN.x0, WIN.x1, WIN.y0, WIN.y1);
  box("white", WIN.x0, WIN.x1, WIN.y0, WIN.y0 + fw, WZ, Z0);
  box("white", WIN.x0, WIN.x1, WIN.y1 - fw, WIN.y1, WZ, Z0);
  box("white", WIN.x0, WIN.x0 + fw, WIN.y0, WIN.y1, WZ, Z0);
  box("white", WIN.x1 - fw, WIN.x1, WIN.y0, WIN.y1, WZ, Z0);
  const wm = (WIN.x0 + WIN.x1) / 2;
  box("white", wm - 0.02, wm + 0.02, WIN.y0, WIN.y1, WZ, WZ + 0.035); // meeting stile
  box("white", WIN.x0 - 0.05, WIN.x1 + 0.05, WIN.y0 - 0.04, WIN.y0, Z0 - 0.02, Z0 + 0.07); // sill
  const OUT = onZ(WZ + 0.002);
  if (!night) {
    fan("mint", OUT, disc(WIN.x0 + 0.18, WIN.y0 + 0.06, 0.2, 14, 0.18).filter((p) => p[1] > WIN.y0 + fw && p[0] > WIN.x0 + fw).concat([[WIN.x0 + fw, WIN.y0 + fw]]));
    fan("mint", OUT, disc(WIN.x1 - 0.16, WIN.y0 + fw + 0.02, 0.15, 12, 0.13).filter((p) => p[1] >= WIN.y0 + fw && p[0] < WIN.x1 - fw).concat([[WIN.x1 - fw, WIN.y0 + fw]]));
    fan("cream", OUT, disc(WIN.x1 - 0.2, WIN.y1 - 0.2, 0.1, 12, 0.045));
  } else {
    fan("cream", OUT, disc(WIN.x0 + 0.2, WIN.y1 - 0.2, 0.075, 16));
    for (let i = 0; i < 6; i++) fan("glow", OUT, disc(WIN.x0 + 0.1 + hash(i + 9) * (WIN.x1 - WIN.x0 - 0.2), WIN.y0 + 0.22 + hash(i + 19) * 0.5, 0.011, 6));
  }
  // a small plant pot on the sill
  lathe("red", [[0, WIN.y0], [0.04, WIN.y0], [0.05, WIN.y0 + 0.08], [0, WIN.y0 + 0.08]], WIN.x0 + 0.14, Z0 + 0.02, 10);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26 + 0.3;
    blob("green", [WIN.x0 + 0.14 + 0.03 * Math.cos(a), WIN.y0 + 0.12, Z0 + 0.02 + 0.025 * Math.sin(a)], [0.028, 0.045, 0.028], 1, undefined, 4, 7);
  }

  // ---------- counter run ----------
  const cy0 = FT + 0.09, cy1 = CT.y - 0.04;
  box("dark", X0, CT.x1 - 0.05, FT, cy0, Z0, CT.z1 - 0.07); // recessed plinth
  box("mint", X0, CT.x1, cy0, cy1, Z0, CT.z1 - 0.02); // carcass
  const CF = onZ(CT.z1 - 0.0192);
  // door / drawer layout along the run: [x0, x1, drawer?]
  const bays = [[X0, -1.2, 1], [-1.2, -0.3, 0], [-0.3, 0.08, 1], [0.08, 0.9, 0]];
  for (const [a, b, dr] of bays) {
    rect("seam", CF, b - 0.004, b + 0.004, cy0, cy1);
    if (dr) {
      for (const y of [cy0 + 0.25, cy0 + 0.5]) rect("seam", CF, a, b, y - 0.004, y + 0.004);
      for (const y of [cy0 + 0.2, cy0 + 0.45, cy0 + 0.66]) box("dark", (a + b) / 2 - 0.06, (a + b) / 2 + 0.06, y, y + 0.018, CT.z1 - 0.02, CT.z1 + 0.002);
    } else {
      const m = (a + b) / 2;
      rect("seam", CF, m - 0.004, m + 0.004, cy0, cy1); // two doors
      for (const x of [m - 0.05, m + 0.05]) box("dark", x - 0.009, x + 0.009, cy1 - 0.2, cy1 - 0.06, CT.z1 - 0.02, CT.z1 + 0.002);
    }
  }
  rect("seam", CF, X0, CT.x1, cy1 - 0.004, cy1); // under the worktop lip
  // worktop, cut around the basin
  const wt = (x0, x1, z0, z1) => box("white", x0, x1, cy1, CT.y, z0, z1);
  wt(X0, SK.x0, Z0, CT.z1 + 0.02);
  wt(SK.x1, CT.x1 + 0.02, Z0, CT.z1 + 0.02);
  wt(SK.x0, SK.x1, Z0, SK.z0);
  wt(SK.x0, SK.x1, SK.z1, CT.z1 + 0.02);
  // basin: four inner walls facing into it and a floor (wall tone), a dark drain
  const b0 = [SK.x0, SK.y0, SK.z0], b1 = [SK.x1, SK.y0, SK.z0], b2 = [SK.x1, SK.y0, SK.z1], b3 = [SK.x0, SK.y0, SK.z1];
  const t0 = [SK.x0, CT.y, SK.z0], t1 = [SK.x1, CT.y, SK.z0], t2 = [SK.x1, CT.y, SK.z1], t3 = [SK.x0, CT.y, SK.z1];
  const smx = (SK.x0 + SK.x1) / 2, smz = (SK.z0 + SK.z1) / 2; // each wall is wound away from a point behind it
  quad("wall", b0, b1, t1, t0, [smx, 0.75, SK.z0 - 1]); // back wall faces +Z
  quad("wall", b3, b2, t2, t3, [smx, 0.75, SK.z1 + 1]);
  quad("wall", b0, b3, t3, t0, [SK.x0 - 1, 0.75, smz]);
  quad("wall", b1, b2, t2, t1, [SK.x1 + 1, 0.75, smz]);
  quad("wall", b0, b1, b2, b3, [smx, SK.y0 - 1, smz]);
  fan("seam", onY(SK.y0 + 0.001), disc((SK.x0 + SK.x1) / 2, (SK.z0 + SK.z1) / 2, 0.035, 12));
  // gooseneck tap behind the basin
  const tx = (SK.x0 + SK.x1) / 2, tz = Z0 + 0.06;
  cyl("white", tx, tz, CT.y, CT.y + 0.03, 0.03, 10);
  path("white", [[tx, CT.y, tz], [tx, CT.y + 0.24, tz], [tx, CT.y + 0.3, tz + 0.05], [tx, CT.y + 0.28, tz + 0.16], [tx, CT.y + 0.22, tz + 0.18]], 0.013, 8);
  rod("white", [tx + 0.03, CT.y + 0.12, tz], [tx + 0.1, CT.y + 0.16, tz + 0.01], 0.01, 6); // lever

  // gas hob: a dark plate, two burners with grates, knobs on the counter front
  box("dark", HOB.x0, HOB.x1, CT.y, CT.y + 0.018, HOB.z0, HOB.z1);
  const burners = [[POT.x, POT.z], [0.56, Z0 + 0.2]];
  for (const [bx, bz] of burners) {
    lathe("dark", [[0, CT.y + 0.018], [0.06, CT.y + 0.018], [0.06, CT.y + 0.03], [0, CT.y + 0.03]], bx, bz, 12); // burner cap
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      rod("dark", [bx + 0.05 * Math.cos(a), CT.y + 0.032, bz + 0.05 * Math.sin(a)], [bx + 0.14 * Math.cos(a), CT.y + 0.032, bz + 0.14 * Math.sin(a)], 0.007, 5);
    }
  }
  for (const x of [0.2, 0.4, 0.6]) {
    place(x, cy1 - 0.08, CT.z1 - 0.02, 0, Math.PI / 2);
    lathe("dark", [[0, 0], [0.024, 0], [0.024, 0.025], [0, 0.025]], 0, 0, 10);
    place();
  }
  // red enamel pot on the front burner, its lid on a pivot at the rim (joints.lid)
  const PY = CT.y + 0.04;
  lathe("red", [[0, PY], [POT.r - 0.01, PY], [POT.r, PY + 0.01], [POT.r, PY + POT.h - 0.012], [POT.r + 0.008, PY + POT.h], [0, PY + POT.h]], POT.x, POT.z, 20);
  for (const s of [-1, 1]) box("red", POT.x + s * (POT.r - 0.01), POT.x + s * (POT.r + 0.045), PY + POT.h - 0.04, PY + POT.h - 0.02, POT.z - 0.03, POT.z + 0.03);
  // kettle on the back burner
  const KY = CT.y + 0.04, KX = 0.56, KZ = Z0 + 0.2;
  lathe("white", [[0, KY], [0.085, KY], [0.095, KY + 0.05], [0.08, KY + 0.13], [0.03, KY + 0.15], [0.03, KY + 0.16], [0, KY + 0.16]], KX, KZ, 14);
  blob("dark", [KX, KY + 0.168, KZ], [0.015, 0.012, 0.015], 1, undefined, 4, 8);
  rod("white", [KX + 0.07, KY + 0.06, KZ], [KX + 0.15, KY + 0.13, KZ], 0.012, 6); // spout
  path("dark", [[KX - 0.05, KY + 0.15, KZ], [KX - 0.03, KY + 0.22, KZ], [KX + 0.03, KY + 0.22, KZ], [KX + 0.05, KY + 0.15, KZ]], 0.008, 5);

  // rice cooker at the left end
  const RC = { x: -1.45, z: Z0 + 0.32, y: CT.y };
  blob("white", [RC.x, RC.y + 0.1, RC.z], [0.15, 0.1, 0.13], 0.5, undefined, 8, 16);
  blob("white", [RC.x, RC.y + 0.2, RC.z - 0.005], [0.14, 0.04, 0.12], 0.7, undefined, 6, 16); // lid
  box("dark", RC.x - 0.05, RC.x + 0.05, RC.y + 0.06, RC.y + 0.12, RC.z + 0.115, RC.z + 0.133); // panel
  box("red", RC.x - 0.02, RC.x + 0.02, RC.y + 0.075, RC.y + 0.095, RC.z + 0.12, RC.z + 0.136); // button
  path("dark", [[RC.x - 0.06, RC.y + 0.23, RC.z], [RC.x - 0.04, RC.y + 0.27, RC.z], [RC.x + 0.04, RC.y + 0.27, RC.z], [RC.x + 0.06, RC.y + 0.23, RC.z]], 0.01, 5);
  // a cutting board leaning on the backsplash, a bottle
  place(-1.72, CT.y, Z0 + 0.05, 0.25, -0.18);
  box("wood", -0.12, 0.12, 0, 0.32, 0, 0.02);
  place();
  lathe("mint", [[0, CT.y], [0.035, CT.y], [0.035, CT.y + 0.15], [0.015, CT.y + 0.2], [0.015, CT.y + 0.23], [0, CT.y + 0.23]], -0.2, Z0 + 0.12, 10);

  // ladle rail over the hob: dark rod on two brackets, S hooks, four utensils (wooden handles, white heads)
  const RY = 1.42, RZ = Z0 + 0.06;
  rod("dark", [0.02, RY, RZ], [0.8, RY, RZ], 0.009, 6);
  for (const x of [0.05, 0.77]) box("dark", x - 0.012, x + 0.012, RY - 0.015, RY + 0.015, Z0, RZ);
  const UT = [[0.18, "ladle"], [0.34, "turner"], [0.5, "whisk"], [0.65, "spatula"]];
  for (const [x, kind] of UT) {
    path("dark", [[x, RY + 0.012, RZ], [x, RY - 0.02, RZ + 0.012], [x, RY - 0.05, RZ]], 0.004, 4); // S hook
    const top = RY - 0.05, len = kind === "whisk" ? 0.16 : 0.22;
    rod("wood", [x, top, RZ], [x, top - len, RZ], 0.009, 6);
    const hy = top - len;
    if (kind === "ladle") {
      place(x, hy - 0.045, RZ + 0.02);
      lathe("white", [[0, -0.035], [0.045, -0.02], [0.05, 0.01], [0, 0.01]], 0, 0, 12);
      place();
    } else if (kind === "turner") box("white", x - 0.035, x + 0.035, hy - 0.1, hy, RZ - 0.004, RZ + 0.004);
    else if (kind === "whisk") blob("white", [x, hy - 0.07, RZ], [0.03, 0.075, 0.03], 1, undefined, 6, 10);
    else blob("white", [x, hy - 0.06, RZ], [0.035, 0.065, 0.007], 0.8, undefined, 4, 10);
  }

  // wall cabinets: left of the window and over the hob
  const UC = { y0: 1.82, y1: 2.32, z1: Z0 + 0.35 };
  for (const [a, b] of [[X0, WIN.x0 - 0.12], [WIN.x1 + 0.2, CT.x1]]) {
    box("mint", a, b, UC.y0, UC.y1, Z0, UC.z1);
    const F = onZ(UC.z1 + 0.0008), n = Math.max(1, Math.round((b - a) / 0.38));
    for (let i = 1; i < n; i++) rect("seam", F, a + (i * (b - a)) / n - 0.004, a + (i * (b - a)) / n + 0.004, UC.y0, UC.y1);
    for (let i = 0; i < n; i++) {
      const x = a + ((i + (i % 2 ? 0.2 : 0.8)) * (b - a)) / n;
      box("dark", x - 0.009, x + 0.009, UC.y0 + 0.04, UC.y0 + 0.16, UC.z1, UC.z1 + 0.02);
    }
  }

  // ---------- fridge ----------
  box("white", FR.x0, FR.x1, FT, FR.y, FR.z0, FR.z1);
  const FF = onZ(FR.z1 + 0.0008);
  const fm = (FR.x0 + FR.x1) / 2;
  rect("seam", FF, FR.x0, FR.x1, 0.6 - 0.005, 0.6 + 0.005); // drawer
  rect("seam", FF, fm - 0.004, fm + 0.004, 0.6, FR.y); // French doors
  rect("seam", FF, FR.x0, FR.x1, 0.09, 0.1); // kick grille line
  for (const x of [fm - 0.035, fm + 0.035]) box("dark", x - 0.01, x + 0.01, 1.05, 1.45, FR.z1, FR.z1 + 0.03);
  box("dark", fm - 0.12, fm + 0.12, 0.5, 0.525, FR.z1, FR.z1 + 0.025);
  // magnets: round and square, a note held by one, a child's drawing by two
  const mag = (x, y, key, r = 0.022) => {
    place(x, y, FR.z1, 0, Math.PI / 2);
    lathe(key, [[0, 0], [r, 0], [r, 0.012], [0, 0.012]], 0, 0, 10);
    place();
  };
  box("cream", FR.x0 + 0.06, FR.x0 + 0.24, 1.2, 1.44, FR.z1, FR.z1 + 0.003); // note
  for (let i = 0; i < 4; i++) rect("seam", onZ(FR.z1 + 0.0042), FR.x0 + 0.09, FR.x0 + 0.21 - (i % 2) * 0.04, 1.36 - i * 0.04, 1.365 - i * 0.04);
  mag(FR.x0 + 0.15, 1.42, "red");
  box("cream", fm + 0.05, FR.x1 - 0.05, 1.5, 1.72, FR.z1, FR.z1 + 0.003); // drawing
  fan("red", onZ(FR.z1 + 0.0042), disc(fm + 0.2, 1.64, 0.035, 12));
  fan("mint", onZ(FR.z1 + 0.0042), [[fm + 0.08, 1.53], [FR.x1 - 0.08, 1.53], [fm + 0.15, 1.6]]);
  mag(fm + 0.08, 1.7, "wood");
  mag(FR.x1 - 0.08, 1.7, "mint");
  mag(FR.x0 + 0.12, 1.62, "wood", 0.028);
  mag(FR.x0 + 0.24, 1.66, "mint", 0.02);
  box("red", FR.x1 - 0.13, FR.x1 - 0.08, 1.12, 1.17, FR.z1, FR.z1 + 0.014);
  box("green", FR.x0 + 0.1, FR.x0 + 0.15, 0.95, 1.0, FR.z1, FR.z1 + 0.014);

  // ---------- dining: table, cloth, chairs, settings ----------
  const tx0 = TB.x - TB.w / 2, tx1 = TB.x + TB.w / 2, tz0 = TB.z - TB.d / 2, tz1 = TB.z + TB.d / 2;
  for (const [x, z] of [[tx0 + 0.06, tz0 + 0.06], [tx1 - 0.06, tz0 + 0.06], [tx0 + 0.06, tz1 - 0.06], [tx1 - 0.06, tz1 - 0.06]])
    box("wood", x - 0.025, x + 0.025, FT, TB.y - 0.03, z - 0.025, z + 0.025);
  box("wood", tx0, tx1, TB.y - 0.03, TB.y, tz0, tz1);
  // cloth: a thin shell over the top that drops on all sides, gingham squares on top and stripes on the drop
  const co = 0.04, cd = 0.16, CY = TB.y + 0.006;
  const cx0 = tx0 - co, cx1 = tx1 + co, cz0 = tz0 - co, cz1 = tz1 + co;
  box("cream", cx0, cx1, CY - 0.012, CY, cz0, cz1);
  box("cream", cx0, cx0 + 0.01, CY - cd, CY, cz0, cz1);
  box("cream", cx1 - 0.01, cx1, CY - cd, CY, cz0, cz1);
  box("cream", cx0, cx1, CY - cd, CY, cz0, cz0 + 0.01);
  box("cream", cx0, cx1, CY - cd, CY, cz1 - 0.01, cz1);
  const sq = 0.1, CT2 = onY(CY + 0.0008);
  const nx = Math.round((cx1 - cx0) / sq), nz = Math.round((cz1 - cz0) / sq);
  const gx = (cx1 - cx0) / nx, gz = (cz1 - cz0) / nz;
  for (let i = 0; i < nx; i++)
    for (let k = 0; k < nz; k++) if ((i + k) % 2 === 0) rect("red", CT2, cx0 + i * gx, cx0 + (i + 1) * gx, cz0 + k * gz, cz0 + (k + 1) * gz);
  for (let i = 0; i < nx; i += 2) {
    rect("red", onZ(cz1 + 0.0008), cx0 + i * gx, cx0 + (i + 1) * gx, CY - cd, CY);
    rect("red", { W: (u, v) => [u, v, cz0 - 0.0008], back: (u, v) => [u, v, cz0 + 1] }, cx0 + i * gx, cx0 + (i + 1) * gx, CY - cd, CY);
  }
  for (let k = 0; k < nz; k += 2) {
    rect("red", onX(cx1 + 0.0008), cz0 + k * gz, cz0 + (k + 1) * gz, CY - cd, CY);
    rect("red", { W: (u, v) => [cx0 - 0.0008, v, u], back: (u, v) => [cx0 + 1, v, u] }, cz0 + k * gz, cz0 + (k + 1) * gz, CY - cd, CY);
  }
  // chairs: two on each long side, pulled in, facing the table
  function chair(x, z, yaw) {
    place(x, 0, z, yaw);
    const sw = 0.2, sd = 0.2, sy = 0.44;
    box("mint", -sw, sw, sy - 0.035, sy, -sd, sd); // seat
    for (const [lx, lz] of [[-sw + 0.03, -sd + 0.03], [sw - 0.03, -sd + 0.03], [-sw + 0.03, sd - 0.03], [sw - 0.03, sd - 0.03]])
      box("wood", lx - 0.017, lx + 0.017, FT, sy - 0.035, lz - 0.017, lz + 0.017);
    for (const lx of [-sw + 0.03, sw - 0.03]) box("wood", lx - 0.017, lx + 0.017, sy, 0.8, -sd + 0.012, -sd + 0.046); // back posts
    box("mint", -sw, sw, 0.62, 0.78, -sd + 0.01, -sd + 0.045); // backrest
    box("wood", -sw + 0.03, sw - 0.03, 0.14, 0.17, -sd + 0.015, -sd + 0.045); // stretcher
    place();
  }
  for (const dx of [-0.29, 0.29]) {
    chair(TB.x + dx, tz0 - 0.16, 0); // back side, facing +Z, tucked in
    chair(TB.x + dx * 1.15, tz1 + 0.36, Math.PI - dx * 0.5); // front side, facing -Z, pulled out
  }
  // settings: rice bowls heaped with rice, chopsticks on rests; a dish in the middle
  const TY = CY;
  for (const dx of [-0.29, 0.29])
    for (const s of [-1, 1]) {
      const bx = TB.x + dx - 0.04, bz = TB.z + s * 0.24;
      lathe("green", [[0, TY], [0.03, TY], [0.03, TY + 0.012], [0.058, TY + 0.03], [0.062, TY + 0.06], [0, TY + 0.06]], bx, bz, 14);
      blob("cream", [bx, TY + 0.06, bz], [0.055, 0.028, 0.055], 1, undefined, 5, 12); // rice
      const cx = TB.x + dx + 0.08;
      box("dark", cx - 0.008, cx + 0.008, TY, TY + 0.01, bz - 0.012, bz + 0.012); // rest
      for (const o of [-0.007, 0.007]) rod("dark", [cx + o, TY + 0.013, bz - s * 0.11], [cx + o * 0.4, TY + 0.009, bz + s * 0.11], 0.0035, 4);
    }
  lathe("cream", [[0, TY], [0.07, TY], [0.13, TY + 0.025], [0, TY + 0.025]], TB.x, TB.z, 18); // dish
  blob("red", [TB.x - 0.03, TY + 0.04, TB.z], [0.04, 0.025, 0.03], 1, undefined, 4, 8); // something grilled
  blob("red", [TB.x + 0.035, TY + 0.04, TB.z + 0.01], [0.04, 0.025, 0.03], 1, undefined, 4, 8);
  blob("mint", [TB.x, TY + 0.04, TB.z - 0.06], [0.05, 0.025, 0.025], 1, undefined, 4, 8);

  // ---------- pendant over the table, hanging from the beam ----------
  // a wall-mounted arm: a plate on the -X wall, the arm out over the table, a diagonal brace under it
  const LY = 1.48, AY = 2.2;
  box("dark", X0, X0 + 0.02, 1.62, AY + 0.08, TB.z - 0.06, TB.z + 0.06); // wall plate
  box("dark", X0, TB.x + 0.05, AY, AY + 0.05, TB.z - 0.025, TB.z + 0.025); // arm
  rod("dark", [X0 + 0.01, 1.7, TB.z], [X0 + 0.5, AY + 0.01, TB.z], 0.014, 6); // brace
  cyl("dark", TB.x, TB.z, AY - 0.03, AY, 0.035, 10); // ceiling-rose cup
  rod("seam", [TB.x, AY - 0.03, TB.z], [TB.x, LY + 0.2, TB.z], 0.006, 5); // cord
  lathe("lamp", [[0, LY], [0.2, LY], [0.2, LY + 0.02], [0.15, LY + 0.12], [0.05, LY + 0.19], [0.03, LY + 0.215], [0, LY + 0.215]], TB.x, TB.z, 20);
  if (night) fan("glow", onY(CY + 0.0016), disc(TB.x, TB.z, 0.5, 28, 0.32)); // pool of lamplight on the cloth

  // ---------- -X wall: a clock and a calendar ----------
  const CK = { y: 1.92, z: -0.55 };
  place(X0, CK.y, CK.z, Math.PI / 2, Math.PI / 2);
  lathe("red", [[0, 0], [0.13, 0], [0.13, 0.03], [0, 0.03]], 0, 0, 20);
  place();
  const CKF = onX(X0 + 0.031);
  fan("cream", CKF, disc(CK.z, CK.y, 0.108, 20));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, r0 = i % 3 ? 0.088 : 0.075;
    rect("seam", onX(X0 + 0.033), CK.z + Math.cos(a) * r0 - 0.004, CK.z + Math.cos(a) * r0 + 0.004, CK.y + Math.sin(a) * r0 - 0.004, CK.y + Math.sin(a) * r0 + 0.004);
  }
  const hand = (a, L, w) => fan("seam", onX(X0 + 0.035), [[CK.z - Math.sin(a) * w, CK.y + Math.cos(a) * w], [CK.z + Math.cos(a) * L, CK.y + Math.sin(a) * L], [CK.z + Math.sin(a) * w, CK.y - Math.cos(a) * w]]);
  hand(Math.PI * 1.25, 0.06, 0.008); // seven o'clock dinner
  hand(Math.PI * 0.5, 0.09, 0.006);
  box("cream", X0, X0 + 0.004, 1.2, 1.62, 0.85, 1.15); // calendar
  rect("red", onX(X0 + 0.0048), 0.88, 1.12, 1.5, 1.59);
  for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) rect("seam", onX(X0 + 0.0048), 0.89 + k * 0.038, 0.91 + k * 0.038, 1.24 + r * 0.06, 1.26 + r * 0.06);

  // ---------- animated parts ----------
  // lid: its own mesh under a pivot at the rim centre
  const lidJ = new THREE.Group();
  lidJ.name = "lid";
  lidJ.position.set(POT.x, PY + POT.h, POT.z);
  joints.lid = lidJ;
  lathe("lid", [[0, 0], [POT.r + 0.012, 0], [POT.r + 0.012, 0.008], [0.09, 0.03], [0.02, 0.042], [0, 0.042]], 0, 0, 20);
  blob("lid", [0, 0.052, 0], [0.026, 0.014, 0.026], 1, undefined, 5, 10); // knob
  // steam: NP puffs of one unit blob, rewritten per frame
  const NP = 7;
  const unit = (() => {
    const saved = soups.steamU;
    soups.steamU = { p: [], n: [] };
    blob("steamU", [0, 0, 0], [1, 0.8, 1], 1, undefined, 6, 12);
    const u = soups.steamU;
    if (saved) soups.steamU = saved; else delete soups.steamU;
    return u;
  })();
  const steamP = new Float32Array(unit.p.length * NP), steamN = new Float32Array(unit.n.length * NP);
  for (let k = 0; k < NP; k++) steamN.set(unit.n, k * unit.n.length);

  // ---------- meshes ----------
  const MAT = { // [base, shade, threshold, ink px (0 = no hull)]
    wall: [c.wall, c.wallShade, 0.1, 0],
    floor: [c.wood, c.woodShade, 0.1, 2.5],
    white: [c.white, c.whiteShade, 0.1, 2],
    mint: [c.mint, c.mintShade, 0.05, 2],
    wood: [c.wood, c.woodShade, 0.1, 2],
    dark: [c.dark, c.darkShade, 0.1, 1.5],
    seam: [c.seam, c.seam, 0.1, 0],
    red: [c.red, c.redShade, 0.0, 2],
    cream: [c.cream, c.creamShade, 0.1, 1.5],
    green: [c.green, c.greenShade, 0.15, 1.5],
    pane: [c.pane, c.paneShade, -1, 0],
    night: [c.night, c.night, -1, 0],
    lamp: night ? [c.glow, c.glow, -1, 2] : [c.white, c.whiteShade, 0.1, 2],
    glow: [c.glow, c.glow, -1, 0],
    lid: [c.red, c.redShade, 0.0, 2],
    steam: [c.white, c.whiteShade, -0.2, 1.5],
  };
  const geo = (p, n) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    return g;
  };
  const mk = (key, g) => {
    const [base, shade, threshold, px] = MAT[key];
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    return mesh;
  };
  for (const [key, s] of Object.entries(soups)) {
    if (key === "wallInk" || key === "lid") continue;
    const mesh = mk(key, geo(s.p, s.n));
    if (key === "wall") // ink the whole-wall twins and keep only their hulls
      for (const h of kit.outline(new THREE.Mesh(geo(soups.wallInk.p, soups.wallInk.n), mesh.material), { px: 2.5 }).children.slice()) mesh.add(h);
    set.add(mesh);
  }
  lidJ.add(mk("lid", geo(soups.lid.p, soups.lid.n)));
  set.add(lidJ);
  const steamG = new THREE.BufferGeometry();
  steamG.setAttribute("position", new THREE.BufferAttribute(steamP, 3));
  steamG.setAttribute("normal", new THREE.BufferAttribute(steamN, 3));
  const steam = mk("steam", steamG);
  set.add(steam);
  const anchor = (name, x, y, z) => { const a = new THREE.Group(); a.name = name; a.position.set(x, y, z); set.add(a); joints[name] = a; };
  anchor("floor", 0, FT, 0);
  anchor("counter", -0.5, CT.y, Z0 + 0.3);
  anchor("hob", POT.x, PY + POT.h, POT.z);
  anchor("table", TB.x, CY, TB.z);
  anchor("window", wm, (WIN.y0 + WIN.y1) / 2, Z0);
  anchor("fridge", fm, 1.2, FR.z1);
  anchor("lamp", TB.x, LY, TB.z);

  // ---------- pose and clip ----------
  // lid: rx tips the front edge (+Z) up, rz tips the +X edge down; y lifts (m). Puffs rise from the rim's back-right,
  // drift toward +X and the wall's updraft, grow, then shrink to nothing at the top so the 2 s loop wraps unseen.
  const CLIPS = { simmer: 2 };
  const TAU = Math.PI * 2, D = Math.PI / 180;
  function frame(ph) {
    // four rattle bursts per loop (one every 0.5 s): a fast rock that decays within the first half of each quarter
    const q = (ph * 4) % 1, k = Math.floor(ph * 4), env = q < 0.5 ? Math.sin(Math.PI * q * 2) * Math.exp(-q * 3) : 0;
    const w = Math.sin(q * TAU * 5), sg = k % 2 ? 1 : -1;
    return { lid: [sg * 6 * env * w, -sg * 4 * env * Math.sin(q * TAU * 5 + 1.3), 0.006 * env * Math.abs(w)], ph };
  }
  function apply(F) {
    // the lid rocks on its rim: lift by the tipped edge's drop so it never sinks into the pot
    const tip = Math.max(Math.abs(F.lid[0]), Math.abs(F.lid[1])) * D;
    lidJ.position.set(POT.x, PY + POT.h + F.lid[2] + (POT.r + 0.012) * Math.sin(tip), POT.z);
    lidJ.rotation.set(F.lid[0] * D, 0, F.lid[1] * D);
    const L = unit.p.length;
    for (let k = 0; k < NP; k++) {
      // every puff follows one swaying column (sway loops with the clip), rising from the lid's back edge
      const u = (((F.ph + k / NP) % 1) + 1) % 1;
      const y = PY + POT.h + 0.06 + u * 0.6;
      const x = POT.x + 0.03 + 0.05 * u + 0.035 * u * Math.sin(u * TAU * 0.9 - F.ph * TAU);
      const z = POT.z - 0.03 - 0.06 * u;
      const s = 0.1 * Math.pow(Math.sin(Math.PI * u), 0.7) * (0.35 + 0.8 * u);
      for (let i = 0; i < L; i += 3) {
        steamP[k * L + i] = x + unit.p[i] * s;
        steamP[k * L + i + 1] = y + unit.p[i + 1] * s;
        steamP[k * L + i + 2] = z + unit.p[i + 2] * s;
      }
    }
    steamG.attributes.position.needsUpdate = true;
    steamG.computeBoundingBox();
    steamG.computeBoundingSphere();
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`home-kitchen: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      const Tn = CLIPS[m[1]];
      return apply(frame((((+m[2] % Tn) + Tn) % Tn) / Tn));
    }
    if (name !== "rest") throw new Error(`home-kitchen: unknown pose "${name}" (rest, or simmer@<seconds>)`);
    apply({ lid: [0, 0, 0], ph: 0.1 });
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
