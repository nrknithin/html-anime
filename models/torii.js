// torii.js - a vermilion myojin torii (Shinto shrine gate), static.
// Contract: harness/lab/README.md. Meters, +Y up, the gate faces +Z (you walk through it along -Z), its left is +X,
// stands on y = 0, centred on x = 0, z = 0.
//
// Construction (primitives + one beam loft; flat-shaded beams, smooth pillars):
//   HASHIRA  two tapered round pillars (cylinders) leaning inward (uchikorobi, ~1.9 deg): base centres x +-2.6, tops
//            x +-2.4 where they meet the shimaki. Each pillar stands in a black lacquer sleeve (kamaki) on a wider black
//            plinth stone (daiishi).
//   NUKI     the lower tie beam, a straight rectangular bar through both pillars that sticks out 0.75 m past each one.
//            A small vermilion wedge (kusabi) sits on it just outside each pillar.
//   GAKUZUKA the centre strut between the nuki and the shimaki, with an optional blank name plaque (gakku) on its front.
//   SHIMAKI  the lower lintel under the kasagi, following the same upward sweep (sori), shorter than the kasagi.
//   KASAGI   the top lintel: beam(), a loft along x whose 4 corners each have their own reach, so the bottom edge stops
//            short of the top edge and the ends are cut on a slant; the centreline rises toward the tips
//            (sori = 0.34 m * (|x| / 4.05)^2.3). Vermilion below, a black band on top (two lofts sharing one curve).
//   Every beam is a closed solid; winding comes from the centreline point at that x, never by hand.
// Proportions (real size, base unit the pillar diameter D = 0.55 m; a large shrine gate):
//   overall height 7.09 at the kasagi tips (12.9 D), 6.75 at the centre; pillar spacing 5.2 at the ground (9.5 D),
//   clear opening ~4.6; nuki 4.65-5.10 (0.45 x 0.26), reach +-3.2; shimaki 5.95-6.30 (0.35 x 0.50, as deep as
//   the pillar top so the pillar ends inside it), reach +-3.35; kasagi 6.30-6.75 at the centre (vermilion 0.25 + black
//   0.20, 0.64 / 0.66 deep), reach +-3.75 at the bottom edge,
//   +-4.05 at the top edge; kamaki 0.2-0.85, daiishi 0-0.2.
// Scaling: build(THREE, kit, colors, { height }) scales the whole gate uniformly (a 2.5 m roadside torii is
// { height: 2.5 }); or scale the film's placement group, as for any model. Ink is in pixels, so it scales cleanly.
// The blank plaque can be dropped with { plaque: false }.
// Colours (noon): vermilion accent #c4452d / iris #5c3d32 at threshold 0.1, so faces square to the camera stay
// vermilion and only the far (-X) side, the back and undersides go to the brown-red shade.
// Black lacquer (kasagi band, kamaki, daiishi, plaque) iris #5c3d32 lit / hair #241c16 shade. Sleeves, plinths and plaque
// at threshold 0.75 are hair everywhere (black); the kasagi band at 0.55 shows an iris sheen on its swept top and a
// near-black forward face. hair sits next to ink #2c261f, as the AE86's black lower body does: these parts are small
// bands, and the vermilion beside them carries the silhouette. Mating beams overlap 2-3 cm so no gap shows between lofts
// sampled at different x.

