// tea-field.js - a Shizuoka-style tea plantation (chabatake) on a gentle slope, a diorama tile at real size.
// Contract: harness/lab/README.md. Meters, +Y up, the low edge of the slope faces +Z, its left is +X,
// stands on y = 0, centred on x = 0, z = 0 (the bbox of the tile, 14 x 10 m).
//
// Construction (closed solids merged per material; smooth where it is a form, split normals on boxes; 9 meshes):
//   TILE    one closed solid: a 0.5 m grid top over g(x, z), 5 cm above y = 0 along the whole front edge and rising
//           from there (2.2 m toward -Z, plus up to 1.8 m toward -X at the back), so the hillside turns its face to
//           the low front-right hero camera and the rows stack up the frame; the sides are wedges tapering to the
//           front lip, then a bottom. Material groups by triangle centroid: tilled soil under the rows and on the
//           path, grass on the margins and the back headland; down the sides a 0.3 m grass skirt, a 0.26 m course
//           of terrace stones (dark joints every 0.5 m), bare bank below; every band clamped at y = 0.
//   ROWS    ONE mesh, `rows` hedges (6..14, default 9) running up the slope in gentle parallel S-curves (rings
//           locked to the Z plane, lofted along z and lifted onto the ground at each station). The section is the
//           clipped kamaboko: narrow stems at the soil, bulging sides, a flat arch on top. Rounded ends (two
//           shrinking rings and a pole point). Material groups: the arch faces are the light new-leaf layer
//           (shincha), the sides darker old leaf, so the colour break runs straight along every row: the combed
//           read. Rows nearly touch (0.88 P wide), so the furrows close to dark lines; a 0.9 m path replaces one
//           furrow, right of centre.
//   FANS    three frost-protection fans (boshoo fan) on 5.2 m galvanised poles standing in furrows: a motor pod
//           pitched 35 deg down toward the slope's foot on a short arm, with a thermostat box on the pole. All 9
//           blades (and the 3 spinners) are ONE mesh whose vertices pose() rewrites from the fan hub joints.
//   PROPS   at the top of the path, a small board shed (lean-to, red corrugated roof, a door, a concrete footing
//           under its downhill side); parked across the foot of the path, a two-wheeled handcart tilted to the
//           slope with two bamboo tea baskets heaped with leaf; beside it a sun hat with a red band on a stake.
// Proportions (real size; base unit the row pitch P = 1.4 m at 9 rows): tile 14 x 10 m, ground 0.05 m along the
// front edge to 4.1 m at the back-left; rows 0.85 m tall, 0.88 P wide (1.23 m), path 0.9 m; poles 5.2 m,
// blade disc 1.2 m; shed 2.2 x 1.5 x 2.3 m; cart bed 1.1 x 0.65 m on 0.56 m wheels; hat brim 0.6 m on a 1.2 m stake.
// Options: build(THREE, kit, colors, { height, rows }).
//   rows    number of hedge rows, 6..14 (default 9); width and pitch follow, the tile stays 14 x 10 m, the fans
//           stand in the furrows nearest their marks.
//   height  scales the whole tile uniformly so its top (the highest fan) is `height` (default: real size, 8.16 m at 9 rows).
// Clips: fans 2 s (every blade disc turns once per loop, each fan at its own phase); pose("fans@0.5").
// Budget: 9.2k triangles at 9 rows (rows 4.0k, tile 1.6k, dark incl. stone joints 1.2k), 7.9k at 6, 10.5k at 14.
// Colours (meadow: the only script with field greens and a pale sky):
//   rows side iris #3f8a47 / hair #2c5131, new-leaf top line #a9d16e / iris #3f8a47 (the lighter layer);
//   soil and path skin #f0c2ae flat (meadow has no brown: the warm pale earth between dark rows), grass line /
//   iris, bank skin / accent #d9483b (Shizuoka red clay, on the far faces only); terrace stones moon /
//   sky; metal (poles, pods, footing) sclera #f6f3ee /
//   sky #d7ecef; blades moon #f7f3e1 / sky; wood moon / skin (weathered grey-cream boards); roof accent / hair;
//   straw (baskets, hat) practical #f2c94c / line; leaf heaps line / iris; dark (seams, door gap, tyres) hair flat.

