// bunkasai.js - a school culture-festival corridor booth at real size: a set piece. Class 2-B has turned its classroom
// into a cat café; the corridor in front of its door is the booth. One clip, sway, swings the paper chains and balloons.
// Contract: harness/lab/README.md. Meters, +Y up, the corridor runs along X (8 m); the classroom wall is -Z with the
// booth facing +Z; the window wall is +Z, cut down to a capped stub (the cutaway, so the lab's front-left cameras look
// in); the -X end wall keeps its two corridor windows (pale sky with clouds), the +X end is open. Floor on y = 0.
//
// Construction (boxes, oriented boxes, extruded outlines, lathed balloons, 4/6-sided rods and flat decals, all triangle
// soups). Every triangle is wound away from a point inside its solid (box centre, rod axis, outline centroid behind a
// plate, balloon centre), never by hand. Soups are merged into four meshes with material GROUPS (one material per
// colour pair), so the whole set is 4 meshes: `set` (walls, floor, booth, props; ink 3 px), `trim` (frames, flowers,
// small props; ink 2 px), `decal` (flat paint, no ink: floor strips, sun patches, pictograms, glass) and `sway` (paper
// chains, balloons and their strings; ink 2 px). sway is the one moving mesh: each chain swag and balloon is a rigid
// piece that owns its vertices; pose() rewrites them (positions, normals and hull normals) about the piece's pivot.
//   SHELL     lime linoleum floor with dark green two-tone strips along both walls and light tile joints; sun patches
//             thrown by the (cut-away) +Z windows. Walls 12 cm thick, moon with a dark skirting band and a waist rail;
//             dark 2 cm caps on every top the cutaway leaves open. Classroom transom lights in steel frames along -Z.
//   BOOTH     around the classroom's front door (x = +1.0): a painted cardboard archway, yellow with red trim, two
//             pillars and a 12-segment arch; paper flowers (5-petal rosettes, pink / white / red) along it; a blank
//             welcome board on the crown with cat ears and a cat-face pictogram (no lettering, skill rule 15) between
//             two paw prints. In the doorway a red split curtain with a paw print, the dark classroom behind it.
//   TABLE     (x = +3.0) two pushed-together school desks under a white cloth with a red hem and a ticket pictogram;
//             a green cash box with a handle, a stack of yellow tickets, a chair behind.
//   EASEL     (x = -0.8) an A-frame menu easel turned toward the camera: a chalkboard with three pictogram rows (a cup
//             with steam, a cake slice with a strawberry, an onigiri), each with one to three yellow price dots.
//   BACK DOOR (x = -2.55) the classroom's closed back door with a cat poster and a blank class plate sticking out.
//   BOXES     (-X corner) three taped cardboard boxes, the top one turned.
//   SWAY      paper-chain swags (links are flat boxes, every other one turned 90 deg about the chain, five colours)
//             hung from hooks along the top of the classroom wall and the end wall; balloon clusters tied to both
//             pillar tops and the table corner.
// Proportions (real size, base unit the storey H = 3.0 m): corridor 3.6 wide inside, 8 long; doors 0.9 x 1.9;
//   arch pillars 0.36 wide to 1.6, arch radii 0.67-1.03 about (1.0, 1.6); board 1.1 x 0.5, ears to 2.98;
//   desks 0.70 high; easel 1.4; balloons 0.26 wide; chain links 9 cm on a 7.5 cm pitch, swags 1.33 m sagging 0.28.
// Options: build(THREE, kit, colors, { height = 3.0 }): scales the whole set uniformly so the wall top is `height`.
// Clip: sway 2 s (pose("sway@0.5")): every swag swings about its hook line, +-10 deg, a travelling wave along the wall;
//   every balloon nods about its tie point, +-7 deg each way, out of phase. Loops seamlessly.
// Budget: ~6.8k triangles, 4 meshes (with material groups). Ink in pixels: shell and booth 3, trim and sway 2.
// Colours (meadow: bright day, pale sky, red accents), base / shade, threshold 0.1:
//   walls                                moon #f7f3e1 / skin #f0c2ae
//   floor                                line #a9d16e flat; strips iris #3f8a47; tile joints, sun patches moon
//   steel (frames, legs, plate), cloth   sclera #f6f3ee / sky #d7ecef; glass sky flat, clouds sclera
//   doors                                line #a9d16e / iris #3f8a47
//   painted cardboard, desk wood, easel  practical #f2c94c / skin #f0c2ae
//   cardboard boxes                      skin #f0c2ae / practical #f2c94c, tape moon
//   red (trim, curtain, cat, ears, hem)  accent #d9483b flat; pink flowers skin; white flowers, board sclera
//   cash box                             iris #3f8a47 / hair #2c5131; chalkboard, caps, lines, strings hair flat
//   chains and balloons                  accent, practical, line, sclera, skin flat

