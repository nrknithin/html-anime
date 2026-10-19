// yakiimo.js - an autumn ishi-yaki-imo (stone-baked sweet potato) kei truck parked on a quiet residential street,
// a real-size set piece. Animated: the clip `smoke` (2 s loop) lifts four puffs out of the oven chimney.
// Contract: harness/lab/README.md. Meters, +Y up, stands on y = 0, centred on x = 0, z = 0. Authored with the street
// along x and the wall at -z, then turned 90 degrees so the street runs along Z, the wall is at -X and everything
// faces +X: the lit side, and the long side of the truck the hero camera (az 52) sees. The truck's cab points +Z.
//
// Construction (three.js primitives placed by matrix and merged into one triangle soup per material, so the set is
// a dozen meshes; boxes stay flat-shaded, lathes and spheres keep smooth normals):
//   STREET  an asphalt slab (10 x 5.2 m), a white edge line, a raised gutter curb with lid joints, a concrete-block
//           wall with a pale cap and inked block joints, a manhole cover in the foreground.
//   POLE    a concrete utility pole on the curb at the far end: step bolts, a crossarm with insulators, two
//           sagging wires running the length of the street.
//   TREE    a persimmon behind the wall at the near end, leaning over it: bare tapered rod branches hung with
//           many orange fruit (late autumn); fallen leaves (seeded, no Math.random) scattered on the road and curb below it.
//   TRUCK   a white cab-over kei pickup (3.4 m, + a 0.3 m tailgate folded flat): extruded cab profile with
//           a slanted windshield, dark glass, wheel arches, mirrors, lamps; flat bed with low side gates.
//   OVEN    on the bed: a tall black iron box whose top slopes 33 degrees down toward the street so the stone bed
//           shows above the side gate and the cab roof even from the hero's low camera. Lid hinged at the high
//           back edge, propped past vertical with a stay.
//           Pale stones (low icosahedra) fill the tray; seven purple-skinned sweet potatoes lie on them, one broken
//           to show its golden flesh. Firebox window glows at the front; chimney pipe at the cab end.
//   EXTRAS  a red chochin hung off the front bed corner on the street side, below the tray lip; a plain red nobori
//           with pale hems (no lettering) on a pole at the rear street-side corner; a kraft bag of potatoes on the
//           folded tailgate.
//   SMOKE   four pale puffs (spheres) in ONE mesh whose vertices pose() rewrites: each rises 1.1 m from the chimney
//           mouth, drifts toward the cab, grows in for 12 % of its life and shrinks to nothing (no hull, so a
//           vanishing puff leaves no ink dot). Rest shows smoke@0.3.
// Proportions (real size; base unit the truck length L = 3.4 m): cab top 1.78 (0.52 L), bed floor 0.68, wheel
// radius 0.27, wheelbase 1.9; oven 1.2 x 1.0, tray 1.3 -> 1.95 high, lid top 3.06; chimney mouth 3.0; nobori top
// 3.06; wall 1.72; persimmon crown 4.3 (fruit 0.2 across, stylised large to survive 480 px); pole top 6.8 = height.
// Set 10 x 6 m (z x x).
// Options: build(THREE, kit, colors, { height }) scales the whole set uniformly so the pole top is `height`.
// Colours (noon, warm autumn): truck body and wall cap moon #fff6e4 / sky #f2d7ae; iron, tyres, glass, branches iris
// #5c3d32 / hair #241c16 (no noon tone lies between iris and ink, so hair is the dark shade, as on the noon houses);
// sweet potato skin accent #c4452d / iris (the script's nearest to beni-imo red-purple, its shade the iris
// purple-brown); persimmon fruit and lantern accent / iris; stones sclera #f6f3ee / skin #f0c2ae; flesh, kraft bag,
// insulators, headlamps sky / skin; concrete (wall, curb, pole) sky / skin; road skin / sky; lines hair, flat;
// paint sclera, flat; fire glow practical #fffaf2 over accent; smoke moon / sclera, no hull. Fallen leaves: two
// thirds accent (with the fruit), a third iris (the `leaves` mesh).

