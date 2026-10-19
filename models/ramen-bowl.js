// ramen-bowl.js - an anime bowl of ramen, the hero-food shot. Static, with an optional looping steam control.
// Contract: harness/lab/README.md. Meters, +Y up, the bowl's front faces +Z, its left is +X, stands on y = 0,
// centred on x = 0, z = 0.
//
// Construction (one lathe for the bowl, primitives and small lofts for the food):
//   BOWL     one LatheGeometry of a closed profile, axis to axis: foot ring, a round belly flaring to a steep wall,
//            a rolled lip, the inner wall 5 mm inside, a flat inner floor. Material groups by triangle centroid colour
//            it from one mesh and one hull: white porcelain, a red lip band (outer wall top + lip), and a navy band
//            with a white ichimatsu checker (2 rows x 12 cells; profile points sit on the band edges so they are crisp).
//   BROTH    a closed lathe disc whose rim follows the inner wall 1 mm proud, so its hull inks the waterline; seven
//            small unlit discs on it are oil droplets.
//   NOODLES  a flattened ellipsoid mound (the noodle mass) with ten wavy 3-sided tubes laid over its surface, all waving
//            in phase so they read as one nest of strands; the tube ends dive under the broth. Strands ink at 3 px so
//            the nest stays gold, not black, at thumbnail size.
//   TOPPINGS the classic layout seen from the front-left three-quarter (the lit side, camera in +X/+Z), heaped above
//            the rim: two nori sheets standing at the back, two chashu slices leaning on them (lathe discs, meat face
//            with a rind ring as a material group and an open curl decal for the rolled belly), a halved soft-boiled egg
//            on the right (half-egg lathe, its cut face turned to the camera, a domed yolk), a narutomaki slice
//            (scalloped disc + a spiral ribbon decal) at the front right, a bundle of menma sticks at the left, and
//            rings of green onion over the noodles (2 px ink).
//   EXTRAS   build(THREE, kit, colors, { chopsticks = false, steam = false }) (lab: --opts '{"steam":true}'):
//            red lacquer chopsticks laid across the right of the rim; three steam wisps (unlit tapering tubes, no ink).
//            steam(phase 0..1) moves the wisps along one seamless loop (each rises 3 cm, sways, swells and shrinks to
//            nothing, a third of a cycle apart), so phase 0 and 1 are the same drawing; call it after pose().
//            pose("steam") shows the wisps at phase 0; pose("rest") hides them unless { steam: true } (the steam then
//            lifts the top to 0.18 m, so the lab's height check warns for that variant only).
// Proportions (real size, base unit the rim diameter D = 0.20 m): bowl 0.090 tall (0.45 D), foot 0.085 across,
//   broth at 0.078 (1.2 cm freeboard), noodle mound peaking at 0.098, nori tops at 0.152 (the model's top),
//   chashu 0.064 x 0.058 x 0.007, egg half 0.049 long, naruto 0.036 across, onion rings 8 mm.
// Colours (indigo, one script): there is no green in any SCRIPT (noon, indigo, eclipse, festival), so the onion
//   reads from shape: small pale rings (sclera / moon) inked on the gold noodles.
//   porcelain sclera #f6f3ee / moon #d5e2ff (blue-white shade);  lip band accent #e23b4a (single tone);
//   pattern band + nori sky #1b2d6b (single tone: the only darker hex is hair, too close to ink);
//   broth iris #e7a04a / accent, oil practical;  noodles practical #f0c36a / iris;  menma iris / accent;
//   chashu meat skin #f0c2ae / iris, rind and curl iris;  egg white sclera / moon, yolk iris / accent;
//   naruto sclera / moon with an accent swirl;  chopsticks accent / sky;  steam line #e7eefc (unlit, no ink).

