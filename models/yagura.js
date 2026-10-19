// yagura.js - a bon-odori festival tower (yagura): a square timber scaffold with a dancing platform, red-and-white
// kohaku-maku round the lower level, a taiko on its stand up top, and lantern strings radiating from a mast. Static.
// Contract: harness/lab/README.md. Meters, +Y up, the drum's head faces +Z, its left is +X (the stair side), stands on
// y = 0, centred on x = 0, z = 0 (the tower; the lantern strings and their poles spread round it symmetrically).
//
// Construction (THREE primitives placed by matrix and merged per material into one mesh each, normals kept per part:
// boxes flat, the drum barrel, lanterns and ropes smooth; every part closed, winding from three.js, never by hand):
//   FRAME   four corner posts run from the ground to the rail top, tied by a girt under the deck (the maku hangs
//           from it); the posts stand proud of the maku, so the scaffold reads at the corners. The deck is a slab
//           with a 0.1 m overhang. The railing has posts at the corners and mid-side, a top and a mid rail;
//           on the +X side it opens for the stair.
//   MAKU    kohaku-maku per side between the corner posts: six vertical stripes, each two flat panels meeting at a
//           fold 3 cm proud, so every stripe catches the light as a pleat; a thin slab (closed), red and white alternating.
//   STAIR   a steep ladder-stair on +X: two stringers and treads, the bottom on the ground 1.25 m out.
//   TAIKO   a nagado-daiko: lathe barrel (bulging 10 %), two heads proud of its ends, a ring of brass tacks near each
//           end, on a timber cradle stand (two A-frames and a skid). Its axis is turned 26 deg toward +X and tipped up
//           5 deg, so the hero and three-quarter views see the head as a big white disc over the front rail.
//   MAST    a pole from the deck centre (behind the drum) with a ball finial; the strings leave from just under it.
//   STRINGS { strings: n } ropes from the mast to short poles at radius R, each a parabola-sag tube that drops to the
//           2.1 m tie; lanterns (8-sided lathe, black caps) hang from it every 0.7 m outside the tower, red and white
//           alternating.
// Proportions (real size, base unit the deck height P = 2.5 m): footprint 3.8 m at the post centres (4.0 outside the
//   posts, 4.2 at the deck), deck top 2.5 (P), rail top 3.35, maku 0.12-2.26, drum head 0.92 m diameter, centre 3.68,
//   mast top 4.5 (1.8 P), string tie 4.42 -> pole tie 2.1 at R = 7.5 m (poles 2.25 tall), lantern 0.26 x 0.36 m.
// Options build(THREE, kit, colors, { height, strings, night }): height scales the whole set uniformly (the mast top,
//   as the torii's does); strings = number of lantern strings (default 8; four run to the corners, more are offset half a
//   step so none points straight at the hero camera); night = true lights the lanterns: the paper goes to threshold -1, flat practical tones all round
//   (red -> accent, white -> practical #ffb020), as the chochin's { lit }; a glow is the film's job.
// Colours (festival, the matsuri set), base / shade:
//   timber      moon #ffd7a1 / skin #f0c2ae at 0.2 (fresh cedar; posts, deck, rails, stair, stand, mast, poles)
//   maku red    accent #ff4d6d / sky #24143a at 0.1 (faces square to the camera stay red; only -X, -Z go dark)
//   maku white  sclera #f6f3ee / skin #f0c2ae at 0.1
//   drum barrel sky #24143a / hair #1a1020 at 0.3 (dark lacquer); heads sclera / skin; tacks practical / moon
//   lanterns    red accent / sky, white sclera / skin (day, 0.1); caps sky / hair; rope sky / hair (thin ink line)
//   The ropes and lantern caps use a 2-3 px hull: at 5 px the radiating strings read as heavy black bars.
// One named node, joints.deck (the platform centre), is a focus target for close-ups; nothing moves (pose: rest).