export const meta = {
  name: "yakiimo",
  height: 6.8,
  script: "noon",
  colors: {
    body: "#fff6e4", bodyShade: "#f2d7ae",
    iron: "#5c3d32", ironShade: "#241c16",
    potato: "#c4452d", potatoShade: "#5c3d32",
    red: "#c4452d", redShade: "#5c3d32",
    stone: "#f6f3ee", stoneShade: "#f0c2ae",
    kraft: "#f2d7ae", kraftShade: "#f0c2ae",
    concrete: "#f2d7ae", concreteShade: "#f0c2ae",
    road: "#f0c2ae", roadShade: "#f2d7ae",
    line: "#241c16",
    paint: "#f6f3ee",
    glow: "#fffaf2", glowShade: "#c4452d",
    smoke: "#fff6e4", smokeShade: "#f6f3ee",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const { height = meta.height } = opts;
  const root = new THREE.Group();
  root.name = "yakiimo";
  const set = new THREE.Group(); // the uniform size scale lives here
  set.name = "set";
  set.scale.setScalar(height / meta.height);
  set.rotation.y = Math.PI / 2; // authored with the street along x; turned so the street side faces +X (the lit side)
  root.add(set);
  const joints = {};
  const D = Math.PI / 180;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // seeded random (deterministic, no Math.random)
  let seed = 20261019;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

  // ---------- soups: primitives placed by a matrix, merged per material ----------
  const soups = {};
  let OX = 0, OZ = 0; // offset for the truck's local frame
  function put(key, geo, m) {
    const g = (geo.index ? geo.toNonIndexed() : geo).applyMatrix4(m);
    if (OX || OZ) g.translate(OX, 0, OZ);
    const s = (soups[key] ??= { p: [], n: [] });
    s.p.push(...g.attributes.position.array);
    s.n.push(...g.attributes.normal.array);
    geo.dispose();
  }
  const at = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
    new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(sx, sy, sz));
  const box = (key, x0, x1, y0, y1, z0, z1) =>
    put(key, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), at((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
  const along = (a, b) => new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
  // a box of cross-section w (local x) x h (local z) from a to b
  function beam(key, a, b, w, h) {
    const A = V(...a), B = V(...b);
    put(key, new THREE.BoxGeometry(w, A.distanceTo(B), h), new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), along(A, B), V(1, 1, 1)));
  }
  // a round rod from a (radius r0) to b (radius r1)
  function rod(key, a, b, r0, r1 = r0, seg = 6) {
    const A = V(...a), B = V(...b);
    put(key, new THREE.CylinderGeometry(r1, r0, A.distanceTo(B), seg), new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), along(A, B), V(1, 1, 1)));
  }
  // a polyline wire as rods
  function wire(key, pts, r) {
    for (let i = 0; i + 1 < pts.length; i++) rod(key, pts[i], pts[i + 1], r, r, 4);
  }

  // ================= STREET =================
  const RY = 0.02; // road top
  box("road", -5, 5, 0, RY, -2.2, 3.0);
  box("paint", -5, 5, RY, RY + 0.004, -1.98, -1.88); // edge line
  box("concrete", -5, 5, 0, 0.12, -2.6, -2.2); // gutter curb
  for (let x = -4.4; x < 5; x += 0.6) box("line", x - 0.006, x + 0.006, 0.12, 0.123, -2.6, -2.2);
  box("concrete", -5, 5, 0, 0.12, -3.0, -2.75); // yard behind the wall
  // block wall: 0.15 thick, joints every 0.2 high and 0.4 long (staggered), pale cap
  const WZ0 = -2.75, WZ1 = -2.6, WY0 = 0.12, WY1 = 1.66;
  box("concrete", -5, 5, WY0, WY1, WZ0, WZ1);
  box("body", -5.02, 5.02, WY1, WY1 + 0.06, WZ0 - 0.02, WZ1 + 0.02);
  // joints are flat quads on the street face (2 triangles each)
  const quad = (x0, x1, y0, y1) => put("line", new THREE.PlaneGeometry(x1 - x0, y1 - y0), at((x0 + x1) / 2, (y0 + y1) / 2, WZ1 + 0.003));
  for (let r = 1; r * 0.2 + WY0 < WY1 - 0.05; r++) quad(-5, 5, WY0 + r * 0.2 - 0.007, WY0 + r * 0.2 + 0.007);
  for (let r = 0; r * 0.2 + WY0 < WY1; r++) {
    const y0 = WY0 + r * 0.2, y1 = Math.min(WY1, y0 + 0.2);
    for (let x = -4.8 + (r % 2) * 0.2; x < 5; x += 0.4) quad(x - 0.007, x + 0.007, y0, y1);
  }
  // manhole cover, foreground left
  put("iron", new THREE.CylinderGeometry(0.32, 0.32, 0.012, 24), at(2.5, RY + 0.006, 1.5));
  for (const r of [0.27, 0.16]) put("line", new THREE.TorusGeometry(r, 0.008, 3, 24), at(2.5, RY + 0.012, 1.5, 90 * D));
  for (const a of [0, 60, 120]) put("line", new THREE.BoxGeometry(0.5, 0.004, 0.012), at(2.5, RY + 0.013, 1.5, 0, a * D, 0));

  // ================= UTILITY POLE =================
  const PX = 4.6, PZ = -2.4, PTOP = 6.8;
  rod("concrete", [PX, 0.12, PZ], [PX, PTOP, PZ], 0.16, 0.115, 12);
  for (let y = 2.2, i = 0; y < 6.1; y += 0.42, i++) {
    const a = (i % 2 ? 1 : -1) * 0.75 + Math.PI / 2; // bolts toward the street, alternating
    rod("iron", [PX, y, PZ], [PX + Math.cos(a) * 0.3, y, PZ + Math.sin(a) * 0.3], 0.014, 0.014, 4);
  }
  box("iron", PX - 0.05, PX + 0.05, 6.22, 6.32, -2.98, -1.82);
  const INS = [-2.86, -2.4, -1.94];
  for (const z of INS) put("kraft", new THREE.CylinderGeometry(0.035, 0.05, 0.12, 8), at(PX, 6.38, z));
  // wires along the street, sagging between the pole and the set edges
  for (const z of [INS[0], INS[2]]) {
    for (const [x0, x1, sag] of [[PX, -5, 0.5], [PX, 5, 0.06]]) {
      const pts = [];
      for (let i = 0; i <= 8; i++) {
        const u = i / 8;
        pts.push([x0 + (x1 - x0) * u, 6.44 - sag * 4 * u * (1 - u) - (x1 < 0 ? 0.25 * u : 0), z]);
      }
      wire("line", pts, 0.012);
    }
  }

  // ================= PERSIMMON TREE (behind the wall at -x, leaning over it toward the street) =================
  const fruitAt = [];
  const T0 = [-3.75, 0.12, -2.95], T1 = [-3.6, 1.5, -2.88], T2 = [-3.35, 2.35, -2.6];
  rod("iron", T0, T1, 0.16, 0.14, 8);
  rod("iron", T1, T2, 0.14, 0.11, 8);
  put("iron", new THREE.SphereGeometry(0.11, 8, 6), at(...T2));
  const MAIN = [
    [[-2.65, 3.15, -1.85], [-2.05, 3.45, -1.2]],
    [[-3.25, 3.5, -1.95], [-3.0, 4.2, -1.45]],
    [[-4.1, 3.3, -2.0], [-4.65, 3.8, -1.55]],
    [[-4.3, 2.9, -2.7], [-4.85, 3.25, -2.45]],
    [[-2.85, 3.1, -2.8], [-2.35, 3.75, -2.7]],
  ];
  for (const [m, tip] of MAIN) {
    rod("iron", T2, m, 0.09, 0.065, 6);
    put("iron", new THREE.SphereGeometry(0.065, 6, 5), at(...m));
    rod("iron", m, tip, 0.065, 0.025, 6);
    fruitAt.push([tip[0], tip[1] - 0.12, tip[2]]);
    // three twigs off each main branch, fruit hanging along and at the end
    for (const u of [0.2, 0.55, 0.85]) {
      const p = [m[0] + (tip[0] - m[0]) * u, m[1] + (tip[1] - m[1]) * u, m[2] + (tip[2] - m[2]) * u];
      const e = [p[0] + (rnd() - 0.5) * 1.0, p[1] + 0.2 + rnd() * 0.35, p[2] + (rnd() - 0.25) * 0.7];
      rod("iron", p, e, 0.032, 0.012, 5);
      fruitAt.push([e[0], e[1] - 0.11, e[2]]);
      fruitAt.push([(p[0] + e[0]) / 2, (p[1] + e[1]) / 2 - 0.12, (p[2] + e[2]) / 2 + 0.03]);
    }
  }
  for (const [x, y, z] of fruitAt) {
    put("fruit", new THREE.SphereGeometry(0.1, 8, 6), at(x, y, z, 0, 0, 0, 1, 0.82, 1));
    box("iron", x - 0.04, x + 0.04, y + 0.07, y + 0.095, z - 0.04, z + 0.04); // calyx
  }
  // fallen leaves: flat diamonds, mostly under the tree, a few blown across the road
  for (let i = 0; i < 54; i++) {
    let x, z;
    if (i < 36) { x = -4.9 + rnd() * 3.4; z = -2.55 + rnd() * 3.4; }
    else { x = -4.8 + rnd() * 9.4; z = -2.5 + rnd() * 5.3; }
    const y = z < -2.2 ? 0.12 : RY;
    if (z < -2.2) z = Math.max(z, -2.58);
    put(i % 3 ? "fruit" : "leaves", new THREE.CylinderGeometry(0.07, 0.07, 0.008, 4), at(x, y + 0.004 + (i % 3) * 0.006, z, 0, rnd() * Math.PI, 0, 1.5, 1, 0.8));
  }

  // ================= TRUCK (local frame: front at x = -1.7, faces -X; its left side is +Z) =================
  const TX = 0.3, TZ = -0.95; // the truck's place on the street
  OX = TX; OZ = TZ;
  const WR = 0.27, WY = RY + WR, BW = 0.74;
  // wheels: tyre, white wheel disc, hub
  for (const x of [-1.15, 0.75]) for (const s of [-1, 1]) {
    put("iron", new THREE.CylinderGeometry(WR, WR, 0.165, 16), at(x, WY, s * 0.6, 90 * D));
    put("body", new THREE.CylinderGeometry(0.14, 0.14, 0.02, 12), at(x, WY, s * 0.685, 90 * D));
    put("iron", new THREE.CylinderGeometry(0.045, 0.045, 0.02, 8), at(x, WY, s * 0.698, 90 * D));
  }
  box("iron", -1.6, 1.65, 0.3, 0.48, -0.45, 0.45); // chassis
  // cab: side profile extruded across the width
  const cab = new THREE.Shape([
    [-1.7, 0.6], [-1.7, 1.0], [-1.645, 1.1], [-1.47, 1.7], [-1.38, 1.78], [-0.5, 1.78], [-0.45, 1.72], [-0.45, 0.6],
  ].map(([x, y]) => new THREE.Vector2(x, y)));
  put("body", new THREE.ExtrudeGeometry(cab, { depth: 2 * BW, bevelEnabled: false }), at(0, 0, -BW));
  // skirts in front of and behind the front wheel arch
  box("body", -1.7, -1.47, 0.42, 0.6, -BW, BW);
  box("body", -0.83, -0.45, 0.42, 0.6, -BW, BW);
  box("iron", -1.47, -0.83, 0.56, 0.6, -0.7, 0.7); // arch lining
  box("iron", -1.76, -1.69, 0.42, 0.58, -0.72, 0.72); // bumper
  box("iron", -1.71, -1.69, 0.86, 0.96, -0.32, 0.32); // grille slot
  for (const s of [-1, 1]) {
    put("kraft", new THREE.CylinderGeometry(0.085, 0.085, 0.02, 14), at(-1.705, 0.78, s * 0.5, 0, 0, 90 * D));
    put("line", new THREE.TorusGeometry(0.09, 0.012, 4, 16), at(-1.712, 0.78, s * 0.5, 0, 90 * D, 0));
    put("red", new THREE.BoxGeometry(0.02, 0.06, 0.14), at(-1.705, 0.62, s * 0.58)); // indicator
  }
  // windshield (dark glass along the slant) and side / rear windows
  beam("iron", [-1.632, 1.13, 0], [-1.462, 1.67, 0], 0.024, 1.3);
  const win = new THREE.Shape([[-1.6, 1.12], [-1.45, 1.64], [-0.62, 1.64], [-0.62, 1.12]].map(([x, y]) => new THREE.Vector2(x, y)));
  for (const s of [-1, 1]) put("iron", new THREE.ExtrudeGeometry(win, { depth: 0.012, bevelEnabled: false }), at(0, 0, s > 0 ? BW : -BW - 0.012));
  box("iron", -0.452, -0.44, 1.18, 1.6, -0.56, 0.56);
  // door seams, handle, mirrors
  for (const s of [-1, 1]) {
    const z = s * (BW + 0.002);
    box("line", -0.6, -0.585, 0.62, 1.74, z - 0.002, z + 0.002);
    box("line", -1.66, -0.6, 0.62, 0.635, z - 0.002, z + 0.002);
    box("iron", -0.8, -0.68, 1.0, 1.04, z - 0.01 * -s, z + 0.012 * s);
    rod("iron", [-1.58, 1.1, s * 0.72], [-1.66, 1.22, s * 0.86], 0.012, 0.012, 4);
    box("iron", -1.69, -1.64, 1.18, 1.36, s * 0.83 - 0.06, s * 0.83 + 0.06);
  }
  // bed: floor, low side gates, front gate raised as a guard; tailgate folded flat with chains
  box("body", -0.45, 1.7, 0.6, 0.68, -BW, BW);
  for (const s of [-1, 1]) {
    box("body", -0.45, 1.7, 0.68, 0.98, s > 0 ? BW - 0.03 : -BW, s > 0 ? BW : -BW + 0.03);
    box("line", -0.45, 1.7, 0.83, 0.84, s * (BW + 0.001) - 0.002, s * (BW + 0.001) + 0.002);
    box("red", 1.66, 1.71, 0.42, 0.54, s * 0.6 - 0.07, s * 0.6 + 0.07); // tail lamps under the bed
    box("body", 1.68, 1.72, 0.68, 0.99, s * BW - 0.03, s * BW + 0.01 * s); // corner post
    wire("line", [[1.7, 0.97, s * 0.71], [1.98, 0.66, s * 0.71]], 0.007);
  }
  box("body", -0.45, -0.41, 0.68, 1.12, -BW, BW); // front gate (guard behind the cab)
  box("body", 1.7, 2.0, 0.6, 0.635, -0.72, 0.72); // tailgate, down
  box("iron", 1.6, 1.74, 0.38, 0.46, -0.6, 0.6); // rear bumper

  // ---------- oven ----------
  const OXA = -0.25, OXB = 0.95, OZF = 0.5, OZB = -0.5, YF = 1.3, YB = 1.95, BED = 0.68;
  // side profile in (z, y), extruded along x: shape x = -z so a +90 degree turn about y lands it on z
  const ovenP = new THREE.Shape([[OZB, BED], [OZF, BED], [OZF, YF], [OZB, YB]].map(([z, y]) => new THREE.Vector2(-z, y)));
  put("iron", new THREE.ExtrudeGeometry(ovenP, { depth: OXB - OXA, bevelEnabled: false }), at(OXA, 0, 0, 0, 90 * D, 0));
  // slope frame: n (out of the tray), t (up the slope)
  const tv = V(0, YB - YF, OZB - OZF).normalize();
  const nv = V(0, -tv.z, tv.y); // (0, 1, 0.48) normalised: up and toward the street
  const onSlope = (x, s, h) => V(x, YF + (YB - YF) * s, OZF + (OZB - OZF) * s).addScaledVector(nv, h);
  // tray rim
  box("iron", OXA - 0.02, OXB + 0.02, YF - 0.06, YF + 0.07, OZF - 0.01, OZF + 0.04);
  for (const x of [OXA + 0.005, OXB - 0.005]) {
    const a = onSlope(x, 0, 0.03), b = onSlope(x, 1, 0.03);
    beam("iron", [a.x, a.y, a.z], [b.x, b.y, b.z], 0.05, 0.08);
  }
  // stones
  const NS = 11;
  for (let i = 0; i < NS; i++) for (let j = 0; j < 10; j++) {
    const x = OXA + 0.06 + ((OXB - OXA - 0.12) * (i + (j % 2) * 0.5)) / (NS - 0.5);
    const s = 0.05 + (0.9 * j) / 9;
    const p = onSlope(x, s, 0.01 + rnd() * 0.015);
    const r = 0.05 + rnd() * 0.022;
    put("stone", new THREE.IcosahedronGeometry(r, 0), at(p.x, p.y, p.z, rnd() * 3, rnd() * 3, rnd() * 3, 1, 0.8, 1));
  }
  // sweet potatoes: spindle lathes, slightly bent, lying across the slope
  function potato(len, R, half = false) {
    const pts = [];
    const n = half ? 6 : 10;
    for (let i = 0; i <= n; i++) {
      const u = (half ? 0.5 : 1) * (i / n);
      pts.push(new THREE.Vector2(Math.max(i === 0 || (!half && i === n) ? 0 : 0.004, R * Math.pow(Math.sin(Math.PI * u), 0.75)), (u - 0.5) * len));
    }
    const g = new THREE.LatheGeometry(pts, 10);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) p.setX(k, p.getX(k) + 0.1 * R * (1 - Math.pow((2 * p.getY(k)) / len, 2)) * 3);
    g.computeVertexNormals();
    return g.rotateZ(-90 * D); // long axis along x
  }
  function onTray(geo, key, x, s, yaw, lift) {
    const p = onSlope(x, s, lift);
    const ax = V(Math.cos(yaw), 0, 0).addScaledVector(tv, Math.sin(yaw)).normalize();
    const zb = new THREE.Vector3().crossVectors(ax, nv).normalize();
    const m = new THREE.Matrix4().makeBasis(ax, nv, zb).setPosition(p);
    put(key, geo, m);
  }
  const POT = [[-0.06, 0.2, 0.15], [0.8, 0.18, -0.15], [0.05, 0.52, -0.2], [0.45, 0.5, 0.1], [0.82, 0.56, 0.2], [0.2, 0.82, 0.25], [0.66, 0.84, -0.1]];
  for (const [x, s, yaw] of POT) onTray(potato(0.38, 0.08), "potato", x, s, yaw, 0.07);
  // the broken one: two halves pulled apart, golden faces turned to the street
  for (const [dx, sg] of [[-0.075, -1], [0.075, 1]]) {
    const x = 0.38 + dx, s = 0.17;
    const half = potato(0.34, 0.07, true); // the tip half, cut face at +x
    if (sg > 0) half.rotateY(Math.PI); // the other half: cut face toward -x
    const cap = new THREE.CircleGeometry(0.066, 12).rotateY(90 * D * (sg > 0 ? -1 : 1)).translate(-sg * 0.002, 0, 0);
    onTray(half, "potato", x, s, sg * 0.6, 0.075);
    onTray(cap, "kraft", x, s, sg * 0.6, 0.075);
  }
  // lid hinged on the high back edge, propped past vertical (leans back 12 degrees), with a stay
  const LL = 1.1, LT = 0.04, lean = -12 * D;
  const hinge = V(0.35, YB + 0.03, OZB - 0.02);
  put("iron", new THREE.BoxGeometry(OXB - OXA + 0.06, LL, LT), at(hinge.x, hinge.y + (LL / 2) * Math.cos(lean), hinge.z + (LL / 2) * Math.sin(lean) - LT / 2, lean));
  rod("iron", [OXA - 0.01, hinge.y + 0.02, hinge.z], [OXB + 0.01, hinge.y + 0.02, hinge.z], 0.025, 0.025, 6); // hinge pin
  const ltop = [hinge.y + LL * Math.cos(lean), hinge.z + LL * Math.sin(lean)];
  rod("iron", [OXA + 0.1, ltop[0] - 0.03, ltop[1] + 0.03], [OXB - 0.1, ltop[0] - 0.03, ltop[1] + 0.03], 0.018, 0.018, 5); // handle
  wire("line", [[OXB - 0.01, YB - 0.12, OZB + 0.25], [OXB - 0.01, hinge.y + 0.55, hinge.z + 0.55 * Math.sin(lean) + 0.02]], 0.009);
  // firebox window on the street face, glowing
  box("glow", 0.05, 0.45, 1.02, 1.2, OZF, OZF + 0.008);
  for (const x of [0.15, 0.25, 0.35]) box("line", x - 0.008, x + 0.008, 1.02, 1.2, OZF + 0.008, OZF + 0.014);
  box("line", 0.03, 0.47, 1.2, 1.22, OZF, OZF + 0.014);
  box("line", 0.03, 0.47, 1.0, 1.02, OZF, OZF + 0.014);
  box("iron", 0.62, 0.8, 1.06, 1.14, OZF, OZF + 0.03); // damper knob
  // chimney at the cab end of the oven
  const CH = [-0.34, -0.25], CTOP = 3.0;
  box("iron", -0.36, OXA, 0.88, 1.02, CH[1] - 0.06, CH[1] + 0.06);
  rod("iron", [CH[0], 0.8, CH[1]], [CH[0], CTOP, CH[1]], 0.065, 0.06, 10);
  put("iron", new THREE.CylinderGeometry(0.08, 0.08, 0.05, 10), at(CH[0], CTOP - 0.02, CH[1]));

  // ---------- chochin hung off the front-left bed corner, on a post and an arm out over the street ----------
  const LC = 1.1, LH = 0.17, LR = 0.13, LZ = 0.95, LX = -0.39;
  rod("iron", [LX, 0.98, 0.68], [LX, 1.42, 0.68], 0.016, 0.016, 5);
  rod("iron", [LX, 1.41, 0.68], [LX, 1.41, LZ], 0.012, 0.012, 5);
  wire("line", [[LX, 1.41, LZ], [LX, LC + LH + 0.02, LZ]], 0.005);
  const prof = [];
  for (let i = 0; i <= 10; i++) {
    const t = -1 + (2 * i) / 10;
    prof.push(new THREE.Vector2(Math.max(0.05, LR * Math.sqrt(1 - t * t * 0.9)), t * LH));
  }
  put("red", new THREE.LatheGeometry(prof, 16), at(LX, LC, LZ));
  for (const s of [-1, 1]) put("iron", new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12), at(LX, LC + s * (LH + 0.005), LZ));
  for (const t of [-0.6, -0.2, 0.2, 0.6]) {
    const r = Math.max(0.05, LR * Math.sqrt(1 - t * t * 0.9)) + 0.002;
    put("line", new THREE.TorusGeometry(r, 0.004, 3, 20), at(LX, LC + t * LH, LZ, 90 * D));
  }

  // ---------- nobori on the rear-left bed corner: a plain red cloth with pale hems, no lettering ----------
  const NX = 1.62, NZ = 0.66, NT = 3.0, NB = 1.55, NW = 0.46;
  rod("iron", [NX, BED, NZ], [NX, NT + 0.06, NZ], 0.02, 0.018, 6);
  rod("iron", [NX, NT, NZ], [NX - NW - 0.03, NT, NZ], 0.012, 0.012, 5);
  const cloth = new THREE.BoxGeometry(NW, NT - NB - 0.02, 0.012, 8, 1, 1);
  const cp = cloth.attributes.position;
  for (let k = 0; k < cp.count; k++) cp.setZ(k, cp.getZ(k) + 0.03 * Math.sin((cp.getX(k) / NW + 0.5) * Math.PI * 1.5));
  cloth.computeVertexNormals();
  put("red", cloth, at(NX - 0.02 - NW / 2, (NT + NB) / 2 - 0.01, NZ));
  for (const y of [NT - 0.1, NB + 0.08]) {
    const hem = new THREE.BoxGeometry(NW, 0.07, 0.02, 8, 1, 1);
    const hp = hem.attributes.position;
    for (let k = 0; k < hp.count; k++) hp.setZ(k, hp.getZ(k) + 0.03 * Math.sin((hp.getX(k) / NW + 0.5) * Math.PI * 1.5));
    hem.computeVertexNormals();
    put("body", hem, at(NX - 0.02 - NW / 2, y, NZ));
  }

  // ---------- kraft bag of potatoes on the tailgate ----------
  const BX = 1.86, BZ = 0.32;
  box("kraft", BX - 0.1, BX + 0.1, 0.635, 0.86, BZ - 0.07, BZ + 0.07);
  box("kraft", BX - 0.108, BX + 0.108, 0.83, 0.87, BZ - 0.078, BZ + 0.078); // rolled lip
  put("potato", potato(0.26, 0.055), at(BX - 0.02, 0.9, BZ - 0.01, 0, 0.4, 0.5));
  put("potato", potato(0.24, 0.05), at(BX + 0.03, 0.89, BZ + 0.02, 0, -0.6, -0.4));
  OX = 0; OZ = 0;

  // ================= meshes =================
  const MAT = {
    body: [c.body, c.bodyShade, 0.15, 5],
    iron: [c.iron, c.ironShade, 0.15, 4],
    potato: [c.potato, c.potatoShade, 0.25, 2.5],
    red: [c.red, c.redShade, 0.15, 3],
    fruit: [c.red, c.redShade, 0.2, 2],
    leaves: [c.iron, c.ironShade, 0.15, 2],
    stone: [c.stone, c.stoneShade, 0.45, 0],
    kraft: [c.kraft, c.kraftShade, 0.1, 2],
    concrete: [c.concrete, c.concreteShade, 0.15, 4],
    road: [c.road, c.roadShade, 0.1, 4],
    line: [c.line, c.line, 0, 0],
    paint: [c.paint, c.paint, 0, 0],
    glow: [c.glow, c.glowShade, -1, 0],
  };
  for (const [key, s] of Object.entries(soups)) {
    const [base, shade, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    set.add(mesh);
  }

  // ---------- smoke: four puffs in one mesh, vertices rewritten per frame ----------
  const PUFFS = 4, LOOP = 2;
  const unit = new THREE.SphereGeometry(1, 10, 7).toNonIndexed();
  const up = unit.attributes.position.array, un = unit.attributes.normal.array;
  const nv1 = up.length / 3;
  const sp = new Float32Array(up.length * PUFFS), sn = new Float32Array(un.length * PUFFS);
  for (let k = 0; k < PUFFS; k++) sn.set(un, k * un.length);
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  sg.setAttribute("normal", new THREE.BufferAttribute(sn, 3));
  const smoke = kit.toon(sg, c.smoke, c.smokeShade, { threshold: 0.0, outline: false });
  smoke.name = "smoke";
  smoke.frustumCulled = false;
  set.add(smoke);
  const MOUTH = V(CH[0] + TX, CTOP + 0.02, CH[1] + TZ);
  function puffs(t) {
    for (let k = 0; k < PUFFS; k++) {
      const u = ((((t / LOOP + k / PUFFS) % 1) + 1) % 1);
      const r = 0.2 * Math.min(1, u / 0.12) * Math.pow(1 - u, 0.8);
      const cx = MOUTH.x - 0.45 * u + 0.05 * Math.sin(u * 7 + k);
      const cy = MOUTH.y + 0.04 + 1.1 * u;
      const cz = MOUTH.z + 0.12 * u;
      for (let v = 0; v < nv1; v++) {
        const i = v * 3, o = k * up.length + i;
        sp[o] = cx + up[i] * r * 1.15;
        sp[o + 1] = cy + up[i + 1] * r;
        sp[o + 2] = cz + up[i + 2] * r;
      }
    }
    sg.attributes.position.needsUpdate = true;
    sg.computeBoundingBox();
    sg.computeBoundingSphere();
  }

  // marker joints (no geometry under them) for close-ups: --focus oven | chimney | lantern | bag | tree
  for (const [name, x, y, z] of [["oven", 0.35 + TX, 1.4, TZ], ["chimney", CH[0] + TX, CTOP, CH[1] + TZ], ["lantern", LX + TX, LC, LZ + TZ], ["bag", BX + TX, 0.75, BZ + TZ], ["tree", -3.4, 3.2, -2.2]]) {
    const j = new THREE.Group();
    j.name = name;
    j.position.set(x, y, z);
    set.add(j);
    joints[name] = j;
  }

  const CLIPS = { smoke: LOOP };
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`yakiimo: no clip "${m[1]}" (clips: smoke)`);
      puffs(+m[2]);
    } else if (name === "rest") puffs(0.3);
    else throw new Error(`yakiimo: unknown pose "${name}" (rest, or smoke@<seconds>)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
