// ox.js — a heavy draught ox (bull) for Aesop's "The Ox and the Frog". Model-lab contract: harness/lab/README.md.
// No imports, no clock, no Math.random: THREE and the kit come in as arguments.
//
// Construction
//   loft(): superellipse rings stitched along a spine in the YZ plane (x is lateral). Each ring has its own
//     up/down extent and upper/lower half-widths (blended below the equator, so no side crease), so one ring is a
//     barrel and the next a keel (the dewlap). Ring planes: plane "z" (constant z, up = +Y) for body and neck so
//     top/bottom read straight off the side profile; plane "y" (constant y, up = front) for leg segments and hoof
//     claws; perpendicular to the spine only for the straight head axis. No seam duplicates: smooth normals and a
//     closed ink hull. Ends close on a centre vertex.
//   limb(): a leg-segment loft with domed ends. Joints are "taper-through": the knob (knee, fetlock, hock)
//     belongs to the upper segment, which then tapers thinner than the lower segment inside it, and the lower
//     segment starts inside the knob at <= 80 % of its girth. Same material, so the overlap shows no cuff line.
//   tube(): a tapered tube along a CatmullRomCurve3 with Frenet frames (horns, tail), tip closed on an apex.
//   Neck: two lofts on a two-joint chain (neckBase low in the chest, neckMid low in the neck), overlapping
//     ~0.12 m and ~5 % thinner where hidden, so the drink bow is one convex curve from withers to poll.
//   All part geometry is written in WORLD rest coordinates; each mesh sits in its joint with position = -pivot,
//   so the numbers below read straight off the side reference (side_hungarian_grey_bull.jpg, matched by a
//   silhouette-edge overlay to ~2-3 % on topline, rump, belly, dewlap, legs and head).
//
// Proportions (H = withers height = 1.50 m; horn tips 1.75 m)
//   topline: withers 1.515 at z 0.30, back 1.39-1.43, tail head 1.35 at z -1.03 (slopes ~0.1 H). Brisket 0.61 m
//   (chest depth 0.6 H), belly line 0.645 m, elbow 0.62, knee 0.36, fetlock 0.17, hoof 0.09. Head 0.48 m long,
//   carried 38 deg below horizontal, muzzle 1.07 m above ground. Nose to buttock 2.35 m = 1.57 H. Barrel 0.72 m
//   wide. Lower legs modelled ~12 % fatter than the photo: the 5 px ink eats that much of a thin part.
//
// Two-tone pairs, all from the "noon" script:
//   coat   iris #5c3d32 / hair #241c16        horn  practical #fffaf2 / sky #f2d7ae
//   hoof   hair #241c16 / ink #2c261f         muzzle hair #241c16 / ink #2c261f
//   ear    skin #f0c2ae / iris #5c3d32 (inner) eye hair #241c16, glint moon #fff6e4. Ink hull: ink #2c261f.

export const meta = {
  name: "ox",
  height: 1.75,
  script: "noon",
  colors: {
    coat: "#5c3d32",
    coatShade: "#241c16",
    horn: "#fffaf2",
    hornShade: "#f2d7ae",
    hoof: "#241c16",
    hoofShade: "#2c261f",
    muzzle: "#241c16",
    muzzleShade: "#2c261f",
    earIn: "#f0c2ae",
    earInShade: "#5c3d32",
    eye: "#241c16",
    glint: "#fff6e4",
  },
  poses: ["rest", "walk-a", "walk-b", "drink", "stomp"],
};

