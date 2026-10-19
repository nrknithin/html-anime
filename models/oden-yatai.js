// oden-yatai.js - a night street-food pushcart serving oden, the anime salaryman's late stop. Static.
// Contract: harness/lab/README.md. Meters, +Y up, the customer side (counter, noren, stools) faces +Z, its left is
// +X (the lantern corner), stands on y = 0, centred on x = 0, z = 0.
//
// Construction (three.js primitives placed by matrix and merged into one triangle soup per material, so the whole
// cart is a handful of meshes; boxes stay flat-shaded, lathes and tubes keep their smooth normals):
//   CART    a wooden cabinet on two big spoked wheels at its short ends (iron tyre, wooden felloe, eight spokes,
//           dark hub, discs facing +-X so the three-quarter view sees one whole), push handles out of the back (-Z).
//           Dark plank lines and a skirt rail on the customer face. A counter ledge runs the full length on brackets.
//   POT     a square open oden pot sunk into the work top, its rim proud of it; dividers make 3 x 2 compartments of
//           golden broth holding daikon discs (tilted cylinders), brown eggs (squashed spheres), dark konjac
//           triangles, and skewers (sticks with meatball / konjac knots) leaning out so they read over the counter.
//   ROOF    four corner posts, a shallow gable roof with barge boards and a ridge cap. A short split noren (five plain
//           panels, no lettering) hangs from a rod under the front eave; a red paper lantern (lathe with dark caps and
//           ribs) hangs on a cord at the front +X corner; a bare bulb hangs under the ridge.
//   COUNTER a white tokkuri sake bottle and two cups on the ledge; three round wooden stools on the customer side.
//   STEAM   (option) three pale wisps (tubes along a swaying curve) rising out of the pot, no ink.
// Proportions (real size, base unit the cart length L = 2.0 m): body 2.0 x 1.1 x 0.68 (bottom 0.28, top 0.96 = 0.48 L);
// counter ledge 0.35 deep at 0.96-1.0, overhang to z 0.86; wheels 0.81 diameter (0.4 L); posts to the eave at 1.98;
// ridge 2.13, ridge cap top 2.19 = height; noren 0.36 tall (1.58-1.94); lantern 0.44 tall x 0.32 wide, centre 1.66;
// stools 0.48 tall at z 1.2; pot 0.8 x 0.56, rim at 1.1.
// Options: build(THREE, kit, colors, { height, night, steam })
//   height  scales the whole cart uniformly so the ridge cap top is `height` (default meta.height).
//   night   true lights it, on the same script: the lantern glows (practical over accent, no dark shade), the counter
//           ledge and work top take the practical tone, the bulb turns practical. Default false (unlit, accent lantern).
//   steam   true (default) adds the wisps; false leaves the pot bare.
// Colours (indigo, the night script): wood (body, roof, posts, stools, eggs) iris #e7a04a / sky #1b2d6b, the navy
// night shade; dark (tyres, hubs, plank lines, konjac, noren, lantern caps and ribs, handles grips) sky / hair
// #16141c; pot and skewers moon #d5e2ff / sky; broth practical #f0c36a / iris; daikon and sake ware sclera #f6f3ee /
// skin #f0c2ae; lantern accent #e23b4a / sky (night: practical / accent, threshold low so most of it glows);
// counter iris / sky (night: practical / iris); bulb moon / sky (night: practical, flat); steam line #e7eefc / moon,
// no hull. Pale and wood parts use threshold 0.1 so faces square to the camera stay lit.

