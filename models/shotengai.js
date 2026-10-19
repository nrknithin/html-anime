// shotengai.js - the entrance of a Japanese covered shopping street (shotengai), a static set piece.
// Contract: harness/lab/README.md. Meters, +Y up, the gate faces +Z (the street runs back into -Z), its left is +X,
// stands on y = 0, centred on x = 0, z = 0.
//
// Construction (boxes, beams, flat quads, arch sweeps and icosahedra; triangle soups merged per material, flat-shaded so
// planes read crisp; every closed part is wound from a point inside it, never by hand):
//   GATE     two red pillars on steel plinths hold a deep sign frame across the street; a blank signboard (amber panel,
//            two roundels, a band of diamonds, pale corner blocks: shapes, no lettering) on its face, a cap beam and a
//            half-disc crest with a roundel on top; a row of small pennants on a cord under the frame.
//   ARCADE   a translucent segmental arch roof (one pale slab swept along z) on steel ribs every bay (~3 m), each rib a
//            swept rectangle springing from a column at the shopfront; longitudinal eave beams and purlins above and
//            below the panels. Paper flower garlands (pink and amber balls) hang under every rib; a tanabata ball with
//            coloured streamers hangs from the crown in every bay; two rows of globe lamps hang either side of it.
//   SHOPS    one block per bay on each side (3.0 m deep, heights from a literal table, the pair at the gate one storey
//            so the hero view sees over them into the arcade), facing the street: a rolled
//            shutter (pale with dark slat lines and a shutter box) or an open glass front with mullions, a sloped
//            striped awning with a valance in one of four colours, a coloured fascia board, a small blank projecting
//            sign, upper windows under the arcade; outer walls get windows, air-conditioner units, rooftop units and a
//            vertical sign at the street corner. Variety comes from index tables, not chance.
//   STREET   a paved slab with pink gutter bands and a row of centre diamonds.
// Proportions (real size, base unit the bay B = 3 m): street 7.0 wide between facades (x +-3.5), arcade 15 long
//   (z +-7.5), springing 4.9 on columns at the facades, crown 6.8 (centre y 2.63, R 4.17); gate pillars at x +-3.95,
//   z 8.0, frame 8.5 wide at y 4.9-6.6, crest top 7.0 (2.33 B); shops 4.2-4.8 tall (3.5 at the gate), shutters 2.3,
//   awnings 2.5-2.85 and 1.0 out, fascia boards at 3.1.
// Budget: ~9.2k triangles in 14 meshes (one per material).
// Options build(THREE, kit, colors, { height, length, night }):
//   height   scales the whole set uniformly (default 7.0, the crest top), as the torii and house do.
//   length   arcade length in metres (default 15): round(length / 3) bays, one shop per bay per side.
//   night    the sun goes off: the signboard, every pane and the lamps go to a negative threshold (flat practical amber),
//            the paving, flowers and lines keep their tones (lamp-lit), walls go flat sky #1b2d6b, every other material
//            sits flat in its shade (threshold 2), so the pale roof glows over dark buildings.
// Colours (indigo), base / shade:
//   paving sclera #f6f3ee / moon #d5e2ff; pink (gutters, diamonds, flowers, tanabata balls) skin #f0c2ae / accent #e23b4a
//   steel (ribs, columns, beams, plinths) sky #1b2d6b / hair #16141c; gate frame accent / sky
//   signboard practical #f0c36a / iris #e7a04a; roof panels and shutters line #e7eefc / moon; walls sclera / moon
//   dark lines (slats, mullions, cords) hair flat; glass sky / hair flat by day, practical flat at night
//   lamps practical / iris; awnings red accent / sky, orange iris / accent, amber practical / iris, blue moon / sky.