// Joint rotations in degrees [rx, ry, rz], absolute. A pose = REST with its own rows on top.
// Legs hang along -Y: negative rx swings a limb forward (+Z), positive rx swings it back.
const REST = {
  body: [0, 0, 0], neckBase: [0, 0, 0], neckMid: [0, 0, 0], poll: [0, 0, 0], tailRoot: [0, 0, 0], tailMid: [0, 0, 0],
  shoulderL: [0, 0, 0], elbowL: [0, 0, 0], kneeL: [0, 0, 0], fetlockFL: [0, 0, 0],
  shoulderR: [0, 0, 0], elbowR: [0, 0, 0], kneeR: [0, 0, 0], fetlockFR: [0, 0, 0],
  hipL: [0, 0, 0], stifleL: [0, 0, 0], hockL: [0, 0, 0], fetlockHL: [0, 0, 0],
  hipR: [0, 0, 0], stifleR: [0, 0, 0], hockR: [0, 0, 0], fetlockHR: [0, 0, 0],
};
const POSES = {
  rest: {},
  // walk keys, diagonal pairs: one fore leg swinging forward (lifted, knee folded), the opposite hind planted
  // forward, the other two planted behind with the trailing hind heel lifting off.
  "walk-a": {
    dy: -0.022,
    shoulderL: [-16, 0, 0], elbowL: [-8, 0, 0], kneeL: [55, 0, 0], fetlockFL: [28, 0, 0],
    shoulderR: [11, 0, 0], fetlockFR: [-11, 0, 0],
    hipR: [-13, 0, 0], fetlockHR: [13, 0, 0],
    hipL: [9, 0, 0], stifleL: [10, 0, 0], hockL: [-26, 0, 0], fetlockHL: [12, 0, 0],
    neckBase: [3, 0, 0], tailRoot: [0, 0, 5], tailMid: [0, 0, 8],
  },
  "walk-b": {
    dy: -0.022,
    shoulderR: [-16, 0, 0], elbowR: [-8, 0, 0], kneeR: [55, 0, 0], fetlockFR: [28, 0, 0],
    shoulderL: [11, 0, 0], fetlockFL: [-11, 0, 0],
    hipL: [-13, 0, 0], fetlockHL: [13, 0, 0],
    hipR: [9, 0, 0], stifleR: [10, 0, 0], hockR: [-26, 0, 0], fetlockHR: [12, 0, 0],
    neckBase: [5, 0, 0], tailRoot: [0, 0, -5], tailMid: [0, 0, -8],
  },
  // drinking: neck bowed ~60 deg below horizontal, head near vertical, muzzle at the water surface; forelegs
  // planted a little forward, hind legs angled back (drink_white_cow_side.jpg)
  drink: {
    dy: 0.007,
    neckBase: [40, 0, 0], neckMid: [70, 0, 0], poll: [-64, 0, 0],
    shoulderL: [-5, 0, 0], fetlockFL: [5, 0, 0], shoulderR: [-5, 0, 0], fetlockFR: [5, 0, 0],
    hipL: [6, 0, 0], fetlockHL: [-6, 0, 0], hipR: [6, 0, 0], fetlockHR: [-6, 0, 0],
    tailRoot: [-4, 0, 0],
  },
  // stomp: left fore hoof lifted high, forearm near horizontal, cannon hanging, sole facing down, about to
  // come down; head up and level, oblivious
  stomp: {
    shoulderL: [-38, 0, 0], elbowL: [-55, 0, 0], kneeL: [112, 0, 0], fetlockFL: [30, 0, 0],
    shoulderR: [4, 0, 0], fetlockFR: [-4, 0, 0], hipL: [-3, 0, 0], fetlockHL: [3, 0, 0],
    hipR: [-3, 0, 0], fetlockHR: [3, 0, 0],
    neckBase: [-6, 0, 0], poll: [6, 0, 0], tailRoot: [0, 0, 10], tailMid: [-10, 0, 12],
  },
};
const DEG = Math.PI / 180;