export const meta = {
  name: "oden-yatai",
  height: 2.19,
  script: "indigo",
  colors: {
    wood: "#e7a04a", woodShade: "#1b2d6b",
    dark: "#1b2d6b", darkShade: "#16141c",
    metal: "#d5e2ff", metalShade: "#1b2d6b",
    broth: "#f0c36a", brothShade: "#e7a04a",
    white: "#f6f3ee", whiteShade: "#f0c2ae",
    lantern: "#e23b4a", lanternShade: "#1b2d6b",
    glow: "#f0c36a",
    steam: "#e7eefc", steamShade: "#d5e2ff",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const { height = meta.height, night = false, steam = true } = opts;
  const root = new THREE.Group();
  root.name = "oden-yatai";
  const cart = new THREE.Group(); // the uniform size scale lives here
  cart.name = "body";
  cart.scale.setScalar(height / meta.height);
  root.add(cart);
  const joints = {};
  const D = Math.PI / 180;

  // ---------- soups: primitives placed by a matrix, merged per material ----------
  const soups = {};
  const M4 = () => new THREE.Matrix4();
  function put(key, geo, m) {
    const g = (geo.index ? geo.toNonIndexed() : geo).applyMatrix4(m);
    const s = (soups[key] ??= { p: [], n: [] });
    s.p.push(...g.attributes.position.array);
    s.n.push(...g.attributes.normal.array);
    geo.dispose();
  }
  const at = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
    M4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  const box = (key, x0, x1, y0, y1, z0, z1) =>
    put(key, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), at((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
  // a box beam of cross-section w x h from a to b (the h axis kept near world up)
  function beam(key, a, b, w, h) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const len = A.distanceTo(B);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    put(key, new THREE.BoxGeometry(w, len, h), M4().compose(A.add(B).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  }
  // a round rod of radius r from a to b
  function rod(key, a, b, r, seg = 6) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const len = A.distanceTo(B);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    put(key, new THREE.CylinderGeometry(r, r, len, seg), M4().compose(A.add(B).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  }

  // ---------- body ----------
  const BX = 1.0, BZ = 0.55, BY0 = 0.28, BY1 = 0.96;
  box("wood", -BX, BX, BY0, BY1, -BZ, BZ);
  // customer face: skirt rail, top rail, plank lines (dark bands 6 mm proud)
  box("dark", -BX, BX, BY0, BY0 + 0.05, BZ, BZ + 0.012);
  box("dark", -BX, BX, BY1 - 0.04, BY1 - 0.01, BZ, BZ + 0.012);
  for (const x of [-0.6, -0.2, 0.2, 0.6]) box("dark", x - 0.008, x + 0.008, BY0 + 0.05, BY1 - 0.04, BZ, BZ + 0.008);
  // ends: a frame band around each short face
  for (const s of [-1, 1]) {
    box("dark", s * BX - (s < 0 ? 0.012 : 0), s * BX + (s > 0 ? 0.012 : 0), BY1 - 0.04, BY1 - 0.01, -BZ, BZ);
    box("dark", s * BX - (s < 0 ? 0.012 : 0), s * BX + (s > 0 ? 0.012 : 0), BY0, BY0 + 0.05, -BZ, BZ);
  }
  // work top (counter material) and the customer ledge on brackets
  box("counter", -BX - 0.02, BX + 0.02, BY1, BY1 + 0.025, -BZ - 0.02, BZ);
  box("counter", -BX - 0.05, BX + 0.05, BY1, BY1 + 0.045, BZ, BZ + 0.31);
  for (const x of [-0.85, 0, 0.85]) beam("wood", [x, BY1 - 0.2, BZ], [x, BY1 - 0.005, BZ + 0.26], 0.035, 0.035);
  // push handles out of the back, with dark grips
  for (const x of [-0.75, 0.75]) {
    box("wood", x - 0.03, x + 0.03, 0.7, 0.76, -BZ - 0.45, -BZ);
    box("dark", x - 0.035, x + 0.035, 0.695, 0.765, -BZ - 0.45, -BZ - 0.3);
  }

  // ---------- wheels (discs facing +-X) ----------
  const WR = 0.405, WX = BX + 0.075;
  for (const s of [-1, 1]) {
    const x = s * WX;
    put("dark", new THREE.TorusGeometry(WR - 0.022, 0.022, 6, 28), at(x, WR, 0, 0, 90 * D));
    put("wood", new THREE.TorusGeometry(WR - 0.065, 0.03, 6, 28), at(x, WR, 0, 0, 90 * D, 0, 1, 1, 1.25));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 22.5 * D;
      const r0 = 0.05, r1 = WR - 0.075;
      beam("wood", [x, WR + Math.sin(a) * r0, Math.cos(a) * r0], [x, WR + Math.sin(a) * r1, Math.cos(a) * r1], 0.035, 0.028);
    }
    put("dark", new THREE.CylinderGeometry(0.075, 0.075, 0.1, 12), at(x, WR, 0, 0, 0, 90 * D));
    put("dark", new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8), at(x - s * 0.05, WR, 0, 0, 0, 90 * D)); // axle stub
  }

  // ---------- oden pot ----------
  const P = { x0: -0.7, x1: 0.1, z0: -0.3, z1: 0.26, y0: 0.97, rim: 1.24, broth: 1.2 };
  const wt = 0.025;
  box("metal", P.x0, P.x1, P.rim - 0.01, P.rim, P.z1 - wt, P.z1); // walls: thin boxes, the top flange a bit wider
  box("metal", P.x0, P.x1, P.y0, P.rim, P.z1 - wt, P.z1);
  box("metal", P.x0, P.x1, P.y0, P.rim, P.z0, P.z0 + wt);
  box("metal", P.x0, P.x0 + wt, P.y0, P.rim, P.z0, P.z1);
  box("metal", P.x1 - wt, P.x1, P.y0, P.rim, P.z0, P.z1);
  box("metal", P.x0 - 0.02, P.x1 + 0.02, P.rim - 0.012, P.rim + 0.008, P.z1 - 0.005, P.z1 + 0.02); // front lip
  box("broth", P.x0 + wt, P.x1 - wt, P.y0, P.broth, P.z0 + wt, P.z1 - wt);
  const cx = [P.x0, P.x0 + (P.x1 - P.x0) / 3, P.x0 + (2 * (P.x1 - P.x0)) / 3, P.x1];
  const zm = (P.z0 + P.z1) / 2;
  for (const x of [cx[1], cx[2]]) box("metal", x - 0.006, x + 0.006, P.broth - 0.02, P.rim - 0.008, P.z0, P.z1);
  box("metal", P.x0, P.x1, P.broth - 0.02, P.rim - 0.008, zm - 0.006, zm + 0.006);
  const mid = (i) => (cx[i] + cx[i + 1]) / 2;
  const zF = (zm + P.z1) / 2, zB = (P.z0 + zm) / 2;
  // daikon discs: thick cylinders tilted toward the customer (front-left and back-middle compartments)
  for (const [x, z, t, ry] of [[mid(0) - 0.055, zF - 0.01, 52, 10], [mid(0) + 0.06, zF - 0.03, 44, -20], [mid(1) + 0.02, zB + 0.01, 48, 15]])
    put("white", new THREE.CylinderGeometry(0.068, 0.068, 0.05, 14), at(x, P.broth + 0.035, z, t * D, ry * D, 0));
  // eggs: brown squashed spheres (front-middle)
  for (const [x, z] of [[mid(1) - 0.05, zF], [mid(1) + 0.055, zF + 0.01], [mid(1), zF - 0.06]])
    put("wood", new THREE.SphereGeometry(0.042, 12, 8), at(x, P.broth + 0.022, z, 20 * D, 0, 0, 1, 1.25, 1));
  // konjac triangles: dark wedges standing tilted (front-right)
  // (a 3-sided prism with its axis along z, so a triangle faces the customer, point up, leaning back)
  for (const [x, z, ry] of [[mid(2) - 0.05, zF + 0.01, -12], [mid(2) + 0.05, zF - 0.03, 18], [mid(0), zB, 5]])
    put("dark", new THREE.CylinderGeometry(0.055, 0.055, 0.026, 3).rotateX(90 * D), at(x, P.broth + 0.045, z, -28 * D, ry * D, 0));
  // skewers leaning out of the back-right compartment: sticks with round knots (tsukune) and a konjac knot
  for (const [x, z, lean, side, knot] of [[mid(2) - 0.04, zB, 22, -8, "wood"], [mid(2) + 0.04, zB - 0.02, 28, 12, "wood"], [mid(1) - 0.06, zB - 0.02, 18, -14, "dark"]]) {
    const a = [x, P.broth - 0.04, z];
    const dir = new THREE.Vector3(Math.sin(side * D) * Math.sin(lean * D) * 2.5, Math.cos(lean * D), Math.sin(lean * D)).normalize();
    const b = [x + dir.x * 0.34, P.broth - 0.04 + dir.y * 0.34, z + dir.z * 0.34];
    rod("metal", a, b, 0.006, 5);
    for (const u of [0.25, 0.43, 0.61]) {
      const p = [x + dir.x * 0.34 * u, P.broth - 0.04 + dir.y * 0.34 * u, z + dir.z * 0.34 * u];
      put(knot, new THREE.SphereGeometry(0.033, 10, 7), at(...p));
    }
  }

  // ---------- posts and roof ----------
  const EY = 1.98, RY = 2.13, RX = 1.18, RZ = 0.82;
  for (const x of [-0.97, 0.97]) for (const z of [-0.52, 0.52]) box("wood", x - 0.03, x + 0.03, BY1, EY, z - 0.03, z + 0.03);
  for (const z of [-0.52, 0.52]) box("wood", -0.97, 0.97, EY - 0.08, EY - 0.02, z - 0.035, z + 0.035); // eave beams
  const slope = Math.atan2(RY - EY, RZ);
  const half = Math.hypot(RY - EY, RZ);
  for (const s of [-1, 1]) {
    // each slope a board from the ridge down to the eave, 4 cm thick
    put("wood", new THREE.BoxGeometry(2 * RX, 0.04, half + 0.02), at(0, (EY + RY) / 2, (s * RZ) / 2, s * slope, 0, 0));
    // fascia under the eave
    box("wood", -RX, RX, EY - 0.07, EY - 0.005, s * RZ - 0.02, s * RZ + 0.02);
  }
  beam("dark", [-RX - 0.02, RY + 0.02, 0], [RX + 0.02, RY + 0.02, 0], 0.08, 0.06); // ridge cap (dark), top 2.19
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) // barge boards
    beam("dark", [sx * (RX + 0.012), RY + 0.005, 0], [sx * (RX + 0.012), EY - 0.03, sz * (RZ + 0.02)], 0.024, 0.06);

  // ---------- noren: five short split panels on a rod under the front eave ----------
  const NZ = RZ - 0.06, NT = 1.94, NB = 1.58;
  rod("wood", [-RX + 0.04, NT + 0.015, NZ], [RX - 0.04, NT + 0.015, NZ], 0.012, 6);
  const nW = (2 * RX - 0.12) / 5;
  for (let i = 0; i < 5; i++) {
    const x = -RX + 0.06 + nW * (i + 0.5);
    put("dark", new THREE.BoxGeometry(nW - 0.03, NT - NB, 0.012), at(x, (NT + NB) / 2, NZ, (i % 2 ? -3 : 3) * D, 0, 0));
  }

  // ---------- lantern at the front +X corner ----------
  const LX = RX - 0.02, LZ = RZ + 0.04, LC = 1.66, LH = 0.22, LR = 0.16;
  rod("dark", [LX, EY - 0.04, LZ], [LX, LC + LH + 0.03, LZ], 0.005, 4); // cord
  const prof = [];
  for (let i = 0; i <= 12; i++) {
    const t = -1 + (2 * i) / 12;
    prof.push(new THREE.Vector2(Math.max(0.055, LR * Math.sqrt(1 - t * t * 0.92)), LC + t * LH));
  }
  put("lantern", new THREE.LatheGeometry(prof, 18), at(0, 0, 0)); // y in the profile is absolute
  // shift the lathe (built around the y axis) to the corner: rebuild by matrix
  soups.lantern.p = soups.lantern.p.map((v, i) => (i % 3 === 0 ? v + LX : i % 3 === 2 ? v + LZ : v));
  for (const s of [-1, 1]) put("dark", new THREE.CylinderGeometry(0.07, 0.07, 0.035, 14), at(LX, LC + s * (LH + 0.005), LZ));
  for (const t of [-0.72, -0.36, 0, 0.36, 0.72]) {
    const r = Math.max(0.055, LR * Math.sqrt(1 - t * t * 0.92)) + 0.002;
    put("rib", new THREE.TorusGeometry(r, 0.0045, 4, 24), at(LX, LC + t * LH, LZ, 90 * D));
  }

  // ---------- bulb under the ridge ----------
  rod("dark", [0.2, RY - 0.02, 0.1], [0.2, 1.84, 0.1], 0.005, 4);
  put("bulb", new THREE.SphereGeometry(0.045, 12, 8), at(0.2, 1.8, 0.1));

  // ---------- sake bottle and cups on the ledge ----------
  const ly = BY1 + 0.045;
  const tok = [[0, 0], [0.042, 0], [0.05, 0.03], [0.052, 0.07], [0.04, 0.11], [0.018, 0.15], [0.016, 0.18], [0.024, 0.195], [0, 0.198]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  put("white", new THREE.LatheGeometry(tok, 14), at(0.72, ly, BZ + 0.17));
  for (const [x, z] of [[0.84, BZ + 0.2], [0.5, BZ + 0.16]])
    put("white", new THREE.CylinderGeometry(0.03, 0.022, 0.04, 12), at(x, ly + 0.02, z));

  // ---------- stools ----------
  const SZ = 1.2, SH = 0.48;
  for (const x of [-0.66, 0, 0.66]) {
    put("wood", new THREE.CylinderGeometry(0.16, 0.16, 0.045, 16), at(x, SH - 0.0225, SZ));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 45 * D;
      beam("wood", [x + Math.cos(a) * 0.095, SH - 0.04, SZ + Math.sin(a) * 0.095], [x + Math.cos(a) * 0.135, 0.002, SZ + Math.sin(a) * 0.135], 0.032, 0.032);
    }
    put("dark", new THREE.TorusGeometry(0.115, 0.01, 4, 16), at(x, 0.17, SZ, 90 * D)); // stretcher ring
  }

  // ---------- steam ----------
  if (steam) {
    for (const [x, z, ph, h] of [[mid(0), zF, 0, 0.42], [mid(1) + 0.02, zm, 1.6, 0.5], [mid(2), zF, 3.1, 0.38]]) {
      const pts = [];
      for (let i = 0; i <= 8; i++) {
        const u = i / 8;
        pts.push(new THREE.Vector3(x + Math.sin(ph + u * 5.5) * 0.05 * (0.4 + u), P.rim + 0.06 + u * h, z + Math.cos(ph + u * 4) * 0.03 * u));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const g = new THREE.TubeGeometry(curve, 24, 1, 6, false);
      // taper: shrink each ring toward the curve, thick in the middle, thin at both ends
      const pos = g.attributes.position;
      const pt = new THREE.Vector3();
      for (let i = 0; i <= 24; i++) {
        const u = i / 24, r = 0.034 * Math.sin(Math.PI * Math.min(1, u * 1.15 + 0.08)) + 0.004;
        curve.getPointAt(u, pt);
        for (let j = 0; j <= 6; j++) {
          const k = i * 7 + j;
          pos.setXYZ(k, pt.x + (pos.getX(k) - pt.x) * r, pt.y + (pos.getY(k) - pt.y) * r, pt.z + (pos.getZ(k) - pt.z) * r);
        }
      }
      put("steam", g, M4());
    }
  }

  // ---------- meshes ----------
  const MAT = {
    wood: [c.wood, c.woodShade, 0.1, true],
    dark: [c.dark, c.darkShade, 0.1, true],
    metal: [c.metal, c.metalShade, 0.1, true],
    broth: [c.broth, c.brothShade, 0.1, true],
    white: [c.white, c.whiteShade, 0.1, true],
    counter: night ? [c.glow, c.wood, 0.1, true] : [c.wood, c.woodShade, 0.1, true],
    lantern: night ? [c.glow, c.lantern, 0.3, true] : [c.lantern, c.lanternShade, 0.1, true],
    rib: night ? [c.lantern, c.lantern, 0.1, false] : [c.dark, c.dark, 0.1, false],
    bulb: night ? [c.glow, c.glow, 0.1, true] : [c.metal, c.metalShade, 0.1, true],
    steam: [c.steam, c.steamShade, -0.25, false],
  };
  for (const [key, s] of Object.entries(soups)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    const mesh = kit.toon(g, base, shade, { threshold, outline });
    mesh.name = key;
    cart.add(mesh);
  }

  // marker joints (no geometry under them) for close-ups: --focus pot | lantern | wheel
  for (const [name, x, y, z] of [["pot", (P.x0 + P.x1) / 2, P.rim, zm], ["lantern", LX, LC, LZ], ["wheel", WX, WR, 0]]) {
    const j = new THREE.Group();
    j.name = name;
    j.position.set(x, y, z);
    cart.add(j);
    joints[name] = j;
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`oden-yatai: unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
