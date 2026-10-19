// futon.js - a Japanese futon bed on two tatami mats (anime bedroom set piece), static: laid out, or the daytime stack.
// Contract: harness/lab/README.md. Meters, +Y up, the room faces +Z, its left is +X (the head end, with the pillow),
// stands on y = 0, centred on x = 0, z = 0 (the two mats).
//
// Construction (soft slabs, capsules and conformed decals, all merged per material, so the set is seven meshes):
//   slab()   a closed soft solid from a convex plan outline: the outline is filleted in plan, resampled, then lofted
//            through a round edge profile (bottom arc, top arc, radius r) and closed by rings that shrink to the
//            centroid, top and bottom. A world deform(x, y, z, w) runs on every vertex (w = 0 at the bottom, 1 at the
//            top): puff (the top domes up with the distance from the edge), droop (cloth sags past what holds it up).
//            Normals come from the smooth indexed grid; winding from the signed volume, never by hand.
//   TATAMI   two 1.82 x 0.91 mats, 4 cm, long axes along X, side by side in Z; straw top with faint weave lines and
//            dark cloth heri on the long edges (top and side faces), as real mats have.
//   SHIKIBUTON  2.0 x 1.0 x 0.08, edge radius 3.5 cm, puffed 1 cm; it is 9 cm longer than the mats at each end, so
//            both ends sag the 4 cm down to the floor line (droop on |x|).
//   KAKEBUTON   1.95 x 1.3 x 0.05 duvet on the mattress, puffed 3 cm; its long edges drape down the mattress sides
//            (droop on |z|). The head end is folded back along a slanted line: the lower layer is the duvet cut by the
//            fold line, the flap is the cut-off part reflected over that line (clipped to the duvet width) and lifted
//            onto the lower layer, and a capsule along the fold line is the soft roll. A two-row checker band (ichimatsu)
//            is a decal grid raycast onto the duvet top near the foot.
//   MAKURA   a 0.5 x 0.3 x 0.1 buckwheat pillow at the head, firm (edge radius 4 cm, low puff), with a dark piping band.
//   FOLDED   (folded: true) the daytime stack: the shikibuton z-folded in thirds (three 0.67 x 1.0 slabs joined by
//            alternating end rolls), the duvet folded the same way on top with the band on its top layer, the pillow on
//            top; the stack stands on the back mat.
// Proportions (real size, base unit the mattress width W = 1.0 m): mats 1.82 x 0.91 x 0.04; bed top at the pillow
// crown 0.262 (laid) / stack 0.545 (folded).
// Options: build(THREE, kit, colors, { height, folded }). height scales the set uniformly so its top is `height`
// (default: the natural top; the lab's meta.height check then warns for folded and any other height).
// Colours (noon): tatami sky #f2d7ae / skin #f0c2ae (weave lines skin, flat); heri iris #5c3d32 / hair #241c16;
// shikibuton sclera #f6f3ee / skin; kakebuton accent #c4452d / iris; band checker moon #fff6e4 / sky and
// iris / hair; makura sky / skin with an iris / hair piping band. Pale parts threshold 0.1 so the tops stay lit.

