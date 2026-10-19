// dojo.js - the school kendo dojo of every sports anime, as a cutaway set piece, static, at real size.
// Contract: harness/lab/README.md. Meters, +Y up, the two open (cut) sides face +X and +Z so the lab's front-left
// cameras look in; the two built walls are the back (-Z: kamidana, scroll, weapon rack) and the window side (-X: sliding
// windows over the low armour shelf). Floor slab stands on y = 0, centred on x = z = 0.
//
// Construction (boxes, 4-sided rods, arc shells and lathes, all triangle soups merged per material signature, so the
// whole room is about a dozen meshes; boxes flat-shaded, curved parts carry radial normals).
// Every triangle is wound away from a point inside its solid (box centre, rod axis, shell axis), never by hand.
//   FLOOR     a raised slab of polished planks (lighter seams, staggered butt joints) with a dark wooden sill (kamachi)
//             round its open edges; slatted window light lies on it as striped practical patches.
//   WALLS     plaster boxes between exposed square pillars (hashira), a dark skirting board, a lintel (nageshi) at
//             2.2 m and a top beam (keta) on the wall heads. The cut ends finish on a pillar, so nothing stops in the air.
//   WINDOWS   (-X) three sliding windows, one per bay: a wood casing, two sashes on two tracks, each a glowing paper-bright
//             pane behind vertical slats (koshi): the slats are what the floor stripes are.
//   KAMIDANA  (-Z, centre, above the nageshi) a pale shelf on two brackets fixed to the wall, a small gabled shrine with
//             doors, two white sake bottles, a shimenawa rope slung between two end posts with zigzag paper shide.
//   SCROLL    (-Z, left bay) a kakejiku hung by its cord from a nail in the nageshi: dark mount, pale paper with one
//             open brush circle (an enso, no lettering) and a blank seal square, dark top and bottom rods with knobs.
//   RACK      (-Z, right bay) a floor-standing rack on a dark board fixed to the wall: two posts on feet, a foot tray
//             and a top rail holding eight upright shinai (bamboo, white leather grip, dark guard, white tip), and three
//             pale oak bokken resting on pegs across the posts above.
//   BOGU      (-X, under the windows) a low shelf on side panels, and on it up to six armour sets, each facing the room:
//             tare (waistband and three flaps with a blank name tag), do (a curved red-lacquer breastplate under a dark
//             chest band), men (padded dome, side and back flaps, a dark face void behind a curved silver grille of
//             bars) and two kote standing cuff-down either side.
// Proportions (real size, base unit the storey H = 3.2 m): interior 7.0 (x) by 6.0 (z), floor slab 0.12; pillars 0.18
//   square; nageshi 2.2; windows sill 1.4, head 2.15, 1.5 wide; shelf top 0.32, 0.62 deep; a bogu set ~0.85 tall,
//   0.45 wide on a 0.8 m pitch; shinai 1.2, bokken 1.0; kamidana board at 2.42, 1.3 wide; scroll 0.62 x 1.3.
// Options: build(THREE, kit, colors, { height = 3.2, bogu = 6 }).
//   height  scales the whole room uniformly so the wall top is `height`.
//   bogu    armour sets on the shelf, 0..6, filled from the middle of the shelf outwards (empty slots stay bare shelf).
// Budget: ~8.3k triangles at the defaults (a bogu set ~840, the room ~3.2k), 11 meshes.
// Focus markers (empty joints, nothing poses them): shelf, rack, kamidana, scroll, for the lab's --focus.
// Colours (noon, warm wood browns), base / shade:
//   plaster walls            moon #fff6e4 / sky #f2d7ae, threshold 0.1 (the +Z-facing back wall stays lit)
//   floor                    sky #f2d7ae flat (honey planks), seams skin #f0c2ae; slatted light practical #fffaf2 flat
//   structure (pillars, beams, sill, window frames and slats, skirting, scroll mount)  iris #5c3d32 / hair #241c16
//   pale wood (armour shelf, rack, kamidana, shinai bamboo, rope)  sky #f2d7ae / skin #f0c2ae
//   bogu (men, tare, kote)   iris #5c3d32 / hair #241c16, threshold 0.35; do lacquer accent #c4452d / iris
//   grille, grips, tips      sclera #f6f3ee / sky #f2d7ae; bokken iris / hair
//   paper (panes glow, scroll, shide, name tags) practical #fffaf2; strokes, rods, voids, guards hair #241c16 flat

