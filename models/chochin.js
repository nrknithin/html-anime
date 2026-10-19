// chochin.js - a Japanese paper lantern (chōchin), the festival / shrine / izakaya kind. One set with models/torii.js.
// Contract: harness/lab/README.md. Meters, +Y up, the crest faces +Z, its left is +X, the bottom cap stands on y = 0,
// centred on x = 0, z = 0. It hangs from the hook ring at the top: that is the pivot (joint "lantern", or "lantern0..n-1"
// in a row), so a film hangs it by placing the ring centre.
//
// Construction (one lathe + primitives, smooth normals):
//   BODY   one LatheGeometry. Its profile is an ellipse clipped at the end rings, r(t) = R sqrt(1 - (k t)^2), t in -1..1,
//          k so r(+-1) = the end radius. The bamboo ribs (hone) sit ON that ellipse; the paper between two ribs bows out
//          by 2 % (a tent with smooth normals), so the outline is scalloped and the cel terminator steps at every rib.
//          The thin rows at each rib are a second material group (dark), under the one hull: the ribs read as lines on
//          the lit side and on the shade side without extra meshes. The body ends 2 cm inside each cap, so the lathe's
//          open ends are hidden.
//   CAPS   black lacquered rings (wa): a short tapered cylinder at each end, a lid disc on top, and the hook ring
//          (a torus, its bottom buried in the lid). Single lantern: the ring faces the camera; in a row it turns 90
//          degrees so the rope threads it.
//   CREST  a painted janome mon (a ring and a centre dot; a stand-in for the kanji, no lettering) on the front and the
//          back: polar grids laid on the paper's outer envelope + 1.5 mm, no hull (it separates by colour). A plain
//          disc read as a hole at the hero angle, where the crest sits near the silhouette; the ring reads as paint.
//          It stands up to ~4 mm off the rib valleys, a hairline at the silhouette in a side view. { crest: false }.
//   ROW    { count: n } hangs n lanterns on a straw rope (a parabola-sag tube, ball ends) spaced { spacing } apart,
//          centred on x = 0, the lowest bottom cap on y = 0. Each lantern keeps its own pivot.
// Proportions (single, base unit body diameter D = 0.35 m): caps 0-0.045 and 0.505-0.55, radius 0.105 (0.6 D);
//   paper 0.025-0.525 (0.5 m, 1.43 D, ends inside the caps), widest at y 0.275; 11 rib spans; lid 0.55-0.562;
//   hook ring centre 0.582, top 0.609. Crest radius 0.08 (0.46 D), ring 0.058-0.085, dot 0.03, at y 0.285. ~2.0k triangles a lantern (paper 1320).
// Options build(THREE, kit, colors, opts): { color: "red" | "white", lit: true, crest: false, count: n, spacing: 0.6,
//   sag: 0.12 (m at the rope centre per metre of half-length), height } (height scales the whole thing uniformly, as
//   the torii's does; it is the single lantern's ring top). sway(t), t in 0..1 one loop, is returned next to pose():
//   every lantern swings +-6 degrees about its hook, each row neighbour a sixth of a cycle later; call it after pose().
//   Poses: rest, sway-a, sway-b (the two extremes, sway(0.25) and sway(0.75)).
// Colours (noon), base / shade, threshold 0.1 for the paper (as the torii's vermilion, so faces square to the camera
//   stay lit and only the -X side and underside go to shade):
//   red paper      accent #c4452d / iris #5c3d32;    its ribs             iris #5c3d32 / hair #241c16
//   white paper    practical #fffaf2 / sky #f2d7ae;  its ribs             sky #f2d7ae / iris #5c3d32
//   crest          hair #241c16 / hair (black paint on either paper; iris would vanish into the red paper's shade)
//   lacquer caps   iris #5c3d32 / hair #241c16 at 0.8, so they read black all round with an iris glint on the lid,
//                  as the torii's sleeves (noon has no near-black above ink; hair sits next to ink here as there)
//   straw rope     sky #f2d7ae / iris #5c3d32 (the shrine's shimenawa)
// { lit: true }: there is no emissive in the kit; a practical is a cel material at a negative threshold (the AE86's
//   lamps, -0.7). The paper and its ribs and crest go to threshold -1, one flat base tone all round, so the lantern
//   reads as lit from inside while the caps stay shaded. A film wanting a warmer glow maps paper to its script's
//   practical (festival #ffb020) through colors; a halo or bloom is the film's job.

