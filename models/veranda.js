// veranda.js - a Japanese apartment balcony (beranda) at real size: laundry out, futon over the rail. Clip: breeze.
// Contract: harness/lab/README.md. Meters, +Y up, the open (street) side faces +Z, its left is +X, stands on y = 0,
// centred on x = 0, z = 0.
//
// Construction (boxes, sheared slabs, a swept profile and a few three.js primitives, all triangle soups merged per
// material; flat-shaded, so planes read crisp and cloth folds land as facets):
//   SHELL    a concrete slab (its front edge a band 2 cm proud), the solid lower parapet on the front and the +X end
//            under a dark aluminium coping (kasagi: the hull draws no crease, so the cap is the line), dark rail posts
//            every metre and a top rail; the back wall the room sits behind. The -X end is the neighbour's partition
//            board (a blank frosted panel in a dark frame, the gap under it showing the slab).
//   DOOR     a two-leaf aluminium sliding glass door (outer frame, raised sill, two sashes on staggered tracks, the
//            meeting stiles overlapping), pale glass with two diagonal glint strips per pane (no hull), pleated
//            curtains gathered at both sides just behind the glass (zigzag strips, so the pleats land two-tone).
//   AC       the outdoor unit on a dark stand against the wall at -X (raised so its top and grille clear the parapet
//            line in three4; ivory against the frosted partition, never pale on pale): an ivory box, the dark round
//            fan grille with pale horizontal bars, side slots, the white pipe duct up the wall into a cap; a pot on top.
//   LAUNDRY  two poles on wall brackets (wall plate, arm, strut, two saddles). On them deterministic laundry: T-shirts
//            and a long-sleeve on wire hangers, towels folded over the pole, a bath towel, a round peg hanger (ring,
//            spokes, hook, pegs) with socks and a face towel. Every hanging piece is an "item": a pivot on the pole
//            (or on its peg, parented to the hanger) whose vertices are re-posed on the CPU, rigidly, in the merged
//            meshes (positions, normals and hull normals rotated together), so the set stays one mesh per material.
//   FUTON    one closed slab swept along a draped profile: down the inside of the parapet, round the top rail, down
//            the outside; two futon clips (basami) ride over it on the same profile, offset outward.
//   PROPS    a pair of balcony sandals by the sill, potted plants at +X (a tall leafy one that shows over the rail).
//   Every closed part is wound away from a point inside it (its centre, or the facing point on the swept slab).
// Proportions (real size, base unit the floor-to-rail height R = 1.1 m): balcony 4.2 x 1.26 (slab), clear depth
//   1.12 inside the parapet; slab 0-0.15, parapet 0.15-0.95 (0.12 thick), rail top 1.26; door 1.76 x 1.85 on a
//   7 cm sill; AC 0.75 x 0.58 x 0.30; poles at 2.17 (0.30 apart, the outer one 0.58 from the wall); wall top 2.5.
// Options: build(THREE, kit, colors, { height, laundry, futon }).
//   height   scales the set uniformly; height = the wall top (default meta.height 2.5 m).
//   laundry  false: bare poles (default true).   futon  false: no futon or clips (default true).
// Clip: breeze 4 s, looping (build() returns clips; pose("breeze@1.3")): a gust runs along the poles from +X to -X,
//   pushing each piece toward the wall (+rx about the pole, the hem swings to -Z) with a flutter and a little yaw;
//   socks swing on their pegs under the swinging hanger. The futon is heavy and stays.
// Ink: shell 4 px, laundry 3, poles, rail posts and hanger wire 2.5, so thin metal stays dark metal, not a fat line.
// Colours (meadow: the only script with a pale sky grey and greens, so laundry gets five hues):
//   concrete moon #f7f3e1 / sky #d7ecef; metal (rail, coping, frames, poles, brackets, grille disc, AC stand, sandal
//   soles) hair #2c5131 flat; glass, the frosted partition and blue cloth sky #d7ecef / iris #3f8a47; white (AC,
//   pipes, white cloth) sclera #f6f3ee / sky; green (plants, green cloth) line #a9d16e / iris; red (pots, red cloth)
//   accent #d9483b / hair; yellow (futon, yellow cloth) practical #f2c94c / line; pink (peg hanger, clips, sandal
//   bands, towel) skin #f0c2ae / accent; curtains line / iris without hull; glints and grille bars sclera flat without hull.

