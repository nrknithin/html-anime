// genkan.js - the entryway of an anime family home: the "tadaima" shot of every slice-of-life episode, static set.
// Contract: harness/lab/README.md. Meters, +Y up, a cutaway with two walls and a floor: the open sides face +X and +Z,
// so a camera in the lit front-left quadrant looks in. The front door is in the -X wall over the sunken tiled tataki
// (the front strip); the raised wooden floor fills the back; a short corridor stub leads in through the -Z wall.
// Stands on y = 0 (the tataki slab; its top is y = 0.03, the raised floor's 0.25), centred on x = 0, z = 0.
//
// Construction (boxes, lathes, superellipsoid blobs and flat decals, all triangle soups merged per material; boxes are
// flat shaded so the set reads crisp, blobs carry analytic normals; every closed part is wound away from a point
// inside it, never by hand):
//   FLOOR    the tataki: a slab of square tiles (0.3 m grid of inset grout lines) across the front; the raised floor
//            behind it, boards running into the house with seams every 0.15 m. The agarikamachi: a dark polished beam
//            along the step edge with a shadowed riser under it, so the 22 cm step reads from the front.
//   WALLS    two walls 0.1 thick (no hull of their own: whole-wall twins ink the silhouettes, so the pieces cut around
//            the openings show no seams), dark skirting boards. The -X wall holds the front door: a dark wood frame,
//            a recessed door leaf with a tall frosted glass panel (pale, reeded with thin lines) and a lever handle.
//            The -Z wall opens on the corridor stub: a framed opening, a 1 m run of floor between two walls in a
//            dimmer tone, and an end wall with a dark doorway, so the house goes on past it.
//   FURNITURE the getabako (shoe cabinet) on the raised floor against the -X wall beside the step: dark wood, two
//            doors with seams and pale knobs; on top a white vase with three red flowers and a white key tray with
//            keys. An umbrella stand on the tataki by the door with two furled umbrellas (one red, one clear vinyl
//            white), J handles. Two pairs of slippers on the raised floor, toes into the house, set out to step into.
//   SHOES    three pairs lined up on the tataki, heels to the step and toes to the door; one pair of sneakers kicked
//            off askew near the door, one shoe on its side. A shoe: a sole slab, an upper (a superellipsoid tipped
//            toe-down) and a dark oval opening.
// Proportions (real size, base unit the wall height 2.4 m = meta.height): room 2.8 wide (x) x 2.9 deep (z); tataki
//   1.5 deep at y 0.03; raised floor at 0.25; door 0.85 x 2.0; corridor opening 0.95 x 1.8, corridor 1.0 long;
//   getabako 0.38 x 1.05 x 0.95; umbrellas ~0.9; shoes 0.18-0.27 long.
// Options: build(THREE, kit, colors, { height }): height scales the whole set so the wall top is `height` (2.4).
// Colours (noon, one script): walls moon #fff6e4 / sky #f2d7ae; corridor walls sky / skin #f0c2ae (dimmer, deeper);
//   raised floor and sneaker soles sky / skin; tataki tiles skin / sky; seams and grout iris #5c3d32 (flat); dark wood
//   (beam, frames, door, getabako, skirting, loafers, handles, keys) iris / hair #241c16, the noon set's wood pair as
//   on the house; shadowed riser, shoe openings, doorway hair (flat); frosted glass practical #fffaf2 (flat) with
//   sky reed lines; white parts (vase, tray, knobs, vinyl umbrella, sneakers, guest slippers) moon / sky; red parts
//   (flowers, umbrella, slippers, kid shoes, kicked sneakers) accent #c4452d / iris.
// Meshes: 11. ~4.8k triangles.
// Joints: anchors floor, step, door, cabinet, corridor.

