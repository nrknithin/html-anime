// komainu.js - a stone shrine guardian lion-dog (komainu) seated on a carved plinth, static. One set with
// models/torii.js and models/shrine.js (same script, same { height } option).
// Contract: harness/lab/README.md. Meters, +Y up, the figure faces +Z, its left is +X, stands on y = 0, centred on
// x = 0, z = 0.
//
// Construction (scaled spheres, lathes, cones and boxes, merged per material; smooth figure, flat plinth):
//   PLINTH   stacked boxes: a wide foot slab and a step, the die block with a carved panel on each face drawn as an
//            ink-band rectangle (the hull draws no creases), then two cap steps flaring back out, and the figure's own
//            low base slab on top.
//   BODY     a lathe trunk (pear profile) tilted forward so the chest pushes out over straight front legs, a chest ball,
//            two haunch ellipsoids with a swirl on each and the hind paws tucked forward beside the front ones, lathe
//            front legs (thick at the shoulder) on round paws with three toe balls each, curl tufts behind each elbow.
//            The figure is authored narrow and widened as one piece (x 1.22, z 1.08) into a chunky carving.
//   HEAD     big and forward: a skull ellipsoid, a broad muzzle with cheek puffs and a wide flat nose, heavy brows over
//            bulging ball eyes (sclera with dark pupils). side "a" (a-gyo) drops the jaw to show a dark mouth and four
//            fangs; side "un" (un-gyo) shuts it, keeps two fangs over the lip and has a single horn nub on the crown.
//   MANE     the identity cue: ~50 curls spread (golden-angle spiral, so no random) over a cap ellipsoid around and
//            behind the head, kept behind the face and above the shoulders. Each curl is a ball with a smaller ball set
//            out along the cap normal and to one side, so the hull draws a stepped spiral on every lump.
//   TAIL     a flame-shaped fan of the same curls standing up behind the haunches on a short stem.
//   BIB      optional ({ bib: true }): a red cloth cone (closed lathe shell) round the neck, over the chest.
// Proportions (real size, base unit the head width Hw = 0.40 m after widening): figure 0.94 tall (2.35 Hw) on a 0.8 m
//   plinth (0.80 x 1.00 foot, 0.60 x 0.80 die, 0.78 x 0.98 cap), base slab 0.80-0.85; head centre 0.70 above the slab,
//   mane top 1.79 (un-gyo's horn 1.81); front legs 0.47 long, 0.15 thick at the shoulder; mane cap ~0.6 wide; tail fan
//   ~0.35 wide, to ~0.75 above the slab.
// Options: build(THREE, kit, colors, { height, side, bib }). height scales uniformly (1.79 m = one a-gyo on its plinth
//   as authored; un-gyo comes out 1 % taller for its horn). side "a" (default) | "un" | "pair": the pair stands 3 m apart along x, a-gyo at +X (the right as you
//   face the shrine), un-gyo at -X, both facing +Z down the approach, each turned 30 deg in toward the other.
// Colours (noon, the torii's set), base / shade:
//   figure stone   moon #fff6e4 / sky #f2d7ae, threshold 0.25: the pale carved granite; ink draws the curls
//   plinth stone   sky #f2d7ae / skin #f0c2ae, threshold 0.1 (as the house's foundation stones), a step darker than the
//                  figure so the figure stands off it
//   eyes           sclera #f6f3ee / sky #f2d7ae; pupils, nostrils, mouth inside and the
//                  plinth's panel bands hair #241c16 / hair, no hull (holes and carved lines)
//   fangs          practical #fffaf2 / sclera #f6f3ee
//   bib            accent #c4452d / iris #5c3d32, threshold 0.1 (the torii's vermilion)

