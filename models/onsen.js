// onsen.js - an outdoor hot-spring bath (rotenburo): a rock-ringed pool, a bamboo spout and a woven bamboo fence, static.
// Contract: harness/lab/README.md. Meters, +Y up, the open (bather's approach) side faces +Z, its left is +X,
// stands on y = 0, centred on x = 0, z = 0.
//
// Construction (three.js primitives deformed in code, then merged per material into one mesh each; 10 meshes):
//   POOL   an irregular outline ring(t) (an ellipse with two low sine lobes). The water is that outline extruded from
//          y = 0 to the surface WATER_Y as one opaque slab, so a gap between rocks shows water, never a hole. Two pale
//          highlight bands and a ripple ring under the spout lie 6 mm above the surface, no ink (they are paint).
//   ROCKS  boulders along the outline: a sphere (12 x 9) pushed by three smooth sine fields, squared off by a power
//          < 1 (flat crown, round edges), yawed to the ring's tangent and cut flat at y = 0 so each sits. Sizes, crown
//          tilt, lobes and spacing come from hash(i) = fract(sin(i * 12.9898 + 78.233) * 43758.5453), a fixed table,
//          never Math.random. Each rock's centre sits on the outline so it overhangs the water; front rocks are low
//          (tops ~0.45, just above the water) and the back ones grow toward the fence (up to ~1.25). A few small
//          fillers sit outside the ring. The ledge is a sphere pressed into a slab at the +X front, on two rocks.
//   SPOUT  a bamboo pipe (kakehi) out of the fence over the back rocks on the +X side, held by an X stand of two thin
//          poles with a dark tie; dark node rings, a dark end disk so the cut end reads hollow. The stream is a tube
//          along the fall parabola from the mouth to under the surface, with two splash rings and three droplets.
//   FENCE  a takegaki 2 m tall along the back: a panel box of vertical slats (dark slat gaps as flat strips 4 mm
//          proud, no hull), four bamboo posts with dark node rings, three bamboo rails and a cap rail, and dark X ties
//          (shuro rope) every 46 cm along the rails.
//   PROPS  a hinoki bucket (a closed lathe: outer wall, rim, inner wall, floor) with two dark hoops, and a low wooden
//          bath stool (seat and two slab legs), on the ledge.
//   STEAM  three wisps of five flattened blobs over the water, swaying and thinning as they rise, no ink, so they
//          read soft (opts.steam).
//   Winding: every primitive is three.js-outward; the lathe's is checked by its signed volume and flipped if negative.
// Proportions (real size, base unit the fence height F = 2.0 m): pool outline 4.4 x 3.3 (open water inside the rocks
// ~4.0 x 2.9 = 2 F x 1.45 F), water surface 0.38, front rock tops ~0.45, back rock tops to ~1.25, fence 5.6 long at
// z = -2.3, posts 2.12 (the top), spout mouth 1.02, ledge top 0.36, stool 0.24, bucket 0.22 tall x 0.30, steam to ~1.8.
// Options: build(THREE, kit, colors, { height, steam = true, fence = true }). height scales uniformly so the top of
// what was built (the fence posts; without the fence the tallest rock or wisp) is `height` (the lab skips its height
// check when options are given). fence: false drops the fence; the spout then comes from nowhere over the back rocks.
// Colours (indigo, a night bath under lantern light):
//   water moon #d5e2ff flat (it only faces up); highlight bands, stream and splash line #e7eefc / moon.
//   rocks skin #f0c2ae / sky #1b2d6b at threshold 0.72: only crowns that face the light take the warm lantern tone,
//   every flank is night blue, so each boulder reads alone against its neighbours and against the pale water.
//   fence slats practical #f0c36a / iris #e7a04a; bamboo posts, rails and pipe skin / iris; ties, nodes, hoops, slat
//   gaps and the pipe mouth hair #16141c (lines, flat); bucket and stool sclera #f6f3ee / skin; steam line / moon.

