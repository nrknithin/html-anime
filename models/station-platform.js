// station-platform.js - a small rural Japanese train station platform at dusk (slice-of-life anime set piece), static.
// Contract: harness/lab/README.md. Meters, +Y up, the track side faces +Z, its left is +X (the steps end), stands on
// y = 0, centred on x = 0, z = 0 (the content is re-centred on its own bbox, so every option stays centred).
//
// Construction (boxes, prisms and one extruded stair, all triangle soups merged per material; flat-shaded, so planes
// read crisp and the mesh count stays at one per material):
//   SLAB     the platform: a concrete box whose track face is set 0.12 m back under an overhanging coping slab, so the
//            coping's underside draws one dark line along the edge. The coping is a pale band; the yellow tactile line
//            (tenji block) runs 0.8 m in from the edge, 1 cm proud.
//   STEPS    an extruded staircase profile off the +X end over the back half of the width; faces are split by normal
//            so treads and risers take different tones and the steps read as steps, not a ramp. A steel handrail on the
//            open side.
//   SHELTER  a steel frame (square 0.22 m columns in a row near the back, cantilever rafters rising toward the track with a
//            diagonal brace each) under a red mono-pitch roof sheet with a fascia; two glowing fittings under the roof;
//            two slatted benches between the columns. A station name board hangs on two rods from the front beam, face
//            to the track: a white panel in a navy frame with a split navy band (blank: no lettering).
//   LAMPS    square steel poles near the fence with an arm toward the track and a glowing box fitting.
//   FENCE    a low wooden fence on the back edge: posts every ~2 m and three planks with gaps 
//            (pickets turned to ink noise at hero size).
//   TRACK    a ballast prism, wood sleepers every 0.6 m, two rails at 1.067 m gauge (narrow gauge), past both ends.
//   Every closed part is wound from its own centre (convex parts) or by ExtrudeGeometry (the stair), never by hand.
// Proportions (real size, base unit the platform height H = 1.1 m): platform 20 x 4 (18 H x 3.6 H), coping 0.3 wide;
// tactile line 0.3 wide at 0.8-1.1 from the edge; track centre 1.5 m out from the edge, rail tops at 0.34; shelter
// 7.5 m long on 4 columns (2.5 m bays), roof sheet 8.2 x 2.6, 0.16 thick (thinner leaked hull specks), underside
// 2.72 above the deck at the back rising to 3.0 at the track side; length clamps to >= 12 m so the shelter fits;
// name board 1.7 x 0.55, bottom 2.15 above the deck; lamps 3.6 above the deck; fence 1.0; 6 steps of 0.183 x 0.3.
// Options: build(THREE, kit, colors, { height, length, track }): height scales everything uniformly (meta.height = the
// lamp tops); length (m) sets the platform length (fence, track and lamps follow; the shelter stays 7.5 m);
// track: false drops ballast, sleepers and rails.
// Colours (indigo, dusk): concrete sclera #f6f3ee / moon #d5e2ff; coping, risers moon / sky #1b2d6b (the coping
// underside is the dark edge line); tactile line practical #f0c36a / iris #e7a04a; painted steel (columns, rafters,
// poles, handrail, bench legs) moon / sky at 0.35, so +X faces are pale and +Z / -X faces navy (all-navy steel merged
// with the ink at hero size); the name board frame sky / hair #16141c; roof accent #e23b4a / sky; bench and fence wood iris / accent;
// name board sclera / moon with a sky band; lamp fittings practical / iris at threshold -0.25 (glowing); ballast
// moon / sky; sleepers skin #f0c2ae / iris; rails line #e7eefc (lit rail head) / sky. hair sits next to ink only on the
// shaded faces of the thin board frame. Pale parts use threshold 0.1 so walls square to the camera stay lit.

