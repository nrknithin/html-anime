// kaisatsu.js - a Japanese station ticket-gate line (kaisatsu) at real size: a row of automatic gates with flap doors,
// an attendant window booth at one end, a hanging blank direction sign, a tiled floor patch. Static set piece with
// one joint per flap door.
// Contract: harness/lab/README.md. Meters, +Y up, stands on y = 0, centred on x = 0, z = 0 (re-centred on its own bbox,
// so every option stays centred). Authored with the entry side toward +Z (passengers walk toward -Z), then turned 90
// degrees so the entry faces +X, the lit side: the lab's hero camera (52 degrees off +Z, eye level) then looks down the
// lanes at 38 degrees and sees the closed flaps; facing +Z it saw only cabinet flanks. The gate line runs along world Z,
// the booth at world -Z.
//
// Construction (axes below are the authored ones; boxes, wedges and flat quads as triangle soups merged per material, flat-shaded; the flaps are the only
// separate meshes, one per joint, because each one swings):
//   FLOOR    a 3 cm slab in pale tiles with a checker of 0.6 m tiles laid 2 mm proud on top, and a yellow tactile
//            (tenji) strip leading through the wide lane.
//   GATES    gates + 1 cabinets, 1.8 m long, 0.26 m wide, 1.05 m at the entry head. Each is a pale body on a navy kick
//            plinth under a navy top panel; the entry end carries a raised navy head whose slope faces the passenger,
//            with a glowing pale-blue IC-card pad on it (on the cabinet to the walker's right, as in Japan). A ticket
//            slot plate on the top panel and a ticket exit plate near the far end; two small blank indicator lights on
//            each end face (amber and red, glowing).
//   FLAPS    two paddle doors per lane, one out of each cabinet side, meeting with a 6 cm gap. Each hinges on a
//            vertical axis 6 cm inside the cabinet wall, 0.4 m behind the entry face; open = 1 swings it 90 degrees
//            downstream into the cabinet (hidden, its top under the top panel), open = 0 closes the lane. The last lane
//            (authored +X, next to the booth) is the 0.9 m wide lane.
//   BOOTH    the attendant booth at the wide-lane end (authored at -X, then mirrored about the lane centre): pale
//            lower wall, a navy-framed window band facing the lanes and the entry (+Z) with a counter ledge, a navy
//            roof slab.
//   SIGN     a navy header beam from a stub on the booth roof to a steel column past the last cabinet; a navy direction
//            board hangs from it on two rods, its +Z face carrying pale pictograms only (left arrow, a train in side view,
//            an up arrow): no lettering.
//   Every closed part is wound from its own centre (convex parts) or by ExtrudeGeometry (the flaps), never by hand.
// Proportions (real size, base unit the cabinet height G = 1.05 m): cabinet 1.8 x 0.26 (1.7 G x 0.25 G), body to 0.9,
// top panel 0.9-0.95, head 0.98-1.07 over the last 0.45 m; lanes 0.6 (wide lane 0.9); flaps 0.42-0.93 high; booth
// 1.6 x 2.2 x 2.5; header beam 2.75-2.9 (meta.height); sign 2.6 x 0.5, 2.05-2.55; floor patch 1 m past the booth and column.
// Options: build(THREE, kit, colors, { height, gates, open }): height scales everything uniformly (meta.height = the
// beam top); gates 4..6 lanes (default 5); open 0..1 flap opening (default 0, closed lanes read as gates at a glance).
// Poses: rest (flaps at opts.open), open (all stowed), closed (all across the lanes).
// Colours (indigo, the station-platform's script): floor sclera #f6f3ee / moon #d5e2ff, checker tiles line #e7eefc /
// moon; tactile practical #f0c36a / iris #e7a04a; cabinet bodies and booth walls sclera / moon at 0.1 so faces square
// to the camera stay lit; navy parts (top panels, heads, plinths, frames, roof, beam, sign board) sky #1b2d6b / hair
// #16141c; IC pad moon / line glowing (-0.25); lights practical / iris and accent #e23b4a / iris glowing; slot plates and
// steel column moon / sky at 0.35; window glass line / moon; pictograms sclera / moon; flaps accent / iris.