export const meta = {
  name: "genkan",
  height: 2.4,
  script: "noon",
  colors: {
    wall: "#fff6e4", wallShade: "#f2d7ae",
    hall: "#f2d7ae", hallShade: "#f0c2ae",
    floor: "#f2d7ae", floorShade: "#f0c2ae",
    tile: "#f0c2ae", tileShade: "#f2d7ae",
    seam: "#5c3d32",
    wood: "#5c3d32", woodShade: "#241c16",
    hole: "#241c16",
    glass: "#fffaf2", glassLine: "#f2d7ae",
    white: "#fff6e4", whiteShade: "#f2d7ae",
    red: "#c4452d", redShade: "#5c3d32",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height } = opts;
  const c = { ...meta.colors, ...colors };
  const root = new THREE.Group();
  root.name = "genkan";
  const set = new THREE.Group(); // the uniform size scale lives here
  set.name = "entry";
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
  // place(x, y, z, yaw, pitch, roll) then draw in local coordinates; place() alone resets
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
  function lathe(key, prof, cx, cz, n = 12, smooth = true) {
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
  // superellipsoid at o with radii r; e < 1 boxy, e = 1 an ellipsoid
  const spow = (w, p) => Math.sign(w) * Math.pow(Math.abs(w), p);
  function blob(key, o, r, e = 1, nu = 6, nv = 12) {
    const pt = (i, j) => {
      const th = -Math.PI / 2 + (i / nu) * Math.PI, ph = (j / nv) * Math.PI * 2;
      const [ct, st, cp, sp] = [Math.cos(th), Math.sin(th), Math.cos(ph), Math.sin(ph)];
      const p = [r[0] * spow(ct, e) * spow(cp, e), r[1] * spow(st, e), r[2] * spow(ct, e) * spow(sp, e)];
      const q = 2 - e;
      const n = [spow(ct, q) * spow(cp, q) / r[0], spow(st, q) / r[1], spow(ct, q) * spow(sp, q) / r[2]];
      return [add(o, p), nrm(Math.hypot(...n) < 1e-9 ? [0, Math.sign(st), 0] : n)];
    };
    for (let i = 0; i < nu; i++)
      for (let j = 0; j < nv; j++) {
        const [a, b, d, f] = [pt(i, j), pt(i, j + 1), pt(i + 1, j + 1), pt(i + 1, j)];
        quad(key, a[0], b[0], d[0], f[0], o, a[1], b[1], d[1], f[1]);
      }
  }
  // flat decals on a plane: W(u, v) maps plane coordinates to world, back(u, v) is a point behind the plane
  const onZ = (z) => ({ W: (u, v) => [u, v, z], back: (u, v) => [u, v, z - 1] }); // facing +Z
  const onX = (x) => ({ W: (u, v) => [x, v, u], back: (u, v) => [x - 1, v, u] }); // facing +X
  const onY = (y) => ({ W: (u, v) => [u, y, v], back: (u, v) => [u, y - 1, v] }); // facing up
  const rect = (key, F, u0, u1, v0, v1) => quad(key, F.W(u0, v0), F.W(u1, v0), F.W(u1, v1), F.W(u0, v1), F.back((u0 + u1) / 2, (v0 + v1) / 2));

  // a wall slab with a rectangular hole and no inner faces, so its hull has no seams: map(u, v, w) -> world, u along
  // the wall, v up, w across the thickness 0..1; the hole [hu0, hu1] x [hv0, hv1] may touch the bottom (a doorway)
  function holeWall(key, map, u0, u1, v0, v1, hu0, hu1, hv0, hv1) {
    const face = (a, b, e, d, ref) => quad(key, map(...a), map(...b), map(...e), map(...d), map(...ref));
    const strips = [[u0, hu0, v0, v1], [hu1, u1, v0, v1], [hu0, hu1, hv1, v1]];
    if (hv0 > v0) strips.push([hu0, hu1, v0, hv0]);
    for (const [a0, a1, b0, b1] of strips) for (const w of [0, 1]) {
      const ref = [(a0 + a1) / 2, (b0 + b1) / 2, 0.5];
      face([a0, b0, w], [a1, b0, w], [a1, b1, w], [a0, b1, w], ref);
    }
    const um = (u0 + u1) / 2, vm = (v0 + v1) / 2;
    const side = (a, b, ref) => face([...a, 0], [...b, 0], [...b, 1], [...a, 1], ref);
    side([u0, v0], [u0, v1], [u0 + 0.01, vm, 0.5]);
    side([u1, v0], [u1, v1], [u1 - 0.01, vm, 0.5]);
    side([u0, v1], [u1, v1], [um, v1 - 0.01, 0.5]);
    if (hv0 > v0) side([u0, v0], [u1, v0], [um, v0 + 0.01, 0.5]);
    else (side([u0, v0], [hu0, v0], [u0 + 0.01, v0 + 0.01, 0.5]), side([hu1, v0], [u1, v0], [u1 - 0.01, v0 + 0.01, 0.5]));
    side([hu0, hv0], [hu0, hv1], [hu0 - 0.01, (hv0 + hv1) / 2, 0.5]);
    side([hu1, hv0], [hu1, hv1], [hu1 + 0.01, (hv0 + hv1) / 2, 0.5]);
    side([hu0, hv1], [hu1, hv1], [(hu0 + hu1) / 2, hv1 + 0.01, 0.5]);
    if (hv0 > v0) side([hu0, hv0], [hu1, hv0], [(hu0 + hu1) / 2, hv0 - 0.01, 0.5]);
  }

  // ---------- dimensions ----------
  const X0 = -1.4, X1 = 1.4, Z0 = -1.0, Z1 = 1.9, T = 0.1, H = 2.4;
  const TY = 0.03, FY = 0.25, SZ = 0.4; // tataki top, raised floor top, step edge (z)
  const DOOR = { z0: 0.9, z1: 1.75, y1: 2.05 };
  const COR = { x0: -0.15, x1: 0.8, y1: 2.05, L: 1.0 };
  const GETA = { x1: X0 + 0.38, z0: -0.8, z1: 0.25, y1: FY + 0.95 };

  // ---------- floor ----------
  box("tile", X0, X1, 0, TY, SZ, Z1); // tataki slab
  for (let z = SZ + 0.3; z < Z1 - 0.05; z += 0.3) rect("seam", onY(TY + 0.002), X0, X1, z - 0.006, z + 0.006);
  for (let x = X0 + 0.3; x < X1 - 0.05; x += 0.3) rect("seam", onY(TY + 0.002), x - 0.006, x + 0.006, SZ, Z1);
  box("floor", X0, X1, 0, FY, Z0, SZ - 0.1); // raised floor
  box("floor", COR.x0, COR.x1, 0, FY, Z0 - COR.L, Z0); // corridor floor
  for (let x = X0 + 0.15; x < X1 - 0.05; x += 0.15) rect("seam", onY(FY + 0.002), x - 0.004, x + 0.004, Z0, SZ - 0.1);
  for (let x = COR.x0 + 0.16; x < COR.x1 - 0.05; x += 0.16) rect("seam", onY(FY + 0.002), x - 0.004, x + 0.004, Z0 - COR.L, Z0);
  // agarikamachi: the polished beam along the step edge, a shadowed riser under it
  box("wood", X0, X1, FY - 0.05, FY + 0.004, SZ - 0.1, SZ + 0.015);
  box("hole", X0, X1, TY, FY - 0.05, SZ - 0.12, SZ - 0.02);

  // ---------- walls (no hull; whole-wall twins carry the ink) ----------
  // -X wall with the door opening
  box("wall", X0 - T, X0, 0, H, Z0 - T, DOOR.z0);
  box("wall", X0 - T, X0, 0, H, DOOR.z1, Z1);
  box("wall", X0 - T, X0, DOOR.y1, H, DOOR.z0, DOOR.z1);
  box("wallInk", X0 - T, X0, 0, H, Z0 - T, Z1);
  // -Z wall with the corridor opening
  box("wall", X0, COR.x0 - T, 0, H, Z0 - T, Z0);
  box("wall", COR.x1 + T, X1, 0, H, Z0 - T, Z0);
  box("wall", COR.x0 - T, COR.x1 + T, COR.y1, H, Z0 - T, Z0);
  holeWall("wallInk", (u, v, w) => [u, v, Z0 - w * T], X0, X1, 0, H, COR.x0 - T, COR.x1 + T, 0, COR.y1);
  // the corridor stub: two side walls and an end wall with a dark doorway
  const ZE = Z0 - COR.L;
  box("hall", COR.x0 - T, COR.x0, 0, H, ZE, Z0 - T);
  box("hall", COR.x1, COR.x1 + T, 0, H, ZE, Z0 - T);
  box("hall", COR.x0 - T, COR.x1 + T, 0, H, ZE - T, ZE);
  box("wallInk", COR.x0 - T, COR.x0, 0, H, ZE - T, Z0 - T);
  box("wallInk", COR.x1, COR.x1 + T, 0, H, ZE - T, Z0 - T);
  box("wallInk", COR.x0 - T, COR.x1 + T, 0, H, ZE - T, ZE);
  rect("hole", onZ(ZE + 0.002), COR.x0 + 0.12, COR.x0 + 0.62, FY, 1.95);
  box("wood", COR.x0 + 0.08, COR.x0 + 0.66, 1.95, 2.0, ZE, ZE + 0.03);
  // corridor opening frame: jambs and head in dark wood
  box("wood", COR.x0 - 0.02, COR.x0 + 0.04, FY, COR.y1, Z0 - T - 0.005, Z0 + 0.015);
  box("wood", COR.x1 - 0.04, COR.x1 + 0.02, FY, COR.y1, Z0 - T - 0.005, Z0 + 0.015);
  box("wood", COR.x0 - 0.02, COR.x1 + 0.02, COR.y1 - 0.05, COR.y1 + 0.01, Z0 - T - 0.005, Z0 + 0.015);
  // skirting boards over the raised floor
  box("wood", X0, X0 + 0.012, FY, FY + 0.07, Z0, SZ - 0.1);
  box("wood", X0, COR.x0 - 0.02, FY, FY + 0.07, Z0, Z0 + 0.012);
  box("wood", COR.x1 + 0.02, X1, FY, FY + 0.07, Z0, Z0 + 0.012);
  box("wood", X0, X0 + 0.012, TY, TY + 0.06, SZ, DOOR.z0); // tataki skirting, stone-height
  box("wood", X0, X0 + 0.012, TY, TY + 0.06, DOOR.z1, Z1);

  // ---------- front door ----------
  const dz = (DOOR.z0 + DOOR.z1) / 2, FW = 0.06;
  box("wood", X0 - 0.005, X0 + 0.02, TY, DOOR.y1, DOOR.z0, DOOR.z0 + FW); // jambs
  box("wood", X0 - 0.005, X0 + 0.02, TY, DOOR.y1, DOOR.z1 - FW, DOOR.z1);
  box("wood", X0 - 0.005, X0 + 0.02, DOOR.y1 - FW, DOOR.y1 + 0.01, DOOR.z0, DOOR.z1); // head
  box("wood", X0 - 0.07, X0 - 0.03, TY, DOOR.y1 - FW, DOOR.z0 + FW, DOOR.z1 - FW); // the leaf, recessed
  box("wood", X0 - 0.03, X0 - 0.01, TY, TY + 0.025, DOOR.z0 + FW, DOOR.z1 - FW); // sill
  const LX = X0 - 0.03; // the leaf's inside face
  const G = { z0: dz - 0.06, z1: dz + 0.16, y0: 0.7, y1: 1.85 };
  rect("hole", onX(LX + 0.002), G.z0 - 0.03, G.z1 + 0.03, G.y0 - 0.03, G.y1 + 0.03); // glass bead
  rect("glass", onX(LX + 0.004), G.z0, G.z1, G.y0, G.y1);
  for (let y = G.y0 + 0.09; y < G.y1 - 0.04; y += 0.09) rect("glassLine", onX(LX + 0.006), G.z0 + 0.02, G.z1 - 0.02, y - 0.006, y + 0.006);
  // lever handle on the latch side (toward the step), a rosette and a key cylinder
  const hz = DOOR.z0 + FW + 0.09;
  box("white", LX, LX + 0.012, 0.95, 1.1, hz - 0.025, hz + 0.025);
  rod("white", [LX + 0.012, 1.06, hz], [LX + 0.06, 1.06, hz], 0.011, 6);
  rod("white", [LX + 0.06, 1.06, hz], [LX + 0.06, 1.06, hz + 0.12], 0.011, 6);
  rod("white", [LX + 0.012, 1.0, hz], [LX + 0.025, 1.0, hz], 0.012, 8);

  // ---------- getabako ----------
  box("wood", X0, GETA.x1, FY + 0.06, GETA.y1 - 0.03, GETA.z0, GETA.z1); // carcass, floating over a dark plinth
  box("hole", X0, GETA.x1 - 0.04, FY, FY + 0.06, GETA.z0 + 0.03, GETA.z1 - 0.03);
  box("wood", X0, GETA.x1 + 0.02, GETA.y1 - 0.03, GETA.y1, GETA.z0 - 0.02, GETA.z1 + 0.02); // top board
  const GF = onX(GETA.x1 + 0.002), gm = (GETA.z0 + GETA.z1) / 2;
  rect("seam", GF, gm - 0.006, gm + 0.006, FY + 0.06, GETA.y1 - 0.03); // door meeting line
  rect("seam", GF, GETA.z0, GETA.z1, GETA.y1 - 0.045, GETA.y1 - 0.033); // under the top
  for (const s of [-1, 1]) box("white", GETA.x1, GETA.x1 + 0.02, GETA.y1 - 0.2, GETA.y1 - 0.12, gm + s * 0.05 - 0.012, gm + s * 0.05 + 0.012);
  // a white vase with three red flowers
  const vx = X0 + 0.17, vz = GETA.z0 + 0.25, VY = GETA.y1;
  lathe("white", [[0, VY], [0.045, VY], [0.06, VY + 0.07], [0.05, VY + 0.15], [0.022, VY + 0.2], [0.03, VY + 0.23], [0, VY + 0.23]], vx, vz, 12);
  for (const [dx, dzz, h] of [[0.0, 0.0, 0.42], [0.06, 0.07, 0.36], [-0.03, -0.08, 0.33]]) {
    const top = [vx + dx, VY + h, vz + dzz];
    rod("seam", [vx, VY + 0.2, vz], top, 0.004, 4);
    blob("red", top, [0.03, 0.025, 0.03], 1, 4, 8);
    blob("white", add(top, [0, 0.018, 0]), [0.012, 0.008, 0.012], 1, 3, 6);
  }
  // a key tray with two keys on a ring
  const kz = GETA.z1 - 0.22;
  box("white", X0 + 0.1, X0 + 0.28, VY, VY + 0.012, kz - 0.07, kz + 0.07);
  box("white", X0 + 0.1, X0 + 0.11, VY, VY + 0.025, kz - 0.07, kz + 0.07);
  box("white", X0 + 0.27, X0 + 0.28, VY, VY + 0.025, kz - 0.07, kz + 0.07);
  box("white", X0 + 0.1, X0 + 0.28, VY, VY + 0.025, kz - 0.07, kz - 0.06);
  box("white", X0 + 0.1, X0 + 0.28, VY, VY + 0.025, kz + 0.06, kz + 0.07);
  box("wood", X0 + 0.15, X0 + 0.23, VY + 0.012, VY + 0.02, kz - 0.03, kz - 0.012);
  box("wood", X0 + 0.16, X0 + 0.2, VY + 0.012, VY + 0.02, kz + 0.0, kz + 0.035);
  blob("red", [X0 + 0.24, VY + 0.02, kz + 0.02], [0.022, 0.01, 0.016], 1, 3, 8); // a red key fob

  // ---------- umbrella stand and two furled umbrellas ----------
  const ux = X0 + 0.16, uz = SZ + 0.22;
  lathe("white", [[0, TY], [0.1, TY], [0.11, TY + 0.42], [0.1, TY + 0.42], [0.1, TY + 0.4], [0, TY + 0.4]], ux, uz, 14);
  lathe("wood", [[0.1, TY + 0.31], [0.114, TY + 0.31], [0.114, TY + 0.35], [0.1, TY + 0.35]], ux, uz, 14); // rim band
  function umbrella(key, x, z, ry, tilt) {
    place(x, TY + 0.06, z, ry, tilt, 0);
    lathe(key, [[0, 0], [0.012, 0.1], [0.042, 0.5], [0.036, 0.6], [0.028, 0.6], [0.028, 0.63], [0.01, 0.66], [0, 0.66]], 0, 0, 8, false);
    rod("wood", [0, 0.64, 0], [0, 0.82, 0], 0.007, 5);
    const pts = [[0, 0.82], [0, 0.9], [0.02, 0.94], [0.05, 0.945], [0.075, 0.92], [0.08, 0.89]];
    for (let i = 0; i + 1 < pts.length; i++) rod("wood", [pts[i][0], pts[i][1], 0], [pts[i + 1][0], pts[i + 1][1], 0], 0.013, 6);
    place();
  }
  umbrella("red", ux - 0.03, uz - 0.03, 0.6, 0.11);
  umbrella("white", ux + 0.03, uz + 0.03, -1.2, -0.13);

  // ---------- slippers on the raised floor, toes into the house (-Z) ----------
  function slipper(key, x, z, ry, mirror) {
    place(x, FY, z, ry, 0, 0);
    blob(key, [0, 0.01, 0], [0.05, 0.01, 0.13], 0.35, 4, 12);
    blob(key, [mirror * 0.004, 0.012, -0.055], [0.054, 0.034, 0.075], 0.8, 6, 12);
    blob("hole", [mirror * 0.004, 0.02, 0.03], [0.044, 0.006, 0.06], 0.6, 3, 10); // the footbed showing at the heel
    place();
  }
  slipper("red", -0.42, SZ - 0.38, 0.05, 1);
  slipper("red", -0.29, SZ - 0.38, -0.05, -1);
  slipper("white", 0.12, SZ - 0.36, 0.08, 1);
  slipper("white", 0.25, SZ - 0.35, -0.02, -1);

  // ---------- shoes on the tataki ----------
  // origin at the sole centre on the ground; toes toward local +Z
  function shoe(key, soleKey, x, z, ry, { L = 0.26, W = 0.095, h = 0.07, roll = 0, lift = 0 } = {}) {
    place(x, TY + lift, z, ry, 0, roll);
    blob(soleKey, [0, 0.012, 0], [W / 2 + 0.004, 0.012, L / 2 + 0.004], 0.3, 4, 12);
    place(x, TY + lift + 0.012, z, ry, 0.08, roll); // the upper tipped toe-down, lifted so the toe stays above the tiles
    blob(key, [0, 0.022, 0.0], [W / 2, h * 0.75, L / 2], 0.75, 6, 12);
    blob("hole", [0, 0.022 + h * 0.72, -L * 0.18], [W * 0.34, 0.012, L * 0.2], 0.8, 3, 10);
    place();
  }
  const row = SZ + 0.2;
  // dad's loafers, mum's flats, the kid's red shoes: neatly turned, toes to the door
  shoe("wood", "wood", -0.55, row, 0.0, { L: 0.28, W: 0.1, h: 0.06 });
  shoe("wood", "wood", -0.42, row, 0.0, { L: 0.28, W: 0.1, h: 0.06 });
  shoe("white", "floor", -0.12, row - 0.01, 0.0, { L: 0.24, W: 0.085, h: 0.05 });
  shoe("white", "floor", -0.01, row - 0.01, 0.0, { L: 0.24, W: 0.085, h: 0.05 });
  shoe("red", "white", 0.25, row - 0.03, 0.0, { L: 0.18, W: 0.07, h: 0.055 });
  shoe("red", "white", 0.34, row - 0.03, 0.0, { L: 0.18, W: 0.07, h: 0.055 });
  // the teenager's sneakers, kicked off askew: one turned, one on its side
  shoe("white", "red", -0.55, 1.3, 2.3, { L: 0.27, W: 0.1, h: 0.08 });
  shoe("white", "red", -0.2, 1.05, -0.7, { L: 0.27, W: 0.1, h: 0.08, roll: 1.45, lift: 0.052 });

  // ---------- meshes ----------
  const MAT = { // [base, shade, threshold, ink px (0 = no hull)]
    wall: [c.wall, c.wallShade, 0.1, 0], // inked through the wallInk twins
    hall: [c.hall, c.hallShade, 0.5, 0],
    floor: [c.floor, c.floorShade, 0.1, 2],
    tile: [c.tile, c.tileShade, 0.1, 2],
    seam: [c.seam, c.seam, 0.1, 0],
    wood: [c.wood, c.woodShade, 0.1, 1.8],
    hole: [c.hole, c.hole, 0.1, 0],
    glass: [c.glass, c.glass, -1, 0],
    glassLine: [c.glassLine, c.glassLine, -1, 0],
    white: [c.white, c.whiteShade, 0.15, 1.6],
    red: [c.red, c.redShade, 0.1, 1.6],
  };
  const geo = (s) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    return g;
  };
  for (const [key, s] of Object.entries(soups)) {
    if (key === "wallInk") continue;
    const [base, shade, threshold, px] = MAT[key];
    const mesh = kit.toon(geo(s), base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    if (key === "wall") // ink the whole-wall twins and keep only their hulls
      for (const h of kit.outline(new THREE.Mesh(geo(soups.wallInk), mesh.material), { px: 2.5 }).children.slice()) mesh.add(h);
    set.add(mesh);
  }
  const anchor = (name, x, y, z) => { const a = new THREE.Group(); a.name = name; a.position.set(x, y, z); set.add(a); joints[name] = a; };
  anchor("floor", 0, FY, (Z0 + SZ) / 2);
  anchor("step", 0, FY, SZ);
  anchor("door", LX, 1.0, dz);
  anchor("cabinet", (X0 + GETA.x1) / 2, GETA.y1, gm);
  anchor("corridor", (COR.x0 + COR.x1) / 2, FY, ZE);

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