export const meta = {
  name: "yagura",
  height: 4.5,
  script: "festival",
  colors: {
    wood: "#ffd7a1", woodShade: "#f0c2ae",
    makuRed: "#ff4d6d", makuRedShade: "#24143a",
    makuWhite: "#f6f3ee", makuWhiteShade: "#f0c2ae",
    drum: "#24143a", drumShade: "#1a1020",
    head: "#f6f3ee", headShade: "#f0c2ae",
    tack: "#ffb020", tackShade: "#ffd7a1",
    lanternRed: "#ff4d6d", lanternRedShade: "#24143a",
    lanternWhite: "#f6f3ee", lanternWhiteShade: "#f0c2ae",
    glowRed: "#ff4d6d", glowWhite: "#ffb020",
    cap: "#24143a", capShade: "#1a1020",
    rope: "#24143a", ropeShade: "#1a1020",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, strings = 8, night = false } = opts;
  const root = new THREE.Group();
  root.name = "yagura";
  const set = new THREE.Group(); // the uniform size scale lives here
  set.name = "body";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = {};

  // ---------- merge per material ----------
  const soups = {};
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const Y = V(0, 1, 0);
  function add(key, geo, m) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!g.attributes.normal) g.computeVertexNormals();
    if (m) g.applyMatrix4(m);
    const s = (soups[key] ??= { p: [], n: [] });
    s.p.push(...g.attributes.position.array);
    s.n.push(...g.attributes.normal.array);
  }
  const M = (pos, quat = new THREE.Quaternion(), scl = V(1, 1, 1)) => new THREE.Matrix4().compose(pos, quat, scl);
  const box = (key, x, y, z, sx, sy, sz) => add(key, new THREE.BoxGeometry(sx, sy, sz), M(V(x, y, z)));
  // a square beam from a to b (w x w; or dp deep in the plane of a vertical slope), or a round one (segments r)
  function beam(key, a, b, w, round = 0, dp = w) {
    const d = b.clone().sub(a), L = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(Y, d.normalize());
    const g = round ? new THREE.CylinderGeometry(w, w, L, round) : new THREE.BoxGeometry(dp, L, w);
    add(key, g, M(a.clone().add(b).multiplyScalar(0.5), q));
  }

  // ---------- frame ----------
  const H = 1.9; // post centre half-span
  const PW = 0.15; // post section
  const DECK = 2.5, RAIL = 3.35, MID = 2.92;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box("wood", sx * H, RAIL / 2, sz * H, PW, RAIL, PW);
  // girts all round: sill, mid, under-deck
  for (const [y, w] of [[2.32, 0.12]]) {
    for (const s of [-1, 1]) {
      box("wood", 0, y, s * (H + 0.02), 2 * H, w, 0.1);
      box("wood", s * (H + 0.02), y, 0, 0.1, w, 2 * H);
    }
  }
  // deck slab + fascia
  box("wood", 0, DECK - 0.06, 0, 4.2, 0.12, 4.2);
  // railing
  const railSide = (axis, s, spans, posts) => {
    for (const [u0, u1] of spans) {
      for (const [y, w] of [[RAIL - 0.04, 0.09], [MID, 0.06]]) {
        const a = axis === "x" ? V(u0, y, s * H) : V(s * H, y, u0);
        const b = axis === "x" ? V(u1, y, s * H) : V(s * H, y, u1);
        beam("wood", a, b, w);
      }
    }
    for (const u of posts) {
      const p = axis === "x" ? [u, s * H] : [s * H, u];
      box("wood", p[0], (DECK + RAIL) / 2, p[1], 0.1, RAIL - DECK, 0.1);
    }
  };
  const SZ0 = 0.3, SZ1 = 1.25; // stair opening on +X
  railSide("x", 1, [[-H, H]], [0]);
  railSide("x", -1, [[-H, H]], [0]);
  railSide("z", -1, [[-H, H]], [0]);
  railSide("z", 1, [[-H, SZ0], [SZ1, H]], [SZ0, SZ1]);

  // ---------- kohaku-maku ----------
  const MY0 = 0.12, MY1 = 2.26, NS = 6, FOLD = 0.03, TH = 0.02;
  const inner = H - PW / 2; // between the posts' inner faces
  for (let side = 0; side < 4; side++) {
    // local frame: u along the side, o outward
    const rot = new THREE.Quaternion().setFromAxisAngle(Y, (side * Math.PI) / 2);
    const P = (u, o) => V(u, 0, H + o).applyQuaternion(rot);
    for (let i = 0; i < NS; i++) {
      const key = i % 2 ? "makuWhite" : "makuRed";
      const ua = -inner + (2 * inner * i) / NS, ub = -inner + (2 * inner * (i + 1)) / NS, um = (ua + ub) / 2;
      for (const [u0, o0, u1, o1] of [[ua, 0, um, FOLD], [um, FOLD, ub, 0]]) {
        // a thin slab: front quad from (u0,o0) to (u1,o1), back TH behind
        const f0 = P(u0, o0), f1 = P(u1, o1), b0 = P(u0, o0 - TH), b1 = P(u1, o1 - TH);
        const pts = [b0, b1, f1, f0]; // plan quad, walked round
        const ctr = pts.reduce((s, q) => s.add(q), V(0, 0, 0)).multiplyScalar(0.25);
        const tris = [];
        const quad = (a, b, e, d) => tris.push(a, b, e, a, e, d);
        const lo = (q) => V(q.x, MY0, q.z), hi = (q) => V(q.x, MY1, q.z);
        for (let k = 0; k < 4; k++) quad(lo(pts[k]), lo(pts[(k + 1) % 4]), hi(pts[(k + 1) % 4]), hi(pts[k]));
        quad(hi(pts[0]), hi(pts[1]), hi(pts[2]), hi(pts[3]));
        quad(lo(pts[3]), lo(pts[2]), lo(pts[1]), lo(pts[0]));
        // wind every triangle away from the slab centre
        const arr = [];
        const cy = (MY0 + MY1) / 2;
        for (let t = 0; t < tris.length; t += 3) {
          let [a, b, e] = [tris[t], tris[t + 1], tris[t + 2]];
          const n = b.clone().sub(a).cross(e.clone().sub(a));
          const m = a.clone().add(b).add(e).multiplyScalar(1 / 3).sub(V(ctr.x, cy, ctr.z));
          if (n.dot(m) < 0) [b, e] = [e, b];
          arr.push(a.x, a.y, a.z, b.x, b.y, b.z, e.x, e.y, e.z);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
        g.computeVertexNormals();
        add(key, g);
      }
    }
  }

  // ---------- stair on +X ----------
  const SX0 = H + 0.1, SX1 = H + 1.3, SZC = (SZ0 + SZ1) / 2, SWID = 0.82;
  for (const s of [-1, 1]) beam("wood", V(SX1, 0.05, SZC + (s * SWID) / 2), V(SX0, DECK, SZC + (s * SWID) / 2), 0.06, 0, 0.22);
  for (let k = 1; k <= 8; k++) {
    const t = k / 9, x = SX1 + (SX0 - SX1) * t;
    box("wood", x, DECK * t, SZC, 0.2, 0.04, SWID - 0.1); // ends inside the stringers, so no hull pokes past them
  }
  // handrail on the open side
  beam("wood", V(SX1 + 0.05, 0.9, SZC + SWID / 2), V(SX0 + 0.05, DECK + 0.85, SZC + SWID / 2), 0.05);
  beam("wood", V(SX1 + 0.05, 0, SZC + SWID / 2), V(SX1 + 0.05, 0.9, SZC + SWID / 2), 0.05);

  // ---------- taiko on its stand ----------
  const DZ = 0.75, DY = DECK + 1.18, DL = 0.86, DR = 0.45, YAW = 0.45;
  const SM = M(V(0, 0, DZ), new THREE.Quaternion().setFromAxisAngle(Y, YAW)); // stand frame: drum axis along local +Z
  const tilt = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), Math.PI / 2 - 0.09); // axis Y -> local +Z, up 5 deg
  const DM = SM.clone().multiply(M(V(0, DY, 0), tilt));
  const L = (x, y, z) => V(x, y, z).applyMatrix4(SM);
  {
    const prof = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8, y = -DL / 2 + DL * t;
      prof.push(new THREE.Vector2(DR * (1 + 0.1 * Math.sin(Math.PI * t)), y));
    }
    add("drum", new THREE.LatheGeometry(prof, 20), DM);
    for (const s of [-1, 1]) {
      add("head", new THREE.CylinderGeometry(DR + 0.012, DR + 0.012, 0.03, 20), DM.clone().multiply(M(V(0, s * (DL / 2 + 0.005), 0))));
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * Math.PI * 2;
        const r = DR * (1 + 0.1 * Math.sin(Math.PI * 0.06)) + 0.008;
        add("tack", new THREE.SphereGeometry(0.022, 5, 3), DM.clone().multiply(M(V(r * Math.cos(a), s * (DL / 2 - 0.05), r * Math.sin(a)))));
      }
    }
    // cradle: two A-frames across the drum axis, a saddle and a low rail each, on a skid; feet on the deck
    const top = DY - 0.46;
    for (const s of [-1, 1]) {
      const zc = s * 0.26;
      beam("wood", L(-0.45, DECK, zc), L(-0.22, top, zc), 0.07);
      beam("wood", L(0.45, DECK, zc), L(0.22, top, zc), 0.07);
      add("wood", new THREE.BoxGeometry(0.62, 0.07, 0.08), SM.clone().multiply(M(V(0, top + 0.02, zc))));
      add("wood", new THREE.BoxGeometry(0.82, 0.06, 0.07), SM.clone().multiply(M(V(0, DECK + 0.22, zc))));
    }
    add("wood", new THREE.BoxGeometry(0.96, 0.06, 0.66), SM.clone().multiply(M(V(0, DECK + 0.03, 0))));
  }

  // ---------- mast ----------
  const MZ = -0.35, MTOP = 4.42;
  beam("wood", V(0, DECK, MZ), V(0, MTOP, MZ), 0.065, 10);
  add("wood", new THREE.SphereGeometry(0.08, 10, 6), M(V(0, 4.42, MZ)));

  // ---------- lantern strings ----------
  const R = 7.5, TIE = 2.1, POLE = 2.25, SAG = 0.28, START = MTOP - 0.05;
  const lantern = (key, x, y, z) => {
    // hook point (x, y, z) on the rope; the body hangs below it
    const prof = [];
    const LH = 0.3, LR = 0.13;
    for (let i = 0; i <= 6; i++) {
      const t = -1 + (2 * i) / 6;
      prof.push(new THREE.Vector2(LR * Math.sqrt(1 - 0.64 * t * t), (t * LH) / 2));
    }
    const yc = y - 0.07 - LH / 2;
    add(key, new THREE.LatheGeometry(prof, 8), M(V(x, yc, z)));
    for (const s of [-1, 1]) add("cap", new THREE.CylinderGeometry(0.085, 0.085, 0.035, 8), M(V(x, yc + s * (LH / 2), z)));
    beam("cap", V(x, y, z), V(x, yc + LH / 2, z), 0.012);
  };
  const phase = strings > 4 ? Math.PI / strings : Math.PI / 4; // no string runs straight at the hero camera
  for (let k = 0; k < strings; k++) {
    const a = phase + (k * 2 * Math.PI) / strings;
    const dx = Math.cos(a), dz = Math.sin(a);
    const end = V(R * dx, TIE, R * dz), beg = V(0, START, MZ); // poles round the tower centre
    const at = (t) => V(beg.x + (end.x - beg.x) * t, beg.y + (end.y - beg.y) * t - SAG * 4 * t * (1 - t), beg.z + (end.z - beg.z) * t);
    const pts = [];
    for (let i = 0; i <= 16; i++) pts.push(at(i / 16));
    add("rope", new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.012, 4, false));
    // pole and its cap
    beam("wood", V(end.x, 0, end.z), V(end.x, POLE, end.z), 0.055, 8);
    add("wood", new THREE.SphereGeometry(0.06, 8, 4), M(V(end.x, POLE, end.z)));
    // lanterns outside the tower
    const len = Math.hypot(end.x - beg.x, end.z - beg.z);
    let j = 0;
    for (let d = 3.0; d < len - 0.45; d += 0.7, j++) {
      const p = at(d / len);
      lantern(j % 2 ? "lanternWhite" : "lanternRed", p.x, p.y, p.z);
    }
  }

  // ---------- meshes ----------
  const LT = night ? -1 : 0.1;
  const MAT = {
    wood: [c.wood, c.woodShade, { threshold: 0.2 }],
    makuRed: [c.makuRed, c.makuRedShade, { threshold: 0.1, px: 2 }],
    makuWhite: [c.makuWhite, c.makuWhiteShade, { threshold: 0.1, px: 2 }],
    drum: [c.drum, c.drumShade, { threshold: 0.3 }],
    head: [c.head, c.headShade, { threshold: 0.1 }],
    tack: [c.tack, c.tackShade, { threshold: 0.2, outline: false }],
    lanternRed: night ? [c.glowRed, c.glowRed, { threshold: LT, px: 3 }] : [c.lanternRed, c.lanternRedShade, { threshold: LT, px: 3 }],
    lanternWhite: night ? [c.glowWhite, c.glowWhite, { threshold: LT, px: 3 }] : [c.lanternWhite, c.lanternWhiteShade, { threshold: LT, px: 3 }],
    cap: [c.cap, c.capShade, { threshold: 0.5, px: 2 }],
    rope: [c.rope, c.ropeShade, { threshold: 0.5, px: 2 }],
  };
  for (const [key, s] of Object.entries(soups)) {
    const [base, shade, o] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.n, 3));
    const mesh = kit.toon(g, base, shade, o);
    mesh.name = key;
    set.add(mesh);
  }

  // the platform as a named node (a focus target for close-ups; nothing moves)
  const deck = new THREE.Group();
  deck.name = "deck";
  deck.position.set(0, DECK, 0);
  set.add(deck);
  joints.deck = deck;

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