export const meta = {
  name: "shotengai",
  height: 7.0,
  script: "indigo",
  colors: {
    pave: "#f6f3ee", paveShade: "#d5e2ff",
    pink: "#f0c2ae", pinkShade: "#e23b4a",
    steel: "#1b2d6b", steelShade: "#16141c",
    gate: "#e23b4a", gateShade: "#1b2d6b",
    sign: "#f0c36a", signShade: "#e7a04a",
    roof: "#e7eefc", roofShade: "#d5e2ff",
    wall: "#f6f3ee", wallShade: "#d5e2ff", wallNight: "#1b2d6b",
    line: "#16141c",
    glass: "#1b2d6b", glassShade: "#16141c",
    lit: "#f0c36a",
    lamp: "#f0c36a", lampShade: "#e7a04a",
    red: "#e23b4a", redShade: "#1b2d6b",
    orange: "#e7a04a", orangeShade: "#e23b4a",
    amber: "#f0c36a", amberShade: "#e7a04a",
    blue: "#d5e2ff", blueShade: "#1b2d6b",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, length = 15, night = false } = opts;
  const root = new THREE.Group();
  root.name = "shotengai";
  const set = new THREE.Group(); // uniform size scale lives here, so root stays the plain contract node
  set.name = "body";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  function tri(key, a, b, e, ref) { // wound away from ref (a point inside the solid); slivers dropped
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-9) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    S(key).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function hex(key, p) { // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, cx, cy, cz, sx, sy, sz) {
    const [x0, x1, y0, y1, z0, z1] = [cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2];
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  function beam(key, a, b, w, h, up = [0, 1, 0]) { // a box from a to b, w wide, h tall along `up`
    const d = sub(b, a);
    const nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
    const s = nrm(cross(d, up)), u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  const ico = {}; // icosahedron templates (outward wound by three.js)
  function ball(key, cx, cy, cz, r, detail = 0) {
    const g = (ico[detail] ??= new THREE.IcosahedronGeometry(1, detail)).attributes.position.array;
    for (let i = 0; i < g.length; i += 3) S(key).push(cx + g[i] * r, cy + g[i + 1] * r, cz + g[i + 2] * r);
  }

  // ---------- wall faces: local (u along the wall, y, o out of the wall) -> world ----------
  const face = (side, at) => ({
    p: (u, y, o) => side === "+z" ? [u, y, at + o] : side === "-z" ? [-u, y, at - o] : side === "+x" ? [at + o, y, -u] : [at - o, y, u],
    s: (w, h, d) => (side[1] === "z" ? [w, h, d] : [d, h, w]),
  });
  const wbox = (key, f, u, y, o, w, h, d) => box(key, ...f.p(u, y, o), ...f.s(w, h, d));
  const wquad = (key, f, u, y, o, w, h) =>
    quad(key, f.p(u - w / 2, y - h / 2, o), f.p(u + w / 2, y - h / 2, o), f.p(u + w / 2, y + h / 2, o), f.p(u - w / 2, y + h / 2, o), f.p(u, y, o - 1));
  function wdisc(key, f, u, y, o, r, n = 16) { // a flat disc facing out of the wall
    const ctr = f.p(u, y, o), ref = f.p(u, y, o - 1);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      tri(key, ctr, f.p(u + r * Math.cos(a0), y + r * Math.sin(a0), o), f.p(u + r * Math.cos(a1), y + r * Math.sin(a1), o), ref);
    }
  }
  function wdiamond(key, f, u, y, o, r) {
    quad(key, f.p(u, y - r, o), f.p(u + r, y, o), f.p(u, y + r, o), f.p(u - r, y, o), f.p(u, y, o - 1));
  }
  function win(f, u, y0, w, h, { bars = [1, 1] } = {}) { // inked frame, pane, mullions
    const yc = y0 + h / 2;
    wbox("steel", f, u, yc, 0.03, w + 0.12, h + 0.12, 0.06);
    wquad("glass", f, u, yc, 0.07, w, h);
    const [nv, nh] = bars;
    for (let i = 1; i <= nv; i++) wquad("line", f, u - w / 2 + (i * w) / (nv + 1), yc, 0.078, 0.04, h);
    for (let j = 1; j <= nh; j++) wquad("line", f, u, y0 + (j * h) / (nh + 1), 0.078, w, 0.04);
  }

  // ---------- layout ----------
  const HW = 3.5, DEEP = 3.0, SPRING = 4.9, CROWN = 6.8;
  const CY = (CROWN * CROWN - HW * HW - SPRING * SPRING) / (2 * (CROWN - SPRING)); // arch centre height
  const R = CROWN - CY, TH = Math.asin(HW / R); // radius, half angle
  const arc = (r, th, z) => [r * Math.sin(th), CY + r * Math.cos(th), z];
  const nBay = Math.max(2, Math.round(length / 3)), BAY = length / nBay;
  const Z0 = -length / 2, Z1 = length / 2;
  const GZ = Z1 + 0.5; // gate plane

  // a closed swept arch solid: radii r0..r1, angles a0..a1, z range z0..z1, n segments
  function arch(key, r0, r1, a0, a1, z0, z1, n) {
    const P = (i) => { const th = a0 + ((a1 - a0) * i) / n; return [arc(r0, th, z0), arc(r1, th, z0), arc(r1, th, z1), arc(r0, th, z1)]; };
    for (let i = 0; i < n; i++) {
      const A = P(i), B = P(i + 1), th = a0 + ((a1 - a0) * (i + 0.5)) / n;
      const ref = arc((r0 + r1) / 2, th, (z0 + z1) / 2);
      for (let k = 0; k < 4; k++) quad(key, A[k], A[(k + 1) % 4], B[(k + 1) % 4], B[k], ref);
      if (i === 0) quad(key, A[0], A[1], A[2], A[3], ref);
      if (i === n - 1) quad(key, B[0], B[1], B[2], B[3], ref);
    }
  }

  // ---------- street ----------
  box("pave", 0, 0.03, (Z0 + GZ + 0.6) / 2, 2 * HW, 0.06, GZ + 0.6 - Z0);
  const up = (x0, x1, z0, z1, key = "pink") => quad(key, [x0, 0.068, z0], [x1, 0.068, z0], [x1, 0.068, z1], [x0, 0.068, z1], [0, -1, 0]);
  for (const s of [-1, 1]) up(s * 3.0, s * 3.25, Z0 + 0.1, GZ + 0.5);
  for (let z = Z0 + 0.75; z < GZ + 0.3; z += 1.5) quad("pink", [0, 0.068, z - 0.45], [0.45, 0.068, z], [0, 0.068, z + 0.45], [-0.45, 0.068, z], [0, -1, z]);

  // ---------- arcade roof ----------
  arch("roof", R - 0.03, R + 0.03, -TH, TH, Z0 - 0.15, Z1 + 0.15, 28);
  for (let i = 0; i <= nBay; i++) { // ribs, columns, garlands
    const z = Z0 + i * BAY;
    arch("steel", R - 0.16, R + 0.1, -TH, TH, z - 0.09, z + 0.09, 20);
    for (const s of [-1, 1]) {
      box("steel", s * (HW - 0.12), SPRING / 2, z, 0.22, SPRING, 0.22);
      box("steel", s * (HW - 0.12), 0.12, z, 0.34, 0.24, 0.34);
    }
    const nf = 13;
    for (let j = 1; j < nf; j++) {
      const th = -TH + (2 * TH * j) / nf, sag = 0.12 + 0.1 * Math.sin((j * Math.PI * 2 * 3) / nf) ** 2;
      const p = arc(R - 0.16 - sag - 0.06, th, z);
      ball(j % 2 ? "pink" : "amber", p[0], p[1], z, 0.11, 0);
      beam("line", arc(R - 0.16, th, z), p, 0.015, 0.015, [0, 0, 1]);
    }
  }
  for (const s of [-1, 1]) box("steel", s * (HW - 0.12), SPRING - 0.1, 0, 0.26, 0.2, length + 0.3); // eave beams
  for (const th of [-0.55, -0.27, 0, 0.27, 0.55].map((f) => f * TH)) { // purlins under the panels, battens on top
    const a = arc(R - 0.09, th, 0), b = arc(R + 0.05, th, 0);
    box("steel", a[0], a[1], 0, 0.08, 0.08, length);
    box("steel", b[0], b[1], 0, 0.05, 0.04, length + 0.3);
  }
  const STREAM = ["red", "amber", "blue", "orange"];
  for (let i = 0; i < nBay; i++) {
    const z = Z0 + (i + 0.5) * BAY;
    // tanabata ball with streamers, from the crown
    const by = SPRING + 0.15;
    beam("line", [0, CROWN - 0.03, z], [0, by + 0.3, z], 0.02, 0.02, [0, 0, 1]);
    ball("pink", 0, by, z, 0.34, 1);
    const ns = 12;
    for (let k = 0; k < ns; k++) {
      const a = (k / ns) * Math.PI * 2, x = 0.27 * Math.cos(a), zz = z + 0.27 * Math.sin(a);
      const len = 1.25 + 0.2 * ((k * 5) % 3);
      box(STREAM[(k + i) % 4], x, by - 0.12 - len / 2, zz, 0.09, len, 0.09);
    }
    // globe lamps, two rows
    for (const s of [-1, 1]) {
      const x = s * 1.9, ty = CY + Math.sqrt((R - 0.03) ** 2 - x * x);
      beam("line", [x, ty, z], [x, SPRING + 0.55, z], 0.025, 0.025, [0, 0, 1]);
      box("steel", x, SPRING + 0.57, z, 0.16, 0.06, 0.16);
      ball("lamp", x, SPRING + 0.36, z, 0.2, 1);
    }
  }

  // ---------- shops ----------
  const H = [4.2, 4.6, 4.3, 4.8, 4.4, 4.2, 4.7];
  const SHUT = [0, 1, 1, 0, 2, 1, 0]; // 0 shutter down, 1 open glass front, 2 half shutter
  const AWN = ["red", "blue", "amber", "orange"];
  for (const s of [-1, 1]) {
    const fr = s > 0 ? face("-x", HW) : face("+x", -HW); // street facade; u = z on +X, u = -z on -X
    const out = s > 0 ? face("+x", HW + DEEP) : face("-x", -HW - DEEP);
    for (let i = 0; i < nBay; i++) {
      const k = i + (s > 0 ? 0 : 3), z = Z0 + (i + 0.5) * BAY, u = s > 0 ? z : -z;
      const low = i === nBay - 1, h = low ? 3.5 : H[k % H.length], type = SHUT[(k * 3 + (s > 0 ? 1 : 0)) % SHUT.length];
      const awn = AWN[(i * 3 + (s > 0 ? 0 : 1)) % 4], board = AWN[(i * 3 + (s > 0 ? 2 : 3)) % 4];
      const w = BAY - 0.5;
      box("wall", s * (HW + DEEP / 2), h / 2, z, DEEP, h, BAY);
      if (k % 2 === 0) box("steel", s * (HW + DEEP * 0.65), h + 0.3, z + 0.4 * (k % 4 ? 1 : -1), 0.9, 0.6, 1.1); // rooftop unit
      // ground floor
      const gh = 2.3;
      if (type === 1) {
        win(fr, u, 0.1, w, gh - 0.1, { bars: [3, 1] });
        wbox("roof", fr, u, gh + 0.12, 0.12, w + 0.1, 0.24, 0.24); // rolled-up shutter box
      } else {
        const sh = type === 2 ? 1.25 : gh; // shutter reaches down to y = gh - sh
        if (type === 2) win(fr, u, 0.1, w, gh - sh - 0.1, { bars: [3, 0] });
        wbox("steel", fr, u, gh / 2 + 0.05, 0.02, w + 0.14, gh + 0.1, 0.04);
        wquad("roof", fr, u, gh - sh / 2, 0.06, w, sh);
        for (let y = gh - 0.14; y > gh - sh + 0.05; y -= 0.14) wquad("line", fr, u, y, 0.066, w, 0.025);
        wbox("roof", fr, u, gh + 0.12, 0.12, w + 0.1, 0.24, 0.24);
      }
      // awning: sloped slab, valance, stripes
      const a0 = 2.85, a1 = 2.5, ao = 1.0, aw = w + 0.2;
      const A = (uu, y, o) => fr.p(uu, y, o);
      hex(awn, [A(u - aw / 2, a0, 0.02), A(u + aw / 2, a0, 0.02), A(u + aw / 2, a1, ao), A(u - aw / 2, a1, ao),
        A(u - aw / 2, a0 + 0.06, 0.02), A(u + aw / 2, a0 + 0.06, 0.02), A(u + aw / 2, a1 + 0.06, ao), A(u - aw / 2, a1 + 0.06, ao)]);
      wbox(awn, fr, u, a1 - 0.08, ao - 0.02, aw, 0.26, 0.04);
      const ns = 7;
      for (let j = 0; j < ns; j += 2) {
        const uu = u - aw / 2 + ((j + 0.5) * aw) / ns, sw = aw / ns;
        quad("wall", A(uu - sw / 2, a0 + 0.075, 0.03), A(uu + sw / 2, a0 + 0.075, 0.03), A(uu + sw / 2, a1 + 0.075, ao - 0.01), A(uu - sw / 2, a1 + 0.075, ao - 0.01), A(uu, a0 - 1, 0.5));
        wquad("wall", fr, uu, a1 - 0.08, ao + 0.012, sw, 0.26);
      }
      // fascia board and projecting sign
      wbox(board, fr, u, 3.12, 0.05, w, 0.36, 0.1);
      wquad("wall", fr, u, 3.12, 0.105, w - 0.3, 0.2);
      const su = u + (i % 2 ? 1 : -1) * (w / 2 - 0.15);
      const sy = 3.7, sp = fr.p(su, sy, 0.55);
      box(AWN[(i + (s > 0 ? 3 : 0)) % 4], sp[0], sp[1], sp[2], ...fr.s(0.07, 0.95, 0.62));
      for (const d of [-1, 1]) { const q = fr.p(su + d * 0.047, sy, 0.55); box("wall", q[0], q[1], q[2], ...fr.s(0.02, 0.7, 0.42)); }
      beam("line", fr.p(su, sy + 0.4, 0.0), fr.p(su, sy + 0.4, 0.75), 0.03, 0.03);
      // upper windows inside the arcade, and above its roof line
      if (!low) {
        win(fr, u - 0.65, 3.45, 1.05, 0.55, { bars: [1, 0] });
        win(fr, u + 0.65, 3.45, 1.05, 0.55, { bars: [1, 0] });
      }
      wbox("steel", fr, u, h - 0.06, 0.04, BAY, 0.12, 0.08); // parapet cap line
      // outer wall windows
      const ou = s > 0 ? -z : z;
      win(out, ou - 0.6, 1.0, 0.9, 1.0, { bars: [1, 0] });
      if (!low) win(out, ou + 0.6, 3.25, 0.9, 0.7, { bars: [1, 0] });
      if (k % 2 === 0) { // air-conditioner unit with its fan
        wbox("roof", out, ou + 0.6, 2.55, 0.18, 0.8, 0.55, 0.36);
        wdisc("line", out, ou + 0.5, 2.55, 0.365, 0.18, 12);
      }
      if (i === nBay - 1) { // projecting vertical sign at the street corner
        const vp = out.p(ou - s * 1.1, 3.1, 0.4);
        box(s > 0 ? "red" : "blue", vp[0], vp[1], vp[2], ...out.s(0.08, 1.7, 0.6));
        for (const d of [-1, 1]) { const q = out.p(ou - s * 1.1 + d * 0.05, 3.1, 0.4); box("wall", q[0], q[1], q[2], ...out.s(0.02, 1.4, 0.4)); }
      }
    }
    // front end walls of the rows (face +Z): a window under a small awning
    const ef = face("+z", Z1), ex = s * (HW + DEEP / 2);
    win(ef, ex + 0.3 * s, 1.0, 1.6, 1.3, { bars: [2, 1] });
    const eaw = AWN[s > 0 ? 3 : 1];
    hex(eaw, [ef.p(ex + 0.3 * s - 1.0, 2.75, 0.02), ef.p(ex + 0.3 * s + 1.0, 2.75, 0.02), ef.p(ex + 0.3 * s + 1.0, 2.5, 0.7), ef.p(ex + 0.3 * s - 1.0, 2.5, 0.7),
      ef.p(ex + 0.3 * s - 1.0, 2.81, 0.02), ef.p(ex + 0.3 * s + 1.0, 2.81, 0.02), ef.p(ex + 0.3 * s + 1.0, 2.56, 0.7), ef.p(ex + 0.3 * s - 1.0, 2.56, 0.7)]);
  }

  // ---------- gate ----------
  const GX = 3.95, FY0 = 4.9, FY1 = 6.6, FW = 8.5;
  for (const s of [-1, 1]) {
    box("steel", s * GX, 0.2, GZ, 0.62, 0.4, 0.62);
    box("gate", s * GX, FY0 / 2 + 0.2, GZ, 0.42, FY0, 0.42);
    box("steel", s * GX, 1.5, GZ, 0.46, 0.08, 0.46);
  }
  box("gate", 0, (FY0 + FY1) / 2, GZ, FW, FY1 - FY0, 0.5);
  box("steel", 0, FY0 - 0.06, GZ, FW - 0.6, 0.12, 0.3); // lower beam
  box("gate", 0, FY1 + 0.06, GZ, FW + 0.3, 0.12, 0.62); // cap beam
  const gf = face("+z", GZ + 0.25);
  wquad("sign", gf, 0, 5.75, 0.012, 7.2, 1.36);
  for (const d of [-1, 1]) { // roundels, corner blocks
    wdisc("red", gf, d * 2.85, 5.75, 0.025, 0.52, 20);
    wdisc("blue", gf, d * 2.85, 5.75, 0.038, 0.36, 20);
    wdisc("red", gf, d * 2.85, 5.75, 0.05, 0.16, 12);
    wquad("blue", gf, d * 3.45, 6.27, 0.025, 0.3, 0.3);
    wquad("blue", gf, d * 3.45, 5.23, 0.025, 0.3, 0.3);
  }
  wquad("red", gf, 0, 6.24, 0.025, 4.4, 0.12);
  wquad("red", gf, 0, 5.26, 0.025, 4.4, 0.12);
  for (let j = -2; j <= 2; j++) wdiamond(j % 2 ? "orange" : "blue", gf, j * 0.85, 5.75, 0.025, 0.3);
  // crest: half disc on the cap beam with a roundel
  const CR = 0.4, CYc = meta.height - CR;
  for (let i = 0; i < 12; i++) {
    const a0 = (i / 12) * Math.PI, a1 = ((i + 1) / 12) * Math.PI;
    const P = (a, z) => [CR * Math.cos(a), CYc + CR * Math.sin(a), z];
    const Q = (z) => [0, CYc, z];
    hex("gate", [Q(GZ - 0.08), P(a0, GZ - 0.08), P(a1, GZ - 0.08), Q(GZ - 0.08), Q(GZ + 0.08), P(a0, GZ + 0.08), P(a1, GZ + 0.08), Q(GZ + 0.08)]);
  }
  box("gate", 0, FY1 + 0.12 + 0.06, GZ, 1.0, 0.12, 0.16);
  wdisc("sign", face("+z", GZ + 0.08), 0, CYc + 0.08, 0.012, 0.2, 14);
  // pennants on a cord under the frame
  beam("line", [-GX + 0.2, FY0 - 0.2, GZ + 0.05], [GX - 0.2, FY0 - 0.2, GZ + 0.05], 0.02, 0.02);
  const PEN = ["red", "amber", "blue", "orange", "pink"];
  for (let j = 0; j < 14; j++) {
    const x = -GX + 0.45 + (j * (2 * GX - 0.9)) / 13, y = FY0 - 0.21, k = PEN[j % 5];
    const ref = [x, y - 0.12, GZ];
    tri(k, [x - 0.17, y, GZ + 0.05], [x + 0.17, y, GZ + 0.05], [x, y - 0.38, GZ + 0.05], ref);
    tri(k, [x - 0.17, y, GZ + 0.05], [x + 0.17, y, GZ + 0.05], [x, y - 0.38, GZ + 0.05], [x, y - 0.12, GZ + 0.1]);
  }

  // ---------- meshes ----------
  const T = (t) => (night ? 2 : t);
  const MAT = {
    pave: [c.pave, c.paveShade, 0.1, true],
    pink: [c.pink, c.pinkShade, 0.1, false], // flowers and paving stay lamp-lit at night
    steel: [c.steel, c.steelShade, T(0.1), true],
    gate: [c.gate, c.gateShade, T(0.1), true],
    sign: [c.sign, c.signShade, night ? -1 : 0.1, false],
    roof: [c.roof, c.roofShade, T(0.1), true],
    wall: night ? [c.wallNight, c.wallNight, 2, true] : [c.wall, c.wallShade, 0.1, true],
    line: [c.line, c.line, 0.1, false],
    glass: night ? [c.lit, c.lit, -1, false] : [c.glass, c.glassShade, -1, false],
    lamp: [c.lamp, c.lampShade, night ? -1 : 0.1, false],
    red: [c.red, c.redShade, T(0.1), true],
    orange: [c.orange, c.orangeShade, T(0.1), true],
    amber: [c.amber, c.amberShade, T(0.1), true],
    blue: [c.blue, c.blueShade, T(0.1), true],
  };
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, { threshold, outline });
    mesh.name = key;
    set.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
