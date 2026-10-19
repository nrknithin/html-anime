// kotatsu.js - the heated low table with its quilt from every winter anime home scene, static.
// Contract: harness/lab/README.md. Meters, +Y up, one side faces +Z, its left is +X, stands on y = 0,
// centred on x = 0, z = 0.
//
// Construction:
//   QUILT    the kakebuton is ONE indexed ring grid around the frame, not a box. Each column starts on the frame's
//            rounded-square edge (sides: the point slides along the edge; corners: it stays on the corner and its
//            outward direction fans through 90 deg), and runs out along a drape profile integrated from its heading:
//            flat under the top plate, a 6 cm bend over the frame edge, a drop splayed 10 deg out, a tight 6 cm
//            fillet onto the floor and a short run across it to the hem, so it reads as a heavy quilt resting on the
//            floor. Rows sit at fixed arc lengths near the top and at fixed distances from the hem below, so the border
//            stripe follows the cloth. Soft folds: an outward offset of the drop (and, at half strength, the floor run),
//            a sum of three perimeter sines (3-4 folds a side, the corners pushed out into soft cones), growing from 0
//            at the edge; the floor run puffs up a little where a fold bulges. The hem wanders by ~1 cm and the corners
//            hang 7 cm longer. A rounded rim 4.5 cm thick closes the hem down to y = 0 and a fan closes the floor, so
//            the quilt is one closed shell with one hull; winding from the signed volume. Material groups: field (two
//            tones, threshold 0.1 so the drop facing the camera stays lit), a solid border stripe 7.5-12 cm from the
//            hem, and the hem rim + floor in flat field colour (they face down; the shade tone there read as a slab).
//            The hull draws only silhouettes, so the folds also get creases: tapered dark strokes 3 mm proud down the
//            drop at every fold valley.
//   TABLE    the top plate (0.80 x 0.80 x 0.025) rests on the quilt, a darker edge band 3 mm proud on its four sides.
//            The frame and legs are all under the quilt, so they are not built.
//   OPTIONS  mikan: a white bowl (closed lathe) with four oblate mandarins, one more loose on the plate, and a leaf.
//            cushions: 0..4 zabuton, domed superellipsoid pillows with a centre tassel, just past the hem on the +Z,
//            -Z, -X, +X sides in that order (so two face each other). rug: a 2.5 m square floor rug with a border;
//            the rest of the set rides 9 mm up on it.
// Proportions (real size, base unit the frame half width T = 0.35 m): top plate top 0.38, quilt surface on the frame
//   0.355, hang 0.44 (+0.07 at the corners), hem ~0.6 from the centre on the sides (0.2 past the plate edge), the
//   corners rounding out to a 1.2 m footprint; zabuton 0.55 x 0.60, 0.10 at the dome; mikan r 0.034 (oblate 0.82); the pile
//   tops out at 0.508.
// Options: build(THREE, kit, colors, { quilt: "red" | "cream", mikan = true, cushions = 0, rug = false, height }).
//   height scales the whole set so its top is `height` (default: the natural top, 0.508 with mikan, 0.38 without).
// Budget: quilt 2.3k triangles, creases 0.1k, plate 60, mikan set 0.74k; each zabuton 0.16k; rug 60.
//   Defaults 3.2k, every option on 4.0k.
// Colours (noon, warm wood): quilt red accent #c4452d / iris #5c3d32 with a moon #fff6e4 / sky #f2d7ae stripe, or
//   cream moon / sky with an accent / iris stripe; creases hair #241c16; plate wood iris / hair with a hair edge
//   band (flat); mikan accent / iris (noon has no orange), leaf iris / hair; bowl sclera #f6f3ee / sky; zabuton
//   iris / hair (accent / iris under the cream quilt), tassel moon / sky; rug sky / skin #f0c2ae with an iris border.
//   noon has no blue or green, so the quilt colours are red and cream. hair is darker than ink and is used only for
//   thin lines (creases, edge band) and shade, as the house does.

