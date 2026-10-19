// streetcar.js - a small seaside streetcar (an original two-tone retro tram in the spirit of the coastal lines) at a
// tiny one-platform stop, real size. Contract: harness/lab/README.md. Meters, +Y up, the tram's front (and the stop's
// "down the line" end) faces +Z, its left is +X (the open side; the platform is on -X, behind the car from the front-left), stands on y = 0, centred on x = 0, z = 0.
//
// Construction (triangle soups merged per material, one mesh each; every closed part wound from a point inside it):
//   CAR      stacked plan rings: at each height a ring of 26 points, two straight sides and superellipse end caps
//            (bulge E, exponent 2.6), so the front and back read rounded in plan. Bands: green skirt to the sill, cream
//            window band to the eave, green roof whose rings shrink in width and length to a low dome over both ends.
//            Normals are averaged from the ring grid, so the nose shades smoothly. Windows, doors, the destination box
//            and the headlight are panels laid on that surface (sampled on the cap function, 1-2 cm proud): opaque dark
//            panes with pale diagonal glints. Bogies, wheels, equipment boxes and the anticlimbers are dark boxes.
//   PANTO    a single-arm pantograph on the roof: base on insulators, lower arm, upper arm, collector head with horns.
//            ONE mesh; pose() rewrites its vertices from three joints (pantoLow at the hinge, pantoUp at the knee,
//            pantoHead at the tip), authored at rest and moved by M_now * inverse(M_rest), as the ufo-catcher claw.
//            A two-bone solve puts the head on the contact wire every frame; the wobble is a small lift and head rock.
//   TRACK    a grass-grown ballast bed (trapezoid prism), concrete sleepers every 0.6 m, dark rails with pale head tops.
//   WIRE     concrete poles on the platform's back edge with bracket arms and stays reaching over the track, one
//            straight contact wire over the track centre (a plain trolley-style overhead; a messenger read as a ladder).
//   STOP     a low concrete platform on -X with ramped ends, a coping lip and a yellow tactile strip; toward its +Z end a
//            small shelter (dark posts, back panel, red monopitch roof) over a bench, and a blank name board on two
//            posts set across the platform so it faces down the line. Shelter and board sit at the +Z end so the
//            front-left camera sees them past the car's nose instead of behind its body.
// Proportions (base unit the car body length B = 12.7 m over the noses): body half-width 1.22, skirt bottom 0.55,
// sill 1.45, eave 3.25, roof crown 3.67 above rail top (rail top 0.38 world); 1067 mm gauge; bogie centres +-4.0, wheel
// radius 0.33; contact wire 5.25 world, poles 5.85 (the top of the set), platform 0.62 high, 3.0 wide, 14 m + 1.6 m ramps.
// Colours (meadow): car green iris #3f8a47 / hair #2c5131; car cream moon #f7f3e1 / sky #d7ecef; dark parts (bogies,
// rails, wires, posts, pantograph) hair flat; windows hair flat, no hull, glints and the blank destination face sclera
// #f6f3ee flat; headlight practical #f2c94c flat; concrete (platform, sleepers, poles, board) sclera / sky; track bed
// line #a9d16e / iris; shelter roof accent #d9483b / skin #f0c2ae; bench and tactile strip practical / skin.
// Joints: car (the tram's root offset: position.z rolls it along the track), body (pitch about the floor centre,
// +rx dips the nose), pantoLow, pantoUp, pantoHead (all rotate about X; +rx tips local +Y toward +Z).
// Clip: arrive 7 s, looping: 0-3.4 s the tram brakes evenly from 4 m up the line to a stop (nose dipping), 3.4-7 s it
// stands, the body rocking back and settling; the pantograph head chatters on the wire while rolling and wobbles out
// after the stop. The loop restarts with the tram back up the line (a cut, as a stop arrival is not cyclic).
// Options: build(THREE, kit, colors, { height, tram }) - height scales the set uniformly (top of the poles, default
// meta.height); tram: false leaves the empty stop (no car, no car joints; the clip then changes nothing).

