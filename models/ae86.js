// ae86.js - Toyota Sprinter Trueno / AE86 3-door liftback, 1980s, pop-up headlights (closed at rest).
// Contract: harness/lab/README.md. Meters, +Y up, the nose points +Z, wheels on y=0, centred on x=0, z=0.
//
// Construction (all hand-written lofts + a few primitives; flat-shaded so hard-surface panels read in two-tone cel):
//   TUB     lofted from ~70 cross-sections along z. Each section is a 7-point half-ring (top centre, top edge, shoulder,
//           split line, rocker, bottom centre) mirrored. The wheel arches are cut by raising the section's bottom edge
//           (yb) along a squircle around each axle, so the tub is one closed shell. Two strips: white upper body above
//           the split line (y 0.52), black lower body below it ("panda"). A half-disc liner fills each arch so you never see through it.
//   CABIN   a 4-section prism (belt, roof front, roof rear, hatch foot). Side faces lean 12 deg inward, windscreen and hatch are
//           planar. Glass is inset quads placed 4 mm off the planes, so the body-colour borders read as pillars.
//   BUMPERS black bevelled slabs (ExtrudeGeometry). Tail: black panel + two accent lamps. Nose: black lens band, amber corners.
//   POD     pop-up headlight: hinge at the rear-top edge of a lamp box; lens on its underside. Rotating -86 deg about x stands
//           the box up with the lens facing forward and the body-colour cover facing back, like the real mechanism.
//   WHEELS  steer pivot (y rotation) -> spin pivot (x rotation) -> tyre (lathe) + rim lip + 5 spokes. Wheels are children of
//           the root, not the body, so the body can roll/pitch over them.
// Proportions (spec, m): L 4.20, W 1.625, H 1.335, wheelbase 2.40 (axles z +1.12 / -1.28), track 1.34, tyre dia 0.58.
// Overhangs 0.98 front / 0.82 rear. Beltline 0.90, hood 0.60 at the nose rising to 0.90 at the cowl, roof flat y 1.335 from
// z 0.00 to -1.00, hatch glass 21 deg down to y 0.97 at z -1.93, windscreen ~28 deg.
// Colours (noon): body practical #fffaf2 / sky #f2d7ae; lower hair #241c16 / ink #2c261f; glass iris #5c3d32 / hair;
// lamps accent #c4452d / iris (the amber corner lamps are accent too: no amber on the noon script); lens/plates sclera #f6f3ee.
// Lower body is ink-ish #2c261f (not iris): it reads as "black" and the iris sidewall ring separates the tyres from it.

export const meta = {
  name: "ae86",
  height: 1.335,
  script: "noon",
  colors: {
    body: "#fffaf2", bodyShade: "#f2d7ae",
    lower: "#2c261f", lowerShade: "#241c16",
    glass: "#5c3d32", glassShade: "#241c16",
    lamp: "#c4452d", lampShade: "#5c3d32",
    lens: "#f6f3ee", lensShade: "#f2d7ae",
    tyre: "#241c16", tyreShade: "#2c261f",
  },
  poses: ["rest", "steer-left", "drift", "lights-up"],
};

const DEG = Math.PI / 180;
const REST = {
  body: [0, 0, 0],
  podL: [11, 0, 0], podR: [11, 0, 0],
  steerFL: [0, 0, 0], steerFR: [0, 0, 0], steerRL: [0, 0, 0], steerRR: [0, 0, 0],
};
const POSES = {
  rest: {},
  "steer-left": { steerFL: [0, 25, 0], steerFR: [0, 25, 0] },
  drift: { body: [1.2, 0, 4], steerFL: [0, -18, 0], steerFR: [0, -18, 0] }, // rolled to the outside of a left slide, nose dipped, counter-steered
  "lights-up": { podL: [-86, 0, 0], podR: [-86, 0, 0] },
};

