// house-japanese.js - a two-storey suburban Japanese house (slice-of-life anime street), static.
// Contract: harness/lab/README.md. Meters, +Y up, the street / entrance side faces +Z, its left is +X (the garden side,
// with the engawa), stands on y = 0, centred on x = 0, z = 0.
//
// Construction (boxes and two roof solids, all triangle soups merged per material; flat-shaded, so planes read crisp):
//   BODY     a ground-floor box on a slightly wider foundation band and a smaller upper box set back to the -X / back
//            corner, so the lower roof shows on the street and garden sides. Dark wood corner posts and an eave beam.
//   ROOFS    roof(): a closed solid from an eave rectangle. Rows are the rectangle inset by v * D at y = eave + pitch *
//            v * D, so four planes meet at 45 deg hips (a hipped roof; inset = half the depth gives the ridge). The eave
//            edge lifts toward the corners (sori, k * |2u-1|^3, fading up the slope); a fascia band and a soffit close it.
//            The LOWER roof is the same solid truncated flat inside the upper box (D = the deepest inset), so it is a
//            narrow hisashi where the walls are flush and a deep skirt over the entrance and the engawa: the stepped
//            two-tier silhouette. Tile rows (kawara) are dark strips laid straight down each slope and cut at the hips, each
//            ending in a dark eave-tile square on the fascia (the row of round tile ends reads from below);
//            inked boxes ride every hip and the ridge, with raised end tiles (onigawara).
//   OPENINGS win() on any wall face: an inked wood frame, a pane 1 cm proud, wood lattice bars ~2 cm proud (flat quads).
//            Glass windows have sash bars; the street window has a koshi grille; the genkan has a two-leaf lattice
//            sliding door under a small shed canopy on brackets, with a step stone. The garden side is an engawa deck
//            on posts holding the deep eave, with six shoji panels (paper + kumiko grid) behind it.
//   Every closed part is wound from its own centre (convex) or a reference point inside it (roofs), never by hand.
// Proportions (real size, base unit the storey height S = 2.6 m): footprint 7.2 x 6.5 (walls), 9.1 x 7.7 at the lower
// eave; foundation 0-0.45; ground walls 0.45-3.1, lower eave 3.0 (pitch 0.36, 20 deg); upper box 6.0 x 4.4 at
// 3.0-5.7, main eave 5.6 (overhang 0.65, pitch 0.5, 27 deg), ridge 7.03, onigawara tops 7.32 (2.8 S); engawa 0.95 deep.
// Scaling: build(THREE, kit, colors, { height }) scales the whole house uniformly; or scale the film's placement group.
// Colours (noon, the torii's set): plaster moon #fff6e4 / sky #f2d7ae; wood (frames, posts, deck, lattice) iris
// #5c3d32 / hair #241c16; kawara iris / hair at threshold 0.25, so every slope (the far -X main slope is the dimmest,
// dot 0.37) and the street fascias stay one dark brown and only soffits and back fascias go to hair, the dark eave
// shadow; tile rows and eave-tile ends hair (no shade, they are lines); glass sky / skin #f0c2ae; shoji paper practical
// #fffaf2 / sclera #f6f3ee; foundation and step stones sky / skin. hair sits next to ink only in small parts and the
// soffit band, as on the torii: no tone on the noon script lies between iris and ink.
// Pale parts use threshold 0.1 so walls square to the camera stay lit (front dot 0.30), as the torii's vermilion does.