export const meta = {
  name: "chochin",
  height: 0.609,
  script: "noon",
  colors: {
    paper: "#c4452d", paperShade: "#5c3d32",
    rib: "#5c3d32", ribShade: "#241c16",
    paperWhite: "#fffaf2", paperWhiteShade: "#f2d7ae",
    ribWhite: "#f2d7ae", ribWhiteShade: "#5c3d32",
    crest: "#241c16", crestShade: "#241c16",
    lacquer: "#5c3d32", lacquerShade: "#241c16",
    rope: "#f2d7ae", ropeShade: "#5c3d32",
  },
  poses: ["rest", "sway-a", "sway-b"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { color = "red", lit = false, crest = true, count = 1, spacing = 0.6, sag = 0.12, height = meta.height } = opts;
  const white = color === "white";
  const root = new THREE.Group();
  root.name = "chochin";
  const all = new THREE.Group(); // uniform size scale lives here, so root stays the plain contract node
  all.name = "all";
  all.scale.setScalar(height / meta.height);
  root.add(all);
  const joints = {};

  const PT = lit ? -1 : 0.1; // paper threshold
  const paperMat = white ? kit.cel(c.paperWhite, c.paperWhiteShade, { threshold: PT }) : kit.cel(c.paper, c.paperShade, { threshold: PT });
  const ribMat = white ? kit.cel(c.ribWhite, c.ribWhiteShade, { threshold: PT }) : kit.cel(c.rib, c.ribShade, { threshold: PT });
  const crestMat = kit.cel(c.crest, c.crestShade, { threshold: PT });
  const black = (g) => kit.toon(g, c.lacquer, c.lacquerShade, { threshold: 0.8 });

  // ---------- one lantern (local frame: bottom on y = 0), returned as a group ----------
  const Y0 = 0.025, Y1 = 0.525, YC = (Y0 + Y1) / 2, HH = (Y1 - Y0) / 2; // paper span
  const R = 0.175, RE = 0.092, K = Math.sqrt(1 - (RE / R) ** 2);
  const SPANS = 11, BULGE = 0.02, RIB = 0.0035; // rib half-width in metres along y
  const env = (t) => R * Math.sqrt(Math.max(0, 1 - (K * t) ** 2));
  const ribY = (j) => Y0 + ((Y1 - Y0) * j) / SPANS;

  function bodyGeometry() {
    const pts = []; // (r, y), bottom to top, so the lathe faces out
    const at = (y, f = 1) => pts.push(new THREE.Vector2(env((y - YC) / HH) * f, y));
    for (let j = 0; j < SPANS; j++) {
      const a = ribY(j), b = ribY(j + 1);
      if (j > 0) at(a + RIB);
      else at(a);
      at((a + b) / 2, 1 + BULGE);
      at(b - RIB);
    }
    at(Y1);
    const g = new THREE.LatheGeometry(pts, 20);
    // material groups by triangle centroid: 1 = rib band (between a - RIB and a + RIB)
    const p = g.attributes.position, ix = g.index.array, buckets = [[], []];
    for (let i = 0; i < ix.length; i += 3) {
      const cy = (p.getY(ix[i]) + p.getY(ix[i + 1]) + p.getY(ix[i + 2])) / 3;
      const s = (cy - Y0) / ((Y1 - Y0) / SPANS), d = Math.abs(s - Math.round(s)) * ((Y1 - Y0) / SPANS);
      buckets[d < RIB * 1.01 ? 1 : 0].push(ix[i], ix[i + 1], ix[i + 2]);
    }
    g.setIndex(buckets.flat());
    g.clearGroups();
    g.addGroup(0, buckets[0].length, 0);
    g.addGroup(buckets[0].length, buckets[1].length, 1);
    // hull normals from the smooth ellipse, not the scallops: the hull shell then runs parallel to the surface and
    // never folds into the rib valleys (with face normals it poked through as ink wedges where ribs face the camera)
    const hn = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), rr = Math.hypot(x, z) || 1, t = (y - YC) / HH;
      const dr = (-R * K * K * t) / Math.sqrt(Math.max(1e-6, 1 - (K * t) ** 2)) / HH; // d env / dy
      const l = Math.hypot(1, dr);
      hn.set([x / rr / l, -dr / l, z / rr / l], i * 3);
    }
    g.setAttribute("hullNormal", new THREE.BufferAttribute(hn, 3));
    return g;
  }

  // a janome crest (ring + centre dot) on the paper's outer envelope, facing +Z: polar grids, centre (0, yc).
  // bands = [[r0, r1], ...]; r0 = 0 is a disc (a fan at the centre).
  function crestGeometry(yc, bands) {
    const NA = 20, pos = [], idx = [];
    for (const [r0, r1] of bands) {
      const nr = Math.max(1, Math.round((r1 - r0) / 0.012)), first = pos.length / 3;
      const ring = (i) => first + (r0 > 0 ? 0 : 1) + (i - (r0 > 0 ? 0 : 1)) * NA; // index of ring i's vertex 0
      if (r0 === 0) pos.push(0, 0, 0);
      for (let i = r0 > 0 ? 0 : 1; i <= nr; i++) for (let k = 0; k < NA; k++) {
        const a = (k / NA) * Math.PI * 2, rr = r0 + ((r1 - r0) * i) / nr;
        pos.push(rr * Math.cos(a), rr * Math.sin(a), 0);
      }
      if (r0 === 0) for (let k = 0; k < NA; k++) idx.push(first, ring(1) + k, ring(1) + ((k + 1) % NA)); // CCW from +Z
      for (let i = r0 > 0 ? 0 : 1; i < nr; i++) for (let k = 0; k < NA; k++) {
        const a = ring(i) + k, b = ring(i) + ((k + 1) % NA), a2 = a + NA, b2 = b + NA;
        idx.push(a, a2, b2, a, b2, b);
      }
    }
    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i], y = pos[i + 1] + yc, r = env((y - YC) / HH) * (1 + BULGE) + 0.0015;
      pos[i + 1] = y;
      pos[i + 2] = Math.sqrt(Math.max(0, r * r - x * x));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  const HC = 0.045, RC = 0.105, YR = 0.582, RR = 0.022, TR = 0.005; // caps, hook ring
  const bodyG = bodyGeometry();
  const crestG = crest ? crestGeometry(YC + 0.01, [[0.058, 0.085], [0, 0.03]]) : null;
  const capBotG = new THREE.CylinderGeometry(RC, RC - 0.006, HC, 20);
  const capTopG = new THREE.CylinderGeometry(RC - 0.006, RC, HC, 20);
  const lidG = new THREE.CylinderGeometry(0.075, 0.08, 0.012, 16);
  const ringG = new THREE.TorusGeometry(RR, TR, 6, 10);

  function lantern(i, threaded) {
    const g = new THREE.Group();
    g.name = `lanternParts${i}`;
    const body = kit.outline(new THREE.Mesh(bodyG, [paperMat, ribMat]));
    body.name = "paper";
    g.add(body);
    if (crestG) for (const ry of [0, Math.PI]) {
      const m = new THREE.Mesh(crestG, crestMat);
      m.name = ry ? "crestBack" : "crest";
      m.rotation.y = ry;
      g.add(m);
    }
    const put = (geo, y, name) => { const m = black(geo); m.position.y = y; m.name = name; g.add(m); return m; };
    put(capBotG, HC / 2, "capBottom");
    put(capTopG, Y1 - 0.02 + HC / 2, "capTop");
    put(lidG, Y1 - 0.02 + HC + 0.006, "lid");
    const ring = put(ringG, YR, "hook");
    if (threaded) ring.rotation.y = Math.PI / 2;
    g.position.y = -YR; // the pivot (hook ring centre) is the group's parent origin
    return g;
  }

  // ---------- one lantern or a row on a rope ----------
  const n = Math.max(1, Math.round(count));
  const half = (n / 2) * spacing, drop = sag * half;
  const xs = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * spacing);
  const ropeY = (x) => drop * (x / half) ** 2; // relative to the rope's lowest point
  const lift = n > 1 ? YR - Math.min(...xs.map(ropeY)) : YR; // lowest ring centre at YR, so the lowest cap is on y = 0
  const pivots = xs.map((x, i) => {
    const pv = new THREE.Group();
    pv.name = n > 1 ? `lantern${i}` : "lantern";
    pv.position.set(x, n > 1 ? lift + ropeY(x) : YR, 0);
    pv.add(lantern(i, n > 1));
    all.add(pv);
    joints[pv.name] = pv;
    return pv;
  });
  if (n > 1) {
    const pts = [];
    for (let k = 0; k <= 16 * n; k++) { const x = -half + (2 * half * k) / (16 * n); pts.push(new THREE.Vector3(x, lift + ropeY(x), 0)); }
    const curve = new THREE.CatmullRomCurve3(pts);
    const straw = (g) => kit.toon(g, c.rope, c.ropeShade, { threshold: 0.1 });
    const rope = straw(new THREE.TubeGeometry(curve, 12 * n, 0.006, 6, false));
    rope.name = "rope";
    all.add(rope);
    for (const s of [-1, 1]) { // close the tube's open ends with knots
      const knot = straw(new THREE.SphereGeometry(0.012, 8, 6));
      knot.position.set(s * half, lift + drop, 0);
      knot.name = s > 0 ? "knotL" : "knotR";
      all.add(knot);
    }
  }

  // ---------- sway ----------
  // Sign convention: +rz swings the bottom toward +X (right-hand rule about +Z at the hook); rx follows a quarter cycle
  // behind at 40 %, so the bottom traces a flat ellipse rather than a line.
  const AMP = (6 * Math.PI) / 180;
  function sway(t) {
    pivots.forEach((pv, i) => {
      const ph = 2 * Math.PI * (t + i / 6);
      pv.rotation.set(0.4 * AMP * Math.cos(ph), 0, AMP * Math.sin(ph));
    });
    root.updateMatrixWorld(true);
  }
  const POSES = { rest: null, "sway-a": 0.25, "sway-b": 0.75 };
  function pose(name) {
    if (!(name in POSES)) throw new Error(`unknown pose "${name}" (${Object.keys(POSES).join(", ")})`);
    for (const pv of pivots) pv.rotation.set(0, 0, 0);
    if (POSES[name] !== null) sway(POSES[name]);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose, sway };
}
