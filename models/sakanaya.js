// sakanaya.js - a shopping-street fishmonger's open shopfront (sakanaya), a set piece with one clip.
// Contract: harness/lab/README.md. Meters, +Y up, the open front faces +Z (the street), its left is +X, stands on
// y = 0, centred on x = 0, z = 0.
//
// Construction (boxes, slabs, lofted rings, lathes, swept tubes and fans; triangle soups merged per material,
// flat-shaded so planes read crisp; every closed part is wound from a point inside it, never by hand):
//   SHELL    a lime-tiled back wall and two side walls (grout lines as pale decals), a header over the opening with a
//            blank white signboard, a roof cap, two front posts, a dark wet concrete floor stepping down to the street.
//   DISPLAY  a stand sloped 32 deg toward the street (solid green skirts) carrying 3 x 2 styrofoam boxes (open: four
//            walls and a floor) filled with crushed ice: a jittered heightfield, faceted, at a high threshold so most
//            facets fall in the cold pale blue shade and a few catch white. On the ice: sea bream (red), a big yellowtail
//            and mackerel (green, dark back bars), horse mackerel (white, dark back and lateral line), squid (mantle,
//            fins, head, arms), scallops (ribbed domes) and mussels; one blank white price card on a stick per box.
//            The catch has no hull: at 480 x 300 a 5 px ink line round every fish turned the boxes into black scribble,
//            so the fish read as flat colour shapes on the pale ice instead (the boxes keep their ink).
//   AWNING   one white slab sloping out over the display, red stripe decals (flat, so the underside stays red) on top,
//            underside and front edge (no hull, so stripe seams never ink), a straight striped valance, a pipe frame
//            under it (side arms, front bar and a crossbar). Four bare bulbs hang on 0.43 m cords from the crossbar.
//   BACK     a tall back counter (green body, white steel top at 1.38, so it shows over the display) with a cutting
//            board leaning on the wall, a knife lying in front of it and a red dial scale with a steel pan; a yellow
//            rubber apron on a hook on the -X wall; white rubber boots standing by the -X post beside the display.
//            A tall blank sign board (red frame, white face) on the +X wall by the front corner.
//   STREET   wet pavement in front (dark, pale joint lines, puddle fans), a green hose coiled on it, its lead running to
//            a tap on the -X post.
// Proportions (real size, base unit the opening width W = 3.6 m): shop 3.7 wide (walls at x +-1.85), 1.6 deep
//   (z -1.1 to the posts at 0.47); header 2.42-3.0, roof cap top 3.06; awning from 2.42 at z 0.5 to 2.07 at z 1.45;
//   valance 1.90-2.07; bulbs glass 1.62-1.75; display bed 3.04 x 1.26, back edge 1.24 at z -0.15, front edge 0.57 at
//   z 0.92; boxes 0.92 x 0.57 x 0.16; fish 0.27-0.68 long; back counter 1.38; apron 1.0-2.0; pavement to z 1.78.
// Budget: ~10.4k triangles in 15 meshes, one per material pair.
// Options build(THREE, kit, colors, { height }): height scales the whole set uniformly (default 3.06, the roof cap).
// Clip: sway 3 s (pose("sway@1.2")): each bulb swings about its hook, +-10 deg across the shop and +-3 deg along the
//   street, each a little behind its neighbour; whole cycles only, so the loop closes. The bulbs have no meshes of
//   their own: glass, socket and cord are vertex ranges in the glow and dark meshes that pose() rewrites.
// Colours (meadow), base / shade:
//   white (awning slab, valance, signboards, counter top, scale dial and pan, knife, boots) sclera #f6f3ee / sky #d7ecef;
//   ice sclera / sky at threshold 0.8 (reads pale and cold); stripes accent #d9483b flat (decals, sea bream);
//   red (scale body, sign frame) accent / hair #2c5131; styrofoam (boxes, cutting board) moon #f7f3e1 / skin #f0c2ae;
//   frame (stand, posts, pipes, counter, roof cap, tap) iris #3f8a47 / hair; green fish iris / hair, no hull;
//   white fish, price cards, fish eyes sclera / sky, no hull; walls and hose line #a9d16e / iris; floor and
//   pavement hair / hair; squid and scallops skin / accent, no hull; apron practical #f2c94c / iris; bulbs
//   practical flat (lit glass); dark lines (cords, sockets, pupils, fish marks, mussels, knife handle, needle, hook,
//   brackets) hair flat; wet (puddles, joints, grout) sky flat.

