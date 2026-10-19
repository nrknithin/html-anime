// school-stairwell.js - the stairwell landing of every anime school (confessions, collisions, the overheard talk), static.
// Contract: harness/lab/README.md. Meters, +Y up, the open (cutaway) side faces +Z and +X, so the lab's front-left
// three4 and hero cameras look straight in at both flights. Ground floor on y = 0, centred on x = z = 0.
//
// Construction (boxes and sloped hexahedra, all triangle soups merged per material, flat-shaded, so planes read crisp;
// every triangle is wound away from a point inside its solid, never by hand):
//   STAIR     a switchback in reinforced concrete. The lower flight (+Z half) climbs toward -X from the ground floor
//             to a full-width mid landing against the -X wall; the upper flight (-Z half, against the back wall) climbs
//             back toward +X to the upper floor slab. Each flight is a sloped waist slab with a concrete block per
//             step on it; every tread and the landings carry a dark green vinyl sheet (a box 1 cm thick) and a yellow
//             nosing strip that wraps the edge (top and front), so the step edges read from below in the hero too.
//             Lower risers face the camera (+X), the upper flight shows its sawtooth side over the parapet.
//   RAILS     one solid wall between the flights (the well wall): under the landing it stops at the landing soffit,
//             along the lower flight its top follows the nosings 0.75 m up, with a steel handrail on short posts on
//             it. The upper flight's open edge has a top rail and a mid rail on posts that run on along the upper
//             floor's edge. Wall-side handrails on L brackets: along the back wall for the upper flight (0.8 m) and a
//             low second rail on the parapet's face for the lower flight (0.65 m), as school stairs double them.
//   SHELL     the back wall (-Z) and the -X wall to 4.6 m, both cut there with a dark 2 cm section cap; the +Z and +X
//             walls and the ceiling are left out. Pale plaster over a painted green wainscot 1.0 m high, which follows
//             the floors and steps up the flight, with a thin dark line on top; dark skirting at the floor, and a dark
//             seam where the upper flight's soffit meets the back wall. The upper floor slab rests on the back wall,
//             the landing on the back wall, the -X wall and the well wall: nothing floats.
//   WINDOW    a tall window in the -X wall over the landing (1.1 x 1.7 m, sill on the wainscot line): aluminium
//             casing, a meeting stile and a transom bar, sky glass. Sunlight falls through it as four yellow pane
//             patches on the landing floor, each pane corner projected along one sun direction: in through the window
//             (+X) and down, sheared toward -Z like the model's cel light, so the patches lie on the window's side.
//   FITTINGS  a red fire extinguisher box standing on the landing against the -X wall (a pale panel, the red bottle
//             behind it); a full-length safety mirror (frame, sky glass, two pale glints) on the -X wall; a blank
//             floor-number plate (green plate, pale face, no lettering) and a fluorescent fitting on two brackets out
//             of the back wall over the landing (steel channel, two glowing tubes); a red mat at the foot of the stair.
// Proportions (real size, base unit the floor-to-floor height H = 3.5 m): 22 risers of 0.159 (11 per flight),
//   treads 0.28, flights 1.3 wide either side of a 0.15 well wall; landing 1.4 deep at 1.75; upper floor slab 1.4
//   deep; walls 0.15 thick to 4.6 (meta.height with the cap). Handrails 0.85 above the nosings, 0.95 on the floor.
// Options: build(THREE, kit, colors, { height }). height scales the whole set uniformly so the floor-to-floor height
//   is `height` (default 3.5 m); the lab's meta.height check is against the default.
// Budget: ~2.0k triangles, 12 meshes.
// Colours (meadow, the school models' script), base / shade:
//   walls (back, -X)             moon #f7f3e1 / sclera #f6f3ee, threshold 0.45, no hull (caps, skirting, the wainscot
//                                 line and a dark corner seam draw its edges): plaster, the back wall a shade cooler,
//                                 so the sky soffit of the upper flight stands off it
//   parapet (well wall)          moon / sclera, threshold 0.1, inked (its +Z face stays lit)
//   wainscot                     line #a9d16e / iris #3f8a47, threshold 0.1 (lit on both walls), no hull
//   concrete (steps, waist slabs, landing and floor slabs)  sclera #f6f3ee / sky, threshold 0.4 (lower risers lit,
//                                 the sawtooth sides and soffits sky)
//   vinyl (treads, landings, floors)  iris #3f8a47 / hair #2c5131
//   rails, brackets, plate       iris / hair
//   skirting, lines, caps, seams hair #2c5131 flat (they are lines)
//   window casing, mirror frame, light channel, panels  sclera / sky; glass sky flat
//   nosing strips, sun patches   practical #f2c94c flat; fluorescent tubes and mirror glints moon, glowing
//   extinguisher box, bottle, mat  accent #d9483b flat