export const meta = {
  name: "futon",
  height: 0.262,
  script: "noon",
  colors: {
    tatami: "#f2d7ae", tatamiShade: "#f0c2ae", weave: "#f0c2ae",
    heri: "#5c3d32", heriShade: "#241c16",
    mattress: "#f6f3ee", mattressShade: "#f0c2ae",
    duvet: "#c4452d", duvetShade: "#5c3d32",
    band: "#fff6e4", bandShade: "#f2d7ae",
    bandDark: "#5c3d32", bandDarkShade: "#241c16",
    pillow: "#f2d7ae", pillowShade: "#f0c2ae",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { folded = false } = opts;
  const root = new THREE.Group();
  root.name = "futon";
  const body = new THREE.Group();
  body.name = "body";
  root.add(body);
  const joints = {};

  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const parts = {}; // material key -> list of indexed { pos, idx, nrm }
  const P = (key) => (parts[key] ??= []);

  // ---------- plan outlines ----------
  const area = (poly) => poly.reduce((s, p, i) => { const q = poly[(i + 1) % poly.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
  const ccw = (poly) => (area(poly) < 0 ? poly.slice().reverse() : poly);
  // round every corner with radius R (quadratic arc, 4 points), then resample edges to <= step
  function fillet(poly, R, step = 0.08) {
    const n = poly.length, out = [];
    for (let i = 0; i < n; i++) {
      const A = poly[(i - 1 + n) % n], B = poly[i], C = poly[(i + 1) % n];
      const la = Math.hypot(A[0] - B[0], A[1] - B[1]), lc = Math.hypot(C[0] - B[0], C[1] - B[1]);
      const da = [(A[0] - B[0]) / la, (A[1] - B[1]) / la], dc = [(C[0] - B[0]) / lc, (C[1] - B[1]) / lc];
      const half = Math.acos(Math.max(-1, Math.min(1, da[0] * dc[0] + da[1] * dc[1]))) / 2;
      const t = Math.min(R / Math.tan(half), la * 0.45, lc * 0.45);
      const p0 = [B[0] + da[0] * t, B[1] + da[1] * t], p2 = [B[0] + dc[0] * t, B[1] + dc[1] * t];
      for (const u of [0, 1 / 3, 2 / 3, 1]) out.push([0, 1].map((k) => (1 - u) * (1 - u) * p0[k] + 2 * u * (1 - u) * B[k] + u * u * p2[k]));
    }
    const res = [];
    for (let i = 0; i < out.length; i++) {
      const a = out[i], b = out[(i + 1) % out.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 1e-5) continue;
      const k = Math.max(1, Math.ceil(L / step));
      for (let j = 0; j < k; j++) res.push([a[0] + ((b[0] - a[0]) * j) / k, a[1] + ((b[1] - a[1]) * j) / k]);
    }
    return res;
  }
  // signed distance inside a convex ccw polygon (positive inside)
  const inside = (poly, x, z) => {
    let d = Infinity;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], ex = b[0] - a[0], ez = b[1] - a[1], L = Math.hypot(ex, ez);
      d = Math.min(d, ((x - a[0]) * ez - (z - a[1]) * ex) / -L);
    }
    return d;
  };
  // clip a convex polygon by the half plane n . p <= k
  function clip(poly, nx, nz, k) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const fa = nx * a[0] + nz * a[1] - k, fb = nx * b[0] + nz * b[1] - k;
      if (fa <= 0) out.push(a);
      if (fa * fb < 0) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    return out;
  }
  const rect = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

  // ---------- soft slab ----------
  // poly: convex plan outline (corners, filleted here with R); y0 bottom, t thickness, r edge radius;
  // deform(x, y, z, w) -> dy, puff: top dome height reached `pr` m inside the edge
  function slab(key, poly, y0, t, r, { R = r * 1.2, puff = 0, pr = 0.25, deform = null, step = 0.08, K = 4 } = {}) {
    poly = ccw(poly);
    const base = ccw(fillet(poly, Math.max(R, r + 0.002), step)), N = base.length;
    const nrm2 = base.map((p, i) => {
      const a = base[(i - 1 + N) % N], b = base[(i + 1) % N], ex = b[0] - a[0], ez = b[1] - a[1], L = Math.hypot(ex, ez);
      return [ez / L, -ex / L]; // outward for ccw
    });
    const cx = base.reduce((s, p) => s + p[0], 0) / N, cz = base.reduce((s, p) => s + p[1], 0) / N;
    const ring = (inset, y, s = 0) => base.map((p, i) => {
      let x = p[0] - nrm2[i][0] * inset, z = p[1] - nrm2[i][1] * inset;
      x += (cx - x) * s, z += (cz - z) * s;
      return [x, y, z];
    });
    const rows = [];
    const inner = puff || deform ? [1, 0.75, 0.5, 0.3, 0.15, 0.06] : [1];
    for (const s of inner) rows.push(ring(r, y0, s));
    for (let k = 0; k <= K; k++) { const a = -Math.PI / 2 + (k / K) * (Math.PI / 2); rows.push(ring(r - r * Math.cos(a), y0 + r + r * Math.sin(a))); }
    for (let k = 1; k <= K; k++) { const a = (k / K) * (Math.PI / 2); rows.push(ring(r - r * Math.cos(a), y0 + t - r + r * Math.sin(a))); }
    for (const s of inner.slice().reverse()) rows.push(ring(r, y0 + t, s));
    const pos = [];
    for (const row of rows)
      for (const [x, y, z] of row) {
        const w = (y - y0) / t;
        let dy = 0;
        if (puff) dy += w * puff * ss(0, pr, inside(poly, x, z));
        if (deform) dy += deform(x, y, z, w);
        pos.push(x, y + dy, z);
      }
    const idx = [];
    for (let i = 0; i < rows.length - 1; i++)
      for (let j = 0; j < N; j++) {
        const a = i * N + j, b = i * N + ((j + 1) % N), e = a + N, d = b + N;
        idx.push(a, b, e, b, d, e);
      }
    return add(key, pos, idx);
  }
  // capsule from A to B (world), radius rad, deformed like the cloth it joins
  function roll(key, A, B, rad, deform = null) {
    const L = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
    const g = new THREE.CapsuleGeometry(rad, Math.max(0.001, L - 2 * rad), 4, 12);
    const dir = new THREE.Vector3(B[0] - A[0], B[1] - A[1], B[2] - A[2]).normalize();
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
    g.translate((A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2);
    const p = g.attributes.position, pos = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      pos.push(x, y + (deform ? deform(x, y, z, 1) : 0), z);
    }
    return add(key, pos, Array.from(g.index.array));
  }
  function add(key, pos, idx, closed = true) {
    if (closed) {
      let v = 0;
      for (let i = 0; i < idx.length; i += 3) {
        const a = idx[i] * 3, b = idx[i + 1] * 3, e = idx[i + 2] * 3;
        v += pos[a] * (pos[b + 1] * pos[e + 2] - pos[b + 2] * pos[e + 1]) - pos[a + 1] * (pos[b] * pos[e + 2] - pos[b + 2] * pos[e]) + pos[a + 2] * (pos[b] * pos[e + 1] - pos[b + 1] * pos[e]);
      }
      if (v < 0) for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    P(key).push(g);
    return g;
  }
  // a decal grid over [x0,x1] x [z0,z1], seated `lift` above the given meshes by raycasting down;
  // mat(i, j) picks the material key of cell (i, j) of an nx x nz checker, each cell sub x sub quads
  const ray = new THREE.Raycaster();
  function decal(targets, x0, x1, z0, z1, nx, nz, sub, lift, mat) {
    const probe = targets.map((g) => new THREE.Mesh(g, new THREE.MeshBasicMaterial()));
    const H = (x, z) => {
      ray.set(new THREE.Vector3(x, 5, z), new THREE.Vector3(0, -1, 0));
      const hit = ray.intersectObjects(probe, false)[0];
      return (hit ? hit.point.y : 0) + lift;
    };
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        const pos = [], idx = [], n = sub + 1;
        for (let a = 0; a <= sub; a++)
          for (let b = 0; b <= sub; b++) {
            const x = x0 + ((x1 - x0) * (i + a / sub)) / nx, z = z0 + ((z1 - z0) * (j + b / sub)) / nz;
            pos.push(x, H(x, z), z);
          }
        for (let a = 0; a < sub; a++)
          for (let b = 0; b < sub; b++) {
            const p = a * n + b;
            idx.push(p, p + 1, p + n, p + 1, p + n + 1, p + n); // +x along a, +z along b: normal up
          }
        add(mat(i, j), pos, idx, false);
      }
  }

  // ---------- tatami: two mats, long axes along X ----------
  const TT = 0.04, MX = 0.91, MZ = 0.91;
  for (const zc of [-MZ / 2, MZ / 2]) {
    slab("tatami", rect(-MX, MX, zc - MZ / 2 + 0.002, zc + MZ / 2 - 0.002), 0, TT, 0.006, { R: 0.008, step: 0.3, K: 2 });
    for (const s of [-1, 1]) { // heri: dark cloth on the long edges, over the top and down the side
      const ze = zc + s * (MZ / 2 - 0.002);
      slab("heri", rect(-MX - 0.003, MX + 0.003, Math.min(ze, ze - s * 0.035), Math.max(ze, ze - s * 0.035)), -0.0, TT + 0.003, 0.004, { R: 0.005, step: 0.5, K: 2 });
    }
    for (let k = 1; k < 16; k++) { // weave lines along the mat, between the heri
      const z = zc - MZ / 2 + 0.04 + (k / 16) * (MZ - 0.08);
      add("weave", [-MX + 0.01, TT + 0.0008, z - 0.0015, MX - 0.01, TT + 0.0008, z - 0.0015, MX - 0.01, TT + 0.0008, z + 0.0015, -MX + 0.01, TT + 0.0008, z + 0.0015], [0, 3, 2, 0, 2, 1], false);
    }
  }

  const BZ = -0.12; // bed centre line (z)
  // ---------- pillow ----------
  function pillow(xc, zc, y0) {
    slab("pillow", rect(xc - 0.15, xc + 0.15, zc - 0.25, zc + 0.25), y0, 0.1, 0.04, { R: 0.06, puff: 0.012, pr: 0.1, step: 0.05 });
    const pr = ccw(rect(xc - 0.15, xc + 0.15, zc - 0.25, zc + 0.25));
    slab("heri", rect(xc - 0.152, xc + 0.152, zc - 0.03, zc + 0.03), y0 - 0.002, 0.104, 0.04, { R: 0.042, step: 0.03,
      deform: (x, y, z, w) => w * 0.012 * ss(0, 0.1, inside(pr, x, z)) });
  }

  let duvetTop = [];
  if (!folded) {
    // ---------- shikibuton ----------
    const endSag = (x) => -TT * ss(MX - 0.03, 1.0, Math.abs(x));
    slab("mattress", rect(-1.0, 1.0, BZ - 0.5, BZ + 0.5), TT, 0.08, 0.035, { R: 0.06, puff: 0.01, pr: 0.2, deform: (x) => endSag(x) });
    const MT = TT + 0.08; // mattress top
    // ---------- kakebuton ----------
    const DW = 0.65, DT = 0.05, x0 = -0.98, x1 = 0.95;
    const drape = (z) => -(MT - TT - 0.004) * ss(0.46, 0.64, Math.abs(z - BZ));
    const dDef = (x, y, z) => drape(z) + endSag(x);
    const F1 = [0.02, BZ + DW], F2 = [0.7, BZ - DW]; // fold line, front to back
    const fx = F2[0] - F1[0], fz = F2[1] - F1[1], fl = Math.hypot(fx, fz), nx = -fz / fl, nz = fx / fl; // normal toward +X
    const k = nx * F1[0] + nz * F1[1];
    const full = rect(x0, x1, BZ - DW, BZ + DW);
    const lower = clip(full, nx, nz, k);
    const beyond = clip(full, -nx, -nz, -k);
    const refl = beyond.map(([x, z]) => { const d = nx * x + nz * z - k; return [x - 2 * d * nx, z - 2 * d * nz]; });
    const flap = clip(clip(refl, 0, 1, BZ + DW - 0.01), 0, -1, -(BZ - DW + 0.01));
    const lowerPuff = 0.03;
    const lowerAt = (x, z) => lowerPuff * ss(0, 0.3, inside(ccw(lower), x, z));
    duvetTop.push(slab("duvet", lower, MT, DT, 0.022, { R: 0.04, puff: lowerPuff, pr: 0.3, deform: dDef }));
    slab("duvet", flap, MT + DT + 0.01, 0.04, 0.018, { R: 0.05, puff: 0.012, pr: 0.06, deform: (x, y, z) => dDef(x, y, z) + lowerAt(x, z) });
    const lift = (DT + 0.004) / 2;
    roll("duvet", [F1[0], MT + lift + 0.004, F1[1] + 0.005], [F2[0], MT + lift + 0.004, F2[1] - 0.005], lift + 0.008, (x, y, z) => dDef(x, y, z));
    // ichimatsu band near the foot
    decal(duvetTop, -0.74, -0.46, BZ - DW + 0.024, BZ + DW - 0.024, 2, 10, 3, 0.004, (i, j) => ((i + j) % 2 ? "bandDark" : "band"));
    pillow(0.79, BZ, MT - 0.01);
  } else {
    // ---------- daytime stack on the back mat ----------
    const SZ = -0.4, SX = 0, L = 0.67;
    let y = TT;
    function stack(key, w, t, n, puff) {
      const tops = [];
      for (let i = 0; i < n; i++) {
        tops.push(slab(key, rect(SX - L / 2, SX + L / 2, SZ - w / 2, SZ + w / 2), y + i * t, t, t * 0.45, { R: 0.05, puff: i === n - 1 ? puff : 0.004, pr: 0.15, step: 0.12 }));
        if (i < n - 1) { // the fold roll joining layer i and i + 1, alternating ends
          const xe = SX + (i % 2 ? -1 : 1) * (L / 2 - t * 0.5);
          roll(key, [xe, y + (i + 1) * t, SZ - w / 2 + t * 0.55], [xe, y + (i + 1) * t, SZ + w / 2 - t * 0.55], t * 0.95);
        }
      }
      y += n * t;
      return tops[n - 1];
    }
    stack("mattress", 1.0, 0.075, 3, 0.008);
    const top = stack("duvet", 0.96, 0.05, 3, 0.02);
    decal([top], SX - 0.1, SX + 0.1, SZ - 0.46, SZ + 0.46, 2, 8, 3, 0.004, (i, j) => ((i + j) % 2 ? "bandDark" : "band"));
    pillow(SX, SZ, y + 0.016);
  }

  // ---------- meshes: one per material ----------
  const MAT = {
    tatami: [c.tatami, c.tatamiShade, 0.1, 3],
    weave: [c.weave, c.weave, 0.1, 0],
    heri: [c.heri, c.heriShade, 0.1, 2.5],
    mattress: [c.mattress, c.mattressShade, 0.1, 3.5],
    duvet: [c.duvet, c.duvetShade, 0.1, 3.5],
    band: [c.band, c.bandShade, 0.1, 0],
    bandDark: [c.bandDark, c.bandDarkShade, 0.1, 0],
    pillow: [c.pillow, c.pillowShade, 0.1, 3.5],
  };
  let top = 0;
  for (const [key, list] of Object.entries(parts)) {
    const pos = [], nrm = [], idx = [];
    for (const g of list) {
      const o = pos.length / 3;
      pos.push(...g.attributes.position.array);
      nrm.push(...g.attributes.normal.array);
      for (const i of g.index.array) idx.push(i + o);
    }
    for (let i = 1; i < pos.length; i += 3) top = Math.max(top, pos[i]);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
    g.setIndex(idx);
    const [base, shade, threshold, px] = MAT[key];
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    body.add(mesh);
  }
  body.scale.setScalar((opts.height ?? top) / top);

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