export const meta = {
  name: "komainu",
  height: 1.79,
  script: "noon",
  colors: {
    stone: "#fff6e4", stoneShade: "#f2d7ae",
    plinth: "#f2d7ae", plinthShade: "#f0c2ae",
    eye: "#f6f3ee", eyeShade: "#f2d7ae",
    dark: "#241c16",
    fang: "#fffaf2", fangShade: "#f6f3ee",
    bib: "#c4452d", bibShade: "#5c3d32",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, side = "a", bib = false } = opts;
  if (!["a", "un", "pair"].includes(side)) throw new Error(`komainu: side "${side}" (a | un | pair)`);
  const H0 = 1.79; // one figure on its plinth as authored below
  const root = new THREE.Group();
  root.name = "komainu";
  const set = new THREE.Group(); // uniform size scale lives here, root stays the plain contract node
  set.name = "set";
  set.scale.setScalar(height / H0);
  root.add(set);
  const joints = {};

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const SPH = new THREE.SphereGeometry(1, 12, 8);
  const SPHc = new THREE.SphereGeometry(1, 9, 6);
  const SPHs = new THREE.SphereGeometry(1, 7, 5);
  const SPHt = new THREE.SphereGeometry(1, 5, 3);
  // the figure is authored narrow and widened here as one piece (chunky stone carving)
  const FIG = new THREE.Matrix4().makeScale(1.22, 1, 1.08);
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  const BOXP = BOX.clone();
  BOXP.userData.plinth = true; // plinth-space boxes skip the figure's widening

  const MAT = {
    stone: [c.stone, c.stoneShade, 0.25, true],
    plinth: [c.plinth, c.plinthShade, 0.1, true],
    eye: [c.eye, c.eyeShade, 0.1, true],
    dark: [c.dark, c.dark, 0.1, false],
    fang: [c.fang, c.fangShade, 0.1, true],
    bib: [c.bib, c.bibShade, 0.1, true],
  };

  function unit(sideKey) {
    const g = new THREE.Group();
    g.name = sideKey === "a" ? "agyo" : "ungyo";
    const soups = {};
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    function add(key, geo, pos, scl = [1, 1, 1], rot = [0, 0, 0]) {
      const gg = (geo.index ? geo.toNonIndexed() : geo.clone());
      gg.userData.plinth = geo.userData.plinth;
      if (!gg.attributes.normal) gg.computeVertexNormals();
      m4.compose(V(...pos), q.setFromEuler(e.set(...rot)), V(...scl));
      gg.applyMatrix4(m4);
      if (key !== "plinth" && !gg.userData.plinth) gg.applyMatrix4(FIG);
      (soups[key] ??= []).push(gg);
    }
    const ball = (key, p, s, rot) => add(key, SPH, p, typeof s === "number" ? [s, s, s] : s, rot);
    const small = (key, p, s) => add(key, SPHs, p, [s, s, s]);
    const tiny = (key, p, s) => add(key, SPHt, p, [s, s, s]);
    const box = (key, cx, cy, cz, sx, sy, sz) => add(key, BOXP, [cx, cy, cz], [sx, sy, sz]);
    // a curl: ball r at p, a 0.62 r ball out along n and a little sideways, a 0.3 r eye in it (stepped spiral)
    const up = V(0, 1, 0);
    function curl(p, n, r, twist = 1) {
      n = n.clone().normalize();
      const t = V().crossVectors(Math.abs(n.y) > 0.9 ? V(1, 0, 0) : up, n).normalize().multiplyScalar(twist);
      const P = V(...p);
      add("stone", SPHc, P.toArray(), [r, r, r]);
      small("stone", P.clone().addScaledVector(n, 0.5 * r).addScaledVector(t, 0.22 * r).toArray(), 0.62 * r);
      tiny("stone", P.clone().addScaledVector(n, 0.86 * r).addScaledVector(t, 0.3 * r).toArray(), 0.3 * r);
    }

    // ---------- plinth ----------
    box("plinth", 0, 0.05, 0, 0.8, 0.10, 1.0);
    box("plinth", 0, 0.14, 0, 0.72, 0.08, 0.92);
    box("plinth", 0, 0.40, 0, 0.6, 0.44, 0.8);
    // the carved panel (koza) on each face of the die: an ink-band rectangle 2 mm proud (the hull draws no creases)
    const bw = 0.014;
    for (const [w, d, nx, nz] of [[0.44, 0.4, 0, 1], [0.44, 0.4, 0, -1], [0.64, 0.3, 1, 0], [0.64, 0.3, -1, 0]]) {
      const o = d + 0.002, hw = w / 2, y0 = 0.27, y1 = 0.53;
      const band = (u, y, lu, ly) => (nz ? box("dark", u, y, nz * o, lu, ly, 0.004) : box("dark", nx * o, y, u, 0.004, ly, lu));
      band(0, y0, w, bw); band(0, y1, w, bw); band(-hw, (y0 + y1) / 2, bw, y1 - y0 + bw); band(hw, (y0 + y1) / 2, bw, y1 - y0 + bw);
    }
    box("plinth", 0, 0.66, 0, 0.7, 0.08, 0.9);
    box("plinth", 0, 0.75, 0, 0.78, 0.10, 0.98);
    const Y = 0.8; // top of the plinth
    box("stone", 0, Y + 0.025, -0.02, 0.54, 0.05, 0.8);
    const B = Y + 0.05; // the figure sits here

    // ---------- body ----------
    const LEG = new THREE.LatheGeometry([[0, 0], [0.05, 0.005], [0.056, 0.06], [0.058, 0.18], [0.068, 0.3], [0.078, 0.38], [0.06, 0.45], [0, 0.47]]
      .map(([r, y]) => new THREE.Vector2(r, y)), 12);
    const prof = [[0, 0], [0.12, 0.01], [0.19, 0.08], [0.205, 0.18], [0.19, 0.3], [0.16, 0.4], [0.125, 0.48], [0.07, 0.54], [0, 0.55]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    add("stone", new THREE.LatheGeometry(prof, 16), [0, B + 0.06, -0.09], [0.92, 1, 0.95], [0.3, 0, 0]);
    ball("stone", [0, B + 0.40, 0.08], [0.15, 0.16, 0.13]); // chest out
    for (const s of [1, -1]) {
      ball("stone", [s * 0.12, B + 0.15, -0.11], [0.11, 0.15, 0.2], [0.15, 0, 0]); // haunch
      ball("stone", [s * 0.175, B + 0.045, 0.06], [0.065, 0.045, 0.11]); // hind paw
      add("stone", LEG, [s * 0.095, B + 0.03, 0.17]); // front leg
      ball("stone", [s * 0.098, B + 0.045, 0.215], [0.07, 0.048, 0.085]); // front paw
      for (const k of [-1, 0, 1]) small("stone", [s * 0.098 + k * 0.04, B + 0.035, 0.29], 0.03); // toes
      curl([s * 0.13, B + 0.33, 0.12], V(s * 0.8, 0, -0.6), 0.045, s); // elbow tuft
      curl([s * 0.14, B + 0.24, 0.09], V(s * 0.8, -0.1, -0.6), 0.04, -s);
      curl([s * 0.215, B + 0.17, -0.12], V(s, 0.15, 0), 0.06, s); // swirl on the haunch
      curl([s * 0.2, B + 0.27, -0.2], V(s, 0.3, -0.3), 0.045, -s);
    }

    // ---------- head ----------
    const H = B + 0.7, HZ = 0.13;
    ball("stone", [0, H, HZ], [0.165, 0.15, 0.15]);
    ball("stone", [0, H - 0.055, HZ + 0.115], [0.125, 0.075, 0.085]); // muzzle
    for (const s of [1, -1]) {
      ball("stone", [s * 0.095, H - 0.07, HZ + 0.1], 0.07); // cheek
      ball("stone", [s * 0.068, H + 0.085, HZ + 0.12], [0.068, 0.035, 0.05], [0.25, 0, -s * 0.25]); // brow
      ball("eye", [s * 0.068, H + 0.04, HZ + 0.135], 0.042); // bulging eye
      small("dark", [s * 0.074, H + 0.04, HZ + 0.172], 0.017); // pupil
      ball("stone", [s * 0.155, H + 0.02, HZ + 0.03], [0.04, 0.075, 0.04], [0, 0, -s * 0.3]); // drooping ear
    }
    ball("stone", [0, H - 0.025, HZ + 0.19], [0.075, 0.034, 0.032]); // broad flat nose
    for (const s of [1, -1]) tiny("dark", [s * 0.03, H - 0.04, HZ + 0.215], 0.009); // nostrils
    if (sideKey === "a") {
      ball("dark", [0, H - 0.135, HZ + 0.1], [0.1, 0.05, 0.085]); // open mouth
      ball("stone", [0, H - 0.185, HZ + 0.09], [0.105, 0.035, 0.08]); // dropped jaw
      for (const s of [1, -1]) {
        add("fang", new THREE.ConeGeometry(0.014, 0.045, 6), [s * 0.065, H - 0.12, HZ + 0.155], [1, 1, 1], [Math.PI, 0, 0]);
        add("fang", new THREE.ConeGeometry(0.012, 0.035, 6), [s * 0.06, H - 0.165, HZ + 0.145]);
      }
    } else {
      ball("stone", [0, H - 0.115, HZ + 0.09], [0.105, 0.04, 0.08]); // shut jaw
      for (const s of [1, -1])
        add("fang", new THREE.ConeGeometry(0.013, 0.04, 6), [s * 0.06, H - 0.1, HZ + 0.165]);
      // horn nub: a blunt cone from the crown, leaning forward, standing clear of the mane
      add("stone", new THREE.ConeGeometry(0.038, 0.12, 10), [0, H + 0.2, HZ + 0.07], [1, 1, 1], [0.45, 0, 0]);
      small("stone", [0, H + 0.245, HZ + 0.095], 0.016);
    }

    // ---------- mane: curls on a cap ellipsoid round the head ----------
    const MC = V(0, H - 0.03, HZ - 0.05), MR = V(0.21, 0.21, 0.19);
    const N = 90, GA = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const yy = 1 - (2 * (i + 0.5)) / N, rr = Math.sqrt(1 - yy * yy), th = i * GA;
      const u = V(Math.cos(th) * rr, yy, Math.sin(th) * rr); // unit sphere
      const p = V(u.x * MR.x, u.y * MR.y, u.z * MR.z).add(MC);
      if (u.z > 0.42) continue; // keep the face clear
      if (u.y < -0.55) continue; // stop above the shoulders
      if (u.y < -0.1 && u.z > 0.1) continue; // no curls under the jaw
      if (sideKey === "un" && u.y > 0.6 && u.z > -0.05 && Math.abs(u.x) < 0.45) continue; // clear the horn
      const n = V(u.x / MR.x, u.y / MR.y, u.z / MR.z).normalize();
      curl(p.toArray(), n, 0.055 + 0.012 * (1 - Math.abs(u.y)), i % 2 ? 1 : -1);
    }
    // mane hanging down the back of the neck
    for (const [x, y, z] of [[0, 0.5, -0.17], [0.09, 0.47, -0.14], [-0.09, 0.47, -0.14], [0.15, 0.53, -0.06], [-0.15, 0.53, -0.06]])
      curl([x, B + y, z], V(x * 4, 0.1, -1), 0.055, x >= 0 ? 1 : -1);

    // ---------- tail: a flame fan of curls ----------
    add("stone", new THREE.CapsuleGeometry(0.045, 0.16, 4, 10), [0, B + 0.2, -0.3], [1, 1, 1], [-0.5, 0, 0]);
    const rows = [[0.22, [-0.05, 0.05]], [0.32, [-0.11, 0, 0.11]], [0.43, [-0.14, -0.047, 0.047, 0.14]], [0.54, [-0.11, 0, 0.11]], [0.63, [-0.05, 0.05]], [0.7, [0]]];
    for (const [y, xs] of rows)
      for (const x of xs) {
        const z = -0.37 + 0.6 * (y - 0.22) * (y - 0.22) + 0.25 * Math.abs(x);
        curl([x, B + y, z], V(x * 5, 0.4, -1), 0.064, x >= 0 ? 1 : -1);
      }

    // ---------- bib ----------
    if (bib) {
      const bp = [[0.115, 0.11], [0.2, -0.035], [0.21, -0.02], [0.125, 0.12]].map(([r, y]) => new THREE.Vector2(r, y));
      bp.push(bp[0].clone());
      add("bib", new THREE.LatheGeometry(bp, 20), [0, B + 0.47, 0.03], [1, 1, 1.05], [0.32, 0, 0]);
    }

    for (const [key, list] of Object.entries(soups)) {
      const pos = [], nrm = [];
      for (const gg of list) {
        pos.push(...gg.attributes.position.array);
        nrm.push(...gg.attributes.normal.array);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
      const [base, shade, threshold, outline] = MAT[key];
      const mesh = kit.toon(geo, base, shade, { threshold, outline });
      mesh.name = key;
      g.add(mesh);
    }
    return g;
  }

  if (side === "pair") {
    for (const [k, x, yaw] of [["a", 1.5, -0.52], ["un", -1.5, 0.52]]) {
      const u = unit(k);
      u.position.x = x;
      u.rotation.y = yaw;
      set.add(u);
      joints[u.name] = u;
    }
  } else set.add(unit(side));

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
