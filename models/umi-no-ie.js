// umi-no-ie.js - a summer beach hut (umi-no-ie), the seasonal shack of every anime beach episode, static.
// Contract: harness/lab/README.md. Meters, +Y up, the open front (and the sea) faces +Z, its left is +X (the counter
// end), stands on y = 0 (the sand), centred on x = 0, z = 0 (the bbox: the sand patch; the hut sits on its -Z half).
//
// Construction (three.js boxes, cylinders, tori and spheres plus hand-built soups for the corrugated roof, the
// parasol gores and the banner decals, all transformed into world space and merged per material: 10 meshes, 4.5k triangles):
//   FRAME    a post-and-beam shack 8 x 5 m: five posts along the open front and the back, one at each side middle,
//            a header beam on the front and back posts, rafters at every post line carrying a mono-pitch roof that
//            falls 0.6 m toward the back and overhangs 0.7 m over the front (the deep shade awning).
//   ROOF     one corrugated sheet as a flat-shaded triangle-wave soup (ribs down the slope, 0.24 m pitch, facets
//            +-35 deg), so the lit and shaded facets draw the stripes of a tin roof; a flat underside and edge strips
//            close it, every triangle wound along an explicit outward direction.
//   WALLS    vertical boards on the back wall (dark seams as flat strips on the inner face, seen through the
//            open front) and reed screens (yoshizu) on both sides, with tie lines on their outer faces.
//   INSIDE   a raised plank platform (koagari, 0.42 m) on the -X 2/3 with tatami on top (heri borders as strips), two
//            low tables and red zabuton; a plank counter on the +X bay with a red hand-crank kakigori machine
//            (frame, ice holder, flywheel with a crank knob, a bowl of shaved ice), two served cups and syrup bottles.
//   FRONT    sudare blinds hanging from the header in the two -X bays, rolled partly down (a roll at the bottom,
//            slat lines, two cords); a sagging rope across the middle bay with two swim rings and a beach ball (two more rings on the +X screen); a
//            white cloth banner over the counter with a red ice-mound shape on a cup and a band of waves (no text).
//   SAND     a flat sand patch 13 x 12.4 m, 3 cm thick; a red cooler box with a white lid by the counter; parasols
//            (eight gores alternating red / white, a pole and a finial, slightly tilted) each over a low folding chair.
// Proportions (real size, base unit the front roof height H = 3.0 m): footprint 8.0 x 5.0 (posts), roof 8.6 x 6.0,
// back eave H - 0.6; platform 5.6 x 4.1 x 0.42; counter 1.9 x 0.6 x 1.0; machine 0.62 tall; banner 1.05 x 0.72;
// rings 0.56 across; parasols 2.0 across, 2.25 tall; chairs 0.62 x 0.5 seat 0.25 high.
// Options: build(THREE, kit, colors, { height, parasols })
//   height    the front roof height (default 3.0): posts, beams, roof, blinds, banner and rope follow; the platform,
//             counter and props keep their real size. Not a scale. The lab's meta.height check is for the default.
//   parasols  0-3 parasols, each with a chair (default 2).
// Colours (meadow, the seawall's summer-seaside script, so the beach sets compose): roof tin sclera #f6f3ee / sky
// #d7ecef (sun-bleached sheet, cool facet stripes); frame posts iris #3f8a47 / hair #2c5131 (green-painted wood);
// boards, platform, counter, tables skin #f0c2ae / practical #f2c94c (pale planed pine, warm shade); reed blinds and
// screens practical / skin (straw); tatami line #a9d16e / iris; red parts (parasol gores, machine, cooler, zabuton,
// rings, syrup) accent #d9483b / skin; white cloth (banner, white gores, lid, ice) moon #f7f3e1 / sky; sand moon / skin;
// seams, slat lines, heri and rope hair flat; wave decal sky flat; one ring and the ball stripes practical.