export const meta = {
  name: "dojo",
  height: 3.2,
  script: "noon",
  colors: {
    wall: "#fff6e4", wallShade: "#f2d7ae",
    floor: "#f2d7ae", seam: "#f0c2ae", sun: "#fffaf2",
    wood: "#5c3d32", woodShade: "#241c16",
    pale: "#f2d7ae", paleShade: "#f0c2ae",
    bogu: "#5c3d32", boguShade: "#241c16",
    lacquer: "#c4452d", lacquerShade: "#5c3d32",
    metal: "#f6f3ee", metalShade: "#f2d7ae",
    paper: "#fffaf2",
    dark: "#241c16",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const NATURAL = 3.2;
  const { height = NATURAL } = opts;
  const nBogu = Math.max(0, Math.min(6, Math.floor(opts.bogu ?? 6)));
  const root = new THREE.Group();
  root.name = "dojo";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / NATURAL);
  root.add(body);
  const joints = {};

  // ---------- triangle soups with normals, through a placement matrix ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
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
  const quad = (key, a, b, e, d, ref, na, nb, ne, nd) => (tri(key, a, b, e, ref, na, nb, ne), tri(key, a, e, d, ref, na, ne, nd));
  function box(key, x0, x1, y0, y1, z0, z1) {
    const p = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    const ref = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  const cbox = (key, x, y, z, sx, sy, sz) => box(key, x - sx / 2, x + sx / 2, y - sy / 2, y + sy / 2, z - sz / 2, z + sz / 2);
  // a flat quad facing `n`, centred on a point: seams, sun patches, paper
  function plate(key, ctr, n, w, h) {
    const up = Math.abs(n[1]) > 0.5 ? [0, 0, 1] : [0, 1, 0];
    const r = nrm(cross(up, n)), u = cross(n, r);
    const P = (a, b) => add(ctr, add(mul(r, a * w / 2), mul(u, b * h / 2)));
    quad(key, P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), sub(ctr, n));
  }
  // a capped tube from a to b, radius r, `sides` sides; ends pushed out by 0.6 r so joints overlap
  function rod(key, a, b, r, sides = 4, ext = 0.6) {
    const T = nrm(sub(b, a));
    a = sub(a, mul(T, r * ext)), b = add(b, mul(T, r * ext));
    const up = Math.abs(T[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = nrm(cross(up, T)), w = cross(T, u);
    const ring = (P) => Array.from({ length: sides }, (_, j) => {
      const t = (j / sides) * Math.PI * 2 + Math.PI / sides, d = add(mul(u, Math.cos(t)), mul(w, Math.sin(t)));
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
  // a thick curved plate round a vertical axis at (cx, cz): radius r (outer), thickness t, angles a0..a1 from +Z
  // toward +X, from y0 to y1; radial normals outside, flat inside and on the edges.
  function shell(key, cx, cz, r, t, a0, a1, y0, y1, n = 6) {
    const P = (a, rr, y) => [cx + Math.sin(a) * rr, y, cz + Math.cos(a) * rr];
    const R = (a) => [Math.sin(a), 0, Math.cos(a)];
    const rm = r - t / 2;
    for (let i = 0; i < n; i++) {
      const a = a0 + ((a1 - a0) * i) / n, b = a0 + ((a1 - a0) * (i + 1)) / n, m = (a + b) / 2;
      const inside = P(m, rm, (y0 + y1) / 2);
      quad(key, P(a, r, y0), P(b, r, y0), P(b, r, y1), P(a, r, y1), [cx, (y0 + y1) / 2, cz], R(a), R(b), R(b), R(a));
      quad(key, P(a, r - t, y0), P(b, r - t, y0), P(b, r - t, y1), P(a, r - t, y1), P(m, r + 1, (y0 + y1) / 2));
      quad(key, P(a, r, y1), P(b, r, y1), P(b, r - t, y1), P(a, r - t, y1), sub(inside, [0, 1, 0]));
      quad(key, P(a, r, y0), P(b, r, y0), P(b, r - t, y0), P(a, r - t, y0), add(inside, [0, 1, 0]));
    }
    for (const [a, s] of [[a0, 1], [a1, -1]]) {
      const ref = P(a + s * 0.2, rm, (y0 + y1) / 2);
      quad(key, P(a, r, y0), P(a, r - t, y0), P(a, r - t, y1), P(a, r, y1), ref);
    }
  }
  // a solid of revolution round a vertical axis: profile [[radius, y], ...] bottom to top, closed at both ends
  function lathe(key, cx, cz, prof, n = 8, a0 = 0, a1 = Math.PI * 2) {
    const full = Math.abs(a1 - a0 - Math.PI * 2) < 1e-6;
    const P = (a, rr, y) => [cx + Math.sin(a) * rr, y, cz + Math.cos(a) * rr];
    for (let i = 0; i < n; i++) {
      const a = a0 + ((a1 - a0) * i) / n, b = a0 + ((a1 - a0) * (i + 1)) / n;
      for (let k = 0; k + 1 < prof.length; k++) {
        const [r0, y0] = prof[k], [r1, y1] = prof[k + 1];
        const sl = nrm([y1 - y0, -(r1 - r0)]); // outward normal in (radial, y)
        const N = (aa) => [Math.sin(aa) * sl[0], sl[1], Math.cos(aa) * sl[0]];
        quad(key, P(a, r0, y0), P(b, r0, y0), P(b, r1, y1), P(a, r1, y1), [cx, (y0 + y1) / 2, cz], N(a), N(b), N(b), N(a));
      }
      const [rb, yb] = prof[0], [rt, yt] = prof[prof.length - 1];
      if (rb > 1e-6) tri(key, P(a, rb, yb), P(b, rb, yb), [cx, yb, cz], [cx, yb + 1, cz]);
      if (rt > 1e-6) tri(key, P(a, rt, yt), P(b, rt, yt), [cx, yt, cz], [cx, yt - 1, cz]);
    }
    if (!full) { // close the cut faces
      const yc = (prof[0][1] + prof[prof.length - 1][1]) / 2;
      for (const [a, s] of [[a0, 1], [a1, -1]])
        for (let k = 0; k + 1 < prof.length; k++) {
          const [r0, y0] = prof[k], [r1, y1] = prof[k + 1];
          quad(key, [cx, y0, cz], P(a, r0, y0), P(a, r1, y1), [cx, y1, cz], P(a + s * 0.3, 0.05, yc));
        }
    }
  }
  const place = (x, y, z, yaw, fn) => {
    const saved = M;
    M = saved.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z)).multiply(new THREE.Matrix4().makeRotationY(yaw));
    fn();
    M = saved;
  };

  // ---------- floor ----------
  const X0 = -3.5, X1 = 3.5, Z0 = -3.0, Z1 = 3.0, F = 0.12, H = 3.2, T = 0.14, P = 0.18;
  box("floor", X0, X1, 0, F, Z0, Z1);
  box("wood", X0, X1 + 0.06, 0, F + 0.01, Z1, Z1 + 0.08); // kamachi sill on the open edges
  box("wood", X1, X1 + 0.06, 0, F + 0.01, Z0, Z1);
  // planks run along x, 0.25 wide; seams and staggered butt joints
  const fy = F + 0.0015;
  for (let i = 1; i < 24; i++) {
    const z = Z0 + i * 0.25;
    quad("seam", [X0, fy, z - 0.006], [X1, fy, z - 0.006], [X1, fy, z + 0.006], [X0, fy, z + 0.006], [0, 0, z]);
  }
  for (let i = 0; i < 24; i++) {
    const za = Z0 + i * 0.25, zb = za + 0.25;
    for (let x = X0 + 0.6 + (i % 3) * 0.6; x < X1 - 0.3; x += 1.8)
      quad("seam", [x - 0.006, fy, za], [x + 0.006, fy, za], [x + 0.006, fy, zb], [x - 0.006, fy, zb], [x, 0, za]);
  }

  // ---------- walls, pillars, beams ----------
  const NG = 2.2; // nageshi height
  // back wall (-Z) and window wall (-X), outer faces flush with the floor slab edge plus T
  box("wall", X0 - T, X1, F, H - 0.16, Z0 - T, Z0);
  const SILL = 1.4, HEAD = 2.15, BAY = [-2, 0, 2], WW = 1.5;
  box("wall", X0 - T, X0, F, SILL, Z0, Z1);
  box("wall", X0 - T, X0, HEAD, H - 0.16, Z0, Z1);
  {
    const edges = [Z0];
    for (const zc of BAY) edges.push(zc - WW / 2, zc + WW / 2);
    edges.push(Z1);
    for (let i = 0; i < edges.length; i += 2) box("wall", X0 - T, X0, SILL, HEAD, edges[i], edges[i + 1]);
  }
  // pillars (half proud of the plaster), ending the cut walls at x = X1 and z = Z1
  for (const x of [X0, -1.0, 1.0, X1 - P / 2]) box("wood", x - P / 2, x + P / 2, F, H, Z0 - T, Z0 + 0.06);
  for (const z of [-1.0, 1.0, Z1 - P / 2]) box("wood", X0 - T, X0 + 0.06, F, H, z - P / 2, z + P / 2);
  box("wood", X0 - T, X0 + 0.07, F, H, Z0 - T, Z0 + 0.07); // corner post
  // skirting, nageshi, keta (top beam over the wall heads)
  box("wood", X0, X1 - P, F, F + 0.09, Z0, Z0 + 0.025);
  box("wood", X0, X0 + 0.025, F, F + 0.09, Z0, Z1 - P);
  box("wood", X0, X1 - P / 2, NG, NG + 0.12, Z0, Z0 + 0.08);
  box("wood", X0, X0 + 0.08, NG, NG + 0.12, Z0, Z1 - P / 2);
  box("wood", X0 - T - 0.02, X1, H - 0.18, H, Z0 - T - 0.02, Z0 + 0.1);
  box("wood", X0 - T - 0.02, X0 + 0.1, H - 0.18, H, Z0, Z1);

  // ---------- windows (-X): casing, two sashes of slats over a glowing pane ----------
  const wx = X0 - T / 2;
  for (const zc of BAY) {
    const z0 = zc - WW / 2, z1 = zc + WW / 2;
    box("wood", X0 - T, X0 + 0.03, SILL - 0.05, SILL + 0.03, z0 - 0.05, z1 + 0.05); // sill
    box("wood", X0 - T, X0 + 0.02, HEAD - 0.03, HEAD + 0.04, z0 - 0.04, z1 + 0.04); // head
    box("wood", X0 - T, X0 + 0.02, SILL, HEAD, z0 - 0.04, z0 + 0.02);
    box("wood", X0 - T, X0 + 0.02, SILL, HEAD, z1 - 0.02, z1 + 0.04);
    for (const [s, dx] of [[-1, -0.025], [1, 0.025]]) {
      const sz0 = s < 0 ? z0 : zc - 0.02, sz1 = s < 0 ? zc + 0.02 : z1;
      const xa = wx + dx - 0.012, xb = wx + dx + 0.012;
      plate("glow", [xa - 0.004, (SILL + HEAD) / 2, (sz0 + sz1) / 2], [1, 0, 0], sz1 - sz0, HEAD - SILL);
      box("wood", xa, xb, SILL, SILL + 0.05, sz0, sz1);
      box("wood", xa, xb, HEAD - 0.05, HEAD, sz0, sz1);
      box("wood", xa, xb, SILL, HEAD, sz0, sz0 + 0.04);
      box("wood", xa, xb, SILL, HEAD, sz1 - 0.04, sz1);
      box("wood", xa, xb, (SILL + HEAD) / 2 - 0.015, (SILL + HEAD) / 2 + 0.015, sz0, sz1);
      for (let k = 1; k < 5; k++) { const z = sz0 + ((sz1 - sz0) * k) / 5; box("wood", xa - 0.004, xb, SILL, HEAD, z - 0.016, z + 0.016); }
    }
    // slatted light on the floor: the window cast down and in along (1, -0.9, 0.25), one stripe per gap
    const dir = [1 / 0.9, -0.12 / 0.9]; // floor offset per metre of drop
    const lo = SILL - F, hi = HEAD - F;
    for (let k = 0; k < 10; k++) {
      const za = z0 + 0.04 + (k * (WW - 0.08)) / 10 + 0.02, zb = za + (WW - 0.08) / 10 - 0.04;
      const p = (y, z) => [X0 + dir[0] * y, F + 0.003, Math.max(Z0 + 0.05, Math.min(Z1 - 0.05, z + dir[1] * y))];
      quad("sun", p(lo, za), p(lo, zb), p(hi, zb), p(hi, za), [0, 0, 0]);
    }
  }

  // ---------- armour shelf (-X) and bogu ----------
  const SH = 0.32, SD = 0.62, sx0 = X0, sx1 = X0 + SD;
  box("pale", sx0, sx1, SH - 0.04, SH, Z0 + 0.25, Z1 - 0.25); // top board
  box("pale", sx0, sx1, F + 0.06, F + 0.09, Z0 + 0.25, Z1 - 0.25); // bottom board
  for (const z of [Z0 + 0.25, -1.0, 1.0, Z1 - 0.25]) box("pale", sx0, sx1, F, SH - 0.04, z - 0.025, z + 0.025);
  box("pale", sx1 - 0.03, sx1, F, F + 0.06, Z0 + 0.25, Z1 - 0.25); // kick rail

  // one set, local: sits on y = 0 (shelf top), faces +Z, wall behind at z = -SD/2
  function boguSet() {
    // tare: waistband and three flaps, blank name tag on the middle one
    box("bogu", -0.19, 0.19, 0.17, 0.24, -0.2, 0.0);
    for (const [x, a] of [[-0.12, -0.08], [0, 0], [0.12, 0.08]]) {
      const zf = 0.02 - Math.abs(x) * 0.2;
      quad("bogu", [x - 0.06, 0.0, zf + 0.02], [x + 0.06, 0.0, zf + 0.02], [x + 0.055 + a * 0.2, 0.2, zf - 0.01], [x - 0.055 + a * 0.2, 0.2, zf - 0.01], [x, 0.1, zf - 0.2]);
      box("bogu", x - 0.06, x + 0.06, 0.0, 0.2, zf - 0.03, zf - 0.005);
    }
    plate("paper", [0, 0.1, 0.044], [0, 0, 1], 0.085, 0.13);
    // do: lacquered curved breastplate, dark chest band (mune) above
    shell("lacquer", 0, -0.27, 0.3, 0.025, -0.95, 0.95, 0.2, 0.5, 6);
    shell("bogu", 0, -0.27, 0.305, 0.03, -0.85, 0.85, 0.49, 0.62, 6);
    // men: padded dome, flaps round the sides and back, face void, grille bars
    const mz = -0.1, my = 0.6;
    shell("bogu", 0, mz, 0.16, 0.03, 1.0, Math.PI * 2 - 1.0, my - 0.06, my + 0.2, 6); // futon flaps
    lathe("bogu", 0, mz, [[0.15, my + 0.18], [0.145, my + 0.25], [0.11, my + 0.31], [0.0, my + 0.335]], 8);
    shell("dark", 0, mz, 0.125, 0.02, -1.05, 1.05, my, my + 0.2, 5); // face void
    const GR = 0.155;
    const gp = (a, y) => [Math.sin(a) * GR, y, mz + Math.cos(a) * GR];
    for (const a of [-1.05, 1.05]) rod("metal", gp(a, my - 0.01), gp(a, my + 0.21), 0.012, 4, 0);
    rod("metal", gp(0, my - 0.01), gp(0, my + 0.21), 0.009, 4, 0);
    for (let k = 0; k < 6; k++) {
      const y = my + 0.015 + k * 0.035;
      for (let s = 0; s < 3; s++) rod("metal", gp(-1.05 + (2.1 * s) / 3, y), gp(-1.05 + (2.1 * (s + 1)) / 3, y), 0.006, 4, 0.5);
    }
    lathe("bogu", 0, mz, [[0.16, my - 0.06], [0.16, my - 0.02]], 8, Math.PI - 1.0, Math.PI + 1.0); // chin rest under the void
    // kote: two padded gauntlets standing either side of the tare, cuff down, mitt up, thumb out
    for (const s of [-1, 1]) {
      const kx = s * 0.29, kz = -0.02;
      lathe("bogu", kx, kz, [[0.06, 0], [0.062, 0.05], [0.048, 0.07], [0.045, 0.17], [0.06, 0.2], [0.062, 0.27], [0.045, 0.31], [0.0, 0.32]], 7);
      rod("bogu", [kx + s * 0.035, 0.2, kz + 0.02], [kx + s * 0.07, 0.25, kz + 0.04], 0.02, 5, 0.6); // thumb
      cbox("dark", kx, 0.06, kz, 0.13, 0.012, 0.13); // the cuff's dark band
    }
  }
  const slots = [-0.4, 0.4, -1.2, 1.2, -2.0, 2.0].map((z) => z * 1.25);
  for (let i = 0; i < nBogu; i++) place((sx0 + sx1) / 2 + 0.02, SH, slots[i], Math.PI / 2, boguSet);

  // ---------- weapon rack (-Z, right bay): shinai upright, bokken on pegs ----------
  const RX = 2.25, RZ = Z0 + 0.22;
  box("wood", RX - 0.9, RX + 0.9, F + 0.14, F + 1.62, Z0, Z0 + 0.02); // dark board behind, so the pale shinai read
  for (const x of [RX - 0.8, RX + 0.8]) {
    box("pale", x - 0.03, x + 0.03, F, F + 1.55, RZ - 0.03, RZ + 0.03);
    box("pale", x - 0.04, x + 0.04, F, F + 0.04, Z0, RZ + 0.18); // foot
    box("pale", x - 0.03, x + 0.03, F + 1.45, F + 1.5, Z0, RZ); // stay into the wall
  }
  box("pale", RX - 0.83, RX + 0.83, F + 0.04, F + 0.1, RZ - 0.1, RZ + 0.1); // foot tray
  box("pale", RX - 0.83, RX + 0.83, F + 0.95, F + 1.0, RZ - 0.05, RZ + 0.05); // top rail
  for (let i = 0; i < 8; i++) {
    const x = RX - 0.7 + i * 0.2;
    const lean = (i % 2 ? 0.015 : -0.01);
    const b0 = [x, F + 0.1, RZ], b1 = [x + lean, F + 1.3, RZ + 0.02];
    const at = (t) => add(b0, mul(sub(b1, b0), t));
    rod("metal", b0, at(0.24), 0.017, 6, 0); // white leather grip
    rod("pale", at(0.24), at(0.94), 0.015, 6, 0); // bamboo
    rod("metal", at(0.94), b1, 0.016, 6, 0); // tip leather
    lathe("dark", ...[at(0.25)[0], at(0.25)[2]], [[0.035, at(0.25)[1]], [0.035, at(0.25)[1] + 0.012]], 8); // tsuba
  }
  for (let k = 0; k < 3; k++) {
    const y = F + 1.12 + k * 0.13;
    for (const x of [RX - 0.8, RX + 0.8]) box("pale", x - 0.02, x + 0.02, y - 0.04, y, RZ - 0.02, RZ + 0.1); // peg
    rod("pale", [RX - 0.95, y + 0.017, RZ + 0.05], [RX - 0.45, y + 0.017, RZ + 0.05], 0.016, 6, 0);
    rod("pale", [RX - 0.45, y + 0.017, RZ + 0.05], [RX + 0.6, y + 0.03, RZ + 0.05], 0.016, 6, 0);
    rod("pale", [RX + 0.6, y + 0.03, RZ + 0.05], [RX + 0.95, y + 0.05, RZ + 0.05], 0.013, 6, 0.3);
    cbox("dark", RX - 0.45, y + 0.017, RZ + 0.05, 0.012, 0.06, 0.06); // tsuba
  }

  // ---------- kamidana (-Z, centre, above the nageshi) ----------
  const KY = 2.48, KD = 0.36, kz0 = Z0, kz1 = Z0 + KD;
  box("pale", -0.65, 0.65, KY - 0.04, KY, kz0, kz1);
  for (const x of [-0.5, 0.5]) { // brackets on the nageshi
    box("wood", x - 0.025, x + 0.025, NG + 0.12, KY - 0.04, kz0, kz0 + 0.06);
    hex4("wood", x, NG + 0.12, KY - 0.04, kz0 + 0.06, kz1 - 0.04);
  }
  // shrine: base, body, doors, gabled roof
  box("pale", -0.2, 0.2, KY, KY + 0.04, kz0 + 0.04, kz0 + 0.3);
  box("pale", -0.15, 0.15, KY + 0.04, KY + 0.24, kz0 + 0.06, kz0 + 0.26);
  box("wood", -0.1, 0.1, KY + 0.06, KY + 0.21, kz0 + 0.26, kz0 + 0.265);
  box("pale", -0.004, 0.004, KY + 0.06, KY + 0.21, kz0 + 0.265, kz0 + 0.27);
  for (const s of [-1, 1]) {
    const a = [0, KY + 0.36, kz0 + 0.16], b = [s * 0.23, KY + 0.22, kz0 + 0.16];
    const up = [s * 0.14, 0.23, 0];
    const sd = [0, 0, 0.19];
    // roof slab: a thick board from ridge to eave
    const A0 = sub(a, sd), A1 = add(a, sd), B0 = sub(b, sd), B1 = add(b, sd);
    const t = mul(nrm(up), 0.025);
    const ref = add(mul(add(a, b), 0.5), mul(t, 0.5));
    quad("bogu", A0, B0, B1, A1, sub(ref, t));
    quad("bogu", add(A0, t), add(B0, t), add(B1, t), add(A1, t), ref);
    quad("bogu", A0, B0, add(B0, t), add(A0, t), add(ref, [0, 0, 0.1]));
    quad("bogu", A1, B1, add(B1, t), add(A1, t), sub(ref, [0, 0, 0.1]));
    quad("bogu", B0, B1, add(B1, t), add(B0, t), sub(ref, [s * 0.1, 0, 0]));
  }
  box("bogu", -0.03, 0.03, KY + 0.37, KY + 0.4, kz0 + 0.0, kz0 + 0.33); // ridge
  // gable end: fill the triangle under the roof
  tri("pale", [-0.15, KY + 0.24, kz0 + 0.26], [0.15, KY + 0.24, kz0 + 0.26], [0, KY + 0.35, kz0 + 0.26], [0, KY + 0.3, kz0 + 0.1]);
  // white sake bottles (heishi) either side
  for (const x of [-0.4, 0.4]) lathe("metal", x, kz0 + 0.2, [[0.03, KY], [0.045, KY + 0.08], [0.035, KY + 0.15], [0.014, KY + 0.19], [0.016, KY + 0.22], [0.0, KY + 0.225]], 7);
  // shimenawa: a rope slung between two end posts, paper shide hanging from it
  for (const x of [-0.62, 0.62]) box("pale", x - 0.02, x + 0.02, KY, KY + 0.42, kz1 - 0.04, kz1);
  const rope = (u) => [-0.62 + 1.24 * u, KY + 0.38 - 0.12 * Math.sin(Math.PI * u), kz1 - 0.02];
  for (let i = 0; i < 8; i++) rod("pale", rope(i / 8), rope((i + 1) / 8), 0.028, 6, 0.4);
  for (const u of [0.22, 0.5, 0.78]) {
    const p = rope(u);
    const z = p[2] + 0.031;
    for (let k = 0; k < 4; k++) { // a zigzag: each leaf overlaps the one above, the first tucked under the rope
      const y = p[1] - 0.005 - k * 0.048, dx = k % 2 ? 0.012 : -0.012;
      quad("paper", [p[0] + dx - 0.025, y, z], [p[0] + dx + 0.025, y, z], [p[0] + dx + 0.025, y - 0.06, z], [p[0] + dx - 0.025, y - 0.06, z], [p[0], y, z - 1]);
    }
  }
  // a bracket's diagonal brace, wall to shelf front
  function hex4(key, x, y0, y1, za, zb) {
    rod(key, [x, y0 + 0.02, za], [x, y1 - 0.02, zb], 0.022, 4, 0);
  }

  // ---------- scroll (-Z, left bay) ----------
  const SXc = -2.25, sTop = NG - 0.12, sBot = 0.75, sz = Z0 + 0.012;
  rod("dark", [SXc, NG + 0.03, Z0 + 0.09], [SXc, NG + 0.03, Z0 + 0.12], 0.01, 4, 0); // nail in the nageshi
  for (const s of [-1, 1]) rod("dark", [SXc, NG + 0.04, Z0 + 0.11], [SXc + s * 0.24, sTop + 0.01, sz + 0.012], 0.004, 4, 0); // cord
  box("wood", SXc - 0.31, SXc + 0.31, sBot, sTop, Z0, sz);
  quad("paper", [SXc - 0.24, sBot + 0.2, sz + 0.002], [SXc + 0.24, sBot + 0.2, sz + 0.002], [SXc + 0.24, sTop - 0.22, sz + 0.002], [SXc - 0.24, sTop - 0.22, sz + 0.002], [SXc, 1.5, Z0 - 1]);
  // three abstract strokes: tapered quads, wet start, dry finish
  const stroke = (pts, w) => {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const d = nrm([x1 - x0, y1 - y0, 0]), nx = -d[1], ny = d[0];
      const w0 = w * (1 - (0.6 * i) / pts.length), w1 = w * (1 - (0.6 * (i + 1)) / pts.length);
      quad("dark", [SXc + x0 + nx * w0, y0 + ny * w0, sz + 0.004], [SXc + x0 - nx * w0, y0 - ny * w0, sz + 0.004],
        [SXc + x1 - nx * w1, y1 - ny * w1, sz + 0.004], [SXc + x1 + nx * w1, y1 + ny * w1, sz + 0.004], [SXc, 1.5, Z0 - 1]);
    }
  };
  // an enso: one open brush circle, thick where the brush lands, dry at the tail; no lettering
  const enso = [];
  for (let i = 0; i <= 24; i++) { const a = -2.0 + (i / 24) * 5.6; enso.push([0.15 * Math.cos(a), 1.5 + 0.17 * Math.sin(a)]); }
  stroke(enso, 0.03);
  cbox("dark", SXc + 0.16, 1.16, sz + 0.004, 0.035, 0.035, 0.002); // seal, just a square
  for (const y of [sTop, sBot]) {
    rod("dark", [SXc - 0.33, y, sz + 0.01], [SXc + 0.33, y, sz + 0.01], 0.014, 6, 0);
    if (y === sBot) for (const s of [-1, 1]) rod("dark", [SXc + s * 0.33, y, sz + 0.01], [SXc + s * 0.37, y, sz + 0.01], 0.022, 6, 0);
  }

  // ---------- meshes: one per material signature ----------
  const MAT = {
    wall: [c.wall, c.wallShade, 0.1, 3],
    floor: [c.floor, c.floor, 0.1, 3],
    seam: [c.seam, c.seam, 0.1, 0],
    sun: [c.sun, c.sun, 0.1, 0],
    wood: [c.wood, c.woodShade, 0.1, 3],
    pale: [c.pale, c.paleShade, 0.1, 2],
    bogu: [c.bogu, c.boguShade, 0.35, 2],
    lacquer: [c.lacquer, c.lacquerShade, 0.2, 2],
    metal: [c.metal, c.metalShade, 0.1, 2],
    glow: [c.paper, c.paper, -0.25, 0],
    paper: [c.paper, c.paper, 0.1, 0],
    dark: [c.dark, c.dark, 0.1, 0],
  };
  const groups = new Map();
  for (const [key, soup] of Object.entries(soups)) {
    const sig = MAT[key].join("|");
    if (!groups.has(sig)) groups.set(sig, { key, m: MAT[key], p: [], n: [] });
    const g = groups.get(sig);
    for (let i = 0; i < soup.p.length; i++) g.p.push(soup.p[i]), g.n.push(soup.n[i]);
  }
  for (const { key, m, p, n } of groups.values()) {
    const [base, shade, threshold, px] = m;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    body.add(mesh);
  }

  // focus markers (no geometry, nothing poses them): the lab frames a detail with --focus <name>
  for (const [name, p] of [["shelf", [X0 + SD / 2, SH + 0.45, slots[0]]], ["rack", [RX, F + 0.8, RZ]], ["kamidana", [0, KY + 0.2, kz0 + 0.2]], ["scroll", [SXc, 1.45, Z0]]]) {
    const o = new THREE.Object3D();
    o.name = name;
    o.position.set(...p);
    body.add(o);
    joints[name] = o;
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
