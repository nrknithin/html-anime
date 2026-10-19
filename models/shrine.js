// shrine.js - a small nagare-zukuri Shinto shrine hall (honden), static. One set with models/torii.js.
// Contract: harness/lab/README.md. Meters, +Y up, the hall faces +Z (you climb the steps toward -Z), its left is +X,
// stands on y = 0, centred on x = 0, z = 0.
//
// Construction (lofts along x + primitives; flat-shaded so the roof planes and slabs read in two-tone cel):
//   ROOF     the identity cue. One (z, y) profile: a gable with the ridge behind the hall centre and the long nagare front
//            slope running on over the steps. Both slopes sag below their chord (y = ridge - drop * (t + 0.35 t (1 - t)),
//            steep at the ridge, flat at the eave). One solid lofted through 17 stations along x (roofSolid), split into
//            two material groups under one hull: a dark bark top slab and a vermilion rafter layer under it, so every eave
//            and gable edge shows a dark band over a red band, like the torii's kasagi. Sori: the whole roof, ridge
//            included, sweeps up toward both gables, y += 0.2 m * (|x| / 3.05)^3, as the kasagi does. Tried and dropped:
//            a lift that grew toward the eaves only (corners up, ridge straight), and any lift over ~0.25 m; both fold the
//            front slope edge-on to the hero camera near the gable, and the hull scribbles along the fold.
//   RIDGE    a dark ridge cap riding the same sweep, four katsuogi logs across it, and crossed chigi boards at both gable
//            ends, each board laid along one slope's tangent at the ridge and carried past it.
//   HALL     a plaster core extruded from the roof profile (prismX, earcut winding; its top 2 cm under the roof), so the
//            walls run up into the gable. Vermilion round posts stand on the stone base through the raised floor;
//            vermilion floor beam, head beam and gable tie beam + strut band the plaster. Front centre bay: dark doors.
//   VERANDA  a wood deck at y 1.05 round the front and sides, vermilion railing with an opening for the steps.
//   STEPS    four wood treads (stacked blocks) between vermilion stringers, under the front slope, which rests on two
//            vermilion posts and a front beam at the step foot.
//   FRONT    hung from the front beam: a straw shimenawa with two paper shide, and before it the bell rope (suzu-no-o,
//            red and white bands, a tassel) under the brass bell (suzu). The offertory box (saisen-bako) stands on the
//            ground before the steps.
// Proportions (real size, base unit the bay B = 1.2 m): hall 3 x 2 bays (3.6 x 2.4), floor 1.05 (0.9 B), stone base
//   4.8 x 3.55 x 0.35; roof 6.1 wide, z -2.7 .. +3.2 (eave depth 0.75 B at the back, the front slope 2.2 B past the hall
//   front); eaves at 3.3 (back) / 2.7 (front) at the centre, 0.2 higher at the gables; ridge 5.4 (5.6 at the gables),
//   ridge cap to 5.65, chigi tips 6.5. Footprint 6.1 x 6.1 under the roof.
// Scaling: build(THREE, kit, colors, { height }) scales the whole hall uniformly, as the torii does.
// Colours (noon), base / shade:
//   vermilion (posts, beams, rails, stringers, rafter layer)  accent #c4452d / iris #5c3d32, threshold 0.1 (as the torii)
//   roof (bark slab, ridge, chigi, katsuogi, doors, box)       iris #5c3d32 / hair #241c16, threshold 0.1. A dark brown
//            bark (hiwada) roof: noon has no grey or green. hair is darker than ink #2c261f (noon has no near-black above
//            ink); at 0.1 both slopes and the camera-facing eave edges stay iris, and hair lands only on the -X gable
//            ends, the steepest strip of the back slope under the ridge and the far sides of the small parts.
//   plaster (walls)                                           practical #fffaf2 / sky #f2d7ae
//   wood (deck, treads, hinoki)                               skin #f0c2ae / iris #5c3d32
//   straw (shimenawa)                                         sky #f2d7ae / iris #5c3d32
//   brass bell, lighter than the straw behind it              moon #fff6e4 / iris #5c3d32
//   stone (base)                                              sky #f2d7ae / iris #5c3d32, threshold 0.25
//   paper and the rope's white bands                          sclera #f6f3ee / sky #f2d7ae

