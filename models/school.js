// school.js - a Japanese high school building (slice-of-life anime exterior), static; the clock hands are joints.
// Contract: harness/lab/README.md. Meters, +Y up, the classroom / entrance side faces +Z, its left is +X, stands on
// y = 0, centred on x = 0, z = 0. One set with models/house-japanese.js and models/shrine.js.
//
// Construction (boxes and flat quads, all triangle soups merged per material; flat-shaded, so planes read crisp):
//   BLOCK    one long reinforced-concrete box on a low plinth, with a central core 0.8 m proud of the front that rises
//            above the roof as the stair penthouse (rooftop door on its +X side). A parapet runs round the roof.
//   BANDS    the identity cue: on every floor, one window per bay along both wings, front and back. A window is a
//            dark frame quad with glass quads laid 2 cm in front of it, inset so the gaps between the panes are the
//            frame, mullions and transom (four sliding sashes over a row of transom lights). No hull on any of it: the
//            hundreds of window edges would scribble; the frame colour is the line. A deterministic hash opens a few
//            sashes (the glass is left out, so the dark frame shows through) and draws a drawn-back curtain in others.
//            A thin concrete sunshade ledge (hisashi) over every window row is the floor-slab line: inked boxes,
//            their backs buried in the wall so the hull only draws their silhouette.
//   CLOCK    a round clock high on the penthouse front: an inked dark bezel, a pale face, twelve ticks; the hour and
//            minute hands hang on joints `hourHand` / `minuteHand` at its centre (rotation.z, clockwise is negative).
//            build(..., { time: 8.5 }) or the returned clock(hours) sets them; rest shows 8:25.
//   ROOF     a green rooftop fence on the parapet: posts and rails (inked at 2 px) and a diagonal wire-mesh lattice
//            (double-sided quads, no hull), round both wings, stopping at the penthouse.
//   ENTRANCE at the core foot: a glass-door genkan of four leaves under a transom, a deep canopy slab on two columns,
//            a stone terrace.
// Proportions (real size, base unit the storey F = 3.6 m): plinth 0.4; floors 4 (or 3) x F; roof at 0.4 + n F (14.8);
//   parapet 0.9; fence 1.6 over it (17.3); penthouse 4.0 over the roof (18.8, coping 18.95). Bay B = 4.2 m, the core
//   7 m: bays 10 -> 49 x 12 m (12.8 at the core). Windows 3.6 x 2.05 per bay, sill 0.95 over the floor.
// Options: build(THREE, kit, colors, { floors: 3|4, bays: n, height, time }) - floors and bays change the block
//   deterministically (bays split evenly either side of the core, an odd one to +X); height scales the whole school
//   uniformly to that top, as the torii and shrine do.
// Colours (meadow: the one script with a pale sky for glass and a green for the fence), base / shade:
//   walls, ledges, parapet, canopy   moon #f7f3e1 / skin #f0c2ae, threshold 0.1 (the front, dot 0.30, stays lit)
//   plinth, terrace, step             sky #d7ecef / skin #f0c2ae, threshold 0.1 (pale paving, off the walls' cream)
//   frames, mullions, doors, ticks, hands, bezel   hair #2c5131 (one tone: they are lines)
//   glass                             sky #d7ecef, one tone: pale sky glass on the cream front and the skin-shaded back and ends
//   curtains, clock face              sclera #f6f3ee / moon #f7f3e1
//   fence                             iris #3f8a47 / hair #2c5131, threshold 0.1