export const meta = {
  name: "kaisatsu",
  height: 2.9,
  script: "indigo",
  colors: {
    floor: "#f6f3ee", floorShade: "#d5e2ff",
    tile: "#e7eefc", tileShade: "#d5e2ff",
    tactile: "#f0c36a", tactileShade: "#e7a04a",
    body: "#f6f3ee", bodyShade: "#d5e2ff",
    navy: "#1b2d6b", navyShade: "#16141c",
    pad: "#d5e2ff", padShade: "#e7eefc",
    lamp: "#f0c36a", lampShade: "#e7a04a",
    stop: "#e23b4a", stopShade: "#e7a04a",
    steel: "#d5e2ff", steelShade: "#1b2d6b",
    glass: "#e7eefc", glassShade: "#d5e2ff",
    picto: "#f6f3ee", pictoShade: "#d5e2ff",
    flap: "#e23b4a", flapShade: "#e7a04a",
  },
  poses: ["rest", "open", "closed"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height } = opts;
  const N = Math.max(4, Math.min(6, Math.round(opts.gates ?? 5)));
  const OPEN = Math.max(0, Math.min(1, opts.open ?? 0));
  const root = new THREE.Group();
  root.name = "kaisatsu";
  const scale = new THREE.Group(); // uniform size scale lives here, so root stays the plain contract node
  scale.name = "scale";
  scale.scale.setScalar(height / meta.height);
  root.add(scale);
  const turn = new THREE.Group(); // the set is authored with the entry toward +Z, then turned so it faces +X
  turn.name = "turn";
  turn.rotation.y = Math.PI / 2;
  scale.add(turn);
  const body = new THREE.Group(); // shifted to centre the content's bbox on x = 0, z = 0
  body.name = "body";
  turn.add(body);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  function tri(key, a, b, e, ref) { // wound away from ref, a point inside the solid
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
  function bx(key, x0, y0, z0, x1, y1, z1) {
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // a flat plate on the plane z = zz facing +Z (front pictograms), from a 2D polygon in (x, y)
  function plateZ(key, pts, zz) {
    const ref = [pts[0][0], pts[0][1], zz - 1];
    for (let i = 1; i < pts.length - 1; i++) tri(key, [...pts[0], zz], [...pts[i], zz], [...pts[i + 1], zz], ref);
  }

  // ---------- layout ----------
  const F = 0.03; // floor top
  const W = 0.26, LEN = 1.8, Z0 = -LEN / 2, Z1 = LEN / 2; // cabinet width, length, z extent
  const lanes = [];
  for (let i = 0; i < N; i++) lanes.push(i === N - 1 ? 0.9 : 0.6);
  const cx = [W / 2];
  for (let i = 0; i < N; i++) cx.push(cx[i] + W + lanes[i]);
  const XL = 0, XR = cx[N] + W / 2; // outer faces of the end cabinets
  const BX1 = XL - 0.45, BX0 = BX1 - 1.6, BZ0 = -1.1, BZ1 = 1.1, BH = 2.5; // booth
  const PX = XR + 0.55; // steel column
  const FX0 = XL + XR - PX - 1.0, FX1 = XL + XR - BX0 + 1.0, FZ0 = -2.4, FZ1 = 2.6; // floor patch

  // ---------- floor ----------
  bx("floor", FX0, 0, FZ0, FX1, F, FZ1);
  {
    const T = 0.6;
    for (let i = 0; FX0 + i * T < FX1 - 1e-6; i++)
      for (let j = 0; FZ0 + j * T < FZ1 - 1e-6; j++) {
        if ((i + j) % 2) continue;
        const x0 = FX0 + i * T, z0 = FZ0 + j * T, x1 = Math.min(FX1, x0 + T), z1 = Math.min(FZ1, z0 + T);
        quad("tile", [x0, F + 0.002, z0], [x1, F + 0.002, z0], [x1, F + 0.002, z1], [x0, F + 0.002, z1], [x0, 0, z0]);
      }
    // tactile strip through the wide lane
    const tx = (cx[N - 1] + cx[N]) / 2;
    bx("tactile", tx - 0.15, F, FZ0 + 0.05, tx + 0.15, F + 0.012, FZ1 - 0.05);
  }

  // ---------- cabinets ----------
  const HZ = Z1 - 0.45; // head starts
  for (let k = 0; k <= N; k++) {
    const x0 = cx[k] - W / 2, x1 = cx[k] + W / 2;
    bx("navy", x0 + 0.015, F, Z0 + 0.015, x1 - 0.015, F + 0.08, Z1 - 0.015); // kick plinth
    bx("body", x0, F + 0.08, Z0, x1, 0.9, Z1); // body
    bx("navy", x0 - 0.01, 0.9, Z0 - 0.01, x1 + 0.01, 0.95, HZ); // top panel
    bx("navy", x0 - 0.006, 0.8, Z0 + 0.1, x1 + 0.006, 0.84, HZ - 0.05); // side band under the top
    // entry head: a wedge whose slope faces the passenger (+Z, up)
    const yb = 0.9, yf = 0.98, yk = 1.07, zf = Z1 + 0.01, zk = HZ;
    hex("navy", [[x0 - 0.01, yb, zk], [x1 + 0.01, yb, zk], [x1 + 0.01, yb, zf], [x0 - 0.01, yb, zf],
      [x0 - 0.01, yk, zk], [x1 + 0.01, yk, zk], [x1 + 0.01, yf, zf], [x0 - 0.01, yf, zf]]);
    // IC pad on the slope for the lane on this cabinet's +X side (the walker's right is -X)
    if (k < N) {
      const at = (x, t, h) => { // t 0 = back edge of the slope, 1 = front edge; h = height off the slope
        const z = zk + (zf - zk) * t, y = yk + (yf - yk) * t;
        const L = Math.hypot(zf - zk, yf - yk), ny = (zf - zk) / L, nz = -(yf - yk) / L;
        return [x, y + ny * h, z + nz * h];
      };
      const pa = x0 + 0.03, pb = x1 - 0.03, ta = 0.18, tb = 0.82;
      hex("pad", [at(pa, ta, 0), at(pb, ta, 0), at(pb, tb, 0), at(pa, tb, 0),
        at(pa, ta, 0.012), at(pb, ta, 0.012), at(pb, tb, 0.012), at(pa, tb, 0.012)]);
      // ticket slot plate on the top panel, a navy slot across it
      bx("steel", x0 + 0.04, 0.95, HZ - 0.32, x1 - 0.04, 0.958, HZ - 0.12);
      bx("navy", x0 + 0.07, 0.958, HZ - 0.24, x1 - 0.07, 0.962, HZ - 0.2);
      // ticket exit plate near the far end
      bx("steel", x0 + 0.05, 0.95, Z0 + 0.12, x1 - 0.05, 0.958, Z0 + 0.3);
    }
    // blank indicator lights on both end faces
    for (const [zz, s] of [[Z1, 1], [Z0, -1]]) {
      bx("navy", x0 + 0.03, 0.56, zz - s * 0.01, x1 - 0.03, 0.88, zz + s * 0.008); // end display panel
      bx("lamp", cx[k] - 0.085, 0.74, zz - s * 0.01, cx[k] - 0.015, 0.83, zz + s * 0.016);
      bx("stop", cx[k] + 0.015, 0.74, zz - s * 0.01, cx[k] + 0.085, 0.83, zz + s * 0.016);
      bx("pad", cx[k] - 0.07, 0.6, zz - s * 0.01, cx[k] + 0.07, 0.66, zz + s * 0.016); // a blank lit strip
    }
    // a small lamp on top of the head's back edge
    bx("lamp", cx[k] - 0.05, yk, zk - 0.005, cx[k] + 0.05, yk + 0.025, zk + 0.06);
  }

  // the booth, beam and column are drawn as if at the -X end, then mirrored about the lane centre to the +X end, so the
  // wide lane sits next to the attendant's window (bx is shadowed; winding still comes from each part's own centre)
  const MX = XL + XR;
  const bxm = (key, x0, y0, z0, x1, y1, z1) => bx(key, MX - x1, y0, z0, MX - x0, y1, z1);
  // ---------- booth ----------
  {
    const bx = bxm;
    const wy = 1.0, wt = 2.05;
    bx("navy", BX0 + 0.02, F, BZ0 + 0.02, BX1 - 0.02, F + 0.1, BZ1 - 0.02); // plinth
    bx("body", BX0, F + 0.1, BZ0, BX1, wy, BZ1); // lower wall
    bx("body", BX0, wt, BZ0, BX1, BH - 0.12, BZ1); // upper wall
    bx("body", BX0, wy, BZ0, BX0 + 0.12, wt, BZ1); // back (-X) wall
    bx("body", BX0, wy, BZ0, BX1, wt, BZ0 + 0.12); // -Z wall
    bx("navy", BX0 - 0.05, BH - 0.12, BZ0 - 0.05, BX1 + 0.05, BH, BZ1 + 0.05); // roof slab
    // glass, inset, on +X and +Z
    bx("glass", BX1 - 0.07, wy, BZ0 + 0.12, BX1 - 0.04, wt, BZ1 - 0.04);
    bx("glass", BX0 + 0.12, wy, BZ1 - 0.07, BX1 - 0.04, wt, BZ1 - 0.04);
    // frames: corner post, mullions, sill and head
    bx("navy", BX1 - 0.08, wy, BZ1 - 0.08, BX1 + 0.01, wt, BZ1 + 0.01);
    for (const z of [BZ0 + 0.12, (BZ0 + BZ1) / 2]) bx("navy", BX1 - 0.04, wy, z - 0.03, BX1 + 0.01, wt, z + 0.03);
    bx("navy", (BX0 + BX1) / 2 - 0.03, wy, BZ1 - 0.04, (BX0 + BX1) / 2 + 0.03, wt, BZ1 + 0.01);
    bx("navy", BX0 + 0.1, wy, BZ1 - 0.04, BX0 + 0.16, wt, BZ1 + 0.01);
    bx("navy", BX0 + 0.1, wt - 0.05, BZ0 + 0.1, BX1 + 0.01, wt + 0.01, BZ1 + 0.01); // head
    // counter ledge on the lane side and the entry side
    bx("navy", BX1 - 0.02, wy - 0.04, BZ0 + 0.1, BX1 + 0.2, wy, BZ1 + 0.02);
    bx("navy", BX0 + 0.08, wy - 0.04, BZ1 - 0.02, BX1 + 0.2, wy, BZ1 + 0.2);
    // speaking slot plate in the +X glass
    bx("steel", BX1 - 0.04, wy + 0.18, (BZ0 + BZ1) / 2 + 0.25, BX1 + 0.005, wy + 0.4, (BZ0 + BZ1) / 2 + 0.6);
  }

  // ---------- header beam, column, direction sign ----------
  {
    const bx = bxm;
    const by0 = 2.75, by1 = 2.9, bz0 = -0.1, bz1 = 0.1;
    bx("navy", BX1 - 0.5, BH, bz0 + 0.02, BX1 - 0.2, by0, bz1 - 0.02); // stub on the booth roof
    bx("navy", BX1 - 0.55, by0, bz0, PX + 0.1, by1, bz1); // beam
    bx("steel", PX - 0.07, F, -0.07, PX + 0.07, by0, 0.07); // column
    bx("steel", PX - 0.11, F, -0.11, PX + 0.11, F + 0.18, 0.11); // column foot
    const sx0 = (XL + XR) / 2 - 1.3, sx1 = sx0 + 2.6, sy0 = 2.05, sy1 = 2.55, sz = 0;
    for (const x of [sx0 + 0.3, sx1 - 0.3]) bxm("steel", x - 0.015, sy1, sz - 0.015, x + 0.015, by0, sz + 0.015);
    bx("navy", sx0, sy0, sz - 0.04, sx1, sy1, sz + 0.04);
    const zz = sz + 0.042, my = (sy0 + sy1) / 2;
    // left arrow
    const ax = sx0 + 0.3;
    plateZ("picto", [[ax - 0.17, my], [ax - 0.02, my + 0.16], [ax - 0.02, my - 0.16]], zz);
    plateZ("picto", [[ax - 0.03, my - 0.055], [ax + 0.18, my - 0.055], [ax + 0.18, my + 0.055], [ax - 0.03, my + 0.055]], zz);
    // train in side view: a long body with a sloped nose to the +X, windows as navy squares over it, two bogies
    const tx0 = sx0 + 0.75, tx1 = sx1 - 0.75, ty0 = my - 0.12, ty1 = my + 0.15;
    plateZ("picto", [[tx0, ty0], [tx1, ty0], [tx1 + 0.14, ty0 + 0.08], [tx1 + 0.04, ty1], [tx0, ty1]], zz);
    for (let i = 0; i < 4; i++) {
      const wx = tx0 + 0.08 + i * 0.2;
      plateZ("navy", [[wx, my - 0.01], [wx + 0.12, my - 0.01], [wx + 0.12, my + 0.09], [wx, my + 0.09]], zz + 0.003);
    }
    plateZ("navy", [[tx1 - 0.03, my - 0.01], [tx1 + 0.08, my - 0.01], [tx1 + 0.04, my + 0.09], [tx1 - 0.03, my + 0.09]], zz + 0.003);
    plateZ("navy", [[tx0, ty0 + 0.04], [tx1 + 0.1, ty0 + 0.04], [tx1 + 0.11, ty0 + 0.06], [tx0, ty0 + 0.06]], zz + 0.003);
    for (const wx of [tx0 + 0.15, tx1 - 0.15]) {
      plateZ("picto", [[wx - 0.1, ty0 - 0.06], [wx + 0.1, ty0 - 0.06], [wx + 0.1, ty0 - 0.015], [wx - 0.1, ty0 - 0.015]], zz);
    }
    // up arrow
    const ux = sx1 - 0.3;
    plateZ("picto", [[ux, my + 0.19], [ux - 0.16, my + 0.03], [ux + 0.16, my + 0.03]], zz);
    plateZ("picto", [[ux - 0.055, my + 0.04], [ux + 0.055, my + 0.04], [ux + 0.055, my - 0.19], [ux - 0.055, my - 0.19]], zz);
  }

  // ---------- meshes ----------
  const MAT = {
    floor: [c.floor, c.floorShade, 0.1, true],
    tile: [c.tile, c.tileShade, 0.1, false],
    tactile: [c.tactile, c.tactileShade, 0.1, false],
    body: [c.body, c.bodyShade, 0.1, true],
    navy: [c.navy, c.navyShade, 0.35, true],
    pad: [c.pad, c.padShade, -0.25, true],
    lamp: [c.lamp, c.lampShade, -0.25, true],
    stop: [c.stop, c.stopShade, -0.25, true],
    steel: [c.steel, c.steelShade, 0.35, true],
    glass: [c.glass, c.glassShade, 0.1, true],
    picto: [c.picto, c.pictoShade, 0.1, false],
  };
  const meshOf = (arr, key) => {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, { threshold, outline });
    mesh.name = key;
    return mesh;
  };
  for (const [key, arr] of Object.entries(soups)) body.add(meshOf(arr, key));

  // ---------- flaps: one joint each, hinge on a vertical axis 6 cm inside the cabinet wall ----------
  // Sign convention: a flap points along +X (s = 1) or -X (s = -1) when closed; rotation.y = s * a * PI/2 swings it
  // downstream (-Z) into the cabinet when open (a = 1).
  const HZF = 0.5, IN = 0.06, FY0 = 0.42, FY1 = 0.93, GAP = 0.03;
  const flaps = [];
  for (let i = 0; i < N; i++) {
    const reach = lanes[i] / 2 - GAP + IN;
    for (const [s, k, tag] of [[1, i, "L"], [-1, i + 1, "R"]]) {
      const sh = new THREE.Shape();
      const r = 0.12, h = FY1 - FY0;
      sh.moveTo(0, 0);
      sh.lineTo(reach - r, 0);
      sh.absarc(reach - r, r, r, -Math.PI / 2, 0, false);
      sh.lineTo(reach, h - r);
      sh.absarc(reach - r, h - r, r, 0, Math.PI / 2, false);
      sh.lineTo(0, h);
      sh.lineTo(0, 0);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false, curveSegments: 5 });
      g.translate(0, 0, -0.015);
      if (s < 0) g.scale(-1, 1, 1); // mirrored: flip the winding back by reversing each triangle
      const geo = g.index ? g.toNonIndexed() : g;
      if (s < 0) {
        const p = geo.attributes.position.array;
        for (let t = 0; t < p.length; t += 9) for (let q = 0; q < 3; q++) [p[t + 3 + q], p[t + 6 + q]] = [p[t + 6 + q], p[t + 3 + q]];
      }
      geo.translate(0, FY0, 0);
      geo.computeVertexNormals();
      const pivot = new THREE.Group();
      pivot.name = `flap${i}${tag}`;
      const hx = s > 0 ? cx[k] + W / 2 - IN : cx[k] - W / 2 + IN;
      pivot.position.set(hx, 0, HZF);
      const mesh = kit.toon(geo, c.flap, c.flapShade, { threshold: 0.1 });
      mesh.name = "flap";
      pivot.add(mesh);
      body.add(pivot);
      joints[pivot.name] = pivot;
      flaps.push([pivot, s]);
    }
  }

  // centre the content on x = 0, z = 0 (flaps closed or open never leave the bbox of the rest of the set)
  const bb = new THREE.Box3().setFromObject(body);
  body.position.set(-(bb.min.x + bb.max.x) / 2, 0, -(bb.min.z + bb.max.z) / 2);

  const POSES = { rest: OPEN, open: 1, closed: 0 };
  function pose(name) {
    if (!(name in POSES)) throw new Error(`unknown pose "${name}" (rest, open, closed)`);
    const a = POSES[name];
    for (const [p, s] of flaps) p.rotation.set(0, s * a * Math.PI / 2, 0);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