export const meta = {
  name: "ramen-bowl",
  height: 0.152,
  script: "indigo",
  colors: {
    porcelain: "#f6f3ee", porcelainShade: "#d5e2ff",
    lip: "#e23b4a", lipShade: "#e23b4a",
    band: "#1b2d6b",
    broth: "#e7a04a", brothShade: "#e23b4a",
    noodle: "#f0c36a", noodleShade: "#e7a04a",
    meat: "#f0c2ae", meatShade: "#e7a04a", rind: "#e7a04a",
    eggWhite: "#f6f3ee", eggShade: "#d5e2ff", yolk: "#e7a04a", yolkShade: "#e23b4a",
    menma: "#e7a04a", menmaShade: "#e23b4a",
    swirl: "#e23b4a",
    nori: "#1b2d6b",
    onion: "#f6f3ee", onionShade: "#d5e2ff",
    stick: "#e23b4a", stickShade: "#1b2d6b",
    steam: "#e7eefc",
  },
  poses: ["rest", "steam"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { chopsticks = false, steam: steamOn = false } = opts;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const root = new THREE.Group();
  root.name = "ramen-bowl";
  const joints = {};
  const put = (mesh, name, parent = root) => {
    if (name) mesh.name = name;
    parent.add(mesh);
    return mesh;
  };
  const dirAz = (az, r) => [Math.sin((az * Math.PI) / 180) * r, Math.cos((az * Math.PI) / 180) * r]; // az from +Z toward +X

  // Material groups by triangle centroid (indexed geometry); pairs: [[base, shade, threshold], ...] per group.
  function grouped(g, test, pairs) {
    const p = g.attributes.position, ix = g.index.array, buckets = pairs.map(() => []);
    for (let i = 0; i < ix.length; i += 3) {
      let cx = 0, cy = 0, cz = 0;
      for (let k = 0; k < 3; k++) { cx += p.getX(ix[i + k]) / 3; cy += p.getY(ix[i + k]) / 3; cz += p.getZ(ix[i + k]) / 3; }
      buckets[test(cx, cy, cz)].push(ix[i], ix[i + 1], ix[i + 2]);
    }
    g.setIndex(buckets.flat());
    g.clearGroups();
    let start = 0;
    buckets.forEach((b, k) => { g.addGroup(start, b.length, k); start += b.length; });
    const m = kit.toon(g, pairs[0][0], pairs[0][1], { threshold: pairs[0][2] });
    m.material = pairs.map(([b, s, t]) => kit.cel(b, s, { threshold: t }));
    return m;
  }
  const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

  // Closed tube along points with radius rad(s), s in 0..1; ends capped with fans. Winding from the signed volume.
  function tube(pts, rad, radial = 5) {
    const n = pts.length, pos = [], idx = [];
    let ref = V(0, 1, 0);
    for (let i = 0; i < n; i++) {
      const t = pts[Math.min(i + 1, n - 1)].clone().sub(pts[Math.max(i - 1, 0)]).normalize();
      if (Math.abs(t.dot(ref)) > 0.95) ref = V(1, 0, 0);
      const a = ref.clone().cross(t).normalize(), b = t.clone().cross(a).normalize();
      const r = rad(i / (n - 1));
      for (let k = 0; k < radial; k++) {
        const th = (k / radial) * Math.PI * 2;
        const q = pts[i].clone().addScaledVector(a, Math.cos(th) * r).addScaledVector(b, Math.sin(th) * r);
        pos.push(q.x, q.y, q.z);
      }
    }
    for (let i = 0; i < n - 1; i++)
      for (let k = 0; k < radial; k++) {
        const a0 = i * radial + k, a1 = i * radial + ((k + 1) % radial), b0 = a0 + radial, b1 = a1 + radial;
        idx.push(a0, b0, a1, a1, b0, b1);
      }
    const e0 = pos.length / 3, e1 = e0 + 1;
    pos.push(...pts[0].toArray(), ...pts[n - 1].toArray());
    for (let k = 0; k < radial; k++) {
      const k2 = (k + 1) % radial;
      idx.push(e0, k2, k);
      idx.push(e1, (n - 1) * radial + k, (n - 1) * radial + k2);
    }
    let vol = 0;
    for (let i = 0; i < idx.length; i += 3) {
      const A = V(...pos.slice(idx[i] * 3, idx[i] * 3 + 3)), B = V(...pos.slice(idx[i + 1] * 3, idx[i + 1] * 3 + 3)), C = V(...pos.slice(idx[i + 2] * 3, idx[i + 2] * 3 + 3));
      vol += A.dot(B.cross(C));
    }
    if (vol < 0) for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  // ---------- bowl ----------
  const H = 0.09, RR = 0.1, WALL = 0.005, Y0 = 0.011;
  const rOut = (y) => { // outer wall radius: a round belly flaring into a steep straight-ish wall
    const t = Math.min(1, Math.max(0, (y - Y0) / (H - 0.003 - Y0)));
    return 0.04 + (RR - 0.04) * (1 - Math.pow(1 - t, 2.1));
  };
  const rIn = (y) => rOut(y + 0.0015) - WALL;
  const BAND = [0.05, 0.061, 0.072], LIPY = 0.079, FLOOR = 0.016;
  const outerYs = [Y0, 0.02, 0.034, BAND[0], BAND[1], BAND[2], LIPY, H - 0.003];
  const prof = [[0, 0], [0.039, 0], [0.042, 0.0015], [0.0425, 0.008], [0.04, Y0 - 0.0005]];
  for (const y of outerYs.slice(1)) prof.push([rOut(y), y]);
  prof.push([RR - 0.0005, H - 0.0008], [RR - 0.0035, H], [RR - WALL - 0.0005, H - 0.0025]);
  for (const y of [0.074, 0.05, 0.03]) prof.push([rIn(y), y]);
  prof.push([rIn(FLOOR) * 0.85, FLOOR], [0, FLOOR]);
  const SEG = 36, CELLS = 12;
  const bowlGeo = lathe(prof, SEG);
  const bowl = grouped(bowlGeo, (x, y, z) => {
    const r = Math.hypot(x, z);
    const outer = r > (rOut(y) + rIn(y)) / 2;
    if (y > H - 0.0035) return 1; // the rolled lip
    if (!outer) return 0;
    if (y > LIPY) return 1;
    if (y > BAND[0] && y < BAND[2]) {
      const cell = Math.floor(((Math.atan2(x, z) + Math.PI) / (Math.PI * 2)) * CELLS);
      const row = y < BAND[1] ? 0 : 1;
      return (cell + row) % 2 ? 0 : 2;
    }
    return 0;
  }, [[c.porcelain, c.porcelainShade, -0.15], [c.lip, c.lipShade, -0.2], [c.band, c.band, 0]]);
  put(bowl, "bowl");

  // ---------- broth ----------
  const BY = 0.078;
  put(kit.toon(lathe([[0, BY - 0.006], [rIn(BY - 0.006) + 0.001, BY - 0.006], [rIn(BY) + 0.001, BY], [0, BY]], 24), c.broth, c.brothShade, { threshold: -0.3 }), "broth");

  // oil droplets on the broth: small flat discs, no ink
  [[300, 0.075, 0.004], [330, 0.082, 0.0028], [20, 0.08, 0.0034], [52, 0.084, 0.0024], [170, 0.074, 0.003], [250, 0.08, 0.0026], [282, 0.084, 0.002]].forEach(([az, r, rad], k) => {
    const [x, z] = dirAz(az, r);
    const m = kit.toon(new THREE.CircleGeometry(rad, 8), c.noodle, c.noodle, { outline: false });
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, BY + 0.0005, z);
    put(m, `oil${k}`);
  });

  // ---------- noodles ----------
  // nest frame: u along screen-right of the three4 camera (az 128), v toward the camera (az 38)
  const U = V(Math.sin(2.234), 0, Math.cos(2.234)), W = V(Math.sin(0.663), 0, Math.cos(0.663));
  const NC = V(0, 0, 0).addScaledVector(W, 0.012).addScaledVector(U, -0.004);
  const NA = 0.056, NB = 0.042, NY = 0.072, NH = 0.026;
  const nestY = (u, v) => { const q = 1 - (u / NA) ** 2 - (v / NB) ** 2; return NY + NH * Math.sqrt(Math.max(0, q)); };
  const noodles = new THREE.Group();
  put(noodles, "noodles");
  const mound = kit.toon(new THREE.SphereGeometry(1, 16, 8), c.noodle, c.noodleShade, { threshold: -0.15 });
  mound.scale.set(NA, NH, NB);
  mound.position.set(NC.x, NY, NC.z);
  mound.rotation.y = Math.atan2(U.x, U.z) - Math.PI / 2;
  put(mound, "mound", noodles);
  const STRANDS = 10, NR = 0.0023;
  for (let k = 0; k < STRANDS; k++) {
    const v0 = (k / (STRANDS - 1) - 0.5) * 2 * NB * 0.82;
    const pts = [];
    for (let i = 0; i <= 26; i++) {
      const u = (i / 26 - 0.5) * 2 * NA * 1.04;
      const v = v0 + 0.0024 * Math.sin(u * 270 + k * 0.4);
      const y = nestY(u, v) + NR * 0.9;
      pts.push(NC.clone().addScaledVector(U, u).addScaledVector(W, v).setY(y));
    }
    put(kit.toon(tube(pts, () => NR, 3), c.noodle, c.noodleShade, { threshold: -0.4, px: 3 }), `strand${k}`, noodles);
  }

  // ---------- toppings ----------
  // Place a part: position from (az, r, y), then yaw to face az `face`, then tilt `tilt` degrees about the part's x.
  const place = (m, az, r, y, face, tilt = 0, spin = 0) => {
    const [x, z] = dirAz(az, r);
    m.position.set(x, y, z);
    m.rotation.order = "YXZ";
    m.rotation.set((tilt * Math.PI) / 180, (face * Math.PI) / 180, (spin * Math.PI) / 180);
    return m;
  };

  // nori: two thin sheets standing in the broth at the back, leaning back on the rim
  for (const [az, h, nm] of [[196, 0.088, "noriL"], [234, 0.074, "noriR"]]) {
    const g = new THREE.Group();
    put(kit.toon(new THREE.BoxGeometry(0.056, h, 0.003), c.nori, c.nori), null, g).position.y = h / 2;
    put(place(g, az, 0.072, BY - 0.012, az + 180, -14), nm);
  }

  // chashu: lathe disc, meat faces with a rind ring and edge (material group by radius)
  const CR = 0.031, CT = 0.0035;
  const chashuGeo = () => lathe([[0, -CT], [CR * 0.82, -CT], [CR * 0.98, -CT], [CR, -CT * 0.4], [CR, CT * 0.4], [CR * 0.98, CT], [CR * 0.86, CT], [0, CT]], 16);
  for (const [az, r, y, face, tilt, nm] of [[272, 0.05, 0.1, 70, 64, "chashuL"], [200, 0.046, 0.098, 22, 58, "chashuR"]]) {
    const m = grouped(chashuGeo(), (x, y, z) => (Math.hypot(x, z) > CR * 0.84 ? 1 : 0), [[c.meat, c.meatShade, -0.1], [c.rind, c.rind, 0]]);
    m.scale.set(1.04, 1, 0.94);
    const curl = kit.toon(new THREE.RingGeometry(CR * 0.42, CR * 0.5, 18, 1, 0.4, Math.PI * 1.6), c.rind, c.rind, { outline: false });
    curl.rotation.x = -Math.PI / 2; // RingGeometry faces +Z; lay it on the +Y meat face
    curl.position.y = CT + 0.0005;
    m.add(curl); // the rolled-belly seam: an open curl on the meat face
    put(place(m, az, r, y, face, tilt), nm);
  }

  // egg: half egg lathe (cut face along the long axis), cut face tilted toward the camera; domed yolk on it
  const egg = new THREE.Group();
  const ER = 0.017, EL = 1.45; // radius, long-axis stretch
  const half = [];
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); half.push([Math.sin(a) * ER, Math.cos(a) * ER]); }
  const eggGeo = lathe([[0, 0], ...half.reverse()], 14); // dome on y >= 0, flat face at y = 0 (normal -Y)
  const eggWhite = kit.toon(eggGeo, c.eggWhite, c.eggShade, { threshold: 0.05 });
  eggWhite.rotation.x = Math.PI; // cut face up
  eggWhite.scale.set(1, 1, EL);
  put(eggWhite, "white", egg);
  const yolk = kit.toon(new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), c.yolk, c.yolkShade, { threshold: -0.4, px: 3 });
  yolk.scale.set(ER * 0.66, 0.004, ER * 0.78);
  yolk.position.set(0, 0.0004, -0.002);
  put(yolk, "yolk", egg);
  put(place(egg, 148, 0.042, BY + 0.016, 38, 42), "egg");

  // naruto: scalloped disc with a pink spiral ribbon decal
  const naruto = new THREE.Group();
  const NRAD = 0.018, NTH = 0.0045;
  const nGeo = new THREE.CylinderGeometry(NRAD, NRAD, NTH, 24, 1);
  { const p = nGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
      if (r < 1e-6) continue;
      const s = 1 + 0.07 * Math.cos(12 * Math.atan2(z, x));
      p.setX(i, x * s); p.setZ(i, z * s);
    }
    nGeo.computeVertexNormals(); }
  put(kit.toon(nGeo, c.porcelain, c.porcelainShade, { threshold: -0.1 }), "disc", naruto);
  { const pos = [], N = 70, turns = 2.3, w = 0.0016;
    const at = (s, off) => { const th = s * turns * Math.PI * 2, r = 0.0015 + s * (NRAD * 0.8 - 0.0015) + off; return [Math.cos(th) * r, NTH / 2 + 0.0006, Math.sin(th) * r]; };
    for (let i = 0; i < N; i++) {
      const s0 = i / N, s1 = (i + 1) / N;
      const a = at(s0, -w), b = at(s0, w), d = at(s1, -w), e = at(s1, w);
      pos.push(...a, ...e, ...b, ...a, ...d, ...e);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    put(kit.toon(g, c.swirl, c.swirl, { outline: false }), "swirl", naruto); }
  put(place(naruto, 98, 0.062, BY + 0.012, 50, 48), "naruto");

  // menma: a bundle of four flat sticks lying on the broth at the left
  const menma = new THREE.Group();
  for (let k = 0; k < 4; k++) {
    const m = kit.toon(new THREE.BoxGeometry(0.034 - k * 0.003, 0.0045, 0.0065), c.menma, c.menmaShade, { threshold: -0.5 });
    m.position.set((k % 2) * 0.003, 0.0025 + (k === 3 ? 0.004 : 0), (k - 1.5) * 0.0068);
    m.rotation.y = (k - 1.5) * 0.06;
    put(m, `menma${k}`, menma);
  }
  put(place(menma, 318, 0.056, BY + 0.006, 318 + 90, 12), "menma");

  // green onion: small rings over the noodles and broth
  const onion = new THREE.Group();
  put(onion, "onion");
  const ringGeo = new THREE.TorusGeometry(0.0042, 0.0012, 3, 8);
  const scatter = [[-0.018, 0.004], [-0.004, 0.012], [0.01, -0.006], [0.022, 0.01], [0.004, -0.02], [-0.026, -0.012], [0.03, -0.018], [-0.012, 0.024], [0.016, 0.026], [-0.034, 0.014]];
  scatter.forEach(([u, v], k) => {
    const m = kit.toon(ringGeo, c.onion, c.onionShade, { threshold: -0.2, px: 2 });
    const p = NC.clone().addScaledVector(U, u).addScaledVector(W, v);
    m.position.set(p.x, Math.max(nestY(u, v) + NR * 1.6, BY) + 0.0022, p.z);
    m.rotation.set(Math.PI / 2 + 0.25 * Math.sin(k * 2.1), 0.3 * Math.cos(k * 1.3), 0);
    put(m, `ring${k}`, onion);
  });

  // ---------- chopsticks (optional) ----------
  if (chopsticks) {
    const sticks = new THREE.Group();
    for (const [dx, nm] of [[0, "stickA"], [0.009, "stickB"]]) {
      const m = kit.toon(new THREE.CylinderGeometry(0.0022, 0.0036, 0.235, 6), c.stick, c.stickShade, { threshold: 0.0 });
      m.rotation.x = Math.PI / 2;
      m.position.set(dx, 0, 0);
      put(m, nm, sticks);
    }
    const [sx, sz] = dirAz(128, 0.083);
    sticks.position.set(sx, H + 0.0035, sz);
    sticks.rotation.y = (38 * Math.PI) / 180; // along the chord
    put(sticks, "chopsticks");
  }

  // ---------- steam (optional) ----------
  const steamG = new THREE.Group();
  steamG.name = "steam";
  root.add(steamG);
  const wisps = [];
  for (let k = 0; k < 3; k++) {
    const pts = [];
    for (let i = 0; i <= 16; i++) { const s = i / 16; pts.push(V(0.008 * Math.sin(s * 6.0 + k * 2), s * 0.06, 0.004 * Math.cos(s * 5 + k))); }
    const m = kit.toon(tube(pts, (s) => 0.0045 * Math.sin(Math.PI * s) ** 0.8 + 0.0003, 6), c.steam, c.steam, { outline: false, threshold: -1 });
    const holder = new THREE.Group();
    holder.add(m);
    const [x, z] = dirAz([20, 140, 260][k], 0.03);
    holder.userData.base = [x, z];
    steamG.add(holder);
    wisps.push(holder);
  }
  joints.steam = steamG;
  function steam(phase) { // one seamless loop: each wisp rises 3 cm, sways, swells then shrinks to nothing
    wisps.forEach((w, k) => {
      const f = (((phase + k / 3) % 1) + 1) % 1;
      const s = Math.sin(Math.PI * f);
      w.position.set(w.userData.base[0], H + 0.012 + f * 0.03, w.userData.base[1]);
      w.scale.set(0.05 + 1.1 * s, 0.05 + 1.05 * s, 0.05 + 1.1 * s);
      w.rotation.y = Math.PI * 2 * phase + k * 2.1;
    });
    root.updateMatrixWorld(true);
  }

  function pose(name) {
    if (name !== "rest" && name !== "steam") throw new Error(`unknown pose "${name}" (rest, steam)`);
    steamG.visible = steamOn || name === "steam";
    steam(0);
  }
  pose("rest");
  return { root, joints, pose, steam };
}