export const meta = {
  name: "house-japanese",
  height: 7.32,
  script: "noon",
  colors: {
    plaster: "#fff6e4", plasterShade: "#f2d7ae",
    wood: "#5c3d32", woodShade: "#241c16",
    tile: "#5c3d32", tileShade: "#241c16",
    tileLine: "#241c16",
    glass: "#f2d7ae", glassShade: "#f0c2ae",
    paper: "#fffaf2", paperShade: "#f6f3ee",
    stone: "#f2d7ae", stoneShade: "#f0c2ae",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height } = opts;
  const root = new THREE.Group();
  root.name = "house";
  const house = new THREE.Group(); // uniform size scale lives here, so root stays the plain contract node
  house.name = "body";
  house.scale.setScalar(height / meta.height);
  root.add(house);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  // one triangle wound away from `ref` (a point inside the solid); slivers dropped
  function tri(key, a, b, e, ref) {
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-7) return;
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
  function box(key, cx, cy, cz, sx, sy, sz) {
    const [x0, x1, y0, y1, z0, z1] = [cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2];
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // a beam from a to b, w wide and h tall, its height along `up` (default world up)
  function beam(key, a, b, w, h, up = [0, 1, 0]) {
    const d = sub(b, a);
    const nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
    const s = nrm(cross(d, up)), u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }

  // ---------- wall faces: local (u along the wall, y, o out of the wall) -> world ----------
  const face = (side, at) => ({
    side, at,
    p: (u, y, o) => side === "+z" ? [u, y, at + o] : side === "-z" ? [-u, y, at - o] : side === "+x" ? [at + o, y, -u] : [at - o, y, u],
    s: (w, h, d) => (side[1] === "z" ? [w, h, d] : [d, h, w]),
  });
  const wbox = (key, f, u, y, o, w, h, d) => box(key, ...f.p(u, y, o), ...f.s(w, h, d));
  // a flat quad facing out of the wall (panes and lattice bars: only their front ever shows)
  const wquad = (key, f, u, y, o, w, h) =>
    quad(key, f.p(u - w / 2, y - h / 2, o), f.p(u + w / 2, y - h / 2, o), f.p(u + w / 2, y + h / 2, o), f.p(u - w / 2, y + h / 2, o), f.p(u, y, o - 1));
  // a window or door: inked frame, pane, lattice. bars = [vertical count, horizontal count]; sash adds a meeting stile.
  function win(f, u, y0, w, h, { pane = "glass", bars = [0, 1], sash = true, bar = 0.035, sill = true } = {}) {
    const yc = y0 + h / 2;
    wbox("frame", f, u, yc, 0.03, w + 0.14, h + 0.14, 0.06);
    if (sill) wbox("frame", f, u, y0 - 0.08, 0.06, w + 0.24, 0.05, 0.12);
    wquad(pane, f, u, yc, 0.07, w, h);
    const [nv, nh] = bars;
    for (let i = 1; i <= nv; i++) wquad("lattice", f, u - w / 2 + (i * w) / (nv + 1), yc, 0.078, bar, h);
    for (let j = 1; j <= nh; j++) wquad("lattice", f, u, y0 + (j * h) / (nh + 1), 0.078, w, bar);
    if (sash) wquad("lattice", f, u, yc, 0.084, 0.06, h);
    // top and bottom rails, so the panes sit in a frame band of their own
    wquad("lattice", f, u, y0 + 0.025, 0.084, w, 0.05);
    wquad("lattice", f, u, y0 + h - 0.025, 0.084, w, 0.05);
  }

  // ---------- roof solid ----------
  // Eave rectangle [x0,x1] x [z0,z1] at y = e; D = inset of the top (half the depth -> a ridge); p = pitch; k = corner
  // lift; t = fascia depth. n segments per side, m rows up the slope. Tile rows every `gap` m, laid straight in.
  function roof(key, { x0, x1, z0, z1, e, D, p, k = 0.14, t = 0.18, n = 10, m = 4, gap = 0.36, lineKey = "tileLine" }) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const sori = (u) => k * Math.pow(Math.abs(2 * u - 1), 3);
    // the four sides as (corner A, corner B, inward normal) in plan, walked around the rectangle
    const sides = [
      [[x1, z1], [x0, z1], [0, -1]], [[x0, z1], [x0, z0], [1, 0]],
      [[x0, z0], [x1, z0], [0, 1]], [[x1, z0], [x1, z1], [-1, 0]],
    ];
    const surf = (A, B, N, a, d) => { // a along the side from A, d inward
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]), dir = [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
      const v = Math.min(1, d / D), span = Math.max(1e-6, L - 2 * v * D), u = (a - v * D) / span;
      return [A[0] + dir[0] * a + N[0] * d, e + p * d + sori(Math.min(1, Math.max(0, u))) * (1 - v) * (1 - v), A[1] + dir[1] * a + N[1] * d];
    };
    const ref = [cx, e - t + 0.02, cz];
    const low = [cx, e - t - 0.25, cz];
    const top = [cx, e + p * D, cz];
    for (const [A, B, N] of sides) {
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const row = (v) => Array.from({ length: n + 1 }, (_, i) => surf(A, B, N, v * D + (i / n) * (L - 2 * v * D), v * D));
      const rows = Array.from({ length: m + 1 }, (_, j) => row(j / m));
      for (let j = 0; j < m; j++)
        for (let i = 0; i < n; i++) quad(key, rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i], ref);
      const edge = rows[0], drop = edge.map((q) => [q[0], q[1] - t, q[2]]);
      for (let i = 0; i < n; i++) {
        quad(key, edge[i], edge[i + 1], drop[i + 1], drop[i], ref); // fascia
        tri(key, drop[i], drop[i + 1], low, ref); // soffit
        tri(key, rows[m][i], rows[m][i + 1], top, ref); // flat top (zero area at a ridge, dropped)
      }
      // kawara rows: straight in from the eave, cut at the hips
      const dir = [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
      for (let a = gap * 0.75; a < L - gap * 0.5; a += gap) {
        // round eave-tile end (nokigawara): a dark square on the fascia under each row
        const E = surf(A, B, N, a, 0), o = 0.012, h = 0.055;
        const F = (s, y) => [E[0] + dir[0] * s * h - N[0] * o, y, E[2] + dir[1] * s * h - N[1] * o];
        quad(lineKey, F(-1, E[1] - 0.03), F(1, E[1] - 0.03), F(1, E[1] - 0.03 - 2 * h), F(-1, E[1] - 0.03 - 2 * h), [E[0] + N[0], E[1], E[2] + N[1]]);
        const dMax = Math.min(a, L - a, D) - 0.04;
        if (dMax < 0.15) continue;
        const steps = Math.max(2, Math.ceil((dMax / D) * m));
        const lift = 0.02, hw = 0.028;
        for (let s = 0; s < steps; s++) {
          const d0 = (s / steps) * dMax, d1 = ((s + 1) / steps) * dMax;
          const q = [surf(A, B, N, a - hw, d0), surf(A, B, N, a + hw, d0), surf(A, B, N, a + hw, d1), surf(A, B, N, a - hw, d1)];
          for (const r of q) r[1] += lift;
          quad(lineKey, q[0], q[1], q[2], q[3], [q[0][0], q[0][1] - 1, q[0][2]]);
        }
      }
    }
    // hip and ridge caps: inked boxes 6 cm above the tiles
    const capW = 0.17, capH = 0.12;
    const xi0 = x0 + D, xi1 = x1 - D, zi0 = z0 + D, zi1 = z1 - D;
    const ytop = e + p * D;
    const lift = (q, h) => [q[0], q[1] + h, q[2]];
    for (const [xo, zo, xi, zi] of [[x0, z0, xi0, zi0], [x1, z0, xi1, zi0], [x1, z1, xi1, zi1], [x0, z1, xi0, zi1]])
      beam("ridge", lift([xo, e + k, zo], 0.04), lift([xi, ytop, zi], 0.07), capW, capH);
    return { xi0, xi1, zi0, zi1, ytop };
  }

  // ---------- body ----------
  const G = { x0: -4.0, x1: 3.2, z0: -3.5, z1: 3.0 }; // ground-floor walls
  const U = { x0: -4.0, x1: 2.0, z0: -3.5, z1: 0.9 }; // upper-floor walls
  const FY = 0.45; // foundation top
  box("stone", (G.x0 + G.x1) / 2, FY / 2, (G.z0 + G.z1) / 2, G.x1 - G.x0 + 0.1, FY, G.z1 - G.z0 + 0.1);
  box("plaster", (G.x0 + G.x1) / 2, (FY + 3.1) / 2, (G.z0 + G.z1) / 2, G.x1 - G.x0, 3.1 - FY, G.z1 - G.z0);
  box("plaster", (U.x0 + U.x1) / 2, (3.0 + 5.7) / 2, (U.z0 + U.z1) / 2, U.x1 - U.x0, 2.7, U.z1 - U.z0);
  // corner posts (hashira) on the plaster, ground and upper
  for (const [x, z] of [[G.x0, G.z1], [G.x1, G.z1], [G.x0, G.z0], [G.x1, G.z0]]) box("frame", x, (FY + 3.0) / 2, z, 0.14, 3.0 - FY, 0.14);
  for (const [x, z] of [[U.x0, U.z1], [U.x1, U.z1], [U.x1, U.z0], [U.x0, U.z0]]) box("frame", x, 4.35, z, 0.14, 2.7, 0.14);

  // ---------- roofs ----------
  roof("tile", { x0: -4.6, x1: 4.5, z0: -4.1, z1: 3.6, e: 3.0, D: 2.75, p: 0.36, k: 0.1, m: 4 });
  const mr = roof("tile", { x0: -4.65, x1: 2.65, z0: -4.15, z1: 1.55, e: 5.6, D: 2.85, p: 0.5, k: 0.16, m: 4 });
  const rz = (mr.zi0 + mr.zi1) / 2;
  beam("ridge", [mr.xi0 - 0.1, mr.ytop + 0.08, rz], [mr.xi1 + 0.1, mr.ytop + 0.08, rz], 0.26, 0.2);
  for (const x of [mr.xi0 - 0.12, mr.xi1 + 0.12]) box("ridge", x, mr.ytop + 0.14, rz, 0.16, 0.3, 0.34); // onigawara

  // ---------- street side (+Z) ----------
  const front = face("+z", G.z1), upFront = face("+z", U.z1);
  // genkan: two-leaf lattice sliding door, step stone, shed canopy on brackets
  const gx = -2.3;
  win(front, gx, 0.2, 1.6, 2.05, { bars: [5, 3], sill: false });
  box("stone", gx, 0.08, G.z1 + 0.45, 2.0, 0.16, 0.8);
  box("stone", gx, 0.33, G.z1 + 0.18, 1.8, 0.1, 0.3);
  hex("tile", [[gx - 1.15, 2.58, G.z1], [gx + 1.15, 2.58, G.z1], [gx + 1.15, 2.38, G.z1 + 1.05], [gx - 1.15, 2.38, G.z1 + 1.05],
    [gx - 1.15, 2.72, G.z1], [gx + 1.15, 2.72, G.z1], [gx + 1.15, 2.52, G.z1 + 1.05], [gx - 1.15, 2.52, G.z1 + 1.05]]);
  for (let x = gx - 1.0; x < gx + 1.1; x += 0.3) beam("tileLine", [x, 2.735, G.z1 + 0.05], [x, 2.535, G.z1 + 1.0], 0.05, 0.01);
  for (const s of [-1, 1]) beam("frame", [gx + s * 0.95, 2.05, G.z1], [gx + s * 0.95, 2.6, G.z1 + 0.8], 0.08, 0.1, [1, 0, 0]);
  // street window with a koshi grille, a small toilet window
  win(front, 0.9, 1.2, 1.8, 1.0, { bars: [10, 0], bar: 0.04, sash: false });
  win(front, 2.45, 1.75, 0.5, 0.5, { bars: [0, 1], sash: false });
  // upper street windows
  win(upFront, -2.6, 4.15, 1.7, 1.1, { bars: [1, 2] });
  win(upFront, 0.25, 4.15, 1.7, 1.1, { bars: [1, 2] });

  // ---------- garden side (+X): engawa, shoji, posts ----------
  const side = face("+x", G.x1);
  const EZ0 = -3.0, EZ1 = 2.5, EX = G.x1 + 0.95;
  box("frame", (G.x1 + EX) / 2, 0.47, (EZ0 + EZ1) / 2, EX - G.x1, 0.08, EZ1 - EZ0); // deck
  for (let z = EZ0 + 0.3; z < EZ1 - 0.1; z += 0.6) box("lattice", (G.x1 + EX) / 2, 0.512, z, EX - G.x1 - 0.06, 0.006, 0.03); // board joints
  box("stone", EX + 0.35, 0.12, -0.3, 0.6, 0.24, 1.0); // kutsunugi step stone
  for (const z of [EZ0 + 0.05, -0.3, EZ1 - 0.05]) {
    box("frame", EX - 0.08, 1.7, z, 0.14, 2.6, 0.14); // posts to the eave beam
    box("frame", EX - 0.08, 0.22, z, 0.1, 0.44, 0.1); // deck legs
  }
  box("frame", EX - 0.08, 2.92, (EZ0 + EZ1) / 2, 0.16, 0.18, EZ1 - EZ0 + 0.3); // eave beam (keta)
  const nShoji = 6, sw = (EZ1 - EZ0) / nShoji;
  for (let i = 0; i < nShoji; i++) {
    const z = EZ0 + sw * (i + 0.5);
    win(side, -z, 0.55, sw - 0.06, 1.85, { pane: "paper", bars: [2, 4], sash: false, sill: false, bar: 0.03 });
  }
  win(face("+x", U.x1), 1.3, 4.15, 1.5, 1.1, { bars: [1, 2] });

  // ---------- back (-Z) and far side (-X) ----------
  const back = face("-z", G.z0), upBack = face("-z", U.z0);
  win(back, -1.8, 1.2, 1.6, 1.1, { bars: [1, 2] });
  win(back, 1.6, 1.2, 1.0, 1.0, { bars: [0, 1] });
  win(upBack, -0.9, 4.15, 1.5, 1.1, { bars: [1, 2] });
  win(upBack, 2.3, 4.15, 1.2, 1.1, { bars: [1, 2] });
  const far = face("-x", G.x0);
  win(far, -0.5, 1.2, 1.4, 1.1, { bars: [1, 2] });
  win(face("-x", U.x0), -1.2, 4.15, 1.4, 1.1, { bars: [1, 2] });

  // ---------- meshes ----------
  const MAT = {
    plaster: [c.plaster, c.plasterShade, 0.1, true],
    stone: [c.stone, c.stoneShade, 0.1, true],
    frame: [c.wood, c.woodShade, 0.1, true],
    lattice: [c.wood, c.woodShade, 0.1, false],
    glass: [c.glass, c.glassShade, 0.1, false],
    paper: [c.paper, c.paperShade, 0.1, false],
    tile: [c.tile, c.tileShade, 0.25, true],
    tileLine: [c.tileLine, c.tileLine, 0.1, false],
    ridge: [c.tile, c.tileShade, 0.25, true],
  };
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, { threshold, outline });
    mesh.name = key;
    house.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
