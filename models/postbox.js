// postbox.js - the red Japanese post box (yubin posuto) of every slice-of-life street corner, static.
// Contract: harness/lab/README.md. Meters, +Y up, the slots face +Z (the pavement), its left is +X,
// stands on y = 0, centred on x = 0, z = 0.
//
// Construction (boxes, lathes and front decals, all triangle soups merged per material, so a box is five meshes):
//   SQUARE (default, the modern type) a red box body on a short pedestal post with a foot plate; a cap that
//          overhangs the body by 2.5 cm and steps in at the top; two mail slots side by side on the upper front, each
//          under a small red hood with a white label plate above it; a door on the lower front drawn as a dark
//          frame (an ink band, the hull draws silhouettes only), with a white postal mark (a T under a bar, built from
//          three bars, no lettering) and a white collection-times plate with dark rows (rows, not text). Dark bands
//          run down the two front vertical corners so the lit front and lit +X side don't merge into one red slab.
//   ROUND  (opts.style "round", the Showa cylinder) one lathe: a flared foot skirt on a low plinth, the drum, a
//          raised band under the cap, the cap flange and a dome with a small knob. One slot under the flange, a label
//          plate under it, the mark and collection plate on the door. Its front decals are curved panels that hug
//          the drum (decal(): the same (u, v, depth) rectangles as the square front, bent onto radius R).
//   Every triangle is wound away from a point inside its solid (box centre, or just inside the lathe surface along
//   its profile normal), never by hand. Lathe normals are smooth across shallow profile bends, hard at steps.
// Proportions (real size, base unit the box width W = 0.42 m):
//   square  total 1.25 (1.0 W x 3); post 0.12 square, 0.45 tall (W x 0.29 / 1.07); body 0.42 x 0.36 x 0.73;
//           cap 0.47 x 0.41, 0.07 tall; slots 0.15 x 0.025 at 1.03; door 0.34 x 0.40 from 0.52.
//   round   total 1.27; drum radius 0.20 (diameter 0.95 W) from 0.14 to 1.04; cap flange radius 0.235, dome to 1.27.
// Options: build(THREE, kit, colors, { style: "square" | "round", height }). height scales uniformly (default 1.25 for
//   square, 1.27 for round: within the lab's 2 % meta.height check).
// Budget: square 372 triangles, round 1148 (a 20-sided lathe).
// Colours (noon): red body accent #c4452d / iris #5c3d32 (threshold 0.15 so the front, square to the camera, stays
//   red and only the far -X side and undersides go brown); plates and mark practical #fffaf2 / sclera #f6f3ee;
//   slots, door frame, corner bands, plate rows iris #5c3d32 flat; post and plinth sclera #f6f3ee / sky #f2d7ae
//   (light painted concrete: noon has no cool grey).