export const meta = {
  name: "onsen",
  height: 2.12,
  script: "indigo",
  colors: {
    water: "#d5e2ff", waterShade: "#d5e2ff",
    shine: "#e7eefc", shineShade: "#d5e2ff",
    rock: "#f0c2ae", rockShade: "#1b2d6b",
    slat: "#f0c36a", slatShade: "#e7a04a",
    bamboo: "#f0c2ae", bambooShade: "#e7a04a",
    tie: "#16141c",
    wood: "#f6f3ee", woodShade: "#f0c2ae",
    steam: "#e7eefc", steamShade: "#d5e2ff",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { steam = true, fence = true } = opts;
  const root = new THREE.Group();
  root.name = "onsen";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  root.add(body);
  const joints = {};

  // ---------- parts merged per material ----------
  const parts = {};
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), v4 = new THREE.Vector3(), s4 = new THREE.Vector3();
  // add a geometry under a placement (position, euler, scale); smooth normals are computed before the move
  function put(key, g, [x, y, z] = [0, 0, 0], [rx, ry, rz] = [0, 0, 0], [sx, sy, sz] = [1, 1, 1]) {
    if (!g.attributes.normal) g.computeVertexNormals();
    m4.compose(v4.set(x, y, z), q4.setFromEuler(e4.set(rx, ry, rz)), s4.set(sx, sy, sz));
    g.applyMatrix4(m4);
    (parts[key] ??= []).push(g.index ? g.toNonIndexed() : g);
  }
  const hash = (i) => { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };

  // ---------- pool outline ----------
  const RX = 2.2, RZ = 1.65, ZC = 0.15, WATER_Y = 0.38;
  const ring = (t, k = 1) => {
    const w = 1 + 0.07 * Math.sin(2 * t + 1.1) + 0.05 * Math.sin(3 * t + 2.3);
    return [k * RX * w * Math.cos(t), ZC - k * RZ * w * Math.sin(t)]; // t = 0 at +X, t = pi/2 at the back (-Z)
  };
  const shapeOf = (k, n = 48) => {
    const sh = new THREE.Shape();
    for (let i = 0; i < n; i++) {
      const [x, z] = ring((i / n) * Math.PI * 2, k);
      i ? sh.lineTo(x, -z) : sh.moveTo(x, -z); // shape y = -z, so rotateX(-pi/2) lays it in the ground plane
    }
    return sh;
  };
  const water = new THREE.ExtrudeGeometry(shapeOf(0.98), { depth: WATER_Y, bevelEnabled: false, curveSegments: 1 });
  water.rotateX(-Math.PI / 2);
  put("water", water);

  // highlight bands: thin crescents across the surface, paint only
  function band(cx, cz, len, wid, yaw) {
    const sh = new THREE.Shape(), n = 12;
    for (let i = 0; i <= n; i++) { const u = i / n, x = (u - 0.5) * len, y = wid * Math.sin(u * Math.PI) + 0.12 * len * (u - 0.5) ** 2; i ? sh.lineTo(x, y) : sh.moveTo(x, y); }
    for (let i = n - 1; i > 0; i--) { const u = i / n, x = (u - 0.5) * len, y = 0.12 * len * (u - 0.5) ** 2; sh.lineTo(x, y); }
    const g = new THREE.ShapeGeometry(sh);
    g.rotateX(-Math.PI / 2);
    put("shine", g, [cx, WATER_Y + 0.006, cz], [0, yaw, 0]);
  }
  band(0.35, 0.45, 2.2, 0.16, 0.25);
  band(0.95, 0.85, 1.1, 0.09, 0.3);

  // ---------- rocks ----------
  function rock(cx, cz, len, wide, tall, yaw, seed) {
    const g = new THREE.SphereGeometry(1, 12, 9);
    const p = g.attributes.position;
    const a = [hash(seed) * 6.28, hash(seed + 1) * 6.28, hash(seed + 2) * 6.28];
    const sq = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e); // < 1 squares the boulder off: flat top, round edges
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const r = 1 + 0.07 * Math.sin(1.6 * x + 1.1 * z + a[0]) + 0.05 * Math.sin(2.0 * z - 1.3 * y + a[1]) + 0.03 * Math.sin(2.6 * y + 1.8 * x + a[2]);
      const ty = y > 0 ? sq(y, 0.75) * (1 + 0.12 * x * Math.sin(a[0])) : y; // a tilted, flattened crown
      p.setXYZ(i, sq(x, 0.8) * r * len, Math.max(ty * r * tall, -0.3 * tall), sq(z, 0.8) * r * wide); // a flat base under the buried part
    }
    g.computeVertexNormals();
    put("rock", g, [cx, 0.3 * tall, cz], [0, yaw, 0]);
  }
  // the ledge spans this arc at the front +X, so the ring skips it
  const LEDGE_T = -0.62;
  let t = 0.05, i = 0;
  while (t < Math.PI * 2 - 0.02) {
    const back = Math.max(0, Math.sin(t)); // 1 at the back
    const len = 0.29 + 0.14 * hash(i * 3) + 0.12 * back;
    const wide = 0.27 + 0.1 * hash(i * 3 + 1) + 0.08 * back;
    const tall = 0.3 + 0.1 * hash(i * 3 + 2) + 0.48 * back * back + 0.06 * Math.max(0, -Math.cos(t));
    const tt = t - (t > Math.PI ? Math.PI * 2 : 0);
    if (Math.abs(tt - LEDGE_T) > 0.34) {
      const [x, z] = ring(t, 1.02 + 0.04 * hash(i + 40));
      const [x1, z1] = ring(t + 0.01);
      rock(x, z, len, wide, tall, -Math.atan2(z1 - z, x1 - x), i * 7 + 3);
    }
    t += (len * 1.45) / (RX * 0.9 + RZ * 0.9 * Math.abs(Math.cos(t))) * 0.9;
    i++;
  }
  // small fillers just outside the ring
  for (const [tf, k, s] of [[0.9, 1.33, 0.26], [1.95, 1.3, 0.3], [2.75, 1.28, 0.24], [4.2, 1.26, 0.22], [4.6, 1.25, 0.25]]) {
    const [x, z] = ring(tf, k);
    rock(x, z, s * 1.2, s, s * 1.1, tf * 1.7, Math.round(tf * 100));
  }
  // the ledge: a flat slab at the front +X, top at LEDGE_TOP
  const [lx, lz] = ring(LEDGE_T, 1.12);
  const LEDGE_TOP = 0.36;
  {
    const g = new THREE.SphereGeometry(1, 16, 10);
    const p = g.attributes.position;
    for (let j = 0; j < p.count; j++) {
      const x = p.getX(j), y = p.getY(j), z = p.getZ(j);
      const r = 1 + 0.06 * Math.sin(2.3 * x + 1.7 * z + 0.4);
      const flat = Math.sign(y) * Math.pow(Math.abs(y), 0.35); // a slab: flat top and sides that round over
      p.setXYZ(j, x * r * 0.78, Math.max(flat * 0.2, -0.16), z * r * 0.55);
    }
    g.computeVertexNormals();
    put("rock", g, [lx, LEDGE_TOP - 0.2, lz], [0, 0.5, 0]);
    // two stones it rests on, so it does not float on the cut base
    rock(lx - 0.35, lz + 0.2, 0.3, 0.26, 0.3, 0.4, 91);
    rock(lx + 0.3, lz - 0.25, 0.32, 0.26, 0.3, 1.2, 92);
  }

  // ---------- props on the ledge ----------
  // stool: seat board and two slab legs
  {
    const sx = lx + 0.2, sz = lz + 0.12, yaw = 0.4;
    const st = new THREE.Group();
    st.position.set(sx, LEDGE_TOP, sz);
    st.rotation.y = yaw;
    st.updateMatrixWorld(true);
    const at = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(st.matrixWorld).toArray();
    put("wood", new THREE.BoxGeometry(0.42, 0.04, 0.24), at(0, 0.22, 0), [0, yaw, 0]);
    for (const s of [-1, 1]) put("wood", new THREE.BoxGeometry(0.04, 0.2, 0.2), at(s * 0.16, 0.1, 0), [0, yaw, 0]);
  }
  // bucket: closed lathe profile, outer wall up, rim, inner wall down, floor; two hoops
  {
    const prof = [[0.001, 0], [0.13, 0], [0.15, 0.22], [0.135, 0.22], [0.118, 0.035], [0.001, 0.035]].map(([r, y]) => new THREE.Vector2(r, y));
    const g = new THREE.LatheGeometry(prof, 18);
    // winding from the signed volume: outward when positive
    const p = g.attributes.position, idx = g.index.array;
    let vol = 0;
    for (let k = 0; k < idx.length; k += 3) {
      const A = [p.getX(idx[k]), p.getY(idx[k]), p.getZ(idx[k])], B = [p.getX(idx[k + 1]), p.getY(idx[k + 1]), p.getZ(idx[k + 1])], C = [p.getX(idx[k + 2]), p.getY(idx[k + 2]), p.getZ(idx[k + 2])];
      vol += A[0] * (B[1] * C[2] - B[2] * C[1]) - A[1] * (B[0] * C[2] - B[2] * C[0]) + A[2] * (B[0] * C[1] - B[1] * C[0]);
    }
    if (vol < 0) { for (let k = 0; k < idx.length; k += 3) { const tmp = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = tmp; } }
    g.deleteAttribute("normal");
    g.computeVertexNormals();
    const bx = lx - 0.28, bz = lz - 0.12;
    put("wood", g, [bx, LEDGE_TOP, bz]);
    for (const [y, r] of [[0.05, 0.136], [0.17, 0.146]]) put("tie", new THREE.TorusGeometry(r, 0.011, 5, 20), [bx, LEDGE_TOP + y, bz], [Math.PI / 2, 0, 0]);
  }

  // ---------- bamboo helpers ----------
  const up = new THREE.Vector3(0, 1, 0);
  // a closed bamboo cylinder from a to b, radius r, with dark node rings every `node` m
  function pole(key, a, b, r, node = 0, seg = 8) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize());
    const e = new THREE.Euler().setFromQuaternion(q);
    const mid = A.clone().add(B).multiplyScalar(0.5);
    put(key, new THREE.CylinderGeometry(r, r, L, seg), mid.toArray(), [e.x, e.y, e.z]);
    if (node) for (let s = node * 0.6; s < L - 0.05; s += node) {
      const pnt = A.clone().addScaledVector(d, s / L);
      const tq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.clone().normalize());
      const te = new THREE.Euler().setFromQuaternion(tq);
      put("tie", new THREE.TorusGeometry(r * 1.02, r * 0.16, 3, seg), pnt.toArray(), [te.x, te.y, te.z]);
    }
  }

  // ---------- fence ----------
  const FZ = -2.3, FX = 2.8, FH = 2.0;
  if (fence) {
    put("slat", new THREE.BoxGeometry(FX * 2, FH - 0.06, 0.04), [0, (FH - 0.06) / 2 + 0.04, FZ]);
    // slat gaps: flat dark strips on the front face, every 9 cm
    for (let x = -FX + 0.09; x < FX - 0.05; x += 0.09) {
      const g = new THREE.PlaneGeometry(0.014, FH - 0.1);
      put("tieFlat", g, [x, (FH - 0.06) / 2 + 0.04, FZ + 0.024]);
    }
    for (const x of [-FX, -FX / 3, FX / 3, FX]) pole("bamboo", [x, 0, FZ + 0.03], [x, 2.12, FZ + 0.03], 0.055, 0.42, 10);
    const rails = [0.38, 1.02, 1.62];
    for (const y of rails) pole("bamboo", [-FX, y, FZ + 0.05], [FX, y, FZ + 0.05], 0.03, 0, 8);
    pole("bamboo", [-FX - 0.04, FH, FZ], [FX + 0.04, FH, FZ], 0.05, 0, 8); // cap rail
    // X ties on the rails between posts
    for (const y of rails) for (let x = -FX + 0.3; x < FX - 0.2; x += 0.46) {
      if (Math.abs(Math.abs(x) - FX / 3) < 0.12) continue;
      for (const s of [-1, 1]) put("tie", new THREE.BoxGeometry(0.014, 0.085, 0.014), [x, y, FZ + 0.08], [0, 0, s * 0.7]);
    }
  }

  // ---------- spout ----------
  const SP0 = [0.95, 1.22, FZ + 0.05], SP1 = [0.5, 1.02, -1.05];
  pole("bamboo", SP0, SP1, 0.065, 0.38, 10);
  {
    const d = new THREE.Vector3(...SP1).sub(new THREE.Vector3(...SP0)).normalize();
    const tq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
    const te = new THREE.Euler().setFromQuaternion(tq);
    put("tie", new THREE.CircleGeometry(0.05, 12), new THREE.Vector3(...SP1).addScaledVector(d, 0.004).toArray(), [te.x, te.y, te.z]); // hollow mouth
  }
  // X stand over the back rocks, at 60 % along the pipe
  {
    const u = 0.6, P = SP0.map((v, k) => v + (SP1[k] - v) * u);
    for (const s of [-1, 1]) pole("bamboo", [P[0] + s * 0.22, 0.12, P[2] - 0.05], [P[0] - s * 0.1, P[1] + 0.12, P[2] + 0.02], 0.025, 0, 6);
    put("tie", new THREE.TorusGeometry(0.04, 0.012, 4, 10), [P[0] - 0.005, P[1] - 0.04, P[2] - 0.01], [0, 0, 0]);
  }
  // the stream along the fall parabola, from inside the mouth to under the surface
  {
    const d = new THREE.Vector3(...SP1).sub(new THREE.Vector3(...SP0)).normalize();
    const v0 = d.clone().multiplyScalar(1.1), pts = [];
    const start = new THREE.Vector3(...SP1).addScaledVector(d, -0.03);
    start.y -= 0.02;
    for (let k = 0; k <= 10; k++) {
      const tk = k * 0.04;
      pts.push(new THREE.Vector3(start.x + v0.x * tk, start.y + v0.y * tk - 4.9 * tk * tk, start.z + v0.z * tk));
      if (pts[k].y < WATER_Y - 0.05) break;
    }
    put("shine", new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.038, 8, false));
    const hit = pts[pts.length - 1];
    // splash ring and droplets
    put("shineFlat", new THREE.RingGeometry(0.1, 0.15, 20), [hit.x, WATER_Y + 0.006, hit.z], [-Math.PI / 2, 0, 0]);
    put("shineFlat", new THREE.RingGeometry(0.22, 0.25, 24), [hit.x, WATER_Y + 0.006, hit.z], [-Math.PI / 2, 0, 0]);
    for (const [dx, dy, dz, r] of [[0.08, 0.06, 0.04, 0.025], [-0.07, 0.09, 0.02, 0.02], [0.02, 0.12, 0.08, 0.018]])
      put("shine", new THREE.SphereGeometry(r, 6, 4), [hit.x + dx, WATER_Y + dy, hit.z + dz]);
  }

  // ---------- steam ----------
  if (steam) {
    // each wisp: five flattened blobs swaying left-right as they rise and thin out
    for (const [x0, z0, s0, ph] of [[-0.95, 0.05, 1.2, 0], [-0.45, -0.75, 1.05, 1], [0.2, 0.6, 0.9, 2]]) {
      for (let k = 0; k < 5; k++) {
        const s = s0 * (0.27 - 0.04 * k);
        const sway = 0.12 * s0 * Math.sin(k * 1.9 + ph * 2.1);
        put("steam", new THREE.SphereGeometry(1, 12, 8), [x0 + sway + 0.06 * k, WATER_Y + 0.2 + k * 0.25 * s0, z0 - 0.04 * k], [0, k + ph, 0], [s * 1.5, s * 0.7, s * 1.1]);
      }
    }
  }

  // ---------- meshes ----------
  const MAT = {
    water: [c.water, c.waterShade, -1, true],
    shine: [c.shine, c.shineShade, 0.1, false],
    shineFlat: [c.shine, c.shineShade, -1, false],
    rock: [c.rock, c.rockShade, 0.72, true],
    slat: [c.slat, c.slatShade, 0.1, true],
    bamboo: [c.bamboo, c.bambooShade, 0.15, true],
    tie: [c.tie, c.tie, 0, false],
    tieFlat: [c.tie, c.tie, -1, false],
    wood: [c.wood, c.woodShade, 0.15, true],
    steam: [c.steam, c.steamShade, -0.2, false],
  };
  for (const [key, list] of Object.entries(parts)) {
    let n = 0;
    for (const g of list) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let o = 0;
    for (const g of list) { pos.set(g.attributes.position.array, o); nor.set(g.attributes.normal.array, o); o += g.attributes.position.count * 3; }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    const [base, shade, threshold, outline] = MAT[key];
    const mesh = kit.toon(g, base, shade, { threshold, outline });
    mesh.name = key;
    body.add(mesh);
  }

  // uniform height: the top of what was built
  if (opts.height) {
    const box = new THREE.Box3().setFromObject(body);
    body.scale.setScalar(opts.height / box.max.y);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
