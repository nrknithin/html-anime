// utility-pole.js - the Japanese concrete utility pole (denchu) with its overhead wires, static; the street skyline.
// Contract: harness/lab/README.md. Meters, +Y up, the street side faces +Z, its left is +X; the wires run along X
// (down the street), so poles placed in a row along X at `span` apart join into one line. Stands on y = 0, the pole
// axis on x = 0, z = 0.
//
// Construction (lathes, boxes and swept tubes, all triangle soups merged per material, so the whole pole is 10 meshes;
// boxes are flat-shaded, lathes and tubes carry radial normals so a 12-sided pole reads round):
//   POLE     one closed lathe, straight taper from 0.40 m to 0.20 m diameter, a domed top cap. Step bolts (ashiba)
//            stick out along +-X, staggered left/right every 0.45 m from 2.4 m up to the transformer.
//   SLEEVE   a pale-yellow guard cylinder at the foot, 12 mm proud, with black helical stripes 3 mm proud of it (ink
//            bands, no hull: the sleeve's hull draws the outline). The helix pitch is a whole number of stripe pairs
//            per turn, so the stripes close round the back with no seam.
//   TOP      a steel crossarm along Z at 12.25 m on the +X face, two diagonal braces, three stacked-disc insulators
//            carrying the high-voltage lines; a short low-voltage rack at 10.3 m (two spool insulators, two lines).
//   DRUM     the pole transformer: a closed lathe drum with a lid lip and dome, hung on a bracket on the +X face,
//            two bushings on its lid with dark leads up to the crossarm.
//   LAMP     a bent tube arm out to +Z at 5.4 m and a small box lamp with a pale diffuser underneath.
//   PLATE    a green address plate (blank band, no lettering) and a small white number tag on the +Z face.
//   WIRES    parabolic sag spans (a catenary at these sags) from each attachment out to x = +-span / 2, where the sag
//            bottoms out with a level tangent: the next pole's half span meets it there. Wires are dark 4-sided tubes
//            (2-3.5 cm) with a 1 px ink hull, so they stay a ~2-3 px line at any size. Telecom cables hang lower, heavier
//            and with more sag, on a bracket at the -Z face.
// Proportions (real size, a 14 m class pole planted ~2 m, base unit the pole diameter at the foot D = 0.40 m):
//   top 12.8 (32 D), top diameter 0.20; sleeve 0.0-1.9; plate 2.3-3.0; lamp arm 5.4, head 1.25 out; telecom 6.6 and 7.1;
//   transformer 8.5-9.6 (0.62 dia); LV rack 10.3; crossarm 12.25, 1.9 long; insulators to 12.5. Sag 2.2 % of span for HV,
//   2.6 % for LV, 3.2 % for telecom.
// Options: build(THREE, kit, colors, { wires, span, transformer, lamp, height }).
//   wires        true (default): the spans; false: the bare pole with its hardware (centred on its bbox, so the
//                drum side shifts the axis ~0.2 m to -X).
//   span         pole spacing in m (default 30). Each pole draws half a span each side.
//   transformer  true (default) | false.   lamp  true (default) | false.
//   height       scales the pole uniformly so its top is `height` (default 12.8); span stays in world metres.
// Budget: 2.86k triangles with wires (the wires 1.18k), 1.68k bare, 1.2k with no drum or lamp; 10 meshes.
// Colours (meadow: a sunny street, the yellow guard needs its practical): concrete moon #f7f3e1 / sky #d7ecef (the
// cool shade reads as grey concrete); steel (crossarm, bracket, lamp, drum) sclera #f6f3ee / sky #d7ecef; drum bands and
// bolts, wires, leads hair #2c5131 / ink #1c261b; insulators sclera / moon at threshold -0.25 (white porcelain stays
// white); guard practical #f2c94c / moon #f7f3e1 with ink #1c261b stripes; plate iris #3f8a47 / hair, blank band sclera;
// lamp diffuser moon (glow, no shade).