export const meta = {
  name: "station-platform",
  height: 4.7,
  script: "indigo",
  colors: {
    concrete: "#f6f3ee", concreteShade: "#d5e2ff",
    coping: "#d5e2ff", copingShade: "#1b2d6b",
    tactile: "#f0c36a", tactileShade: "#e7a04a",
    steel: "#d5e2ff", steelShade: "#1b2d6b",
    frame: "#1b2d6b", frameShade: "#16141c",
    roof: "#e23b4a", roofShade: "#1b2d6b",
    wood: "#e7a04a", woodShade: "#e23b4a",
    board: "#f6f3ee", boardShade: "#d5e2ff",
    band: "#1b2d6b",
    lamp: "#f0c36a", lampShade: "#e7a04a",
    ballast: "#d5e2ff", ballastShade: "#1b2d6b",
    sleeper: "#f0c2ae", sleeperShade: "#e7a04a",
    rail: "#e7eefc", railShade: "#1b2d6b",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, length = 20, track = true } = opts;
  const root = new THREE.Group();
  root.name = "station";
  const scale = new THREE.Group(); // uniform size scale lives here, so root stays the plain contract node
  scale.name = "scale";
  scale.scale.setScalar(height / meta.height);
  root.add(scale);
  const body = new THREE.Group(); // shifted to centre the content's bbox on x = 0, z = 0
  body.name = "body";
  scale.add(body);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  function tri(key, a, b, e, ref) { // wound away from ref, a point inside the solid
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-9) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    S(key).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function hex(key, p) { // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  // axis box from min / max corners
  function bx(key, x0, y0, z0, x1, y1, z1) {
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // a square beam from a to b, w wide and h tall, its height along `up`
  function beam(key, a, b, w, h = w, up = [0, 1, 0]) {
    const d = sub(b, a);
    let s = cross(d, up);
    if (Math.hypot(...s) < 1e-9) s = cross(d, [1, 0, 0]);
    s = nrm(s);
    const u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // a three.js geometry (non-indexed) into soups; split(normal) -> key picks the soup per triangle
  function addGeo(geo, split) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.attributes.position.array;
    for (let i = 0; i < p.length; i += 9) {
      const a = [p[i], p[i + 1], p[i + 2]], b = [p[i + 3], p[i + 4], p[i + 5]], e = [p[i + 6], p[i + 7], p[i + 8]];
      const n = cross(sub(b, a), sub(e, a));
      if (Math.hypot(...n) < 1e-9) continue;
      S(split(nrm(n))).push(...a, ...b, ...e);
    }
  }

  // ---------- layout ----------
  const H = 1.1, L = Math.max(12, length), X0 = -L / 2, X1 = L / 2;
  const ZE = 2.0, ZB = -2.0; // track edge (coping front), back edge
  const TC = ZE + 1.5; // track centre

  // ---------- platform slab, coping, tactile line ----------
  bx("concrete", X0, 0, ZB, X1, H - 0.15, ZE - 0.12); // body, track face set back under the coping
  bx("concrete", X0, H - 0.15, ZB, X1, H, ZE - 0.3); // deck
  bx("coping", X0, H - 0.15, ZE - 0.3, X1, H, ZE); // coping slab, overhangs 0.12
  bx("tactile", X0 + 0.05, H, ZE - 1.1, X1 - 0.05, H + 0.012, ZE - 0.8);

  // ---------- steps off the +X end (back half), handrail ----------
  {
    const N = 6, rise = H / N, run = 0.3, SZ0 = ZB + 0.15, SZ1 = ZB + 2.15;
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.lineTo(N * run, 0);
    for (let k = 1; k <= N; k++) {
      sh.lineTo((N - k + 1) * run, k * rise);
      sh.lineTo((N - k) * run, k * rise);
    }
    sh.lineTo(-0.05, H);
    sh.lineTo(-0.05, 0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: SZ1 - SZ0, bevelEnabled: false, steps: 1 });
    g.translate(X1, 0, SZ0);
    addGeo(g, (n) => (n[0] > 0.7 ? "riser" : "concrete"));
    // handrail on the open (+Z) side: posts at the foot and the top, a sloped rail
    const hz = SZ1 - 0.08, rh = 0.85;
    const foot = [X1 + N * run - 0.15, rise + rh, hz], top = [X1 + 0.15, H + rh, hz];
    beam("steel", [foot[0], rise * 0.5, hz], foot, 0.05);
    beam("steel", [top[0], H, hz], top, 0.05);
    beam("steel", [foot[0] + 0.05, foot[1], hz], [top[0] - 0.05, top[1], hz], 0.05);
  }

  // ---------- shelter: steel frame, roof, fittings, benches, name board ----------
  const SX = [-5, -2.5, 0, 2.5], CZ = -1.25; // column x, column z
  const RB = { z: -1.75, y: H + 2.72 }, RF = { z: 0.85, y: H + 3.0 }; // roof back and front edges (underside)
  const roofY = (z) => RB.y + ((z - RB.z) * (RF.y - RB.y)) / (RF.z - RB.z);
  for (const x of SX) {
    bx("steel", x - 0.11, H, CZ - 0.11, x + 0.11, roofY(CZ) - 0.02, CZ + 0.11); // column
    beam("steel", [x, roofY(RB.z + 0.05) - 0.09, RB.z + 0.05], [x, roofY(RF.z - 0.05) - 0.09, RF.z - 0.05], 0.1, 0.16); // rafter
    beam("steel", [x, roofY(CZ) - 0.75, CZ + 0.05], [x, roofY(0.15) - 0.15, 0.15], 0.07); // brace
  }
  const RX0 = SX[0] - 0.35, RX1 = SX[SX.length - 1] + 0.35;
  // front and back purlins along x under the roof
  beam("steel", [RX0 + 0.05, roofY(RF.z - 0.1) - 0.12, RF.z - 0.1], [RX1 - 0.05, roofY(RF.z - 0.1) - 0.12, RF.z - 0.1], 0.1, 0.14);
  beam("steel", [RX0 + 0.05, roofY(CZ) - 0.12, CZ], [RX1 - 0.05, roofY(CZ) - 0.12, CZ], 0.1, 0.14);
  // roof sheet (a sloped slab) and the front fascia
  hex("roof", [
    [RX0, RB.y, RB.z], [RX1, RB.y, RB.z], [RX1, RF.y, RF.z], [RX0, RF.y, RF.z],
    [RX0, RB.y + 0.16, RB.z], [RX1, RB.y + 0.16, RB.z], [RX1, RF.y + 0.16, RF.z], [RX0, RF.y + 0.16, RF.z],
  ]);
  bx("roof", RX0 - 0.03, RF.y - 0.12, RF.z - 0.04, RX1 + 0.03, RF.y + 0.22, RF.z + 0.04);
  // glowing fittings under the roof
  for (const x of [(SX[0] + SX[1]) / 2, (SX[1] + SX[2]) / 2]) bx("lamp", x - 0.6, roofY(-0.3) - 0.2, -0.38, x + 0.6, roofY(-0.3) - 0.05, -0.22);
  // benches between the first columns: steel legs, a slatted seat and back
  for (let i = 0; i < 2; i++) {
    const a = SX[i] + 0.35, b = SX[i + 1] - 0.35, z0 = CZ + 0.2, sy = H + 0.42;
    for (const x of [a + 0.15, b - 0.15]) {
      bx("steel", x - 0.03, H, z0 + 0.05, x + 0.03, sy - 0.03, z0 + 0.1);
      bx("steel", x - 0.03, H, z0 + 0.35, x + 0.03, sy - 0.03, z0 + 0.4);
      bx("steel", x - 0.03, sy - 0.06, z0 + 0.03, x + 0.03, sy - 0.03, z0 + 0.42);
      bx("steel", x - 0.03, sy - 0.03, z0 + 0.02, x + 0.03, sy + 0.42, z0 + 0.07);
    }
    for (let k = 0; k < 3; k++) bx("wood", a, sy - 0.03, z0 + 0.04 + k * 0.135, b, sy + 0.01, z0 + 0.16 + k * 0.135); // seat slats
    for (let k = 0; k < 2; k++) bx("wood", a, sy + 0.14 + k * 0.15, z0 + 0.065, b, sy + 0.25 + k * 0.15, z0 + 0.1); // back slats
  }
  // the station name board, hung on two rods from the front purlin, face to the track
  {
    const bx0 = 0.4, bx1 = 2.1, by0 = H + 2.15, by1 = by0 + 0.55, bz = RF.z - 0.1;
    for (const x of [bx0 + 0.25, bx1 - 0.25]) beam("steel", [x, by1 - 0.02, bz], [x, roofY(bz) - 0.12, bz], 0.03);
    bx("frame", bx0 - 0.04, by0 - 0.04, bz - 0.05, bx1 + 0.04, by1 + 0.04, bz + 0.05); // frame
    bx("board", bx0, by0, bz - 0.06, bx1, by1, bz + 0.06); // white panel both faces
    for (const s of [1, -1]) { // split band, both faces
      const zz = bz + s * 0.062;
      for (const [u0, u1] of [[bx0 + 0.02, (bx0 + bx1) / 2 - 0.03], [(bx0 + bx1) / 2 + 0.03, bx1 - 0.02]])
        quad("band", [u0, by0 + 0.05, zz], [u1, by0 + 0.05, zz], [u1, by0 + 0.15, zz], [u0, by0 + 0.15, zz], [0, by0, bz]);
      quad("band", [bx0 + 0.02, by0 + 0.19, zz], [bx1 - 0.02, by0 + 0.19, zz], [bx1 - 0.02, by0 + 0.215, zz], [bx0 + 0.02, by0 + 0.215, zz], [0, by0, bz]);
    }
  }

  // ---------- lamp posts ----------
  const lampX = [];
  for (let x = RX1 + 2.4; x < X1 - 0.6; x += 3.5) lampX.push(x);
  for (let x = RX0 - 2.4; x > X0 + 0.6; x -= 3.5) lampX.push(x);
  const LZ = -1.6, LH = H + 3.6;
  for (const x of lampX) {
    bx("steel", x - 0.08, H, LZ - 0.08, x + 0.08, LH, LZ + 0.08); // pole
    bx("steel", x - 0.12, H, LZ - 0.12, x + 0.12, H + 0.25, LZ + 0.12); // base
    beam("steel", [x, LH - 0.05, LZ - 0.06], [x, LH - 0.05, LZ + 0.75], 0.07, 0.07); // arm toward the track
    bx("steel", x - 0.11, LH - 0.12, LZ + 0.35, x + 0.11, LH - 0.05, LZ + 0.95); // fitting top
    bx("lamp", x - 0.09, LH - 0.24, LZ + 0.37, x + 0.09, LH - 0.12, LZ + 0.93); // glowing diffuser
  }

  // ---------- fence on the back edge ----------
  {
    const fz = ZB + 0.06, fh = 1.0, n = Math.round(L / 2);
    for (let i = 0; i <= n; i++) {
      const x = X0 + 0.08 + ((L - 0.16) * i) / n;
      bx("wood", x - 0.06, H, fz - 0.06, x + 0.06, H + fh + 0.06, fz + 0.06); // post
    }
    for (const y of [H + 0.2, H + 0.5, H + 0.8]) bx("wood", X0 + 0.02, y, fz + 0.06, X1 - 0.02, y + 0.15, fz + 0.1); // planks
  }

  // ---------- track: ballast, sleepers, rails ----------
  if (track) {
    const TX0 = X0 - 2, TX1 = X1 + 3, BY = 0.16;
    hex("ballast", [
      [TX0, 0, TC - 1.75], [TX1, 0, TC - 1.75], [TX1, 0, TC + 1.75], [TX0, 0, TC + 1.75],
      [TX0, BY, TC - 1.3], [TX1, BY, TC - 1.3], [TX1, BY, TC + 1.3], [TX0, BY, TC + 1.3],
    ]);
    for (let x = TX0 + 0.3; x < TX1 - 0.2; x += 0.6) bx("sleeper", x - 0.1, BY - 0.04, TC - 1.0, x + 0.1, BY + 0.1, TC + 1.0);
    const G = 1.067 / 2 + 0.035, RY = BY + 0.1;
    for (const s of [1, -1]) {
      bx("rail", TX0, RY, TC + s * G - 0.065, TX1, RY + 0.012, TC + s * G + 0.065); // foot
      bx("rail", TX0, RY + 0.012, TC + s * G - 0.012, TX1, RY + 0.1, TC + s * G + 0.012); // web
      bx("rail", TX0, RY + 0.1, TC + s * G - 0.035, TX1, RY + 0.145, TC + s * G + 0.035); // head
    }
  }

  // ---------- meshes ----------
  const MAT = {
    concrete: [c.concrete, c.concreteShade, 0.1, true],
    riser: [c.coping, c.copingShade, 0.1, true],
    coping: [c.coping, c.copingShade, 0.1, true],
    tactile: [c.tactile, c.tactileShade, 0.1, false],
    steel: [c.steel, c.steelShade, 0.35, true],
    frame: [c.frame, c.frameShade, 0.35, true],
    roof: [c.roof, c.roofShade, 0.1, true],
    wood: [c.wood, c.woodShade, 0.1, true],
    board: [c.board, c.boardShade, 0.1, true],
    band: [c.band, c.band, 0.1, false],
    lamp: [c.lamp, c.lampShade, -0.25, true],
    ballast: [c.ballast, c.ballastShade, 0.1, true],
    sleeper: [c.sleeper, c.sleeperShade, 0.1, true],
    rail: [c.rail, c.railShade, 0.35, true],
  };
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, { threshold, outline });
    mesh.name = key;
    body.add(mesh);
  }
  // centre the content on x = 0, z = 0
  const bb = new THREE.Box3().setFromObject(body);
  body.position.set(-(bb.min.x + bb.max.x) / 2, 0, -(bb.min.z + bb.max.z) / 2);

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
