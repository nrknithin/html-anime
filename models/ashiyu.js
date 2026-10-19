// ashiyu.js - a public footbath pavilion (ashiyu) in a hot-spring town: an open wooden shelter with a tiled gable roof
// over a long stone trough of steaming water, a wooden bench rim to sit on, a bamboo spout, and a few things left behind.
// Contract: harness/lab/README.md. Meters, +Y up, the gable end with the overflow faces +Z, its left is +X (the long
// bench with the towel and geta), stands on y = 0, centred on x = 0, z = 0.
//
// Construction (boxes, cylinders, planes and spheres moved in code, merged per material into one mesh each; 13 meshes).
// Everything is authored with the trough along X (comments below use those plan axes), then one "plan" group turns it
// -90 deg about Y, so the trough runs along Z. That puts the overflow at the front and the long bench on the lit +X side,
// and keeps the near corner post out of the middle of the low hero view.
//   TROUGH  stone walls of cut blocks in two staggered courses, each block a little proud or sunk and 1.6 cm apart, so
//           the dark mortar box behind them shows as joint lines (the hull draws silhouettes only). The water is one
//           opaque inked slab brimming 2 cm under the bench rim, with three pale shine strips laid on it.
//   BENCH   a wooden rim all round the trough top: deep benches on the two long sides (a dark plank line, short legs
//           under the outer edge), a narrow board across the spout end and two short boards either side of the weir.
//   WATER   the hero camera sits about at bench height, so the surface is nearly edge-on. The water therefore also shows
//           standing up: at the plan +X end (world front) it brims through a notch in the rim and runs down the wall as
//           an inked sheet into a stone drain basin. Steam, the spout stream and the ripples add to it.
//   SPOUT   a bamboo post at the plan -X end (world back) with a pipe over the rim, dark node rings and dark cut ends.
//   SHELTER four square posts on footing stones, keta beams, tie beams, a gable beam and ridge strut at each gable,
//           barge boards. The roof is two slabs, each topped by a plane rippled across (tile channels) and stepped down
//           the slope (courses), with a dark tile row in every valley (on the lit slope the ripple alone stays one tone);
//           a dark ridge cap with tall end tiles, and a dark row of round eave-tile ends along both eaves.
//   PROPS   a folded towel on the long bench with a flap hanging over its edge (two red woven stripes), a pair of geta on
//           the ground below it (board, two teeth, red hanao), and a blank wooden signboard on a post with a dark frame
//           and cap, beside the front-left post.
//   MOVING  two meshes that pose() rewrites every frame from stored unit shapes (vertices and normals, no new geometry):
//           "steam" (no ink): four wisps of seven blobs rising from the water, growing, swaying and shrinking to nothing
//           at the top so the loop is seamless, plus pale streaks sliding down the overflow sheet; "stream" (thin ink):
//           a static thin core along the spout's fall curve, beads sliding down it, and ripple rings spreading under the
//           spout and in the drain basin and sinking away.
//   Winding: every primitive is three.js-outward and only moved by matrices with positive scale.
// Proportions (real size, base unit the bench height B = 0.42 m): trough L (default 2.4) x 1.0, stone 0.36 high, water
// 0.40, bench rim top 0.42, benches 0.38 deep; posts 0.13 square on a 2.0 x (L + 0.7) plan, keta top 2.26; roof pitch 26
// deg, eaves 0.55 past the keta at y ~2.0, ridge 2.78, end-tile tops 3.06 (~7 B); spout mouth 0.80; signboard top 1.49.
// Options: build(THREE, kit, colors, { height, length }). length is the trough length L (the shelter grows with it);
// height scales the whole pavilion uniformly so the end-tile top is `height` (the lab skips its height check with options).
// Clip: steam (4 s loop): wisps rise (one blob cycle per 4 s), beads and streaks trickle (4 cycles per 4 s), ripples
// spread (4 per 4 s). rest is steam@0.
// Colours (meadow, a green country afternoon):
//   water sky #d7ecef flat, inked; shine strips sclera #f6f3ee flat; stream and ripples sclera / sky; steam and streaks
//   moon #f7f3e1 / sclera, no ink, so the pale blue water and the warm white steam read apart.
//   stone line #a9d16e / iris #3f8a47 (mossy stone, far from the pale water); mortar, joints, cut ends, nodes, ridge
//   cap, eave tiles, tile rows, sign frame and plank lines hair #2c5131 (lines); wood skin #f0c2ae / accent #d9483b at
//   threshold 0.1 (warm cedar: only undersides and the far side go red); kawara iris / hair at 0.72; bamboo practical
//   #f2c94c / line (old yellow bamboo); towel sclera / sky; hanao and towel stripes accent.

