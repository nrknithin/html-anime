// kiriko.js - a Noto-style kiriko: a giant festival lantern float, ~8 m tall, resting on two trestles in a short
// stretch of night street with a stone curb and two standing chochin on poles.
// Contract: harness/lab/README.md. Meters, +Y up, the float's front (the painted sun-and-waves face) faces +Z, its
// left is +X, stands on y = 0 (the street slab), centred on x = 0, z = 0.
//
// Construction (three.js primitives and a few custom grids, transformed in place and merged per material; the lab
// sees 14 meshes):
//   TOWER    the key read: one tall paper box (1.8 x 5.0 x 1.3 m), glowing (pale gold on the lit flank, amber on the
//            front and the rest), framed by lacquer corner posts and a bottom and top rail. Its faces carry bold paint
//            as flat decals laid 6-10 mm proud with no hull (they separate by colour): front and back a pink sun disc
//            in a dark brush ring (enso) over three dark curling wave crests and a long wave stroke, pink spray dots;
//            each side a big pink curling crest over a dark one. No lettering (skill rule 15).
//   HEAD     a lacquer head block with a gold band and a wider bracket course under the eaves.
//   ROOF     a small rectangular pyramid with a concave profile (y = apex - H r (2 - r)) whose eave lifts toward the
//            corners (k |t|^3 r^4), a gold fascia band, a dark soffit, gold hip ridges curling up at the tips and a
//            gold finial stack with a bead on top.
//   TASSELS  at each eave corner a big pink tassel on a cord, ~0.9 m long; they swing in the sway clip.
//   LANTERNS four small pink chochin hung from lacquer arms at the tower's bottom corners; they swing too.
//   BASE     a lacquer plinth box with gold bands, a deck with a gold edge, a low railing (lacquer posts, gold rails),
//            and a lacquer plinth under the tower.
//   POLES    two long carrying poles along Z beside the base (6.4 m) and two shoulder beams across them front and
//            back (3.2 m), pale wood with gold end caps.
//   STREET   (static, outside the carried group) a dark road slab, a stone curb and a raised sidewalk behind; two
//            trestles under the poles; two standing chochin (pale gold, glowing) on wooden
//            poles in stone feet, both on the float's lit (+X) side of the sidewalk so the hero view sees them.
//   Moving parts: the carried group turns as one (a group rotation, no per-piece meshes); tassels and corner lanterns
//   swing by rewriting their vertices about each pivot (three merged meshes: tassel, lantern paper, lantern caps).
//   Winding: every custom grid and decal is flipped from its own outward reference; three.js primitives come wound out.
// Proportions (real size, base unit tower width W = 1.8 m): poles bottom 0.55, base 0.55-1.05, deck 1.05-1.15,
//   tower 1.40-6.40 (2.8 W tall, 0.72 W deep), head 6.40-6.95, eave 6.95 (half 1.30 x 1.00), apex 7.60, finial top
//   8.00 = meta.height. Tassels 0.95 m; corner lanterns 0.45 m; standing chochin top at 3.05 m; road 8 x 6.4 m.
// Options: build(THREE, kit, colors, { height }) scales the whole set uniformly (height = top of the finial at rest;
//   default 8.0 m), as the torii's does.
// Clip (build() returns clips { sway: 2 }; pose("sway@0.5")): the float is lifted 0.1 m off the trestles and rocks
//   +-2.5 deg side to side about the poles (one rock each way per loop) with a small bob on every step and a slight
//   pitch; tassels and lanterns swing against the roll with a lag, the tassels wider. The trestles and street stay.
// Colours (festival script), base / shade:
//   paper          moon #ffd7a1 / practical #ffb020 at 0.5: the lit +X flank pale, the front and the rest amber
//   paint          accent #ff4d6d (pink) and sky #24143a (dark), flat, no hull
//   lacquer        sky #24143a / hair #1a1020 (hair is lighter than ink #140c1c)
//   gold           moon #ffd7a1 / practical #ffb020 at 0.55
//   wood, stone    iris #ffd0a1 / skin #f0c2ae
//   tassels        accent #ff4d6d / sky #24143a at -0.35, so only faces turned well away go dark
//   chochin paper  accent (float corners, flat glow) and moon / practical (standing ones, flat glow)
//   street         sky #24143a / hair #1a1020