export const meta = {
  name: "tea-field",
  height: 8.157,
  script: "meadow",
  colors: {
    row: "#3f8a47", rowShade: "#2c5131",
    leaf: "#a9d16e", leafShade: "#3f8a47",
    soil: "#f0c2ae",
    grass: "#a9d16e", grassShade: "#3f8a47",
    bank: "#f0c2ae", bankShade: "#d9483b",
    stone: "#f7f3e1", stoneShade: "#d7ecef",
    metal: "#f6f3ee", metalShade: "#d7ecef",
    blade: "#f7f3e1", bladeShade: "#d7ecef",
    wood: "#f7f3e1", woodShade: "#f0c2ae",
    roof: "#d9483b", roofShade: "#2c5131",
    straw: "#f2c94c", strawShade: "#a9d16e",
    dark: "#2c5131",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const rows = Math.max(6, Math.min(14, Math.round(opts.rows ?? 9)));
  const D = Math.PI / 180, TAU = Math.PI * 2;
  const root = new THREE.Group();
  root.name = "tea-field";
  const body = new THREE.Group(); // the uniform height scale lives here
  body.name = "body";
  root.add(body);
  const joints = {};

  // ---------- accumulators: key -> positions, index buckets (material groups), vertex owner (moving mesh) ----------
  const acc = {};
  let X = new THREE.Matrix4(); // placement of the part being built (rigid, so the winding test survives it)
  const v3 = new THREE.Vector3();
  const local = (m, fn) => { const prev = X; X = prev.clone().multiply(m); fn(); X = prev; };
  const M = (x, y, z, ry = 0, rx = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), new THREE.Vector3(1, 1, 1));
  // a closed solid: pts [[x,y,z]], idx triangle triples, grp a group per triangle (or one number); wound from its volume
  function solid(key, pts, idx, grp = 0, owner = -1) {
    const a = (acc[key] ??= { p: [], g: [[], [], [], []], o: [] });
    const P = pts.map((p) => v3.set(p[0], p[1], p[2]).applyMatrix4(X).toArray());
    let vol = 0;
    for (let i = 0; i < idx.length; i += 3) {
      const [p, q, r] = [P[idx[i]], P[idx[i + 1]], P[idx[i + 2]]];
      vol += p[0] * (q[1] * r[2] - q[2] * r[1]) - p[1] * (q[0] * r[2] - q[2] * r[0]) + p[2] * (q[0] * r[1] - q[1] * r[0]);
    }
    const base = a.p.length / 3;
    for (const p of P) a.p.push(...p), a.o.push(owner);
    for (let i = 0, t = 0; i < idx.length; i += 3, t++) {
      const g = a.g[typeof grp === "number" ? grp : grp[t]];
      if (vol >= 0) g.push(base + idx[i], base + idx[i + 1], base + idx[i + 2]);
      else g.push(base + idx[i], base + idx[i + 2], base + idx[i + 1]);
    }
  }
  // convex hexahedron, p[0..3] one face, p[4..7] the opposite face in the same order; split normals per face
  function hex(key, p, grp = 0, owner = -1) {
    const pts = [], idx = [];
    for (const f of [[0, 1, 2, 3], [7, 6, 5, 4], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]]) {
      const b = pts.length;
      pts.push(...f.map((k) => p[k]));
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    solid(key, pts, idx, grp, owner);
  }
  function box(key, cx, cy, cz, sx, sy, sz, grp = 0) {
    const [x0, x1, y0, y1, z0, z1] = [cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2];
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], grp);
  }
  // lathe about local +Y: prof [[r, y]] from the bottom pole (r 0) to the top pole (r 0); repeat a point for a crease
  function lathe(key, prof, n, owner = -1) {
    const pts = [], idx = [];
    for (const [r, y] of prof) for (let j = 0; j < n; j++) pts.push([r * Math.cos((j / n) * TAU), y, r * Math.sin((j / n) * TAU)]);
    for (let i = 0; i < prof.length - 1; i++)
      for (let j = 0; j < n; j++) {
        const a = i * n + j, b = i * n + ((j + 1) % n);
        idx.push(a, b, b + n, a, b + n, a + n);
      }
    solid(key, pts, idx, 0, owner);
  }
  const cyl = (key, r, h, n, y0 = 0) => lathe(key, [[0, y0], [r, y0], [r, y0], [r, y0 + h], [r, y0 + h], [0, y0 + h]], n);
  // a rod from a to b (world, under X), radius r
  function rod(key, a, b, r, n = 6) {
    const d = new THREE.Vector3(...b).sub(new THREE.Vector3(...a)), L = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    local(new THREE.Matrix4().compose(new THREE.Vector3(...a), q, new THREE.Vector3(1, 1, 1)), () => cyl(key, r, L, n));
  }

  // ---------- the ground ----------
  const W = 14, DP = 10, HX = W / 2, HZ = DP / 2;
  const g = (x, z) => 0.05 + 0.22 * (HZ - z) + 0.13 * (HX - x) * ((HZ - z) / DP) + 0.15 * Math.sin((Math.PI * (HZ - z)) / DP);
  // rows region and the path's S-curve
  const RX = 6.5, ZF = 3.65, ZB = -3.0; // rows fill |x| < RX, z in (ZB, ZF); grass beyond
  const PATH = 0.9;
  const bend = (z) => 0.45 * Math.sin((TAU * (z + 1)) / 13);
  const P = (2 * RX - PATH + 0.3) / rows; // pitch (a normal furrow is P - 2 hw)
  const hw = Math.min(0.66, 0.44 * P); // row half-width
  const kPath = Math.round(rows * 0.62) - 1; // the path runs between row kPath and kPath + 1
  const rowX = [];
  for (let i = 0; i < rows; i++) rowX.push(-RX + hw + i * P + (i > kPath ? PATH - (P - 2 * hw) : 0));
  const shiftX = -((rowX[0] - hw) + (rowX[rows - 1] + hw)) / 2;
  for (let i = 0; i < rows; i++) rowX[i] += shiftX;
  const pathX = (rowX[kPath] + rowX[kPath + 1]) / 2; // at bend 0
  const furrowX = (i) => (rowX[i] + rowX[i + 1]) / 2;
  {
    const NX = 28, NZ = 20, pts = [], idx = [], grp = [];
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
      const x = -HX + (i * W) / NX, z = -HZ + (j * DP) / NZ;
      pts.push([x, g(x, z), z]);
    }
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i, b = a + 1, d = a + NX + 1, e = d + 1;
      const cx = -HX + ((i + 0.5) * W) / NX, cz = -HZ + ((j + 0.5) * DP) / NZ;
      const onPath = Math.abs(cx - pathX - bend(cz)) < 0.5 && (cz < ZB + 0.25 || cz > ZF);
      const soil = (Math.abs(cx) < RX && cz > ZB && cz < 4.5) || onPath;
      idx.push(a, d, b, b, d, e);
      grp.push(soil ? 0 : 2, soil ? 0 : 2);
    }
    // sides (wedges from a 5 cm lip at the front): split vertices, a grass skirt, a course of terrace stones with
    // dark joints every 0.5 m, then bare bank, each band clamped at y = 0; then the bottom
    const BANDS = [[0, 0.3, 2], [0.3, 0.56, 3], [0.56, Infinity, 1]];
    const ring = [];
    for (let i = 0; i <= NX; i++) ring.push([-HX + (i * W) / NX, HZ]);
    for (let j = NZ - 1; j >= 0; j--) ring.push([HX, -HZ + (j * DP) / NZ]);
    for (let i = NX - 1; i >= 0; i--) ring.push([-HX + (i * W) / NX, -HZ]);
    for (let j = 1; j <= NZ; j++) ring.push([-HX, -HZ + (j * DP) / NZ]);
    for (let k = 0; k < ring.length - 1; k++) {
      const [x0, z0] = ring[k], [x1, z1] = ring[k + 1];
      if (x0 === x1 && z0 === z1) continue;
      const [t0, t1] = [g(x0, z0), g(x1, z1)];
      for (const [d0, d1, gr] of BANDS) {
        const [ya0, ya1, yb0, yb1] = [t0 - d0, t1 - d0, t0 - d1, t1 - d1].map((y) => Math.max(0, y));
        if (ya0 <= 0 && ya1 <= 0) continue;
        const b = pts.length;
        pts.push([x0, ya0, z0], [x1, ya1, z1], [x1, yb1, z1], [x0, yb0, z0]);
        idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
        grp.push(gr, gr);
      }
      const [mx, mz, mt] = [(x0 + x1) / 2, (z0 + z1) / 2, (t0 + t1) / 2];
      const [ox, oz] = Math.abs(mx) > HX - 1e-6 ? [Math.sign(mx), 0] : [0, Math.sign(mz)];
      const jy0 = Math.max(0, mt - 0.56), jy1 = Math.max(0, mt - 0.3);
      if (jy1 - jy0 > 0.08) box("dark", mx + ox * 0.006, (jy0 + jy1) / 2, mz + oz * 0.006, ox ? 0.012 : 0.03, jy1 - jy0, oz ? 0.012 : 0.03);
    }
    const b = pts.length;
    pts.push([-HX, 0, -HZ], [HX, 0, -HZ], [HX, 0, HZ], [-HX, 0, HZ]);
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    grp.push(1, 1);
    solid("ground", pts, idx, grp);
  }

  // ---------- tea rows: one mesh, side / new-leaf groups ----------
  {
    // section in (half-width units, height units); the arch (top) faces are the new-leaf group
    const SEC = [[-0.6, -0.2], [-0.78, 0.3], [-1, 0.62], [-0.97, 0.8], [-0.55, 0.95], [0, 1],
      [0.55, 0.95], [0.97, 0.8], [1, 0.62], [0.78, 0.3], [0.6, -0.2]];
    const TOP = (k) => k >= 2 && k <= 7; // segment k joins SEC[k] and SEC[k+1]
    const H = 0.85, NSt = rows > 10 ? 12 : 15;
    for (let r = 0; r < rows; r++) {
      const x0 = rowX[r];
      // stations: [z, width scale, height scale]
      const st = [];
      const z1 = ZF - 0.12, z0 = ZB + 0.12;
      st.push([z1 + 0.13, 0.55, 0.8], [z1 + 0.06, 0.88, 0.95]);
      for (let s = 0; s <= NSt; s++) st.push([z1 - (s * (z1 - z0)) / NSt, 1, 1]);
      st.push([z0 - 0.06, 0.88, 0.95], [z0 - 0.13, 0.55, 0.8]);
      const pts = [], idx = [], grp = [], n = SEC.length;
      for (const [z, ws, hs] of st) {
        const xc = x0 + bend(z), y0 = g(xc, z) - 0.02;
        const wob = 1 + 0.03 * Math.sin(z * 2.3 + r * 1.7); // a hand-clipped row is not machined
        for (const [u, v] of SEC) pts.push([xc + u * hw * ws * wob, y0 + Math.max(v, -0.2) * H * hs * (v > 0 ? wob : 1), z]);
      }
      for (let i = 0; i < st.length - 1; i++)
        for (let k = 0; k < n; k++) {
          const a = i * n + k, b = i * n + ((k + 1) % n);
          idx.push(a, b, b + n, a, b + n, a + n);
          grp.push(TOP(k) ? 1 : 0, TOP(k) ? 1 : 0);
        }
      // poles at the two ends
      for (const [end, zz, dz] of [[0, st[0][0] + 0.05, 0], [st.length - 1, st.at(-1)[0] - 0.05, 0]]) {
        const xc = x0 + bend(zz), pi = pts.length;
        pts.push([xc, g(xc, zz) + 0.42 * H, zz + dz]);
        for (let k = 0; k < n; k++) {
          if (!end) idx.push(pi, end * n + ((k + 1) % n), end * n + k);
          else idx.push(pi, end * n + k, end * n + ((k + 1) % n));
          grp.push(TOP(k) ? 1 : 0);
        }
      }
      solid("rows", pts, idx, grp);
    }
  }

  // ---------- frost fans ----------
  const fans = [];
  {
    const near = (x) => { // the furrow (not the path) nearest x
      let best = 0;
      for (let i = 0; i < rows - 1; i++) if (i !== kPath && Math.abs(furrowX(i) - x) < Math.abs(furrowX(best) - x)) best = i;
      return best;
    };
    const spots = [[near(-4.2), 1.2], [near(-1.0), -2.2], [near(4.3), 0.2]];
    const POLE = 5.2;
    spots.forEach(([i, z], k) => {
      const x = furrowX(i) + bend(z), y = g(x, z);
      const top = y + POLE;
      rod("metal", [x, y - 0.3, z], [x, top + 0.1, z], 0.065, 8);
      box("metal", x + 0.09, y + 1.5, z, 0.12, 0.26, 0.18); // thermostat box
      // pod frame: yaw toward the slope foot, pitched down
      const yaw = k * 6 * D, pitch = 35 * D;
      const hub = new THREE.Object3D();
      hub.name = `fan${k}`;
      hub.rotation.order = "YXZ";
      const fwd = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"));
      const pod = new THREE.Vector3(x, top + 0.18, z).addScaledVector(fwd, 0.22);
      hub.position.copy(pod).addScaledVector(fwd, 0.3);
      hub.rotation.set(pitch, yaw, 0);
      body.add(hub);
      joints[hub.name] = hub;
      fans.push(hub);
      rod("metal", [x, top + 0.05, z], [pod.x, pod.y - 0.02, pod.z], 0.05, 6); // the arm up to the pod
      local(M(pod.x, pod.y, pod.z, yaw, pitch + Math.PI / 2), () => {
        lathe("metal", [[0, -0.5], [0.13, -0.48], [0.19, -0.34], [0.19, 0.1], [0.15, 0.22], [0, 0.24]].map(([r, y]) => [r, y]), 10);
      });
    });
  }
  // blades in hub-local frames (axis local +Z), owner = fan index
  {
    const NB = 3, R0 = 0.07, R1 = 0.6;
    fans.forEach((hub, k) => {
      local(M(0, 0, 0, 0, Math.PI / 2), () => lathe("blades", [[0, -0.02], [0.09, -0.02], [0.09, 0.05], [0.05, 0.11], [0, 0.13]], 8, k));
      for (let b = 0; b < NB; b++) {
        const a = (b / NB) * TAU, ca = Math.cos(a), sa = Math.sin(a);
        // blade in a radial frame: along r, width w, pitched 24 deg about the radial axis
        const pt = (r, w, t) => {
          const tw = 24 * D, wy = w * Math.cos(tw), wz = w * Math.sin(tw) + t;
          return [r * ca - wy * sa, r * sa + wy * ca, wz];
        };
        const [w0, w1, t] = [0.05, 0.13, 0.012];
        hex("blades", [pt(R0, -w0, -t), pt(R1, -w1, -t), pt(R1, w1 * 0.6, -t), pt(R0, w0, -t),
          pt(R0, -w0, t), pt(R1, -w1, t), pt(R1, w1 * 0.6, t), pt(R0, w0, t)], 0, k);
      }
    });
  }

  // ---------- props ----------
  const pz = (z) => pathX + bend(z);
  // shed at the top of the path
  {
    const sx = pz(-4.0) + 1.7, sz = -4.0, SW = 2.2, SD = 1.5;
    const yMax = g(sx - SW / 2, sz - SD / 2), yMin = g(sx + SW / 2, sz + SD / 2);
    const y0 = yMax + 0.05;
    box("metal", sx, (yMin - 0.15 + y0) / 2, sz, SW + 0.1, y0 - yMin + 0.15, SD + 0.1); // footing
    const HF = 2.3, HB = 1.95; // eave heights front, back
    hex("wood", [[sx - SW / 2, y0, sz + SD / 2], [sx + SW / 2, y0, sz + SD / 2], [sx + SW / 2, y0, sz - SD / 2], [sx - SW / 2, y0, sz - SD / 2],
      [sx - SW / 2, y0 + HF, sz + SD / 2], [sx + SW / 2, y0 + HF, sz + SD / 2], [sx + SW / 2, y0 + HB, sz - SD / 2], [sx - SW / 2, y0 + HB, sz - SD / 2]]);
    // roof: a slab overhanging, falling to the back
    const o = 0.22, th = 0.07, yf = y0 + HF + 0.04, yb = y0 + HB + 0.04, k = (yf - yb) / SD;
    const zf = sz + SD / 2 + o, zb = sz - SD / 2 - o, yF = yf + k * o, yB = yb - k * o;
    hex("roof", [[sx - SW / 2 - o, yF, zf], [sx + SW / 2 + o, yF, zf], [sx + SW / 2 + o, yB, zb], [sx - SW / 2 - o, yB, zb],
      [sx - SW / 2 - o, yF + th, zf], [sx + SW / 2 + o, yF + th, zf], [sx + SW / 2 + o, yB + th, zb], [sx - SW / 2 - o, yB + th, zb]]);
    // corrugation ribs along the fall line
    for (let i = 0; i < 9; i++) {
      const x = sx - SW / 2 - o + 0.15 + (i * (SW + 2 * o - 0.3)) / 8;
      hex("roof", [[x - 0.035, yF + th, zf], [x + 0.035, yF + th, zf], [x + 0.035, yB + th, zb], [x - 0.035, yB + th, zb],
        [x - 0.035, yF + th + 0.04, zf], [x + 0.035, yF + th + 0.04, zf], [x + 0.035, yB + th + 0.04, zb], [x - 0.035, yB + th + 0.04, zb]]);
    }
    // front: a door (dark gap and a board leaf), board seams on the front and the +X side
    const fz = sz + SD / 2;
    box("dark", sx - 0.35, y0 + 0.95, fz + 0.005, 0.86, 1.82, 0.02);
    box("wood", sx - 0.35, y0 + 0.93, fz + 0.03, 0.74, 1.74, 0.04);
    box("dark", sx - 0.08, y0 + 0.95, fz + 0.055, 0.05, 0.12, 0.02); // the pull
    for (let i = 0; i < 4; i++) box("dark", sx + 0.25 + i * 0.22, y0 + 1.1, fz + 0.006, 0.025, 2.1, 0.012);
    for (let i = 0; i < 6; i++) box("dark", sx + SW / 2 + 0.006, y0 + 1.0, sz - SD / 2 + 0.23 + i * 0.23, 0.012, 1.9, 0.025);
  }
  // handcart parked across the foot of the path, nose to +X, tilted to the slope
  {
    const z = 4.25, x = pz(z) - 1.75, y = g(x, z);
    const roll = Math.atan2(g(x, z - 0.5) - g(x, z + 0.5), 1), pitch = Math.atan2(g(x - 0.5, z) - g(x + 0.5, z), 1);
    local(M(x, y, z, Math.PI / 2, pitch, roll), () => {
      // wheels at the back (-z), axle across x
      for (const s of [-1, 1]) local(M(s * 0.4, 0.28, -0.2, 0, 0, Math.PI / 2), () => {
        lathe("dark", [[0, -0.035], [0.22, -0.035], [0.28, -0.02], [0.28, 0.02], [0.22, 0.035], [0, 0.035]], 12);
        lathe("wood", [[0, -0.05], [0.07, -0.05], [0.07, 0.05], [0, 0.05]], 8);
      });
      box("wood", 0, 0.5, 0.1, 0.65, 0.07, 1.1); // bed
      for (const s of [-1, 1]) {
        box("wood", s * 0.36, 0.6, 0.1, 0.05, 0.14, 1.1); // side rails
        rod("wood", [s * 0.27, 0.52, 0.6], [s * 0.24, 0.72, 1.3], 0.022); // handles, rising forward
        rod("wood", [s * 0.27, 0.47, 0.55], [s * 0.27, -0.02, 0.6], 0.025); // stand legs
      }
      rod("wood", [-0.24, 0.72, 1.28], [0.24, 0.72, 1.28], 0.022); // grip bar
      rod("metal", [-0.42, 0.28, -0.2], [0.42, 0.28, -0.2], 0.02);
      for (const [bx, bz] of [[-0.14, -0.15], [0.15, 0.32]]) local(M(bx, 0.53, bz), () => {
        lathe("straw", [[0, 0], [0.19, 0], [0.19, 0.01], [0.25, 0.4], [0.27, 0.42], [0.24, 0.42], [0, 0.42]], 12);
        lathe("heap", [[0, 0.36], [0.24, 0.36], [0.23, 0.44], [0.15, 0.53], [0, 0.56]], 10);
      });
    });
  }
  // sun hat on a stake at the foot of the path
  {
    const z = 4.62, x = pz(z) + 1.3, y = g(x, z);
    rod("wood", [x, y - 0.1, z], [x, y + 1.2, z], 0.03, 6);
    local(M(x, y + 1.2, z, 30 * D, 0.12, -0.18), () => {
      lathe("straw", [[0, 0], [0.3, -0.01], [0.31, 0.0], [0.3, 0.02], [0.13, 0.03], [0.13, 0.12], [0.11, 0.17], [0, 0.18]], 16);
      lathe("roof", [[0, 0.03], [0.137, 0.03], [0.137, 0.075], [0, 0.075]], 16);
    });
  }

  // ---------- meshes ----------
  const MAT = { // key: [[base, shade, threshold] per group], ink px (0 = none)
    ground: [[[c.soil, c.soil, -1], [c.bank, c.bankShade, 0.25], [c.grass, c.grassShade, 0.3], [c.stone, c.stoneShade, 0.25]], 3],
    rows: [[[c.row, c.rowShade, 0.25], [c.leaf, c.leafShade, 0.3]], 2.5],
    metal: [[[c.metal, c.metalShade, 0.2]], 2],
    blades: [[[c.blade, c.bladeShade, 0.1]], 2],
    wood: [[[c.wood, c.woodShade, 0.2]], 2.5],
    roof: [[[c.roof, c.roofShade, 0.1]], 2.5],
    straw: [[[c.straw, c.strawShade, 0.15]], 2],
    heap: [[[c.leaf, c.leafShade, 0.2]], 2],
    dark: [[[c.dark, c.dark, -1]], 0],
  };
  let bladeMesh = null, rest = null;
  for (const [key, a] of Object.entries(acc)) {
    const [tones, px] = MAT[key];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(a.p, 3));
    const index = [];
    let start = 0;
    a.g.forEach((b, k) => { if (b.length) { geo.addGroup(start, b.length, Math.min(k, tones.length - 1)); index.push(...b); start += b.length; } });
    geo.setIndex(index);
    geo.computeVertexNormals();
    const [b0, s0, t0] = tones[0];
    const mesh = kit.toon(geo, b0, s0, px ? { threshold: t0, px } : { threshold: t0, outline: false });
    if (tones.length > 1) mesh.material = tones.map(([b, s, t]) => kit.cel(b, s, { threshold: t }));
    mesh.name = key;
    body.add(mesh);
    if (key === "blades") {
      bladeMesh = mesh;
      kit.hullNormals(geo);
      const hn = geo.attributes.hullNormal;
      rest = { p: Float32Array.from(a.p), n: Float32Array.from(geo.attributes.normal.array), h: hn ? Float32Array.from(hn.array) : null, o: a.o };
      mesh.frustumCulled = false;
      mesh.children.forEach((h) => (h.frustumCulled = false));
    }
  }

  // rewrite the blade mesh from the fan hubs (each spins about its local +Z)
  const MS = fans.map(() => new THREE.Matrix4()), NS = fans.map(() => new THREE.Matrix3());
  function rig() {
    fans.forEach((f, k) => (f.updateMatrix(), MS[k].copy(f.matrix), NS[k].getNormalMatrix(MS[k])));
    const geo = bladeMesh.geometry, P3 = geo.attributes.position.array, N3 = geo.attributes.normal.array, H3 = geo.attributes.hullNormal?.array;
    for (let v = 0; v < rest.o.length; v++) {
      const k = rest.o[v], i = v * 3;
      v3.fromArray(rest.p, i).applyMatrix4(MS[k]).toArray(P3, i);
      v3.fromArray(rest.n, i).applyMatrix3(NS[k]).normalize().toArray(N3, i);
      if (H3 && rest.h) v3.fromArray(rest.h, i).applyMatrix3(NS[k]).normalize().toArray(H3, i);
    }
    geo.attributes.position.needsUpdate = geo.attributes.normal.needsUpdate = true;
    if (H3) geo.attributes.hullNormal.needsUpdate = true;
    geo.computeBoundingSphere(), geo.computeBoundingBox();
  }

  // ---------- poses and clips ----------
  const CLIPS = { fans: 2 };
  const PHASE = [0, 0.37, 0.71]; // turns
  function spin(t) {
    fans.forEach((f, k) => (f.rotation.z = TAU * (t / 2 + PHASE[k])));
    rig();
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`tea-field: no clip "${m[1]}" (clips: fans)`);
      return spin((((+m[2]) % 2) + 2) % 2);
    }
    if (name !== "rest") throw new Error(`tea-field: unknown pose "${name}" (rest, or fans@<seconds>)`);
    spin(0);
  }
  pose("rest");
  const top = new THREE.Box3().setFromObject(body).max.y;
  if (opts.height) body.scale.setScalar(opts.height / top);
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