export const meta = {
  name: "ashiyu",
  height: 3.06,
  script: "meadow",
  colors: {
    water: "#d7ecef", waterShade: "#d7ecef",
    shine: "#f6f3ee", shineShade: "#d7ecef",
    steam: "#f7f3e1", steamShade: "#f6f3ee",
    stone: "#a9d16e", stoneShade: "#3f8a47",
    dark: "#2c5131",
    wood: "#f0c2ae", woodShade: "#d9483b",
    tile: "#3f8a47", tileShade: "#2c5131",
    bamboo: "#f2c94c", bambooShade: "#a9d16e",
    towel: "#f6f3ee", towelShade: "#d7ecef",
    strap: "#d9483b",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const L = opts.length ?? 2.4;
  const root = new THREE.Group();
  root.name = "ashiyu";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  root.add(body);
  // everything is laid out with the trough along X, then the plan turns -90 deg so the trough runs along Z: the gable
  // and the overflow face the front (+Z), the long bench with the towel faces the lit +X side
  const plan = new THREE.Group();
  plan.name = "plan";
  plan.rotation.y = -Math.PI / 2;
  body.add(plan);
  const joints = {};

  // ---------- parts merged per material ----------
  const parts = {};
  const counts = {}; // vertices so far per material, so animated pieces know their offset
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), v4 = new THREE.Vector3(), s4 = new THREE.Vector3();
  function put(key, g, [x, y, z] = [0, 0, 0], [rx, ry, rz] = [0, 0, 0], [sx, sy, sz] = [1, 1, 1]) {
    if (g.index) g = g.toNonIndexed();
    if (!g.attributes.normal) g.computeVertexNormals();
    m4.compose(v4.set(x, y, z), q4.setFromEuler(e4.set(rx, ry, rz)), s4.set(sx, sy, sz));
    g.applyMatrix4(m4);
    (parts[key] ??= []).push(g);
    const start = counts[key] ?? 0;
    counts[key] = start + g.attributes.position.count;
    return start;
  }
  const box = (key, x0, x1, y0, y1, z0, z1) => put(key, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]);
  const hash = (i) => { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
  const up = new THREE.Vector3(0, 1, 0);
  // a closed cylinder from a to b (radius r); node > 0 adds dark rings every `node` m
  function pole(key, a, b, r, seg = 8, node = 0) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length();
    const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize()));
    put(key, new THREE.CylinderGeometry(r, r, len, seg), A.clone().add(B).multiplyScalar(0.5).toArray(), [e.x, e.y, e.z]);
    if (node) for (let s = node * 0.7; s < len - 0.04; s += node)
      put("dark", new THREE.CylinderGeometry(r * 1.06, r * 1.06, 0.018, seg), A.clone().addScaledVector(d, s / len).toArray(), [e.x, e.y, e.z]);
  }

  // ---------- trough ----------
  const HX = L / 2, HZ = 0.5, WALL = 0.16, STONE_Y = 0.36, WATER_Y = 0.4, RIM_Y = 0.42, BENCH = 0.38;
  const IX = HX - WALL, IZ = HZ - WALL, WEIR = IZ - 0.08;
  box("dark", -HX + 0.03, HX - 0.03, 0, STONE_Y - 0.01, -HZ + 0.03, HZ - 0.03); // mortar core
  // stone blocks: two courses, staggered, each slightly proud or sunk
  function wallRun(len, course, k0, place) {
    const n = Math.max(2, Math.round(len / 0.42));
    const step = len / n, off = course ? step / 2 : 0;
    const y0 = course ? STONE_Y / 2 : 0, y1 = course ? STONE_Y : STONE_Y / 2;
    let edges = [0];
    for (let i = 0; i < n; i++) { const e = off + step * (i + 1); if (e < len - 0.08) edges.push(e); }
    edges.push(len);
    for (let i = 0; i + 1 < edges.length; i++) place(edges[i] + 0.008, edges[i + 1] - 0.008, y0 + 0.008, y1 - 0.008, 0.012 * (hash(k0 + i) - 0.4));
  }
  for (const course of [0, 1]) {
    for (const s of [-1, 1]) {
      // long walls (front +Z, back -Z)
      wallRun(2 * HX, course, 10 + course * 50 + (s + 1) * 100, (a, b, y0, y1, d) =>
        box("stone", -HX + a, -HX + b, y0, y1, s > 0 ? IZ : -HZ - d, s > 0 ? HZ + d : -IZ));
      // end walls (+X, -X), between the long walls
      wallRun(2 * IZ, course, 300 + course * 50 + (s + 1) * 10, (a, b, y0, y1, d) =>
        box("stone", s > 0 ? IX : -HX - d, s > 0 ? HX + d : -IX, y0, y1, -IZ + a, -IZ + b));
    }
  }
  // water: one slab under the rim, brimming
  {
    const g = new THREE.BoxGeometry(2 * IX + 0.02, WATER_Y - 0.05, 2 * IZ + 0.02);
    put("water", g, [0, (WATER_Y + 0.05) / 2, 0]);
  }
  // shine strips on the surface (paint, no ink)
  for (const [x, z, w, d] of [[-0.25 * L, 0.08, 0.5 * L * 0.55, 0.035], [0.12 * L, -0.12, 0.3 * L * 0.55, 0.03], [0.3 * L, 0.16, 0.12 * L, 0.025]])
    put("shineFlat", new THREE.PlaneGeometry(w, d), [x, WATER_Y + 0.004, z], [-Math.PI / 2, 0, 0]);

  // ---------- bench rim ----------
  for (const s of [-1, 1]) {
    // long benches
    box("wood", -HX - 0.04, HX + 0.04, STONE_Y, RIM_Y, s > 0 ? IZ : -IZ - BENCH, s > 0 ? IZ + BENCH : -IZ);
    put("darkFlat", new THREE.PlaneGeometry(2 * HX + 0.06, 0.012), [0, RIM_Y + 0.002, s * (IZ + BENCH / 2)], [-Math.PI / 2, 0, 0]);
    // legs under the outer edge
    const nLeg = Math.max(2, Math.round((2 * HX) / 0.8) + 1);
    for (let i = 0; i < nLeg; i++) {
      const x = -HX + 0.12 + ((2 * HX - 0.24) * i) / (nLeg - 1);
      const zo = s * (IZ + BENCH - 0.07);
      box("wood", x - 0.04, x + 0.04, 0, STONE_Y, zo - 0.04, zo + 0.04);
    }
    // end boards
    if (s < 0) box("wood", -HX - 0.04, -IX + 0.02, STONE_Y, RIM_Y, -IZ, IZ);
    // +X: two short boards either side of the weir notch
    else for (const sz of [-1, 1]) box("wood", IX - 0.02, HX + 0.04, STONE_Y, RIM_Y, sz > 0 ? WEIR : -IZ, sz > 0 ? IZ : -WEIR);
  }

  // ---------- overflow at +X: the water spills through a notch in the end board as a sheet down the wall ----------
  box("water", IX - 0.01, HX + 0.016, 0.07, WATER_Y, -WEIR, WEIR);
  const DR = [HX + 0.2, 0.06, 0];
  box("dark", DR[0] - 0.17, DR[0] + 0.15, 0, 0.05, -0.32, 0.32);
  box("stone", DR[0] - 0.2, DR[0] + 0.2, 0, 0.1, -0.36, -0.28);
  box("stone", DR[0] - 0.2, DR[0] + 0.2, 0, 0.1, 0.28, 0.36);
  box("stone", DR[0] + 0.12, DR[0] + 0.2, 0, 0.1, -0.28, 0.28);
  box("water", DR[0] - 0.19, DR[0] + 0.13, 0.02, DR[1], -0.29, 0.29);

  // ---------- bamboo spout at -X ----------
  const PX0 = -HX - 0.13;
  pole("bamboo", [PX0, 0, 0], [PX0, 0.98, 0], 0.055, 10, 0.3);
  put("dark", new THREE.CircleGeometry(0.05, 10), [PX0, 0.981, 0], [-Math.PI / 2, 0, 0]);
  const MOUTH = [-IX + 0.24, 0.8, 0];
  pole("bamboo", [PX0 - 0.03, 0.86, 0], MOUTH, 0.036, 8, 0.25);
  {
    const d = new THREE.Vector3(...MOUTH).sub(new THREE.Vector3(PX0, 0.86, 0)).normalize();
    const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d));
    put("dark", new THREE.CircleGeometry(0.03, 10), new THREE.Vector3(...MOUTH).addScaledVector(d, 0.003).toArray(), [e.x, e.y, e.z]);
  }

  // ---------- shelter ----------
  const PX = HX + 0.35, PZ = 1.0, POST = 0.065, KETA = 2.26, PITCH = 0.45, OV = 0.55;
  const RX = PX + 0.5; // roof half length
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box("stone", sx * PX - 0.13, sx * PX + 0.13, 0, 0.1, sz * PZ - 0.13, sz * PZ + 0.13);
    box("wood", sx * PX - POST, sx * PX + POST, 0.1, KETA - 0.16, sz * PZ - POST, sz * PZ + POST);
  }
  for (const sz of [-1, 1]) box("wood", -PX - 0.4, PX + 0.4, KETA - 0.16, KETA, sz * PZ - 0.07, sz * PZ + 0.07); // keta
  const RIDGE = KETA + 0.04 + PZ * Math.tan(PITCH);
  for (const sx of [-1, 1]) {
    box("wood", sx * PX - 0.06, sx * PX + 0.06, KETA - 0.36, KETA - 0.22, -PZ - 0.2, PZ + 0.2); // tie beam (nuki)
    box("wood", sx * PX - 0.07, sx * PX + 0.07, KETA - 0.02, KETA + 0.08, -PZ + 0.1, PZ - 0.1); // gable beam
    box("wood", sx * PX - 0.05, sx * PX + 0.05, KETA + 0.08, RIDGE - 0.02, -0.05, 0.05); // ridge strut
  }
  // roof slabs: top rippled across (channels along the slope) and stepped down it (courses)
  const SL = (PZ + OV) / Math.cos(PITCH) + 0.02, T = 0.08, CH = 0.2, CRS = 0.27;
  for (const s of [1, -1]) {
    const nx = Math.round((2 * RX) / (CH / 3)), nz = Math.round(SL / (CRS / 3));
    const g = new THREE.PlaneGeometry(2 * RX, SL, nx, nz);
    g.rotateX(-Math.PI / 2); // lies flat, normal +Y, local z = down the plane
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i) * s; // z grows down the slope on both
      const ch = 0.5 - 0.5 * Math.cos((2 * Math.PI * (x + RX)) / CH);
      const u = (z + SL / 2) / CRS, step = u - Math.floor(u + 1e-6);
      p.setY(i, 0.035 * ch + 0.03 * step);
    }
    g.computeVertexNormals();
    const a = s * PITCH; // rotX(+a): +z goes down
    const nrm = [0, Math.cos(PITCH), s * Math.sin(PITCH)];
    const zc = s * (SL / 2) * Math.cos(PITCH) - s * 0.02, yc = RIDGE - (SL / 2) * Math.sin(PITCH) + 0.02;
    put("tile", new THREE.BoxGeometry(2 * RX, T, SL), [0, yc + nrm[1] * T / 2, zc + nrm[2] * T / 2], [a, 0, 0]);
    const topAt = [0, yc + nrm[1] * (T - 0.005), zc + nrm[2] * (T - 0.005)];
    put("tileTop", g, topAt, [a, 0, 0]);
    // dark tile rows down the slope in every valley (the shading alone stays one tone on the lit slope)
    for (let xv = -RX + CH; xv < RX - 0.05; xv += CH) {
      const st = new THREE.PlaneGeometry(0.024, SL - 0.04);
      st.rotateX(-Math.PI / 2);
      st.translate(xv, 0.034, 0);
      put("darkFlat", st, topAt, [a, 0, 0]);
    }
    // eave-tile ends along the lower edge
    const ez = s * (SL - 0.02) * Math.cos(PITCH), ey = RIDGE - (SL - 0.02) * Math.sin(PITCH) + 0.06;
    put("dark", new THREE.CylinderGeometry(0.05, 0.05, 2 * RX + 0.02, 10), [0, ey, ez], [0, 0, Math.PI / 2]);
    // barge boards under the roof edge at both gables
    for (const sx of [-1, 1]) {
      const bz = s * ((SL - 0.1) / 2) * Math.cos(PITCH), by = RIDGE - ((SL - 0.1) / 2) * Math.sin(PITCH) - 0.06;
      put("wood", new THREE.BoxGeometry(0.05, 0.2, SL - 0.1), [sx * (RX - 0.04), by, bz], [a, 0, 0]);
    }
  }
  // ridge cap and end tiles
  box("dark", -RX - 0.02, RX + 0.02, RIDGE - 0.02, RIDGE + 0.18, -0.12, 0.12);
  for (const sx of [-1, 1]) box("dark", sx * (RX + 0.02) - 0.05, sx * (RX + 0.02) + 0.05, RIDGE - 0.1, RIDGE + 0.28, -0.18, 0.18);

  // ---------- props ----------
  // towel folded on the front bench, a flap hanging over the outer edge
  {
    const tx = 0.25 * L, tz = -(IZ + BENCH - 0.13);
    box("towel", tx - 0.17, tx + 0.17, RIM_Y, RIM_Y + 0.05, tz - 0.12, tz + 0.12);
    box("towel", tx - 0.17, tx + 0.17, RIM_Y - 0.2, RIM_Y + 0.03, tz - 0.145, tz - 0.12);
    // two woven stripes across the towel (top and flap)
    for (const dx of [-0.11, 0.11]) {
      put("strap", new THREE.PlaneGeometry(0.025, 0.24), [tx + dx, RIM_Y + 0.052, tz], [-Math.PI / 2, 0, 0]);
      put("strap", new THREE.PlaneGeometry(0.025, 0.22), [tx + dx, RIM_Y - 0.085, tz - 0.147], [0, Math.PI, 0]);
    }
  }
  // geta on the ground in front of the bench
  for (const [gx, gz, yaw] of [[0.25 * L - 0.42, -HZ - 0.62, Math.PI - 0.15], [0.25 * L - 0.26, -HZ - 0.6, Math.PI - 0.05]]) {
    const gg = new THREE.Group();
    gg.position.set(gx, 0, gz);
    gg.rotation.y = yaw;
    gg.updateMatrixWorld(true);
    const at = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(gg.matrixWorld).toArray();
    put("wood", new THREE.BoxGeometry(0.1, 0.03, 0.23), at(0, 0.065, 0), [0, yaw, 0]);
    for (const tz of [-0.065, 0.065]) put("wood", new THREE.BoxGeometry(0.09, 0.05, 0.025), at(0, 0.025, tz), [0, yaw, 0]);
    // hanao: a V from the toe hole to both sides
    for (const sx of [-1, 1]) {
      const A = new THREE.Vector3(...at(0, 0.082, 0.07)), B = new THREE.Vector3(...at(sx * 0.048, 0.082, -0.03));
      const mid = A.clone().add(B).multiplyScalar(0.5); mid.y += 0.025;
      const curve = new THREE.QuadraticBezierCurve3(A, mid, B);
      put("strap", new THREE.TubeGeometry(curve, 6, 0.008, 5, false));
    }
  }
  // signboard on a post, blank, with a small cap roof, turned toward the lit side
  {
    const sg = new THREE.Group();
    const yaw = Math.PI / 2 + 0.6; // faces world +X+Z once the plan turns
    sg.position.set(PX + 0.45, 0, PZ + 0.5);
    sg.rotation.y = yaw;
    sg.updateMatrixWorld(true);
    const at = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(sg.matrixWorld).toArray();
    put("wood", new THREE.BoxGeometry(0.08, 1.3, 0.08), at(0, 0.65, -0.05), [0, yaw, 0]);
    put("wood", new THREE.BoxGeometry(0.46, 0.62, 0.035), at(0, 1.12, 0.01), [0, yaw, 0]);
    // dark frame bands round the face
    for (const [x, y, w, h] of [[0, 1.42, 0.46, 0.025], [0, 0.82, 0.46, 0.025], [-0.218, 1.12, 0.025, 0.62], [0.218, 1.12, 0.025, 0.62]])
      put("darkFlat", new THREE.PlaneGeometry(w, h), at(x, y, 0.029), [0, yaw, 0]);
    put("dark", new THREE.BoxGeometry(0.58, 0.04, 0.16), at(0, 1.47, 0.0), [0, yaw, 0]);
  }

  // ---------- moving parts (rewritten by pose) ----------
  const anim = { steam: [], stream: [] };
  function animPiece(key, g, fn) {
    if (g.index) g = g.toNonIndexed();
    if (!g.attributes.normal) g.computeVertexNormals();
    const p0 = Float32Array.from(g.attributes.position.array), n0 = Float32Array.from(g.attributes.normal.array);
    const start = put(key, g);
    anim[key].push({ start, p0, n0, fn });
  }
  const frac = (x) => x - Math.floor(x);
  const PERIOD = 4;
  // steam wisps
  const WISPS = [[-0.62 * IX, 0.05, 0.0], [-0.12 * IX, -0.12, 1.7], [0.32 * IX, 0.1, 3.1], [0.78 * IX, -0.06, 4.6]];
  WISPS.forEach(([x0, z0, ph], w) => {
    for (let k = 0; k < 7; k++) {
      animPiece("steam", new THREE.SphereGeometry(1, 8, 6), (t, M) => {
        const u = frac(t / PERIOD + k / 7 + w * 0.13);
        const r = 0.13 * Math.pow(Math.sin(Math.PI * u), 0.8) * (1 + 0.6 * u) + 1e-4;
        const x = x0 + 0.09 * Math.sin(2 * Math.PI * u + ph) + 0.12 * u;
        const y = WATER_Y + 0.05 + 1.25 * u;
        const z = z0 + 0.05 * Math.sin(2 * Math.PI * u * 0.5 + ph);
        M.compose(v4.set(x, y, z), q4.setFromEuler(e4.set(0, ph + u, 0.3 * Math.sin(ph + 6 * u))), s4.set(1.35 * r, 0.95 * r, 1.05 * r));
      });
    }
  });
  // fall curves: spout and overflow
  const fall = (P0, vx, tMax) => (s) => { const tt = s * tMax; return [P0[0] + vx * tt, P0[1] - 4.9 * tt * tt, P0[2]]; };
  const spoutHit = Math.sqrt((MOUTH[1] - WATER_Y) / 4.9);
  const spoutF = fall([MOUTH[0] + 0.01, MOUTH[1] - 0.01, 0], 0.5, spoutHit + 0.02);
  for (const [F, r] of [[spoutF, 0.011]]) {
    const pts = [];
    for (let k = 0; k <= 10; k++) pts.push(new THREE.Vector3(...F(k / 10)));
    put("stream", new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, r, 6, false));
    for (let k = 0; k < 4; k++) {
      animPiece("stream", new THREE.SphereGeometry(1, 6, 5), (t, M) => {
        const u = frac((2 * t) / 1 + k / 4); // 8 beads per 4 s per stream
        const [x, y, z] = F(u);
        const rr = r * (1.9 - 0.4 * u);
        M.compose(v4.set(x, y, z), q4.identity(), s4.set(rr, rr * 2.6, rr));
      });
    }
  }
  // ripple rings under the spout and in the drain basin
  // streaks sliding down the overflow sheet
  for (let k = 0; k < 8; k++) {
    const zk = -WEIR + 0.05 + ((2 * WEIR - 0.1) * ((k * 5) % 8)) / 7;
    animPiece("steam", new THREE.SphereGeometry(1, 5, 4), (t, M) => {
      const u = frac(t / 1 + k / 8 + 0.37 * k); // 4 passes per 4 s
      const y = WATER_Y - 0.03 - (WATER_Y - 0.13) * u;
      M.compose(v4.set(HX + 0.019, y, zk), q4.identity(), s4.set(0.005, 0.07 * Math.sin(Math.PI * u) + 1e-4, 0.01));
    });
  }
  const hitS = spoutF(1);
  for (const [cx, cy, cz, R] of [[hitS[0], WATER_Y + 0.006, 0, 0.26], [DR[0] - 0.08, DR[1] + 0.005, 0, 0.14]]) {
    for (let k = 0; k < 2; k++) {
      animPiece("stream", new THREE.TorusGeometry(1, 0.06, 4, 20), (t, M) => {
        const u = frac(t / 1 + k / 2); // 4 per 4 s
        const rad = 0.03 + R * u;
        const sink = 0.03 * Math.max(0, (u - 0.75) / 0.25);
        M.compose(v4.set(cx, cy - sink, cz), q4.setFromEuler(e4.set(Math.PI / 2, 0, 0)), s4.set(rad, rad, 0.25 + 0.5 * (1 - u)));
      });
    }
  }

  // ---------- meshes ----------
  const MAT = {
    water: [c.water, c.waterShade, -1, 3],
    shineFlat: [c.shine, c.shine, -1, 0],
    steam: [c.steam, c.steamShade, -0.3, 0],
    stream: [c.shine, c.shineShade, -0.2, 2],
    stone: [c.stone, c.stoneShade, 0.2, 4],
    dark: [c.dark, c.dark, 0, 3],
    darkFlat: [c.dark, c.dark, -1, 0],
    wood: [c.wood, c.woodShade, 0.1, 4],
    tile: [c.tile, c.tileShade, 0.72, 4],
    tileTop: [c.tile, c.tileShade, 0.72, 0],
    bamboo: [c.bamboo, c.bambooShade, 0.2, 3],
    towel: [c.towel, c.towelShade, 0.3, 3],
    strap: [c.strap, c.strap, 0, 0],
  };
  const live = {};
  for (const [key, list] of Object.entries(parts)) {
    let n = 0;
    for (const g of list) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let o = 0;
    for (const g of list) { pos.set(g.attributes.position.array, o); nor.set(g.attributes.normal.array, o); o += g.attributes.position.count * 3; }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    const [base, shade, threshold, px] = MAT[key];
    if (anim[key]) g.setAttribute("hullNormal", new THREE.BufferAttribute(nor.slice(), 3)); // smooth shapes: hull = normal
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    if (anim[key]) { mesh.frustumCulled = false; live[key] = mesh; }
    plan.add(mesh);
  }

  // uniform height: the ridge top
  if (opts.height) body.scale.setScalar(opts.height / (RIDGE + 0.28));

  const MA = new THREE.Matrix4(), NA = new THREE.Matrix3(), vv = new THREE.Vector3();
  function animate(t) {
    for (const key of Object.keys(anim)) {
      const g = live[key].geometry, P = g.attributes.position.array, N = g.attributes.normal.array, H = g.attributes.hullNormal.array;
      for (const pc of anim[key]) {
        pc.fn(t, MA);
        NA.getNormalMatrix(MA);
        const o = pc.start * 3;
        for (let i = 0; i < pc.p0.length; i += 3) {
          vv.fromArray(pc.p0, i).applyMatrix4(MA).toArray(P, o + i);
          vv.fromArray(pc.n0, i).applyMatrix3(NA).normalize().toArray(N, o + i);
          H[o + i] = N[o + i]; H[o + i + 1] = N[o + i + 1]; H[o + i + 2] = N[o + i + 2];
        }
      }
      g.attributes.position.needsUpdate = g.attributes.normal.needsUpdate = g.attributes.hullNormal.needsUpdate = true;
      g.computeBoundingSphere();
      g.computeBoundingBox();
    }
    root.updateMatrixWorld(true);
  }

  const CLIPS = { steam: PERIOD };
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`ashiyu: no clip "${m[1]}" (clips: steam)`);
      return animate(+m[2]);
    }
    if (name !== "rest") throw new Error(`ashiyu: unknown pose "${name}" (rest, or steam@<seconds>)`);
    animate(0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