export const meta = {
  name: "postbox",
  height: 1.25,
  script: "noon",
  colors: {
    red: "#c4452d", redShade: "#5c3d32",
    plate: "#fffaf2", plateShade: "#f6f3ee",
    dark: "#5c3d32", darkShade: "#5c3d32",
    post: "#f6f3ee", postShade: "#f2d7ae",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const round = opts.style === "round";
  const natural = round ? 1.27 : 1.25;
  const { height = natural } = opts;
  const root = new THREE.Group();
  root.name = "postbox";
  const body = new THREE.Group();
  body.name = "body";
  body.scale.setScalar(height / natural);
  root.add(body);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  // one triangle wound away from `ref`; normals per vertex, or the face normal
  function tri(key, a, b, e, ref, na, nb, ne) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const m = mul(add(add(a, b), e), 1 / 3);
    const flip = dot(n, sub(m, ref)) < 0;
    n = nrm(flip ? mul(n, -1) : n);
    const s = S(key);
    const [B, NB, E, NE] = flip ? [e, ne, b, nb] : [b, nb, e, ne];
    for (const [q, nq] of [[a, na], [B, NB], [E, NE]]) s.p.push(...q), s.n.push(...(nq ?? n));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  const box = (key, x0, x1, y0, y1, z0, z1) =>
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  // frustum: bottom half-sizes (ax, az) at y0, top (bx, bz) at y1
  const frustum = (key, ax, az, y0, bx, bz, y1) =>
    hex(key, [[-ax, y0, -az], [ax, y0, -az], [ax, y0, az], [-ax, y0, az], [-bx, y1, -bz], [bx, y1, -bz], [bx, y1, bz], [-bx, y1, bz]]);

  // lathe about the y axis: prof = [[r, y], ...] from the bottom centre up the outside to the top centre
  function lathe(key, prof, sides = 20) {
    const segN = []; // outward normal of each profile segment in (r, y)
    for (let i = 0; i < prof.length - 1; i++) {
      const [r0, y0] = prof[i], [r1, y1] = prof[i + 1];
      const l = Math.hypot(r1 - r0, y1 - y0) || 1;
      segN.push([(y1 - y0) / l, -(r1 - r0) / l]);
    }
    // vertex normal per segment end: blended with the neighbour across a bend under 40 degrees
    const endN = (i, end) => {
      const j = end ? i + 1 : i - 1;
      const a = segN[i], b = segN[j];
      if (!b || a[0] * b[0] + a[1] * b[1] < Math.cos((40 * Math.PI) / 180)) return a;
      const s = [a[0] + b[0], a[1] + b[1]], l = Math.hypot(...s);
      return [s[0] / l, s[1] / l];
    };
    const at = (r, y, k) => {
      const t = (k / sides) * Math.PI * 2;
      return [r * Math.sin(t), y, r * Math.cos(t)];
    };
    const dirN = (nn, k) => {
      const t = (k / sides) * Math.PI * 2;
      return [nn[0] * Math.sin(t), nn[1], nn[0] * Math.cos(t)];
    };
    for (let i = 0; i < prof.length - 1; i++) {
      const [r0, y0] = prof[i], [r1, y1] = prof[i + 1];
      const n0 = endN(i, false), n1 = endN(i, true);
      for (let k = 0; k < sides; k++) {
        const kh = k + 0.5;
        const mid = at((r0 + r1) / 2, (y0 + y1) / 2, kh);
        const ref = sub(mid, dirN(segN[i], kh).map((v) => v * 0.01));
        const a = at(r0, y0, k), b = at(r0, y0, k + 1), e = at(r1, y1, k + 1), d = at(r1, y1, k);
        const na = dirN(n0, k), nb = dirN(n0, k + 1), ne = dirN(n1, k + 1), nd = dirN(n1, k);
        tri(key, a, b, e, ref, na, nb, ne);
        tri(key, a, e, d, ref, na, ne, nd);
      }
    }
  }

  // a front decal: rectangle u0..u1 (x on the face), v0..v1 (height), standing d0..d1 out of the face.
  // Square: the face is the plane z = FZ. Round: the face is the drum of radius R, u is arc length from +Z.
  // SIDE = +-1 puts a square decal on the +-X side instead (u then runs toward -Z on +X, as seen from that side).
  let FZ = 0, R = 0, SIDE = 0, FX = 0;
  function decal(key, u0, u1, v0, v1, d0, d1) {
    if (SIDE) return box(key, SIDE * (FX + d0), SIDE * (FX + d1), v0, v1, -SIDE * u0, -SIDE * u1);
    if (!round) return box(key, u0, u1, v0, v1, FZ + d0, FZ + d1);
    const n = Math.max(1, Math.ceil((u1 - u0) / 0.035));
    const P = (u, r, y) => [r * Math.sin(u / R), y, r * Math.cos(u / R)];
    // one continuous curved slab (no inner end faces, so the hull draws no seams between its sections)
    const r0 = R + d0, r1 = R + d1, rm = (r0 + r1) / 2, vm = (v0 + v1) / 2;
    for (let i = 0; i < n; i++) {
      const ua = u0 + ((u1 - u0) * i) / n, ub = u0 + ((u1 - u0) * (i + 1)) / n;
      const ref = P((ua + ub) / 2, rm, vm);
      quad(key, P(ua, r1, v0), P(ub, r1, v0), P(ub, r1, v1), P(ua, r1, v1), ref); // outer
      quad(key, P(ua, r0, v0), P(ub, r0, v0), P(ub, r0, v1), P(ua, r0, v1), ref); // inner
      quad(key, P(ua, r0, v1), P(ub, r0, v1), P(ub, r1, v1), P(ua, r1, v1), ref); // top
      quad(key, P(ua, r0, v0), P(ub, r0, v0), P(ub, r1, v0), P(ua, r1, v0), ref); // bottom
    }
    for (const u of [u0, u1]) quad(key, P(u, r0, v0), P(u, r1, v0), P(u, r1, v1), P(u, r0, v1), P((u0 + u1) / 2, rm, vm));
  }
  // the postal mark: a bar over a T, white, centred at u = 0, top at v
  function mark(v, w = 0.12) {
    const t = w * 0.15;
    decal("plate", -w / 2, w / 2, v - t, v, 0.002, 0.007);
    decal("plate", -w / 2, w / 2, v - 2.6 * t, v - 1.6 * t, 0.002, 0.007);
    decal("plate", -t / 2, t / 2, v - w * 0.95, v - 2.6 * t + 0.002, 0.002, 0.007);
  }
  // a white collection-times plate with dark rows
  function timesPlate(cv, w, h) {
    decal("plate", -w / 2, w / 2, cv - h / 2, cv + h / 2, 0.002, 0.006);
    const rows = 3, rh = h * 0.1;
    for (let i = 0; i < rows; i++) {
      const y = cv + h / 2 - h * (0.27 + i * 0.25);
      const rw = i === 0 ? w * 0.5 : w * 0.76;
      decal("dark", -rw / 2, rw / 2, y - rh / 2, y + rh / 2, 0.006, 0.008);
    }
  }
  // a door outline: a dark frame band
  function door(u0, u1, v0, v1, b = 0.007) {
    decal("dark", u0, u1, v0, v0 + b, 0.001, 0.004);
    decal("dark", u0, u1, v1 - b, v1, 0.001, 0.004);
    decal("dark", u0, u0 + b, v0, v1, 0.001, 0.004);
    decal("dark", u1 - b, u1, v0, v1, 0.001, 0.004);
  }
  // a mail slot: dark opening under a red hood
  function slot(cu, v, w) {
    decal("dark", cu - w / 2, cu + w / 2, v - 0.016, v + 0.016, 0.0, 0.006);
    decal("red", cu - w / 2 - 0.01, cu + w / 2 + 0.01, v + 0.016, v + 0.034, 0.0, 0.02);
  }

  if (!round) {
    // pedestal: foot plate and post
    box("post", -0.13, 0.13, 0, 0.025, -0.12, 0.12);
    box("post", -0.06, 0.06, 0.025, 0.46, -0.06, 0.06);
    // body and cap
    const BX = 0.21, BZ = 0.18, B0 = 0.45, B1 = 1.18;
    box("red", -BX, BX, B0, B1, -BZ, BZ);
    box("red", -0.135, 0.135, B0 - 0.03, B0 + 0.01, -0.11, 0.11); // the bottom plate under the body
    frustum("red", BX + 0.025, BZ + 0.025, B1, BX + 0.025, BZ + 0.025, B1 + 0.04);
    frustum("red", BX + 0.025, BZ + 0.025, B1 + 0.04, BX + 0.005, BZ + 0.005, 1.25);
    // dark crease bands down the front corners
    for (const s of [-1, 1]) box("dark", s * BX - 0.005, s * BX + 0.005, B0, B1, BZ - 0.005, BZ + 0.005);
    FZ = BZ;
    // two slots with labels above
    for (const cu of [-0.1, 0.1]) {
      slot(cu, 1.03, 0.15);
      decal("plate", cu - 0.065, cu + 0.065, 1.075, 1.135, 0.0, 0.004);
    }
    // door with mark and collection plate
    door(-0.17, 0.17, 0.52, 0.94);
    mark(0.885, 0.12);
    timesPlate(0.64, 0.17, 0.11);
    // the mark again high on each side
    FX = BX;
    for (const sd of [-1, 1]) (SIDE = sd), mark(1.12, 0.14);
    SIDE = 0;
  } else {
    R = 0.2;
    box("post", -0.19, 0.19, 0, 0.05, -0.19, 0.19); // plinth
    lathe("red", [
      [0, 0.05], [0.235, 0.05], [0.235, 0.075], [0.215, 0.11], [R, 0.14], // foot skirt
      [R, 1.0], [0.212, 1.0], [0.212, 1.035], // band under the cap
      [0.235, 1.04], [0.235, 1.07], // cap flange
      [0.218, 1.1], [0.19, 1.15], [0.14, 1.2], [0.075, 1.235], [0.03, 1.245], // dome
      [0.03, 1.27], [0, 1.27], // knob
    ]);
    slot(0, 0.95, 0.15);
    decal("plate", -0.075, 0.075, 0.855, 0.91, 0.0, 0.004);
    door(-0.15, 0.15, 0.24, 0.79);
    mark(0.74, 0.12);
    timesPlate(0.42, 0.16, 0.11);
  }

  // ---------- meshes: one per material ----------
  const MAT = {
    red: [c.red, c.redShade, 0.15, 3.5],
    plate: [c.plate, c.plateShade, 0.1, 0],
    dark: [c.dark, c.darkShade, 0.1, 0],
    post: [c.post, c.postShade, 0.35, 3],
  };
  for (const [key, { p, n }] of Object.entries(soups)) {
    const [base, shade, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    body.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