export const meta = {
  name: "umi-no-ie",
  height: 3.0,
  script: "meadow",
  colors: {
    roof: "#f6f3ee", roofShade: "#d7ecef",
    frame: "#3f8a47", frameShade: "#2c5131",
    wood: "#f0c2ae", woodShade: "#f2c94c",
    reed: "#f2c94c", reedShade: "#f0c2ae",
    tatami: "#a9d16e", tatamiShade: "#3f8a47",
    red: "#d9483b", redShade: "#f0c2ae",
    cloth: "#f7f3e1", clothShade: "#d7ecef",
    sand: "#f7f3e1", sandShade: "#f0c2ae",
    line: "#2c5131",
    wave: "#d7ecef",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height: H = 3.0, parasols: NP = 2 } = opts;
  const root = new THREE.Group();
  root.name = "umi-no-ie";
  const joints = {};

  // ---------- soups: world positions + normals per material ----------
  const soups = {};
  const S = (k) => (soups[k] ??= { p: [], n: [] });
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const M = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
    new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), V(sx, sy, sz));
  function put(key, geo, m) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.applyMatrix4(m);
    const s = S(key), p = g.attributes.position.array, n = g.attributes.normal.array;
    for (let i = 0; i < p.length; i++) (s.p.push(p[i]), s.n.push(n[i]));
    geo.dispose();
  }
  const box = (key, x, y, z, sx, sy, sz, ry = 0) => put(key, new THREE.BoxGeometry(sx, sy, sz), M(x, y, z, 0, ry));
  // box between two y levels with its base on y0
  const blk = (key, x0, x1, y0, y1, z0, z1) => box(key, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0);
  const cyl = (key, x, y, z, r0, r1, h, seg = 8, m) => put(key, new THREE.CylinderGeometry(r1, r0, h, seg), m ?? M(x, y + h / 2, z));
  // a beam (square section w) between points a and b
  function beam(key, a, b, w, h = w) {
    const A = V(...a), B = V(...b), L = A.distanceTo(B);
    const up = Math.abs(B.y - A.y) > 0.9 * L ? V(0, 0, 1) : V(0, 1, 0);
    const m = new THREE.Matrix4().lookAt(A, B, up);
    m.setPosition(A.clone().add(B).multiplyScalar(0.5));
    put(key, new THREE.BoxGeometry(w, h, L), m);
  }
  // one flat-shaded triangle wound so its normal points along `out`
  function tri(key, a, b, e, out) {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ae = [e[0] - a[0], e[1] - a[1], e[2] - a[2]];
    let n = [ab[1] * ae[2] - ab[2] * ae[1], ab[2] * ae[0] - ab[0] * ae[2], ab[0] * ae[1] - ab[1] * ae[0]];
    const l = Math.hypot(...n);
    if (l < 1e-9) return;
    n = n.map((v) => v / l);
    const s = S(key);
    if (n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0) (s.p.push(...a, ...e, ...b), n = n.map((v) => -v));
    else s.p.push(...a, ...b, ...e);
    s.n.push(...n, ...n, ...n);
  }
  const quad = (key, a, b, e, d, out) => (tri(key, a, b, e, out), tri(key, a, e, d, out));
  // a flat decal quad facing +Z (or +X with side) at depth z
  const fz = (key, x0, x1, y0, y1, z) => quad(key, [x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [0, 0, 1]);
  const fx = (key, z0, z1, y0, y1, x, sgn = 1) => quad(key, [x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0], [sgn, 0, 0]);
  const fy = (key, x0, x1, z0, z1, y) => quad(key, [x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [0, 1, 0]);

  // ---------- layout ----------
  const ZF = -0.6, ZB = -5.6, XS = 4.0; // post lines
  const OVF = 0.7, OVB = 0.3, OVX = 0.3; // roof overhangs
  const DROP = 0.6, T = 0.05; // roof fall to the back, sheet + rib depth
  const zr0 = ZF + OVF, zr1 = ZB - OVB; // roof front / back edge
  const roofY = (z) => H - T - DROP * (zr0 - z) / (zr0 - zr1); // underside of the sheet
  const RAF = 0.14; // rafter depth
  const hF = roofY(ZF) - RAF, hB = roofY(ZB) - RAF; // header beam tops
  const HB = 0.18; // header depth
  const postX = [-4, -2, 0, 2, 4];

  // sand
  blk("sand", -6.5, 6.5, 0, 0.03, -6.2, 6.2);

  // frame: posts, headers, rafters, side middle posts
  for (const x of postX) {
    box("frame", x, hF / 2, ZF, 0.12, hF, 0.12);
    box("frame", x, hB / 2, ZB, 0.12, hB, 0.12);
    beam("frame", [x, roofY(zr0 - 0.05) - RAF / 2, zr0 - 0.05], [x, roofY(zr1 + 0.05) - RAF / 2, zr1 + 0.05], 0.09, RAF);
  }
  for (const s of [-1, 1]) {
    const zm = (ZF + ZB) / 2, hm = roofY(zm) - RAF;
    box("frame", s * XS, hm / 2, zm, 0.12, hm, 0.12);
    beam("frame", [s * XS, hF - 0.05, ZF], [s * XS, hB - 0.05, ZB], 0.1, 0.1);
  }
  blk("frame", -XS - 0.08, XS + 0.08, hF - HB, hF, ZF - 0.07, ZF + 0.07);
  blk("frame", -XS - 0.08, XS + 0.08, hB - HB, hB, ZB - 0.07, ZB + 0.07);
  // front fascia under the roof's front edge
  blk("frame", -XS - OVX, XS + OVX, roofY(zr0) - 0.12, roofY(zr0), zr0 - 0.08, zr0);

  // corrugated roof sheet: triangle-wave ribs running down the slope
  {
    const x0 = -XS - OVX, x1 = XS + OVX, P = 0.36, A = 0.04;
    const nr = Math.round((x1 - x0) / P), dx = (x1 - x0) / nr;
    const top = (x, z, k) => [x, roofY(z) + T - A + (k ? A : 0), z]; // k: crest
    const nUp = [0, 1, (DROP / (zr0 - zr1))];
    for (let i = 0; i < nr; i++) {
      const xa = x0 + i * dx, xm = xa + dx / 2, xb = xa + dx;
      const a0 = top(xa, zr0, 0), m0 = top(xm, zr0, 1), b0 = top(xb, zr0, 0);
      const a1 = top(xa, zr1, 0), m1 = top(xm, zr1, 1), b1 = top(xb, zr1, 0);
      quad("roof", a0, m0, m1, a1, nUp);
      quad("roof", m0, b0, b1, m1, nUp);
      // front and back edge: close the wave down to the underside
      const u0 = (x) => [x, roofY(zr0), zr0], u1 = (x) => [x, roofY(zr1), zr1];
      quad("roof", u0(xa), u0(xb), b0, a0, [0, 0, 1]); tri("roof", a0, b0, m0, [0, 0, 1]);
      quad("roof", u1(xa), u1(xb), b1, a1, [0, 0, -1]); tri("roof", a1, b1, m1, [0, 0, -1]);
    }
    quad("roof", [x0, roofY(zr0), zr0], [x1, roofY(zr0), zr0], [x1, roofY(zr1), zr1], [x0, roofY(zr1), zr1], [0, -1, 0]);
    for (const [x, s] of [[x0, -1], [x1, 1]])
      quad("roof", [x, roofY(zr0), zr0], [x, roofY(zr0) + T - A, zr0], [x, roofY(zr1) + T - A, zr1], [x, roofY(zr1), zr1], [s, 0, 0]);
  }

  // back wall: boards, seams on the inner face
  blk("wood", -XS, XS, 0, hB - HB, ZB - 0.1, ZB - 0.04);
  for (let x = -XS + 0.3; x < XS - 0.1; x += 0.3) fz("line", x - 0.012, x + 0.012, 0.03, hB - HB, ZB - 0.035);
  // reed side screens (yoshizu) with tie lines outside and inside
  for (const s of [-1, 1]) {
    const ytop = 2.1, x = s * (XS + 0.08);
    blk("reed", x - 0.02, x + 0.02, 0.05, ytop, ZB + 0.1, ZF - 0.1);
    for (const y of [0.45, 1.1, 1.75]) {
      fx("line", ZB + 0.1, ZF - 0.1, y - 0.015, y + 0.015, x + 0.025, 1);
      fx("line", ZB + 0.1, ZF - 0.1, y - 0.015, y + 0.015, x - 0.025, -1);
    }
    for (let z = ZB + 0.3; z < ZF - 0.2; z += 0.3) fx("line", z - 0.006, z + 0.006, 0.05, ytop, x + 0.025 * s, s);
    blk("frame", x - 0.04, x + 0.04, ytop, ytop + 0.06, ZB, ZF);
  }

  // platform (koagari) with tatami
  const PX0 = -3.9, PX1 = 1.7, PZ0 = -5.5, PZ1 = -1.4, PY = 0.42;
  blk("wood", PX0, PX1, 0, PY - 0.03, PZ0, PZ1);
  blk("wood", PX0 - 0.03, PX1 + 0.03, PY - 0.07, PY - 0.03, PZ0, PZ1 + 0.06); // nosing board
  for (let x = PX0 + 0.7; x < PX1; x += 0.7) fz("line", x - 0.01, x + 0.01, 0.02, PY - 0.07, PZ1 + 0.001);
  blk("tatami", PX0 + 0.03, PX1 - 0.03, PY - 0.03, PY, PZ0 + 0.03, PZ1 - 0.03);
  for (let x = PX0 + 0.03 + 1.8; x < PX1 - 0.3; x += 1.8) fy("line", x - 0.02, x + 0.02, PZ0 + 0.03, PZ1 - 0.03, PY + 0.002);
  for (const z of [PZ1 - 0.03 - 0.9, PZ1 - 0.03 - 2.7]) fy("line", PX0 + 0.03, PX1 - 0.03, z - 0.02, z + 0.02, PY + 0.002);
  fy("line", PX0 + 0.03, PX1 - 0.03, PZ1 - 0.07, PZ1 - 0.03, PY + 0.002);
  // low tables and zabuton
  for (const [tx, tz] of [[-2.7, -2.6], [-0.3, -3.0], [-2.2, -4.5]]) {
    const top = PY + 0.33;
    blk("wood", tx - 0.55, tx + 0.55, top - 0.045, top, tz - 0.38, tz + 0.38);
    for (const [lx, lz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box("wood", tx + lx * 0.48, (PY + top - 0.045) / 2, tz + lz * 0.31, 0.06, top - 0.045 - PY, 0.06);
    for (const [zx, zz] of [[0, 0.62], [0, -0.62], [-0.85, 0]]) box("red", tx + zx, PY + 0.04, tz + zz, 0.5, 0.08, 0.5);
  }

  // counter
  const CX0 = 2.05, CX1 = 3.9, CZ0 = -1.65, CZ1 = -1.05, CY = 1.0;
  blk("wood", CX0, CX1, 0, CY - 0.05, CZ0, CZ1);
  blk("wood", CX0 - 0.05, CX1 + 0.04, CY - 0.05, CY, CZ0 - 0.04, CZ1 + 0.08);
  for (let x = CX0 + 0.3; x < CX1 - 0.1; x += 0.3) fz("line", x - 0.01, x + 0.01, 0.03, CY - 0.06, CZ1 + 0.001);
  // shelf behind the counter
  blk("wood", 2.2, 3.85, 1.25, 1.29, ZB + 0.05, ZB + 0.45);
  for (const [bx, h, k] of [[2.5, 0.3, "red"], [2.75, 0.3, "tatami"], [3.0, 0.3, "reed"], [3.3, 0.18, "cloth"], [3.55, 0.18, "cloth"]]) cyl(k, bx, 1.29, ZB + 0.25, 0.07, 0.07, h, 8);

  // kakigori machine (built at its own origin, turned 50 deg so the flywheel faces the open front):
  // base, column, arm, ice holder, flywheel with spokes and a crank knob, a bowl of shaved ice under the blade
  {
    const y0 = CY, mm = M(2.45, y0, -1.32, 0, 0.85);
    const L = (x, y, z, rx = 0, ry = 0, rz = 0) => mm.clone().multiply(M(x, y, z, rx, ry, rz));
    const lb = (key, x, y, z, sx, sy, sz) => put(key, new THREE.BoxGeometry(sx, sy, sz), L(x, y, z));
    const lc = (key, x, y, z, r0, r1, h, seg) => put(key, new THREE.CylinderGeometry(r1, r0, h, seg), L(x, y + h / 2, z));
    const lp = (x, y, z) => V(x, y, z).applyMatrix4(mm).toArray();
    lb("red", 0, 0.025, 0, 0.34, 0.05, 0.32);
    lb("red", 0, 0.305, -0.125, 0.1, 0.51, 0.09);
    lb("red", 0, 0.515, -0.075, 0.1, 0.09, 0.19);
    lc("red", 0, 0.35, 0.02, 0.12, 0.12, 0.13, 12);
    lc("red", 0, 0.48, 0.02, 0.05, 0.03, 0.12, 8);
    lc("cloth", 0, 0.6, 0.02, 0.025, 0.025, 0.04, 8);
    const R = 0.2, wx = 0.16, wy = 0.4;
    put("red", new THREE.TorusGeometry(R, 0.024, 6, 22), L(wx, wy, 0, 0, Math.PI / 2));
    for (let k = 0; k < 4; k++) beam("red", lp(wx, wy, 0), lp(wx, wy + R * Math.cos(k * 1.571), R * Math.sin(k * 1.571)), 0.025);
    beam("red", lp(0, wy, 0), lp(wx + 0.03, wy, 0), 0.035);
    beam("cloth", lp(wx + 0.01, wy - R * 0.7, R * 0.7), lp(wx + 0.11, wy - R * 0.7, R * 0.7), 0.04);
    lc("cloth", 0, 0.05, 0.02, 0.06, 0.1, 0.07, 10);
    put("cloth", new THREE.SphereGeometry(0.095, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), L(0, 0.12, 0.02).multiply(M(0, 0, 0, 0, 0, 0, 1, 0.9, 1)));
  }
  {
    const y0 = CY;
    // served cups of ice: strawberry and melon syrup
    for (const [sx, sz, k] of [[3.3, -1.25, "red"], [3.62, -1.35, "tatami"]]) {
      cyl("cloth", sx, y0, sz, 0.05, 0.08, 0.1, 10);
      put(k, new THREE.SphereGeometry(0.085, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M(sx, y0 + 0.1, sz, 0, 0, 0, 1, 1.15, 1));
    }
  }

  // sudare: two -X bays, rolled partly down
  for (const [xa, xb, len] of [[-4, -2, 1.05], [-2, 0, 0.6]]) {
    const x0 = xa + 0.08, x1 = xb - 0.08, yt = hF - HB, yb = yt - len, z = ZF + 0.09;
    blk("reed", x0, x1, yb, yt, z - 0.01, z + 0.01);
    for (let y = yb + 0.08; y < yt - 0.02; y += 0.08) fz("line", x0, x1, y - 0.006, y + 0.006, z + 0.011);
    for (const xc of [x0 + 0.3, x1 - 0.3]) fz("line", xc - 0.012, xc + 0.012, yb, yt, z + 0.012);
    put("reed", new THREE.CylinderGeometry(0.055, 0.055, x1 - x0 + 0.04, 10), M((x0 + x1) / 2, yb, z + 0.02, 0, 0, Math.PI / 2));
  }

  // rope of floats across the middle bay (x 0..2)
  {
    const ya = hF - HB - 0.05, sag = 0.18, z = ZF + 0.12;
    const ropeY = (x) => ya - sag * (1 - Math.pow((x - 1) / 1, 2));
    for (let i = 0; i < 8; i++) {
      const xa = 0.06 + (i / 8) * 1.88, xb = 0.06 + ((i + 1) / 8) * 1.88;
      beam("line", [xa, ropeY(xa), z], [xb, ropeY(xb), z], 0.022);
    }
    const ring = (key, x, r, tube) => {
      const yc = ropeY(x) - r - 0.02;
      put(key, new THREE.TorusGeometry(r, tube, 8, 18), M(x, yc, z, 0, 0.25));
      beam("line", [x, ropeY(x), z], [x, yc + r - tube * 0.5, z], 0.018);
    };
    ring("red", 0.42, 0.25, 0.075);
    ring("reed", 1.58, 0.25, 0.075);
    // beach ball between them: red / white halves with a yellow band
    const bx = 1.0, br = 0.19, by = ropeY(bx) - br - 0.05;
    put("red", new THREE.SphereGeometry(br, 12, 4, 0, Math.PI * 2, 0, Math.PI * 0.42), M(bx, by, z, 0.3, 0, 0.5));
    put("reed", new THREE.SphereGeometry(br, 12, 2, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.16), M(bx, by, z, 0.3, 0, 0.5));
    put("cloth", new THREE.SphereGeometry(br, 12, 4, 0, Math.PI * 2, Math.PI * 0.58, Math.PI * 0.42), M(bx, by, z, 0.3, 0, 0.5));
    beam("line", [bx, ropeY(bx), z], [bx, by + br, z], 0.018);
    // two more rings hung on the +X side screen
    for (const [rz, key] of [[-2.3, "red"], [-3.5, "tatami"]]) {
      const x = XS + 0.2, yc = 1.55;
      put(key, new THREE.TorusGeometry(0.25, 0.075, 8, 18), M(x, yc, rz, 0, Math.PI / 2));
    }
  }

  // kakigori banner over the counter: white cloth on a rod, red ice mound on a cup, wave band (no text)
  {
    const bx = 3.2, bw = 1.05, bh = 0.72, yt = hF - HB - 0.08, z = ZF + 0.12, yb = yt - bh;
    beam("frame", [bx - bw / 2 - 0.08, yt + 0.02, z], [bx + bw / 2 + 0.08, yt + 0.02, z], 0.03);
    for (const s of [-1, 1]) beam("line", [bx + s * 0.4, yt + 0.02, z], [bx + s * 0.4, hF - HB, ZF + 0.07], 0.015);
    blk("cloth", bx - bw / 2, bx + bw / 2, yb, yt, z - 0.008, z + 0.008);
    const zd = z + 0.012;
    // waves: a band along the bottom with a scalloped top
    const sh = new THREE.Shape();
    const w0 = bx - bw / 2 + 0.03, w1 = bx + bw / 2 - 0.03, wy = yb + 0.03, n = 5, amp = 0.05;
    sh.moveTo(w0, wy);
    sh.lineTo(w1, wy);
    sh.lineTo(w1, wy + 0.08);
    for (let i = n - 1; i >= 0; i--) {
      const xa = w0 + (i / n) * (w1 - w0), xm = xa + 0.5 * (w1 - w0) / n;
      sh.quadraticCurveTo(xm + 0.04, wy + 0.08 + 2 * amp, xa, wy + 0.08);
    }
    sh.lineTo(w0, wy);
    put("wave", new THREE.ShapeGeometry(sh, 4), M(0, 0, zd));
    // cup (a trapezoid) and the ice mound with red syrup
    const cy0 = yb + 0.25, cy1 = cy0 + 0.15;
    const cup = new THREE.Shape();
    cup.moveTo(bx - 0.08, cy0); cup.lineTo(bx + 0.08, cy0); cup.lineTo(bx + 0.16, cy1); cup.lineTo(bx - 0.16, cy1); cup.lineTo(bx - 0.08, cy0);
    put("line", new THREE.ShapeGeometry(cup), M(0, 0, zd));
    const mound = new THREE.Shape();
    mound.moveTo(bx - 0.19, cy1 + 0.015);
    mound.absarc(bx, cy1 + 0.015, 0.19, Math.PI, 0, true);
    mound.lineTo(bx - 0.19, cy1 + 0.015);
    put("red", new THREE.ShapeGeometry(mound, 8), M(0, 0, zd));
  }

  // cooler box on the sand by the counter
  {
    const kx = 3.3, kz = 0.35;
    blk("red", kx - 0.33, kx + 0.33, 0.03, 0.36, kz - 0.22, kz + 0.22);
    blk("cloth", kx - 0.35, kx + 0.35, 0.36, 0.44, kz - 0.24, kz + 0.24);
    beam("cloth", [kx - 0.18, 0.5, kz], [kx + 0.18, 0.5, kz], 0.035);
    for (const s of [-1, 1]) beam("cloth", [kx + s * 0.18, 0.44, kz], [kx + s * 0.18, 0.51, kz], 0.035);
  }

  // parasols with folding chairs
  const SPOTS = [[-3.3, 4.4, 0.12, 0.3], [0.1, 2.5, -0.1, -0.4], [-5.3, 1.7, 0.08, 0.9]];
  for (const [px, pz, tilt, yaw] of SPOTS.slice(0, Math.max(0, Math.min(3, NP)))) {
    const tm = M(px, 0, pz, tilt, yaw, 0); // tilt about x after yaw
    const P = (x, y, z) => V(x, y, z).applyMatrix4(tm).toArray();
    const R = 1.0, yR = 1.85, yA = 2.2, nG = 8;
    // pole and finial
    put("cloth", new THREE.CylinderGeometry(0.02, 0.022, yA + 0.08, 6), tm.clone().multiply(M(0, (yA + 0.08) / 2 + 0.004, 0)));
    put("cloth", new THREE.SphereGeometry(0.04, 8, 4), tm.clone().multiply(M(0, yA + 0.08, 0)));
    // gores: canopy top plus a short drop skirt, alternating red / white
    for (let i = 0; i < nG; i++) {
      const a0 = (i / nG) * Math.PI * 2, a1 = ((i + 1) / nG) * Math.PI * 2, key = i % 2 ? "cloth" : "red";
      const e0 = [R * Math.cos(a0), yR, R * Math.sin(a0)], e1 = [R * Math.cos(a1), yR, R * Math.sin(a1)];
      const am = (a0 + a1) / 2, mid = [0.55 * R * Math.cos(am), yR + 0.22, 0.55 * R * Math.sin(am)];
      const out = [Math.cos(am) * 0.5, 1, Math.sin(am) * 0.5];
      const o = V(...out).transformDirection(tm).toArray();
      tri(key, P(0, yA, 0), P(...mid), P(...e0), o);
      tri(key, P(0, yA, 0), P(...e1), P(...mid), o);
      tri(key, P(...mid), P(...e1), P(...e0), o);
      const d0 = [e0[0] * 1.02, yR - 0.1, e0[2] * 1.02], d1 = [e1[0] * 1.02, yR - 0.1, e1[2] * 1.02];
      const oo = V(Math.cos(am), -0.1, Math.sin(am)).transformDirection(tm).toArray();
      quad(key, P(...e0), P(...e1), P(...d1), P(...d0), oo);
      // underside, so a tilted canopy never shows a hole
      const ou = V(0, -1, 0).transformDirection(tm).toArray();
      tri(key, P(0, yR - 0.06, 0), P(...d0), P(...d1), ou);
    }
    // a folding chair beside the pole, facing the sea (+Z)
    const cx = px + 0.55, cz = pz + 0.15;
    const cm = M(cx, 0, cz, 0, yaw * 0.5);
    const Q = (x, y, z) => V(x, y, z).applyMatrix4(cm).toArray();
    const ow = 0.31;
    for (const s of [-1, 1]) {
      beam("cloth", Q(s * ow, 0.05, 0.3), Q(s * ow, 0.28, -0.2), 0.03);
      beam("cloth", Q(s * ow, 0.05, -0.25), Q(s * ow, 0.28, 0.25), 0.03);
      beam("cloth", Q(s * ow, 0.26, -0.22), Q(s * ow, 0.8, -0.42), 0.03);
      beam("cloth", Q(s * ow, 0.27, 0.27), Q(s * ow, 0.27, -0.22), 0.03);
    }
    // seat and back fabric (green), as thin slabs
    const seat = new THREE.BoxGeometry(2 * ow - 0.03, 0.025, 0.48);
    put("tatami", seat, cm.clone().multiply(M(0, 0.25, 0.02, 0.06)));
    const back = new THREE.BoxGeometry(2 * ow - 0.03, 0.5, 0.025);
    put("tatami", back, cm.clone().multiply(M(0, 0.53, -0.33, -0.35)));
  }

  // ---------- meshes ----------
  const MAT = {
    sand: [c.sand, c.sandShade, 0.1, true, 3],
    frame: [c.frame, c.frameShade, 0.1, true, 3],
    roof: [c.roof, c.roofShade, 0.62, true, 3],
    wood: [c.wood, c.woodShade, 0.1, true, 3],
    reed: [c.reed, c.reedShade, 0.1, true, 3],
    tatami: [c.tatami, c.tatamiShade, 0.1, true, 3],
    red: [c.red, c.redShade, 0.0, true, 3],
    cloth: [c.cloth, c.clothShade, 0.1, true, 2.5],
    line: [c.line, c.line, 0.1, false, 0],
    wave: [c.wave, c.wave, 0.1, false, 0],
  };
  for (const [key, s] of Object.entries(soups)) {
    const [base, shade, threshold, outline, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    const mesh = kit.toon(g, base, shade, { threshold, outline, px });
    mesh.name = key;
    root.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