export const meta = {
  name: "bunkasai",
  height: 3.0,
  script: "meadow",
  colors: {
    wall: "#f7f3e1", wallShade: "#f0c2ae",
    floor: "#a9d16e", strip: "#3f8a47", seam: "#f7f3e1", sun: "#f7f3e1",
    steel: "#f6f3ee", steelShade: "#d7ecef",
    glass: "#d7ecef", cloud: "#f6f3ee",
    door: "#a9d16e", doorShade: "#3f8a47",
    paint: "#f2c94c", paintShade: "#f0c2ae",
    box: "#f0c2ae", boxShade: "#f2c94c", tape: "#f7f3e1",
    red: "#d9483b", pink: "#f0c2ae", paper: "#f6f3ee", paperShade: "#d7ecef",
    cash: "#3f8a47", cashShade: "#2c5131",
    dark: "#2c5131", yellow: "#f2c94c", lime: "#a9d16e",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const NATURAL = 3.0;
  const { height = NATURAL } = opts;
  const root = new THREE.Group();
  root.name = "bunkasai";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / NATURAL);
  root.add(body);
  const joints = {};

  // ---------- triangle soups with normals ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const D2R = Math.PI / 180, TAU = Math.PI * 2;
  // XF: an optional local frame (origin + yaw about Y) every helper's points pass through; PIECE: the sway piece id
  let XF = null, PIECE = -1;
  const xp = (p) => (XF ? [XF.o[0] + XF.c * p[0] + XF.s * p[2], XF.o[1] + p[1], XF.o[2] - XF.s * p[0] + XF.c * p[2]] : p);
  const xn = (n) => (n && XF ? [XF.c * n[0] + XF.s * n[2], n[1], -XF.s * n[0] + XF.c * n[2]] : n);
  const frame = (o, yawDeg) => (XF = { o, c: Math.cos(yawDeg * D2R), s: Math.sin(yawDeg * D2R) });
  const soups = {};
  function tri(key, a, b, e, ref, na, nb, ne) {
    [a, b, e, ref, na, nb, ne] = [xp(a), xp(b), xp(e), xp(ref), xn(na), xn(nb), xn(ne)];
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const flip = dot(n, sub(mul(add(add(a, b), e), 1 / 3), ref)) < 0;
    if (flip) n = mul(n, -1);
    n = nrm(n);
    const s = (soups[key] ??= { p: [], n: [], pc: [] });
    const [B, NB, E, NE] = flip ? [e, ne, b, nb] : [b, nb, e, ne];
    for (const [q, nq] of [[a, na ?? n], [B, NB ?? n], [E, NE ?? n]]) s.p.push(...q), s.n.push(...nq), s.pc.push(PIECE);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  const FACES = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  function box(key, x0, x1, y0, y1, z0, z1) {
    const p = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    const ref = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    for (const f of FACES) quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  // oriented box: centre, three unit axes and half sizes
  function obox(key, ctr, ax, ay, az, hx, hy, hz) {
    const P = (i, j, k) => add(ctr, add(mul(ax, i * hx), add(mul(ay, j * hy), mul(az, k * hz))));
    const p = [P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1), P(-1, 1, -1), P(1, 1, -1), P(1, 1, 1), P(-1, 1, 1)];
    for (const f of FACES) quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ctr);
  }
  // a flat polygon (star-shaped about its centroid) facing n, as a fan
  function poly(key, pts, n) {
    const ctr = mul(pts.reduce((s, q) => add(s, q), [0, 0, 0]), 1 / pts.length), ref = sub(ctr, n);
    for (let i = 0; i < pts.length; i++) tri(key, ctr, pts[i], pts[(i + 1) % pts.length], ref, n, n, n);
  }
  // a flat quad facing `n` (unit axis), centred on a point
  function plate(key, ctr, n, w, h) {
    const up = Math.abs(n[1]) > 0.5 ? [0, 0, 1] : [0, 1, 0];
    const r = nrm(cross(up, n)), u = cross(n, r);
    const P = (a, b) => add(ctr, add(mul(r, (a * w) / 2), mul(u, (b * h) / 2)));
    quad(key, P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), sub(ctr, n));
  }
  // 2D outline (u, v) in the plane through o spanned by u, v (normal n = u x v) -> 3D points
  const plane = (o, u, v) => (q) => add(o, add(mul(u, q[0]), mul(v, q[1])));
  // a flat decal facing +Z (or any frame) from 2D points; dz pushes it off the surface
  const ZP = [0, 0, 1];
  const decal = (key, o, pts2) => poly(key, pts2.map(plane(o, [1, 0, 0], [0, 1, 0])), ZP);
  const circle = (r, n = 12, sx = 1, sy = 1) => Array.from({ length: n }, (_, i) => [Math.cos((i / n) * TAU) * r * sx, Math.sin((i / n) * TAU) * r * sy]);
  const shift = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
  // an extruded outline: front face in the plane through o facing n = u x v, depth d behind it
  function prism(key, o, u, v, pts2, d) {
    const n = nrm(cross(u, v)), F = pts2.map(plane(o, u, v)), Bk = F.map((q) => sub(q, mul(n, d)));
    const ctr = mul(F.reduce((s, q) => add(s, q), [0, 0, 0]), 1 / F.length), ref = sub(ctr, mul(n, d / 2));
    for (let i = 0; i < F.length; i++) {
      const j = (i + 1) % F.length;
      tri(key, ctr, F[i], F[j], ref);
      tri(key, sub(ctr, mul(n, d)), Bk[i], Bk[j], ref);
      quad(key, F[i], F[j], Bk[j], Bk[i], ref);
    }
  }
  // a capped tube from a to b, radius r; ends pushed out by 0.6 r so joints overlap
  function rod(key, a, b, r, sides = 4) {
    const T = nrm(sub(b, a));
    a = sub(a, mul(T, r * 0.6)), b = add(b, mul(T, r * 0.6));
    const up = Math.abs(T[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = nrm(cross(up, T)), w = cross(T, u);
    const ring = (P) => Array.from({ length: sides }, (_, j) => {
      const t = (j / sides) * TAU, d = add(mul(u, Math.cos(t)), mul(w, Math.sin(t)));
      return { q: add(P, mul(d, r)), n: d };
    });
    const A = ring(a), B = ring(b), mid = mul(add(a, b), 0.5);
    for (let j = 0; j < sides; j++) {
      const k = (j + 1) % sides;
      tri(key, A[j].q, A[k].q, B[k].q, mid, A[j].n, A[k].n, B[k].n);
      tri(key, A[j].q, B[k].q, B[j].q, mid, A[j].n, B[k].n, B[j].n);
    }
    for (const [R, s] of [[A, -1], [B, 1]])
      for (let j = 1; j < sides - 1; j++) tri(key, R[0].q, R[j].q, R[j + 1].q, mid, mul(T, s), mul(T, s), mul(T, s));
  }
  // a closed lathe about +Y through ctr: profile [[r, y]] from bottom (r 0) to top (r 0), smooth normals
  function lathe(key, ctr, prof, sides = 8) {
    const ring = ([r, y]) => Array.from({ length: sides }, (_, j) => {
      const t = (j / sides) * TAU;
      return add(ctr, [Math.cos(t) * r, y, Math.sin(t) * r]);
    });
    const R = prof.map(ring);
    const nAt = (i, j) => { // normal from the profile slope
      const [r0, y0] = prof[Math.max(0, i - 1)], [r1, y1] = prof[Math.min(prof.length - 1, i + 1)];
      const t = (j / sides) * TAU, dr = r1 - r0, dy = y1 - y0;
      return nrm([Math.cos(t) * dy, -dr, Math.sin(t) * dy]);
    };
    for (let i = 0; i < prof.length - 1; i++)
      for (let j = 0; j < sides; j++) {
        const k = (j + 1) % sides, ref = add(ctr, [0, (prof[i][1] + prof[i + 1][1]) / 2, 0]);
        tri(key, R[i][j], R[i][k], R[i + 1][k], ref, nAt(i, j), nAt(i, k), nAt(i + 1, k));
        tri(key, R[i][j], R[i + 1][k], R[i + 1][j], ref, nAt(i, j), nAt(i + 1, k), nAt(i + 1, j));
      }
  }

  // ---------- the shell ----------
  const X0 = -4, X1 = 4, ZB = -1.8, ZF = 1.8, T = 0.12, H = 3.0, CAP = 0.02, E = 0.004; // E: decal offset
  quad("floor", [X0 - T, 0, ZB - T], [X1, 0, ZB - T], [X1, 0, ZF + T], [X0 - T, 0, ZF + T], [0, -1, 0]);
  // two-tone strips along both walls, tile joints across, sun patches from the +Z windows
  const flo = (key, pts) => poly(key, pts.map(([x, z]) => [x, E, z]), [0, 1, 0]);
  flo("strip", [[X0, ZB], [X1, ZB], [X1, ZB + 0.32], [X0, ZB + 0.32]]);
  flo("strip", [[X0, ZF - 0.32], [X1, ZF - 0.32], [X1, ZF], [X0, ZF]]);
  for (let x = X0 + 0.9; x < X1; x += 0.9) flo("seam", [[x - 0.008, ZB + 0.32], [x + 0.008, ZB + 0.32], [x + 0.008, ZF - 0.32], [x - 0.008, ZF - 0.32]]);
  flo("seam", [[X0, ZB + 0.32], [X1, ZB + 0.32], [X1, ZB + 0.34], [X0, ZB + 0.34]]);
  flo("seam", [[X0, ZF - 0.34], [X1, ZF - 0.34], [X1, ZF - 0.32], [X0, ZF - 0.32]]);
  for (let i = 0; i < 4; i++) { // one patch per window bay, two panes each, thrown toward -X and -Z
    const a = X0 + 0.85 + i * 1.8;
    for (const [p0, p1] of [[a, a + 0.66], [a + 0.76, a + 1.42]])
      poly("sun", [[p0, 2 * E, 1.4], [p1, 2 * E, 1.4], [p1 - 0.6, 2 * E, 0.1], [p0 - 0.6, 2 * E, 0.1]], [0, 1, 0]);
  }
  const capTop = (x0, x1, y1, z0, z1) => box("cap", x0, x1, y1 - CAP, y1, z0, z1);
  // classroom wall (-Z) with the front door opening at x 0.55..1.45
  const DX0 = 0.55, DX1 = 1.45, DH = 1.9;
  box("wall", X0 - T, DX0, 0, H - CAP, ZB - T, ZB);
  box("wall", DX1, X1, 0, H - CAP, ZB - T, ZB);
  box("wall", DX0, DX1, DH, H - CAP, ZB - T, ZB);
  capTop(X0 - T, X1, H, ZB - T, ZB);
  box("cap", X1 - CAP, X1, 0, H, ZB - T, ZB); // the open +X end of the wall
  plate("dark", [1.0, DH / 2, ZB - T - 0.02], [0, 0, 1], DX1 - DX0 + 0.04, DH); // the dark classroom behind the door
  // end wall (-X) with two corridor windows (sill 0.85, head 2.3)
  const WS = 0.85, WH = 2.3, WZ = [[-1.55, -0.08], [0.08, 1.55]];
  box("wall", X0 - T, X0, 0, WS, ZB - T, ZF + T);
  box("wall", X0 - T, X0, WH, H - CAP, ZB - T, ZF + T);
  box("wall", X0 - T, X0, WS, WH, ZB - T, WZ[0][0]);
  box("wall", X0 - T, X0, WS, WH, WZ[0][1], WZ[1][0]);
  box("wall", X0 - T, X0, WS, WH, WZ[1][1], ZF + T);
  capTop(X0 - T, X0, H, ZB - T, ZF + T);
  box("cap", X0 - T, X0, 0, H, ZF + T - CAP, ZF + T);
  // window wall (+Z): the cutaway leaves a capped stub
  box("wall", X0, X1, 0, 0.12 - CAP, ZF, ZF + T);
  capTop(X0, X1, 0.12, ZF, ZF + T);
  box("cap", X1 - CAP, X1, 0, 0.12, ZF, ZF + T);
  // skirting and waist rail (dark bands), on the classroom wall and the end wall
  const bandZ = (x0, x1, y0, y1) => plate("dark", [(x0 + x1) / 2, (y0 + y1) / 2, ZB + E], [0, 0, 1], x1 - x0, y1 - y0);
  const bandX = (z0, z1, y0, y1) => plate("dark", [X0 + E, (y0 + y1) / 2, (z0 + z1) / 2], [1, 0, 0], z1 - z0, y1 - y0);
  bandZ(X0, DX0, 0, 0.1), bandZ(DX1, X1, 0, 0.1), bandX(ZB, ZF, 0, 0.1);
  bandZ(X0, -3.02, 0.88, 0.92), bandZ(-2.08, DX0, 0.88, 0.92), bandZ(DX1, X1, 0.88, 0.92);
  // end windows: steel casing, a meeting rail per window, a transom bar; glass with clouds
  for (const [z0, z1] of WZ) {
    const zm = (z0 + z1) / 2, x = X0 - T / 2;
    for (const [a, b] of [[[x, WS, z0], [x, WS, z1]], [[x, WH, z0], [x, WH, z1]], [[x, WS, z0], [x, WH, z0]], [[x, WS, z1], [x, WH, z1]],
      [[x + 0.02, WS, zm], [x + 0.02, 1.95, zm]], [[x, 1.95, z0], [x, 1.95, z1]]]) rod("steel", a, b, 0.025, 4);
    rod("steel", [x - 0.02, 1.95, zm], [x - 0.02, WH, zm], 0.02, 4);
    plate("glass", [x - 0.01, (WS + WH) / 2, zm], [1, 0, 0], z1 - z0, WH - WS);
    const cl = (cy, cz, s) => poly("cloud", [...circle(0.16 * s, 10, 1.7, 0.6)].map(([a, b]) => [x - 0.005, cy + b, cz + a]), [1, 0, 0]);
    cl(1.55, zm - 0.25, 1), cl(1.63, zm - 0.05, 0.8), cl(2.12, zm + 0.35, 0.7), cl(1.12, zm + 0.3, 0.6);
    box("wall", X0, X0 + 0.14, WS - 0.03, WS, z0 - 0.04, z1 + 0.04); // sill board
  }
  // classroom transom lights (2.25 - 2.7) in steel frames along the -Z wall
  for (let x = X0 + 0.25; x + 0.9 <= X1 - 0.1; x += 0.95) {
    plate("glass", [x + 0.45, 2.475, ZB + E], [0, 0, 1], 0.9, 0.45);
    for (const [a, b] of [[[x, 2.25, ZB + 0.012], [x + 0.9, 2.25, ZB + 0.012]], [[x, 2.7, ZB + 0.012], [x + 0.9, 2.7, ZB + 0.012]],
      [[x, 2.25, ZB + 0.012], [x, 2.7, ZB + 0.012]], [[x + 0.9, 2.25, ZB + 0.012], [x + 0.9, 2.7, ZB + 0.012]]]) rod("steel", a, b, 0.014, 4);
  }

  // ---------- the archway (painted cardboard, yellow with red trim) ----------
  const AX = 1.0, AY = 1.6, R0 = 0.67, R1 = 1.03, AZ0 = ZB + 0.02, AZ1 = ZB + 0.17;
  box("paint", AX - R1, AX - R0, 0, AY, AZ0, AZ1);
  box("paint", AX + R0, AX + R1, 0, AY, AZ0, AZ1);
  const NA = 12, arc = (r, t) => [AX + Math.cos(t) * r, AY + Math.sin(t) * r];
  for (let i = 0; i < NA; i++) {
    const t0 = (i / NA) * Math.PI, t1 = ((i + 1) / NA) * Math.PI;
    prism("paint", [0, 0, AZ1], [1, 0, 0], [0, 1, 0], [arc(R0, t0), arc(R1, t0), arc(R1, t1), arc(R0, t1)], AZ1 - AZ0);
    for (const [ra, rb] of [[R0, R0 + 0.05], [R1 - 0.05, R1]]) decal("red", [0, 0, AZ1 + E], [arc(ra, t0), arc(rb, t0), arc(rb, t1), arc(ra, t1)]);
  }
  for (const sx of [-1, 1]) { // pillar trim: inner and outer edge stripes, and a foot band
    for (const [a, b] of [[R0, R0 + 0.05], [R1 - 0.05, R1]])
      decal("red", [0, 0, AZ1 + E], [[AX + sx * a, 0.12], [AX + sx * b, 0.12], [AX + sx * b, AY], [AX + sx * a, AY]]);
    decal("red", [0, 0, AZ1 + E], [[AX + sx * R0, 0], [AX + sx * R1, 0], [AX + sx * R1, 0.12], [AX + sx * R0, 0.12]]);
  }
  // paper flowers: 5-petal rosettes with a centre dot, along the arch and down the pillars
  const FLOWER = ["pink", "paper", "red", "paper", "pink", "red"];
  const petals = (r) => Array.from({ length: 20 }, (_, i) => { const t = (i / 20) * TAU; const k = r * (0.62 + 0.38 * Math.abs(Math.cos(2.5 * t))); return [Math.cos(t) * k, Math.sin(t) * k]; });
  const flower = (x, y, r, i) => {
    const col = FLOWER[i % FLOWER.length];
    prism(col, [x, y, AZ1 + 0.03], [1, 0, 0], [0, 1, 0], petals(r), 0.025);
    decal(col === "red" ? "yellow" : "red", [x, y, AZ1 + 0.03 + E], circle(r * 0.28, 8));
  };
  let fi = 0;
  for (let i = 0; i <= 10; i++) { const [x, y] = arc((R0 + R1) / 2, (i / 10) * Math.PI); if (i !== 5) flower(x, y, 0.085 + (i % 2) * 0.02, fi++); }
  for (const sx of [-1, 1]) for (let y = 0.4; y < AY; y += 0.36) flower(AX + sx * (R0 + R1) / 2, y, 0.08 + ((fi % 3) === 0 ? 0.02 : 0), fi++);
  // welcome board on the crown: blank, cat ears, a cat-face pictogram between two paw prints
  const BX0 = AX - 0.55, BX1 = AX + 0.55, BY0 = 2.24, BY1 = 2.74, BZ = AZ1 + 0.06;
  box("paper", BX0, BX1, BY0, BY1, BZ - 0.04, BZ);
  for (const sx of [-1, 1]) {
    const ear = [[AX + sx * 0.5, BY1 - 0.02], [AX + sx * 0.18, BY1 - 0.02], [AX + sx * 0.4, 2.97]];
    prism("red", [0, 0, BZ - 0.005], [1, 0, 0], [0, 1, 0], ear, 0.03);
    decal("pink", [0, 0, BZ - 0.005 + E], [[AX + sx * 0.43, BY1 + 0.01], [AX + sx * 0.25, BY1 + 0.01], [AX + sx * 0.39, 2.88]]);
  }
  for (const [x0, x1, y0, y1] of [[BX0, BX1, BY0, BY0 + 0.035], [BX0, BX1, BY1 - 0.035, BY1], [BX0, BX0 + 0.035, BY0, BY1], [BX1 - 0.035, BX1, BY0, BY1]])
    decal("red", [0, 0, BZ + E], [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
  const cat = (key, cx, cy, s, z, eyes = "dark") => { // a cat face: head, two ears, eyes, nose, whiskers
    decal(key, [cx, cy, z], circle(0.13 * s, 14, 1.12, 0.92));
    for (const sx of [-1, 1]) {
      decal(key, [cx, cy, z], [[sx * 0.14 * s, 0.03 * s], [sx * 0.03 * s, 0.1 * s], [sx * 0.13 * s, 0.2 * s]]);
      decal(eyes, [cx + sx * 0.05 * s, cy + 0.015 * s, z + E], circle(0.022 * s, 8, 1, 1.3));
      for (const dy of [-0.025, -0.06]) decal("dark", [cx, cy, z + E], [[sx * 0.11 * s, (dy + 0.005) * s], [sx * 0.24 * s, (dy * 1.8 + 0.006) * s], [sx * 0.24 * s, (dy * 1.8 - 0.006) * s], [sx * 0.11 * s, (dy - 0.005) * s]]);
    }
    decal("dark", [cx, cy, z + E], [[-0.018 * s, -0.025 * s], [0.018 * s, -0.025 * s], [0, -0.05 * s]]);
  };
  const paw = (key, cx, cy, s, z) => {
    decal(key, [cx, cy - 0.02 * s, z], circle(0.05 * s, 10, 1.15, 0.9));
    for (const [px, py] of [[-0.06, 0.04], [-0.022, 0.075], [0.022, 0.075], [0.06, 0.04]]) decal(key, [cx + px * s, cy + py * s, z], circle(0.022 * s, 8, 1, 1.2));
  };
  cat("red", AX, 2.47, 1, BZ + E);
  paw("red", AX - 0.36, 2.46, 0.9, BZ + E), paw("red", AX + 0.36, 2.46, 0.9, BZ + E);
  // the doorway: a red split curtain (three panels, a paw print on the middle one) on a dark rod
  rod("dark", [DX0 - 0.02, 1.86, ZB - 0.04], [DX1 + 0.02, 1.86, ZB - 0.04], 0.015, 4);
  for (let i = 0; i < 3; i++) {
    const x0 = DX0 + 0.02 + i * 0.29, x1 = x0 + 0.27;
    box("red", x0, x1, 1.2, 1.85, ZB - 0.055, ZB - 0.035);
  }
  paw("paper", AX, 1.5, 0.9, ZB - 0.035 + E);

  // ---------- the back door (closed) with a poster and a blank class plate ----------
  const BD = -2.55;
  box("door", BD - 0.45, BD + 0.45, 0, 1.9, ZB, ZB + 0.03);
  for (const [x0, x1] of [[BD - 0.47, BD - 0.45], [BD + 0.45, BD + 0.47]]) box("steel", x0, x1, 0, 1.92, ZB, ZB + 0.04);
  box("steel", BD - 0.47, BD + 0.47, 1.9, 1.94, ZB, ZB + 0.04);
  plate("glass", [BD + 0.2, 1.45, ZB + 0.03 + E], [0, 0, 1], 0.32, 0.55);
  plate("dark", [BD - 0.36, 1.0, ZB + 0.03 + E], [0, 0, 1], 0.05, 0.16);
  box("yellow", BD - 0.3, BD + 0.02, 0.95, 1.37, ZB + 0.03, ZB + 0.036); // poster
  cat("red", BD - 0.14, 1.2, 0.85, ZB + 0.036 + E);
  for (const [k, dx] of [["red", -0.08], ["red", 0], ["red", 0.08]]) decal(k, [BD - 0.14 + dx, 1.03, ZB + 0.036 + E], circle(0.018, 8));
  rod("steel", [BD, 2.06, ZB], [BD, 2.06, ZB + 0.42], 0.012, 4); // plate bracket
  box("dark", BD - 0.2, BD + 0.2, 1.97, 2.15, ZB + 0.39, ZB + 0.43);
  box("paper", BD - 0.18, BD + 0.18, 1.985, 2.135, ZB + 0.385, ZB + 0.435);

  // ---------- cardboard boxes (-X corner) ----------
  const cbox = (x0, x1, y0, y1, z0, z1) => {
    box("box", x0, x1, y0, y1, z0, z1);
    const xm = (x0 + x1) / 2;
    poly("tape", [[xm - 0.03, y1 + E, z0], [xm + 0.03, y1 + E, z0], [xm + 0.03, y1 + E, z1], [xm - 0.03, y1 + E, z1]], [0, 1, 0]);
    plate("tape", [xm, y1 - 0.06, z1 + E], [0, 0, 1], 0.06, 0.12);
    plate("tape", [x1 + E, (y0 + y1) / 2, (z0 + z1) / 2], [1, 0, 0], z1 - z0, 0.05);
  };
  cbox(-3.95, -3.35, 0, 0.42, -1.76, -1.28);
  cbox(-3.9, -3.25, 0, 0.36, -1.2, -0.72);
  frame([-3.62, 0.42, -1.5], 18);
  box("box", -0.22, 0.22, 0, 0.3, -0.17, 0.17);
  poly("tape", [[-0.03, 0.3 + E, -0.17], [0.03, 0.3 + E, -0.17], [0.03, 0.3 + E, 0.17], [-0.03, 0.3 + E, 0.17]], [0, 1, 0]);
  plate("tape", [0, 0.24, 0.17 + E], [0, 0, 1], 0.06, 0.12);
  XF = null;

  // ---------- ticket table: two desks under a cloth, cash box, tickets, a chair ----------
  const TX0 = 2.35, TX1 = 3.65, TZ0 = -1.2, TZ1 = -0.7, TY = 0.72;
  box("cloth", TX0 - 0.02, TX1 + 0.02, TY - 0.03, TY, TZ0 - 0.02, TZ1 + 0.02);
  box("cloth", TX0 - 0.02, TX1 + 0.02, 0.28, TY - 0.03, TZ1, TZ1 + 0.02);
  for (const x of [TX0 - 0.02, TX1]) box("cloth", x, x + 0.02, 0.4, TY - 0.03, TZ0 - 0.02, TZ1 + 0.02);
  decal("red", [0, 0, TZ1 + 0.02 + E], [[TX0 - 0.02, 0.28], [TX1 + 0.02, 0.28], [TX1 + 0.02, 0.36], [TX0 - 0.02, 0.36]]);
  // a ticket pictogram on the cloth front: a ticket with notched ends and a perforation line
  const tk = [[-0.16, -0.08], [0.16, -0.08], [0.16, -0.025], [0.13, 0], [0.16, 0.025], [0.16, 0.08], [-0.16, 0.08], [-0.16, 0.025], [-0.13, 0], [-0.16, -0.025]];
  decal("yellow", [3.0, 0.52, TZ1 + 0.02 + E], tk);
  for (const dy of [-0.06, -0.02, 0.02, 0.06]) decal("red", [3.07, 0.52 + dy, TZ1 + 0.02 + 2 * E], circle(0.008, 6));
  decal("red", [2.96, 0.52, TZ1 + 0.02 + 2 * E], circle(0.035, 10));
  for (const x of [TX0 + 0.03, TX1 - 0.03]) for (const z of [TZ0 + 0.03, TZ1 - 0.06]) rod("steel", [x, 0.009, z], [x, 0.4, z], 0.014, 4);
  box("cash", 2.55, 2.93, TY, TY + 0.1, -1.05, -0.8); // cash box
  plate("dark", [2.74, TY + 0.075, -0.8 + E], [0, 0, 1], 0.38, 0.012);
  box("dark", 2.7, 2.78, TY + 0.06, TY + 0.075, -0.8, -0.79);
  rod("dark", [2.66, TY + 0.1, -0.925], [2.82, TY + 0.1, -0.925], 0.009, 4);
  box("yellow", 3.1, 3.32, TY, TY + 0.05, -1.0, -0.86); // ticket stack
  plate("red", [3.21, TY + 0.05 + E, -0.93], [0, 1, 0], 0.18, 0.025);
  // the chair behind (seat 0.43), facing +Z
  const CXc = 3.0, CZc = -1.45;
  box("paint", CXc - 0.19, CXc + 0.19, 0.41, 0.44, CZc - 0.18, CZc + 0.18);
  box("paint", CXc - 0.18, CXc + 0.18, 0.6, 0.78, CZc - 0.22, CZc - 0.2);
  for (const sx of [-1, 1]) {
    rod("steel", [CXc + sx * 0.17, 0.008, CZc + 0.16], [CXc + sx * 0.17, 0.41, CZc + 0.16], 0.012, 4);
    rod("steel", [CXc + sx * 0.17, 0.008, CZc - 0.19], [CXc + sx * 0.17, 0.74, CZc - 0.19], 0.012, 4);
  }

  // ---------- menu easel (A-frame, turned toward the camera) ----------
  frame([-0.85, 0, -0.95], 22);
  for (const sx of [-1, 1]) rod("paint", [sx * 0.3, 0.02, 0.14], [sx * 0.25, 1.42, -0.03], 0.02, 4);
  rod("paint", [0, 0.02, -0.42], [0, 1.36, -0.06], 0.02, 4);
  rod("paint", [-0.3, 0.52, 0.06], [0.3, 0.52, 0.06], 0.02, 4); // the board's ledge
  const lean = 7 * D2R, up = [0, Math.cos(lean), -Math.sin(lean)], fz = [0, Math.sin(lean), Math.cos(lean)];
  const BO = [0, 0.54, 0.07]; // board bottom-centre on the ledge
  const bp = (u, v, w = 0) => add(BO, add([u, 0, 0], add(mul(up, v), mul(fz, w))));
  prism("paint", bp(0, 0, 0.012), [1, 0, 0], up, [[-0.31, -0.01], [0.31, -0.01], [0.31, 0.83], [-0.31, 0.83]], 0.03);
  const chalk = (key, pts2, w = 0.015) => poly(key, pts2.map(([u, v]) => bp(u, v, w)), fz);
  chalk("dark", [[-0.27, 0.03], [0.27, 0.03], [0.27, 0.79], [-0.27, 0.79]], 0.0135);
  const row = (v, n) => { for (let i = 0; i < n; i++) chalk("yellow", shift(circle(0.022, 8), 0.07 + i * 0.065, v)); };
  // row 1: a cup with steam
  chalk("paper", [[-0.21, 0.58], [-0.07, 0.58], [-0.09, 0.47], [-0.19, 0.47]]);
  chalk("paper", [[-0.07, 0.555], [-0.035, 0.545], [-0.035, 0.51], [-0.08, 0.5]]);
  chalk("paper", [[-0.23, 0.465], [-0.05, 0.465], [-0.05, 0.45], [-0.23, 0.45]]);
  for (const du of [-0.17, -0.11]) chalk("paper", [[du, 0.6], [du + 0.012, 0.6], [du + 0.022, 0.67], [du + 0.01, 0.67]]);
  row(0.52, 2);
  // row 2: a cake slice with a strawberry
  chalk("pink", [[-0.22, 0.27], [-0.05, 0.27], [-0.05, 0.37], [-0.22, 0.33]]);
  chalk("paper", [[-0.22, 0.33], [-0.05, 0.37], [-0.05, 0.385], [-0.22, 0.345]]);
  chalk("red", shift(circle(0.025, 8), -0.1, 0.4));
  row(0.33, 3);
  // row 3: an onigiri with its nori band
  chalk("paper", [[-0.21, 0.08], [-0.05, 0.08], [-0.13, 0.22]]);
  chalk("strip", [[-0.16, 0.08], [-0.1, 0.08], [-0.1, 0.13], [-0.16, 0.13]], 0.016);
  row(0.13, 1);
  // a red header band with two tiny cat ears on the board top
  chalk("red", [[-0.27, 0.71], [0.27, 0.71], [0.27, 0.77], [-0.27, 0.77]], 0.016);
  for (const sx of [-1, 1]) prism("red", bp(0, 0, 0.012), [1, 0, 0], up, [[sx * 0.26, 0.82], [sx * 0.14, 0.82], [sx * 0.21, 0.92]], 0.025);
  XF = null;

  // ---------- SWAY: paper-chain swags and balloons, one rigid piece each ----------
  const pieces = [];
  const CHAIN = ["red", "yellow", "lime", "paper", "pink"];
  let link = 0;
  function swag(a, b, sag, phase, amp) {
    PIECE = pieces.length;
    pieces.push({ kind: "swag", a, b, phase, amp });
    const L = Math.hypot(...sub(b, a)), n = Math.max(4, Math.round(L / 0.075));
    const at = (s) => add(add(a, mul(sub(b, a), s)), [0, -sag * 4 * s * (1 - s), 0]);
    const side = nrm(cross(sub(b, a), [0, 1, 0]));
    for (let i = 0; i <= n; i++) {
      const s = i / n, p = at(s), tg = nrm(sub(at(Math.min(1, s + 0.01)), at(Math.max(0, s - 0.01))));
      const w = nrm(cross(tg, side)); // in the vertical plane of the swag, across the chain
      const [ay, az] = i % 2 ? [w, cross(tg, w)] : [cross(tg, w), w];
      obox("c" + CHAIN[link++ % CHAIN.length], p, tg, ay, az, 0.045, 0.022, 0.006);
    }
    rod("cdark", add(a, [0, 0.03, 0]), add(a, [0, -0.01, 0]), 0.008, 4); // the hook
  }
  const HY = 2.9, NS = 6;
  for (let i = 0; i < NS; i++) { // along the classroom wall, in front of the transoms
    const xa = X0 + 0.05 + (i * (X1 - X0 - 0.1)) / NS, xb = X0 + 0.05 + ((i + 1) * (X1 - X0 - 0.1)) / NS;
    swag([xa, HY, ZB + 0.12], [xb, HY, ZB + 0.12], 0.28, i * 0.13, 10);
  }
  for (let i = 0; i < 3; i++) { // along the end wall
    const za = ZB + 0.15 + (i * (ZF - ZB - 0.3)) / 3, zb = ZB + 0.15 + ((i + 1) * (ZF - ZB - 0.3)) / 3;
    swag([X0 + 0.1, HY, za], [X0 + 0.1, HY, zb], 0.26, 0.4 + i * 0.13, 10);
  }
  const BAL = ["red", "yellow", "lime", "pink", "paper"];
  let bi = 0;
  function balloon(tie, top, ph) {
    PIECE = pieces.length;
    pieces.push({ kind: "balloon", p: tie, phase: ph });
    const col = "c" + BAL[bi++ % BAL.length];
    const r = 0.13, ctr = sub(top, [0, 0.3, 0]);
    lathe(col, ctr, [[0, -0.02], [0.05, 0.0], [0.1, 0.06], [r, 0.15], [r * 0.95, 0.22], [r * 0.7, 0.28], [0, 0.3]], 8);
    lathe(col, ctr, [[0, -0.045], [0.022, -0.04], [0.012, -0.012], [0, -0.005]], 6); // the knot
    rod("cdark", tie, add(ctr, [0, -0.04, 0]), 0.005, 3);
  }
  for (const sx of [-1, 1]) {
    const tx = AX + sx * (R1 - 0.05), tie = [tx, AY + 0.02, AZ1 + 0.02];
    balloon(tie, [tx + sx * 0.24, 2.3, AZ1 + 0.14], 0.1 + (sx > 0 ? 0.5 : 0));
    balloon(tie, [tx + sx * 0.02, 2.42, AZ1 + 0.24], 0.35 + (sx > 0 ? 0.5 : 0));
    balloon(tie, [tx + sx * 0.3, 2.06, AZ1 + 0.34], 0.6 + (sx > 0 ? 0.5 : 0));
  }
  balloon([TX1, TY, TZ1 + 0.02], [TX1 + 0.12, 1.55, TZ1 + 0.1], 0.2);
  balloon([TX1, TY, TZ1 + 0.02], [TX1 - 0.12, 1.42, TZ1 + 0.18], 0.7);
  PIECE = -1;

  // ---------- meshes: four, one material group per colour pair ----------
  // key -> [base, shade, mesh]; c-prefixed keys ride in the sway mesh
  const FLAT = (h) => [h, h];
  const MAT = {
    floor: [...FLAT(c.floor), "set"], wall: [c.wall, c.wallShade, "set"], cap: [...FLAT(c.dark), "set"],
    paint: [c.paint, c.paintShade, "set"], box: [c.box, c.boxShade, "set"], cloth: [c.steel, c.steelShade, "set"],
    door: [c.door, c.doorShade, "set"], paper: [c.paper, c.paperShade, "set"],
    steel: [c.steel, c.steelShade, "trim"], red: [...FLAT(c.red), "trim"], pink: [...FLAT(c.pink), "trim"],
    cash: [c.cash, c.cashShade, "trim"], yellow: [...FLAT(c.yellow), "trim"], dark: [...FLAT(c.dark), "trim"],
    strip: [...FLAT(c.strip), "decal"], seam: [...FLAT(c.seam), "decal"], sun: [...FLAT(c.sun), "decal"],
    glass: [...FLAT(c.glass), "decal"], cloud: [...FLAT(c.cloud), "decal"], tape: [...FLAT(c.tape), "decal"],
    cred: [...FLAT(c.red), "sway"], cyellow: [...FLAT(c.yellow), "sway"], clime: [...FLAT(c.lime), "sway"],
    cpaper: [...FLAT(c.paper), "sway"], cpink: [...FLAT(c.pink), "sway"], cdark: [...FLAT(c.dark), "sway"],
  };
  // flat paint (decals) may share a colour key with solids in an inked mesh: a one-sided decal's hull faces away and
  // is culled, so it draws no ink
  const MESH = { set: 3, trim: 2, decal: 0, sway: 2 };
  const meshes = {};
  for (const [mname, px] of Object.entries(MESH)) {
    const keys = Object.keys(soups).filter((k) => MAT[k][2] === mname);
    if (!keys.length) continue;
    const P = [], N = [], PC = [], g = new THREE.BufferGeometry();
    for (const [i, k] of keys.entries()) {
      const s = soups[k], start = P.length / 3;
      for (let j = 0; j < s.p.length; j++) P.push(s.p[j]), N.push(s.n[j]);
      PC.push(...s.pc);
      g.addGroup(start, s.p.length / 3, i);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
    const mats = keys.map((k) => { const [b, s] = MAT[k]; return kit.cel(b, s, { threshold: 0.1 }); });
    const [b0, s0] = MAT[keys[0]];
    const mesh = kit.toon(g, b0, s0, px ? { threshold: 0.1, px } : { threshold: 0.1, outline: false });
    mesh.material = mats;
    mesh.name = mname;
    body.add(mesh);
    meshes[mname] = { mesh, PC, P0: Float32Array.from(P), N0: Float32Array.from(N) };
  }
  const SW = meshes.sway, SG = SW.mesh.geometry;
  SW.H0 = SG.attributes.hullNormal ? SG.attributes.hullNormal.array.slice() : null;

  // pivots for --joints and films: one per piece (no mesh; pose() reads their matrices)
  const pivots = pieces.map((pc, i) => {
    const pv = new THREE.Group();
    pv.name = (pc.kind === "swag" ? "swag" : "balloon") + i;
    pv.position.set(...(pc.kind === "swag" ? mul(add(pc.a, pc.b), 0.5) : pc.p));
    body.add(pv);
    joints[pv.name] = pv;
    return pv;
  });

  // ---------- pose and clip ----------
  // Sign convention: a swag turns about its hook line a->b by +angle (right hand: for a +X hook line, + swings the sag
  // toward +Z); a balloon turns about its tie point, +rx tips its top toward +Z, +rz tips it toward -X.
  const CLIPS = { sway: 2 };
  const M4 = new THREE.Matrix4(), T1 = new THREE.Matrix4(), T2 = new THREE.Matrix4(), m3 = new THREE.Matrix3();
  const v3 = new THREE.Vector3(), axis = new THREE.Vector3(), eu = new THREE.Euler();
  function apply(ph) {
    const mats = pieces.map((pc, i) => {
      const m = new THREE.Matrix4();
      if (ph === null) return m;
      const w = TAU * (ph - pc.phase);
      if (pc.kind === "swag") {
        axis.set(...nrm(sub(pc.b, pc.a)));
        T1.makeTranslation(-pc.a[0], -pc.a[1], -pc.a[2]);
        T2.makeTranslation(pc.a[0], pc.a[1], pc.a[2]);
        M4.makeRotationAxis(axis, pc.amp * D2R * Math.sin(w));
        m.multiplyMatrices(T2, M4).multiply(T1);
      } else {
        eu.set(7 * D2R * Math.sin(w), 0, 7 * D2R * Math.sin(w + 1.7 + i));
        T1.makeTranslation(-pc.p[0], -pc.p[1], -pc.p[2]);
        T2.makeTranslation(pc.p[0], pc.p[1], pc.p[2]);
        M4.makeRotationFromEuler(eu);
        m.multiplyMatrices(T2, M4).multiply(T1);
      }
      pivots[i].rotation.set(0, 0, 0);
      return m;
    });
    const Pa = SG.attributes.position.array, Na = SG.attributes.normal.array, Ha = SG.attributes.hullNormal?.array;
    const nm = mats.map((m) => new THREE.Matrix3().setFromMatrix4(m));
    for (let v = 0; v < SW.PC.length; v++) {
      const pi = SW.PC[v];
      if (pi < 0) continue;
      const o = v * 3;
      v3.set(SW.P0[o], SW.P0[o + 1], SW.P0[o + 2]).applyMatrix4(mats[pi]);
      Pa[o] = v3.x, Pa[o + 1] = v3.y, Pa[o + 2] = v3.z;
      v3.set(SW.N0[o], SW.N0[o + 1], SW.N0[o + 2]).applyMatrix3(nm[pi]);
      Na[o] = v3.x, Na[o + 1] = v3.y, Na[o + 2] = v3.z;
      if (Ha && SW.H0) {
        v3.set(SW.H0[o], SW.H0[o + 1], SW.H0[o + 2]).applyMatrix3(nm[pi]);
        Ha[o] = v3.x, Ha[o + 1] = v3.y, Ha[o + 2] = v3.z;
      }
    }
    SG.attributes.position.needsUpdate = true;
    SG.attributes.normal.needsUpdate = true;
    if (Ha) SG.attributes.hullNormal.needsUpdate = true;
    SG.computeBoundingSphere();
    SG.computeBoundingBox();
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`bunkasai: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      const Tn = CLIPS[m[1]];
      return apply((((+m[2] % Tn) + Tn) % Tn) / Tn);
    }
    if (name !== "rest") throw new Error(`bunkasai: unknown pose "${name}" (rest, or sway@<seconds>)`);
    apply(null);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
