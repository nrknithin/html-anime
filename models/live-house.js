// live-house.js - a small Japanese "live house" (indie music club) at real size, cut away: the girl-band stage.
// Contract: harness/lab/README.md. Meters, +Y up. The room is 9 m long (x) and 7 m wide (z). The stage is the -X
// end and faces +X, down the room, so a camera in the lit front-left quadrant looks at the band's gear head on; the
// -X wall (black, with the banner) and the -Z wall (the bar side) stand, the +X and +Z sides are open. Stands on
// y = 0 (the floor top is y = 0.02, joints.floor), centred on the room.
//
// Construction (boxes, lathes, rods and flat decals, triangle soups merged per material as karaoke-room.js; every
// closed part is wound away from a point inside it, never by hand):
//   SHELL    a floor slab, the black back wall (-X) and the dark purple side wall (-Z), 0.15 thick.
//   STAGE    a black 0.6 m deck across the room's end, 2.5 m deep, its lip taped pale; a 0.3 m drum riser on it,
//            stairs at the -Z end.
//   DRUMS    kick (pink shell, pale head with a star), two rack toms on a post, a floor tom on legs, a snare on a
//            tripod, hi-hat, crash and ride on straight stands, a throne. Shells pink, heads pale, cymbals brass.
//   AMPS     a guitar half stack and a guitar combo (stage right) and a bass 8x10 stack with its head (stage left):
//            dark bodies, pale grille cloth, dark speaker cones with brass dust caps, a brass control strip each.
//   FRONT    three mic stands (tripod, pole, angled mic) and three floor wedges at the lip.
//   TRUSS    a box truss over the stage front on two ground-support towers: four chords and zig-zag lacing.
//            Six par cans hang from it aimed at the band (pink and amber), and two moving heads (yoke, head).
//   BANNER   a pink backdrop on the back wall, a big pale star between two amber lightning bolts; no lettering.
//   SIDE     a PA main on a wall bracket by the stage; gig flyers on the -Z wall as blank colour blocks.
//   FLOOR    a crowd barrier (posts, two rails, foot plates) in front of the stage; a bar on the -Z wall (back bar
//            with bottles, a counter with a pink LED strip, three stools); a mixing desk on a railed riser at the
//            back corner (+X, -Z), its sloped console with fader strips and lit meters.
//   LIGHTS   (option) each beam is a fan of thin unlit rays from the lens to its pool on the deck or the floor,
//            pink and amber from the pars, pale from the moving heads; pools are flat unlit ellipses.
// Proportions (real size, base unit the wall top 3.6 m = meta.height): room 9 x 7; stage 0.6 high, 2.5 deep;
//   riser 1.4 x 2.2 x 0.3; kick 22" (r 0.28); truss 0.3 square at 3.15 (centre); pars r 0.1; barrier 1.1 high at
//   0.7 m from the stage; bar counter 1.05; mix riser 0.45.
// Options: build(THREE, kit, colors, { height, lights = true }).
//   height  scales the whole set so the wall top is `height` (default 3.6).
//   lights  the coloured beams and their pools (the lenses glow either way).
// Clip: strobe 2 s, the moving heads sweep (pan and tilt) and the par beams pulse, pink and amber in turn; one
//   mesh per material whose vertices pose() rewrites (mover bodies, and the three beam meshes).
// Ink: hulls 2 px on the shell and gear, 1.5 on metal, brass and the bar tops (a room is seen small); decals,
//   glow and beams have none.
// Colours (festival script, every hex from it): side wall, floor and gear bodies sky #24143a / hair #1a1020;
//   back wall, deck, knobs and fader caps hair (flat); stands, truss, rails metal sclera #f6f3ee / iris #ffd0a1;
//   shells and stool seats accent #ff4d6d / sky; banner, LED strip and pink beams accent (flat); cymbals, dust caps
//   and amp strips moon #ffd7a1 / practical #ffb020; heads, grilles, tape, faders, bar tops line #fff1ea / iris;
//   lenses, bolts, meters and amber beams practical (flat); star and mover beams line (flat); flyers mix them.
// Joints: moverL, moverR (pan pivots) with headL, headR (tilt), anchors floor, stage, drums, bar, desk.