export const meta = {
  name: "veranda",
  height: 2.5,
  script: "meadow",
  colors: {
    concrete: "#f7f3e1", concreteShade: "#d7ecef",
    metal: "#2c5131", metalShade: "#2c5131",
    glass: "#d7ecef", glassShade: "#3f8a47",
    white: "#f6f3ee", whiteShade: "#d7ecef",
    green: "#a9d16e", greenShade: "#3f8a47",
    red: "#d9483b", redShade: "#2c5131",
    yellow: "#f2c94c", yellowShade: "#a9d16e",
    pink: "#f0c2ae", pinkShade: "#d9483b",
    curtain: "#a9d16e", curtainShade: "#3f8a47",
    glint: "#f6f3ee",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height, laundry = true, futon = true } = opts;
  const root = new THREE.Group();
  root.name = "veranda";
  const set = new THREE.Group(); // the uniform size scale lives here
  set.name = "set";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = { set };

  // ---------- triangle soups, each vertex tagged with the item it hangs from (-1: static) ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], it: [] });
  let cur = -1;
  function tri(key, a, b, e, ref) {
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-9) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    const s = S(key);
    s.p.push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
    s.it.push(cur, cur, cur);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  // axis box from min / max corners
  function box(key, x0, y0, z0, x1, y1, z1) {
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // a flat plate in the XY plane: quad corners (x, y) given, thickness t about z
  function plate(key, pts, z, t) {
    const P = pts.map(([x, y]) => [x, y, z - t / 2]), Q = pts.map(([x, y]) => [x, y, z + t / 2]);
    hex(key, [...P, ...Q]);
  }
  // a beam from a to b, w wide and h tall, its height along `up`
  function beam(key, a, b, w, h, up = [0, 1, 0]) {
    const d = sub(b, a);
    const nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
    let s = cross(d, up);
    if (Math.hypot(...s) < 1e-6) s = cross(d, [1, 0, 0]);
    s = nrm(s);
    const u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // any three.js geometry, transformed by a matrix (its own winding is right)
  const M4 = new THREE.Matrix4();
  function geo(key, g, m) {
    const ng = g.index ? g.toNonIndexed() : g;
    if (m) ng.applyMatrix4(m);
    const a = ng.attributes.position.array, s = S(key);
    for (let i = 0; i < a.length; i++) s.p.push(a[i]);
    for (let i = 0; i < a.length / 3; i++) s.it.push(cur);
  }
  const at = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
    M4.clone().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  // a closed rod along X (poles, rails)
  const rodX = (key, x0, x1, y, z, r, seg = 8) => geo(key, new THREE.CylinderGeometry(r, r, x1 - x0, seg), at((x0 + x1) / 2, y, z, 0, 0, Math.PI / 2));
  // a slab swept along a profile in (y, z), t thick, from x0 to x1; every face wound away from its facing point
  function sweep(key, prof, x0, x1, t) {
    const n = prof.length, nor = [];
    for (let i = 0; i < n; i++) {
      const a = prof[Math.max(0, i - 1)], b = prof[Math.min(n - 1, i + 1)];
      const dy = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dy, dz);
      nor.push([-dz / l, dy / l]); // left normal in (y, z)
    }
    const O = (i, x, s) => [x, prof[i][0] + nor[i][0] * s * t / 2, prof[i][1] + nor[i][1] * s * t / 2];
    for (let i = 0; i < n - 1; i++) {
      for (const s of [1, -1])
        quad(key, O(i, x0, s), O(i + 1, x0, s), O(i + 1, x1, s), O(i, x1, s), O(i, (x0 + x1) / 2, -s));
      for (const [x, xr] of [[x0, x0 + 0.01], [x1, x1 - 0.01]])
        quad(key, O(i, x, 1), O(i + 1, x, 1), O(i + 1, x, -1), O(i, x, -1), [xr, (prof[i][0] + prof[i + 1][0]) / 2, (prof[i][1] + prof[i + 1][1]) / 2]);
    }
    for (const [i, j] of [[0, 1], [n - 1, n - 2]])
      quad(key, O(i, x0, 1), O(i, x1, 1), O(i, x1, -1), O(i, x0, -1), [(x0 + x1) / 2, prof[j][0], prof[j][1]]);
  }

  // ---------- items: rigid hanging pieces re-posed on the CPU ----------
  const ITEMS = [];
  function item(pv, o, fn) {
    const id = ITEMS.length;
    ITEMS.push({ pv, parent: cur, amp: 12, yaw: 3, lag: 0, flut: 0.12, ...o });
    const prev = cur;
    cur = id;
    fn();
    cur = prev;
    return id;
  }

  // ---------- the shell ----------
  const FL = 0.15; // floor top
  const WZ = -0.6; // wall face
  const PZ0 = 0.52, PZ1 = 0.64; // parapet inner / outer face
  const PT = 0.95; // parapet top
  const RY = 1.26; // rail top
  box("concrete", -2.1, 0, WZ, 2.1, FL, PZ1); // slab
  box("concrete", -2.1, 0, PZ1, 2.1, 0.17, PZ1 + 0.02); // slab edge band, proud
  box("concrete", -2.1, FL, PZ0, 2.1, PT, PZ1); // front parapet
  box("concrete", 1.98, FL, WZ - 0.05, 2.1, PT, PZ0); // +X end parapet, run into the wall
  box("metal", -2.1, PT - 0.04, PZ0 - 0.012, 2.112, PT, PZ1 + 0.012); // aluminium coping (kasagi), proud both sides
  box("metal", 1.968, PT - 0.04, WZ, 2.112, PT, PZ0); // and on the end
  box("concrete", -2.1, 0, -0.78, 2.1, 2.5, WZ); // back wall
  // rail: posts every metre on the front, two on the end, a top rail on both
  for (const x of [-2.04, -1, 0, 1, 2.04]) box("metal", x - 0.02, PT, PZ0 + 0.035, x + 0.02, RY - 0.03, PZ1 - 0.035);
  for (const z of [-0.1, -0.55]) box("metal", 2.02, PT, z - 0.02, 2.06, RY - 0.03, z + 0.02);
  box("metal", -2.1, RY - 0.045, PZ0 + 0.01, 2.1, RY, PZ1 - 0.01);
  box("metal", 2.0, RY - 0.045, WZ, 2.08, RY, PZ0 + 0.01);
  box("metal", -2.1, RY - 0.075, PZ0 + 0.04, 2.08, RY - 0.045, PZ1 - 0.04); // rail web
  // the neighbour's partition board at -X: dark frame, blank pale panel, a gap under it
  const BX = -1.98, BY0 = 0.3, BY1 = 2.0, BZ0 = WZ, BZ1 = PZ0 - 0.02;
  box("metal", BX - 0.05, BY0, BZ0, BX, BY0 + 0.04, BZ1);
  box("metal", BX - 0.05, BY1 - 0.04, BZ0, BX, BY1, BZ1);
  box("metal", BX - 0.05, BY0, BZ1 - 0.04, BX, BY1, BZ1);
  box("metal", BX - 0.05, FL, BZ1 - 0.04, BX, BY0, BZ1); // foot post on the parapet
  box("glass", BX - 0.04, BY0 + 0.04, BZ0, BX - 0.01, BY1 - 0.04, BZ1 - 0.04); // frosted, so the ivory AC reads on it

  // ---------- the sliding glass door ----------
  const DX0 = -1.03, DX1 = 0.73, DY0 = 0.22, DY1 = 2.07, F = 0.06;
  box("metal", DX0 - F, FL, WZ, DX1 + F, DY0, WZ + 0.09); // sill step
  box("metal", DX0 - F, DY1, WZ, DX1 + F, DY1 + F, WZ + 0.07);
  box("metal", DX0 - F, DY0, WZ, DX0, DY1, WZ + 0.07);
  box("metal", DX1, DY0, WZ, DX1 + F, DY1, WZ + 0.07);
  const sashes = [[DX0, (DX0 + DX1) / 2 + 0.05, WZ + 0.025], [(DX0 + DX1) / 2 - 0.05, DX1, WZ + 0.05]];
  sashes.forEach(([x0, x1, z], k) => {
    const b = 0.045, t = 0.024;
    box("metal", x0, DY0, z - t / 2, x1, DY0 + 0.07, z + t / 2);
    box("metal", x0, DY1 - b, z - t / 2, x1, DY1, z + t / 2);
    box("metal", x0, DY0, z - t / 2, x0 + b, DY1, z + t / 2);
    box("metal", x1 - b, DY0, z - t / 2, x1, DY1, z + t / 2);
    const gx0 = x0 + b, gx1 = x1 - b, gy0 = DY0 + 0.07, gy1 = DY1 - b;
    box("glass", gx0, gy0, z - 0.004, gx1, gy1, z + 0.004);
    // curtains gathered at the outer side of each leaf: pleats as a zigzag of strips just in front of the glass
    const cw = k === 0 ? 0.36 : 0.3, cx0 = k === 0 ? gx0 : gx1 - cw, np = 7;
    for (let i = 0; i < np; i++) {
      const xa = cx0 + (i / np) * cw, xb = cx0 + ((i + 0.5) / np) * cw, xc = cx0 + ((i + 1) / np) * cw;
      const zf = z + 0.011, zb = z + 0.005;
      quad("curtain", [xa, gy0, zb], [xb, gy0, zf], [xb, gy1, zf], [xa, gy1, zb], [xb, (gy0 + gy1) / 2, z - 1]);
      quad("curtain", [xb, gy0, zf], [xc, gy0, zb], [xc, gy1, zb], [xb, gy1, zf], [xb, (gy0 + gy1) / 2, z - 1]);
    }
    // glints: two parallel diagonal strips across the open glass
    const gw = gx1 - gx0, ox = k === 0 ? gx0 + cw + 0.06 : gx0 + 0.08, lean = 0.32;
    for (const [d, w] of [[0, 0.07], [0.12, 0.03]]) {
      const xa = ox + d, ya = gy0 + 0.55, yb = gy0 + 1.25;
      const pts = [[xa, ya], [xa + w, ya], [xa + w + lean, yb], [xa + lean, yb]].map(([x, y]) => [Math.min(x, gx0 + gw - 0.02), y]);
      quad("glint", ...pts.map(([x, y]) => [x, y, z + 0.007]), [xa, ya, z - 1]);
    }
  });

  // ---------- the AC outdoor unit ----------
  const AX0 = -1.88, AX1 = -1.13, AY0 = FL + 0.24, AY1 = AY0 + 0.58, AZ0 = WZ + 0.02, AZ1 = WZ + 0.32;
  for (const x of [AX0 + 0.06, AX1 - 0.06]) { // the stand: a foot rail and two legs per side, a cross bar
    box("metal", x - 0.03, FL, AZ0, x + 0.03, FL + 0.035, AZ1);
    for (const z of [AZ0 + 0.03, AZ1 - 0.03]) box("metal", x - 0.022, FL, z - 0.022, x + 0.022, AY0, z + 0.022);
    box("metal", x - 0.03, AY0 - 0.035, AZ0, x + 0.03, AY0, AZ1);
  }
  box("white", AX0, AY0, AZ0, AX1, AY1, AZ1);
  const fx = AX0 + 0.27, fy = (AY0 + AY1) / 2, fr = 0.225;
  geo("metal", new THREE.CylinderGeometry(fr, fr, 0.012, 20), at(fx, fy, AZ1 + 0.006, Math.PI / 2));
  geo("white", new THREE.CylinderGeometry(0.05, 0.05, 0.02, 10), at(fx, fy, AZ1 + 0.012, Math.PI / 2));
  for (let i = -3; i <= 3; i++) { // grille bars
    const y = fy + i * 0.058, hw = Math.sqrt(Math.max(0, fr * fr - (i * 0.058) ** 2)) - 0.01;
    if (hw > 0.02) quad("glint", [fx - hw, y - 0.008, AZ1 + 0.014], [fx + hw, y - 0.008, AZ1 + 0.014], [fx + hw, y + 0.008, AZ1 + 0.014], [fx - hw, y + 0.008, AZ1 + 0.014], [fx, y, 0]);
  }
  for (let i = 0; i < 5; i++) { // vent slots on the right of the face
    const y = AY0 + 0.12 + i * 0.075;
    box("metal", AX1 - 0.21, y, AZ1, AX1 - 0.05, y + 0.02, AZ1 + 0.006);
  }
  // pipes: out of the +X side, up the wall in a duct, into a cap
  box("white", AX1, AY0 + 0.12, WZ + 0.08, AX1 + 0.1, AY0 + 0.2, WZ + 0.16);
  box("white", AX1 + 0.02, AY0 + 0.12, WZ, AX1 + 0.12, 1.5, WZ + 0.09);
  box("white", AX1 - 0.01, 1.5, WZ, AX1 + 0.15, 1.61, WZ + 0.11);
  // a small pot on the AC lid
  geo("red", new THREE.CylinderGeometry(0.075, 0.06, 0.12, 10), at(AX0 + 0.22, AY1 + 0.06, (AZ0 + AZ1) / 2));
  geo("green", new THREE.IcosahedronGeometry(0.11, 0), at(AX0 + 0.22, AY1 + 0.19, (AZ0 + AZ1) / 2, 0.3, 0.5, 0, 1, 0.85, 1));

  // ---------- plants and sandals ----------
  const pot = (x, z, r, h) => geo("red", new THREE.CylinderGeometry(r, r * 0.78, h, 12), at(x, FL + h / 2, z));
  pot(1.62, 0.22, 0.17, 0.32); // the tall leafy one, showing over the rail
  geo("metal", new THREE.CylinderGeometry(0.02, 0.025, 0.7, 6), at(1.62, FL + 0.6, 0.22));
  for (const [x, y, z, r] of [[1.62, 1.14, 0.22, 0.24], [1.45, 0.98, 0.3, 0.17], [1.8, 1.02, 0.12, 0.18], [1.6, 1.36, 0.15, 0.16], [1.72, 0.82, 0.32, 0.15]])
    geo("green", new THREE.IcosahedronGeometry(r, 0), at(x, y, z, x * 3, y * 2, z));
  pot(1.25, 0.32, 0.12, 0.22);
  for (let i = 0; i < 5; i++) { // a spiky one: leaves as leaning slabs
    const a = (i / 5) * Math.PI * 2 + 0.4, lx = Math.cos(a) * 0.1, lz = Math.sin(a) * 0.1;
    beam("green", [1.25 + lx * 0.3, FL + 0.18, 0.32 + lz * 0.3], [1.25 + lx, FL + 0.62 + (i % 2) * 0.1, 0.32 + lz], 0.06, 0.02);
  }
  pot(1.72, -0.35, 0.13, 0.24);
  geo("green", new THREE.IcosahedronGeometry(0.17, 0), at(1.72, FL + 0.36, -0.35, 0.4, 0.2, 0.1, 1, 0.8, 1));
  for (const [x, rot] of [[-0.42, 0.08], [-0.22, -0.12]]) { // sandals: sole and band
    const m = at(x, FL, -0.33, 0, rot);
    geo("metal", new THREE.BoxGeometry(0.11, 0.03, 0.27), m.clone().multiply(at(0, 0.015, 0)));
    geo("pink", new THREE.BoxGeometry(0.12, 0.05, 0.1), m.clone().multiply(at(0, 0.045, 0.05)));
  }

  // ---------- laundry poles on wall brackets ----------
  const PY = 2.17, POLES = [WZ + 0.28, WZ + 0.58]; // inner, outer
  rodX("metal", -1.92, 1.92, PY, POLES[0], 0.02);
  rodX("metal", -1.92, 1.92, PY, POLES[1], 0.02);
  for (const x of [-1.5, 1.5]) {
    box("metal", x - 0.035, PY - 0.3, WZ, x + 0.035, PY + 0.02, WZ + 0.02); // wall plate
    beam("metal", [x, PY - 0.035, WZ], [x, PY - 0.035, POLES[1] + 0.05], 0.04, 0.03); // arm
    beam("metal", [x, PY - 0.28, WZ + 0.01], [x, PY - 0.05, POLES[1] - 0.1], 0.03, 0.02); // strut
    for (const z of POLES) box("metal", x - 0.02, PY - 0.02, z - 0.03, x + 0.02, PY + 0.01, z + 0.03); // saddles
  }

  // ---------- the laundry ----------
  // hanger wire: a hook from the pole, a triangle over the shoulders
  function hanger(x, z, sw) {
    const top = PY - 0.1;
    beam("metal", [x, PY + 0.02, z], [x, top, z], 0.012, 0.012, [0, 0, 1]);
    beam("metal", [x, top, z], [x - sw, top - 0.09, z], 0.012, 0.012, [0, 0, 1]);
    beam("metal", [x, top, z], [x + sw, top - 0.09, z], 0.012, 0.012, [0, 0, 1]);
    return top - 0.07; // collar line
  }
  // a T-shirt (or long-sleeve) on a hanger, its plane facing +Z
  function shirt(key, x, z, { len = 0.6, long = false, w = 0.44 } = {}) {
    item([x, PY, z], { amp: 16, lag: (2 - x) / 8 }, () => {
      const y = hanger(x, z, w / 2 - 0.03), t = 0.022;
      plate(key, [[x - w / 2, y - 0.04], [x + w / 2, y - 0.04], [x + w / 2 + 0.02, y - len], [x - w / 2 - 0.02, y - len]], z, t);
      plate(key, [[x - 0.09, y + 0.01], [x + 0.09, y + 0.01], [x + w / 2, y - 0.045], [x - w / 2, y - 0.045]], z, t); // shoulders
      for (const s of [-1, 1]) {
        if (long) plate(key, [[x + s * (w / 2 - 0.02), y - 0.04], [x + s * (w / 2 + 0.06), y - 0.07], [x + s * (w / 2 + 0.09), y - len + 0.08], [x + s * (w / 2 - 0.0), y - len + 0.06]], z + 0.004, t);
        else plate(key, [[x + s * (w / 2 - 0.03), y - 0.035], [x + s * (w / 2 + 0.15), y - 0.11], [x + s * (w / 2 + 0.1), y - 0.24], [x + s * (w / 2 - 0.02), y - 0.2]], z, t);
      }
      box("metal", x - 0.07, y - 0.035, z + t / 2, x + 0.07, y - 0.015, z + t / 2 + 0.004); // collar line
    });
  }
  // a towel folded over the pole: a front fall, a back fall, a cap over the pole
  function towel(key, x, z, { w = 0.34, front = 0.44, back = 0.34, stripe = null } = {}) {
    item([x, PY, z], { amp: 11, lag: (2 - x) / 8 }, () => {
      const r = 0.032, t = 0.016;
      box(key, x - w / 2, PY - front, z + r - t / 2, x + w / 2, PY, z + r + t / 2);
      box(key, x - w / 2, PY - back, z - r - t / 2, x + w / 2, PY, z - r + t / 2);
      box(key, x - w / 2, PY + 0.012, z - r - t / 2, x + w / 2, PY + r, z + r + t / 2);
      if (stripe) box(stripe, x - w / 2 - 0.004, PY - front + 0.05, z + r - t / 2 - 0.004, x + w / 2 + 0.004, PY - front + 0.09, z + r + t / 2 + 0.004);
    });
  }
  // the round peg hanger: ring, spokes to a hub, hook; socks and a face towel hang from pegs
  function pegHanger(x, z) {
    const ry = PY - 0.36, R = 0.21, hub = PY - 0.2;
    item([x, PY, z], { amp: 10, yaw: 6, lag: (2 - x) / 8 }, () => {
      beam("pink", [x, PY + 0.03, z], [x, hub, z], 0.016, 0.016, [0, 0, 1]);
      const ring = 14;
      for (let i = 0; i < ring; i++) {
        const a0 = (i / ring) * Math.PI * 2, a1 = ((i + 1) / ring) * Math.PI * 2;
        beam("pink", [x + Math.cos(a0) * R, ry, z + Math.sin(a0) * R], [x + Math.cos(a1) * R * 1.0, ry, z + Math.sin(a1) * R], 0.022, 0.02);
      }
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        beam("pink", [x, hub, z], [x + Math.cos(a) * R, ry, z + Math.sin(a) * R], 0.01, 0.01, [0, 0, 1]);
      }
      // socks: [angle on the ring, colour key, length]
      const SOCKS = [[0.25, "white", 0.24], [0.62, "red", 0.22], [1.1, "glass", 0.25], [1.55, "white", 0.24], [2.0, "green", 0.22], [2.45, "red", 0.22],
        [3.4, "yellow", 0.2], [4.3, "glass", 0.24], [5.2, "white", 0.22]];
      SOCKS.forEach(([a, key, len], i) => {
        const px = x + Math.cos(a) * R, pz = z + Math.sin(a) * R;
        box("pink", px - 0.012, ry - 0.05, pz - 0.012, px + 0.012, ry + 0.01, pz + 0.012); // peg
        item([px, ry - 0.03, pz], { amp: 20, yaw: 0, lag: (2 - x) / 8 + 0.05 + i * 0.03, flut: 0.2 }, () => {
          const d = i % 2 ? 1 : -1, w = 0.07, y0 = ry - 0.04, t = 0.02;
          plate(key, [[px - w / 2, y0], [px + w / 2, y0], [px + w / 2, y0 - len], [px - w / 2, y0 - len]], pz, t);
          plate(key, [[px - w / 2, y0 - len + 0.07], [px + w / 2, y0 - len], [px + w / 2 + d * 0.1, y0 - len - 0.02], [px - w / 2 + d * 0.11, y0 - len + 0.05]], pz, t);
        });
      });
      // the face towel between two front pegs (z+R side)
      const fz = z + R * 0.93;
      for (const s of [-1, 1]) box("pink", x + s * 0.09 - 0.012, ry - 0.05, fz - 0.012, x + s * 0.09 + 0.012, ry + 0.01, fz + 0.012);
      item([x, ry - 0.03, fz], { amp: 12, lag: (2 - x) / 8 + 0.1 }, () => {
        box("white", x - 0.15, ry - 0.3, fz - 0.008, x + 0.15, ry - 0.03, fz + 0.008);
        box("glass", x - 0.154, ry - 0.27, fz - 0.011, x + 0.154, ry - 0.245, fz + 0.011);
      });
    });
  }

  if (laundry) {
    const [zi, zo] = POLES;
    // inner pole (half hidden): a long-sleeve, a bath towel, a T-shirt
    shirt("red", -0.95, zi, { long: true, len: 0.66 });
    towel("white", 0.2, zi, { w: 0.6, front: 0.62, back: 0.5, stripe: "glass" });
    shirt("yellow", 1.25, zi, {});
    // outer pole: T-shirts, towels, the peg hanger
    shirt("glass", -1.35, zo, {});
    shirt("white", -0.62, zo, { len: 0.62 });
    towel("pink", 0.08, zo, { stripe: "red" });
    towel("green", 0.5, zo, { w: 0.3, front: 0.4 });
    pegHanger(1.05, zo);
  }

  if (futon) {
    // the drape, centreline in (y, z): inside the parapet, round the top rail, down the outside
    const cy = RY - 0.03, cz = (PZ0 + PZ1) / 2, r = 0.12, prof = [[0.48, PZ0 - 0.06], [0.9, PZ0 - 0.05]];
    for (let i = 0; i <= 8; i++) {
      const th = Math.PI - (i / 8) * Math.PI;
      prof.push([cy + Math.sin(th) * r * 0.9, cz + Math.cos(th) * r]);
    }
    prof.push([0.9, PZ1 + 0.06], [0.42, PZ1 + 0.075]);
    sweep("yellow", prof, -0.62, 0.92, 0.07);
    // a stripe band near each end of the cover, and two clips over the top
    for (const x of [-0.5, 0.8]) sweep("glass", prof, x, x + 0.04, 0.074);
    const clipProf = [];
    for (let i = 0; i <= 8; i++) {
      const th = Math.PI + 0.35 - (i / 8) * (Math.PI + 0.7);
      clipProf.push([cy + Math.sin(th) * (r + 0.065) * 0.92, cz + Math.cos(th) * (r + 0.065)]);
    }
    for (const x of [-0.32, 0.62]) sweep("pink", clipProf, x, x + 0.06, 0.025);
  }

  // ---------- meshes ----------
  // cloth tilted by the breeze faces down-and-out (front dot 0.30 drops to ~0.1 at 16 deg): a low threshold keeps a
  // swinging shirt one colour; only faces turned to -X or under go to shade
  const CLOTH = -0.15;
  const MAT = {
    concrete: [c.concrete, c.concreteShade, 0.1, 4],
    metal: [c.metal, c.metalShade, 0.1, 2.5],
    glass: [c.glass, c.glassShade, CLOTH, 3],
    white: [c.white, c.whiteShade, CLOTH, 3],
    green: [c.green, c.greenShade, CLOTH, 3],
    red: [c.red, c.redShade, CLOTH, 3],
    yellow: [c.yellow, c.yellowShade, CLOTH, 3],
    pink: [c.pink, c.pinkShade, CLOTH, 3],
    curtain: [c.curtain, c.curtainShade, 0.25, 0],
    glint: [c.glint, c.glint, 0.1, 0],
  };
  const live = [];
  for (const [key, s] of Object.entries(soups)) {
    const [base, shade, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3));
    g.computeVertexNormals();
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    set.add(mesh);
    if (s.it.some((i) => i >= 0)) {
      kit.hullNormals(g);
      const rest = {};
      for (const a of ["position", "normal", "hullNormal"]) if (g.attributes[a]) rest[a] = g.attributes[a].array.slice();
      live.push({ g, it: Int32Array.from(s.it), rest });
    }
  }

  // ---------- poses and the breeze clip ----------
  const CLIPS = { breeze: 4 };
  const TAU = Math.PI * 2, D = Math.PI / 180;
  const MS = ITEMS.map(() => new THREE.Matrix4());
  const N3 = ITEMS.map(() => new THREE.Matrix3());
  function apply(ph) { // ph = null: rest
    const q = new THREE.Quaternion(), T = new THREE.Matrix4(), Ti = new THREE.Matrix4(), R = new THREE.Matrix4();
    ITEMS.forEach((o, i) => {
      let rx = 0, ry = 0;
      if (ph !== null) {
        const p = ph - o.lag, gust = 0.5 - 0.5 * Math.cos(TAU * p);
        rx = o.amp * (0.25 + 0.75 * gust + o.flut * Math.sin(TAU * 4 * p)) * D;
        ry = o.yaw * Math.sin(TAU * 2 * p) * D;
      }
      q.setFromEuler(new THREE.Euler(rx, ry, 0, "YXZ"));
      T.makeTranslation(o.pv[0], o.pv[1], o.pv[2]);
      Ti.makeTranslation(-o.pv[0], -o.pv[1], -o.pv[2]);
      R.makeRotationFromQuaternion(q);
      MS[i].copy(T).multiply(R).multiply(Ti);
      if (o.parent >= 0) MS[i].premultiply(MS[o.parent]);
      N3[i].setFromMatrix4(MS[i]);
    });
    const v = new THREE.Vector3();
    for (const { g, it, rest } of live) {
      for (const [a, r] of Object.entries(rest)) {
        const out = g.attributes[a].array, isPos = a === "position";
        for (let k = 0; k < it.length; k++) {
          const id = it[k];
          if (id < 0) continue;
          v.set(r[k * 3], r[k * 3 + 1], r[k * 3 + 2]);
          if (isPos) v.applyMatrix4(MS[id]);
          else v.applyMatrix3(N3[id]);
          out[k * 3] = v.x; out[k * 3 + 1] = v.y; out[k * 3 + 2] = v.z;
        }
        g.attributes[a].needsUpdate = true;
      }
      g.computeBoundingBox();
      g.computeBoundingSphere();
    }
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`veranda: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      const Tn = CLIPS[m[1]];
      return apply((((+m[2] % Tn) + Tn) % Tn) / Tn);
    }
    if (name !== "rest") throw new Error(`veranda: unknown pose "${name}" (rest, or breeze@<seconds>)`);
    apply(null);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