export const meta = {
  name: "school",
  height: 18.95,
  script: "meadow",
  colors: {
    wall: "#f7f3e1", wallShade: "#f0c2ae",
    stone: "#d7ecef", stoneShade: "#f0c2ae",
    frame: "#2c5131",
    glass: "#d7ecef", glassShade: "#d7ecef",
    cloth: "#f6f3ee", clothShade: "#f7f3e1",
    fence: "#3f8a47", fenceShade: "#2c5131",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const floors = opts.floors === 3 ? 3 : 4;
  const bays = Math.max(2, Math.round(opts.bays ?? 10));
  const root = new THREE.Group();
  root.name = "school";
  const body = new THREE.Group(); // uniform size scale lives here, root stays the plain contract node
  body.name = "body";
  root.add(body);
  const joints = {};

  // ---------- triangle soups (as house-japanese) ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  // one triangle wound away from `ref` (a point inside the solid, or behind a flat quad)
  function tri(key, a, b, e, ref) {
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-9) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    S(key).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  // axis box from corner ranges
  function box(key, x0, x1, y0, y1, z0, z1) {
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // wall faces: local (u along the wall, y, o out of the wall) -> world
  const face = (side, at) => (u, y, o) =>
    side === "+z" ? [u, y, at + o] : side === "-z" ? [-u, y, at - o] : side === "+x" ? [at + o, y, -u] : [at - o, y, u];
  const wquad = (key, f, u0, u1, y0, y1, o) => quad(key, f(u0, y0, o), f(u1, y0, o), f(u1, y1, o), f(u0, y1, o), f((u0 + u1) / 2, (y0 + y1) / 2, o - 1));
  // deterministic 0..1 from integers
  const hash = (...k) => {
    let h = 2166136261;
    for (const v of k) h = Math.imul(h ^ (v + 0x9e37), 16777619) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
    return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
  };

  // A window on face f: dark frame, panes in front of it. cols sashes over a transom row (tr = its height share).
  // seed: [floor, bay, side] for the open / curtain variations, or null for none.
  function win(f, u, y0, w, h, { cols = 4, tr = 0.22, gap = 0.07, seed = null } = {}) {
    wquad("frame", f, u - w / 2 - 0.06, u + w / 2 + 0.06, y0 - 0.06, y0 + h + 0.06, 0.02);
    const yT = y0 + h * (1 - tr);
    const cw = w / cols;
    for (let i = 0; i < cols; i++) {
      const a = u - w / 2 + i * cw + gap / 2, b = a + cw - gap;
      const r = seed ? hash(...seed, i) : 1;
      if (r < 0.1) { // open: the sash slid behind its neighbour, the dark room shows; a pale sliver of the moved sash
        wquad("glass", f, a, a + (b - a) * 0.12, y0 + gap / 2, yT - gap / 2, 0.04);
      } else wquad("glass", f, a, b, y0 + gap / 2, yT - gap / 2, 0.04);
      if (r >= 0.1 && r < 0.3) { // curtain drawn back to one side of the sash
        const right = r > 0.2;
        const cwid = (b - a) * 0.34;
        wquad("cloth", f, right ? b - cwid : a, right ? b : a + cwid, y0 + gap / 2, yT - gap / 2, 0.05);
      }
      wquad("glass", f, a, b, yT + gap / 2, y0 + h - gap / 2, 0.04);
    }
  }

  // ---------- dimensions ----------
  const G0 = 0.4, FH = 3.6, R = G0 + floors * FH; // plinth top, storey, roof deck
  const B = 4.2, CW = 7.0, CH = CW / 2; // bay, core width
  const nL = Math.floor(bays / 2), nR = bays - nL;
  const XL = -CH - nL * B, XR = CH + nR * B; // block ends
  const ZF = 6, ZB = -6, ZC = ZF + 0.8; // front, back, core front
  const PAR = 0.9, PT = 0.25; // parapet height, thickness
  const PH = 4.0, PZ0 = -3; // penthouse height over the roof, its back
  const top = R + PH + 0.15;
  const k = opts.height ? opts.height / top : 1;
  body.scale.setScalar(k);
  // centre the footprint (block back to the terrace step) on x = 0, z = 0; odd bay counts shift x
  body.position.set((-(XL + XR) / 2) * k, 0, (-(ZB - 0.15 + ZC + 5.0) / 2) * k);

  // ---------- block ----------
  box("stone", XL - 0.15, XR + 0.15, 0, G0, ZB - 0.15, ZF + 0.15);
  box("stone", -CH - 1.5, CH + 1.5, 0, G0, ZF, ZC + 4.2); // entrance terrace
  box("stone", -CH - 0.5, CH + 0.5, 0, G0 * 0.5, ZC + 4.2, ZC + 5.0); // its step
  box("wall", XL, XR, G0, R, ZB, ZF);
  box("wall", -CH, CH, G0, R + PH, PZ0, ZC); // core and stair penthouse, one box so its front has no seam
  box("wall", -CH, CH, G0, R, ZB, PZ0 + 0.2); // core behind the penthouse
  box("wall", -CH - 0.12, CH + 0.12, R + PH, top, PZ0 - 0.12, ZC + 0.12); // its coping
  // parapet round the wings
  // parapet round the wings, bottoms buried 0.3 m in the block (no coplanar faces on the deck)
  const P0 = R - 0.3;
  box("wall", XL, -CH + 0.1, P0, R + PAR, ZF - PT, ZF);
  box("wall", CH - 0.1, XR, P0, R + PAR, ZF - PT, ZF);
  box("wall", XL, XR, P0, R + PAR, ZB, ZB + PT);
  box("wall", XL, XL + PT, P0, R + PAR, ZB + 0.1, ZF - 0.1);
  box("wall", XR - PT, XR, P0, R + PAR, ZB + 0.1, ZF - 0.1);

  // ---------- window bands and ledges ----------
  const front = face("+z", ZF), back = face("-z", ZB);
  const wings = [[XL, -CH, nL], [CH, XR, nR]];
  for (let fl = 0; fl < floors; fl++) {
    const y = G0 + fl * FH;
    for (const [x0, x1, n] of wings) {
      for (let i = 0; i < n; i++) {
        const u = x0 + B * (i + 0.5), bay = Math.round(u / B);
        win(front, u, y + 0.95, B - 0.6, 2.05, { seed: [fl, bay, 1] });
        win(back, -u, y + 1.15, B - 0.9, 1.75, { cols: 3, tr: 0.25, seed: [fl, bay, 2] }); // corridor side
      }
      // sunshade ledges: front deep, back shallow; their backs 10 cm inside the wall
      const ly = y + 3.12;
      if (fl < floors - 1) box("wall", x0, x1, ly, ly + 0.14, ZF - 0.1, ZF + 0.7);
      else box("wall", x0, x1, R - 0.1, R + 0.02, ZF - 0.1, ZF + 0.35); // the roof edge lip
      box("wall", x0, x1, ly, ly + 0.12, ZB - 0.35, ZB + 0.1);
    }
    // core: stair windows on the upper floors, glass doors on the ground
    if (fl > 0) win(face("+z", ZC), 0, y + 0.5, 2.4, 2.6, { cols: 2, tr: 0.3 });
    win(back, 0, y + 1.15, 2.4, 1.75, { cols: 2, tr: 0.25 });
  }
  // ends: a column of small stair windows
  for (const [sd, x] of [["+x", XR], ["-x", XL]])
    for (let fl = 0; fl < floors; fl++) win(face(sd, x), 0, G0 + fl * FH + 1.0, 1.4, 1.9, { cols: 2, tr: 0.25 });

  // ---------- entrance (genkan) ----------
  const cf = face("+z", ZC);
  win(cf, 0, G0, 5.0, 3.0, { cols: 4, tr: 0.2, gap: 0.1 });
  wquad("frame", cf, -0.06, 0.06, G0, G0 + 2.4, 0.06); // the door pair's meeting stiles
  box("wall", -CH - 1.0, CH + 1.0, 3.5, 3.8, ZC - 0.1, ZC + 3.6); // canopy
  for (const s of [-1, 1]) box("wall", s * (CH + 0.4) - 0.2, s * (CH + 0.4) + 0.2, G0, 3.5, ZC + 3.0, ZC + 3.4);
  wquad("frame", cf, 3.0, 3.5, G0 + 0.9, G0 + 2.3, 0.03); // school name plate (blank)

  // ---------- penthouse: rooftop door, clock ----------
  const pf = face("+x", CH);
  const dz = -((PZ0 + ZC) / 2 - 1.2); // u on the +x face is -z
  wquad("frame", pf, dz - 0.55, dz + 0.55, R, R + 2.15, 0.02);
  wquad("glass", pf, dz - 0.3, dz + 0.3, R + 1.3, R + 1.9, 0.04); // the door's small light
  box("wall", CH - 0.1, CH + 0.6, R + 2.17, R + 2.32, -dz - 0.85, -dz + 0.85); // door hood
  win(face("-x", -CH), -((PZ0 + ZC) / 2), R + 1.2, 1.6, 1.3, { cols: 2, tr: 0 });

  const CY = R + PH * 0.5 + 0.1, CR = 1.35; // clock centre, bezel radius
  const ticks = face("+z", ZC);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2, big = k % 3 === 0;
    const r0 = CR * (big ? 0.62 : 0.7), r1 = CR * 0.8, hw = big ? 0.05 : 0.025;
    const [sx, sy] = [Math.sin(a), Math.cos(a)], [px, py] = [Math.cos(a), -Math.sin(a)];
    const P = (r, s) => ticks(sx * r + px * s, CY + sy * r + py * s, 0.24);
    quad("frame", P(r0, -hw), P(r1, -hw), P(r1, hw), P(r0, hw), ticks(0, CY, -1));
  }

  // ---------- rooftop fence ----------
  const FY = R + PAR, FT = 1.6;
  function fence(a, b) { // a, b: [x, z] on the parapet's centre line
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), d = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    const P = (u, y, o = 0) => [a[0] + d[0] * u - d[1] * o, y, a[1] + d[1] * u + d[0] * o];
    const n = Math.max(1, Math.round(len / 2.4));
    for (let i = 0; i <= n; i++) {
      const [x, , z] = P((len * i) / n, 0);
      box("fence", x - 0.04, x + 0.04, FY, FY + FT + 0.04, z - 0.04, z + 0.04);
    }
    for (const y of [FY + 0.06, FY + FT]) {
      const [x0, , z0] = P(0, 0), [x1, , z1] = P(len, 0);
      box("fence", Math.min(x0, x1) - 0.03, Math.max(x0, x1) + 0.03, y - 0.03, y + 0.03, Math.min(z0, z1) - 0.03, Math.max(z0, z1) + 0.03);
    }
    const step = 0.32, hw = 0.014;
    for (const dir of [1, -1]) {
      for (let s = -FT; s < len; s += step) {
        const t0 = Math.max(0, -s), t1 = Math.min(FT, len - s);
        if (t1 - t0 < 0.02) continue;
        const yA = dir > 0 ? t0 : FT - t0, yB = dir > 0 ? t1 : FT - t1;
        const ua = s + t0, ub = s + t1;
        const k = hw * Math.SQRT2;
        quad("net", P(ua - k, FY + yA), P(ub - k, FY + yB), P(ub + k, FY + yB), P(ua + k, FY + yA), P((ua + ub) / 2, FY + FT / 2, -1));
      }
    }
  }
  const pc = PT / 2;
  fence([XL + pc, ZF - pc], [-CH, ZF - pc]);
  fence([CH, ZF - pc], [XR - pc, ZF - pc]);
  fence([XR - pc, ZF - pc], [XR - pc, ZB + pc]);
  fence([XR - pc, ZB + pc], [XL + pc, ZB + pc]);
  fence([XL + pc, ZB + pc], [XL + pc, ZF - pc]);

  // ---------- meshes ----------
  const MAT = {
    wall: [c.wall, c.wallShade, 0.1, {}],
    stone: [c.stone, c.stoneShade, 0.1, {}],
    frame: [c.frame, c.frame, 0.1, { outline: false }],
    glass: [c.glass, c.glassShade, -0.4, { outline: false }],
    cloth: [c.cloth, c.clothShade, -0.4, { outline: false }],
    fence: [c.fence, c.fenceShade, 0.1, { px: 2 }],
    net: [c.fence, c.fenceShade, 0.1, { outline: false, doubleSided: true }],
  };
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, o] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, { threshold, ...o });
    mesh.name = key;
    body.add(mesh);
  }
  // clock: inked bezel, face, hands on joints
  const disc = (r, d) => new THREE.CylinderGeometry(r, r, d, 24).rotateX(Math.PI / 2);
  const bezel = kit.toon(disc(CR, 0.2), c.frame, c.frame, { threshold: 0.1 });
  bezel.position.set(0, CY, ZC + 0.1);
  bezel.name = "clockBezel";
  const dial = kit.toon(disc(CR * 0.86, 0.04), c.cloth, c.clothShade, { threshold: -0.4, outline: false });
  dial.position.set(0, CY, ZC + 0.21);
  dial.name = "clockFace";
  body.add(bezel, dial);
  for (const [name, len, w, z] of [["hourHand", 0.6, 0.12, 0.26], ["minuteHand", 0.95, 0.07, 0.28]]) {
    const j = new THREE.Group();
    j.name = name;
    j.position.set(0, CY, ZC + z);
    const hand = kit.toon(new THREE.BoxGeometry(w, len + 0.12, 0.015).translate(0, len / 2 - 0.06, 0), c.frame, c.frame, { outline: false });
    hand.name = name + "Mesh";
    j.add(hand);
    body.add(j);
    joints[name] = j;
  }
  const hub = kit.toon(disc(0.08, 0.06), c.frame, c.frame, { outline: false });
  hub.position.set(0, CY, ZC + 0.29);
  hub.name = "clockHub";
  body.add(hub);

  // hours on a 12 h dial (8.5 = 8:30); clockwise from 12 is -z rotation seen from +Z
  function clock(hours) {
    const h = ((hours % 12) + 12) % 12;
    joints.hourHand.rotation.z = (-h / 12) * Math.PI * 2;
    joints.minuteHand.rotation.z = -(h % 1) * Math.PI * 2;
    root.updateMatrixWorld(true);
  }
  const REST_TIME = opts.time ?? 8 + 25 / 60;
  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    clock(REST_TIME);
  }
  pose("rest");
  return { root, joints, pose, clock };
}
