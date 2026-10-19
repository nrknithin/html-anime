// bus-stop.js - a countryside bus stop of rural slice-of-life anime: a small wooden shelter with a corrugated tin
// roof and a long bench, and beside it the round bus-stop sign on a weighted base. Static.
// Contract: harness/lab/README.md. Meters, +Y up, the road side (the open front) faces +Z, its left is +X; the sign
// stands at the front right (-X), so the front-left camera sees it clear of the shelter), stands on y = 0, centred on x = 0, z = 0 (the bbox of the whole set).
//
// Construction (boxes, lathes and one corrugated sheet, all triangle soups merged per material; boxes and the sheet
// are flat-shaded, so planks and corrugations read crisp; lathes carry radial normals so a 16-sided pole reads round):
//   SHELTER  a thin concrete pad; four dark corner posts with a front and a back beam under the roof and a low rail
//            (nuki) on the three walls; back and side walls of light vertical boards, each wall one box with dark
//            board-joint strips 3 mm proud on both faces (the hull draws silhouettes only). The side walls follow the
//            roof slope. Inside, a long bench along the back wall: two planks on three dark leg frames.
//            ROOF: a mono-pitch shed falling to the back, a closed corrugated solid (top and underside follow one
//            1 - cos wave across X, so the front edge is the scalloped tin profile and the top bands lit / shade),
//            overhanging 0.3 m at the front, 0.18 m at the back and sides, on three dark purlins.
//   SIGN     a round base (a stepped lathe, the weight), a pole, a timetable plate on the pole (dark frame, blank white
//            face, a red header band) and the round head: a red disc with a blank white centre proud on both faces.
//            The disc rides in front of the pole. Turned 25 deg toward +X so its face meets the
//            front-left camera. No lettering anywhere.
//   Every triangle is wound away from a point inside its solid (box centre, lathe axis, below or above the sheet),
//   never by hand.
// Proportions (real size; base unit the shelter depth D = 1.2 m): shelter 2.5 x 1.2 between post faces, roof top
//   2.40 at the front eave, 2.18 at the back; posts 9 cm; walls 2 cm; bench seat 0.42 high, 0.34 deep, 2.2 long.
//   Sign 2.20 tall: head disc 0.46 across centred at 1.95; plate 0.36 x 0.48 at 1.05-1.53; pole 6 cm; base 0.5 across.
// Options: build(THREE, kit, colors, { height, shelter }).
//   shelter  true (default): shelter and sign; false: the sign pole alone (natural height 2.2, so the lab's
//            meta.height check warns for it, as it does for any height).
//   height   scales everything uniformly so the tallest top is `height` (default 2.40 m; 2.20 without the shelter).
// Budget: 2204 triangles, 7 meshes (the sign alone 664, 4 meshes). The tin underside is its own mesh, lit red at any
//   angle (threshold -0.9, no hull), so the roof reads red from the low hero camera.
// Colours (noon, warm wood under paper light): boards sky #f2d7ae / skin #f0c2ae; posts, beams, bench, board joints
//   and the plate frame iris #5c3d32 / hair #241c16 (the house's wood); tin roof accent #c4452d / iris #5c3d32 (rusty
//   red tin); sign disc accent / iris; sign faces and pole sclera #f6f3ee / sky; pad and base moon #fff6e4 / sky.

