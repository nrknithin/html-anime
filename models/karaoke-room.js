// karaoke-room.js - a small anime karaoke box room (the after-school "karaoke box" scene), cut away, with a mirror ball.
// Contract: harness/lab/README.md. Meters, +Y up, the room's open (cutaway) sides face +X and +Z so a camera in the
// lit front-left quadrant looks in; the -Z wall holds the screen and the door, the -X wall backs the sofa. Stands on
// y = 0 (the carpet top is y = 0.02, joints.floor), centred on the room.
//
// Construction (boxes, lathes, superellipsoid cushions and flat decals, all triangle soups merged per material, as
// bedroom.js; boxes flat shaded so furniture reads crisp, cushions carry analytic normals so vinyl reads soft; every
// closed part is wound away from a point inside it, never by hand):
//   SHELL    a carpet slab, two walls 0.1 thick with a skirting board and an accent stripe at 1 m (a glowing LED strip
//            at night). The walls have no hull of their own; whole-wall twins ("wallInk", hull only) ink them.
//   SOFA     a U-shaped vinyl bench: the base run along the -X wall, one arm along the -Z wall (both with back
//            cushions against the wall), one backless front arm; a dark plinth, a vinyl frame, boxy cushions.
//   TABLE    a low table in the U: two microphones lying down (dark bodies, pale ball heads), a song-list binder
//            with rings, three glasses with drinks, a tambourine (rim, head, jingle pairs in slots).
//   SCREEN   wall-mounted on the -Z wall, a dark bezel round a glowing lyric-bar card: a pink sky with a sun disc over
//            a dark band holding two lyric bars, the first half wiped amber, and a singer dot. No lettering.
//   LIGHTS   a mirror ball on a drop rod from a wall bracket over the table (faceted, inset tiles over a dark core,
//            a few pink and amber tiles), two spot cans on the -Z wall aimed at the table, glowing lenses.
//            Light flecks from the ball are cast each pose onto the carpet, the table top and both walls.
//   DOOR     on the -Z wall right of the screen: a dark leaf in a pale frame, a narrow vertical glass slit, a lever.
// Proportions (real size, base unit the wall top 2.4 m = meta.height): room 3.6 x 2.8 inside; seat 0.44, depth
//   0.55, backs 0.9; table 0.6 x 0.85 at 0.44; screen 0.95 x 0.55 at 1.15; door 0.62 x 2.0, slit 0.09 x 0.9;
//   mirror ball r 0.13 at 1.9 over the table centre.
// Options: build(THREE, kit, colors, { height, night = false }).
//   height  scales the whole set so the wall top is `height` (default 2.4).
//   night   room lights off: walls, carpet, sofa and wood drop to the script's dark tones; only the screen, the
//           practicals (spot lenses, the LED strip, the lit door slit) and their pools of light glow.
// Clip: spin 4 s, the mirror ball turns once about its drop rod, its flecks sweep the room (pose("spin@1.2")).
// Ink: hulls are 2 px (a room is seen small); decals and the screen have none.
// Colours (festival script, every hex from it): walls moon #ffd7a1 (flat), sky #24143a at night; carpet sky / hair
//   #1a1020, hair flat at night; vinyl accent #ff4d6d / sky (night: threshold up, so only tops stay pink); plinth and
//   dark parts (bezel, mic bodies, cans, bracket, door leaf, table legs) sky / hair; table top and trim line
//   #fff1ea / iris #ffd0a1; metal and glass sclera #f6f3ee / iris; binder and drinks practical #ffb020 / accent;
//   screen accent, sky, moon, line, practical (glowing, single tone); ball sclera / iris tiles over a hair core;
//   lenses, LED strip, door slit and pools practical; flecks line.
// Joints: ball (the spin pivot) and anchors floor, table, screen, door.

