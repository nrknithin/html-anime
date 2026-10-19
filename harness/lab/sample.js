// sample.js — a jointed mannequin that follows the model-lab contract (see harness/lab/README.md).
// No imports, no clock, no Math.random: THREE and the kit come in as arguments.
// Two-tone pairs, base / shade, all from the "noon" script (Paper noon):
//   wood    sky #f2d7ae / iris #5c3d32        shirt   practical #fffaf2 / sky #f2d7ae
//   trouser iris #5c3d32 / hair #241c16       boots   hair #241c16 / ink #2c261f
//   plate   accent #c4452d / iris #5c3d32     eyes    sclera #f6f3ee, pupils hair #241c16
//   ink hull ink #2c261f (the lab passes the script's ink to the kit)

export const meta = {
  name: "mannequin",
  height: 1.7, // meters, top of the head in the rest pose
  script: "noon",
  colors: {
    wood: "#f2d7ae",
    woodShade: "#5c3d32",
    shirt: "#fffaf2",
    shirtShade: "#f2d7ae",
    plate: "#c4452d",
    plateShade: "#5c3d32",
    trouser: "#5c3d32",
    trouserShade: "#241c16",
    boot: "#241c16",
    bootShade: "#2c261f",
    eye: "#f6f3ee",
    pupil: "#241c16",
  },
  poses: ["rest", "wave"],
};

// Joint rotations in degrees [rx, ry, rz], absolute. A pose sets every joint: REST, then its own rows on top.
// The model faces +Z and its left is +X. A hanging limb points down -Y; +rz swings it toward +X.
const REST = {
  pelvis: [0, 0, 0], spine: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0],
  armUpperL: [0, 0, 7], armLowerL: [-8, 0, 0], armUpperR: [0, 0, -7], armLowerR: [-8, 0, 0],
  legUpperL: [0, 0, 0], legLowerL: [0, 0, 0], legUpperR: [0, 0, 0], legLowerR: [0, 0, 0],
  footL: [0, 0, 0], footR: [0, 0, 0],
};
const POSES = {
  rest: {},
  wave: {
    pelvis: [0, 0, 2], spine: [0, 0, -3], neck: [0, 0, 5], head: [0, -8, 7],
    armUpperR: [0, 0, -125], armLowerR: [0, 0, -40], // right arm up beside the head, forearm lifted
    armUpperL: [0, 0, 12], armLowerL: [-14, 0, 0],
    legUpperR: [0, 0, -5], legUpperL: [0, 0, 1], legLowerL: [4, 0, 0],
  },
};
const DEG = Math.PI / 180;

export function build(THREE, kit, colors = meta.colors) {
  const c = colors;
  const root = new THREE.Group();
  root.name = "mannequin";
  const joints = {};

  const joint = (name, parent, x, y, z) => {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    parent.add(g);
    joints[name] = g;
    return g;
  };
  const put = (parent, mesh, x = 0, y = 0, z = 0) => {
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const capsule = (r, length) => new THREE.CapsuleGeometry(r, Math.max(length - 2 * r, 0.001), 6, 16); // length = tip to tip
  const ball = (r) => new THREE.SphereGeometry(r, 20, 14);
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

  // Pelvis and belt: boxes, so the ink has to close at corners.
  const pelvis = joint("pelvis", root, 0, 0.92, 0);
  put(pelvis, kit.toon(box(0.3, 0.17, 0.2), c.trouser, c.trouserShade));
  put(pelvis, kit.toon(box(0.32, 0.045, 0.215), c.boot, c.bootShade), 0, 0.075, 0);
  put(pelvis, kit.toon(box(0.055, 0.04, 0.02), c.shirt, c.shirtShade), 0, 0.075, 0.113);

  // Spine, chest and the plate on it.
  const spine = joint("spine", pelvis, 0, 0.06, 0);
  const torso = put(spine, kit.toon(capsule(0.15, 0.52), c.shirt, c.shirtShade), 0, 0.25, 0);
  torso.scale.z = 0.72;
  put(spine, kit.toon(box(0.25, 0.2, 0.05), c.plate, c.plateShade), 0, 0.3, 0.1);

  // Neck and head. The face is +Z: eyes, pupils, a nose. The hair covers the back and the crown.
  const neck = joint("neck", spine, 0, 0.48, 0);
  put(neck, kit.toon(new THREE.CylinderGeometry(0.042, 0.048, 0.09, 16), c.wood, c.woodShade), 0, 0.03, 0);
  const head = joint("head", neck, 0, 0.06, 0);
  const skull = put(head, kit.toon(ball(0.1), c.wood, c.woodShade), 0, 0.045, 0);
  skull.scale.set(0.95, 1.12, 1.0);
  const hair = put(head, kit.toon(ball(0.108), c.boot, c.bootShade), 0, 0.06, -0.03);
  hair.scale.set(1.0, 1.12, 1.0);
  for (const s of [-1, 1]) {
    put(head, kit.toon(ball(0.016), c.eye, c.eye, { outline: false }), s * 0.036, 0.055, 0.088);
    put(head, kit.toon(ball(0.0085), c.pupil, c.pupil, { outline: false }), s * 0.036, 0.055, 0.101);
  }
  const nose = put(head, kit.toon(new THREE.ConeGeometry(0.014, 0.03, 10), c.wood, c.woodShade, { outline: false }), 0, 0.03, 0.1);
  nose.rotation.x = Math.PI / 2;

  // Arms: a ball at the shoulder, a capsule to the elbow, a capsule and a boxy hand below it. L is +X.
  for (const [side, x] of [["L", 0.21], ["R", -0.21]]) {
    const upper = joint(`armUpper${side}`, spine, x, 0.4, 0);
    put(upper, kit.toon(ball(0.054), c.wood, c.woodShade));
    put(upper, kit.toon(capsule(0.04, 0.3), c.shirt, c.shirtShade), 0, -0.145, 0);
    const lower = joint(`armLower${side}`, upper, 0, -0.29, 0);
    put(lower, kit.toon(ball(0.04), c.wood, c.woodShade));
    put(lower, kit.toon(capsule(0.034, 0.27), c.wood, c.woodShade), 0, -0.13, 0);
    put(lower, kit.toon(box(0.05, 0.085, 0.07), c.wood, c.woodShade), 0, -0.3, 0);
  }

  // Legs: capsule thigh, ball knee, capsule shin, a box boot. The sole sits on y = 0.
  for (const [side, x] of [["L", 0.095], ["R", -0.095]]) {
    const upper = joint(`legUpper${side}`, pelvis, x, -0.02, 0);
    put(upper, kit.toon(capsule(0.072, 0.44), c.trouser, c.trouserShade), 0, -0.2, 0);
    const lower = joint(`legLower${side}`, upper, 0, -0.43, 0);
    put(lower, kit.toon(ball(0.056), c.trouser, c.trouserShade));
    put(lower, kit.toon(capsule(0.05, 0.42), c.trouser, c.trouserShade), 0, -0.19, 0);
    const foot = joint(`foot${side}`, lower, 0, -0.39, 0);
    put(foot, kit.toon(box(0.1, 0.08, 0.26), c.boot, c.bootShade), 0, -0.04, 0.06);
  }

  function pose(name) {
    const rows = POSES[name];
    if (!rows) throw new Error(`unknown pose "${name}" (${Object.keys(POSES).join(", ")})`);
    const table = { ...REST, ...rows };
    for (const [joint, [rx, ry, rz]] of Object.entries(table)) joints[joint].rotation.set(rx * DEG, ry * DEG, rz * DEG);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