export const meta = {
  name: "bus-stop",
  height: 2.4,
  script: "noon",
  colors: {
    board: "#f2d7ae", boardShade: "#f0c2ae",
    wood: "#5c3d32", woodShade: "#241c16",
    tin: "#c4452d", tinShade: "#5c3d32",
    sign: "#c4452d", signShade: "#5c3d32",
    face: "#f6f3ee", faceShade: "#f2d7ae",
    stone: "#fff6e4", stoneShade: "#f2d7ae",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { shelter = true } = opts;
  const natural = shelter ? 2.4 : 2.2;
  const { height = natural } = opts;
  const root = new THREE.Group();
  root.name = "bus-stop";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / natural);
  root.add(body);
  const joints = {};

  // ---------- triangle soups with normals, through a placement matrix ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  let M = new THREE.Matrix4();
  const v3 = new THREE.Vector3();
  const put = (s, q, nq) => {
    v3.set(...q).applyMatrix4(M);
    s.p.push(v3.x, v3.y, v3.z);
    v3.set(...nq).transformDirection(M);
    s.n.push(v3.x, v3.y, v3.z);
  };
  // one triangle wound away from `ref`; normals per vertex, or the face normal
  function tri(key, a, b, e, ref, na, nb, ne) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const m = mul(add(add(a, b), e), 1 / 3);
    const flip = dot(n, sub(m, ref)) < 0;
    if (flip) n = mul(n, -1);
    n = nrm(n);
    const s = S(key);
    const [B, NB, E, NE] = flip ? [e, ne, b, nb] : [b, nb, e, ne];
    put(s, a, na ?? n), put(s, B, NB ?? n), put(s, E, NE ?? n);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  // convex hexahedron: p[0..3] the bottom face, p[4..7] the top face in the same order
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  const box = (key, x0, x1, y0, y1, z0, z1) =>
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  // a box whose top follows y = top(z) (the roof slope)
  const slopeBox = (key, x0, x1, y0, z0, z1, top) =>
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, top(z0), z0], [x1, top(z0), z0], [x1, top(z1), z1], [x0, top(z1), z1]]);
  // a closed solid of revolution about the local axis (0,0,0)->(0,1,0) scaled by `len` along `axis` frame:
  // prof is [[r, h], ...] from bottom to top; flat caps where r > 0 at the ends
  function lathe(key, prof, { sides = 16, frame = (r, a, h) => [r * Math.cos(a), h, r * Math.sin(a)], axisPt = (h) => [0, h, 0] } = {}) {
    const ring = ([r, h]) => Array.from({ length: sides }, (_, j) => frame(r, (j / sides) * Math.PI * 2, h));
    const rings = prof.map(ring);
    for (let i = 0; i < prof.length - 1; i++) {
      const ref = axisPt((prof[i][1] + prof[i + 1][1]) / 2);
      const flat = Math.abs(prof[i][0] - prof[i + 1][0]) > Math.abs(prof[i][1] - prof[i + 1][1]) * 3; // a step: flat ring
      for (let j = 0; j < sides; j++) {
        const k = (j + 1) % sides;
        const [a, b, e, d] = [rings[i][j], rings[i][k], rings[i + 1][k], rings[i + 1][j]];
        if (flat) { quad(key, a, b, e, d, prof[i][0] > prof[i + 1][0] ? sub(axisPt(prof[i][1]), sub(axisPt(1), axisPt(0))) : add(axisPt(prof[i][1]), sub(axisPt(1), axisPt(0)))); continue; }
        const rn = (q, h) => nrm(sub(q, axisPt(h)));
        tri(key, a, b, e, ref, rn(a, prof[i][1]), rn(b, prof[i][1]), rn(e, prof[i + 1][1]));
        tri(key, a, e, d, ref, rn(a, prof[i][1]), rn(e, prof[i + 1][1]), rn(d, prof[i + 1][1]));
      }
    }
    for (const [i, s] of [[0, -1], [prof.length - 1, 1]]) {
      if (prof[i][0] <= 0) continue;
      const ref = add(axisPt(prof[i][1]), mul(sub(axisPt(1), axisPt(0)), -s)); // inside the solid
      for (let j = 1; j < sides - 1; j++) tri(key, rings[i][0], rings[i][j], rings[i][j + 1], ref);
    }
  }
  const place = (x, z, yaw, fn) => {
    const saved = M;
    M = saved.clone().multiply(new THREE.Matrix4().makeTranslation(x, 0, z)).multiply(new THREE.Matrix4().makeRotationY(yaw));
    fn();
    M = saved;
  };

  // ---------- shelter (local: centred on x = z = 0, open to +Z) ----------
  function shelterBuild() {
    const W = 2.5, D = 1.2, P = 0.09, WT = 0.02, pad = 0.06;
    const xo = W / 2, zo = D / 2; // outer faces of the posts
    // roof underside line (the sheet's lowest points), falling to the back
    const zf = zo + 0.3, zb = -zo - 0.18, yF = 2.356, yB = 2.136;
    const under = (z) => yB + ((z - zb) / (zf - zb)) * (yF - yB);
    const purlinH = 0.1;
    const beamTop = (z) => under(z) - 0.006; // purlins sit just under the sheet's troughs
    box("stone", -xo - 0.12, xo + 0.12, 0, pad, -zo - 0.1, zo + 0.14);
    // posts: up to the purlin bottom
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const x0 = sx > 0 ? xo - P : -xo, z0 = sz > 0 ? zo - P : -zo;
        slopeBox("wood", x0, x0 + P, pad, z0, z0 + P, (z) => beamTop(z) - purlinH + 0.01);
      }
    // purlins (front, middle, back) running along X past the walls into the overhang
    for (const z of [zo - P / 2, 0, -zo + P / 2]) {
      const w = z === 0 ? 0.07 : 0.1;
      slopeBox("wood", -xo - 0.1, xo + 0.1, beamTop(z) - purlinH, z - w / 2, z + w / 2, beamTop);
    }
    // side beams on top of the posts, under the sheet
    for (const sx of [-1, 1]) {
      const x0 = sx > 0 ? xo - P : -xo;
      hex("wood", [
        [x0, beamTop(zo) - purlinH, zo], [x0 + P, beamTop(zo) - purlinH, zo], [x0 + P, beamTop(-zo) - purlinH, -zo], [x0, beamTop(-zo) - purlinH, -zo],
        [x0, beamTop(zo), zo], [x0 + P, beamTop(zo), zo], [x0 + P, beamTop(-zo), -zo], [x0, beamTop(-zo), -zo],
      ]);
    }
    // walls: boards from the pad to the beams, set between the posts at the wall's centre line
    const wy0 = pad + 0.12; // a gap at the foot, as on a real board shelter
    const wallTop = (z) => beamTop(z) - purlinH + 0.005;
    const bw = 0.15, joint = 0.012, pr = 0.003;
    // back wall (plane z = -zo + P/2)
    {
      const z0 = -zo + P / 2 - WT / 2, z1 = z0 + WT, yt = wallTop(-zo + P / 2);
      box("board", -xo + P - 0.005, xo - P + 0.005, wy0, yt, z0, z1);
      const n = Math.round((2 * (xo - P)) / bw);
      for (let i = 1; i < n; i++) {
        const x = -xo + P + (i * 2 * (xo - P)) / n;
        box("wood", x - joint / 2, x + joint / 2, wy0 + 0.002, yt - 0.002, z1 - 0.001, z1 + pr);
        box("wood", x - joint / 2, x + joint / 2, wy0 + 0.002, yt - 0.002, z0 - pr, z0 + 0.001);
      }
      box("wood", -xo + P, xo - P, 0.95, 1.03, z0 - 0.012, z1 + 0.012); // nuki rail, behind the bench back
    }
    // side walls (planes x = +-(xo - P/2)), boards vertical, top following the slope
    for (const sx of [-1, 1]) {
      const xc = sx * (xo - P / 2), x0 = xc - WT / 2, x1 = xc + WT / 2;
      const za = -zo + P - 0.005, zb2 = zo - P + 0.005;
      slopeBox("board", x0, x1, wy0, za, zb2, wallTop);
      const n = Math.round((zb2 - za) / bw);
      for (let i = 1; i < n; i++) {
        const z = za + (i * (zb2 - za)) / n;
        for (const [a, b] of [[x1 - 0.001, x1 + pr], [x0 - pr, x0 + 0.001]])
          box("wood", a, b, wy0 + 0.002, wallTop(z) - 0.004, z - joint / 2, z + joint / 2);
      }
      box("wood", x0 - 0.012, x1 + 0.012, 0.95, 1.03, -zo + P, zo - P);
    }
    // bench along the back wall: two planks on three leg frames
    {
      const L = 2.2, y1 = 0.42, th = 0.035, zB = -zo + P / 2 + WT / 2 + 0.03, dz = 0.34;
      box("wood", -L / 2, L / 2, y1 - th, y1, zB + dz / 2 + 0.006, zB + dz);
      box("wood", -L / 2, L / 2, y1 - th, y1, zB, zB + dz / 2 - 0.006);
      for (const x of [-L / 2 + 0.12, 0, L / 2 - 0.12]) {
        for (const z of [zB + 0.04, zB + dz - 0.04]) box("wood", x - 0.03, x + 0.03, pad, y1 - th, z - 0.03, z + 0.03);
        box("wood", x - 0.025, x + 0.025, y1 - th - 0.07, y1 - th, zB + 0.01, zB + dz - 0.01);
      }
      box("wood", -L / 2 + 0.12, L / 2 - 0.12, 0.16, 0.21, zB + dz - 0.06, zB + dz - 0.02); // stretcher
    }
    // corrugated tin roof: one closed solid; the wave runs across X, so the front edge is the tin profile
    {
      const x0 = -xo - 0.18, x1 = xo + 0.18, T = 0.014, A = 0.03, Pw = 0.16;
      const nw = Math.round((x1 - x0) / Pw), per = 4, N = nw * per;
      const xs = Array.from({ length: N + 1 }, (_, i) => x0 + (i / N) * (x1 - x0));
      const wave = (i) => A * 0.5 * (1 - Math.cos((2 * Math.PI * i) / per));
      const bot = (i, z) => [xs[i], under(z) + wave(i), z];
      const top = (i, z) => [xs[i], under(z) + wave(i) + T, z];
      const up = [0, 1, 0];
      for (let i = 0; i < N; i++) {
        const tq = [top(i, zf), top(i + 1, zf), top(i + 1, zb), top(i, zb)];
        quad("tin", ...tq, sub(mul(add(tq[0], tq[2]), 0.5), up));
        const bq = [bot(i, zf), bot(i + 1, zf), bot(i + 1, zb), bot(i, zb)];
        quad("tinUnder", ...bq, add(mul(add(bq[0], bq[2]), 0.5), up));
        // front and back edge strips
        quad("tin", bot(i, zf), bot(i + 1, zf), top(i + 1, zf), top(i, zf), [xs[i], under(zf), zf - 1]);
        quad("tin", bot(i, zb), bot(i + 1, zb), top(i + 1, zb), top(i, zb), [xs[i], under(zb), zb + 1]);
      }
      for (const [i, s] of [[0, 1], [N, -1]]) quad("tin", bot(i, zf), bot(i, zb), top(i, zb), top(i, zf), [xs[i] + s, under(0), 0]);
    }
  }

  // ---------- sign (local: pole on x = z = 0, faces +Z) ----------
  function signBuild() {
    const pr = 0.03, top = 2.2, R = 0.23, cy = top - R, th = 0.03;
    // weighted round base: a low stepped drum
    lathe("stone", [[0.25, 0], [0.25, 0.07], [0.2, 0.09], [0.2, 0.13], [0.06, 0.15], [0.06, 0.16]], { sides: 20 });
    lathe("face", [[pr, 0.15], [pr, cy]], { sides: 12 });
    // head: a red disc (axis along Z) with a blank white centre proud on both faces
    const zc = pr + th / 2 + 0.004; // the disc rides in front of the pole
    const zFrame = (z0) => (r, a, h) => [r * Math.cos(a), cy + r * Math.sin(a), z0 + h];
    const zAxis = (z0) => (h) => [0, cy, z0 + h];
    lathe("sign", [[R, zc - th / 2], [R, zc + th / 2]], { sides: 28, frame: zFrame(0), axisPt: zAxis(0) });
    for (const s of [-1, 1]) {
      const z0 = zc + (s > 0 ? th / 2 - 0.001 : -th / 2 - 0.004);
      lathe("face", [[R * 0.7, 0], [R * 0.7, 0.005]], { sides: 28, frame: zFrame(z0), axisPt: zAxis(z0) });
    }
    // timetable plate on the pole's front: dark frame, white face, red header band
    const w = 0.36, y0 = 1.05, y1 = 1.53, zp = pr + 0.004, t = 0.02, f = 0.022;
    box("wood", -w / 2, w / 2, y0, y1, zp, zp + t);
    box("face", -w / 2 + f, w / 2 - f, y0 + f, y1 - f - 0.07, zp + t - 0.001, zp + t + 0.004);
    box("sign", -w / 2 + f, w / 2 - f, y1 - f - 0.06, y1 - f, zp + t - 0.001, zp + t + 0.004);
    box("wood", -0.04, 0.04, y1 - 0.06, y1 - 0.02, -pr - 0.01, zp); // clamps
    box("wood", -0.04, 0.04, y0 + 0.02, y0 + 0.06, -pr - 0.01, zp);
  }

  if (shelter) {
    place(0, 0, 0, shelterBuild);
    place(-1.95, 0.62, 0.44, signBuild);
  } else place(0, 0, 0.44, signBuild);

  // centre the footprint on x = z = 0
  const lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (const { p } of Object.values(soups))
    for (let i = 0; i < p.length; i += 3)
      for (const [k, j] of [[0, 0], [1, 2]]) (lo[k] = Math.min(lo[k], p[i + j])), (hi[k] = Math.max(hi[k], p[i + j]));
  body.position.set((-(lo[0] + hi[0]) / 2) * body.scale.x, 0, (-(lo[1] + hi[1]) / 2) * body.scale.x);

  // ---------- meshes: one per material ----------
  const MAT = {
    board: [c.board, c.boardShade, 0.1, 3.5],
    wood: [c.wood, c.woodShade, 0.1, 3],
    tin: [c.tin, c.tinShade, 0.55, 4], // the -X flank of every corrugation falls to shade: bands on the top
    tinUnder: [c.tin, c.tinShade, -0.9, 0], // the underside reads red from the low camera; the sheet's hull inks it
    sign: [c.sign, c.signShade, 0.1, 3.5],
    face: [c.face, c.faceShade, 0.1, 2.5],
    stone: [c.stone, c.stoneShade, 0.1, 3],
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
