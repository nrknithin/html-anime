// toro.js - a Japanese stone lantern (kasuga-doro), static, with an unlit and a lit fire box.
// Contract: harness/lab/README.md. Meters, +Y up, the front window faces +Z, its left is +X, stands on y = 0,
// centred on x = 0, z = 0.
//
// Construction (one hexagonal lathe for every stone tier, primitives for the round parts):
//   hexLathe() sweeps an (r, y) profile around a hexagon (a flat face toward +Z, corners at +-X) as a flat-shaded
//   triangle soup; r is the corner radius. An optional lift(c, r) raises points by how close they sit to a corner
//   (c = 1 at a corner, 0 mid-face), which is how the roof's corners turn up. Winding comes from the signed volume of
//   the finished soup, never by hand.
//   KISO      the hexagonal foot: a slab, a chamfered step and a small round collar the pillar stands in.
//   SAO       the round pillar with a raised ring band (fushi) at its middle and collars at both ends.
//   CHUDAI    the middle platform: a hexagonal bowl flaring out from the pillar top to a vertical rim.
//   HIBUKURO  the fire box: six corner posts on a hexagonal sill, under a lintel. The front and back faces are open
//            windows; the four side faces are panels with the kasuga cut-outs, a sun (disc) on two and a crescent moon
//            on the other two (one is the front-left face the hero and three-quarter cameras see), decals 1.5 mm proud
//            of the panel. A hexagonal core inside and the decals are dark (rest) or the warm glow (lit), so the windows
//            read as holes or as lamplight.
//   KASA      the wide hexagonal roof: concave top falling to a thin eave, flat underside, the corners lifted
//            (lift = 0.075 * c^3 * (r/R)^2) and each corner ending in a warabite, a curl that rolls up and back
//            (a torus arc, both ends capped with balls so no end is open). Six hip lines are a dark ribbon 3 mm over each
//            hip crease (the hull draws silhouettes only).
//   HOJU      a lotus cup (ukebana) on a neck and the onion-shaped jewel finial (a smooth lathe closed at both poles).
// Proportions (real size, base unit the pillar diameter D = 0.21 m): overall 2.0 (9.5 D). Kiso 0-0.26 (corner radius
// 0.42 = 2 D); sao 0.25-0.97, fushi 0.56-0.66; chudai 0.96-1.13 (radius 0.33); hibukuro 1.13-1.46 (radius 0.215-0.24,
// windows 0.21 tall); kasa 1.46-1.71 (eave radius 0.50 = 2.4 D, the widest part, corners up 0.075 plus a 0.09 curl);
// hoju 1.70-2.0.
// Scaling: build(THREE, kit, colors, { height, lit }) scales the whole lantern uniformly (a 1.2 m garden lantern is
// { height: 1.2 }) and starts it lit or unlit; pose("lit") / pose("rest") switch the light (absolute, so seeking works).
// Colours (noon, the torii's set): stone sclera #f6f3ee / sky #f2d7ae at threshold 0.3. Noon has no grey; sclera is its
// coolest, greyest paper tone, and sky is the warm shadow the house's foundation and step stones use, so the lantern
// sits with them; sky is far lighter than ink #2c261f and distinct from sclera on every face that turns. Window
// interiors and hip lines hair #241c16 (dark lines next to ink, as on the torii). Lit: the glow is accent #c4452d flat
// (base = shade), firelight orange behind pale stone; practical #fffaf2 would vanish against sclera. A night film should
// map glow to its own practical (festival #ffb020, indigo #f0c36a) and stone to its pale pair.