export const meta = {
  name: "live-house",
  height: 3.6,
  script: "festival",
  colors: {
    room: "#24143a", roomShade: "#1a1020",
    black: "#1a1020",
    dark: "#24143a", darkShade: "#1a1020",
    metal: "#f6f3ee", metalShade: "#ffd0a1",
    pink: "#ff4d6d", pinkShade: "#24143a",
    brass: "#ffd7a1", brassShade: "#ffb020",
    pale: "#fff1ea", paleShade: "#ffd0a1",
    banner: "#ff4d6d",
    star: "#fff1ea",
    amber: "#ffb020",
    beamPink: "#ff4d6d",
    beamWhite: "#fff1ea",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height, lights = true } = opts;
  const c = { ...meta.colors, ...colors };
  const TAU = Math.PI * 2;
  const root = new THREE.Group();
  root.name = "live-house";
  const set = new THREE.Group(); // the uniform size scale lives here
  set.name = "room";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = {};

  // ---------- triangle soups with normals (and an owner per vertex for the rewritten mesh) ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  let OWN = -1; // owner index of the vertices being written (-1 static)
  const S = (key) => (soups[key] ??= { p: [], n: [], o: [] });
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
    const push = (q, qn) => (s.p.push(...q), s.n.push(...qn), s.o.push(OWN));
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
    a = P(a), b = P(b);
    const keep = M;
    M = null;
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
    M = keep;
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
  // a filled star (n points) as one triangle per point plus the inner polygon, on plane F
  function star(key, F, u, v, R, r, np = 5, rot = Math.PI / 2) {
    const pts = Array.from({ length: np * 2 }, (_, i) => { const a = rot + (i / (np * 2)) * TAU, q = i % 2 ? r : R; return [u + q * Math.cos(a), v + q * Math.sin(a)]; });
    fan(key, F, pts.filter((_, i) => i % 2));
    for (let i = 0; i < np; i++) {
      const a = pts[(i * 2 + 1) % (np * 2)], t = pts[i * 2], b = pts[(i * 2 + np * 2 - 1) % (np * 2)];
      tri(key, F.W(...t), F.W(...a), F.W(...b), F.back(u, v));
    }
  }

  // ---------- dimensions ----------
  const X0 = -4.5, X1 = 4.5, Z0 = -3.5, Z1 = 3.5, TW = 0.15, FT = 0.02, TOP = 3.6;
  const SH = 0.6, SX = -2.0; // stage deck height and its front edge
  const RIS = { x0: -4.45, x1: -3.05, z0: -1.1, z1: 1.1, y: SH + 0.3 }; // drum riser
  const DY = RIS.y;
  const TR = { x: -2.25, y: 3.15, h: 0.15, z0: -3.25, z1: 3.25 }; // truss centre line, half section
  const BAR = { x0: 0.0, x1: 2.85 };
  const MIX = { x0: 3.0, x1: X1, z0: Z0, z1: -1.4, y: 0.45 };

  // ---------- shell ----------
  box("room", X0 - TW, X1, 0, FT, Z0 - TW, Z1); // floor
  box("black", X0 - TW, X0, FT, TOP, Z0 - TW, Z1); // back wall
  box("room", X0, X1, FT, TOP, Z0 - TW, Z0); // side wall
  box("dark", X0, X1, FT, 0.12, Z0, Z0 + 0.02); // skirting

  // ---------- stage ----------
  box("black", X0, SX, FT, SH, Z0, Z1); // deck, black like the back wall
  box("pale", SX - 0.02, SX + 0.005, SH - 0.002, SH + 0.004, Z0, Z1); // lip tape
  box("dark", RIS.x0, RIS.x1, SH, RIS.y, RIS.z0, RIS.z1); // drum riser
  box("pale", RIS.x1 - 0.015, RIS.x1 + 0.004, RIS.y - 0.002, RIS.y + 0.004, RIS.z0, RIS.z1);
  // stage stairs at the -Z end of the lip
  for (let i = 0; i < 3; i++) box("dark", SX, SX + 0.3 * (3 - i), FT, FT + 0.19 * (i + 1), Z0, Z0 + 0.9);

  // ---------- banner on the back wall ----------
  const BN = { z0: -2.1, z1: 2.1, y0: 1.95, y1: 3.35 };
  const WF = onX(X0 + 0.004), WF2 = onX(X0 + 0.008);
  rect("banner", WF, BN.z0, BN.z1, BN.y0, BN.y1);
  star("star", WF2, 0, (BN.y0 + BN.y1) / 2, 0.6, 0.25);
  // lightning bolts either side of the star
  for (const s of [-1, 1]) {
    const u = s * 1.35, v = (BN.y0 + BN.y1) / 2;
    const bolt = [[0.1, 0.5], [-0.16, 0.0], [0.0, 0.0], [-0.1, -0.5], [0.16, 0.06], [0.0, 0.06]];
    const pts = bolt.map(([a, b]) => [u + a * s, v + b]);
    tri("amber", WF2.W(...pts[0]), WF2.W(...pts[1]), WF2.W(...pts[5]), WF2.back(u, v));
    tri("amber", WF2.W(...pts[1]), WF2.W(...pts[2]), WF2.W(...pts[5]), WF2.back(u, v));
    tri("amber", WF2.W(...pts[2]), WF2.W(...pts[3]), WF2.W(...pts[4]), WF2.back(u, v));
    tri("amber", WF2.W(...pts[2]), WF2.W(...pts[4]), WF2.W(...pts[5]), WF2.back(u, v));
  }
  rod("metal", [X0 + 0.04, BN.y1 + 0.02, BN.z0 - 0.08], [X0 + 0.04, BN.y1 + 0.02, BN.z1 + 0.08], 0.02, 6); // pipe

  // ---------- drum kit (drummer faces +X; his right is +Z) ----------
  // a drum: shell between two hoops, its batter head a pale cap; placed with its axis along local y
  function drum(r, h, x, y, z, ry = 0, rx = 0, rz = 0) {
    place(x, y, z, ry, rx, rz);
    lathe("pink", [[0, -h / 2 + 0.02], [r, -h / 2 + 0.02], [r, h / 2 - 0.02], [0, h / 2 - 0.02]], 0, 0, 16);
    lathe("metal", [[0, h / 2 - 0.02], [r + 0.008, h / 2 - 0.02], [r + 0.008, h / 2], [0, h / 2]], 0, 0, 16);
    lathe("metal", [[0, -h / 2], [r + 0.008, -h / 2], [r + 0.008, -h / 2 + 0.02], [0, -h / 2 + 0.02]], 0, 0, 16);
    fan("pale", { W: (u, v) => [u, h / 2 + 0.002, v], back: (u, v) => [u, 0, v] }, disc(0, 0, r - 0.01, 16));
    place();
  }
  function cymbal(r, x, y, z, tilt = 0.12, tz = 0) {
    place(x, y, z, 0, tz, tilt);
    lathe("brass", [[0, -0.008], [r, -0.008], [r, -0.002], [0.05, 0.02], [0.05, 0.03], [0, 0.03]], 0, 0, 16);
    place();
  }
  const leg3 = (x, z, y, r, rr = 0.012) => { for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU + 0.5; rod("metal", [x, y, z], [x + r * Math.cos(a), DY, z + r * Math.sin(a)], rr, 5); } };
  const KX = -3.45;
  drum(0.28, 0.4, KX, DY + 0.29, 0, 0, 0, -Math.PI / 2); // kick, batter head toward +X
  star("pinkGlow", onX(KX + 0.2 + 0.004), 0, DY + 0.29, 0.13, 0.055); // star on the kick head
  for (const s of [-1, 1]) rod("metal", [KX + 0.12, DY + 0.1, s * 0.22], [KX + 0.22, DY, s * 0.3], 0.01, 5); // spurs
  // rack toms on a post from the kick
  rod("metal", [KX - 0.05, DY + 0.55, 0], [KX - 0.1, DY + 0.78, 0], 0.016, 6);
  drum(0.15, 0.22, KX - 0.12, DY + 0.86, -0.19, 0, 0, 0.3);
  drum(0.165, 0.24, KX - 0.12, DY + 0.86, 0.2, 0, 0, 0.3);
  // floor tom, drummer's right
  drum(0.21, 0.38, -3.85, DY + 0.42, 0.55);
  for (const [dx, dz] of [[0.18, 0.1], [-0.14, 0.15], [0.02, -0.2]]) rod("metal", [-3.85 + dx * 1.05, DY + 0.4, 0.55 + dz * 1.05], [-3.85 + dx * 1.35, DY, 0.55 + dz * 1.35], 0.01, 5);
  // snare on a tripod, drummer's left
  drum(0.18, 0.14, -3.85, DY + 0.62, -0.4, 0, 0, 0.12);
  rod("metal", [-3.85, DY + 0.55, -0.4], [-3.85, DY + 0.25, -0.4], 0.012, 5);
  leg3(-3.85, -0.4, DY + 0.25, 0.25);
  // hi-hat
  rod("metal", [-3.75, DY, -0.8], [-3.75, DY + 1.0, -0.8], 0.012, 5);
  leg3(-3.75, -0.8, DY + 0.3, 0.25);
  cymbal(0.18, -3.75, DY + 0.9, -0.8, 0);
  cymbal(0.18, -3.75, DY + 0.95, -0.8, 0);
  // crash (left) and ride (right) on straight stands
  rod("metal", [-3.3, DY, -0.7], [-3.32, DY + 1.3, -0.65], 0.013, 5);
  leg3(-3.3, -0.7, DY + 0.35, 0.3);
  cymbal(0.24, -3.32, DY + 1.33, -0.65, 0.25, 0.1);
  rod("metal", [-3.3, DY, 0.8], [-3.33, DY + 1.15, 0.75], 0.013, 5);
  leg3(-3.3, 0.8, DY + 0.35, 0.3);
  cymbal(0.28, -3.33, DY + 1.18, 0.75, 0.2, -0.1);
  // throne
  cyl("dark", -4.15, 0, DY + 0.46, DY + 0.54, 0.17, 12);
  rod("metal", [-4.15, DY, 0], [-4.15, DY + 0.46, 0], 0.02, 6);
  leg3(-4.15, 0, DY + 0.15, 0.25);

  // ---------- amps (fronts face +X) ----------
  // a cabinet: dark box, a pale grille cloth framed by the dark tolex, dark cones with brass dust caps
  function cab(xb, xf, y0, y1, z0, z1, cols, rows, cr) {
    box("dark", xb, xf, y0, y1, z0, z1);
    const F = onX(xf + 0.003), F2 = onX(xf + 0.006), pw = 0.04;
    rect("pale", F, z0 + pw, z1 - pw, y0 + pw, y1 - pw);
    const dz = (z1 - z0 - 2 * pw) / cols, dy = (y1 - y0 - 2 * pw) / rows;
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const u = z0 + pw + dz * (i + 0.5), v = y0 + pw + dy * (j + 0.5);
        fan("dark", F2, disc(u, v, cr, 14));
        fan("brass", onX(xf + 0.009), disc(u, v, cr * 0.3, 8));
      }
  }
  // an amp head: dark box, brass control strip with dark knobs
  function head(xb, xf, y0, y1, z0, z1) {
    box("dark", xb, xf, y0, y1, z0, z1);
    const F = onX(xf + 0.003);
    rect("brass", F, z0 + 0.03, z1 - 0.03, y0 + 0.04, y1 - 0.06);
    const n = Math.round((z1 - z0) / 0.07);
    for (let i = 1; i < n - 1; i++) fan("black", onX(xf + 0.006), disc(z0 + ((z1 - z0) * i) / (n - 1), (y0 + y1) / 2 - 0.01, 0.017, 8));
    box("dark", xb + 0.08, xf - 0.08, y1, y1 + 0.03, (z0 + z1) / 2 - 0.1, (z0 + z1) / 2 + 0.1); // handle
  }
  // guitar half stack, stage right of the riser (-Z)
  cab(-4.42, -4.06, SH, SH + 0.76, -2.1, -1.34, 2, 2, 0.14);
  head(-4.4, -4.12, SH + 0.76, SH + 1.02, -2.08, -1.36);
  // guitar combo, by the -Z wall
  cab(-4.3, -4.02, SH + 0.05, SH + 0.55, -3.2, -2.58, 1, 1, 0.19);
  rect("brass", onX(-4.02 + 0.003), -3.17, -2.61, SH + 0.47, SH + 0.53);
  for (const z of [-3.17, -2.61]) box("dark", -4.28, -4.04, SH, SH + 0.05, z - 0.02, z + 0.02); // feet
  // bass 8x10 stack, stage left (+Z)
  cab(-4.42, -3.96, SH + 0.04, SH + 1.34, 2.3, 2.92, 2, 4, 0.12);
  head(-4.4, -4.0, SH + 1.34, SH + 1.6, 2.32, 2.9);
  for (const z of [2.36, 2.86]) cyl("black", -4.18, z, SH, SH + 0.04, 0.03, 8); // casters

  // ---------- front line: mic stands and wedges ----------
  for (const z of [-1.9, 0, 1.9]) {
    const mx = -2.75;
    leg3(mx, z, SH + 0.2, 0.26);
    for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU + 0.5; rod("metal", [mx, SH + 0.2, z], [mx + 0.26 * Math.cos(a), SH, z + 0.26 * Math.sin(a)], 0.012, 5); }
    rod("metal", [mx, SH, z], [mx, SH + 1.42, z], 0.014, 6);
    // mic: dark body angled up toward the singer (-X), a pale ball head
    rod("dark", [mx, SH + 1.42, z], [mx - 0.16, SH + 1.5, z], 0.022, 8);
    place(mx - 0.19, SH + 1.515, z);
    lathe("metal", Array.from({ length: 7 }, (_, i) => { const a = -Math.PI / 2 + (i / 6) * Math.PI; return [Math.max(0, 0.035 * Math.cos(a)), 0.035 * Math.sin(a)]; }), 0, 0, 10);
    place();
    // wedge monitor: tall end toward the audience, the sloped face up toward the singer
    const w0 = SX - 0.5, w1 = SX - 0.06, wz = 0.32;
    const pts = [[w0, SH, z - wz], [w1, SH, z - wz], [w1, SH, z + wz], [w0, SH, z + wz], [w0, SH + 0.12, z - wz], [w1, SH + 0.34, z - wz], [w1, SH + 0.34, z + wz], [w0, SH + 0.12, z + wz]];
    hex("dark", pts);
    const sl = (t, s) => [w0 + (w1 - w0) * t - 0.004, SH + 0.12 + 0.22 * t + 0.008, z + s * (wz - 0.05)];
    quad("black", sl(0.1, -1), sl(0.9, -1), sl(0.9, 1), sl(0.1, 1), [w0, SH, z]);
    rect("pale", onX(w1 + 0.003), z - wz, z + wz, SH + 0.3, SH + 0.34);
  }

  // ---------- truss on two towers ----------
  const CH = 0.025, LC = 0.012;
  const ch = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [TR.x + a * TR.h, TR.y + b * TR.h]);
  for (const [x, y] of ch) rod("metal", [x, y, TR.z0], [x, y, TR.z1], CH, 6);
  {
    const n = 16, L = (TR.z1 - TR.z0) / n;
    for (let i = 0; i < n; i++) {
      const za = TR.z0 + i * L, zb = za + L, [p, q] = i % 2 ? [za, zb] : [zb, za];
      for (let f = 0; f < 4; f++) {
        const A = ch[f], B = ch[(f + 1) % 4];
        rod("metal", [A[0], A[1], p], [B[0], B[1], q], LC, 4);
      }
    }
  }
  for (const zc of [TR.z0, TR.z1]) {
    const tc = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [TR.x + a * TR.h, zc + b * TR.h]);
    for (const [x, z] of tc) rod("metal", [x, SH, z], [x, TR.y + TR.h, z], CH, 6);
    const n = 8, L = (TR.y - TR.h - SH) / n;
    for (let i = 0; i < n; i++) {
      const ya = SH + i * L, yb = ya + L, [p, q] = i % 2 ? [ya, yb] : [yb, ya];
      for (let f = 0; f < 4; f++) {
        const A = tc[f], B = tc[(f + 1) % 4];
        rod("metal", [A[0], p, A[1]], [B[0], q, B[1]], LC, 4);
      }
    }
    box("dark", TR.x - 0.3, TR.x + 0.3, SH, SH + 0.03, zc - 0.3, zc + 0.3); // base plate
  }
  // par cans: hung under the bottom chords, each aimed at a spot on the deck
  const PY = TR.y - TR.h - 0.05;
  const PARS = [
    { z: -2.6, aim: [-2.8, -2.4], col: "A" }, { z: -1.25, aim: [-2.8, -1.5], col: "P" },
    { z: -0.4, aim: [-2.6, -0.15], col: "A" }, { z: 0.4, aim: [-2.6, 0.2], col: "P" },
    { z: 1.25, aim: [-2.8, 1.5], col: "A" }, { z: 2.6, aim: [-2.8, 2.4], col: "P" },
  ];
  const lensOf = [];
  for (const p of PARS) {
    const o = [TR.x, PY - 0.12, p.z], tgt = [p.aim[0], SH, p.aim[1]];
    const d = nrm(sub(tgt, o));
    box("dark", TR.x - 0.02, TR.x + 0.02, PY - 0.14, PY + 0.05, p.z - 0.13, p.z - 0.11); // yoke arms
    box("dark", TR.x - 0.02, TR.x + 0.02, PY - 0.14, PY + 0.05, p.z + 0.11, p.z + 0.13);
    box("dark", TR.x - 0.04, TR.x + 0.04, PY + 0.03, PY + 0.06, p.z - 0.13, p.z + 0.13);
    const back = add(o, mul(d, -0.15)), front = add(o, mul(d, 0.14));
    rod("dark", back, front, 0.1, 12);
    const lens = add(front, mul(d, 0.004));
    rod(p.col === "A" ? "amber" : "pinkGlow", lens, add(lens, mul(d, 0.004)), 0.085, 12);
    lensOf.push({ o: add(front, mul(d, 0.01)), d, tgt, col: p.col });
  }

  // ---------- crowd barrier ----------
  const BX = SX + 0.7;
  for (let i = 0; i <= 6; i++) {
    const z = -3.0 + i;
    rod("metal", [BX, FT, z], [BX, 1.1, z], 0.03, 6);
    rod("metal", [BX, FT + 0.02, z], [BX + 0.55, FT + 0.02, z], 0.025, 5); // foot
    box("dark", BX - 0.05, BX + 0.6, FT, FT + 0.012, z - 0.12, z + 0.12); // foot plate
  }
  rod("metal", [BX, 1.1, -3.05], [BX, 1.1, 3.05], 0.035, 8);
  rod("metal", [BX, 0.6, -3.0], [BX, 0.6, 3.0], 0.02, 6);

  // ---------- bar on the -Z wall ----------
  {
    const bz0 = Z0, bz1 = Z0 + 0.45; // back bar
    box("dark", BAR.x0, BAR.x1, FT, 0.95, bz0, bz1);
    box("paleBox", BAR.x0 - 0.02, BAR.x1 + 0.02, 0.95, 0.99, bz0, bz1 + 0.03);
    box("dark", BAR.x0, BAR.x1, 1.55, 1.59, bz0, bz0 + 0.3); // wall shelf
    box("amber", BAR.x0 + 0.05, BAR.x1 - 0.05, 1.55 - 0.012, 1.55, bz0 + 0.02, bz0 + 0.04); // shelf light
    const bottles = (y, n) => {
      for (let i = 0; i < n; i++) {
        const x = BAR.x0 + 0.25 + (i * (BAR.x1 - BAR.x0 - 0.5)) / (n - 1), z = bz0 + 0.16;
        const key = ["brass", "pink", "metal", "pale"][i % 4];
        lathe(key, [[0, y], [0.045, y], [0.045, y + 0.2], [0.018, y + 0.27], [0.018, y + 0.32], [0, y + 0.32]], x, z, 8);
      }
    };
    bottles(0.99, 9);
    bottles(1.59, 11);
    // the counter, its pink LED strip and top
    const cz0 = Z0 + 1.15, cz1 = cz0 + 0.5;
    box("dark", BAR.x0, BAR.x1, FT, 1.0, cz0, cz1);
    box("paleBox", BAR.x0 - 0.05, BAR.x1 + 0.05, 1.0, 1.05, cz0 - 0.05, cz1 + 0.08);
    rect("pinkGlow", onZ(cz1 + 0.003), BAR.x0 + 0.03, BAR.x1 - 0.03, 0.85, 0.89);
    rect("pinkGlow", { W: (u, v) => [u, v, cz1 + 0.003], back: (u, v) => [u, v, cz1 - 1] }, BAR.x0 + 0.03, BAR.x1 - 0.03, 0.08, 0.1);
    box("dark", BAR.x0 - 0.15, BAR.x0, FT, 1.0, bz1 + 0.05, cz1); // return end
    // glasses on the counter
    for (const [x, z] of [[1.5, cz0 + 0.25], [2.6, cz0 + 0.3], [3.2, cz0 + 0.2]]) lathe("metal", [[0, 1.05], [0.035, 1.05], [0.04, 1.17], [0, 1.17]], x, z, 8);
    // stools
    for (const x of [BAR.x0 + 0.5, BAR.x0 + 1.55, BAR.x0 + 2.6]) {
      const z = cz1 + 0.5;
      cyl("pink", x, z, 0.72, 0.8, 0.19, 14);
      rod("metal", [x, FT, z], [x, 0.72, z], 0.025, 6);
      cyl("metal", x, z, FT, FT + 0.025, 0.2, 12);
      lathe("metal", [[0.15, 0.3], [0.17, 0.3], [0.17, 0.33], [0.15, 0.33]], x, z, 12, false); // foot ring (open ring, no hull visible ends)
    }
  }

  // ---------- mixing desk on a riser at the back ----------
  {
    box("dark", MIX.x0, MIX.x1, FT, MIX.y, MIX.z0, MIX.z1);
    box("pale", MIX.x0 - 0.015, MIX.x0 + 0.004, MIX.y - 0.004, MIX.y + 0.002, MIX.z0, MIX.z1);
    // rail on the stage side (-X) and the -Z side
    const ry = MIX.y + 1.0;
    for (const z of [MIX.z0 + 0.05, (MIX.z0 + MIX.z1) / 2, MIX.z1 - 0.05]) rod("metal", [MIX.x0 + 0.05, MIX.y, z], [MIX.x0 + 0.05, ry, z], 0.025, 6);
    rod("metal", [MIX.x0 + 0.05, ry, MIX.z0 + 0.05], [MIX.x0 + 0.05, ry, MIX.z1 - 0.05], 0.03, 6);
    rod("metal", [MIX.x0 + 0.05, ry, MIX.z1 - 0.05], [MIX.x1 - 0.7, ry, MIX.z1 - 0.05], 0.03, 6);
    rod("metal", [MIX.x1 - 0.7, MIX.y, MIX.z1 - 0.05], [MIX.x1 - 0.7, ry, MIX.z1 - 0.05], 0.025, 6);
    // desk table and the console, its top sloping up toward the engineer (+X)
    const dx0 = 3.3, dx1 = 4.0, dz0 = Z0 + 0.3, dz1 = MIX.z1 - 0.3, ty = MIX.y + 0.78;
    box("dark", dx0, dx1, ty - 0.05, ty, dz0, dz1);
    for (const [x, z] of [[dx0 + 0.05, dz0 + 0.05], [dx1 - 0.05, dz0 + 0.05], [dx0 + 0.05, dz1 - 0.05], [dx1 - 0.05, dz1 - 0.05]]) box("dark", x - 0.025, x + 0.025, MIX.y, ty - 0.05, z - 0.025, z + 0.025);
    const cx0 = dx0 + 0.05, cx1 = dx1 - 0.05, cz0 = dz0 + 0.05, cz1 = dz1 - 0.05, lo = ty + 0.08, hi = ty + 0.2;
    hex("dark", [[cx0, ty, cz0], [cx1, ty, cz0], [cx1, ty, cz1], [cx0, ty, cz1], [cx0, hi, cz0], [cx1, lo, cz0], [cx1, lo, cz1], [cx0, hi, cz1]]);
    // fader strips and meter LEDs on the slope (its plane: x from cx1 at lo to cx0 at hi)
    const slope = (t, z, off = 0.006) => [cx1 + (cx0 - cx1) * t, lo + (hi - lo) * t + off, z];
    const nStrip = 12;
    for (let i = 0; i < nStrip; i++) {
      const z = cz0 + 0.07 + (i * (cz1 - cz0 - 0.14)) / (nStrip - 1), w = 0.022;
      quad("pale", slope(0.1, z - w), slope(0.85, z - w), slope(0.85, z + w), slope(0.1, z + w), [cx0, ty, z]);
      quad("amber", slope(0.86, z - w, 0.009), slope(0.95, z - w, 0.009), slope(0.95, z + w, 0.009), slope(0.86, z + w, 0.009), [cx0, ty, z]);
      const ft = 0.2 + 0.5 * ((i * 7) % 5) / 4; // fader cap
      quad("black", slope(ft, z - w * 1.6, 0.012), slope(ft + 0.07, z - w * 1.6, 0.012), slope(ft + 0.07, z + w * 1.6, 0.012), slope(ft, z + w * 1.6, 0.012), [cx0, ty, z]);
    }
    // a laptop-sized screen at the desk's -Z end
    box("dark", cx0 + 0.05, cx0 + 0.08, hi, hi + 0.3, cz0 - 0.02, cz0 + 0.35);
    rect("amber", onX(cx0 + 0.081), cz0 + 0.01, cz0 + 0.32, hi + 0.03, hi + 0.27);
  }

  // ---------- side wall: PA main on a bracket by the stage, gig flyers (blank blocks, no lettering) ----------
  {
    const px = -1.75, pz0 = Z0 + 0.08, pz1 = Z0 + 0.62;
    box("dark", px - 0.3, px + 0.3, 2.15, 3.05, pz0, pz1);
    rect("black", onX(px + 0.303), pz0 + 0.04, pz1 - 0.04, 2.2, 3.0);
    fan("dark", onX(px + 0.306), disc((pz0 + pz1) / 2, 2.45, 0.17, 14));
    fan("dark", onX(px + 0.306), disc((pz0 + pz1) / 2, 2.82, 0.1, 12));
    box("dark", px - 0.05, px + 0.05, 2.0, 2.15, Z0, pz0 + 0.2); // bracket
    const hash = (i) => { const h = Math.sin(i * 127.1 + 311.7) * 43758.5453; return h - Math.floor(h); };
    const keys = ["pale", "brass", "pinkGlow", "amber", "metal", "pink"];
    const FW = onZ(Z0 + 0.004), FW2 = onZ(Z0 + 0.007);
    let i = 0;
    for (let x = -0.85; x < 4.3; x += 0.52)
      for (const y of [1.95, 2.55]) {
        if (x > 2.6 && y < 2) continue; // the desk screen side stays clear
        const jx = (hash(i) - 0.5) * 0.12, jy = (hash(i + 50) - 0.5) * 0.12, k = keys[Math.floor(hash(i + 9) * keys.length)];
        const x0 = x + jx, y0 = y + jy, w = 0.36, h = 0.5;
        rect(k, FW, x0, x0 + w, y0, y0 + h);
        rect(k === "pale" || k === "metal" ? "pinkGlow" : "black", FW2, x0 + 0.05, x0 + w - 0.05, y0 + 0.2, y0 + h - 0.05); // picture block
        i++;
      }
  }

  // ---------- moving heads: yoke (pan about y) and head (tilt about the yoke's x), rigid owners 0..3 ----------
  const MOVERS = [{ z: -1.9, side: -1 }, { z: 1.9, side: 1 }];
  const movers = [];
  MOVERS.forEach((mv, k) => {
    const pan = new THREE.Group(), tilt = new THREE.Group();
    pan.name = k ? "moverR" : "moverL";
    tilt.name = k ? "headR" : "headL";
    pan.position.set(TR.x, TR.y - TR.h - 0.03, mv.z);
    tilt.position.set(0, -0.3, 0);
    pan.add(tilt);
    set.add(pan);
    joints[pan.name] = pan;
    joints[tilt.name] = tilt;
    movers.push({ pan, tilt, side: mv.side });
    // yoke (owner 2k): base box under the chord, a U whose arms hang either side of the head
    OWN = 2 * k;
    box("dark", -0.16, 0.16, -0.12, 0.0, -0.16, 0.16);
    box("dark", -0.2, 0.2, -0.16, -0.12, -0.06, 0.06);
    box("dark", -0.2, -0.16, -0.42, -0.12, -0.06, 0.06);
    box("dark", 0.16, 0.2, -0.42, -0.12, -0.06, 0.06);
    // head (owner 2k+1): a short drum with the lens on local -y, trunnions on x
    OWN = 2 * k + 1;
    lathe("dark", [[0, -0.16], [0.13, -0.16], [0.14, -0.04], [0.12, 0.12], [0, 0.12]], 0, 0, 12);
    for (const s of [-1, 1]) rod("dark", [s * 0.12, 0, 0], [s * 0.165, 0, 0], 0.04, 6);
    OWN = -1;
  });

  // ---------- meshes ----------
  const MAT = { // [base, shade, threshold, ink px (0 = no hull)]
    room: [c.room, c.roomShade, 0.1, 2],
    black: [c.black, c.black, 0.1, 2],
    dark: [c.dark, c.darkShade, 0.1, 2],
    metal: [c.metal, c.metalShade, 0.1, 1.5],
    pink: [c.pink, c.pinkShade, 0.05, 2],
    brass: [c.brass, c.brassShade, 0.2, 1.5],
    pale: [c.pale, c.paleShade, 0.1, 0],
    paleBox: [c.pale, c.paleShade, 0.1, 1.5],
    banner: [c.banner, c.banner, -1, 0],
    star: [c.star, c.star, -1, 0],
    amber: [c.amber, c.amber, -1, 0],
    pinkGlow: [c.beamPink, c.beamPink, -1, 0],
  };
  const geo = (p, n) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    return g;
  };
  // static soups whose materials draw the same share one mesh; the movers' owned vertices go to their own mesh
  const groups = new Map();
  const moverSoup = { p: [], n: [], o: [] };
  for (const [key, s] of Object.entries(soups)) {
    for (let v = 0; v < s.o.length; v++) {
      const dst = s.o[v] >= 0 ? moverSoup : null;
      if (dst) dst.p.push(s.p[v * 3], s.p[v * 3 + 1], s.p[v * 3 + 2]), dst.n.push(s.n[v * 3], s.n[v * 3 + 1], s.n[v * 3 + 2]), dst.o.push(s.o[v]);
    }
    const [base, shade, threshold, px] = MAT[key];
    const sig = base === shade ? `${base}|${px}` : `${base}|${shade}|${threshold}|${px}`;
    if (!groups.has(sig)) groups.set(sig, { keys: [], p: [], n: [], mat: [base, shade, base === shade ? 0 : threshold, px] });
    const g = groups.get(sig);
    g.keys.push(key);
    for (let v = 0; v < s.o.length; v++) if (s.o[v] < 0) for (let i = 0; i < 3; i++) g.p.push(s.p[v * 3 + i]), g.n.push(s.n[v * 3 + i]);
  }
  for (const g of groups.values()) {
    if (!g.p.length) continue;
    const [base, shade, threshold, px] = g.mat;
    const mesh = kit.toon(geo(g.p, g.n), base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = g.keys.join("+");
    set.add(mesh);
  }
  // mover bodies: one mesh, vertices rewritten from the pan/tilt joints
  const mGeo = geo(moverSoup.p, moverSoup.n);
  const moverMesh = kit.toon(mGeo, c.dark, c.darkShade, { threshold: 0.1, px: 2 });
  moverMesh.name = "movers";
  moverMesh.frustumCulled = false;
  set.add(moverMesh);
  kit.hullNormals(mGeo);
  const mBase = { p: Float32Array.from(moverSoup.p), n: Float32Array.from(moverSoup.n), h: mGeo.attributes.hullNormal ? Float32Array.from(mGeo.attributes.hullNormal.array) : null, o: moverSoup.o };

  // beams: three unlit double-sided meshes (pink, amber, pale) of fixed triangle counts, rewritten every pose
  const RAYS = 5, POOL = 18;
  const parsP = lensOf.filter((l) => l.col === "P"), parsA = lensOf.filter((l) => l.col === "A");
  const triCount = (nb) => nb * (RAYS + POOL);
  const mkBeam = (name, hexc, nb) => {
    const n = triCount(nb) * 9;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n), 3));
    g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(n).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    const mesh = kit.toon(g, hexc, hexc, { threshold: -1, outline: false, doubleSided: true });
    mesh.name = name;
    mesh.frustumCulled = false;
    set.add(mesh);
    return g;
  };
  const beamG = lights ? { P: mkBeam("beam-pink", c.beamPink, parsP.length), A: mkBeam("beam-amber", c.amber, parsA.length), W: mkBeam("beam-white", c.beamWhite, movers.length) } : null;
  // a cone of rays from o along d (half-angle tan ta, each ray a sliver of angular half-width w) ending on the
  // plane y = py, and the pool where the cone meets that plane; written at offset off (floats) of arr
  function cone(arr, off, o, d, ta, w, py, spin = 0) {
    const up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const e1 = nrm(cross(d, up)), e2 = cross(e1, d);
    const hit = (a, s = 1) => {
      const q = add(d, add(mul(e1, ta * s * Math.cos(a)), mul(e2, ta * s * Math.sin(a))));
      const t = (py - o[1]) / q[1], h = add(o, mul(q, t));
      return [Math.min(h[0], X1 - 0.02), h[1], Math.max(Z0 + 0.02, Math.min(h[2], Z1 - 0.02))]; // pools stay in the room
    };
    const put = (p) => (arr.set(p, off), (off += 3));
    for (let k = 0; k < RAYS; k++) {
      const a = spin + (k / RAYS) * TAU;
      const r0 = add(o, add(mul(e1, 0.03 * Math.cos(a)), mul(e2, 0.03 * Math.sin(a))));
      put(r0), put(hit(a - w)), put(hit(a + w));
    }
    const ctr = hit(0, 0);
    for (let k = 0; k < POOL; k++) {
      const a0 = (k / POOL) * TAU, a1 = ((k + 1) / POOL) * TAU;
      const lift = (p) => [p[0], py + 0.004, p[2]];
      put(lift(ctr)), put(lift(hit(a0))), put(lift(hit(a1)));
    }
    return off;
  }
  // the deck or the floor under a ray from o along d
  const groundY = (o, d) => {
    const t = (SH - o[1]) / d[1];
    return o[0] + d[0] * t < SX - 0.02 && o[2] + d[2] * t > Z0 && o[2] + d[2] * t < Z1 ? SH : FT;
  };

  const anchor = (name, x, y, z) => { const a = new THREE.Group(); a.name = name; a.position.set(x, y, z); set.add(a); joints[name] = a; };
  anchor("floor", 0, FT, 0);
  anchor("stage", SX, SH, 0);
  anchor("drums", KX, DY, 0);
  anchor("bar", (BAR.x0 + BAR.x1) / 2, 1.05, Z0 + 1.4);
  anchor("desk", 3.65, MIX.y + 1.0, (MIX.z0 + MIX.z1) / 2);

  // ---------- poses and the strobe clip ----------
  // Sign: pan is +ry about the hanging yoke (seen from above, counter-clockwise); tilt +rx swings the lens from
  // straight down toward the audience (+X). REST (t = 0): both heads tilted 0.6 toward the crowd, panned 0.3 toward +Z (off the bar); the sweep keeps every pool on the floor.
  const CLIPS = { strobe: 2 };
  const mats = [0, 1, 2, 3].map(() => new THREE.Matrix4());
  const nmats = mats.map(() => new THREE.Matrix3());
  const q = new THREE.Vector3();
  function apply(t) {
    const ph = (t / CLIPS.strobe) * TAU; // one sweep per loop
    movers.forEach((m, k) => {
      m.pan.rotation.set(0, -Math.PI / 2 - (0.3 + 0.2 * Math.sin(ph + k * Math.PI)), 0);
      m.tilt.rotation.set(0.6 + 0.25 * Math.sin(2 * ph + k * Math.PI), 0, 0);
      m.pan.updateMatrix();
      m.tilt.updateMatrix();
      mats[2 * k].copy(m.pan.matrix);
      mats[2 * k + 1].multiplyMatrices(m.pan.matrix, m.tilt.matrix);
    });
    mats.forEach((m, i) => nmats[i].getNormalMatrix(m));
    const P3 = mGeo.attributes.position.array, N3 = mGeo.attributes.normal.array, H = mGeo.attributes.hullNormal?.array;
    for (let v = 0; v < mBase.o.length; v++) {
      const k = mBase.o[v], i = v * 3;
      q.fromArray(mBase.p, i).applyMatrix4(mats[k]).toArray(P3, i);
      q.fromArray(mBase.n, i).applyMatrix3(nmats[k]).normalize().toArray(N3, i);
      if (H && mBase.h) q.fromArray(mBase.h, i).applyMatrix3(nmats[k]).normalize().toArray(H, i);
    }
    mGeo.attributes.position.needsUpdate = mGeo.attributes.normal.needsUpdate = true;
    if (H) mGeo.attributes.hullNormal.needsUpdate = true;
    mGeo.computeBoundingSphere(), mGeo.computeBoundingBox();
    if (beamG) {
      // pars pulse twice a loop, pink and amber in turn: the cone narrows to a thin shaft between flashes
      const pulse = { P: 0.5 + 0.5 * Math.cos(2 * ph), A: 0.5 - 0.5 * Math.cos(2 * ph) };
      for (const [col, list] of [["P", parsP], ["A", parsA]]) {
        const arr = beamG[col].attributes.position.array, s = pulse[col];
        let off = 0;
        for (const l of list) off = cone(arr, off, l.o, l.d, 0.08 + 0.1 * s, 0.06 + 0.08 * s, SH, ph * 0.5);
      }
      const arr = beamG.W.attributes.position.array;
      let off = 0;
      movers.forEach((m, k) => {
        const o = [0, -0.17, 0], d = [0, -1, 0];
        q.fromArray(o).applyMatrix4(mats[2 * k + 1]);
        const O = [q.x, q.y, q.z];
        q.fromArray(d).applyMatrix3(nmats[2 * k + 1]).normalize();
        const D = [q.x, q.y, q.z];
        off = cone(arr, off, O, D, 0.1, 0.16, groundY(O, D), ph);
      });
      for (const g of Object.values(beamG)) (g.attributes.position.needsUpdate = true), g.computeBoundingSphere(), g.computeBoundingBox();
    }
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`live-house: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      const T = CLIPS[m[1]];
      return apply((((+m[2]) % T) + T) % T);
    }
    if (name !== "rest") throw new Error(`live-house: unknown pose "${name}" (rest, or strobe@<seconds>)`);
    apply(0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