export const meta = {
  name: "karaoke-room",
  height: 2.4,
  script: "festival",
  colors: {
    wall: "#ffd7a1", wallNight: "#24143a",
    carpet: "#24143a", carpetShade: "#1a1020",
    vinyl: "#ff4d6d", vinylShade: "#24143a",
    dark: "#24143a", darkShade: "#1a1020",
    pale: "#fff1ea", paleShade: "#ffd0a1",
    metal: "#f6f3ee", metalShade: "#ffd0a1",
    amber: "#ffb020", amberShade: "#ff4d6d",
    stripe: "#ff4d6d",
    core: "#1a1020",
    scrPink: "#ff4d6d", scrDark: "#24143a", scrSun: "#ffd7a1", scrBar: "#fff1ea", scrWipe: "#ffb020",
    glow: "#ffb020",
    fleck: "#fff1ea",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height, night = false } = opts;
  const c = { ...meta.colors, ...colors };
  const TAU = Math.PI * 2;
  const root = new THREE.Group();
  root.name = "karaoke-room";
  const set = new THREE.Group(); // the uniform size scale lives here
  set.name = "room";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = {};

  // ---------- triangle soups with normals, per target group, through an optional placement matrix ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const targets = { set: {}, ball: {} };
  let T = "set";
  const S = (key) => (targets[T][key] ??= { p: [], n: [] });
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
  const cyl = (key, cx, cz, y0, y1, r, n = 16) => lathe(key, [[0, y0], [r, y0], [r, y1], [0, y1]], cx, cz, n);
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
  // superellipsoid at o with radii r (axis aligned); e < 1 boxy, e = 1 an ellipsoid
  const spow = (w, p) => Math.sign(w) * Math.pow(Math.abs(w), p);
  // bias: added to every unit normal before renormalising (leans a cushion's shading toward the light)
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
  const rect = (key, F, u0, u1, v0, v1) => quad(key, F.W(u0, v0), F.W(u1, v0), F.W(u1, v1), F.W(u0, v1), F.back((u0 + u1) / 2, (v0 + v1) / 2));
  function fan(key, F, poly) {
    const cu = poly.reduce((s, p) => s + p[0], 0) / poly.length, cv = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      tri(key, F.W(cu, cv), F.W(a[0], a[1]), F.W(b[0], b[1]), F.back(cu, cv));
    }
  }
  const disc = (u, v, r, n = 16, rv = r) => Array.from({ length: n }, (_, i) => [u + r * Math.cos((i / n) * TAU), v + rv * Math.sin((i / n) * TAU)]);
  // a rounded bar (stadium) from u0 to u1 at height v, half-thickness h
  const pill = (u0, u1, v, h, n = 6) => [
    ...Array.from({ length: n + 1 }, (_, i) => { const a = -Math.PI / 2 + (i / n) * Math.PI; return [u1 - h + h * Math.cos(a), v + h * Math.sin(a)]; }),
    ...Array.from({ length: n + 1 }, (_, i) => { const a = Math.PI / 2 + (i / n) * Math.PI; return [u0 + h + h * Math.cos(a), v + h * Math.sin(a)]; }),
  ];
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  // ---------- dimensions ----------
  const X0 = -1.8, X1 = 1.8, Z0 = -1.4, Z1 = 1.4, TW = 0.1, FT = 0.02, TOP = 2.4;
  const SD = 0.55, SEAT = 0.44, BACK = 0.9, BT = 0.2; // sofa depth, seat top, back top, back thickness
  const AX = -0.15; // the arms end here
  const FZ0 = 0.5, FZ1 = FZ0 + SD; // front arm
  const TB = { x0: -1.0, x1: -0.4, z0: -0.62, z1: 0.23, y: 0.44 };
  const TC = [(TB.x0 + TB.x1) / 2, (TB.z0 + TB.z1) / 2];
  const SCR = { x0: 0.0, x1: 0.95, y0: 1.15, y1: 1.7 };
  const DOOR = { x0: 1.1, x1: 1.72, y1: 2.0 };
  const BALL = { x: TC[0], z: TC[1], y: 1.9, r: 0.13 };

  // ---------- carpet ----------
  box("carpet", X0 - TW, X1, 0, FT, Z0 - TW, Z1);

  // ---------- walls ----------
  box("wall", X0 - TW, X0, FT, TOP, Z0 - TW, Z1); // -X wall
  box("wall", X0, X1, FT, TOP, Z0 - TW, Z0); // -Z wall
  box("wallInk", X0 - TW, X0, FT, TOP, Z0 - TW, Z1);
  box("wallInk", X0, X1, FT, TOP, Z0 - TW, Z0);
  box("pale", X0, X0 + 0.015, FT, 0.09, Z0, Z1); // skirting
  box("pale", X0, DOOR.x0 - 0.06, FT, 0.09, Z0, Z0 + 0.015);
  box("pale", DOOR.x1 + 0.06, X1, FT, 0.09, Z0, Z0 + 0.015);
  // accent stripe (an LED strip at night) at 1 m round both walls, broken by the screen's bezel and the door frame
  const SY0 = 0.98, SY1 = 1.03, stripeKey = night ? "glow" : "stripe";
  rect(stripeKey, onX(X0 + 0.002), Z0, Z1, SY0, SY1);
  rect(stripeKey, onZ(Z0 + 0.002), X0, DOOR.x0 - 0.06, SY0, SY1);

  // ---------- sofa: U of vinyl benches ----------
  // frame + plinth per run, then cushions. Runs: base (along -X), arm (along -Z), front (backless)
  const runs = [
    { x0: X0, x1: X0 + SD, z0: Z0, z1: FZ1 },
    { x0: X0 + SD, x1: AX, z0: Z0, z1: Z0 + SD },
    { x0: X0 + SD, x1: AX, z0: FZ0, z1: FZ1 },
  ];
  for (const r of runs) {
    box("dark", r.x0 + (r.x0 === X0 ? 0 : 0.03), r.x1 - 0.03, FT, 0.12, r.z0 + (r.z0 === Z0 ? 0 : 0.03), r.z1 - 0.03);
    box("vinyl", r.x0, r.x1, 0.12, 0.3, r.z0, r.z1);
  }
  const cushion = (x0, x1, z0, z1) => blob("vinyl", [(x0 + x1) / 2, 0.37, (z0 + z1) / 2], [(x1 - x0) / 2 - 0.008, 0.075, (z1 - z0) / 2 - 0.008], 0.28);
  // bias: the -Z arm's backs face +Z (dot 0.30), shade at the night threshold; leaning their normals toward +X keeps
  // their faces lit (dot ~0.67) without changing the day look
  const backC = (x0, x1, z0, z1, bias) => blob("vinyl", [(x0 + x1) / 2, (0.3 + BACK) / 2, (z0 + z1) / 2], [(x1 - x0) / 2 - 0.006, (BACK - 0.3) / 2, (z1 - z0) / 2 - 0.006], 0.3, 6, 12, bias);
  // base run: back cushions along -X, seats from the corner to the front
  const bz = [Z0, -0.75, -0.1, FZ0, FZ1];
  for (let i = 0; i + 1 < bz.length; i++) {
    cushion(X0 + BT, X0 + SD, i === 0 ? Z0 + BT : bz[i], bz[i + 1]);
    backC(X0, X0 + BT, bz[i], bz[i + 1]);
  }
  // arm along -Z: back cushions against the wall, two seats
  const ax = [X0 + BT, X0 + SD, -0.7, AX];
  for (let i = 0; i + 1 < ax.length; i++) backC(ax[i], ax[i + 1], Z0, Z0 + BT, [0.5, 0.2, 0]);
  cushion(X0 + SD, -0.7, Z0 + BT, Z0 + SD);
  cushion(-0.7, AX, Z0 + BT, Z0 + SD);
  // front arm: backless, two seats
  cushion(X0 + SD, -0.7, FZ0, FZ1);
  cushion(-0.7, AX, FZ0, FZ1);

  // ---------- table and what is on it ----------
  const TT = 0.035;
  box("pale", TB.x0, TB.x1, TB.y - TT, TB.y, TB.z0, TB.z1);
  for (const [x, z] of [[TB.x0 + 0.06, TB.z0 + 0.06], [TB.x1 - 0.06, TB.z0 + 0.06], [TB.x0 + 0.06, TB.z1 - 0.06], [TB.x1 - 0.06, TB.z1 - 0.06]])
    box("dark", x - 0.025, x + 0.025, FT, TB.y - TT, z - 0.025, z + 0.025);
  box("dark", TB.x0 + 0.04, TB.x1 - 0.04, TB.y - TT - 0.06, TB.y - TT, TB.z0 + 0.04, TB.z1 - 0.04); // apron
  const TY = TB.y;
  // microphones: a tapered dark handle and a pale ball head, lying on the top
  function mic(x, z, yaw) {
    const r = 0.026;
    place(x, TY + r, z, yaw, 0, -Math.PI / 2);
    lathe("dark", [[0, -0.1], [0.015, -0.1], [0.022, 0.06], [0.025, 0.09], [0, 0.09]], 0, 0, 8);
    place();
    const hx = x + Math.cos(yaw) * 0.125, hz = z - Math.sin(yaw) * 0.125;
    blob("metal", [hx, TY + 0.036, hz], [0.036, 0.036, 0.036], 1, 5, 10);
  }
  mic(-0.82, -0.4, 0.35);
  mic(-0.46, -0.1, -Math.PI / 2);
  // song-list binder, closed, with its rings showing at the spine
  box("amber", -0.615, -0.44, TY, TY + 0.03, -0.5, -0.24);
  box("dark", -0.64, -0.615, TY, TY + 0.034, -0.505, -0.235); // spine
  rect("pale", onY(TY + 0.0305), -0.58, -0.47, -0.42, -0.4); // label band, no lettering
  // glasses, full: a closed tumbler with the drink as a disc inside its rim (no inner wall to wind)
  for (const [x, z, k] of [[-0.9, -0.05, 0], [-0.86, 0.14, 1], [-0.72, -0.2, 2]]) {
    lathe("metal", [[0, TY], [0.032, TY], [0.036, TY + 0.12], [0, TY + 0.12]], x, z, 12);
    fan(k === 1 ? "vinyl" : "amber", onY(TY + 0.1205), disc(x, z, 0.029, 12));
  }
  // tambourine: a drum-like rim with jingle pairs in slots, its pale head a disc inside the rim
  {
    const tx = -0.62, tzc = 0.08, R = 0.1, ty = TY;
    lathe("vinyl", [[0, ty], [R, ty], [R, ty + 0.04], [0, ty + 0.04]], tx, tzc, 20);
    fan("pale", onY(ty + 0.0405), disc(tx, tzc, R - 0.013, 20));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + 0.4;
      const [jx, jz] = [tx + Math.cos(a) * (R + 0.006), tzc + Math.sin(a) * (R + 0.006)];
      cyl("metal", jx, jz, ty + 0.012, ty + 0.018, 0.017, 8);
      cyl("metal", jx, jz, ty + 0.022, ty + 0.028, 0.017, 8);
    }
  }

  // ---------- screen ----------
  const BZ = Z0 + 0.05;
  box("dark", SCR.x0 - 0.04, SCR.x1 + 0.04, SCR.y0 - 0.04, SCR.y1 + 0.04, Z0, BZ); // bezel
  box("dark", (SCR.x0 + SCR.x1) / 2 - 0.12, (SCR.x0 + SCR.x1) / 2 + 0.12, SCR.y0 - 0.06, SCR.y0 - 0.04, Z0, BZ - 0.01); // bottom lip
  const SF = onZ(BZ + 0.001), SF2 = onZ(BZ + 0.002), SF3 = onZ(BZ + 0.003);
  const bandTop = SCR.y0 + 0.2;
  rect("scrPink", SF, SCR.x0, SCR.x1, bandTop, SCR.y1);
  rect("scrDark", SF, SCR.x0, SCR.x1, SCR.y0, bandTop);
  // the sun, a half disc sitting on the band
  fan("scrSun", SF2, disc(SCR.x0 + 0.62, bandTop, 0.12, 20).filter((p) => p[1] >= bandTop - 1e-6).concat([[SCR.x0 + 0.5, bandTop]]));
  // lyric bars: line one, its first half wiped amber; line two, indented
  const L1 = [SCR.x0 + 0.1, SCR.x1 - 0.18, SCR.y0 + 0.135], L2 = [SCR.x0 + 0.26, SCR.x1 - 0.08, SCR.y0 + 0.06];
  fan("scrBar", SF2, pill(L1[0], L1[1], L1[2], 0.022));
  fan("scrWipe", SF3, pill(L1[0], (L1[0] + L1[1]) / 2, L1[2], 0.022));
  fan("scrBar", SF2, pill(L2[0], L2[1], L2[2], 0.022));
  fan("scrWipe", SF2, disc(SCR.x0 + 0.05, L1[2], 0.018, 10)); // singer dot

  // ---------- speakers ----------
  box("dark", X0, X0 + 0.16, 1.82, 2.14, 0.72, 0.96);
  box("dark", -1.42, -1.18, 1.82, 2.14, Z0, Z0 + 0.16);
  rect("core", onX(X0 + 0.161), 0.75, 0.93, 1.85, 2.11);
  rect("core", onZ(Z0 + 0.161), -1.39, -1.21, 1.85, 2.11);

  // ---------- door ----------
  const DZ = Z0 + 0.04, fw = 0.06;
  box("dark", DOOR.x0, DOOR.x1, FT, DOOR.y1, Z0, DZ - 0.005); // leaf
  box("pale", DOOR.x0 - fw, DOOR.x0, FT, DOOR.y1 + fw, Z0, DZ + 0.01); // frame
  box("pale", DOOR.x1, DOOR.x1 + fw, FT, DOOR.y1 + fw, Z0, DZ + 0.01);
  box("pale", DOOR.x0, DOOR.x1, DOOR.y1, DOOR.y1 + fw, Z0, DZ + 0.01);
  const SL = { x0: DOOR.x0 + 0.1, x1: DOOR.x0 + 0.19, y0: 0.95, y1: 1.85 };
  rect(night ? "glow" : "metal", onZ(DZ - 0.004), SL.x0, SL.x1, SL.y0, SL.y1); // glass slit
  box("pale", SL.x0 - 0.02, SL.x1 + 0.02, SL.y0 - 0.02, SL.y0, Z0, DZ + 0.006); // slit frame
  box("pale", SL.x0 - 0.02, SL.x1 + 0.02, SL.y1, SL.y1 + 0.02, Z0, DZ + 0.006);
  box("pale", SL.x0 - 0.02, SL.x0, SL.y0, SL.y1, Z0, DZ + 0.006);
  box("pale", SL.x1, SL.x1 + 0.02, SL.y0, SL.y1, Z0, DZ + 0.006);
  // lever handle on a rose, at the slit's side of the leaf
  place(DOOR.x1 - 0.08, 0.98, DZ, 0, Math.PI / 2);
  lathe("metal", [[0, -0.005], [0.03, -0.005], [0.03, 0.01], [0, 0.01]], 0, 0, 12);
  place();
  box("metal", DOOR.x1 - 0.2, DOOR.x1 - 0.07, 0.965, 0.99, DZ + 0.01, DZ + 0.035);

  // ---------- spot lights on the -Z wall, aimed at the table ----------
  for (const sx of [-0.95, -0.35]) {
    box("dark", sx - 0.03, sx + 0.03, 2.2, 2.28, Z0, Z0 + 0.12); // bracket
    // can: axis tilted 45 deg forward (mouth toward +Z and down)
    place(sx, 2.2, Z0 + 0.15, 0, -Math.PI * 0.27);
    lathe("dark", [[0, 0.05], [0.06, 0.05], [0.06, -0.11], [0, -0.11]], 0, 0, 12);
    cyl("glow", 0, 0, -0.116, -0.108, 0.052, 12); // lens
    place();
  }

  // ---------- mirror ball: bracket from the -X wall, drop rod, faceted ball (its own group, spins) ----------
  const BY = 2.3;
  rod("dark", [X0, BY, BALL.z], [BALL.x, BY, BALL.z], 0.018, 6);
  box("dark", X0, X0 + 0.05, BY - 0.06, BY + 0.06, BALL.z - 0.05, BALL.z + 0.05);
  rod("metal", [BALL.x, BY, BALL.z], [BALL.x, BALL.y + BALL.r * 0.9, BALL.z], 0.007, 5);
  T = "ball";
  blob("core", [0, 0, 0], [BALL.r * 0.96, BALL.r * 0.96, BALL.r * 0.96], 1, 8, 16);
  {
    const nLat = 8, nLon = 16, R = BALL.r, gap = 0.12;
    const sph = (i, j) => { const th = -Math.PI / 2 + (i / nLat) * Math.PI, ph = (j / nLon) * TAU; return [R * Math.cos(th) * Math.cos(ph), R * Math.sin(th), R * Math.cos(th) * Math.sin(ph)]; };
    for (let i = 0; i < nLat; i++)
      for (let j = 0; j < nLon; j++) {
        const q = [sph(i, j), sph(i, j + 1), sph(i + 1, j + 1), sph(i + 1, j)];
        const m = mul(q.reduce((s, p) => add(s, p), [0, 0, 0]), 0.25);
        const k = q.map((p) => add(m, mul(sub(p, m), 1 - gap)));
        const h = hash(i * 31 + j * 7 + 3);
        const key = h < 0.1 ? "ballA" : h < 0.2 ? "ballP" : "ball";
        if (i === 0) tri(key, k[0], k[2], k[3], [0, 0, 0]);
        else if (i === nLat - 1) tri(key, k[0], k[1], k[2], [0, 0, 0]);
        else quad(key, k[0], k[1], k[2], k[3], [0, 0, 0]);
      }
  }
  T = "set";
  // at night the spots throw a pool of light on the table top
  if (night) {
    fan("glow", onY(TY + 0.001), disc(TC[0] + 0.05, TC[1] - 0.05, 0.24, 20, 0.3));
  }

  // ---------- meshes ----------
  const MAT = { // [base, shade, threshold, ink px (0 = no hull)]
    wall: night ? [c.wallNight, c.wallNight, 0.1, 0] : [c.wall, c.wall, 0.1, 0],
    carpet: night ? [c.carpetShade, c.carpetShade, 0.1, 2] : [c.carpet, c.carpetShade, 0.1, 2],
    vinyl: night ? [c.vinyl, c.vinylShade, 0.5, 2] : [c.vinyl, c.vinylShade, 0.1, 2],
    dark: night ? [c.darkShade, c.darkShade, 0.1, 2] : [c.dark, c.darkShade, 0.1, 2],
    pale: night ? [c.dark, c.darkShade, 0.3, 2] : [c.pale, c.paleShade, 0.1, 2],
    metal: [c.metal, c.metalShade, 0.1, 1.5],
    amber: night ? [c.amberShade, c.dark, 0.3, 1.5] : [c.amber, c.amberShade, 0.1, 1.5],
    stripe: [c.stripe, c.stripe, 0.1, 0],
    core: [c.core, c.core, 0.1, 0],
    scrPink: [c.scrPink, c.scrPink, -1, 0],
    scrDark: [c.scrDark, c.scrDark, -1, 0],
    scrSun: [c.scrSun, c.scrSun, -1, 0],
    scrBar: [c.scrBar, c.scrBar, -1, 0],
    scrWipe: [c.scrWipe, c.scrWipe, -1, 0],
    glow: [c.glow, c.glow, -1, 0],
    ball: [c.metal, c.metalShade, 0.35, 0],
    ballA: [c.vinyl, c.vinyl, 0.35, 0],
    ballP: [c.glow, c.glow, -1, 0],
    fleck: [c.fleck, c.fleck, -1, 0],
  };
  const geo = (s) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    return g;
  };
  // soups whose materials draw the same (same tones, threshold and hull; single-tone ones whatever their threshold)
  // share one mesh, so the mesh count drops without changing a pixel
  const meshes = (soups, parent, inkCore) => {
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
      const key = g.keys.join("+");
      mesh.name = parent.name === "room" ? key : `${parent.name}-${key}`;
      if (g.keys.includes("wall")) // ink the whole-wall twins and keep only their hulls
        for (const h of kit.outline(new THREE.Mesh(geo(soups.wallInk), mesh.material), { px: 2.5 }).children.slice()) mesh.add(h);
      if (inkCore && g.keys.includes("core"))
        for (const h of kit.outline(new THREE.Mesh(geo(g), mesh.material), { px: 2 }).children.slice()) mesh.add(h);
      parent.add(mesh);
    }
  };
  // the lyric bars share the fleck mesh (same unlit line tone): taken out here, written at the front of its buffer
  const bars = targets.set.scrBar;
  delete targets.set.scrBar;
  meshes(targets.set, set, false);
  const ball = new THREE.Group();
  ball.name = "ball";
  ball.position.set(BALL.x, BALL.y, BALL.z);
  set.add(ball);
  meshes(targets.ball, ball, true);
  joints.ball = ball;

  // flecks: the ball's light spots, cast each pose onto the carpet, the table top and the two walls. Each fleck is a
  // fixed direction from the ball centre, turned with the ball; its spot is the nearest hit on those planes inside
  // the room (rays that leave through the cutaway sides collapse to a point). One unlit mesh, positions rewritten.
  const NF = 60, FS = 8; // flecks, sides per spot
  const dirs = Array.from({ length: NF }, (_, i) => {
    const az = hash(i + 101) * TAU, el = (-40 + hash(i + 202) * 70) * (Math.PI / 180);
    return new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
  });
  const FB = bars.p.length; // the static lyric bars come first
  const fpos = new Float32Array(FB + NF * FS * 9), fnor = new Float32Array(FB + NF * FS * 9);
  fpos.set(bars.p);
  fnor.set(bars.n);
  const fgeo = new THREE.BufferGeometry();
  fgeo.setAttribute("position", new THREE.BufferAttribute(fpos, 3));
  fgeo.setAttribute("normal", new THREE.BufferAttribute(fnor, 3));
  const fleckMesh = kit.toon(fgeo, c.fleck, c.fleck, { threshold: -1, outline: false });
  fleckMesh.name = "flecks";
  set.add(fleckMesh);
  const O = [BALL.x, BALL.y, BALL.z], E = 0.004;
  const m5 = 0.08; // keeps spots off the room's edges
  const PLANES = [ // axis, plane value, in-bounds test on the hit point, (u, v) axes with u x v facing into the room
    [1, FT + E / 2, (h) => h[0] >= X0 && h[0] <= X1 - m5 && h[2] >= Z0 && h[2] <= Z1 - m5, 2, 0],
    [1, TY + E / 2, (h) => h[0] >= TB.x0 + 0.03 && h[0] <= TB.x1 - 0.03 && h[2] >= TB.z0 + 0.03 && h[2] <= TB.z1 - 0.03, 2, 0],
    [0, X0 + E, (h) => h[2] >= Z0 + m5 && h[2] <= Z1 - m5 && h[1] >= FT + m5 && h[1] <= TOP - m5, 1, 2],
    [2, Z0 + E, (h) => h[0] >= X0 + m5 && h[0] <= X1 - m5 && h[1] >= FT + m5 && h[1] <= TOP - m5, 0, 1],
  ];
  const dv = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0);
  function castFlecks(a) {
    for (let i = 0; i < NF; i++) {
      dv.copy(dirs[i]).applyAxisAngle(UPV, a);
      const d = [dv.x, dv.y, dv.z];
      let best = null;
      for (const [ax, val, ok, ua, va] of PLANES) {
        if (Math.abs(d[ax]) < 1e-6) continue;
        const t = (val - O[ax]) / d[ax];
        if (t <= 0.05 || (best && t >= best.t)) continue;
        const h = [O[0] + d[0] * t, O[1] + d[1] * t, O[2] + d[2] * t];
        if (ok(h)) best = { t, h, ax, ua, va };
      }
      for (let k = 0; k < FS; k++) {
        const o = FB + (i * FS + k) * 9;
        const pts = best ? [[0, 0], [Math.cos((k / FS) * TAU), Math.sin((k / FS) * TAU)], [Math.cos(((k + 1) / FS) * TAU), Math.sin(((k + 1) / FS) * TAU)]] : [[0, 0], [0, 0], [0, 0]];
        const r = best ? 0.012 + 0.016 * best.t : 0;
        for (let m = 0; m < 3; m++) {
          const q = best ? best.h.slice() : O.slice();
          if (best) { q[best.ua] += pts[m][0] * r; q[best.va] += pts[m][1] * r; }
          fpos.set(q, o + m * 3);
          fnor.set(best ? [best.ax === 0 ? 1 : 0, best.ax === 1 ? 1 : 0, best.ax === 2 ? 1 : 0] : [0, 1, 0], o + m * 3);
        }
      }
    }
    fgeo.attributes.position.needsUpdate = true;
    fgeo.attributes.normal.needsUpdate = true;
    fgeo.computeBoundingSphere();
    fgeo.computeBoundingBox();
  }
  const anchor = (name, x, y, z) => { const a = new THREE.Group(); a.name = name; a.position.set(x, y, z); set.add(a); joints[name] = a; };
  anchor("floor", 0, FT, 0);
  anchor("table", TC[0], TY, TC[1]);
  anchor("screen", (SCR.x0 + SCR.x1) / 2, (SCR.y0 + SCR.y1) / 2, BZ);
  anchor("door", (DOOR.x0 + DOOR.x1) / 2, 1.0, DZ);

  // ---------- poses and the spin clip ----------
  // Sign: +ry turns the ball counter-clockwise seen from above; one turn per clip, so the loop is seamless.
  const CLIPS = { spin: 4 };
  const apply = (a) => {
    ball.rotation.set(0, a, 0);
    castFlecks(a);
    root.updateMatrixWorld(true);
  };
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`karaoke-room: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      const t = ((+m[2] % CLIPS[m[1]]) + CLIPS[m[1]]) % CLIPS[m[1]];
      return apply((t / CLIPS[m[1]]) * TAU);
    }
    if (name !== "rest") throw new Error(`karaoke-room: unknown pose "${name}" (rest, or spin@<seconds>)`);
    apply(0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