export const meta = {
  name: "torii",
  height: 7.09,
  script: "noon",
  colors: {
    vermilion: "#c4452d", vermilionShade: "#5c3d32",
    lacquer: "#5c3d32", lacquerShade: "#241c16",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, plaque = true } = opts;
  const root = new THREE.Group();
  root.name = "torii";
  const gate = new THREE.Group(); // uniform size scale lives here, so root stays the plain contract node
  gate.name = "gate";
  gate.scale.setScalar(height / 7.09); // 7.09 m = the full-size gate as authored below
  root.add(gate);
  const joints = {};

  const red = (g) => kit.toon(g, c.vermilion, c.vermilionShade, { threshold: 0.1 });
  // lacquer: 0.75 leaves only flat tops lit (sleeves, plaque read black); the kasagi band uses 0.55 so its swept top
  // (tilted up to 11 deg toward -X at the tips) stays one lit sheen end to end.
  const black = (g, threshold = 0.75) => kit.toon(g, c.lacquer, c.lacquerShade, { threshold });
  const put = (mesh, x = 0, y = 0, z = 0, name) => {
    mesh.position.set(x, y, z);
    if (name) mesh.name = name;
    gate.add(mesh);
    return mesh;
  };

  // ---------- beam loft ----------
  // A straight-in-z beam along x. reach = [bottom, top] half-lengths of the bottom and top edges (slanted ends when they
  // differ), y0(x) / y1(x) its bottom and top, d its depth in z. n sections per half. Flat-shaded triangle soup.
  function beam({ reach: [rb, rt], y0, y1, d, n = 14 }) {
    const zf = d / 2, zb = -d / 2;
    const rings = [];
    for (let i = -n; i <= n; i++) {
      const u = i / n, xb = u * rb, xt = u * rt;
      rings.push([[xb, y0(xb), zb], [xb, y0(xb), zf], [xt, y1(xt), zf], [xt, y1(xt), zb]]);
    }
    const tris = [];
    for (let i = 0; i < rings.length - 1; i++) {
      const A = rings[i], B = rings[i + 1];
      for (let k = 0; k < 4; k++) {
        const k2 = (k + 1) % 4;
        tris.push([A[k], A[k2], B[k]], [A[k2], B[k2], B[k]]);
      }
    }
    for (const R of [rings[0], rings[rings.length - 1]]) tris.push([R[0], R[1], R[2]], [R[0], R[2], R[3]]);
    const out = [];
    for (const [a, b, e] of tris) {
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ae = [e[0] - a[0], e[1] - a[1], e[2] - a[2]];
      const nx = ab[1] * ae[2] - ab[2] * ae[1], ny = ab[2] * ae[0] - ab[0] * ae[2], nz = ab[0] * ae[1] - ab[1] * ae[0];
      const mx = (a[0] + b[0] + e[0]) / 3, my = (a[1] + b[1] + e[1]) / 3, mz = (a[2] + b[2] + e[2]) / 3;
      const rx = mx * 0.95, ry = (y0(rx) + y1(rx)) / 2; // inside reference: the centreline just inboard of this triangle
      const flip = nx * (mx - rx) + ny * (my - ry) + nz * mz < 0;
      out.push(...a, ...(flip ? e : b), ...(flip ? b : e));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
    g.computeVertexNormals();
    return g;
  }

  // ---------- pillars (hashira), sleeves (kamaki), plinths (daiishi) ----------
  const XB = 2.6, XT = 2.4, YT = 5.95, RB = 0.275, RT = 0.25;
  const pillarX = (y, s) => s * (XB + ((XT - XB) * y) / YT);
  for (const s of [1, -1]) {
    const y0 = 0.1, y1 = YT + 0.12; // the foot is buried in the plinth, the top inside the shimaki
    const len = Math.hypot(y1 - y0, pillarX(y1, 1) - pillarX(y0, 1));
    const p = put(red(new THREE.CylinderGeometry(RT, RB, len, 22)), (pillarX(y0, s) + pillarX(y1, s)) / 2, (y0 + y1) / 2, 0, s > 0 ? "pillarL" : "pillarR");
    p.rotation.z = s * Math.atan((XB - XT) / YT); // top leans toward x = 0
    const kx = pillarX(0.5, s);
    put(black(new THREE.CylinderGeometry(0.33, 0.345, 0.65, 22)), kx, 0.525, 0, s > 0 ? "kamakiL" : "kamakiR");
    put(black(new THREE.CylinderGeometry(0.355, 0.355, 0.05, 22)), kx, 0.83, 0, s > 0 ? "kamakiLipL" : "kamakiLipR"); // lip at the top of the sleeve
    put(black(new THREE.CylinderGeometry(0.46, 0.46, 0.2, 22)), pillarX(0, s), 0.1, 0, s > 0 ? "daiishiL" : "daiishiR");
  }

  // ---------- nuki, kusabi ----------
  const NY0 = 4.65, NY1 = 5.1;
  put(red(beam({ reach: [3.2, 3.2], y0: () => NY0, y1: () => NY1, d: 0.26, n: 4 })), 0, 0, 0, "nuki");
  for (const s of [1, -1]) {
    const wx = pillarX(NY1, s) + s * (RT + 0.1);
    put(red(new THREE.BoxGeometry(0.12, 0.16, 0.3)), wx, NY1 + 0.01, 0, s > 0 ? "kusabiL" : "kusabiR");
  }

  // ---------- gakuzuka, gakku ----------
  put(red(new THREE.BoxGeometry(0.36, YT - NY1 + 0.04, 0.24)), 0, (YT + NY1) / 2, 0, "gakuzuka");
  if (plaque) {
    put(black(new THREE.BoxGeometry(0.6, 0.74, 0.08)), 0, (YT + NY1) / 2, 0.16, "gakku");
  }

  // ---------- shimaki, kasagi ----------
  const sori = (x, k) => k * Math.pow(Math.min(1, Math.abs(x) / 4.05), 2.3);
  const K = 0.34;
  put(red(beam({ reach: [3.35, 3.35], y0: (x) => YT + sori(x, K), y1: (x) => 6.33 + sori(x, K), d: 0.5 })), 0, 0, 0, "shimaki");
  const KM = 6.55; // vermilion / black split
  put(red(beam({ reach: [3.75, 3.92], y0: (x) => 6.3 + sori(x, K), y1: (x) => KM + sori(x, K), d: 0.64 })), 0, 0, 0, "kasagi");
  put(black(beam({ reach: [3.92, 4.05], y0: (x) => KM - 0.03 + sori(x, K), y1: (x) => 6.75 + sori(x, K), d: 0.66 }), 0.55), 0, 0, 0, "kasagiTop");

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
