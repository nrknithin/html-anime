// chaya.js - a traditional roadside teahouse front (chaya), the anime travel-episode rest stop. Static.
// Contract: harness/lab/README.md. Meters, +Y up, the road side (benches, parasol, lantern) faces +Z, its left is +X
// (the grill and lantern corner), stands on y = 0, centred on x = 0, z = 0.
//
// Construction (three.js primitives placed by matrix and merged into one triangle soup per material, so the whole set
// is a handful of meshes; boxes stay flat-shaded, lathes and tubes keep their smooth normals):
//   BUILDING a one-storey plaster box on a low stone plinth under a gable roof (ridge along X): two tiled slabs with
//            dark tile rows and a ridge cap, the front eave deep over the shopfront. The front is open: four posts and a
//            lintel, dark interior behind (a hair backdrop, so the opening reads as a hole), low plank walls with a
//            counter ledge in the side bays, a short white split noren (three plain panels, no lettering) in the
//            middle bay. Plaster gable triangles close the ends.
//   GRILL    under the eave at the +X bay: a dark iron brazier on wooden legs, glowing coals (accent) and five dango
//            skewers laid across it.
//   SEATING  two benches with red mosen felt (a thin top sheet and drapes front and back) under a big red nodate-gasa:
//            a closed lathe shell (outer cone over an inner cone 3 cm below), dark ribs on its underside, a hub and a
//            finial on a pole, tilted a little toward the road.
//   TEA      on the front bench: a wooden tray with two cups and a plate of three skewers of three-colour dango.
//   OUTSIDE  a square wooden lantern stand (paper box, wood frame, small hip cap, cross feet) at the +X front corner,
//            and a pale gravel patch with dark pebble specks (a hashed grid, no Math.random).
//   STEAM    (option) two pale wisps (tapering tubes along a curve) rising out of the cups, no ink.
// Proportions (real size, base unit the storey height S = 2.45 m, the lintel top): building 4.84 x 1.8 (walls) at
// z -2.7..-0.9; plinth 0-0.15; front eave at z 0.15, y 2.5; ridge 3.47 at z -1.8, ridge cap top 3.72 = height;
// benches 1.8 x 0.5 x 0.45; parasol 2.5 across, canopy rim ~2.2, finial 2.75; lantern stand 1.45; grill top 0.93;
// gravel to z 3.0. Dango balls 3.4 cm (slightly fat so they survive a medium shot).
// Options: build(THREE, kit, colors, { height, steam })
//   height  scales the whole set uniformly so the ridge cap top is `height` (default meta.height).
//   steam   true (default) adds the cup wisps; false leaves the cups bare.
// Colours (noon, the torii and house set): wood iris #5c3d32 / hair #241c16; roof iris / hair at threshold 0.25 so all
// slopes stay one brown; dark (tile rows, interior, ribs, pebbles, iron) hair, flat; plaster and ceramics moon
// #fff6e4 / sky #f2d7ae; felt, parasol and coals accent #c4452d / iris; noren, lantern paper and white dango practical
// #fffaf2 / sclera #f6f3ee; stone (plinth, gravel, plate) sky / skin #f0c2ae; pink dango skin / sky; the third dango
// colour is iris (noon has no green: read as pink / white / brown, see the PR); steam sclera / moon, no hull.
// Pale parts use threshold 0.1 so faces square to the camera stay lit.