export const meta = {
  name: "kotatsu",
  height: 0.508,
  script: "noon",
  colors: {
    quiltRed: "#c4452d", quiltRedShade: "#5c3d32",
    quiltCream: "#fff6e4", quiltCreamShade: "#f2d7ae",
    band: "#fff6e4", bandShade: "#f2d7ae",
    bandRed: "#c4452d", bandRedShade: "#5c3d32",
    wood: "#5c3d32", woodShade: "#241c16",
    edge: "#241c16",
    crease: "#241c16",
    mikan: "#c4452d", mikanShade: "#5c3d32",
    leaf: "#5c3d32", leafShade: "#241c16",
    bowl: "#f6f3ee", bowlShade: "#f2d7ae",
    cushion: "#5c3d32", cushionShade: "#241c16",
    cushionAlt: "#c4452d", cushionAltShade: "#5c3d32",
    rug: "#f2d7ae", rugShade: "#f0c2ae",
    rugBorder: "#5c3d32",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { quilt = "red", mikan = true, rug = false } = opts;
  const cushions = Math.max(0, Math.min(4, Math.floor(opts.cushions ?? 0)));
  const natural = mikan ? meta.height : 0.38;
  const { height = natural } = opts;
  const root = new THREE.Group();
  root.name = "kotatsu";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / natural);
  root.add(body);
  const set = new THREE.Group(); // everything on the floor; lifted onto the rug when there is one
  set.name = "set";
  set.position.y = rug ? 0.009 : 0;
  body.add(set);
  const joints = {};
  const TAU = Math.PI * 2;

  // ---------- the drape profile: arc length s -> (outward h, y, on-floor weight) ----------
  const T = 0.35, R0 = 0.03, Y0 = 0.355, TH = 0.045, BEND = 0.06, SPLAY = 0.18, FILLET = 0.06;
  const prof = []; // every 2 mm
  {
    let h = 0, y = Y0, a = 0, phase = 0, hF = 0; // a: heading below horizontal; hF: where the run starts
    const DS = 0.002, aDrop = Math.PI / 2 - SPLAY, yFillet = TH + FILLET * (1 - Math.sin(SPLAY));
    for (let i = 0; i <= 700; i++) {
      prof.push([h, y, phase === 2 ? Math.min(1, (h - hF) / 0.05 + 0.3) : 0]);
      if (phase === 0) { a = Math.min(aDrop, a + DS / BEND); if (y <= yFillet) phase = 1; }
      else if (phase === 1) { a = Math.max(0, a - DS / FILLET); if (a === 0) { phase = 2; y = TH; hF = h; } }
      h += Math.cos(a) * DS;
      y = phase === 2 ? TH : Math.max(TH, y - Math.sin(a) * DS);
    }
  }
  const P = (s) => {
    if (s <= 0) return [s, Y0, 0];
    const f = Math.min(s / 0.002, prof.length - 1.001), i = Math.floor(f), u = f - i;
    const A = prof[i], B = prof[i + 1];
    return [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, A[2] + (B[2] - A[2]) * u];
  };

  // ---------- perimeter columns ----------
  const SIDE = 11, CORNER = 7; // samples per side, per corner fan
  const cols = [];
  const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
  for (let q = 0; q < 4; q++) {
    const [cx, cz] = corners[q];
    const [nx, nz] = corners[(q + 1) % 4];
    // side from corner q to corner q+1 (they differ in one axis), outward normal
    const ax = cx !== nx ? 0 : 2; // which coord changes
    const out = ax === 0 ? [0, cz] : [cx, 0];
    for (let i = 0; i < SIDE; i++) {
      const u = (i + 0.5) / SIDE;
      const e = ax === 0 ? [cx * (T - R0) * (1 - 2 * u), cz * (T - R0)] : [cx * (T - R0), cz * (T - R0) * (1 - 2 * u)];
      cols.push({ e, d: out, wc: 0 });
    }
    // corner fan at corner q+1, from this side's normal to the next side's
    const [mx, mz] = corners[(q + 1) % 4];
    const a0 = Math.atan2(out[1], out[0]);
    for (let i = 0; i < CORNER; i++) {
      const u = (i + 0.5) / CORNER, a = a0 + (Math.PI / 2) * u;
      cols.push({ e: [mx * (T - R0), mz * (T - R0)], d: [Math.cos(a), Math.sin(a)], wc: Math.sin(Math.PI * u) });
    }
  }
  const M = cols.length;
  // perimeter phase phi in [0,1), weighted by real length (side 0.58, fan ~0.6 at mid drop)
  {
    let acc = 0;
    const len = cols.map((col) => (col.wc > 0 || cols.indexOf(col) % (SIDE + CORNER) >= SIDE ? 0.6 / CORNER : (2 * (T - R0)) / SIDE));
    const tot = len.reduce((a, b) => a + b, 0);
    cols.forEach((col, j) => { col.phi = (acc + len[j] / 2) / tot; acc += len[j]; });
  }
  const fold = (phi) => 0.65 * Math.sin(TAU * 13 * phi + 0.7) + 0.3 * Math.sin(TAU * 6 * phi + 2.1) + 0.15 * Math.sin(TAU * 21 * phi + 4.0);
  for (const col of cols) {
    col.wcp = Math.max(0, col.wc) ** 1.5;
    col.smax = 0.44 + 0.07 * col.wcp + 0.01 * Math.sin(TAU * 11 * col.phi + 1.3) + 0.008 * Math.sin(TAU * 5 * col.phi + 0.4);
    col.f = fold(col.phi) + 0.5 * col.wcp; // corners bulge out: a soft cone
  }
  // rows: absolute arc lengths near the frame, distances from the hem below; the band and piping are rows
  const rowsAt = (sm) => {
    const top = [0, 0.025, 0.055, 0.09, 0.13, 0.18, 0.24];
    const lo = sm - 0.15, mid = [0.24 + (lo - 0.24) / 2];
    return [...top, ...mid, lo, sm - 0.12, sm - 0.075, sm - 0.045, sm - 0.02, sm];
  };
  const K = rowsAt(0.5).length;
  const BAND = 9; // cell row [9,10): the border stripe, 7.5-12 cm from the hem
  const pos = [];
  const vtx = (x, y, z) => (pos.push(x, y, z), pos.length / 3 - 1);
  const grid = cols.map((col) => {
    const ss = rowsAt(col.smax);
    return ss.map((s) => {
      const [h, y, fl] = P(s);
      const amp = 0.022 * (1 + 0.5 * col.wcp) * Math.min(1, Math.max(0, s - 0.02) / 0.22) * (1 - 0.45 * fl); // flatter on the floor
      const off = h + R0 + amp * col.f;
      const lift = fl * 0.012 * Math.max(0, col.f) * Math.min(1, (col.smax - s) / 0.06 + 0.2);
      return vtx(col.e[0] + col.d[0] * off, y + lift, col.e[1] + col.d[1] * off);
    });
  });
  const idx = [], grp = [];
  const face = (a, b, e, g) => (idx.push(a, b, e), grp.push(g));
  for (let j = 0; j < M; j++) {
    const A = grid[j], B = grid[(j + 1) % M];
    for (let k = 0; k < K - 1; k++) {
      const g = k === BAND ? 1 : 0;
      face(A[k], B[k], B[k + 1], g), face(A[k], B[k + 1], A[k + 1], g);
    }
  }
  // rim: hem rounded down to the floor, then a floor fan; top cap fan under the plate
  const rim = grid.map((col, j) => {
    const h = col[K - 1], [x, y, z] = [pos[h * 3], pos[h * 3 + 1], pos[h * 3 + 2]];
    const d = cols[j].d;
    const fx = x + d[0] * 0.004, fz = z + d[1] * 0.004;
    return [vtx(x + d[0] * 0.012, y * 0.5, z + d[1] * 0.012), vtx(fx, 0, fz), vtx(fx, 0, fz)]; // floor copy: own normal
  });
  const cB = vtx(0, 0.0, 0), cT = vtx(0, Y0, 0);
  for (let j = 0; j < M; j++) {
    const n = (j + 1) % M;
    const [a1, a2, a3] = rim[j], [b1, b2, b3] = rim[n];
    face(grid[j][K - 1], grid[n][K - 1], b1, 0), face(grid[j][K - 1], b1, a1, 0);
    face(a1, b1, b2, 2), face(a1, b2, a2, 2); // the hem's lower half and the floor stay flat field colour
    face(a3, b3, cB, 2);
    face(grid[n][0], grid[j][0], cT, 0);
  }
  // winding from the signed volume
  let vol = 0;
  for (let i = 0; i < idx.length; i += 3) {
    const [a, b, e] = [idx[i] * 3, idx[i + 1] * 3, idx[i + 2] * 3];
    const ax = pos[a], ay = pos[a + 1], az = pos[a + 2], bx = pos[b], by = pos[b + 1], bz = pos[b + 2], ex = pos[e], ey = pos[e + 1], ez = pos[e + 2];
    vol += ax * (by * ez - bz * ey) - ay * (bx * ez - bz * ex) + az * (bx * ey - by * ex);
  }
  if (vol < 0) for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
  {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    const buckets = [[], [], []];
    for (let t = 0; t < grp.length; t++) buckets[grp[t]].push(idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2]);
    g.setIndex(buckets.flat());
    let start = 0;
    buckets.forEach((b, k) => (g.addGroup(start, b.length, k), (start += b.length)));
    g.computeVertexNormals();
    const field = { red: [c.quiltRed, c.quiltRedShade], cream: [c.quiltCream, c.quiltCreamShade] }[quilt];
    if (!field) throw new Error(`unknown quilt "${quilt}" (red, cream)`);
    const band = quilt === "cream" ? [c.bandRed, c.bandRedShade] : [c.band, c.bandShade];
    const mesh = kit.toon(g, field[0], field[1], { threshold: 0.1, px: 3.5 });
    mesh.material = [kit.cel(field[0], field[1], { threshold: 0.1 }), kit.cel(band[0], band[1], { threshold: 0.1 }), kit.cel(field[0], field[0])];
    mesh.name = "quilt";
    set.add(mesh);
    // fold creases: tapered ink strokes 3 mm proud along the column at each fold valley, down the drop
    const N = g.attributes.normal, cp = [], cn = [];
    const at = (v) => [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]];
    for (let j = 0; j < M; j++) {
      const fa = cols[(j + M - 1) % M].f, fb = cols[(j + 1) % M].f, f0 = cols[j].f;
      if (!(f0 < fa && f0 < fb)) continue;
      const len = 6 + (j % 3 === 0 ? 1 : 0); // rows 2..len, staggered lengths
      const pts = [];
      for (let k = 2; k <= len; k++) {
        const v = grid[j][k], p = at(v), n = [N.getX(v), N.getY(v), N.getZ(v)];
        pts.push({ p: p.map((x, i) => x + n[i] * 0.003), n });
      }
      for (let i = 0; i < pts.length - 1; i++) {
        const A = pts[i], B = pts[i + 1];
        const d = [B.p[0] - A.p[0], B.p[1] - A.p[1], B.p[2] - A.p[2]];
        const side = (Q, w) => {
          const t = [Q.n[1] * d[2] - Q.n[2] * d[1], Q.n[2] * d[0] - Q.n[0] * d[2], Q.n[0] * d[1] - Q.n[1] * d[0]];
          const l = Math.hypot(...t) || 1;
          return [-1, 1].map((sg) => Q.p.map((x, k) => x + (sg * w * t[k]) / l));
        };
        const u0 = i / (pts.length - 1), u1 = (i + 1) / (pts.length - 1);
        const W = (u) => 0.004 * Math.sin(Math.PI * Math.min(1, u * 1.6)) ** 0.7 + 0.0004;
        const [a0, a1] = side(A, W(u0)), [b0, b1] = side(B, W(u1));
        for (const [q, nq] of [[a0, A.n], [b0, B.n], [b1, B.n], [a0, A.n], [b1, B.n], [a1, A.n]]) cp.push(...q), cn.push(...nq);
      }
    }
    // wind every stroke triangle to face along its normal
    for (let i = 0; i < cp.length; i += 9) {
      const e1 = [cp[i + 3] - cp[i], cp[i + 4] - cp[i + 1], cp[i + 5] - cp[i + 2]], e2 = [cp[i + 6] - cp[i], cp[i + 7] - cp[i + 1], cp[i + 8] - cp[i + 2]];
      const fn = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      if (fn[0] * cn[i] + fn[1] * cn[i + 1] + fn[2] * cn[i + 2] < 0)
        for (let k = 0; k < 3; k++) [cp[i + 3 + k], cp[i + 6 + k]] = [cp[i + 6 + k], cp[i + 3 + k]];
    }
    const cg = new THREE.BufferGeometry();
    cg.setAttribute("position", new THREE.Float32BufferAttribute(cp, 3));
    cg.setAttribute("normal", new THREE.Float32BufferAttribute(cn, 3));
    const crease = kit.toon(cg, c.crease, c.crease, { outline: false });
    crease.name = "crease";
    set.add(crease);
  }

  // ---------- merged primitives per material ----------
  const parts = {};
  const put = (key, geo, m) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.applyMatrix4(m);
    (parts[key] ??= []).push(g);
  };
  const mat = (x, y, z, sx = 1, sy = 1, sz = 1, ry = 0) =>
    new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz));
  const boxAt = (key, x0, x1, y0, y1, z0, z1) =>
    put(key, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));

  // top plate and its edge band
  const PW = 0.4, PT = 0.025, PY = Y0 + PT;
  boxAt("wood", -PW, PW, Y0, PY, -PW, PW);
  const e = 0.003, b0 = Y0 + 0.002, b1 = PY - 0.003;
  boxAt("edge", -PW - e, PW + e, b0, b1, PW - 0.004, PW + e);
  boxAt("edge", -PW - e, PW + e, b0, b1, -PW - e, -PW + 0.004);
  boxAt("edge", PW - 0.004, PW + e, b0, b1, -PW + 0.004, PW - 0.004);
  boxAt("edge", -PW - e, -PW + 0.004, b0, b1, -PW + 0.004, PW - 0.004);

  if (mikan) {
    const bx = -0.05, bz = 0.03, MR = 0.034;
    // bowl: a closed lathe loop (outer wall up, lip, inner wall down), foot ring under it
    const loop = [[0.001, 0], [0.04, 0], [0.045, 0.008], [0.075, 0.03], [0.095, 0.05], [0.098, 0.055], [0.09, 0.054], [0.07, 0.034], [0.04, 0.016], [0.001, 0.014]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    put("bowl", new THREE.LatheGeometry(loop, 14), mat(bx, PY, bz));
    const fruit = [[0.03, 0.04, 0.0], [-0.03, 0.035, 1.2], [0.0, -0.035, 2.1], [0.004, 0.0, 0.5, 0.052]];
    for (const [dx, dz, ry, dy = 0] of fruit)
      put("mikan", new THREE.SphereGeometry(MR, 9, 6), mat(bx + dx, PY + 0.016 + MR * 0.82 + dy, bz + dz, 1, 0.82, 1, ry));
    // one loose mikan on the plate
    put("mikan", new THREE.SphereGeometry(MR, 9, 6), mat(0.17, PY + MR * 0.82, 0.16, 1, 0.82, 1));
    // leaf on the top one: a flat lens
    const top = PY + 0.016 + MR * 0.82 * 2 + 0.052;
    const leaf = new THREE.SphereGeometry(0.02, 6, 4);
    leaf.applyMatrix4(new THREE.Matrix4().makeScale(1, 0.18, 0.5));
    put("leaf", leaf, new THREE.Matrix4().makeRotationZ(0.35).premultiply(mat(bx + 0.02, top - 0.003, bz, 1, 1, 1, 0.6)));
  }

  // zabuton: superellipsoid pillow
  const pillow = () => {
    const g = new THREE.SphereGeometry(1, 12, 7);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const sp = (v, k) => Math.sign(v) * Math.abs(v) ** k;
      const X = sp(p.getX(i), 0.3), Z = sp(p.getZ(i), 0.3), Y = p.getY(i), dome = 1 - 0.45 * Math.max(Math.abs(X), Math.abs(Z)) ** 3;
      p.setXYZ(i, X * 0.275, Y < 0 ? (1 + Y) * 0.012 : 0.012 + sp(Y, 0.7) * 0.085 * dome, Z * 0.3);
    }
    g.computeVertexNormals();
    return g;
  };
  const SEATS = [[0, 1], [0, -1], [-1, 0], [1, 0]];
  for (let i = 0; i < cushions; i++) {
    const [sx, sz] = SEATS[i], D = 1.0;
    put("cushion", pillow(), mat(sx * D, 0, sz * D, 1, 1, 1, sx ? Math.PI / 2 : 0));
    put("tuft", new THREE.SphereGeometry(0.016, 6, 4), mat(sx * D, 0.094, sz * D, 1, 0.6, 1)); // the centre tassel
  }
  if (rug) {
    const RW = 1.25, RT = 0.006, BW = 0.07;
    boxAt("rug", -RW, RW, 0, RT, -RW, RW);
    const y1 = RT + 0.003;
    boxAt("rugBorder", -RW, RW, RT, y1, RW - BW, RW);
    boxAt("rugBorder", -RW, RW, RT, y1, -RW, -RW + BW);
    boxAt("rugBorder", RW - BW, RW, RT, y1, -RW + BW, RW - BW);
    boxAt("rugBorder", -RW, -RW + BW, RT, y1, -RW + BW, RW - BW);
  }

  const cushionPair = quilt === "cream" ? [c.cushionAlt, c.cushionAltShade] : [c.cushion, c.cushionShade];
  const MAT = {
    wood: [c.wood, c.woodShade, 0.1, 3.5, false],
    edge: [c.edge, c.edge, 0.1, 0, false],
    bowl: [c.bowl, c.bowlShade, 0.2, 2.5, true],
    mikan: [c.mikan, c.mikanShade, 0.3, 2.5, true],
    leaf: [c.leaf, c.leafShade, 0.2, 2, true],
    cushion: [...cushionPair, 0.5, 3, true],
    tuft: [c.band, c.bandShade, 0.1, 1.5, true],
    rug: [c.rug, c.rugShade, 0.1, 2.5, false],
    rugBorder: [c.rugBorder, c.rugBorder, 0.1, 0, false],
  };
  for (const [key, list] of Object.entries(parts)) {
    const g = new THREE.BufferGeometry();
    const n = list.reduce((a, q) => a + q.attributes.position.count, 0);
    const P3 = new Float32Array(n * 3), N3 = new Float32Array(n * 3);
    let o = 0;
    for (const q of list) {
      if (!q.attributes.normal) q.computeVertexNormals();
      P3.set(q.attributes.position.array, o), N3.set(q.attributes.normal.array, o);
      o += q.attributes.position.count * 3;
    }
    g.setAttribute("position", new THREE.BufferAttribute(P3, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(N3, 3));
    const [base, shade, threshold, px, smooth] = MAT[key];
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    (key.startsWith("rug") ? body : set).add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
