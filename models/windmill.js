// windmill.js - a traditional European smock windmill (octagonal tower, domed cap, four lattice sails), animated.
// Contract: harness/lab/README.md. Meters, +Y up, the sails face +Z, the mill's left is +X, stands on y = 0, centred
// on x = 0, z = 0 (the tower axis).
//
// Construction (primitives only; flat-shaded octagons so the smock's facets read as two tones):
//   PLINTH  a low octagonal brick base (CylinderGeometry, 8 sides, a flat face square to +Z).
//   TOWER   a tapered octagonal smock (8-sided frustum) on the plinth, plastered white, with a thin wood batten on
//           each of its 8 edges (no hull) so the facets read even where neighbouring faces share a tone. Windows are
//           placed on their face's plane and leaned with it (the wall tilts back ~7 deg).
//   STAGE   an octagonal gallery deck around the tower at 2.6 m, 7 under-brackets, 16 rail posts (no ink: thin) and an
//           inked top rail of 8 straight bars. The door sits under it on the front face, in a plastered porch.
//   CAP     a joint "cap" (yaw about the tower axis): a curb ring, a domed cap (lathe, slightly long in z) with a
//           finial, the windshaft as a horizontal round bar out of the cap's front, and the tail pole (the lever that
//           turns the cap into the wind) slanting from the back of the curb down to the stage rail.
//   SAILS   a joint "sails" exactly on the windshaft axis at the poll end (canister). Two stocks cross through the
//           poll end; each of the four sails is a whip with a lattice on its trailing side: a leading board, an
//           inner lath, the hemlath and 12 sail bars. One opposite pair (upper-left / lower-right at rest) carries spread canvas
//           behind their lattice; the other pair is bare lattice. Lattice bars have no hull (a 5 px hull on every bar
//           scribbles at thumbnail size): the iris bars read as lines on their own. Whips, hemlaths and canvas are
//           inked with a 2 px hull so each sail still has a closed edge.
// Proportions (real size, base unit the sail radius R = 5.6 m): tower 0.7-8.8 m (circum radius 3.0 -> 1.95),
//   plinth 0-0.7 (3.3), stage 2.6 (3.9 = 0.7 R), cap curb 8.8, dome top 11.0, finial tip 11.55; windshaft axis y 9.8,
//   poll end z 3.0; sails r 1.3-5.6 from the axis, sail 2.1 m wide (0.38 R) including the leading board. At rest the sails
//   stand as an X (saltire) and the top is a sail tip; turning, the tips reach 15.4 m (15.6 at the hemlath corner); the lowest tip clears
//   the stage rail by ~0.6 m. ~2.1k triangles.
// Scaling: build(THREE, kit, colors, { height }) scales the whole mill uniformly (height = top at rest); { canvas:
//   false } leaves all four sails bare lattice, { canvas: "all" } spreads cloth on all four.
// Two-tone pairs (noon): plaster moon #fff6e4 / sky #f2d7ae at threshold 0.2 (the +Z face stays lit, the -X faces
//   go warm tan); brick plinth skin #f0c2ae / iris #5c3d32 at 0.2; domed cap accent #c4452d / iris at 0.2; stage
//   deck sky #f2d7ae / iris at 0.35 (lit floor, dark rim); wood (rails, battens, curb, stocks, whips, lattice, door,
//   windows) iris #5c3d32 single tone: the script has no tone between iris and ink, and hair #241c16 is darker than
//   ink #2c261f, so iris is the shade floor; canvas practical #fffaf2 / skin #f0c2ae at 0.1 (front lit, back skin).
// Clips: build() returns clips { spin: 6 s } (one full turn, anticlockwise seen from the front, the traditional
//   direction; seamless: the angle at t = T equals t = 0); pose("spin@1.5") is the clip at 1.5 s and loops. Named
//   poses: rest (X, still), cross (+, highest reach), spin-a / spin-b (frames 1/16 and 3/16 into the turn).
// Sign convention: sails.rotation.z = angle in radians, + is anticlockwise seen from the front (+Z); 0 is the "+"
//   cross (stocks vertical and horizontal), rest is +45 deg. cap.rotation.y yaws the cap (and sails) about the tower.

