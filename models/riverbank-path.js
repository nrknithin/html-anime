// riverbank-path.js - the anime riverside embankment (kawabata / dote): a raised gravel path on top of a grassy bank,
// a row of cherry trees in bloom along it, a narrow concrete-walled river at the foot. Clip: breeze.
// Contract: harness/lab/README.md. Meters, +Y up, stands on y = 0 (the river bed), centred on x = 0, z = 0 (bbox).
// Authored with the river toward +Z and the path along X, then the whole set is turned { turn } deg (default 30) about
// Y, so the river side faces az 30: the lab's hero camera (az 52) looks across the water and up the slope 22 deg off
// square, as an establishing shot does, and three4 (az 38) nearly square; turn: 0 gives the plain axis-aligned set.
//
// Construction (every part is a three.js primitive transformed into place, merged per material into one indexed
// soup, so the whole set is 14 meshes; no hand-wound faces, so the winding is three.js's own):
//   BANK     one extruded cross-section (toe wall top -> slope -> flat crown -> back face) along the length: the
//            grassy slope is one plane at ~37 deg. Grass tufts (three-blade fans, darker green, no ink) dot the slope.
//   PATH     a gravel slab 5 cm proud on the crown with pale stone kerbs on both edges and gravel specks (flat dots).
//            A grass strip behind it holds the trees.
//   RIVER    the bank's concrete toe wall, the water 30 cm below its top, running to the front edge of the set so a
//            low camera sees the river as a band of water; pale ripple streaks and floating petals on it.
//   STEPS    a concrete flight down the slope (9 risers of 20 cm, 27 cm treads) between two inked cheek walls, a gap
//            in the railing at its head and a pipe handrail on one cheek.
//   RAILING  low white guard railing along the slope edge: posts every ~1.3 m, a top rail and a mid rail.
//   LAMP     a park lamp on the path's river edge, crook arm back over the gravel, a hooded lamp tucked under the
//            blossom (blobs near it are dropped); { night } lights it (practical, drawn below the light threshold, so
//            it always reads lit) and lays a lamp pool on the gravel.
//   BENCH    slatted bench on the path's back edge facing the river, dark iron legs.
//   TREES    stylised somei-yoshino, wide, low and spreading: a dark bole bent in two segments leaning toward the
//            water, forking at ~1.95 m; 6-7 primary limbs (longer on the river side, so the canopy reaches over the path
//            and the top of the slope) that each split in two; a small cluster of 2-3 flattened blobs at every split tip,
//            one at each limb's elbow and a low crown of five, so the canopy is a flattened dome (~6 m across, ~2 m
//            deep) with gaps where the dark limbs show; river-side tips droop. The ink of each blob's rim draws the
//            clumps. Fallen petals lie on the path, the strip, the slope and the water (flat fans, no ink). A seeded
//            hash (mulberry32), so every tree is the same for the same options.
//   BREEZE   pose("breeze@t"), 4 s loop. The wood and blossom soups are deformed in place (no skinning): each vertex
//            moves by the tree's sway (weight ((y - base) / 4.5 m)^2, so the trunk foot stays planted) plus, for
//            blossom, its cluster's own rigid bob (twice per loop, its own phase); limb tips sit inside their
//            clusters, so nothing tears. All frequencies are whole cycles per loop, so t = 0 and t = 4 match. The hull
//            normals stay at rest (small amplitudes).
// Proportions (real size, base unit the bank height B = 2.4 m): length 8 m; toe wall top 0.6, water 0.3, river 1.6
// wide; slope 2.4 deep for 1.8 rise; crown at 2.4 (= B), path 1.4 wide, grass strip 0.8; railing 0.8 tall (1/3 B);
// lamp 2.6 m; bench seat 0.42; trees: fork at 1.95 m, canopy ~6 m across, top ~3.8 m above the crown (1.6 B; the set's
// top 6.23 m), at the default 3 trees ~2.1 m apart (inset 0.8 m from the ends) so the canopies meet into one band.
// Options: build(THREE, kit, colors, { length, trees, night, turn, height }).
//   length  path length in m (default 8): the bank, river, railing, petals stretch; lamp, bench, steps keep their size.
//   trees   how many cherry trees, evenly spaced (default 3, 0 for a bare bank).
//   night   true: the lamp is lit (practical), with a pool of lamp light on the path. Same script.
//   turn    degrees the set is turned about Y (default 30, see above; 0 = river toward +Z).
//   height  scales the whole set uniformly so its top (the highest blossom) is `height` (default meta.height).
// Script: meadow (greens and a pale sky; no browns). Two-tone pairs (base / shade): grass line #a9d16e / iris #3f8a47
// (tufts iris flat); gravel moon #f7f3e1 / sky #d7ecef (specks sky flat); kerbs, toe wall, steps and railing sclera
// #f6f3ee / sky; water sky / iris (ripples sclera flat); blossom sclera / skin #f0c2ae at threshold 0.4, so the tops
// catch white and the sides and undersides go sakura pink (fallen petals skin flat); trunks and limbs hair #2c5131
// flat, the script's darkest tone after ink, so the blossom pops against dark bark; bench slats skin / accent #d9483b;
// iron (lamp, bench legs, handrail) hair / iris; lamp glass sclera / moon by day, practical #f2c94c flat at night.
// ink #1c261b.