export function build(THREE, kit, colors = meta.colors) {
  const c = colors;
  const root = new THREE.Group();
  root.name = "ox";
  const joints = {};

  // ---------- geometry helpers ----------
  const spow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);

  // st: [y, z, up, dn, aTop, aBot, n?] in world rest metres. up/dn measured along the ring's in-plane normal
  // (for a horizontal spine running +Z: up = +Y; for a vertical spine running -Y: up = +Z, the front).
  function loft(st, { x = 0, seg = 24, n = 2.4, plane = "perp" } = {}) {
    const pos = [];
    const idx = [];
    const R = st.length;
    for (let i = 0; i < R; i++) {
      const a = st[Math.max(i - 1, 0)];
      const b = st[Math.min(i + 1, R - 1)];
      let ty = b[0] - a[0];
      let tz = b[1] - a[1];
      const tl = Math.hypot(ty, tz) || 1;
      ty /= tl;
      tz /= tl;
      // ring plane: perpendicular to the spine, or locked to constant z (up = +Y) / constant y (up = +Z, the front)
      const ny = plane === "z" ? 1 : plane === "y" ? 0 : tz;
      const nz = plane === "z" ? 0 : plane === "y" ? 1 : -ty;
      const [y, z, up, dn, aT, aB, ne = n] = st[i];
      const e = 2 / ne;
      for (let j = 0; j < seg; j++) {
        const t = (j / seg) * Math.PI * 2;
        const s = Math.sin(t);
        // below the equator the half-width blends from aT to aB, so there is no step at the sides
        const u = spow(Math.cos(t), e) * (s >= 0 ? aT : aT + (aB - aT) * Math.pow(-s, 0.8));
        const v = spow(s, e) * (s >= 0 ? up : dn);
        pos.push(x + u, y + v * ny, z + v * nz);
      }
    }
    for (let i = 0; i < R - 1; i++)
      for (let j = 0; j < seg; j++) {
        const a = i * seg + j;
        const b = i * seg + ((j + 1) % seg);
        const a2 = a + seg;
        const b2 = b + seg;
        idx.push(a, b, a2, b, b2, a2);
      }
    const c0 = pos.length / 3;
    pos.push(x, st[0][0], st[0][1]);
    const c1 = c0 + 1;
    pos.push(x, st[R - 1][0], st[R - 1][1]);
    for (let j = 0; j < seg; j++) {
      const j1 = (j + 1) % seg;
      idx.push(c0, j1, j);
      idx.push(c1, (R - 1) * seg + j, (R - 1) * seg + j1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  // Tapered tube along a Catmull-Rom curve through pts ([x,y,z] world). r(t) radius, t in 0..1. Tip closed on an apex.
  function tube(pts, r, { steps = 20, seg = 10 } = {}) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const fr = curve.computeFrenetFrames(steps, false);
    const pos = [];
    const idx = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = curve.getPointAt(t);
      const rad = r(t);
      for (let j = 0; j < seg; j++) {
        const a = (j / seg) * Math.PI * 2;
        const nx = fr.normals[i];
        const bx = fr.binormals[i];
        pos.push(
          p.x + rad * (Math.cos(a) * nx.x + Math.sin(a) * bx.x),
          p.y + rad * (Math.cos(a) * nx.y + Math.sin(a) * bx.y),
          p.z + rad * (Math.cos(a) * nx.z + Math.sin(a) * bx.z));
      }
    }
    for (let i = 0; i < steps; i++)
      for (let j = 0; j < seg; j++) {
        const a = i * seg + j;
        const b = i * seg + ((j + 1) % seg);
        idx.push(a, b, a + seg, b, b + seg, a + seg); // ring runs N -> B, so this winding faces outward
      }
    const p0 = curve.getPointAt(0);
    const p1 = curve.getPointAt(1);
    const t1 = fr.tangents[steps];
    const c0 = pos.length / 3;
    pos.push(p0.x, p0.y, p0.z);
    pos.push(p1.x + t1.x * 0.004, p1.y + t1.y * 0.004, p1.z + t1.z * 0.004);
    for (let j = 0; j < seg; j++) {
      const j1 = (j + 1) % seg;
      idx.push(c0, j, j1);
      idx.push(c0 + 1, steps * seg + j1, steps * seg + j);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  const ellipsoid = (rx, ry, rz, w = 16, h = 12) => new THREE.SphereGeometry(1, w, h).scale(rx, ry, rz);

  // A joint pivot at a WORLD rest position; Group.position is relative to the parent's pivot.
  const joint = (name, parent, p) => {
    const g = new THREE.Group();
    g.name = name;
    g.userData.world = p;
    const pw = parent.userData.world || [0, 0, 0];
    g.position.set(p[0] - pw[0], p[1] - pw[1], p[2] - pw[2]);
    parent.add(g);
    joints[name] = g;
    return g;
  };
  // Add a mesh whose geometry is in world rest coordinates.
  const part = (j, geo, base, shade, opts) => {
    const m = kit.toon(geo, base, shade, opts);
    const w = j.userData.world || [0, 0, 0];
    m.position.set(-w[0], -w[1], -w[2]);
    j.add(m);
    return m;
  };
  const coat = (j, geo) => part(j, geo, c.coat, c.coatShade);
  // Add a mesh built around the origin at a WORLD point p with Euler e = [x, y, z, order?]; off = local shift first.
  const place = (j, geo, base, shade, p, e = [0, 0, 0], opts, off) => {
    if (off) geo.translate(...off);
    const m = kit.toon(geo, base, shade, opts);
    const w = j.userData.world || [0, 0, 0];
    m.position.set(p[0] - w[0], p[1] - w[1], p[2] - w[2]);
    m.rotation.set(e[0], e[1], e[2], e[3] || "XYZ");
    j.add(m);
    return m;
  };

  // ---------- body ----------
  const BODY_Y = 1.12;
  const body = joint("body", root, [0, BODY_Y, -0.82]); // pivot at hip level: pitching it keeps the rear planted
  // B(z, top, bottom, aTop, aBot): a ring at constant z (plane "z"), so top/bottom read straight off the side profile
  const B = (z, top, bot, aT, aB, n) => [(top + bot) / 2, z, (top - bot) / 2, (top - bot) / 2, aT, aB, n];
  coat(body, loft([
    B(-1.15, 1.22, 1.08, 0.01, 0.01),
    B(-1.135, 1.28, 0.99, 0.09, 0.08, 2.8),
    B(-1.10, 1.325, 0.88, 0.17, 0.15, 2.8),
    B(-1.03, 1.35, 0.79, 0.24, 0.22, 2.7),
    B(-0.90, 1.36, 0.73, 0.29, 0.27, 2.6),
    B(-0.74, 1.365, 0.69, 0.31, 0.30),
    B(-0.54, 1.375, 0.665, 0.33, 0.33),
    B(-0.30, 1.39, 0.65, 0.355, 0.35),
    B(-0.05, 1.43, 0.645, 0.36, 0.35),
    B(0.15, 1.485, 0.635, 0.35, 0.32),
    B(0.30, 1.515, 0.615, 0.335, 0.29),
    B(0.42, 1.505, 0.61, 0.315, 0.24),
    B(0.53, 1.455, 0.64, 0.28, 0.20), // the front end is hidden by the neck at rest; it slopes down so the
    B(0.62, 1.31, 0.70, 0.23, 0.16), // drink pose shows a withers -> neck line, not a wall
    B(0.69, 1.15, 0.77, 0.15, 0.10),
    B(0.72, 1.0, 0.88, 0.01, 0.01),
  ], { seg: 32, plane: "z" }));

  // ---------- neck ----------
  // Two lofts on a two-joint chain, so the drink bow is a curve. The base pivot sits low and back in the chest
  // (where the cervical spine starts), so the bow reaches the ground. The two lofts share rings over z 0.58-0.66;
  // same material and same surface, so the overlap is invisible at rest.
  const NECK = [
    B(0.28, 1.36, 1.02, 0.02, 0.02), // root rows sit high inside the withers: when the neck bows they
    B(0.33, 1.46, 0.80, 0.22, 0.14), // become the crest that joins the withers (no notch)
    B(0.44, 1.495, 0.655, 0.28, 0.15), // thick bull neck: nearly as wide as the shoulders on top
    B(0.56, 1.48, 0.69, 0.25, 0.11),
    B(0.62, 1.465, 0.71, 0.23, 0.10),
    B(0.66, 1.45, 0.735, 0.21, 0.09),
    B(0.74, 1.425, 0.785, 0.18, 0.08),
    B(0.82, 1.39, 0.845, 0.145, 0.085),
    B(0.88, 1.35, 0.89, 0.13, 0.09),
    B(0.93, 1.31, 0.95, 0.11, 0.08),
    B(0.95, 1.22, 1.00, 0.01, 0.01),
  ];
  const neckBase = joint("neckBase", body, [0, 1.0, 0.30]);
  // each loft runs ~0.12 m into the other, ~5 % thinner (hidden at rest), and fills the outside of the bend
  coat(neckBase, loft([...NECK.slice(0, 6), B(0.74, 1.41, 0.795, 0.17, 0.075), B(0.80, 1.36, 0.865, 0.13, 0.06),
    B(0.88, 1.30, 0.92, 0.10, 0.06), B(0.92, 1.24, 0.98, 0.06, 0.04), B(0.93, 1.15, 1.05, 0.01, 0.01)], { seg: 28, plane: "z" }));
  const neckMid = joint("neckMid", neckBase, [0, 1.0, 0.50]); // low in the neck: a long lever for the bow
  coat(neckMid, loft([B(0.46, 1.2, 0.95, 0.01, 0.01), B(0.48, 1.40, 0.74, 0.2, 0.09), B(0.53, 1.44, 0.71, 0.23, 0.1),
    ...NECK.slice(3)], { seg: 28, plane: "z" }));

  // ---------- head (built along an axis 38 deg below horizontal) ----------
  const poll = joint("poll", neckMid, [0, 1.28, 0.78]);
  const HA = [1.36, 0.75]; // axis start [y, z]
  const HD = [-Math.sin(38 * DEG), Math.cos(38 * DEG)]; // axis direction [y, z]
  const HN = [HD[1], -HD[0]]; // forehead normal [y, z]
  const H = (s, up, dn, aT, aB, n) => [HA[0] + HD[0] * s, HA[1] + HD[1] * s, up, dn, aT, aB, n];
  const onHead = (s, u) => [HA[0] + HD[0] * s + HN[0] * u, HA[1] + HD[1] * s + HN[1] * u]; // [y, z]
  coat(poll, loft([
    H(-0.05, 0.01, 0.01, 0.01, 0.01),
    H(-0.03, 0.07, 0.12, 0.10, 0.09),
    H(0.02, 0.10, 0.18, 0.145, 0.115), // broad flat forehead between the horn bases
    H(0.08, 0.105, 0.21, 0.152, 0.12),
    H(0.15, 0.095, 0.21, 0.145, 0.115),
    H(0.24, 0.08, 0.205, 0.118, 0.10),
    H(0.32, 0.065, 0.17, 0.096, 0.085),
    H(0.39, 0.06, 0.135, 0.094, 0.088),
    H(0.44, 0.05, 0.095, 0.098, 0.088), // muzzle flares again
    H(0.47, 0.035, 0.06, 0.08, 0.07),
    H(0.48, 0.005, 0.005, 0.005, 0.005),
  ], { seg: 24, n: 2.6 }));
  // muzzle pad: its hull draws the muzzle line across the face
  place(poll, ellipsoid(0.1, 0.105, 0.062, 18, 12), c.muzzle, c.muzzleShade, [0, ...onHead(0.445, -0.01)], [-(90 - 38) * DEG, 0, 0]);
  // horns: out from the poll corners, forward, then up; tips turn a little back (lyre). Thick at the base so the
  // pale shape survives the 5 px ink on both sides.
  for (const s of [-1, 1]) {
    const [y0, z0] = onHead(0.04, 0.05);
    part(poll, tube([
      [s * 0.075, y0 - 0.01, z0],
      [s * 0.19, y0 + 0.035, z0 + 0.02],
      [s * 0.30, y0 + 0.07, z0 + 0.07],
      [s * 0.37, y0 + 0.17, z0 + 0.11],
      [s * 0.39, y0 + 0.29, z0 + 0.10],
      [s * 0.37, y0 + 0.37, z0 + 0.05],
    ], (t) => 0.068 * Math.pow(1 - t, 0.9) + 0.002, { steps: 22, seg: 12 }), c.horn, c.hornShade);
  }
  // poll: the raised coat ridge between the horn bases
  place(poll, ellipsoid(0.085, 0.035, 0.05, 14, 8), c.coat, c.coatShade, [0, ...onHead(0.035, 0.072)], [38 * DEG, 0, 0]);
  // ears: pointed leaves out sideways under the horns, drooping 25 deg, open to the front; pale inside
  const leaf = (len, w, th) => loft([
    [0, 0, 0.004, 0.004, 0.004, 0.004],
    [0, len * 0.12, w * 0.5, w * 0.5, th, th],
    [0, len * 0.45, w, w * 0.9, th * 0.9, th * 0.9],
    [0, len * 0.8, w * 0.6, w * 0.5, th * 0.6, th * 0.6],
    [0, len, 0.004, 0.004, 0.004, 0.004],
  ], { seg: 12, n: 2, plane: "z" });
  for (const s of [-1, 1]) {
    const [y, z] = onHead(0.07, -0.03);
    place(poll, leaf(0.2, 0.06, 0.02), c.coat, c.coatShade, [s * 0.1, y, z - 0.02], [0, s * 105 * DEG, -s * 25 * DEG, "ZYX"]);
    place(poll, leaf(0.15, 0.04, 0.008), c.earIn, c.earInShade, [s * 0.13, y - 0.012, z - 0.005], [0, s * 105 * DEG, -s * 25 * DEG, "ZYX"],
      { outline: false }, [-s * 0.012, 0, 0.02]);
  }
  // eyes: dark ball, a heavy coat-coloured lid over the top half (sleepy, unaware), a glint, and a brow ridge
  for (const s of [-1, 1]) {
    const [y, z] = onHead(0.18, 0.03);
    const ex = s * 0.13;
    place(poll, ellipsoid(0.03, 0.027, 0.03, 14, 10), c.eye, c.eye, [ex, y, z], [0, 0, 0], { outline: false });
    place(poll, new THREE.SphereGeometry(0.035, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), c.coat, c.coatShade,
      [ex, y, z], [-0.5, 0, s * 0.35]);
    place(poll, ellipsoid(0.006, 0.006, 0.006, 8, 6), c.glint, c.glint, [ex + s * 0.022, y + 0.004, z + 0.013], [0, 0, 0], { outline: false });
    place(poll, ellipsoid(0.032, 0.022, 0.06, 12, 8), c.coat, c.coatShade, [s * 0.125, ...onHead(0.16, 0.07)], [38 * DEG, 0, 0]);
  }
  // ---------- legs ----------
  // limb(): rows [y, z, front, back, halfWidth] top to bottom, rings at constant y; both ends get a dome so a
  // segment can overlap its neighbour past the pivot and still read round when the joint bends.
  // k scales every girth of the segment (the ink hull makes legs read ~10 % thinner than they are).
  function limb(j, x, rows, { seg = 14, n = 2.2, dome = 0.5, k = 1 } = {}) {
    const end = (r, dir) => {
      const h = Math.max(r[2], r[3], r[4]) * dome * k;
      return [
        [r[0] + dir * h * 0.6, r[1], r[2] * 0.75 * k, r[3] * 0.75 * k, r[4] * 0.75 * k, r[4] * 0.75 * k],
        [r[0] + dir * h, r[1], 0.004, 0.004, 0.004, 0.004],
      ];
    };
    const mid = rows.map((r) => [r[0], r[1], r[2] * k, r[3] * k, r[4] * k, r[4] * k]);
    const st = [...end(rows[0], 1).reverse(), ...mid, ...end(rows[rows.length - 1], -1)];
    return coat(j, loft(st, { x, seg, n, plane: "y" }));
  }
  // A foot below the fetlock: pastern, two claws (the split is the cloven hoof) and two dewclaws behind.
  // Claw rings at constant y: long at the sole, short at the coronet and shifted forward, so the side view is a
  // wedge (toe wall 0.085 m high, heel bulb ~0.05 m), not a slipper.
  const CLAW = [ // [y, front z, back z, half-width] relative to the foot centre
    [0.092, 0.016, 0.012, 0.004], [0.085, 0.03, -0.002, 0.022], [0.07, 0.042, -0.014, 0.03],
    [0.05, 0.054, -0.046, 0.034], [0.03, 0.064, -0.058, 0.035], [0.006, 0.07, -0.061, 0.034], [0.0, 0.068, -0.058, 0.032],
  ];
  function foot(j, [x, y, z]) {
    limb(j, x, [
      [y - 0.01, z + 0.002, 0.042, 0.046, 0.047],
      [y - 0.05, z + 0.01, 0.045, 0.05, 0.05],
      [y - 0.085, z + 0.02, 0.05, 0.056, 0.056],
    ], { seg: 12, dome: 0.3, k: LK });
    const zf = z + 0.03;
    for (const s of [-1, 1]) {
      part(j, loft(CLAW.map(([cy, fz, bz, a]) => [cy, zf + (fz + bz) / 2, (fz - bz) / 2, (fz - bz) / 2, a, a]),
        { x: x + s * 0.036, seg: 12, n: 2.6, plane: "y" }), c.hoof, c.hoofShade);
      place(j, ellipsoid(0.013, 0.018, 0.012, 7, 5), c.hoof, c.hoofShade, [x + s * 0.03, y - 0.05, z - 0.045], [0.5, 0, 0]);
    }
  }

  const LK = 1.12; // lower-leg girth factor
  for (const [side, s] of [["L", 1], ["R", -1]]) {
    // fore leg: shoulder (hidden in the chest), elbow -> knee (forearm), knee -> fetlock (cannon), foot
    const shoulder = joint(`shoulder${side}`, body, [s * 0.18, 1.0, 0.46]);
    limb(shoulder, s * 0.17, [
      [1.06, 0.48, 0.10, 0.10, 0.09],
      [0.90, 0.42, 0.12, 0.13, 0.10],
      [0.74, 0.34, 0.11, 0.15, 0.10],
      [0.64, 0.31, 0.09, 0.12, 0.09],
    ], { seg: 14 });
    const elbow = joint(`elbow${side}`, shoulder, [s * 0.19, 0.62, 0.31]);
    limb(elbow, s * 0.185, [
      [0.70, 0.32, 0.09, 0.10, 0.10],
      [0.58, 0.33, 0.08, 0.075, 0.092],
      [0.47, 0.335, 0.064, 0.058, 0.074],
      [0.39, 0.337, 0.055, 0.05, 0.064],
      [0.35, 0.337, 0.06, 0.056, 0.066], // knee (carpus) knob belongs to the forearm
      [0.315, 0.338, 0.046, 0.046, 0.05], // then tapers THROUGH the cannon: ends thinner than it, inside it
      [0.29, 0.338, 0.038, 0.038, 0.042],
    ], { seg: 16, dome: 0.3, k: LK });
    const knee = joint(`knee${side}`, elbow, [s * 0.18, 0.36, 0.335]);
    limb(knee, s * 0.18, [
      [0.37, 0.337, 0.042, 0.042, 0.046], // starts inside the knee knob (<= 80 % of its width): no cuff line
      [0.28, 0.338, 0.042, 0.043, 0.047],
      [0.21, 0.34, 0.043, 0.044, 0.048],
      [0.17, 0.342, 0.056, 0.062, 0.06], // fetlock knob belongs to the cannon
      [0.15, 0.344, 0.05, 0.056, 0.055],
      [0.125, 0.348, 0.038, 0.042, 0.042],
    ], { seg: 12, dome: 0.3, k: LK });
    const fetF = joint(`fetlockF${side}`, knee, [s * 0.18, 0.17, 0.342]);
    foot(fetF, [s * 0.18, 0.17, 0.342]);

    // hind leg: hip (thigh mass inside the quarter), stifle -> hock (gaskin), hock -> fetlock (cannon), foot
    const hip = joint(`hip${side}`, body, [s * 0.19, 1.12, -0.82]);
    limb(hip, s * 0.17, [
      [1.20, -0.84, 0.16, 0.2, 0.11],
      [1.02, -0.82, 0.21, 0.25, 0.125],
      [0.86, -0.80, 0.2, 0.24, 0.12],
      [0.76, -0.79, 0.16, 0.2, 0.1],
    ], { seg: 16, dome: 0.3 });
    const stifle = joint(`stifle${side}`, hip, [s * 0.2, 0.78, -0.62]);
    limb(stifle, s * 0.18, [
      [0.84, -0.82, 0.17, 0.21, 0.105],
      [0.72, -0.84, 0.15, 0.18, 0.095],
      [0.58, -0.87, 0.09, 0.12, 0.075],
      [0.47, -0.885, 0.065, 0.09, 0.068],
      [0.43, -0.89, 0.062, 0.098, 0.068], // hock, with the point of the hock behind
      [0.39, -0.882, 0.042, 0.05, 0.046],
      [0.36, -0.876, 0.036, 0.04, 0.04],
    ], { seg: 16, dome: 0.3, k: 1.06 });
    const hock = joint(`hock${side}`, stifle, [s * 0.18, 0.44, -0.88]);
    limb(hock, s * 0.18, [
      [0.45, -0.887, 0.042, 0.046, 0.046],
      [0.40, -0.877, 0.044, 0.048, 0.05],
      [0.34, -0.865, 0.042, 0.045, 0.047],
      [0.24, -0.845, 0.043, 0.044, 0.048],
      [0.17, -0.832, 0.056, 0.062, 0.06],
      [0.15, -0.83, 0.05, 0.056, 0.055],
      [0.125, -0.826, 0.038, 0.042, 0.042],
    ], { seg: 12, dome: 0.3, k: LK });
    const fetH = joint(`fetlockH${side}`, hock, [s * 0.18, 0.17, -0.83]);
    foot(fetH, [s * 0.18, 0.17, -0.83]);
  }

  // ---------- tail ----------
  const tailRoot = joint("tailRoot", body, [0, 1.34, -1.08]);
  coat(tailRoot, tube([
    [0, 1.33, -1.06], [0, 1.29, -1.13], [0, 1.15, -1.16], [0, 0.95, -1.165], [0, 0.78, -1.16],
  ], (t) => 0.034 - 0.016 * t, { steps: 14, seg: 10 }));
  const tailMid = joint("tailMid", tailRoot, [0, 0.79, -1.16]);
  coat(tailMid, tube([
    [0, 0.80, -1.16], [0, 0.62, -1.155], [0, 0.45, -1.15],
  ], () => 0.016, { steps: 8, seg: 10 }));
  part(tailMid, loft([
    [0.56, -1.15, 0.004, 0.004, 0.004, 0.004],
    [0.54, -1.15, 0.022, 0.022, 0.022, 0.022],
    [0.44, -1.152, 0.04, 0.042, 0.04, 0.04],
    [0.30, -1.155, 0.05, 0.055, 0.05, 0.05],
    [0.19, -1.158, 0.038, 0.045, 0.04, 0.04],
    [0.12, -1.16, 0.015, 0.02, 0.016, 0.016],
    [0.095, -1.16, 0.004, 0.004, 0.004, 0.004],
  ], { seg: 12, plane: "y" }), c.hoof, c.hoofShade);

  function pose(name) {
    const rows = POSES[name];
    if (!rows) throw new Error(`unknown pose "${name}" (${Object.keys(POSES).join(", ")})`);
    const { dy = 0, ...rot } = rows;
    const table = { ...REST, ...rot };
    body.position.y = BODY_Y + dy; // dy: per-pose body drop (m) so the planted hooves meet y=0
    for (const [jn, [rx, ry, rz]] of Object.entries(table)) joints[jn].rotation.set(rx * DEG, ry * DEG, rz * DEG);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