export const meta = {
  name: "windmill",
  height: 14.97,
  script: "noon",
  colors: {
    plaster: "#fff6e4", plasterShade: "#f2d7ae",
    brick: "#f0c2ae", brickShade: "#5c3d32",
    roof: "#c4452d", roofShade: "#5c3d32",
    wood: "#5c3d32", woodShade: "#5c3d32",
    deck: "#f2d7ae", deckShade: "#5c3d32",
    canvas: "#fffaf2", canvasShade: "#f0c2ae",
  },
  poses: ["rest", "cross", "spin-a", "spin-b"],
};

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const SPIN_T = 6; // seconds per revolution
const REST_ANGLE = 45 * DEG;

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, canvas = "pair" } = opts;
  const root = new THREE.Group();
  root.name = "windmill";
  const mill = new THREE.Group(); // the uniform size scale lives here, so root stays the plain contract node
  mill.name = "mill";
  mill.scale.setScalar(height / meta.height);
  root.add(mill);
  const joints = {};

  const flat = (g) => {
    const n = g.index ? g.toNonIndexed() : g;
    n.computeVertexNormals();
    return n;
  };
  const plaster = (g) => kit.toon(g, c.plaster, c.plasterShade, { threshold: 0.2 });
  const brick = (g) => kit.toon(g, c.brick, c.brickShade, { threshold: 0.2 });
  const roof = (g, o = {}) => kit.toon(g, c.roof, c.roofShade, { threshold: 0.2, ...o });
  const wood = (g, o = {}) => kit.toon(g, c.wood, c.woodShade, o);
  const cloth = (g) => kit.toon(g, c.canvas, c.canvasShade, { threshold: 0.1, px: 2 });
  const put = (parent, mesh, x = 0, y = 0, z = 0, name) => {
    mesh.position.set(x, y, z);
    if (name) mesh.name = name;
    parent.add(mesh);
    return mesh;
  };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

  // ---------- plinth and tower ----------
  const Y0 = 0.7, Y1 = 8.8, RB = 3.0, RT = 1.95;
  const A8 = Math.cos(Math.PI / 8); // apothem / circumradius of an octagon
  const rAt = (y) => RB + ((RT - RB) * (y - Y0)) / (Y1 - Y0);
  const LEAN = Math.atan(((RB - RT) * A8) / (Y1 - Y0)); // how far a wall face tilts back from vertical
  // thetaStart pi/8 puts a flat face square to +Z (CylinderGeometry vertex 0 is at +Z)
  const oct = (rt, rb, h) => flat(new THREE.CylinderGeometry(rt, rb, h, 8, 1, false, Math.PI / 8));
  put(mill, brick(oct(3.3, 3.35, Y0)), 0, Y0 / 2, 0, "plinth");
  put(mill, plaster(oct(RT, RB, Y1 - Y0 + 0.02)), 0, (Y0 + Y1) / 2, 0, "tower");
  // corner battens: thin wood strips on the 8 tower edges, so the octagon reads even where two faces share a tone
  const TILT = Math.atan((RB - RT) / (Y1 - Y0)), clen = (Y1 - Y0) / Math.cos(TILT);
  for (let k = 0; k < 8; k++) {
    const az = Math.PI / 8 + k * (TAU / 8), r = (RB + RT) / 2 + 0.02;
    const b = put(mill, wood(box(0.1, clen, 0.1), { outline: false }), r * Math.sin(az), (Y0 + Y1) / 2, r * Math.cos(az), `batten${k}`);
    b.rotation.set(0, az, 0, "YXZ");
    b.rotateX(-TILT);
  }

  // A part on the wall face at azimuth phi (0 = +Z face, + toward +X), centred at height y, lifted `off` off the wall.
  function onWall(mesh, phi, y, off, name) {
    const a = rAt(y) * A8 + off;
    mesh.position.set(a * Math.sin(phi), y, a * Math.cos(phi));
    mesh.rotation.set(0, phi, 0, "YXZ");
    mesh.rotateX(-LEAN);
    mesh.name = name;
    mill.add(mesh);
    return mesh;
  }
  // windows: an iris pane, no hull (a dark hole in a white wall needs no ink; a sill's hull read as a hook at 45 deg)
  const windows = [[0, 5.3], [Math.PI / 4, 3.9], [Math.PI / 4, 6.9], [-Math.PI / 4, 6.2]];
  windows.forEach(([phi, y], i) => onWall(wood(box(0.74, 1.0, 0.1), { outline: false }), phi, y, 0.0, `window${i}`));

  // ---------- door and porch (front, under the stage) ----------
  const doorZ = 3.35 * A8; // the plinth face
  put(mill, wood(box(1.05, 2.05, 0.6)), 0, 1.025, doorZ - 0.2, "door");
  put(mill, plaster(box(1.45, 0.3, 0.7)), 0, 2.18, doorZ - 0.2, "lintel");
  put(mill, plaster(box(0.2, 2.05, 0.66)), 0.62, 1.025, doorZ - 0.2, "jambL");
  put(mill, plaster(box(0.2, 2.05, 0.66)), -0.62, 1.025, doorZ - 0.2, "jambR");
  put(mill, brick(box(1.6, 0.18, 0.7)), 0, 0.09, doorZ + 0.25, "step");

  // ---------- stage (gallery) ----------
  const SY = 2.6, SR = 3.9;
  put(mill, kit.toon(oct(SR, SR, 0.22), c.deck, c.deckShade), 0, SY, 0, "stage");
  const railY = SY + 0.09 + 1.0;
  for (let k = 0; k < 8; k++) {
    const ca = Math.PI / 8 + k * (TAU / 8); // corner azimuth
    const cx = (SR - 0.12) * Math.sin(ca), cz = (SR - 0.12) * Math.cos(ca);
    const na = ca + TAU / 8, nx = (SR - 0.12) * Math.sin(na), nz = (SR - 0.12) * Math.cos(na);
    // corner post and a mid post (thin, no hull)
    put(mill, wood(box(0.1, 1.0, 0.1), { outline: false }), cx, SY + 0.59, cz, `post${k}`);
    put(mill, wood(box(0.07, 1.0, 0.07), { outline: false }), (cx + nx) / 2, SY + 0.59, (cz + nz) / 2, `postMid${k}`);
    // top rail: one bar corner to corner, inked thin
    const len = Math.hypot(nx - cx, nz - cz);
    const rail = put(mill, wood(box(len + 0.1, 0.1, 0.1), { px: 2 }), (cx + nx) / 2, railY, (cz + nz) / 2, `rail${k}`);
    rail.rotation.y = Math.atan2(-(nz - cz), nx - cx);
    // bracket under the deck, from the wall to the deck edge at this face's middle
    const fa = ca + TAU / 16;
    if (k === 7) continue; // the front face: the porch stands there
    const bx = Math.sin(fa), bz = Math.cos(fa);
    const br = put(mill, wood(box(0.14, 1.5, 0.14), { outline: false }), bx * 3.15, SY - 0.6, bz * 3.15, `bracket${k}`);
    br.rotation.set(0, fa, 0, "YXZ");
    br.rotateX(42 * DEG);
  }

  // ---------- cap ----------
  const cap = new THREE.Group();
  cap.name = "cap";
  cap.position.set(0, Y1, 0);
  mill.add(cap);
  joints.cap = cap;
  put(cap, wood(new THREE.CylinderGeometry(2.2, 2.15, 0.32, 16)), 0, 0.12, 0, "curb");
  // dome profile (r, y) above the curb: a full shoulder, then an ogee-ish lift to the finial
  const prof = [];
  const NP = 9;
  for (let i = 0; i <= NP; i++) {
    const t = i / NP;
    const r = 2.12 * Math.pow(Math.max(0, 1 - t * t), 0.62) * (1 - 0.12 * t);
    prof.push(new THREE.Vector2(Math.max(r, 0.0001), 0.25 + 1.95 * t));
  }
  prof.unshift(new THREE.Vector2(0.0001, 0.25));
  const domeG = new THREE.LatheGeometry(prof, 16);
  domeG.scale(1, 1, 1.12);
  domeG.computeVertexNormals();
  put(cap, roof(domeG), 0, 0, 0.12, "dome");
  put(cap, wood(new THREE.SphereGeometry(0.2, 10, 6)), 0, 2.3, 0.12, "finialBall");
  put(cap, wood(new THREE.ConeGeometry(0.07, 0.38, 6)), 0, 2.55, 0.12, "finialSpike");
  // windshaft: horizontal, from inside the dome to the poll end
  const HY = 9.8 - Y1, HZ = 3.0;
  const shaft = put(cap, wood(new THREE.CylinderGeometry(0.24, 0.26, HZ - 0.6, 10)), 0, HY, 0.6 + (HZ - 0.6) / 2 - 0.15, "windshaft");
  shaft.rotation.x = Math.PI / 2;
  // tail struts at the back (the tail pole that turns the cap), a slanted pole down to the stage rail
  {
    const top = [0.25, -1.95], bot = [railY - Y1 + 0.1, -SR + 0.05]; // (y, z) in the cap: curb back -> stage rail
    const len = Math.hypot(top[0] - bot[0], top[1] - bot[1]);
    const tail = put(cap, wood(box(0.2, len, 0.2)), 0, (top[0] + bot[0]) / 2, (top[1] + bot[1]) / 2, "tailPole");
    tail.rotation.x = Math.atan2(top[1] - bot[1], top[0] - bot[0]);
  }

  // ---------- sails ----------
  const sails = new THREE.Group();
  sails.name = "sails";
  sails.position.set(0, HY, HZ);
  cap.add(sails);
  joints.sails = sails;
  put(sails, wood(box(0.62, 0.62, 0.62)), 0, 0, 0, "pollEnd");
  const R = 5.6, R0 = 1.3;
  // one stock carries two opposite sails; the second stock is set 0.3 m behind so they cross without z-fighting
  const stocks = [[0, 0.16], [Math.PI / 2, -0.16]];
  stocks.forEach(([a, dz], i) => {
    const st = put(sails, wood(new THREE.BoxGeometry(0.26, 2 * R0 + 0.2, 0.26), { px: 2 }), 0, 0, dz, `stock${i}`);
    st.rotation.z = a;
  });
  const spread = canvas === "all" ? [0, 1, 2, 3] : canvas === false ? [] : [0, 2];
  for (let k = 0; k < 4; k++) {
    const arm = new THREE.Group();
    arm.name = `sail${k}`;
    arm.rotation.z = k * (Math.PI / 2);
    sails.add(arm);
    const z0 = k % 2 === 0 ? 0.16 : -0.16; // on its stock's plane
    const L = R - R0, ym = (R + R0) / 2;
    // whip: the tapered spar the lattice hangs on (a box tapered by scaling its tip end)
    const whipG = new THREE.BoxGeometry(0.22, R - 0.3, 0.22);
    const wp = whipG.attributes.position;
    for (let i = 0; i < wp.count; i++) if (wp.getY(i) > 0) { wp.setX(i, wp.getX(i) * 0.6); wp.setZ(i, wp.getZ(i) * 0.6); }
    whipG.computeVertexNormals();
    put(arm, wood(whipG, { px: 2 }), 0, 0.3 + (R - 0.3) / 2, z0, `whip${k}`);
    // lattice on the trailing (+x) side, leading board on the -x side; sail bars cross both
    const XL = -0.45, XH = 1.65, zl = z0 + 0.17; // lattice just in front of the whip
    put(arm, wood(box(0.12, L, 0.12), { px: 2 }), XH, ym, zl, `hemlath${k}`);
    put(arm, wood(box(0.08, L, 0.08), { outline: false }), 0.85, ym, zl, `lath${k}`);
    put(arm, wood(box(0.42, L, 0.05), { px: 2 }), -0.25, ym, zl, `board${k}`); // meets the whip: no slit
    const NB = 12;
    for (let b = 0; b <= NB; b++) {
      const y = R0 + 0.05 + ((L - 0.1) * b) / NB;
      put(arm, wood(box(XH - XL + 0.06, 0.08, 0.07), { outline: false }), (XL + XH) / 2, y, zl + 0.01, `bar${k}_${b}`);
    }
    if (spread.includes(k)) put(arm, cloth(box(XH - 0.05 + 0.02, L - 0.1, 0.03)), (XH - 0.05) / 2 + 0.01, ym, zl - 0.09, `canvas${k}`);
  }

  // ---------- clips and poses ----------
  const clips = { spin: SPIN_T };
  // name -> [sails angle, cap yaw]
  const POSES = {
    rest: [REST_ANGLE, 0],
    cross: [0, 0],
    "spin-a": [REST_ANGLE + TAU / 16, 0],
    "spin-b": [REST_ANGLE + (3 * TAU) / 16, 0],
  };
  function apply(angle, yaw) {
    sails.rotation.set(0, 0, angle);
    cap.rotation.set(0, yaw, 0);
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!(m[1] in clips)) throw new Error(`windmill: no clip "${m[1]}" (clips: ${Object.keys(clips).join(", ")})`);
      const t = ((+m[2] % SPIN_T) + SPIN_T) % SPIN_T;
      return apply(REST_ANGLE + (TAU * t) / SPIN_T, 0);
    }
    if (!(name in POSES)) throw new Error(`windmill: unknown pose "${name}" (${Object.keys(POSES).join(", ")})`);
    apply(...POSES[name]);
  }
  pose("rest");
  return { root, joints, pose, clips };
}