export const meta = {
  name: "toro",
  height: 2.0,
  script: "noon",
  colors: {
    stone: "#f6f3ee", stoneShade: "#f2d7ae",
    hollow: "#241c16",
    glow: "#c4452d", glowShade: "#c4452d",
  },
  poses: ["rest", "lit"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, lit = false } = opts;
  const root = new THREE.Group();
  root.name = "toro";
  const body = new THREE.Group(); // uniform size scale lives here, so root stays the plain contract node
  body.name = "body";
  body.scale.setScalar(height / 2.0); // 2.0 m = the lantern as authored below
  root.add(body);
  const joints = {};

  const stone = (g, threshold = 0.3) => kit.toon(g, c.stone, c.stoneShade, { threshold });
  const put = (mesh, x = 0, y = 0, z = 0, name) => {
    mesh.position.set(x, y, z);
    if (name) mesh.name = name;
    body.add(mesh);
    return mesh;
  };

  // ---------- hexagonal lathe ----------
  const TAU = Math.PI * 2;
  // a point on the unit hexagon, t in [0, 6): corners at t = 0..5 (angle 60 t deg from +X toward +Z)
  function hexPt(t) {
    const k = Math.floor(t) % 6, f = t - Math.floor(t);
    const a0 = (k * TAU) / 6, a1 = ((k + 1) * TAU) / 6;
    return [Math.cos(a0) * (1 - f) + Math.cos(a1) * f, Math.sin(a0) * (1 - f) + Math.sin(a1) * f, Math.abs(f - 0.5) * 2];
  }
  function soupGeometry(out) {
    let vol = 0; // signed volume decides the winding of the whole closed soup
    for (let i = 0; i < out.length; i += 9) {
      const [ax, ay, az, bx, by, bz, ex, ey, ez] = out.slice(i, i + 9);
      vol += ax * (by * ez - bz * ey) - ay * (bx * ez - bz * ex) + az * (bx * ey - by * ex);
    }
    if (vol < 0) for (let i = 0; i < out.length; i += 9) for (let j = 0; j < 3; j++) [out[i + 3 + j], out[i + 6 + j]] = [out[i + 6 + j], out[i + 3 + j]];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
    g.computeVertexNormals();
    return g;
  }
  // profile [[r, y], ...] from one pole (r = 0) to the other; per = samples per hexagon side
  function hexLathe(profile, { lift = null, per = 1 } = {}) {
    const n = 6 * per;
    const rings = profile.map(([r, y]) => {
      const ring = [];
      for (let i = 0; i < n; i++) {
        const [hx, hz, cc] = hexPt(i / per);
        ring.push([hx * r, y + (lift ? lift(cc, r) : 0), hz * r]);
      }
      return ring;
    });
    const out = [];
    for (let j = 0; j < rings.length - 1; j++) {
      const A = rings[j], B = rings[j + 1];
      for (let i = 0; i < n; i++) {
        const i2 = (i + 1) % n;
        if (profile[j][0] > 1e-6) out.push(...A[i], ...A[i2], ...B[i]);
        if (profile[j + 1][0] > 1e-6) out.push(...A[i2], ...B[i2], ...B[i]);
      }
    }
    return soupGeometry(out);
  }
  const hexPrism = (R, y0, y1) => hexLathe([[0, y0], [R, y0], [R, y1], [0, y1]]);

  // ---------- kiso (foot) ----------
  put(stone(hexLathe([[0, 0], [0.42, 0], [0.42, 0.13], [0.36, 0.19], [0.3, 0.2], [0, 0.2]])), 0, 0, 0, "kiso");
  put(stone(new THREE.CylinderGeometry(0.15, 0.17, 0.07, 16)), 0, 0.225, 0, "kisoCollar");

  // ---------- sao (pillar) ----------
  put(stone(new THREE.CylinderGeometry(0.1, 0.108, 0.74, 16)), 0, 0.61, 0, "sao");
  // fushi: one smooth bulge, both ends tucked inside the pillar
  const fushiPts = [[0.09, 0.56], [0.112, 0.572], [0.124, 0.592], [0.126, 0.61], [0.124, 0.628], [0.112, 0.648], [0.09, 0.66]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  put(stone(new THREE.LatheGeometry(fushiPts, 12)), 0, 0, 0, "fushi");
  put(stone(new THREE.CylinderGeometry(0.125, 0.115, 0.05, 16)), 0, 0.95, 0, "saoCollar");

  // ---------- chudai (middle platform) ----------
  put(stone(hexLathe([[0, 0.96], [0.16, 0.96], [0.3, 1.05], [0.33, 1.07], [0.33, 1.13], [0, 1.13]])), 0, 0, 0, "chudai");

  // ---------- hibukuro (fire box) ----------
  const FR = 0.215, Y0 = 1.13, YS = 1.19, YL = 1.4, Y1 = 1.46;
  put(stone(hexPrism(0.24, Y0, YS)), 0, 0, 0, "sill");
  put(stone(hexPrism(0.24, YL, Y1)), 0, 0, 0, "lintel");
  for (let k = 0; k < 6; k++) {
    const a = (k * TAU) / 6;
    const post = put(stone(new THREE.BoxGeometry(0.055, YL - YS + 0.02, 0.055)), Math.cos(a) * (FR - 0.005), (YS + YL) / 2, Math.sin(a) * (FR - 0.005), `post${k}`);
    post.rotation.y = -a;
  }
  const apo = FR * Math.cos(Math.PI / 6); // face distance
  const hollow = kit.cel(c.hollow, c.hollow);
  const glowMat = kit.cel(c.glow, c.glowShade, { threshold: -0.25 });
  const windows = [];
  // the kasuga side windows: a sun (disc) on two faces, a crescent moon on the other two
  const sunGeo = new THREE.CircleGeometry(0.06, 18);
  const moonGeo = (() => {
    const r1 = 0.064, r2 = 0.055, bx = 0.03, by = 0.012; // the disc minus a disc shifted up-right
    const d = Math.hypot(bx, by), ux = bx / d, uy = by / d;
    const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(r1 * r1 - a * a);
    const P = [a * ux - h * uy, a * uy + h * ux], M = [a * ux + h * uy, a * uy - h * ux]; // upper, lower crossing
    const ang = (x, y) => (Math.atan2(y, x) + TAU) % TAU;
    const shape = new THREE.Shape();
    shape.absarc(0, 0, r1, ang(...P), ang(...M) < ang(...P) ? ang(...M) + TAU : ang(...M), false);
    shape.absarc(bx, by, r2, ang(M[0] - bx, M[1] - by), ang(P[0] - bx, P[1] - by), true);
    return new THREE.ShapeGeometry(shape, 8);
  })();
  for (let k = 0; k < 6; k++) {
    const a = ((k + 0.5) * TAU) / 6; // face normal angle; k = 1 is +Z (front), k = 4 the back
    if (k === 1 || k === 4) continue;
    const pnl = new THREE.Group();
    pnl.rotation.y = Math.PI / 2 - a; // local +Z = the face normal
    pnl.name = `panel${k}`;
    body.add(pnl);
    const slab = stone(new THREE.BoxGeometry(FR * 0.98, YL - YS + 0.01, 0.04));
    slab.position.set(0, (YS + YL) / 2, apo - 0.025);
    pnl.add(slab);
    const win = new THREE.Mesh(k === 0 || k === 3 ? moonGeo : sunGeo, hollow);
    win.position.set(0, (YS + YL) / 2, apo - 0.005 + 0.0015);
    pnl.add(win);
    windows.push(win);
  }
  const core = put(new THREE.Mesh(hexPrism(0.17, YS - 0.005, YL + 0.005), hollow), 0, 0, 0, "core");

  // ---------- kasa (roof) ----------
  const RR = 0.5, YE = 1.46;
  const roofLift = (cc, r) => 0.075 * cc * cc * cc * Math.pow(Math.min(1, r / RR), 2);
  const roofTop = [[0.07, 1.705], [0.14, 1.675], [0.22, 1.63], [0.3, 1.585], [0.38, 1.55], [0.45, 1.525], [RR, YE + 0.05]];
  put(stone(hexLathe([
    [0, 1.71], ...roofTop,
    [RR + 0.005, YE + 0.025], [RR, YE], [0.4, YE - 0.005], [0.2, YE - 0.005], [0, YE - 0.005],
  ], { lift: roofLift, per: 3 })), 0, 0, 0, "kasa");
  // hip lines and warabite curls, one set per corner
  const hipLine = [];
  for (let k = 0; k < 6; k++) {
    const a = (k * TAU) / 6;
    // hip: a hair ribbon 3 mm over the crease from the finial to the curl (the hull cannot draw a crease)
    const ca = Math.cos(a), sa = Math.sin(a), w = 0.007;
    const P = roofTop.map(([r, y]) => [r * ca, y + roofLift(1, r) + 0.003, r * sa]);
    for (let j = 0; j < P.length - 2; j++) {
      const [p, q] = [P[j], P[j + 1]];
      const A = [p[0] - sa * w, p[1], p[2] + ca * w], B = [p[0] + sa * w, p[1], p[2] - ca * w];
      const C = [q[0] + sa * w, q[1], q[2] - ca * w], D = [q[0] - sa * w, q[1], q[2] + ca * w];
      hipLine.push(...A, ...B, ...C, ...A, ...C, ...D);
    }
    const g = new THREE.Group();
    g.rotation.y = -a; // local +X = this corner's radial direction
    g.name = `corner${k}`;
    body.add(g);
    // warabite: an arc from the eave tip, out, up and back over itself
    const tipY = YE + 0.03 + roofLift(1, RR), R = 0.042, tube = 0.022;
    const curl = new THREE.Group();
    curl.position.set(RR - 0.01, tipY + R - 0.012, 0);
    g.add(curl);
    const arc = 1.55 * Math.PI, start = -0.5 * Math.PI;
    const torus = stone(new THREE.TorusGeometry(R, tube, 6, 10, arc));
    torus.rotation.z = start;
    curl.add(torus);
    for (const t of [start, start + arc]) {
      const ball = stone(new THREE.SphereGeometry(tube * 1.08, 6, 5));
      ball.position.set(Math.cos(t) * R, Math.sin(t) * R, 0);
      curl.add(ball);
    }
  }

  const hipGeo = new THREE.BufferGeometry();
  hipGeo.setAttribute("position", new THREE.Float32BufferAttribute(hipLine, 3));
  hipGeo.computeVertexNormals();
  put(new THREE.Mesh(hipGeo, kit.cel(c.hollow, c.hollow, { doubleSided: true })), 0, 0, 0, "hips");

  // ---------- hoju (finial) ----------
  put(stone(new THREE.CylinderGeometry(0.05, 0.065, 0.05, 16)), 0, 1.72, 0, "hojuNeck");
  put(stone(new THREE.CylinderGeometry(0.085, 0.06, 0.04, 16)), 0, 1.76, 0, "ukebana");
  const hojuPts = [[0, 1.77], [0.055, 1.775], [0.08, 1.8], [0.088, 1.835], [0.078, 1.875], [0.055, 1.915], [0.03, 1.95], [0.012, 1.98], [0, 2.0]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  put(stone(new THREE.LatheGeometry(hojuPts, 16), 0.3), 0, 0, 0, "hoju");

  function pose(name) {
    if (name !== "rest" && name !== "lit") throw new Error(`unknown pose "${name}" (rest, lit)`);
    const on = name === "lit";
    core.material = on ? glowMat : hollow;
    for (const w of windows) w.material = on ? glowMat : hollow;
    root.updateMatrixWorld(true);
  }
  pose(lit ? "lit" : "rest");
  return { root, joints, pose };
}
