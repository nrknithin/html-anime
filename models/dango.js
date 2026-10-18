// dango.js - three rice dumplings on a bamboo skewer (hanami, mitarashi or anko dango), static.
// Contract: harness/lab/README.md. Meters, +Y up, faces +Z, its left is +X, stands on y = 0, centred on x = 0, z = 0.
//
// Construction (primitives; everything is a closed solid):
//   SKEWER  a round bamboo stick (cylinder, flat cut end on y = 0) with a cone point that pokes out above the top ball.
//   BALLS   three spheres squashed along the skewer (0.88), overlapping 1.5 mm so they read pressed together.
//   GLAZE   mitarashi: a closed coat sphere per ball, radius R over the crown, stepping in to 0.93 R below a lip
//           that drops in four drips, so the lower part hides inside a 0.96 R rice ball and there is no open edge
//           (an open cap inked as a ragged band). Tilted up toward the viewer; a flat practical gloss decal on the lit
//           crown.
//   ANKO    a lumpy sphere (sin-displaced radius) replaces each ball: red-bean paste coats the dumpling.
//   TRAY    { plate: true }: a red lacquer geta tray (a slab on two cross feet); the skewer lies across it along x, the balls
//           resting on the tray top. Without it the skewer stands upright on its cut end, as dango are held in anime.
// Proportions (real size, base unit the ball diameter B = 25 mm): skewer 130 mm (5.2 B), 5 mm thick (thickened from
// ~3.5 mm so it survives the hull); ball 25 mm wide, 22 mm tall along the skewer, pitch 20.5 mm; tip pokes 6 mm
// above the top ball; handle 61 mm below the bottom ball. Tray 175 x 80 mm, 8 mm slab on 8.5 mm feet.
// Options: build(THREE, kit, colors, { height, flavor, plate }). height = skewer length (default 0.13; scales all,
// ink is in pixels so it scales cleanly), flavor "hanami" (default) | "mitarashi" | "anko", plate false | true.
// Colours (noon; no script has a green, see below), base / shade by material:
//   skewer  sky #f2d7ae / iris #5c3d32 at -0.15 (tan bamboo, a thin brown far side).
//   hanami  balls at -0.1 (a thin shade crescent): pink skin #f0c2ae / accent #c4452d; white practical #fffaf2 /
//           skin #f0c2ae; "green" sky #f2d7ae / iris #5c3d32. No SCRIPTS entry has a green, so on noon the set reads
//           pink, white, toasted tan; a film whose sheet has a green maps colors.green / colors.greenShade to it.
//   mitarashi  rice moon #fff6e4 / sky #f2d7ae; glaze accent #c4452d / iris #5c3d32 at 0.6 (a brown coat whose lit
//           crown is red-caramel); gloss practical #fffaf2.
//   anko    paste accent #c4452d / iris #5c3d32 at 0.84 (dark bean brown, a red sheen on top).
//   tray    accent #c4452d / iris #5c3d32 at 0.1 (red lacquer, like the torii's vermilion).
//   No shade is darker than ink #2c261f (hair #241c16 is, so it is not used).