export const meta = {
  name: "riverbank-path",
  height: 6.23,
  script: "meadow",
  colors: {
    grass: "#a9d16e", grassShade: "#3f8a47",
    tuft: "#3f8a47",
    gravel: "#f7f3e1", gravelShade: "#d7ecef",
    speck: "#d7ecef",
    stone: "#f6f3ee", stoneShade: "#d7ecef",
    water: "#d7ecef", waterShade: "#3f8a47",
    ripple: "#f6f3ee",
    blossom: "#f6f3ee", blossomShade: "#f0c2ae",
    petal: "#f0c2ae",
    bark: "#2c5131", barkShade: "#2c5131",
    slat: "#f0c2ae", slatShade: "#d9483b",
    rail: "#f6f3ee", railShade: "#d7ecef",
    iron: "#2c5131", ironShade: "#3f8a47",
    glass: "#f6f3ee", glassShade: "#f7f3e1",
    glow: "#f2c94c",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const { length = 8, trees = 3, night = false, turn = 30 } = opts;
  const L = Math.max(2, length), NT = Math.max(0, Math.round(trees));
  const TAU = Math.PI * 2;
  const root = new THREE.Group();
  root.name = "riverbank-path";
  const body = new THREE.Group(); // centring offset and the uniform size scale live here
  body.name = "body";
  root.add(body);
  const set = new THREE.Group(); // the set as authored (river toward +Z, length along X), turned toward the camera
  set.name = "set";
  set.rotation.y = (turn * Math.PI) / 180;
  body.add(set);
  const joints = {};

  // ---------- seeded hash ----------
  let seed = 0x2b7e1516;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rr = (a, b) => a + (b - a) * rand();

  // ---------- indexed soups per material, with optional sway tags per vertex ----------
  const soups = {};
  const S = (key) => (soups[key] ??= { pos: [], nrm: [], idx: [], tag: [] });
  const M4 = () => new THREE.Matrix4();
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  // add a three.js geometry (indexed or not) after matrix m; tag = [tree, cluster] (-1 = none)
  function add(key, g, m, tag = [-1, -1]) {
    if (m) g.applyMatrix4(m);
    if (!g.attributes.normal) g.computeVertexNormals();
    const s = S(key), base = s.pos.length / 3, p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      s.pos.push(p.getX(i), p.getY(i), p.getZ(i));
      s.nrm.push(n.getX(i), n.getY(i), n.getZ(i));
      s.tag.push(tag[0], tag[1]);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) s.idx.push(base + g.index.getX(i));
    else for (let i = 0; i < p.count; i++) s.idx.push(base + i);
    g.dispose();
  }
  const box = (key, cx, cy, cz, sx, sy, sz) => add(key, new THREE.BoxGeometry(sx, sy, sz), M4().makeTranslation(cx, cy, cz));
  // a round or square rod from a to b (radii ra at a, rb at b), seg sides, capped
  function rod(key, a, b, ra, rb = ra, seg = 6, tag) {
    const d = V().subVectors(b, a), len = d.length();
    const g = new THREE.CylinderGeometry(rb, ra, len, seg, 1, false);
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize());
    add(key, g, M4().compose(V().addVectors(a, b).multiplyScalar(0.5), q, V(1, 1, 1)), tag);
  }
  // a flat horizontal fan / quad (no ink): decals on the ground
  function flat(key, pts, y) { // y: a height, or a function (x, z) -> height
    const s = S(key), base = s.pos.length / 3;
    for (const [x, z] of pts) s.pos.push(x, typeof y === "function" ? y(x, z) : y, z), s.nrm.push(0, 1, 0), s.tag.push(-1, -1);
    for (let i = 1; i + 1 < pts.length; i++) s.idx.push(base, base + i + 1, base + i); // counter-clockwise from above
  }

  // ---------- cross-section (z, y), before centring ----------
  const WALL = 0.6, WATER = 0.3, B = 2.4;
  const zRiverF = 2.5, zWallF = 0.9, zToe = 0.6, zCrest = -1.8, zPathF = -1.9, zPathB = -3.3, zBack = -4.1;
  const PATH_Y = B + 0.05;
  const x0 = -L / 2, x1 = L / 2;
  const stepX = Math.max(x0 + 1.0, -L * 0.3), stepW = 1.0, nStep = 9; // the flight down the slope

  // BANK: one extruded section. Shape (u, v) = (-z, y), extruded along +Z then turned so the extrusion runs along X.
  {
    const sh = new THREE.Shape();
    const sec = [[zToe, 0], [zToe, WALL], [zCrest, B], [zBack, B], [zBack, 0]];
    sh.moveTo(-sec[0][0], sec[0][1]);
    for (const [z, y] of sec.slice(1)) sh.lineTo(-z, y);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: L, bevelEnabled: false, steps: 1 });
    add("grass", g, M4().makeTranslation(x0, 0, 0).multiply(M4().makeRotationY(Math.PI / 2)));
  }
  // grass tufts on the slope and the strip: three-blade fans standing on the surface, no ink
  const slopeY = (z) => WALL + ((zToe - z) / (zToe - zCrest)) * (B - WALL);
  function tuft(x, z, y, h) {
    const s = S("tuft");
    for (const a of [-0.5, 0, 0.5]) {
      const base = s.pos.length / 3, w = 0.03, ca = Math.cos(a), sa = Math.sin(a);
      s.pos.push(x - w, y, z + 0.01, x + w, y, z + 0.01, x + sa * h * 0.6, y + h * ca, z + 0.02 + h * 0.15);
      for (let k = 0; k < 3; k++) s.nrm.push(0, 0.6, 0.8), s.tag.push(-1, -1);
      s.idx.push(base, base + 1, base + 2);
    }
  }
  for (let i = 0, n = Math.round(L * 7); i < n; i++) {
    const z = rr(zCrest + 0.15, zToe - 0.08), x = rr(x0 + 0.1, x1 - 0.1);
    if (Math.abs(x - stepX) < stepW / 2 + 0.25) continue; // not on the flight
    tuft(x, z, slopeY(z) - 0.01, rr(0.1, 0.17));
  }
  for (let i = 0, n = Math.round(L * 2); i < n; i++) tuft(rr(x0 + 0.1, x1 - 0.1), rr(zBack + 0.1, zPathB - 0.12), B, rr(0.08, 0.14));

  // PATH: gravel slab, kerbs, specks
  box("gravel", 0, B + 0.025, (zPathF + zPathB) / 2, L, 0.05, zPathF - zPathB);
  box("stone", 0, B + 0.04, zPathF + 0.04, L, 0.08, 0.1);
  box("stone", 0, B + 0.04, zPathB - 0.04, L, 0.08, 0.1);
  for (let i = 0, n = Math.round(L * 14); i < n; i++) {
    const x = rr(x0 + 0.05, x1 - 0.05), z = rr(zPathB + 0.12, zPathF - 0.12), r = rr(0.018, 0.035);
    flat("speck", [0, 1, 2, 3, 4].map((k) => [x + r * Math.cos((k * TAU) / 5) * 1.6, z + r * Math.sin((k * TAU) / 5)]), PATH_Y + 0.002);
  }

  // RIVER: toe wall, far lip, water, ripples
  box("stone", 0, WALL / 2, (zToe + zWallF) / 2, L, WALL, zWallF - zToe);
  box("water", 0, WATER / 2, (zWallF + zRiverF) / 2, L, WATER, zRiverF - zWallF);
  for (let i = 0, n = Math.round(L * 2.2); i < n; i++) {
    const x = rr(x0 + 0.5, x1 - 0.9), z = rr(zWallF + 0.15, zRiverF - 0.15), l = rr(0.35, 0.8), w = rr(0.025, 0.04);
    flat("ripple", [[x, z - w], [x + l, z - w * 0.4], [x + l * 1.08, z], [x + l, z + w * 0.4], [x, z + w]], WATER + 0.003);
  }

  // STEPS: a flight down the slope near +X, with cheek walls
  {
    const rise = (B - WALL) / nStep, run = (zToe - zCrest) / nStep;
    for (let i = 0; i < nStep; i++) {
      const top = WALL + rise * (i + 1), zf = zToe - run * i, zb = zf - run - 0.02;
      const bot = top - rise - 0.25; // deep enough to bury the next step's front in the slope
      box("stone", stepX, (top + bot) / 2, (zf + zb) / 2, stepW, top - bot, zf - zb);
    }
    for (const sx of [-1, 1]) {
      const xw = stepX + sx * (stepW / 2 + 0.06);
      const a = V(xw, WALL + 0.12, zToe - 0.02), b = V(xw, B + 0.12, zCrest - 0.12);
      const d = V().subVectors(b, a), len = d.length();
      const g = new THREE.BoxGeometry(0.12, 0.34, len);
      const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), d.normalize());
      add("stone", g, M4().compose(V().addVectors(a, b).multiplyScalar(0.5), q, V(1, 1, 1)));
    }
    // handrail on the -X cheek: posts and a sloped pipe
    const xr = stepX - stepW / 2 - 0.06;
    const pA = V(xr, WALL + 0.29 + 0.85, zToe - 0.2), pB = V(xr, B + 0.29 + 0.75, zCrest - 0.05);
    rod("iron", pA, pB, 0.03, 0.03, 6);
    for (const f of [0.08, 0.5, 0.92]) {
      const top = V().lerpVectors(pA, pB, f);
      rod("iron", V(top.x, top.y - 0.9, top.z), top, 0.025, 0.025, 6);
    }
  }

  // RAILING: posts and two rails along the slope edge, a gap at the head of the steps
  {
    const zr = zCrest - 0.05, gap0 = stepX - stepW / 2 - 0.15, gap1 = stepX + stepW / 2 + 0.15;
    const runs = [[x0 + 0.1, gap0], [gap1, x1 - 0.1]].filter(([a, b]) => b - a > 0.3);
    for (const [a, b] of runs) {
      const n = Math.max(1, Math.round((b - a) / 1.3));
      for (let i = 0; i <= n; i++) box("rail", a + ((b - a) * i) / n, B + 0.4, zr, 0.07, 0.8, 0.07);
      box("rail", (a + b) / 2, B + 0.8, zr, b - a + 0.06, 0.06, 0.08);
      box("rail", (a + b) / 2, B + 0.45, zr, b - a, 0.04, 0.04);
    }
  }

  // LAMP: on the path's river edge just inside the railing, its crook arm reaching back over the gravel
  const lampX = -L * 0.13, lampZ = zPathF - 0.22;
  {
    box("stone", lampX, B + 0.08, lampZ, 0.28, 0.16, 0.28);
    rod("iron", V(lampX, B + 0.1, lampZ), V(lampX, B + 2.15, lampZ), 0.075, 0.05, 8);
    rod("iron", V(lampX, B + 2.1, lampZ), V(lampX, B + 2.4, lampZ - 0.25), 0.04, 0.04, 6);
    rod("iron", V(lampX, B + 2.4, lampZ - 0.24), V(lampX, B + 2.38, lampZ - 0.55), 0.04, 0.04, 6);
    const hx = lampX, hy = B + 2.23, hz = lampZ - 0.55;
    add("iron", new THREE.ConeGeometry(0.28, 0.18, 10), M4().makeTranslation(hx, hy + 0.15, hz));
    add(night ? "glow" : "glass", new THREE.CylinderGeometry(0.19, 0.13, 0.3, 10), M4().makeTranslation(hx, hy - 0.08, hz));
    add("iron", new THREE.CylinderGeometry(0.06, 0.06, 0.05, 8), M4().makeTranslation(hx, hy - 0.25, hz));
    if (night) {
      // lamp pool on the gravel: an ellipse under the lamp head, clipped to the path
      const pts = [];
      for (let k = 0; k < 24; k++) {
        const a = (k * TAU) / 24;
        pts.push([hx + 2.0 * Math.cos(a), Math.min(zPathF - 0.1, Math.max(zPathB + 0.1, hz + 0.65 * Math.sin(a)))]);
      }
      flat("pool", pts, PATH_Y + 0.004);
    }
  }

  // BENCH: on the path's back edge, facing the river
  {
    const bx = L * 0.13, bz = zPathB + 0.4, wB = 1.5;
    for (const sx of [-1, 1]) {
      const x = bx + sx * (wB / 2 - 0.12);
      box("iron", x, B + 0.05 + 0.2, bz + 0.12, 0.05, 0.4, 0.05);
      box("iron", x, B + 0.05 + 0.2, bz - 0.15, 0.05, 0.4, 0.05);
      box("iron", x, B + 0.45, bz, 0.05, 0.05, 0.42);
      box("iron", x, B + 0.68, bz - 0.2, 0.05, 0.5, 0.05);
    }
    for (const z of [bz + 0.13, bz, bz - 0.13]) box("slat", bx, B + 0.5, z, wB, 0.04, 0.11);
    for (const y of [B + 0.66, B + 0.82]) box("slat", bx, y, bz - 0.22, wB, 0.12, 0.035);
  }

  // TREES: a bent bole, then 6-7 primary limbs (biased toward the river) that each split in two; every split tip and
  // a few points along the limbs carry a small cluster of 2-3 flattened blobs, so the canopy is a low, wide dome with
  // gaps where dark limbs show. Outer clusters on the river side droop. Blobs too close to the lamp head are dropped.
  const TREE = []; // per tree: base y and sway phases
  const CL = []; // per blossom cluster: phase
  const LAMP_HEAD = V(lampX, B + 2.2, lampZ - 0.55);
  function cluster(t, c, n, rMin, rMax) {
    const cl = CL.length;
    CL.push({ ph: rr(0, 1) });
    for (let k = 0; k < n; k++) {
      const r = rr(rMin, rMax);
      const p = k === 0 ? c.clone() : V(c.x + rr(-0.4, 0.4), c.y + rr(-0.12, 0.15), c.z + rr(-0.35, 0.35));
      if (p.distanceTo(LAMP_HEAD) < r + 0.45) continue;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rr(0, TAU), 0));
      add("blossom", new THREE.SphereGeometry(1, 7, 5), M4().compose(p, q, V(r * rr(1.1, 1.3), r * 0.74, r)), [t, cl]);
    }
  }
  for (let t = 0; t < NT; t++) {
    const tx = x0 + 0.8 + ((L - 1.6) * (t + 0.5)) / NT + rr(-0.12, 0.12), tz = zBack + 0.45, ty = B;
    TREE.push({ y: ty, ph: rr(0, 1), ph2: rr(0, 1) });
    const tag = [t, -1];
    // trunk: root flare and a bole bent in two segments, leaning toward the river
    const lean = rr(-0.25, 0.25);
    const knee = V(tx + lean * 0.3, ty + 1.0, tz + 0.12);
    const fork = V(tx + lean, ty + 1.95, tz + 0.5);
    rod("bark", V(tx, ty - 0.05, tz), V(tx, ty + 0.3, tz + 0.02), 0.32, 0.21, 8, tag);
    rod("bark", V(tx, ty + 0.2, tz + 0.01), knee, 0.21, 0.18, 8, tag);
    rod("bark", knee, fork, 0.18, 0.14, 8, tag);
    const nl = 6 + (rand() < 0.5 ? 1 : 0);
    for (let i = 0; i < nl; i++) {
      const az = -Math.PI * 0.9 + (Math.PI * 1.8 * (i + rr(0.25, 0.75))) / nl; // around +Z, the river side
      const front = Math.cos(az);
      const reach = rr(2.3, 2.8) * (front > 0 ? 1.0 + 0.25 * front : 0.75);
      const dir = (a, d) => V(Math.sin(a) * d * 0.9, 0, Math.cos(a) * d);
      const mid = V().copy(fork).add(dir(az, reach * 0.45)).add(V(0, rr(0.55, 0.85), 0));
      rod("bark", fork, mid, 0.1, 0.07, 6, tag);
      cluster(t, V().copy(mid).add(V(0, 0.3, 0)), 1, 0.4, 0.5);
      for (const da of [-0.38, 0.38]) {
        const droop = front > 0.3 ? rr(0.15, 0.55) * front : rr(-0.1, 0.15);
        const tip = V().copy(fork).add(dir(az + da + rr(-0.1, 0.1), reach * rr(0.85, 1.05))).add(V(0, mid.y - fork.y + rr(-0.05, 0.3) - droop, 0));
        rod("bark", mid, tip, 0.06, 0.03, 5, tag);
        cluster(t, tip, 3, 0.32, 0.5);
      }
    }
    // crown: a low dome over the fork
    for (let k = 0; k < 5; k++) {
      const a = (k * TAU) / 5 + rr(0, 1);
      const c = V(fork.x + Math.sin(a) * 1.0, fork.y + rr(1.15, 1.45), fork.z + Math.cos(a) * 1.0 + 0.4);
      rod("bark", fork, V().lerpVectors(fork, c, 0.8), 0.08, 0.04, 5, tag);
      cluster(t, c, 2, 0.4, 0.52);
    }
    const j = new THREE.Group();
    j.name = `tree${t}`;
    j.position.set(tx, ty, tz);
    set.add(j);
    joints[j.name] = j;
  }

  // fallen petals: on the path (most), the strip and the upper slope; flat notched fans, no ink
  function petal(x, z, y, s, a) {
    const pts = [[0, 0], [0.5, -0.45], [1, -0.2], [0.85, 0], [1, 0.2], [0.5, 0.45]].map(([u, v]) => {
      const px = u * s, pz = v * s;
      return [x + px * Math.cos(a) - pz * Math.sin(a), z + px * Math.sin(a) + pz * Math.cos(a)];
    });
    flat("petal", pts, y);
  }
  if (NT > 0) {
    for (let i = 0, n = Math.round(L * 12); i < n; i++)
      petal(rr(x0 + 0.1, x1 - 0.15), rr(zPathB + 0.1, zPathF - 0.1), PATH_Y + 0.003, rr(0.05, 0.08), rr(0, TAU));
    for (let i = 0, n = Math.round(L * 6); i < n; i++) petal(rr(x0 + 0.1, x1 - 0.15), rr(zBack + 0.1, zPathB - 0.12), B + 0.003, rr(0.05, 0.08), rr(0, TAU));
    // the slope (lying on it, thinning toward the foot) and the water
    for (let i = 0, n = Math.round(L * 12); i < n; i++) {
      const z = zCrest + 0.1 + (zToe - zCrest - 0.25) * rand() ** 1.6;
      const x = rr(x0 + 0.1, x1 - 0.15);
      if (Math.abs(x - stepX) < stepW / 2 + 0.2) continue;
      petal(x, z, (px, pz) => slopeY(pz) + 0.006, rr(0.06, 0.09), rr(0, TAU));
    }
    for (let i = 0, n = Math.round(L * 5); i < n; i++)
      petal(rr(x0 + 0.1, x1 - 0.15), rr(zWallF + 0.08, zRiverF - 0.1), WATER + 0.005, rr(0.06, 0.09), rr(0, TAU));
  }

  // ---------- meshes ----------
  //          base, shade, threshold, ink px (false = no hull)
  const MAT = {
    grass: [c.grass, c.grassShade, 0.2, 3.5],
    tuft: [c.tuft, c.tuft, 0, false],
    gravel: [c.gravel, c.gravelShade, 0.2, 3],
    speck: [c.speck, c.speck, 0, false],
    stone: [c.stone, c.stoneShade, 0.2, 3],
    water: [c.water, c.waterShade, 0.2, 3],
    ripple: [c.ripple, c.ripple, 0, false],
    blossom: [c.blossom, c.blossomShade, 0.4, 3.5],
    petal: [c.petal, c.petal, 0, false],
    bark: [c.bark, c.barkShade, 0.2, 3],
    slat: [c.slat, c.slatShade, 0.2, 2.5],
    rail: [c.rail, c.railShade, 0.2, 2],
    iron: [c.iron, c.ironShade, 0.2, 2],
    glass: [c.glass, c.glassShade, 0.1, 2.5],
    glow: [c.glow, c.glow, -0.25, 2.5],
    pool: [c.glow, c.glow, -0.25, false],
  };
  const sway = [];
  for (const [key, s] of Object.entries(soups)) {
    const [base, shade, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.nrm, 3));
    g.setIndex(s.idx);
    const mesh = px === false ? kit.toon(g, base, shade, { threshold, outline: false }) : kit.toon(g, base, shade, { threshold, px });
    mesh.name = key;
    set.add(mesh);
    if (key === "bark" || key === "blossom") sway.push({ g, rest: Float32Array.from(s.pos), tag: Int32Array.from(s.tag), blossom: key === "blossom" });
  }
  // cluster centres (rest) for rigid blossom bob weights
  const clC = CL.map(() => [0, 0, 0, 0]);
  for (const w of sway) if (w.blossom) for (let i = 0; i < w.tag.length / 2; i++) {
    const k = w.tag[2 * i + 1], e = clC[k];
    e[0] += w.rest[3 * i], e[1] += w.rest[3 * i + 1], e[2] += w.rest[3 * i + 2], e[3]++;
  }
  for (const e of clC) if (e[3]) (e[0] /= e[3]), (e[1] /= e[3]), (e[2] /= e[3]);

  // centre on the bbox (x, z) and scale to height
  body.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(body, true);
  const natural = bb.max.y;
  const { height = natural } = opts;
  const sc = height / natural;
  body.scale.setScalar(sc);
  body.position.set(-((bb.min.x + bb.max.x) / 2) * sc, 0, -((bb.min.z + bb.max.z) / 2) * sc);

  // ---------- breeze ----------
  const CLIPS = { breeze: 4 };
  function deform(ph) {
    for (const w of sway) {
      const P = w.g.attributes.position, a = P.array;
      for (let i = 0; i < P.count; i++) {
        const t = w.tag[2 * i], k = w.tag[2 * i + 1];
        let x = w.rest[3 * i], y = w.rest[3 * i + 1], z = w.rest[3 * i + 2];
        if (t >= 0 && ph !== null) {
          const T = TREE[t];
          const yy = k >= 0 ? clC[k][1] : y;
          const f = Math.min(1.6, Math.max(0, (yy - T.y) / 4.5)) ** 2;
          // the tree: a slow lean along the bank (one cycle) and a lighter one toward the water (two cycles)
          x += f * (0.2 * Math.sin(TAU * (ph + T.ph)) + 0.05 * Math.sin(TAU * (3 * ph + T.ph2)));
          z += f * 0.07 * Math.sin(TAU * (2 * ph + T.ph2));
          if (k >= 0) {
            const q = CL[k].ph;
            x += 0.08 * Math.sin(TAU * (2 * ph + q));
            y += 0.05 * Math.sin(TAU * (2 * ph + q + 0.25));
            z += 0.05 * Math.cos(TAU * (3 * ph + q));
          }
        }
        a[3 * i] = x, a[3 * i + 1] = y, a[3 * i + 2] = z;
      }
      P.needsUpdate = true;
      w.g.computeBoundingBox();
      w.g.computeBoundingSphere();
    }
  }

  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`riverbank-path: no clip "${m[1]}" (clips: breeze)`);
      const T = CLIPS[m[1]];
      deform((((+m[2] % T) + T) % T) / T);
    } else if (name === "rest") deform(null);
    else throw new Error(`riverbank-path: unknown pose "${name}" (rest, or breeze@<seconds>)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
