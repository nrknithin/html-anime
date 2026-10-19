// ramune-stand.js - a summer drinks stand: ramune bottles in an ice-water tub on an old shop-front bench, a furin
// wind chime from the eave and a rolled reed blind. Static, with one clip: the chime's strip sways.
// Contract: harness/lab/README.md. Meters, +Y up, the customer side faces +Z, its left is +X (the tray end),
// stands on y = 0, centred on x = 0, z = 0 (the bbox: the posts and the eave).
//
// Construction (three.js boxes, cylinders, lathes, spheres and tori plus hand-built soups for the tub and the
// watermelon slices, all transformed into world space and merged per material: 10 meshes, 13.5k triangles at the
// defaults, bottles ~200 each; the strip is the one moving mesh):
//   FRAME   a shop-front bay 1.9 m wide: two back posts, head beams, side beams cantilevered forward on diagonal
//           braces (no front posts, so nothing stands between the street and the bench), a mono-pitch tin eave
//           falling toward the street with seam lines, a fascia board, a green board wall behind the bench.
//   BENCH   an old plank bench (endai) 1.7 x 0.55, top 0.46 high: three planks with dark seams, four legs, stretchers.
//   TUB     a galvanised oval tub (superellipse plan, n = 4) 0.92 x 0.5 x 0.12 on the bench, rolled rim, two end
//           handles; the ice water is a flat cap 7.5 cm up with ice cubes floating between the bottles. Ring bands are
//           wound along an explicit outward direction (radial, or up for the rim top), never by hand.
//   BOTTLES ramune (codd-neck) bottles in rows, standing on an ice bed 5 cm up with a deterministic lean (a hash of
//           the index, never Math.random): pale aqua glass body to the pinched neck, then the marble shown bare (and
//           enlarged) in the neck chamber so it reads, then the glass lip and a red cap. Their necks clear the rim by
//           ~12 cm so they read from the low hero camera. Three more stand whole on the bench past the tray.
//   TRAY    a round bamboo tray with three watermelon slices standing on their rind (red flesh, green rind, dark seeds
//           on both faces) and three cucumbers on sticks (kyuri no ippon-zuke) laid in front of them.
//   BOARD   a blank price board (cream face, wood frame) hung on the wall over the tub by a string from a nail. No text.
//   EAVE    the reed blind (sudare) rolled up under the front head beam: a straw roll with three ties and slat lines.
//           The furin (a closed glass bell lathe) hangs on a string from the beam over the tray; the clapper, its
//           thread and the paper strip (tanzaku) are one mesh on the `strip` joint, pivoting inside the bell.
// Proportions (real size, base unit the bench top B = 0.46 m): eave back top H = 2.1 (height option), front beam
//   underside 1.66; bench 1.7 x 0.55; tub 0.92 x 0.5 x 0.12; bottle 0.196 tall, 0.058 across, neck pinch 0.021,
//   marble 0.027 (real 0.017); tray 0.44 across; slices 0.14 tall; cucumbers 0.17; board 0.42 x 0.32; bell 0.076
//   across, strip 0.075 x 0.26, its foot 1.04 up.
// Options: build(THREE, kit, colors, { height, bottles })
//   height   the eave top at the back (default 2.1): posts, wall, beams, eave, blind and furin follow; the bench, tub,
//            tray and board keep their real size. Not a scale. The lab's meta.height check is for the default.
//   bottles  bottles in the tub, 0-32 (default 24, four rows of six), in 1-5 rows; 0 leaves ice water only.
// Clip: chime 2.4 s (loop): the strip swings about its pivot inside the bell (rz +-16 deg with a 2x flutter), a
//   small fore-aft swing and a +-25 deg twist; the bell hangs still. pose("chime@0.6").
// Colours (meadow, the summer-seaside script, for its pale aqua sky): glass (bottles, bell) sky #d7ecef / line
//   #a9d16e (green-aqua shade); ice water sky / line; marble, ice, board face moon #f7f3e1 / sky; tub and eave tin
//   sclera #f6f3ee / sky (galvanised); wood skin #f0c2ae / practical #f2c94c (pale weathered pine, warm shade); wall,
//   rinds and cucumbers iris #3f8a47 / hair #2c5131; flesh and caps accent #d9483b / skin; paper strip accent / skin;
//   straw (blind, tray) practical / skin; seams, cords, seeds, strings hair flat.