export const meta = {
  name: "dango",
  height: 0.13,
  script: "noon",
  colors: {
    stick: "#f2d7ae", stickShade: "#5c3d32",
    pink: "#f0c2ae", pinkShade: "#c4452d",
    white: "#fffaf2", whiteShade: "#f0c2ae",
    green: "#f2d7ae", greenShade: "#5c3d32",
    rice: "#fff6e4", riceShade: "#f2d7ae",
    glaze: "#c4452d", glazeShade: "#5c3d32", gloss: "#fffaf2",
    anko: "#c4452d", ankoShade: "#5c3d32",
    tray: "#c4452d", trayShade: "#5c3d32",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const { height = meta.height, flavor = "hanami", plate = false } = opts;
  if (!["hanami", "mitarashi", "anko"].includes(flavor)) throw new Error(`dango: unknown flavor "${flavor}"`);
  const root = new THREE.Group();
  root.name = "dango";
  const body = new THREE.Group(); // uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / 0.13);
  root.add(body);
  const joints = {};

  const L = 0.13, RS = 0.0025, TIP = 0.008; // skewer length, radius, point length
  const R = 0.0125, SQ = 0.88, H = R * SQ; // ball radius across, squash along the skewer, half height
  const PITCH = 2 * H - 0.0015;
  const Y0 = L - 0.006 - H; // top ball centre
  const ballY = [Y0, Y0 - PITCH, Y0 - 2 * PITCH];

  // The dango frame: skewer along local +Y from 0 to L. Upright it is the body; on a tray it is laid along x.
  const stick = new THREE.Group();
  stick.name = "skewer";
  body.add(stick);
  const TRAY_TOP = 0.016;
  if (plate) {
    stick.rotation.set(0, 0.18, -Math.PI / 2); // local +Y -> world +X, a slight yaw so the tray reads in depth
    const mid = new THREE.Vector3(0, L / 2, 0).applyEuler(stick.rotation); // centre the skewer on x = z = 0
    stick.position.set(-mid.x, TRAY_TOP + R, -mid.z);
    const tray = new THREE.Group();
    tray.name = "tray";
    body.add(tray);
    const red = (g) => kit.toon(g, c.tray, c.trayShade, { threshold: 0.1 });
    const TW = 0.175, TD = 0.08; // a geta tray: one slab on two cross feet
    const slab = red(new THREE.BoxGeometry(TW, 0.008, TD));
    slab.position.y = 0.012;
    slab.name = "slab";
    tray.add(slab);
    for (const s of [1, -1]) {
      const foot = red(new THREE.BoxGeometry(0.014, 0.0085, TD - 0.004));
      foot.position.set(s * 0.058, 0.00425, 0);
      foot.name = s > 0 ? "footL" : "footR";
      tray.add(foot);
    }
  }
  stick.updateMatrixWorld(true);

  // ---------- skewer ----------
  const shaft = kit.toon(new THREE.CylinderGeometry(RS, RS, L - TIP, 10), c.stick, c.stickShade, { threshold: -0.15 });
  shaft.position.y = (L - TIP) / 2;
  shaft.name = "shaft";
  stick.add(shaft);
  const tip = kit.toon(new THREE.ConeGeometry(RS, TIP + 0.0005, 10), c.stick, c.stickShade, { threshold: -0.15 });
  tip.position.y = L - TIP / 2 + 0.00025 - 0.0005;
  tip.name = "tip";
  stick.add(tip);

  // A direction in world space expressed in the stick frame (so glaze always faces up and toward the viewer).
  const qInv = new THREE.Quaternion();
  stick.getWorldQuaternion(qInv).invert();
  const localDir = (x, y, z) => new THREE.Vector3(x, y, z).normalize().applyQuaternion(qInv);

  // ---------- balls ----------
  const sphere = (r, w = 16, h = 12) => new THREE.SphereGeometry(r, w, h).scale(1, SQ, 1);
  // Glaze cap: a sphere slice from the pole to theta, lip pushed down in drips, then squashed like the ball.
  // Glaze coat: a closed sphere of radius r over the crown that steps in to 0.93 r below the lip (inside the ball),
  // so it is a solid with its own hull and no open edge. The lip drops in four drips.
  function coat(r, lip) {
    const g = new THREE.SphereGeometry(r, 14, 14);
    const p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const th = Math.acos(Math.max(-1, Math.min(1, v.y / r))), ph = Math.atan2(v.x, v.z);
      const edge = lip * (1 + 0.2 * Math.pow(Math.max(0, Math.sin(4 * ph + 0.5)), 3));
      const t = Math.max(0, Math.min(1, (th - edge + 0.14) / 0.28));
      v.multiplyScalar(1 - 0.07 * t * t * (3 - 2 * t));
      p.setXYZ(i, v.x, v.y, v.z);
    }
    return g;
  }
  function lumpy(r) {
    const g = new THREE.SphereGeometry(r, 16, 12);
    const p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const th = Math.acos(Math.max(-1, Math.min(1, v.y / r))), ph = Math.atan2(v.x, v.z);
      const k = 1 + 0.045 * Math.sin(5 * ph + 1.3 * th) * Math.sin(3 * th) + 0.03 * Math.sin(7 * th + 2 * ph);
      p.setXYZ(i, v.x * k, v.y * k, v.z * k);
    }
    g.scale(1, SQ, 1);
    g.computeVertexNormals(); // seams share positions, so normals stay smooth enough at 16 x 12
    return g;
  }

  const hanami = [
    ["pink", c.pink, c.pinkShade],
    ["white", c.white, c.whiteShade],
    ["green", c.green, c.greenShade],
  ];
  ballY.forEach((y, i) => {
    const g = new THREE.Group();
    g.name = `ball${i + 1}`;
    g.position.y = y;
    stick.add(g);
    joints[`ball${i + 1}`] = g;
    if (flavor === "hanami") {
      const [, base, shade] = hanami[i];
      g.add(kit.toon(sphere(R), base, shade, { threshold: -0.1 }));
    } else if (flavor === "mitarashi") {
      // rice ball at 0.96 R (12 segments sag 3.4 %, so it never pokes through the 14-segment coat at R)
      g.add(kit.toon(sphere(R * 0.96, 12, 9), c.rice, c.riceShade, { threshold: 0.3 }));
      const cg = coat(R, 1.95);
      cg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), plate ? localDir(0, 1, 0.2) : localDir(0, 1, 0.45)));
      cg.scale(1, SQ, 1);
      cg.computeVertexNormals();
      const glaze = kit.toon(cg, c.glaze, c.glazeShade, { threshold: 0.6 });
      glaze.name = "glaze";
      g.add(glaze);
      // gloss: a flat practical decal on the lit crown (light is +X, +Y, a little +Z), facing the camera quadrant
      const n = plate ? localDir(0.35, 0.8, 0.5) : localDir(0.45, 0.55, 0.7);
      const gl = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 4).scale(0.0028, 0.0014, 0.0005), kit.cel(c.gloss, c.gloss, { threshold: -1 }));
      gl.position.set(n.x * R * 1.01, n.y * H * 1.01, n.z * R * 1.01);
      gl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      gl.name = "gloss";
      g.add(gl);
    } else {
      g.add(kit.toon(lumpy(R * 1.04), c.anko, c.ankoShade, { threshold: 0.84 }));
    }
  });

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