export const meta = {
  name: "shrine",
  height: 6.5,
  script: "noon",
  colors: {
    vermilion: "#c4452d", vermilionShade: "#5c3d32",
    roof: "#5c3d32", roofShade: "#241c16",
    plaster: "#fffaf2", plasterShade: "#f2d7ae",
    wood: "#f0c2ae", woodShade: "#5c3d32",
    straw: "#f2d7ae", strawShade: "#5c3d32",
    bell: "#fff6e4", bellShade: "#5c3d32",
    stone: "#f2d7ae", stoneShade: "#5c3d32",
    paper: "#f6f3ee", paperShade: "#f2d7ae",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height } = opts;
  const H0 = 6.5; // the full-size hall as authored below
  const root = new THREE.Group();
  root.name = "shrine";
  const hall = new THREE.Group(); // the size scale lives here, root stays the plain contract node
  hall.name = "hall";
  hall.scale.setScalar(height / H0);
  root.add(hall);
  const joints = {};

  const red = (g) => kit.toon(g, c.vermilion, c.vermilionShade, { threshold: 0.1 });
  const dark = (g, threshold = 0.1) => kit.toon(g, c.roof, c.roofShade, { threshold });
  const plaster = (g) => kit.toon(g, c.plaster, c.plasterShade, { threshold: 0.1 });
  const wood = (g) => kit.toon(g, c.wood, c.woodShade, { threshold: 0.2 });
  const stone = (g) => kit.toon(g, c.stone, c.stoneShade, { threshold: 0.25 });
  const paper = (g) => kit.toon(g, c.paper, c.paperShade, { threshold: 0.1 });
  const put = (mesh, x = 0, y = 0, z = 0, name) => {
    mesh.position.set(x, y, z);
    if (name) mesh.name = name;
    hall.add(mesh);
    return mesh;
  };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cyl = (r, h, n = 8) => new THREE.CylinderGeometry(r, r, h, n);

  // ---------- roof profile ----------
  const ZR = -0.55, YR = 5.4; // ridge
  const ZF = 3.2, YF = 2.7; // front eave (nagare slope over the steps)
  const ZB = -2.7, YB = 3.3; // back eave
  const SAG = 0.35, T1 = 0.2, T2 = 0.34; // sag of each slope, bark slab and rafter layer bottoms below the top
  const XR = 3.05; // roof half width
  const slope = (z) => (z >= ZR ? [(z - ZR) / (ZF - ZR), YR - YF] : [(z - ZR) / (ZB - ZR), YR - YB]);
  const top = (z) => {
    const [t, d] = slope(z);
    return YR - d * (t + SAG * t * (1 - t));
  };
  const lift = (x) => 0.2 * Math.pow(Math.min(1, Math.abs(x) / XR), 3); // sori: the whole roof sweeps up to both gables
  const under = (z) => top(z) - T2; // roof underside without the corner lift (the lift only raises it)
  const roofZ = [];
  for (let i = 0; i <= 8; i++) roofZ.push(ZF + ((ZR - ZF) * i) / 8);
  for (let i = 1; i <= 5; i++) roofZ.push(ZR + ((ZB - ZR) * i) / 5);

  // A prism of the (z, y) outline pts, from x0 to x1 (steps sections along x). Shape u = -z so that rotateY(+90 deg),
  // a proper rotation, maps (u, v, w) to world (w, v, z): earcut's winding survives.
  function prismX(pts, x0, x1, steps = 1) {
    const shape = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(-z, y)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: x1 - x0, steps, bevelEnabled: false, curveSegments: 1 });
    g.rotateY(Math.PI / 2);
    g.translate(x0, 0, 0);
    return g;
  }
  // The roof is one solid through stations XS along x and the roofZ samples, faces tagged by kind: top, underside, front
  // and back eave faces, gable caps. Each triangle's winding comes from its kind's outward direction. Two material
  // groups split it at T1 under the top: bark above, vermilion rafters below, under ONE ink hull. (As two stacked
  // meshes, the rafter hull poked up through the bark slab wherever the slab was thinner than the 5 px hull on screen.)
  // The stations crowd toward the gables, where the sori bends the slab: each crease stays shallow, or the hull of one
  // facet pokes through the next at grazing views.
  const XS = [0, 0.45, 0.64, 0.75, 0.83, 0.89, 0.945, 1];
  XS.unshift(...XS.slice(1).map((u) => -u).reverse());
  for (let i = 0; i < XS.length; i++) XS[i] *= XR;
  function roofSolid() {
    const P = (x, z, d) => [x, top(z) - d + lift(x), z];
    const tris = [[], []]; // material groups: 0 bark, 1 rafters
    const add = (q, out, grp) => {
      for (const [a, b, e] of [[q[0], q[1], q[2]], [q[0], q[2], q[3]]]) {
        const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [e[0] - a[0], e[1] - a[1], e[2] - a[2]];
        const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        const keep = n[0] * out[0] + n[1] * out[1] + n[2] * out[2] > 0;
        tris[grp].push(...a, ...(keep ? b : e), ...(keep ? e : b));
      }
    };
    const band = (pa, pb, out) => { // a face from the top down to T2, split at T1: pa(d), pb(d) are its two edges
      add([pa(0), pb(0), pb(T1), pa(T1)], out, 0);
      add([pa(T1), pb(T1), pb(T2), pa(T2)], out, 1);
    };
    const N = roofZ.length, X0 = XS[0], X1 = XS[XS.length - 1];
    for (let s = 0; s < XS.length - 1; s++) {
      const [xa, xb] = [XS[s], XS[s + 1]];
      for (let i = 0; i < N - 1; i++) {
        const [za, zb] = [roofZ[i], roofZ[i + 1]];
        add([P(xa, za, 0), P(xa, zb, 0), P(xb, zb, 0), P(xb, za, 0)], [0, 1, 0], 0);
        add([P(xa, za, T2), P(xa, zb, T2), P(xb, zb, T2), P(xb, za, T2)], [0, -1, 0], 1);
      }
      band((d) => P(xa, ZF, d), (d) => P(xb, ZF, d), [0, 0, 1]);
      band((d) => P(xa, ZB, d), (d) => P(xb, ZB, d), [0, 0, -1]);
    }
    for (let i = 0; i < N - 1; i++) {
      const [za, zb] = [roofZ[i], roofZ[i + 1]];
      band((d) => P(X0, za, d), (d) => P(X0, zb, d), [-1, 0, 0]);
      band((d) => P(X1, za, d), (d) => P(X1, zb, d), [1, 0, 0]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(tris[0].concat(tris[1]), 3));
    g.addGroup(0, tris[0].length / 3, 0);
    g.addGroup(tris[0].length / 3, tris[1].length / 3, 1);
    g.computeVertexNormals(); // non-indexed: flat
    return g;
  }
  const roof = new THREE.Mesh(roofSolid(), [
    kit.cel(c.roof, c.roofShade, { threshold: 0.1 }),
    kit.cel(c.vermilion, c.vermilionShade, { threshold: 0.1 }),
  ]);
  put(kit.outline(roof), 0, 0, 0, "roof");

  // ---------- ridge: cap, katsuogi, chigi (all riding the lift) ----------
  const RC0 = YR - 0.3, RC1 = YR + 0.25, RCD = 0.21; // ridge cap bottom, top, half depth
  // a box along x riding the sori: four rows of stations, each face wound from its outward direction (as the roof)
  const capGeo = (() => {
    const pts = [];
    const Q = (x, y, dz) => [x, y + lift(x), ZR + dz];
    const face = (q, out) => {
      for (const [a, b, e] of [[q[0], q[1], q[2]], [q[0], q[2], q[3]]]) {
        const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [e[0] - a[0], e[1] - a[1], e[2] - a[2]];
        const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        const keep = n[0] * out[0] + n[1] * out[1] + n[2] * out[2] > 0;
        pts.push(...a, ...(keep ? b : e), ...(keep ? e : b));
      }
    };
    for (let s = 0; s < XS.length - 1; s++) {
      const [xa, xb] = [XS[s], XS[s + 1]];
      face([Q(xa, RC1, RCD), Q(xb, RC1, RCD), Q(xb, RC1, -RCD), Q(xa, RC1, -RCD)], [0, 1, 0]);
      face([Q(xa, RC0, RCD), Q(xb, RC0, RCD), Q(xb, RC0, -RCD), Q(xa, RC0, -RCD)], [0, -1, 0]);
      face([Q(xa, RC0, RCD), Q(xb, RC0, RCD), Q(xb, RC1, RCD), Q(xa, RC1, RCD)], [0, 0, 1]);
      face([Q(xa, RC0, -RCD), Q(xb, RC0, -RCD), Q(xb, RC1, -RCD), Q(xa, RC1, -RCD)], [0, 0, -1]);
    }
    for (const [x, sx] of [[XS[0], -1], [XS[XS.length - 1], 1]])
      face([Q(x, RC0, RCD), Q(x, RC1, RCD), Q(x, RC1, -RCD), Q(x, RC0, -RCD)], [sx, 0, 0]);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    g.computeVertexNormals();
    return g;
  })();
  put(dark(capGeo), 0, 0, 0, "ridgeCap");
  for (const x of [-1.65, -0.55, 0.55, 1.65]) {
    const k = put(dark(cyl(0.13, 0.95, 10)), x, RC1 + 0.1 + lift(x), ZR, "katsuogi");
    k.rotation.x = Math.PI / 2;
  }
  // tangent of each slope at the ridge: dy/dz = d (1 + SAG) / L
  const aF = Math.atan(((YR - YF) * (1 + SAG)) / (ZF - ZR)), aB = Math.atan(((YR - YB) * (1 + SAG)) / (ZR - ZB));
  for (const s of [1, -1]) {
    for (const [a, dz] of [[aF, -1], [aB, 1]]) {
      // the board runs up its slope toward the ridge and on past it: direction (0, sin a, dz cos a)
      const dir = new THREE.Vector3(0, Math.sin(a), dz * Math.cos(a));
      const L = 1.55, above = 0.95; // length, and how far past the crossing point it rises
      const cx = new THREE.Vector3(s * (XR - 0.06), YR + 0.08 + lift(XR), ZR).addScaledVector(dir, above - L / 2);
      const b = put(dark(box(0.1, L, 0.22)), cx.x, cx.y, cx.z, "chigi");
      b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    }
  }

  // ---------- stone base, hall core, posts, beams ----------
  put(stone(box(4.8, 0.35, 3.55)), 0, 0.175, -0.4, "base");
  const HX = 1.8, HZF = 0.6, HZB = -1.8, FLOOR = 1.05;
  const coreZ = [HZF, ...roofZ.filter((z) => z < HZF && z > HZB), HZB];
  // + lift(HX): the gable walls meet the swept roof; mid-hall the core's top hides inside the rafter slab
  const core = coreZ.map((z) => [z, under(z) - 0.02 + lift(HX)]).concat([[HZB, FLOOR], [HZF, FLOOR]]);
  put(plaster(prismX(core, -HX, HX)), 0, 0, 0, "walls");
  const post = (x, z, y0, y1, r = 0.12) => put(red(cyl(r, y1 - y0)), x, (y0 + y1) / 2, z, "post");
  for (const x of [-HX, -0.6, 0.6, HX]) for (const z of [HZF, HZB]) post(x, z, 0.3, under(z) + 0.04);
  for (const x of [-HX, HX]) post(x, -0.6, 0.3, under(-0.6) + 0.04);
  // beams: floor beam and head beam round the walls, 4 cm proud
  for (const [y, h] of [[FLOOR + 0.08, 0.16], [2.92, 0.2]]) {
    put(red(box(2 * HX + 0.12, h, 0.1)), 0, y, HZF, "beam");
    put(red(box(2 * HX + 0.12, h, 0.1)), 0, y, HZB, "beam");
    for (const s of [1, -1]) put(red(box(0.1, h, HZF - HZB + 0.12)), s * HX, y, (HZF + HZB) / 2, "beam");
  }
  // gable: tie beam and the central strut up to the ridge, both ends
  for (const s of [1, -1]) {
    put(red(box(0.1, 0.18, HZF - HZB)), s * HX, 3.75, (HZF + HZB) / 2, "gableBeam");
    put(red(box(0.1, under(ZR) - 3.75, 0.16)), s * HX, (3.75 + under(ZR)) / 2, ZR, "gableStrut");
  }
  put(dark(box(1.08, 1.62, 0.06), 0.1), 0, FLOOR + 0.06 + 0.81, HZF + 0.02, "doors");
  put(red(box(0.06, 1.62, 0.08)), 0, FLOOR + 0.06 + 0.81, HZF + 0.04, "doorMullion");

  // ---------- veranda, railing ----------
  const DX = 2.35, DZ = 1.35;
  put(wood(box(2 * DX, 0.12, DZ - HZB + 0.1)), 0, FLOOR - 0.06, (DZ + HZB - 0.1) / 2, "deck");
  for (const x of [-DX + 0.08, DX - 0.08]) for (const z of [DZ - 0.08, -0.6]) post(x, z, 0.3, FLOOR - 0.1, 0.08);
  const RY = FLOOR + 0.62, OPEN = 0.72; // rail height, half-opening for the steps
  const rail = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    for (const [y, t] of [[RY, 0.08], [FLOOR + 0.3, 0.06]]) {
      const g = x0 === x1 ? box(t, t, len) : box(len, t, t);
      put(red(g), (x0 + x1) / 2, y, (z0 + z1) / 2, "rail");
    }
    const n = Math.max(1, Math.round(len / 0.75));
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n, z = z0 + ((z1 - z0) * i) / n;
      put(red(box(0.07, RY - FLOOR + 0.05, 0.07)), x, (FLOOR + RY + 0.05) / 2, z, "railPost");
    }
  };
  const RX = DX - 0.06, RZ = DZ - 0.06;
  for (const s of [1, -1]) {
    rail(s * OPEN, RZ, s * RX, RZ);
    rail(s * RX, RZ, s * RX, HZB + 0.1);
    put(red(cyl(0.06, 0.22, 8)), s * OPEN, RY + 0.12, RZ, "giboshi"); // the tall post where the rail meets the steps
  }

  // ---------- steps, front posts ----------
  const RISE = FLOOR / 5, RUN = 0.3, SW = 0.68;
  for (let i = 1; i <= 4; i++) {
    const y = RISE * i, z0 = DZ + RUN * (4 - i);
    put(wood(box(2 * SW, y, RUN + 0.02)), 0, y / 2, z0 + RUN / 2, "step");
  }
  const zFoot = DZ + 4 * RUN;
  for (const s of [1, -1]) {
    const L = Math.hypot(zFoot - DZ, FLOOR), a = Math.atan2(FLOOR, zFoot - DZ);
    // centred so its lower edge runs from the step foot (y 0) to the deck edge
    const st = put(red(box(0.07, 0.26, L)), s * (SW + 0.035), FLOOR / 2 + 0.13 * Math.cos(a), (DZ + zFoot) / 2 - 0.13 * Math.sin(a), "stringer");
    st.rotation.x = a;
  }
  const PZ = zFoot + 0.12, PX = 1.0;
  for (const s of [1, -1]) {
    post(s * PX, PZ, 0, under(PZ) + 0.04, 0.11);
    put(stone(box(0.34, 0.12, 0.34)), s * PX, 0.06, PZ, "postStone");
    put(red(box(0.12, 0.16, PZ - HZF)), s * PX, 2.42, (PZ + HZF) / 2, "tieBeam");
  }
  const FBY = 2.42;
  put(red(box(2 * PX + 0.4, 0.2, 0.14)), 0, FBY, PZ, "frontBeam");

  // ---------- bell rope, bell, offertory box ----------
  const rope = new THREE.Group();
  rope.name = "suzuNoO";
  hall.add(rope);
  rope.position.set(0, 0, PZ + 0.26); // in front of the shimenawa
  const bands = 6, rTop = FBY - 0.6, rBot = 0.95, bandH = (rTop - rBot) / bands;
  for (let i = 0; i < bands; i++) {
    const g = cyl(0.055, bandH + 0.004, 6);
    const m = i % 2 ? paper(g) : red(g);
    m.position.y = rTop - bandH * (i + 0.5);
    rope.add(m);
  }
  const bell = kit.toon(new THREE.SphereGeometry(0.19, 10, 6), c.bell, c.bellShade, { threshold: 0.35 }); // brass
  bell.position.y = rTop + 0.14;
  bell.name = "suzu";
  rope.add(bell);
  const hanger = red(cyl(0.03, FBY - 0.04 - rTop - 0.2));
  hanger.position.y = (FBY - 0.04 + rTop + 0.2) / 2;
  rope.add(hanger);
  const arm = red(box(0.06, 0.06, 0.26)); // bracket from the beam's face out to the hanger
  arm.position.set(0, FBY - 0.04, -0.12);
  rope.add(arm);
  const tassel = red(new THREE.CylinderGeometry(0.06, 0.1, 0.16, 8));
  tassel.position.y = rBot - 0.08;
  rope.add(tassel);
  const BZ = PZ + 0.5;
  put(dark(box(1.0, 0.5, 0.5), 0.1), 0, 0.25, BZ, "saisenBako");
  for (let i = -2; i <= 2; i++) put(dark(box(0.92, 0.06, 0.06), 0.1), 0, 0.53, BZ + i * 0.09, "slat");

  // ---------- shimenawa and shide under the front beam ----------
  // straw rope sagging between the step posts, white zigzag shide hanging from it either side of the bell
  const SZ = PZ + 0.12, SY = FBY - 0.12, SX = PX - 0.12;
  const straw = (g) => kit.toon(g, c.straw, c.strawShade, { threshold: 0.2 });
  const sag = (x) => SY - 0.2 * (1 - (x / SX) ** 2);
  const curve = new THREE.CatmullRomCurve3([-1, -0.5, 0, 0.5, 1].map((u) => new THREE.Vector3(u * SX, sag(u * SX), SZ)));
  put(straw(new THREE.TubeGeometry(curve, 12, 0.1, 7, false)), 0, 0, 0, "shimenawa");
  for (const s of [-1, 1]) put(straw(new THREE.SphereGeometry(0.1, 7, 5)), s * SX, SY, SZ, "shimenawaEnd");
  // shide: a zigzag strip of white paper, three steps down
  const zig = new THREE.Shape();
  [[0, 0], [0.12, 0], [0.12, -0.12], [0.18, -0.12], [0.18, -0.26], [0.24, -0.26], [0.24, -0.4], [0.12, -0.4],
    [0.12, -0.28], [0.06, -0.28], [0.06, -0.14], [0, -0.14]].forEach(([x, y], i) => (i ? zig.lineTo(x, y) : zig.moveTo(x, y)));
  for (const x of [-0.55, 0.45]) {
    const g = new THREE.ExtrudeGeometry(zig, { depth: 0.02, bevelEnabled: false });
    put(paper(g), x, sag(x + 0.06) - 0.05, SZ + 0.03, "shide");
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