export const meta = {
  name: "ramune-stand",
  height: 2.1,
  script: "meadow",
  colors: {
    glass: "#d7ecef", glassShade: "#a9d16e",
    white: "#f7f3e1", whiteShade: "#d7ecef",
    tin: "#f6f3ee", tinShade: "#d7ecef",
    water: "#d7ecef", waterShade: "#a9d16e",
    wood: "#f0c2ae", woodShade: "#f2c94c",
    green: "#3f8a47", greenShade: "#2c5131",
    red: "#d9483b", redShade: "#f0c2ae",
    straw: "#f2c94c", strawShade: "#f0c2ae",
    line: "#2c5131",
    strip: "#d9483b", stripShade: "#f0c2ae",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const H = opts.height ?? 2.1;
  const NB = Math.max(0, Math.min(32, Math.round(opts.bottles ?? 24)));
  const root = new THREE.Group();
  root.name = "ramune-stand";
  const joints = {};
  const TAU = Math.PI * 2, D = Math.PI / 180;

  // ---------- soups: world positions + normals per material ----------
  const soups = {};
  const S = (k) => (soups[k] ??= { p: [], n: [] });
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const M = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) =>
    new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), V(s, s, s));
  function put(key, geo, m) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.applyMatrix4(m);
    const s = S(key), p = g.attributes.position.array, n = g.attributes.normal.array;
    for (let i = 0; i < p.length; i++) (s.p.push(p[i]), s.n.push(n[i]));
    geo.dispose();
  }
  const box = (key, x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) => put(key, new THREE.BoxGeometry(sx, sy, sz), M(x, y, z, rx, ry, rz));
  const blk = (key, x0, x1, y0, y1, z0, z1) => box(key, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0);
  function beam(key, a, b, w, h = w) {
    const A = V(...a), B = V(...b), L = A.distanceTo(B);
    const up = Math.abs(B.y - A.y) > 0.9 * L ? V(0, 0, 1) : V(0, 1, 0);
    const m = new THREE.Matrix4().lookAt(A, B, up);
    m.setPosition(A.clone().add(B).multiplyScalar(0.5));
    put(key, new THREE.BoxGeometry(w, h, L), m);
  }
  function tri(key, a, b, e, out) {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ae = [e[0] - a[0], e[1] - a[1], e[2] - a[2]];
    let n = [ab[1] * ae[2] - ab[2] * ae[1], ab[2] * ae[0] - ab[0] * ae[2], ab[0] * ae[1] - ab[1] * ae[0]];
    const l = Math.hypot(...n);
    if (l < 1e-12) return;
    n = n.map((v) => v / l);
    const s = S(key);
    if (n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0) (s.p.push(...a, ...e, ...b), n = n.map((v) => -v));
    else s.p.push(...a, ...b, ...e);
    s.n.push(...n, ...n, ...n);
  }
  const quad = (key, a, b, e, d, out) => (tri(key, a, b, e, out), tri(key, a, e, d, out));
  const fz = (key, x0, x1, y0, y1, z, sg = 1) => quad(key, [x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [0, 0, sg]);
  const fy = (key, x0, x1, z0, z1, y) => quad(key, [x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [0, 1, 0]);
  // lathe from [r, y] points (bottom to top, ends on the axis so it is closed)
  const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  // deterministic hash in [0, 1)
  const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };

  // ---------- frame ----------
  const XP = 0.95, ZB = -0.5, ZF = 0.42; // back post line, front beam line
  const ZR0 = ZF + 0.14, ZR1 = ZB - 0.12; // eave front / back edge
  const RT = 0.035; // tin thickness
  const FALL = 0.32; // eave fall to the front
  const roofY = (z) => H - RT - FALL * (z - ZR1) / (ZR0 - ZR1); // underside of the tin
  const BH = 0.12; // head beam depth
  const yF = roofY(ZF) - BH, yB = roofY(ZB) - BH; // beam bottoms
  for (const s of [-1, 1]) {
    blk("wood", s * XP - 0.05, s * XP + 0.05, 0, yB + BH / 2, ZB - 0.05, ZB + 0.05);
    beam("wood", [s * XP, yF + BH / 2 - 0.012, ZF + 0.05], [s * XP, yB + BH / 2 - 0.012, ZB - 0.05], 0.08, BH);
    // a diagonal brace from the post to the side beam carries the cantilevered eave
    const zb = ZF - 0.25, yb = yF + (yB - yF) * (ZF - zb) / (ZF - ZB);
    beam("wood", [s * XP, yB - 0.55, ZB + 0.03], [s * XP, yb + 0.02, zb], 0.07);
  }
  blk("wood", -XP - 0.12, XP + 0.12, yF, yF + BH, ZF - 0.05, ZF + 0.05);
  blk("wood", -XP - 0.08, XP + 0.08, yB, yB + BH, ZB - 0.05, ZB + 0.05);
  // tin eave: a sloped slab, with seam lines down the slope on its top
  {
    const L = Math.hypot(ZR0 - ZR1, FALL), ang = Math.atan2(FALL, ZR0 - ZR1);
    const zc = (ZR0 + ZR1) / 2, yc = roofY(zc) + RT / 2;
    put("tin", new THREE.BoxGeometry(2 * XP + 0.4, RT, L), M(0, yc, zc, ang));
    for (let x = -XP - 0.1; x <= XP + 0.11; x += 0.3) {
      const n = [0, Math.cos(ang), Math.sin(ang)], o = 0.004;
      const p = (z) => [0, roofY(z) + RT + o, z];
      const a = p(ZR1 + 0.01), b = p(ZR0 - 0.01);
      quad("line", [x - 0.008, a[1], a[2]], [x + 0.008, a[1], a[2]], [x + 0.008, b[1], b[2]], [x - 0.008, b[1], b[2]], n);
    }
    // a fascia board on the front edge
    blk("wood", -XP - 0.2, XP + 0.2, roofY(ZR0) - 0.07, roofY(ZR0) + RT + 0.005, ZR0 - 0.03, ZR0);
  }
  // board wall between the back posts, green paint, seams as strips on its face
  blk("green", -XP + 0.05, XP - 0.05, 0, yB, ZB - 0.03, ZB + 0.01);
  for (let x = -XP + 0.05 + 0.16; x < XP - 0.1; x += 0.16) fz("line", x - 0.006, x + 0.006, 0.02, yB - 0.01, ZB + 0.013);
  blk("wood", -XP + 0.05, XP - 0.05, 0, 0.1, ZB + 0.01, ZB + 0.035); // skirting board

  // ---------- bench ----------
  const BY = 0.46, BT = 0.04, BX = 0.85, BZ0 = -0.33, BZ1 = 0.22;
  for (let i = 0; i < 3; i++) {
    const w = (BZ1 - BZ0) / 3, z0 = BZ0 + i * w;
    blk("wood", -BX, BX, BY - BT, BY - (i === 1 ? 0.002 : 0), z0 + 0.004, z0 + w - 0.004);
  }
  for (let i = 1; i < 3; i++) { const z = BZ0 + (i * (BZ1 - BZ0)) / 3; fy("line", -BX, BX, z - 0.005, z + 0.005, BY - 0.012); }
  for (const sx of [-1, 1]) for (const z of [BZ0 + 0.06, BZ1 - 0.06]) blk("wood", sx * 0.76 - 0.03, sx * 0.76 + 0.03, 0, BY - BT, z - 0.03, z + 0.03);
  for (const sx of [-1, 1]) blk("wood", sx * 0.76 - 0.025, sx * 0.76 + 0.025, 0.12, 0.17, BZ0 + 0.06, BZ1 - 0.06);
  blk("wood", -0.76, 0.76, 0.12, 0.17, BZ1 - 0.085, BZ1 - 0.035);
  blk("wood", -BX + 0.02, BX - 0.02, BY - BT - 0.07, BY - BT, BZ1 - 0.03, BZ1 - 0.005); // apron

  // ---------- tub ----------
  const TX = -0.32, TZ = -0.05, TA = 0.46, TB = 0.25, TH = 0.12, TY = BY, NSE = 4, SEG = 40;
  const se = (t, a, b) => {
    const cs = Math.cos(t), sn = Math.sin(t);
    return [TX + a * Math.sign(cs) * Math.abs(cs) ** (2 / NSE), TZ + b * Math.sign(sn) * Math.abs(sn) ** (2 / NSE)];
  };
  // ring stack: rings [inset d, y] ; side = +1 faces away from the tub axis, -1 toward it
  function band(key, r0, r1, side, up = 0) {
    for (let i = 0; i < SEG; i++) {
      const t0 = (i / SEG) * TAU, t1 = ((i + 1) / SEG) * TAU, tm = (t0 + t1) / 2;
      const [ax, az] = se(t0, TA - r0[0], TB - r0[0]), [bx, bz] = se(t1, TA - r0[0], TB - r0[0]);
      const [cx, cz] = se(t1, TA - r1[0], TB - r1[0]), [dx, dz] = se(t0, TA - r1[0], TB - r1[0]);
      const [mx, mz] = se(tm, TA, TB);
      const rx = (mx - TX) / TA, rz = (mz - TZ) / TB, rl = Math.hypot(rx, rz);
      const out = [side * rx / rl, up, side * rz / rl];
      quad(key, [ax, r0[1], az], [bx, r0[1], bz], [cx, r1[1], cz], [dx, r1[1], dz], out);
    }
  }
  const WY = TY + 0.075; // water level
  // outer wall (slight taper), rolled rim, inner wall down to the water
  const ring = [[0.025, TY], [0.0, TY + 0.012], [-0.004, TY + TH - 0.012]];
  band("tin", [0.035, TY + 0.002], [0.025, TY], 0.3, -1);
  band("tin", ring[0], ring[1], 1);
  band("tin", ring[1], ring[2], 1);
  band("tin", [-0.004, TY + TH - 0.012], [-0.014, TY + TH - 0.002], 1);
  band("tin", [-0.014, TY + TH - 0.002], [-0.008, TY + TH + 0.008], 1);
  band("tin", [-0.008, TY + TH + 0.008], [0.008, TY + TH + 0.008], 0, 1);
  band("tin", [0.008, TY + TH + 0.008], [0.014, TY + TH - 0.004], -1);
  band("tin", [0.014, TY + TH - 0.004], [0.018, WY - 0.004], -1);
  // floor of the tub (underside) closes the outer wall
  for (let i = 0; i < SEG; i++) {
    const [ax, az] = se((i / SEG) * TAU, TA - 0.035, TB - 0.035), [bx, bz] = se(((i + 1) / SEG) * TAU, TA - 0.035, TB - 0.035);
    tri("tin", [TX, TY + 0.002, TZ], [ax, TY + 0.002, az], [bx, TY + 0.002, bz], [0, -1, 0]);
    const [wx, wz] = se((i / SEG) * TAU, TA - 0.018, TB - 0.018), [vx, vz] = se(((i + 1) / SEG) * TAU, TA - 0.018, TB - 0.018);
    tri("water", [TX, WY, TZ], [wx, WY, wz], [vx, WY, vz], [0, 1, 0]);
  }
  // end handles: bent strap loops
  for (const s of [-1, 1]) {
    const x = TX + s * (TA + 0.002), y = TY + TH - 0.035;
    beam("tin", [x, y, TZ - 0.07], [x + s * 0.035, y - 0.01, TZ - 0.06], 0.012);
    beam("tin", [x + s * 0.035, y - 0.01, TZ - 0.065], [x + s * 0.035, y - 0.01, TZ + 0.065], 0.012);
    beam("tin", [x, y, TZ + 0.07], [x + s * 0.035, y - 0.01, TZ + 0.06], 0.012);
  }

  // ---------- bottles ----------
  // glass body to the pinch, the bare marble in the chamber, then the glass lip; local base at y = 0
  const GLASS = [[0, 0], [0.026, 0], [0.029, 0.006], [0.029, 0.1], [0.027, 0.115], [0.021, 0.128], [0.015, 0.136], [0.0115, 0.141], [0.0105, 0.144], [0, 0.144]];
  const LIP = [[0, 0.165], [0.012, 0.166], [0.014, 0.172], [0.013, 0.183], [0.0145, 0.186], [0, 0.186]];
  const CAP = [[0, 0.185], [0.0148, 0.185], [0.0152, 0.19], [0.013, 0.195], [0, 0.196]];
  function bottle(m, low = false) {
    put("glass", lathe(GLASS, low ? 8 : 10), m);
    put("glass", lathe(LIP, 8), m);
    put("red", lathe(CAP, 8), m);
    put("white", new THREE.SphereGeometry(0.0135, 8, 6), m.clone().multiply(M(0, 0.1545, 0)));
  }
  if (NB > 0) {
    const rows = NB <= 6 ? 1 : NB <= 12 ? 2 : NB <= 18 ? 3 : NB <= 24 ? 4 : 5;
    const cols = Math.ceil(NB / rows);
    const iw = 2 * (TA - 0.06), id = 2 * (TB - 0.06);
    let k = 0;
    for (let r = 0; r < rows; r++) {
      const inRow = Math.min(cols, NB - k);
      for (let j = 0; j < inRow; j++, k++) {
        const u = inRow === 1 ? 0 : j / (inRow - 1) - 0.5, v = rows === 1 ? 0 : r / (rows - 1) - 0.5;
        const wob = 0.6 + 0.4 * Math.cos(Math.PI * u);
        const x = TX + u * iw * (rows > 2 && (r === 0 || r === rows - 1) ? 0.92 : 1) + (hash(k, 1) - 0.5) * 0.02;
        const z = TZ + v * id * wob + (hash(k, 2) - 0.5) * 0.015;
        const tilt = (3 + 9 * hash(k, 3)) * D, dir = hash(k, 4) * TAU;
        bottle(M(x, TY + 0.05, z, tilt * Math.cos(dir), hash(k, 5) * TAU, tilt * Math.sin(dir)), true);
      }
    }
    // ice cubes between the bottles
    for (let i = 0; i < 14 + NB; i++) {
      const x = TX + (hash(i, 6) - 0.5) * 2 * (TA - 0.07), z = TZ + (hash(i, 7) - 0.5) * 2 * (TB - 0.06);
      const s = 0.03 + 0.02 * hash(i, 8);
      box("white", x, WY + 0.004, z, s, s * 0.8, s, hash(i, 9) * TAU, 0.3 * hash(i, 10), 0.3 * hash(i, 11));
    }
  } else {
    for (let i = 0; i < 20; i++) {
      const x = TX + (hash(i, 6) - 0.5) * 2 * (TA - 0.07), z = TZ + (hash(i, 7) - 0.5) * 2 * (TB - 0.06);
      const s = 0.03 + 0.02 * hash(i, 8);
      box("white", x, WY + 0.004, z, s, s * 0.8, s, hash(i, 9) * TAU, 0.3 * hash(i, 10), 0.3 * hash(i, 11));
    }
  }
  // two on the bench, whole
  bottle(M(0.78, BY, 0.1, 0, 0.4, 0));
  bottle(M(0.74, BY, -0.06, 0, 1.3, 0));
  bottle(M(0.7, BY, -0.22, 0, 2.2, 0));

  // ---------- tray: watermelon slices and cucumbers on sticks ----------
  const RX = 0.38, RZ = 0.0, RR = 0.22;
  put("straw", lathe([[0, 0], [RR - 0.02, 0], [RR, 0.008], [RR + 0.008, 0.03], [RR - 0.006, 0.032], [RR - 0.016, 0.012], [0, 0.012]], 24), M(RX, BY, RZ));
  const TRY = BY + 0.012;
  // a slice standing on its rind in the local x-y plane, thickness along z
  function slice(m) {
    const R = 0.14, Ri = R - 0.022, A = 32 * D, N = 8, T = 0.012;
    const P = (r, t) => new THREE.Vector3(r * Math.sin(t), R - r * Math.cos(t), 0);
    const fl = [], rd = [];
    for (let i = 0; i <= N; i++) { const t = -A + (2 * A * i) / N; fl.push(P(Ri, t)); rd.push(P(R, t)); }
    const apex = new THREE.Vector3(0, R, 0);
    const w = (v, z) => { const q = v.clone().setZ(z).applyMatrix4(m); return [q.x, q.y, q.z]; };
    const nz = (sg) => { const q = new THREE.Vector3(0, 0, sg).transformDirection(m); return [q.x, q.y, q.z]; };
    const ctr = new THREE.Vector3(0, R * 0.6, 0);
    for (const sg of [-1, 1]) {
      for (let i = 0; i < N; i++) {
        tri("red", w(apex, sg * T), w(fl[i], sg * T), w(fl[i + 1], sg * T), nz(sg));
        quad("green", w(fl[i], sg * (T + 0.001)), w(rd[i], sg * T), w(rd[i + 1], sg * T), w(fl[i + 1], sg * (T + 0.001)), nz(sg));
      }
      // seeds
      for (const [sx, sy] of [[-0.018, 0.06], [0.016, 0.065], [0, 0.085], [-0.03, 0.035], [0.028, 0.04], [0.004, 0.045]]) {
        const s0 = new THREE.Vector3(sx, sy, 0);
        tri("line", w(s0.clone().add(V(0, 0.007, 0)), sg * (T + 0.002)), w(s0.clone().add(V(-0.003, -0.004, 0)), sg * (T + 0.002)), w(s0.clone().add(V(0.003, -0.004, 0)), sg * (T + 0.002)), nz(sg));
      }
    }
    // the cut sides and the rind edge
    const edge = (a, b, key) => {
      const mid = a.clone().add(b).multiplyScalar(0.5).sub(ctr).applyMatrix4(new THREE.Matrix4().extractRotation(m));
      quad(key, w(a, -T), w(b, -T), w(b, T), w(a, T), [mid.x, mid.y, mid.z]);
    };
    edge(apex, fl[0], "red"); edge(fl[N], apex, "red");
    edge(fl[0], rd[0], "green"); edge(rd[N], fl[N], "green");
    for (let i = 0; i < N; i++) edge(rd[i], rd[i + 1], "green");
  }
  slice(M(RX - 0.07, TRY, RZ - 0.07, 0, 0.35, 0.05));
  slice(M(RX + 0.06, TRY, RZ - 0.05, 0, -0.25, -0.06));
  slice(M(RX - 0.005, TRY, RZ - 0.11, 0, 0.05, 0));
  // cucumbers: a lathe along +Y laid down, on a stick
  const CUC = [[0, 0], [0.008, 0.004], [0.014, 0.02], [0.016, 0.06], [0.016, 0.12], [0.013, 0.16], [0.006, 0.172], [0, 0.174]];
  for (const [i, a] of [[0, 0.22], [1, 0], [2, -0.22]]) {
    const x = RX - 0.03, z = RZ + 0.04 + i * 0.048;
    const turn = new THREE.Matrix4().makeRotationY(a);
    const mm = new THREE.Matrix4().makeTranslation(x, TRY + 0.017, z).multiply(turn).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2)).multiply(new THREE.Matrix4().makeTranslation(0, -0.09, 0));
    put("green", lathe(CUC, 8), mm);
    put("wood", new THREE.CylinderGeometry(0.004, 0.004, 0.12, 5), mm.clone().multiply(M(0, -0.05, 0)));
  }

  // ---------- price board (blank) ----------
  {
    const bx = -0.42, by0 = 0.98, bw = 0.42, bh = 0.32, z = ZB + 0.012;
    blk("wood", bx - bw / 2, bx + bw / 2, by0, by0 + bh, z, z + 0.022);
    blk("white", bx - bw / 2 + 0.025, bx + bw / 2 - 0.025, by0 + 0.025, by0 + bh - 0.025, z + 0.02, z + 0.028);
    const nail = [bx, by0 + bh + 0.13, z + 0.01];
    beam("line", [bx - bw / 2 + 0.04, by0 + bh, z + 0.012], nail, 0.006);
    beam("line", [bx + bw / 2 - 0.04, by0 + bh, z + 0.012], nail, 0.006);
    box("line", nail[0], nail[1], nail[2] + 0.01, 0.014, 0.014, 0.02);
  }

  // ---------- rolled reed blind ----------
  {
    const y = yF - 0.065, z = ZF + 0.07, r = 0.06, L = 2 * XP - 0.06;
    put("straw", new THREE.CylinderGeometry(r, r, L, 14), M(0, y, z, 0, 0, Math.PI / 2));
    for (const x of [-0.65, 0, 0.65]) {
      put("line", new THREE.TorusGeometry(r + 0.003, 0.005, 4, 14), M(x, y, z, 0, Math.PI / 2, 0));
      beam("line", [x, y + r, z - 0.01], [x, yF + 0.02, ZF + 0.05], 0.008);
    }
    // slat lines along the roll's front
    for (let i = 0; i < 3; i++) {
      const a = -0.2 + i * 0.5;
      beam("line", [-L / 2 + 0.01, y + (r + 0.001) * Math.sin(a), z + (r + 0.001) * Math.cos(a)], [L / 2 - 0.01, y + (r + 0.001) * Math.sin(a), z + (r + 0.001) * Math.cos(a)], 0.004);
    }
  }

  // ---------- furin ----------
  const FX = 0.5, FZ = ZF + 0.03, bellTop = yF - 0.24;
  beam("line", [FX, yF + 0.005, FZ], [FX, bellTop + 0.008, FZ], 0.005);
  const BELL = [[0, 0.012], [0.006, 0.012], [0.006, 0], [0.018, -0.004], [0.028, -0.012], [0.034, -0.024], [0.037, -0.04],
    [0.038, -0.054], [0.035, -0.056], [0.033, -0.04], [0.03, -0.025], [0.024, -0.014], [0.014, -0.008], [0, -0.006]].map(([r, y]) => [r, bellTop + y]);
  put("glass", lathe(BELL.reverse(), 16), M(FX, 0, FZ));
  const strip = new THREE.Group();
  strip.name = "strip";
  strip.position.set(FX, bellTop - 0.012, FZ);
  root.add(strip);
  joints.strip = strip;
  strip.userData.rest = strip.position.clone();
  const sp = { p: [], n: [] };
  {
    const add = (geo, m) => {
      const g = geo.index ? geo.toNonIndexed() : geo;
      g.applyMatrix4(m);
      for (const v of g.attributes.position.array) sp.p.push(v);
      for (const v of g.attributes.normal.array) sp.n.push(v);
    };
    add(new THREE.BoxGeometry(0.004, 0.11, 0.004), M(0, -0.055, 0)); // thread
    add(new THREE.CylinderGeometry(0.006, 0.006, 0.02, 6), M(0, -0.045, 0)); // clapper
    add(new THREE.BoxGeometry(0.075, 0.26, 0.004), M(0, -0.11 - 0.13, 0)); // paper strip
  }
  {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(sp.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(sp.n, 3));
    const mesh = kit.toon(g, c.strip, c.stripShade, { threshold: 0.0, px: 2.5 });
    mesh.name = "strip";
    strip.add(mesh);
  }

  // ---------- meshes ----------
  const MAT = {
    wood: [c.wood, c.woodShade, 0.1, true, 3],
    green: [c.green, c.greenShade, 0.1, true, 3],
    tin: [c.tin, c.tinShade, 0.3, true, 3],
    water: [c.water, c.waterShade, 0.1, true, 2.5],
    glass: [c.glass, c.glassShade, 0.2, true, 2.5],
    white: [c.white, c.whiteShade, 0.1, true, 2],
    red: [c.red, c.redShade, 0.0, true, 2],
    straw: [c.straw, c.strawShade, 0.1, true, 3],
    line: [c.line, c.line, 0.1, false, 0],
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

  // ---------- pose and clip ----------
  // strip joint: +rz swings the strip toward +X, +rx swings it toward -Z (away from the street).
  const CLIPS = { chime: 2.4 };
  function apply(rx, rz, ry) {
    strip.position.copy(strip.userData.rest);
    strip.rotation.set(rx, ry, rz);
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`ramune-stand: no clip "${m[1]}" (clips: chime)`);
      const T = CLIPS[m[1]], ph = ((((+m[2]) % T) + T) % T) / T;
      return apply(
        (5 * Math.sin(TAU * ph + 0.9) + 2 * Math.sin(TAU * 3 * ph)) * D,
        (16 * Math.sin(TAU * ph) + 5 * Math.sin(TAU * 2 * ph + 1.3)) * D,
        (25 * Math.sin(TAU * ph + 0.4)) * D,
      );
    }
    if (name !== "rest") throw new Error(`ramune-stand: unknown pose "${name}" (rest, or chime@<seconds>)`);
    apply(0, 0, 0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