export const meta = {
  name: "utility-pole",
  height: 12.8,
  script: "meadow",
  colors: {
    concrete: "#f7f3e1", concreteShade: "#d7ecef",
    steel: "#f6f3ee", steelShade: "#d7ecef",
    dark: "#2c5131", darkShade: "#1c261b",
    porcelain: "#f6f3ee", porcelainShade: "#f7f3e1",
    guard: "#f2c94c", guardShade: "#f7f3e1",
    stripe: "#1c261b",
    plate: "#3f8a47", plateShade: "#2c5131",
    blank: "#f6f3ee",
    wire: "#1c261b",
    glow: "#f7f3e1",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { wires = true, span = 30, transformer = true, lamp = true, height = meta.height } = opts;
  const root = new THREE.Group();
  root.name = "utility-pole";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  const k = height / meta.height;
  body.scale.setScalar(k);
  root.add(body);
  const joints = {};
  const half = span / 2 / k; // half span in body metres

  // ---------- triangle soups with normals ----------
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
    if (flip) n = mul(n, -1);
    n = nrm(n);
    const s = S(key);
    const [B, NB, E, NE] = flip ? [e, ne, b, nb] : [b, nb, e, ne];
    for (const [q, nq] of [[a, na ?? n], [B, NB ?? n], [E, NE ?? n]]) s.p.push(...q), s.n.push(...nq);
  }
  const quad = (key, a, b, e, d, ref, na, nb, ne, nd) => (tri(key, a, b, e, ref, na, nb, ne), tri(key, a, e, d, ref, na, ne, nd));
  function box(key, x0, x1, y0, y1, z0, z1) {
    const p = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    const ref = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  // closed lathe about a vertical axis at (cx, cz): prof = [[r, y], ...] bottom to top; r = 0 ends are poles (closed)
  function lathe(key, cx, cz, prof, sides) {
    const ring = (r, y) => Array.from({ length: sides }, (_, j) => {
      const a = (j / sides) * Math.PI * 2;
      return { q: [cx + r * Math.cos(a), y, cz + r * Math.sin(a)], n: [Math.cos(a), 0, Math.sin(a)] };
    });
    const rings = prof.map(([r, y]) => ring(r, y));
    for (let i = 0; i + 1 < prof.length; i++) {
      const ref = [cx, (prof[i][1] + prof[i + 1][1]) / 2, cz];
      const flat = Math.abs(prof[i][1] - prof[i + 1][1]) < 1e-6; // a ledge: face normal
      for (let j = 0; j < sides; j++) {
        const jj = (j + 1) % sides;
        const [a, b, e, d] = [rings[i][j], rings[i][jj], rings[i + 1][jj], rings[i + 1][j]];
        // a ledge stepping in faces up, stepping out faces down
        if (flat) quad(key, a.q, b.q, e.q, d.q, [cx, prof[i][1] + (prof[i + 1][0] < prof[i][0] ? -1 : 1), cz]);
        else quad(key, a.q, b.q, e.q, d.q, ref, a.n, b.n, e.n, d.n);
      }
    }
    // flat caps where an end ring has a radius
    for (const [i, s] of [[0, -1], [prof.length - 1, 1]]) {
      if (prof[i][0] < 1e-6) continue;
      const R = rings[i], cn = [0, s, 0], ref = [cx, prof[i][1] - s, cz];
      for (let j = 1; j + 1 < sides; j++) tri(key, R[0].q, R[j].q, R[j + 1].q, ref, cn, cn, cn);
    }
  }
  // a tube of radius r along the polyline pts, all in a plane with normal pn; both ends capped
  function tube(key, pts, r, pn, sides = 6) {
    const L = pts.length;
    const rings = pts.map((P, i) => {
      const T = nrm(sub(pts[Math.min(L - 1, i + 1)], pts[Math.max(0, i - 1)]));
      const u = nrm(sub(pn, mul(T, dot(pn, T)))), w = cross(T, u);
      const ring = [];
      for (let j = 0; j < sides; j++) {
        const a = (j / sides) * Math.PI * 2 + Math.PI / sides;
        const d = add(mul(u, Math.cos(a)), mul(w, Math.sin(a)));
        ring.push({ q: add(P, mul(d, r)), n: d });
      }
      return { P, T, ring };
    });
    for (let i = 0; i + 1 < L; i++) {
      const R0 = rings[i], R1 = rings[i + 1], ref = mul(add(R0.P, R1.P), 0.5);
      for (let j = 0; j < sides; j++) {
        const jj = (j + 1) % sides;
        quad(key, R0.ring[j].q, R0.ring[jj].q, R1.ring[jj].q, R1.ring[j].q, ref, R0.ring[j].n, R0.ring[jj].n, R1.ring[jj].n, R1.ring[j].n);
      }
    }
    for (const [R, s] of [[rings[0], -1], [rings[L - 1], 1]]) {
      const ref = sub(R.P, mul(R.T, s * r)), cn = mul(R.T, s);
      for (let j = 1; j + 1 < sides; j++) tri(key, R.ring[0].q, R.ring[j].q, R.ring[j + 1].q, ref, cn, cn, cn);
    }
  }

  // ---------- pole ----------
  const TOP = 12.8, R0 = 0.2, R1 = 0.1;
  const rp = (y) => R0 + (R1 - R0) * (y / TOP);
  lathe("concrete", 0, 0, [[R0, 0], [rp(4), 4], [rp(8.5), 8.5], [rp(12.6), 12.6], [R1 * 0.75, 12.74], [0, TOP]], 12);

  // guard sleeve: a yellow cylinder, black helical stripes 3 mm proud (pitch: 8 stripe heights per turn, an even count)
  const GY0 = 0.0, GY1 = 1.9, GR = R0 + 0.012, SH = 0.16, SIDES = 16;
  lathe("guard", 0, 0, [[GR, GY0], [GR, GY1], [rp(GY1) + 0.002, GY1]], SIDES);
  {
    const r = GR + 0.003, rise = 8 * SH;
    const at = (j, y) => {
      const a = (j / SIDES) * Math.PI * 2;
      const yy = Math.min(GY1 - 0.004, Math.max(GY0 + 0.004, y));
      return [r * Math.cos(a), yy, r * Math.sin(a)];
    };
    for (let b = -8; b * SH < GY1; b += 2) // black stripe b spans [b, b+1) stripe heights, sheared along the helix
      for (let j = 0; j < SIDES; j++) {
        const y0 = (jj) => b * SH + (rise * jj) / SIDES;
        const A = at(j, y0(j)), B = at(j + 1, y0(j + 1)), C = at(j + 1, y0(j + 1) + SH), D = at(j, y0(j) + SH);
        const ref = [0, (A[1] + C[1]) / 2, 0];
        const nA = nrm([A[0], 0, A[2]]), nB = nrm([B[0], 0, B[2]]);
        quad("stripe", A, B, C, D, ref, nA, nB, nB, nA);
      }
  }

  // step bolts: staggered along +-X, every 0.45 m
  for (let i = 0, y = 2.4; y < 11.9; i++, y += 0.45) {
    if (transformer && y > 8.3 && y < 9.9 && i % 2 === 0) continue; // the drum's side
    const s = i % 2 ? -1 : 1, r = rp(y);
    box("dark", s > 0 ? r - 0.02 : -r - 0.2, s > 0 ? r + 0.2 : -r + 0.02, y - 0.016, y + 0.016, -0.016, 0.016);
  }

  // ---------- top: crossarm, braces, insulators ----------
  const AY = 12.25, AX = rp(AY) + 0.045, AZ = 0.95;
  box("steel", AX - 0.045, AX + 0.045, AY - 0.045, AY + 0.045, -AZ, AZ);
  box("steel", rp(AY) - 0.02, AX, AY - 0.1, AY + 0.1, -0.09, 0.09); // the clamp band
  for (const s of [-1, 1]) tube("steel", [[AX - 0.02, AY - 0.6, 0], [AX, AY - 0.04, s * 0.6]], 0.022, [1, 0, 0], 4);
  const hv = [-0.82, -0.3, 0.82];
  const insul = (x, y, z) => lathe("porcelain", x, z, [[0.025, y], [0.06, y + 0.03], [0.06, y + 0.06], [0.03, y + 0.08],
    [0.065, y + 0.12], [0.065, y + 0.15], [0.03, y + 0.17], [0.035, y + 0.2], [0, y + 0.22]], 6);
  for (const z of hv) insul(AX, AY + 0.045, z);
  const HVY = AY + 0.045 + 0.2;

  // low-voltage rack: a short arm on the -X face (opposite the drum), two spool insulators facing out along Z
  const LY = 10.3, LX = -(rp(LY) + 0.04);
  box("steel", LX - 0.04, LX + 0.04, LY - 0.03, LY + 0.03, -0.42, 0.42);
  for (const z of [-0.35, 0.35]) lathe("porcelain", LX, z, [[0.03, LY + 0.03], [0.055, LY + 0.06], [0.04, LY + 0.1], [0.055, LY + 0.14], [0, LY + 0.17]], 8);
  const LVY = LY + 0.15;

  // telecom bracket on the -Z face
  const TY = [6.6, 7.1];
  for (const y of TY) box("steel", -0.04, 0.04, y - 0.03, y + 0.03, -(rp(y) + 0.22), -rp(y) + 0.02);

  // ---------- transformer drum on the +X face ----------
  const DX = rp(9) + 0.36, DY0 = 8.5, DY1 = 9.5, DR = 0.31;
  if (transformer) {
    lathe("steel", DX, 0, [[0, DY0 - 0.04], [DR - 0.05, DY0 - 0.02], [DR, DY0 + 0.04], [DR, DY1 - 0.04], [DR + 0.03, DY1 - 0.02],
      [DR + 0.03, DY1 + 0.02], [DR - 0.06, DY1 + 0.08], [0, DY1 + 0.12]], 14);
    for (const y of [DY0 + 0.25, DY0 + 0.65]) lathe("dark", DX, 0, [[DR + 0.008, y], [DR + 0.008, y + 0.04]], 14); // bands
    box("steel", rp(9) - 0.02, DX - DR + 0.02, 9.25, 9.33, -0.12, 0.12); // hanger bracket
    box("steel", rp(9) - 0.02, DX - DR + 0.02, 8.7, 8.78, -0.12, 0.12);
    for (const z of [-0.14, 0.14]) {
      lathe("porcelain", DX - 0.05, z, [[0.035, DY1 + 0.06], [0.04, DY1 + 0.14], [0.025, DY1 + 0.17], [0.035, DY1 + 0.22], [0, DY1 + 0.26]], 6);
      // lead from the bushing up to the high-voltage line on the near arm end
      tube("dark", [[DX - 0.05, DY1 + 0.25, z], [DX - 0.08, DY1 + 1.2, z * 2.2], [AX + 0.02, HVY - 0.05, z < 0 ? hv[1] : hv[2] - 0.05]], 0.012, [1, 0, 0], 4);
    }
  }

  // ---------- lamp on a bent arm out to +Z ----------
  if (lamp) {
    const y = 5.4, z0 = rp(y) - 0.02;
    box("steel", -0.06, 0.06, y - 0.12, y + 0.12, z0 - 0.02, z0 + 0.04); // clamp
    tube("steel", [[0, y, z0], [0, y + 0.15, 0.55], [0, y + 0.3, 0.95], [0, y + 0.32, 1.12]], 0.025, [1, 0, 0], 6);
    box("steel", -0.09, 0.09, y + 0.2, y + 0.34, 0.95, 1.55);
    box("glow", -0.07, 0.07, y + 0.185, y + 0.21, 1.0, 1.5); // diffuser under the head
  }

  // ---------- plate and number tag on the +Z face ----------
  {
    const zf = rp(2.6) + 0.025;
    box("plate", -0.15, 0.15, 2.3, 3.0, zf - 0.03, zf);
    box("blank", -0.12, 0.12, 2.82, 2.95, zf - 0.01, zf + 0.004);
    box("blank", -0.1, 0.1, 3.4, 3.62, rp(3.5) - 0.01, rp(3.5) + 0.012);
  }

  // ---------- wires: half spans out to +-half with a level tangent there ----------
  if (wires) {
    const run = (x0, y0, z, sag, r) => {
      for (const s of [-1, 1]) {
        const pts = [];
        for (let i = 0, N = 10; i <= N; i++) {
          const u = i / N, v = 1 - u;
          pts.push([x0 + u * (s * half - x0), y0 - sag + sag * v * v, z]);
        }
        tube("wire", pts, r, [0, 0, 1], 4);
      }
    };
    for (const z of hv) run(AX, HVY - 0.02, z, 0.022 * span / k, 0.02);
    for (const z of [-0.35, 0.35]) run(LX, LVY, z, 0.026 * span / k, 0.022);
    for (const [i, y] of TY.entries()) run(0, y + 0.07, -(rp(y) + 0.2), 0.032 * span / k, i ? 0.03 : 0.036);
  }

  // ---------- meshes: one per material ----------
  const MAT = {
    concrete: [c.concrete, c.concreteShade, 0.48, 2.5],
    guard: [c.guard, c.guardShade, -0.1, 2.5],
    stripe: [c.stripe, c.stripe, 0, 0],
    steel: [c.steel, c.steelShade, 0.32, 1.5],
    dark: [c.dark, c.darkShade, 0.3, 1],
    porcelain: [c.porcelain, c.porcelainShade, -0.25, 1.2],
    plate: [c.plate, c.plateShade, 0.1, 1.5],
    blank: [c.blank, c.blank, 0, 0],
    glow: [c.glow, c.glow, 0, 0],
    wire: [c.wire, c.wire, 0, 1],
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

  // the bare pole (no wires) is centred on its bbox, so the drum's side does not pull it off x = 0
  if (!wires) {
    let lo = Infinity, hi = -Infinity;
    for (const { p } of Object.values(soups)) for (let i = 0; i < p.length; i += 3) (lo = Math.min(lo, p[i])), (hi = Math.max(hi, p[i]));
    body.position.x = (-(lo + hi) / 2) * k;
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