export const meta = {
  name: "school-stairwell",
  height: 4.62,
  script: "meadow",
  colors: {
    wall: "#f7f3e1", wallShade: "#f6f3ee",
    wainscot: "#a9d16e", wainscotShade: "#3f8a47",
    concrete: "#f6f3ee", concreteShade: "#d7ecef",
    vinyl: "#3f8a47", vinylShade: "#2c5131",
    rail: "#3f8a47", railShade: "#2c5131",
    dark: "#2c5131",
    frame: "#f6f3ee", frameShade: "#d7ecef",
    glass: "#d7ecef",
    yellow: "#f2c94c",
    glow: "#f7f3e1",
    red: "#d9483b",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const H = 3.5; // floor to floor
  const { height = H } = opts;
  const root = new THREE.Group();
  root.name = "school-stairwell";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / H);
  root.add(body);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soups = {};
  const S = (key) => (soups[key] ??= []);
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
  const box = (key, x0, x1, y0, y1, z0, z1) =>
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  // a slab in the x-y plane between x0 and x1: bottom and top lines y = b(x), t(x), across z0..z1
  const slope = (key, x0, x1, b, t, z0, z1) =>
    hex(key, [[x0, b(x0), z0], [x1, b(x1), z0], [x1, b(x1), z1], [x0, b(x0), z1], [x0, t(x0), z0], [x1, t(x1), z0], [x1, t(x1), z1], [x0, t(x0), z1]]);
  // a square bar from a to b (x-y plane), w across
  const bar = (key, a, b, w) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    const e = w / 2, A = [a[0] - ux * e, a[1] - uy * e], B = [b[0] + ux * e, b[1] + uy * e]; // overlap the joints
    const nx = -uy * e, ny = ux * e, z = a[2];
    hex(key, [[A[0] - nx, A[1] - ny, z - e], [B[0] - nx, B[1] - ny, z - e], [B[0] + nx, B[1] + ny, z - e], [A[0] + nx, A[1] + ny, z - e],
      [A[0] - nx, A[1] - ny, z + e], [B[0] - nx, B[1] - ny, z + e], [B[0] + nx, B[1] + ny, z + e], [A[0] + nx, A[1] + ny, z + e]]);
  };
  const post = (key, x, z, y0, y1, w) => box(key, x - w / 2, x + w / 2, y0, y1, z - w / 2, z + w / 2);

  // ---------- dimensions ----------
  const N = 11, r = H / 2 / N, g = 0.28, k = r / g; // risers per flight, rise, going, pitch
  const W = 1.3, zw = 0.075, tw = 0.15; // flight width, half the well wall, outer wall thickness
  const xF = 1.4, xL = xF - (N - 1) * g, xW = xL - 1.4, xE = 2.8; // flight foot / top, landing edge, -X wall, cut end
  const zB = -zw - W, zP = zw + W; // back wall face, the open +Z edge
  const YT = 4.6, v = 0.01; // wall top, vinyl thickness
  const L1 = H / 2;
  const noseLo = (x) => r + (xF - x) * k; // nosing lines
  const noseUp = (x) => L1 + r + (x - xL) * k;
  const cornUp = (x) => L1 + (x - xL) * k; // inner-corner lines (the waist slab tops)
  const cornLo = (x) => (xF - x) * k;

  // ---------- floors and landing ----------
  box("vinyl", xW, xE, 0, 0.012, zB, zP); // ground floor
  box("concrete", xW, xL, L1 - 0.2, L1 - v, zB, zP); // landing
  box("vinyl", xW, xL, L1 - v, L1, zB, zP);
  box("concrete", xF, xE, H - 0.2, H - v, zB, -zw); // upper floor, on the back wall
  box("vinyl", xF, xE, H - v, H, zB, -zw);
  // yellow nosing strips wrap the edge: 5 cm of the top and 3.5 cm down the front, 4 mm proud
  const ns = 0.05, nd = 0.035, np = 0.004;
  box("yellow", xL - ns, xL + np, L1 - nd, L1 + np, zw + 0.04, zP - 0.04);
  box("yellow", xF - np, xF + ns, H - nd, H + np, zB + 0.04, -zw - 0.04);

  // ---------- flights ----------
  for (let i = 1; i < N; i++) {
    // lower flight, climbing toward -X; the nosing is the +X edge
    const lx0 = xF - i * g, lx1 = lx0 + g, lt = i * r;
    // step blocks reach 5 cm into the waist slab (whose top is the inner-corner line), never through its soffit
    box("concrete", lx0, lx1, i <= 2 ? 0 : lt - r - 0.05, lt - v, zw, zP);
    box("vinyl", lx0, lx1 + 0.012, lt - v, lt, zw, zP);
    box("yellow", lx1 - ns, lx1 + 0.012 + np, lt - nd, lt + np, zw + 0.04, zP - 0.04);
    // upper flight, climbing toward +X; the nosing is the -X edge
    const ux0 = xL + (i - 1) * g, ux1 = ux0 + g, ut = L1 + i * r;
    box("concrete", ux0, ux1, ut - r - 0.05, ut - v, zB, -zw);
    box("vinyl", ux0 - 0.012, ux1, ut - v, ut, zB, -zw);
    box("yellow", ux0 - 0.012 - np, ux0 + ns, ut - nd, ut + np, zB + 0.04, -zw - 0.04);
  }
  // waist slabs: top on the inner corners of the steps, 0.22 deep
  const xa = xF - 0.22 / k;
  slope("concrete", xL, xa, (x) => cornLo(x) - 0.22, cornLo, zw, zP);
  slope("concrete", xL, xF, (x) => cornUp(x) - 0.22, cornUp, zB, -zw);

  // ---------- walls ----------
  box("wall", xW - tw, xE, 0, YT, zB - tw, zB); // back wall
  const hw = 1.0; // wainscot height
  const wz0 = -0.55, wz1 = 0.55, ws = L1 + hw + 0.02, wh = ws + 1.7; // window opening in the -X wall
  box("wall", xW - tw, xW, 0, YT, zB, wz0);
  box("wall", xW - tw, xW, 0, YT, wz1, zP);
  box("wall", xW - tw, xW, 0, ws, wz0, wz1);
  box("wall", xW - tw, xW, wh, YT, wz0, wz1);
  box("parapet", xW, xL, 0, L1 - 0.2, -zw, zw); // well wall under the landing
  slope("parapet", xL, xF, () => 0, (x) => noseLo(x) + 0.75, -zw, zw); // the parapet along the lower flight
  // section caps where the cutaway stops the shell
  box("dark", xW - tw, xE, YT, YT + 0.02, zB - tw, zB);
  box("dark", xW - tw, xW, YT, YT + 0.02, zB, zP);
  box("dark", xE, xE + 0.02, 0, YT + 0.02, zB - tw, zB);
  box("dark", xW - tw, xW, 0, YT + 0.02, zP, zP + 0.02);
  box("dark", xE, xE + 0.02, H - 0.2, H, zB, -zw);
  // painted wainscot (6 mm proud) with a dark line on top (10 mm proud): on the back wall it follows the ground
  // floor, the landing, the upper flight and the upper floor; on the -X wall the ground floor and the landing
  const wp = 0.006, lp = 0.01, lh = 0.02;
  const bw = (x0, x1, y) => { // back wall, flat
    box("wainscot", x0, x1, y, y + hw, zB, zB + wp);
    box("dark", x0, x1, y + hw - lh, y + hw, zB, zB + lp);
  };
  bw(xW, xE, 0);
  bw(xW, xL, L1);
  bw(xF, xE, H);
  slope("wainscot", xL, xF, cornUp, (x) => noseUp(x) + hw - r, zB, zB + wp);
  slope("dark", xL, xF, (x) => noseUp(x) + hw - r - lh, (x) => noseUp(x) + hw - r, zB, zB + lp);
  for (const y of [0, L1]) { // -X wall
    box("wainscot", xW, xW + wp, y, y + hw, zB, zP);
    box("dark", xW, xW + lp, y + hw - lh, y + hw, zB, zP);
  }
  box("wainscot", xW, xL, 0, hw, zw, zw + wp); // under the landing, on the well wall
  box("dark", xW, xL, hw - lh, hw, zw, zw + lp);
  // skirting: flat on the floors, sloped along the flights
  const sk = 0.08, sp = 0.012;
  box("dark", xW, xE, 0, sk, zB, zB + sp);
  box("dark", xW, xW + sp, 0, sk, zB, zP);
  box("dark", xW, xL, 0, sk, zw, zw + sp);
  box("dark", xW, xL, L1, L1 + sk, zB, zB + sp);
  box("dark", xW, xW + sp, L1, L1 + sk, zB, zP);
  box("dark", xF, xE, H, H + sk, zB, zB + sp);
  slope("dark", xL, xF, cornUp, (x) => noseUp(x) + 0.07, zB, zB + sp);
  slope("dark", xL, xF, cornLo, (x) => noseLo(x) + 0.07, zw, zw + sp);
  // the corner where the two walls meet, and the seam where the upper flight's soffit meets the back wall
  box("dark", xW, xW + 0.012, 0, YT, zB, zB + 0.012);
  slope("dark", xL, xF, (x) => cornUp(x) - 0.24, (x) => cornUp(x) - 0.2, zB, zB + sp);

  // ---------- rails ----------
  const rw = 0.05, pw = 0.04;
  // lower flight: a handrail on short posts on the parapet
  const pTop = (x) => noseLo(x) + 0.75;
  for (const x of [xF - 0.15, 0.45, -0.5, xL + 0.15]) post("rail", x, 0, pTop(x) - 0.02, pTop(x) + 0.14, pw);
  bar("rail", [xF, pTop(xF) + 0.14, 0], [xL, pTop(xL) + 0.14, 0], rw);
  // upper flight and the upper floor edge: top rail and mid rail on posts
  const zr = -zw - 0.14, top = 0.95 + H, mid = 0.5 + H;
  const kneeT = xL + (top - 0.85 - L1 - r) / k, kneeM = xL + (mid - 0.45 - L1 - r) / k;
  const rTop = (x) => Math.min(noseUp(x) + 0.85, top);
  for (let j = 1; j < N; j += 2) {
    const x = xL + (j - 0.5) * g;
    post("rail", x, zr, L1 + j * r, rTop(x), pw);
  }
  for (const x of [1.95, 2.4, xE - 0.06]) post("rail", x, zr, H, top, pw);
  bar("rail", [xL + 0.02, noseUp(xL + 0.02) + 0.85, zr], [kneeT, top, zr], rw);
  bar("rail", [kneeT, top, zr], [xE - 0.06, top, zr], rw);
  bar("rail", [xL + 0.02, noseUp(xL + 0.02) + 0.45, zr], [kneeM, mid, zr], rw * 0.8);
  bar("rail", [kneeM, mid, zr], [xE - 0.06, mid, zr], rw * 0.8);
  // wall-side handrails on L brackets (an arm out of the wall, a short upright under the rail)
  const wallRail = (x0, x1, yOf, zWall, out) => {
    const zc = zWall + out * 0.075;
    bar("rail", [x0, yOf(x0), zc], [x1, yOf(x1), zc], 0.045);
    const n = Math.max(2, Math.round(Math.abs(x1 - x0) / 0.9) + 1);
    for (let i = 0; i < n; i++) {
      const x = x0 + ((x1 - x0) * (i + 0.5)) / n, y = yOf(x);
      post("rail", x, zc, y - 0.08, y, 0.022);
      const za = Math.min(zWall, zc), zb = Math.max(zWall, zc);
      box("rail", x - 0.018, x + 0.018, y - 0.1, y - 0.07, za, zb);
    }
  };
  wallRail(xL + 0.1, xF - 0.1, (x) => noseUp(x) + 0.8, zB, 1); // back wall, upper flight
  wallRail(xF - 0.1, xL + 0.1, (x) => noseLo(x) + 0.65, zw, 1); // parapet face, lower flight

  // ---------- window ----------
  const fx0 = xW - tw + 0.02, fx1 = xW + 0.01, fw = 0.05;
  box("frame", fx0, fx1, ws, ws + fw, wz0, wz1);
  box("frame", fx0, fx1, wh - fw, wh, wz0, wz1);
  box("frame", fx0, fx1, ws, wh, wz0, wz0 + fw);
  box("frame", fx0, fx1, ws, wh, wz1 - fw, wz1);
  const ty = ws + 1.2; // transom bar
  box("frame", fx0 + 0.03, fx1 - 0.02, ty - 0.02, ty + 0.02, wz0, wz1);
  box("frame", fx0 + 0.03, fx1 - 0.02, ws, ty, -0.025, 0.025); // meeting stile
  box("frame", xW - 0.02, xW + 0.09, ws - 0.03, ws, wz0 - 0.05, wz1 + 0.05); // sill board
  box("glass", xW - tw / 2 - 0.003, xW - tw / 2 + 0.003, ws, wh, wz0, wz1);
  // sunlight through the window: in (+X) and down, sheared toward -Z as the cel light runs, onto the landing
  const sd = [1, -2.0, -0.3];
  const onFloor = (z, y) => { const t = (y - L1) / -sd[1]; return [xW + t * sd[0], L1 + 0.004, z + t * sd[2]]; };
  for (const [z0, z1] of [[wz0 + fw, -0.025], [0.025, wz1 - fw]])
    for (const [y0, y1] of [[ws + fw, ty - 0.02], [ty + 0.02, wh - fw]])
      quad("yellow", onFloor(z0, y0), onFloor(z1, y0), onFloor(z1, y1), onFloor(z0, y1), [xW + 0.5, L1 - 1, 0]);

  // ---------- fittings ----------
  // fire extinguisher box standing on the landing against the -X wall, glass panel and the bottle behind it
  const ez0 = 0.82, ez1 = 1.17, ed = 0.22, eh = 0.75;
  box("red", xW, xW + ed, L1, L1 + eh, ez0, ez1);
  box("frame", xW + ed, xW + ed + 0.006, L1 + 0.18, L1 + eh - 0.1, ez0 + 0.04, ez1 - 0.04);
  box("red", xW + ed + 0.006, xW + ed + 0.012, L1 + 0.24, L1 + 0.52, 0.955, 1.035);
  box("red", xW + ed + 0.006, xW + ed + 0.012, L1 + 0.52, L1 + 0.58, 0.98, 1.01);
  // full-length safety mirror on the -X wall, between the window and the back corner
  const mz0 = -1.27, mz1 = -0.75, my0 = L1 + 0.3, my1 = L1 + 1.95;
  box("frame", xW, xW + 0.035, my0, my1, mz0, mz1);
  box("glass", xW + 0.035, xW + 0.041, my0 + 0.04, my1 - 0.04, mz0 + 0.04, mz1 - 0.04);
  const gx = xW + 0.045, gref = [xW - 1, (my0 + my1) / 2, (mz0 + mz1) / 2];
  quad("glow", [gx, my0 + 0.75, mz0 + 0.06], [gx, my0 + 0.95, mz0 + 0.06], [gx, my0 + 1.35, mz1 - 0.06], [gx, my0 + 1.15, mz1 - 0.06], gref);
  quad("glow", [gx, my0 + 1.02, mz0 + 0.06], [gx, my0 + 1.08, mz0 + 0.06], [gx, my0 + 1.48, mz1 - 0.06], [gx, my0 + 1.42, mz1 - 0.06], gref);
  // blank floor-number plate on the back wall over the landing
  box("rail", -2.28, -1.92, 2.98, 3.34, zB, zB + 0.015);
  box("frame", -2.24, -1.96, 3.02, 3.3, zB + 0.015, zB + 0.02);
  // fluorescent fitting over the landing: two arms out of the back wall, a steel channel, two glowing tubes
  const fy = 4.3, fz = zB + 0.38;
  for (const x of [-2.45, -1.85]) {
    box("frame", x - 0.07, x + 0.07, fy - 0.02, fy + 0.16, zB, zB + 0.02); // wall plate
    box("frame", x - 0.02, x + 0.02, fy + 0.04, fy + 0.08, zB, fz); // arm
  }
  box("frame", -2.7, -1.6, fy - 0.03, fy + 0.04, fz - 0.09, fz + 0.09);
  for (const dz of [-0.045, 0.045]) box("glow", -2.66, -1.64, fy - 0.07, fy - 0.03, fz + dz - 0.018, fz + dz + 0.018);
  // a mat at the foot of the stair
  box("red", xF + 0.2, xF + 0.95, 0.012, 0.024, 0.4, 1.05);

  // ---------- meshes ----------
  const MAT = {
    wall: [c.wall, c.wallShade, 0.45, false, 3], // caps and skirting draw its edges: no seams round the window
    parapet: [c.wall, c.wallShade, 0.1, true, 3],
    wainscot: [c.wainscot, c.wainscotShade, 0.1, false, 2],
    concrete: [c.concrete, c.concreteShade, 0.4, true, 3],
    vinyl: [c.vinyl, c.vinylShade, 0.5, true, 2],
    rail: [c.rail, c.railShade, 0.35, true, 2],
    dark: [c.dark, c.dark, 0.1, false, 2],
    frame: [c.frame, c.frameShade, 0.35, true, 2],
    glass: [c.glass, c.glass, 0.1, false, 2],
    yellow: [c.yellow, c.yellow, -0.25, false, 2],
    glow: [c.glow, c.glow, -0.25, false, 2],
    red: [c.red, c.red, 0.1, true, 2],
  };
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, outline, px] = MAT[key];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    geo.computeVertexNormals();
    const mesh = kit.toon(geo, base, shade, { threshold, outline, px });
    mesh.name = key;
    body.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