export function build(THREE, kit, colors = meta.colors) {
  const c = colors;
  const root = new THREE.Group();
  root.name = "ae86";
  const joints = {};
  const joint = (name, parent, x, y, z) => {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    parent.add(g);
    joints[name] = g;
    return g;
  };
  const put = (parent, mesh, x = 0, y = 0, z = 0) => {
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  // ---------- geometry helpers ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  // Triangle soup -> flat-shaded non-indexed geometry. `inside` orients each triangle away from a reference point.
  function soup(tris, inside) {
    const out = [];
    for (const [a, b, d] of tris) {
      const n = cross(sub(b, a), sub(d, a));
      if (Math.hypot(n[0], n[1], n[2]) < 1e-9) continue; // drop degenerate quads (arch where the strip collapses)
      const m = [(a[0] + b[0] + d[0]) / 3, (a[1] + b[1] + d[1]) / 3, (a[2] + b[2] + d[2]) / 3];
      const ref = typeof inside === "function" ? inside(m) : inside;
      const flip = dot(n, sub(m, ref)) < 0;
      out.push(...a, ...(flip ? d : b), ...(flip ? b : d));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
    g.computeVertexNormals();
    return g;
  }
  // Connect consecutive rings (arrays of [x,y,z]) with quads. Open strip (no wrap).
  function strip(rings) {
    const t = [];
    for (let i = 0; i < rings.length - 1; i++) {
      const A = rings[i], B = rings[i + 1];
      for (let k = 0; k < A.length - 1; k++) {
        t.push([A[k], A[k + 1], B[k]], [A[k + 1], B[k + 1], B[k]]);
      }
    }
    return t;
  }
  // Fan-cap a ring polygon (open polyline closed by its chord).
  function cap(ring) {
    const m = ring.reduce((s, p) => [s[0] + p[0] / ring.length, s[1] + p[1] / ring.length, s[2] + p[2] / ring.length], [0, 0, 0]);
    const t = [];
    for (let k = 0; k < ring.length; k++) t.push([m, ring[k], ring[(k + 1) % ring.length]]);
    return t;
  }
  // Piecewise-linear lookup in a table of [z, value] sorted by descending z.
  function at(table, z) {
    if (z >= table[0][0]) return table[0][1];
    for (let i = 0; i < table.length - 1; i++) {
      const [z0, v0] = table[i], [z1, v1] = table[i + 1];
      if (z <= z0 && z >= z1) return v0 + ((v1 - v0) * (z0 - z)) / (z0 - z1 || 1);
    }
    return table[table.length - 1][1];
  }
  const toon = (g, b, s, o) => kit.toon(g, b, s, o);
  const flat = (g, b, s) => toon(g, b, s, { outline: false });
  const glow = (g, b, s) => toon(g, b, s, { outline: false, threshold: -0.7 }); // practicals keep their base tone on any face

  // ---------- TUB (lower body, hood, wings, deck) ----------
  const AXLE_F = 1.12, AXLE_R = -1.28, WR = 0.29, ARCH = 0.345, SPLIT = 0.48, SILL = 0.3;
  const YT = [[2.03, 0.64], [2.0, 0.67], [1.9, 0.69], [0.79, 0.875], [0.74, 0.9], [0.66, 0.86], [-1.9, 0.93], [-1.98, 0.95], [-2.03, 0.92]];
  const WS = [[2.03, 0.7], [2.0, 0.765], [1.9, 0.805], [1.8, 0.812], [-1.9, 0.812], [-1.98, 0.8], [-2.03, 0.74]];
  const CROWN = [[3, 0], [-3, 0]]; // hood crown disabled: a flat hood reads cleaner in two-tone (a 14 mm ridge made a stray line)
  const archY = (z) => {
    let y = SILL;
    for (const ac of [AXLE_F, AXLE_R]) {
      const d = Math.abs(z - ac) / ARCH;
      if (d < 1) y = Math.max(y, WR + ARCH * Math.pow(1 - Math.pow(d, 2.6), 1 / 2.6));
    }
    return y;
  };
  const zs = new Set([2.03, 2.0, 1.9, 0.79, 0.74, 0.66, -1.9, -1.98, -2.03]);
  for (const ac of [AXLE_F, AXLE_R]) for (let k = -12; k <= 12; k++) zs.add(+(ac + (ARCH * k) / 12).toFixed(4));
  const zlist = [...zs].sort((a, b) => b - a);
  const upper = [], lower = [];
  for (const z of zlist) {
    const yt = at(YT, z), ws = at(WS, z), wt = ws - 0.055, cr = at(CROWN, z);
    const yb = archY(z), ysp = Math.max(SPLIT, yb), wb = ws - 0.075;
    upper.push([[0, yt + cr, z], [wt, yt, z], [ws, yt - 0.07, z], [ws, ysp, z], [-ws, ysp, z], [-ws, yt - 0.07, z], [-wt, yt, z], [0, yt + cr, z]]);
    const ysl = ysp - (ysp - yb) * 0.85; // keep the lit rocker wall vertical: a 12 deg bevel here dropped it below the 0.35 cel threshold
    lower.push([[ws, ysp, z], [ws, ysl, z], [wb, yb, z], [0, yb, z], [-wb, yb, z], [-ws, ysl, z], [-ws, ysp, z]]);
  }
  // upper strip order: split line (right) -> up the side -> over the top -> down the other side
  const upperRings = upper.map((r) => [r[3], r[2], r[1], r[0], r[6], r[5], r[4]]);
  const first = zlist[0], last = zlist[zlist.length - 1];
  const upperTris = [...strip(upperRings), ...cap(upperRings[0]), ...cap(upperRings[upperRings.length - 1])];
  const lowerTris = [...strip(lower), ...cap(lower[0]), ...cap(lower[lower.length - 1])];
  // outward reference for triangle winding: the car axis (end caps use half the z so they face out)
  const centre = (m) => [0, 0.55, Math.abs(m[2] - first) < 0.02 || Math.abs(m[2] - last) < 0.02 ? m[2] * 0.5 : m[2]];
  const shell = joint("body", root, 0, 0.4, 0);
  const car = new THREE.Group(); // body parts live here so the pivot can sit at roll-centre height
  car.position.y = -0.4;
  shell.add(car);

  put(car, toon(soup(upperTris, centre), c.body, c.bodyShade));
  put(car, toon(soup(lowerTris, centre), c.lower, c.lowerShade));

  // arch liners: dark half-discs inboard of each wheel
  for (const sx of [1, -1]) for (const zc of [AXLE_F, AXLE_R]) {
    const g = new THREE.CircleGeometry(ARCH - 0.005, 24, 0, Math.PI);
    const m = flat(g, c.lower, c.lowerShade);
    m.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
    put(car, m, sx * 0.55, WR, zc);
  }

  // arch flares: a thin body-colour tube following the squircle opening (gives the arch an ink line)
  for (const sx of [1, -1]) for (const zc of [AXLE_F, AXLE_R]) {
    const pts = [];
    for (let k = 0; k <= 24; k++) {
      const t = -1 + (2 * k) / 24, y = WR + (ARCH + 0.012) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), 2.6)), 1 / 2.6);
      pts.push(new THREE.Vector3(0, y, t * (ARCH + 0.012)));
    }
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 0.016, 4, false);
    put(car, toon(tube, c.body, c.bodyShade), sx * 0.812, 0, zc);
  }

  // ---------- CABIN ----------
  const XB = 0.76, XR = 0.63, YB = 0.84, YROOF = 1.335, ZR1 = -0.2, ZR2 = -0.9, ZC = 0.74, ZH = -1.93, YH = 0.95;
  const lean = (y) => XB - ((y - YB) / (YROOF - YB)) * (XB - XR);
  const CAB = [[ZC, 0.9], [ZR1, YROOF], [ZR2, YROOF], [ZH, YH]];
  const cabRings = CAB.map(([z, yt]) => [[-XB, YB, z], [-lean(yt), yt, z], [lean(yt), yt, z], [XB, YB, z]]);
  const cabTris = [...strip(cabRings), ...cap(cabRings[0]), ...cap(cabRings[3])];
  const cabC = (m) => [0, 1.0, m[2] * 0.3 + (-0.5) * 0.7 + (m[2] > 0.5 ? 0.3 : 0)];
  put(car, toon(soup(cabTris, cabC), c.body, c.bodyShade));

  // glass: planar polygon pushed 4 mm out along its normal, fan-triangulated
  function glass(pts, out, off = 0.004) {
    const n0 = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]));
    let n = n0; const L = Math.hypot(...n); n = n.map((v) => v / L);
    if (dot(n, out) < 0) n = n.map((v) => -v);
    const P = pts.map((p) => [p[0] + n[0] * off, p[1] + n[1] * off, p[2] + n[2] * off]);
    const t = [];
    for (let i = 1; i < P.length - 1; i++) t.push([P[0], P[i], P[i + 1]]);
    return soup(t, (m) => [m[0] - n[0], m[1] - n[1], m[2] - n[2]]);
  }
  // windscreen (z from .706 to .085), hatch (z -1.09 to -1.853)
  const SW = (YROOF - 0.9) / (ZC - ZR1);
  const wy = (z) => 0.9 + (ZC - z) * SW;
  const wsPts = (z1, z2, m) => [[-(lean(wy(z1)) - m), wy(z1), z1], [lean(wy(z1)) - m, wy(z1), z1], [lean(wy(z2)) - m, wy(z2), z2], [-(lean(wy(z2)) - m), wy(z2), z2]];
  put(car, flat(glass(wsPts(0.6, ZR1 + 0.1, 0.05), [0, 1, 1]), c.glass, c.glassShade));
  const SH = (YROOF - YH) / (ZR2 - ZH);
  const hy = (z) => YROOF + (z - ZR2) * SH;
  const hPts = (z1, z2, m) => [[-(lean(hy(z1)) - m), hy(z1), z1], [lean(hy(z1)) - m, hy(z1), z1], [lean(hy(z2)) - m, hy(z2), z2], [-(lean(hy(z2)) - m), hy(z2), z2]];
  put(car, flat(glass(hPts(-1.0, -1.84, 0.05), [0, 1, -1]), c.glass, c.glassShade));
  // side windows: door glass and quarter glass, (z, y) pairs on the leaning side plane
  const sidePoly = (pairs, s) => pairs.map(([z, y]) => [s * lean(y), y, z]);
  const door = [[0.6, 0.93], [-0.17, 1.285], [-0.5, 1.285], [-0.47, 0.93]];
  const quarter = [[-0.62, 0.97], [-0.62, 1.285], [-0.86, 1.285], [-1.62, 1.03], [-1.62, 0.97]];
  for (const s of [1, -1]) {
    put(car, flat(glass(sidePoly(door, s), [s, 0, 0]), c.glass, c.glassShade));
    put(car, flat(glass(sidePoly(quarter, s), [s, 0, 0]), c.glass, c.glassShade));
  }

  // glass streaks (flat sky-tone parallelograms, anime reflection)
  const wp = (u, t) => { const z = 0.6 + (ZR1 + 0.1 - 0.6) * t, y = wy(z); return [u * (lean(y) - 0.05), y, z]; };
  put(car, flat(glass([wp(-0.75, 0.12), wp(-0.5, 0.12), wp(0.1, 0.92), wp(-0.15, 0.92)], [0, 1, 1], 0.006), c.bodyShade, c.bodyShade));
  put(car, flat(glass([wp(0.55, 0.12), wp(0.62, 0.12), wp(0.9, 0.7), wp(0.83, 0.7)], [0, 1, 1], 0.006), c.bodyShade, c.bodyShade));
  for (const s of [1, -1]) put(car, flat(glass(sidePoly([[0.15, 0.95], [0.04, 0.95], [-0.34, 1.27], [-0.23, 1.27]], s), [s, 0, 0], 0.006), c.bodyShade, c.bodyShade));

  // ---------- BUMPERS, SPOILER, MIRRORS, LAMPS ----------
  function slab(w, h, r, depth) {
    const s = new THREE.Shape();
    const x = w / 2, y = h / 2;
    s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r); s.lineTo(x, y - r);
    s.quadraticCurveTo(x, y, x - r, y); s.lineTo(-x + r, y); s.quadraticCurveTo(-x, y, -x, y - r); s.lineTo(-x, -y + r);
    s.quadraticCurveTo(-x, -y, -x + r, -y);
    return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 1, curveSegments: 3 });
  }
  put(car, toon(slab(1.54, 0.14, 0.05, 0.12), c.body, c.bodyShade), 0, 0.43, 1.95); // white bumper (panda scheme)
  put(car, toon(slab(1.3, 0.09, 0.04, 0.1), c.lower, c.lowerShade), 0, 0.29, 1.95); // black chin spoiler
  put(car, toon(slab(1.46, 0.14, 0.05, 0.12), c.body, c.bodyShade), 0, 0.46, -2.07);
  put(car, toon(slab(1.3, 0.1, 0.04, 0.1), c.lower, c.lowerShade), 0, 0.33, -2.07);
  // lip spoiler on the hatch foot
  const spoiler = put(car, toon(new THREE.BoxGeometry(1.3, 0.03, 0.12), c.lower, c.lowerShade), 0, 0.985, -1.97);
  spoiler.rotation.x = -0.12;

  // mirrors
  for (const s of [1, -1]) {
    put(car, toon(new THREE.BoxGeometry(0.075, 0.08, 0.12), c.lower, c.lowerShade), s * 0.84, 0.97, 0.38);
    put(car, toon(new THREE.BoxGeometry(0.08, 0.025, 0.04), c.lower, c.lowerShade), s * 0.79, 0.93, 0.42);
  }

  // door seams and handle: thin flat strips on the leaning side plane (no ink)
  for (const s of [1, -1]) {
    put(car, flat(new THREE.BoxGeometry(0.006, 0.36, 0.008), c.lowerShade, c.lowerShade), s * 0.814, 0.68, 0.56); // front door seam (tub)
    put(car, flat(new THREE.BoxGeometry(0.006, 0.36, 0.008), c.lowerShade, c.lowerShade), s * 0.814, 0.68, -0.52); // rear door seam (tub)
    const up = put(car, flat(new THREE.BoxGeometry(0.006, 0.4, 0.008), c.lowerShade, c.lowerShade), s * (lean(1.06) + 0.004), 1.06, -0.52); // B-pillar seam on the leaning cabin side
    up.rotation.z = s * Math.atan((XB - XR) / (YROOF - YB));
    put(car, flat(new THREE.BoxGeometry(0.012, 0.025, 0.12), c.lowerShade, c.lowerShade), s * 0.818, 0.8, -0.34);
  }

  // nose: black lens band under the leading edge, amber corner lamps, parking lamps
  put(car, flat(new THREE.BoxGeometry(1.5, 0.07, 0.01), c.lower, c.lowerShade), 0, 0.565, 2.036);
  for (const s of [1, -1]) {
    put(car, glow(new THREE.BoxGeometry(0.2, 0.07, 0.01), c.lamp, c.lampShade), s * 0.58, 0.43, 2.103);
    put(car, glow(new THREE.BoxGeometry(0.1, 0.05, 0.01), c.lens, c.lensShade), s * 0.71, 0.43, 2.103);
  }
  // cowl strip at the windscreen base
  put(car, flat(new THREE.BoxGeometry(1.2, 0.012, 0.07), c.lowerShade, c.lowerShade), 0, 0.905, 0.72);
  // tail: black panel, two lamps, centre bar
  put(car, flat(new THREE.BoxGeometry(1.5, 0.3, 0.01), c.lower, c.lowerShade), 0, 0.8, -2.04);
  for (const s of [1, -1]) {
    put(car, glow(new THREE.BoxGeometry(0.52, 0.22, 0.012), c.lamp, c.lampShade), s * 0.47, 0.8, -2.044);
  }
  put(car, glow(new THREE.BoxGeometry(0.34, 0.07, 0.012), c.lamp, c.lampShade), 0, 0.84, -2.044);

  put(car, toon(new THREE.BoxGeometry(0.3, 0.12, 0.006), c.lens, c.lens), 0, 0.46, -2.1); // blank plate
  put(car, toon(new THREE.BoxGeometry(0.3, 0.12, 0.006), c.lens, c.lens), 0, 0.42, 2.108); // blank plate (front)

  // ---------- POP-UP HEADLIGHTS ----------
  const hoodY = (z) => at(YT, z) + at(CROWN, z) * 0.6;
  for (const [name, s] of [["podL", 1], ["podR", -1]]) {
    const hz = 1.84;
    const recess = put(car, flat(new THREE.BoxGeometry(0.42, 0.006, 0.2), c.lower, c.lowerShade), s * 0.5, hoodY(hz + 0.09) - 0.0025, hz + 0.09);
    recess.rotation.x = 11 * DEG;
    const pod = joint(name, car, s * 0.5, hoodY(hz) + 0.004, hz);
    put(pod, toon(new THREE.BoxGeometry(0.4, 0.03, 0.18), c.body, c.bodyShade), 0, -0.015, 0.09);   // cover
    put(pod, toon(new THREE.BoxGeometry(0.36, 0.12, 0.16), c.lower, c.lowerShade), 0, -0.09, 0.09);   // housing
    put(pod, glow(new THREE.BoxGeometry(0.31, 0.006, 0.13), c.lens, c.lensShade), 0, -0.153, 0.09); // lens, faces forward once raised
  }

  // ---------- WHEELS ----------
  function tyreGeom() {
    const hw = 0.095, ri = 0.17, ro = WR;
    const prof = [[ri, -hw + 0.01], [ri + 0.03, -hw], [ro - 0.04, -hw - 0.003], [ro - 0.012, -hw + 0.02], [ro, -0.05], [ro, 0.05], [ro - 0.012, hw - 0.02], [ro - 0.04, hw + 0.003], [ri + 0.03, hw], [ri, hw - 0.01]];
    const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 28);
    g.rotateZ(Math.PI / 2); // lathe axis Y -> X
    return g;
  }
  const tyre = tyreGeom();
  const spokeG = new THREE.BoxGeometry(0.014, 0.13, 0.034);
  spokeG.translate(0, 0.085, 0);
  for (const [tag, s, zc] of [["FL", 1, AXLE_F], ["FR", -1, AXLE_F], ["RL", 1, AXLE_R], ["RR", -1, AXLE_R]]) {
    const steer = joint("steer" + tag, root, s * 0.67, WR, zc);
    const spin = joint("spin" + tag, steer, 0, 0, 0);
    put(spin, toon(tyre, c.tyre, c.tyreShade));
    const face = new THREE.CylinderGeometry(0.165, 0.165, 0.012, 24);
    face.rotateZ(Math.PI / 2);
    put(spin, flat(face, c.lower, c.lowerShade), s * 0.07, 0, 0);
    const ring = new THREE.TorusGeometry(0.225, 0.006, 4, 28);
    ring.rotateY(Math.PI / 2);
    put(spin, flat(ring, c.glass, c.glassShade), s * 0.096, 0, 0); // sidewall line so the tyre separates from the black lower body
    const lip = new THREE.TorusGeometry(0.166, 0.012, 5, 24);
    lip.rotateY(Math.PI / 2);
    put(spin, flat(lip, c.lens, c.lensShade), s * 0.074, 0, 0);
    for (let k = 0; k < 5; k++) {
      const sp = flat(spokeG, c.lens, c.lensShade);
      sp.rotation.x = (k * 72 * DEG);
      put(spin, sp, s * 0.078, 0, 0);
    }
    const hub = new THREE.CylinderGeometry(0.04, 0.04, 0.02, 12);
    hub.rotateZ(Math.PI / 2);
    put(spin, flat(hub, c.lens, c.lensShade), s * 0.082, 0, 0);
  }

  function pose(name) {
    const rows = POSES[name];
    if (!rows) throw new Error(`unknown pose "${name}" (${Object.keys(POSES).join(", ")})`);
    const table = { ...REST, ...rows };
    for (const [j, [rx, ry, rz]] of Object.entries(table)) joints[j].rotation.set(rx * DEG, ry * DEG, rz * DEG);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}
