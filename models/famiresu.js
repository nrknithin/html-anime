// famiresu.js - a Japanese family restaurant (famiresu) at real size, cut away: the after-school booth row by the big
// window at dusk, a drink bar, a host stand by the door. Contract: harness/lab/README.md. Meters, +Y up, the open
// (cutaway) sides face +X and +Z so a camera in the lit front-left quadrant looks in; the -X wall is the window wall,
// the -Z wall holds the drink bar and the entrance. Stands on y = 0 (the floor top is y = 0.02, joints.floor).
//
// Construction (boxes, lathes, superellipsoid cushions and flat decals, all triangle soups merged per material, as
// karaoke-room.js; boxes flat shaded so furniture reads crisp, cushions carry analytic normals so vinyl reads soft;
// every closed part is wound away from a point inside it, never by hand):
//   SHELL    a floor slab with a checkered strip down the aisle, two walls 0.1 thick with a skirting board and an
//            accent stripe. The walls have no hull of their own; whole-wall twins ("wallInk", hull only) ink them.
//   WINDOW   the -X wall is one big window, a pane per booth between dark mullions, over a sill. Outside, painted
//            on the wall plane: a purple dusk sky, a pink band and an amber horizon glow behind dark buildings with
//            lit windows, a utility pole with its wires and a street lamp; two glass streaks per pane.
//   BOOTHS   three booths in a row along the window, turned sideways to the hero camera: the benches run out from
//            the window and face each other across the table, so the low camera looks along each booth's aisle
//            end into it instead of into a back. Each bench: a dark plinth, a vinyl base, a seat cushion and a tall
//            back of three padded vertical channels under a rolled top; neighbouring benches share a back.
//            Each table: a pale top on one dark pedestal, butted against the sill.
//   TABLE    the front booth's table is laid: a parfait in a footed glass (caramel, strawberry and cream layers,
//            a cherry and a wafer), a soda float in a tumbler (scoop, cherry, straw), fries in a paper cup, a call
//            button, a menu stand and a cutlery box by the window.
//   LAMPS    a pendant over each table: a cord, an amber cone shade, a glowing underside and bulb, and a pool of
//            light on the table top (lamps off: the underside goes dark, the bulb pale, no pools).
//   BAR      the drink bar against the -Z wall: a counter, two dispenser machines (dark fronts, coloured flavour
//            panels, nozzles, drip trays), three stacks of glasses, a menu board on the wall above.
//   DOOR     a glass entrance door on the -Z wall showing the same dusk, a host stand (lectern) in front of it and
//            potted plants by the stand and between the drink bar and the booths.
// Proportions (real size, base unit the wall top 2.6 m = meta.height): room 4.0 x 5.7 inside; bench seat 0.45,
//   back top 1.22, bench 1.25 long, 0.58 deep; booth pitch 1.88; table 1.0 x 0.64 at 0.72; window 0.9-2.3;
//   lamp shade bottom 1.5; counter top 0.9; door 0.75 x 2.1; host stand 1.05.
// Options: build(THREE, kit, colors, { height, lamps = true }).
//   height  scales the whole set so the wall top is `height` (default 2.6).
//   lamps   pendant lamps lit (glowing undersides, bulbs and pools on the tables); false leaves them unlit.
// Static: one pose, rest.
// Ink: hulls are 2 px (a room is seen small), 1.5 px on small props; decals and the backdrop have none.
// Colours (festival script, every hex from it): walls moon #ffd7a1 (flat); floor line #fff1ea (flat) with hair
//   #1a1020 checks; vinyl accent #ff4d6d / sky #24143a; dark parts (plinths, pedestals, mullions, frames, machine
//   fronts, plants) sky / hair; table tops, sill, counter, pots line / iris #ffd0a1; glass and machines sclera
//   #f6f3ee / iris; amber parts (lamp shades, fries, caramel, soda) practical #ffb020 / accent; backdrop sky,
//   accent, moon, hair, practical and line, all single tone; lamp undersides moon, bulbs line, pools practical, unlit.
// Joints: anchors floor, table (the laid table's top centre), window, bar, door.