export const meta = {
  name: "chaya",
  height: 3.72,
  script: "noon",
  colors: {
    wood: "#5c3d32", woodShade: "#241c16",
    roof: "#5c3d32", roofShade: "#241c16",
    dark: "#241c16",
    plaster: "#fff6e4", plasterShade: "#f2d7ae",
    felt: "#c4452d", feltShade: "#5c3d32",
    paper: "#fffaf2", paperShade: "#f6f3ee",
    stone: "#f2d7ae", stoneShade: "#f0c2ae",
    pink: "#f0c2ae", pinkShade: "#f2d7ae",
    steam: "#f6f3ee", steamShade: "#fff6e4",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const { height = meta.height, steam = true } = opts;
  const root = new THREE.Group();
  root.name = "chaya";
  const set = new THREE.Group(); // the uniform size scale lives here
  set.name = "body";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = {};
  const D = Math.PI / 180;

  // ---------- soups: primitives placed by a matrix, merged per material ----------
  const soups = {};
  const M4 = () => new THREE.Matrix4();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  function put(key, geo, m) {
    const g = (geo.index ? geo.toNonIndexed() : geo).applyMatrix4(m);
    if (!g.attributes.normal) g.computeVertexNormals();
    const s = (soups[key] ??= { p: [], n: [] });
    s.p.push(...g.attributes.position.array);
    s.n.push(...g.attributes.normal.array);
    geo.dispose();
  }
  const at = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
    M4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(sx, sy, sz));
  const box = (key, x0, x1, y0, y1, z0, z1) =>
    put(key, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), at((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
  // a round rod of radius r from a to b
  function rod(key, a, b, r, seg = 6) {
    const A = V(...a), B = V(...b);
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), B.clone().sub(A).normalize());
    put(key, new THREE.CylinderGeometry(r, r, A.distanceTo(B), seg), M4().compose(A.add(B).multiplyScalar(0.5), q, V(1, 1, 1)));
  }
  // a convex hexahedron from 8 corners (p[0..3] one face, p[4..7] the opposite face in the same order), wound outward
  function hex(key, p) {
    const pos = [];
    const ref = V(0, 0, 0);
    for (const q of p) ref.add(V(...q));
    ref.multiplyScalar(1 / 8);
    const tri = (a, b, e) => {
      const A = V(...a), B = V(...b), E = V(...e);
      const n = B.clone().sub(A).cross(E.clone().sub(A));
      const m = A.clone().add(B).add(E).multiplyScalar(1 / 3);
      pos.push(...a, ...(n.dot(m.sub(ref)) < 0 ? [...e, ...b] : [...b, ...e]));
    };
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]) {
      tri(p[f[0]], p[f[1]], p[f[2]]);
      tri(p[f[0]], p[f[2]], p[f[3]]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    put(key, g, M4());
  }
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  // ---------- building ----------
  const BX = 2.3, FZ = -0.9, BZ = -2.7, WY = 2.45; // walls x +-BX, front line FZ, back BZ, lintel top WY
  box("stone", -BX - 0.1, BX + 0.1, 0, 0.15, BZ - 0.1, FZ + 0.12); // plinth
  const WALLTOP = 3.02; // the slope's height over the wall lines (front and back), see the roof
  box("plaster", -BX, BX, 0.15, WALLTOP, BZ, BZ + 0.08); // back wall, up under the roof
  box("plaster", -BX, BX, WY + 0.12, WALLTOP, FZ - 0.08, FZ - 0.02); // front wall above the head beam
  // side walls, 20 cm thick and 12 cm proud of the post line so the posts' hulls stay inside them
  for (const s of [-1, 1]) box("plaster", s * (BX + 0.02) - 0.1, s * (BX + 0.02) + 0.1, 0.15, WY, BZ, FZ);
  box("dark", -BX + 0.1, BX - 0.1, 0.15, WY - 0.05, BZ + 0.08, BZ + 0.1); // interior shadow backdrop
  for (const s of [-1, 1]) box("dark", s * (BX - 0.15) - 0.01, s * (BX - 0.15) + 0.01, 0.4, WY - 0.05, BZ + 0.1, FZ - 0.08); // and on the side walls
  box("wood", -BX + 0.08, BX - 0.08, 0.15, 0.4, BZ + 0.1, FZ - 0.05); // raised floor (doma edge)
  box("dark", -BX + 0.08, BX - 0.08, 0.4, 0.41, BZ + 0.1, FZ - 0.3); // floor in shadow, the front strip stays wood
  // front frame: posts, lintel, a head beam under the eave
  for (const x of [-BX + 0.07, -0.75, 0.75, BX - 0.07]) box("wood", x - 0.07, x + 0.07, 0.15, WY, FZ - 0.07, FZ + 0.07);
  box("wood", -BX - 0.1, BX + 0.1, WY - 0.22, WY, FZ - 0.08, FZ + 0.08);
  box("wood", -BX - 0.12, BX + 0.12, WY, WY + 0.12, FZ - 0.1, FZ + 0.1);
  // side bays: low plank walls with a counter ledge, plank joints dark
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -BX + 0.07 : 0.75 + 0.07, x1 = s < 0 ? -0.75 - 0.07 : BX - 0.07;
    box("wood", x0, x1, 0.15, 0.8, FZ - 0.04, FZ + 0.03);
    box("wood", x0 - 0.04, x1 + 0.04, 0.8, 0.85, FZ - 0.2, FZ + 0.12);
    for (let x = x0 + 0.25; x < x1 - 0.1; x += 0.25) box("dark", x - 0.008, x + 0.008, 0.2, 0.78, FZ + 0.03, FZ + 0.036);
  }
  // middle bay: a step stone
  box("stone", -0.5, 0.5, 0.15, 0.25, FZ + 0.05, FZ + 0.45);

  // ---------- roof (gable, ridge along X) ----------
  const RX = BX + 0.45, RZ = (BZ + FZ) / 2, RY = 3.47, EZf = 0.15, EZb = BZ - 1.05 + 0.0, EY = 2.5, T = 0.12;
  // slope y(z) on each side, so the eaves both sit at EY
  for (const [ez] of [[EZf], [EZb]]) {
    const P = (x, z, dy) => [x, dy + (z === ez ? EY : RY), z];
    hex("roof", [P(-RX, ez, 0), P(RX, ez, 0), P(RX, RZ, 0), P(-RX, RZ, 0), P(-RX, ez, T), P(RX, ez, T), P(RX, RZ, T), P(-RX, RZ, T)]);
    // tile rows: dark ribs straight down the slope, ending in an eave-tile square
    const n = 22;
    for (let i = 0; i <= n; i++) {
      const x = -RX + 0.08 + (i * (2 * RX - 0.16)) / n;
      const a = [x, EY + T + 0.012, ez], b = [x, RY + T + 0.012, RZ];
      const w = 0.035, h = 0.035;
      hex("dark", [[a[0] - w, a[1] - h, a[2]], [a[0] + w, a[1] - h, a[2]], [b[0] + w, b[1] - h, b[2]], [b[0] - w, b[1] - h, b[2]],
        [a[0] - w, a[1] + h, a[2]], [a[0] + w, a[1] + h, a[2]], [b[0] + w, b[1] + h, b[2]], [b[0] - w, b[1] + h, b[2]]]);
    }
    // fascia
    box("wood", -RX - 0.02, RX + 0.02, EY - 0.08, EY + T + 0.01, ez - (ez > RZ ? -0.02 : 0.02) - 0.03, ez - (ez > RZ ? -0.02 : 0.02) + 0.03);
  }
  box("roof", -RX - 0.05, RX + 0.05, RY + T - 0.02, RY + 0.25, RZ - 0.14, RZ + 0.14); // ridge cap
  for (const s of [-1, 1]) box("roof", s * RX - 0.12, s * RX + 0.12, RY + 0.1, 3.6, RZ - 0.17, RZ + 0.17); // end tiles
  // gable triangles above the side walls
  const slopeY = (z) => (z > RZ ? EY + ((RY - EY) * (EZf - z)) / (EZf - RZ) : EY + ((RY - EY) * (z - EZb)) / (RZ - EZb));
  for (const s of [-1, 1]) {
    const x0 = s * (BX + 0.02) - 0.1, x1 = s * (BX + 0.02) + 0.1;
    const yf = slopeY(FZ), yb = slopeY(BZ);
    hex("plaster", [[x0, WY, FZ], [x1, WY, FZ], [x1, WY, BZ], [x0, WY, BZ], [x0, yf, FZ], [x1, yf, FZ], [x1, yb, BZ], [x0, yb, BZ]]);
    hex("plaster", [[x0, yf - 0.01, FZ], [x1, yf - 0.01, FZ], [x1, yb - 0.01, BZ], [x0, yb - 0.01, BZ], [x0, RY, RZ + 0.01], [x1, RY, RZ + 0.01], [x1, RY, RZ - 0.01], [x0, RY, RZ - 0.01]]);
    box("wood", x0 - 0.01, x1 + 0.01, WY - 0.06, WY + 0.06, BZ, FZ); // tie beam across the gable
  }

  // ---------- noren (middle bay) ----------
  rod("wood", [-0.75, 2.17, FZ + 0.12], [0.75, 2.17, FZ + 0.12], 0.018);
  for (let i = 0; i < 3; i++) {
    const w = 1.36 / 3, x = -0.68 + w * (i + 0.5);
    box("paper", x - w / 2 + 0.012, x + w / 2 - 0.012, 1.62, 2.19, FZ + 0.1, FZ + 0.115);
  }

  // ---------- grill (+X bay, under the eave) ----------
  const GX = 1.55, GZ = -0.45, GY = 0.78;
  for (const [dx, dz] of [[-0.3, -0.12], [0.3, -0.12], [-0.3, 0.12], [0.3, 0.12]]) box("wood", GX + dx - 0.025, GX + dx + 0.025, 0, GY, GZ + dz - 0.025, GZ + dz + 0.025);
  box("wood", GX - 0.33, GX + 0.33, 0.25, 0.29, GZ - 0.15, GZ + 0.15); // low shelf
  box("dark", GX - 0.38, GX + 0.38, GY, GY + 0.16, GZ - 0.17, GZ + 0.17); // iron brazier
  box("felt", GX - 0.34, GX + 0.34, GY + 0.16, GY + 0.175, GZ - 0.13, GZ + 0.13); // glowing coals
  const balls = (x0, y, z0, dir, r) => { // three dango along dir from (x0, y, z0): pink, white, brown
    const keys = ["pink", "paper", "wood"];
    for (let k = 0; k < 3; k++) {
      const t = 0.05 + k * 2.05 * r;
      put(keys[k], new THREE.SphereGeometry(r, 8, 6), at(x0 + dir[0] * t, y, z0 + dir[2] * t));
    }
  };
  for (let i = 0; i < 5; i++) {
    const x = GX - 0.26 + i * 0.13, y = GY + 0.2, z0 = GZ - 0.2;
    rod("stone", [x, y, z0 - 0.06], [x, y, z0 + 0.36], 0.005, 4);
    balls(x, y, z0 + 0.04, [0, 0, 1], 0.03);
  }

  // ---------- benches with mosen ----------
  const bench = (cx, cz, ry) => {
    const L = 1.8, W = 0.5, H = 0.45;
    const g = new THREE.Group();
    const loc = (x, y, z) => V(x, y, z).applyAxisAngle(V(0, 1, 0), ry).add(V(cx, 0, cz));
    const lbox = (key, x0, x1, y0, y1, z0, z1) => {
      const p = loc((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      put(key, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), at(p.x, p.y, p.z, 0, ry));
    };
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) lbox("wood", sx * (L / 2 - 0.12) - 0.035, sx * (L / 2 - 0.12) + 0.035, 0, H - 0.05, sz * (W / 2 - 0.07) - 0.035, sz * (W / 2 - 0.07) + 0.035);
      lbox("wood", sx * (L / 2 - 0.12) - 0.03, sx * (L / 2 - 0.12) + 0.03, 0.12, 0.17, -W / 2 + 0.05, W / 2 - 0.05); // stretcher
    }
    lbox("wood", -L / 2, L / 2, H - 0.05, H, -W / 2, W / 2); // seat
    lbox("felt", -L / 2 + 0.06, L / 2 - 0.06, H, H + 0.015, -W / 2 - 0.02, W / 2 + 0.02); // mosen sheet
    for (const sz of [-1, 1]) lbox("felt", -L / 2 + 0.06, L / 2 - 0.06, H - 0.16, H + 0.015, sz * (W / 2 + 0.005), sz * (W / 2 + 0.02));
    return { loc, H };
  };
  const B1 = bench(-1.05, 0.95, 0);
  bench(-2.15, 2.0, 70 * D);

  // ---------- tea tray on the front bench ----------
  const TY = B1.H + 0.015;
  const TX = -0.55, TZ = 0.95;
  box("wood", TX - 0.2, TX + 0.2, TY, TY + 0.025, TZ - 0.14, TZ + 0.14);
  box("wood", TX - 0.2, TX + 0.2, TY + 0.025, TY + 0.04, TZ - 0.14, TZ - 0.125);
  box("wood", TX - 0.2, TX + 0.2, TY + 0.025, TY + 0.04, TZ + 0.125, TZ + 0.14);
  const cups = [[TX - 0.11, TZ - 0.04], [TX - 0.01, TZ + 0.06]];
  for (const [x, z] of cups) put("plaster", new THREE.CylinderGeometry(0.042, 0.032, 0.075, 10), at(x, TY + 0.025 + 0.0375, z));
  for (const [x, z] of cups) put("wood", new THREE.CylinderGeometry(0.037, 0.037, 0.004, 10), at(x, TY + 0.025 + 0.074, z)); // tea surface
  // plate with three skewers
  const PX = TX + 0.11, PZ = TZ - 0.01, PY = TY + 0.025;
  put("stone", new THREE.CylinderGeometry(0.11, 0.08, 0.02, 14), at(PX, PY + 0.01, PZ));
  for (let i = 0; i < 3; i++) {
    const z = PZ - 0.06 + i * 0.06, y = PY + 0.02 + 0.03, x0 = PX - 0.13;
    rod("stone", [x0 - 0.02, y, z], [x0 + 0.27, y, z], 0.005, 4);
    balls(x0 + 0.04, y, z, [1, 0, 0], 0.033);
  }

  // ---------- parasol (nodate-gasa) ----------
  const PoX = -1.0, PoZ = 1.5, tilt = -8 * D; // tilts its top toward -Z, so the canopy leans over the bench
  const para = (x, y, z) => V(x, y, z).applyAxisAngle(V(1, 0, 0), tilt).add(V(PoX, 0, PoZ));
  {
    const R = 1.25, top = 2.7, rim = 2.25, gap = 0.03;
    const prof = [V(0.0, top + 0.02, 0), V(R * 0.5, (top + rim) / 2 + 0.06, 0), V(R, rim, 0), V(R - 0.01, rim - gap, 0),
      V(R * 0.5, (top + rim) / 2 + 0.06 - gap, 0), V(0.0, top - gap + 0.02, 0)].reverse().map((p) => new THREE.Vector2(p.x, p.y));
    const g = new THREE.LatheGeometry(prof, 24);
    const q = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), tilt);
    put("canopy", g, M4().compose(V(PoX, 0, PoZ), q, V(1, 1, 1)));
    const a0 = para(0, 0.02, 0), a1 = para(0, top + 0.07, 0);
    rod("wood", a0.toArray(), a1.toArray(), 0.025, 6);
    put("wood", new THREE.SphereGeometry(0.045, 8, 6), at(...para(0, top + 0.08, 0).toArray()));
    const hub = para(0, 1.95, 0);
    put("dark", new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8), M4().compose(hub, q, V(1, 1, 1)));
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const rimP = para(Math.cos(a) * (R - 0.04), rim - gap - 0.012, Math.sin(a) * (R - 0.04));
      const midP = para(Math.cos(a) * R * 0.45, (top + rim) / 2 + 0.06 - gap - 0.01 + 0.03, Math.sin(a) * R * 0.45);
      rod("dark", midP.toArray(), rimP.toArray(), 0.008, 4);
      rod("dark", hub.toArray(), midP.toArray(), 0.007, 4);
    }
  }

  // ---------- lantern stand ----------
  const LX = 2.62, LZ = 0.05;
  box("wood", LX - 0.045, LX + 0.045, 0.02, 1.0, LZ - 0.045, LZ + 0.045);
  box("wood", LX - 0.3, LX + 0.3, 0.02, 0.09, LZ - 0.05, LZ + 0.05);
  box("wood", LX - 0.05, LX + 0.05, 0.02, 0.09, LZ - 0.3, LZ + 0.3);
  box("wood", LX - 0.2, LX + 0.2, 0.98, 1.02, LZ - 0.2, LZ + 0.2); // tray under the box
  box("paper", LX - 0.16, LX + 0.16, 1.02, 1.36, LZ - 0.16, LZ + 0.16); // paper box
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box("wood", LX + sx * 0.17 - 0.02, LX + sx * 0.17 + 0.02, 1.02, 1.38, LZ + sz * 0.17 - 0.02, LZ + sz * 0.17 + 0.02);
  for (const y of [1.19]) for (const s of [-1, 1]) {
    box("wood", LX - 0.17, LX + 0.17, y - 0.012, y + 0.012, LZ + s * 0.165 - 0.006, LZ + s * 0.165 + 0.006);
    box("wood", LX + s * 0.165 - 0.006, LX + s * 0.165 + 0.006, y - 0.012, y + 0.012, LZ - 0.17, LZ + 0.17);
  }
  put("roof", new THREE.ConeGeometry(0.3, 0.12, 4), at(LX, 1.44, LZ, 0, 45 * D));
  put("roof", new THREE.SphereGeometry(0.03, 6, 4), at(LX, 1.5, LZ));

  // ---------- gravel ----------
  box("stone", -2.9, 2.9, 0, 0.03, FZ + 0.12, 3.0);
  for (let i = 0; i < 90; i++) {
    const x = -2.8 + hash(i) * 5.6, z = FZ + 0.25 + hash(i + 500) * 2.65;
    const r = 0.02 + hash(i + 900) * 0.025;
    put("dark", new THREE.OctahedronGeometry(r, 0), at(x, 0.03, z, 0, hash(i + 77) * 3, 0, 1, 0.35, 1));
  }

  // ---------- steam ----------
  if (steam) {
    for (const [k, [x, z]] of cups.entries()) {
      const y0 = TY + 0.025 + 0.08;
      const pts = [];
      for (let i = 0; i <= 5; i++) {
        const u = i / 5;
        pts.push(V(x + Math.sin(u * 5 + k * 2) * 0.03, y0 + u * 0.32, z + Math.cos(u * 4 + k) * 0.015));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const g = new THREE.TubeGeometry(curve, 16, 1, 5, false);
      const pos = g.attributes.position, pt = V(0, 0, 0);
      for (let i = 0; i <= 16; i++) {
        const u = i / 16, r = 0.016 * Math.sin(Math.PI * Math.min(1, u * 1.1 + 0.05)) + 0.002;
        curve.getPointAt(u, pt);
        for (let j = 0; j <= 5; j++) {
          const m = i * 6 + j;
          pos.setXYZ(m, pt.x + (pos.getX(m) - pt.x) * r, pt.y + (pos.getY(m) - pt.y) * r, pt.z + (pos.getZ(m) - pt.z) * r);
        }
      }
      g.computeVertexNormals();
      put("steam", g, M4());
    }
  }

  // ---------- meshes ----------
  const MAT = {
    wood: [c.wood, c.woodShade, 0.1, true],
    roof: [c.roof, c.roofShade, 0.25, true],
    dark: [c.dark, c.dark, 0.1, false],
    plaster: [c.plaster, c.plasterShade, 0.1, true],
    felt: [c.felt, c.feltShade, 0.1, true],
    canopy: [c.felt, c.feltShade, -0.6, true], // the underside stays red; only faces turned square away go iris
    paper: [c.paper, c.paperShade, 0.1, true],
    stone: [c.stone, c.stoneShade, 0.1, true],
    pink: [c.pink, c.pinkShade, 0.1, true],
    steam: [c.steam, c.steamShade, -0.25, false],
  };
  for (const [key, s] of Object.entries(soups)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    const mesh = kit.toon(g, base, shade, { threshold, outline });
    mesh.name = key;
    set.add(mesh);
  }

  // marker joints (no geometry under them) for close-ups: --focus tray | grill | parasol | lantern
  for (const [name, x, y, z] of [["tray", TX, TY, TZ], ["grill", GX, GY + 0.16, GZ], ["parasol", PoX, 2.4, PoZ], ["lantern", LX, 1.2, LZ]]) {
    const j = new THREE.Group();
    j.name = name;
    j.position.set(x, y, z);
    set.add(j);
    joints[name] = j;
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`chaya: unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