export const meta = {
  name: "kiriko",
  height: 8.0,
  script: "festival",
  colors: {
    paper: "#ffd7a1", paperShade: "#ffb020",
    pink: "#ff4d6d", dark: "#24143a",
    lacquer: "#24143a", lacquerShade: "#1a1020",
    gold: "#ffd7a1", goldShade: "#ffb020",
    wood: "#ffd0a1", woodShade: "#f0c2ae",
    tassel: "#ff4d6d", tasselShade: "#24143a",
    lamp: "#ff4d6d", standLamp: "#ffd7a1", standLampShade: "#ffb020",
    street: "#24143a", streetShade: "#1a1020",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const { height = meta.height } = opts;
  const root = new THREE.Group();
  root.name = "kiriko";
  const scaleG = new THREE.Group();
  scaleG.name = "scale";
  scaleG.scale.setScalar(height / meta.height);
  root.add(scaleG);
  const REST = 0.55, PH = 0.22, PIV = REST + PH / 2; // carried group pivots at the poles' centre
  const carry = new THREE.Group();
  carry.name = "carry";
  carry.position.y = PIV;
  scaleG.add(carry);
  const body = new THREE.Group(); // carried content in absolute coordinates
  body.position.y = -PIV;
  carry.add(body);
  const still = new THREE.Group(); // street, trestles, standing lanterns
  still.name = "street";
  scaleG.add(still);
  const joints = { carry };

  // ---------- soups: positions + normals (+ swing tag) per material ----------
  const soups = {};
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E3 = new THREE.Euler(), V = new THREE.Vector3(), Sc = new THREE.Vector3();
  function add(key, geo, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1], tag = -1) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!g.attributes.normal) g.computeVertexNormals();
    M4.compose(V.set(...pos), Q.setFromEuler(E3.set(...rot)), Sc.set(...scl));
    g.applyMatrix4(M4);
    const s = (soups[key] ??= { p: [], n: [], tag: [] });
    const P = g.attributes.position, N = g.attributes.normal;
    for (let i = 0; i < P.count; i++) {
      s.p.push(P.getX(i), P.getY(i), P.getZ(i));
      s.n.push(N.getX(i), N.getY(i), N.getZ(i));
      s.tag.push(tag);
    }
  }
  const box = (key, cx, cy, cz, sx, sy, sz, tag) => add(key, new THREE.BoxGeometry(sx, sy, sz), [cx, cy, cz], [0, 0, 0], [1, 1, 1], tag);
  const yb = (key, hx, hz, y0, y1) => box(key, 0, (y0 + y1) / 2, 0, 2 * hx, y1 - y0, 2 * hz);
  const lathe = (key, pts, pos, seg = 12, tag) => add(key, new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), pos, [0, 0, 0], [1, 1, 1], tag);
  const tube = (key, pts, r, seg = 24) => add(key, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, 6, false));
  const ball = (key, r, pos, tag) => add(key, new THREE.SphereGeometry(r, 10, 7), pos, [0, 0, 0], [1, 1, 1], tag);
  function grid(key, f, nu, nv, ref) {
    const pos = [], idx = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) pos.push(...f(i / nu, j / nv));
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < nu; i++) {
        const a = j * (nu + 1) + i, b = a + 1, d = a + nu + 1, e = d + 1;
        idx.push(a, b, e, a, e, d);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    const k = (Math.floor(nv / 2) * nu + Math.floor(nu / 2)) * 6;
    const A = new THREE.Vector3().fromArray(pos, idx[k] * 3), B = new THREE.Vector3().fromArray(pos, idx[k + 1] * 3), C = new THREE.Vector3().fromArray(pos, idx[k + 2] * 3);
    const n = B.clone().sub(A).cross(C.clone().sub(A));
    if (n.dot(A.clone().sub(new THREE.Vector3(...ref))) < 0) for (let t = 0; t < idx.length; t += 3) [idx[t + 1], idx[t + 2]] = [idx[t + 2], idx[t + 1]];
    g.setIndex(idx);
    g.computeVertexNormals();
    add(key, g);
  }

  // ---------- poles and shoulder beams ----------
  const PX = 0.95, PL = 6.4, PW = 0.18, PY = REST + PH / 2;
  const XZ = 2.9, XL = 3.2, XW = 0.16, XH = 0.18, XY = REST + PH + XH / 2;
  for (const sx of [-1, 1]) {
    box("wood", sx * PX, PY, 0, PW, PH, PL);
    for (const sz of [-1, 1]) box("gold", sx * PX, PY, sz * (PL / 2 - 0.07), PW + 0.03, PH + 0.03, 0.14);
  }
  for (const sz of [-1, 1]) {
    box("wood", 0, XY, sz * XZ, XL, XH, XW);
    for (const sx of [-1, 1]) box("gold", sx * (XL / 2 - 0.07), XY, sz * XZ, 0.14, XH + 0.03, XW + 0.03);
  }

  // ---------- base, deck, railing ----------
  yb("lacquer", 0.82, 1.0, REST, 1.05);
  yb("gold", 0.835, 1.015, REST + 0.02, REST + 0.07);
  yb("gold", 0.835, 1.015, 0.96, 1.0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box("gold", sx * 0.82, 0.8, sz * 1.0, 0.07, 0.5, 0.07);
  yb("lacquer", 1.1, 1.25, 1.05, 1.15);
  yb("gold", 1.115, 1.265, 1.08, 1.12);
  const RX = 1.04, RZ = 1.19, RT = 1.48;
  for (let i = 0; i <= 6; i++) {
    const u = -1 + (2 * i) / 6;
    for (const [x, z] of [[u * RX, RZ], [u * RX, -RZ], [RX, u * RZ], [-RX, u * RZ]]) box("lacquer", x, (1.15 + RT) / 2, z, 0.06, RT - 1.15, 0.06);
  }
  for (const s of [-1, 1]) {
    box("gold", 0, RT, s * RZ, 2 * RX + 0.08, 0.05, 0.07);
    box("gold", s * RX, RT, 0, 0.07, 0.05, 2 * RZ + 0.08);
  }
  yb("lacquer", 0.99, 0.74, 1.15, 1.42);

  // ---------- tower: paper box, frame ----------
  const TW = 0.9, TD = 0.65, T0 = 1.4, T1 = 6.4;
  yb("paper", TW, TD, T0, T1);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box("frame", sx * TW, (T0 + T1) / 2, sz * TD, 0.2, T1 - T0, 0.2);
  yb("frame", TW + 0.03, TD + 0.03, T0, T0 + 0.2);
  yb("frame", TW + 0.03, TD + 0.03, T1 - 0.2, T1);

  // ---------- paint decals on the paper ----------
  // face(u, v, o) -> world; u runs to the viewer's right on that face, v is world y, o the offset out of the paper
  const FACES = {
    front: { f: (u, v, o) => [u, v, TD + o], n: [0, 0, 1] },
    back: { f: (u, v, o) => [-u, v, -TD - o], n: [0, 0, -1] },
    left: { f: (u, v, o) => [TW + o, v, -u], n: [1, 0, 0] },
    right: { f: (u, v, o) => [-TW - o, v, u], n: [-1, 0, 0] },
  };
  const tA = new THREE.Vector3(), tB = new THREE.Vector3(), tC = new THREE.Vector3();
  function paintTris(key, face, tris, o) {
    const { f, n } = FACES[face];
    const s = (soups[key] ??= { p: [], n: [], tag: [] });
    for (const [a, b, d] of tris) {
      let A = f(a[0], a[1], o), B = f(b[0], b[1], o), C = f(d[0], d[1], o);
      tA.fromArray(B).sub(tB.fromArray(A));
      tC.fromArray(C).sub(tB);
      if (tA.cross(tC).dot(tB.fromArray(n)) < 0) [B, C] = [C, B];
      for (const p of [A, B, C]) { s.p.push(...p); s.n.push(...n); s.tag.push(-1); }
    }
  }
  // a brush stroke along a centreline: half-width w(s), s = 0..1 along the points
  function stroke(key, face, pts, w, o) {
    const L = [], R = [], k = pts.length - 1;
    pts.forEach((p, i) => {
      const q = pts[Math.min(i + 1, k)], r = pts[Math.max(i - 1, 0)];
      const du = q[0] - r[0], dv = q[1] - r[1], l = Math.hypot(du, dv) || 1, h = w(i / k);
      L.push([p[0] - (dv / l) * h, p[1] + (du / l) * h]);
      R.push([p[0] + (dv / l) * h, p[1] - (du / l) * h]);
    });
    const tris = [];
    for (let i = 0; i < k; i++) tris.push([L[i], R[i], R[i + 1]], [L[i], R[i + 1], L[i + 1]]);
    paintTris(key, face, tris, o);
  }
  function disc(key, face, cu, cv, r, o, seg = 28) {
    const tris = [];
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * 2 * Math.PI, b = ((i + 1) / seg) * 2 * Math.PI;
      tris.push([[cu, cv], [cu + r * Math.cos(a), cv + r * Math.sin(a)], [cu + r * Math.cos(b), cv + r * Math.sin(b)]]);
    }
    paintTris(key, face, tris, o);
  }
  // a curling wave crest: a lead-in from the lower left, then a clockwise spiral into the centre (dir -1 mirrors it)
  function crest(key, face, cu, cv, r, w0, o, dir = 1, lead = 2.3, n = 34) {
    const pts = [];
    for (let i = 0; i <= 6; i++) { const s = i / 6; pts.push([cu + dir * (-lead * r + (lead - 0.9) * r * s), cv - 1.25 * r + 0.75 * r * s * s]); }
    const th0 = 1.12 * Math.PI, th1 = -0.85 * Math.PI;
    for (let i = 1; i <= n; i++) {
      const s = i / n, th = th0 + (th1 - th0) * s, rho = r * (1 - 0.6 * s);
      pts.push([cu + dir * rho * Math.cos(th), cv + rho * Math.sin(th)]);
    }
    stroke(key, face, pts, (s) => w0 * (s < 0.15 ? 0.35 + 0.65 * (s / 0.15) : 1 - 0.7 * ((s - 0.15) / 0.85)), o);
  }
  function enso(key, face, cu, cv, R, w0, o) {
    const pts = [], a0 = 0.62 * Math.PI, a1 = a0 + 1.86 * Math.PI;
    for (let i = 0; i <= 56; i++) { const a = a0 + (a1 - a0) * (i / 56); pts.push([cu + R * Math.cos(a), cv + R * Math.sin(a)]); }
    stroke(key, face, pts, (s) => w0 * (0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, s * 1.15)) ** 0.6) * (s > 0.9 ? 1 - 4 * (s - 0.9) : 1), o);
  }
  for (const face of ["front", "back"]) {
    disc("pink", face, 0, 4.7, 0.5, 0.006);
    enso("dark", face, 0, 4.7, 0.64, 0.085, 0.008);
    // a long rolling wave stroke low on the face
    const wave = [];
    for (let i = 0; i <= 30; i++) { const u = -0.78 + (1.56 * i) / 30; wave.push([u, 1.95 + 0.1 * Math.sin(u * 7.5 + 0.6)]); }
    stroke("dark", face, wave, (s) => 0.09 * (0.5 + 0.5 * Math.sin(Math.PI * s)), 0.008);
    crest("dark", face, -0.3, 2.75, 0.32, 0.11, 0.01, 1, 1.5);
    crest("dark", face, 0.36, 3.05, 0.3, 0.1, 0.01, 1, 1.9);
    for (const [u, v, r] of [[-0.6, 3.15, 0.05], [-0.48, 3.35, 0.035], [0.62, 3.6, 0.045], [0.0, 3.55, 0.035], [0.12, 2.3, 0.04]]) disc("pink", face, u, v, r, 0.012, 12);
  }
  for (const face of ["left", "right"]) {
    crest("pink", face, 0.1, 4.6, 0.4, 0.13, 0.008, 1, 1.6);
    crest("dark", face, -0.08, 2.65, 0.34, 0.11, 0.008, -1, 1.5);
    for (const [u, v, r] of [[-0.35, 5.35, 0.05], [-0.2, 5.6, 0.035], [0.32, 3.4, 0.045]]) disc("pink", face, u, v, r, 0.012, 12);
  }

  // ---------- head and brackets ----------
  yb("lacquer", 1.0, 0.75, T1, 6.72);
  yb("gold", 1.012, 0.762, 6.6, 6.65);
  yb("lacquer", 1.12, 0.86, 6.72, 6.92);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 9; i++) box("gold", -0.96 + i * 0.24, 6.82, s * 0.865, 0.08, 0.08, 0.03);
    for (let i = 0; i < 7; i++) box("gold", s * 1.125, 6.82, -0.72 + i * 0.24, 0.03, 0.08, 0.08);
  }

  // ---------- roof ----------
  const SX = 1.3, SZ = 1.0, E = 6.95, AP = 7.6, H = AP - E, K = 0.14, TH = 0.07, R0 = 0.08;
  const yR = (t, r) => AP - H * r * (2 - r) + K * Math.abs(t) ** 3 * r ** 4;
  const sideMap = [
    (t, r) => [t * SX * r, SZ * r], (t, r) => [-t * SX * r, -SZ * r],
    (t, r) => [SX * r, -t * SZ * r], (t, r) => [-SX * r, t * SZ * r],
  ];
  for (const m of sideMap) {
    grid("lacquer", (i, j) => { const r = R0 + (1 - R0) * j, t = 2 * i - 1, [x, z] = m(t, r); return [x, yR(t, r), z]; }, 16, 10, [0, -5, 0]);
    grid("gold", (i, j) => { const t = 2 * i - 1, [x, z] = m(t, 1); return [x, yR(t, 1) - TH * j, z]; }, 16, 1, [0, E, 0]);
    grid("lacquer", (i, j) => { const r = 1 - 0.3 * j, t = 2 * i - 1, [x, z] = m(t, r); return [x, yR(t, r) - TH, z]; }, 16, 3, [0, 9, 0]);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 8; i++) { const r = 0.12 + (0.86 * i) / 8; pts.push([sx * SX * r, yR(1, r) + 0.035, sz * SZ * r]); }
    const tip = [sx * SX * 1.03, yR(1, 1) + 0.04, sz * SZ * 1.03];
    pts.push(tip, [sx * SX * 1.07, tip[1] + 0.09, sz * SZ * 1.07], [sx * SX * 1.04, tip[1] + 0.16, sz * SZ * 1.04], [sx * SX * 1.0, tip[1] + 0.12, sz * SZ * 1.0]);
    tube("gold", pts, 0.03, 40);
    ball("gold", 0.035, pts[pts.length - 1]);
  }
  lathe("gold", [[0, AP - 0.1], [0.2, AP - 0.1], [0.17, AP], [0.09, AP + 0.04], [0.12, AP + 0.1], [0.06, AP + 0.14], [0.05, AP + 0.2],
    [0.09, AP + 0.22], [0.12, AP + 0.27], [0.11, AP + 0.32], [0.06, AP + 0.37], [0, AP + 0.4]], [0, 0, 0], 14);

  // ---------- swinging hangers: tassels at the eave corners, chochin at the tower's bottom corners ----------
  const pivots = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const tg = pivots.length;
    const p = [sx * SX * 1.0, yR(1, 1) - TH, sz * SZ * 1.0];
    pivots.push(p);
    const at = (dy) => [p[0], p[1] + dy, p[2]];
    add("tassel", new THREE.CylinderGeometry(0.012, 0.012, 0.22, 5), at(-0.11), [0, 0, 0], [1, 1, 1], tg);
    ball("tassel", 0.06, at(-0.25), tg);
    lathe("tassel", [[0, -0.95], [0.11, -0.94], [0.09, -0.7], [0.05, -0.45], [0.04, -0.36], [0.065, -0.33], [0.04, -0.29], [0, -0.28]], at(0), 12, tg);
  }
  const LR = 0.17, LH = 0.2; // corner chochin: radius, half height of the paper
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const tg = pivots.length;
    const d = Math.hypot(TW, TD), ux = TW / d, uz = TD / d, ARM = 0.42;
    const x = sx * (TW + ux * ARM), z = sz * (TD + uz * ARM), y = 2.05;
    add("lacquer", new THREE.BoxGeometry(ARM + 0.08, 0.07, 0.07), [sx * (TW + (ux * ARM) / 2), y + 0.035, sz * (TD + (uz * ARM) / 2)], [0, -Math.atan2(sz * uz, sx * ux), 0]);
    box("lacquer", x, y + 0.035, z, 0.09, 0.09, 0.09);
    pivots.push([x, y, z]);
    const cy = y - 0.12 - LH - 0.04;
    add("hangDark", new THREE.CylinderGeometry(0.01, 0.01, 0.12, 5), [x, y - 0.06, z], [0, 0, 0], [1, 1, 1], tg);
    const prof = [];
    for (let i = 0; i <= 10; i++) { const t = -1 + (2 * i) / 10; prof.push([LR * Math.sqrt(1 - (0.86 * t) ** 2), cy + LH * t]); }
    lathe("hangPaper", [[0, cy - LH], ...prof, [0, cy + LH]], [x, 0, z], 12, tg);
    for (const s of [-1, 1]) add("hangDark", new THREE.CylinderGeometry(0.1, 0.1, 0.06, 12), [x, cy + s * (LH + 0.01), z], [0, 0, 0], [1, 1, 1], tg);
  }

  // ---------- street (static) ----------
  const ZC = -2.45, ZS = -3.9, ZF = 3.6, XS = 4.0;
  box("street", 0, 0.01, (ZC + ZF) / 2, 2 * XS, 0.02, ZF - ZC);
  box("street", 0, 0.075, (ZC - 0.25 + ZS) / 2, 2 * XS, 0.15, ZC - 0.25 - ZS);
  for (let i = 0; i < 8; i++) box("stone", -XS + 0.5 + i, 0.09, ZC - 0.125, 0.97, 0.18, 0.25); // curb stones, hairline gaps
  // trestles under the long poles
  for (const sz of [-1, 1]) {
    const z = sz * 1.55;
    box("stone", 0, REST - 0.05, z, 2.4, 0.1, 0.16);
    for (const sx of [-1, 1]) {
      for (const s2 of [-1, 1]) add("stone", new THREE.BoxGeometry(0.09, 0.5, 0.09), [sx * 0.95, 0.27, z + s2 * 0.09], [-s2 * 0.38, 0, 0]);
      box("stone", sx * 0.95, 0.05, z, 0.12, 0.06, 0.5);
    }
  }
  // standing chochin on poles, on the sidewalk
  for (const x of [1.9, 3.45]) {
    const z = -3.25, cy = 2.62, R = 0.25, HH = 0.36;
    box("stone", x, 0.15 + 0.12, z, 0.3, 0.24, 0.3);
    add("stone", new THREE.CylinderGeometry(0.045, 0.05, cy - 0.3, 8), [x, 0.15 + (cy - 0.3) / 2, z]);
    const prof = [];
    for (let i = 0; i <= 12; i++) { const t = -1 + (2 * i) / 12; prof.push([R * Math.sqrt(1 - (0.84 * t) ** 2), cy + HH * t]); }
    lathe("standLamp", [[0, cy - HH], ...prof, [0, cy + HH]], [x, 0, z], 14);
    for (const s of [-1, 1]) add("standDark", new THREE.CylinderGeometry(0.15, 0.15, 0.08, 14), [x, cy + s * (HH + 0.02), z]);
    add("standDark", new THREE.CylinderGeometry(0.02, 0.05, 0.16, 8), [x, cy + HH + 0.14, z]);
  }

  // ---------- meshes ----------
  const STATIC = new Set(["street", "stone", "standLamp", "standDark"]);
  const MAT = {
    paper: [c.paper, c.paperShade, 0.5, true],
    pink: [c.pink, c.pink, -1, false],
    dark: [c.dark, c.dark, -1, false],
    lacquer: [c.lacquer, c.lacquerShade, 0.35, true],
    frame: [c.lacquer, c.lacquerShade, 0.35, false], // no hull: a hull on posts that cut into the paper box leaves hairlines on the paper; dark on amber needs no ink
    gold: [c.gold, c.goldShade, 0.55, true],
    wood: [c.wood, c.woodShade, 0.2, true],
    tassel: [c.tassel, c.tasselShade, -0.35, true],
    hangPaper: [c.lamp, c.lamp, -1, true],
    hangDark: [c.lacquer, c.lacquerShade, 0.35, true],
    street: [c.street, c.streetShade, 0.35, true],
    stone: [c.wood, c.woodShade, 0.2, true],
    standLamp: [c.standLamp, c.standLampShade, 0.5, true],
    standDark: [c.lacquer, c.lacquerShade, 0.35, true],
  };
  const hang = [];
  for (const [key, s] of Object.entries(soups)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    const mesh = kit.toon(g, base, shade, { threshold, outline });
    mesh.name = key;
    (STATIC.has(key) ? still : body).add(mesh);
    if (s.tag.some((t) => t >= 0)) hang.push({ g, p0: Float32Array.from(s.p), n0: Float32Array.from(s.n), h0: g.attributes.hullNormal ? Float32Array.from(g.attributes.hullNormal.array) : null, tag: s.tag });
  }

  // ---------- poses and clips ----------
  // Signs: carry.rotation.z > 0 rolls the float's top toward -X (its right); rotation.x > 0 dips the front (+Z).
  // Hanger swing (about X and Z through each pivot) is relative to the float, so a free tassel lags opposite the roll.
  const CLIPS = { sway: 2 };
  const D2R = Math.PI / 180;
  const qs = pivots.map(() => new THREE.Quaternion()), rv = new THREE.Vector3();
  function swing(ax, az) {
    qs.forEach((q, i) => { const k = i < 4 ? 1 : 0.6; q.setFromEuler(E3.set(k * ax * D2R, 0, k * az * D2R)); });
    for (const h of hang) {
      const P = h.g.attributes.position.array, N = h.g.attributes.normal.array, HN = h.g.attributes.hullNormal?.array;
      for (let i = 0; i < h.tag.length; i++) {
        const tg = h.tag[i];
        if (tg < 0) continue;
        const pv = pivots[tg], q = qs[tg];
        rv.set(h.p0[3 * i] - pv[0], h.p0[3 * i + 1] - pv[1], h.p0[3 * i + 2] - pv[2]).applyQuaternion(q);
        P[3 * i] = rv.x + pv[0]; P[3 * i + 1] = rv.y + pv[1]; P[3 * i + 2] = rv.z + pv[2];
        rv.fromArray(h.n0, 3 * i).applyQuaternion(q).toArray(N, 3 * i);
        if (HN && h.h0) rv.fromArray(h.h0, 3 * i).applyQuaternion(q).toArray(HN, 3 * i);
      }
      h.g.attributes.position.needsUpdate = true;
      h.g.attributes.normal.needsUpdate = true;
      if (HN) h.g.attributes.hullNormal.needsUpdate = true;
      h.g.computeBoundingBox();
      h.g.computeBoundingSphere();
    }
  }
  function apply({ lift = 0, roll = 0, pitch = 0, sx = 0, sz = 0 }) {
    carry.position.y = PIV + lift;
    carry.rotation.set(pitch * D2R, 0, roll * D2R);
    swing(sx, sz);
    root.updateMatrixWorld(true);
  }
  function sway(t) {
    const T = CLIPS.sway, w = (2 * Math.PI) / T, ph = ((t % T) + T) % T;
    const roll = (x) => 2.5 * Math.sin(w * x);
    const lag = 0.3;
    return {
      lift: 0.1 + 0.03 * Math.abs(Math.sin(w * ph)), roll: roll(ph), pitch: 0.4 * Math.sin(2 * w * ph),
      sz: -3.2 * roll(ph - lag), sx: -2 * Math.sin(2 * w * (ph - lag)),
    };
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`kiriko: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      return apply(sway(+m[2]));
    }
    if (name !== "rest") throw new Error(`kiriko: unknown pose "${name}" (rest, or sway@<seconds>)`);
    apply({});
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