export const meta = {
  name: "sakanaya",
  height: 3.06,
  script: "meadow",
  colors: {
    white: "#f6f3ee", whiteShade: "#d7ecef",
    ice: "#f6f3ee", iceShade: "#d7ecef",
    red: "#d9483b", redShade: "#2c5131",
    styro: "#f7f3e1", styroShade: "#f0c2ae",
    frame: "#3f8a47", frameShade: "#2c5131",
    wall: "#a9d16e", wallShade: "#3f8a47",
    pave: "#2c5131",
    squid: "#f0c2ae", squidShade: "#d9483b",
    apron: "#f2c94c", apronShade: "#3f8a47",
    glow: "#f2c94c",
    dark: "#2c5131",
    wet: "#d7ecef",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const { height = meta.height } = opts;
  const root = new THREE.Group();
  root.name = "sakanaya";
  const set = new THREE.Group(); // the uniform size scale lives here
  set.name = "set";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = {};
  const TAU = Math.PI * 2, D2R = Math.PI / 180;

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  const mid = (pts) => [0, 1, 2].map((i) => pts.reduce((s, q) => s + q[i], 0) / pts.length);
  const soups = {};
  let sink = null; // when set, tri() writes into this array instead of a soup (bulb template)
  const S = (key) => (soups[key] ??= []);
  function tri(key, a, b, e, ref) { // wound away from ref
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-10) return;
    const m = mid([a, b, e]);
    (sink ?? S(key)).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function hex(key, p) { // p[0..3] one face ring, p[4..7] the opposite, same order
    const ref = mid(p);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, x0, x1, y0, y1, z0, z1) {
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // closed loft through rings (each an array of points; a one-point ring is a pole); open end rings get a fan cap
  function loft(key, rings) {
    const C = rings.map(mid);
    for (let i = 0; i + 1 < rings.length; i++) {
      const A = rings[i], B = rings[i + 1], ref = mid([C[i], C[i + 1]]);
      const n = Math.max(A.length, B.length);
      for (let k = 0; k < n; k++) {
        const a0 = A[k % A.length], a1 = A[(k + 1) % A.length], b0 = B[k % B.length], b1 = B[(k + 1) % B.length];
        tri(key, a0, a1, b1, ref); tri(key, a0, b1, b0, ref);
      }
    }
    for (const [i, j] of [[0, 1], [rings.length - 1, rings.length - 2]]) {
      const R = rings[i];
      if (R.length < 3) continue;
      for (let k = 0; k < R.length; k++) tri(key, C[i], R[k], R[(k + 1) % R.length], C[j]);
    }
  }
  const ringAt = (o, u, v, ru, rv, n, ph = 0) =>
    Array.from({ length: n }, (_, k) => {
      const a = ph + (k / n) * TAU;
      return add(o, add(mul(u, ru * Math.cos(a)), mul(v, rv * Math.sin(a))));
    });
  // a tube along a polyline, radius per point (number or array), n sides, closed ends
  function tube(key, pts, r, n = 6) {
    const rings = pts.map((p, i) => {
      const d = nrm(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
      const s = nrm(cross(d, Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), u = cross(s, d);
      const ri = Array.isArray(r) ? r[i] : r;
      return ringAt(p, s, u, ri, ri, n);
    });
    loft(key, rings);
  }
  const cyl = (key, a, b, r, n = 8) => tube(key, [a, b], r, n);
  // flat irregular fan on the ground, lobes from literal phases
  function blob(key, cx, cz, rx, rz, y, ph, m = 14) {
    const P = (k) => {
      const a = (k / m) * TAU, f = 1 + 0.22 * Math.sin(3 * a + ph) + 0.1 * Math.cos(5 * a + 2 * ph);
      return [cx + rx * f * Math.cos(a), y, cz + rz * f * Math.sin(a)];
    };
    for (let k = 0; k < m; k++) tri(key, [cx, y, cz], P(k), P(k + 1), [cx, y - 1, cz]);
  }
  // deterministic hash in [0, 1)
  const hash = (i, j, k = 0) => { const v = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return v - Math.floor(v); };

  // ---------- shell ----------
  const XW = 1.85, ZB = -1.1, ZF = 0.47, TOP = 3.0, FL = 0.06; // wall x, back wall z, front posts z, header top, floor
  box("pave", -XW, XW, 0, FL, ZB, ZF + 0.05);                               // shop floor
  box("pave", -XW - 0.1, XW + 0.1, 0, 0.03, ZF + 0.05, 1.78);              // street pavement
  box("wall", -XW, XW, 0, TOP, ZB - 0.1, ZB);                               // back wall
  for (const s of [-1, 1]) box("wall", s * XW - 0.05, s * XW + 0.05, 0, TOP, ZB - 0.1, ZF - 0.05); // side walls
  box("wall", -XW - 0.05, XW + 0.05, 2.42, TOP, ZF - 0.08, ZF + 0.05);      // header
  box("white", -1.55, 1.55, 2.5, 2.92, ZF + 0.05, ZF + 0.08);               // blank signboard
  box("frame", -1.62, 1.62, 2.46, 2.5, ZF + 0.05, ZF + 0.1);                // its trim
  box("frame", -1.62, 1.62, 2.92, 2.96, ZF + 0.05, ZF + 0.1);
  box("frame", -XW - 0.1, XW + 0.1, TOP, 3.06, ZB - 0.15, ZF + 0.12);       // roof cap
  for (const s of [-1, 1]) box("frame", s * XW - 0.07, s * XW + 0.07, 0, 2.42, ZF - 0.07, ZF + 0.07); // posts
  // grout lines on the back wall and the -X wall interior (tile 0.15 m, up to 2.1)
  const GL = 0.008;
  for (let y = 0.15; y < 2.15; y += 0.15) {
    quad("wet", [-XW + 0.05, y - GL, ZB + 0.004], [XW - 0.05, y - GL, ZB + 0.004], [XW - 0.05, y + GL, ZB + 0.004], [-XW + 0.05, y + GL, ZB + 0.004], [0, y, ZB - 1]);
    const xi = -XW + 0.054;
    quad("wet", [xi, y - GL, ZB], [xi, y - GL, ZF - 0.07], [xi, y + GL, ZF - 0.07], [xi, y + GL, ZB], [xi - 1, y, 0]);
  }
  for (let x = -XW + 0.15; x < XW - 0.05; x += 0.15)
    quad("wet", [x - GL, FL, ZB + 0.004], [x + GL, FL, ZB + 0.004], [x + GL, 2.1, ZB + 0.004], [x - GL, 2.1, ZB + 0.004], [x, 1, ZB - 1]);
  for (let z = ZB + 0.15; z < ZF - 0.08; z += 0.15) {
    const xi = -XW + 0.054;
    quad("wet", [xi, FL, z - GL], [xi, FL, z + GL], [xi, 2.1, z + GL], [xi, 2.1, z - GL], [xi - 1, 1, z]);
  }

  // ---------- display stand ----------
  const TH = 32 * D2R, SN = Math.sin(TH), CS = Math.cos(TH), Y0 = 1.24, Z0 = -0.15, BL = 1.26, BW = 1.52;
  const B = (x, s, h) => [x, Y0 - s * SN + h * CS, Z0 + s * CS + h * SN]; // bed coords: s down the slope, h off the bed
  const bhex = (key, x0, x1, s0, s1, h0, h1) =>
    hex(key, [B(x0, s0, h0), B(x1, s0, h0), B(x1, s1, h0), B(x0, s1, h0), B(x0, s0, h1), B(x1, s0, h1), B(x1, s1, h1), B(x0, s1, h1)]);
  bhex("frame", -BW, BW, -0.03, BL + 0.03, -0.06, 0); // tray
  bhex("frame", -BW, BW, BL - 0.01, BL + 0.04, 0, 0.07); // front lip
  // solid skirts: front panel and two sides down to the floor
  const fb = B(0, BL + 0.03, -0.06), bb = B(0, -0.03, -0.06);
  box("frame", -BW + 0.02, BW - 0.02, 0.03, fb[1], fb[2] - 0.05, fb[2]);
  for (const s of [-1, 1]) {
    const x0 = s * BW - 0.025, x1 = s * BW + 0.025;
    hex("frame", [[x0, FL, bb[2]], [x1, FL, bb[2]], [x1, 0.03, fb[2]], [x0, 0.03, fb[2]], [x0, bb[1], bb[2]], [x1, bb[1], bb[2]], [x1, fb[1], fb[2]], [x0, fb[1], fb[2]]]);
  }
  box("frame", -BW + 0.02, BW - 0.02, FL, bb[1], bb[2], bb[2] + 0.04); // back panel

  // ---------- styrofoam boxes with crushed ice ----------
  const BXW = 0.92, BXS = 0.57, BXH = 0.16, WT = 0.03;
  const boxes = [];
  for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) boxes.push({ cx: (i - 1) * 0.99, cs: 0.035 + BXS / 2 + j * (BXS + 0.055), i, j });
  const iceH = (bx, x, s) => { // ice top (h) at bed coords inside a box: a mound plus jitter
    const u = (x - bx.cx) / (BXW / 2 - WT), v = (s - bx.cs) / (BXS / 2 - WT);
    return 0.118 + 0.03 * (1 - u * u) * (1 - v * v);
  };
  for (const bx of boxes) {
    const x0 = bx.cx - BXW / 2, x1 = bx.cx + BXW / 2, s0 = bx.cs - BXS / 2, s1 = bx.cs + BXS / 2;
    bhex("styro", x0, x1, s0, s1, 0, 0.03);
    bhex("styro", x0, x1, s0, s0 + WT, 0.03, BXH);
    bhex("styro", x0, x1, s1 - WT, s1, 0.03, BXH);
    bhex("styro", x0, x0 + WT, s0 + WT, s1 - WT, 0.03, BXH);
    bhex("styro", x1 - WT, x1, s0 + WT, s1 - WT, 0.03, BXH);
    // ice heightfield (open surface; its edges tuck under the box walls)
    const NX = 11, NS = 7, ix0 = x0 + WT - 0.01, ix1 = x1 - WT + 0.01, is0 = s0 + WT - 0.01, is1 = s1 - WT + 0.01;
    const P = [];
    for (let a = 0; a <= NX; a++) {
      P.push([]);
      for (let b = 0; b <= NS; b++) {
        const edge = a === 0 || a === NX || b === 0 || b === NS;
        const x = ix0 + ((ix1 - ix0) * a) / NX + (edge ? 0 : (hash(a, b, bx.i + 3 * bx.j) - 0.5) * 0.04);
        const s = is0 + ((is1 - is0) * b) / NS + (edge ? 0 : (hash(b, a, 7 + bx.i) - 0.5) * 0.04);
        P[a].push(B(x, s, edge ? 0.11 : iceH(bx, x, s) + (hash(a + 9, b, bx.j) - 0.5) * 0.026));
      }
    }
    for (let a = 0; a < NX; a++) for (let b = 0; b < NS; b++) {
      const ref = B((ix0 + ix1) / 2, (is0 + is1) / 2, 0);
      if ((a + b) % 2) { tri("ice", P[a][b], P[a + 1][b], P[a + 1][b + 1], ref); tri("ice", P[a][b], P[a + 1][b + 1], P[a][b + 1], ref); }
      else { tri("ice", P[a][b], P[a + 1][b], P[a][b + 1], ref); tri("ice", P[a + 1][b], P[a + 1][b + 1], P[a][b + 1], ref); }
    }
    // blank price card on a stick at the front edge of the box
    const px = bx.cx + (bx.i === 1 ? 0.3 : -0.28), ps = s1 - 0.07, base = B(px, ps, iceH(bx, px, ps));
    const top = add(base, [0, 0.14, 0.0]);
    box("dark", top[0] - 0.006, top[0] + 0.006, base[1] - 0.02, top[1], base[2] - 0.006, base[2] + 0.006);
    const ex = [1, 0, 0], ey = [0, Math.cos(20 * D2R), -Math.sin(20 * D2R)], ez = cross(ex, ey);
    const cc = add(top, [0, 0.03, 0.012]);
    const C = (i, j, k) => add(cc, add(mul(ex, i * 0.075), add(mul(ey, j * 0.05), mul(ez, k * 0.004))));
    hex("fishW", [C(-1, -1, -1), C(1, -1, -1), C(1, 1, -1), C(-1, 1, -1), C(-1, -1, 1), C(1, -1, 1), C(1, 1, 1), C(-1, 1, 1)]);
  }

  // ---------- fish and shellfish on the ice ----------
  // fish frame on the bed: a along the body (nose +a), b across in the bed plane (dorsal +b), c up off the ice
  function frameOn(bx, x, s, yaw, lift) {
    const h0 = iceH(bx, x, s) + lift, ca = Math.cos(yaw), sa = Math.sin(yaw);
    return (a, b, cc) => B(x + a * ca - b * sa, s + a * sa + b * ca, h0 + cc);
  }
  const prof = (t, tab) => { // piecewise-linear table [[t, v]...]
    for (let i = 1; i < tab.length; i++)
      if (t <= tab[i][0]) return tab[i - 1][1] + ((tab[i][1] - tab[i - 1][1]) * (t - tab[i - 1][0])) / (tab[i][0] - tab[i - 1][0]);
    return tab[tab.length - 1][1];
  };
  const FISH_D = [[0, 0], [0.06, 0.5], [0.22, 0.93], [0.45, 1], [0.7, 0.72], [0.88, 0.32], [1, 0.16]];
  function disc(key, F, a, b, cc, r, n = 8) { // a flat disc lying on the fish flank
    const o = F(a, b, cc), u = sub(F(a + 1, b, cc), F(a, b, cc)), v = sub(F(a, b + 1, cc), F(a, b, cc));
    const R = ringAt(o, nrm(u), nrm(v), r, r, n);
    const under = F(a, b, cc - 1);
    for (let k = 0; k < n; k++) tri(key, o, R[k], R[(k + 1) % n], under);
  }
  function fish(key, bx, x, s, yaw, L, D, mark) {
    const W = 0.42 * D, lift = 0.3 * W;
    const F = frameOn(bx, x, s, yaw, lift);
    const NR = 9, NSEG = 8, rings = [];
    const surf = (t, phi) => { const d = (D / 2) * prof(t, FISH_D), w = (W / 2) * prof(t, FISH_D); return [d * Math.cos(phi), Math.max(w * Math.sin(phi), -0.35 * w)]; };
    for (let r = 0; r <= NR; r++) {
      const t = r / NR, a = L / 2 - t * L;
      if (r === 0) { rings.push([F(a, 0, 0)]); continue; }
      rings.push(Array.from({ length: NSEG }, (_, k) => { const [b, cc] = surf(t, (k / NSEG) * TAU); return F(a, b, cc); }));
    }
    loft(key, rings);
    // forked tail: two flat lobes
    const ar = -L / 2, dr = (D / 2) * 0.16;
    for (const sg of [1, -1]) {
      const poly = [[ar + 0.02 * L, 0], [ar + 0.02 * L, sg * dr * 1.2], [ar - 0.2 * L, sg * 0.5 * D], [ar - 0.15 * L, sg * 0.04 * D]];
      hex(key, [...poly.map(([a, b]) => F(a, b, -0.004)), ...poly.map(([a, b]) => F(a, b, 0.004))]);
    }
    // dorsal fin ridge on the back edge
    const df = [[0.12 * L, D / 2 * 0.9], [-0.1 * L, D / 2 * 0.95], [-0.05 * L, D / 2 * 1.22], [0.08 * L, D / 2 * 1.15]];
    hex(key, [...df.map(([a, b]) => F(a, b, -0.003)), ...df.map(([a, b]) => F(a, b, 0.003))]);
    // eye: white ring and dark pupil on the up flank near the nose
    const te = 0.11, ae = L / 2 - te * L, be = 0.12 * D, [, ce] = surf(te, Math.acos(Math.min(1, be / ((D / 2) * prof(te, FISH_D)))));
    disc("fishW", F, ae, be, ce + 0.003, 0.15 * D);
    disc("dark", F, ae, be, ce + 0.006, 0.085 * D);
    // marks: "bars" (mackerel back bars) or "line" (lateral line)
    const flank = (t, bf) => { const d = (D / 2) * prof(t, FISH_D), w = (W / 2) * prof(t, FISH_D); const b = bf * d; return [L / 2 - t * L, b, w * Math.sqrt(Math.max(0, 1 - bf * bf)) + 0.003]; };
    const strip = (pts, hw) => {
      for (let i = 0; i + 1 < pts.length; i++) {
        const [a0, b0, c0] = pts[i], [a1, b1, c1] = pts[i + 1];
        quad("dark", F(a0, b0 - hw, c0), F(a1, b1 - hw, c1), F(a1, b1 + hw, c1), F(a0, b0 + hw, c0), F((a0 + a1) / 2, (b0 + b1) / 2, -1));
      }
    };
    const stripA = (pts, hw) => { // a strip across the body (varying b), widened along a
      for (let i = 0; i + 1 < pts.length; i++) {
        const [a0, b0, c0] = pts[i], [a1, b1, c1] = pts[i + 1];
        quad("dark", F(a0 - hw, b0, c0), F(a1 - hw, b1, c1), F(a1 + hw, b1, c1), F(a0 + hw, b0, c0), F((a0 + a1) / 2, (b0 + b1) / 2, -1));
      }
    };
    if (mark === "back") strip([0.08, 0.25, 0.45, 0.65, 0.85, 0.97].map((t) => flank(t, 0.62)), 0.18 * D);
    if (mark === "line" || mark === "back") strip([0.22, 0.4, 0.6, 0.8, 0.94].map((t) => flank(t, 0.18)), 0.004);
    if (mark === "bars") for (const t0 of [0.3, 0.42, 0.54, 0.66, 0.78]) stripA([0.85, 0.7, 0.55, 0.4].map((bf, q) => flank(t0 + (q % 2) * 0.03, bf)), 0.006);
  }
  function squid(bx, x, s, yaw) {
    const L = 0.24, R = 0.045, F = frameOn(bx, x, s, yaw, 0.012), N = 8;
    const MT = [[0, 0.05], [0.15, 0.4], [0.45, 0.82], [0.8, 1], [1, 0.92]];
    const rings = [[F(-L / 2 - 0.004, 0, 0)]];
    for (let r = 0; r <= 6; r++) { const t = r / 6; rings.push(ringAt(F(-L / 2 + t * L, 0, 0), nrm(sub(F(0, 1, 0), F(0, 0, 0))), nrm(sub(F(0, 0, 1), F(0, 0, 0))), R * prof(t, MT), 0.55 * R * prof(t, MT), N)); }
    loft("squid", rings);
    loft("squid", [0, 0.5, 1].map((t) => ringAt(F(L / 2 + 0.005 + t * 0.05, 0, 0), nrm(sub(F(0, 1, 0), F(0, 0, 0))), nrm(sub(F(0, 0, 1), F(0, 0, 0))), R * (0.55 + 0.1 * Math.sin(t * Math.PI)), 0.45 * R, N)));
    const fin = [[-L / 2 - 0.01, 0], [-L / 2 + 0.07, -1.7 * R], [-L / 2 + 0.11, 0], [-L / 2 + 0.07, 1.7 * R]];
    hex("squid", [...fin.map(([a, b]) => F(a, b, -0.004)), ...fin.map(([a, b]) => F(a, b, 0.004))]);
    for (const sg of [-1, 1]) disc("dark", F, L / 2 + 0.03, sg * 0.5 * R, 0.42 * R + 0.003, 0.009, 6);
    for (let k = 0; k < 8; k++) {
      const spread = (k / 7 - 0.5) * 1.6, len = k === 0 || k === 7 ? 0.17 : 0.11;
      const pts = [0, 0.33, 0.66, 1].map((u) => F(L / 2 + 0.07 + u * len, (k / 7 - 0.5) * 0.04 + spread * u * 0.07, -0.004));
      tube("squid", pts, [0.008, 0.007, 0.005, 0.002], 4);
    }
  }
  function scallop(bx, x, s, yaw) {
    const F = frameOn(bx, x, s, yaw, -0.004), R = 0.058, N = 16;
    const rings = [[F(0, 0, 0.026)]];
    for (const [lat, rr] of [[0.45, 0.55], [0.8, 0.88], [1, 1]]) {
      rings.push(Array.from({ length: N }, (_, k) => {
        const p = (k / N) * TAU, rib = 1 + 0.07 * Math.cos(12 * p), fan = 1 - 0.18 * Math.max(0, -Math.cos(p)) ** 3;
        return F(R * rr * rib * fan * Math.cos(p), R * rr * rib * fan * Math.sin(p), 0.026 * Math.cos((lat * Math.PI) / 2));
      }));
    }
    loft("squid", rings);
    const ear = [[-R * 0.75, -0.035], [-R * 1.15, -0.03], [-R * 1.15, 0.03], [-R * 0.75, 0.035]];
    hex("squid", [...ear.map(([a, b]) => F(a, b, 0)), ...ear.map(([a, b]) => F(a, b, 0.008))]);
  }
  function mussel(bx, x, s, yaw) {
    const F = frameOn(bx, x, s, yaw, 0.004), N = 8, rings = [[F(0.045, 0, 0)]];
    for (const t of [0.15, 0.4, 0.7, 0.92]) {
      const a = 0.045 - t * 0.085, w = 0.024 * Math.sin(Math.PI * Math.min(0.95, t * 0.85 + 0.12));
      rings.push(ringAt(F(a, 0, 0.004), nrm(sub(F(0, 1, 0), F(0, 0, 0))), nrm(sub(F(0, 0, 1), F(0, 0, 0))), w, 0.6 * w, N));
    }
    rings.push([F(-0.044, 0, 0.004)]);
    loft("dark", rings);
  }
  const bxAt = (i, j) => boxes[i + 3 * j];
  // back row: sea bream (red), a big yellowtail (green), squid
  { const b = bxAt(0, 0); fish("stripe", b, b.cx - 0.17, b.cs - 0.11, 0.25, 0.34, 0.15); fish("stripe", b, b.cx + 0.2, b.cs - 0.06, -0.2, 0.36, 0.16); fish("stripe", b, b.cx, b.cs + 0.12, 3.14 + 0.1, 0.36, 0.16); }
  { const b = bxAt(1, 0); fish("fishG", b, b.cx + 0.05, b.cs - 0.05, 0.12, 0.68, 0.19, "line"); fish("fishG", b, b.cx - 0.1, b.cs + 0.15, Math.PI - 0.08, 0.5, 0.15, "line"); }
  { const b = bxAt(2, 0); squid(b, b.cx - 0.2, b.cs - 0.12, 0.1); squid(b, b.cx + 0.18, b.cs - 0.1, -0.15); squid(b, b.cx - 0.2, b.cs + 0.12, 0.05); squid(b, b.cx + 0.18, b.cs + 0.13, -0.05); }
  // front row: mackerel (green, back bars), scallops and mussels, horse mackerel (white, lateral line)
  { const b = bxAt(0, 1); for (let k = 0; k < 4; k++) fish("fishG", b, b.cx + (k % 2 ? 0.08 : -0.06), b.cs - 0.18 + k * 0.115, k % 2 ? Math.PI : 0, 0.36, 0.1, "bars"); }
  {
    const b = bxAt(1, 1);
    const SC = [[-0.3, -0.12, 0.3], [-0.16, -0.14, -0.2], [-0.02, -0.12, 0.5], [0.12, -0.15, 0], [-0.24, 0.0, 1.2], [-0.09, 0.0, -0.6], [0.06, 0.0, 0.9]];
    for (const [dx, ds, y] of SC) scallop(b, b.cx + dx, b.cs + ds, y);
    const MU = [[0.25, -0.15, 0.4], [0.33, -0.08, -0.6], [0.22, 0.0, 1.9], [0.32, 0.06, 0.2], [-0.28, 0.13, 2.4], [-0.17, 0.14, 0.9], [-0.06, 0.13, -0.3], [0.05, 0.14, 1.4], [0.18, 0.13, 2.8]];
    for (const [dx, ds, y] of MU) mussel(b, b.cx + dx, b.cs + ds, y);
  }
  { const b = bxAt(2, 1); for (let k = 0; k < 5; k++) fish("fishW", b, b.cx + (k % 2 ? 0.07 : -0.05), b.cs - 0.19 + k * 0.09, k % 2 ? Math.PI + 0.05 : -0.05, 0.27, 0.075, "back"); }

  // ---------- awning ----------
  const AZ0 = ZF + 0.03, AZ1 = 1.45, AY0 = 2.42, AY1 = 2.07, AT = 0.03, AX = 1.9;
  const aY = (z) => AY0 + ((AY1 - AY0) * (z - AZ0)) / (AZ1 - AZ0);
  hex("white", [[-AX, AY0 - AT, AZ0], [AX, AY0 - AT, AZ0], [AX, AY1 - AT, AZ1], [-AX, AY1 - AT, AZ1], [-AX, AY0, AZ0], [AX, AY0, AZ0], [AX, AY1, AZ1], [-AX, AY1, AZ1]]);
  const VZ = AZ1, VT = 0.02, VY0 = 1.9;
  box("white", -AX, AX, VY0, AY1, VZ, VZ + VT); // valance
  const nTop = nrm([0, AZ1 - AZ0, AY0 - AY1]), off = 0.003, NSTR = 12, SW = (2 * AX) / NSTR;
  for (let k = 0; k < NSTR; k += 2) {
    const xa = -AX + k * SW + 0.004, xb = xa + SW - 0.008;
    const T = (x, z, d) => add([x, aY(z), z], mul(nTop, d));
    quad("stripe", T(xa, AZ0, off), T(xb, AZ0, off), T(xb, AZ1, off), T(xa, AZ1, off), T(0, 0.9, -1));
    quad("stripe", T(xa, AZ0, -AT - off), T(xb, AZ0, -AT - off), T(xb, AZ1, -AT - off), T(xa, AZ1, -AT - off), T(0, 0.9, 1));
    quad("stripe", [xa, VY0, VZ + VT + off], [xb, VY0, VZ + VT + off], [xb, AY1 + 0.002, VZ + VT + off], [xa, AY1 + 0.002, VZ + VT + off], [0, 2, 0]);
    quad("stripe", [xa, VY0, VZ - off], [xb, VY0, VZ - off], [xb, AY1 - AT, VZ - off], [xa, AY1 - AT, VZ - off], [0, 2, 3]);
  }
  // pipe frame under the awning
  for (const s of [-1, 1]) cyl("frame", [s * (AX - 0.06), aY(AZ0) - AT - 0.03, AZ0], [s * (AX - 0.06), aY(AZ1 - 0.05) - AT - 0.03, AZ1 - 0.05], 0.02, 6);
  cyl("frame", [-AX + 0.04, aY(AZ1 - 0.05) - AT - 0.03, AZ1 - 0.05], [AX - 0.04, aY(AZ1 - 0.05) - AT - 0.03, AZ1 - 0.05], 0.02, 6);
  const BZ = 0.95, BY = aY(BZ) - AT - 0.03;
  cyl("frame", [-AX + 0.04, BY, BZ], [AX - 0.04, BY, BZ], 0.02, 6);

  // ---------- back of the shop ----------
  // a tall back counter (the shopkeeper's side is raised), so its top shows over the display
  const CX0 = -1.35, CX1 = 0.75, CZ0 = ZB, CZ1 = ZB + 0.6, CH = 1.38;
  box("frame", CX0, CX1, FL, CH - 0.04, CZ0, CZ1 - 0.03);
  box("white", CX0 - 0.02, CX1 + 0.02, CH - 0.04, CH, CZ0, CZ1);
  // cutting board leaning on the wall behind the counter top, a knife lying on the counter in front of it
  hex("styro", [[-0.6, CH, CZ0 + 0.08], [0.05, CH, CZ0 + 0.08], [0.05, CH, CZ0 + 0.13], [-0.6, CH, CZ0 + 0.13],
    [-0.6, CH + 0.4, CZ0 + 0.0], [0.05, CH + 0.4, CZ0 + 0.0], [0.05, CH + 0.4, CZ0 + 0.045], [-0.6, CH + 0.4, CZ0 + 0.045]]);
  const KZ = CZ0 + 0.3;
  box("dark", -0.12, 0.02, CH, CH + 0.03, KZ - 0.017, KZ + 0.017);                  // knife handle
  hex("white", [[-0.42, CH, KZ - 0.012], [-0.12, CH, KZ - 0.028], [-0.12, CH, KZ + 0.028], [-0.42, CH, KZ + 0.004],
    [-0.42, CH + 0.012, KZ - 0.012], [-0.12, CH + 0.012, KZ - 0.028], [-0.12, CH + 0.012, KZ + 0.028], [-0.42, CH + 0.012, KZ + 0.004]]); // blade
  // dial scale: red body, white dial facing the street, dark needle, steel pan
  const SX = -0.95, SZ = CZ0 + 0.3;
  box("red", SX - 0.15, SX + 0.15, CH, CH + 0.1, SZ - 0.13, SZ + 0.13);
  box("red", SX - 0.1, SX + 0.1, CH + 0.1, CH + 0.3, SZ + 0.04, SZ + 0.12);
  loft("red", [ringAt([SX, CH + 0.22, SZ + 0.12], [1, 0, 0], [0, 1, 0], 0.12, 0.12, 14), ringAt([SX, CH + 0.22, SZ + 0.16], [1, 0, 0], [0, 1, 0], 0.12, 0.12, 14)]);
  { const o = [SX, CH + 0.22, SZ + 0.165], R = ringAt(o, [1, 0, 0], [0, 1, 0], 0.095, 0.095, 14); for (let k = 0; k < 14; k++) tri("white", o, R[k], R[(k + 1) % 14], [SX, CH + 0.22, SZ]); }
  quad("dark", [SX - 0.004, CH + 0.22, SZ + 0.168], [SX + 0.004, CH + 0.22, SZ + 0.168], [SX + 0.05, CH + 0.29, SZ + 0.168], [SX + 0.044, CH + 0.294, SZ + 0.168], [SX, CH + 0.2, SZ]);
  cyl("white", [SX, CH + 0.3, SZ - 0.02], [SX, CH + 0.33, SZ - 0.02], 0.02, 6);
  loft("white", [ringAt([SX, CH + 0.33, SZ - 0.02], [1, 0, 0], [0, 0, 1], 0.17, 0.15, 14), ringAt([SX, CH + 0.37, SZ - 0.02], [1, 0, 0], [0, 0, 1], 0.2, 0.18, 14)]);
  // apron on a hook on the -X wall interior, facing +X
  const WX = -XW + 0.05, AZc = -0.62;
  cyl("dark", [WX, 2.12, AZc], [WX + 0.06, 2.14, AZc], 0.012, 5);
  tube("dark", [[WX + 0.05, 2.14, AZc], [WX + 0.035, 2.06, AZc - 0.09], [WX + 0.03, 1.96, AZc - 0.12]], 0.007, 4);
  tube("dark", [[WX + 0.05, 2.14, AZc], [WX + 0.035, 2.06, AZc + 0.09], [WX + 0.03, 1.96, AZc + 0.12]], 0.007, 4);
  {
    const rows = [[2.0, 0.12, 0.03], [1.72, 0.13, 0.036], [1.7, 0.24, 0.04], [1.3, 0.25, 0.05], [1.0, 0.26, 0.052]];
    const P = rows.map(([y, hw, o]) => [[WX + o, y, AZc - hw], [WX + o, y, AZc + hw]]);
    for (let i = 0; i + 1 < P.length; i++) {
      const [a0, a1] = P[i], [b0, b1] = P[i + 1];
      const q = (d) => (p) => [p[0] + d, p[1], p[2]];
      hex("apron", [a0, a1, b1, b0].map(q(0)).concat([a0, a1, b1, b0].map(q(0.012))));
    }
  }
  // waist tie across the apron
  box("dark", WX + 0.04, WX + 0.065, 1.67, 1.71, AZc - 0.27, AZc + 0.27);
  // white rubber boots by the -X post, beside the display, toes to the street
  for (const bz of [0.02, 0.27]) {
    const bxp = -1.67;
    cyl("white", [bxp, FL, bz], [bxp, FL + 0.38, bz], 0.062, 10);
    loft("white", [ringAt([bxp, FL + 0.38, bz], [1, 0, 0], [0, 0, 1], 0.068, 0.068, 10), ringAt([bxp, FL + 0.405, bz], [1, 0, 0], [0, 0, 1], 0.07, 0.07, 10)]);
    hex("white", [[bxp - 0.055, FL, bz - 0.08], [bxp + 0.055, FL, bz - 0.08], [bxp + 0.05, FL, bz + 0.16], [bxp - 0.05, FL, bz + 0.16],
      [bxp - 0.055, FL + 0.12, bz - 0.08], [bxp + 0.055, FL + 0.12, bz - 0.08], [bxp + 0.045, FL + 0.07, bz + 0.16], [bxp - 0.045, FL + 0.07, bz + 0.16]]);
  }
  // a tall blank sign board on the +X wall by the front corner (red frame, white face), on two dark brackets
  box("red", XW + 0.08, XW + 0.13, 1.95, 2.92, ZF - 0.52, ZF - 0.04);
  box("white", XW + 0.13, XW + 0.136, 2.03, 2.84, ZF - 0.45, ZF - 0.11);
  for (const y of [2.1, 2.78]) box("dark", XW + 0.05, XW + 0.08, y - 0.025, y + 0.025, ZF - 0.33, ZF - 0.23);

  // ---------- street: wet pavement, joints, puddles, the hose ----------
  const PV = 0.03;
  for (let x = -1.5; x <= 1.51; x += 0.5)
    quad("wet", [x - 0.008, PV + 0.002, ZF + 0.06], [x + 0.008, PV + 0.002, ZF + 0.06], [x + 0.008, PV + 0.002, 1.77], [x - 0.008, PV + 0.002, 1.77], [x, -1, 1]);
  for (const z of [1.07, 1.57])
    quad("wet", [-XW - 0.09, PV + 0.002, z - 0.008], [XW + 0.09, PV + 0.002, z - 0.008], [XW + 0.09, PV + 0.002, z + 0.008], [-XW - 0.09, PV + 0.002, z + 0.008], [0, -1, z]);
  for (const [x, z, rx, rz, ph] of [[0.55, 1.3, 0.42, 0.22, 0.7], [1.45, 1.05, 0.25, 0.16, 2.3], [-0.2, 1.62, 0.3, 0.1, 4.1], [-1.45, 1.6, 0.22, 0.12, 1.4]])
    blob("wet", x, z, rx, rz, PV + 0.004, ph);
  // hose: a flat spiral coil, its outer end running to a tap on the -X post
  const HX = -0.95, HZ = 1.3, HR = 0.019, HY = PV + HR;
  const coil = [];
  for (let k = 0; k <= 64; k++) { const a = (k / 64) * 2.6 * TAU, r = 0.12 + 0.05 * (a / TAU); coil.push([HX + r * Math.cos(a), HY, HZ + r * Math.sin(a)]); }
  const tapY = 0.55, tapP = [-XW + 0.07, tapY, ZF + 0.02];
  const lead = [[HX + 0.27, HY, HZ + 0.12], [HX + 0.2, HY, 1.62], [HX - 0.25, HY, 1.66], [-1.6, HY, 1.3], [-1.75, HY, 0.75], [-1.72, HY + 0.02, 0.6], [-1.7, 0.2, 0.58], [-1.7, 0.45, 0.58], [tapP[0] + 0.03, tapY - 0.04, tapP[2] + 0.11]];
  tube("wall", coil.concat(lead), HR, 6);
  const tg = sub(coil[1], coil[0]);
  cyl("frame", add(coil[0], mul(nrm(tg), 0.02)), add(coil[0], mul(nrm(tg), -0.06)), 0.024, 6); // nozzle at the inner end
  cyl("frame", [tapP[0], tapY, tapP[2] + 0.05], [tapP[0], tapY, tapP[2] + 0.14], 0.022, 6);   // tap
  cyl("frame", [tapP[0], tapY + 0.02, tapP[2] + 0.1], [tapP[0], tapY + 0.07, tapP[2] + 0.1], 0.008, 5);
  box("frame", tapP[0] - 0.04, tapP[0] + 0.04, tapY + 0.07, tapY + 0.085, tapP[2] + 0.09, tapP[2] + 0.11);

  // ---------- bulb template (local: hook at the origin, hangs down -y) ----------
  const bulbParts = [[], []]; // glass (glow), socket + cord (dark)
  {
    const N = 10, CD = 0.2, gl = [[0.016, -0.24], [0.022, -0.255], [0.042, -0.285], [0.05, -0.31], [0.046, -0.335], [0.03, -0.352]].map(([r, y]) => [r, y - CD]);
    sink = bulbParts[0];
    loft("glow", [ringAt([0, -0.236 - CD, 0], [1, 0, 0], [0, 0, 1], 0.015, 0.015, N), ...gl.map(([r, y]) => ringAt([0, y, 0], [1, 0, 0], [0, 0, 1], r, r, N)), [[0, -0.358 - CD, 0]]]);
    sink = bulbParts[1];
    cyl("dark", [0, -0.19 - CD, 0], [0, -0.245 - CD, 0], 0.021, 8);
    cyl("dark", [0, 0.02, 0], [0, -0.195 - CD, 0], 0.005, 4);
    sink = null;
  }
  const bulbAt = [-1.25, -0.42, 0.42, 1.25].map((x) => [x, BY - 0.012, BZ]);

  // ---------- meshes: one per material pair ----------
  const FLAT = -1;
  const MAT = {
    white: [c.white, c.whiteShade, 0.2, true],
    ice: [c.ice, c.iceShade, 0.8, true],
    stripe: [c.red, c.red, FLAT, false],
    red: [c.red, c.redShade, 0.35, true],
    styro: [c.styro, c.styroShade, 0.35, true],
    frame: [c.frame, c.frameShade, 0.35, true],
    wall: [c.wall, c.wallShade, 0.35, true],
    pave: [c.pave, c.pave, 0.35, true],
    squid: [c.squid, c.squidShade, 0.2, false],
    fishG: [c.frame, c.frameShade, 0.35, false],
    fishW: [c.white, c.whiteShade, 0.2, false],
    apron: [c.apron, c.apronShade, 0.35, true],
    glow: [c.glow, c.glow, FLAT, true],
    dark: [c.dark, c.dark, 0.35, false],
    wet: [c.wet, c.wet, FLAT, false],
  };
  const merged = {};
  for (const [key, arr] of Object.entries(soups)) if (arr.length) (merged[key] ??= []).push(...arr);
  const LPART = ["glow", "dark"];
  const bulbs = bulbAt.map((p) => ({
    p,
    ranges: LPART.map((key, gi) => {
      const arr = (merged[key] ??= []), start = arr.length;
      for (let v = 0; v < bulbParts[gi].length; v += 3) arr.push(bulbParts[gi][v] + p[0], bulbParts[gi][v + 1] + p[1], bulbParts[gi][v + 2] + p[2]);
      return { key, start, local: bulbParts[gi] };
    }),
  }));
  const meshes = {};
  for (const [key, arr] of Object.entries(merged)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, { threshold, outline });
    mesh.name = key;
    set.add(mesh);
    meshes[key] = mesh;
  }
  for (const l of bulbs)
    for (const r of l.ranges) {
      const g = meshes[r.key].geometry, n = r.local.length;
      r.normal = g.attributes.normal.array.slice(r.start, r.start + n);
      if (g.attributes.hullNormal) r.hull = g.attributes.hullNormal.array.slice(r.start, r.start + n);
    }
  const pivots = bulbs.map((l, i) => {
    const pv = new THREE.Group();
    pv.name = `bulb${i}`;
    pv.position.set(...l.p);
    set.add(pv);
    joints[pv.name] = pv;
    return pv;
  });
  const v3 = new THREE.Vector3(), m3 = new THREE.Matrix3();
  function writeBulbs() {
    const touched = new Set();
    bulbs.forEach((l, i) => {
      const pv = pivots[i];
      pv.updateMatrix();
      m3.setFromMatrix4(pv.matrix);
      for (const r of l.ranges) {
        const g = meshes[r.key].geometry, P = g.attributes.position.array, N = g.attributes.normal.array, Hn = g.attributes.hullNormal?.array;
        for (let v = 0; v < r.local.length; v += 3) {
          v3.set(r.local[v], r.local[v + 1], r.local[v + 2]).applyMatrix4(pv.matrix);
          P[r.start + v] = v3.x; P[r.start + v + 1] = v3.y; P[r.start + v + 2] = v3.z;
          v3.set(r.normal[v], r.normal[v + 1], r.normal[v + 2]).applyMatrix3(m3);
          N[r.start + v] = v3.x; N[r.start + v + 1] = v3.y; N[r.start + v + 2] = v3.z;
          if (Hn && r.hull) {
            v3.set(r.hull[v], r.hull[v + 1], r.hull[v + 2]).applyMatrix3(m3);
            Hn[r.start + v] = v3.x; Hn[r.start + v + 1] = v3.y; Hn[r.start + v + 2] = v3.z;
          }
        }
        touched.add(r.key);
      }
    });
    for (const key of touched) {
      const g = meshes[key].geometry;
      g.attributes.position.needsUpdate = true;
      g.attributes.normal.needsUpdate = true;
      if (g.attributes.hullNormal) g.attributes.hullNormal.needsUpdate = true;
      g.computeBoundingSphere();
      g.computeBoundingBox();
    }
  }

  // ---------- pose and clip ----------
  // Sign convention: +rz swings a bulb's bottom toward +x (across the shop), +rx toward -z (into the shop).
  const CLIPS = { sway: 3 };
  function apply(ph) {
    pivots.forEach((pv, i) => {
      if (ph === null) return pv.rotation.set(0, 0, 0);
      pv.rotation.set(3 * D2R * Math.sin(TAU * (ph - i * 0.09) + 1.1), 0, 10 * D2R * Math.sin(TAU * (ph - i * 0.13)));
    });
    writeBulbs();
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`sakanaya: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      const Tn = CLIPS[m[1]];
      return apply((((+m[2] % Tn) + Tn) % Tn) / Tn);
    }
    if (name !== "rest") throw new Error(`sakanaya: unknown pose "${name}" (rest, or sway@<seconds>)`);
    apply(null);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