export const meta = {
  name: "famiresu",
  height: 2.6,
  script: "festival",
  colors: {
    wall: "#ffd7a1",
    floor: "#fff1ea", check: "#1a1020",
    vinyl: "#ff4d6d", vinylShade: "#24143a",
    dark: "#24143a", darkShade: "#1a1020",
    pale: "#fff1ea", paleShade: "#ffd0a1",
    metal: "#f6f3ee", metalShade: "#ffd0a1",
    amber: "#ffb020", amberShade: "#ff4d6d",
    sky: "#24143a", dusk: "#ff4d6d", horizon: "#ffd7a1", city: "#1a1020", lit: "#ffb020", streak: "#fff1ea",
    stripe: "#ff4d6d",
    glow: "#ffb020", bulb: "#ffd7a1",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height, lamps = true } = opts;
  const c = { ...meta.colors, ...colors };
  const TAU = Math.PI * 2;
  const root = new THREE.Group();
  root.name = "famiresu";
  const set = new THREE.Group(); // the uniform size scale lives here
  set.name = "room";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = {};

  // ---------- triangle soups with normals, per material key, through an optional placement matrix ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  let M = null;
  const v3 = new THREE.Vector3();
  const P = (q) => (M ? (v3.set(...q).applyMatrix4(M), [v3.x, v3.y, v3.z]) : q);
  const N = (q) => (M ? (v3.set(...q).transformDirection(M), [v3.x, v3.y, v3.z]) : q);
  function place(x, y, z, ry = 0, rx = 0, rz = 0) {
    if (x === undefined) return (M = null);
    M = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), new THREE.Vector3(1, 1, 1));
  }
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
    const at = (p, j) => { const a = (j / n) * TAU; return [cx + p[0] * Math.cos(a), p[1], cz + p[0] * Math.sin(a)]; };
    const rad = (j) => { const a = (j / n) * TAU; return [Math.cos(a), 0, Math.sin(a)]; };
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
  const cyl = (key, cx, cz, y0, y1, r, n = 12) => lathe(key, [[0, y0], [r, y0], [r, y1], [0, y1]], cx, cz, n);
  // a round rod from a to b (radius r, n sides), capped
  function rod(key, a, b, r, n = 6) {
    const d = nrm(sub(b, a)), up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const e1 = nrm(cross(d, up)), e2 = cross(e1, d);
    const ring = (o) => Array.from({ length: n }, (_, j) => { const t = (j / n) * TAU; return add(o, add(mul(e1, r * Math.cos(t)), mul(e2, r * Math.sin(t)))); });
    const ra = ring(a), rb = ring(b), mid = mul(add(a, b), 0.5);
    for (let j = 0; j < n; j++) {
      const k = (j + 1) % n;
      quad(key, ra[j], ra[k], rb[k], rb[j], mid, nrm(sub(ra[j], a)), nrm(sub(ra[k], a)), nrm(sub(rb[k], b)), nrm(sub(rb[j], b)));
      tri(key, a, ra[j], ra[k], mid);
      tri(key, b, rb[j], rb[k], mid);
    }
  }
  // superellipsoid at o with radii r (axis aligned, then through the placement); e < 1 boxy, e = 1 an ellipsoid
  const spow = (w, p) => Math.sign(w) * Math.pow(Math.abs(w), p);
  function blob(key, o, r, e = 1, nu = 6, nv = 12, bias = [0, 0, 0]) {
    const pt = (i, j) => {
      const th = -Math.PI / 2 + (i / nu) * Math.PI, ph = (j / nv) * TAU;
      const [ct, st, cp, sp] = [Math.cos(th), Math.sin(th), Math.cos(ph), Math.sin(ph)];
      const p = [r[0] * spow(ct, e) * spow(cp, e), r[1] * spow(st, e), r[2] * spow(ct, e) * spow(sp, e)];
      const q = 2 - e;
      const n = [spow(ct, q) * spow(cp, q) / r[0], spow(st, q) / r[1], spow(ct, q) * spow(sp, q) / r[2]];
      return [add(o, p), nrm(add(nrm(Math.hypot(...n) < 1e-9 ? [0, Math.sign(st), 0] : n), bias))];
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
  const onYd = (y) => ({ W: (u, v) => [u, y, v], back: (u, v) => [u, y + 1, v] }); // facing down
  const rect = (key, F, u0, u1, v0, v1) => quad(key, F.W(u0, v0), F.W(u1, v0), F.W(u1, v1), F.W(u0, v1), F.back((u0 + u1) / 2, (v0 + v1) / 2));
  function fan(key, F, poly) {
    const cu = poly.reduce((s, p) => s + p[0], 0) / poly.length, cv = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      tri(key, F.W(cu, cv), F.W(a[0], a[1]), F.W(b[0], b[1]), F.back(cu, cv));
    }
  }
  const disc = (u, v, r, n = 16, rv = r) => Array.from({ length: n }, (_, i) => [u + r * Math.cos((i / n) * TAU), v + rv * Math.sin((i / n) * TAU)]);
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  // ---------- dimensions ----------
  const X0 = -2.0, X1 = 2.0, Z0 = -2.8, Z1 = 2.92, TW = 0.1, FT = 0.02, TOP = 2.6;
  const BL = 1.25, BXA = X0 + BL; // bench length out from the window, its aisle end
  const BACK = 0.18, SEATD = 0.4, BENCH = BACK + SEATD, GAP = 0.72, PITCH = 2 * BENCH + GAP;
  const SEAT = 0.45, BTOP = 1.22;
  const TY = 0.72, TBX = [X0 + 0.04, X0 + 1.04]; // table top height, its x span
  const WIN = { z0: Z0 + 0.06, z1: Z1 - 0.14, y0: 0.9, y1: 2.3 };
  const BAR = { x0: -0.25, x1: 0.95, d: 0.6, y: 0.9 };
  const DOOR = { x0: 1.12, x1: 1.87, y1: 2.1 };
  const booths = [0, 1, 2].map((b) => Z0 + b * PITCH); // each booth's -Z edge
  const tableZ = (b) => booths[b] + BENCH + GAP / 2; // a booth's table centre

  // ---------- floor ----------
  box("floor", X0 - TW, X1, 0, FT, Z0 - TW, Z1);
  {
    // checkered strip down the aisle, 0.2 m squares, dark ones only (the floor is the light check)
    const cx0 = BXA + 0.08, n = 3, sz = 0.2, F = onY(FT + 0.001);
    for (let i = 0; i < n; i++)
      for (let j = 0; Z0 + j * sz < Z1 - 1e-6; j++)
        if ((i + j) % 2 === 0) rect("check", F, cx0 + i * sz, cx0 + (i + 1) * sz, Z0 + j * sz, Math.min(Z1, Z0 + (j + 1) * sz));
    // the strip's edging
    rect("check", F, cx0 - 0.03, cx0 - 0.01, Z0, Z1);
    rect("check", F, cx0 + n * sz + 0.01, cx0 + n * sz + 0.03, Z0, Z1);
  }

  // ---------- walls ----------
  box("wall", X0 - TW, X0, FT, TOP, Z0 - TW, Z1); // -X wall (window)
  box("wall", X0, X1, FT, TOP, Z0 - TW, Z0); // -Z wall
  box("wallInk", X0 - TW, X0, FT, TOP, Z0 - TW, Z1);
  box("wallInk", X0, X1, FT, TOP, Z0 - TW, Z0);
  box("dark", X0, X1, FT, 0.1, Z0, Z0 + 0.015); // skirting on the -Z wall
  rect("stripe", onZ(Z0 + 0.002), BAR.x1 + 0.02, DOOR.x0 - 0.08, 1.02, 1.08);
  rect("stripe", onZ(Z0 + 0.002), BXA + 0.05, BAR.x0 - 0.02, 1.02, 1.08);

  // ---------- dusk outside: painted on the window wall's plane, layered toward the room ----------
  // L(i) is the painted plane i layers (1 mm each) in front of the wall or door
  function dusk(L, u0, u1, v0, v1, seed) {
    rect("sky", L(0), u0, u1, v0, v1);
    const hz = v0 + 0.48 * (v1 - v0); // horizon glow height
    rect("dusk", L(1), u0, u1, hz - 0.08, hz + 0.32);
    rect("horizon", L(2), u0, u1, hz - 0.08, hz + 0.08);
    // buildings across the street: blocks of varying height, a few lit windows
    let u = u0, k = seed;
    while (u < u1 - 1e-6) {
      const w = Math.min(u1 - u, 0.32 + 0.4 * hash(k));
      const top = Math.min(v1 - 0.12, v0 + (0.3 + 0.45 * hash(k + 7)) * (v1 - v0));
      rect("city", L(3), u, u + w, v0, top);
      if (hash(k + 3) > 0.4) rect("city", L(3), u + w * 0.2, u + w * 0.35, top, top + 0.07); // roof box
      const rows = Math.floor((top - v0 - 0.12) / 0.16), cols = Math.max(1, Math.floor(w / 0.14));
      for (let r = 0; r < rows; r++)
        for (let q = 0; q < cols; q++)
          if (hash(k * 13 + r * 5 + q) > 0.62) {
            const wu = u + (q + 0.5) * (w / cols), wv = v0 + 0.12 + r * 0.16;
            rect("lit", L(4), wu - 0.035, wu + 0.035, wv, wv + 0.07);
          }
      u += w + 0.02;
      k += 1;
    }
  }
  {
    const L = (i) => onX(X0 + 0.002 + i * 0.001);
    const F = [0, 1, 2, 3, 4, 5].map(L);
    dusk(L, WIN.z0, WIN.z1, WIN.y0, WIN.y1, 11);
    // utility pole and wires, a street lamp, on the nearest painted layer
    const PZ = booths[1] + PITCH * 0.55;
    rect("city", F[4], PZ - 0.03, PZ + 0.03, WIN.y0, WIN.y1);
    rect("city", F[4], PZ - 0.16, PZ + 0.16, 2.06, 2.09);
    for (const [a, b, o] of [[WIN.z0, PZ, 2.02], [PZ, WIN.z1, 1.98]])
      for (let s = 0; s < 8; s++) {
        const u0 = a + ((b - a) * s) / 8, u1 = a + ((b - a) * (s + 1)) / 8;
        const sag = (t) => o - 0.1 * Math.sin(Math.PI * t);
        const v0 = sag(s / 8), v1 = sag((s + 1) / 8);
        quad("city", F[4].W(u0, v0), F[4].W(u1, v1), F[4].W(u1, v1 + 0.012), F[4].W(u0, v0 + 0.012), F[4].back(u0, v0));
      }
    const LZ = booths[2] + PITCH * 0.3;
    rect("city", F[4], LZ - 0.018, LZ + 0.018, WIN.y0, 1.75);
    rect("city", F[4], LZ - 0.018, LZ + 0.12, 1.73, 1.76);
    fan("lit", F[5], disc(LZ + 0.11, 1.72, 0.04, 10));
    // glass streaks, two per pane
    for (let b = 0; b < 3; b++) {
      const z0 = booths[b] + 0.25;
      for (const [o, w] of [[0, 0.12], [0.2, 0.05]])
        fan("streak", F[5], [[z0 + o, 1.55], [z0 + o + w, 1.55], [z0 + o + w + 0.35, 2.2], [z0 + o + 0.35, 2.2]]);
    }
  }
  // window frame: sill, head, mullions at every booth boundary and at the ends
  box("pale", X0, X0 + 0.12, WIN.y0 - 0.04, WIN.y0, WIN.z0 - 0.04, WIN.z1 + 0.04); // sill
  box("dark", X0, X0 + 0.05, WIN.y1, WIN.y1 + 0.06, WIN.z0 - 0.04, WIN.z1 + 0.04); // head
  for (const z of [WIN.z0, booths[1], booths[2], WIN.z1]) box("dark", X0, X0 + 0.05, WIN.y0, WIN.y1, z - 0.03, z + 0.03);
  box("dark", X0, X0 + 0.045, WIN.y0, WIN.y0 + 0.03, WIN.z0, WIN.z1); // bottom rail

  // ---------- booths ----------
  // a bench: plinth, vinyl base, seat cushion, and (when it owns it) the back; side = +1 when its back is on -Z
  const cushion = (x0, x1, z0, z1) => blob("vinyl", [(x0 + x1) / 2, SEAT - 0.05, (z0 + z1) / 2], [(x1 - x0) / 2 - 0.01, 0.07, (z1 - z0) / 2 - 0.01], 0.28, 5, 10);
  function seat(z0, z1) {
    box("dark", X0, BXA - 0.04, FT, 0.12, z0 + 0.03, z1 - 0.03);
    box("vinyl", X0, BXA, 0.12, SEAT - 0.1, z0, z1);
    cushion(X0, BXA, z0, z1);
  }
  // a back: a vinyl core between zc - h and zc + h, padded channels on the faces that face a seat, a rolled top
  function back(zc, h, faces) {
    box("vinyl", X0, BXA, SEAT - 0.1, BTOP - 0.06, zc - h, zc + h);
    const ch = 3, w = BL / ch;
    for (const f of faces)
      for (let i = 0; i < ch; i++) {
        const x0 = X0 + i * w, x1 = x0 + w, zf = zc + f * h;
        blob("vinyl", [(x0 + x1) / 2, (SEAT + BTOP - 0.08) / 2, zf + f * 0.05], [w / 2 - 0.006, (BTOP - 0.08 - SEAT) / 2, 0.065], 0.3, 4, 8, [0.3, 0.1, 0]);
      }
    const t = h + (faces.length === 2 ? 0.1 : 0.08);
    blob("vinyl", [(X0 + BXA) / 2 + 0.005, BTOP - 0.05, zc + (faces.length === 2 ? 0 : faces[0] * 0.04)], [BL / 2 + 0.005, 0.06, faces.length === 2 ? t : 0.11], 0.35, 4, 10);
  }
  for (let b = 0; b < 3; b++) {
    const z = booths[b];
    seat(z + BACK, z + BENCH);
    seat(z + BENCH + GAP, z + BENCH + GAP + SEATD);
  }
  back(Z0 + 0.06, 0.06, [1]); // against the -Z wall
  back(booths[1], 0.06, [-1, 1]);
  back(booths[2], 0.06, [-1, 1]);
  back(booths[2] + PITCH - 0.06, 0.06, [-1]); // the front booth's outer back

  // tables: pale top, apron, one dark pedestal on a foot plate
  for (let b = 0; b < 3; b++) {
    const zc = tableZ(b), hw = 0.32;
    box("pale", TBX[0], TBX[1], TY - 0.035, TY, zc - hw, zc + hw);
    box("dark", TBX[0] + 0.04, TBX[1] - 0.06, TY - 0.08, TY - 0.035, zc - hw + 0.05, zc + hw - 0.05);
    const px = (TBX[0] + TBX[1]) / 2 + 0.08;
    cyl("dark", px, zc, FT, TY - 0.08, 0.045, 8);
    box("dark", px - 0.28, px + 0.28, FT, FT + 0.03, zc - 0.2, zc + 0.2);
  }

  // ---------- the laid table (front booth) ----------
  const LZ = tableZ(2);
  {
    // parfait: a foot, a stem, a tall bowl of layers (caramel, strawberry, cream), a cream swirl, a cherry, a wafer
    const [x, z] = [TBX[0] + 0.62, LZ - 0.14];
    lathe("metal", [[0, TY], [0.045, TY], [0.045, TY + 0.012], [0.012, TY + 0.02], [0.012, TY + 0.07], [0, TY + 0.07]], x, z, 12);
    lathe("amber", [[0, TY + 0.065], [0.03, TY + 0.07], [0.042, TY + 0.13], [0, TY + 0.13]], x, z, 12);
    lathe("vinyl", [[0, TY + 0.13], [0.042, TY + 0.13], [0.048, TY + 0.2], [0, TY + 0.2]], x, z, 12);
    lathe("metal", [[0, TY + 0.2], [0.048, TY + 0.2], [0.052, TY + 0.235], [0, TY + 0.235]], x, z, 12);
    lathe("pale", [[0, TY + 0.232], [0.05, TY + 0.232], [0.04, TY + 0.26], [0.022, TY + 0.29], [0.008, TY + 0.31], [0, TY + 0.315]], x, z, 12);
    blob("vinyl", [x + 0.008, TY + 0.33, z], [0.02, 0.02, 0.02], 1, 4, 8);
    rod("dark", [x + 0.008, TY + 0.345, z], [x + 0.02, TY + 0.375, z], 0.003, 4);
    place(x - 0.02, TY + 0.3, z + 0.015, 0.3, 0, 0.35);
    box("amber", -0.01, 0.01, -0.04, 0.06, -0.022, 0.022);
    place();
  }
  {
    // soda float: a tall tumbler, the drink to the rim, a scoop, a cherry, a straw
    const [x, z] = [TBX[0] + 0.78, LZ + 0.08];
    lathe("metal", [[0, TY], [0.034, TY], [0.04, TY + 0.03], [0, TY + 0.03]], x, z, 12);
    lathe("amber", [[0, TY + 0.03], [0.04, TY + 0.03], [0.045, TY + 0.17], [0, TY + 0.17]], x, z, 12);
    lathe("metal", [[0, TY + 0.17], [0.045, TY + 0.17], [0.047, TY + 0.19], [0, TY + 0.19]], x, z, 12);
    blob("pale", [x, TY + 0.205, z], [0.04, 0.03, 0.04], 0.8, 4, 10);
    blob("vinyl", [x - 0.005, TY + 0.245, z + 0.01], [0.017, 0.017, 0.017], 1, 4, 8);
    rod("dark", [x - 0.005, TY + 0.258, z + 0.01], [x + 0.01, TY + 0.285, z + 0.012], 0.003, 4);
    rod("vinyl", [x + 0.02, TY + 0.12, z - 0.01], [x + 0.05, TY + 0.31, z - 0.03], 0.006, 6);
  }
  {
    // fries in a paper cup
    const [x, z] = [TBX[0] + 0.88, LZ - 0.12];
    lathe("vinyl", [[0, TY], [0.035, TY], [0.05, TY + 0.1], [0, TY + 0.1]], x, z, 10);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU, r = 0.024 * (i % 2 ? 1 : 0.4);
      const fx = x + r * Math.cos(a), fz = z + r * Math.sin(a), lean = 0.25 * (i % 3 - 1);
      place(fx, TY + 0.07, fz, a, 0, lean);
      box("amber", -0.006, 0.006, 0, 0.07 + 0.02 * hash(i), -0.006, 0.006);
      place();
    }
  }
  {
    // call button, menu stand and cutlery box by the window
    const xw = TBX[0] + 0.12;
    box("dark", xw - 0.04, xw + 0.04, TY, TY + 0.035, LZ + 0.12, LZ + 0.22);
    blob("vinyl", [xw, TY + 0.04, LZ + 0.17], [0.024, 0.016, 0.024], 1, 4, 8);
    // menu stand: a dark foot and a tilted card
    box("dark", xw - 0.04, xw + 0.04, TY, TY + 0.02, LZ - 0.05, LZ + 0.06);
    place(xw, TY + 0.02, LZ, 0, 0, -0.2);
    box("amber", -0.006, 0.006, 0, 0.17, -0.07, 0.07);
    box("pale", 0.006, 0.009, 0.03, 0.15, -0.055, 0.055);
    place();
    // cutlery box with the handles showing
    box("dark", xw - 0.06, xw + 0.06, TY, TY + 0.06, LZ - 0.28, LZ - 0.12);
    for (let i = 0; i < 4; i++) {
      const hz = LZ - 0.255 + i * 0.035;
      rod("metal", [xw - 0.02, TY + 0.06, hz], [xw + 0.05, TY + 0.1, hz], 0.006, 5);
    }
  }

  // ---------- pendant lamps ----------
  for (let b = 0; b < 3; b++) {
    const lx = (TBX[0] + TBX[1]) / 2, lz = tableZ(b), y1 = 1.52;
    rod("dark", [lx, y1 + 0.2, lz], [lx, TOP, lz], 0.006, 4);
    lathe("amber", [[0, y1], [0.17, y1], [0.17, y1 + 0.025], [0.06, y1 + 0.19], [0.025, y1 + 0.22], [0, y1 + 0.22]], lx, lz, 16);
    fan(lamps ? "bulb" : "dark", onYd(y1 - 0.002), disc(lx, lz, 0.15, 16));
    blob(lamps ? "streak" : "pale", [lx, y1 - 0.01, lz], [0.045, 0.04, 0.045], 1, 4, 8);
    if (lamps) fan("glow", onY(TY + 0.001), disc(lx + 0.05, lz, 0.22, 16, 0.2));
  }

  // ---------- drink bar ----------
  {
    const z1 = Z0 + BAR.d;
    box("pale", BAR.x0 + 0.03, BAR.x1 - 0.03, FT, BAR.y - 0.04, Z0, z1 - 0.04); // body
    rect("stripe", onZ(z1 - 0.039), BAR.x0 + 0.03, BAR.x1 - 0.03, 0.62, 0.7);
    box("dark", BAR.x0 + 0.05, BAR.x1 - 0.05, FT, 0.1, Z0, z1 - 0.06); // kick
    box("dark", BAR.x0, BAR.x1, BAR.y - 0.04, BAR.y, Z0, z1); // top
    // dispensers: sclera boxes with a dark front, flavour panels, nozzles, a drip tray
    for (const [m0, m1, nf] of [[BAR.x0 + 0.06, BAR.x0 + 0.56, 4], [BAR.x0 + 0.62, BAR.x0 + 0.92, 2]]) {
      const yz = BAR.y, zb = Z0 + 0.06, zf = Z0 + 0.48, top = yz + 0.68;
      box("metal", m0, m1, yz, top, zb, zf);
      box("dark", m0 + 0.03, m1 - 0.03, yz + 0.3, top - 0.05, zf, zf + 0.012);
      const w = (m1 - m0 - 0.08) / nf;
      for (let i = 0; i < nf; i++) {
        const u0 = m0 + 0.04 + i * w + 0.01, u1 = u0 + w - 0.02;
        rect(["dusk", "lit", "horizon", "streak"][i % 4], onZ(zf + 0.0135), u0, u1, top - 0.24, top - 0.08); // flavour panel
        rect("lit", onZ(zf + 0.0135), u0 + 0.015, u1 - 0.015, yz + 0.34, yz + 0.38); // push button
        cyl("dark", (u0 + u1) / 2, zf - 0.04, yz + 0.24, yz + 0.3, 0.014, 8); // nozzle
      }
      box("dark", m0 + 0.02, m1 - 0.02, yz, yz + 0.03, zf - 0.12, zf + 0.04); // drip tray
    }
    // three stacks of glasses on the counter's free end
    const stack = (x, z, k) => {
      const prof = [[0, BAR.y]];
      for (let i = 0; i < k; i++) {
        const y = BAR.y + i * 0.035;
        prof.push([0.032, y], [0.038, y + 0.03], [0.036, y + 0.03]);
      }
      prof.push([0.038, BAR.y + k * 0.035 + 0.08], [0, BAR.y + k * 0.035 + 0.08]);
      lathe("metal", prof, x, z, 10);
    };
    stack(BAR.x1 - 0.08, Z0 + 0.42, 5);
    stack(BAR.x1 - 0.08, Z0 + 0.25, 4);
    stack(BAR.x1 - 0.17, Z0 + 0.5, 3);
    // menu board on the wall above: a dark frame, a pink face, three amber food pictures
    const mb = { x0: BAR.x0 + 0.05, x1: BAR.x1 - 0.05, y0: 1.72, y1: 2.18 };
    box("dark", mb.x0, mb.x1, mb.y0, mb.y1, Z0, Z0 + 0.03);
    rect("dusk", onZ(Z0 + 0.031), mb.x0 + 0.03, mb.x1 - 0.03, mb.y0 + 0.03, mb.y1 - 0.03);
    for (let i = 0; i < 3; i++) {
      const u = mb.x0 + 0.2 + i * ((mb.x1 - mb.x0 - 0.4) / 2);
      fan("lit", onZ(Z0 + 0.032), disc(u, mb.y0 + 0.26, 0.1, 14, 0.09));
      rect("streak", onZ(Z0 + 0.032), u - 0.1, u + 0.1, mb.y0 + 0.07, mb.y0 + 0.11);
    }
  }

  // ---------- entrance door, host stand, plants ----------
  {
    const dz = Z0 + 0.002;
    dusk((i) => onZ(dz + i * 0.001), DOOR.x0, DOOR.x1, 0.12, DOOR.y1, 41);
    box("pale", DOOR.x0 - 0.06, DOOR.x0, FT, DOOR.y1 + 0.06, Z0, Z0 + 0.06);
    box("pale", DOOR.x1, DOOR.x1 + 0.06, FT, DOOR.y1 + 0.06, Z0, Z0 + 0.06);
    box("pale", DOOR.x0, DOOR.x1, DOOR.y1, DOOR.y1 + 0.06, Z0, Z0 + 0.06);
    box("dark", DOOR.x0, DOOR.x1, FT, 0.12, Z0, Z0 + 0.04); // kick rail
    rod("metal", [DOOR.x0 + 0.1, 0.8, Z0 + 0.07], [DOOR.x0 + 0.1, 1.3, Z0 + 0.07], 0.014, 6); // pull bar
    box("dark", DOOR.x0 - 0.1, DOOR.x1 + 0.1, FT, FT + 0.008, Z0, Z0 + 0.5); // mat
    // host stand: a dark lectern, its pale top sloping toward the door
    const hx = 1.5, hz = Z0 + 1.05;
    box("dark", hx - 0.22, hx + 0.22, FT, 0.95, hz - 0.15, hz + 0.15);
    hex("pale", [[hx - 0.26, 0.95, hz - 0.2], [hx + 0.26, 0.95, hz - 0.2], [hx + 0.26, 1.0, hz + 0.2], [hx - 0.26, 1.0, hz + 0.2],
      [hx - 0.26, 1.03, hz - 0.2], [hx + 0.26, 1.03, hz - 0.2], [hx + 0.26, 1.08, hz + 0.2], [hx - 0.26, 1.08, hz + 0.2]]);
    rect("stripe", onZ(hz + 0.151), hx - 0.18, hx + 0.18, 0.7, 0.78);
    blob("metal", [hx + 0.12, 1.1, hz + 0.05], [0.035, 0.025, 0.035], 1, 4, 8); // bell
  }
  function plant(x, z, s, seed) {
    lathe("pale", [[0, FT], [0.12 * s, FT], [0.16 * s, FT + 0.34 * s], [0.17 * s, FT + 0.36 * s], [0.17 * s, FT + 0.4 * s], [0, FT + 0.4 * s]], x, z, 12);
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + hash(seed + i), tilt = 0.25 + 0.4 * hash(seed + i + 20);
      place(x, FT + 0.36 * s, z, a, 0, tilt);
      blob("dark", [0, 0.32 * s, 0], [0.07 * s, 0.34 * s, 0.025 * s], 0.9, 4, 8);
      place();
    }
  }
  plant(1.8, Z0 + 0.42, 1.05, 3);
  plant(BXA + 0.25, Z0 + 0.25, 1, 9);

  // ---------- meshes ----------
  const MAT = { // [base, shade, threshold, ink px (0 = no hull)]
    wall: [c.wall, c.wall, 0.1, 0],
    floor: [c.floor, c.floor, 0.1, 2],
    check: [c.check, c.check, 0.1, 0],
    vinyl: [c.vinyl, c.vinylShade, 0.1, 2],
    dark: [c.dark, c.darkShade, 0.1, 2],
    pale: [c.pale, c.paleShade, 0.1, 1.5],
    metal: [c.metal, c.metalShade, 0.1, 1.5],
    amber: [c.amber, c.amberShade, 0.1, 1.5],
    sky: [c.sky, c.sky, -1, 0],
    dusk: [c.dusk, c.dusk, -1, 0],
    horizon: [c.horizon, c.horizon, -1, 0],
    city: [c.city, c.city, -1, 0],
    lit: [c.lit, c.lit, -1, 0],
    streak: [c.streak, c.streak, -1, 0],
    stripe: [c.stripe, c.stripe, -1, 0],
    glow: [c.glow, c.glow, -1, 0],
    bulb: [c.bulb, c.bulb, -1, 0],
  };
  const geo = (s) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    return g;
  };
  // soups whose materials draw the same (same tones and hull; single-tone ones whatever their threshold) share a mesh
  const groups = new Map();
  for (const [key, s] of Object.entries(soups)) {
    if (key === "wallInk" || !s.p.length) continue;
    const [base, shade, threshold, px] = MAT[key];
    const sig = base === shade ? `${base}|${px}` : `${base}|${shade}|${threshold}|${px}`;
    if (!groups.has(sig)) groups.set(sig, { keys: [], p: [], n: [], mat: [base, shade, base === shade ? 0 : threshold, px] });
    const g = groups.get(sig);
    g.keys.push(key);
    for (let i = 0; i < s.p.length; i++) g.p.push(s.p[i]), g.n.push(s.n[i]);
  }
  for (const g of groups.values()) {
    const [base, shade, threshold, px] = g.mat;
    const mesh = kit.toon(geo(g), base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = g.keys.join("+");
    if (g.keys.includes("wall")) // ink the whole-wall twins and keep only their hulls
      for (const h of kit.outline(new THREE.Mesh(geo(soups.wallInk), mesh.material), { px: 2.5 }).children.slice()) mesh.add(h);
    set.add(mesh);
  }
  const anchor = (name, x, y, z) => { const a = new THREE.Group(); a.name = name; a.position.set(x, y, z); set.add(a); joints[name] = a; };
  anchor("floor", 0, FT, 0);
  anchor("table", (TBX[0] + TBX[1]) / 2, TY, LZ);
  anchor("window", X0, (WIN.y0 + WIN.y1) / 2, (WIN.z0 + WIN.z1) / 2);
  anchor("bar", (BAR.x0 + BAR.x1) / 2, BAR.y, Z0 + BAR.d / 2);
  anchor("door", (DOOR.x0 + DOOR.x1) / 2, 1.0, Z0);

  function pose(name) {
    if (name !== "rest") throw new Error(`famiresu: unknown pose "${name}" (rest only)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