export const meta = {
  name: "streetcar",
  height: 5.85,
  script: "meadow",
  colors: {
    green: "#3f8a47", greenShade: "#2c5131",
    cream: "#f7f3e1", creamShade: "#d7ecef",
    dark: "#2c5131",
    glass: "#2c5131",
    glint: "#f6f3ee",
    lamp: "#f2c94c",
    concrete: "#f6f3ee", concreteShade: "#d7ecef",
    bed: "#a9d16e", bedShade: "#3f8a47",
    roof: "#d9483b", roofShade: "#f0c2ae",
    yellow: "#f2c94c", yellowShade: "#f0c2ae",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const { height = meta.height, tram = true } = opts;
  const TAU = Math.PI * 2;
  const root = new THREE.Group();
  root.name = "streetcar";
  const set = new THREE.Group();
  set.name = "set";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [], o: [] });
  let owner = 0; // pantograph soup: 0 base, 1 lower arm, 2 upper arm, 3 head
  function tri(key, a, b, e, ref, na, nb, ne) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const flip = dot(n, sub(mul(add(add(a, b), e), 1 / 3), ref)) < 0;
    n = nrm(flip ? mul(n, -1) : n);
    const s = S(key);
    const vs = flip ? [[a, na], [e, ne], [b, nb]] : [[a, na], [b, nb], [e, ne]];
    for (const [q, nq] of vs) s.p.push(...q), s.n.push(...(nq ?? n)), s.o.push(owner);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, x0, x1, y0, y1, z0, z1) {
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // a square beam from a to b, w x h, its height along `up`
  function beam(key, a, b, w, h = w, up = [0, 1, 0]) {
    const d = sub(b, a);
    let s = cross(d, up);
    if (Math.hypot(...s) < 1e-9) s = cross(d, [1, 0, 0]);
    s = nrm(s);
    const u = nrm(cross(s, d));
    const P = (o, i, j) => add(add(o, mul(s, (i * w) / 2)), mul(u, (j * h) / 2));
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // cylinder along an axis: centre ends a -> b, radius r (r1 at b)
  function cyl(key, a, b, r, seg = 12, r1 = r) {
    const d = nrm(sub(b, a));
    const s = nrm(cross(d, Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), u = cross(s, d);
    const ref = mul(add(a, b), 0.5);
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * TAU, a1 = ((i + 1) / seg) * TAU;
      const n0 = add(mul(s, Math.cos(a0)), mul(u, Math.sin(a0))), n1 = add(mul(s, Math.cos(a1)), mul(u, Math.sin(a1)));
      const b0 = add(a, mul(n0, r)), b1 = add(a, mul(n1, r)), t0 = add(b, mul(n0, r1)), t1 = add(b, mul(n1, r1));
      tri(key, b0, b1, t1, ref, n0, n1, n1);
      tri(key, b0, t1, t0, ref, n0, n1, n0);
      tri(key, b, t0, t1, ref);
      tri(key, a, b0, b1, ref);
    }
  }
  // a flat disc facing n
  function disc(key, ctr, n, r, seg = 14) {
    const s = nrm(cross(n, Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), u = cross(n, s);
    const ref = sub(ctr, n);
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * TAU, a1 = ((i + 1) / seg) * TAU;
      tri(key, ctr, add(ctr, add(mul(s, r * Math.cos(a0)), mul(u, r * Math.sin(a0)))), add(ctr, add(mul(s, r * Math.cos(a1)), mul(u, r * Math.sin(a1)))), ref);
    }
  }

  // ---------- layout (world) ----------
  const XT = 1.4;       // track centre
  const RT = 0.38;      // rail top
  const ZT = 10.5;      // track half-length
  const WIRE = 5.25;    // contact wire
  const PY = 0.62;      // platform top
  // the platform lies on -X (behind the car from the usual front-left camera), its edge at PX1, back at PX0
  const PX0 = XT - 4.3, PX1 = XT - 1.32, PZA = -6.0, PZB = 8.0, RAMP = 1.6;
  const POLE_X = PX0 + 0.35, POLES = [-6.6, 0.4, 7.4];

  // ---------- track ----------
  hex("bed", [[XT - 1.5, 0, -ZT], [XT + 1.5, 0, -ZT], [XT + 1.5, 0, ZT], [XT - 1.5, 0, ZT],
    [XT - 1.15, 0.15, -ZT], [XT + 1.15, 0.15, -ZT], [XT + 1.15, 0.15, ZT], [XT - 1.15, 0.15, ZT]]);
  for (let z = -ZT + 0.3; z < ZT - 0.2; z += 0.6) box("concrete", XT - 1.0, XT + 1.0, 0.1, 0.22, z - 0.1, z + 0.1);
  for (const s of [-1, 1]) {
    const x = XT + s * 0.57;
    box("dark", x - 0.04, x + 0.04, 0.22, RT, -ZT, ZT);
    box("dark", x - 0.07, x + 0.07, 0.22, 0.25, -ZT, ZT); // foot
    quad("concrete", [x - 0.035, RT + 0.002, -ZT], [x + 0.035, RT + 0.002, -ZT], [x + 0.035, RT + 0.002, ZT], [x - 0.035, RT + 0.002, ZT], [x, 0, 0]);
  }

  // ---------- overhead line: poles on the platform's back edge, bracket arms over the track, one contact wire ----------
  const ARM = 5.62;
  for (const z of POLES) {
    cyl("concrete", [POLE_X, 0, z], [POLE_X, 5.85, z], 0.15, 10, 0.11);
    beam("dark", [POLE_X - 0.1, ARM, z], [XT + 0.35, ARM, z], 0.07, 0.09);
    beam("dark", [POLE_X, ARM - 0.75, z], [POLE_X + 1.6, ARM, z], 0.05, 0.05);
    beam("dark", [XT, ARM, z], [XT, WIRE, z], 0.04, 0.04);
    beam("dark", [XT - 0.5, ARM, z], [XT, WIRE + 0.02, z], 0.03, 0.03);
  }
  beam("dark", [XT, WIRE, -ZT], [XT, WIRE, ZT], 0.035, 0.035);

  // ---------- platform (-X): flat z PZA..PZB, ramps beyond ----------
  box("concrete", PX0, PX1, 0, PY, PZA, PZB);
  for (const [z0, z1] of [[PZA, PZA - RAMP], [PZB, PZB + RAMP]])
    hex("concrete", [[PX0, 0, z0], [PX1, 0, z0], [PX1, 0, z1], [PX0, 0, z1], [PX0, PY, z0], [PX1, PY, z0], [PX1, 0.03, z1], [PX0, 0.03, z1]]);
  box("concrete", PX1 - 0.25, PX1 + 0.06, PY - 0.08, PY + 0.02, PZA, PZB); // coping lip
  box("yellow", PX1 - 0.8, PX1 - 0.5, PY, PY + 0.015, PZA + 0.3, PZB - 0.3); // tactile strip
  // shelter at the back edge, toward the +Z end (clear of the car from the front-left)
  const SX0 = PX0 + 0.15, SX1 = PX0 + 1.45, SZ0 = 3.4, SZ1 = 6.6, SH = PY + 2.35;
  for (const x of [SX0 + 0.1, SX1 - 0.1]) for (const z of [SZ0 + 0.1, SZ1 - 0.1]) box("dark", x - 0.05, x + 0.05, PY, SH + (x < SX0 + 0.5 ? 0.12 : 0), z - 0.05, z + 0.05);
  box("concrete", SX0 + 0.1, SX0 + 0.16, PY + 0.25, SH - 0.1, SZ0 + 0.15, SZ1 - 0.15); // back panel
  box("dark", SX0 + 0.05, SX1 - 0.05, SH - 0.08, SH, SZ0 + 0.1, SZ1 - 0.1);
  hex("roof", [[SX0 - 0.15, SH + 0.15, SZ0 - 0.3], [SX1 + 0.45, SH, SZ0 - 0.3], [SX1 + 0.45, SH, SZ1 + 0.3], [SX0 - 0.15, SH + 0.15, SZ1 + 0.3],
    [SX0 - 0.15, SH + 0.25, SZ0 - 0.3], [SX1 + 0.45, SH + 0.1, SZ0 - 0.3], [SX1 + 0.45, SH + 0.1, SZ1 + 0.3], [SX0 - 0.15, SH + 0.25, SZ1 + 0.3]]);
  // bench under the shelter, facing the track
  const BX = SX0 + 0.55, BZ = (SZ0 + SZ1) / 2;
  box("yellow", BX - 0.2, BX + 0.2, PY + 0.4, PY + 0.46, BZ - 1.15, BZ + 1.15);
  box("yellow", BX - 0.27, BX - 0.22, PY + 0.55, PY + 0.85, BZ - 1.15, BZ + 1.15);
  for (const z of [BZ - 1.0, BZ + 1.0]) {
    box("dark", BX - 0.19, BX - 0.15, PY, PY + 0.4, z - 0.02, z + 0.02);
    box("dark", BX + 0.11, BX + 0.15, PY, PY + 0.4, z - 0.02, z + 0.02);
    box("dark", BX - 0.23, BX - 0.2, PY + 0.4, PY + 0.85, z - 0.02, z + 0.02);
  }
  // blank name board across the platform near its +Z end, facing down the line (+Z)
  const NX = (PX0 + PX1) / 2 + 0.2, NZ = PZB - 0.6, NW = 0.75, NB = PY + 1.55, NT = PY + 2.15;
  for (const s of [-1, 1]) box("dark", NX + s * NW - 0.04, NX + s * NW + 0.04, PY, NT + 0.05, NZ - 0.04, NZ + 0.04);
  box("dark", NX - NW - 0.02, NX + NW + 0.02, NB - 0.04, NT + 0.04, NZ - 0.05, NZ + 0.02);
  box("concrete", NX - NW + 0.06, NX + NW - 0.06, NB + 0.02, NT - 0.02, NZ + 0.02, NZ + 0.05);
  box("dark", NX - NW + 0.06, NX + NW - 0.06, NB + 0.17, NB + 0.2, NZ + 0.05, NZ + 0.055); // rule under the (blank) name

  // ---------- the car (car-local: y from rail top, z along the track) ----------
  const LH = 5.8, E = 0.55, K = 2.6;
  const halfW = (y) => (y < 0.75 ? 1.16 + 0.06 * Math.min(1, (y - 0.55) / 0.2) : y <= 1.45 ? 1.22 : 1.22 - 0.06 * ((y - 1.45) / 1.8) ** 1.5);
  const sp = (v, e) => Math.sign(v) * Math.abs(v) ** e;
  // plan ring: 13 front-cap points (theta 0..pi) then 13 back-cap points (pi..2pi)
  function ring(y, A, L, Eb) {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = (i / 12) * Math.PI;
      pts.push([A * sp(Math.cos(t), 2 / K), y, L + Eb * Math.abs(Math.sin(t)) ** (2 / K)]);
    }
    for (let i = 0; i <= 12; i++) {
      const t = Math.PI + (i / 12) * Math.PI;
      pts.push([A * sp(Math.cos(t), 2 / K), y, -L - Eb * Math.abs(Math.sin(t)) ** (2 / K)]);
    }
    return pts;
  }
  // surface z of the front cap at (x, y); and its outward plan normal
  const capZ = (x, y, A = halfW(y)) => LH + E * Math.max(0, 1 - Math.abs(x / A) ** K) ** (1 / K);
  const capN = (x, y) => {
    const h = 0.01, d = (capZ(x + h, y) - capZ(x - h, y)) / (2 * h);
    return nrm([-d, 0, 1]);
  };
  // skin a stack of rings into soup `key`, normals averaged on the grid; caps on the first/last ring when asked
  function skin(key, rings, { bottom = false, top = false } = {}) {
    const R = rings.length, N = rings[0].length;
    const ctr = [0, (rings[0][0][1] + rings[R - 1][0][1]) / 2, 0];
    const G = (i, j) => rings[Math.max(0, Math.min(R - 1, i))][((j % N) + N) % N];
    const nor = (i, j) => {
      const tj = sub(G(i, j + 1), G(i, j - 1)), ti = sub(G(i + 1, j), G(i - 1, j));
      let n = nrm(cross(tj, ti));
      const p = G(i, j);
      if (dot(n, [p[0], 0, p[2]]) + dot(n, [0, p[1] - ctr[1], 0]) * 0.3 < 0) n = mul(n, -1);
      return n;
    };
    for (let i = 0; i < R - 1; i++)
      for (let j = 0; j < N; j++) {
        const a = G(i, j), b = G(i, j + 1), e = G(i + 1, j + 1), d = G(i + 1, j);
        tri(key, a, b, e, ctr, nor(i, j), nor(i, j + 1), nor(i + 1, j + 1));
        tri(key, a, e, d, ctr, nor(i, j), nor(i + 1, j + 1), nor(i + 1, j));
      }
    const cap = (rg, up) => {
      const m = [0, rg[0][1], 0], ref = [0, rg[0][1] - (up ? 1 : -1), 0];
      for (let j = 0; j < N; j++) tri(key, m, rg[j], rg[(j + 1) % N], ref);
    };
    if (bottom) cap(rings[0], false);
    if (top) cap(rings[R - 1], true);
  }
  // a panel on the car surface: side (+1 / -1 for +X / -X) at z0..z1, or front (+1 / -1 end) at x0..x1, y0..y1
  function sidePanel(key, s, z0, z1, y0, y1, off) {
    const P = (z, y) => [s * (halfW(y) + off), y, z];
    quad(key, P(z0, y0), P(z1, y0), P(z1, y1), P(z0, y1), [0, (y0 + y1) / 2, (z0 + z1) / 2]);
  }
  function endPanel(key, e, x0, x1, y0, y1, off, nx = 4) {
    const P = (x, y) => {
      const n = capN(x, y);
      return [x + n[0] * off, y, e * (capZ(x, y) + n[2] * off)];
    };
    const ref = [0, (y0 + y1) / 2, 0];
    for (let i = 0; i < nx; i++) {
      const xa = x0 + ((x1 - x0) * i) / nx, xb = x0 + ((x1 - x0) * (i + 1)) / nx;
      quad(key, P(xa, y0), P(xb, y0), P(xb, y1), P(xa, y1), ref);
    }
  }
  // glints: two slanted slivers on a pane (u along the pane, v up), mapped by f(u, v)
  function glints(f, ref) {
    for (const [u0, w] of [[0.18, 0.12], [0.4, 0.05]]) {
      const sl = 0.35;
      quad("glint", f(u0, 0.15), f(u0 + w, 0.15), f(u0 + w + sl, 0.85), f(u0 + sl, 0.85), ref);
    }
  }

  if (tram) {
    const car = new THREE.Group();
    car.name = "car";
    car.position.set(XT, RT, 0);
    set.add(car);
    joints.car = car;
    const body = new THREE.Group();
    body.name = "body";
    body.position.set(0, 0.6, 0);
    car.add(body);
    joints.body = body;
    // body geometry is authored in car coordinates, then shifted into the body frame (pivot at the floor centre)
    const carSoups = {};
    const keep = { ...soups };
    for (const k of Object.keys(soups)) delete soups[k];

    // green skirt band, cream window band, green roof
    skin("green", [0.55, 0.62, 0.75, 1.45].map((y) => ring(y, halfW(y), LH, E)), { bottom: true });
    skin("cream", [1.45, 2.1, 2.7, 3.25].map((y) => ring(y, halfW(y), LH, E)));
    const roofRings = [];
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      const y = 3.25 + 0.42 * Math.sin((t * Math.PI) / 2);
      roofRings.push(ring(y, halfW(3.25) * (1 - 0.72 * t ** 1.7), LH - 0.35 * t ** 1.6, E * (1 - 0.4 * t)));
    }
    skin("green", roofRings, { top: true });
    // rain gutter line at the eave
    for (const s of [-1, 1]) sidePanel("glass", s, -LH, LH, 3.19, 3.23, 0.012);

    // side windows, doors (both sides; glints only on the +X side the camera favours)
    const WY0 = 1.62, WY1 = 2.78;
    const sideWins = [[4.55, 5.6], [2.75, 3.75], [1.45, 2.55], [0.15, 1.25], [-1.25, -0.15], [-2.55, -1.45], [-3.75, -2.75], [-5.6, -4.55]];
    for (const s of [-1, 1]) {
      for (const [z0, z1] of sideWins) {
        sidePanel("glass", s, z0, z1, WY0, WY1, 0.012);
        if (s > 0) glints((u, v) => [halfW(WY0 + v * (WY1 - WY0)) + 0.02, WY0 + v * (WY1 - WY0), z1 - u * (z1 - z0)], [0, 2.2, (z0 + z1) / 2]);
      }
      // doors: z 3.85..4.45 front, -4.45..-3.85 rear (single leaf, tall window, outline strips)
      for (const dz of [4.15, -4.15]) {
        const z0 = dz - 0.32, z1 = dz + 0.32;
        sidePanel("glass", s, z0, z1, WY0 - 0.05, WY1, 0.012);
        sidePanel("glass", s, z0 - 0.04, z0, 0.6, WY1 + 0.08, 0.012);
        sidePanel("glass", s, z1, z1 + 0.04, 0.6, WY1 + 0.08, 0.012);
        sidePanel("glass", s, z0 - 0.04, z1 + 0.04, WY1 + 0.06, WY1 + 0.1, 0.012);
        sidePanel("dark", s, z0 - 0.15, z1 + 0.15, 0.48, 0.6, 0.03); // step
        if (s > 0) glints((u, v) => [halfW(WY0 + v * (WY1 - WY0)) + 0.02, WY0 - 0.05 + v * (WY1 - WY0 + 0.05), z1 - u * (z1 - z0)], [0, 2.2, dz]);
      }
    }
    // ends: three-pane windscreen, destination box, headlight, anticlimber
    for (const e of [1, -1]) {
      const FY0 = 1.68, FY1 = 2.85;
      for (const [x0, x1] of [[-0.5, 0.5], [0.6, 1.08], [-1.08, -0.6]]) {
        endPanel("glass", e, x0, x1, FY0, FY1, 0.015, x1 - x0 > 0.6 ? 4 : 3);
        if (e > 0) {
          const f = (u, v) => {
            const x = x0 + u * (x1 - x0), y = FY0 + v * (FY1 - FY0), n = capN(x, y);
            return [x + n[0] * 0.03, y, capZ(x, y) + n[2] * 0.03];
          };
          glints(f, [0, 2.2, 0]);
        }
      }
      endPanel("glass", e, -0.55, 0.55, 2.93, 3.2, 0.02, 4); // destination frame
      endPanel("glint", e, -0.48, 0.48, 2.97, 3.16, 0.035, 4); // blank destination face
      const hz = capZ(0, 1.15);
      cyl("dark", [0, 1.15, e * (hz - 0.05)], [0, 1.15, e * (hz + 0.1)], 0.15, 14);
      disc("lamp", [0, 1.15, e * (hz + 0.105)], [0, 0, e], 0.11, 14);
      for (const s of [-1, 1]) {
        const tz = capZ(s * 0.85, 1.05);
        disc("lamp", [s * 0.85, 1.05, e * (tz + 0.012)], nrm([capN(s * 0.85, 1.05)[0], 0, e * capN(s * 0.85, 1.05)[2]]), 0.06, 10);
      }
      box("dark", -0.85, 0.85, 0.5, 0.66, e > 0 ? LH + E - 0.35 : -LH - E - 0.1, e > 0 ? LH + E + 0.1 : -LH - E + 0.35);
    }
    // underframe: equipment boxes, bogies, wheels
    box("dark", -0.95, 0.95, 0.3, 0.56, -2.6, 2.6);
    for (const bz of [4.0, -4.0]) {
      box("dark", -0.82, 0.82, 0.38, 0.5, bz - 0.35, bz + 0.35); // bolster
      for (const s of [-1, 1]) {
        box("dark", s * 0.7, s * 0.86, 0.22, 0.5, bz - 1.05, bz + 1.05);
        for (const dz of [-0.85, 0.85]) cyl("dark", [s * 0.5, 0.33, bz + dz], [s * 0.64, 0.33, bz + dz], 0.33, 14);
      }
    }

    // pantograph (car coords): base on insulators, single arm, head
    const PZ0 = 0.8, PH = 3.82, HINGE = [0, PH + 0.08, PZ0 + 0.3];
    const L1 = 0.85, L2 = 0.85;
    owner = 0;
    for (const x of [-0.4, 0.4]) for (const z of [PZ0 - 0.45, PZ0 + 0.45]) cyl("panto", [x, 3.6, z], [x, PH - 0.02, z], 0.045, 8);
    box("panto", -0.45, 0.45, PH - 0.02, PH + 0.03, PZ0 - 0.5, PZ0 - 0.42);
    box("panto", -0.45, 0.45, PH - 0.02, PH + 0.03, PZ0 + 0.42, PZ0 + 0.5);
    for (const x of [-0.45, 0.45]) box("panto", x - 0.03, x + 0.03, PH - 0.02, PH + 0.03, PZ0 - 0.5, PZ0 + 0.5);
    box("panto", -0.2, 0.2, PH + 0.03, PH + 0.1, HINGE[2] - 0.06, HINGE[2] + 0.06);
    // rest solve (head on the wire)
    const headY0 = WIRE - RT - 0.6 - 0.06; // body-frame: wire minus body pivot minus head height
    function solve(ty, tz) {
      // hinge-relative target in (z, y); knee to the rear (-Z)
      const dz = tz - HINGE[2], dy = ty - HINGE[1], d = Math.min(L1 + L2 - 1e-4, Math.hypot(dz, dy));
      const beta = Math.atan2(dz, dy), gam = Math.acos((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d));
      const f1 = beta - gam, kz = L1 * Math.sin(f1), ky = L1 * Math.cos(f1);
      const f2 = Math.atan2(dz - kz, dy - ky);
      return [f1, f2];
    }
    const HEADZ = HINGE[2] + 0.05; // the head rides above the hinge, the knee overhangs the rear
    const [f1r, f2r] = solve(headY0 + 0.6, HEADZ);
    const kneeR = [0, HINGE[1] + L1 * Math.cos(f1r), HINGE[2] + L1 * Math.sin(f1r)];
    const tipR = [0, kneeR[1] + L2 * Math.cos(f2r), kneeR[2] + L2 * Math.sin(f2r)];
    owner = 1;
    beam("panto", HINGE, kneeR, 0.09, 0.07, [1, 0, 0]);
    cyl("panto", [-0.12, HINGE[1], HINGE[2]], [0.12, HINGE[1], HINGE[2]], 0.05, 8);
    owner = 2;
    beam("panto", kneeR, tipR, 0.05, 0.05, [1, 0, 0]);
    cyl("panto", [-0.06, kneeR[1], kneeR[2]], [0.06, kneeR[1], kneeR[2]], 0.045, 8);
    owner = 3;
    const T = tipR;
    box("panto", -0.35, 0.35, T[1] - 0.02, T[1] + 0.02, T[2] - 0.03, T[2] + 0.03); // cross bar
    for (const dz of [-0.13, 0.13]) {
      box("panto", -0.55, 0.55, T[1] + 0.03, T[1] + 0.07, T[2] + dz - 0.03, T[2] + dz + 0.03); // collector strips
      for (const s of [-1, 1]) beam("panto", [s * 0.55, T[1] + 0.05, T[2] + dz], [s * 0.74, T[1] - 0.06, T[2] + dz], 0.035, 0.035, [0, 0, 1]); // horns
    }
    for (const s of [-1, 1]) beam("panto", [s * 0.3, T[1], T[2]], [s * 0.3, T[1] + 0.05, T[2]], 0.04, 0.04, [0, 0, 1]);
    owner = 0;

    // move car soups into the body frame
    for (const [k, v] of Object.entries(soups)) {
      for (let i = 1; i < v.p.length; i += 3) v.p[i] -= 0.6;
      carSoups[k] = v;
      delete soups[k];
    }
    Object.assign(soups, keep);

    // joints for the pantograph (body frame)
    const pLow = new THREE.Object3D(), pUp = new THREE.Object3D(), pHead = new THREE.Object3D();
    pLow.name = "pantoLow"; pUp.name = "pantoUp"; pHead.name = "pantoHead";
    pLow.position.set(0, HINGE[1] - 0.6, HINGE[2]);
    pUp.position.set(0, L1, 0);
    pHead.position.set(0, L2, 0);
    body.add(pLow); pLow.add(pUp); pUp.add(pHead);
    Object.assign(joints, { pantoLow: pLow, pantoUp: pUp, pantoHead: pHead });

    const CMAT = {
      green: [c.green, c.greenShade, 0.2, 4], cream: [c.cream, c.creamShade, 0.2, 4], dark: [c.dark, c.dark, -1, 3],
      glass: [c.glass, c.glass, -1, 0], glint: [c.glint, c.glint, -1, 0], lamp: [c.lamp, c.lamp, -1, 0], panto: [c.dark, c.dark, -1, 2.5],
    };
    let pm = null, base = null;
    for (const [key, { p, n, o }] of Object.entries(carSoups)) {
      const [b, s, threshold, px] = CMAT[key];
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
      const mesh = kit.toon(g, b, s, px ? { threshold, px } : { threshold, outline: false });
      mesh.name = key;
      body.add(mesh);
      if (key === "panto") {
        pm = mesh;
        kit.hullNormals(g);
        const hn = g.attributes.hullNormal;
        base = { p: Float32Array.from(p), n: Float32Array.from(n), h: hn ? Float32Array.from(hn.array) : null, o };
        mesh.frustumCulled = false;
      }
    }
    // rest matrices (body frame) of the three moving owners
    const owners = [pLow, pUp, pHead];
    const chain = () => {
      pLow.updateMatrix(); pUp.updateMatrix(); pHead.updateMatrix();
      const m1 = pLow.matrix.clone(), m2 = m1.clone().multiply(pUp.matrix), m3 = m2.clone().multiply(pHead.matrix);
      return [m1, m2, m3];
    };
    function setPanto(lift, rock) {
      const [f1, f2] = solve(headY0 + 0.6 + lift, HEADZ);
      pLow.rotation.x = f1;
      pUp.rotation.x = f2 - f1;
      pHead.rotation.x = -f2 + rock;
    }
    setPanto(0, 0);
    const REST = chain().map((m) => m.clone().invert());
    const MS = [new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4()], NS = MS.map(() => new THREE.Matrix3());
    function rig() {
      chain().forEach((m, k) => (MS[k].multiplyMatrices(m, REST[k]), NS[k].getNormalMatrix(MS[k])));
      const g = pm.geometry, P3 = g.attributes.position.array, N3 = g.attributes.normal.array, H = g.attributes.hullNormal?.array;
      const q = new THREE.Vector3();
      for (let v = 0; v < base.o.length; v++) {
        const k = base.o[v] - 1, i = v * 3;
        if (k < 0) continue;
        q.fromArray(base.p, i).applyMatrix4(MS[k]).toArray(P3, i);
        q.fromArray(base.n, i).applyMatrix3(NS[k]).normalize().toArray(N3, i);
        if (H && base.h) q.fromArray(base.h, i).applyMatrix3(NS[k]).normalize().toArray(H, i);
      }
      g.attributes.position.needsUpdate = g.attributes.normal.needsUpdate = true;
      if (H) g.attributes.hullNormal.needsUpdate = true;
      g.computeBoundingSphere(), g.computeBoundingBox();
    }
    joints.__drive = { car, body, setPanto, rig, owners };
  }

  // ---------- static meshes ----------
  const MAT = {
    concrete: [c.concrete, c.concreteShade, 0.1, 4], bed: [c.bed, c.bedShade, 0.1, 4], dark: [c.dark, c.dark, -1, 2.5],
    roof: [c.roof, c.roofShade, 0.1, 4], yellow: [c.yellow, c.yellowShade, 0.1, 3],
  };
  for (const [key, { p, n }] of Object.entries(soups)) {
    const [b, s, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, b, s, { threshold, px });
    mesh.name = key;
    set.add(mesh);
  }

  // ---------- poses and clips ----------
  const drive = joints.__drive;
  delete joints.__drive;
  const CLIPS = { arrive: 7 };
  const ROLL = 4.0, TSTOP = 3.4;
  function apply(z, pitch, lift, rock) {
    if (drive) {
      drive.car.position.z = z;
      drive.body.rotation.x = pitch;
      drive.setPanto(lift, rock);
      drive.rig();
    }
    root.updateMatrixWorld(true);
  }
  // arrive: even braking from -ROLL to 0 over TSTOP (z = -ROLL (1-u)^2); nose dips while braking (+rx), rocks back
  // and settles after the stop; the pantograph head chatters while rolling and rings down after the stop.
  function arrive(t) {
    const u = (((t % 7) + 7) % 7);
    if (u < TSTOP) {
      const s = u / TSTOP, v = 1 - s;
      const z = -ROLL * v * v;
      const pitch = 0.012 * Math.min(1, s * 3);
      const lift = 0.025 * Math.sin(u * 19) * v + 0.01 * Math.sin(u * 7.3);
      const rock = 0.1 * Math.sin(u * 23) * v + 0.04 * Math.sin(u * 9.1);
      return apply(z, pitch, lift, rock);
    }
    const w = u - TSTOP, dmp = Math.exp(-w * 1.6);
    const pitch = 0.012 * dmp * Math.cos(w * TAU * 0.9);
    const lift = -0.045 * dmp * Math.sin(w * TAU * 1.6);
    const rock = 0.16 * dmp * Math.sin(w * TAU * 1.2 + 0.4);
    return apply(0, pitch, lift, rock);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`streetcar: no clip "${m[1]}" (clips: arrive)`);
      return arrive(+m[2]);
    }
    if (name !== "rest") throw new Error(`streetcar: unknown pose "${name}" (rest, or arrive@<seconds>)`);
    apply(0, 0, 0, 0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}
